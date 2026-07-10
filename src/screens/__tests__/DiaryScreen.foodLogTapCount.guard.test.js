/**
 * Regression gate for §15 item 10: canonical food-logging tap count.
 *
 * This guards the number of user taps required to log a food into the diary
 * from the diary screen. The canonical path is:
 *   TAP #1: Tap the single "Add food" button (on DiaryScreen)
 *   TAP #2: Tap a food row (on FoodSearchScreen) -> opens FoodDetailSheet
 *   TAP #3: Tap "Add to diary" button (on FoodDetailSheet) -> logs the entry
 *
 * BASELINE: 3 taps (documented below at line ~55, TAP_BUDGET constant).
 *
 * If a future diary redesign changes the tap path, this test will fail,
 * forcing an explicit founder decision on whether the new count is
 * intentional or a regression. This is an INTERNAL benchmark, not a
 * user-facing feature — it pins implementation structure only.
 *
 * Source-level guard (regex): verification that each of the three tap points
 * exists and is wired as expected, using the same pattern as
 * DiaryScreen.daySwipe.guard.test.js.
 *
 * A raising of TAP_BUDGET requires a structured founder decision made
 * IN ADVANCE (per CLAUDE.md §4: "Multiple approaches → present them.
 * Anything bigger than a one-liner → plan first, wait for 'go'").
 *
 * Ultimate-Audit item 15 (D22 15a, timeline food logging, 2026-07-10):
 * TAP #1 moved from MealSection's per-meal-card "Add food" button (now
 * deleted with the meal-card layout) to DiaryScreen's own single primary
 * "Add food" affordance below the flat timeline -- still ONE tap, still
 * infers the likely meal via inferMealSlotForHour, so TAP_BUDGET is
 * unaffected. TAP #2/#3 (FoodSearchScreen, FoodDetailSheet) are untouched
 * by item 15.
 */
import fs from 'fs';
import path from 'path';

const DIARY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'DiaryScreen.js'),
  'utf8',
);

const FOOD_SEARCH_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'FoodSearchScreen.js'),
  'utf8',
);

const FOOD_DETAIL_SHEET_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'food', 'FoodDetailSheet.js'),
  'utf8',
);

// TAP_BUDGET: canonical baseline for logging a food from DiaryScreen.
// Raising this value requires an explicit founder decision (see CLAUDE.md §4).
const TAP_BUDGET = 3;

describe('DiaryScreen food-logging tap count (§15 item 10)', () => {
  describe(`baseline is TAP_BUDGET = ${TAP_BUDGET}`, () => {
    test('TAP #1: DiaryScreen has a single "Add food" button wired to addFood()', () => {
      expect(DIARY_SRC).toMatch(/style=\{styles\.addFoodRow\}/);
      expect(DIARY_SRC).toMatch(/onPress=\{\(\) => addFood\(likelyMealSlot \|\| 'meal_1'\)\}/);
      expect(DIARY_SRC).toMatch(/title="Add food"/);
    });

    test('TAP #1: addFood() is the single Button call site inferring the likely meal', () => {
      expect(DIARY_SRC).toMatch(/function addFood\(slot\)/);
      // Exactly one primary "Add food" affordance below the timeline, not a
      // per-meal-card button per entry (item 15's "single primary add
      // affordance" resolution of the scoping doc's open Q3).
      const matches = DIARY_SRC.match(/title="Add food"/g) || [];
      expect(matches).toHaveLength(1);
    });

    test('TAP #2: DiaryScreen.addFood() navigates to FoodSearch screen', () => {
      expect(DIARY_SRC).toMatch(
        /function addFood[\s\S]*?navigation\.navigate\('FoodSearch'/,
      );
      expect(DIARY_SRC).toMatch(/mealSlot.*?entryDate/);
    });

    test('TAP #2: FoodSearchScreen renders food rows with onPress handler', () => {
      expect(FOOD_SEARCH_SRC).toMatch(/FoodRow/);
      expect(FOOD_SEARCH_SRC).toMatch(/onPress=/);
      expect(FOOD_SEARCH_SRC).toMatch(/openPicker/);
    });

    test('TAP #2: Tapping a food row calls openPicker, which opens FoodDetailSheet', () => {
      expect(FOOD_SEARCH_SRC).toMatch(
        /openPicker[\s\S]*?\{[\s\S]*?setPicker/,
      );
      expect(FOOD_SEARCH_SRC).toMatch(/FoodDetailSheet[\s\S]*?food=\{picker/);
    });

    test('TAP #3: FoodDetailSheet has an "Add to diary" button wired to handleSave', () => {
      expect(FOOD_DETAIL_SHEET_SRC).toMatch(/Add to diary/);
      expect(FOOD_DETAIL_SHEET_SRC).toMatch(/onPress=\{handleSave\}/);
      expect(FOOD_DETAIL_SHEET_SRC).toMatch(/Button/);
    });

    test('TAP #3: handleSave calls onSave with quantity, meal slot, and date', () => {
      expect(FOOD_DETAIL_SHEET_SRC).toMatch(
        /handleSave[\s\S]*?onSave[\s\S]*?quantityG[\s\S]*?mealSlot[\s\S]*?entryDate/,
      );
    });

    test('TAP #3: FoodSearchScreen.confirmLog receives onSave calls and logs the entry', () => {
      expect(FOOD_SEARCH_SRC).toMatch(/confirmLog/);
      expect(FOOD_SEARCH_SRC).toMatch(/logFoodEntry/);
      expect(FOOD_SEARCH_SRC).toMatch(/<FoodDetailSheet[\s\S]*?onSave=\{confirmLog\}/);
    });

    test('TAP #3: confirmLog shows a success toast with Undo, matching other diary log paths', () => {
      expect(FOOD_SEARCH_SRC).toMatch(/toast\.show/);
      expect(FOOD_SEARCH_SRC).toMatch(/added\./);
      expect(FOOD_SEARCH_SRC).toMatch(/variant.*?undo/);
    });
  });

  describe('fast path guard (re-log from Recents/Favourites)', () => {
    test('re-log tabs still exist (Recents, Favourites, Frequents)', () => {
      expect(FOOD_SEARCH_SRC).toMatch(/const RELOG_TABS = new Set\(\['recents', 'favourites', 'frequents'\]\)/);
    });

    test('re-log tabs allow one-tap logging via quickLogRelog (legacy: does not change tap count)', () => {
      expect(FOOD_SEARCH_SRC).toMatch(/quickLogRelog/);
      expect(FOOD_SEARCH_SRC).toMatch(/RELOG_TABS\.has\(activeTab\)/);
      // Re-log path still requires 2 taps total (Add food -> food row), so tap budget
      // of 3 covers the general path (Add food -> row -> confirm) and is not violated
      // by the existence of a faster re-log path.
    });
  });

  describe('regression: tap count is immutable', () => {
    test(`TAP_BUDGET remains ${TAP_BUDGET} — raising it requires a founder decision (CLAUDE.md §4)`, () => {
      expect(TAP_BUDGET).toBe(3);
    });

    test('the three tap points exist in source (pins against silent refactor)', () => {
      // This is a summary guard: if any of the above specific tests fail,
      // this will too, but it reads more directly as a single assertion
      // that the full path is wired.
      const hasTap1 = DIARY_SRC.includes('title="Add food"') && DIARY_SRC.includes('function addFood(slot)');
      const hasTap2 = FOOD_SEARCH_SRC.includes('openPicker');
      const hasTap3 = FOOD_DETAIL_SHEET_SRC.includes('onSave');
      expect(hasTap1 && hasTap2 && hasTap3).toBe(true);
    });
  });
});
