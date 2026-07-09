/**
 * macros.test.js — the single per-100g -> portion scaler (food review U-M2).
 */
import { scaleMacros, resolveServingG, scaleSugarG, scaleSodiumMg, perServingTotals } from '../macros';

describe('scaleMacros', () => {
  test('scales the resolved/diary shape (kcal_100g ...) by grams', () => {
    const food = { kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6, fibre_100g: 0 };
    expect(scaleMacros(food, 200)).toEqual({ kcal: 330, proteinG: 62, carbsG: 0, fatG: 7.2, fibreG: 0 });
  });

  test('scales the custom-food draft shape (kcal100g ...) by grams', () => {
    const food = { kcal100g: 250, protein100g: 20, carbs100g: 30, fat100g: 5, fibre100g: 2 };
    expect(scaleMacros(food, 50)).toEqual({ kcal: 125, proteinG: 10, carbsG: 15, fatG: 2.5, fibreG: 1 });
  });

  test('absent fibre stays null (never a fake 0)', () => {
    expect(scaleMacros({ kcal_100g: 100 }, 100).fibreG).toBeNull();
  });

  test('zero / invalid grams yield zeros, not NaN', () => {
    expect(scaleMacros({ kcal_100g: 100, protein_100g: 10 }, 0))
      .toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: null });
    expect(scaleMacros(null, 100).kcal).toBe(0);
  });

  test('rounds kcal to a whole number and macros to one decimal', () => {
    const m = scaleMacros({ kcal_100g: 123, protein_100g: 9.99, carbs_100g: 1.234, fat_100g: 0 }, 100);
    expect(m.kcal).toBe(123);
    expect(m.proteinG).toBe(10);
    expect(m.carbsG).toBe(1.2);
  });
});

describe('perServingTotals (L05-MR1: recipe-row per-serving figures)', () => {
  test('divides a whole-recipe total by the servings count', () => {
    expect(perServingTotals({ kcal: 800, protein: 60, carbs: 80, fat: 20 }, 4))
      .toEqual({ kcal: 200, protein: 15, carbs: 20, fat: 5 });
  });

  test('rounds kcal to a whole number and macros to one decimal', () => {
    expect(perServingTotals({ kcal: 1000, protein: 100, carbs: 10, fat: 1 }, 3))
      .toEqual({ kcal: 333, protein: 33.3, carbs: 3.3, fat: 0.3 });
  });

  test('one serving passes the whole total through unchanged', () => {
    expect(perServingTotals({ kcal: 350, protein: 28, carbs: 4, fat: 24 }, 1))
      .toEqual({ kcal: 350, protein: 28, carbs: 4, fat: 24 });
  });

  test('a missing, zero or invalid servings count is treated as one serving, never divides by zero', () => {
    const totals = { kcal: 350, protein: 28, carbs: 4, fat: 24 };
    expect(perServingTotals(totals, 0)).toEqual(totals);
    expect(perServingTotals(totals, null)).toEqual(totals);
    expect(perServingTotals(totals, undefined)).toEqual(totals);
    expect(perServingTotals(totals, -2)).toEqual(totals);
    expect(perServingTotals(totals, 'not a number')).toEqual(totals);
  });

  test('a missing totals object yields all-zero figures rather than throwing', () => {
    expect(perServingTotals(null, 4)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    expect(perServingTotals(undefined, 4)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('resolveServingG', () => {
  test('prefers the last logged portion when present and positive', () => {
    expect(resolveServingG({ last_quantity_g: 150, serving_g: 30 })).toBe(150);
  });

  test('falls back to the default serving when there is no last portion', () => {
    expect(resolveServingG({ serving_g: 30 })).toBe(30);
    expect(resolveServingG({ last_quantity_g: 0, serving_g: 30 })).toBe(30);
  });

  test('falls back to 100 g when neither is a positive value', () => {
    expect(resolveServingG({})).toBe(100);
    expect(resolveServingG({ last_quantity_g: 0, serving_g: 0 })).toBe(100);
    expect(resolveServingG(null)).toBe(100);
    expect(resolveServingG(undefined)).toBe(100);
  });
});

describe('scaleSugarG', () => {
  test('scales the resolved/diary shape (sugar_100g) by grams', () => {
    expect(scaleSugarG({ sugar_100g: 10 }, 200)).toBe(20);
  });

  test('tolerates the custom-food draft shape (sugar100g)', () => {
    expect(scaleSugarG({ sugar100g: 5 }, 50)).toBe(2.5);
  });

  test('returns null (no data, never a fake 0) when the food carries no sugar', () => {
    expect(scaleSugarG({}, 100)).toBeNull();
    expect(scaleSugarG({ sugar_100g: null }, 100)).toBeNull();
    expect(scaleSugarG({ sugar_100g: 'x' }, 100)).toBeNull();
  });

  test('returns null for a non-positive or missing quantity', () => {
    expect(scaleSugarG({ sugar_100g: 10 }, 0)).toBeNull();
    expect(scaleSugarG({ sugar_100g: 10 }, -5)).toBeNull();
    expect(scaleSugarG(null, 100)).toBeNull();
  });

  test('a real 0 g sugar stays 0, not null', () => {
    expect(scaleSugarG({ sugar_100g: 0 }, 100)).toBe(0);
  });
});

describe('scaleSodiumMg (E4: stored grams per 100g, displayed as whole mg)', () => {
  test('converts grams-per-100g to milligrams for the eaten quantity', () => {
    // 0.196 g/100g (the measured OFF median) over 250 g = 490 mg.
    expect(scaleSodiumMg({ sodium_100g: 0.196 }, 250)).toBe(490);
  });

  test('tolerates the custom-food draft shape (sodium100g)', () => {
    expect(scaleSodiumMg({ sodium100g: 0.4 }, 50)).toBe(200);
  });

  test('returns null (no data, never a fake 0) when the food carries no sodium', () => {
    expect(scaleSodiumMg({}, 100)).toBeNull();
    expect(scaleSodiumMg({ sodium_100g: null }, 100)).toBeNull();
    expect(scaleSodiumMg({ sodium_100g: 'x' }, 100)).toBeNull();
  });

  test('implausible stored values read as no data, not a wrong number', () => {
    // A handful of OFF rows carry mg entered as g (measured max 649 g/100g);
    // pure salt is only ~39 g sodium/100g, so anything above the sanity cap
    // must NOT render as a number a thousand times too high.
    expect(scaleSodiumMg({ sodium_100g: 649 }, 100)).toBeNull();
    expect(scaleSodiumMg({ sodium_100g: 41 }, 100)).toBeNull();
    expect(scaleSodiumMg({ sodium_100g: -1 }, 100)).toBeNull();
  });

  test('returns null for a non-positive or missing quantity', () => {
    expect(scaleSodiumMg({ sodium_100g: 0.2 }, 0)).toBeNull();
    expect(scaleSodiumMg({ sodium_100g: 0.2 }, -5)).toBeNull();
    expect(scaleSodiumMg(null, 100)).toBeNull();
  });

  test('a real 0 sodium stays 0, not null', () => {
    expect(scaleSodiumMg({ sodium_100g: 0 }, 100)).toBe(0);
  });
});
