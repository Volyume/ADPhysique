/**
 * food/macros.js
 *
 * The single per-100g -> portion scaling used everywhere a food's macros are
 * sized to an eaten quantity: the edit sheet preview, the diary save path, and
 * the custom-food log path. Previously three copies of this formula lived in
 * those call sites and could silently drift (food review U-M2).
 *
 * Tolerates both food shapes in the codebase: the resolved/diary shape
 * (`kcal_100g`, `protein_100g`, ...) and the custom-food draft shape
 * (`kcal100g`, `protein100g`, ...). kcal rounds to a whole number; macros to
 * one decimal; fibre stays null when the source has no fibre datum (so "no
 * data" never reads as a real 0).
 */

const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

/**
 * @param per100  a food row carrying per-100g macros (either field shape)
 * @param grams   the eaten quantity in grams
 * @returns { kcal, proteinG, carbsG, fatG, fibreG } — fibreG null when absent
 */
export function scaleMacros(per100, grams) {
  const g = Number(grams) || 0;
  if (!per100 || g <= 0 || !Number.isFinite(g)) {
    return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: null };
  }
  const k = g / 100;
  const pick = (a, b) => (per100[a] != null ? per100[a] : per100[b]);
  const fibre = pick('fibre_100g', 'fibre100g');
  return {
    kcal: Math.round((pick('kcal_100g', 'kcal100g') ?? 0) * k),
    proteinG: r1((pick('protein_100g', 'protein100g') ?? 0) * k),
    carbsG: r1((pick('carbs_100g', 'carbs100g') ?? 0) * k),
    fatG: r1((pick('fat_100g', 'fat100g') ?? 0) * k),
    fibreG: fibre != null ? r1(fibre * k) : null,
  };
}

/**
 * The serving size (g) to use for a one-tap add of a food. Food audit F-2:
 * prefer the user's LAST logged portion when the row carries one (the "Add
 * again" recents list does), so a one-tap re-add reuses the remembered portion;
 * otherwise the food's default serving; otherwise 100 g. Non-positive or
 * missing values are skipped at each step.
 *
 * @param food  a food row, optionally carrying `last_quantity_g` and `serving_g`
 * @returns {number} grams to log
 */
export function resolveServingG(food) {
  if (food?.last_quantity_g > 0) return food.last_quantity_g;
  if (food?.serving_g > 0) return food.serving_g;
  return 100;
}
