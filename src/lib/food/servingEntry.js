// Serving-entry model for FoodDetailSheet (food-logging ease). Pulled out as
// pure functions so the conversion that turns a household serving ("1 slice")
// into stored GRAMS — the change most able to silently corrupt a logged amount —
// is unit-tested away from the component's native deps.
//
// Grams are always the stored truth (scaleMacros(food, grams) + the safety
// floors operate on grams); the unit only changes how the user enters the
// amount. A food with no named serving falls back to grams-only.

export const MAX_ENTRY_GRAMS = 5000;

// The selectable units for a food: its household serving (when known) first,
// then raw grams. Each unit's `grams` is the gram-weight of ONE unit, so
// grams = amount * unit.grams.
export function buildServingUnits(food) {
  const servingG = Number(food?.serving_g) || 0;
  const list = [];
  if (servingG > 0) {
    list.push({ key: 'serving', label: food?.serving_label || 'serving', grams: servingG });
  }
  list.push({ key: 'g', label: 'g', grams: 1 });
  return list;
}

// The unit + amount the sheet opens with. Edit preserves the exact logged grams
// (shown in grams). Add defaults to ONE named serving (zero keystrokes) when the
// food has one, else 100 g.
export function initialServingState(food, mode, initialQuantityG) {
  const servingG = Number(food?.serving_g) || 0;
  if (mode === 'edit' && initialQuantityG != null && initialQuantityG > 0) {
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
