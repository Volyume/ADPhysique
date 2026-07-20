export const touchTarget = Object.freeze({
  minimum: 44,
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
