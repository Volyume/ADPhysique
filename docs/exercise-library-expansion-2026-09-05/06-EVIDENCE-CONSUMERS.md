# Evidence consumers of `workout_sets` (deliverable 06)

Authority: founder brief 2026-09-05 Part XV (EVIDENCE / COACHING
COMPATIBILITY) and Part XIV (CIRCUIT PRESCRIPTION SEMANTICS). Precedent:
`docs/capability-campaign-25-2026-08-20/ARCHITECTURE.md` section 7 (the
learning-eligibility matrix, lines 533-583) — the existing model for
excluding evidence from a consumer without erasing history (F/C/I values
per consumer, comparability stage, `deferredToManual`-style skip).

Scope: read-only survey. No new eligibility rule is proposed here; this
maps what exists so the lead can rule FULLY / PARTIALLY / NOT comparable
per consumer for kettlebell-ballistic, resistance-circuit and any
timed-station evidence.

---

## 1. `workout_sets` schema (source of truth)

`src/lib/database.js:257-279` (CREATE TABLE), plus additive columns via
`addColumnIfMissing`/inline `ALTER TABLE`:

| Column | Added | Line |
|---|---|---|
| `set_type TEXT DEFAULT 'straight'` | initial | 263 |
| `is_amrap INTEGER DEFAULT 0`, `amrap_reps` | initial | 275-276 |
| `missed_reps INTEGER` | ALTER | 499 |
| `rir INTEGER`, `rpe REAL` | ALTER | 567-568 |
| `deleted_at INTEGER`, `exercise_name TEXT` | ALTER | 794-795 |
| `left_reps INTEGER`, `right_reps INTEGER` (unilateral) | ALTER | 1291-1292 |

**No `superset_group_id`, `rest_seconds`, `tempo`, `cause` or any
provenance/style column exists on `workout_sets` or `workouts`.**
`superset_group_id` and `rest_seconds` live ONLY on `routine_exercises`
(`ALTER TABLE routine_exercises ADD COLUMN rest_seconds…`/`…superset_group_id…`,
lines 469-470) — the PRESCRIPTION, not the logged set. `exercise_swaps.cause`
(line 2812, the capability campaign's provenance field, migrate_149) is the
only provenance-typed column anywhere in the schema; nothing analogous
exists for sets or workouts. Grep for `tempo` across `src/lib` and
`database.js` returns **not found**.

### 1.1 Structure snapshot at workout start
`ActiveWorkoutScreen` builds `workoutExercises` in memory from
`getRoutineExercisesWithDetails` (`database.js:4522-4544`, reads
`re.rest_seconds AS restSec`, joins `superset_group_id` via the screen's
own state, e.g. `ActiveWorkoutScreen.js:1224-1225`). This is a LIVE READ of
the routine, not a persisted snapshot: `workout_sets` rows written back
(`createWorkoutSet`, `database.js:4120-4171`) carry only the columns in
the table above — no `superset_group_id`, no `rest_seconds`. **Superset
membership and rest prescription are not recoverable from a completed
set once training moves on from the routine that produced it**, so no
consumer below can or does key off superset membership after the fact.

### 1.2 `set_type` values in use and writers
Grepped across `src/**/*.js` (excl. tests): `straight` (default),
`warmup`, `dropset`, `myo_reps`, `rest_pause`, `amrap`.

| Value | UI label (`ActiveWorkoutScreen.js:213-218`) | Written by |
|---|---|---|
| `straight` | "Working" | default fallback everywhere; `useAppStore.js:1711` |
| `warmup` | "Warm-up" | `ActiveWorkoutScreen.js` set-type picker |
| `dropset` | "Drop set" | ″ |
| `myo_reps` | "Myo-reps" | ″ (`clusterSet.js:18` `CLUSTER_SET_TYPES`) |
| `rest_pause` | "Rest-pause" | ″ |
| `amrap` | "AMRAP" | ″; derives `is_amrap` boolean (`useAppStore.js:1720`) |

Other writers: `src/lib/importExternal.js:244-247` (Hevy CSV import,
maps `warmup`/`dropset`/`failure→amrap`/else `straight` — has **no**
mapping for `myo_reps`/`rest_pause`, so an imported cluster set always
lands as `straight`); `src/lib/sync.js:505` (cloud pull applier, writes
`set_type` verbatim from the remote row); `database.js:10320-10327`
(same pull-applier INSERT path).

`is_amrap`/`amrap_reps` are a separate boolean+count pair, not a
`set_type` value on the DB row, though the UI treats `'amrap'` as one of
the six picker options and derives the boolean from it.

### 1.3 History display distinctions
Only **warm-up** and **drop set** get a distinct label in the completed
history view (`ExerciseDetailScreen.js:936-937`:
`s.set_type === 'warmup' ? ' - Warm-up'`, `'dropset' ? ' - Drop set'`).
`myo_reps` and `rest_pause` are excluded from eligibility everywhere
they matter (below) but get **no label** in `ExerciseDetailScreen` or
`WorkoutHistoryScreen` history rows — a viewer cannot tell from history
that a row was a cluster set. `LoggedSetRow.js:55` (live session list)
labels only `warmup` ("Edit warm-up set"). `formatLoggedSet`
(`workoutHelpers.js:171-187`) branches on the exercise's `exercise_type`
(`weight_reps`/`weighted_bodyweight`/`reps_only`/`duration`/`distance`,
schema at `database.js:236`) to pick display text and whether to show
Est-1RM — this is the existing "style-shaped display" precedent: a
`duration`/`distance` exercise already suppresses the 1RM estimate
(`showE1RM: false`) rather than computing nonsense on it.

---

## 2. Consumer map

Each row: file:line · what it reads · existing exclusions · muscle
counting · superset/rest/tempo sensitivity · where an unhandled
alternative-style set enters today.

### 2.1 e1RM / PR / plateau (`src/lib/algorithms.js`)
- **`isE1rmEligibleRow`** (384-387): reads `setType`/`set_type`.
  Excludes `warmup`, `myo_reps`, `rest_pause` (cluster rows store a
  summed rep count, C6 P11-1/D97-18). Does **not** exclude `dropset` or
  `amrap`. No superset/rest/tempo read.
- **`detectPR`** (389-465+): reads `weight`, `actualReps`/`actual_reps`,
  `exercise.loadSemantics`. Gates on `isE1rmEligibleRow`. Assisted-load
  branch (407-443) inverts comparison for `loadSemantics==='assisted'`;
  no branch exists for a ballistic/ROM-based load semantics.
  **Unhandled entry point**: a kettlebell ballistic set (e.g. swings,
  fixed light load for high reps) passes `isE1rmEligibleRow` (it is
  `straight`) and feeds `calculate1RM(weight, reps)` — Epley on a
  20 kg×25 swing set produces a fabricated "estimated max" exactly the
  class of defect C6 P11-1 was written to stop for cluster sets.
- **`detectPlateau`** (1431-1465+) and the trend-window builder
  (1567-1610): both `.filter(isE1rmEligibleRow)` (1394, 1451, 1601). Same
  gap: nothing excludes a ballistic/circuit row from plateau/trend
  windows today.
- **`summariseWorkoutSets`** (215-223) / **`isHardSet`** (225-228):
  exclude only `warmup`. `calculateTonnage` (referenced, not re-read here)
  runs over every non-warm-up row including `dropset`/`amrap`.
- **`allocateExerciseVolume`** (237-267) / **`calculateWeeklyVolume`**
  (270-299): per-muscle credit keyed ENTIRELY by the exercise's
  `primaryMuscle`/`secondaryMuscles` metadata — primary at 1.0, each
  secondary at its `contribution` (default 0.5). **`set_type` plays no
  role in muscle attribution beyond the warm-up exclusion in
  `isHardSet`.** A circuit "round" is only correctly attributed if each
  station is still logged as its own `workout_sets` row against its own
  `exercise_id`; a single row logged for a whole round (no per-exercise
  split) cannot be attributed at all under this allocator.

### 2.2 Live-prescription learning/capability (`src/lib/livePrescription.js`)
- `NEVER_ELIGIBLE_TYPES` (69): `warmup`, `dropset`, `myo_reps`,
  `rest_pause` — never feed evidence or get prescribed for.
- `CAPABILITY_TYPES` (73): `straight`, `amrap` — carry evidence/prescription.
- `STRUCTURE_TYPES` (74): `straight` only — AMRAP excluded from
  structure/expected-curve learning.
- Line 434 reads `r.setType ?? r.set_type ?? 'straight'`; line 911-912
  builds `excludedSetType` from the same four `NEVER_ELIGIBLE_TYPES`
  values for the per-position resolver.
- Line 972: `pos.setType === 'amrap'` special-cased for reps-only capability.
- **Where unhandled**: a ballistic/circuit set is `straight` by default,
  so it is `CAPABILITY_TYPES`+`STRUCTURE_TYPES` eligible and will feed
  the load-progression resolver identically to a barbell straight set —
  it would drive "add load next session" logic against a stimulus that
  isn't a maximal top-set effort.

### 2.3 Block ledger gather (`src/lib/blockLedgerGather.js`)
- **`sumCompletedSets`** (265-283): excludes `warmup` (271), requires
  `reps > 0`, looks up the exercise and calls `allocateExerciseVolume`.
  Per-muscle credit identical mechanism to 2.1.
- **`collectMuscleSessionRows`** (289-319): excludes `warmup` (300); used
  as the recovery-EMA feedback (soreness/joint-discomfort) input keyed to
  sessions where the muscle was PRIMARY. Subjective ratings live on
  `workouts` (`soreness_24h_before`, `joint_discomfort`), not on the set
  row — style-blind by construction.
- **`computeAchievedWeeklyPeak`** (326-368): excludes `warmup` (359), same
  allocator; feeds the block ledger's achieved-peak (used by
  `learnedRange.js` ceiling fold).
- No `dropset`/`myo_reps`/`rest_pause`/`amrap` distinction anywhere in
  this file — only warm-up is filtered.

### 2.4 Learned range / block ledger classification / block seed
- `src/lib/learnedRange.js` (whole file, 258 lines): pure replay over
  already-gathered block-ledger entries (`confidence`, `classification`,
  `observed.suppressed`, `proposal.startSets`). **No direct `set_type`
  read** — it inherits whatever `blockLedgerGather.js` already filtered
  (warm-up only). Constrained/suppressed entries are skipped via the
  `observed.suppressed`/manual-override flags established by the
  capability campaign, not by set style.
- `blockAdvisor.js`, `programmeEpoch.js`, `blockSeed.js`, `mesocycle.js`:
  grepped for `set_type`/`setType`/`warmup` — **none found**; these
  consume block-ledger/interBlock classifications
  (RESPONSIVE/STRAINED/OVERREACHED/STALE/CONSTRAINED), not raw sets, so
  an alternative-style set enters them only indirectly, through whatever
  `sumCompletedSets`/`computeAchievedWeeklyPeak` already counted.

### 2.5 Recovery EMA / readiness
`src/lib/recoveryState.js` (298 lines): `describePrescriptionDifferences`
(238-266) filters `warmup` only (244) when comparing baseline vs.
prescribed set counts/reps/weight/RIR for the recovery-adjustment copy.
The systemic recovery signal itself is built from `workouts.soreness_24h_before`/`joint_discomfort` (subjective per-session ratings, see 2.3) —
genuinely style-blind, matching the ARCHITECTURE.md matrix's F-everywhere row.

### 2.6 Session adjustments / weekly coach (`weeklyCoach.js`, `coachApply.js`, `coachPrecedence.js`)
- `coachPrecedence.js:classifyTrainingLimiter` (192-230): reads
  `context.training.execution.signal`, `.progress.signal`,
  `.physicalConstraint` — **session-count and classification level**, not
  raw sets. `trainingExecutionFact` (`coachContext.js:133-136`) is built
  from `sessionsCompleted`/`sessionsPlanned` (workout-level, not set-type
  aware).
- `weeklyCoach.js`: no `set_type`/`warmup` reads found; its `adherence`
  logic (grep hits at nutrition-adherence lines only, e.g. 216-241,
  865-1485) is calorie/food-diary adherence, a separate domain from
  training-set eligibility. Training weekly-ratio adherence (the
  ARCHITECTURE.md matrix's "Adherence — weekly ratio (G§2.4)" row) is
  session-count based via `coachPrecedence.js`/`coachContext.js`, not
  keyed to `set_type` at all — an alternative-style session counts as a
  completed session identically to a barbell one.

### 2.7 Exercise preference / swap evidence (`src/lib/exercise/intent.js`)
- `swapEvidenceFor` (436-459): filters `exercise_swaps` rows by
  `r.cause !== 'constraint'` (442, 474) — the capability campaign's
  provenance exclusion. **No equivalent field exists for `workout_sets`
  or `workouts`**; a swap made specifically because a circuit/ballistic
  substitution was offered has no `cause` value reflecting that today —
  it would either need a new `cause` value or fall through as ordinary
  preference evidence (risk of over-counting forced-by-equipment swaps
  as genuine preference).

### 2.8 Volume audit (`src/lib/exercise/volumeAudit.js`)
`countDeliveredSets`/`auditPlanVolume`/`compareStages` (69-139): count
by `row.primaryMuscle` from the exercise catalogue and `ex.sets` (a
planned/delivered SET COUNT per exercise, not per logged `workout_sets`
row) — this is a plan-generation consistency check, not a completed-set
evidence consumer. `set_type` is not read at all; it operates one level
above the sets table.

### 2.9 Display / celebration / share surfaces
- **`ExerciseDetailScreen.js`** (129, 184, 354, 936-937): excludes
  `warmup` for trend/e1RM display filters; labels `warmup`/`dropset` only
  in history rows (2.1.3 above).
- **`WorkoutHistoryScreen.js`** (76, 164, 241, 363): excludes `warmup`
  only, for working-set counts shown per exercise/session.
- **`sessionShareData.js:topSetFromExerciseData`** (18-30): "best lift"
  share-card highlight — excludes `warmup` only, picks by raw `weight`.
  A ballistic kettlebell set (light load) would never win "best lift" by
  this metric, which is directionally safe but means the share card's
  headline number is meaningless for a session that is ALL ballistic
  work (no comparably "heavy" set exists to feature).
- **`bestLift.js:pickBestLift`** (26-60+, "Great Week" recap): ranks by
  e1RM **gain**, defaulting to `calculate1RM` — inherits the same
  fabricated-e1RM risk as 2.1 for a ballistic set with no eligibility
  gate applied before this function is called (the caller is expected to
  pre-filter warm-ups per the doc comment at line 27, but nothing pre-filters ballistic/circuit rows).
- **`workoutRecordLine.js:buildRecordLine`** (49+): live "on for a
  record" line reuses `detectPR`; already null-cases warm-ups and
  non-weight-reps schemas (duration/distance) via the `isWeightReps`
  gate — the existing precedent for excluding a whole exercise TYPE from
  PR-chasing, not just a set TYPE.
- **Widgets / partner signals** (`src/widgets/widgets.js`,
  `src/lib/partners/weekSignalWriter.js`, `sharedStreak.js`): operate on
  workout/session completion and streak state
  (`computeWeekState`/`loadStreakState`), not on `set_type` — no grep
  hits for `set_type`/`setType` in either directory. Style-blind by
  construction, matching the ARCHITECTURE.md matrix's C-row ("counts
  computed against effective prescription; no health content exported").

---

## 3. Matrix — consumer x (reads / exclusions / where a new value needs handling / risk)

| Consumer | Reads | Existing exclusions | New `set_type`/style needs handling? | Risk if unhandled |
|---|---|---|---|---|
| `isE1rmEligibleRow`/`detectPR`/`calculate1RM` (algorithms.js:384-465) | `set_type`, weight, reps, `loadSemantics` | warmup, myo_reps, rest_pause | YES — no ballistic/circuit exclusion or load-semantics branch | **HIGH**: fabricated e1RM/PR from swing-style high-rep light-load sets |
| `detectPlateau`/trend windows (algorithms.js:1394-1610) | same via `isE1rmEligibleRow` | same as above | YES, inherits algorithms.js gate | **HIGH**: false plateau/trend read on non-maximal-effort styles |
| `livePrescription.js` NEVER/CAPABILITY/STRUCTURE_TYPES (69-74, 911-912) | `set_type` | warmup, dropset, myo_reps, rest_pause excluded from evidence; straight/amrap included | YES — a new style value falls into `straight` by default = fully eligible | **HIGH**: load-progression resolver prescribes against ballistic/circuit stimulus as if it were a top-set strength effort |
| `allocateExerciseVolume`/`calculateWeeklyVolume` (algorithms.js:237-299) | exercise `primaryMuscle`/`secondaryMuscles` only | warmup (via `isHardSet`) | Only if a round is logged as ONE row spanning multiple exercises | **HIGH** (circuits specifically): per-exercise attribution breaks if a round isn't logged as N per-station rows |
| `blockLedgerGather.sumCompletedSets`/`computeAchievedWeeklyPeak` (265-368) | `set_type`, reps, exercise lookup | warmup only | Same as above | **MEDIUM**: block-ledger volume/peak inherits whatever raw counting does |
| `learnedRange.js` fold | block-ledger entries (pre-filtered) | inherits upstream | NO direct change; depends on 2.3/2.4 gather | **LOW** direct, MEDIUM inherited |
| `blockAdvisor`/`programmeEpoch`/`blockSeed`/`mesocycle` | block-ledger classifications | inherits upstream, no direct set_type read | NO direct change | **LOW** direct, MEDIUM inherited |
| `recoveryState.js` EMA/readiness | `workouts.soreness_24h_before`/`joint_discomfort` (subjective) | warmup only (session-count comparisons) | NO | **LOW** — style-blind by design |
| `coachPrecedence.classifyTrainingLimiter`/adherence | `sessionsCompleted`/`sessionsPlanned` (session grain) | none set-type-specific | NO | **LOW** — session-count based |
| `exercise/intent.js swapEvidenceFor` | `exercise_swaps.cause` | `cause==='constraint'` excluded | YES if alt-style substitutions should also be excluded from preference evidence | **MEDIUM**: no cause value exists for "swapped because circuit/kettlebell offered", risk of polluting preference evidence |
| `volumeAudit.js` | exercise catalogue `primaryMuscle`, planned/delivered set counts | none | NO | **LOW** — plan-generation check, not evidence learning |
| History display (`ExerciseDetailScreen`, `WorkoutHistoryScreen`, `LoggedSetRow`) | `set_type` for label + e1RM/trend filters | warmup + dropset labeled; myo_reps/rest_pause excluded from calc but unlabeled | YES for a new style's label | **LOW-MEDIUM**: cosmetic today, but an unlabeled alt-style row reads as an ordinary straight set in history |
| `sessionShareData.topSetFromExerciseData`/`bestLift.pickBestLift` | weight, e1RM gain | warmup only | YES (inherits detectPR/calculate1RM gap) | **MEDIUM**: share-card/recap headline number meaningless or fabricated for all-ballistic sessions |
| `workoutRecordLine.buildRecordLine` | `detectPR`, `isWeightReps`/`exerciseType` gate | warmup, non-weight-reps schemas (duration/distance) | Existing exercise-TYPE gate is the closest precedent; extend rather than invent | **MEDIUM** — same fabricated-PR risk live, mid-session |
| Widgets / partner signals / streak | session/workout completion | none set-type-specific | NO | **LOW** — style-blind |

---

## 4. Three consumers most at risk if circuit/ballistic evidence enters unchanged

1. **`algorithms.js` e1RM/PR/plateau family** (`isE1rmEligibleRow`,
   `detectPR`, `detectPlateau`, lines 384-465, 1394-1610) — a ballistic
   kettlebell set (light load, high reps, non-maximal effort) is
   `set_type==='straight'` today and sails through every eligibility
   gate that currently exists only for warm-up/cluster rows, fabricating
   1RM estimates, PRs and plateau/trend reads exactly as C6 P11-1 already
   diagnosed for cluster sets.
2. **`livePrescription.js` capability/structure resolver** (69-74,
   434, 911-972) — same default-`straight` gap feeds the live
   load-progression engine, so it would prescribe "add load" or flag a
   miss against a stimulus (ballistic ROM work, or a circuit round) that
   was never a top-set strength effort.
3. **Per-muscle volume allocator** (`allocateExerciseVolume`/
   `calculateWeeklyVolume` in algorithms.js, reused verbatim by
   `blockLedgerGather.sumCompletedSets`/`computeAchievedWeeklyPeak`) —
   attribution is keyed to ONE `exercise_id` per `workout_sets` row; a
   resistance-circuit "round" is only correctly counted if each station
   is logged as its own row against its own exercise. If a round is
   ever logged as a single combined row (or a new pseudo-exercise
   representing the whole circuit), every downstream per-muscle
   consumer — landmarks, block ledger, learned range, weekly coach
   volume matrix — silently miscounts or drops the volume.
