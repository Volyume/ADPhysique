/**
 * The batched diary writes (D230 R9 and R10, food level-up lane 3A):
 * logFoodEntries, deleteFoodEntries, restoreFoodEntries, updateFoodEntries and
 * the bulkEntryOps copy / delete / move built on them.
 *
 * Run against a REAL SQLite (node:sqlite) through the REAL database.js init
 * path (the real food_entries / daily_intake_rollups / food_slot_recents DDL
 * and the real runInTransaction queue), with an expo-sqlite-shaped adapter
 * that issues a real BEGIN / COMMIT / ROLLBACK once the schema is up, so a
 * rollback in these cases is SQLite's own. Only the edges are mocked: sync,
 * telemetry, the meal-reminder stand-down.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - ONE transaction per deed. N rows, one BEGIN. A per-row loop (the code
 *    before this lane) opens N and fails the count.
 *  - ONE rollup recompute per distinct day, ONE sync schedule, ONE first-food
 *    telemetry, ONE meal-reminder stand-down per day, and the per-row
 *    food_logged event kept per row (the dashboard's contract). A per-row
 *    recompute fails the rollup count.
 *  - ALL OR NOTHING. A bad row anywhere (the last one included) throws before
 *    any row is written; a write that fails part-way (a trigger aborts the
 *    third insert) leaves no row, no rollup and no side effect. The old
 *    per-row loop left the first rows in the diary.
 *  - THE SAME VALIDATION as a single write, row for row (FOOD-001): a parity
 *    matrix runs every kind of bad row through logFoodEntry and
 *    logFoodEntries and demands the same verdict and the same reason, and a
 *    quick-add keeps its zero-gram rule.
 *  - PLANNED IS NOT EATEN. A planned row in a batch keeps a NULL eaten_at, is
 *    left out of the rollup, stands nothing down and earns no first-food
 *    event; a copy of a day holding a plan writes no planned row and no actual
 *    from it, and leaves the source plan untouched.
 *  - A COPY KEEPS EACH ROW'S TIME. 13:05 on a March day is 13:05 on an April
 *    day (GMT to BST), not 14:05; an untimed source row takes the write's own
 *    "now"; weight_state and quantity carry over.
 *  - A DAY READS IN THE ORDER IT WAS EATEN: meal, then eaten_at (untimed
 *    last), then write order.
 *  - Delete, restore and move of N rows recompute each touched day once, the
 *    serving memory once per (meal, food) an actual row carried, and never for
 *    planned scaffolding.
 */
const mockState = { realTx: false, inTx: false, transactions: 0, statements: [] };

jest.mock('../../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      mockState.statements.push(sql);
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    // Pass-through while the schema is being built; a real transaction after.
    withTransactionAsync: async (fn) => {
      if (!mockState.realTx) { await fn(); return; }
      mockState.transactions += 1;
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
const mockScheduleSync = jest.fn();
jest.mock('../../sync', () => ({ scheduleSync: (...a) => mockScheduleSync(...a) }));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../../engineTelemetry', () => ({ track: (...a) => mockTrack(...a) }));
const mockTrackFirst = jest.fn(() => Promise.resolve());
jest.mock('../../telemetry/firsts', () => ({ trackFirst: (...a) => mockTrackFirst(...a) }));
const mockStandDownMeal = jest.fn(() => Promise.resolve(true));
jest.mock('../../notifications/standDown', () => ({ standDownMeal: (...a) => mockStandDownMeal(...a) }));
jest.mock('../../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const fs = require('fs');
const path = require('path');
const dbm = require('../../database');
const food = require('../db');
const bulk = require('../bulkEntryOps');
const { __raw: raw } = require('../../dbCrypto');

const D_MAR = '2026-03-10'; // GMT
const D_APR = '2026-04-02'; // BST
const D_APR2 = '2026-04-03';

let userSeq = 0;
const freshUser = () => `u-batch-${++userSeq}`;

const row = (over = {}) => ({
  entryDate: D_APR, mealSlot: 'meal_1', foodRef: 'global:oats', quantityG: 60,
  kcal: 227, proteinG: 8, carbsG: 36, fatG: 5, fibreG: 6, ...over,
});

const entriesOf = (u, date) => raw.prepare(
  'SELECT * FROM food_entries WHERE user_id = ? AND entry_date = ? ORDER BY logged_at, rowid',
).all(u, date);
const allEntries = (u) => raw.prepare('SELECT * FROM food_entries WHERE user_id = ?').all(u);
const rollupOf = (u, date) => raw.prepare(
  'SELECT * FROM daily_intake_rollups WHERE user_id = ? AND entry_date = ?',
).get(u, date) ?? null;
const recentOf = (u, slot, ref) => raw.prepare(
  'SELECT * FROM food_slot_recents WHERE user_id = ? AND meal_slot = ? AND food_ref = ?',
).get(u, slot, ref) ?? null;
const countStatements = (re) => mockState.statements.filter((s) => re.test(s)).length;
const rollupWrites = () => countStatements(/INSERT INTO daily_intake_rollups/);
// The hooks are fire-and-forget; let their microtasks settle.
const flush = async () => {
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setImmediate(resolve));
  }
};

beforeAll(async () => {
  await dbm.db();
  mockState.realTx = true;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockState.transactions = 0;
  mockState.statements.length = 0;
});

describe('logFoodEntries: N rows, one deed', () => {
  test('writes every row in ONE transaction and hands the ids back in order', async () => {
    const u = freshUser();
    const ids = await food.logFoodEntries(u, [
      row({ foodRef: 'global:oats' }),
      row({ foodRef: 'global:milk', quantityG: 200, kcal: 92, proteinG: 7, carbsG: 9.6, fatG: 3.2, fibreG: null }),
      row({ foodRef: 'quick:adhoc', quantityG: 0, kcal: 150, proteinG: 0, carbsG: 20, fatG: 0, fibreG: null }),
    ]);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(mockState.transactions).toBe(1);

    const stored = entriesOf(u, D_APR);
    expect(stored.map((r) => r.id)).toEqual(ids); // write order == argument order
    expect(stored.map((r) => r.food_ref)).toEqual(['global:oats', 'global:milk', 'quick:adhoc']);
    expect(stored.map((r) => r.quantity_g)).toEqual([60, 200, 0]);
    expect(stored[1].fibre_g).toBeNull();
    // logged_at keeps the write order strictly, as separate writes had it.
    expect(stored[0].logged_at).toBeLessThan(stored[1].logged_at);
    expect(stored[1].logged_at).toBeLessThan(stored[2].logged_at);
    stored.forEach((r) => {
      expect(r.is_planned).toBe(0);
      expect(r.weight_state).toBe('as_weighed');
      expect(typeof r.eaten_at).toBe('number');
      expect(r.deleted_at).toBeNull();
    });
  });

  test('ONE rollup recompute for the day, however many rows; and the rollup is the sum', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [row(), row({ kcal: 100 }), row({ kcal: 50 })]);
    expect(rollupWrites()).toBe(1);
    const r = rollupOf(u, D_APR);
    expect(r.kcal_total).toBe(377);
    expect(r.entries_count).toBe(3);
  });

  test('one recompute per DISTINCT day when the batch spans days', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [
      row({ entryDate: D_APR }), row({ entryDate: D_APR2 }), row({ entryDate: D_APR }), row({ entryDate: D_APR2 }),
    ]);
    expect(rollupWrites()).toBe(2);
    expect(rollupOf(u, D_APR).entries_count).toBe(2);
    expect(rollupOf(u, D_APR2).entries_count).toBe(2);
  });

  test('ONE sync schedule, ONE first-food event, the per-row food_logged event kept per row', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [
      row({ foodRef: 'global:oats' }),
      row({ foodRef: 'custom:porridge' }),
      row({ foodRef: 'quick:adhoc', quantityG: 0 }),
    ]);
    await flush();
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
    expect(mockTrackFirst).toHaveBeenCalledTimes(1);
    expect(mockTrackFirst).toHaveBeenCalledWith(u, 'first_food_logged');
    expect(mockTrack).toHaveBeenCalledTimes(3);
    expect(mockTrack.mock.calls.map(([, name, props]) => [name, props.food_ref_source, props.meal_slot])).toEqual([
      ['food_logged', 'global', 'meal_1'],
      ['food_logged', 'custom', 'meal_1'],
      ['food_logged', 'quick_add', 'meal_1'],
    ]);
    // Product telemetry never carries the amount eaten (HP-2).
    mockTrack.mock.calls.forEach(([, , props]) => expect(Object.keys(props).sort()).toEqual(['food_ref_source', 'meal_slot']));
  });

  test('the meal reminders stand down ONCE per day, for actual rows only (D215)', async () => {
    const u = freshUser();
    const today = require('../../dayKey').todayLocalKey();
    await food.logFoodEntries(u, [
      row({ entryDate: today, mealSlot: 'meal_1' }),
      row({ entryDate: today, mealSlot: 'meal_2' }),
      row({ entryDate: today, mealSlot: 'meal_3', isPlanned: true }),
    ]);
    await flush();
    expect(mockStandDownMeal).toHaveBeenCalledTimes(1);
    expect(mockStandDownMeal).toHaveBeenCalledWith('meal_1', today);

    mockStandDownMeal.mockClear();
    await food.logFoodEntries(u, [row({ entryDate: today, mealSlot: 'meal_3', isPlanned: true })]);
    await flush();
    expect(mockStandDownMeal).not.toHaveBeenCalled();
  });

  test('an empty batch writes nothing and schedules nothing; a non-array is refused', async () => {
    const u = freshUser();
    expect(await food.logFoodEntries(u, [])).toEqual([]);
    expect(mockState.transactions).toBe(0);
    expect(mockScheduleSync).not.toHaveBeenCalled();
    await expect(food.logFoodEntries(u, null)).rejects.toThrow(/must be an array/);
    await expect(food.logFoodEntries(u, [null])).rejects.toThrow(/invalid food values/);
  });
});

describe('logFoodEntries: all or nothing', () => {
  test('a bad LAST row throws before anything is written: no row, no rollup, no side effect', async () => {
    const u = freshUser();
    await expect(food.logFoodEntries(u, [row(), row({ foodRef: 'global:milk' }), row({ quantityG: 6000 })]))
      .rejects.toThrow(/logFoodEntries \(row 3\): quantity must be between 1 and 5000 g/);
    expect(allEntries(u)).toHaveLength(0);
    expect(rollupOf(u, D_APR)).toBeNull();
    expect(countStatements(/INSERT INTO food_entries/)).toBe(0);
    expect(mockState.transactions).toBe(0);
    await flush();
    expect(mockScheduleSync).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockTrackFirst).not.toHaveBeenCalled();
    expect(mockStandDownMeal).not.toHaveBeenCalled();
  });

  test('a write that fails part-way rolls the WHOLE batch back (SQLite\'s own ROLLBACK)', async () => {
    const u = freshUser();
    raw.exec(`CREATE TRIGGER batch_boom BEFORE INSERT ON food_entries
      WHEN NEW.food_ref = 'global:boom' BEGIN SELECT RAISE(ABORT, 'boom'); END`);
    try {
      await expect(food.logFoodEntries(u, [
        row({ foodRef: 'global:a' }), row({ foodRef: 'global:b' }), row({ foodRef: 'global:boom' }),
      ])).rejects.toThrow(/boom/);
    } finally {
      raw.exec('DROP TRIGGER batch_boom');
    }
    expect(mockState.transactions).toBe(1);
    expect(allEntries(u)).toHaveLength(0); // rows 1 and 2 did not survive
    expect(rollupOf(u, D_APR)).toBeNull();
    await flush();
    expect(mockScheduleSync).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockStandDownMeal).not.toHaveBeenCalled();
    // The queue is not left wedged: the next batch goes straight through.
    const ids = await food.logFoodEntries(u, [row()]);
    expect(ids).toHaveLength(1);
  });
});

describe('logFoodEntries: the same validation as a single write, row for row (FOOD-001)', () => {
  const base = row();
  const cases = {
    'zero grams for a real food': { quantityG: 0 },
    'negative grams': { quantityG: -50 },
    'over 5000 g': { quantityG: 5001 },
    'NaN grams': { quantityG: NaN },
    'missing grams': { quantityG: undefined },
    'a quick-add with negative grams': { foodRef: 'quick:adhoc', quantityG: -1 },
    'a quick-add with grams over the bound': { foodRef: 'quick:adhoc', quantityG: 6000 },
    'NaN macros': { kcal: NaN, proteinG: NaN, carbsG: NaN, fatG: NaN },
    'null required macros': { kcal: null },
    'a negative macro': { fatG: -1 },
    'a macro past the bound': { kcal: 100001 },
    'not a day key': { entryDate: '2026-13-40' },
    'an empty meal slot': { mealSlot: '' },
    'an empty food ref': { foodRef: '' },
    'an eaten time past 2100': { eatenAt: 9e15 },
    'a fractional eaten time': { eatenAt: 1.5 },
  };
  const strip = (e) => String(e.message).replace(/^logFoodEntr(y|ies)( \(row \d+\))?: /, '');

  test.each(Object.keys(cases))('%s: refused alike by both, with the same reason', async (name) => {
    const u = freshUser();
    const bad = { ...base, ...cases[name] };
    let single; let batch;
    try { await food.logFoodEntry(u, bad); } catch (e) { single = e; }
    try { await food.logFoodEntries(u, [bad]); } catch (e) { batch = e; }
    expect(single).toBeDefined();
    expect(batch).toBeDefined();
    expect(batch.constructor).toBe(single.constructor);
    expect(strip(batch)).toBe(strip(single));
    expect(allEntries(u)).toHaveLength(0);
    // The copy's pre-screen gives the same verdict as the write it guards.
    expect(food.isLoggableFoodEntry(bad)).toBe(false);
  });

  test('and what a single write accepts, the batch accepts (a quick-add\'s zero grams, the 5000 g edge, a zero macro)', async () => {
    const u = freshUser();
    const good = [
      row({ foodRef: 'quick:adhoc', quantityG: 0 }),
      row({ quantityG: 5000 }),
      row({ carbsG: 0, fibreG: null }),
      row({ eatenAt: new Date(2026, 3, 2, 8, 30).getTime() }),
    ];
    for (const g of good) {
      // eslint-disable-next-line no-await-in-loop
      await expect(food.logFoodEntry(freshUser(), g)).resolves.toEqual(expect.any(String));
    }
    await expect(food.logFoodEntries(u, good)).resolves.toHaveLength(4);
    good.forEach((g) => expect(food.isLoggableFoodEntry(g)).toBe(true));
  });

  test('isLoggableFoodEntry is a plain yes/no with no side effect, and a non-entry is simply not loggable', async () => {
    const u = freshUser();
    mockState.statements.length = 0;
    expect(food.isLoggableFoodEntry(row())).toBe(true);
    expect(food.isLoggableFoodEntry(row({ quantityG: 0 }))).toBe(false);
    [null, undefined, 'oats', 42].forEach((v) => expect(food.isLoggableFoodEntry(v)).toBe(false));
    expect(mockState.statements).toHaveLength(0);
    expect(mockState.transactions).toBe(0);
    expect(allEntries(u)).toHaveLength(0);
  });

  test('the grams are never clamped or rewritten on the way in', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [row({ quantityG: 61.4, kcal: 233 })]);
    const [stored] = entriesOf(u, D_APR);
    expect(stored.quantity_g).toBe(61.4);
    expect(stored.kcal).toBe(233);
  });

  test('a supplied eaten time is kept; a planned row\'s is NULL and it is outside the rollup', async () => {
    const u = freshUser();
    const eaten = new Date(2026, 3, 2, 8, 30).getTime();
    await food.logFoodEntries(u, [row({ eatenAt: eaten }), row({ foodRef: 'curated:plan', isPlanned: true, eatenAt: eaten })]);
    const [a, p] = entriesOf(u, D_APR);
    expect(a.eaten_at).toBe(eaten);
    expect(p.is_planned).toBe(1);
    expect(p.eaten_at).toBeNull();
    const r = rollupOf(u, D_APR);
    expect(r.entries_count).toBe(1);
    expect(r.kcal_total).toBe(227);
    await flush();
    // A batch of plan rows earns no first-food event (an actual row only),
    // though food_logged is still tracked per row, exactly as a single write does.
    expect(mockTrackFirst).toHaveBeenCalledTimes(1); // from the actual row in this batch
    mockTrackFirst.mockClear();
    await food.logFoodEntries(u, [row({ isPlanned: true, entryDate: D_APR2 })]);
    await flush();
    expect(mockTrackFirst).not.toHaveBeenCalled();
  });
});

describe('copy: a plan is never copied (R9)', () => {
  test('a day holding a planned row copies the eaten rows only; no planned row, and no actual made from it', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [
      row({ entryDate: D_MAR, mealSlot: 'meal_1', foodRef: 'global:oats' }),
      row({ entryDate: D_MAR, mealSlot: 'meal_2', foodRef: 'global:eggs', quantityG: 120, kcal: 170, proteinG: 15, carbsG: 1, fatG: 12, fibreG: 0 }),
      row({ entryDate: D_MAR, mealSlot: 'meal_3', foodRef: 'curated:planned-dinner', kcal: 700, isPlanned: true }),
    ]);
    const source = await food.getFoodEntriesForDay(u, D_MAR);
    expect(source).toHaveLength(3); // the diary still SEES the plan on its own day

    const { ids, skipped } = await bulk.copyEntriesToDate(u, source, D_APR);
    expect(ids).toHaveLength(2);
    expect(skipped).toBe(0); // a plan is never a candidate, so it is not "skipped" either

    const copied = entriesOf(u, D_APR);
    expect(copied.map((r) => r.food_ref).sort()).toEqual(['global:eggs', 'global:oats']);
    expect(copied.some((r) => r.is_planned === 1)).toBe(false);
    expect(copied.some((r) => r.food_ref === 'curated:planned-dinner')).toBe(false);
    // The rollup of the copied day is the eaten rows, and only them.
    expect(rollupOf(u, D_APR).kcal_total).toBe(227 + 170);
    // The source plan is untouched: still planned, still outside its own rollup.
    const plan = entriesOf(u, D_MAR).find((r) => r.food_ref === 'curated:planned-dinner');
    expect(plan.is_planned).toBe(1);
    expect(rollupOf(u, D_MAR).kcal_total).toBe(227 + 170);
  });

  test('a day that is only a plan writes nothing: no transaction, no sync, no ids', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [row({ entryDate: D_MAR, isPlanned: true }), row({ entryDate: D_MAR, mealSlot: 'meal_2', isPlanned: true })]);
    mockState.transactions = 0;
    mockScheduleSync.mockClear();
    const result = await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, D_MAR), D_APR);
    expect(result).toEqual({ ids: [], skipped: 0 });
    expect(mockState.transactions).toBe(0);
    expect(mockScheduleSync).not.toHaveBeenCalled();
    expect(entriesOf(u, D_APR)).toHaveLength(0);
  });

  test('the per-meal path leaves the plan out too, and copies only that meal', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [
      row({ entryDate: D_MAR, mealSlot: 'meal_1', foodRef: 'global:oats' }),
      row({ entryDate: D_MAR, mealSlot: 'meal_1', foodRef: 'curated:plan', isPlanned: true }),
      row({ entryDate: D_MAR, mealSlot: 'meal_2', foodRef: 'global:eggs' }),
    ]);
    const { ids, skipped } = await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, D_MAR), D_APR, { mealSlot: 'meal_1' });
    expect(ids).toHaveLength(1);
    expect(skipped).toBe(0);
    expect(entriesOf(u, D_APR).map((r) => r.food_ref)).toEqual(['global:oats']);
  });
});

describe('copy: each row keeps its time of day (R9)', () => {
  test('13:05 on a March day is 13:05 on the April day it is copied to (GMT to BST)', async () => {
    const u = freshUser();
    expect(new Date(2026, 2, 10, 13, 5).getTimezoneOffset()).toBe(0);
    expect(new Date(2026, 3, 2, 13, 5).getTimezoneOffset()).toBe(-60);
    const at = new Date(2026, 2, 10, 13, 5, 0).getTime();
    await food.logFoodEntries(u, [row({ entryDate: D_MAR, mealSlot: 'meal_2', eatenAt: at })]);

    await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, D_MAR), D_APR);
    const [copied] = entriesOf(u, D_APR);
    expect(copied.eaten_at).toBe(new Date(2026, 3, 2, 13, 5, 0).getTime());
    const when = new Date(copied.eaten_at);
    expect([when.getHours(), when.getMinutes(), when.getSeconds()]).toEqual([13, 5, 0]);
    expect(localDay(copied.eaten_at)).toBe(D_APR);
    // 13:05 BST is 12:05 UTC; whole-day millisecond arithmetic would say 13:05 UTC.
    expect(when.toISOString()).toBe('2026-04-02T12:05:00.000Z');
    expect(copied.eaten_at).not.toBe(at + 23 * 86400000);
  });

  test('and from BST into GMT: 13:05 stays 13:05', async () => {
    const u = freshUser();
    const at = new Date(2026, 5, 15, 13, 5, 0).getTime();
    await food.logFoodEntries(u, [row({ entryDate: '2026-06-15', eatenAt: at })]);
    await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, '2026-06-15'), '2026-11-03');
    const [copied] = entriesOf(u, '2026-11-03');
    expect(copied.eaten_at).toBe(new Date(2026, 10, 3, 13, 5, 0).getTime());
    expect(new Date(copied.eaten_at).toISOString()).toBe('2026-11-03T13:05:00.000Z');
  });

  test('a source row with no eaten_at takes the write\'s own "now", as a single write does', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [row({ entryDate: D_MAR })]);
    raw.prepare('UPDATE food_entries SET eaten_at = NULL WHERE user_id = ?').run(u);
    const before = Date.now();
    await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, D_MAR), D_APR);
    const after = Date.now();
    const [copied] = entriesOf(u, D_APR);
    expect(copied.eaten_at).toBeGreaterThanOrEqual(before);
    expect(copied.eaten_at).toBeLessThanOrEqual(after);
  });

  test('weight_state, quantity and food_ref carry over unchanged', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [row({ entryDate: D_MAR, foodRef: 'custom:rice', quantityG: 210.5, kcal: 273, weightState: 'cooked' })]);
    await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, D_MAR), D_APR);
    const [copied] = entriesOf(u, D_APR);
    expect(copied.weight_state).toBe('cooked');
    expect(copied.quantity_g).toBe(210.5);
    expect(copied.food_ref).toBe('custom:rice');
    expect(copied.kcal).toBe(273);
  });

  test('a whole-day copy is ONE transaction, ONE rollup recompute and ONE sync schedule', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [
      row({ entryDate: D_MAR }), row({ entryDate: D_MAR, mealSlot: 'meal_2' }), row({ entryDate: D_MAR, mealSlot: 'meal_3' }),
      row({ entryDate: D_MAR, mealSlot: 'meal_4' }),
    ]);
    const source = await food.getFoodEntriesForDay(u, D_MAR);
    mockState.transactions = 0;
    mockState.statements.length = 0;
    mockScheduleSync.mockClear();
    const { ids, skipped } = await bulk.copyEntriesToDate(u, source, D_APR);
    expect(ids).toHaveLength(4);
    expect(skipped).toBe(0);
    expect(mockState.transactions).toBe(1);
    expect(rollupWrites()).toBe(1);
    expect(countStatements(/INSERT INTO food_entries/)).toBe(4);
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
  });
});

function localDay(ms) {
  return require('../../dayKey').localDayKey(ms);
}

// RULING (D33, lead): a copy skips the source rows that can never be logged and
// copies the rest atomically. A legacy row that bypassed today's validation
// (written by an older build, or pulled from the cloud) is planted straight
// into the table here, as it would exist on a device that has carried it for
// months, then the day is copied.
describe('copy: a source row that can never be logged is left out, never blocking the day', () => {
  // Raw INSERT: this is exactly the row logFoodEntry would refuse to write.
  const plantLegacy = (u, date, over = {}) => {
    const t = Date.now();
    const r = {
      id: `legacy-${Math.random().toString(36).slice(2, 10)}`, entry_date: date, meal_slot: 'meal_2', food_ref: 'global:legacy',
      quantity_g: 6000, kcal: 900, protein_g: 10, carbs_g: 10, fat_g: 10, ...over,
    };
    raw.prepare(`INSERT INTO food_entries (id, user_id, entry_date, meal_slot, food_ref, quantity_g, kcal, protein_g, carbs_g, fat_g,
      fibre_g, logged_at, is_planned, weight_state, eaten_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 'as_weighed', ?, ?, ?)`)
      .run(r.id, u, r.entry_date, r.meal_slot, r.food_ref, r.quantity_g, r.kcal, r.protein_g, r.carbs_g, r.fat_g, t, t, t, t);
    return r.id;
  };

  test('one bad legacy row among three: the other two land together, in ONE transaction; the bad one is absent', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [
      row({ entryDate: D_MAR, mealSlot: 'meal_1', foodRef: 'global:oats' }),
      row({ entryDate: D_MAR, mealSlot: 'meal_3', foodRef: 'global:eggs', kcal: 170 }),
    ]);
    plantLegacy(u, D_MAR); // 6000 g: over the 5000 g bound
    const source = await food.getFoodEntriesForDay(u, D_MAR);
    expect(source).toHaveLength(3);
    expect(source.some((r) => !food.isLoggableFoodEntry({
      entryDate: D_APR, mealSlot: r.meal_slot, foodRef: r.food_ref, quantityG: r.quantity_g, kcal: r.kcal,
      proteinG: r.protein_g, carbsG: r.carbs_g, fatG: r.fat_g, fibreG: r.fibre_g,
    }))).toBe(true);

    mockState.transactions = 0;
    mockState.statements.length = 0;
    mockScheduleSync.mockClear();
    const { ids, skipped } = await bulk.copyEntriesToDate(u, source, D_APR);

    expect(ids).toHaveLength(2);
    expect(skipped).toBe(1);
    expect(mockState.transactions).toBe(1); // the two are one deed
    expect(rollupWrites()).toBe(1);
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
    const copied = entriesOf(u, D_APR);
    expect(copied.map((r) => r.id).sort()).toEqual([...ids].sort());
    expect(copied.map((r) => r.food_ref).sort()).toEqual(['global:eggs', 'global:oats']);
    expect(copied.some((r) => r.food_ref === 'global:legacy')).toBe(false);
    expect(rollupOf(u, D_APR).kcal_total).toBe(227 + 170);
  });

  test('every kind of unloggable legacy row is left out, each counted once (zero grams, over the macro bound)', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [row({ entryDate: D_MAR })]);
    plantLegacy(u, D_MAR, { quantity_g: 0, food_ref: 'global:zero' });
    plantLegacy(u, D_MAR, { kcal: 250000, quantity_g: 100, food_ref: 'global:huge' });
    const { ids, skipped } = await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, D_MAR), D_APR);
    expect(ids).toHaveLength(1);
    expect(skipped).toBe(2);
  });

  test('a quick add (zero grams by design) is NOT left out', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [row({ entryDate: D_MAR, foodRef: 'quick:adhoc', quantityG: 0, kcal: 300 })]);
    const { ids, skipped } = await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, D_MAR), D_APR);
    expect(ids).toHaveLength(1);
    expect(skipped).toBe(0);
  });

  test('every row bad: { ids: [], skipped: n }, no BEGIN, no sync, nothing written', async () => {
    const u = freshUser();
    plantLegacy(u, D_MAR, { food_ref: 'global:a' });
    plantLegacy(u, D_MAR, { food_ref: 'global:b', quantity_g: 7000 });
    plantLegacy(u, D_MAR, { food_ref: 'global:c', quantity_g: 0 });
    mockState.transactions = 0;
    mockState.statements.length = 0;
    mockScheduleSync.mockClear();
    const result = await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, D_MAR), D_APR);
    expect(result).toEqual({ ids: [], skipped: 3 });
    expect(mockState.transactions).toBe(0);
    expect(countStatements(/INSERT INTO food_entries/)).toBe(0);
    expect(mockScheduleSync).not.toHaveBeenCalled();
    expect(entriesOf(u, D_APR)).toHaveLength(0);
    expect(rollupOf(u, D_APR)).toBeNull();
  });

  test('only eaten rows can be skipped: a plan is never counted, and a bad row in another meal is not this meal\'s', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [
      row({ entryDate: D_MAR, mealSlot: 'meal_1', foodRef: 'global:oats' }),
      row({ entryDate: D_MAR, mealSlot: 'meal_1', foodRef: 'curated:plan', isPlanned: true }),
    ]);
    plantLegacy(u, D_MAR, { meal_slot: 'meal_2' });
    const source = await food.getFoodEntriesForDay(u, D_MAR);
    const meal1 = await bulk.copyEntriesToDate(u, source, D_APR, { mealSlot: 'meal_1' });
    expect(meal1.ids).toHaveLength(1);
    expect(meal1.skipped).toBe(0);
    const day = await bulk.copyEntriesToDate(u, source, D_APR2);
    expect(day.ids).toHaveLength(1);
    expect(day.skipped).toBe(1);
  });

  test('the rows that land keep their time of day', async () => {
    const u = freshUser();
    const at = new Date(2026, 2, 10, 13, 5, 0).getTime();
    await food.logFoodEntries(u, [row({ entryDate: D_MAR, eatenAt: at })]);
    plantLegacy(u, D_MAR);
    await bulk.copyEntriesToDate(u, await food.getFoodEntriesForDay(u, D_MAR), D_APR);
    expect(entriesOf(u, D_APR)[0].eaten_at).toBe(new Date(2026, 3, 2, 13, 5, 0).getTime());
  });
});

describe('the day reads in the order it was eaten (R9)', () => {
  test('within a meal: eaten_at ascending, untimed rows last, then write order', async () => {
    const u = freshUser();
    const at = (h, m) => new Date(2026, 3, 2, h, m).getTime();
    // Written deliberately out of eaten order.
    await food.logFoodEntries(u, [
      row({ mealSlot: 'meal_1', foodRef: 'global:late', eatenAt: at(9, 40) }),
      row({ mealSlot: 'meal_1', foodRef: 'global:untimed-first' }),
      row({ mealSlot: 'meal_1', foodRef: 'global:early', eatenAt: at(7, 55) }),
      row({ mealSlot: 'meal_1', foodRef: 'global:untimed-second' }),
      row({ mealSlot: 'meal_1', foodRef: 'global:tie-a', eatenAt: at(8, 30) }),
      row({ mealSlot: 'meal_1', foodRef: 'global:tie-b', eatenAt: at(8, 30) }),
      row({ mealSlot: 'meal_2', foodRef: 'global:lunch', eatenAt: at(12, 0) }),
    ]);
    raw.prepare("UPDATE food_entries SET eaten_at = NULL WHERE user_id = ? AND food_ref LIKE 'global:untimed-%'").run(u);

    const day = await food.getFoodEntriesForDay(u, D_APR);
    expect(day.map((r) => r.food_ref)).toEqual([
      'global:early', 'global:tie-a', 'global:tie-b', 'global:late',
      'global:untimed-first', 'global:untimed-second',
      'global:lunch',
    ]);
  });

  test('a copied meal reads in the order it was eaten, whatever order it was written in', async () => {
    const u = freshUser();
    const at = (h, m) => new Date(2026, 2, 10, h, m).getTime();
    await food.logFoodEntries(u, [
      row({ entryDate: D_MAR, mealSlot: 'meal_2', foodRef: 'global:dessert', eatenAt: at(13, 40) }),
      row({ entryDate: D_MAR, mealSlot: 'meal_2', foodRef: 'global:main', eatenAt: at(13, 5) }),
      row({ entryDate: D_MAR, mealSlot: 'meal_2', foodRef: 'global:starter', eatenAt: at(12, 50) }),
    ]);
    const source = await food.getFoodEntriesForDay(u, D_MAR);
    expect(source.map((r) => r.food_ref)).toEqual(['global:starter', 'global:main', 'global:dessert']);
    await bulk.copyEntriesToDate(u, source, D_APR);
    const copied = await food.getFoodEntriesForDay(u, D_APR);
    expect(copied.map((r) => r.food_ref)).toEqual(['global:starter', 'global:main', 'global:dessert']);
    expect(copied.map((r) => [new Date(r.eaten_at).getHours(), new Date(r.eaten_at).getMinutes()]))
      .toEqual([[12, 50], [13, 5], [13, 40]]);
  });
});

describe('logFoodEntries options for a write that is not a meal logged now (the history import, R21)', () => {
  const at = (h, m) => new Date(2026, 3, 2, h, m).getTime();

  test('keepUntimed: an explicit null stays NULL; a time is kept; undefined and planned rows are unchanged', async () => {
    const u = freshUser();
    const before = Date.now();
    const [untimed, timed, unset, planned] = await food.logFoodEntries(u, [
      row({ foodRef: 'global:untimed', eatenAt: null }),
      row({ foodRef: 'global:timed', eatenAt: at(8, 5) }),
      row({ foodRef: 'global:unset' }),
      row({ foodRef: 'global:planned', isPlanned: true }),
    ], { keepUntimed: true });
    const byId = new Map(allEntries(u).map((r) => [r.id, r]));
    expect(byId.get(untimed).eaten_at).toBeNull();
    expect(byId.get(timed).eaten_at).toBe(at(8, 5));
    expect(byId.get(unset).eaten_at).toBeGreaterThanOrEqual(before); // "now", as before
    expect(byId.get(planned).eaten_at).toBeNull();
  });

  test('without the option an explicit null still earns the moment of the write (every existing caller)', async () => {
    const u = freshUser();
    const before = Date.now();
    await food.logFoodEntries(u, [row({ eatenAt: null })]);
    expect(allEntries(u)[0].eaten_at).toBeGreaterThanOrEqual(before);
  });

  test('an untimed row reads after the timed rows of its meal, shows in no clock window, and copies like any untimed row', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [
      row({ mealSlot: 'meal_1', foodRef: 'global:untimed', eatenAt: null }),
      row({ mealSlot: 'meal_1', foodRef: 'global:timed', eatenAt: at(9, 0) }),
    ], { keepUntimed: true });
    const day = await food.getFoodEntriesForDay(u, D_APR);
    expect(day.map((r) => r.food_ref)).toEqual(['global:timed', 'global:untimed']);
    const window = await food.getEntriesForClockWindow(u, { fromDate: D_APR, toDate: D_APR });
    expect(window.map((r) => r.food_ref)).toEqual(['global:timed']);
    // A copy follows the existing convention for a source with no time
    // (bulkEntryOps.eatenAtOnDate): the copy is a fresh write and is timed now.
    const before = Date.now();
    await bulk.copyEntriesToDate(u, day, D_APR2);
    const copied = await food.getFoodEntriesForDay(u, D_APR2);
    expect(copied.map((r) => r.food_ref)).toEqual(['global:timed', 'global:untimed']);
    expect(copied[1].eaten_at).toBeGreaterThanOrEqual(before);
  });

  test('telemetry: false sends no per-row food_logged and no first_food_logged; the write and its housekeeping are unchanged', async () => {
    const u = freshUser();
    const ids = await food.logFoodEntries(u, [row(), row({ foodRef: 'global:b', entryDate: D_APR2 })], { telemetry: false });
    await flush();
    expect(ids).toHaveLength(2);
    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockTrackFirst).not.toHaveBeenCalled();
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
    expect(rollupOf(u, D_APR).entries_count).toBe(1);
    expect(rollupOf(u, D_APR2).entries_count).toBe(1);
  });
});

describe('delete, restore and move of N rows: each touched day recomputed once (R10)', () => {
  async function seedTwoDays(u) {
    await food.logFoodEntries(u, [
      row({ entryDate: D_APR, mealSlot: 'meal_1', foodRef: 'global:oats', kcal: 227 }),
      row({ entryDate: D_APR, mealSlot: 'meal_1', foodRef: 'global:oats', kcal: 227 }),
      row({ entryDate: D_APR, mealSlot: 'meal_2', foodRef: 'global:eggs', kcal: 170 }),
      row({ entryDate: D_APR2, mealSlot: 'meal_1', foodRef: 'global:oats', kcal: 227 }),
    ]);
    await food.upsertSlotRecent(u, { mealSlot: 'meal_1', foodRef: 'global:oats', quantityG: 60 });
    await food.upsertSlotRecent(u, { mealSlot: 'meal_1', foodRef: 'global:oats', quantityG: 60 });
    await food.upsertSlotRecent(u, { mealSlot: 'meal_2', foodRef: 'global:eggs', quantityG: 60 });
    mockState.transactions = 0;
    mockState.statements.length = 0;
    mockScheduleSync.mockClear();
    return [...entriesOf(u, D_APR), ...entriesOf(u, D_APR2)];
  }

  test('delete: ONE transaction, one recompute per day, one sync schedule, rollups exclude the deleted', async () => {
    const u = freshUser();
    const rows = await seedTwoDays(u);
    await bulk.deleteEntries(u, rows);
    expect(mockState.transactions).toBe(1);
    expect(rollupWrites()).toBe(2); // two days, not four rows
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
    expect(allEntries(u).every((r) => r.deleted_at != null)).toBe(true);
    expect(rollupOf(u, D_APR)).toEqual(expect.objectContaining({ kcal_total: 0, entries_count: 0 }));
    expect(rollupOf(u, D_APR2)).toEqual(expect.objectContaining({ kcal_total: 0, entries_count: 0 }));
    // The serving memory is rebuilt once per (meal, food): both gone with their last row.
    expect(recentOf(u, 'meal_1', 'global:oats')).toBeNull();
    expect(recentOf(u, 'meal_2', 'global:eggs')).toBeNull();
    expect(countStatements(/COUNT\(\*\) AS log_count/)).toBe(0); // reads go through getFirstAsync
    expect(countStatements(/DELETE FROM food_slot_recents/)).toBe(2);
  });

  test('restore (the Undo): the same single deed, and everything comes back', async () => {
    const u = freshUser();
    const rows = await seedTwoDays(u);
    await bulk.deleteEntries(u, rows);
    mockState.transactions = 0;
    mockState.statements.length = 0;
    mockScheduleSync.mockClear();

    await bulk.restoreEntries(u, rows);
    expect(mockState.transactions).toBe(1);
    expect(rollupWrites()).toBe(2);
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
    expect(allEntries(u).every((r) => r.deleted_at == null)).toBe(true);
    expect(rollupOf(u, D_APR).kcal_total).toBe(227 + 227 + 170);
    expect(rollupOf(u, D_APR2).kcal_total).toBe(227);
    expect(recentOf(u, 'meal_1', 'global:oats').log_count).toBe(3); // three live oats rows
    expect(recentOf(u, 'meal_2', 'global:eggs').log_count).toBe(1);
  });

  test('deleting some of a food keeps the memory of the rest', async () => {
    const u = freshUser();
    const rows = await seedTwoDays(u);
    await food.deleteFoodEntries(u, [rows[0].id]);
    expect(recentOf(u, 'meal_1', 'global:oats').log_count).toBe(2);
    expect(rollupOf(u, D_APR).kcal_total).toBe(227 + 170);
  });

  test('planned scaffolding never touches the serving memory, and leaves the rollup alone', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [row({ isPlanned: true, foodRef: 'curated:plan' }), row({ foodRef: 'global:oats' })]);
    await food.upsertSlotRecent(u, { mealSlot: 'meal_1', foodRef: 'curated:plan', quantityG: 60 });
    const [plan] = entriesOf(u, D_APR);
    mockState.statements.length = 0;
    await food.deleteFoodEntries(u, [plan.id]);
    expect(countStatements(/food_slot_recents/)).toBe(0);
    expect(recentOf(u, 'meal_1', 'curated:plan')).not.toBeNull();
    expect(rollupOf(u, D_APR).kcal_total).toBe(227);
  });

  test('move: ONE transaction, one recompute for the day, one sync schedule, macros intact', async () => {
    const u = freshUser();
    const rows = await seedTwoDays(u);
    const day1 = rows.filter((r) => r.entry_date === D_APR); // oats, oats, eggs
    await bulk.moveEntriesToSlot(u, day1, 'meal_3');
    expect(mockState.transactions).toBe(1);
    expect(rollupWrites()).toBe(1);
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
    const moved = entriesOf(u, D_APR);
    expect(moved.every((r) => r.meal_slot === 'meal_3')).toBe(true);
    expect(moved.map((r) => r.kcal)).toEqual([227, 227, 170]);
    expect(rollupOf(u, D_APR).kcal_total).toBe(624); // the day's total is unchanged by a move
    // The memory follows the food: left meal_1 / meal_2, joined meal_3.
    expect(recentOf(u, 'meal_1', 'global:oats').log_count).toBe(1); // D_APR2's oats row is still in meal_1
    expect(recentOf(u, 'meal_2', 'global:eggs')).toBeNull();
    expect(recentOf(u, 'meal_3', 'global:oats').log_count).toBe(2);
    expect(recentOf(u, 'meal_3', 'global:eggs').log_count).toBe(1);
  });

  test('a move that also changes the day recomputes both days, once each', async () => {
    const u = freshUser();
    const rows = await seedTwoDays(u);
    const updates = rows.filter((r) => r.entry_date === D_APR).slice(0, 2)
      .map((r) => ({ id: r.id, patch: bulk.entryToPatch(r, { entryDate: D_APR2 }) }));
    mockState.statements.length = 0;
    await food.updateFoodEntries(u, updates);
    expect(rollupWrites()).toBe(2);
    expect(rollupOf(u, D_APR).kcal_total).toBe(170);
    expect(rollupOf(u, D_APR2).kcal_total).toBe(227 * 3);
  });

  test('a move into the slot the rows are already in writes nothing at all', async () => {
    const u = freshUser();
    const rows = await seedTwoDays(u);
    await bulk.moveEntriesToSlot(u, rows.filter((r) => r.meal_slot === 'meal_1'), 'meal_1');
    expect(mockState.transactions).toBe(0);
    expect(mockScheduleSync).not.toHaveBeenCalled();
  });

  test('a move keeps an entry\'s eaten time (the patch does not carry one)', async () => {
    const u = freshUser();
    const at = new Date(2026, 3, 2, 8, 30).getTime();
    await food.logFoodEntries(u, [row({ eatenAt: at })]);
    await bulk.moveEntriesToSlot(u, entriesOf(u, D_APR), 'meal_2');
    expect(entriesOf(u, D_APR)[0].eaten_at).toBe(at);
  });

  test('a bad patch anywhere in the batch writes nothing; a failure part-way rolls the whole move back', async () => {
    const u = freshUser();
    const rows = await seedTwoDays(u);
    const good = (r, over = {}) => ({ id: r.id, patch: bulk.entryToPatch(r, { mealSlot: 'meal_3', ...over }) });
    await expect(food.updateFoodEntries(u, [good(rows[0]), good(rows[1], { quantityG: 0 })]))
      .rejects.toThrow(/updateFoodEntries: invalid food values/);
    expect(entriesOf(u, D_APR).every((r) => r.meal_slot !== 'meal_3')).toBe(true);
    expect(mockState.transactions).toBe(0);

    raw.exec(`CREATE TRIGGER move_boom BEFORE UPDATE ON food_entries
      WHEN NEW.meal_slot = 'meal_boom' BEGIN SELECT RAISE(ABORT, 'boom'); END`);
    try {
      await expect(food.updateFoodEntries(u, [good(rows[0]), good(rows[1], { mealSlot: 'meal_boom' })])).rejects.toThrow(/boom/);
    } finally {
      raw.exec('DROP TRIGGER move_boom');
    }
    expect(entriesOf(u, D_APR).every((r) => r.meal_slot !== 'meal_3')).toBe(true); // row 1's move rolled back
    expect(mockScheduleSync).not.toHaveBeenCalled();
  });

  test('ids that no longer exist are skipped; nothing changed means no sync', async () => {
    const u = freshUser();
    expect(await food.deleteFoodEntries(u, ['no-such-id'])).toBe(0);
    expect(await food.restoreFoodEntries(u, [])).toBe(0);
    expect(mockScheduleSync).not.toHaveBeenCalled();
    const rows = await seedTwoDays(u);
    expect(await food.deleteFoodEntries(u, [rows[0].id, rows[0].id, 'no-such-id'])).toBe(1);
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
  });

  test('another person\'s rows are never touched', async () => {
    const mine = freshUser();
    const theirs = freshUser();
    await food.logFoodEntries(theirs, [row()]);
    const [theirRow] = entriesOf(theirs, D_APR);
    expect(await food.deleteFoodEntries(mine, [theirRow.id])).toBe(0);
    expect(entriesOf(theirs, D_APR)[0].deleted_at).toBeNull();
  });
});

describe('source wiring (the stand-down and the shared validator)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '../db.js'), 'utf8');
  const body = (decl) => {
    const start = SRC.indexOf(decl);
    if (start === -1) throw new Error(`not found: ${decl}`);
    const rest = SRC.slice(start + decl.length);
    const next = rest.search(/\nexport (async )?function /);
    return next === -1 ? SRC.slice(start) : SRC.slice(start, start + decl.length + next);
  };

  test('logFoodEntry and logFoodEntries run the ONE validator, and nothing else validates grams', () => {
    expect(body('export async function logFoodEntry(')).toMatch(/_prepareDiaryEntry\('logFoodEntry', entry, now\)/);
    expect(body('export async function logFoodEntries(')).toMatch(/_prepareDiaryEntry\(label, entry, now, \{ keepUntimed: keepUntimed === true \}\)/);
    // The 1 to 5000 g bound lives in the validator (both its quick-add and
    // real-food branches); neither write function carries a copy of its own.
    expect((body('function _prepareDiaryEntry(').match(/isValidEntryGrams\(qtyIn\)/g) || []).length).toBe(2);
    expect(body('export async function logFoodEntry(')).not.toMatch(/isValidEntryGrams/);
    expect(body('export async function logFoodEntries(')).not.toMatch(/isValidEntryGrams/);
  });

  test('logFoodEntries stands the reminders down once per day with every actual slot, only for actual rows, and schedules sync once', () => {
    const fn = body('export async function logFoodEntries(');
    expect(fn).toMatch(/!prepared\[i\]\.isPlanned/);
    expect(fn).toMatch(/if \(slots\.length > 0\) _standDownMealReminders\(userId, date, slots\);/);
    expect((fn.match(/_scheduleSync\(\)/g) || []).length).toBe(1);
    expect((fn.match(/trackFirst\(/g) || []).length).toBe(1);
    expect(fn).toMatch(/await recomputeRollup\(userId, date\)/);
  });

  test('the batched writes do not touch the sync layer\'s contract: they only schedule', () => {
    expect(SRC).not.toMatch(/require\('\.\.\/sync\/(tables|registry|runner|transport)/);
  });
});
