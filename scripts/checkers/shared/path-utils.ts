import * as path from 'node:path';
import { normalizePath, fileExists, joinPaths, dirExists } from './file-utils.js';
import type { ResolvedPath } from './types.js';

export function resolveRelativeLink(
  sourceFile: string,
  linkTarget: string,
  projectRoot: string
): ResolvedPath {
  let target = linkTarget;
  let anchor: string | undefined;

  const anchorIndex = linkTarget.indexOf('#');
  if (anchorIndex !== -1) {
    target = linkTarget.substring(0, anchorIndex);
    anchor = linkTarget.substring(anchorIndex + 1);
  }

  if (!target) {
    return {
      resolved: sourceFile,
      exists: fileExists(joinPaths(projectRoot, sourceFile)),
      original: linkTarget,
      anchor,
    };
  }

  target = normalizePath(target);

  const sourceDir = path.dirname(sourceFile);

  let resolved: string;
  if (target.startsWith('/')) {
    resolved = target.substring(1);
  } else {
    resolved = path.join(sourceDir, target);
  }

  resolved = normalizePath(resolved);

  const fullPath = joinPaths(projectRoot, resolved);
  if (!resolved.endsWith('.md') && !resolved.includes('.')) {
    const withMdPath = fullPath + '.md';
    if (fileExists(withMdPath)) {
      resolved = resolved + '.md';
    } else {
      const readmePath = joinPaths(fullPath, 'README.md');
      if (fileExists(readmePath)) {
        resolved = joinPaths(resolved, 'README.md');
      }
    }
  }

  return {
    resolved,
    exists: fileExists(joinPaths(projectRoot, resolved)),
    original: linkTarget,
    anchor,
  };
}

export function toRelativeLink(sourceFile: string, targetPath: string): string {
  const sourceDir = path.dirname(sourceFile);
  let relative = path.relative(sourceDir, targetPath);

  relative = relative.replace(/\\/g, '/');

  if (!relative.startsWith('.') && !relative.startsWith('/')) {
    relative = './' + relative;
  }

  return relative;
}

export function isExternalLink(link: string): boolean {
  return /^(https?:|mailto:|tel:|ftp:)/i.test(link);
}

export function isAnchorOnly(link: string): boolean {
  return link.startsWith('#');
}

export function isAssetLink(link: string): boolean {
  const assetExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.pdf', '.zip', '.tar', '.gz',
    '.mp4', '.webm', '.mov',
    '.mp3', '.wav', '.ogg',
  ];
  const ext = path.extname(link).toLowerCase();
  return assetExtensions.includes(ext);
}

export function decodeLink(link: string): string {
  try {
    return decodeURIComponent(link);
  } catch {
    return link;
  }
}

export function cleanLinkPath(link: string): string {
  return decodeLink(link)
    .replace(/\\_/g, '_')
    .replace(/\\#/g, '#')
    .replace(/\\ /g, ' ');
}

export function mdToHtml(mdPath: string): string {
  let result = mdPath.replace(/\.md$/, '.html');
  result = result.replace(/\/README\.html$/, '/');
  return result;
}

export function htmlToMd(htmlPath: string): string {
  let result = htmlPath.replace(/\.html$/, '.md');
  result = result.replace(/\/index\.md$/, '/README.md');
  if (result.endsWith('/')) {
    result = result + 'README.md';
  }
  return result;
}

export function targetPathExists(
  urlPath: string,
  projectRoot: string,
  bookDir?: string
): boolean {
  const cleanPath = urlPath.replace(/^\//, '');
  const pathWithoutTrailingSlash = cleanPath.replace(/\/$/, '');

  const bookDirPath = bookDir || joinPaths(projectRoot, '_book');
  if (dirExists(bookDirPath)) {
    const builtPath = joinPaths(bookDirPath, cleanPath);
    if (fileExists(builtPath)) return true;
    if (cleanPath.endsWith('/') || !cleanPath.includes('.')) {
      const indexPath = joinPaths(bookDirPath, cleanPath, 'index.html');
      if (fileExists(indexPath)) return true;
      const htmlPath = joinPaths(bookDirPath, pathWithoutTrailingSlash + '.html');
      if (fileExists(htmlPath)) return true;
    }
  }

  const sourcePath = cleanPath.replace(/\.html$/, '.md').replace(/\/index\.md$/, '/README.md');
  let mdPath = joinPaths(projectRoot, sourcePath);
  if (fileExists(mdPath)) return true;

  if (cleanPath.endsWith('/') || !cleanPath.includes('.')) {
    mdPath = joinPaths(projectRoot, cleanPath, 'README.md');
    if (fileExists(mdPath)) return true;
    mdPath = joinPaths(projectRoot, pathWithoutTrailingSlash + '.md');
    if (fileExists(mdPath)) return true;
  }

  return false;
}

export function hasRedirectConflict(
  fromPath: string,
  toPath: string,
  projectRoot: string
): boolean {
  const fromClean = fromPath.replace(/^\//, '').replace(/\.html$/, '');
  const toClean = toPath.replace(/^\//, '').replace(/\.html$/, '');

  if (toClean === fromClean || toClean === `${fromClean}/README` || toClean === `${fromClean}/index`) {
    return false;
  }

  const sourceMd = joinPaths(projectRoot, fromClean + '.md');
  if (fileExists(sourceMd)) {
    return true;
  }

  return false;
}

export function normalizeUrlPath(urlPath: string, rootDir: string): string {
  let cleanPath = urlPath
    .replace(/\/+/g, '/')
    .replace(/^\//, '')
    .replace(/\/$/, '');

  if (cleanPath.endsWith('.md')) {
    return cleanPath.replace(/\.md$/, '.html');
  }

  const fullPath = joinPaths(rootDir, cleanPath);
  if (fileExists(fullPath)) {
    return cleanPath;
  }

  if (!cleanPath.includes('.') && cleanPath !== '') {
    const htmlPath = joinPaths(rootDir, cleanPath + '.html');
    if (fileExists(htmlPath)) {
      return cleanPath + '.html';
    }
    const indexPath = joinPaths(rootDir, cleanPath, 'index.html');
    if (fileExists(indexPath)) {
      return joinPaths(cleanPath, 'index.html');
    }
  }

  if (cleanPath === '') {
    return 'index.html';
  }

  return cleanPath;
}
