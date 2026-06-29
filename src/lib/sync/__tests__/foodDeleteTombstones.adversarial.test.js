/**
 * ADVERSARIAL probes for food delete tombstones (D1-#8).
 * Attacks the bucketing truthiness edge and multi-row / mixed-slice push,
 * which the shipped suite (one live + one tombstone) does not exercise.
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
  applyFoodEntryFromCloud: jest.fn(),
  applyCustomFoodFromCloud: jest.fn(),
  applySavedMealFromCloud: jest.fn(),
  applyRecipeFromCloud: jest.fn(),
  applyFavouriteFromCloud: jest.fn(),
  applyWaterFromCloud: jest.fn(),
  recomputeRollup: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const food = require('../../food/db');
const { foodPushFor, beginRun } = require('../tables/foodDomain');

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

async function pushFavs(rows) {
  food.getAllFavouritesSince.mockResolvedValue(rows);
  let payload = null;
  const sb = {
    rpc: jest.fn(async (_n, args) => {
      payload = args.changes;
      return { data: { timestamp: new Date('3000-01-01').toISOString() }, error: null };
    }),
  };
  await foodPushFor('food_favourites')(sb, { userId: 'u1', localUserId: 'u1' });
  return payload?.food_favourites ?? null;
}

describe('push bucketing — many rows, mixed live/tombstone', () => {
  test('three live + two tombstones split into the right slices', async () => {
    const slice = await pushFavs([
      { user_id: 'u1', food_ref: 'a', last_used_at: 100, kind: 'fav', deleted_at: null },
      { user_id: 'u1', food_ref: 'b', last_used_at: 200, kind: 'fav', deleted_at: null },
      { user_id: 'u1', food_ref: 'c', last_used_at: 300, kind: 'dislike', deleted_at: null },
      { user_id: 'u1', food_ref: 'd', last_used_at: 400, kind: 'fav', deleted_at: 400 },
      { user_id: 'u1', food_ref: 'e', last_used_at: 500, kind: 'fav', deleted_at: 500 },
    ]);
    expect(slice.updated.map((r) => r.food_ref).sort()).toEqual(['a', 'b', 'c']);
    expect(slice.deleted.map((r) => r.food_ref).sort()).toEqual(['d', 'e']);
  });

  test('a deleted_at of exactly 0 (epoch) is treated as LIVE, not a tombstone', async () => {
    // _bucketTombstone splits on `r.deleted_at ?` truthiness; deleted_at === 0
    // is falsy so it lands in `updated`. This documents the (defensible) edge:
    // real tombstones use Date.now(), never 0. If this ever flips, a row
    // tombstoned at epoch 0 would wrongly read as live.
    const slice = await pushFavs([
      { user_id: 'u1', food_ref: 'z', last_used_at: 0, kind: 'fav', deleted_at: 0 },
    ]);
    expect(slice.updated.map((r) => r.food_ref)).toEqual(['z']);
    expect(slice.deleted).toEqual([]);
  });

  test('a tombstone carries the deleted_at ISO and the kind through to the slice', async () => {
    const slice = await pushFavs([
      { user_id: 'u1', food_ref: 'gone', last_used_at: 1900, kind: 'dislike', deleted_at: 1900 },
    ]);
    expect(slice.deleted).toHaveLength(1);
    expect(slice.deleted[0].deleted_at).toBe(new Date(1900).toISOString());
    expect(slice.deleted[0].kind).toBe('dislike');
  });
});
