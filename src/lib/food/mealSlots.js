/**
 * Meal-slot model for the diary (flexible numbered meals, 2026-06-01).
 *
 * A physique athlete runs four to eight structured meals a day, not the
 * three-meals-and-a-snack wellness frame. So the diary uses numbered meals
 * ("Meal 1", "Meal 2", ...) plus Pre-workout and Post-workout as named meals
 * the user places around training whenever they train (no training-day
 * detection). New entries store keys like 'meal_1'; the cloud accepts them via
 * migration 059.
 *
 * Back-compat is the load-bearing rule here: existing users already have
 * entries stored under 'breakfast' / 'lunch' / 'dinner' / 'snack'. Those must
 * never disappear. buildMealSlots() therefore always includes any slot that has
 * entries, on top of the numbered ladder, and mealSlotLabel() gives every key
 * (legacy or numbered) a human label.
 *
 * Single source of truth: DiaryScreen, the edit and quick-add slot pickers, and
 * the per-meal breakdown all read from here, so the slot set stays consistent.
 */

export const DEFAULT_MEALS_PER_DAY = 4;

const LEGACY_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
  preworkout: 'Pre-workout',
  postworkout: 'Post-workout',
};

const NUMBERED = /^meal_(\d+)$/;

// Human label for any slot key: the legacy names, "Meal N" for numbered keys,
// and a safe fallback for anything unexpected.
export function mealSlotLabel(key) {
  if (LEGACY_LABELS[key]) return LEGACY_LABELS[key];
  const m = NUMBERED.exec(key || '');
  if (m) return `Meal ${m[1]}`;
  return 'Meal';
}

// Canonical display order: legacy day-meals first (they sit early in the day),
// then numbered meals by index, then the peri-workout meals, then snacks and
// anything unrecognised. A brand-new user with no legacy entries simply sees
// Meal 1..N then Pre/Post-workout.
export function slotOrder(key) {
  const fixed = { breakfast: 1, lunch: 2, dinner: 3, preworkout: 90, postworkout: 91, snack: 95 };
  if (fixed[key] != null) return fixed[key];
  const m = NUMBERED.exec(key || '');
  if (m) return 10 + Number(m[1]);
  return 99;
}

// The meals to show on the diary for a given day. A numbered ladder
// (Meal 1..mealsPerDay) plus Pre-workout and Post-workout, unioned with any
// slot that already has entries so no logged food is hidden, sorted into
// canonical order.
export function buildMealSlots(entries = [], mealsPerDay = DEFAULT_MEALS_PER_DAY) {
  const byKey = new Map();
  const add = (key) => { if (key && !byKey.has(key)) byKey.set(key, { key, label: mealSlotLabel(key) }); };
  const n = Math.max(1, mealsPerDay | 0);
  for (let i = 1; i <= n; i++) add(`meal_${i}`);
  add('preworkout');
  add('postworkout');
  for (const e of entries) add(e?.meal_slot);
  return [...byKey.values()].sort((a, b) => slotOrder(a.key) - slotOrder(b.key));
}

// The highest numbered meal that has an entry (so the ladder never hides a
// logged meal). Returns 0 when no numbered meals are logged.
export function highestLoggedMeal(entries = []) {
  let max = 0;
  for (const e of entries) {
    const m = NUMBERED.exec(e?.meal_slot || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

// Slot options for an edit / quick-add picker (no day context). The numbered
// ladder plus Pre/Post, always including `current` so an existing entry's slot
// (including a legacy one like 'breakfast') stays selectable and labelled.
export function pickerMealSlots(current, mealsPerDay = DEFAULT_MEALS_PER_DAY) {
  const list = buildMealSlots([], mealsPerDay);
  if (current && !list.some((s) => s.key === current)) {
    list.push({ key: current, label: mealSlotLabel(current) });
    list.sort((a, b) => slotOrder(a.key) - slotOrder(b.key));
  }
  return list;
}
