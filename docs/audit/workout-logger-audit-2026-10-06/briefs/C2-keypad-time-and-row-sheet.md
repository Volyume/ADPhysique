# Lane C2 (Sonnet): the keypad's time mode, the time-entry helper and the row sheet

Authority: `docs/audit/workout-logger-audit-2026-10-06/12-BUILD-SPEC.md`
(sections 1.5, 2, 3, 4), register D220 and its addenda. The lead is wiring
`ActiveWorkoutScreen.js` to these at the same time; the props and the
helper's exports below are the contract the lead codes against, so build
them exactly as named.

Hard bounds (CLAUDE.md section 2): no new dependencies; tokens only (no hex,
no fontSize literal); British English; no em dash anywhere; function
components, `StyleSheet.create` at the bottom; pure helper, no I/O. Never
commit, push or stash. Never touch `ActiveWorkoutScreen.js`, any file under
`src/screens/`, any guard test, or lane C1's files (`SetRow.js`,
`SetTable.js`, `ExerciseSection.js` and their tests). STOP and report rather
than interpret on any conflict with a pinned test in your files.

Files you own (and only these):
- `src/components/workout/session/Keypad.js` and `__tests__/Keypad.test.js`
- `src/components/workout/session/SetRowSheet.js` (new) and `__tests__/SetRowSheet.test.js` (new)
- `src/lib/timeEntry.js` (new) and `src/lib/__tests__/timeEntry.test.js` (new)

Every existing Keypad test must keep passing unchanged unless a change
below requires a re-pin, in which case say so in the report with the line.

## 1. `src/lib/timeEntry.js`: typing a time on a number pad

Pure functions, no I/O, no React. The way a microwave takes a time: digits
enter from the right and the display reads `m:ss`. The buffer is a string
of 0 to 4 digits with no leading zeros kept.

- `pushDigit(buffer, digit)`: appends one digit `'0'`-`'9'`; ignores the
  digit when the buffer already holds 4; a `'0'` pushed onto an empty
  buffer is ignored, so keying "0" then "5" leaves the buffer `'5'`, which
  reads 0:05. Returns the new buffer.
- `popDigit(buffer)`: drops the last digit; `''` stays `''`.
- `bufferToSeconds(buffer)`: `''` → `''` (blank, the field's cleared
  state); `'5'` → 5; `'90'` → 90 (read as 0:90 = 90 s); `'130'` → 90
  (1:30); `'9959'` → 5999 (99:59); `'1075'` → 135 (10:75 = 10 minutes 75
  seconds; seconds over 59 roll into minutes, as a microwave does); the
  result is clamped to 5999, the app's existing maximum (`SetEntry.js`,
  `adjustSecondsFrom`).
- `secondsToBuffer(seconds)`: the inverse for seeding an edit: 90 → `'130'`,
  5 → `'5'`, 0 or blank or non-finite → `''`, 5999 → `'9959'`.
- `bufferToDisplay(buffer)`: what the well shows while typing: `''` → `''`,
  `'5'` → `'0:05'`, `'90'` → `'0:90'` (the raw digits as typed, so the
  person sees what they have keyed), `'130'` → `'1:30'`, `'1075'` →
  `'10:75'`. Minutes are the digits before the last two.

Tests: every example above, the clamp, the 4-digit limit, the inverse
round trip for 0 to 5999 in steps.

## 2. Keypad: time mode

New prop `mode: 'number' | 'time'` (default `'number'`). In time mode:
- no decimal point key (the slot stays an empty gap, as it does for reps);
- the step keys read `−5 s` and `+5 s`, spoken "Remove 5 seconds" and "Add
  5 seconds", and `onStep` is called with `-5` and `5` whatever `step` says;
- the tab row reads the field being edited as "Time" (and, with
  `field === 'weight'` in a distance exercise, "Distance"): add a prop
  `fieldLabel` (string) that, when given, is the active tab's text and the
  spoken "Editing {fieldLabel}" instead of the unit or "Reps";
- Clear, backspace, digits, Next and Done behave as now; `value` is the
  display string the screen passes (`bufferToDisplay`), used only for the
  empty checks.

Keep every existing label and behaviour in number mode byte for byte.

## 3. `SetRowSheet`: the row's overflow

A house `BottomSheet` (`src/components/BottomSheet`), opened by a row's
long-press (12-BUILD-SPEC section 4: "the row's overflow (long-press or the
ellipsis in the footer) opens the set note" and "Delete through the row's
overflow with the existing confirm"). Presentational: it owns the note
draft while open and nothing else.

Props: `visible`, `onClose`, `title` (e.g. "Set 3 · 70 kg × 8" or
"Next set"), `note` (string or null), `canEditNote` (boolean), `onSaveNote`
(called with the trimmed draft; `''` clears), `onEdit` (optional; when
given, a row "Edit set" calls it then closes), `onDelete` (optional; when
given, a row "Delete set" in `colors.error` ink calls it then closes; the
confirm is the screen's, not the sheet's).

Layout: title at `type.title`; then the note: when `canEditNote`, a house
`TextField` (multiline, label "Note for this set", placeholder "Anything
worth remembering") seeded from `note` each time the sheet opens, with a
"Save note" `Button` (primary, disabled while the draft equals the saved
note) that calls `onSaveNote` then `onClose`; when not editable and a note
exists, the note as plain `type.body` text under the label "Note"; when not
editable and no note, nothing. Then the action rows, each a 48 dp
`TouchableOpacity` with a 18 dp Ionicons glyph and a `type.bodyStrong`
label: "Edit set" (`create-outline`), "Delete set" (`trash-outline`, error
ink). Match the existing overflow-sheet rows in `ActiveWorkoutScreen.js`
(search `styles.sheetOption`) for the feel, but use tokens from the theme
only. Hardware back and the backdrop close it (the BottomSheet contract).

Tests: render with every prop combination (note editable, read-only, none;
with and without edit and delete), the draft seeding on open and not
overwriting while open, Save disabled when unchanged, `onSaveNote` with
the trimmed draft then `onClose`, `onEdit` and `onDelete` then `onClose`,
spoken labels, the source guard (no hex, no fontSize literal, no em dash).

## 4. Gate and report

Run `npx eslint src/components/workout/session src/lib/timeEntry.js src/lib/__tests__/timeEntry.test.js`
and `npx jest src/components/workout/session src/lib/__tests__/timeEntry.test.js`
until both are clean. Report, in this order and nothing else: (1) the exact
final lines of both commands; (2) a list of every prop and export added, one
line each; (3) any existing test you re-pinned, with the line and why;
(4) any ambiguity you resolved and how, one line each. No narrative.
