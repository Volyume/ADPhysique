# AUDIT G — Adherence, session resolution and execution semantics

Capability Campaign 25 (CC25), Wave 1. Evidence report only. No product or
architecture decisions, no recommendations.

Repo: `/home/user/ADPhysique`, branch `claude/build-name-prompt-apple-auth-fp49by`.
Date of audit: 2026-08-20. All line numbers are as read on that tree.

---

## 1 SCOPE / METHOD

### 1.1 Domain audited

- `session_resolutions` (cloud `supabase/migrate_140_session_resolutions.sql`,
  local `PRAGMA user_version` v79): full value domain, every writer, every
  reader.
- Skipped / rescheduled / ended-early / incomplete session handling end to end.
- Per-exercise omission inside an otherwise completed session; partial sets vs
  prescribed sets.
- Every adherence / completion / compliance / consistency / streak / missed
  scoring mechanism found in `src/`.
- The EXECUTION limiter: exact input conditions in the weekly coach chain.
- Downstream surfaces reacting to misses: notifications, insights, home,
  widgets, partner lane.

### 1.2 Method

- Broad greps over `src/` for: `session_resolutions`, `sessionResolution`,
  `skipped_by_user`, `ended_early`, `adherence`, `compliance`, `consistency`,
  `streak`, `missed`, `sessionsCompleted`, `sessionsPlanned`, `is_completed = 1`.
- Every mechanism read to its END (function body, its callers, and the SQL it
  issues), per EVIDENCE BEFORE ASSERTION point 2.
- Cross-checked against Campaign 21 `docs/coach-validation-campaign-21-2026-08-16/GRAPH-TRAINING.md`
  (rules T-WEEKLY-08, T-SESSION-*) and against live code; where the graph and
  the code differ it is called out.
- Schema versions computed by parsing `SCHEMA_MIGRATIONS` bracket depth in
  `src/lib/database.js:440`, not by counting comments (the comment blocks for
  v78 and v79 are written in the reverse order of their arrays).

### 1.3 Labels used

- **OBSERVED** — read directly in the tree at the cited file:line.
- **REPORTED** — asserted by a repo document (comment, doc, test name) and not
  independently verified by execution.
- **UNVERIFIED** — could not be established from the tree.

Everything in sections 2 to 12 is OBSERVED unless marked otherwise.

### 1.4 Not in scope (other Wave 1 audits)

Pain / joint-discomfort capture and the per-set model (Audit D), exercise intent
and swaps as a mechanism (Audit C), progression/volume learning internals
(Audit E), coach precedence beyond its EXECUTION inputs (Audit F). Where those
touch adherence they are cited as boundary evidence only.

---

## 2 CURRENT BEHAVIOUR

### 2.1 The two-dimension model (C18)

`src/lib/blockProgression.js:17-27` states the deliberate separation:

- EXECUTION TRUTH — what was performed. Owned by workout/set rows.
- SESSION RESOLUTION — whether the programme should keep bringing this required
  session back.

`SESSION_STATE` (`blockProgression.js:52-57`) has four values:
`outstanding`, `completed`, `skipped_by_user`, `ended_early`.
Only two are persistable: `EXPLICIT_RESOLUTIONS = [SKIPPED_BY_USER, ENDED_EARLY]`
(`blockProgression.js:60-63`). `COMPLETED` is derived from workout rows and is
never stored (`database.js:2465-2469`; `migrate_140...sql:12`).

### 2.2 Resolution precedence

`RESOLUTION_PRECEDENCE` (`blockProgression.js:171-178`) is a six-row lookup
table, consulted by `precedenceFor()` (`:187-192`) and applied in
`resolveWeekSessions()` (`:242-296`):

| # | explicit | other completion | result |
|---|---|---|---|
| 1 | none | no | OUTSTANDING |
| 2 | none | yes | COMPLETED |
| 3 | SKIPPED | no | SKIPPED_BY_USER |
| 4 | SKIPPED | yes | COMPLETED (`performed_after_skip`) |
| 5 | ENDED_EARLY | no | ENDED_EARLY |
| 6 | ENDED_EARLY | yes | ENDED_EARLY + `conflict: 'ended_early_with_later_completion'` |

"Other completion" excludes the ended-early session's own workout row
(`:276-280`).

### 2.3 What the athlete can actually do today

Exactly two explicit resolutions exist as user flows:

1. **Skip this workout** — `HomeScreen.js:1358-1399`. Only offered for
   `programmePosition.nextSession`. Writes `resolution: 'skipped_by_user'`
   (`:1379`) with no reason field of any kind. Copy in
   `blockProgression.skipConfirmation()` (`:380-390`) states explicitly "no
   mandatory reason" (`:371-378`).
2. **Finish for today (ended early)** — `ActiveWorkoutScreen.js:3010-3065`.
   Detected, not asked: `isEndedEarly = performed.length > 0 && unperformed.length > 0`
   (`:3023-3025`) over the in-memory `snapshotExercises`. Writes
   `resolution: 'ended_early'` with `workoutId` (`:3053-3059`) inside one
   SQLite transaction with the workout close
   (`database.finishWorkoutWithSessionResolution:5281-5307`).

There is **no reschedule flow, no undo flow, and no reason capture on either
path**. `blockProgression.js:233-234` says so directly: "Volyume has no
undo-a-resolution flow and this design deliberately does not add one."

### 2.4 The adherence number the app actually acts on

`database.getWeeklySessionStats(userId, weekStart)` (`database.js:7370-7426`) is
the single weekly adherence reader. It returns `{ completed, planned, plannedIsEstimate }`.

- `completed` = `COUNT(*)` of `workouts` with `is_completed = 1`, `started_at`
  inside the local week, **AND at least one `workout_sets` row**, **AND NOT
  referenced by a live `ended_early` session_resolution** (`:7379-7392`).
- `planned` = `routines.length` for the active plan (`:7409-7415`), else a
  trailing-4-week average, else 3 (`:7419-7421`).

Two consequences follow directly from that SQL:

- **An ENDED_EARLY session contributes 0 to `completed`.** A session where the
  athlete performed four of six prescribed exercises scores identically to one
  never started. Pinned by test at
  `src/lib/__tests__/campaign18.hostileLifecycle.test.js:195-213`.
- **A SKIPPED_BY_USER session does not reduce `planned`.** Nothing in
  `getWeeklySessionStats` reads `session_resolutions` other than the
  `ended_early` exclusion, so the denominator is unchanged and the ratio falls.

### 2.5 The EXECUTION limiter

Two independent adherence gates exist and they use different thresholds.

**Gate A — `weeklyCoach` hard adherence gate** (`weeklyCoach.js:1175-1182`):
`sessionAdherence = sessionsPlanned > 0 ? sessionsCompleted / sessionsPlanned : 0`.
If `< 0.5`, the entire coaching run short-circuits to `_buildAdherenceOutput`
(`:2577-2613`): training signal `hold`, note "Get back to your full plan before
changing anything", `adherenceNote` = "N of M sessions completed. Getting back
on schedule takes priority over any programming change." `whyThisWeek =
'stabilise_sessions'`.

**Gate B — the coach-context EXECUTION limiter** (the one the brief names):

- `coachContext.trainingExecutionFact({sessionsCompleted, sessionsPlanned})`
  (`coachContext.js:133-147`). Thresholds at `:83-87`:
  `TRAINING_EXECUTION_GOOD = 0.8`, `TRAINING_EXECUTION_POOR = 0.6`,
  `MIN_PLANNED_SESSIONS = 2`.
  - `done == null || planned == null || planned < 2` → `SIGNAL.UNKNOWN`.
  - `ratio >= 0.8` → GOOD. `ratio < 0.6` → POOR. `0.6 <= ratio < 0.8` → GOOD
    ("the middle band is imperfect, not poor", `:142`).
- `coachPrecedence.classifyTrainingLimiter(context)` (`coachPrecedence.js:189-210`):
  - `!execution || execution.signal === UNKNOWN` → `INSUFFICIENT_EVIDENCE`,
    because `'execution_unknown'` (`:194-196`).
  - `execution.signal === POOR` → **`LIMITER.EXECUTION`, because `'sessions_missed'`**
    (`:197-199`). **This is the exact and only condition that classifies a week
    as EXECUTION-limited on the training side.**
  - Only then are recovery, then progress, consulted.

Downstream of EXECUTION:

- `trainingProgressFact` returns UNKNOWN whenever execution is UNKNOWN or POOR
  (`coachContext.js:155-162`), so no progress verdict can be formed.
- `chooseInterventions` pushes `{domain:'training', reason:'sessions_missed'}`
  and caps the allowed intervention at `EXPLAIN` (`coachPrecedence.js:283-287`).
- `coordinateChanges` R2 blocks any volume ADD (never a reduction) with
  `reason:'sessions_missed'` (`coachPrecedence.js:404-412`).
- `blockAdvisor` sets `executionJudgeable = (fact.signal === GOOD)`
  (`blockAdvisor.js:632-647`); a false value forces slot verdict KEEP
  (`INSUFFICIENT_EXECUTION`, per GRAPH-TRAINING.md rule 12 at
  `docs/coach-validation-campaign-21-2026-08-16/GRAPH-TRAINING.md:486`).
- `planAutoGen` discards a block's structural lesson unless execution is GOOD
  (`planAutoGen.js:205-212`).

A nutrition-side EXECUTION limiter also exists (`coachPrecedence.js:134-158`)
and is out of this audit's domain except that `coordinateChanges` R1 reads it.

### 2.6 Programme position

`programmePosition.resolveProgrammePosition(userId)` (`programmePosition.js:97-226`)
is the authoritative resolver. It fetches plan routines, mesocycle weeks,
`getBlockTrainingData`, `getLiveSessionResolutions`, then walks candidate weeks
(floored for legacy blocks, capped at the calendar week and below the recovery
week, `:131-142`) and returns the first week that is not fully resolved.

It returns `execution: executionSummary(sessions)` (`:194`) —
`{required, completed, skipped, endedEarly, outstanding, resolved}`
(`blockProgression.js:326-337`).

**No production surface reads `position.execution`.** Verified: `grep -rn
"execution" src/screens src/components src/hooks src/widgets` returns only three
unrelated hits (`DiaryScreen.js:139`, `BeforeAfterShareSheet.js:3`,
`ProgressPhotoViewer.js:21`). The honest skip/ended-early counts are computed and
discarded.

---

## 3 FILES & FUNCTIONS

### 3.1 Core session-resolution model

| File:line | Symbol | Role |
|---|---|---|
| `src/lib/blockProgression.js:52-57` | `SESSION_STATE` | four progression states |
| `src/lib/blockProgression.js:60-63` | `EXPLICIT_RESOLUTIONS` | the two persistable values |
| `src/lib/blockProgression.js:72-76` | `isResolved` | COMPLETED / SKIPPED / ENDED_EARLY all stop re-offering |
| `src/lib/blockProgression.js:79-81` | `isPerformedInFull` | only COMPLETED |
| `src/lib/blockProgression.js:107-121` | `compareSessionResolutionVersions` | total order: updatedAt, resolvedAt, rank, workoutId, id |
| `src/lib/blockProgression.js:132-138` | `pickCurrentResolution` | one live resolution per instance |
| `src/lib/blockProgression.js:171-192` | `RESOLUTION_PRECEDENCE`, `precedenceFor` | the founder-pinned table |
| `src/lib/blockProgression.js:202-216` | `requiredSessions` | required set = plan routines for the week |
| `src/lib/blockProgression.js:242-296` | `resolveWeekSessions` | the resolver |
| `src/lib/blockProgression.js:305-309` | `nextOutstandingSession` | first OUTSTANDING in programme order |
| `src/lib/blockProgression.js:312-315` | `weekProgressionResolved` | every session resolved |
| `src/lib/blockProgression.js:326-337` | `executionSummary` | honest counts (no UI consumer) |
| `src/lib/blockProgression.js:360-367` | `sessionDisplayName` | duplicate-name qualification |
| `src/lib/blockProgression.js:380-390` | `skipConfirmation` | skip copy |
| `src/lib/blockProgression.js:399-408` | `endEarlyConfirmation` | end-early copy |
| `src/lib/programmePosition.js:80-88` | `candidateFloor` | legacy-block floor |
| `src/lib/programmePosition.js:97-226` | `resolveProgrammePosition` | authoritative position |
| `src/lib/programmePosition.js:232-235` | `resolveNextSession` | thin wrapper |

### 3.2 Persistence

| File:line | Symbol | Role |
|---|---|---|
| `src/lib/database.js:2507-2526` | schema v79 | `session_resolutions` table + 2 indexes |
| `src/lib/database.js:5229-5230` | `sessionResolutionId` | `sr_${weekId}_${routineId}` derived id |
| `src/lib/database.js:5232-5252` | `_upsertSessionResolutionOnDb` | the only insert path |
| `src/lib/database.js:5261-5273` | `recordSessionResolution` | public writer (validates the two values at `:5265`) |
| `src/lib/database.js:5281-5307` | `finishWorkoutWithSessionResolution` | transactional ENDED_EARLY |
| `src/lib/database.js:5310-5321` | `getSessionResolutionsForWeek` | live rows for one week (no production caller found) |
| `src/lib/database.js:5324-5335` | `getAllSessionResolutionsForUser` | includes tombstones; sync push reader |
| `src/lib/database.js:5338-5341` | `getLiveSessionResolutions` | resolver reader |
| `src/lib/database.js:5344-5385` | `insertOrUpdateSessionResolutionFromCloud` | pull-side LWW |
| `src/lib/database.js:5086-5115` | `getBlockTrainingData` | returns `{workouts, sets, fullyCompletedWorkouts}` |
| `src/lib/database.js:7370-7426` | `getWeeklySessionStats` | the weekly adherence reader |
| `src/lib/database.js:7352-7368` | `getDeloadWeeksInRange` | deload weeks count as resting |
| `src/lib/database.js:3197-3231` | `_updateWorkoutOnDb` | identity-scoped update used by the ended-early transaction |
| `src/lib/database.js:3244-3258` | `deleteIncompleteWorkout` | discard path (hard delete, no resolution) |
| `src/lib/database.js:4552-4572` | `advancePlanNextWorkout` | RETIRED no-op tombstone |

### 3.3 Adherence / execution scoring

| File:line | Symbol | Formula / window |
|---|---|---|
| `src/lib/coachContext.js:83-87` | thresholds | GOOD 0.8, POOR 0.6, MIN_PLANNED 2 |
| `src/lib/coachContext.js:133-147` | `trainingExecutionFact` | `completed / planned`, one week or one block |
| `src/lib/coachContext.js:155-173` | `trainingProgressFact` | UNKNOWN when execution UNKNOWN/POOR |
| `src/lib/coachPrecedence.js:189-210` | `classifyTrainingLimiter` | EXECUTION iff execution POOR |
| `src/lib/coachPrecedence.js:264-317` | `chooseInterventions` | hold `sessions_missed`, cap at EXPLAIN |
| `src/lib/coachPrecedence.js:380-427` | `coordinateChanges` | R2 blocks volume ADD on EXECUTION |
| `src/lib/weeklyCoach.js:342-351` | `getPerformanceScore` | adherence < 0.5 → 4; < 0.75 → 3; >= 0.75 → 2; >= 0.9 with PR/slope → 1 |
| `src/lib/weeklyCoach.js:1179-1182` | adherence gate | `< 0.5` → stabilise output |
| `src/lib/weeklyCoach.js:2186-2190` | "what's working" | >= 1.0 and >= 0.75 bands |
| `src/lib/weeklyCoach.js:2577-2613` | `_buildAdherenceOutput` | the stabilise card |
| `src/lib/interBlock.js:108` | `ADHERENCE_FLOOR = 0.6` | per-muscle set-level floor |
| `src/lib/interBlock.js:184-186, 321-325` | `classifyMuscleBlock` | `completedSets / plannedSets`, block window; below floor → INSUFFICIENT_DATA |
| `src/lib/blockLedgerGather.js:250-283` | `sumPlannedSets`, `sumCompletedSets` | planned from `planned_muscle_volume`, completed from allocated working sets |
| `src/lib/checkinDerive.js:74-100` | `deriveTrainingPerformance` | `< 0.5` dropped; `>= 1.0` + PR/vol exceeded; volDown struggled; `>= 0.9` hit; else struggled |
| `src/lib/streak.js:35-42` | `labelBase` | kept iff `completed >= target` |
| `src/lib/streak.js:80-92` | `computeWeekState` | partner-lane seam |
| `src/lib/streak.js:125-147` | `computeStreak` | **no production caller** (see 5.4) |
| `src/lib/coachLedger.js:119-125` | sessions ledger row | `completedSessions >= 1` |
| `src/lib/home/evidencePanel.js:117-135` | sessions row | `sessionsSinceCheckin >= 1` |
| `src/lib/activationNudge.js:41-42, 64-94` | `resolveActivationNudge` | 0/1/2 sessions in first 14 days + 3/4-day gaps |
| `src/lib/reEntryCheck.js:42-56, 82-99` | `reEntryCheckDue` | 14-day gap, scaled for <3 sessions/week |
| `src/lib/workoutHelpers.js:64-71` | `shouldConfirmBeforeFinish` | warns when a non-time-crunched planned exercise has 0 sets |

---

## 4 TABLES & FIELDS

### 4.1 `session_resolutions` — local (SQLite, schema v79, `database.js:2507-2526`)

```
id                TEXT PRIMARY KEY      -- sr_${mesocycle_week_id}_${routine_id}
user_id           TEXT NOT NULL
mesocycle_week_id TEXT NOT NULL
routine_id        TEXT NOT NULL
mesocycle_id      TEXT                  -- nullable
resolution        TEXT NOT NULL         -- NO CHECK constraint locally
workout_id        TEXT                  -- ended_early only
resolved_at       INTEGER NOT NULL
created_at        INTEGER NOT NULL
updated_at        INTEGER NOT NULL
updated_at_iso    TEXT
deleted_at        INTEGER
```
Indexes: `UNIQUE (mesocycle_week_id, routine_id)` at `:2522-2523` (note: **no
`user_id`** in the local unique key); `(user_id)` at `:2524-2525`.

### 4.2 `session_resolutions` — cloud (`supabase/migrate_140_session_resolutions.sql:39-119`)

Same columns with `TIMESTAMPTZ` timestamps, `PRIMARY KEY (user_id, id)` (`:51`),
`UNIQUE (user_id, mesocycle_week_id, routine_id)` (`:60-61`), and:

```sql
CHECK (resolution IN ('skipped_by_user', 'ended_early'))   -- :56-58
```

**The full value domain of `resolution` is exactly two values.** There is no
reason column, no category column, no free-text column, and no nullable
extension point anywhere in either schema.

Server conflict trigger `_session_resolutions_refuse_stale` (`:66-96`) mirrors
`compareSessionResolutionVersions`. RLS policy `session_resolutions_owner`
(`:100-119`) requires ownership of the mesocycle week AND the routine.

### 4.3 Adjacent tables consulted, and what they can and cannot carry

| Table | Reason/provenance field | Notes |
|---|---|---|
| `workouts` (`database.js:217-233` + ALTERs at `:448-449, 468-470, 541, 549, 611, 769-770, 1451-1452`) | none for omission | has `pre_workout_intent`, `joint_discomfort`, `fatigue_level`, `soreness_24h_before`, `sleep_quality`, `energy_score`. **No prescribed-set-count snapshot.** |
| `workout_sets` (`:234-256` + ALTERs `:476, 544-545, 772, 1268-1269`) | none | has `missed_reps`, `joint_discomfort`, `left_reps`/`right_reps`. A set exists only if performed. |
| `planned_muscle_volume` (`:517-528`) | `source TEXT NOT NULL DEFAULT 'template'` | week-level planned sets per muscle. The **only** prescribed-quantity record that survives the session. |
| `exercise_intent` (`database.js:9728-9783`) | `reason TEXT` (optional, free text, "never interpreted", `:9749-9751`) | kinds: `excluded`, `avoided_block`, `pattern_avoid`. Is about FUTURE suggestions, not about this session's omission. |
| `exercise_swaps` (`database.js:9842-9856`) | none | carries `explicit` and `scope` only. |
| `routine_exercises.selection_reason` | plan-build provenance (migrate_139) | why a slot was chosen, not why it was skipped. |
| `adaptation_events` (`:529-540`) | `reason_code`, `reason_text` | engine decisions, not user omissions. |
| `mesocycles.progression_anchor_week` (schema v78, `database.js:2503-2505`) | n/a | legacy-block compatibility marker. |

---

## 5 READERS

### 5.1 Readers of `session_resolutions` (complete)

| Reader | File:line | What it reads | Effect |
|---|---|---|---|
| `getBlockTrainingData` | `database.js:5099-5111` | `workout_id` where `resolution='ended_early'` and `deleted_at IS NULL` and `mesocycle_id = ?` | subtracts those workouts from `fullyCompletedWorkouts`; `workouts` and `sets` keep them |
| `getWeeklySessionStats` | `database.js:7379-7400` | `NOT EXISTS` correlated subquery on `ended_early` | excludes them from the weekly `completed` count (both current week and the 4-week fallback average) |
| `getLiveSessionResolutions` → `resolveProgrammePosition` | `database.js:5338-5341`, `programmePosition.js:114` | all live rows for the user | feeds `resolveWeekSessions` |
| `getAllSessionResolutionsForUser` | `database.js:5324-5335` | all rows including tombstones | sync push payload |
| `getSessionResolutionsForWeek` | `database.js:5310-5321` | live rows for one week | **no production caller found** (grep across `src/` excluding tests) |
| `_pushSessionResolutions` | `sync.js:1080-1116` | via `getAllSessionResolutionsForUser` | cloud upsert |
| `_pullSessionResolutions` | `sync.js:2936-2952` | cloud select | into `insertOrUpdateSessionResolutionFromCloud` |

That is the entire set. **Nothing else in the app knows a session was skipped or
ended early.**

### 5.2 Readers of `getWeeklySessionStats` (the adherence pair)

| Consumer | File:line | Decision it makes |
|---|---|---|
| `CoachOutputScreen` | `:1543` → `runWeeklyCoach({sessionsCompleted, sessionsPlanned})` at `:1841-1842` | the whole weekly coaching run |
| `CoachOutputScreen` hold receipt | `:2159` | `buildHoldReceipt({completedSessions})` |
| `CoachOutputScreen` stat tile | `:2784` | renders `${sessionsCompleted}/${sessionsPlanned}` |
| `WeeklyCheckInScreen` | `:444-449, 487-493` | prefills `trainingPerformance` chip via `deriveTrainingPerformance` |
| `WeeklyStoryScreen` | `:79-94` | `weeklyStory.buildTrainingChapter` |
| `lib/partners/weekSignalWriter` | `:72-100` | the outbound partner week signal |
| `lib/widgets/writer` | `:57-81` | the home-screen widget snapshot |

### 5.3 Readers of `getBlockTrainingData().fullyCompletedWorkouts`

| Consumer | File:line | Decision |
|---|---|---|
| `blockAdvisor` | `:639-647` | `executionJudgeable`; gates every slot verdict at block boundary |
| `planAutoGen` | `:203-212` | whether a finished block teaches structure at all |

`blockLedgerRunner` reads `training.sets` and `training.workouts` (the FULL sets,
including the ended-early session's) at `:308, 332, 374-375` — so the sets an
ended-early session did produce **do** count as `completedSets` for
`interBlock.classifyMuscleBlock`.

### 5.4 Readers with NO production consumer (dead or vestigial)

- `streak.computeStreak` (`streak.js:125-147`) — the whole weekly run/streak
  derivation. `grep -rn "computeStreak" src/` returns only its own definition,
  a doc comment, and tests. Removed product-wide by founder ruling; the removal
  note is at `ConsistencyScreen.js:57-64`, and the guard suite is
  `src/__tests__/todayTruthRepair.guard.test.js:97-156`.
- `blockProgression.executionSummary` output (`position.execution`) — computed
  at `programmePosition.js:194`, read nowhere in `src/screens`,
  `src/components`, `src/hooks`, `src/widgets`.
- `database.getSessionResolutionsForWeek` — no production caller.

---

## 6 WRITERS

### 6.1 `session_resolutions` writers (complete)

| Writer | File:line | Value written | Trigger |
|---|---|---|---|
| `HomeScreen.handleSkipThisWorkout` | `HomeScreen.js:1375-1380` | `skipped_by_user`, `workoutId` null | user taps "Skip this time" on the confirm for `position.nextSession`. Also clears any pending re-entry ease bound to that instance (`:1386-1389`) |
| `ActiveWorkoutScreen.handleFinishWorkout` | `ActiveWorkoutScreen.js:3053-3059` | `ended_early`, `workoutId` = the live workout | user taps "Finish for today" on the auto-detected ended-early confirm |
| `sync._pullSessionResolutions` | `sync.js:2946-2947` → `database.js:5344-5385` | whatever the cloud row says | cloud restore |

`recordSessionResolution` rejects anything outside the two values
(`database.js:5265`). `finishWorkoutWithSessionResolution` throws on anything
other than `ended_early` (`:5287-5289`) and on a missing required-session
identity (`:5284-5286`).

### 6.2 Conditions on the ENDED_EARLY writer, in order

`ActiveWorkoutScreen.js:2999-3065`:

1. `if (!shouldConfirmBeforeFinish(snapshotExercises) && !hasInProgressSetEntry())`
   → `runFinish()` with **no resolution** and return (`:2999-3002`).
   `shouldConfirmBeforeFinish` (`workoutHelpers.js:64-71`) excludes
   `_timeCrunchSkipped` entries from "planned", so a Time-Crunch-trimmed session
   takes this branch.
2. `performed = exercises with >= 1 set`; `unperformed = exercises with 0 sets`
   (`:3023-3024`). `isEndedEarly` requires BOTH non-empty (`:3025`).
3. `canResolveEndedEarly = !!user?.id && !!endedEarlyWeekId && !!endedEarlyRoutineId`
   (`:3029`). A freeform/no-routine session cannot be resolved.
4. Only if 2 AND 3 does the ended-early confirm appear; otherwise the generic
   "Finish workout?" alert runs `runFinish()` with no resolution (`:3067-3074`).

### 6.3 Omission paths that write NOTHING

| Path | File:line | Durable trace |
|---|---|---|
| Remove an exercise mid-session | `ActiveWorkoutScreen.js:982-1010` | none. Splices the entry out of the in-memory list (`:999-1000`) and emits `audit('workout.exercise.removed')` (`:996`), which is a Sentry breadcrumb + on-device ring buffer only (`observability.js:324-348`). **After removal the exercise is not in `snapshotExercises`, so it cannot make `unperformed` non-empty, so the ENDED_EARLY branch does not fire.** |
| Time Crunch trim | `ActiveWorkoutScreen.js:2727-2779` (mid-session), `:2669-2712` (15-minute starter) | none. Sets `_timeCrunchSkipped` on in-memory entries only; grep shows the flag exists in `ActiveWorkoutScreen.js`, `workoutHelpers.js` and tests, nowhere else. |
| Discard / cancel a workout | `ActiveWorkoutScreen.js:1176-1193` → `database.deleteIncompleteWorkout:3244-3258` | hard-deletes the row and its sets. The required session stays OUTSTANDING. |
| Log fewer sets than prescribed on an exercise the athlete did start | (no code path) | none. `workout_sets` records only what happened; nothing compares it to `routine_exercises.recommendedSets` at save time. |
| Never open the app | n/a | the session stays OUTSTANDING; `completed` falls, `planned` unchanged. |

---

## 7 CURRENT INVARIANTS

Stated as the code enforces them, with the enforcing line.

1. **`resolution` has exactly two legal values.** `database.js:5265` (writer
   guard); `migrate_140...sql:56-58` (server CHECK). Local SQLite has **no**
   CHECK constraint (`database.js:2514`), so the guard is JS-only on device.
2. **COMPLETED is never stored.** `database.js:2465-2469`;
   `migrate_140...sql:12`; pinned by
   `campaign18.migration140.test.js:29` (`expect(sql).not.toMatch(/'completed'/)`).
3. **One live resolution per (mesocycle_week_id, routine_id).** Local UNIQUE
   index `database.js:2522-2523`; cloud UNIQUE `migrate_140...sql:60-61`;
   derived id `database.js:5229-5230`.
4. **Real performed work outranks an earlier skip.** Precedence rule 4,
   `blockProgression.js:175`.
5. **An ended-early session's own workout row never upgrades it to COMPLETED.**
   `blockProgression.js:276-280`, rule 5 at `:176`.
6. **Rule 6 is diagnostic, never a silent upgrade.** `blockProgression.js:177`,
   `programmePosition.js:152-157` records `{kind:'session_conflict'}`.
7. **Resolution ordering is total and arrival-independent.**
   `blockProgression.js:107-121`; server mirror `migrate_140...sql:66-96`.
8. **Closure is not completion for adherence purposes.**
   `database.js:5106-5110` and `:7379-7386`.
9. **A session needs at least one set to count.** `database.js:7379-7380`.
10. **Time never resolves a session.** `blockProgression.js:41-42` (pure, no
    clock); `reEntryCheck.js:4-8` ("TIME MAY QUESTION THE PRESCRIPTION. TIME MAY
    NOT CHANGE THE NEXT WORKOUT."); `reEntryOutcome` always returns
    `changesQueue: false` (`reEntryCheck.js:139-160`).
11. **A planned recovery week may not start while a pre-recovery session is
    outstanding.** `programmePosition.js:175-198`.
12. **A legacy block (null `progression_anchor_week`) is floored at the furthest
    week actually trained; earlier gaps are never relabelled.**
    `programmePosition.js:63-88`.
13. **An unrun programme cannot be judged.** `coachContext.js:155-162`;
    `coachPrecedence.js:194-199`; `blockAdvisor.js:632-647`.
14. **Volume may never be ADDED under EXECUTION; reductions are never withheld.**
    `coachPrecedence.js:391, 404-412`.
15. **A deload week is resting, never a miss** (partner lane / streak seam).
    `streak.js:88-90`; `database.js:7341-7351`.
16. **An open ED flag freezes the partner signal to `resting` and forces
    milestone booleans false, fail-closed on a read error.**
    `weekSignalWriter.js:79, 91, 107`; widget equivalent `widgets/writer.js:64-80`.

---

## 8 CURRENT TESTS

| Suite | File | What it pins |
|---|---|---|
| Pure progression model | `src/lib/__tests__/blockProgression.test.js` | the founder case (`:44-57`); normal/out-of-order order (`:59-93`); one-time skip fabricates no training (`:95-106`); the precedence table covers every combination exactly once (`:149-153`); rule 6 is not a silent upgrade (`:155-173`); rule 4 vs 6 (`:174-178`); total ordering and fetch-order independence (`:242-301`); ended-early keeps its sets and progresses (`:303-323`); nothing reads a clock (`:349-371`); **CASE 22 ADHERENCE TRUTH — "resolved is not the same as completed, and both counts survive"** (`:372-388`); duplicate-name display (`:390-404`) |
| Production wiring | `src/__tests__/blockProgression.production.test.js` | drives the real `resolveProgrammePosition` against mocked DB: the founder case through production (`:100`); calendar reaching recovery does not start it (`:115`); final session COMPLETED/SKIPPED/ENDED_EARLY all open recovery (`:138-169`); **CASE 21 "a resolved week is NOT 'you completed all your workouts'"** (`:170`); legacy floor behaviour (`:229-311`); rendering is not mutation (`:324-334`); persistence/restore and the derived id (`:335-365`) |
| Hostile lifecycle (real DB entry points) | `src/lib/__tests__/campaign18.hostileLifecycle.test.js` | authoritative week attribution (`:37-65`); ENDED_EARLY is one transaction and a resolution failure rejects finalisation (`:66-125`); pull-side total ordering (`:126-169`); **`getBlockTrainingData` exposes only full completions (`:172-193`) and the weekly SQL excludes ended-early closures (`:195-213`)** |
| Migration audit | `src/lib/__tests__/campaign18.migration140.test.js` | one unambiguous 140 file + README row asserting LIVE (`:9-22`); the two-value CHECK and absence of `'completed'` (`:24-29`); the refuse-stale trigger (`:31`); RLS on both parents (`:39`) |
| Sync lifecycle | `src/lib/__tests__/campaign18.syncLifecycle.test.js` | a pre-migration push failure leaves the durable local row eligible for a later sync (`:65`) |
| Identity | `src/lib/__tests__/requiredSessionIdentity.test.js` | `(mesocycleWeekId, routineId)` is sufficient; duplicate display names are real; the writer loop is per-workout |
| Coach coherence | `src/lib/__tests__/coachCoherenceTrace.test.js:255-285` | a session needs real sets not just a flag; zero-of-four → EXECUTION limiter + progress UNKNOWN + slot verdict KEEP; one-of-four is still not a verdict |
| Check-in / coach audit guard | `src/lib/__tests__/checkinCoachAudit.guard.test.js:60-69` | ALGO-002: planned sessions come from the active plan routine count, trailing average is only a fallback |
| Write guards | `src/lib/__tests__/database.writeGuards.test.js:70-81` | `getWeeklySessionStats` rejects a non-epoch-ms weekStart |
| Coach validation oracle | `src/__tests__/coachValidation/residueClosure.test.js:75-110` | T-SESSION-02 `pickCurrentResolution` total order, soft-deleted rows ignored, shuffle-invariance |
| Coach validation scenarios | `src/__tests__/coachValidation/scenarios.training.data.js:575-650` | skipped state and `because`; ended-early state; the rule-6 conflict flag; a Time-Crunch-skipped entry does not force the finish confirm (`:659-671`) |
| Streak (retired construct) | `src/lib/__tests__/streak.test.js`, `streakState.test.js` | the pure derivation, still tested although `computeStreak` has no production caller |
| Run/streak removal | `src/__tests__/todayTruthRepair.guard.test.js:97-156` | no production file renders the run construct (partner lane excepted); no renamed replacement badge; the widget keeps a factual count and drops `streakWeeks` |
| Wipe coverage | `src/lib/__tests__/wipeAllUserData.test.js` | an explicit allowlist of tables that must be in `WIPE_DIRECT_TABLES`. **`session_resolutions` is not among them** |

**No test anywhere asserts anything about a REASON for a skip or an omission,
because no such field exists.**

---

## 9 REUSABLE INFRASTRUCTURE

Facts about what already exists that a capability-aware system could build on.
No recommendation is implied.

1. **A pure, table-driven precedence resolver.** `blockProgression.js` is
   I/O-free and clock-free (`:41-42`); every judgement is a lookup in
   `RESOLUTION_PRECEDENCE` rather than a branch chain (`:140-146` explains why).
   Adding a state means adding a row and its combinations.
2. **A derived-id convergence pattern with a mirrored server trigger.**
   `sessionResolutionId` (`database.js:5229`) + `compareSessionResolutionVersions`
   (`blockProgression.js:107-121`) + `_session_resolutions_refuse_stale`
   (`migrate_140...sql:66-96`). Two devices converge without racing rows.
3. **A transactional workout-close-plus-resolution primitive.**
   `finishWorkoutWithSessionResolution` (`database.js:5281-5307`) with
   identity-scoped UPDATE (`:3226-3229`), already proving a crash cannot leave a
   half-state.
4. **A single cross-domain evidence vocabulary.** `coachContext.js` `SIGNAL` and
   `SOURCE` (`:63-73`), `fact()` (`:115-117`) carrying `{signal, value, coverage,
   source, detail}`, and `unknown(source, detail)` (`:120-122`). Every fact
   already carries its own provenance slot.
5. **A limiter/intervention ladder that can only withhold.**
   `coachPrecedence.js:61-92, 319-347`. Hold reasons are already a named
   vocabulary (`'target_not_eaten'`, `'sessions_missed'`,
   `'recovery_calls_for_restraint'`, `'one_change_at_a_time'`) rendered by
   `coachStory.js:235-239`.
6. **An honest-counts object that already exists and is already tested.**
   `executionSummary` (`blockProgression.js:326-337`) plus CASE 21/22 tests.
7. **A user-answer capture pattern for a non-observable fact.**
   `reEntryCheck.js:59-63` (`RE_ENTRY_ANSWER`) with
   `reEntryOutcome` (`:139-160`) mapping each answer to `{easeReturn,
   changesQueue, because, note}` and an explicit "UNKNOWN is a real answer"
   stance (`:58`).
8. **An optional, never-interpreted reason field precedent.**
   `exercise_intent.reason` (`database.js:9748-9751`): "It is never interpreted:
   'discomfort' records that the user said so, never that the exercise injures
   them."
9. **A "resting is compliance" seam.** `streak.computeWeekState`
   (`streak.js:80-92`) already collapses deload / paused / ED-suppressed into a
   single `resting` state that counts as met, and `getDeloadWeeksInRange`
   (`database.js:7352-7368`) supplies the deload evidence.
10. **A day-bound expiry precedent for a temporary restriction.**
    `PATTERN_AVOID` + `expires_at_ms` (`database.js:9737, 9756`; migrate_142).

---

## 10 CONFLICTS WITH NEW SYSTEM

Places where today's code would misread a physically-restricted deviation. Each
is stated as: the deviation, the exact firing conditions, and the resulting
misclassification.

### C1. ENDED_EARLY scores as a total no-show in the weekly ratio

- Deviation: athlete performs 4 of 6 prescribed exercises, then stops because of
  a flare, a spasm, a transfer problem, fatigue from a condition.
- Fires: `ActiveWorkoutScreen.js:3025` detects it, `:3053-3059` writes
  `ended_early`, then `database.js:7381-7386` excludes that workout from
  `completed`.
- Result: the week reads `completed = N-1` out of an unchanged `planned = N`.
  With a 3-day plan, one ended-early session puts adherence at 0.67, which is
  below `TRAINING_EXECUTION_GOOD` but above POOR; a second puts it at 0.33,
  which is POOR AND below the 0.5 stabilise gate.
- Misclassification: work that happened is counted as work that did not.
  `getBlockTrainingData:5106-5110` calls this "the honest full-completion
  subset", which is honest about *full* completion and silent about partial.

### C2. SKIPPED_BY_USER carries no reason, so every skip is the same skip

- Deviation: the athlete skips Legs because of a flare-up, versus skipping Legs
  because they could not be bothered.
- Fires: `HomeScreen.js:1375-1380`. The value domain is closed at two values
  (`migrate_140...sql:58`) and the copy explicitly promises no reason will be
  asked (`blockProgression.js:371-378`).
- Result: identical rows. The adherence ratio falls identically.
- Misclassification: an involuntary, restriction-driven non-performance is
  stored as, and later read as, a discretionary one. Downstream this becomes
  `LIMITER.EXECUTION`, `because: 'sessions_missed'`
  (`coachPrecedence.js:198`) and the copy "Get back to your full plan before
  changing anything" (`weeklyCoach.js:2587`).

### C3. Removing an exercise mid-session leaves zero trace AND suppresses the ended-early detection

- Deviation: athlete removes the two exercises their restriction makes
  impossible today, completes the rest, finishes.
- Fires: `ActiveWorkoutScreen.js:995-1001` splices the entries out of
  `workoutExercises`. `snapshotExercises` therefore has no zero-set entries, so
  `unperformed.length === 0` at `:3024` and `isEndedEarly` is false at `:3025`.
  `shouldConfirmBeforeFinish` also returns false (`workoutHelpers.js:69`), so
  the early return at `:2999-3002` fires.
- Result: a **fully COMPLETED session** (precedence rule 2) counting 1/1 toward
  weekly adherence, with the omission recorded nowhere durable — only in a
  Sentry breadcrumb (`observability.js:346-348`).
- Misclassification: the opposite direction from C1. The programme records full
  compliance for a session in which prescribed work was structurally impossible,
  so nothing downstream can learn the restriction, and per-muscle
  `sumCompletedSets` (`blockLedgerGather.js:265-283`) silently under-delivers
  against `sumPlannedSets` with no explanation attached.

### C4. Time Crunch is forgiven; a physical restriction is not

- Deviation: two identical shortened sessions, one shortened by the Time Crunch
  button, one shortened by the body.
- Fires: `workoutHelpers.js:68` filters `_timeCrunchSkipped` out of "planned",
  so the Time Crunch session skips the ended-early branch entirely and closes as
  COMPLETED. The restriction-shortened session hits `:3025` and is written
  `ended_early`, then scored 0 by `database.js:7381-7386`.
- Result: the app has a first-class "I chose to do less today, and that is fine"
  concept, wired only to a time reason, and no equivalent for a capability
  reason.
- Misclassification: asymmetric forgiveness on identical execution evidence.

### C5. The EXECUTION limiter is a pure ratio; it cannot distinguish absence from impossibility

- Fires: `coachContext.js:133-147` reads only two integers. `classifyTrainingLimiter`
  (`coachPrecedence.js:189-210`) reads only `execution.signal`.
- Result: a week limited by a flare and a week limited by disengagement produce
  the identical `{limiter: EXECUTION, because: 'sessions_missed'}`.
- Downstream consequences that then fire, each verified:
  - Progress becomes UNKNOWN (`coachContext.js:160-161`), so no plan finding can
    be made at all.
  - `chooseInterventions` holds training at EXPLAIN (`coachPrecedence.js:284-287`).
  - `coordinateChanges` R2 blocks every volume ADD (`:404-408`). Note a
    reduction is still allowed (`:391, 404`), so the safety direction is open.
  - `blockAdvisor.executionJudgeable` goes false (`blockAdvisor.js:644`),
    forcing KEEP on every exercise slot at the block boundary.
  - `planAutoGen` discards the block from structural learning
    (`planAutoGen.js:210-212`).
  - Copy: "There were not enough sessions this block to judge the programme, so
    it stays as it is." (`coachStory.js:118`); "We are leaving your programme
    alone until there are enough sessions to judge it." (`coachStory.js:235`);
    "Getting back to your full week is the thing that makes the rest readable."
    (`coachStory.js:261`).

### C6. The `< 0.5` stabilise gate is an unconditional lockout of all coaching

- Fires: `weeklyCoach.js:1179-1182`. Runs BEFORE the autoregulation matrix, the
  recovery read, and every nutrition decision.
- Result: `_buildAdherenceOutput` (`:2577-2613`) with
  `whatWorking: ['Showing up, even partially, keeps the habit alive.']`,
  `training.signal: 'hold'`, `calories: null`, `steps: null`,
  `adherenceNote: "N of M sessions completed. Getting back on schedule takes
  priority over any programming change."`
- Misclassification: an athlete whose condition permits two of four sessions in
  a bad week receives a stabilise-first card that presumes the shortfall is
  recoverable behaviour, and receives **no nutrition coaching either** because
  every branch below the gate is unreachable.

### C7. Nine directive copy strings tell the athlete to hit all sessions

Each fires purely on `sessionsCompleted < sessionsPlanned`:

| File:line | String |
|---|---|
| `coachOutput/viewCopy.js:48-49` | "You hit {c} of {p} sessions." (in the "what went off" list, at `< 0.75`) |
| `coachOutput/viewCopy.js:90-91` | "Hit all {p} sessions. Adherence beats everything else." |
| `coachResponse.js:276-277` | "Get all {p} sessions in this week. Consistency moves the plan more than any single change." |
| `coachResponse.js:325-326` | "Get the sessions in and the next read will show it." |
| `coachRegister.js:201-202` | "Sessions: {c} of {p}. Get all {p} in this week." |
| `coachRegister.js:235-236` | "Sessions in, and the next read shows it." |
| `weeklyCoach.js:2587` | "Get back to your full plan before changing anything." |
| `weeklyCoach.js:2600` | "…Getting back on schedule takes priority over any programming change." |
| `weeklyStory.js:56` | "You trained {c} of {p} planned sessions this week." |

None of these consults any resolution, reason, or capability signal. They are
reachable when the shortfall was involuntary.

### C8. `deriveTrainingPerformance` pre-selects a downgrade verdict on the same ratio

- Fires: `checkinDerive.js:74-100` with `completed`/`planned` from
  `getWeeklySessionStats` (`WeeklyCheckInScreen.js:487-493`).
- Result: `ratio < 0.5` → `'dropped'`, rendered as **"well short of the plan
  this week"** (`checkinDerive.js:154`) and pre-selected on the check-in chip
  (`WeeklyCheckInScreen.js:523-525`).
- Misclassification: the app states a verdict about the athlete's week before
  they speak, on evidence that cannot see why. It is user-overridable
  (`:1273`), which is a mitigation, not an absence of the misread.

### C9. `planned` is plan-wide and week-blind, so it cannot express a capability-adjusted week

- Fires: `database.js:7409-7415` — `planned = routines.length` for the active
  plan, unconditionally.
- Result: there is no representation anywhere of "this week's prescription is
  three sessions, not five" other than editing the plan itself. Skipping does
  not reduce it; a pause does not reduce it; nothing does.

### C10. `planned` counts routines, `completed` counts any workout — the two are not the same population

- Fires: the `completed` query (`database.js:7387-7392`) has **no `routine_id`
  filter**, so a freeform session, or a second session of the same routine,
  counts toward a denominator built from distinct plan routines.
- Result: a week can read 4/3. Also, `_timeCrunchSkipped`-trimmed and
  exercise-removed sessions count as 1 each.

### C11. The interBlock 0.6 set-level adherence floor silently voids a restricted muscle's learning

- Fires: `interBlock.js:184-186` computes `completedSets / plannedSets` per
  muscle over the whole block; `:321-325` returns `INSUFFICIENT_DATA` with the
  rationale "{Muscle} was logged for about N% of its planned sets this block,
  too little to judge the response", and proposes the research-table seed
  (`mev`, `mav`).
- Result: an athlete who cannot deliver planned volume to a restricted muscle is
  reset toward the generic research seed at every block boundary, with the
  reason recorded as `{signal:'insufficient', value:'adherence'}` (`:322`) —
  adherence, not capability.

### C12. Re-entry answers cannot express a restriction

- Fires: `reEntryCheck.js:59-63`. The full answer domain is
  `TRAINED_ELSEWHERE`, `DID_NOT_TRAIN`, `CONTINUE`.
- Result: an athlete returning from a flare, a hospital stay or a prosthetic
  refit must pick "I haven't trained", which maps to `easeReturn: true`
  (`:147-152`) — a reasonable outcome, reached through a semantically wrong
  answer, and stored as `because: 'athlete_reports_no_training'` with no
  capability content.

### C13. The activation nudge chases a user who cannot yet train

- Fires: `activationNudge.js:64-94`. Stages on 0/1/2 completed sessions inside
  the first 14 days, anchored at account creation + 3 days
  (`COLD_START_GAP_DAYS = 3`, `:41`) or last session + 4 days
  (`STALL_GAP_DAYS = 4`, `:42`).
- Mitigations present: the copy is documented as never shaming (`:26-28`), and
  the window has a hard stop at day 17 (`:43, 92`). The stage count reads
  `completedStartedAtMs` of completed workouts, with no capability input.

### C14. The partner week signal exports `weekMet: false` on a restricted week

- Fires: `weekSignalWriter.js:93-100` → `streak.computeWeekState:80-92`.
  `weekMet = resting ? true : (hasTarget && done >= target)`. `resting` is only
  `paused || isDeload || edSuppressed` (`streak.js:88`).
- Result: a capability-shortened week is exported to the partner as `training`
  with `weekMet: false` and visible `done/planned` ticks. The forgiveness state
  exists (`resting`) and is reachable only by a manual pause
  (`streakState.addPauseSpan`), an engine deload, or the ED freeze.
- Note: `pausedWeekKeys`/`addPauseSpan` are AsyncStorage-only and were never
  moved to a synced table (`streakState.js:5-7`), so a pause does not survive a
  device change.

### C15. The home widget publishes "N of M sessions this week"

- Fires: `widgets/writer.js:57-81` → `widgets/snapshot.js:64-76`. Label
  `"${completed} of ${planned} sessions this week"` when a plan exists, plain
  count otherwise.
- Result: the same undercount as C1/C2 is rendered on the OS home screen. There
  is an ED/calm suppression bit (`writer.js:64-80`), and no capability bit.

### C16. Milestone and readiness counts include ended-early sessions, so the two figures disagree

- `ReadinessCards.js:163-170` counts any completed workout with at least one set
  toward its lifetime session milestones — including ended-early ones.
- `getLifetimeWorkoutStats` (`database.js:7649-7656`), `getRecapData`
  (`:7788-7799`), `getBlockRecap` (`:7882-7888`), `getCompletedWorkoutStartTimestamps`
  (`:3081-3091`) all count `is_completed = 1` with no ended-early exclusion.
- Result: an ended-early session counts as a session on the celebration
  surfaces and counts as zero on the coaching surfaces. Both readings are
  reachable in the same app session.

### C17. No per-exercise or per-set prescribed-vs-performed record exists

- `workouts` has no prescribed-set-count snapshot (schema `database.js:217-233`
  plus every ALTER at `:448-1452`); `workout_sets` rows exist only when
  performed (`:234-256`).
- The only prescribed-quantity record that survives the session is
  `planned_muscle_volume.planned_sets` at **week and muscle** granularity
  (`:517-528`).
- Result: "the athlete was prescribed 4 sets of X and did 2, because of Y"
  cannot be represented at any granularity finer than a whole-muscle weekly
  ratio, and even that ratio carries no reason.

---

## 11 PROVENANCE RISKS

### P1. Two values, no reason, no extension point

`resolution` is a closed two-value domain enforced by a server CHECK
(`migrate_140...sql:56-58`), a JS guard (`database.js:5265`), and a pinned test
(`campaign18.migration140.test.js:27`). Any new value or reason field is a cloud
migration plus a test amendment, not a config change.

### P2. Reason-free by explicit design, twice

`HomeScreen.js:1353-1357`: "No reason is asked for, and none is inferred: an
unstated reason is UNKNOWN." `blockProgression.js:371-378`: "no mandatory
reason". This is a deliberate stance, not an oversight, and it is stated in the
code rather than only in a doc.

### P3. `because` fields are engine-derived, not user-derived

`resolveWeekSessions` returns `because` from the precedence table
(`blockProgression.js:172-177`): `not_yet_resolved`, `performed`,
`skipped_by_user`, `performed_after_skip`, `ended_early`. These describe the
inference path, not the athlete's reason. Same for
`coachPrecedence`'s `because` values (`:123, 126, 131, 154, 156, 158, 195, 198,
201, 204, 207, 209`) and `reEntryOutcome`'s (`reEntryCheck.js:144, 150, 157`).

### P4. The one omission trace that exists is not durable

`audit('workout.exercise.removed', {exerciseId})`
(`ActiveWorkoutScreen.js:996`) resolves to `track.userAction`
(`observability.js:346-348`), documented at `:324-345` as a Sentry breadcrumb
plus an on-device debug ring buffer, shipped only when an error fires. It is not
queryable, not synced, and not durable.

### P5. Adjacent reason fields exist but are not linked to a session outcome

`exercise_intent.reason` (`database.js:9748-9751`) and
`routine_exercises.selection_reason` (migrate_139) both exist and both sync.
Neither is written by, or read alongside, any session resolution.

### P6. `mesocycle_id` on a resolution is nullable and only sometimes written

`database.js:2513` (nullable), `migrate_140...sql:44` (nullable).
`HomeScreen.js:1378` writes `position.blockId`; `ActiveWorkoutScreen.js:3056`
writes `activeWorkout?.mesocycleId ?? progressionBlockId`. `getBlockTrainingData`
filters `mesocycle_id = ?` (`database.js:5101`), so a row with a null
`mesocycle_id` would not be excluded from `fullyCompletedWorkouts`.
UNVERIFIED whether a null value is reachable in practice.

### P7. `plannedIsEstimate` provenance exists but only one consumer honours it

`getWeeklySessionStats` returns `plannedIsEstimate` (`database.js:7425`) so
surfaces can avoid presenting a trailing average as a prescription
(`:7422-7424`). Only `widgets/writer.js:71` acts on it (dropping the
denominator with no plan). `CoachOutputScreen`, `WeeklyCheckInScreen`,
`weeklyStory` and `weekSignalWriter` all read `completed`/`planned` without it.

### P8. The `because` vocabulary is already rendered to users

`coachStory.js:235-239` maps hold reasons to copy. Adding a capability reason
without a copy entry would render nothing; adding one with copy is a
user-visible disclosure decision.

---

## 12 SYNC / MIGRATION ISSUES

### S1. Migration 140 header contradicts the ledger

`supabase/migrate_140_session_resolutions.sql:25-28` says
"APPLIED REMOTELY: NOT YET. Founder-gated". `supabase/README.md:340` says
"**YES - LIVE, verified 2026-08-18** (`session_resolutions` table present in
production, checked directly during the 142/143 batch)", and
`campaign18.migration140.test.js:16-22` pins the README to a verified status.
The SQL header was not updated. `database.js:2477-2481` and `sync.js:1111-1112`
also still describe the founder-gated pre-migration state.

### S2. Push is full-table, unwatermarked, and bulk-only

`_pushSessionResolutions` (`sync.js:1080-1116`) is called only from
`bulkUploadLocalData` (`sync.js:759`, function opens at `:672`). It re-reads
**every** row for the user via `getAllSessionResolutionsForUser` (which
deliberately includes tombstones, `database.js:5328-5329`) and upserts in
batches of 200 with `onConflict: 'user_id,id'`. There is no watermark advance
and no per-write queue entry; `recordSessionResolution` triggers it indirectly
through `_scheduleSync()` (`database.js:5271`).

### S3. Pull is full-table and unwatermarked

`_pullSessionResolutions` (`sync.js:2936-2952`) selects all live rows
(`deleted_at IS NULL`) with no `updated_at` filter and no
`setPullWatermark` call, unlike its siblings (compare `_pullMorningWeights`
`:2954-2974`). Every pull re-reads the user's whole resolution history.

### S4. Tombstones can be pushed but can never be pulled back

The push payload carries `deleted_at` (`sync.js:1105`), and the pull filters
`is('deleted_at', null)` (`sync.js:2940`), so a tombstone reaches the cloud but
no device learns of it by pull. There is also **no local writer that ever sets
`deleted_at`** on this table: `_upsertSessionResolutionOnDb` forces
`deleted_at = NULL` on both insert and conflict (`database.js:5240, 5247`), and
the only path that can write a non-null value is the cloud restore
(`:5382`). So the tombstone lane is currently unreachable from the device.

### S5. `session_resolutions` is NOT wiped on sign-out or account delete

`WIPE_DIRECT_TABLES` (`database.js:6060-6116`) does not list it, and none of
`wipeAllUserData`'s five steps (`:6164-6231`) reaches it — steps 1 to 4 are
FK-chained tables (`adaptation_events`, `planned_muscle_volume`,
`mesocycle_weeks`, `routine_exercises`) and step 5 iterates the allowlist only.
The table has a direct `user_id TEXT NOT NULL` column
(`:2510`), so it qualifies under the locked rule the list exists to enforce
("sign-out wipes every user-scoped table",
`src/lib/__tests__/wipeAllUserData.test.js:7`). The guard suite is an explicit
allowlist, so the omission is silent: no test fails.

### S6. `session_resolutions` is NOT in the local backup / restore set

`BACKUP_TABLES` (`database.js:6442-6486`) does not list it. `restoreAllTables`
(`:6511-6531`) `DELETE`s and reinserts only listed tables, so on a restore the
user's existing `session_resolutions` rows survive untouched while
`mesocycle_weeks` and `routines` are replaced. Whether the surviving rows still
match the restored week/routine ids is UNVERIFIED (it depends on whether the
restore preserves ids; `dumpAllTables` at `:6490-6505` dumps raw rows, which
suggests ids are preserved, but this was not executed).

### S7. The local UNIQUE index omits `user_id`; the cloud one includes it

Local: `UNIQUE (mesocycle_week_id, routine_id)` (`database.js:2522-2523`).
Cloud: `UNIQUE (user_id, mesocycle_week_id, routine_id)`
(`migrate_140...sql:60-61`). `insertOrUpdateSessionResolutionFromCloud` also
looks the existing row up **without** `user_id` (`database.js:5348-5352`).
Combined with S5 (rows survive a user switch), two accounts on one device share
one uniqueness namespace for this table. Practical collision requires colliding
week/routine ids, which are `uid()`-derived; risk is therefore low but the
asymmetry is real.

### S8. Cloud RLS requires both parents to exist and be owned

`migrate_140...sql:104-118`: the WITH CHECK requires a matching
`mesocycle_weeks` row joined to an owned `mesocycles` row, AND an owned
`routines` row. A resolution pushed for a week or routine the cloud has not yet
received (or that was deleted) is rejected. `_pushSessionResolutions` logs and
continues (`sync.js:1113`).

### S9. Sync is legacy-lane, not registry-driven

`session_resolutions` is handled by hand-written functions in `sync.js`, not by
the `src/lib/sync/` registry (`registry.js`, `transport.js`, `tables/`). It is
therefore outside the registry's watermark, conflict and telemetry machinery.

---

## 13 ANSWERS TO SPECIFIC QUESTIONS

### Q1. Complete consumer map of session completion / resolution / adherence

| # | Consumer | File:line | Input | What it decides |
|---|---|---|---|---|
| 1 | `resolveProgrammePosition` | `programmePosition.js:97-226` | routines + workouts + live resolutions | the active week, `nextSession`, `weekResolved`, `preRecoveryOutstanding`, the gated `recoveryState`, `execution` counts, `diagnostics` |
| 2 | `resolveNextSession` | `programmePosition.js:232-235` | (1) | what Home, Plans, Train and WorkoutSummary call "next" |
| 3 | `HomeScreen` next-workout tile | `HomeScreen.js:1321-1343, 2105-2106` | (1) | which routine the Start button opens; whether Skip is offered |
| 4 | `HomeScreen` recovery card | `HomeScreen.js:1175-1176, 1671-1675` | (1) `recoveryState` | whether the recovery-week card shows |
| 5 | `WorkoutSummaryScreen` "up next" | `WorkoutSummaryScreen.js:303-312` | (2) + (1) | the named next session after a finish |
| 6 | `CoachOutputScreen` recovery state | `CoachOutputScreen.js:2184-2186` | (1) | the recovery state shown on the coach tab |
| 7 | `getWeeklySessionStats` | `database.js:7370-7426` | workouts + sets + `ended_early` rows + active plan | `{completed, planned, plannedIsEstimate}` for every weekly surface |
| 8 | `runWeeklyCoach` adherence gate | `weeklyCoach.js:1179-1182` | (7) | `< 0.5` → the entire week's coaching becomes a stabilise hold |
| 9 | `getPerformanceScore` | `weeklyCoach.js:342-351` | (7) + PRs + slope + self-report | the performance axis of the autoregulation matrix (1..4) |
| 10 | `weeklyCoach` "what's working" | `weeklyCoach.js:2186-2190` | (7) | whether the athlete is told they showed up |
| 11 | `trainingExecutionFact` | `coachContext.js:133-147` | (7) or block counts | GOOD / POOR / UNKNOWN |
| 12 | `trainingProgressFact` | `coachContext.js:155-162` | (11) | whether progress may be judged at all |
| 13 | `classifyTrainingLimiter` | `coachPrecedence.js:189-210` | (11) | PLAN / EXECUTION / RECOVERY / INSUFFICIENT_EVIDENCE |
| 14 | `chooseInterventions` | `coachPrecedence.js:264-317` | (13) | the largest allowed intervention + hold reasons |
| 15 | `coordinateChanges` | `coachPrecedence.js:380-427`, called `weeklyCoach.js:1742` | (13) | whether a calorie change and/or a volume ADD may land |
| 16 | `conflictOutcome` | `coachPrecedence.js:440-476` | (13) | `mayClaim` / `mustRemainUnknown` / `mustHold` |
| 17 | `coachStory` | `coachStory.js:58-65, 117-126, 215-224, 235-239, 254-261` | (11)(13) | the explanation sentences |
| 18 | `coachResponse` | `coachResponse.js:76-78, 260-303, 316-334` | coach output `sessionsCompleted/Planned` | the acknowledgement, the cue, the forward line |
| 19 | `coachRegister` (precise voice) | `coachRegister.js:100-101, 187-243` | same | the precise-register equivalents |
| 20 | `coachOutput/viewCopy` | `viewCopy.js:44-92` | same | "what went off" list; the week's focus line |
| 21 | `weeklyStory.buildTrainingChapter` | `weeklyStory.js:50-62`, called `WeeklyStoryScreen.js:79-94` | (7) | the Your Week training paragraph |
| 22 | `deriveTrainingPerformance` | `checkinDerive.js:74-100`, called `WeeklyCheckInScreen.js:487-493` | (7) + PRs + volume delta | the pre-selected check-in chip and its plain-language verdict |
| 23 | `blockAdvisor` | `blockAdvisor.js:632-655` | `fullyCompletedWorkouts` | `executionJudgeable`, which gates every exercise slot verdict at block end |
| 24 | `planAutoGen.structureEvidence` | `planAutoGen.js:203-220` | `fullyCompletedWorkouts` | whether a finished block teaches structure |
| 25 | `interBlock.classifyMuscleBlock` | `interBlock.js:184-186, 321-325` | `completedSets/plannedSets` | per-muscle INSUFFICIENT_DATA vs a real classification, and next block's start/peak |
| 26 | `blockLedgerRunner` | `blockLedgerRunner.js:308, 332, 374-375` | `training.sets`, `training.workouts` | the adherence pair handed to (25) |
| 27 | `buildCoachLedger` | `coachLedger.js:119-125`, via `CoachOutputScreen.js:2156-2163` | `completedSessions` | the hold-receipt sessions row |
| 28 | `resolveEvidencePanel` | `home/evidencePanel.js:117-135` | `completedSessions` / `sessionsSinceCheckin` | the Home evidence pane's sessions row |
| 29 | `selectTrialVariant` / `trialDay3Push` | `trialActivation.js:93-131`, wired `notifications/scheduler.js:823-841` | completed sessions since trial start | which day-3 trial push fires |
| 30 | `resolveActivationNudge` | `activationNudge.js:64-94`, wired `scheduler.js:48` | completed-session timestamps | which re-engagement push and Home banner fires |
| 31 | `reEntryCheckDue` | `reEntryCheck.js:82-99`, wired `HomeScreen.js:1413-1420` | last completed workout timestamp | whether the welcome-back question is asked |
| 32 | `weekSignalWriter.computeCurrentWeekState` | `weekSignalWriter.js:60-110` | (7) + deload + pause + ED flag | the partner's ticks, `weekMet`, `resting`/`training`, milestone booleans |
| 33 | `widgets/writer.gatherWidgetInputs` | `widgets/writer.js:57-81` | (7) | the OS home-screen widget's session line |
| 34 | `ReadinessCards` | `ReadinessCards.js:155-170` | all completed workouts with >= 1 set | lifetime session milestones and the recovery gauges' population |
| 35 | `milestones.js` | `milestones.js:11-80` | lifetime completed-session count | which celebration card fires |
| 36 | `trainingHabitSchedule` | `trainingHabitSchedule.js:1-30` | completed-workout weekdays | which weekdays get a training reminder |
| 37 | `getDeloadWeeksInRange` | `database.js:7352-7368` | completed workouts joined to `is_deload` weeks | which weeks count as resting for (32) |

### Q2. For EACH consumer: what does today's code conclude when the omission was physical?

Grouped by identical mechanism to keep every claim scoped to what was checked.

**Group A — reads `getWeeklySessionStats` (consumers 7, 8, 9, 10, 18, 19, 20, 21, 22, 27, 28, 32, 33).**
Conditions that fire: `completed` is reduced by one for a skip; reduced by one
for an ended-early session (`database.js:7381-7386`); **unchanged** for an
exercise-removal or Time Crunch trim. `planned` never moves.
Misclassification: for skips and ended-early sessions, involuntary
non-performance is scored as voluntary non-adherence, producing the directive
copy of C7, the `'dropped'` chip of C8, a `weekMet: false` partner tick (C14)
and an undercounted widget (C15). For removals and Time Crunch, the opposite:
full compliance is asserted for a session where prescribed work did not happen
(C3, C4).

**Group B — the limiter chain (consumers 11, 12, 13, 14, 15, 16, 17).**
Conditions: `ratio < 0.6` → POOR → `{limiter: EXECUTION, because:
'sessions_missed'}` (`coachPrecedence.js:197-199`). `planned < 2` or a null
count → UNKNOWN → `INSUFFICIENT_EVIDENCE, because: 'execution_unknown'`
(`:194-196`). Misclassification: the reason string asserts the athlete missed
sessions. Progress is then forced UNKNOWN, no plan finding can form, and volume
ADDs are blocked. Note the safety direction is intact: a volume REDUCTION is
never withheld (`:391, 404`), and `coachStory.js:118` says the programme "stays
as it is" rather than blaming the athlete's body.

**Group C — block-boundary learning (consumers 23, 24, 25, 26).**
Conditions: `executionJudgeable` requires `SIGNAL.GOOD`, i.e. ratio >= 0.8 over
`weeks * routines` (`blockAdvisor.js:638-644`); `interBlock` needs
`completedSets/plannedSets >= 0.6` per muscle (`interBlock.js:321`).
Misclassification: a restricted athlete's block is permanently unjudgeable, so
(a) no exercise is ever replaced for them (verdict forced KEEP), (b) the block
teaches nothing structurally (`planAutoGen.js:212`), and (c) each restricted
muscle is proposed back at the research-table seed with the rationale naming
adherence (`interBlock.js:323-324`). Over successive blocks this is a ratchet
toward the generic prescription with no capability explanation anywhere in the
ledger.

**Group D — programme position (consumers 1, 2, 3, 4, 5, 6).**
Conditions: a resolution of either kind sets `isResolved` true
(`blockProgression.js:72-76`) and the programme stops re-offering the session.
No misclassification of position occurs: this is the one place that treats
skipped, ended-early and completed as genuinely different states and records
which (`state` + `because` + `rule`). The gap is that `executionSummary`'s
honest counts are never surfaced (section 5.4), so the distinction dies inside
the resolver.

**Group E — re-engagement and reminders (consumers 29, 30, 31, 36).**
Conditions: 29/30 count completed sessions in fixed early-life windows
(`activationNudge.js:69-90`; `scheduler.js:823-841`); 31 fires on a 14-day gap
scaled by sessions-per-week (`reEntryCheck.js:49-56, 91-93`); 36 rebuilds the
reminder weekdays from completed-workout habit.
Misclassification: 29 and 30 chase an athlete whose condition prevents training
in their first fortnight, with copy documented as non-shaming
(`activationNudge.js:26-28`) and a hard stop at day 17 (`:92`). 31 asks the
welcome-back question, whose available answers (C12) cannot express a
restriction. 36 makes no adherence judgement; it only follows observed
weekdays.

**Group F — celebration and counts (consumers 34, 35).**
Conditions: any `is_completed = 1` workout with at least one set
(`ReadinessCards.js:163-168`); lifetime thresholds in `milestones.js:54-80`.
Misclassification: none in the punitive direction, but an ended-early session
counts here and does not count in Group A, so the same session is simultaneously
"a session" on the milestone card and "not a session" on the coach card.

**Group G — `getDeloadWeeksInRange` (consumer 37).**
Conditions: a week is resting only if a completed workout in it links to a
`mesocycle_weeks` row with `is_deload = 1` (`database.js:7355-7360`). The
comment at `:7348-7351` names the known gap: a deload week with zero logged
sessions cannot be detected.
Misclassification: a capability-driven rest week is not a deload week and
therefore never reads as resting.

### Q3. Does session resolution or any omission path carry a reason / provenance today?

**No.** Full value domains, exhaustively:

- `session_resolutions.resolution` ∈ `{'skipped_by_user', 'ended_early'}`.
  Enforced at `migrate_140...sql:56-58` (server CHECK), `database.js:5265`
  (writer guard), `blockProgression.js:60-63` (`EXPLICIT_RESOLUTIONS`),
  `campaign18.migration140.test.js:27`. **No reason, category, note, severity or
  free-text column exists in either schema** (`database.js:2508-2521`;
  `migrate_140...sql:39-52`).
- `SESSION_STATE` ∈ `{'outstanding','completed','skipped_by_user','ended_early'}`
  (`blockProgression.js:52-57`).
- Resolver `because` ∈ `{'not_yet_resolved','performed','skipped_by_user',
  'performed_after_skip','ended_early'}` (`blockProgression.js:172-177`) —
  engine-derived, not user-supplied.
- Resolver `conflict` ∈ `{'ended_early_with_later_completion'}` (`:177`).
- `position.source` ∈ `{'outstanding_required_session','all_reached_weeks_resolved'}`
  (`programmePosition.js:163, 165`).
- `position.diagnostics[].kind` ∈ `{'session_conflict'}` (`:154`).
- Exercise-removal: no persisted record at all; one Sentry breadcrumb
  (`ActiveWorkoutScreen.js:996`).
- Time Crunch: `_timeCrunchSkipped` boolean, in-memory only.
- Nearest reason-bearing neighbours, none linked to a session outcome:
  `exercise_intent.reason` free text, kinds `{'excluded','avoided_block',
  'pattern_avoid'}` (`database.js:9728-9738, 9748-9751`);
  `exercise_swaps.scope` `{'just_this_time','persistent'}` with no reason
  (`database.js:9842-9856`); `routine_exercises.selection_reason` (build-time);
  `adaptation_events.reason_code`/`reason_text` (engine decisions).
- Nearest user-answer vocabulary: `RE_ENTRY_ANSWER` ∈
  `{'trained_elsewhere','did_not_train','continue'}` (`reEntryCheck.js:59-63`),
  with outcomes `{'athlete_reports_training_elsewhere',
  'athlete_reports_no_training','athlete_chose_to_continue'}` (`:144, 150, 157`).

### Q4. Which tests pin these semantics?

Full table in section 8. The load-bearing ones for this domain:

- `src/lib/__tests__/blockProgression.test.js` — the precedence table
  (including "covers every combination exactly once", `:149-153`), the total
  ordering, and CASE 22 "resolved is not the same as completed" (`:372-388`).
- `src/__tests__/blockProgression.production.test.js` — the real resolver
  against production row shapes, including CASE 21 "a resolved week is NOT 'you
  completed all your workouts'" (`:170`).
- `src/lib/__tests__/campaign18.hostileLifecycle.test.js:171-213` — the two
  adherence exclusions (`fullyCompletedWorkouts`, and the weekly SQL's
  `NOT EXISTS ... ended_early`). Note `:198` and `:205` assert the SQL *text*,
  so changing the exclusion mechanism breaks these by design.
- `src/lib/__tests__/campaign18.migration140.test.js` — the two-value CHECK, the
  absence of `'completed'`, the trigger, the RLS, and the README status row.
- `src/lib/__tests__/checkinCoachAudit.guard.test.js:60-69` — ALGO-002 source
  guard: `planned` must come from the active plan's routine count.
- `src/lib/__tests__/coachCoherenceTrace.test.js:255-285` — the EXECUTION
  limiter's negative controls, and the "a session needs real sets" source guard.
- `src/__tests__/coachValidation/residueClosure.test.js:75-110` (T-SESSION-02)
  and `scenarios.training.data.js:575-671` — oracle-locked resolution scenarios,
  including the Time-Crunch-skipped case at `:670-671`.
- `src/__tests__/todayTruthRepair.guard.test.js:97-156` — the retired run/streak
  construct must not reappear; the widget keeps a factual count only.
- `src/lib/__tests__/wipeAllUserData.test.js` — the wipe allowlist, which does
  **not** include `session_resolutions` (S5).

No test pins any reason, provenance or capability semantics on any omission
path, because none exists.

### Q5. Are prescribed-but-not-performed sets visible to any consumer as a distinct signal?

**Only once, at week-and-muscle granularity, and with no reason attached.**

- **Yes, at muscle level:** `interBlock.classifyMuscleBlock` receives
  `adherence: {completedSets, plannedSets}` (`blockLedgerRunner.js:374-375`),
  computed by `sumPlannedSets` over `planned_muscle_volume.planned_sets`
  (`blockLedgerGather.js:250-257`) and `sumCompletedSets` over allocated
  non-warmup working sets (`:265-283`). The shortfall is a real, distinct signal:
  it produces `{signal:'adherence_ratio', value:…}` in the evidence trail
  (`interBlock.js:197`) and, below 0.6, `{signal:'insufficient',
  value:'adherence'}` plus a rationale naming the percentage
  (`:321-325`). It is a whole-block, whole-muscle ratio; it cannot say which
  exercise, which session, or why.

- **Yes, transiently, inside the live session only:**
  `shouldConfirmBeforeFinish` (`workoutHelpers.js:64-71`) computes "a planned
  exercise has zero sets" and `ActiveWorkoutScreen.js:3023-3025` computes
  `performed`/`unperformed`. Both read the in-memory `workoutExercises`
  array; the outline strip renders `{done, total, skipped}` per exercise
  (`ActiveWorkoutScreen.js:3197-3212`). None of it is persisted. The only thing
  that survives the finish is the two-value `resolution` row.

- **No, at exercise level after the fact:** there is no per-workout snapshot of
  prescribed exercises or prescribed set counts (section 4.3). After the session
  closes, an exercise that was prescribed and not performed is indistinguishable
  from an exercise that was never prescribed — both are simply absent from
  `workout_sets`.

- **No, at set level:** `workout_sets.missed_reps` (`database.js:476`) records
  reps missed **within a performed set**, not sets not performed. A set that was
  prescribed and not attempted has no row.

- **No, for a session omitted from a completed week:** the whole-session case is
  covered by `session_resolutions`, which is exactly the two-value domain of Q3;
  the honest per-state counts do exist in `executionSummary`
  (`blockProgression.js:326-337`) but reach no consumer.

---

## 14 UNKNOWN / UNVERIFIED

1. **Production data shape.** No query was run against the live Supabase project
   or any device database. The distribution of `skipped_by_user` vs
   `ended_early` rows, and whether any row carries a null `mesocycle_id`, is
   UNVERIFIED (P6).
2. **Whether `restoreAllTables` preserves row ids** such that surviving
   `session_resolutions` rows still match restored `mesocycle_weeks` and
   `routines` ids after a backup restore (S6). `dumpAllTables`
   (`database.js:6490-6505`) dumps raw rows, which suggests ids are preserved,
   but this was not executed.
3. **Whether migration 140's `refuse_stale` trigger and RLS policy behave as
   written in production.** Read-only SQL inspection; not executed. The README
   ledger row (`supabase/README.md:340`) reporting the table LIVE is REPORTED,
   not verified here.
4. **`_timeCrunchSkipped` persistence across an app kill.** The flag lives on
   `workoutExercises` in the Zustand store; `src/store/__tests__/activeWorkoutPersistence.test.js`
   exists but was not read, so whether a restored draft retains the flag is
   UNVERIFIED. If it does not, a Time-Crunch session resumed after a kill would
   take the ENDED_EARLY branch instead of the silent-completion branch.
5. **Whether any Supabase Edge Function, view or scheduled job reads
   `session_resolutions`.** Only the app tree was searched; the
   `supabase/functions` surface was not enumerated.
6. **The native widget's rendering of the consistency block.** Only the JS
   snapshot contract (`lib/widgets/snapshot.js:64-76`) and the guard test's
   assertions about `VolyumeHomeWidgets.swift`
   (`todayTruthRepair.guard.test.js:158-161`) were read; the Swift source was
   not.
7. **Whether the campaign-21 GRAPH-TRAINING.md rule ids used here
   (T-WEEKLY-08, T-SESSION-02) are still current** beyond the two sections
   quoted (`GRAPH-TRAINING.md:296-335`, `residueClosure.test.js:75`). The rest of
   the graph was not verified line by line against code.
8. **No test run.** This audit is read-only; `npm run lint && npm test` was not
   executed and no claim is made about the tree's green/red status.
