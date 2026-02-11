---
description: Canonical explanation of Deal Client deprecation and modern alternatives.
---

# Deal Client is deprecated

Deal Client workflows are deprecated and are no longer the recommended baseline for new Filecoin integrations.

This page is the canonical explainer for what changed and where to go now.

## What was deprecated

Historically, developers used Deal Client patterns (including direct deal-making client contract flows) to orchestrate Filecoin storage deals from smart contracts.

Those pages may remain available for historical reference, but they should not be used as the default path for new builds.

## Why it is deprecated

Deal Client-based workflows are deprecated because they depend on legacy maintenance and operational patterns that no longer represent the clearest path for most developers.

Filecoin guidance has shifted toward modern storage patterns that are easier to support and evolve.

## What to use now

Use modern storage patterns as the primary path:

* [Modern storage patterns](modern-storage-patterns.md) (canonical replacement page)
* [PDP documentation](../../storage-providers/pdp/README.md)
* [FOC documentation index](foc-documentation-index.md)

## Transition guidance

If you maintain existing Deal Client-based systems:

1. Keep legacy docs/workflows clearly marked as deprecated.
2. Route new users to modern patterns and PDP/FOC resources.
3. Avoid introducing new dependencies on deprecated Deal Client flows.
