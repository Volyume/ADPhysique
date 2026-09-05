#!/usr/bin/env node
/**
 * scripts/exercise-library/loadSeed.mjs
 *
 * Shared, deterministic loader for the exercise-library-expansion campaign
 * (docs/exercise-library-expansion-2026-09-05/README.md). Parses the RAW
 * literal rows in src/lib/seedExercises.js the same way
 * scripts/demand-coverage-report.mjs and scripts/adapted-setup-coverage.mjs
 * already do (read the source text, isolate the `const RAW = [ ... ]`
 * block, eval one literal array per line) — reused here, not reinvented —
 * and then runs the SAME pure derivation modules the app runs at seed time,
 * so `loadSeedRows()` returns exactly what a fresh install's `exercises`
 * table would contain for every canonical (is_custom = 0) row.
 *
 * FINDING carried forward from this campaign's schema audit (see
 * docs/exercise-library-expansion-2026-09-05/01-SCHEMA-AND-CONSUMERS.md
 * section 1): the two existing scripts, and the shared test rig
 * src/lib/__tests__/campaign16.helpers.js, all detect a RAW row by
 * `line.trim().startsWith("['")`. One row uses a double-quoted string
 * literal for its name because the name itself contains an apostrophe —
 * `["Farmer's Walk", 'traps', ...]` at seedExercises.js:927 — so all three
 * existing parsers silently skip it. That is NOT "not a single-line
 * literal" (it is one, and it evals cleanly); it is a quote-character
 * blind spot in the line filter. This loader fixes the filter (checks for
 * a bracket-balanced line starting with `[`, regardless of the first
 * string's quote character) rather than special-casing the row, which is
 * why this loader finds 552 RAW rows where the existing tooling and the
 * docs it produced ("the current 551-row corpus") find 551. See the
 * schema doc for the full evidence trail.
 *
 * Pure and read-only: imports only the app's pure derivation modules
 * (no AsyncStorage/database import — those pull in React Native and
 * cannot run under plain Node, which is why this loader parses the
 * seed's source text instead of importing seedExercises.js directly).
 *
 * Exports:
 *   loadSeedRows()      -> Array<FullExerciseRow>, one per RAW row, in
 *                          source (RAW array) order.
 *   SEED_ROW_COLUMNS    -> the RAW tuple's column positions, documented.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deriveExerciseMetadata } from '../../src/lib/exerciseMetadata.js';
import { deriveDemandMetadata, validateDemandMetadata } from '../../src/lib/capability/demands.js';
import { canonicalExerciseId } from '../../src/lib/exercise/canonicalId.js';
import { movementFamily } from '../../src/lib/exercise/movementFamily.js';
import { adaptedSetupFor } from '../../src/lib/exercise/adaptedSetup.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED_PATH = join(ROOT, 'src/lib/seedExercises.js');

/**
 * The RAW tuple schema, verbatim (seedExercises.js:586-589 comment plus the
 * rowToExercise destructure at seedExercises.js:1407-1408).
 * Position: [0] name, [1] primaryMuscle, [2] secondaryMuscles (array),
 * [3] equipment, [4] movementPattern, [5] isCompound (bool),
 * [6] minReps, [7] maxReps, [8] fatigueCost (1-10, 10 = very high systemic
 * fatigue), [9] sfr (stimulus-to-fatigue ratio, 1-10, 10 = excellent
 * stimulus for low fatigue).
 */
export const SEED_ROW_COLUMNS = Object.freeze([
  { index: 0, tuple: 'name', field: 'name', type: 'string' },
  { index: 1, tuple: 'primaryMuscle', field: 'primaryMuscle', type: 'string (muscle enum)' },
  { index: 2, tuple: 'secondaryMuscles', field: 'secondaryMuscles', type: 'string[] (muscle enum), may be []' },
  { index: 3, tuple: 'equipment', field: 'equipment', type: 'string (coarse equipment enum)' },
  { index: 4, tuple: 'movementPattern', field: 'movementPattern', type: 'string (pattern enum)' },
  { index: 5, tuple: 'isCompound', field: 'compoundIsolation', type: "bool -> 'compound'|'isolation'" },
  { index: 6, tuple: 'minReps', field: 'defaultRepMin', type: 'integer' },
  { index: 7, tuple: 'maxReps', field: 'defaultRepMax', type: 'integer' },
  { index: 8, tuple: 'fatigueCost', field: 'fatigueCost', type: 'integer 1-10' },
  { index: 9, tuple: 'sfr', field: 'stimulusToFatigueRatio', type: 'integer 1-10' },
]);

// ── deriveLoadSemantics, reimplemented from seedExercises.js:1338-1402 ─────
// Copied rather than imported: seedExercises.js imports AsyncStorage and
// database.js at module scope, which do not resolve under plain Node, so
// the module cannot be imported directly (verified: `import()`ing it
// throws "Directory import '.../lib/database' is not supported"). This is
// a byte-for-byte copy of the exported pure function and its two data
// tables; if seedExercises.js's tables change, this copy must be updated
// alongside it (flagged in the schema doc's "what would a new row need"
// checklist).
const SINGLE_IMPLEMENT_TOTAL = new Set([
  'Goblet Squat', 'Wide-Stance Goblet Squat (Adductor Bias)',
  'Sumo Squat (Adductor Focus)', 'Sumo Squat (Glute Focus)',
  'Dumbbell Pullover', 'Dumbbell Pullover (Chest)',
  'Waiter Curl', 'Jefferson Curl', 'Wall Ball Squat',
  'Weighted Russian Twist (Medicine Ball)', 'Weighted Frog Pump',
  'Dumbbell Hip Thrust', 'Kettlebell Swing', 'Kettlebell Romanian Deadlift',
  'Keg Carry',
  'Dumbbell Row', 'Kroc Row', 'Concentration Curl', 'Dumbbell Side Bend',
  'Single-Arm Dumbbell Press', 'Single-Arm Dumbbell Shrug',
  'Single-Arm Farmer Carry', 'Suitcase Carry',
  'Single-Leg Calf Raise (Dumbbell)', 'Half-Kneeling Shoulder Press',
  'Egyptian Lateral Raise', 'Leaning Lateral Raise',
  'Dumbbell Single-Leg RDL', 'Single-Leg Romanian Deadlift',
  'Single-Leg Romanian Deadlift (DB)', 'Stiff-Leg Deadlift (Single-Leg)',
  'Kettlebell Snatch', 'Kettlebell Clean and Press',
  'Turkish Get-Up', 'Windmill', 'Dumbbell Pronation/Supination',
]);
const ASSISTED_NAMES = new Set(['Assisted Pull-Up', 'Assisted Dip Machine']);
export const LOAD_SEMANTICS = Object.freeze({
  TOTAL: 'total', PER_HAND: 'per_hand', ASSISTED: 'assisted', ADDED_BODYWEIGHT: 'added_bodyweight',
});
function deriveLoadSemantics({ name, equipment, exerciseType } = {}) {
  if (ASSISTED_NAMES.has(name)) return LOAD_SEMANTICS.ASSISTED;
  if (exerciseType === 'weighted_bodyweight') return LOAD_SEMANTICS.ADDED_BODYWEIGHT;
  if ((equipment === 'dumbbell' || equipment === 'kettlebell') && !SINGLE_IMPLEMENT_TOTAL.has(name)) {
    return LOAD_SEMANTICS.PER_HAND;
  }
  return LOAD_SEMANTICS.TOTAL;
}

// ── source-text extraction ─────────────────────────────────────────────

function readSeedSource() {
  return readFileSync(SEED_PATH, 'utf8');
}

function extractBlock(src, startToken, endToken) {
  const start = src.indexOf(startToken);
  if (start === -1) throw new Error(`loadSeed: could not find ${JSON.stringify(startToken)} in seedExercises.js`);
  const end = src.indexOf(endToken, start);
  if (end === -1) throw new Error(`loadSeed: could not find end token ${JSON.stringify(endToken)} after ${JSON.stringify(startToken)}`);
  return src.slice(start, end);
}

/**
 * Every RAW row as a raw tuple, in source order. A row is any line inside
 * the RAW block that trims to a bracket-balanced array literal starting
 * with `[` — deliberately NOT keyed to the first string's quote character,
 * which is the bug the three existing parsers carry (see file header).
 * Evaluated with `Function` (not the raw `eval` the two prior scripts use)
 * so each row is parsed in an isolated scope; behaviourally identical for
 * this pure-literal input.
 */
function parseRawRows(src) {
  const body = extractBlock(src, 'const RAW = [', '\n];');
  const rows = [];
  const seenNames = new Set();
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('[')) continue;
    let depth = 0;
    for (const ch of line) {
      if (ch === '[') depth++;
      else if (ch === ']') depth--;
    }
    if (depth !== 0) {
      // Per the brief: STOP rather than silently special-case a row that
      // is not a complete single-line literal.
      throw new Error(`loadSeed: RAW row is not a single-line literal (unbalanced brackets): ${line.slice(0, 120)}`);
    }
    const literal = line.replace(/,\s*$/, '');
    // eslint-disable-next-line no-new-func
    const tuple = Function(`"use strict"; return (${literal});`)();
    if (!Array.isArray(tuple) || tuple.length !== SEED_ROW_COLUMNS.length) {
      throw new Error(`loadSeed: RAW row did not parse to a ${SEED_ROW_COLUMNS.length}-tuple: ${line.slice(0, 120)}`);
    }
    const name = tuple[0];
    if (seenNames.has(name)) {
      throw new Error(`loadSeed: duplicate RAW name "${name}" — RAW is expected to be name-unique`);
    }
    seenNames.add(name);
    rows.push(tuple);
  }
  if (rows.length === 0) throw new Error('loadSeed: parsed zero RAW rows — check the block markers');
  return rows;
}

/** name -> subregion, from SUBREGION_MAP. Single-quoted keys/values only,
 *  matching the existing table today (verified: zero double-quoted keys). */
function parseSubregionMap(src) {
  const body = extractBlock(src, 'const SUBREGION_MAP = {', '\n};');
  const map = {};
  for (const m of body.matchAll(/^\s*'((?:[^'\\]|\\.)*)':\s*'(\w+)',?\s*$/gm)) {
    map[m[1]] = m[2];
  }
  return map;
}

/** name -> exerciseType, from EXERCISE_TYPE_MAP. Same quoting shape. */
function parseExerciseTypeMap(src) {
  const body = extractBlock(src, 'const EXERCISE_TYPE_MAP = {', '\n};');
  const map = {};
  for (const m of body.matchAll(/^\s*'((?:[^'\\]|\\.)*)':\s*'(\w+)',?\s*$/gm)) {
    map[m[1]] = m[2];
  }
  return map;
}

// ── row assembly, mirroring seedExercises.js rowToExercise() exactly ──────

function tupleToBaseRow(tuple, subregionMap, exerciseTypeMap) {
  const [name, primaryMuscle, secondaryMuscles, equipment, movementPattern, isCompound, min, max, fatigue, sfr] = tuple;
  const base = {
    name,
    primaryMuscle,
    secondaryMuscles,
    equipment,
    movementPattern,
    compoundIsolation: isCompound ? 'compound' : 'isolation',
    defaultRepMin: min,
    defaultRepMax: max,
    fatigueCost: fatigue,
    stimulusToFatigueRatio: sfr,
    subregion: subregionMap[name] ?? null,
    exerciseType: exerciseTypeMap[name] ?? 'weight_reps',
    isCustom: false,
  };
  base.loadSemantics = deriveLoadSemantics({ name, equipment, exerciseType: base.exerciseType });
  return base;
}

/**
 * Every field the runtime seed derives for one canonical row, plus a few
 * fields the campaign needs that rowToExercise() itself does not carry
 * (canonicalId, movementFamily, adaptedSetup) and the two DB-insert-time
 * defaults that every canonical row silently gets and that rowToExercise()
 * never sets (see 01-SCHEMA-AND-CONSUMERS.md section 1: exercise_category
 * and increment_kg are NOT derived from compoundIsolation anywhere — every
 * canonical row is inserted with exercise_category='compound',
 * increment_kg=2.5 regardless of its real compound/isolation status; `cue`
 * is inserted as NULL for every canonical row, always, because rowToExercise
 * never sets it).
 */
function buildFullRow(tuple, subregionMap, exerciseTypeMap) {
  const base = tupleToBaseRow(tuple, subregionMap, exerciseTypeMap);
  const equipMeta = deriveExerciseMetadata(base);
  const demandMeta = deriveDemandMetadata(base);
  const row = { ...base, ...equipMeta, ...demandMeta };

  row.canonicalId = canonicalExerciseId(row.name);
  row.movementFamily = movementFamily(row.name, row.primaryMuscle, row.subregion);
  row.adaptedSetup = adaptedSetupFor(row); // [] when no context materially changes setup
  row.demandValidationErrors = validateDemandMetadata(demandMeta); // [] = passes CAP-8 contradiction check

  // DB-insert-time defaults that are NOT derived from the row (see comment
  // above) — carried here so the export is the exact DB row, not just what
  // rowToExercise() computes.
  row.exerciseCategory = 'compound'; // insertExerciseWithId: data.exerciseCategory ?? 'compound'
  row.incrementKg = 2.5;             // insertExerciseWithId: data.incrementKg ?? 2.5
  row.cue = null;                    // rowToExercise never sets `cue`; always NULL for canonical rows

  return row;
}

/**
 * Parse seedExercises.js and return the full derived row for every RAW
 * exercise, in RAW's source order. Deterministic: same input file, same
 * output, every run.
 * @returns {Array<object>}
 */
export function loadSeedRows() {
  const src = readSeedSource();
  const rawRows = parseRawRows(src);
  const subregionMap = parseSubregionMap(src);
  const exerciseTypeMap = parseExerciseTypeMap(src);
  return rawRows.map((tuple) => buildFullRow(tuple, subregionMap, exerciseTypeMap));
}

// Allow `node scripts/exercise-library/loadSeed.mjs` as a quick smoke check.
if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = loadSeedRows();
  const bad = rows.filter((r) => r.demandValidationErrors.length);
  console.log(`loadSeedRows(): ${rows.length} rows, ${bad.length} with demand-validation errors`);
  if (bad.length) {
    for (const r of bad) console.log(`  ${r.name}: ${r.demandValidationErrors.join(', ')}`);
    process.exitCode = 1;
  }
}
