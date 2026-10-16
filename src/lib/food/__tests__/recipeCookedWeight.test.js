/**
 * recipeCookedWeight.test.js (food audit 2026-10-16, founder ruling "Add
 * cooked weight").
 *
 * What this suite pins, and why:
 *  - A recipe's ingredients are weighed raw. Grams eaten of the cooked dish
 *    used to be priced against the RAW total, so 300 g of a chilli that cooked
 *    down from 1,500 g to 1,000 g read as a fifth of the pot instead of
 *    nearly a third. With a cooked weight, the per-100 g figures and the
 *    serving are measured against the cooked dish.
 *  - Without a cooked weight a recipe is `servings_only`: its figures stay on
 *    the raw basis (so every entry already logged reads the same) and the
 *    add sheets offer servings and never grams.
 *  - The cooked weight is bounded (1 to 50,000 g, whole grams); blank is
 *    "none"; a typed value that cannot be used is refused, never dropped.
 * Runs the REAL helpers. Written to fail on the pre-ruling code.
 */
const { recipeFoodShape } = require('../sources/localCache');
const { parseCookedWeight, normaliseCookedWeight, MAX_COOKED_WEIGHT_G } = require('../recipeWeight');
const { buildServingUnits, initialServingState, isServingsOnly } = require('../servingEntry');

jest.mock('../../database', () => ({ db: jest.fn() }));

// A pot of chilli: 1,500 g raw, 2,400 kcal, 4 servings.
const TOTALS = { kcal: 2400, protein: 180, carbs: 200, fat: 90, fibre: 40, grams: 1500 };

describe('recipeFoodShape', () => {
  test('with a cooked weight, the per-100 g figures and the serving are of the cooked dish', () => {
    const food = recipeFoodShape('recipe:r1', { name: 'Chilli', total_servings: 4, cooked_weight_g: 1000 }, TOTALS);
    expect(food.servings_only).toBe(false);
    expect(food.kcal_100g).toBe(240);
    expect(food.protein_100g).toBe(18);
    expect(food.serving_g).toBe(250);
    // 300 g of the cooked dish is 720 kcal, not the raw basis's 480.
    expect(Math.round(food.kcal_100g * 3)).toBe(720);
  });

  test('a serving is the same energy either way: a quarter of the pot', () => {
    const raw = recipeFoodShape('recipe:r1', { name: 'Chilli', total_servings: 4 }, TOTALS);
    const cooked = recipeFoodShape('recipe:r1', { name: 'Chilli', total_servings: 4, cooked_weight_g: 1000 }, TOTALS);
    const servingKcal = (f) => Math.round((f.kcal_100g * f.serving_g) / 100);
    expect(servingKcal(raw)).toBe(600);
    expect(servingKcal(cooked)).toBe(600);
  });

  test('without a cooked weight the raw basis is unchanged and the food is servings only', () => {
    const food = recipeFoodShape('recipe:r1', { name: 'Chilli', total_servings: 4, cooked_weight_g: null }, TOTALS);
    expect(food).toMatchObject({ servings_only: true, kcal_100g: 160, serving_g: 375, serving_label: 'serving', source: 'recipe' });
  });

  test('a stored cooked weight out of range is treated as none', () => {
    for (const bad of [0, -5, 'junk', MAX_COOKED_WEIGHT_G + 1]) {
      expect(recipeFoodShape('recipe:r1', { name: 'C', total_servings: 4, cooked_weight_g: bad }, TOTALS).servings_only).toBe(true);
    }
  });
});

describe('the cooked weight value', () => {
  test('blank is none; a number reads in whole grams; a comma decimal reads as meant', () => {
    expect(parseCookedWeight('')).toBeNull();
    expect(parseCookedWeight('   ')).toBeNull();
    expect(parseCookedWeight('1000')).toBe(1000);
    expect(parseCookedWeight('987,6')).toBe(988);
  });
  test('a value that cannot be used is undefined, so the builder says so', () => {
    expect(parseCookedWeight('abc')).toBeUndefined();
    expect(parseCookedWeight('0')).toBeUndefined();
    expect(parseCookedWeight('60000')).toBeUndefined();
  });
  test('normaliseCookedWeight bounds a stored value', () => {
    expect(normaliseCookedWeight(null)).toBeNull();
    expect(normaliseCookedWeight(50000)).toBe(50000);
    expect(normaliseCookedWeight(50001)).toBeNull();
    expect(normaliseCookedWeight('750.4')).toBe(750);
  });
});

describe('a servings-only recipe in the add sheet', () => {
  const food = { servings_only: true, serving_g: 375, serving_label: 'serving' };

  test('has the one serving unit and no grams', () => {
    expect(isServingsOnly(food)).toBe(true);
    expect(buildServingUnits(food).map((u) => u.key)).toEqual(['serving']);
  });

  test('opens at one serving, or at the known amount in servings', () => {
    expect(initialServingState(food, 'add', null)).toEqual({ unitKey: 'serving', amount: '1' });
    expect(initialServingState(food, 'add', 562.5)).toEqual({ unitKey: 'serving', amount: '1.5' });
  });

  test('an older entry not on a tenth of a serving reopens close enough to write its grams back', () => {
    const { amount } = initialServingState(food, 'edit', 300);
    expect(Math.abs(Number(amount) * 375 - 300)).toBeLessThan(0.5);
  });

  test('a recipe with a cooked weight keeps grams', () => {
    expect(buildServingUnits({ servings_only: false, serving_g: 250 }).map((u) => u.key)).toEqual(['serving', 'g']);
  });
});

// Review findings 2 and 3 (2026-10-16): an entry logged before a cooked weight
// was added must keep reading truly; grams never show for a servings-only one.
describe('a logged recipe entry', () => {
  const { recipeEntryPortion, recipeServingGOnEntryBasis } = require('../recipeWeight');
  const raw = recipeFoodShape('recipe:r1', { name: 'Chilli', total_servings: 4 }, TOTALS);
  const cooked = recipeFoodShape('recipe:r1', { name: 'Chilli', total_servings: 4, cooked_weight_g: 1000 }, TOTALS);

  test('servings only: reads in servings from its energy', () => {
    expect(recipeEntryPortion({ quantity_g: 562.5, kcal: 900 }, raw)).toBe('1.5 servings');
  });
  test('cooked weight, logged on the cooked basis: grams are true (null)', () => {
    expect(recipeEntryPortion({ quantity_g: 300, kcal: 720 }, cooked)).toBeNull();
  });
  test('cooked weight added after a raw-basis entry: it reads as its servings', () => {
    expect(recipeEntryPortion({ quantity_g: 375, kcal: 600 }, cooked)).toBe('1 serving');
  });
  test('the edit sheet restates one serving on the entry basis', () => {
    expect(recipeServingGOnEntryBasis({ quantity_g: 375, kcal: 600 }, cooked)).toBe(375);
    expect(recipeServingGOnEntryBasis({ quantity_g: 250, kcal: 600 }, cooked)).toBe(250);
    expect(recipeServingGOnEntryBasis({ quantity_g: 1, kcal: 1 }, { source: 'custom' })).toBeNull();
  });
});

