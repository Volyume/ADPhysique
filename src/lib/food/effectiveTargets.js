/**
 * Pure resolver for the diary's effective macro target and its day-type label.
 *
 * Extracted from DiaryScreen so the precedence is locked with tests. The order
 * is deliberate and must not drift:
 *   1. a refeed day (maintenance / high-carb) takes top precedence;
 *   2. then a carb cycle swaps in the training-day or rest-day split;
 *   3. otherwise a banked day shifts kcal via carbs;
 *   4. otherwise the flat stored target stands.
 * Display only — these feed MacroRings and the day-type chip, never a write.
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
 * @returns {object|null} the effective target (targetKcal/proteinG/carbsG/fatG)
 */
export function resolveEffectiveTargets(targets, { isRefeedDay, refeed, macroCycle, isTrainingDay, bankedDelta } = {}) {
  if (!targets) return targets;
  const day = isRefeedDay
    ? refeed
    : macroCycle
    ? (isTrainingDay ? macroCycle.trainingDay : macroCycle.restDay)
    : null;
  if (!day) return bankedDelta ? applyBankToTarget(targets, bankedDelta) : targets;
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
