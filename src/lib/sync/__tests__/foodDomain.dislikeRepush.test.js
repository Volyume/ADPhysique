/**
 * Review finding D4 (food audit follow-up 2026-10-16): the food push re-stamps
 * the pre-migrate_196 dislikes ONCE per user per device, before it reads its
 * rows, so that push carries their `kind`. Pins: it runs before the reads, the
 * marker is set only after the re-stamp lands, it never runs twice, and a
 * failed re-stamp never blocks the push and is retried next time.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));
const order = [];
jest.mock('../../food/db', () => ({
  restampDislikesForRepush: jest.fn(async () => { order.push('restamp'); return 1; }),
  getAllFoodEntriesSince: jest.fn(async () => { order.push('read'); return []; }),
  getAllCustomFoodsSince: jest.fn(async () => []),
  getAllSavedMealsSince: jest.fn(async () => []),
  getAllRecipesSince: jest.fn(async () => []),
  getAllFavouritesSince: jest.fn(async () => []),
  getAllWaterSince: jest.fn(async () => []),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const food = require('../../food/db');
const { foodPushFor, beginRun, FOOD_DISLIKE_REPUSH_KEY } = require('../tables/foodDomain');

const push = async () => {
  beginRun();
  await foodPushFor('food_favourites')({ rpc: jest.fn(async () => ({ data: {}, error: null })) }, { userId: 'u1', localUserId: 'u1' });
};

beforeEach(async () => {
  order.length = 0;
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('the first push re-stamps before reading, sets the marker, and never runs it again', async () => {
  await push();
  expect(order.slice(0, 2)).toEqual(['restamp', 'read']);
  expect(food.restampDislikesForRepush).toHaveBeenCalledWith('u1');
  expect(await AsyncStorage.getItem(FOOD_DISLIKE_REPUSH_KEY('u1'))).toBe('1');
  await push();
  expect(food.restampDislikesForRepush).toHaveBeenCalledTimes(1);
});

test('a failed re-stamp leaves no marker, does not block the push, and is retried', async () => {
  food.restampDislikesForRepush.mockRejectedValueOnce(new Error('locked'));
  await push();
  expect(food.getAllFoodEntriesSince).toHaveBeenCalled();
  expect(await AsyncStorage.getItem(FOOD_DISLIKE_REPUSH_KEY('u1'))).toBeNull();
  await push();
  expect(food.restampDislikesForRepush).toHaveBeenCalledTimes(2);
  expect(await AsyncStorage.getItem(FOOD_DISLIKE_REPUSH_KEY('u1'))).toBe('1');
});
