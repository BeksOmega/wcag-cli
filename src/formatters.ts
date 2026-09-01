import type {
  Principle,
  Guideline,
  SuccessCriterion,
  FlatTechnique,
  SearchResult,
  FormatOptions,
} from './types.js';

export function applyFieldMask<T extends Record<string, any>>(data: T, fields?: string[]): Partial<T> {
  if (!fields || fields.length === 0) {
    return data;
  }
  const cleanFields = fields.map((f) => f.trim().toLowerCase());
  const masked: Record<string, any> = {};

  for (const key of Object.keys(data)) {
    if (cleanFields.includes(key.toLowerCase())) {
      masked[key] = data[key];
    }
  }
  return masked as Partial<T>;
}

export function formatTreeMarkdown(principles: Principle[], fields?: string[]): string {
  const lines: string[] = ['# WCAG 2.2 Standard Hierarchy\n'];

  for (const p of principles) {
    lines.push(`## Principle ${p.num}: ${p.handle}`);
    lines.push(`*${p.title}*\n`);

    for (const g of p.guidelines || []) {
      lines.push(`### Guideline ${g.num}: ${g.handle}`);
      lines.push(`*${g.title}*\n`);

      for (const sc of g.successcriteria || []) {
        lines.push(`- **${sc.num} ${sc.handle}** (Level ${sc.level})`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function formatCriteriaListMarkdown(criteria: SuccessCriterion[], fields?: string[]): string {
  const lines: string[] = [`# WCAG 2.2 Success Criteria (${criteria.length} items)\n`];

  for (const sc of criteria) {
    lines.push(`- **SC ${sc.num} ${sc.handle}** (Level ${sc.level}) - ${sc.title}`);
  }

  return lines.join('\n');
}

export function formatCriterionMarkdown(
  sc: SuccessCriterion,
  options?: {
    fields?: string[];
    includeTechniques?: boolean;
    techFilter?: string[];
    techniques?: FlatTechnique[];
  }
): string {
  const lines: string[] = [];

  lines.push(`## SC ${sc.num}: ${sc.handle} (Level ${sc.level})`);
  lines.push(`**Guideline**: ${sc.guidelineNum || ''} ${sc.guidelineHandle || ''}`);
  lines.push(`**Principle**: ${sc.principleNum || ''} ${sc.principleHandle || ''}`);
  if (sc.url) {
    lines.push(`**Understanding URL**: ${sc.url}`);
  }
  lines.push('');

  lines.push('### Normative Requirement');
  lines.push(sc.title);
  lines.push('');

  if (sc.details && sc.details.length > 0) {
    lines.push('### Details & Exceptions');
    for (const d of sc.details) {
      if (d.type === 'ulist' && d.items) {
        for (const item of d.items) {
          if (item.handle) {
            lines.push(`- **${item.handle}**: ${item.text}`);
          } else {
            lines.push(`- ${item.text}`);
          }
        }
      } else if (d.type === 'note') {
        lines.push(`> [!NOTE] ${d.handle || 'Note'}\n> ${d.text}`);
      } else if (d.text) {
        lines.push(d.text);
      }
    }
    lines.push('');
  }

  if (options?.includeTechniques && options.techniques) {
    const sufficient = options.techniques.filter((t) => t.type === 'sufficient');
    const advisory = options.techniques.filter((t) => t.type === 'advisory');
    const failures = options.techniques.filter((t) => t.type === 'failure');

    if (sufficient.length > 0) {
      lines.push(`### Sufficient Techniques (${sufficient.length})`);
      for (const t of sufficient) {
        const techTag = t.technology ? ` \`[${t.technology}]\`` : '';
        lines.push(`- \`${t.id}\`${techTag}: ${t.title}`);
      }
      lines.push('');
    }

    if (advisory.length > 0) {
      lines.push(`### Advisory Techniques (${advisory.length})`);
      for (const t of advisory) {
        const techTag = t.technology ? ` \`[${t.technology}]\`` : '';
        lines.push(`- \`${t.id}\`${techTag}: ${t.title}`);
      }
      lines.push('');
    }

    if (failures.length > 0) {
      lines.push(`### Common Failures (${failures.length})`);
      for (const t of failures) {
        lines.push(`- \`${t.id}\`: ${t.title}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function formatFailuresMarkdown(sc: SuccessCriterion, failures: FlatTechnique[]): string {
  const lines: string[] = [
    `## Common Failures for SC ${sc.num}: ${sc.handle} (Level ${sc.level})\n`,
    `> Use this checklist during code reviews to catch common anti-patterns before merging.\n`,
  ];

  if (failures.length === 0) {
    lines.push('*No common failures documented for this criterion.*');
  } else {
    for (const f of failures) {
      lines.push(`- **\`${f.id}\`**: ${f.title}`);
      if (f.url) {
        lines.push(`  *Reference*: ${f.url}`);
      }
    }
  }

  return lines.join('\n');
}

export function formatTechniqueMarkdown(techs: FlatTechnique[]): string {
  if (techs.length === 0) {
    return 'Technique not found.';
  }

  const first = techs[0];
  const lines: string[] = [
    `# Technique ${first.id}: ${first.title}\n`,
    `- **Type**: ${first.type}`,
    `- **Technology**: ${first.technology || 'general'}`,
    `- **URL**: ${first.url}`,
    `- **Applies to Success Criteria**: ${Array.from(new Set(techs.map((t) => `${t.criterionNum} (${t.criterionHandle})`))).join(', ')}\n`,
  ];

  if (first.situationTitle) {
    lines.push(`**Context / Situation**: ${first.situationTitle}\n`);
  }

  return lines.join('\n');
}

export function formatSearchMarkdown(results: SearchResult[]): string {
  if (results.length === 0) {
    return '# Search Results\n\nNo matches found for query.';
  }

  const lines: string[] = [`# Search Results (${results.length} matches)\n`];

  for (const r of results) {
    if (r.type === 'criterion') {
      lines.push(`### SC ${r.num}: ${r.handle} (Level ${r.level || 'A'})`);
      lines.push(`*Matched in ${r.matchedField} (Score: ${r.score})*`);
      lines.push(`${r.snippet}\n`);
    } else if (r.type === 'technique') {
      lines.push(`### Technique \`${r.id}\`: ${r.title}`);
      lines.push(`*Applies to SC ${r.num} (Score: ${r.score})*`);
      lines.push(`${r.snippet}\n`);
    } else {
      lines.push(`### ${r.handle || r.id}`);
      lines.push(`${r.snippet}\n`);
    }
  }

  return lines.join('\n');
}

export function formatJsonOutput(data: any, fields?: string[], ndjson = false): string {
  let processed = data;
  if (fields && fields.length > 0) {
    if (Array.isArray(data)) {
      processed = data.map((item) => applyFieldMask(item, fields));
    } else if (typeof data === 'object' && data !== null) {
      processed = applyFieldMask(data, fields);
    }
  }

  if (ndjson) {
    if (Array.isArray(processed)) {
      return processed.map((item) => JSON.stringify(item)).join('\n');
    }
    return JSON.stringify(processed);
  }

  return JSON.stringify(processed, null, 2);
}
