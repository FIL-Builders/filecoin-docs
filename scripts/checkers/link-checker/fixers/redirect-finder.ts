import * as path from 'node:path';
import { distance as levenshtein } from 'fastest-levenshtein';
import { fileExists, joinPaths, getBasename, getAllFiles, getDirectory, normalizePath } from '../../shared/file-utils.js';
import { findRedirectTarget } from '../../shared/gitbook-yaml.js';
import type { BrokenLink, FixSuggestion, RedirectMap } from '../types.js';

let allFilesCache: string[] | null = null;

export async function findFixSuggestion(
  broken: BrokenLink,
  projectRoot: string,
  redirectMap: RedirectMap
): Promise<FixSuggestion | undefined> {
  const resolvedPath = broken.resolvedPath || broken.link.target;

  const redirectSuggestion = await findRedirectSuggestion(resolvedPath, redirectMap, projectRoot);
  if (redirectSuggestion) return redirectSuggestion;

  const basenameSuggestion = await findByBasename(resolvedPath, projectRoot);
  if (basenameSuggestion) return basenameSuggestion;

  const levenshteinSuggestion = await findBySimilarity(resolvedPath, projectRoot);
  if (levenshteinSuggestion) return levenshteinSuggestion;

  const caseSuggestion = await findByCaseVariation(resolvedPath, projectRoot);
  if (caseSuggestion) return caseSuggestion;

  const neighborSuggestion = findNeighborReadme(broken, projectRoot);
  if (neighborSuggestion) return neighborSuggestion;

  return undefined;
}

async function findRedirectSuggestion(
  brokenPath: string,
  redirectMap: RedirectMap,
  projectRoot: string
): Promise<FixSuggestion | undefined> {
  const variations = [
    brokenPath,
    brokenPath.replace(/^\//, ''),
    brokenPath.replace(/\.md$/, ''),
    brokenPath.replace(/^\//, '').replace(/\.md$/, ''),
  ];

  for (const variant of variations) {
    const redirectTarget = findRedirectTarget(redirectMap, variant);
    if (redirectTarget) {
      const fullPath = joinPaths(projectRoot, redirectTarget);
      if (fileExists(fullPath)) {
        const entry = redirectMap.entries.find(e => e.from === variant || e.from === brokenPath);

        return {
          confidence: 'high',
          suggestedPath: redirectTarget,
          reason: 'Redirect exists in .gitbook.yaml',
          redirectEntry: entry,
        };
      }
    }
  }

  return undefined;
}

async function findByBasename(brokenPath: string, projectRoot: string): Promise<FixSuggestion | undefined> {
  const basename = getBasename(brokenPath, true);

  if (!allFilesCache) {
    allFilesCache = await getAllFiles(projectRoot, ['.md']);
  }

  const matches = allFilesCache.filter(f => {
    const fBasename = getBasename(f, true);
    return fBasename.toLowerCase() === basename.toLowerCase();
  });

  if (matches.length === 1) {
    return {
      confidence: 'medium',
      suggestedPath: matches[0],
      reason: 'File with same name found in different location',
    };
  }

  if (matches.length > 1) {
    const scored = matches.map(m => ({ path: m, score: calculatePathSimilarity(brokenPath, m) }));
    scored.sort((a, b) => b.score - a.score);

    if (scored[0].score > 0.5) {
      return {
        confidence: 'medium',
        suggestedPath: scored[0].path,
        reason: `Similar file found (${matches.length} candidates, best match selected)`,
      };
    }
  }

  return undefined;
}

async function findBySimilarity(brokenPath: string, projectRoot: string): Promise<FixSuggestion | undefined> {
  if (!allFilesCache) {
    allFilesCache = await getAllFiles(projectRoot, ['.md']);
  }

  const maxDistance = Math.min(10, Math.floor(brokenPath.length * 0.3));
  const candidates: Array<{ path: string; distance: number }> = [];

  for (const filePath of allFilesCache) {
    const dist = levenshtein(brokenPath.toLowerCase(), filePath.toLowerCase());
    if (dist <= maxDistance) {
      candidates.push({ path: filePath, distance: dist });
    }
  }

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => a.distance - b.distance);
  const best = candidates[0];

  if (best.distance <= 5) {
    return {
      confidence: best.distance <= 2 ? 'medium' : 'low',
      suggestedPath: best.path,
      reason: `Similar path found (edit distance: ${best.distance})`,
    };
  }

  return undefined;
}

async function findByCaseVariation(brokenPath: string, projectRoot: string): Promise<FixSuggestion | undefined> {
  if (!allFilesCache) {
    allFilesCache = await getAllFiles(projectRoot, ['.md']);
  }

  const lowerBroken = brokenPath.toLowerCase();
  const match = allFilesCache.find(f => f.toLowerCase() === lowerBroken);

  if (match && match !== brokenPath) {
    return {
      confidence: 'low',
      suggestedPath: match,
      reason: 'Case variation of path exists',
    };
  }

  return undefined;
}

function findNeighborReadme(broken: BrokenLink, projectRoot: string): FixSuggestion | undefined {
  const linkTarget = broken.link.target;
  const isDirectoryLink = linkTarget.endsWith('/') ||
    (linkTarget.startsWith('.') && !linkTarget.includes('.md'));

  if (!isDirectoryLink) return undefined;

  const sourceDir = getDirectory(broken.sourceFile);
  const neighborPaths = [
    { relative: './', description: 'current directory' },
    { relative: '../', description: 'parent directory' },
    { relative: '../../', description: 'grandparent directory' },
  ];

  for (const neighbor of neighborPaths) {
    const resolvedTarget = normalizePath(path.join(sourceDir, neighbor.relative, 'README.md'));
    const fullPath = joinPaths(projectRoot, resolvedTarget);

    if (fileExists(fullPath)) {
      const suggestedLink = neighbor.relative + 'README.md';

      if (suggestedLink !== linkTarget && suggestedLink !== linkTarget + 'README.md') {
        return {
          confidence: 'low',
          suggestedPath: resolvedTarget,
          reason: `README.md found in ${neighbor.description}`,
        };
      }
    }
  }

  return undefined;
}

function calculatePathSimilarity(path1: string, path2: string): number {
  const segments1 = path1.split('/').filter(Boolean);
  const segments2 = path2.split('/').filter(Boolean);

  let commonCount = 0;
  const totalSegments = Math.max(segments1.length, segments2.length);

  for (const seg of segments1) {
    if (segments2.includes(seg)) commonCount++;
  }

  return totalSegments > 0 ? commonCount / totalSegments : 0;
}

export async function findAllFixSuggestions(
  brokenLinks: BrokenLink[],
  projectRoot: string,
  redirectMap: RedirectMap
): Promise<Map<BrokenLink, FixSuggestion | undefined>> {
  allFilesCache = null;

  const results = new Map<BrokenLink, FixSuggestion | undefined>();

  for (const broken of brokenLinks) {
    const suggestion = await findFixSuggestion(broken, projectRoot, redirectMap);
    results.set(broken, suggestion);
  }

  return results;
}

export function clearFilesCache(): void {
  allFilesCache = null;
}

export function groupByConfidence(
  suggestions: Map<BrokenLink, FixSuggestion | undefined>
): {
  high: Array<{ broken: BrokenLink; suggestion: FixSuggestion }>;
  medium: Array<{ broken: BrokenLink; suggestion: FixSuggestion }>;
  low: Array<{ broken: BrokenLink; suggestion: FixSuggestion }>;
  none: BrokenLink[];
} {
  const result = {
    high: [] as Array<{ broken: BrokenLink; suggestion: FixSuggestion }>,
    medium: [] as Array<{ broken: BrokenLink; suggestion: FixSuggestion }>,
    low: [] as Array<{ broken: BrokenLink; suggestion: FixSuggestion }>,
    none: [] as BrokenLink[],
  };

  for (const [broken, suggestion] of suggestions) {
    if (!suggestion) {
      result.none.push(broken);
    } else {
      result[suggestion.confidence].push({ broken, suggestion });
    }
  }

  return result;
}
