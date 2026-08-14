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

import { CURATED_MEALS, DIETS, dietAllows } from './curatedMeals';
import { foodExcluded, mealProteinAnchor } from './foodRoles';

// ONE DAILY TRUTH (Campaign 17A, founder law). `FAT_CONVENTIONS` and the
// `fatConvention` preference decided how a REST DAY's fat was handled when
// calories cycled between training and rest days. Calories no longer cycle by
// day type, so there is no rest day to convention. The stored profile column
// is left alone (it harms nobody and deleting it would destroy data); nothing
// reads it into a plan.

export const DEFAULT_PLAN_PREFERENCES = Object.freeze({
  diet: 'omnivore',            // one of curatedMeals.DIETS (incl. 'pescatarian')
  excludeFoodKeys: [],         // dislikes + anything flagged "never show me this"
  excludeTags: [],             // FSA allergen tags, hard excludes
  mealsPerDay: 4,              // physique norm 4-6; beginners often 3-4
  periWorkoutSlots: false,     // pre/post-workout slots, on every day when on
  variety: 0,                  // 0 = repeat (meal-prep, the default — varied is opt-in), 1 = maximise rotation
  rotationPool: null,          // optional 3-3-3 pool: { protein:[], carb:[], fat:[] }
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
  const diet = DIETS.includes(p.diet) ? p.diet : 'omnivore';
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
    variety: clamp(Number.isFinite(Number(p.variety)) ? Number(p.variety) : 0, 0, 1),
    rotationPool: pool && (pool.protein.length || pool.carb.length || pool.fat.length) ? pool : null,
    pinnedMealIds: dedupe(p.pinnedMealIds),
  };
}

/** Is this single curated food key allowed under the preferences? Pure.
 * Delegates to foodRoles.foodExcluded, the one exclusion predicate every
 * surface shares (dietary-needs build 2026-07-09). */
export function foodAllowed(foodKey, prefs) {
  const p = normalisePreferences(prefs);
  return !foodExcluded(foodKey, p);
}

/**
 * Is a curated meal allowed? Diet axis first (vegan ⊂ vegetarian ⊂
 * omnivore, the existing rule), then the protein-anchor policy, then every
 * component food must pass.
 * Meal shape: { diet, components: [{ food, g }] } (curatedMeals schema).
 *
 * Protein-anchor policy (rethink §3.4, founder decision 2026-06-12):
 * an OMNIVORE plan anchors every meal's protein on an animal-quality source
 * (whey/dairy/eggs/lean meat/fish) — soy/pea isolates, tofu and legume
 * "protein" meals are vegan/vegetarian-plan tools, not omnivore staples.
 * A VEGETARIAN plan may anchor on dairy/eggs or the plant anchors, never on
 * a bare legume. A VEGAN plan uses its uplifted plant library unrestricted
 * (the per-meal protein uplift is enforced on the library itself). Meals
 * with no protein contributor at all (none curated today) anchor nothing
 * and stay allowed: the policy gates anchors, not garnishes.
 */
export function mealAllowed(meal, prefs) {
  if (!meal) return false;
  const p = normalisePreferences(prefs);
  if (!dietAllows(p.diet, meal.diet)) return false;
  const anchor = mealProteinAnchor(meal);
  if (anchor) {
    if (p.diet === 'omnivore') {
      // Omnivore plans anchor on a REAL animal-protein source: high quality AND
      // a protein-role food. Cheese (fat role) and milk (carb role) carry a
      // 'high' class but are fat/carb vehicles, not protein anchors — they must
      // not satisfy the gate (food review E-M3).
      if (anchor.cls !== 'high' || anchor.role !== 'protein') return false;
    }
    // Pescatarian follows the vegetarian rule (dietary-needs build
    // 2026-07-09): fish/dairy/egg anchors are 'high' and pass; the plant
    // anchors ('moderate') stay allowed, exactly as they are for
    // vegetarians; a bare legume never anchors any plan.
    if ((p.diet === 'vegetarian' || p.diet === 'pescatarian') && anchor.cls === 'carb_protein') return false;
  }
  const components = Array.isArray(meal.components) ? meal.components : [];
  return components.every((c) => foodAllowed(c.food, p));
}

/**
 * Is a SAVED meal - one the user built themselves out of logged food - allowed
 * into a GENERATED plan?
 *
 * Campaign 17A job 6. This gate did not exist: saved meals went into the
 * assembler's candidate pool unfiltered, so a meal the user had saved months
 * ago could be placed straight into a fresh plan even after they added the
 * allergen it contains. The founder law is explicit: "If a saved meal/recipe
 * contains a newly excluded ingredient: do not silently serve it unchanged in
 * a generated future plan... Mark it unavailable/incompatible for generation
 * as appropriate."
 *
 * TWO KINDS OF ITEM, TWO POSTURES.
 *
 * A saved meal is a list of LOGGED food items, each with a `foodRef`. Only
 * `curated:<key>` refs can be judged - a barcode item or a custom food the
 * user typed in carries no tag data, and pretending otherwise would be a
 * claim of safety this app cannot make.
 *
 *   - A judgeable item that conflicts always refuses the meal. That is the
 *     ordinary case and it covers the founder's example exactly.
 *   - An UNJUDGEABLE item refuses the meal too, but ONLY when a safety rule
 *     is live: an allergen tag exclusion, or a diet the user has set. Under
 *     those, the app must not place a meal it cannot see inside. Under a
 *     plain taste exclusion it is not a safety question, so an unjudgeable
 *     item is left alone rather than silently costing the user a meal they
 *     like.
 *
 * NOTHING IS DELETED. This gates GENERATION only. The saved meal stays in the
 * user's list and they can still log it themselves; the founder's rule is
 * "do not silently serve it", not "take it away".
 *
 * Meal shape: { items: [{ foodRef, name }] }. Pure.
 */
export function savedMealAllowed(meal, prefs, { chosenByUser = false } = {}) {
  if (!meal) return false;
  const p = normalisePreferences(prefs);
  const items = Array.isArray(meal.items) ? meal.items : null;
  const hasAllergenRule = (p.excludeTags?.length || 0) > 0;
  const restrictedDiet = !!p.diet && p.diet !== 'omnivore';

  // DIET CANNOT BE PROVEN FROM FOOD DATA (Campaign 17B job 3). Curated MEALS
  // carry a `diet` tag; curated FOODS do not, and there is no field anywhere
  // that says chicken is not vegan. So for a meal the user assembled from
  // arbitrary logged food, the app genuinely cannot verify diet compatibility.
  //
  // The honest split is by WHO IS CHOOSING:
  //   - GENERATING a plan is the app choosing. Under a restricted diet it must
  //     not place a meal it cannot verify, so saved meals and recipes are not
  //     auto-placed. They stay fully usable for logging, and for pinning.
  //   - PINNING is the user choosing, by name. Diet is a preference they are
  //     asserting about their own meal, so it does not block them.
  // Allergen tags bind in BOTH cases: those are a safety matter and they ARE
  // judgeable on curated refs.
  if (restrictedDiet && !chosenByUser) return false;

  // An ingredient the app cannot see inside (a barcode item, a custom food)
  // carries no tag data. With an allergen named, placing a meal we cannot
  // inspect would be taking a risk on the user's behalf.
  const opaqueIsUnsafe = hasAllergenRule;
  if (!items || items.length === 0) return !opaqueIsUnsafe;
  for (const it of items) {
    const ref = typeof it?.foodRef === 'string' ? it.foodRef : '';
    if (ref.startsWith('curated:')) {
      if (!foodAllowed(ref.slice('curated:'.length), p)) return false;
    } else if (opaqueIsUnsafe) {
      return false;
    }
  }
  return true;
}

/** Saved meals that may be used to BUILD a plan. Stable input order. Pure. */
export function filterSavedMealsByPreferences(prefs, savedMeals = []) {
  return (Array.isArray(savedMeals) ? savedMeals : []).filter((m) => savedMealAllowed(m, prefs));
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
