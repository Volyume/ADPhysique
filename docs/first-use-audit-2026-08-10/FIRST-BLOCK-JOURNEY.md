# FIRST-BLOCK JOURNEY - Campaign 5 phases 23-26 (audit evidence)

Lane: PHASE 23 (first recovery week), PHASE 24 (first block completion),
PHASE 25 (first personalised next block), PHASE 26 (repeat vs adjust
comprehension). Audit only: nothing outside this file was changed.

Authority read in full before writing: the founder's Campaign 5 order
(`c5-CAMPAIGN5-ORDER.txt`, phases 23-26 at lines 314-352, non-goals at
line 58, the three first-use laws at lines 61-90); `CLAUDE.md` Section 2
inviolables; `docs/first-use-audit-2026-08-10/CAMPAIGN-LOG.md`.

Method: every claim below is read from code at the cited `file:line`, and
every quoted string is the literal rendered copy. Where the order asks a
comprehension question, the answer is derived from the copy actually on
screen in that state, not from module intent. A synthetic mixed-outcome
first block was run through the real pure chain
(`classifyMuscleBlock` -> `buildBlockLedger` -> `resolveSeedRange` ->
`buildSeededWeeklyTargets` -> `buildBlockStartLines`) to capture what the
user is actually shown; the probe transcript is reproduced in §25.1.

**Scenario used throughout.** New account, ordinary non-competition goal,
4 training days, free or Pro as noted, no previous history. The first
block is created by `activatePlanWithBlock`
(`src/lib/database.js:3715-3745`): 6 planned weeks, `deload_week = 6`,
RIR ladder `[3,2,1,0,0,4]`, so **the first recovery week is week 6**, days
35-41 after activation. `generateMesocycleWeeks`
(`src/lib/database.js:4001-4003`) flags the last week `is_deload = 1`.
On a first block `generateInitialPlannedVolume`
(`src/lib/database.js:4127-4205`) has no ledger, so every muscle's rows
are written with `source = 'template'` and the recovery week is **flat
research MEV for every muscle** (`:4192`).

---

## Summary of findings

| ID | Class | Sev | Phase | One-line claim |
|----|-------|-----|-------|----------------|
| FB-01 | DEFECT | High | 23 | Five surfaces give five different recovery-week prescriptions, and the logger implements none of them (set count is unchanged). |
| FB-02 | DEFECT | High | 23 | The app's own halved recovery-week reps re-trigger the "Recovery week suggested" banner *during* the scheduled recovery week. |
| FB-03 | DEFECT | Med | 23/24 | Workout Summary declares "Block finished ... 6 weeks completed, including your recovery week" after every session *inside* the recovery week. |
| FB-04 | DEFECT | Med | 23 | The only advance warning ("One more week before your recovery week") is unreachable dead copy. |
| FB-05 | DEFECT | Low | 23 | The in-session recovery-week banner's dismiss pill is labelled "Skip", the only banner in the strip not labelled "Got it". |
| FB-06 | DEFECT | Med | 23 | During the recovery week the Pro weekly coach still says "Add N sets ... This is next week's starting point" with no button and no mention of the recovery week. |
| FB-07 | CLEAN | - | 23 | The week *before* the recovery week, a Pro user with an upward signal gets the honest "Hold through your recovery week" row. |
| FB-08 | CLEAN | - | 23 | Block-shape sheet, block-shape card and Home readiness chip all frame the recovery week as intentional, with no strain score and no jargon. |
| FB-09 | IMPROVEMENT | Med | 23 | The recovery week is only explained if the user taps the Home chip; the first block's own start line never mentions it. |
| FB-10 | IMPROVEMENT | Med | 23 | From block 2 the recovery week differs per muscle, is never explained, and never reaches the logger's set targets. |
| FB-11 | IMPROVEMENT | Low | 23 | "no PRs" is guidance only; PR detection is not gated on the recovery week. |
| FB-12 | UNCERTAIN | Low | 23 | A fully rested recovery week (zero sessions) cannot be detected, so the run/streak cannot mark it "resting". |
| FB-13 | FOUNDER-GATED | Med | 23 | Differential-paywall copy tells a **free** user "Precision Coaching is holding a lighter week" for a Pro engine they do not have. |
| FB-14 | CLEAN | - | 23 | Effort target on the recovery week is stated in plain words, never as RIR or a strain number. |
| FB-15 | DEFECT | High | 24 | The block summary ("What this block showed", records, stats) is **unreachable** for the whole block-finished-awaiting-decision period. |
| FB-16 | DEFECT | High | 24 | "Records set this block" / "Personal records - Set this block" are block-best estimated maxes never compared to any prior record; on a first block every row is a first-ever lift. |
| FB-17 | DEFECT | Med | 24 | The block's progress figure compares week 1 to the recovery week, so the first block summary systematically reports a decline. |
| FB-18 | DEFECT | Med | 24 | The block summary tells the user to recover again after the recovery week, and both its "Start a new block" CTAs land on a read-only screen with no way to start one. |
| FB-19 | DEFECT | High | 24/26 | Which next-block option is offered is decided by weekly check-in readiness, not by the block. A block that went **well** is given "Continue this plan", which discards the ledger the app just computed. |
| FB-20 | IMPROVEMENT | Low | 24 | The "Training blocks" tooltip promises the block "moves to Past blocks below" when the block finishes; it does not, until a new block is created. |
| FB-21 | CLEAN | - | 24 | The block-finished state copy on Home, the block-shape card and the logger is honest and consistent. |
| FB-22 | CLEAN | - | 24 | Nothing anywhere claims "we know your optimal training now"; every ledger rationale is composed from the final clamped numbers. |
| FB-23 | IMPROVEMENT | Low | 24 | The block story fires mid recovery week and its outro repeats "Recover well, then go again". |
| FB-24 | DEFECT | High | 25 | After "Continue with adjustments" nothing confirms what changed. No toast, no summary, no receipt; the card simply disappears. |
| FB-25 | DEFECT | High | 25 | In a mixed block the "where research still filled gaps" statement is never shown: 12 of 17 muscles were research-seeded and none is mentioned. |
| FB-26 | DEFECT | Med | 25/26 | The confirmation alert is byte-identical for repeat and adjust and says "the same workouts", framing the adjusted block as a plain restart. |
| FB-27 | IMPROVEMENT | Med | 25 | On the first transition most muscles' numbers are unchanged, and "set by how your last block went" sits beside them with no statement that "unchanged" was itself the decision. |
| FB-28 | IMPROVEMENT | Med | 25 | The 3-line cap sorted by peak drops exactly the muscles whose numbers moved (probe: the one peak reduction is never shown). |
| FB-29 | CLEAN | - | 25 | A first block correctly claims research-based guidance only, and is pinned. |
| FB-30 | CLEAN | - | 25 | Ledger rationale text cannot contradict the proposal it ships with. |
| FB-31 | DEFECT | High | 26 | Repeat and Continue-with-adjustments are never offered side by side. The user is shown one primary CTA and cannot choose the other. |
| FB-32 | DEFECT | Med | 26 | The repeat branch's CTA reads "Continue this plan", which does not say the plan runs again as-is, and it silently discards the ledger. |
| FB-33 | UNCERTAIN | Low | 26 | "Repeat this plan anyway" frames repeat as going against advice; that was a deliberate D93 button-honesty ruling and now sits in tension with the phase 26 wording rule. |
| FB-34 | CLEAN | - | 26 | No auto-transition: proof and pins below. Nothing rolls into a new block without an explicit confirmation. |
| FB-35 | CLEAN | - | 26 | The restart is behind an explicit confirm plus a re-entry guard, so a double tap cannot create two blocks. |
| FB-36 | FOUNDER-GATED | High | 25/26 | Whether the adaptive next block is reachable at all turns on Pro-gated weekly check-in data, and the branch flips on a placeholder row. This is an undeclared tier boundary. |

Counts: 17 DEFECT, 9 IMPROVEMENT, 7 CLEAN, 2 FOUNDER-GATED, 1 UNCERTAIN.

---

## PHASE 23 - First recovery week

### 23.1 What the user actually sees in week 6

Every surface, in the order a normal user meets them.

**Home, meso chip** (`src/screens/HomeScreen.js:1875-1890`). The chip line
comes from `buildReadinessSummary`; the recovery branch is priority 1
(`src/lib/readinessSummary.js:60-62`):

> "Recovery week, pull effort back."

Tone `recover`. No number, no strain score. The chip is whole-tappable and
opens the block sheet.

**Home, block sheet** (`src/components/HomeBlockShapeSheet.js:40-79`),
containing `BlockShapeCard` (`src/components/BlockShapeCard.js:46-47`):

> "Recovery week. Lighter on purpose. This is where the work pays off, and
> you lose nothing by easing back."

plus, in order, `GLOSSARY.mesocycle` ("A training block: a few weeks that
ease in, build, push, then recover.", `src/lib/coachGlossary.js:40-41`),
the climb-why line ("Effort builds a little each week so your body keeps
adapting, then the recovery week lets it catch up. How each muscle
responds can shape where your next block starts.",
`HomeBlockShapeSheet.js:62-64`), `GLOSSARY.deload` ("A lighter planned
week so you recover: lighter loads, full recovery, no PRs.",
`coachGlossary.js:15-16`) and `GLOSSARY.rir`.

**Train tab, block advisor card** (`src/screens/PlansScreen.js:740-843`,
content from `src/lib/blockAdvisor.js:283-292`). Headline "Recovery week
is active"; body:

> "Keep sessions lighter. Roughly half the sets, same exercises, easy
> effort. This isn't stepping back; it's letting the last few weeks of
> work pay off. You'll come back to full training next week."

Below it, pre-labelled "After your recovery week"
(`PlansScreen.js:777-779`), the next-block preview.

**In the workout** (`src/screens/ActiveWorkoutScreen.js:2663-2688`), a
`StatusStrip` item labelled "Recovery":

> title: "Recovery week"
> sub: "Light loads - full recovery - no PRs"

Set header (`ActiveWorkoutScreen.js:2388`): `Light set 3 - Easy`.
Prefill chip (`ActiveWorkoutScreen.js:2776-2786`): label "Recovery week -"
with `{weight}{units} x {reps}` from the deload prescription. Target
reason (`ActiveWorkoutScreen.js:1301-1303`): "Recovery week: very easy
effort, full recovery focus."

**Progress tab** (`src/components/BlockProgressCard.js:34-45`): header
`Week 6/6 · Recovery week`, and the effort chip is deliberately suppressed
on a deload week (`:43`).

**Run / streak** (`src/components/ConsistencyEcho.js:59`,
`src/components/StreakWeeksSection.js:78`,
`src/components/WeeklyStreakStrip.js:55`): "Recovery week. Your run
carries on."

**Verdict on the phase 23 comprehension question** ("this is intentional
recovery before the next block"): the *intent* lands. Three separate
surfaces say "on purpose" / "isn't stepping back" / "your run carries on",
no strain score is exposed anywhere, and `computeSessionAdjustments`
deliberately goes silent on a deload week
(`src/lib/algorithms.js:1023`, "R0: deload weeks belong entirely to the
deload prescription. Engine silent."). **FB-08 CLEAN, FB-14 CLEAN.**
What does not land is *what to actually do*, and the fact it happens
before the next block. See FB-01 and FB-09.

### FB-01 DEFECT (High) - five prescriptions, none of them the one the app gives

The recovery week is described five different ways, and the logger
implements a sixth.

| Surface | Instruction | Evidence |
|---|---|---|
| Train tab card | "Roughly half the **sets**, same exercises, easy effort" | `blockAdvisor.js:288` |
| Early-recovery card | "dropping your **sets** roughly in half this week while keeping the same exercises" | `blockAdvisor.js:411` |
| Coach review | "Reduce your **sets** by around a third and keep the weights comfortable" | `CoachReviewScreen.js:113` |
| Weekly coach note | "Ease your **sets** right back this week, keep the same exercises **and weights**" | `weeklyCoach.js:1266` |
| Glossary + logger banner | "**lighter loads**, full recovery, no PRs" | `coachGlossary.js:15-16`, `ActiveWorkoutScreen.js:2675` |
| **What the app actually prescribes** | **same set count, week-1 weight, half the reps** | see below |

The actual prescription: `ActiveWorkoutScreen.js:1281-1300` calls
`generateDeloadPrescription(week1Sets, true)`, and
`src/lib/algorithms.js:1311-1341` with `isFirstHalf = true` returns
`weight = week-1 weight` (unchanged) and `reps = round(baseReps * 0.5)`.
Probe output (§25.1): week-1 sets `60kg x 10/9/8` become
`60kg x 5/5/4`. The load is *not* reduced; only the reps are.

The set count is not reduced either.
`ActiveWorkoutScreen.js:2378` computes
`targetSets = adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS`,
and `adjustedSetCount` derives from `computeSessionAdjustments`, which
returns `[]` on a deload week (`algorithms.js:1023`). So the user is asked
for exactly the same number of working sets as in a build week.

Two supporting observations. First, the `isFirstHalf = false` branch (the
one that actually halves the load, `algorithms.js:1327`) has **no
production call site**: the only app caller passes `true` literally
(`ActiveWorkoutScreen.js:1285`); the only other references are in
`src/lib/__tests__/algorithms.test.js:513`. Second, the per-muscle planned
volume the recovery week *does* carry (flat research MEV on a first block,
`database.js:4192`) never reaches the logger's set target, so a user whose
Progress bars say `6 planned` is still asked for the routine's normal set
count.

**User scenario.** Day 35. The user opens the Train tab and reads "Roughly
half the sets, same exercises". They open their workout: the header says
"Set 1 of 4" (unchanged), the banner says "Light loads", and the prefill
offers the same 60 kg they lifted in week 1 for 5 reps instead of 10.
They cannot tell whether they are meant to halve the sets, halve the
reps, drop the weight, or all three. Three of the five copies contradict
what the screen in front of them is doing.

**Which law/phase this violates.** Phase 23 ("User should understand:
'this is intentional recovery before the next block'"), and Campaign 2's
standing rule that copy must describe the consequence truthfully. The
first-use law is not the issue; the honesty of the instruction is.

**Proposed minimal fix (copy only, no behaviour change).** Make every
recovery-week surface state the prescription the app actually gives:
same exercises, same weight as the block's first week, about half the
reps, easy effort. Concretely: replace `blockAdvisor.js:288`'s "Roughly
half the sets, same exercises, easy effort" and `:411`'s "dropping your
sets roughly in half this week" with the reps-based statement; align
`CoachReviewScreen.js:113`, `weeklyCoach.js:1266` and
`coachGlossary.js:15-16` on the same words. Changing the *behaviour*
(actually reducing set count) is a training-prescription change and is out
of scope for a comprehension campaign; if the founder prefers the
behaviour to change instead of the copy, that is a founder decision, not
an audit proposal.

### FB-02 DEFECT (High) - the recovery week triggers a "Recovery week suggested" banner

`shouldDeload` (`src/lib/algorithms.js`, entry at
`export function shouldDeload`) scores 50 of the 50 points needed to fire
when `recentReps < earlierReps - 2`. HomeScreen builds its four-week
window as a **rolling calendar window that includes today**
(`src/screens/HomeScreen.js:1077-1080`: `weekStart = now - (i+1)*weekMs`,
`weekEnd = now - i*weekMs`, so bucket `i = 0` is the current week), and
`avgReps` is the mean actual reps per working set for that bucket
(`HomeScreen.js:1084-1086`). The result is set as `deloadSuggestion`
(`HomeScreen.js:1116`) and renders the banner at
`HomeScreen.js:1632-1660`:

> "Recovery week suggested"
> "Rep performance has dropped significantly over the last 4 weeks"

There is no guard anywhere on this path for `currentMesoWeek.isDeload` or
`awaitingDecision`.

**User scenario.** Day 37. The user has done two recovery-week sessions,
following the app's own prescription of half the reps at the same weight
(FB-01). Their current-week `avgReps` is roughly half of week 3's. The
rolling window scores 50, and Home shows a banner telling them a recovery
week is suggested because their rep performance has dropped, directly
above a chip that already says "Recovery week, pull effort back." The
banner taps through to Coach review, which then advises reducing sets by
a third (`CoachReviewScreen.js:113`) during the week that is already the
reduction.

**Which law/phase this violates.** Phase 23 ("no technical strain score
needed", "this is intentional recovery"): the app reports its own
prescribed reduction back to the user as a performance problem.

**Proposed minimal fix.** Display gate only, no change to `shouldDeload`'s
maths or thresholds: suppress `deloadSuggestion` on Home when
`currentMesoWeek?.isDeload` or `currentMesoWeek?.awaitingDecision` is
true. The signal is already loaded on the same screen
(`HomeScreen.js:1132-1137`).

### FB-03 DEFECT (Medium) - "Block finished" fires inside the recovery week, repeatedly

`src/screens/WorkoutSummaryScreen.js:473`:

```
if (wk.mesocycleId && wk.plannedWeeks > 0 && wk.weekIndex >= wk.plannedWeeks && !wk.awaitingDecision) {
  setBlockStory({ mesocycleId: wk.mesocycleId, name: wk.mesoName });
}
```

`weekIndex >= plannedWeeks && !awaitingDecision` is precisely
`status === 'recovery'` (`src/lib/mesocycle.js:463-469`), i.e. the
recovery week itself, not the state after it. The gold card
(`WorkoutSummaryScreen.js:1476-1520`) then renders:

> "Block finished"
> "6 weeks completed, including your recovery week."
> "What's next: choose your next block from the Train tab when you're ready."

with a "Watch your block story" CTA and a share button. The in-file
comment at `:470-472` states the intent is to "celebrate the completion
moment ... once", but there is no once-only guard: the effect keys on
`[readOnly, user?.id]` (`:479`) and the condition holds for **every**
session logged in week 6. A user training four days in their recovery
week sees "Block finished. 6 weeks completed" four times, the first time
on day 35 with five days of the block still to run.

**Proposed minimal fix.** Move the trigger to `wk.awaitingDecision` (the
state that genuinely means finished), and add a one-time seen key so the
card fires once. Both are display-layer changes; the block story route and
share artefact are untouched.

### FB-04 DEFECT (Medium) - the advance warning is dead copy

`blockAdvisor.js:369-382` returns the `'continue'` advice whose body
contains the only forward warning in the product:

> "One more week before your recovery week. Push hard this week. It's your peak."

That body is never rendered. `PlansScreen.js:615-617`:

```
const showBlockCard = blockAdvice && activePlan &&
  blockAdvice.action !== 'continue' &&
  !blockSnoozed;
```

`getBlockAdvice` has exactly one consumer in the whole tree
(`PlansScreen.js:204`; verified by grep across `src/`). On the
`'continue'` path the screen uses only
`blockAdvice.blockStatus.currentWeek/totalWeeks` for the "Week 5 of 6"
line (`PlansScreen.js:937-941`). So the sentence that would prepare a
first-time user for the recovery week the week before it arrives is
unreachable.

**Proposed minimal fix.** Either surface the peak-week line in the
active-plan card when `weeksLeft === 1`, or delete the dead branch body so
the tree does not carry copy that cannot be read. Surfacing it is the
better answer for phase 23's "was the groundwork laid earlier".

### FB-05 DEFECT (Low) - "Skip" on the recovery-week banner

`ActiveWorkoutScreen.js:2676-2686`: the recovery-week status item's
dismiss pill reads **"Skip"** (accessibility label "Dismiss recovery week
banner"). Every sibling in the same strip uses "Got it"
(`ActiveWorkoutScreen.js:2658` for the coaching note), and the early
recovery card uses "Got it, ease off this week"
(`PlansScreen.js:854`). On a screen where the banner is the only thing
telling the user this week is deliberately lighter, a button labelled
"Skip" is readable as "skip the recovery week".

**Proposed minimal fix.** Change the pill label to "Got it", matching its
sibling. No behaviour change (`setDeloadDismissed(true)` is unchanged).

### FB-06 DEFECT (Medium) - the Pro weekly coach ignores the recovery week it is inside

`CoachOutputScreen.js:1959-1969` resolves the week a volume apply would
write to as `getNextMesocycleWeek(currentWeek.id)`. In week 6 of 6 there
is no next row, so `nextTrainingWeekId = null`, `canApply = false`, and
`nextWeekIsDeload = false`. `blockAwaitingDecision` is also false, because
the block is in `status === 'recovery'`, not
`completed_awaiting_decision`.

The result in `TrainingNextWeekCard`
(`CoachOutputScreen.js:342-346`, `:400-410`): the row label is whatever
the volume signal says, e.g. "Add 2 sets to each muscle group", the Apply
button is absent (`applyable` is false), and the explanatory note falls
all the way through to the generic:

> "This is next week's starting point. Each session still fine-tunes as
> you train."

Neither honest branch fires: the `blockFinished` note ("This block has
finished, so volume changes have nowhere to land yet") requires
`awaitingDecision`, and the `upwardBlocked` note ("Next week is your
recovery week, so the coach will not add sets to it. Recovery weeks stay
light on purpose.") requires the *next* week to be the deload, which is
true in week 5 and false in week 6.

**User scenario.** A Pro user opens their weekly coach on the Sunday of
their first recovery week. It tells them to add 2 sets to each muscle
group, gives them no way to do it, and explains that this is next week's
starting point. There is no next week.

**Proposed minimal fix.** Add a third note branch keyed on the current
week being the deload (data already loaded at `:1960`), stating that this
is the recovery week and volume changes resume with the next block. No
engine change; `weeklyCoach.js` is untouched.

### FB-07 CLEAN - the week-before groundwork, for Pro with an upward signal

Verified: in week 5 of 6, `nextWeekIsDeload` is true
(`CoachOutputScreen.js:1965`) and a positive signal renders label "Hold
through your recovery week" (`:344`) with note "Next week is your recovery
week, so the coach will not add sets to it. Recovery weeks stay light on
purpose." (`:408`). The coached-autonomy walk mirrors the guard so it can
never auto-apply a push into the deload rows (`:2053-2054`,
`:1213-1215`). This is the strongest single piece of groundwork in the
product. It is Pro only, and only fires when the signal is positive.

### FB-09 IMPROVEMENT (Medium) - the groundwork is opt-in, and the first block never mentions the recovery week

Where a first-time user could learn a recovery week is coming, before it
arrives:

1. The Home meso chip -> block sheet (`HomeScreen.js:1876-1890`).
   `BlockShapeCard` renders the dot row labelled Ease in / Build / Build /
   Build / Push / Recover and the line
   `Week 2 of 6 · Build. Recovery week in 4.`
   (`BlockShapeCard.js:19-24`, `:51`). This is good, and it is the only
   always-available explanation. It requires a deliberate tap on a chip
   whose visible text is a readiness line, not an invitation.
2. `MesocycleBuilderScreen.js:298-306` tooltip ("Week 6 is your lighter
   recovery week ... the load drops so your body can absorb all the
   progress"), three navigations deep.
3. The Pro weekly coach, week 5 only, upward signal only (FB-07).

What does **not** mention it: the block-start explanation on a first
block. `buildBlockStartLines`
(`src/lib/blockExplain.js:101-130`) emits per-muscle lines ending "...
then a recovery week" only for **personalised** sources
(`SOURCE_CLAUSE` at `:35-39`). A first block is entirely
`source = 'template'` (`database.js:4165`), so the function returns the
single research line (`blockExplain.js:45-46`):

> "Not enough personal history yet, so this block starts from
> research-based guidance. As blocks finish, each muscle's starting point
> comes from how it actually responded."

Confirmed by probe (§25.1, "FIRST BLOCK (template-seeded) block-start
lines"). It is honest (FB-29) and it says nothing about a recovery week.

So a first-time user who never taps the chip meets their first recovery
week with no prior mention of it, on day 35, from a chip line reading
"Recovery week, pull effort back."

**Proposed ruling for the lead.** Add the structural clause to the
research start line so the first block's own explanation carries the
shape it is about to follow (for example: "... research-based guidance.
It builds week by week, then week 6 is a lighter recovery week before
your next block."). This is one sentence on an existing surface, not a
tutorial wall, and it is exactly the "explain when relevant" the second
first-use law prefers.

### FB-10 IMPROVEMENT (Medium) - per-muscle recovery weeks are unexplained and inert in the logger

From block 2 onward a ledger-sourced seed sizes its own recovery week
(`src/lib/blockSeed.js:126-147`), strain-scaled per muscle via
`deloadSharePct` (`src/lib/coachApply.js:232-234`). The probe (§25.1)
shows the real spread on a mixed block: back 10, chest 6, quads 6,
hamstrings 6, biceps 6, while the twelve research-seeded muscles keep flat
MEV. So a user's second recovery week legitimately reduces different
muscles by different amounts.

No surface explains this. `BlockProgressCard` shows the per-muscle planned
numbers as bars with the header `Week 6/6 · Recovery week`
(`BlockProgressCard.js:34-38`) and nothing else. And, per FB-01, none of
it reaches the logger: `targetSets` is still the routine's
`recommendedSets`, so the differentiated recovery week changes the
Progress bars and nothing the user is asked to do.

### FB-11 IMPROVEMENT (Low) - "no PRs" is guidance, not a guarantee

`coachGlossary.js:15-16` and `ActiveWorkoutScreen.js:2675` both promise
"no PRs" during the recovery week. `detectPR`
(`ActiveWorkoutScreen.js:1511`) is not gated on `isDeloadWeek`. The deload
prescription only applies to exercises with week-1 sets
(`ActiveWorkoutScreen.js:1282-1284`); an exercise added or swapped
mid-block gets normal targets in the recovery week and can therefore set
a record inside the week the app said would not produce one. Low severity
because the copy reads as instruction rather than as a system guarantee,
but it is a promise the app does not keep.

### FB-12 UNCERTAIN (Low) - a fully rested recovery week is invisible to the run

`getDeloadWeeksInRange` (`src/lib/database.js:6068-6084`) infers a
recovery week from a completed workout linked to an `is_deload = 1` week
row, and its own header comment records the gap: "a deload week with zero
logged sessions has no workout to link, so it cannot be detected here".
The recovery-week copy says "Keep sessions lighter" (train), so a user who
takes the week entirely off is off-plan and is covered by the streak's
one-week repair. Recorded rather than actioned: the residual is already
documented in code, and any change here touches run/streak semantics.

### FB-13 FOUNDER-GATED (Medium) - a free user is told Precision Coaching acted for them

`src/lib/differentialPaywall.js:51` and `:66`, the `deload` trigger copy
served to free users:

> "Precision Coaching is holding a lighter week. Your food log could show
> whether fuel is the cause."

Precision Coaching is the Pro coaching engine. A free user has no
Precision Coaching; the lighter week they are in is either the plan's
scheduled recovery week or the tier-blind `shouldDeload` signal. The trigger
is fed from `deloadSuggested` (`HomeScreen.js:860`), which is the
`shouldDeload` output, not a Precision Coaching decision.

This is paywall copy and therefore founder-gated by the brief and by
`CLAUDE.md` Section 2 (billing). **Documented, not proposed.** The exact
correction, if the founder rules on it, is to name the actual actor
("Your plan has a lighter week here" / "Your training suggests a lighter
week") rather than a Pro engine. Related: the `block_summary` trigger
(`differentialPaywall.js:53`) means a free user's **first ever block
completion** carries an upsell line; also founder-gated, also documented
only.

---

## PHASE 24 - First block completion

### 24.1 What the block-finished state looks like

`getBlockStatus` (`src/lib/mesocycle.js:440-479`) moves the block to
`completed_awaiting_decision` on day 42 and holds it there indefinitely,
with `weeksOverdue` counting. Surfaces:

- **Home chip** (`HomeScreen.js:1430-1431`): "Block finished. Targets hold
  at recovery-week volume until you choose what comes next." Honest and
  specific. **FB-21 CLEAN.**
- **Home block sheet**: `BlockShapeCard.js:45` renders the same sentence,
  and the sheet gains a "Choose your next block" button routing to the
  Train tab (`HomeBlockShapeSheet.js:67-75`).
- **Logger** (`ActiveWorkoutScreen.js:2674-2675`): title "Block finished",
  sub "Holding at recovery-week volume until you choose your next block".
- **Progress** (`ProgressSections.js:44-47`, `BlockProgressCard.js:34-35`):
  "Block finished".
- **Train tab decision card** (`PlansScreen.js:740-843`, content from
  `blockAdvisor.js:296-313`): headline "Block finished", body "You've
  finished this block, recovery week included. The next step is choosing
  your next block."

Nowhere does anything claim the app now knows the user's optimal training.
The ledger rationales are composed from the final clamped numbers
(`interBlock.js:206-224`), which is what makes over-claiming structurally
impossible. **FB-22 CLEAN.**

### FB-15 DEFECT (High) - the block summary is unreachable exactly when it matters

`BlockReflectionScreen` is the screen the order calls the block summary:
it carries the stat row, the narrative, "Records set this block", and the
"What this block showed" ledger section
(`src/screens/BlockReflectionScreen.js:216-296`).

Its only navigable entry point is
`MesocycleBuilderScreen.js:277-291`, the "View block summary" button,
which is rendered **only when `!isActive`** (`:277`,
`const isActive = meso.isActive === 1 || meso.isActive === true` at
`:258`). And the list it renders is already filtered to non-active blocks
(`MesocycleBuilderScreen.js:174`):

```
data={mesocycles.filter(m => !(m.isActive === 1 || m.isActive === true))}
```

A finished block stays `is_active = 1` until a **new** block is created:
`activatePlanWithBlock` is the only writer that clears it
(`src/lib/database.js:3721-3723`, `UPDATE mesocycles SET is_active = 0`),
and it runs as part of creating the next block. Nothing marks a block
inactive on completion.

Therefore, for the entire "block finished, awaiting decision" period, the
just-finished block is neither in "Past blocks" nor offered a "View block
summary" button, and `BlockReflection` has no other route to it. The one
screen designed to answer "what did this block show" is unreachable until
the user has already made the decision it exists to inform.

Corroborating: `MesocycleBuilderScreen.js:302-304`'s own tooltip promises
"When Week 6 is complete, the block closes and moves to Past blocks
below", which is untrue for exactly this reason (**FB-20**).

The only block-end retrospective a user can reach is the story
(`RecapStory`), offered from Workout Summary during the recovery week
(FB-03) and from `BlockReflection` itself
(`BlockReflectionScreen.js:174-181`), which is circular.

**Proposed minimal fix.** Render "View block summary" for the active block
when `getBlockStatus(...).awaitingDecision` is true (the helper
`isBlockFinished` already exists on that screen at
`MesocycleBuilderScreen.js:163-167` and is already used for the active
card's label at `:209`), and/or add the same link to the Train tab
decision card, which already knows the block id. No data change.

### FB-16 DEFECT (High) - "Records set this block" are not records

`BlockReflectionScreen.js:253-280` renders a section headed **"Records set
this block"** (`:257`) with `InfoTooltip text={GLOSSARY.pr}` (`:260`),
i.e. the glossary definition "A personal record: a new best for you on an
exercise ... PRs are the clearest sign your training is working."
(`coachGlossary.js:29`). The rows are typed via
`PR_TYPE_LABELS['1rm_estimate'] = 'Est. max'` (`:95`).

The data behind it (`src/lib/database.js:6608-6627`) is:

```
const e1rm = calculate1RM(s.weight || 0, s.actual_reps || 0);
... blockBestByExercise.set(exercise_name, { record_type: '1rm_estimate', value: ... })
const prs = Array.from(blockBestByExercise.values()).sort(...).slice(0, 5);
```

This is the **best estimated max per exercise within this block**, top
five. It is never compared against any prior block, any prior best, or any
record store. On a first block, every single row is by construction the
user's first-ever performance on that exercise. On later blocks a row
still appears even if the value is lower than a previous block's best.

The block story repeats it more loudly. `YearOfLiftsScreen.js:396-401`:
headline "Personal records", subline "Set this block", gold tone, trophy
icon. Note that the **month and week variants of the same component
already got this right**: `YearOfLiftsScreen.js:251` and `:340` use the
honest subline "Estimated max lifts this month" / "...this week". Only the
block variant claims records.

This also directly contradicts the logger's own deliberate rule. When a
first-ever set is logged, `ActiveWorkoutScreen.js:1512-1528` explicitly
refuses to call it a PR:

> "Wave A A1: the first-ever set of an exercise beats nothing, detectPR
> compares against empty history, so 'PERSONAL RECORD' would be a false
> claim in the very session that builds trust."

and instead shows "60kg x 10 logged as your starting point". Twelve
weeks later, the block summary and the block story present those same
starting points as "Records set this block" / "Personal records".

**User scenario.** A complete beginner finishes their first block. The
block story shows a gold trophy card headed "Personal records - Set this
block" listing the five exercises they happened to load heaviest,
including the leg press they have performed exactly four times in their
life. They believe they set five records. They set none; they established
five baselines.

**Which law/phase this violates.** Phase 24 ("Do not oversell") and the
third first-use law (no false personalisation: a claim about the user's
achievement that the data does not support).

**Proposed minimal fix.** Adopt the phrasing the same components already
use elsewhere: `BlockReflectionScreen.js:257` "Records set this block" ->
"Your best estimated max per lift"; `YearOfLiftsScreen.js:398` subline
"Set this block" -> "Estimated max lifts this block"; and replace the
`GLOSSARY.pr` tooltip at `:260` with `GLOSSARY.estMax` ("An estimate of
the most you could lift once, worked out from your recent sets. You never
have to test it.", `coachGlossary.js:23-24`), which is what the rows
actually are. No PR maths is touched, satisfying phase 15's "Do NOT change
PR maths".

### FB-17 DEFECT (Medium) - the block's progress figure compares week 1 to the recovery week

`src/lib/database.js:6573-6587`:

```
const firstWeekCutoff = startMs + 7 * 86400000;
const lastWeekCutoff  = endMs - 7 * 86400000;
const tonnageDelta = firstTonnage > 0 ? round(((lastTonnage - firstTonnage) / firstTonnage) * 100) : null;
```

`end_date` is written as `start + 6 weeks` (`database.js:3729-3730`), so
`lastWeekCutoff` is the start of week 6, **the recovery week**. The
block's headline progress figure therefore always compares a full build
week against the deliberately reduced recovery week.

Consequences, both rendered:

- `BlockReflectionScreen.js:73-80` (`buildNarrative`): the `> 5` branch
  ("The weight you lifted each week climbed X% from the first week to the
  last") is effectively unreachable; the `< -5` branch fires: "You lifted
  less in the final week than the first, likely a recovery week." The
  hedge "likely" is on a fact the app knows for certain (`deload_week` is
  stored).
- `YearOfLiftsScreen.js:387-393`: a gold-adjacent stat card with the
  `trending-up` icon showing a large negative percentage and the caption
  "Your final week was lighter, and that's the plan working."

**User scenario.** A user who added weight every week for five weeks
opens their first block summary and is told they lifted less at the end
than at the start, above a story card with an upward-trending arrow
reading "-38%".

**Proposed minimal fix.** Exclude the deload week from the comparison:
compare week 1 against the last **accumulation** week using the stored
`deload_week` (already on the mesocycle row and already read by
`generateInitialPlannedVolume` and `blockLedgerRunner`). Then the honest
climb line can fire when the user did climb, and the recovery week stops
masquerading as the block's outcome.

### FB-18 DEFECT (Medium) - "What's next" contradicts the block, and both CTAs dead-end

`BlockReflectionScreen.js:313-329`:

> "What's next"
> "Take a few days of lighter activity to recover, then start your next
> block. That recovery is when your progress takes hold."
> [Start a new block]

The user has just completed a recovery week as the final week of the
block. The Train tab says so on the same day: "You've finished this
block, **recovery week included**. The next step is choosing your next
block." (`blockAdvisor.js:309`), and when overdue it says the opposite of
this card: "Your recovery week has been and gone. The sooner you start the
next block the better." (`blockAdvisor.js:308`).

Both "Start a new block" CTAs on this screen
(`BlockReflectionScreen.js:211` in the empty state, `:318-328` in the
What's next section) navigate to `MesocycleBuilder`. That screen is
**read-only**: its only button is "View block summary"
(`MesocycleBuilderScreen.js:278-291`); there is no create action anywhere
in the file. So the CTA named "Start a new block" lands on a screen from
which no block can be started.

**Proposed minimal fix.** Replace the "Take a few days of lighter
activity" sentence with the state the app is actually in (the recovery
week is done; the next step is the block decision), and point both CTAs at
the Train tab's decision card (`navigateCrossTab(..., 'PlansTab',
'Plans')`), which is where the decision genuinely lives and is already the
target used by `HomeBlockShapeSheet.js`'s "Choose your next block"
(`HomeScreen.js:2119`).

### FB-19 DEFECT (High) - the block decision is made from check-in readiness, not from the block

`buildNextBlockRecommendation` (`blockAdvisor.js:170-227`) chooses which
single option the user is offered using only weekly check-ins:

```
const allReadiness = checkins.map(checkinReadiness).filter(r => r !== null);
const avgReadiness = allReadiness.length ? mean(allReadiness) : 70;
if (highSignals.length === 0 && avgReadiness >= 60) { ... 'repeat' ... }
if (highSignals.length <= 1 || avgReadiness >= 50)  { ... 'adjust' ... }
... 'consider_rebuild'
```

The Block Ledger, which is the app's actual block-level evidence, is not
an input. And `PlansScreen.js:231-234` gates the ledger story rows on that
same recommendation:

```
rows: advice?.nextBlock?.recommendation === 'adjust'
  ? buildLedgerReflectionRows(ledger).slice(0, 4)
  : [],
```

So the "What this block showed" rows on the decision card render only on
the `'adjust'` branch. And `PlansScreen.js:313` maps everything else to a
true repeat:

```
const seedIntent = intent === 'adjust' ? 'adjust' : 'repeat';
```

**User scenario (from the probe, §25.1).** A user's first block produced
six judgements: back RESPONSIVE with dose-response evidence (+1 earned),
chest RESPONSIVE retained, quads STRAINED, biceps OVERREACHED (peak must
come down), hamstrings STALE, calves INSUFFICIENT_DATA. Their weekly
check-ins were unremarkable, so `avgReadiness >= 60` and no high signals.
The advisor returns `'repeat'`. The card shows headline "Go again: same
plan", body "Pick up where you left off. Same exercises, same structure.",
button "Continue this plan", **and no ledger rows at all**. Tapping runs
`intent = 'repeat'`, which in `resolveSeedRange`
(`blockSeed.js:98-101`) discards every proposal and re-seeds the observed
start and planned peak. The +1 back earned is gone; the biceps peak
reduction is gone; the strain-scaled recovery week is not written
(`blockSeed.js:126`, gated on `intent !== 'repeat'`).

The perverse consequence: **a block that went well is the case in which
the app throws its ledger away**, because good readiness routes to
`'repeat'`. The adaptive layer is reachable only by users whose readiness
was mediocre.

**Proposed minimal fix (comprehension part, in scope).** The ledger story
rows should render whenever a ledger exists, since they are statements
about the block that just happened and are true under any button; the
existing review-blocker note at `PlansScreen.js:213-220` gated them only
because the rows make *forward* claims. Splitting the rationale into
"what this block showed" (always true) and "what the next block would do"
(only under adjust) resolves that without weakening the honesty rule.
**The decision-architecture part (which option the user is offered) is
covered by FB-31 and FB-36 and is founder-gated.**

### FB-23 IMPROVEMENT (Low) - the block story's own ending repeats the recovery instruction

`YearOfLiftsScreen.js:408-411`, the outro card:

> "That block is done. Recover well, then go again."
> "Your full block summary is inside."

Two problems. The recovery week is already done, so "Recover well" is the
same duplication as FB-18. And "Your full block summary is inside" points
at `BlockReflectionScreen`, which is unreachable at this moment (FB-15)
and is not linked from the story anyway; the link runs the other way
(`BlockReflectionScreen.js:174-181`).

---

## PHASE 25 - First personalised next block

### 25.1 Synthetic mixed-outcome block: what the user is actually shown

A first block was run through the real modules with six muscles reaching
six different outcomes. Week-1 planned volume was set to research MEV and
the peak to research MAV, which is exactly what a template-seeded first
block writes (`database.js:4165`). Verbatim probe output:

```
===== BLOCK-END: "What this block showed" rows =====
[STRAINED]          Quads:      Quads lost ground while recovery ran poor, so the starting volume carries over unchanged.
[OVERREACHED]       Biceps:     Biceps progressed, but the recovery cost ran high late in the block, so the starting volume carries over unchanged and the peak comes down.
[RESPONSIVE]        Back:       Back responded well and kept progressing in the higher-volume weeks with recovery to spare, so the next block starts 1 set higher.
[RESPONSIVE]        Chest:      Chest responded well at this dose, so the starting volume carries over unchanged.
[STALE]             Hamstrings: Hamstrings held steady this block with recovery fine, so the starting volume carries over unchanged.
[INSUFFICIENT_DATA] Calves:     Calves was trained too rarely this block to judge the response, so the starting volume carries over unchanged.

ROWS RENDERED ON THE DECISION CARD (slice 0,4): 4 of 6
recoveryProposalLine: null      proposedRecoveryDays: 7

===== SEEDING the next block, intent=adjust vs intent=repeat =====
chest        adjust= 6->14 (ledger,  deload 6)    repeat= 6->14 (ledger,  deload -)
back         adjust=11->16 (ledger,  deload 10)   repeat=10->16 (ledger,  deload -)
front_delts  adjust= 0->10 (profile, deload -)    repeat= 0->10 (profile, deload -)
side_delts   adjust= 8->19 (profile, deload -)    repeat= 8->19 (profile, deload -)
rear_delts   adjust= 6->17 (profile, deload -)    repeat= 6->17 (profile, deload -)
biceps       adjust= 6->12 (ledger,  deload 6)    repeat= 6->14 (ledger,  deload -)
triceps      adjust= 6->16 (profile, deload -)    repeat= 6->16 (profile, deload -)
forearms     adjust= 4->16 (profile, deload -)    repeat= 4->16 (profile, deload -)
quads        adjust= 8->14 (ledger,  deload 6)    repeat= 8->14 (ledger,  deload -)
hamstrings   adjust= 6->14 (ledger,  deload 6)    repeat= 6->14 (ledger,  deload -)
glutes       adjust= 4->16 (profile, deload -)    repeat= 4->16 (profile, deload -)
adductors    adjust= 0->10 (profile, deload -)    repeat= 0->10 (profile, deload -)
calves       adjust= 8->14 (profile, deload -)    repeat= 8->14 (profile, deload -)
abs          adjust= 4->18 (profile, deload -)    repeat= 4->18 (profile, deload -)
traps        adjust= 4->17 (profile, deload -)    repeat= 4->17 (profile, deload -)
neck         adjust= 2->8  (profile, deload -)    repeat= 2->8  (profile, deload -)
tibialis     adjust= 2->8  (profile, deload -)    repeat= 2->8  (profile, deload -)

===== The block-start lines the user actually reads on the NEXT block =====
buildBlockStartLines returned 3 line(s) for 17 muscles:
  > Back: 11 sets in week 1, building to 16 by week 4, then a recovery week (set by how your last block went).
  > Chest: 6 sets in week 1, building to 14 by week 4, then a recovery week (set by how your last block went).
  > Quads: 8 sets in week 1, building to 14 by week 4, then a recovery week (set by how your last block went).
source spread across the written block:
  seed_ledger : chest, back, biceps, quads, hamstrings          (5)
  seed_profile: front_delts, side_delts, rear_delts, triceps,
                forearms, glutes, adductors, calves, abs,
                traps, neck, tibialis                           (12)

===== FIRST BLOCK (template-seeded) block-start lines, for comparison =====
  > Not enough personal history yet, so this block starts from research-based guidance.
    As blocks finish, each muscle's starting point comes from how it actually responded.

===== RECOVERY-WEEK per-set prescription actually shown in the logger =====
week-1 sets: 60kg x 10, 60kg x 9, 60kg x 8
generateDeloadPrescription(..., true)  [the ONLY call site]: 60kg x 5, 60kg x 5, 60kg x 4  (rir 4)
generateDeloadPrescription(..., false) [never called in app code]: 30kg x 5, 30kg x 5, 30kg x 4

===== RAMP POSITION LINE across the block =====
week 1: "Week 1 of 5 in your block. The planned climb adds 4 sets next week."
week 4: "Week 4 of 5 in your block. Your recovery week is next."
week 5: null
```

Probe harness: `scratchpad/__tests__/firstblock.probe.test.js`, run
against the repo's own jest with a scratchpad config. No repo file was
added or modified.

### FB-24 DEFECT (High) - nothing confirms what changed

Trace of the transition (`PlansScreen.js:286-339`):

1. The user taps the primary CTA -> `handleRestartPlan(recommendation)`.
2. An `appAlert` confirms (see FB-26 for its copy).
3. On confirm: `buildSeedRangesForNextBlock(user.id, { intent, ... })`
   (`:314`), `activatePlanWithBlock(..., { ledger: seedRanges })` (`:319`),
   `recordSeedOutcome(...)` (`:322-326`), `AsyncStorage.removeItem` of the
   snooze key, `loadData()`.
4. On success there is **no toast, no navigation, no summary**. The only
   `toast.show` on this path is the error case (`:331`).
5. `loadData()` re-runs, `getBlockAdvice` now returns `action: 'continue'`
   for the fresh block, and `showBlockCard` (`:615-617`) becomes false, so
   the card the user was reading vanishes.

The user is left on the Train tab with an active-plan card reading "Week 1
of 6". Nothing on that screen says what the app changed or why.

The only post-transition explanation surface anywhere is the Home meso
chip -> block sheet, where `seedLines` renders up to three lines
(`HomeScreen.js:1140-1157` builds them; `HomeBlockShapeSheet.js:50-52`
renders them). Reaching it requires the user to leave the Train tab, spot
the chip, and tap it.

And those lines carry no comparison. Probe: "Back: 11 sets in week 1,
building to 16 by week 4, then a recovery week (set by how your last block
went)." There is no "up from 10", no "held at the same 6 that worked", no
delta of any kind. The **why** (the ledger rationale, e.g. "Back responded
well and kept progressing in the higher-volume weeks with recovery to
spare") lives on the previous screen state, which no longer exists, and on
`BlockReflectionScreen`, which was unreachable at decision time (FB-15)
and is only reachable *after* the transition, since the old block finally
becomes inactive at `database.js:3721`.

**Phase 25's test is "the app remembered what happened", not "the numbers
changed mysteriously". As built, the user gets the second.**

**Proposed minimal fix.** Carry the block-end explanation forward across
the transition: after a successful `activatePlanWithBlock` with a ledger,
show a confirmation surface built from data already in hand
(`seedRanges.ranges` plus the ledger entries `recordSeedOutcome` already
persists) stating, per muscle that moved, what changed and the rationale
already composed for it. `recordSeedOutcome`
(`blockLedgerRunner.js:391-407`) already writes `seedOutcome.perMuscle`
with `{ source, startSets, peakSets }` for exactly this provenance
purpose; the previous block's `observed.startSets` is on the same stored
record, so the delta needs no new computation and no new data.

### FB-25 DEFECT (High) - "where research still filled gaps" is never stated

Phase 25 requires the user to see "where research/history was still used".
`buildBlockStartLines` (`blockExplain.js:101-130`) cannot say it in a
mixed block. The research line is emitted **only when nothing is
personalised** (`:110-119`):

```
if (personalised.length === 0) {
  ... return allResearch ? [RESEARCH_START_LINE] : [];
}
const rows = personalised.sort(by peak desc).slice(0, limit);   // limit = 3
```

Probe result: 5 muscles seeded from the ledger, **12 seeded from the
profile/research prior**, three lines rendered, and not one word about the
twelve. A user reading the block sheet sees three confident "set by how
your last block went" lines and has no way to know that most of their
block is still research-based.

This is the honest-provenance case the Campaign 2 provenance law exists
for, applied one level up: the app is not *claiming* learning it does not
have (the twelve are silent, not mislabelled), but silence in a
personalised-looking list reads as "all of this is personalised".

**Proposed minimal fix.** When both families are present, append one
research line naming the state, for example: "The rest still start from
research-based guidance, until they have a block behind them." The source
family is already grouped in the same function (`RESEARCH_SOURCES` at
`:44`), so the classification needs no new data. This adds one sentence to
an existing sheet, not a new surface.

### FB-26 DEFECT (Medium) - the confirmation alert is identical for both intents

`PlansScreen.js:288-291`:

```
appAlert(
  'Restart this plan?',
  "A new training block starts today with the same workouts. Aim to match or improve on last time's weights.",
  [ Cancel, 'Start new block' ]
)
```

This is the same title and the same body whether `intent === 'adjust'` or
`intent === 'repeat'`. At the single moment where the app asks the user to
confirm the most consequential training decision it offers, it:

- titles both paths "Restart this plan?", which reads as a repeat;
- says "the same workouts", which is true of the routines and silent about
  the volume changes that are the entire point of the adjust path;
- says nothing about what the adjustments are.

**User scenario.** The user reads "The structure is working. Your next
block starts from what this block showed, muscle by muscle." on the card,
taps "Continue with adjustments", and is asked "Restart this plan? A new
training block starts today with the same workouts." They reasonably
conclude they misread, or that the adjustments were not real.

**Proposed minimal fix.** Branch the alert body on `intent`. For adjust:
name that the workouts are the same and the weekly set targets start from
what the last block showed. For repeat: state plainly that the plan runs
again exactly as it was. The intent is already the function's own argument
(`handleRestartPlan(intent)`).

### FB-27 IMPROVEMENT (Medium) - on the first transition, almost nothing changes

Probe, adjust column: of 17 muscles, exactly **one** start changed (back
10 -> 11) and exactly **one** peak changed (biceps 14 -> 12). The other 15
are byte-identical to the first block. This is correct behaviour: the
founder's retention rule is explicit that "a successful dose should
normally be retained" and that +1 requires the dose-response evidence pair
(`interBlock.js:26-34`), and a first block starts every muscle at research
MEV, so retention means "the same number".

But the user sees "Back: 11 sets in week 1 ... (set by how your last block
went)" and "Chest: 6 sets in week 1 ... (set by how your last block
went)" side by side, with chest's 6 identical to last block's 6. Nothing
tells them that *keeping* it was itself a decision made from their data.
The emotional beat phase 25 is asking for ("the app remembered what
happened") is available in the rationale text, which is not on this
surface.

**Proposed ruling for the lead.** The retention case deserves its own
clause in the block-start line, so "unchanged" reads as a judgement rather
than an absence. `interBlock.js` already composes exactly this sentence
("the starting volume carries over unchanged"); the transition surface
should reuse it rather than restating bare numbers.

### FB-28 IMPROVEMENT (Medium) - the 3-line cap drops the muscles that moved

`buildBlockStartLines` sorts by peak descending and slices to
`limit = 3` (`blockExplain.js:120-122`, called with the default from
`HomeScreen.js:1156`). Probe: the rendered three are back (peak 16), chest
(14) and quads (14). **Biceps, the only muscle whose peak was reduced
(14 -> 12), is never shown**, because a reduced peak sorts last by
construction. Hamstrings is also dropped.

Sorting by peak means the lines shown are the muscles with the biggest
numbers, not the muscles with the biggest news. For a surface whose job is
"what the app remembered", that is the wrong ordering.

**Proposed ruling for the lead.** Order the block-start lines by
magnitude of change from the previous block (with unchanged entries last),
and state the remainder count. Both inputs are available:
`seedOutcome.perMuscle` and the stored ledger `observed` numbers.

### FB-29 CLEAN - no false personalisation on a first block

Verified by probe and pinned. A first block emits only:

> "Not enough personal history yet, so this block starts from
> research-based guidance. As blocks finish, each muscle's starting point
> comes from how it actually responded."

(`blockExplain.js:45-46`, emitted at `:118`). It is derived from the
**written** `planned_muscle_volume` rows, not from the requested seed map
(`blockExplain.js:9-13`, `HomeScreen.js:1150-1155`), so a skipped insert
cannot be narrated as applied. Pinned at
`src/__tests__/campaign2.comprehension.test.js:64-73`, which asserts the
line contains "Not enough personal history yet" and does **not** match
`/last block|past blocks|learned/`. Third first-use law: satisfied.

### FB-30 CLEAN - rationale text cannot contradict the proposal

`interBlock.js:206-224` composes every rationale from the **final clamped**
start and peak, with the branch cause passed in as a value or a function
of the final delta, so a clamp that nullifies a cut cannot leave copy
claiming one. Pinned at `campaign2.comprehension.test.js:56-62` ("a
retained dose never reads as an increase; an increase names its
evidence"). Probe confirms in practice: quads was STRAINED and *intended*
`previousStart - 2`, but the MEV floor clamped it, and the rendered
sentence correctly says "the starting volume carries over unchanged"
rather than claiming a reduction.

---

## PHASE 26 - Repeat vs adjust, first-time comprehension

### 26.1 The decision as the user meets it

Both options exist in code, in `buildNextBlockRecommendation`
(`blockAdvisor.js:180-226`):

| recommendation | headline | body (finished) | primary CTA | secondary CTA |
|---|---|---|---|---|
| `repeat` | "Go again: same plan" | "Pick up where you left off. Same exercises, same structure. You'll come back a little stronger each block." | **"Continue this plan"** | "Build a new plan" |
| `adjust` | "Same plan, slightly adjusted" | "The structure is working. Your next block starts from what this block showed, muscle by muscle." | **"Continue with adjustments"** | "Build a new plan" |
| `consider_rebuild` | "Might be worth a fresh look" | "Fatigue ran consistently high this block. It's worth reviewing whether the plan's volume or exercise selection still fits where you are. The coach can help rebuild it." | **"Repeat this plan anyway"** | "Review with coach" |

`PlansScreen.js:812-839` renders exactly one primary
(`blockAdvice.nextBlock.actionLabel`) and one secondary
(`blockAdvice.nextBlock.secondaryLabel`).

### FB-31 DEFECT (High) - the two options are never presented together

The phase 26 brief asks whether "the difference is unmistakable at first
encounter". The user never encounters both. `buildNextBlockRecommendation`
returns **one** object; the screen renders **one** primary button. There
is no toggle, no "or", no alternative. The other path is unreachable from
this card, and there is no other decision surface (`getBlockAdvice` has
one consumer; `MesocycleBuilderScreen` is read-only, FB-18; the Home
sheet's "Choose your next block" routes here,
`HomeScreen.js:2119`).

So the honest answer to phase 26's comprehension question is: the
difference cannot be unmistakable, because it is never shown. The app
decides for the user, on a criterion (weekly check-in readiness) unrelated
to the block outcome (FB-19).

The secondary button is not the alternative either: for both `repeat` and
`adjust` it is "Build a new plan", routing free users to `PlanLibrary` and
Pro users to `PlanUpdate` (`PlansScreen.js:829-836`).

**Which law/phase this violates.** Phase 26 in full: "REPEAT: run this
plan again as-is. CONTINUE WITH ADJUSTMENTS: build the next block from
what the app learned. ... Both remain legitimate user choices." Only one
is offered.

**Class note.** Presenting both would change which tier can reach the
adjusted path (see FB-36) and changes decision architecture, not just
copy. Recorded here as a DEFECT with a **founder-gated remedy**: the
minimal comprehension-only version is to name the alternative in the
card's body and make it reachable, without changing what the advisor
recommends. Nothing here is proposed for autonomous execution.

### FB-32 DEFECT (Medium) - "Continue this plan" does not say the plan repeats

The `repeat` branch's CTA is "Continue this plan"
(`blockAdvisor.js:188`). What it does (`PlansScreen.js:313` ->
`blockSeed.js:98-101`) is a **true repeat**: the next block is seeded with
the finished block's own observed start and planned peak, discarding every
ledger proposal, and no strain-scaled recovery week is written
(`blockSeed.js:126`).

"Continue this plan" reads as "carry on as I have been", which for a user
who has just been told their coach learns from their training is easily
read as "carry on, including the learning". The word that would make it
unmistakable ("again", "as-is", "unchanged") is absent. Note that the
product already found that wording elsewhere: the `consider_rebuild`
branch says "Repeat this plan anyway" (`:224`) precisely because D93
required the button to state its true behaviour.

**Proposed minimal fix.** Bring the `repeat` branch's label into line with
the honesty precedent its sibling already follows, for example "Run this
plan again, unchanged". Copy only; `seedIntent` mapping is untouched.

### FB-33 UNCERTAIN (Low) - "Repeat this plan anyway"

`blockAdvisor.js:224` uses "Repeat this plan anyway" for the
`consider_rebuild` branch. The word "anyway" does frame repeating as
going against the recommendation, which is in tension with phase 26's
"Do not use wording suggesting: Repeat is bad".

Evidence that this was deliberate, not an accident:
`blockAdvisor.js:218-223` records the D93 (Campaign 2, Phase 12) reasoning
verbatim: the card recommends a fresh look, so its primary button cannot
share "Continue this plan" with the card that recommends continuing, and
"'Repeat this plan anyway' states the true behaviour ... and owns that it
goes against the headline, per the D91-2 button-honesty precedent." It is
pinned at `campaign2.comprehension.test.js:46-55`.

Recorded as UNCERTAIN with evidence attached: this is a genuine conflict
between two founder rulings (D93 button honesty vs the phase 26 wording
rule), and resolving it is a lead ruling, not an audit call. Note that
this branch requires two or more high check-in signals and is therefore
rare in first use.

### FB-34 CLEAN - no auto-transition proof

Nothing rolls into a new block without an explicit user confirmation.
Evidence, in four parts.

**1. The finished state is terminal and passive.**
`getBlockStatus` (`src/lib/mesocycle.js:462-478`) resolves
`completed_awaiting_decision` and stays there indefinitely, with
`weeksOverdue` counting; there is no branch that advances or recreates
anything. The module comment at `:455-461` records the Stage 1 rule: "a
finished block is ONE explicit state, however long it is ignored."

**2. Block creation has exactly one writer, and it is only ever called
from a user action.** `activatePlanWithBlock`
(`src/lib/database.js:3715`) contains the only live `INSERT INTO
mesocycles` (`:3739-3744`; pinned at
`src/lib/__tests__/blockLifecycle.stage1.test.js:110` that every INSERT
variant lives only in `database.js`, and at `:100` that the legacy
`createMesocycle` stays deleted). Its callers, all inside press handlers:

- `PlansScreen.js:319` (`handleRestartPlan`, behind an `appAlert` confirm)
- `PlanDetailScreen.js:139`, `:151` (activate / copy-and-activate)
- `PlanLibraryScreen.js:373` (activate from library)
- `FreeStarterScreen.js:118` (free starter activation)
- `ManualBuilderScreen.js:790` (save built plan)
- `planAutoGen.js:223` (`generateAndSavePlan`), whose callers are
  `HomeScreen.js:1941` (button `onPress`), `ProOnboardingScreen.js`,
  `ProGoalSetupScreen.js`, `PlanUpdateScreen.js` (all user-driven)

No timer, effect, sync path, notification handler or background task calls
it. `pullFromCloud` does not create blocks.

**3. The ledger itself auto-executes nothing.**
`interBlock.js:14-17`: "NOTHING here auto-executes ... every number it
emits is a proposal the user confirms." The longer-recovery window is a
proposal only (`interBlock.js:396-404`, rendered as "Several strain
signals ran together this block, so a longer recovery of about 10 days is
suggested before the next one starts. **Your call.**",
`blockExplain.js:162-165`), and it is *not* auto-applied anywhere.
`computeAndStoreBlockLedger` refuses to run on a live block
(`blockLedgerRunner.js:106-107`, `if (!status.awaitingDecision) return
null`).

**4. Existing pins.**
- `src/__tests__/campaign4.boundaries.test.js:104-112` -
  "BLOCKS and EXERCISES: never automatic": asserts `blockAdvisor.js`
  contains no `autoStart|automaticTransition`, and that
  `BlockShapeCard.js` contains "until you choose what comes next".
- `src/lib/__tests__/blockLifecycle.stage1.test.js:22-48` - a block one,
  three or more weeks past its recovery week stays in
  `completed_awaiting_decision`; the week index never wraps or resets
  (`:49-65`).
- `src/lib/__tests__/interBlock.stage2.test.js:140` - the longer recovery
  is "the PROPOSAL (never auto)".
- `src/lib/__tests__/adaptiveBlock.e2e.test.js:123` - "RESPONSIVE is never
  an auto-add".
- `src/components/__tests__/BlockShapeCard.finished.test.js:43-64` - every
  consumer threads `awaitingDecision` into the finished state.

**Gap worth recording (not a defect):** no test pins that the *only*
callers of `activatePlanWithBlock` are user-initiated. The campaign 4 pin
checks the advisor module for auto-start identifiers, not the call graph.
A phase 40 test could assert that no `useEffect`, timer or sync path
reaches `activatePlanWithBlock`.

### FB-35 CLEAN - double-tap safety on the transition

`PlansScreen.js:296-334`: `restartingRef` guards the confirm handler ("the
seed build is real work; a re-confirmed alert must never run two
activations"), and the `finally` clears it. The confirm dialogue itself
(`:288`) is the explicit user confirmation FB-34 depends on.

### FB-36 FOUNDER-GATED (High) - whether the adaptive block is reachable turns on Pro-gated data

`WeeklyCheckInScreen` is Pro-guarded
(`src/navigation/RootNavigator.js:208`, `withProGuard(...)`). The
advisor's only input is `getRecentCheckins`
(`blockAdvisor.js:261`). Tracing the three real cases:

- **No `weekly_checkins` rows at all** -> `allReadiness` empty ->
  `avgReadiness = 70` (`blockAdvisor.js:177`) -> first branch ->
  **`repeat`**. No ledger rows shown, ledger proposals discarded.
- **Rows exist but energy/soreness are unanswered** -> `checkinReadiness`
  defaults both to 3 and drops the sleep term when `sleepHours` is null
  (`blockAdvisor.js:49-60`), giving exactly **50** -> first branch fails
  (`50 < 60`), second branch passes -> **`adjust`**. This case is real for
  free users: `WorkoutSummaryScreen.js:723-733` writes a
  `weekly_checkins` row containing only `sleepQuality`, tier-blind, on any
  session where the pre-workout sleep question was answered. `sleepQuality`
  is a different column from `sleepHours` and contributes nothing to
  readiness.
- **Pro user with real check-ins averaging >= 60 and no high signals** ->
  **`repeat`**, discarding the ledger (FB-19).

So: a free user who answered the pre-workout sleep prompt reaches
"Continue with adjustments"; a free user who did not reaches "Continue
this plan" forever; a Pro user whose block went well reaches "Continue
this plan". The branch flips on the presence of a placeholder row whose
only real field is not used by the readiness formula, and the "no data"
default (70) produces the *less* personalised outcome while "data present
but empty" (50) produces the *more* personalised one.

Free/Pro gating is absolute and binary under `CLAUDE.md` Section 2, and
which tier reaches the adaptive next block is a tier-scope ruling.
**Documented, never proposed.** The founder needs to decide two separate
things: (a) is the adaptive next block Pro scope or shared scope, and (b)
if shared, the advisor must not depend on Pro-gated data to reach it.
Note that the ledger is already computed for free users today
(`PlansScreen.js:227` passes the real `tier`, and
`blockLedgerRunner.js:174` gates only the adapted-landmarks layer on it),
so the compute happens either way and is then discarded on the repeat
path.

---

## Cross-phase notes

**Nothing in this lane proposes** any AI, any cardio, any new feature,
social or gamification surface, any advanced control in first use, any
change to Article 9 consent, ED or wellbeing semantics, D92-11, billing
architecture or copy, `ONBOARDING_QUIZ_FIRST`, any migration, or any
redesign. Every "proposed minimal fix" above is copy on an existing
surface, a display gate on data already loaded on that screen, or a
navigation target change, except where explicitly marked FOUNDER-GATED
(FB-13, FB-31 remedy, FB-36) or explicitly declined as out of scope
(FB-01's behaviour option).

**ED/wellbeing suppression was checked and is intact throughout this
journey and untouched by every proposal above.** `readSuppression`
(`blockLedgerRunner.js:78-83`) fails closed on a read failure; no upward
carry-over survives suppression anywhere in the ledger
(`interBlock.js:240-245`), the seed chain (`blockSeed.js:102-107`,
`:126`), or the learned range (`learnedRange.js:154-161`); a suppressed
block's recovery week stays flat MEV (`blockSeed.js:114-118`); the block
story and share artefact fall back to a neutral link under calm mode or an
open flag (`WorkoutSummaryScreen.js:1456-1474`); and the run/streak
surfaces suppress under a flag, a positive SCOFF or calm mode, failing
closed on a read error (`useWeeklyStreak.js:113-118`).

**Severity ranking for the lead.** The three that most damage the
first-block journey, in order: FB-19 + FB-31 + FB-36 (the block decision
is made from the wrong data, only one option is shown, and which one is an
accidental tier boundary); FB-15 + FB-16 (the block summary is unreachable
when it matters, and when reached it presents first-ever lifts as
records); FB-01 + FB-02 (the recovery week's instructions contradict each
other and the app reports its own prescription back as a problem).
