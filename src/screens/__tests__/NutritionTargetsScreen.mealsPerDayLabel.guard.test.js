/**
 * Campaign 3 discoverability audit, finding #4 (docs/discoverability-audit-
 * 2026-08-10/SETTINGS-INVENTORY.md §4 #4 and §2.5 "Meals per day (targets)"
 * row): NutritionTargetsScreen.js:1089-1109 and MealPlanScreen.js:225-233
 * both used to render a bare "Meals per day" label while writing different
 * keys (@volyume_meals_per_day vs userProfile.mealPlanMealsPerDay) with
 * genuinely different consequences. Tracing every reader of
 * @volyume_meals_per_day found it is NOT display-only on this screen: it
 * also sizes DiaryScreen.js's numbered meal-slot ladder, MealNamesScreen.js's
 * rename-slot list, and FoodSearchScreen.js's Suggested-tab remaining-meals
 * split. MealPlanScreen's separate key only sizes the auto-generated Meal
 * Plan and is untouched here (read-only per this campaign's bounds).
 *
 * This is a source-level regression guard, matching this screen's existing
 * convention (mealGuidance.guard.test.js, sectionLabels.guard.test.js) for
 * controls inside a heavy screen that is impractical to drive end-to-end
 * through the results state for every case. It pins two things (Phase 20
 * style: a setting's label must not promise an effect the reader does not
 * implement):
 *   1. The label/sub actually shipped are honest about the wider,
 *      verified consequence, and no longer collide with MealPlanScreen's
 *      identical string.
 *   2. Every surface the label's sub-copy claims to affect still reads the
 *      SAME key, so the claim stays true if any of those screens changes
 *      independently in future.
 */
const fs = require('fs');
const path = require('path');

const ntsSource = fs.readFileSync(
  path.join(__dirname, '..', 'NutritionTargetsScreen.js'),
  'utf8',
);

describe('NutritionTargetsScreen "Diary meals per day" label (finding #4 fix)', () => {
  test('renders a distinct label naming the diary/suggestions consequence, not a bare "Meals per day"', () => {
    expect(ntsSource).toMatch(/Diary meals per day/);
    expect(ntsSource).toMatch(
      /Sets how many meal slots your diary shows and how suggestions split what is left today\. Also splits the protein target above\./,
    );
  });

  test('the label and sub render immediately before the meal-count chip row (changeMealsPerDay)', () => {
    const labelIdx = ntsSource.indexOf('Diary meals per day');
    const chipRowIdx = ntsSource.indexOf('haptics.selection(); changeMealsPerDay(n)');
    expect(labelIdx).toBeGreaterThan(-1);
    expect(chipRowIdx).toBeGreaterThan(labelIdx);
    // Keep the two close together (same card) rather than drifting apart.
    expect(chipRowIdx - labelIdx).toBeLessThan(1200);
  });

  test('does not re-use MealPlanScreen\'s "Meal plan meals per day" label string', () => {
    // MealPlanScreen.js renders label="Meal plan meals per day" (Campaign 24
    // Wave B fix, a different key, a different consequence, disambiguated on
    // that screen's own side rather than merged here). NutritionTargetsScreen
    // must not reintroduce either the old bare string or the new disambiguated
    // one as this control's own label.
    expect(ntsSource).not.toMatch(/label="Meals per day"/);
    expect(ntsSource).not.toMatch(/label="Meal plan meals per day"/);
    expect(ntsSource).not.toMatch(/>Meals per day</);
  });
});

describe('Every surface the new sub-copy claims is affected still reads @volyume_meals_per_day (reader truth)', () => {
  test('NutritionTargetsScreen itself reads and writes the key', () => {
    expect(ntsSource).toMatch(/AsyncStorage\.getItem\('@volyume_meals_per_day'\)/);
    expect(ntsSource).toMatch(/AsyncStorage\.setItem\('@volyume_meals_per_day'/);
  });

  test('DiaryScreen reads it to size the diary\'s meal-slot ladder', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'DiaryScreen.js'),
      'utf8',
    );
    expect(source).toMatch(/AsyncStorage\.getItem\('@volyume_meals_per_day'\)/);
  });

  test('FoodSearchScreen reads it to split what is left today across suggestions', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'FoodSearchScreen.js'),
      'utf8',
    );
    expect(source).toMatch(/AsyncStorage\.getItem\('@volyume_meals_per_day'\)/);
    expect(source).toMatch(/mealsLeftToday\(mealsPerDay, loggedSlots\)/);
  });

  test('MealNamesScreen reads it for the same slot count when renaming meals', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'MealNamesScreen.js'),
      'utf8',
    );
    expect(source).toMatch(/AsyncStorage\.getItem\('@volyume_meals_per_day'\)/);
  });

  test('MealPlanScreen\'s meal-plan-sizing row writes a DIFFERENT key, now disambiguated on its own side too (Campaign 24 Wave B)', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'MealPlanScreen.js'),
      'utf8',
    );
    expect(source).toMatch(/label="Meal plan meals per day"/);
    expect(source).not.toMatch(/label="Meals per day"/);
    expect(source).toMatch(/mealPlanMealsPerDay: v/);
    expect(source).not.toMatch(/@volyume_meals_per_day/);
  });
});
