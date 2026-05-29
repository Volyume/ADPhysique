/**
 * mealSuggest.test.js
 *
 * Pure ranking engine for meal suggestions. Candidate pool (curated
 * clean meals, dietary-filtered) is assembled upstream; this tests the
 * scoring: protein-first fit, calorie-overshoot penalty, quantity
 * computation, de-dupe, and the "nothing left to eat" guard.
 */
import {
  remainingMacros, fitScore, suggestFood, suggestMeal, rankSuggestions,
  perMealMacros, slotMatches, mealsLeftToday,
} from '../mealSuggest';

describe('perMealMacros', () => {
  test('divides the remainder by meals left', () => {
    expect(perMealMacros({ kcal: 900, protein: 90, carbs: 90, fat: 30 }, 3))
      .toEqual({ kcal: 300, protein: 30, carbs: 30, fat: 10 });
  });
  test('floors meals-left at 1 (whole remainder)', () => {
    expect(perMealMacros({ kcal: 500, protein: 40, carbs: 50, fat: 15 }, 0))
      .toEqual({ kcal: 500, protein: 40, carbs: 50, fat: 15 });
  });
});

describe('mealsLeftToday', () => {
  test('meals per day minus distinct slots logged, floored at 1', () => {
    expect(mealsLeftToday(4, ['breakfast', 'lunch'])).toBe(2);
    expect(mealsLeftToday(4, [])).toBe(4);
    expect(mealsLeftToday(4, ['breakfast', 'breakfast'])).toBe(3); // de-dupes slots
    expect(mealsLeftToday(3, ['breakfast', 'lunch', 'dinner', 'snack'])).toBe(1); // never below 1
  });
  test('floors meals-per-day at 1 for missing or garbage input', () => {
    expect(mealsLeftToday(0, [])).toBe(1);
    expect(mealsLeftToday(null, [])).toBe(1);
    expect(mealsLeftToday(4, null)).toBe(4);
  });
});

describe('slotMatches', () => {
  test('untagged or "any" fits every slot', () => {
    expect(slotMatches(undefined, 'dinner')).toBe(true);
    expect(slotMatches([], 'dinner')).toBe(true);
    expect(slotMatches(['any'], 'breakfast')).toBe(true);
  });
  test('tagged meal only fits its slots', () => {
    expect(slotMatches(['breakfast'], 'breakfast')).toBe(true);
    expect(slotMatches(['breakfast'], 'dinner')).toBe(false);
    expect(slotMatches(['lunch', 'dinner'], 'dinner')).toBe(true);
  });
  test('no slot requested = everything passes', () => {
    expect(slotMatches(['breakfast'], null)).toBe(true);
  });
});

describe('remainingMacros', () => {
  test('target minus consumed', () => {
    expect(remainingMacros(
      { kcal: 2000, protein: 180, carbs: 200, fat: 60 },
      { kcal: 1200, protein: 100, carbs: 120, fat: 40 },
    )).toEqual({ kcal: 800, protein: 80, carbs: 80, fat: 20 });
  });
  test('floors at 0 when over target', () => {
    expect(remainingMacros({ kcal: 2000, protein: 180 }, { kcal: 2300, protein: 200 }))
      .toMatchObject({ kcal: 0, protein: 0 });
  });
});

describe('fitScore', () => {
  const remaining = { kcal: 600, protein: 50, carbs: 60, fat: 20 };
  test('a high-protein, in-budget option beats a calorie bomb', () => {
    const lean = fitScore(remaining, { kcal: 300, protein: 45, carbs: 20, fat: 6 });   // fills protein, under kcal
    const bomb = fitScore(remaining, { kcal: 1200, protein: 10, carbs: 150, fat: 60 }); // little protein, big overshoot
    expect(lean).toBeGreaterThan(bomb);
  });
  test('overshooting calories drags the score negative', () => {
    expect(fitScore(remaining, { kcal: 1800, protein: 0, carbs: 200, fat: 80 })).toBeLessThan(0);
  });
});

describe('suggestFood', () => {
  const remaining = { kcal: 600, protein: 50, carbs: 60, fat: 20 };
  const chicken = { foodRef: 'off:chk', name: 'Chicken breast', kcal100: 165, protein100: 31, carbs100: 0, fat100: 3.6 };

  test('targets remaining protein, clamps + rounds quantity to 5g', () => {
    const s = suggestFood(remaining, chicken);
    // ~50g protein / 31 per 100g ≈ 161g -> rounded to 5g
    expect(s.quantityG % 5).toBe(0);
    expect(s.quantityG).toBeGreaterThanOrEqual(150);
    expect(s.quantityG).toBeLessThanOrEqual(170);
    expect(s.kind).toBe('food');
    expect(s.macros.protein).toBeGreaterThan(40);
  });

  test('clamps to the max serving for a low-protein food chasing big kcal', () => {
    const rice = { foodRef: 'off:rice', name: 'White rice', kcal100: 130, protein100: 2.7, carbs100: 28, fat100: 0.3 };
    const s = suggestFood({ kcal: 5000, protein: 0, carbs: 1000, fat: 0 }, rice, { maxG: 400 });
    expect(s.quantityG).toBe(400);
  });

  test('returns null for a food with no usable macros', () => {
    expect(suggestFood(remaining, { foodRef: 'x', name: 'Water', kcal100: 0, protein100: 0 })).toBeNull();
    expect(suggestFood(remaining, null)).toBeNull();
  });
});

describe('suggestMeal', () => {
  test('scores by fixed totals', () => {
    const meal = { id: 'm1', name: 'Chicken & rice', itemCount: 3, totals: { kcal: 550, protein: 48, carbs: 60, fat: 9 } };
    const s = suggestMeal({ kcal: 600, protein: 50, carbs: 60, fat: 20 }, meal);
    expect(s.kind).toBe('meal');
    expect(s.id).toBe('m1');
    expect(s.macros.protein).toBe(48);
    expect(s.score).toBeGreaterThan(0.5);
  });
  test('null for a meal with no id', () => {
    expect(suggestMeal({ kcal: 1 }, { name: 'x' })).toBeNull();
  });
});

describe('rankSuggestions', () => {
  const targets = { kcal: 2000, protein: 180, carbs: 200, fat: 60 };
  const consumed = { kcal: 1400, protein: 130, carbs: 140, fat: 40 }; // remaining: 600/50/60/20
  const meals = [
    { id: 'm1', name: 'Chicken & rice', itemCount: 3, totals: { kcal: 550, protein: 48, carbs: 60, fat: 9 } },
    { id: 'm2', name: 'Pizza', itemCount: 1, totals: { kcal: 1500, protein: 40, carbs: 160, fat: 70 } },
  ];
  const foods = [
    { foodRef: 'off:chk', name: 'Chicken breast', kcal100: 165, protein100: 31, carbs100: 0, fat100: 3.6 },
  ];

  test('ranks lean high-protein options first; calorie bomb sinks last', () => {
    const { suggestions } = rankSuggestions({ targets, consumed, savedMeals: meals, foods });
    const names = suggestions.map(s => s.name);
    // top pick is one of the lean, protein-dense, in-budget options
    expect(['Chicken & rice', 'Chicken breast']).toContain(suggestions[0].name);
    // the calorie bomb ranks below both lean options
    expect(names.indexOf('Pizza')).toBeGreaterThan(names.indexOf('Chicken & rice'));
    expect(names.indexOf('Pizza')).toBeGreaterThan(names.indexOf('Chicken breast'));
  });

  test('returns the remaining macros alongside', () => {
    const { remaining } = rankSuggestions({ targets, consumed, savedMeals: meals, foods });
    expect(remaining).toEqual({ kcal: 600, protein: 50, carbs: 60, fat: 20 });
  });

  test('no suggestions when at/over target', () => {
    const { suggestions } = rankSuggestions({ targets, consumed: targets, savedMeals: meals, foods });
    expect(suggestions).toEqual([]);
  });

  test('filters meals to the slot being logged (no oats at dinner)', () => {
    const slotMeals = [
      { id: 'b', name: 'Oats & whey', itemCount: 2, slots: ['breakfast'], totals: { kcal: 400, protein: 35, carbs: 50, fat: 8 } },
      { id: 'd', name: 'Chicken & rice', itemCount: 3, slots: ['lunch', 'dinner'], totals: { kcal: 550, protein: 48, carbs: 60, fat: 9 } },
    ];
    const dinner = rankSuggestions({ targets, consumed, savedMeals: slotMeals, foods: [], slot: 'dinner' });
    expect(dinner.suggestions.map(s => s.name)).toEqual(['Chicken & rice']);
    const breakfast = rankSuggestions({ targets, consumed, savedMeals: slotMeals, foods: [], slot: 'breakfast' });
    expect(breakfast.suggestions.map(s => s.name)).toEqual(['Oats & whey']);
  });

  test('portions to one meal: a day-sized meal overshoots a per-meal target', () => {
    // remaining 600/50/60/20 split across 3 meals -> ~200/16.7/20/6.7 per meal
    const perMealOpt = { id: 's', name: 'Small bowl', itemCount: 2, totals: { kcal: 210, protein: 18, carbs: 22, fat: 6 } };
    const dayOpt = { id: 'l', name: 'Big plate', itemCount: 4, totals: { kcal: 600, protein: 50, carbs: 60, fat: 20 } };
    const { perMeal, suggestions } = rankSuggestions({
      targets, consumed, savedMeals: [perMealOpt, dayOpt], foods: [], mealsLeft: 3,
    });
    expect(perMeal.kcal).toBeCloseTo(200, 0);
    // the meal sized for one third ranks above the one sized for the whole day
    expect(suggestions[0].name).toBe('Small bowl');
  });

  test('de-dupes by name + kind and caps at limit', () => {
    const dupes = [
      { id: 'a', name: 'Chicken & rice', itemCount: 3, totals: { kcal: 550, protein: 48, carbs: 60, fat: 9 } },
      { id: 'b', name: 'chicken & rice', itemCount: 3, totals: { kcal: 540, protein: 47, carbs: 59, fat: 9 } },
    ];
    const { suggestions } = rankSuggestions({ targets, consumed, savedMeals: dupes, foods: [], limit: 5 });
    expect(suggestions.filter(s => s.name.toLowerCase() === 'chicken & rice')).toHaveLength(1);
  });
});
