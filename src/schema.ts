export const WCAG_SCHEMAS = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'WCAG CLI Schema and Introspection Reference',
  description: 'Machine-readable schema describing WCAG CLI commands, data models, and filters for AI agents.',
  version: '1.0.0',
  allowedValues: {
    levels: ['A', 'AA', 'AAA'],
    versions: ['2.0', '2.1', '2.2'],
    outputFormats: ['markdown', 'json', 'ndjson'],
    technologies: [
      'aria',
      'html',
      'css',
      'client-side-script',
      'pdf',
      'general',
      'failures',
      'server-side-script',
      'text',
      'smil',
    ],
    techniqueTypes: ['sufficient', 'advisory', 'failure'],
  },
  commands: {
    tree: {
      description: 'Render full hierarchy of Principles, Guidelines, and Success Criteria.',
      options: {
        '--level <level>': 'Filter criteria by level (A, AA, AAA)',
        '--version <version>': 'Filter by WCAG version (2.0, 2.1, 2.2)',
        '--output <format>': 'Output format (markdown, json, ndjson)',
      },
    },
    list: {
      description: 'List Success Criteria matching level, guideline, or principle filters.',
      options: {
        '--level <level>': 'Filter by conformance level (A, AA, AAA)',
        '--guideline <guideline>': 'Filter by guideline number or handle (e.g. 1.4 or distinguishable)',
        '--principle <principle>': 'Filter by principle number or handle (e.g. 1 or perceivable)',
        '--version <version>': 'Filter by WCAG version (2.0, 2.1, 2.2)',
        '--fields <fields>': 'Comma-separated field projection (e.g. id,num,title,level)',
        '--output <format>': 'Output format (markdown, json, ndjson)',
      },
    },
    get: {
      description: 'Inspect a specific Success Criterion or Guideline by ID or number.',
      arguments: {
        '<id>': 'Criterion or guideline ID (e.g. 1.4.3, contrast-minimum, 1.4)',
      },
      options: {
        '-t, --techniques': 'Include sufficient, advisory, and failure techniques',
        '--tech <technologies>': 'Filter techniques by technology (comma-separated, e.g. html,aria)',
        '--fields <fields>': 'Comma-separated field projection (e.g. num,handle,title,details)',
        '--output <format>': 'Output format (markdown, json, ndjson)',
      },
    },
    failures: {
      description: 'List common failure anti-patterns for a given criterion (for code reviews).',
      arguments: {
        '<id>': 'Criterion ID (e.g. 1.4.3 or 2.1.2)',
      },
      options: {
        '--output <format>': 'Output format (markdown, json, ndjson)',
      },
    },
    tech: {
      description: 'Inspect a specific technique or common failure by ID (e.g. ARIA6, G18, F3).',
      arguments: {
        '<id>': 'Technique or failure ID (e.g. ARIA6, F3, G18, H37)',
      },
      options: {
        '--output <format>': 'Output format (markdown, json, ndjson)',
      },
    },
    search: {
      description: 'Perform ranked keyword search across criteria, normative text, and techniques.',
      arguments: {
        '<query>': 'Search terms (e.g. "color contrast", "focus visible", "drag")',
      },
      options: {
        '--level <level>': 'Filter matches by level (A, AA, AAA)',
        '--version <version>': 'Filter matches by WCAG version (2.0, 2.1, 2.2)',
        '-l, --limit <number>': 'Maximum number of results (default: 5)',
        '--output <format>': 'Output format (markdown, json, ndjson)',
      },
    },
    schema: {
      description: 'Output machine-readable JSON schemas and introspection data.',
      options: {
        '--output <format>': 'Output format (default: json)',
      },
    },
    sync: {
      description: 'Download fresh WCAG dataset from upstream W3C GitHub repo to local cache.',
    },
    mcp: {
      description: 'Run the stdio Model Context Protocol (MCP) server.',
    },
  },
  models: {
    SuccessCriterion: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'URL slug ID (e.g. contrast-minimum)' },
        num: { type: 'string', description: 'Dotted number (e.g. 1.4.3)' },
        handle: { type: 'string', description: 'Human-readable short title' },
        title: { type: 'string', description: 'Normative requirement full text' },
        level: { type: 'string', enum: ['A', 'AA', 'AAA'] },
        versions: { type: 'array', items: { type: 'string' } },
        details: { type: 'array', description: 'Paragraphs, notes, and exception items' },
        url: { type: 'string', description: 'Official W3C Understanding document URL' },
      },
    },
    FlatTechnique: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Technique ID (e.g. ARIA6, F3, G18)' },
        title: { type: 'string', description: 'Technique title description' },
        technology: { type: 'string', description: 'Target technology (html, css, aria, etc.)' },
        type: { type: 'string', enum: ['sufficient', 'advisory', 'failure'] },
        criterionNum: { type: 'string', description: 'Associated criterion number' },
        url: { type: 'string', description: 'Official W3C Technique URL' },
      },
    },
  },
};
