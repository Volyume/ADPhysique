/**
 * food/curatedMeals.js
 *
 * Curated clean-bodybuilding meal library for the Suggested tab. These
 * are balanced, high-protein meals modelled on what physique-focused and
 * health-conscious people actually eat, NOT arbitrary database foods. The
 * suggestion engine (mealSuggest.js) ranks them against one meal's share
 * of the day's remaining macros, filtered to the slot being logged and
 * the user's dietary preference.
 *
 * FIRST TRANCHE FOR FOUNDER REVIEW (2026-05-29): ~15 meals spanning every
 * slot and all three diets, to lock the shape + macro quality before the
 * set is grown to ~40. Per-item macros are sensible estimates for common
 * foods at the listed gram weights; the coach should sanity-check and
 * adjust. Macros are baked onto each item (like saved-meal items) so a
 * logged suggestion needs no live database lookup; the foodRef is a
 * descriptive 'curated:*' marker, and the diary edit sheet falls back to
 * the stored macros if it can't resolve it.
 *
 * Schema (per meal):
 *   id     stable string id ('curated_*')
 *   name   display name
 *   diet   'omnivore' | 'vegetarian' | 'vegan'  (the STRICTEST diet it suits)
 *   slots  array of 'breakfast'|'lunch'|'dinner'|'snack' (or ['any'])
 *   items  [{ foodRef, name, quantityG, kcal, proteinG, carbsG, fatG }]
 *
 * Diet inheritance: a vegan meal also suits vegetarian + omnivore eaters;
 * a vegetarian meal suits omnivores. dietAllows() encodes that.
 */

export const DIETS = Object.freeze(['omnivore', 'vegetarian', 'vegan']);

// What a meal of diet `mealDiet` is acceptable for, given the user's
// preference `userDiet`. Vegan ⊂ vegetarian ⊂ omnivore.
export function dietAllows(userDiet, mealDiet) {
  if (userDiet === 'vegan') return mealDiet === 'vegan';
  if (userDiet === 'vegetarian') return mealDiet === 'vegan' || mealDiet === 'vegetarian';
  return true; // omnivore (or unset) eats anything
}

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

// Sum baked item macros into the totals shape the engine scores on.
export function mealTotals(items) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const it of items || []) {
    kcal += num(it.kcal);
    protein += num(it.proteinG);
    carbs += num(it.carbsG);
    fat += num(it.fatG);
  }
  const r1 = (n) => Math.round(n * 10) / 10;
  return { kcal: Math.round(kcal), protein: r1(protein), carbs: r1(carbs), fat: r1(fat) };
}

export const CURATED_MEALS = Object.freeze([
  // ── Breakfast ──────────────────────────────────────────────────────
  {
    id: 'curated_eggs_oats_banana', name: 'Eggs, oats & banana', diet: 'omnivore', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:eggs', name: 'Whole eggs (3)', quantityG: 150, kcal: 234, proteinG: 19, carbsG: 1, fatG: 16 },
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 60, kcal: 228, proteinG: 8, carbsG: 40, fatG: 4 },
      { foodRef: 'curated:banana', name: 'Banana', quantityG: 100, kcal: 89, proteinG: 1, carbsG: 23, fatG: 0 },
    ],
  },
  {
    id: 'curated_oats_whey_berries', name: 'Oats, whey & blueberries', diet: 'vegetarian', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 60, kcal: 228, proteinG: 8, carbsG: 40, fatG: 4 },
      { foodRef: 'curated:whey', name: 'Whey protein', quantityG: 30, kcal: 113, proteinG: 24, carbsG: 2, fatG: 1.5 },
      { foodRef: 'curated:blueberries', name: 'Blueberries', quantityG: 60, kcal: 35, proteinG: 0.4, carbsG: 8, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_greek_yog_granola', name: 'Greek yogurt, berries & granola', diet: 'vegetarian', slots: ['breakfast', 'snack'],
    items: [
      { foodRef: 'curated:greek_yogurt', name: 'Greek yogurt (0%)', quantityG: 200, kcal: 114, proteinG: 20, carbsG: 8, fatG: 0 },
      { foodRef: 'curated:berries', name: 'Mixed berries', quantityG: 80, kcal: 35, proteinG: 0.5, carbsG: 8, fatG: 0 },
      { foodRef: 'curated:granola', name: 'Granola', quantityG: 30, kcal: 135, proteinG: 3, carbsG: 19, fatG: 5 },
    ],
  },
  {
    id: 'curated_tofu_scramble', name: 'Tofu scramble on toast', diet: 'vegan', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:tofu_firm', name: 'Firm tofu', quantityG: 150, kcal: 180, proteinG: 17, carbsG: 3, fatG: 11 },
      { foodRef: 'curated:wholemeal_toast', name: 'Wholemeal toast (2)', quantityG: 60, kcal: 150, proteinG: 6, carbsG: 26, fatG: 2 },
      { foodRef: 'curated:spinach', name: 'Spinach', quantityG: 50, kcal: 12, proteinG: 1.5, carbsG: 2, fatG: 0 },
    ],
  },

  // ── Lunch ──────────────────────────────────────────────────────────
  {
    id: 'curated_chicken_rice_broc', name: 'Chicken, rice & broccoli', diet: 'omnivore', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:chicken_breast', name: 'Chicken breast', quantityG: 150, kcal: 248, proteinG: 47, carbsG: 0, fatG: 5 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 200, kcal: 260, proteinG: 5, carbsG: 56, fatG: 0.6 },
      { foodRef: 'curated:broccoli', name: 'Broccoli', quantityG: 100, kcal: 34, proteinG: 2.8, carbsG: 7, fatG: 0.4 },
    ],
  },
  {
    id: 'curated_tuna_jacket', name: 'Tuna jacket potato & salad', diet: 'omnivore', slots: ['lunch'],
    items: [
      { foodRef: 'curated:tuna', name: 'Tuna (spring water)', quantityG: 100, kcal: 116, proteinG: 26, carbsG: 0, fatG: 1 },
      { foodRef: 'curated:baked_potato', name: 'Baked potato', quantityG: 250, kcal: 235, proteinG: 6, carbsG: 52, fatG: 0.3 },
      { foodRef: 'curated:salad', name: 'Mixed salad', quantityG: 80, kcal: 15, proteinG: 1, carbsG: 3, fatG: 0 },
    ],
  },
  {
    id: 'curated_lentil_rice_bowl', name: 'Lentil & rice bowl', diet: 'vegan', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:lentils', name: 'Lentils (cooked)', quantityG: 200, kcal: 232, proteinG: 18, carbsG: 38, fatG: 0.8 },
      { foodRef: 'curated:brown_rice', name: 'Brown rice (cooked)', quantityG: 150, kcal: 165, proteinG: 3.5, carbsG: 34, fatG: 1.3 },
      { foodRef: 'curated:veg_mix', name: 'Mixed veg', quantityG: 100, kcal: 40, proteinG: 2, carbsG: 8, fatG: 0.5 },
    ],
  },

  // ── Dinner ─────────────────────────────────────────────────────────
  {
    id: 'curated_salmon_sweet_potato', name: 'Salmon, sweet potato & greens', diet: 'omnivore', slots: ['dinner'],
    items: [
      { foodRef: 'curated:salmon', name: 'Salmon fillet', quantityG: 150, kcal: 312, proteinG: 31, carbsG: 0, fatG: 20 },
      { foodRef: 'curated:sweet_potato', name: 'Sweet potato', quantityG: 200, kcal: 172, proteinG: 3, carbsG: 40, fatG: 0.2 },
      { foodRef: 'curated:green_beans', name: 'Green beans', quantityG: 100, kcal: 31, proteinG: 1.8, carbsG: 7, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_beef_potato_veg', name: 'Lean beef, potato & veg', diet: 'omnivore', slots: ['dinner'],
    items: [
      { foodRef: 'curated:beef_5', name: 'Beef mince (5% fat)', quantityG: 150, kcal: 205, proteinG: 30, carbsG: 0, fatG: 9 },
      { foodRef: 'curated:boiled_potato', name: 'Boiled potato', quantityG: 200, kcal: 172, proteinG: 4, carbsG: 40, fatG: 0.2 },
      { foodRef: 'curated:veg_mix', name: 'Mixed veg', quantityG: 100, kcal: 35, proteinG: 2, carbsG: 7, fatG: 0.4 },
    ],
  },
  {
    id: 'curated_cottage_potato_bowl', name: 'Cottage cheese, potato & veg', diet: 'vegetarian', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:cottage_cheese', name: 'Cottage cheese', quantityG: 200, kcal: 196, proteinG: 22, carbsG: 8, fatG: 8 },
      { foodRef: 'curated:boiled_potato', name: 'Boiled potato', quantityG: 150, kcal: 129, proteinG: 3, carbsG: 30, fatG: 0.2 },
      { foodRef: 'curated:veg_mix', name: 'Mixed veg', quantityG: 100, kcal: 35, proteinG: 2, carbsG: 7, fatG: 0.4 },
    ],
  },
  {
    id: 'curated_tofu_noodle_stirfry', name: 'Tofu & noodle stir-fry', diet: 'vegan', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:tofu_firm', name: 'Firm tofu', quantityG: 150, kcal: 180, proteinG: 17, carbsG: 3, fatG: 11 },
      { foodRef: 'curated:noodles', name: 'Noodles (cooked)', quantityG: 150, kcal: 210, proteinG: 7, carbsG: 42, fatG: 1.5 },
      { foodRef: 'curated:stirfry_veg', name: 'Stir-fry veg', quantityG: 120, kcal: 48, proteinG: 2.5, carbsG: 9, fatG: 0.6 },
    ],
  },

  // ── Snack ──────────────────────────────────────────────────────────
  {
    id: 'curated_greek_yog_whey', name: 'Greek yogurt & whey', diet: 'vegetarian', slots: ['snack'],
    items: [
      { foodRef: 'curated:greek_yogurt', name: 'Greek yogurt (0%)', quantityG: 150, kcal: 86, proteinG: 15, carbsG: 6, fatG: 0 },
      { foodRef: 'curated:whey', name: 'Whey protein', quantityG: 15, kcal: 56, proteinG: 12, carbsG: 1, fatG: 0.7 },
    ],
  },
  {
    id: 'curated_cottage_pineapple', name: 'Cottage cheese & pineapple', diet: 'vegetarian', slots: ['snack'],
    items: [
      { foodRef: 'curated:cottage_cheese', name: 'Cottage cheese', quantityG: 150, kcal: 147, proteinG: 16.5, carbsG: 6, fatG: 6 },
      { foodRef: 'curated:pineapple', name: 'Pineapple', quantityG: 80, kcal: 40, proteinG: 0.4, carbsG: 10, fatG: 0.1 },
    ],
  },
  {
    id: 'curated_plant_shake_banana', name: 'Plant protein shake & banana', diet: 'vegan', slots: ['snack'],
    items: [
      { foodRef: 'curated:plant_protein', name: 'Plant protein', quantityG: 30, kcal: 113, proteinG: 24, carbsG: 2, fatG: 1.5 },
      { foodRef: 'curated:banana', name: 'Banana', quantityG: 100, kcal: 89, proteinG: 1, carbsG: 23, fatG: 0 },
    ],
  },
]);

/**
 * Curated meals filtered to the user's diet + (optionally) the slot being
 * logged, in the engine-candidate shape ({ id, name, slots, itemCount,
 * totals, diet, items }). Pass these as `savedMeals` to rankSuggestions.
 */
export function getCuratedCandidates({ diet = 'omnivore', slot = null } = {}) {
  const out = [];
  for (const meal of CURATED_MEALS) {
    if (!dietAllows(diet, meal.diet)) continue;
    if (slot && !(meal.slots.includes(slot) || meal.slots.includes('any'))) continue;
    out.push({
      id: meal.id,
      name: meal.name,
      diet: meal.diet,
      slots: meal.slots,
      items: meal.items,
      itemCount: meal.items.length,
      totals: mealTotals(meal.items),
    });
  }
  return out;
}
