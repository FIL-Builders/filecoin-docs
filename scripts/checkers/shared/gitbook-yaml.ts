import { readFile, writeFile } from './file-utils.js';
import type { RedirectEntry, RedirectMap, ParsedRedirectEntry } from './types.js';

export function parseGitBookYaml(yamlPath: string): RedirectMap {
  const content = readFile(yamlPath);

  const entries: RedirectEntry[] = [];
  const fromToMap = new Map<string, string>();
  const toFromMap = new Map<string, string[]>();

  const lines = content.split('\n');
  let inRedirects = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === 'redirects:') {
      inRedirects = true;
      continue;
    }

    if (inRedirects) {
      if (line.match(/^\S/) && !line.startsWith(' ')) {
        inRedirects = false;
        continue;
      }

      const match = line.match(/^\s{2}([^:]+):\s*(.+)$/);
      if (match) {
        const [, from, to] = match;
        const entry: RedirectEntry = {
          from: from.trim(),
          to: to.trim(),
          line: i + 1,
        };

        entries.push(entry);
        fromToMap.set(entry.from, entry.to);

        const existing = toFromMap.get(entry.to) || [];
        existing.push(entry.from);
        toFromMap.set(entry.to, existing);
      }
    }
  }

  return { entries, fromToMap, toFromMap };
}

export function parseRedirectsWithRaw(yamlPath: string): ParsedRedirectEntry[] {
  const content = readFile(yamlPath);
  const redirects: ParsedRedirectEntry[] = [];
  let inRedirects = false;

  for (const line of content.split('\n')) {
    if (line.startsWith('redirects:')) {
      inRedirects = true;
      continue;
    }
    if (inRedirects && line.match(/^\s{2}\S/)) {
      const match = line.match(/^\s{2}([^:]+):\s*(.+)$/);
      if (match) {
        const rawFrom = match[1].trim();
        const rawTo = match[2].trim();
        const from = '/' + rawFrom;
        let to = '/' + rawTo.replace(/\.md$/, '.html');
        to = to.replace(/\/README\.html$/, '/');
        redirects.push({ from, to, rawFrom, rawTo });
      }
    } else if (inRedirects && line.match(/^\S/) && line.trim()) {
      break;
    }
  }

  return redirects;
}

export function parseRedirectsForServer(yamlPath: string): Record<string, string> {
  const parsed = parseRedirectsWithRaw(yamlPath);
  const redirects: Record<string, string> = {};
  for (const { from, to } of parsed) {
    redirects[from] = to;
  }
  return redirects;
}

export function findRedirectTarget(redirectMap: RedirectMap, fromPath: string): string | undefined {
  if (redirectMap.fromToMap.has(fromPath)) {
    return redirectMap.fromToMap.get(fromPath);
  }

  const withoutSlash = fromPath.replace(/^\//, '');
  if (redirectMap.fromToMap.has(withoutSlash)) {
    return redirectMap.fromToMap.get(withoutSlash);
  }

  const withoutMd = fromPath.replace(/\.md$/, '');
  if (redirectMap.fromToMap.has(withoutMd)) {
    return redirectMap.fromToMap.get(withoutMd);
  }

  const withoutBoth = withoutSlash.replace(/\.md$/, '');
  if (redirectMap.fromToMap.has(withoutBoth)) {
    return redirectMap.fromToMap.get(withoutBoth);
  }

  return undefined;
}

export function addRedirects(yamlPath: string, redirects: Array<{ from: string; to: string }>): void {
  if (redirects.length === 0) return;

  const content = readFile(yamlPath);
  const lines = content.split('\n');

  let redirectsLineIndex = -1;
  let lastRedirectIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === 'redirects:') {
      redirectsLineIndex = i;
    }

    if (redirectsLineIndex !== -1 && i > redirectsLineIndex) {
      if (line.match(/^\s{2}\S/)) {
        lastRedirectIndex = i;
      } else if (line.match(/^\S/) && line.trim()) {
        break;
      }
    }
  }

  const newRedirectLines = redirects.map(r => `  ${r.from}: ${r.to}`);

  if (redirectsLineIndex === -1) {
    lines.push('');
    lines.push('redirects:');
    lines.push(...newRedirectLines);
  } else if (lastRedirectIndex !== -1) {
    lines.splice(lastRedirectIndex + 1, 0, ...newRedirectLines);
  } else {
    lines.splice(redirectsLineIndex + 1, 0, ...newRedirectLines);
  }

  writeFile(yamlPath, lines.join('\n'));
}
