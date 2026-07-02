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

  // Hostile review 2026-07-02 (E10 #1, CRITICAL class): tab screens stay
  // mounted across tab switches, so the tier can flip pro-to-free while a
  // write surface is open. Three layers are pinned: the live-tier re-check in
  // every write handler, the flip-closes effect, and !readOnly on the
  // surfaces' own render conditions.
  test('every diary write handler re-checks the LIVE tier at execution time', () => {
    const src = read('src/screens/DiaryScreen.js');
    expect(src).toMatch(/const canWrite = useCallback\(\(\) => useAppStore\.getState\(\)\.tier === 'pro', \[\]\);/);
    // 15 write paths carry the guard (confirm/clear planned, bank apply/clear,
    // usuals, quick add, multi-select delete/copy/move, save meal, edit-sheet
    // save/delete, water, swipe delete, copy-day).
    const uses = src.match(/canWrite\(\)/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(15);
  });

  test('a pro-to-free flip closes every open write surface in the diary', () => {
    const src = read('src/screens/DiaryScreen.js');
    const effect = src.slice(src.indexOf('if (!readOnly) return;'), src.indexOf('}, [readOnly]);'));
    for (const closer of [
      'setSelectionMode(false)', 'setEditSheet(null)', 'setQuickAddSlot(null)',
      'setMovePickerVisible(false)', 'setSaveMealItems(null)', 'setCopyDays(null)',
      'setBankSheetVisible(false)',
    ]) {
      expect(effect).toContain(closer);
    }
    // Belt and braces on the render conditions too.
    expect(src).toMatch(/visible=\{!!editSheet && !readOnly\}/);
    expect(src).toMatch(/visible=\{!!quickAddSlot && !readOnly\}/);
    expect(src).toMatch(/visible=\{bankSheetVisible && !readOnly\}/);
    expect(src).toMatch(/\{selectionMode && !readOnly \? \(/);
  });

  test('unconfirmed planned scaffolding neither grants the view nor renders in it (E10 #4)', () => {
    expect(read('src/lib/food/db.js')).toMatch(/AND is_planned = 0 LIMIT 1/);
    expect(read('src/screens/DiaryScreen.js'))
      .toMatch(/readOnly \? entries\.filter\(\(e\) => !e\.is_planned\) : entries/);
  });

  test('BodyMetrics mount writes (auto-seed AND legacy migration) are gated off in read-only (E10 #3)', () => {
    const src = read('src/screens/BodyMetricsScreen.js');
    expect(src).toMatch(/rows\.length === 0 && onboardingKg && onboardingKg > 0 && !readOnly/);
    expect(src).toMatch(/if \(!readOnly\) await migrateFromAsyncStorage\(\);/);
  });

  test('the photos guard is user-scoped via the owner marker, failing closed (E10 #2)', () => {
    expect(NAV).toMatch(/photosViewableBy\(userId\)/);
    const lib = read('src/lib/progressPhotos.js');
    expect(lib).toMatch(/if \(!userId\) return false;/);
    expect(lib).toMatch(/catch \(_\) \{ return false; \}/);
  });

  test('the guard races its history read against a fail-closed timeout (E10 #5)', () => {
    expect(PROGATE).toMatch(/setTimeout\(\(\) => \{ if \(active\) setHasData\(false\); \}, 4000\)/);
  });
});
