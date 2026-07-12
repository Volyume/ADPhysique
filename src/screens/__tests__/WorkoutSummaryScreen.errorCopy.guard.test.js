/**
 * EP-20/UI-10 (Codex end-user-polish audit): handleDone's save-failure copy
 * told the user to "check your connection", but the failing call
 * (updateWorkout, saving session notes/ratings) is a LOCAL SQLite write
 * (src/lib/database.js), never a network call. A user on a genuinely broken
 * local write would be sent to check Wi-Fi rather than told the true,
 * actionable thing: retry the on-device save.
 *
 * Source guard: WorkoutSummaryScreen has no existing colocated render-test
 * harness (unlike WorkoutHistoryScreen/CardioHistoryScreen etc.), and
 * standing one up just for this string is out of scope for this fix, so this
 * pins the exact corrected source instead.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'WorkoutSummaryScreen.js'),
  'utf8',
);

describe('WorkoutSummaryScreen local-save failure never claims a connection problem', () => {
  test('updateWorkout is a local write, not a network call', () => {
    expect(src).toMatch(/import \{[\s\S]*?updateWorkout[\s\S]*?\} from '\.\.\/lib\/database';/);
  });

  test('the save-error copy no longer says "check your connection"', () => {
    expect(src).not.toMatch(/check your connection/i);
  });

  test('the save-error copy says the true, on-device thing', () => {
    expect(src).toContain(
      "'Could not save your session notes and ratings on your device. Try Close again.'",
    );
  });
});
