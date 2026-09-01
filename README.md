# wcag-cli

> **Token-efficient WCAG 2.2 exploration CLI and MCP server designed for AI agents and human engineers.**

[![npm version](https://img.shields.io/npm/v/@beksomega/wcag-cli.svg)](https://www.npmjs.com/package/@beksomega/wcag-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Browsing the official WCAG Quick Reference web application can easily dump 50,000+ tokens of HTML, CSS, and DOM overhead into an AI coding assistant's context window. 

`wcag-cli` solves this by delivering **sub-second, progressive-disclosure CLI commands and an MCP server** backed by a **vendored, offline snapshot of the official W3C WCAG 2.2 dataset**.

Built according to [Agent DX Principles](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/):
- ⚡ **Zero-Latency Offline Execution**: Bundles `wcag22.json` directly (~306 KB) for instant (<5ms) queries in sandboxed environments without network egress.
- 🌳 **First-Class Situations (Decision Trees)**: Directly query the 52 conditional implementation scenarios (e.g. decorative image vs. complex chart vs. input button) for targeted techniques without token dumps.
- 🎯 **Context Window Discipline**: Field projection (`--fields`) and compact Markdown output prevent token bloat.
- 🛡️ **Hallucination Hardening**: Defensively normalizes malformed agent arguments (`1.4.3?fields=all`, `SC-1.4.3`, `%201.4.3`).
- 🔍 **Schema Introspection**: `wcag schema` lets agents self-serve command and model definitions at runtime.
- 🔌 **Dual Surface (CLI + MCP)**: Native terminal commands alongside a built-in stdio Model Context Protocol (MCP) server.

---

## Installation

### Run instantly with npx
```bash
npx @beksomega/wcag-cli tree
npx @beksomega/wcag-cli get 1.4.3
```

### Install globally
```bash
npm install -g @beksomega/wcag-cli
wcag --help
```

---

## CLI Usage

### 1. Hierarchy & Overview (`tree`)
Get a concise overview of the 4 Principles and 13 Guidelines (~150 tokens):
```bash
wcag tree
wcag tree --level AA
```

### 2. List & Filter Criteria (`list`)
Filter by conformance level (`A`, `AA`, `AAA`) or guideline, with field projections:
```bash
# Markdown list of all Level AA criteria
wcag list --level AA

# Filter by guideline with strict field projection (returns ~40 tokens)
wcag list --guideline 1.4 --fields num,handle,level --output json
```

### 3. Conditional Situations / Decision Trees (`situations` / `situation`)
Explore conditional implementation scenarios for a specific UI context:
```bash
# List all situations for Non-text Content (returns Situations A through F)
wcag situations 1.1.1

# Get techniques tailored strictly to Situation F (purely decorative images)
wcag situation 1.1.1 F

# Search across situations (e.g., finding complex chart guidance)
wcag situations --search "chart"
```

### 4. Inspect Success Criteria (`get`)
Inspect normative requirement text, details, and exceptions:
```bash
# Get criterion by number or slug
wcag get 1.4.3
wcag get contrast-minimum

# Target a specific situation directly (returns ~120 tokens instead of ~800)
wcag get 1.1.1 --situation F

# Include sufficient and failure techniques filtered by technology
wcag get 1.1.1 --techniques --tech html,aria

# WCAG 2.2 new criteria
wcag get 2.5.7 --techniques   # Dragging Movements
wcag get 3.3.8               # Accessible Authentication
```

### 5. Code Review Failures Checklist (`failures`)
Retrieve common failure anti-patterns to check during code review:
```bash
wcag failures 1.1.1
wcag failures 2.1.2
```

### 6. Look up Techniques (`tech`)
Inspect specific technique or failure IDs (e.g. `ARIA6`, `G18`, `F3`):
```bash
wcag tech ARIA6
wcag tech F3
```

### 7. Full-Text Search (`search`)
Ranked keyword search across criteria, situations, and techniques:
```bash
wcag search "color contrast" --level AA
wcag search "dragging" --limit 3
wcag search "focus visible"
```

### 8. Schema Introspection (`schema`)
Dump machine-readable JSON schemas for agent introspection:
```bash
wcag schema
wcag schema situations
```

### 9. Upstream Sync (`sync`)
Optionally refresh the local cache with the latest errata from the W3C repository:
```bash
wcag sync
```

---

## Model Context Protocol (MCP) Server

`wcag-cli` includes a built-in stdio MCP server for agent hosts (Claude Desktop, Cursor, Jetski, Cline).

### Configuration

#### Claude Desktop / Cursor (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "wcag": {
      "command": "npx",
      "args": ["-y", "@beksomega/wcag-cli", "mcp"]
    }
  }
}
```

### Available MCP Tools:
- `wcag_tree`: Retrieve principle and guideline structure.
- `wcag_list_criteria`: Filter criteria by level, guideline, or principle.
- `wcag_list_situations`: List conditional decision branches for a criterion.
- `wcag_get_situation`: Get details and techniques for a specific conditional situation.
- `wcag_get_criterion`: Inspect normative requirements and techniques (with optional `situation` filter).
- `wcag_get_failures`: Retrieve code review failure checklists.
- `wcag_get_technique`: Look up specific technique / failure doc.
- `wcag_search`: Search WCAG standards, situations, and techniques.

---

## Agent Guidance Files

This repository ships with:
- [`SKILL.md`](./SKILL.md): Standard Agent Skill definition for tool-calling agents.
- [`CONTEXT.md`](./CONTEXT.md): Context window discipline guidelines and progressive-disclosure workflows for coding agents.

---

## Programmatic TypeScript API

```typescript
import { getDatabase } from '@beksomega/wcag-cli';

const db = getDatabase();

// Query situations
const situations = db.getSituations('1.1.1');
console.log(situations.map(s => `Situation ${s.letter}: ${s.title}`));

// Query specific situation
const sitF = db.getSituation('1.1.1', 'F');
console.log(sitF?.techniques);

// Search
const results = db.search('contrast', { level: 'AA', limit: 3 });
```

---

## License

MIT © [Beka Westberg](https://github.com/BeksOmega)
