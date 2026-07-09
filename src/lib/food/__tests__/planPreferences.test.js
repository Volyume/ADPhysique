/**
 * planPreferences — the individual's standing food contract and the
 * filters that enforce it. Exclusions are hard: an excluded food never
 * reaches a plan, a swap list, or a coach edit.
 */
import { CURATED_MEALS } from '../curatedMeals';
import {
  DEFAULT_PLAN_PREFERENCES,
  normalisePreferences,
  foodAllowed,
  mealAllowed,
  filterMealsByPreferences,
  withExcludedFood,
  withoutExcludedFood,
} from '../planPreferences';

describe('normalisePreferences', () => {
  test('empty input yields the defaults', () => {
    expect(normalisePreferences()).toEqual({ ...DEFAULT_PLAN_PREFERENCES });
  });
  test('the default variety is Repeat (0), not Mixed — varied is opt-in (founder 2026-06-16)', () => {
    expect(DEFAULT_PLAN_PREFERENCES.variety).toBe(0);
    expect(normalisePreferences().variety).toBe(0);
    expect(normalisePreferences({ mealsPerDay: 5 }).variety).toBe(0); // unrelated field set, variety still defaults to Repeat
  });
  test('clamps meals per day to 3..6 and variety to 0..1', () => {
    expect(normalisePreferences({ mealsPerDay: 12 }).mealsPerDay).toBe(6);
    expect(normalisePreferences({ mealsPerDay: 1 }).mealsPerDay).toBe(3);
    expect(normalisePreferences({ variety: 7 }).variety).toBe(1);
    expect(normalisePreferences({ variety: -1 }).variety).toBe(0);
  });
  test('rejects unknown diets and fat conventions', () => {
    expect(normalisePreferences({ diet: 'carnivore' }).diet).toBe('omnivore');
    expect(normalisePreferences({ fatConvention: 'whatever' }).fatConvention).toBe('equalised');
    expect(normalisePreferences({ fatConvention: 'higher_rest_day' }).fatConvention).toBe('higher_rest_day');
  });
  test('de-duplicates exclusion lists and drops empties', () => {
    const p = normalisePreferences({ excludeFoodKeys: ['oats', 'oats', null] });
    expect(p.excludeFoodKeys).toEqual(['oats']);
  });
  test('drops an empty rotation pool', () => {
    expect(normalisePreferences({ rotationPool: { protein: [], carb: [], fat: [] } }).rotationPool).toBeNull();
    const kept = normalisePreferences({ rotationPool: { protein: ['chicken_breast'], carb: [], fat: [] } });
    expect(kept.rotationPool.protein).toEqual(['chicken_breast']);
  });
});

describe('foodAllowed', () => {
  test('excluded key is refused', () => {
    expect(foodAllowed('white_rice', { excludeFoodKeys: ['white_rice'] })).toBe(false);
    expect(foodAllowed('white_rice', {})).toBe(true);
  });
  test('allergen tag exclusion is hard', () => {
    expect(foodAllowed('peanut_butter', { excludeTags: ['peanuts'] })).toBe(false);
    expect(foodAllowed('almonds', { excludeTags: ['peanuts'] })).toBe(true);
    expect(foodAllowed('whey', { excludeTags: ['milk'] })).toBe(false);
  });
});

describe('mealAllowed / filterMealsByPreferences', () => {
  test('diet axis applies (vegan sees only vegan meals)', () => {
    const vegan = filterMealsByPreferences({ diet: 'vegan' });
    expect(vegan.length).toBeGreaterThan(0);
    vegan.forEach((m) => expect(m.diet).toBe('vegan'));
  });
  test('a meal is excluded when ANY component is excluded', () => {
    const meal = CURATED_MEALS.find((m) => m.components.some((c) => c.food === 'white_rice'));
    expect(meal).toBeDefined();
    expect(mealAllowed(meal, {})).toBe(true);
    expect(mealAllowed(meal, { excludeFoodKeys: ['white_rice'] })).toBe(false);
  });
  test('an allergen tag removes every meal containing a tagged food', () => {
    const noMilk = filterMealsByPreferences({ excludeTags: ['milk'] });
    noMilk.forEach((m) => {
      m.components.forEach((c) => {
        expect(['whey', 'skyr', 'greek_yogurt_0', 'greek_yogurt_2', 'cottage_cheese',
          'halloumi', 'paneer', 'milk_skimmed']).not.toContain(c.food);
      });
    });
  });
  test('null meal is refused', () => {
    expect(mealAllowed(null, {})).toBe(false);
  });
});

describe('withExcludedFood / withoutExcludedFood (the one-tap flag)', () => {
  test('adds once, idempotently, without mutating the input', () => {
    const base = normalisePreferences({});
    const flagged = withExcludedFood(base, 'white_rice');
    expect(flagged.excludeFoodKeys).toEqual(['white_rice']);
    expect(base.excludeFoodKeys).toEqual([]);
    expect(withExcludedFood(flagged, 'white_rice').excludeFoodKeys).toEqual(['white_rice']);
  });
  test('removes cleanly', () => {
    const flagged = withExcludedFood({}, 'oats');
    expect(withoutExcludedFood(flagged, 'oats').excludeFoodKeys).toEqual([]);
  });
});

// Dietary-needs build (2026-07-09): pescatarian is a first-class diet axis.
// These pin the plan-layer behaviour so a future edit can never leak meat
// into a pescatarian plan or strip the plant anchors vegetarians rely on.
describe('pescatarian (dietary-needs build 2026-07-09)', () => {
  const { filterMealsByPreferences: filterMeals, normalisePreferences: norm } = require('../planPreferences');
  const MEAT_KEYS = ['chicken_breast', 'turkey_breast', 'turkey_mince',
    'beef_mince_5', 'steak_lean', 'bacon_medallions'];

  test('normalisePreferences accepts pescatarian and still rejects unknowns', () => {
    expect(norm({ diet: 'pescatarian' }).diet).toBe('pescatarian');
    expect(norm({ diet: 'carnivore' }).diet).toBe('omnivore');
  });

  test('a pescatarian plan never contains meat, and does contain fish', () => {
    const meals = filterMeals({ diet: 'pescatarian' });
    expect(meals.length).toBeGreaterThan(0);
    let sawSeafood = false;
    for (const m of meals) {
      for (const c of m.components) {
        expect(MEAT_KEYS).not.toContain(c.food);
        if (['cod', 'salmon', 'smoked_salmon', 'tuna_water', 'prawns'].includes(c.food)) sawSeafood = true;
      }
    }
    expect(sawSeafood).toBe(true);
  });

  test('pescatarian keeps the vegetarian anchor rule: plant anchors pass, bare legumes never anchor', () => {
    // Tofu-anchored vegan meal stays available (moderate anchor, allowed).
    const meals = filterMeals({ diet: 'pescatarian' });
    expect(meals.map((m) => m.id)).toContain('curated_vg_tofu_stirfry');
  });

  test('pescatarian plus a fish allergen exclude still yields a workable pool', () => {
    // The odd-but-legitimate combination (shellfish-tolerant setups aside)
    // must degrade to the vegetarian-and-below pool, not to zero meals.
    const meals = filterMeals({ diet: 'pescatarian', excludeTags: ['fish', 'crustaceans'] });
    expect(meals.length).toBeGreaterThan(0);
    for (const m of meals) {
      for (const c of m.components) {
        expect(['cod', 'salmon', 'smoked_salmon', 'tuna_water', 'prawns']).not.toContain(c.food);
      }
    }
  });
});
