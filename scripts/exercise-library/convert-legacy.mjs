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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSeedRows } from './loadSeed.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED_ROUTINES_PATH = join(ROOT, 'src/lib/seedRoutines.js');
const FAMILIES_DIR = join(ROOT, 'src/lib/exerciseCorpus/families');
const CAMPAIGN_DATA_DIR = join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data');

// ── 1. Load the 552 RAW rows (base fields only) ───────────────────────────
const seedRows = loadSeedRows().map((r) => ({
  name: r.name,
  primaryMuscle: r.primaryMuscle,
  secondaryMuscles: r.secondaryMuscles ?? [],
  equipment: r.equipment,
  movementPattern: r.movementPattern,
  compound: r.compoundIsolation === 'compound',
  repMin: r.defaultRepMin,
  repMax: r.defaultRepMax,
  fatigueCost: r.fatigueCost,
  sfr: r.stimulusToFatigueRatio,
  subregion: r.subregion ?? null,
}));

// ── 2. Load the 18 REQUIRED_EXERCISES rows (EL-15) ────────────────────────
function loadRequiredExercises() {
  const src = readFileSync(SEED_ROUTINES_PATH, 'utf8');
  const start = src.indexOf('const REQUIRED_EXERCISES = [');
  const end = src.indexOf('\n];', start);
  if (start === -1 || end === -1) {
    throw new Error('convert-legacy: could not locate REQUIRED_EXERCISES in seedRoutines.js');
  }
  const literal = src.slice(start + 'const REQUIRED_EXERCISES = '.length, end + 2);
  // eslint-disable-next-line no-new-func
  const arr = Function(`"use strict"; return (${literal});`)();
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('convert-legacy: REQUIRED_EXERCISES did not parse to a non-empty array');
  }
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
  'Mountain Climber': { exerciseType: 'reps_only', repMin: 20, repMax: 40 },
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

const entries = allRows.map(buildEntry);

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
