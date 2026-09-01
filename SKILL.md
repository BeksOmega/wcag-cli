---
name: wcag
description: Explore, search, and verify WCAG 2.2 accessibility criteria, sufficient techniques, and common failure anti-patterns using the token-efficient `wcag` CLI and MCP server.
---

# WCAG 2.2 Accessibility Skill

Use this skill when you need to inspect accessibility standards, check WCAG 2.2 compliance, find sufficient techniques for specific web technologies (HTML, ARIA, CSS), or audit code for common accessibility failures.

## Quick Command Reference

```bash
# 1. Overview of Principles & Guidelines
wcag tree --level AA

# 2. Search for relevant criteria by keyword
wcag search "focus visible" --level AA
wcag search "dragging alternative"
wcag search "contrast" --limit 3

# 3. Inspect a specific Criterion (Normative requirements & exceptions)
wcag get 1.4.3
wcag get 2.5.7 --fields num,handle,title
wcag get 3.3.8 --techniques --tech html,aria

# 4. Code Review: Check common failure anti-patterns before submitting PRs
wcag failures 1.4.3
wcag failures 2.1.2
wcag failures 4.1.2

# 5. Look up a specific Technique or Failure
wcag tech ARIA6
wcag tech F3
wcag tech G18

# 6. Schema Introspection (Discover commands and fields at runtime)
wcag schema
wcag schema get
```

## Recommended Workflow

1. **Designing UI Components**:
   - Search the relevant interaction pattern: `wcag search "<component or behavior>"`
   - Get the criterion requirement: `wcag get <sc_number>`
   - Review sufficient techniques for your technology stack: `wcag get <sc_number> --techniques --tech <html|aria|css>`

2. **Conducting Accessibility Code Reviews**:
   - Identify the applicable criteria for the modified UI components.
   - Run `wcag failures <sc_number>` to ensure the change does not introduce known failure anti-patterns.
