#!/usr/bin/env node
/**
 * scripts/exercise-library/validate-corpus.mjs
 *
 * The corpus quality gate (EL-3, EL-14, 07-CORPUS-FORMAT.md section 6).
 * Deterministic, read-only, exits non-zero on any rule violation. Wired
 * into `npm run release:audit` (scripts/release-audit-report.cjs) and
 * mirrored as a Jest suite
 * (src/lib/exerciseCorpus/__tests__/corpus.guard.test.js) so a violation
 * is caught in both CI paths.
 *
 * Rules (fail the build on any):
 *  1. Duplicate canonical names (case-insensitive, normalised).
 *  2. An alias equal to a canonical name, or claimed by more than one row.
 *  3. Any field value outside the closed vocab (vocab.js).
 *  4. Null subregion on a muscle with an enforced subregion requirement.
 *  5. A secondary muscle equal to the row's own primary muscle.
 *  6. Inverted (min > max) or absurd (outside 1-30, rep-based rows only)
 *     rep ranges.
 *  7. fatigueCost / sfr outside 1-5.
 *  8. A corpus name absent from the tier registry (every STAPLE/COMMON/
 *     NICHE/NEVER_AUTO/SPECIALIST list plus CONTESTED).
 *  9. Any demand axis null after derivation+overrides, unless the entry
 *     declares `unknownAxes: [{ axis, reason }]`.
 * 10. Instruction contract (D151, src/lib/exerciseCorpus/
 *     instructionContract.js): every live row carries `setup` and
 *     `execution` (25-160 chars, at most two sentences each) and an
 *     optional one-sentence `watch` (20-120 chars, never a formulaic
 *     "is the common fault" tail); every field British English, no em or
 *     en dash, no exclamation or question mark, sentence-final full stop,
 *     no banned safety/medical-adjacent words, no filler phrases, no set
 *     or rep counts; no legacy `cue` literal on any entry.
 * 11. Every name referenced by CURATED_DEMANDS, ADAPTED_SETUP,
 *     MACHINE_TYPE_BY_NAME, FAMILY_LISTS, the tier registry and the
 *     library plans exists in the corpus (live or retired).
 * 12. Corpus count (live rows) never below data/corpus-floor.json's floor.
 * 13. No orphan exercise name in a seed routine (LIBRARY_PLANS) that is
 *     neither a live corpus name nor a retired name with a survivor.
 * 14. Style pools (EL-8): every STYLE_POOLS name resolves live, and no pool
 *     carries a NEVER_AUTO row outside the declared kettlebell exceptions.
 * 15. Normalised-name collisions (EL-25): two LIVE entries whose names fold
 *     to the same case/punctuation/bracket/hyphen/DB-BB-KB-abbreviation/
 *     word-order-insensitive key are the same exercise named twice. Retired
 *     entries and aliases are exempt (an alias legitimately folding to a
 *     canonical name elsewhere is the point of aliases). The high-to-low /
 *     low-to-high direction phrase is folded as one atomic token so a
 *     direction pair (a genuinely distinct exercise) never collides.
 * 16. Version-suffix aliases (F-09, final-certification-2026-09-05): no
 *     alias may carry a "v. 2" / "v2" style variant number. Those are
 *     artefacts of an unreviewed bulk alias import ("dumbbell lying one
 *     arm press v. 2"), never a name a person types, and they sat beside
 *     aliases that named a different exercise entirely. The companion
 *     half of that ruling -- an alias identical to another row's
 *     canonical name -- is already rule 2 above and is not duplicated
 *     here.
 *
 * Run: node scripts/exercise-library/validate-corpus.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const { CORPUS, CORPUS_BY_NAME, RETIRED_ENTRIES, corpusEntryToSeedRow } =
  await import(join(ROOT, 'src/lib/exerciseCorpus/index.js'));
const {
  MUSCLES, EQUIPMENT, MOVEMENT_PATTERNS, LATERALITY, LOAD_CHARACTER,
  EXERCISE_TYPES, SUBREGIONS_BY_MUSCLE, MUSCLES_REQUIRING_SUBREGION, DEMAND_FIELDS,
} = await import(join(ROOT, 'src/lib/exerciseCorpus/vocab.js'));
const { validateInstructions } = await import(join(ROOT, 'src/lib/exerciseCorpus/instructionContract.js'));
const { CURATED_DEMANDS } = await import(join(ROOT, 'src/lib/capability/demands.js'));
const { ADAPTED_SETUP } = await import(join(ROOT, 'src/lib/exercise/adaptedSetup.js'));
const { MACHINE_TYPE_BY_NAME } = await import(join(ROOT, 'src/lib/exerciseMetadata.js'));
const { FAMILY_LISTS } = await import(join(ROOT, 'src/lib/exercise/movementFamily.js'));
const { REGISTRY_LISTS, CONTESTED } = await import(join(ROOT, 'src/lib/exercise/canonicality.js'));

// seedRoutines.js imports AsyncStorage/database.js at module scope (like
// seedExercises.js before it — see loadSeed.mjs's header), so it cannot be
// ES-imported under plain Node. LIBRARY_PLANS is a plain object/array
// literal with no imports of its own, so its source text is extracted and
// evaluated in isolation, the same one-time-parse approach this campaign's
// loader scripts already use for the pre-corpus RAW tuple.
function loadLibraryPlans() {
  const src = readFileSync(join(ROOT, 'src/lib/seedRoutines.js'), 'utf8');
  const marker = 'export const LIBRARY_PLANS = [';
  const start = src.indexOf(marker);
  const end = src.indexOf('\n];', start);
  if (start === -1 || end === -1) throw new Error('validate-corpus: could not locate LIBRARY_PLANS in seedRoutines.js');
  const literal = src.slice(start + marker.length - 1, end + 2);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${literal});`)();
}
const LIBRARY_PLANS = loadLibraryPlans();

const errors = [];
const fail = (msg) => errors.push(msg);

// Every name this build considers "resolvable": live corpus rows plus
// retired names (their canonical id and tier stay meaningful).
const knownNames = new Set([...CORPUS.map((e) => e.name), ...RETIRED_ENTRIES.map((e) => e.name)]);

// Fold a name to a case/punctuation/bracket/hyphen/abbreviation/word-order
// insensitive key (EL-25). The high-to-low / low-to-high direction phrase
// is collapsed to one atomic token FIRST so that swapping its two words
// never produces the same token bag as the other direction (those pairs
// are genuinely distinct exercises and must stay distinct, EL-25).
const NAME_ABBREVIATIONS = { db: 'dumbbell', bb: 'barbell', kb: 'kettlebell' };
function foldExerciseName(name) {
  const normalised = name
    .toLowerCase()
    .replace(/high[\s-]*to[\s-]*low/g, ' dirhightolow ')
    .replace(/low[\s-]*to[\s-]*high/g, ' dirlowtohigh ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const tokens = normalised
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => NAME_ABBREVIATIONS[t] ?? t)
    .sort();
  return tokens.join(' ');
}

// ── 1. Duplicate canonical names (case-insensitive) ────────────────────────
{
  const seen = new Map();
  for (const e of CORPUS) {
    const key = e.name.toLowerCase().trim();
    if (seen.has(key)) fail(`duplicate canonical name (case-insensitive): "${e.name}" / "${seen.get(key)}"`);
    else seen.set(key, e.name);
  }
}

// ── 2. Alias collisions ─────────────────────────────────────────────────────
{
  const canonicalLower = new Map(CORPUS.map((e) => [e.name.toLowerCase().trim(), e.name]));
  const aliasOwner = new Map();
  for (const e of CORPUS) {
    for (const alias of e.aliases ?? []) {
      const key = alias.toLowerCase().trim();
      if (canonicalLower.has(key)) fail(`alias "${alias}" (on "${e.name}") collides with canonical name "${canonicalLower.get(key)}"`);
      if (aliasOwner.has(key) && aliasOwner.get(key) !== e.name) {
        fail(`alias "${alias}" claimed by two rows: "${aliasOwner.get(key)}" and "${e.name}"`);
      }
      aliasOwner.set(key, e.name);
    }
  }
}

// ── 3, 4, 5, 6, 7: per-row field checks ────────────────────────────────────
const MOVEMENT_PATTERN_SET = new Set(MOVEMENT_PATTERNS);
const EQUIPMENT_SET = new Set(EQUIPMENT);
const MUSCLE_SET = new Set(MUSCLES);
const LATERALITY_SET = new Set(LATERALITY);
const LOAD_CHARACTER_SET = new Set(LOAD_CHARACTER);
const EXERCISE_TYPE_SET = new Set(EXERCISE_TYPES);

const baselineNames = new Set(
  JSON.parse(readFileSync(join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data/corpus-baseline-names.json'), 'utf8')).names,
);

let nullAxisCount = 0;
for (const entry of CORPUS) {
  const row = corpusEntryToSeedRow(entry);
  const ctx = `"${entry.name}"`;

  if (!EQUIPMENT_SET.has(entry.equipment)) fail(`${ctx}: equipment "${entry.equipment}" outside vocab`);
  if (!MOVEMENT_PATTERN_SET.has(entry.movementPattern)) fail(`${ctx}: movementPattern "${entry.movementPattern}" outside vocab`);
  if (!MUSCLE_SET.has(entry.primaryMuscle)) fail(`${ctx}: primaryMuscle "${entry.primaryMuscle}" outside vocab`);
  for (const m of entry.secondaryMuscles ?? []) {
    if (!MUSCLE_SET.has(m)) fail(`${ctx}: secondaryMuscle "${m}" outside vocab`);
  }
  if (row.laterality != null && !LATERALITY_SET.has(row.laterality)) fail(`${ctx}: laterality "${row.laterality}" outside vocab`);
  if (!LOAD_CHARACTER_SET.has(row.loadCharacter)) fail(`${ctx}: loadCharacter "${row.loadCharacter}" outside vocab`);
  if (!EXERCISE_TYPE_SET.has(row.exerciseType)) fail(`${ctx}: exerciseType "${row.exerciseType}" outside vocab`);

  const subregionVocab = SUBREGIONS_BY_MUSCLE[entry.primaryMuscle];
  if (entry.subregion != null && subregionVocab && !subregionVocab.includes(entry.subregion)) {
    fail(`${ctx}: subregion "${entry.subregion}" outside vocab for muscle "${entry.primaryMuscle}"`);
  }
  if (entry.subregion == null && MUSCLES_REQUIRING_SUBREGION.includes(entry.primaryMuscle)) {
    fail(`${ctx}: null subregion on "${entry.primaryMuscle}", which has an enforced subregion requirement`);
  }

  if ((entry.secondaryMuscles ?? []).includes(entry.primaryMuscle)) {
    fail(`${ctx}: secondaryMuscles contains the primary muscle "${entry.primaryMuscle}"`);
  }

  if (entry.repMin > entry.repMax) fail(`${ctx}: inverted rep range ${entry.repMin}-${entry.repMax}`);
  const isRepBased = row.exerciseType !== 'duration' && entry.movementPattern !== 'carry';
  if (isRepBased && (entry.repMin < 1 || entry.repMin > 30 || entry.repMax < 1 || entry.repMax > 30)) {
    fail(`${ctx}: rep range ${entry.repMin}-${entry.repMax} outside a plausible 1-30 range for exerciseType "${row.exerciseType}"`);
  }

  if (entry.fatigueCost < 1 || entry.fatigueCost > 5) fail(`${ctx}: fatigueCost ${entry.fatigueCost} outside 1-5`);
  if (entry.sfr < 1 || entry.sfr > 5) fail(`${ctx}: sfr ${entry.sfr} outside 1-5`);

  // ── 9. Demand axes: null only with an explicit unknownAxes reason ───────
  // Grandfathered (report, don't fail) for every name already live at the
  // EL-14 format-migration landing — see corpus-floor.json
  // demandAxesRequireReason for why. A name NOT in that baseline (added by
  // a later expansion stage) is held to the full rule immediately.
  for (const axis of DEMAND_FIELDS) {
    if (row[axis] == null) {
      const declared = (entry.unknownAxes ?? []).find((u) => u.axis === axis);
      if (!declared || !declared.reason) {
        nullAxisCount++;
        if (demandAxesRequireReason() || !baselineNames.has(entry.name)) {
          fail(`${ctx}: demand axis "${axis}" is null with no unknownAxes reason declared`);
        }
      }
    }
  }

  // ── 10. Instruction contract (D151) ─────────────────────────────────────
  // The rule itself lives in instructionContract.js so this script, the
  // Jest mirror and the corpus index agree by construction. Every live
  // row must carry setup and execution; corpus-floor.json's cuesRequired
  // flag is honoured as the "instructions required" switch it has become.
  if (cuesRequired() || entry.setup !== undefined || entry.execution !== undefined || entry.cue !== undefined) {
    for (const v of validateInstructions(entry, ctx)) fail(v);
  }
}

function cuesRequired() {
  try {
    const floor = JSON.parse(readFileSync(join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data/corpus-floor.json'), 'utf8'));
    return floor.cuesRequired === true;
  } catch {
    return false; // fail closed to "not required" only if the floor file is missing entirely
  }
}

function demandAxesRequireReason() {
  try {
    const floor = JSON.parse(readFileSync(join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data/corpus-floor.json'), 'utf8'));
    return floor.demandAxesRequireReason === true;
  } catch {
    return false;
  }
}

// ── 8. Tier registry completeness ──────────────────────────────────────────
{
  const registryNames = new Set([
    ...REGISTRY_LISTS.STAPLE, ...REGISTRY_LISTS.COMMON, ...REGISTRY_LISTS.NICHE,
    ...REGISTRY_LISTS.NEVER_AUTO, ...REGISTRY_LISTS.SPECIALIST,
    ...CONTESTED.map((c) => c.name),
  ]);
  for (const e of CORPUS) {
    if (!registryNames.has(e.name)) fail(`"${e.name}" is not in any canonicality.js registry list (STAPLE/COMMON/NICHE/NEVER_AUTO/SPECIALIST/CONTESTED)`);
  }
}

// ── 11. Every curated-table / plan name exists in the corpus ───────────────
function requireKnown(names, source) {
  for (const name of names) {
    if (!knownNames.has(name)) fail(`${source} references "${name}", which is not in the corpus (live or retired)`);
  }
}
requireKnown(Object.keys(CURATED_DEMANDS), 'CURATED_DEMANDS');
requireKnown(Object.keys(ADAPTED_SETUP), 'ADAPTED_SETUP');
requireKnown(Object.keys(MACHINE_TYPE_BY_NAME), 'MACHINE_TYPE_BY_NAME');
for (const [listName, names] of Object.entries(FAMILY_LISTS)) requireKnown(names, `FAMILY_LISTS.${listName}`);
requireKnown([
  ...REGISTRY_LISTS.STAPLE, ...REGISTRY_LISTS.COMMON, ...REGISTRY_LISTS.NICHE,
  ...REGISTRY_LISTS.NEVER_AUTO, ...REGISTRY_LISTS.SPECIALIST,
], 'canonicality.js registry lists');
requireKnown(CONTESTED.map((c) => c.name), 'canonicality.js CONTESTED');

// ── 13. No orphan exercise name in a library plan ──────────────────────────
{
  const planNames = new Set();
  for (const plan of LIBRARY_PLANS ?? []) {
    for (const workout of plan.workouts ?? []) {
      for (const ex of workout.exercises ?? []) planNames.add(ex.name);
    }
  }
  requireKnown([...planNames], 'seedRoutines.js LIBRARY_PLANS');
}

// ── 12. Corpus count floor ──────────────────────────────────────────────────
{
  const floorPath = join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data/corpus-floor.json');
  const floor = JSON.parse(readFileSync(floorPath, 'utf8'));
  if (CORPUS.length < floor.floor) {
    fail(`corpus count ${CORPUS.length} is below the committed floor ${floor.floor} (data/corpus-floor.json)`);
  }
}

// ── 14. Style pools (EL-8, 09-STYLE-PLANS.md section 1) ────────────────────
// Every hand-curated pool name must resolve in the live corpus, and no
// pool may carry a NEVER_AUTO row outside the closed kettlebell-ballistics
// exception list stylePools.js itself declares.
{
  const {
    STYLE_POOLS, KETTLEBELL_NEVER_AUTO_EXCEPTIONS,
  } = await import(join(ROOT, 'src/lib/exercise/stylePools.js'));
  const exceptionSet = new Set(KETTLEBELL_NEVER_AUTO_EXCEPTIONS);
  const neverAutoSet = new Set(REGISTRY_LISTS.NEVER_AUTO);
  for (const [poolKey, names] of Object.entries(STYLE_POOLS)) {
    for (const name of names) {
      const entry = CORPUS_BY_NAME.get(name);
      if (!entry || entry.retiredInto) {
        fail(`stylePools.js "${poolKey}" references "${name}", which is not a live corpus name`);
      }
      if (neverAutoSet.has(name) && !exceptionSet.has(name)) {
        fail(`stylePools.js "${poolKey}" contains NEVER_AUTO row "${name}", which is not in KETTLEBELL_NEVER_AUTO_EXCEPTIONS`);
      }
    }
  }
}

// ── 15. Normalised-name collisions (EL-25) ─────────────────────────────────
// Two LIVE entries folding to the same key are the same exercise named
// twice (case/punctuation/brackets/hyphens/DB-BB-KB abbreviations/word
// order all folded away). Retired entries and aliases are exempt.
{
  const byFoldedKey = new Map();
  for (const e of CORPUS) {
    const key = foldExerciseName(e.name);
    if (!byFoldedKey.has(key)) byFoldedKey.set(key, []);
    byFoldedKey.get(key).push(e.name);
  }
  for (const names of byFoldedKey.values()) {
    if (names.length > 1) {
      fail(`normalised-name collision (EL-25): ${names.map((n) => `"${n}"`).join(' / ')}`);
    }
  }
}

// ── 16. Version-suffix aliases (F-09) ──────────────────────────────────────
// "... v. 2" / "... v2" is a bulk-import artefact, not an alternative
// name anyone searches for. Banned outright so the next alias import
// cannot reintroduce the class.
{
  const VERSION_SUFFIX = /\bv\.?\s?\d\b/i;
  for (const e of CORPUS) {
    for (const alias of e.aliases ?? []) {
      if (VERSION_SUFFIX.test(alias)) {
        fail(`alias "${alias}" (on "${e.name}") carries a version suffix; that is an import artefact, not a searchable name`);
      }
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`validate-corpus: ${errors.length} violation(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exitCode = 1;
} else {
  console.log(`validate-corpus: OK — ${CORPUS.length} live rows, ${RETIRED_ENTRIES.length} retired, 0 violations (${nullAxisCount} grandfathered null-axis instances not yet annotated with unknownAxes; see corpus-floor.json demandAxesRequireReason).`);
}
