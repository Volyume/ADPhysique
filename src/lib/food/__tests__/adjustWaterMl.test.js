/**
 * adjustWaterMl (D230 R14, food level-up 2026-10-16), run against a REAL
 * SQLite (node:sqlite) with the REAL daily_water DDL from database.js and the
 * REAL transaction queue (database.runInTransaction), in the same
 * expo-sqlite-shaped adapter localCacheFts.test.js uses.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - Two calls in ONE tick yield the SUM. The Diary used to compute
 *    `waterMl + delta` from its render and write that total with setWater, so
 *    two taps inside one await window wrote the same base twice and one tap
 *    was lost. A delta applied in SQL cannot lose either; a read-then-write
 *    implementation of this function would fail the sum.
 *  - Each call returns ITS OWN result (the queue serialises the
 *    insert-update-read), so the screen can show what the database holds.
 *  - The day's row is created if absent; a tombstoned day (deleted_at set)
 *    counts from 0 and comes back to life, the rule setWater keeps.
 *  - The total stays inside setWater's own 0..20000 bounds.
 *  - Bad input throws before any write, and sync is scheduled exactly as
 *    setWater schedules it (once per write).
 */

let mockHandle;
jest.mock('../../database', () => {
  const actual = jest.requireActual('../../database');
  return { ...actual, db: jest.fn(async () => mockHandle) };
});
const mockScheduleSync = jest.fn();
jest.mock('../../sync', () => ({ scheduleSync: (...a) => mockScheduleSync(...a) }));

const { DatabaseSync } = require('node:sqlite');
const { adjustWaterMl, getWater, setWater, deleteWater } = require('../db');

// expo-sqlite-shaped adapter over node:sqlite, with the transaction hooks
// database.runInTransaction drives.
function adapt(raw) {
  let inTx = false;
  return {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
    isInTransactionSync: () => inTx,
    withTransactionAsync: async (task) => {
      raw.exec('BEGIN');
      inTx = true;
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        inTx = false;
      }
    },
  };
}

// The real DDL: database.js's daily_water CREATE plus its D1-#8 tombstone
// column migration.
function freshDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE IF NOT EXISTS daily_water (
      user_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      ml INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, entry_date)
    )`);
  raw.exec('ALTER TABLE daily_water ADD COLUMN deleted_at INTEGER');
  mockHandle = adapt(raw);
  return raw;
}

const DAY = '2026-10-16';

beforeEach(() => {
  mockScheduleSync.mockClear();
  freshDb();
});
afterEach(() => { mockHandle = null; });

describe('adjustWaterMl: the delta is applied atomically', () => {
  test('two calls in one tick yield the sum, on a day with no row yet', async () => {
    const results = await Promise.all([
      adjustWaterMl('u1', DAY, 250),
      adjustWaterMl('u1', DAY, 250),
    ]);
    expect(await getWater('u1', DAY)).toBe(500);
    // Each call reads back its own result, in order.
    expect(results).toEqual([250, 500]);
  });

  test('two calls in one tick yield the sum over an existing total', async () => {
    await setWater('u1', DAY, 1000);
    await Promise.all([
      adjustWaterMl('u1', DAY, 250),
      adjustWaterMl('u1', DAY, 500),
      adjustWaterMl('u1', DAY, -250),
    ]);
    expect(await getWater('u1', DAY)).toBe(1500);
  });

  test('another user and another day are untouched', async () => {
    await setWater('u2', DAY, 750);
    await setWater('u1', '2026-10-15', 300);
    await adjustWaterMl('u1', DAY, 250);
    expect(await getWater('u2', DAY)).toBe(750);
    expect(await getWater('u1', '2026-10-15')).toBe(300);
    expect(await getWater('u1', DAY)).toBe(250);
  });
});

describe('adjustWaterMl: bounds and tombstones', () => {
  test('never below zero', async () => {
    await setWater('u1', DAY, 250);
    expect(await adjustWaterMl('u1', DAY, -500)).toBe(0);
    expect(await getWater('u1', DAY)).toBe(0);
  });

  test("never above setWater's own ceiling", async () => {
    await setWater('u1', DAY, 19900);
    expect(await adjustWaterMl('u1', DAY, 500)).toBe(20000);
  });

  test('a tombstoned day counts from 0 and comes back to life', async () => {
    await setWater('u1', DAY, 800);
    await deleteWater('u1', DAY);
    expect(await getWater('u1', DAY)).toBe(0);
    expect(await adjustWaterMl('u1', DAY, 250)).toBe(250);
    expect(await getWater('u1', DAY)).toBe(250);
  });
});

describe('adjustWaterMl: validation and sync', () => {
  test('bad input throws before any write', async () => {
    await expect(adjustWaterMl('u1', DAY, 12.5)).rejects.toThrow(TypeError);
    await expect(adjustWaterMl('u1', 'not-a-day', 250)).rejects.toThrow(TypeError);
    await expect(adjustWaterMl('', DAY, 250)).rejects.toThrow(TypeError);
    await expect(adjustWaterMl('u1', DAY, 30000)).rejects.toThrow(TypeError);
    expect(await getWater('u1', DAY)).toBe(0);
    expect(mockScheduleSync).not.toHaveBeenCalled();
  });

  test('schedules sync once per write, as setWater does', async () => {
    await adjustWaterMl('u1', DAY, 250);
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
    await setWater('u1', DAY, 1000);
    expect(mockScheduleSync).toHaveBeenCalledTimes(2);
  });
});
