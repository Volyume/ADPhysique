# Logger: the set sheet opening on a blank tap (2026-10-11)

## Founder reports, verbatim

1. "This note thing keeps popping up when I select a box to enter weight or rep not when pressing note button. Troubleshoot and fix"
2. "It's when I click a blank area to get the keyboard down. Maybe we need an Ok button alongside Log. Change Log to Log Set. But also stop Notes pop up when clicking blank area."

Screenshots: the "Next set" sheet ("Note for this set", "Save note") over Incline Machine Press, set 1 being entered; then set 2 being typed (reps well open, the keyboard bar reading "Log").

## Mechanism (read in the code, not inferred)

- Every set row that has a sheet (the set being entered and every logged set) is a `Pressable` whose only job is a 300 ms hold that opens the set sheet (`SetRow.js`, `onLongPressRow`; `ActiveWorkoutScreen.js` sets `setRowSheet({ kind: 'next', title: 'Next set' })`).
- A `Pressable` claims the touch whether or not it has an `onPress` (React Native 0.81.5 `Pressability.onStartShouldSetResponder` returns `!disabled`).
- The session's scroll view has `keyboardShouldPersistTaps="handled"`: a tap the scroll view's children do not claim puts the keyboard away; a tap a child claims does not.
- So a tap on the blank part of those rows (an empty Last column, the space around the set number, the row's padding) never put the keyboard away, and a finger that rested 300 ms opened the sheet. Pending rows are plain views, so the same tap on them did put the keyboard away, which made the fault look random.
- A first fix (same day, before report 2) closed two smaller routes into the row: the typed field filled only one text line of its 44 dp box, and the 8 dp gap between the boxes was row space. Kept: both were real.

## The fix

- While the phone's keyboard is up, the rows stand aside: the hold is off and a tap on a row's blank space reaches the scroll view, which puts the keyboard away; the keyboard going away closes the box through the existing path (`keyboardDidHide`, audit C6), keeping what was typed.
- The keyboard bar gains "OK" beside the logging action: it closes the box and the keyboard, keeping the typed numbers, without logging. Not shown while editing a logged set, where the last action is already "Done".
- The logging action reads "Log set" (was "Log"), spoken the same.
