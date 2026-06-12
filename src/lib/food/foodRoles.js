/**
 * food/foodRoles.js
 *
 * The macro-role layer over the curated staple table (meal-plan generator,
 * deep-audit Theme G). Coaches build plans from foods classified by the
 * macro they are there to deliver: PRO / CHO / FAT / VEG / FREE. Swaps
 * happen WITHIN a role, calibrated on the role's dominant macro (±ROLE_TOLERANCE_G
 * at the meal level), with calories following: rice for pasta is a carb
 * match, cashews for dark chocolate is a fat match. That convention is
 * universal across elite coaching practice (RP templates, exchange lists,
 * the founder's own prep coach) and is verified against USDA data in
 * docs/deep-audit-2026-06-12/blueprints/bp-meal-plan-research-round2.md §3.
 *
 * Design notes:
 * - curatedFoods.js stays a pure per-100g macro table (its "computed,
 *   never hand-typed" principle is load-bearing for the meal library).
 *   This module ANNOTATES by food key: role, weight state (dry/cooked/raw),
 *   FSA allergen tags, preferred swap alternatives, and gram clamps.
 *   A coverage test asserts every curated key is annotated, so the two
 *   files cannot drift apart.
 * - Explicit roles beat the macro-dominance fallback where coaching
 *   convention does: whole eggs are a protein source even though fat
 *   carries more of their calories; halloumi functions as a meal's fat.
 * - swapAlternatives are ordered preference lists of SAME-ROLE keys.
 *   Grams are never stored: the swap solver computes the exact portion
 *   that holds the role macro, which beats a hand-rounded printed pair.
 */

import { CURATED_FOODS } from './curatedFoods';

export const ROLES = Object.freeze(['protein', 'carb', 'fat', 'veg', 'free']);

// Dominant-macro tolerance for a role-preserving swap, in grams at the
// meal level. The practical coaching band (round-2 research §3): a swap
// "holds the macros" when the role macro lands within this of the original.
export const ROLE_TOLERANCE_G = 5;

// ─── Explicit role per curated food key ─────────────────────────────────
// Conventions over raw kcal dominance, matching how coach plans categorise
// (the founder's coach sheet and the Beverly/RP food-list pattern):
// eggs are PRO; cheeses carry the meal's fat; legumes are CHO with a
// protein credit; fruit is CHO; sauces over ~15 kcal a serving are CHO.
const ROLE = Object.freeze({
  // Carbs / grains / starches / fruit
  oats: 'carb', white_rice: 'carb', brown_rice: 'carb', quinoa: 'carb',
  wholemeal_bread: 'carb', bagel: 'carb', tortilla: 'carb', pasta: 'carb',
  lentil_pasta: 'carb', noodles: 'carb', rice_cakes: 'carb', granola: 'carb',
  white_potato: 'carb', potato_wedges: 'carb', sweet_potato: 'carb',
  banana: 'carb', apple: 'carb', berries: 'carb', pineapple: 'carb',
  honey: 'carb', tomato_sauce: 'carb',
  lentils: 'carb', lentil_dahl: 'carb', chickpeas: 'carb',
  kidney_beans: 'carb', black_beans: 'carb', baked_beans: 'carb',
  milk_skimmed: 'carb', soy_milk: 'carb',

  // Veg (low-energy, volume foods)
  mixed_veg: 'veg', stirfry_veg: 'veg', broccoli: 'veg', spinach: 'veg',
  green_beans: 'veg', asparagus: 'veg', peas: 'veg', salad: 'veg',

  // Free (condiment-scale at realistic servings)
  salsa: 'free',

  // Proteins
  chicken_breast: 'protein', turkey_breast: 'protein', turkey_mince: 'protein',
  beef_mince_5: 'protein', steak_lean: 'protein', cod: 'protein',
  salmon: 'protein', smoked_salmon: 'protein', tuna_water: 'protein',
  prawns: 'protein', eggs: 'protein', egg_whites: 'protein',
  greek_yogurt_0: 'protein', greek_yogurt_2: 'protein', skyr: 'protein',
  cottage_cheese: 'protein', whey: 'protein',
  tofu_firm: 'protein', tempeh: 'protein', seitan: 'protein',
  tvp_dry: 'protein', quorn_mince: 'protein', edamame: 'protein',
  soy_protein: 'protein', pea_protein: 'protein', soy_yogurt_hp: 'protein',

  // Fats
  olive_oil: 'fat', almonds: 'fat', peanut_butter: 'fat',
  mixed_seeds: 'fat', avocado: 'fat', tahini: 'fat',
  halloumi: 'fat', paneer: 'fat',
});

// ─── Weight state ───────────────────────────────────────────────────────
// Plans must say which weight a number means: 50 g dry pasta is ~115 g
// cooked with identical carbs (the round-2 "dry/cooked trap"). Everything
// not listed is 'ready' (eaten as weighed: cooked meat, fruit, dairy...).
const STATE = Object.freeze({
  oats: 'dry', pasta: 'dry', lentil_pasta: 'dry', tvp_dry: 'dry',
  rice_cakes: 'dry', granola: 'dry', whey: 'dry', soy_protein: 'dry',
  pea_protein: 'dry', mixed_seeds: 'dry',
  white_rice: 'cooked', brown_rice: 'cooked', quinoa: 'cooked',
  noodles: 'cooked', white_potato: 'cooked', lentils: 'cooked',
  chickpeas: 'cooked', kidney_beans: 'cooked', black_beans: 'cooked',
});

// ─── FSA allergen tags (the 14-allergen vocabulary, where present) ──────
const TAGS = Object.freeze({
  oats: ['cereals_gluten'], wholemeal_bread: ['cereals_gluten'],
  bagel: ['cereals_gluten'], tortilla: ['cereals_gluten'],
  pasta: ['cereals_gluten'], noodles: ['cereals_gluten', 'eggs'],
  granola: ['cereals_gluten', 'nuts'], seitan: ['cereals_gluten'],
  eggs: ['eggs'], egg_whites: ['eggs'],
  greek_yogurt_0: ['milk'], greek_yogurt_2: ['milk'], skyr: ['milk'],
  cottage_cheese: ['milk'], halloumi: ['milk'], paneer: ['milk'],
  milk_skimmed: ['milk'], whey: ['milk'],
  cod: ['fish'], salmon: ['fish'], smoked_salmon: ['fish'],
  tuna_water: ['fish'], prawns: ['crustaceans'],
  tofu_firm: ['soya'], tempeh: ['soya'], tvp_dry: ['soya'],
  edamame: ['soya'], soy_protein: ['soya'], soy_milk: ['soya'],
  soy_yogurt_hp: ['soya'],
  almonds: ['nuts'], peanut_butter: ['peanuts'],
  mixed_seeds: ['sesame'], tahini: ['sesame'],
});

// ─── Gram clamps ────────────────────────────────────────────────────────
// Role-appropriate sane portion ranges (g), so a solver can never produce
// 700 g of chicken or 4 g of rice. Per-key overrides where a role default
// is wrong for the food's density (oil, whey, condiment-scale items).
const ROLE_GRAM_RANGE = Object.freeze({
  protein: [50, 350],
  carb: [15, 400],
  fat: [5, 60],
  veg: [40, 500],
  free: [5, 150],
});

const GRAM_RANGE_OVERRIDES = Object.freeze({
  olive_oil: [5, 30],
  whey: [15, 60], soy_protein: [15, 60], pea_protein: [15, 60],
  honey: [5, 40],
  avocado: [30, 150],
  white_potato: [80, 500], sweet_potato: [80, 500], potato_wedges: [80, 400],
  milk_skimmed: [50, 400], soy_milk: [50, 400],
  eggs: [50, 250], egg_whites: [60, 400],
  banana: [60, 240], apple: [80, 300], berries: [50, 250],
});

// ─── Preferred swap alternatives ────────────────────────────────────────
// Ordered same-role preference lists (the coach-sheet "optional switch"
// pattern, generalised). Grams are computed by the solver at swap time.
// The algorithmic fallback (findRoleAlternatives) covers everything else.
const SWAP_ALTERNATIVES = Object.freeze({
  white_rice: ['pasta', 'white_potato', 'sweet_potato', 'noodles', 'quinoa'],
  brown_rice: ['quinoa', 'white_rice', 'sweet_potato', 'lentils'],
  pasta: ['white_rice', 'noodles', 'white_potato', 'quinoa'],
  white_potato: ['sweet_potato', 'white_rice', 'pasta'],
  sweet_potato: ['white_potato', 'white_rice', 'pasta'],
  oats: ['granola', 'wholemeal_bread', 'rice_cakes'],
  wholemeal_bread: ['bagel', 'tortilla', 'oats', 'rice_cakes'],
  bagel: ['wholemeal_bread', 'tortilla'],
  tortilla: ['wholemeal_bread', 'bagel'],
  banana: ['apple', 'berries', 'pineapple'],
  apple: ['banana', 'berries', 'pineapple'],
  berries: ['apple', 'banana', 'pineapple'],

  chicken_breast: ['turkey_breast', 'cod', 'tuna_water', 'prawns', 'beef_mince_5'],
  turkey_breast: ['chicken_breast', 'cod', 'tuna_water'],
  turkey_mince: ['beef_mince_5', 'quorn_mince', 'chicken_breast'],
  beef_mince_5: ['turkey_mince', 'steak_lean', 'chicken_breast'],
  steak_lean: ['beef_mince_5', 'chicken_breast', 'salmon'],
  cod: ['chicken_breast', 'prawns', 'tuna_water', 'turkey_breast'],
  salmon: ['steak_lean', 'smoked_salmon', 'cod'],
  tuna_water: ['cod', 'chicken_breast', 'prawns'],
  prawns: ['cod', 'tuna_water', 'chicken_breast'],
  eggs: ['egg_whites', 'cottage_cheese', 'greek_yogurt_2'],
  greek_yogurt_0: ['skyr', 'cottage_cheese', 'soy_yogurt_hp'],
  skyr: ['greek_yogurt_0', 'cottage_cheese', 'soy_yogurt_hp'],
  tofu_firm: ['tempeh', 'seitan', 'quorn_mince'],
  tempeh: ['tofu_firm', 'seitan', 'edamame'],
  seitan: ['tofu_firm', 'tempeh', 'tvp_dry'],
  quorn_mince: ['tvp_dry', 'tofu_firm', 'tempeh'],
  whey: ['soy_protein', 'pea_protein', 'skyr'],

  almonds: ['mixed_seeds', 'peanut_butter', 'avocado'],
  peanut_butter: ['almonds', 'tahini', 'mixed_seeds'],
  mixed_seeds: ['almonds', 'tahini'],
  avocado: ['almonds', 'olive_oil', 'mixed_seeds'],
  olive_oil: ['avocado', 'tahini'],
  halloumi: ['paneer', 'avocado'],
  paneer: ['halloumi', 'avocado'],
});

// ─── Lookups ────────────────────────────────────────────────────────────

/** The macro role of a curated food key ('protein'|'carb'|'fat'|'veg'|'free'), or null. */
export function roleOf(foodKey) {
  return ROLE[foodKey] || null;
}

/** Which weight a stored gram figure means: 'dry' | 'cooked' | 'ready'. */
export function stateOf(foodKey) {
  return STATE[foodKey] || 'ready';
}

/** FSA allergen tags for a curated food key (always an array). */
export function tagsOf(foodKey) {
  return TAGS[foodKey] || [];
}

/** Sane [minG, maxG] portion clamp for a curated food key. */
export function gramRangeOf(foodKey) {
  if (GRAM_RANGE_OVERRIDES[foodKey]) return GRAM_RANGE_OVERRIDES[foodKey];
  const role = roleOf(foodKey);
  return ROLE_GRAM_RANGE[role] || [10, 400];
}

/** Ordered preferred swap keys for a food (may be empty; solver computes grams). */
export function swapAlternativesOf(foodKey) {
  return SWAP_ALTERNATIVES[foodKey] || [];
}

/**
 * The grams of the role's dominant macro that `grams` of this food delivers
 * (protein for a protein source, carbs for a carb source, fat for a fat
 * source). Veg/free foods return their carb grams (the nearest meaningful
 * axis) so callers can still compare like with like.
 */
export function roleMacroGrams(foodKey, grams) {
  const f = CURATED_FOODS[foodKey];
  const role = roleOf(foodKey);
  if (!f || !role) return 0;
  const g = (Number(grams) || 0) / 100;
  const per100 = role === 'protein' ? f.protein
    : role === 'fat' ? f.fat
    : f.carbs;
  return Math.round(per100 * g * 10) / 10;
}

/**
 * Deterministic fallback classifier for foods OUTSIDE the curated table
 * (custom foods, future additions): classify a per-100g macro profile by
 * calorie share, with the same conventions the explicit map uses.
 * Profile: { kcal, protein, carbs, fat } per 100 g.
 */
export function classifyRole(profile) {
  const p = profile || {};
  const kcal = Number(p.kcal) || 0;
  const proteinKcal = (Number(p.protein) || 0) * 4;
  const carbsKcal = (Number(p.carbs) || 0) * 4;
  const fatKcal = (Number(p.fat) || 0) * 9;
  // Condiment-scale or watery-veg energy density.
  if (kcal > 0 && kcal <= 25) return 'free';
  if (kcal > 25 && kcal <= 45 && proteinKcal < 20 && fatKcal < 10) return 'veg';
  if (kcal <= 0) return null;
  // Dominant calorie source wins; protein gets first claim on ties
  // (a 50/50 protein food is a protein source in any coach's book).
  if (proteinKcal >= carbsKcal && proteinKcal >= fatKcal) return 'protein';
  if (carbsKcal >= fatKcal) return 'carb';
  return 'fat';
}

/**
 * All curated keys of one role, exclusion-aware. `exclude` takes
 * { excludeFoodKeys: string[], excludeTags: string[] } (both optional).
 * Pure; stable alphabetical order for determinism.
 */
export function keysForRole(role, exclude = {}) {
  const excludeKeys = new Set(exclude.excludeFoodKeys || []);
  const excludeTags = new Set(exclude.excludeTags || []);
  return Object.keys(CURATED_FOODS)
    .filter((k) => ROLE[k] === role)
    .filter((k) => !excludeKeys.has(k))
    .filter((k) => !tagsOf(k).some((t) => excludeTags.has(t)))
    .sort();
}

// Exposed for the coverage test only.
export const _ROLE_MAP = ROLE;
