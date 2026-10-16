/**
 * getEntriesForClockWindow (D230 R7, food level-up 2026-10-16), run against a
 * REAL SQLite (node:sqlite) with the REAL food_entries DDL from database.js
 * (the CREATE plus the is_planned, weight_state and eaten_at column
 * migrations), in the same expo-sqlite-shaped adapter adjustWaterMl.test.js
 * and localCacheFts.test.js use.
 *
 * The query is the evidence "Around this time" ranks, so what it lets through
 * is what the add screen offers. Each pin is written to fail:
 *  - PLANNED IS NOT EATEN: an unconfirmed meal-plan row is not evidence of
 *    what the person eats at this hour (drop `is_planned = 0` and it leaks).
 *  - A deleted row is not evidence (drop `deleted_at IS NULL` and it leaks).
 *  - A row with no eaten_at has no clock time (drop the NULL filter and the
 *    ranker would have to guess one).
 *  - Only the day keys asked for, inclusive at both ends, and only this user.
 *  - Exactly the four columns the pure ranker reads, nothing else.
 */

let mockHandle;
jest.mock('../../database', () => {
  const actual = jest.requireActual('../../database');
  return { ...actual, db: jest.fn(async () => mockHandle) };
});
jest.mock('../../sync', () => ({ scheduleSync: jest.fn() }));

const { DatabaseSync } = require('node:sqlite');
const { getEntriesForClockWindow } = require('../db');

function adapt(raw) {
  return {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
  };
}

// database.js's food_entries CREATE, then its three column migrations.
function freshDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE IF NOT EXISTS food_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      meal_slot TEXT NOT NULL,
      food_ref TEXT NOT NULL,
      quantity_g REAL NOT NULL,
      kcal REAL NOT NULL,
      protein_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      fibre_g REAL,
      logged_at INTEGER NOT NULL,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
  raw.exec('ALTER TABLE food_entries ADD COLUMN is_planned INTEGER NOT NULL DEFAULT 0');
  raw.exec("ALTER TABLE food_entries ADD COLUMN weight_state TEXT NOT NULL DEFAULT 'as_weighed'");
  raw.exec('ALTER TABLE food_entries ADD COLUMN eaten_at INTEGER');
  mockHandle = adapt(raw);
  return raw;
}

let seq = 0;
function insert(raw, {
  userId = 'u1', entryDate, foodRef, quantityG = 100, eatenAt = 1_760_000_000_000,
  isPlanned = 0, deletedAt = null,
}) {
  seq += 1;
  raw.prepare(`INSERT INTO food_entries (
      id, user_id, entry_date, meal_slot, food_ref, quantity_g, kcal, protein_g, carbs_g, fat_g,
      fibre_g, logged_at, deleted_at, created_at, updated_at, is_planned, eaten_at
    ) VALUES (?, ?, ?, 'meal_1', ?, ?, 100, 5, 10, 2, NULL, 1, ?, 1, 1, ?, ?)`)
    .run(`e${seq}`, userId, entryDate, foodRef, quantityG, deletedAt, isPlanned, eatenAt);
}

let raw;
beforeEach(() => { seq = 0; raw = freshDb(); });
afterEach(() => { mockHandle = null; });

describe('getEntriesForClockWindow', () => {
  test('returns only actual, undeleted rows with an eaten_at, between the day keys inclusive', async () => {
    insert(raw, { entryDate: '2026-08-17', foodRef: 'off:first-day', eatenAt: 1000 });
    insert(raw, { entryDate: '2026-10-15', foodRef: 'off:last-day', eatenAt: 2000 });
    insert(raw, { entryDate: '2026-09-20', foodRef: 'off:middle', eatenAt: 3000, quantityG: 60 });
    // Each of these must be left out.
    insert(raw, { entryDate: '2026-09-20', foodRef: 'off:planned', isPlanned: 1, eatenAt: 4000 });
    insert(raw, { entryDate: '2026-09-20', foodRef: 'off:deleted', deletedAt: 5, eatenAt: 5000 });
    insert(raw, { entryDate: '2026-09-20', foodRef: 'off:untimed', eatenAt: null });
    insert(raw, { entryDate: '2026-08-16', foodRef: 'off:before-range', eatenAt: 6000 });
    insert(raw, { entryDate: '2026-10-16', foodRef: 'off:today', eatenAt: 7000 });
    insert(raw, { userId: 'u2', entryDate: '2026-09-20', foodRef: 'off:someone-else', eatenAt: 8000 });

    const rows = await getEntriesForClockWindow('u1', { fromDate: '2026-08-17', toDate: '2026-10-15' });
    expect(rows.map((r) => r.food_ref)).toEqual(['off:first-day', 'off:middle', 'off:last-day']);
  });

  test('carries exactly the four columns the ranker reads', async () => {
    insert(raw, { entryDate: '2026-09-20', foodRef: 'off:oats', quantityG: 60, eatenAt: 1234 });
    const rows = await getEntriesForClockWindow('u1', { fromDate: '2026-09-01', toDate: '2026-09-30' });
    expect(rows).toHaveLength(1);
    expect({ ...rows[0] }).toEqual({
      food_ref: 'off:oats', eaten_at: 1234, quantity_g: 60, entry_date: '2026-09-20',
    });
  });

  test('orders by day, then time, then id, so the ranker always gets one order', async () => {
    insert(raw, { entryDate: '2026-09-21', foodRef: 'off:c', eatenAt: 10 });
    insert(raw, { entryDate: '2026-09-20', foodRef: 'off:b', eatenAt: 20 });
    insert(raw, { entryDate: '2026-09-20', foodRef: 'off:a', eatenAt: 10 });
    const rows = await getEntriesForClockWindow('u1', { fromDate: '2026-09-01', toDate: '2026-09-30' });
    expect(rows.map((r) => r.food_ref)).toEqual(['off:a', 'off:b', 'off:c']);
  });

  test('missing arguments read nothing', async () => {
    insert(raw, { entryDate: '2026-09-20', foodRef: 'off:oats' });
    expect(await getEntriesForClockWindow(null, { fromDate: '2026-09-01', toDate: '2026-09-30' })).toEqual([]);
    expect(await getEntriesForClockWindow('u1', { fromDate: '2026-09-01' })).toEqual([]);
    expect(await getEntriesForClockWindow('u1')).toEqual([]);
  });
});
