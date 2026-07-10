> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. June 2026 next-session note; both its tasks are long done and it points at the now-stale CURRENT_STATUS.md. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Next-session handoff — ready-to-execute tasks

> **SUPERSEDED (2026-06-10).** This file is a 2026-06-02 record; both tasks
> below are long DONE. For the actual current state and the live next-session
> action (trigger iOS build 15 from `claude/main-branch-content-update-dcqicf`),
> read **`docs/CURRENT_STATUS.md`** (2026-06-10 entry). Do not treat the tasks
> below as outstanding.
>
> STATUS 2026-06-03: both tasks below are DONE. Kept here as the record of
> what changed and why (the locked-doc reconciliation in particular).
>
> - TASK 1 landed in commit `cc9b6c0` "refactor(exercises): retire dead local
>   custom_exercises mirror". Reconciliation recorded in
>   `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md` § Reconciliations (2026-06-03).
> - TASK 2 landed in `e6d715d` (shared component + ManualBuilder) and `7ade3f8`
>   (ActiveWorkout). All three screens now use
>   `src/components/ExercisePickerModal`. ~563 net lines removed.
>
> Full suite (155 suites, 2577 tests), lint (0 errors), and typecheck were
> green after each step.

Written 2026-06-02 at the end of a long session, to be picked up cold. Both
tasks below are fully scoped with file:line anchors, steps, constraints, and
verification. Re-grep the anchors first (line numbers drift).

Branch: work on `main` (per CLAUDE.md Rule 9) unless told otherwise. Run the
Rule 1 repo-validation check before coding.

---

## TASK 1 — Retire the dead `custom_exercises` local subsystem (audit ISSUE-006 cluster)

### Why this is safe now
The app represents custom exercises in the local **`exercises`** table
(`is_custom=1`): created with `insertExercise({isCustom:1})`, displayed via
`getAllExercises()`, resolved by id via `LEFT JOIN exercises` (routines),
`SELECT ... FROM exercises` (workout_sets), `getExerciseById`. The parallel
local **`custom_exercises`** table is orphaned — nothing reads it for display
or id-resolution.

This session fixed the cloud restore (`sync.js:_pullCustomExercises`) to land
pulled customs in `exercises` (is_custom=1) instead of the orphaned table, so
the local `custom_exercises` subsystem is now **fully dead**: nothing writes it
(UI creates in `exercises`; pull restores to `exercises`) and nothing reads it
for display.

### LOCKED-DOC RECONCILIATION (do this first — mandatory)
This code sits under `database.js` comment `// ─── Custom exercises (locked
split, IDENTITY_AND_OWNERSHIP_LOCKED.md)` and writes a `user_id` column.
`docs/IDENTITY_AND_OWNERSHIP_LOCKED.md` requires reconciliation before any
change here. Reconciliation argument to verify and record in the PR/commit:
- The locked split (migration 020/021) exists for **CLOUD** composite-PK
  correctness so two users' custom exercises can't collide cloud-side. **That
  stays untouched:** the cloud `custom_exercises` table + composite PK remain,
  and `syncExercises` (sync.js:200, filters `e.isCustom` at 213, upserts to
  cloud `custom_exercises` at 235) still pushes customs to the cloud.
- Only the **local** parallel mirror + its JS accessors are being retired, in
  favour of the local `exercises.isCustom` model the whole app already uses.
  Local SQLite is single-user (sign-out wipes it), so there is no local
  composite-PK concern. No `UPDATE ... SET user_id` is introduced.
- If that argument holds (re-verify), removal is compliant. If unsure, stop and
  ask the founder.

### Dead code to remove (verified zero callers/tests as of 2026-06-02)
1. `src/lib/database.js` — remove these exported fns + the section comment
   `~5400-5406` ("Custom exercises (locked split…)"):
   - `insertCustomExercise` (~5407)
   - `updateCustomExercise` (~5434)
   - `deleteCustomExercise` (~5467)
   - `getCustomExercisesForUser` (~5480)
   - `getCustomExerciseById` (~5492)
   - `getAllExercisesForUser` (~5509)
   - `insertOrUpdateCustomExerciseFromCloud` (search it) — now only referenced
     by the contract test's negative assertion; safe to remove.
2. `src/lib/sync.js` — the redundant push path (cloud push of customs is already
   covered by `syncExercises`):
   - Remove the call `await _pushCustomExercises(...)` at **sync.js:605**
     (inside `bulkUploadLocalData`).
   - Remove `_pushCustomExercises` (sync.js:856–~903).
   - Remove the `getAllCustomExercisesSince` import (sync.js:30) and the
     `database.js` function if it has no other callers (grep first).
3. `src/lib/__tests__/customExerciseSync.contract.test.js` — keep tests 1 & 3
   (restore-into-exercises, skip-deleted). Test 2 asserts
   `insertOrUpdateCustomExerciseFromCloud` is NOT used in `_pullCustomExercises`;
   once that function is deleted, either keep the assertion (still true) or
   retarget it to assert the orphaned path is gone entirely.

### Leave in place
- The local `custom_exercises` **table schema** (`database.js` CREATE TABLE
  ~990) and the **cloud** `custom_exercises` table. Dropping a table needs a
  migration tracked in `supabase/README.md`; the empty local table is harmless.
  Optionally add a migration to drop the cloud table ONLY if you also stop
  `syncExercises` pushing to it — but simplest is to leave both.
  NOTE: `syncExercises` still upserts customs to cloud `custom_exercises` (235),
  so that table is NOT dead cloud-side. Do not remove it.

### Verify
- `grep -rnE "insertCustomExercise|getCustomExercisesForUser|getAllExercisesForUser|getCustomExerciseById|updateCustomExercise|deleteCustomExercise|_pushCustomExercises|insertOrUpdateCustomExerciseFromCloud" src` → only definitions you're deleting / intended refs.
- `npm run lint` (0 errors), `npx jest` (full suite green), `npm run typecheck`.
- Confirm `customExerciseSync.contract.test.js` still passes.

### Risk: Low (verified dead), but locked-adjacent — reconcile first, test fully.

---

## TASK 2 — Consolidate the three exercise pickers onto the shared component

### Current state
A shared picker now exists: **`src/components/ExercisePickerModal.js`**
(props: `visible`, `onClose`, `onSelect`, `saveLabel`; browse incl. custom via
`getAllExercises`, always-visible "Create '{query}' as custom exercise"). It is
used by `RoutineDetailScreen` (add + swap). Two duplicates remain:
- `src/screens/ManualBuilderScreen.js:37` — inline `ExercisePickerModal`
  (+ picker styles ~964–1110, constants `PICKER_MUSCLES`/`PICKER_EQUIPMENT`
  ~32–33). Used at ~606.
- `src/screens/ActiveWorkoutScreen.js:2114` — local `ExercisePickerModal`
  (prop `actionLabel`, used for add AND swap via `pickerMode`). Used at ~1182
  and ~1767.

### Steps
1. **Prop parity first.** Add an `actionLabel` alias to the shared component
   (or standardise on one name and update RoutineDetail's two call sites which
   pass `saveLabel`). The create-form save button currently uses `saveLabel`.
2. **ManualBuilder (lower risk — plan builder, not live):**
   - Import the shared component; pass `saveLabel="Add to plan"` to the
     instance at ~606 (it already passes visible/onSelect/onClose).
   - Delete the inline `ExercisePickerModal` (37–229), the picker-only styles
     (verify each is unused elsewhere before deleting — `pickerSafe`,
     `pickerHeader`, `pickerSearch`, `pickerClose`, `pickerList`, `pickerRow*`,
     `pickerEx*`, `pickerMuscle`, `pickerEmpty*`, `separator`, `createNew*`,
     `createTitle`, `createContent`, `createNameInput`, `createLabel`, `chip*`,
     `createSave*`), the `PICKER_MUSCLES`/`PICKER_EQUIPMENT` consts, and any
     now-unused imports (`Modal`, `KeyboardAvoidingView`, `FlatList`, etc. —
     only if not used elsewhere in the file).
3. **ActiveWorkout (HIGH RISK — live set logging):**
   - Its local picker is used for add AND swap (`pickerMode`), with
     `actionLabel`. The swap flow excludes already-in-workout exercises
     (`handleOpenSwap` ~299, `excludeIds`/`alreadyInWorkout`) — that exclusion
     is done in the swap-candidate ranking, but confirm the full-library picker
     path doesn't need it. Preserve `handlePickerSelect` routing (add vs swap).
   - Replace the local picker with the shared one only after confirming prop
     parity AND that the swap-from-full-library path behaves identically.
     The shared component already has the always-visible create footer that
     ActiveWorkout's local one has, so discoverability is preserved.
   - Do NOT regress live logging. Test the swap flow specifically.

### Benefit
Removes ~380 lines of duplicated picker code; one consistent, discoverable
picker everywhere.

### Verify
- `npx jest` (full suite), `npm run lint`, `npm run typecheck`.
- Manual device check: add + swap in ManualBuilder, RoutineDetail, and
  ActiveWorkout; create-when-not-found works; created exercise persists and is
  usable; ActiveWorkout swap still excludes already-in-workout exercises.

### Risk: ManualBuilder = Medium, ActiveWorkout = High (live logging). Land
ManualBuilder first as its own commit; do ActiveWorkout separately with care.

---

## Context pointers
- Full audit: `volyume-claude-audit-2026-06-02.md` (Parts 1, 3, 4, 6 + Part 2
  start; findings ISSUE-001..009).
- The custom-exercise round-trip fix (this session) is the reason Task 1 is now
  safe — see commit "fix(sync): custom exercises now survive reinstall visibly".
