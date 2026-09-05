#!/usr/bin/env node
/**
 * scripts/certification/search-harness.mjs
 *
 * Final whole-product adversarial certification (docs/final-certification-
 * 2026-09-05), Part 10: exercise library quality in the real product.
 *
 * Loads the REAL exercise corpus (src/lib/exerciseCorpus/, via the existing
 * scripts/exercise-library/loadSeed.mjs wrapper -- same derivation pipeline
 * a fresh install's seed uses, 918 live rows) and runs the REAL picker
 * ranking function the app calls (src/lib/exerciseFuzzySearch.js#fuzzySearch,
 * as invoked from src/components/ExercisePickerModal.js's `listData` memo)
 * against a fixed query list, printing/recording the top 5 per query.
 *
 * This mirrors the app's exact call shape:
 *   - `base` = getAllExercises() (ORDER BY name ASC) filtered by
 *     matchesMuscleFilter/matchesEquipmentFilter (src/lib/exerciseDisplay.js)
 *     -- here, corpus rows sorted by name, filtered the same way.
 *   - `fuzzySearch(base, query, e => e.name, { getAliases: e => e.aliases,
 *     getTier: e => tierRank(e.name) })` -- imported unmodified from
 *     src/lib/exerciseFuzzySearch.js and src/lib/exercise/canonicality.js.
 *
 * No new dependency; no src/ edit. Two passes per query: (A) no equipment
 * filter, (B) equipmentFilter = 'kettlebell' (only meaningful for a query
 * whose staple lives in more than one equipment -- run for every query
 * regardless, same as the founder brief's instruction, so a kettlebell-only
 * miss is visible even for e.g. "bench press").
 *
 * Usage:
 *   node scripts/certification/search-harness.mjs            # prints a
 *     compact table to stdout and writes the full JSON dump
 *   node scripts/certification/search-harness.mjs --json-only # JSON dump
 *     only, no stdout table (used for the report data file)
 */
/* eslint-disable no-console */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { loadSeedRows } from '../exercise-library/loadSeed.mjs';
import { fuzzySearch } from '../../src/lib/exerciseFuzzySearch.js';
import { tierRank, autoTier } from '../../src/lib/exercise/canonicality.js';
import { matchesEquipmentFilter, matchesMuscleFilter } from '../../src/lib/exerciseDisplay.js';
import { canonicalExerciseId } from '../../src/lib/exercise/canonicalId.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// ─── The fixed query list (founder brief, verbatim) ────────────────────────
const QUERIES = [
  'bench', 'bench press', 'incline bench', 'flat db press', 'db bench',
  'dumbbell press', 'squat', 'back squat', 'front squat', 'hack squat',
  'leg press', 'rdl', 'romanian deadlift', 'deadlift', 'sumo', 'hip thrust',
  'ohp', 'overhead press', 'military press', 'shoulder press',
  'lateral raise', 'side raise', 'rear delt', 'face pull', 'row',
  'barbell row', 'cable row', 'seated row', 'lat pulldown', 'pulldown',
  'pull up', 'pull-up', 'chin up', 'curl', 'bicep curl', 'hammer curl',
  'preacher', 'tricep pushdown', 'pushdown', 'skullcrusher', 'skull crusher',
  'dips', 'dip', 'lunge', 'bulgarian split squat', 'split squat',
  'calf raise', 'leg curl', 'leg extension', 'hamstring curl', 'plank',
  'crunch', 'ab wheel', 'kb swing', 'kettlebell swing', 'swing',
  'goblet squat', 'clean', 'kettlebell clean', 'snatch', 'turkish get up',
  'tgu', 'press', 'push press', 'farmer carry', 'farmers walk',
  'glute bridge', 'good morning', 'pec deck', 'chest fly', 'fly',
  'cable fly', 'shrug', 'single arm row', 'one arm row', 'step up',
  'nordic', 'reverse hyper', 'landmine press', 'band pull apart', 'pushup',
  'push up', 'push-up', 'burpee', 'thruster', 'sled push', 'sit up',
  'wrist curl', 'neck curl', 'hip abduction', 'adductor', 'glute kickback',
  'box jump', 'jump squat',
];

const MISSPELLINGS = [
  'benhc', 'squt', 'deadlft', 'romainian', 'lateral rase', 'tricep pushdwn',
  'kettelbell swing', 'pullup',
];

const ALL_QUERIES = [...QUERIES.map(q => ({ q, kind: 'query' })), ...MISSPELLINGS.map(q => ({ q, kind: 'misspelling' }))];

// ─── Build the corpus exactly as the app assembles `allExercises` ─────────
// getAllExercises() -> `SELECT * FROM exercises ... ORDER BY name ASC`.
// loadSeedRows() gives every derived field the seed writes; id is added
// the same way insertExerciseWithId's caller (seedExercisesIfNeeded) does:
// canonicalExerciseId(name).
function buildAllExercises() {
  const rows = loadSeedRows().map(r => ({ ...r, id: canonicalExerciseId(r.name) }));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function buildBase(allExercises, equipmentFilter) {
  return allExercises.filter(e =>
    matchesMuscleFilter(e, '') &&
    matchesEquipmentFilter(e, equipmentFilter || ''));
}

function runQuery(base, q) {
  return fuzzySearch(base, q, e => e.name, {
    getAliases: e => e.aliases,
    getTier: e => tierRank(e.name),
  });
}

function topN(results, n = 5) {
  return results.slice(0, n).map(e => ({
    id: e.id,
    name: e.name,
    tier: autoTier(e.name),
    equipment: e.equipment,
    equipmentCategory: e.equipmentCategory,
    aliases: e.aliases,
  }));
}

function main() {
  const jsonOnly = process.argv.includes('--json-only');
  const allExercises = buildAllExercises();
  const baseNoFilter = buildBase(allExercises, '');
  const baseKettlebell = buildBase(allExercises, 'kettlebell');

  if (!jsonOnly) {
    console.log(`Loaded ${allExercises.length} live corpus rows.`);
    console.log(`kettlebell-filtered base: ${baseKettlebell.length} rows.\n`);
  }

  const out = [];
  for (const { q, kind } of ALL_QUERIES) {
    const noFilter = runQuery(baseNoFilter, q);
    const kettlebell = runQuery(baseKettlebell, q);
    const record = {
      query: q,
      kind,
      noFilter: { count: noFilter.length, top5: topN(noFilter) },
      kettlebellFilter: { count: kettlebell.length, top5: topN(kettlebell) },
    };
    out.push(record);

    if (!jsonOnly) {
      console.log(`Q: "${q}" (${kind})  -- no-filter: ${noFilter.length} results, kettlebell-filter: ${kettlebell.length} results`);
      record.noFilter.top5.forEach((e, i) => {
        console.log(`  ${i + 1}. [${e.tier.padEnd(10)}] ${e.name}  (${e.equipmentCategory || e.equipment})  id=${e.id.slice(0, 8)}`);
      });
      if (record.noFilter.top5.length === 0) console.log('  (no results)');
      console.log('');
    }
  }

  const outDir = path.join(ROOT, 'docs/final-certification-2026-09-05/data');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'search-results.json');
  fs.writeFileSync(outFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    corpusSize: allExercises.length,
    kettlebellFilteredSize: baseKettlebell.length,
    queries: out,
  }, null, 2));

  if (!jsonOnly) console.log(`\nWrote full results (all ${out.length} queries, top 5 each pass) to ${path.relative(ROOT, outFile)}`);
}

main();
