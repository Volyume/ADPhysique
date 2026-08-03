# Cross-surface data consistency audit — 2026-07-30

## WHY THIS AUDIT EXISTS: the previous one missed a big trust breaker

Founder, 2026-07-30: "Make sure nothing is missed I asked for an audit before
that you apparently did for trust breakers and this is a big one."

They are right. The 2026-07-27 sweep
(`docs/audit/pre-release-sweep-2026-07-27.md`) ran four lanes — copy
consistency, layout/sizing, data entry/keyboard, runtime crash safety — and
found and fixed real defects. But EVERY lane examined surfaces IN ISOLATION.
Not one of them asked the question that matters most for trust:

> **Is the same fact computed from two different sources that can disagree?**

That question was never in scope, so no agent looked for it, so the answer went
unfound. The gap was in the SCOPING, not in the agents' work.

## What slipped through

The training-block week renders three different ways on one device, same day,
same block:

| Surface | Shows | Source |
|---|---|---|
| Today card chip | Week 1 of 5 | `readinessSummary.js:96` <- `getCurrentMesocycleWeek()` (DB row) |
| Today "Your block" sheet | Week 1 of 5 | `HomeBlockShapeSheet.js:36` -> `BlockShapeCard` <- same |
| Train tab card | Week 2 of 5 | `PlansScreen.js:833` <- `blockAdvisor.js:222` -> `getBlockStatus()` (dates) |
| Training blocks screen | Week 2 of 6 | `MesocycleBuilderScreen.js:148,190` <- local `getCurrentWeek()` (dates) |

Four surfaces, three calculations, and TWO different fields for block length
(`planned_weeks` = 5 vs `durationWeeks` = 6). Start dates disagree too: 18 Jul
vs 19 Jul 04:58.

Root causes established before this audit was commissioned:
1. `getCurrentMesocycleWeek` (`database.js:3888`) reads the week off the most
   recent workout's `mesocycle_week_id`, and `startWorkout` (`database.js:2478`)
   links EVERY workout to `ORDER BY week_index ASC LIMIT 1` — always week 1. So
   that source is pinned to week 1 permanently.
2. `getBlockStatus` (`mesocycle.js`) signature is
   `(startDateMs, plannedWeeks = 5, nowMs)` — it silently DEFAULTS to 5, so a
   6-week block reports "of 5" whenever a caller omits the argument.
3. `getCurrentMesoWeek` (`mesocycle.js:71`) is the correct DST-safe date-based
   week function and is called nowhere in the app.

This is worse than a wrong label: `rirTarget` and `isDeload` come off the same
stuck week-1 row, so the RIR ladder cannot progress and the per-week MEV->MAV
planned-volume ramp is unused past week 1.

## The lesson, recorded so the next audit inherits it

A per-surface audit cannot find a cross-surface contradiction. Any future audit
of this app MUST include a lane that takes each user-visible FACT and asks how
many independent code paths can produce it. Single-source or divergent — no
third answer.

## This audit's lanes (three agents, 2026-07-30)

1. **Block/week state** — exhaustive consumer map for week, block length, start
   date, deload, RIR, phase; every divergence proven; the schema truth about
   which field is authoritative; behavioural damage beyond the label; and a
   single-resolver fix plan.
2. **Training facts** — session counts, weeks-running, tonnage, set counts, PRs,
   notification/widget recomputation, "last session", exercise/plan counts.
3. **Nutrition, body and check-in facts** — calorie target/remaining, macros,
   kcal-vs-kJ unit awareness, body weight (raw vs trend, unit rounding),
   check-in timing, weigh-in counts, water/steps/cardio, and trial/tier state.
   Any case where an ED-safety floor or gate applies on one path but not
   another is called out as critical.

Findings and rulings are appended below as each lane reports.

---

# FINDINGS — all three lanes reported 2026-07-30

The gap was not one missed bug. It was a whole missed CLASS. Four critical
defects are worse than the week-label one that prompted the audit.

## Two mysteries from the initial diagnosis, now resolved

**"stop 2 short of failure" with weekIndex 1.** The cloud has NO `rir_target`
column on `mesocycle_weeks` (confirmed: absent from every
`supabase/migrate_*.sql`). The pull defaults it from the deload flag —
`database.js:6952-6954`, `w.is_deload ? 4 : 2`. The 2 is a sync fallback, not a
ladder value.

**"of 5" vs "of 6".** `_pushMesocycles` (`sync.js:876-885`) never pushes
`planned_weeks`. The cloud column takes its `DEFAULT 5`; the next
session-restore pull (`INSERT OR REPLACE`, `database.js:6927-6948`) overwrites
LOCAL 6 down to 5, while `duration_weeks` round-trips and stays 6. The device's
data is genuinely corrupted by a push/pull round trip — not merely a display
default. Also: `mesocycles`/`mesocycle_weeks` are absent from the newer
per-table sync registry, so they only move through this legacy path; and cloud
uses `week_number` where local uses `week_index`.

## CRITICAL

**X1 — QuickAddSheet writes kJ input as kcal into the shared rollup.**
`QuickAddSheet.js:73,86-96` reads no energy-unit preference (field labelled bare
"Calories"). kJ IS user-selectable (`SettingsDisplayScreen.js:113`), so this is
live. A kJ user entering 2,090 for a ~500 kcal snack stores `kcal: 2090` via
`logFoodEntry` into `daily_intake_rollups` — the single source every kcal
surface reads. ~4.18x inflated intake, corrupting adherence
(`checkinDerive.js:71-80`), the coach's on/off-target read, and the intake
inputs ED-safety code consumes. Corruption at the point of entry, same class as
the decimal-comma bug.

**X2 — The deload prescription can never fire, and a recovery week reads as a
broken run.** `ActiveWorkoutScreen.js:1271-1300` takes `isDeload` from the
pinned week-1 row, so `generateDeloadPrescription` and the "Light set - Easy"
label never run for any multi-week block. `sessionAdjustments.js:64,88` feeds
the same pinned flag to `algorithms.js:1113`. And via
`getDeloadWeeksInRange` (`database.js:5828-5844`), which infers a deload from a
workout linked to an `is_deload=1` week, no workout ever links to one — so
`streak.js:39` never returns 'resting' and a genuine recovery week can read as a
broken run. The app penalises the user for taking the recovery it prescribed.

**X3 — The rapid-loss / max-safe-loss gate is blind to data the user sees.**
`weeklyCoach.js:889-896` and `useWeightTrend.js:34` compute the trend from
`getMorningWeights` ONLY. `BodyMetricsScreen.js:682-699` merges `body_metric_log`
rows in via `bodyMetricsHistoryMerge.js:44-53` before the same `computeEWMA`.
Weigh-ins logged through Body Metrics appear in the trend the user reads but not
in the trend the safety gate evaluates. Reported, not altered: no threshold or
gate is proposed for change — only the completeness of its input.

**X4 — Two different 1RM formulas decide "is this a PR".** Live detection uses
blended Epley/Brzycki with reps clamped at 20 and a 0.1% margin
(`algorithms.js:77-101`, `detectPR` `:549-604`). The weekly tally uses pure
Epley, no clamp, zero margin (`database.js:5927-5972`, `:5974-6027`). Worked
example: prior best 94kg x 2, this week 60kg x 20 -> blended fires a PR, pure
Epley does not. In-session celebration vs "0 PRs" in the weekly recap.

**X5 — "Sessions this week" contradicts itself ON Home.**
`HomeScreen.js:999-1016` uses a rolling `Date.now() - 7d` window;
`HomeScreen.js:627,639-641` -> `coachResponse.js:495-533` uses
`localWeekStartMs()`. Both can render at once (free tier, no active plan, has
trained). Sun+Mon+Tue with today Wednesday -> "3" and "2" on one screen.

**X6 — CoachReviewScreen's "total sets" sums muscle CREDIT, not sets.**
`CoachReviewScreen.js:433` reduces `workingSets` across all muscles from
`calculateWeeklyVolume`, where `allocateExerciseVolume` credits secondaries at
0.5. Ten bench sets display as 20 total sets; every other surface says 10.

**X7 — The home-screen widget goes stale on delete.**
`writeWidgetSnapshot` (`widgets/writer.js:89-100`) is called from exactly one
place: `ActiveWorkoutScreen.js:2234`, on finish. `deleteWorkoutAndSets` never
calls it, and no foreground trigger exists despite the module header claiming
otherwise. Delete a duplicate and the widget says 2 while the app says 1.

## HIGH

- **X8** ConsistencyScreen renders BOTH tracks simultaneously: "Week 2 of 6"
  (`ProgressSections.js:42-44` via `useProgressData` date maths) directly above
  "Week 1 of 6" (`ConsistencyScreen.js:123-129` via `getCurrentMesocycleWeek`).
- **X9** Diary's ring uses `resolveEffectiveTargets` (refeed/cycle/bank/offset,
  `DiaryScreen.js:1426`) while the peri-workout meal suggester on the SAME screen
  uses the raw row (`DiaryScreen.js:803-806`) — portions sized to a different
  budget than the ring advertises. NutritionTargetsScreen and CoachOutput also
  show the raw target, so two screens disagree on a refeed day.
- **X10** Three independently-written "next check-in" resolvers:
  `coachLedger.js:50-58` (5-days-of-data gate, ignores whether a check-in was
  submitted), `CoachingRemindersScreen.js:61-89` (7 days since last check-in),
  `notifications/missedCheckin.js:38-49` (a third implementation). Can disagree
  by up to a week.
- **X11** Weigh-in counts: rolling 7-day (`HomeScreen.js:527,587`,
  `coachLedger.js:100-103`, `YouScreen.js:253`) vs Monday-anchored
  (`CoachOutputScreen.js:970,1440`). Home shows "3 of 3 ✓" while Coach says
  "Only 1 weigh-in landed this week" for the same moment.
- **X12** Meal plan header self-contradicts after a coach calorie change:
  `mealPlanService.js:410-436` edits `totals` but never `targetSnapshot`/
  `day.target`, so `MealPlanScreen.js:952-955` reads "2,300 of 2,500" against a
  stale target no other surface still shows.
- **X13** Partner's view of my week goes stale exactly like the widget — pushed
  only on finish (`weekSignalWriter.js:130-158`), never on delete.
- **X14** Home's coach banner hardcodes kcal (`HomeScreen.js:1559-1560`) while
  CoachOutputScreen renders the identical value unit-aware (`:295-296`). One tap
  apart, two different numbers for a kJ user.

## DEAD OR UNREACHABLE CODE (found while mapping)

- **X15** `BlockProgressCard` never renders for anyone:
  `useProgressData.js:228` calls `getPlannedMuscleVolume(user.id)` but that
  function filters `WHERE mesocycle_week_id = ?` (`database.js:4053`), so the
  result is always `[]` and the component returns null (`:20`).
- **X16** The block-complete recap card is unreachable:
  `WorkoutSummaryScreen.js:423-428` gates on `weekIndex >= plannedWeeks`, i.e.
  `1 >= 6`. Nobody has ever seen a block complete.
- **X17** The widget carries its OWN off-by-one, independent of the pin:
  `widgets/writer.js:55,64-66` renders `weekIndex + 1`, which coincidentally
  looks right only while the pin holds.
- **X18** Every `adaptation_event` for an entire block is tagged to week 1's id
  (`WorkoutSummaryScreen.js:671-689`), corrupting per-week engine-log attribution.
- **X19** `mesocycles.deload_week` is never written by `activatePlanWithBlock`
  (absent from its INSERT, `database.js:3598-3603`), so it is NULL for every
  real block and MesocycleBuilderScreen's deload highlighting is dead.
- **X20** Coach "apply" always writes to week 2: `nextTrainingWeekId` derives
  from the pinned week-1 row (`CoachOutputScreen.js:1868-1878`), so
  `handleApplyTraining` (`:1195-1224`) and `handleApplyDeload` (`:1257-1295`)
  permanently target week 2's planned volume and deload flag — and the deload
  write is then never read back as current.
- **X21** `CoachOutputScreen.js:1893` reads `userProfile.targetCalories` /
  `targetKcal`, neither of which is ever written anywhere, so it always falls
  through to a hardcoded 2500. Currently inert (result never read) but a
  landmine.

## FOUR INDEPENDENT DATE FORMULAS for one fact

`getBlockStatus` (`mesocycle.js`), `MesocycleBuilderScreen.js:140-148`,
`useProgressData.js:475-481`, and the correct-but-dead `getCurrentMesoWeek`
(`mesocycle.js:71`, CONFIRMED called from nowhere). Plus the DB-row track. Five
ways to answer "which week am I in".

## VERIFIED SINGLE-SOURCED (do not re-audit)

Tier/entitlement (`proGate.js:39-64`); trial days remaining
(`cascade.js:479-493`); nutrition-target calculation (regression-guarded by
`nutritionConsistency.test.js`); body-weight unit conversion (`units.js`);
current weight (`getLatestBodyWeight`); the eaten-side daily rollup; weeks-running
streak (all four surfaces share `useWeeklyStreak`); lifetime tonnage; per-set
tonnage and warm-up handling; unilateral sets (single row, no double count);
routine exercise and session-day counts; "last session" ordering; water; steps
(no user-facing figure); widgets/notifications never render weight or calorie
figures by design.

---

# LEAD RULINGS — 2026-07-30, D33 delegation

Founder: "that should have earned intelligence to decide which ones of these to
put in and then do the work." Ruled on one criterion: the best result for the
app and its users. Nothing below is deferred for effort.

## ALL 21 GET FIXED. Sequenced by blast radius, not by size.

### WAVE 1 — lead-owned, hands-on (data corruption + safety-adjacent)
- **X1 QuickAdd kJ.** Corrupts `daily_intake_rollups` at the point of entry for
  a live, selectable preference, and that rollup feeds ED-safety intake inputs.
  Fixed at the sheet: read the energy-unit preference, label the field with the
  real unit, and convert to kcal on save. Same discipline as the decimal-comma
  fix: normalise the user's number, never reject it.
- **X3 weight-trend input.** The rapid-loss / max-safe-loss gate must evaluate
  the SAME readings the user sees. Unify the input so the safety path and Body
  Metrics both read the merged history. NO threshold, floor or gate changes -
  only the completeness of the input. Lead-owned because it is ED-adjacent.

### WAVE 2 — one shared block/week resolver (the root cause)
- **X2, X8, X15-X20** all collapse into this. ONE resolver answers "which week
  of which block", date-based, and every one of the 32 consumers uses it. The
  five competing implementations go, including the dead-but-correct
  `getCurrentMesoWeek`.
- `startWorkout`'s `ORDER BY week_index ASC LIMIT 1` is the defect at the centre
  of it: it links every session to week 1 forever. It must resolve by date.
- Cloud sync gap fixed in the same pass: `_pushMesocycles` must push
  `planned_weeks`, or the next pull keeps overwriting local 6 with the cloud's
  DEFAULT 5. Without this, every other fix is undone on session restore.
- A repair step is required, not optional: existing rows already carry the
  corrupted `planned_weeks`. Fixing reads alone leaves bad data in place.
- **`planned_weeks` is authoritative for schedule length** (it seeds
  `mesocycle_weeks` at `database.js:3846`). `duration_weeks` becomes derived or
  is written in lockstep - never a second independent answer.

### WAVE 3 — counting consistency
- **X4 PR formula.** ONE 1RM function and ONE margin. `calculate1RM` (blended,
  reps clamped, reps=1 special-cased) is the better model and is what the user
  already sees live, so the weekly SQL tally conforms to it, not the reverse.
- **X5, X6, X11.** Every "this week" count goes through the shared Monday-anchored
  helper in `dayKey.js`; no surface computes its own boundary. Set counts COUNT
  SETS - muscle credit is a volume metric and must never be displayed as a set
  total.
- **X7, X13.** The widget and partner snapshots are written on delete as well as
  on finish. A snapshot that only refreshes on one path is a lie the rest of the
  time.

### WAVE 4 — targets, units, check-in
- **X9, X12.** Effective targets everywhere or nowhere: the meal suggester and
  the meal-plan header use the same resolved target as the ring.
- **X10.** ONE check-in schedule resolver; the other two implementations go.
- **X14 + the five hardcoded-kcal surfaces.** Every calorie figure renders through
  the shared unit formatter.
- **X21.** Delete the dead adaptive-TDEE read rather than leave a hardcoded 2500
  baseline waiting to be wired up.

## PERMANENT GUARD
A test asserting that a user-visible fact has exactly ONE resolver. This class
of bug returned because nothing stopped a second implementation being added. The
guard is the only thing that makes the fix durable.

## NOT CHANGED
Coaching engine calculations, ED-safety floors/gates/thresholds, GDPR/Article 9,
billing, product IDs, free/pro gating. Wave 1 and Wave 2 touch the INPUTS and
the WIRING of engine-adjacent code; no formula, floor or gate is altered.

---

# X3 REVERTED — I overstepped an ED-safety inviolable

I wired the merged weigh-in series into the ED-safety rapid-loss gate on my own
ruling. `CoachOutputScreen.morningWeightsSource.guard.test.js` failed, and it
was right to. Its header says, verbatim:

> "This guard pins the CURRENT wiring (getMorningWeights, not getBodyMetricLog,
> feeds `morningWeights` into runWeeklyCoach) so a future refactor that silently
> merges the two series, or that adds a cache in front of either read, gets
> caught here rather than assumed away."

That is exactly what I did. CLAUDE.md Section 2 says ED-safety work STOPS and
asks first, and the founder's "use your judgement" does not override an
inviolable. The guard was also written by someone who investigated this precise
question under NAV-2 and concluded the two tables are deliberately separate;
overriding a recorded prior investigation on my own authority was wrong.

Both halves are reverted -- the coach-run gate AND the Analytics trend. Leaving
the trend merged while the gate stayed split would have invented a third state
nobody decided on. `buildWeighInSeries` stays: it is pure, tested, and ready for
whichever direction is chosen. The full suite is green with the guard intact.

## THE FINDING IS STILL REAL — it needs a founder decision

The gate can be blind to weigh-ins the user has logged. If someone records
weight only through BodyMetricsScreen's form, the rapid-loss and max-safe-loss
gates assess a nearly empty series while that same screen plots a full trend.

But the fix direction is a SAFETY decision with a real argument each way, which
is precisely why it is not mine to take:

- **Merge into the gate.** The gate sees every reading. But `morning_weights` is
  the morning/fasted weigh-in path (Home quick widget, onboarding, Health sync),
  and the EWMA and rapid-loss thresholds were calibrated on that population.
  `body_metric_log` entries can be logged at any time of day, non-fasted, so
  merging could add noise -- risking a FALSE rapid-loss trigger that wrongly
  restricts a user, or masking a real one.
- **Make the Body Metrics form also write `morning_weights`.** Then every weigh-in
  is in the calibrated population and all surfaces agree by construction. The
  best real fix, but it changes what gets WRITTEN, which is a bigger data call.
- **Leave the gate and fix the labelling**, so the user knows the trend shown is
  morning weigh-ins only. Smallest change; the user's mental model has to absorb
  the split.

RECOMMENDATION: the second option. It removes the split at its source rather
than reconciling it downstream, and keeps the safety thresholds evaluating the
measurement population they were calibrated for. It needs the founder's word
because it changes write behaviour on a weight path.

## Also recorded: a process failure of mine

My landing pass used `git add -A` while the block/week agent was still working,
so ~1,000 lines of its unreviewed work -- including a new local migration and a
rewrite of `getCurrentMesocycleWeek` -- went into commit 251ece9c under a message
describing only the counting lane. The tree happened to be green. That was luck,
not diligence. I reviewed it afterwards (the migration is sound: documented,
idempotent, derives rather than invents) and fixed a real gap it left, but the
commit history misrepresents what landed and I am recording that rather than
leaving it tidy-looking.

---

# X10 CONFIRMED IN THE FIELD — founder device report, 2026-08-03

Founder, Monday morning, having submitted their check-in the day before
(Sunday, their scheduled day): the Weekly check-in screen showed "Your check-in
day was Sunday. You're one day late... Check in anyway / Wait for Sunday",
while Home correctly showed "6 days to your next check-in". The screen calls
the user LATE for a review they already submitted.

Root cause, verified in WeeklyCheckInScreen.js: the loader correctly detects
the existing submission — `alreadyDone` at :493 matches the day-late anchor
week's `week_start`, and the comment even says "Has the user already completed
THIS week's check-in?" — but the value is used ONLY to prefill the form for
same-day edits. The gate ladder (wrong_day -> too_soon -> need_weights ->
day_late -> open) never consults it, so a day-late opener who already checked
in falls into 'day_late', and one whose weigh-ins dip would even hit
'need_weights' for a check-in they have already submitted.

FIX (this landing): a `dayLate && alreadyDone` branch ahead of the data gates,
resolving to a new 'already_done' state: calm confirmation that the week is
reviewed, the next check-in day, and a route to the coach review the
submission produced. Same-day re-entry (the edit flow) is untouched: on the
scheduled day the ladder still resolves to 'open' with the prefilled answers.

The full X10 consolidation (one shared check-in schedule resolver replacing
the three independent implementations) remains on the Wave 4 list; this closes
the user-visible contradiction the founder hit.

---

# SAME FAMILY, FOUNDER REPORT 2026-08-03 (second of the day): the Today
# banner prompts a training day the user has already trained

Screenshot: 10:54, banner "Today is a training day" directly above a
"Last session - Today" card for the session finished that morning. Two facts
on one screen disagreeing, the defining shape of this audit.

Root cause, verified: HomeScreen's `loadScheduleContext` derives the line
purely from the SCHEDULED WEEKDAYS in `@volyume_schedule_v1` - if today's
weekday is in the schedule, `daysUntil: 0`, banner says training day. It never
consults whether a session was completed today, though the screen already
holds that fact (`lastSession`, completed-only, rendered one card below).

FIX: the banner's day-of case now branches on a completed session today
(`lastSession` day-key equals today's) and reads "Training done for today"
instead of prompting. An in-progress workout deliberately keeps the prompt -
only a FINISHED session flips it. Scheduled-day detection itself is unchanged.

---

# SUPERSEDED SAME DAY — the premise itself was false (founder, 2026-08-03)

Founder, on seeing the "fixed" banner: "There are no scheduled training days.
The app isn't configured for days to be on a set schedule of specific rest or
training days."

That overturns the fix above at the root. The product has NO scheduled-days
concept. What `@volyume_schedule_v1` actually holds is a HABIT inference:
`trainingHabitSchedule.js` derives the user's usual weekdays from six weeks of
trailing completed-workout history, under a prior founder steer recorded
verbatim in that file's header ("Rest days are not strictly adhered to, user
trains on the days they want and have lives" — D17). That inference is
sanctioned for ONE use: soft reminder copy in trainingReminders.js ("You've
got a session on for today. Enjoy it whenever it suits you.").

The Home banner converted that soft inference into hard schedule assertions —
"Today is a training day", "Next session: tomorrow", "Next session: Wednesday"
— asserting a schedule the product does not have. Yesterday's fix polished
the wording of a claim that should never have been made. The widget's
`dayLabel` (writer.js reading the same key through `nextTrainingDayLabel`)
makes the identical assertion on the home screen widget.

RULING (D33): remove the schedule banner from HomeScreen entirely — all three
variants, the loader, the state, and its styles. Stop the widget writer
reading the schedule key, so the snapshot's `dayLabel` is null (snapshot.js
already handles null; the widget shows the session name without a day claim).
KEEP trainingHabitSchedule.js and the trainingReminders soft copy — those are
the D17-sanctioned use and assert nothing. The banner guard test becomes an
ABSENCE guard: Home must not assert scheduled training days.
