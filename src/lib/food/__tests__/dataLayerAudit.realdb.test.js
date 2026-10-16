/**
 * Food data-layer audit 2026-10-16: the diary writes, against a REAL SQLite
 * (node:sqlite) through the REAL database.js init and the REAL food/db.js,
 * with transactions that really BEGIN, COMMIT and ROLLBACK. Only the edges
 * are mocked (sync, telemetry, the notification scheduler, the error log).
 *
 * What this suite pins, each written to fail on the code before the fix:
 *  - ITEM 1. An Undo stamps created_at at the moment of the Undo
 *    (restoreFoodEntry and restoreFoodEntries), so the restored row goes up
 *    in the push's `created` bucket, as a confirmed planned meal does. With
 *    its old created_at it went up as `updated`, an UPDATE of a row the cloud
 *    had already deleted, and the Undo never reached the cloud.
 *  - ITEM 6. Clearing a planned day, deleting a planned row (alone or in a
 *    bulk delete) and replacing planned days re-check the 20:00 planned-meals
 *    nudge through the scheduler call the confirm paths make. Deleting an
 *    eaten row does not.
 *  - ITEM 7. subscribeDiaryChanges hears every write that changes diary rows
 *    (log, batch log, update, bulk move, delete, restore, bulk delete and
 *    restore, copy, plan apply, confirm a day or one row, clear planned,
 *    replace planned, import), once, after the commit (the listener reads the
 *    committed row), with { userId, dates }; a throwing listener is logged
 *    and never breaks the write; unsubscribe stops it.
 *  - ITEM 12. logFoodEntry, updateFoodEntry, deleteFoodEntry and
 *    restoreFoodEntry write their row and its day's rollup in ONE
 *    transaction: a failure injected into the rollup (a SQLite trigger)
 *    leaves the row exactly as it was.
 *  - ITEM 14. A curated meal and a plan day are each ONE batch write: a bad
 *    item leaves none of the meal or day written. The banked re-sync's
 *    replace (replacePlannedFoodForDays) is one transaction: a failure leaves
 *    every day's planned food as it was, so "Nothing has changed" is true.
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
const mockConfirm = jest.fn(() => Promise.resolve());
jest.mock('../../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: (...a) => mockConfirm(...a),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const dbm = require('../../database');
const food = require('../db');
const bulk = require('../bulkEntryOps');
const { applyPlanDayToDiary } = require('../mealPlanService');
const { _foodRowBuckets } = require('../../sync/tables/foodDomain');
const { logError } = require('../../errorLog');
const { __raw: raw } = require('../../dbCrypto');

const DAY = '2026-10-14';
const DAY2 = '2026-10-15';
let seq = 0;
const freshUser = () => `u-audit-${++seq}`;
const entry = (over = {}) => ({
  entryDate: DAY, mealSlot: 'meal_1', foodRef: 'custom:abc', quantityG: 200,
  kcal: 400, proteinG: 30, carbsG: 40, fatG: 10, fibreG: 2, ...over,
});
const row = (id) => raw.prepare('SELECT * FROM food_entries WHERE id = ?').get(id) ?? null;
const rows = (u) => raw.prepare('SELECT * FROM food_entries WHERE user_id = ? ORDER BY logged_at').all(u);
const kcalOn = (u, d) => raw.prepare('SELECT kcal_total FROM daily_intake_rollups WHERE user_id = ? AND entry_date = ?').get(u, d)?.kcal_total ?? 0;

let clock = new Date(2026, 9, 16, 10, 0).getTime();
let nowSpy;
beforeAll(async () => {
  await dbm.db();
  mockState.realTx = true;
});
beforeEach(() => {
  jest.clearAllMocks();
  clock += 60_000;
  nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
});
afterEach(() => nowSpy.mockRestore());
const tick = (ms = 1000) => { clock += ms; };

// ─── item 1 ──────────────────────────────────────────────────────────────
describe('item 1: an Undo goes up as `created`', () => {
  test('restoreFoodEntry stamps created_at = updated_at = the moment of the Undo', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, entry());
    const createdAt = row(id).created_at;
    tick(5000); await food.deleteFoodEntry(id, u);
    tick(2000); await food.restoreFoodEntry(id, u);
    const r = row(id);
    expect(r.deleted_at).toBeNull();
    expect(r.created_at).toBe(clock);
    expect(r.updated_at).toBe(clock);
    expect(r.created_at).toBeGreaterThan(createdAt);
    // A watermark past the original write (the row and its delete had synced):
    expect(_foodRowBuckets(r, createdAt + 4000)).toEqual(['created']);
  });

  test('restoreFoodEntries (the bulk Undo) does the same for every row', async () => {
    const u = freshUser();
    const ids = await food.logFoodEntries(u, [entry(), entry({ mealSlot: 'meal_2' })]);
    tick(3000); await food.deleteFoodEntries(u, ids);
    tick(2000); expect(await food.restoreFoodEntries(u, ids)).toBe(2);
    for (const id of ids) {
      const r = row(id);
      expect(r.deleted_at).toBeNull();
      expect(r.created_at).toBe(clock);
      expect(r.updated_at).toBe(clock);
      expect(_foodRowBuckets(r, clock - 2500)).toEqual(['created']);
    }
  });

  test('a delete leaves created_at alone (only the Undo restamps it)', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, entry());
    const createdAt = row(id).created_at;
    tick(); await food.deleteFoodEntry(id, u);
    expect(row(id).created_at).toBe(createdAt);
  });
});

// ─── item 6 ──────────────────────────────────────────────────────────────
describe('item 6: the planned-meals nudge is re-checked when planned food goes', () => {
  const planned = (over = {}) => entry({ foodRef: 'curated:oats', isPlanned: true, ...over });

  test('clearPlannedDay re-checks the nudge (and not when there was nothing to clear)', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, planned());
    mockConfirm.mockClear();
    expect(await food.clearPlannedDay(u, DAY)).toBe(1);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledWith(u);
    mockConfirm.mockClear();
    expect(await food.clearPlannedDay(u, DAY)).toBe(0);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  test('deleting a planned row re-checks it; deleting an eaten row does not', async () => {
    const u = freshUser();
    const p = await food.logFoodEntry(u, planned());
    const a = await food.logFoodEntry(u, entry());
    mockConfirm.mockClear();
    await food.deleteFoodEntry(a, u);
    expect(mockConfirm).not.toHaveBeenCalled();
    await food.deleteFoodEntry(p, u);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  test('a bulk delete holding a planned row re-checks it once', async () => {
    const u = freshUser();
    const ids = await food.logFoodEntries(u, [planned(), planned({ mealSlot: 'meal_2' }), entry()]);
    mockConfirm.mockClear();
    await food.deleteFoodEntries(u, ids);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  test('replacing planned days re-checks it', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, planned());
    mockConfirm.mockClear();
    await food.replacePlannedFoodForDays(u, [DAY], [planned({ kcal: 500 })]);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });
});

// ─── item 7 ──────────────────────────────────────────────────────────────
describe('item 7: subscribeDiaryChanges hears every diary write, after its commit', () => {
  let events;
  let unsubscribe;
  let seen;
  beforeEach(() => {
    events = [];
    seen = [];
    unsubscribe = food.subscribeDiaryChanges((evt) => {
      events.push(evt);
      // Synchronously after the commit: the listener already reads the write.
      seen.push(raw.prepare('SELECT COUNT(*) AS n FROM food_entries WHERE user_id = ?').get(evt.userId).n);
    });
  });
  afterEach(() => unsubscribe());
  const last = () => events[events.length - 1];

  test('log, batch log, update, bulk move, delete, restore, bulk delete and restore', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, entry());
    expect(events).toEqual([{ userId: u, dates: [DAY] }]);
    expect(seen[0]).toBe(1);

    const ids = await food.logFoodEntries(u, [entry({ entryDate: DAY2 }), entry({ mealSlot: 'meal_2' })]);
    expect(last()).toEqual({ userId: u, dates: [DAY2, DAY] });
    expect(seen[1]).toBe(3);

    await food.updateFoodEntry(id, u, { ...entry({ entryDate: DAY2, kcal: 300 }) });
    expect(last()).toEqual({ userId: u, dates: [DAY2, DAY] });

    const before = events.length;
    await bulk.moveEntriesToSlot(u, rows(u), 'meal_3');
    expect(events.length).toBe(before + 1);
    expect(last().dates.sort()).toEqual([DAY, DAY2]);

    await food.deleteFoodEntry(id, u);
    expect(last()).toEqual({ userId: u, dates: [DAY2] });
    await food.restoreFoodEntry(id, u);
    expect(last()).toEqual({ userId: u, dates: [DAY2] });
    await food.deleteFoodEntries(u, ids);
    expect(last().dates.sort()).toEqual([DAY, DAY2]);
    await food.restoreFoodEntries(u, ids);
    expect(last().dates.sort()).toEqual([DAY, DAY2]);
  });

  test('copy, plan apply, confirm a day, confirm one row, clear planned, replace planned', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, entry());
    events.length = 0;

    await bulk.copyEntriesToDate(u, rows(u), DAY2);
    expect(events).toEqual([{ userId: u, dates: [DAY2] }]);

    const day = { slots: [{ slot: 'meal_1', items: [{ foodRef: 'curated:oats', quantityG: 80, kcal: 300, proteinG: 10, carbsG: 50, fatG: 6 }] }] };
    await applyPlanDayToDiary(u, day, { entryDate: '2026-10-16' });
    expect(last()).toEqual({ userId: u, dates: ['2026-10-16'] });

    expect(await food.confirmPlannedDay(u, '2026-10-16')).toBe(1);
    expect(last()).toEqual({ userId: u, dates: ['2026-10-16'] });

    await applyPlanDayToDiary(u, day, { entryDate: '2026-10-17' });
    const plannedId = rows(u).find((r) => r.is_planned === 1).id;
    expect(await food.confirmPlannedEntry(u, plannedId)).toBe(1);
    expect(last()).toEqual({ userId: u, dates: ['2026-10-17'] });

    await applyPlanDayToDiary(u, day, { entryDate: '2026-10-18' });
    const n = events.length;
    await food.clearPlannedDay(u, '2026-10-18');
    expect(events.length).toBe(n + 1);
    expect(last()).toEqual({ userId: u, dates: ['2026-10-18'] });

    await food.replacePlannedFoodForDays(u, ['2026-10-19'], [entry({ entryDate: '2026-10-19' })]);
    expect(last()).toEqual({ userId: u, dates: ['2026-10-19'] });
  });

  test('a write that changes nothing says nothing', async () => {
    const u = freshUser();
    expect(await food.updateFoodEntry('missing', u, entry())).toBe(false);
    expect(await food.deleteFoodEntry('missing', u)).toBe(false);
    expect(await food.restoreFoodEntry('missing', u)).toBe(false);
    expect(await food.clearPlannedDay(u, DAY)).toBe(0);
    expect(await food.confirmPlannedDay(u, DAY)).toBe(0);
    expect(events).toEqual([]);
  });

  test('a throwing listener is logged and never breaks the write; unsubscribe stops it', async () => {
    const u = freshUser();
    const bad = jest.fn(() => { throw new Error('listener'); });
    const off = food.subscribeDiaryChanges(bad);
    const id = await food.logFoodEntry(u, entry());
    expect(row(id)).not.toBeNull();
    expect(bad).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith('food.diaryChanges.listener', expect.any(Error));
    // The other listener still heard it.
    expect(events).toEqual([{ userId: u, dates: [DAY] }]);
    off();
    await food.logFoodEntry(u, entry());
    expect(bad).toHaveBeenCalledTimes(1);
    expect(food.subscribeDiaryChanges(null)()).toBeUndefined();
  });
});

// ─── item 12 ─────────────────────────────────────────────────────────────
describe('item 12: a single write and its rollup commit together', () => {
  // Fail the rollup write (insert or upsert-update) while the switch is on.
  beforeAll(() => {
    raw.exec(`
      CREATE TABLE IF NOT EXISTS audit_fail_rollup (on_ INTEGER);
      CREATE TRIGGER IF NOT EXISTS audit_fail_rollup_ins BEFORE INSERT ON daily_intake_rollups
        WHEN EXISTS (SELECT 1 FROM audit_fail_rollup) BEGIN SELECT RAISE(ABORT, 'injected rollup failure'); END;
      CREATE TRIGGER IF NOT EXISTS audit_fail_rollup_upd BEFORE UPDATE ON daily_intake_rollups
        WHEN EXISTS (SELECT 1 FROM audit_fail_rollup) BEGIN SELECT RAISE(ABORT, 'injected rollup failure'); END;
    `);
  });
  const failRollups = (on) => raw.exec(on ? 'INSERT INTO audit_fail_rollup VALUES (1)' : 'DELETE FROM audit_fail_rollup');
  afterEach(() => failRollups(false));

  test('logFoodEntry: no row is left that the day\'s total does not count', async () => {
    const u = freshUser();
    failRollups(true);
    await expect(food.logFoodEntry(u, entry())).rejects.toThrow(/injected rollup failure/);
    expect(rows(u)).toEqual([]);
    expect(kcalOn(u, DAY)).toBe(0);
  });

  test('updateFoodEntry: the row keeps its old figures and day', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, entry());
    const before = row(id);
    failRollups(true);
    await expect(food.updateFoodEntry(id, u, entry({ entryDate: DAY2, kcal: 900 }))).rejects.toThrow(/injected/);
    failRollups(false);
    expect(row(id)).toEqual(before);
    expect(kcalOn(u, DAY)).toBe(400);
    expect(kcalOn(u, DAY2)).toBe(0);
  });

  test('deleteFoodEntry: the row stays live and counted', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, entry());
    failRollups(true);
    await expect(food.deleteFoodEntry(id, u)).rejects.toThrow(/injected/);
    failRollups(false);
    expect(row(id).deleted_at).toBeNull();
    expect(kcalOn(u, DAY)).toBe(400);
  });

  test('restoreFoodEntry: the row stays deleted and uncounted', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, entry());
    await food.deleteFoodEntry(id, u);
    const before = row(id);
    failRollups(true);
    await expect(food.restoreFoodEntry(id, u)).rejects.toThrow(/injected/);
    failRollups(false);
    expect(row(id)).toEqual(before);
    expect(kcalOn(u, DAY)).toBe(0);
  });
});

// ─── item 14 ─────────────────────────────────────────────────────────────
describe('item 14: a meal or a plan day is one write; the banked replace is one transaction', () => {
  test('applyCuratedMealToDiary writes the whole meal through one batch', async () => {
    const u = freshUser();
    const { CURATED_MEALS, mealItems } = require('../curatedMeals');
    const meal = CURATED_MEALS.find((m) => mealItems(m).length >= 2);
    const n = await food.applyCuratedMealToDiary(u, meal.id, { mealSlot: 'meal_1', entryDate: DAY });
    expect(n).toBe(mealItems(meal).filter((it) => it.foodRef && Number(it.quantityG) > 0).length);
    expect(rows(u)).toHaveLength(n);
    // All of the meal's rows carry the one batch's write moment.
    expect(new Set(rows(u).map((r) => r.created_at)).size).toBe(1);
    // Source-level: no per-item single write remains in the curated path.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'db.js'), 'utf8');
    const body = src.slice(
      src.indexOf('export async function applyCuratedMealToDiary'),
      src.indexOf('export async function saveActiveMealPlan'),
    );
    expect(body).toMatch(/await logFoodEntries\(userId, entries\)/);
    expect(body).not.toMatch(/await logFoodEntry\(/);
  });

  test('applyPlanDayToDiary: one bad item leaves none of the day written', async () => {
    const u = freshUser();
    const day = { slots: [
      { slot: 'meal_1', items: [{ foodRef: 'curated:oats', quantityG: 80, kcal: 300, proteinG: 10, carbsG: 50, fatG: 6 }] },
      // 9000 g is outside the diary's 1 to 5000 g bound: the shared validator refuses it.
      { slot: 'meal_2', items: [{ foodRef: 'curated:rice', quantityG: 9000, kcal: 300, proteinG: 10, carbsG: 50, fatG: 6 }] },
    ] };
    await expect(applyPlanDayToDiary(u, day, { entryDate: DAY })).rejects.toThrow();
    expect(rows(u)).toEqual([]);
  });

  test('replacePlannedFoodForDays swaps every day\'s planned food in one go, and never touches actuals', async () => {
    const u = freshUser();
    const eaten = await food.logFoodEntry(u, entry());
    await food.logFoodEntries(u, [
      entry({ isPlanned: true, foodRef: 'curated:a' }),
      entry({ isPlanned: true, foodRef: 'curated:b', entryDate: DAY2 }),
    ]);
    const res = await food.replacePlannedFoodForDays(u, [DAY, DAY2], [
      entry({ foodRef: 'curated:c', kcal: 500 }),
      entry({ foodRef: 'curated:d', entryDate: DAY2, kcal: 600 }),
    ]);
    expect(res).toEqual({ cleared: 2, written: 2 });
    const live = rows(u).filter((r) => !r.deleted_at);
    expect(live.filter((r) => r.is_planned === 1).map((r) => [r.entry_date, r.food_ref]).sort())
      .toEqual([[DAY, 'curated:c'], [DAY2, 'curated:d']]);
    expect(row(eaten).is_planned).toBe(0);
    expect(kcalOn(u, DAY)).toBe(400); // planned food never counts
  });

  test('a failure part-way leaves every day\'s planned food exactly as it was', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [
      entry({ isPlanned: true, foodRef: 'curated:a' }),
      entry({ isPlanned: true, foodRef: 'curated:b', entryDate: DAY2 }),
    ]);
    const before = rows(u);
    // A bad entry is refused before anything is written ...
    await expect(food.replacePlannedFoodForDays(u, [DAY, DAY2], [
      entry({ foodRef: 'curated:c' }), entry({ foodRef: 'curated:d', entryDate: DAY2, quantityG: 0 }),
    ])).rejects.toThrow();
    expect(rows(u)).toEqual(before);
    // ... and a failure inside the transaction (the rollup) rolls it all back.
    raw.exec('INSERT INTO audit_fail_rollup VALUES (1)');
    try {
      await expect(food.replacePlannedFoodForDays(u, [DAY, DAY2], [
        entry({ foodRef: 'curated:c' }), entry({ foodRef: 'curated:d', entryDate: DAY2 }),
      ])).rejects.toThrow(/injected/);
    } finally {
      raw.exec('DELETE FROM audit_fail_rollup');
    }
    expect(rows(u)).toEqual(before);
  });
});

// ─── founder ruling "Add cooked weight" ─────────────────────────────────
describe('cooked weight on a recipe (founder ruling "Add cooked weight")', () => {
  test('the local migration added recipes.cooked_weight_g (REAL, nullable)', () => {
    const col = raw.prepare('PRAGMA table_info(recipes)').all().find((c) => c.name === 'cooked_weight_g');
    expect(col).toBeTruthy();
    expect(col.type).toBe('REAL');
    expect(col.notnull).toBe(0);
  });

  test('createRecipe and updateRecipe store it through normaliseCookedWeight; undefined keeps, null clears', async () => {
    const u = freshUser();
    const id = await food.createRecipe(u, { name: 'Chilli', totalServings: 4, cookedWeightG: 1200.4 });
    expect((await food.getRecipeWithIngredients(u, id)).cooked_weight_g).toBe(1200);
    await food.updateRecipe(u, id, { name: 'Chilli con carne' });
    expect((await food.listRecipes(u))[0].cooked_weight_g).toBe(1200);
    await food.updateRecipe(u, id, { cookedWeightG: 900 });
    expect((await food.getRecipeWithIngredients(u, id)).cooked_weight_g).toBe(900);
    await food.updateRecipe(u, id, { cookedWeightG: null });
    expect((await food.getRecipeWithIngredients(u, id)).cooked_weight_g).toBeNull();
    const none = await food.createRecipe(u, { name: 'Soup', totalServings: 2 });
    expect((await food.getRecipeWithIngredients(u, none)).cooked_weight_g).toBeNull();
  });

  test('applyRecipeToDiary by grams writes nothing for a servings-only recipe (no cooked weight)', async () => {
    const u = freshUser();
    const cf = await food.insertCustomFood(u, { name: 'Rice', kcal100g: 130, protein100g: 3, carbs100g: 28, fat100g: 0.3, servingG: 100 });
    const id = await food.createRecipe(u, { name: 'Rice pot', totalServings: 2 });
    await food.setRecipeIngredients(u, id, [{ food_ref: `custom:${cf}`, quantity_g: 400 }]);
    expect(await food.applyRecipeToDiary(u, id, { mealSlot: 'meal_1', entryDate: DAY, grams: 150 })).toBeNull();
    expect(rows(u)).toEqual([]);
    // By servings it still logs.
    expect(await food.applyRecipeToDiary(u, id, { mealSlot: 'meal_1', entryDate: DAY, servings: 1 })).toEqual(expect.any(String));
  });

  test('the pull keeps the local cooked weight while RECIPE_COOKED_WEIGHT_PUSH is off', async () => {
    const u = freshUser();
    const id = await food.createRecipe(u, { name: 'Stew', totalServings: 4, cookedWeightG: 1500 });
    const later = new Date(clock + 60_000).toISOString();
    await food.applyRecipeFromCloud(u, {
      id, name: 'Stew (edited elsewhere)', servings: 4, notes: null, cooked_weight_g: 700,
      created_at: later, updated_at: later, deleted_at: null,
    });
    const r = await food.getRecipeWithIngredients(u, id);
    expect(r.name).toBe('Stew (edited elsewhere)');
    expect(r.cooked_weight_g).toBe(1500);
  });
});

test('a changed cooked weight rescales the recipe\'s remembered portion to the same servings', async () => {
  const u = freshUser();
  const cf = await food.insertCustomFood(u, { name: 'Lentils', kcal100g: 116, protein100g: 9, carbs100g: 20, fat100g: 0.4, servingG: 100 });
  const id = await food.createRecipe(u, { name: 'Dal', totalServings: 4 });
  await food.setRecipeIngredients(u, id, [{ food_ref: `custom:${cf}`, quantity_g: 800 }]);
  await food.upsertSlotRecent(u, { mealSlot: 'meal_2', foodRef: `recipe:${id}`, quantityG: 200 });
  const remembered = () => raw.prepare('SELECT last_quantity_g FROM food_slot_recents WHERE user_id = ? AND food_ref = ?').get(u, `recipe:${id}`).last_quantity_g;
  // No cooked weight: basis is the 800 g of ingredients; weighed at 1200 g cooked.
  await food.updateRecipe(u, id, { cookedWeightG: 1200 });
  expect(remembered()).toBe(300);
  // Unchanged weight: untouched. A name-only edit: untouched.
  await food.updateRecipe(u, id, { cookedWeightG: 1200, name: 'Dal tadka' });
  await food.updateRecipe(u, id, { name: 'Dal' });
  expect(remembered()).toBe(300);
  // Cleared: back to the ingredient basis.
  await food.updateRecipe(u, id, { cookedWeightG: null });
  expect(remembered()).toBe(200);
});
