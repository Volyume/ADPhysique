// Custom portions on a custom food (D230 R20, lane 4B). A person who thinks in
// "1 slice" and "1 mug" names up to three portions of a food. The FIRST is
// what custom_foods.serving_g and serving_label store, so every reader that
// knows only those is unchanged; the second and third live in
// custom_foods.portions_json as a JSON array of { label, grams }.
//
// A portion only changes how an amount is ENTERED. Grams stay the stored truth
// (resolveGrams in servingEntry.js), and every written gram figure keeps the
// shared 1 to 5000 g bound. Pure functions: no I/O, no throw.

export const MAX_PORTIONS = 3; // the named serving plus two more
export const MAX_EXTRA_PORTIONS = MAX_PORTIONS - 1;
export const PORTION_LABEL_MAX = 24;
export const PORTION_GRAMS_MIN = 1;
export const PORTION_GRAMS_MAX = 5000;

function cleanPortion(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  if (typeof item.label !== 'string') return null;
  const label = item.label.trim();
  if (label.length < 1 || label.length > PORTION_LABEL_MAX) return null;
  const grams = typeof item.grams === 'number' ? item.grams : Number.NaN;
  if (!Number.isFinite(grams) || grams < PORTION_GRAMS_MIN || grams > PORTION_GRAMS_MAX) return null;
  return { label, grams };
}

// Tolerant reader. Accepts the stored JSON string or an already parsed array
// (the cloud sends jsonb). Bad JSON, a non-array, a wrong shape, an over-long
// label or an out-of-bound gram figure drops that item (or the lot), never
// throws. At most MAX_PORTIONS items are returned.
export function parsePortions(raw) {
  let value = raw;
  if (typeof raw === 'string') {
    if (raw.trim() === '') return [];
    try { value = JSON.parse(raw); } catch (_) { return []; }
  }
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const p = cleanPortion(item);
    if (p) out.push(p);
    if (out.length >= MAX_PORTIONS) break;
  }
  return out;
}

// The TEXT written to custom_foods.portions_json: the validated extras as JSON,
// or null when there are none (so a food with no extras stays NULL).
export function serialisePortions(list) {
  const clean = parsePortions(Array.isArray(list) ? list : []).slice(0, MAX_EXTRA_PORTIONS);
  return clean.length ? JSON.stringify(clean) : null;
}
