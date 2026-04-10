export interface RedirectIssue {
  from: string;
  to: string;
  rawFrom: string;
  rawTo: string;
  reason: string;
}

export interface RedirectCheckResult {
  total: number;
  valid: number;
  skipped: RedirectIssue[];
  broken: RedirectIssue[];
}
