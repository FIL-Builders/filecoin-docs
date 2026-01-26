#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'node:path';

import { parseRedirectsWithRaw } from '../shared/gitbook-yaml.js';
import { joinPaths } from '../shared/file-utils.js';
import {
  printHeader,
  printSubHeader,
  printSuccess,
  printError,
  chalk,
} from '../shared/reporter.js';
import { checkRedirects } from './validator.js';

const program = new Command();

program
  .name('redirect-checker')
  .description('Validate GitBook redirects in .gitbook.yaml')
  .version('1.0.0')
  .option('-r, --root <path>', 'Project root directory', '.')
  .action(async (opts) => {
    try {
      await runCheck(opts.root);
    } catch (error) {
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();

async function runCheck(rootPath: string): Promise<void> {
  const projectRoot = path.resolve(rootPath);
  const gitbookYamlPath = joinPaths(projectRoot, '.gitbook.yaml');

  const redirects = parseRedirectsWithRaw(gitbookYamlPath);
  const result = checkRedirects(redirects, projectRoot);

  printHeader('Redirect Check Report');

  console.log(chalk.bold('Summary:'));
  console.log(`  Total redirects:   ${result.total}`);
  console.log(`  ${chalk.green('Valid:')}            ${result.valid}`);

  if (result.skipped.length > 0) {
    printSubHeader(`Skipped (source exists - ${result.skipped.length})`);
    console.log(chalk.dim('  → Real content exists at source path; redirect never triggers'));
    console.log(chalk.dim('  → Fix: Remove redirect or delete/move the source file'));
    console.log();
    for (const issue of result.skipped) {
      console.log(`  ${chalk.yellow(issue.rawFrom)}: ${issue.rawTo}`);
    }
  }

  if (result.broken.length > 0) {
    printSubHeader(`Broken (target missing - ${result.broken.length})`);
    console.log(chalk.dim('  → Redirect points to a page that doesn\'t exist'));
    console.log(chalk.dim('  → Fix: Update target path or create the missing page'));
    console.log();
    for (const issue of result.broken) {
      console.log(`  ${chalk.red(issue.rawFrom)}: ${issue.rawTo}`);
    }
  }

  console.log();
  if (!result.skipped.length && !result.broken.length) {
    printSuccess('All redirects are valid!');
    process.exit(0);
  } else {
    console.log(chalk.red.bold(`Found ${result.skipped.length + result.broken.length} issue(s) that need attention.`));
    process.exit(result.broken.length > 0 ? 1 : 0);
  }
}
