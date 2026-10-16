// Serving-entry model for FoodDetailSheet (food-logging ease). Pulled out as
// pure functions so the conversion that turns a household serving ("1 slice")
// into stored GRAMS — the change most able to silently corrupt a logged amount —
// is unit-tested away from the component's native deps.
//
// Grams are always the stored truth (scaleMacros(food, grams) + the safety
// floors operate on grams); the unit only changes how the user enters the
// amount. A food with no named serving falls back to grams-only.

import { parsePortions } from './portions';

export const MAX_ENTRY_GRAMS = 5000;

// The selectable units for a food: its household serving (when known) first,
// then each extra custom portion (D230 R20: portions_json, keys 'portion:0',
// 'portion:1'), then raw grams. Each unit's `grams` is the gram-weight of ONE unit, so
// grams = amount * unit.grams.
//
// Founder ruling 2026-10-16 (food audit, "Add cooked weight"): a recipe with no
// cooked weight is logged in servings only. Its serving_g is a share of the RAW
// ingredient weight, which is not what a plate of the cooked dish weighs, so
// offering grams would price a cooked portion against the raw weight. Such a
// food (`servings_only`, set by resolveFoodRef) has the one serving unit and
// no grams. The serving's gram weight stays the internal storage scale.
export function isServingsOnly(food) {
  return food?.servings_only === true && Number(food?.serving_g) > 0;
}

export function buildServingUnits(food) {
  const servingG = Number(food?.serving_g) || 0;
  if (isServingsOnly(food)) {
    return [{ key: 'serving', label: food?.serving_label || 'serving', grams: servingG }];
  }
  const list = [];
  if (servingG > 0) {
    list.push({ key: 'serving', label: food?.serving_label || 'serving', grams: servingG });
  }
  parsePortions(food?.portions_json).forEach((p, index) => {
    list.push({ key: `portion:${index}`, label: p.label, grams: p.grams });
  });
  list.push({ key: 'g', label: 'g', grams: 1 });
  return list;
}

// The unit + amount the sheet opens with. A KNOWN prior portion opens in grams
// at that exact (rounded) amount — for edit that is this entry's logged grams,
// and for an "add again" off the recents list it is the remembered last portion
// passed as initialQuantityG. This keeps the long-press-to-adjust sheet showing
// the SAME portion a one-tap re-log would write (food review: the two must not
// diverge). With no prior portion, add defaults to ONE named serving (zero
// keystrokes) when the food has one, else 100 g. `mode` is retained in the
// signature for call-site clarity but no longer gates the prior-portion branch.
//
// D138: a remembered portion that is (near enough) a half-serving multiple of
// the food's own named serving reopens in THAT unit, not grams — a user who
// thinks in slices/scoops/servings should see "2 slices" again, not "62 g".
// "Near enough" is within 2% of the nearest half-serving (0.5, 1, 1.5, 2...),
// so a genuinely rounded-off gram figure (not a real multiple) still opens in
// grams exactly as before.
//
// Edit mode is stricter (food Diary audit 2026-10-16, item 2): an entry being
// edited reopens in a portion ONLY when that portion reproduces its stored
// grams exactly (within half a gram, so the rounded save writes the same
// grams back). Within 2% a 61 g entry opened as "2 x 30 g" and an untouched
// save wrote 60 g over it; it now opens as 61 g.
export const EDIT_EXACT_MATCH_G = 0.5;
export function initialServingState(food, mode, initialQuantityG) {
  const servingG = Number(food?.serving_g) || 0;
  if (isServingsOnly(food)) {
    // Servings only: a known amount reopens as servings. Edit mode keeps three
    // decimals, so an older entry that is not a tenth of a serving still
    // writes back the grams it has (within half a gram) when left alone.
    if (initialQuantityG != null && initialQuantityG > 0) {
      const places = mode === 'edit' ? 1000 : 10;
      return { unitKey: 'serving', amount: String(Math.round((initialQuantityG / servingG) * places) / places) };
    }
    return { unitKey: 'serving', amount: '1' };
  }
  if (initialQuantityG != null && initialQuantityG > 0) {
    // D230 R20: a half-multiple of ANY of the food's portions reopens in that
    // portion. The nearest match (smallest gram distance) wins; a tie goes to
    // the named serving, which is listed first.
    let best = null;
    for (const unit of buildServingUnits(food)) {
      if (unit.key === 'g' || !(unit.grams > 0)) continue;
      const nearestHalves = Math.round(initialQuantityG / (unit.grams / 2));
      if (nearestHalves <= 0) continue;
      const roundedServings = nearestHalves * 0.5;
      const roundedGrams = roundedServings * unit.grams;
      const distance = Math.abs(initialQuantityG - roundedGrams);
      if (mode === 'edit' ? distance >= EDIT_EXACT_MATCH_G : distance > initialQuantityG * 0.02) continue;
      if (!best || distance < best.distance) {
        best = { distance, unitKey: unit.key, amount: String(roundedServings) };
      }
    }
    if (best) return { unitKey: best.unitKey, amount: best.amount };
    return { unitKey: 'g', amount: String(Math.round(initialQuantityG)) };
  }
  if (servingG > 0) return { unitKey: 'serving', amount: '1' };
  return { unitKey: 'g', amount: '100' };
}

// Resolve the entered amount + chosen unit to grams. Non-finite / blank amounts
// resolve to 0 (which the validity check then rejects), never NaN.
export function resolveGrams(amount, unit) {
  const a = Number(amount);
  const g = (Number.isFinite(a) ? a : 0) * (Number(unit?.grams) || 0);
  return Number.isFinite(g) ? g : 0;
}

// The grams a save would write, rounded. Validity binds here (and in the sheet)
// so the safety floors can never be bypassed by the unit indirection.
export function isValidEntryGrams(grams) {
  const g = Math.round(grams);
  return g > 0 && g <= MAX_ENTRY_GRAMS;
}
