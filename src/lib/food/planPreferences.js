/**
 * food/planPreferences.js
 *
 * The individual's meal-plan preference profile (deep-audit Theme G,
 * _REQ-meal-plan-personalisation R1/R3/R4) and the pure filters that apply
 * it. The profile is the user's standing food contract: never-show
 * dislikes, hard allergen excludes, diet axis, meal count, variety, and
 * the day-variant fat convention. Persistence lives with the caller; this
 * module is pure and fully testable.
 *
 * Exclusions are HARD: an excluded food never appears in a generated plan,
 * a swap list, or a coach plan-edit. A meal is excluded when ANY of its
 * components is excluded. Exclusions can never push a plan below the
 * safety floors: the assembler reports withinTolerance:false instead of
 * starving a day to "make it fit" (blueprint §3.6).
 */

import { CURATED_MEALS, dietAllows } from './curatedMeals';
import { tagsOf } from './foodRoles';

export const FAT_CONVENTIONS = Object.freeze(['equalised', 'higher_rest_day']);

export const DEFAULT_PLAN_PREFERENCES = Object.freeze({
  diet: 'omnivore',            // 'omnivore' | 'vegetarian' | 'vegan'
  excludeFoodKeys: [],         // dislikes + anything flagged "never show me this"
  excludeTags: [],             // FSA allergen tags, hard excludes
  mealsPerDay: 4,              // physique norm 4-6; beginners often 3-4
  periWorkoutSlots: false,     // pre/post-workout slots on training days
  variety: 0.5,                // 0 = repeat (meal-prep), 1 = maximise rotation
  rotationPool: null,          // optional 3-3-3 pool: { protein:[], carb:[], fat:[] }
  fatConvention: 'equalised',  // rest-day fat handling (round-2 item 1)
  pinnedMealIds: [],           // "always keep my oats breakfast"
});

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);

/**
 * Normalise a stored/partial preferences object to a complete, valid one.
 * Unknown fields are dropped; out-of-range values are clamped; arrays are
 * de-duplicated. Pure.
 */
export function normalisePreferences(prefs) {
  const p = prefs || {};
  const dedupe = (a) => Array.from(new Set(Array.isArray(a) ? a.filter(Boolean) : []));
  const diet = ['omnivore', 'vegetarian', 'vegan'].includes(p.diet) ? p.diet : 'omnivore';
  const fatConvention = FAT_CONVENTIONS.includes(p.fatConvention)
    ? p.fatConvention : 'equalised';
  const pool = p.rotationPool && typeof p.rotationPool === 'object'
    ? {
      protein: dedupe(p.rotationPool.protein),
      carb: dedupe(p.rotationPool.carb),
      fat: dedupe(p.rotationPool.fat),
    }
    : null;
  return {
    diet,
    excludeFoodKeys: dedupe(p.excludeFoodKeys),
    excludeTags: dedupe(p.excludeTags),
    mealsPerDay: clamp(Math.round(Number(p.mealsPerDay) || 4), 3, 6),
    periWorkoutSlots: !!p.periWorkoutSlots,
    variety: clamp(Number.isFinite(Number(p.variety)) ? Number(p.variety) : 0.5, 0, 1),
    rotationPool: pool && (pool.protein.length || pool.carb.length || pool.fat.length) ? pool : null,
    fatConvention,
    pinnedMealIds: dedupe(p.pinnedMealIds),
  };
}

/** Is this single curated food key allowed under the preferences? Pure. */
export function foodAllowed(foodKey, prefs) {
  const p = normalisePreferences(prefs);
  if (p.excludeFoodKeys.includes(foodKey)) return false;
  const tags = tagsOf(foodKey);
  return !tags.some((t) => p.excludeTags.includes(t));
}

/**
 * Is a curated meal allowed? Diet axis first (vegan ⊂ vegetarian ⊂
 * omnivore, the existing rule), then every component food must pass.
 * Meal shape: { diet, components: [{ food, g }] } (curatedMeals schema).
 */
export function mealAllowed(meal, prefs) {
  if (!meal) return false;
  const p = normalisePreferences(prefs);
  if (!dietAllows(p.diet, meal.diet)) return false;
  const components = Array.isArray(meal.components) ? meal.components : [];
  return components.every((c) => foodAllowed(c.food, p));
}

/** All curated meals that pass the preferences. Stable input order. Pure. */
export function filterMealsByPreferences(prefs, meals = CURATED_MEALS) {
  return meals.filter((m) => mealAllowed(m, prefs));
}

/**
 * Add a food to the never-show list (the one-tap "flag this food" action).
 * Returns a NEW normalised preferences object; never mutates.
 */
export function withExcludedFood(prefs, foodKey) {
  const p = normalisePreferences(prefs);
  if (!foodKey || p.excludeFoodKeys.includes(foodKey)) return p;
  return normalisePreferences({ ...p, excludeFoodKeys: [...p.excludeFoodKeys, foodKey] });
}

/** Remove a food from the never-show list. Returns a new object. */
export function withoutExcludedFood(prefs, foodKey) {
  const p = normalisePreferences(prefs);
  return normalisePreferences({
    ...p,
    excludeFoodKeys: p.excludeFoodKeys.filter((k) => k !== foodKey),
  });
}
