import { scaleMacros } from './macros';

export function buildFoodEntryPayload({ entryDate, mealSlot, foodRef, quantityG, food }) {
  return {
    entryDate,
    mealSlot,
    foodRef,
    quantityG,
    ...scaleMacros(food, quantityG),
  };
}

export function buildSlotRecentPayload({ mealSlot, foodRef, quantityG }) {
  return {
    mealSlot,
    foodRef,
    quantityG,
  };
}
