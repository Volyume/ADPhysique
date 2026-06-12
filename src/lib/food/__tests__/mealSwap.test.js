/**
 * mealSwap — macro-preserving food and meal swaps. The contract: a swap
 * holds the role's dominant macro within tolerance, never reintroduces an
 * excluded food, computes exact grams (beating hand-rounded printed
 * pairs), and is deterministic.
 */
import { CURATED_FOODS } from '../curatedFoods';
import { mealTotals } from '../curatedMeals';
import { ROLE_TOLERANCE_G, roleOf, roleMacroGrams } from '../foodRoles';
import {
  findRoleAlternatives,
  solveSwapGrams,
  swapFoodInMeal,
  swapMealInPlan,
} from '../mealSwap';

describe('findRoleAlternatives', () => {
  test('returns same-role foods, curated switches first, never itself', () => {
    const alts = findRoleAlternatives('white_rice', {});
    expect(alts.length).toBeGreaterThan(0);
    expect(alts).not.toContain('white_rice');
    alts.forEach((k) => expect(roleOf(k)).toBe('carb'));
    // pasta is a curated switch for rice -> it leads the list
    expect(alts[0]).toBe('pasta');
  });
  test('honours dislikes and allergen excludes', () => {
    const alts = findRoleAlternatives('almonds', { excludeTags: ['peanuts'], excludeFoodKeys: ['tahini'] });
    expect(alts).not.toContain('peanut_butter');
    expect(alts).not.toContain('tahini');
    alts.forEach((k) => expect(roleOf(k)).toBe('fat'));
  });
  test('unknown / roleless food yields nothing', () => {
    expect(findRoleAlternatives('not_a_food', {})).toEqual([]);
  });
  test('is deterministic', () => {
    expect(findRoleAlternatives('chicken_breast', {})).toEqual(findRoleAlternatives('chicken_breast', {}));
  });
});

describe('solveSwapGrams (exact-gram, role-macro match)', () => {
  test('rice 125 g -> pasta holds carbs within tolerance', () => {
    const out = solveSwapGrams('white_rice', 125, 'pasta');
    expect(out).not.toBeNull();
    expect(out.withinTolerance).toBe(true);
    const target = roleMacroGrams('white_rice', 125);
    expect(Math.abs(out.roleMacroG - target)).toBeLessThanOrEqual(ROLE_TOLERANCE_G);
    // computed, not the hand-rounded 50 g a coach would print
    expect(out.grams).toBeGreaterThan(40);
    expect(out.grams).toBeLessThan(60);
    expect(out.grams % 5).toBe(0);
  });
  test('almonds 20 g -> peanut butter holds fat', () => {
    const out = solveSwapGrams('almonds', 20, 'peanut_butter');
    const target = roleMacroGrams('almonds', 20);
    expect(Math.abs(out.roleMacroG - target)).toBeLessThanOrEqual(ROLE_TOLERANCE_G);
  });
  test('refuses a cross-role swap', () => {
    expect(solveSwapGrams('white_rice', 100, 'olive_oil')).toBeNull(); // carb -> fat
    expect(solveSwapGrams('chicken_breast', 100, 'white_rice')).toBeNull(); // protein -> carb
  });
  test('clamps to the food sane range (no 600 g of oil to match calories)', () => {
    const out = solveSwapGrams('avocado', 150, 'olive_oil'); // lots of fat -> oil
    expect(out.grams).toBeLessThanOrEqual(30); // olive_oil clamp hi
  });
});

describe('swapFoodInMeal', () => {
  const components = [
    { food: 'chicken_breast', g: 150 },
    { food: 'white_rice', g: 125 },
    { food: 'broccoli', g: 100 },
  ];

  test('swaps the carb, holds the meal carbs, returns a structured receipt', () => {
    const res = swapFoodInMeal({ components, foodKeyOut: 'white_rice', prefs: {}, preferKey: 'pasta' });
    expect(res).not.toBeNull();
    expect(res.swap.foodIn).toBe('pasta');
    expect(res.swap.role).toBe('carb');
    expect(res.components.find((c) => c.food === 'pasta')).toBeTruthy();
    expect(res.components.find((c) => c.food === 'white_rice')).toBeFalsy();
    // protein staple untouched
    expect(res.components.find((c) => c.food === 'chicken_breast').g).toBe(150);
    // receipt carries the gram-level facts both personas render
    expect(res.swap.gramsIn % 5).toBe(0);
    expect(res.swap.stateIn).toBe('dry'); // pasta is a dry weight
    expect(typeof res.swap.kcalDriftKcal).toBe('number');
    // totals recomputed, internally consistent
    expect(res.totals).toEqual(mealTotals(res.components.map((c) => {
      const f = CURATED_FOODS[c.food];
      return {
        kcal: Math.round(f.kcal * c.g / 100),
        proteinG: Math.round(f.protein * c.g / 100 * 10) / 10,
        carbsG: Math.round(f.carbs * c.g / 100 * 10) / 10,
        fatG: Math.round(f.fat * c.g / 100 * 10) / 10,
      };
    })));
  });

  test('never returns an excluded food', () => {
    const res = swapFoodInMeal({ components, foodKeyOut: 'white_rice', prefs: { excludeFoodKeys: ['pasta'] }, preferKey: 'pasta' });
    // pasta excluded -> must pick a different in-tolerance carb, not pasta
    expect(res.swap.foodIn).not.toBe('pasta');
    expect(roleOf(res.swap.foodIn)).toBe('carb');
  });

  test('returns null when the food is not in the meal', () => {
    expect(swapFoodInMeal({ components, foodKeyOut: 'oats', prefs: {} })).toBeNull();
  });

  test('is deterministic', () => {
    const a = swapFoodInMeal({ components, foodKeyOut: 'white_rice', prefs: {} });
    const b = swapFoodInMeal({ components, foodKeyOut: 'white_rice', prefs: {} });
    expect(a).toEqual(b);
  });
});

describe('swapMealInPlan', () => {
  // A small assembled-day shape (what the assembler emits).
  const day = {
    slots: [
      { slot: 'meal_1', mealId: 'm_oats_whey', name: 'Oats & whey', totals: { kcal: 500, protein: 40, carbs: 60, fat: 10 } },
      { slot: 'meal_2', mealId: 'm_chicken_rice', name: 'Chicken & rice', totals: { kcal: 600, protein: 50, carbs: 70, fat: 12 } },
    ],
  };

  test('returns a like-for-like replacement and a few alternatives', () => {
    const res = swapMealInPlan({ day, slotKey: 'meal_2', prefs: {} });
    expect(res).not.toBeNull();
    expect(res.replacement.mealId).toBeTruthy();
    // never the meal it replaced, never one already on the day
    expect(res.replacement.mealId).not.toBe('m_chicken_rice');
    expect(res.replacement.mealId).not.toBe('m_oats_whey');
    expect(Array.isArray(res.alternatives)).toBe(true);
    expect(res.replacement.totals).toEqual(mealTotals(res.replacement.items));
  });

  test('respects diet preference', () => {
    const res = swapMealInPlan({ day, slotKey: 'meal_2', prefs: { diet: 'vegan' } });
    if (res) {
      res.replacement.components.forEach((c) => {
        expect(['chicken_breast', 'eggs', 'whey', 'cod', 'beef_mince_5', 'greek_yogurt_0'])
          .not.toContain(c.food);
      });
    }
  });

  test('returns null for an unknown slot', () => {
    expect(swapMealInPlan({ day, slotKey: 'meal_9', prefs: {} })).toBeNull();
  });

  test('is deterministic', () => {
    expect(swapMealInPlan({ day, slotKey: 'meal_2', prefs: {} }))
      .toEqual(swapMealInPlan({ day, slotKey: 'meal_2', prefs: {} }));
  });
});
