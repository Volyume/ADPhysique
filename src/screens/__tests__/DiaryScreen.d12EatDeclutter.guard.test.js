/**
 * D12 (ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md §D12, founder
 * direct order): three changes to the Eat diary, source-level guard in the
 * same fs.readFileSync + regex idiom as DiaryScreen.holdHints.guard.test.js
 * and DiaryScreen.foodLogTapCount.guard.test.js (DiaryScreen mounts a large
 * dependency graph, so a full render harness is not the contract worth
 * pinning here -- the source wiring is).
 *
 *   1. The diary's day-level "Vitamins and minerals" panel (MicronutrientPanel,
 *      MN-1) is gone: no import, no render, no dead style. Confirmed diary-only
 *      before removal (no other screen imported it); the female-athlete iron
 *      awareness content (lib/femaleNutritionAwareness.js, rendered on
 *      NutritionTargetsScreen) is a separate module that never routed through
 *      this panel, so it is untouched and out of scope for this guard.
 *   2. The bulk "Mark as eaten" / "Clear" planned-meals control has moved
 *      below the meal sections, WaterRow, and banking rows, to the true
 *      bottom of the scrollable diary page. Per-meal marking
 *      (onConfirmPlanned on MealSection) stays the primary interaction and is
 *      unmoved. Same gating (`plannedCount > 0 && !selectionMode`) and the
 *      same two buttons/copy, just relocated.
 *   3. A one-time hint (the existing '@volyume_seen_*' once-ever convention,
 *      same idiom as showFoodHint/showWaterHint) teaches that planned meals
 *      can be confirmed one by one or all at once, since the bulk control no
 *      longer sits next to where planned meals first appear.
 *
 * RE-POINTED (D231, app layout rework batch 3, owner-approved
 * docs/app-rework-2026-10/SPEC.md): items 2 and 3 are superseded by ONE
 * planned-meals line ("3 planned meals . Mark all eaten . Clear") at the top
 * of the meals, which replaces both the bottom banner (item 2) and the two
 * hint captions (item 3). Item 1 (the micronutrient panel stays gone) is
 * unchanged. The per-meal "Mark as eaten" (the primary interaction) is
 * unchanged. The line's behaviour is mounted in
 * DiaryScreen.batch3Nutrition.test.js; this file keeps the source guards.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'DiaryScreen.js'), 'utf8');

describe('D12 item 1: diary micronutrient panel removed', () => {
  test('no import of, or reference to, MicronutrientPanel remains', () => {
    expect(SRC).not.toMatch(/MicronutrientPanel/);
  });

  test('the now-dead micronutrientWrap style is gone', () => {
    expect(SRC).not.toMatch(/micronutrientWrap/);
  });

  test('the component file and its dedicated tests were deleted, not left orphaned', () => {
    const componentPath = path.join(__dirname, '..', '..', 'components', 'food', 'MicronutrientPanel.js');
    const componentTestPath = path.join(__dirname, '..', '..', 'components', 'food', '__tests__', 'MicronutrientPanel.test.js');
    expect(fs.existsSync(componentPath)).toBe(false);
    expect(fs.existsSync(componentTestPath)).toBe(false);
  });

  test('MacroRings, the calorie/macro display, is untouched', () => {
    expect(SRC).toMatch(/<MacroRings\b/);
  });
});

describe('D231 (was D12 item 2): the bulk mark-as-eaten is the planned-meals line, not a banner', () => {
  test('the planned-meals line carries the same gating and the same two handlers the banner had', () => {
    expect(SRC).toMatch(/import PlannedMealsLine from '\.\.\/components\/food\/PlannedMealsLine';/);
    expect(SRC).toMatch(
      /\{plannedCount > 0 && !selectionMode \? \(\s*<PlannedMealsLine\s+count=\{plannedCount\}\s+canMarkEaten=\{!isFutureDay\}\s+onMarkAllEaten=\{handleConfirmPlanned\}\s+onClear=\{handleClearPlanned\}/,
    );
  });

  test('the bottom banner and its two Buttons are gone', () => {
    expect(SRC).not.toMatch(/plannedBanner/);
    expect(SRC).not.toMatch(/plannedBtn/);
    expect(SRC).not.toMatch(/title="Mark as eaten"/);
    expect(SRC).not.toMatch(/planned \{plannedCount === 1/);
  });

  test('per-meal marking (the primary interaction) is still wired on MealSection, unmoved', () => {
    expect(SRC).toMatch(/onConfirmPlanned=\{!isFutureDay \? \(\) => handleConfirmPlannedSlot\(slot\.key\) : undefined\}/);
  });

  test('the line renders BEFORE the meal sections (the top of the meals), not at the foot of the page', () => {
    const lineIdx = SRC.indexOf('<PlannedMealsLine');
    const mealSectionsIdx = SRC.indexOf('visibleSlots.map(');
    const waterRowIdx = SRC.indexOf('<WaterRow');
    expect(lineIdx).toBeGreaterThan(-1);
    expect(mealSectionsIdx).toBeGreaterThan(-1);
    expect(lineIdx).toBeLessThan(mealSectionsIdx);
    expect(lineIdx).toBeLessThan(waterRowIdx);
  });
});

describe('D231 (was D12 item 3): the two one-time hint captions are retired with the line that replaces them', () => {
  test('no HintCaption is imported or rendered by the Diary (the water caption lives inside WaterRow)', () => {
    expect(SRC).not.toMatch(/HintCaption/);
  });

  test('the mark-eaten and plan-added hint flags, state and copy are gone', () => {
    expect(SRC).not.toMatch(/DIARY_MARKEATEN_HINT_KEY|markeaten_hint/);
    expect(SRC).not.toMatch(/DIARY_PLANADDED_HINT_KEY|planadded_hint/);
    expect(SRC).not.toMatch(/showMarkEatenHint|showPlanAddedHint|dismissMarkEatenHint|dismissPlanAddedHint/);
    expect(SRC).not.toMatch(/Tick meals off/);
    expect(SRC).not.toMatch(/Your meals are in the diary/);
  });
});
