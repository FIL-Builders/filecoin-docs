export type { RedirectEntry, RedirectMap, ResolvedPath } from '../shared/types.js';

export type LinkType = 'internal' | 'external' | 'anchor-only' | 'asset';

export interface ParsedLink {
  raw: string;
  text: string;
  target: string;
  anchor?: string;
  line: number;
  column: number;
  type: LinkType;
}

export interface FileLinks {
  filePath: string;
  links: ParsedLink[];
}

export interface SummaryEntry {
  title: string;
  path: string;
  line: number;
  depth: number;
  children: SummaryEntry[];
}

export interface SummaryStructure {
  entries: SummaryEntry[];
  allPaths: string[];
}

export type ValidationStatus = 'valid' | 'broken' | 'redirect-available';

export interface ValidationResult {
  sourceFile: string;
  link: ParsedLink;
  status: ValidationStatus;
  resolvedPath?: string;
  error?: string;
}

export interface BrokenLink extends ValidationResult {
  status: 'broken';
  error: string;
}

export type FixConfidence = 'high' | 'medium' | 'low';

export interface FixSuggestion {
  confidence: FixConfidence;
  suggestedPath: string;
  reason: string;
  redirectEntry?: { from: string; to: string; line: number };
  resolvedTarget?: string;
}

export interface BrokenLinkWithSuggestion {
  broken: BrokenLink;
  suggestion?: FixSuggestion;
}

export interface FixResult {
  sourceFile: string;
  originalLink: ParsedLink;
  newPath: string;
  success: boolean;
  error?: string;
  redirectAdded: boolean;
}

export interface CheckReport {
  filesScanned: number;
  linksChecked: number;
  validLinks: number;
  brokenLinks: number;
  brokenLinkDetails: BrokenLinkWithSuggestion[];
  missingSummaryTargets: SummaryEntry[];
  timestamp: Date;
  durationMs: number;
}

export interface CLIOptions {
  rootDir: string;
  path?: string;
  fix: boolean;
  interactive: boolean;
  output?: string;
  verbose: boolean;
}

export interface HeadingInfo {
  text: string;
  id: string;
  level: number;
  line: number;
}

export interface FileHeadings {
  filePath: string;
  headings: HeadingInfo[];
}
