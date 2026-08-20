# AUDIT C — exercise intent, constraints, avoidance and swaps

Capability Campaign 25, Wave 1. Read-only evidence report. No product or
architecture decisions are made here; no recommendations are given.

Author: Audit Agent C. Date: 2026-08-20. Tree state: `main`, HEAD `a15868e`.

---

## 1 SCOPE / METHOD

**Scope.** The `exercise_intent` domain end to end (all kinds, all
lifecycles, all readers and writers), `exercise_swaps` and
`exercise_slot_defaults`, the Campaign 31 (C31) movement-pattern avoidance
system landed 2026-08-18 in `f672c590`, the movement-family vocabulary it
targets, the UX surfaces that set/show/list/clear avoidance, and how all of
this interacts today with plan generation, in-workout swap ranking, the
exercise picker and `weeklyCoach`. `migrate_142` is reproduced in full.

**Method.** The two triage documents were read first as navigation
(`docs/complaint-research-triage-2026-08-17/INJURY-CONSTRAINTS-SPEC.md`,
`.../TRIAGE.md`), then every claim was re-derived from live source. Every
statement below carries `file:line`. Where a document and the code disagree,
the code is recorded as authority and the conflict is listed in §10/§11.
Grep was used to locate; every mechanism was then read to its consuming
function before any conclusion was drawn. Findings are labelled **OBSERVED**
(read directly in source at the cited line) or **REPORTED** (asserted by a
document or comment, not independently confirmable from code). Anything not
confirmed is in §14.

**Not done.** The Jest suite was not executed (read-only remit; no code
changed). No runtime/device observation. No production database inspection.

---

## 2 CURRENT BEHAVIOUR

**OBSERVED.** Volyume stores exactly one durable "what the user said about an
exercise" table, `exercise_intent`, keyed `UNIQUE(user_id, exercise_id)`
(`src/lib/database.js:2192-2203`). Three kinds exist
(`src/lib/database.js:9728-9738`):

| kind | constant | meaning as implemented |
|---|---|---|
| `excluded` | `EXERCISE_INTENT.EXCLUDED` | indefinite "don't suggest" |
| `avoided_block` | `EXERCISE_INTENT.AVOIDED_BLOCK` | live only while `scope_mesocycle_id` equals the active block |
| `pattern_avoid` | `EXERCISE_INTENT.PATTERN_AVOID` | day-bound, expires at `expires_at_ms` |

C31 did **not** add a table or a target column. It reuses `exercise_id` as a
generic target string: a movement family is stored as `family:<key>`
(`src/lib/exercise/intent.js:223-228`). The same three kinds therefore
address either one exercise id or one whole family, and the duration model
is a property of the KIND, not of the target
(`src/lib/exercise/movementConstraints.js:28-45`).

Setting avoidance is an upsert on the target: a new duration over an
existing one replaces the row in place
(`src/lib/database.js:9756-9783`). "Allow again" tombstones
(`deleted_at`), never hard-deletes, so the restore travels to other devices
(`src/lib/database.js:9791-9799`).

Day-bound expiry is evaluated at READ time and then lazily tombstoned
(`src/lib/database.js:9811-9836`). The comparison is
`r.expiresAtMs != null && r.expiresAtMs <= nowMs` (`:9824`) — inclusive, so
a row expires exactly at its millisecond. The cleanup is fire-and-forget and
its failure cannot affect the read it rode in on (`:9829-9834`).

Reads fail OPEN: `loadExerciseIntentState` catches and returns the empty
pre-Campaign-9 shape with `unavailable: true`
(`src/lib/exercise/intent.js:113-121`). Nothing is ever fabricated; the
caller is told the read failed so a surface can show a notice (D109-2).

Enforcement is at SUGGESTION time only. Nothing in this layer mutates a
plan: an exercise already in the active plan is never rewritten; the logger
shows a quiet notice with a Swap shortcut instead
(`src/screens/ActiveWorkoutScreen.js:3412-3442`).

Free/Pro: **OBSERVED** ungated. `AvoidedMovementsScreen` is registered with
no `withProGuard` (`src/navigation/RootNavigator.js:481`); the set/clear
entry point sits in the routine editor, and the sync push is explicitly
described as free-tier safe (`src/lib/sync.js:774-779`).

---

## 3 FILES & FUNCTIONS

### 3.1 `src/lib/exercise/intent.js` (680 lines) — the pinned READ layer

Module header states the laws it enforces (`:1-31`), including "This module
never writes" (`:23-26`).

| export | line | role |
|---|---|---|
| `loadExerciseIntentState(userId, {activeMesocycleId, progressionForIds})` | `:70-122` | the single loader; assembles `{intents, swaps, defaults, usage, progression, activeMesocycleId, unavailable}` |
| `findPlanIntentConflicts(planId, state)` | `:134-163` | id-level conflicts after copying a published plan |
| `intentFor(state, target)` | `:168-170` | raw row or null |
| `isExcluded(state, target)` | `:173-175` | |
| `isAvoidedThisBlock(state, target)` | `:182-187` | requires `scopeMesocycleId === state.activeMesocycleId` |
| `isEligible(state, exerciseId)` | `:197-199` | id-level only: `!isExcluded && !isAvoidedThisBlock` |
| `filterEligible(state, exercises, getId)` | `:202-205` | id-level filter |
| `familyTargetKey(family)` | `:226-228` | the ONLY constructor of `family:<key>` |
| `familyFromTargetKey(target)` (private) | `:230-234` | |
| `movementFamilyOf(exercise)` | `:242-247` | `resolveMovementFamily(name, primaryMuscle ?? muscle, subregion)` |
| `isPatternAvoided(state, target)` | `:254-261` | the hardened kind check (quoted in §7) |
| `isFamilyBlocked(state, family)` | `:271-275` | `isExcluded ‖ isAvoidedThisBlock ‖ isPatternAvoided` against the family target |
| `isEligibleExercise(state, exercise)` | `:286-290` | THE senior question: id-level AND family-level |
| `filterEligibleExercises(state, exercises)` | `:293-296` | |
| `PATTERN_AVOID_DAYS` | `:299` | `Object.freeze([7, 14, 30])` |
| `listActiveMovementConstraints(state)` | `:316-339` | family rows only, sorted by label |
| `approvedDefaultFor(state, fromExerciseId, routineId)` | `:347-357` | routine-specific beats plan-wide; an excluded default is not offered |
| `swapEvidenceFor` | `:368-382` | positive evidence, contextual to the source exercise |
| `swappedAwayCount` | `:399-403` | counts `scope === 'programme'` only |
| `sessionSubstitutionCount` | `:413-417` | exposed, never used as negative preference |
| `previouslyUsedBefore` | `:424-431` | |
| `exerciseEvidence` | `:459-491` | includes `tolerance: 'not_tracked'` (`:477`) |
| `EVIDENCE_MATURITY` / `ESTABLISHED_SESSIONS=4` / `evidenceMaturity` / `MATURITY_WEIGHT` / `maturityWeight` | `:520-552` | |
| `repeatedDefaultCandidate` | `:559-565` | requires `count >= REPEATED_SWAP_MIN` (3, `:53`) AND `explicit` |
| `RANK_TIER` | `:574-581` | 5 approved-default → 0 none |
| `rankPersonalised(state, candidates, ctx)` | `:600-680` | filters `isEligibleExercise` at `:615`, then weights by maturity |

`REPEATED_SWAP_MIN = 3` (`:53`). Comment at `:301-304` records that the
write side deliberately lives elsewhere.

### 3.2 `src/lib/exercise/movementConstraints.js` (52 lines) — the WRITE layer

Created by C31's lead review to keep `intent.js` write-free (`:1-12`).

- `setMovementPatternAvoid(userId, family, duration, {activeMesocycleId, reason})` — `:28-45`.
  `'this_block'` → `AVOIDED_BLOCK` with `scopeMesocycleId` (`:31-35`);
  `'indefinite'` → `EXCLUDED` (`:36-38`); a number in `PATTERN_AVOID_DAYS`
  → `PATTERN_AVOID` with `expiresAtMs: Date.now() + days * 24*60*60*1000`
  (`:39-44`). Anything else returns `null` (`:40`).
- `clearMovementPatternAvoid(userId, family)` — `:48-52`, delegates to
  `clearExerciseIntent` on the family target.

### 3.3 `src/lib/exercise/generation.js` (169 lines) — generation-time gate

- `GENERATION_BLOCK` — `:36-43`, mirrors the three kinds.
- `generationBlockReason(state, exercise)` — `:55-70`. Id checks first
  (`:58-59`), then, only when passed a full row, the family checks
  (`:60-68`). A bare string id skips the family check entirely (`:60`).
- `filterLibraryForGeneration(library, state)` — `:104-143`. Returns the
  SAME array by reference when there is no intent (`:105-109`, `:121`);
  fails OPEN on a malformed state (`:137-142`).
- `generationBlockFor(filtered, exercise, fallbackName)` — `:158-169`. Id
  arm then lower-cased name arm, which is what catches `planEngine`'s
  hand-written POOL re-emitting a filtered-out exercise by name.

### 3.4 `src/lib/exercise/movementFamily.js` (419 lines) — the family vocabulary

`FAMILY` enum `:80-104`; curated back/quad name lists `:113-187`; registry
`:193-206`; `VALID_FAMILIES` `:211-217`; `movementFamily(name, muscle,
subregion)` `:246-266`; `FAMILY_LABELS` (added by C31) `:283-319`;
`familyLabel` `:328-331`; `COVERAGE_ROLES` `:349-354`;
`familySatisfiesRole` `:362-367`; `CONTESTED` `:378-419`.

### 3.5 `src/lib/database.js` — persistence

`EXERCISE_INTENT` `:9728-9738`; `setExerciseIntent` `:9756-9783`;
`clearExerciseIntent` `:9791-9799`; `getExerciseIntents` `:9811-9836`;
`recordExerciseSwap` `:9842-9856`; `getExerciseSwaps` `:9859-9872`;
`setExerciseSlotDefault` `:9878-9904`; `clearExerciseSlotDefault`
`:9907-9917`; `getExerciseSlotDefaults` `:9920-9930`;
`getExerciseUsageStats` `:9941+`. Sync-side readers `:10449-10476`; cloud
appliers `:10495-10533` (intent), `:10544-10563` (swaps), `:10566+`
(defaults); `remapExerciseIdInIntentTables` `:10625-10672`.

### 3.6 Screens and components

| surface | file:line | role |
|---|---|---|
| `RoutineDetailScreen` | `src/screens/RoutineDetailScreen.js:377-491` | the ONLY place avoidance is SET; also `handleConfirmSwap` `:528-586` |
| `ActiveWorkoutScreen` | `src/screens/ActiveWorkoutScreen.js:657-688`, `:3412-3442`, `:1012-1046`, `:1048-1117` | notice + swap |
| `AvoidedMovementsScreen` | `src/screens/AvoidedMovementsScreen.js` (171 lines) | list + per-row remove |
| `PlansScreen` | `src/screens/PlansScreen.js:228-233`, `:276-283`, `:1515-1536` | Plan tools count row |
| `ExercisePickerModal` | `src/components/ExercisePickerModal.js:189-203`, `:216-230`, `:474-496`, `:498-525`, `:592-635` | shared browse/swap picker |
| `PlanLibraryScreen` | `src/screens/PlanLibraryScreen.js:506` | plan-copy conflict report |
| `BuildWorkoutScreen` | `src/screens/BuildWorkoutScreen.js:198-243` | travel mode |
| `RootNavigator` | `src/navigation/RootNavigator.js:119-121`, `:477-481` | route registration |

---

## 4 TABLES & FIELDS

### 4.1 Local (SQLite, `src/lib/database.js`)

**`exercise_intent`** — created at `SCHEMA_MIGRATIONS` v73
(`:2192-2204`):

```
id TEXT PRIMARY KEY, user_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
kind TEXT NOT NULL, scope_mesocycle_id TEXT, reason TEXT,
created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER,
UNIQUE(user_id, exercise_id)
```
plus `idx_exercise_intent_user (user_id, exercise_id)` (`:2204`).

C31 appended one column (`:2598-2600`):
`ALTER TABLE exercise_intent ADD COLUMN expires_at_ms INTEGER`.
Its header is `:2565-2597`. **OBSERVED**: this entry carries no `vNN`
label, unlike every neighbour (contrast `:2557` "v81"). Versions are
positional — the runner iterates `for (let v = current; v <
SCHEMA_MIGRATIONS.length; v++)` (`:2799`) — so the absent label is
cosmetic, but it breaks the file's own convention. The entry is the
penultimate one in the array; the last is C32's `load_semantics`
(`:2614-2617`), and the array closes at `:2618`.

**`exercise_swaps`** — v73 (`:2205-2218`):
```
id, user_id, from_exercise_id, to_exercise_id, routine_id, mesocycle_id,
explicit INTEGER NOT NULL DEFAULT 1, scope TEXT, created_at, updated_at, deleted_at
```
`scope` added by the v75 entry (`:2260-2262`), values `'session'` /
`'programme'` (`src/lib/exercise/swapScope.js:26-31`).

**`exercise_slot_defaults`** — v73 (`:2219-2230`):
```
id, user_id, from_exercise_id, routine_id, exercise_id,
created_at, updated_at, deleted_at, UNIQUE(user_id, from_exercise_id, routine_id)
```

All three appear in the per-user local wipe list (`:6109-6115`).

**Adjacent, relevant:** `exercises.subregion` (`:210`, added `:471`);
`exercises.movement_pattern` (`:204`); `exercises.load_semantics`
(C32, `:2615`); `workouts.joint_discomfort` (`:549`);
`workout_sets.joint_discomfort` (`:251`).

### 4.2 Cloud (Supabase EU-Dublin)

**`public.exercise_intent`** — `supabase/migrate_136_exercise_intent.sql:126-137`:
```sql
create table if not exists public.exercise_intent (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  kind text not null,
  scope_mesocycle_id text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);
```
**OBSERVED**: there is NO `CHECK` on `kind` — `'pattern_avoid'` needed no
cloud change to be accepted. The local `UNIQUE(user_id, exercise_id)` is
deliberately NOT mirrored (`:114-124`). Indexes `:142-145`. RLS `:196-221`.
`delete_user_data()` re-created with the three DELETEs (`:110-112`, `:321+`).
Applied remotely 2026-08-12, verified (`:50`).

`public.exercise_swaps` `:153-165` — note it has **no `scope` column** in
136; `scope` is `migrate_137`. `public.exercise_slot_defaults` `:178-188`.

**`migrate_142_exercise_intent_expiry.sql` — FULL CONTENTS.** The whole
file is 87 lines: 76 lines of header comment, then:

```sql
alter table public.exercise_intent
  add column if not exists expires_at timestamptz;

-- ─── Acceptance check ────────────────────────────────────────────────────

select
  column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'exercise_intent'
  and column_name = 'expires_at';
```
(`supabase/migrate_142_exercise_intent_expiry.sql:77-87`.)

Header facts, verbatim where load-bearing:
- Purpose `:3-21`: D107-2; one nullable column so PATTERN_AVOID's
  7/14/30-day duration survives device swap; `family:<key>` target
  convention named; "no new target column, no parallel table".
- Type divergence `:23-29`: "Local column is `expires_at_ms` (INTEGER,
  epoch milliseconds…). This cloud column follows the project's existing
  convention instead (timestamptz…)".
- Push/pull wiring named `:31-37`.
- Applied locally: YES `:39-44`.
- **Applied remotely: "YES -- 2026-08-18, Claude-run on the founder's exact
  phrase 'run against production' (project sujrylzzxcqxxfygptns,
  EU-Dublin). Verified after the apply: exercise_intent.expires_at present,
  timestamptz, nullable."** `:46-52`.
- Additive YES `:54-56`; safe to re-run YES (`add column if not exists`)
  `:58-59`.
- Rollback `:61-69`, with the caveat that a PATTERN_AVOID row would then
  read as never-expiring.
- GDPR note `:71-75`: "No new data category… not health data".

Corroborated by `supabase/README.md:342`: "**YES - applied 2026-08-18,
verified**". Cross-migration ledger also records 143 applied (`:343`) and
144 exists (`supabase/migrate_144_apple_review_password_reset.sql`).

### 4.3 Field-by-field reality check (which columns actually carry data)

**OBSERVED, by exhaustive grep of non-test callers:**

- `exercise_intent.reason` — **never written in production.** The only
  `setExerciseIntent` callers are `movementConstraints.js:32,37,41` (which
  pass through a `reason` option) and
  `RoutineDetailScreen.js:502-504` (passes only `scopeMesocycleId`). The
  only caller of `setMovementPatternAvoid` is
  `RoutineDetailScreen.js:474`, which passes only `activeMesocycleId`. No
  UI collects a reason. `listActiveMovementConstraints` surfaces
  `reason` (`intent.js:335`) but `AvoidedMovementsScreen` never renders it.
- `exercise_intent.expires_at_ms` — written only for `PATTERN_AVOID`
  (`movementConstraints.js:41-44`); every other write passes the `null`
  default (`database.js:9756`).
- `exercise_swaps.mesocycle_id` — **never written.** Neither
  `ActiveWorkoutScreen.js:1090-1093` nor `RoutineDetailScreen.js:543-545`
  passes `mesocycleId`; the parameter defaults to `null`
  (`database.js:9842`).
- `exercise_swaps.explicit` — **always `1`.** Both call sites pass
  `explicit: true`.
- `workout_sets.joint_discomfort` — column exists (`:251`) and is pushed
  (`sync.js:489`), but `createWorkoutSet` (`:3649-3674`) does not include
  it and `updateWorkoutSet` (`:3707`) writes only `post_set_pump` and
  `post_set_muscle_connection`. **No writer exists.** Joint discomfort is
  captured once per SESSION, post-workout, 0-3, labelled "Joint
  discomfort" with hint "Joints and tendons, not normal muscle soreness"
  (`src/screens/WorkoutSummaryScreen.js:1742`, scale labels `:68`), stored
  on `workouts.joint_discomfort`.

---

## 5 READERS

Every consumer of intent state, and exactly which question it asks.

| reader | file:line | question asked | family-aware? |
|---|---|---|---|
| `planAutoGen.assessScheduleFit` | `src/lib/planAutoGen.js:237-242` | `filterLibraryForGeneration` | YES (rows passed) |
| `planAutoGen.generateAndSavePlan` | `:681-684`, `:842` | filter + `generationBlockFor` + `intentState?.unavailable` | YES |
| `planAutoGen.generatePlanDryRun` | `:883-886`, `:974` | same as commit | YES |
| `planAutoGen.resolveSeed` | `:320-337` | name/id gate against the fallback POOL | YES (via filter) |
| `planAutoGen.buildSlotEvidence` | `:426-463`, esp. `:438-440` | `!isEligibleExercise(state, row ?? {id})` | YES (upgraded by C31) |
| `BuildWorkoutScreen.applyTravelMode` | `src/screens/BuildWorkoutScreen.js:208-213`, `:220-225` | `filterLibraryForGeneration(all, state).library` | YES |
| `ExercisePickerModal` browse/swap list | `src/components/ExercisePickerModal.js:216-228` | `isEligible(...) && !isFamilyBlocked(...)` as two AND terms | YES |
| `ExercisePickerModal` "Recent" rail | `:207-209`, `:474-496` | **none** | **NO — no filter at all** |
| `ExercisePickerModal` per-row "set aside" badge/Allow-again | `:596`, `:605-632` | `!isEligible(state, item.id)` | **NO — id-level only** |
| `RoutineDetailScreen.handleOpenSwap` | `src/screens/RoutineDetailScreen.js:335-369` | `rankPersonalised` → `isEligibleExercise` | YES |
| `RoutineDetailScreen.openAvoidSheet` | `:377-422` | `intentFor(state, exercise.id)` | NO (by design: id sheet) |
| `RoutineDetailScreen.openPatternAvoidSheet` | `:429-468` | `isFamilyBlocked` | YES |
| `ActiveWorkoutScreen` notice | `src/screens/ActiveWorkoutScreen.js:675-688` | `isFamilyBlocked` + `intentFor(target)` | YES |
| `ActiveWorkoutScreen.handleOpenSwap` | `:1012-1046` | `rankPersonalised` → `isEligibleExercise` | YES |
| `AvoidedMovementsScreen` | `src/screens/AvoidedMovementsScreen.js:65-79` | `listActiveMovementConstraints` | YES (family only) |
| `PlansScreen` Plan-tools count | `src/screens/PlansScreen.js:276-283` | `listActiveMovementConstraints(state).length` | YES (family only) |
| `PlanLibraryScreen` plan-copy conflicts | `src/screens/PlanLibraryScreen.js:506` → `intent.findPlanIntentConflicts` `:134-163`, `:147` | `isEligible(state, id)` | **NO — id-level only** |
| `blockAdvisor.buildProgrammeReview` | `src/lib/blockAdvisor.js:501-532`, esp. `:509` | `isExcluded ‖ isAvoidedThisBlock` | **NO — id-level only** |

**Non-readers, verified:**
- `src/lib/poolGenerator.js` — **no intent awareness whatsoever.** Grep for
  `intent|isEligible|avoid` returns only an unrelated comment at `:125`.
  The spec named `poolGenerator filterPool` as a hard-filter site; in the
  implementation the filtering happens upstream, on the library handed to
  `generatePlan` (`planAutoGen.js:253`, `:684`, `:886`).
- `src/lib/swapEngine.js` — no intent awareness. Its only exports are
  `buildSwapReason` (`:107`) and `rankSwaps` (`:200`). Family filtering
  happens downstream in `rankPersonalised` (`intent.js:615`), which is
  documented at `intent.js:611-614`.
- `src/lib/weeklyCoach.js` — **no exercise-intent awareness at all.** Grep
  for `intent|isEligible|exercise_intent|avoid` returns only unrelated
  matches (`:887`, `:1164`, `:1330`, `:1382`, `:1540`, all
  `intent: {goalPhase, trainingGoal, manualVolumeMuscles}` or the English
  word "avoiding"). This matches the spec's stated out-of-scope line
  ("constraints filter WHAT is suggested, they do not alter volume/calorie
  maths").

---

## 6 WRITERS

**Complete inventory (non-test).**

| write | function | called from | fields set |
|---|---|---|---|
| create/replace intent | `database.setExerciseIntent` `:9756-9783` | `RoutineDetailScreen.js:502` (id-level), `movementConstraints.js:32,37,41` (family) | kind, scope_mesocycle_id, reason, expires_at_ms, updated_at, `deleted_at = NULL` |
| tombstone intent | `database.clearExerciseIntent` `:9791-9799` | `RoutineDetailScreen.js:389`, `ExercisePickerModal.js:622`, `movementConstraints.clearMovementPatternAvoid:51` (via `AvoidedMovementsScreen.js:92` and `RoutineDetailScreen.js:446`) | deleted_at, updated_at |
| lazy expiry tombstone | inside `database.getExerciseIntents` `:9829-9834` | every intent read | deleted_at = nowMs, updated_at = nowMs, then `_scheduleSync()` |
| append swap | `database.recordExerciseSwap` `:9842-9856` | `ActiveWorkoutScreen.js:1090` (`scope: SESSION`), `RoutineDetailScreen.js:543` (`scope: PROGRAMME`) | from/to, routine_id, explicit=1, scope |
| set slot default | `database.setExerciseSlotDefault` `:9878-9904` | `RoutineDetailScreen.js:565` only | exercise_id per (from, routine) |
| clear slot default | `database.clearExerciseSlotDefault` `:9907-9917` | **no production caller found** |
| cloud apply | `insertOrUpdateExerciseIntentFromCloud` `:10495-10533` | `sync._pullExerciseIntent` `:2445` | full row incl. `_tsToMs(row.expires_at)` |
| id remap | `remapExerciseIdInIntentTables` `:10625-10672` | dedupe-by-name path of `insertOrUpdateExerciseFromCloud` | rewrites 5 id columns |

**Family write path in full** (`movementConstraints.js:28-45`): the UI hands
`duration ∈ {7,14,30,'this_block','indefinite'}`; the module maps it to a
kind and calls the same `setExerciseIntent` upsert. There is no separate
family write path and no second table.

**No auto-writes.** Nothing in the coaching engine, the swap ranker or any
generator writes an intent row. The only automatic write anywhere in the
domain is the expiry tombstone.

---

## 7 CURRENT INVARIANTS (as implemented)

1. **One row per (user, target).** `UNIQUE(user_id, exercise_id)`
   (`database.js:2202`) + upsert-on-target (`:9760-9773`). A target can
   therefore be in exactly one state; setting `7 days` over `indefinite`
   silently replaces it, and vice versa. **There is no history of prior
   states.**
2. **The write layer cannot live in `intent.js`.** Pinned by source guard
   (see §8.1).
3. **Absence of intent is eligibility.** `isPatternAvoided` requires the
   row to exist before comparing kinds — the C31 lead-review hardening,
   quoted verbatim (`src/lib/exercise/intent.js:254-261`):

   ```js
   export function isPatternAvoided(state, target) {
     // The row must EXIST before its kind is compared: a bare `?.kind ===`
     // would answer true for a missing row anywhere the PATTERN_AVOID constant
     // itself resolved undefined (undefined === undefined), silently blocking
     // every family. Absence of intent is always eligibility.
     const row = intentFor(state, target);
     return !!row && row.kind === EXERCISE_INTENT.PATTERN_AVOID;
   }
   ```
   Note `isExcluded` (`:174`) and `isAvoidedThisBlock` (`:184`) still use
   the `?.kind ===` shape; they are safe only because their constants are
   non-`undefined` in every current mock.
4. **Reads fail OPEN, and say so.** `unavailable: true` on the state
   (`:113-121`); `constraintsUnavailable` on generation results
   (`planAutoGen.js:630-643`).
5. **Expiry is read-time and inclusive.** `expiresAtMs <= nowMs`
   (`database.js:9824`); `nowMs` is injectable for tests (`:9811`).
6. **Restoration is a tombstone, never a delete** (`:9791-9799`), so it
   propagates.
7. **Explicit intent outranks inferred evidence.** `approvedDefaultFor`
   returns null for an ineligible default (`intent.js:353-356`);
   `previouslyUsedBefore` refuses an excluded predecessor (`:429-430`);
   `repeatedDefaultCandidate` refuses one (`:563`); `rankPersonalised`
   filters before ranking (`:615`).
8. **Ranking exposure is never evidence.** Only `recordExerciseSwap`
   creates evidence (`intent.js:23-26`).
9. **Session substitutions never teach dislike.** `swappedAwayCount`
   counts `scope === 'programme'` only (`:399-403`); NULL-scope legacy
   rows are not counted (`:394-397`).
10. **No plan is ever auto-rewritten.** The in-plan surface is a notice
    plus a Swap button (`ActiveWorkoutScreen.js:3412-3442`).
11. **Tolerance is declared untracked, never inferred.**
    `tolerance: 'not_tracked'` (`intent.js:477`), with the reason at
    `:441-444`.
12. **No per-family volume dosage.** `movementFamily.js:51-57`.

### As-implemented precedence

Two separate precedence chains exist and they are not the same.

**A. Eligibility (suggestion gating)** — `isEligibleExercise`
(`intent.js:286-290`) is a pure conjunction, so it is *unordered*: an
exercise is blocked if ANY of {id EXCLUDED, id AVOIDED_BLOCK (current
block), family EXCLUDED, family AVOIDED_BLOCK (current block), family
PATTERN_AVOID} holds. Nothing overrides anything; there is no allowance,
no exception, no per-exercise override of a family block.

**B. Reason reporting** — `generationBlockReason` (`generation.js:55-69`)
IS ordered, and the order is: id `excluded` → id `avoided_block` → family
`excluded` → family `avoided_block` → family `pattern_avoid`. First match
wins and names the reason.

**C. Ranking** — `rankPersonalised` (`intent.js:600-680`): filter by
eligibility, then tier
`APPROVED_DEFAULT(5) > RECENT_REPLACEMENT(4) > REPEATED_REPLACEMENT(3) >
PERSONAL_EVIDENCE(2) > PREVIOUSLY_USED(1) > NONE(0)`, each scaled by
maturity weight except `APPROVED_DEFAULT`, which is exempt because it is
intent not evidence (`:650-663`); ties broken by generic canonicality
(`tierRank`), then structural score, then engine order (`:675-678`).

---

## 8 CURRENT TESTS

### 8.1 The three pins named in the brief — exact assertions

**(a) Read-only intent module pin.**
`src/lib/exercise/__tests__/campaign9.intent.test.js:68-78`, test name
`'exclusion touches NO history: the layer cannot reach workouts, sets or PRs'`:

```js
const SRC = require('fs').readFileSync(require('path').resolve(__dirname, '../intent.js'), 'utf8');
expect(SRC).not.toMatch(/deleteWorkout|deleteSet|removeWorkoutSet|DELETE FROM workout/i);
const imports = SRC.slice(SRC.indexOf("} from '../database'") - 400, SRC.indexOf("} from '../database'"));
expect(imports).not.toMatch(/recordExerciseSwap|setExerciseIntent|setExerciseSlotDefault|clearExercise/);
expect(imports).toMatch(/getExerciseIntents/);
```

What it actually forbids: (i) four history-mutator identifiers anywhere in
`intent.js`; (ii) four writer identifiers **inside the 400 characters
preceding the first `} from '../database'`** — i.e. the import block only.
It does not forbid a write reached by `require()` elsewhere in the file, and
the 400-character window is positional, not syntactic. D110-1 records that
the write helpers were moved out rather than the guard loosened
(`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:2999-3006`).

**(b) Identical-writes pin, re-pinned under D109-2.**
`src/lib/exercise/__tests__/campaign9.generation.test.js:188-222`, test name
`'the engine receives the identical library array and writes identical rows'`.
Setup: run generation once with `intents: []`, then again with
`getExerciseIntents` and `getActiveBlock` both rejecting. Assertions
(`:211-221`):

```js
const { constraintsUnavailable, ...afterRest } = after;
expect(constraintsUnavailable).toBe(true);
expect(before.result.constraintsUnavailable).toBeUndefined();
expect(before.result).toEqual(afterRest);
expect(addExerciseToRoutine.mock.calls).toEqual(before.calls);
expect(before.names.length).toBeGreaterThan(0);
expect(before.result.blockedByIntent).toBeUndefined();
expect(before.result.blockedSlots).toBeUndefined();
expect(before.result.needsChoice).toBeUndefined();
```
What it forbids: a constraints read failure changing ANY write
(`addExerciseToRoutine` calls must be call-for-call identical) or any result
field other than the single `constraintsUnavailable` boolean. D110-2 is the
ruling (`DECISIONS-2026-07-09.md:3007-3011`).

**(c) Companion source guards** (same file, `:381-402`):
- travel mode: `expect(fn).toMatch(/filterLibraryForGeneration\(all, state\)\.library/)`,
  `/if \(!match && findIn\(all\)\) return null;/`, `/newItems\.filter\(Boolean\)/` (`:384-392`);
- plan generation: `expect(SRC).toMatch(/filterLibraryForGeneration/)` (`:394-397`);
- picker: `expect(SRC).toMatch(/showExcluded \|\| !intentState \|\| isEligible\(intentState, e\.id\)/)`
  (`:399-402`). **This is why the family check in the picker is a separate
  AND term** — the code comment says so explicitly
  (`ExercisePickerModal.js:222-227`).

**(d) The `PATTERN_AVOID` mock pin.**
`campaign9.intent.test.js:23-34` now includes `PATTERN_AVOID:
'pattern_avoid'` in the `database` mock with a comment naming the exact
`undefined === undefined` defect. This is the closest thing to a
regression guard on the hardening, and it is indirect: it pins the MOCK,
not the production behaviour.

### 8.2 What Campaign 31 tested — nothing new, behaviourally

**OBSERVED.** `git show --stat f672c590` lists 20 files. The only test files
touched are `campaign9.generation.test.js` (+13/-2, the D109-2 re-pin),
`campaign9.intent.test.js` (+7/-2, the mock line), and four
migration-window suites bumped by one
(`database.bicepsSubregion.test.js`, `database.frontDeltMigration.test.js`,
`database.effectiveMaintenanceMigration.test.js`,
`database.coachOutputReid.test.js`).

Grep across all `*.test.js` for
`PATTERN_AVOID|isFamilyBlocked|setMovementPatternAvoid|listActiveMovementConstraints|expiresAtMs|isPatternAvoided|isEligibleExercise|movementConstraints`
returns matches in exactly four files, and in every case the match is
either the mock line above or a migration-window comment
(`database.frontDeltMigration.test.js:81`,
`database.effectiveMaintenanceMigration.test.js:34-42`,
`database.bicepsSubregion.test.js:56-57`).

**Therefore, as of HEAD there is no test that asserts:** a PATTERN_AVOID
family is excluded from a generated pool; a PATTERN_AVOID family is
excluded from swap candidates; expiry is honoured to the millisecond; the
lazy tombstone fires; `isFamilyBlocked` handles the three kinds;
`listActiveMovementConstraints` returns the right shape;
`setMovementPatternAvoid` maps durations correctly or rejects an invalid
one; `familyTargetKey`'s prefix discipline; `movementFamilyOf`'s shape
tolerance; the in-plan surface never auto-rewrites; the family filter at
any of the named call sites. The spec's "## Tests" paragraph is quoted in
§13.4 — none of its four engine-pure requirements and neither of its two
source-guard requirements is met.

The board records why: "the injury agent died on the session cap AFTER
completing the build (lint clean, **tests unrun**)"
(`docs/TASKBOARD.md:2434-2435`).

### 8.3 Existing tests that DO cover the domain

- `campaign9.intent.test.js` (400 lines, 44 tests) — exclusion,
  block-scoped avoidance, swap-memory contextuality, scope asymmetry,
  explicit-over-inferred precedence, personalised ordering determinism,
  evidence dimensions incl. `tolerance: 'not_tracked'` (`:328`),
  default-proposal thresholds, fail-open load (`:394`).
- `campaign9.generation.test.js` (403 lines) — filter purity/reference
  identity, name-arm catch, POOL-fallback refusal, blocked-slot reporting,
  dry-run parity, the source guards above.
- `campaign9.exerciseIntentSync.test.js` — real in-memory SQLite through
  the real init path; tombstone push, LWW in both directions, append-only
  swap log, five-column id remap. **No expiry coverage.**
- `campaign9.closeout.test.js:100-130` — erasure/GDPR guards against
  `migrate_136`.
- `campaign15.stateContract.test.js:143-151`, `:256` — the intent tables
  are contracted state with a named applier and conflict rule.
- `campaign16.movementFamily.test.js` — the family taxonomy itself
  (curation hygiene, pool/library agreement, contested calls).

---

## 9 REUSABLE INFRASTRUCTURE

Concrete, working machinery a successor system could build on rather than
replace:

1. **One loader, one state object.** `loadExerciseIntentState`
   (`intent.js:70-122`) is the single I/O point; every question after it is
   a pure function over a plain object. Sixteen call sites already use it.
2. **A generic target column.** `exercise_intent.exercise_id` already
   carries non-exercise targets via a namespaced prefix
   (`intent.js:216-228`). The prefix is constructed in exactly one place.
3. **Prefix discipline with a decoder.** `familyTargetKey` /
   `familyFromTargetKey` (`:226-234`) — the pattern extends to further
   target namespaces without a schema change.
4. **Read-time expiry with lazy cleanup.** `getExerciseIntents`
   (`database.js:9811-9836`) is a reusable pattern for any dated
   constraint: injectable clock, expired rows omitted then tombstoned,
   cleanup failure isolated from the read.
5. **A tombstone-propagating restore.** Already correct for multi-device.
6. **A senior eligibility question with a superset relationship.**
   `isEligible` ⊂ `isEligibleExercise` (`:286-290`) — a third layer can be
   added inside `isEligibleExercise` and every existing caller inherits it.
7. **Generation-time reporting, not silent dropping.**
   `filterLibraryForGeneration` returns `{library, droppedIds,
   droppedNames, dropped, reasonById, reasonByName}` (`generation.js:104-143`),
   and `attachBlockedSlots` (`planAutoGen.js:630-643`) turns unfillable
   slots into `{blockedByIntent, needsChoice, blockedCount, blockedSlots}`.
8. **The name-arm guard against the hand-written POOL.**
   `generationBlockFor` (`generation.js:158-169`) + `resolveSeed`
   (`planAutoGen.js:320-337`) — the only defence against `planEngine`'s
   name-based fallback reintroducing a filtered exercise.
9. **A calm, non-clinical label layer.** `FAMILY_LABELS` + `familyLabel`
   (`movementFamily.js:283-331`) with a never-unlabelled fallback.
10. **Scope typing on the event log.** `SWAP_SCOPE`
    (`swapScope.js:26-31`) already separates "today only" from "changed my
    programme", and the asymmetric counting rule is documented and pinned.
11. **Evidence maturity weighting.** `EVIDENCE_MATURITY` / `maturityWeight`
    (`intent.js:520-552`) — a ready mechanism for "personal evidence earns
    its way past the generic default".
12. **A structural/personal separation in ranking.** `swapEngine.rankSwaps`
    decides validity; `rankPersonalised` only reorders inside it
    (`intent.js:583-599`).
13. **Cross-device id remap covering all five id columns.**
    `remapExerciseIdInIntentTables` (`database.js:10625-10672`).
14. **A state contract test that fails when a new synced table is not
    classified** (`campaign15.stateContract.test.js:250-259`).
15. **An equipment reachability predicate, exported for direct test.**
    `equipmentReachable(ex, equipment)` (`planAutoGen.js:361-366`), failing
    open on both unknown cases.
16. **A slot-verdict engine with a safety slot already reserved.**
    `programmeEpoch.slotVerdict` (`:265-298`) has an ordered precedence and
    already carries `SLOT_REASON.JOINT_DISCOMFORT` at position 2 (`:283`),
    ahead of equipment loss — currently unreachable (§11.4).

---

## 10 CONFLICTS WITH THE NEW SYSTEM

Framed against the CC25 challenge pass
(`docs/capability-campaign-25-2026-08-20/00-CHALLENGE-PASS.md`). These are
observations about what the existing system cannot express or does today;
no recommendation is attached.

**10.1 One row per target destroys prior state (H1, H3).** The upsert
(`database.js:9760-9773`) overwrites `kind`, `scope_mesocycle_id`, `reason`
and `expires_at_ms` in place. There is no append-only interval history: a
baseline restriction and a temporary episode against the same family
cannot coexist, and setting an episode over a baseline erases the baseline
permanently. H3's "versioned constraint timeline (append-only intervals)"
has no substrate here.

**10.2 No role, no source, no severity, no laterality.** The row has
exactly `kind`, `scope_mesocycle_id`, `reason` (never populated) and
`expires_at_ms`. There is no `baseline` vs `episode`, no typed source, no
side. H1's "typed constraint with role and typed source" is not
representable without new columns or a new table.

**10.3 Kind conflates duration with meaning.** `EXCLUDED` means both
"indefinite duration" and "don't suggest this"; C31 reused it for
"avoid this pattern indefinitely" (`movementConstraints.js:36-38`). A
permanent capability fact and a strong dislike are therefore
**byte-identical rows**. This is the load-bearing question the challenge
pass flags at `00-CHALLENGE-PASS.md:27-29`; the answer is yes, they
collapse (see §13.3).

**10.4 The family vocabulary is not a demand ontology (H4).** Families are
derived from a curated name registry plus a per-muscle subregion
pass-through (`movementFamily.js:246-266`). They describe *what a movement
trains*, not *what it demands of the body*: no overhead position, no
weight-bearing, no grip, no unilateral stance, no floor transfer. 143 of
551 seeded exercises resolve to `null` (§13.6), and five whole muscles have
no family at all.

**10.5 Constraints are selection-only; nothing reaches prescription (H5).**
`weeklyCoach` has zero intent awareness (§5). Session resolution
(`sessionAdjustments`, the C20 resolver at
`ActiveWorkoutScreen.js:707-746`) has no constraint stage. There is no
"effective prescription" concept: a constrained athlete gets the same set
targets and the same load logic.

**10.6 No learning-eligibility provenance anywhere (H2, H6).** No set,
workout, block or evidence record carries a constraint context tag. Grep
finds no such field. `exerciseEvidence` (`intent.js:459-491`),
`swappedAwayCount`, `getExerciseUsageStats` and the block ledger all treat
every session as equally representative. A block trained under a temporary
restriction teaches the next block exactly as a normal block would.

**10.7 A family block has no per-exercise allowance.**
`isEligibleExercise` is an unconditional conjunction (`intent.js:286-290`).
There is no way to say "avoid overhead pressing, except the landmine
press". The only escape is the picker's "Show what you have set aside"
toggle, which does not mark family-blocked rows (§11.2).

**10.8 The reads that are still id-level.** Three consumers were not
upgraded by C31 and remain blind to family avoidance:
`findPlanIntentConflicts` (`intent.js:147`),
`blockAdvisor.buildProgrammeReview` (`blockAdvisor.js:509`), and the
picker's per-row "set aside" badge (`ExercisePickerModal.js:596`). A
successor's senior question must reach these too.

**10.9 The picker's Recent rail bypasses every filter.**
`ExercisePickerModal.js:207-209` builds the rail from
`getRecentlyUsedExerciseIds` and `:474-496` renders it with no eligibility
check of any kind, in add mode. This is precisely the "exercise picker's
suggestion rails" the spec named as a hard-filter site.

**10.10 `constraintsUnavailable` is produced but never consumed.**
`planAutoGen.js:636` sets it; grep across `src/` finds no reader. None of
the six generation call sites (`ProGoalSetupScreen.js:456`,
`PlanUpdateScreen.js:168,227`, `ProOnboardingScreen.js:1487`,
`HomeScreen.js:2238`, `PlansScreen.js:550,606,1180`) reads it. D109-2's
"affected surfaces show a visible constraints-unavailable notice" is
honoured in the picker (`:502-509`), the two swap sheets
(`RoutineDetailScreen.js:363-365`, `ActiveWorkoutScreen.js:1040-1042`) and
the list screen (`AvoidedMovementsScreen.js:104-111`), but **not for plan
generation**, which is the surface with the largest blast radius.
`PlansScreen.js:228-232` documents a deliberate degrade (row hidden) for
the count row.

**10.11 Free/Pro.** Avoidance is currently free and ungated (§2), which is
consistent with CC25 Amendment 1's FD-1 (`docs/TASKBOARD.md:789-792`) but
was never an explicit ruling for C31 that I can find.

---

## 11 PROVENANCE RISKS

**11.1 No reason is ever captured.** `reason` is nullable, plumbed through
three layers (`database.js:9756`, `movementConstraints.js:28`,
`intent.js:335`) and written by nothing (§4.3). A row cannot say why it
exists. The schema comment is explicit that it must never be interpreted
anyway: "`reason` is OPTIONAL free context; it is never read as a
diagnosis" (`database.js:2173-2174`; same wording in
`migrate_136:14-18`).

**11.2 A family block is invisible in the one place a user could undo it
from the exercise.** `ExercisePickerModal.js:596` computes
`setAside = !isEligible(state, item.id)` — id-level. With "Show what you
have set aside" on (`:513-525`; the toggle's visibility test counts family
keys too, `[...intentState.intents.keys()].length > 0`), a family-blocked
exercise reappears in the list rendered as an ordinary row with its muscle
name and an add/swap icon, with **no "set aside" label and no "Allow again"
action** (`:605-632`). The user is offered an exercise that every generator
refuses, with no explanation.

**11.3 Manual choice is not distinguished from suggestion acceptance.**
`exercise_swaps` records `explicit` (always `1`, §4.3) and `scope`. There
is no field for "the user typed this into the picker" vs "the user tapped
the top-ranked suggestion". `rankPersonalised` reorders candidates and the
user's tap then becomes evidence — the module header calls this out as a
law it protects ("Ranking exposure is not evidence", `intent.js:23-26`),
but the protection is only that *ranking itself* does not write; a
suggestion-influenced tap is recorded identically to a searched-for choice.

**11.4 The only structured pain signal is session-level and unreachable
from exercise decisions.** `workouts.joint_discomfort` (0-3) is captured
post-workout for the whole session
(`WorkoutSummaryScreen.js:1742`). `workout_sets.joint_discomfort` exists in
the schema (`database.js:251`) and in the sync payload
(`sync.js:489`) but **has no writer** (§4.3).
`programmeEpoch.slotVerdict` reserves the second precedence slot for it
(`programmeEpoch.js:283`, `SLOT_REASON.JOINT_DISCOMFORT` at `:66`), but
**no production caller ever sets `evidence.jointDiscomfort`**: the two
`evidenceFor` builders are `planAutoGen.buildSlotEvidence`
(`:426-463`, which documents the omission at `:419-424`: "Joint discomfort
in particular is not inferred: the app has no per-exercise tolerance
signal… manufacturing one would be inventing a safety fact") and
`blockAdvisor.evidenceFor` (`:506-532`, which also omits it). The branch is
dead.

**11.5 The block-review path under-reports.** `blockAdvisor.js:509` sets
`excluded: isExcluded ‖ isAvoidedThisBlock` on the exercise id only, so a
family-avoided incumbent is judged as if nothing were wrong, while the same
incumbent in a plan rebuild is judged `excluded` via `isEligibleExercise`
(`planAutoGen.js:438-440`). Two paths, two answers, same fact.

**11.6 An untagged custom exercise inherits a family it may not have.**
`insertExercise` takes `data.subregion ?? null` (`database.js:2997`) and
the picker's create form never supplies one
(`ExercisePickerModal.js:239-252`). For a custom `back` exercise,
`movementFamily(name, 'back', null)` returns `FAMILY.UPPER_MID_ROW`
(`movementFamily.js:262`) — so avoiding "upper-back rowing" blocks every
untagged custom back exercise whatever it actually is. For a custom
exercise in any non-classified muscle the family is `null` and it can
neither be pattern-avoided nor pattern-blocked.

**11.7 `face_pull` spans two muscles.** Computed over `SUBREGION_MAP` +
`RAW` in `src/lib/seedExercises.js`: `face_pull` is the only subregion
value carried by two different primary muscles (`rear_delts` and `back`).
A `family:face_pull` avoidance set from a back exercise therefore also
blocks rear-delt face pulls. Whether that is intended is not recorded
anywhere.

---

## 12 SYNC / MIGRATION ISSUES

**12.1 The push/pull path.** `exercise_intent` is on the LEGACY sync path,
not the registry engine: `src/lib/sync/tables/` contains no intent module,
and `_pushExerciseIntent` (`sync.js:1207-1236`) / `_pullExerciseIntent`
(`sync.js:2427-2451`) are hand-written. Push is full-table (all rows
including tombstones, 200-row chunks, `onConflict: 'user_id,id'`); pull is
watermarked on `updated_at` with `insertOrUpdateExerciseIntentFromCloud`
per row and the watermark advanced only on zero failures (`:2448`).

**12.2 Type conversion.** Local `expires_at_ms` (INTEGER epoch ms) ↔ cloud
`expires_at` (timestamptz). Push: `new Date(r.expiresAtMs).toISOString()`
(`sync.js:1224`). Pull: `_tsToMs(row.expires_at) ?? null`
(`database.js:10527`), which collapses an absent column to `null` rather
than throwing (`:10520-10526`).

**12.3 STALE COMMENTS claiming migrate_142 is not applied.** Three live
comments state the opposite of the ledger:
- `database.js:2583-2585`: "Cloud counterpart:
  supabase/migrate_142_exercise_intent_expiry.sql, additive, **NOT applied**
  (founder-gated per CLAUDE.md…)".
- `database.js:2586-2590`: describes an ongoing tolerated push failure that
  no longer occurs.
- `sync.js:1221-1223`: "Column added by migrate_142, **founder-gated**: the
  upsert batch fails soft with a logged PostgREST error until that
  migration runs".
Authority says applied and verified: `migrate_142:46-52` and
`supabase/README.md:342`. Consequence today is cosmetic (the code path is
identical either way) but the comments would mislead anyone reasoning about
push safety.

**12.4 Cloud `kind` has no CHECK.** `migrate_136:130` is `kind text not
null`. A future kind needs no cloud migration — and equally, a malformed
kind is accepted and will round-trip.

**12.5 The expiry tombstone rewrites `updated_at` to sweep time.**
`database.js:9829-9831` writes `deleted_at = nowMs, updated_at = nowMs`
then `_scheduleSync()`. The conflict rule is "newer `updated_at` wins, tie
stays local" (`:10481-10505`). **Inferred hazard, UNVERIFIED (no test, not
reproduced):** if device A holds a stale copy of a family row whose
`expires_at_ms` has passed, and device B has just re-set that same family
(same natural key ⇒ same row id, `updated_at` = B's set time), a sweep on
A after B's write stamps a strictly newer `updated_at` on a tombstone and
that tombstone would win the comparison, silently clearing B's fresh
avoidance. The tombstone's timestamp is the sweep instant, not the expiry
instant. I did not construct this case; the mechanism is read directly from
the two cited functions.

**12.6 The id remap does not touch family targets — correctly.**
`remapExerciseIdInIntentTables` (`database.js:10625-10640`) matches on
exact `exercise_id` equality against a canonical exercise id; a
`family:<key>` string can never equal one. No action needed; recorded so a
successor does not assume it is handled.

**12.7 GDPR / erasure covers the family rows for free.** Family rows live
in `exercise_intent`, which is deleted by `delete_user_data()`
(`migrate_136:110-112`, guarded by
`campaign9.closeout.test.js:100-130`) and by the local per-user wipe
(`database.js:6109-6115`). `migrate_142:71-75` records "No new data
category… not health data".

**12.8 Sync coverage of expiry is untested.**
`campaign9.exerciseIntentSync.test.js` builds a real database through the
real init path (so the column exists) but has no test that pushes, pulls or
round-trips `expires_at`, and none that exercises the sweep.

**12.9 Documentation drift on migration counts.** `CLAUDE.md` §1 says
"Cloud schema… (133 files, highest `migrate_136`…)" and the status block
says "132-135 written and awaiting the phrase". The tree has
`migrate_144_apple_review_password_reset.sql`, and `supabase/README.md`
records 132-144 as applied. `docs/TASKBOARD.md:2441` says "migrate_142
written, NOT applied (founder-gated)" while `:2454-2456` of the same
section says "Cloud batch: DONE. migrate_142 + migrate_143 applied and
verified".

---

## 13 ANSWERS TO SPECIFIC QUESTIONS

### 13.1 Complete typed inventory of intent/constraint kinds

Three kinds exist in the data model (`database.js:9728-9738`). Each can
address either an exercise id or a `family:<key>` target, giving six
live combinations. There is no fourth kind anywhere in the tree.

| # | kind | target | writer(s) | reader(s) | creation | expiry | removal |
|---|---|---|---|---|---|---|---|
| 1 | `excluded` | exercise id | `RoutineDetailScreen.js:502` (via `openAvoidSheet` "Don't suggest it", `:412-415`) | `isExcluded` `intent.js:174`; `isEligible`; `filterEligible`; `generationBlockReason:58`; `blockAdvisor:509`; `findPlanIntentConflicts:147`; picker `:221`, `:596` | user action | **none** (indefinite) | `clearExerciseIntent` from `RoutineDetailScreen.js:389` or `ExercisePickerModal.js:622` |
| 2 | `avoided_block` | exercise id | `RoutineDetailScreen.js:502` ("Avoid for this block", `:408-411`), with `scopeMesocycleId` from `getActiveBlock` `:501` | `isAvoidedThisBlock` `intent.js:184-186`; same downstream set as (1) | user action | implicit: `scopeMesocycleId !== activeMesocycleId` ⇒ dead. **Row is never deleted** and never tombstoned | same as (1) |
| 3 | `pattern_avoid` | `family:<key>` | `movementConstraints.js:41-44` ← `RoutineDetailScreen.js:474` (7/14/30 buttons `:461-463`) | `isPatternAvoided` `:254-261`; `isFamilyBlocked` `:271-275`; `isEligibleExercise` `:286-290`; `generationBlockReason:67`; `listActiveMovementConstraints:324-326`; `ActiveWorkoutScreen.js:682` | user action, `expiresAtMs = now + days*86400000` | **explicit**, read-time, then lazily tombstoned (`database.js:9824-9834`) | `clearMovementPatternAvoid` from `AvoidedMovementsScreen.js:92` or `RoutineDetailScreen.js:446` |
| 4 | `avoided_block` | `family:<key>` | `movementConstraints.js:32-34` ← `RoutineDetailScreen.js:474` ("For this block" `:464`) | `isFamilyBlocked` (via `isAvoidedThisBlock`); `listActiveMovementConstraints:327-328`; `generationBlockReason:66` | user action | block boundary; row persists | as (3) |
| 5 | `excluded` | `family:<key>` | `movementConstraints.js:37` ← `RoutineDetailScreen.js:474` ("Indefinitely" `:465`) | `isFamilyBlocked` (via `isExcluded`); `listActiveMovementConstraints:329-330`; `generationBlockReason:65` | user action | none | as (3) |
| 6 | slot default (not an intent kind) | `exercise_slot_defaults` row | `setExerciseSlotDefault` ← `RoutineDetailScreen.js:565` after a repeated-swap offer | `approvedDefaultFor` `intent.js:347-357`; `rankPersonalised:602,622` | user accepts the offer | none | `clearExerciseSlotDefault` — **no production caller** |
| 7 | preference inference (not stored as intent) | `exercise_swaps` rows | `recordExerciseSwap` × 2 call sites | `swapEvidenceFor`, `swappedAwayCount`, `sessionSubstitutionCount`, `previouslyUsedBefore`, `repeatedDefaultCandidate`, `exerciseEvidence` | every swap | never | append-only; never removed |

Precedence as implemented: see §7 A/B/C. In one line: eligibility is an
unordered conjunction of all five blocking conditions (no override
exists); reason reporting is ordered id-before-family and
excluded-before-block-before-pattern; ranking places approved defaults
above every inferred signal and exempts them from maturity scaling.

### 13.2 A pain swap today — the exact code path

Scenario: mid-session, an exercise hurts, the athlete swaps it.

1. **Entry.** `ActiveWorkoutScreen` swap control, or the Swap pill inside
   the avoided-pattern notice (`:3430-3438`) → `handleOpenSwap()`
   (`:1012`).
2. **Candidates.** `getAllExercises()` (`:1013`); exclude what is already
   in the session (`:1014`); `rankSwaps(exercise, allExercises,
   {excludeIds, numResults: 20, excludeAssisted: !isBeginner, equipment})`
   (`:1023`) — pure structural scoring
   (`swapEngine.js:200`, weights `:18-30`), equipment read lazily off the
   store (`:1022`).
3. **Personalisation.** `getActiveBlock` → `loadExerciseIntentState`
   (`:1026-1031`) → `rankPersonalised` (`:1032-1035`), which drops
   `!isEligibleExercise` candidates (`intent.js:615`) and tags the rest.
   If the read failed, a toast says so and nothing is filtered
   (`:1040-1042`).
4. **Sheet copy** (`:4785`): *"Choose a close match for today. Your plan is
   not changed, and sets you log count towards the new exercise's own
   muscle in your weekly volume."*
5. **Commit.** `handleConfirmSwap(newExercise)` (`:1048-1117`): rebuilds
   the slot's `routineExercise` from the new exercise's own rep defaults
   and **nulls `startingWeight`** (`:1057-1071`); replaces the entry in the
   store with `sets: []` (`:1072-1078`); clears `prevSets`, `allTimeSets`,
   `loggedSets`, ghost set, cluster, per-side, note (`:1096-1116`).
6. **The only durable write** (`:1089-1094`):
   `recordExerciseSwap(user.id, exercise.id, newExercise.id, { routineId:
   activeWorkout?.routineId ?? null, explicit: true, scope:
   SWAP_SCOPE.SESSION })`.

**What is recorded:** one `exercise_swaps` row — `id`, `user_id`,
`from_exercise_id`, `to_exercise_id`, `routine_id`, `mesocycle_id` = NULL,
`explicit` = 1, `scope` = `'session'`, `created_at`, `updated_at`
(`database.js:9848-9853`).

**What is learned:** the replacement gains POSITIVE evidence — it counts in
`swapEvidenceFor` (`intent.js:368-382`) regardless of scope, which can
raise it to `RECENT_REPLACEMENT` or, at 3, `REPEATED_REPLACEMENT` in future
rankings (`:624-627`), and can make it a `repeatedDefaultCandidate`
(`:559-565`) — though that offer is only made in `RoutineDetailScreen`
(`:557-569`), never in the logger. `sessionSubstitutionCount`
(`:413-417`) increments and is deliberately never used as negative
preference. `swappedAwayCount` does **not** increment (session scope,
`:399-403`), so the painful exercise gains no negative signal at all.

**What is NOT recorded:** any reason, cause or pain flag; any link to the
avoided-pattern notice that may have prompted the swap; anything at all in
`exercise_intent`; any per-exercise or per-set discomfort
(`workout_sets.joint_discomfort` has no writer, §4.3); any laterality or
severity; any indication the swap was for pain rather than a busy machine —
the two are the same row. `exerciseEvidence` continues to report
`tolerance: 'not_tracked'` (`intent.js:477`).

**To make it durable** the athlete must separately open the routine editor,
tap the eye-off icon on that exercise
(`RoutineDetailScreen.js:895-902`) and choose one of five options. Nothing
in the logger offers that, and nothing links the two actions.

The only pain signal the app records that session is the whole-session
0-3 rating at `WorkoutSummaryScreen.js:1742`, which reaches
`computeAdaptiveDecision` (`algorithms.js:817-848`) and can return
`decision: 'rotate_exercise'` with copy *"High joint discomfort. Rotating
to a lower-risk exercise next session."* — a decision consumed only by an
icon in `EngineLog.js:129`. No code acts on it.

### 13.3 Does any data structure distinguish "dislike" / "cannot perform" / "equipment missing"?

**Partly — two of the three, and not the two that matter for capability.**

- **"Equipment missing" IS distinguished, structurally and separately.**
  It lives outside the intent layer entirely: `userProfile.equipment` (one
  of `full_gym`, `machines_cables`, `dumbbells_only`, `barbell_plates`,
  `home_gym`, `bodyweight`) matched against `exercises.equipmentProfiles`
  by `equipmentReachable` (`planAutoGen.js:361-366`) and
  `parseProfiles`/`filterPool` (`poolGenerator.js:104-110`), surfaced as
  `evidence.equipmentLost` → `SLOT_REASON.EQUIPMENT_LOST`
  (`planAutoGen.js:444`, `programmeEpoch.js:286`), and as its own
  user-facing copy (`planShortfallNote`, `planAutoGen.js:277-281`).
  `attachBlockedSlots` deliberately keeps the two apart:
  "`partial`/`missedCount`/`missedExercises` keep their exact FF-003
  meaning (moves that could not be matched to the user's EQUIPMENT)… A slot
  left empty by the user's own exclusion is a different fact and gets its
  own fields" (`planAutoGen.js:624-628`).

- **"Dislike" vs "cannot perform" are NOT distinguished. Checked and
  absent.** Both are the same row with the same `kind`. A user who says
  "I hate leg extensions, don't suggest them" and a user who says "my knee
  cannot extend under load" both produce `kind = 'excluded'` (or a
  `family:` variant) with `reason = NULL`. Nothing downstream can tell them
  apart, and nothing asks.

  Searches run, all over `src/`, all returning nothing relevant:
  - `grep -rn "dislike"` in `src/lib src/screens src/components` — only
    the FOOD domain (`src/lib/food/db.js:886-908`, `VALID_KINDS = new
    Set(['fav', 'dislike'])`). The food layer has an explicit
    like/dislike typing that the exercise layer does not.
  - `grep -rln "injur|painFree|jointPain|mobilityLimit|disabilit|wheelchair|prosthe|amput"` —
    no production module models any of these; matches are prose in
    comments only.
  - `grep -rn "'pain'|\"pain\"|discomfort"` — `joint_discomfort` (session
    level, §11.4), `formTips.js:403` prose, `swapEngine.js:6` (a stale
    header claim, §14.2). No per-exercise structure.
  - `grep -rn "severity|contraindicat|restriction|capability"` over
    `src/lib` — nothing in the exercise domain.
  - `src/lib/accessibilityPrefs.js` and
    `src/lib/athleteProfileAccessibility.js` are UI accessibility (screen
    reader labels, AsyncStorage prefs), not physical capability.
  - No column named `reason_code`, `constraint_type`, `source`, `role`,
    `severity` or `side` exists on any exercise-domain table
    (`database.js:2192-2230`, `:2598-2600`; `migrate_136:126-188`;
    `migrate_142:77-78`).

  The `reason` TEXT column is the only place such a fact could be written
  today; it is never written, and both the local schema comment
  (`database.js:2173-2174`) and the cloud migration (`migrate_136:14-18`)
  state it "is never read as a diagnosis, by this schema or by any
  client".

### 13.4 What the C31 spec explicitly DEFERRED or left open — verbatim

From `docs/complaint-research-triage-2026-08-17/INJURY-CONSTRAINTS-SPEC.md`:

**Left OPEN (an explicit open decision handed to the build lead), item 4:**
> "**Fail direction (OPEN DECISION for the build lead, recorded here):
> intent.js currently fails OPEN on read error (advisory). For injury
> constraints the harm is inverted - silently suggesting a forbidden
> movement. Proposed: generation proceeds on a read error but the affected
> surfaces show a constraints-unavailable notice; never fabricate. Decide at
> build with the ED-safety lens.**"

Closed as D109-2 (`DECISIONS-2026-07-09.md:2982-2985`), implemented as
`unavailable` / `constraintsUnavailable` (§10.10 records the one surface
that does not read it).

**Deliberately DEFERRED, the whole "out of scope" section:**
> "## Deliberately out of scope (v1)
> Per-joint anatomical model; severity grades; automatic substitution
> without user action; coach-engine progression changes (constraints
> filter WHAT is suggested, they do not alter volume/calorie maths -
> keeps the deterministic engine untouched)."

**Bounded by design, item 5:**
> "**Not medical.** Copy stays calm and non-clinical ("Avoiding
> overhead pressing until 31 Aug"), no diagnosis vocabulary, no pain
> scales (ED/anxiety-adjacent instrument creep - out)."

**Left to build-time verification, item 2:**
> "Additive column `expires_at_ms` on the intents table (local migration
> via PRAGMA user_version; cloud additive migration if intents sync -
> verify at build; intent.js reads suggest local-only today)."

That verification came out the other way: intents DO sync (§12.1), and
`migrate_142` was written and applied.

**Specified but NOT delivered — the whole test section:**
> "## Tests
> Engine-pure: a PATTERN_AVOID family never appears in generated pools /
> swap candidates; expiry honoured to the millisecond; EXCLUDED/
> AVOIDED_BLOCK behaviour unchanged (regression). Source guards: the
> hard-filter call sites; the in-plan surface never auto-rewrites.
> Device checklist: set "avoid overhead pressing 14 days" from an
> exercise long-press, confirm generator/swap/picker all respect it, and
> the logger shows the notice with the date."

Only the EXCLUDED/AVOIDED_BLOCK regression half is covered (by the
pre-existing Campaign 9 suites). See §8.2. The device checklist is recorded
as founder-side outstanding at `docs/TASKBOARD.md:2450-2453`; I have no
evidence either way that it has been walked.

**Also specified and partially divergent — item 3's call sites:**
> "Constraints become HARD filters at every generation/suggestion point:
> poolGenerator filterPool, planAutoGen, swap candidates (swapEngine +
> handleConfirmSwap list), and the exercise picker's suggestion rails."

As built: `planAutoGen` yes; swap candidates yes but in `rankPersonalised`,
not `swapEngine`; the picker's main list yes; **`poolGenerator.filterPool`
has no filter** (filtering happens on the library handed to the engine);
**the picker's Recent rail has no filter** (§10.9).

### 13.5 What the guard tests / pins actually forbid

Answered in full with quoted assertions at §8.1 (a), (b), (c), (d). In
summary:
- **(a) read-only pin** — forbids four history-mutator identifiers anywhere
  in `intent.js`, and four writer identifiers within the 400 characters
  before its first `} from '../database'`. Window-based, not syntactic.
- **(b) identical-writes pin, D110-2** — forbids a constraints read failure
  changing any `addExerciseToRoutine` call or any result field other than
  `constraintsUnavailable: true`.
- **(c) three call-site source guards** — pin literal source strings in
  `BuildWorkoutScreen.applyTravelMode`, `planAutoGen`, and
  `ExercisePickerModal` (the last of which forced the family check to be a
  separate AND term).
- **(d) mock pin** — requires `PATTERN_AVOID` in the `database` mock so the
  `undefined === undefined` defect cannot reappear in that suite.

Nothing pins any PATTERN_AVOID behaviour itself.

### 13.6 PATTERN_AVOID's vocabulary vs the exercise library's

**Not the same taxonomy, and there are four vocabularies in play.**

PATTERN_AVOID stores whatever `movementFamilyOf(exercise)`
(`intent.js:242-247`) returns, which is `movementFamily(name,
primaryMuscle, subregion)` (`movementFamily.js:246-266`). That function
behaves in two different ways:

- **For `back` and `quads` (`CLASSIFIED_MUSCLES`, `movementFamily.js:227`)**
  it resolves by NAME from a curated registry and ignores the stored
  subregion unless it is already a valid family (`:247-255`); otherwise it
  applies a muscle default: back → `upper_mid_row`, quads → `squat_press`
  (`:262`). The stored library tag is therefore **not authoritative** for
  these two muscles, and an untagged/custom row is silently classified.
- **For every other muscle** it returns the library `subregion` verbatim,
  or `null` (`:265`).

**Vocabulary 1 — `FAMILY` enum** (`movementFamily.js:80-104`), 18
constants, values:
`vertical_pull, horizontal_lat, upper_mid_row, shoulder_extension,
spinal_erector, face_pull, squat_press, knee_extension, flat, incline,
decline, hip_extension, knee_flexion, gastro, soleus, overhead, pushdown`
(`TRICEPS_OVERHEAD: 'overhead'`, `TRICEPS_PUSHDOWN: 'pushdown'`).

**Vocabulary 2 — the library's `subregion` column.** Distinct values
present in `seedExercises.js` `SUBREGION_MAP` (`:45-581`), computed:
`activator, anti_extension, brachialis, decline, face_pull, flat, flexion,
gastro, hip_extension, horiz_abduction, horizontal_lat, incline,
knee_extension, knee_flexion, lateral_raise, long_head, overhead,
overhead_press, pumper, pushdown, rotation, short_head, shoulder_extension,
soleus, spinal_erector, squat_press, stretcher, upper_mid_row,
vertical_pull` — **29 values**.

**Overlap:** 16 of the 18 FAMILY values appear in the library vocabulary;
the two that never do are the labels-only pass-throughs. `rotation` is in
the library but not in `FAMILY`. So a PATTERN_AVOID target key is drawn
from the UNION of vocabulary 1 and vocabulary 2 (~30 possible keys),
plus `null` for anything untagged.

**Vocabulary 3 — `FAMILY_LABELS`** (`movementFamily.js:283-319`), the
display layer, 31 keys: the 18 FAMILY values plus `overhead_press,
lateral_raise, side, press, horiz_abduction, long_head, short_head,
brachialis, activator, stretcher, pumper, flexion, anti_extension,
anti_rotation`. **`rotation` is missing** — a `family:rotation` avoidance
falls through to `familyLabel`'s underscore-stripping fallback
(`:328-331`) and renders as the bare token "rotation". Conversely `side`,
`press` and `anti_rotation` are labelled but are POOL values, not library
values (below).

**Vocabulary 4 — the POOL subregion vocabulary**, which
`SUBREGION_REQUIREMENTS` (`planEngine.js:791-830`) actually matches on,
produced by `translateSubregion` (`poolGenerator.js:83-98`) via
`SUBREGION_TRANSLATION` (`:36-61`) and `DEFAULT_SUBREGION` (`:66-81`). It
renames some library values (`lateral_raise → side`, `overhead_press →
press`, `rotation → anti_rotation`, chest `decline → lower`) and adds
values the library never uses (`vasti`, `upper`, `adductor`,
`horizontal_row`, `sweep`, `lower_lat`). Back/quads route through
`movementFamily` instead (`:90-92`).

**Coverage gap, computed from source.** Of 551 top-level `RAW` rows in
`seedExercises.js` (`:586`–), 401 have a `SUBREGION_MAP` entry.
**143 rows are untagged AND outside `back`/`quads`**, so
`movementFamilyOf` returns `null` for them and no PATTERN_AVOID can be set
from or against them. By muscle: `abs` 23, `forearms` 22, `traps` 18,
`neck` 14, `hamstrings` 11, `adductors` 11, `chest` 10, `front_delts` 10,
`tibialis` 9, `side_delts` 7, `triceps` 5, `calves` 3. Five muscles —
`traps`, `forearms`, `neck`, `adductors`, `tibialis` — carry **no
subregion tags at all**, so no exercise of those muscles can ever be
pattern-avoided. The UI response is the toast at
`RoutineDetailScreen.js:432`: *"Volyume can't place this exercise in a
movement pattern to avoid."*

**One cross-muscle key.** `face_pull` is carried by both `rear_delts` and
`back` (§11.7) — the only such collision.

---

## 14 UNKNOWN / UNVERIFIED

1. **Whether the founder device-walk for C31 happened.** The checklist
   ("avoid-pattern set/notice/list/allow-again") is recorded as
   founder-side at `docs/TASKBOARD.md:2450-2453`. I found no record of its
   outcome. REPORTED only.
2. **`swapEngine.js:6` header claim.** "Extended (Phase 6) with
   joint-discomfort pattern detection and auto-swap logic." No such code
   exists in the module — the only exports are `buildSwapReason` (`:107`)
   and `rankSwaps` (`:200`), and grep for `joint` in the file returns
   nothing else. Either the feature was removed and the header not updated,
   or it never landed. I could not determine which; recorded as a stale
   claim, not as a removal.
3. **The LWW expiry-tombstone hazard (§12.5).** The mechanism is read
   directly from `database.js:9829-9831` and `:10498-10505`. I did not
   reproduce it and there is no test. UNVERIFIED.
4. **Whether production `exercise_intent` rows exist with `kind =
   'pattern_avoid'`.** I have no production data access. The feature
   shipped 2026-08-18; adoption is unknown.
5. **Exact local `user_version` after C31.** Versions are positional
   (`database.js:2799`) and my brace-counting of the array is not reliable
   enough to state a number. What IS observed: the expiry entry is the
   penultimate entry in `SCHEMA_MIGRATIONS`, appended after the v81 block
   (`:2557-2563`) and before C32's `load_semantics` entry
   (`:2614-2617`), and it carries no `vNN` label.
6. **Whether the `face_pull` cross-muscle block is intended.** No comment,
   decision entry or test records a view either way.
7. **Whether `clearExerciseSlotDefault` is dead or merely unreferenced from
   the paths I searched.** Grep over `src/` (excluding tests) found no
   caller; I did not audit dynamic `require` strings exhaustively.
8. **Whether any pre-C31 device holds an `avoided_block` row scoped to a
   long-finished mesocycle.** Such rows are never cleaned up (kind 2, §13.1)
   — they are simply read as dead. Row counts unknown.
9. **Test suite status.** `npm run lint && npm test` was not run (read-only
   remit). All statements about tests are from source reading, not from
   execution.
