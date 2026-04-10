#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs';

import type {
  CheckReport,
  BrokenLink,
  BrokenLinkWithSuggestion,
  FixSuggestion,
  RedirectMap,
} from './types.js';

import { getMarkdownFiles, fileExists, joinPaths } from '../shared/file-utils.js';
import { parseGitBookYaml } from '../shared/gitbook-yaml.js';
import { parseMarkdownLinks } from './parsers/markdown.js';
import { parseSummary, validateSummaryPaths } from './parsers/summary.js';
import {
  validateAllLinks,
  getBrokenLinks,
  getValidationStats,
  pathExists,
} from './validators/link-validator.js';
import { findAllFixSuggestions, groupByConfidence } from './fixers/redirect-finder.js';
import { applyFixesWithRedirects, previewFix } from './fixers/link-fixer.js';
import {
  printHeader,
  printSubHeader,
  printProgress,
  printError,
  printSuccess,
  printWarning,
  askConfirmation,
} from '../shared/reporter.js';
import {
  printCheckReport,
  printBrokenLink,
  printFixResult,
  printFixSummary,
} from './reporter.js';

const program = new Command();

program
  .name('link-checker')
  .description('Check and fix internal links in GitBook documentation')
  .version('1.0.0')
  .option('-r, --root <path>', 'Root directory of the GitBook project', '.')
  .option('-p, --path <path>', 'Specific path to check (relative to root)')
  .option('-f, --fix', 'Automatically fix high-confidence broken links', false)
  .option('-i, --interactive', 'Interactive mode for medium/low confidence fixes', false)
  .option('-o, --output <file>', 'Output report to JSON file')
  .option('-v, --verbose', 'Verbose output', false)
  .option('--no-redirects', 'Do not add redirects to .gitbook.yaml when fixing')
  .action(async (opts) => {
    try {
      await runLinkChecker(opts);
    } catch (error) {
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();

async function runLinkChecker(opts: {
  root: string;
  path?: string;
  fix: boolean;
  interactive: boolean;
  output?: string;
  verbose: boolean;
  checkOrphans: boolean;
  redirects: boolean;
}): Promise<void> {
  const startTime = Date.now();

  const projectRoot = path.resolve(opts.root);

  if (!fs.existsSync(projectRoot)) {
    throw new Error(`Project root not found: ${projectRoot}`);
  }

  const summaryPath = joinPaths(projectRoot, 'SUMMARY.md');
  const gitbookYamlPath = joinPaths(projectRoot, '.gitbook.yaml');

  if (!fileExists(summaryPath)) {
    throw new Error(`SUMMARY.md not found in ${projectRoot}`);
  }

  if (!fileExists(gitbookYamlPath)) {
    printWarning('.gitbook.yaml not found - redirect suggestions will be limited');
  }

  printHeader('Filecoin Docs Link Checker');

  printProgress('Parsing SUMMARY.md...');
  const summaryStructure = parseSummary(summaryPath);

  let redirectMap: RedirectMap = { entries: [], fromToMap: new Map<string, string>(), toFromMap: new Map<string, string[]>() };
  if (fileExists(gitbookYamlPath)) {
    printProgress('Parsing .gitbook.yaml...');
    redirectMap = parseGitBookYaml(gitbookYamlPath);
    if (opts.verbose) {
      console.log(`  Found ${redirectMap.entries.length} redirects`);
    }
  }

  printProgress('Validating SUMMARY.md entries...');
  const missingSummaryTargets = validateSummaryPaths(summaryStructure, (p) => pathExists(p, projectRoot));

  printProgress('Finding markdown files...');
  const markdownFiles = await getMarkdownFiles(projectRoot, opts.path);

  if (opts.verbose) {
    console.log(`  Found ${markdownFiles.length} markdown files`);
  }

  printProgress('Parsing markdown files for links...');
  const allFileLinks = markdownFiles.map(fp => {
    const fullPath = joinPaths(projectRoot, fp);
    return parseMarkdownLinks(fp, fs.readFileSync(fullPath, 'utf-8'));
  });

  const totalLinks = allFileLinks.reduce((sum, fl) => sum + fl.links.length, 0);
  if (opts.verbose) {
    console.log(`  Found ${totalLinks} internal links`);
  }

  printProgress('Validating links...');
  const validationResults = validateAllLinks(allFileLinks, projectRoot, redirectMap);
  const brokenLinks = getBrokenLinks(validationResults);
  const stats = getValidationStats(validationResults);

  printProgress('Finding fix suggestions...');
  const suggestions = await findAllFixSuggestions(brokenLinks, projectRoot, redirectMap);

  const brokenLinkDetails: BrokenLinkWithSuggestion[] = brokenLinks.map(broken => ({
    broken,
    suggestion: suggestions.get(broken),
  }));

  const report: CheckReport = {
    filesScanned: markdownFiles.length,
    linksChecked: totalLinks,
    validLinks: stats.valid,
    brokenLinks: stats.broken,
    brokenLinkDetails,
    missingSummaryTargets,
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
  };

  if ((opts.fix || opts.interactive) && brokenLinks.length > 0) {
    await handleFixMode(brokenLinkDetails, projectRoot, gitbookYamlPath, opts.fix, opts.interactive, opts.redirects);
  } else {
    printCheckReport(report);
  }

  if (opts.output) {
    const jsonReport = {
      ...report,
      brokenLinkDetails: report.brokenLinkDetails.map(d => ({
        broken: {
          sourceFile: d.broken.sourceFile,
          link: d.broken.link,
          status: d.broken.status,
          resolvedPath: d.broken.resolvedPath,
          error: d.broken.error,
        },
        suggestion: d.suggestion,
      })),
    };

    fs.writeFileSync(opts.output, JSON.stringify(jsonReport, null, 2));
    printSuccess(`Report saved to ${opts.output}`);
  }

  const hasIssues = brokenLinks.length > 0 || missingSummaryTargets.length > 0;
  process.exit(hasIssues ? 1 : 0);
}

async function handleFixMode(
  brokenLinkDetails: BrokenLinkWithSuggestion[],
  projectRoot: string,
  gitbookYamlPath: string,
  autoFix: boolean,
  interactive: boolean,
  addRedirects: boolean
): Promise<void> {
  const withSuggestions = brokenLinkDetails.filter(d => d.suggestion);
  const grouped = groupByConfidence(new Map(withSuggestions.map(d => [d.broken, d.suggestion!])));

  const fixesToApply: Array<{ broken: BrokenLink; suggestion: FixSuggestion }> = [];

  if (autoFix && grouped.high.length > 0) {
    printSubHeader(`Auto-fixing ${grouped.high.length} high-confidence link(s)`);

    for (const item of grouped.high) {
      const preview = previewFix(item.broken, item.suggestion);
      console.log(`  ${item.broken.sourceFile}:${item.broken.link.line}`);
      console.log(`    - ${preview.originalLine}`);
      console.log(`    + ${preview.newLine}`);
      fixesToApply.push(item);
    }

    console.log();
  }

  if (interactive) {
    if (grouped.medium.length > 0) {
      printSubHeader(`Medium-confidence suggestions (${grouped.medium.length})`);

      for (const item of grouped.medium) {
        console.log();
        printBrokenLink({ broken: item.broken, suggestion: item.suggestion });

        const preview = previewFix(item.broken, item.suggestion);
        console.log('    Preview:');
        console.log(`      - ${preview.originalLine}`);
        console.log(`      + ${preview.newLine}`);

        const confirmed = await askConfirmation('Apply this fix?');
        if (confirmed) fixesToApply.push(item);
      }
    }

    if (grouped.low.length > 0) {
      printSubHeader(`Low-confidence suggestions (${grouped.low.length})`);

      for (const item of grouped.low) {
        console.log();
        printBrokenLink({ broken: item.broken, suggestion: item.suggestion });

        const preview = previewFix(item.broken, item.suggestion);
        console.log('    Preview:');
        console.log(`      - ${preview.originalLine}`);
        console.log(`      + ${preview.newLine}`);

        const confirmed = await askConfirmation('Apply this fix? (low confidence)');
        if (confirmed) fixesToApply.push(item);
      }
    }
  }

  if (fixesToApply.length > 0) {
    printProgress(`Applying ${fixesToApply.length} fix(es)...`);

    const { fixResults, redirectsAdded } = await applyFixesWithRedirects(
      fixesToApply,
      projectRoot,
      gitbookYamlPath,
      addRedirects && fileExists(gitbookYamlPath)
    );

    printSubHeader('Fix Results');
    for (let i = 0; i < fixResults.length; i++) {
      printFixResult(fixResults[i], i);
    }

    printFixSummary(fixResults, redirectsAdded);
  } else {
    printWarning('No fixes were applied.');
  }

  const remainingWithoutSuggestion = brokenLinkDetails.filter(d => !d.suggestion);
  const remainingNotFixed = brokenLinkDetails.filter(
    d => d.suggestion && !fixesToApply.some(f => f.broken === d.broken)
  );

  const totalRemaining = remainingWithoutSuggestion.length + remainingNotFixed.length;

  if (totalRemaining > 0) {
    printSubHeader(`Remaining Issues (${totalRemaining})`);

    if (remainingWithoutSuggestion.length > 0) {
      console.log(`\n  ${remainingWithoutSuggestion.length} broken link(s) without suggestions:`);
      for (const item of remainingWithoutSuggestion) {
        console.log(`    - ${item.broken.sourceFile}:${item.broken.link.line}`);
        console.log(`      ${item.broken.error}`);
      }
    }

    if (remainingNotFixed.length > 0 && !interactive) {
      console.log(`\n  ${remainingNotFixed.length} link(s) not auto-fixed (use --interactive):`);
      for (const item of remainingNotFixed) {
        console.log(`    - ${item.broken.sourceFile}:${item.broken.link.line}`);
      }
    }
  }
}
