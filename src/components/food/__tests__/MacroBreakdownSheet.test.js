// mealBreakdown is pure; stub the store so importing the component
// module doesn't drag the zustand/AsyncStorage chain into the test.
jest.mock('../../../store/useAppStore', () => ({ __esModule: true, default: () => undefined }));
// Haptics completion pass (2026-07-10): the component now imports the
// haptics vocabulary, which reaches expo-haptics (a native module) at
// import time; stub it the same way foodComponents.test.js does.
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import { mealBreakdown } from '../MacroBreakdownSheet';

const e = (slot, kcal, p, c, f) => ({
  meal_slot: slot, kcal, protein_g: p, carbs_g: c, fat_g: f,
});

describe('mealBreakdown (GAP row 27)', () => {
  test('no entries → no rows and a zero total', () => {
    expect(mealBreakdown([])).toEqual({
      rows: [],
      total: { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
    });
  });

  test('sums per slot and across the day', () => {
    const { rows, total } = mealBreakdown([
      e('breakfast', 300, 20, 30, 10),
      e('breakfast', 200, 10, 20, 5),
      e('dinner', 600, 40, 50, 20),
    ]);
    expect(rows).toEqual([
      { key: 'breakfast', label: 'Breakfast', kcal: 500, protein: 30, carbs: 50, fat: 15, count: 2 },
      { key: 'dinner', label: 'Dinner', kcal: 600, protein: 40, carbs: 50, fat: 20, count: 1 },
    ]);
    expect(total).toEqual({ kcal: 1100, protein: 70, carbs: 100, fat: 35, count: 3 });
  });

  test('rows come back in meal order regardless of entry order', () => {
    const { rows } = mealBreakdown([
      e('snack', 100, 1, 1, 1),
      e('breakfast', 100, 1, 1, 1),
      e('dinner', 100, 1, 1, 1),
      e('lunch', 100, 1, 1, 1),
    ]);
    expect(rows.map((r) => r.key)).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
  });

  test('empty slots are dropped, not shown as zeros', () => {
    const { rows } = mealBreakdown([e('lunch', 100, 1, 1, 1)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('lunch');
  });

  test('fractional macros are summed then rounded once', () => {
    const { rows, total } = mealBreakdown([
      e('lunch', 100.4, 1.2, 1.2, 1.2),
      e('lunch', 100.4, 1.2, 1.2, 1.2),
    ]);
    expect(rows[0]).toMatchObject({ kcal: 201, protein: 2, carbs: 2, fat: 2 });
    expect(total).toMatchObject({ kcal: 201, protein: 2, carbs: 2, fat: 2, count: 2 });
  });

  test('missing macro fields coerce to zero', () => {
    const { rows } = mealBreakdown([{ meal_slot: 'snack' }]);
    expect(rows[0]).toMatchObject({ kcal: 0, protein: 0, carbs: 0, fat: 0, count: 1 });
  });
});
