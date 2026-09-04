export type ConformanceLevel = 'A' | 'AA' | 'AAA';

export interface DetailItem {
  handle?: string;
  text: string;
}

export interface Detail {
  type: 'p' | 'ulist' | 'note' | string;
  handle?: string;
  text?: string;
  items?: DetailItem[];
}

export interface TechniqueItem {
  id?: string;
  title: string;
  technology?: string;
  prefix?: string;
  suffix?: string;
  note?: string;
  using?: string;
  and?: TechniqueItem[];
  techniques?: TechniqueItem[];
  groups?: TechniqueGroup[];
}

export interface TechniqueGroup {
  id?: string;
  title?: string;
  techniques?: TechniqueItem[];
}

export interface TechniqueSituation {
  title?: string;
  techniques?: TechniqueItem[];
  groups?: TechniqueGroup[];
}

export interface TechniquesCollection {
  sufficient?: (TechniqueItem | TechniqueSituation)[];
  advisory?: TechniqueItem[];
  failure?: TechniqueItem[];
  sufficientNote?: string;
  [key: string]: any;
}

export interface SuccessCriterion {
  id: string;
  num: string;
  alt_id?: string | string[];
  handle: string;
  title: string;
  level: ConformanceLevel;
  versions?: string[];
  details?: Detail[];
  techniques?: TechniquesCollection;
  guidelineNum?: string;
  guidelineHandle?: string;
  principleNum?: string;
  principleHandle?: string;
  url?: string;
  specUrl?: string;
  understandingUrl?: string;
  quickrefUrl?: string;
}

export interface Guideline {
  id: string;
  num: string;
  alt_id?: string | string[];
  handle: string;
  title: string;
  versions?: string[];
  successcriteria: SuccessCriterion[];
  principleNum?: string;
  principleHandle?: string;
  url?: string;
  specUrl?: string;
  understandingUrl?: string;
  quickrefUrl?: string;
}

export interface Principle {
  id: string;
  num: string;
  handle: string;
  title: string;
  versions?: string[];
  guidelines: Guideline[];
  url?: string;
  specUrl?: string;
  understandingUrl?: string;
  quickrefUrl?: string;
}

export interface WCAGDataset {
  principles: Principle[];
}

export interface FlatTechnique {
  id: string;
  title: string;
  technology?: string;
  type: 'sufficient' | 'advisory' | 'failure';
  criterionNum: string;
  criterionHandle: string;
  situationLetter?: string;
  situationTitle?: string;
  url: string;
  specUrl?: string;
}

export interface Situation {
  id: string;
  letter: string;
  title: string;
  criterionNum: string;
  criterionHandle: string;
  techniques: FlatTechnique[];
  url?: string;
  specUrl?: string;
  understandingUrl?: string;
}

export interface SearchResult {
  type: 'criterion' | 'guideline' | 'principle' | 'technique' | 'situation';
  id: string;
  num?: string;
  handle?: string;
  title: string;
  level?: ConformanceLevel;
  score: number;
  matchedField: string;
  snippet: string;
  url?: string;
  specUrl?: string;
  understandingUrl?: string;
}

export type OutputFormat = 'markdown' | 'json' | 'ndjson';

export interface FormatOptions {
  format?: OutputFormat;
  fields?: string[];
  includeTechniques?: boolean;
  situation?: string;
  techFilter?: string[];
  compact?: boolean;
}
