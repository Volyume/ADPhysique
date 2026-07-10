/**
 * eatenAt.test.js
 *
 * Ultimate-Audit item 15 (D22 15b, timeline food logging): pins the write
 * semantics of the eaten_at column (schema v67 / migrate_115), distinct
 * from logged_at ("the moment the client wrote the row").
 *
 *   - logFoodEntry: an actual (non-planned) log stamps eaten_at = now; a
 *     planned meal-plan row gets eaten_at = NULL (it has not been eaten
 *     yet).
 *   - updateFoodEntry: eaten_at is user-editable via the edit sheet;
 *     omitting the key preserves the entry's existing value, an explicit
 *     value (including null) replaces it.
 *   - Sync round-trip (src/lib/sync/tables/foodDomain.js): eaten_at maps to
 *     an ISO string for push, NULL stays NULL (never defaulted to
 *     logged_at, unlike weight_state's default-to-'as_weighed' pattern --
 *     NULL here is a real, meaningful state).
 *   - applyFoodEntryFromCloud: the reverse direction, ISO -> ms, NULL stays
 *     NULL.
 *
 * Same db() mock harness as logFoodEntry.guard.test.js / weightState.test.js.
 */
const runCalls = [];

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
    getFirstAsync: jest.fn(async (sql) => {
      if (/FROM food_entries WHERE id/.test(sql)) return { entry_date: '2026-07-10', eaten_at: null };
      if (/FROM food_entries/.test(sql)) {
        return { kcal_total: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, entries_count: 0 };
      }
      return null;
    }),
    getAllAsync: jest.fn(async () => []),
  };
}

let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../db');
const { _foodEntryToCloud } = require('../../sync/tables/foodDomain');

function insertParams() {
  const insert = runCalls.find((c) => /INSERT INTO food_entries/.test(c.sql));
  return insert ? insert.params : null;
}
function updateParams() {
  const update = runCalls.find((c) => /UPDATE food_entries SET/.test(c.sql));
  return update ? update.params : null;
}

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  mockDb = makeDb();
});

// INSERT params index: id0 user1 date2 slot3 ref4 qty5 kcal6 pro7 carb8 fat9
// fibre10 logged11 is_planned12 weight13 eaten14 created15 updated16
describe('logFoodEntry: eaten_at write semantics', () => {
  test('an actual (non-planned) log stamps eaten_at = now', async () => {
    const before = Date.now();
    await food.logFoodEntry('u1', {
      entryDate: '2026-07-10', mealSlot: 'meal_1', foodRef: 'custom:x',
      quantityG: 100, kcal: 200, proteinG: 20, carbsG: 10, fatG: 5,
    });
    const after = Date.now();
    const p = insertParams();
    expect(p[12]).toBe(0); // is_planned
    expect(p[14]).toBeGreaterThanOrEqual(before);
    expect(p[14]).toBeLessThanOrEqual(after);
  });

  test('a planned meal-plan row gets eaten_at = NULL (not eaten yet)', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-07-10', mealSlot: 'meal_1', foodRef: 'custom:x',
      quantityG: 100, kcal: 200, proteinG: 20, carbsG: 10, fatG: 5, isPlanned: true,
    });
    const p = insertParams();
    expect(p[12]).toBe(1); // is_planned
    expect(p[14]).toBeNull();
  });

  test('an explicit eatenAt override is honoured for a non-planned log', async () => {
    const explicit = new Date('2026-07-10T08:15:00.000Z').getTime();
    await food.logFoodEntry('u1', {
      entryDate: '2026-07-10', mealSlot: 'meal_1', foodRef: 'custom:x',
      quantityG: 100, kcal: 200, proteinG: 20, carbsG: 10, fatG: 5, eatenAt: explicit,
    });
    expect(insertParams()[14]).toBe(explicit);
  });
});

// UPDATE params index: date0 slot1 ref2 qty3 kcal4 pro5 carb6 fat7 fibre8
// weight9 eaten10 updated11 id12 user13
describe('updateFoodEntry: eaten_at is editable, preserved when omitted', () => {
  test('omitting eatenAt preserves the entry\'s existing value (even null)', async () => {
    await food.updateFoodEntry('fe1', 'u1', {
      mealSlot: 'lunch', foodRef: 'curated:white_rice', quantityG: 180,
      kcal: 234, proteinG: 5, carbsG: 50, fatG: 1,
    });
    expect(updateParams()[10]).toBeNull(); // the mock's existing row has eaten_at: null
  });

  test('an explicit value sets a real eaten time', async () => {
    const chosen = new Date('2026-07-10T19:00:00.000Z').getTime();
    await food.updateFoodEntry('fe1', 'u1', {
      mealSlot: 'lunch', foodRef: 'curated:white_rice', quantityG: 180,
      kcal: 234, proteinG: 5, carbsG: 50, fatG: 1, eatenAt: chosen,
    });
    expect(updateParams()[10]).toBe(chosen);
  });

  test('an explicit null clears a previously-set time back to untimed', async () => {
    mockDb.getFirstAsync = jest.fn(async (sql) => {
      if (/FROM food_entries WHERE id/.test(sql)) return { entry_date: '2026-07-10', eaten_at: 123456 };
      if (/FROM food_entries/.test(sql)) {
        return { kcal_total: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, entries_count: 0 };
      }
      return null;
    });
    await food.updateFoodEntry('fe1', 'u1', {
      mealSlot: 'lunch', foodRef: 'curated:white_rice', quantityG: 180,
      kcal: 234, proteinG: 5, carbsG: 50, fatG: 1, eatenAt: null,
    });
    expect(updateParams()[10]).toBeNull();
  });
});

describe('applyFoodEntryFromCloud: eaten_at round-trips, never defaulted to logged_at', () => {
  test('a cloud row with a real eaten_at applies it as ms', async () => {
    await food.applyFoodEntryFromCloud('u1', {
      id: 'fe-cloud', entry_date: '2026-07-10', meal_slot: 'lunch',
      food_ref: 'curated:white_rice', quantity_g: 180,
      kcal: 234, protein_g: 5, carbs_g: 50, fat_g: 1,
      logged_at: new Date('2026-07-10T12:00:00.000Z').toISOString(),
      eaten_at: new Date('2026-07-10T12:05:00.000Z').toISOString(),
    });
    const insertCall = runCalls.find((c) => /INSERT OR REPLACE INTO food_entries/.test(c.sql));
    expect(insertCall.params[12]).toBe(new Date('2026-07-10T12:05:00.000Z').getTime());
  });

  test('a cloud row with NO eaten_at (bulk-confirmed) applies NULL, never the logged_at fallback', async () => {
    await food.applyFoodEntryFromCloud('u1', {
      id: 'fe-cloud2', entry_date: '2026-07-10', meal_slot: 'lunch',
      food_ref: 'curated:white_rice', quantity_g: 180,
      kcal: 234, protein_g: 5, carbs_g: 50, fat_g: 1,
      logged_at: new Date('2026-07-10T12:00:00.000Z').toISOString(),
      // eaten_at intentionally omitted.
    });
    const insertCall = runCalls.find((c) => /INSERT OR REPLACE INTO food_entries/.test(c.sql));
    expect(insertCall.params[12]).toBeNull();
  });
});

describe('_foodEntryToCloud (sync push mapper): eaten_at maps to ISO or null', () => {
  test('a real eaten_at (ms) maps to an ISO string', () => {
    const ms = new Date('2026-07-10T08:15:00.000Z').getTime();
    const cloud = _foodEntryToCloud({ id: 'e1', eaten_at: ms }, 'u1');
    expect(cloud.eaten_at).toBe(new Date(ms).toISOString());
  });

  test('a null eaten_at (bulk-confirmed) maps to null, NOT defaulted to logged_at', () => {
    const loggedMs = new Date('2026-07-10T20:00:00.000Z').getTime();
    const cloud = _foodEntryToCloud({ id: 'e1', eaten_at: null, logged_at: loggedMs }, 'u1');
    expect(cloud.eaten_at).toBeNull();
  });

  test('an undefined eaten_at (pre-migration row read before backfill in a test double) maps to null', () => {
    const cloud = _foodEntryToCloud({ id: 'e1' }, 'u1');
    expect(cloud.eaten_at).toBeNull();
  });
});
