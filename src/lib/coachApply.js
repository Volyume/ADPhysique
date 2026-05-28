/**
 * Pure helpers for the confirm-then-apply coach flow (GAP_ANALYSIS
 * rows 3-7). Founder direction 2026-05-27: the coach surfaces each
 * adjustment as a suggestion with an Apply button; nothing changes
 * until the user taps. Calories included (founder decision 2026-05-28:
 * uniform model, no silent auto-apply).
 *
 * The screen orchestrates the side effects:
 *   compute new state  →  persist the real write (nutrition_targets,
 *   planned volume, …)  →  markApplied on the coach output  →  re-save
 *   the output (output_json blob)  →  re-render.
 *
 * Applied state rides inside the coach output's output_json blob
 * (appliedAdjustments map + the legacy adjustments[key].applied flag
 * the render already reads), so there is no schema migration and
 * nothing for the frozen closed-test build to break against.
 *
 * These functions are the pure, testable compute + applied-state
 * pieces. No I/O here.
 */

export const KCAL_FLOOR = 1200;

/**
 * Compute new nutrition targets for a calorie adjustment.
 *
 * Protein is the priority macro and is held constant. Fat and carbs
 * scale with the kcal change so the deficit/surplus split holds. The
 * floor stops a cut suggestion ever pushing the target below 1200.
 *
 * @returns {null | { newKcal: number, targets: object }}
 *   null when there is nothing to apply: no change, no current target
 *   to scale from, or the floor clamps the result back to the current
 *   value (so applying would be a no-op).
 */
export function computeCalorieTargets(nutrition, change) {
  const current = nutrition?.targetKcal;
  if (!change || !current) return null;
  const newKcal = Math.max(KCAL_FLOOR, current + change);
  if (newKcal === current) return null;
  const ratio = newKcal / current;
  // Spread the existing row first so untouched fields survive the save.
  // saveNutritionTargets writes the whole row, so a targets object that
  // only carried the three changed macros would null out tdee
  // (maintenance), bmr, phase and the rest. Only targetKcal, fat and
  // carbs move; protein is held.
  return {
    newKcal,
    targets: {
      ...nutrition,
      targetKcal: newKcal,
      proteinG: nutrition.proteinG ?? null,
      fatG: nutrition.fatG ? Math.round(nutrition.fatG * ratio) : (nutrition.fatG ?? null),
      carbsG: nutrition.carbsG ? Math.round(nutrition.carbsG * ratio) : (nutrition.carbsG ?? null),
    },
  };
}

/**
 * Compute the targets for a diet-break apply: raise a deficit back up to
 * maintenance for the week, holding protein and scaling fat + carbs.
 * Maintenance is the stored `tdee` value (there is no separate
 * maintenanceKcal column).
 *
 * @returns {null | { newKcal: number, targets: object }}
 *   null when there is nothing to apply: no current target, no
 *   maintenance figure to raise to, or already at/above maintenance.
 */
export function computeDietBreakTargets(nutrition) {
  const current = nutrition?.targetKcal;
  const maintenance = nutrition?.tdee;
  if (!current || !maintenance) return null;
  if (maintenance <= current) return null;
  return computeCalorieTargets(nutrition, Math.round(maintenance - current));
}

// Fraction of baseline carbs pulled off each rest day. The freed carbs
// are spread across the training days, so the weekly carb total (and so
// the weekly average kcal) is preserved. 0.25 is a moderate cycle:
// noticeable on the plate without starving rest days.
export const MACRO_CYCLE_REST_DAY_CARB_CUT = 0.25;

/**
 * Compute a high-day / low-day macro split for a carb cycle (GAP row 6).
 *
 * Protein and fat are held constant every day. Only carbs move: each
 * rest day is cut by MACRO_CYCLE_REST_DAY_CARB_CUT of baseline, and the
 * freed carbs are spread evenly across the training days. The weekly
 * carb total is preserved, so the weekly average kcal stays at the
 * current target. Each day's kcal is the current target plus the carb
 * delta from baseline (4 kcal/g), which keeps the day kcal consistent
 * with its own macros and the week consistent with the target.
 *
 * @param {object} nutrition  current targets (targetKcal, proteinG, carbsG, fatG)
 * @param {number} trainingDaysPerWeek  clamped to 1..6
 * @returns {null | { trainingDaysPerWeek, trainingDay, restDay }}
 *   null when there is nothing to cycle: no current target or carbs to
 *   split, fewer than 1 or more than 6 training days (no rest day to
 *   pull from, or no training day to push to), or the split rounds to a
 *   no-op.
 */
export function computeMacroCycle(nutrition, trainingDaysPerWeek) {
  const targetKcal = nutrition?.targetKcal;
  const baselineCarbs = nutrition?.carbsG;
  if (!targetKcal || !baselineCarbs) return null;
  const T = Math.round(trainingDaysPerWeek);
  if (!Number.isFinite(T) || T < 1 || T > 6) return null;
  const R = 7 - T;

  const weeklyCarbs = baselineCarbs * 7;
  const restDayCarbs = Math.round(baselineCarbs * (1 - MACRO_CYCLE_REST_DAY_CARB_CUT));
  const trainingDayCarbs = Math.round((weeklyCarbs - R * restDayCarbs) / T);
  if (trainingDayCarbs === restDayCarbs) return null;

  const proteinG = nutrition.proteinG ?? null;
  const fatG = nutrition.fatG ?? null;

  return {
    trainingDaysPerWeek: T,
    trainingDay: {
      kcal: Math.round(targetKcal + (trainingDayCarbs - baselineCarbs) * 4),
      proteinG,
      carbsG: trainingDayCarbs,
      fatG,
    },
    restDay: {
      kcal: Math.round(targetKcal + (restDayCarbs - baselineCarbs) * 4),
      proteinG,
      carbsG: restDayCarbs,
      fatG,
    },
  };
}

/**
 * Compute the targets for a single refeed day (GAP row 7). This is the
 * live wiring of the refeed math that previously sat dead in
 * nutritionEngine.getPlanNutritionContext: raise the day to maintenance
 * by adding carbohydrate, holding protein and fat. Maintenance is the
 * stored tdee, the same source the diet break uses (there is no
 * separate maintenance column).
 *
 * Carbs fill the gap to maintenance after protein and fat are paid for,
 * so the day's kcal lands on maintenance exactly.
 *
 * @returns {null | { kcal, proteinG, carbsG, fatG }}
 *   null when there is no maintenance figure, no current target, or the
 *   current target already sits at or above maintenance (not in a
 *   deficit, so there is nothing to refeed up to).
 */
export function computeRefeedDay(nutrition) {
  const current = nutrition?.targetKcal;
  const maintenance = nutrition?.tdee;
  if (!current || !maintenance) return null;
  if (maintenance <= current) return null;
  const proteinG = nutrition.proteinG ?? null;
  const fatG = nutrition.fatG ?? null;
  const carbsKcal = Math.max(0, maintenance - (proteinG ?? 0) * 4 - (fatG ?? 0) * 9);
  return {
    kcal: maintenance,
    proteinG,
    carbsG: Math.round(carbsKcal / 4),
    fatG,
  };
}

/**
 * Compute the planned-volume changes for a deload apply: cut every
 * muscle to its floor (mev) for the week, the same level the scheduled
 * recovery week is seeded at. Returns only the muscles that actually
 * move, shaped for upsertPlannedMuscleVolume.
 *
 * @returns {Array<{ muscle, plannedSets, mev, mav, mrv }>}
 */
export function computeDeloadVolume(plannedRows) {
  if (!Array.isArray(plannedRows)) return [];
  const changes = [];
  for (const row of plannedRows) {
    const mev = row.mev ?? 0;
    const current = row.planned_sets ?? 0;
    if (current > mev) {
      changes.push({
        muscle: row.muscle,
        plannedSets: mev,
        mev: row.mev ?? null,
        mav: row.mav ?? null,
        mrv: row.mrv ?? null,
      });
    }
  }
  return changes;
}

/**
 * Record an adjustment as applied on a coach output object. Returns a
 * new object (does not mutate the input) with:
 *   - appliedAdjustments[key] = { appliedAt, ...details }
 *   - adjustments[key].applied = true (+ details merged), so the
 *     existing render that reads e.g. calories.applied / calories.newKcal
 *     keeps working without change.
 */
export function markApplied(output, key, details = {}) {
  if (!output || !key) return output;
  const appliedAdjustments = { ...(output.appliedAdjustments || {}) };
  appliedAdjustments[key] = { appliedAt: Date.now(), ...details };
  const next = { ...output, appliedAdjustments };
  if (next.adjustments && next.adjustments[key]) {
    next.adjustments = {
      ...next.adjustments,
      [key]: { ...next.adjustments[key], applied: true, ...details },
    };
  }
  return next;
}

/**
 * Has this adjustment been applied? Reads the appliedAdjustments map
 * first, falling back to the legacy adjustments[key].applied flag.
 */
export function isApplied(output, key) {
  if (!output || !key) return false;
  if (output.appliedAdjustments?.[key]) return true;
  return !!output.adjustments?.[key]?.applied;
}

/**
 * Compute the planned-volume changes for a training volumeDelta apply.
 *
 * Founder decision 2026-05-28: Apply spreads the delta across every
 * trained muscle in the target week's planned volume. Each muscle is
 * clamped to its own [mev, mrv] so a push never exceeds recoverable
 * volume and a pull-back never drops below the minimum effective dose.
 *
 * Takes the raw planned_muscle_volume rows for the target week
 * (snake_case, straight from getPlannedMuscleVolume) and returns only
 * the muscles that actually change, shaped for upsertPlannedMuscleVolume.
 *
 * @returns {Array<{ muscle, plannedSets, mev, mav, mrv }>}
 */
export function computeVolumeApply(plannedRows, volumeDelta) {
  if (!Array.isArray(plannedRows) || !volumeDelta) return [];
  const changes = [];
  for (const row of plannedRows) {
    const mev = row.mev ?? 0;
    const mrv = row.mrv ?? Number.POSITIVE_INFINITY;
    const current = row.planned_sets ?? 0;
    let next = current + volumeDelta;
    if (next < mev) next = mev;
    if (next > mrv) next = mrv;
    if (next !== current) {
      changes.push({
        muscle: row.muscle,
        plannedSets: next,
        mev: row.mev ?? null,
        mav: row.mav ?? null,
        mrv: row.mrv ?? null,
      });
    }
  }
  return changes;
}
