/**
 * food/mealSwap.js
 *
 * Macro-preserving swaps for the meal plan (blueprint §3.4, founder
 * requirements R1/R2). Two levels:
 *
 *  - FOOD swap: replace one staple inside a meal with a same-role
 *    alternative at the exact grams that hold the role's dominant macro
 *    (carbs for a carb source, fat for a fat source, protein for a
 *    protein source) within ROLE_TOLERANCE_G — calories follow, which is
 *    precisely how coaches calibrate printed switches (verified against
 *    the founder-coach pairs in round-2 research §3). The solver computes
 *    the exact portion, beating a hand-rounded printed pair.
 *
 *  - MEAL swap: replace a whole plate with the best like-for-like
 *    alternative for that slot, ranked against the outgoing meal's own
 *    totals so the day stays on target by construction.
 *
 * Exclusions (dislikes + allergens) are honoured everywhere: a flagged
 * food can never come back through a swap. Pure and deterministic.
 */

import { CURATED_FOODS, resolveComponent } from './curatedFoods';
import { CURATED_MEALS, mealItems, mealTotals } from './curatedMeals';
import { slotMatches } from './mealSuggest';
import { normalisePreferences, foodAllowed, mealAllowed } from './planPreferences';
import {
  ROLE_TOLERANCE_G,
  roleOf,
  roleMacroGrams,
  swapAlternativesOf,
  keysForRole,
  gramRangeOf,
  stateOf,
} from './foodRoles';

const ROLE_DISTANCE_FAT_WEIGHT = 2;

/**
 * Candidate replacement foods for one staple, preference-ordered:
 * curated coach-style switches first, then every other same-role staple
 * ranked by macro-profile closeness. Exclusion-filtered. Pure.
 */
export function findRoleAlternatives(foodKey, prefs, { limit = 6 } = {}) {
  const p = normalisePreferences(prefs);
  const role = roleOf(foodKey);
  const out = CURATED_FOODS[foodKey];
  if (!role || !out) return [];

  const curated = swapAlternativesOf(foodKey).filter((k) => foodAllowed(k, p));
  const rest = keysForRole(role, p)
    .filter((k) => k !== foodKey && !curated.includes(k))
    .map((k) => {
      const f = CURATED_FOODS[k];
      // Macro-profile closeness per 100 g: same-shaped foods swap most
      // naturally (rice -> couscous, not rice -> honey).
      const d = Math.abs(f.protein - out.protein)
        + Math.abs(f.carbs - out.carbs)
        + Math.abs(f.fat - out.fat) * ROLE_DISTANCE_FAT_WEIGHT;
      return { k, d };
    })
    .sort((a, b) => (a.d - b.d) || (a.k < b.k ? -1 : 1))
    .map((x) => x.k);

  return [...curated, ...rest].slice(0, limit);
}

/**
 * Solve the grams of `foodIn` that hold the role macro that `grams` of
 * `foodOut` delivered. Clamped to the food's sane range, rounded to 5 g.
 * Returns { grams, roleMacroG, withinTolerance } or null when the food
 * cannot carry the role macro at all.
 */
export function solveSwapGrams(foodOut, gramsOut, foodIn) {
  const role = roleOf(foodOut);
  const fIn = CURATED_FOODS[foodIn];
  if (!role || !fIn || roleOf(foodIn) !== role) return null;
  const targetMacroG = roleMacroGrams(foodOut, gramsOut);
  const per100 = role === 'protein' ? fIn.protein : role === 'fat' ? fIn.fat : fIn.carbs;
  if (per100 <= 0) return null;
  const exact = (targetMacroG / per100) * 100;
  const [lo, hi] = gramRangeOf(foodIn);
  const grams = Math.round(Math.min(Math.max(exact, lo), hi) / 5) * 5;
  const roleMacroG = roleMacroGrams(foodIn, grams);
  return {
    grams,
    roleMacroG,
    withinTolerance: Math.abs(roleMacroG - targetMacroG) <= ROLE_TOLERANCE_G,
  };
}

/**
 * Swap one food inside a meal's component list. Returns a NEW meal shape
 * { components, items, totals, swap } or null when no in-tolerance
 * alternative exists. `swap` is the structured receipt the presentation
 * layer renders for either persona:
 * { foodOut, foodOutName, gramsOut, foodIn, foodInName, gramsIn, role,
 *   roleMacroHeldG, kcalDriftKcal, stateIn }
 */
export function swapFoodInMeal({ components, foodKeyOut, prefs, preferKey = null }) {
  const p = normalisePreferences(prefs);
  const list = Array.isArray(components) ? components : [];
  const idx = list.findIndex((c) => c.food === foodKeyOut);
  if (idx === -1) return null;
  const gramsOut = Number(list[idx].g) || 0;

  const candidates = preferKey
    ? [preferKey, ...findRoleAlternatives(foodKeyOut, p).filter((k) => k !== preferKey)]
    : findRoleAlternatives(foodKeyOut, p);

  for (const foodIn of candidates) {
    if (!foodAllowed(foodIn, p)) continue;
    const solved = solveSwapGrams(foodKeyOut, gramsOut, foodIn);
    if (!solved || !solved.withinTolerance) continue;

    const newComponents = list.map((c, i) => (i === idx ? { food: foodIn, g: solved.grams } : c));
    const items = newComponents.map((c) => resolveComponent(c.food, c.g)).filter(Boolean);
    const totals = mealTotals(items);
    const outItem = resolveComponent(foodKeyOut, gramsOut);
    const inItem = resolveComponent(foodIn, solved.grams);
    return {
      components: newComponents,
      items,
      totals,
      swap: {
        foodOut: foodKeyOut,
        foodOutName: outItem ? outItem.name : foodKeyOut,
        gramsOut,
        foodIn,
        foodInName: inItem ? inItem.name : foodIn,
        gramsIn: solved.grams,
        role: roleOf(foodKeyOut),
        roleMacroHeldG: solved.roleMacroG,
        kcalDriftKcal: inItem && outItem ? inItem.kcal - outItem.kcal : 0,
        stateIn: stateOf(foodIn),
      },
    };
  }
  return null;
}

/**
 * Swap a whole meal in an assembled day. Ranks slot-eligible curated
 * meals for SIMILARITY to the outgoing plate's macros (so the swap is a
 * like-for-like, keeping the day close to target when it was on target
 * before the swap), excludes the outgoing meal and everything already on
 * the day, honours preferences, and returns
 * { replacement: { mealId, name, items, totals, components }, alternatives }
 * or null when nothing eligible exists. Deterministic: ties break on id.
 */
export function swapMealInPlan({ day, slotKey, prefs, excludeMealIds = [] } = {}) {
  const p = normalisePreferences(prefs);
  const slots = (day && day.slots) || [];
  const outgoing = slots.find((s) => s.slot === slotKey);
  if (!outgoing) return null;

  const onDay = new Set(slots.map((s) => s.mealId));
  const skip = new Set([...excludeMealIds, outgoing.mealId]);
  const matchKind = /^meal_\d+$/.test(slotKey) || slotKey === 'pre_workout' || slotKey === 'post_workout'
    ? null
    : slotKey;

  // Symmetric similarity to the outgoing plate: a candidate that is much
  // lighter is penalised just as much as one that is much heavier, so the
  // day does not silently drift low after a meal swap (kcal weighted to
  // dominate; macros keep the shape close too).
  const ot = outgoing.totals || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const distance = (t) => Math.abs((t.kcal || 0) - (ot.kcal || 0))
    + 4 * Math.abs((t.protein || 0) - (ot.protein || 0))
    + 2 * Math.abs((t.carbs || 0) - (ot.carbs || 0))
    + 2 * Math.abs((t.fat || 0) - (ot.fat || 0));
  let ranked = CURATED_MEALS
    .filter((m) => !skip.has(m.id) && !onDay.has(m.id))
    .filter((m) => mealAllowed(m, p))
    .filter((m) => (matchKind ? slotMatches(m.slots, matchKind) : true))
    .map((m) => {
      const items = mealItems(m);
      const totals = mealTotals(items);
      return { m, items, totals, dist: distance(totals) };
    })
    .sort((a, b) => (a.dist - b.dist) || (a.m.id < b.m.id ? -1 : 1));

  if (!ranked.length) return null;
  const toShape = ({ m, items, totals }) => ({
    mealId: m.id,
    name: m.name,
    source: 'curated',
    components: m.components,
    items,
    totals,
  });
  return {
    replacement: toShape(ranked[0]),
    alternatives: ranked.slice(1, 4).map(toShape),
  };
}
