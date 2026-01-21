import { hasRedirectConflict, targetPathExists } from '../shared/path-utils.js';
import type { ParsedRedirectEntry } from '../shared/types.js';
import type { RedirectIssue, RedirectCheckResult } from './types.js';

export function checkRedirects(
  redirects: ParsedRedirectEntry[],
  projectRoot: string,
  bookDir?: string
): RedirectCheckResult {
  const skipped: RedirectIssue[] = [];
  const broken: RedirectIssue[] = [];

  for (const { from, to, rawFrom, rawTo } of redirects) {
    if (hasRedirectConflict(from, to, projectRoot)) {
      skipped.push({ from, to, rawFrom, rawTo, reason: 'source path exists as different content' });
    }

    if (!targetPathExists(to, projectRoot, bookDir)) {
      broken.push({ from, to, rawFrom, rawTo, reason: 'target does not exist' });
    }
  }

  const total = redirects.length;
  const valid = total - skipped.length - broken.length;

  return { total, valid, skipped, broken };
}
