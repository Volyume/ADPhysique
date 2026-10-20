/**
 * Pins the item 25 and 27 surfaces (owner answers 2026-10-20): the oily fish
 * setting's wording and storage, the note on the 5 and 7 day shopping chips,
 * and "Weigh as listed" in the plan row, the shopping list and the food
 * detail sheet. No health text is allowed beside the oily fish setting.
 */
import fs from 'fs';
import path from 'path';
import { buildGroceryList, groceryQuantityText } from '../../lib/food/groceryList';

const read = (...p) => fs.readFileSync(path.join(__dirname, '..', '..', ...p), 'utf8');
const PLAN = read('screens', 'MealPlanScreen.js');

test('the oily fish setting: wording, values 0 to 7 plus No limit, phone only', () => {
  expect(PLAN).toContain('Oily fish meals a week: ${prefs.oilyFish === Infinity ? \'no limit\' : `up to ${prefs.oilyFish}`}');
  expect(PLAN).toContain('[0, 1, 2, 3, 4, 5, 6, 7].map');
  expect(PLAN).toContain("label: 'No limit'");
  expect(read('store', 'useAppStore.js')).toContain("'mealPlanOilyFish'");
  expect(PLAN).not.toMatch(/pregnan|breastfeed|NHS/i);
});

test('the 5 and 7 day chips carry a plain note when the day has oily fish', () => {
  expect(PLAN).toContain('grocerySheet.repeat >= 5 && countOilyMeals(plan?.days?.[0]) > 0');
});

test('Weigh as listed is in the plan row, the shopping list and the detail sheet', () => {
  expect(PLAN).toContain('Weigh as listed</Text>');
  expect(read('components', 'food', 'FoodDetailSheet.js')).toContain('Weigh as listed</Text>');
  const plan = { days: [{ slots: [{ components: [{ food: 'quinoa', g: 100 }, { food: 'broccoli', g: 80 }] }] }] };
  const items = buildGroceryList(plan).sections.flatMap((s) => s.items);
  const quinoa = items.find((i) => /quinoa/i.test(i.name));
  const broccoli = items.find((i) => /broccoli/i.test(i.name));
  expect(groceryQuantityText(quinoa)).toMatch(/ g as listed$/);
  expect(groceryQuantityText(broccoli)).not.toMatch(/as listed/);
});

test('the two stale raw/cooked comments no longer cite NA-nutrition-1 as current', () => {
  expect(PLAN).not.toContain('founder ruling\n  // NA-nutrition-1): record which basis');
  expect(read('lib', 'food', 'foodRoles.js')).not.toContain('Founder ruling (NA-nutrition-1');
});
