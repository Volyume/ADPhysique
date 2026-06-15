/**
 * food/gramSolve.js
 *
 * The portion-sizing primitives shared by every place that rescales a staple:
 * the day-plan tolerance close-out (mealPlanAssembler), the calorie-budget edit
 * (planEdit), and the food swap (mealSwap). These used three hand-copied copies
 * of the same "clamp to the food's sane range, round to 5 g" maths, which is
 * exactly where a future rounding/clamp bug would diverge (food review E-m4).
 *
 * Pure; the only dependency is each food's gram range.
 */
import { gramRangeOf } from './foodRoles';

/** Clamp grams to the food's sane range and round to the nearest 5 g. */
export function clampRoundGrams(grams, foodKey) {
  const [lo, hi] = gramRangeOf(foodKey);
  return Math.round(Math.min(Math.max(grams, lo), hi) / 5) * 5;
}

/**
 * Grams of `foodKey` that shift the plate by `kcalResidual` kcal from
 * `currentG`, given the food's per-100g kcal — clamped + rounded. Returns
 * `currentG` unchanged when the food carries no calories (can't move it).
 */
export function solveGramsForKcal({ currentG, per100Kcal, kcalResidual, foodKey }) {
  if (!(per100Kcal > 0)) return currentG;
  return clampRoundGrams(currentG + (kcalResidual / per100Kcal) * 100, foodKey);
}
