import { readFile, writeFile, joinPaths } from '../../shared/file-utils.js';
import { toRelativeLink } from '../../shared/path-utils.js';
import { addRedirects } from '../../shared/gitbook-yaml.js';
import type { BrokenLink, FixSuggestion, FixResult, ParsedLink } from '../types.js';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLinkReplacementPattern(link: ParsedLink): RegExp {
  const escapedTarget = escapeRegex(link.target);
  const anchorPart = link.anchor ? `#${escapeRegex(link.anchor)}` : '';
  return new RegExp(`\\]\\(<?${escapedTarget}${anchorPart}>?\\)`, 'g');
}

function replaceLink(line: string, link: ParsedLink, newTarget: string): string | null {
  const pattern = buildLinkReplacementPattern(link);
  const replacement = `](${newTarget})`;
  const newLine = line.replace(pattern, replacement);
  return newLine !== line ? newLine : null;
}

export function applyFix(broken: BrokenLink, suggestion: FixSuggestion, projectRoot: string): FixResult {
  try {
    const filePath = joinPaths(projectRoot, broken.sourceFile);
    const content = readFile(filePath);
    const lines = content.split('\n');

    const lineIndex = broken.link.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return {
        sourceFile: broken.sourceFile,
        originalLink: broken.link,
        newPath: suggestion.suggestedPath,
        success: false,
        error: `Line ${broken.link.line} not found in file`,
        redirectAdded: false,
      };
    }

    const line = lines[lineIndex];
    const newRelativePath = toRelativeLink(broken.sourceFile, suggestion.suggestedPath);
    const newTarget = broken.link.anchor ? `${newRelativePath}#${broken.link.anchor}` : newRelativePath;

    const updatedLine = replaceLink(line, broken.link, newTarget);

    if (!updatedLine) {
      return {
        sourceFile: broken.sourceFile,
        originalLink: broken.link,
        newPath: suggestion.suggestedPath,
        success: false,
        error: `Could not find link to replace on line ${broken.link.line}`,
        redirectAdded: false,
      };
    }

    lines[lineIndex] = updatedLine;
    writeFile(filePath, lines.join('\n'));

    return {
      sourceFile: broken.sourceFile,
      originalLink: broken.link,
      newPath: suggestion.suggestedPath,
      success: true,
      redirectAdded: false,
    };
  } catch (error) {
    return {
      sourceFile: broken.sourceFile,
      originalLink: broken.link,
      newPath: suggestion.suggestedPath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      redirectAdded: false,
    };
  }
}

export function applyFixes(
  fixes: Array<{ broken: BrokenLink; suggestion: FixSuggestion }>,
  projectRoot: string
): FixResult[] {
  const fixesByFile = new Map<string, Array<{ broken: BrokenLink; suggestion: FixSuggestion }>>();

  for (const fix of fixes) {
    const existing = fixesByFile.get(fix.broken.sourceFile) || [];
    existing.push(fix);
    fixesByFile.set(fix.broken.sourceFile, existing);
  }

  const results: FixResult[] = [];

  for (const [sourceFile, fileFixes] of fixesByFile) {
    fileFixes.sort((a, b) => b.broken.link.line - a.broken.link.line);

    const filePath = joinPaths(projectRoot, sourceFile);
    const content = readFile(filePath);
    const lines = content.split('\n');

    for (const { broken, suggestion } of fileFixes) {
      const lineIndex = broken.link.line - 1;

      if (lineIndex < 0 || lineIndex >= lines.length) {
        results.push({
          sourceFile: broken.sourceFile,
          originalLink: broken.link,
          newPath: suggestion.suggestedPath,
          success: false,
          error: `Line ${broken.link.line} not found in file`,
          redirectAdded: false,
        });
        continue;
      }

      const line = lines[lineIndex];
      const newRelativePath = toRelativeLink(broken.sourceFile, suggestion.suggestedPath);
      const newTarget = broken.link.anchor ? `${newRelativePath}#${broken.link.anchor}` : newRelativePath;

      const updatedLine = replaceLink(line, broken.link, newTarget);

      if (!updatedLine) {
        results.push({
          sourceFile: broken.sourceFile,
          originalLink: broken.link,
          newPath: suggestion.suggestedPath,
          success: false,
          error: 'Could not find link to replace',
          redirectAdded: false,
        });
        continue;
      }

      lines[lineIndex] = updatedLine;

      results.push({
        sourceFile: broken.sourceFile,
        originalLink: broken.link,
        newPath: suggestion.suggestedPath,
        success: true,
        redirectAdded: false,
      });
    }

    writeFile(filePath, lines.join('\n'));
  }

  return results;
}

export function generateRedirectEntries(fixResults: FixResult[]): Array<{ from: string; to: string }> {
  const redirects: Array<{ from: string; to: string }> = [];

  for (const result of fixResults) {
    if (result.success) {
      const brokenResolved = result.originalLink.target;

      let from = brokenResolved.replace(/^\.\//, '').replace(/\.md$/, '');

      if (from.includes('..')) continue;

      const to = result.newPath;

      if (!redirects.some(r => r.from === from && r.to === to)) {
        redirects.push({ from, to });
      }
    }
  }

  return redirects;
}

export function applyRedirects(gitbookYamlPath: string, redirects: Array<{ from: string; to: string }>): void {
  if (redirects.length === 0) return;
  addRedirects(gitbookYamlPath, redirects);
}

export async function applyFixesWithRedirects(
  fixes: Array<{ broken: BrokenLink; suggestion: FixSuggestion }>,
  projectRoot: string,
  gitbookYamlPath: string,
  addRedirectsFlag: boolean = true
): Promise<{ fixResults: FixResult[]; redirectsAdded: number }> {
  const fixResults = applyFixes(fixes, projectRoot);

  let redirectsAdded = 0;

  if (addRedirectsFlag) {
    const redirects = generateRedirectEntries(fixResults);
    if (redirects.length > 0) {
      applyRedirects(gitbookYamlPath, redirects);
      redirectsAdded = redirects.length;

      for (const result of fixResults) {
        if (result.success) {
          result.redirectAdded = true;
        }
      }
    }
  }

  return { fixResults, redirectsAdded };
}

export function previewFix(
  broken: BrokenLink,
  suggestion: FixSuggestion
): { originalLine: string; newLine: string; newRelativePath: string } {
  const newRelativePath = toRelativeLink(broken.sourceFile, suggestion.suggestedPath);

  const newTarget = broken.link.anchor ? `${newRelativePath}#${broken.link.anchor}` : newRelativePath;
  const oldTarget = broken.link.anchor ? `${broken.link.target}#${broken.link.anchor}` : broken.link.target;

  const originalLine = `[${broken.link.text}](${oldTarget})`;
  const newLine = `[${broken.link.text}](${newTarget})`;

  return { originalLine, newLine, newRelativePath };
}
