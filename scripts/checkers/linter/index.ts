import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { printHeader, printSubHeader } from '../shared/reporter.js';

interface LintError {
  file: string;
  line: number;
  column: number;
  ruleId: string;
  ruleName: string;
  message: string;
}

interface RuleSummary {
  ruleId: string;
  ruleName: string;
  count: number;
  description: string;
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  'MD001': 'Heading levels should increment by one',
  'MD004': 'Unordered list style (use dashes)',
  'MD007': 'Unordered list indentation',
  'MD009': 'Trailing spaces',
  'MD010': 'Hard tabs',
  'MD012': 'Multiple consecutive blank lines',
  'MD022': 'Headings should be surrounded by blank lines',
  'MD026': 'Trailing punctuation in heading',
  'MD029': 'Ordered list item prefix',
  'MD030': 'Spaces after list markers',
  'MD031': 'Fenced code blocks should be surrounded by blank lines',
  'MD032': 'Lists should be surrounded by blank lines',
  'MD033': 'Inline HTML',
  'MD034': 'Bare URL used',
  'MD035': 'Horizontal rule style',
  'MD039': 'Spaces in links',
  'MD040': 'Fenced code blocks should have a language specified',
  'MD041': 'First line should be a top-level heading',
  'MD045': 'Images should have alternate text (alt text)',
  'MD049': 'Emphasis style',
};

function parseOutput(output: string): LintError[] {
  const errors: LintError[] = [];
  const lines = output.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^(.+?):(\d+)(?::(\d+))?\s+(\w+)\/(\S+)\s+(.+)$/);
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : 0,
        ruleId: match[4],
        ruleName: match[5],
        message: match[6],
      });
    }
  }

  return errors;
}

function groupByFile(errors: LintError[]): Map<string, LintError[]> {
  const grouped = new Map<string, LintError[]>();
  for (const error of errors) {
    const existing = grouped.get(error.file) || [];
    existing.push(error);
    grouped.set(error.file, existing);
  }
  return grouped;
}

function getRuleSummary(errors: LintError[]): RuleSummary[] {
  const ruleMap = new Map<string, RuleSummary>();

  for (const error of errors) {
    const key = error.ruleId;
    const existing = ruleMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      ruleMap.set(key, {
        ruleId: error.ruleId,
        ruleName: error.ruleName,
        count: 1,
        description: RULE_DESCRIPTIONS[error.ruleId] || error.ruleName,
      });
    }
  }

  return Array.from(ruleMap.values()).sort((a, b) => b.count - a.count);
}

function formatFileErrors(file: string, errors: LintError[]): void {
  console.log();
  console.log(chalk.yellow(`📄 ${file}`) + chalk.dim(` (${errors.length} issues)`));

  const sortedErrors = [...errors].sort((a, b) => a.line - b.line);

  for (const error of sortedErrors) {
    const location = chalk.dim(`${error.line}:${error.column || 1}`);
    const rule = chalk.cyan(`[${error.ruleId}]`);
    const message = error.message.replace(/\s*\[Context:.*?\]$/, '').trim();
    console.log(`   ${location.padEnd(16)} ${rule} ${message}`);
  }
}

function printSummary(errors: LintError[], fileCount: number, totalFiles: number): void {
  const summary = getRuleSummary(errors);

  printSubHeader('Issues by Rule');

  const maxCount = Math.max(...summary.map(s => s.count));
  const countWidth = String(maxCount).length;

  for (const rule of summary) {
    const count = chalk.red(String(rule.count).padStart(countWidth));
    const ruleId = chalk.cyan(rule.ruleId.padEnd(6));
    console.log(`  ${count} × ${ruleId} ${rule.description}`);
  }

  console.log();
  console.log(chalk.dim('─'.repeat(60)));
  console.log();

  const shownNote = fileCount < totalFiles
    ? chalk.dim(` (showing ${fileCount} of ${totalFiles} files)`)
    : '';

  console.log(
    chalk.red.bold(`✖ ${errors.length} issues`) +
    chalk.dim(` in ${totalFiles} files`) +
    shownNote
  );
  console.log();
}

function printFixHint(): void {
  console.log(chalk.dim('Run ') + chalk.cyan('npm run lint:fix') + chalk.dim(' to auto-fix some issues'));
  console.log();
}

function printUsage(): void {
  console.log(chalk.bold('Usage:') + ' npm run lint [options]');
  console.log();
  console.log(chalk.bold('Options:'));
  console.log('  --fix           Auto-fix issues where possible');
  console.log('  --summary       Show only the summary (no file details)');
  console.log('  --limit=N       Show only the first N files with issues');
  console.log('  --help          Show this help message');
  console.log();
}

interface Options {
  fix: boolean;
  summaryOnly: boolean;
  limit: number;
  help: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    fix: false,
    summaryOnly: false,
    limit: Infinity,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--summary') {
      options.summaryOnly = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--limit=')) {
      const num = parseInt(arg.split('=')[1], 10);
      if (!isNaN(num) && num > 0) {
        options.limit = num;
      }
    }
  }

  return options;
}

function runLinter(options: Options): number {
  if (options.help) {
    printUsage();
    return 0;
  }

  const cmd = options.fix
    ? 'npx markdownlint-cli2 --fix "**/*.md"'
    : 'npx markdownlint-cli2 "**/*.md"';

  let output = '';
  let exitCode = 0;

  try {
    output = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });
  } catch (err: unknown) {
    const execError = err as { stdout?: string; stderr?: string; status?: number };
    output = (execError.stdout || '') + (execError.stderr || '');
    exitCode = execError.status ?? 1;
  }

  const errors = parseOutput(output);

  if (errors.length === 0) {
    printHeader('Markdown Lint');
    console.log(chalk.green.bold('✓ All files pass linting'));
    console.log();
    return 0;
  }

  printHeader('Markdown Lint Results');

  const grouped = groupByFile(errors);
  const totalFiles = grouped.size;

  if (!options.summaryOnly) {
    let fileCount = 0;
    for (const [file, fileErrors] of grouped) {
      if (fileCount >= options.limit) break;
      formatFileErrors(file, fileErrors);
      fileCount++;
    }

    if (fileCount < totalFiles) {
      console.log();
      console.log(chalk.dim(`... and ${totalFiles - fileCount} more files with issues`));
    }
  }

  console.log();
  printSummary(errors, Math.min(options.limit, totalFiles), totalFiles);

  if (!options.fix) {
    printFixHint();
  }

  return exitCode || 1;
}

const options = parseArgs();
process.exit(runLinter(options));
