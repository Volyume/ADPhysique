# Sync architecture evidence pack (P10 input)

Date: 2026-07-02. Branch: `claude/codebase-audit-docs-pv6mjd` (HEAD db57532).
Purpose: raw evidence for the P10 sync-architecture memo. Inventories and
facts only; no options analysis, no recommendation. Every claim carries a
file:line reference or a command result. Related source plan:
`docs/f5-legacy-sync-plan-2026-07-02.md` (F5 Phase A shipped; Phase B blocked
on founder-agreed mitigations, see its section 2).

---

## 1. Registry inventory (the new path)

Source of truth: `src/lib/sync/registry.js` (SYNC_REGISTRY, lines 22-228).
21 entries. Strategies defined at registry.js:9-16 (last_write_wins,
server_wins for pull_only, merge for profiles only). Soft-delete semantics at
registry.js:18-19.

| # | Table | PK | Strategy | Soft delete | Direction | Registry lines |
|---|-------|----|----------|-------------|-----------|----------------|
| 1 | weekly_checkins_v2 | id | last_write_wins | no | bidirectional | 23-30 |
| 2 | weight_log | id | last_write_wins | no | bidirectional | 31-38 |
| 3 | food_entries | id | last_write_wins | yes | bidirectional | 39-46 |
| 4 | custom_foods | id | last_write_wins | yes | bidirectional | 47-54 |
| 5 | saved_meals | id | last_write_wins | yes | bidirectional | 55-62 |
| 6 | recipes | id | last_write_wins | yes | bidirectional | 63-70 |
| 7 | recipe_ingredients | id | last_write_wins | yes | bidirectional | 71-78 |
| 8 | food_favourites | (user_id, food_ref) | last_write_wins | yes (D1-#8, mig 090) | bidirectional | 79-88 |
| 9 | daily_water | (user_id, entry_date) | last_write_wins | yes (D1-#8, mig 090) | bidirectional | 89-98 |
| 10 | daily_intake_rollups | (user_id, entry_date) | server_wins | no | pull_only | 99-106 |
| 11 | daily_steps | (user_id, entry_date) | last_write_wins | no | bidirectional | 107-117 |
| 12 | cardio_log | (user_id, id) | last_write_wins | yes | bidirectional | 118-128 |
| 13 | ed_pattern_flags | id | server_wins | no | pull_only | 129-136 |
| 14 | tier_history | id | server_wins | no | pull_only | 137-144 |
| 15 | body_composition_log | id | last_write_wins | yes | bidirectional | 145-152 |
| 16 | nutrition_targets | user_id | last_write_wins | no | bidirectional (corrected from pull_only, see comment 153-163) | 153-170 |
| 17 | profiles | id | merge (column_updates_at) | no | bidirectional | 171-178 |
| 18 | notification_preferences | (user_id, category) | last_write_wins | no | bidirectional | 179-186 |
| 19 | partner_signals | (pair_id, user_id, week_start) | last_write_wins | no | bidirectional (pair-scoped, mig 081) | 187-200 |
| 20 | meal_plans | id | last_write_wins | yes | bidirectional (mig 086) | 201-214 |
| 21 | plan_folders | id | last_write_wins | yes | bidirectional (mig 089) | 215-227 |

MIGRATED_TABLES (`src/lib/sync/transport.js:78-96`) lists 13 named tables +
`...FOOD_DOMAIN_TABLES` (7 tables, `src/lib/sync/tables/foodDomain.js:43-51`)
+ `recipe_ingredients` = 21 entries. Every registry table is in
MIGRATED_TABLES: the registry path owns push+pull for all 21. (The
transport.js:74 comment still says "All 16 locked tables"; the list has since
grown to 21.)

Handler files (`src/lib/sync/tables/`), with dispatch maps at
transport.js:98-121 (push) and 123-148 (pull):

- `notificationPreferences.js` (149 lines), `weeklyCheckins.js` (140),
  `bodyComposition.js` (152), `weightLog.js` (24), `nutritionTargets.js` (89),
  `profiles.js` (210), `edPatternFlags.js` (50, pull only), `tierHistory.js`
  (52, pull only), `recipeIngredients.js` (135), `dailySteps.js` (138),
  `cardioLog.js` (152), `partners.js` (171), `mealPlans.js` (119),
  `planFolders.js` (135), `foodDomain.js` (490, coordinator for the 7
  food-domain tables via the food_sync_push / food_sync_pull bulk RPCs),
  `_missingTable.js` (40, helper).
- weight_log is an intentional no-op alias: both handlers return
  `skipped:'aliased_to_body_composition_log'` because weight_log and
  body_composition_log map to the same cloud table (body_metrics)
  (`tables/weightLog.js:1-24`).
- Pull-only tables have no push handler; `pushTable` returns
  `skipped:'pull_only'` first (transport.js:111-113, 182-184).
- Runner: `src/lib/sync/runner.js` `syncAll` (lines 72-305) does per-table
  push for MIGRATED_TABLES (164-186), then legacy `bulkUploadLocalData`
  (188-211), then per-table pull (213-238), then legacy `pullFromCloud`
  (241-252). Two-track design stated at runner.js:134-138.
- F5 Phase A per-call guards in transport: Article 9 fail-closed gate +
  sign-out-wipe guard hold per pushTable/pullTable call, not only per runner
  cycle (`transport.js:155-175`, mirrored from runner.js:76-96).

## 2. Legacy inventory (what src/lib/sync.js still owns)

`src/lib/sync.js` is 1,922 lines (`wc -l`). It owns roughly 21 further cloud
tables that are NOT in the registry. Line references below are current HEAD.

Per-save / on-event pushes (outside the bulk cycle):

| Function | Cloud table | Lines | Notes |
|----------|------------|-------|-------|
| `syncProfile` | users_profile | 178-217 | still live: called from useAppStore.js:263-264 and ProUpgradeScreen.js:91,161. Writes `sex` (mig 094) which the registry profiles handler does not (FIELD_MAP, tables/profiles.js:27-35) |
| `syncExercises` (+ alias `syncCustomExercises`) | custom_exercises | 241-284, 288 | customs only, chunked 200 |
| `syncWorkout` | workouts + workout_sets | 296-320 | on failure enqueues legacy queue op 'workout' (316-317) |
| `deleteWorkoutFromCloud` | workouts, workout_sets | 334-349 | hard delete; multi-device caveat in its own docstring (330-333): a device that already pulled the session keeps it until the next full pull, no tombstone to carry |
| `deleteWorkoutSetFromCloud` | workout_sets | 358-370 | hard delete |
| `scheduleSync` / `cancelScheduledSync` | (all bulk tables) | 489-526 | 2s-debounced full `bulkUploadLocalData` fired by database.js write paths |
| `syncMorningWeight` | morning_weights | 528-550 | enqueues 'morning_weight' on failure |
| `syncWeeklyCheckin` | weekly_checkins_v2 | 556-588 | legacy per-save push to a MIGRATED table; stamps updated_at now (allowlisted, see section 4); enqueues 'check_in' on failure |
| `syncBodyMetric` | body_metrics | 590-633 | legacy per-save push to the cloud table the registry's body_composition_log handler also owns; enqueues 'body_metric' on failure |
| `syncUserPref` | user_prefs | 1237-1248 | per-key upsert, stamps now |
| `syncNutritionTargets` | nutrition_targets | 1876-1884 | shim that delegates to transport.pushTable |

Bulk push, `bulkUploadLocalData` (642-771; error counting via
`_bulkPushTracking` 85-119):

| Helper | Cloud table(s) | Lines |
|--------|---------------|-------|
| inline workouts loop | workouts + workout_sets (`_upsertWorkout` 372-414, `_upsertSets` 416-460) | 657-714 (push watermark 669-673, advance 709-714) |
| `_pushProgrammes` | programmes | 775-795 |
| `_pushRoutinesAndExercises` | routines, routine_exercises | 797-902 (orphan filter 852-861) |
| `_pushMesocycles` | mesocycles, mesocycle_weeks | 904-947 |
| `_pushMorningWeights` | morning_weights | 949-967 |
| `_pushCoachOutputs` | coach_outputs | 969-989 |
| `_pushExerciseUserNotes` | exercise_user_notes | 997-1014 |
| `_pushUserBodyProfile` | user_body_profile | 1016-1034 (stamps now, allowlisted) |
| `_pushUserInsights` | user_insights | 1036-1056 |
| `_pushWorkoutNotes` | workout_notes | 1058-1076 |
| `_pushExerciseGoals` | exercise_goals | 1078-1099 |
| `_pushPeakWeekPlans` | peak_week_plans | 1101-1125 |
| `_pushPlannedMuscleVolume` | planned_muscle_volume | 1127-1147 |
| `_pushAdaptationEvents` | adaptation_events | 1149-1182 |
| `_pushAllUserPrefs` | user_prefs | 1251-1269 (stamps now, allowlisted; exclusion patterns 1197-1225) |

Bulk pull, `pullFromCloud` (1278-1472; sign-out-wipe bail points threaded at
1289-1296, 1317, 1349, 1380, 1383, 1388, 1399, 1409):

| Helper | Cloud table(s) | Lines | Pull watermark? |
|--------|---------------|-------|------------------|
| `_pullExercises` | exercises | 1498-1514 | no (full each cycle) |
| inline workouts + sets | workouts, workout_sets | 1327-1374 | yes (1327, advance 1372-1374) |
| `_pullProgrammes` | programmes | 1721-1751 | yes (1723, 1748) |
| `_pullRoutinesAndExercises` | routines, routine_exercises | 1753-1796 | yes (1755, 1791-1793) |
| `_pullMesocycles` | mesocycles, mesocycle_weeks | 1798-1827 | yes (1800, 1822-1824) |
| `_pullMorningWeights` | morning_weights | 1829-1849 | yes (1831, 1846) |
| `_pullCoachOutputs` | coach_outputs | 1851-1867 | yes (1853, 1864) |
| `_pullUserBodyProfile` | user_body_profile | 1516-1527 | no |
| `_pullUserInsights` | user_insights | 1529-1544 | no |
| `_pullExerciseUserNotes` | exercise_user_notes | 1546-1565 | yes (1548, 1562) |
| `_pullWorkoutNotes` | workout_notes | 1567-1582 | no |
| `_pullExerciseGoals` | exercise_goals | 1584-1599 | no |
| `_pullCustomExercises` | custom_exercises | 1601-1626 | no |
| `_pullPeakWeekPlans` | peak_week_plans | 1628-1643 | no |
| `_pullPlannedMuscleVolume` | planned_muscle_volume | 1645-1660 | no |
| `_pullAdaptationEvents` | adaptation_events | 1662-1678 | no |
| `_pullUserPrefs` | user_prefs | 1690-1713 | no; "cloud value wins unconditionally" per its own docstring (1684-1688) |

Re-export block: sync.js:1903-1921 re-exports the registry-path public API
(syncAll, syncTable, getStatus, registry helpers, queue surface) because
callers import from `'../lib/sync'` which resolves to this file, not the
`sync/` directory (comment 1886-1902).

## 3. The two queues: orphan vs live

### 3a. Registry `sync_queue` (src/lib/sync/queue.js): built, never fed, never drained

In-code acknowledgments that it has no drainer and no production enqueuer:

- `queue.js:107-115` (inside `listPending`): "D1-#12 (FOUNDER DECISION NEEDED
  ... backoff is measured from `queued_at` (row birth), not the last attempt
  ... This is LATENT today (sync_queue has no drainer, so nothing consumes
  these rows). The correct fix is to add a `last_attempt_at` column ...
  flagged for founder and NOT changed now."
- `queue.js:161-165` (above `purgeQueuedTable`): "that table syncs through
  its own registry handler and sync_queue has no drainer, so those rows were
  never consumed and only inflated getQueueDepth() (the 'N changes waiting to
  upload' line)."
- `runner.js:112-117`: same acknowledgment where the runner purges dead
  notification_preferences rows every cycle: "sync_queue has no drainer, so
  the rows were never consumed and only inflated the depth, sticking the
  Settings line on 'N changes waiting to upload'."

Enqueuer evidence: `enqueue()` (queue.js:59-89) is exported via
`sync/index.js:31` and `sync.js:1913`, but a repo grep finds NO production
callsite: the only callers are `sync/__tests__/sync.queue.test.js` (17
calls). The runner imports only `ensureSyncQueueTable`, `getQueueDepth`,
`purgeQueuedTable` (runner.js:17). Drainer evidence: `listPending`,
`markSucceeded`, `markFailed` (queue.js:96-153) are likewise called only from
that test file, plus re-exports. The queue table is created at boot
(runner.js:111) and its depth feeds the UI status (runner.js:121, 260,
365-377), so the visible "pending" number counts rows nothing will ever push.

### 3b. Legacy `pending_sync_ops` (src/lib/syncQueue.js): live retry path

- Enqueuers: `sync.js:317` (workout), `sync.js:547` (morning_weight),
  `sync.js:585` (check_in), `sync.js:630` (body_metric),
  `ActiveWorkoutScreen.js:1367-1368` (workout_set_delete),
  `WorkoutHistoryScreen.js:167-168` (workout_delete).
- Drainer: `drainSyncQueue` (syncQueue.js:72-113), wired into the App.js
  AppState 'active' handler (App.js:625-626).
- Retry semantics: MAX_RETRIES 6, backoff 0 / 1min / 5min / 30min / 2h / 8h
  measured from the LAST attempt (`next_attempt_at`, syncQueue.js:26-27,
  115-130); after max retries the row is parked a year out with last_error
  (119-123). Per-op workers re-read local state and rethrow so the queue owns
  retry accounting (F-003 comments, syncQueue.js:150-204).
- Contrast with 3a: the orphan queue's backoff is measured from row birth
  with a 5-minute cap, so a permanently failing row older than ~5 minutes
  would be eligible every cycle if a drainer ever existed (queue.js:107-120).

## 4. Conflict-policy parity: semantics the registry model does not express

1. **conflict.js is used by exactly one handler.** `resolve()`
   (`sync/conflict.js:23-69`) is imported only by `tables/profiles.js:23` and
   invoked at profiles.js:160-166 (merge via column_updates_at, mig 045).
   Every other handler implements its own inline LWW or plain upsert; the
   registry `conflictStrategy` field is declarative for them. Example inline
   LWW: weeklyCheckins pull skips when local updated_at >= cloud
   (weeklyCheckins.js:122-127); server-side "BEFORE UPDATE trigger refuses
   stale writes" is relied on for push (weeklyCheckins.js:14-17).
2. **Dual writers to the same cloud rows.** users_profile is written by both
   the legacy `syncProfile` (sync.js:212, stamps updated_at now, and is the
   only path carrying `sex`, sync.js:195-199) and the registry profiles
   handler (tables/profiles.js:123-125, merge payload without `sex`).
   weekly_checkins_v2 and body_metrics likewise have a legacy per-save push
   (sync.js:556-588, 590-633) alongside their registry handlers; the two
   paths stamp updated_at differently (legacy per-save: now; handler push:
   row-derived, weeklyCheckins.js:75).
3. **F5 Phase A honest-timestamp allowlist.** The source guard
   `sync/__tests__/sync.legacyForwardCompat.guard.test.js:50-60` pins the ONLY
   functions allowed to stamp `updated_at: new Date().toISOString()`:
   `syncProfile`, `syncMorningWeight`, `syncWeeklyCheckin`,
   `_pushUserBodyProfile`, `syncUserPref`, `_pushAllUserPrefs`. The
   `_pushAllUserPrefs` entry is annotated "Recorded F5 Phase A exclusion, not
   an endorsement ... SD-8 (prefs out of the bulk cycle entirely) is Phase B
   scope" (lines 56-59). Everything else in sync.js must derive updated_at
   from the row (guard lines 69-91; e.g. sync.js:408, 447, 790, 879, 980).
4. **Tombstone asymmetry.** Registry tables carry per-table softDelete flags
   with cloud tombstones (registry.js:18-19). Legacy tables hard-delete
   (sync.js:334-349, 358-370) and only FILTER tombstones on pull as Phase B
   forward-compat (`.is('deleted_at', null)` at 15+ sites, guard test
   lines 94-118; fetchByIdsChunked default builder sync.js:158-161). Mixed
   fleet resurrection is CONFIRMED constraint C1 in
   `docs/f5-legacy-sync-plan-2026-07-02.md` section 2.
5. **Watermark quirks.** (a) Legacy push watermark exists ONLY for workouts
   and depends on completed workouts being immutable (LB-5, sync.js:660-672);
   `watermark.js:100-102` warns it is "Safe only for tables whose rows are
   immutable once pushed". (b) Only 7 of the legacy pull paths are
   watermarked (section 2 table); the other 10 full-pull every cycle. (c) The
   food domain uses its own shared AsyncStorage cursors
   (`@volyume_food_last_pushed_/_pulled_`, foodDomain.js:40-41) advanced only
   when every non-empty table pushed cleanly (foodDomain.js:321-330) and
   server-clock based on pull (foodDomain.js:407-419); non-food registry
   handlers have NO watermark at all and full-push their table every cycle
   (e.g. pushWeeklyCheckins pushes all rows in 200-row batches,
   weeklyCheckins.js:49-92). (d) Watermark keys are device state, excluded
   from prefs sync after audit F1/SD-1 (sync.js:1207-1217).
6. **Parent/child ordering.** Legacy paths order pushes/pulls procedurally
   (exercises first, sync.js:1309-1316; routines before routine_exercises
   with an orphan filter, sync.js:852-861). The registry expresses ordering
   only as list position: recipe_ingredients placed after recipes
   (transport.js:93-95, pinned by `migratedTablesOrder.test.js`).
7. **Non-row semantics.** `_pullExercises` performs dedupe-by-name ID
   rewriting across four referencing tables (sync.js:1480-1497); user_prefs
   is a key/value namespace with regex exclusions and unconditional
   cloud-wins pull (sync.js:1197-1230, 1684-1713). Neither shape fits the
   registry's row/PK/strategy model as it stands.

## 5. Test surface

Command basis: `ls src/lib/sync/__tests__/`, `ls src/lib/sync/tables/__tests__/`,
`ls src/lib/__tests__/ | grep -iE 'sync|bulkUpload|pullFromCloud|watermark'`,
plus per-table greps.

Registry-path suites, `src/lib/sync/__tests__/` (26):
favouritesSync, foodDeleteTombstones, foodDeleteTombstones.adversarial,
foodDomain.pullWatermark, foodDomain.watermark, migratedTablesOrder,
planFolders.adversarial, recipeServingsSync, runner.authGone, runner.consent,
sync.cardioLog, sync.conflict, sync.dailySteps, sync.legacyForwardCompat.guard,
sync.mealPlans, sync.partners, sync.profiles, sync.publicApi, sync.queue,
sync.registry, sync.regressionMatrix, sync.runner.integration,
sync.runner.triggers, sync.transport, transport.guards, watermark.
Plus `src/lib/sync/tables/__tests__/missingTable.test.js` (1).

Legacy-path suites, `src/lib/__tests__/` (13):
asyncstorage-recovery, bulkUpload.errorReporting, bulkUpload.pushWatermark,
customExerciseSync.contract, foodSync, prefSync.landmarks,
pullFromCloud.signOutGuard, sync.fetchByIdsChunked, sync.scheduleSync,
syncPrefExclusions, syncProfile.sex, syncQueue, syncStatusLabel.

Total: 40 sync-dedicated suites. Adjacent coverage: workoutDelete.test.js and
workoutSetEdit.test.js exercise the cloud-delete enqueue paths;
wipeAllUserData.test.js covers the sign-out wipe boundary.

Registry-table coverage: `sync.regressionMatrix.test.js` runs scenarios T1-T6
for EVERY SYNC_REGISTRY table against a mocked client (header lines 1-43; T7
two-device and T8 offline-collision are documented as out of scope, lines
19-20). On top of the matrix, dedicated suites exist for profiles,
daily_steps, cardio_log, partner_signals, meal_plans, plan_folders,
recipe_ingredients (sync.transport + migratedTablesOrder) and the food domain
(6 suites). Registry tables with ONLY matrix-level coverage (no dedicated
suite): tier_history, saved_meals, weight_log (alias contract only, matrix
header lines 39-43).

Legacy-table coverage gaps. Tables whose push/pull helpers have NO test
coverage anywhere (grep of all test directories for the table name):
**programmes, mesocycles, mesocycle_weeks, morning_weights, coach_outputs,
exercise_user_notes, user_insights, workout_notes, exercise_goals,
peak_week_plans, planned_muscle_volume, adaptation_events** (12 tables).
routines / routine_exercises appear only in sync.fetchByIdsChunked.test.js
(the chunked-fetch chokepoint, not their mappers). user_body_profile appears
only in syncProfile.sex.test.js (sex mirroring). The source-level guard
sync.legacyForwardCompat.guard.test.js pins timestamp honesty and tombstone
filters across ALL of sync.js but asserts source text, not behaviour.

## 6. Size facts

`wc -l` at HEAD db57532:

- `src/lib/sync.js`: **1,922 lines** (legacy engine)
- `src/lib/database.js`: **6,954 lines**
- `src/store/useAppStore.js`: **1,780 lines**
- `src/lib/syncQueue.js`: 247 lines (live legacy queue)
- `src/lib/food/db.js`: 1,544 lines
- Registry path: registry.js 245, runner.js 389, transport.js 227, queue.js
  171, conflict.js 102, watermark.js 120, telemetry.js (3,779 bytes),
  signOutGuard.js (967 bytes), index.js 39, plus 18 handler files
  (section 1 line counts).

Table split: **21 tables in MIGRATED_TABLES** (= the whole registry) vs
**approximately 21 cloud tables still owned by legacy sync.js** (section 2:
users_profile, exercises, custom_exercises, workouts, workout_sets,
programmes, routines, routine_exercises, mesocycles, mesocycle_weeks,
morning_weights, coach_outputs, exercise_user_notes, user_body_profile,
user_insights, workout_notes, exercise_goals, peak_week_plans,
planned_muscle_volume, adaptation_events, user_prefs), with users_profile,
weekly_checkins_v2 and body_metrics double-written by both paths (section 4
item 2).

UNVERIFIED: nothing in this pack relies on web sources; all claims are from
the repo at HEAD. The locked spec `SYNC_ARCHITECTURE_LOCKED.md` is referenced
by code comments (registry.js:2-3, runner.js:2, queue.js:4) but was not
independently re-read for this pack; where code and spec might diverge (e.g.
"16 locked tables" vs 21 registry entries, transport.js:74) the code is
reported as found.
