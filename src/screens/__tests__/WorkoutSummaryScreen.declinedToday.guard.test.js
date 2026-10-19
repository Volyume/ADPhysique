/**
 * "Cannot do this?" answered "Just for today" (founder flow polish,
 * 2026-10-19): the summary asks once whether it was a one-off or belongs in
 * Injuries & limitations.
 *
 * This suite pins:
 *  1. ActiveWorkoutScreen records the swap on the session's effects record
 *     ONLY on the "Just for today" path (workAroundSwapRef), under its own
 *     effect name 'declined_today' - never 'omitted' or 'substituted', so
 *     coaching, the check-in and the block ledger never count it.
 *  2. The summary card renders on the live finish only (never a history
 *     reopen), skips a movement the user went back to and trained, and
 *     "Add it" opens How you train pre-filled with the movement names
 *     (the add flow asks permanent-or-temporary and offers the plan
 *     update itself). "Just today" writes nothing.
 *  3. The app never asks about pain here (CC29 "No pain scales"): the card
 *     says the user could not do the movement, never that it hurt.
 *
 * Source-level, like the constraintEffectLine guard beside it: this
 * screen's real data loads make a full render harness fragile.
 */
const fs = require('fs');
const path = require('path');

const summary = fs.readFileSync(path.join(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');
const active = fs.readFileSync(path.join(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');

function cardBlock() {
  const start = summary.indexOf('{!readOnly && declinedToday.length > 0 ? (');
  expect(start).toBeGreaterThan(-1);
  return summary.slice(start, summary.indexOf(') : null}', start));
}

describe('ActiveWorkoutScreen records a "Just for today" swap', () => {
  const at = active.indexOf("effect: 'declined_today'");
  const block = active.slice(active.lastIndexOf('if (workAroundSwapRef', at), active.indexOf('}]).catch(', at) + 30);

  test('only on the "Cannot do this?" path, under its own effect name', () => {
    expect(at).toBeGreaterThan(-1);
    expect(block).toMatch(/workAroundSwapRef\.current/);
    expect(block).toMatch(/appendSessionConstraintEffects\(/);
    expect(block).not.toMatch(/effect: '(omitted|substituted)'/);
  });

  test('a failed write never fails the swap', () => {
    expect(block).toMatch(/\.catch\(\(\) => \{/);
  });
});

describe('WorkoutSummaryScreen asks once whether it was a one-off', () => {
  test('the card is live-finish only', () => {
    expect(cardBlock()).toMatch(/^\{!readOnly && /);
    expect(summary).toMatch(/if \(readOnly \|\| !user\?\.id \|\| !workoutId\) return undefined;[\s\S]{0,400}?'declined_today'/);
  });

  test('a movement the user went back to and trained is not asked about', () => {
    expect(summary).toMatch(/e\?\.effect === 'declined_today' && e\.exerciseFrom && !trained\.has\(e\.exerciseFrom\)/);
  });

  test('"Add it" opens How you train pre-filled with the movements', () => {
    expect(cardBlock()).toMatch(/navigation\.navigate\('HowYouTrain', \{ preselect: \{ kind: 'exercise', exerciseNames \} \}\)/);
  });

  test('"Just today" only closes the card', () => {
    expect(cardBlock()).toMatch(/title="Just today"[\s\S]*?onPress=\{\(\) => \{ hapticSelection\(\); setDeclinedToday\(\[\]\); \}\}/);
  });

  test('never asks about pain', () => {
    expect(cardBlock()).toMatch(/You could not do \$\{joinNames\(declinedToday\)\} today\./);
    expect(cardBlock()).not.toMatch(/\bpain|hurt|twinge/i);
  });
});
