/**
 * P9 TalkBack fixes (audit 2026-07-02, two flows: log-a-set, log-a-food).
 * Source-level pins so the screen-reader repairs cannot silently regress:
 *   - the rest timer is NOT a per-second live region (TalkBack announced
 *     every tick, speaking the entire rest aloud); the spoken surface is the
 *     two edges, rest started and rest over;
 *   - logging and editing a set speaks a confirmation (the haptic and the
 *     amber flash are silent to a screen reader);
 *   - the in-flight save state is exposed to TalkBack on the three
 *     save-path buttons, not just visually dimmed;
 *   - the diary entry row exposes delete as an accessibility custom action
 *     (swipe-to-delete is a pan gesture TalkBack captures for navigation);
 *   - the food inputs that relied on placeholders carry real labels.
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

describe('P9: rest timer speaks edges, never every tick', () => {
  const src = read('src/components/RestTimer.js');
  test('no live region anywhere in the timer', () => {
    expect(src).not.toMatch(/accessibilityLiveRegion/);
  });
  test('both spoken edges exist', () => {
    expect(src).toMatch(/announceForAccessibility\('Rest timer started'\)/);
    expect(src).toMatch(/announceForAccessibility\('Rest over\. Start your next set\.'\)/);
  });
});

describe('P9: logging a set is spoken', () => {
  const src = read('src/screens/ActiveWorkoutScreen.js');
  test('set logged and set updated announcements exist', () => {
    expect(src).toMatch(/Set \$\{setNumber\} logged/);
    expect(src).toMatch(/announceForAccessibility\('Set updated'\)/);
  });
  test('every save-path button exposes the in-flight state', () => {
    // Stale pin -> corrected: the ActiveWorkoutScreen dedicated Button-
    // adoption pass (design campaign 2026-07-09) moved the save-path CTAs
    // onto the shared <Button>, which unconditionally merges `disabled`
    // into accessibilityState itself (components/Button.js:
    // `mergedAccessibilityState` sets `disabled: isDisabled`), so the inline
    // `accessibilityState={{ disabled: saving }}` literal this test used to
    // pin is now redundant at the call site, not dropped a11y coverage. Pin
    // the equivalent guarantee instead: a Button-rendered save-path CTA
    // wired with `disabled={saving}`, backed by Button.js always merging it.
    // Re-anchored 2026-07-11 (R4/D43 S3): the count is TWO, down from
    // three, because the third CTA ("Log another set") was retired by
    // design - the bar's permanent primary logs the extra set in the same
    // gesture, so there is no separate button left to carry the state. The
    // two survivors are Finish cluster and the main Log set primary.
    // Window widened 300 -> 500: the main primary's opening tag grew past
    // 300 chars when its style line gained the R4 warm-up branch.
    const buttonDisabledHits = src.match(/<Button[\s\S]{0,500}?disabled=\{saving\}/g) ?? [];
    expect(buttonDisabledHits.length).toBeGreaterThanOrEqual(2);
    const buttonSrc = read('src/components/Button.js');
    expect(buttonSrc).toMatch(/disabled:\s*isDisabled/);
  });
});

describe('P9/E11: the PR celebration is announced, not just shown', () => {
  test('announceForAccessibility fires on mount, before the subdued branch', () => {
    const src = read('src/components/PRCelebration.js');
    expect(src).toMatch(/announceForAccessibility\([\s\S]{0,40}`Personal record\./);
  });
});

describe('P9: diary entry row is a button with a delete action', () => {
  const src = read('src/components/food/EntryRow.js');
  test('row role and custom delete action', () => {
    expect(src).toMatch(/accessibilityRole="button"/);
    expect(src).toMatch(/\{ name: 'delete', label: 'Delete entry' \}/);
    expect(src).toMatch(/onAccessibilityAction/);
  });
});

describe('P9: placeholder-only inputs now carry labels', () => {
  test('food search box', () => {
    expect(read('src/screens/FoodSearchScreen.js'))
      .toMatch(/accessibilityLabel="Search foods or brands"/);
  });
  test('quick add: all four macro inputs', () => {
    const src = read('src/components/food/QuickAddSheet.js');
    expect(src).toMatch(/accessibilityLabel="Calories"/);
    expect(src).toMatch(/'Protein in grams'/);
    expect(src).toMatch(/'Carbohydrates in grams'/);
    expect(src).toMatch(/'Fat in grams'/);
  });
  test('save-as-meal name input', () => {
    expect(read('src/screens/DiaryScreen.js'))
      .toMatch(/accessibilityLabel="Meal name"/);
  });
});
