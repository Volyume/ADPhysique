#!/usr/bin/env node
/**
 * scripts/exercise-library/loadSeed.mjs
 *
 * EL-14 (exercise-library-expansion-2026-09-05): thin wrapper over the
 * structured corpus (src/lib/exerciseCorpus/), kept at this path with its
 * original export names (`loadSeedRows`, `SEED_ROW_COLUMNS`) so every
 * existing audit/coverage script that imports it keeps working unchanged.
 *
 * Before this campaign, this file parsed seedExercises.js's RAW tuple text
 * (a quote-character blind spot in that approach skipped `Farmer's Walk`
 * for a decade — see git history / 01-SCHEMA-AND-CONSUMERS.md section 1.1).
 * The corpus format migration removed RAW entirely, so there is nothing
 * left to parse: this now imports CORPUS directly and runs the exact same
 * pure derivation pipeline (deriveExerciseMetadata, deriveDemandMetadata,
 * canonicalExerciseId, movementFamily, adaptedSetupFor,
 * validateDemandMetadata) over corpusEntryToSeedRow's output, so
 * `loadSeedRows()` still returns exactly what a fresh install's
 * `exercises` table contains for every canonical (is_custom = 0) row.
 *
 * Exports:
 *   loadSeedRows()      -> Array<FullExerciseRow>, one per live corpus
 *                          entry (retired stubs excluded), corpus order.
 *   SEED_ROW_COLUMNS    -> kept for any script that still reads it
 *                          (documentation only; the corpus is no longer a
 *                          positional tuple, so this describes the base
 *                          fields corpusEntryToSeedRow consumes).
 */
import { CORPUS, corpusEntryToSeedRow } from '../../src/lib/exerciseCorpus/index.js';
import { movementFamily } from '../../src/lib/exercise/movementFamily.js';
import { adaptedSetupFor } from '../../src/lib/exercise/adaptedSetup.js';
import { validateDemandMetadata } from '../../src/lib/capability/demands.js';

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

/**
 * Every field the runtime seed derives for one canonical row, plus a few
 * fields the audit scripts need that corpusEntryToSeedRow's DB-row shape
 * does not itself carry (movementFamily, adaptedSetup,
 * demandValidationErrors) — mirrors the pre-corpus loader's buildFullRow.
 */
function toFullRow(entry) {
  const row = corpusEntryToSeedRow(entry);
  const demandMeta = {
    position: row.position, floorAccess: row.floorAccess, overheadPosition: row.overheadPosition,
    gripDemand: row.gripDemand, unilateralLoadable: row.unilateralLoadable,
    bilateralUpper: row.bilateralUpper, bilateralLower: row.bilateralLower,
    axialLoad: row.axialLoad, impact: row.impact, balanceDemand: row.balanceDemand,
    weightBearingHands: row.weightBearingHands,
  };
  return {
    ...row,
    canonicalId: row.id ?? undefined, // corpusEntryToSeedRow does not stamp id; callers use canonicalExerciseId(name)
    movementFamily: movementFamily(row.name, row.primaryMuscle, row.subregion),
    adaptedSetup: adaptedSetupFor(row),
    demandValidationErrors: validateDemandMetadata(demandMeta),
  };
}

/**
 * Parse the corpus and return the full derived row for every live entry,
 * in corpus (family concatenation) order. Deterministic: same corpus, same
 * output, every run.
 * @returns {Array<object>}
 */
export function loadSeedRows() {
  return CORPUS.map(toFullRow);
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
