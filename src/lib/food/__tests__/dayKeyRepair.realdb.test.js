/**
 * The TZ-1 day-key repair may move ONLY the rows it was written for.
 *
 * TZ-1 (docs/TZ1_LOCAL_DAY_KEY_PLAN.md, commits 5057317da, ad1808a7f and
 * 1125f96c9, 2026-06-03): builds before phase 1 keyed a food entry by the UTC
 * day of the moment it was logged (`new Date().toISOString().slice(0, 10)`),
 * so a meal logged between local midnight and UTC midnight (00:00 to 01:00
 * in British Summer Time) landed on the day before. The one-shot re-key
 * (rekeyFoodEntriesToLocalDay) and the pull applier (applyFoodEntryFromCloud)
 * corrected that by recomputing entry_date from logged_at for EVERY row.
 *
 * That is wrong for every row whose day was chosen on purpose, and since the
 * phase 1 build a day is ALWAYS chosen on purpose: a meal logged today for
 * yesterday, a copy to another day, a planned meal for tomorrow, an imported
 * history. logged_at is the moment of the write (and in the cloud, the moment
 * of the first push: food_sync_push never sends logged_at, the column's
 * default now() fills it, migrate_021 onwards), so it says nothing about the
 * day the food belongs to.
 *
 * What this suite pins, against a REAL SQLite (node:sqlite) through the REAL
 * database.js init and the REAL food/db.js writes and appliers:
 *  - a back-dated actual, a copied day and a planned meal keep their day
 *    through the re-key, through a same-device push and pull round trip, and
 *    through a fresh-device pull followed by the re-key;
 *  - an imported row keeps its day even in the one window where its key looks
 *    like the old UTC key (imported at 00:30 BST for the day before);
 *  - a genuine pre-phase-1 UTC-keyed row (written before the cutoff, keyed by
 *    the UTC day of its logged_at, which is not its local day) is still
 *    corrected, by both the re-key and the pull.
 *
 * The "server" here mirrors food_sync_push's food_entries created branch and
 * food_sync_pull's to_jsonb row (supabase/migrate_195_custom_foods_portions.sql,
 * migrate_090_food_delete_tombstones.sql): entry_date, eaten_at and note as
 * pushed; logged_at, created_at and updated_at all the server's now().
 *
 * Every case is built relative to the zone the suite runs in (utcWindowMoment
 * below), so it holds, and means the same, under Europe/London,
 * America/New_York and Asia/Tokyo: the "UTC-key window" is local 00:30 east
 * of Greenwich and local 23:30 west of it.
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
jest.mock('../../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const dbm = require('../../database');
const food = require('../db');
const { _foodEntryToCloud } = require('../../sync/tables/foodDomain');
const { __raw: raw } = require('../../dbCrypto');
const { localDayKey } = require('../../dayKey');

const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);
// A moment on local day (y, m, d) whose UTC day is a different day: the window
// in which the pre-phase-1 UTC key was wrong. 00:30 east of Greenwich (UTC is
// still the day before), 23:30 west of it (UTC is already the day after).
function utcWindowMoment(y, m, d) {
  for (const [h, min] of [[0, 30], [23, 30]]) {
    const ms = new Date(y, m, d, h, min).getTime();
    if (utcDay(ms) !== localDayKey(ms)) return ms;
  }
  throw new Error('run this suite in a zone that is not UTC');
}

// 2026-10-16 10:00 BST, the day the lane found the collapse.
const NOW = new Date(2026, 9, 16, 10, 0).getTime();
const TODAY = '2026-10-16';
const YESTERDAY = '2026-10-15';
const TOMORROW = '2026-10-17';

let seq = 0;
const freshUser = () => `u-daykey-${++seq}`;
const row = (u, id) => raw.prepare('SELECT * FROM food_entries WHERE user_id = ? AND id = ?').get(u, id);
const rowsOf = (u) => raw.prepare('SELECT * FROM food_entries WHERE user_id = ? ORDER BY logged_at').all(u);
const forget = (u) => raw.prepare('DELETE FROM food_entries WHERE user_id = ?').run(u);

const entry = (over = {}) => ({
  entryDate: TODAY, mealSlot: 'meal_1', foodRef: 'quick:test', quantityG: 0,
  kcal: 300, proteinG: 20, carbsG: 30, fatG: 10, ...over,
});

// food_sync_push (created branch) then food_sync_pull, for one local row.
function serverRoundTrip(u, local, pushMs) {
  const pushed = _foodEntryToCloud(local, u);
  const iso = new Date(pushMs).toISOString();
  return {
    id: pushed.id, user_id: u, entry_date: pushed.entry_date, meal_slot: pushed.meal_slot,
    food_ref: pushed.food_ref, quantity_g: pushed.quantity_g, kcal: pushed.kcal,
    protein_g: pushed.protein_g, carbs_g: pushed.carbs_g, fat_g: pushed.fat_g,
    fibre_g: pushed.fibre_g, weight_state: pushed.weight_state, eaten_at: pushed.eaten_at,
    // Once migrate_194 is applied: the pushed note, or NULL when this build's
    // record carries no note key (FOOD_ENTRY_NOTE_PUSH off).
    note: pushed.note ?? null,
    // Not pushed: the column default now(), the same instant as v_now.
    logged_at: iso, created_at: iso, updated_at: iso, deleted_at: null,
  };
}

let nowSpy;
beforeAll(async () => {
  expect(new Date(2026, 9, 16, 12, 0).getTimezoneOffset()).not.toBe(0); // the UTC-key window needs a non-UTC zone
  await dbm.db();
  mockState.realTx = true;
});
beforeEach(() => {
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => nowSpy.mockRestore());

describe('rows whose day was chosen on purpose are never moved', () => {
  test('a meal logged today for yesterday stays on yesterday through the re-key', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, entry({ entryDate: YESTERDAY }));
    await expect(food.rekeyFoodEntriesToLocalDay(u)).resolves.toBe(0);
    expect(row(u, id).entry_date).toBe(YESTERDAY);
  });

  test('a copied day and a planned meal keep their days through the re-key', async () => {
    const u = freshUser();
    const [copied] = await food.logFoodEntries(u, [entry({ entryDate: '2026-10-10' })]);
    const planned = await food.logFoodEntry(u, entry({ entryDate: TOMORROW, isPlanned: true }));
    await expect(food.rekeyFoodEntriesToLocalDay(u)).resolves.toBe(0);
    expect(row(u, copied).entry_date).toBe('2026-10-10');
    expect(row(u, planned).entry_date).toBe(TOMORROW);
  });

  test('same device: a back-dated meal keeps its day after its own push comes back in the pull', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, entry({ entryDate: YESTERDAY }));
    const cloud = serverRoundTrip(u, row(u, id), NOW + 5000);
    await expect(food.applyFoodEntryFromCloud(u, cloud)).resolves.toBe(YESTERDAY);
    expect(row(u, id).entry_date).toBe(YESTERDAY);
  });

  test('fresh device: back-dated and copied rows land on their own days, before and after the re-key', async () => {
    const u = freshUser();
    const back = await food.logFoodEntry(u, entry({ entryDate: YESTERDAY }));
    const [copy] = await food.logFoodEntries(u, [entry({ entryDate: '2026-09-01' })]);
    const cloud = [serverRoundTrip(u, row(u, back), NOW + 5000), serverRoundTrip(u, row(u, copy), NOW + 5000)];
    forget(u);
    for (const c of cloud) await food.applyFoodEntryFromCloud(u, c); // eslint-disable-line no-await-in-loop
    await food.rekeyFoodEntriesToLocalDay(u);
    expect(row(u, back).entry_date).toBe(YESTERDAY);
    expect(row(u, copy).entry_date).toBe('2026-09-01');
  });

  test('an imported row keeps its day even when its key looks like the old UTC key', async () => {
    // Imported in the UTC-key window on 17 October (00:30 BST: the UTC day of
    // that moment is the 16th), for the UTC day of that moment on purpose.
    const inWindow = utcWindowMoment(2026, 9, 17);
    const chosen = utcDay(inWindow);
    expect(chosen).not.toBe(localDayKey(inWindow));
    nowSpy.mockReturnValue(inWindow);
    const u = freshUser();
    const [id] = await food.logFoodEntries(u, [entry({ entryDate: chosen, eatenAt: null })]);
    await expect(food.rekeyFoodEntriesToLocalDay(u)).resolves.toBe(0);
    expect(row(u, id).entry_date).toBe(chosen);
    const cloud = serverRoundTrip(u, row(u, id), inWindow + 1000);
    forget(u);
    await expect(food.applyFoodEntryFromCloud(u, cloud)).resolves.toBe(chosen);
    await food.rekeyFoodEntriesToLocalDay(u);
    expect(row(u, id).entry_date).toBe(chosen);
  });
});

describe('the rows the repair was written for are still repaired', () => {
  // A pre-phase-1 build logged a meal in the UTC-key window on 21 May 2026
  // (00:30 BST) and keyed it by the UTC day (the 20th in London).
  const loggedAt = utcWindowMoment(2026, 4, 21);
  const UTC_KEY = utcDay(loggedAt);
  const LOCAL_KEY = localDayKey(loggedAt);

  test('the re-key moves a pre-phase-1 UTC-keyed row to its local day and rebuilds both rollups', async () => {
    const u = freshUser();
    raw.prepare(`INSERT INTO food_entries (id, user_id, entry_date, meal_slot, food_ref, quantity_g,
      kcal, protein_g, carbs_g, fat_g, logged_at, created_at, updated_at)
      VALUES ('old-utc', ?, ?, 'meal_1', 'quick:x', 0, 400, 1, 1, 1, ?, ?, ?)`)
      .run(u, UTC_KEY, loggedAt, loggedAt, loggedAt);
    await food.recomputeRollup(u, UTC_KEY);
    await expect(food.rekeyFoodEntriesToLocalDay(u)).resolves.toBe(1);
    expect(row(u, 'old-utc').entry_date).toBe(LOCAL_KEY);
    expect((await food.getRollupForDay(u, LOCAL_KEY)).kcal_total).toBe(400);
    expect((await food.getRollupForDay(u, UTC_KEY)).entries_count).toBe(0);
  });

  test('the pull moves a pre-phase-1 UTC-keyed cloud row to its local day', async () => {
    const u = freshUser();
    const iso = new Date(loggedAt).toISOString();
    const date = await food.applyFoodEntryFromCloud(u, {
      id: 'old-utc-cloud', entry_date: UTC_KEY, meal_slot: 'meal_1', food_ref: 'quick:x',
      quantity_g: 0, kcal: 400, protein_g: 1, carbs_g: 1, fat_g: 1,
      logged_at: iso, created_at: iso, updated_at: iso,
    });
    expect(date).toBe(LOCAL_KEY);
    expect(rowsOf(u)[0].entry_date).toBe(LOCAL_KEY);
  });

  test('a pre-phase-1 row on its own day, or back-dated then, is left where it is', async () => {
    const u = freshUser();
    const noon = new Date(2026, 4, 21, 12, 0).getTime();
    raw.prepare(`INSERT INTO food_entries (id, user_id, entry_date, meal_slot, food_ref, quantity_g,
      kcal, protein_g, carbs_g, fat_g, logged_at, created_at, updated_at)
      VALUES ('own', ?, '2026-05-21', 'meal_1', 'quick:x', 0, 1, 1, 1, 1, ?, ?, ?),
             ('back', ?, '2026-05-19', 'meal_1', 'quick:x', 0, 1, 1, 1, 1, ?, ?, ?)`)
      .run(u, noon, noon, noon, u, noon, noon, noon);
    await expect(food.rekeyFoodEntriesToLocalDay(u)).resolves.toBe(0);
    expect(row(u, 'own').entry_date).toBe('2026-05-21');
    expect(row(u, 'back').entry_date).toBe('2026-05-19');
  });
});
