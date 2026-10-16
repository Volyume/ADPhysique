/**
 * food/recipeWeight.js: a recipe's optional cooked weight (founder ruling
 * 2026-10-16, food audit, "Add cooked weight").
 *
 * A recipe's ingredients are weighed raw, but a plate of the cooked dish is
 * not: water cooks off or soaks in. So grams eaten are measured against the
 * whole dish's weight once cooked, when the person has given it. Without it a
 * recipe is logged in servings only (resolveFoodRef marks it `servings_only`).
 *
 * Pure. The one bound is shared by the builder, the local write and the pull.
 */
import { parseDecimalInput } from '../parseDecimalInput';

// A whole pot, not one portion (one entry is capped at MAX_ENTRY_GRAMS, 5000).
export const MAX_COOKED_WEIGHT_G = 50000;

/** A stored value: a whole-gram weight in 1 to MAX_COOKED_WEIGHT_G, else null. */
export function normaliseCookedWeight(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const g = Math.round(n);
  return g >= 1 && g <= MAX_COOKED_WEIGHT_G ? g : null;
}

/**
 * The builder's typed text: null when blank (no cooked weight), the whole
 * grams when it reads, and undefined when it cannot be used (so the builder
 * says so rather than dropping it). Comma decimals read as meant.
 */
export function parseCookedWeight(text) {
  if (text == null || String(text).trim() === '') return null;
  const n = parseDecimalInput(String(text));
  const g = normaliseCookedWeight(n);
  return g == null ? undefined : g;
}

/**
 * How a logged recipe entry's amount reads on the Diary. A recipe's grams mean
 * the cooked dish only when the recipe has a cooked weight AND the entry was
 * priced on that same basis (its energy per gram matches the recipe's, within
 * 2%); then the caller shows grams (null here). Otherwise the amount reads in
 * servings, worked out from the entry's own energy against one serving's
 * energy, which is the same whichever weight the serving is measured in, so
 * an entry logged before a cooked weight was added still reads truly.
 * Returns "1.5 servings", or null (show grams, or nothing can be said).
 */
export function recipeEntryPortion(entry, food) {
  if (!food || food.source !== 'recipe') return null;
  const per100 = Number(food.kcal_100g);
  const servingKcal = (per100 * Number(food.serving_g)) / 100;
  const q = Number(entry?.quantity_g);
  const kcal = Number(entry?.kcal);
  if (!Number.isFinite(kcal) || !(kcal > 0)) return null;
  const sameBasis = food.servings_only !== true && q > 0 && per100 > 0
    && Math.abs(((kcal / q) * 100) - per100) <= per100 * 0.02;
  if (sameBasis || !(servingKcal > 0)) return null;
  const n = Math.round((kcal / servingKcal) * 10) / 10;
  if (!(n > 0)) return null;
  return `${n} ${n === 1 ? 'serving' : 'servings'}`;
}

/**
 * One recipe serving's weight on an entry's OWN basis (the grams it was priced
 * on), for the edit sheet: one serving's energy over the entry's energy per
 * gram. Null when it cannot be worked out (the caller keeps the food's).
 */
export function recipeServingGOnEntryBasis(entry, food) {
  if (!food || food.source !== 'recipe') return null;
  const q = Number(entry?.quantity_g);
  const kcal = Number(entry?.kcal);
  const servingKcal = (Number(food.kcal_100g) * Number(food.serving_g)) / 100;
  if (!(q > 0) || !(kcal > 0) || !(servingKcal > 0)) return null;
  return Math.round((servingKcal / (kcal / q)) * 10) / 10;
}
