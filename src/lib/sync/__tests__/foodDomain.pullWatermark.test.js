/**
 * F2: the food-domain pull must not advance its watermark when a row fails to
 * apply, and must report the failure so the runner sees it (and the push-first
 * sign-out guard refuses to wipe).
 *
 * The old _doPullAll swallowed per-row apply errors, returned errors:0, and
 * advanced @volyume_food_last_pulled_<uid> to the server timestamp regardless.
 * A row that failed to apply was then skipped past the watermark forever, a
 * silent permanent per-row loss that was also invisible to the sign-out guard.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));
jest.mock('../../food/db', () => ({
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
const { foodPullFor, beginRun } = require('../tables/foodDomain');

const KEY = '@volyume_food_last_pulled_u1';
const SERVER_TS = new Date('3000-01-01').toISOString();

function pullSb(changes) {
  return { rpc: jest.fn(async () => ({ data: { changes, timestamp: SERVER_TS }, error: null })) };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  for (const fn of Object.values(food)) if (fn.mockResolvedValue) fn.mockResolvedValue(undefined);
  beginRun();
});

test('advances the watermark and reports no errors when every row applies', async () => {
  food.applyFoodEntryFromCloud.mockResolvedValue('2026-06-03');
  const sb = pullSb({ food_entries: { created: [{ id: 'fe1' }], updated: [], deleted: [] } });

  const res = await foodPullFor('food_entries')(sb, { userId: 'u1' });

  expect(res.errors).toBe(0);
  expect(await AsyncStorage.getItem(KEY)).toBe(String(Date.parse(SERVER_TS)));
});

test('does NOT advance the watermark and reports errors when a row fails to apply', async () => {
  food.applyFoodEntryFromCloud.mockRejectedValue(new Error('sqlite constraint'));
  const sb = pullSb({ food_entries: { created: [{ id: 'fe1' }], updated: [], deleted: [] } });

  const res = await foodPullFor('food_entries')(sb, { userId: 'u1' });

  // Failure is visible to the runner (so sign-out won't wipe)...
  expect(res.errors).toBe(1);
  // ...and the cursor stays put so the row re-pulls next cycle.
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});

test('a failure on one table does not report as an error for an unrelated table', async () => {
  food.applyFoodEntryFromCloud.mockRejectedValue(new Error('boom'));
  food.applyCustomFoodFromCloud.mockResolvedValue(undefined);
  const sb = pullSb({
    food_entries: { created: [{ id: 'fe1' }], updated: [], deleted: [] },
    custom_foods: { created: [{ id: 'cf1' }], updated: [], deleted: [] },
  });

  // The bulk pull runs once; both handlers read their own slice of the result.
  const feRes = await foodPullFor('food_entries')(sb, { userId: 'u1' });
  const cfRes = await foodPullFor('custom_foods')(sb, { userId: 'u1' });

  expect(feRes.errors).toBe(1); // the table that actually failed
  expect(cfRes.errors).toBe(0); // not multiplied onto a healthy table
  // Any failure in the cycle holds the shared watermark.
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});
