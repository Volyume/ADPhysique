/**
 * recipeLogging.test.js
 *
 * Logging a recipe to the diary as one line, the fix for the build-only
 * dead-end. Two layers under test:
 *   - resolveFoodRef('recipe:<id>') sums the recipe's ingredients into a
 *     per-100g profile (name, serving_g per serving, per-100g macros) so
 *     the diary shows one named row that rescales on edit.
 *   - applyRecipeToDiary scales that profile by servings eaten and writes
 *     a single food_entries row with a 'recipe:<id>' ref.
 *
 * db() is mocked (expo-sqlite is unavailable under node); we assert the
 * resolved profile and the INSERT the helper issues.
 */
const runCalls = [];

// Two staple foods (per 100g) and one recipe of 2 servings.
const FOODS = {
  f1: { name: 'Chicken breast', kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6, fibre_100g: 0 },
  f2: { name: 'White rice', kcal_100g: 130, protein_100g: 2.7, carbs_100g: 28, fat_100g: 0.3, fibre_100g: 0.4 },
};
const RECIPE = { name: 'Chicken and rice', total_servings: 2 };
const INGREDIENTS = [
  { food_ref: 'global:f1', quantity_g: 200 },
  { food_ref: 'global:f2', quantity_g: 300 },
];

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
    getFirstAsync: jest.fn(async (sql, params) => {
      if (/FROM recipes/.test(sql)) {
        return params[0] === 'r1' ? RECIPE : null;
      }
      if (/FROM foods WHERE id/.test(sql)) {
        const f = FOODS[params[0]];
        return f ? { food_ref: `global:${params[0]}`, source: 'global', brand: null, serving_g: 100, serving_label: null, ...f } : null;
      }
      if (/FROM custom_foods/.test(sql)) return null;
      if (/FROM food_entries/.test(sql)) {
        return { kcal_total: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, entries_count: 0 };
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql, params) => {
      if (/FROM recipe_ingredients/.test(sql)) {
        return params[0] === 'r1' ? INGREDIENTS : [];
      }
      return [];
    }),
    withTransactionAsync: jest.fn(async (fn) => fn()),
  };
}

let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const { resolveFoodRef } = require('../sources/localCache');
const food = require('../db');

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  mockDb = makeDb();
});

describe('resolveFoodRef for a recipe', () => {
  test('sums ingredients into a named per-100g profile with a per-serving size', async () => {
    const row = await resolveFoodRef('u1', 'recipe:r1');
    // Totals: 720 kcal over 500 g, 2 servings -> 250 g per serving, 144 kcal/100g.
    expect(row).not.toBeNull();
    expect(row.name).toBe('Chicken and rice');
    expect(row.source).toBe('recipe');
    expect(row.serving_g).toBe(250);
    expect(row.serving_label).toBe('serving');
    expect(row.kcal_100g).toBe(144);
    expect(row.protein_100g).toBeCloseTo(14.0, 1);
    expect(row.carbs_100g).toBeCloseTo(16.8, 1);
  });

  test('returns null for an unknown recipe id', async () => {
    expect(await resolveFoodRef('u1', 'recipe:nope')).toBeNull();
  });
});

describe('applyRecipeToDiary', () => {
  function inserts() {
    return runCalls.filter(c => /INSERT INTO food_entries/.test(c.sql));
  }

  test('logs one diary line scaled to one serving', async () => {
    const id = await food.applyRecipeToDiary('u1', 'r1', { mealSlot: 'dinner', entryDate: '2026-05-29', servings: 1 });
    expect(id).toBeTruthy();
    const rows = inserts();
    expect(rows).toHaveLength(1);
    // params: id,user,entry_date,meal_slot,food_ref,quantity_g,kcal,protein_g,...
    expect(rows[0].params[3]).toBe('dinner');
    expect(rows[0].params[4]).toBe('recipe:r1');
    expect(rows[0].params[5]).toBe(250);   // one serving = 250 g
    expect(rows[0].params[6]).toBe(360);   // 720 kcal / 2 servings
  });

  test('scales to the servings eaten', async () => {
    await food.applyRecipeToDiary('u1', 'r1', { mealSlot: 'lunch', entryDate: '2026-05-29', servings: 2 });
    const rows = inserts();
    expect(rows).toHaveLength(1);
    expect(rows[0].params[5]).toBe(500);   // two servings = whole recipe
    expect(rows[0].params[6]).toBe(720);
  });

  test('returns null and writes nothing for an unknown recipe', async () => {
    const id = await food.applyRecipeToDiary('u1', 'nope', { mealSlot: 'lunch', entryDate: '2026-05-29' });
    expect(id).toBeNull();
    expect(inserts()).toHaveLength(0);
  });

  test('returns null for a non-positive serving count', async () => {
    expect(await food.applyRecipeToDiary('u1', 'r1', { mealSlot: 'lunch', entryDate: '2026-05-29', servings: 0 })).toBeNull();
    expect(inserts()).toHaveLength(0);
  });

  test('requires mealSlot and entryDate', async () => {
    await expect(food.applyRecipeToDiary('u1', 'r1', {})).rejects.toThrow(/mealSlot and entryDate/);
  });
});

describe('applyRecipeToDiary writes a food_slot_recents row (T1: joins the "Add again" pool)', () => {
  function slotRecentInserts() {
    return runCalls.filter(c => /INSERT INTO food_slot_recents/.test(c.sql));
  }

  test('upserts one row keyed "recipe:<id>" at the logged gram amount, so a re-logged recipe can rank in Recents', async () => {
    await food.applyRecipeToDiary('u1', 'r1', { mealSlot: 'dinner', entryDate: '2026-05-29', servings: 1 });
    const rows = slotRecentInserts();
    expect(rows).toHaveLength(1);
    // params: user0 slot1 ref2 lastLoggedAt3 quantity4 (see slotRecents.test.js)
    expect(rows[0].params[0]).toBe('u1');
    expect(rows[0].params[1]).toBe('dinner');
    expect(rows[0].params[2]).toBe('recipe:r1');
    expect(rows[0].params[4]).toBe(250); // one serving = 250 g, matching the food_entries row
  });

  test('writes nothing when the recipe is unknown (nothing was logged)', async () => {
    await food.applyRecipeToDiary('u1', 'nope', { mealSlot: 'lunch', entryDate: '2026-05-29' });
    expect(slotRecentInserts()).toHaveLength(0);
  });
});
