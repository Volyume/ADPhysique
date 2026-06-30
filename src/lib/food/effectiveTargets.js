/**
 * Pure resolver for the diary's effective macro target and its day-type label.
 *
 * Extracted from DiaryScreen so the precedence is locked with tests. The order
 * is deliberate and must not drift:
 *   1. a refeed day (maintenance / high-carb) takes top precedence;
 *   2. then a carb cycle swaps in the training-day or rest-day split;
 *   3. otherwise a banked day shifts kcal via carbs;
 *   4. otherwise a per-day-of-week planning offset shifts kcal via carbs,
 *      HARD-clamped so the day can never display below the safe floor (gap #13);
 *   5. otherwise the flat stored target stands.
 * Display only — these feed MacroRings and the day-type chip, never a write.
 * The engine's stored target is untouched at every step, so the coach, the
 * rapid-loss gate and the ED-pattern detector always see the real target.
 */
import { applyBankToTarget } from './calorieBank';

/**
 * The effective macro target for the day, applying the refeed / carb-cycle /
 * bank precedence over the stored target.
 *
 * @param {object|null} targets  the stored nutrition target
 * @param {object} ctx
 * @param {boolean} ctx.isRefeedDay
 * @param {object}  ctx.refeed         the refeed-day target ({ kcal, proteinG, carbsG, fatG })
 * @param {object}  ctx.macroCycle     { trainingDay, restDay } or null
 * @param {boolean} ctx.isTrainingDay
 * @param {number}  ctx.bankedDelta    banked kcal delta for the day
 * @param {number}  [ctx.perDayOffsetKcal]  per-weekday planning offset (gap #13)
 * @param {number}  [ctx.floorKcal]    safe per-day floor; clamps the offset so the
 *                                      displayed target can never drop below it
 * @returns {object|null} the effective target (targetKcal/proteinG/carbsG/fatG)
 */
export function resolveEffectiveTargets(targets, { isRefeedDay, refeed, macroCycle, isTrainingDay, bankedDelta, perDayOffsetKcal, floorKcal } = {}) {
  if (!targets) return targets;
  const day = isRefeedDay
    ? refeed
    : macroCycle
    ? (isTrainingDay ? macroCycle.trainingDay : macroCycle.restDay)
    : null;
  if (!day) {
    if (bankedDelta) return applyBankToTarget(targets, bankedDelta);
    // Per-day-of-week planning offset (gap #13). Only on an otherwise-plain day,
    // so it never competes with a refeed / carb cycle / banked day. The delta is
    // clamped DOWN so base + delta can never fall below the safe floor; a
    // positive delta is left as the user planned it. Routed through carbs
    // (applyBankToTarget), holding protein and fat, exactly like banking.
    const offset = Number(perDayOffsetKcal) || 0;
    if (offset) {
      const baseKcal = Number(targets.targetKcal) || 0;
      const floor = Number(floorKcal);
      const minDelta = Number.isFinite(floor) ? floor - baseKcal : -Infinity;
      const clampedDelta = Math.max(offset, minDelta);
      // A base already at/below floor with a downward offset clamps to 0 (no
      // change), never a further cut.
      if (clampedDelta === 0) return targets;
      return applyBankToTarget(targets, clampedDelta);
    }
    return targets;
  }
  return {
    ...targets,
    targetKcal: day.kcal ?? targets.targetKcal,
    proteinG: day.proteinG ?? targets.proteinG,
    carbsG: day.carbsG ?? targets.carbsG,
    fatG: day.fatG ?? targets.fatG,
  };
}

/**
 * The day-type chip label, following the same precedence. Returns null on a
 * plain day so the chip is hidden.
 *
 * @param {object} ctx  { isRefeedDay, macroCycle, isTrainingDay, bankedDelta }
 * @returns {string|null}
 */
export function dayTypeLabel({ isRefeedDay, macroCycle, isTrainingDay, bankedDelta } = {}) {
  if (isRefeedDay) return 'Refeed day';
  if (macroCycle) return isTrainingDay ? 'Training day' : 'Rest day';
  if (bankedDelta > 0) return 'Higher-calorie day';
  if (bankedDelta < 0) return 'Lower-calorie day';
  return null;
}
