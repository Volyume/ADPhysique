import { scaleMacrosAsWeighed } from './cookYield';

export function buildFoodEntryPayload({ entryDate, mealSlot, foodRef, quantityG, food, weightState, note }) {
  return {
    entryDate,
    mealSlot,
    foodRef,
    quantityG,
    // Founder ruling 2026-10-19: grams are stored as weighed, in the
    // entry's weight state; the macros are those of the same amount of food
    // on its own per-100g basis (cookYield.js).
    ...scaleMacrosAsWeighed(food, quantityG, weightState),
    // Ultimate-Audit item 12: undefined when the caller has no basis choice
    // (e.g. quick relog, no sheet shown); logFoodEntry defaults it to
    // 'as_weighed', today's behaviour.
    weightState,
    // D230 R20: only present when the caller has a note, so a payload without
    // one is exactly what it was before the column existed.
    ...(note !== undefined && note !== null && note !== '' ? { note } : null),
  };
}

export function buildSlotRecentPayload({ mealSlot, foodRef, quantityG }) {
  return {
    mealSlot,
    foodRef,
    quantityG,
  };
}
