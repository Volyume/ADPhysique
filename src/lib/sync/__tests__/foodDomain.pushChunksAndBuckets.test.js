/**
 * Wave 4 hostile review (food level-up, 2026-10-16): the food push.
 *
 *  - item 6: a large change set (an imported history) goes up in chunks of
 *    FOOD_PUSH_CHUNK rows per table, one food_sync_push call each, instead of
 *    one oversized call; the shared watermark advances once, and only when
 *    every chunk succeeded; a failed chunk leaves it where it was (the rows
 *    re-push next cycle, which the server's ON CONFLICT makes safe).
 *  - lead ruling: a row edited before its first push used to go up in
 *    `updated` alone, an UPDATE of a row the server does not hold, so it never
 *    reached the cloud. A row created after the watermark now goes in
 *    `created` with its latest values (and, when edited, in `updated` too, so
 *    a row already sent in a cycle whose watermark did not move still gets its
 *    edit); a row created at or before the watermark goes in `updated`.
 *
 * The "server" is a model of food_sync_push's food_entries branch
 * (supabase/migrate_118 and migrate_194): `created` INSERT ... ON CONFLICT DO
 * NOTHING, then `updated` UPDATE of a row it holds, then `deleted` DELETE. The
 * local change query is modelled as the real one (updated_at > watermark).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));
const mockLocal = { entries: [] };
jest.mock('../../food/db', () => ({
  getAllFoodEntriesSince: jest.fn(async (_u, since) => mockLocal.entries.filter((r) => r.updated_at > since).map((r) => ({ ...r }))),
  getAllCustomFoodsSince: jest.fn(async () => []),
  getAllSavedMealsSince: jest.fn(async () => []),
  getAllRecipesSince: jest.fn(async () => []),
  getAllFavouritesSince: jest.fn(async () => []),
  getAllWaterSince: jest.fn(async () => []),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const { foodPushFor, beginRun, FOOD_PUSH_CHUNK, _foodRowBuckets } = require('../tables/foodDomain');

const KEY = '@volyume_food_last_pushed_u1';
const T0 = Date.UTC(2026, 9, 16, 9, 0);

const entry = (id, over = {}) => ({
  id, user_id: 'u1', entry_date: '2026-10-15', meal_slot: 'meal_1', food_ref: 'quick:x', quantity_g: 0,
  kcal: 300, protein_g: 1, carbs_g: 1, fat_g: 1, fibre_g: null, weight_state: 'as_weighed', eaten_at: null,
  logged_at: T0, created_at: T0, updated_at: T0, deleted_at: null, ...over,
});
const edit = (id, patch, at) => {
  const r = mockLocal.entries.find((e) => e.id === id);
  Object.assign(r, patch, { updated_at: at });
};

function server({ fail = () => false } = {}) {
  const rows = new Map();
  let calls = 0;
  const rpc = jest.fn(async (_name, { changes }) => {
    calls += 1;
    if (fail(calls)) return { data: null, error: { message: 'timeout' } };
    const t = changes.food_entries;
    if (t) {
      for (const r of t.created || []) if (!rows.has(r.id)) rows.set(r.id, { ...r });
      for (const r of t.updated || []) if (rows.has(r.id)) rows.set(r.id, { ...rows.get(r.id), ...r });
      for (const r of t.deleted || []) rows.delete(r.id);
    }
    return { data: { applied_at: 'now' }, error: null };
  });
  return { rpc, rows };
}

async function push(sb) {
  beginRun();
  return foodPushFor('food_entries')(sb, { userId: 'u1', localUserId: 'u1' });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks(); // AsyncStorage's mock functions record their calls; start each test at zero
  mockLocal.entries = [];
});

const watermarkWrites = () => AsyncStorage.setItem.mock.calls.filter(([k]) => k === KEY);

describe('item 6: a large push goes up in chunks', () => {
  test('1,200 rows: three calls of 500, 500 and 200; the watermark advances once, to the newest row', async () => {
    expect(FOOD_PUSH_CHUNK).toBe(500);
    mockLocal.entries = Array.from({ length: 1200 }, (_, i) => entry(`e${i}`, { created_at: T0 + i, updated_at: T0 + i }));
    const sb = server();
    const res = await push(sb);
    expect(res).toEqual({ count: 1200, errors: 0 });
    expect(sb.rpc).toHaveBeenCalledTimes(3);
    expect(sb.rpc.mock.calls.map(([, { changes }]) => changes.food_entries.created.length)).toEqual([500, 500, 200]);
    expect(sb.rows.size).toBe(1200);
    expect(watermarkWrites()).toEqual([[KEY, String(T0 + 1199 - 1)]]);
  });

  test('a failing middle chunk leaves the watermark unmoved; the next cycle sends everything again and lands it', async () => {
    mockLocal.entries = Array.from({ length: 1200 }, (_, i) => entry(`e${i}`, { created_at: T0 + i, updated_at: T0 + i }));
    const failing = server({ fail: (n) => n === 2 });
    const res = await push(failing);
    expect(res).toEqual({ count: 500, errors: 1 });
    expect(failing.rpc).toHaveBeenCalledTimes(2); // the rest of the table waits for the next cycle
    expect(watermarkWrites()).toEqual([]);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();

    // Next cycle against the same server, which already holds the first chunk.
    const again = await push({ rpc: jest.fn((...a) => failing.rpc.getMockImplementation()(...a)) });
    expect(again.errors).toBe(0);
    expect(failing.rows.size).toBe(1200);
    expect(await AsyncStorage.getItem(KEY)).toBe(String(T0 + 1199 - 1));
  });
});

describe('lead ruling: a row edited before its first push reaches the cloud', () => {
  test('logged, then edited before any sync: the cloud gets the row with the edited values', async () => {
    mockLocal.entries = [entry('a')];
    edit('a', { kcal: 450, meal_slot: 'meal_2' }, T0 + 60000);
    const sb = server();
    await push(sb);
    expect(sb.rows.get('a')).toEqual(expect.objectContaining({ kcal: 450, meal_slot: 'meal_2' }));
  });

  test('pushed (the watermark moved), then edited: it goes as `updated` only, and the edit lands', async () => {
    mockLocal.entries = [entry('b'), entry('z', { created_at: T0 + 10, updated_at: T0 + 10 })];
    const sb = server();
    await push(sb);
    expect(await AsyncStorage.getItem(KEY)).toBe(String(T0 + 10 - 1));
    edit('b', { kcal: 500 }, T0 + 60000);
    await push(sb);
    const last = sb.rpc.mock.calls[sb.rpc.mock.calls.length - 1][1].changes.food_entries;
    // 'z' is the boundary row the 1 ms back-off re-includes (unchanged, so a
    // `created` the server ignores); 'b' goes as `updated` alone.
    expect(last.created.map((r) => r.id)).toEqual(['z']);
    expect(last.updated.map((r) => r.id)).toEqual(['b']);
    expect(sb.rows.get('b').kcal).toBe(500);
  });

  test('the newest pushed row (created in the watermark\'s own millisecond), then edited: the edit lands, once', async () => {
    // The watermark is stored 1 ms below the newest pushed row, so that row's
    // created_at is after it: it goes in both buckets, and the server's
    // `created` (DO NOTHING) then `updated` leave one row with the edit.
    mockLocal.entries = [entry('n')];
    const sb = server();
    await push(sb);
    edit('n', { kcal: 640 }, T0 + 60000);
    await push(sb);
    const last = sb.rpc.mock.calls[sb.rpc.mock.calls.length - 1][1].changes.food_entries;
    expect(last.created.map((r) => r.id)).toEqual(['n']);
    expect(last.updated.map((r) => r.id)).toEqual(['n']);
    expect(sb.rows.size).toBe(1);
    expect(sb.rows.get('n').kcal).toBe(640);
  });

  test('sent in a cycle whose watermark did not move, then edited: the edit still lands', async () => {
    // 501 rows: the first chunk lands, the second fails, the watermark stays.
    mockLocal.entries = Array.from({ length: 501 }, (_, i) => entry(`c${i}`, { created_at: T0 + i, updated_at: T0 + i }));
    const sb = server({ fail: (n) => n === 2 });
    await push(sb);
    expect(sb.rows.has('c0')).toBe(true);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    edit('c0', { kcal: 999 }, T0 + 60000);
    await push(sb);
    expect(sb.rows.get('c0').kcal).toBe(999);
    expect(sb.rows.size).toBe(501);
  });

  test('works with the chunking: 1,200 rows created and edited before the first push all land edited', async () => {
    mockLocal.entries = Array.from({ length: 1200 }, (_, i) => entry(`d${i}`, { created_at: T0 + i, updated_at: T0 + i }));
    mockLocal.entries.forEach((r) => edit(r.id, { kcal: 111 }, T0 + 100000));
    const sb = server();
    await push(sb);
    expect(sb.rpc).toHaveBeenCalledTimes(3);
    expect(sb.rows.size).toBe(1200);
    expect([...sb.rows.values()].every((r) => r.kcal === 111)).toBe(true);
  });

  test('the bucket rule itself', () => {
    const W = T0 + 1000;
    expect(_foodRowBuckets(entry('x', { created_at: W + 5, updated_at: W + 5 }), W)).toEqual(['created']);
    expect(_foodRowBuckets(entry('x', { created_at: W + 5, updated_at: W + 9 }), W)).toEqual(['created', 'updated']);
    expect(_foodRowBuckets(entry('x', { created_at: W, updated_at: W + 9 }), W)).toEqual(['updated']);
    expect(_foodRowBuckets(entry('x', { created_at: W - 5, updated_at: W + 9, deleted_at: W + 9 }), W)).toEqual(['deleted']);
    expect(_foodRowBuckets(entry('x', { created_at: W + 5, updated_at: W + 9, deleted_at: W + 9 }), W)).toEqual(['deleted']);
  });
});
