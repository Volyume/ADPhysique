/**
 * food/curatedMeals.js
 *
 * Curated clean-bodybuilding meal library for the Suggested tab. Each meal
 * is defined as foods + grams ONLY; item and total macros are COMPUTED from
 * the staple-food table (curatedFoods.js), never hand-typed. Grounded in
 * the 2026-05-29 nutrition research (ISSN position stands, Morton 2018,
 * Helms 2014, Schoenfeld & Aragon 2018) and the founder's decisions.
 *
 * Principles:
 *   - Protein-forward (~25-40g meals, leucine threshold).
 *   - Fat is a deliberate SPREAD: lean meals (<=~10g) for around training /
 *     a tight fat budget, balanced meals that carry the day's healthy fats.
 *     The engine surfaces leaner meals once the user has had their fat.
 *     (No auto pre/post-workout detection and no goal tags: the macro
 *     targets the engine ranks against are already goal-driven.)
 *   - Higher-protein plant staples (seitan, soya mince/TVP, soy/pea protein,
 *     tempeh, edamame) so vegan/vegetarian meals clear the protein target.
 *   - British supermarket staples only.
 *
 * Schema (per meal):
 *   id, name, diet ('omnivore'|'vegetarian'|'vegan'), slots[], components[{food,g}]
 * where `food` is a key into CURATED_FOODS.
 */

import { CURATED_FOODS, resolveComponent } from './curatedFoods';

export const DIETS = Object.freeze(['omnivore', 'vegetarian', 'vegan']);

// vegan ⊂ vegetarian ⊂ omnivore.
export function dietAllows(userDiet, mealDiet) {
  if (userDiet === 'vegan') return mealDiet === 'vegan';
  if (userDiet === 'vegetarian') return mealDiet === 'vegan' || mealDiet === 'vegetarian';
  return true;
}

const m = (id, name, diet, slots, components) => ({ id, name, diet, slots, components });

export const CURATED_MEALS = Object.freeze([
  // ─── OMNIVORE ──────────────────────────────────────────────────────
  m('curated_om_oats_whey_banana', 'Oats, whey & banana', 'omnivore', ['breakfast'], [{ food: 'oats', g: 60 }, { food: 'whey', g: 35 }, { food: 'banana', g: 120 }]),
  m('curated_om_protein_pancakes', 'Protein pancakes & banana', 'omnivore', ['breakfast'], [{ food: 'oats', g: 50 }, { food: 'egg_whites', g: 150 }, { food: 'whey', g: 20 }, { food: 'banana', g: 80 }]),
  m('curated_om_egg_omelette_toast', 'Egg & veg omelette with toast', 'omnivore', ['breakfast'], [{ food: 'eggs', g: 150 }, { food: 'mixed_veg', g: 80 }, { food: 'wholemeal_bread', g: 40 }]),
  m('curated_om_smoked_salmon_bagel', 'Smoked salmon & egg bagel', 'omnivore', ['breakfast'], [{ food: 'smoked_salmon', g: 80 }, { food: 'bagel', g: 85 }, { food: 'eggs', g: 50 }]),
  m('curated_om_chicken_rice_broc', 'Chicken, rice & broccoli', 'omnivore', ['lunch', 'dinner'], [{ food: 'chicken_breast', g: 150 }, { food: 'white_rice', g: 200 }, { food: 'broccoli', g: 120 }]),
  m('curated_om_chicken_sweetpot', 'Chicken, sweet potato & spinach', 'omnivore', ['lunch', 'dinner'], [{ food: 'chicken_breast', g: 150 }, { food: 'sweet_potato', g: 250 }, { food: 'spinach', g: 80 }]),
  m('curated_om_cod_sweet_potato', 'Cod, sweet potato & veg', 'omnivore', ['lunch', 'dinner'], [{ food: 'cod', g: 200 }, { food: 'sweet_potato', g: 250 }, { food: 'green_beans', g: 120 }]),
  m('curated_om_beef_burrito_bowl', 'Beef burrito bowl', 'omnivore', ['lunch', 'dinner'], [{ food: 'beef_mince_5', g: 150 }, { food: 'white_rice', g: 150 }, { food: 'black_beans', g: 80 }, { food: 'salsa', g: 40 }]),
  m('curated_om_prawn_noodles', 'Prawn & noodle stir-fry', 'omnivore', ['lunch', 'dinner'], [{ food: 'prawns', g: 150 }, { food: 'noodles', g: 150 }, { food: 'stirfry_veg', g: 120 }]),
  m('curated_om_turkey_avocado_wrap', 'Turkey & avocado wrap', 'omnivore', ['lunch'], [{ food: 'turkey_breast', g: 120 }, { food: 'tortilla', g: 60 }, { food: 'avocado', g: 60 }, { food: 'salad', g: 60 }]),
  m('curated_om_steak_potato_greens', 'Lean steak, potatoes & greens', 'omnivore', ['dinner'], [{ food: 'steak_lean', g: 150 }, { food: 'white_potato', g: 250 }, { food: 'salad', g: 100 }]),
  m('curated_om_salmon_rice_asparagus', 'Salmon, rice & asparagus', 'omnivore', ['dinner'], [{ food: 'salmon', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'asparagus', g: 100 }]),
  m('curated_om_turkey_bolognese', 'Turkey bolognese & pasta', 'omnivore', ['dinner'], [{ food: 'turkey_mince', g: 150 }, { food: 'pasta', g: 70 }, { food: 'tomato_sauce', g: 100 }]),
  m('curated_om_whitefish_wedges', 'White fish, wedges & peas', 'omnivore', ['dinner'], [{ food: 'cod', g: 200 }, { food: 'potato_wedges', g: 200 }, { food: 'peas', g: 80 }]),
  m('curated_om_tuna_ricecakes', 'Tuna & rice cakes', 'omnivore', ['snack'], [{ food: 'tuna_water', g: 100 }, { food: 'rice_cakes', g: 32 }]),
  m('curated_om_eggs_apple_snack', 'Boiled eggs & apple', 'omnivore', ['snack'], [{ food: 'eggs', g: 150 }, { food: 'apple', g: 150 }]),

  // ─── VEGETARIAN ────────────────────────────────────────────────────
  m('curated_veg_yog_oats_berries', 'Greek yogurt, oats & berries', 'vegetarian', ['breakfast'], [{ food: 'greek_yogurt_0', g: 200 }, { food: 'oats', g: 40 }, { food: 'berries', g: 80 }, { food: 'honey', g: 15 }]),
  m('curated_veg_egg_scramble_beans', 'Egg scramble, toast & beans', 'vegetarian', ['breakfast'], [{ food: 'eggs', g: 100 }, { food: 'egg_whites', g: 120 }, { food: 'wholemeal_bread', g: 40 }, { food: 'baked_beans', g: 100 }]),
  m('curated_veg_skyr_oats_pb', 'Skyr, oats & peanut butter', 'vegetarian', ['breakfast'], [{ food: 'skyr', g: 200 }, { food: 'oats', g: 40 }, { food: 'peanut_butter', g: 15 }]),
  m('curated_veg_cottage_pancakes', 'Cottage cheese pancakes', 'vegetarian', ['breakfast'], [{ food: 'cottage_cheese', g: 150 }, { food: 'oats', g: 40 }, { food: 'egg_whites', g: 100 }]),
  m('curated_veg_protein_smoothie', 'Protein oat smoothie', 'vegetarian', ['breakfast', 'snack'], [{ food: 'whey', g: 30 }, { food: 'oats', g: 30 }, { food: 'berries', g: 80 }, { food: 'milk_skimmed', g: 200 }]),
  m('curated_veg_tofu_stirfry_rice', 'Tofu stir-fry with rice', 'vegetarian', ['lunch', 'dinner'], [{ food: 'tofu_firm', g: 200 }, { food: 'white_rice', g: 180 }, { food: 'stirfry_veg', g: 120 }]),
  m('curated_veg_lentil_quinoa', 'Lentil & quinoa bowl', 'vegetarian', ['lunch'], [{ food: 'lentils', g: 250 }, { food: 'quinoa', g: 120 }, { food: 'mixed_veg', g: 120 }]),
  m('curated_veg_halloumi_chickpea', 'Halloumi & chickpea salad', 'vegetarian', ['lunch', 'dinner'], [{ food: 'halloumi', g: 80 }, { food: 'chickpeas', g: 150 }, { food: 'salad', g: 120 }]),
  m('curated_veg_paneer_rice', 'Paneer curry & rice', 'vegetarian', ['lunch', 'dinner'], [{ food: 'paneer', g: 100 }, { food: 'white_rice', g: 150 }, { food: 'mixed_veg', g: 100 }]),
  m('curated_veg_egg_fried_rice', 'Egg fried rice', 'vegetarian', ['lunch', 'dinner'], [{ food: 'eggs', g: 100 }, { food: 'egg_whites', g: 100 }, { food: 'white_rice', g: 200 }, { food: 'peas', g: 100 }]),
  m('curated_veg_tofu_katsu', 'Tofu katsu & rice', 'vegetarian', ['lunch', 'dinner'], [{ food: 'tofu_firm', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'mixed_veg', g: 80 }]),
  m('curated_veg_tempeh_sweet_potato', 'Tempeh & sweet potato', 'vegetarian', ['dinner'], [{ food: 'tempeh', g: 120 }, { food: 'sweet_potato', g: 250 }, { food: 'spinach', g: 100 }]),
  m('curated_veg_quorn_chilli', 'Meat-free chilli & rice', 'vegetarian', ['dinner'], [{ food: 'quorn_mince', g: 150 }, { food: 'kidney_beans', g: 100 }, { food: 'white_rice', g: 120 }]),
  m('curated_veg_cottage_pineapple', 'Cottage cheese, pineapple & rice cakes', 'vegetarian', ['snack'], [{ food: 'cottage_cheese', g: 200 }, { food: 'pineapple', g: 100 }, { food: 'rice_cakes', g: 24 }]),
  m('curated_veg_yog_whey_almonds', 'Greek yogurt, whey & almonds', 'vegetarian', ['snack'], [{ food: 'greek_yogurt_2', g: 150 }, { food: 'whey', g: 15 }, { food: 'almonds', g: 15 }]),
  m('curated_veg_edamame_egg', 'Edamame & boiled egg', 'vegetarian', ['snack'], [{ food: 'edamame', g: 100 }, { food: 'eggs', g: 50 }]),

  // ─── VEGAN ─────────────────────────────────────────────────────────
  m('curated_vg_soy_oats_banana', 'Soya protein oats & banana', 'vegan', ['breakfast'], [{ food: 'oats', g: 60 }, { food: 'soy_protein', g: 30 }, { food: 'banana', g: 120 }]),
  m('curated_vg_soy_yog_oats', 'Soya yogurt, protein & oats', 'vegan', ['breakfast'], [{ food: 'soy_yogurt_hp', g: 200 }, { food: 'pea_protein', g: 15 }, { food: 'oats', g: 40 }, { food: 'berries', g: 80 }]),
  m('curated_vg_smoothie_pb', 'Pea protein & PB smoothie', 'vegan', ['breakfast', 'snack'], [{ food: 'pea_protein', g: 33 }, { food: 'banana', g: 100 }, { food: 'peanut_butter', g: 15 }, { food: 'soy_milk', g: 200 }]),
  m('curated_vg_tofu_scramble', 'Tofu scramble on toast', 'vegan', ['breakfast'], [{ food: 'tofu_firm', g: 200 }, { food: 'wholemeal_bread', g: 40 }, { food: 'spinach', g: 60 }]),
  m('curated_vg_tofu_avocado_toast', 'Tofu & avocado toast', 'vegan', ['breakfast'], [{ food: 'tofu_firm', g: 150 }, { food: 'wholemeal_bread', g: 60 }, { food: 'avocado', g: 50 }]),
  m('curated_vg_seitan_rice_veg', 'Seitan, rice & veg stir-fry', 'vegan', ['lunch', 'dinner'], [{ food: 'seitan', g: 130 }, { food: 'white_rice', g: 180 }, { food: 'stirfry_veg', g: 120 }]),
  m('curated_vg_tempeh_quinoa', 'Tempeh, quinoa & roast veg', 'vegan', ['lunch', 'dinner'], [{ food: 'tempeh', g: 120 }, { food: 'quinoa', g: 120 }, { food: 'mixed_veg', g: 120 }, { food: 'olive_oil', g: 8 }]),
  m('curated_vg_tempeh_burrito', 'Tempeh burrito bowl', 'vegan', ['lunch', 'dinner'], [{ food: 'tempeh', g: 120 }, { food: 'white_rice', g: 150 }, { food: 'black_beans', g: 80 }, { food: 'salsa', g: 40 }]),
  m('curated_vg_lentil_pasta', 'High-protein lentil pasta', 'vegan', ['lunch', 'dinner'], [{ food: 'lentil_pasta', g: 100 }, { food: 'tomato_sauce', g: 120 }, { food: 'mixed_veg', g: 100 }]),
  m('curated_vg_chickpea_quinoa', 'Chickpea & quinoa salad', 'vegan', ['lunch'], [{ food: 'chickpeas', g: 150 }, { food: 'quinoa', g: 100 }, { food: 'salad', g: 100 }, { food: 'olive_oil', g: 8 }]),
  m('curated_vg_edamame_rice', 'Edamame, rice & veg', 'vegan', ['lunch'], [{ food: 'edamame', g: 150 }, { food: 'white_rice', g: 150 }, { food: 'mixed_veg', g: 100 }]),
  m('curated_vg_tvp_chilli_rice', 'Soya mince chilli with rice', 'vegan', ['dinner'], [{ food: 'tvp_dry', g: 50 }, { food: 'kidney_beans', g: 120 }, { food: 'white_rice', g: 150 }, { food: 'tomato_sauce', g: 100 }]),
  m('curated_vg_lentil_dahl', 'Lentil dahl & rice', 'vegan', ['dinner'], [{ food: 'lentil_dahl', g: 250 }, { food: 'white_rice', g: 150 }, { food: 'spinach', g: 50 }]),
  m('curated_vg_blackbean_sweetpot', 'Black bean & sweet potato bowl', 'vegan', ['lunch', 'dinner'], [{ food: 'black_beans', g: 200 }, { food: 'sweet_potato', g: 200 }, { food: 'mixed_veg', g: 100 }]),
  m('curated_vg_pea_shake_berries', 'Pea protein shake & berries', 'vegan', ['snack'], [{ food: 'pea_protein', g: 33 }, { food: 'berries', g: 100 }]),
  m('curated_vg_soy_yog_granola_pb', 'Soya yogurt, granola & peanut butter', 'vegan', ['snack'], [{ food: 'soy_yogurt_hp', g: 200 }, { food: 'granola', g: 25 }, { food: 'peanut_butter', g: 12 }]),
]);

const round = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;

/** Resolve a meal's components to diary-ready items with computed macros. */
export function mealItems(meal) {
  return (meal.components || [])
    .map((c) => resolveComponent(c.food, c.g))
    .filter(Boolean);
}

/** Total macros for a resolved item list. */
export function mealTotals(items) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const it of items || []) {
    kcal += Number(it.kcal) || 0;
    protein += Number(it.proteinG) || 0;
    carbs += Number(it.carbsG) || 0;
    fat += Number(it.fatG) || 0;
  }
  return { kcal: round(kcal), protein: r1(protein), carbs: r1(carbs), fat: r1(fat) };
}

/**
 * Curated meals filtered to the user's diet + (optionally) the slot being
 * logged, in the engine-candidate shape ({ id, name, slots, itemCount,
 * totals, diet, items }), macros computed from the food table. Pass these
 * as `savedMeals` to rankSuggestions.
 */
export function getCuratedCandidates({ diet = 'omnivore', slot = null } = {}) {
  const out = [];
  for (const meal of CURATED_MEALS) {
    if (!dietAllows(diet, meal.diet)) continue;
    if (slot && !(meal.slots.includes(slot) || meal.slots.includes('any'))) continue;
    const items = mealItems(meal);
    out.push({
      id: meal.id,
      name: meal.name,
      diet: meal.diet,
      slots: meal.slots,
      items,
      itemCount: items.length,
      totals: mealTotals(items),
    });
  }
  return out;
}

// Re-export so callers have one import site for the library + its foods.
export { CURATED_FOODS };
