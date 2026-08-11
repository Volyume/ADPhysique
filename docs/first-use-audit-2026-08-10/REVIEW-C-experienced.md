# Campaign 5 - Adversarial Review C: EXPERIENCED USER

Phase 44, Review C. Branch `claude/campaign5-first-use`.

**Method.** I am a ten-year lifter. I know RIR, MEV/MAV/MRV, block
periodisation and how to write my own programme. I installed Volyume today
and walked the shipped journey from the code, reading the copy each screen
actually renders: `WelcomeScreen` → `LoginScreen` → `RootNavigator`'s gate →
`Article9ConsentScreen` → the `ProOnboardingScreen` steps → the build
sequence → `ProSetupCompleteScreen` → `HomeScreen` → the pre-session
readiness sheet → `ActiveWorkoutScreen` → `WorkoutSummaryScreen` →
`WeeklyCheckInScreen` → `CoachOutputScreen` → the block-end decision
surfaces (`PlansScreen`, `blockAdvisor`, `BlockReflectionScreen`). Then the
free branch (`FirstRunScreen` → `FreeStarterScreen`), and finally the
advanced surfaces an experienced lifter goes looking for on day 1:
`PlansScreen`'s action cards, `PlanDetailScreen`, `RoutineDetailScreen`,
`ManualBuilderScreen`, `PlanUpdateScreen`, `MesocycleBuilderScreen`,
`SettingsCoachingScreen` and the manual volume-landmark editor
(`VolumeHeatmapScreen`). Context read first in full: `CAMPAIGN-LOG.md`,
`D96-RULINGS.md`, `REVIEW-A-new-user.md`, `REVIEW-B-state.md`.

**Read-only.** No file in `src/`, no test and no configuration was changed,
and nothing was committed, pushed or stashed. Two suites were run read-only:
`campaign5.firstUse.test.js` + `coachRegister.test.js` → 204 passed, 2
suites, 1.2s.

**Line-number baseline.** Every `file:line` below is against the committed
tree at **`eb374fba`** ("Action Review A"). The Review B lane landed
concurrently at `40a7e360` and touched ten files (`proOnboardingDraft.js`,
`useAppStore.js`, `database.js`, `scheduler.js`, `PlansScreen.js`,
`ProOnboardingScreen.js`, `ProSetupCompleteScreen.js`,
`WeeklyCheckInScreen.js`, `ManualBuilderScreen.js`, `PlanLibraryScreen.js`),
so citations into those files read a few lines low from `40a7e360` onward.
No finding here depends on a mechanism the RB-1..RB-12 fixes touch, and none
of the nine findings below is closed by them.

**What I did NOT re-litigate.** FQ-8(b) closed the wizard-structure fork, so
"add an experienced branch / fast lane / advanced mode" is out of scope and
nothing below proposes one. FQ-2's tier law, FQ-3, FQ-4, FQ-7 and the rest of
the D96 register are settled. Review A's RA-1..RA-10 are landed on this tree
and I verified them rather than re-reporting them (the renumbered
`displayStepOf` at `ProOnboardingScreen.js:219-221`, the optional first name
at `:1356-1357`, the hand-off reorder at `ProSetupCompleteScreen.js:393-414`,
the glossary tooltips at `FreeStarterScreen.js:256` and
`PlansScreen.js:984-986`). C5-P33-06 / FR-C5-5 (the manual landmark editor
gated on `hasData`) is a recorded founder item; I re-verified it is still the
single entry point (`AnalyticsScreen.js:740`, `:753`) and raise nothing.

---

## Summary - findings ranked most severe first

| # | Class | Q | One line |
|---|---|---|---|
| RC-1 | DEFECT | 5, 3 | A **Pro** user cannot open the plan editor on their own plan at all: the whole Manage block is hidden behind `tier !== 'pro'`, so the paying experienced lifter can never add a day, reorder days, or create a superset on the plan the wizard built for them. |
| RC-2 | DEFECT | 1, 7 | The app's one mechanism for not talking down to an experienced lifter is dead code: the coach register keys on `userProfile.experienceLevel`, which nothing ever writes, so "Automatic" always resolves to the beginner-facing register while the Settings row claims it "matches its wording to your training experience". |
| RC-3 | DEFECT | 4, 2 | The four-step "Superset coming up" lesson is a full-screen modal that fires **once per group per workout, for ever** - and the engine only assigns supersets to non-beginners, so it is aimed exclusively at the audience that needs it least. |
| RC-4 | DEFECT | 4, 2 | "Don't ask before each session" - the one speed affordance built for experienced users - silently destroys the primary input to the block ledger, and both surfaces describe only a session-scoped consequence. |
| RC-5 | IMPROVEMENT | 1, 7 | "Show the science" promises technical terms "on coaching explanations" and delivers exactly one bracketed word (`EWMA`) on one screen; the landmark pair its own doc example uses is wired nowhere. |
| RC-6 | IMPROVEMENT | 7 | The free starter path calls a ten-year lifter a beginner four times on one screen, and its own module comment records why the guard is wrong ("this flow only runs for new users"). |
| RC-7 | IMPROVEMENT | 1 | Three single-group wizard steps still carry the redundant QuestionGroup title that RA-7's own criterion removed from step 2. |
| RC-8 | IMPROVEMENT | 5 | First run promises "you can skip and browse the library instead"; skipping from first run browses nothing and lands on an empty Home. |
| RC-9 | IMPROVEMENT | 4 | The novice "Help" pulse is retired only by opening the overflow sheet, so it animates on every exercise of every session indefinitely for anyone who never needs it. |
| - | CLEAN | 3, 6 | Advanced paths and the coaching-mode controls pass; mechanisms recorded below. |

**Counts: 4 DEFECT, 5 IMPROVEMENT, 2 CLEAN questions.**

---

## 1. Is the app explaining too much?

**DEFECT RC-2 · IMPROVEMENT RC-5 · IMPROVEMENT RC-7.**

Volume-wise the answer is: not any more, on the surfaces D96 already reached.
The wizard steps carry one framing sentence each after C5-P36-01/02
(`ProOnboardingScreen.js:1338`, `:1574`, `:1655`, `:1777`, `:1995`), the
hand-off's two teaching cards now sit below `Start training` (RA-5,
`ProSetupCompleteScreen.js:393-414`), Home carries no education for a user
past session zero (`HomeScreen.js:1949`, gated `totalSessions === 0` and
dismissible), and the session's beginner definitions live behind a named
overflow row rather than on the set card
(`ActiveWorkoutScreen.js:3722-3737`).

The problem is not quantity. It is that the app has a designed, tested,
shipped mechanism for **changing register for an experienced lifter**, and it
never runs.

### RC-2 (DEFECT) - the experienced-lifter register is unwired

`coachRegister.js:80-88` is the selector:

```js
export function resolveRegister({ coachTone = 'automatic', experienceLevel = null, trainingAgeYears = null } = {}) {
  if (coachTone === 'supportive') return 'supportive';
  if (coachTone === 'precise') return 'precise';
  if (experienceLevel === 'advanced' || experienceLevel === 'competitive') return 'precise';
  if (experienceLevel === 'beginner' || experienceLevel === 'intermediate') return 'supportive';
  if (experienceLevel == null && Number.isFinite(trainingAgeYears) && trainingAgeYears >= 5) return 'precise';
  return 'supportive';
}
```

Its two live call sites read the profile:

- `CoachOutputScreen.js:2297-2299` - `coachTone: userProfile?.coachTone ?? 'automatic'`,
  `experienceLevel: userProfile?.experienceLevel ?? null`,
  `trainingAgeYears: userProfile?.trainingAgeYears ?? null`
- `CoachOutputScreen.js:1213-1215` - the same trio.

**Nothing writes `userProfile.experienceLevel`.** The wizard's profile blob
uses the key `experience` (`ProOnboardingScreen.js:1055-1085`, specifically
`:1071`), and the body-profile write beside it passes only sex, height, date
of birth and primary goal (`:1129-1133`), so the `experience_level` column
`database.js:4787-4826` accepts is never filled from onboarding either. Every
other consumer in the tree reads the real key: `NutritionTargetsScreen.js:490`
(`experienceLevel: userProfile?.experience ?? 'intermediate'`),
`PlanUpdateScreen.js:84`, `ProGoalSetupScreen.js:148`,
`blockLedgerGather.js:339-341`, `ActiveWorkoutScreen.js:252`. `grep -rn
"experienceLevel" src/` finds no producer at all outside function parameters.

`trainingAgeYears` is the same story: it is hydrated only from the cloud
(`useAppStore.js:943`, `trainingAgeYears: cloudData.training_age ?? null`) and
pushed only from itself (`sync/tables/profiles.js:135`), so for a new account
it is null on both sides.

Consequence: `resolveRegister` falls through every branch to
`return 'supportive'` for **every** user on the default 'Automatic' setting,
including the one who just told the wizard "Competitive - 5+ years, training
for physique or performance" (`ProOnboardingScreen.js:164-169`). The whole
`preciseAcknowledgement` / `preciseInterpretation` family
(`coachRegister.js:100-170`) is reachable only by a user who finds Settings →
Coaching → Coaching tone → Precise.

And the Settings row states the behaviour as fact. `SettingsCoachingScreen.js:184`,
the 'Automatic' description: *"The coach matches its wording to your training
experience."* It cannot. The field it would match on does not exist.

This is what makes question 1's answer a defect rather than a preference: the
engine adapts to experience in a dozen places (`planEngine.js:749`, `:1228`,
`:1473`, `:2360`, `:2375`, `:2610`, `:2786`; `mesocycle.js:167`;
`coachingGoals.js:185`), so the plan a competitive lifter receives is genuinely
different. Only the **voice** is stuck on beginner, and only because of a key
name.

Minimal fix (one expression, twice; no engine change, no new input): at
`CoachOutputScreen.js:1214` and `:2298` read
`userProfile?.experienceLevel ?? userProfile?.experience ?? null`. Or map once
where the profile is written (`ProOnboardingScreen.js:1071`, add
`experienceLevel: experience` beside `experience`) so every future reader of
either key agrees. No pinned test conflicts: `coachRegister.test.js:87-106`
exercises the pure function with `experienceLevel` passed in explicitly and
says nothing about which profile key supplies it.

### RC-5 (IMPROVEMENT) - "Show the science" over-claims

`SettingsCoachingScreen.js:254-256` describes the toggle:

> On. **Technical terms** appear in brackets after the plain ones on
> coaching **explanations**.

Both plurals are wrong. `withScience` (`coachResponse.js:159-167`) has exactly
three call sites in the tree, and all three carry the same single mapping:

- `coachResponse.js:188` - `withScience('7-day average', 'EWMA', showScience)`
- `coachRegister.js:165` - the identical line in the precise register
- `CoachOutputScreen.js:2596` - `withScience('7-day trend', 'EWMA', ...)`

So the setting adds one acronym, on one screen. The helper's own doc example
(`coachResponse.js:157-158`) is
`withScience('weekly target range', 'MEV to MRV', true)` - the exact mapping
this audience would turn the toggle on for, and it is wired nowhere.

Scenario: I read "Show the science", expect the app to name MEV/MAV/MRV and
RIR where it currently says "weekly target range" and "stop 2 short of
failure", turn it on, and get one `(EWMA)`.

Minimal fix, either direction, both copy-only in effect: narrow the row's
description to what it does (*"Adds the technical name after the plain one
where the coach reports your weight trend."*), or attach the existing
`GLOSSARY`-backed pair by calling `withScience` on the surfaces that already
state a weekly target range. No new terminology is introduced either way.

### RC-7 (IMPROVEMENT) - three single-group steps keep a redundant title

RA-7 made `QuestionGroup`'s title optional (`ProOnboardingScreen.js:294-296`)
and dropped step 2's, on the criterion that a step with exactly one group has
nothing to group and restates its own header. That fix is right. Its criterion
holds for three siblings it did not touch, each of which has exactly one
`QuestionGroup`:

| Step | Header title / sub | Group title still rendered |
|---|---|---|
| 3 | `:1573` `Add your starting body composition` / `:1574` | `:1590` `Starting body composition` |
| 4 | `:1654` `Shape your training week` / `:1655` | `:1662` `Plan fit` |
| 5 | `:1776` `Set your training focus` / `:1777` | `:1789` `Goal and targets` |

Step 3 is the plainest: the header says "Add your starting body composition"
and five lines later the group says "Starting body composition", above one
optional field.

Minimal fix: drop the `title` prop on those three `QuestionGroup`s, exactly as
step 2 (`:1351`) now does. The icon keeps the grouping; no field, gate,
validation or hint changes.

---

## 2. Can an experienced lifter move quickly?

**DEFECT RC-3 · DEFECT RC-4.** Through setup, yes. Through the twentieth
session, no.

What genuinely lets me move fast, all verified:

- **The optional step never blocks.** Step 3's Continue has no gate
  (`ProOnboardingScreen.js:1630-1636`, no `canContinue`), so body-fat is one
  tap to pass.
- **A standing opt-out on the pre-session ask.** The readiness sheet carries
  "Don't ask before each session" inline (`HomeScreen.js:2359-2373`), not only
  in Settings. One tap, for ever. (See RC-4 for what it does not say.)
- **The Fast Check-In.** `WeeklyCheckInScreen.js:718-723` - when every derivable
  field is already derived, the four-step wizard collapses to a confirmation
  card plus the two inputs the app deliberately never derives
  (`:1297-1388`), with an "Add more detail" escape.
- **Week-1 plan switching is silent.** `planSwitch.js:38` - `if
  (status.currentWeek <= 1) return true;` - so replacing the wizard's plan with
  my own on day 0 costs no dialogue and no block reset.
- **A real diff before a rebuild.** `PlanUpdateScreen.js:352-390` shows
  Now/After for days, split, session length and changed moves before it writes.

Recorded and judged, not raised: the plan-build sequence holds a minimum 3.2s
(`ProOnboardingScreen.js:108-109`, `STAGE_DWELL_MS * 4`) even when the real
work finishes sooner. That is COMP-013's recorded decision with a stated
rationale, it happens once, and it is not a first-use defect.

### RC-3 (DEFECT) - the superset lesson fires every single session

`ActiveWorkoutScreen.js:3251-3326` is a full-screen `Modal`: an icon, a title
("Superset coming up" / "Giant set coming up"), a numbered member card, **four
numbered instruction steps** (`:3297-3314`) - *"Do all reps of the first
exercise." / "Move straight to the next. No rest between."* - a tip, and a
"Got it, start" button before I can log anything.

It is gated on a ref, not on storage:

- `:318` - `const acknowledgedSupersetsRef = useRef(new Set());`
- `:1017`, `:1022` - checked and added inside the effect
- The screen's own comment, `:991-992`: *"Shown **once per group id per
  workout**, dismissing acknowledges."*

A ref lives for one mount of `ActiveWorkoutScreen`, so the set is empty again
on the next session. `grep` finds no persisted key for it anywhere
(`@volyume_seen_*` exists for the sibling walkthrough at `:118`, `:955-960`,
`:3381-3382`, and for the info pulse at `:1081`, `:2731` - not for this).
`MAX_PAIRS_PER_WORKOUT = 2` (`planEngine.js:2648`), so a session can carry two
of these.

The audience is precisely wrong. `assignSupersets` refuses beginners outright:

```js
// planEngine.js:2607-2610
function assignSupersets(exercises, { goal, experience, sessionLengthMinutes }) {
  if (!Array.isArray(exercises) || exercises.length < 4) return;
  // Gate: skip if beginner (form takes priority over time efficiency)
  if (experience === 'beginner') return;
```

So the only users who ever meet this modal are intermediate, advanced and
competitive lifters, and they meet it twice a session, indefinitely. In week 6
of block 1 I have been told what a superset is roughly thirty times.

The contrast is inside the same file and was written by the same hand. The
unilateral walkthrough fires the full sheet **once ever**
(`UNILATERAL_WALKTHROUGH_SEEN_KEY`, `:118`, read at `:955-960`, written at
`:3381-3382`) and degrades afterwards to a two-button `appAlert`
(`:1059-1067`). The pattern already exists; the superset sheet just does not
use it.

Minimal fix (reuse, no new pattern, no copy change): add a
`@volyume_seen_superset_walkthrough` key on the same read/write shape as
`:955-960` / `:3381-3382`. First encounter keeps today's sheet verbatim. After
that, the group is announced by the `StatusStrip` chip that already renders
for it (`:2805-2820`, *"Superset - alternates with …"*), and Unlink / Swap stay
where they already are in the overflow. Nothing about pairing, logging or the
engine changes.

### RC-4 (DEFECT) - the fast path silently disables the adaptive engine

This one punishes exactly the behaviour an experienced user is most likely to
choose, which is why it sits with the defects rather than the improvements.

The opt-out, inline in the pre-session sheet (`HomeScreen.js:2359-2372`):

> **Don't ask before each session**
> Without it, sessions are not adjusted to how you're feeling. Turn it back on
> any time in Settings, Coaching.

Its Settings twin (`SettingsCoachingScreen.js:161`): *"Off. Sessions start
straight away."* Both statements are session-scoped, and both are true as far
as they go. Here is what they do not say.

The block ledger's recovery evidence has exactly two sources:

```js
// blockLedgerGather.js:266-271
return workouts
  .filter((w) => sessionIds.has(w?.id))
  .map((w) => ({
    at: ...,
    soreness13: num(w.soreness24hBefore ?? w.soreness_24h_before, null),
```

`soreness_24h_before` is written **only** by the pre-session readiness sheet
(`HomeScreen.js:112-118` row `soreness24hBefore`; `database.js:2588`, `:2620-2622`
`createWorkout`), and the opt-out passes `{ soreness24hBefore: null, ... }`
explicitly (`HomeScreen.js:2364`). The second source is `joint_discomfort`,
from the collapsed optional panel on the summary
(`WorkoutSummaryScreen.js:1662-1699`).

`dataPoints` counts a session only if one of those two is non-null
(`blockLedgerGather.js:94-96`). Then:

```js
// interBlock.js:83
const MIN_RECOVERY_POINTS = 4;  // feedback rows informing the muscle
// interBlock.js:292-295
if (dataPoints < MIN_RECOVERY_POINTS) {
  return finish(BLOCK_CLASS.INSUFFICIENT_DATA, previousStart, plannedPeak, null, ...
```

So a Pro user who takes the offered opt-out and leaves the summary panel
collapsed (its default) reaches the end of every block with every muscle at
`INSUFFICIENT_DATA`, its next-block targets pinned to `previousStart` /
`plannedPeak` - and "Continue with adjustments", whose own label promises
*"weekly set targets starting from what this block showed, muscle by muscle"*
(`blockAdvisor.js:207`), produces numerically the same block as Repeat, for
ever. Review A's RA-2 fixed the **receipt's** wording for that state; nothing
fixes the **collection** surface that causes it, and nothing anywhere tells the
user that four rated sessions per muscle is the price of adaptive volume.

The pre-session sheet's own subtitle is the same session-scoped framing
(`HomeScreen.js:2282`): *"Your answers shape how your sessions are read and,
when coaching is active, whether today's planned workload still makes sense."*

Minimal fix (copy only, no gate, no threshold, no engine change): one clause on
each of the two opt-out surfaces naming the second consequence - e.g. at
`HomeScreen.js:2370-2372`, *"Without it, sessions are not adjusted to how
you're feeling, and your next block's set targets stay where they are rather
than moving on what this block showed."* Same clause, shortened, on
`SettingsCoachingScreen.js:161`. The wording must not become a nag: it states a
consequence once, on the control that causes it, which is the same discipline
FM-02's "the toggle states the warm-up honestly" ruling applied.

---

## 3. Are advanced paths reachable without onboarding clutter?

**CLEAN.** This is the question I expected to fail and it holds. Every advanced
surface is reachable from a tab, none of them is pushed at me during setup, and
none of them is taught before I ask.

| Advanced surface | Route | Clutter in first use? |
|---|---|---|
| Plan library | `PlansScreen.js:51-57` / `:81-86` action card | none |
| Build a plan by hand | `PlansScreen.js:58-64` / `:87-93` → `ManualBuilder` | none |
| Rebuild from answers, with a diff | `PlansScreen.js:72-79` → `PlanUpdateScreen.js:352-390` | none |
| Per-exercise sets / reps / rest / starting weight | `RoutineDetailScreen.js:261-283` | none |
| Block state, tonnage, recovery EMAs | `PlansScreen.js:1433` → `MesocycleBuilderScreen.js:398-513` | none |
| Manual MEV/MAV/MRV overrides | `AnalyticsScreen.js:740`, `:753` → `VolumeHeatmapScreen.js:651-718` | gated on `hasData` (FR-C5-5, recorded) |
| In-session swap / add / reorder / warm-up ramp | `ActiveWorkoutScreen.js:3689-3760` overflow sheet | one tap, off the surface |
| Coaching tone, autonomy, science layer | `SettingsScreen.js:46` → `SettingsCoachingScreen.js:172-266` | none |

Two things worth recording because they are easy to mistake for defects and
are not:

- `MesocycleBuilderScreen` is named "builder" and builds nothing. Wave C fixed
  the copy rather than the name, honestly: `:264-273` now says *"Making a plan
  active also starts a training block of 6 weeks, the last of them a lighter
  recovery week. **There is nothing to set up.**"* That is the true product
  boundary (no user-set block length, no user-set deload week), stated where I
  would go looking for the control. Correct, not a gap to fill.
- The landmark editor being unreachable until the first set lands is the
  recorded FR-C5-5 / C5-P33-06 tension, and surfacing it earlier would breach
  the campaign's own "no advanced controls in first use" bound. Re-verified,
  not re-raised.

---

## 4. Does the app force novice educational content repeatedly?

**DEFECT RC-3 · DEFECT RC-4 · IMPROVEMENT RC-9.** One-time explainers are in
good order. One repeated forced one survives.

Correctly one-time or escapable, verified:

- `HomeWelcomeCard` - rendered only while `totalSessions === 0` and
  dismissible (`HomeScreen.js:1949`, `HomeWelcomeCard.js:48-55`).
- Unilateral walkthrough - once ever, then a two-button alert
  (`ActiveWorkoutScreen.js:1059-1071`, `:3381-3382`).
- Coach notes - per note, with "Got it" and a `markNoteShown` write
  (`ActiveWorkoutScreen.js:2857-2868`).
- Recovery-week banner - dismissible per session, and FB-05's "Got it" label
  fix is live (`:2888-2900`).
- Session feedback - collapsed by default, labelled `optional`, purpose stated
  above the toggle, nothing pre-selected (`WorkoutSummaryScreen.js:1646-1700`).
- The in-session effort line (`ActiveWorkoutScreen.js:2764-2771`, *"This week:
  stop 2 short of failure"*) does repeat every exercise, but it is the block's
  **prescription**, derived from the block row, not a lesson; the definition
  sits behind an opt-in `InfoTooltip`. Correct as shipped.

RC-3 (above) is the failure: a four-step instructional modal, twice a session,
for ever, aimed only at non-beginners. RC-4 is the same class of harm in the
other direction: an experienced user opting out of novice-shaped prompting is
not told what it costs.

### RC-9 (IMPROVEMENT) - the "Help" pulse never retires on its own

`ActiveWorkoutScreen.js:1080-1095` starts a looping scale animation on the
overflow button whenever `@volyume_seen_workout_info` is unset, and
`:2747-2749` renders a visible `Help` label beside the glyph while it runs. The
flag is written at exactly one place: inside the overflow button's own
`onPress`, `:2731`. C5-P13-03 deliberately made it survive logging a set
(`:1606-1614`) so the novice cue is not destroyed by the action it explains -
right for the novice, and I am not proposing to undo it.

For me it means an animated badge labelled "Help" on the exercise header of
every exercise in every session until I tap a menu whose headline row is "How
logging works". The honest mitigation: an experienced lifter opens that
overflow early anyway (it holds Swap, Add exercise and Reorder), so in practice
it usually clears in session 1. It is a genuine but low-severity residue.

Minimal fix: also retire the pulse (write the same flag) when the user opens
the overflow's sibling advanced surfaces from the exercise header - the
`setShowExecution(true)` tap on the exercise name (`:2715-2723`) is the natural
one, since anyone who opens exercise info is not looking for "what is a set".
One line, no copy change, novice path untouched.

---

## 5. Can I build/edit my plan efficiently?

**DEFECT RC-1 · IMPROVEMENT RC-8.** The builder itself is good. A Pro user
cannot point it at their plan.

`ManualBuilderScreen` is a real editor, and for a lifter who writes programmes
it is the best surface in the app: per-exercise sets / rep-min / rep-max / rest
steppers (`:211-247`), superset and giant-set grouping with the engine's own
pairing classifier as a non-blocking nudge (`:536-620`), day duplication with
independent group ids (`:505-535`), drag reorder that moves a superset as one
block (`:677-690`), undo-toast deletions instead of confirm dialogs
(`:421-424`, `:463-475`), a live Plan balance panel per muscle (`:125-200`,
`:1237`), and both `Save draft` (`:1260`) and `Save and activate` (`:1271`) so
editing need not restart a block. It even opens straight into the page-2 editor
when handed a `planId` (`:279-283`).

### RC-1 (DEFECT) - Pro is locked out of its own plan editor

`PlanDetailScreen.js:533-535`:

```js
{/* Manage actions, free tier only. Pro users manage their plan
    through the goal-change wizard in Athlete Hub. */}
{!isLibrary && tier !== 'pro' && (
```

Everything inside that gate is hidden from Pro: **Edit plan** (`:539-541`,
`handleEditPlan` → `navigation.navigate('ManualBuilder', { planId })` at
`:276-277`), Duplicate plan (`:544-546`) and Archive plan (`:550-552`).

`grep -rn "ManualBuilder" src/screens src/navigation` gives two navigations in
the whole app: `PlanDetailScreen.js:277` (with `planId`, Pro-hidden) and
`PlansScreen.js:63` / `:92` (`screen: 'ManualBuilder'`, dispatched with no
params at `:1469` `navigation.navigate(card.screen)` - a blank new plan). The
plan options menu offers no edit either: View plan / Set active / Move to
folder / Duplicate (non-Pro only) / Archive
(`PlansScreen.js:596-653`).

So for the paying experienced lifter:

1. Setup generates and activates a plan and starts a six-week block
   (`ProOnboardingScreen.js` build → `activatePlanWithBlock`).
2. I want to add a fourth day, move my pull day, or superset my rear-delt work
   with my curls.
3. `PlanDetail` shows me my days with an edit pencil each
   (`:490-497` → `RoutineDetail`), which lets me change sets, reps, rest and
   starting weight per exercise (`RoutineDetailScreen.js:261-283`) - but
   `RoutineDetailScreen.js:436-438` states plainly: *"Read-only here: supersets
   are created/edited in **the plan builder** (which owns the write path); this
   surface only displays them."* The plan builder is the screen I cannot open
   for this plan.
4. There is no add-a-day, remove-a-day or reorder-days control anywhere outside
   the builder.
5. The comment's stated alternative, "the goal-change wizard", is
   `PlanUpdateScreen` - which does not edit, it **rebuilds** from wizard
   answers (`:331` `Review my plan changes` → `:396` `Confirm and rebuild`),
   discarding any hand edits and, past week 1, restarting the block
   (`planSwitch.js:41-46`).
6. My only remaining route to a hand-built multi-day plan is
   "Create your own" - a blank builder - and then activating it, which is a new
   block.

The Pro card's own copy makes the promise the gate breaks
(`PlansScreen.js:88-93`): *"**Create your own.** Create your own plan and choose
every exercise yourself. Your coach keeps reading your training the same way."*
Creating is offered; editing what the coach created is not.

I can find no ruling behind the gate. It is not a Section 2 free/pro boundary
(the boundary is nutrition and coaching; the builder is a free feature -
`SubscriptionPolicyScreen.js:63` lists *"Create your own routines from
scratch."* under what stays free), and it is not in the D96 register. The comment's rationale - Pro users manage plans
through the wizard - is simply not true of the wizard's behaviour.

Minimal fix (one predicate; no new screen, no gating change to any Pro
feature): split the Manage block so **Edit plan** renders for every tier and
only Duplicate stays behind `tier !== 'pro'` (its own recorded rationale,
`PlansScreen.js:600-602`, is "Pro users keep an always-active plan … so they
don't get the Duplicate action", which says nothing about editing). Archive is
already available to Pro from the plan options menu (`PlansScreen.js:631-635`),
so only two rows are actually in question. `ManualBuilderScreen` already
supports the `planId` edit mode (`:279-283`) and already saves without
activating (`:1258-1268`), so nothing new is built. **STOP-AND-ASK candidate:
this is a tier-visible change and the lead should rule on it before anyone
edits the gate.**

### RC-8 (IMPROVEMENT) - "skip and browse the library" browses nothing

`FirstRunScreen.js:131-138` promises:

> Next, three quick questions and we'll suggest a starter plan. Prefer to pick
> your own? You can **skip** and browse the library instead.

`FreeStarterScreen.js:109-124` - `handleSkip` in the first-run context calls
`completeFirstRun()` and nothing else, landing on Home. The library link that
would honour the sentence exists on the same screen but is explicitly hidden in
this context: `:320` gates "Browse all plans instead" on
`!fromFirstRun`. The screen's own comment (`:106-108`) records the intent -
Home's no-plan card offers both - but the sentence the user read said the skip
would browse.

For an experienced lifter this is the first moment the app offers to get out of
the beginner funnel, and it drops them somewhere else.

Minimal fix: render the existing "Browse all plans instead" link in the
first-run context too (it needs `completeFirstRun()` before the navigate, the
same order `handleSkip` already uses), or change `FirstRunScreen.js:134-137` to
say what skipping does. Copy-only in the second form.

---

## 6. Can I turn coaching to Manual/Collaborative where currently allowed?

**CLEAN.**

`SettingsCoachingScreen.js:214-247` renders the Autonomy block: three chips,
`Coached` / `Collaborative` / `Manual`, persisted to the profile at `:57-63`,
with a live description per mode (`:216-225`):

- Coached - *"The coach applies each week's changes for you. Anything
  safety-related still waits for your confirmation."*
- Collaborative (the default, `:47`) - *"The coach suggests each change. You tap
  to apply it."*
- Manual - *"The coach shows each change and the reason. You make the change
  yourself."*

It is reachable in two taps from Settings (`SettingsScreen.js:46`), and it is
wired: `CoachOutputScreen.js:1016-1017` derives
`applyDisabled = coachAutonomy === 'manual'` and strips the Apply handler from
all six proposal cards (`:2384`, `:2404`, `:2412`, `:2426`, `:2442`, `:2453`),
while `:2106` gates the auto-apply path on `'coached'`. Manual mode also states
its own ownership so a stripped card is not mistaken for an informational one
(`:2570-2573`): *"Manual mode: these are recommendations. The coach applies
nothing; any change is yours to make. Change modes in Settings, under
Coaching."*

The Pro gate at `:172` is correct under FQ-2's restated tier law (free has no
coaching, so there is no autonomy to set), and the D16 rule that a safety hold
always forces confirm-first whatever the mode is stated on the row itself
rather than left in a source comment (`:221`, the D93 fix).

Two observations, neither a finding. First, nothing in first use points at the
autonomy control - correctly: the campaign's hard bounds forbid exposing
advanced controls in first use, and FQ-1(c) deliberately spent the one hand-off
pointer on calm mode (`ProSetupCompleteScreen.js:408-409`). Second, a
Collaborative user is never told the modes exist, because the "Change modes in
Settings, under Coaching" sentence renders only in Manual mode
(`CoachOutputScreen.js:2570`). Both are consistent with advanced-stays-advanced
and I propose nothing.

---

## 7. Does first-use language sound patronising?

**DEFECT RC-2 (above) · IMPROVEMENT RC-6.**

The register is mostly well judged. The wizard justifies its inputs in the
language of an adult (`ProOnboardingScreen.js:1376`, `:1424`, `:1667`, `:1794`,
`:2022`), the hand-off never uses an exclamation mark, and the coaching voice
rules are visibly held throughout.

Three lines aimed at me landed slightly off, and I record them as a set rather
than as findings, because each is defensible on its own and none is false:

- `ProOnboardingScreen.js:1655` - *"The plan should fit your real week, not the
  week you wish you had."* Good line for a novice; slightly sermonising to
  someone who has trained through fifteen years of real weeks.
- `:2022` - *"**Be honest here.** This sets how much volume your plan includes."*
  The instruction to be honest presumes the opposite.
- `ProSetupCompleteScreen.js:303-306` - *"1. Log your weight. Every morning
  before food, after the bathroom. **Three seconds.**"*

The real problem is not any one line. It is RC-2: the app knows I said
"Competitive - 5+ years", it has a precise register written and tested for
exactly that answer, and it never reaches me. That is why question 7 is a defect
and not a preference.

### RC-6 (IMPROVEMENT) - the free path calls a veteran a beginner

The free starter quiz is beginner-only by construction, and never asks
experience. `freeStarter.js:73-74`:

```js
export function isStarterCandidate(plan, equipment) {
  if (!plan || plan.difficulty !== 0) return false;
```

and the module's own header records the reasoning, `:17-18`: *"the difficulty-0
filter stands in for the experience question, because **this flow only runs for
new users**."* A new account is not a new lifter. The result screen then says so
four times (`FreeStarterScreen.js:248-261`, `:300-302`):

> **Your starter plan**
> **Built for people starting out.** Every session tells you exactly what to do:
> the exercises, the sets, and the reps.
> [badge] **Beginner friendly**
> …
> *The first couple of weeks are for learning the movements. That counts as
> progress.*

Reachability, stated honestly so severity is not inflated: a brand-new user only
lands on Free through a failed or ineligible `startCascade` (OB-1 / FR-C5-3), so
the common way an experienced lifter meets this screen is after the trial ends,
or from Home's and Plans' no-plan cards (`FreeStarterScreen.js:27-31`). The
escape hatches are real and visible on the same screen - "Browse all plans
instead" (`:320-330`) and "Skip, I'll choose myself" (`:332-341`) - which is why
this is an improvement, not a defect.

Minimal fix, no scoring change and no new question (an experience input would be
a new onboarding field, which the campaign bounds forbid): keep the honest
"Beginner friendly" badge on the plan card, where it describes the plan, and
soften the two unconditional statements **about the reader** at `:254` and
`:300-302` so they describe the plan rather than the person - e.g. *"A simple
three-day plan you can run as written. Every session gives you the exercises,
the sets and the reps."* The RA-9 glossary tooltip at `:256` stays where it is;
a first-time lifter loses nothing.

---

## Appendix - things I attacked and could not fault

- **Where the experienced answer actually binds.** `experience` reaches the
  engine everywhere it should: split selection (`planEngine.js:1473` - advanced
  and competitive get PPL at three days rather than full body), volume
  landmarks (`:1228`, `:1241`), the beginner day cap (`:2360`, `:2786`), the
  recovery-conflict guard for competitive lifters (`:2375`), the block's own
  progression shape (`mesocycle.js:167`) and the ledger's prior
  (`blockLedgerGather.js:339-341`). The plan I receive is genuinely an advanced
  lifter's plan. RC-2 is a copy-layer break, not an engine one.
- **PR semantics on a veteran account.** FQ-7 is implemented as ruled:
  `ActiveWorkoutScreen.js:1672` `hadPriorExposure` keys on completed working
  sets from a previous session, so my first-ever session on this app produces
  `"100kg x 5 logged as your starting point"` (`:1693`) rather than five
  fabricated records, and a swapped exercise inherits no unrelated baseline.
  This is the correct answer for someone with fifteen years of lifts the app
  has never seen.
- **The advanced controls stay off the session surface.** The set card carries
  the set (`ActiveWorkoutScreen.js:2944-3014`); swap, add, reorder, warm-up ramp
  and the definitions all live one tap away in the overflow (`:3689-3760`). The
  two auto-firing sheets now guard each other rather than stacking
  (`:1008-1013`, `:1019`, `:1056`) - C5-P37-02 verified.
- **The optional readiness rows cost nothing to ignore.** `HomeScreen.js:2293-2318`
  - three one-line rows above the three intent buttons, each tap-to-clear, and
  the intent tap carries whatever is set. Zero added taps for a user who skips
  them. (What that costs downstream is RC-4, and it is a disclosure problem, not
  an interaction one.)
- **Manual landmark overrides genuinely outrank the engine.**
  `VolumeHeatmapScreen.js:651-718` writes the `manual` layer that
  `effectiveLandmarks.js` places above both the adaptive layer and research, and
  `:656-657` discloses the second consequence of an override rather than hiding
  it. When it is reachable, it is the real control.

---

*Campaign 5 Phase 44, Review C (experienced user). Audit only: no source,
test, doc or configuration outside this file was modified, and nothing was
committed, pushed or stashed by this lane.*
