import { scaleMacros } from './macros';

export function buildFoodEntryPayload({ entryDate, mealSlot, foodRef, quantityG, food, weightState }) {
  return {
    entryDate,
    mealSlot,
    foodRef,
    quantityG,
    ...scaleMacros(food, quantityG),
    // Ultimate-Audit item 12: undefined when the caller has no basis choice
    // (e.g. quick relog, no sheet shown); logFoodEntry defaults it to
    // 'as_weighed', today's behaviour.
    weightState,
  };
}

export function buildSlotRecentPayload({ mealSlot, foodRef, quantityG }) {
  return {
    mealSlot,
    foodRef,
    quantityG,
  };
}
