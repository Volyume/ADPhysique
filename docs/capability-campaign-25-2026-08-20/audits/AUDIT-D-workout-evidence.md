# AUDIT D — Workout experience, set model, unilateral, pain capture, recovery evidence

Capability Campaign 25 (CC25), Wave 1. Evidence only. No product or
architecture decisions, no recommendations.

---

## 1 SCOPE / METHOD

**Scope as briefed.** ActiveWorkoutScreen and its supporting libs; the full
`workout_sets` row model (every field: writer, value domain, units); set
logging / edit / delete / draft-restore; the Campaign 20 live prescription
resolver (inputs, outputs, override authority, provenance line); RIR/effort
capture; the last-session reference row ("ghost"); soreness / fatigue /
joint-discomfort capture (exact question, cadence, domain, storage, every
reader); session completion and `session_resolutions` (migrate_140);
in-workout stop / skip / swap; recovery EMA, readiness, `sessionAdjustments`,
recent-performance recall windows; unilateral / per-side data anywhere in the
set model, exercise model or UI.

**Method.** Read the live code to the end of each mechanism, then traced
every consumer by grep. Files read in full or in the relevant entirety:
`src/lib/unilateral.js`, `src/lib/recoveryEMA.js`, `src/lib/sessionAdjustments.js`,
`src/lib/readinessSummary.js`, `src/lib/workoutHelpers.js`, `src/lib/clusterSet.js`,
`src/lib/livePrescription.js`, and targeted regions of
`src/lib/database.js` (10,673 lines), `src/screens/ActiveWorkoutScreen.js`
(5,602 lines), `src/screens/WorkoutSummaryScreen.js`, `src/lib/algorithms.js`,
`src/lib/sync.js`, `src/lib/blockLedgerGather.js`, `src/lib/interBlock.js`,
`src/lib/programmeEpoch.js`, `src/lib/blockAdvisor.js`, `src/lib/planAutoGen.js`,
`src/store/useAppStore.js`, plus `supabase/migrate_054`, `migrate_140`,
`migrate_143`, `supabase/README.md`.

**Evidence discipline.** Every claim below carries `file:line`. Facts read
directly from code are OBSERVED. Statements sourced from a doc/comment are
REPORTED and labelled. Anything not proven is in §14 UNKNOWN/UNVERIFIED. Doc
vs code conflicts are recorded in §10 and §12.

**Verification run.** `npx jest src/lib/__tests__/livePrescription.*` →
4 suites, **135 tests passed** (the brief said "~121-test contract"; the live
count is 135 across `livePrescription.test.js` 37, `.scenarios` 46,
`.properties` 15, `.fq3` 12). No other command was run; the tree was not
modified.

---

## 2 CURRENT BEHAVIOUR

### 2.1 The session lifecycle

1. **Start.** Home shows a pre-workout sheet: "How are you feeling today?"
   (`src/screens/HomeScreen.js:2557`) with three optional readiness chip rows
   ABOVE three intent buttons (`HomeScreen.js:129-148`, `:2609-2611`). Tapping
   an intent starts the session immediately, carrying whatever chips were set
   (`HomeScreen.js:1551` `confirmStart`). Skip passes `intent: null` and all
   three readiness values null (`HomeScreen.js:2634`). A standing opt-out key
   `@volyume_intent_prompt_off` skips the sheet entirely
   (`HomeScreen.js:1530-1532`).
2. `createWorkout` writes the workout row with
   `pre_workout_intent, soreness_24h_before, sleep_quality, energy_score`
   (`src/lib/database.js:3187-3189`) and emits `workout_started`
   (`database.js:3193`).
3. **Per exercise**, `loadHistory` runs one bounded evidence pass
   (`ActiveWorkoutScreen.js:1559-1802`): `getLastNWorkoutSets(exerciseId,
   currentWorkoutId, 3)`, `getAllCompletedSetsForExercise`, one
   `getWorkoutById` per history session, `getCurrentMesocycleWeek`,
   optionally `getWeek1SetsForExercise` on a deload week. It builds
   `packetBase` (`:1687-1712`) and seeds the entry box from
   `resolveSetPrescription` (`:1728-1765`).
4. **Per set**, `handleCompleteSet` (`:1851`) validates, writes ONE
   `workout_sets` row via `createWorkoutSet` (`:1896-1914`), runs PR detection
   (`:1980-2035`), then re-resolves the prescription for the NEXT position
   purely in memory (`:2082-2110`) and re-seeds the box.
5. **Finish** (`:2781`) recomputes `setCount`/`totalVolume` from the DB rows
   (`:2802-2823`), writes `is_completed = 1`, and navigates to
   WorkoutSummary. If some exercises have sets and others have none, the
   confirm offers ENDED_EARLY (`:3010-3013`, `:3046-3052`).
6. **Summary** collects post-session feedback (Difficulty, Muscle engagement,
   Joint discomfort, Fatigue) plus free-text notes and a "notes for next time"
   (`WorkoutSummaryScreen.js:1740-1758`), writes only touched fields
   (`:585-598`), and persists per-muscle `adaptation_events` from
   `runAdaptiveEngine` (`:838-864`).

### 2.2 What the athlete sees in the logger

- **Position line** "Set 3 of 4 - Working" / "Warm-up - Set W1" / "Light set
  N - Easy" on a deload week (`ActiveWorkoutScreen.js:3134-3145`).
- **Range label** the resolver's `repsBand`, e.g. "8-12 reps"
  (`:3666-3676`, `:3711`).
- **Prefill row** — the last-session reference row. Labelled `Last session:`
  with `{weight}{units} x {reps}` and a tap-to-Use action (`:3687-3705`).
  On a deload week with `SENIOR_RECOVERY_HOLD` it becomes `Recovery week -`
  (`:3677-3686`).
- **Ghost-styled prefill values** in the real weight/reps boxes when the
  resolver returns `prefill: true` (`:1755-1765`, `isGhost` flag).
- **A note row** "Add a note for this set" (`src/components/workout/NowCard.js:207`).
- **Status strip items** including a pattern-avoid notice
  (`ActiveWorkoutScreen.js:3416-3440`).
- **NO standing explanation of the prescription.** The Campaign 20 Stage 11
  provenance copy bank (`PROVENANCE_COPY` / `provenanceLineFor`) and the whole
  in-card coach line were RETIRED by founder device order 2026-08-17
  (`ActiveWorkoutScreen.js:121-133`, `:3642-3646`, `:3157-3163`). OBSERVED: no
  `PROVENANCE_COPY` symbol exists in `src/` any more (only a test reference at
  `src/lib/__tests__/livePrescription.fq3.test.js:112`).

### 2.3 Effort capture

There is **no per-set RIR or RPE input anywhere in the logger**.
`DEFAULT_SET` sets `rir: null` (`ActiveWorkoutScreen.js:114`) and the header
comment states the picker is "permanently removed (D14/D19)" (`:107-113`).
`rpe` is hard-coded `null` at both write sites
(`ActiveWorkoutScreen.js:1907`, `src/store/useAppStore.js:1494`). Effort is
captured **once per session** as `session_difficulty` on the summary screen.

Register authority (REPORTED):
`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:19` —
"RPE/RIR reinstatement | **Treat as settled-removed.** … the effort picker
stays out."; and `:2674` (D96 FQ-3(b)) — "session difficulty as separate
coarse effort evidence, never fabricated per-set RIR".

The only path that ever populates `workout_sets.rir` today is a deload
prescription seed (`ActiveWorkoutScreen.js:1657`, `:1761-1763`;
`generateDeloadPrescription` sets `rir: 4`, `src/lib/algorithms.js:1626`) or
a restored typed draft (`:1787`).

### 2.4 Per-side (unilateral) behaviour, live

Per-side logging EXISTS but stores **no per-side data**:

- Eligibility is metadata-driven: `exercise.laterality === 'unilateral'`
  (`ActiveWorkoutScreen.js:1321`), derived by regex from the exercise NAME
  (`src/lib/exerciseMetadata.js:154-158`).
- A one-time per-exercise prompt: **"Log this one side at a time?"** /
  "…is usually trained one side at a time. Do the same reps on each side, one
  after the other; it still counts as one working set."
  (`ActiveWorkoutScreen.js:1329-1330`). Answer sticks in AsyncStorage
  (`src/lib/unilateral.js:46-47`, `:93-103`); "asked" state prevents repeats
  (`:110-134`).
- The flow: `startPerSide` reads ONE reps value from the entry box
  (`:2603`), starts a rest-class pause (`:2628-2629`), then `finishPerSide`
  commits via the normal `handleCompleteSet` with `actualReps: perSide.reps`
  (`:2640-2647`). Both sides share that single number; there is no second
  input.
- `left_reps` / `right_reps` are explicitly written NULL on every new set
  (`ActiveWorkoutScreen.js:1911-1912`, `:1925-1926`;
  `src/store/useAppStore.js:1497-1498`).
- Rest class is derived from `compound_isolation`
  (`src/lib/unilateral.js:170-177`): compound halves rest between sides AND
  after the pair; isolation gets a "switch sides" prompt then full rest.

### 2.5 Pain / discomfort capture (complete inventory)

| Surface | Question wording | Cadence | Domain | Storage |
|---|---|---|---|---|
| Workout summary | **"Joint discomfort"**, hint **"Joints and tendons, not normal muscle soreness"** (`WorkoutSummaryScreen.js:1742`) | Once per SESSION, optional, collapsed behind a "Rate this workout" expander (`:1706-1717`) | 0–3, labels `['None','Slight','Moderate','Significant']` (`:68`, `:106-107`) | `workouts.joint_discomfort` (`database.js:249` local column on workouts added at `:549`) |
| Weekly check-in | **"Any joint or tendon pain?"**, hint **"Joints and tendons, not normal muscle soreness"**, options No/Yes (`src/screens/WeeklyCheckInScreen.js:1201-1209`) | Once per WEEK, Pro | tri-state: `true` / `false` / `null` (`:822`) | `weekly_checkins.joint_pain` (`database.js:603`) |
| Weekly check-in free text | "Anything else to flag?" hint "Illness, travel, big life stress…" (`WeeklyCheckInScreen.js:1213`) | Weekly | free text ≤280 | `weekly_checkins.notes`; parsed by `parseNoteFlags` for injury/illness (`src/lib/weeklyCoach.js:1237`) |
| Per-set note | "Add a note for this set" (`NowCard.js:207`) | Per set, optional | free text | `workout_sets.notes` (`ActiveWorkoutScreen.js:1873`) |
| Per-exercise note | persistent note per exercise | ad hoc | free text | `exercise_user_notes` (`database.js:619-627`) |

**There is no per-set and no per-exercise structured discomfort capture.**
`workout_sets.joint_discomfort` exists as a column (`database.js:251`) and is
carried through export (`:9098`) and sync (`sync.js:489`) but **no code path
writes it** — see §7 I-3.

**No body region, joint, or side is ever recorded with a discomfort answer.**
Exhaustive search returned nothing:
`grep -rniE "\b(left_side|right_side|side_of_body|affected_side|bodySide|body_side)\b" src/ supabase/` → 0 hits.

### 2.6 Skip / stop / swap

- **Skip a whole planned session** (from Home, before starting):
  `handleSkipThisWorkout` (`HomeScreen.js:1358-1398`) writes
  `session_resolutions` with `resolution: 'skipped_by_user'`. Its own comment
  (`:1352-1357`) states: "No reason is asked for, and none is inferred: an
  unstated reason is UNKNOWN."
- **End a session early**: `runFinish({... resolution: 'ended_early' ...})`
  (`ActiveWorkoutScreen.js:3046-3052`) → `finishWorkoutWithSessionResolution`
  (`database.js:5281`), one SQLite transaction closing the workout and
  writing the resolution.
- **Remove one exercise mid-session**: `handleRemoveExercise`
  (`ActiveWorkoutScreen.js:982-1009`) mutates the in-memory session only. It
  emits a Sentry breadcrumb `workout.exercise.removed` (`:996`) and writes
  **nothing to any table**.
- **Swap one exercise mid-session**: `handleConfirmSwap`
  (`:1048-1110`) writes an `exercise_swaps` row with
  `scope: SWAP_SCOPE.SESSION`, `explicit: true`, `routine_id` (`:1090-1093`).
  There is **no reason field passed** (the table has no reason column at all —
  `database.js:2205-2217`).
- **Time crunch / starter trim**: marks entries `_timeCrunchSkipped`
  in memory (`:2692`, `:2761`); nothing persisted.
- **Skipping a single SET**: there is no such action. A set that is not logged
  simply does not exist as a row.

### 2.7 Free vs Pro in this domain (OBSERVED, relevant to CC25 FD-1)

The intent-sheet readiness reading is Pro-gated at the point of use:
`intent: tier === 'pro' ? activeWorkout?.preWorkoutIntent : null`
(`ActiveWorkoutScreen.js:729`, `:1681`). COMP-015 session adjustments are
Pro-only (`:695-697`). Re-entry easing is deliberately NOT tier-gated
(`src/lib/sessionAdjustments.js:346-349`). The C20 resolver itself is
tier-blind — no `tier` reference exists in `src/lib/livePrescription.js`.

---

## 3 FILES & FUNCTIONS

### 3.1 Screens / components

| File | Lines | Role |
|---|---|---|
| `src/screens/ActiveWorkoutScreen.js` | 5,602 | the logger. Owns set logging, per-side, clusters, swap/remove, finish, resolver wiring |
| `src/screens/WorkoutSummaryScreen.js` | — | post-session feedback capture + adaptation events |
| `src/screens/HomeScreen.js` | — | pre-workout intent + readiness chips; one-time skip |
| `src/screens/WeeklyCheckInScreen.js` | — | weekly joint-pain question |
| `src/components/workout/LoggedSetRow.js` | — | one logged-set row; legacy L/R read path (`:124`) |
| `src/components/workout/NowCard.js` | — | entry card, range label, prefill row, note row |
| `src/components/workout/StatusStrip.js` | — | status items incl. pattern-avoid notice |
| `src/components/workout/WorkoutBottomBar.js` | — | primary CTA (relabels to "Log other side") |
| `src/components/ReadinessCards.js` | — | recovery EMA gauges |
| `src/components/EngineLog.js` | — | renders `adaptation_events` reason text |

### 3.2 Libraries

| File | Lines | Purity | Role |
|---|---|---|---|
| `src/lib/livePrescription.js` | 1,002 | pure except `buildEvidencePacket` (`:637`) | C20 resolver |
| `src/lib/unilateral.js` | 177 | pure + AsyncStorage | per-side prefs, rest plan, legacy formatter |
| `src/lib/recoveryEMA.js` | 114 | pure | half-life EMA over session feedback |
| `src/lib/recoveryState.js` | 298 | pure | why-training-is-lighter resolver; `describePrescriptionDifferences` (`:238`) |
| `src/lib/sessionAdjustments.js` | 356 | IO seam + pure rule table | COMP-015 orchestrator + B2 readiness rules |
| `src/lib/readinessSummary.js` | 187 | pure | one Home readiness line |
| `src/lib/workoutHelpers.js` | 187 | pure | `countProgressSets`, `setNumberForKind`, `validateSetEntryValue`, `shouldConfirmBeforeFinish`, `formatLoggedSet` |
| `src/lib/workoutRecordLine.js` | 149 | pure | live record line under the steppers |
| `src/lib/clusterSet.js` | 83 | pure | myo-rep / rest-pause → one row + notes breakdown |
| `src/lib/algorithms.js` | — | pure | `computeAdaptiveDecision` (`:817`), `computeSessionAdjustments` (`:1089`), `buildSessionAdjustmentInput` (`:1289`), `generateDeloadPrescription` (`:1606`), `computeAdaptiveLandmarks` (`:963`) |
| `src/lib/blockLedgerGather.js` | — | pure | per-muscle recovery aggregates from session feedback |
| `src/lib/interBlock.js` | — | pure | block classification using `jointDiscomfortAvg` |
| `src/lib/programmeEpoch.js` | — | pure | `slotVerdict` with `SLOT_REASON.JOINT_DISCOMFORT` (`:283`) |
| `src/lib/mesocycle.js` | — | pure | `evaluateAutoReg` (`:212`) — production-unreferenced |
| `src/lib/exercise/movementConstraints.js` | 52 | IO | PATTERN_AVOID writes (C31) |

### 3.3 C20 resolver — exported surface (`src/lib/livePrescription.js`)

| Export | Line | Notes |
|---|---|---|
| `PROVENANCE` (13 frozen codes) | 53-67 | |
| `resolveLoadIncrement` | 116 | the one increment authority |
| `discountOutliers` | 178 | >10% below window-median top e1RM → excluded from LEARNING only |
| `nextSessionOpeningLoad` | 195 | ADVANCE/HOLD/DROP gate |
| `stableBackoffRatio` | 263 | needs ≥2 of last 3 sessions |
| `expectedReps` | 314 | |
| `adjustWeaker` | 337 | |
| `adjustStronger` | 372 | |
| `detectLoadOverride` | 401 | > half an increment |
| `detectRepsOverride` | 408 | > 2 reps |
| `assembleEvidencePacket` | 489 | PURE; never throws |
| `buildEvidencePacket` | 637 | the only IO seam; lazy-requires `./database` |
| `resolveSetPrescription` | 870 | PURE |

---

## 4 TABLES & FIELDS

### 4.1 `workout_sets` — the full set row (SPECIFIC QUESTION 1)

Local `CREATE TABLE` at `src/lib/database.js:234-256`; additive columns at
`:476` (missed_reps), `:544-545` (rir, rpe), `:771-772` (deleted_at,
exercise_name), `:1268-1269` (left_reps, right_reps). Cloud base table
`supabase/schema.sql:172-194` (stale snapshot), plus
`migrate_012_complete_sync.sql:92` (exercise_name), `:110` (missed_reps),
`migrate_054_workout_sets_unilateral.sql:38-39` (left_reps, right_reps).

| Column | Type | Value domain | Written by | Read by (live) | Status |
|---|---|---|---|---|---|
| `id` | TEXT PK | `uid()` | `createWorkoutSet` `db:3651` | everywhere | live |
| `user_id` | TEXT NOT NULL | local user id | `db:3677` | delete scoping `db:3760` | live |
| `workout_id` | TEXT NOT NULL | | `db:3678` | joins | live |
| `exercise_id` | TEXT NOT NULL | exercise id or resolved-by-name id | `db:3679`, self-heal on pull `db:9074-9087` | resolver, PR, volume | live |
| `exercise_name` | TEXT | denormalised display name | `db:3657-3670` | pull self-heal | live |
| `set_number` | INTEGER | 1-based **within its own kind** (warm-ups number separately) | `setNumberForKind` `workoutHelpers.js:33` → `db:3682` | resolver `pos` `livePrescription.js:446` | live |
| `set_type` | TEXT default 'straight' | `straight` \| `warmup` \| `dropset` \| `myo_reps` \| `rest_pause` \| `amrap` (`ActiveWorkoutScreen.js:189-196`) | `db:3683` | eligibility gates everywhere | live |
| `target_reps_min` | INTEGER | from `routineExercise.recommendedRepsMin` | `ActiveWorkoutScreen.js:1902` | resolver band sample `livePrescription.js:463`; `getAdaptiveLandmarkHistory` avg_missed `db:6560-6566` | live |
| `target_reps_max` | INTEGER | as above | `:1903` | as above | live |
| `actual_reps` | INTEGER | reps; for `duration`/`distance` schemas it holds **seconds** (`workoutHelpers.js:171-185`) | `:1904` (or cluster sum, or the single per-side reps) | volume, PR, resolver, e1RM | live |
| `weight` | REAL | kg in the STORED unit; for `distance` it holds metres/yards (`workoutHelpers.js:180-184`) | `:1905` | volume (via `load_semantics`), PR, resolver | live |
| `rir` | INTEGER | 0–? ; **null on every ordinary set** | `:1906`; only ever non-null from a deload seed (`:1657`,`:1761`) or restored draft (`:1787`) | `insightsEngine.js:136,157`; `recoveryState.js:259-260` | near-dead |
| `rpe` | REAL | — | hard-coded `null` `:1907`, `useAppStore.js:1494` | none | DEAD |
| `failed` | INTEGER default 0 | 0/1 | hard-coded `false` `:1908`, `useAppStore.js:1495` | CSV export `db:5844` | DEAD (never 1) |
| `notes` | TEXT | free text; also carries the cluster breakdown "Myo-reps: 15, 5, 4, 3" (`clusterSet.js:70`) | `:1909` | display, CSV export | live |
| `post_set_pump` | INTEGER | 1–5 per JSDoc `db:3702` | ONLY `updateWorkoutSetPostRating` `db:3704-3710` — **zero callers** | `getExerciseStimulusRatings` `db:3769` — **zero callers** | DEAD |
| `post_set_muscle_connection` | INTEGER | 1–5 | as above | as above | DEAD |
| `joint_discomfort` | INTEGER | 0–3 by analogy | **no writer anywhere** | export `db:9098`, sync push `sync.js:489` | DEAD |
| `is_amrap` | INTEGER default 0 | 0/1 | `:1910` (`setType === 'amrap'`) | none live | live-written, unread |
| `amrap_reps` | INTEGER | — | `createWorkoutSet` accepts `data.amrapReps` `db:3692` but **no caller passes it** | export/sync only | DEAD |
| `missed_reps` | INTEGER | — | **no writer**; `getAdaptiveLandmarkHistory` derives `avg_missed` from target vs actual in SQL instead (`db:6560-6566`) | export/sync only | DEAD |
| `left_reps` | INTEGER | reps | **no live writer** (explicit `null` at `ActiveWorkoutScreen.js:1911`, `:1925`, `useAppStore.js:1497`) | `LoggedSetRow.js:124` display of legacy rows | legacy-read-only |
| `right_reps` | INTEGER | reps | as above | as above | legacy-read-only |
| `created_at` | INTEGER | epoch ms | `db:3694` (`Date.now()`); **on cloud restore overwritten with restore-time `Date.now()`** `db:9112` | ordering in several history queries | live, see §11 |
| `updated_at` | INTEGER | epoch ms | `db:3695`, bumped by `updateWorkoutSet` `db:3739` | LWW gate `db:9091-9093`, push watermark | live |
| `deleted_at` | INTEGER | — | never set: sets are HARD-deleted (`db:3754-3757` comment, `:3763`) | pull filter | unused |

Indexes: `db:308-309`, `:846`, `:923-924`.

### 4.2 `workouts` — session-level feedback columns

Base at `database.js:217-233`; added at `:448-449`, `:468-470`, `:541`,
`:549`, `:611`, `:769-770`, `:1451-1452`.

| Column | Domain | Written when | Writer |
|---|---|---|---|
| `pre_workout_intent` | `'sharp'`\|`'average'`\|`'below_par'`\|null | at start | `db:3187-3189` from `HomeScreen.js:2609-2611` |
| `soreness_24h_before` | **1–3** (Fresh/Mild/Sore) | at start, pre-session | `db:3187-3189` from `HomeScreen.js:132-136` |
| `sleep_quality` | **1–5 domain, chips offer 2/3/4** (Poor/OK/Good) | at start | `db:3187-3189` from `HomeScreen.js:138-142` |
| `energy_score` | **1–5 domain, chips offer 2/3/4** (Low/OK/High) | at start | as above |
| `session_difficulty` | 1–5 (Very Easy…Brutal) | post-session | `WorkoutSummaryScreen.js:1740` → `updateWorkout` `db:3204` |
| `overall_pump` | 1–3 (None/Mild/Good), labelled "Muscle engagement" | post-session | `:1741` |
| `joint_discomfort` | **0–3** (None/Slight/Moderate/Significant) | post-session | `:1742` |
| `fatigue_level` | 1–5 (Fresh…Exhausted) | post-session | `:1743` |
| `notes` | free text | post-session | `:1745-1754` |
| `set_count`, `total_volume` | derived | at finish | `ActiveWorkoutScreen.js:2823-2830` |
| `mesocycle_week_id` | | at start | `db:3187` |

Scale mismatch (OBSERVED, already patched at two display sites, not in
storage): `soreness_24h_before` is stored 1–3 but re-mapped to 1–5 for the
adaptive engine (`db:6600`, `[2,3,4]`) and for the ReadinessCards gauge
(`ReadinessCards.js:194`), and to 1–5 for the block ledger
(`blockLedgerGather.js:13-16`).

### 4.3 `session_resolutions` (migrate_140)

Local: `database.js:2507-2526`. Cloud:
`supabase/migrate_140_session_resolutions.sql:40-55` with
`CHECK (resolution IN ('skipped_by_user','ended_early'))` at `:60-62`.

| Field | Domain | Notes |
|---|---|---|
| `id` | `sr_{mesocycle_week_id}_{routine_id}` (`db:5229-5230`) | deterministic so two devices converge |
| `mesocycle_week_id`, `routine_id` | | UNIQUE together locally (`db:5522-5523`), `(user_id, …)` in cloud (`migrate_140:64-65`) |
| `resolution` | **`'skipped_by_user'` \| `'ended_early'` only** (`db:5266`) | COMPLETED is derived from workout rows, deliberately NOT stored (`migrate_140:11-12`) |
| `workout_id` | present for `ended_early` only | |
| `resolved_at`, `created_at`, `updated_at`, `updated_at_iso`, `deleted_at` | epoch ms local / timestamptz cloud | |

**No reason, no cause, no free text.** The table records THAT a required
session was resolved, never WHY.

Writers: `recordSessionResolution` (`db:5261`) — one caller,
`HomeScreen.js:1375`; and `finishWorkoutWithSessionResolution` (`db:5281`) —
one caller, `ActiveWorkoutScreen.js:2834-2836` (ended_early only, enforced at
`db:5286-5288`).

### 4.4 Adjacent tables in scope

| Table | Where | Relevance |
|---|---|---|
| `adaptation_events` | `db:529-540` | `decision`, `delta`, `reason_code`, `reason_text`, `signals_json`, `mesocycle_week_id NOT NULL`, `exercise_id` nullable. The only persisted record of a session adjustment |
| `exercise_swaps` | `db:2205-2218` | `from/to_exercise_id`, `routine_id`, `explicit`, `scope` ('session'\|'programme'). **No reason column** |
| `exercise_intent` | `db:2192-2204` + `expires_at_ms` (`db:2568-2590`) | C31 PATTERN_AVOID / EXCLUDED / AVOIDED_BLOCK; has a `reason` field passed through `setMovementPatternAvoid` (`movementConstraints.js:28`) |
| `exercise_user_notes` | `db:619-627` | free-text per-exercise note |
| `workout_notes` / `workout_notes_v2` | `db:640-651`, `:797-805` | "next time" notes, and per-workout notes |
| `weekly_checkins` | `db:566+`, `joint_pain` at `:603`, `sore_muscles` at `:613` | weekly joint + sore-muscle capture |
| `engine_telemetry` | `db:1113` | event stream; **no prescription/provenance events are written to it** |

---

## 5 READERS

### 5.1 Readers of `workouts.joint_discomfort` (SPECIFIC QUESTION 3, reader list)

| # | Reader | file:line | What it does with it | Localised to a body region? |
|---|---|---|---|---|
| R1 | `getAdaptiveLandmarkHistory` | `db:6552`, `:6615` | attaches the SESSION value to EVERY primary muscle row produced for that session | **No** — fanned out to all muscles trained |
| R2 | `computeAdaptiveLandmarks` | `algorithms.js:998`, `:1008` | `jointScore = -(avgJoint) * 0.8` in the per-muscle volume-capacity score | No |
| R3 | `getSessionAdjustmentSignals` | `db:10078-10079`, `:10092` | takes the most-recent-session-per-muscle joint value as `perMuscle[m].joint` | **No** — session value copied onto each muscle |
| R4 | `computeSessionAdjustments` | `algorithms.js:1155`, `:1170-1172` | `lastJoint >= 2` → `HOLD_JOINT`, suppresses any +1 for that muscle | No |
| R5 | `computeAdaptiveDecision` | `algorithms.js:823-829` (joint ≥ 3 → `rotate_exercise`), `:871-877` (joint ≥ 2 → hold) | via `runAdaptiveEngine` from the summary screen | No |
| R6 | `shouldDeload` | `algorithms.js:582-591` | `avgJointDiscomfort` over rated weeks contributes to the 30% wellness composite; reason "Recurring joint discomfort across the block" | No |
| R7 | `algorithms.js:741`, `:753-757` | weekly aggregation for the deload evaluator | No |
| R8 | `collectMuscleSessionRows` | `blockLedgerGather.js:315` | session joint attached to every muscle worked as PRIMARY in that session | **No** |
| R9 | `computeRecoveryAggregates` | `blockLedgerGather.js:156` | `jointDiscomfortAvg` per muscle | No |
| R10 | `interBlock.recoveryCostWeight` | `interBlock.js:132` | `>= JOINT_HIGH` adds 1 to the recovery-cost weight → OVERREACHED classification, next block start/peak reduced | No |
| R11 | `interBlock` rationale wording | `interBlock.js:374` | picks muscle-voiced vs block-voiced copy | No |
| R12 | `computeRecoveryEMAs` | `recoveryEMA.js:58` | joint EMA point | No |
| R13 | `ReadinessCards` | `ReadinessCards.js:196`, `:208` | joint gauge + sample count (14-day window `:188-191`) | No |
| R14 | `CoachReviewScreen` | `CoachReviewScreen.js:454` | `weeklyWorkouts.some(w => (w.jointDiscomfort \|\| 0) >= 2)` → a flag | No |
| R15 | `CoachReviewScreen` | `:172` | joint flag from check-ins OR workouts | No |
| R16 | `blockMetrics` | `blockMetrics.js:86`, `:425` | `LATE_JOINT_OK = 2`; late-recovery gate | No |
| R17 | `evaluateAutoReg` | `mesocycle.js:232`, `:241` | joint ≥3 → `deload_now -50%`; ≥2 twice → `reduce_volume -20%`. **PRODUCTION-UNREFERENCED** (`MesocycleBuilderScreen.js:98-109` documents the removal) | No |
| R18 | `slotVerdict` | `programmeEpoch.js:283` | `evidence.jointDiscomfort` → `REPLACE` / `SLOT_REASON.JOINT_DISCOMFORT`. **No production evidence builder ever sets this field** — see §7 I-5 | (would be per-exercise, but unreachable) |

**Answer to "does any reader localise it to a body region?": NO.** Every
consumer either treats it as a whole-session/whole-block systemic number, or
fans the SAME session number out onto every muscle trained that session
(R1, R3, R8). The only per-exercise consumer (R18) is unreachable.

### 5.2 Readers of `workouts.soreness_24h_before`

`recoveryEMA.js:56`; `insightsEngine.js:170-171` (week-over-week rule,
threshold ≥18%); `readinessSummary.js:139` (≥3 → "sore" bit, gated to 14 days
`:136-137`); `sessionAdjustments.js:155` → `algorithms.js:1121`, `:1161`
(`presessionSoreForM` requires soreness===3 AND trained within 72h);
`db:6614` (mapped 1→2, 2→3, 3→4); `blockLedgerGather.js:314`;
`ReadinessCards.js:192-194`, `:206`; `algorithms.js:738`, `:748`.

### 5.3 Readers of `workouts.session_difficulty`

C20 resolver effort corroboration (`livePrescription.js:232-247`: 1–3
supports an ADVANCE, ≥4 → `HOLD_EFFORT_VERY_HARD`, missing →
`HOLD_EFFORT_UNKNOWN`); `getSessionAdjustmentSignals` (`db:10075`) →
`_DIFFICULTY_TO_PERFORMANCE` (`algorithms.js:1120`);
`getRecentWorkoutFeedback` (`db:10110`); `blockAdvisor`/`blockMetrics` paths.

### 5.4 Readers of `sleep_quality` / `energy_score`

`resolveSessionEasingTweak` chips, only for why-wording
(`sessionAdjustments.js:248-252`) — the MAGNITUDE comes from the intent
answer alone; `readinessSummary.js:140-141` (≤2 → "short on sleep" / "low on
energy"); `ActiveWorkoutScreen.js:730`, `:1682`.

### 5.5 Readers of `session_resolutions`

`db:5100` (workout_id lookup), `:5315`, `:5331`, `:5350` (readers),
`db:7382` (a `NOT EXISTS` gate), `src/lib/blockProgression.js:150-177`
(the 6-rule state matrix), `programmePosition.js`. Cloud pull at
`sync.js:2940`.

---

## 6 WRITERS

| Target | Writer | file:line | Trigger |
|---|---|---|---|
| `workout_sets` INSERT | `createWorkoutSet` | `db:3649-3699` | `handleCompleteSet` (`ActiveWorkoutScreen.js:1896`), watch companion `applyRemoteSetEvent` (`useAppStore.js:1482-1499`) |
| `workout_sets` UPDATE | `updateWorkoutSet` (whitelist `_SET_EDIT_COLUMNS` `db:3717-3727`: weight, actualReps, rir, rpe, setType, notes, failed, leftReps, rightReps) | `db:3728-3746` | `handleSaveEditedSet` — **passes only `{ weight, actualReps }`** (`ActiveWorkoutScreen.js:2365`) |
| `workout_sets` UPDATE (post ratings) | `updateWorkoutSetPostRating` | `db:3704-3710` | **no callers** |
| `workout_sets` DELETE | `deleteWorkoutSet` (hard delete) | `db:3758-3766` | `handleDeleteEditedSet` (`:2452`), paired with `deleteWorkoutSetFromCloud` + `enqueueSyncOp('workout_set_delete')` (`:2461-2467`) |
| `workout_sets` bulk DELETE | `deleteWorkoutAndSets` / `deleteIncompleteWorkout` | `db:3254`, `:3278` | discard session / delete workout / cloud tombstone apply (`sync.js:2121`) |
| `workout_sets` from cloud | `insertWorkoutSetFromCloud` | `db:9068-9114` | pull |
| `workouts` INSERT | `createWorkout` | `db:3186-3194` | `HomeScreen.confirmStart` |
| `workouts` UPDATE | `_updateWorkoutOnDb` (fieldMap `db:3198-3213`) | `db:3197` | summary feedback debounce (`WorkoutSummaryScreen.js:585-598`), finish (`ActiveWorkoutScreen.js:2830-2836`) |
| `session_resolutions` | `_upsertSessionResolutionOnDb` | `db:5232-5252` | `recordSessionResolution` (skip) / `finishWorkoutWithSessionResolution` (ended early) |
| `adaptation_events` | `createAdaptationEvent` | via `sessionAdjustments.js:173-182` and `WorkoutSummaryScreen.js:845-863` | session start (COMP-015) and session end (adaptive engine) |
| `exercise_swaps` | `recordExerciseSwap` | `db:9842-9856` | `handleConfirmSwap` (`ActiveWorkoutScreen.js:1090`) |
| `exercise_intent` (PATTERN_AVOID) | `setMovementPatternAvoid` | `movementConstraints.js:28-45` | not called from the logger |
| AsyncStorage `@volyume_unilateral_exercises` | `setUnilateralExercise` | `unilateral.js:93-103` | prompt answer / overflow toggle |
| AsyncStorage `@volyume_setdraft_{workoutId}_{exerciseId}` | debounced effect | `ActiveWorkoutScreen.js:1812-1827` + background flush `:1831-1838` | typing in the entry box |
| AsyncStorage active-workout snapshot | `_persistActiveWorkout` | `useAppStore.js:120-160` | every store mutation of the session |

---

## 7 CURRENT INVARIANTS

**I-1 One logged set = one `workout_sets` row, always.** Clusters
(myo-rep/rest-pause) sum reps into `actual_reps` and put the breakdown in
`notes` (`clusterSet.js:11-15`, `:62-72`). Per-side pairs commit through the
same single `handleCompleteSet` call (`ActiveWorkoutScreen.js:2640-2646`;
pinned at `ActiveWorkoutScreen.unilateral.guard.test.js:125-131`).

**I-2 No per-set effort is ever fabricated.** `rir` defaults to null
(`ActiveWorkoutScreen.js:107-114`); the engine reads SESSION difficulty
instead (`livePrescription.js:232-247`).

**I-3 Several `workout_sets` columns are structurally dead** — `rpe`,
`failed`, `post_set_pump`, `post_set_muscle_connection`, `joint_discomfort`,
`missed_reps`, `amrap_reps` have no live writer (§4.1). They are still pushed
to and pulled from the cloud, so they are schema-live and data-empty.

**I-4 Warm-ups are excluded from every evidence path.** `isWorkingSetRow`
(`ActiveWorkoutScreen.js:119`); `countProgressSets` also excludes dropsets
(`workoutHelpers.js:15-20`); resolver `NEVER_ELIGIBLE_TYPES = warmup, dropset,
myo_reps, rest_pause` (`livePrescription.js:69`); PR history excludes warm-ups
on both sides (`ActiveWorkoutScreen.js:1980-1984`).

**I-5 `SLOT_REASON.JOINT_DISCOMFORT` is unreachable in production.**
`slotVerdict` branches on `evidence.jointDiscomfort` (`programmeEpoch.js:283`)
but neither production evidence builder sets it —
`blockAdvisor.js:506-533` and `planAutoGen.js:426-463` (`buildSlotEvidence`)
both omit the key. `grep -rn "jointDiscomfort:" src/ --include=*.js` outside
tests returns only comments, the `updateWorkout` field map (`db:3206`), the
`getAdaptiveLandmarkHistory` output (`db:6615`) and WorkoutSummaryScreen's
local state.

**I-6 Readiness/re-entry easing is strictly downward-only and never stacked.**
`applyReadinessToSets` (`sessionAdjustments.js:269-273`),
`applyReadinessToLoad` (`:280-286`), `resolveSessionEasingTweak` picks ONE
tweak object, never sums (`:351-356`). The resolver mirrors the load trim
byte-for-byte (`livePrescription.js:133-140`, cross-checked by the properties
suite) and applies it LAST, downward only (`:955-960`).

**I-7 A senior state never makes a prescription more aggressive.**
`adjustStronger` is disabled outright under deload / block-finished /
re-entry ease / active readiness reduction (`livePrescription.js:378-380`).

**I-8 Deload owns its session outright.** `resolveSetPrescription` returns
from the deload branch before any other logic (`livePrescription.js:876-893`);
`computeSessionAdjustments` returns `[]` on a deload week
(`algorithms.js:1091`).

**I-9 Unanswered feedback is never coerced to a rating.** Only touched fields
are written (`WorkoutSummaryScreen.js:585-596`); unanswered maps to null and
the engine holds (`algorithms.js:832-839`); `insufficient_feedback` holds are
never persisted as adaptation events (`WorkoutSummaryScreen.js:843-844`);
`jointDiscomfortAvg` is null (not 0) when no joint answers exist
(`blockLedgerGather.js:150-158`).

**I-10 A single session can never create a structural claim.** Back-off needs
≥2 of the last 3 (`livePrescription.js:274-276`); the load DROP needs two
consecutive misses (`:212-231`); `programmeEpoch` requires ≥2 swaps
(`:279-281`).

**I-11 The resolver never throws and never reads the clock.**
`assembleEvidencePacket` catch-all (`livePrescription.js:602-616`); missing
`now` falls back to `Number.MAX_SAFE_INTEGER` so unknown-age history reads as
stale (`:502-506`).

**I-12 History is never hidden.** Sessions failing band-overlap/recency stay
in `history` with `comparable: false` so the reference row still shows real
history; only LEARNING filters them (`livePrescription.js:471-479`, `:560`,
`:875`).

**I-13 ENDED_EARLY closure is atomic.** Workout close + resolution in one
SQLite transaction, with an identity guard requiring exactly one matching row
(`db:5290-5300`).

**I-14 Skipping asks for no reason and infers none.** `HomeScreen.js:1352-1357`
verbatim: "No reason is asked for, and none is inferred: an unstated reason is
UNKNOWN."

**I-15 A session swap must never teach dislike.** Recorded as
`SWAP_SCOPE.SESSION` (`ActiveWorkoutScreen.js:1092`) — the C16 quality-law-1
distinction from a programme replacement (`:1084-1089`).

**I-16 Per-side logging must not ask for a second rep count.** Founder D54
reversal; source-level regression guard forbids `perSideReps`,
`setPerSideReps`, `'Other side reps'`, and `lowerSideReps` anywhere in the
screen (`ActiveWorkoutScreen.unilateral.guard.test.js:134-138`, `:113-125`).

---

## 8 CURRENT TESTS

Run (read-only): `npx jest src/lib/__tests__/livePrescription.*` →
**135 passed / 135**, 4 suites, 1.7 s.

| Suite | Tests | What it pins |
|---|---|---|
| `src/lib/__tests__/livePrescription.scenarios.test.js` | 46 | the design doc's numbered scenarios |
| `src/lib/__tests__/livePrescription.test.js` | 37 | unit contract of each exported helper |
| `src/lib/__tests__/livePrescription.properties.test.js` | 15 | adversarial properties incl. the `applyReadinessToLoad` byte-cross-check |
| `src/lib/__tests__/livePrescription.fq3.test.js` | 12 | FQ-3 no-fabricated-RIR; also asserts against the (now removed) `PROVENANCE_COPY` region at `:112` |
| `src/lib/__tests__/sessionAdjustments.test.js` | 56 | downward-only fuzz invariant, rule table |
| `src/lib/__tests__/unilateral.test.js` | 25 | `lowerSideReps`, `formatPerSide`, `perSideRestPlan`, `halfRestSeconds` |
| `src/lib/__tests__/recoveryEMA.test.js` | 18 | half-life decay, null handling, bucketing |
| `src/lib/__tests__/clusterSet.test.js` | 11 | cluster → one row + notes |
| `src/lib/__tests__/workoutSetEdit.test.js` | 3 | set edit column mapping |
| `src/lib/__tests__/workoutHelpers.test.js` | — | counting rules, validation |
| `src/lib/__tests__/recoveryState.test.js`, `readinessSummary.test.js`, `recoveryWordingSource.test.js` | — | recovery wording single-source |
| `src/screens/__tests__/ActiveWorkoutScreen.unilateral.guard.test.js` | 23 (per D54 record) | source-level guard on the per-side contract |
| `src/screens/__tests__/ActiveWorkoutScreen.prReEval.guard.test.js`, `.giantSet`, `.supersetRest`, `.reEntryEase`, `.reorder`, `.usability`, `.verticalLogger`, `.nextExerciseButton`, `.groupFocusCue`, `.finishAndNoteExpand` | — | source-level guards on the logger |
| `src/screens/__tests__/WorkoutSummaryScreen.feedback.guard.test.js` | — | feedback capture |
| `src/lib/__tests__/requiredSessionIdentity.test.js`, `workoutTombstoneConvergence.test.js`, `workoutDelete.test.js`, `incompleteWorkoutDelete.test.js` | — | session resolution + delete convergence |

**Notable:** the logger is guarded almost entirely by `fs.readFileSync` +
regex source assertions, not behavioural mounts — stated reason at
`ActiveWorkoutScreen.unilateral.guard.test.js:19-25` ("a ~3,900-line screen
with a huge live dependency surface … mounting it is impractical"). Any CC25
change to the logger will collide with byte-level string pins.

---

## 9 REUSABLE INFRASTRUCTURE

| Asset | file:line | Why it is reusable for a constraint layer |
|---|---|---|
| Evidence-packet pattern | `livePrescription.js:489-616` | a pure assembler over already-fetched raw rows, with an explicit comparability stage (`comparable: true/false`) that keeps ineligible sessions visible but out of learning. A constraint-eligibility flag would slot into exactly that stage |
| Provenance vocabulary | `livePrescription.js:53-67` | 13 frozen codes, exactly one per prescription; already the shape a "why" needs |
| Confidence resolver | `livePrescription.js:757-774` | already tri-state and evidence-count driven |
| Senior-override composition | `livePrescription.js:945-960` | downward-only trims that compose rather than compete |
| One-source-of-truth increment | `livePrescription.js:116-127` | |
| Downward-only rule table | `sessionAdjustments.js:211-228`, `:269-286` | frozen table + fuzz invariant, a proven pattern for a constrained-session tweak |
| Distinct-provenance tweak | `getReEntryEaseTweak` `sessionAdjustments.js:317-329` | the exact precedent for "same magnitude, honest and different cause" (`because: 'athlete_reentry_choice'`) |
| Recovery-state provenance recovery | `recoveryState.js:1-33` | the precedent for un-flattening two causes that were stored as one boolean |
| `describePrescriptionDifferences` | `recoveryState.js:238-266` | reads two prescriptions and states only what actually changed — the honest-diff pattern |
| Day-bound expiring constraint | `exercise_intent.expires_at_ms` (`db:2568-2590`), `movementConstraints.js:28-45` | already an interval-shaped constraint with a typed kind and a `reason` field |
| Deterministic convergent id | `sessionResolutionId` (`db:5229-5230`) + refuse-stale trigger (`migrate_140:69+`) | the pattern for a cross-device single logical row |
| Atomic close+resolve | `finishWorkoutWithSessionResolution` (`db:5281-5310`) | the pattern for "never a half-state" |
| Legacy-read/new-write split | `unilateral.js:30-36`, `LoggedSetRow.js:124` | precedent for retiring a write path while keeping the read |
| Per-exercise device-local preference | `unilateral.js:46-134` | the "no schema change, sticky per exercise, asked-once" pattern |
| `load_semantics` axis | `db:2602`, `algorithms.js:160-169`, `migrate_143` | a four-value per-exercise metadata axis, already live end to end |
| Pattern-avoid status notice + Swap shortcut | `ActiveWorkoutScreen.js:3416-3440` | an in-logger surface for "this is constrained, here is the escape" |
| Crash-recovery snapshot | `useAppStore.js:120-160` | already carries `sessionAdjustments` so a restore does not re-log events |

---

## 10 CONFLICTS WITH NEW SYSTEM

**C-1 The brief's premise about the provenance line is out of date.** The
brief says the C20 wiring includes "provenance line". OBSERVED: the
provenance line and the entire in-card coach line were retired by founder
device order 2026-08-17 (`ActiveWorkoutScreen.js:121-133`: "Never re-add a
standing coach explanation to the set card without a founder order"). The
resolver still returns `provenance` on every prescription; it reaches only a
Sentry breadcrumb (`:1766-1771`, `:2104-2109`) and one behavioural branch
(`:3677`). Any CC25 design that wants to explain "this is lighter because of
your restriction" in the logger card contradicts a live founder order.

**C-2 Per-side rep divergence is a founder-reversed, ED-adverse design.**
D54 (`DECISIONS-2026-07-09.md:1056-1070`): "the D9 two-phase per-side flow
asked for reps INDEPENDENTLY on each side and stored the lower - ED-adverse,
normalises imbalance. REVERSED." A source-level guard blocks re-adding it
(`ActiveWorkoutScreen.unilateral.guard.test.js:134-138`). The CC25 amendment
FD-1 lists "unilateral logging needed for correct logging" in the free tier.
These are not automatically the same thing (asymmetric CAPACITY for a limb
difference vs asymmetric EFFORT on a symmetric body), but the existing law is
stated without that distinction. This is a live collision, not a resolved one.

**C-3 Effort capture is settled-removed at per-set granularity.**
`DECISIONS-2026-07-09.md:19`. Any capability design needing per-set effort or
per-set symptom capture runs into that ruling plus the FQ-3(b) "never
fabricated per-set RIR" law (`:2674`).

**C-4 Joint discomfort is session-scoped and un-localised.** Every reader
(§5.1) treats it as systemic or fans it across all muscles trained. There is
no field anywhere for "which joint", "which side", "which movement". A
capability/restriction model keyed on body region has no existing signal to
join to.

**C-5 The one per-exercise joint pathway is dead code.**
`SLOT_REASON.JOINT_DISCOMFORT` (`programmeEpoch.js:283`) is unreachable
(§7 I-5). Building on it means enabling it, not reusing it.

**C-6 The app already tells the user something it never does.**
`computeAdaptiveDecision` returns reasonText "High joint discomfort. Rotating
to a lower-risk exercise next session." (`algorithms.js:823-829`), it is
persisted as an `adaptation_events` row (`WorkoutSummaryScreen.js:845-863`)
and RENDERED to the user in the Engine Log (`EngineLog.js:129`, `:148`).
OBSERVED: `grep -rn "rotate_exercise" src/` outside tests returns only the two
producers in `algorithms.js` and the icon switch in `EngineLog.js` — **no code
performs any rotation.** A CC25 restriction system inherits this false claim
unless it is addressed.

**C-7 Deviation from prescription leaves almost no durable trace** — see §13
Q5. The override detection that DOES exist is in-memory and exercise-scoped
only; it is cleared on every exercise change (`ActiveWorkoutScreen.js:1541-1542`)
and never persisted.

**C-8 The logger's regression guards are byte-level source assertions.**
Dozens of exact-string pins across ten `*.guard.test.js` files. Any structural
edit to `ActiveWorkoutScreen.js` will break them mechanically; they are the
recorded founder contract, so each break is a decision, not a chore.

**C-9 Session-adjustment machinery only runs inside a mesocycle.**
`sessionAdjustments.js:90` returns `[]` without `workout.mesocycleWeekId`;
`adaptation_events.mesocycle_week_id` is `NOT NULL` (`db:531`). A capability
adaptation that must work for a free/ad-hoc/no-block user cannot use this
audit trail as-is.

**C-10 Readiness easing is Pro-gated at the caller.**
`intent: tier === 'pro' ? ... : null` (`ActiveWorkoutScreen.js:729`, `:1681`).
FD-1 requires core capability accommodation to be free. Re-entry ease is the
existing precedent for a non-tier-gated easing path
(`sessionAdjustments.js:346-349`).

**C-11 `exercise_swaps` has no reason column** (`db:2205-2217`), so "swapped
because my shoulder is flaring" and "swapped because the machine was busy" are
indistinguishable in the swap log. `exercise_intent` DOES carry a `reason`
(`movementConstraints.js:28`), so the two constraint-adjacent tables differ.

**C-12 `laterality` is derived from the exercise NAME by regex**
(`exerciseMetadata.js:154-158`), not curated metadata. Any laterality-aware
capability rule inherits that regex's coverage.

---

## 11 PROVENANCE RISKS

**P-1 Prescription provenance is ephemeral.** `audit()` is a Sentry
breadcrumb only (`observability.js:346-348` → `track.userAction` →
`this.breadcrumb`, `:299-301`). `workout.prescription.presented`,
`workout.prescription.overridden`, `workout.set.logged`,
`workout.exercise.removed` (`ActiveWorkoutScreen.js:1766`, `:2071`, `:2104`,
`:1941`, `:996`) are attached to a crash report or the on-device ring buffer
and are never written to `engine_telemetry` or any table. Nothing durable
records what was prescribed for a set.

**P-2 The prescribed WEIGHT is never stored.** Only
`target_reps_min`/`target_reps_max` from the routine row land on the set
(`ActiveWorkoutScreen.js:1902-1903`). There is no `prescribed_weight`,
`prescribed_reps`, or `provenance` column. A later reader cannot tell a set
that matched its prescription from one that deviated by 20 kg.

**P-3 Override state dies with the exercise.** `overrideLoad`/`overrideReps`
are React state, cleared on every exercise change
(`ActiveWorkoutScreen.js:1541-1542`) and on swap (`:1048-1110` chain) and
never persisted — not even in the crash snapshot
(`useAppStore.js:126-145` lists `sessionAdjustments` but no override state).

**P-4 Cloud restore rewrites `workout_sets.created_at`.**
`insertWorkoutSetFromCloud` binds `Date.now()` into `created_at`
(`db:9112`). Every restored set therefore carries restore-time creation. The
queries that order by `created_at` —
`getAllCompletedSetsForExercise` (`db:3643`),
`getCompletedSetHistoryForExercise` (`db:3583`),
`getWorkoutSetsForExercise` (`db:3595`),
`getCompletedWorkoutSets` (`db:3288`) — lose true chronology after a restore.
`getLastNWorkoutSets` is safe (orders by `w.started_at DESC, ws.set_number ASC`,
`db:3622-3623`), and the resolver's own sort keys on `createdAt`
(`livePrescription.js:452-454`) but then prefers `set_number` for `pos`
(`:456-463`), so the resolver is largely insulated. PR detection, which
consumes `getAllCompletedSetsForExercise`, is not.

**P-5 `sleep_quality` and `energy_score` are pushed but never pulled.**
Push: `sync.js:434-435`. Pull SELECT list: `sync.js:2099` — the column list
omits both. `insertWorkoutFromCloud` binds `w.sleep_quality ?? null`
(`db:8862`) against a row that never carries them, so a fresh-device restore
writes NULL. The local function's own comment warns of exactly this class:
"Missing columns here silently drop user-entered fields on cross-device
restore" (`db:8838-8840`). OBSERVED asymmetry; not fixed.

**P-6 `soreness_24h_before` is stored on a 1–3 scale that three consumers
re-map differently.** `db:6600` `[2,3,4]`; `ReadinessCards.js:194` `[2,3,4]`;
`blockLedgerGather.js:13-16` `remapSoreness13to15`. The raw column carries no
scale marker.

**P-7 Session-level answers are attributed to muscles they may not describe.**
`getAdaptiveLandmarkHistory` (`db:6552`, `:6615`),
`getSessionAdjustmentSignals` (`db:10079`, `:10092`) and
`collectMuscleSessionRows` (`blockLedgerGather.js:315`) all stamp the ONE
session joint/soreness answer onto every muscle. `WorkoutSummaryScreen.js:558-573`
goes further: it applies the session joint value to **every muscle with weekly
volume**, not only muscles trained today.

**P-8 A removed exercise leaves no record.** `handleRemoveExercise`
(`ActiveWorkoutScreen.js:982-1009`) writes nothing. The finish path counts
sets from the DB (`:2802-2810`), so sets logged before a removal survive, but
the removal itself is invisible.

**P-9 Time-crunch and starter trims are in-memory only** (`:2692`, `:2761`).
A session shortened by a time constraint is indistinguishable at rest from one
the athlete simply did less of.

**P-10 `adaptation_events` from the summary carry no `exercise_id`.**
`WorkoutSummaryScreen.js:845-863` passes `muscle` but not `exerciseId`, so the
`rotate_exercise` / `joint_high` record cannot name the exercise it is about.
The COMP-015 path does pass `exerciseId` (`sessionAdjustments.js:176`).

**P-11 The C20 IO seam never resolves historical deload weeks.**
`buildEvidencePacket` hard-codes `isDeload: false` per session and says so
(`livePrescription.js:625-635`, `:667`); `ActiveWorkoutScreen.js:1583` does the
same. So `assembleEvidencePacket`'s §8.5 deload exclusion (`:544`) is
implemented and tested but never fires in production.

---

## 12 SYNC / MIGRATION ISSUES

**S-1 `workouts` and `workout_sets` are on the LEGACY sync path.**
`src/lib/sync/tables/` contains 19 handlers, none of them workouts or sets.
Push: `sync.js:396` / `:503`; pull: `:2093` / `:2138`.

**S-2 Column asymmetry in the workouts pull** — see P-5
(`sync.js:2099` vs `sync.js:434-435`).

**S-3 `workout_sets` pull is `select('*')`** via `fetchByIdsChunked`'s default
(`sync.js:180`), so no set column is dropped on the way in.

**S-4 Dead columns are still on the wire.** `_upsertSets` (`sync.js:483-496`)
pushes `rir`, `rpe`, `post_set_pump`, `post_set_muscle_connection`,
`joint_discomfort`, `missed_reps`, `amrap_reps`, `left_reps`, `right_reps` —
every one of them permanently null for a set logged by the current build.

**S-5 `workout_sets` has no tombstone.** Deletes are hard, paired with
`deleteWorkoutSetFromCloud` and an `enqueueSyncOp('workout_set_delete')`
retry (`ActiveWorkoutScreen.js:2461-2467`; `db:3754-3757`). `deleted_at`
exists locally (`db:771`) and is documented as unused for these rows.

**S-6 Doc/code conflict on migrate_140's applied status.**
`supabase/migrate_140_session_resolutions.sql:26-28` says
"APPLIED REMOTELY: NOT YET. Founder-gated"; `src/lib/sync.js:1111-1112` says
"Fails SOFT until migrate_140 is applied". `supabase/README.md:340` says
**"YES - LIVE, verified 2026-08-18"**. Per the README's own authority claim
(`:169-170`), the README is current truth and both in-file notes are stale.

**S-7 CLAUDE.md §STATUS migration numbers are stale** (says 133 files /
highest 136; disk has through `migrate_144`). Already recorded in the campaign
log (`_CAMPAIGN-LOG.md`, 2026-08-20 entry).

**S-8 The cloud `workout_sets` snapshot is stale.** `supabase/schema.sql:172-194`
lacks `exercise_name`, `missed_reps`, `left_reps`, `right_reps`, `deleted_at`
— all added by later migrations. Consistent with CLAUDE.md's warning that
`schema.sql` is a stale snapshot.

**S-9 History queries are not user-scoped.** `getLastNWorkoutSets`
(`db:3617-3623`), `getAllCompletedSetsForExercise` (`db:3638-3644`) and
`getPreviousWorkoutSets` (`db:3600-3606`) filter on `exercise_id` +
`is_completed` but not `user_id`. Not exploited today (one local user per
device), recorded as a fact.

---

## 13 ANSWERS TO SPECIFIC QUESTIONS

### Q1 — Full set-row schema with writers and value domains

See §4.1. Summary of the live/dead split:

- **Live and written every set:** `id`, `user_id`, `workout_id`,
  `exercise_id`, `exercise_name`, `set_number`, `set_type`,
  `target_reps_min`, `target_reps_max`, `actual_reps`, `weight`, `notes`,
  `is_amrap`, `created_at`, `updated_at`.
- **Live but almost always null:** `rir` (deload seed or restored draft only).
- **Structurally dead (no writer):** `rpe`, `failed` (always 0),
  `post_set_pump`, `post_set_muscle_connection`, `joint_discomfort`,
  `missed_reps`, `amrap_reps`.
- **Legacy read-only:** `left_reps`, `right_reps`.
- **Unused:** `deleted_at`.
- **Units:** `weight` is stored in the user's chosen gym unit as typed
  (`validateSetEntryValue` `workoutHelpers.js:140` `parseFloat(value?.weight) || 0`);
  the unit itself is NOT stored on the row. `load_semantics` on the EXERCISE
  (total / per_hand / assisted / added_bodyweight, `db:2602`, `migrate_143`)
  is what makes the number mean a real load (`algorithms.js:160-169`).
  For `duration`/`distance` exercise types the columns are reused:
  `actual_reps` = seconds, `weight` = metres/yards
  (`workoutHelpers.js:171-185`).

### Q2 — Per-side data: exists or checked-and-absent

**Checked. Partially exists as legacy columns; NOTHING per-side is written by
the current build.** Searches run:

```
grep -rn "left_reps|right_reps|leftReps|rightReps" src/ supabase/   → 30 hits, all listed in §4.1
grep -rn "per_side|perSide" src/ supabase/                          → 25 hits, all the guided-flow state and prefs
grep -rn "per_hand|perHand" src/ supabase/                          → load_semantics only (exercise-level, not set-level)
grep -rn "laterality" src/                                          → 15 hits (exercise column + derivation + logger gate)
grep -rniE "\b(left_side|right_side|side_of_body|affected_side|bodySide|body_side)\b" src/ supabase/  → 0 hits
```

Findings:
1. `workout_sets.left_reps` / `right_reps` exist locally (`db:1268-1269`) and
   in cloud (`migrate_054`). Every new set writes them NULL
   (`ActiveWorkoutScreen.js:1911-1912`, `:1925-1926`,
   `useAppStore.js:1497-1498`). They are read only for display of pre-D54 rows
   (`LoggedSetRow.js:124`).
2. `exercises.laterality` exists (`db:1338`, `:1418`), values
   `'unilateral'`/`'bilateral'`, derived by name regex
   (`exerciseMetadata.js:154-158`). It gates the per-side prompt only
   (`ActiveWorkoutScreen.js:1321`, `:4464`).
3. `exercises.load_semantics` `'per_hand'` describes how a two-implement
   weight is entered, NOT a side (`db:2602`, `algorithms.js:169` doubles
   tonnage).
4. The per-side FLOW records nothing per side: one reps value used for both
   (`ActiveWorkoutScreen.js:2603`, `:2643`).
5. The per-exercise "log per side" preference lives in AsyncStorage, not the
   database (`unilateral.js:46-47`) — it does not sync and is lost on
   reinstall.
6. `unilateral.js:30-36` claims the per-side breakdown "rides in `notes`"
   using `formatPerSide`. OBSERVED: **false for the current build** —
   `finishPerSide` (`ActiveWorkoutScreen.js:2635-2649`) passes no `notes`
   override, and the guard test asserts `formatPerSide` is not imported by
   the screen (`ActiveWorkoutScreen.unilateral.guard.test.js:141-148`). The
   module header is stale doc.
7. **No left/right, side, or limb concept exists anywhere else** — not in
   `exercise_intent`, not in constraints, not in check-ins, not in the
   discomfort capture.

### Q3 — Joint discomfort: capture UX, wording, storage, every reader, localisation

**Capture UX.** One optional 0–3 radio row on the post-session summary,
inside a collapsed "Rate this workout" expander
(`WorkoutSummaryScreen.js:1706-1717`, `:1742`).

- Label: **"Joint discomfort"**
- Hint: **"Joints and tendons, not normal muscle soreness"**
- Values 0,1,2,3 with labels `['None','Slight','Moderate','Significant']`
  (`:68`, `:106-107`)
- Section preamble: "Your answers shape how your recovery is read and, when
  coaching is active, whether next session's workload still makes sense. Skip
  anything you're not sure about." (`:1703`)
- No selection is shown unless the user actually answered (`:1740-1743`
  `realFieldsRef` gate).

**Cadence.** Once per SESSION. Not per set, not per exercise. Additionally
once per WEEK as a Yes/No on the weekly check-in
(`WeeklyCheckInScreen.js:1201-1209`).

**Storage.** `workouts.joint_discomfort` INTEGER (`db:249`, added `:549`),
written only through `updateWorkout`'s field map (`db:3206`) from the debounced
patch (`WorkoutSummaryScreen.js:585-596`). Cloud: `schema.sql:189`, pushed
`sync.js:431`, pulled `sync.js:2099`.
`workout_sets.joint_discomfort` exists but has no writer.

**Every reader:** the 18 rows in §5.1.

**Localisation: none.** No reader maps it to a body region, joint, side, or
even reliably to a single exercise. R1/R3/R8 explicitly fan the one session
number across every muscle trained; `WorkoutSummaryScreen.js:558-573` fans it
across every muscle with weekly volume. The only per-exercise consumer
(`programmeEpoch.js:283`) is unreachable (§7 I-5). The one localising signal
in the whole app is the weekly check-in's `sore_muscles` free-text list
(`db:613`, mapped via `CHECKIN_MUSCLE_MAP` at `algorithms.js:1299-1305`) —
and that is SORENESS, explicitly distinguished from joint pain by both
questions' own hint text.

### Q4 — Incremental-at-write vs recompute-from-history

| Mechanism | Verdict | Proof |
|---|---|---|
| **Recovery EMA** | **RECOMPUTE-FROM-HISTORY, pure, zero stored state** | `src/lib/recoveryEMA.js` has no persistence of any kind. `computeRecoveryEMAs(workouts, now)` loops the supplied workouts and calls `emaValue` (`:48-67`); `emaValue` computes `w = 0.5^(ageDays/halfLifeDays)` and returns `vSum/wSum` (`:23-36`) — normalised by the weight sum, so the output is age-invariant and order-independent. Callers pass a freshly fetched list every time: `ReadinessCards.js:196` (`setRecovery(computeRecoveryEMAs(displayWorkouts))` after `getAllWorkouts` at `:154`, filtered to a 14-day window at `:188-191`) and `insightsEngine.js:199` (`computeRecoveryEMAs(workouts.filter(...), now)`). Grep for any stored EMA column/key: none exists. |
| **Readiness (session easing tweak)** | **RECOMPUTE-AT-READ, pure table lookup, no state** | `resolveSessionEasingTweak` (`sessionAdjustments.js:351-356`) → `getReadinessTweak` (`:241-263`), a lookup into the frozen `READINESS_RULES` (`:211-228`). Inputs are the workout row's own `pre_workout_intent` + `sleep_quality` + `energy_score`, re-read every render (`ActiveWorkoutScreen.js:727-733`) and again inside `loadHistory` from the freshly fetched week (`:1676-1687`). Nothing is written. |
| **Readiness summary line (Home)** | **RECOMPUTE, pure** | `readinessSummary.js:80-186`, all inputs passed in; `nowMs` injectable (`:88`). |
| **sessionAdjustments (COMP-015)** | **COMPUTED ONCE PER SESSION AT START, then PERSISTED as in-memory store state + an `adaptation_events` audit row** | `computeAndLogSessionAdjustments` (`sessionAdjustments.js:86-191`) runs once, fetches six signal sources in one `Promise.all` (`:116-128`), calls the pure `computeSessionAdjustments` (`:166`), then writes one `adaptation_events` row per decision (`:171-184`). The decisions live in the store (`useAppStore.js:1272-1278`) and are persisted into the crash snapshot precisely so a restore does not recompute and double-log (`useAppStore.js:132-135`). So: **not incremental, not recomputed mid-session** — a single point-in-time computation with a durable audit trail. `revertSessionAdjustment` marks `reverted: true` in memory only (`useAppStore.js:1287-1291`); the finish path filters on it (`ActiveWorkoutScreen.js:2930-2932`). |
| **The C20 prescription** | **RECOMPUTE-FROM-HISTORY on every render, from ONE cached raw fetch** | `packetBase` is fetched once per exercise load (`ActiveWorkoutScreen.js:1687-1712`, `setPacketBase(base)` at `:1716`). The packet itself is rebuilt purely in memory on every dependency change (`:759-779` `useMemo`, deps `[packetBase, loggedSets, overrideLoad, overrideReps, readinessTweak, reEntryEaseActive, readinessReduces, readinessDismissed]`), and `prescriptions` is a second `useMemo` calling `resolveSetPrescription` for every position 1..N (`:3103-3110`). After each log it re-assembles from the SAME `packetBase.rawHistory` plus the new set (`:2082-2110`). No DB reads between exercise changes (`:1687-1690` comment). |
| **Recent-performance recall — resolver** | **N = 3 completed sessions, then filtered** | `getLastNWorkoutSets(exercise.id, activeWorkout.id, 3)` (`ActiveWorkoutScreen.js:1565`; the IO seam does the same at `livePrescription.js:658`). `assembleEvidencePacket` then sorts newest-first and `.slice(0, 3)` (`:559-561`). Comparability filters applied: deload sessions dropped entirely (`:544`), band overlap ≥50% of today's band width (`:551-556`), recency ≤ **45 days** and not future-dated (`FORTY_FIVE_DAYS_MS`, `:76`, `:558`), non-empty working rows (`:559`). Outlier discount: top e1RM >10% below the window median removes a session from LEARNING (`:178-192`). |
| **Recent-performance recall — PR detection** | **ALL completed sets for the exercise, unbounded** | `getAllCompletedSetsForExercise` (`db:3638-3644`, no LIMIT), used at `ActiveWorkoutScreen.js:1566`, `:1981`, `:2381`. |
| **Recent-performance recall — coach / session engine** | mixed, all recompute | `getAdaptiveLandmarkHistory` LIMIT **200** grouped rows, then `computeAdaptiveLandmarks` reads the last 8 (`db:6569`, `:6606-6617`, `algorithms.js:963-1010`). `getSessionAdjustmentSignals` takes the **most recent completed session per muscle, unbounded in age** (`db:10073-10086`) — age is then gated downstream: 72 h for the soreness branch (`algorithms.js:1153`), 4 days for check-in freshness (`:1159`), 14 days for the +1 branch (`:1201-1203`). `getRecentAdaptationEvents(userId, 6)` = **6 weeks** (`db:5430-5433`). `getWeeklyVolumeByMuscle(userId, 1, now)` = trailing 7 days (`sessionAdjustments.js:123`). `getRecentWorkoutFeedback(userId, 6)` = last 6 rated sessions (`db:10107-10118`). Layoff for the resolver = days since this exercise's last logged set (`ActiveWorkoutScreen.js:1594-1595`), >7 triggers the 0.9 senior trim (`livePrescription.js:836-849`). |

**Bottom line for CC25's H3 kill-test:** in this domain there is **no
incremental accumulator anywhere**. Every recovery/readiness/prescription
value is recomputed from stored rows at read time. The only things written
once and never recomputed are the `adaptation_events` audit rows and the
`session_resolutions` rows.

### Q5 — Provenance for WHY a set/exercise deviated from prescription

Walking each deviation path and listing exactly what lands on disk:

| Deviation | What is written | Where | What is NOT written |
|---|---|---|---|
| **Athlete logs a lighter/heavier load than prescribed** | the `workout_sets` row with the ACTUAL weight (`ActiveWorkoutScreen.js:1896-1914`). In memory only: `overrideLoad` is set (`:2069`) and a Sentry breadcrumb `workout.prescription.overridden` with `{exerciseId, direction}` (`:2071-2075`) | `workout_sets` | the prescribed weight, the provenance code, the reason, the fact that it WAS an override. `overrideLoad` is cleared on exercise change (`:1541-1542`) and never persisted |
| **Athlete logs fewer/more reps than prescribed** | the row's `actual_reps`, plus `target_reps_min`/`target_reps_max` **from the routine row, not from the resolver** (`:1902-1903`) | `workout_sets` | the resolver's `repsTarget` for that exact position; `overrideReps` (`:2077-2078`) is memory-only, no breadcrumb even |
| **Athlete skips a SET (logs fewer sets than target)** | **nothing.** A missing set is simply an absent row | — | everything |
| **Athlete removes an exercise mid-session** | **nothing on disk.** Only breadcrumb `workout.exercise.removed` (`:996`) | — | everything |
| **Athlete swaps an exercise mid-session** | one `exercise_swaps` row: `from_exercise_id`, `to_exercise_id`, `routine_id`, `explicit=1`, `scope='session'`, timestamps (`db:9842-9856` via `:1090-1093`) | `exercise_swaps` | any reason/cause. The table has no reason column (`db:2205-2217`). Note the sets already logged on the OLD exercise remain attached to it in the DB and are counted at finish (`:2802-2810`), while the in-memory slot is reset to `sets: []` (`:1105`) |
| **Time-crunch / starter trims the session** | **nothing.** `_timeCrunchSkipped` is in-memory (`:2692`, `:2761`) | — | everything; `shouldConfirmBeforeFinish` even treats a time-crunched exercise as a deliberate drop so no confirm fires (`workoutHelpers.js:68`) |
| **Athlete stops the session early** | one `session_resolutions` row `resolution='ended_early'` + `workout_id`, atomically with the workout close (`db:5281-5310`) | `session_resolutions` | any reason. Untouched exercises produce NO rows at all — "the untouched exercises produce NO evidence rather than zeros" (`ActiveWorkoutScreen.js:3016-3018`) |
| **Athlete skips the whole session from Home** | one `session_resolutions` row `resolution='skipped_by_user'` (`HomeScreen.js:1375-1380`) | `session_resolutions` | any reason, deliberately — `HomeScreen.js:1356-1357` |
| **The APP eases the session (readiness/re-entry)** | one `adaptation_events` row per COMP-015 decision with `reason_code`, `reason_text` and a `signals_json` blob (`sessionAdjustments.js:171-184`) — but only inside a mesocycle (`:90`). The B2/re-entry set+load trim itself writes **nothing** | `adaptation_events` (COMP-015 only) | the readiness trim's own record; the resolved per-set targets |
| **The APP prescribes a deload/recovery load** | nothing set-level; the deload targets are computed live from week-1 sets each time (`ActiveWorkoutScreen.js:1650-1663`) | — | which sets were recovery-week sets. `buildEvidencePacket` even hard-codes `isDeload: false` for history (`livePrescription.js:667`), so a later read cannot exclude them |
| **The user answers the post-session ratings** | `workouts.session_difficulty / overall_pump / joint_discomfort / fatigue_level / notes` (touched fields only), plus per-muscle `adaptation_events` (`WorkoutSummaryScreen.js:845-863`) | `workouts`, `adaptation_events` | any link between a rating and a specific exercise or set |

**Summary answer to Q5:** the ONLY durable deviation provenance today is
(a) `target_reps_min/max` on each set row versus its `actual_reps` — and that
target comes from the routine, not from the resolver — (b) an
`exercise_swaps` row with a scope but no reason, and (c) a
`session_resolutions` row with a two-value enum and no reason. Load
deviation, set omission, exercise removal and time-crunch trims leave no
durable trace at all.

---

## 14 UNKNOWN / UNVERIFIED

1. **Whether `workout_sets.joint_discomfort`, `post_set_pump`,
   `post_set_muscle_connection`, `missed_reps`, `amrap_reps`, `left_reps`,
   `right_reps` hold real data in the live production database.** OBSERVED:
   the current build writes none of them. Older builds did write `left_reps`/
   `right_reps` (migration 054's own dependency note names
   `ActiveWorkoutScreen` as the writer, `migrate_054:31-33`) and
   `LoggedSetRow.js:124` exists specifically to render them, which is evidence
   that such rows exist — but the row COUNT is a production-data question this
   audit cannot answer from the repo. UNVERIFIED.
2. **Whether the cloud `workouts` table actually has `sleep_quality` /
   `energy_score` columns applied.** `migrate_072` and `migrate_118` both add
   them; `supabase/README.md` was not read row-by-row for 072/118. The pull-side
   omission (P-5) is independent of this and is OBSERVED either way.
3. **`docs/live-prescription-campaign-20-2026-08-16/CAMPAIGN-20-PHASE-1-DESIGN.md`
   section numbering** — quoted only through the code's own citations
   (e.g. `livePrescription.js:5-6`, `:69`, `:544`). The design doc itself was
   not opened; the brief instructed to verify against live code, which is what
   was done. Any claim here sourced from a §-number in a code comment is
   REPORTED, not OBSERVED.
4. **The exact test count the brief calls "~121"** — the live count is 135
   across four suites (§8). Whether 121 was an earlier stage count is
   UNVERIFIED.
5. **Whether `evaluateAutoReg` / `predictDeloadWeek` (`mesocycle.js:212`,
   `:315`) have any caller outside `src/`** (e.g. a script or workflow).
   Searched `src/` only; the comment at `MesocycleBuilderScreen.js:98-109`
   states they are "production-unreferenced, a standing D37 founder-triage
   item". REPORTED + consistent with the grep.
6. **Whether any `adaptation_events` row with `decision='rotate_exercise'`
   exists in production**, i.e. whether C-6's false claim has actually been
   shown to users. The code path is live and reachable; the data question is
   UNVERIFIED.
7. **Runtime behaviour of the logger.** Every logger finding here is
   static-source evidence. The guard suites are also source-level, so no
   behavioural test proves the per-side flow, the draft restore, or the
   re-resolution actually behave as read. UNVERIFIED by execution.
8. **`workout_sets` cloud column list as APPLIED.** `schema.sql` is stale
   (S-8) and the audit did not query production. The migration files are the
   canonical record and were read; the live table was not inspected.
