/**
 * recipe_ingredients push (food data-layer audit 2026-10-16, item 4).
 *
 * The table is pushed straight to the cloud table (not through the food RPC),
 * whose row-level policy requires the caller's parent recipe row to exist.
 * Until migrate_196 a recipe delete was a HARD delete in the cloud, so every
 * ingredient of a deleted recipe failed its upsert, and with it the whole
 * 200-row batch, on every sync for ever. And every row was re-sent each cycle.
 *
 * What this suite pins, each written to fail before the fix:
 *  - an ingredient whose recipe is tombstoned on this device is never sent
 *    (it needs no cloud write: after 196 the cloud rows stay under their
 *    soft-deleted recipe);
 *  - the push is by watermark: a second cycle with nothing changed sends
 *    nothing; a changed row (updated_at at or after the watermark) is sent;
 *  - the watermark moves only after a clean push, so a failed batch goes
 *    again next cycle.
 */
jest.mock('../../database', () => ({
  getAllRecipeIngredientsForUser: jest.fn(),
  getTombstonedRecipeIdsForUser: jest.fn(),
}));
jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const db = require('../../database');
const { pushRecipeIngredients } = require('../tables/recipeIngredients');
const { getPushWatermark } = require('../watermark');

const ing = (id, recipeId, updatedAt, deletedAt = null) => ({
  id, recipeId, foodRef: 'curated:oats', quantityG: 50, orderIndex: 0,
  createdAt: 1000, updatedAt, deletedAt,
});

function makeSb({ fail = false } = {}) {
  const upserts = [];
  return {
    upserts,
    from: jest.fn(() => ({
      upsert: jest.fn(async (rows) => {
        upserts.push(rows);
        return { error: fail ? new Error('new row violates row-level security policy') : null };
      }),
    })),
  };
}
const sentIds = (sb) => sb.upserts.flat().map((r) => r.id);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('an ingredient of a recipe deleted on this device is never sent', async () => {
  db.getAllRecipeIngredientsForUser.mockResolvedValue([
    ing('live-1', 'r-live', 5000),
    ing('dead-1', 'r-dead', 6000, 6000), // tombstoned with its recipe
    ing('dead-2', 'r-dead', 6000),
  ]);
  db.getTombstonedRecipeIdsForUser.mockResolvedValue(['r-dead']);
  const sb = makeSb();
  const res = await pushRecipeIngredients(sb, { userId: 'cloud-u', localUserId: 'local-u' });
  expect(sentIds(sb)).toEqual(['live-1']);
  expect(res).toEqual({ count: 1, errors: 0 });
  expect(db.getTombstonedRecipeIdsForUser).toHaveBeenCalledWith('local-u');
});

test('when every row belongs to a deleted recipe, nothing is sent and nothing fails', async () => {
  db.getAllRecipeIngredientsForUser.mockResolvedValue([ing('dead-1', 'r-dead', 6000, 6000)]);
  db.getTombstonedRecipeIdsForUser.mockResolvedValue(['r-dead']);
  const sb = makeSb({ fail: true });
  await expect(pushRecipeIngredients(sb, { userId: 'u', localUserId: 'u' })).resolves.toEqual({ count: 0, errors: 0 });
  expect(sb.from).not.toHaveBeenCalled();
});

test('by watermark: an unchanged table is not re-sent; a changed row is', async () => {
  db.getTombstonedRecipeIdsForUser.mockResolvedValue([]);
  db.getAllRecipeIngredientsForUser.mockResolvedValue([ing('a', 'r', 5000), ing('b', 'r', 7000)]);
  const first = makeSb();
  await pushRecipeIngredients(first, { userId: 'u', localUserId: 'u' });
  expect(sentIds(first).sort()).toEqual(['a', 'b']);
  expect(await getPushWatermark('u', 'recipe_ingredients')).toBe(7000);

  // Nothing changed: only the boundary row (inclusive, an idempotent upsert) goes again.
  const second = makeSb();
  await pushRecipeIngredients(second, { userId: 'u', localUserId: 'u' });
  expect(sentIds(second)).toEqual(['b']);

  // 'a' is edited: it goes up (with the boundary row 'b'); the older
  // untouched row 'c' does not.
  db.getAllRecipeIngredientsForUser.mockResolvedValue([ing('a', 'r', 9000), ing('b', 'r', 7000), ing('c', 'r', 4000)]);
  const third = makeSb();
  await pushRecipeIngredients(third, { userId: 'u', localUserId: 'u' });
  expect(sentIds(third)).toEqual(['a', 'b']);
  expect(await getPushWatermark('u', 'recipe_ingredients')).toBe(9000);
});

test('a failed batch leaves the watermark, so the rows go again next cycle', async () => {
  db.getTombstonedRecipeIdsForUser.mockResolvedValue([]);
  db.getAllRecipeIngredientsForUser.mockResolvedValue([ing('a', 'r', 5000)]);
  const failed = makeSb({ fail: true });
  const res = await pushRecipeIngredients(failed, { userId: 'u', localUserId: 'u' });
  expect(res.errors).toBe(1);
  expect(await getPushWatermark('u', 'recipe_ingredients')).toBe(0);
  const retry = makeSb();
  await pushRecipeIngredients(retry, { userId: 'u', localUserId: 'u' });
  expect(sentIds(retry)).toEqual(['a']);
});

// Founder ruling "Add cooked weight": the recipe record carries
// cooked_weight_g only behind RECIPE_COOKED_WEIGHT_PUSH (ships false until
// migrate_196 is applied); absent, not null, while it is off.
describe('recipes push: cooked_weight_g behind RECIPE_COOKED_WEIGHT_PUSH', () => {
  const row = { id: 'r1', name: 'Chilli', total_servings: 4, notes: null, cooked_weight_g: 1200, created_at: 1, updated_at: 2, deleted_at: null };

  test('flag off (as shipped): the key is absent', () => {
    expect(require('../featureFlags').RECIPE_COOKED_WEIGHT_PUSH).toBe(false);
    const { _recipeToCloud } = require('../tables/foodDomain');
    expect(Object.prototype.hasOwnProperty.call(_recipeToCloud(row, 'u'), 'cooked_weight_g')).toBe(false);
  });

  test('flag on: the key is sent (null when not weighed)', () => {
    jest.isolateModules(() => {
      jest.doMock('../featureFlags', () => ({ ...jest.requireActual('../featureFlags'), RECIPE_COOKED_WEIGHT_PUSH: true }));
      const { _recipeToCloud } = require('../tables/foodDomain');
      expect(_recipeToCloud(row, 'u').cooked_weight_g).toBe(1200);
      expect(_recipeToCloud({ ...row, cooked_weight_g: null }, 'u').cooked_weight_g).toBeNull();
    });
  });
});
