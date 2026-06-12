/**
 * food/curatedFoods.js
 *
 * The staple-food table behind the curated meal library. Per-100g macros
 * are defined ONCE here (British supermarket staples, label-grade / CoFID
 * reference values); curated meals reference these by key + grams and have
 * their item + total macros COMPUTED, never hand-typed. That keeps the
 * whole library internally consistent and makes 100+ meals maintainable.
 *
 * Each entry: key -> { name, ref, kcal, protein, carbs, fat } per 100 g.
 * `ref` is the foodRef written onto a logged diary entry ('curated:*');
 * the diary edit sheet falls back to the stored macros if it can't resolve.
 */

// per 100 g: [kcal, protein, carbs, fat]
const F = (name, kcal, protein, carbs, fat) => ({ name, kcal, protein, carbs, fat });

export const CURATED_FOODS = Object.freeze({
  // Carbs / grains
  oats:            F('Porridge oats', 379, 13, 67, 7),
  white_rice:      F('White rice (cooked)', 130, 2.7, 28, 0.3),
  brown_rice:      F('Brown rice (cooked)', 110, 2.6, 23, 0.9),
  quinoa:          F('Quinoa (cooked)', 120, 4.4, 21, 1.9),
  wholemeal_bread: F('Wholemeal bread', 247, 13, 41, 3.4),
  bagel:           F('Bagel', 270, 10, 53, 1.7),
  tortilla:        F('Tortilla wrap', 300, 8, 50, 7),
  pasta:           F('Pasta (dry)', 350, 13, 72, 1.8),
  lentil_pasta:    F('Lentil pasta (dry)', 350, 25, 50, 4),
  noodles:         F('Noodles (cooked)', 140, 4.5, 28, 1),
  rice_cakes:      F('Rice cakes', 387, 8, 82, 3),
  granola:         F('Granola', 450, 10, 64, 16),
  weetabix:        F('Weetabix', 362, 12, 69, 2),
  white_potato:    F('Potato (boiled)', 79, 2, 17, 0.1),
  potato_wedges:   F('Potato wedges', 130, 2.5, 24, 3),
  sweet_potato:    F('Sweet potato', 86, 1.6, 20, 0.1),
  banana:          F('Banana', 89, 1.1, 23, 0.3),
  apple:           F('Apple', 52, 0.3, 14, 0.2),
  berries:         F('Mixed berries', 44, 0.6, 10, 0.1),
  pineapple:       F('Pineapple', 50, 0.5, 13, 0.1),
  honey:           F('Honey', 304, 0, 82, 0),

  // Veg
  mixed_veg:       F('Mixed veg', 35, 2.4, 6, 0.4),
  stirfry_veg:     F('Stir-fry veg', 40, 2.1, 7.5, 0.5),
  broccoli:        F('Broccoli', 34, 2.8, 7, 0.4),
  spinach:         F('Spinach', 23, 2.9, 3.6, 0.4),
  green_beans:     F('Green beans', 31, 1.8, 7, 0.2),
  asparagus:       F('Asparagus', 20, 2.2, 4, 0.2),
  peas:            F('Garden peas', 84, 5.4, 14, 0.4),
  salad:           F('Mixed salad', 20, 1.5, 3, 0.2),
  salsa:           F('Salsa', 30, 1, 6, 0.1),
  tomato_sauce:    F('Tomato sauce', 50, 1.5, 8, 1.5),
  mushrooms:       F('Mushrooms', 22, 3.1, 0.3, 0.3),
  tomatoes:        F('Tomatoes', 18, 0.9, 3.9, 0.2),

  // Omnivore proteins
  chicken_breast:  F('Chicken breast (cooked)', 165, 31, 0, 3.6),
  turkey_breast:   F('Turkey breast (cooked)', 140, 30, 0, 2),
  turkey_mince:    F('Turkey mince (5%)', 113, 20, 0, 3.3),
  beef_mince_5:    F('Beef mince (5%)', 137, 21, 0, 5),
  steak_lean:      F('Lean steak (cooked)', 200, 34, 0, 7),
  cod:             F('Cod / white fish', 82, 18, 0, 0.7),
  salmon:          F('Salmon', 208, 20, 0, 13),
  smoked_salmon:   F('Smoked salmon', 146, 25, 0, 4.5),
  tuna_water:      F('Tuna (in water)', 116, 26, 0, 1),
  prawns:          F('Prawns', 85, 20, 0, 0.5),
  eggs:            F('Whole eggs', 143, 13, 1, 10),
  egg_whites:      F('Egg whites', 52, 11, 0.7, 0.2),

  // Dairy
  greek_yogurt_0:  F('Greek yogurt (0%)', 59, 10, 4, 0),
  greek_yogurt_2:  F('Greek yogurt (2%)', 73, 10, 4, 3),
  skyr:            F('Skyr', 63, 11, 4, 0.2),
  cottage_cheese:  F('Cottage cheese (low-fat)', 72, 12, 3, 1),
  halloumi:        F('Halloumi', 320, 22, 2, 25),
  paneer:          F('Paneer', 265, 18, 3, 21),
  cheddar_light:   F('Reduced-fat cheddar', 311, 27, 0.1, 22),
  milk_skimmed:    F('Skimmed milk', 35, 3.4, 5, 0.1),
  whey:            F('Whey protein', 380, 80, 8, 6),

  // Plant proteins
  tofu_firm:       F('Firm tofu', 144, 17, 3, 8),
  tempeh:          F('Tempeh', 192, 20, 8, 11),
  seitan:          F('Seitan', 150, 25, 4, 1),
  tvp_dry:         F('Soya mince (dry)', 327, 52, 30, 1),
  quorn_mince:     F('Quorn mince', 95, 14.5, 5, 2),
  edamame:         F('Edamame', 121, 12, 9, 5),
  lentils:         F('Lentils (cooked)', 116, 9, 20, 0.4),
  lentil_dahl:     F('Red lentil dahl', 116, 7, 18, 1.2),
  chickpeas:       F('Chickpeas (cooked)', 164, 8.9, 27, 2.6),
  kidney_beans:    F('Kidney beans (cooked)', 127, 8.7, 23, 0.5),
  black_beans:     F('Black beans (cooked)', 114, 7.6, 20, 0.5),
  baked_beans:     F('Baked beans', 78, 4.7, 13, 0.6),
  soy_protein:     F('Soya protein', 360, 80, 5, 3),
  pea_protein:     F('Pea protein', 375, 80, 5, 7),
  soy_yogurt_hp:   F('High-protein soya yogurt', 70, 6, 5, 3),
  soy_milk:        F('Soya milk', 33, 3.3, 1.2, 1.8),

  // Fats
  olive_oil:       F('Olive oil', 884, 0, 0, 100),
  almonds:         F('Almonds', 579, 21, 22, 50),
  peanut_butter:   F('Peanut butter', 588, 25, 20, 50),
  mixed_seeds:     F('Mixed seeds', 567, 23, 14, 47),
  avocado:         F('Avocado', 160, 2, 9, 15),
  tahini:          F('Tahini', 595, 17, 21, 54),
});

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Resolve one (foodKey, grams) component to a diary-ready item with
 * computed macros. Returns null for an unknown food key.
 */
export function resolveComponent(foodKey, grams) {
  const f = CURATED_FOODS[foodKey];
  if (!f) return null;
  const g = Number(grams) || 0;
  const factor = g / 100;
  return {
    foodRef: `curated:${foodKey}`,
    name: f.name,
    quantityG: g,
    kcal: Math.round(f.kcal * factor),
    proteinG: r1(f.protein * factor),
    carbsG: r1(f.carbs * factor),
    fatG: r1(f.fat * factor),
  };
}
