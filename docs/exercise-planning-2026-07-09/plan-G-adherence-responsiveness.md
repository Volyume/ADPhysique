# Plan G - Adherence Communication and Over-Performance Responsiveness

Date: 2026-07-09. Planning agent (read-only, no source-code changes). Founder question under
investigation (verbatim, 2026-07-09): "Is there enough communication with the user or enough
feedback to encourage them to use the programme as it follows? We don't want to push them too
hard. We want to be elegant about it... ensure that the engine is actually adequately using
[their logs] and making adjustments based on them if necessary... If they're saying what they're
doing is right and they're performing, but they [progress] faster, then perhaps we need some sort
of modification."

This plan reads the actual engine source (`src/lib/weeklyCoach.js`, `src/lib/coachApply.js`,
`src/lib/mesocycle.js`, `src/lib/planEngine.js`, `src/lib/coachingGoals.js`,
`src/lib/algorithms.js`), the live check-in derivation (`src/lib/checkinDerive.js`,
`src/screens/WeeklyCheckInScreen.js`), the coach response/register layer
(`src/lib/coachResponse.js`, `src/lib/coachRegister.js`), and the consistency/streak surfaces
(`src/lib/streak.js`, `src/components/StreakWeeksSection.js`), rather than summarising them. No
code changes accompany this document.

---

## 0. Headline finding, before the detail

The engine already has TWO separate, deterministic mechanisms that respond to over-performance
today, both driven by logged reps/load/completion data, neither of them fabricated for this plan:

1. **Per-exercise, per-session**: a double-progression load suggestion
   (`src/lib/algorithms.js:295-365` `getProgressionSuggestion`, `:368-490` `computeSetTargets`)
   that raises the suggested weight for the next session whenever logged reps hit the top of the
   prescribed rep band, live in `ActiveWorkoutScreen.js:1071-1080`.
2. **Per-muscle, per-week**: an autoregulation matrix
   (`src/lib/weeklyCoach.js:170-203`) that turns logged session completion, logged PR count, and
   an auto-derived training-performance verdict into a `volumeSignal` of `-2..+3` sets per muscle
   group, confirmed-then-applied via `computeVolumeApply` (`src/lib/coachApply.js:283-307`) at
   `CoachOutputScreen.js:1091-1096`.

What is genuinely missing is a **multi-week escalation path**: the calorie side already has a
"sustained signal" gate (`consecutiveOffTargetWeeks`, `weeklyCoach.js:401,767`) that requires the
trend to be off-target for 2-3 weeks running before it moves the target further; the training
side has no equivalent "N weeks of exceeded performance in a row" concept. Every week's
`volumeSignal` is computed fresh from that single week's recovery + performance read
(`weeklyCoach.js:693-695`), with no memory of a sustained pattern. This is the exact shape of gap
the founder is describing, and section 3 below identifies where it would attach.

---

## 1. Does the engine respond to over-performance? Yes, at two levels, both logged-data-driven

### 1.1 Per-exercise: the double-progression load suggestion (already live, already reps/load-only)

`src/lib/algorithms.js:295-365`, `getProgressionSuggestion(currentSets, prevWorkoutSets,
targetRepsMin, targetRepsMax, units)`:

- Computes `prevAvgReps` and `prevAvgWeight` from the previous logged workout's sets
  (`:303-308`).
- Gates the load-increase branch on "headroom", read from each set's stored `rir` field
  (`:312-315` `ratedSets = prevWorkoutSets.filter(s => s.rir != null)`, `prevAvgRIR`).
- If `prevAvgReps >= max` (hit or beat the top of the prescribed rep range) and `prevAvgRIR >= 1`,
  it returns `action: 'increase_weight'` with a computed increment (`:326-341`).

**The constraint the task flagged is confirmed in code**: `src/screens/ActiveWorkoutScreen.js:60`
`const DEFAULT_SET = { weight: '', reps: 8, setType: 'straight', notes: '', rir: 2 };`. Every
logged set carries a fixed `rir: 2`, not a real user-entered value (there is no RIR/RPE picker in
the logging UI; grepping `ActiveWorkoutScreen.js` for `rir` finds only this default and
pass-through reads, never an input control). Because the fixed value is `2` (`>= 1`), the
"headroom" check is **always true** for every logged set. Net effect: this progression path
already fires purely off logged reps and weight, every time a set reaches the top of its
prescribed rep range, with a 5%-of-load session cap (`:417-426` `maxJump = prevWeight * 0.05`).
This satisfies "work within logged reps/load/completion signals" without reintroducing RIR
capture, because the fixed constant means RIR was never really gating it in the first place.

The week-by-week version of the same idea, `computeSetTargets` (`:368-490`), does the identical
thing per set with a second pass that anchors every set's target to the session's best logged set
(`:466-490`), and applies a returning-from-layoff dampener (`:456-461`). Both are wired live at
`ActiveWorkoutScreen.js:1071-1080`, shown to the user as the suggested weight for their next
session.

**Verdict for 1.1**: over-performance at the single-exercise, single-session level is already
detected and already accelerates the plan (a higher suggested weight next time), deterministically
and continuously, with no multi-week lag.

### 1.2 Per-muscle, per-week: the autoregulation matrix

`src/lib/weeklyCoach.js:170-203`:

- `getRecoveryScore(energyScore, sorenessScore, stressScore)` (`:151-167`) maps the logged
  check-in energy/soreness/stress to a 1-4 recovery score.
- `getPerformanceScore(sessionAdherence, prsThisWeek, trainingPerformance)` (`:173-178`) returns
  its best score (1, "exceeded") when `trainingPerformance === 'exceeded'` **or** `prsThisWeek > 0
  && sessionAdherence >= 0.9`, meaning it can fire purely from logged data with no self-report at
  all.
- `autoregulationMatrix(recoveryScore, performanceScore)` (`:185-203`) returns a `volumeDelta` of
  `-2` (deload), `0` (hold), `1`, `2`, or `3` (push), and a `trainingSignal` of
  `reduce`/`hold`/`push`.

**`prsThisWeek` is not a vague signal, it is a logged-load-and-reps count.** It comes from
`computePRsPerWeek` (`src/hooks/useProgressData.js:23-60`), which walks every logged set,
computes an estimated 1RM from `s.weight` and `s.actualReps` via `calculate1RM(w, r)`, and counts
a new running-max event per exercise per week (`:36-50`). This is fed to `runWeeklyCoach` as
`prsThisWeek` (surfaced on the coach output at `CoachOutputScreen.js:1490`).

**`trainingPerformance` (`'exceeded' | 'hit' | 'struggled' | 'dropped'`) is also logged-data-first,
not a free-form subjective rating.** `src/lib/checkinDerive.js:54-64` `deriveTrainingPerformance
({ completed, planned, prs, volDeltaPct })` computes it from completed/planned session ratio, the
same PR count, and a logged planned-vs-actual weekly volume delta (`volDeltaPct`), and
`WeeklyCheckInScreen.js:421-426,477-478` pre-fills the check-in card with this derived verdict
("Pre-filled from your logged sessions. Tap a different option if it feels wrong.",
`WeeklyCheckInScreen.js:1105-1107`). A user can override it with a tap, but the default the coach
actually receives is computed from logs, not typed freely.

`volumeSignal` reaches the confirm-then-apply UI as `output.volumeSignal`
(`weeklyCoach.js:1452-1453`) and `output.adjustments.training.note` (via `getTrainingNote`,
`src/lib/coachingGoals.js:614-681`, goal-specific copy, e.g. push-high copy at `:653-666`:
"Recovery is excellent and performance is climbing. A great window to add a set where you feel
strong."). `CoachOutputScreen.js:1085-1101` renders it as a card ("Add N sets to each muscle
group") the user taps Apply on; `handleApplyTraining` (`:1088-1100`) calls `computeVolumeApply`
(`coachApply.js:283-307`), which clamps every muscle to its own `[mev, mrv]`
(`coachApply.js:288-296`, falling back to `ABSOLUTE_WEEKLY_SET_CEILING = 30` when a row lacks
both, `:48`), so a push can never exceed recoverable volume.

**A genuine safety cap that also protects against over-eager progression**: joint pain or an
illness/injury note caps the push at hold, never lets safety concerns turn into extra volume
(`weeklyCoach.js:706-716`).

**Verdict for 1.2**: the founder's exact "did what they said, and performed" case is already the
`performanceScore === 1` (exceeded) path, and it already produces up to +3 sets per muscle group
that week (`autoregulationMatrix`, recovery 1 + performance 1 gives `volumeDelta: 3`), gated by
MRV, confirmed by the user before it writes anything.

### 1.3 What it can move, what it cannot, and the one dimension that is genuinely fixed regardless of performance

**Can move** (via the mechanisms above): per-set suggested load (1.1); per-muscle weekly set
count, `-2..+3`, MRV-clamped (1.2); via the separate off-target-trend path (`weeklyCoach.js:724-
900`, not re-audited here as it is unrelated to training over-performance), calorie target,
gated by `consecutiveOffTargetWeeks` and the sex-aware floor.

**Cannot move, by design, regardless of how much a user over-performs**:

- **Calorie floors** (`KCAL_FLOOR = 1200`, `KCAL_FLOOR_MALE = 1500`, `coachApply.js:29-30`). No
  training signal reaches this code path at all; training and nutrition are separate branches in
  `runWeeklyCoach`.
- **The fixed `rir: 2` per set never changes.** This plan does not propose it should; the
  founder settled RIR/RPE removal and this plan works within that.
- **The mesocycle week schedule itself.** `src/lib/mesocycle.js:154-160` `buildWeeklyProgression`
  and `:101-110` `getWeekSetsMultiplier` read a fixed per-experience schedule
  (`getMesoSchedule(experience)`) of week-by-week set multipliers; nothing in this plan's
  investigation found a path that shortens a block, lengthens it, or advances start-of-block MEV
  targets faster because a user is over-performing. The only week-schedule move available is
  **earlier**, never faster/longer: a second poor-recovery signal can bring the scheduled deload
  forward (`matrixDeload`, `weeklyCoach.js:699`, requires `consecutivePoorRecoveryWeeks >= 1`), and
  a separate, only-partially-wired autoregulation reader (`evaluateAutoReg`/`predictDeloadWeek`,
  `mesocycle.js:189-333`, live only in `MesocycleBuilderScreen.js:123-125`, using a DIFFERENT
  per-session 1-5 self-report feedback shape: `sessionDifficulty`, `overallPump`,
  `soreness24hBefore`, `fatigueLevel`, `jointDiscomfort`, not logged reps/load) can also only
  pull a deload earlier or hold; its best positive-signal message is qualitative ("Recovery is
  excellent. Stay on track and add a set where sessions feel short.", `mesocycle.js:259`), not a
  numeric acceleration.
- **No consecutive-over-performance memory.** Unlike `consecutiveOffTargetWeeks`
  (`weeklyCoach.js:401,767`, gates a bigger calorie move after a sustained trend) and
  `consecutivePoorRecoveryWeeks` (`:402,699,1080`, gates the deload), there is no
  `consecutiveExceededWeeks`-shaped counter anywhere in `weeklyCoach.js`. Grepping the file for
  `consecutive` (`:372-373,401-402,699,734,767,1080,1274-1275`) finds only the off-target and
  poor-recovery counters. Three, five, or ten weeks running of `performanceScore === 1` with
  `excellentRec` compute the exact same single-week matrix lookup each time
  (`weeklyCoach.js:693-695`); nothing escalates, compounds, or even names the streak in the copy
  library (`WHY_LIBRARY.push_volume`, `weeklyCoach.js:299-301`, is a single generic line, used
  identically on week 1 of a push signal and week 10).

**Answer to the founder's specific "if they're performing faster, do we modify" question**: yes,
today, every week, at the per-muscle set-count level (1.2) and continuously at the per-exercise
load level (1.1). But there is no mechanism that recognises "this has now been true for several
weeks running" and does anything more than repeat the same single-week push. If the founder's
mental model is "the plan should structurally accelerate" (e.g. move a user into harder programming
sooner, not just add a set this week), that mechanism does not exist; section 3 identifies where a
bounded version of it could attach.

---

## 2. Is the benefit of following the programme explained to the user?

### 2.1 Where the "why" already exists

- **`src/components/ReadinessCards.js:182`**, an `InfoTooltip` on the milestone card (shown on
  the Progress tab, `ConsistencyScreen.js`): *"Consistency is the biggest predictor of long-term
  progress. The more sessions you log, the better Volyume understands how your body responds, so
  it can suggest the right weights, spot when your reps are slipping, and time your lighter weeks
  correctly. Building the habit is the foundation everything else sits on."* This is a genuine,
  specific, mechanism-honest benefit statement (it correctly describes 1.1/1.2 above), but it
  requires a tap on an info icon on a card that only shows when a milestone is upcoming
  (`ReadinessCards.js:170-192`), on a screen (Progress/Consistency) a user must already have
  navigated to. It is not proactively surfaced.
- **The weigh-in "sharpens the read" family**: `coachResponse.js:163` ("Not enough weigh-ins for a
  weekly trend read yet. The trend sharpens with daily logs."), `:246` ("Log your morning weight
  each day this week. Every log sharpens the read."), and the identical line in `coachRegister.js:
  192`. These explain why logging weight matters, each time it is thin, inline in the coach
  output the user is already reading, a stronger placement than the tooltip above, but scoped
  only to weigh-ins, not to session/programme adherence generally.
- **The session-adherence cue itself carries a why**: `coachResponse.js:256` "Get all N sessions
  in this week. **Consistency moves the plan more than any single change.**" Stated plainly,
  inline, exactly when it is relevant (sessions were missed that week).
- **`FreeStarterScreen.js:165`**: "Pick what fits your week. Consistency beats volume." A
  free-tier onboarding-adjacent line, but general encouragement rather than an explanation of what
  following the plan specifically earns the user (no mention of the coach reading logs, adjusting
  targets, etc.).

### 2.2 The gap, stated precisely

No onboarding surface (`ProOnboardingScreen.js` grepped for consistency/adherence-benefit copy,
`:51,158-160,1712` are all unrelated experience-level or recovery-reminder strings, not an
adherence-benefit pitch) tells a new Pro user, once, up front, *why* logging matters to what the
coach can do for them (i.e. what `ReadinessCards.js:182` says, but at the moment they first meet
Precision Coaching, not tucked behind an info icon three screens later). This mirrors exactly the
gap plan-E found for progress photos (`plan-E-progress-photos-loop.md` section 1, "the benefit is
never explained... only encountered by users who already opened Progress Photos"): the app is
disciplined about SHOWING the mechanism working (T8, "sharpens the read", the confirm-then-apply
cards) but under-invests in explaining the mechanism ONCE, proactively, before it happens.

### 2.3 Positive, calm feedback when adherence is high, confirmed, and correctly not shame-inverted when it is not

- **`src/lib/streak.js`** and **`src/components/StreakWeeksSection.js`** implement "weeks
  running" (never the word "streak" in copy, `StreakWeeksSection.js:10`), CVD-safe glyphs with no
  red/cross (`:29-43`), a bridging "repair" mechanic so a single missed week does not break a run
  (`streak.js:44-61`), and full suppression under an open ED/wellbeing flag
  (`StreakWeeksSection.js:54` `if (!vm || !vm.render || vm.suppressed) return null;`,
  `streak.js:20-21,37`). A missed week reads as "Quiet week" on the glyph key
  (`StreakWeeksSection.js:30-35`), never "missed" or "failed" in copy.
- **T8 exists exactly as the founder question named it**: `src/lib/coachResponse.js:117-122`
  *"// T8: a fully quiet week is acknowledged calmly, never as a failure (band-not-chain)... A
  quieter week. Your plan is ready whenever you are."* Suppressed under calm mode/open ED flag
  like the rest of the training-encouragement surface (`:120` `if (!suppress && completed === 0)`).
- **High adherence gets a calm, data-referenced acknowledgement, not a cheer**: `buildAcknowledgement`
  (`coachResponse.js:76-125`) names sessions trained, PRs, and weigh-in count when strong (`:85-
  106`); every clause is "a mirror of logged data" (module header, `:66-75`), by the file's own
  documented honesty test ("would this still be true if the user did nothing but kept logging?",
  `:17-18`). No streak-at-risk language, no exclamation marks, no praise disconnected from a
  number (confirmed structurally: every branch in `buildAcknowledgement` requires a real logged
  count before returning a string; there is no generic "great job" fallback).

### 2.4 Suppression scope check (task item 4's specific ask)

Confirmed against `coachResponse.js`'s `buildCue` (`:235-282`): items 2 (sleep), 3 (missed
sessions), 4 (joint pain) fire **regardless of `suppress`**. These are training-performance-only
cues and correctly carry no ED/calm-mode gate. Only items 1 (thin weigh-in data), 5 (untracked
calories), and 6's `'over'` branch (calorie adherence) are gated by `suppress`, because they are
weight/food-adjacent (module header, `:23-27`, "no cue asks for daily weighing or tighter food
control"). The training-volume push card (section 1.2) itself carries no suppression gate in
`CoachOutputScreen.js`'s `TrainingNextWeekCard`, confirmed correct, since a pure sets/muscle-group
recommendation is training-performance-only, not weight-adjacent; nothing in this plan found it
gated, and nothing in this plan proposes gating it, since doing so would not match the pattern the
codebase already applies consistently (gate weight/food cues, not training-only ones).

---

## 3. Gap analysis: where would an over-performance ESCALATION signal attach

Given section 1's finding (weekly push signal exists; multi-week escalation does not), the
D8/plan-F-style attachment point, if the founder wants one, is narrow and specific:

### 3.1 The exact attachment point

A new counter, `consecutiveExceededWeeks`, computed and threaded through `runWeeklyCoach` exactly
like the existing `consecutiveOffTargetWeeks` and `consecutivePoorRecoveryWeeks`
(`weeklyCoach.js:401-402`): incremented when `performanceScore === 1` (the "exceeded" read,
`getPerformanceScore`, `:173-178`) and `recoveryScore <= 2` (matches the matrix's own "both at 1
or 2" push branches, `:194-202`) holds for a second (or third) week running, reset otherwise. This
mirrors the existing pattern exactly: a NEW, explicit, named, typed input to the existing pure
function, not a rewrite of it.

### 3.2 What it would be allowed to move (bounded, by the same reasoning as plan-F section 2.2)

Two structurally different options, same shape as plan-F's (a)/(b) split:

**(a) Escalate within the EXISTING autoregulation output, never past its existing ceiling.** When
`consecutiveExceededWeeks >= 2` (or 3, a founder-set threshold) and the matrix's own read this week
is already `push` (`volumeDelta >= 1`), let the sustained signal raise `volumeDelta` by exactly one
additional step for that single week only (e.g. `+1` becomes `+2`), **never past the matrix's own
existing `+3` ceiling**, and never bypassing the downstream `[mev, mrv]` clamp in
`computeVolumeApply` (`coachApply.js:288-296`) which already caps any push at the muscle's
recoverable ceiling regardless of the signal's raw size. This changes nothing about determinism (a
new named input, same-input-same-output); it only narrows the "no sustained-signal memory" gap
identified in section 1.3, using the exact ceiling the safety clamp already enforces.

**(b) Never move a number; only NAME the pattern, calmly, in the existing copy.** Add a
`WHY_LIBRARY` entry (mirroring `push_volume`, `weeklyCoach.js:299-301`) that fires only when
`consecutiveExceededWeeks >= 2` and reads something like "Recovery and performance have both
looked strong for a few weeks running, so the plan keeps adding where it can", same
`getTrainingNote`-style register, same tone, but the SET COUNT this week is exactly what the
matrix would have produced anyway (no numeric change). This is the receipt-only equivalent of
plan-F's option (a): zero engine-output risk, pure acknowledgement of a pattern that already
exists in the logged data.

**What neither option touches**: calorie floors, ED gates, safe-loss caps, session time budget,
tier-blindness (the guardrail modules never consult tier per `proGate.js:22`, unaffected either
way), or determinism (both are new, explicit, bounded inputs; same inputs still produce the same
outputs).

### 3.3 What this plan does NOT propose

- No change to `computeVolumeApply`'s clamp logic itself (`coachApply.js:283-307`). The MRV
  ceiling stays exactly as strict.
- No mesocycle-length or block-advancement acceleration (section 1.3's "genuinely fixed"
  schedule). That would be a materially larger architecture change (shortening/lengthening a
  planned block mid-stream) this plan does not scope, because nothing in the codebase today reads
  performance data into block length at all, and inventing that mechanism is a bigger fork than
  the founder's question asked for.
- No reintroduction of RIR/RPE capture. Section 1.1 already shows the fixed `rir: 2` makes the
  per-exercise load-progression path behave as a reps-and-load-only mechanism today; this plan
  works entirely within that, per the founder's standing decision.

---

## 4. Communication design: how a finding like this would be told

Whichever of 3.2(a)/(b) the founder chooses (or neither), the register is already fully specified
by the existing pattern and needs no new invention:

- **Locked voice**: `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`, "your coach" register, no em
  dashes, mirror-data-not-inferred-state (`coachResponse.js:17-19` "Mirror data, never infer
  state. Numbers before narrative.").
- **No streak/shame framing**: the sustained-pattern copy in 3.2(b) must read like the existing
  `push_volume` line (`weeklyCoach.js:300`, "Recovery and performance both look clean, so there's
  more work in the plan"), a description of what the data shows, never "you're on a streak" or
  "don't break it now" language. `StreakWeeksSection.js`'s ban on the word "streak" itself
  (`:10`) is the house style to match.
- **Suppression**: per section 2.4, a training-performance-only surface (which both 3.2(a) and
  3.2(b) are; no weight, no food, no appearance content) needs **no** ED/calm-mode suppression,
  matching the existing unsuppressed training-volume card and cues 2-4 in `buildCue`. This plan
  finds no reason to add a suppression gate here; doing so would be inconsistent with how the
  codebase already treats every other training-only signal.
- **Confirm-then-apply, not silent**: whatever moves (option (a)), it must render through the
  exact same `TrainingNextWeekCard` confirm-then-apply pattern (`CoachOutputScreen.js:319-335,
  1085-1101`) already used for every other training-volume change; the user still taps Apply,
  nothing here proposes a silent write.
- **Where the "why it matters" gap (section 2.2) would be fixed**, independent of 3.2: the
  existing `ReadinessCards.js:182` tooltip copy is accurate and complete, but as documented it is
  reachable only via a tap on a milestone card on the Progress tab. Surfacing that same sentence
  (or a shorter version of it) once, proactively, at Pro-onboarding or on first reaching
  `CoachOutputScreen` would close the gap plan-E already identified for photos and this plan
  confirms exists for training/nutrition adherence generally.

---

## 5. Founder questions

1. **Multi-week over-performance escalation (section 3)**. Today the engine re-reads a fresh
   single-week signal every week with no memory of a sustained pattern; the calorie side has this
   memory (`consecutiveOffTargetWeeks`) and the training side does not.
   a) Build 3.2(a): a bounded, one-step escalation of the existing `volumeSignal` after N
      (founder-set, e.g. 2 or 3) consecutive exceeded-performance weeks, still capped by the
      existing MRV clamp and still confirm-then-apply.
   b) Build 3.2(b) only: name the sustained pattern in copy, move no numbers.
   c) Build both: (b) always renders, (a) additionally moves the number when eligible.
   d) Leave as built; confirm today's single-week autoregulation matrix (section 1.2) is a
      sufficient answer to "does the engine respond to over-performance" and do nothing further.
   e) Something else, specify.

2. **Consecutive-exceeded threshold, if 1(a) or 1(c) is chosen**. What should `N` be before the
   escalation fires?
   a) 2 consecutive weeks.
   b) 3 consecutive weeks (matches the existing high-confidence `offTargetWeeksRequired` bar,
      `weeklyCoach.js:729`).
   c) Something else, specify.

3. **The "why adherence matters" proactive gap (sections 2.2/4)**. The accurate benefit sentence
   already exists (`ReadinessCards.js:182`) but is reachable only via an info-icon tap on the
   Progress tab.
   a) Surface a version of this sentence once, proactively, during Pro onboarding.
   b) Surface it once, proactively, the first time a user reaches `CoachOutputScreen` with a real
      (non-baseline) output.
   c) Both (a) and (b).
   d) Leave as-is; the tooltip plus the inline "sharpens the read"/"consistency moves the plan"
      cues (section 2.1) are judged sufficient.
   e) Something else, specify.

4. **Mesocycle/block-level acceleration (section 3.3)**. This plan explicitly did not scope
   shortening or advancing a planned block based on performance, because no existing mechanism
   reads performance into block length at all and building one is a materially larger change than
   a bounded weekly-signal escalation.
   a) Commission a separate, dedicated plan to investigate block-length/advancement acceleration,
      if the founder's intent extends that far.
   b) Confirm this stays out of scope; section 3's weekly-signal-level escalation is the intended
      ceiling for now.
   c) Something else, specify.
