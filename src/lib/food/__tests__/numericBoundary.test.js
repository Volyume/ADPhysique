const runAsync = jest.fn(async () => true);
const getFirstAsync = jest.fn(async () => ({
  entry_date: '2026-07-10', meal_slot: 'lunch', food_ref: 'global:x',
  is_planned: 0, eaten_at: null,
}));
const mockDb = jest.fn(async () => ({ runAsync, getFirstAsync, getAllAsync: jest.fn(async () => []) }));

jest.mock('../../database', () => ({ db: (...args) => mockDb(...args) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(async () => {}) }));

const food = require('../db');

const validEntry = (override = {}) => ({
  entryDate: '2026-07-10', mealSlot: 'lunch', foodRef: 'global:x',
  quantityG: 100, kcal: 200, proteinG: 20, carbsG: 10, fatG: 5,
  ...override,
});

beforeEach(() => {
  jest.clearAllMocks();
  getFirstAsync.mockResolvedValue({
    entry_date: '2026-07-10', meal_slot: 'lunch', food_ref: 'global:x',
    is_planned: 0, eaten_at: null,
  });
});

describe('food create/edit domain shares a strict pre-SQLite numeric contract', () => {
  test.each([NaN, Infinity, -Infinity, Number.MAX_VALUE, 100001, -1, '200', '', null])(
    'creation rejects unsafe kcal %p before opening SQLite',
    async (kcal) => {
      await expect(food.logFoodEntry('u1', validEntry({ kcal }))).rejects.toThrow(/invalid food values/);
      expect(mockDb).not.toHaveBeenCalled();
      expect(runAsync).not.toHaveBeenCalled();
    },
  );

  test.each([NaN, Infinity, -Infinity, Number.MAX_VALUE, 5001, -1, '100', '', null])(
    'editing rejects unsafe quantity %p before binding',
    async (quantityG) => {
      await expect(food.updateFoodEntry('e1', 'u1', validEntry({ quantityG })))
        .rejects.toThrow(/invalid food values/);
      expect(mockDb).not.toHaveBeenCalled();
      expect(runAsync).not.toHaveBeenCalled();
    },
  );

  test.each([NaN, Infinity, -Infinity, Number.MAX_VALUE, -1, '1000', '', null, 20001])(
    'water rejects unsafe ml %p before opening SQLite',
    async (ml) => {
      await expect(food.setWater('u1', '2026-07-10', ml)).rejects.toThrow(/invalid hydration/);
      expect(mockDb).not.toHaveBeenCalled();
    },
  );

  test('an invalid or out-of-range Date epoch is rejected on edit', async () => {
    await expect(food.updateFoodEntry('e1', 'u1', validEntry({ eatenAt: 9e15 })))
      .rejects.toThrow(/invalid food values/);
    expect(mockDb).not.toHaveBeenCalled();
  });
});

describe('malformed cloud food rows are terminal skips, not sync poison', () => {
  const cloudEntry = (override = {}) => ({
    id: 'e1', meal_slot: 'lunch', food_ref: 'global:x', quantity_g: 100,
    kcal: 200, protein_g: 20, carbs_g: 10, fat_g: 5,
    logged_at: '2026-07-10T12:00:00Z', updated_at: '2026-07-10T12:00:00Z',
    ...override,
  });

  test.each([
    { kcal: NaN }, { quantity_g: Infinity }, { protein_g: Number.MAX_VALUE },
    { carbs_g: '10' }, { logged_at: 'not-a-date' }, { logged_at: '0' }, { updated_at: 9e15 },
    { meal_slot: {} },
  ])('skips malformed diary row %p without opening SQLite', async (bad) => {
    await expect(food.applyFoodEntryFromCloud('u1', cloudEntry(bad))).resolves.toBeNull();
    expect(mockDb).not.toHaveBeenCalled();
    expect(runAsync).not.toHaveBeenCalled();
  });

  test('skips malformed custom-food numeric fields', async () => {
    await expect(food.applyCustomFoodFromCloud('u1', {
      id: 'c1', name: 'Bad', serving_g: '50', kcal_100g: 100,
      protein_100g: 1, carbs_100g: 1, fat_100g: 1,
    })).resolves.toBe(false);
    expect(mockDb).not.toHaveBeenCalled();
  });

  test('skips malformed water and recipe rows without throwing into the pull loop', async () => {
    await expect(food.applyWaterFromCloud('u1', {
      entry_date: '2026-02-30', ml: 500, updated_at: '2026-07-10T12:00:00Z',
    })).resolves.toBe(false);
    await expect(food.applyRecipeFromCloud('u1', {
      id: 'r1', name: 'Recipe', servings: Infinity,
    })).resolves.toBe(false);
    expect(mockDb).not.toHaveBeenCalled();
  });
});
