/**
 * Wave 4 hostile review (food level-up, 2026-10-16), the data-layer findings,
 * pinned against a REAL SQLite (node:sqlite) through the REAL database.js init,
 * the REAL food/db.js writes and appliers, the REAL localCache reads and the
 * REAL food-domain pull coordinator (only its Supabase client is a stand-in).
 * Each pin is written to fail on the code the review found:
 *
 *  - item 2: once migrate_195 is applied, food_sync_pull's to_jsonb(t)
 *    carries portions_json on every row, NULL for every food this build
 *    pushed (CUSTOM_FOOD_PORTIONS_PUSH is off, so it never sends the key).
 *    The pull read it anyway and erased the local portions on the device's
 *    own push-then-pull. With the flag off the local portions stand.
 *    (Item 1, the same for food_entries.note, is pinned in entryNote.test.js.)
 *  - item 4: every custom-food read in localCache carries portions_json, so
 *    the Diary's edit path reopens an entry in its portion, not only the
 *    More tab.
 *  - item 8: a pull that moves a row to another day (an edit on another
 *    device) rebuilds BOTH days' rollups, not only the new one.
 *  - item 9 (lead ruling): the one-time repair of rows the pre-2026-10-16
 *    pull moved to the day they were pushed. Each condition alone prevents a
 *    move; a moved row's two rollups are rebuilt and its updated_at is not
 *    bumped (no re-push); a second run moves nothing; a timezone change
 *    since the original pull moves nothing; the per-device marker is set
 *    only after a run completes, and a failure retries next time without
 *    throwing.
 *
 * Every day is derived from the zone the suite runs in, so it holds under
 * Europe/London, America/New_York and Asia/Tokyo.
 */
const mockState = { realTx: false, inTx: false };
const mockFlags = { note: false, portions: false };

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
// Real getters (defineProperty: an object spread with a getter is compiled to
// a one-time read of its value). Both default to the shipped value, false.
jest.mock('../../sync/featureFlags', () => {
  const flags = { ...jest.requireActual('../../sync/featureFlags') };
  Object.defineProperty(flags, 'FOOD_ENTRY_NOTE_PUSH', { get: () => mockFlags.note, enumerable: true });
  Object.defineProperty(flags, 'CUSTOM_FOOD_PORTIONS_PUSH', { get: () => mockFlags.portions, enumerable: true });
  return flags;
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../sync', () => ({ scheduleSync: jest.fn() }));
jest.mock('../../sync/telemetry', () => ({ logSyncError: jest.fn() }));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../telemetry/firsts', () => ({ trackFirst: jest.fn(() => Promise.resolve()) }));
jest.mock('../../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const dbm = require('../../database');
const food = require('../db');
const {
  resolveFoodRef, resolveFoodRefs, findLocalByBarcode, searchLocalByName,
} = require('../sources/localCache');
const { buildServingUnits, initialServingState } = require('../servingEntry');
const {
  foodPullFor, beginRun, repairPulledEntryDaysOnce, FOOD_DAY_REPAIR_KEY,
} = require('../../sync/tables/foodDomain');
const { logError } = require('../../errorLog');
const { localDayKey } = require('../../dayKey');
const { __raw: raw } = require('../../dbCrypto');

// 10:00 local on 16 October 2026, in whatever zone the suite runs in.
const NOW = new Date(2026, 9, 16, 10, 0).getTime();
const TODAY = localDayKey(NOW);
const YESTERDAY = localDayKey(new Date(2026, 9, 15, 12, 0).getTime());

let seq = 0;
const freshUser = () => `u-w4-${++seq}`;
const entryRow = (u, id) => raw.prepare('SELECT * FROM food_entries WHERE user_id = ? AND id = ?').get(u, id);
const rollup = (u, day) => raw.prepare('SELECT * FROM daily_intake_rollups WHERE user_id = ? AND entry_date = ?').get(u, day) ?? null;
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);
// The cloud's timestamptz in to_jsonb form: microseconds and an offset.
const pgIso = (ms) => new Date(ms).toISOString().replace('Z', '123+00:00');

function utcWindowMoment(y, m, d) {
  for (const [h, min] of [[0, 30], [23, 30]]) {
    const ms = new Date(y, m, d, h, min).getTime();
    if (utcDay(ms) !== localDayKey(ms)) return ms;
  }
  throw new Error('run this suite in a zone that is not UTC');
}

// The day of `ms` on a wall clock in another zone, chosen so it is NOT this
// zone's day of `ms`: the day an earlier pull computed before a zone change.
function dayElsewhere(ms) {
  for (const timeZone of ['Pacific/Pago_Pago', 'Pacific/Kiritimati']) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
    if (day !== localDayKey(ms)) return day;
  }
  throw new Error('no other-zone day differs');
}

// A food_entries row as food_sync_pull returns it (supabase/migrate_090 and
// migrate_194/195): the day the writing device chose; logged_at, created_at and
// updated_at the server's now() at the first push (food_sync_push never sends
// logged_at).
function cloudEntry(u, id, { day, pushMs, kcal = 300 }) {
  const iso = pgIso(pushMs);
  return {
    id, user_id: u, entry_date: day, meal_slot: 'meal_1', food_ref: 'quick:x', quantity_g: 0,
    kcal, protein_g: 10, carbs_g: 20, fat_g: 5, fibre_g: null, weight_state: 'as_weighed',
    eaten_at: null, note: null, logged_at: iso, created_at: iso, updated_at: iso, deleted_at: null,
  };
}

// What the pull before 2026-10-16 stored for that cloud row: every field from
// the cloud, except entry_date, which it set to the local day of logged_at.
function oldPullStored(u, cloud, { entryDate, updatedAt, deletedAt = null } = {}) {
  const ms = Date.parse(cloud.logged_at);
  raw.prepare(`INSERT INTO food_entries (id, user_id, entry_date, meal_slot, food_ref, quantity_g,
    kcal, protein_g, carbs_g, fat_g, weight_state, logged_at, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    cloud.id, u, entryDate ?? localDayKey(ms), cloud.meal_slot, cloud.food_ref, cloud.quantity_g,
    cloud.kcal, cloud.protein_g, cloud.carbs_g, cloud.fat_g, 'as_weighed', ms, ms, updatedAt ?? ms, deletedAt,
  );
}

function pullSb(rows) {
  return {
    rpc: jest.fn(async () => ({
      data: { changes: { food_entries: { created: rows, updated: [], deleted: [] } }, timestamp: new Date(NOW + 60000).toISOString() },
      error: null,
    })),
  };
}

let nowSpy;
beforeAll(async () => {
  await dbm.db();
  mockState.realTx = true;
});
beforeEach(async () => {
  jest.clearAllMocks();
  mockFlags.note = false;
  mockFlags.portions = false;
  await AsyncStorage.clear();
  beginRun();
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => nowSpy.mockRestore());

// ─── item 2: custom_foods.portions_json on the device's own round trip ─────

describe('item 2: a custom food keeps its portions through its own push and pull', () => {
  const customCloud = (u, id, raw0, t) => ({
    id, user_id: u, name: raw0.name, brand: null, serving_g: raw0.serving_g, serving_label: raw0.serving_label,
    kcal_100g: raw0.kcal_100g, protein_100g: raw0.protein_100g, carbs_100g: raw0.carbs_100g, fat_100g: raw0.fat_100g,
    fibre_100g: null, sodium_100g: null, sugar_100g: null, barcode_ean: null, photo_url: null, notes: null,
    created_at: t, updated_at: t, deleted_at: null,
    // to_jsonb(t) once 195 is applied: NULL, since this build never pushes it.
    portions_json: null,
  });

  test('with the flag off (this build) the cloud NULL leaves the local portions in place', async () => {
    const u = freshUser();
    const id = await food.insertCustomFood(u, { name: 'Tea', servingG: 250, servingLabel: '1 mug', kcal100g: 20, protein100g: 1, carbs100g: 2, fat100g: 1, portions: [{ label: '1 cup', grams: 200 }] });
    const before = await food.getCustomFoodById(id, u);
    expect(JSON.parse(before.portions_json)).toEqual([{ label: '1 cup', grams: 200 }]);
    const t = pgIso(before.updated_at + 2000);
    await expect(food.applyCustomFoodFromCloud(u, customCloud(u, id, before, t))).resolves.toBe(true);
    const after = await food.getCustomFoodById(id, u);
    expect(after.updated_at).toBe(Date.parse(t)); // the cloud row did apply
    expect(after.portions_json).toBe(before.portions_json);
  });

  test('with the flag on, the cloud value is the truth (a NULL clears)', async () => {
    mockFlags.portions = true;
    const u = freshUser();
    const id = await food.insertCustomFood(u, { name: 'Tea', servingG: 250, servingLabel: '1 mug', kcal100g: 20, protein100g: 1, carbs100g: 2, fat100g: 1, portions: [{ label: '1 cup', grams: 200 }] });
    const before = await food.getCustomFoodById(id, u);
    await food.applyCustomFoodFromCloud(u, customCloud(u, id, before, pgIso(before.updated_at + 2000)));
    expect((await food.getCustomFoodById(id, u)).portions_json).toBeNull();
  });
});

// ─── item 4: portions reach every custom-food read ─────────────────────────

describe('item 4: every custom-food read carries its portions', () => {
  async function toast(u) {
    return food.insertCustomFood(u, {
      name: 'Wholemeal toast', servingG: 36, servingLabel: '1 slice', kcal100g: 250, protein100g: 9, carbs100g: 45, fat100g: 3,
      barcodeEan: '5000000000017', portions: [{ label: '1 mug', grams: 250 }],
    });
  }
  const keys = (f) => buildServingUnits(f).map((x) => x.key);

  test('resolveFoodRef, resolveFoodRefs, the barcode lookup and search all offer the extra portion', async () => {
    const u = freshUser();
    const id = await toast(u);
    const ref = `custom:${id}`;
    expect(keys(await resolveFoodRef(u, ref))).toEqual(['serving', 'portion:0', 'g']);
    expect(keys((await resolveFoodRefs(u, [ref])).get(ref))).toEqual(['serving', 'portion:0', 'g']);
    expect(keys(await findLocalByBarcode('5000000000017', u))).toEqual(['serving', 'portion:0', 'g']);
    const hit = (await searchLocalByName(u, 'wholemeal toa')).find((r) => r.food_ref === ref);
    expect(keys(hit)).toEqual(['serving', 'portion:0', 'g']);
  });

  test('the Diary edit path reopens an entry logged as 2 mugs in mugs', async () => {
    const u = freshUser();
    const id = await toast(u);
    const entryId = await food.logFoodEntry(u, {
      entryDate: TODAY, mealSlot: 'meal_1', foodRef: `custom:${id}`, quantityG: 500,
      kcal: 1250, proteinG: 45, carbsG: 225, fatG: 15,
    });
    const entry = entryRow(u, entryId);
    // DiaryScreen.openEditSheet: resolveFoodRef(userId, entry.food_ref), then
    // FoodDetailSheet's initialServingState(food, 'edit', entry.quantity_g).
    const resolved = await resolveFoodRef(u, entry.food_ref);
    expect(initialServingState(resolved, 'edit', entry.quantity_g)).toEqual({ unitKey: 'portion:0', amount: '2' });
  });
});

// ─── item 8: a cross-device move rebuilds both days ────────────────────────

describe('item 8: a pull that moves a row rebuilds the day it left as well as the day it lands on', () => {
  test('applyFoodEntryFromCloud reports both days', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, { entryDate: TODAY, mealSlot: 'meal_1', foodRef: 'quick:x', quantityG: 0, kcal: 300, proteinG: 1, carbsG: 1, fatG: 1 });
    const days = new Set();
    const moved = cloudEntry(u, id, { day: YESTERDAY, pushMs: NOW + 60000 });
    await expect(food.applyFoodEntryFromCloud(u, moved, days)).resolves.toBe(YESTERDAY);
    expect([...days].sort()).toEqual([YESTERDAY, TODAY].sort());
  });

  test('through the real pull: the old day no longer counts the row, the new day does', async () => {
    const u = freshUser();
    await AsyncStorage.setItem(FOOD_DAY_REPAIR_KEY(u), 'true'); // isolate from item 9
    const id = await food.logFoodEntry(u, { entryDate: TODAY, mealSlot: 'meal_1', foodRef: 'quick:x', quantityG: 0, kcal: 300, proteinG: 1, carbsG: 1, fatG: 1 });
    expect(rollup(u, TODAY).kcal_total).toBe(300);
    // Another device moved it to yesterday; its push restamped updated_at.
    const sb = pullSb([{ ...cloudEntry(u, id, { day: YESTERDAY, pushMs: NOW + 60000 }), created_at: pgIso(NOW) }]);
    const res = await foodPullFor('food_entries')(sb, { userId: u });
    expect(res.errors).toBe(0);
    expect(entryRow(u, id).entry_date).toBe(YESTERDAY);
    expect(rollup(u, YESTERDAY).kcal_total).toBe(300);
    expect(rollup(u, TODAY)).toEqual(expect.objectContaining({ kcal_total: 0, entries_count: 0 }));
  });
});

// ─── item 9: the one-time repair ───────────────────────────────────────────

describe('item 9: the repair moves a row the old pull moved, and only such a row', () => {
  const PUSH = NOW + 5000; // pushed today: the old pull put it on TODAY

  test('a meal logged for yesterday, moved to today by the old pull, goes back; both rollups are rebuilt; no re-push', async () => {
    const u = freshUser();
    // Logged today for yesterday on this device, pushed, then the old pull.
    const id = await food.logFoodEntry(u, { entryDate: YESTERDAY, mealSlot: 'meal_1', foodRef: 'quick:x', quantityG: 0, kcal: 300, proteinG: 10, carbsG: 20, fatG: 5 });
    const cloud = cloudEntry(u, id, { day: YESTERDAY, pushMs: PUSH });
    raw.prepare('DELETE FROM food_entries WHERE id = ?').run(id);
    oldPullStored(u, cloud);
    await food.recomputeRollup(u, TODAY);
    await food.recomputeRollup(u, YESTERDAY);
    expect(entryRow(u, id).entry_date).toBe(TODAY);
    expect(rollup(u, TODAY).kcal_total).toBe(300);
    const updatedBefore = entryRow(u, id).updated_at;

    await expect(food.repairPulledEntryDays(u, [cloud])).resolves.toBe(1);
    expect(entryRow(u, id).entry_date).toBe(YESTERDAY);
    expect(entryRow(u, id).updated_at).toBe(updatedBefore); // not bumped: nothing re-pushes
    expect(await food.getAllFoodEntriesSince(u, updatedBefore)).toEqual([]);
    expect(rollup(u, YESTERDAY)).toEqual(expect.objectContaining({ kcal_total: 300, entries_count: 1 }));
    expect(rollup(u, TODAY)).toEqual(expect.objectContaining({ kcal_total: 0, entries_count: 0 }));

    // Idempotent: a second run moves nothing and changes nothing.
    const snapshot = entryRow(u, id);
    await expect(food.repairPulledEntryDays(u, [cloud])).resolves.toBe(0);
    expect(entryRow(u, id)).toEqual(snapshot);
  });

  test('no local row: nothing is moved or created', async () => {
    const u = freshUser();
    const cloud = cloudEntry(u, 'absent', { day: YESTERDAY, pushMs: PUSH });
    await expect(food.repairPulledEntryDays(u, [cloud])).resolves.toBe(0);
    expect(entryRow(u, 'absent')).toBeUndefined();
  });

  test('a deleted local row is not moved', async () => {
    const u = freshUser();
    const cloud = cloudEntry(u, 'gone', { day: YESTERDAY, pushMs: PUSH });
    oldPullStored(u, cloud, { deletedAt: PUSH + 1000 });
    await expect(food.repairPulledEntryDays(u, [cloud])).resolves.toBe(0);
    expect(entryRow(u, 'gone').entry_date).toBe(TODAY);
  });

  test('a local row touched since the pull (its updated_at differs) is not moved', async () => {
    const u = freshUser();
    const cloud = cloudEntry(u, 'edited', { day: YESTERDAY, pushMs: PUSH });
    oldPullStored(u, cloud, { updatedAt: Date.parse(cloud.updated_at) + 1 });
    await expect(food.repairPulledEntryDays(u, [cloud])).resolves.toBe(0);
    expect(entryRow(u, 'edited').entry_date).toBe(TODAY);
  });

  test('a local row on any day but the local day of the cloud logged_at is not moved', async () => {
    const u = freshUser();
    const cloud = cloudEntry(u, 'elsewhere', { day: YESTERDAY, pushMs: PUSH });
    oldPullStored(u, cloud, { entryDate: '2026-10-10' });
    await expect(food.repairPulledEntryDays(u, [cloud])).resolves.toBe(0);
    expect(entryRow(u, 'elsewhere').entry_date).toBe('2026-10-10');
  });

  test('a local row already on the cloud day is left alone', async () => {
    const u = freshUser();
    const cloud = cloudEntry(u, 'same', { day: TODAY, pushMs: PUSH });
    oldPullStored(u, cloud);
    await expect(food.repairPulledEntryDays(u, [cloud])).resolves.toBe(0);
    expect(entryRow(u, 'same').entry_date).toBe(TODAY);
  });

  test('a cloud day that is not a valid day key moves nothing', async () => {
    const u = freshUser();
    const bad = ['not-a-day', null, '2026-02-30', '2026-10-15T00:00:00Z'].map((day, i) => {
      const c = cloudEntry(u, `bad-${i}`, { day, pushMs: PUSH });
      oldPullStored(u, c);
      return c;
    });
    await expect(food.repairPulledEntryDays(u, bad)).resolves.toBe(0);
    bad.forEach((c) => expect(entryRow(u, c.id).entry_date).toBe(TODAY));
  });

  test('a cloud row with no readable logged_at moves nothing', async () => {
    const u = freshUser();
    const cloud = cloudEntry(u, 'no-logged', { day: YESTERDAY, pushMs: PUSH });
    oldPullStored(u, cloud);
    await expect(food.repairPulledEntryDays(u, [{ ...cloud, logged_at: null }])).resolves.toBe(0);
    await expect(food.repairPulledEntryDays(u, [{ ...cloud, logged_at: 'yesterday' }])).resolves.toBe(0);
    expect(entryRow(u, 'no-logged').entry_date).toBe(TODAY);
  });

  test('a pre-phase-1 UTC-keyed cloud day is not restored (the pull moved it on purpose)', async () => {
    const u = freshUser();
    const loggedAt = utcWindowMoment(2026, 4, 21);
    const cloud = cloudEntry(u, 'pre-tz1', { day: utcDay(loggedAt), pushMs: loggedAt });
    oldPullStored(u, cloud); // on localDayKey(loggedAt), as both pulls put it
    expect(entryRow(u, 'pre-tz1').entry_date).not.toBe(cloud.entry_date);
    await expect(food.repairPulledEntryDays(u, [cloud])).resolves.toBe(0);
    expect(entryRow(u, 'pre-tz1').entry_date).toBe(localDayKey(loggedAt));
  });

  test('after a timezone change since the original pull, nothing moves', async () => {
    const u = freshUser();
    const cloud = cloudEntry(u, 'travelled', { day: '2026-10-12', pushMs: PUSH });
    // The old pull ran in another zone and put the row on ITS day of logged_at.
    const thenDay = dayElsewhere(PUSH);
    oldPullStored(u, cloud, { entryDate: thenDay });
    await expect(food.repairPulledEntryDays(u, [cloud])).resolves.toBe(0);
    expect(entryRow(u, 'travelled').entry_date).toBe(thenDay);
  });
});

describe('item 9: once per user per device, after a successful pull, never throwing', () => {
  const PUSH = NOW + 5000;
  const moved = (u, id) => {
    const cloud = cloudEntry(u, id, { day: YESTERDAY, pushMs: PUSH });
    oldPullStored(u, cloud);
    return cloud;
  };

  test('fetches from epoch through food_sync_pull, repairs, and marks done only then; a second call does nothing', async () => {
    const u = freshUser();
    const cloud = moved(u, 'r1');
    const sb = pullSb([cloud]);
    await expect(repairPulledEntryDaysOnce(sb, u)).resolves.toBe(1);
    expect(sb.rpc).toHaveBeenCalledWith('food_sync_pull', { last_pulled_at: new Date(0).toISOString() });
    expect(entryRow(u, 'r1').entry_date).toBe(YESTERDAY);
    expect(await AsyncStorage.getItem(FOOD_DAY_REPAIR_KEY(u))).toBe('true');
    await expect(repairPulledEntryDaysOnce(sb, u)).resolves.toBeNull();
    expect(sb.rpc).toHaveBeenCalledTimes(1);
  });

  test('a fetch error leaves the marker unset, logs with no context, and a call a day later retries', async () => {
    const u = freshUser();
    moved(u, 'r2');
    const sb = { rpc: jest.fn(async () => ({ data: null, error: { message: 'timeout' } })) };
    await expect(repairPulledEntryDaysOnce(sb, u)).resolves.toBeNull();
    expect(await AsyncStorage.getItem(FOOD_DAY_REPAIR_KEY(u))).toBeNull();
    expect(logError).toHaveBeenCalledWith('sync.tables.foodDomain.dayRepair.fetch', { message: 'timeout' });
    logError.mock.calls.forEach((c) => expect(c).toHaveLength(2));
    // Food data-layer audit 2026-10-16, item 11: at most once a day after a
    // failure (the attempt stamp beside the marker), so the retry is a day on.
    const realNow = Date.now();
    const later = jest.spyOn(Date, 'now').mockReturnValue(realNow + 24 * 60 * 60 * 1000 + 1);
    try {
      await repairPulledEntryDaysOnce(sb, u);
    } finally {
      later.mockRestore();
    }
    expect(sb.rpc).toHaveBeenCalledTimes(2);
    expect(entryRow(u, 'r2').entry_date).toBe(TODAY);
  });

  test('a repair that throws leaves the marker unset and never reaches the caller', async () => {
    const u = freshUser();
    const cloud = moved(u, 'r3');
    const spy = jest.spyOn(food, 'repairPulledEntryDays').mockRejectedValueOnce(new Error('disk full'));
    await expect(repairPulledEntryDaysOnce(pullSb([cloud]), u)).resolves.toBeNull();
    spy.mockRestore();
    expect(await AsyncStorage.getItem(FOOD_DAY_REPAIR_KEY(u))).toBeNull();
    expect(logError).toHaveBeenCalledWith('sync.tables.foodDomain.dayRepair', expect.any(Error));
  });

  test('wired after a fully applied food pull: the pull itself starts it', async () => {
    const u = freshUser();
    const cloud = moved(u, 'r4');
    const sb = pullSb([cloud]);
    await expect(foodPullFor('food_entries')(sb, { userId: u })).resolves.toEqual(expect.objectContaining({ errors: 0 }));
    await repairPulledEntryDaysOnce(sb, u); // the run already in flight
    expect(sb.rpc).toHaveBeenCalledTimes(2);
    expect(sb.rpc.mock.calls[1]).toEqual(['food_sync_pull', { last_pulled_at: new Date(0).toISOString() }]);
    expect(entryRow(u, 'r4').entry_date).toBe(YESTERDAY);
    expect(await AsyncStorage.getItem(FOOD_DAY_REPAIR_KEY(u))).toBe('true');
  });

  test('not started after a pull in which a row failed to apply', async () => {
    const u = freshUser();
    const cloud = moved(u, 'r5');
    const sb = pullSb([cloud]);
    const spy = jest.spyOn(food, 'applyFoodEntryFromCloud').mockRejectedValueOnce(new Error('constraint'));
    const res = await foodPullFor('food_entries')(sb, { userId: u });
    spy.mockRestore();
    expect(res.errors).toBe(1);
    await new Promise((r) => setImmediate(r));
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(entryRow(u, 'r5').entry_date).toBe(TODAY);
  });
});

// ─── lead ruling: a confirmed planned meal reaches the cloud ──────────────
// A planned row is never pushed (the push reads is_planned = 0 only). Before
// this ruling, confirming one kept its old created_at, so with a watermark
// past it the row was bucketed 'updated': a plain UPDATE of a row the server
// has never held, so it never reached the cloud. Written to fail against the
// confirm functions as they were.
describe('lead ruling: a planned meal confirmed after a push is sent as new', () => {
  const { _foodRowBuckets } = require('../../sync/tables/foodDomain');
  const PLANNED_AT = NOW - 3 * 60 * 60 * 1000;
  const WATERMARK = NOW - 60 * 60 * 1000; // a push happened after it was planned

  async function planOne(u) {
    nowSpy.mockReturnValue(PLANNED_AT);
    await food.logFoodEntries(u, [{
      entryDate: TODAY, mealSlot: 'lunch', foodRef: 'custom:soup', quantityG: 300,
      kcal: 240, proteinG: 12, carbsG: 30, fatG: 8, isPlanned: true,
    }]);
    nowSpy.mockReturnValue(NOW);
    return raw.prepare('SELECT id FROM food_entries WHERE user_id = ? AND is_planned = 1').get(u).id;
  }

  test('confirmPlannedEntry: created_at becomes the moment of confirmation, so it goes as created', async () => {
    const u = freshUser();
    const id = await planOne(u);
    expect(await food.confirmPlannedEntry(u, id)).toBe(1);
    const row = entryRow(u, id);
    expect(row.is_planned).toBe(0);
    expect(Number(row.created_at)).toBe(NOW);
    expect(Number(row.updated_at)).toBe(NOW);
    expect(_foodRowBuckets({ ...row, created_at: Number(row.created_at), updated_at: Number(row.updated_at) }, WATERMARK)).toEqual(['created']);
  });

  test('confirmPlannedDay: the same, for a whole meal', async () => {
    const u = freshUser();
    const id = await planOne(u);
    expect(await food.confirmPlannedDay(u, TODAY, 'lunch')).toBe(1);
    const row = entryRow(u, id);
    expect(Number(row.created_at)).toBe(NOW);
    expect(_foodRowBuckets({ ...row, created_at: Number(row.created_at), updated_at: Number(row.updated_at) }, WATERMARK)).toEqual(['created']);
  });
});
