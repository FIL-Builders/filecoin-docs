import { chalk, timestamp } from '../shared/reporter.js';

export interface BannerConfig {
  proxyPort: number;
  hasCachedBuild: boolean;
}

export function printBanner(config: BannerConfig): void {
  const { proxyPort, hasCachedBuild } = config;

  console.log();
  console.log(chalk.bold.blue('Filecoin Docs Dev Server'));
  console.log(chalk.blue('='.repeat(24)));
  console.log();
  console.log(`  ${chalk.gray('Server:')}  ${chalk.cyan(`http://localhost:${proxyPort}`)}`);
  if (hasCachedBuild) {
    console.log(`  ${chalk.gray('Mode:')}    ${chalk.green('Instant start')} ${chalk.dim('(cached build)')}`);
  } else {
    console.log(`  ${chalk.gray('Mode:')}    ${chalk.yellow('First build')} ${chalk.dim('(please wait)')}`);
  }
  console.log();
}

export function printStatus(message: string): void {
  console.log(`${timestamp()} ${chalk.cyan(message)}`);
}

export function printReady(port: number, redirectCount: number): void {
  console.log(`${timestamp()} ${chalk.green('Ready')} on :${port} ${chalk.dim(`(${redirectCount} redirects)`)}`);
  console.log();
  console.log(`  ${chalk.dim('Press Ctrl+C to stop')}`);
  console.log();
}

export function printHonkitBuilding(): void {
  console.log(`${timestamp()} ${chalk.cyan('Honkit building in background...')}`);
}

export function printHonkitReady(buildTime: string): void {
  console.log(`${timestamp()} ${chalk.green('Honkit ready')} ${chalk.dim(`(${buildTime})`)}`);
}

export function printSwitching(): void {
  console.log(`${timestamp()} ${chalk.cyan('Switching to live Honkit...')}`);
}

export function printLive(): void {
  console.log(`${timestamp()} ${chalk.green('Now serving live builds')}`);
}

export function printReload(type: 'redirects' | 'build'): void {
  if (type === 'redirects') {
    console.log(`${timestamp()} ${chalk.cyan('Reloaded')} redirects`);
  } else {
    console.log(`${timestamp()} ${chalk.cyan('Build updated')}`);
  }
}

export function printError(message: string): void {
  console.log(`${timestamp()} ${chalk.red('Error')} ${message}`);
}

export function printShutdown(): void {
  console.log();
  console.log(chalk.dim('Dev server stopped.'));
}

export function printNoCachedBuild(): void {
  console.log(`${timestamp()} ${chalk.yellow('No cached build')} - waiting for Honkit...`);
}

export function printCopying(): void {
  console.log(`${timestamp()} ${chalk.cyan('Using cached build...')}`);
}
