# impl-COMP-001 — Workout Screen Redesign

> Round-2 implementation blueprint. Approved spec seed:
> `../competitive-audit-01-workout-screen-proposal.md` (COMP-001, I9/E7, Tier 1).
> The approved spec is locked — this blueprint decides HOW to build it
> without reopening WHAT. No code changes in this document.
>
> Source files read in full before writing:
> `src/screens/ActiveWorkoutScreen.js` (2,373 ln),
> `src/components/SetEntry.js` (335 ln),
> `src/components/RestTimer.js` (288 ln),
> `src/store/useAppStore.js` (store slice references),
> `src/styles/theme.js` (design tokens).
>
> Gating note: COMP-020 (watch) is explicitly gated on COMP-001 final.
> COMP-015 (autoregulation line) and COMP-019 Stage 3 (Live Activity)
> both call the post-COMP-001 layout as their assumed surface.

---

## 1. Best-in-market bar

### 1a. Hevy — the benchmark for session-screen simplicity (best overall)

Previous performance is displayed as a column labelled PREVIOUS, visible
at all times in the logging table during an active session. Tapping any
value in that column copies it directly into the current set's input
([hevyapp.com/features/track-exercises](https://www.hevyapp.com/features/track-exercises/),
[help.hevyapp.com — How to Use Previous Workout Values](https://help.hevyapp.com/hc/en-us/articles/36011896355479-How-to-Use-Previous-Workout-Values-to-Improve-Performance-in-Hevy)). One
tap applies last session's number; no modal, no menu. The rest timer is
3 controls: minus, plus, skip — never more. Action buttons exist but are
kept to the minimum the task requires, with destructive actions (remove
exercise) accessed via a secondary path rather than the main surface.
Supersets, drop sets, rest-pause, and AMRAP all log natively in the same
flow. The interface is "minimal and clean, good for beginners and anyone
who dislikes extra options during a workout"
([setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026)).
Community feedback consistently identifies Hevy's session screen as
"fast and frictionless" with the logging flow singled out as the app's
strongest attribute ([producthunt.com/products/hevy/reviews](https://www.producthunt.com/products/hevy/reviews)).

### 1b. Strong — the benchmark for logging speed (best for pure speed)

Opening the app, starting a workout, and logging a set takes three taps
once in session ([repreturn.com/strong-app-review](https://repreturn.com/strong-app-review/)).
The interface is "built around the assumption that you are mid-session,
resting between sets, and needing to log quickly — minimising the time
between finishing a set and getting the data recorded"
([setgraph.app/ai-blog/hevy-vs-strong](https://setgraph.app/ai-blog/hevy-vs-strong)).
Useful features are "tidied away into menus and behind buttons" rather
than surface-cluttering the main logging card
([medium.com/@hwaijunyap — Strong redesign case study](https://medium.com/@hwaijunyap/ui-ux-case-study-strong-workout-app-redesign-fc22afbada65)).
Strong's logging parity with Hevy makes it the comparison standard for
tap count and for the "hide secondary options" pattern.

### 1c. MacroFactor Workouts — the benchmark for set-level context display

MacroFactor's session table shows a PREVIOUS column and a rest timer
simultaneously; the two-timer layout (workout duration top-left, rest
timer top-right) keeps both pieces of information visible without
competing for the same slot ([macrofactor.com/workouts](https://macrofactor.com/workouts/)).
Their approach — "each exercise displays a table with one row per set
and columns for set number, previous performance, weight, and reps" —
confirms the table/row-per-set pattern as correct, and their App Store
rating of 4.9 across 40k+ reviews (as of June 2026) validates the
execution. Their workout app launched in January 2026 **without a watch
app**, explicitly validating the phone-first, watch-after gate
([dr-muscle.com analysis of MacroFactor Workouts](https://dr-muscle.com/macrofactor-workouts/),
search-extract — direct fetch blocked).

### 1d. Fitbod — the best for at-a-glance exercise orientation

Fitbod uses a step-by-step screen flow that isolates each decision (this
set, this weight) to reduce cognitive load at the moment of commitment
([uinarrative.com/apps/fitbod](https://www.uinarrative.com/apps/fitbod)). Its
AI-generated load suggestion always appears before the input, so the
user knows what they are aiming for before they touch a number. This
design confirms the "show the target before the input" principle that the
beat line formalises.

### 1e. SmartGym (watch reference, not phone) — confirmed session simplicity benchmark

Cited in COMP-020: Apple Watch App of the Year 2023; one-tap "log set +
start rest" on a single button. The watch spec inherits the phone spec
(COMP-020 is gated on COMP-001 final). SmartGym's phone session screen
shares the same minimal-card-with-previous-performance pattern,
confirming the pattern is durable across form factors.

**The single best reference: Hevy.** Its tap-previous-to-fill mechanic
is the direct model for the beat line. Its rest-timer simplicity (three
controls) is the direct model for the RestTimer rebuild. Its
behind-the-row pattern for destructive actions is the direct model for
the overflow sheet.

---

## 2. What fails

### 2a. Jefit — the cautionary tale (chip noise and navigation bloat)

Jefit is the named cautionary example in the approved spec and the
evidence holds on re-research. Users consistently describe the interface
as "confusing to navigate due to its crowded interface", note that
"recent changes have made the app harder to use", and that "changing
muscle groups or exercises takes more steps with extra screens,
animations, and oversized lists"
([fitmenhq.com/jefit-app-review-2](https://fitmenhq.com/jefit-app-review-2/),
[justuseapp.com/en/app/449810000/jefit-workout-planner-gym-log/reviews](https://justuseapp.com/en/app/449810000/jefit-workout-planner-gym-log/reviews)).
As of October 2025 the free tier has become so ad-heavy that it "disrupts
workouts" mid-session
([etechshout.com/jefit-app-review](https://etechshout.com/jefit-app-review/)).
The specific anti-patterns to name and avoid: (a) **chip noise above the
inputs** — Jefit stacks metadata badges so densely above the weight/reps
inputs that the decision data is buried; (b) **extra options during a
workout** — Reddit communities specifically reward apps that show fewer
options in session, citing Jefit as the example of what not to do.

### 2b. Strong pre-rebuild Apple Watch (reliability failure)

Cited fully in COMP-020: crashes "multiple times every workout, almost
every set". The phone-side lesson: even a fast logger loses users when it
surprises them with failure. In the session screen context, this
translates to: the chip-consolidation work and ghost/repeat-last
deduplication are also reliability moves — fewer concurrent state paths
mean fewer edge-case bugs.

### 2c. The four-parallel-mechanisms anti-pattern (current Volyume state)

The current ActiveWorkoutScreen has four "use last session's numbers"
mechanisms active simultaneously: (1) silent prefill via `ghostSet`/
`currentSet` pre-population (line 596–616), (2) the ghost chip ("Pre-filled
from last session. Tap to confirm.", lines 1485–1490), (3) the beatChip
(xs=11 italic "Last time: 60kg × 8 reps. Can you hit 9?", lines
1427–1441), and (4) the repeatLastBtn ("Repeat last: 60kg × 8",
lines 1454–1474). When four mechanisms say the same thing in different
words and at different sizes, users learn to ignore all of them. This is
the ghost-chip problem named in the spec: **redundancy destroys
signal**. The fix is one mechanism, at input size, tappable.

### Anti-patterns to avoid by name

- **Chip noise above the inputs.** Any element smaller than sm=13 that
  delivers information the user needs to make an immediate decision.
- **Parallel redundancy.** More than one element communicating the same
  historical data value on the same card at the same time.
- **Blast-radius placement.** Putting a destructive action (Remove) in
  the same flat row as primary secondary actions with no visual
  separation or confirmation gate.
- **Small rest controls.** The current adjBtn uses `paddingVertical:
  spacing.xs + 2` (approximately 10pt visual), hitSlop 10 — on a
  sweaty screen this regularly mis-fires. The TIME_ADJUSTMENTS array
  (RestTimer.js line 14–19) currently ships four deltas: −30, −15, +15,
  +30. The −30/+30 pair adds visual weight without adding use-case
  coverage that long-press-repeat cannot handle.

---

## 3. User psychology

### Moment of need

The session screen is the highest-stakes surface in the app: the user
has a weight in their hands, a clock running, and 60–180 seconds of rest
in which to answer "what do I do this set?" That is the moment. Every
element that does not answer that question directly steals cognitive
budget from the one decision that matters. The approved spec's beat line
redesign is correctly framed as a moment-of-need intervention, not a
cosmetic change: previous performance at 11pt italic is not legible in a
gym environment under fatigue; at 16pt tabular bold it becomes the
decision input.

### Habit loop

The cue is the rest timer expiry (audio escalation + haptic, already
correctly implemented). The action is tapping Log set. The reward is
the amber flash + haptic confirmation, plus the logged set appearing in
the "This workout" list. The current architecture already has all three
components; the redesign strengthens the reward by making the logged list
visible above the fold, so the user sees their own progress accumulate
without scrolling. Visible accumulation is the specific loop that drives
"I want to come back and add another row to that list" — the gym
equivalent of the Duolingo streak.

### Effort budget

The existing 1-tap prefilled log path is class-leading. The redesign
**protects it absolutely**. The effort reduction comes from: (a) the user
no longer spending 1–2 seconds reading and discarding four chip-level
fragments to extract one data point; (b) the action row shrinking from 5
buttons (at xs=11 labels, ~59pt per button on a 5.4" screen) to 2 legible
buttons plus overflow — fewer mis-fires, fewer cognitive switches from
"what is this button for" to "what weight do I do"; (c) the rest timer
collapsing from 5 touch targets to 3 — at the moment of need, fewer
fingers-on-glass = faster return to the bar.

### Emotional safety

No red numbers, no shame states. The stalled-progress chip (lines
1419–1426) is already positively framed ("Try 62.5kg × 7, or stick at
60kg for 9 reps"). The beat line follows the same rule: it is a data
reference, not a verdict. "Last: 60 kg × 8 · Target 8–12" states facts
and a range — no "you failed to beat" language. Under the CLAUDE.md
rules, the coaching line (max one, sm=13) must pass the same emotional
safety standard as all coaching copy.

### Word-of-mouth surface

The logged-set list now appearing above the fold after 2–3 sets is the
screenshot surface: a user who has just done Bench Press 80 kg × 4 sets
and can see all four rows on screen without scrolling will screenshot it.
"4 sets of bench press, look" is the gym-friend conversation starter.
This is the shareable moment. It requires no additional feature — it is
created by the reorder described in spec §4.

---

## 4. The Volyume implementation

### 4.1 Placement

The redesign is entirely contained within `ActiveWorkoutScreen.js` and
`SetEntry.js` and `RestTimer.js`. It does not add a new screen, a new
route, or a new tab. Every changed element replaces or consolidates an
existing element. Net interactive-element count: ~29 → ~19.

### 4.2 Interaction spec by component

**A. SetEntry card header (replaces chip stack)**

Replace the following elements that currently appear above the `<SetEntry>`
component inside the `setEntryCard` View:
  - `setEntryTitle` Text node (line 1365–1373): the xs=11 "Set 2 / 3"
    label.
  - `inlineTargetChip` View (lines 1374–1382): the xs=11 "Target: 60kg ×
    8–12 ↑" chip.
  - `coachReasonChip` View (lines 1383–1388): the xs=11 coaching reason.
  - `stalledChip` View (lines 1418–1426): the xs=11 stalled-progress
    nudge.
  - `beatChip` View (lines 1427–1441): the xs=11 italic "Last time" chip.
  - `repeatLastBtn` TouchableOpacity (lines 1453–1474): the xs=11
    "Repeat last" button.
  - `ghostChip` View (lines 1485–1490): the xs=11 italic ghost-prefill
    note.

Replace with three lines at the top of the card (inside the existing
`setEntryCard` View, above `<SetEntry>`):

**Line 1 — orientation row (always present):**
```
Set 2 of 3 · Working  ›
```
- Style: sm=13, weight 600, textSecondary.
- The entire line is a `TouchableOpacity` that opens the existing
  `setTypePicker` (currently opened by the set-type row at the bottom of
  SetEntry, which is deleted after this change). Touch target: paddingV
  md=12 to achieve ≥44pt.
- Warm-up state: "Warm-up · Set W1". Deload state: "Light set 1 · Easy".
- `workingLogged` and `routineExercise.recommendedSets` are already
  in-scope on `ActiveWorkoutScreen.js` (lines 1153–1155).

**Line 2 — beat line (always present when history exists):**
```
Last: 60 kg × 8  ·  Target 8–12 ↑
```
- "Last:" label and "Target" label: sm=13, textSecondary.
- Numbers (60, 8, 8–12): md=16, weight 600, tabular numerals,
  textPrimary. The `↑`/`↓` direction glyph: md=16, amber (`colors.primary`).
- The entire line is a `TouchableOpacity`. `onPress`: calls the existing
  `setCurrentSet` update, applying `prevSets[workingLogged]` weight and
  actualReps (the same logic currently in `repeatLastBtn.onPress`,
  line 1458–1463). hitSlop 4, paddingV sm=8 → ≥40pt effective.
- Empty state (no `prevSets[workingLogged]`): render "First time · Target
  8–12". No tap action on that state. If no target either: render "First
  time". If no history at all and no routineExercise: render nothing
  (line 2 is absent, card drops to ~205pt).
- Deload state: "Recovery week · {deloadTarget.weight}kg × {deloadTarget.reps}".
  Tap applies deload values to the input (same mechanic).

**Line 3 — coaching line (conditional, max one):**
Priority: stalled advice > deload note > coach reason (targetReason).
- Stalled: render the existing stalled-chip content, promoted to sm=13
  amber, single line with sparkles icon 13pt.
- Coach reason: render `targetReason` text, sm=13, amber, sparkles icon.
  **First working set of the exercise only** (`workingLogged === 0`).
  Subsequent sets: coaching line absent.
- Tap target: chevron to open existing execution/info sheet
  (setShowExecution).
- The coaching line does NOT appear when it would stack with the
  deload banner (deloadDismissed === false and isDeloadWeek); the
  deload banner is higher-priority context and the card height ceiling
  requires choosing one.

Note on `e1RM`: delete the `oneRmChip` View from `SetEntry.js`
(lines 149–160 in SetEntry.js). The single remaining in-card instance
is the `e1rmHint` inline beside the Reps label (line 108–110 in
SetEntry.js). Logged-set rows (`LoggedSetRow`) keep their `loggedEst1RM`
Text — that is history data, not input furniture, and the spec
explicitly preserves it.

**B. SetEntry.js: set-type row deletion**

Remove the `setTypeRow` TouchableOpacity from the bottom of SetEntry
(SetEntry.js lines 168–181). Set-type changes now go exclusively through
the orientation row tap target (A above). The `onOpenSetTypePicker` prop
remains on SetEntry (it is also called in `handleCompleteSet` context)
but the visual row at card foot is deleted. Update the `styles` object in
SetEntry.js: the `setTypeRow`, `setTypeLabel`, `setTypeValue`,
`setTypeRight` entries can be removed.

**C. Action row: 5 → 2 + overflow**

The current `secondaryActions` View (lines 1631–1692) renders up to 5
buttons: Note, Info, Add, Pair/Paired (conditionally), Remove. Replace
with:

*Exercise name row change:* Add a `⋯` `TouchableOpacity` (44×44,
Ionicons "ellipsis-horizontal", icon size 20) at the right end of the
`exerciseNameRow` View (currently line 1252–1264), alongside the existing
`swapBtn`. The overflow button opens a new bottom sheet (identical
structure to the existing `sheetOverlay`/`sheet` Modal pattern). Sheet
contains:
  - Swap exercise (calls existing `handleOpenSwap`)
  - Exercise info (calls existing `setShowExecution(true)`)
  - Pair as superset (calls existing `handleTogglePair`; conditional on
    `!isLastExercise`)
  - Time crunch (calls existing `handleTimeCrunch`; conditional on
    `!timeCrunchActive`)
  - Remove exercise (destructive, `colors.error`, red, listed last,
    calls existing `handleRemoveExercise` which already has its own
    confirm alert)

*New `secondaryActions` View:* Two buttons only:
  - Add Set (icon: "add-circle-outline", label "Add set", calls
    `() => setShowExercisePicker(true)`, minHeight 44, sm=13 label)
  - Note (icon: "create-outline", label "Note", calls existing
    `() => setShowNoteInput(v => !v)`, minHeight 44, sm=13 label)

Each button takes `flex: 1` and the row remains `flexDirection: 'row'`.
Width per button on a 5.4" screen (375pt − 2×spacing.md padding) ≈
170pt, well above the current 59pt.

**D. Logged sets: move above action row**

Change the scroll content order. Current order (lines 1244 onward):
rest timer → target-complete banner → SetEntry card → CTA → secondary
actions → logged sets → ghost nav → time crunch.

New order:
rest timer → target-complete banner → SetEntry card → CTA →
logged sets → secondary actions → ghost nav → time crunch.

This is a block move: cut the `loggedSection` View (lines 1694–1707)
from its current position and paste it immediately after the CTA block
(after the closing `</>` of the `targetComplete` conditional, line 1629).
The CTA block itself is unchanged.

**E. Rest timer: 5 controls → 3**

In `RestTimer.js`, change the `TIME_ADJUSTMENTS` array (lines 14–19)
from four items to two:
```
const TIME_ADJUSTMENTS = [
  { delta: -15, label: '−15' },
  { delta: 15,  label: '+15' },
];
```
The "Skip" button already exists (`stopRestTimer`, lines 169–178). It
moves inline to the same row as the countdown numeral (left) and the
two ±15 buttons (right), making the entire rest timer a single row.

Add long-press repeat on both adjustment buttons: `onLongPress` +
`delayLongPress={300}` triggering a `setInterval` at 200ms that calls
`handleAdjust(delta)` repeatedly, clearing on `onPressOut`. This covers
the −30/+30 use case without dedicated buttons.

Update `adjBtn` style: `minHeight: 44`, `paddingHorizontal: spacing.lg`
(currently `spacing.xs + 2` vertical only). The visual affordance grows
from ~26pt to ≥44pt.

Card height collapses from ~96pt to ≈64pt (single row: numeral left,
three controls right), recovering approximately 32pt of vertical space.

**F. Ghost navigation: state-swap (spec §6 #15)**

The current ghost nav (lines 1709–1722) renders a parallel full-width
"Finish Workout" or "Next Exercise" button at all times when
`!targetComplete`. Remove these two `TouchableOpacity` elements. They
are replaced by the CTA state-swap (already partially implemented):
when `targetComplete` is true, the CTA area already swaps to a primary
"Next exercise" / "Finish workout" button plus a "Complete extra set"
text button. Extend this: the "Complete extra set" button becomes "Log
another set" (sm=13, 44pt target, text button below the primary CTA),
and the ghost nav block is deleted entirely.

**G. Time crunch: overflow + glyph (spec §6 #16)**

The `timeCrunchRow` TouchableOpacity (lines 1724–1739) moves into the
overflow sheet (C above). When `timeCrunchActive` is true, remove the
`timeCrunchActiveBar` View (lines 1741–1751) from the scroll and replace
with a 15pt timer glyph ("timer" icon from Ionicons) placed inline in
the header `timerText` row beside the elapsed time, amber-coloured. The
revert action lives in the overflow sheet.

**H. Muscle line deletion (spec §6 #4)**

Delete the `exerciseMuscle` Text node (lines 1266–1271). Muscle group
and equipment are already shown in the existing info sheet
(`showExecution` modal, line 1966–1969). This frees one line of vertical
space from the exercise header.

**I. Nav pill size correction (spec §6 #2)**

Update `navTab` style: `paddingVertical: spacing.sm` (currently
`spacing.sm` — this is correct but the resulting height with the text
renders ~33pt; change to `paddingVertical: spacing.md` to achieve ~40pt).
Update `navTabText`: `fontSize: fontSize.sm` (currently `fontSize.xs`).
Update nav-pill truncation: change
`entry.exercise?.name?.split(' ').slice(0, 2).join(' ')` to apply
middle-out uniqueness (keep the most disambiguation-relevant word,
e.g. "Incline DB" not just "Incline"). This is a helper function that
can be extracted alongside the existing name-split logic.

### 4.3 State matrix

| State | What renders |
|---|---|
| Empty / first time | Line 1: "Set 1 · Working ›". Line 2: "First time · Target 8–12". No line 3. Card ~205pt. |
| History loaded, set 1 | Line 1: "Set 1 of 3 · Working ›". Line 2: "Last: 60 kg × 8 · Target 8–12 ↑". Line 3: coach reason if set 1 only. |
| Rest timer active | Timer card collapses to one 64pt row above SetEntry card. Beat line visible throughout. |
| Warm-up set | Line 1: "Warm-up · Set W1 ›". Line 2: absent (no history beats target for warm-ups). Line 3: absent. Card border orange. |
| Target complete | CTA swaps to "Next exercise" (primary) + "Log another set" (text). Logged section already populated. |
| Deload week | Line 1: "Light set 1 · Easy ›". Line 2: "Recovery week · 50 kg × 5". Line 3: absent (deload banner is higher context). |
| Cluster active | Cluster banner replaces SetEntry. Beat line preserved on card header. CTA becomes "Finish cluster". |
| Superset paired | Orientation row shows pairing: "Set 1 of 3 · Superset ›". The existing supersetChip is kept unchanged (spec explicitly preserves it). |
| Stalled (3 sessions) | Line 3: stalled advice, sm=13 amber. Promoted from xs=11 chip. |

### 4.4 Edge cases

**Cluster sets (myo-reps / rest-pause):** The cluster banner (`clusterBanner`
View, lines 1525–1568) is entirely unaffected. The beat line reads from
`prevSets[workingLogged]` which is the pre-cluster session data, so the
previous-performance reference remains correct. The `isClusterType` guard
in the CTA `onPress` (line 1612–1614) is unchanged.

**Supersets:** Auto-jump logic (lines 824–838) is unchanged. The
orientation row correctly renders the paired state via `currentSGI`/
`pairedExerciseName`, which are already in scope. The superset heads-up
modal (lines 1769–1861) is entirely unchanged.

**Offline:** There is no network dependency in any of these changes.
`prevSets`, `setTargets`, `ghostSet`, `loggedSets` are all sourced from
SQLite (via `getLastNWorkoutSets`, `getAllCompletedSetsForExercise`) and
Zustand store. The beat line renders from local state. The overflow sheet
is a local modal. No fetch path.

**Ghost/isGhost state:** The `isGhost` visual treatment on `valueInput`
(SetEntry.js line 71, `valueInputGhost` style) is preserved. The ghost
chip that announced it is deleted, but the input itself retaining muted
colour signals the pre-fill state correctly. Tapping any field clears
`isGhost: false` via the existing `onChange` wrapper (line 1499–1501 in
ActiveWorkoutScreen).

**No history, no routineExercise (ad-hoc workout):** Beat line renders
nothing. Orientation row renders "Set 1 ›". The 1-tap prefill still
works because `DEFAULT_SET` provides `reps: 8`. No coaching line.

**Small screens (<700pt usable height):** Add `useWindowDimensions` check
(already used in the spec fold math). When height < 700: rest timer
uses compact variant (24pt numeral inline with 3 controls, single row,
`height: 56`); logged sets cap at last 2 rows plus "All sets (N) ›" text
button; Note moves into the overflow sheet leaving Add Set full-width;
nav `maxHeight: 40`.

**Large screens (≥800pt):** Up to 3 logged rows; full 64pt rest timer;
both action buttons.

### 4.5 Copy direction

House voice: plain, terse, British English, no jargon, no em dashes, no
hype, no shame, no MEV/MRV/RIR in user-facing strings. Numerals are the
hero.

| Context | Copy |
|---|---|
| Beat line, history exists | "Last: 60 kg × 8  ·  Target 8–12 ↑" |
| Beat line, first time | "First time  ·  Target 8–12" |
| Beat line, deload | "Recovery week  ·  50 kg × 5" |
| Orientation row, working | "Set 2 of 3  ·  Working  ›" |
| Orientation row, warm-up | "Warm-up  ·  Set W1  ›" |
| Coaching line (stalled) | "Same weight 3 sessions running. Try 62.5 kg × 7, or stay at 60 kg and push for 9." |
| Coaching line (reason) | "Adding a rep this session keeps you on track." (plain; no percentages, no technical terms) |
| Overflow sheet | "Swap exercise / Exercise info / Pair as superset / Time crunch / Remove exercise" |
| Log another set (text btn) | "Log another set" |

### 4.6 Accessibility

All removed elements had `accessibilityRole` and `accessibilityLabel`.
Add equivalent labels to every new element:
- Orientation row: `accessibilityRole="button"`, `accessibilityLabel=
  "Set 2 of 3, Working, tap to change set type"`.
- Beat line (tappable): `accessibilityRole="button"`, `accessibilityLabel=
  "Last session: 60 kilograms times 8 reps. Target 8 to 12. Tap to apply."`.
- Beat line (no history): `accessibilityRole="none"`, `accessibilityLabel=
  "First time on this exercise. Target 8 to 12."`.
- Overflow button: `accessibilityRole="button"`, `accessibilityLabel=
  "More options for this exercise"`.
- Overflow sheet items: each `accessibilityRole="button"` (existing sheet
  pattern).
- Rest timer adjusted buttons: update existing `adjBtn` elements to add
  `accessibilityLabel="Add 15 seconds"` / `"Remove 15 seconds"`.
- `accessibilityLiveRegion="polite"` on the rest timer row is already
  correct (RestTimer.js line 157) and is preserved.
- Extend `accessibilityLabel` to all new/merged controls per the
  do-not-regress list in the spec.

---

## 5. Whole-package integration

### 5.1 COMP-015 (visible autoregulation line)

COMP-015's blueprint (impl-COMP-015) explicitly calls the
"post-COMP-001 layout" as its assumed surface: the autoregulation
adjustment line lives in the same card header slot as the coaching line
(Line 3). The priority hierarchy the spec defines (stalled > deload >
coach reason) is designed to accommodate the COMP-015 adjustment as a
fourth priority beneath these three, displayed in the same sm=13 amber
slot. Because coaching-line items are already ranked and capped at one
visible line, adding the autoregulation reason to the priority stack
requires no structural change — it slots in below `targetReason` with
its own condition. COMP-015 must implement this correctly: one line max,
same tap-for-full-explanation pattern.

**Duplication to avoid:** COMP-015 must not introduce a separate
"adjustment chip" or banner outside the card header. The card header
is the canonical coaching-context location after COMP-001; anything that
re-introduces a chip above or below the inputs regresses the chip-removal
work.

### 5.2 COMP-020 (watch is the phone spec)

COMP-020 is explicitly gated on COMP-001 final. The watch blueprint
specifies that the watch mirrors the phone session screen: the beat line
(previous performance displayed during logging) and 3-control rest timer
are the two phone-session elements the watch companion must reflect. The
overflow sheet does not exist on the watch — on wrist, only the two
persistent action buttons (Add Set, Log Set equivalent) are shown.
Confirming the phone spec is final before building the watch prevents
a rebuild of the watch UI when phone patterns settle.

**Duplication to avoid:** the `countProgressSets` pure helper function
(ActiveWorkoutScreen.js lines 62–67) should be extracted to a shared
utility (`src/lib/workoutHelpers.js` or similar) so COMP-019's Live
Activity fix and COMP-020's watch sync both use the same counting logic.
Currently this function is defined inline in `ActiveWorkoutScreen.js`
and duplicated in COMP-019's specification. Extract once.

### 5.3 COMP-019 (Live Activity Stage 3)

COMP-019 Stage 3 re-enables the existing `modules/live-activity` code,
fixing the "Set N of M" defect (RestTimer.js comment, lines 46–52). The
defect was caused by counting warm-up sets alongside working sets in the
set index. The fix is to use `countProgressSets` (the same helper). This
is the same function COMP-020 needs. Both blueprints reference the
`setEntryCardFlash` ack and the "Set N of M" label; both should derive
their set-count from `countProgressSets`, extracted as above.

**Duplication to avoid:** the `restTimerActive` / `restTimerRemaining`
store slice is read by both `RestTimer.js` and the Live Activity module.
The Live Activity stage-3 fix does not require changes to RestTimer.js;
it requires changes to the notification/Live Activity update calls in
`ActiveWorkoutScreen.js` (lines 466–508). These calls already use
`countProgressSets(loggedSets)` correctly for the notification; the Live
Activity update path needs the same function applied.

### 5.4 Streamlining effect

Interactive elements: ~29 → ~19. This reduction means that adjacent
features landing on the session screen (COMP-015's coaching line) have
a guaranteed slot in a non-cluttered surface. The overflow sheet pattern
absorbs future secondary actions without growing the permanent surface.
The session screen is now closed to net additions unless a blueprint is
explicitly FOR it (per the shared brief §45).

### 5.5 ED/wellbeing flags

The session screen has no calorie display, no weight targets, and no
content that triggers the safety system. The coaching line (Line 3) must
follow the existing content policy: no shame, no "you failed", no
absolute-rep comparisons that read as inadequacy. The stalled advice
copy ("Try 62.5 kg × 7, or stay at 60 kg and push for 9.") is already
constructed to be rest-positive and optioned, not prescriptive. No
additional ED-flag gating is required for the session screen itself.

---

## 6. Retention and word-of-mouth mechanics

**The loop this feeds:** log a set (action) → see it appear above the
fold in the logged list (immediate visual reward, <1 second) → rest timer
counts down → beat line shows next target → log next set. Each logged row
is a visible unit of progress within the session. When two or three rows
are on screen simultaneously with no scroll, the user can see their work
session building in real time. This is the specific loop that explains
why lifters who see their numbers will screenshot their session.

**Word-of-mouth surface:** the logged-set list, once above the fold,
becomes the session receipt. "4 sets, look" is a literal gym-floor
conversation that becomes "show me your phone." The current layout hides
this behind a scroll. The reorder creates the screenshot without any new
feature. This is the low-cost word-of-mouth win.

**Trust loop:** the beat line shows the exact number the user logged last
time. Tapping it applies it. The user sees that the app knows what they
did and offers them the anchor, without forcing it. This is the
"perceived adaptivity earns the elite label" principle from the shared
brief's psychology lenses: the system shows its working, one data point
at a time, and the user trusts it because they can verify it.

**Habit anchor:** the first-set prefill (beat line tap = 1 tap before Log
set = 2 taps total for any set after the first) makes consecutive-session
logging faster than a notebook. Once a user is faster on the app than on
paper, they do not go back. This is the retention anchor.

---

## 7. Beating the benchmark

Hevy's PREVIOUS column is static — it displays the values inline in the
table but it cannot show direction, target range, or coaching context in
the same element. Volyume's beat line does three things in one line that
Hevy does in one column and zero annotation: it shows the anchor value
(same as Hevy's PREVIOUS), the target range (Hevy has no equivalent —
they do not prescribe per-set targets), and the direction glyph (↑/↓,
signalling whether the engine expects this session to be a progression
or a pull-back). The tap-to-apply mechanic is identical to Hevy's
column-tap. Everything else Hevy does on the session screen, Volyume
already does at the same level. The one place Volyume's session screen
falls below Hevy post-redesign is element count (29 vs Hevy's ~18);
the redesign closes that gap to ~19. The net result: a session screen
that matches Hevy on speed and cleanliness while providing the only
in-session progressive-overload indicator in the category — context that
Hevy, Strong, and MacroFactor Workouts do not surface per-set during an
active session.

---

## 8. Measurement

2–4 metrics that prove it worked, using the existing telemetry allowlist
(`audit()` calls in ActiveWorkoutScreen.js).

**M1 — Session completion rate** (existing: `workout.set.logged` event
count per `activeWorkout.id` divided by sessions started). Target:
≥5% improvement over 90-day baseline. This measures whether the cleaner
surface reduces mid-session drop-off.

**M2 — Beat-line tap rate** (new event: `audit('workout.beatline.apply',
{ exerciseId, setIndex })` on the beat-line `onPress`). Target: >20% of
sets use the tap-to-apply path within 60 days. This validates that
promoting the chip to 16pt and making it tappable creates a habit, not
just a visual improvement.

**M3 — Overflow sheet open rate vs Remove misfire rate** (new events:
`audit('workout.overflow.open')` and `audit('workout.exercise.removed')`).
Prior to redesign, Remove is co-located with Note/Info/Add with no
confirm required to even reach the modal. After redesign, Remove is
behind the overflow sheet plus a confirm alert. If the Remove event rate
drops proportionally more than the overflow-open rate, the blast-radius
fix is working.

**M4 — Session scroll depth** (new event: `audit('workout.loggedsets.visible',
{ count })` on the logged section rendering above the fold). If 2+
logged sets render above the fold in ≥60% of sessions on 6.1" phones
within 30 days, the fold math is validated in production. This can be
derived from `loggedSets.length` at render time without PII.

---

## 9. Build notes

### 9.1 Files and blocks that change

| File | Change | Lines (current) |
|---|---|---|
| `ActiveWorkoutScreen.js` | Delete chip stack above SetEntry (7 elements) | 1365–1490 |
| `ActiveWorkoutScreen.js` | Add 2-line (3-line conditional) card header | inserts after line 1363 |
| `ActiveWorkoutScreen.js` | Replace secondaryActions View (5 btn → 2 btn) | 1631–1692 |
| `ActiveWorkoutScreen.js` | Add ⋯ overflow button to exerciseNameRow | 1252–1264 |
| `ActiveWorkoutScreen.js` | Add overflow bottom-sheet Modal | new, after existing modals |
| `ActiveWorkoutScreen.js` | Move loggedSection View above secondaryActions | 1694–1707 reordered |
| `ActiveWorkoutScreen.js` | Delete ghost nav block (2 TOuchableOpacitys) | 1709–1722 |
| `ActiveWorkoutScreen.js` | Delete timeCrunchRow + timeCrunchActiveBar | 1724–1751 |
| `ActiveWorkoutScreen.js` | Add time-crunch glyph to header | 1183–1207 |
| `ActiveWorkoutScreen.js` | Delete exerciseMuscle Text node | 1266–1271 |
| `ActiveWorkoutScreen.js` | CTA: rename "Complete extra set" → "Log another set" | 1597–1605 |
| `ActiveWorkoutScreen.js` | Nav pill size/font update | styles.navTab, styles.navTabText |
| `RestTimer.js` | TIME_ADJUSTMENTS: 4 → 2 items | 14–19 |
| `RestTimer.js` | Rest timer layout: two-row → one-row | 148–197 |
| `RestTimer.js` | adjBtn: add minHeight 44, paddingH lg | styles.adjBtn |
| `RestTimer.js` | Add long-press repeat on ±15 buttons | handleAdjust callers |
| `SetEntry.js` | Delete setTypeRow TouchableOpacity | 168–181 |
| `SetEntry.js` | Delete oneRmChip View | 149–160 |
| `SetEntry.js` | Delete style entries: setTypeRow, setTypeLabel, setTypeValue, setTypeRight, oneRmChip, oneRmChipText | styles section |

### 9.2 Reuse opportunities

- `handleRemoveExercise` (line 250): already has its own confirm alert.
  No new confirmation logic needed — the overflow sheet is just the new
  navigation path to the same function.
- `handleOpenSwap` (line 279), `setShowExecution` (line 1643),
  `handleTogglePair` (line 233), `handleTimeCrunch` (not shown above but
  exists in the file): all are called unchanged from the overflow sheet.
- The existing `sheet`/`sheetOverlay`/`sheetHandle`/`sheetTitle`/
  `sheetOption` styles are reused directly for the overflow sheet, giving
  zero new styling for a consistent bottom-sheet appearance.
- `setTargets[workingLogged]` and `prevSets[workingLogged]` are already
  computed in scope; the beat line renders directly from these values
  without new state.
- The ghost prefill (`currentSet.isGhost`, `ghostSet`) continues to work
  unchanged; only the chip announcing it is deleted. The `valueInputGhost`
  style in SetEntry.js communicates the ghost state visually.

### 9.3 Effort sanity check vs approved score (I9/E7)

The approved effort is E7. Breaking this down:

- Beat line + chip consolidation (spec step 1): replace 7 conditional
  JSX blocks with 2–3 lines of structured JSX. The logic already exists;
  this is layout refactoring, not logic change. **~1.5 days.**
- Action row + overflow (spec step 2): new bottom-sheet Modal (copy
  existing pattern); reduce secondaryActions to 2 buttons; add ⋯ button.
  **~1 day.**
- Logged-sets reorder (spec step 3): a block-move of JSX.
  **~0.5 days.**
- Rest timer (spec step 4): TIME_ADJUSTMENTS array change + layout
  collapse + long-press repeat. **~0.5 days.**
- Deletions/demotions (spec step 5): delete exerciseMuscle, ghost nav,
  time-crunch row. **~0.5 days.**
- Small-screen variants (spec step 6): `useWindowDimensions` guard +
  two style branches. **~0.5 days.**
- Accessibility audit of all new/changed elements. **~0.5 days.**
- Integration testing (cluster, superset, deload, offline, ghost
  pre-fill edge cases). **~1 day.**
- `countProgressSets` extraction to shared utility (COMP-019/020
  dependency). **~0.25 days.**

**Total estimate: ~6.25 days.** Approved at E7. This is consistent.
The 0.75-day headroom is for the telemetry additions (M2–M4 above)
and any accessibility iteration.

### 9.4 Risks

**Risk 1 — chip consolidation breakage (highest probability).**
The seven chip-block elements being deleted each have their own
conditional rendering guard. Deleting them correctly requires verifying
that each guard's state is either fully subsumed by the new header lines
or that its information is preserved elsewhere. Specific checklist:
- `ghostChip`: ghost state still communicated via `valueInputGhost` style.
- `beatChip`: content promoted to beat line.
- `repeatLastBtn`: mechanic promoted to beat line tap.
- `inlineTargetChip`: content promoted to beat line (target numbers).
- `coachReasonChip`: content promoted to coaching line (Line 3).
- `stalledChip`: content promoted to coaching line (Line 3, highest priority).
- `setEntryTitle`: content promoted to orientation row (Line 1).

If any of these consolidations introduces a regression (e.g. the first-set
hint chip at lines 1476–1484 which is NOT deleted per the spec), the
risk is a missing piece of context. The first-set hint (`firstSetHint`
View, lines 1476–1484) is preserved by the spec and must not be deleted
in the chip-removal pass.

**Risk 2 — beat line touch target conflicts with card padding.**
The beat line requires paddingV sm=8 + hitSlop 4 to achieve ≥40pt. The
`setEntryCard` container already has `padding: spacing.lg` (16pt on all
sides). The beat line's paddingV must be scoped to the line itself (not
the container) and the hitSlop must extend downward toward the weight
stepper without overlapping it. Measure this in the simulator across
iPhone SE (375pt wide), iPhone 14 (390pt), and iPhone 14 Pro Max (430pt).

**Risk 3 — overflow sheet vs existing Swap modal conflict.**
The existing swap flow (handleOpenSwap) launches an async operation
(`getAllExercises()`) before opening `showSwapModal`. If the overflow
sheet calls `handleOpenSwap` directly, the overflow sheet must close
before or as the swap modal opens. Handle with:
`setShowOverflow(false); handleOpenSwap();` in sequence.

**Risk 4 — set-type picker access regression.**
Currently the set-type picker is openable from two paths: (a) the
`setTypeRow` at the bottom of SetEntry (deleted), (b) the existing
`onOpenSetTypePicker` prop on SetEntry. After the deletion, only the
orientation row (Line 1) opens the picker. Verify that the orientation
row tap target is accessible before the user starts entering values and
while the keyboard is open. The keyboard raising (`KeyboardAvoidingView`,
line 1181) may push the orientation row off-screen on small devices.
Test on iPhone SE simulator with keyboard open.

**Risk 5 — Rest timer layout collapse on very small screens.**
The one-row rest timer layout (numeral + three controls) at 64pt total
must still render correctly when restTimerRemaining is a 4-digit number
(e.g. "10:00" during an edited rest). The numeral `timeText` style uses
`fontSize: 28`; the row uses `flexDirection: 'row'` with `flex: 1` on
the label. Verify that the three controls don't wrap on a 320pt screen
(iPhone SE 1st gen equivalent) when a 5-character time string is shown.

### 9.5 Dependency approvals needed

None. All changes are within existing files using existing components,
tokens, store slices, and React Native primitives. No new packages.

### 9.6 Engine invariants

The `computeSetTargets` call and all of its inputs (`prevSets`,
`routineExercise`, `units`, `exercise.exerciseCategory`) are unchanged.
No algorithm modifications. The engine-invariant test suite
(`src/lib/__tests__/engine-invariants.test.js`) does not need extension
for COMP-001. COMP-015, which extends the engine, should extend that
suite independently.

---

## Sources

- [Previous Workout Values — Hevy App](https://www.hevyapp.com/features/track-exercises/)
- [How to Use Previous Workout Values in Hevy — Hevy Help Centre](https://help.hevyapp.com/hc/en-us/articles/36011896355479-How-to-Use-Previous-Workout-Values-to-Improve-Performance-in-Hevy)
- [Previous Workout Values vs Routine Values — Hevy Help Centre](https://help.hevyapp.com/hc/en-us/articles/34105442929943-Previous-Workout-Values-Vs-Routine-Values-How-to-Adjust-in-Settings)
- [Hevy vs Strong App Comparison 2026 — Setgraph](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026)
- [Hevy vs Strong — Setgraph](https://setgraph.app/ai-blog/hevy-vs-strong)
- [Hevy Reviews 2026 — Product Hunt](https://www.producthunt.com/products/hevy/reviews)
- [Strong App Review 2025 — RepReturn](https://repreturn.com/strong-app-review/)
- [UI/UX Case Study: Strong Workout App Redesign — Medium (Hwai Jun Yap)](https://medium.com/@hwaijunyap/ui-ux-case-study-strong-workout-app-redesign-fc22afbada65)
- [MacroFactor Workouts — macrofactor.com](https://macrofactor.com/workouts/)
- [Fitbod App UI/UX Design — UI Narrative](https://www.uinarrative.com/apps/fitbod)
- [JEFIT App Review 2026 — ETechShout](https://etechshout.com/jefit-app-review/)
- [JEFIT User Reviews — JustUseApp](https://justuseapp.com/en/app/449810000/jefit-workout-planner-gym-log/reviews)
- [JEFIT App Review — FitMenHQ](https://fitmenhq.com/jefit-app-review-2/)
- [Best Weightlifting Apps 2026: Compare Strong, Fitbod, Hevy — Just12Reps](https://just12reps.com/best-weightlifting-apps-of-2025-compare-strong-fitbod-hevy-jefit-just12reps/)
- [Strong vs Hevy 2026 — RepReturn](https://repreturn.com/strong-app-vs-hevy/)
