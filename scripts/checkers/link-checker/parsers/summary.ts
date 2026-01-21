import { readFile } from '../../shared/file-utils.js';
import { cleanLinkPath } from '../../shared/path-utils.js';
import type { SummaryEntry, SummaryStructure } from '../types.js';

export function parseSummary(summaryPath: string): SummaryStructure {
  const content = readFile(summaryPath);
  const lines = content.split('\n');
  const entries: SummaryEntry[] = [];
  const allPaths: string[] = [];

  const entryRegex = /^(\s*)[\*\-]\s+\[([^\]]+)\]\(([^)]+)\)/;
  const parentStack: SummaryEntry[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;

    const match = entryRegex.exec(line);
    if (!match) continue;

    const [, indent, title, rawPath] = match;
    const depth = Math.floor(indent.length / 2);
    const path = cleanLinkPath(rawPath.trim());

    const entry: SummaryEntry = {
      title: title.trim(),
      path,
      line: lineNumber,
      depth,
      children: [],
    };

    allPaths.push(path);

    if (depth === 0) {
      entries.push(entry);
      parentStack.length = 0;
      parentStack.push(entry);
    } else {
      while (parentStack.length > 0 && parentStack[parentStack.length - 1].depth >= depth) {
        parentStack.pop();
      }

      if (parentStack.length > 0) {
        parentStack[parentStack.length - 1].children.push(entry);
      } else {
        entries.push(entry);
      }

      parentStack.push(entry);
    }
  }

  return { entries, allPaths };
}

export function flattenSummary(structure: SummaryStructure): SummaryEntry[] {
  const result: SummaryEntry[] = [];

  function flatten(entries: SummaryEntry[]): void {
    for (const entry of entries) {
      result.push(entry);
      if (entry.children.length > 0) {
        flatten(entry.children);
      }
    }
  }

  flatten(structure.entries);
  return result;
}

export function getSummaryPaths(summaryPath: string): Set<string> {
  const structure = parseSummary(summaryPath);
  return new Set(structure.allPaths);
}

export function findEntriesForPath(structure: SummaryStructure, targetPath: string): SummaryEntry[] {
  const normalizedTarget = targetPath.toLowerCase();
  const allEntries = flattenSummary(structure);
  return allEntries.filter(entry => entry.path.toLowerCase() === normalizedTarget);
}

export function validateSummaryPaths(
  structure: SummaryStructure,
  fileExistsFn: (path: string) => boolean
): SummaryEntry[] {
  const allEntries = flattenSummary(structure);
  const missing: SummaryEntry[] = [];

  for (const entry of allEntries) {
    if (!fileExistsFn(entry.path)) {
      missing.push(entry);
    }
  }

  return missing;
}
