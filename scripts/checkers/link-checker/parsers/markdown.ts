import { readFile } from '../../shared/file-utils.js';
import {
  isExternalLink,
  isAnchorOnly,
  isAssetLink,
  cleanLinkPath,
} from '../../shared/path-utils.js';
import type { ParsedLink, FileLinks, LinkType, HeadingInfo, FileHeadings } from '../types.js';

function computeCodeBlockState(lines: string[]): boolean[] {
  const state: boolean[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (/^```|^~~~/.test(line.trim())) {
      inBlock = !inBlock;
    }
    state.push(inBlock);
  }

  return state;
}

export function parseMarkdownLinks(filePath: string, content?: string): FileLinks {
  const fileContent = content ?? readFile(filePath);
  const lines = fileContent.split('\n');
  const codeBlockState = computeCodeBlockState(lines);
  const links: ParsedLink[] = [];

  const standardLinkRegex = /\[([^\]]*)\]\(([^()<>\s]+(?:\([^()]*\))?[^()<>\s]*)\)/g;
  const angleBracketLinkRegex = /\[([^\]]*)\]\(<([^>]+)>\)/g;
  const htmlLinkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  const dataRefRegex = /data-ref=["']([^"']+)["']/gi;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;

    if (codeBlockState[lineIndex]) {
      continue;
    }

    let match: RegExpExecArray | null;
    angleBracketLinkRegex.lastIndex = 0;

    while ((match = angleBracketLinkRegex.exec(line)) !== null) {
      const [raw, text, target] = match;
      const cleanTarget = cleanLinkPath(target.trim());
      const link = createParsedLink(raw, text, cleanTarget, lineNumber, match.index + 1);
      if (link) links.push(link);
    }

    standardLinkRegex.lastIndex = 0;
    while ((match = standardLinkRegex.exec(line)) !== null) {
      const [raw, text, target] = match;
      const cleanTarget = cleanLinkPath(target.trim());
      const link = createParsedLink(raw, text, cleanTarget, lineNumber, match.index + 1);
      if (link) links.push(link);
    }

    htmlLinkRegex.lastIndex = 0;
    while ((match = htmlLinkRegex.exec(line)) !== null) {
      const [raw, target] = match;
      const cleanTarget = cleanLinkPath(target.trim());
      const link = createParsedLink(raw, '', cleanTarget, lineNumber, match.index + 1);
      if (link) links.push(link);
    }

    dataRefRegex.lastIndex = 0;
    while ((match = dataRefRegex.exec(line)) !== null) {
      const [raw, target] = match;
      const cleanTarget = cleanLinkPath(target.trim());
      const link = createParsedLink(raw, '', cleanTarget, lineNumber, match.index + 1);
      if (link) links.push(link);
    }
  }

  return { filePath, links };
}

function createParsedLink(
  raw: string,
  text: string,
  target: string,
  line: number,
  column: number
): ParsedLink | null {
  let type: LinkType;

  if (isExternalLink(target)) {
    type = 'external';
  } else if (isAnchorOnly(target)) {
    type = 'anchor-only';
  } else if (isAssetLink(target)) {
    type = 'asset';
  } else {
    type = 'internal';
  }

  let targetPath = target;
  let anchor: string | undefined;

  const anchorIndex = target.indexOf('#');
  if (anchorIndex !== -1) {
    targetPath = target.substring(0, anchorIndex);
    anchor = target.substring(anchorIndex + 1);
  }

  if (type === 'external') {
    return null;
  }

  return { raw, text, target: targetPath, anchor, line, column, type };
}

export function parseMarkdownHeadings(filePath: string, content?: string): FileHeadings {
  const fileContent = content ?? readFile(filePath);
  const lines = fileContent.split('\n');
  const codeBlockState = computeCodeBlockState(lines);
  const headings: HeadingInfo[] = [];

  const atxHeadingRegex = /^(#{1,6})\s+(.+)$/;
  const customAnchorRegex = /\{#([^}]+)\}\s*$/;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;

    if (codeBlockState[lineIndex]) {
      continue;
    }

    const match = atxHeadingRegex.exec(line);
    if (match) {
      const [, hashes, rawText] = match;
      const level = hashes.length;

      let text = rawText.trim();
      let id: string;

      const customMatch = customAnchorRegex.exec(text);
      if (customMatch) {
        id = customMatch[1];
        text = text.replace(customAnchorRegex, '').trim();
      } else {
        id = generateAnchorId(text);
      }

      headings.push({ text, id, level, line: lineNumber });
    }
  }

  return { filePath, headings };
}

export function generateAnchorId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
