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
 *  - food review D2: a batch refused 42501/23503 (a recipe the cloud no
 *    longer holds) is retried row by row; still-refused rows are skipped,
 *    counted and logged once with the table and count only, and the
 *    watermark advances past them. Other errors keep the no-advance rule.
 */
jest.mock('../../database', () => ({
  getAllRecipeIngredientsForUser: jest.fn(),
  getTombstonedRecipeIdsForUser: jest.fn(),
}));
jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
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

// Food review D2: a recipe another phone hard-deleted in the cloud before
// migrate_196 is still live here, so its ingredients are due and the cloud
// refuses them (42501 row-level policy, or 23503 foreign key). That failed
// the whole batch every cycle and the watermark never moved. A batch refused
// with either code is retried row by row; still-refused rows are skipped,
// counted, logged once (table + count only) and the watermark advances.
describe('D2: rows of a recipe the cloud no longer holds', () => {
  const { logWarn } = require('../../errorLog');
  const { logSyncError } = require('../telemetry');
  // The cloud refuses any row whose recipe_id is in `gone` with `code`; a
  // multi-row upsert containing one is refused whole, as PostgREST does.
  function makeCloud({ gone = new Set(), code = '42501', otherFailIds = new Set() } = {}) {
    const calls = [];
    const stored = [];
    return {
      calls, stored,
      from: jest.fn(() => ({
        upsert: jest.fn(async (rows) => {
          calls.push(rows.map((r) => r.id));
          if (rows.some((r) => otherFailIds.has(r.id))) return { error: { code: '08006', message: 'connection failure' } };
          if (rows.some((r) => gone.has(r.recipe_id))) return { error: { code, message: 'refused' } };
          stored.push(...rows.map((r) => r.id));
          return { error: null };
        }),
      })),
    };
  }

  test.each(['42501', '23503'])('%s: the live rows land, the refused rows are skipped, the watermark advances', async (code) => {
    db.getTombstonedRecipeIdsForUser.mockResolvedValue([]);
    db.getAllRecipeIngredientsForUser.mockResolvedValue([
      ing('live-1', 'r-live', 5000), ing('orphan-1', 'r-gone', 6000),
      ing('live-2', 'r-live', 7000), ing('orphan-2', 'r-gone', 8000),
    ]);
    const sb = makeCloud({ gone: new Set(['r-gone']), code });
    const res = await pushRecipeIngredients(sb, { userId: 'u', localUserId: 'u' });
    expect(sb.stored.sort()).toEqual(['live-1', 'live-2']);
    expect(res).toEqual({ count: 2, errors: 0, skipped: 2 });
    expect(await getPushWatermark('u', 'recipe_ingredients')).toBe(8000);
    // Logged once, the table and the count only: no id, recipe or food.
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith('sync.tables.recipeIngredients.pushRefused', null, { table: 'recipe_ingredients', count: 2 });
    const logged = JSON.stringify([logWarn.mock.calls, logSyncError.mock.calls]);
    for (const secret of ['orphan-1', 'orphan-2', 'r-gone', 'curated:oats']) expect(logged).not.toContain(secret);
    // Next cycle: only the boundary row goes, the batch is clean.
    const next = makeCloud({ gone: new Set(['r-gone']), code });
    const again = await pushRecipeIngredients(next, { userId: 'u', localUserId: 'u' });
    expect(again.errors).toBe(0);
    expect(next.calls.flat()).not.toContain('orphan-1');
  });

  test('any other error keeps today\'s behaviour: no row-by-row retry, no advance', async () => {
    db.getTombstonedRecipeIdsForUser.mockResolvedValue([]);
    db.getAllRecipeIngredientsForUser.mockResolvedValue([ing('a', 'r', 5000), ing('b', 'r', 6000)]);
    const sb = makeCloud({ otherFailIds: new Set(['a']) });
    const res = await pushRecipeIngredients(sb, { userId: 'u', localUserId: 'u' });
    expect(res).toEqual({ count: 0, errors: 1 });
    expect(sb.calls).toEqual([['a', 'b']]);
    expect(await getPushWatermark('u', 'recipe_ingredients')).toBe(0);
    expect(logWarn).not.toHaveBeenCalled();
  });

  test('a row that fails for another reason during the row-by-row retry holds the watermark', async () => {
    db.getTombstonedRecipeIdsForUser.mockResolvedValue([]);
    db.getAllRecipeIngredientsForUser.mockResolvedValue([
      ing('orphan', 'r-gone', 5000), ing('flaky', 'r', 6000), ing('ok', 'r', 7000),
    ]);
    // The whole batch is refused for the orphan; then 'flaky' fails on a
    // connection error when retried alone.
    let first = true;
    const sb = makeCloud({ gone: new Set(['r-gone']) });
    const base = sb.from;
    sb.from = jest.fn(() => {
      const t = base();
      const up = t.upsert;
      t.upsert = jest.fn(async (rows) => {
        if (!first && rows.length === 1 && rows[0].id === 'flaky') return { error: { code: '08006' } };
        first = false;
        return up(rows);
      });
      return t;
    });
    const res = await pushRecipeIngredients(sb, { userId: 'u', localUserId: 'u' });
    expect(res).toEqual({ count: 1, errors: 1, skipped: 1 });
    expect(sb.stored).toEqual(['ok']);
    expect(await getPushWatermark('u', 'recipe_ingredients')).toBe(0);
  });
});

// Founder ruling "Add cooked weight": the recipe record carries
// cooked_weight_g only behind RECIPE_COOKED_WEIGHT_PUSH; absent, not null,
// while it is off. Re-pinned 2026-10-16: 196 is applied, so it ships on.
describe('recipes push: cooked_weight_g behind RECIPE_COOKED_WEIGHT_PUSH', () => {
  const row = { id: 'r1', name: 'Chilli', total_servings: 4, notes: null, cooked_weight_g: 1200, created_at: 1, updated_at: 2, deleted_at: null };

  test('shipped on (migrate_196 applied); with the flag off the key is absent', () => {
    expect(require('../featureFlags').RECIPE_COOKED_WEIGHT_PUSH).toBe(true);
    jest.isolateModules(() => {
      jest.doMock('../featureFlags', () => ({ ...jest.requireActual('../featureFlags'), RECIPE_COOKED_WEIGHT_PUSH: false }));
      const { _recipeToCloud } = require('../tables/foodDomain');
      expect(Object.prototype.hasOwnProperty.call(_recipeToCloud(row, 'u'), 'cooked_weight_g')).toBe(false);
    });
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
