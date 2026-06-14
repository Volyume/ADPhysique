/**
 * slotRecents.test.js
 *
 * COMP-002 "Add again": food_slot_recents is the client-only memory of
 * what's been logged per meal slot, with the last-used portion. The write
 * must skip quick-adds (no resolvable food), tolerate a non-finite
 * quantity, and the read must be slot-filtered and frequency-ranked.
 *
 * Same db() mock harness as logFoodEntry.guard.test.js.
 */
const runCalls = [];
const getAllCalls = [];

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
    getFirstAsync: jest.fn(async () => null),
    getAllAsync: jest.fn(async (sql, params) => { getAllCalls.push({ sql, params }); return []; }),
  };
}

let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../db');

function upsertCall() {
  return runCalls.find(c => /INSERT INTO food_slot_recents/.test(c.sql)) ?? null;
}

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  getAllCalls.length = 0;
  mockDb = makeDb();
});

describe('upsertSlotRecent', () => {
  test('writes user, slot, ref and quantity; new rows start at count 1 and conflicts increment', async () => {
    await food.upsertSlotRecent('u1', { mealSlot: 'meal_3', foodRef: 'global:chicken', quantityG: 180 });
    const call = upsertCall();
    expect(call).not.toBeNull();
    // params: user0 slot1 ref2 lastLoggedAt3 quantity4
    expect(call.params[0]).toBe('u1');
    expect(call.params[1]).toBe('meal_3');
    expect(call.params[2]).toBe('global:chicken');
    expect(call.params[4]).toBe(180);
    expect(call.sql).toMatch(/VALUES \(\?, \?, \?, 1,/);
    expect(call.sql).toMatch(/ON CONFLICT\(user_id, meal_slot, food_ref\)/);
    expect(call.sql).toMatch(/log_count = log_count \+ 1/);
  });

  test('skips quick-add refs entirely (not foods, nothing to re-add)', async () => {
    await food.upsertSlotRecent('u1', { mealSlot: 'meal_1', foodRef: 'quick:adhoc', quantityG: 0 });
    expect(upsertCall()).toBeNull();
  });

  test('skips when slot or ref is missing; coerces a non-finite quantity to 0', async () => {
    await food.upsertSlotRecent('u1', { mealSlot: null, foodRef: 'global:oats', quantityG: 80 });
    await food.upsertSlotRecent('u1', { mealSlot: 'meal_1', foodRef: null, quantityG: 80 });
    expect(upsertCall()).toBeNull();

    await food.upsertSlotRecent('u1', { mealSlot: 'meal_1', foodRef: 'global:oats', quantityG: NaN });
    expect(upsertCall().params[4]).toBe(0);
  });
});

describe('getSlotRecents', () => {
  test('queries slot-filtered rows ranked by count then recency, with the limit bound', async () => {
    await food.getSlotRecents('u1', 'meal_2', 10);
    const call = getAllCalls.find(c => /FROM food_slot_recents/.test(c.sql));
    expect(call).not.toBeNull();
    expect(call.sql).toMatch(/WHERE user_id = \? AND meal_slot = \?/);
    expect(call.sql).toMatch(/ORDER BY log_count DESC, last_logged_at DESC/);
    expect(call.params).toEqual(['u1', 'meal_2', 10]);
  });
});
