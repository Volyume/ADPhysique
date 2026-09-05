#!/usr/bin/env node
/**
 * scripts/exercise-library/convert-legacy.mjs
 *
 * ONE-TIME conversion script (EL-14, 07-CORPUS-FORMAT.md section 1-2).
 * Reads the current legacy corpus — the 552 RAW rows (via loadSeed.mjs,
 * which already fixes the Farmer's Walk quote-blind-spot) PLUS the 18
 * REQUIRED_EXERCISES rows in seedRoutines.js (EL-15) — and writes the
 * structured family modules under src/lib/exerciseCorpus/families/.
 *
 * Folds every seed-local name-keyed override map into entry fields:
 *   - SUBREGION_MAP / EXERCISE_TYPE_MAP        -> loadSeedRows() output
 *     already applies these; this script only OVERRIDES the specific
 *     names the audit found wrong (metadata-anomalies.json) or missing
 *     (missing-subregion list) — see SUBREGION_FIXES / EXERCISE_TYPE_FIXES.
 *   - SINGLE_IMPLEMENT_TOTAL / ASSISTED_NAMES  -> untouched: the exported
 *     deriveLoadSemantics() in seedExercises.js already keys off these by
 *     name, and corpusEntryToSeedRow() calls that same function, so no
 *     per-entry override is needed for a name already in those tables.
 *   - MACHINE_TYPE_BY_NAME                     -> untouched for the same
 *     reason (deriveMachineType looks it up by name during derivation).
 *   - CURATED_DEMANDS                          -> untouched: applied
 *     automatically inside deriveDemandMetadata(); never duplicated onto
 *     an entry's overrides.demands.
 *
 * EL-21 rulings applied here:
 *   - six duplicate pairs retired (RETIRE_MAP), retired name added as an
 *     alias of the survivor, retired entry kept as { name, retiredInto };
 *   - the 11 mis-typed rows get a corrected exerciseType + sane rep
 *     defaults (EXERCISE_TYPE_FIXES);
 *   - the 59 rows missing a required subregion get one, from the movement
 *     (SUBREGION_FIXES) — also written to
 *     docs/exercise-library-expansion-2026-09-05/data/subregion-assignments.json
 *     for lead review;
 *   - band rows (bodyweight + "Band" in the name), landmine rows (barbell
 *     + "Landmine" in the name) and TRX/ring rows (bodyweight) get the
 *     corrected coarse `equipment` value;
 *   - high-confidence aliases from data/audit/aliases-needed.json are
 *     adopted.
 *
 * Run once: `node scripts/exercise-library/convert-legacy.mjs`. Not part
 * of any build step — it is a generator, not a runtime module.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FAMILIES_DIR = join(ROOT, 'src/lib/exerciseCorpus/families');
const CAMPAIGN_DATA_DIR = join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data');

// ── 1. Load the 552 RAW rows (base fields only) ───────────────────────────
//
// Read from the FROZEN pre-conversion git blob, never from the live tree
// or via loadSeed.mjs: this script's own landing (a) deletes RAW/
// SUBREGION_MAP/EXERCISE_TYPE_MAP from seedExercises.js and (b) repoints
// loadSeed.mjs at the corpus this script generates, so a second run
// reading either live source would feed the corpus back into itself.
// `git show HEAD:...` is a deliberate one-time bootstrap — this script is
// documented as ONE-TIME (see file header) and nothing else imports it.
function readFrozenSeedSource() {
  return execSync('git show HEAD:src/lib/seedExercises.js', { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}
function extractBlock(src, startToken, endToken) {
  const start = src.indexOf(startToken);
  const end = src.indexOf(endToken, start);
  if (start === -1 || end === -1) throw new Error(`convert-legacy: could not find ${JSON.stringify(startToken)}`);
  return src.slice(start, end);
}
function parseFrozenRawRows(src) {
  const body = extractBlock(src, 'const RAW = [', '\n];');
  const rows = [];
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('[')) continue;
    let depth = 0;
    for (const ch of line) { if (ch === '[') depth++; else if (ch === ']') depth--; }
    if (depth !== 0) continue; // not a complete single-line literal
    const literal = line.replace(/,\s*$/, '');
    // eslint-disable-next-line no-new-func
    const tuple = Function(`"use strict"; return (${literal});`)();
    if (Array.isArray(tuple) && tuple.length === 10) rows.push(tuple);
  }
  return rows;
}
function parseFrozenNameMap(src, startToken) {
  const body = extractBlock(src, startToken, '\n};');
  const map = {};
  for (const m of body.matchAll(/^\s*'((?:[^'\\]|\\.)*)':\s*'(\w+)',?\s*$/gm)) map[m[1]] = m[2];
  return map;
}
const frozenSrc = readFrozenSeedSource();
const frozenSubregionMap = parseFrozenNameMap(frozenSrc, 'const SUBREGION_MAP = {');
const frozenRawTuples = parseFrozenRawRows(frozenSrc);
if (frozenRawTuples.length !== 552) {
  throw new Error(`convert-legacy: expected 552 RAW rows from the frozen blob, found ${frozenRawTuples.length}`);
}

const seedRows = frozenRawTuples.map(([name, primaryMuscle, secondaryMuscles, equipment, movementPattern, isCompound, repMin, repMax, fatigueCost, sfr]) => ({
  name,
  primaryMuscle,
  secondaryMuscles: secondaryMuscles ?? [],
  equipment,
  movementPattern,
  compound: !!isCompound,
  repMin, repMax, fatigueCost, sfr,
  subregion: frozenSubregionMap[name] ?? null,
}));

// ── 2. Load the 18 REQUIRED_EXERCISES rows (EL-15) ────────────────────────
// Frozen as a literal here rather than re-read from seedRoutines.js: this
// script's own landing DELETES REQUIRED_EXERCISES from that file (EL-15),
// so a second run of this one-time conversion has nothing left to parse.
// This is the exact array seedRoutines.js carried immediately before that
// deletion (git blame: 2026-09-05, exercise-library-expansion campaign).
const REQUIRED_EXERCISES_SNAPSHOT = [
  { name: 'HS Plate-Loaded Lat Pulldown',     primaryMuscle: 'back',      equipment: 'machine',  movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 8,  defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Underhand Lat Pulldown',            primaryMuscle: 'back',      equipment: 'cable',    movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Plate-Loaded Seated Row',           primaryMuscle: 'back',      equipment: 'machine',  movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'HS ISO High Row',                   primaryMuscle: 'back',      equipment: 'machine',  movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Cable Serratus Punch',              primaryMuscle: 'abs',       equipment: 'cable',    movementPattern: 'push',      compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 25, fatigueCost: 1, stimulusToFatigueRatio: 5 },
  { name: 'Cable Lateral Raise (Low Pulley)',  primaryMuscle: 'side_delts',  equipment: 'cable',    movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Facing-In Shoulder Press',          primaryMuscle: 'front_delts', equipment: 'machine',  movementPattern: 'push',      compoundIsolation: 'compound',  defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Cable Fly (Low to Mid, Incline)',  primaryMuscle: 'chest',       equipment: 'cable',    movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Cable Fly (Mid Height, Cuff)',     primaryMuscle: 'chest',       equipment: 'cable',    movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Box Step-Up',                       primaryMuscle: 'quads',     equipment: 'bodyweight', movementPattern: 'squat',   compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Single-Arm Dumbbell Row',           primaryMuscle: 'back',      equipment: 'dumbbell', movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 15, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Trap Bar Deadlift (Low Handle)',    primaryMuscle: 'quads',     equipment: 'barbell',  movementPattern: 'hinge',     compoundIsolation: 'compound',  defaultRepMin: 4,  defaultRepMax: 8,  fatigueCost: 5, stimulusToFatigueRatio: 4 },
  { name: 'Hip Thrust (Barbell)',    primaryMuscle: 'glutes',   equipment: 'barbell',    movementPattern: 'hinge',     compoundIsolation: 'compound',  defaultRepMin: 8,  defaultRepMax: 15, fatigueCost: 3, stimulusToFatigueRatio: 5 },
  { name: 'Dumbbell Goblet Squat',   primaryMuscle: 'quads',    equipment: 'dumbbell',   movementPattern: 'squat',     compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Lunge',                   primaryMuscle: 'quads',    equipment: 'bodyweight', movementPattern: 'squat',     compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Bodyweight Squat',        primaryMuscle: 'quads',    equipment: 'bodyweight', movementPattern: 'squat',     compoundIsolation: 'compound',  defaultRepMin: 15, defaultRepMax: 30, fatigueCost: 1, stimulusToFatigueRatio: 3 },
  { name: 'Seated Band Row',         primaryMuscle: 'back',     equipment: 'bodyweight', movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 12, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Seated Band Lat Pulldown',primaryMuscle: 'back',     equipment: 'bodyweight', movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 12, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 4 },
];
function loadRequiredExercises() {
  const arr = REQUIRED_EXERCISES_SNAPSHOT;
  return arr.map((e) => ({
    name: e.name,
    primaryMuscle: e.primaryMuscle,
    secondaryMuscles: e.secondaryMuscles ?? [],
    equipment: e.equipment,
    movementPattern: e.movementPattern,
    compound: e.compoundIsolation === 'compound',
    repMin: e.defaultRepMin,
    repMax: e.defaultRepMax,
    fatigueCost: e.fatigueCost,
    sfr: e.stimulusToFatigueRatio,
    subregion: null,
  }));
}
const requiredRows = loadRequiredExercises();
if (requiredRows.length !== 18) {
  throw new Error(`convert-legacy: expected 18 REQUIRED_EXERCISES, found ${requiredRows.length}`);
}

const allRows = [...seedRows, ...requiredRows];

// ── 3. EL-21 fix-up tables ─────────────────────────────────────────────────

// F6 / missingSubregionWhereRequired (data/audit/metadata-anomalies.json):
// 59 rows assigned a real subregion from the movement, for lead review.
// Also includes the "Rope Jump" name-mismatch bug (SUBREGION_MAP/
// EXERCISE_TYPE_MAP keyed the row as "Jump Rope", which does not exist in
// RAW, so the intended tags never applied to the real row).
const SUBREGION_FIXES = {
  'Dumbbell Pullover': 'flat',
  'Hammer Strength Chest Press': 'flat',
  'Cable Fly (High to Low)': 'flat',
  'Dumbbell Pullover (Chest)': 'flat',
  'Good Morning (Barbell)': 'hip_extension',
  'Tricep Dip (Parallel Bars)': 'pushdown',
  'Cycling (Stationary)': 'squat_press',
  'Romanian Deadlift (Dumbbell)': 'hip_extension',
  'Kettlebell Swing': 'hip_extension',
  'Deadlift (Conventional)': 'hip_extension',
  'Deadlift (Sumo)': 'hip_extension',
  'Trap Bar Deadlift (Hamstring)': 'hip_extension',
  'Box Jump': 'gastro',
  'Ab Wheel (Kneeling)': 'anti_extension',
  'Weighted Sit-Up': 'flexion',
  'Toe-to-Bar': 'flexion',
  'L-Sit Hold': 'flexion',
  'Suitcase Carry': 'anti_extension',
  'Pallof Press (Kneeling)': 'anti_extension',
  'Copenhagen Plank': 'anti_extension',
  'Sled Push': 'squat_press',
  'Sled Pull': 'hip_extension',
  'Prowler Drag': 'hip_extension',
  'Assault Bike': 'squat_press',
  'Jump Squat': 'squat_press',
  'Broad Jump': 'squat_press',
  'Depth Jump': 'squat_press',
  'Stair Running': 'squat_press',
  'Barbell Good Morning': 'hip_extension',
  'Jefferson Curl': 'hip_extension',
  'Serratus Punch': 'flexion',
  'Kneeling Cable Crunch': 'flexion',
  'Exercise Ball Crunch': 'flexion',
  'Mountain Climber': 'flexion',
  'Plank Row': 'anti_extension',
  'Bear Crawl': 'anti_extension',
  'Kneeling Ab Rollout': 'anti_extension',
  'Windmill': 'anti_extension',
  'Turkish Get-Up': 'anti_extension',
  'Close-Grip Push-Up': 'flat',
  'Archer Push-Up': 'flat',
  'Single-Arm Push-Up': 'flat',
  'Cable Chest Press (Standing)': 'flat',
  'Smith Machine Incline Press': 'incline',
  'Guillotine Press': 'flat',
  'Smith Machine Close-Grip Press': 'pushdown',
  'Dip Machine': 'pushdown',
  'Cable Kickback (Triceps)': 'pushdown',
  'Barbell Skull Crusher': 'overhead',
  'Stiff-Leg Deadlift (Single-Leg)': 'hip_extension',
  'Agility Ladder Drills': 'gastro',
  'Rope Jump': 'gastro',
  'Landmine Press (Abs)': 'flexion',
  'Half-Kneeling Pallof Press': 'anti_extension',
  'Tall-Kneeling Pallof Press': 'anti_extension',
  'GHD Sit-Up': 'flexion',
  'Incline Board Sit-Up': 'flexion',
  'Hanging Oblique Raise': 'flexion',
  'Seated Twist (Plate)': 'flexion',

  // EL-15: the 18 former seedRoutines.js REQUIRED_EXERCISES rows never had
  // a subregion at all (not covered by the audit's 59, which only ever
  // saw the 552 RAW rows) — filled here from the movement on the same
  // basis as the 59 above, now that they are ordinary canonical rows with
  // an enforced subregion requirement.
  'Hip Thrust (Barbell)': 'activator',
  'Trap Bar Deadlift (Low Handle)': 'squat_press',
  'Dumbbell Goblet Squat': 'squat_press',
  'Single-Arm Dumbbell Row': 'horizontal_lat',
  'Cable Fly (Low to Mid, Incline)': 'incline',
  'Cable Fly (Mid Height, Cuff)': 'flat',
  'Cable Serratus Punch': 'flexion',
  'Underhand Lat Pulldown': 'vertical_pull',
  'HS ISO High Row': 'upper_mid_row',
  'HS Plate-Loaded Lat Pulldown': 'vertical_pull',
  'Plate-Loaded Seated Row': 'horizontal_lat',
  'Bodyweight Squat': 'squat_press',
  'Box Step-Up': 'squat_press',
  'Lunge': 'squat_press',
  'Seated Band Lat Pulldown': 'vertical_pull',
  'Seated Band Row': 'horizontal_lat',
};

// F7 / repRangeAbsurd (data/audit/metadata-anomalies.json): the 11
// mis-typed rows. exerciseType + sane rep/hold/distance defaults.
const EXERCISE_TYPE_FIXES = {
  'Toe Walk': { exerciseType: 'distance', repMin: 10, repMax: 20 },
  'Heel Walk': { exerciseType: 'distance', repMin: 10, repMax: 20 },
  'Plate Pinch': { exerciseType: 'duration', repMin: 15, repMax: 45 },
  'Rice Bucket': { exerciseType: 'duration', repMin: 30, repMax: 90 },
  'Sled Push': { exerciseType: 'distance', repMin: 10, repMax: 30 },
  'Sled Pull': { exerciseType: 'distance', repMin: 10, repMax: 30 },
  'Prowler Drag': { exerciseType: 'distance', repMin: 10, repMax: 30 },
  'Stair Running': { exerciseType: 'duration', repMin: 30, repMax: 120 },
  'Mountain Climber': { exerciseType: 'reps_only', repMin: 16, repMax: 30 },
  'Agility Ladder Drills': { exerciseType: 'duration', repMin: 20, repMax: 45 },
  'Rope Jump': { exerciseType: 'duration', repMin: 30, repMax: 90 },
};

// The pre-existing EXERCISE_TYPE_MAP entries (seedExercises.js), carried
// forward unchanged so the corpus records exactly what the legacy map
// already applied (loadSeedRows() does not surface exerciseType, so it is
// re-declared here rather than re-parsed).
const LEGACY_EXERCISE_TYPES = {
  'Plank': 'duration', 'Side Plank': 'duration', 'Hollow Body Hold': 'duration',
  'L-Sit Hold': 'duration', 'Copenhagen Plank': 'duration', 'Wall Sit': 'duration',
  'Dead Hang': 'duration', 'Glute Squeeze Hold': 'duration',
  'Cycling (Stationary)': 'duration', 'Assault Bike': 'duration', 'Battle Ropes': 'duration',
  'Pull-Up': 'weighted_bodyweight', 'Chin-Up': 'weighted_bodyweight',
  'Neutral Grip Pull-Up': 'weighted_bodyweight', 'Weighted Pull-Up': 'weighted_bodyweight',
  'Push-Up': 'weighted_bodyweight', 'Wide-Grip Push-Up': 'weighted_bodyweight',
  'Decline Push-Up': 'weighted_bodyweight', 'Ring Push-Up': 'weighted_bodyweight',
  'Weighted Dips (Chest)': 'weighted_bodyweight', 'Wide-Grip Pull-Up': 'weighted_bodyweight',
  'Weighted Plank (Plate on Back)': 'duration', 'Reverse Plank': 'duration',
  'Cable Anti-Rotation Hold (Half-Kneeling)': 'duration', 'Adductor Squeeze (Ball)': 'duration',
};

// EL-21: six confirmed duplicate pairs (02-CORPUS-AUDIT.md section 3),
// consolidated by RETIREMENT. Survivor keeps its name; retired name
// becomes an alias of the survivor.
const RETIRE_MAP = {
  'Rope Pushdown': 'Tricep Pushdown (Rope)',
  'Triceps Extension Machine': 'Machine Tricep Extension',
  'Cable Pull-Through (Glute)': 'Cable Pull-Through',
  'Nordic Hamstring Curl': 'Nordic Curl',
  'Overhead Dumbbell Extension': 'Dumbbell Overhead Tricep Extension',
  'Ab Crunch Machine': 'Machine Crunch',
};

// EL-21: coarse equipment reclassification by name, applied to whichever
// family file the entry lands in. Order matters: suspension before the
// generic bodyweight fallthrough.
const LANDMINE_RE = /\blandmine\b/i;
const BAND_RE = /\bband(ed)?\b/i;
const SUSPENSION_RE = /\btrx\b|\bring push-up\b/i;
function reclassifyEquipment(name, equipment) {
  if (SUSPENSION_RE.test(name)) return 'suspension';
  if (LANDMINE_RE.test(name) && equipment === 'barbell') return 'landmine';
  if (BAND_RE.test(name) && equipment === 'bodyweight') return 'band';
  return equipment;
}

// EL-7: ballistic character (kettlebell and bodyweight explosive work).
// 'grind' is the default; everything else stays a controlled loaded rep.
const BALLISTIC_RE = /\bswing\b|\bclean\b|\bsnatch\b|\bjerk\b|\bjump\b|\bthrow/i;

// data/audit/aliases-needed.json: adopt HIGH-CONFIDENCE suggestions only.
function loadHighConfidenceAliases() {
  const raw = JSON.parse(readFileSync(join(CAMPAIGN_DATA_DIR, 'audit/aliases-needed.json'), 'utf8'));
  const map = {};
  for (const row of raw.perRow ?? []) {
    const names = (row.aliases ?? [])
      .filter((a) => a.confidence === 'high')
      .map((a) => a.alias);
    if (names.length) map[row.name] = names;
  }
  return map;
}
const ALIAS_SUGGESTIONS = loadHighConfidenceAliases();

// ── 4. Build corpus entries ────────────────────────────────────────────────
const bySurvivorAliases = {}; // survivorName -> [retired names]
for (const [retired, survivor] of Object.entries(RETIRE_MAP)) {
  (bySurvivorAliases[survivor] ??= []).push(retired);
}

function buildEntry(row) {
  const equipment = reclassifyEquipment(row.name, row.equipment);
  const exerciseType = EXERCISE_TYPE_FIXES[row.name]?.exerciseType ?? LEGACY_EXERCISE_TYPES[row.name] ?? null;
  const repMin = EXERCISE_TYPE_FIXES[row.name]?.repMin ?? row.repMin;
  const repMax = EXERCISE_TYPE_FIXES[row.name]?.repMax ?? row.repMax;
  const subregion = SUBREGION_FIXES[row.name] ?? row.subregion ?? null;

  const aliases = [
    ...(ALIAS_SUGGESTIONS[row.name] ?? []),
    ...(bySurvivorAliases[row.name] ?? []),
  ];

  const overrides = {};
  if (exerciseType && exerciseType !== 'weight_reps') overrides.exerciseType = exerciseType;

  const entry = {
    name: row.name,
    primaryMuscle: row.primaryMuscle,
    secondaryMuscles: row.secondaryMuscles,
    equipment,
    movementPattern: row.movementPattern,
    compound: row.compound,
    repMin, repMax,
    fatigueCost: row.fatigueCost,
    sfr: row.sfr,
    subregion,
  };
  if (aliases.length) entry.aliases = aliases;
  entry.loadCharacter = BALLISTIC_RE.test(row.name) ? 'ballistic' : 'grind';
  if (Object.keys(overrides).length) entry.overrides = overrides;
  entry.cue = ''; // authored by a later agent (EL-17); guard accepts empty per corpus-floor.json cuesRequired:false
  return entry;
}

// EL-21: a retired name gets ONLY the stub entry below, never a full
// entry too — the survivor is the live row from here on.
const entries = allRows.filter((row) => !(row.name in RETIRE_MAP)).map(buildEntry);

// Retired stub entries: kept in the corpus so their canonical id stays
// resolvable and the retirement mapping is explicit and reviewable.
const retiredStubs = Object.entries(RETIRE_MAP).map(([name, retiredInto]) => ({ name, retiredInto }));

// ── 5. Family assignment (coarse equipment -> family module) ──────────────
const FAMILY_BY_EQUIPMENT = {
  barbell: 'barbell', ez_bar: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  smith_machine: 'smith',
  bodyweight: 'bodyweight',
  band: 'band',
  suspension: 'suspension',
  kettlebell: 'kettlebell',
  landmine: 'landmine',
  medicine_ball: 'medicine_ball',
  sled: 'sled',
};
// Families with no legacy rows yet (populated by a later expansion agent).
const EMPTY_FAMILIES = ['carries', 'power', 'specialty'];

const byFamily = {};
for (const key of Object.keys(FAMILY_BY_EQUIPMENT)) byFamily[FAMILY_BY_EQUIPMENT[key]] ??= [];
for (const f of EMPTY_FAMILIES) byFamily[f] ??= [];

for (const entry of entries) {
  const family = FAMILY_BY_EQUIPMENT[entry.equipment];
  if (!family) throw new Error(`convert-legacy: no family for equipment "${entry.equipment}" (${entry.name})`);
  byFamily[family].push(entry);
}
// Retired stubs: filed alongside their survivor's family so a reader finds
// the retirement next to the row it merged into.
for (const stub of retiredStubs) {
  const survivor = entries.find((e) => e.name === stub.retiredInto);
  const family = survivor ? FAMILY_BY_EQUIPMENT[survivor.equipment] : 'machine';
  byFamily[family].push(stub);
}

// Alphabetical within each family, source order otherwise irrelevant since
// this is a one-time generation (hand edits after this point keep whatever
// order a human chooses).
for (const family of Object.keys(byFamily)) {
  byFamily[family].sort((a, b) => a.name.localeCompare(b.name));
}

// ── 6. Write family modules ────────────────────────────────────────────────
mkdirSync(FAMILIES_DIR, { recursive: true });

function serializeEntry(e) {
  const lines = ['  {'];
  lines.push(`    name: ${JSON.stringify(e.name)},`);
  if (e.retiredInto) {
    lines.push(`    retiredInto: ${JSON.stringify(e.retiredInto)},`);
    lines.push('  },');
    return lines.join('\n');
  }
  lines.push(`    primaryMuscle: ${JSON.stringify(e.primaryMuscle)},`);
  lines.push(`    secondaryMuscles: ${JSON.stringify(e.secondaryMuscles)},`);
  lines.push(`    equipment: ${JSON.stringify(e.equipment)},`);
  lines.push(`    movementPattern: ${JSON.stringify(e.movementPattern)},`);
  lines.push(`    compound: ${JSON.stringify(e.compound)},`);
  lines.push(`    repMin: ${e.repMin}, repMax: ${e.repMax},`);
  lines.push(`    fatigueCost: ${e.fatigueCost}, sfr: ${e.sfr},`);
  lines.push(`    subregion: ${JSON.stringify(e.subregion)},`);
  if (e.aliases?.length) lines.push(`    aliases: ${JSON.stringify(e.aliases)},`);
  lines.push(`    loadCharacter: ${JSON.stringify(e.loadCharacter)},`);
  if (e.overrides && Object.keys(e.overrides).length) {
    lines.push(`    overrides: ${JSON.stringify(e.overrides)},`);
  }
  lines.push(`    cue: ${JSON.stringify(e.cue)},`);
  lines.push('  },');
  return lines.join('\n');
}

const HEADER = (family, count) => `/**
 * ${family}.js — generated by scripts/exercise-library/convert-legacy.mjs
 * (EL-14, docs/exercise-library-expansion-2026-09-05/07-CORPUS-FORMAT.md
 * section 1-2). ${count} entries, converted one-to-one from the legacy
 * seedExercises.js RAW tuple (plus seedRoutines.js REQUIRED_EXERCISES,
 * EL-15) with names UNCHANGED (canonical id is a hash of the name).
 *
 * Conventions: alphabetical within each movement section; pure object
 * literals, no imports except from ./vocab.js; cue is '' until a later
 * agent authors it (EL-17); a retired entry ({ name, retiredInto }) marks
 * an EL-21 duplicate-consolidation, kept so its canonical id stays
 * resolvable for the id-remap top-up.
 *
 * Sources policy: every row here already shipped in production; this is
 * a format migration, not new content. New rows added in a later stage of
 * this campaign follow EL-3's quality gate and are attested against
 * coaching/exercise-science literature or the open datasets checklist.
 */
`;

for (const [family, list] of Object.entries(byFamily)) {
  const body = list.map(serializeEntry).join('\n');
  const content = `${HEADER(family, list.length)}
export default [
${body}
];
`;
  writeFileSync(join(FAMILIES_DIR, `${family}.js`), content, 'utf8');
}

// ── 7. Lead-review artefact: subregion assignments ─────────────────────────
const subregionAssignments = Object.entries(SUBREGION_FIXES).map(([name, subregion]) => ({ name, subregion }));
writeFileSync(
  join(CAMPAIGN_DATA_DIR, 'subregion-assignments.json'),
  JSON.stringify({
    note: 'EL-21 / F6: 59 rows missing a required subregion, assigned from the movement by convert-legacy.mjs. Lead review requested.',
    count: subregionAssignments.length,
    assignments: subregionAssignments,
  }, null, 2),
  'utf8',
);

console.log(`convert-legacy: wrote ${Object.keys(byFamily).length} family modules, ${entries.length} live entries + ${retiredStubs.length} retired stubs`);
for (const [family, list] of Object.entries(byFamily)) {
  console.log(`  ${family}.js: ${list.length}`);
}
