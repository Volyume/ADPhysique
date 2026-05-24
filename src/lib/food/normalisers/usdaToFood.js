/**
 * Normalise a USDA FoodData Central response row into the shared
 * food row shape used by the waterfall (matches localCache + liveOff
 * output).
 *
 * USDA exposes nutrients per 100g in `foodNutrients[].value` keyed
 * by `nutrientId` (Foundation/SR Legacy) or `nutrientNumber`
 * (Branded). We pick the right key by checking both. Missing macros
 * cause the row to drop out (returned as null) so the waterfall
 * doesn't surface partial data to the user.
 */

// Nutrient id -> field map. Foundation foods use ids, Branded uses
// nutrient numbers (strings). We try both.
const NUTRIENT_IDS = {
  kcal_100g:     [1008, '208'],
  protein_100g:  [1003, '203'],
  carbs_100g:    [1005, '205'],
  fat_100g:      [1004, '204'],
  fibre_100g:    [1079, '291'],
};

function _pickNutrient(food, [id, number]) {
  const list = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  for (const n of list) {
    if (n?.nutrientId === id || n?.nutrient?.id === id) {
      const v = n.value ?? n.amount;
      return Number.isFinite(v) ? v : null;
    }
    if (String(n?.nutrientNumber ?? n?.nutrient?.number ?? '') === number) {
      const v = n.value ?? n.amount;
      return Number.isFinite(v) ? v : null;
    }
  }
  return null;
}

export function normaliseUsdaFood(food) {
  if (!food) return null;
  const kcal = _pickNutrient(food, NUTRIENT_IDS.kcal_100g);
  const protein = _pickNutrient(food, NUTRIENT_IDS.protein_100g);
  const carbs = _pickNutrient(food, NUTRIENT_IDS.carbs_100g);
  const fat = _pickNutrient(food, NUTRIENT_IDS.fat_100g);
  if (kcal == null || protein == null || carbs == null || fat == null) {
    return null;
  }
  const name = food.description || food.lowercaseDescription || 'Unknown';
  const brand = food.brandOwner || food.brandName || null;
  const servingG = Number.isFinite(food.servingSize) && food.servingSizeUnit === 'g'
    ? food.servingSize : 100;
  return {
    food_ref: `usda:${food.fdcId}`,
    source: 'usda',
    name,
    brand,
    serving_g: servingG,
    serving_label: food.householdServingFullText || null,
    kcal_100g: kcal,
    protein_100g: protein,
    carbs_100g: carbs,
    fat_100g: fat,
    fibre_100g: _pickNutrient(food, NUTRIENT_IDS.fibre_100g),
    barcode_ean: food.gtinUpc || null,
  };
}
