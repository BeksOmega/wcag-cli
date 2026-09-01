import { describe, it, expect } from 'vitest';
import {
  normalizeCriterionId,
  normalizeTechniqueId,
  sanitizeQuery,
  normalizeLevel,
  normalizeVersion,
} from '../src/harden.js';

describe('Input Hardening & Sanitization', () => {
  describe('normalizeCriterionId', () => {
    it('normalizes standard dotted numbers', () => {
      expect(normalizeCriterionId('1.4.3')).toBe('1.4.3');
      expect(normalizeCriterionId('2.5.7')).toBe('2.5.7');
    });

    it('strips trailing dots and whitespace', () => {
      expect(normalizeCriterionId(' 1.4.3. ')).toBe('1.4.3');
    });

    it('converts hyphenated or underscored numbers', () => {
      expect(normalizeCriterionId('1-4-3')).toBe('1.4.3');
      expect(normalizeCriterionId('1_4_3')).toBe('1.4.3');
    });

    it('strips common prefixes', () => {
      expect(normalizeCriterionId('SC 1.4.3')).toBe('1.4.3');
      expect(normalizeCriterionId('criterion:1.4.3')).toBe('1.4.3');
      expect(normalizeCriterionId('sc-1.4.3')).toBe('1.4.3');
      expect(normalizeCriterionId('guideline: 1.4')).toBe('1.4');
    });

    it('strips hallucinated query parameters and hashes', () => {
      expect(normalizeCriterionId('1.4.3?fields=name&verbose=true')).toBe('1.4.3');
      expect(normalizeCriterionId('1.4.3#notes')).toBe('1.4.3');
    });

    it('strips path traversals and URL encodings', () => {
      expect(normalizeCriterionId('../../1.4.3')).toBe('1.4.3');
      expect(normalizeCriterionId('%201.4.3%20')).toBe('1.4.3');
    });

    it('normalizes slugs', () => {
      expect(normalizeCriterionId('Contrast Minimum')).toBe('contrast-minimum');
      expect(normalizeCriterionId('contrast-minimum')).toBe('contrast-minimum');
    });
  });

  describe('normalizeTechniqueId', () => {
    it('normalizes technique IDs', () => {
      expect(normalizeTechniqueId('aria6')).toBe('ARIA6');
      expect(normalizeTechniqueId('aria-6')).toBe('ARIA6');
      expect(normalizeTechniqueId('f3')).toBe('F3');
      expect(normalizeTechniqueId('g18')).toBe('G18');
      expect(normalizeTechniqueId('h-37')).toBe('H37');
    });

    it('strips prefixes and parameters', () => {
      expect(normalizeTechniqueId('tech:ARIA6')).toBe('ARIA6');
      expect(normalizeTechniqueId('failure:F3?raw=true')).toBe('F3');
    });
  });

  describe('sanitizeQuery', () => {
    it('strips control characters and collapses whitespace', () => {
      expect(sanitizeQuery('color\x00 \x1fcontrast')).toBe('color contrast');
    });

    it('handles percent encodings', () => {
      expect(sanitizeQuery('color%20contrast')).toBe('color contrast');
    });

    it('caps overly long query strings', () => {
      const long = 'a'.repeat(500);
      expect(sanitizeQuery(long).length).toBe(300);
    });
  });

  describe('normalizeLevel', () => {
    it('normalizes single and comma-separated levels', () => {
      expect(normalizeLevel('AA')).toEqual(['AA']);
      expect(normalizeLevel('a, aa')).toEqual(['A', 'AA']);
      expect(normalizeLevel('level-aa')).toEqual(['AA']);
      expect(normalizeLevel(['A', 'AAA'])).toEqual(['A', 'AAA']);
    });
  });

  describe('normalizeVersion', () => {
    it('normalizes version numbers', () => {
      expect(normalizeVersion('2.2')).toBe('2.2');
      expect(normalizeVersion('wcag2.2')).toBe('2.2');
      expect(normalizeVersion('v2.1')).toBe('2.1');
      expect(normalizeVersion('invalid')).toBeUndefined();
    });
  });
});
