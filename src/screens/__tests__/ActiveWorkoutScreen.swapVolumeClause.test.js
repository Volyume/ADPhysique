// Pins Ultimate-Audit item 13 (mid-session swap volume clause).
//
// Founder ruling (verbatim), docs/ultimate-audit-2026-06-13/
// pass3-v2-founder-decisions.md:192 (NA-wr-3), reconciled in
// docs/ux-world-class-audit-2026-07-09/ultimate-audit-11-16-reconciliation.md
// item 13:
//   "NA-wr-3: Mid-session swap credits the actual swapped-in exercise's
//   muscle toward weekly volume."
//
// Two things must hold for this to be true and not just asserted copy:
//   1. The swap sheet tells the lifter this, in the same note that already
//      reassures them their saved plan is untouched (ActiveWorkoutScreen.js,
//      "Exercise Swap Modal", styles.swapNote). The clause is unconditional:
//      it shows every time the swap sheet is open, regardless of which
//      candidate gets picked, because it describes what happens to sets
//      logged AFTER the swap, not any one candidate.
//   2. The weekly-volume aggregator actually attributes by the exercise
//      really logged against (ws.exercise_id), not by any pre-swap slot or
//      template identity -- so the swapped-in exercise's own muscle (primary
//      + secondary via allocateExerciseVolume) is what gets credited.
import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);
const DATABASE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'lib', 'database.js'),
  'utf8',
);

describe('mid-session swap volume clause (Ultimate-Audit item 13, NA-wr-3)', () => {
  test('swap sheet note states the volume clause verbatim', () => {
    expect(ACTIVE_WORKOUT).toContain(
      "<Text style={styles.swapNote}>Choose a close match for today. Your plan is not changed, and sets you log count towards the new exercise's own muscle in your weekly volume.</Text>",
    );
  });

  test('the clause sits inside the swap modal, so it is shown every time the swap sheet opens', () => {
    const swapModalWindow = ACTIVE_WORKOUT.match(
      /\{\/\* Exercise Swap Modal \*\/\}[\s\S]*?<\/Modal>/,
    )?.[0] ?? '';
    expect(swapModalWindow).toContain('visible={showSwapModal}');
    expect(swapModalWindow).toContain(
      "sets you log count towards the new exercise's own muscle in your weekly volume.",
    );
    // Unconditional: the note text is not gated behind a candidate pick or
    // any per-item condition -- it renders as soon as the modal is visible,
    // above the ranked candidate list.
    expect(swapModalWindow).toContain('<FlashList');
    const noteIndex = swapModalWindow.indexOf('styles.swapNote');
    const listIndex = swapModalWindow.indexOf('<FlashList');
    expect(noteIndex).toBeGreaterThan(-1);
    expect(listIndex).toBeGreaterThan(noteIndex);
  });

  test('weekly volume is attributed by the actually-logged exercise_id, not any pre-swap identity', () => {
    const fnWindow = DATABASE.match(
      /export async function getWeeklyVolumeByMuscle\([\s\S]*?\n\}/,
    )?.[0] ?? '';
    expect(fnWindow).toContain('ws.exercise_id');
    expect(fnWindow).toContain('const ex = exerciseById[row.exercise_id];');
    expect(fnWindow).toContain('allocateExerciseVolume(ex)');
  });

  test('a swapped-in exercise is what future set writes carry, so post-swap sets land under its own id', () => {
    const swapWindow = ACTIVE_WORKOUT.match(/function handleConfirmSwap\(newExercise\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(swapWindow).toContain('exercise: newExercise,');
    expect(swapWindow).toContain('store.setWorkoutExercises(updatedExercises);');
  });
});
