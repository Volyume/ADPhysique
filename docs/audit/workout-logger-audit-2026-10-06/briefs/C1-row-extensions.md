# Lane C1 (Sonnet): the set row, the table and the section for stages B and C

Authority: `docs/audit/workout-logger-audit-2026-10-06/12-BUILD-SPEC.md`
(sections 1.4, 1.5, 2, 2a, 3, 4, 6), register D220 and its addenda
(`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`). The lead
is wiring `ActiveWorkoutScreen.js` to these components at the same time; the
props below are the contract the lead codes against, so build them exactly
as named.

Hard bounds (CLAUDE.md section 2): no new dependencies; tokens only (no hex,
no fontSize literal; `useTheme`, `spacing`, `radius`, `iconSize`,
`touchTarget`); British English; no em dash anywhere; function components,
`StyleSheet.create` at the bottom; no AI, nothing safety-adjacent. Never
commit, push or stash. Never touch `ActiveWorkoutScreen.js`, any file under
`src/screens/`, any guard test, or lane C2's files (`Keypad.js`,
`SetRowSheet.js`, `src/lib/timeEntry.js` and their tests). STOP and report
rather than interpret if a requirement below conflicts with an existing
pinned test in your files; do not weaken a test to pass.

Files you own (and only these):
- `src/components/workout/session/SetRow.js` and `__tests__/SetRow.test.js`
- `src/components/workout/session/SetTable.js` and `__tests__/SetTable.test.js`
- `src/components/workout/session/ExerciseSection.js` and `__tests__/ExerciseSection.test.js`

Every existing test in those three suites must keep passing unchanged unless
a change below requires a re-pin, in which case say so in the report with
the line.

## 1. SetRow: exercise kinds

New prop `kind`: `'weight_reps'` (default; also used for
`'weighted_bodyweight'`), `'reps_only'`, `'duration'`, `'distance'`. The
screen stores seconds in `reps` and distance in `weight`, as the app always
has (`src/lib/workoutHelpers.js` `formatLoggedSet`, `formatSeconds`), so the
`wells` object keeps its `weight` and `reps` keys and the kind only changes
how the wells render:

| kind | wells rendered | display |
|---|---|---|
| weight_reps | weight, reps | as now |
| reps_only | reps only, one well the full wells width (98) | reps |
| duration | one well the full width, field `reps` | `formatSeconds(reps)` as `m:ss` (import it from `../../../lib/workoutHelpers`) |
| distance | two wells: `weight` (distance) and `reps` (time as `m:ss`) | distance plain, time `m:ss` |

`onPressWell` still reports `'weight'` or `'reps'` (the field key, not the
meaning). Spoken labels follow the kind: "Reps, 8", "Time, 1 minute 30
seconds", "Distance, 400 metres" (metres when `units` is `kg`, yards
otherwise; add a `units` prop, default `'kg'`, used for this only). The
placeholder ink rule for pending rows and the amber editing rule are
unchanged for every kind. Empty values render the placeholder in every kind
(an empty time well shows nothing, not "0:00").

## 2. SetRow: the ghost seed

`wells.ghost: boolean` (default false). When true the well values render in
`colors.textSecondary` instead of `colors.textPrimary` (the coach's numbers,
not yet touched: 12-BUILD-SPEC section 4, "the next row arrives filled with
the coach's numbers as today (ghost seed)"). Editing ink (amber) wins over
ghost on the field being edited. Spoken value unchanged.

## 3. SetRow: the row's overflow and the check's name

- `onLongPressRow`: when given, the whole row is long-pressable
  (`delayLongPress` 300) and calls it with no arguments; the row carries
  `accessibilityHint="Hold for more options"` on its marker button. A row
  without it has no long-press. Pressing a well or the check must still
  work as a plain press (the long-press lives on the row container, so put
  it on a `Pressable`/`TouchableOpacity` wrapping the row with
  `onLongPress` and NO `onPress` of its own, and keep the children's own
  presses).
- `checkLabel`: a string that replaces the check's spoken name when given
  (the screen passes "Log warm-up", "Log other side" or "Start cluster";
  the default stays "Log set {n}" as now). The R4/D64 rule: the spoken name
  IS the action's name.

## 4. SetRow: the phone-keyboard path

`inputField: { field: 'weight' | 'reps', value, onChangeText, keyboardType, testID, onSubmitEditing } | null`.
When given and the row's `wells.state` is `'editing'`, the well named by
`field` renders a house `TextInput` (from react-native) inside the well
instead of the value Text: `value`, `onChangeText`, `keyboardType`,
`returnKeyType` `'done'`, `selectTextOnFocus`, `autoFocus`, the same
amber ink and semibold tabular type as an editing value, the given
`testID`, and `accessibilityLabel` equal to the well's spoken name. The
other well stays a pressable value. This is the keyboard-toggle path of
12-BUILD-SPEC section 1.5 ("a keyboard toggle on the pad opens the
existing TextInput path for screen readers and for people who prefer
typing"). No stepper, no label row: the well itself is the field.

## 5. SetTable

- Rows pass `kind`, `units`, `inputField`, `onLongPressRow`, `checkLabel`
  through to `SetRow` like any other row prop (they already flow via the
  spread; add a test that they do).
- New prop `kind` on the table (same values) and `units`, used for the
  column labels: weight_reps → `"{weight} · reps"` as now (with
  `columnsLabel.weight`), reps_only → `"Reps"`, duration → `"Time"`,
  distance → `"{m|yd} · time"`.
- The tick-all control gets `testID="volyume-btn-log-remaining"`.

## 6. ExerciseSection

- `countdown: { active: boolean, ms: number, reduceMotion: boolean } | null`
  (default null). When `active`, a 2 dp line in `colors.primary` runs along
  the TOP edge of the footer and fills from left to right over `ms`
  milliseconds (`Animated.timing`, `useNativeDriver: false` because it
  animates width; restart whenever `active` flips to true); with
  `reduceMotion` it shows the full line at once. When not active, nothing
  is drawn. This is the auto-advance track that lived on the bottom bar
  (the bar is retired at stage B; the spoken "Next exercise in a moment"
  stays in the screen). Hidden from the accessibility tree.
- The footer's Add set action gets `testID="volyume-btn-extra-set"` and the
  overflow `testID="volyume-section-more"`.

## 7. Tests

Colocated, Jest, `react-test-renderer` as the existing suites do. Cover:
every kind's wells and spoken labels (including empty values), ghost ink,
the long-press (fires, and a plain press on a well still reaches
`onPressWell`), `checkLabel`, the `inputField` TextInput (rendered only
while editing that field, with the testID and the label), the table's
column labels per kind and the pass-through, the countdown line (drawn
when active, absent when not, full width under reduceMotion), the two new
testIDs. Keep the source guard (no hex, no fontSize literal) green.

## 8. Gate and report

Run `npx eslint src/components/workout/session` and
`npx jest src/components/workout/session` until both are clean. Report, in
this order and nothing else: (1) the exact final lines of both commands;
(2) a list of every prop added, one line each; (3) any existing test you
re-pinned, with the line and why; (4) any ambiguity you resolved and how,
one line each. No narrative.
