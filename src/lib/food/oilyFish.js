/**
 * food/oilyFish.js: which foods count as oily fish, and how many oily-fish
 * meals a plan holds (owner answers 2026-10-20, item 25).
 *
 * Source: NHS advice is at least one portion (about 140 g cooked) of oily
 * fish a week, and no more than two portions a week if pregnant,
 * breastfeeding or planning a pregnancy. Tinned tuna does not count as oily
 * fish, so `tuna_water` is deliberately absent. Meals are counted, not
 * grams (owner answer: "Count meals").
 *
 * The key list holds the NHS species now, so a future curated food with one
 * of these keys is counted without another change. Only `salmon` and
 * `smoked_salmon` exist in the curated set today. Pure.
 */
export const OILY_FISH_KEYS = Object.freeze([
  'salmon', 'smoked_salmon', 'trout', 'mackerel', 'herring', 'kippers',
  'sardines', 'pilchards', 'sprats', 'whitebait', 'anchovies', 'eel',
  'carp', 'jack_fish', 'swordfish', 'fresh_tuna',
]);

/** Default weekly cap, in oily-fish meals. */
export const DEFAULT_OILY_FISH_CAP = 2;

/** The stored value for "No limit". Any other stored value is a number 0 to 7. */
export const OILY_FISH_NO_LIMIT = 'nolimit';

/**
 * The cap a profile asks for: a whole number 0 to 7, or Infinity for "No
 * limit". Unset or unreadable falls back to the default of 2. Pure.
 */
export function oilyFishCapFromProfile(profile) {
  const v = profile ? profile.mealPlanOilyFish : undefined;
  if (v === OILY_FISH_NO_LIMIT) return Infinity;
  const n = Number(v);
  if (v == null || v === '' || !Number.isFinite(n)) return DEFAULT_OILY_FISH_CAP;
  return Math.min(7, Math.max(0, Math.round(n)));
}

/**
 * Which of the seven days of a Mixed or Varied week may hold an oily-fish
 * meal: `cap` days, spaced evenly through the week (cap 2 gives day 2 and
 * day 6) so the meals never bunch at the front. Deterministic. Pure.
 */
export function oilyFishDays(cap, days = 7) {
  const c = Math.min(days, Math.max(0, Math.round(cap)));
  const out = new Set();
  for (let k = 0; k < c; k += 1) out.add(Math.floor(((k + 0.5) * days) / c));
  return out;
}

const SET = new Set(OILY_FISH_KEYS);
const keyOfRef = (ref) => (typeof ref === 'string' && ref.startsWith('curated:') ? ref.slice(8) : null);

/** Is this curated food key oily fish? */
export const isOilyFishKey = (key) => SET.has(key);

/** Does a meal carry oily fish? Reads curated `components[].food` or a saved meal's `items[].foodRef`. */
export function mealHasOilyFish(meal) {
  if (!meal) return false;
  if (Array.isArray(meal.components) && meal.components.some((c) => SET.has(c && c.food))) return true;
  if (Array.isArray(meal.items) && meal.items.some((it) => SET.has(keyOfRef(it && it.foodRef)))) return true;
  return false;
}

/** Number of oily-fish meals in one built day (`day.slots`). */
export function countOilyMeals(day) {
  return ((day && day.slots) || []).filter((s) => s.oily === true || mealHasOilyFish(s)).length;
}
