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
  // Coerce per-100g inputs to a finite number (audit F-006): a non-finite stored
  // macro (e.g. Infinity from a bad import) must never scale to Infinity and then
  // be silently logged as 0 downstream. Non-finite reads as 0 here.
  const num = (a, b) => { const v = Number(pick(a, b)); return Number.isFinite(v) ? v : 0; };
  const fibreRaw = pick('fibre_100g', 'fibre100g');
  const fibre = (fibreRaw != null && Number.isFinite(Number(fibreRaw))) ? Number(fibreRaw) : null;
  return {
    kcal: Math.round(num('kcal_100g', 'kcal100g') * k),
    proteinG: r1(num('protein_100g', 'protein100g') * k),
    carbsG: r1(num('carbs_100g', 'carbs100g') * k),
    fatG: r1(num('fat_100g', 'fat100g') * k),
    fibreG: fibre != null ? r1(fibre * k) : null,
  };
}

/**
 * Scale a food's per-100g sugar to an eaten quantity, for the food-detail
 * display only (gap #16). Mirrors scaleMacros' tolerant field-shape handling and
 * its "no datum stays null" rule, so a food with no sugar value reads as "no
 * data", never a fake 0 g. Display-only: sugar is not tracked in food_entries,
 * the rollup, or any coaching input.
 *
 * @param per100  a food row carrying per-100g sugar (sugar_100g | sugar100g)
 * @param grams   the eaten quantity in grams
 * @returns {number|null} grams of sugar, or null when the food carries no datum
 */
export function scaleSugarG(per100, grams) {
  const g = Number(grams) || 0;
  if (!per100 || g <= 0 || !Number.isFinite(g)) return null;
  const raw = per100.sugar_100g != null ? per100.sugar_100g : per100.sugar100g;
  if (raw == null) return null;
  const v = Number(raw);
  if (!Number.isFinite(v)) return null;
  return r1(v * (g / 100));
}

// Above this per-100g figure a stored sodium value is treated as no-data.
// sodium_100g is stored in GRAMS per 100 g (the bundled OFF snapshot keeps
// OFF's own unit; measured 2026-07-02: 92% coverage, median 0.196 g). Pure
// salt is only ~39 g sodium per 100 g, so anything above 40 is an upstream
// unit mistake (a handful of OFF rows carry mg entered as g); rendering it
// would show a number a thousand times too high.
const SODIUM_100G_SANITY_MAX = 40;

/**
 * Scale a food's per-100g sodium to an eaten quantity, in MILLIGRAMS, for the
 * food-detail display only (E4 part 1). Same tolerant field shapes and
 * "no datum stays null" rule as scaleSugarG; implausible stored values (see
 * SODIUM_100G_SANITY_MAX) also read as no data rather than a wrong number.
 * Display-only: sodium is not tracked in food_entries, the rollup, or any
 * coaching input.
 *
 * @param per100  a food row carrying per-100g sodium in grams
 *                (sodium_100g | sodium100g)
 * @param grams   the eaten quantity in grams
 * @returns {number|null} whole milligrams of sodium, or null when the food
 *                        carries no (plausible) datum
 */
export function scaleSodiumMg(per100, grams) {
  const g = Number(grams) || 0;
  if (!per100 || g <= 0 || !Number.isFinite(g)) return null;
  const raw = per100.sodium_100g != null ? per100.sodium_100g : per100.sodium100g;
  if (raw == null) return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0 || v > SODIUM_100G_SANITY_MAX) return null;
  return Math.round(v * 1000 * (g / 100));
}

/**
 * Divide a whole-recipe macro total into a per-serving figure, so a recipe
 * list row can show "how much is one serving" alongside its serving count
 * rather than an unlabelled whole-recipe number (L05-MR1, 2026-07-09 design
 * audit: recipe rows showed no calories/macros at all; once added, showing
 * the bare whole-recipe total next to "4 servings" read as ambiguous — is
 * that the whole recipe or one portion?). A missing, zero or otherwise
 * invalid servings count is treated as one serving (the whole total passes
 * through unchanged) rather than dividing by zero or inflating the numbers.
 *
 * @param totals    { kcal, protein, carbs, fat } for the whole recipe
 * @param servings  number of servings the recipe makes (recipes.total_servings)
 * @returns { kcal, protein, carbs, fat } for one serving
 */
export function perServingTotals(totals, servings) {
  const s = Number(servings);
  const divisor = Number.isFinite(s) && s > 0 ? s : 1;
  const t = totals || {};
  return {
    kcal: Math.round((Number(t.kcal) || 0) / divisor),
    protein: r1((Number(t.protein) || 0) / divisor),
    carbs: r1((Number(t.carbs) || 0) / divisor),
    fat: r1((Number(t.fat) || 0) / divisor),
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
