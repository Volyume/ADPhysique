/**
 * View-layer helpers for the Nutrition Targets screen.
 *
 * These are NOT the nutrition engine and NOT the ED safety floors — the
 * calorie/macro maths and the 1,200/1,500 kcal floors live in
 * nutritionEngine.js and the safety system, untouched. These helpers only
 * shape already-computed targets for display: backfilling the breakdown's
 * renamed/derived fields when an older saved record is loaded, and splitting a
 * protein target across meals by the per-meal MPS window. They are extracted so
 * both rules can be locked with tests.
 */

// One kg of body tissue is treated as ~7,700 kcal for the rate-of-change
// readout. Display only; the engine sets the actual target.
export const KCAL_PER_KG_TISSUE = 7700;

/**
 * Backfill the breakdown's renamed and derived fields from a stored targets
 * record, using the latest bodyweight for the protein-per-kg ratio. A freshly
 * computed record already carries every field, so the nullish guards make this
 * a no-op on that path. Fixes the "blank breakdown" defect where an older
 * record showed an empty resting-burn, "n/a g/kg" and a blank kg/week.
 *
 * @param {object|null} raw       the stored targets record
 * @param {number} weightKg       latest bodyweight, for the protein ratio
 * @returns {object|null} the record with derived fields filled in
 */
export function hydrateLoadedTargets(raw, weightKg) {
  if (!raw) return raw;
  const targetKcal = Number(raw.targetKcal) || 0;
  const maintenanceKcal = raw.maintenanceKcal ?? raw.tdee ?? (targetKcal || null);
  const bmrKcal = raw.bmrKcal ?? raw.bmr ?? null;
  const bmrFormula = raw.bmrFormula
    ?? (raw.bmrMethod === 'katch' || raw.bmrMethod === 'lbm'
      ? 'Lean mass-adjusted formula'
      : raw.bmrMethod
        ? 'Standard calorie formula'
        : null);
  let targetRateKgPerWeek = raw.targetRateKgPerWeek;
  if (targetRateKgPerWeek == null && targetKcal > 0 && maintenanceKcal > 0) {
    targetRateKgPerWeek = Math.round(((targetKcal - maintenanceKcal) * 7 / KCAL_PER_KG_TISSUE) * 100) / 100;
  }
  let proteinGPerKg = raw.proteinGPerKg;
  if (proteinGPerKg == null && Number(raw.proteinG) > 0 && Number(weightKg) > 0) {
    proteinGPerKg = Math.round((raw.proteinG / weightKg) * 100) / 100;
  }
  return {
    ...raw,
    bmrKcal,
    maintenanceKcal,
    bmrFormula,
    targetRateKgPerWeek,
    proteinGPerKg,
    proteinBasis: raw.proteinBasis ?? 'bodyweight',
  };
}

/**
 * Recommended meal count: the smallest count (clamped 3–6) that keeps per-meal
 * protein at or below the ~0.55 g/kg MPS ceiling, so high daily protein targets
 * split across more feedings rather than overshooting the per-meal ceiling.
 * Falls back to 4 when protein or bodyweight is unavailable.
 *
 * @param {number} proteinG  daily protein target in grams
 * @param {number} weightKg  bodyweight in kg
 * @returns {number} recommended meals per day, 3–6
 */
export function getRecommendedMeals(proteinG, weightKg) {
  if (!proteinG || !weightKg) return 4;
  const upperPerMeal = weightKg * 0.55;
  const minCount = Math.ceil(proteinG / upperPerMeal);
  return Math.max(3, Math.min(6, minCount));
}
