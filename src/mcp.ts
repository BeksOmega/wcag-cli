import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { getDatabase } from './db.js';
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
import { normalizeSituationLetter } from './harden.js';

export function createMcpServer(): Server {
  const db = getDatabase();
  const server = new Server(
    {
      name: 'wcag-cli-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'wcag_tree',
          description:
            'Get high-level hierarchy of WCAG 2.2 Principles, Guidelines, and Success Criteria.',
          inputSchema: {
            type: 'object',
            properties: {
              level: {
                type: 'string',
                description: 'Filter by level: A, AA, or AAA',
                enum: ['A', 'AA', 'AAA'],
              },
              version: {
                type: 'string',
                description: 'Filter by version (e.g. 2.2, 2.1, 2.0)',
              },
              format: {
                type: 'string',
                description: 'Output format (markdown or json)',
                enum: ['markdown', 'json'],
                default: 'markdown',
              },
            },
          },
        },
        {
          name: 'wcag_list_criteria',
          description:
            'List Success Criteria filtered by conformance level (A/AA/AAA), guideline, or principle.',
          inputSchema: {
            type: 'object',
            properties: {
              level: {
                type: 'string',
                description: 'Conformance level (e.g. AA, or A,AA)',
              },
              guideline: {
                type: 'string',
                description: 'Guideline number or handle (e.g. 1.4 or distinguishable)',
              },
              principle: {
                type: 'string',
                description: 'Principle number (e.g. 1, 2, 3, 4)',
              },
              version: {
                type: 'string',
                description: 'WCAG version (e.g. 2.2)',
              },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Fields to project (e.g. ["num", "handle", "level"])',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                default: 'markdown',
              },
            },
          },
        },
        {
          name: 'wcag_get_criterion',
          description:
            'Get normative requirements, details, exceptions, and techniques for a specific WCAG Success Criterion. Optionally filter to a specific conditional Situation (e.g. A, B, F).',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Criterion ID or number (e.g. "1.4.3", "contrast-minimum", "2.5.7")',
              },
              situation: {
                type: 'string',
                description: 'Filter techniques strictly to a specific conditional situation letter (e.g. "A", "B", "F")',
              },
              includeTechniques: {
                type: 'boolean',
                description: 'Include sufficient, advisory, and failure techniques',
                default: false,
              },
              techFilter: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter techniques by technology (e.g. ["html", "aria"])',
              },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Field projection (e.g. ["num", "title", "details"])',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                default: 'markdown',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'wcag_list_situations',
          description:
            'List the conditional implementation scenarios (decision tree) for a criterion (e.g. Situation A vs B vs F).',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Optional criterion ID or number (e.g. "1.1.1", "1.4.3")',
              },
              search: {
                type: 'string',
                description: 'Optional keyword to search across scenario descriptions (e.g. "chart", "captcha", "decoration")',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                default: 'markdown',
              },
            },
          },
        },
        {
          name: 'wcag_get_situation',
          description:
            'Get details and sufficient techniques for a specific conditional situation (e.g. 1.1.1 Situation A).',
          inputSchema: {
            type: 'object',
            properties: {
              criterionId: {
                type: 'string',
                description: 'Criterion ID or number (e.g. "1.1.1", "1.4.3")',
              },
              letter: {
                type: 'string',
                description: 'Situation letter (e.g. "A", "B", "C", "F")',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                default: 'markdown',
              },
            },
            required: ['criterionId', 'letter'],
          },
        },
        {
          name: 'wcag_get_failures',
          description:
            'Get common failure anti-patterns for a given criterion (essential for code review checklists).',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Criterion ID or number (e.g. "1.4.3", "2.1.2", "4.1.2")',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                default: 'markdown',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'wcag_get_technique',
          description:
            'Look up a specific technique or failure documentation by ID (e.g. ARIA6, G18, F3).',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Technique ID (e.g. "ARIA6", "F3", "G18", "H37")',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                default: 'markdown',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'wcag_search',
          description:
            'Search the WCAG 2.2 specification, situations, and techniques using keyword or semantic terms.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search terms (e.g. "color contrast", "focus trap", "dragging")',
              },
              level: {
                type: 'string',
                description: 'Filter search results by conformance level (e.g. AA)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 5)',
                default: 5,
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                default: 'markdown',
              },
            },
            required: ['query'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const format = ((args.format as string) || 'markdown').toLowerCase();

    switch (name) {
      case 'wcag_tree': {
        const principles = db.getPrinciples(args.version as string);
        if (format === 'json') {
          return {
            content: [{ type: 'text', text: formatJsonOutput(principles) }],
          };
        }
        return {
          content: [{ type: 'text', text: formatTreeMarkdown(principles) }],
        };
      }

      case 'wcag_list_criteria': {
        const criteria = db.getCriteria({
          level: args.level as string,
          guideline: args.guideline as string,
          principle: args.principle as string,
          version: args.version as string,
        });
        const fields = (args.fields as string[]) || undefined;

        if (format === 'json') {
          return {
            content: [{ type: 'text', text: formatJsonOutput(criteria, fields) }],
          };
        }
        return {
          content: [{ type: 'text', text: formatCriteriaListMarkdown(criteria, fields) }],
        };
      }

      case 'wcag_get_criterion': {
        const id = args.id as string;
        const sc = db.getCriterion(id);
        if (!sc) {
          throw new McpError(ErrorCode.InvalidParams, `Criterion not found: ${id}`);
        }

        const situation = normalizeSituationLetter(args.situation as string);
        const includeTechs = Boolean(args.includeTechniques) || Boolean(situation);
        const techFilter = (args.techFilter as string[]) || undefined;
        const techs = includeTechs
          ? db.getTechniquesForCriterion(sc.num, { tech: techFilter, situation })
          : undefined;
        const situations = situation || includeTechs ? db.getSituations(sc.num) : undefined;
        const fields = (args.fields as string[]) || undefined;

        if (format === 'json') {
          const payload = {
            ...sc,
            selectedSituation: situation,
            situationsList: situations,
            techniquesList: techs,
          };
          return {
            content: [{ type: 'text', text: formatJsonOutput(payload, fields) }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: formatCriterionMarkdown(sc, {
                fields,
                includeTechniques: includeTechs,
                situation,
                techFilter,
                techniques: techs,
                situations,
              }),
            },
          ],
        };
      }

      case 'wcag_list_situations': {
        const id = args.id as string | undefined;
        const sc = id ? db.getCriterion(id) : undefined;
        const situations = db.getSituations(id, args.search as string);

        if (format === 'json') {
          return {
            content: [{ type: 'text', text: formatJsonOutput(situations) }],
          };
        }
        return {
          content: [{ type: 'text', text: formatSituationsListMarkdown(situations, sc) }],
        };
      }

      case 'wcag_get_situation': {
        const critId = args.criterionId as string;
        const letter = args.letter as string;
        const sit = db.getSituation(critId, letter);
        if (!sit) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Situation "${letter}" for criterion "${critId}" not found.`
          );
        }

        if (format === 'json') {
          return {
            content: [{ type: 'text', text: formatJsonOutput(sit) }],
          };
        }
        return {
          content: [{ type: 'text', text: formatSituationMarkdown(sit) }],
        };
      }

      case 'wcag_get_failures': {
        const id = args.id as string;
        const sc = db.getCriterion(id);
        if (!sc) {
          throw new McpError(ErrorCode.InvalidParams, `Criterion not found: ${id}`);
        }
        const failures = db.getFailuresForCriterion(sc.num);

        if (format === 'json') {
          return {
            content: [{ type: 'text', text: formatJsonOutput(failures) }],
          };
        }
        return {
          content: [{ type: 'text', text: formatFailuresMarkdown(sc, failures) }],
        };
      }

      case 'wcag_get_technique': {
        const id = args.id as string;
        const techs = db.getTechnique(id);
        if (techs.length === 0) {
          throw new McpError(ErrorCode.InvalidParams, `Technique not found: ${id}`);
        }

        if (format === 'json') {
          return {
            content: [{ type: 'text', text: formatJsonOutput(techs) }],
          };
        }
        return {
          content: [{ type: 'text', text: formatTechniqueMarkdown(techs) }],
        };
      }

      case 'wcag_search': {
        const query = args.query as string;
        const results = db.search(query, {
          level: args.level as string,
          limit: (args.limit as number) || 5,
        });

        if (format === 'json') {
          return {
            content: [{ type: 'text', text: formatJsonOutput(results) }],
          };
        }
        return {
          content: [{ type: 'text', text: formatSearchMarkdown(results) }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  });

  return server;
}

export async function runStdioMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[wcag-cli] WCAG MCP stdio server running.');
}

if (process.argv[1] && process.argv[1].endsWith('mcp.js')) {
  runStdioMcpServer().catch((err) => {
    console.error('[wcag-cli] Fatal MCP server error:', err);
    process.exit(1);
  });
}
