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
