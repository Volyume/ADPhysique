# Campaign 5 — Phases 13-17: the first workout, from tap to completed session

Lane: Phases 13 (`c5-CAMPAIGN5-ORDER.txt` lines 220-229), 14 (232-239),
15 (242-249), 16 (252-257) and 17 (260-267) of the founder's Campaign 5
order. Branch `claude/campaign5-first-use`. **Audit only: this lane
changed no source, test, doc or configuration outside this file, and
committed, pushed and stashed nothing.**

**Method.** Every claim is read from the code on this branch and carries
`file:line` evidence. Where the order asks a comprehension question, the
answer quotes the copy the user actually sees. The journey is walked in
the real order: Home tap → pre-session prompt → logger mount → first set
→ progression → PR → summary → feedback → Close. The three first-use laws
are applied throughout, with the third (NO FALSE PERSONALISATION) treated
as the binding test for every suggestion, target and record claim.

**Bounds respected.** No proposal below adds AI, cardio, a feature, a
social/gamification surface, an advanced first-use control, a migration
or a redesign. Nothing touches Article 9, ED/wellbeing semantics,
D92-11, billing, or `ONBOARDING_QUIZ_FIRST`. Two findings land on
recorded founder items (FR-C4-4) or on PR semantics with no recorded
ruling; both are RECORDED, not resolved.

**Baseline used.** Phase 1's journey map
(`docs/first-use-audit-2026-08-10/CURRENT-FIRST-USE-JOURNEY.md`) is taken
as read for how the user reaches Home with an active plan. This lane
starts at the "Start workout" tap.

---

## 1. Summary of findings

| ID | Class | Severity | One-line claim |
|----|-------|----------|----------------|
| C5-P14-01 | DEFECT | HIGH | Every logged set is stamped with a fabricated `rir: 2` the user never gave, which defeats the progression engine's own written rule that unlogged effort must hold the load, and makes its honest "we don't know yet" fallback unreachable. |
| C5-P17-01 | DEFECT | HIGH | Tapping **Close** writes all four session ratings to the workout row with their untouched defaults, so "skipped" is stored as "moderate session, no joint discomfort" and enters the block ledger as genuine evidence. |
| C5-P16-01 | DEFECT | HIGH | After the first workout of a week, "This week's volume" delivers a finished-week verdict: every muscle reads "Below target", "below the minimum for growth", and the explanation tells the user to add sets, contradicting the plan they are three sessions into following. |
| C5-P15-01 | DEFECT | HIGH | The honest-first-lift guard is exactly one set deep: a warm-up consumes it, and the first working set ever logged is then celebrated with the full gold "New estimated max lift" record for beating that warm-up. |
| C5-P17-02 | DEFECT | HIGH | The rating rows open with the default values already selected and labelled ("Difficulty · Moderate", "Joint discomfort · None"), so the form displays four answers the user never gave, directly contradicting its own "Skip anything you're not sure about". |
| C5-P13-01 | DEFECT | MEDIUM | No stop-short-of-failure guidance exists anywhere in the logger; the effort target is published only on Home as "Effort 3/5" behind a tooltip, and is never restated at the moment a set is performed. |
| C5-P13-02 | DEFECT | MEDIUM | `hasInProgressSetEntry()` is true in almost every real state, so the finish confirm nearly always claims "an unlogged set ... will be lost" when nothing is at risk, and the L07-F10 straight-to-finish path is effectively dead. |
| C5-P13-03 | IMPROVEMENT | MEDIUM | **The deferred sighted-novice `set`/`rep` item.** The words are defined only inside an alert behind an unlabelled "…" button, and the one-time pulse marking that button is extinguished by logging the first set even if it was never opened. |
| C5-P13-04 | IMPROVEMENT | MEDIUM | Warm-ups are invisible during first use: never prompted (recorded decision B8), reachable only two taps deep behind "…", and the sheet refuses to help until a working weight has already been entered. |
| C5-P14-02 | IMPROVEMENT | MEDIUM | On a zero-history exercise the reps stepper prefills the **top** of the rep band while the line above reads "8-12 reps", so a novice's first-ever set is anchored to the hardest end of the range at a weight nobody knows. |
| C5-P16-02 | IMPROVEMENT | MEDIUM | The first Workout Summary never answers "what happens next": no next-session cue, and the reason feedback is being asked for sits inside the collapsed panel. |
| C5-P17-03 | IMPROVEMENT | MEDIUM | The purpose sentence is inside the expander, so the user must commit to rating before being told why rating matters; the collapsed state offers only "Workout feedback / optional / How did the session feel?". |
| C5-P14-03 | IMPROVEMENT | LOW | "Est. max" appears on the very first set, glossed as "worked out from your recent sets" when it is computed from one unlogged entry. |
| C5-P15-02 | UNCERTAIN | MEDIUM | Within the first session, set 2 beating set 1 is a full personal record and reaches the summary as "1 new PR". No recorded ruling covers within-session records; RECORDED, not resolved. |
| C5-P14-04 | FOUNDER-GATED | MEDIUM | FR-C4-4 (computeSetTargets has no CALC-5 bodyweight guard) is not latent in first use: a seeded bodyweight plan reaches "Add 0.25kg next session" on session two, and C5-P14-01 is what unlocks it. |
| C5-P13-C1 | CLEAN | - | The zero-history exercise state is honest end to end: "First time - Target", non-tappable, no fabricated "Last:" row, no record flag, no receipt. |
| C5-P13-C2 | CLEAN | - | Substitution is honest and non-destructive: the plan is explicitly unchanged and the outgoing exercise's planned load is cleared rather than inherited. |
| C5-P13-C3 | CLEAN | - | Unilateral logging is a one-time walkthrough, asked once per exercise, never forced, and correctly states it still counts as one working set. |
| C5-P13-C4 | CLEAN | - | Abandon, interrupt and resume are all covered: a typed set survives an app kill, a stale session offers Resume/Finish/Discard, and discard confirms then hard-deletes. |
| C5-P13-C5 | CLEAN | - | The pre-session prompt is the model the rest of this lane should copy: purpose stated up front, optional, tap-to-clear, Skip, and a standing opt-out that writes honest nulls. |
| C5-P14-C1 | CLEAN | - | `computeSetTargets` returns empty on empty history, so no weight, no target and no coach line is invented for a first-ever exercise. |
| C5-P14-C2 | CLEAN | - | The plan engine never writes a `startingWeight`, so a generated first plan cannot assert a load it has no basis for. |
| C5-P14-C3 | CLEAN | - | A swapped-in exercise rebuilds its rep band from the new exercise and nulls the carried-over starting weight, so a substitution cannot inherit a stranger's numbers. |
| C5-P15-C1 | CLEAN | - | Where the first-lift guard does apply it is exactly right: never announced as a record, gentle haptic, excluded from the session PR list, still kept as the baseline. |
| C5-P15-C2 | CLEAN | - | The live record line returns null on empty history and reuses `detectPR`, so the logger can never promise a record it then withholds. |
| C5-P15-C3 | CLEAN | - | The `first_pr` milestone is deliberately never claimable from the summary, so a first PR cannot be celebrated twice. |
| C5-P16-C1 | CLEAN | - | Every history-dependent summary card degrades correctly at zero history: the 4-week comparison, the onward links, the milestone card, the block story and the photo prompt all stay absent. |
| C5-P16-C2 | CLEAN | - | The first-session acknowledgement is calibrated and fails closed: one calm line, suppressed under calm mode, an open ED flag, or a failed read of either. |
| C5-P17-C1 | CLEAN | - | The purpose sentence itself is correct Campaign 2 work: it states the consequence, never the algorithm, and never teaches which answer buys more sets. |
| C5-P17-C2 | CLEAN | - | The adaptive engine is properly gated: it does not run on an unrated session, unanswered fields map to null, and insufficient-feedback holds are never persisted as adaptation events. |
| C5-P17-C3 | CLEAN | - | Skipping remains genuinely valid: the panel is collapsed by default, labelled "optional", and Close is never gated on it. |

Counts: **7 DEFECT, 6 IMPROVEMENT, 1 FOUNDER-GATED, 1 UNCERTAIN, 16 CLEAN.**

---

## 2. PHASE 13 — the first workout, tap to completion

### 2.1 The actual route in

Home's primary action is unambiguous. `HomeScreen.js:1900-1907` renders a
single filled `Button title="Start workout"` with an
`accessibilityLabel` naming the routine, and the founder note directly
above it at `:1894-1897` records that the old first-run variant
promoting a cut-down session was removed because it "read as the wrong
default". A first-use user has one obvious action.

The tap does not open the logger. `handleStartNextWorkout` sets
`setShowIntentPrompt(true)` (`HomeScreen.js:1268`) and the session only
begins from `confirmStart` (`:1281-1297`). So the real first-workout
sequence is:

**Start workout → "How are you feeling today?" sheet → intent tap (or
Skip) → ActiveWorkout.**

**C5-P13-C5 — CLEAN.** That sheet is the best-built consent-to-be-asked
surface in this lane and is the pattern §6 should be measured against
(`HomeScreen.js:2151+`):

- Purpose first, in consequence terms: *"Takes a second. Your answers
  shape how your sessions are read and, when coaching is active, whether
  today's planned workload still makes sense."*
- The readiness rows are headed **"Readiness (optional)"** and every
  chip is unselected until tapped; tapping a selected chip clears it,
  with the comment "so the row stays genuinely optional".
- **Skip** passes `{ soreness24hBefore: null, sleepQuality: null,
  energyScore: null }`.
- A standing opt-out persists `@volyume_intent_prompt_off` and then
  starts "exactly as Skip would, null intent, no readiness, no
  fabricated input".

Nothing is defaulted, nothing is pre-selected, and unknown stays
unknown. Hold that against §6.

### 2.2 The logger surface a first-time user meets

`ActiveWorkoutScreen.js` composes: `WorkoutHeader` (close, "Elapsed"
timer, Finish), `ExerciseNav` (tab per exercise), a `StatusStrip` of
named chips, `RestTimer`, the `NowCard`, the "This workout" receipt and
`WorkoutBottomBar`.

For a brand-new user on their first exercise the `NowCard` reads
(`:2803-2804`, `:2384-2394`, `:2769-2797`):

```
Set 1 of 3 · Working · 8-12 reps        ›
First time - Target 8-12 reps
[ Weight (kg)  −  ____  + ]
[ Reps         −   12   + ]
✎ Add a note
```

and the bottom bar shows a single primary **Log set**
(`WorkoutBottomBar.js:68-79`).

**C5-P13-C1 — CLEAN. The zero-history exercise state is honest.** Four
independent surfaces all decline to invent history:

- The prefill row is the non-tappable variant with no `onUse`
  (`:2796-2797` → `NowCard.js:164-173`), labelled `First time - Target`.
  It cannot be mistaken for "Last:", which is a different branch
  (`:2786-2795`).
- `buildRecordLine` returns `null` for an empty history, so no
  "Best ... " reference and no record flag renders
  (`workoutRecordLine.js:65-67`).
- The coach line is absent, because `targetReason` is null (§3.1).
- The "This workout" receipt is gated on `loggedSets.length > 0`
  (`:2946`), so there is no empty list.

### 2.3 C5-P13-01 — DEFECT (MEDIUM). Stop-short-of-failure guidance never appears in the logger.

The order lists "reps-short-of-failure guidance" as a Phase 13 element,
and Phase 34 requires a novice to understand it. It is not there.

`SetEntry.js:466-469`:

```
{/* Effort picker removed, was rarely used in practice. RIR still
    gets recorded internally (defaulted in DEFAULT_SET) so the
    autoregulation engine keeps working; we just don't ask the
    user to set it per-set. */}
```

Sweeping every screen and component for effort/RIR copy returns exactly
two live surfaces, neither in the logger:

- `BlockProgressCard.js:36-45`, on Home: `Week 1/6 · Effort 3/5` with an
  `InfoTooltip` carrying `GLOSSARY.effort` = *"How close to failure the
  set should feel: 5 = leave nothing, 0 = very easy."*
- `HomeBlockShapeSheet.js:66`, the only place `GLOSSARY.rir` renders,
  which is the one string in the app that says it plainly: *"...'stop 2
  short' means finish the set when you believe you could still do about
  2 good reps."*

**User scenario.** A novice on their first session reads "Set 1 of 3 ·
Working · 8-12 reps" and has no idea how hard to push. To learn, they
must have previously opened a Home sheet, translated "Effort 3/5" into
"leave 2 reps", and carried it into a session that never mentions it
again. The one string that would tell them lives two screens away.

**Law violated.** Second first-use law, inverted: the product teaches
this away from the point of use and stays silent at it. Also Phase 13's
own bar, "a user with basic gym knowledge should be able to complete a
session without opening Methodology".

**Proposed minimal fix.** No new control and no new surface: reuse the
`NowCard` context slot that already exists and is already priority-
ordered (`:2742-2760`). On the first working set of an exercise, when no
higher-priority context is showing, render the block's own effort target
as one plain sentence derived from `currentMesoWeek.rirTarget` (the
value Home already publishes), in `GLOSSARY.rir`'s existing wording. It
is dismissible by the same `onDismiss` the coach line already has.

### 2.4 C5-P13-02 — DEFECT (MEDIUM). The "unlogged set will be lost" warning is almost always false.

`ActiveWorkoutScreen.js:831-837`:

```js
function hasInProgressSetEntry() {
  return !!cluster
    || !!perSide
    || (currentSet.weight !== '' && currentSet.weight != null)
    || currentSet.reps !== DEFAULT_SET.reps
    || noteText.trim().length > 0;
}
```

`DEFAULT_SET.reps` is `8` (`:77`). Two ordinary states make this true
with no user input at all:

1. **Before anything is typed.** On load, a zero-history exercise gets
   `reps: routineExercise?.recommendedRepsMax || DEFAULT_SET.reps`
   (`:1244`). Any plan whose rep band does not top out at exactly 8 (the
   seeded plans use 10, 12, 25, 30) leaves `currentSet.reps !== 8`
   immediately.
2. **After any set is logged.** The carry-forward at `:1547-1549` sets
   `weight: setData.weight`, a number, so `currentSet.weight !== ''` is
   true for the rest of the session.

Consequences at both exits:

- `handleCancelWorkout` (`:839-856`) is designed to discard a genuinely
  empty session silently. Because of (1) it instead shows the
  "Discard workout?" modal to a first-time user who opened their session
  and touched nothing.
- `handleFinishWorkout` (`:2345-2357`) is designed by L07-F10 to finish
  immediately "when every planned exercise already has a set ... there
  is nothing to silently discard". Because of (2) `hasInProgressSetEntry()`
  is true, so the fast path never runs, and the confirm appends
  *"You also have an unlogged set for Bench Press that will be lost."*
  when the only thing in the entry is the carried-forward copy of the
  set they just saved.

**User scenario.** A novice finishes a complete first session, taps
Finish, and is told they are about to lose work. They do not know which
set, so they tap "Keep going", hunt for the missing set, find nothing,
and finish again.

**Law violated.** Not a first-use law but Campaign 1 honesty: the app
states as fact something that is not true.

**Proposed minimal fix.** Compare against the entry's own resolved
baseline rather than the module constant: hold the values the last
`setCurrentSet` seeded (the ghost/carry-forward/plan values) in a ref and
treat "unchanged since seeding" as not-in-progress. `cluster`, `perSide`
and `noteText` clauses stay exactly as they are.

### 2.5 C5-P13-03 — IMPROVEMENT (MEDIUM). The deferred sighted-novice `set` / `rep` item: the first-use evidence.

The order permits addressing this only "IF first-use evidence shows the
normal user can encounter those words without an understandable cue".
That evidence, gathered:

**Where the words appear before any explanation is available.** The
`NowCard`'s first line is `Set 1 of 3 · Working · 8-12 reps`
(`:2384-2394`, `:2803-2804`); the stepper labels are `Weight (kg)` and
`Reps` (`SetEntry.js:149, 370`); the primary button is `Log set`; the
receipt heading is `This workout` (`:2948`).

**Where the definitions live.** Exactly one place. `GLOSSARY.set` and
`GLOSSARY.rep` (`coachGlossary.js:82-85`) are surfaced by a single call
site in the entire app (`:3481`), inside an `appAlert` titled **"How
logging works"**, reached from a row in the overflow sheet.

**How a novice is supposed to find it.** The only cue is a scale
animation on the overflow button (`:2554-2556`). That button is an
`ellipsis-horizontal` glyph whose `accessibilityLabel` is **"Exercise
options"** (`:2552`) — it does not say "what these words mean". The
pulse is a bare icon animation with no badge or label attached.

**And the cue is destroyed by the action it is meant to explain**
(`:1468-1473`):

```js
if (showInfoTipPulse) {
  infoPulseLoop.current?.stop();
  ...
  AsyncStorage.setItem('@volyume_seen_workout_info', 'true').catch(() => {});
}
```

This runs inside `handleCompleteSet`, on the first logged set, whether or
not the user ever opened the menu. The flag is once-ever
(`:976-978`), so the cue never returns on any exercise in any later
session.

**Answer to the order's question.** Yes: a sighted novice can, and by
default does, meet "set", "rep", "working set" and "warm-up" with no
understandable cue attached to those words. The only affordance is
mislabelled as something else and self-destructs on first use.

**Proposed minimal fix, within "do not turn the workout logger into a
tutorial".** Do not add a lesson to the card. Two contained options for
a lead ruling:

- (a) Attach the cue to the words instead of the menu: make the existing
  `volyume-set-type-btn` line carry a single `InfoTooltip` for
  `GLOSSARY.set` + `GLOSSARY.rep`, using the tooltip primitive the app
  already uses for "Est. max" one card-row below (`SetEntry.js:438`).
- (b) Keep the pulse where it is but stop the first logged set consuming
  it: clear the flag only on an actual overflow open (`:2541-2546`
  already does this), so the affordance survives until it is used.

Both are copy/affordance-level and neither adds a screen, a modal or a
step.

### 2.6 C5-P13-04 — IMPROVEMENT (MEDIUM). Warm-ups do not exist during first use.

Warm-ups are never offered. `:1265-1271` records the decision: "Warm-up
sets are no longer forced on the first set of every exercise ... The
default is now a clean working set", and `:2724-2728` records B8's
reason (they auto-appeared on every exercise and broke supersets). **That
recorded decision is not challenged here** and no proposal below reverses
it.

What remains is discoverability. The ramp is at overflow "…" → "Warm-up
sets" (`:3370-3375`), and its first branch refuses to help the user who
most needs it (`:3386-3391`):

> "Enter your working weight first, then come back for warm-up sets."

A first-time user does not have a working weight; that is the entire
zero-history case, where `weight` is `''` (`:1243`).

When it does render, the copy is good (`:3407`): *"Working up to 60 kg.
Choose a warm-up set to load it, then tap Log warm-up. Warm-ups are saved
but not counted in your working-set target."*

**User scenario.** A novice's first-ever session is logged with no warm-up
at all, because nothing in the product mentions warming up and the one
tool that would help is behind an unlabelled menu and gated on a number
they have not chosen yet.

**Proposed minimal fix (discoverability only, no auto-suggestion).**
Make the empty-branch copy actionable instead of a dead end: when no
working weight is entered, offer the same ramp seeded from the
exercise's rep band rather than telling the user to leave and come back.
Flagged for a lead ruling because it sits adjacent to recorded decision
B8.

### 2.7 The remaining Phase 13 elements, verified

**C5-P13-C2 — CLEAN. Substitution.** The swap sheet states the
consequence plainly (`:3844`): *"Choose a close match for today. Your
plan is not changed, and sets you log count towards the new exercise's
own muscle in your weekly volume."* Each candidate carries its own
`item.reason`, and the empty state routes to the full library rather
than dead-ending (`:3860-3864`).

**C5-P14-C3 — CLEAN. Swap cannot inherit stale numbers.**
`handleConfirmSwap` (`:751-799`) rebuilds the routine row from the new
exercise's own defaults and sets `startingWeight: null` (`:772`), with
the rationale recorded at `:754-759`: a swapped-in lateral raise must not
prefill the outgoing exercise's load. `prevSets`, `allTimeSets` and
`loggedSets` are all cleared.

**Edit / remove.** Removing states the consequence and confirms
(`:713-741`): *"Remove {name} from this session. Your plan is not
changed."*, with a guard against removing the only exercise. Editing a
logged set is in-place inside `LoggedSetRow` with Save/Cancel, and the
edit path re-runs `detectPR` against a history that excludes the edited
set (`:1771-1782`) so a corrected set cannot match itself.

**C5-P13-C3 — CLEAN. Unilateral.** Fires only for
`exercise.laterality === 'unilateral'`, once per exercise ever
(`:950-970`), with the full walkthrough only the very first time
(`UNILATERAL_WALKTHROUGH_SEEN_KEY`, `:105`). The confirm copy answers the
comprehension question directly: *"{name} is usually trained one side at
a time. Do the same reps on each side, one after the other; it still
counts as one working set."* Both answers are offered neutrally.

**Rest timer.** Renders only while running (`:2714`), shows the
countdown with an "Add 15 seconds" / "Remove 15 seconds" pair and a
Skip (`RestTimer.js:437-462`), and ends with "Start next set"
(`:406`). Auto-start honours the user's pref (`:1591-1593`). Nothing to
report.

**C5-P13-C4 — CLEAN. Errors, abandon, resume.** A typed set is persisted
per workout+exercise on a 250 ms debounce and flushed immediately on
background (`:1344-1371`), so an iOS process kill mid-set does not lose
it. A session inactive for over four hours raises the Resume sheet
(`:889-895`, `:3257-3304`) offering **Resume / Finish workout /
Discard**, with a second confirm and a hard delete on discard. A failed
finish is honest (`:2330-2332`): *"Your sets are still saved, but the
workout did not close on your device, so tap Finish workout again."*

---

## 3. PHASE 14 — the first progression, with no history

The order's bar: "The app must not pretend it knows the user's strength
... Do not imply precision that does not exist yet."

### 3.1 C5-P14-C1 / C5-P14-C2 — CLEAN. Nothing is invented on an empty history.

`computeSetTargets` refuses at the door (`algorithms.js:391-397`):

```js
export function computeSetTargets(prevSets, repMin, repMax, units = 'kg', options = {}) {
  if (!prevSets || prevSets.length === 0) return { targets: [], reason: null };
```

The screen consumes that faithfully (`:1212-1225`): `setTargets([])`,
`setTargetReason(null)`. Since `showCoach` requires `!!coachText`
(`:2738-2741`), no coaching line renders on a first-ever exercise. The
rep range shown falls back to the plan's own band, not an invented one
(`:2769-2773`), and the weight input falls back to
`routineExercise?.startingWeight ?? ''` (`:1243`).

That fallback is safe because the plan engine never writes one:
`planAutoGen.js:191` passes `null, // startingWeight, engine doesn't set
this`. The only writer is the manual builder, where the user types it
(`BuildWorkoutScreen.js:351-353`). **So a generated or library first plan
cannot assert a load, and the first-ever weight field is genuinely
blank.** That is the third first-use law honoured.

### 3.2 C5-P14-01 — DEFECT (HIGH). A fabricated RIR of 2 is written on every set, and it defeats the engine's own safety rule.

`ActiveWorkoutScreen.js:77`:

```js
const DEFAULT_SET = { weight: '', reps: 8, setType: 'straight', notes: '', rir: 2 };
```

`SetEntry` no longer asks for effort (`SetEntry.js:466-469`, quoted in
§2.3), and no other surface sets it. The value is nonetheless written to
the database on every set (`:1438`):

```js
rir: currentSet.rir != null ? parseInt(currentSet.rir, 10) : null,
```

`currentSet` is always seeded from `DEFAULT_SET` (`:1235-1246`,
`:788-791`), so `rir` is `2` on effectively every set a first-use user
logs.

**What that breaks.** `computeSetTargets` treats null RIR as the signal
that it must not add load, and says so in its own comment
(`algorithms.js:424-431`):

```js
// Hit top of band, only increase load if RIR was logged AND ≥ 1.
// Null RIR → hold weight. Novice lifters systematically underestimate their
// RIR by 2-4 reps; optimistically increasing load when RIR is unlogged drives
// premature overload. Log RIR to unlock progression suggestions.
const hadHeadroom = prevRIR !== null && prevRIR >= 1;
```

With a hardcoded 2, `hadHeadroom` is **always true**. The rule is
unreachable. The guard written specifically to protect novices from
premature overload cannot fire for anyone.

**And its honest fallback copy is dead.** `algorithms.js:543-544`:

```js
const noRIRLogged = targets.every(t => t.prevRIR === null);
const repsHitTopNoRIR = noRIRLogged && targets.every(t => t.prevReps >= max);
```

`noRIRLogged` can never be true, so this line can never render
(`:551-552`):

> "You hit the top of the range. Next time, note how many reps you had
> left and we'll tell you whether to add weight."

That is precisely the "we don't know yet" sentence Campaign 2 and this
campaign's third law ask for, and it is unreachable. The user gets the
confident branch instead (`:557-559`): *"All sets hit the top of the
range. Add 2.5kg next session."* Note also that even if it were
reachable, it instructs the user to "note how many reps you had left",
which the product removed the control for.

**User scenario.** A novice's second session of an exercise: they hit
12 reps on a weight that was genuinely a maximal grind. Because the app
recorded "2 reps in reserve" on their behalf, it tells them to add
weight. They add weight. The guard written to stop exactly this did not
run.

**Law violated.** Third first-use law (no false personalisation: the
app is acting on an effort report the user never made), and the
engine's own written contract.

**Proposed minimal fix.** `DEFAULT_SET.rir: null`, and leave
`:1438` exactly as it is, so an unrated set persists `NULL`. No engine
module changes; `computeSetTargets` then behaves as its comment already
promises and the `repsHitTopNoRIR` copy becomes live. **This changes
progression output for existing users, so it needs a recorded lead
ruling before implementation, and it should land with C5-P13-01 so the
user is told the effort target rather than merely stopping being
guessed at.** The ghost/draft paths (`:1197`, `:1257`, `:1325`) already
handle `null` correctly.

### 3.3 C5-P14-04 — FOUNDER-GATED (MEDIUM). FR-C4-4 is live in first use, and C5-P14-01 is what unlocks it.

FR-C4-4 (recorded in `docs/coherence-cleanup-2026-08-10/D95-RULINGS.md`,
and in `algorithms.js:305-317`) is that `computeSetTargets` lacks the
CALC-5 bodyweight guard which `getProgressionSuggestion` has: on an
unloaded exercise it "prescribes a spurious +0.25 kg".

This lane confirms it is **not latent for a new user**. `seedRoutines.js`
ships `Bodyweight Squat` (`equipment: 'bodyweight'`, `:28`) inside a
seeded plan at 15-25 and 20-30 reps (`:917`, `:929`, `:939`). Traced on
that data: `prevWeight = 0`, reps hit the top of the band, `prevRIR = 2`
(fabricated, per §3.2) so `hadHeadroom` is true, `maxJump = 0 * 0.05 = 0`,
`capped = 0`, and the floor at `algorithms.js:441` yields
`targetWeight = 0 + Math.max(0.25, 0) = 0.25`. The session-two reason
line becomes *"All sets hit the top of the range. Add 0.25kg next
session."* for a bodyweight squat.

**Recorded, not resolved.** FR-C4-4 is a carried founder ruling
(`c5-CAMPAIGN5-ORDER.txt:544`) and this lane does not resolve it. The
evidence that changes its **priority** is: (a) it is reachable on a
seeded first plan, not an edge case; and (b) fixing C5-P14-01 alone does
not close it — it makes it rarer, because a null RIR would hold the load
instead. Both should be ruled together.

### 3.4 C5-P14-02 — IMPROVEMENT (MEDIUM). The first-ever set is anchored to the top of the rep band.

`:1240-1246`, the zero-history branch:

```js
setCurrentSet({
  ...DEFAULT_SET,
  weight: routineExercise?.startingWeight ?? '',
  reps: routineExercise?.recommendedRepsMax || DEFAULT_SET.reps,
});
```

So on an 8-12 plan the card reads "8-12 reps" on the header, "First time
- Target 8-12 reps" on the prefill row, and the stepper sits on **12**.

A novice reads a prefilled number as an instruction. On a first-ever set
with a blank weight, the app is simultaneously saying "we don't know your
strength" and pre-selecting the hardest end of the band. No comment
records a rationale for `recommendedRepsMax` over `recommendedRepsMin`
here.

**Proposed minimal fix.** For the zero-history branch only, seed the
reps stepper from `recommendedRepsMin`, leaving the carry-forward
(`:1547-1549`) and the history-anchored branch (`:1233-1239`)
untouched. Raised as an IMPROVEMENT rather than a DEFECT because it is a
defensible product choice; it wants a lead ruling.

### 3.5 C5-P14-03 — IMPROVEMENT (LOW). "Est. max" on the first set.

`SetEntry.js:138-139` computes `live1RM` as soon as weight and reps are
both positive, and `:430-440` renders `Est. max ~74kg` with an
`InfoTooltip` carrying `GLOSSARY.estMax`: *"An estimate of the most you
could lift once, worked out from your recent sets."*

On the first-ever set there are no "recent sets" — it is derived from
the single, still-unlogged entry currently in the stepper. The number is
arithmetically honest; the gloss's plural overstates its basis.

**Proposed minimal fix.** None to the calculation. Either accept, or
soften the gloss's basis clause. Recorded for completeness because
Phase 14 explicitly names "first Est. max".

### 3.6 The remaining Phase 14 elements

**Failure to hit target / an unusually easy set.** Neither produces any
in-session response. Targets are computed once at exercise load
(`:1212-1225`) from the *previous* session, so nothing reacts within the
session. On a first workout there is no target weight at all, so there
is nothing to miss — correct behaviour, and no false claim.

**Exercise novelty.** Handled by the same empty-history path: a
freshly-added or swapped-in exercise resets `prevSets`/`allTimeSets` to
`[]` (`:785-787`, `:733-735`) and therefore renders the honest first-time
state described in §2.2.

---

## 4. PHASE 15 — the first PR, in real chronology

The order: "If a user's first-ever performance is celebrated as a 'new
personal record' without a prior record: classify whether that is
intended. If product ruling is ambiguous: record it rather than
inventing new PR semantics."

### 4.1 The recorded ruling, and C5-P15-C1 — CLEAN.

There **is** a recorded ruling, and it is only about the first set.
Wave A A1 (`docs/wave-a-build-status-2026-07-03.md:136`,
`docs/logger-rebuild-2026-07-12/BEHAVIOURAL-CONTRACT.md:75`) is
implemented at `:1512-1528`:

```js
if (prs.length > 0 && prHistory.length === 0) {
  // Wave A A1: the first-ever set of an exercise beats nothing,
  // detectPR compares against empty history, so "PERSONAL RECORD"
  // would be a false claim in the very session that builds trust.
  showPRCelebration({ type: 'first_lift', ...
    label: `${setData.weight}${units} x ${setData.actualReps} logged as your starting point`,
```

`PRCelebration` honours it fully (`:159-161`, `:171-176`, `:209-211`):
the label is "First lift logged", the screen-reader announcement is
*"First lift logged: ..."* and never the word record, the haptic drops
to `selection()`, and the icon is the neutral primary barbell rather
than gold. It is excluded from `detectedPRs` (`:1529-1541`), so it never
reaches the summary. `detectPR` itself is untouched, so the set still
becomes the baseline.

**C5-P15-C2 — CLEAN.** `buildRecordLine` applies the same rule before
the log (`workoutRecordLine.js:65-67`), and reuses `detectPR` over the
same history shape so "the screen must never promise a record it then
fails to award" holds by construction (`:9-15`).

**C5-P15-C3 — CLEAN.** `WorkoutSummaryScreen.js:617-619, :629`
deliberately holds `everHitPR: false` so `milestones.js`'s `first_pr` rung
(`:87-91`, "Your first personal record") can never fire on top of the
celebration.

### 4.2 C5-P15-01 — DEFECT (HIGH). A warm-up consumes the honest first, and the first working set is then a gold record.

The guard is `prHistory.length === 0`. Two facts make that one set deep,
and make a warm-up count as the set that spends it:

1. **PR detection is not gated on set type.** `:1511`:
   `const prs = isWeightReps ? detectPR(setData, prHistory, exercise, units) : [];`
   The only gate is the weight-and-reps schema. `isWarmupSet` exists two
   lines earlier (`:1494`) and is not consulted.
2. **Warm-ups enter the PR history.** `:1507` appends unconditionally:
   `sessionSetsRef.current = [...sessionSetsRef.current, setData];`, and
   `getAllCompletedSetsForExercise` (`database.js:3043-3053`) has no
   `set_type` filter, so past sessions' warm-ups are in it too.
   `workoutRecordLine.js:12` documents the same shape: "warm-ups
   included".

**Traced user scenario, brand-new account, first exercise, first session:**

- The user opens "…" → "Warm-up sets", loads `20 kg × 10`, taps **Log
  warm-up**. `prHistory` is `[]`; `detectPR` returns a
  `heaviest_weight` PR (20 > 0), so the `first_lift` branch fires:
  **"First lift logged — 20kg x 10 logged as your starting point"**. The
  honest acknowledgement has been spent on a warm-up.
- The user then logs their first working set, `60 kg × 8`. `prHistory`
  is now `[warm-up 20×10]`, so `prHistory.length !== 0`. `detectPR`
  returns `1rm_estimate` (74 beats 26.7) and `heaviest_weight` (60 beats
  20). The `else if` branch (`:1529-1541`) fires the **full gold
  celebration, "New estimated max lift"**, with the PR haptic ladder,
  and pushes it into `detectedPRs`.
- The summary then renders **"1 new PR - Bench Press"**
  (`WorkoutSummaryScreen.js:1301-1311`).

The user's first working set ever is announced as a personal record for
beating their own warm-up. That is exactly the false claim "in the very
session that builds trust" the recorded ruling exists to prevent.

**Law violated.** Third first-use law, and the recorded intent of Wave A
A1.

**Proposed minimal fix.** Do not touch `detectPR` or its maths. Exclude
warm-ups at both call sites that assemble the history, together, so the
D87 agreement contract holds:

- `:1511` — skip PR detection entirely when `isWarmupSet` (a warm-up is
  by definition not a record attempt; `buildRecordLine` already returns
  null for warm-ups, `workoutRecordLine.js:62`).
- `:1503-1506` and `:2445` — filter `set_type === 'warmup'` out of
  `prHistory` / `historySets` in both places in the same change.

`buildRecordLine.js:9-15` states the two must move together; this fix
keeps them agreeing.

### 4.3 C5-P15-02 — UNCERTAIN (MEDIUM). Within-session records on the first session. RECORDED, not resolved.

Even with warm-ups excluded, the guard remains one set deep. On the
first session of an exercise:

- Set 1, `60 × 8` → `first_lift`, correct.
- Set 2, `60 × 9` (a novice pushing the last set) → `prHistory` is
  `[60×8]`, so `maxRepsAtWeight = 8 > 0` and `reps 9 > 8`
  (`algorithms.js:612-624`) → **"Most reps at 60kg: 9 reps"**, full gold
  celebration.
- Set 2, `62.5 × 8` (a novice ramping) → two PRs, headline
  **"New estimated max lift"**.

Either lands on the summary as "1 new PR". Meanwhile `buildRecordLine`
amplifies it live: after set 1 the card shows `Best 60kg × 8` and, as
soon as 62.5 is dialled, the gold flag *"Record set if you hit this /
Heaviest ever, best is 60kg"* — during the user's first session.

Against Campaign 2's canonical definition (`coachGlossary.js:29`) this is
literally true — "a new best for you on an exercise" — but the same
sentence ends "PRs are the clearest sign your training is working", which
a second set four minutes after the first is not.

**Classification.** The recorded ruling (Wave A A1) covers the
first-ever set only. **No recorded ruling covers records set against
history that is minutes old, and answering it requires new PR
semantics.** Per the order, this is RECORDED and not invented. It is
raised for a founder/lead ruling with the two candidate shapes stated
neutrally: (a) leave as-is, accepting that ascending sets in one session
count; or (b) compare against sessions other than the current one for
celebration purposes only, leaving stored records untouched. **No change
proposed by this lane.**

---

## 5. PHASE 16 — the first Workout Summary

The order's bar: the user should understand what they accomplished, what
was logged, why feedback is asked, what it influences, and what happens
next — without mature-block analytics or metrics requiring history.

### 5.1 What actually renders after a first workout

Walked in render order (`WorkoutSummaryScreen.js:1056-1624`), for a user
with one completed session and no other history:

| Card | Renders? | Gate |
|------|----------|------|
| "Workout complete" + date + first-session line | yes | `totalCompleted === 1` (`:613-615`) |
| Milestone card (gold) | **no** | `totalCompleted > 1` (`:620`) |
| Hero "Total lifted" tonnage + tooltip | yes | always (`:1131-1137`) |
| 4-week comparison verdict | **no** | `comparison.priorCount > 0` (`:1141`) |
| Exercises / Working sets / Duration | yes | always (`:1179-1189`) |
| Partner beat | **no** | Pro + paired + not suppressed (`:1198`) |
| "Your block" arc strip | yes | `mesoWeek.plannedWeeks >= 2` (`:1249`) |
| Per-exercise set list | yes | (`:1267-1299`) |
| "N new PRs" row | **sometimes** | `detectedPRs.length > 0` — see §4 |
| Onward links | **no** | needs a PR or an up/best comparison (`:1014-1026`) |
| Photo prompt | **no** | needs a milestone or PB (`:1035-1040`) |
| "This week's volume" | **yes** | `musclesWorked.length > 0` (`:1368`) |
| Block recap / "Block finished" | **no** | final planned week (`:473`) |
| "Adjusted today" row | **no** | needs session adjustments (`:1526`) |
| "Workout feedback" card | yes | `!readOnly` (`:1543`) |

**C5-P16-C1 — CLEAN. Empty-history degradation is genuinely good.**
Every card that needs history is correctly gated and simply absent.
Nothing renders a zero, a dash or a broken chart. The 4-week comparison,
the milestone ladder, the onward links, the block story and the photo
prompt all withhold themselves. This is the Phase 16 requirement met.

**C5-P16-C2 — CLEAN. The first-session line.** `:613-615` renders
*"Your first workout is done, and that's the hard part over."* only when
`totalCompleted === 1`, and only when not suppressed. The suppression
read fails **closed** (`:598-608`): a failed wellbeing read maps to
`'read_failed'` which `calm` treats as calm, and any open ED flag
suppresses. Correct, and untouched by this audit.

### 5.2 C5-P16-01 — DEFECT (HIGH). "This week's volume" gives a finished-week verdict after one session.

The window is correct and deliberate (`:560-578`): Monday-anchored,
bounded both ends, so it is the session's own week **to date**. After
session one of a four-session week it therefore contains one session's
sets, judged against a full week's landmarks
(`algorithms.js:256-283`).

For a first chest session of, say, 6 working sets against a chest MEV of
8, the card renders:

- Heading: **"This week's volume"** (`:1374`)
- Badge: **"Below target"** (`algorithms.js:270`)
- Line: **"6 sets · below the minimum for growth (target: 8–22
  sets/week)"** (`volumeInsightCopy.js:28`)
- "Why this status?" expands to (`volumeInsightCopy.js:52-53`):
  *"Below the 8-set floor where reliable growth signals start to appear
  in research. **Two routes next week: add a couple of sets to an
  existing exercise, or sneak in one extra movement that hits Chest.**
  Targets adjust over time as your body responds to training."*

Every muscle the user trained shows this, because one session cannot
reach a weekly floor.

**User scenario.** A new user finishes their first workout, exactly as
their plan prescribed, and the completion screen tells them every muscle
they trained is below the minimum for growth and advises them to add sets
next week. Their plan already covers those sets on Wednesday and Friday.
The app has contradicted its own prescription at the most trust-sensitive
moment in the product.

**Law violated.** Phase 16's explicit instruction to avoid "meaningless
trend comparisons" and "metrics requiring history", and Campaign 2's
"we don't know yet" rule: this is a mid-week partial reported as a
finished-week verdict.

Note the tooltip already knows better (`:1386`): *"Grey = Below target:
not enough logged **yet** to drive growth"*. The row copy and the "why"
body do not carry that hedge.

**Proposed minimal fix.** Do not change `getVolumeStatus`, the
landmarks or the colours. Gate the *advice* on the week being
informative: when the session's week still has planned sessions
remaining (the data is already loaded — `mesoWeek` at `:466` and
`allWorkouts` at `:572`), render the neutral count line
`{n} sets this week`, which `:1418-1422` already has as its fallback
branch, and withhold the `getVolumeWhy` "add sets next week" toggle
until the week is complete. No new copy is required for the minimal
version; the existing neutral branch is reused.

### 5.3 C5-P16-02 — IMPROVEMENT (MEDIUM). "What happens next" is never answered.

The order requires the first summary to tell the user what happens next.
Tracing every card: the only forward-looking copy on a first session is
the "Notes for next time" placeholder (`:1602`) and the block arc strip.
The "What's next" sentence exists but is inside the block-completion card
(`:1495-1497`) which cannot render on session one. The footer is
**Close** / **Share**.

So a first-time user finishes, reads their numbers, and is returned to
Home with no statement of when their next session is or what the app will
do with what it just recorded. The onward links that would gesture
outward are correctly withheld (§5.1) precisely because there is no
history yet.

**Proposed minimal fix.** One line, no new card: the block arc strip at
`:1249-1265` already knows `weekIndex` / `plannedWeeks`; the same
`Card` can carry a single plain sentence naming the next planned session
day. Raised as an IMPROVEMENT for a lead ruling on the copy, since
Campaign 5 explicitly forbids adding surfaces.

---

## 6. PHASE 17 — the first session feedback

The order's bar: the user should understand *"We use this to decide
whether the planned workload still makes sense"*; do not teach which
answer gives more sets; skipping stays valid; **unknown ≠ no**.

### 6.1 C5-P17-C1 / C5-P17-C2 / C5-P17-C3 — CLEAN. Three of the four requirements are met.

**The purpose copy is right.** `:1577-1579`:

> "Your answers shape how your recovery is read and, when coaching is
> active, whether next session's workload still makes sense. Skip
> anything you're not sure about."

That is the consequence, not the algorithm, and it teaches no direction.
The D93 comment above it (`:1573-1576`) records why "Skip anything
you're not sure about" is load-bearing.

**Skipping is structurally valid.** The panel is collapsed by default
(`:250`), the header carries an explicit "optional" label (`:1547`), and
`handleDone` is never gated on it.

**The engine is correctly gated.** `:481-489` returns early and clears
`adaptiveDecisions` when `!feedbackTouched`; `:500-508` maps any field
not in `realFieldsRef` to `null`, never to a default; and `:755`
refuses to persist an `insufficient_feedback` hold as an adaptation
event. The debounced autosave writes only dirty fields (`:539-549`) —
the exact line Campaign 1 pins at
`src/lib/__tests__/campaign1.integrity.test.js:469`.

Everything above is the Campaign 1 P0-7 D9 fix working as designed. The
two findings below are the paths that fix did not cover.

### 6.2 C5-P17-01 — DEFECT (HIGH). Close writes the untouched defaults to the workout row.

`:174-179` seeds the form with real numbers, not nulls:

```js
const [feedback, setFeedback] = useState({
  sessionDifficulty: 3,
  overallPump: 2,
  fatigueLevel: 2,
  jointDiscomfort: 0,
});
```

`handleDone` — the Close button, the one path every session takes —
sends all four unconditionally (`:690-698`):

```js
await updateWorkout(workoutId, {
  sessionDifficulty: feedback.sessionDifficulty,
  overallPump: feedback.overallPump,
  jointDiscomfort: feedback.jointDiscomfort,
  fatigueLevel: feedback.fatigueLevel,
  notes: notes || null,
});
```

`updateWorkout` writes any key present in `data` (`database.js:2630-2660`),
so a user who never opened the panel has
`session_difficulty = 3, overall_pump = 2, fatigue_level = 2,
joint_discomfort = 0` persisted as if answered.

**This is the exact defect the file's own comment says was fixed**
(`:180-185`): *"the summary used to WRITE these defaults to the workout
row on mount — an unanswered form became an explicit 'no joint
discomfort / moderate session' in the database ... Only fields the user
actually touches are written now."* That is true of the debounced
autosave. It is not true of Close, and Campaign 1's pin only asserts the
autosave line.

**Where the fabricated evidence lands.** `blockLedgerGather.js:266-273`
reads workout rows into the block ledger as
`joint: num(w.jointDiscomfort ?? w.joint_discomfort, null)`, and
`:87-115` counts any non-null value as a real data point. Campaign 1's
own test spells out the consequence
(`campaign1.integrity.test.js:194-200`):

```js
test('an explicit zero joint answer is genuine negative evidence, not missing', () => {
  expect(agg.jointDiscomfortAvg).toBe(0); // answered "no discomfort"
  expect(agg.dataPoints).toBe(1);
});
```

So every skipped session is laundered into a confident "no joint
discomfort" data point in the block ledger.

**User scenario.** A new user completes four sessions in week one and
skips the optional rating every time, as the screen invites them to. The
app records four explicit "no joint discomfort, moderate difficulty"
sessions. Their first block-level evidence — the thing Phase 24 says the
app should be honest about — is entirely fabricated.

**Law violated.** Phase 17's "Unknown ≠ no" and the order's Phase 40
requirement that "skipping feedback writes null, not false"; and
Campaign 1's P0-4 / P0-7 laws, at the only path that always executes.

**Proposed minimal fix.** Build the Close payload the same way the
autosave already does (`:543-548`): include only fields in
`feedbackDirtyRef.current`, and include `notes` only when
`notesDirtyRef.current`. Re-opened sessions are unaffected, because
stored values are already on the row and are re-registered into
`realFieldsRef` on prefill (`:437-446`). One payload construction, no
engine change, no schema change.

### 6.3 C5-P17-02 — DEFECT (HIGH). The rating rows display four answers the user never gave.

`RatingRow` marks a button selected on `value === i` and shows the value
label whenever one exists (`:112`, `:119`, `:123-124`):

```jsx
{labels?.[value] ? <Text ...>{labels[value]}</Text> : null}
...
value === i && [styles.ratingBtnActive, live.ratingBtnActive]
accessibilityState={{ selected: value === i }}
```

Because `feedback` is seeded with numbers (§6.2) and `RATING_LABELS`
(`:63-68`) maps them, the panel opens showing:

- **Difficulty · Moderate** — 3 highlighted
- **Muscle engagement · Mild** — 2 highlighted
- **Joint discomfort · None** — 0 highlighted
- **Fatigue · Mild** — 2 highlighted

Visually and to a screen reader, all four are answered. The sentence
directly above them says *"Skip anything you're not sure about"*, but
there is nothing on screen that looks skippable — every row already has
a selection, and there is no affordance to clear one.

**User scenario.** A novice expands the panel out of curiosity, sees
their session already described as "Moderate" with "None" joint
discomfort, assumes the app worked it out, and taps Close. Combined with
§6.2 those four fabrications are written and treated as evidence.

**Law violated.** Third first-use law directly: the app presents an
assessment of the user's session that it did not make and they did not
give.

**Proposed minimal fix, with an in-repo precedent.** Seed `feedback`
with `null` for all four fields, and let `RatingRow` render no selection
and no value label when `value == null` — the `labels?.[value]` guard at
`:112` already handles null, and `value === i` is already false for
null. This is exactly the shape the pre-session prompt uses
(`HomeScreen.js:2151+`, §2.1): unselected chips, tap-to-clear, honest
nulls. It pairs with §6.2's fix and needs no engine change, because
`realFieldsRef` already governs what the engine sees.

### 6.4 C5-P17-03 — IMPROVEMENT (MEDIUM). The purpose is hidden behind the expander.

The collapsed card shows only (`:1543-1566`):

```
Workout feedback                    optional
How did the session feel?
[ Rate this workout            v ]
```

The purpose sentence (§6.1) is inside `{feedbackExpanded && ...}`
(`:1567-1579`). So the user must decide to rate before being told why
rating matters — the opposite order to the pre-session prompt, which
leads with its purpose line before any control.

**Answer to the order's question — "does the user understand why it is
asked and what it influences?"** Only if they expand it first. In the
default state the answer is no.

**Proposed minimal fix.** Move the existing sentence above the toggle,
unchanged. No new copy, no new control, no change to what is asked.

---

## 7. Cross-phase notes for the lead

1. **C5-P14-01, C5-P17-01 and C5-P17-02 are one family:** three places
   where an unanswered input is silently replaced by a plausible number
   and then consumed as evidence (per-set effort, session ratings,
   displayed ratings). They should be ruled together, and the pre-session
   intent prompt (§2.1) is the in-repo pattern all three should match.
2. **C5-P13-01 and C5-P14-01 should land together.** Removing the
   fabricated RIR without telling the user the effort target leaves the
   engine holding load with no explanation the user can act on; the
   engine's own honest copy (§3.2) then becomes reachable and asks them
   to report something the UI does not collect.
3. **C5-P15-01 and C5-P15-02 share a root** (`prHistory.length === 0` is
   a one-set guard) but only the first has a recorded ruling behind it.
   Fix the first; rule on the second.
4. **Nothing in this lane requires a migration, a schema change or a new
   dependency.** Every proposed fix is a payload, a default value, a
   filter, or the position of existing copy.

---

## 8. Device checklist implied by these findings

For whichever findings are ruled in, the physical-device walk (Android,
EAS build) that would verify them:

1. Fresh account, activate a seeded plan, tap **Start workout**. Expected:
   "How are you feeling today?" with all readiness chips unselected.
2. Tap **Skip**. Expected: logger opens, card reads "Set 1 of 3 ·
   Working · <band> reps" and "First time - Target <band> reps", weight
   blank.
3. Without typing anything, tap the header **X**. Expected: the session
   discards with no "Discard workout?" modal (C5-P13-02).
4. Restart, open "…" → "Warm-up sets" with no weight entered. Expected:
   usable ramp, not "Enter your working weight first" (C5-P13-04).
5. Log a warm-up, then a heavier working set. Expected: the warm-up gets
   no celebration; the working set gets the calm "First lift logged"
   toast, not a gold record (C5-P15-01).
6. Log a second, heavier set. Expected: per the lead's ruling on
   C5-P15-02.
7. Finish the session with every planned exercise covered. Expected: no
   "unlogged set will be lost" warning (C5-P13-02).
8. On the summary, do not expand the feedback panel. Expected: "This
   week's volume" shows neutral set counts with no "below the minimum for
   growth" verdict and no "add sets next week" toggle (C5-P16-01).
9. Expand **Rate this workout**. Expected: no row pre-selected, no value
   label shown (C5-P17-02); the purpose sentence was already visible
   before expanding (C5-P17-03).
10. Tap **Close**, then inspect the workout row. Expected:
    `session_difficulty`, `overall_pump`, `fatigue_level` and
    `joint_discomfort` are all `NULL` (C5-P17-01).
11. Second session of the same exercise, having hit the top of the rep
    band: expected coach line is the honest "note how many reps you had
    left" branch or the new effort cue, not "Add 2.5kg next session"
    (C5-P14-01).
12. **ED-safety cases, mandatory** (these findings are feedback- and
    workload-adjacent): repeat steps 8-10 with calm mode on, and again
    with an open ED pattern flag. Expected in both: the first-session
    line and any celebratory card stay suppressed, and a failed
    wellbeing read also suppresses (fails closed).
