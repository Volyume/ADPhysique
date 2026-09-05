/**
 * exerciseCorpus/index.js — the structured exercise corpus (EL-14,
 * docs/exercise-library-expansion-2026-09-05/07-CORPUS-FORMAT.md sections
 * 1 and 3).
 *
 * Pure, no React Native imports: importable from Node (the audit/guard
 * scripts) and Jest directly. Concatenates every family module in a fixed
 * order and exposes the one mapping function (`corpusEntryToSeedRow`) that
 * produces exactly the row `seedExercises.js` inserts, so the seed, the
 * top-up and the re-derive all call the SAME function and can never drift
 * from each other the way the old per-row hand insert and three name-keyed
 * override maps did.
 */
import barbell from './families/barbell';
import dumbbell from './families/dumbbell';
import cable from './families/cable';
import machine from './families/machine';
import smith from './families/smith';
import bodyweight from './families/bodyweight';
import band from './families/band';
import suspension from './families/suspension';
import kettlebell from './families/kettlebell';
import landmine from './families/landmine';
import carries from './families/carries';
import power from './families/power';
import specialty from './families/specialty';
import medicine_ball from './families/medicine_ball';
import sled from './families/sled';

import { deriveExerciseMetadata } from '../exerciseMetadata';
import { deriveDemandMetadata } from '../capability/demands';
import { deriveLoadSemantics } from '../exercise/loadSemantics';
import { canonicalExerciseId } from '../exercise/canonicalId';

export const FAMILY_NAMES = Object.freeze([
  'barbell', 'dumbbell', 'cable', 'machine', 'smith', 'bodyweight', 'band',
  'suspension', 'kettlebell', 'landmine', 'carries', 'power', 'specialty',
  'medicine_ball', 'sled',
]);

const FAMILY_MODULES = Object.freeze({
  barbell, dumbbell, cable, machine, smith, bodyweight, band, suspension,
  kettlebell, landmine, carries, power, specialty, medicine_ball, sled,
});

// Every entry, source order, family by family — includes EL-21 retired
// stub entries ({ name, retiredInto }) so a retired name's canonical id
// stays resolvable and CORPUS_BY_NAME can answer "what did this become?".
const ALL_ENTRIES = FAMILY_NAMES.flatMap((f) => FAMILY_MODULES[f]);

/** Live, seedable rows only (retired stubs excluded). This is what
 *  `CORPUS.map(corpusEntryToSeedRow)` inserts (07-CORPUS-FORMAT.md section
 *  4) — corpusEntryToSeedRow returns null for a stub as a defensive second
 *  layer, but CORPUS itself never contains one. */
export const CORPUS = Object.freeze(ALL_ENTRIES.filter((e) => !e.retiredInto));

/** name -> entry, EVERY entry including retired stubs, so a retired name
 *  resolves to `{ name, retiredInto }` rather than nothing. */
export const CORPUS_BY_NAME = new Map(ALL_ENTRIES.map((e) => [e.name, e]));

/** Retired stub entries only ({ name, retiredInto }), EL-21. */
export const RETIRED_ENTRIES = Object.freeze(ALL_ENTRIES.filter((e) => e.retiredInto));

/** name -> survivor name, for the top-up's id-remap pass. */
export const RETIRED_NAME_TO_SURVIVOR = new Map(RETIRED_ENTRIES.map((e) => [e.name, e.retiredInto]));

const VALID_OVERRIDE_KEYS = new Set([
  'laterality', 'difficulty', 'exerciseType', 'loadSemantics', 'machineType', 'demands',
]);

/**
 * Build the exact object `insertExerciseWithId`/`updateExerciseMetadata`
 * expect for one corpus entry (07-CORPUS-FORMAT.md section 3). Order:
 * base fields from the entry -> deriveExerciseMetadata -> deriveDemandMetadata
 * -> deriveLoadSemantics -> exercise_category/increment_kg -> overrides
 * applied last (each key validated against the known override vocabulary).
 *
 * Returns null for a retired stub entry (no seedable row) — callers that
 * map CORPUS should never see one (CORPUS already excludes them), but this
 * stays defensive for any caller working from ALL_ENTRIES/CORPUS_BY_NAME.
 *
 * @param {object} entry a family-module entry
 * @returns {object|null}
 */
export function corpusEntryToSeedRow(entry) {
  if (!entry || entry.retiredInto) return null;

  const overrides = entry.overrides ?? {};
  for (const key of Object.keys(overrides)) {
    if (!VALID_OVERRIDE_KEYS.has(key)) {
      throw new Error(`corpusEntryToSeedRow: "${entry.name}" has an unknown override key "${key}"`);
    }
  }

  const compoundIsolation = entry.compound ? 'compound' : 'isolation';
  const exerciseType = overrides.exerciseType ?? 'weight_reps';

  const base = {
    name: entry.name,
    primaryMuscle: entry.primaryMuscle,
    secondaryMuscles: entry.secondaryMuscles ?? [],
    equipment: entry.equipment,
    movementPattern: entry.movementPattern,
    compoundIsolation,
    defaultRepMin: entry.repMin,
    defaultRepMax: entry.repMax,
    fatigueCost: entry.fatigueCost,
    stimulusToFatigueRatio: entry.sfr,
    subregion: entry.subregion ?? null,
    exerciseType,
    isCustom: false,
  };

  const equipMeta = deriveExerciseMetadata(base);
  const demandMeta = deriveDemandMetadata(base);
  const loadSemantics = overrides.loadSemantics ?? deriveLoadSemantics({
    name: entry.name, equipment: entry.equipment, exerciseType,
  });

  const row = {
    ...base,
    ...equipMeta,
    ...demandMeta,
    loadSemantics,
    // EL-16: dead columns made live. exercise_category derives from
    // compound/isolation; increment_kg from implement + category, matching
    // the isolation-aware step algorithms.js:defaultIncrement expects
    // (compound 2.5, isolation 1.25, dumbbell/kettlebell isolation 1.0).
    exerciseCategory: compoundIsolation,
    incrementKg: deriveIncrementKg(entry.compound, equipMeta.equipmentCategory),
    aliases: entry.aliases ?? [],
    loadCharacter: entry.loadCharacter ?? 'grind',
    cue: entry.cue ?? '',
  };

  if (overrides.laterality != null) row.laterality = overrides.laterality;
  if (overrides.difficulty != null) row.difficulty = overrides.difficulty;
  if (overrides.machineType !== undefined) row.machineType = overrides.machineType;
  if (overrides.demands) Object.assign(row, overrides.demands);

  return row;
}

function deriveIncrementKg(compound, equipmentCategory) {
  if (compound) return 2.5;
  if (equipmentCategory === 'dumbbell' || equipmentCategory === 'kettlebell') return 1.0;
  return 1.25;
}
