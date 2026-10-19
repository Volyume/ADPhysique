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

/**
 * Kitchen-scale step for a weight (founder ruling 2026-10-19): under 15 g
 * (oil, butter) to the nearest 1 g, from 15 g upwards to the nearest 5 g.
 * Nobody weighs 444 g on a kitchen scale.
 */
export function kitchenStep(grams) {
  return grams < 15 ? 1 : 5;
}

/** Grams rounded to the kitchen-scale step for their size. */
export function kitchenRound(grams) {
  const step = kitchenStep(grams);
  return Math.round(grams / step) * step;
}

/**
 * The kitchen-rounded value of `grams` inside [lo, hi]: the nearest step,
 * moved one step inwards when rounding crossed a bound, and the bound itself
 * only when the box is narrower than one step (a bound is never crossed).
 */
export function kitchenRoundWithin(grams, lo, hi) {
  let x = kitchenRound(Math.min(Math.max(grams, lo), hi));
  if (x > hi) x = Math.floor(hi / kitchenStep(hi)) * kitchenStep(hi);
  if (x < lo) x = Math.ceil(lo / kitchenStep(lo)) * kitchenStep(lo);
  if (x > hi) x = hi;
  if (x < lo) x = lo;
  return x;
}

/** Clamp grams to the food's sane range and round to the kitchen-scale step. */
export function clampRoundGrams(grams, foodKey) {
  const [lo, hi] = gramRangeOf(foodKey);
  return kitchenRoundWithin(grams, lo, hi);
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
