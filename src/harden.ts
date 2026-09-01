import type { ConformanceLevel } from './types.js';

/**
 * Normalizes and sanitizes a success criterion or guideline identifier against agent hallucinations.
 */
export function normalizeCriterionId(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  let cleaned = raw.trim();

  // Try URL decoding if percent-encoded
  try {
    if (cleaned.includes('%')) {
      cleaned = decodeURIComponent(cleaned).trim();
    }
  } catch {
    // Ignore decoding errors and continue with raw string
  }

  // Strip control characters (< 0x20)
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

  // Strip embedded query strings, hashes, or path segments
  cleaned = cleaned.split(/[?#]/)[0].trim();

  // Strip path traversal attempts
  cleaned = cleaned.replace(/\.\.+[/\\]/g, '');

  // Strip common prefixes
  cleaned = cleaned.replace(/^(?:sc|criterion|guideline|g)[-:\s]+/i, '');

  // Match dotted numeric criterion numbers like "1.4.3" or hyphenated "1-4-3" or "1_4_3"
  const numericMatch = cleaned.match(/^(\d+)[\.\-_](\d+)(?:[\.\-_](\d+))?\.?$/);
  if (numericMatch) {
    const [, p, g, sc] = numericMatch;
    if (sc !== undefined) {
      return `${p}.${g}.${sc}`;
    }
    return `${p}.${g}`;
  }

  // Normalize slug / handle
  cleaned = cleaned
    .toLowerCase()
    .replace(/[^\w.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return cleaned;
}

/**
 * Normalizes technique IDs (e.g. "aria6", "aria-6", "f3", "g18", "h37").
 */
export function normalizeTechniqueId(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  let cleaned = raw.trim();
  try {
    if (cleaned.includes('%')) {
      cleaned = decodeURIComponent(cleaned).trim();
    }
  } catch {
    // Continue
  }

  // Strip control chars
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  cleaned = cleaned.split(/[?#]/)[0].trim();
  cleaned = cleaned.replace(/^(?:tech|technique|failure)[-:\s]+/i, '');

  // Normalize hyphenated technique IDs like "aria-6" -> "ARIA6"
  const match = cleaned.match(/^([a-zA-Z]+)[-_\s]*(\d+)$/);
  if (match) {
    const [, prefix, num] = match;
    return `${prefix.toUpperCase()}${num}`;
  }

  return cleaned.toUpperCase();
}

/**
 * Normalizes situation letter identifiers (e.g. "A", "situation-a", "sit:A", "a.").
 */
export function normalizeSituationLetter(raw?: string): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;

  let cleaned = raw.trim().replace(/[\x00-\x1F\x7F]/g, '');
  cleaned = cleaned.replace(/^(?:situation|sit)[-:\s]*/i, '');
  cleaned = cleaned.replace(/[.\-_]+$/, '').trim();

  if (/^[a-zA-Z]$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }
  return undefined;
}

/**
 * Sanitizes search query string.
 */
export function sanitizeQuery(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  let cleaned = raw;
  try {
    if (cleaned.includes('%')) {
      cleaned = decodeURIComponent(cleaned);
    }
  } catch {
    // Continue
  }

  // Remove control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, ' ');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Cap query length to prevent abusive token consumption
  if (cleaned.length > 300) {
    cleaned = cleaned.slice(0, 300);
  }

  return cleaned;
}

/**
 * Normalizes conformance levels from user/agent flags.
 * Accepts: "A", "AA", "AAA", "a,aa", "level-aa", ["A", "AA"]
 */
export function normalizeLevel(raw?: string | string[]): ConformanceLevel[] {
  if (!raw) return [];

  const rawArray = Array.isArray(raw) ? raw : raw.split(/[\s,]+/);
  const levels = new Set<ConformanceLevel>();

  for (const item of rawArray) {
    if (!item) continue;
    const clean = item.toUpperCase().replace(/^LEVEL[-_:]*/i, '').trim();
    if (clean === 'A' || clean === 'AA' || clean === 'AAA') {
      levels.add(clean as ConformanceLevel);
    }
  }

  return Array.from(levels);
}

/**
 * Resolves cumulative WCAG conformance target levels.
 * e.g., "AA" target resolves to ["A", "AA"] (since conforming to AA requires passing A).
 * "AAA" target resolves to ["A", "AA", "AAA"].
 */
export function resolveCumulativeLevels(raw?: string | string[], exact = false): ConformanceLevel[] {
  if (!raw) return [];
  const normalized = normalizeLevel(raw);
  if (exact || normalized.length > 1) {
    return normalized;
  }
  if (normalized.length === 1) {
    const single = normalized[0];
    if (single === 'AA') return ['A', 'AA'];
    if (single === 'AAA') return ['A', 'AA', 'AAA'];
    return ['A'];
  }
  return [];
}

/**
 * Normalizes version strings ("2.0", "2.1", "2.2").
 */
export function normalizeVersion(raw?: string): string | undefined {
  if (!raw) return undefined;
  const clean = raw.toLowerCase().replace(/^(?:wcag|v)[-_:]*/, '').trim();
  if (clean === '2.0' || clean === '2.1' || clean === '2.2') {
    return clean;
  }
  return undefined;
}
