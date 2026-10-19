/**
 * cookYield.js (founder ruling 2026-10-19): every raw <-> cooked ratio comes
 * from a raw and a cooked row for the same food in the bundled CoFID
 * snapshot. This suite pins each copied value to its row, so a ratio can
 * never drift from the data or be typed in, and pins that a food with no
 * pair gets no toggle and no figure.
 */
import fs from 'fs';
import path from 'path';
import {
  COOK_YIELD_PAIRS, cookedPerRaw, hasCookToggle, uncookedWord, nativeState,
  convertCookGrams, gramsOnNativeBasis,
} from '../cookYield';
import { stateOf } from '../foodRoles';

const snapshot = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '..', 'assets', 'seed', 'cofid_uk.dat'), 'utf8'));
const byName = new Map(snapshot.rows.map((r) => [r.name, r]));
const COLUMN = { protein: 'protein_100g', carbs: 'carbs_100g' };

describe('every ratio is CoFID data', () => {
  for (const [key, p] of Object.entries(COOK_YIELD_PAIRS)) {
    test(`${key}: both rows exist and carry the copied ${p.conserved} value`, () => {
      const raw = byName.get(p.raw.name);
      const cooked = byName.get(p.cooked.name);
      expect(raw).toBeDefined();
      expect(cooked).toBeDefined();
      expect(raw[COLUMN[p.conserved]]).toBe(p.raw.value);
      expect(cooked[COLUMN[p.conserved]]).toBe(p.cooked.value);
    });

    test(`${key}: is a curated food with a raw/cooked distinction`, () => {
      expect(stateOf(key)).not.toBe('ready');
      expect(hasCookToggle(key)).toBe(true);
    });
  }
});

describe('foods without a pair', () => {
  test.each(['oats', 'quinoa', 'lentils', 'turkey_mince', 'kidney_beans', 'prawns', 'eggs', 'broccoli'])('%s has no toggle and no figure', (key) => {
    expect(hasCookToggle(key)).toBe(false);
    expect(cookedPerRaw(key)).toBeNull();
    expect(convertCookGrams(key, 100, 'raw', 'cooked')).toBeNull();
    expect(gramsOnNativeBasis(key, 100, 'raw')).toBe(100);
  });
});

describe('conversion', () => {
  test('445 g cooked chicken is about 590 g raw, and back again', () => {
    const raw = convertCookGrams('chicken_breast', 445, 'cooked', 'raw');
    expect(Math.round(raw)).toBe(593);
    expect(convertCookGrams('chicken_breast', raw, 'raw', 'cooked')).toBeCloseTo(445, 6);
  });

  test('280 g cooked rice is about 100 g dry', () => {
    expect(Math.round(convertCookGrams('white_rice', 280, 'cooked', 'raw'))).toBe(102);
    expect(uncookedWord('white_rice')).toBe('dry');
    expect(uncookedWord('chicken_breast')).toBe('raw');
  });

  test('weighed grams land on the food\'s own basis, so macros match what was weighed', () => {
    // Chicken's values are per 100 g cooked: 200 g weighed raw is 150 g cooked.
    expect(nativeState('chicken_breast')).toBe('cooked');
    expect(gramsOnNativeBasis('chicken_breast', 200, 'raw')).toBeCloseTo(150, 6);
    // Pasta's values are per 100 g dry: 203.2 g weighed cooked is 100 g dry.
    expect(nativeState('pasta')).toBe('raw');
    expect(gramsOnNativeBasis('pasta', 203.2, 'cooked')).toBeCloseTo(100, 1);
    // Native, as weighed, or no state: unchanged.
    expect(gramsOnNativeBasis('chicken_breast', 200, 'cooked')).toBe(200);
    expect(gramsOnNativeBasis('chicken_breast', 200, 'as_weighed')).toBe(200);
    expect(gramsOnNativeBasis('chicken_breast', 200, null)).toBe(200);
  });
});

describe('logging grams as weighed', () => {
  // eslint-disable-next-line global-require
  const { buildFoodEntryPayload } = require('../loggingPayloads');
  const chicken = { food_ref: 'curated:chicken_breast', kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6 };

  test('200 g weighed raw stores 200 g with the macros of the 150 g it cooks to', () => {
    const raw = buildFoodEntryPayload({ entryDate: '2026-10-19', mealSlot: 'meal_1', foodRef: chicken.food_ref, quantityG: 200, food: chicken, weightState: 'raw' });
    const cooked = buildFoodEntryPayload({ entryDate: '2026-10-19', mealSlot: 'meal_1', foodRef: chicken.food_ref, quantityG: 150, food: chicken, weightState: 'cooked' });
    expect(raw.quantityG).toBe(200);
    expect(raw.kcal).toBe(cooked.kcal);
    expect(raw.proteinG).toBe(cooked.proteinG);
  });

  test('a food without a pair scales exactly as before', () => {
    const oats = { food_ref: 'curated:oats', kcal_100g: 379, protein_100g: 13, carbs_100g: 67, fat_100g: 7 };
    const a = buildFoodEntryPayload({ entryDate: '2026-10-19', mealSlot: 'meal_1', foodRef: oats.food_ref, quantityG: 60, food: oats, weightState: 'cooked' });
    const b = buildFoodEntryPayload({ entryDate: '2026-10-19', mealSlot: 'meal_1', foodRef: oats.food_ref, quantityG: 60, food: oats });
    expect(a.kcal).toBe(b.kcal);
  });
});
