/**
 * food/curatedMeals.js
 *
 * Curated UK bodybuilder meal library. Each meal is foods + grams ONLY; item
 * and total macros are COMPUTED from the staple-food table (curatedFoods.js),
 * never hand-typed.
 *
 * SOURCE (rebuild 2026-06-15): every meal traces to the founder research report
 * "Volyume Curated Meal & Food Library: UK Bodybuilder Research Report" —
 * sections B (meal library) and C/D (breakfasts + UK naming). The previous
 * library was rebuilt out because its meals were not research-grounded. Rules
 * from the report enforced here:
 *   - Breakfast = real UK bodybuilder breakfasts only (eggs, oats, Greek
 *     yoghurt/skyr, protein pancakes/shakes, smoked salmon, bacon medallions) —
 *     never tuna, never a savoury hash-of-leftovers in the breakfast slot.
 *   - A meal named after a protein contains that protein (no "tuna" with cod).
 *   - Tuna is a lunch/dinner/snack staple only.
 *   - UK supermarket staples + UK naming (short, ingredient-led, lowercase "&").
 *   - Protein-forward; a deliberate lean/balanced fat spread across the set.
 *
 * Diet tag = the BROADEST diet the meal qualifies for (vegan ⊂ vegetarian ⊂
 * pescatarian ⊂ omnivore), so the engine's dietAllows cascade shows a vegan
 * meal to everyone and a dairy/egg meal to vegetarians and up. Quorn is
 * egg-bound, so Quorn meals are 'vegetarian', not 'vegan' (report caveat).
 * Fish and seafood meals with no meat are 'pescatarian' (dietary-needs
 * build 2026-07-09): pescatarian sits between vegetarian and omnivore, so
 * omnivores still see every fish meal exactly as before.
 *
 * Phase B (dietary-needs build, 2026-07-09): 26 new diet-tagged meals added
 * (10 pescatarian, 9 vegetarian, 7 vegan) so restricted diets get a spread
 * comparable to omnivore, not just a thin re-tag of existing meals. All new
 * meals reuse existing curatedFoods.js staples (no new foods, no schema
 * change); macros are computed the same way as every other meal here.
 *
 * Schema (per meal): id, name, diet, slots[], components[{food,g}].
 */

import { CURATED_FOODS, resolveComponent } from './curatedFoods';
import { foodExcluded } from './foodRoles';

export const DIETS = Object.freeze(['omnivore', 'pescatarian', 'vegetarian', 'vegan']);

// vegan ⊂ vegetarian ⊂ pescatarian ⊂ omnivore.
const DIET_RANK = Object.freeze({ vegan: 0, vegetarian: 1, pescatarian: 2, omnivore: 3 });
export function dietAllows(userDiet, mealDiet) {
  const user = DIET_RANK[userDiet] ?? DIET_RANK.omnivore;
  const meal = DIET_RANK[mealDiet] ?? DIET_RANK.omnivore;
  return meal <= user;
}

const m = (id, name, diet, slots, components) => ({ id, name, diet, slots, components });

export const CURATED_MEALS = Object.freeze([
  // ─── OMNIVORE — meat/fish (report §B omnivore) ──────────────────────────
  // Breakfast: only the genuinely omnivore (fish/bacon) ones; the egg/dairy
  // breakfasts are tagged vegetarian below and cascade up to omnivore.
  m('curated_om_eggs_salmon_oats', 'Scrambled eggs, smoked salmon & oats', 'pescatarian', ['breakfast'], [{ food: 'eggs', g: 150 }, { food: 'smoked_salmon', g: 50 }, { food: 'oats', g: 50 }]),
  m('curated_om_eggs_toast_salmon', 'Eggs on toast & smoked salmon', 'pescatarian', ['breakfast'], [{ food: 'eggs', g: 150 }, { food: 'wholemeal_bread', g: 80 }, { food: 'smoked_salmon', g: 50 }]),
  m('curated_om_bacon_eggs', 'Bacon medallions & eggs', 'omnivore', ['breakfast'], [{ food: 'bacon_medallions', g: 90 }, { food: 'eggs', g: 150 }]),

  // Lunch / dinner
  m('curated_om_chicken_rice', 'Chicken & rice', 'omnivore', ['lunch', 'dinner'], [{ food: 'chicken_breast', g: 150 }, { food: 'white_rice', g: 250 }, { food: 'broccoli', g: 120 }, { food: 'olive_oil', g: 10 }]),
  m('curated_om_beef_chilli', 'Beef mince chilli & rice', 'omnivore', ['lunch', 'dinner'], [{ food: 'beef_mince_5', g: 150 }, { food: 'kidney_beans', g: 100 }, { food: 'white_rice', g: 150 }, { food: 'tomato_sauce', g: 80 }]),
  m('curated_om_spag_bol', 'Spaghetti bolognese', 'omnivore', ['dinner'], [{ food: 'beef_mince_5', g: 150 }, { food: 'pasta', g: 70 }, { food: 'tomato_sauce', g: 120 }]),
  m('curated_om_turkey_stirfry', 'Turkey mince stir-fry', 'omnivore', ['lunch', 'dinner'], [{ food: 'turkey_mince', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'stirfry_veg', g: 120 }, { food: 'olive_oil', g: 10 }]),
  m('curated_om_salmon_rice_broccoli', 'Baked salmon, rice & broccoli', 'pescatarian', ['lunch', 'dinner'], [{ food: 'salmon', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'broccoli', g: 120 }]),
  m('curated_om_cod_bake', 'Cod bake', 'pescatarian', ['lunch', 'dinner'], [{ food: 'cod', g: 200 }, { food: 'white_potato', g: 250 }, { food: 'cheddar_light', g: 25 }]),
  m('curated_om_chicken_sweetpot_greens', 'Chicken, sweet potato & greens', 'omnivore', ['lunch', 'dinner'], [{ food: 'chicken_breast', g: 150 }, { food: 'sweet_potato', g: 250 }, { food: 'green_beans', g: 120 }, { food: 'olive_oil', g: 10 }]),
  m('curated_om_chicken_jacket', 'Chicken jacket potato & salad', 'omnivore', ['lunch', 'dinner'], [{ food: 'chicken_breast', g: 140 }, { food: 'white_potato', g: 300 }, { food: 'salad', g: 80 }, { food: 'olive_oil', g: 10 }]),
  m('curated_om_jacket_tuna', 'Jacket potato & tuna', 'pescatarian', ['lunch', 'dinner'], [{ food: 'white_potato', g: 300 }, { food: 'tuna_water', g: 120 }, { food: 'salad', g: 60 }]),
  m('curated_om_steak_potatoes', 'Steak & potatoes', 'omnivore', ['dinner'], [{ food: 'steak_lean', g: 150 }, { food: 'white_potato', g: 250 }, { food: 'salad', g: 100 }]),
  m('curated_om_prawn_stirfry', 'King prawn stir-fry & rice', 'pescatarian', ['lunch', 'dinner'], [{ food: 'prawns', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'stirfry_veg', g: 120 }, { food: 'olive_oil', g: 10 }]),
  m('curated_om_chicken_pasta', 'Chicken & tomato pasta', 'omnivore', ['lunch', 'dinner'], [{ food: 'chicken_breast', g: 150 }, { food: 'pasta', g: 80 }, { food: 'tomato_sauce', g: 100 }, { food: 'broccoli', g: 100 }, { food: 'olive_oil', g: 10 }]),
  m('curated_om_beef_rice_greens', 'Beef mince, rice & greens', 'omnivore', ['lunch', 'dinner'], [{ food: 'beef_mince_5', g: 150 }, { food: 'white_rice', g: 200 }, { food: 'green_beans', g: 100 }]),
  m('curated_om_turkey_potato_greens', 'Turkey mince, potato & greens', 'omnivore', ['lunch', 'dinner'], [{ food: 'turkey_mince', g: 150 }, { food: 'white_potato', g: 300 }, { food: 'green_beans', g: 120 }, { food: 'olive_oil', g: 10 }]),
  m('curated_om_salmon_sweetpot', 'Salmon, sweet potato & broccoli', 'pescatarian', ['dinner'], [{ food: 'salmon', g: 150 }, { food: 'sweet_potato', g: 250 }, { food: 'broccoli', g: 120 }]),
  m('curated_om_cod_rice_peas', 'Cod, rice & peas', 'pescatarian', ['lunch', 'dinner'], [{ food: 'cod', g: 200 }, { food: 'white_rice', g: 200 }, { food: 'peas', g: 100 }, { food: 'olive_oil', g: 10 }]),
  m('curated_om_chicken_potato_veg', 'Chicken, potatoes & veg', 'omnivore', ['lunch', 'dinner'], [{ food: 'chicken_breast', g: 150 }, { food: 'white_potato', g: 300 }, { food: 'mixed_veg', g: 120 }, { food: 'olive_oil', g: 10 }]),

  // Snack / pre / post
  m('curated_om_sn_tuna_ricecakes', 'Tuna & rice cakes', 'pescatarian', ['snack'], [{ food: 'tuna_water', g: 100 }, { food: 'rice_cakes', g: 30 }]),
  m('curated_om_pre_chicken_rice', 'Chicken & white rice', 'omnivore', ['preworkout'], [{ food: 'chicken_breast', g: 120 }, { food: 'white_rice', g: 150 }]),
  m('curated_om_post_chicken_rice', 'Chicken & white rice', 'omnivore', ['postworkout'], [{ food: 'chicken_breast', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'mixed_veg', g: 100 }]),

  // ─── PESCATARIAN (dietary-needs Phase B, 2026-07-09): the pescatarian axis
  // (added 2026-07-09) only had the fish/seafood dishes re-tagged out of the
  // old omnivore set (9 meals) behind it. These are genuinely new meals so a
  // pescatarian user sees a comparable spread to omnivore, not a thin re-tag.
  m('curated_pesc_bf_salmon_bagel', 'Smoked salmon, egg & bagel', 'pescatarian', ['breakfast'], [{ food: 'smoked_salmon', g: 60 }, { food: 'eggs', g: 100 }, { food: 'bagel', g: 90 }]),
  m('curated_pesc_bf_salmon_sourdough', 'Smoked salmon, spinach & sourdough', 'pescatarian', ['breakfast'], [{ food: 'smoked_salmon', g: 60 }, { food: 'spinach', g: 60 }, { food: 'sourdough', g: 90 }]),
  m('curated_pesc_tuna_sweetpot_salad', 'Tuna, sweet potato & salad', 'pescatarian', ['lunch', 'dinner'], [{ food: 'tuna_water', g: 120 }, { food: 'sweet_potato', g: 250 }, { food: 'salad', g: 80 }]),
  m('curated_pesc_salmon_quinoa_greenbeans', 'Salmon, quinoa & green beans', 'pescatarian', ['lunch', 'dinner'], [{ food: 'salmon', g: 150 }, { food: 'quinoa', g: 180 }, { food: 'green_beans', g: 120 }]),
  m('curated_pesc_cod_sweetpot_spinach', 'Cod, sweet potato & spinach', 'pescatarian', ['lunch', 'dinner'], [{ food: 'cod', g: 200 }, { food: 'sweet_potato', g: 250 }, { food: 'spinach', g: 80 }]),
  m('curated_pesc_prawn_tomato_pasta', 'King prawn & tomato pasta', 'pescatarian', ['lunch', 'dinner'], [{ food: 'prawns', g: 150 }, { food: 'pasta', g: 80 }, { food: 'tomato_sauce', g: 100 }]),
  m('curated_pesc_tuna_bean_rice', 'Tuna, bean & rice bowl', 'pescatarian', ['lunch', 'dinner'], [{ food: 'tuna_water', g: 120 }, { food: 'kidney_beans', g: 100 }, { food: 'white_rice', g: 150 }, { food: 'salad', g: 60 }]),
  m('curated_pesc_prawn_noodles', 'King prawn noodles', 'pescatarian', ['lunch', 'dinner'], [{ food: 'prawns', g: 150 }, { food: 'noodles', g: 200 }, { food: 'stirfry_veg', g: 120 }]),
  m('curated_pesc_sn_salmon_cottage', 'Smoked salmon & cottage cheese', 'pescatarian', ['snack'], [{ food: 'smoked_salmon', g: 50 }, { food: 'cottage_cheese', g: 150 }]),
  m('curated_pesc_sn_prawn_avocado', 'Prawns & avocado', 'pescatarian', ['snack'], [{ food: 'prawns', g: 120 }, { food: 'avocado', g: 60 }]),

  // ─── VEGETARIAN — dairy/egg, no meat/fish (report §B vegetarian + the
  //     egg/dairy "omnivore" breakfasts, which are vegetarian by ingredient) ─
  m('curated_veg_protein_porridge', 'Protein porridge', 'vegetarian', ['breakfast'], [{ food: 'oats', g: 60 }, { food: 'whey', g: 30 }, { food: 'milk_skimmed', g: 250 }, { food: 'berries', g: 80 }, { food: 'peanut_butter', g: 20 }]),
  m('curated_veg_overnight_oats', 'Overnight oats', 'vegetarian', ['breakfast'], [{ food: 'oats', g: 60 }, { food: 'greek_yogurt_0', g: 100 }, { food: 'whey', g: 30 }, { food: 'milk_skimmed', g: 150 }, { food: 'peanut_butter', g: 20 }]),
  m('curated_veg_protein_pancakes', 'Protein pancakes', 'vegetarian', ['breakfast'], [{ food: 'oats', g: 50 }, { food: 'whey', g: 30 }, { food: 'egg_whites', g: 150 }, { food: 'banana', g: 60 }, { food: 'peanut_butter', g: 20 }]),
  m('curated_veg_greek_yogurt_bowl', 'Greek yoghurt bowl', 'vegetarian', ['breakfast'], [{ food: 'greek_yogurt_0', g: 250 }, { food: 'berries', g: 80 }, { food: 'honey', g: 15 }, { food: 'almonds', g: 15 }]),
  m('curated_veg_skyr_berry_bowl', 'Skyr & berry bowl', 'vegetarian', ['breakfast'], [{ food: 'skyr', g: 250 }, { food: 'granola', g: 30 }, { food: 'mixed_seeds', g: 20 }]),
  m('curated_veg_eggwhite_scramble_sourdough', 'Egg-white scramble, spinach & sourdough', 'vegetarian', ['breakfast'], [{ food: 'egg_whites', g: 150 }, { food: 'eggs', g: 100 }, { food: 'spinach', g: 60 }, { food: 'sourdough', g: 80 }]),
  m('curated_veg_cottage_toast_egg', 'Cottage cheese on toast & poached egg', 'vegetarian', ['breakfast'], [{ food: 'cottage_cheese', g: 150 }, { food: 'wholemeal_bread', g: 80 }, { food: 'eggs', g: 50 }]),

  m('curated_veg_quorn_chilli', 'Quorn mince chilli & rice', 'vegetarian', ['lunch', 'dinner'], [{ food: 'quorn_mince', g: 150 }, { food: 'kidney_beans', g: 100 }, { food: 'white_rice', g: 150 }, { food: 'tomato_sauce', g: 80 }, { food: 'olive_oil', g: 10 }]),
  m('curated_veg_quorn_bolognese', 'Quorn bolognese', 'vegetarian', ['dinner'], [{ food: 'quorn_mince', g: 150 }, { food: 'pasta', g: 70 }, { food: 'tomato_sauce', g: 120 }, { food: 'olive_oil', g: 10 }]),
  m('curated_veg_quorn_pieces_curry', 'Quorn pieces curry & rice', 'vegetarian', ['lunch', 'dinner'], [{ food: 'quorn_pieces', g: 150 }, { food: 'white_rice', g: 180 }, { food: 'mixed_veg', g: 100 }, { food: 'olive_oil', g: 10 }]),
  m('curated_veg_halloumi_veg', 'Halloumi & roast veg', 'vegetarian', ['lunch', 'dinner'], [{ food: 'halloumi', g: 80 }, { food: 'white_potato', g: 200 }, { food: 'mixed_veg', g: 120 }]),
  m('curated_veg_egg_fried_rice_tofu', 'Egg-fried rice with tofu', 'vegetarian', ['lunch', 'dinner'], [{ food: 'eggs', g: 100 }, { food: 'tofu_firm', g: 100 }, { food: 'white_rice', g: 200 }, { food: 'peas', g: 100 }]),
  m('curated_veg_jacket_cheese_beans', 'Jacket potato, cheese & beans', 'vegetarian', ['lunch', 'dinner'], [{ food: 'white_potato', g: 300 }, { food: 'cheddar_light', g: 40 }, { food: 'baked_beans', g: 200 }]),

  m('curated_veg_sn_yogurt_whey', 'Greek yoghurt & whey', 'vegetarian', ['snack'], [{ food: 'greek_yogurt_0', g: 200 }, { food: 'whey', g: 15 }]),
  m('curated_veg_sn_cottage_pineapple', 'Cottage cheese & pineapple', 'vegetarian', ['snack'], [{ food: 'cottage_cheese', g: 200 }, { food: 'pineapple', g: 100 }]),
  m('curated_veg_pre_oats_whey', 'Oats & whey', 'vegetarian', ['preworkout'], [{ food: 'oats', g: 50 }, { food: 'whey', g: 30 }, { food: 'honey', g: 10 }]),
  m('curated_veg_pre_yogurt_ricecakes', 'Greek yoghurt & rice cakes', 'vegetarian', ['preworkout'], [{ food: 'greek_yogurt_0', g: 200 }, { food: 'rice_cakes', g: 24 }, { food: 'honey', g: 10 }]),
  m('curated_veg_post_whey_banana', 'Whey & banana shake', 'vegetarian', ['postworkout'], [{ food: 'whey', g: 40 }, { food: 'banana', g: 120 }, { food: 'milk_skimmed', g: 250 }]),
  m('curated_veg_post_skyr_berries', 'Skyr, berries & honey', 'vegetarian', ['postworkout'], [{ food: 'skyr', g: 250 }, { food: 'berries', g: 100 }, { food: 'honey', g: 15 }]),

  // Phase B (dietary-needs build, 2026-07-09): more vegetarian variety,
  // especially snacks (only 2 before this).
  m('curated_veg_bf_weetabix_banana', 'Weetabix, milk & banana', 'vegetarian', ['breakfast'], [{ food: 'weetabix', g: 40 }, { food: 'milk_skimmed', g: 300 }, { food: 'banana', g: 100 }]),
  m('curated_veg_bf_cottage_granola', 'Cottage cheese, banana & granola bowl', 'vegetarian', ['breakfast'], [{ food: 'cottage_cheese', g: 200 }, { food: 'banana', g: 100 }, { food: 'granola', g: 40 }]),
  m('curated_veg_paneer_curry', 'Paneer curry, rice & spinach', 'vegetarian', ['lunch', 'dinner'], [{ food: 'paneer', g: 100 }, { food: 'white_rice', g: 180 }, { food: 'spinach', g: 80 }, { food: 'olive_oil', g: 10 }]),
  m('curated_veg_halloumi_quinoa', 'Halloumi, quinoa & salad', 'vegetarian', ['lunch', 'dinner'], [{ food: 'halloumi', g: 100 }, { food: 'quinoa', g: 180 }, { food: 'salad', g: 100 }]),
  m('curated_veg_cottage_jacket', 'Cottage cheese jacket potato & salad', 'vegetarian', ['lunch', 'dinner'], [{ food: 'cottage_cheese', g: 200 }, { food: 'white_potato', g: 300 }, { food: 'salad', g: 80 }]),
  m('curated_veg_mushroom_omelette', 'Mushroom & cheese omelette with sourdough', 'vegetarian', ['lunch', 'dinner'], [{ food: 'eggs', g: 150 }, { food: 'mushrooms', g: 100 }, { food: 'cheddar_light', g: 25 }, { food: 'sourdough', g: 60 }]),
  m('curated_veg_sn_cheese_toast', 'Cheese on toast', 'vegetarian', ['snack'], [{ food: 'cheddar_light', g: 40 }, { food: 'wholemeal_bread', g: 80 }]),
  m('curated_veg_sn_yogurt_granola_berries', 'Greek yoghurt, granola & berries', 'vegetarian', ['snack'], [{ food: 'greek_yogurt_0', g: 200 }, { food: 'granola', g: 30 }, { food: 'berries', g: 60 }]),
  m('curated_veg_sn_paneer_apple', 'Paneer & apple', 'vegetarian', ['snack'], [{ food: 'paneer', g: 90 }, { food: 'apple', g: 120 }]),

  // ─── VEGAN (report §B vegan) ────────────────────────────────────────────
  m('curated_vg_tofu_scramble', 'Tofu scramble on sourdough', 'vegan', ['breakfast'], [{ food: 'tofu_firm', g: 200 }, { food: 'sourdough', g: 80 }, { food: 'spinach', g: 60 }]),
  m('curated_vg_overnight_oats', 'Vegan protein overnight oats', 'vegan', ['breakfast'], [{ food: 'oats', g: 60 }, { food: 'soy_protein', g: 30 }, { food: 'soy_milk', g: 200 }, { food: 'berries', g: 80 }, { food: 'peanut_butter', g: 20 }]),
  m('curated_vg_protein_pancakes', 'Vegan protein pancakes', 'vegan', ['breakfast'], [{ food: 'oats', g: 50 }, { food: 'vegan_protein_blend', g: 25 }, { food: 'soy_milk', g: 150 }, { food: 'banana', g: 60 }, { food: 'peanut_butter', g: 20 }]),
  m('curated_vg_soy_yogurt_granola', 'Soya yoghurt, granola & berries', 'vegan', ['breakfast'], [{ food: 'soy_yogurt_hp', g: 200 }, { food: 'vegan_protein_blend', g: 15 }, { food: 'granola', g: 30 }, { food: 'berries', g: 60 }]),
  // M-3 (content-quality audit, 2026-07-04): the vegan breakfast pool was too
  // thin (4 meals), forcing heavy repeats across a generated vegan week. The
  // six meals below add genuinely different formats (pancake, pudding,
  // smoothie, a savoury "beans on toast" plate, a wrap, a yoghurt bowl), each
  // anchored on a real vegan protein source, not just a reshuffle of the same
  // oats + soya-milk + peanut-butter base.
  m('curated_vg_chickpea_pancakes', 'Chickpea flour pancakes, banana & peanut butter', 'vegan', ['breakfast'], [{ food: 'chickpea_flour', g: 70 }, { food: 'vegan_protein_blend', g: 25 }, { food: 'soy_milk', g: 150 }, { food: 'banana', g: 80 }, { food: 'peanut_butter', g: 20 }]),
  m('curated_vg_chia_pudding', 'Chia pudding, soya milk & berries', 'vegan', ['breakfast'], [{ food: 'chia_seeds', g: 40 }, { food: 'soy_milk', g: 250 }, { food: 'vegan_protein_blend', g: 35 }, { food: 'berries', g: 80 }]),
  m('curated_vg_green_smoothie', 'Berry & spinach protein smoothie', 'vegan', ['breakfast'], [{ food: 'oats', g: 30 }, { food: 'vegan_protein_blend', g: 35 }, { food: 'soy_milk', g: 250 }, { food: 'berries', g: 100 }, { food: 'spinach', g: 30 }, { food: 'peanut_butter', g: 15 }]),
  m('curated_vg_beans_tofu_toast', 'Beans on toast with scrambled tofu', 'vegan', ['breakfast'], [{ food: 'baked_beans', g: 300 }, { food: 'wholemeal_bread', g: 90 }, { food: 'tofu_firm', g: 150 }]),
  m('curated_vg_tempeh_avocado_wrap', 'Tempeh & avocado wrap', 'vegan', ['breakfast'], [{ food: 'tortilla', g: 80 }, { food: 'tempeh', g: 130 }, { food: 'avocado', g: 40 }, { food: 'spinach', g: 30 }]),
  m('curated_vg_soyyog_pb_banana', 'Soya yoghurt, peanut butter & banana bowl', 'vegan', ['breakfast'], [{ food: 'soy_yogurt_hp', g: 250 }, { food: 'peanut_butter', g: 15 }, { food: 'banana', g: 100 }, { food: 'vegan_protein_blend', g: 20 }, { food: 'mixed_seeds', g: 10 }]),

  m('curated_vg_tofu_stirfry', 'Tofu stir-fry & rice', 'vegan', ['lunch', 'dinner'], [{ food: 'tofu_firm', g: 200 }, { food: 'white_rice', g: 180 }, { food: 'stirfry_veg', g: 120 }]),
  m('curated_vg_tempeh_sweetpot', 'Tempeh & sweet potato bowl', 'vegan', ['lunch', 'dinner'], [{ food: 'tempeh', g: 120 }, { food: 'sweet_potato', g: 200 }, { food: 'broccoli', g: 100 }]),
  m('curated_vg_lentil_chilli', 'Lentil & bean chilli & rice', 'vegan', ['lunch', 'dinner'], [{ food: 'lentils', g: 200 }, { food: 'kidney_beans', g: 120 }, { food: 'white_rice', g: 150 }, { food: 'tomato_sauce', g: 80 }, { food: 'olive_oil', g: 10 }]),
  m('curated_vg_chickpea_lentil_curry', 'Chickpea & lentil curry', 'vegan', ['lunch', 'dinner'], [{ food: 'chickpeas', g: 200 }, { food: 'lentils', g: 100 }, { food: 'white_rice', g: 150 }, { food: 'spinach', g: 60 }, { food: 'olive_oil', g: 10 }]),
  // Report §B vegan L/D: "Quorn Vegan pieces curry" (was missing). Uses the
  // Quorn vegan staple the report directs (line 72/201). Rice portion sized so
  // the day clears the vegan leucine-matched protein bar.
  m('curated_vg_quorn_curry', 'Quorn vegan curry & rice', 'vegan', ['lunch', 'dinner'], [{ food: 'quorn_vegan_pieces', g: 150 }, { food: 'white_rice', g: 200 }, { food: 'mixed_veg', g: 100 }, { food: 'olive_oil', g: 10 }]),
  m('curated_vg_seitan_potato_greens', 'Seitan, potatoes & greens', 'vegan', ['lunch', 'dinner'], [{ food: 'seitan', g: 130 }, { food: 'white_potato', g: 250 }, { food: 'green_beans', g: 100 }, { food: 'olive_oil', g: 10 }]),
  m('curated_vg_seitan_noodles', 'Seitan & noodles', 'vegan', ['lunch', 'dinner'], [{ food: 'seitan', g: 130 }, { food: 'noodles', g: 200 }, { food: 'stirfry_veg', g: 120 }, { food: 'olive_oil', g: 10 }]),
  m('curated_vg_tofu_sweetpot', 'Tofu & sweet potato bowl', 'vegan', ['lunch', 'dinner'], [{ food: 'tofu_firm', g: 200 }, { food: 'sweet_potato', g: 200 }, { food: 'broccoli', g: 100 }]),
  // M-3 (content-quality audit, 2026-07-04): two more vegan mains, using two
  // staples the table already carried but no meal actually used (tvp_dry,
  // black_beans), so lunch/dinner variety improves alongside breakfast.
  m('curated_vg_soya_mince_bolognese', 'Soya mince bolognese & pasta', 'vegan', ['lunch', 'dinner'], [{ food: 'tvp_dry', g: 60 }, { food: 'pasta', g: 70 }, { food: 'tomato_sauce', g: 120 }, { food: 'olive_oil', g: 10 }]),
  m('curated_vg_blackbean_sweetpot', 'Black bean & sweet potato bowl', 'vegan', ['lunch', 'dinner'], [{ food: 'black_beans', g: 300 }, { food: 'sweet_potato', g: 200 }, { food: 'mixed_veg', g: 100 }, { food: 'olive_oil', g: 10 }]),

  m('curated_vg_sn_edamame', 'Edamame', 'vegan', ['snack'], [{ food: 'edamame', g: 200 }]),
  m('curated_vg_sn_soy_yogurt_pb', 'Soya yoghurt & peanut butter', 'vegan', ['snack'], [{ food: 'soy_yogurt_hp', g: 200 }, { food: 'peanut_butter', g: 12 }]),
  m('curated_vg_sn_pea_shake_berries', 'Pea protein shake & berries', 'vegan', ['snack'], [{ food: 'vegan_protein_blend', g: 33 }, { food: 'berries', g: 100 }, { food: 'soy_milk', g: 200 }]),
  m('curated_vg_pre_soy_oats_banana', 'Soya protein, oats & banana', 'vegan', ['preworkout'], [{ food: 'soy_protein', g: 30 }, { food: 'oats', g: 50 }, { food: 'banana', g: 120 }]),
  m('curated_vg_post_pea_oats_berries', 'Pea protein, oats & berries', 'vegan', ['postworkout'], [{ food: 'vegan_protein_blend', g: 35 }, { food: 'oats', g: 60 }, { food: 'berries', g: 80 }]),
  m('curated_vg_post_soy_banana_shake', 'Soya protein & banana shake', 'vegan', ['postworkout'], [{ food: 'soy_protein', g: 35 }, { food: 'banana', g: 120 }, { food: 'soy_milk', g: 250 }]),

  // Phase B (dietary-needs build, 2026-07-09): vegan snacks were the thinnest
  // slot (3 meals) alongside a couple more mains for variety.
  m('curated_vg_sn_chickpeas', 'Spiced roasted chickpeas', 'vegan', ['snack'], [{ food: 'chickpeas', g: 200 }, { food: 'olive_oil', g: 10 }]),
  m('curated_vg_sn_shake_apple', 'Vegan protein shake & apple', 'vegan', ['snack'], [{ food: 'vegan_protein_blend', g: 33 }, { food: 'soy_milk', g: 200 }, { food: 'apple', g: 120 }]),
  m('curated_vg_sn_tofu_edamame', 'Tofu & edamame bowl', 'vegan', ['snack'], [{ food: 'tofu_firm', g: 150 }, { food: 'edamame', g: 100 }]),
  m('curated_vg_sn_edamame_ricecakes', 'Edamame & rice cakes', 'vegan', ['snack'], [{ food: 'edamame', g: 150 }, { food: 'rice_cakes', g: 20 }]),
  // Vegan mains carry a leucine-matched protein uplift (>= 28 g; the plant-anchor
  // policy in proteinQuality.test.js), so these two are sized generously on the
  // legume/lentil component rather than left as a lighter side-style bowl.
  m('curated_vg_chickpea_quinoa_lentil_bowl', 'Chickpea, quinoa & lentil bowl', 'vegan', ['lunch', 'dinner'], [{ food: 'chickpeas', g: 200 }, { food: 'quinoa', g: 120 }, { food: 'lentils', g: 100 }, { food: 'spinach', g: 60 }, { food: 'olive_oil', g: 10 }]),
  m('curated_vg_lentilpasta_tomato_spinach', 'Lentil pasta, tomato & spinach', 'vegan', ['lunch', 'dinner'], [{ food: 'lentil_pasta', g: 110 }, { food: 'tomato_sauce', g: 120 }, { food: 'spinach', g: 80 }]),
  m('curated_vg_tofu_asparagus_stirfry', 'Tofu & asparagus stir-fry', 'vegan', ['lunch', 'dinner'], [{ food: 'tofu_firm', g: 200 }, { food: 'asparagus', g: 120 }, { food: 'white_rice', g: 180 }, { food: 'olive_oil', g: 10 }]),
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
 *
 * Numbered diary meals ('meal_1', 'meal_2', ...) carry no breakfast/lunch
 * character, so a numbered slot takes the WHOLE diet-filtered library and lets
 * the macro ranking pick (the same rule slotMatches() applies). The named slots
 * (breakfast/lunch/dinner/snack and pre/post-workout) still filter to their
 * tagged meals.
 *
 * excludeFoodKeys/excludeTags (dietary-needs build 2026-07-09): the user's
 * avoid list and FSA allergen excludes. A meal is out when ANY component is
 * excluded, the same hard rule planPreferences applies to generated plans,
 * via the same foodExcluded predicate. The diet cascade and exclusions are
 * the ONLY suggestion filters: the plan-only protein-anchor policy stays
 * out of the diary deliberately, so suggestions keep today's breadth.
 */
const NUMBERED_SLOT = /^meal_\d+$/;
export function getCuratedCandidates({ diet = 'omnivore', slot = null, excludeFoodKeys, excludeTags } = {}) {
  const out = [];
  const slotFilter = slot && !NUMBERED_SLOT.test(slot);
  const exclude = { excludeFoodKeys, excludeTags };
  const hasExcludes = (excludeFoodKeys?.length || 0) > 0 || (excludeTags?.length || 0) > 0;
  for (const meal of CURATED_MEALS) {
    if (!dietAllows(diet, meal.diet)) continue;
    if (slotFilter && !(meal.slots.includes(slot) || meal.slots.includes('any'))) continue;
    if (hasExcludes && meal.components.some((c) => foodExcluded(c.food, exclude))) continue;
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
