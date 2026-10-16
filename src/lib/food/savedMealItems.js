/**
 * savedMealItems: the pure list logic behind a saved meal's sheet (D230 R12).
 *
 * A saved meal stores its foods inline in `items_json` as
 *   { foodRef, name, quantityG, kcal, proteinG, carbsG, fatG, fibreG }
 * (see db.js). Before the person logs it, and while they edit it, each item is
 * held here as a DRAFT: the item as it is shown, with the grams the person has
 * chosen, plus the base it was loaded at. Nothing in this module reads or writes
 * storage; the screen decides when anything is written.
 *
 * How grams scale the macros: a changed amount scales the item's OWN stored
 * macros (per 100 g worked out from its stored grams) through the existing
 * `scaleMacros`, always from the base, so stepping up and back down returns
 * the exact stored figures rather than drifting by a rounding at each step. An
 * amount equal to the base returns the stored figures untouched. The meal's
 * remembered portions are the truth for the meal; the library's current figures
 * are not consulted, so a food the library no longer holds still scales.
 *
 * The bound on every amount is the diary's own (1 to 5000 g, whole grams
 * here); `logFoodEntries` re-validates every row, so this module narrows the
 * input but never replaces that check.
 *
 * Kept free of db.js on purpose: the sheets import this, and a test that
 * mocks the db module must not lose it.
 */
import { scaleMacros } from './macros';
import { MAX_ENTRY_GRAMS } from './servingEntry';

export const ITEM_STEP_G = 10;
export const ITEM_MIN_G = 1;
export const ITEM_MAX_G = MAX_ENTRY_GRAMS;

let keySeq = 0;
const nextKey = () => { keySeq += 1; return `smi-${keySeq}`; };

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r1 = (n) => Math.round(n * 10) / 10;

/** A quick add carries no grams by design (foodRef 'quick:*', 0 g with
 *  macros entered directly, FOOD-001): its amount is fixed, never stepped,
 *  and it is written back at 0 g exactly as logFoodEntries accepts it. */
export function isQuickAddRef(foodRef) {
  return typeof foodRef === 'string' && foodRef.startsWith('quick:');
}

/** Whole grams inside the diary's bound; anything unreadable reads as the minimum. */
export function clampItemGrams(grams) {
  const g = Math.round(Number(grams));
  if (!Number.isFinite(g)) return ITEM_MIN_G;
  return Math.min(ITEM_MAX_G, Math.max(ITEM_MIN_G, g));
}

/**
 * A draft from a stored item. `name` is the resolved name when there is one.
 * The shown grams start at the stored grams (clamped into the bound); the base
 * keeps the stored figures exactly.
 */
export function draftFromItem(item, name) {
  const baseG = num(item?.quantityG);
  const fixed = isQuickAddRef(item?.foodRef);
  return {
    key: nextKey(),
    foodRef: item?.foodRef,
    name: name ?? item?.name ?? 'Food',
    // A quick add stays at its stored 0 g (fresh-eyes review 2026-10-16: a
    // clamp to 1 g made a "1 g, 500 kcal" row whose grams and macros
    // disagreed); everything else is held inside the bound.
    fixed,
    quantityG: fixed ? 0 : clampItemGrams(baseG),
    base: {
      quantityG: baseG,
      kcal: num(item?.kcal),
      proteinG: num(item?.proteinG),
      carbsG: num(item?.carbsG),
      fatG: num(item?.fatG),
      fibreG: item?.fibreG != null && Number.isFinite(Number(item.fibreG)) ? Number(item.fibreG) : null,
    },
  };
}

/** A draft from a food the person has just picked (a food-shaped row with per-100g fields). */
export function draftFromFood(food, grams) {
  const g = clampItemGrams(grams);
  const m = scaleMacros(food, g);
  return draftFromItem({
    foodRef: food?.food_ref,
    name: food?.name,
    quantityG: g,
    kcal: m.kcal,
    proteinG: m.proteinG,
    carbsG: m.carbsG,
    fatG: m.fatG,
    fibreG: m.fibreG,
  }, food?.name);
}

/** The drafts for a stored items array; `names` is an optional Map<foodRef, { name }>.
 *  A real food stored with no grams (a legacy row) is left out: it could not
 *  be logged honestly at any amount (applySavedMealToDiary skipped it too).
 *  An item with no food reference is left out too. */
export function draftsFromItems(items, names) {
  const list = Array.isArray(items) ? items : [];
  return list
    // An item with no food reference is left out as well (D230 review #16):
    // it can never be logged or saved (updateSavedMeal rejects it every time),
    // so the editor never carries it and Save can succeed.
    .filter((it) => typeof it?.foodRef === 'string' && it.foodRef !== '')
    .filter((it) => isQuickAddRef(it?.foodRef) || num(it?.quantityG) > 0)
    .map((it) => draftFromItem(it, names?.get?.(it?.foodRef)?.name));
}

/** The macros of one draft at its shown grams. */
export function draftMacros(draft) {
  const { base } = draft;
  if (draft.fixed || draft.quantityG === base.quantityG || !(base.quantityG > 0)) {
    return { kcal: base.kcal, proteinG: base.proteinG, carbsG: base.carbsG, fatG: base.fatG, fibreG: base.fibreG };
  }
  const k = 100 / base.quantityG;
  return scaleMacros({
    kcal_100g: base.kcal * k,
    protein_100g: base.proteinG * k,
    carbs_100g: base.carbsG * k,
    fat_100g: base.fatG * k,
    fibre_100g: base.fibreG != null ? base.fibreG * k : null,
  }, draft.quantityG);
}

/** One draft as a stored item (the items_json shape), at its shown grams. */
export function draftToItem(draft, nameOverride) {
  const m = draftMacros(draft);
  return {
    foodRef: draft.foodRef,
    name: nameOverride ?? draft.name,
    quantityG: draft.quantityG,
    kcal: m.kcal,
    proteinG: m.proteinG,
    carbsG: m.carbsG,
    fatG: m.fatG,
    fibreG: m.fibreG,
  };
}

/** The live total under the list: kcal whole, grams to one decimal, as the saved-meal row shows them. */
export function draftTotals(drafts) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const d of drafts || []) {
    const m = draftMacros(d);
    kcal += m.kcal; protein += m.proteinG; carbs += m.carbsG; fat += m.fatG;
  }
  return { kcal: Math.round(kcal), protein: r1(protein), carbs: r1(carbs), fat: r1(fat) };
}

/**
 * The rows `logFoodEntries` takes, exactly the items as shown. An item with no
 * food reference is left out (it could never be logged, as applySavedMealToDiary
 * also skips it); a removed item is simply not in `drafts`.
 */
export function draftsToEntries(drafts, { mealSlot, entryDate }) {
  return (drafts || [])
    .filter((d) => typeof d.foodRef === 'string' && d.foodRef !== '')
    .map((d) => {
      const it = draftToItem(d);
      return {
        entryDate,
        mealSlot,
        foodRef: it.foodRef,
        quantityG: it.quantityG,
        kcal: it.kcal,
        proteinG: it.proteinG,
        carbsG: it.carbsG,
        fatG: it.fatG,
        fibreG: it.fibreG,
      };
    });
}
