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

  // ─── OMNIVORE (expanded) ───────────────────────────────────────────
  m('curated_om_chicken_egg_bagel', 'Chicken & egg breakfast bagel', 'omnivore', ['breakfast'], [{ food: 'eggs', g: 100 }, { food: 'chicken_breast', g: 80 }, { food: 'bagel', g: 85 }]),
  m('curated_om_turkey_egg_hash', 'Turkey & egg sweet potato hash', 'omnivore', ['breakfast'], [{ food: 'turkey_breast', g: 100 }, { food: 'eggs', g: 100 }, { food: 'sweet_potato', g: 150 }]),
  m('curated_om_smoked_salmon_scramble', 'Smoked salmon scrambled eggs', 'omnivore', ['breakfast'], [{ food: 'smoked_salmon', g: 70 }, { food: 'eggs', g: 100 }, { food: 'egg_whites', g: 100 }, { food: 'wholemeal_bread', g: 40 }]),
  m('curated_om_tuna_egg_omelette', 'Savoury tuna omelette', 'omnivore', ['breakfast', 'lunch'], [{ food: 'tuna_water', g: 80 }, { food: 'eggs', g: 150 }, { food: 'spinach', g: 60 }]),
  m('curated_om_chicken_jacket_potato', 'Chicken jacket potato & salad', 'omnivore', ['lunch'], [{ food: 'chicken_breast', g: 140 }, { food: 'white_potato', g: 300 }, { food: 'salad', g: 80 }]),
  m('curated_om_tuna_jacket_potato', 'Tuna jacket potato & beans', 'omnivore', ['lunch'], [{ food: 'tuna_water', g: 120 }, { food: 'white_potato', g: 300 }, { food: 'baked_beans', g: 100 }]),
  m('curated_om_chicken_quinoa_salad', 'Chicken & quinoa salad', 'omnivore', ['lunch'], [{ food: 'chicken_breast', g: 140 }, { food: 'quinoa', g: 150 }, { food: 'salad', g: 100 }, { food: 'olive_oil', g: 6 }]),
  m('curated_om_chicken_tomato_pasta', 'Chicken & tomato pasta', 'omnivore', ['lunch', 'dinner'], [{ food: 'chicken_breast', g: 150 }, { food: 'pasta', g: 70 }, { food: 'tomato_sauce', g: 100 }, { food: 'broccoli', g: 100 }]),
  m('curated_om_beef_rice_greens', 'Beef mince, rice & greens', 'omnivore', ['lunch', 'dinner'], [{ food: 'beef_mince_5', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'green_beans', g: 100 }]),
  m('curated_om_turkey_chilli_rice', 'Turkey chilli & rice', 'omnivore', ['lunch', 'dinner'], [{ food: 'turkey_mince', g: 150 }, { food: 'kidney_beans', g: 100 }, { food: 'white_rice', g: 150 }, { food: 'salsa', g: 40 }]),
  m('curated_om_salmon_potato_greens', 'Salmon, new potatoes & green beans', 'omnivore', ['dinner'], [{ food: 'salmon', g: 150 }, { food: 'white_potato', g: 250 }, { food: 'green_beans', g: 100 }]),
  m('curated_om_steak_rice_stirfry', 'Steak & rice stir-fry', 'omnivore', ['dinner'], [{ food: 'steak_lean', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'stirfry_veg', g: 120 }]),
  m('curated_om_prawn_egg_fried_rice', 'Prawn & egg fried rice', 'omnivore', ['lunch', 'dinner'], [{ food: 'prawns', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'eggs', g: 50 }, { food: 'peas', g: 80 }]),
  m('curated_om_cod_rice_peas', 'Cod, rice & peas', 'omnivore', ['lunch', 'dinner'], [{ food: 'cod', g: 200 }, { food: 'white_rice', g: 180 }, { food: 'peas', g: 100 }]),
  m('curated_om_chicken_fajita_wrap', 'Chicken fajita wrap', 'omnivore', ['lunch'], [{ food: 'chicken_breast', g: 130 }, { food: 'tortilla', g: 60 }, { food: 'salsa', g: 40 }, { food: 'salad', g: 60 }]),
  m('curated_om_turkey_lentilpasta_bol', 'Turkey & lentil pasta bolognese', 'omnivore', ['dinner'], [{ food: 'turkey_mince', g: 130 }, { food: 'lentil_pasta', g: 80 }, { food: 'tomato_sauce', g: 100 }]),
  m('curated_om_chicken_chow_mein', 'Chicken chow mein noodles', 'omnivore', ['lunch', 'dinner'], [{ food: 'chicken_breast', g: 150 }, { food: 'noodles', g: 200 }, { food: 'stirfry_veg', g: 120 }]),
  m('curated_om_tuna_pasta_salad', 'Tuna pasta salad', 'omnivore', ['lunch'], [{ food: 'tuna_water', g: 120 }, { food: 'pasta', g: 70 }, { food: 'salad', g: 80 }, { food: 'tomato_sauce', g: 60 }]),
  m('curated_om_chicken_apple_almonds', 'Chicken, apple & almonds', 'omnivore', ['snack'], [{ food: 'chicken_breast', g: 80 }, { food: 'apple', g: 120 }, { food: 'almonds', g: 15 }]),
  m('curated_om_tuna_ricecakes_avocado', 'Tuna & avocado rice cakes', 'omnivore', ['snack'], [{ food: 'tuna_water', g: 100 }, { food: 'rice_cakes', g: 24 }, { food: 'avocado', g: 40 }]),
  m('curated_om_turkey_cottage_plate', 'Turkey & cottage cheese plate', 'omnivore', ['snack'], [{ food: 'turkey_breast', g: 80 }, { food: 'cottage_cheese', g: 100 }, { food: 'salad', g: 50 }]),

  // ─── VEGETARIAN (expanded) ─────────────────────────────────────────
  m('curated_veg_yog_granola_seeds', 'Greek yogurt, granola & seeds', 'vegetarian', ['breakfast'], [{ food: 'greek_yogurt_0', g: 200 }, { food: 'granola', g: 30 }, { food: 'mixed_seeds', g: 10 }, { food: 'berries', g: 60 }]),
  m('curated_veg_skyr_berries_almonds', 'Skyr, berries & almonds', 'vegetarian', ['breakfast', 'snack'], [{ food: 'skyr', g: 200 }, { food: 'berries', g: 80 }, { food: 'almonds', g: 15 }]),
  m('curated_veg_eggs_avocado_toast', 'Eggs & avocado on toast', 'vegetarian', ['breakfast'], [{ food: 'eggs', g: 150 }, { food: 'wholemeal_bread', g: 60 }, { food: 'avocado', g: 50 }]),
  m('curated_veg_overnight_oats_skyr', 'Overnight oats with skyr', 'vegetarian', ['breakfast'], [{ food: 'oats', g: 50 }, { food: 'skyr', g: 150 }, { food: 'milk_skimmed', g: 100 }, { food: 'berries', g: 60 }]),
  m('curated_veg_cottage_toast_eggs', 'Cottage cheese & egg on toast', 'vegetarian', ['breakfast'], [{ food: 'cottage_cheese', g: 150 }, { food: 'eggs', g: 100 }, { food: 'wholemeal_bread', g: 40 }]),
  m('curated_veg_halloumi_quinoa_bowl', 'Halloumi & quinoa bowl', 'vegetarian', ['lunch', 'dinner'], [{ food: 'halloumi', g: 80 }, { food: 'quinoa', g: 150 }, { food: 'mixed_veg', g: 100 }]),
  m('curated_veg_paneer_chickpea_curry', 'Paneer & chickpea curry', 'vegetarian', ['lunch', 'dinner'], [{ food: 'paneer', g: 80 }, { food: 'chickpeas', g: 150 }, { food: 'white_rice', g: 150 }, { food: 'spinach', g: 60 }]),
  m('curated_veg_egg_lentil_salad', 'Egg & lentil salad bowl', 'vegetarian', ['lunch'], [{ food: 'eggs', g: 150 }, { food: 'lentils', g: 200 }, { food: 'salad', g: 100 }]),
  m('curated_veg_quorn_pasta', 'Meat-free mince pasta', 'vegetarian', ['lunch', 'dinner'], [{ food: 'quorn_mince', g: 150 }, { food: 'pasta', g: 70 }, { food: 'tomato_sauce', g: 100 }]),
  m('curated_veg_cottage_jacket_potato', 'Cottage cheese jacket potato', 'vegetarian', ['lunch'], [{ food: 'cottage_cheese', g: 200 }, { food: 'white_potato', g: 300 }, { food: 'salad', g: 60 }]),
  m('curated_veg_tofu_chickpea_curry', 'Tofu & chickpea curry', 'vegetarian', ['lunch', 'dinner'], [{ food: 'tofu_firm', g: 150 }, { food: 'chickpeas', g: 100 }, { food: 'white_rice', g: 150 }]),
  m('curated_veg_halloumi_wrap', 'Halloumi & salad wrap', 'vegetarian', ['lunch'], [{ food: 'halloumi', g: 80 }, { food: 'tortilla', g: 60 }, { food: 'chickpeas', g: 80 }, { food: 'salad', g: 60 }]),
  m('curated_veg_paneer_saag_potato', 'Paneer saag & potato', 'vegetarian', ['dinner'], [{ food: 'paneer', g: 100 }, { food: 'white_potato', g: 200 }, { food: 'spinach', g: 120 }]),
  m('curated_veg_egg_paneer_rice', 'Veggie egg & paneer rice', 'vegetarian', ['lunch', 'dinner'], [{ food: 'eggs', g: 100 }, { food: 'paneer', g: 60 }, { food: 'white_rice', g: 180 }, { food: 'peas', g: 80 }]),
  m('curated_veg_quorn_sweet_potato', 'Meat-free mince & sweet potato', 'vegetarian', ['dinner'], [{ food: 'quorn_mince', g: 150 }, { food: 'sweet_potato', g: 250 }, { food: 'green_beans', g: 100 }]),
  m('curated_veg_yog_pb_banana', 'Greek yogurt, PB & banana', 'vegetarian', ['snack'], [{ food: 'greek_yogurt_0', g: 200 }, { food: 'peanut_butter', g: 15 }, { food: 'banana', g: 80 }]),
  m('curated_veg_cottage_seeds_apple', 'Cottage cheese, seeds & apple', 'vegetarian', ['snack'], [{ food: 'cottage_cheese', g: 200 }, { food: 'mixed_seeds', g: 12 }, { food: 'apple', g: 100 }]),
  m('curated_veg_skyr_whey_berries', 'Skyr & whey berry bowl', 'vegetarian', ['snack'], [{ food: 'skyr', g: 150 }, { food: 'whey', g: 15 }, { food: 'berries', g: 80 }]),
  m('curated_veg_eggwhite_cottage_ricecakes', 'Egg white & cottage rice cakes', 'vegetarian', ['snack'], [{ food: 'egg_whites', g: 150 }, { food: 'cottage_cheese', g: 100 }, { food: 'rice_cakes', g: 24 }]),

  // ─── VEGAN (expanded) ──────────────────────────────────────────────
  m('curated_vg_soy_yog_oats_seeds', 'Soya yogurt oats & seeds', 'vegan', ['breakfast'], [{ food: 'soy_yogurt_hp', g: 200 }, { food: 'oats', g: 40 }, { food: 'mixed_seeds', g: 12 }, { food: 'soy_protein', g: 15 }]),
  m('curated_vg_pea_overnight_oats', 'Pea protein overnight oats', 'vegan', ['breakfast'], [{ food: 'oats', g: 50 }, { food: 'pea_protein', g: 20 }, { food: 'soy_milk', g: 200 }, { food: 'banana', g: 80 }]),
  m('curated_vg_tofu_scramble_beans', 'Tofu scramble & beans', 'vegan', ['breakfast'], [{ food: 'tofu_firm', g: 200 }, { food: 'baked_beans', g: 120 }, { food: 'wholemeal_bread', g: 40 }]),
  m('curated_vg_soy_smoothie_oats', 'Soya protein berry smoothie', 'vegan', ['breakfast', 'snack'], [{ food: 'soy_protein', g: 30 }, { food: 'oats', g: 30 }, { food: 'berries', g: 80 }, { food: 'soy_milk', g: 200 }]),
  m('curated_vg_tofu_avo_seeds_toast', 'Tofu, seeds & avocado toast', 'vegan', ['breakfast'], [{ food: 'tofu_firm', g: 150 }, { food: 'wholemeal_bread', g: 60 }, { food: 'avocado', g: 40 }, { food: 'mixed_seeds', g: 10 }]),
  m('curated_vg_seitan_noodles', 'Seitan & noodle stir-fry', 'vegan', ['lunch', 'dinner'], [{ food: 'seitan', g: 130 }, { food: 'noodles', g: 200 }, { food: 'stirfry_veg', g: 120 }]),
  m('curated_vg_tofu_sweet_potato', 'Tofu & sweet potato bowl', 'vegan', ['lunch', 'dinner'], [{ food: 'tofu_firm', g: 200 }, { food: 'sweet_potato', g: 200 }, { food: 'broccoli', g: 100 }]),
  m('curated_vg_tvp_bolognese', 'Soya mince bolognese', 'vegan', ['dinner'], [{ food: 'tvp_dry', g: 45 }, { food: 'pasta', g: 70 }, { food: 'tomato_sauce', g: 120 }]),
  m('curated_vg_seitan_potato_greens', 'Seitan, potatoes & greens', 'vegan', ['dinner'], [{ food: 'seitan', g: 130 }, { food: 'white_potato', g: 250 }, { food: 'green_beans', g: 100 }]),
  m('curated_vg_chickpea_lentil_curry', 'Chickpea & lentil curry', 'vegan', ['lunch', 'dinner'], [{ food: 'chickpeas', g: 200 }, { food: 'lentils', g: 100 }, { food: 'white_rice', g: 150 }, { food: 'spinach', g: 60 }]),
  m('curated_vg_tempeh_peanut_noodles', 'Tempeh peanut noodles', 'vegan', ['lunch', 'dinner'], [{ food: 'tempeh', g: 120 }, { food: 'noodles', g: 180 }, { food: 'stirfry_veg', g: 100 }, { food: 'peanut_butter', g: 12 }]),
  m('curated_vg_edamame_quinoa_salad', 'Edamame & quinoa salad', 'vegan', ['lunch'], [{ food: 'edamame', g: 150 }, { food: 'quinoa', g: 120 }, { food: 'salad', g: 100 }, { food: 'tahini', g: 12 }]),
  m('curated_vg_tofu_curry_rice', 'Tofu curry & rice', 'vegan', ['lunch', 'dinner'], [{ food: 'tofu_firm', g: 200 }, { food: 'white_rice', g: 180 }, { food: 'mixed_veg', g: 100 }]),
  m('curated_vg_blackbean_soya_burrito', 'Black bean & soya burrito', 'vegan', ['lunch', 'dinner'], [{ food: 'tvp_dry', g: 40 }, { food: 'black_beans', g: 120 }, { food: 'tortilla', g: 60 }, { food: 'salsa', g: 40 }]),
  m('curated_vg_lentil_dahl_chickpea', 'Lentil dahl with chickpeas', 'vegan', ['dinner'], [{ food: 'lentil_dahl', g: 250 }, { food: 'chickpeas', g: 120 }, { food: 'white_rice', g: 120 }]),
  m('curated_vg_seitan_quinoa_veg', 'Seitan, quinoa & roast veg', 'vegan', ['lunch', 'dinner'], [{ food: 'seitan', g: 120 }, { food: 'quinoa', g: 150 }, { food: 'mixed_veg', g: 120 }, { food: 'olive_oil', g: 6 }]),
  m('curated_vg_soy_yog_pb_banana', 'Soya yogurt, PB & banana', 'vegan', ['snack'], [{ food: 'soy_yogurt_hp', g: 200 }, { food: 'pea_protein', g: 15 }, { food: 'peanut_butter', g: 12 }, { food: 'banana', g: 80 }]),
  m('curated_vg_edamame_tahini_ricecakes', 'Edamame & tahini rice cakes', 'vegan', ['snack'], [{ food: 'edamame', g: 150 }, { food: 'rice_cakes', g: 24 }, { food: 'tahini', g: 10 }]),
  m('curated_vg_pea_oat_shake', 'Pea protein oat shake', 'vegan', ['snack'], [{ food: 'pea_protein', g: 30 }, { food: 'oats', g: 30 }, { food: 'soy_milk', g: 200 }]),
  m('curated_vg_soy_apple_almonds', 'Soya yogurt, apple & almonds', 'vegan', ['snack'], [{ food: 'soy_protein', g: 15 }, { food: 'soy_yogurt_hp', g: 200 }, { food: 'apple', g: 100 }, { food: 'almonds', g: 12 }]),

  // ── Pre-workout ────────────────────────────────────────────────────────
  // Easy-to-digest carbs with moderate protein, kept low in fat and fibre so
  // they sit light before training. Eaten roughly 60 to 90 minutes out.
  m('curated_om_pre_ricecakes_whey_banana', 'Rice cakes, whey & banana', 'omnivore', ['preworkout'], [{ food: 'rice_cakes', g: 30 }, { food: 'whey', g: 30 }, { food: 'banana', g: 120 }]),
  m('curated_om_pre_oats_whey_honey', 'Oats, whey & honey', 'omnivore', ['preworkout'], [{ food: 'oats', g: 50 }, { food: 'whey', g: 30 }, { food: 'honey', g: 15 }]),
  m('curated_om_pre_bagel_whey', 'Bagel & whey shake', 'omnivore', ['preworkout'], [{ food: 'bagel', g: 85 }, { food: 'whey', g: 30 }, { food: 'milk_skimmed', g: 200 }]),
  m('curated_om_pre_chicken_white_rice', 'Chicken & white rice', 'omnivore', ['preworkout'], [{ food: 'chicken_breast', g: 120 }, { food: 'white_rice', g: 150 }]),
  m('curated_veg_pre_skyr_oats_banana', 'Skyr, oats & banana', 'vegetarian', ['preworkout'], [{ food: 'skyr', g: 200 }, { food: 'oats', g: 40 }, { food: 'banana', g: 100 }]),
  m('curated_veg_pre_yogurt_ricecakes_honey', 'Greek yogurt, rice cakes & honey', 'vegetarian', ['preworkout'], [{ food: 'greek_yogurt_0', g: 200 }, { food: 'rice_cakes', g: 24 }, { food: 'honey', g: 15 }]),
  m('curated_veg_pre_cottage_bagel', 'Cottage cheese bagel', 'vegetarian', ['preworkout'], [{ food: 'cottage_cheese', g: 150 }, { food: 'bagel', g: 85 }, { food: 'honey', g: 10 }]),
  m('curated_vg_pre_soy_oats_banana', 'Soya protein, oats & banana', 'vegan', ['preworkout'], [{ food: 'soy_protein', g: 30 }, { food: 'oats', g: 50 }, { food: 'banana', g: 120 }]),
  m('curated_vg_pre_pea_ricecakes_banana', 'Pea protein, rice cakes & banana', 'vegan', ['preworkout'], [{ food: 'pea_protein', g: 30 }, { food: 'rice_cakes', g: 30 }, { food: 'banana', g: 120 }]),
  m('curated_vg_pre_tofu_white_rice', 'Tofu & white rice', 'vegan', ['preworkout'], [{ food: 'tofu_firm', g: 150 }, { food: 'white_rice', g: 150 }]),

  // ── Post-workout ───────────────────────────────────────────────────────
  // Fast protein plus carbs to refill glycogen and start recovery, eaten
  // soon after the session. Bigger and slightly higher carb than pre.
  m('curated_om_post_whey_banana_shake', 'Whey & banana shake', 'omnivore', ['postworkout'], [{ food: 'whey', g: 40 }, { food: 'banana', g: 120 }, { food: 'milk_skimmed', g: 250 }]),
  m('curated_om_post_chicken_rice_veg', 'Chicken, white rice & veg', 'omnivore', ['postworkout'], [{ food: 'chicken_breast', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'mixed_veg', g: 100 }]),
  m('curated_om_post_turkey_potato', 'Turkey & white potato', 'omnivore', ['postworkout'], [{ food: 'turkey_breast', g: 150 }, { food: 'white_potato', g: 250 }, { food: 'green_beans', g: 100 }]),
  m('curated_om_post_whey_oats_honey', 'Whey, oats & honey', 'omnivore', ['postworkout'], [{ food: 'whey', g: 40 }, { food: 'oats', g: 60 }, { food: 'honey', g: 15 }]),
  m('curated_om_post_tuna_bagel', 'Tuna bagel', 'omnivore', ['postworkout'], [{ food: 'tuna_water', g: 100 }, { food: 'bagel', g: 85 }]),
  m('curated_veg_post_skyr_berries_honey', 'Skyr, berries & honey', 'vegetarian', ['postworkout'], [{ food: 'skyr', g: 250 }, { food: 'berries', g: 100 }, { food: 'honey', g: 15 }]),
  m('curated_veg_post_whey_ricecakes_banana', 'Whey, rice cakes & banana', 'vegetarian', ['postworkout'], [{ food: 'whey', g: 40 }, { food: 'rice_cakes', g: 30 }, { food: 'banana', g: 120 }]),
  m('curated_veg_post_yogurt_granola_banana', 'Greek yogurt, granola & banana', 'vegetarian', ['postworkout'], [{ food: 'greek_yogurt_0', g: 200 }, { food: 'granola', g: 40 }, { food: 'banana', g: 100 }]),
  m('curated_vg_post_soy_banana_shake', 'Soya protein & banana shake', 'vegan', ['postworkout'], [{ food: 'soy_protein', g: 35 }, { food: 'banana', g: 120 }, { food: 'soy_milk', g: 250 }]),
  m('curated_vg_post_tofu_rice_veg', 'Tofu, white rice & veg', 'vegan', ['postworkout'], [{ food: 'tofu_firm', g: 200 }, { food: 'white_rice', g: 180 }, { food: 'mixed_veg', g: 100 }]),
  m('curated_vg_post_pea_oats_berries', 'Pea protein, oats & berries', 'vegan', ['postworkout'], [{ food: 'pea_protein', g: 35 }, { food: 'oats', g: 60 }, { food: 'berries', g: 80 }]),
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
