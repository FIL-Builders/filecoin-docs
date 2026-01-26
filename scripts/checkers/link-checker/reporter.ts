import { printHeader, printSubHeader, chalk } from '../shared/reporter.js';
import { toRelativeLink } from '../shared/path-utils.js';
import type {
  CheckReport,
  BrokenLinkWithSuggestion,
  FixResult,
  SummaryEntry,
  FixConfidence,
} from './types.js';

function getConfidenceColor(confidence: FixConfidence): typeof chalk {
  switch (confidence) {
    case 'high':
      return chalk.green;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.red;
  }
}

export function printBrokenLink(item: BrokenLinkWithSuggestion, index?: number): void {
  const { broken, suggestion } = item;
  const prefix = index !== undefined ? `[${index + 1}] ` : '';

  console.log(chalk.yellow(`${prefix}${broken.sourceFile}:${broken.link.line}`));
  console.log(`    ${chalk.red('Link:')} [${broken.link.text}](${broken.link.target})`);

  console.log(`    ${chalk.red('Error:')} ${broken.error}`);

  if (suggestion) {
    const confidenceColor = getConfidenceColor(suggestion.confidence);
    const displayPath = toRelativeLink(broken.sourceFile, suggestion.suggestedPath);
    console.log(
      `    ${chalk.green('Suggestion')} ${confidenceColor(`(${suggestion.confidence.toUpperCase()})`)}:`,
      displayPath
    );
    console.log(`    ${chalk.cyan('Resolves to:')} ${suggestion.suggestedPath}`);
    console.log(`    ${chalk.gray('Reason:')} ${suggestion.reason}`);
  } else {
    console.log(`    ${chalk.gray('No suggestion available')}`);
  }

  console.log();
}

export function printMissingSummaryEntry(entry: SummaryEntry, index?: number): void {
  const prefix = index !== undefined ? `[${index + 1}] ` : '';

  console.log(chalk.yellow(`${prefix}SUMMARY.md:${entry.line}`));
  console.log(`    ${chalk.red('Missing:')} ${entry.path}`);
  console.log(`    ${chalk.gray('Title:')} ${entry.title}`);
  console.log();
}

export function printFixResult(result: FixResult, index?: number): void {
  const prefix = index !== undefined ? `[${index + 1}] ` : '';

  if (result.success) {
    console.log(chalk.green(`${prefix}${result.sourceFile}:${result.originalLink.line}`));
    console.log(`    ${chalk.gray('Old:')} ${result.originalLink.target}`);
    console.log(`    ${chalk.green('New:')} ${result.newPath}`);
    if (result.redirectAdded) {
      console.log(`    ${chalk.blue('+ Redirect added to .gitbook.yaml')}`);
    }
  } else {
    console.log(chalk.red(`${prefix}${result.sourceFile}:${result.originalLink.line}`));
    console.log(`    ${chalk.red('Failed:')} ${result.error}`);
  }

  console.log();
}

export function printCheckReport(report: CheckReport): void {
  printHeader('Link Check Report');

  console.log(chalk.bold('Summary:'));
  console.log(`  Files scanned:     ${report.filesScanned}`);
  console.log(`  Links checked:     ${report.linksChecked}`);
  console.log(`  ${chalk.green('Valid links:')}      ${report.validLinks}`);
  console.log(`  ${chalk.red('Broken links:')}     ${report.brokenLinks}`);

  if (report.missingSummaryTargets.length > 0) {
    console.log(`  ${chalk.yellow('Missing in SUMMARY:')} ${report.missingSummaryTargets.length}`);
  }

  console.log(`  Duration:          ${report.durationMs}ms`);

  if (report.brokenLinkDetails.length > 0) {
    printSubHeader(`Broken Links (${report.brokenLinks})`);

    for (let i = 0; i < report.brokenLinkDetails.length; i++) {
      printBrokenLink(report.brokenLinkDetails[i], i);
    }
  }

  if (report.missingSummaryTargets.length > 0) {
    printSubHeader(`Missing SUMMARY.md Targets (${report.missingSummaryTargets.length})`);

    for (let i = 0; i < report.missingSummaryTargets.length; i++) {
      printMissingSummaryEntry(report.missingSummaryTargets[i], i);
    }
  }


  console.log();
  if (report.brokenLinks === 0 && report.missingSummaryTargets.length === 0) {
    console.log(chalk.green.bold('All links are valid!'));
  } else {
    const issues = report.brokenLinks + report.missingSummaryTargets.length;
    console.log(chalk.red.bold(`Found ${issues} issue(s) that need attention.`));
  }
}

export function printFixSummary(results: FixResult[], redirectsAdded: number): void {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  printSubHeader('Fix Summary');

  console.log(`  ${chalk.green('Fixed:')}       ${successful}`);
  console.log(`  ${chalk.red('Failed:')}      ${failed}`);

  if (redirectsAdded > 0) {
    console.log(`  ${chalk.blue('Redirects:')}   ${redirectsAdded} added to .gitbook.yaml`);
  }

  console.log();
}
