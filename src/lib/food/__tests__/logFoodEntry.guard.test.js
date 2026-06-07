/**
 * logFoodEntry.guard.test.js
 *
 * The five numeric food columns (quantity_g, kcal, protein_g, carbs_g,
 * fat_g) are NOT NULL. A non-finite value (a NaN from a bad upstream calc)
 * would bind as NULL and throw an opaque constraint error, crashing a diary
 * write the user does many times a day. logFoodEntry coerces those to a
 * finite number (default 0) so logging never hard-fails; fibre_g is nullable
 * and keeps its null. Finite values must pass through untouched.
 *
 * Same db() mock harness as curatedDiary.test.js / savedMeals.test.js.
 */
const runCalls = [];

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
    getFirstAsync: jest.fn(async (sql) => {
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

function insertParams() {
  const insert = runCalls.find(c => /INSERT INTO food_entries/.test(c.sql));
  return insert ? insert.params : null;
}

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  mockDb = makeDb();
});

// params index: id0 user1 date2 slot3 ref4 qty5 kcal6 pro7 carb8 fat9 fibre10
describe('logFoodEntry numeric coercion', () => {
  test('NaN macros are coerced to 0, fibre to null', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-06-07', mealSlot: 'lunch', foodRef: 'custom:x',
      quantityG: NaN, kcal: NaN, proteinG: NaN, carbsG: NaN, fatG: NaN, fibreG: NaN,
    });
    const p = insertParams();
    expect(p).not.toBeNull();
    expect(p[5]).toBe(0); // quantity_g
    expect(p[6]).toBe(0); // kcal
    expect(p[7]).toBe(0); // protein_g
    expect(p[8]).toBe(0); // carbs_g
    expect(p[9]).toBe(0); // fat_g
    expect(p[10]).toBeNull(); // fibre_g (nullable)
  });

  test('undefined/null numerics are coerced to 0, never bound as NULL on NOT NULL columns', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-06-07', mealSlot: 'lunch', foodRef: 'custom:x',
      quantityG: undefined, kcal: null, proteinG: undefined, carbsG: null, fatG: undefined,
    });
    const p = insertParams();
    expect(p[5]).toBe(0);
    expect(p[6]).toBe(0);
    expect(p[7]).toBe(0);
    expect(p[8]).toBe(0);
    expect(p[9]).toBe(0);
  });

  test('finite values (including a legitimate 0) pass through untouched', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-06-07', mealSlot: 'breakfast', foodRef: 'global:oats',
      quantityG: 80, kcal: 304, proteinG: 11, carbsG: 0, fatG: 5.4, fibreG: 7.2,
    });
    const p = insertParams();
    expect(p[5]).toBe(80);
    expect(p[6]).toBe(304);
    expect(p[7]).toBe(11);
    expect(p[8]).toBe(0); // a real zero is preserved, not treated as missing
    expect(p[9]).toBe(5.4);
    expect(p[10]).toBe(7.2);
  });
});
