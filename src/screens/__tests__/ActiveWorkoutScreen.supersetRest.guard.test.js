/**
 * Source-level regression guard — superset between-round rest (K-1).
 *
 * Content-quality audit (audit/content-quality/plan-builder-techniques.md, SF-1)
 * found that the in-session superset auto-jump matched its partner in BOTH
 * directions (`i !== currentExerciseIndex`), so logging the second half jumped
 * straight back to the first and the ~60-120s post-pair rest timer NEVER fired,
 * contradicting the code's own comment and the evidence-based superset rest norm
 * (minimal rest within the pair, a normal rest after the pair before the next
 * round).
 *
 * The fix jumps only FORWARD to a later partner, so once the later half is
 * logged there is no later partner, the auto-jump falls through, and the rest
 * timer runs. This guard pins that at source so it cannot silently regress. It
 * is a byte-level check (fs + regex), matching the app's founder-rule guards;
 * the full flow is covered by the on-device checklist, not a component mount.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('superset between-round rest (K-1) is not regressed', () => {
  test('the superset auto-jump only targets a LATER partner (i > currentExerciseIndex)', () => {
    expect(SRC).toMatch(
      /findIndex\(\(e, i\) => i > currentExerciseIndex && e\.supersetGroupId === sgi\)/,
    );
  });

  test('the old order-agnostic match that suppressed all rest is gone', () => {
    expect(SRC).not.toMatch(
      /findIndex\(\(e, i\) => i !== currentExerciseIndex && e\.supersetGroupId === sgi\)/,
    );
  });
});
