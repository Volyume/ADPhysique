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
 */
export function fitScore(remaining, macros) {
  const proteinTarget = Math.max(num(remaining.protein), 1);
  const proteinFill = Math.min(num(macros.protein), num(remaining.protein)) / proteinTarget;
  const kcalBudget = Math.max(num(remaining.kcal), 1);
  const kcalOver = Math.max(0, num(macros.kcal) - num(remaining.kcal));
  const overshoot = kcalOver / kcalBudget;
  return proteinFill - 0.6 * overshoot;
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
 * Rank saved meals + foods by fit, best first, de-duped by name, capped
 * at `limit`. Returns { remaining, suggestions }. When there's nothing
 * meaningful left to eat (under ~50 kcal and ~5g protein, e.g. already at
 * or over target) it returns no suggestions rather than padding the day.
 */
export function rankSuggestions({ targets, consumed, savedMeals = [], foods = [], limit = 8 } = {}) {
  const remaining = remainingMacros(targets, consumed);
  if (remaining.kcal < 50 && remaining.protein < 5) {
    return { remaining, suggestions: [] };
  }

  const scored = [];
  for (const meal of savedMeals) {
    const s = suggestMeal(remaining, meal);
    if (s) scored.push(s);
  }
  for (const food of foods) {
    const s = suggestFood(remaining, food);
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
  return { remaining, suggestions: deduped.slice(0, limit) };
}
