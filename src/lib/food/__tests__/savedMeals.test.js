/**
 * savedMeals.test.js
 *
 * Local CRUD + apply-to-diary for the My Meals feature (GAP row 1).
 *
 * The food layer has no shared SQLite harness (expo-sqlite isn't
 * available under node), so these tests mock `db()` from ../database
 * and assert the SQL + params each helper issues, plus the parse /
 * totals logic and the apply-to-diary fan-out into food_entries.
 *
 * Why this matters: a saved meal stores its foods inline in items_json.
 * The column name and the apply path are the contract the sync
 * serialiser (_savedMealToCloud) and the cloud RPC depend on; a drift
 * here silently loses meal contents (the very bug this feature exposed).
 */

// db() routes reads by SQL substring so the same fake serves
// listSavedMeals, getSavedMeal, and the rollup recompute inside
// logFoodEntry. runAsync records every write for assertion.
const mockState = { savedMealRow: null, savedMealRows: [] };
const runCalls = [];

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
    getFirstAsync: jest.fn(async (sql) => {
      if (/FROM saved_meals/.test(sql)) return mockState.savedMealRow;
      if (/FROM food_entries/.test(sql)) {
        // recomputeRollup's SUM query
        return { kcal_total: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, entries_count: 0 };
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql) => {
      if (/FROM saved_meals/.test(sql)) return mockState.savedMealRows;
      return [];
    }),
  };
}

let mockDb;
jest.mock('../../database', () => ({
  db: jest.fn(async () => mockDb),
}));

jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../db');
const { resolveFoodRef } = require('../sources/localCache');

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  mockState.savedMealRow = null;
  mockState.savedMealRows = [];
  mockDb = makeDb();
});

const ITEMS = [
  { foodRef: 'off:1', name: 'Oats', quantityG: 80, kcal: 300, proteinG: 11, carbsG: 50, fatG: 6, fibreG: 8 },
  { foodRef: 'off:2', name: 'Milk', quantityG: 200, kcal: 100, proteinG: 7, carbsG: 10, fatG: 4 },
];

describe('computeSavedMealTotals', () => {
  test('sums per-item macros, tolerant of missing fields', () => {
    expect(food.computeSavedMealTotals(ITEMS)).toEqual({ kcal: 400, protein: 18, carbs: 60, fat: 10 });
  });
  test('empty / nullish items give zeroes', () => {
    expect(food.computeSavedMealTotals([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    expect(food.computeSavedMealTotals(null)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('createSavedMeal', () => {
  test('inserts into items_json (not foods_json) with a serialised array', async () => {
    const id = await food.createSavedMeal('u1', { name: '  Breakfast  ', items: ITEMS });
    expect(typeof id).toBe('string');
    const insert = runCalls.find(c => /INSERT INTO saved_meals/.test(c.sql));
    expect(insert).toBeTruthy();
    expect(insert.sql).toMatch(/items_json/);
    expect(insert.sql).not.toMatch(/foods_json|slot/);
    // params: [id, userId, name(trimmed), itemsJson, created, updated]
    expect(insert.params[1]).toBe('u1');
    expect(insert.params[2]).toBe('Breakfast');
    expect(JSON.parse(insert.params[3])).toHaveLength(2);
  });

  test('rejects a blank name', async () => {
    await expect(food.createSavedMeal('u1', { name: '   ', items: ITEMS })).rejects.toThrow(/name is required/);
  });

  test('rejects an empty item list', async () => {
    await expect(food.createSavedMeal('u1', { name: 'x', items: [] })).rejects.toThrow(/at least one item/);
  });
});

describe('listSavedMeals / getSavedMeal', () => {
  test('list parses items_json and attaches totals + itemCount', async () => {
    mockState.savedMealRows = [
      { id: 'sm-1', name: 'Breakfast', items_json: JSON.stringify(ITEMS), created_at: 1, updated_at: 2 },
    ];
    const meals = await food.listSavedMeals('u1');
    expect(meals).toHaveLength(1);
    expect(meals[0].itemCount).toBe(2);
    expect(meals[0].totals).toEqual({ kcal: 400, protein: 18, carbs: 60, fat: 10 });
    expect(meals[0].items[0].foodRef).toBe('off:1');
  });

  test('list tolerates a corrupt items_json (empty items, no throw)', async () => {
    mockState.savedMealRows = [
      { id: 'sm-bad', name: 'Corrupt', items_json: '{not json', created_at: 1, updated_at: 2 },
    ];
    const meals = await food.listSavedMeals('u1');
    expect(meals[0].items).toEqual([]);
    expect(meals[0].itemCount).toBe(0);
  });

  test('getSavedMeal returns null when missing', async () => {
    mockState.savedMealRow = null;
    expect(await food.getSavedMeal('u1', 'nope')).toBeNull();
  });
});

describe('renameSavedMeal', () => {
  test('updates name + updated_at, scoped to live rows', async () => {
    await food.renameSavedMeal('u1', 'sm-1', '  Lunch ');
    const upd = runCalls.find(c => /UPDATE saved_meals SET name/.test(c.sql));
    expect(upd).toBeTruthy();
    expect(upd.sql).toMatch(/deleted_at IS NULL/);
    expect(upd.params[0]).toBe('Lunch');
  });
  test('rejects a blank name', async () => {
    await expect(food.renameSavedMeal('u1', 'sm-1', '  ')).rejects.toThrow(/cannot be blank/);
  });
});

describe('deleteSavedMeal', () => {
  test('soft-deletes (sets deleted_at + updated_at)', async () => {
    await food.deleteSavedMeal('u1', 'sm-1');
    const del = runCalls.find(c => /UPDATE saved_meals SET deleted_at/.test(c.sql));
    expect(del).toBeTruthy();
    expect(del.params.slice(-2)).toEqual(['sm-1', 'u1']);
  });
});

describe('applySavedMealToDiary', () => {
  test('logs every valid item as a food_entries row at the chosen slot/date, returning its id', async () => {
    mockState.savedMealRow = { id: 'sm-1', name: 'Breakfast', items_json: JSON.stringify(ITEMS), created_at: 1, updated_at: 2 };
    const { logged, entryIds } = await food.applySavedMealToDiary('u1', 'sm-1', { mealSlot: 'breakfast', entryDate: '2026-05-29' });
    expect(logged).toBe(2);
    expect(entryIds).toHaveLength(2);
    entryIds.forEach((eid) => expect(typeof eid).toBe('string'));
    const inserts = runCalls.filter(c => /INSERT INTO food_entries/.test(c.sql));
    expect(inserts).toHaveLength(2);
    // logFoodEntry params order: id,user,entry_date,meal_slot,food_ref,quantity_g,...
    expect(inserts[0].params[0]).toBe(entryIds[0]);
    expect(inserts[1].params[0]).toBe(entryIds[1]);
    expect(inserts[0].params[2]).toBe('2026-05-29');
    expect(inserts[0].params[3]).toBe('breakfast');
    expect(inserts[0].params[4]).toBe('off:1');
    expect(inserts[0].params[5]).toBe(80);
  });

  test('skips items with no foodRef or non-positive quantity', async () => {
    const dirty = [
      { foodRef: 'off:1', quantityG: 100, kcal: 1, proteinG: 1, carbsG: 1, fatG: 1 },
      { foodRef: '', quantityG: 100 },          // no ref
      { foodRef: 'off:2', quantityG: 0 },        // zero qty
    ];
    mockState.savedMealRow = { id: 'sm-2', name: 'Mixed', items_json: JSON.stringify(dirty), created_at: 1, updated_at: 2 };
    const { logged, entryIds } = await food.applySavedMealToDiary('u1', 'sm-2', { mealSlot: 'lunch', entryDate: '2026-05-29' });
    expect(logged).toBe(1);
    expect(entryIds).toHaveLength(1);
  });

  test('returns an empty result when the meal is missing', async () => {
    mockState.savedMealRow = null;
    const { logged, entryIds } = await food.applySavedMealToDiary('u1', 'gone', { mealSlot: 'lunch', entryDate: '2026-05-29' });
    expect(logged).toBe(0);
    expect(entryIds).toEqual([]);
  });

  test('requires mealSlot and entryDate', async () => {
    await expect(food.applySavedMealToDiary('u1', 'sm-1', {})).rejects.toThrow(/mealSlot and entryDate/);
  });
});

describe('applySavedMealToDiary writes a meal-level food_slot_recents row (T1: joins the "Add again" pool)', () => {
  function slotRecentInserts() {
    return runCalls.filter(c => /INSERT INTO food_slot_recents/.test(c.sql));
  }

  test('upserts exactly ONE row keyed "meal:<id>", not one per item', async () => {
    mockState.savedMealRow = { id: 'sm-1', name: 'Breakfast', items_json: JSON.stringify(ITEMS), created_at: 1, updated_at: 2 };
    await food.applySavedMealToDiary('u1', 'sm-1', { mealSlot: 'breakfast', entryDate: '2026-05-29' });
    const rows = slotRecentInserts();
    expect(rows).toHaveLength(1);
    // params: user0 slot1 ref2 lastLoggedAt3 quantity4 (see slotRecents.test.js)
    expect(rows[0].params[0]).toBe('u1');
    expect(rows[0].params[1]).toBe('breakfast');
    expect(rows[0].params[2]).toBe('meal:sm-1');
  });

  test('writes nothing when every item was skipped (nothing was actually logged)', async () => {
    const dirty = [{ foodRef: '', quantityG: 100 }, { foodRef: 'off:2', quantityG: 0 }];
    mockState.savedMealRow = { id: 'sm-empty', name: 'Empty', items_json: JSON.stringify(dirty), created_at: 1, updated_at: 2 };
    await food.applySavedMealToDiary('u1', 'sm-empty', { mealSlot: 'lunch', entryDate: '2026-05-29' });
    expect(slotRecentInserts()).toHaveLength(0);
  });

  test('writes nothing when the meal is missing', async () => {
    mockState.savedMealRow = null;
    await food.applySavedMealToDiary('u1', 'gone', { mealSlot: 'lunch', entryDate: '2026-05-29' });
    expect(slotRecentInserts()).toHaveLength(0);
  });
});

describe('resolveSlotRecentRef (T1: the "Add again" resolver a saved meal needs)', () => {
  test('resolves a saved meal\'s synthetic ref into a display shape carrying its totals as "one serving"', async () => {
    mockState.savedMealRow = { id: 'sm-1', name: 'Go-to dinner', items_json: JSON.stringify(ITEMS), created_at: 1, updated_at: 2 };
    const row = await food.resolveSlotRecentRef('u1', 'meal:sm-1');
    expect(row).toEqual({
      food_ref: 'meal:sm-1',
      savedMealId: 'sm-1',
      itemCount: 2,
      name: 'Go-to dinner',
      source: null,
      brand: null,
      serving_g: null,
      serving_label: '2 foods',
      kcal_100g: 400,
      protein_100g: 18,
      carbs_100g: 60,
      fat_100g: 10,
    });
  });

  test('a single-item meal reads "1 food", not "1 foods"', async () => {
    mockState.savedMealRow = { id: 'sm-solo', name: 'Solo', items_json: JSON.stringify([ITEMS[0]]), created_at: 1, updated_at: 2 };
    const row = await food.resolveSlotRecentRef('u1', 'meal:sm-solo');
    expect(row.serving_label).toBe('1 food');
  });

  test('returns null for a missing/deleted meal id (the caller drops it, same as an unresolvable food ref)', async () => {
    mockState.savedMealRow = null;
    expect(await food.resolveSlotRecentRef('u1', 'meal:gone')).toBeNull();
  });

  test('delegates every non-meal ref to resolveFoodRef unchanged, so single-food and recipe resolution are untouched', async () => {
    const direct = await resolveFoodRef('u1', 'curated:oats');
    const viaResolver = await food.resolveSlotRecentRef('u1', 'curated:oats');
    expect(direct).not.toBeNull();
    expect(viaResolver).toEqual(direct);
  });
});
