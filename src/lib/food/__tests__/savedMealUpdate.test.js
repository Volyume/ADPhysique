/**
 * updateSavedMeal (D230 lane 3B, R12 "Edit this meal"), against the real
 * SQLite harness the batched-write suite uses.
 *
 * Pins: one call writes the meal's new name AND items_json and stamps
 * updated_at (so the whole row syncs, saved_meals syncs whole rows) and
 * schedules a sync; items_json keeps its current shape (an array of
 * { foodRef, name, quantityG, kcal, proteinG, carbsG, fatG, fibreG }) so the
 * list, the totals and the log fan-out read it unchanged; every item is held
 * to the diary's bound (1 to 5000 g, finite macros) BEFORE anything is
 * written, so a saved meal can never hold a row logFoodEntries would refuse;
 * a blank name, no items, a missing, deleted or someone else's meal throws and
 * writes nothing; and LOGGING a meal (logFoodEntries over its items) leaves the
 * meal row untouched.
 */
jest.mock('../../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => {
      raw.exec('BEGIN');
      try { await fn(); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
const mockScheduleSync = jest.fn();
jest.mock('../../sync', () => ({ scheduleSync: (...a) => mockScheduleSync(...a) }));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../telemetry/firsts', () => ({ trackFirst: jest.fn(() => Promise.resolve()) }));
jest.mock('../../notifications/standDown', () => ({ standDownMeal: jest.fn(() => Promise.resolve(true)) }));
jest.mock('../../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const dbm = require('../../database');
const food = require('../db');
const { __raw: raw } = require('../../dbCrypto');

const ITEMS = [
  { foodRef: 'global:oats', name: 'Oats', quantityG: 80, kcal: 300, proteinG: 11, carbsG: 50, fatG: 6, fibreG: 8 },
  { foodRef: 'global:milk', name: 'Milk', quantityG: 200, kcal: 92, proteinG: 7, carbsG: 9.6, fatG: 3.2, fibreG: null },
];
let seq = 0;
const freshUser = () => `u-sm-${++seq}`;
const rowOf = (id) => raw.prepare('SELECT * FROM saved_meals WHERE id = ?').get(id);

beforeAll(async () => { await dbm.db(); });
beforeEach(() => { jest.clearAllMocks(); });

describe('updateSavedMeal', () => {
  test('writes the new name and items in one call, stamps updated_at and schedules a sync', async () => {
    const u = freshUser();
    const id = await food.createSavedMeal(u, { name: 'Porridge', items: ITEMS });
    raw.prepare('UPDATE saved_meals SET updated_at = 1000 WHERE id = ?').run(id);
    mockScheduleSync.mockClear();

    const next = [
      { ...ITEMS[0], quantityG: 100, kcal: 375, proteinG: 13.8, carbsG: 62.5, fatG: 7.5, fibreG: 10 },
      { foodRef: 'global:honey', name: 'Honey', quantityG: 10, kcal: 30, proteinG: 0, carbsG: 8.2, fatG: 0, fibreG: null },
    ];
    const before = Date.now();
    await food.updateSavedMeal(u, id, { name: '  Porridge with honey ', items: next });

    const row = rowOf(id);
    expect(row.name).toBe('Porridge with honey');
    expect(JSON.parse(row.items_json)).toEqual(next);
    expect(row.updated_at).toBeGreaterThanOrEqual(before);
    expect(row.deleted_at).toBeNull();
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);

    // The shape is the one the list and the totals already read.
    const got = await food.getSavedMeal(u, id);
    expect(got.itemCount).toBe(2);
    expect(got.items).toEqual(next);
    expect(got.totals).toEqual(food.computeSavedMealTotals(next));
  });

  test('writes nothing and throws on a blank name, no items, or an invalid item', async () => {
    const u = freshUser();
    const id = await food.createSavedMeal(u, { name: 'Porridge', items: ITEMS });
    const stored = rowOf(id);
    mockScheduleSync.mockClear();
    const bad = [
      [{ name: '   ', items: ITEMS }, /name cannot be blank/],
      [{ name: 'X', items: [] }, /at least one item/],
      [{ name: 'X', items: 'nope' }, /at least one item/],
      [{ name: 'X', items: [{ ...ITEMS[0], quantityG: 0 }] }, /item 1 is not a valid food/],
      [{ name: 'X', items: [ITEMS[0], { ...ITEMS[1], quantityG: 5001 }] }, /item 2 is not a valid food/],
      [{ name: 'X', items: [{ ...ITEMS[0], foodRef: '' }] }, /item 1 is not a valid food/],
      [{ name: 'X', items: [{ ...ITEMS[0], kcal: NaN }] }, /item 1 is not a valid food/],
      [{ name: 'X', items: [{ ...ITEMS[0], proteinG: -1 }] }, /item 1 is not a valid food/],
      [{ name: 'X', items: [null] }, /item 1 is not a valid food/],
    ];
    for (const [payload, message] of bad) {
      // eslint-disable-next-line no-await-in-loop
      await expect(food.updateSavedMeal(u, id, payload)).rejects.toThrow(message);
    }
    expect(rowOf(id)).toEqual(stored);
    expect(mockScheduleSync).not.toHaveBeenCalled();
  });

  test('the diary\'s bound holds at its edges (1 g and 5000 g are valid)', async () => {
    const u = freshUser();
    const id = await food.createSavedMeal(u, { name: 'Edges', items: ITEMS });
    await food.updateSavedMeal(u, id, {
      name: 'Edges',
      items: [{ ...ITEMS[0], quantityG: 1 }, { ...ITEMS[1], quantityG: 5000 }],
    });
    expect(JSON.parse(rowOf(id).items_json).map((i) => i.quantityG)).toEqual([1, 5000]);
  });

  test('a missing, deleted or someone else\'s meal throws and changes nothing', async () => {
    const u = freshUser();
    const other = freshUser();
    const id = await food.createSavedMeal(u, { name: 'Mine', items: ITEMS });
    await expect(food.updateSavedMeal(u, 'no-such-meal', { name: 'X', items: ITEMS })).rejects.toThrow(/meal not found/);
    await expect(food.updateSavedMeal(other, id, { name: 'Theirs', items: ITEMS })).rejects.toThrow(/meal not found/);
    expect(rowOf(id).name).toBe('Mine');
    await food.deleteSavedMeal(u, id);
    await expect(food.updateSavedMeal(u, id, { name: 'Back', items: ITEMS })).rejects.toThrow(/meal not found/);
    expect(rowOf(id).name).toBe('Mine');
  });

  test('logging a meal\'s items as shown leaves the meal row untouched', async () => {
    const u = freshUser();
    const id = await food.createSavedMeal(u, { name: 'Porridge', items: ITEMS });
    raw.prepare('UPDATE saved_meals SET updated_at = 1000 WHERE id = ?').run(id);
    const stored = rowOf(id);
    // Only the milk, at a changed amount: the same rows the sheet would write.
    const ids = await food.logFoodEntries(u, [{
      entryDate: '2026-10-16', mealSlot: 'breakfast', foodRef: 'global:milk', quantityG: 250,
      kcal: 115, proteinG: 8.8, carbsG: 12, fatG: 4, fibreG: null,
    }]);
    expect(ids).toHaveLength(1);
    expect(rowOf(id)).toEqual(stored);
  });
});
