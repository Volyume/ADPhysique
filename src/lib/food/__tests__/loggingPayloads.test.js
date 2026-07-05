import { buildFoodEntryPayload, buildSlotRecentPayload } from '../loggingPayloads';

describe('food logging payload helpers', () => {
  test('buildFoodEntryPayload scales per-100g macros and preserves entry identity', () => {
    expect(buildFoodEntryPayload({
      entryDate: '2026-07-05',
      mealSlot: 'lunch',
      foodRef: 'off:chicken',
      quantityG: 150,
      food: {
        kcal_100g: 120,
        protein_100g: 22,
        carbs_100g: 1,
        fat_100g: 2,
        fibre_100g: 0.5,
      },
    })).toEqual({
      entryDate: '2026-07-05',
      mealSlot: 'lunch',
      foodRef: 'off:chicken',
      quantityG: 150,
      kcal: 180,
      proteinG: 33,
      carbsG: 1.5,
      fatG: 3,
      fibreG: 0.8,
    });
  });

  test('buildSlotRecentPayload mirrors the derived-memory write shape', () => {
    expect(buildSlotRecentPayload({
      mealSlot: 'snack',
      foodRef: 'custom:banana',
      quantityG: 80,
    })).toEqual({
      mealSlot: 'snack',
      foodRef: 'custom:banana',
      quantityG: 80,
    });
  });
});
