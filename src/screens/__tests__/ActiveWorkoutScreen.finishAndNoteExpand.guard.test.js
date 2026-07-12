/**
 * Two Codex end-user-polish audit findings, both scoped to ActiveWorkoutScreen:
 *
 * EP-20/UI-10 — runFinish's failure alert told the user to "check your
 * connection", but the call that actually throws into this catch
 * (updateWorkout inside doFinish, a few lines above) is a LOCAL SQLite write
 * (src/lib/database.js); the cloud push (syncWorkout) is separately
 * fire-and-forget with its own .catch(() => {}) and can never reach this
 * catch. Rewritten to the true, on-device wording.
 *
 * EP-15/UI-06 — the "next time" coach-note banner clamped the note to 4
 * lines (numberOfLines={4}) with no way to read the rest. A More/Less toggle
 * is added around the note text so the full note stays reachable; the
 * existing "Got it" dismiss action and markNoteShown write are untouched.
 *
 * Source guard: this screen's existing render-based suites
 * (ActiveWorkoutScreen.*.guard.test.js) exercise other surfaces of the same
 * huge component; standing up the full logger + note-fixture render harness
 * just for these two isolated strings is out of scope for this fix, so this
 * pins the exact corrected source instead, matching this screen's own
 * source-guard convention (see ActiveWorkoutScreen.usability.guard.test.js).
 */
const fs = require('fs');
const path = require('path');

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('ActiveWorkoutScreen local-finish failure never claims a connection problem', () => {
  test('the finish-failure alert no longer says "check your connection"', () => {
    const alertBlockMatch = ACTIVE_WORKOUT.match(
      /appAlert\(\s*'Couldn\\'t finish workout',\s*\n\s*'([^']*)',/,
    );
    expect(alertBlockMatch).not.toBeNull();
    expect(alertBlockMatch[1]).not.toMatch(/check your connection/i);
  });

  test('the finish-failure alert says the true, on-device thing', () => {
    expect(ACTIVE_WORKOUT).toContain(
      "'Your sets are still saved, but the workout did not close on your device, so tap Finish workout again.'",
    );
  });

  // Pinned by the sibling suite ActiveWorkoutScreen.usability.guard.test.js
  // ("finish-workout confirmation and retry copy use the same action name"):
  // the retry instruction must keep naming the exact button label, "Finish
  // workout" (not a shortened "Finish"), lowercase "tap" mid-sentence. This
  // fix must not regress that invariant.
  test('still names the exact "Finish workout" button label, matching the sibling pinned invariant', () => {
    expect(ACTIVE_WORKOUT).toContain('tap Finish workout again');
    expect(ACTIVE_WORKOUT).not.toContain('tap Finish again');
  });
});

describe('ActiveWorkoutScreen "next time" note offers a More/Less expand (EP-15/UI-06)', () => {
  test('the note text stays clamped by default but can be expanded', () => {
    expect(ACTIVE_WORKOUT).toMatch(
      /numberOfLines=\{isNoteExpanded \? undefined : 4\}/,
    );
  });

  test('an expand/collapse control exists with accessible labels for both states', () => {
    expect(ACTIVE_WORKOUT).toContain("accessibilityLabel={isNoteExpanded ? 'Show less of this note' : 'Show more of this note'}");
    expect(ACTIVE_WORKOUT).toMatch(/\{isNoteExpanded \? 'Less' : 'More'\}/);
  });

  test('the existing dismiss ("Got it") action and markNoteShown write are untouched', () => {
    expect(ACTIVE_WORKOUT).toContain("try { await markNoteShown(note.id); } catch (_e) {}");
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="Dismiss note"');
  });
});
