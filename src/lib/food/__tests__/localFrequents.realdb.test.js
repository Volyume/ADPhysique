/**
 * Food audit follow-up 2026-10-16: the "Often" tab ranks by the device's own
 * log counts. Real SQLite (node:sqlite) through the REAL database.js init and
 * the REAL food/db.js, set up as dataLayerAudit.realdb.test.js does; only the
 * edges are mocked. What this suite pins, each written to fail on the old tab
 * (which read only the nightly server snapshot of synced entries):
 *  - getLocalFoodFrequents: a food logged three times today outranks one
 *    logged once; a planned row, a deleted row, a quick add and an entry
 *    older than 30 local days do not count; ties go to the most recently
 *    logged; the limit applies; another person's rows never count.
 *  - mergeFrequents (pure): each ref ranks by the larger of its local and
 *    snapshot counts, snapshot rows fill refs the local list lacks, nothing
 *    twice, so a fresh install still has a tab.
 */
const mockState = { realTx: false, inTx: false };

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
      if (!mockState.realTx) { await fn(); return; }
      raw.exec('BEGIN');
      mockState.inTx = true;
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        mockState.inTx = false;
      }
    },
    isInTransactionSync: () => mockState.inTx,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../../sync', () => ({ scheduleSync: jest.fn() }));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../telemetry/firsts', () => ({ trackFirst: jest.fn(() => Promise.resolve()) }));
jest.mock('../../notifications/standDown', () => ({ standDownMeal: jest.fn(() => Promise.resolve(false)) }));
jest.mock('../../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const dbm = require('../../database');
const food = require('../db');
const { mergeFrequents } = require('../frequents');
const { localDayKey } = require('../../dayKey');

let clock = new Date(2026, 9, 16, 10, 0).getTime();
let nowSpy;
let seq = 0;
const freshUser = () => `u-often-${++seq}`;
const dayOffset = (n) => localDayKey(new Date(2026, 9, 16 + n).getTime());
const TODAY = dayOffset(0);
const entry = (over = {}) => ({
  entryDate: TODAY, mealSlot: 'meal_1', foodRef: 'custom:abc', quantityG: 100,
  kcal: 200, proteinG: 10, carbsG: 20, fatG: 5, fibreG: 1, ...over,
});
const log = async (u, over) => { clock += 1000; return food.logFoodEntry(u, entry(over)); };

beforeAll(async () => {
  await dbm.db();
  mockState.realTx = true;
});
beforeEach(() => {
  clock += 60_000;
  nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
});
afterEach(() => nowSpy.mockRestore());

describe('getLocalFoodFrequents', () => {
  test('a food logged three times today outranks one logged once', async () => {
    const u = freshUser();
    await log(u, { foodRef: 'custom:once' });
    await log(u, { foodRef: 'custom:thrice' });
    await log(u, { foodRef: 'custom:thrice', mealSlot: 'meal_2' });
    await log(u, { foodRef: 'custom:thrice', mealSlot: 'meal_3' });
    const rows = await food.getLocalFoodFrequents(u);
    expect(rows.map((r) => [r.food_ref, r.log_count])).toEqual([['custom:thrice', 3], ['custom:once', 1]]);
    expect(rows[0].last_logged_at).toBeGreaterThan(0);
  });

  test('a planned row, a deleted row, a quick add and an entry older than 30 days do not count', async () => {
    const u = freshUser();
    await log(u, { foodRef: 'custom:real' });
    await log(u, { foodRef: 'custom:planned', isPlanned: true });
    const gone = await log(u, { foodRef: 'custom:deleted' });
    await food.deleteFoodEntry(gone, u);
    await log(u, { foodRef: 'custom:old', entryDate: dayOffset(-30) });
    await log(u, { foodRef: 'quick:abc', quantityG: 0 });
    const rows = await food.getLocalFoodFrequents(u);
    expect(rows.map((r) => r.food_ref)).toEqual(['custom:real']);
  });

  test('the 30-day window includes today and the 29 days before it', async () => {
    const u = freshUser();
    await log(u, { foodRef: 'custom:edge', entryDate: dayOffset(-29) });
    await log(u, { foodRef: 'custom:out', entryDate: dayOffset(-30) });
    expect((await food.getLocalFoodFrequents(u)).map((r) => r.food_ref)).toEqual(['custom:edge']);
    expect((await food.getLocalFoodFrequents(u, { days: 31 })).map((r) => r.food_ref).sort())
      .toEqual(['custom:edge', 'custom:out']);
  });

  test('equal counts go to the most recently logged; the limit applies; other people never count', async () => {
    const u = freshUser();
    await log(u, { foodRef: 'custom:first' });
    await log(u, { foodRef: 'custom:second' });
    await log(u, { foodRef: 'custom:third' });
    await log(freshUser(), { foodRef: 'custom:someoneElses' });
    expect((await food.getLocalFoodFrequents(u)).map((r) => r.food_ref))
      .toEqual(['custom:third', 'custom:second', 'custom:first']);
    expect((await food.getLocalFoodFrequents(u, { limit: 2 })).map((r) => r.food_ref))
      .toEqual(['custom:third', 'custom:second']);
    expect(await food.getLocalFoodFrequents(null)).toEqual([]);
  });
});

describe('mergeFrequents', () => {
  // Re-pinned 2026-10-16 (lead review): a ref in both lists ranks by the
  // larger count, so a food eaten twenty times on another phone is not
  // outranked by one logged once here; equal counts keep local-first order.
  test('each ref ranks by the larger of its local and snapshot counts; nothing twice', () => {
    const merged = mergeFrequents(
      [{ food_ref: 'a', log_count: 3 }, { food_ref: 'b', log_count: 1 }],
      [{ food_ref: 'c', log_count: 9 }, { food_ref: 'a', log_count: 20 }, { food_ref: 'd', log_count: 4 }],
    );
    expect(merged).toEqual([
      { food_ref: 'a', log_count: 20 }, { food_ref: 'c', log_count: 9 },
      { food_ref: 'd', log_count: 4 }, { food_ref: 'b', log_count: 1 },
    ]);
  });

  test('a food logged today but not yet in the snapshot still ranks by its local count', () => {
    const merged = mergeFrequents([{ food_ref: 'new', log_count: 5 }], [{ food_ref: 'old', log_count: 4 }]);
    expect(merged.map((r) => r.food_ref)).toEqual(['new', 'old']);
  });

  test('equal counts keep local-first order', () => {
    const merged = mergeFrequents([{ food_ref: 'l', log_count: 2 }], [{ food_ref: 's', log_count: 2 }]);
    expect(merged.map((r) => r.food_ref)).toEqual(['l', 's']);
  });

  test('a fresh install (no local rows) shows the snapshot; nothing at all is an empty list', () => {
    expect(mergeFrequents([], [{ food_ref: 'x', log_count: 5 }])).toEqual([{ food_ref: 'x', log_count: 5 }]);
    expect(mergeFrequents([], [])).toEqual([]);
    expect(mergeFrequents(undefined, null)).toEqual([]);
  });

  test('the limit applies after the merge, and rows without a ref are dropped', () => {
    const merged = mergeFrequents(
      [{ food_ref: 'a', log_count: 2 }, { log_count: 7 }],
      [{ food_ref: 'b', log_count: 1 }, { food_ref: 'c', log_count: 1 }],
      2,
    );
    expect(merged.map((r) => r.food_ref)).toEqual(['a', 'b']);
  });
});
