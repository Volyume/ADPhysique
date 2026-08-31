// The platform minimum touch target. 48dp is Material 3's floor and the
// figure docs/DESIGN_SYSTEM.md has always mandated; Android is Volyume's
// primary platform (live on Google Play, iOS via TestFlight from the same
// codebase). One number serves both, because 48 also clears iOS's 44pt floor
// -- a target larger than the minimum is never a violation.
//
// It was 44, the iOS figure, while `android: 48` sat unreferenced by any app
// code; 78 further sites hard-coded 44 outright, so this was a 78-site edit
// rather than a one-line change until those were consolidated onto the token.
// `android` is kept as an explicit alias so a reader looking for the Material
// number finds it and sees it agrees.
export const touchTarget = Object.freeze({
  minimum: 48,
  android: 48,
});

export const workoutLoggerSize = Object.freeze({
  headerSide: 88,
  headerButtonMin: touchTarget.minimum,
  finishButtonMinWidth: 76,
  exerciseNavMaxHeight: 48,
  exerciseTabMinHeight: 36,
  exerciseTabBadge: 16,
  primaryActionMinHeight: touchTarget.minimum,
  addExerciseMinHeight: 48,
  overflowButton: touchTarget.minimum,
  // Founder device order 2026-08-18: the logger's header actions carry NO
  // container at all now - see WorkoutHeader. This is the bare touch target
  // around each glyph (the same full thumb size the "..." overflow uses).
  headerActionTarget: touchTarget.minimum,
  loggedSetMinHeight: 36,
  setNumberBadge: 22,
  // Wide enough for the longest set-logger field label ("Weight (kg)",
  // "Time (mm:ss)", "Distance (yd)") to sit on ONE line, so every row's label
  // aligns the same way against its stepper. At 68 "Weight (kg)" wrapped to two
  // lines while "Reps" stayed one, which read as misaligned (founder, 2026-07-19).
  setEntryLabelWidth: 96,
  setEntryStepperButton: 36,
  compactSheetOptionMinHeight: 52,
});
