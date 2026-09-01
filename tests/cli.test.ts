import { describe, it, expect, vi } from 'vitest';
import { createProgram } from '../src/cli.js';

describe('CLI In-Process Integration Tests', () => {
  const run = async (args: string[]) => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...m) => {
      logs.push(m.join(' '));
    });
    const program = createProgram();
    program.exitOverride();
    await program.parseAsync(['node', 'wcag', ...args]);
    spy.mockRestore();
    return logs.join('\n');
  };

  it('runs "wcag tree" and returns full hierarchy', async () => {
    const out = await run(['tree']);
    expect(out).toContain('# WCAG 2.2 Standard Hierarchy');
    expect(out).toContain('Principle 1: Perceivable');
    expect(out).toContain('Guideline 1.1: Text Alternatives');
    expect(out).toContain('1.1.1 Non-text Content');
    expect(out).toContain('Principle 2: Operable');
    expect(out).toContain('Principle 3: Understandable');
    expect(out).toContain('Principle 4: Robust');
  });

  it('runs "wcag tree --output json" and returns parsed principles array', async () => {
    const out = await run(['tree', '--output', 'json']);
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(4);
    expect(parsed.map((p: any) => p.num)).toEqual(['1', '2', '3', '4']);
  });

  it('runs "wcag tree --level AAA --output json" and filters criteria by level', async () => {
    const out = await run(['tree', '--level', 'AAA', '--output', 'json']);
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
    for (const p of parsed) {
      for (const g of p.guidelines) {
        for (const sc of g.successcriteria) {
          expect(sc.level).toBe('AAA');
        }
      }
    }
  });

  it('runs "wcag list" with filters and fields projection', async () => {
    const outJson = await run(['list', '--level', 'AA', '--fields', 'num,handle,level', '--output', 'json']);
    const parsed = JSON.parse(outJson);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    for (const item of parsed) {
      expect(Object.keys(item)).toEqual(['num', 'handle', 'level']);
      expect(item.level).toBe('AA');
    }

    const outMd = await run(['list', '--level', 'AAA', '--fields', 'num,handle']);
    expect(outMd).toContain('**num**: 1.2.6 | **handle**: Sign Language (Prerecorded)');
  });

  it('runs "wcag list --guideline 1.4 --level AA" and returns exact criteria', async () => {
    const outJson = await run(['list', '--guideline', '1.4', '--level', 'AA', '--output', 'json']);
    const parsed = JSON.parse(outJson);
    const nums = parsed.map((sc: any) => sc.num);
    expect(nums).toEqual(['1.4.3', '1.4.4', '1.4.5', '1.4.10', '1.4.11', '1.4.12', '1.4.13']);
  });

  it('runs "wcag get 1.4.3" and returns exact requirement and exceptions', async () => {
    const outMd = await run(['get', '1.4.3']);
    expect(outMd).toContain('SC 1.4.3: Contrast (Minimum)');
    expect(outMd).toContain('Level AA');
    expect(outMd).toContain('The visual presentation of text and images of text has a contrast ratio of at least 4.5:1');
    expect(outMd).toContain('**Large Text**: Large-scale text');
    expect(outMd).toContain('**Incidental**: Text or images of text');
    expect(outMd).toContain('**Logotypes**: Text that is part of a logo');
    expect(outMd).toContain('https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html');

    const outJson = await run(['get', '1.4.3', '--output', 'json']);
    const parsed = JSON.parse(outJson);
    expect(parsed.num).toBe('1.4.3');
    expect(parsed.handle).toBe('Contrast (Minimum)');
    expect(parsed.level).toBe('AA');
    expect(parsed.details).toHaveLength(1);
    expect(parsed.details[0].items).toHaveLength(3);
  });

  it('runs "wcag get 1.4.3 --techniques" and returns sufficient & failure techniques', async () => {
    const out = await run(['get', '1.4.3', '--techniques']);
    expect(out).toContain('SC 1.4.3: Contrast (Minimum)');
    expect(out).toContain('### Sufficient Techniques');
    expect(out).toContain('`G18`');
    expect(out).toContain('### Common Failures');
    expect(out).toContain('`F24`');
  });

  it('runs "wcag get 1.1.1 --techniques --tech html,aria" and filters by technology', async () => {
    const out = await run(['get', '1.1.1', '--techniques', '--tech', 'html,aria']);
    expect(out).toContain('SC 1.1.1: Non-text Content');
    expect(out).toContain('### Sufficient Techniques');
    expect(out).toContain('`ARIA6` `[aria]`');
    expect(out).toContain('`H37` `[html]`');
    // PDF techniques should be filtered out
    expect(out).not.toContain('`PDF1`');
  });

  it('runs "wcag failures 1.1.1" and returns exact failure objects in JSON mode', async () => {
    const out = await run(['failures', '1.1.1', '--output', 'json']);
    const failures = JSON.parse(out);
    expect(Array.isArray(failures)).toBe(true);
    expect(failures.length).toBeGreaterThanOrEqual(10);
    const fIds = failures.map((f: any) => f.id);
    expect(fIds).toContain('F3');
    expect(fIds).toContain('F13');
    expect(fIds).toContain('F65');
  });

  it('runs "wcag tech G18" and returns parsed technique details', async () => {
    const out = await run(['tech', 'G18', '--output', 'json']);
    const techList = JSON.parse(out);
    expect(Array.isArray(techList)).toBe(true);
    expect(techList.length).toBeGreaterThanOrEqual(1);
    expect(techList[0].id).toBe('G18');
    expect(techList[0].type).toBe('sufficient');
    expect(techList.some((t: any) => t.criterionNum === '1.4.3')).toBe(true);
    expect(techList[0].url).toBe('https://www.w3.org/WAI/WCAG22/Techniques/general/G18');
  });

  it('runs "wcag search" and ranks exact matches at top', async () => {
    const out = await run(['search', 'keyboard trap', '--limit', '3', '--output', 'json']);
    const results = JSON.parse(out);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].num).toBe('2.1.2');
    expect(results[0].handle).toBe('No Keyboard Trap');
  });

  it('runs "wcag schema" and outputs full machine-readable schema', async () => {
    const out = await run(['schema']);
    const parsed = JSON.parse(out);
    expect(parsed.title).toBe('WCAG CLI Schema and Introspection Reference');
    expect(parsed.allowedValues.levels).toEqual(['A', 'AA', 'AAA']);
    expect(parsed.allowedValues.versions).toEqual(['2.0', '2.1', '2.2']);
    expect(parsed.commands.get).toBeDefined();
    expect(parsed.commands.tree).toBeDefined();
    expect(parsed.commands.search).toBeDefined();
  });
});
