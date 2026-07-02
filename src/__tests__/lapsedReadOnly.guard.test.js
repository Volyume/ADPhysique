/**
 * E10 read-only lapse views, source guards (founder decision 2026-07-02:
 * lapsed/free users get FULL READ-ONLY views of their OWN historical data,
 * "view yes, log no"; audit/e10-trial-lapse.md findings F1b/F2/F5).
 *
 * What these pins lock, and why each matters:
 *   1. EXACTLY three routes use the history-aware guard (Diary, BodyMetrics,
 *      ProgressPhotos). Spreading it to any other route would hand a free
 *      user a Pro surface with live write affordances.
 *   2. Every food/cardio MUTATION route stays behind the plain hard guard
 *      (withProGuard), so the read-only diary cannot leak into a write
 *      surface via deep link or stale nav state.
 *   3. Each of the three screens derives its readOnly flag from the STORE
 *      TIER inside the screen (never trusts a prop), so an alternative
 *      registration can never mount a mutable screen for a free user.
 *   4. The guard's history read fails CLOSED (error -> ProLocked).
 *   5. BodyMetrics' auto-seed (a write) is gated off in read-only.
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

const NAV = read('src/navigation/RootNavigator.js');
const PROGATE = read('src/components/ProGate.js');

describe('E10 read-only lapse views: gating posture', () => {
  test('exactly the three approved routes use withReadOnlyProGuard', () => {
    const uses = NAV.match(/withReadOnlyProGuard\(require\('\.\.\/screens\/(\w+)'\)/g) || [];
    const screens = uses.map((u) => u.match(/screens\/(\w+)'/)[1]).sort();
    expect(screens).toEqual(['BodyMetricsScreen', 'DiaryScreen', 'ProgressPhotosScreen']);
  });

  test('every food/cardio mutation route stays behind the plain hard guard', () => {
    // These screens WRITE (log, scan, build, plan). If any moves to the
    // history-aware guard, a lapsed user gets a live write surface.
    const hardLocked = [
      'FoodSearchScreen', 'AddCustomFoodScreen', 'ScanBarcodeScreen',
      'ScanLabelScreen', 'MealPlanScreen', 'MyRecipesScreen', 'MyMealsScreen',
      'RecipeBuilderScreen', 'FoodInsightsScreen', 'LogCardioScreen',
      'CardioHistoryScreen', 'WeeklyCheckInScreen', 'NutritionTargetsScreen',
      'MealNamesScreen', 'PerDayTargetsScreen',
    ];
    for (const screen of hardLocked) {
      expect(NAV).toMatch(new RegExp(`withProGuard\\(require\\('\\.\\./screens/${screen}'\\)`));
    }
  });

  test('the three view-only screens derive readOnly from the store tier internally', () => {
    for (const file of [
      'src/screens/DiaryScreen.js',
      'src/screens/BodyMetricsScreen.js',
      'src/screens/ProgressPhotosScreen.js',
    ]) {
      expect(read(file)).toMatch(/const readOnly = tier !== 'pro';/);
    }
  });

  test("the guard's history read fails CLOSED on error", () => {
    const start = PROGATE.indexOf('export function withReadOnlyProGuard');
    expect(start).toBeGreaterThan(-1);
    const body = PROGATE.slice(start, PROGATE.indexOf('\nexport ', start + 1));
    expect(body).toMatch(/\.catch\(\(\) => \{ if \(active\) setHasData\(false\); \}\)/);
    // And the free branches render ProLocked, never the bare component.
    expect(body).toMatch(/return <ProLocked feature=\{feature\} \/>;/);
  });

  test('BodyMetrics auto-seed (a write) never runs in read-only', () => {
    const src = read('src/screens/BodyMetricsScreen.js');
    expect(src).toMatch(/rows\.length === 0 && onboardingKg && onboardingKg > 0 && !readOnly/);
  });

  test('the read-only diary keeps no scan FAB, planned-meal actions or banking', () => {
    const src = read('src/screens/DiaryScreen.js');
    expect(src).toMatch(/\{!selectionMode && !readOnly \? \(/); // FAB + add-meal block
    expect(src).toMatch(/plannedCount > 0 && !selectionMode && !readOnly/);
    expect(src).toMatch(/bankingAvailable && !selectionMode && !readOnly/);
  });
});
