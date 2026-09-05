#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/eligibility.mjs — report 6 (eligibility.json).
 *
 * Which rows the automatic plan generator can and cannot reach, and why.
 * Reuses canonicality.autoTier for tier and reimplements the pool screens
 * from poolGenerator.js's generatePoolFromLibrary/isHypertrophyExercise
 * VERBATIM (poolGenerator.js itself cannot be imported directly under
 * plain Node — it imports './exercise/movementFamily' without a file
 * extension, which Node's ESM loader refuses; same category of problem
 * loadSeed.mjs documents for seedExercises.js). If poolGenerator.js's
 * screens change, this copy must be updated alongside it.
 */
import { loadSeedRows } from '../loadSeed.mjs';
import { autoTier, AUTO_TIER, REGISTRY_LISTS } from '../../../src/lib/exercise/canonicality.js';
import { writeJson, countBy } from './lib.mjs';

const rows = loadSeedRows();

// ── verbatim copy of poolGenerator.js's screens ───────────────────────────
const NON_HYPERTROPHY_PATTERNS = new Set(['plyometric', 'power']);
const NON_HYPERTROPHY_NAMES = new Set([
  'Cycling (Stationary)', 'Sled Push', 'Assault Bike', 'Jump Squat', 'Broad Jump',
  'Stair Running', 'Battle Ropes', 'Clean Pull',
]);
function isHypertrophyExercise(ex) {
  if (NON_HYPERTROPHY_PATTERNS.has(ex.movementPattern)) return false;
  if (NON_HYPERTROPHY_NAMES.has(ex.name)) return false;
  return true;
}
function poolEligible(ex) {
  if (!ex || !ex.name || !ex.primaryMuscle) return { eligible: false, reason: 'missing name/primaryMuscle' };
  if (!ex.equipmentCategory || ex.equipmentCategory === 'other') return { eligible: false, reason: `equipmentCategory is ${ex.equipmentCategory ?? 'missing'} (poolGenerator.js screens this out)` };
  if (!isHypertrophyExercise(ex)) return { eligible: false, reason: NON_HYPERTROPHY_NAMES.has(ex.name) ? 'named in poolGenerator.js NON_HYPERTROPHY_NAMES' : `movementPattern "${ex.movementPattern}" is in NON_HYPERTROPHY_PATTERNS (plyometric/power)` };
  if ((ex.equipmentProfiles || []).length === 0) return { eligible: false, reason: 'equipmentProfiles is empty (no plan context can select it)' };
  return { eligible: true, reason: null };
}

// ── every row's full eligibility picture ───────────────────────────────────
const everyRow = rows.map((r) => {
  const tier = autoTier(r.name);
  const pool = poolEligible(r);
  const reasons = [];
  if (tier === AUTO_TIER.NEVER_AUTO) reasons.push('never_auto tier (canonicality.js)');
  if (!pool.eligible) reasons.push(`pool screen: ${pool.reason}`);
  // difficulty 3 is NOT a universal pool screen — verified against
  // planEngine.js:1479 (`available.filter(e => e.difficulty == null || e.difficulty < 3)`),
  // which applies ONLY when experience === 'beginner'. Reported separately,
  // never merged into "never eligible" for every user.
  const beginnerBlocked = r.difficulty === 3;
  // exerciseType is NOT screened anywhere in poolGenerator.js or
  // planAutoGen.js (grepped, zero references) — reported as an eligibility
  // ANOMALY below, not folded silently into "never eligible", because the
  // evidence shows the opposite: these rows ARE eligible today.
  const nonWeightReps = r.exerciseType !== 'weight_reps';
  return {
    name: r.name, tier, poolEligible: pool.eligible, poolBlockReason: pool.eligible ? null : pool.reason,
    everNeverEligible: reasons.length > 0, neverEligibleReasons: reasons,
    beginnerBlockedByDifficulty3: beginnerBlocked,
    exerciseType: r.exerciseType, nonWeightReps,
    equipmentProfilesEmpty: (r.equipmentProfiles || []).length === 0,
  };
});

const neverEligible = everyRow.filter((r) => r.everNeverEligible);
const difficulty3Rows = everyRow.filter((r) => r.beginnerBlockedByDifficulty3);
const nonWeightRepsRows = everyRow.filter((r) => r.nonWeightReps);

// ── the confirmed anomaly: duration-type rows that PASS every pool screen ──
// (evidence-before-assertion: verified, not assumed — see poolEligible()
// above and the grep-confirmed absence of any exerciseType check in
// planAutoGen.js). A row here will receive a weight-and-rep-range
// prescription (makeEx/prescription.js) despite being logged as a timed
// hold in the live workout screen.
const durationRowsThatPassPoolScreen = everyRow.filter(
  (r) => r.exerciseType === 'duration' && r.poolEligible,
);

// ── unlisted names: not in ANY canonicality.js registry list, defaulting to
// SPECIALIST ──────────────────────────────────────────────────────────────
const registryNames = new Set([
  ...REGISTRY_LISTS.STAPLE, ...REGISTRY_LISTS.COMMON, ...REGISTRY_LISTS.NICHE, ...REGISTRY_LISTS.NEVER_AUTO,
]);
const unlistedDefaultSpecialist = rows
  .filter((r) => !registryNames.has(r.name))
  .map((r) => r.name);

// ── lead judgement: auto-eligible but arguably should not be ─────────────
// Every row that IS pool-eligible AND not never_auto tier, but that this
// audit judges risky or nonsensical as an automatic pick. Evidence for each
// call is inline; these are recommendations for the lead/EL-5 ruling, not
// silent reclassifications.
const ARGUABLY_SHOULD_NOT_BE_AUTO = [
  ...durationRowsThatPassPoolScreen.map((r) => ({
    name: r.name,
    tier: r.tier,
    reason: `exerciseType "duration" (a timed hold) but not screened out of pool generation — will be assigned a rep-range/weight prescription (planEngine.js makeEx) it cannot honestly use. Confirmed: no exerciseType check exists in poolGenerator.js or planAutoGen.js (grepped).`,
  })),
  { name: 'Dead Hang', tier: autoTier('Dead Hang'), reason: 'exerciseType "duration"; a rep/weight prescription for a dead hang is meaningless. Same defect as the plank family above, listed separately because it is a grip/back exercise rather than an abs hold.' },
];

const out = {
  totalRows: rows.length,
  neverEligibleCount: neverEligible.length,
  neverEligible,
  tierDistribution: countBy(rows, (r) => autoTier(r.name)),
  difficulty3Count: difficulty3Rows.length,
  difficulty3Rows: difficulty3Rows.map((r) => r.name),
  difficulty3Note: 'Difficulty 3 gates ONLY for experience === "beginner" (planEngine.js:1479); it is not a universal never-eligible screen. Reported here as its own axis, not merged into neverEligible.',
  nonWeightRepsCount: nonWeightRepsRows.length,
  nonWeightRepsRows: nonWeightRepsRows.map((r) => ({ name: r.name, exerciseType: r.exerciseType, poolEligible: r.poolEligible })),
  nonWeightRepsNote: 'exerciseType is NOT screened anywhere in poolGenerator.js or planAutoGen.js (verified by grep) — most of these are "weighted_bodyweight", which behaves like weight_reps by design, but the "duration" rows are a real gap; see durationRowsThatPassPoolScreen.',
  durationRowsThatPassPoolScreenCount: durationRowsThatPassPoolScreen.length,
  durationRowsThatPassPoolScreen: durationRowsThatPassPoolScreen.map((r) => r.name),
  unlistedDefaultSpecialistCount: unlistedDefaultSpecialist.length,
  unlistedDefaultSpecialist,
  arguablyShouldNotBeAutoCount: ARGUABLY_SHOULD_NOT_BE_AUTO.length,
  arguablyShouldNotBeAuto: ARGUABLY_SHOULD_NOT_BE_AUTO,
  everyRow,
};

const path = writeJson('eligibility.json', out);
console.log(`eligibility.json written: ${path}`);
console.log(`Tier distribution:`, out.tierDistribution);
console.log(`Never eligible (never_auto tier OR pool screen): ${neverEligible.length}/${rows.length}`);
console.log(`Difficulty-3 (beginner-blocked) rows: ${difficulty3Rows.length}`);
console.log(`Non-weight_reps rows: ${nonWeightRepsRows.length} (of which ${durationRowsThatPassPoolScreen.length} 'duration' rows pass the pool screen — anomaly)`);
console.log(`Unlisted (default-SPECIALIST) rows: ${unlistedDefaultSpecialist.length}/${rows.length}`);
