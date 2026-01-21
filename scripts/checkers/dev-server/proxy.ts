import * as http from 'node:http';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { hasRedirectConflict, normalizeUrlPath, targetPathExists } from '../shared/path-utils.js';
import { joinPaths, fileExists, dirExists } from '../shared/file-utils.js';
import type { ParsedRedirectEntry } from '../shared/types.js';

export type BackendType = 'static' | 'honkit';

export type ProxyRedirectEntry = Omit<ParsedRedirectEntry, 'from'>;

export interface ProxyConfig {
  projectRoot: string;
  staticPort: number;
  honkitPort: number;
}

export interface ProxyServer {
  server: http.Server;
  updateRedirects: (redirects: Record<string, ProxyRedirectEntry>) => void;
  switchBackend: (backend: BackendType) => void;
}

const __dirname = path.dirname(__filename);

const notFoundTemplate = fs.readFileSync(
  path.join(__dirname, 'templates', '404.html'),
  'utf-8'
);

const brokenRedirectTemplate = fs.readFileSync(
  path.join(__dirname, 'templates', 'broken-redirect.html'),
  'utf-8'
);

function renderNotFoundPage(requestedPath: string): string {
  return notFoundTemplate.replace('{{PATH}}', requestedPath);
}

function renderBrokenRedirectPage(rawFrom: string, rawTo: string): string {
  return brokenRedirectTemplate
    .replace('{{FROM}}', rawFrom)
    .replace('{{TO}}', rawTo);
}

export function createProxyServer(
  initialRedirects: Record<string, ProxyRedirectEntry>,
  config: ProxyConfig
): ProxyServer {
  const { staticPort, honkitPort, projectRoot } = config;
  const bookDir = joinPaths(projectRoot, '_book');
  const tempBookDir = joinPaths(projectRoot, '_book_temp');

  let redirects = initialRedirects;
  let currentBackend: BackendType = 'static';

  const server = http.createServer((req, res) => {
    const fullUrl = req.url?.replace(/\/$/, '') || '/';
    const urlPath = (req.url?.split('?')[0].replace(/\/$/, '')) || '/';

    const redirectEntry = redirects[fullUrl] || redirects[urlPath];
    const redirectKey = redirects[fullUrl] ? fullUrl : urlPath;

    if (redirectEntry && !hasRedirectConflict(redirectKey, redirectEntry.to, projectRoot)) {
      if (!targetPathExists(redirectEntry.to, projectRoot)) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(renderBrokenRedirectPage(redirectEntry.rawFrom, redirectEntry.rawTo));
        return;
      }
      res.writeHead(301, { Location: redirectEntry.to });
      res.end();
      return;
    }

    const targetPort = currentBackend === 'static' ? staticPort : honkitPort;
    const targetBookDir = currentBackend === 'static' ? tempBookDir : bookDir;

    const rawPath = req.url?.split('?')[0] || '/';
    if (rawPath.endsWith('/') && rawPath !== '/') {
      const pathWithoutSlash = rawPath.slice(0, -1);
      const htmlFile = joinPaths(targetBookDir, pathWithoutSlash + '.html');
      const indexFile = joinPaths(targetBookDir, rawPath, 'index.html');
      if (fileExists(htmlFile) && !fileExists(indexFile) && !dirExists(joinPaths(targetBookDir, pathWithoutSlash))) {
        const query = req.url?.includes('?') ? '?' + req.url.split('?')[1] : '';
        res.writeHead(301, { Location: pathWithoutSlash + query });
        res.end();
        return;
      }
    }

    const [pathPart, queryPart] = (req.url || '/').split('?');
    let proxyPath = '/' + normalizeUrlPath(pathPart, targetBookDir);
    if (queryPart) {
      proxyPath += '?' + queryPart;
    }

    const proxyReq = http.request({
      hostname: 'localhost',
      port: targetPort,
      path: proxyPath,
      method: req.method,
      headers: req.headers
    }, proxyRes => {
      if (proxyRes.statusCode === 404) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(renderNotFoundPage(urlPath));
        return;
      }
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', () => {
      res.writeHead(502);
      res.end('Backend not ready');
    });

    req.pipe(proxyReq);
  });

  return {
    server,
    updateRedirects: (newRedirects: Record<string, ProxyRedirectEntry>) => {
      redirects = newRedirects;
    },
    switchBackend: (backend: BackendType) => {
      currentBackend = backend;
    },
  };
}
