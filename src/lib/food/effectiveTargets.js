/**
 * Pure resolver for the diary's effective macro target and its day-type label.
 *
 * ONE DAILY TRUTH (founder law, Campaign 17A). Volyume has the SAME base
 * calorie and macro target every day. There are no training-day targets, no
 * rest-day targets, no weekday-specific targets, no refeed days and no carb
 * cycling. The reason is not stylistic: a Volyume athlete trains whenever life
 * allows, so nutrition that depends on knowing which weekday they train is
 * guessing, and a guess that moves someone's calorie target is worse than no
 * feature at all.
 *
 * That leaves exactly one thing that may move a single day, and only because
 * the USER moved it: the calorie bank. "I am out on Saturday and want more
 * that day" is a redistribution the athlete asked for, inside the same weekly
 * total, under the same floors. Nothing here learns from it; Saturday does not
 * become a permanently higher day.
 *
 * So the precedence collapses to:
 *   1. a banked day shifts kcal via carbs (user-directed, weekly total held);
 *   2. otherwise the stored target stands, unchanged.
 *
 * Display only - these feed MacroRings and the day-type chip, never a write.
 * The engine's stored target is untouched either way, so the coach, the
 * rapid-loss gate and the ED-pattern detector always see the real target.
 */
import { applyBankToTarget } from './calorieBank';

/**
 * The effective macro target for the day.
 *
 * @param {object|null} targets  the stored nutrition target
 * @param {object} ctx
 * @param {number}  ctx.bankedDelta  banked kcal delta for the day (user-directed)
 * @returns {object|null} the effective target (targetKcal/proteinG/carbsG/fatG)
 */
export function resolveEffectiveTargets(targets, { bankedDelta } = {}) {
  if (!targets) return targets;
  if (bankedDelta) return applyBankToTarget(targets, bankedDelta);
  return targets;
}

/**
 * The day-type chip label. Returns null on an ordinary day so the chip is
 * hidden - which, under the one-daily-truth law, is every day the athlete has
 * not banked calories on themselves.
 *
 * @param {object} ctx  { bankedDelta }
 * @returns {string|null}
 */
export function dayTypeLabel({ bankedDelta } = {}) {
  if (bankedDelta > 0) return 'Higher-calorie day';
  if (bankedDelta < 0) return 'Lower-calorie day';
  return null;
}
