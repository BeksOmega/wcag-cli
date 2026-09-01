import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import type {
  WCAGDataset,
  Principle,
  Guideline,
  SuccessCriterion,
  FlatTechnique,
  Situation,
  SearchResult,
  ConformanceLevel,
  TechniqueItem,
} from './types.js';
import {
  normalizeCriterionId,
  normalizeTechniqueId,
  normalizeSituationLetter,
  sanitizeQuery,
  normalizeLevel,
  normalizeVersion,
} from './harden.js';

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export class WCAGDatabase {
  private dataset: WCAGDataset;
  private principles: Principle[] = [];
  private guidelines: Guideline[] = [];
  private criteria: SuccessCriterion[] = [];
  private techniques: FlatTechnique[] = [];
  private situations: Situation[] = [];

  private principleByNum = new Map<string, Principle>();
  private principleById = new Map<string, Principle>();
  private guidelineByNum = new Map<string, Guideline>();
  private guidelineById = new Map<string, Guideline>();
  private criterionByNum = new Map<string, SuccessCriterion>();
  private criterionById = new Map<string, SuccessCriterion>();
  private techniqueById = new Map<string, FlatTechnique[]>();
  private situationsByCriterion = new Map<string, Situation[]>();
  private situationById = new Map<string, Situation>();

  constructor(customData?: WCAGDataset) {
    if (customData) {
      this.dataset = customData;
    } else {
      this.dataset = this.loadData();
    }
    this.index();
  }

  private resolveDataPath(): string {
    // 1. Check user cache directory (~/.cache/wcag-cli/wcag22.json)
    const userCachePath = join(homedir(), '.cache', 'wcag-cli', 'wcag22.json');
    if (existsSync(userCachePath)) {
      return userCachePath;
    }

    // 2. Check local data directory relative to import.meta.url
    let currentDir: string;
    try {
      currentDir = dirname(fileURLToPath(import.meta.url));
    } catch {
      currentDir = process.cwd();
    }

    const candidatePaths = [
      resolve(currentDir, '../data/wcag22.json'), // from src/ or dist/
      resolve(currentDir, '../../data/wcag22.json'),
      resolve(currentDir, './data/wcag22.json'),
      resolve(process.cwd(), 'data/wcag22.json'),
    ];

    for (const p of candidatePaths) {
      if (existsSync(p)) {
        return p;
      }
    }

    throw new Error(
      `Could not locate wcag22.json dataset. Tried locations: ${candidatePaths.join(', ')}`
    );
  }

  private loadData(): WCAGDataset {
    const dataPath = this.resolveDataPath();
    const raw = readFileSync(dataPath, 'utf-8');
    return JSON.parse(raw) as WCAGDataset;
  }

  private index(): void {
    this.principles = [];
    this.guidelines = [];
    this.criteria = [];
    this.techniques = [];
    this.situations = [];

    this.principleByNum.clear();
    this.principleById.clear();
    this.guidelineByNum.clear();
    this.guidelineById.clear();
    this.criterionByNum.clear();
    this.criterionById.clear();
    this.techniqueById.clear();
    this.situationsByCriterion.clear();
    this.situationById.clear();

    const extractFlatTechs = (
      item: any,
      type: 'sufficient' | 'advisory' | 'failure',
      sc: SuccessCriterion,
      currentSituation = '',
      currentSituationLetter?: string
    ) => {
      if (!item || typeof item !== 'object') return;

      const sit =
        item.title && (item.techniques || item.groups) ? stripHtml(item.title) : currentSituation;

      let sitLetter = currentSituationLetter;
      if (item.title && (item.techniques || item.groups)) {
        const match = sit.match(/Situation\s+([A-Za-z0-9]+):\s*(.*)/i);
        if (match) {
          sitLetter = match[1].toUpperCase();
        }
      }

      if (item.id && typeof item.id === 'string' && item.id.trim()) {
        const id = item.id.trim();
        const techObj: FlatTechnique = {
          id,
          title: item.title ? stripHtml(item.title) : '',
          technology: item.technology || (type === 'failure' ? 'failures' : 'general'),
          type,
          criterionNum: sc.num,
          criterionHandle: sc.handle,
          situationLetter: sitLetter,
          situationTitle: sit || undefined,
          url: `https://www.w3.org/WAI/WCAG22/Techniques/${item.technology || (type === 'failure' ? 'failures' : 'general')}/${id}`,
        };
        this.techniques.push(techObj);

        const normId = normalizeTechniqueId(id);
        const existing = this.techniqueById.get(normId) || [];
        existing.push(techObj);
        this.techniqueById.set(normId, existing);
      }

      if (Array.isArray(item.techniques)) {
        for (const sub of item.techniques) {
          extractFlatTechs(sub, type, sc, sit, sitLetter);
        }
      }
      if (Array.isArray(item.groups)) {
        for (const grp of item.groups) {
          extractFlatTechs(grp, type, sc, sit, sitLetter);
        }
      }
      if (Array.isArray(item.and)) {
        for (const a of item.and) {
          extractFlatTechs(a, type, sc, sit, sitLetter);
        }
      }
    };

    for (const p of this.dataset.principles) {
      p.url = `https://www.w3.org/WAI/WCAG22/quickref/#${p.id}`;
      this.principles.push(p);
      this.principleByNum.set(p.num, p);
      this.principleById.set(p.id.toLowerCase(), p);

      for (const g of p.guidelines || []) {
        g.principleNum = p.num;
        g.principleHandle = p.handle;
        g.url = `https://www.w3.org/WAI/WCAG22/quickref/#${g.id}`;
        this.guidelines.push(g);
        this.guidelineByNum.set(g.num, g);
        this.guidelineById.set(g.id.toLowerCase(), g);
        if (g.alt_id) {
          const altList = Array.isArray(g.alt_id) ? g.alt_id : [g.alt_id];
          for (const alt of altList) {
            if (typeof alt === 'string' && alt.trim()) {
              this.guidelineById.set(alt.toLowerCase().trim(), g);
            }
          }
        }

        for (const sc of g.successcriteria || []) {
          sc.guidelineNum = g.num;
          sc.guidelineHandle = g.handle;
          sc.principleNum = p.num;
          sc.principleHandle = p.handle;
          sc.url = `https://www.w3.org/WAI/WCAG22/Understanding/${sc.id}.html`;
          this.criteria.push(sc);
          this.criterionByNum.set(sc.num, sc);
          this.criterionById.set(sc.id.toLowerCase(), sc);
          if (sc.alt_id) {
            const altList = Array.isArray(sc.alt_id) ? sc.alt_id : [sc.alt_id];
            for (const alt of altList) {
              if (typeof alt === 'string' && alt.trim()) {
                this.criterionById.set(alt.toLowerCase().trim(), sc);
              }
            }
          }

          // Extract Techniques & Situations
          const techs = sc.techniques || {};
          const scSituations: Situation[] = [];

          for (const type of ['sufficient', 'advisory', 'failure'] as const) {
            const list = techs[type] || [];
            for (const item of list) {
              if (
                type === 'sufficient' &&
                item &&
                typeof item === 'object' &&
                item.title &&
                (item.techniques || item.groups)
              ) {
                const rawClean = stripHtml(item.title);
                const match = rawClean.match(/Situation\s+([A-Za-z0-9]+):\s*(.*)/i);
                const letter = match ? match[1].toUpperCase() : String.fromCharCode(65 + scSituations.length);
                const desc = match ? match[2].trim() : rawClean;

                const situationTechs: FlatTechnique[] = [];
                const collectSituationTechs = (subItem: any) => {
                  if (!subItem || typeof subItem !== 'object') return;
                  if (subItem.id && typeof subItem.id === 'string' && subItem.id.trim()) {
                    situationTechs.push({
                      id: subItem.id.trim(),
                      title: subItem.title ? stripHtml(subItem.title) : '',
                      technology: subItem.technology || 'general',
                      type: 'sufficient',
                      criterionNum: sc.num,
                      criterionHandle: sc.handle,
                      situationLetter: letter,
                      situationTitle: rawClean,
                      url: `https://www.w3.org/WAI/WCAG22/Techniques/${subItem.technology || 'general'}/${subItem.id.trim()}`,
                    });
                  }
                  if (Array.isArray(subItem.techniques)) {
                    for (const t of subItem.techniques) collectSituationTechs(t);
                  }
                  if (Array.isArray(subItem.groups)) {
                    for (const grp of subItem.groups) collectSituationTechs(grp);
                  }
                  if (Array.isArray(subItem.and)) {
                    for (const a of subItem.and) collectSituationTechs(a);
                  }
                };

                collectSituationTechs(item);

                const situationObj: Situation = {
                  id: `${sc.num}-${letter}`,
                  letter,
                  title: desc,
                  criterionNum: sc.num,
                  criterionHandle: sc.handle,
                  techniques: situationTechs,
                };
                scSituations.push(situationObj);
                this.situations.push(situationObj);
                this.situationById.set(situationObj.id.toLowerCase(), situationObj);
              }

              extractFlatTechs(item, type, sc);
            }
          }

          if (scSituations.length > 0) {
            this.situationsByCriterion.set(sc.num, scSituations);
          }
        }
      }
    }
  }

  public getPrinciples(version?: string): Principle[] {
    const v = normalizeVersion(version);
    if (!v) return this.principles;
    return this.principles.filter((p) => !p.versions || p.versions.includes(v));
  }

  public getPrinciple(idOrNum: string): Principle | undefined {
    const clean = normalizeCriterionId(idOrNum);
    return this.principleByNum.get(clean) || this.principleById.get(clean.toLowerCase());
  }

  public getGuidelines(options?: { principle?: string; version?: string }): Guideline[] {
    let result = this.guidelines;
    if (options?.principle) {
      const pClean = normalizeCriterionId(options.principle);
      result = result.filter((g) => g.principleNum === pClean || g.principleHandle?.toLowerCase() === pClean);
    }
    const v = normalizeVersion(options?.version);
    if (v) {
      result = result.filter((g) => !g.versions || g.versions.includes(v));
    }
    return result;
  }

  public getGuideline(idOrNum: string): Guideline | undefined {
    const clean = normalizeCriterionId(idOrNum);
    return this.guidelineByNum.get(clean) || this.guidelineById.get(clean.toLowerCase());
  }

  public getCriteria(options?: {
    level?: ConformanceLevel[] | string;
    guideline?: string;
    principle?: string;
    version?: string;
  }): SuccessCriterion[] {
    let result = this.criteria;

    const levels = Array.isArray(options?.level)
      ? options?.level
      : normalizeLevel(options?.level);

    if (levels.length > 0) {
      result = result.filter((sc) => levels.includes(sc.level));
    }

    if (options?.guideline) {
      const gClean = normalizeCriterionId(options.guideline);
      result = result.filter(
        (sc) =>
          sc.guidelineNum === gClean ||
          sc.guidelineHandle?.toLowerCase() === gClean.toLowerCase()
      );
    }

    if (options?.principle) {
      const pClean = normalizeCriterionId(options.principle);
      result = result.filter(
        (sc) =>
          sc.principleNum === pClean ||
          sc.principleHandle?.toLowerCase() === pClean.toLowerCase()
      );
    }

    const v = normalizeVersion(options?.version);
    if (v) {
      result = result.filter((sc) => !sc.versions || sc.versions.includes(v));
    }

    return result;
  }

  public getCriterion(idOrNum: string): SuccessCriterion | undefined {
    const clean = normalizeCriterionId(idOrNum);
    return this.criterionByNum.get(clean) || this.criterionById.get(clean.toLowerCase());
  }

  public getSituations(criterionIdOrNum?: string, search?: string): Situation[] {
    let list = this.situations;

    if (criterionIdOrNum) {
      const sc = this.getCriterion(criterionIdOrNum);
      if (sc) {
        list = this.situationsByCriterion.get(sc.num) || [];
      } else {
        return [];
      }
    }

    if (search) {
      const cleanSearch = sanitizeQuery(search).toLowerCase();
      const terms = cleanSearch.split(/\s+/).filter(Boolean);
      list = list.filter((sit) => {
        const text = `${sit.title} ${sit.criterionNum} ${sit.criterionHandle}`.toLowerCase();
        return terms.every((t) => text.includes(t));
      });
    }

    return list;
  }

  public getSituation(criterionIdOrNum: string, letter: string): Situation | undefined {
    const sc = this.getCriterion(criterionIdOrNum);
    if (!sc) return undefined;
    const cleanLetter = normalizeSituationLetter(letter);
    if (!cleanLetter) return undefined;
    return this.situationById.get(`${sc.num}-${cleanLetter}`.toLowerCase());
  }

  public getTechnique(id: string): FlatTechnique[] {
    const norm = normalizeTechniqueId(id);
    return this.techniqueById.get(norm) || [];
  }

  public getFailuresForCriterion(idOrNum: string): FlatTechnique[] {
    const sc = this.getCriterion(idOrNum);
    if (!sc) return [];
    return this.techniques.filter(
      (t) => t.criterionNum === sc.num && t.type === 'failure'
    );
  }

  public getTechniquesForCriterion(
    idOrNum: string,
    options?: {
      type?: 'sufficient' | 'advisory' | 'failure';
      situation?: string;
      tech?: string[];
    }
  ): FlatTechnique[] {
    const sc = this.getCriterion(idOrNum);
    if (!sc) return [];

    let list = this.techniques.filter((t) => t.criterionNum === sc.num);

    if (options?.type) {
      list = list.filter((t) => t.type === options.type);
    }

    if (options?.situation) {
      const sitLetter = normalizeSituationLetter(options.situation);
      if (sitLetter) {
        list = list.filter(
          (t) =>
            t.type !== 'sufficient' ||
            (t.situationLetter && t.situationLetter.toUpperCase() === sitLetter)
        );
      }
    }

    if (options?.tech && options.tech.length > 0) {
      const allowedTechs = options.tech.map((t) => t.toLowerCase().trim());
      list = list.filter((t) => t.technology && allowedTechs.includes(t.technology.toLowerCase()));
    }
    return list;
  }

  public search(
    rawQuery: string,
    options?: {
      level?: ConformanceLevel[] | string;
      version?: string;
      limit?: number;
    }
  ): SearchResult[] {
    const query = sanitizeQuery(rawQuery).toLowerCase();
    if (!query) return [];

    const terms = query.split(/\s+/).filter(Boolean);
    const results: SearchResult[] = [];

    const levels = Array.isArray(options?.level)
      ? options?.level
      : normalizeLevel(options?.level);
    const limit = options?.limit ?? 5;
    const version = normalizeVersion(options?.version);

    // 1. Search Criteria
    for (const sc of this.criteria) {
      if (levels.length > 0 && !levels.includes(sc.level)) continue;
      if (version && sc.versions && !sc.versions.includes(version)) continue;

      let score = 0;
      let matchedField = '';
      let snippet = '';

      const numLower = sc.num.toLowerCase();
      const idLower = sc.id.toLowerCase();
      const handleLower = sc.handle.toLowerCase();
      const titleLower = sc.title.toLowerCase();

      // Exact number match
      if (numLower === query || numLower.startsWith(query)) {
        score += 100;
        matchedField = 'criterion number';
        snippet = `SC ${sc.num}: ${sc.handle} (${sc.level})`;
      } else if (idLower === query || handleLower === query) {
        score += 80;
        matchedField = 'criterion handle';
        snippet = `SC ${sc.num}: ${sc.handle} (${sc.level}) - ${sc.title}`;
      } else {
        // Match terms against title and handle
        let termMatches = 0;
        for (const t of terms) {
          if (handleLower.includes(t)) {
            score += 30;
            termMatches++;
          }
          if (titleLower.includes(t)) {
            score += 25;
            termMatches++;
          }
        }

        // Match against details / exceptions
        if (sc.details) {
          for (const d of sc.details) {
            const detailText = (d.text || '') + (d.items ? d.items.map((i) => i.handle + ' ' + i.text).join(' ') : '');
            const detailLower = detailText.toLowerCase();
            for (const t of terms) {
              if (detailLower.includes(t)) {
                score += 15;
                termMatches++;
                if (!snippet) {
                  const idx = detailLower.indexOf(t);
                  const start = Math.max(0, idx - 40);
                  const end = Math.min(detailText.length, idx + 80);
                  snippet = '...' + detailText.slice(start, end).trim() + '...';
                }
              }
            }
          }
        }

        if (termMatches > 0) {
          matchedField = 'requirement text';
          if (!snippet) {
            snippet = sc.title;
          }
        }
      }

      if (score > 0) {
        results.push({
          type: 'criterion',
          id: sc.id,
          num: sc.num,
          handle: sc.handle,
          title: sc.title,
          level: sc.level,
          score,
          matchedField,
          snippet: snippet.length > 200 ? snippet.slice(0, 197) + '...' : snippet,
        });
      }
    }

    // 2. Search Situations
    for (const sit of this.situations) {
      let score = 0;
      const sitTitleLower = sit.title.toLowerCase();
      for (const t of terms) {
        if (sitTitleLower.includes(t)) {
          score += 20;
        }
      }

      if (score > 0) {
        results.push({
          type: 'situation',
          id: sit.id,
          num: sit.criterionNum,
          handle: `Situation ${sit.letter} (${sit.criterionNum} ${sit.criterionHandle})`,
          title: sit.title,
          score,
          matchedField: 'situation description',
          snippet: `[SC ${sit.criterionNum} Situation ${sit.letter}] ${sit.title}`,
        });
      }
    }

    // 3. Search Techniques
    for (const tech of this.techniques) {
      let score = 0;
      const idLower = tech.id.toLowerCase();
      const titleLower = tech.title.toLowerCase();

      if (idLower === query) {
        score += 90;
      } else if (titleLower.includes(query)) {
        score += 35;
      } else {
        for (const t of terms) {
          if (titleLower.includes(t)) {
            score += 15;
          }
        }
      }

      if (score > 0) {
        results.push({
          type: 'technique',
          id: tech.id,
          num: tech.criterionNum,
          handle: `${tech.type.toUpperCase()}: ${tech.id}`,
          title: tech.title,
          score,
          matchedField: 'technique',
          snippet: `[${tech.technology || 'general'}] ${tech.title} (Applies to SC ${tech.criterionNum})`,
        });
      }
    }

    // Sort by score descending and deduplicate
    results.sort((a, b) => b.score - a.score);

    const deduped: SearchResult[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      const key = `${r.type}:${r.id}:${r.num || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(r);
      }
      if (deduped.length >= limit) break;
    }

    return deduped;
  }

  public async syncFromUpstream(force = false): Promise<{ path: string; count: number }> {
    const W3C_WCAG22_DATA_URL =
      'https://raw.githubusercontent.com/w3c/wai-wcag-quickref/gh-pages/_data/wcag22.json';
    const res = await fetch(W3C_WCAG22_DATA_URL);
    if (!res.ok) {
      throw new Error(`Failed to download upstream WCAG data: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as WCAGDataset;
    if (!data.principles || !Array.isArray(data.principles)) {
      throw new Error('Invalid upstream dataset: expected principles array');
    }

    const cacheDir = join(homedir(), '.cache', 'wcag-cli');
    mkdirSync(cacheDir, { recursive: true });
    const targetPath = join(cacheDir, 'wcag22.json');
    writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');

    this.dataset = data;
    this.index();

    return { path: targetPath, count: this.criteria.length };
  }
}

let globalDb: WCAGDatabase | undefined;

export function getDatabase(): WCAGDatabase {
  if (!globalDb) {
    globalDb = new WCAGDatabase();
  }
  return globalDb;
}
