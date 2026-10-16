/**
 * diaryInPlace.test.js - D230 R17 (lane 3D). Pins the pure helpers behind the
 * Diary's "update in place, reconcile in the background":
 *   - the rollup computed from the rows is the sum the database stores
 *     (planned rows and other days excluded);
 *   - a written row lands in the database's own order;
 *   - emptySlotKey is STABLE across a write that fills no meal (the effects'
 *     dependency: that write must not re-run the per-meal queries) and
 *     changes exactly when a meal fills or empties.
 */
import {
  entryRowFromPayload, insertEntry, removeEntry, patchEntry,
  rollupFromEntries, emptySlotKey, emptySlotKeysFromKey,
} from '../diaryInPlace';

const row = (over = {}) => ({
  id: 'a', user_id: 'u1', entry_date: '2026-10-16', meal_slot: 'meal_1', food_ref: 'global:x',
  quantity_g: 100, kcal: 200, protein_g: 10, carbs_g: 20, fat_g: 5, fibre_g: 2,
  is_planned: 0, eaten_at: null, logged_at: 1, ...over,
});

describe('rollupFromEntries', () => {
  test('sums live rows of the day and nothing else', () => {
    const r = rollupFromEntries([
      row(),
      row({ id: 'b', kcal: 100, protein_g: 4, carbs_g: 5, fat_g: 1, fibre_g: null }),
      row({ id: 'c', is_planned: 1, kcal: 999 }),
      row({ id: 'd', entry_date: '2026-10-15', kcal: 999 }),
      row({ id: 'e', deleted_at: 5, kcal: 999 }),
    ], { userId: 'u1', entryDate: '2026-10-16' });
    expect(r).toMatchObject({ kcal_total: 300, protein_g: 14, carbs_g: 25, fat_g: 6, fibre_g: 2, entries_count: 2 });
  });

  test('an empty day is zero, and the base row keeps the columns the sum does not own', () => {
    const r = rollupFromEntries([], { userId: 'u1', entryDate: '2026-10-16', base: { updated_at: 9, extra: 'kept' } });
    expect(r).toMatchObject({ kcal_total: 0, entries_count: 0, updated_at: 9, extra: 'kept' });
  });
});

describe('row edits', () => {
  test('entryRowFromPayload carries the written values and the resolved name', () => {
    const r = entryRowFromPayload({
      id: 'n1', userId: 'u1', now: 50,
      payload: { entryDate: '2026-10-16', mealSlot: 'meal_2', foodRef: 'global:o', quantityG: 60, kcal: 227, proteinG: 7.8, carbsG: 36, fatG: 4.8, fibreG: 6 },
      food: { name: 'Porridge oats', brand: null },
    });
    expect(r).toMatchObject({ id: 'n1', meal_slot: 'meal_2', quantity_g: 60, kcal: 227, protein_g: 7.8, is_planned: 0, eaten_at: 50, _name: 'Porridge oats' });
  });

  test('insertEntry keeps the database order: meal, then eaten time (none last), then logged time', () => {
    const base = [
      row({ id: 'a', meal_slot: 'meal_1', eaten_at: 10 }),
      row({ id: 'b', meal_slot: 'meal_1', eaten_at: null, logged_at: 5 }),
      row({ id: 'c', meal_slot: 'meal_2', eaten_at: 3 }),
    ];
    const out = insertEntry(base, row({ id: 'n', meal_slot: 'meal_1', eaten_at: 20 }));
    expect(out.map((e) => e.id)).toEqual(['a', 'n', 'b', 'c']);
  });

  test('removeEntry and patchEntry; a patch to another day takes the row out of the view', () => {
    const base = [row({ id: 'a' }), row({ id: 'b', meal_slot: 'meal_2' })];
    expect(removeEntry(base, 'a').map((e) => e.id)).toEqual(['b']);
    expect(patchEntry(base, 'a', { quantity_g: 50, kcal: 100 }, '2026-10-16').find((e) => e.id === 'a').kcal).toBe(100);
    expect(patchEntry(base, 'a', { entry_date: '2026-10-17' }, '2026-10-16').map((e) => e.id)).toEqual(['b']);
    expect(patchEntry(base, 'zzz', { kcal: 1 }, '2026-10-16')).toEqual(base);
  });
});

describe('emptySlotKey: the per-meal effects\' dependency', () => {
  const ladder = ['meal_1', 'meal_2', 'meal_3', 'meal_4'];

  test('is a stable string for the same set of empty meals', () => {
    const a = emptySlotKey(ladder, { meal_1: [row()] });
    const b = emptySlotKey(ladder, { meal_1: [row(), row({ id: 'z' })] });
    expect(a).toBe('meal_2,meal_3,meal_4');
    expect(b).toBe(a); // a write into a meal that already had food: no change
  });

  test('changes when a write fills a meal, and when a delete empties one', () => {
    const before = emptySlotKey(ladder, { meal_1: [row()] });
    const filled = emptySlotKey(ladder, { meal_1: [row()], meal_3: [row({ id: 'n', meal_slot: 'meal_3' })] });
    expect(filled).not.toBe(before);
    expect(emptySlotKey(ladder, {})).toBe('meal_1,meal_2,meal_3,meal_4');
  });

  test('round-trips through emptySlotKeysFromKey; a full day is the empty string', () => {
    expect(emptySlotKeysFromKey('meal_2,meal_3')).toEqual(['meal_2', 'meal_3']);
    expect(emptySlotKeysFromKey('')).toEqual([]);
    const all = Object.fromEntries(ladder.map((k) => [k, [row()]]));
    expect(emptySlotKey(ladder, all)).toBe('');
  });
});
