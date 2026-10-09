# 12: build specification, the logger in Boostcamp's grammar, near-black tone

Lead, 2026-10-07. Authority: founder, 2026-10-07, "Ok let's go near black
tone", on the drawings of `11-boostcamp-study.md` (register D220). Every
CLAUDE.md section 2 inviolable binds every stage. The design reference is
`12-design-reference.html` (the three phones, open in a browser) and
`09-drawing-bc-black.png`, `09-drawing-bc-keypad.png`.

## 0. Scope and shape of the build

The active-workout screen's RENDER layer is rebuilt in Boostcamp's
grammar with house tokens; the screen's LOGIC is kept: every handler,
state, effect, sheet, flow (cluster, per-side, circuit, superset, swap,
starter, shorten, restore, finish, discard), persistence and the rest
timer behave as mapped in `01-logger-core-map.md`. New presentational
components take props and callbacks; the screen wires them to the
existing handlers. Staged, merged to main as each stage goes green,
with the founder's device walk after stage B and after stage D.

Not in scope: the summary, history, exercise detail, the start paths
(the functional foundation F1 to F15 of 00 section 8.1 is a later
campaign), the watch, any engine change, any ED-safety surface.

## 1. Architecture decision (lead)

1. `ActiveWorkoutScreen.js` keeps its logic. Its `return` (AWS:4493 to
   6435) is rebuilt around a session sheet; the handlers it calls are the
   existing ones. No handler is rewritten for the visual pass; a handler
   is touched only where a retired control's job moves (section 4).
2. New components live in `src/components/workout/session/`:
   `SessionToolbar`, `SessionHeader`, `ExerciseSection`, `SetTable`,
   `SetRow`, `Keypad`, `RestSheet`, `SessionNotesSheet`,
   `ExerciseRestSheet`. Each is a function component, tokens only,
   `StyleSheet.create` at the bottom, with its own tests.
3. The session sheet is one `ScrollView` (not virtualised; a session is
   about six sections and twenty-five rows). Only the ACTIVE section
   mounts rows; every other section is one 56 dp header. Tapping a
   header makes that exercise active (`setCurrentExerciseIndex` through
   the existing path that the outline used).
4. The row's check is the only control that logs a straight set. It
   calls the existing `handleCompleteSetPress` (AWS:3528-3545), so
   validation, the SQLite insert, the store, PR detection, the rest
   timer, auto-advance and the per-side and cluster routes are
   unchanged. The bottom bar is retired at stage B; its other jobs move
   (section 4).
5. The keypad replaces the steppers and the system keyboard for the
   active row and for editing a logged row. It writes through the
   existing `handleCurrentSetChange` (AWS:4429) so the ghost seed,
   `seededEntryRef` and `deriveEntryTyped` keep their meaning. A
   keyboard toggle on the pad opens the existing `TextInput` path for
   screen readers and for people who prefer typing.
6. The session clock becomes its own component ticking from
   `workoutStartTime`, so the whole screen stops re-rendering once a
   second (AWS:2264-2298). The 15 s notification-args effect keeps its
   own timer.
7. Rest stays the pinned 44 dp strip docked outside the scroll. The
   Rest tool in the toolbar opens `RestSheet` (the full view: countdown
   at `display` 40, next set at `h2` 24, −15 / +15 / Skip, Start next
   set); opening it by itself after Log is a Settings switch, off by
   default. The strip's own copy, controls and tests are untouched.

## 2. Visual specification (near-black tone; tokens named)

| Element | Token or value |
|---|---|
| Page | `colors.background` |
| Section | `colors.surface`, full bleed, no radius, no border; bands between sections 10 dp of page colour |
| Row hairline | 1 dp `colors.borderSubtle` |
| Well (input) | fill `colors.background`, 1 dp `colors.borderSubtle`, radius `radius.md`; editing: 1 dp `colors.primary`, value `colors.primary` |
| Check, logged | 32 dp circle, fill `colors.primary`, tick `colors.onPrimary`; 48 dp hit area |
| Check, next | 1.5 dp `colors.primary` ring, tick `colors.primary` |
| Check, pending | fill `colors.surface3`, tick `colors.textDisabled` |
| W badge | 24 dp, radius `radius.sm`, fill `colors.primaryBg`, glyph `colors.primary`, `captionStrong` |
| F badge (failure set type, if ever added) | `colors.errorBg` / `colors.error` |
| Set number | `type.num('label')`, `colors.textSecondary` |
| Exercise index | `type.num('title')`, `colors.textSecondary` |
| Exercise name | `type.w(type.title, 'semibold')`, `colors.primary`, one line, chevron `colors.primary` 16 |
| Session title | `type.h2` |
| Note line | `type.body` 14 is not a role: use `type.bodySm` with `colors.textMuted` and the note glyph 18 |
| Column labels | `type.label`, `colors.textSecondary`, sentence case |
| Cell value | `type.num('bodyStrong')`, `colors.textPrimary`; pending rows `colors.textSecondary` regular |
| Cell second line | `type.num('label')` or `type.label`, `colors.textSecondary` |
| Well value | `type.num('bodyStrong')` semibold via `type.w`; placeholder `colors.textDisabled` |
| Footer actions | `type.label` semibold, `colors.textPrimary`, glyph 20 |
| Toolbar tool | glyph 22 `colors.textPrimary` over `type.caption` `colors.textSecondary`, 56 × 48 |
| Session clock | well-styled pill, `type.num('title')` semibold |
| Finish | 48 dp well with the amber double check (icon only, law) |
| Keypad | panel `colors.surface` with a top hairline; keys 52 dp, well-styled, `type.num('h3')` semibold; step keys `colors.primary`; tabs `type.bodyStrong`; Clear and keyboard toggle as wells |
| Sizes | row 64, section header 56, footer 52, columns row 36, wells 44 tall × 2 × 48 wide, check 32 |


## 2a. Founder addition, 2026-10-07: previous weights and reps, and the PRs, on the screen

Founder, verbatim: "Make sure we have previous weights and reps and maybe
even the PRs on the screen so we can immediately go and beat them."

What this adds to the design (all from data the screen already loads:
`prevSets` and `allTimeSets` in `loadHistory`, AWS:2433-2730, and the
record system `lib/workoutRecordLine.js` and `detectPR`):

1. Every row's Last cell shows last session's set at that position
   (weight × reps); when last session had no set at that position, the
   most recent one at the position before it, marked with a muted dot.
   Tapping Last on the next row fills the wells with it (the "Use" action).
2. A bests line under the exercise name, inside the section header, at
   `type.label` `colors.textSecondary` with the numbers in `colors.textPrimary`:
   "Last session 6 Oct · Best 75 kg × 6 · at 70 kg: 8 reps". The three
   facts: when the exercise was last done; the heaviest set ever (weight
   and its reps); the most reps ever at today's working weight (the next
   row's weight), which is the number to beat. No estimated max in this
   line (the retired routine est-max copy stays retired; the e1RM record
   lives in the PR toast and the records screens).
3. The next row's Target rule slot carries the record threshold whenever
   one exists for the row's weight, as a PR tag followed by the smallest
   set that would be a record at that weight: "PR 70 × 9" (the best at
   70 kg is 8, so 9 is a record); for a weight above the heaviest ever,
   "PR 75 × 1". No sentence. Computed from the record system
   (`buildRecordLine` and `detectPR`): the rep record at the weight, else
   the weight record. Otherwise the slot shows the progression rule.
   Founder, 2026-10-07: the first wording, "9 beats your best", was
   rejected as not elegant enough; this is the replacement.
4. A logged row that set a record shows a small "PR" tag after its values
   (`colors.primaryBg` fill, `colors.primary` text, `captionStrong`), the
   way the calm toast already marks it the moment it happens.
5. Reps and weight that beat the best are not styled differently in the
   wells; the tag and the toast carry it. Nothing nags: a session below
   the best shows the facts and no comment.

Props added: `ExerciseSection` gets `bests` ({ lastDateLabel, heaviest:
{ weight, reps }, atWeight: { weight, reps } } or null) and renders the
line when present; `SetRow` gets `record: boolean` for the tag on a logged row, `prTarget: { weight, reps } | null` for the
threshold on the next row, and `last` may carry `{ text, stale: boolean }`. The bests line is a pressable row
with a trailing chevron (JEFIT's 1RM badge is tappable; so is ours) and opens the HistorySheet.

## 2b. Founder addition, 2026-10-07: the JEFIT pattern, previous sets you can select and the PRs in full

Founder, verbatim: "Ok so JeFit look at it I think you can select the
weights you've done previously and see your PRs I'd like it like that.
Research how they do it as it's very good for them and not just a line on
the set you did it on."

JEFIT, OBSERVED (store screenshots on both stores, the vendor's
December 2023 logging-screen article and its images, the support notes):
every planned set row arrives pre-filled from the last log (a setting
chooses last time anywhere or last time in this routine); a "1RM: 62.1"
badge sits beside the exercise name and opens a "1RM Calculator" sheet
with tabs Current / Lifetime / 3M / 6M and a table of percentage, weight
and reps; a Charts button in the header opens history and charts on one
page where tapping a point shows that day's logs; the exercise page has a
Log button listing every log; "New 3M Records!" fires as a toast. Not
verified in any source: a tap on a previous log that copies it into
today's row from the logging screen itself. SUGGESTS: what people value
is that the previous numbers and the records are one tap from the row,
with periods (lifetime, three months) rather than only the all-time best.

What Volyume builds (on top of 2a):

1. A history glyph button in the exercise header beside the rest button
   (Ionicons `stats-chart-outline`), and the bests line itself, open the
   HistorySheet.
2. HistorySheet, segment History: previous sessions of this exercise,
   newest first, each as a date and its sets as chips ("72.5 × 8"), the
   session's best set ringed in amber. Tapping a chip puts that weight
   and reps into the next row's wells (the thing the founder asked for:
   select a weight you have done before). Source: `allTimeSets` already
   loaded by `loadHistory`.
3. Segment Records, with Lifetime | 3 months: heaviest set, most reps at
   today's weight, best estimated max, best session volume, each with
   its date; then "Best reps at each weight" for the weights done in the
   last three months, heaviest first, every row tappable to use. The
   estimated max belongs here, in the records sheet, not on the rows
   (the retired routine est-max copy stays retired). Source: the record
   system (`lib/workoutRecordLine.js`, `detectPR`, `algorithms.calculate1RM`
   over `allTimeSets`).
4. No percentage table and no plate figures (D15, D57); no RPE.
5. The next row's wells still arrive filled with the coach's numbers; a
   chip from the sheet overrides them and counts as typed
   (`deriveEntryTyped` sees a difference from the seed).

Props: `HistorySheet({ visible, onClose, exerciseName, segment, onSegment,
history, records, repsAtWeight, onUseSet, units })`; `ExerciseSection`
gets `onHistory`.

## 3. Components, props, tests (lane B1 and B2 build these; the lead wires them)

- `SessionToolbar({ startTime, onClose, onRest, onNotes, onFinish, finishBusy })`: keeps `testID="volyume-workout-close"` and
  `testID="volyume-workout-finish"` (existing tests); new `volyume-tool-rest`, `volyume-tool-notes`. Contains `SessionClock`.
- `SessionHeader({ name, note, onNotes })`.
- `ExerciseSection({ index, name, state: 'active'|'done'|'upcoming', doneSetCount, bests, onPressHeader, onDetails, onRestLength, onAddSet, onSwap, onMore, children })` (bests per section 2a): active renders children (the table and any banners the screen passes); done shows a green check and "{n} sets"; upcoming shows the header only.
- `SetTable({ rows, onLogRemaining, onPressWell, onCheck, columnsLabel: {weight} })` and `SetRow({ marker: 'W'|'F'|number, last: { text, stale }, target: { value, rule }, wells: { weight, reps, state: 'logged'|'next'|'pending'|'editing', editingField }, check: 'logged'|'next'|'pending', record, onPressLast, onPressWell, onCheck, testIDs })` (record tag and stale last per section 2a).
  The next row carries `testID="volyume-btn-complete-set"` on its check (the existing test id of the primary), so the behaviour suites keep pressing the same id.
- `Keypad({ field: 'weight'|'reps', value, step, unit, onKey, onStep, onClear, onNext, onDone, onSystemKeyboard })`: digits, point (weight only), backspace, −step, +step, Next, Done; TalkBack: `accessibilityRole="keyboardkey"` where available, else button with labels "Add 2.5 kilograms" etc.
- `RestSheet`, `SessionNotesSheet`, `ExerciseRestSheet`, `HistorySheet` (section 2b) on the house `BottomSheet`; the rest sheet reads the store's rest fields the way `RestTimer` does (RT:63-74) and calls the same adjust and skip actions.

Tests for each: render, props, every callback, accessibility labels, token-only source guard (no hex, no fontSize literal), and for `SetRow` the three states and the editing state.

## 4. Where every retired control's job goes

| Today | Now |
|---|---|
| Header ELAPSED + icon-only Finish (`WorkoutHeader`) | `SessionToolbar`: Rest, Notes, clock well, Finish well |
| Outline strip (`WorkoutOutline`) | The session sheet's section headers; the outline component is no longer rendered by the logger |
| Status chips (`StatusStrip`) | Rendered unchanged inside the active section under its header (restyle is stage E, not this campaign) |
| Logged rows, fold, Now card, upcoming rows | `SetTable` rows: logged, next, pending; the fold stays (3 or more logged rows fold behind one line inside the table) |
| Previous-session prefill row and "Use" | The row's Last cell; the next row arrives filled with the coach's numbers as today (ghost seed); tapping Last fills the wells (the "Use" action) |
| Record callout (trophy + copy) | The next row's Target rule slot carries the record copy from `buildRecordLine` when a record is on; no trophy on any log control (D150) |
| Note row on the Now card | The row's overflow (long-press or the ellipsis in the footer) opens the set note; the session note is the toolbar's Notes tool |
| Bottom bar: Log set / Log warm-up / Log other side / Start cluster | The next row's check (same `handleCompleteSetPress`); the per-side and cluster banners stay inside the active section and name the next tap |
| Bottom bar: Next exercise, Finish workout, Log another set, auto-advance track | Next exercise: tap the next header, or the existing 1.8 s auto-advance (kept; it scrolls the sheet to the next section). Finish workout: the toolbar. Log another set: the footer's Add set (`armExtraSet`) |
| Steppers and system keyboard (`SetEntry`) | `Keypad` docked under the sheet; the keyboard toggle restores the TextInput path |
| Inline editor on a logged row | Tap a logged row's well: the keypad edits it; Save on Done through `handleSaveEditedSet`; Delete through the row's overflow with the existing confirm |
| Set-type sheet (`volyume-set-type-btn`) | Tap the row's marker |
| Rest strip | Unchanged; plus `RestSheet` behind the Rest tool |

## 5. Stages (each: `npm run lint && npm test` green, lead diff review, small commits, merge to main, push)

- Stage A (lead): merge main; `SessionToolbar` and `SessionHeader`; the session sheet with collapsed headers around the existing active-exercise content; the outline retired from the render; the 1 Hz re-render removed. Guard tests re-pinned to the new anchors. **DONE 2026-10-07** (commit `ab3f89c`; lanes B1 and B2 landed unwired before it, `4da1fa1` and `510efda`). Rulings taken while wiring are D220 addendum 3 in the register: Finish is the toolbar's alone and the bar never offers it; a collapsed header's chevron activates the exercise; the Help cue keeps its word and loses its pulse; a header well renders only once its sheet is wired; the Rest and Notes tools are wired now (RestSheet; the session note to `workouts.notes`, prefilled by the summary); the title follows `shareSessionName`; the sheet scrolls to the active section; the screen ticks every 15 s for the notification only.
- Stage B (lead with B1): `SetTable` and `SetRow` replace the logged rows, Now card and upcoming rows; the check logs; the bar retired; the record copy in the rule slot; guard tests re-pinned. Founder device walk 1. **DONE 2026-10-07 with stage C** (`64ec237` lanes C1 and C2, `2aacc12` the screen; rulings in register D220 addendum 4).
- Stage C (lead with B1): `Keypad` replaces the steppers and the system keyboard in the active row and the editor. **DONE 2026-10-07 with stage B** (landed together so the first device walk has an input path; every exercise kind in the table; `src/lib/timeEntry.js` and `src/lib/keypadEntry.js`).
- Stage D (lead with B2): `RestSheet`, `SessionNotesSheet`, `ExerciseRestSheet`, tick-all. Founder device walk 2. **DONE 2026-10-07** (`54e5522`: HistorySheet and the bests line from `src/lib/exerciseHistory.js` (lane D1), ExerciseRestSheet behind the header's timer well, tick-all with a confirm; RestSheet and SessionNotesSheet were wired at stage A; rulings in register D220 addendum 5).
- REVIEW (Opus): adversarial, against this file and the drawings, after stage D. **DONE 2026-10-07**: 22 findings, every one answered in one landing (register D220 addendum 6); the retired components deleted the same day.

Lanes: B1 (Sonnet) builds the components of section 3 except the sheets; B2 (Sonnet) builds the three sheets. Both: new files only under `src/components/workout/session/` and their `__tests__`; never AWS, never the guard tests, never commit. Two at a time.

## 6. Re-pinned laws (the guard test after stage B)

Kept as they are: rest strip docked outside the scroll, compact, one render site; no est-max copy; PR detection and `buildRecordLine` present; `showPRCelebration` present; no trophy on a log control; Android `keyboardDismissMode` none; icon-only Finish. Re-written: the session sheet hosts every exercise as a section and only the active section mounts rows; the check is the only log control (`<WorkoutBottomBar` absent); the fold of 3 or more logged rows lives in the table; no plate readout and no RPE or RIR input in any session component (source guard).

## 7. Device checklist (physical Android, EAS build), both walks

Every walk ends with one pass at the phone's maximum accessibility text size (Settings, Display, then the system text size at its largest): nothing overlaps, nothing is cut off, every number still reads (D104-3, Pillar D).

1. Start a planned session: the toolbar shows Rest, Notes, the clock, Finish; the session name; the first exercise expanded with its rows; every other exercise as a header. Expected: no bottom bar.
2. Tap the next row's check without touching anything: the set logs with the coach's numbers; the check turns amber; the rest strip starts; the row below becomes the next row. Expected: one tap, no keyboard.
3. Tap the next row's kg well: the keypad docks; type a weight; Next moves to reps; Done closes; the check logs the typed numbers. Expected: entry_typed = 1 for that set (visible nowhere, but the row keeps the typed values).
4. Tap a logged row's well: the keypad edits; Done saves; the row shows the new value; the PR toast re-evaluates.
5. Log every set of the exercise: the footer's Add set arms one more; the next header is tapped or auto-advances after 1.8 s; the finished exercise collapses with a green check and the count.
6. Warm-up: choose Warm-up on the marker; the row shows W; logging it starts rest and the next row is working.
7. Rest tool: the sheet shows the countdown large and the next set; −15, +15, Skip work; closing returns to the sheet with nothing moved.
8. Notes tool: the session note saves and shows under the title.
9. Finish: the amber double check finishes as today and the summary opens.
10. Kill the app mid-session and reopen: the sheet restores to the same exercise, rows and rest.
11. TalkBack: every check, well, key and tool reads a label; the keyboard toggle opens the system keyboard.
12. Larger text (×1.2): rows grow, nothing clips, the keypad still fits.
ED-safety cases: none of this touches food or weight notifications; confirm the calm PR toast still appears only for a real record and never a first lift.

## 8. Risks named

The 510-line `handleCompleteSet` and the 480-line finish path are not rewritten and must not drift; the per-side and cluster flows are exercised by the device walk; keyboard focus on Android (the existing fix is kept while any TextInput remains); the 60 test files that reference the logger will need anchor updates, done file by file with the behaviour they pin kept.
