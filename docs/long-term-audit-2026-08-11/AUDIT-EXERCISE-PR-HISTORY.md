# Campaign 6 — Phases 10 and 11: exercise history over months, and the mature PR system

Audit lane, READ-ONLY. Authority: the founder's Campaign 6 order, Phase 10
("EXERCISE HISTORY OVER MONTHS", order lines 182-185) and Phase 11 ("PR
LONG-TERM MEANING", lines 188-192), read verbatim from the session
scratchpad copy. Campaign log and D97 rulings read first; items already
ruled (D97-1 through D97-9) are referenced, never re-reported.

Nothing in the product was changed. No commit, no push, no stash, no
migration. The only file this lane writes is this document. Existing jest
suites were run read-only (all green, see §6).

Branch `claude/campaign6-long-term`, tree as found.

---

## 1. Ranked findings

Severity is product severity for a user at 90 to 365 days, not code
tidiness. "DEFECT" means live behaviour contradicts a stated rule, a
sibling surface, or the app's own copy. "LATENT" means the behaviour is
consistent with a documented design choice but carries a long-term
consequence the founder should see. "CLEAN" items are in §5.

| # | ID | Class | Severity | Finding | Primary evidence |
|---|----|-------|----------|---------|------------------|
| 1 | P11-1 | DEFECT | **HIGH** | High-rep rows (myo-reps / rest-pause clusters store SUMMED reps in one set row; also AMRAP and high-rep back-offs) produce an estimated-1RM ~1.9x the load, fire a false estimated-max record, and then permanently block every genuine record on that exercise | `src/lib/algorithms.js:96-119`, `src/lib/algorithms.js:615-668`, `src/lib/clusterSet.js:11-15`, `src/screens/ActiveWorkoutScreen.js:2147-2155` |
| 2 | P11-2 | DEFECT | **HIGH** | The Progress tab's "New PRs / Last 30 days" tile counts the FIRST-EVER set of every exercise as a PR, counts warm-ups, and counts distance/duration phantom PRs. **Pinned-test conflict** — the first-ever-set behaviour is explicitly pinned | `src/hooks/useProgressData.js:23-61`, `:164`, `src/screens/AnalyticsScreen.js:442-449`, pin at `src/hooks/__tests__/useProgressData.test.js:84-87` |
| 3 | P10-1 | DEFECT | **HIGH** | The Exercise Detail "Personal records" wall and its chart PR markers read only the most recent **200 set rows**, so a user's all-time records silently become wrong somewhere around month 6; the window edge also fabricates a PR marker, and the query has no `is_completed` filter | `src/screens/ExerciseDetailScreen.js:332`, `:347-366`, `:652-700`, `:902-933`, `src/lib/database.js:2995-3004` |
| 4 | P10-2 | DEFECT | MED-HIGH | The live "Record set if you hit this" line promises a record during a **first-ever exposure** (set 2 onwards) that FQ-7 then refuses to award — breaking that module's own stated agreement contract | `src/lib/workoutRecordLine.js:9-17`, `:63-69`, `src/screens/ActiveWorkoutScreen.js:2641-2653` vs `:1689-1696` |
| 5 | P10-3 | DEFECT | MED-HIGH | Exercise Detail's chart PR markers still use the pre-FQ-7 **set-grain** gate, so the first-ever session is marked a PR session whenever set 2 beats set 1. Lift Progress's sibling marker is session-grain and does not | `src/screens/ExerciseDetailScreen.js:173-217` vs `src/lib/liftProgress.js:164-173` |
| 6 | P11-3 | DEFECT | MED | The session PR history ref is wiped on **every exercise-index change**, so returning to an exercise inside one session (supersets, back-navigation) drops that session's bar: the logger can award a record the D87 line did not promise, and one record can fire twice | `src/screens/ActiveWorkoutScreen.js:1277`, `:1674-1677`, `:1344-1345`, `:2641-2653` |
| 7 | P10-4 | DEFECT | MED | A **plan-level** exercise swap keeps the old exercise's `starting_weight` and rep band, so an unrelated exercise inherits the previous exercise's load baseline. The in-session swap deliberately nulls both | `src/lib/database.js:3571-3589`, `src/screens/RoutineDetailScreen.js:303-310` vs `src/screens/ActiveWorkoutScreen.js:816-836`, `:1391` |
| 8 | P10-5 | DEFECT | MED | A brand-new custom exercise's deliberately-null stimulus-to-fatigue ratio is **fabricated as 3** (and fatigue cost as 1) the moment it syncs, so after any round-trip it enters swap ranking as a "real, ranked candidate" — the exact outcome the creation path's comment forbids | `src/lib/sync.js:247-248` and `src/lib/database.js:7800-7801` vs `src/components/ExercisePickerModal.js:179-184` |
| 9 | P11-4 | DEFECT | MED | The weekly PR tally uses a different window and grain from the live detector: a genuine second-exposure record inside the **same calendar week** as the first exposure counts 0, and several records on one exercise collapse to 1 — the week's number can contradict the celebrations the user saw | `src/lib/database.js:6267-6331` vs `src/screens/ActiveWorkoutScreen.js:1689-1727` |
| 10 | P11-5 | DEFECT | LOW-MED | Cloud exercise apply merges by `LOWER(name)`: a custom exercise named identically to a library exercise re-points **all** of that library exercise's `workout_sets` and deletes the library row, merging two exercises' records. Nothing guards duplicate names at creation | `src/lib/database.js:7783-7806`, `src/components/ExercisePickerModal.js:161-196` |
| 11 | P10-6 | LATENT | MED | The Block Ledger's novelty gate says "An exercise change broke the strength comparison" but the real condition is "under half this muscle's session-instances came from stable exercises" — true for pure rotation or late-added accessories, where nothing was changed | `src/lib/blockMetrics.js:257-258`, `:312`, `src/lib/interBlock.js:297-300` |
| 12 | P10-7 | LATENT | MED | Unloaded bodyweight work can never set a record and contributes **zero** strength evidence, so a bodyweight-trained muscle lands on INSUFFICIENT_DATA with copy that calls the picture "too unsettled to judge" rather than unmeasured; that muscle's personalisation never compounds | `src/lib/blockMetrics.js:194-198`, `:304-306`, `src/lib/interBlock.js:302-305`, `src/lib/algorithms.js:615-620` |
| 13 | P11-6 | LATENT | MED | Strength standing pairs an **all-time best** estimated max with the **latest** bodyweight, so a large bodyweight change moves the user's level without any change in lifting | `src/screens/LiftProgressScreen.js:167-182`, `:302`, `src/lib/strengthStandards.js:56-58` |
| 14 | P10-8 | LATENT | LOW-MED | The ledger's prior-evidence window is 180 days, so an exercise returned to after a longer gap is treated as new (x0.5) and re-baselined inside the ledger, while the live PR wall still compares it against the all-time best. Conservative, but the two surfaces disagree silently | `src/lib/blockLedgerRunner.js:66-69`, `:125`, `src/lib/blockMetrics.js:260`, `:325` |
| 15 | P11-7 | LATENT | LOW-MED | Year of Lifts still headlines window-bests as "Personal records" — the same overclaim FB-16 (D96) fixed on the block variant | `src/screens/YearOfLiftsScreen.js:160-172`, `src/lib/database.js:6486-6505` vs `src/screens/BlockReflectionScreen.js:273-289` |
| 16 | P11-8 | LATENT | LOW | Editing or deleting a set corrects only that set's own badge; a later set's badge earned by beating it is not re-evaluated for the rest of the session | `src/screens/ActiveWorkoutScreen.js:1984-1993`, `:2053-2057` |
| 17 | P11-9 | LATENT | LOW | `getYearOfLiftsData` filters `ws.set_type != 'warmup'`, which also drops NULL `set_type` rows; the sibling lifetime-tonnage query uses `IS NULL OR ...` | `src/lib/database.js:6445` vs `:6414` |

Carried, not re-reported: the flat 10% layoff cut at >7 days per exercise
regardless of gap length (already characterised under **D97-3**, and its
copy is honest); the stored-ledger layoff asymmetry (**D97-3**); the
learned-band bypass on activation paths (**D97-9**).

---

## 2. Phase 10 — per-scenario traces

The scenario set is the founder's own list (order line 184): uses an
exercise for several months; substitutes it; returns later; adds a
brand-new exercise; changes rep range; changes setup; uses a bodyweight
variation; changes bodyweight substantially.

### 2.1 Uses an exercise for several months

Live PR detection loads the exercise's whole history:
`getAllCompletedSetsForExercise` (`src/lib/database.js:3043-3053`) is
unbounded, filtered to completed workouts and excluding the current one.
The screen's `prHistory` is built from that plus this session's rows, both
sides working-sets-only (`ActiveWorkoutScreen.js:1674-1677`, filter
`isWorkingSetRow` at `:90`). So the in-session record engine stays correct
at any history length — no cap, no window.

The **read** surfaces do not match that. `ExerciseDetailScreen` loads
`getWorkoutSetsForExercise(exerciseId, user.id, 200)`
(`ExerciseDetailScreen.js:332`; the query is `ORDER BY created_at DESC
LIMIT ?` at `database.js:2995-3004`). Everything on that screen is derived
from those 200 rows: the "Personal records" highlight card (`:347-366`,
rendered `:652-700`), the "Personal records" list (`:902-933`), the
all-time best that drives exercise-goal achievement (`:370-378`) and the
chart's PR markers (`derivePRSessionDates`, `:173-217`). At four working
sets a session that is roughly fifty sessions; with warm-ups included
(the query has no `set_type` filter) it is fewer. Twice a week, that is
under six months. Past that point the screen shows the best of a rolling
window and calls it a personal record. **P10-1.**

Two riders on the same query: it has no `w.is_completed` join, so rows
from an in-progress or abandoned session can enter the record wall; and
because the replay in `derivePRSessionDates` starts from an empty history
at the window edge, the oldest session inside the window is treated as a
first exposure — its second set can be marked a PR session although real
prior history exists just outside the cap.

`LiftProgressScreen` is the counter-example and is clean: it reads
`getCompletedWorkoutSets` (`database.js:2720-2730`), unbounded and
completed-only (`LiftProgressScreen.js:149-155`).

### 2.2 Substitutes it

**In session** (`handleConfirmSwap`, `ActiveWorkoutScreen.js:816-866`):
the slot's `routineExercise` is rebuilt — `exerciseId`/`exerciseName`
replaced, rep band taken from the new exercise's own defaults,
`startingWeight: null` (`:826-836`). `prevSets`, `allTimeSets`,
`loggedSets` and `sessionSetsRef` are all cleared (`:847-852`, `:865`),
and the history effect is keyed on `[exercise?.id, currentExerciseIndex]`
(`:1493`), so the swapped-in exercise loads **its own** history. A
substitution therefore cannot inherit an unrelated exercise's baseline
here, and FQ-7 correctly treats the new exercise as a first exposure.
Verified clean.

**In the plan** (`RoutineDetailScreen.handleConfirmSwap:303-310` calling
`updateRoutineExerciseExercise`, `database.js:3571-3589`): only
`exercise_id`, `exercise_name` and `updated_at` are written. The row's
`starting_weight` and `recommended_reps_min/max` survive the swap. The
next session's zero-history seed reads exactly that field
(`ActiveWorkoutScreen.js:1391`, `weight: routineExercise?.startingWeight
?? ''`), so a swap from a heavy compound to an isolation move prefills the
compound's load. Whatever the user then logs becomes the new exercise's
FQ-7 baseline, and every future record on it is anchored to an inherited
number. The rep band carrying over is deliberate ("Targets are untouched
either way", `RoutineDetailScreen.js:298-301`); the starting weight
carrying over is the same class of bug the in-session path already fixed.
**P10-4.**

Note the same function looks the new name up in `exercises` only
(`database.js:3581`); custom exercises do live in `exercises` locally
(`ExercisePickerModal.js:168-186` -> `insertExercise` ->
`insertExerciseWithId`, `database.js:2415-2470`), so that lookup resolves.

### 2.3 Returns to it later

Live: `hadPriorExposure` is true (the exercise has completed working sets
from a previous session), so records resume immediately against the
all-time best, however old. There is no age term anywhere in `detectPR`.
A six-month-old best therefore still gates today's record. That is
defensible as an all-time record, and it is NOT stale-capacity
prescription (D91-25), but it does mean a detrained returner sees no
records for a long time with no explanation.

Ledger: the prior-evidence read is bounded at 180 days
(`blockLedgerRunner.js:66-69`, `:125`). An exercise returned to after a
longer gap has no `priorBest` entry, so inside the block ledger it is (a)
"new" and discounted x0.5 (`blockMetrics.js:260`, `:276`) and (b)
re-baselined rather than PR'd (`:325`, "first-ever: baseline, never a
PR"). The two systems therefore give opposite answers for the same
session — the wall says record, the ledger says baseline. Both are
internally defensible; nothing tells the user. **P10-8.**

Load on return: `layoffMultiplier` is 0.9 whenever this exercise's last
set is more than seven days old (`ActiveWorkoutScreen.js:1339-1342`),
applied in `computeSetTargets` (`algorithms.js:509-513`) with the anchor
pass deliberately skipped (`:533`). Flat 10% regardless of gap length —
already characterised under D97-3, carried, not re-litigated here.

### 2.4 Adds a brand-new exercise (veteran account)

FQ-7 holds. `hadPriorExposure = allTimeSets.some(isWorkingSetRow)`
(`ActiveWorkoutScreen.js:1689`) is false, so `detectPR` is not consulted
at all (`:1694-1695`), the first working set gets the quiet "logged as
your starting point" acknowledgement (`:1696-1712`), and later sets of
that exposure are silent baseline material. The same gate exists on the
edit path (`:1977-1981`). Verified on both paths.

The Block Ledger discounts novelty correctly: `isNew` requires a real
prior history to infer from (`MIN_PRIOR_ROWS_FOR_NEWNESS = 4`,
`blockMetrics.js:248`, `:260`), applies x0.5 to the exercise's slope
weight (`:276`, `:293`) **and** to its PR events in the density
(`:328`) — the founder's "same discounts reach PR density" rule, present
and correct.

Two things do not hold up:

- The Progress tab's "New PRs / Last 30 days" tile counts the new
  exercise's first-ever set as a personal record. `computePRsPerWeek`
  (`useProgressData.js:23-61`) starts `runningMax = 0` and records an
  event on the first set with a positive weight and reps (`:39-49`).
  There is no `runningMax > 0` guard (the live detector has one,
  `algorithms.js:626`), no warm-up filter, and the `exerciseMap`
  parameter is accepted but never read, so distance/duration exercises —
  which reuse the weight column for metres — also produce phantom
  records. Every other PR surface in the app guards all three. Adding
  three new exercises to a plan therefore shows "3 new PRs" on the
  Progress landing. **P11-2.**
- **Pinned-test conflict.** `src/hooks/__tests__/useProgressData.test.js:84-87`
  pins exactly this: a single first-ever set today must land as 1 in the
  most recent week slot. Correcting P11-2 requires re-anchoring that
  test. Reported, not touched.

Provenance of the new exercise itself: `ExercisePickerModal.handleCreate`
deliberately sets `stimulusToFatigueRatio: null` with a comment that a
hard-coded value "would make a brand-new custom move falsely read as a
real, ranked candidate" (`:179-184`). `syncExercises` then pushes
`stimulus_to_fatigue_ratio: e.stimulusToFatigueRatio ?? 3` and
`fatigue_cost: e.fatigueCost ?? 1` (`sync.js:247-248`), and the apply path
reads the same defaults back (`database.js:7800-7801`). One sync
round-trip converts the honest unknown into a fabricated middle value,
and `rankSwaps` then scores the exercise on it. **P10-5.**

### 2.5 Changes rep range

The set row carries the band it was logged under
(`targetRepsMin/Max` from the routine, `ActiveWorkoutScreen.js:1593-1594`),
so the ledger can see a genuine mid-block shift: `repShifted` requires the
early half's target pairs and the late half's to be disjoint
(`blockMetrics.js:264-274`), with coexisting heavy-day/volume-day ranges
correctly NOT counted, and null targets read as unknown rather than as a
shift. That discount (x0.5) reaches both the slope weight and PR density.
Verified correct.

PR **comparability** across a rep-range change is the problem, and it is
not a ledger problem — it is the estimator. Measured directly from the
live `calculate1RM`:

| Set | Estimated max |
|-----|---------------|
| 100 kg x 3 | 135.4 |
| 120 kg x 5 | 138.0 |
| 100 kg x 10 | 133.3 |
| 100 kg x 12 | 142.0 |
| 100 kg x 20 | 189.3 |
| 100 kg x 25 | 189.3 (clamped at 20 reps) |

The A2-040 clamp stops the 25-30 rep runaway, but 20 reps still returns
1.89x the load. So the same absolute load estimates 42% higher at 12 reps
than at 10, and 89% higher at 20. A user moving from a 12-20 band down to
a 3-5 band will see their estimated-max records stop dead for months while
genuinely getting stronger; a user moving the other way fires a burst of
records for lifting less. This is the mechanism behind **P11-1** below and
is the single most consequential long-term PR finding.

### 2.6 Changes setup

There is no "setup" concept on an exercise (no seat/grip/stance/incline
field; `formTips.js` describes setup in prose only). A setup change that
keeps the same exercise id is invisible to every layer: same PR history,
same baseline, same ledger series. This is an architectural limit, not a
defect, and it is the correct conservative default (an invented "setup
changed" flag would be a new personalisation input with no evidence). The
nearest live analogue, per-side logging, is storage-invariant by design —
`lowerSideReps` means the engine only ever sees the lower side, so
toggling per-side mode does not shift rep semantics
(`src/lib/unilateral.js:26-28`, `:50-62`). Recorded as a known limit, no
finding.

### 2.7 Uses a bodyweight variation

Where the architecture says bodyweight should be accounted for, it is:

- `computeSetTargets` never issues a micro-load instruction on an
  unloaded set. `const hadHeadroom = effortSupportsLoad && prevWeight > 0`
  (`algorithms.js:462-466`) is FR-C4-4 resolved live; the anchor pass is
  reachable only when a loaded best set exists (`:540-545`); and the
  topped-band copy for the unloaded case says "Add reps, slow the reps
  down, or move to a harder variation" (`:592-594`). The dead
  `getProgressionSuggestion` keeps its CALC-5 guard (`:350-357`). Both
  passes verified.
- `calculateTonnage` excludes distance/duration and counts
  `weighted_bodyweight` as the added load only
  (`algorithms.js:122-140`) — bodyweight is deliberately not added.
- `blockMetrics` counts an unloaded bodyweight session as an **exposure**
  but not as strength evidence: `attributable` needs only reps
  (`:184-193`), `loadBearing` needs a positive weight (`:194-198`), and
  confidence credits only exercises that produced a usable series
  (`:301-306`). This is the module's own documented rule (header,
  `:38-40`).

The long-term consequence is where it bites. Because `detectPR` returns
early on a zero weight (`algorithms.js:619`), an unloaded exercise can
never set a record — verified directly: 0 kg x 5 improving to 0 kg x 30
returns `[]`. A muscle trained entirely with unloaded work therefore has
confidence 0, fails the `CONFIDENCE_FLOOR` gate and classifies
INSUFFICIENT_DATA with "The strength picture for X was too unsettled this
block to judge" (`interBlock.js:302-305`). Nothing was unsettled; nothing
was measurable. That muscle's prescription holds at `previousStart` /
`plannedPeak` for ever — memory does not trap it, but personalisation
never compounds for it either, block after block, with copy that
misdescribes why. **P10-7.**

The same mechanic makes an exercise substitution INTO a bodyweight
variation mechanically depress `prDensity` (the exposures still count in
the denominator, `blockMetrics.js:225`, `:334`) and `confidence`, with no
change in the user's actual performance.

### 2.8 Changes bodyweight substantially

Records are load-only and never consult bodyweight, which is coherent:
`weighted_bodyweight` rows store the added load, so a 15 kg bodyweight
loss with the same belt weight is honestly "no record", and adding belt
weight is honestly a record.

The one surface that mixes the two is strength standing.
`LiftProgressScreen` pairs each row's `bestE1rm` — an **all-time** best —
with `getLatestBodyWeight` (`:149-182`) and hands both to
`getStrengthLevel`, which is a pure `oneRm / bodyweight` ratio
(`strengthStandards.js:56-58`). After a 15 kg cut, every tracked lift's
level can rise without the user lifting anything new; after a 15 kg gain,
levels fall the same way. The section subtitle is honest about which
bodyweight is used ("Based on N kg body weight", `:302`) but not about the
lift being an all-time figure from a different bodyweight. **P11-6.**

---

## 3. Phase 11 — the mature PR system, per scenario

### 3.1 Repeated records

Every set that beats the running bar fires its own celebration
(`ActiveWorkoutScreen.js:1719-1727`); the session list is collapsed to one
PR per exercise by `bestPRPerExercise`, ranked 1RM > heaviest > most reps,
then by value (`algorithms.js:673-720`). Display-only, so no real record
is lost. Verified correct.

### 3.2 Ties

Verified directly against the live function: an exact repeat of the
previous best returns `[]`. All three comparisons are strict —
`new1RM > best1RM * 1.001` (`:626`), `weight > heaviestEver` (`:640`),
`reps > maxRepsAtWeight && maxRepsAtWeight > 0` (`:653`). A tie is never a
record on any surface that reuses `detectPR`. Clean.

### 3.3 Edited logs

`handleSaveEditedSet` mirrors the log path exactly: same working-sets-only
history, the edited set excluded from its own comparison, the same FQ-7
exposure gate (`:1971-1993`). An edit up can win a record, an edit down
clears its own now-stale badge (`:1985-1993`).

Two residues, both low: the edit path has no first-lift branch, so
correcting the very first set of a first exposure acknowledges nothing;
and only the edited set's own badge is re-evaluated, so a later set's
badge earned by beating the pre-edit value survives the rest of the
session (**P11-8**). Derived analytics recompute from the database, so
nothing is persisted wrong.

### 3.4 Deleted logs

`handleDeleteEditedSet` removes the row locally and in the cloud with a
queued retry, drops it from `sessionSetsRef` and clears its badge
(`:2016-2060`). Because there is **no local `personal_records` table** —
every PR everywhere is derived from `workout_sets`
(`database.js:6486-6488`, `:6589-6591`, `:6712-6713`) — a deletion or edit
propagates correctly to every read surface with no stale record store to
repair. This is the single most valuable structural property of the PR
system for Phase 31 purposes and it holds.

The one thing a historical edit does NOT retro-correct is a **stored**
Block Ledger: `computeAndStoreBlockLedger` is idempotent by version
(`blockLedgerRunner.js:109-114`), so a set edited after block close does
not move that block's ledger. That is Phase 31's lane; flagged here only
so it is not assumed.

### 3.5 Exercise rename

There is no in-app rename path for an exercise: no `UPDATE exercises SET
name` and no rename UI anywhere in `src/`. Records key on `exercise_id`
throughout, and the aggregate surfaces that group by name resolve the
name live through a join (`database.js:6440`, `:6640`), so a name change
arriving by sync would not split a history. The scenario is not reachable
today. Clean.

The adjacent reachable case is a **name collision**.
`insertOrUpdateExerciseFromCloud` merges any local exercise whose name
matches case-insensitively but whose id differs: it re-points
`routine_exercises`, `workout_sets`, `exercise_user_notes` and
`exercise_goals` to the cloud id and deletes the local row
(`database.js:7783-7806`). For canonical library exercises that is
correct and intended (deterministic name-hashed ids). For a **custom**
exercise the user names identically to a library exercise — nothing
prevents this; `handleCreate` has no duplicate-name guard
(`ExercisePickerModal.js:161-196`) — it merges two genuinely different
exercises' entire set histories into one, taking the records with them.
**P11-5.**

### 3.6 Custom exercise

Records work normally for a custom exercise: it is a row in `exercises`
with `is_custom = 1` locally, so `getAllCompletedSetsForExercise`,
`getExerciseById` and the name joins all resolve, and the cloud mirror
restores it into `exercises` on a new device (`database.js:7783-7806`).
No custom-exercise exclusion from any PR surface was found. Clean, apart
from the fabricated SFR/fatigue defaults (**P10-5**) and the name-collision
merge (**P11-5**).

### 3.7 Unit changes

Gym weight units are **kg-only and forced**: `setUnits` coerces any input
to `'kg'` and any legacy cloud/profile value is forced to kg on load
(`useAppStore.js:1768-1774`). Set weights are stored as typed with no
conversion, so a unit switch could in principle reinterpret every historic
number — but the switch does not exist. Bodyweight units (st/kg/lbs) are
display-only over canonical kg (`units.js:1-8`, `:62-80`) and records never
consult bodyweight. No PR corruption path from units. Clean by
construction.

### 3.8 Large bodyweight change

See §2.8. Records themselves are unaffected (correct); strength standing
mixes time points (**P11-6**).

### 3.9 Deload / recovery week

The Block Ledger discounts recovery-week noise exactly as the order
requires:

- the deload week is excluded from slope, PR replay and exposures
  (`blockMetrics.js:170-173`, `:207`);
- PR events inside a rebound window weigh 0.25
  (`REBOUND_PR_WEIGHT`, `:60`, `:328`);
- rebound windows are the block's first week when it follows the previous
  block within 14 days, plus the week after any **applied** early deload
  (`blockLedgerGather.js:181-203`), with the 14-day boundary reasoned as
  "a longer gap is detraining, not rebound" (`:37`) — the same constant
  D97-4 reused.

The **live** PR wall has no deload awareness at all: a recovery-week set
that beats a record is celebrated and counted like any other. Given deload
prescriptions are derived from week-1 sets at reduced load
(`ActiveWorkoutScreen.js:1440-1462`) this is unlikely to fire in practice,
and the split is the documented division of labour ("PR density
corroborates and explains; classification runs on the slope",
`blockMetrics.js:50-54`). Recorded as intended, not a finding.

### 3.10 Return after hiatus

Covered in §2.3. Records resume against the all-time best with no age
term; the ledger re-baselines past 180 days. No shame copy, no fabricated
recovery, no automatic progression on any PR surface. The wall/ledger
divergence is **P10-8**.

### 3.11 The headline contradiction: cluster and high-rep rows (P11-1)

Phase 11 says not to alter PR maths unless a genuine product
contradiction exists. This is one, and it comes from the app's own
logging features rather than from the formula in isolation.

Myo-reps and rest-pause are first-class set types offered in the logger
(`ActiveWorkoutScreen.js:147-148`, described to the user as "Counts
towards volume and progress"). A cluster commits as ONE `workout_sets`
row whose `actual_reps` is the **sum** of every effort
(`clusterSet.js:11-15`; `finishCluster` at `ActiveWorkoutScreen.js:2147-2155`
passes `summary.totalReps` straight into the normal `handleCompleteSet`).
Nothing downstream distinguishes a cluster row: `isWorkingSetRow` only
excludes warm-ups (`:90`), and the `isWeightReps` gate is on the
**exercise** type, not the set type (`:1694`). So a cluster row is a full
record candidate whose rep count is not a rep count.

Measured against the live functions, with a plausible history of
60 kg x 8, 60 kg x 8, 62.5 kg x 6 (true best estimated max 75.4 kg):

- a myo-rep cluster of 50 kg totalling 27 reps estimates **94.7 kg**;
- `detectPR` fires `1rm_estimate` at 94.7 kg — a 26% "record" for lifting
  10 kg less;
- to ever beat it afterwards the user needs roughly 82.3 kg x 5, or
  87.3 kg x 3, against a real working best of 62.5 kg x 6.

The estimated-max record for that exercise is now unreachable for months
or permanently, and the same inflated value becomes the exercise's
all-time best on the Exercise Detail wall, the Lift Progress row, the
strength standing ratio and the weekly PR count. The app's own definition
of the term — "A personal record: a new best for you on an exercise ...
PRs are the clearest sign your training is working"
(`src/lib/coachGlossary.js:35-36`) — is contradicted in both directions:
the record is not a best, and its persistence hides the training that is
working.

The same mechanism reaches AMRAP sets and ordinary high-rep back-off sets
(§2.5's table); clusters are the sharpest case because the stored rep
count is an artefact of the logging format, not of a set the user
performed.

Downstream, the ledger inherits it: `blockMetrics` takes the session max
through the same `calculate1RM` (`:218`), so a cluster session spikes that
exercise's e1RM series and adds a `rawPrCount` and a weighted PR event
(`:326-331`). Theil-Sen absorbs a single outlier, but myo-reps are a
programmed technique, not an accident — a block that uses them regularly
feeds the slope a mixed-scale series.

**This is characterised, not fixed.** Any correction is PR-maths-adjacent
and needs a recorded ruling: the plausible options (excluding cluster set
types from the estimated-max comparison; capping the rep count the
estimator sees at the exercise's logged band; storing the activation
effort separately) differ materially in blast radius, and two of them
touch `calculate1RM`, which several pinned suites and the X4 cross-surface
consistency ruling depend on.

---

## 4. Cross-surface PR gate matrix

Every surface that claims a record, and what it actually gates on. The
divergences in this table are findings 2, 3, 4, 5 and 9.

| Surface | Source | First-exposure gate | Warm-ups | distance/duration | History bound |
|---|---|---|---|---|---|
| In-session celebration | `ActiveWorkoutScreen.js:1689-1727` | FQ-7 exposure grain | excluded both sides | excluded (`isWeightReps`) | unbounded |
| In-session edit | `ActiveWorkoutScreen.js:1971-1993` | FQ-7 exposure grain | excluded both sides | excluded | unbounded |
| Live "record if you hit this" line | `workoutRecordLine.js:63-69` | **set grain** (`history.length === 0`) | excluded | excluded | unbounded |
| Workout summary "N new PRs" | `WorkoutSummaryScreen.js:1381-1396` | inherits the logger's list | inherited | inherited | session |
| Exercise Detail records card/list | `ExerciseDetailScreen.js:347-366` | none (all-time best readout) | excluded | not filtered | **200 rows** |
| Exercise Detail chart markers | `ExerciseDetailScreen.js:173-217` | **set grain** | excluded | excluded | **200 rows** |
| Lift Progress sparkline markers | `liftProgress.js:164-173` | session grain (index 0 skipped) | n/a (series) | excluded via type map | unbounded |
| Progress tab "New PRs / 30 days" | `useProgressData.js:23-61` | **none** | **not excluded** | **not excluded** | unbounded |
| Weekly PR count (recap/share) | `database.js:6267-6331` | prior-best > 0, week-vs-prior | excluded | excluded | unbounded |
| Block Ledger PR replay | `blockMetrics.js:322-334` | prior best, else baseline | excluded | excluded | 180-day prior |

---

## 5. Verified invariants

Things this lane actively tried to break and could not.

| Invariant | Where it holds | Evidence |
|---|---|---|
| A tie never counts as a record, on any of the three types | `detectPR` | `algorithms.js:626`, `:640`, `:653`; verified empirically (returns `[]`) |
| A first exposure establishes a baseline and awards nothing, on the log path AND the edit path | `ActiveWorkoutScreen` | `:1689`, `:1694-1712`, `:1977-1981` |
| A warm-up is neither a record nor beatable, both sides of the comparison | logger, editor, live line | `:1674-1677`, `:1971-1976`, `workoutRecordLine.js:12-14` |
| A swapped-in exercise cannot inherit an unrelated baseline (in session) | `handleConfirmSwap` + history effect | `ActiveWorkoutScreen.js:826-866`, `:1493` |
| PRs are always derived from `workout_sets`; no local record store to go stale | whole app | `database.js:6486-6488`, `:6589-6591`, `:6712-6713`; no `personal_records` table locally |
| Gym units cannot change, so no historical weight can be reinterpreted | store | `useAppStore.js:1768-1774` |
| Bodyweight sets never receive a micro-load instruction (FR-C4-4) | `computeSetTargets`, both passes | `algorithms.js:462-466`, `:540-545`, `:592-594` |
| The estimated-max formula clamps the rep count it sees at 20 (A2-040) | `calculate1RM` | `algorithms.js:110-113` |
| `discontinuity` has exactly one producer and one consumer | ledger | `blockMetrics.js:312`; `interBlock.js:297-300`; no other writer in `src/` |
| Novelty and rep-shift discounts reach PR density, not just the slope | ledger | `blockMetrics.js:276`, `:293`, `:328` |
| The deload week is excluded from slope, PRs and exposures; rebound PRs weigh 0.25 | ledger | `blockMetrics.js:170-173`, `:60`, `:328`; `blockLedgerGather.js:181-203` |
| Newness needs a real prior history (>= 4 usable rows), so one stray import cannot mark everything new | ledger | `blockMetrics.js:65`, `:248`, `:260` |
| An exercise with no usable strength fit is excluded (weight 0), never shipped as a false 0% | ledger | `blockMetrics.js:278-295`, `:308-310` |
| Exposure counting requires a real primary allocation through the single allocator | ledger | `blockMetrics.js:175-193` |
| Prior-set and block-set reads carry no row caps | ledger feeds | `database.js:4316-4329` |
| No in-app exercise rename exists; records key on `exercise_id` | whole app | no `UPDATE exercises SET name` in `src/` |
| No automatic exercise change anywhere in the block lifecycle | plan/ledger | `poolGenerator.js` builds plan-time pools only; ledger seeds volume, never exercises |

---

## 6. Suites run (read-only)

```
npx jest src/lib/__tests__/detectPR.firstLift.test.js \
         src/lib/__tests__/workoutRecordLine.test.js \
         src/lib/__tests__/blockMetrics.stage3.test.js \
         src/lib/__tests__/liftProgress.derivePRIndices.test.js \
         src/screens/__tests__/ExerciseDetailScreen.logic.test.js \
         src/lib/__tests__/weeklyPRCount.formulaConsistency.test.js

Test Suites: 6 passed, 6 total
Tests:       97 passed, 97 total
```

Numeric claims in §2.5 and §3.11 were produced by running the live,
unmodified `calculate1RM` and `detectPR` exports out of
`src/lib/algorithms.js` in a scratchpad harness. No source file was
altered.

Pin coverage worth knowing before any fix lands:

- `detectPR.firstLift.test.js:46` pins the FQ-7 gate's exact source shape
  in `ActiveWorkoutScreen`. It does not pin `workoutRecordLine`'s gate, so
  **P10-2** can be corrected without a re-anchor.
- `workoutRecordLine.test.js:103` pins only the empty-history case, so an
  added exposure gate is compatible.
- `ExerciseDetailScreen.logic.test.js:141-147` pins a **single-set**
  first session only, so the multi-set case in **P10-3** is untested and
  a fix is compatible.
- `useProgressData.test.js:84-87` **pins the defect** in **P11-2** (a
  single first-ever set today must count as one PR). This one is a real
  conflict and needs a ruling plus a re-anchor.

---

## 7. What this lane recommends be ruled (no fix proposed here)

Listed so the founder/lead sees the forks; none of these were decided or
built.

1. **P11-1 (cluster / high-rep estimated max).** A genuine product
   contradiction under Phase 11's own wording. Needs a ruling on scope
   before any code moves, because two of the three plausible fixes touch
   `calculate1RM`, which X4 made the single cross-surface formula.
2. **P11-2 (Progress "New PRs" tile).** Correctness fix plus a pinned-test
   re-anchor. The three missing guards all exist verbatim on sibling
   surfaces, so the shape of the fix is not in question — only the test
   re-anchor is.
3. **P10-1 (200-row PR wall).** Either raise/remove the cap or state the
   window in the copy. Silently showing a rolling-window best under the
   heading "Personal records" is the Campaign 6 provenance law failing on
   a Free-tier surface.
4. **P10-2 / P10-3 (FQ-7 grain).** Two surfaces still on the pre-FQ-7
   set-grain gate. Mechanical alignment, no maths change.
5. **P10-4 (plan-swap starting weight).** One-field fix with an exact
   precedent in the in-session swap; the rep-band carry-over is a
   separate deliberate choice and should be ruled on explicitly rather
   than changed alongside it.
6. **P10-7 (bodyweight muscles).** Not a maths change — a copy-truth
   question ("no loaded work to measure" versus "too unsettled to judge")
   plus a decision on whether a bodyweight-only muscle should ever be
   able to earn a volume increase.
