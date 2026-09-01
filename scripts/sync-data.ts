import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const W3C_WCAG22_DATA_URL =
  'https://raw.githubusercontent.com/w3c/wai-wcag-quickref/gh-pages/_data/wcag22.json';

async function sync() {
  console.log(`[sync-data] Fetching WCAG 2.2 dataset from: ${W3C_WCAG22_DATA_URL}`);
  const res = await fetch(W3C_WCAG22_DATA_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset: ${res.status} ${res.statusText}`);
  }

  const rawJson = await res.json();

  if (!rawJson.principles || !Array.isArray(rawJson.principles) || rawJson.principles.length === 0) {
    throw new Error('Invalid dataset format: expected principles array');
  }

  let guidelineCount = 0;
  let scCount = 0;
  let techniqueCount = 0;

  for (const p of rawJson.principles) {
    for (const g of p.guidelines || []) {
      guidelineCount++;
      for (const sc of g.successcriteria || []) {
        scCount++;
        const techs = sc.techniques || {};
        for (const key of Object.keys(techs)) {
          if (Array.isArray(techs[key])) {
            techniqueCount += techs[key].length;
          }
        }
      }
    }
  }

  const targetPath = resolve(__dirname, '../data/wcag22.json');
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, JSON.stringify(rawJson, null, 2), 'utf-8');

  console.log(`[sync-data] Successfully synced data to ${targetPath}`);
  console.log(`  - Principles: ${rawJson.principles.length}`);
  console.log(`  - Guidelines: ${guidelineCount}`);
  console.log(`  - Success Criteria: ${scCount}`);
  console.log(`  - Top-level Technique references: ${techniqueCount}`);
}

sync().catch((err) => {
  console.error('[sync-data] Error syncing data:', err);
  process.exit(1);
});
