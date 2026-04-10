import { distance } from 'fastest-levenshtein';
import { readFile, fileExists, joinPaths } from '../../shared/file-utils.js';
import { parseMarkdownHeadings, generateAnchorId } from '../parsers/markdown.js';
import type { ParsedLink, HeadingInfo, FileHeadings } from '../types.js';

const headingsCache = new Map<string, FileHeadings>();

export function getFileHeadings(filePath: string, projectRoot: string): FileHeadings | null {
  const fullPath = joinPaths(projectRoot, filePath);

  if (!fileExists(fullPath)) {
    return null;
  }

  if (headingsCache.has(filePath)) {
    return headingsCache.get(filePath)!;
  }

  const content = readFile(fullPath);
  const headings = parseMarkdownHeadings(filePath, content);
  headingsCache.set(filePath, headings);

  return headings;
}

export function clearHeadingsCache(): void {
  headingsCache.clear();
}

export function validateAnchor(
  targetFile: string,
  anchor: string,
  projectRoot: string
): { valid: boolean; error?: string; suggestions?: string[] } {
  const headings = getFileHeadings(targetFile, projectRoot);

  if (!headings) {
    return { valid: false, error: `Target file not found: ${targetFile}` };
  }

  const normalizedAnchor = anchor.toLowerCase();

  const exactMatch = headings.headings.find(h => h.id === normalizedAnchor);
  if (exactMatch) {
    return { valid: true };
  }

  const caseInsensitiveMatch = headings.headings.find(
    h => h.id.toLowerCase() === normalizedAnchor
  );
  if (caseInsensitiveMatch) {
    return { valid: true };
  }

  const suggestions = findSimilarAnchors(normalizedAnchor, headings.headings);

  return {
    valid: false,
    error: `Anchor not found: #${anchor} in ${targetFile}`,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

function findSimilarAnchors(targetAnchor: string, headings: HeadingInfo[]): string[] {
  const suggestions: Array<{ id: string; score: number }> = [];

  for (const heading of headings) {
    const score = calculateSimilarity(targetAnchor, heading.id);
    if (score > 0.5) {
      suggestions.push({ id: heading.id, score });
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.id);
}

function calculateSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const maxLen = Math.max(aLower.length, bLower.length);
  if (maxLen === 0) return 1;
  return 1 - distance(aLower, bLower) / maxLen;
}

export function validateAllAnchors(
  links: Array<{ sourceFile: string; link: ParsedLink; resolvedPath: string }>,
  projectRoot: string
): Array<{
  sourceFile: string;
  link: ParsedLink;
  anchorValid: boolean;
  error?: string;
  suggestions?: string[];
}> {
  const results: Array<{
    sourceFile: string;
    link: ParsedLink;
    anchorValid: boolean;
    error?: string;
    suggestions?: string[];
  }> = [];

  for (const { sourceFile, link, resolvedPath } of links) {
    if (!link.anchor) continue;

    const validation = validateAnchor(resolvedPath, link.anchor, projectRoot);

    results.push({
      sourceFile,
      link,
      anchorValid: validation.valid,
      error: validation.error,
      suggestions: validation.suggestions,
    });
  }

  return results;
}

export function getAvailableAnchors(filePath: string, projectRoot: string): string[] {
  const headings = getFileHeadings(filePath, projectRoot);
  if (!headings) return [];
  return headings.headings.map(h => h.id);
}

export function suggestAnchorForText(headingText: string): string {
  return generateAnchorId(headingText);
}
