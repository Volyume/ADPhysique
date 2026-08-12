# Exercise selection: how it actually works

Campaign 9, Work 1. Traced against the code at `2177030e`, not from memory.
Every claim carries a `file:line`. This is an implementation note, not an
audit report: it exists so the canonical intent layer has one accurate map
to sit on top of.

---

## 1. The surfaces that choose an exercise

| # | Surface | File | What it writes |
|---|---------|------|----------------|
| 1 | In-workout swap | `src/screens/ActiveWorkoutScreen.js:805` (`handleOpenSwap`), `:813` (`handleConfirmSwap`) | **Nothing durable.** Store only (`:843`). The sheet says so: "Your plan is not changed" (`:4124`) |
| 2 | Plan/routine swap | `src/screens/RoutineDetailScreen.js:287`, `:304` | `routine_exercises.exercise_id` via `updateRoutineExerciseExercise` (`src/lib/database.js:3624`) |
| 3 | Broken-link re-link | `src/screens/RoutineDetailScreen.js:493-510` | Same write. Bypasses ranking entirely (`:506`) |
| 4 | Exercise picker (shared) | `src/components/ExercisePickerModal.js` | Nothing; returns a selection to its caller |
| 5 | Ad-hoc session builder | `src/screens/BuildWorkoutScreen.js:67` | Nothing durable; in-memory list handed to `startWorkout` (`:172`) |
| 6 | Routine editor | `src/screens/RoutineDetailScreen.js:248` | `addExerciseToRoutine` (`src/lib/database.js:3571`) |
| 7 | Plan builder | `src/screens/ManualBuilderScreen.js:390`, persisted at `:724` (`persistDays`) | Clear-and-reinsert of every `routine_exercises` row (`:749`, `:762`) |
| 8 | Initial generation | `src/lib/planAutoGen.js:123` (`generateAndSavePlan`) | `addExerciseToRoutine` per chosen exercise (`:189`) |

**There is no block-level exercise builder.** A block is muscle-level only:
`activatePlanWithBlock` (`src/lib/database.js:3780`) writes `mesocycles`,
`mesocycle_weeks` and `planned_muscle_volume` and never touches `routines`
or `routine_exercises`. `MesocycleBuilderScreen.js` is read-only.

**Next-block carry-forward does not exist as a copy.** Repeat and Continue
with adjustments both re-activate the *same* `programmes` row
(`src/screens/PlansScreen.js:434`, passing `activePlan.id`). The user
therefore trains the identical `routine_exercises` rows; only weekly
per-muscle set targets differ. So "an excluded exercise carrying forward
into a new block" is really "an excluded exercise still sitting in the plan
the user is about to run again" — which is why the conflict is surfaced at
the plan, not at the block.

---

## 2. How candidates are ordered today

`src/lib/swapEngine.js` is the only ranking engine in the app. There is **no
substitution table, no alternatives table and no compatibility matrix**
anywhere in `src/`, `supabase/` or the local schema.

`rankSwaps(original, all, opts)` (`src/lib/swapEngine.js:195`) filters, scores
and sorts. `scoreCandidate` (`:37`) is additive and structural:

| Term | Points |
|---|---|
| same primary muscle | 40 |
| same subregion (within the same primary muscle) | 25 |
| same movement pattern | 20 |
| same equipment | 15 |
| same compound/isolation | 10 |
| fatigue cost within ±1 | 10 |
| stimulus-to-fatigue within ±1 | 10 |

Sort is score-descending with **alphabetical only as a tie-break**
(`:226`).

**Correction to a common assumption:** the swap sheet was never
alphabetical-first. What *is* alphabetical is (a) the shared picker, which
reads `getAllExercises()` — `ORDER BY name ASC` (`src/lib/database.js:2429`)
— and returns it unchanged for an empty query
(`src/lib/exerciseFuzzySearch.js:147`), and (b) the broken-link re-link list
(`src/screens/RoutineDetailScreen.js:506`). Campaign 9 therefore *adds a
personal layer on top of* the structural score rather than replacing an
alphabetical sort that did not exist.

Selection inside the generator is a separate mechanism:
`selectExercisesForMuscle` (`src/lib/planEngine.js:1216`) filters a pool by
equipment (hard, `:1135`), difficulty, assisted-lift name, and subregion
coverage, then sorts by `sortScore` (`:1264`). Pool built by
`generatePoolFromLibrary` (`src/lib/poolGenerator.js:138`).

---

## 3. Exercise identity — the thing durable intent is keyed to

- `exercises` table: `src/lib/database.js:195-213`.
- Catalogue ids are **deterministic hashes of the canonical name**:
  `canonicalExerciseId(name)` (`src/lib/seedExercises.js:45`). Stable across
  installs *while the name is unchanged*; a rename mints a new id.
- Custom exercises get a random `uid()` (`src/lib/database.js:2449`).
- **Ids are rewritable at sync time.** `_pullExercises`
  (`src/lib/sync.js:1797`, rule documented `:1779-1795`) remaps local ids to
  cloud ids when the *names* match but the ids differ, rewriting references
  in `routine_exercises`, `workout_sets`, `exercise_user_notes` and
  `exercise_goals`.

**Consequence, and the single most important constraint on this campaign:**
any new per-exercise table must join that remap list or a cross-device id
collision orphans every exclusion the user ever set.

---

## 4. Existing per-user, per-exercise state

Only two tables existed before Campaign 9, and neither expresses preference:

- `exercise_user_notes` — `src/lib/database.js:590`; syncs via the legacy
  path (push `src/lib/sync.js:1098`, pull `:1847`).
- `exercise_goals` — `src/lib/database.js:625`; push `:1192`, pull `:1898`.

Neither is in `SYNC_REGISTRY` (`src/lib/sync/registry.js`), which carries no
exercise-domain table at all. **There were no favourites, no hidden flag, no
exclusions and no preference of any kind.** Campaign 9's three tables follow
the `exercise_user_notes` precedent, not the registry.

Usage data available for evidence, without inventing anything:

- `getRecentlyUsedExerciseIds(userId, limit)` — `src/lib/database.js:2906`.
  Recency only; discards its own `MAX(started_at)` and returns bare ids.
- e1RM eligibility — `isE1rmEligibleRow` (`src/lib/algorithms.js:625`), the
  single shared rule (warm-ups, myo-reps and rest-pause excluded).
- `detectPR` (`src/lib/algorithms.js:630`), `detectPlateau` (`:1339`).

There is **no per-exercise session counter** anywhere in the app; Campaign 9
adds `getExerciseUsageStats` for it (count + last-trained, nothing more).

---

## 5. Where the canonical layer sits

`src/lib/exercise/intent.js` is the one place that decides. Every surface
above loads state once and asks pure questions of it:

```
loadExerciseIntentState(userId, { activeMesocycleId })
  ├── isEligible / isExcluded / isAvoidedThisBlock   → may this be suggested?
  ├── approvedDefaultFor(from, routineId)            → explicit user default
  ├── swapEvidenceFor(from) / previouslyUsedBefore   → what they actually chose
  ├── exerciseEvidence(id)                           → named dimensions, never a score
  └── rankPersonalised(candidates, ctx)              → re-order inside the structural list
```

Two properties are structural, not conventions:

1. **The module never writes.** Its import block pulls readers only, so
   ranking an exercise highly cannot make it look more preferred next time.
   Only a real user action (`recordExerciseSwap`) creates evidence.
2. **It cannot introduce a candidate.** `rankPersonalised` re-orders the
   list `swapEngine` already judged structurally suitable, so personal
   history can never promote an unsuitable exercise.

Block-scoped avoidance expires by comparing `scope_mesocycle_id` against the
current block id — no calendar duration is invented anywhere.
