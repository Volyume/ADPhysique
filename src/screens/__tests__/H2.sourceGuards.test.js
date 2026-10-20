/**
 * H2.sourceGuards.test.js
 *
 * Source-level guards for proposals batch H2 (owner answers 2026-10-20):
 *  - F3: FoodSearchScreen no longer files an unnamed meal under 'snack'.
 *  - Item 22: the diary draws old-named meals inside Meal 1 to 3 by view
 *    mapping only (foldedMealSlot); no write path rewrites meal_slot.
 *  - Item 28: after a saved meal is added, the add-food screen beneath is
 *    closed too (no extra close), except in its pick-a-food mode.
 */
import fs from 'fs';
import path from 'path';

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('F3: an unnamed meal defaults by time of day, never to the old snack key', () => {
  const s = src('FoodSearchScreen.js');
  expect(s).not.toContain("route?.params?.mealSlot ?? 'snack'");
  expect(s).toContain('inferMealSlotForHour(new Date().getHours(), keys)');
});

test('item 22: the diary folds by view only and the edit sheet still gets the stored slot', () => {
  const s = src('DiaryScreen.js');
  expect(s).toContain('foldedMealSlot(e.meal_slot, mealsPerDay)');
  // the fold is passed to the ladder builder as throwaway rows, never written
  expect(s).toContain('buildMealSlots(slotRows, mealsPerDay, periWorkoutSlots)');
  expect(s).toContain("initialMealSlot={editSheet?.entry?.meal_slot ?? 'snack'}");
  const lib = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'food', 'mealSlots.js'), 'utf8');
  expect(lib).not.toMatch(/UPDATE food_entries|meal_slot\s*=\s*\?/);
});

test('item 28: a saved-meal add closes MyMeals and the add-food screen beneath it', () => {
  const s = src('MyMealsScreen.js');
  expect(s).toContain("below?.name === 'FoodSearch' && !below.params?.pickMode");
  expect(s).toContain('navigation.pop(2)');
});
