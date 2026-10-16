/**
 * savedMealItems (D230 lane 3B, R12): the pure list logic behind a saved
 * meal's sheet. Pins that changed grams scale the item's own stored macros
 * through scaleMacros, that the base grams return the stored figures exactly
 * (so stepping up and back down never drifts), that the bound is the diary's
 * 1 to 5000 g, and that the rows handed to logFoodEntries are exactly the
 * drafts shown (a removed draft is simply absent; an item with no foodRef is
 * left out, as applySavedMealToDiary also skips it).
 */
import { scaleMacros } from '../macros';
import {
  clampItemGrams, draftFromItem, draftFromFood, draftsFromItems, draftMacros, draftToItem,
  draftTotals, draftsToEntries, ITEM_MIN_G, ITEM_MAX_G,
} from '../savedMealItems';

const CHICKEN = { foodRef: 'global:chicken', name: 'Chicken breast', quantityG: 200, kcal: 330, proteinG: 62, carbsG: 0, fatG: 7, fibreG: 1.4 };

describe('savedMealItems', () => {
  test('the bound is the diary\'s: whole grams, 1 to 5000', () => {
    expect([ITEM_MIN_G, ITEM_MAX_G]).toEqual([1, 5000]);
    expect(clampItemGrams(0)).toBe(1);
    expect(clampItemGrams(-40)).toBe(1);
    expect(clampItemGrams(5001)).toBe(5000);
    expect(clampItemGrams(12.6)).toBe(13);
    expect(clampItemGrams('abc')).toBe(1);
    expect(clampItemGrams(undefined)).toBe(1);
  });

  test('the base grams return the stored figures untouched', () => {
    const d = draftFromItem(CHICKEN);
    expect(draftToItem(d)).toEqual(CHICKEN);
  });

  test('changed grams scale the stored macros through scaleMacros, from the base', () => {
    const d = { ...draftFromItem(CHICKEN), quantityG: 250 };
    const expected = scaleMacros({
      kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.5, fibre_100g: 0.7,
    }, 250);
    expect(draftMacros(d)).toEqual(expected);
    expect(draftToItem(d)).toMatchObject({ quantityG: 250, kcal: 413, proteinG: 77.5, fatG: 8.8, fibreG: 1.8 });
    // Back to the base: exact again, no rounding drift.
    expect(draftToItem({ ...d, quantityG: 200 })).toEqual(CHICKEN);
  });

  test('a food with no fibre datum stays null when scaled', () => {
    const d = { ...draftFromItem({ ...CHICKEN, fibreG: null }), quantityG: 100 };
    expect(draftMacros(d).fibreG).toBeNull();
  });

  test('a stored amount outside the bound is shown inside it', () => {
    expect(draftFromItem({ ...CHICKEN, quantityG: 9000 }).quantityG).toBe(5000);
    expect(draftFromItem({ ...CHICKEN, quantityG: 0 }).quantityG).toBe(1);
  });

  test('names: a resolved name wins, the stored name stands in', () => {
    const names = new Map([['global:chicken', { name: 'Chicken, grilled' }]]);
    const [a, b] = draftsFromItems([CHICKEN, { ...CHICKEN, foodRef: 'global:x', name: 'Stored' }], names);
    expect(a.name).toBe('Chicken, grilled');
    expect(b.name).toBe('Stored');
  });

  test('a picked food becomes a draft with its macros at the picked grams', () => {
    const egg = { food_ref: 'global:egg', name: 'Egg', kcal_100g: 143, protein_100g: 12.6, carbs_100g: 0.7, fat_100g: 9.5, fibre_100g: null };
    const d = draftFromFood(egg, 120);
    expect(d.quantityG).toBe(120);
    expect(draftToItem(d)).toEqual({ foodRef: 'global:egg', name: 'Egg', quantityG: 120, ...(({ kcal, proteinG, carbsG, fatG, fibreG }) => ({ kcal, proteinG, carbsG, fatG, fibreG }))(scaleMacros(egg, 120)) });
  });

  test('totals follow the drafts shown', () => {
    const a = draftFromItem(CHICKEN);
    const b = draftFromItem({ foodRef: 'global:rice', name: 'Rice', quantityG: 150, kcal: 195, proteinG: 4.5, carbsG: 42, fatG: 0.5, fibreG: null });
    expect(draftTotals([a, b])).toEqual({ kcal: 525, protein: 66.5, carbs: 42, fat: 7.5 });
    expect(draftTotals([b])).toEqual({ kcal: 195, protein: 4.5, carbs: 42, fat: 0.5 });
    expect(draftTotals([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  test('the entries are the drafts as shown, with the slot and the day', () => {
    const a = draftFromItem(CHICKEN);
    const noRef = draftFromItem({ ...CHICKEN, foodRef: undefined });
    const rows = draftsToEntries([a, noRef], { mealSlot: 'lunch', entryDate: '2026-10-16' });
    expect(rows).toEqual([{
      entryDate: '2026-10-16', mealSlot: 'lunch', foodRef: 'global:chicken', quantityG: 200,
      kcal: 330, proteinG: 62, carbsG: 0, fatG: 7, fibreG: 1.4,
    }]);
    expect(draftsToEntries([], { mealSlot: 'lunch', entryDate: '2026-10-16' })).toEqual([]);
  });
});

// Fresh-eyes review 2026-10-16 (blocker 2): a saved meal can hold a quick add
// (foodRef 'quick:*', 0 g by design, macros entered directly). It used to be
// clamped to 1 g, which wrote a "1 g, 500 kcal" row whose grams and macros
// disagreed (FOOD-001). Now it stays at 0 g, fixed, and a real food stored
// with no grams (a legacy row) is left out of the list.
const { draftsFromItems: dfi, draftMacros: dm, draftsToEntries: dte, draftToItem: dti, isQuickAddRef } = require('../savedMealItems');
describe('a legacy item with no food reference (D230 review #16)', () => {
  test('is left out of the drafts, so the editor never carries it and Save can succeed', () => {
    const broken = { name: 'Old row', quantityG: 100, kcal: 100, proteinG: 1, carbsG: 1, fatG: 1, fibreG: null };
    const blank = { ...broken, foodRef: '' };
    const drafts = dfi([broken, blank, CHICKEN]);
    expect(drafts.map((d) => d.foodRef)).toEqual(['global:chicken']);
    // every stored item the editor writes back has a reference, which is what updateSavedMeal requires
    expect(drafts.map((d) => dti(d)).every((it) => typeof it.foodRef === 'string' && it.foodRef !== '')).toBe(true);
  });
});

describe('a quick add inside a saved meal', () => {
  const quick = { foodRef: 'quick:adhoc', name: 'Quick add', quantityG: 0, kcal: 500, proteinG: 20, carbsG: 50, fatG: 20, fibreG: null };
  test('stays at 0 g, fixed, with its own figures at every read', () => {
    const [d] = dfi([quick]);
    expect(isQuickAddRef(d.foodRef)).toBe(true);
    expect(d.fixed).toBe(true);
    expect(d.quantityG).toBe(0);
    expect(dm(d)).toMatchObject({ kcal: 500, proteinG: 20 });
    expect(dti(d)).toMatchObject({ foodRef: 'quick:adhoc', quantityG: 0, kcal: 500 });
    const [row] = dte([d], { mealSlot: 'lunch', entryDate: '2026-10-16' });
    expect(row).toMatchObject({ foodRef: 'quick:adhoc', quantityG: 0, kcal: 500, mealSlot: 'lunch' });
  });
  test('a real food stored with no grams is left out, a real food with grams is kept', () => {
    const list = dfi([
      { foodRef: 'off:x', name: 'Legacy', quantityG: 0, kcal: 100, proteinG: 1, carbsG: 1, fatG: 1 },
      { foodRef: 'off:y', name: 'Oats', quantityG: 40, kcal: 150, proteinG: 5, carbsG: 27, fatG: 3 },
      quick,
    ]);
    expect(list.map((d) => d.foodRef)).toEqual(['off:y', 'quick:adhoc']);
    expect(list[0].fixed).toBe(false);
    expect(list[0].quantityG).toBe(40);
  });
});
