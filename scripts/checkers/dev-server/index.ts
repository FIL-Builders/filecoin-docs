#!/usr/bin/env node

import { spawn, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import { Command } from 'commander';

import { parseRedirectsWithRaw } from '../shared/gitbook-yaml.js';
import type { ProxyRedirectEntry } from './proxy.js';
import { dirExists, joinPaths, renameDirSync, removeDirSync, restoreDirSync } from '../shared/file-utils.js';
import { watchFile, watchDirectory } from '../shared/file-watcher.js';
import {
  printBanner,
  printStatus,
  printReady,
  printHonkitBuilding,
  printHonkitReady,
  printSwitching,
  printLive,
  printReload,
  printError,
  printShutdown,
  printNoCachedBuild,
  printCopying,
} from './reporter.js';
import { createStaticServer, type StaticServer } from './static-server.js';
import { createProxyServer, type ProxyServer } from './proxy.js';

const program = new Command();

program
  .name('dev-server')
  .description('Unified dev server running Honkit + redirect proxy')
  .version('1.0.0')
  .option('-r, --root <path>', 'Project root directory', '.')
  .option('-p, --port <number>', 'Proxy server port', '3000')
  .option('--static-port <number>', 'Static server port', '4002')
  .option('--honkit-port <number>', 'Honkit server port', '4001')
  .action(async (opts) => {
    try {
      await runDevServer({
        projectRoot: path.resolve(opts.root),
        proxyPort: parseInt(opts.port, 10),
        staticPort: parseInt(opts.staticPort, 10),
        honkitPort: parseInt(opts.honkitPort, 10),
      });
    } catch (error) {
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();

interface DevServerOptions {
  projectRoot: string;
  proxyPort: number;
  staticPort: number;
  honkitPort: number;
}

interface DevServerState {
  honkitProcess: ChildProcess | null;
  staticServer: StaticServer | null;
  proxyServer: ProxyServer | null;
  buildStartTime: number;
  hasCachedBuild: boolean;
  isLiveMode: boolean;
  watchersSetup: boolean;
  isCleaningUp: boolean;
  redirects: Record<string, ProxyRedirectEntry>;
  redirectCount: number;
}

interface DevServerPaths {
  gitbookYamlPath: string;
  bookDir: string;
  tempBookDir: string;
}

function loadRedirects(yamlPath: string): Record<string, ProxyRedirectEntry> {
  const parsed = parseRedirectsWithRaw(yamlPath);
  const redirects: Record<string, ProxyRedirectEntry> = {};
  for (const { from, to, rawFrom, rawTo } of parsed) {
    redirects[from] = { to, rawFrom, rawTo };
  }
  return redirects;
}

function spawnHonkit(projectRoot: string, honkitPort: number): ChildProcess {
  return spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['honkit', 'serve', '--port', String(honkitPort), '--lrport', '35730'],
    {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
}

function setupHonkitOutputHandlers(
  honkitProcess: ChildProcess,
  state: DevServerState,
  opts: DevServerOptions,
  paths: DevServerPaths,
  onCleanup: (shouldExit: boolean) => void,
  onSetupWatchers: () => void
): void {
  const { projectRoot, proxyPort, staticPort, honkitPort } = opts;
  const { tempBookDir } = paths;

  honkitProcess.stdout?.on('data', (data: Buffer) => {
    const output = data.toString();

    if (output.includes('Starting server')) {
      state.buildStartTime = Date.now();
      if (!state.hasCachedBuild && !state.isLiveMode) {
        printStatus('Building...');
      }
    }

    if (output.includes('generation finished with success')) {
      const match = output.match(/in ([\d.]+)s/);
      const buildTime = match ? `${match[1]}s` : `${((Date.now() - state.buildStartTime) / 1000).toFixed(1)}s`;

      if (!state.isLiveMode) {
        printHonkitReady(buildTime);

        if (state.hasCachedBuild) {
          printSwitching();

          state.staticServer?.close();
          state.staticServer = null;
          removeDirSync(tempBookDir);

          state.proxyServer?.switchBackend('honkit');
          printLive();
        } else {
          state.proxyServer = createProxyServer(state.redirects, { projectRoot, staticPort, honkitPort });
          state.proxyServer.switchBackend('honkit');
          state.proxyServer.server.listen(proxyPort, () => {
            printReady(proxyPort, state.redirectCount);
          });
        }

        state.isLiveMode = true;

        if (!state.watchersSetup) {
          onSetupWatchers();
          state.watchersSetup = true;
        }
      }
    }

    if (output.includes('Restart') && state.isLiveMode) {
      printStatus('Rebuilding...');
    }
  });

  honkitProcess.stderr?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output && !output.includes('ExperimentalWarning') && !output.includes('deprecated')) {
      printError(output);
    }
  });

  honkitProcess.on('error', (err) => {
    printError(`Honkit failed: ${err.message}`);
    process.exit(1);
  });

  honkitProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      printError(`Honkit exited with code ${code}`);
    }
    onCleanup(false);
  });
}

function setupFileWatchers(
  state: DevServerState,
  paths: DevServerPaths
): void {
  const { gitbookYamlPath, bookDir } = paths;

  watchFile(gitbookYamlPath, () => {
    try {
      const newRedirects = loadRedirects(gitbookYamlPath);
      state.proxyServer?.updateRedirects(newRedirects);
      printReload('redirects');
    } catch {
      // Silent on parse errors
    }
  });

  if (dirExists(bookDir)) {
    watchDirectory(bookDir, () => printReload('build'), {
      filter: (f) => f.endsWith('.html') || f.endsWith('.json'),
      debounceMs: 1000,
    });
  }
}

function createCleanupHandler(
  state: DevServerState,
  paths: DevServerPaths
): (shouldExit?: boolean) => void {
  const { bookDir, tempBookDir } = paths;

  return (shouldExit: boolean = true) => {
    if (state.isCleaningUp) return;
    state.isCleaningUp = true;

    state.staticServer?.close();
    state.proxyServer?.server.close();

    if (state.hasCachedBuild && !state.isLiveMode && dirExists(tempBookDir)) {
      restoreDirSync(tempBookDir, bookDir);
    } else if (dirExists(tempBookDir)) {
      removeDirSync(tempBookDir);
    }

    if (state.honkitProcess && !state.honkitProcess.killed) {
      state.honkitProcess.kill('SIGTERM');
    }

    printShutdown();

    if (shouldExit) {
      process.exit(0);
    }
  };
}

async function runDevServer(opts: DevServerOptions): Promise<void> {
  const { projectRoot, proxyPort, staticPort, honkitPort } = opts;

  const paths: DevServerPaths = {
    gitbookYamlPath: joinPaths(projectRoot, '.gitbook.yaml'),
    bookDir: joinPaths(projectRoot, '_book'),
    tempBookDir: joinPaths(projectRoot, '_book_temp'),
  };

  const redirects = loadRedirects(paths.gitbookYamlPath);

  const state: DevServerState = {
    honkitProcess: null,
    staticServer: null,
    proxyServer: null,
    buildStartTime: Date.now(),
    hasCachedBuild: dirExists(paths.bookDir),
    isLiveMode: false,
    watchersSetup: false,
    isCleaningUp: false,
    redirects,
    redirectCount: Object.keys(redirects).length,
  };

  const cleanup = createCleanupHandler(state, paths);

  printBanner({ proxyPort, hasCachedBuild: state.hasCachedBuild });

  if (state.hasCachedBuild) {
    printCopying();
    renameDirSync(paths.bookDir, paths.tempBookDir);

    state.staticServer = createStaticServer(paths.tempBookDir);
    state.staticServer.server.listen(staticPort);

    state.proxyServer = createProxyServer(redirects, { projectRoot, staticPort, honkitPort });
    state.proxyServer.server.listen(proxyPort, () => {
      printReady(proxyPort, state.redirectCount);
    });

    printHonkitBuilding();
  } else {
    printNoCachedBuild();
  }

  state.buildStartTime = Date.now();
  state.honkitProcess = spawnHonkit(projectRoot, honkitPort);

  setupHonkitOutputHandlers(
    state.honkitProcess,
    state,
    opts,
    paths,
    cleanup,
    () => setupFileWatchers(state, paths)
  );

  process.on('SIGINT', () => cleanup());
  process.on('SIGTERM', () => cleanup());
}
