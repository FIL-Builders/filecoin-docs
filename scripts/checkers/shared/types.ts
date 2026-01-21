export interface RedirectEntry {
  from: string;
  to: string;
  line: number;
}

export interface RedirectMap {
  entries: RedirectEntry[];
  fromToMap: Map<string, string>;
  toFromMap: Map<string, string[]>;
}

export interface ResolvedPath {
  resolved: string;
  exists: boolean;
  original: string;
  anchor?: string;
}

export interface ValidationIssue {
  type: 'broken' | 'conflict' | 'missing' | 'skipped';
  from?: string;
  to?: string;
  path?: string;
  reason: string;
  line?: number;
}

export interface CheckResult {
  success: boolean;
  total: number;
  valid: number;
  issues: ValidationIssue[];
  durationMs: number;
}

export interface ParsedRedirectEntry {
  from: string;
  to: string;
  rawFrom: string;
  rawTo: string;
}
