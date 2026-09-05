/**
 * corpus.guard.test.js — Jest mirror of scripts/exercise-library/
 * validate-corpus.mjs (EL-14, 07-CORPUS-FORMAT.md section 6).
 *
 * What this suite pins and why: the corpus quality gate must be reachable
 * from `npm test`, not only from the release-audit script, so a PR that
 * breaks a rule fails locally and in the normal test run, not only in the
 * separate release:audit path. Every check here matches
 * validate-corpus.mjs's numbered rule list; if one drifts from the other,
 * fix both — they are meant to agree exactly.
 */
const fs = require('fs');
const path = require('path');
const {
  CORPUS, RETIRED_ENTRIES, corpusEntryToSeedRow,
} = require('../index');
const {
  MUSCLES, EQUIPMENT, MOVEMENT_PATTERNS, LATERALITY, LOAD_CHARACTER,
  EXERCISE_TYPES, SUBREGIONS_BY_MUSCLE, MUSCLES_REQUIRING_SUBREGION, DEMAND_FIELDS,
} = require('../vocab');
const { CURATED_DEMANDS } = require('../../capability/demands');
const { ADAPTED_SETUP } = require('../../exercise/adaptedSetup');
const { MACHINE_TYPE_BY_NAME } = require('../../exerciseMetadata');
const { FAMILY_LISTS } = require('../../exercise/movementFamily');
const { REGISTRY_LISTS, CONTESTED } = require('../../exercise/canonicality');

const CAMPAIGN_DATA_DIR = path.join(__dirname, '../../../../docs/exercise-library-expansion-2026-09-05/data');
const corpusFloor = JSON.parse(fs.readFileSync(path.join(CAMPAIGN_DATA_DIR, 'corpus-floor.json'), 'utf8'));
const baselineNames = new Set(
  JSON.parse(fs.readFileSync(path.join(CAMPAIGN_DATA_DIR, 'corpus-baseline-names.json'), 'utf8')).names,
);

const knownNames = new Set([...CORPUS.map((e) => e.name), ...RETIRED_ENTRIES.map((e) => e.name)]);
const MOVEMENT_PATTERN_SET = new Set(MOVEMENT_PATTERNS);
const EQUIPMENT_SET = new Set(EQUIPMENT);
const MUSCLE_SET = new Set(MUSCLES);
const LATERALITY_SET = new Set(LATERALITY);
const LOAD_CHARACTER_SET = new Set(LOAD_CHARACTER);
const EXERCISE_TYPE_SET = new Set(EXERCISE_TYPES);
// Kept in exact sync with validate-corpus.mjs's CUE_BANNED_WORDS /
// AMERICAN_SPELLINGS (exercise-library-expansion-2026-09-05 integration
// job 4) — word-boundary matched, not substring, so "safety pins" does not
// trip "safe".
const BANNED_CUE_WORDS = [
  'safe', 'safely', 'injury', 'injure', 'rehab', 'arthritis', 'pain',
  'doctor', 'physio', 'therapy', 'medical', 'condition', 'hurt',
];
const AMERICAN_SPELLINGS = [
  'color', 'favorite', 'favorable', 'center', 'centered',
  'fiber', 'gray', 'defense', 'offense', 'behavior', 'neighbor', 'honor',
  'armor', 'vapor', 'rumor', 'humor', 'odor', 'vigor', 'labor', 'flavor',
  'theater', 'liter', 'jewelry', 'skeptic', 'traveled', 'traveling',
  'canceled', 'canceling', 'modeling', 'signaling', 'leveled', 'fueled',
  'organize', 'organized', 'organizing', 'stabilize', 'stabilized',
  'stabilizing', 'maximize', 'maximizing', 'minimize', 'minimizing',
  'utilize', 'utilizing', 'realize', 'specialize', 'analyze', 'analyzing',
  'recognize', 'summarize', 'emphasize', 'optimize', 'normalize',
  'customize', 'apologize',
];
const AMERICAN_SPELLING_RE = new RegExp(`\\b(${AMERICAN_SPELLINGS.join('|')})\\b`, 'i');

describe('exercise corpus guard (EL-3, EL-14, 07-CORPUS-FORMAT.md section 6)', () => {
  test('corpus count never below the committed floor', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(corpusFloor.floor);
  });

  test('no duplicate canonical names (case-insensitive)', () => {
    const seen = new Map();
    const dupes = [];
    for (const e of CORPUS) {
      const key = e.name.toLowerCase().trim();
      if (seen.has(key)) dupes.push(e.name);
      else seen.set(key, e.name);
    }
    expect(dupes).toEqual([]);
  });

  test('no alias collides with a canonical name or another row\'s alias', () => {
    const canonicalLower = new Map(CORPUS.map((e) => [e.name.toLowerCase().trim(), e.name]));
    const aliasOwner = new Map();
    const collisions = [];
    for (const e of CORPUS) {
      for (const alias of e.aliases ?? []) {
        const key = alias.toLowerCase().trim();
        if (canonicalLower.has(key)) collisions.push(`${alias} (on ${e.name}) == canonical ${canonicalLower.get(key)}`);
        if (aliasOwner.has(key) && aliasOwner.get(key) !== e.name) collisions.push(`${alias} claimed by ${aliasOwner.get(key)} and ${e.name}`);
        aliasOwner.set(key, e.name);
      }
    }
    expect(collisions).toEqual([]);
  });

  test('every field is inside its closed vocab, and required subregions are filled', () => {
    const violations = [];
    for (const entry of CORPUS) {
      const row = corpusEntryToSeedRow(entry);
      if (!EQUIPMENT_SET.has(entry.equipment)) violations.push(`${entry.name}: equipment "${entry.equipment}"`);
      if (!MOVEMENT_PATTERN_SET.has(entry.movementPattern)) violations.push(`${entry.name}: movementPattern "${entry.movementPattern}"`);
      if (!MUSCLE_SET.has(entry.primaryMuscle)) violations.push(`${entry.name}: primaryMuscle "${entry.primaryMuscle}"`);
      for (const m of entry.secondaryMuscles ?? []) {
        if (!MUSCLE_SET.has(m)) violations.push(`${entry.name}: secondaryMuscle "${m}"`);
      }
      if (row.laterality != null && !LATERALITY_SET.has(row.laterality)) violations.push(`${entry.name}: laterality "${row.laterality}"`);
      if (!LOAD_CHARACTER_SET.has(row.loadCharacter)) violations.push(`${entry.name}: loadCharacter "${row.loadCharacter}"`);
      if (!EXERCISE_TYPE_SET.has(row.exerciseType)) violations.push(`${entry.name}: exerciseType "${row.exerciseType}"`);

      const subregionVocab = SUBREGIONS_BY_MUSCLE[entry.primaryMuscle];
      if (entry.subregion != null && subregionVocab && !subregionVocab.includes(entry.subregion)) {
        violations.push(`${entry.name}: subregion "${entry.subregion}" outside vocab for "${entry.primaryMuscle}"`);
      }
      if (entry.subregion == null && MUSCLES_REQUIRING_SUBREGION.includes(entry.primaryMuscle)) {
        violations.push(`${entry.name}: null subregion on "${entry.primaryMuscle}"`);
      }
      if ((entry.secondaryMuscles ?? []).includes(entry.primaryMuscle)) {
        violations.push(`${entry.name}: secondaryMuscles contains primary "${entry.primaryMuscle}"`);
      }
    }
    expect(violations).toEqual([]);
  });

  test('rep ranges are not inverted and are plausible for the logging type', () => {
    const violations = [];
    for (const entry of CORPUS) {
      const row = corpusEntryToSeedRow(entry);
      if (entry.repMin > entry.repMax) violations.push(`${entry.name}: inverted ${entry.repMin}-${entry.repMax}`);
      const isRepBased = row.exerciseType !== 'duration' && entry.movementPattern !== 'carry';
      if (isRepBased && (entry.repMin < 1 || entry.repMin > 30 || entry.repMax < 1 || entry.repMax > 30)) {
        violations.push(`${entry.name}: absurd ${entry.repMin}-${entry.repMax} for ${row.exerciseType}`);
      }
    }
    expect(violations).toEqual([]);
  });

  test('fatigueCost and sfr are within 1-5', () => {
    const violations = CORPUS.filter((e) => e.fatigueCost < 1 || e.fatigueCost > 5 || e.sfr < 1 || e.sfr > 5).map((e) => e.name);
    expect(violations).toEqual([]);
  });

  test('every corpus name is in a tier-registry list (explicit, never a silent default)', () => {
    const registryNames = new Set([
      ...REGISTRY_LISTS.STAPLE, ...REGISTRY_LISTS.COMMON, ...REGISTRY_LISTS.NICHE,
      ...REGISTRY_LISTS.NEVER_AUTO, ...REGISTRY_LISTS.SPECIALIST,
      ...CONTESTED.map((c) => c.name),
    ]);
    const unlisted = CORPUS.filter((e) => !registryNames.has(e.name)).map((e) => e.name);
    expect(unlisted).toEqual([]);
  });

  test('null demand axes carry an unknownAxes reason, or are grandfathered baseline rows', () => {
    const requireReason = corpusFloor.demandAxesRequireReason === true;
    const violations = [];
    for (const entry of CORPUS) {
      const row = corpusEntryToSeedRow(entry);
      for (const axis of DEMAND_FIELDS) {
        if (row[axis] == null) {
          const declared = (entry.unknownAxes ?? []).find((u) => u.axis === axis);
          if (!declared || !declared.reason) {
            if (requireReason || !baselineNames.has(entry.name)) {
              violations.push(`${entry.name}: ${axis}`);
            }
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test('cue rules: length/British-spelling/banned-words/no-em-dash/no-exclamation/full-stop when present, or accepted empty per corpus-floor.json', () => {
    const violations = [];
    for (const entry of CORPUS) {
      const row = corpusEntryToSeedRow(entry);
      const cue = row.cue ?? '';
      if (cue) {
        if (cue.length < 40 || cue.length > 240) violations.push(`${entry.name}: cue length ${cue.length}`);
        if (/—/.test(cue)) violations.push(`${entry.name}: cue has an em dash`);
        if (/!/.test(cue)) violations.push(`${entry.name}: cue has an exclamation mark`);
        const lower = cue.toLowerCase();
        for (const word of BANNED_CUE_WORDS) {
          if (new RegExp(`\\b${word}\\b`).test(lower)) violations.push(`${entry.name}: cue has banned word "${word}"`);
        }
        const americanHit = cue.match(AMERICAN_SPELLING_RE);
        if (americanHit) violations.push(`${entry.name}: cue has a likely American spelling "${americanHit[0]}"`);
        if (!/\.$/.test(cue.trim())) violations.push(`${entry.name}: cue missing a full stop`);
      } else if (corpusFloor.cuesRequired === true) {
        violations.push(`${entry.name}: empty cue, cuesRequired is true`);
      }
    }
    expect(violations).toEqual([]);
  });

  test('every CURATED_DEMANDS/ADAPTED_SETUP/MACHINE_TYPE_BY_NAME/FAMILY_LISTS/registry/CONTESTED name exists in the corpus', () => {
    const violations = [];
    const check = (names, source) => {
      for (const name of names) if (!knownNames.has(name)) violations.push(`${source}: "${name}"`);
    };
    check(Object.keys(CURATED_DEMANDS), 'CURATED_DEMANDS');
    check(Object.keys(ADAPTED_SETUP), 'ADAPTED_SETUP');
    check(Object.keys(MACHINE_TYPE_BY_NAME), 'MACHINE_TYPE_BY_NAME');
    for (const [listName, names] of Object.entries(FAMILY_LISTS)) check(names, `FAMILY_LISTS.${listName}`);
    check([
      ...REGISTRY_LISTS.STAPLE, ...REGISTRY_LISTS.COMMON, ...REGISTRY_LISTS.NICHE,
      ...REGISTRY_LISTS.NEVER_AUTO, ...REGISTRY_LISTS.SPECIALIST,
    ], 'canonicality.js registry lists');
    check(CONTESTED.map((c) => c.name), 'canonicality.js CONTESTED');
    expect(violations).toEqual([]);
  });

  test('every library-plan exercise name resolves to a corpus name (live or retired)', () => {
    // Re-anchored (EL-14): parses the same LIBRARY_PLANS literal
    // validate-corpus.mjs does, for the same reason (seedRoutines.js
    // cannot be required outside React Native — it imports database.js).
    const seedRoutinesPath = path.join(__dirname, '../../seedRoutines.js');
    const src = fs.readFileSync(seedRoutinesPath, 'utf8');
    const marker = 'export const LIBRARY_PLANS = [';
    const start = src.indexOf(marker);
    const end = src.indexOf('\n];', start);
    const literal = src.slice(start + marker.length - 1, end + 2);
    // eslint-disable-next-line no-new-func
    const plans = Function(`"use strict"; return (${literal});`)();
    const orphans = [];
    for (const plan of plans) {
      for (const workout of plan.workouts ?? []) {
        for (const ex of workout.exercises ?? []) {
          if (!knownNames.has(ex.name)) orphans.push(ex.name);
        }
      }
    }
    expect(orphans).toEqual([]);
  });

  test('retired entries carry a survivor that is itself a live corpus row', () => {
    const liveNames = new Set(CORPUS.map((e) => e.name));
    const bad = RETIRED_ENTRIES.filter((r) => !liveNames.has(r.retiredInto));
    expect(bad).toEqual([]);
  });

  test('every retired name is an alias of its survivor', () => {
    const byName = new Map(CORPUS.map((e) => [e.name, e]));
    const missing = RETIRED_ENTRIES.filter((r) => {
      const survivor = byName.get(r.retiredInto);
      return !survivor || !(survivor.aliases ?? []).includes(r.name);
    }).map((r) => r.name);
    expect(missing).toEqual([]);
  });

  // Rule 14 (EL-8, 09-STYLE-PLANS.md section 1): every hand-curated style
  // pool name resolves live, and the only NEVER_AUTO rows any pool may
  // carry are the kettlebell ballistics stylePools.js itself lists as a
  // deliberate exception.
  test('style pools reference only live corpus names, and NEVER_AUTO rows are limited to the declared kettlebell exceptions', () => {
    // eslint-disable-next-line global-require
    const { STYLE_POOLS, KETTLEBELL_NEVER_AUTO_EXCEPTIONS } = require('../../exercise/stylePools');
    const liveNames = new Set(CORPUS.map((e) => e.name));
    const exceptionSet = new Set(KETTLEBELL_NEVER_AUTO_EXCEPTIONS);
    const neverAutoSet = new Set(REGISTRY_LISTS.NEVER_AUTO);
    const unresolved = [];
    const disallowedNeverAuto = [];
    for (const [poolKey, names] of Object.entries(STYLE_POOLS)) {
      for (const name of names) {
        if (!liveNames.has(name)) unresolved.push(`${poolKey}: ${name}`);
        if (neverAutoSet.has(name) && !exceptionSet.has(name)) disallowedNeverAuto.push(`${poolKey}: ${name}`);
      }
    }
    expect(unresolved).toEqual([]);
    expect(disallowedNeverAuto).toEqual([]);
  });
});
