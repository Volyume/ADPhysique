import { deriveDiaryDayViewModel } from '../diaryViewModel';

describe('deriveDiaryDayViewModel', () => {
  const entries = [
    { id: 'actual-breakfast', meal_slot: 'breakfast', is_planned: 0, kcal: 100, protein_g: 10, carbs_g: 12, fat_g: 3 },
    { id: 'planned-lunch-a', meal_slot: 'lunch', is_planned: 1, kcal: '200', protein_g: '20', carbs_g: '25', fat_g: '5' },
    { id: 'planned-lunch-b', meal_slot: 'lunch', is_planned: 1, kcal: 50, protein_g: 5, carbs_g: 6, fat_g: 1 },
    { id: 'planned-dinner', meal_slot: 'dinner', is_planned: 1, kcal: null, protein_g: 'bad', carbs_g: 10, fat_g: 2 },
  ];

  test('filters planned scaffolding from read-only view entries', () => {
    expect(deriveDiaryDayViewModel(entries, { readOnly: true }).viewEntries)
      .toEqual([entries[0]]);
  });

  test('keeps planned entries in pro mode', () => {
    expect(deriveDiaryDayViewModel(entries, { readOnly: false }).viewEntries)
      .toEqual(entries);
  });

  test('plannedCount counts distinct meal slots, not planned food rows', () => {
    expect(deriveDiaryDayViewModel(entries).plannedCount).toBe(2);
  });

  test('plannedTotals sums planned macros with numeric coercion', () => {
    expect(deriveDiaryDayViewModel(entries).plannedTotals).toEqual({
      kcal: 250,
      protein_g: 25,
      carbs_g: 41,
      fat_g: 8,
    });
  });

  test('returns null plannedTotals when there are no planned macros', () => {
    expect(deriveDiaryDayViewModel([
      { id: 'actual', meal_slot: 'snack', is_planned: 0, kcal: 100, protein_g: 10, carbs_g: 0, fat_g: 2 },
    ]).plannedTotals).toBeNull();
  });
});
