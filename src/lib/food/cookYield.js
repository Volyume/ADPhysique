/**
 * food/cookYield.js: raw <-> cooked weight for the curated staples (founder
 * ruling 2026-10-19, superseding NA-nutrition-1 and NA-nutrition-5 for paired
 * foods only).
 *
 * Every ratio is derived from a raw and a cooked entry for the same food in
 * the bundled CoFID snapshot (McCance and Widdowson's Composition of Foods
 * Integrated Dataset 2021, assets/seed/cofid_uk.dat), never typed in. Cooking
 * moves water, so the ratio comes from the nutrient cooking keeps: protein
 * for meat and fish (fat renders into the pan, so energy would mislead),
 * carbohydrate for grains, pasta and potatoes. Grams cooked per gram raw =
 * raw per-100g value / cooked per-100g value. Each value below is pinned to
 * its CoFID row by cookYield.test.js.
 *
 * A food with no CoFID pair has no entry, so it gets no toggle and no figure
 * is ever invented for it: oats (porridge depends on the liquid), quinoa (no
 * cooked row), lentils (the curated food does not say which), turkey mince
 * (no raw row), tinned beans and cooked prawns (bought as they are eaten).
 *
 * Converting changes only the gram figure for the same amount of food; the
 * calories and macros of that amount are identical either way.
 *
 * Pure.
 */
import { stateOf } from './foodRoles';
import { scaleMacros } from './macros';

const pair = (conserved, word, raw, rawValue, cooked, cookedValue) => Object.freeze({
  conserved, word,
  raw: Object.freeze({ name: raw, value: rawValue }),
  cooked: Object.freeze({ name: cooked, value: cookedValue }),
});

// curated key -> the CoFID pair. `word` is what the uncooked weight is called
// on a label: 'dry' for grains and pasta, 'raw' for everything else.
export const COOK_YIELD_PAIRS = Object.freeze({
  white_rice: pair('carbs', 'dry', 'Rice, white, long grain, raw', 85.1, 'Rice, white, long grain, boiled in unsalted water', 31.1),
  brown_rice: pair('carbs', 'dry', 'Rice, brown, wholegrain, raw', 77, 'Rice, brown, wholegrain, boiled in unsalted water', 29.2),
  pasta: pair('carbs', 'dry', 'Pasta, white, dried, raw', 75.6, 'Pasta, white, dried, boiled in unsalted water', 37.2),
  white_potato: pair('carbs', 'raw', 'Potatoes, old, raw, flesh only', 19.6, 'Potatoes, old, boiled in unsalted water, flesh only', 17.5),
  sweet_potato: pair('carbs', 'raw', 'Sweet potato, raw, flesh only', 21.3, 'Sweet potato, baked', 27.9),
  chicken_breast: pair('protein', 'raw', 'Chicken, light meat, raw', 24, 'Chicken, breast, grilled without skin, meat only', 32),
  turkey_breast: pair('protein', 'raw', 'Turkey, light meat, raw', 24.4, 'Turkey, breast, fillet, grilled, meat only', 35),
  steak_lean: pair('protein', 'raw', 'Beef, rump steak, raw, lean', 22, 'Beef, rump steak, grilled, lean only', 31),
  beef_mince_5: pair('protein', 'raw', 'Beef, mince, raw, extra lean', 21.9, 'Beef, mince, extra lean, stewed', 24.7),
  cod: pair('protein', 'raw', 'Cod, flesh only, raw', 17.5, 'Cod, flesh only, baked', 23.9),
  salmon: pair('protein', 'raw', 'Salmon, farmed, flesh only, raw', 20.4, 'Salmon, farmed, flesh only, baked', 25.2),
  bacon_medallions: pair('protein', 'raw', 'Bacon rashers, back, fat trimmed, raw', 18.8, 'Bacon rashers, back, fat trimmed, grilled', 25.7),
});

/** Grams cooked per gram raw for a paired curated food, else null. */
export function cookedPerRaw(foodKey) {
  const p = COOK_YIELD_PAIRS[foodKey];
  return p ? p.raw.value / p.cooked.value : null;
}

/** True when the food has a CoFID pair (and so a raw/cooked toggle). */
export function hasCookToggle(foodKey) {
  return cookedPerRaw(foodKey) != null && stateOf(foodKey) !== 'ready';
}

/** 'dry' or 'raw': the label word for the food's uncooked weight. */
export function uncookedWord(foodKey) {
  return COOK_YIELD_PAIRS[foodKey]?.word ?? 'raw';
}

/**
 * The weight state the food's per-100g values are stated in: 'raw' (dry
 * foods) or 'cooked', or null for a food with no raw/cooked distinction.
 */
export function nativeState(foodKey) {
  const s = stateOf(foodKey);
  if (s === 'dry') return 'raw';
  if (s === 'cooked') return 'cooked';
  return null;
}

/**
 * The same amount of food expressed in another weight state. `from` and `to`
 * are 'raw' | 'cooked'. Unrounded; null when the food has no pair.
 */
export function convertCookGrams(foodKey, grams, from, to) {
  const k = cookedPerRaw(foodKey);
  if (k == null || !Number.isFinite(grams)) return null;
  if (from === to) return grams;
  if (from === 'raw' && to === 'cooked') return grams * k;
  if (from === 'cooked' && to === 'raw') return grams / k;
  return null;
}

/**
 * Grams on the food's own per-100g basis for grams weighed in `state`, so the
 * calories and macros match what was weighed. A food with no pair, or a state
 * that is already native (or 'as_weighed'), returns the grams unchanged.
 */
export function gramsOnNativeBasis(foodKey, grams, state) {
  const native = nativeState(foodKey);
  if (!native || (state !== 'raw' && state !== 'cooked') || state === native) return grams;
  const g = convertCookGrams(foodKey, grams, state, native);
  return g == null ? grams : g;
}

/** The curated key behind a food_ref ('curated:<key>'), else null. */
export function curatedKeyOfRef(ref) {
  return typeof ref === 'string' && ref.startsWith('curated:') ? ref.slice(8) : null;
}

/**
 * scaleMacros for grams weighed in `weightState`: the food's per-100g values
 * apply to the same amount of food on its own basis, so 200 g of chicken
 * weighed raw carries the macros of the 150 g it cooks to. Any food without
 * a CoFID pair scales exactly as scaleMacros does.
 */
export function scaleMacrosAsWeighed(food, grams, weightState) {
  const key = curatedKeyOfRef(food?.food_ref);
  return scaleMacros(food, key ? gramsOnNativeBasis(key, grams, weightState) : grams);
}
