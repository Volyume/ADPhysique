/**
 * macros.test.js — the single per-100g -> portion scaler (food review U-M2).
 */
import { scaleMacros, resolveServingG } from '../macros';

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
