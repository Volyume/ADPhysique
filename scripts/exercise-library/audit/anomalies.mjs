#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/anomalies.mjs — report 7 (metadata-anomalies.json).
 *
 * Impossible/contradictory metadata combinations, demand-validation
 * failures (the app's own validateDemandMetadata, already run by
 * loadSeedRows), missing subregion where the muscle has
 * SUBREGION_REQUIREMENTS, and exerciseType mismatches.
 */
import { loadSeedRows } from '../loadSeed.mjs';
import { writeJson, loadSubregionRequirements } from './lib.mjs';

const rows = loadSeedRows();
const SUBREGION_REQUIREMENTS = loadSubregionRequirements();

function flag(list, row, detail) {
  list.push({ name: row.name, detail });
}

// ── impossible/contradictory combinations ─────────────────────────────────
const seatedAndFloorAccess = [];
const lyingAndHighBalance = [];
const bodyweightIsolationTotalLoad = [];
const compoundButIsolationPattern = [];
const secondaryContainsPrimary = [];
const repRangeInverted = [];
const repRangeAbsurd = [];
const fatigueOrSfrOutOfRange = [];

for (const r of rows) {
  if (r.position === 'seated' && r.floorAccess === true) {
    const knownIntentional = r.name === 'Z-Press';
    seatedAndFloorAccess.push({
      name: r.name,
      detail: 'position=seated with floorAccess=true',
      knownIntentional,
      note: knownIntentional ? 'CURATED_DEMANDS (demands.js) sets this deliberately: "Z-press: seated ON THE FLOOR". Not a bug — the combination genuinely occurs for this one movement, which is exactly why validateDemandMetadata does not treat seated+floorAccess as a hard contradiction (unlike impact+seated or high-balance+lying, which it does reject).' : undefined,
    });
  }
  if (r.position === 'lying' && r.balanceDemand === 'high') {
    flag(lyingAndHighBalance, r, 'position=lying with balanceDemand=high');
  }
  if (r.equipment === 'bodyweight' && r.compoundIsolation === 'isolation' && r.loadSemantics === 'total') {
    flag(bodyweightIsolationTotalLoad, r, 'equipment=bodyweight, compoundIsolation=isolation, loadSemantics=total (only meaningful if a weighted variant is intended)');
  }
  if (r.compoundIsolation === 'compound' && r.movementPattern === 'isolation') {
    flag(compoundButIsolationPattern, r, 'compoundIsolation=compound but movementPattern=isolation');
  }
  if (Array.isArray(r.secondaryMuscles) && r.secondaryMuscles.includes(r.primaryMuscle)) {
    flag(secondaryContainsPrimary, r, `secondaryMuscles ${JSON.stringify(r.secondaryMuscles)} contains primaryMuscle "${r.primaryMuscle}"`);
  }
  if (typeof r.defaultRepMin === 'number' && typeof r.defaultRepMax === 'number' && r.defaultRepMin > r.defaultRepMax) {
    flag(repRangeInverted, r, `defaultRepMin(${r.defaultRepMin}) > defaultRepMax(${r.defaultRepMax})`);
  }
  // Excludes exerciseType 'duration' (the same min/max fields hold SECONDS
  // for a timed hold, not reps — comparing them to a rep ceiling is
  // comparing different units) and movementPattern 'carry' (already
  // tracked separately in carryTaggedWeightReps; carry reps conventionally
  // stand in for steps, which legitimately run higher than a lifting rep
  // range). What remains is genuine weight_reps/weighted_bodyweight rows.
  const isRepBased = r.exerciseType !== 'duration' && r.movementPattern !== 'carry';
  const absurd = isRepBased && (
    (r.defaultRepMin != null && (r.defaultRepMin < 1 || r.defaultRepMin > 30))
    || (r.defaultRepMax != null && (r.defaultRepMax < 1 || r.defaultRepMax > 30))
  );
  if (absurd) flag(repRangeAbsurd, r, `rep range ${r.defaultRepMin}-${r.defaultRepMax} outside a plausible 1-30 hypertrophy/strength rep range (exerciseType=${r.exerciseType}, movementPattern=${r.movementPattern})`);
  if ((r.fatigueCost != null && (r.fatigueCost < 1 || r.fatigueCost > 5))
    || (r.stimulusToFatigueRatio != null && (r.stimulusToFatigueRatio < 1 || r.stimulusToFatigueRatio > 5))) {
    flag(fatigueOrSfrOutOfRange, r, `fatigueCost=${r.fatigueCost}, sfr=${r.stimulusToFatigueRatio} (expected 1-5)`);
  }
}

// ── demand validation errors (the app's own check, already run) ──────────
const demandValidationFailures = rows
  .filter((r) => (r.demandValidationErrors || []).length > 0)
  .map((r) => ({ name: r.name, errors: r.demandValidationErrors }));

// ── missing subregion where the muscle has SUBREGION_REQUIREMENTS ────────
// A null subregion does not go uncovered: poolGenerator.js's
// DEFAULT_SUBREGION table silently assigns it a fallback role for coverage
// purposes. That is exactly the mechanism movementFamily.js's own docstring
// says was WRONG for back/quads before C16 job 3 (a straight-arm pulldown
// counted as a vertical pull, a deadlift counted as a lat exercise) — this
// script reports what fallback role each null-subregion row is silently
// given today, so the lead can judge whether the same defect class still
// exists for the muscles C16 job 3 did not touch (chest, hamstrings,
// triceps, quads' non-family roles, calves, abs).
const DEFAULT_SUBREGION_FALLBACK = {
  chest: 'flat', back: 'horizontal_row', side_delts: 'side', rear_delts: 'horiz_abduction',
  front_delts: 'press', biceps: 'short_head', triceps: 'pushdown', quads: 'vasti',
  hamstrings: 'hip_extension', glutes: 'activator', calves: 'gastro', abs: 'flexion',
  traps: 'upper', adductors: 'adductor',
};
const missingSubregionWhereRequired = rows
  .filter((r) => SUBREGION_REQUIREMENTS[r.primaryMuscle] && !r.subregion)
  .map((r) => ({
    name: r.name,
    primaryMuscle: r.primaryMuscle,
    silentFallbackRole: DEFAULT_SUBREGION_FALLBACK[r.primaryMuscle] ?? 'default',
    requiredRolesForMuscle: SUBREGION_REQUIREMENTS[r.primaryMuscle].required,
  }));

// ── exerciseType mismatches ────────────────────────────────────────────────
// Carries (movementPattern 'carry') are conventionally programmed by
// distance or time in real coaching, but every carry in this corpus is
// tagged weight_reps (reps standing in for steps/distance). This MAY be a
// deliberate simplification (the live logger has no distance UI for
// strength work) rather than a bug — flagged for lead judgement, not
// asserted as wrong.
const carryTaggedWeightReps = rows
  .filter((r) => r.movementPattern === 'carry' && r.exerciseType === 'weight_reps')
  .map((r) => r.name);

const out = {
  seatedAndFloorAccessCount: seatedAndFloorAccess.length,
  seatedAndFloorAccess,
  lyingAndHighBalanceCount: lyingAndHighBalance.length,
  lyingAndHighBalance,
  bodyweightIsolationTotalLoadCount: bodyweightIsolationTotalLoad.length,
  bodyweightIsolationTotalLoad,
  bodyweightIsolationTotalLoadNote: 'Not necessarily a bug: BW_LOADED_PROFILES (exerciseMetadata.js) deliberately allows unweighted bodyweight isolation staples (crunch, plank, etc.) into every plan context on the assumption a user CAN add external load. Flagged for lead confirmation that this is intended for every row listed, not asserted as wrong.',
  compoundButIsolationPatternCount: compoundButIsolationPattern.length,
  compoundButIsolationPattern,
  secondaryContainsPrimaryCount: secondaryContainsPrimary.length,
  secondaryContainsPrimary,
  repRangeInvertedCount: repRangeInverted.length,
  repRangeInverted,
  repRangeAbsurdCount: repRangeAbsurd.length,
  repRangeAbsurd,
  fatigueOrSfrOutOfRangeCount: fatigueOrSfrOutOfRange.length,
  fatigueOrSfrOutOfRange,
  demandValidationFailureCount: demandValidationFailures.length,
  demandValidationFailures,
  missingSubregionWhereRequiredCount: missingSubregionWhereRequired.length,
  missingSubregionWhereRequired,
  carryTaggedWeightRepsCount: carryTaggedWeightReps.length,
  carryTaggedWeightReps,
};

const path = writeJson('metadata-anomalies.json', out);
console.log(`metadata-anomalies.json written: ${path}`);
console.log(`seated+floorAccess: ${seatedAndFloorAccess.length}, lying+highBalance: ${lyingAndHighBalance.length}, bodyweight-isolation+total: ${bodyweightIsolationTotalLoad.length}`);
console.log(`compound+isolationPattern: ${compoundButIsolationPattern.length}, secondaryContainsPrimary: ${secondaryContainsPrimary.length}`);
console.log(`repRangeInverted: ${repRangeInverted.length}, repRangeAbsurd: ${repRangeAbsurd.length}, fatigue/sfr out of range: ${fatigueOrSfrOutOfRange.length}`);
console.log(`demandValidationFailures: ${demandValidationFailures.length}, missingSubregionWhereRequired: ${missingSubregionWhereRequired.length}, carryTaggedWeightReps: ${carryTaggedWeightReps.length}`);
