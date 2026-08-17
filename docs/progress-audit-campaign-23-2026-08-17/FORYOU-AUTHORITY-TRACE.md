# "For You" Feed — Hostile Authority Trace

Campaign 23, Phase 1, Steps 8-10. Tracing agent output. Evidence-first,
file:line for every claim. No recommendations beyond the required
classification verdicts — rulings belong to the lead.

Traced against Campaign 20 law (`src/lib/livePrescription.js`,
`resolveSetPrescription`, wired at `src/screens/ActiveWorkoutScreen.js:66,
1693, 2051, 2188, 3046`) and Campaign 21 law (`src/lib/weeklyCoach.js`,
`src/lib/coachApply.js`, `src/lib/planEngine.js` MEV/MRV/MAV landmarks,
`src/lib/mesocycle.js`).

---

## 0. Render site and generator — located

- Render site: `src/screens/AnalyticsScreen.js:480-488`. Heading is literally
  `<SectionLabel>For you</SectionLabel>` (line 483 — sentence case "For you",
  not "For You"). Guarded by `insights.length > 0` (line 481); maps
  `insights` to `<InsightRow>` (line 484-486).
- `InsightRow` component: `src/screens/AnalyticsScreen.js:725-747`. Renders
  `insight.copy` verbatim (line 734), a severity-coloured left border/icon
  (line 728-729, 732-733), and a dismiss (×) button only (line 735-744,
  `onDismiss={() => handleDismiss(ins.id)}`). **No tap-through of any kind**
  — `insight.actionPayload` is stored and round-tripped (see §Persistence
  below) but is never read by any UI component; grep for `actionPayload`
  across `src/` (excluding lib/db/sync) returns zero UI consumers.
- Severity → visual style: `src/screens/AnalyticsScreen.js:45-51` —
  `0: info icon, colors.primary` / `1: alert icon, colors.warning` /
  `2: warning icon, colors.error`. **`recovery_warn` and `deload_due` (both
  severity 2) render in the app's error/red colour**, the same visual
  register as a warning/alarm, despite carrying no gating (§6).
- Generator: `src/lib/insightsEngine.js` (239 lines), read in full.
  Header (line 1-12): "Deterministic, explainable rule engine that surfaces
  'For You' insight cards... Persistence (user_insights table) is handled
  by the database layer." Six rules, `generateInsights()` (line 60-230).
- Literal copy fragments confirmed as exact production strings:
  - `"hasn't had much work in 3 weeks. Adding a set or two this week will get it growing again."` — line 104 (grammar error "traps hasn't" comes from `MUSCLE_DISPLAY_NAMES[muscleKey]` being pluralised inconsistently upstream; this module just interpolates the name and always uses "hasn't", singular verb, regardless of the muscle name's grammatical number).
  - `"Time to add a little weight next session."` — line 142.
  - `"has been stuck at the same weight for 4 sessions but you've had reps left in the tank. Push closer to your limit or nudge the weight up."` — line 161.
  - `"Your soreness coming into sessions is trending up week-on-week. Prioritise sleep and protein. If it keeps climbing, a lighter week is coming."` — line 177.
  - `"Your training load and fatigue are both running high. A lighter week soon will help you come back fresh. It's not a setback, it's part of the plan."` — line 205.
  - `"You've trained {n} of the last 21 days. Steady work. This is what progress looks like."` — line 223.

---

## 1-2. Message classes — full field set

### Class 1 — `under_mev_muscle`

- **SOURCE FUNCTION**: `src/lib/insightsEngine.js:82-109` (Rule 1), fires once
  per under-target muscle.
- **PRODUCTION CALLER CHAIN**: `AnalyticsScreen` mounts/focuses →
  `useProgressData.load()` (`src/hooks/useProgressData.js:134-192`) →
  `loadInsights()` (line 256-261) → `runInsightsEngine(user.id)`
  (`src/lib/database.js:5867-5890`) → `generateInsights(...)` (line
  5881-5883) → `persistInsights` + `getActiveInsights(userId, 3)`. Trigger is
  **Progress-tab focus** (`useFocusEffect(useCallback(() => { load(); },
  [user?.id]))`, `useProgressData.js:109`) — screen load/every re-focus, not
  workout-finish, not a weekly job. No other call site of
  `runInsightsEngine` exists anywhere in `src/` (single hit, grep-confirmed).
- **INPUT EVIDENCE**: last 28 days of `workout_sets` via
  `getWorkoutSetsSince(userId, cutoff, {completedOnly:false})`
  (`database.js:5874-5877`, `cutoff = Date.now() - 28d`), `getAllWorkouts`,
  `getAllExercises`. Rule reads 3 rolling 1-week windows of sets, sums
  working sets per muscle via `calculateWeeklyVolume` against
  `VOLUME_LANDMARKS` from `src/lib/algorithms.js` (imported
  `insightsEngine.js:14`) — **the same landmark table `planEngine.js`
  imports** (`src/lib/planEngine.js:8`, confirmed same source, no divergent
  copy). Gated on a 3-week training base (`hasThreeWeekBase`,
  `insightsEngine.js:79-80`: ≥6 completed sessions spanning ≥3 weeks).
- **PERSISTENCE**: SQLite `user_insights` (schema `database.js:393-403`,
  index `database.js:420`). Row per `insight_key` = `under_mev_${muscleKey}`
  (line 105). Synced to Supabase `user_insights` via `sync.js:1346-1366`
  (`_pushUserInsights`, upsert on `user_id,id`, batches of 200) and pulled
  via `insertOrUpdateUserInsightFromCloud` (`database.js:9154-9179`).
- **DISMISSAL**: yes, via the × button → `handleDismiss` (`useProgressData.js
  :487-490`) → `dismissInsight(insightId)` (`database.js:5849-5861`, sets
  `dismissed_at = Date.now()`). Multi-device dismissal ratchet: a cloud pull
  with `dismissed_at IS NULL` can never clear a local dismissal
  (`database.js:9157-9166`, comment cites "C6 F5 (D97)").
- **EXPIRY**: no time-based expiry. Retires only when the underlying
  condition stops recomputing true: `persistInsights` (`database.js:5773-
  5829`) deletes any non-dismissed row whose key is absent from the
  freshly-generated set (line 5781-5795) — i.e. it disappears the next time
  Progress is opened and the 3-week-low condition no longer holds for that
  muscle. A **dismissed** row is suppressed from resurrection for 14 days
  (`database.js:5805-5808`), then can reappear if the condition still holds.
- **WHEN CREATED / RETIRED**: created on first Progress-tab focus where the
  rule fires; retired (deleted, if never dismissed) on the first focus after
  the muscle is no longer under MEV for 3 rolling weeks, or dismissed by the
  user (14-day snooze, not a permanent delete).
- **ACTION**: none — `actionPayload: { muscle: muscleKey }` is generated
  (`insightsEngine.js:106`) and persisted, but no UI reads it (§0).
- **OBSERVATION vs PRESCRIPTION**: PRESCRIPTIVE. "Adding a set or two this
  week will get it growing again" is a direct volume instruction, not a
  bare observation.
- **OWNING AUTHORITATIVE ENGINE**: `planEngine.js` owns MEV/MRV/MAV volume
  landmarks and `weeklyCoach.js` / `coachApply.js` own the actual decision to
  change a user's programmed volume. Neither is consulted by this rule — see
  §4 verdict.

### Class 2 — `peaked_lift`

- **SOURCE FUNCTION**: `insightsEngine.js:131-148` (Rule 2, within the loop
  at line 119-166).
- **CALLER CHAIN**: identical to Class 1 (same `generateInsights` call).
- **INPUT EVIDENCE**: last 4 day-sessions of sets for the exercise
  (`sessionsByDay`, line 38-50, grouped from the 28-day window), each
  session's `topSetOf` (highest weight, tie-break highest reps, line 25-36).
  Compares against `ex.defaultRepMax` — a **static per-exercise library
  column** `default_rep_max` (`database.js:207,1165`; mapped
  `defaultRepMax: row.default_rep_max` at `database.js:4009`), **not** the
  user's live prescribed band (`prescription.repsMax` in
  `livePrescription.js`, which is plan/mesocycle-derived and can legitimately
  differ, e.g. under a deload). Peaked = last 2 of the 4 sessions both have
  `reps >= repMax` AND `rir >= 1` (line 134-138); a missing/null `rir`
  defaults to `9` (`t.rir ?? 9`, line 136) — i.e. **absence of an RIR
  reading is treated as maximal room left**, biasing toward firing.
- **PERSISTENCE**: `user_insights`, key `peaked_${exId}` (line 143). Same
  table/sync/dismissal/expiry mechanics as Class 1.
- **DISMISSAL / EXPIRY**: identical mechanics to Class 1.
- **ACTION**: `actionPayload: { exerciseId: exId }` (line 144) — generated,
  persisted, never consumed by any UI (§0).
- **OBSERVATION vs PRESCRIPTION**: PRESCRIPTIVE. "Time to add a little
  weight next session" is a direct load-progression instruction.
- **OWNING AUTHORITATIVE ENGINE**: `livePrescription.js`
  `nextSessionOpeningLoad` §10.1 ADVANCE branch
  (`livePrescription.js:230-249`), provenance
  `LOAD_ADVANCE_RANGE_TOPPED`. See §3 collision verdict — Class C.

### Class 3 — `stalled_lift`

- **SOURCE FUNCTION**: `insightsEngine.js:150-165` (Rule 3, same exercise
  loop as Class 2, `continue`d past if `peaked_lift` already fired for that
  exercise — line 146).
- **CALLER CHAIN**: identical to Class 1.
- **INPUT EVIDENCE**: same 4-session `tops` array as Class 2. "Flat" = all 4
  sessions' top set share identical weight AND identical reps
  (line 151-156). `avgRir` across the 4 tops must be `>= 3`
  (line 157-158) — here a missing `rir` defaults to `0` (`t.rir ?? 0`,
  line 157), the **opposite** default bias from Class 2 (favours NOT
  firing when RIR is unlogged, whereas Class 2 favours firing).
- **PERSISTENCE**: key `stalled_${exId}` (line 162). Same mechanics as
  Class 1.
- **ACTION**: `actionPayload: { exerciseId: exId }` (line 163) — same
  dead-payload situation as Class 2.
- **OBSERVATION vs PRESCRIPTION**: Mixed — states a fact ("stuck at the same
  weight for 4 sessions... reps left in the tank") then offers a choice
  ("Push closer to your limit **or** nudge the weight up") rather than a
  single direct instruction. Less prescriptive than Class 2, but still not a
  pure observation — it recommends two possible actions.
- **OWNING AUTHORITATIVE ENGINE**: closest overlap is
  `livePrescription.js`'s ordinary continuation path
  (`MATCH_LOAD_ADD_REP`, line 251-253) plus `expectedReps`
  (line 314-324), which already auto-increments the **rep target** by design
  (`clamp(Math.min(E + 1, band.max), ...)`, line 953) each session when in
  band. There is no dedicated "stalled" provenance code among the 13 §17
  codes (`livePrescription.js:52-66`), so this class has no single owning
  function to display — it is describing a pattern the resolver's own
  session-by-session rep-target escalation should already be counteracting.

### Class 4 — `recovery_warn`

- **SOURCE FUNCTION**: `insightsEngine.js:168-181` (Rule 4).
- **CALLER CHAIN**: identical to Class 1.
- **INPUT EVIDENCE**: `w.soreness24hBefore` across workouts in the 28-day
  window, fed to `emaWeekOverWeekPct` (`src/lib/recoveryEMA.js:68-80`, a
  time-decayed EMA with a 7-day half-life, `recoveryEMA.js:11`). Fires if the
  week-over-week % change is `>= 18` (line 174).
- **PERSISTENCE**: key `recovery_warn` (fixed, one row per user; line 178).
- **ACTION**: `actionPayload: { sorenessWoW: Math.round(sorenessWoW) }`
  (line 179) — dead payload, same as other classes.
- **OBSERVATION vs PRESCRIPTION**: Mixed — states a trend, then instructs
  ("Prioritise sleep and protein") and forecasts a future coach action
  ("If it keeps climbing, a lighter week is coming").
- **OWNING AUTHORITATIVE ENGINE**: `weeklyCoach.js`'s own recovery/deload
  machinery (§4 below) reads a **different** soreness/recovery signal — the
  weekly check-in's `consecutivePoorRecoveryWeeks` / `matrixDeload`
  (`weeklyCoach.js:1859-1862`), not a per-workout `soreness24hBefore` EMA.
  The "a lighter week is coming" line is a forward-looking claim about a
  decision this module does not own and cannot see the state of (§4).

### Class 5 — `deload_due`

- **SOURCE FUNCTION**: `insightsEngine.js:183-209` (Rule 5).
- **CALLER CHAIN**: identical to Class 1.
- **INPUT EVIDENCE**: (a) 4 rolling weekly windows of sets; a week counts as
  "over" if **any** muscle's `workingSets > VOLUME_LANDMARKS[m].mrv`
  (line 192-197); fires if `overMrvWeeks >= 2` (across the trailing 4
  weeks, not necessarily consecutive). (b) `computeRecoveryEMAs(...).fatigue`
  (`recoveryEMA.js:47-58`, from `w.fatigueLevel`, a **per-workout
  self-report**, EMA half-life 7 days) — fires alone if `fatigue >= 4.3`
  (line 202). Either condition alone is sufficient (`||`, line 202).
- **PERSISTENCE**: key `deload_due` (fixed; line 206).
- **ACTION**: `actionPayload: { overMrvWeeks, fatigue: ... }` (line 207) —
  dead payload.
- **OBSERVATION vs PRESCRIPTION**: PRESCRIPTIVE-ADJACENT — "A lighter week
  soon will help you come back fresh" reads as an impending coaching
  decision stated as near-fact, not framed as advice the user should act on
  themselves (contrast Class 4's "prioritise sleep").
- **OWNING AUTHORITATIVE ENGINE**: `weeklyCoach.js`'s deload-suggestion block
  (`weeklyCoach.js:1854-1871`) is the actual authority that decides and
  applies a lighter week (`deloadTriggers >= 2` from four **entirely
  different** signals: `consecutivePoorRecoveryWeeks >= 2`, `matrixDeload`
  (from the weekly recovery-grade matrix, line 386-409), `weeksInPhase >= 6
  && phase.isCut`, `sleepHours < 6 && poorEnergy`). See §3/§4 verdicts —
  Class C, with a concrete Class E scenario.

### Class 6 — `gentle_rhythm`

- **SOURCE FUNCTION**: `insightsEngine.js:211-227` (Rule 6). Comment: "info,
  never a threat" (line 211).
- **CALLER CHAIN**: identical to Class 1.
- **INPUT EVIDENCE**: count of distinct trained calendar days in the last 21
  days (`trainedDays`, line 212-219); fires if `>= 4`.
- **PERSISTENCE**: key `gentle_rhythm` (fixed; line 224).
- **ACTION**: `actionPayload: { count: trainedDays.size }` (line 225) — dead
  payload.
- **OBSERVATION vs PRESCRIPTION**: pure OBSERVATION/affirmation. "Steady
  work. This is what progress looks like." No instruction, no forecast.
- **OWNING AUTHORITATIVE ENGINE**: none — this class doesn't overlap any
  authoritative decision; it is praise/reflection only. Not in scope for a
  collision verdict.

---

## 3. Campaign 20 collision verdict — load-progression classes

| Class | Verdict | Evidence |
|---|---|---|
| `peaked_lift` | **C — legacy independent decision** | Uses `ex.defaultRepMax` (static exercise-library column, `database.js:207/1165/4009`), not the resolver's live `prescription.repsMax` band. Checks only the **last 2** of 4 sessions' top reps and a per-set `rir >= 1` (`insightsEngine.js:134-138`), defaulting missing RIR to 9. The resolver's ADVANCE rule (`livePrescription.js:230-249`, §10.1) instead requires the **single most recent comparable** session to be `topped` with **no missed set at W**, gated on **session `difficulty` 1-3** (`sd >= 1 && sd <= 3`, line 235-237) — a completely different corroborating signal (post-session effort rating, not per-set RIR) — and explicitly does NOT advance when effort is very hard (`HOLD_EFFORT_VERY_HARD`, line 246) or unknown (`HOLD_EFFORT_UNKNOWN`, line 248). `insightsEngine` has no equivalent hold branch: it always instructs "add weight" once its own 2-session/RIR condition is met, with zero knowledge of session difficulty, deload/re-entry/readiness state, or prior missed sets at W. |
| `stalled_lift` | **C — legacy independent decision** (weaker/mixed instruction) | No corresponding provenance code exists in `livePrescription.js`'s §17 vocabulary; the resolver already auto-escalates the rep target session-over-session in-band (`expectedReps`, line 314-324, `E+1` clamp) using its own history/decline-curve logic, which `insightsEngine`'s flat-4-session check does not read at all. Own thresholds: exact same weight+reps for 4 sessions AND avgRIR≥3 (`insightsEngine.js:151-158`). |
| `deload_due` (as a load-progression-adjacent signal — also assessed under §4) | **C / E** | See §4 table; also touches load progression indirectly by promising "a lighter week", a resolver-relevant state (`senior.isDeload`, `blockFinished`, `readinessTweak`, `layoffDays` — `livePrescription.js:126-138, 372-393, 821-847, 961-969` all suppress/soften ADVANCE under these; `insightsEngine.js` reads none of them). |

**MATERIAL DEFECT M1** (peaked_lift, Class C): fires ADVANCE-equivalent
instructions from a different rep-range source (static exercise-library
`default_rep_max`) than the resolver's live prescribed band, and from a
different corroborating signal (per-set RIR, default-true when absent) than
the resolver's session-difficulty gate — so the two can disagree on whether
"add weight" is warranted for the identical exercise/session history.
Evidence: `insightsEngine.js:123,132-148` vs `livePrescription.js:230-249`.

**MATERIAL DEFECT M2** (peaked_lift/stalled_lift, Class D-adjacent —
dead action payload): both classes construct
`actionPayload: { exerciseId: exId }` (`insightsEngine.js:144,163`),
persisted end-to-end through SQLite and Supabase
(`database.js:5814-5827,5842-5844`; `sync.js:1354`), but no screen ever reads
it (`InsightRow`, `AnalyticsScreen.js:725-747`, has no `onPress`/navigation
using it). A user who wants to act on "Time to add a little weight" has no
in-card path to the exercise's history or the live prescription; they must
dismiss or navigate away manually.

**MATERIAL DEFECT M3** (Class E, concrete scenario — construct):
`peaked_lift`/`stalled_lift` read raw `workout_sets` over the last 28 days
with **no filter for deload/re-entry/readiness-reduced sessions**
(`insightsEngine.js:60-68`, `112-166` — no `senior`/`isDeload`/mesocycle-week
argument anywhere in the function signature or body). Concrete conflict: a
user finishes a deload week where the prescribed band was deliberately
widened/lightened (`livePrescription.js` §1 senior deload branch, line
877-892, which serves `deloadTargets` rows directly, bypassing normal
band/effort logic) and hits the top of that *lightened* band twice — the
static `default_rep_max` check in `insightsEngine.js:132-138` can still
classify this as "peaked" and fire "Time to add a little weight next
session," while the resolver, still in `SENIOR_RECOVERY_HOLD` for that same
exercise, would refuse to advance and caps the opening load at the last
comparable top (`livePrescription.js:832-847`). Two directly opposed
instructions for the same lift in the same week.

---

## 4. Programme/volume collision verdict — `under_mev_muscle` ("add a set or two")

| Signal | `insightsEngine.js` (Rule 1) | `weeklyCoach.js` / `planEngine.js` |
|---|---|---|
| Landmark source | `VOLUME_LANDMARKS` from `src/lib/algorithms.js` (line 14) | Same import, `planEngine.js:8` — **not divergent** on the raw MEV numbers |
| Decision logic | 3 rolling calendar weeks each below muscle's `mev`, `hasThreeWeekBase` gate only (`insightsEngine.js:79-108`) | `weeklyCoach.js`'s `volumeDelta`/`trainingSignal` matrix (`weeklyCoach.js:386-409`) and the deload-suggestion block (`1854-1871`) drive actual programmed-volume changes via `coachApply.js`, gated on recovery check-ins, phase, sleep — not a raw 3-week set-count scan |
| Deload/recovery-week awareness | **None.** No parameter for `currentMesoWeek.isDeload`, `senior.isDeload`, or any coach-applied adjustment reaches `generateInsights` (`insightsEngine.js:60`, confirmed by full-file read: the only inputs are `workouts, sets, exerciseMap, now`) | `weeklyCoach.js` deload block explicitly composes with mesocycle phase/week state; `mesocycle.js`'s `is_deload` week flag is the authoritative "this week is deliberately light" signal, surfaced to `useProgressData.js` as `currentMesoWeek.isDeload` (`database.js:4774`, wired at `useProgressData.js:96,105,237-254`) but **never passed to `runInsightsEngine`** (`useProgressData.js:256-261`, `database.js:5867-5883` — only reads workouts/sets/exercises) |
| Calm mode / ED flag | **None** — grep for `calmMode`/`isCalm`/`edFlag`/`wellbeing` across `insightsEngine.js`, `useProgressData.js`, and the `user_insights` code paths in `database.js` returns zero hits | `isCalm()` (`wellbeing.js:45-47`) is consulted in 30+ other files including `HomeScreen.js`, `ProgressPhotosScreen.js`, `notifications/scheduler.js`, `WorkoutSummaryScreen.js`, `WeeklyStoryScreen.js` |
| Verdict | **C, with a concrete recovery-week conflict** | A rolling 3-week window that includes a scheduled/coach-applied deload week (whose whole point is reduced volume) can legitimately read "all 3 weeks below MEV" purely because the deload week deliberately undercuts MEV by design, and fire "adding a set or two this week will get it growing again" during or immediately after a week the coach engine intentionally lightened. `insightsEngine.js` has no way to distinguish "under-trained by neglect" from "under-trained by design." |

**MATERIAL DEFECT M4** (Class E, `under_mev_muscle`, deload-week conflict):
concrete scenario constructed above — `currentMesoWeek.isDeload` is fetched
by `useProgressData.js` (`loadBlockState`, line 237-254) in the very same
`load()` call that also runs `loadInsights()` (line 173), but the two never
share data. This is a **data-availability defect**, not merely a missing
hypothetical check: the app already computes the deload flag on the same
screen load and simply does not thread it through.

**MATERIAL DEFECT M5** (Class E, ED-safety, `deload_due` + `recovery_warn`):
neither of these two severity-2 (red/error-styled, `AnalyticsScreen.js:49`)
classes checks `isCalm()`/wellbeing mode or any ED flag before rendering
copy that references soreness, fatigue, training load, and "a lighter week."
See §6.

---

## 5. Semantics contract

| Class | IS (semantic type) | Accumulates? | Cleaned up? |
|---|---|---|---|
| `under_mev_muscle` | Recommendation (prescriptive) | Yes — one row per under-target muscle, uncapped at generation | Deleted on next focus once condition clears (not dismissed); 14-day dismiss-snooze otherwise (§Persistence note) |
| `peaked_lift` | Recommendation (prescriptive) | Yes — one row per exercise that peaked | Same as above |
| `stalled_lift` | Recommendation (mixed instruction) | Yes — one row per exercise that stalled | Same as above |
| `recovery_warn` | Alert / forecast | No — fixed key, one row max | Same as above |
| `deload_due` | Alert / forecast of an impending coach decision | No — fixed key, one row max | Same as above |
| `gentle_rhythm` | Historical observation / affirmation | No — fixed key, one row max | Same as above |

**Founder evidence match confirmed**: `under_mev_muscle` and `peaked_lift`
fire **per muscle** / **per exercise** respectively
(`insightsEngine.js:83-108` loops `Object.keys(VOLUME_LANDMARKS)`;
`insightsEngine.js:119-166` loops `Object.entries(setsByExercise)`), so
multiple structurally-identical cards (e.g. "Lateral Raise Machine" and "Ab
Crunch Machine" both peaked) can and do coexist — this is not a bug in the
generator, it is the designed behaviour of an uncapped-at-generation,
per-entity rule.

**Feed-size cap mechanism — a second, unused cap exists**:
`rankAndCapInsights(insights, max=3)` is exported
(`insightsEngine.js:235-239`) and documented as capping the feed, but it is
**never called in the production path** — grep across `src/` shows its only
callers are two test files (`src/__tests__/coaching-simulation.test.js`,
`src/lib/__tests__/insightsEngine.test.js`). The actual production cap is a
different mechanism: SQL `LIMIT 3` inside `getActiveInsights`
(`database.js:5831-5847`, `ORDER BY severity DESC, generated_at DESC LIMIT
?`, called with `limitRows=3` from `runInsightsEngine`, `database.js:5885`).
Both caps produce the same numeric ceiling (3) by coincidence, but the
generator's own persistence step (`persistInsights`, `database.js:5773-5829`)
stores **every** generated insight, uncapped, so the underlying `user_insights`
table for an active user can hold many more than 3 live rows; only the
*display* query is capped.

**`rankAndCapInsights` deduping claim is untested for real production
shape**: its own test only asserts the output length never exceeds the raw
input length when duplicate types are passed (`insightsEngine.test.js:87-97`,
comment: "Either dedupes by type or keeps all, both are valid behaviours") —
i.e. even the dead function's own test does not pin whether per-type
dedup happens, and moot anyway since it's unused in production.

---

## 6. ED-safety / suppression check

**Content touching weight/food/body**: `recovery_warn` (soreness, sleep,
protein, "a lighter week is coming") and `deload_due` (training load,
fatigue, "a lighter week soon") both reference recovery/body-load state.
`under_mev_muscle` references muscle-group training volume (body-adjacent,
lower sensitivity than weight/food but still training-load content).

**Suppression gates that exist elsewhere in the app** (quoted):
- `isCalm(mode)` — `src/lib/wellbeing.js:45-47`: `return mode === 'calm';`
  Consulted in 30+ files (grep-confirmed): `HomeScreen.js`, `YouScreen.js`,
  `NutritionTargetsScreen.js`, `CoachOutputScreen.js`, `BodyMetricsScreen.js`,
  `WorkoutSummaryScreen.js`, `src/lib/notifications/scheduler.js`,
  `ProgressPhotosScreen.js`, `WeeklyStoryScreen.js`,
  `src/hooks/usePhotoSuppression.js`, etc.
- Notification-layer ED suppression is regression-guarded:
  `src/lib/notifications/__tests__/scheduler.edSuppression.guard.test.js`.

**Check result**: `isCalm`/`getWellbeingMode`/any ED-flag reference is
**absent** from `src/lib/insightsEngine.js` (full file read, zero matches),
`src/hooks/useProgressData.js` (zero matches), and every `user_insights`-
related function in `src/lib/database.js` (`persistInsights`,
`getActiveInsights`, `dismissInsight`, `runInsightsEngine` — zero matches
across lines 5765-5890). `src/screens/AnalyticsScreen.js` also has zero
matches for `calmMode`/`edFlag`/`wellbeing` anywhere in the file.

**STOP — surfaced, not resolved**: this is a genuine gap in the existing
app-wide calm-mode/ED-flag suppression pattern, which two of six "For You"
classes (`recovery_warn`, `deload_due`) fall inside the spirit of (body-load/
soreness/fatigue content, rendered in the error/red severity tier,
`AnalyticsScreen.js:49`) without being wired to it. This is a product-
behaviour question (whether/how to gate) that Section 2 of CLAUDE.md reserves
for explicit founder approval before any ED-safety-adjacent code is touched
— recorded here as a finding, not actioned.

---

## Persistence note (generated fresh vs. persisted rows)

**Persisted, not fresh-per-render.** `generateInsights` itself is a pure
function with no I/O (confirmed: no imports of `database`, `AsyncStorage`,
or any store; only `./algorithms` and `./recoveryEMA`,
`insightsEngine.js:14-15`), but the app never renders its raw output
directly. Every Progress-tab focus calls `runInsightsEngine` which (a)
regenerates the rule set from the trailing 28 days, (b) **persists** it to
SQLite `user_insights` via `persistInsights` (upsert-by-key semantics,
`database.js:5773-5829`), then (c) reads back and returns the top 3 rows by
`getActiveInsights` (`database.js:5831-5847`). So what's on screen is always
a **persisted, dismissal-aware, multi-device-synced row**, not a raw
in-memory computation.

- **Table**: `user_insights` (`database.js:393-403`) — columns `id, user_id,
  insight_key, type, severity, copy, action_payload, generated_at,
  dismissed_at`, plus `updated_at`/`deleted_at` added by a later migration
  (`database.js:793-794`).
- **Index**: `idx_insights_user ON user_insights(user_id, dismissed_at,
  type)` (`database.js:420`).
- **Cleanup**: only the "stale non-dismissed key" prune inside
  `persistInsights` (`database.js:5781-5795` — deletes non-dismissed rows
  whose key is no longer being generated). **No time-based cleanup of
  dismissed rows was found** — a dismissed row is kept indefinitely so the
  14-day resurrection-suppression window can be honoured
  (`database.js:5805-5808`), but nothing was found that later purges rows
  once that 14-day window has long passed. The table is included in the
  account-deletion/device-wipe list (`WIPE_DIRECT_TABLES`,
  `database.js:5973-5978`), so a full account deletion or device sign-out
  clears it, but ordinary usage has no observed row-count ceiling or
  age-based reap for an active account.
- **Oldest-row behaviour**: unbounded growth of dismissed history rows for
  an active account is the apparent behaviour given the evidence above; no
  scheduled job, trigger, or cap was found anywhere in `src/lib/database.js`
  or `src/lib/sync.js` that limits or ages out old `user_insights` rows for
  a live user.

---

## Material defects — index

- **M1** (§3): `peaked_lift` uses a different rep-range source and a
  different corroborating signal than `livePrescription.js`'s ADVANCE rule
  — can disagree on the identical exercise/session history.
  `insightsEngine.js:123,132-148` vs `livePrescription.js:230-249`.
- **M2** (§3): `actionPayload` on `peaked_lift`/`stalled_lift` (and all
  other classes) is generated and persisted end-to-end but never consumed
  by any UI — dead field, no tap-through despite carrying navigable IDs.
  `insightsEngine.js:106,144,163,179,207,225`; `AnalyticsScreen.js:725-747`.
- **M3** (§3): concrete Class E scenario — `peaked_lift`/`stalled_lift` can
  fire "add weight" during/after a deload/re-entry week the resolver would
  refuse to advance in (`SENIOR_RECOVERY_HOLD`), because `insightsEngine.js`
  never receives senior/deload state. `insightsEngine.js:60-166` vs
  `livePrescription.js:877-892,832-847`.
- **M4** (§4): concrete Class E scenario — `under_mev_muscle` can fire
  "add a set or two" during/after a coach-scheduled deload week, because
  `currentMesoWeek.isDeload` is already fetched in the same screen-load call
  as the insights but never threaded into `generateInsights`.
  `useProgressData.js:173,237-254` vs `insightsEngine.js:60`.
- **M5** (§6): `recovery_warn` and `deload_due` (both severity-2, rendered
  in the app's error colour) reference soreness/fatigue/training-load and
  forecast "a lighter week" with zero `isCalm()`/ED-flag gating, unlike 30+
  other surfaces in the app that do consult `isCalm()`. Founder-decision
  question, not actioned.
- **Documentation staleness** (not a code defect): the test file header at
  `src/lib/__tests__/insightsEngine.test.js:1-3` claims `insightsEngine.js`
  "powers the Home screen's coaching cards and the analytics insights feed"
  — grep across `src/screens/HomeScreen.js` for any insightsEngine/
  `user_insights` reference returns zero hits. Only `AnalyticsScreen.js`
  (via `useProgressData.js`) consumes it in production.

---

## What could not be traced to ground truth

- The exact **grammar-error mechanism** the founder's screenshot flagged
  ("Your traps hasn't had much work") was traced to its literal source
  string (`insightsEngine.js:104`, fixed "hasn't" regardless of the
  interpolated muscle name's plurality) but the upstream question of why
  `MUSCLE_DISPLAY_NAMES['traps']` (or similar) resolves to a plural-looking
  display name was not traced — `MUSCLE_DISPLAY_NAMES` is imported from
  `src/lib/algorithms.js` (`insightsEngine.js:14`) and its literal value
  for the `traps` key was not read as part of this trace (out of scope: the
  string bug's own source line is the deliverable, not the display-name
  table's full contents).
- Whether `weeklyCoach.js`'s deload decision and `insightsEngine.js`'s
  `deload_due` have ever **actually** fired in visible disagreement for a
  real user was not (and could not be) traced from static code alone — §3/§4
  establish the two are structurally independent and construct concrete
  conflicting scenarios, but this is a code-path trace, not a runtime/log
  audit of production disagreement events.
