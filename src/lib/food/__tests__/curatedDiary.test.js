/**
 * curatedDiary.test.js
 *
 * Logging a curated suggestion meal into the diary, plus the
 * distinct-slot read that sizes a suggestion to one meal's share.
 *
 * Same harness as savedMeals.test.js: the food layer has no shared
 * SQLite (expo-sqlite isn't available under node), so db() is mocked
 * and we assert the SQL + params each helper issues. applyCuratedMeal
 * resolves the meal from the curated library (foods + grams, macros
 * computed) and fans its items into food_entries.
 */
const mockState = { loggedSlotRows: [] };
const runCalls = [];

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
    getFirstAsync: jest.fn(async (sql) => {
      if (/FROM food_entries/.test(sql)) {
        // recomputeRollup's SUM query inside logFoodEntry
        return { kcal_total: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, entries_count: 0 };
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql) => {
      if (/DISTINCT meal_slot/.test(sql)) return mockState.loggedSlotRows;
      return [];
    }),
  };
}

let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../db');
const { CURATED_MEALS, mealItems } = require('../curatedMeals');
const { resolveFoodRef } = require('../sources/localCache');
const { CURATED_FOODS } = require('../curatedFoods');

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  mockState.loggedSlotRows = [];
  mockDb = makeDb();
});

describe('applyCuratedMealToDiary', () => {
  test('fans every component into food_entries at the chosen slot/date', async () => {
    const meal = CURATED_MEALS[0];
    const expected = mealItems(meal).length;
    const n = await food.applyCuratedMealToDiary('u1', meal.id, { mealSlot: 'breakfast', entryDate: '2026-05-29' });
    expect(n).toBe(expected);
    const inserts = runCalls.filter(c => /INSERT INTO food_entries/.test(c.sql));
    expect(inserts).toHaveLength(expected);
    // logFoodEntry params: id,user,entry_date,meal_slot,food_ref,quantity_g,...
    expect(inserts[0].params[2]).toBe('2026-05-29');
    expect(inserts[0].params[3]).toBe('breakfast');
    expect(inserts[0].params[4]).toMatch(/^curated:/);
    expect(inserts[0].params[5]).toBeGreaterThan(0);
  });

  test('returns 0 for an unknown meal id (no writes)', async () => {
    const n = await food.applyCuratedMealToDiary('u1', 'curated_does_not_exist', { mealSlot: 'lunch', entryDate: '2026-05-29' });
    expect(n).toBe(0);
    expect(runCalls.filter(c => /INSERT INTO food_entries/.test(c.sql))).toHaveLength(0);
  });

  test('requires mealSlot and entryDate', async () => {
    await expect(food.applyCuratedMealToDiary('u1', CURATED_MEALS[0].id, {})).rejects.toThrow(/mealSlot and entryDate/);
  });
});

describe('resolveFoodRef for curated items (the "Food" label fix)', () => {
  test('resolves a curated ref to the real food name and macros', async () => {
    const row = await resolveFoodRef('u1', 'curated:oats');
    expect(row).not.toBeNull();
    expect(row.name).toBe(CURATED_FOODS.oats.name);
    expect(row.source).toBe('curated');
    expect(row.kcal_100g).toBe(CURATED_FOODS.oats.kcal);
    expect(row.protein_100g).toBe(CURATED_FOODS.oats.protein);
  });

  test('every component of every curated meal resolves to a name (no "Food" fallthrough)', async () => {
    for (const meal of CURATED_MEALS) {
      for (const it of mealItems(meal)) {
        const row = await resolveFoodRef('u1', it.foodRef);
        expect(row && row.name).toBeTruthy();
      }
    }
  });

  test('returns null for an unknown curated key', async () => {
    expect(await resolveFoodRef('u1', 'curated:not_a_real_food')).toBeNull();
  });
});

describe('getLoggedMealSlotsForDay', () => {
  test('returns the distinct slots already logged that day', async () => {
    mockState.loggedSlotRows = [{ meal_slot: 'breakfast' }, { meal_slot: 'lunch' }];
    const slots = await food.getLoggedMealSlotsForDay('u1', '2026-05-29');
    expect(slots).toEqual(['breakfast', 'lunch']);
    expect(runCalls).toHaveLength(0); // a read, no writes
  });

  test('empty when nothing logged', async () => {
    const slots = await food.getLoggedMealSlotsForDay('u1', '2026-05-29');
    expect(slots).toEqual([]);
  });
});
