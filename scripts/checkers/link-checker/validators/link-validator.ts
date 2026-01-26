import { fileExists, joinPaths } from '../../shared/file-utils.js';
import { resolveRelativeLink } from '../../shared/path-utils.js';
import { findRedirectTarget } from '../../shared/gitbook-yaml.js';
import type {
  ParsedLink,
  FileLinks,
  ValidationResult,
  BrokenLink,
  RedirectMap,
} from '../types.js';

export function validateLink(
  sourceFile: string,
  link: ParsedLink,
  projectRoot: string,
  redirectMap?: RedirectMap
): ValidationResult {
  if (link.type === 'external') {
    return { sourceFile, link, status: 'valid', resolvedPath: link.target };
  }

  if (link.type === 'anchor-only') {
    return { sourceFile, link, status: 'valid', resolvedPath: sourceFile };
  }

  const resolved = resolveRelativeLink(sourceFile, link.target, projectRoot);

  if (resolved.exists) {
    return { sourceFile, link, status: 'valid', resolvedPath: resolved.resolved };
  }

  if (redirectMap) {
    const redirectTarget = findRedirectTarget(redirectMap, resolved.resolved);
    if (redirectTarget) {
      const redirectFullPath = joinPaths(projectRoot, redirectTarget);
      if (fileExists(redirectFullPath)) {
        return {
          sourceFile,
          link,
          status: 'redirect-available',
          resolvedPath: resolved.resolved,
          error: `Target not found: ${resolved.resolved}. Redirect available to: ${redirectTarget}`,
        };
      }
    }
  }

  return {
    sourceFile,
    link,
    status: 'broken',
    resolvedPath: resolved.resolved,
    error: `Target not found: ${resolved.resolved}`,
  } as BrokenLink;
}

export function validateFileLinks(
  fileLinks: FileLinks,
  projectRoot: string,
  redirectMap?: RedirectMap
): ValidationResult[] {
  return fileLinks.links.map(link => validateLink(fileLinks.filePath, link, projectRoot, redirectMap));
}

export function validateAllLinks(
  allFileLinks: FileLinks[],
  projectRoot: string,
  redirectMap?: RedirectMap
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const fileLinks of allFileLinks) {
    const fileResults = validateFileLinks(fileLinks, projectRoot, redirectMap);
    results.push(...fileResults);
  }

  return results;
}

export function getBrokenLinks(results: ValidationResult[]): BrokenLink[] {
  return results.filter((r): r is BrokenLink => r.status === 'broken');
}

export function getValidationStats(results: ValidationResult[]): {
  total: number;
  valid: number;
  broken: number;
  redirectAvailable: number;
  filesAffected: number;
} {
  const broken = results.filter(r => r.status === 'broken').length;
  const redirectAvailable = results.filter(r => r.status === 'redirect-available').length;
  const valid = results.filter(r => r.status === 'valid').length;

  const filesWithIssues = new Set(
    results.filter(r => r.status !== 'valid').map(r => r.sourceFile)
  );

  return { total: results.length, valid, broken, redirectAvailable, filesAffected: filesWithIssues.size };
}

export function pathExists(targetPath: string, projectRoot: string): boolean {
  const fullPath = joinPaths(projectRoot, targetPath);
  return fileExists(fullPath);
}
