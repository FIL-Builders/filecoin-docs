---
description: >-
  Standard deprecation callouts for tools, workflows, and pages.
---

# Deprecation notices

Use these callouts to keep deprecation language consistent across the docs. Place the callout near the top of the page it applies to.

## Deprecated or broken (strong warning)

{% hint style="danger" %}
**DEPRECATED - DO NOT USE**

This tool or workflow is deprecated and no longer supported. It may be broken or removed at any time.

**Use instead:** REPLACEMENT_NAME (REPLACEMENT_LINK)
{% endhint %}

Copy/paste template:

```md
{% hint style="danger" %}
**DEPRECATED - DO NOT USE**

This tool or workflow is deprecated and no longer supported. It may be broken or removed at any time.

**Use instead:** REPLACEMENT_NAME (REPLACEMENT_LINK)
{% endhint %}
```

## Unmaintained but functional (soft warning)

{% hint style="warning" %}
**UNMAINTAINED - USE WITH CAUTION**

This tool is no longer actively maintained, but it may still function. It can lag behind network upgrades or have unresolved issues.

**Recommended:** REPLACEMENT_NAME (REPLACEMENT_LINK)
{% endhint %}

Copy/paste template:

```md
{% hint style="warning" %}
**UNMAINTAINED - USE WITH CAUTION**

This tool is no longer actively maintained, but it may still function. It can lag behind network upgrades or have unresolved issues.

**Recommended:** REPLACEMENT_NAME (REPLACEMENT_LINK)
{% endhint %}
```

## How to use

1. Pick the variant that matches the status.
2. Replace `REPLACEMENT_NAME` and `REPLACEMENT_LINK`, and adjust the first sentence if needed.
3. Place the callout directly under the page title.
