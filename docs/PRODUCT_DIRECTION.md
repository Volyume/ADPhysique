# Volyume — Product Direction

This document records deferred features and their intended design. It is the authoritative source for how deferred capabilities should be built when they are eventually implemented.

> **Status 2026-05-25:** "deferred" categories here predate the Volyume
> Complete strategy (2026-05-23) and the 2-tier consolidation override
> (2026-05-25). Food logging is no longer deferred (shipped as Move #1
> + #1.5). The Complete tier is no longer planned (override 3, 2-tier
> model). For the canonical current scope, see `CURRENT_STATUS.md`
> section 7 and `BACKLOG.md`. This doc still applies to the truly
> still-deferred features (recipe URL importer, body composition deep
> charts, share-pack PDF, etc.).

---

## Phase 1.5 Scope Summary

**In scope (current build):**
- Working Set / Warm-up Set logging — weight, reps, set type only
- Drop Set as a selectable set type (counts as one working set)
- Volume tracking: working sets by muscle group
- Two seeded sample routines ([SAMPLE] Day 1, Day 2)
- Session Logged summary with working set count and muscle volume
- Routine start: exercises load in order, sets log per exercise

**Deferred to Phase 2 or later:**
- Supersets (full model below)
- RIR / RPE per-set effort tracking
- AMRAP, rest-pause, myo-reps set types
- Mesocycle builder
- Cloud sync (Supabase)
- Body metrics tracking
- PR Wall

---

## Supersets — Deferred to Phase 2

### Decision

Full superset support is deferred from Phase 1.5. The active workout navigation flow, Zustand state shape, DB schema, and routine builder UI all require changes that are too large to implement safely without risking existing routine start and persistence behaviour.

This document records the intended model so implementation is consistent when it is built.

### Why Deferred

1. **DB schema migration required.** `routine_exercises` needs `superset_group_id` and `superset_order` columns. Existing seeded routines and user-created routines do not have these. Adding them requires a safe migration.

2. **Active workout flow is fundamentally different.** The current flow is linear: log all sets on exercise A, tap Next Exercise, move to B. A superset flow is: A1 → A2 → A3 → rest → A1 round 2 → A2 round 2... This requires tracking superset group, position within group, and current round — replacing the current `currentExerciseIndex` model.

3. **Zustand state shape needs restructuring.** `workoutExercises` is currently a flat array of `{ exercise, routineExercise, sets }`. Supersets require grouping: `[{ type: 'superset', groupId, exercises: [...], rounds }, { type: 'single', exercise, ... }]`.

4. **Routine builder needs multi-select mode.** Currently exercises are added one at a time. Supersets require selecting 2+ exercises simultaneously and confirming the group.

---

### User-Facing Language

| Concept | User-Facing Term | Not This |
|---|---|---|
| Grouped exercises | Superset | Linked Exercises, Linked Set Group, Exercise Block |
| Individual exercise in group | A1 / A2 / A3 | Exercise 1, Slot 1 |
| Completing one pass through | Round | Set, Cycle |

Superset description copy:
> "Link two or more exercises so they flow together during your workout."

---

### Data Model

#### `routine_exercises` additions

```sql
superset_group_id TEXT,   -- UUID shared by all exercises in the same superset
superset_order    INTEGER  -- position within the superset (1, 2, 3...)
```

Exercises without a `superset_group_id` are standalone (current behaviour unchanged).

#### `workout_sets` — no changes needed

Each set already belongs to one exercise. Superset grouping is a routing concern, not a volume concern. `set_type` remains `straight` or `warmup` or `dropset` for superset sets — the superset membership is inferred from the routine structure during the active workout.

#### Zustand `workoutExercises` shape (Phase 2)

```js
[
  {
    type: 'single',
    exercise: { ... },
    routineExercise: { ... },
    sets: [],
  },
  {
    type: 'superset',
    groupId: 'abc123',
    rounds: 4,               // total rounds to complete
    currentRound: 1,
    restAfterRound: true,    // rest after full round (vs. after each exercise)
    exercises: [
      { label: 'A1', exercise: { ... }, routineExercise: { ... }, sets: [] },
      { label: 'A2', exercise: { ... }, routineExercise: { ... }, sets: [] },
      { label: 'A3', exercise: { ... }, routineExercise: { ... }, sets: [] },
    ],
  },
]
```

---

### Routine Builder UX (Phase 2)

1. User taps the multi-select toggle (or long-presses an exercise).
2. Tapping exercises selects them (checkboxes shown).
3. Floating action bar appears with "Create Superset" when 2+ exercises are selected.
4. Tapping "Create Superset" groups them. Exercises re-display as A1, A2, A3 in their group.
5. User can set:
   - **Rounds** — how many times to cycle through all exercises in the superset
   - **Rest timing** — "Rest after each exercise" vs. "Rest after full round"
6. Superset group can be broken apart by tapping "Edit Superset" → "Unlink".

---

### Active Workout Flow (Phase 2)

When the user reaches a superset group:

```
[Header shows: Superset — Round 1 of 4]

A1  Cuffed Cable Lateral — Low Pulley
    Weight / Reps / Set type
    [COMPLETE SET]

→ auto-advances to A2

A2  Cuffed Cable Lateral — Mid Pulley
    Weight / Reps / Set type
    [COMPLETE SET]

→ auto-advances to A3

A3  Cuffed Cable Lateral — High Pulley
    Weight / Reps / Set type
    [COMPLETE SET]

→ rest timer fires (because restAfterRound = true)

[Round 1 complete. Rest. Then Round 2 starts.]

A1  Cuffed Cable Lateral — Low Pulley — Round 2
```

The "Next Exercise" tap at the end of a superset advances to the next item in `workoutExercises` (which may be another superset or a standalone exercise).

---

### Volume Counting

Superset grouping does **not** affect volume maths.

Each completed working set counts toward the weekly volume of the exercise it belongs to, exactly as if it were a standalone exercise.

- A1 (lateral raise): counts as 1 working set for Lateral Delts
- A2 (lateral raise variation): counts as 1 working set for Lateral Delts
- A3 (lateral raise variation): counts as 1 working set for Lateral Delts

No multiplier, no reduction, no shared volume pool. Volume logic reads only `setType !== 'warmup'`.

---

### Drop Sets — Phase 1.5

Drop sets are available in Phase 1.5 as a simple set type option in the picker.

- User selects "Drop Set" from the set type sheet.
- Drop set counts as one working set (no volume weighting).
- Future advanced mode may add fractional volume weighting (e.g. 0.5 sets) but this is not required now.
- The DB stores `set_type = 'dropset'`. The `isHardSet` / working-set check treats this the same as `straight`.

---

## Terminology Reference

| Concept | Phase 1.5 | Phase 2+ |
|---|---|---|
| Main logged sets | Working Sets | Working Sets |
| Preparation sets | Warm-up Sets | Warm-up Sets |
| Reduced-load sets | Drop Sets | Drop Sets |
| Volume measure | Weekly Working Sets | Weekly Working Sets |
| Grouped exercises | (deferred) | Superset |
| Effort input | (deferred) | RIR / RPE (Advanced mode only) |
