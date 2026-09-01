import { describe, it, expect, beforeAll } from 'vitest';
import { WCAGDatabase, getDatabase } from '../src/db.js';

describe('Raw JSON Parsing & Data Integrity', () => {
  let db: WCAGDatabase;

  beforeAll(() => {
    db = getDatabase();
  });

  it('correctly parses all 4 Principles with non-empty titles and handles', () => {
    const principles = db.getPrinciples();
    expect(principles).toHaveLength(4);

    const expectedPrinciples = [
      { num: '1', handle: 'Perceivable', id: 'perceivable' },
      { num: '2', handle: 'Operable', id: 'operable' },
      { num: '3', handle: 'Understandable', id: 'understandable' },
      { num: '4', handle: 'Robust', id: 'robust' },
    ];

    for (const expected of expectedPrinciples) {
      const p = db.getPrinciple(expected.num);
      expect(p).toBeDefined();
      expect(p?.handle).toBe(expected.handle);
      expect(p?.id).toBe(expected.id);
      expect(p?.title.length).toBeGreaterThan(10);
      expect(p?.url).toBe(`https://www.w3.org/WAI/WCAG22/quickref/#${expected.id}`);
    }
  });

  it('correctly parses all 13 Guidelines and maps parent Principle numbers', () => {
    const guidelines = db.getGuidelines();
    expect(guidelines).toHaveLength(13);

    for (const g of guidelines) {
      expect(g.num).toMatch(/^\d+\.\d+$/);
      expect(g.handle.length).toBeGreaterThan(0);
      expect(g.title.length).toBeGreaterThan(10);
      expect(g.principleNum).toBeDefined();
      expect(g.principleHandle).toBeDefined();
      expect(g.successcriteria.length).toBeGreaterThan(0);
      expect(g.url).toBe(`https://www.w3.org/WAI/WCAG22/quickref/#${g.id}`);
    }
  });

  it('correctly parses all 87 Success Criteria with valid levels, requirements, and details', () => {
    const criteria = db.getCriteria();
    expect(criteria).toHaveLength(87);

    const validLevels = new Set(['A', 'AA', 'AAA']);

    for (const sc of criteria) {
      // 1. Basic properties
      expect(sc.num).toMatch(/^\d+\.\d+\.\d+$/);
      expect(sc.id.length).toBeGreaterThan(0);
      expect(sc.handle.length).toBeGreaterThan(0);
      expect(sc.title.length).toBeGreaterThan(10);
      expect(validLevels.has(sc.level)).toBe(true);

      // 2. Parent mappings
      expect(sc.guidelineNum).toBeDefined();
      expect(sc.guidelineHandle).toBeDefined();
      expect(sc.principleNum).toBeDefined();
      expect(sc.principleHandle).toBeDefined();

      // 3. W3C Understanding URL
      expect(sc.url).toBe(`https://www.w3.org/WAI/WCAG22/Understanding/${sc.id}.html`);

      // 4. Details parsing (notes, bulleted lists, paragraphs)
      if (sc.details) {
        expect(Array.isArray(sc.details)).toBe(true);
        for (const d of sc.details) {
          expect(['p', 'ulist', 'note']).toContain(d.type);
          if (d.type === 'ulist') {
            expect(Array.isArray(d.items)).toBe(true);
            for (const item of d.items || []) {
              expect(item.text.length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  it('unpacks all nested technique structures into searchable flat techniques', () => {
    // SC 1.1.1 Non-text Content has multiple situations and groups
    const sc111Techs = db.getTechniquesForCriterion('1.1.1');
    expect(sc111Techs.length).toBeGreaterThan(10);

    // Verify sufficient technique G94
    const g94 = sc111Techs.find((t) => t.id === 'G94');
    expect(g94).toBeDefined();
    expect(g94?.type).toBe('sufficient');
    expect(g94?.technology).toBe('general');
    expect(g94?.situationTitle).toContain('Situation A');

    // Verify HTML technique H37
    const h37 = sc111Techs.find((t) => t.id === 'H37');
    expect(h37).toBeDefined();
    expect(h37?.type).toBe('sufficient');
    expect(h37?.technology).toBe('html');

    // Verify ARIA technique ARIA6
    const aria6 = sc111Techs.find((t) => t.id === 'ARIA6');
    expect(aria6).toBeDefined();
    expect(aria6?.type).toBe('sufficient');
    expect(aria6?.technology).toBe('aria');

    // Verify Failure technique F3
    const f3 = sc111Techs.find((t) => t.id === 'F3');
    expect(f3).toBeDefined();
    expect(f3?.type).toBe('failure');
    expect(f3?.technology).toBe('failures');
  });

  it('exact normative text & detail parsing for 1.4.3 Contrast (Minimum)', () => {
    const sc143 = db.getCriterion('1.4.3');
    expect(sc143).toBeDefined();
    expect(sc143?.num).toBe('1.4.3');
    expect(sc143?.handle).toBe('Contrast (Minimum)');
    expect(sc143?.level).toBe('AA');
    expect(sc143?.title).toBe(
      'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for the following:'
    );

    // Verify the 3 exceptions are parsed
    expect(sc143?.details).toBeDefined();
    const ulist = sc143?.details?.find((d) => d.type === 'ulist');
    expect(ulist).toBeDefined();
    expect(ulist?.items).toHaveLength(3);

    const handles = ulist?.items?.map((i) => i.handle);
    expect(handles).toEqual(['Large Text', 'Incidental', 'Logotypes']);

    const largeText = ulist?.items?.find((i) => i.handle === 'Large Text');
    expect(largeText?.text).toContain('contrast ratio of at least 3:1');
  });

  it('exact parsing of new WCAG 2.2 criteria (2.5.7 Dragging Movements and 3.3.8 Cognitive Auth)', () => {
    // 2.5.7 Dragging Movements
    const sc257 = db.getCriterion('2.5.7');
    expect(sc257).toBeDefined();
    expect(sc257?.handle).toBe('Dragging Movements');
    expect(sc257?.level).toBe('AA');
    expect(sc257?.title).toContain('dragging movement for operation can be achieved by a single pointer without dragging');

    // 3.3.8 Accessible Authentication (Minimum)
    const sc338 = db.getCriterion('3.3.8');
    expect(sc338).toBeDefined();
    expect(sc338?.handle).toBe('Accessible Authentication (Minimum)');
    expect(sc338?.level).toBe('AA');
    expect(sc338?.title).toContain('cognitive function test');
  });
});
