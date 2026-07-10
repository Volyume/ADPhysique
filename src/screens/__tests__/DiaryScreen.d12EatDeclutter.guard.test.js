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
 *      below the flat timeline, WaterRow, and banking rows, to the true
 *      bottom of the scrollable diary page. Per-entry marking
 *      (onConfirmPlanned on TimelineEntryRow -- re-homed by Ultimate-Audit
 *      item 15, D22 15a/15b, from MealSection's retired per-meal button once
 *      the meal-card layout became a flat chronological timeline) stays the
 *      primary interaction and is unmoved. Same gating
 *      (`plannedCount > 0 && !selectionMode && !readOnly`) and the same two
 *      buttons/copy, just relocated.
 *   3. A one-time hint (the existing '@volyume_seen_*' once-ever convention,
 *      same idiom as showFoodHint/showWaterHint) teaches that planned meals
 *      can be confirmed one by one or all at once, since the bulk control no
 *      longer sits next to where planned meals first appear.
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

describe('D12 item 2: bulk mark-as-eaten demoted to the bottom of the page', () => {
  test('the planned banner (bulk Mark as eaten + Clear) still exists with its original gating and copy', () => {
    expect(SRC).toMatch(/\{plannedCount > 0 && !selectionMode && !readOnly \? \(\s*<View style=\{styles\.plannedBanner\}>/);
    expect(SRC).toMatch(/title="Mark as eaten"/);
    expect(SRC).toMatch(/onPress=\{handleConfirmPlanned\}/);
    expect(SRC).toMatch(/title="Clear"/);
    expect(SRC).toMatch(/onPress=\{handleClearPlanned\}/);
  });

  // Ultimate-Audit item 15 (D22 15a/15b): MealSection's per-meal "Mark
  // eaten" button is gone with the meal-card layout; the primary
  // interaction is now per-ENTRY, wired on TimelineEntryRow via
  // handleConfirmPlannedEntry, still gated on write-capability and the day
  // not being in the future.
  test('per-entry marking (the primary interaction) is wired on TimelineEntryRow, unmoved', () => {
    expect(SRC).toMatch(/onConfirmPlanned=\{!readOnly && !isFutureDay \? \(\) => handleConfirmPlannedEntry\(entry\) : undefined\}/);
  });

  test('the bulk banner now renders AFTER WaterRow (true bottom of the page), not before the timeline', () => {
    const waterRowIdx = SRC.indexOf('<WaterRow');
    const bannerIdx = SRC.indexOf('<View style={styles.plannedBanner}>');
    const timelineIdx = SRC.indexOf('timeline.map(');
    expect(waterRowIdx).toBeGreaterThan(-1);
    expect(bannerIdx).toBeGreaterThan(-1);
    expect(timelineIdx).toBeGreaterThan(-1);
    expect(bannerIdx).toBeGreaterThan(waterRowIdx);
    expect(bannerIdx).toBeGreaterThan(timelineIdx);
  });

  test('the relocated banner sits inside the ScrollView, just before it closes', () => {
    const bannerIdx = SRC.indexOf('<View style={styles.plannedBanner}>');
    const scrollCloseIdx = SRC.indexOf('</ScrollView>');
    expect(scrollCloseIdx).toBeGreaterThan(bannerIdx);
    // Nothing but the banner's own closing tags sits between the banner and
    // </ScrollView> other than the ": null}" of its own conditional.
    expect(SRC.slice(bannerIdx, scrollCloseIdx)).not.toMatch(/<WaterRow/);
  });
});

describe('D12 item 3: one-time hint teaching mark-as-eaten', () => {
  test('the hint flag follows the existing @volyume_seen_* once-ever convention', () => {
    expect(SRC).toMatch(/const DIARY_MARKEATEN_HINT_KEY = '@volyume_seen_diary_markeaten_hint';/);
  });

  test('the hint defaults to hidden and only shows when the stored flag is not "true"', () => {
    expect(SRC).toMatch(
      /AsyncStorage\.getItem\(DIARY_MARKEATEN_HINT_KEY\)\.then\(\(v\) => \{\s*if \(active && v !== 'true'\) setShowMarkEatenHint\(true\);\s*\}\)/,
    );
  });

  test('dismissing the hint persists the flag so it never returns', () => {
    expect(SRC).toMatch(
      /const dismissMarkEatenHint = useCallback\(\(\) => \{\s*setShowMarkEatenHint\(false\);\s*AsyncStorage\.setItem\(DIARY_MARKEATEN_HINT_KEY, 'true'\)\.catch\(\(\) => \{\}\);\s*\}, \[\]\);/,
    );
  });

  test('the hint is gated on planned meals actually being present, read-write, and not mid-selection', () => {
    // L08-teach (founder ask 2026-07-09, ux-world-class-audit-2026-07-09):
    // this hint now also stays hidden while the more specific plan-added
    // teach (showPlanAddedHint) is showing, so the two never stack; every
    // other D12 gate (plannedCount, selectionMode, readOnly) is unchanged.
    expect(SRC).toMatch(
      /\{plannedCount > 0 && !selectionMode && !readOnly && !showPlanAddedHint && showMarkEatenHint \? \(\s*<HintCaption/,
    );
  });

  test('the copy is calm, explains both the per-meal and bulk paths, and has no em dash', () => {
    const match = SRC.match(/text="Tick meals off one by one as you eat, or mark them all as eaten at once from the bottom of the page\."/);
    expect(match).toBeTruthy();
    expect(match[0]).not.toMatch(/—/);
  });

  test('marking a planned meal as eaten (bulk or per-entry) counts as discovery and dismisses the hint', () => {
    expect(SRC).toMatch(/if \(n > 0\) dismissMarkEatenHint\(\); \/\/ discovery: bulk mark-as-eaten used/);
    expect(SRC).toMatch(/dismissMarkEatenHint\(\); \/\/ discovery: per-entry mark-as-eaten used/);
  });
});
