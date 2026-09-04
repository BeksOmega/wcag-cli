---
name: wcag
description: Explore, search, and verify WCAG 2.2 accessibility criteria, conditional situations (decision trees), sufficient techniques, and common failure anti-patterns using the token-efficient `wcag` CLI and MCP server.
---

# WCAG 2.2 Accessibility Skill

Use this skill when you need to inspect accessibility standards, check WCAG 2.2 compliance, evaluate conditional situations (decision trees for specific UI scenarios like decorative icons vs charts vs inputs), find sufficient techniques for specific web technologies (HTML, ARIA, CSS), or audit code for common accessibility failures.

## Quick Command Reference

```bash
# 1. Overview of Principles & Guidelines
wcag tree --level AA

# 2. Search for relevant criteria & situations
wcag search "focus visible" --level AA
wcag search "dragging alternative"
wcag situations --search "chart"

# 3. Explore Conditional Situations (Decision Tree for a Criterion)
wcag situations 1.1.1       # Lists Situations A-F for non-text content
wcag situation 1.1.1 F      # Inspect decorative images scenario
wcag get 1.1.1 --situation A # Get criterion with techniques tailored strictly to Situation A

# 4. Inspect a specific Criterion (Normative requirements & exceptions)
wcag get 1.4.3
wcag get 2.5.7 --fields num,handle,title
wcag get 3.3.8 --techniques --tech html,aria

# 5. Code Review: Check common failure anti-patterns before submitting PRs
wcag failures 1.4.3
wcag failures 2.1.2
wcag failures 4.1.2

# 6. Look up a specific Technique or Failure
wcag tech ARIA6
wcag tech F3
wcag tech G18

# 7. Schema Introspection (Discover commands and fields at runtime)
wcag schema
wcag schema situations
```

## Recommended Workflow

1. **Designing UI Components**:
   - Search the relevant interaction pattern: `wcag search "<component or behavior>"`
   - Check applicable scenarios: `wcag situations <sc_number>`
   - Query the specific situation: `wcag get <sc_number> --situation <letter>` (e.g. `wcag get 1.1.1 -s F` for decorative icons)

2. **Conducting Accessibility Code Reviews**:
   - Identify the applicable criteria for the modified UI components.
   - Run `wcag failures <sc_number>` to ensure the change does not introduce known failure anti-patterns.
   - Use the included **Spec URLs** (`https://www.w3.org/TR/WCAG22/#...`) and **Understanding URLs** to link teammates directly to the relevant section of the official W3C specification.
