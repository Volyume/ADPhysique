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
  return {
    newKcal,
    targets: {
      targetKcal: newKcal,
      proteinG: nutrition.proteinG ?? null,
      fatG: nutrition.fatG ? Math.round(nutrition.fatG * ratio) : (nutrition.fatG ?? null),
      carbsG: nutrition.carbsG ? Math.round(nutrition.carbsG * ratio) : (nutrition.carbsG ?? null),
      maintenanceKcal: nutrition.maintenanceKcal ?? null,
    },
  };
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
