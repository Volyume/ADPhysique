/**
 * foodDeleteTombstones.test.js
 *
 * D1-#8 (data-loss): food_favourites + daily_water deletes never propagated
 * cross-device. Both slices forced every row into `updated` with deleted:[],
 * and neither table had a tombstone, so a removed favourite/water row re-pulled
 * back from another device. The fix adds a deleted_at tombstone (local
 * migration + cloud migration 090), builds a real `deleted` slice on push, and
 * applies remote tombstones on pull.
 *
 * Two contracts are locked here:
 *   1. PUSH — a tombstoned favourite/water row lands in the `deleted` slice of
 *      the food_sync_push payload (not `updated`), carrying deleted_at.
 *   2. PULL — a remote tombstone row is applied (the local row's deleted_at is
 *      set), so the deletion reaches this device.
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
const { foodPushFor, foodPullFor, beginRun } = require('../tables/foodDomain');

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

describe('push — tombstoned rows land in the `deleted` slice', () => {
  test('a deleted favourite is pushed as a tombstone, not an update', async () => {
    food.getAllFavouritesSince.mockResolvedValue([
      { user_id: 'u1', food_ref: 'off:live', last_used_at: 1700, kind: 'fav', deleted_at: null },
      { user_id: 'u1', food_ref: 'off:gone', last_used_at: 1900, kind: 'fav', deleted_at: 1900 },
    ]);
    let payload = null;
    const sb = {
      rpc: jest.fn(async (_name, args) => {
        payload = args.changes;
        return { data: { timestamp: new Date('3000-01-01').toISOString() }, error: null };
      }),
    };

    await foodPushFor('food_favourites')(sb, { userId: 'u1', localUserId: 'u1' });

    const slice = payload.food_favourites;
    expect(slice.updated.map((r) => r.food_ref)).toEqual(['off:live']);
    expect(slice.deleted.map((r) => r.food_ref)).toEqual(['off:gone']);
    // The tombstone carries deleted_at so the cloud can record the deletion.
    expect(slice.deleted[0].deleted_at).toBe(new Date(1900).toISOString());
  });

  test('a deleted water day is pushed as a tombstone, not an update', async () => {
    food.getAllWaterSince.mockResolvedValue([
      { user_id: 'u1', entry_date: '2026-06-01', ml: 500, updated_at: 1700, deleted_at: null },
      { user_id: 'u1', entry_date: '2026-06-02', ml: 0, updated_at: 1900, deleted_at: 1900 },
    ]);
    let payload = null;
    const sb = {
      rpc: jest.fn(async (_name, args) => {
        payload = args.changes;
        return { data: { timestamp: new Date('3000-01-01').toISOString() }, error: null };
      }),
    };

    await foodPushFor('daily_water')(sb, { userId: 'u1', localUserId: 'u1' });

    const slice = payload.daily_water;
    expect(slice.updated.map((r) => r.entry_date)).toEqual(['2026-06-01']);
    expect(slice.deleted.map((r) => r.entry_date)).toEqual(['2026-06-02']);
    expect(slice.deleted[0].deleted_at).toBe(new Date(1900).toISOString());
  });
});

describe('pull — a remote tombstone is applied to the local row', () => {
  test('a favourite tombstone in the `deleted` slice is handed to the applier', async () => {
    const sb = {
      rpc: jest.fn(async () => ({
        data: {
          timestamp: new Date(5000).toISOString(),
          changes: {
            food_favourites: {
              created: [],
              updated: [],
              deleted: [{ user_id: 'u1', food_ref: 'off:gone', last_used_at: new Date(1900).toISOString(), deleted_at: new Date(1900).toISOString() }],
            },
          },
        },
        error: null,
      })),
    };

    const res = await foodPullFor('food_favourites')(sb, { userId: 'u1' });

    expect(res.errors).toBe(0);
    expect(food.applyFavouriteFromCloud).toHaveBeenCalledTimes(1);
    const [, row] = food.applyFavouriteFromCloud.mock.calls[0];
    expect(row.food_ref).toBe('off:gone');
    expect(row.deleted_at).toBe(new Date(1900).toISOString());
  });

  test('a water tombstone in the `deleted` slice is handed to the applier', async () => {
    const sb = {
      rpc: jest.fn(async () => ({
        data: {
          timestamp: new Date(5000).toISOString(),
          changes: {
            daily_water: {
              created: [],
              updated: [],
              deleted: [{ user_id: 'u1', entry_date: '2026-06-02', ml: 0, updated_at: new Date(1900).toISOString(), deleted_at: new Date(1900).toISOString() }],
            },
          },
        },
        error: null,
      })),
    };

    const res = await foodPullFor('daily_water')(sb, { userId: 'u1' });

    expect(res.errors).toBe(0);
    expect(food.applyWaterFromCloud).toHaveBeenCalledTimes(1);
    const [, row] = food.applyWaterFromCloud.mock.calls[0];
    expect(row.entry_date).toBe('2026-06-02');
    expect(row.deleted_at).toBe(new Date(1900).toISOString());
  });
});
