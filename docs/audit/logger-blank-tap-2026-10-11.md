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

## Third report and the decision (same day)

3. "It's really annoying notes popping up the whole time when I don't press the notes button alongside Log"

Decision (lead, under the founder's standing delegation): nothing opens the set sheet but a deliberate press on its own button. The row hold is removed outright, not only while typing.

- The set being entered: a Note action on the keyboard bar, beside OK and Log set, on the set's last box (reps, or time), where the bar has room; on the weight box Next leads to it. Note puts the keyboard away, keeps the typed numbers and opens "Next set" with "Note for this set".
- A logged set: its green tick is the button for its sheet (its note, Edit set, Delete set), spoken "Set 1 options"; opening it cancels a pending auto-advance, as the hold did (audit D4). Delete stays reachable only through a deliberate press.
- With no hold, a set row is a plain view again, so a tap on its blank space always puts the keyboard away.

## Fourth report: "Discard changes?" on a box tap (same day)

4. "Sometimes when I press a box it does this too. The logger is buggy as f" (screenshot: "Discard changes? Your change to this set is not saved." over Machine Lateral Raise; set 1 logged as 40 kg x 50, its reps box showing 20 with the editing edge.)

Mechanism (read in the code): tapping a logged set's box opens an edit of that set. The keyboard going away by any route but Done (a blank tap, an iOS drag, Android back) closed the box (`keyboardDidHide`: entry and edit field cleared) but left the edit itself open and unsaved, invisible. The next tap on any other box found that unsaved change and asked "Discard changes?" (D220 addendum 28, 3b). The blank-tap fix earlier today made the keyboard go away that way more often, so the prompt came more often.

Decision (lead, under the founder's standing delegation; amends D220 addendum 28, 3b, whose concern was a change lost silently): leaving an edit saves it. The keyboard going away by any route, or a tap on another box, saves the change to the logged set; nothing asks. A change that cannot be saved (an empty or out-of-range number) shows the existing reason and the box stays open. An exercise change still closes an edit unsaved, as before (saving there would write against the new exercise); noted, not changed.

## Fifth report: the freeze when scrolling down (same day)

5. "Another logger bug, this happens then it crashes when scrolling down. Error is on sentry" (screenshots: the logger with the keyboard bar riding on a keyboard part-way down the screen and a black band above it where the keyboard had been; then iOS's "Volyume Crashed".)

Observed: Sentry VOLYUME-3J, "App Hanging: App hanging for at least 2000 ms", 2026-10-11 08:28:59 UTC (09:29 on the founder's phone, Europe/London), release 2.13.0 (81), iPhone18,2, iOS 27.2. Main thread in UIKit layout: CA::Transaction::commit, -[UIView layoutSublayersOfLayer:], -[UIView _updateSafeAreaInsets], -[UIView _safeAreaInsetsForFrame:inSuperview:ignoreViewController:]. No JavaScript error: the app froze in layout and iOS ended it.

Read in the code: the session scroll view lets a scroll drag the keyboard down on iOS (keyboardDismissMode 'interactive'), the screen sits in a KeyboardAvoidingView whose bottom padding follows the keyboard, the keyboard bar rides the keyboard as an InputAccessoryView, and every layout of the scroll view while a box is open fires an animated programmatic scroll to keep the row above the bar (scrollRowAboveBar, audit C4). The screenshot is the half-dragged state: keyboard part-way down, the bar on it, the padding still at the full keyboard height.

Inference (not reproduced on a device here): during the drag these feed each other; the padding change relays out the scroll view, which fires an animated scroll against the finger, which moves the keyboard again; UIKit's layout loops until the watchdog ends the app.

Fix: the scroll view never drags the keyboard (iOS now as Android: 'none'); the keyboard goes away by a blank tap, OK, Log set or Done. And no programmatic scroll while the person's finger is moving the list. Both inputs to the loop are removed.
