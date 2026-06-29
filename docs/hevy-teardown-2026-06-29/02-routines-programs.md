# Hevy Teardown — 02: Routines, Programs, Folders & Templates

Competitive teardown of **Hevy (RN/Hermes v3.1.0)** against **Volyume**, scoped to
routine building/editing, organisation (folders, reordering), multi-week programs and
progression, duplication, supersets, and per-exercise rest defaults.

Evidence is from the decompiled Hevy bundle corpus at
`scratchpad/corpus/` (Hermes packs strings — some tokens are merged at boundaries, so
copy is corroborated across `bundle_strings.txt`, `screens_components.txt`,
`events_keys.txt`, `routes_hosts.txt`). **No Hevy code or assets are copied** — only
behaviour is described, and recommendations are Volyume-native.

---

## Routines & Programs — Hevy vs Volyume

### How Hevy does it (evidence)

**Routine builder & editing**
- Dedicated screens: `CreateRoutineScreen`, `CreateRoutineStack`, `EditRoutinePress`,
  `RoutineDetailScreen`, `RoutineActionSheet`, `showCreateRoutineModal`
  (`screens_components.txt:727,728,521,522`). A routine = ordered exercises with set
  rows.
- **Set types per row:** "warm up, normal, failure and drop set" and "Is a Warmup set" /
  "Is a failure set" (`bundle_strings.txt` set-type group). Warm-up sets can be
  included/excluded from stats ("Warm-up sets are now excluded from your workout stats").
- **RPE per set:** "Enabling RPE tracking will allow you to log it for [each set]",
  "Train to an RPE of …" — opt-in per-set RPE field.
- **Warmup Calculator:** `WarmupCalculatorModal`, `WarmupCalculatorSettings`,
  `isWarmupCalculatorAvailable` — auto-suggests warm-up set loads for an exercise.
- **Routine notes:** `routineNotes` (65 occurrences) — free-text per routine, plus
  per-exercise notes.

**Supersets in the builder**
- `AddToSupersetPress`, `RemoveFromSupersetPress`, `addSupersetCell`, `supersetId`,
  `supersetIndicatorCell` with `getGradientColorsuperset` (colour-coded group bands).
- During a logged workout: **"smart superset scrolling"** (`setSupersetScrollingEnabled`,
  `calculateNextIncompleteSetInSuperset`) auto-advances between superset members.
- "SuperSet as Next Workout" — superset state survives into the program's next-workout.

**Reordering & drag**
- `ReorderableListBodyTsx`, `ReorderableListItemTsx`, `DraggableFlatlist`,
  `ReorderExercisesScreen/Stack` — **true drag-to-reorder** of exercises.
- Copy: "Toque y arrastre para reorganizar" / "Press a routine to reorder" /
  "Reorder Workouts will only be visible to you and your followers."
- `ReorderFoldersScreen`, `ReorderFoldersModal`, `updateFolderOrder`,
  `handleCellReorderEdgeCases` — folders themselves are reorderable.

**Folders (routine organisation)**
- `FoldersScreen`, `FolderScreen`, `FolderModal`, `SelectFolderOverlay`,
  `SelectFolderModalViewModel`, `CreateRoutineInFolderPress`, `collapseFolder`,
  `collapsedFoldersId`.
- Lifecycle copy: "Create New Folder", "Rename Folder", "Delete Folder", "Failed to
  create/rename/delete folder", "Deleting this folder will move all its routines into
  the [default]".
- **Shareable folders:** "Share Folder", "check out my routine folder on Hevy",
  `shareableRoutineFolder` — a folder of routines is a social share unit.

**Multi-week programs (the "Hevy Trainer / Hevy Coach" product)**
- This is Hevy's paid generated-program engine. Screens: `programDetailsScreen`,
  `ProgramSettingsScreen`, `ProgramFiltersModal`, `PreparingProgramScreen`,
  `ProgramWorkoutsScreen`, `ModifyProgramScreen`, `ScienceBehindProgramScreen`.
- **Generation from inputs:** "Personalise programs based on your preferences and goals",
  "based program generated based on your goals and preferences", "Choose how many days
  per week you would like to train". Re-generation: "A new program will be generated
  based on your updated days per week / goal. Your exercise progression suggestions will
  be reset."
- **Weekly progression & sequencing:** `hevyTrainer.program.weekNumber.label`,
  "Aim for steady progression", `weightSuggestion.weightAdjustedTo`,
  `calculateProgressionLabel`, "use your best sets from previous weeks…". Progress
  reports: `progressReport.overview.weeklyGoal`, `weeklyCongrats.exercisePage.progression`.
- **Next-workout pointer:** `next_workout_index` equivalent — "Modify Next Workout",
  "Share Next Workout", "SuperSet as Next Workout", "Reset your next workout" — the
  program walks you through routines in order.
- **Program lifecycle:** "Preparing program…", "Remake My Program", "Restart Program",
  "Failed to restart program", `deleteProgramModal`, `restartProgramModal`,
  `programQualityWarning` ("select more equipment"), "reuse allowed in program".
- **Note:** Hevy Trainer is an *AI/served* generator (`app.hevycoach.com`,
  `https://chatgpt.com` host present). Volyume's coaching engine is deliberately
  deterministic — see Gaps for why we do NOT copy this verbatim.

**Gating**
- Routine **count** is Pro-gated: "Upgrade to Hevy Pro to create unlimited routines",
  "Routines are limited to [N]". Folders are free.

### How Volyume does it today (file:line)

**Builder & editing**
- `src/screens/ManualBuilderScreen.js` — two-page manual builder: name+goal+days, then
  day cards with exercises; live `PlanBalanceCard` (RP volume landmarks, `:75`),
  exercise remove with Undo toast (`:229`).
- `src/screens/RoutineDetailScreen.js` — per-exercise edit of sets/reps/**rest**
  (`editRest` `:94,160,174`), exercise swap/replace (`:199`).
- Auto-generation: `src/lib/planEngine.js` + `src/lib/planAutoGen.js` — **deterministic**
  goal-aware generator (RP/Israetel landmarks, split selection upper/lower/full-body,
  `:1164–1238`).

**Supersets** — EXISTS (full)
- Column `superset_group_id TEXT` on `routine_exercises`
  (`src/lib/database.js:305`; cloud `supabase/migrate_010_sync_completeness.sql:39`).
- `addExerciseToRoutine(..., supersetGroupId)` persists it (`src/lib/database.js:2394`).
- Engine auto-pairs antagonists, gated (no beginners; hypertrophy/physique or <50min);
  invariants in `src/lib/__tests__/supersets.test.js` (29 assertions).
- Read in `RoutineDetailScreen.js:263`. **No builder UI to create/edit a superset
  manually** — only the engine assigns them.

**Per-exercise rest** — EXISTS (full)
- `rest_seconds INTEGER` (`src/lib/database.js:304`); edited in `RoutineDetailScreen.js`;
  engine defaults `REST_SEC` by parameter type (heavy_compound 180s … isolation 75s,
  `src/lib/planEngine.js:~633`).

**Reordering** — PARTIAL (exercises only, no drag)
- Up/down arrow buttons via `isReordering` state + `updateRoutineExerciseOrder`
  (`RoutineDetailScreen.js:99,215–236`; `src/lib/database.js:2522`,
  `order_in_routine`).
- **No reordering of routines/days within a plan.**

**Duplication** — EXISTS (full)
- `duplicateRoutine` (`src/lib/database.js:2488`), `duplicatePlan` ("Copy of {name}",
  `:2705`), `copyRoutineFromLibrary` (`:2331`), `copyPlanFromLibrary` (`:2637`).

**Multi-week programs / progression** — EXISTS (and arguably deeper than Hevy)
- Mesocycle model: `mesocycles` (`duration_weeks, deload_week, block_type, planned_weeks,
  rir_ladder, auto_regulation_enabled, status`, `src/lib/database.js:179–404`) +
  `mesocycle_weeks` (`week_index, is_deload, rir_target`, `:364`).
- `generateMesocycleWeeks` scaffolds weeks from an RIR ladder e.g. `[3,2,1,0,4]`
  (`src/lib/database.js:2798`); `predictDeloadWeek` / `evaluateAutoReg`
  (`src/lib/mesocycle.js`, used in `MesocycleBuilderScreen.js:21,114`).
- `MesocycleBuilderScreen.js` — per-week tonnage bars, "Week X of Y", deload highlight
  (`:79–98,171–189`).
- `programmes.next_workout_index` column EXISTS (`src/lib/database.js` v1 ext) — the
  next-workout pointer is modelled but lightly surfaced.

**Folders** — ABSENT
- No `folder_id` / folder table anywhere in schema or UI. `PlanLibraryScreen.js` is a
  curated, quiz-driven library (`:372,622`), not user folders.

**Community / sharing** — ABSENT
- Only a system `is_library` curated library (`src/lib/database.js:308`,
  `seedRoutines.js`). No user-to-user share, public link, or shareable folder.

**Templates**
- `routines.is_template` column EXISTS (`src/lib/database.js` v13 `:494`) and
  `is_sample`/`source_routine_id` lineage exists, but there is no first-class "save as
  template" / "start from template" UX distinct from duplicate.

### Gaps

1. **No folders to organise routines (ABSENT).** Hevy gives every user collapsible,
   reorderable, *shareable* folders; Volyume has a flat plan/routine list. As a user
   accumulates plans + ad-hoc routines this becomes the single biggest organisation gap.
2. **No drag-to-reorder, and no reordering of routines/days within a plan (PARTIAL).**
   Volyume only has up/down arrows on exercises inside one routine. Hevy has true
   `DraggableFlatlist` everywhere (exercises, routines, folders). Arrow-tapping a 10-row
   routine is painful.
3. **No manual superset builder UI (PARTIAL).** The data model and engine support
   supersets fully, but a user cannot *create or edit* a superset by hand in
   `RoutineDetailScreen`/`ManualBuilderScreen`. Hevy's Add/Remove-from-Superset with a
   coloured group band is a core builder interaction we can't match today.

Secondary gaps (lower urgency): no per-set type rows (warm-up/drop/failure) in the
*builder* (Volyume tracks these at log time, not as planned set rows); no warmup-load
calculator; no first-class "save as template / start from template" flow; the modelled
`next_workout_index` program-sequencing pointer is under-surfaced vs Hevy's "Modify Next
Workout".

### Recommendations (adopt / adapt, effort, priority)

| # | Recommendation | Adopt/Adapt | Effort | Priority | Why |
|---|----------------|-------------|--------|----------|-----|
| R1 | **Routine/plan folders** — add a `folders` table (`id,user_id,name,sort_order`) + nullable `folder_id` on programmes/routines; collapsible sections on the plans screen; "move to folder". | Adapt | M | **P1** | Biggest organisation gap; pure-local, offline-first, no engine/billing/safety touch. Folders stay **free** (organisation of a free feature). Skip Hevy's *social* folder-sharing for now. |
| R2 | **Drag-to-reorder** exercises (replace arrow buttons) and **reorder routines/days within a plan**. Use an Expo-compatible draggable list (e.g. `react-native-draggable-flatlist`) — **propose dependency, await approval per CLAUDE.md**. | Adapt | M | **P1** | Removes the most-felt builder friction; reorder of routines-in-plan is currently impossible. `order_in_routine` already exists; plan-level needs a sort column. |
| R3 | **Manual superset builder UI** — "Add to superset / Remove" + a coloured group indicator in `RoutineDetailScreen`, writing the existing `superset_group_id`. | Adapt | S–M | **P1** | Highest value-per-effort: data + engine + tests already exist; only the editing UI is missing. Pro feature (training builder superset editing sits under Pro coaching surfaces — confirm gating). |
| R4 | **Surface the program "next workout" pointer** — show "Next: {routine}" on Home and let the user re-order/skip the next workout within an active plan (uses existing `next_workout_index`). | Adapt | M | **P2** | Modelled but invisible; turns a static plan into a guided sequence. Stays deterministic — no AI. |
| R5 | **First-class templates** — "Save routine as template" + "Start from template" using existing `is_template` lineage, distinct from raw duplicate. | Adapt | S | **P2** | Cheap, leverages existing column; clarifies the duplicate-vs-reuse story. |
| R6 | **Planned set-type rows** (warm-up / working / drop) and an optional **warm-up load helper** in the builder. | Adapt | M–L | **P3** | Nice-to-have; Volyume already captures set types at log time. Warm-up *calculator* is a larger, lower-priority build. |
| R7 | **Do NOT copy Hevy Trainer's served/AI program generator.** Keep Volyume's deterministic `planEngine`/mesocycle progression; if "remake my program from updated goal/days" is wanted, build it on the deterministic engine only. | Reject-as-copied | — | **P3** | CLAUDE.md sacred rule: coaching engine is deterministic, no LLM. Hevy Trainer is AI-served; adopting its *output style* (weekly progression labels, progress report) is fine, its *method* is not. |

### Quick wins

- **R3 (manual superset UI)** — the model, engine and invariant tests already exist;
  this is mostly view work on `superset_group_id`. Highest ROI.
- **R5 (save-as-template)** — `is_template` column already present; small flow + button.
- **Surface routine count / "limit" messaging cleanly** if/when routines become
  count-gated — Hevy's "Routines are limited to N" pattern is a clean upsell; verify
  against Volyume's free/Pro matrix before adding (routine building is FREE in Volyume,
  so do **not** gate count without founder sign-off).
- **Reorder-affordance copy** — even before full drag, a one-line "Tap Reorder, then use
  arrows" hint closes the discoverability gap cheaply.
