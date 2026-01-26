import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeUrlPath } from '../shared/path-utils.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export interface StaticServer {
  server: http.Server;
  close: () => Promise<void>;
}

export function createStaticServer(rootDir: string): StaticServer {
  const server = http.createServer((req, res) => {
    const urlPath = (req.url?.split('?')[0]) || '/';
    const filePath = normalizeUrlPath(urlPath, rootDir);
    const fullPath = path.join(rootDir, filePath);

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const mimeType = getMimeType(fullPath);
    const content = fs.readFileSync(fullPath);

    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  });

  return {
    server,
    close: () => new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
  };
}
