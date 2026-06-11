# COMP-008 — Survey Diet + Fast Check-In

Implementation blueprint. Competitive audit 2026-06-10.
Status: ready to build. Effort estimate: 3.5 (re-confirmed below).
Branch: claude/main-branch-content-update-dcqicf. British English throughout.

Note on the shared brief: `impl-00-shared-brief.md` did not exist in the repo at
write time (the `competitive-audit-2026-06-10` tree was lost in the container
reset and this is the first file rebuilding it). This document follows the
nine-section house structure the brief specifies and stands alone until the
brief is re-created.

---

## 0. The problem in one line

We ask a tired person seven questions when the session is over, when the body
is the least reliable it will be all day, and the answers change nothing they
can feel. Cut the post-workout block to the three things that can only be
captured there, move the three that belong before training to where they are
accurate, and turn the weekly check-in into something a consistent logger earns
their way out of.

---

## 1. Best in market — the bar

The bar to beat is not the longest survey, it is the one people actually finish.

- **Whoop Journal** is the clearest reference for the *survey-diet* half. Whoop
  could ask 300+ behaviours; it deliberately shows each member a short,
  personalised list and a one-swipe yes/no card per item, fired automatically
  the morning after sleep is processed. The discipline is the point: a small,
  consistent set of questions beats a comprehensive one that gets abandoned in
  week two. Whoop also enforces a data-quality floor (a behaviour needs 5 yes
  and 5 no inside 90 days before it will claim an "impact"), which is the honest
  version of "we only ask what we can use".
- **JuggernautAI session-open readiness** is the closest direct competitor and
  the better reference for the *capture-point* half: it asks readiness questions
  at session open, not session close, and feeds soreness and daily stress
  straight into that day's prescription. That is the right instinct, executed
  with the wrong vocabulary.

We take Whoop's restraint (ask less, ask only what pays off) and JuggernautAI's
timing (ask the readiness questions before the work, not after), and we drop
both their weaknesses (Whoop's no-payoff journaling, Juggernaut's jargon).

## 2. Where the field fails

- **Wrong capture point.** Soreness coming in, sleep last night, and energy
  today describe the state the lifter walked in with. Asking them after a
  session forces retrospective recall through a layer of fatigue. The research
  is consistent: retrospective physical-activity recall overstates and drifts
  (one study overstated moderate activity by ~42 min/day, vigorous by ~39),
  and concurrent capture out-collects retrospective capture (concurrent
  response rates 65–74% vs 43–51% for single retrospective modes). A question
  asked at the moment it is true is both more accurate and more likely to be
  answered.
- **Survey length kills completion.** The Tiny-Habits finding holds for health
  apps: a 5-second log gets done daily, a 5-minute journal is abandoned. Seven
  rating rows after a workout is the 5-minute journal.
- **No same-session payoff.** JuggernautAI's weakness is that the readiness
  answers feel like a toll booth, not a benefit; Whoop's is that journaling can
  feel like data entry for a correlation you may never see. If answering does
  not visibly change what happens next, the answer rate decays.
- **Jargon.** Readiness scores, RPE, RIR, MEV/MRV language on a consumer
  pre-session prompt reads as homework. None of it survives into our copy.

## 3. User psychology

- **Concurrent beats retrospective** for both accuracy and completion. Capture
  each fact where it is true: readiness before, session response after.
- **Effort must be tiny and the payoff must be felt.** The pre-workout prompt
  must stay a single tap that visibly tunes today's session, never a form.
- **Loss aversion and earned status drive return visits.** Users are ~2.3x more
  likely to engage daily once a 7-day streak exists. Fast Check-In leans on this
  honestly: it is a *reward for the lifter who already logged consistently all
  week*, not a shortcut that lets a non-logger skip the work. The full check-in
  remains the path for anyone whose week has gaps, because the coaching maths
  needs that data to be safe.
- **Skipping must never be punished.** A pre-session prompt that blocks the
  start, or asks "are you sure?", becomes a gate. The failure mode is the prompt
  turning into friction in front of the one action we most want (starting to
  train). Skip stays bottom, single tap, no confirmation, always.

## 4. The Volyume implementation

### 4.1 The seven questions today (verified in code)

`src/screens/WorkoutSummaryScreen.js` renders **seven** `RatingRow`s plus a notes
field (lines 736–751), driven by `FEEDBACK_SCALES` (lines 26–32) and the
`feedback` state defaults (lines 80–86):

1. `sessionDifficulty` (Difficulty, 1–5)
2. `overallPump` (Muscle engagement, 1–3)
3. `soreness24hBefore` (Soreness coming in, 1–3)
4. `fatigueLevel` (Fatigue, 1–5)
5. `jointDiscomfort` (Joint discomfort, 0–3)
6. `energyScore` (Energy today, 1–5)
7. `sleepQuality` (Sleep last night, 1–5)

> Correction vs the prior skeleton: the prior conclusion listed "3 remain / 3
> move" and named only six fields. The seventh is `fatigueLevel`. The brief's
> "7→3" is right on the count, but the disposition is **3 remain, 3 move,
> 1 stays-as-is**, covered below.

### 4.2 What stays post-workout (3 of the 7)

Keep the three that can only be judged once the work is done:

- `sessionDifficulty` — how hard the session actually was. Concurrent by
  definition; you cannot answer it before.
- `overallPump` (relabelled in UI as "Muscle engagement") — a response to the
  session just completed.
- `jointDiscomfort` — joint signal from the work just done; load-bearing for
  the safety layer and the per-session adaptive engine.

These three keep the adaptive-engine mapping intact. The engine
(`WorkoutSummaryScreen.js` lines 218–245) maps `soreness`, `performance`,
`pump`, `joint` into `runAdaptiveEngine`. After the move, `performance` comes
from the retained `sessionDifficulty`, `pump` from retained `overallPump`,
`joint` from retained `jointDiscomfort`, and **`soreness` is sourced from the
pre-workout answer on the workout row** (see 4.4) instead of the post-workout
rating. No engine signal is lost; one of its four inputs simply now arrives from
a more accurate capture point.

### 4.3 The fourth: `fatigueLevel` stays where it is

`fatigueLevel` is a genuine end-of-session readout (how spent you are now), and
it is read downstream by `getRecentWorkoutFeedback` (`src/lib/database.js`
line 5667 — selects `fatigue_level, session_difficulty, overall_pump`) and by
`buildCoachBrief` (in `src/screens/HomeScreen.js`, the "Fatigue building" rule,
lines 1507–1518, averaging the last two sessions' `fatigueLevel`). It is not a
walked-in-with fact, so it neither moves to pre-workout nor gets dropped. It
remains the fourth post-workout row.

> So the post-workout block goes from seven rows to **four** (the three above +
> fatigue + notes), not three. The "diet" is removing the three that were
> always mis-placed. If product wants a strict three-question post-workout
> block, the only candidate to also move is `fatigueLevel`, but that breaks
> `getRecentWorkoutFeedback`/`buildCoachBrief` and is out of scope for COMP-008.

### 4.4 What moves to pre-workout (3 of the 7) and how it is shown

Move the three walked-in-with facts to the existing **pre-workout intent prompt**
on the Home screen (`src/screens/HomeScreen.js`, the `showIntentPrompt` Modal,
title at line 1453, "How are you feeling today?"):

- `soreness24hBefore` (Soreness coming in)
- `sleepQuality` (Sleep last night)
- `energyScore` (Energy today)

Today that modal captures a single `intent` (`sharp` / `average` / `below_par`
/ null) and nothing else. We keep that top-level intent tap exactly as is and
add the three facts beneath it, displayed to match the existing
`intentOption`/chip pattern, not as a seven-point slider:

- Render each as a compact three-chip row (low / middle / high), reusing the
  modal's existing option styling so it reads as one short sheet, not a form.
- The three rows are **optional**. The top intent tap (or Skip) still starts the
  session immediately; the chips are a quick tune for those who want it.
- **Skip stays at the bottom, single tap, no confirmation** (`confirmStart(null)`
  at line 1480 is unchanged in behaviour).

Because these now sit before the work, the post-workout `FEEDBACK_SCALES`
entries for `soreness24hBefore`, `sleepQuality`, and `energyScore` and their
three `RatingRow`s (lines 738, 741, 742) are removed from the summary.

### 4.5 Fast Check-In path — what it is and what "all derived values green" means

Fast Check-In is **not a new screen**. It is an alternate render path inside
`WeeklyCheckInScreen.js`, slotted alongside the existing gate-state screens
(`'loading' | 'wrong_day' | 'too_soon' | 'need_weights' | 'open' | 'load_error'`,
declared at line 227; gate screens render from line 1027). We add a single
branch: when the week's inputs are already complete and consistent, render a
one-confirm summary instead of the four-step form.

The four-step form is unchanged (`TOTAL_STEPS = 4`, line 214; step gating in
`stepCanAdvance`, lines 535–541). Fast Check-In sits in front of it and submits
the same `saveWeeklyCheckin` payload (lines 551–578).

**"All derived values green"** means the same auto-derivation the form already
runs in `load()` has produced a confident, non-null value for every input the
weekly coach needs, so there is nothing left to ask:

- `energyScore`, `sorenessScore`, `trainingPerformance` — the three the form's
  `stepCanAdvance` requires (steps 0, 2, 3). `trainingPerformance` is already
  auto-derived by `deriveTrainingPerformance` (lines 84+) from real session
  data (adherence, PRs, week-over-week volume).
- `calsAdherence` — derived green only when food was actually logged this week
  and the rollup gives a clear on/under/over verdict (the form's
  `autoDerived.calsMeta` path, lines 760–763). "Didn't track" is **not** green.
- `stepsAvg` — green only when `stepsSummary.registered` is true (4+ days
  tracked, lines 796–812), or steps are disabled for the user.
- `cardioAdherence` — green only when a cardio prescription exists and the log
  produced a verdict (`cardioComplianceFromLog`, line 267); otherwise not
  applicable and does not block.
- Weight trend — the `need_weights` gate already requires `MIN_WEIGH_INS = 3`
  readings (line 37); Fast Check-In additionally requires the trend to be
  computable.

If **any** required value is null, untracked, or low-confidence, Fast Check-In
does not offer and the user gets the normal four-step form. This is the reward
mechanic: the lifter who logged weight, food, and sessions all week has already
told us everything, so they confirm one card; the lifter with gaps fills them
in. It is earned, never a bypass.

### 4.6 States

Pre-workout prompt:
- Default: intent options + three optional chip rows, Skip at bottom.
- Skipped: `confirmStart(null)`, session starts, no values written. No nag.
- Answered: values flow through `confirmStart` → `createWorkout` to the workout
  row (see section 9).

Fast Check-In:
- Not offered (any value not green) → existing four-step form.
- Offered → single summary card listing the derived values in plain language,
  one "Confirm" button, and one "Review answers" link that drops into the full
  four-step form pre-filled (the form already pre-selects derived values, lines
  475–496).
- Confirmed → identical `saveWeeklyCheckin` call and post-submit flow (reminder
  reschedule, coach-ready notification, navigate to CoachOutput) as the form.

### 4.7 Copy (house voice — British English, no jargon, no em dashes)

Pre-workout sheet (keep existing title and sub, lines 1453–1454):
- Title: "How are you feeling today?"
- Sub: "Takes a second. Helps us read your sessions better over time."
- Chip-row labels: "Soreness coming in", "Sleep last night", "Energy today",
  each with low / middle / high chips.

Fast Check-In card:
- "Your week is already logged. Here is what we have."
- "Everything looks complete, so there is nothing to fill in. Confirm and your
  coaching updates for next week."
- Secondary link: "Review my answers first".

## 5. Whole-package integration

- **COMP-015 — hard dependency, and COMP-008 ships first.** COMP-015 (the
  pre-session readiness adjustment that nudges today's prescription) cannot fire
  until `soreness24hBefore` is captured *before* the session and written to the
  workout row. COMP-008 is what relocates that capture and adds the column.
  Sequencing is fixed: COMP-008 lands the pre-workout capture and schema first;
  COMP-015 builds on the populated column afterwards. Shipping COMP-015 before
  COMP-008 would have no pre-session soreness to read.
- **COMP-023.** The Fast Check-In branch and the survey diet both reduce
  surface area and answer count; COMP-023 (broader streak / consistency
  surfacing) should treat consistent logging as the thing that *unlocks* Fast
  Check-In, keeping a single consistency signal across both features rather than
  two competing counters.
- **Adaptive engine + coach brief.** Verified untouched in signal: the
  post-workout engine still receives soreness/performance/pump/joint;
  `getRecentWorkoutFeedback` and `buildCoachBrief` still read
  `fatigueLevel`/`sessionDifficulty`/`overallPump`, all of which remain captured.
- **Weekly coach nullable inputs.** `src/lib/weeklyCoach.js` already treats its
  inputs as nullable (recovery-score defaults, EWMA guards returning null
  throughout). Fast Check-In only ever submits green (non-null) values, so it
  strictly narrows, never widens, the null surface the coach already tolerates.

## 6. Retention and word of mouth

- Shorter post-workout block lifts completion, which lifts the data quality the
  coaching depends on, which makes the coaching visibly better, which is what
  gets recommended.
- Fast Check-In rewards the consistent logger with a one-tap week, reinforcing a
  7-day-plus streak where loss aversion does the retention work for us.
- The pre-workout tune that visibly shapes today's session (via COMP-015) is the
  felt payoff Whoop and Juggernaut both lack; "it actually changed my session"
  is a sharable line.

## 7. Beating the benchmark vs Whoop

- Whoop journaling is retrospective and pays off only as a long-run correlation
  ("this behaviour tends to affect recovery"). Ours pays off *today*: the
  pre-session answers tune the very next session through COMP-015.
- Whoop asks the morning after sleep, decoupled from action. We ask soreness,
  sleep, and energy at the moment of starting to train, when they are both true
  and useful.
- We keep Whoop's discipline (ask only what we will use) and add an immediate
  feedback loop Whoop does not have at the journaling layer.

## 8. Measurement (2–4 metrics)

1. **Post-workout feedback completion rate** — share of completed sessions where
   the (now four-row) block is filled. Expect up from the seven-row baseline.
2. **Pre-workout answer rate** — share of session starts where at least one of
   the three chip rows is answered (and the share that Skip outright). Skip-heavy
   is fine; a falling *start* rate after a session is the alarm (gate regression).
3. **Fast Check-In eligibility and take rate** — share of weeks that qualify
   (all green) and, of those, the share confirmed via the fast path vs dropping
   into the full form.
4. **Weekly check-in completion / time-to-complete** — overall completion should
   hold or rise while median completion time falls for eligible weeks.

## 9. Build notes

### 9.1 The seven questions, verified disposition

| Field | Today (WorkoutSummary) | After COMP-008 |
| --- | --- | --- |
| `sessionDifficulty` | post | post (stays) |
| `overallPump` | post | post (stays) |
| `jointDiscomfort` | post | post (stays) |
| `fatigueLevel` | post | post (stays — read by getRecentWorkoutFeedback/buildCoachBrief) |
| `soreness24hBefore` | post | **pre-workout** (HomeScreen intent modal) |
| `sleepQuality` | post | **pre-workout** |
| `energyScore` | post | **pre-workout** |

Post-workout block: 7 rows → 4 rows + notes. Three moved to pre-workout.

### 9.2 Call-signature changes

- `createWorkout(userId, routineId, { intent })` (`src/lib/database.js` line
  1492) is **already an options object**, so this is an additive change, not a
  breaking one. Extend to
  `createWorkout(userId, routineId, { intent, soreness24hBefore, sleepQuality, energyScore } = {})`
  and write the three columns in the INSERT (lines 1512–1514) and the
  returned object (line 1519).
- `confirmStart(intent)` (`src/screens/HomeScreen.js` line 644) becomes
  `confirmStart(intent, readiness)` where `readiness` is
  `{ soreness24hBefore, sleepQuality, energyScore }` collected from the modal
  chip state, passed straight into `createWorkout`. `startBlankSession` (line
  669) keeps passing `intent: null` and simply omits the readiness fields.
- WorkoutSummary: remove the three moved `RatingRow`s (lines 738, 741, 742) and
  their `FEEDBACK_SCALES`/default entries; source the engine's `soreness` input
  (line 222) from the workout row's pre-workout `soreness24hBefore` instead of
  `feedback.soreness24hBefore`. The `saveWeeklyCheckin` sleep-quality write
  (lines 349–356) moves out of the summary, since `sleepQuality` is now captured
  pre-session; decide whether pre-session sleep still feeds the weekly recovery
  record (recommended: keep the weekly write, sourced from the most recent
  session's pre-workout `sleepQuality`).

### 9.3 Schema changes

- Add nullable columns to `workouts`: `soreness_24h_before` (already exists,
  line 95 — reuse it; do **not** re-add), plus new `sleep_quality` and
  `energy_score`. New migration version (current top is v10, line 451):
  - `ALTER TABLE workouts ADD COLUMN sleep_quality INTEGER`
  - `ALTER TABLE workouts ADD COLUMN energy_score INTEGER`
  - `soreness_24h_before` is reused, no DDL.
- Add the new columns to the `rowToCamel` map and the sync column lists
  (lines ~5041–5055) so they round-trip. No billing, no coaching-engine, no
  safety-system files touched.
- This is the COMP-015 prerequisite: once `soreness_24h_before` is populated
  *before* the session, COMP-015 can read it at session open.

### 9.4 Fast Check-In branch

- ~60 lines in `WeeklyCheckInScreen.js`: an `allGreen` predicate over the
  already-loaded derived values (energy, soreness, training performance, cals,
  steps, cardio, weight trend), plus one render branch before the existing
  `gateState === 'open'` form. Reuses `saveWeeklyCheckin` and the existing
  post-submit flow verbatim. No new screen, no new store state.

### 9.5 Effort check vs 3.5

Confirmed **3.5**. Largest piece is the HomeScreen modal expansion plus the
additive call-signature change through `confirmStart` → `createWorkout`
(low risk because the options object and the soreness column already exist).
WorkoutSummary edits are deletions plus one re-sourced engine input. Fast
Check-In is ~60 lines reusing existing derivation and submit. Schema is two new
nullable columns on one table. Nothing in billing, the coaching engine, or
`src/coaching/safety/` is touched.

### 9.6 Code contradictions found against the prior skeleton

1. **Seven, not six, fields.** The prior "3 remain / 3 move" list omitted
   `fatigueLevel`. It is a real seventh row that stays post-workout (read by
   `getRecentWorkoutFeedback` and `buildCoachBrief`). Post block is 4 rows, not 3.
2. **`getRecentWorkoutFeedback` is in `src/lib/database.js` (line 5667), not
   `src/lib/algorithms.js`.** `buildCoachBrief` is in `src/screens/HomeScreen.js`
   (line 1497), not algorithms either. The brief mislocated both.
3. **`soreness_24h_before` already exists** on the `workouts` table (line 95).
   Only `sleep_quality` and `energy_score` are new DDL.
4. **`createWorkout` already takes an options object** with `intent`, so the
   call-signature change is additive, lowering risk versus the brief's framing
   of a signature change rippling through the start flow.
5. **The pre-workout modal already captures `intent`** and writes
   `pre_workout_intent`; we are extending an existing capture, not building one.
