#!/usr/bin/env node
import { Command } from 'commander';
import { getDatabase, WCAGDatabase } from './db.js';
import {
  formatTreeMarkdown,
  formatCriteriaListMarkdown,
  formatCriterionMarkdown,
  formatSituationsListMarkdown,
  formatSituationMarkdown,
  formatFailuresMarkdown,
  formatTechniqueMarkdown,
  formatSearchMarkdown,
  formatJsonOutput,
} from './formatters.js';
import { WCAG_SCHEMAS } from './schema.js';
import { runStdioMcpServer } from './mcp.js';
import { normalizeSituationLetter } from './harden.js';
import type { OutputFormat } from './types.js';

function resolveOutputFormat(flagVal?: string): OutputFormat {
  const raw = (flagVal || process.env.OUTPUT_FORMAT || 'markdown').toLowerCase();
  if (raw === 'json') return 'json';
  if (raw === 'ndjson') return 'ndjson';
  return 'markdown';
}

function parseFields(fieldStr?: string): string[] | undefined {
  if (!fieldStr) return undefined;
  return fieldStr.split(',').map((f) => f.trim()).filter(Boolean);
}

function parseTechList(techStr?: string): string[] | undefined {
  if (!techStr) return undefined;
  return techStr.split(',').map((t) => t.trim()).filter(Boolean);
}

export function createProgram(db: WCAGDatabase = getDatabase()): Command {
  const program = new Command();

  program
    .name('wcag')
    .description('Token-efficient WCAG 2.2 exploration CLI and MCP server for AI agents and developers')
    .version('0.1.0', '-V, --cli-version', 'output the version of wcag-cli');

  // Command: tree
  program
    .command('tree')
    .description('Render full hierarchy of Principles, Guidelines, and Success Criteria')
    .option('--level <level>', 'Filter criteria by level (A, AA, AAA)')
    .option('--version <version>', 'Filter by WCAG version (2.0, 2.1, 2.2)')
    .option('-o, --output <format>', 'Output format: markdown, json, ndjson')
    .action((options) => {
      const format = resolveOutputFormat(options.output);
      const principles = db.getPrinciples({ level: options.level, version: options.version });

      if (format === 'json' || format === 'ndjson') {
        console.log(formatJsonOutput(principles, undefined, format === 'ndjson'));
      } else {
        console.log(formatTreeMarkdown(principles));
      }
    });

  // Command: list
  program
    .command('list')
    .description('List Success Criteria matching level, guideline, or principle filters')
    .option('--level <level>', 'Filter by conformance level (A, AA, AAA)')
    .option('--guideline <guideline>', 'Filter by guideline number or handle (e.g. 1.4 or distinguishable)')
    .option('--principle <principle>', 'Filter by principle number or handle (e.g. 1 or perceivable)')
    .option('--version <version>', 'Filter by WCAG version (2.0, 2.1, 2.2)')
    .option('--fields <fields>', 'Field projection (comma-separated, e.g. num,handle,title,level)')
    .option('-o, --output <format>', 'Output format: markdown, json, ndjson')
    .action((options) => {
      const format = resolveOutputFormat(options.output);
      const fields = parseFields(options.fields);
      const criteria = db.getCriteria({
        level: options.level,
        guideline: options.guideline,
        principle: options.principle,
        version: options.version,
      });

      if (format === 'json' || format === 'ndjson') {
        console.log(formatJsonOutput(criteria, fields, format === 'ndjson'));
      } else {
        console.log(formatCriteriaListMarkdown(criteria, fields));
      }
    });

  // Command: get
  program
    .command('get <id>')
    .description('Inspect a specific Success Criterion or Guideline by ID or number')
    .option('-s, --situation <letter>', 'Filter techniques strictly to a specific situation (e.g. A, B, F)')
    .option('-t, --techniques', 'Include sufficient, advisory, and failure techniques')
    .option('--tech <technologies>', 'Filter techniques by technology (comma-separated, e.g. html,aria)')
    .option('--fields <fields>', 'Comma-separated field projection (e.g. num,handle,title,details)')
    .option('-o, --output <format>', 'Output format: markdown, json, ndjson')
    .action((id, options) => {
      const format = resolveOutputFormat(options.output);
      const fields = parseFields(options.fields);
      const techFilter = parseTechList(options.tech);
      const situation = normalizeSituationLetter(options.situation);

      // Try finding Criterion
      const sc = db.getCriterion(id);
      if (sc) {
        const includeTechs = Boolean(options.techniques) || Boolean(situation);
        const techs = includeTechs
          ? db.getTechniquesForCriterion(sc.num, { tech: techFilter, situation })
          : undefined;
        const situations = situation || options.techniques ? db.getSituations(sc.num) : undefined;

        if (format === 'json' || format === 'ndjson') {
          const payload = {
            ...sc,
            selectedSituation: situation,
            situationsList: situations,
            techniquesList: techs,
          };
          console.log(formatJsonOutput(payload, fields, format === 'ndjson'));
        } else {
          console.log(
            formatCriterionMarkdown(sc, {
              fields,
              includeTechniques: includeTechs,
              situation,
              techFilter,
              techniques: techs,
              situations,
            })
          );
        }
        return;
      }

      // Try finding Guideline
      const guideline = db.getGuideline(id);
      if (guideline) {
        if (format === 'json' || format === 'ndjson') {
          console.log(formatJsonOutput(guideline, fields, format === 'ndjson'));
        } else {
          console.log(`## Guideline ${guideline.num}: ${guideline.handle}\n`);
          console.log(`${guideline.title}\n`);
          console.log(`**Success Criteria**: ${guideline.successcriteria.map((s) => `${s.num} (${s.handle})`).join(', ')}`);
          if (guideline.url) {
            console.log(`**Reference**: ${guideline.url}`);
          }
        }
        return;
      }

      console.error(`Error: Criterion or Guideline "${id}" not found.`);
      process.exitCode = 1;
    });

  // Command: situations (and alias: situation)
  program
    .command('situations [id] [letter]')
    .alias('situation')
    .description('List or get conditional implementation scenarios (decision tree) for criteria')
    .option('--search <query>', 'Search across situation condition titles (e.g. "chart", "captcha", "decoration")')
    .option('-o, --output <format>', 'Output format: markdown, json, ndjson')
    .action((id, letter, options) => {
      const format = resolveOutputFormat(options.output);

      // Direct lookup when both id and letter are passed (e.g. `wcag situations 1.1.1 F` or `wcag situation 1.1.1 F`)
      if (id && letter) {
        const sit = db.getSituation(id, letter);
        if (!sit) {
          console.error(`Error: Situation "${letter}" for Criterion "${id}" not found.`);
          process.exitCode = 1;
          return;
        }

        if (format === 'json' || format === 'ndjson') {
          console.log(formatJsonOutput(sit, undefined, format === 'ndjson'));
        } else {
          console.log(formatSituationMarkdown(sit));
        }
        return;
      }

      // Handle compound IDs (e.g. `wcag situations 1.1.1-F` or `wcag situation 1.1.1-F`)
      if (id && /^[0-9.]+\s*[-_ ]\s*[A-Za-z0-9]+$/.test(id.trim())) {
        const parts = id.trim().split(/[-_ ]+/);
        const sit = db.getSituation(parts[0], parts[1]);
        if (sit) {
          if (format === 'json' || format === 'ndjson') {
            console.log(formatJsonOutput(sit, undefined, format === 'ndjson'));
          } else {
            console.log(formatSituationMarkdown(sit));
          }
          return;
        }
      }

      const sc = id ? db.getCriterion(id) : undefined;
      const situations = db.getSituations(id, options.search);

      if (format === 'json' || format === 'ndjson') {
        console.log(formatJsonOutput(situations, undefined, format === 'ndjson'));
      } else {
        console.log(formatSituationsListMarkdown(situations, sc));
      }
    });

  // Command: failures
  program
    .command('failures <id>')
    .description('List common failure anti-patterns for a given criterion (for code reviews)')
    .option('-o, --output <format>', 'Output format: markdown, json, ndjson')
    .action((id, options) => {
      const format = resolveOutputFormat(options.output);
      const sc = db.getCriterion(id);
      if (!sc) {
        console.error(`Error: Criterion "${id}" not found.`);
        process.exitCode = 1;
        return;
      }

      const failures = db.getFailuresForCriterion(sc.num);
      if (format === 'json' || format === 'ndjson') {
        console.log(formatJsonOutput(failures, undefined, format === 'ndjson'));
      } else {
        console.log(formatFailuresMarkdown(sc, failures));
      }
    });

  // Command: tech
  program
    .command('tech <id>')
    .description('Inspect a specific technique or common failure by ID (e.g. ARIA6, G18, F3)')
    .option('-o, --output <format>', 'Output format: markdown, json, ndjson')
    .action((id, options) => {
      const format = resolveOutputFormat(options.output);
      const techs = db.getTechnique(id);

      if (techs.length === 0) {
        console.error(`Error: Technique "${id}" not found.`);
        process.exitCode = 1;
        return;
      }

      if (format === 'json' || format === 'ndjson') {
        console.log(formatJsonOutput(techs, undefined, format === 'ndjson'));
      } else {
        console.log(formatTechniqueMarkdown(techs));
      }
    });

  // Command: search
  program
    .command('search <query>')
    .description('Perform ranked keyword search across criteria, situations, and techniques')
    .option('--level <level>', 'Filter matches by level (A, AA, AAA)')
    .option('--version <version>', 'Filter matches by WCAG version (2.0, 2.1, 2.2)')
    .option('-l, --limit <number>', 'Maximum number of results', (val) => parseInt(val, 10), 5)
    .option('-o, --output <format>', 'Output format: markdown, json, ndjson')
    .action((query, options) => {
      const format = resolveOutputFormat(options.output);
      const results = db.search(query, {
        level: options.level,
        version: options.version,
        limit: options.limit,
      });

      if (format === 'json' || format === 'ndjson') {
        console.log(formatJsonOutput(results, undefined, format === 'ndjson'));
      } else {
        console.log(formatSearchMarkdown(results));
      }
    });

  // Command: schema
  program
    .command('schema [command]')
    .description('Output machine-readable JSON schemas and introspection data for AI agents')
    .option('-o, --output <format>', 'Output format (default: json)', 'json')
    .action((cmdName) => {
      if (cmdName && (WCAG_SCHEMAS.commands as any)[cmdName]) {
        console.log(JSON.stringify((WCAG_SCHEMAS.commands as any)[cmdName], null, 2));
      } else {
        console.log(JSON.stringify(WCAG_SCHEMAS, null, 2));
      }
    });

  // Command: sync
  program
    .command('sync')
    .description('Download fresh WCAG dataset from upstream W3C GitHub repo to local cache')
    .option('-f, --force', 'Force redownload even if cache is present')
    .action(async (options) => {
      try {
        console.log('Syncing WCAG dataset from upstream W3C repository...');
        const res = await db.syncFromUpstream(options.force);
        console.log(`Success! Updated cache at: ${res.path} (${res.count} success criteria loaded)`);
      } catch (err: any) {
        console.error(`Sync failed: ${err.message}`);
        process.exitCode = 1;
      }
    });

  // Command: mcp
  program
    .command('mcp')
    .description('Run the stdio Model Context Protocol (MCP) server')
    .action(async () => {
      await runStdioMcpServer();
    });

  return program;
}

export function main(): void {
  const program = createProgram();
  if (process.argv.length <= 2) {
    program.outputHelp();
    return;
  }
  program.parse(process.argv);
}

if (process.argv[1] && (process.argv[1].endsWith('cli.js') || process.argv[1].endsWith('cli.ts'))) {
  main();
}
