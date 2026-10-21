/**
 * Pins proposal 22 F3: an add-food route that names no meal no longer files the
 * food under the old 'snack' key (a separate Snacks card). It defaults to the
 * numbered meal for the time of day, over the person's own meals per day.
 * Source guard for the wiring plus the real ladder pick it relies on.
 */
import fs from 'fs';
import path from 'path';
import { buildMealSlots, inferMealSlotForHour } from '../../lib/food/mealSlots';

const src = fs.readFileSync(path.join(__dirname, '..', 'FoodSearchScreen.js'), 'utf8');

describe('FoodSearchScreen default meal (F3)', () => {
  test('no longer defaults to snack', () => {
    expect(src).not.toMatch(/mealSlot \?\? 'snack'/);
  });
  test('defaults from the time of day over the meals-per-day ladder, Meal 1 on another day', () => {
    expect(src).toMatch(/inferMealSlotForHour\(new Date\(\)\.getHours\(\), keys\)/);
    expect(src).toMatch(/: keys\[0\]/);
    expect(src).toMatch(/@volyume_meals_per_day/);
  });
  test('a route that names a meal is untouched', () => {
    expect(src).toMatch(/if \(routeMealSlot\) return routeMealSlot;/);
  });
  test('the pick it makes is a numbered meal, never snack', () => {
    for (const n of [1, 3, 4, 6]) {
      const keys = buildMealSlots([], n, false).map((m) => m.key);
      for (const h of [6, 9, 13, 18, 22]) {
        expect(inferMealSlotForHour(h, keys)).toMatch(/^meal_\d+$/);
      }
      expect(keys[0]).toBe('meal_1');
    }
  });
});
