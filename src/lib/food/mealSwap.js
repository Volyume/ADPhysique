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
import { slotCharacterFor } from './mealPlanAssembler';
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

// An honest short name built from a meal's components, used after a food swap so
// a plate never keeps a name that misrepresents its contents (e.g. a "Tuna ..."
// meal whose tuna was swapped for cod keeping the tuna name — founder report
// 2026-06-15). Protein anchor + main carb ("Cod & rice"); falls back to the
// protein, then the first component, then a generic label. Pure.
const shortFoodName = (key) => {
  const n = CURATED_FOODS[key]?.name;
  if (!n) return null;
  return n.split('/')[0].replace(/\s*\(.*?\)\s*/g, ' ').trim();
};

export function mealNameFromComponents(components) {
  const list = (Array.isArray(components) ? components : []).filter((c) => CURATED_FOODS[c?.food]);
  if (!list.length) return 'Custom meal';
  const proteinG = (c) => (CURATED_FOODS[c.food].protein || 0) * (Number(c.g) || 0);
  const proteins = list.filter((c) => roleOf(c.food) === 'protein').sort((a, b) => proteinG(b) - proteinG(a));
  const carbs = list.filter((c) => roleOf(c.food) === 'carb').sort((a, b) => (Number(b.g) || 0) - (Number(a.g) || 0));
  const protein = proteins[0];
  const carb = carbs[0];
  if (protein && carb) return `${shortFoodName(protein.food)} & ${shortFoodName(carb.food).toLowerCase()}`;
  if (protein) return shortFoodName(protein.food);
  return shortFoodName(list[0].food) || 'Custom meal';
}

// ─── Style signature (rethink §3.3) ─────────────────────────────────────
// A swap pool must spread across genuinely different plates, not macro
// near-clones (founder directive 2026-06-12: "many swap options, not 2
// near-clones"). Style = (protein anchor class, carb vehicle class),
// derived from where the meal's protein and carbs actually come from.

const ANCHOR_CLASS = {
  chicken_breast: 'poultry', turkey_breast: 'poultry', turkey_mince: 'poultry',
  beef_mince_5: 'beef', steak_lean: 'beef',
  cod: 'fish', salmon: 'fish', smoked_salmon: 'fish', tuna_water: 'fish', prawns: 'fish',
  eggs: 'eggs', egg_whites: 'eggs',
  greek_yogurt_0: 'dairy', greek_yogurt_2: 'dairy', skyr: 'dairy', cottage_cheese: 'dairy',
  halloumi: 'dairy', paneer: 'dairy', cheddar_light: 'dairy', whey: 'dairy', milk_skimmed: 'dairy',
  tofu_firm: 'plant', tempeh: 'plant', seitan: 'plant', tvp_dry: 'plant', quorn_mince: 'plant',
  edamame: 'plant', soy_protein: 'plant', pea_protein: 'plant', soy_yogurt_hp: 'plant', soy_milk: 'plant',
  lentils: 'legume', lentil_dahl: 'legume', chickpeas: 'legume', kidney_beans: 'legume',
  black_beans: 'legume', baked_beans: 'legume',
};

const VEHICLE_CLASS = {
  white_rice: 'rice', brown_rice: 'rice',
  pasta: 'pasta', lentil_pasta: 'pasta',
  white_potato: 'potato', sweet_potato: 'potato', potato_wedges: 'potato',
  wholemeal_bread: 'bread', bagel: 'bread', tortilla: 'bread',
  noodles: 'noodles',
  oats: 'oats', weetabix: 'oats', granola: 'oats',
  rice_cakes: 'ricecakes', quinoa: 'quinoa',
};

/**
 * The meal's style signature: which class supplies the most protein
 * (the anchor) + which vehicle class supplies the most carbs. Pure,
 * deterministic; 'none' when a side is absent.
 */
export function mealStyleSignature(meal) {
  const protByClass = {};
  const carbByClass = {};
  for (const c of meal.components || []) {
    const item = resolveComponent(c.food, c.g);
    if (!item) continue;
    const a = ANCHOR_CLASS[c.food];
    if (a) protByClass[a] = (protByClass[a] || 0) + (item.proteinG || 0);
    const v = VEHICLE_CLASS[c.food];
    if (v) carbByClass[v] = (carbByClass[v] || 0) + (item.carbsG || 0);
  }
  const top = (m) => Object.entries(m).sort((x, y) => (y[1] - x[1]) || (x[0] < y[0] ? -1 : 1))[0]?.[0] || 'none';
  return `${top(protByClass)}|${top(carbByClass)}`;
}

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
      // Refresh the name so a swapped plate never misrepresents its contents
      // (a "Tuna ..." plate whose tuna became cod). Founder report 2026-06-15.
      name: mealNameFromComponents(newComponents),
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
export function swapMealInPlan({ day, slotKey, prefs, excludeMealIds = [], poolSize = 12 } = {}) {
  const p = normalisePreferences(prefs);
  const slots = (day && day.slots) || [];
  const outgoing = slots.find((s) => s.slot === slotKey);
  if (!outgoing) return null;

  const onDay = new Set(slots.map((s) => s.mealId));
  const skip = new Set([...excludeMealIds, outgoing.mealId]);
  // Position-derived character (rethink 2026-06-12): a swap stays in the
  // slot's character — Meal 1 only offers breakfast meals, the final meal
  // offers cooked mains. Meals-per-day is recovered from the day's own
  // numbered slots so the swap needs no extra context.
  const mealsPerDay = slots.reduce((n, s) => {
    const m = /^meal_(\d+)$/.exec(String(s.slot || ''));
    return m ? Math.max(n, Number(m[1])) : n;
  }, 0);
  const matchKind = slotCharacterFor(slotKey, mealsPerDay);

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

  // Style-diverse pool (rethink §3.3, founder directive): the default
  // replacement stays the closest macro fit (least surprising), but the
  // alternatives are picked greedily for STYLE SPREAD — each pass takes
  // the closest candidate whose (anchor|vehicle) signature is not already
  // in the pool, then remaining slots fill by distance. Deep enough to
  // scroll, never a pair of near-clones.
  const replacement = ranked[0];
  const rest = ranked.slice(1);
  const seen = new Set([mealStyleSignature(replacement.m)]);
  const pool = [];
  const taken = new Set();
  const want = Math.max(0, poolSize - 1);
  while (pool.length < want) {
    let pick = rest.find((r) => !taken.has(r.m.id) && !seen.has(mealStyleSignature(r.m)));
    if (!pick) pick = rest.find((r) => !taken.has(r.m.id));
    if (!pick) break;
    taken.add(pick.m.id);
    seen.add(mealStyleSignature(pick.m));
    pool.push(pick);
  }
  return {
    replacement: toShape(replacement),
    alternatives: pool.map(toShape),
  };
}
