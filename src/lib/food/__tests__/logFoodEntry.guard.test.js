/**
 * logFoodEntry.guard.test.js
 *
 * Two guards on the diary write:
 *
 *  1. Macro coercion. The four macro columns (kcal, protein_g, carbs_g, fat_g)
 *     are NOT NULL. A non-finite value (a NaN from a bad upstream calc) would
 *     bind as NULL and throw an opaque constraint error, crashing a diary write
 *     the user does many times a day. logFoodEntry coerces those to a finite
 *     number (default 0) so logging never hard-fails on the macros; fibre_g is
 *     nullable and keeps its null. Finite values pass through untouched.
 *
 *  2. Quantity safety bound (FOOD-001, defence in depth). The amount eaten must
 *     reconcile with the scaled macros, so a real food must fall inside the
 *     shared 1 to 5000 g bound (isValidEntryGrams). A negative, zero, blank,
 *     NaN or over-5000 g quantity is REJECTED (thrown) rather than persisted as
 *     a row whose grams and macros disagree. A quick-add carries no grams by
 *     design (foodRef 'quick:*', quantity 0), so 0 is allowed for it alone.
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
  test('NaN macros are coerced to 0, fibre to null (quantity valid)', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-06-07', mealSlot: 'lunch', foodRef: 'custom:x',
      quantityG: 80, kcal: NaN, proteinG: NaN, carbsG: NaN, fatG: NaN, fibreG: NaN,
    });
    const p = insertParams();
    expect(p).not.toBeNull();
    expect(p[5]).toBe(80); // quantity_g (valid, untouched)
    expect(p[6]).toBe(0); // kcal
    expect(p[7]).toBe(0); // protein_g
    expect(p[8]).toBe(0); // carbs_g
    expect(p[9]).toBe(0); // fat_g
    expect(p[10]).toBeNull(); // fibre_g (nullable)
  });

  test('undefined/null macros are coerced to 0, never bound as NULL on NOT NULL columns', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-06-07', mealSlot: 'lunch', foodRef: 'custom:x',
      quantityG: 80, kcal: null, proteinG: undefined, carbsG: null, fatG: undefined,
    });
    const p = insertParams();
    expect(p[5]).toBe(80);
    expect(p[6]).toBe(0);
    expect(p[7]).toBe(0);
    expect(p[8]).toBe(0);
    expect(p[9]).toBe(0);
  });

  test('finite values (including a legitimate 0 macro) pass through untouched', async () => {
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

// FOOD-001 defence in depth: no caller can persist an out-of-bound eaten
// quantity, so the diary can never hold a row whose grams and macros disagree.
describe('logFoodEntry quantity safety bound (FOOD-001)', () => {
  const base = { entryDate: '2026-06-07', mealSlot: 'lunch', foodRef: 'custom:x', kcal: 100, proteinG: 5, carbsG: 5, fatG: 2 };

  function noInsert() {
    return runCalls.filter((c) => /INSERT INTO food_entries/.test(c.sql)).length === 0;
  }

  test('rejects a negative quantity (-50 g), writing nothing', async () => {
    await expect(food.logFoodEntry('u1', { ...base, quantityG: -50 }))
      .rejects.toThrow(/between 1 and 5000 g/);
    expect(noInsert()).toBe(true);
  });

  test('rejects a zero quantity for a real food, writing nothing', async () => {
    await expect(food.logFoodEntry('u1', { ...base, quantityG: 0 }))
      .rejects.toThrow(/between 1 and 5000 g/);
    expect(noInsert()).toBe(true);
  });

  test('rejects a blank/NaN-derived quantity, writing nothing', async () => {
    // A blank field arrives as Number('') === 0; an absent field as undefined
    // (NaN). Both are junk grams and must not persist.
    await expect(food.logFoodEntry('u1', { ...base, quantityG: Number('') }))
      .rejects.toThrow(/between 1 and 5000 g/);
    await expect(food.logFoodEntry('u1', { ...base, quantityG: undefined }))
      .rejects.toThrow(/between 1 and 5000 g/);
    expect(noInsert()).toBe(true);
  });

  test('rejects an extreme quantity (6000 g > 5000 cap), writing nothing', async () => {
    await expect(food.logFoodEntry('u1', { ...base, quantityG: 6000 }))
      .rejects.toThrow(/between 1 and 5000 g/);
    expect(noInsert()).toBe(true);
  });

  test('accepts a valid quantity (150 g) and writes it', async () => {
    await food.logFoodEntry('u1', { ...base, quantityG: 150 });
    const p = insertParams();
    expect(p).not.toBeNull();
    expect(p[5]).toBe(150);
  });

  test('accepts the 5000 g boundary', async () => {
    await food.logFoodEntry('u1', { ...base, quantityG: 5000 });
    expect(insertParams()[5]).toBe(5000);
  });

  test('a quick-add legitimately carries quantity 0 (no grams) and is allowed', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-06-07', mealSlot: 'lunch', foodRef: 'quick:adhoc',
      quantityG: 0, kcal: 250, proteinG: 10, carbsG: 30, fatG: 8,
    });
    expect(insertParams()[5]).toBe(0);
  });

  test('a quick-add with a negative quantity is still rejected', async () => {
    await expect(food.logFoodEntry('u1', {
      entryDate: '2026-06-07', mealSlot: 'lunch', foodRef: 'quick:adhoc',
      quantityG: -1, kcal: 250, proteinG: 10, carbsG: 30, fatG: 8,
    })).rejects.toThrow(/quick-add quantity/);
    expect(noInsert()).toBe(true);
  });
});

// is_planned is param index 12 (after logged_at at 11). Plan scaffolding is
// written planned; everything else (manual logging) defaults to an actual.
describe('logFoodEntry is_planned flag (adherence model)', () => {
  test('defaults to 0 (an actual) when isPlanned is not passed', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-06-07', mealSlot: 'lunch', foodRef: 'custom:x',
      quantityG: 100, kcal: 200, proteinG: 20, carbsG: 10, fatG: 5,
    });
    expect(insertParams()[12]).toBe(0);
  });

  test('writes 1 (planned scaffolding) when isPlanned is true', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-06-07', mealSlot: 'lunch', foodRef: 'custom:x',
      quantityG: 100, kcal: 200, proteinG: 20, carbsG: 10, fatG: 5, isPlanned: true,
    });
    expect(insertParams()[12]).toBe(1);
  });
});
