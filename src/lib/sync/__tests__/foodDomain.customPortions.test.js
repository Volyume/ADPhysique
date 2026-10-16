/**
 * D230 R20 (lane 4B): custom_foods.portions_json on the wire.
 *
 * Why: the cloud column (supabase/migrate_195_custom_foods_portions.sql) is
 * WRITTEN, HELD. CUSTOM_FOOD_PORTIONS_PUSH ships false, so the custom_foods
 * push carries no portions_json key and the food syncs as it always did. With
 * the flag on the PARSED array is sent (the cloud column is jsonb). The pull
 * (applyCustomFoodFromCloud) reads the field defensively: an absent key leaves
 * this device's portions alone, a present value is re-validated.
 * Source-level guards pin the flag false and the migration header HELD.
 */
const fs = require('fs');
const path = require('path');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));
const mockFlags = { portions: false };
jest.mock('../featureFlags', () => ({
  get CUSTOM_FOOD_PORTIONS_PUSH() { return mockFlags.portions; },
}));
jest.mock('../../food/db', () => ({
  getAllFoodEntriesSince: jest.fn(),
  getAllCustomFoodsSince: jest.fn(),
  getAllSavedMealsSince: jest.fn(),
  getAllRecipesSince: jest.fn(),
  getAllFavouritesSince: jest.fn(),
  getAllWaterSince: jest.fn(),
}));

const food = require('../../food/db');
const { foodPushFor, beginRun } = require('../tables/foodDomain');

const custom = (extra = {}) => ({
  id: 'cf1', user_id: 'u1', name: 'Toast', brand: null, serving_g: 36, serving_label: '1 slice',
  kcal_100g: 250, protein_100g: 9, carbs_100g: 45, fat_100g: 3,
  portions_json: '[{"label":"1 mug","grams":250}]',
  created_at: 1, updated_at: 5000, ...extra,
});

async function pushed() {
  food.getAllCustomFoodsSince.mockResolvedValue([custom()]);
  const rpc = jest.fn(async () => ({ data: {}, error: null }));
  await foodPushFor('custom_foods')({ rpc }, { userId: 'u1', localUserId: 'u1' });
  expect(rpc).toHaveBeenCalledTimes(1);
  const { changes } = rpc.mock.calls[0][1];
  return changes.custom_foods.updated[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of ['getAllFoodEntriesSince', 'getAllCustomFoodsSince', 'getAllSavedMealsSince',
    'getAllRecipesSince', 'getAllFavouritesSince', 'getAllWaterSince']) food[k].mockResolvedValue([]);
  beginRun();
  mockFlags.portions = false;
});

describe('the custom_foods push', () => {
  test('with the flag off the row has no portions_json key, and every other field is unchanged', async () => {
    const row = await pushed();
    expect(Object.keys(row)).not.toContain('portions_json');
    expect(row).toMatchObject({ id: 'cf1', serving_g: 36, serving_label: '1 slice', kcal_100g: 250 });
  });

  test('with the flag on the parsed array goes up', async () => {
    mockFlags.portions = true;
    const row = await pushed();
    expect(row.portions_json).toEqual([{ label: '1 mug', grams: 250 }]);
  });

  test('with the flag on, a food with no portions sends an empty array and bad blobs never throw', async () => {
    mockFlags.portions = true;
    food.getAllCustomFoodsSince.mockResolvedValue([custom({ portions_json: null }), custom({ id: 'cf2', portions_json: '{bad' })]);
    const rpc = jest.fn(async () => ({ data: {}, error: null }));
    await foodPushFor('custom_foods')({ rpc }, { userId: 'u1', localUserId: 'u1' });
    const { changes } = rpc.mock.calls[0][1];
    const rows = [...(changes.custom_foods.created || []), ...(changes.custom_foods.updated || [])];
    expect(rows.map((r) => r.portions_json)).toEqual([[], []]);
  });
});

describe('the custom_foods pull (applyCustomFoodFromCloud)', () => {
  let runAsync;
  let applyCustomFoodFromCloud;
  beforeEach(() => {
    jest.resetModules();
    runAsync = jest.fn(async () => true);
    jest.doMock('../../database', () => ({
      db: async () => ({ runAsync, getFirstAsync: jest.fn(async () => null), getAllAsync: jest.fn(async () => []) }),
    }));
    jest.doMock('../../engineTelemetry', () => ({ track: jest.fn(async () => {}) }));
    ({ applyCustomFoodFromCloud } = jest.requireActual('../../food/db'));
  });
  const cloud = (extra = {}) => ({
    id: 'cf1', name: 'Toast', serving_g: 36, serving_label: '1 slice',
    kcal_100g: 250, protein_100g: 9, carbs_100g: 45, fat_100g: 3,
    created_at: '2026-10-16T10:00:00Z', updated_at: '2026-10-16T10:00:00Z', ...extra,
  });

  test('a row without the key tolerates its absence: the upsert is told to keep the local portions', async () => {
    await expect(applyCustomFoodFromCloud('u1', cloud())).resolves.toBe(true);
    const [sql, params] = runAsync.mock.calls[0];
    expect(sql).toContain('portions_json = CASE WHEN ? = 1 THEN excluded.portions_json ELSE custom_foods.portions_json END');
    expect(params[params.length - 1]).toBe(0);
    expect(params).toContain(null);
  });

  test('a row with the key stores it validated and tells the upsert to take it', async () => {
    await applyCustomFoodFromCloud('u1', cloud({
      portions_json: [{ label: '1 mug', grams: 250 }, { label: 'too big', grams: 99999 }],
    }));
    const [, params] = runAsync.mock.calls[0];
    expect(params[params.length - 1]).toBe(1);
    expect(params).toContain('[{"label":"1 mug","grams":250}]');
  });

  test('a junk value is cleaned, never thrown on', async () => {
    await expect(applyCustomFoodFromCloud('u1', cloud({ portions_json: 'junk' }))).resolves.toBe(true);
    const [, params] = runAsync.mock.calls[0];
    expect(params[params.length - 1]).toBe(1);
  });
});

describe('source guards', () => {
  const root = path.join(__dirname, '..', '..', '..', '..');
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

  test('the shipped flag is false (migrate_195 is HELD)', () => {
    expect(read('src/lib/sync/featureFlags.js')).toMatch(/export const CUSTOM_FOOD_PORTIONS_PUSH = false;/);
  });

  test('migrate_195 exists, says HELD, is additive and idempotent, and names its dependency and rollback', () => {
    const sql = read('supabase/migrate_195_custom_foods_portions.sql');
    const header = sql.slice(0, sql.indexOf('\nALTER TABLE public.custom_foods\n  ADD COLUMN'));
    for (const word of ['Purpose', 'Applied locally', 'Applied remotely', 'Safe to re-run', 'Rollback', 'Depends on']) {
      expect(header).toContain(word);
    }
    expect(header).toMatch(/Applied remotely: NO\. HELD/);
    expect(header).toContain('migrate_194');
    expect(header).toContain('RE-ISSUES food_sync_push');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS portions_json jsonb');
    expect(sql).not.toMatch(/^\s*(DROP COLUMN|DROP TABLE|TRUNCATE)/im);
  });

  test('the README row says HELD', () => {
    const readme = read('supabase/README.md');
    const row = readme.split('\n').find((l) => l.startsWith('| 195 |'));
    expect(row).toBeTruthy();
    expect(row).toContain('HELD');
  });
});
