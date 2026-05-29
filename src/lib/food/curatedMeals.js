/**
 * food/curatedMeals.js
 *
 * Curated clean-bodybuilding meal library for the Suggested tab, grounded
 * in evidence-based sports nutrition (research pass 2026-05-29: ISSN
 * protein + nutrient-timing position stands, Morton 2018, Helms 2014,
 * Schoenfeld & Aragon 2018). The suggestion engine (mealSuggest.js) ranks
 * these against one meal's share of the day's remaining macros, filtered
 * to the slot being logged and the user's dietary preference.
 *
 * Principles baked into the set:
 *   - Protein-forward: ~25-40g per meal (leucine threshold), 15-25g snacks.
 *   - Fat is a deliberate SPREAD, not uniform. Some meals are genuinely
 *     lean (<= ~10g fat) for around training / when the fat budget is tight;
 *     others are balanced and carry the day's healthy fats (olive oil, nuts,
 *     seeds, avocado, oily fish, nut butter). The engine surfaces leaner
 *     meals automatically once the user has had their fat. (Founder decision
 *     2026-05-29: no automatic pre/post-workout detection yet, so timing is
 *     handled by having lean options in the pool, not by a peri tag. No goal
 *     tags either: the macro targets the engine ranks against are already
 *     goal-driven.)
 *   - Higher-protein plant options (seitan, TVP, soy/pea protein, tempeh,
 *     edamame) so vegan/vegetarian meals still clear the per-meal protein
 *     target without a fat blowout.
 *
 * Macros are label-grade reference values (USDA-level), rounded, for coach
 * review. Each item carries baked macros + a descriptive 'curated:*'
 * foodRef so a logged suggestion needs no live database lookup; the diary
 * edit sheet falls back to the stored macros if it can't resolve it.
 *
 * Schema (per meal):
 *   id     stable string id ('curated_*')
 *   name   display name
 *   diet   'omnivore' | 'vegetarian' | 'vegan'  (the STRICTEST diet it suits)
 *   slots  array of 'breakfast'|'lunch'|'dinner'|'snack' (or ['any'])
 *   items  [{ foodRef, name, quantityG, kcal, proteinG, carbsG, fatG }]
 */

export const DIETS = Object.freeze(['omnivore', 'vegetarian', 'vegan']);

// vegan ⊂ vegetarian ⊂ omnivore.
export function dietAllows(userDiet, mealDiet) {
  if (userDiet === 'vegan') return mealDiet === 'vegan';
  if (userDiet === 'vegetarian') return mealDiet === 'vegan' || mealDiet === 'vegetarian';
  return true;
}

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

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
  // ─── OMNIVORE ──────────────────────────────────────────────────────
  {
    id: 'curated_om_oats_whey_banana', name: 'Oats, whey & banana', diet: 'omnivore', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 60, kcal: 228, proteinG: 8, carbsG: 40, fatG: 4 },
      { foodRef: 'curated:whey', name: 'Whey protein', quantityG: 35, kcal: 133, proteinG: 28, carbsG: 3, fatG: 2 },
      { foodRef: 'curated:banana', name: 'Banana', quantityG: 120, kcal: 107, proteinG: 1.3, carbsG: 27, fatG: 0.4 },
    ],
  },
  {
    id: 'curated_om_egg_omelette_toast', name: 'Egg & veg omelette with toast', diet: 'omnivore', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:eggs', name: 'Whole eggs (3)', quantityG: 150, kcal: 214, proteinG: 19, carbsG: 1.5, fatG: 15 },
      { foodRef: 'curated:veg_mix', name: 'Peppers & onion', quantityG: 80, kcal: 24, proteinG: 1, carbsG: 5, fatG: 0.2 },
      { foodRef: 'curated:wholemeal_toast', name: 'Wholemeal toast', quantityG: 40, kcal: 99, proteinG: 5, carbsG: 16, fatG: 1.4 },
    ],
  },
  {
    id: 'curated_om_chicken_rice_broc', name: 'Chicken, rice & broccoli', diet: 'omnivore', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:chicken_breast', name: 'Chicken breast (cooked)', quantityG: 150, kcal: 248, proteinG: 46, carbsG: 0, fatG: 6 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 200, kcal: 260, proteinG: 5, carbsG: 56, fatG: 0.6 },
      { foodRef: 'curated:broccoli', name: 'Broccoli', quantityG: 120, kcal: 41, proteinG: 3.4, carbsG: 8, fatG: 0.5 },
    ],
  },
  {
    id: 'curated_om_cod_sweet_potato', name: 'Cod, sweet potato & veg', diet: 'omnivore', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:cod', name: 'Cod fillet', quantityG: 200, kcal: 164, proteinG: 36, carbsG: 0, fatG: 1.4 },
      { foodRef: 'curated:sweet_potato', name: 'Sweet potato', quantityG: 250, kcal: 215, proteinG: 4, carbsG: 50, fatG: 0.3 },
      { foodRef: 'curated:green_beans', name: 'Green beans', quantityG: 120, kcal: 37, proteinG: 2.2, carbsG: 8, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_om_steak_potato_greens', name: 'Lean steak, potatoes & greens', diet: 'omnivore', slots: ['dinner'],
    items: [
      { foodRef: 'curated:steak_lean', name: 'Lean steak (cooked)', quantityG: 150, kcal: 250, proteinG: 40, carbsG: 0, fatG: 10 },
      { foodRef: 'curated:boiled_potato', name: 'Boiled potatoes', quantityG: 250, kcal: 215, proteinG: 5, carbsG: 50, fatG: 0.3 },
      { foodRef: 'curated:salad', name: 'Mixed salad', quantityG: 100, kcal: 20, proteinG: 1.5, carbsG: 3, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_om_salmon_rice_asparagus', name: 'Salmon, rice & asparagus', diet: 'omnivore', slots: ['dinner'],
    items: [
      { foodRef: 'curated:salmon', name: 'Salmon fillet', quantityG: 150, kcal: 312, proteinG: 31, carbsG: 0, fatG: 20 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 180, kcal: 234, proteinG: 4.5, carbsG: 50, fatG: 0.5 },
      { foodRef: 'curated:asparagus', name: 'Asparagus', quantityG: 100, kcal: 20, proteinG: 2.2, carbsG: 4, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_om_turkey_avocado_wrap', name: 'Turkey & avocado wrap', diet: 'omnivore', slots: ['lunch'],
    items: [
      { foodRef: 'curated:turkey', name: 'Turkey breast (cooked)', quantityG: 120, kcal: 168, proteinG: 36, carbsG: 0, fatG: 2 },
      { foodRef: 'curated:tortilla', name: 'Tortilla wrap', quantityG: 60, kcal: 180, proteinG: 5, carbsG: 30, fatG: 4 },
      { foodRef: 'curated:avocado', name: 'Avocado', quantityG: 60, kcal: 96, proteinG: 1.2, carbsG: 5, fatG: 9 },
      { foodRef: 'curated:salad', name: 'Salad', quantityG: 60, kcal: 12, proteinG: 0.9, carbsG: 2, fatG: 0.1 },
    ],
  },
  {
    id: 'curated_om_tuna_ricecakes', name: 'Tuna & rice cakes', diet: 'omnivore', slots: ['snack'],
    items: [
      { foodRef: 'curated:tuna', name: 'Tuna (in water)', quantityG: 100, kcal: 116, proteinG: 26, carbsG: 0, fatG: 1 },
      { foodRef: 'curated:rice_cakes', name: 'Rice cakes (4)', quantityG: 32, kcal: 123, proteinG: 2.6, carbsG: 26, fatG: 1 },
    ],
  },

  // ─── VEGETARIAN ────────────────────────────────────────────────────
  {
    id: 'curated_veg_yog_oats_berries', name: 'Greek yogurt, oats & berries', diet: 'vegetarian', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:greek_yogurt', name: 'Greek yogurt (0%)', quantityG: 200, kcal: 118, proteinG: 20, carbsG: 8, fatG: 0 },
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 40, kcal: 152, proteinG: 5.2, carbsG: 27, fatG: 2.8 },
      { foodRef: 'curated:berries', name: 'Mixed berries', quantityG: 80, kcal: 35, proteinG: 0.5, carbsG: 8, fatG: 0 },
      { foodRef: 'curated:honey', name: 'Honey', quantityG: 15, kcal: 46, proteinG: 0, carbsG: 12, fatG: 0 },
    ],
  },
  {
    id: 'curated_veg_egg_scramble_beans', name: 'Egg scramble, toast & beans', diet: 'vegetarian', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:eggs', name: '2 whole eggs + 4 whites', quantityG: 220, kcal: 248, proteinG: 31, carbsG: 2, fatG: 13 },
      { foodRef: 'curated:wholemeal_toast', name: 'Wholemeal toast', quantityG: 40, kcal: 99, proteinG: 5, carbsG: 16, fatG: 1.4 },
      { foodRef: 'curated:baked_beans', name: 'Baked beans', quantityG: 100, kcal: 78, proteinG: 4.7, carbsG: 13, fatG: 0.6 },
    ],
  },
  {
    id: 'curated_veg_tofu_stirfry_rice', name: 'Tofu stir-fry with rice', diet: 'vegetarian', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:tofu_firm', name: 'Firm tofu', quantityG: 200, kcal: 288, proteinG: 34, carbsG: 6, fatG: 16 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 180, kcal: 234, proteinG: 4.5, carbsG: 50, fatG: 0.5 },
      { foodRef: 'curated:stirfry_veg', name: 'Stir-fry veg', quantityG: 120, kcal: 48, proteinG: 2.5, carbsG: 9, fatG: 0.6 },
    ],
  },
  {
    id: 'curated_veg_lentil_quinoa', name: 'Lentil & quinoa bowl', diet: 'vegetarian', slots: ['lunch'],
    items: [
      { foodRef: 'curated:lentils', name: 'Lentils (cooked)', quantityG: 250, kcal: 290, proteinG: 22.5, carbsG: 48, fatG: 1 },
      { foodRef: 'curated:quinoa', name: 'Quinoa (cooked)', quantityG: 120, kcal: 144, proteinG: 5, carbsG: 25, fatG: 2.4 },
      { foodRef: 'curated:veg_mix', name: 'Roast veg', quantityG: 120, kcal: 48, proteinG: 2.4, carbsG: 9, fatG: 0.5 },
    ],
  },
  {
    id: 'curated_veg_halloumi_chickpea', name: 'Halloumi & chickpea salad', diet: 'vegetarian', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:halloumi', name: 'Halloumi (grilled)', quantityG: 80, kcal: 256, proteinG: 17.6, carbsG: 1.6, fatG: 20 },
      { foodRef: 'curated:chickpeas', name: 'Chickpeas (cooked)', quantityG: 150, kcal: 246, proteinG: 13, carbsG: 41, fatG: 4 },
      { foodRef: 'curated:salad', name: 'Salad + lemon', quantityG: 120, kcal: 24, proteinG: 1.8, carbsG: 4, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_veg_tempeh_sweet_potato', name: 'Tempeh & sweet potato', diet: 'vegetarian', slots: ['dinner'],
    items: [
      { foodRef: 'curated:tempeh', name: 'Tempeh', quantityG: 120, kcal: 230, proteinG: 24, carbsG: 10, fatG: 13 },
      { foodRef: 'curated:sweet_potato', name: 'Sweet potato', quantityG: 250, kcal: 215, proteinG: 4, carbsG: 50, fatG: 0.3 },
      { foodRef: 'curated:greens', name: 'Steamed greens', quantityG: 100, kcal: 30, proteinG: 2.5, carbsG: 4, fatG: 0.4 },
    ],
  },
  {
    id: 'curated_veg_cottage_pineapple', name: 'Cottage cheese, pineapple & rice cakes', diet: 'vegetarian', slots: ['snack'],
    items: [
      { foodRef: 'curated:cottage_cheese', name: 'Cottage cheese (low-fat)', quantityG: 200, kcal: 144, proteinG: 24, carbsG: 6, fatG: 2 },
      { foodRef: 'curated:pineapple', name: 'Pineapple', quantityG: 100, kcal: 50, proteinG: 0.5, carbsG: 13, fatG: 0.1 },
      { foodRef: 'curated:rice_cakes', name: 'Rice cakes (3)', quantityG: 24, kcal: 92, proteinG: 2, carbsG: 19, fatG: 0.7 },
    ],
  },
  {
    id: 'curated_veg_yog_whey_almonds', name: 'Greek yogurt, whey & almonds', diet: 'vegetarian', slots: ['snack'],
    items: [
      { foodRef: 'curated:greek_yogurt', name: 'Greek yogurt (2%)', quantityG: 150, kcal: 110, proteinG: 15, carbsG: 6, fatG: 3 },
      { foodRef: 'curated:whey', name: 'Whey protein', quantityG: 15, kcal: 56, proteinG: 12, carbsG: 1, fatG: 0.7 },
      { foodRef: 'curated:almonds', name: 'Almonds', quantityG: 15, kcal: 92, proteinG: 3, carbsG: 3, fatG: 8 },
    ],
  },

  // ─── VEGAN ─────────────────────────────────────────────────────────
  {
    id: 'curated_vg_soy_oats_banana', name: 'Soy protein oats & banana', diet: 'vegan', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 60, kcal: 228, proteinG: 8, carbsG: 40, fatG: 4 },
      { foodRef: 'curated:soy_protein', name: 'Soy protein', quantityG: 30, kcal: 108, proteinG: 26, carbsG: 1, fatG: 0.5 },
      { foodRef: 'curated:banana', name: 'Banana', quantityG: 120, kcal: 107, proteinG: 1.3, carbsG: 27, fatG: 0.4 },
    ],
  },
  {
    id: 'curated_vg_tofu_scramble', name: 'Tofu scramble on toast', diet: 'vegan', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:tofu_firm', name: 'Firm tofu', quantityG: 200, kcal: 288, proteinG: 34, carbsG: 6, fatG: 16 },
      { foodRef: 'curated:wholemeal_toast', name: 'Wholemeal toast', quantityG: 40, kcal: 99, proteinG: 5, carbsG: 16, fatG: 1.4 },
      { foodRef: 'curated:spinach', name: 'Spinach', quantityG: 60, kcal: 14, proteinG: 1.7, carbsG: 2, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_vg_seitan_rice_veg', name: 'Seitan, rice & veg stir-fry', diet: 'vegan', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:seitan', name: 'Seitan', quantityG: 130, kcal: 196, proteinG: 49, carbsG: 9, fatG: 1.3 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 180, kcal: 234, proteinG: 4.5, carbsG: 50, fatG: 0.5 },
      { foodRef: 'curated:stirfry_veg', name: 'Stir-fry veg', quantityG: 120, kcal: 48, proteinG: 2.5, carbsG: 9, fatG: 0.6 },
    ],
  },
  {
    id: 'curated_vg_tvp_chilli_rice', name: 'TVP chilli with rice', diet: 'vegan', slots: ['dinner'],
    items: [
      { foodRef: 'curated:tvp', name: 'TVP (dry)', quantityG: 50, kcal: 164, proteinG: 26, carbsG: 15, fatG: 0.5 },
      { foodRef: 'curated:kidney_beans', name: 'Kidney beans (cooked)', quantityG: 120, kcal: 127, proteinG: 8.7, carbsG: 23, fatG: 0.5 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 150, kcal: 195, proteinG: 3.8, carbsG: 42, fatG: 0.4 },
      { foodRef: 'curated:tomato_veg', name: 'Tomato & veg', quantityG: 100, kcal: 30, proteinG: 1.5, carbsG: 6, fatG: 0.3 },
    ],
  },
  {
    id: 'curated_vg_tempeh_quinoa', name: 'Tempeh, quinoa & roast veg', diet: 'vegan', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:tempeh', name: 'Tempeh', quantityG: 120, kcal: 230, proteinG: 24, carbsG: 10, fatG: 13 },
      { foodRef: 'curated:quinoa', name: 'Quinoa (cooked)', quantityG: 120, kcal: 144, proteinG: 5, carbsG: 25, fatG: 2.4 },
      { foodRef: 'curated:veg_mix', name: 'Roast veg', quantityG: 120, kcal: 48, proteinG: 2.4, carbsG: 9, fatG: 0.5 },
      { foodRef: 'curated:olive_oil', name: 'Olive oil', quantityG: 8, kcal: 72, proteinG: 0, carbsG: 0, fatG: 8 },
    ],
  },
  {
    id: 'curated_vg_lentil_pasta', name: 'High-protein lentil pasta', diet: 'vegan', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:lentil_pasta', name: 'Lentil pasta (dry)', quantityG: 100, kcal: 350, proteinG: 25, carbsG: 50, fatG: 4 },
      { foodRef: 'curated:tomato_sauce', name: 'Tomato sauce', quantityG: 120, kcal: 60, proteinG: 2, carbsG: 10, fatG: 1.5 },
      { foodRef: 'curated:veg_mix', name: 'Mixed veg', quantityG: 100, kcal: 40, proteinG: 2, carbsG: 8, fatG: 0.5 },
    ],
  },
  {
    id: 'curated_vg_pea_shake_berries', name: 'Pea protein shake & berries', diet: 'vegan', slots: ['snack'],
    items: [
      { foodRef: 'curated:pea_protein', name: 'Pea protein', quantityG: 33, kcal: 124, proteinG: 26, carbsG: 1.6, fatG: 2.3 },
      { foodRef: 'curated:berries', name: 'Mixed berries', quantityG: 100, kcal: 44, proteinG: 0.6, carbsG: 10, fatG: 0 },
    ],
  },
  {
    id: 'curated_vg_soy_yog_granola_pb', name: 'Soy yogurt, granola & peanut butter', diet: 'vegan', slots: ['snack'],
    items: [
      { foodRef: 'curated:soy_yogurt', name: 'High-protein soy yogurt', quantityG: 200, kcal: 140, proteinG: 12, carbsG: 10, fatG: 6 },
      { foodRef: 'curated:granola', name: 'Granola', quantityG: 25, kcal: 113, proteinG: 2.5, carbsG: 16, fatG: 4 },
      { foodRef: 'curated:peanut_butter', name: 'Peanut butter', quantityG: 12, kcal: 71, proteinG: 3, carbsG: 2.4, fatG: 6 },
    ],
  },

  // ─── OMNIVORE (variety) ────────────────────────────────────────────
  {
    id: 'curated_om_protein_pancakes', name: 'Protein pancakes & banana', diet: 'omnivore', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 50, kcal: 190, proteinG: 6.5, carbsG: 33, fatG: 3.5 },
      { foodRef: 'curated:egg_whites', name: 'Egg whites', quantityG: 150, kcal: 78, proteinG: 16.5, carbsG: 1, fatG: 0.3 },
      { foodRef: 'curated:whey', name: 'Whey protein', quantityG: 20, kcal: 76, proteinG: 16, carbsG: 1.5, fatG: 1 },
      { foodRef: 'curated:banana', name: 'Banana', quantityG: 80, kcal: 71, proteinG: 0.9, carbsG: 18, fatG: 0.3 },
    ],
  },
  {
    id: 'curated_om_smoked_salmon_bagel', name: 'Smoked salmon & egg bagel', diet: 'omnivore', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:smoked_salmon', name: 'Smoked salmon', quantityG: 80, kcal: 117, proteinG: 20, carbsG: 0, fatG: 4 },
      { foodRef: 'curated:bagel', name: 'Bagel', quantityG: 85, kcal: 230, proteinG: 9, carbsG: 46, fatG: 1.5 },
      { foodRef: 'curated:egg', name: 'Egg', quantityG: 50, kcal: 72, proteinG: 6.3, carbsG: 0.5, fatG: 5 },
    ],
  },
  {
    id: 'curated_om_chicken_sweetpot', name: 'Chicken, sweet potato & spinach', diet: 'omnivore', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:chicken_breast', name: 'Chicken breast (cooked)', quantityG: 150, kcal: 248, proteinG: 46, carbsG: 0, fatG: 6 },
      { foodRef: 'curated:sweet_potato', name: 'Sweet potato', quantityG: 250, kcal: 215, proteinG: 4, carbsG: 50, fatG: 0.3 },
      { foodRef: 'curated:spinach', name: 'Spinach', quantityG: 80, kcal: 18, proteinG: 2.3, carbsG: 3, fatG: 0.3 },
    ],
  },
  {
    id: 'curated_om_beef_burrito_bowl', name: 'Beef burrito bowl', diet: 'omnivore', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:beef_5', name: 'Beef mince (5%)', quantityG: 150, kcal: 205, proteinG: 30, carbsG: 0, fatG: 9 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 150, kcal: 195, proteinG: 3.8, carbsG: 42, fatG: 0.4 },
      { foodRef: 'curated:black_beans', name: 'Black beans', quantityG: 80, kcal: 91, proteinG: 6, carbsG: 16, fatG: 0.4 },
      { foodRef: 'curated:salsa', name: 'Salsa', quantityG: 40, kcal: 12, proteinG: 0.4, carbsG: 3, fatG: 0 },
    ],
  },
  {
    id: 'curated_om_prawn_noodles', name: 'Prawn & noodle stir-fry', diet: 'omnivore', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:prawns', name: 'Prawns', quantityG: 150, kcal: 128, proteinG: 30, carbsG: 0, fatG: 0.8 },
      { foodRef: 'curated:noodles', name: 'Noodles (cooked)', quantityG: 150, kcal: 210, proteinG: 7, carbsG: 42, fatG: 1.5 },
      { foodRef: 'curated:stirfry_veg', name: 'Stir-fry veg', quantityG: 120, kcal: 48, proteinG: 2.5, carbsG: 9, fatG: 0.6 },
    ],
  },
  {
    id: 'curated_om_turkey_bolognese', name: 'Turkey bolognese & pasta', diet: 'omnivore', slots: ['dinner'],
    items: [
      { foodRef: 'curated:turkey_mince', name: 'Turkey mince', quantityG: 150, kcal: 170, proteinG: 30, carbsG: 0, fatG: 5 },
      { foodRef: 'curated:pasta', name: 'Pasta (dry)', quantityG: 70, kcal: 245, proteinG: 9, carbsG: 50, fatG: 1.5 },
      { foodRef: 'curated:tomato_sauce', name: 'Tomato sauce', quantityG: 100, kcal: 30, proteinG: 1.5, carbsG: 6, fatG: 0.3 },
    ],
  },
  {
    id: 'curated_om_whitefish_wedges', name: 'White fish, wedges & peas', diet: 'omnivore', slots: ['dinner'],
    items: [
      { foodRef: 'curated:cod', name: 'White fish', quantityG: 200, kcal: 164, proteinG: 36, carbsG: 0, fatG: 1.4 },
      { foodRef: 'curated:potato_wedges', name: 'Potato wedges', quantityG: 200, kcal: 220, proteinG: 4, carbsG: 42, fatG: 3 },
      { foodRef: 'curated:peas', name: 'Garden peas', quantityG: 80, kcal: 66, proteinG: 4.4, carbsG: 9, fatG: 0.3 },
    ],
  },
  {
    id: 'curated_om_eggs_apple_snack', name: 'Boiled eggs & apple', diet: 'omnivore', slots: ['snack'],
    items: [
      { foodRef: 'curated:eggs', name: 'Boiled eggs (3)', quantityG: 150, kcal: 214, proteinG: 19, carbsG: 1.5, fatG: 15 },
      { foodRef: 'curated:apple', name: 'Apple', quantityG: 150, kcal: 78, proteinG: 0.5, carbsG: 21, fatG: 0.3 },
    ],
  },

  // ─── VEGETARIAN (variety) ──────────────────────────────────────────
  {
    id: 'curated_veg_skyr_oats_pb', name: 'Skyr, oats & peanut butter', diet: 'vegetarian', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:skyr', name: 'Skyr', quantityG: 200, kcal: 126, proteinG: 22, carbsG: 8, fatG: 0.4 },
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 40, kcal: 152, proteinG: 5, carbsG: 27, fatG: 2.8 },
      { foodRef: 'curated:peanut_butter', name: 'Peanut butter', quantityG: 15, kcal: 88, proteinG: 4, carbsG: 3, fatG: 7.5 },
    ],
  },
  {
    id: 'curated_veg_cottage_pancakes', name: 'Cottage cheese pancakes', diet: 'vegetarian', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:cottage_cheese', name: 'Cottage cheese (low-fat)', quantityG: 150, kcal: 108, proteinG: 18, carbsG: 4.5, fatG: 1.5 },
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 40, kcal: 152, proteinG: 5, carbsG: 27, fatG: 2.8 },
      { foodRef: 'curated:egg_whites', name: 'Egg whites', quantityG: 100, kcal: 52, proteinG: 11, carbsG: 0.7, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_veg_protein_smoothie', name: 'Protein oat smoothie', diet: 'vegetarian', slots: ['breakfast', 'snack'],
    items: [
      { foodRef: 'curated:whey', name: 'Whey protein', quantityG: 30, kcal: 113, proteinG: 24, carbsG: 2, fatG: 1.5 },
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 30, kcal: 114, proteinG: 4, carbsG: 20, fatG: 2 },
      { foodRef: 'curated:berries', name: 'Berries', quantityG: 80, kcal: 35, proteinG: 0.5, carbsG: 8, fatG: 0 },
      { foodRef: 'curated:milk', name: 'Skimmed milk', quantityG: 200, kcal: 70, proteinG: 6.8, carbsG: 10, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_veg_paneer_rice', name: 'Paneer curry & rice', diet: 'vegetarian', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:paneer', name: 'Paneer', quantityG: 100, kcal: 265, proteinG: 18, carbsG: 3, fatG: 21 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 150, kcal: 195, proteinG: 3.8, carbsG: 42, fatG: 0.4 },
      { foodRef: 'curated:veg_mix', name: 'Curry veg', quantityG: 100, kcal: 40, proteinG: 2, carbsG: 8, fatG: 0.5 },
    ],
  },
  {
    id: 'curated_veg_egg_fried_rice', name: 'Egg fried rice', diet: 'vegetarian', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:eggs', name: 'Eggs (2)', quantityG: 100, kcal: 143, proteinG: 13, carbsG: 1, fatG: 10 },
      { foodRef: 'curated:egg_whites', name: 'Egg whites', quantityG: 100, kcal: 52, proteinG: 11, carbsG: 0.7, fatG: 0.2 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 200, kcal: 260, proteinG: 5, carbsG: 56, fatG: 0.6 },
      { foodRef: 'curated:veg_mix', name: 'Peas & veg', quantityG: 100, kcal: 40, proteinG: 2, carbsG: 8, fatG: 0.5 },
    ],
  },
  {
    id: 'curated_veg_quorn_chilli', name: 'Meat-free chilli & rice', diet: 'vegetarian', slots: ['dinner'],
    items: [
      { foodRef: 'curated:quorn_mince', name: 'Meat-free mince', quantityG: 150, kcal: 143, proteinG: 22, carbsG: 7.5, fatG: 3 },
      { foodRef: 'curated:kidney_beans', name: 'Kidney beans', quantityG: 100, kcal: 106, proteinG: 7, carbsG: 19, fatG: 0.4 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 120, kcal: 156, proteinG: 3, carbsG: 34, fatG: 0.3 },
    ],
  },
  {
    id: 'curated_veg_tofu_katsu', name: 'Tofu katsu & rice', diet: 'vegetarian', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:tofu_firm', name: 'Firm tofu', quantityG: 150, kcal: 216, proteinG: 25.5, carbsG: 4.5, fatG: 12 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 180, kcal: 234, proteinG: 4.5, carbsG: 50, fatG: 0.5 },
      { foodRef: 'curated:katsu_veg', name: 'Katsu sauce & veg', quantityG: 80, kcal: 50, proteinG: 1, carbsG: 9, fatG: 1 },
    ],
  },
  {
    id: 'curated_veg_edamame_egg', name: 'Edamame & boiled egg', diet: 'vegetarian', slots: ['snack'],
    items: [
      { foodRef: 'curated:edamame', name: 'Edamame', quantityG: 100, kcal: 121, proteinG: 12, carbsG: 9, fatG: 5 },
      { foodRef: 'curated:egg', name: 'Boiled egg', quantityG: 50, kcal: 72, proteinG: 6.5, carbsG: 0.5, fatG: 5 },
    ],
  },

  // ─── VEGAN (variety) ───────────────────────────────────────────────
  {
    id: 'curated_vg_soy_yog_oats', name: 'Soy yogurt, protein & oats', diet: 'vegan', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:soy_yogurt', name: 'High-protein soy yogurt', quantityG: 200, kcal: 140, proteinG: 12, carbsG: 10, fatG: 6 },
      { foodRef: 'curated:pea_protein', name: 'Pea protein', quantityG: 15, kcal: 56, proteinG: 12, carbsG: 0.8, fatG: 1 },
      { foodRef: 'curated:oats', name: 'Rolled oats', quantityG: 40, kcal: 152, proteinG: 5, carbsG: 27, fatG: 2.8 },
      { foodRef: 'curated:berries', name: 'Berries', quantityG: 80, kcal: 35, proteinG: 0.5, carbsG: 8, fatG: 0 },
    ],
  },
  {
    id: 'curated_vg_smoothie_pb', name: 'Pea protein & PB smoothie', diet: 'vegan', slots: ['breakfast', 'snack'],
    items: [
      { foodRef: 'curated:pea_protein', name: 'Pea protein', quantityG: 33, kcal: 124, proteinG: 26, carbsG: 1.6, fatG: 2.3 },
      { foodRef: 'curated:banana', name: 'Banana', quantityG: 100, kcal: 89, proteinG: 1, carbsG: 23, fatG: 0.3 },
      { foodRef: 'curated:peanut_butter', name: 'Peanut butter', quantityG: 15, kcal: 88, proteinG: 4, carbsG: 2.4, fatG: 6 },
      { foodRef: 'curated:soy_milk', name: 'Soy milk', quantityG: 200, kcal: 66, proteinG: 6.6, carbsG: 2.4, fatG: 3.6 },
    ],
  },
  {
    id: 'curated_vg_tofu_avocado_toast', name: 'Tofu & avocado toast', diet: 'vegan', slots: ['breakfast'],
    items: [
      { foodRef: 'curated:tofu_firm', name: 'Firm tofu', quantityG: 150, kcal: 216, proteinG: 25.5, carbsG: 4.5, fatG: 12 },
      { foodRef: 'curated:wholemeal_toast', name: 'Wholemeal toast', quantityG: 60, kcal: 148, proteinG: 7.8, carbsG: 24, fatG: 2.1 },
      { foodRef: 'curated:avocado', name: 'Avocado', quantityG: 50, kcal: 80, proteinG: 1, carbsG: 4.5, fatG: 7.5 },
    ],
  },
  {
    id: 'curated_vg_tempeh_burrito', name: 'Tempeh burrito bowl', diet: 'vegan', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:tempeh', name: 'Tempeh', quantityG: 120, kcal: 230, proteinG: 24, carbsG: 10, fatG: 13 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 150, kcal: 195, proteinG: 3.8, carbsG: 42, fatG: 0.4 },
      { foodRef: 'curated:black_beans', name: 'Black beans', quantityG: 80, kcal: 91, proteinG: 6, carbsG: 16, fatG: 0.4 },
      { foodRef: 'curated:salsa', name: 'Salsa', quantityG: 40, kcal: 12, proteinG: 0.4, carbsG: 3, fatG: 0 },
    ],
  },
  {
    id: 'curated_vg_chickpea_quinoa', name: 'Chickpea & quinoa salad', diet: 'vegan', slots: ['lunch'],
    items: [
      { foodRef: 'curated:chickpeas', name: 'Chickpeas (cooked)', quantityG: 150, kcal: 246, proteinG: 13, carbsG: 41, fatG: 4 },
      { foodRef: 'curated:quinoa', name: 'Quinoa (cooked)', quantityG: 100, kcal: 120, proteinG: 4, carbsG: 21, fatG: 2 },
      { foodRef: 'curated:salad', name: 'Salad & lemon', quantityG: 100, kcal: 20, proteinG: 1.5, carbsG: 3, fatG: 0.2 },
      { foodRef: 'curated:olive_oil', name: 'Olive oil', quantityG: 8, kcal: 72, proteinG: 0, carbsG: 0, fatG: 8 },
    ],
  },
  {
    id: 'curated_vg_edamame_rice', name: 'Edamame, rice & veg', diet: 'vegan', slots: ['lunch'],
    items: [
      { foodRef: 'curated:edamame', name: 'Edamame', quantityG: 150, kcal: 182, proteinG: 18, carbsG: 13.5, fatG: 7.5 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 150, kcal: 195, proteinG: 3.8, carbsG: 42, fatG: 0.4 },
      { foodRef: 'curated:veg_mix', name: 'Mixed veg', quantityG: 100, kcal: 40, proteinG: 2, carbsG: 8, fatG: 0.5 },
    ],
  },
  {
    id: 'curated_vg_lentil_dahl', name: 'Lentil dahl & rice', diet: 'vegan', slots: ['dinner'],
    items: [
      { foodRef: 'curated:lentil_dahl', name: 'Red lentil dahl', quantityG: 250, kcal: 290, proteinG: 18, carbsG: 45, fatG: 3 },
      { foodRef: 'curated:white_rice', name: 'White rice (cooked)', quantityG: 150, kcal: 195, proteinG: 3.8, carbsG: 42, fatG: 0.4 },
      { foodRef: 'curated:spinach', name: 'Spinach', quantityG: 50, kcal: 12, proteinG: 1.5, carbsG: 2, fatG: 0.2 },
    ],
  },
  {
    id: 'curated_vg_blackbean_sweetpot', name: 'Black bean & sweet potato bowl', diet: 'vegan', slots: ['lunch', 'dinner'],
    items: [
      { foodRef: 'curated:black_beans', name: 'Black beans (cooked)', quantityG: 200, kcal: 227, proteinG: 14.5, carbsG: 41, fatG: 0.9 },
      { foodRef: 'curated:sweet_potato', name: 'Sweet potato', quantityG: 200, kcal: 172, proteinG: 3.2, carbsG: 40, fatG: 0.2 },
      { foodRef: 'curated:veg_mix', name: 'Roast veg', quantityG: 100, kcal: 40, proteinG: 2, carbsG: 8, fatG: 0.5 },
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
