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

  it('runs "wcag tree"', async () => {
    const out = await run(['tree']);
    expect(out).toContain('# WCAG 2.2 Standard Hierarchy');
    expect(out).toContain('Principle 1: Perceivable');
    expect(out).toContain('Guideline 1.1: Text Alternatives');
    expect(out).toContain('1.1.1 Non-text Content');
  });

  it('runs "wcag list" with filters and fields projection', async () => {
    const outJson = await run(['list', '--level', 'AA', '--fields', 'num,handle,level', '--output', 'json']);
    const parsed = JSON.parse(outJson);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(Object.keys(parsed[0])).toEqual(['num', 'handle', 'level']);
    expect(parsed[0].level).toBe('AA');
  });

  it('runs "wcag get 1.4.3" in markdown and json modes', async () => {
    const outMd = await run(['get', '1.4.3']);
    expect(outMd).toContain('SC 1.4.3: Contrast (Minimum)');
    expect(outMd).toContain('Level AA');
    expect(outMd).toContain('Normative Requirement');

    const outJson = await run(['get', '1.4.3', '--output', 'json']);
    const parsed = JSON.parse(outJson);
    expect(parsed.num).toBe('1.4.3');
    expect(parsed.level).toBe('AA');
  });

  it('runs "wcag get 1.4.3 --techniques"', async () => {
    const out = await run(['get', '1.4.3', '--techniques']);
    expect(out).toContain('SC 1.4.3: Contrast (Minimum)');
    expect(out).toContain('Sufficient Techniques');
    expect(out).toContain('G18');
  });

  it('runs "wcag get 1.1.1 --techniques --tech html,aria"', async () => {
    const out = await run(['get', '1.1.1', '--techniques', '--tech', 'html,aria']);
    expect(out).toContain('SC 1.1.1: Non-text Content');
    expect(out).toContain('Sufficient Techniques');
    expect(out).toContain('ARIA6');
    expect(out).toContain('H37');
  });

  it('runs "wcag failures 1.1.1"', async () => {
    const out = await run(['failures', '1.1.1']);
    expect(out).toContain('Common Failures for SC 1.1.1');
    expect(out).toContain('`F3`');
  });

  it('runs "wcag tech G18"', async () => {
    const out = await run(['tech', 'G18']);
    expect(out).toContain('Technique G18');
    expect(out).toContain('contrast');
  });

  it('runs "wcag search"', async () => {
    const out = await run(['search', 'keyboard trap', '--limit', '3']);
    expect(out).toContain('Search Results');
    expect(out).toContain('2.1.2');
  });

  it('runs "wcag schema"', async () => {
    const out = await run(['schema']);
    const parsed = JSON.parse(out);
    expect(parsed.title).toBe('WCAG CLI Schema and Introspection Reference');
    expect(parsed.commands.get).toBeDefined();
  });
});
