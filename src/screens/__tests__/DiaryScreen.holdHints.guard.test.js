/**
 * Source guard for the Wave A C7 "hold" discoverability hints (2026-07-03).
 *
 * Three long-press-only fast paths had no visible affordance for a sighted
 * user (accessibilityHint/accessibilityLabel only): editing a food's portion
 * from a re-log row (FoodSearchScreen), moving water in 500ml steps here, and
 * starting multi-select on a diary entry here. Each now gets a one-time
 * caption (the '@volyume_seen_*' convention already used by
 * ActiveWorkoutScreen's info-button tip), shown until the user performs the
 * gesture it describes or dismisses it directly.
 *
 * This is a source-level regex guard, matching DiaryScreen.daySwipe.guard's
 * style: DiaryScreen mounts a large dependency graph (sync, coaching engine,
 * store) that a full render harness would need to stub extensively for a
 * screen with no existing render test, so the contract worth pinning here is
 * the source wiring itself — in particular that discovering the hints is
 * wired WITHOUT touching enterSelection's body, the MealSection long-press
 * wiring, or the water row's own long-press handlers (do-not-touch list from
 * the task: the gesture, the selection bar logic, ED-flag areas, read-only
 * lapse mode).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'DiaryScreen.js'),
  'utf8',
);

describe('DiaryScreen hold-to-discover hints (Wave A C7)', () => {
  test('imports the shared HintCaption component', () => {
    expect(SRC).toMatch(/import HintCaption from '\.\.\/components\/HintCaption';/);
  });

  test('one-time hint flags follow the existing @volyume_seen_* convention', () => {
    expect(SRC).toMatch(/const DIARY_FOOD_HINT_KEY = '@volyume_seen_diary_food_hint';/);
    expect(SRC).toMatch(/const DIARY_WATER_HINT_KEY = '@volyume_seen_diary_water_hint';/);
  });

  test('both hints default to hidden and only show when the stored flag is not "true"', () => {
    expect(SRC).toMatch(
      /AsyncStorage\.getItem\(DIARY_FOOD_HINT_KEY\)\.then\(\(v\) => \{\s*if \(active && v !== 'true'\) setShowFoodHint\(true\);\s*\}\)/,
    );
    expect(SRC).toMatch(
      /AsyncStorage\.getItem\(DIARY_WATER_HINT_KEY\)\.then\(\(v\) => \{\s*if \(active && v !== 'true'\) setShowWaterHint\(true\);\s*\}\)/,
    );
  });

  test('dismissing either hint persists the flag so it never returns', () => {
    expect(SRC).toMatch(
      /const dismissFoodHint = useCallback\(\(\) => \{\s*setShowFoodHint\(false\);\s*AsyncStorage\.setItem\(DIARY_FOOD_HINT_KEY, 'true'\)\.catch\(\(\) => \{\}\);\s*\}, \[\]\);/,
    );
    expect(SRC).toMatch(
      /const dismissWaterHint = useCallback\(\(\) => \{\s*setShowWaterHint\(false\);\s*AsyncStorage\.setItem\(DIARY_WATER_HINT_KEY, 'true'\)\.catch\(\(\) => \{\}\);\s*\}, \[\]\);/,
    );
  });

  test('enterSelection itself is untouched (selection bar logic unchanged)', () => {
    expect(SRC).toMatch(
      /const enterSelection = useCallback\(\(entry\) => \{\s*setSelectionMode\(true\);\s*setSelectedIds\(new Set\(\[entry\.id\]\)\);\s*\}, \[\]\);/,
    );
  });

  test('the food hint is dismissed by watching selectionMode, not by editing enterSelection', () => {
    expect(SRC).toMatch(
      /useEffect\(\(\) => \{\s*if \(selectionMode\) dismissFoodHint\(\);\s*\}, \[selectionMode, dismissFoodHint\]\);/,
    );
  });

  test('MealSection still wires the long-press straight to enterSelection', () => {
    expect(SRC).toMatch(/onLongPressEntry=\{enterSelection\}/);
  });

  test('the water row long-press handlers are unchanged (still onSub(500) / onAdd(500))', () => {
    expect(SRC).toMatch(/onLongPress=\{\(\) => onSub\(500\)\}/);
    expect(SRC).toMatch(/onLongPress=\{\(\) => onAdd\(500\)\}/);
  });

  test('the water hint is dismissed via the onAdd/onSub wrapper at the call site, not inside WaterRow', () => {
    expect(SRC).toMatch(
      /onAdd=\{\(amount\) => \{ logWaterDelta\(amount\); if \(amount >= 500\) dismissWaterHint\(\); \}\}/,
    );
    expect(SRC).toMatch(
      /onSub=\{\(amount\) => \{ logWaterDelta\(-amount\); if \(amount >= 500\) dismissWaterHint\(\); \}\}/,
    );
  });

  test('the diary meals caption renders once, combining both diary food hints, gated off in read-only and selection mode', () => {
    expect(SRC).toMatch(
      /\{showFoodHint && !readOnly && !selectionMode \? \(\s*<HintCaption\s*text="Hold a food to edit the portion\. Hold to select several\."\s*onDismiss=\{dismissFoodHint\}\s*\/>\s*\) : null\}/,
    );
  });

  test('the water caption renders inside WaterRow, gated off in read-only', () => {
    expect(SRC).toMatch(
      /\{showHint && !readOnly \? \(\s*<HintCaption\s*text="Hold to add 500 ml\."\s*onDismiss=\{onDismissHint\}\s*style=\{styles\.waterHint\}\s*\/>\s*\) : null\}/,
    );
  });

  test('WaterRow accepts the hint props and DiaryScreen passes them through', () => {
    expect(SRC).toMatch(/showHint = false, onDismissHint,/);
    expect(SRC).toMatch(/showHint=\{showWaterHint\}/);
    expect(SRC).toMatch(/onDismissHint=\{dismissWaterHint\}/);
  });
});
