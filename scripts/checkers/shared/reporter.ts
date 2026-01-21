import * as readline from 'node:readline';
import chalk from 'chalk';

export function timestamp(): string {
  return chalk.dim(new Date().toLocaleTimeString());
}

export function printHeader(text: string): void {
  console.log();
  console.log(chalk.bold.blue(text));
  console.log(chalk.blue('='.repeat(text.length)));
  console.log();
}

export function printSubHeader(text: string): void {
  console.log();
  console.log(chalk.bold(text));
  console.log('-'.repeat(text.length));
}

export function printProgress(message: string): void {
  console.log(chalk.gray(`> ${message}`));
}

export function printError(message: string): void {
  console.log(chalk.red(`Error: ${message}`));
}

export function printSuccess(message: string): void {
  console.log(chalk.green(message));
}

export function printWarning(message: string): void {
  console.log(chalk.yellow(`Warning: ${message}`));
}

export async function askConfirmation(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(chalk.cyan(`${message} [y/N]: `), (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export { chalk };
