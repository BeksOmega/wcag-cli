# WCAG CLI Agent Context & Invariants

This CLI provides structured access to the **Web Content Accessibility Guidelines (WCAG) 2.2**.
When executing this tool as an AI agent, follow these context window discipline invariants:

## Invariants & Best Practices

1. **Context Window Discipline**:
   - The full WCAG standard has 87 criteria and hundreds of techniques. **Never** dump the entire dataset into context.
   - Use field projection: add `--fields num,handle,level,title` or `--fields num,details` to limit the returned payload.
   - Use `--limit <n>` with `wcag search` (defaults to 5 results).

2. **Progressive Disclosure Flow**:
   - **Step 1 (Discovery)**: Run `wcag tree` or `wcag search "<topic>"` to locate the relevant Success Criterion number (e.g., `1.4.3`).
   - **Step 2 (Normative Requirements)**: Run `wcag get <id>` to inspect exact normative criteria and exceptions.
   - **Step 3 (Techniques & Implementation)**: Run `wcag get <id> --techniques --tech html,aria` or `wcag tech <id>` (e.g. `wcag tech ARIA6`) for concrete code patterns.
   - **Step 4 (Code Review & Anti-Patterns)**: Run `wcag failures <id>` (e.g. `wcag failures 2.1.2`) to check against common implementation traps.

3. **Machine-Readable Payloads**:
   - When programmatically parsing output, set `--output json` or `OUTPUT_FORMAT=json`.
   - To inspect supported CLI arguments at runtime without guessing, run `wcag schema`.

4. **Multi-Surface**:
   - If running inside an MCP-compatible host, connect to the stdio MCP server via `wcag mcp` (tools: `wcag_search`, `wcag_get_criterion`, `wcag_list_criteria`, `wcag_get_failures`, `wcag_get_technique`, `wcag_tree`).
