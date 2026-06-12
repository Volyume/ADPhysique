/**
 * meal-plan persistence — local CRUD for the generated plan. Like the
 * saved_meals suite, expo-sqlite is unavailable under node, so we mock
 * db() + runInTransaction and assert the SQL/params contract and the
 * JSON round-trip. The column name (plan_json) and the one-active-plan
 * rule are the contract the sync serialiser will depend on.
 */
const runCalls = [];
const txCalls = [];
let firstRow = null;

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
    getFirstAsync: jest.fn(async (sql) => {
      if (/FROM meal_plans/.test(sql)) return firstRow;
      return null;
    }),
    getAllAsync: jest.fn(async () => []),
  };
}

let mockDb;
jest.mock('../../database', () => ({
  db: jest.fn(async () => mockDb),
  runInTransaction: jest.fn(async (fn) => {
    // a tx object that records writes through the same channel
    const tx = { runAsync: jest.fn(async (sql, params) => { txCalls.push({ sql, params }); runCalls.push({ sql, params }); }) };
    return fn(tx);
  }),
}));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../db');

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  txCalls.length = 0;
  firstRow = null;
  mockDb = makeDb();
});

const PLAN = {
  kind: 'week',
  schedule: ['training', 'rest'],
  days: [{ variant: 'training', slots: [{ slot: 'meal_1', mealId: 'm1' }], totals: { kcal: 600, protein: 50, carbs: 60, fat: 15 } }],
  prefs: { diet: 'omnivore', mealsPerDay: 4 },
  targetSnapshot: { targetKcal: 2600, kcalMin: 2340, kcalMax: 2860, proteinG: 180 },
  seed: 11,
};

describe('saveActiveMealPlan', () => {
  test('deactivates the prior active plan then inserts the new one, in a transaction', async () => {
    const id = await food.saveActiveMealPlan('u1', PLAN);
    expect(typeof id).toBe('string');
    const deactivate = txCalls.find((c) => /UPDATE meal_plans SET is_active = 0/.test(c.sql));
    const insert = txCalls.find((c) => /INSERT INTO meal_plans/.test(c.sql));
    expect(deactivate).toBeTruthy();
    expect(insert).toBeTruthy();
    // insert ordered before nothing else; params: [id, userId, planJson, created, updated]
    expect(insert.sql).toMatch(/plan_json/);
    expect(insert.params[1]).toBe('u1');
    expect(JSON.parse(insert.params[2]).kind).toBe('week');
  });

  test('rejects missing userId or plan', async () => {
    await expect(food.saveActiveMealPlan('', PLAN)).rejects.toThrow(/userId/);
    await expect(food.saveActiveMealPlan('u1', null)).rejects.toThrow(/plan is required/);
  });
});

describe('getActiveMealPlan', () => {
  test('parses the stored JSON and round-trips the plan unchanged', async () => {
    firstRow = { id: 'p1', plan_json: JSON.stringify(PLAN), created_at: 1, updated_at: 2 };
    const got = await food.getActiveMealPlan('u1');
    expect(got.id).toBe('p1');
    expect(got.plan).toEqual(PLAN);
    // queries only the active, non-deleted row
    const sel = mockDb.getFirstAsync.mock.calls[0][0];
    expect(sel).toMatch(/is_active = 1/);
    expect(sel).toMatch(/deleted_at IS NULL/);
  });

  test('returns null when there is no plan', async () => {
    firstRow = null;
    expect(await food.getActiveMealPlan('u1')).toBeNull();
  });

  test('returns null on corrupt JSON rather than throwing', async () => {
    firstRow = { id: 'p1', plan_json: '{not json', created_at: 1, updated_at: 2 };
    expect(await food.getActiveMealPlan('u1')).toBeNull();
  });
});

describe('updateMealPlan (swap / coach edit persistence)', () => {
  test('replaces plan_json and scopes to the active, non-deleted row', async () => {
    await food.updateMealPlan('u1', 'p1', { ...PLAN, lastEditType: 'macro_adjustment' });
    const upd = runCalls.find((c) => /UPDATE meal_plans SET plan_json/.test(c.sql));
    expect(upd).toBeTruthy();
    expect(upd.sql).toMatch(/deleted_at IS NULL/);
    expect(JSON.parse(upd.params[0]).lastEditType).toBe('macro_adjustment');
    expect(upd.params[2]).toBe('p1');
    expect(upd.params[3]).toBe('u1');
  });

  test('rejects a missing plan', async () => {
    await expect(food.updateMealPlan('u1', 'p1', null)).rejects.toThrow(/plan is required/);
  });
});

describe('deleteMealPlan', () => {
  test('soft-deletes and deactivates (tombstone for sync)', async () => {
    await food.deleteMealPlan('u1', 'p1');
    const del = runCalls.find((c) => /UPDATE meal_plans SET deleted_at/.test(c.sql));
    expect(del).toBeTruthy();
    expect(del.sql).toMatch(/is_active = 0/);
    expect(del.params[2]).toBe('p1');
    expect(del.params[3]).toBe('u1');
  });
});
