/**
 * Food sync round trips, lifted from the 2026-10-16 data-layer audit's probes
 * (P1, P2, P3) into real tests. REAL node:sqlite through the REAL database.js
 * init, the REAL food/db.js writes and appliers and the REAL foodDomain
 * coordinator. The cloud is an in-memory EMULATION of food_sync_push and
 * food_sync_pull written from the SQL text, in two versions:
 *   - '195': supabase/migrate_195_custom_foods_portions.sql as applied in
 *     production (food_entries `deleted` is a hard DELETE, `created` is
 *     ON CONFLICT DO NOTHING, `updated` a plain UPDATE; food_favourites
 *     never stores `kind`, so every row reads the default 'fav');
 *   - '196': supabase/migrate_196_food_soft_deletes_and_kind.sql (soft
 *     deletes; `updated` skips a tombstone; `created` revives a tombstone made
 *     at or before the record's created_at; `kind` stored).
 * The pull is migrate_090's (unchanged by both): `created` and `updated` hold
 * live rows, `deleted` every row whose deleted_at is newer than the cursor.
 * The 196 SQL itself is proved on PostgreSQL by the lead's scenario run; this
 * suite proves the CLIENT halves against both servers.
 *
 * What this suite pins, each written to fail before the fix:
 *  - P1 / item 1: an Undo made after the delete had synced reaches the cloud,
 *    against 195 (re-inserted) and against 196 (the tombstone revived).
 *  - P2 / 196(a): a delete on device A reaches device B, whose day total
 *    drops, and B's pull tells its diary listeners (item 7).
 *  - P3 / item 3: "Not suggested" survives the device's own push and pull,
 *    against 195 (the client keeps its tie) and 196 (the cloud stores it).
 *  - item 5: a legacy out-of-range row in the pull is still skipped, and is
 *    logged as food.pull.rejected with the table and reason only.
 *  - item 11: a failed one-time day repair is tried again at most once a day.
 */
const mockState = { realTx: false, inTx: false };
jest.mock('../../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raws = [];
  const make = (raw) => ({
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => {
      if (!mockState.realTx) { await fn(); return; }
      raw.exec('BEGIN'); mockState.inTx = true;
      try { await fn(); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; } finally { mockState.inTx = false; }
    },
    isInTransactionSync: () => mockState.inTx,
    closeAsync: async () => {},
  });
  return {
    openEncryptedDb: async () => { const raw = new DatabaseSync(':memory:'); raws.push(raw); return { db: make(raw), encrypted: true }; },
    __raws: raws,
  };
});
jest.mock('expo-sqlite');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../sync', () => ({ scheduleSync: jest.fn() }));
jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../telemetry/firsts', () => ({ trackFirst: jest.fn(() => Promise.resolve()) }));
jest.mock('../../notifications/standDown', () => ({ standDownMeal: () => Promise.resolve(false) }));
jest.mock('../../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(), relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const dbm = require('../../database');
const food = require('../../food/db');
const domain = require('../tables/foodDomain');
const { logWarn, logError } = require('../../errorLog');
const { localDayKey } = require('../../dayKey');
const RAWS = require('../../dbCrypto').__raws;

const { foodPushFor, foodPullFor, beginRun } = domain;
let raw;
let clock = new Date(2026, 9, 16, 10, 0).getTime();
const TODAY = localDayKey(clock);

// ─── the emulated cloud ─────────────────────────────────────────────────
function makeCloud(version) {
  const entries = new Map();
  const favs = new Map();
  const now = () => { clock += 50; return clock; }; // the server's now(), always ahead
  const iso = (ms) => new Date(ms).toISOString();
  const ms = (v) => (v == null ? NaN : Date.parse(v));
  const cols = (r) => ({
    entry_date: r.entry_date, meal_slot: r.meal_slot, food_ref: r.food_ref, quantity_g: r.quantity_g,
    kcal: r.kcal, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g, fibre_g: r.fibre_g ?? null,
    weight_state: r.weight_state ?? 'as_weighed', eaten_at: r.eaten_at ?? null, note: r.note ?? null,
  });
  return {
    entries, favs,
    rpc: jest.fn(async (fn, args) => {
      if (fn === 'food_sync_push') {
        const v = now();
        const ch = args.changes;
        if (ch.food_entries) {
          for (const r of ch.food_entries.created || []) {
            const cur = entries.get(r.id);
            if (!cur) {
              entries.set(r.id, { id: r.id, ...cols(r), logged_at: iso(v), created_at: iso(v), updated_at: iso(v), deleted_at: null });
            } else if (version === '196' && cur.deleted_at != null && ms(cur.deleted_at) <= ms(r.created_at)) {
              entries.set(r.id, { ...cur, ...cols(r), created_at: iso(v), updated_at: iso(v), deleted_at: null });
            }
          }
          for (const r of ch.food_entries.updated || []) {
            const cur = entries.get(r.id);
            if (cur && (version === '195' || cur.deleted_at == null)) {
              entries.set(r.id, { ...cur, ...cols(r), note: Object.prototype.hasOwnProperty.call(r, 'note') ? r.note : cur.note, updated_at: iso(v) });
            }
          }
          for (const r of ch.food_entries.deleted || []) {
            if (version === '195') { entries.delete(r.id); continue; }
            const cur = entries.get(r.id);
            if (cur) entries.set(r.id, { ...cur, deleted_at: r.deleted_at ?? iso(v), updated_at: r.updated_at ?? iso(v) });
          }
        }
        if (ch.food_favourites) {
          for (const r of ch.food_favourites.updated || []) {
            const cur = favs.get(r.food_ref);
            const lu = r.last_used_at ?? iso(v);
            const kind = version === '196' && r.kind === 'dislike' ? 'dislike' : 'fav';
            if (!cur) favs.set(r.food_ref, { food_ref: r.food_ref, last_used_at: lu, kind, deleted_at: null });
            else if (ms(cur.last_used_at) < ms(lu)) {
              favs.set(r.food_ref, { ...cur, last_used_at: lu, deleted_at: null, ...(version === '196' ? { kind } : {}) });
            }
          }
          for (const r of ch.food_favourites.deleted || []) {
            const cur = favs.get(r.food_ref);
            if (cur) favs.set(r.food_ref, { ...cur, deleted_at: r.deleted_at ?? iso(v), last_used_at: r.last_used_at ?? iso(v) });
          }
        }
        return { data: { applied_at: iso(v) }, error: null };
      }
      if (fn === 'food_sync_pull') {
        const v = now();
        const since = ms(args.last_pulled_at);
        const e = [...entries.values()];
        const f = [...favs.values()];
        return {
          data: {
            timestamp: iso(v),
            changes: {
              food_entries: {
                created: e.filter((r) => ms(r.created_at) > since && r.created_at === r.updated_at && !r.deleted_at),
                updated: e.filter((r) => ms(r.updated_at) > since && r.created_at !== r.updated_at && !r.deleted_at),
                deleted: e.filter((r) => r.deleted_at && ms(r.deleted_at) > since),
              },
              food_favourites: {
                created: [],
                updated: f.filter((r) => ms(r.last_used_at) > since && !r.deleted_at),
                deleted: f.filter((r) => r.deleted_at && ms(r.deleted_at) > since),
              },
            },
          },
          error: null,
        };
      }
      throw new Error(fn);
    }),
  };
}

async function cycle(sb, u) {
  beginRun();
  for (const t of ['food_entries', 'food_favourites']) await foodPushFor(t)(sb, { userId: u, localUserId: u });
  for (const t of ['food_entries', 'food_favourites']) await foodPullFor(t)(sb, { userId: u });
}

let nowSpy;
beforeAll(async () => { await dbm.db(); raw = RAWS[0]; mockState.realTx = true; });
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
});
afterEach(() => nowSpy.mockRestore());

const entry = (kcal = 400) => ({
  entryDate: TODAY, mealSlot: 'meal_1', foodRef: 'custom:abc', quantityG: 200,
  kcal, proteinG: 30, carbsG: 40, fatG: 10, fibreG: 2,
});
const live = (r, u) => r.prepare('SELECT id FROM food_entries WHERE user_id = ? AND deleted_at IS NULL').all(u);
const rollupKcal = (r, u) => r.prepare('SELECT kcal_total FROM daily_intake_rollups WHERE user_id = ? AND entry_date = ?').get(u, TODAY)?.kcal_total;

describe.each(['195', '196'])('against the %s server', (version) => {
  test('P1 (item 1): an Undo after the delete has synced reaches the cloud', async () => {
    const cloud = makeCloud(version);
    const u = `p1-${version}`;
    clock += 1000; const id = await food.logFoodEntry(u, entry());
    clock += 2000; await cycle(cloud, u);
    expect(cloud.entries.get(id)?.deleted_at ?? null).toBeNull();
    clock += 1000; await food.deleteFoodEntry(id, u);
    clock += 2500; await cycle(cloud, u);
    if (version === '195') expect(cloud.entries.has(id)).toBe(false);
    else expect(cloud.entries.get(id).deleted_at).not.toBeNull();
    clock += 2000; await food.restoreFoodEntry(id, u); // Undo inside the toast
    clock += 2500; await cycle(cloud, u);
    expect(live(raw, u)).toHaveLength(1);
    expect(cloud.entries.has(id)).toBe(true);
    expect(cloud.entries.get(id).deleted_at).toBeNull();
    expect(cloud.entries.get(id).kcal).toBe(400);
    expect(rollupKcal(raw, u)).toBe(400);
  });

  test('P3 (item 3): "Not suggested" survives the device\'s own push and pull', async () => {
    const cloud = makeCloud(version);
    const u = `p3-${version}`;
    clock += 1000; await food.setFoodPreference(u, 'global:oats', 'dislike');
    clock += 2000; await cycle(cloud, u);
    expect(await food.getFoodPreference(u, 'global:oats')).toBe('dislike');
    expect(cloud.favs.get('global:oats').kind).toBe(version === '196' ? 'dislike' : 'fav');
    clock += 2000; await cycle(cloud, u); // and again: still the person's choice
    expect(await food.getFoodPreference(u, 'global:oats')).toBe('dislike');
  });
});

test('P2 (196 soft deletes): a delete on device A reaches device B, and B\'s diary hears it', async () => {
  const cloud = makeCloud('196');
  const U = 'same-user-p2';
  let B;
  jest.isolateModules(() => {
    B = { dbm: require('../../database'), food: require('../../food/db') };
  });
  await B.dbm.db();
  const bRaw = RAWS[RAWS.length - 1];
  expect(bRaw).not.toBe(raw);
  // B's pull is foodDomain's exactly: every slice through B's own applier,
  // then each touched day's rollup, then the diary signal.
  let bCursor = new Date(0).toISOString();
  const cycleB = async () => {
    const { data } = await cloud.rpc('food_sync_pull', { last_pulled_at: bCursor });
    const g = data.changes.food_entries;
    const days = new Set();
    for (const row of [...g.created, ...g.updated, ...g.deleted]) {
      const d = await B.food.applyFoodEntryFromCloud(U, row, days);
      if (d) days.add(d);
    }
    for (const d of days) await B.food.recomputeRollup(U, d);
    B.food.notifyDiaryChanges(U, [...days]);
    bCursor = new Date(Date.parse(data.timestamp) - 1).toISOString();
    return g;
  };
  const heardOnB = [];
  const off = B.food.subscribeDiaryChanges((evt) => heardOnB.push(evt));
  clock += 1000; const id = await food.logFoodEntry(U, entry(650));
  clock += 2000; await cycle(cloud, U);
  clock += 2000; await cycleB();
  expect(rollupKcal(bRaw, U)).toBe(650);
  clock += 1000; await food.deleteFoodEntry(id, U);
  clock += 2500; await cycle(cloud, U);
  clock += 5000; const second = await cycleB();
  expect(second.deleted).toHaveLength(1);
  expect(rollupKcal(raw, U)).toBe(0);
  expect(rollupKcal(bRaw, U)).toBe(0); // B no longer counts the deleted 650 kcal
  expect(heardOnB[heardOnB.length - 1]).toEqual({ userId: U, dates: [TODAY] });
  off();
});

test('item 7: the coordinator\'s pull tells the diary which days it changed, once', async () => {
  const cloud = makeCloud('196');
  const u = 'pull-signal';
  const heard = [];
  const off = food.subscribeDiaryChanges((evt) => heard.push(evt));
  // A row written by another device, straight into the cloud.
  const t = new Date(clock).toISOString();
  cloud.entries.set('11111111-2222-3333-4444-555555555555', {
    id: '11111111-2222-3333-4444-555555555555', entry_date: TODAY, meal_slot: 'meal_2', food_ref: 'custom:x',
    quantity_g: 100, kcal: 250, protein_g: 10, carbs_g: 20, fat_g: 5, fibre_g: null, weight_state: 'as_weighed',
    eaten_at: null, note: null, logged_at: t, created_at: t, updated_at: t, deleted_at: null,
  });
  clock += 1000;
  beginRun();
  await foodPullFor('food_entries')(cloud, { userId: u });
  expect(heard).toEqual([{ userId: u, dates: [TODAY] }]);
  // A pull that changes nothing says nothing.
  clock += 1000;
  beginRun();
  await foodPullFor('food_entries')(cloud, { userId: u });
  expect(heard).toHaveLength(1);
  off();
});

test('item 5: a legacy out-of-range row is still skipped, and logged with the table and reason only', async () => {
  const u = 'legacy-row';
  const t = new Date(clock).toISOString();
  const bad = {
    id: 'aaaaaaaa-0000-0000-0000-00000000bad1', entry_date: TODAY, meal_slot: 'meal_1', food_ref: 'custom:x',
    quantity_g: 9000, kcal: 250, protein_g: 10, carbs_g: 20, fat_g: 5, logged_at: t, created_at: t, updated_at: t, deleted_at: null,
  };
  const sb = {
    rpc: jest.fn(async () => ({
      data: { timestamp: new Date(clock + 50).toISOString(), changes: { food_entries: { created: [bad], updated: [], deleted: [] } } },
      error: null,
    })),
  };
  beginRun();
  const res = await foodPullFor('food_entries')(sb, { userId: u });
  expect(res.errors).toBe(0);
  expect(raw.prepare('SELECT COUNT(*) AS n FROM food_entries WHERE id = ?').get(bad.id).n).toBe(0);
  expect(logWarn).toHaveBeenCalledWith('food.pull.rejected', null, { table: 'food_entries', reason: 'figures' });
  // No id, day or figure in what is logged.
  const logged = JSON.stringify(logWarn.mock.calls);
  for (const secret of [bad.id, TODAY, '9000', '250']) expect(logged).not.toContain(secret);
  // The skip stands: the cursor still advances past it (0 such rows exist in production).
  expect(Number(await AsyncStorage.getItem(`@volyume_food_last_pulled_${u}`))).toBe(clock + 50 - 1);
});

describe('item 11: a failed one-time day repair is tried again at most once a day', () => {
  const u = 'repair-user';
  const failing = () => ({ rpc: jest.fn(async () => ({ data: null, error: new Error('offline') })) });
  const empty = () => ({ rpc: jest.fn(async () => ({ data: { changes: { food_entries: { created: [], updated: [], deleted: [] } } }, error: null })) });

  test('after a failure, the next pulls the same day do not fetch again; a day later it does, and success marks it done', async () => {
    const first = failing();
    await expect(domain.repairPulledEntryDaysOnce(first, u)).resolves.toBeNull();
    expect(first.rpc).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith('sync.tables.foodDomain.dayRepair.fetch', expect.any(Error));
    expect(await AsyncStorage.getItem(domain.FOOD_DAY_REPAIR_KEY(u))).toBeNull();

    clock += 60 * 60 * 1000; // an hour later
    const second = empty();
    await expect(domain.repairPulledEntryDaysOnce(second, u)).resolves.toBeNull();
    expect(second.rpc).not.toHaveBeenCalled();

    clock += domain.FOOD_DAY_REPAIR_RETRY_MS; // a day later
    const third = empty();
    await expect(domain.repairPulledEntryDaysOnce(third, u)).resolves.toBe(0);
    expect(third.rpc).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(domain.FOOD_DAY_REPAIR_KEY(u))).toBe('true');

    clock += 2 * domain.FOOD_DAY_REPAIR_RETRY_MS;
    const fourth = empty();
    await domain.repairPulledEntryDaysOnce(fourth, u);
    expect(fourth.rpc).not.toHaveBeenCalled(); // done is done
  });

  test('an attempt stamp in the future (a clock moved back) does not hold the repair off', async () => {
    const v = 'repair-user-2';
    await AsyncStorage.setItem(domain.FOOD_DAY_REPAIR_ATTEMPT_KEY(v), String(clock + 10 * domain.FOOD_DAY_REPAIR_RETRY_MS));
    const sb = empty();
    await domain.repairPulledEntryDaysOnce(sb, v);
    expect(sb.rpc).toHaveBeenCalledTimes(1);
  });
});
