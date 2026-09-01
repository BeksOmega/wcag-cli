import { describe, it, expect, beforeAll } from 'vitest';
import { WCAGDatabase, getDatabase } from '../src/db.js';

describe('WCAG Database & Indexer', () => {
  let db: WCAGDatabase;

  beforeAll(() => {
    db = getDatabase();
  });

  it('loads all 4 principles', () => {
    const principles = db.getPrinciples();
    expect(principles).toHaveLength(4);
    expect(principles.map((p) => p.num)).toEqual(['1', '2', '3', '4']);
    expect(principles.map((p) => p.handle)).toEqual([
      'Perceivable',
      'Operable',
      'Understandable',
      'Robust',
    ]);
  });

  it('loads all 13 guidelines', () => {
    const guidelines = db.getGuidelines();
    expect(guidelines).toHaveLength(13);
  });

  it('loads all 87 success criteria', () => {
    const criteria = db.getCriteria();
    expect(criteria).toHaveLength(87);
  });

  it('retrieves specific criteria by number and slug', () => {
    const sc143 = db.getCriterion('1.4.3');
    expect(sc143).toBeDefined();
    expect(sc143?.handle).toBe('Contrast (Minimum)');
    expect(sc143?.level).toBe('AA');
    expect(sc143?.url).toContain('contrast-minimum.html');

    const bySlug = db.getCriterion('contrast-minimum');
    expect(bySlug).toBeDefined();
    expect(bySlug?.num).toBe('1.4.3');

    const sc257 = db.getCriterion('2.5.7');
    expect(sc257).toBeDefined();
    expect(sc257?.handle).toBe('Dragging Movements');
    expect(sc257?.level).toBe('AA');

    const sc338 = db.getCriterion('3.3.8');
    expect(sc338).toBeDefined();
    expect(sc338?.handle).toBe('Accessible Authentication (Minimum)');
  });

  it('filters criteria by conformance level', () => {
    const levelA = db.getCriteria({ level: 'A' });
    const levelAA = db.getCriteria({ level: 'AA' });
    const levelAAA = db.getCriteria({ level: 'AAA' });

    expect(levelA.length).toBeGreaterThan(0);
    expect(levelAA.length).toBeGreaterThan(0);
    expect(levelAAA.length).toBeGreaterThan(0);
    expect(levelA.length + levelAA.length + levelAAA.length).toBe(87);

    for (const sc of levelAA) {
      expect(sc.level).toBe('AA');
    }
  });

  it('filters criteria by guideline', () => {
    const g14Criteria = db.getCriteria({ guideline: '1.4' });
    expect(g14Criteria.length).toBeGreaterThan(0);
    for (const sc of g14Criteria) {
      expect(sc.num.startsWith('1.4.')).toBe(true);
    }
  });

  it('retrieves techniques and failures', () => {
    const g18 = db.getTechnique('G18');
    expect(g18.length).toBeGreaterThan(0);
    expect(g18[0].title).toContain('contrast');

    const f3 = db.getTechnique('F3');
    expect(f3.length).toBeGreaterThan(0);
    expect(f3[0].type).toBe('failure');

    const sc111Failures = db.getFailuresForCriterion('1.1.1');
    expect(sc111Failures.length).toBeGreaterThan(0);
    expect(sc111Failures.some((f) => f.id === 'F3')).toBe(true);
  });

  it('performs full-text search with relevance ranking', () => {
    const contrastResults = db.search('color contrast');
    expect(contrastResults.length).toBeGreaterThan(0);
    expect(contrastResults.some((r) => r.num === '1.4.3')).toBe(true);

    const draggingResults = db.search('dragging');
    expect(draggingResults.length).toBeGreaterThan(0);
    expect(draggingResults[0].num).toBe('2.5.7');

    const focusResults = db.search('focus visible', { level: 'AA' });
    expect(focusResults.length).toBeGreaterThan(0);
    expect(focusResults.some((r) => r.num === '2.4.7')).toBe(true);
  });
});
