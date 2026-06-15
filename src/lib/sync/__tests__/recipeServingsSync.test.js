/**
 * recipeServingsSync.test.js
 *
 * Regression for B1 (food review 2026-06-15): a recipe's serving count must
 * round-trip through sync. The cloud column is `servings` (migrate_021/023);
 * the local SQLite column is `total_servings`. The push mapper must read the
 * local key and emit the cloud key; the pull applier must read the cloud key
 * and write the local key. A half-updated mapping silently dropped servings in
 * both directions, corrupting per-serving macros of any logged recipe on a
 * second device / after reinstall.
 */
const runCalls = [];
let mockDb;

jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const { _recipeToCloud } = require('../tables/foodDomain');
const food = require('../../food/db');

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
    getFirstAsync: jest.fn(async () => null), // no newer local row -> apply proceeds
    getAllAsync: jest.fn(async () => []),
    withTransactionAsync: jest.fn(async (fn) => fn()),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  mockDb = makeDb();
});

describe('recipe servings round-trip through sync', () => {
  test('push: local total_servings is emitted as cloud `servings`', () => {
    const cloud = _recipeToCloud({ id: 'r1', name: 'Chicken & rice', total_servings: 4, updated_at: 1000, created_at: 1000 }, 'u1');
    expect(cloud.servings).toBe(4);
  });

  test('push: missing servings defaults to 1, never undefined', () => {
    const cloud = _recipeToCloud({ id: 'r1', name: 'x', updated_at: 1, created_at: 1 }, 'u1');
    expect(cloud.servings).toBe(1);
  });

  test('pull: cloud `servings` is written into the local total_servings column', async () => {
    await food.applyRecipeFromCloud('u1', {
      id: 'r1', name: 'Chicken & rice', servings: 4,
      created_at: new Date(1000).toISOString(), updated_at: new Date(2000).toISOString(),
    });
    const ins = runCalls.find(c => /INSERT OR REPLACE INTO recipes/.test(c.sql));
    expect(ins).toBeTruthy();
    // params: id, user_id, name, total_servings, notes, deleted_at, created_at, updated_at
    expect(ins.params[3]).toBe(4);
  });

  test('pull: a recipe never lands with NULL servings (defaults to 1)', async () => {
    await food.applyRecipeFromCloud('u1', {
      id: 'r2', name: 'x',
      created_at: new Date(1000).toISOString(), updated_at: new Date(2000).toISOString(),
    });
    const ins = runCalls.find(c => /INSERT OR REPLACE INTO recipes/.test(c.sql));
    expect(ins.params[3]).toBe(1);
  });
});
