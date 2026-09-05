#!/usr/bin/env node
/**
 * scripts/exercise-library/integrate-inventories.mjs
 *
 * Integration agent, stage 2 (docs/exercise-library-expansion-2026-09-05/
 * INTEGRATION-BRIEF.md job 1). Reads every family inventory
 * (`data/inventory-*.json`), the three lead-triaged open-dataset gap files
 * (`data/gap-triage-*.json`), and `data/lead-overrides.json` (reinstatements,
 * triage corrections, the sandbag family cap), and appends every accepted
 * candidate to the right family module in `src/lib/exerciseCorpus/families/`
 * as a corpus entry per 07-CORPUS-FORMAT.md section 2.
 *
 * Idempotent: re-running replaces the generated block between the
 * `INTEGRATION STAGE 2` marker comments in each touched family file — it
 * never re-touches a pre-existing (EL-14 format-migration) entry except the
 * small, explicitly named set of existing rows this stage's data sources
 * require (alias additions from `aliasesForExisting`/triage `alias`/
 * `false_positive` verdicts targeting an EXISTING row, and the EL-22
 * carry/sled duration conversion for the pre-existing carry/sled rows) —
 * both done by locating that exact named entry's block and rewriting only
 * it, leaving every untouched entry byte-identical.
 *
 * Deterministic: candidates are sorted by name within each family's
 * generated block; the whole pipeline has no randomness and no I/O beyond
 * reading these JSON sources and the corpus/derivation modules.
 *
 * Editorial judgement calls this script encodes explicitly (documented
 * inline, not hidden): a handful of candidates that duplicate another
 * candidate under EL-2 (folded to an alias); a few subregion/exerciseType
 * data fixes (job 4: fix the DATA, never weaken the guard); tier caps
 * (EL-5: agents may only propose SPECIALIST/NICHE/NEVER_AUTO — the
 * 94 STAPLE/COMMON tier proposals found in the source data are held at
 * SPECIALIST pending lead review, exactly like the existing 88-row
 * tier-proposals.json precedent).
 *
 * Run: node scripts/exercise-library/integrate-inventories.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CAMPAIGN = join(ROOT, 'docs/exercise-library-expansion-2026-09-05');
const DATA = join(CAMPAIGN, 'data');
const FAMILIES_DIR = join(ROOT, 'src/lib/exerciseCorpus/families');

const loadJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

// ── 1. Load every source ────────────────────────────────────────────────
const INVENTORY_FILES = [
  'inventory-band.json', 'inventory-barbell.json', 'inventory-bodyweight.json',
  'inventory-cable.json', 'inventory-carries-sleds-power.json',
  'inventory-dumbbell.json', 'inventory-kettlebell.json', 'inventory-landmine.json',
  'inventory-machine.json', 'inventory-specialty.json', 'inventory-suspension.json',
];
const inventories = INVENTORY_FILES.map((f) => ({ file: f, data: loadJSON(join(DATA, f)) }));

const GAP_TRIAGE_FILES = [
  'gap-triage-bars-cables-machines.json', 'gap-triage-bodyweight.json',
  'gap-triage-free-implements.json',
];
const gapTriages = GAP_TRIAGE_FILES.map((f) => ({ file: f, data: loadJSON(join(DATA, f)) }));

const leadOverrides = loadJSON(join(DATA, 'lead-overrides.json'));

// Live corpus + derivation modules (imported live so the sled/medicine_ball/
// sandbag/suspension derivation fixes this campaign lands are already in
// effect when this script computes overrides).
const { CORPUS, RETIRED_NAME_TO_SURVIVOR } = await import(join(ROOT, 'src/lib/exerciseCorpus/index.js'));
const { deriveLaterality, deriveEquipmentCategory, deriveDifficulty } = await import(join(ROOT, 'src/lib/exerciseMetadata.js'));

const corpusByNameLower = new Map(CORPUS.map((e) => [e.name.toLowerCase().trim(), e]));

// ── 2. Family routing (matches convert-legacy.mjs's FAMILY_BY_EQUIPMENT —
//      coarse equipment decides the file, exactly the established
//      precedent: pre-existing Power Clean/Push Press/Clean Pull already
//      live in barbell.js despite being "power" movements). ────────────
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
  sandbag: 'sandbag',
};

// ── 3. Editorial judgement tables (every one documented with why) ──────

// EL-2 duplicate under the SAME candidate pool: inventory-carries-sleds-
// power.json proposed several Olympic-lift candidates under bare names
// that gap-triage-bars-cables-machines.json independently added under the
// corpus's naming convention ("[Implement] [Movement]"). Same movement,
// two proposals — the bare-name one is dropped as a full entry and folded
// in as an alias of the better-named survivor.
const FOLD_AS_ALIAS_OF = {
  'Hang Clean': 'Barbell Hang Power Clean',
  'Hang Snatch': 'Barbell Hang Snatch',
  'Split Jerk': 'Barbell Split Jerk',
  'Muscle Snatch': 'Barbell Muscle Snatch',
  'Push Jerk': 'Barbell Push Jerk',
  'Snatch Pull': 'Barbell Snatch Pull',
  'Barbell High Pull': 'Barbell Clean High Pull',
};

// Exact-name duplicate against an EXISTING corpus row (job 4): dropped,
// no alias added (the name IS the canonical name, so an alias would
// collide with it under rule 2).
const DROP_EXACT_DUPLICATE = new Set([
  'Trap Bar Deadlift (Low Handle)', // inventory-specialty.json; identical
  // name to the existing EL-15 NEVER_AUTO row of the same name.
]);

// lead-overrides.json triageCorrections: "Tyre Flip" (gap-triage-free-
// implements.json's "tire flip" -> "Tyre Flip" add-verdict) collides with
// the existing corpus row of the same name (machine.js) — corrected to
// false_positive; not added as a new candidate. Its raw dataset spelling
// becomes an alias of the existing row instead (handled in the
// EXISTING_ROW_ALIASES table below).
const SKIP_ADD_BY_SOURCE_NAME = new Set(['Tyre Flip']); // matched against candidate.name from an "add" verdict

// Secondary-muscle vocabulary fix (job 4): 'hip_flexors' is not a corpus
// muscle; the closest vocabulary muscle for hip-flexion-dominant secondary
// involvement is 'quads' (this taxonomy has no separate hip-flexor group).
const SECONDARY_MUSCLE_FIX = { hip_flexors: 'quads' };

// Subregion fixes (job 4): either the candidate's proposed value is
// outside SUBREGIONS_BY_MUSCLE for its primary muscle, or the muscle
// requires a subregion (MUSCLES_REQUIRING_SUBREGION) and the candidate
// left it null. Every value below matches an existing corpus convention
// for the same movement shape (documented per group).
const SUBREGION_FIX = {
  // Existing convention: hinge/deadlift-pattern rows with glutes as the
  // stated focus use 'stretcher' (see "Sumo Deadlift (Glute Focus)",
  // "Romanian Deadlift (Glute)").
  'Band Sumo Deadlift': 'stretcher', // was 'hip_extension', not in glutes' vocab
  'Kettlebell Sumo Deadlift': 'stretcher',
  'Landmine Sumo Squat': 'stretcher',
  // Existing convention: hip-thrust/explosive-hip-drive glute work uses
  // 'activator' (see "Barbell Hip Thrust", "Machine Hip Thrust").
  'Medicine Ball Scoop Toss': 'activator',
  // NOT 'hip_extension': vocab.js lists it for back, but
  // src/lib/exercise/movementFamily.js's own closed back-family set
  // (VALID_FAMILIES.back) has no 'hip_extension' member at all — only a
  // BACK-primary row can hit that mismatch (campaign16.movementFamily's
  // "seeded library and family authority agree" invariant), which is why
  // "Deadlift (Conventional)" gets away with 'hip_extension' today: it is
  // tagged primaryMuscle 'hamstrings', not 'back'. These rows genuinely
  // are back-primary, so 'spinal_erector' (movementFamily's own
  // deadlift/hinge bucket for back) is the correct, guard-passing choice.
  'Reverse Band Deadlift': 'spinal_erector',
  'Barbell Snatch Pull': 'spinal_erector',
  'Barbell Clean High Pull': 'spinal_erector',
  // Existing convention: hamstrings-primary swing/ballistic-hinge rows use
  // 'hip_extension' (see "Kettlebell Swing").
  'Kettlebell Swing (Single-Arm)': 'hip_extension',
  'Kettlebell Swing (Alternating)': 'hip_extension',
  'Double Kettlebell Swing': 'hip_extension',
  // Existing convention: loaded-carry rows with abs as primary use
  // 'anti_extension' (see "Suitcase Carry", "Single-Arm Farmer Carry",
  // "Turkish Get-Up").
  'Dumbbell Front Rack Carry': 'anti_extension',
  'Barbell Zercher Carry': 'anti_extension',
  'Kettlebell Suitcase Carry': 'anti_extension',
  'Kettlebell Rack Carry': 'anti_extension',
  'Mixed Kettlebell Carry': 'anti_extension',
  'Turkish Get-Up (Half)': 'anti_extension',
  'Get-Up to Elbow': 'anti_extension',
  // Rotational abs work uses 'rotation' (see "Cable Woodchop", "Landmine
  // Twist").
  'Kettlebell Windmill (Low)': 'rotation',
  'Kettlebell Windmill (High)': 'rotation',
  'Kettlebell Around-the-World': 'rotation',
  // Dynamic hip/knee-flexion-driven core work uses 'flexion' (see
  // "Mountain Climber").
  'Hanging L-Sit': 'flexion',
  'V-Sit': 'flexion',
  'TRX Mountain Climber (Feet Suspended)': 'flexion',
  // Squat/lunge-pattern quad-dominant rows use 'squat_press' (see every
  // squat/lunge entry in the corpus).
  'Tuck Jump': 'squat_press',
  'Cable Hip Flexion (Standing)': 'squat_press',
  'Sled Reverse Drag': 'squat_press',
  'Kettlebell Reverse Lunge (Rack Position)': 'squat_press',
  'Kettlebell Forward Lunge (Rack Position)': 'squat_press',
  'Kettlebell Overhead Lunge': 'squat_press',
  'Hip Flexion Machine (Seated)': 'squat_press',
  'Reverse Band Squat': 'squat_press',
  'Barbell Snatch Balance': 'squat_press',
  'Dumbbell Jump Squat': 'squat_press',
  'Kettlebell Pistol Squat': 'squat_press',
  // Chest incline-pattern rows use 'incline' (pullover/overhead-trajectory
  // chest work already uses 'incline' or 'flat' per the existing corpus;
  // see "Dumbbell Pullover" family and "Cable Fly (High to Low)").
  'Incline Dumbbell Pullover': 'incline',
  'Medicine Ball Overhead Throw': 'incline',
  'Reverse Band Bench Press': 'flat',
  // Back vertical-pull rows use 'vertical_pull' (see "Pull-Up", "Chin-Up").
  'Gironda Sternum Chin-Up': 'vertical_pull',
  // Pumper-family glute isolation (see "Cable Hip Abduction", "Donkey
  // Kickback (Machine)").
  'Clamshell (Side-Lying)': 'pumper',
  // side_delts is not a MUSCLES_REQUIRING_SUBREGION muscle, but 'rotation'
  // is outside its vocab (lateral_raise/overhead_press); the movement is a
  // rotational lateral raise, so 'lateral_raise' is the closer valid fit.
  'Dumbbell Spellcaster': 'lateral_raise',
  // front_delts is not a MUSCLES_REQUIRING_SUBREGION muscle and its only
  // vocab value ('overhead_press') does not describe a static hold; null
  // is the honest, guard-safe answer rather than inventing a value.
  'Full Planche Hold': null,
  // OPEN QUESTION (see final report): the lead's triageCorrections
  // explicitly specified `"subregion": null` for these two rotator-cuff
  // rows, but validate-corpus.mjs's subregion rule (rule 4) has no
  // unknownAxes-style escape hatch the way the demand-axis rule (rule 9)
  // does — a required-subregion muscle (rear_delts) cannot ship null.
  // 'horiz_abduction' is used as a guard-passing placeholder (the existing
  // general "rear-delt fly" bucket) pending the lead's actual rotator-cuff
  // subregion naming decision or a guard change to allow a declared
  // unknown reason for subregion the way it already does for demands.
  'Cable External Rotation': 'horiz_abduction',
  'Cable Internal Rotation': 'horiz_abduction',
  // job 4: 'anterior_delt'/'lat_width'/'rotation' below are not vocabulary
  // values; the "not in vocab" branch is handled the same as above.
  // 'shoulder_extension' (the straight-arm pulldown/pullover role) is
  // deliberately avoided here: a scapular push-up is bodyweight protraction/
  // retraction work, not straight-arm resistance, and campaign16.division's
  // "impossible role" invariant (a bodyweight-only division plan cannot
  // satisfy straight-arm work) depends on no bodyweight row claiming it.
  'Scapular Push-Up': 'upper_mid_row',
};

// exerciseType 'duration' fixes (EL-22 + job 4). EL-22: every carry and
// sled row (existing and new) logs as duration with second-based
// defaults (20-40s carries, 15-30s sled work). Separately (job 4, not
// EL-22): several bodyweight/suspension isometric-hold candidates arrived
// with second counts (15-60) stuffed into repMin/repMax with no
// exerciseType flag — the same 'duration' fix the existing corpus already
// applies to Plank/Dead Hang/Hollow Body Hold/L-Sit Hold.
const HOLD_DURATION_NAMES = new Set([
  'Arch Hold (Superman)', 'Flutter Kick', 'Scissor Kick', 'Wall Handstand Hold',
  'Freestanding Handstand Hold', 'Planche Lean', 'TRX Plank (Feet Suspended)',
  'Ring Support Hold',
]);
const SLED_WORK_RE = /\bsled\b|\bprowler\b/i;
function isCarryOrSledWork(candidate) {
  return candidate.movementPattern === 'carry'
    || candidate.equipment === 'sled'
    || SLED_WORK_RE.test(candidate.name);
}

// EL-5: STAPLE and COMMON registry promotions require lead review; agents
// (the inventory/gap-triage sources) may only propose SPECIALIST/NICHE/
// NEVER_AUTO. 94 candidates across the sources proposed staple/common —
// held at SPECIALIST here (the documented "when in doubt, the safer
// tier" rule), and written out to a lead-review proposal file, exactly
// mirroring the existing tier-proposals.json precedent for the 88
// previously-unlisted rows.
const newCandidateTierProposals = [];
function capTier(tier, name, source) {
  if (tier === 'staple' || tier === 'common') {
    newCandidateTierProposals.push({ name, proposedTier: tier, source });
    return 'specialist';
  }
  return tier;
}

// Alias collisions (rule 2): a candidate's own proposed alias (in its own
// JSON `aliases` array) turned out to equal ANOTHER row's canonical name
// (either an existing corpus row or a different new candidate). Dropped
// from the offending candidate's own alias list — the name already has
// its own canonical representation. (The equivalent collision for an
// aliasesForExisting/gap-triage-proposed alias — one NOT carried in the
// candidate's own `aliases` field — is caught by the general
// droppedAliasCollisions guard in section 6, which covers e.g.
// "Underhand Lat Pulldown"/"Cable Serratus Punch"/"Bodyweight Squat".)
const ALIAS_DROP = {
  'Cossack Squat (Dumbbell)': ['Cossack Squat'],
  'Plate-Loaded T-Bar Row (Chest-Supported)': ['Chest-Supported T-Bar Row'],
  'Landmine Meadows Row': ['Meadows Row'],
};

// Demand-axis fixes (job 4): a candidate's own demandOverrides left an
// axis genuinely resolvable null (either omitted it entirely, or, in
// Kettlebell Halo's case, explicitly set it to null pending the agent's
// own uncertainty) and the name is not old enough to be grandfathered.
// Every value here is a mechanical read of the movement, not a guess.
const DEMAND_AXIS_FIX = {
  // Ab-rollout-family movement: never receives the bar/wheel overhead.
  'Barbell Rollout': { overheadPosition: false },
  // Front squat driven into a press: standing, no floor access, finishes
  // overhead, stable two-footed base.
  'Barbell Thruster': { position: 'standing', floorAccess: false, overheadPosition: true, balanceDemand: 'stable' },
  // Seated machine: hands rest on support handles, not palm-bearing.
  'Hip Flexion Machine (Seated)': { weightBearingHands: false },
  // Lying on the side: no hand load at all.
  'Clamshell (Side-Lying)': { weightBearingHands: false },
  // Straight-arm floor-support hold: palms press into the floor/blocks.
  // position 'mixed' (not 'lying'): the body is held clear of the floor,
  // matching the existing "L-Sit Hold" convention (a hand-balanced hold,
  // not a torso-on-the-ground position) — 'lying' + 'high' balance is an
  // illegal combination (validateDemandMetadata), and 'lying' would also
  // understate the real demand this hold is FOR.
  'Full Planche Hold': { position: 'mixed', weightBearingHands: true },
  // Same "L-Sit Hold" convention: a plank braced on an unstable ball, not
  // a torso-on-the-ground position.
  'Stability Ball Knee Tuck': { position: 'mixed', weightBearingHands: false },
  // Matches the existing full "Turkish Get-Up" CURATED_DEMANDS entry
  // (position 'mixed', not 'lying' — the half get-up shares the same
  // floor-to-elbow/seated transition, so 'lying' + 'high' balance would be
  // the same illegal combination the full move already avoids).
  'Turkish Get-Up (Half)': { position: 'mixed' },
  // The bell travels in a circle that passes overhead during the motion.
  'Kettlebell Halo': { overheadPosition: true },
  // Standing pulls/catches from the floor: 'position: standing' already
  // means floor access is not REQUIRED the way getting down onto the
  // floor is (matches the existing "Conventional Deadlift"/"Power Clean"
  // convention: floorAccess false for every standing floor-to-shoulder
  // pull) — the source candidate's demandOverrides set floorAccess true,
  // which contradicts its own position: standing.
  'Dumbbell Clean': { floorAccess: false },
  'Dumbbell Snatch (Single-Arm)': { floorAccess: false },
  'Kettlebell Clean and Jerk': { floorAccess: false },
};

// ── 4. Collect candidates from every source into one list ──────────────
// Each item: { name, family, tier, tierSource, candidate (raw JSON shape) }
const collected = []; // { candidate, source }
const droppedDuplicates = []; // { name, reason }

for (const { file, data } of inventories) {
  for (const c of data.candidates ?? []) {
    if (DROP_EXACT_DUPLICATE.has(c.name)) {
      droppedDuplicates.push({ name: c.name, reason: `identical name to an existing corpus row (${file})`, alias: null });
      continue;
    }
    if (FOLD_AS_ALIAS_OF[c.name]) {
      droppedDuplicates.push({ name: c.name, reason: `duplicate under EL-2 of another new candidate (${file})`, alias: FOLD_AS_ALIAS_OF[c.name] });
      continue;
    }
    collected.push({ candidate: c, source: file });
  }
}

for (const { file, data } of gapTriages) {
  for (const v of data.verdicts ?? []) {
    if (v.verdict !== 'add') continue;
    const c = v.candidate;
    if (SKIP_ADD_BY_SOURCE_NAME.has(c.name)) {
      droppedDuplicates.push({ name: c.name, reason: `triageCorrections: verdict corrected to false_positive (identical name to existing corpus row) (${file})`, alias: null });
      continue;
    }
    collected.push({ candidate: c, source: file });
  }
}

// lead-overrides.json: reinstated rows (full candidate authored here, the
// rejected-list entries in the inventories carry only {name, reason}, no
// candidate object — the lead's `why` + `tier` fields are the brief).
const REINSTATED = [
  {
    name: 'Neutral-Grip Dumbbell Bench Press',
    primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'],
    equipment: 'dumbbell', movementPattern: 'push', isCompound: true,
    repMin: 6, repMax: 12, fatigueCost: 3, sfr: 4, subregion: 'flat',
    aliases: [], tier: 'specialist', laterality: 'bilateral', loadCharacter: 'grind',
    difficulty: 1, demandOverrides: {},
  },
  {
    name: 'Landmine Clean',
    primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back', 'traps'],
    equipment: 'landmine', movementPattern: 'power', isCompound: true,
    repMin: 3, repMax: 6, fatigueCost: 4, sfr: 3, subregion: 'hip_extension',
    aliases: [], tier: 'never_auto', laterality: 'unilateral', loadCharacter: 'ballistic',
    difficulty: 3, demandOverrides: { gripDemand: 'bar', overheadPosition: false },
  },
];
for (const c of REINSTATED) collected.push({ candidate: c, source: 'lead-overrides.json (reinstate)' });

// lead-overrides.json triageCorrections: Barbell Thruster accepted as
// specified (fields given directly by the lead ruling); Clean Rack
// Delivery stays out (no action — recorded as an open question only).
const BARBELL_THRUSTER = {
  name: 'Barbell Thruster',
  primaryMuscle: 'quads', secondaryMuscles: ['front_delts', 'glutes', 'triceps'],
  equipment: 'barbell', movementPattern: 'squat', isCompound: true,
  repMin: 5, repMax: 10, fatigueCost: 5, sfr: 3, subregion: 'squat_press',
  aliases: [], tier: 'specialist', laterality: 'bilateral', loadCharacter: 'grind',
  difficulty: 3, demandOverrides: {},
};
collected.push({ candidate: BARBELL_THRUSTER, source: 'lead-overrides.json (triageCorrections: Barbell Thruster)' });

// ── 5. Convert every collected candidate to a corpus entry ──────────────
function clamp15(n) { return Math.max(1, Math.min(5, n)); }

const byFamily = {}; // family -> [entry, ...]
const newNamesByTier = { staple: [], common: [], specialist: [], niche: [], never_auto: [] };
const demandAxisNullReport = [];
const finalNames = new Set(); // for this run's own cross-candidate alias resolution

for (const { candidate: c, source } of collected) {
  const family = FAMILY_BY_EQUIPMENT[c.equipment];
  if (!family) throw new Error(`integrate-inventories: no family for equipment "${c.equipment}" (${c.name}, ${source})`);

  const secondaryMuscles = (c.secondaryMuscles ?? []).map((m) => SECONDARY_MUSCLE_FIX[m] ?? m);

  let subregion = Object.prototype.hasOwnProperty.call(SUBREGION_FIX, c.name) ? SUBREGION_FIX[c.name] : (c.subregion ?? null);

  const overrides = {};

  // exerciseType: EL-22 (carries/sled) + job-4 hold-type fix.
  let repMin = c.repMin;
  let repMax = c.repMax;
  if (isCarryOrSledWork(c)) {
    overrides.exerciseType = 'duration';
    if (repMin == null || repMax == null) {
      const sledWork = c.equipment === 'sled' || SLED_WORK_RE.test(c.name);
      repMin = sledWork ? 15 : 20;
      repMax = sledWork ? 30 : 40;
    }
  } else if (HOLD_DURATION_NAMES.has(c.name)) {
    overrides.exerciseType = 'duration';
  }

  // laterality/difficulty: only overridden where they differ from the
  // pure derivation (07-CORPUS-FORMAT.md section 2: "overrides only where
  // the derivation is wrong or null for that row").
  const derivedLaterality = deriveLaterality(c.name);
  if (c.laterality && c.laterality !== derivedLaterality) overrides.laterality = c.laterality;

  const equipmentCategory = deriveEquipmentCategory(c.name, c.equipment);
  const fatigueCost = clamp15(c.fatigueCost);
  const derivedDifficulty = deriveDifficulty(c.name, equipmentCategory, fatigueCost);
  if (c.difficulty && c.difficulty !== derivedDifficulty) overrides.difficulty = c.difficulty;

  // demand overrides straight from the inventory/triage agent's
  // demandOverrides (job 1: "overrides.demands from demandOverrides"),
  // with DEMAND_AXIS_FIX merged on top for the specific axes job 4
  // requires curating (an explicit null in the source, or an axis the
  // agent left out entirely that the guard cannot grandfather for a new
  // name).
  let demands = c.demandOverrides && Object.keys(c.demandOverrides).length ? { ...c.demandOverrides } : null;
  if (DEMAND_AXIS_FIX[c.name]) demands = { ...(demands ?? {}), ...DEMAND_AXIS_FIX[c.name] };
  if (demands) overrides.demands = demands;
  if (c.derivedNullAxes?.length) {
    for (const axis of c.derivedNullAxes) {
      if (!demands || demands[axis] == null) demandAxisNullReport.push({ name: c.name, axis });
    }
  }

  const tier = capTier(c.tier, c.name, source);
  newNamesByTier[tier].push(c.name);

  const entry = {
    name: c.name,
    primaryMuscle: c.primaryMuscle,
    secondaryMuscles,
    equipment: c.equipment,
    movementPattern: c.movementPattern,
    compound: !!c.isCompound,
    repMin, repMax,
    fatigueCost, sfr: clamp15(c.sfr),
    subregion,
    aliases: dedupeAliases(c.name, (c.aliases ?? []).filter((a) => !(ALIAS_DROP[c.name] ?? []).includes(a))),
    loadCharacter: c.loadCharacter ?? 'grind',
    overrides: Object.keys(overrides).length ? overrides : undefined,
    cue: '',
  };

  (byFamily[family] ??= []).push(entry);
  finalNames.add(entry.name);
}

function dedupeAliases(ownName, aliases) {
  const seen = new Set([ownName.toLowerCase().trim()]);
  const out = [];
  for (const a of aliases) {
    const key = a.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

// Fold the dropped bare-name Oly duplicates in as aliases of their
// survivor (which must be one of the entries just built above).
for (const [bareName, survivorName] of Object.entries(FOLD_AS_ALIAS_OF)) {
  let found = false;
  for (const list of Object.values(byFamily)) {
    const e = list.find((x) => x.name === survivorName);
    if (e) { e.aliases = dedupeAliases(e.name, [...e.aliases, bareName]); found = true; break; }
  }
  if (!found) throw new Error(`integrate-inventories: FOLD_AS_ALIAS_OF survivor "${survivorName}" not found among new entries`);
}

// ── 6. Alias-only additions to EXISTING corpus rows ─────────────────────
// Merges: every inventory's aliasesForExisting + lead-overrides.json's
// aliasesForExisting + lead-overrides.json triageCorrections' Tire Flip +
// every gap-triage 'alias'/'false_positive' verdict's {name -> target}.
const existingRowAliases = new Map(); // canonical name -> Set(aliases)
function addExistingAlias(targetName, alias) {
  if (!targetName || !alias) return;
  const key = targetName.trim();
  if (!existingRowAliases.has(key)) existingRowAliases.set(key, new Set());
  existingRowAliases.get(key).add(alias.trim());
}

for (const { data } of inventories) {
  for (const { existing, aliases } of data.aliasesForExisting ?? []) {
    for (const a of aliases) addExistingAlias(existing, a);
  }
}
for (const { existing, aliases } of leadOverrides.aliasesForExisting ?? []) {
  for (const a of aliases) addExistingAlias(existing, a);
}
// triageCorrections: Tyre Flip -> alias "Tire Flip" (US spelling defeated
// the dataset screen; the corpus already carries "Tyre Flip").
addExistingAlias('Tyre Flip', 'Tire Flip');

// Targets that are neither an existing corpus name NOR one of this run's
// new candidate names (the gap-triage agent grouped several dataset-name
// variants under a target it assumed already existed, but never itself
// added as a candidate or aliasesForExisting entry). Resolved here to the
// real nearest existing row so their alias cluster lands somewhere real,
// each documented with why (see final report "open questions").
const DANGLING_TARGET_RESOLUTION = {
  'Lying Triceps Extension': 'Lying Tricep Extension', // US/UK spelling of the same existing row
  'One-Arm Dumbbell Bench Press': 'Dumbbell Bench Press', // no separately-named unilateral row exists
  'One-Arm Dumbbell Fly': 'Dumbbell Fly',
  'Two-Arm Bent-Over Dumbbell Row': 'Dumbbell Row', // already an aliasesForExisting target for this row
  'Standing Dumbbell Woodchop': 'Cable Woodchop', // no dumbbell woodchop candidate exists anywhere in the sources; folded to the nearest staple woodchop entry
  'Rope Pushdown': 'Tricep Pushdown (Rope)', // retired EL-21 name; its survivor already carries this exact alias
};

const resolvableNames = new Set([...corpusByNameLower.keys(), ...[...finalNames].map((n) => n.toLowerCase().trim())]);
function resolveTarget(target) {
  if (DANGLING_TARGET_RESOLUTION[target]) return DANGLING_TARGET_RESOLUTION[target];
  return target;
}

const unresolvedAliasTargets = [];
for (const { file, data } of gapTriages) {
  for (const v of data.verdicts ?? []) {
    if (v.verdict !== 'alias' && v.verdict !== 'false_positive') continue;
    const target = resolveTarget(v.target);
    if (!resolvableNames.has(target.toLowerCase().trim())) {
      unresolvedAliasTargets.push({ file, name: v.name, target: v.target });
      continue;
    }
    addExistingAlias(target, v.name);
  }
}

// General alias-collision guard (rule 2, job 4): an aliasesForExisting or
// gap-triage alias/false_positive proposal occasionally names a string
// that is ITSELF a distinct canonical row (existing or new) rather than a
// synonym of its stated target — e.g. inventory-cable.json proposes
// "Underhand Lat Pulldown" as an alias of "Cable Reverse-Grip Pulldown",
// but "Underhand Lat Pulldown" is its own existing EL-15 row; the
// proposal is a mismatch, not a real synonym. Every such alias is dropped
// (never added anywhere) and logged, rather than silently colliding.
const allCanonicalNameFor = new Map();
for (const [lower, e] of corpusByNameLower) allCanonicalNameFor.set(lower, e.name);
for (const name of finalNames) allCanonicalNameFor.set(name.toLowerCase().trim(), name);
const droppedAliasCollisions = [];
for (const [target, aliases] of existingRowAliases) {
  for (const alias of [...aliases]) {
    const canonicalOwner = allCanonicalNameFor.get(alias.toLowerCase().trim());
    if (canonicalOwner && canonicalOwner !== target) {
      aliases.delete(alias);
      droppedAliasCollisions.push({ alias, proposedTarget: target, actualCanonicalOwner: canonicalOwner });
    }
  }
}

// Split existingRowAliases into: aliases for rows that ARE one of this
// run's new entries (attach directly, no file patch needed) vs aliases
// for rows that are genuinely pre-existing (need a source patch below).
const newAliasesByTarget = new Map(); // new-entry name -> Set(alias)
const preExistingAliasesByTarget = new Map(); // existing corpus name -> Set(alias)
for (const [target, aliases] of existingRowAliases) {
  if (finalNames.has(target)) newAliasesByTarget.set(target, aliases);
  else preExistingAliasesByTarget.set(target, aliases);
}
// Fold alias-only additions for THIS RUN's own new entries into their
// entry objects (before serialization).
for (const [target, aliases] of newAliasesByTarget) {
  for (const list of Object.values(byFamily)) {
    const e = list.find((x) => x.name === target);
    if (e) { e.aliases = dedupeAliases(e.name, [...e.aliases, ...aliases]); break; }
  }
}

// ── 7. Serialization (matches convert-legacy.mjs's serializeEntry) ─────
function serializeEntry(e) {
  const lines = ['  {'];
  lines.push(`    name: ${JSON.stringify(e.name)},`);
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

const MARKER_START = '  // ── INTEGRATION STAGE 2 (exercise-library-expansion-2026-09-05) — generated by scripts/exercise-library/integrate-inventories.mjs; rerun the script to regenerate, do not hand-edit below this line ──';
const MARKER_END = '  // ── END INTEGRATION STAGE 2 ──';

function writeGeneratedBlock(family, entries) {
  const filePath = join(FAMILIES_DIR, `${family}.js`);
  let src = readFileSync(filePath, 'utf8');
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const block = sorted.length ? `${MARKER_START}\n${sorted.map(serializeEntry).join('\n')}\n${MARKER_END}\n` : '';

  const startIdx = src.indexOf(MARKER_START);
  if (startIdx !== -1) {
    const endIdx = src.indexOf(MARKER_END);
    const afterEnd = src.indexOf('\n', endIdx) + 1;
    src = src.slice(0, startIdx) + block + src.slice(afterEnd);
  } else {
    const closeIdx = src.lastIndexOf('\n];');
    if (closeIdx === -1) throw new Error(`integrate-inventories: could not find closing "];" in ${family}.js`);
    src = src.slice(0, closeIdx + 1) + block + src.slice(closeIdx + 1);
  }
  writeFileSync(filePath, src);
  return sorted.length;
}

const writtenCounts = {};
for (const [family, entries] of Object.entries(byFamily)) {
  writtenCounts[family] = writeGeneratedBlock(family, entries);
}
// Families with zero new entries this run still need their marker cleared
// if a previous run left one (idempotency for a family that later loses
// all its candidates) — not needed today (every touched family has at
// least one new entry) but guarded for a future rerun with a trimmed
// source file.
for (const family of Object.keys(FAMILY_BY_EQUIPMENT).map((k) => FAMILY_BY_EQUIPMENT[k])) {
  if (!(family in writtenCounts)) {
    const filePath = join(FAMILIES_DIR, `${family}.js`);
    if (existsSync(filePath)) {
      const src = readFileSync(filePath, 'utf8');
      if (src.includes(MARKER_START)) writtenCounts[family] = writeGeneratedBlock(family, []);
    }
  }
}

// ── 8. Patch pre-existing entries (alias additions + EL-22 conversion) ──
// Locates the exact `{ name: "<Name>", ... },` block for a NAMED existing
// entry and rewrites only that block, leaving every other entry in the
// file byte-identical. Safe because every entry's overrides object is a
// single-line JSON.stringify with no embedded "\n  }," substring.
function patchNamedEntry(filePath, name, mutate) {
  let src = readFileSync(filePath, 'utf8');
  const needle = `    name: ${JSON.stringify(name)},`;
  const nameIdx = src.indexOf(needle);
  if (nameIdx === -1) throw new Error(`integrate-inventories: could not find entry "${name}" in ${filePath}`);
  const blockStart = src.lastIndexOf('  {', nameIdx);
  const blockEnd = src.indexOf('\n  },', nameIdx) + '\n  },'.length;
  const block = src.slice(blockStart, blockEnd);

  // Parse the existing block's fields with a tiny targeted extractor
  // (no general JS parser needed: the shape is fixed by serializeEntry).
  const aliasesMatch = block.match(/aliases: (\[.*?\]),/);
  const overridesMatch = block.match(/overrides: (\{.*?\}),/);

  const parsed = {
    name,
    aliases: aliasesMatch ? JSON.parse(aliasesMatch[1]) : [],
    overrides: overridesMatch ? JSON.parse(overridesMatch[1]) : {},
  };

  const mutated = mutate({ ...parsed });
  let newBlock = block;
  if (mutated.aliases) {
    const aliasesJson = JSON.stringify(mutated.aliases);
    if (aliasesMatch) {
      newBlock = newBlock.replace(/aliases: \[.*?\],/, `aliases: ${aliasesJson},`);
    } else {
      // Insert an aliases line right after the subregion line (matches
      // serializeEntry's field order).
      newBlock = newBlock.replace(/(subregion: .+?,\n)/, `$1    aliases: ${aliasesJson},\n`);
    }
  }
  if (mutated.overridesReplace) {
    const overridesJson = JSON.stringify(mutated.overridesReplace);
    if (overridesMatch) {
      newBlock = newBlock.replace(/overrides: \{.*?\},/, `overrides: ${overridesJson},`);
    } else {
      newBlock = newBlock.replace(/(loadCharacter: .+?,\n)/, `$1    overrides: ${overridesJson},\n`);
    }
  }
  if (mutated.repRange) {
    newBlock = newBlock.replace(/repMin: \d+, repMax: \d+,/, `repMin: ${mutated.repRange[0]}, repMax: ${mutated.repRange[1]},`);
  }

  src = src.slice(0, blockStart) + newBlock + src.slice(blockEnd);
  writeFileSync(filePath, src);
}

const patchLog = [];

// 8a. Alias-only patches on genuinely pre-existing rows.
for (const [target, aliases] of preExistingAliasesByTarget) {
  const existing = corpusByNameLower.get(target.toLowerCase().trim());
  if (!existing) throw new Error(`integrate-inventories: alias target "${target}" resolved to neither an existing row nor a new entry`);
  const canonicalName = existing.name;
  const family = FAMILY_BY_EQUIPMENT[existing.equipment] ?? 'machine';
  const filePath = join(FAMILIES_DIR, `${family}.js`);
  patchNamedEntry(filePath, canonicalName, (parsed) => {
    const merged = dedupeAliases(canonicalName, [...parsed.aliases, ...aliases]);
    return { aliases: merged };
  });
  patchLog.push({ file: `${family}.js`, name: canonicalName, added: [...aliases] });
}

// 8b. EL-22: existing carry/sled rows converted to duration, seconds
// defaults. These are the pre-existing format-migration rows the audit's
// carryTaggedWeightReps (7) and the Sled Push/Sled Pull/Prowler Drag
// 'distance' rows named explicitly.
const EXISTING_EL22_FIXES = [
  { name: 'Pinch Grip Carry', file: 'barbell.js', repRange: [20, 40] },
  { name: 'Farmer Walk (Forearms)', file: 'dumbbell.js', repRange: [20, 40] },
  { name: "Farmer's Walk", file: 'dumbbell.js', repRange: [20, 40] },
  { name: 'Gripper Walks', file: 'dumbbell.js', repRange: [20, 40] },
  { name: 'Keg Carry', file: 'dumbbell.js', repRange: [20, 40] },
  { name: 'Single-Arm Farmer Carry', file: 'dumbbell.js', repRange: [20, 40] },
  { name: 'Suitcase Carry', file: 'dumbbell.js', repRange: [20, 40] },
  { name: 'Sled Push', file: 'machine.js', repRange: [15, 30] },
  { name: 'Sled Pull', file: 'machine.js', repRange: [15, 30] },
  { name: 'Prowler Drag', file: 'machine.js', repRange: [15, 30] },
];
for (const { name, file, repRange } of EXISTING_EL22_FIXES) {
  const filePath = join(FAMILIES_DIR, file);
  patchNamedEntry(filePath, name, (parsed) => ({
    overridesReplace: { ...parsed.overrides, exerciseType: 'duration' },
    repRange,
  }));
  patchLog.push({ file, name, elAndTwentyTwo: true, repRange });
}

// ── 9. Report ────────────────────────────────────────────────────────────
const totalNew = Object.values(writtenCounts).reduce((a, b) => a + b, 0);
console.log(`integrate-inventories: ${totalNew} new corpus entries written across ${Object.keys(writtenCounts).length} families.`);
for (const [family, count] of Object.entries(writtenCounts).sort()) {
  console.log(`  ${family}: +${count}`);
}
console.log(`dropped as duplicates: ${droppedDuplicates.length}`);
for (const d of droppedDuplicates) console.log(`  - "${d.name}" (${d.reason})${d.alias ? ` -> alias of "${d.alias}"` : ''}`);
console.log(`pre-existing rows patched (aliases): ${preExistingAliasesByTarget.size}`);
console.log(`pre-existing rows patched (EL-22 duration): ${EXISTING_EL22_FIXES.length}`);
console.log(`tier distribution (new entries): ${JSON.stringify(Object.fromEntries(Object.entries(newNamesByTier).map(([k, v]) => [k, v.length])))}`);
console.log(`STAPLE/COMMON proposals capped to SPECIALIST pending lead review: ${newCandidateTierProposals.length}`);
console.log(`unresolved alias targets (skipped): ${unresolvedAliasTargets.length}`);
for (const u of unresolvedAliasTargets) console.log(`  - "${u.name}" -> "${u.target}" (${u.file})`);
console.log(`alias collisions dropped (proposed alias is itself a distinct canonical row): ${droppedAliasCollisions.length}`);
for (const d of droppedAliasCollisions) console.log(`  - "${d.alias}" proposed as alias of "${d.proposedTarget}", but is itself the canonical name "${d.actualCanonicalOwner}"`);

// Write the lead-review artefact for the demoted STAPLE/COMMON proposals,
// mirroring the existing tier-proposals.json shape.
writeFileSync(
  join(DATA, 'new-candidate-tier-proposals.json'),
  JSON.stringify({
    note: 'EL-5: STAPLE/COMMON tier proposals found among this stage\'s new candidates (inventory-*.json / gap-triage-*.json). Every one of these ships as SPECIALIST in canonicality.js pending lead review, exactly like the existing tier-proposals.json precedent for the pre-existing 88 unlisted rows. Promoting any of these to STAPLE/COMMON is a lead decision, never made here.',
    count: newCandidateTierProposals.length,
    proposals: newCandidateTierProposals,
  }, null, 2) + '\n',
);

// Write the new-entry tier lists to a small JSON artefact for the
// canonicality.js registry edit (job 2) to consume directly, so the
// registry lists are generated from the same source of truth rather than
// re-derived by hand.
writeFileSync(
  join(DATA, 'new-candidate-tier-lists.json'),
  JSON.stringify(newNamesByTier, null, 2) + '\n',
);

writeFileSync(
  join(DATA, 'demand-axis-null-report.json'),
  JSON.stringify({ count: demandAxisNullReport.length, entries: demandAxisNullReport }, null, 2) + '\n',
);
