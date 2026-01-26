# Filecoin Documentation

This is the official Filecoin documentation repository, built with Honkit (an open-source GitBook alternative).

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start unified dev server (Honkit + redirect proxy)
npm run build        # Build static site to _book/
```

## Project Structure

```
filecoin-docs/
├── basics/                    # Core Filecoin concepts
├── smart-contracts/           # FVM and smart contract docs
├── storage-providers/         # Storage provider documentation
├── networks/                  # Network-specific docs
├── reference/                 # API and technical reference
├── scripts/
│   └── checkers/              # Link and redirect validation tools
│       ├── shared/            # Shared utilities (all tools use)
│       ├── dev-server/        # Unified dev server (Honkit + proxy)
│       ├── link-checker/      # Link validation and fixing
│       └── redirects/         # Redirect validation (check only)
├── SUMMARY.md                 # GitBook/Honkit navigation structure
├── .gitbook.yaml              # GitBook config with 400+ redirects
└── book.json                  # Honkit configuration
```

## Scripts

### Checkers (`scripts/checkers/`)

Unified TypeScript tools for link and redirect validation with shared utilities.

#### Shared Utilities (`scripts/checkers/shared/`)

Common code used by both link-checker and redirects:

| Module | Purpose |
|--------|---------|
| `types.ts` | Common type definitions (RedirectEntry, RedirectMap, ResolvedPath) |
| `file-utils.ts` | File system operations (exists, read, write, glob, signal-safe restore) |
| `path-utils.ts` | Path resolution, normalization, proxy path handling |
| `file-watcher.ts` | Debounced file watching utilities |
| `gitbook-yaml.ts` | Parse and modify .gitbook.yaml redirects |
| `reporter.ts` | Colored console output (chalk), timestamp formatting |

#### Dev Server (`scripts/checkers/dev-server/`)

Unified development server that runs Honkit and the redirect proxy together.

**Command:**
```bash
npm run dev          # Start both servers with unified output
```

**Architecture:**
```
dev-server/
├── index.ts         # CLI entry point, process orchestration, graceful shutdown
├── proxy.ts         # HTTP proxy server with backend switching
├── static-server.ts # Static file server for cached builds
├── reporter.ts      # Unified console output
└── templates/       # HTML templates for error pages (404, broken redirects)
```

**Features:**
- **Instant start mode**: If `_book/` exists, serves cached build immediately while Honkit rebuilds
- Spawns Honkit on port 4001, switches to live builds when ready
- Starts redirect proxy on port 3000 with 400+ redirects
- Clean, minimal output with timestamps (no spam on rebuilds)
- Debounced file change notifications (1s window)
- Watches `.gitbook.yaml` for redirect changes
- **Graceful shutdown**: Ctrl+C during initial build restores last good `_book/` from cache

**Output:**
```
Filecoin Docs Dev Server
========================

  Server:  http://localhost:3000
  Mode:    Instant start (cached build)

2:23:00 PM Copying cached build...
2:23:00 PM Honkit building in background...
2:23:00 PM Ready on :3000 (408 redirects)

  Press Ctrl+C to stop

2:25:03 PM Honkit ready (120.3s)
2:25:03 PM Switching to live Honkit...
2:25:03 PM Now serving live builds
```

#### Link Checker (`scripts/checkers/link-checker/`)

Validates and fixes internal markdown links.

**Commands:**
```bash
npm run check-links              # Validate all links (report only)
npm run check-links:fix          # Auto-fix high-confidence broken links
npm run check-links:interactive  # Interactive mode for medium/low confidence fixes
```

**Architecture:**
```
link-checker/
├── index.ts                   # CLI entry point (Commander.js)
├── types.ts                   # Link-checker specific types
├── reporter.ts                # Link-specific reporting
├── parsers/
│   ├── markdown.ts            # Extract links & headings from .md files
│   └── summary.ts             # Parse SUMMARY.md structure
├── validators/
│   ├── link-validator.ts      # Validate file existence
│   └── anchor-validator.ts    # Validate #anchor references
└── fixers/
    ├── redirect-finder.ts     # Smart fix suggestions (5-tier confidence)
    └── link-fixer.ts          # Apply fixes, generate redirects
```

**Fix Suggestion Strategy:**

The link checker finds broken links and suggests fixes using multiple strategies (in order):

1. **HIGH confidence**: Existing redirect in `.gitbook.yaml`
2. **MEDIUM confidence**: Same filename in different directory
3. **MEDIUM/LOW confidence**: Levenshtein similarity matching
4. **LOW confidence**: Case variation matching
5. **LOW confidence**: Neighbor README search (checks `./`, `../`, `../../` for README.md)

**Output Format:**

For broken links, the checker shows:
- **Link**: The original markdown link
- **Error**: Why it failed (e.g., "Target not found: path/to/file")
- **Suggestion**: The relative link to use (e.g., `./README.md`)
- **Resolves to**: The actual file path it points to (e.g., `folder/README.md`)
- **Reason**: Why this suggestion was made

#### Redirect Checker (`scripts/checkers/redirects/`)

Validates redirects defined in `.gitbook.yaml`. For serving with redirects, use `npm run dev`.

**Command:**
```bash
npm run check:redirects    # Validate all redirects in .gitbook.yaml
```

**Architecture:**
```
redirects/
├── index.ts               # CLI entry point (Commander.js)
├── types.ts               # Redirect-specific types
└── validator.ts           # Redirect validation logic
```

**Features:**
- Validates 400+ redirect mappings from `.gitbook.yaml`
- Detects conflicts (source path exists as real content)
- Reports broken redirects (target doesn't exist)

## Documentation Standards

This project uses GitBook markdown syntax. See `.claude/rules/gitbook-standards-examples.md` for:
- Hints: `{% hint style="info" %}...{% endhint %}`
- Tabs: `{% tabs %}{% tab title="..." %}...{% endtab %}{% endtabs %}`
- Code blocks with syntax highlighting

## Key Files

| File | Purpose |
|------|---------|
| `SUMMARY.md` | Navigation structure (all pages must be listed here) |
| `.gitbook.yaml` | Redirects configuration |
| `book.json` | Honkit plugins and settings |
| `.markdownlint.json` | Markdown linting rules |

## Common Tasks

### Adding a New Page

1. Create the `.md` file in the appropriate directory
2. Add the page to `SUMMARY.md` in the correct location
3. Run `npm run check-links` to verify links

### Fixing Broken Links

```bash
# Check what's broken
npm run check-links

# Auto-fix high-confidence issues
npm run check-links:fix

# Review and fix remaining issues interactively
npm run check-links:interactive
```

### Testing Redirects Locally

```bash
# Check for broken redirects
npm run check:redirects

# Start unified dev server (recommended)
npm run dev
# Visit http://localhost:3000 to test redirects
```

## Linting

```bash
npm run lint        # Check markdown style
npm run lint:fix    # Auto-fix markdown issues
```

## Future Milestones

### GitBook URL Compatibility

Currently the proxy handles path variations (`.md` → `.html`, extensionless → `.html`). A future enhancement could add full GitBook web URL compatibility where:
- `.md` URLs render markdown content directly (as GitBook does in production)
- `.html`, no extension, and `/` paths all serve the same HTML content
- This would allow testing with the exact URLs users will see in production

