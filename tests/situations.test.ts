import { describe, it, expect, beforeAll } from 'vitest';
import { WCAGDatabase, getDatabase } from '../src/db.js';
import { createProgram } from '../src/cli.js';

describe('First-Class WCAG Situations', () => {
  let db: WCAGDatabase;

  beforeAll(() => {
    db = getDatabase();
  });

  it('indexes all 47 situations across the WCAG dataset', () => {
    const allSituations = db.getSituations();
    expect(allSituations).toHaveLength(47);
  });

  it('retrieves Situations A through F for SC 1.1.1 Non-text Content', () => {
    const sc111Situations = db.getSituations('1.1.1');
    expect(sc111Situations).toHaveLength(6);

    const letters = sc111Situations.map((s) => s.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);

    // Situation A: Short description
    expect(sc111Situations[0].title).toContain('short description can serve the same purpose');
    // Situation B: Long description (charts/diagrams)
    expect(sc111Situations[1].title).toContain('short description can not serve the same purpose');
    // Situation C: Controls/inputs
    expect(sc111Situations[2].title).toContain('control or accepts user input');
    // Situation F: Pure decoration
    expect(sc111Situations[5].title).toContain('ignored by assistive technology');
  });

  it('retrieves specific situation by criterion and letter', () => {
    const sitF = db.getSituation('1.1.1', 'F');
    expect(sitF).toBeDefined();
    expect(sitF?.id).toBe('1.1.1-F');
    expect(sitF?.letter).toBe('F');
    expect(sitF?.criterionNum).toBe('1.1.1');
    expect(sitF?.techniques.length).toBeGreaterThan(0);
    expect(sitF?.techniques.some((t) => t.id === 'C9' || t.id === 'H67')).toBe(true);

    const sit143A = db.getSituation('1.4.3', 'A');
    expect(sit143A).toBeDefined();
    expect(sit143A?.title).toContain('less than 18 point');

    const sit143B = db.getSituation('1.4.3', 'B');
    expect(sit143B).toBeDefined();
    expect(sit143B?.title).toContain('at least 18 point');
  });

  it('filters techniques strictly by situation in getTechniquesForCriterion', () => {
    const sitFTechs = db.getTechniquesForCriterion('1.1.1', { situation: 'F' });
    expect(sitFTechs.length).toBeGreaterThan(0);
    for (const t of sitFTechs) {
      if (t.type === 'sufficient') {
        expect(t.situationLetter).toBe('F');
      }
    }
  });

  it('searches across situation condition descriptions', () => {
    const chartSituations = db.getSituations(undefined, 'chart');
    expect(chartSituations.length).toBeGreaterThan(0);
    expect(chartSituations.some((s) => s.criterionNum === '1.1.1' && s.letter === 'B')).toBe(true);
  });

  it('runs CLI "wcag situations 1.1.1"', async () => {
    const logs: string[] = [];
    const program = createProgram();
    program.exitOverride();
    const origLog = console.log;
    console.log = (...m) => logs.push(m.join(' '));

    await program.parseAsync(['node', 'wcag', 'situations', '1.1.1']);
    console.log = origLog;

    const out = logs.join('\n');
    expect(out).toContain('Situations (Decision Tree) for SC 1.1.1');
    expect(out).toContain('Situation A');
    expect(out).toContain('Situation F');
  });

  it('runs CLI "wcag situation 1.1.1 F" and "wcag situations 1.1.1 F"', async () => {
    const logs: string[] = [];
    const program = createProgram();
    program.exitOverride();
    const origLog = console.log;
    console.log = (...m) => logs.push(m.join(' '));

    await program.parseAsync(['node', 'wcag', 'situation', '1.1.1', 'F', '--output', 'json']);
    await program.parseAsync(['node', 'wcag', 'situations', '1.1.1', 'F', '--output', 'json']);
    await program.parseAsync(['node', 'wcag', 'situations', '1.1.1-F', '--output', 'json']);
    console.log = origLog;

    const lines = logs.filter(Boolean);
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed.letter).toBe('F');
      expect(parsed.criterionNum).toBe('1.1.1');
      expect(parsed.techniques.length).toBeGreaterThan(0);
    }
  });

  it('runs CLI "wcag get 1.1.1 --situation F" and targets only Situation F', async () => {
    const logs: string[] = [];
    const program = createProgram();
    program.exitOverride();
    const origLog = console.log;
    console.log = (...m) => logs.push(m.join(' '));

    await program.parseAsync(['node', 'wcag', 'get', '1.1.1', '--situation', 'F']);
    console.log = origLog;

    const out = logs.join('\n');
    expect(out).toContain('Situation F');
    expect(out).toContain('SC 1.1.1: Non-text Content');
  });
});
