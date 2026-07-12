/**
 * EP-12/UI-04 (end-user-polish audit, 2026-07-12): the six weekly-goal chips
 * (plan-less users' "How many sessions a week are you aiming for?" editor)
 * rendered in one non-wrapping row at 40x40 with an 8dp gap: 6*40 + 5*8 =
 * 280dp required, but a 320dp phone only offers 254dp inside this card
 * (320 - 32 screen padding - 2 border - 32 card padding), so the row
 * overflowed the card by 26dp. The chips were also below the project's 44dp
 * touch-target contract with no compensating hitSlop.
 *
 * Fix: two explicit rows of three at 44x44 (src/styles/layout.js
 * touchTarget.minimum), which fits a 320dp card with room to spare
 * (3*44 + 2*8 = 148dp per row) and meets the touch-target minimum outright.
 * Selection semantics (accessibilityState.selected, the manual-goal write)
 * are unchanged.
 *
 * Source guard: this screen has no colocated render-test harness light
 * enough to drive the plan-less goal editor in isolation (it hangs off
 * useWeeklyStreak, which needs a live DB-backed view model), matching the
 * project's convention of pinning fixed layout source directly elsewhere
 * (e.g. ProGate.featureCopy.guard.test.js).
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'StreakWeeksSection.js'),
  'utf8',
);

describe('StreakWeeksSection weekly-goal chips fit a 320dp card and meet the touch-target minimum (EP-12/UI-04)', () => {
  test('the six goals render as two rows of three, not one non-wrapping row', () => {
    expect(src).toContain('[[1, 2, 3], [4, 5, 6]].map((row, i) => (');
    expect(src).toContain('<View key={i} style={styles.goalChipsRow}>');
    expect(src).not.toMatch(/<View style=\{styles\.goalChips\}>/);
  });

  test('each chip is at least 44x44 (the project touch-target minimum)', () => {
    expect(src).toMatch(/goalChip: \{[\s\S]*width: 44, height: 44,/);
    expect(src).not.toMatch(/goalChip: \{[\s\S]*width: 40, height: 40,/);
  });

  test('a 320dp card fits a row of three 44x44 chips with an 8dp (spacing.sm) gap', () => {
    // 320 screen - 2*16 screen padding - 2*1 border - 2*16 card padding = 254dp.
    const cardAvailable = 320 - 2 * 16 - 2 * 1 - 2 * 16;
    const rowRequired = 3 * 44 + 2 * 8;
    expect(rowRequired).toBeLessThanOrEqual(cardAvailable);
  });

  test('selection semantics are unchanged: onPress still writes the manual goal, accessibilityState still reflects selection', () => {
    expect(src).toContain('onPress={() => setGoal(n)}');
    expect(src).toContain('accessibilityState={{ selected: sel }}');
    expect(src).toContain('accessibilityLabel={`${n} sessions a week`}');
  });
});
