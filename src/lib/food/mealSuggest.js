/**
 * food/mealSuggest.js
 *
 * Rule-based meal suggestions (no LLM). Given the macros remaining for
 * the day, rank the user's foods + saved meals by how well they fill the
 * gap, protein-first without blowing the calorie budget. Pure and
 * deterministic so it's fully unit-testable; the screen layer gathers and
 * normalises the candidate foods (favourites, frequents, recents, custom,
 * database) and saved meals, then calls rankSuggestions.
 *
 * Candidate shapes (normalised by the caller):
 *   food: { foodRef, name, kcal100, protein100, carbs100, fat100 }
 *   meal: { id, name, itemCount, totals: { kcal, protein, carbs, fat } }
 *   targets/consumed: { kcal, protein, carbs, fat }
 */

const round = (n) => Math.round(n);
const round1 = (n) => Math.round(n * 10) / 10;
const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

/**
 * One meal's share of the remaining macros. Suggestions portion to what's
 * left divided by how many meals are still to come, so a pick fills a
 * single meal rather than the whole rest of the day. mealsLeft floors at 1.
 */
export function perMealMacros(remaining, mealsLeft) {
  const m = Math.max(1, Math.floor(num(mealsLeft)) || 1);
  return {
    kcal: num(remaining.kcal) / m,
    protein: num(remaining.protein) / m,
    carbs: num(remaining.carbs) / m,
    fat: num(remaining.fat) / m,
  };
}

/**
 * How many meals are still to come today: the planned meals per day
 * minus the distinct slots already logged, floored at 1 (you always
 * have at least the one you're logging now). Drives perMealMacros so a
 * suggestion fills one meal's share of what's left, not the whole day.
 */
export function mealsLeftToday(mealsPerDay, loggedSlots) {
  const per = Math.max(1, Math.floor(num(mealsPerDay)) || 0);
  const done = Array.isArray(loggedSlots) ? new Set(loggedSlots.filter(Boolean)).size : 0;
  return Math.max(1, per - done);
}

/**
 * Is a candidate appropriate for the meal slot being logged? A meal tags
 * the slots it suits (e.g. ['breakfast'] or ['lunch','dinner']). 'any' or
 * no tags means it fits any slot (so oats won't be offered at dinner, but
 * a chicken/rice bowl can be lunch or dinner). No slot requested = all pass.
 *
 * Two slot forms are accepted:
 *  - a STRING ('breakfast', 'lunch', ... or the diary's 'meal_N'). Bare
 *    numbered slots pass everything: the diary's flexible meal model carries
 *    no food character and ranking falls back to macro fit.
 *  - an ARRAY of allowed kinds (meal-plan rethink 2026-06-12): the PLAN's
 *    numbered slots keep their numbered labels but carry a position-derived
 *    character (Meal 1 places a breakfast meal; the final meal is a cooked
 *    main). A candidate passes when any of its tags is allowed. Untagged
 *    candidates pass here too; callers that need positive evidence (the
 *    assembler's greedy fill) check for tags themselves.
 */
export function slotMatches(candidateSlots, slot) {
  if (!slot) return true;
  if (Array.isArray(slot)) {
    if (!slot.length) return true;
    if (!Array.isArray(candidateSlots) || candidateSlots.length === 0) return true;
    return candidateSlots.includes('any') || slot.some((k) => candidateSlots.includes(k));
  }
  if (/^meal_\d+$/.test(slot)) return true;
  if (!Array.isArray(candidateSlots) || candidateSlots.length === 0) return true;
  return candidateSlots.includes(slot) || candidateSlots.includes('any');
}

/**
 * Macros still to eat today: target minus consumed, floored at 0 (you
 * can't "need" a negative amount).
 */
export function remainingMacros(targets, consumed) {
  const t = targets || {};
  const c = consumed || {};
  const sub = (a, b) => Math.max(0, num(a) - num(b));
  return {
    kcal: sub(t.kcal, c.kcal),
    protein: sub(t.protein, c.protein),
    carbs: sub(t.carbs, c.carbs),
    fat: sub(t.fat, c.fat),
  };
}

/**
 * How well a set of macros fits what's left. Protein-first: reward
 * filling the remaining protein (0..1), penalise overshooting the
 * remaining calories. Higher is better; can go negative on a big
 * overshoot so calorie-bombs sink below modest protein hits.
 *
 * Fat alignment (C/F split, report-grounded 2026-06-16): the curated library
 * carries a deliberate lean→balanced fat spread (per the UK bodybuilder research
 * report: "cuts lean on cod/white fish/chicken breast"; the macro skeleton keeps
 * a "small fat" that changes by composition). Selection previously ignored fat
 * entirely, so a day could stack lean meals and drift well under the engine's
 * fat target. We now nudge towards a candidate whose fat sits near this slot's
 * fat share. Bidirectional (both under- and over-fat are penalised), capped, and
 * weighted BELOW protein and overshoot so protein-first and the calorie band
 * stay dominant — no meal data and no target maths change.
 */
export function fitScore(remaining, macros) {
  const proteinTarget = Math.max(num(remaining.protein), 1);
  const proteinFill = Math.min(num(macros.protein), num(remaining.protein)) / proteinTarget;
  const kcalBudget = Math.max(num(remaining.kcal), 1);
  const kcalOver = Math.max(0, num(macros.kcal) - num(remaining.kcal));
  const overshoot = kcalOver / kcalBudget;
  const fatShare = Math.max(num(remaining.fat), 1);
  const fatMiss = Math.min(Math.abs(num(macros.fat) - num(remaining.fat)) / fatShare, 2);
  return proteinFill - 0.6 * overshoot - 0.30 * fatMiss;
}

/**
 * Suggest a single food at the quantity that best fills the gap. Targets
 * the remaining protein (the macro people most often chase), falling back
 * to calories for low-protein foods. Quantity is clamped to a sane
 * serving range and rounded to 5g. Returns null for a food with no usable
 * macros.
 */
export function suggestFood(remaining, food, { minG = 20, maxG = 400 } = {}) {
  if (!food || !food.foodRef) return null;
  const p100 = num(food.protein100);
  const k100 = num(food.kcal100);
  if (p100 <= 0 && k100 <= 0) return null;

  let grams;
  if (p100 > 0 && remaining.protein > 0) {
    grams = (remaining.protein / p100) * 100;
  } else if (k100 > 0 && remaining.kcal > 0) {
    grams = (remaining.kcal / k100) * 100;
  } else {
    grams = 100;
  }
  grams = Math.round(Math.min(Math.max(grams, minG), maxG) / 5) * 5;

  const f = grams / 100;
  const macros = {
    kcal: round(k100 * f),
    protein: round1(p100 * f),
    carbs: round1(num(food.carbs100) * f),
    fat: round1(num(food.fat100) * f),
  };
  return {
    kind: 'food',
    foodRef: food.foodRef,
    name: food.name,
    quantityG: grams,
    macros,
    score: fitScore(remaining, macros),
  };
}

/**
 * Score a saved meal by its fixed totals (no quantity choice).
 */
export function suggestMeal(remaining, meal) {
  if (!meal || !meal.id) return null;
  const macros = {
    kcal: round(num(meal.totals?.kcal)),
    protein: round1(num(meal.totals?.protein)),
    carbs: round1(num(meal.totals?.carbs)),
    fat: round1(num(meal.totals?.fat)),
  };
  return {
    kind: 'meal',
    id: meal.id,
    name: meal.name,
    itemCount: meal.itemCount,
    macros,
    score: fitScore(remaining, macros),
  };
}

/**
 * Rank meals + foods by fit, best first, de-duped by name, capped at
 * `limit`. Scoring targets ONE meal's share of the day (remaining /
 * mealsLeft), and meals are filtered to the slot being logged so a pick
 * is both right-sized and right-timed (breakfast meals at breakfast).
 *
 * Returns { remaining, perMeal, suggestions }. When there's nothing
 * meaningful left to eat (under ~50 kcal and ~5g protein, e.g. already at
 * or over target) it returns no suggestions rather than padding the day.
 *
 * @param slot      meal slot being logged ('breakfast'|'lunch'|...) or null
 * @param mealsLeft how many meals remain today (default 1 = target whole remainder)
 */
export function rankSuggestions({ targets, consumed, savedMeals = [], foods = [], slot = null, mealsLeft = 1, limit = 8 } = {}) {
  const remaining = remainingMacros(targets, consumed);
  if (remaining.kcal < 50 && remaining.protein < 5) {
    return { remaining, perMeal: perMealMacros(remaining, mealsLeft), suggestions: [] };
  }

  // Score against a single meal's share, not the whole day's remainder.
  const perMeal = perMealMacros(remaining, mealsLeft);

  const scored = [];
  for (const meal of savedMeals) {
    if (!slotMatches(meal?.slots, slot)) continue;
    const s = suggestMeal(perMeal, meal);
    if (s) scored.push(s);
  }
  for (const food of foods) {
    if (!slotMatches(food?.slots, slot)) continue;
    const s = suggestFood(perMeal, food);
    if (s) scored.push(s);
  }

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set();
  const deduped = [];
  for (const s of scored) {
    const key = `${s.kind}:${(s.name || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(s);
  }
  return { remaining, perMeal, suggestions: deduped.slice(0, limit) };
}
