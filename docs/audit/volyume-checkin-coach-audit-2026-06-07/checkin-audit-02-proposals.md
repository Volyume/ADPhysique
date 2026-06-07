# Check-in and Coach audit, 02: proposals

Date: 2026-06-07. These are proposals for your decision, not decisions
taken. The weekly coach is a runtime-critical system (CLAUDE.md Rule 5),
so every code change here ships with tests in the same commit (Rule 7),
and changes are additive where possible. Nothing is implemented until you
confirm, proposal by proposal.

A note on scope: defects 1-5 in 01 are wiring/contract fixes that make the
existing engine work as designed. Defect 6 (load-based performance
assessment) is a genuine design extension, larger, and I have flagged it
separately so you can take it on its own merits.

---

## Proposal 1, check-in completion state and prefill

Defect 1. The screen never reads the saved row.

Recommended approach:
- In `WeeklyCheckInScreen.js`, import `getLatestCheckin` and, in load()
  (285), read `getLatestCheckin(user.id, weekStart.getTime())` for the
  current week.
- If a row exists, prefill every field from it (energyScore, stressScore,
  sleepHours, sorenessScore, soreMuscles split back to an array, jointPain,
  calsAdherence, stepsAvg, cardioAdherence, trainingPerformance, cycle,
  notes), instead of leaving them null. The derived defaults only fill
  fields the saved row left empty.
- Add a small "already checked in this week, editing" line so the user
  knows they are amending, not starting fresh. One line, no tutorial voice.
- saveWeeklyCheckin already upserts by week (4040-4061), so an edit
  overwrites cleanly. No new write path needed.

Decision points for you:
- (a) On re-entry after submit, do you want the form to open in an
  editable prefilled state, or a read-only "you have checked in" summary
  with an Edit button? I recommend editable prefilled, it is less code and
  matches the upsert.
- (b) soreMuscles is stored as a comma string (448); prefill splits on
  comma. Confirm that is acceptable rather than a normalised list.

Files: WeeklyCheckInScreen.js only. No DB, no migration. Tests: a mount
test that a saved row prefills.

---

## Proposal 2, calorie adherence vocabulary

Defect 2. Screen writes yes/no/untracked; engine refinements expect
hit/under/over.

There are two clean ways to fix this. They are mutually exclusive; pick one.

Option A (map at the boundary, no engine change):
- Translate the check-in's verdict into the engine vocabulary when building
  the coach input, in CoachOutputScreen.load (around 1015) or in a small
  pure mapper: yes -> 'hit', no -> derive 'under' or 'over' from the sign of
  the weight trend or the logged-vs-target average, untracked -> 'untracked'.
- Pro: the engine's existing hit/under/over branches come alive with no
  engine edit. Con: "no" is ambiguous (missed high or missed low), so the
  under/over split needs a rule. The honest rule is to read the logged
  average vs target from the rollups (over if average above target, under
  if below), which means passing that figure anyway (see Proposal 3).

Option B (make the engine understand yes/no directly):
- In weeklyCoach.js, treat 'yes' as 'hit' and 'no' as "off but direction
  unknown" at lines 586-588, 628 and 1034, so the credit and the larger
  step fire on 'yes' and the factor stays neutral on 'no'.
- Pro: smallest change, no new data needed. Con: leaves the under/over
  adherence factor permanently neutral, which is a real signal lost.

Recommendation: do Proposal 3 first (pass the intake average), then take
Option A, because the intake average gives an honest under/over split and
also feeds the safety floor. If you do not want Proposal 3, take Option B.

Decision point: A or B, and if A, confirm the under/over rule (logged
average vs target).

Files: CoachOutputScreen.js (A) or weeklyCoach.js (B). Tests: engine unit
tests asserting the credit and step on each verdict.

---

## Proposal 3, wire food intake into the coach

Defect 3. recentIntakeAvgKcal / recentIntakeDaysLogged / bodyFat* / sex
are never passed at the call site, so the FFM-floor safety gate and the
adaptive-TDEE intake context are dead.

Recommended approach:
- In CoachOutputScreen.load (948), fetch the week's rollups the same way
  the check-in does (getRollupsForRange for the local week, the import and
  pattern already exist in WeeklyCheckInScreen 25, 347).
- Compute recentIntakeAvgKcal = average kcal_total over days with
  kcal_total > 0, and recentIntakeDaysLogged = that day count, then pass
  both into runWeeklyCoach (1014-1055).
- Also pass bodyFatPercent, bodyFatSource and sex from userProfile / body
  profile so computeFFMFloor takes the right path (the engine already
  threads these, 595-598, 685-689).

Why it matters: this is the safety gate that refuses a calorie cut when
seven-day intake is at or below the RED-S floor (669-705). Right now it can
never fire. This is a harm-prevention path, so I would treat it as the
highest-priority wire of the set.

Decision points:
- (a) Window: the FFM gate and the engine comment say "7-day rolling
  intake" (672). The check-in uses the Monday-to-Sunday week. Confirm you
  want the trailing 7 days to match the engine's contract, or the calendar
  week to match the check-in. I recommend trailing 7 days for the floor.
- (b) Source of bodyFatPercent/sex: confirm the field names on
  userProfile / getUserBodyProfile so I read the right ones (I will verify
  in code before writing).

Files: CoachOutputScreen.js, plus a tiny pure helper if you want it tested
in isolation. Tests: a coach run where intake below floor holds a cut.

---

## Proposal 4, steps compliance display in the check-in

Defect: the steps section shows only the average number, not target vs
actual or a verdict. The engine already does the comparison; the gap is
purely what the USER sees.

Recommended approach (display only, no contract change):
- In renderStep1 steps section (658-699), when a target exists show the
  target alongside the average and a one-line derived verdict (on target /
  close / below), using the same thresholds the engine uses (>= target,
  >= 90 percent, else below; 1022-1027). Keep the tap-to-override.
- No change to what is saved (stepsAvg stays the contract the engine
  reads). The override already exists.

Decision point: do you want the verdict line, or is the average enough?
The steps pipeline already works end to end; this is a transparency
improvement so the check-in shows the user what the app derived. Low risk.

Files: WeeklyCheckInScreen.js. Tests: render assertion.

---

## Proposal 5, cardio compliance, stop the dead write or use the field

Defect 4. cardioAdherence is saved but the engine ignores it; the engine
uses the log count.

Two honest options:

Option A (lean on the log, drop the dead write):
- Keep the engine as is (log-driven compliance is more trustworthy than a
  self-report). In the check-in, turn the cardio section into a confirm/
  override of the LOGGED count: show "you logged N of T prescribed
  sessions" and let the user correct it only if they did cardio Volyume did
  not capture. When they override, that correction needs to reach the
  engine, which currently it cannot, see Option B.

Option B (make the override count):
- If you want the user's override to actually change the coach decision,
  the engine must accept an override of cardioSessionsLogged. Add an
  optional input (e.g. cardioSessionsReported) that, when present,
  supersedes the log count inside the cardio block (757-786), and pass the
  check-in's verdict-or-count through. This is an additive engine change
  with tests.

Recommendation: Option A unless you specifically want self-reported cardio
to override the log. Most coaching apps trust the log here. Either way, the
current state (save a value the engine silently ignores) should not stay.

Decision point: A or B.

Files: WeeklyCheckInScreen.js (A), plus weeklyCoach.js + CoachOutputScreen.js
(B). Tests: engine test if B.

---

## Proposal 6, load-based performance progression (the design extension)

Defect 6. The weekly coach judges training by session count and PRs, not
by week-over-week load/volume. This is the one genuine design decision in
the set, and it is yours to shape. I am NOT proposing a specific algorithm
as decided; I am laying out what the code already gives us so you can
choose.

What already exists and could feed it (verified):
- calculateWeeklyVolume(sets, exerciseMap) in algorithms.js, used by
  insightsEngine to compute per-muscle working sets per week (insightsEngine
  91-99). Tonnage per session is computed in getYearOfLiftsData (4232) and
  liftProgress. So weekly working-set volume and tonnage are both derivable
  from data we hold.
- insightsEngine already detects stalled_lift, peaked_lift and
  under_mev_muscle over multi-week windows (111-166). These are separate
  from the weekly coach.

Options for how load trend feeds the weekly coach:
- (a) Compute week-over-week working-set volume and/or tonnage in
  CoachOutputScreen.load and pass it as a new input; have the engine fold a
  "volume up / flat / down over N weeks" signal into getPerformanceScore or
  a new gate. Thresholds and the number of stagnation weeks before acting
  are your call.
- (b) Keep the weekly coach as is and instead surface load-trend coaching
  through the existing CoachReview / insights surfaces, which already do
  volume analysis, rather than overloading the weekly card.

Recommendation: this needs your direction before any code. It is the kind
of change where elite-coach practice (progressive overload judged on load,
not attendance) argues for (a), but it touches the runtime-critical engine
and changes coach behaviour, so it should not be done off my own bat. If
you want it, tell me the rule: what counts as progress (load up X percent),
what counts as stagnation (flat for N weeks), and what the coach should do
(push / hold / flag). I will not invent those numbers.

Files (if a): CoachOutputScreen.js, weeklyCoach.js, a pure volume-trend
helper, with a full test suite. Treat as its own change after 1-5 land.

---

## Proposal 7, Train screen notification fix

Defect 5. Blind weekly recurrence, routed with no weekStart, lands on a
wrong/baseline screen.

Recommended approach:
- Make the route resolve the current local week. Either pass the current
  local-Monday weekStart in routeForNotificationType('weekly_coach_ready')
  via the navigator that handles the tap (the cleanest place is wherever
  the route's params are applied, so the screen gets a real weekStart), or
  give CoachOutputScreen a fallback: when route.params.weekStart is
  undefined, default to localWeekStartMs() (the same helper the check-in
  uses, dayKey.js). I recommend the screen-level fallback because it also
  fixes any other entry point that forgets the param, and it is one place.
- Guard the screen against an undefined weekStart everywhere it is used
  (getWeeklySessionStats, getWeeklyPRCount, weekRangeLabel) so a NaN window
  and an Invalid Date header can never render again.
- Gating the notification itself: optionally, only treat the tap as a real
  "review ready" when a check-in exists for the week; if none exists, route
  to the check-in instead of a baseline card. This is a behaviour choice.

Decision points:
- (a) Screen-level weekStart fallback to the current local week, yes? (My
  recommendation.)
- (b) Do you want the Monday notification to still fire when no check-in
  was done that week, and if so should it nudge the check-in rather than
  open a baseline card? Right now it fires unconditionally.

Files: CoachOutputScreen.js (fallback + guards), notificationRoute.js
and/or the tap handler (if you want week-aware routing), scheduler.js (if
you want conditional firing). Tests: route test, and a screen test that an
undefined param resolves to the current week.

---

## Proposal 8, coach data mapping, close the remaining gaps

This consolidates the field-level fixes so every check-in field either
feeds a coach decision or is deliberately display-only.

- calsAdherence: fixed by Proposal 2 (+3).
- cardioAdherence: fixed by Proposal 5.
- recentIntake*: fixed by Proposal 3.
- stress_score: currently saved, never read. Decision: either feed it into
  the recovery/deload picture (it is a plausible stressor signal) or accept
  it as a logged-only field. I will not wire it without your say.
- joint_pain and sore_muscles: reach the engine only as free-text inside
  notes (451-452). Decision: leave as is (the notes string already trips
  hasUnusualEvent and is shown in CoachReview), or promote joint_pain to a
  structured recovery input. I recommend leaving them unless you want
  joint pain to actively hold volume.
- sleep_quality: a column exists (4050) but the screen never sets it
  (handleSubmit passes only sleepHours, 432); data.sleepQuality is always
  undefined. Decision: drop the unused field from the write, or start
  collecting it. I recommend dropping it from the write to stop a confusing
  always-null column, unless you plan a sleep-quality question.

No migration is required for 1-5 and 7; the columns already exist. Only
Proposal 6, and any decision to persist a new derived value, would add a
column, and that would follow the migration tracking rules (Rule 6) with a
supabase/README.md entry.

---

## Suggested order, if you approve

1. Proposal 7 (notification/weekStart) and Proposal 3 (intake into the
   safety floor) first: one is a visible broken tap, the other is a
   harm-prevention gate that is currently dead.
2. Proposal 1 (prefill), Proposal 2 (calorie vocabulary), Proposal 4
   (steps display), Proposal 5 (cardio).
3. Proposal 6 (load-based performance) last and only with your rules.

Confirm which proposals to proceed with, and the decision points inside
each. I will restate any amended proposal before writing code, and each
engine-touching change ships with tests in the same commit.
