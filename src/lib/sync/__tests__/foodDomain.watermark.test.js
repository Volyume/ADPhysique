/**
 * SYNC-5: the food push watermark must advance to the newest LOCAL
 * updated_at among the rows actually pushed, not the server timestamp.
 *
 * The change query selects rows by local updated_at (WHERE updated_at >
 * sinceMs). Advancing the watermark to the server clock (data.timestamp)
 * could skip a row whose local updated_at fell at/below the recorded server
 * time (written during the RPC round-trip, or under clock skew), and that
 * row would never push. Keeping the watermark on the local clock removes the
 * cross-clock gap.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));
jest.mock('../../food/db', () => ({
  getAllFoodEntriesSince: jest.fn(),
  getAllCustomFoodsSince: jest.fn(),
  getAllSavedMealsSince: jest.fn(),
  getAllRecipesSince: jest.fn(),
  getAllFavouritesSince: jest.fn(),
  getAllWaterSince: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const food = require('../../food/db');
const { foodPushFor, beginRun } = require('../tables/foodDomain');

const KEY = '@volyume_food_last_pushed_u1';

const entry = (id, updatedMs) => ({
  id, user_id: 'u1', entry_date: '2026-06-03', meal_slot: 'breakfast',
  food_ref: 'off:1', quantity_g: 100, kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 5,
  // created_at !== updated_at so the row buckets as 'updated', not 'created'.
  created_at: 1, updated_at: updatedMs,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  food.getAllFoodEntriesSince.mockResolvedValue([]);
  food.getAllCustomFoodsSince.mockResolvedValue([]);
  food.getAllSavedMealsSince.mockResolvedValue([]);
  food.getAllRecipesSince.mockResolvedValue([]);
  food.getAllFavouritesSince.mockResolvedValue([]);
  food.getAllWaterSince.mockResolvedValue([]);
  beginRun();
});

test('advances the watermark to the max local updated_at, not the server timestamp', async () => {
  food.getAllFoodEntriesSince.mockResolvedValue([entry('fe1', 1000), entry('fe2', 1500)]);
  const serverTs = new Date('3000-01-01').toISOString(); // absurd future server clock
  const sb = { rpc: jest.fn(async () => ({ data: { timestamp: serverTs }, error: null })) };

  const res = await foodPushFor('food_entries')(sb, { userId: 'u1', localUserId: 'u1' });

  expect(res.count).toBe(2);
  const stored = await AsyncStorage.getItem(KEY);
  // D-M1: watermark is maxPushed - 1 so a same-ms concurrent edit is never
  // skipped by the strict `updated_at > sinceMs` change query next cycle.
  expect(stored).toBe('1499'); // newest pushed local updated_at, minus 1 ms
  expect(stored).not.toBe(String(Date.parse(serverTs))); // not the server clock
});

test('a row written in the same ms as the watermark is not skipped next cycle (food review D-M1)', async () => {
  // First cycle pushes a row at t=1500; watermark becomes 1499.
  food.getAllFoodEntriesSince.mockResolvedValue([entry('fe2', 1500)]);
  const sb = { rpc: jest.fn(async () => ({ data: { timestamp: new Date('3000-01-01').toISOString() }, error: null })) };
  await foodPushFor('food_entries')(sb, { userId: 'u1', localUserId: 'u1' });
  const stored = Number(await AsyncStorage.getItem(KEY));
  // A concurrent edit landed at the same ms (1500). The strict change query
  // `updated_at > sinceMs` must still see it, i.e. 1500 > 1499.
  expect(1500 > stored).toBe(true);
});

test('does not advance the watermark when a table push fails', async () => {
  food.getAllFoodEntriesSince.mockResolvedValue([entry('fe1', 1000)]);
  const sb = { rpc: jest.fn(async () => ({ data: null, error: { message: 'boom' } })) };

  await foodPushFor('food_entries')(sb, { userId: 'u1', localUserId: 'u1' });

  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});

test('does not advance the watermark when nothing changed', async () => {
  const sb = { rpc: jest.fn() };

  await foodPushFor('food_entries')(sb, { userId: 'u1', localUserId: 'u1' });

  expect(sb.rpc).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});

test('a favourites-only push advances the watermark to the newest local change, not the server clock', async () => {
  // food_favourites has no updated_at; its change time is last_used_at. The
  // watermark must advance roughly to the newest last_used_at (so the whole
  // set does not re-push every sync), and never to the server clock. With the
  // D-M1 same-ms safety margin it lands at maxPushed - 1; only the single
  // boundary row re-pushes next cycle (idempotent via the RPC's ON CONFLICT).
  food.getAllFavouritesSince.mockResolvedValue([
    { user_id: 'u1', food_ref: 'off:1', last_used_at: 1700 },
    { user_id: 'u1', food_ref: 'off:2', last_used_at: 1900 },
  ]);
  const sb = { rpc: jest.fn(async () => ({ data: { timestamp: new Date('3000-01-01').toISOString() }, error: null })) };

  await foodPushFor('food_favourites')(sb, { userId: 'u1', localUserId: 'u1' });

  expect(await AsyncStorage.getItem(KEY)).toBe('1899'); // newest last_used_at - 1ms, not server clock
});
