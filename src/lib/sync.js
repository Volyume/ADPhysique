/**
 * sync.js, cloud backup layer
 *
 * SQLite is the source of truth. Supabase is the cloud backup.
 * All functions are fire-and-forget safe: they never throw, never block UI.
 *
 * Flow:
 *   1. User signs up/in → bulkUploadLocalData() (+ registry runner)
 *   2. Workout completed → syncWorkout()
 *   (E12 step 1: the per-save syncProfile / syncWeeklyCheckin /
 *   syncBodyMetric dual writers are retired; users_profile,
 *   weekly_checkins_v2 and body_metrics are owned by the registry
 *   handlers in src/lib/sync/tables/, pushed via syncAll.)
 */

import { getSupabaseClient } from './supabase';
import {
  getAllWorkouts,
  getWorkoutById,
  getWorkoutSetsForWorkout,
  getAllExercises,
  insertWorkoutFromCloud,
  insertWorkoutSetFromCloud,
  // Bulk read helpers
  getAllProgrammes,
  getAllRoutinesForUser,
  getAllRoutineExercisesForUser,
  getAllMesocyclesForUser,
  getAllMesocycleWeeksForUser,
  getAllMorningWeightsForUser,
  getAllCoachOutputsForUser,
  getAllExerciseUserNotesForUser,
  // Newly-syncing tables (migration 012)
  getUserBodyProfile,
  getAllUserInsightsForUser,
  getAllWorkoutNotesForUser,
  getAllExerciseGoalsForUser,
  getAllPeakWeekPlansForUser,
  getAllPlannedMuscleVolumeForUser,
  getAllAdaptationEventsForUser,
  // Cloud restore helpers
  insertRoutineFromCloud,
  insertProgrammeFromCloud,
  setPlanFolder,
  insertRoutineExerciseFromCloud,
  insertMorningWeightFromCloud,
  insertCoachOutputFromCloud,
  insertMesocycleFromCloud,
  insertMesocycleWeekFromCloud,
  cleanupOrphanRoutineExercises,
  // getAllWeeklyCheckinsForUser, getBodyMetricLog, getAllBodyMetricsForUser,
  // getNutritionTargets, insertWeeklyCheckinFromCloud,
  // insertBodyMetricFromCloud, insertNutritionTargetsFromCloud: moved to
  // src/lib/sync/tables/<table>.js per MIGRATED_TABLES.
} from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPullWatermark, setPullWatermark, nextWatermark, isoFromMs, getPushWatermark, setPushWatermark } from './sync/watermark';
import { logError, logWarn, logInfo } from './errorLog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msToISO(ms) {
  if (!ms) return null;
  try { return new Date(ms).toISOString(); } catch { return null; }
}

function timeToMs(value) {
  if (!value) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getClient() {
  return getSupabaseClient();
}

// PostgREST errors carry a code + hint + details that the user (and we)
// need to see. The default `e?.message` we'd been logging often comes
// back empty or as a useless one-liner, which made every silently-
// failed upsert look the same. Surface the full shape so the next
// debug log dump tells us exactly which column / constraint blew up.
// Bulk-push error tracking. bulkUploadLocalData pushes the legacy tables
// through ~13 helpers that each swallow their own PostgREST {error} via
// logPgErr so one table's failure can't abort the rest. That resilience
// also hid failures from the sign-out push-first safety: a rejected push
// (e.g. RLS 42501, column drift) left the sync status 'synced', so sign-out
// wiped local data that never reached cloud. We count PostgREST errors
// raised during the bulk-push window so bulkUploadLocalData can report them
// to the runner, which folds them into the cycle's errored_count. The flag
// scopes counting to the legacy push only: pull and single-entity on-save
// pushes call logPgErr outside this window and are not counted.
let _bulkPushTracking = false;
let _bulkPushErrorCount = 0;

function logPgErr(scope, err) {
  if (!err) return;
  if (_bulkPushTracking) _bulkPushErrorCount += 1;
  logWarn(scope, err.message || String(err), {
    code: err.code ?? null,
    details: err.details ?? null,
    hint: err.hint ?? null,
  });
}

function missingSchemaColumn(err, table, columns = []) {
  if (!err || err.code !== 'PGRST204') return false;
  const text = `${err.message || ''} ${err.details || ''} ${err.hint || ''}`.toLowerCase();
  if (table && !text.includes(String(table).toLowerCase())) return false;
  return columns.some((column) => text.includes(String(column).toLowerCase()));
}

// Catch-path logger for the legacy bulk-push helpers. Same signature as
// logWarn, but also counts the failure during the bulk-push window. PostgREST
// {error} results go through logPgErr (counted); a helper that THROWS while
// reading local data (e.g. a getAllX SQLite error) is swallowed by its own
// catch with logWarn and would otherwise be invisible to the sign-out
// push-first safety. Routing those catches through here surfaces them too
// (SYNC-1 re-audit). Gated on _bulkPushTracking so it's a plain warn when a
// helper runs outside bulkUploadLocalData.
function logBulkWarn(scope, message, meta) {
  if (_bulkPushTracking) _bulkPushErrorCount += 1;
  logWarn(scope, message, meta);
}

// PostgREST caps each response at 1000 rows by default. Loop with
// .range() until a short page comes back so users with large libraries
// (long-running accounts, imported templates) get every row back.
async function fetchAllRows(scope, queryBuilder) {
  const PAGE = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const { data, error } = await queryBuilder().range(from, from + PAGE - 1);
    // LS-03/H-12 (Codex audit, 2026-07-12): a transport error mid-pagination
    // means this is an INCOMPLETE view. Returning the partial rows let the
    // caller treat the pull as clean and advance its cursor past the rows that
    // never arrived - permanently skipped until a manual cursor reset or
    // sign-out. Throw so the caller holds its cursor and retries next pull.
    if (error) {
      logWarn(scope, error.message);
      throw new Error(`${scope}: paginated fetch failed at offset ${from}: ${error.message}`);
    }
    if (!data?.length) return out;
    out.push(...data);
    if (data.length < PAGE) return out;
    from += PAGE;
  }
}

// IN-list queries can hit URL length limits with thousands of IDs.
// Chunk to keep the query string well under any practical cap.
export async function fetchByIdsChunked(scope, table, column, ids, queryFactory) {
  const CHUNK = 200;
  const PAGE = 1000;
  const out = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    // Paginate WITHIN each chunk. A 200-id chunk can match far more than
    // 1000 child rows (e.g. 200 workouts each with many sets, or 200
    // routines each with several exercises), and PostgREST caps every
    // response at 1000. Without the .range() loop the surplus was
    // silently dropped, so a fresh pull could leave workouts missing
    // sets and routines missing exercises (observed in prod logs: a
    // 200-routine chunk returning exactly 1000 routine_exercises). The
    // builder is single-use once awaited, so rebuild it per page.
    let from = 0;
    for (;;) {
      const base = queryFactory
        ? queryFactory(slice)
        // F5 Phase A (C1 mitigation, forward-compat): exclude tombstoned rows
        // so Phase B's soft deletes can never resurrect through this build's
        // pulls. No tombstone exists yet, so this is a no-op today.
        : getClient().from(table).select('*').in(column, slice).is('deleted_at', null);
      const { data, error } = await base.range(from, from + PAGE - 1);
      // LS-03/H-12: a chunk/page error is an incomplete result. Breaking here
      // returned the partial aggregate as if complete, so the caller advanced
      // its cursor past child rows (e.g. workout_sets) that never arrived.
      // Throw instead so no caller advances a cursor over unseen rows.
      if (error) {
        logWarn(scope, error.message);
        throw new Error(`${scope}: chunked fetch failed: ${error.message}`);
      }
      if (!data?.length) break;
      out.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  return out;
}

// ─── Profile ──────────────────────────────────────────────────────────────────
// E12 step 1: the legacy per-save syncProfile was retired; users_profile is
// pushed/pulled by the registry profiles handler (src/lib/sync/tables/
// profiles.js), which also carries the sex mirror (U2, migrate_094).

// ─── Exercises ────────────────────────────────────────────────────────────────

/**
 * Upload custom exercises (user-created ones) to Supabase.
 * Canonical exercises are seeded separately via scripts/seed-exercises.js.
 */
/**
 * Push EVERY exercise, canonical + custom, to the cloud.
 *
 * Renamed from syncCustomExercises (which only pushed is_custom=1
 * rows). Without canonical exercises in cloud, every routine_exercise
 * and workout_set ref to a canonical exercise was rejected by the FK
 * (now relaxed in migration 010) and silently fell into the cloud as
 * an orphan id with no name lookup possible. Now canonical exercises
 * round-trip with deterministic IDs (canonicalExerciseId in
 * seedExercises.js) so every device produces the same UUID for
 * "Bench Press", the natural primary key dedupes upserts across
 * sign-ins from multiple devices.
 *
 * Idempotent, onConflict: 'id' means re-running the push touches
 * existing rows' updated_at but creates no duplicates.
 */
export async function syncExercises(supabaseUserId, _opts = {}) {
  const sb = getClient();
  if (!sb || !supabaseUserId) return;
  // Re-triage 2026-08-01: covered wholesale by the next good syncAll's bulk
  // push, so a dead session defers with no queue entry and no data loss.
  if (await _blockedByDeadSession('sync.syncExercises')) return;
  try {
    // Migration 020 split per-user exercise rows out of the
    // mixed-ownership `exercises` table into `custom_exercises`.
    // Library rows live in cloud `exercises` server-side with
    // user_id = NULL and must not be re-pushed -- the RLS UPDATE
    // policy USING (auth.uid() = user_id) rejects any attempt to
    // claim them (existing user_id NULL never matches the caller),
    // raising 42501 per chunk. Only customs go up now, and they
    // target custom_exercises with composite-PK conflict.
    const all = await getAllExercises();
    const customs = all.filter(e => e.isCustom);
    if (!customs.length) return;
    const rows = customs.map(e => ({
      id: e.id,
      user_id: supabaseUserId,
      name: e.name,
      primary_muscle: e.primaryMuscle,
      secondary_muscles: e.secondaryMuscles ?? [],
      equipment: e.equipment ?? null,
      movement_pattern: e.movementPattern ?? null,
      fatigue_cost: e.fatigueCost ?? 1,
      stimulus_to_fatigue_ratio: e.stimulusToFatigueRatio ?? 3,
      compound_isolation: e.compoundIsolation ?? null,
      default_rep_min: e.defaultRepMin ?? null,
      default_rep_max: e.defaultRepMax ?? null,
      exercise_category: e.exerciseCategory ?? 'compound',
      increment_kg: e.incrementKg ?? 2.5,
      subregion: e.subregion ?? null,
      notes: e.notes ?? null,
      exercise_type: e.exerciseType ?? 'weight_reps', // migrate_091; mirrors
      // insertOrUpdateExerciseFromCloud's read-side default so a custom
      // exercise's type round-trips through sign-out/sign-in.
      updated_at: new Date(e.updatedAt ?? e.createdAt ?? Date.now()).toISOString(), // F5 Phase A: honest edit time
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('custom_exercises').upsert(
        rows.slice(i, i + 200), { onConflict: 'user_id,id', ignoreDuplicates: false },
      );
      if (error) logPgErr('sync.syncExercises', error);
    }
  } catch (e) {
    logWarn('sync.syncExercises', e?.message);
  }
}

// Back-compat alias for any code still calling the old name. New
// code should call syncExercises() directly.
export const syncCustomExercises = syncExercises;

// ─── Single workout ───────────────────────────────────────────────────────────

/**
 * Push one completed workout + its sets to Supabase.
 * Call this immediately after updateWorkout({ isCompleted: true }).
 */
export async function syncWorkout(supabaseUserId, workoutId, { rethrow = false } = {}) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !workoutId) return;
  // Re-triage 2026-08-01: push-on-save can fire from a background notification
  // action with an expired token. Firing anyway is a guaranteed 42501 plus a
  // wasted queue retry later. Defer straight to the queue instead - identical
  // data outcome to the failure path, zero doomed network calls, zero noise.
  if (await _blockedByDeadSession('sync.syncWorkout')) {
    if (rethrow) throw new Error('deferred: no usable session'); // queue owns retry accounting (F-003)
    try {
      // eslint-disable-next-line global-require
      const { enqueueSyncOp } = require('./syncQueue');
      await enqueueSyncOp('workout', workoutId, supabaseUserId);
    } catch (_) { /* enqueue itself failed, nothing more we can do */ }
    return;
  }
  try {
    const w = await getWorkoutById(workoutId);
    if (!w) return;
    await _upsertWorkout(sb, supabaseUserId, w);
    const sets = await getWorkoutSetsForWorkout(workoutId);
    await _upsertSets(sb, supabaseUserId, sets);
  } catch (e) {
    logWarn('sync.syncWorkout', e?.message, { workoutId });
    // When the queue drains this op (rethrow), THROW so the queue owns retry /
    // backoff / last_error. Re-enqueuing from inside a drain made a failed write
    // look drained and reset the retry counter (audit F-003).
    if (rethrow) throw e;
    // Direct caller: enqueue for retry on next foreground / connection return.
    // Without this, a dropped sync was silent data loss until the
    // user's next sign-in cycle triggered bulkUploadLocalData.
    try {
      // eslint-disable-next-line global-require
      const { enqueueSyncOp } = require('./syncQueue');
      await enqueueSyncOp('workout', workoutId, supabaseUserId);
    } catch (_) { /* enqueue itself failed, nothing more we can do */ }
  }
}

/**
 * Remove a deleted workout (and its sets) from the cloud so a later restore
 * pull cannot resurrect it. Local rows are already gone
 * (database.deleteWorkoutAndSets); this is the cloud half. Returns true on
 * success; on failure the caller enqueues a 'workout_delete' op so the
 * drainer retries with backoff. Sets go first so a mid-way failure leaves a
 * set-less workout shell, never orphaned cloud sets.
 *
 * Multi-device note (v1): a device that has ALREADY pulled the session keeps
 * its local copy until its next full pull (sign-in); the watermark delta pull
 * has no tombstone to carry, and the cloud rows are simply gone.
 */
export async function deleteWorkoutFromCloud(supabaseUserId, workoutId) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !workoutId) return false;
  // Re-triage 2026-08-01: false is this function's existing "failed, please
  // enqueue" signal - returning it early on a dead session reuses the caller's
  // 'workout_delete' retry path without firing the doomed request first.
  if (await _blockedByDeadSession('sync.deleteWorkoutFromCloud')) return false;
  try {
    const { error: setsErr } = await sb.from('workout_sets')
      .delete().eq('user_id', supabaseUserId).eq('workout_id', workoutId);
    if (setsErr) { logPgErr('sync.deleteWorkoutFromCloud.sets', setsErr); return false; }
    const { error: wErr } = await sb.from('workouts')
      .delete().eq('user_id', supabaseUserId).eq('id', workoutId);
    if (wErr) { logPgErr('sync.deleteWorkoutFromCloud.workout', wErr); return false; }
    return true;
  } catch (e) {
    logWarn('sync.deleteWorkoutFromCloud', e?.message, { workoutId });
    return false;
  }
}

/**
 * Remove a single hard-deleted set from the cloud so a later restore pull
 * cannot resurrect it. The local row is already gone (database.deleteWorkoutSet);
 * this is the cloud half. Returns true on success; on failure the caller
 * enqueues a 'workout_set_delete' op so the drainer retries with backoff.
 * Scoped to the owning user. Mirrors deleteWorkoutFromCloud for one set.
 */
export async function deleteWorkoutSetFromCloud(supabaseUserId, setId) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !setId) return false;
  try {
    const { error } = await sb.from('workout_sets')
      .delete().eq('user_id', supabaseUserId).eq('id', setId);
    if (error) { logPgErr('sync.deleteWorkoutSetFromCloud', error); return false; }
    return true;
  } catch (e) {
    logWarn('sync.deleteWorkoutSetFromCloud', e?.message, { setId });
    return false;
  }
}

async function _upsertWorkout(sb, supabaseUserId, w) {
  // Columns: every user-entered + computed field on a workout row.
  // The previous payload omitted name / pre_workout_intent /
  // joint_discomfort / set_count / total_volume / mesocycle_week_id
  //, the cloud columns existed (migrate_012) but the push never
  // wrote them, so on cross-device restore the session card showed
  // a generic "Workout" without the user's chosen name and the
  // analytics paths missed the cached tonnage.
  const payload = {
    id: w.id,
    user_id: supabaseUserId,
    routine_id: w.routineId ?? null,
    mesocycle_id: w.mesocycleId ?? null,
    mesocycle_week_id: w.mesocycleWeekId ?? null,
    started_at: msToISO(w.startedAt),
    ended_at: msToISO(w.endedAt),
    duration_minutes: w.durationMinutes ?? null,
    notes: w.notes ?? null,
    name: w.name ?? null,
    pre_workout_intent: w.preWorkoutIntent ?? null,
    session_difficulty: w.sessionDifficulty ?? null,
    overall_pump: w.overallPump ?? null,
    soreness_24h_before: w.soreness24hBefore ?? null,
    fatigue_level: w.fatigueLevel ?? null,
    joint_discomfort: w.jointDiscomfort ?? null,
    // COMP-008 pre-workout readiness, kept column-symmetric with
    // insertWorkoutFromCloud in database.js.
    sleep_quality: w.sleepQuality ?? null,
    energy_score: w.energyScore ?? null,
    set_count: w.setCount ?? null,
    total_volume: w.totalVolume ?? null,
    is_completed: true,
    synced_at: new Date().toISOString(),
    // F5 Phase A (SD-3): carry the REAL local edit time. Re-stamping to now
    // on every bulk cycle re-widened every other device's delta pull and let
    // a stale full-push overwrite newer edits under last-write-wins.
    updated_at: new Date(w.updatedAt ?? Date.now()).toISOString(),
  };
  let { error } = await sb.from('workouts').upsert(payload, { onConflict: 'user_id,id' });
  if (missingSchemaColumn(error, 'workouts', ['energy_score', 'sleep_quality'])) {
    const retryPayload = { ...payload };
    delete retryPayload.energy_score;
    delete retryPayload.sleep_quality;
    const retry = await sb.from('workouts').upsert(retryPayload, { onConflict: 'user_id,id' });
    if (!retry.error) {
      logInfo('sync._upsertWorkout', 'workouts readiness columns missing in cloud schema; pushed workout without optional readiness fields', {
        workoutId: w.id,
        code: error.code,
      });
      return;
    }
    error = retry.error;
  }
  if (error) {
    logPgErr('sync._upsertWorkout', error);
    throw error;
  }
}

async function _upsertSets(sb, supabaseUserId, sets) {
  if (!sets?.length) return;
  const rows = sets.map(s => ({
    id: s.id,
    user_id: supabaseUserId,
    workout_id: s.workoutId,
    exercise_id: s.exerciseId,
    // Denormalised exercise name, restores correctly on a new
    // device even when the cloud exercise_id doesn't resolve locally
    // (e.g. data pushed before deterministic canonical IDs landed).
    exercise_name: s.exerciseName ?? null,
    set_number: s.setNumber ?? 1,
    set_type: s.setType ?? 'straight',
    target_reps_min: s.targetRepsMin ?? null,
    target_reps_max: s.targetRepsMax ?? null,
    actual_reps: s.actualReps ?? 0,
    weight: s.weight ?? null,
    rir: s.rir ?? null,
    rpe: s.rpe ?? null,
    failed: s.failed === 1,
    notes: s.notes ?? null,
    post_set_pump: s.postSetPump ?? null,
    post_set_muscle_connection: s.postSetMuscleConnection ?? null,
    joint_discomfort: s.jointDiscomfort ?? null,
    is_amrap: s.isAmrap === 1,
    amrap_reps: s.amrapReps ?? null,
    missed_reps: s.missedReps ?? null,
    // Per-side reps for unilateral sets (migration 054). null on every
    // bilateral set. actual_reps already holds the lower side.
    left_reps: s.leftReps ?? null,
    right_reps: s.rightReps ?? null,
    updated_at: new Date(s.updatedAt ?? Date.now()).toISOString(), // F5 Phase A: honest edit time
  }));
  // Chunk to avoid hitting Supabase row limits
  let chunkFailures = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await sb.from('workout_sets').upsert(chunk, { onConflict: 'user_id,id' });
    if (error) {
      logPgErr('sync._upsertSets', error);
      chunkFailures++;
      // Continue attempting the remaining chunks rather than aborting all
      // remaining work, but record the failure so it is not swallowed.
    }
  }
  // LS-02/H-11 (Codex audit, 2026-07-12): throw AFTER attempting every chunk so
  // the caller's per-workout catch counts this workout as failed. The previous
  // silent return let `failures` stay 0, so the caller advanced the workout
  // push watermark past a workout whose sets never landed - the next
  // watermark-filtered sync then skipped that older workout forever and the
  // missing sets were lost. A throw here holds the watermark so it retries.
  if (chunkFailures > 0) {
    throw new Error(`sync._upsertSets: ${chunkFailures} workout_sets chunk(s) failed to upsert`);
  }
}

// ─── Body metrics ─────────────────────────────────────────────────────────────

/**
 * Sync a single body metric entry after it's logged locally.
 */
/**
 * Push a single morning weight entry to cloud immediately after it's
 * logged locally. Without this, weights live local-only until the
 * next sign-in catch-up, a sign-out between writes loses them.
 * Failures enqueue to the retry queue.
 */
// ─── Debounced full sync trigger ─────────────────────────────────────────
//
// Most write functions in database.js (createRoutine, addExerciseToRoutine,
// saveExerciseGoal, saveNutritionTargets, etc.) don't have a per-entity
// sync helper, and adding one per table would multiply maintenance.
// Instead, every mutating database write calls scheduleSync(), a
// debounced (2s) full bulkUploadLocalData. Bursty edits coalesce into
// one push.
//
// Reads the supabase user id from the store at fire time so the caller
// doesn't have to thread it through. No-op when there's no cloud
// session.

let _syncDebounceTimer = null;
const _SYNC_DEBOUNCE_MS = 2_000;

export function scheduleSync() {
  // No-op under Jest. Most database write paths call scheduleSync(),
  // so every test that touches the DB would otherwise leave a 2s
  // timer pending and trigger Jest's "open handles / worker did not
  // exit gracefully" warning, plus a late require of useAppStore
  // after the module registry has been torn down. Production code
  // paths are unaffected: JEST_WORKER_ID is only set inside Jest
  // workers. Tests that need to assert sync behaviour should call
  // bulkUploadLocalData / pullFromCloud directly.
  if (typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID) {
    return;
  }
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(() => {
    _syncDebounceTimer = null;
    try {
      // eslint-disable-next-line global-require
      const useAppStore = require('../store/useAppStore').default;
      const state = useAppStore.getState();
      const supabaseUserId = state.session?.user?.id;
      const localUserId = state.user?.id;
      if (!supabaseUserId || !localUserId) return;
      // AC-02 (Codex audit, 2026-07-12): route the debounced-on-write trigger
      // through syncAll, not bulkUploadLocalData directly, so it passes the
      // runner's Article 9 health-consent + sign-out-wipe gate. Per
      // SYNC_ARCHITECTURE_LOCKED.md all four triggers go through syncAll; a
      // direct bulk push here uploaded health data with no consent check.
      // eslint-disable-next-line global-require
      const { syncAll } = require('./sync/runner');
      syncAll({ userId: supabaseUserId, localUserId, triggeredBy: 'write' }).catch(() => {});
    } catch (_) { /* store not available, tolerate */ }
  }, _SYNC_DEBOUNCE_MS);
}

/**
 * Cancel any pending debounced sync. Used by sign-out flows so a
 * scheduled push doesn't fire after the user has cleared their
 * session and re-keyed local rows.
 */
export function cancelScheduledSync() {
  if (_syncDebounceTimer) {
    clearTimeout(_syncDebounceTimer);
    _syncDebounceTimer = null;
  }
}

export async function syncMorningWeight(supabaseUserId, entry, { rethrow = false } = {}) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !entry) return;
  // Re-triage 2026-08-01: same defer-to-queue contract as syncWorkout above.
  if (await _blockedByDeadSession('sync.syncMorningWeight')) {
    if (rethrow) throw new Error('deferred: no usable session'); // F-003
    try {
      // eslint-disable-next-line global-require
      const { enqueueSyncOp } = require('./syncQueue');
      await enqueueSyncOp('morning_weight', entry?.id ?? `mw-${Date.now()}`, supabaseUserId, entry);
    } catch (_) {}
    return;
  }
  try {
    const { error } = await sb.from('morning_weights').upsert({
      id: entry.id,
      user_id: supabaseUserId,
      weight_kg: entry.weightKg,
      logged_at: msToISO(entry.loggedAt),
      notes: entry.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,id' });
    if (error) { logPgErr('sync.syncMorningWeight', error); throw error; }
  } catch (e) {
    logWarn('sync.syncMorningWeight', e?.message, { id: entry?.id });
    if (rethrow) throw e; // queue-driven: let the queue own retry accounting (F-003)
    try {
      // eslint-disable-next-line global-require
      const { enqueueSyncOp } = require('./syncQueue');
      await enqueueSyncOp('morning_weight', entry?.id ?? `mw-${Date.now()}`, supabaseUserId, entry);
    } catch (_) {}
  }
}

// E12 step 1: the legacy per-save syncWeeklyCheckin and syncBodyMetric were
// retired; weekly_checkins_v2 and body_metrics are owned by the registry
// handlers (weeklyCheckins.js, bodyComposition.js) and pushed via syncAll.
// Residual queued 'check_in' / 'body_metric' ops drain through the
// syncQueue bulk fallback.

// ─── Bulk upload ──────────────────────────────────────────────────────────────

/**
 * First-time upload: push all local completed workouts to Supabase.
 * Called once after the user creates a cloud account or signs in for the first time.
 * Runs in the background, never blocks UI.
 */

// The one place a doomed cloud round trip is stopped.
//
// The first version of this guard lived in syncAll (sync/runner.js) only, and
// FOUR screens call bulkUploadLocalData / pullFromCloud directly -- ImportScreen,
// HomeScreen's session restore, and ProUpgradeScreen twice -- so they bypassed
// it completely. `sync.push.legacy` was the top error on build 48 for exactly
// that reason. Guarding one caller instead of the choke point is the same
// mistake as five different answers to "which week am I in": put it where it
// cannot be routed around.
//
// Fails OPEN by design, matching the runner: only an explicit `false` (the
// session was checked and there is no usable token) blocks. Unavailable, threw,
// or undetermined all proceed exactly as before, so a check that cannot answer
// can never switch sync off for everyone.
async function _blockedByDeadSession(scope) {
  try {
    // eslint-disable-next-line global-require
    const live = await require('./supabase').hasLiveSession();
    if (live === false) {
      // Deliberately logInfo, not logError: this is the guard doing its job and
      // leaving the work queued, not a failure. Logging it loudly would rebuild
      // the noise the whole triage existed to remove.
      try { require('./errorLog').logInfo(scope, 'no usable session, deferring sync'); } catch (_) {}
      return true;
    }
  } catch (_) { /* undetermined: fail open */ }
  return false;
}

export async function bulkUploadLocalData(supabaseUserId, localUserId) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !localUserId) return { errors: 0 };
  if (await _blockedByDeadSession('sync.bulkUploadLocalData')) return { errors: 0, skipped: 'no_live_session' };

  _bulkPushTracking = true;
  _bulkPushErrorCount = 0;
  let threw = false;
  try {
    // Every exercise, canonical + custom, pushed first so all the
    // downstream FK references (routine_exercises, workout_sets) land
    // on cloud rows that exist. Previously only is_custom=1 rows were
    // pushed, which is what left routine_exercises pointing at
    // unresolvable canonical UUIDs and broke cross-device restore.
    await syncExercises(supabaseUserId);

    const allWorkouts = await getAllWorkouts(localUserId);
    const completedAll = allWorkouts.filter(w => w.isCompleted);

    // LB-5: skip re-pushing completed workouts we've already uploaded.
    // A completed workout is immutable (no edit path re-opens it; its
    // updated_at is stamped at completion and is >= every set's
    // updated_at), so once a workout+sets has pushed cleanly it never
    // needs pushing again. The watermark is the highest completion time
    // already on cloud; we re-include the boundary (>=) so an upsert at
    // the exact cursor is idempotently repeated rather than dropped.
    // First sign-in (or post-sign-out, cleared AsyncStorage) has no
    // watermark and pushes everything.
    const workoutsWm = await getPushWatermark(supabaseUserId, 'workouts');
    const completed = workoutsWm > 0
      ? completedAll.filter(w => timeToMs(w.updatedAt) >= workoutsWm)
      : completedAll;
    let maxPushedMs = workoutsWm;

    // Upload in batches of 10 to avoid hammering the API
    let failures = 0;
    for (let i = 0; i < completed.length; i += 10) {
      const batch = completed.slice(i, i + 10);
      await Promise.all(
        batch.map(async w => {
          try {
            await _upsertWorkout(sb, supabaseUserId, w);
            const sets = await getWorkoutSetsForWorkout(w.id);
            await _upsertSets(sb, supabaseUserId, sets);
            const wMs = timeToMs(w.updatedAt);
            if (wMs > maxPushedMs) maxPushedMs = wMs;
          } catch (e) {
            failures++;
            // Per-workout failure doesn't abort the batch but it is logged
            // so the user can spot patterns in the Debug logs surface
            // (e.g. "every workout from 2024-12 fails, schema mismatch").
            // logBulkWarn (not logWarn) so a THROWN failure here — a local
            // sets-read error, or an upsert that threw rather than returning
            // {error} — is counted for the sign-out push-first safety, same as
            // the _pushX helpers. An {error} was already counted via logPgErr
            // inside _upsertWorkout/_upsertSets; the resulting double-count is
            // harmless (errors > 0 is the only thing that matters). (SYNC-1)
            logBulkWarn('sync.bulkUploadLocalData', 'workout upload failed', {
              workoutId: w?.id, supabaseUserId, error: e?.message,
            });
          }
        })
      );
      // Brief yield to avoid blocking the JS thread
      await new Promise(r => setTimeout(r, 50));
    }
    if (failures > 0) {
      logWarn('sync.bulkUploadLocalData', `${failures} of ${completed.length} workouts failed to upload`, { supabaseUserId });
    } else if (maxPushedMs > workoutsWm) {
      // Advance only on a clean workout push: a failure leaves the
      // watermark where it was so the failed rows retry next cycle and
      // the sign-out push-first safety still sees them as un-pushed.
      await setPushWatermark(supabaseUserId, 'workouts', maxPushedMs);
    }

    // body_composition_log (cloud table body_metrics) moved to
    // src/lib/sync/transport.js (registry-driven per-table push).
    // See MIGRATED_TABLES.

    // ─── New Pro-state tables ─────────────────────────────────────────────
    // Each block is independently fault-tolerant: failures on one table
    // log + carry on. None of these are needed for free-tier UX so they
    // can degrade gracefully on a partial cloud schema.

    await _pushProgrammes(sb, supabaseUserId, localUserId);
    await _pushRoutinesAndExercises(sb, supabaseUserId, localUserId);
    await _pushMesocycles(sb, supabaseUserId, localUserId);
    await _pushMorningWeights(sb, supabaseUserId, localUserId);
    // weekly_checkins_v2 moved to src/lib/sync/transport.js
    // (registry-driven per-table push). See MIGRATED_TABLES.
    await _pushCoachOutputs(sb, supabaseUserId, localUserId);
    // nutrition_targets moved to src/lib/sync/transport.js
    // (registry-driven per-table push). See MIGRATED_TABLES.
    // The public syncNutritionTargets on-save shim above now also
    // routes through transport so both call sites share the code.
    // Tables that previously stayed local-only. Each is safe to call
    // for free-tier users, they return zero rows and the helper
    // exits cleanly. No new dependencies between them.
    await _pushUserBodyProfile(sb, supabaseUserId, localUserId);
    await _pushUserInsights(sb, supabaseUserId, localUserId);
    await _pushExerciseUserNotes(sb, supabaseUserId, localUserId);
    await _pushWorkoutNotes(sb, supabaseUserId, localUserId);
    await _pushExerciseGoals(sb, supabaseUserId, localUserId);
    await _pushPeakWeekPlans(sb, supabaseUserId, localUserId);
    await _pushPlannedMuscleVolume(sb, supabaseUserId, localUserId);
    await _pushAdaptationEvents(sb, supabaseUserId, localUserId);
    // Food-domain push (food_entries, custom_foods, saved_meals,
    // recipes, food_favourites, daily_water) moved to
    // src/lib/sync/tables/foodDomain.js, a coordinator that
    // drives the food_sync_push RPC once per syncAll and reports
    // per-table counts back via transport.pushTable.
    // AsyncStorage prefs (units, accessibility, wellbeing, etc.).
    // Pushed AFTER the structured tables so a sign-in catch-up
    // doesn't block on the larger writes.
    await _pushAllUserPrefs(sb, supabaseUserId);
    // notification_preferences moved to src/lib/sync/transport.js
    // (registry-driven per-table push). MIGRATED_TABLES in
    // transport.js is the source of truth for what no longer flows
    // through here.

    logInfo('sync.bulkUpload', 'bulk upload complete');
  } catch (e) {
    threw = true;
    logError('sync.bulkUploadLocalData', e, { supabaseUserId, localUserId });
  } finally {
    _bulkPushTracking = false;
  }
  // Report failures so the runner can fold them into errored_count and the
  // sign-out push-first safety can refuse to wipe local data on a bad push.
  return { errors: _bulkPushErrorCount + (threw ? 1 : 0) };
}

// ─── Per-table push helpers ───────────────────────────────────────────────

async function _pushProgrammes(sb, supabaseUserId, localUserId) {
  try {
    const programmes = await getAllProgrammes(localUserId);
    if (!programmes?.length) return;
    const rows = programmes.map(p => ({
      id: p.id, user_id: supabaseUserId,
      name: p.name, description: p.description ?? null,
      is_library: !!p.isLibrary, is_active: !!p.isActive,
      // C6 P44-03 (D97): the archived flag finally travels. The cloud
      // column has existed since migrate_012; it was simply never pushed
      // or pulled, so a reinstall resurrected every plan the user ever
      // archived (eight wizard re-runs = eight "My plans" rows).
      is_archived: !!p.isArchived,
      source_programme_id: p.sourceProgrammeId ?? null,
      // folder_id (plan_folders, migration 089): carry the plan's folder so the
      // My Plans organisation survives a device change. Nullable; an unfiled
      // plan ships NULL.
      folder_id: p.folderId ?? null,
      // F5 Phase A (SD-3): the 2s-debounced full re-push used to re-stamp
      // every programme to now each cycle - the audit's exemplar of the bug.
      updated_at: new Date(p.updatedAt ?? p.createdAt ?? Date.now()).toISOString(),
    }));
    const { error } = await sb.from('programmes').upsert(rows, { onConflict: 'user_id,id' });
    if (error) logPgErr('sync._pushProgrammes', error);
  } catch (e) { logBulkWarn('sync._pushProgrammes', e?.message, { error: e?.message }); }
}

async function _pushRoutinesAndExercises(sb, supabaseUserId, localUserId) {
  try {
    // Clear orphan routine_exercises (parent routine row missing) just
    // before computing the push set. Boot-time cleanup only catches
    // orphans that exist at app start; any created mid-session (e.g.
    // routine hard-deleted during a cloud restore) leak through and
    // log "orphan routine_exercises skipped" on every push cycle until
    // the next boot. Running the cleanup here makes the warning fire
    // at most once per genuine state-drift event, not every 5 minutes.
    await cleanupOrphanRoutineExercises().catch(() => {});
    // Track which routine ids actually landed in cloud this cycle: a
    // routine whose own upsert fails must not let its child
    // routine_exercises through the orphan filter below, or their FK
    // check (routines.id = routine_exercises.routine_id) fails RLS
    // against a parent that isn't there (Sentry VOLYUME-1A).
    const succeededRoutineIds = new Set();
    const routines = await getAllRoutinesForUser(localUserId);
    if (routines?.length) {
      // programme_id, day_of_week, is_sample, is_library, source_routine_id
      // are added to the cloud routines table in migrate_010. They were
      // local-only before, which is why a fresh-device sign-in restored
      // 114 routines but lost the link back to the active plan, every
      // routine came back with programme_id = null and the plan-detail
      // screen showed "0 workouts".
      const rows = routines.map(r => ({
        id: r.id, user_id: supabaseUserId,
        name: r.name, description: r.description ?? null,
        split_type: r.splitType ?? null,
        is_active: r.isActive == null ? true : !!r.isActive,
        programme_id: r.programmeId ?? null,
        day_of_week: r.dayOfWeek ?? null,
        is_sample: !!r.isSample,
        is_library: !!r.isLibrary,
        source_routine_id: r.sourceRoutineId ?? null,
        // Day-level plan reorder (migrate_113, founder-run). Column
        // tolerance below (drop position and retry) keeps every other
        // field syncing on installs that haven't had the migration applied
        // yet, matching migrate_094/migrate_112's OPTIONAL_COLUMNS pattern.
        position: r.position ?? null,
        updated_at: new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toISOString(), // F5 Phase A: honest edit time
      }));
      // Chunk so a single row's RLS rejection doesn't take the whole
      // library down, and so the payload stays small.
      let rPushed = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const slice = rows.slice(i, i + 200);
        let { error: rErr } = await sb.from('routines').upsert(slice, { onConflict: 'user_id,id' });
        if (rErr && /position/i.test(String(rErr?.message))) {
          // migrate_113 not applied on this environment yet: drop the new
          // column and retry so the rest of the row keeps syncing.
          const withoutPosition = slice.map(({ position: _pos, ...rest }) => rest);
          ({ error: rErr } = await sb.from('routines').upsert(withoutPosition, { onConflict: 'user_id,id' }));
        }
        if (rErr) {
          logPgErr('sync._pushRoutines', rErr);
        } else {
          rPushed += slice.length;
          for (const row of slice) succeededRoutineIds.add(row.id);
        }
      }
      if (rPushed < rows.length) {
        logWarn('sync._pushRoutines', 'partial push', { pushed: rPushed, total: rows.length });
      }
    }
    const routineExs = await getAllRoutineExercisesForUser(localUserId);
    if (routineExs?.length) {
      // starting_weight, rest_seconds, superset_group_id are also added
      // by migrate_010, they govern the pre-filled weight, the rest
      // timer default, and superset pairing. Without them, every restore
      // dropped users back to the global default rest timer.
      //
      // exercise_name is the denormalised display name added by
      // migrate_012, it's what makes a routine recoverable on a new
      // device even if the exercise_id can't resolve locally.
      //
      // Filter: drop routine_exercises whose routine_id doesn't appear
      // among the routines that ACTUALLY succeeded this cycle (not just
      // every local routine). Cloud RLS on routine_exercises checks
      // EXISTS (SELECT 1 FROM routines WHERE id = routine_id AND
      // user_id = auth.uid()); an orphan routine_id (left over from a
      // soft-deleted routine, a partial local sync state, or -- the bug
      // this used to miss -- a routine whose own upsert failed this very
      // cycle) fails that check and rejects the entire 200-row chunk.
      // Excluding orphans keeps the rest of the batch alive.
      const pushableRoutineIds = succeededRoutineIds;
      const rows = routineExs
        .filter(re => pushableRoutineIds.has(re.routineId))
        .map(re => ({
          // Send user_id explicitly (composite PK is (user_id, id)) rather
          // than relying on the migrate_018 inheritance trigger, matching the
          // sibling routines/mesocycles pushes (audit A2).
          id: re.id, user_id: supabaseUserId,
          routine_id: re.routineId, exercise_id: re.exerciseId,
          exercise_name: re.exerciseName ?? null,
          order_in_routine: re.orderInRoutine ?? 0,
          recommended_sets: re.recommendedSets ?? 3,
          recommended_reps_min: re.recommendedRepsMin ?? 6,
          recommended_reps_max: re.recommendedRepsMax ?? 12,
          notes: re.notes ?? null,
          starting_weight: re.startingWeight ?? null,
          rest_seconds: re.restSeconds ?? null,
          superset_group_id: re.supersetGroupId ?? null,
          // F5 Phase A: previously pushed with NO updated_at, so the cloud
          // value never moved on upsert and delta pulls could not see edits.
          updated_at: new Date(re.updatedAt ?? re.createdAt ?? Date.now()).toISOString(),
          // Tombstone: soft-deleted routine_exercises MUST carry deleted_at to
          // cloud, otherwise the cloud row stays alive and the next pull
          // resurrects a locally-removed exercise. getAllRoutineExercisesForUser
          // intentionally includes deleted rows so this push propagates them.
          deleted_at: re.deletedAt ? new Date(re.deletedAt).toISOString() : null,
        }));
      const orphanCount = routineExs.length - rows.length;
      if (orphanCount > 0) {
        // cleanupOrphanRoutineExercises() above already deletes children whose
        // parent routine is gone, so any orphan reaching here has a parent that
        // exists locally but was filtered out of the pushable set (inactive /
        // library). That is expected, not a fault, and the count is diagnostic
        // only — a warning-level Sentry event per push cycle was quota noise
        // (audit S-009, Sentry VOLYUME-8). logInfo keeps it in the breadcrumb
        // trail so it still enriches any later sync error, without a standalone
        // event. If orphanCount is ever seen to be non-trivial, revisit the
        // parent/child selection rather than re-promoting the log.
        logInfo('sync._pushRoutinesAndExercises', 'orphan routine_exercises skipped', { orphanCount });
      }
      for (let i = 0; i < rows.length; i += 200) {
        const { error: reErr } = await sb.from('routine_exercises').upsert(
          rows.slice(i, i + 200), { onConflict: 'user_id,id' },
        );
        if (reErr) logPgErr('sync._pushRoutineExercises', reErr);
      }
    }
  } catch (e) { logBulkWarn('sync._pushRoutinesAndExercises', e?.message, { error: e?.message }); }
}

async function _pushMesocycles(sb, supabaseUserId, localUserId) {
  try {
    const mesos = await getAllMesocyclesForUser(localUserId);
    if (mesos?.length) {
      // The cloud mesocycles schema declares start_date and end_date as
      // NOT NULL. Local rows can legitimately have nulls (a planned
      // block before its first week is laid out), so filter those out
      // rather than letting the whole batch reject.
      const rows = mesos.map(m => ({
        id: m.id, user_id: supabaseUserId,
        name: m.name,
        start_date: m.startDate ?? null,
        end_date: m.endDate ?? null,
        duration_weeks: m.durationWeeks ?? null,
        // Wave 2 (cross-surface-consistency-audit-2026-07-30): planned_weeks
        // is the authoritative schedule-length field and was never pushed,
        // so the cloud column sat at its DEFAULT 5 and the next pull
        // overwrote a genuine local 6+ back down to 5 -- the root cause of
        // "Week 2 of 5" vs "of 6" on the same block. block_type and
        // rir_ladder round-trip through the pull path too
        // (insertMesocycleFromCloud) but were never pushed either, so they
        // carried the same silent-overwrite risk; pushed here for the same
        // reason. `status` is NOT pushed: it is set once at creation and
        // never mutated anywhere in the app today (verified), so there is
        // no local value at risk of being overwritten yet, and pulling it
        // back would need insertMesocycleFromCloud's column list extended
        // too -- left as a follow-up if/when something starts writing it.
        planned_weeks: m.plannedWeeks ?? m.durationWeeks ?? null,
        block_type: m.blockType ?? null,
        rir_ladder: m.rirLadder ?? null,
        // Founder GO 2026-08-06: cloud column added by migrate_129. ORDER
        // MATTERS: that migration must run against production before a
        // build carrying this line ships, or the whole mesocycles upsert
        // batch rejects on the unknown column. The pull side
        // (insertMesocycleFromCloud) already prefers deload_week when
        // present, so this closes the round trip.
        deload_week: m.deloadWeek ?? null,
        // Stage 6 (2026-08-09): the Block Ledger JSON. Cloud column added by
        // migrate_131 — ORDER MATTERS exactly like deload_week above: that
        // migration must run against production before a build carrying
        // this line ships, or the whole mesocycles upsert batch rejects.
        // The pull side (insertMesocycleFromCloud) preserves a local ledger
        // when the cloud row carries none, so the round trip cannot wipe.
        // Parsed to an OBJECT for the jsonb column — a raw string would
        // store double-encoded.
        // Campaign 1 P0-8 D1: when this device has NO ledger (stale device,
        // pre-campaign row, unparseable text) the key is OMITTED entirely -
        // an upsert without the column leaves the cloud value untouched,
        // whereas the old explicit null ERASED a stored ledger from the
        // cloud and a later fresh-install restore lost it for good.
        ...((() => {
          if (!m.blockLedger) return {};
          try {
            const v = JSON.parse(m.blockLedger);
            return v == null ? {} : { block_ledger: v };
          } catch (_) { return {}; }
        })()),
        focus: m.focus ?? null,
        is_active: !!m.isActive,
        // Campaign 1 review finding 12: ship the block's REAL creation
        // time. Without it the cloud column defaulted to first-push time,
        // and created_at is the tiebreak both getActiveBlock and
        // getAchievedWeeklyPeaks order by after a restore.
        created_at: new Date(m.createdAt ?? Date.now()).toISOString(),
        updated_at: new Date(m.updatedAt ?? m.createdAt ?? Date.now()).toISOString(), // F5 Phase A: honest edit time
      })).filter(r => r.start_date && r.end_date);
      if (rows.length) {
        const { error } = await sb.from('mesocycles').upsert(rows, { onConflict: 'user_id,id' });
        if (error) logPgErr('sync._pushMesocycles', error);
      }
    }
    const weeks = await getAllMesocycleWeeksForUser(localUserId);
    if (weeks?.length) {
      const rows = weeks.map(w => ({
        // Explicit user_id for the (user_id, id) composite PK, not relying on
        // the inheritance trigger alone (audit A2).
        id: w.id, user_id: supabaseUserId,
        mesocycle_id: w.mesocycleId,
        week_number: w.weekIndex ?? w.weekNumber ?? 1,
        is_deload: !!w.isDeload,
        notes: w.notes ?? null,
        updated_at: new Date(w.updatedAt ?? w.createdAt ?? Date.now()).toISOString(), // F5 Phase A
      }));
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await sb.from('mesocycle_weeks').upsert(
          rows.slice(i, i + 200), { onConflict: 'user_id,id' },
        );
        if (error) logPgErr('sync._pushMesocycleWeeks', error);
      }
    }
  } catch (e) { logBulkWarn('sync._pushMesocycles', e?.message, { error: e?.message }); }
}

async function _pushMorningWeights(sb, supabaseUserId, localUserId) {
  try {
    const weights = await getAllMorningWeightsForUser(localUserId);
    if (!weights?.length) return;
    const rows = weights.map(w => ({
      id: w.id, user_id: supabaseUserId,
      weight_kg: w.weightKg,
      logged_at: msToISO(w.loggedAt),
      notes: w.notes ?? null,
      // Campaign 1 review findings 9/12: real creation time rides too, so
      // the pull-side preservation has something honest to preserve.
      created_at: new Date(w.createdAt ?? Date.now()).toISOString(),
      updated_at: new Date(w.updatedAt ?? w.loggedAt ?? Date.now()).toISOString(), // F5 Phase A
      // C6 R-8: the soft-delete tombstone rides too, so a deletion made
      // here reaches the cloud (whose pulls filter deleted_at IS NULL)
      // and therefore every other device.
      deleted_at: w.deletedAt != null ? new Date(w.deletedAt).toISOString() : null,
    })).filter(r => r.logged_at && r.weight_kg != null);
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('morning_weights').upsert(
        rows.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushMorningWeights', error);
    }
  } catch (e) { logBulkWarn('sync._pushMorningWeights', e?.message, { error: e?.message }); }
}

async function _pushCoachOutputs(sb, supabaseUserId, localUserId) {
  try {
    const outputs = await getAllCoachOutputsForUser(localUserId);
    if (!outputs?.length) return;
    const rows = outputs.map(o => ({
      id: o.id, user_id: supabaseUserId,
      week_start: o.weekStart,
      output_json: o.outputJson,
      applied: !!o.applied,
      // F5 Phase A: previously pushed with NO updated_at, so flipping
      // 'applied' never bumped the cloud row and delta pulls missed it.
      updated_at: new Date(o.updatedAt ?? Date.now()).toISOString(),
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('coach_outputs').upsert(
        rows.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushCoachOutputs', error);
    }
  } catch (e) { logBulkWarn('sync._pushCoachOutputs', e?.message, { error: e?.message }); }
}

// ─── Push helpers for previously local-only tables ───────────────────────
// Each helper batches its table's rows into 200-row chunks and logs the
// full Postgres error metadata via logPgErr when an upsert is rejected.
// Failures don't propagate, a single bad table doesn't stop the rest
// of the bulk upload.

async function _pushExerciseUserNotes(sb, supabaseUserId, localUserId) {
  try {
    const notes = await getAllExerciseUserNotesForUser(localUserId);
    if (!notes?.length) return;
    const rows = notes.map(n => ({
      id: n.id, user_id: supabaseUserId,
      exercise_id: n.exerciseId, note: n.note ?? '',
      created_at: new Date(n.createdAt ?? Date.now()).toISOString(),
      updated_at: new Date(n.updatedAt ?? n.createdAt ?? Date.now()).toISOString(),
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('exercise_user_notes').upsert(
        rows.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushExerciseUserNotes', error);
    }
  } catch (e) { logBulkWarn('sync._pushExerciseUserNotes', e?.message); }
}

async function _pushUserBodyProfile(sb, supabaseUserId, localUserId) {
  try {
    const p = await getUserBodyProfile(localUserId);
    if (!p) return;
    const { error } = await sb.from('user_body_profile').upsert({
      user_id: supabaseUserId,
      sex: p.sex ?? null,
      date_of_birth: p.dateOfBirth ?? null,
      height_cm: p.heightCm ?? null,
      experience_level: p.experienceLevel ?? null,
      training_age_years: p.trainingAgeYears ?? null,
      primary_goal: p.primaryGoal ?? null,
      scoff_score: p.scoffScore ?? null,
      gdpr_consented: !!p.gdprConsented,
      // Campaign 1 P0-8 D13: the goal lock has always had cloud columns
      // (migrate_017) but was never pushed, so it stayed device-local.
      goal_lock_advanced: !!p.goalLockAdvanced,
      goal_lock_set_at: p.goalLockSetAt ? new Date(p.goalLockSetAt).toISOString() : null,
      // Campaign 1 P0-8 D14: the row's HONEST edit time, not now().
      // Stamping now() on every push meant a device that had not synced
      // since before the user changed these values uploaded its stale
      // copy carrying the freshest timestamp in the account, which then
      // beat every LWW gate. scoff_score is ED-screening data.
      updated_at: new Date(p.updatedAt ?? p.createdAt ?? Date.now()).toISOString(),
    }, { onConflict: 'user_id' });
    if (error) logPgErr('sync._pushUserBodyProfile', error);
  } catch (e) { logBulkWarn('sync._pushUserBodyProfile', e?.message); }
}

async function _pushUserInsights(sb, supabaseUserId, localUserId) {
  try {
    const rows = await getAllUserInsightsForUser(localUserId);
    if (!rows?.length) return;
    const payload = rows.map(r => ({
      id: r.id, user_id: supabaseUserId,
      insight_key: r.insightKey, type: r.type ?? null,
      severity: r.severity ?? null, copy: r.copy ?? null,
      action_payload: r.actionPayload ?? null,
      generated_at: r.generatedAt ? new Date(r.generatedAt).toISOString() : new Date().toISOString(),
      dismissed_at: r.dismissedAt ? new Date(r.dismissedAt).toISOString() : null,
      updated_at: new Date(r.updatedAt ?? r.generatedAt ?? Date.now()).toISOString(), // F5 Phase A: honest edit time
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await sb.from('user_insights').upsert(
        payload.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushUserInsights', error);
    }
  } catch (e) { logBulkWarn('sync._pushUserInsights', e?.message); }
}

async function _pushWorkoutNotes(sb, supabaseUserId, localUserId) {
  try {
    const rows = await getAllWorkoutNotesForUser(localUserId);
    if (!rows?.length) return;
    const payload = rows.map(r => ({
      id: r.id, user_id: supabaseUserId,
      workout_id: r.workoutId, note: r.note,
      created_at: new Date(r.createdAt ?? Date.now()).toISOString(),
      updated_at: new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toISOString(),
      deleted_at: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await sb.from('workout_notes').upsert(
        payload.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushWorkoutNotes', error);
    }
  } catch (e) { logBulkWarn('sync._pushWorkoutNotes', e?.message); }
}

async function _pushExerciseGoals(sb, supabaseUserId, localUserId) {
  try {
    const rows = await getAllExerciseGoalsForUser(localUserId);
    if (!rows?.length) return;
    const payload = rows.map(r => ({
      id: r.id, user_id: supabaseUserId,
      exercise_id: r.exerciseId,
      target_weight: r.targetWeight ?? null,
      target_reps: r.targetReps ?? null,
      target_date: r.targetDate ?? null,
      notes: r.notes ?? null,
      created_at: new Date(r.createdAt ?? Date.now()).toISOString(),
      updated_at: new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toISOString(),
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await sb.from('exercise_goals').upsert(
        payload.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushExerciseGoals', error);
    }
  } catch (e) { logBulkWarn('sync._pushExerciseGoals', e?.message); }
}

async function _pushPeakWeekPlans(sb, supabaseUserId, localUserId) {
  try {
    const rows = await getAllPeakWeekPlansForUser(localUserId);
    if (!rows?.length) return;
    const payload = rows.map(r => ({
      id: r.id, user_id: supabaseUserId,
      show_date: r.showDate ?? null,
      federation: r.federation ?? null,
      current_bodyweight: r.currentBodyweight ?? null,
      lean_estimate: r.leanEstimate ?? null,
      prep_carbs_per_kg: r.prepCarbsPerKg ?? null,
      prep_sodium_mg: r.prepSodiumMg ?? null,
      prep_water_l: r.prepWaterL ?? null,
      status: r.status ?? 'active',
      created_at: new Date(r.createdAt ?? Date.now()).toISOString(),
      updated_at: new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toISOString(),
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await sb.from('peak_week_plans').upsert(
        payload.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushPeakWeekPlans', error);
    }
  } catch (e) { logBulkWarn('sync._pushPeakWeekPlans', e?.message); }
}

async function _pushPlannedMuscleVolume(sb, supabaseUserId, localUserId) {
  try {
    const rows = await getAllPlannedMuscleVolumeForUser(localUserId);
    if (!rows?.length) return;
    // Campaign 1 P0-1: mev/mav/mrv/source now ride to the cloud
    // (migrate_132) so the adaptive seed provenance survives a device
    // change - the explanation surfaces derive from the written rows and
    // their source labels, and those used to be device-local only.
    const payload = rows.map(r => ({
      id: r.id, user_id: supabaseUserId,
      mesocycle_week_id: r.mesocycleWeekId,
      muscle: r.muscle,
      planned_sets: r.plannedSets ?? null,
      mev: r.mev ?? null,
      mav: r.mav ?? null,
      mrv: r.mrv ?? null,
      source: r.source ?? null,
      created_at: new Date(r.createdAt ?? Date.now()).toISOString(),
      updated_at: new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toISOString(),
      deleted_at: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
    }));
    // Column tolerance until migrate_132 is applied (profiles.js pattern):
    // PostgREST rejects a whole upsert for one unknown column, so on error
    // retry the batch without the provenance columns - set counts keep
    // syncing exactly as before the fix, nothing regresses pre-migration.
    const stripProvenance = (batch) => batch.map(({ mev, mav, mrv, source, ...rest }) => rest);
    for (let i = 0; i < payload.length; i += 200) {
      const batch = payload.slice(i, i + 200);
      let { error } = await sb.from('planned_muscle_volume').upsert(
        batch, { onConflict: 'user_id,id' },
      );
      if (error) {
        ({ error } = await sb.from('planned_muscle_volume').upsert(
          stripProvenance(batch), { onConflict: 'user_id,id' },
        ));
      }
      if (error) logPgErr('sync._pushPlannedMuscleVolume', error);
    }
  } catch (e) { logBulkWarn('sync._pushPlannedMuscleVolume', e?.message); }
}

async function _pushAdaptationEvents(sb, supabaseUserId, localUserId) {
  try {
    const rows = await getAllAdaptationEventsForUser(localUserId);
    if (!rows?.length) return;
    // Local schema uses decision/reason_code/signals_json; cloud schema
    // uses event_type (NOT NULL) + payload (JSON). Map decision → event_type
    // since decision is locally NOT NULL, and roll the rest of the richer
    // local fields into the payload column so nothing is lost.
    const payload = rows.map(r => ({
      id: r.id, user_id: supabaseUserId,
      mesocycle_week_id: r.mesocycleWeekId ?? null,
      event_type: r.eventType ?? r.decision ?? 'unknown',
      payload: r.payload ?? {
        decision: r.decision ?? null,
        delta: r.delta ?? null,
        muscle: r.muscle ?? null,
        exercise_id: r.exerciseId ?? null,
        reason_code: r.reasonCode ?? null,
        reason_text: r.reasonText ?? null,
        signals: (() => { try { return r.signalsJson ? JSON.parse(r.signalsJson) : null; } catch (_) { return null; } })(),
      },
      recorded_at: new Date(r.recordedAt ?? r.createdAt ?? Date.now()).toISOString(),
      created_at: new Date(r.createdAt ?? Date.now()).toISOString(),
      updated_at: new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toISOString(),
      deleted_at: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await sb.from('adaptation_events').upsert(
        payload.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushAdaptationEvents', error);
    }
  } catch (e) { logBulkWarn('sync._pushAdaptationEvents', e?.message); }
}


// ─── AsyncStorage prefs sync ─────────────────────────────────────────────
// Every @volyume_ prefix key in AsyncStorage that isn't an excluded
// internal key gets shipped to the user_prefs (user_id, key, value)
// table. On a new device pull, _pullUserPrefs writes them back into
// AsyncStorage so the user's units, accessibility, wellbeing mode,
// and one-time seen-flags all restore exactly.

const PREF_PREFIX = '@volyume_';
// Keys that hold transient or device-specific state, never sync.
// crash_log: ephemeral diagnostic ring buffer.
// local_user_id: per-device anonymous id, regenerated on a fresh install.
// palette_recents: local-only ordering of recently-opened items.
const PREF_EXCLUDE_PATTERNS = [
  /^@volyume_crash_log$/,
  /^@volyume_local_user_id$/,
  /^@volyume_palette_recents/,
  // Notification subscriptions are tied to a device-bound expo push
  // token; syncing them across devices would resubscribe the wrong
  // token. The user's stated reminder preferences ARE synced (see
  // training_reminders_config below), only the token/subscription
  // mapping is device-bound.
  /^@volyume_expo_push_token/,
  // F1 (audit SD-1, CRITICAL): sync cursors and watermarks are DEVICE state.
  // They rode this prefs sync keyed by the Supabase uid, so two devices on
  // one account overwrote each other's cursors ("cloud value wins"); an
  // imported fresher push watermark defeats the advance-only-on-clean-push
  // hold-back, silently skipping rows that failed to push — which the
  // sign-out wipe then destroys. Imported pull watermarks likewise create
  // silent pull gaps. Never sync any cursor/watermark key.
  /^@volyume_pull_wm_/,
  /^@volyume_push_wm_/,
  /^@volyume_food_last_pushed_/,
  /^@volyume_food_last_pulled_/,
  // The in-progress workout crash snapshot is a per-device recovery
  // artefact (multi-KB, mutates on every set edit); syncing it ping-pongs
  // another device's live session onto this one.
  /^@volyume_active_workout/,
  // Baseline timezone offset for the notification re-lay check: strictly
  // this device's timezone, meaningless on any other.
  /^@volyume_notif_tz_offset/,
  // ─── Sensitive / special-category keys (Codex audit AC-01/H-03, 2026-07-12) ───
  // This prefs sync is allow-by-prefix: everything @volyume_ ships unless it
  // is excluded here. That is fail-open, so special-category health data must
  // be named explicitly until the allow-by-prefix model is inverted to a
  // fail-closed allowlist (follow-up on the same audit). Each key below is
  // either special-category health data the wellbeing screen PROMISES stays
  // device-only, or a transient diagnostic/draft that has no business in the
  // cloud. Their real, non-sensitive counterparts (wellbeing MODE, reminder
  // config, units) sync through their own keys/tables and are unaffected.
  /^@volyume_scoff_answers$/,       // raw ED-screening answers (Article 9 + "device-only" promise)
  // Campaign 1 P0-2 (2026-08-10): the analytics opt-out. privacyPrefs.js's
  // contract has always read "a privacy opt-out should not itself be
  // transmitted, so this never goes through pref sync" - but the key was
  // missed from this list, so the bulk push shipped it and the pull could
  // write a remote copy back over a stricter local choice. Excluding it
  // here closes BOTH directions (the pull applies the same filter), and
  // rows already uploaded by older builds go frozen-stale and are never
  // imported (same posture as the cursor keys above). Cloud row cleanup:
  // supabase/migrate_133_delete_privacy_pref_rows.sql (founder-gated).
  /^@volyume_privacy_prefs$/,
  /^@volyume_cycle_tracking/,       // menstrual-cycle data (Article 9)
  /^@volyume_error_log/,            // diagnostic ring buffer (may hold raw messages/paths)
  /^@volyume_last_crash_meta/,      // last-crash metadata
  /^@volyume_feedback_/,            // pending feedback + prompt history (free text)
  /^@volyume_pro_onboarding_draft/, // in-progress onboarding answers (sex/goals), transient
  // Campaign 1 P0-8 D10/D11: the per-key local write stamps written by
  // notePrefWrite. They record when THIS device last wrote a guarded
  // pref, so they are device state by definition - syncing them would
  // import another device's clock and defeat the guard they exist for
  // (exactly the failure the cursor/watermark exclusions above fix).
  /^@volyume_pref_written_at_/,
];

export function shouldSyncPref(key) {
  if (!key.startsWith(PREF_PREFIX)) return false;
  return !PREF_EXCLUDE_PATTERNS.some(re => re.test(key));
}

// ─── Guarded prefs (Campaign 1 P0-8 D10/D11) ─────────────────────────────
// Two pref families carry state a stale device must never overwrite:
//
//   @volyume_landmarks_<uid>  manual MEV/MAV/MRV overrides. One whole-blob
//                             value for every muscle at once, so a losing
//                             collision silently discards the user's hand-set
//                             targets with no merge and no notice. Manual
//                             overrides must never be silently lost.
//   @volyume_wellbeing_mode   calm mode. Calm is the STRICTER, ED-safer
//                             state: it gates ED-adjacent copy, the
//                             progress-photo card and the ledger's
//                             suppressed flag. A device that knows less
//                             must never be able to turn it off.
//
// The generic prefs pull is "cloud value wins unconditionally", which is
// fine for units and seen-flags and wrong for both of these.
export const PREF_WRITE_STAMP_PREFIX = '@volyume_pref_written_at_';
const WELLBEING_PREF_KEY = '@volyume_wellbeing_mode';
const GUARDED_PREF_PATTERNS = [
  /^@volyume_landmarks_/,
  /^@volyume_wellbeing_mode$/,
  // C6 F4 (D97): the per-uid profile blob carries coachTone, coachAutonomy,
  // showScience, bodyWeightUnits and the mealPlan prefs - none of which
  // exist as cloud columns. A stale device's routine bulk push must not
  // make an old blob look freshest; saveLocalProfile stamps every real
  // user write (the reinstall rebuild write deliberately does NOT, and is
  // additionally suppressed from the push below).
  /^@volyume_user_profile_/,
  // C6 R-11 (D97-22): the per-user streak blob carries explicit user
  // choices (manual goal, pauses) plus the retro-shrink guard's
  // high-water record and seen-milestones - a stale device's unguarded
  // "cloud wins" push discarded pauses (re-breaking runs retroactively)
  // and re-fired milestones. saveStreakState stamps every write.
  /^@volyume_streak_v1_/,
  // C6 S-2 (D97-23): the notification-pref blob and quiet hours are
  // explicit user choices; unguarded they were LAST-SYNCER-wins (push
  // stamps push time), so a stale device's routine sync reverted a
  // reminder or quiet-hours change on BOTH devices. Every writer stamps.
  // The deletion/tombstone half of the family (S-3) stays with the
  // founder's FR-C4-2 architecture question - no wholesale consolidation.
  /^@volyume_notification_prefs$/,
  /^@volyume_quiet_hours_v1$/,
];

export function isGuardedPref(key) {
  return typeof key === 'string' && GUARDED_PREF_PATTERNS.some(re => re.test(key));
}

/**
 * Record that THIS device just wrote a guarded pref locally.
 *
 * Called from the write sites (the landmark editor's save/reset paths and
 * setWellbeingMode), immediately after the AsyncStorage write. The stamp
 * is what _pullUserPrefs compares the cloud row's updated_at against, so
 * a cloud copy that is older than this device's own edit is dropped
 * instead of applied. Best-effort and never throws: a missing stamp only
 * costs the extra protection, it cannot break the write it follows.
 */
export async function notePrefWrite(key) {
  if (!isGuardedPref(key)) return;
  try {
    await AsyncStorage.setItem(PREF_WRITE_STAMP_PREFIX + key, String(Date.now()));
  } catch (_) { /* best-effort: the pull falls back to the monotonic rules */ }
}

/**
 * Campaign 1 review finding 5: the cloud updated_at for a guarded pref
 * must be the VALUE's edit time, not the push time. Both push paths used
 * to stamp now(), so a stale device's routine sync made its old blob
 * look freshest and the pull-side stamp rule was reading laundered
 * timestamps. The stamp (notePrefWrite on local edits; the cloud row's
 * updated_at recorded at pull time for values learned from another
 * device) is the value's provenance and travels with it. A guarded key
 * with no stamp at all (legacy value, never edited post-fix) seeds with
 * now() once - after which the stamp cycle keeps it honest.
 */
async function _guardedPrefUpdatedAt(key) {
  if (!isGuardedPref(key)) return new Date().toISOString();
  try {
    const raw = await AsyncStorage.getItem(PREF_WRITE_STAMP_PREFIX + key);
    const ms = Number(raw);
    if (Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString();
  } catch (_) { /* fall through */ }
  return new Date().toISOString();
}

/**
 * Push one preference key to the cloud. Idempotent, upsert on
 * (user_id, key). Called from the store whenever a synced
 * preference changes so the cloud copy stays current.
 */
export async function syncUserPref(supabaseUserId, key, value) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !key || !shouldSyncPref(key)) return;
  // Re-triage 2026-08-01: covered wholesale by the next good syncAll's bulk
  // push, so a dead session defers with no queue entry and no data loss.
  if (await _blockedByDeadSession('sync.syncUserPref')) return;
  try {
    const { error } = await sb.from('user_prefs').upsert({
      user_id: supabaseUserId, key,
      value: value == null ? '' : String(value),
      // Finding 5: honest edit time for guarded keys, push time otherwise.
      updated_at: await _guardedPrefUpdatedAt(key),
    }, { onConflict: 'user_id,key' });
    if (error) logPgErr('sync.syncUserPref', error);
  } catch (e) { logWarn('sync.syncUserPref', e?.message, { key }); }
}


async function _pushAllUserPrefs(sb, supabaseUserId) {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    let keys = allKeys.filter(shouldSyncPref);
    // C6 F4 (D97): a machine-rebuilt profile blob (reinstall restore, no
    // user write yet this session) must never be pushed - in the
    // push-before-pull order it would overwrite the cloud's only good
    // copy with defaults, permanently on a single-device reinstall. The
    // flag clears on the first real saveLocalProfile.
    try {
      // eslint-disable-next-line global-require
      const store = require('../store/useAppStore').default;
      if (store.getState()._profileBlobRebuilt) {
        keys = keys.filter((k) => !/^@volyume_user_profile_/.test(k));
      }
    } catch (_) { /* store unavailable: push as before */ }
    if (!keys.length) return;
    const pairs = await AsyncStorage.multiGet(keys);
    // Finding 5: guarded keys carry the value's honest edit time so a
    // stale device's routine bulk push can no longer make its old blob
    // look freshest and defeat the pull-side stamp rule.
    const rows = await Promise.all(pairs.map(async ([k, v]) => ({
      user_id: supabaseUserId, key: k,
      value: v == null ? '' : String(v),
      updated_at: await _guardedPrefUpdatedAt(k),
    })));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('user_prefs').upsert(
        rows.slice(i, i + 200), { onConflict: 'user_id,key' },
      );
      if (error) logPgErr('sync._pushAllUserPrefs', error);
    }
  } catch (e) { logBulkWarn('sync._pushAllUserPrefs', e?.message); }
}

// ─── Pull (new device) ────────────────────────────────────────────────────────

/**
 * Download cloud workouts that don't exist locally.
 * Used when signing into an existing account on a new device.
 * Returns the count of workouts downloaded.
 */
export async function pullFromCloud(supabaseUserId) {
  const sb = getClient();
  if (!sb || !supabaseUserId) return 0;
  if (await _blockedByDeadSession('sync.pullFromCloud')) return 0;
  // Article 9 gate (C-2, D96): this legacy pull moves special-category
  // health rows (morning weights, user_body_profile incl. scoff_score) and
  // must honour the SAME fail-closed consent predicate the registry runner
  // enforces (runner.js F2/SC-1). Home's pull-to-refresh calls this path
  // directly, so without this check an unresolved consent read could pull
  // health data. ANY read failure counts as unresolved (closed), never as
  // consent. Strictly strengthening; consented users are unaffected.
  try {
    // eslint-disable-next-line global-require
    const healthConsent = require('../store/useAppStore').default.getState()?.healthConsent;
    if (healthConsent !== true) {
      logWarn('sync.pullFromCloud', 'skipped: health consent unresolved or refused', { supabaseUserId });
      return 0;
    }
  } catch (_) {
    logWarn('sync.pullFromCloud', 'skipped: consent state unreadable (fails closed)', { supabaseUserId });
    return 0;
  }
  // F1 (audit SD-2): the sign-out wipe waits for sync idle with a 5s TIMEOUT.
  // If this pull is still mid-flight when that timeout expires, its inserts
  // would repopulate the DB being wiped and its watermark writes would land
  // after AsyncStorage.clear() — zombie rows for the old uid plus stale
  // cursors that make the same user's next sign-in skip their history. The
  // runner already re-checks the guard between migrated-table pulls; this
  // threads the same check through the legacy pull: bail between stages,
  // and never advance a cursor while a wipe is in progress.
  // eslint-disable-next-line global-require
  const { isSignOutWiping } = require('./sync/signOutGuard');
  const bailForWipe = (stage) => {
    if (!isSignOutWiping()) return false;
    logWarn('sync.pullFromCloud', `aborted at ${stage}: sign-out wipe in progress`, { supabaseUserId });
    return true;
  };
  if (bailForWipe('start')) return 0;
  // Pull every Pro-state table independently so a user with plans
  // but no workouts (or vice versa) still gets everything that IS
  // in the cloud restored locally. Earlier versions early-returned
  // on empty workouts, which meant a user whose previous install had
  // synced plans + nutrition but no completed sessions came back to
  // empty everything. Each per-table helper logs counts so we can
  // verify in Debug logs exactly what landed.
  let workoutCount = 0;
  let setCount = 0;
  let setFailures = 0;

  try {
    // ─── 1. Exercises FIRST ──────────────────────────────────────────────
    // routine_exercises and workout_sets carry exercise_id references
    // that need to resolve against local exercises. Pulling exercises
    // first means the FK targets exist before the dependent rows
    // arrive. Dedupe-by-name inside _pullExercises rewrites any
    // mismatched canonical IDs to the local deterministic one so old
    // cloud rows that pre-date deterministic IDs heal automatically.
    const exerciseCount = await _pullExercises(sb, supabaseUserId);
    if (bailForWipe('workouts')) return 0;

    // Incremental delta pull (GAP row 12b). On a warm cursor we ask the
    // cloud only for workouts changed since the last pull, instead of
    // re-downloading the entire session history every foreground. The
    // cursor lives in AsyncStorage and is cleared on sign-out, so a
    // fresh sign-in (cursor == 0) still does a full pull. The
    // (user_id, updated_at) index from migrate_012 backs this query.
    // Sets stay fetched by the pulled workouts' IDs below, so semantics
    // are unchanged except for the rows we skip re-pulling.
    const wmWorkouts = await getPullWatermark(supabaseUserId, 'workouts');
    const cloudWorkouts = await fetchAllRows(
      'sync.pullFromCloud.workouts',
      () => {
        let q = sb.from('workouts')
          .select('id, started_at, ended_at, duration_minutes, notes, is_completed, session_difficulty, overall_pump, soreness_24h_before, fatigue_level, routine_id, mesocycle_id, name, pre_workout_intent, set_count, total_volume, mesocycle_week_id, joint_discomfort, updated_at')
          .eq('user_id', supabaseUserId)
          .eq('is_completed', true)
          .is('deleted_at', null); // F5 Phase A: tombstone-aware (no-op until Phase B writes them)
        if (wmWorkouts > 0) q = q.gte('updated_at', isoFromMs(wmWorkouts));
        return q.order('started_at', { ascending: false });
      },
    );
    let workoutFailures = 0;
    if (cloudWorkouts?.length) {
      // First pass: insert every workout shell. Don't fetch sets per
      // workout (that was N+1 round-trips); batch them after.
      for (const w of cloudWorkouts) {
        try { await insertWorkoutFromCloud(supabaseUserId, w); workoutCount++; }
        catch (e) { workoutFailures++; logWarn('sync.pullFromCloud', 'workout insert failed', { workoutId: w?.id, error: e?.message }); }
      }
      // Second pass: one chunked query per ~200 workouts for their sets.
      if (bailForWipe('workout_sets')) return 0;
      const workoutIds = cloudWorkouts.map(w => w.id);
      const allSets = await fetchByIdsChunked(
        'sync.pullFromCloud.sets', 'workout_sets', 'workout_id', workoutIds,
      );
      for (const s of allSets) {
        try { await insertWorkoutSetFromCloud(supabaseUserId, s); setCount++; }
        catch (setErr) {
          setFailures++;
          logWarn('sync.pullFromCloud', 'set insert failed', {
            workoutId: s?.workout_id, setId: s?.id, error: setErr?.message,
          });
        }
      }
    }
    if (setFailures > 0) {
      logWarn('sync.pullFromCloud', `${setFailures} sets failed to insert`, { supabaseUserId });
    }
    // Advance the workouts cursor only on a clean pass. On any failure
    // the cursor stays put, so the next pull re-pulls the same (small,
    // idempotent) delta and retries rather than skipping the row for
    // good. nextWatermark never moves backwards, so an empty delta is a
    // no-op. Sign-out clears the cursor, so sign-in always full-pulls.
    if (workoutFailures === 0 && setFailures === 0 && !isSignOutWiping()) {
      await setPullWatermark(supabaseUserId, 'workouts', nextWatermark(wmWorkouts, cloudWorkouts));
    }

    // Pro-state tables. Each runs independently regardless of whether
    // workouts came back; one missing table doesn't break the others.
    // The wipe guard is re-checked between helpers (each is bounded, so
    // per-helper granularity closes the realistic race window).
    if (bailForWipe('pro_state')) return workoutCount;
    const programmeCount = await _pullProgrammes(sb, supabaseUserId);
    const routineCount = await _pullRoutinesAndExercises(sb, supabaseUserId);
    if (bailForWipe('mesocycles')) return workoutCount;
    const mesoCount = await _pullMesocycles(sb, supabaseUserId);
    const weightCount = await _pullMorningWeights(sb, supabaseUserId);
    // weekly_checkins_v2 moved to src/lib/sync/transport.js
    // (registry-driven per-table pull). See MIGRATED_TABLES.
    if (bailForWipe('coach_outputs')) return workoutCount;
    const coachCount = await _pullCoachOutputs(sb, supabaseUserId);
    // nutrition_targets moved to src/lib/sync/transport.js
    // (registry-driven per-table pull). See MIGRATED_TABLES.
    // body_composition_log moved to src/lib/sync/transport.js
    // (registry-driven per-table pull). See MIGRATED_TABLES.
    // New tables that previously stayed local-only on every cross-
    // device sign-in. Each is fault-tolerant, a missing cloud table
    // logs and returns 0 rather than crashing the whole pull.
    const bodyProfileFound = await _pullUserBodyProfile(sb, supabaseUserId);
    const insightCount = await _pullUserInsights(sb, supabaseUserId);
    if (bailForWipe('notes_goals')) return workoutCount;
    const exerciseNoteCount = await _pullExerciseUserNotes(sb, supabaseUserId);
    const workoutNoteCount = await _pullWorkoutNotes(sb, supabaseUserId);
    const goalCount = await _pullExerciseGoals(sb, supabaseUserId);
    const peakWeekCount = await _pullPeakWeekPlans(sb, supabaseUserId);
    const plannedVolCount = await _pullPlannedMuscleVolume(sb, supabaseUserId);
    const adaptCount = await _pullAdaptationEvents(sb, supabaseUserId);
    const customExerciseCount = await _pullCustomExercises(sb, supabaseUserId);
    // Prefs write straight into AsyncStorage — the exact store the wipe is
    // about to clear — so this is the most important late check.
    if (bailForWipe('user_prefs')) return workoutCount;
    const prefCount = await _pullUserPrefs(sb, supabaseUserId);
    // notification_preferences moved to src/lib/sync/transport.js
    // (registry-driven per-table pull). The runner now calls
    // transport.pullTable('notification_preferences', ...) directly
    // before this legacy bulk pull. Codex re-audit 2026-05-26 F6
    // is preserved in the new path (applyPreferenceFromPull).
    // Food-domain pull (food_entries, custom_foods, saved_meals,
    // recipes, food_favourites, daily_water, daily_intake_rollups)
    // moved to src/lib/sync/tables/foodDomain.js. Coordinator
    // drives food_sync_pull once per syncAll and reports per-table
    // counts via transport.pullTable.
    const foodCounts = {
      foodEntries: 0, customFoods: 0, savedMeals: 0,
      recipes: 0, favourites: 0, water: 0,
    };

    // Verbose success log so the user (and we) can see EXACTLY what
    // came back. The previous "silent return 0" path made it
    // impossible to tell whether the pull found the user's data or
    // not.
    logInfo('sync.pullFromCloud.done', `uid=${supabaseUserId}`, {
      exercises: exerciseCount,
      workouts: workoutCount,
      sets: setCount,
      programmes: programmeCount,
      routines: routineCount,
      mesocycles: mesoCount,
      morningWeights: weightCount,
      coachOutputs: coachCount,
      // checkins / nutritionTargets / bodyMetrics now counted in
      // src/lib/sync/runner.js under pullCountPerTable from the
      // per-table transport. This map is the legacy bulk pull
      // report and only tracks tables still owned by pullFromCloud.
      bodyProfile: bodyProfileFound ? 1 : 0,
      insights: insightCount,
      exerciseNotes: exerciseNoteCount,
      workoutNotes: workoutNoteCount,
      exerciseGoals: goalCount,
      customExercises: customExerciseCount,
      peakWeekPlans: peakWeekCount,
      plannedVolume: plannedVolCount,
      adaptationEvents: adaptCount,
      prefs: prefCount,
      // notificationPrefs intentionally not reported here: the table
      // moved to the registry-driven transport pull (see comment above
      // + src/lib/sync/tables/notificationPreferences.js). The runner
      // counts it under pullCountPerTable. Leaving the old
      // `notifPrefCount` reference here threw a Hermes ReferenceError
      // that aborted the whole pull into the catch (returned 0).
      foodEntries: foodCounts.foodEntries,
      customFoods: foodCounts.customFoods,
      savedMeals: foodCounts.savedMeals,
      recipes: foodCounts.recipes,
      favourites: foodCounts.favourites,
      water: foodCounts.water,
    });

    return workoutCount;
  } catch (e) {
    logError('sync.pullFromCloud', e, { supabaseUserId });
    return 0;
  }
}

/**
 * Pull every cloud exercise into local SQLite.
 *
 * Runs BEFORE routines / routine_exercises / workout_sets pulls so
 * those rows' exercise_id references resolve against the local
 * exercises table immediately.
 *
 * Dedupe-by-name logic:
 *   - Cloud row's id matches a local id → skip (already present)
 *   - Cloud row's name matches a local exercise of a different id
 *     → rewrite all local refs (routine_exercises / workout_sets /
 *       exercise_user_notes / exercise_goals) from the local id to
 *       the cloud id, then leave the local row at the cloud id.
 *       This is how an install whose deterministic canonical IDs
 *       differ from a sibling install (e.g. different app versions)
 *       gets the two devices' worlds joined up cleanly.
 *   - No match by id or name → INSERT as a new local exercise
 *     (custom or new canonical from a build the local app hasn't
 *     seeded yet).
 *
 * The function uses INSERT OR REPLACE under the hood via
 * insertOrUpdateExerciseFromCloud in database.js. Returns the number
 * of rows touched.
 */
async function _pullExercises(sb, supabaseUserId) {
  try {
    const data = await fetchAllRows(
      'sync._pullExercises',
      () => sb.from('exercises').select('*').eq('user_id', supabaseUserId).is('deleted_at', null),
    );
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const { insertOrUpdateExerciseFromCloud } = require('./database');
    let n = 0;
    for (const e of data) {
      try { await insertOrUpdateExerciseFromCloud(e); n++; }
      catch (err) { logWarn('sync._pullExercises', 'insert failed', { id: e?.id, error: err?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullExercises', e?.message); return 0; }
}

async function _pullUserBodyProfile(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('user_body_profile')
      .select('*').eq('user_id', supabaseUserId).maybeSingle();
    if (error) { logPgErr('sync._pullUserBodyProfile', error); return false; }
    if (!data) return false;
    // eslint-disable-next-line global-require
    const { insertOrUpdateUserBodyProfileFromCloud } = require('./database');
    try { await insertOrUpdateUserBodyProfileFromCloud(supabaseUserId, data); return true; }
    catch (e) { logWarn('sync._pullUserBodyProfile', 'insert failed', { error: e?.message }); return false; }
  } catch (e) { logWarn('sync._pullUserBodyProfile', e?.message); return false; }
}

async function _pullUserInsights(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('user_insights')
      .select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
    if (error) { logPgErr('sync._pullUserInsights', error); return 0; }
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const { insertOrUpdateUserInsightFromCloud } = require('./database');
    let n = 0;
    for (const row of data) {
      try { await insertOrUpdateUserInsightFromCloud(supabaseUserId, row); n++; }
      catch (e) { logWarn('sync._pullUserInsights', 'insert failed', { id: row?.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullUserInsights', e?.message); return 0; }
}

async function _pullExerciseUserNotes(sb, supabaseUserId) {
  try {
    const wm = await getPullWatermark(supabaseUserId, 'exercise_user_notes');
    let q = sb.from('exercise_user_notes').select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
    if (wm > 0) q = q.gte('updated_at', isoFromMs(wm));
    const { data, error } = await q;
    if (error) { logPgErr('sync._pullExerciseUserNotes', error); return 0; }
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const { insertOrUpdateExerciseUserNoteFromCloud } = require('./database');
    let n = 0;
    let failures = 0;
    for (const row of data) {
      try { await insertOrUpdateExerciseUserNoteFromCloud(supabaseUserId, row); n++; }
      catch (e) { failures++; logWarn('sync._pullExerciseUserNotes', 'insert failed', { id: row?.id, error: e?.message }); }
    }
    if (failures === 0) await setPullWatermark(supabaseUserId, 'exercise_user_notes', nextWatermark(wm, data));
    return n;
  } catch (e) { logWarn('sync._pullExerciseUserNotes', e?.message); return 0; }
}

async function _pullWorkoutNotes(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('workout_notes')
      .select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
    if (error) { logPgErr('sync._pullWorkoutNotes', error); return 0; }
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const { insertOrUpdateWorkoutNoteFromCloud } = require('./database');
    let n = 0;
    for (const row of data) {
      try { await insertOrUpdateWorkoutNoteFromCloud(supabaseUserId, row); n++; }
      catch (e) { logWarn('sync._pullWorkoutNotes', 'insert failed', { id: row?.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullWorkoutNotes', e?.message); return 0; }
}

async function _pullExerciseGoals(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('exercise_goals')
      .select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
    if (error) { logPgErr('sync._pullExerciseGoals', error); return 0; }
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const { insertOrUpdateExerciseGoalFromCloud } = require('./database');
    let n = 0;
    for (const row of data) {
      try { await insertOrUpdateExerciseGoalFromCloud(supabaseUserId, row); n++; }
      catch (e) { logWarn('sync._pullExerciseGoals', 'insert failed', { id: row?.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullExerciseGoals', e?.message); return 0; }
}

async function _pullCustomExercises(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('custom_exercises')
      .select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
    if (error) { logPgErr('sync._pullCustomExercises', error); return 0; }
    if (!data?.length) return 0;
    // Restore custom exercises into the LOCAL `exercises` table (is_custom=1),
    // NOT the local `custom_exercises` mirror. The whole app resolves an
    // exercise by id against `exercises` only (getAllExercises, routine/workout
    // joins, getExerciseById), and creation writes there too. Cloud keeps its
    // composite-PK `custom_exercises` table (migration 020/021); this only
    // fixes where the local restore lands. Before this, pulled customs went to
    // the orphaned local `custom_exercises` table and were invisible/unresolvable
    // after a reinstall or device swap. Soft-deleted customs are skipped so a
    // deleted exercise doesn't reappear.
    // eslint-disable-next-line global-require
    const { insertOrUpdateExerciseFromCloud } = require('./database');
    let n = 0;
    for (const row of data) {
      if (row?.deleted_at) continue;
      try { await insertOrUpdateExerciseFromCloud({ ...row, is_custom: 1 }); n++; }
      catch (e) { logWarn('sync._pullCustomExercises', 'insert failed', { id: row?.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullCustomExercises', e?.message); return 0; }
}

async function _pullPeakWeekPlans(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('peak_week_plans')
      .select('*').eq('user_id', supabaseUserId);
    if (error) { logPgErr('sync._pullPeakWeekPlans', error); return 0; }
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const { insertOrUpdatePeakWeekPlanFromCloud } = require('./database');
    let n = 0;
    for (const row of data) {
      try { await insertOrUpdatePeakWeekPlanFromCloud(supabaseUserId, row); n++; }
      catch (e) { logWarn('sync._pullPeakWeekPlans', 'insert failed', { id: row?.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullPeakWeekPlans', e?.message); return 0; }
}

async function _pullPlannedMuscleVolume(sb, supabaseUserId) {
  try {
    // Campaign 1 review finding 3: paginate. A bare select caps at
    // PostgREST's 1000 rows (~9 blocks of planned volume), and since
    // P0-1 made this pull the restore path for the PRIMARY table, a
    // long-tenured user's most recent blocks - including the active one -
    // silently failed to restore.
    const data = await fetchAllRows(
      'sync._pullPlannedMuscleVolume',
      () => sb.from('planned_muscle_volume').select('*').eq('user_id', supabaseUserId).is('deleted_at', null),
    );
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const { insertOrUpdatePlannedMuscleVolumeFromCloud } = require('./database');
    let n = 0;
    for (const row of data) {
      try { await insertOrUpdatePlannedMuscleVolumeFromCloud(supabaseUserId, row); n++; }
      catch (e) { logWarn('sync._pullPlannedMuscleVolume', 'insert failed', { id: row?.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullPlannedMuscleVolume', e?.message); return 0; }
}

async function _pullAdaptationEvents(sb, supabaseUserId) {
  try {
    const data = await fetchAllRows(
      'sync._pullAdaptationEvents',
      () => sb.from('adaptation_events').select('*').eq('user_id', supabaseUserId).is('deleted_at', null),
    );
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const { insertOrUpdateAdaptationEventFromCloud } = require('./database');
    let n = 0;
    for (const row of data) {
      try { await insertOrUpdateAdaptationEventFromCloud(supabaseUserId, row); n++; }
      catch (e) { logWarn('sync._pullAdaptationEvents', 'insert failed', { id: row?.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullAdaptationEvents', e?.message); return 0; }
}

/**
 * user_prefs pull.
 *
 * Reads every key/value row the user owns from the cloud `user_prefs` table and
 * mirrors them into local AsyncStorage via multiSet. The cloud value wins
 * unconditionally for ordinary keys (units, seen-flags): there is no per-key
 * updated_at comparison for those. The two GUARDED families (isGuardedPref)
 * are the exception, see filterGuardedPulledPrefs. Returns the number of keys
 * written. (Audit 2026-06-21: this docstring previously described a
 * notification_preferences / applyPreferenceFromPull / last-write-wins path
 * that this function does not implement.)
 */

/**
 * Campaign 1 P0-8 D10/D11. Drops the pulled entries that a stale device
 * must not be allowed to apply. Two rules, both narrow and both fail-safe:
 *
 *  1. STAMP RULE (both guarded families). If this device's own local
 *     write of the key (notePrefWrite) is at least as new as the cloud
 *     row's updated_at, keep the local value. That is what stops a stale
 *     device's landmark blob replacing manual overrides this device set
 *     more recently, in either direction.
 *
 *  2. CALM RATCHET (wellbeing key only). Even with no stamp at all, a
 *     pulled 'normal'/'unspecified' never replaces a local 'calm'. Calm
 *     is the stricter, ED-safer state and no remote device may weaken it.
 *     Consequence, stated plainly because it is a deliberate asymmetry:
 *     turning calm OFF applies on the device where the user turned it
 *     off (that device's own AsyncStorage write is the change) but does
 *     NOT propagate to another device that is already calm - that device
 *     keeps calm until the user turns it off there too. Rule 1 alone
 *     would not give this, because the cloud row can legitimately carry a
 *     newer updated_at than the calm device's stamp. Erring toward the
 *     safer state is the intended behaviour; the user can always turn
 *     calm off locally, and nothing remote can do it for them.
 *
 * Exported (rather than kept private) so both rules can be pinned
 * directly in src/lib/__tests__/campaign1.syncConflict.test.js without
 * standing up the whole pullFromCloud chain.
 */
export async function filterGuardedPulledPrefs(Storage, rows) {
  const guarded = rows.filter(r => isGuardedPref(r.key));
  if (!guarded.length) return rows;
  // Campaign 1 review findings 4 + 13: the guard itself FAILS CLOSED. A
  // failed stamp lookup, a failed local wellbeing read, or a cloud row
  // whose updated_at cannot be parsed all DROP the guarded rows rather
  // than applying them - a missed pull costs nothing (the next pull
  // retries); a mis-applied one silently reverts calm mode or hand-set
  // landmarks. This matches the campaign's posture everywhere else.
  let stamps = {};
  let stampsReadFailed = false;
  try {
    const pairs = await Storage.multiGet(guarded.map(r => PREF_WRITE_STAMP_PREFIX + r.key));
    stamps = Object.fromEntries(pairs);
  } catch (_) { stamps = {}; stampsReadFailed = true; }
  let localWellbeing = null;
  let wellbeingReadFailed = false;
  if (guarded.some(r => r.key === WELLBEING_PREF_KEY)) {
    try { localWellbeing = await Storage.getItem(WELLBEING_PREF_KEY); } catch (_) { wellbeingReadFailed = true; }
  }
  return rows.filter((r) => {
    if (!isGuardedPref(r.key)) return true;
    if (stampsReadFailed) return false;
    const cloudMs = timeToMs(r.updated_at);
    if (!Number.isFinite(cloudMs) || cloudMs <= 0) return false;
    const localStamp = Number(stamps[PREF_WRITE_STAMP_PREFIX + r.key] ?? NaN);
    if (Number.isFinite(localStamp) && localStamp >= cloudMs) return false;
    if (r.key === WELLBEING_PREF_KEY) {
      if (wellbeingReadFailed) return false;
      if (localWellbeing === 'calm' && r.value !== 'calm') return false;
    }
    return true;
  });
}
async function _pullUserPrefs(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('user_prefs')
      .select('*').eq('user_id', supabaseUserId);
    if (error) { logPgErr('sync._pullUserPrefs', error); return 0; }
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // F1 (audit SD-1): the pull applies the SAME exclusion filter as the push.
    // Device-bound keys (sync cursors/watermarks, the active-workout crash
    // snapshot, the timezone baseline) were pushed by older builds and still
    // exist as rows in the cloud for live users; with the push side no longer
    // refreshing them they are frozen-stale, and _pullUserPrefs runs LAST in
    // pullFromCloud — an unfiltered multiSet would overwrite the watermarks
    // the pull just set (silently skipping unpushed rows) and could resurrect
    // another device's dead workout snapshot.
    const rows = data.filter(r => shouldSyncPref(r?.key ?? ''));
    // Campaign 1 P0-8 D10/D11: the guarded families (manual landmarks,
    // calm mode) are filtered here, BEFORE the multiSet, so a stale
    // device can never silently discard a manual override or turn calm
    // mode back off.
    const kept = await filterGuardedPulledPrefs(AsyncStorage, rows);
    const entries = kept.map(r => [r.key, r.value == null ? '' : String(r.value)]);
    if (!entries.length) return 0;
    try { await AsyncStorage.multiSet(entries); } catch (_) {}
    // Finding 5: an applied guarded value carries its cloud edit time into
    // THIS device's stamp, so when this device later bulk-pushes the value
    // it ships the honest provenance rather than re-laundering it as new.
    try {
      const stampEntries = kept
        .filter(r => isGuardedPref(r.key))
        .map(r => {
          const ms = timeToMs(r.updated_at);
          return Number.isFinite(ms) && ms > 0
            ? [PREF_WRITE_STAMP_PREFIX + r.key, String(ms)] : null;
        })
        .filter(Boolean);
      if (stampEntries.length) await AsyncStorage.multiSet(stampEntries);
    } catch (_) { /* best-effort: the pull guard fails closed without it */ }
    return entries.length;
  } catch (e) { logWarn('sync._pullUserPrefs', e?.message); return 0; }
}

// ─── Per-table pull helpers ───────────────────────────────────────────────
// Each helper returns the number of rows it inserted so the orchestrator
// can emit a single verbose log line showing exactly what came back from
// the cloud. Errors are logged but never thrown, one missing table
// shouldn't take down the rest of the restore.

async function _pullProgrammes(sb, supabaseUserId) {
  try {
    const wm = await getPullWatermark(supabaseUserId, 'programmes');
    let q = sb.from('programmes').select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
    if (wm > 0) q = q.gte('updated_at', isoFromMs(wm));
    const { data, error } = await q;
    if (error) { logWarn('sync._pullProgrammes', error.message); return 0; }
    let n = 0;
    let failures = 0;
    let firstErr = null;
    for (const p of data ?? []) {
      try {
        await insertProgrammeFromCloud(supabaseUserId, p);
        // folder_id (plan_folders, migration 089): insertProgrammeFromCloud is
        // INSERT OR IGNORE and does not carry folder_id, so file the plan into
        // its folder explicitly. setPlanFolder reuses the same UPDATE the My
        // Plans UI uses; null/undefined leaves the plan unfiled.
        if (Object.prototype.hasOwnProperty.call(p, 'folder_id')) {
          await setPlanFolder(p.id, p.folder_id ?? null);
        }
        n++;
      }
      catch (e) { failures++; if (!firstErr) firstErr = e?.message; }
    }
    if (failures > 0) {
      logWarn('sync._pullProgrammes', `${failures} programme insert(s) failed`, { firstError: firstErr });
    }
    if (failures === 0) await setPullWatermark(supabaseUserId, 'programmes', nextWatermark(wm, data ?? []));
    return n;
  } catch (e) { logWarn('sync._pullProgrammes', e?.message); return 0; }
}

async function _pullRoutinesAndExercises(sb, supabaseUserId) {
  try {
    const wm = await getPullWatermark(supabaseUserId, 'routines');
    const routines = await fetchAllRows(
      'sync._pullRoutines',
      () => {
        let q = sb.from('routines').select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
        if (wm > 0) q = q.gte('updated_at', isoFromMs(wm));
        return q;
      },
    );
    let n = 0;
    let routineFailures = 0;
    let firstRoutineErr = null;
    for (const r of routines ?? []) {
      try { await insertRoutineFromCloud(supabaseUserId, r); n++; }
      catch (e) { routineFailures++; if (!firstRoutineErr) firstRoutineErr = e?.message; }
    }
    if (routineFailures > 0) {
      logWarn('sync._pullRoutines', `${routineFailures} routine insert(s) failed`, { firstError: firstRoutineErr });
    }
    const routineIds = (routines ?? []).map(r => r.id);
    let reFailures = 0;
    if (routineIds.length > 0) {
      const reRows = await fetchByIdsChunked(
        'sync._pullRoutineExercises', 'routine_exercises', 'routine_id', routineIds,
      );
      let firstReErr = null;
      for (const re of reRows ?? []) {
        try { await insertRoutineExerciseFromCloud(re); }
        catch (e) { reFailures++; if (!firstReErr) firstReErr = e?.message; }
      }
      if (reFailures > 0) {
        logWarn('sync._pullRoutineExercises', `${reFailures} routine_exercise insert(s) failed`, { firstError: firstReErr });
      }
    }
    // Advance only on a clean pass. Children are fetched for the routines
    // we pulled, so a changed routine re-pulls its exercises with it.
    if (routineFailures === 0 && reFailures === 0) {
      await setPullWatermark(supabaseUserId, 'routines', nextWatermark(wm, routines ?? []));
    }
    return n;
  } catch (e) { logWarn('sync._pullRoutinesAndExercises', e?.message); return 0; }
}

async function _pullMesocycles(sb, supabaseUserId) {
  try {
    const wm = await getPullWatermark(supabaseUserId, 'mesocycles');
    let mq = sb.from('mesocycles').select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
    if (wm > 0) mq = mq.gte('updated_at', isoFromMs(wm));
    const { data: mesos, error: mErr } = await mq;
    if (mErr) { logWarn('sync._pullMesocycles', mErr.message); return 0; }
    let n = 0;
    let mesoFailures = 0;
    for (const m of mesos ?? []) {
      try { await insertMesocycleFromCloud(supabaseUserId, m); n++; }
      catch (e) { mesoFailures++; logWarn('sync._pullMesocycles', 'insert failed', { id: m?.id, error: e?.message }); }
    }
    const mesoIds = (mesos ?? []).map(m => m.id);
    let weekFailures = 0;
    if (mesoIds.length > 0) {
      const weeks = await fetchByIdsChunked(
        'sync._pullMesocycleWeeks', 'mesocycle_weeks', 'mesocycle_id', mesoIds,
      );
      for (const w of weeks) {
        try { await insertMesocycleWeekFromCloud(w); }
        catch (e) { weekFailures++; logWarn('sync._pullMesocycleWeeks', 'insert failed', { id: w?.id, error: e?.message }); }
      }
    }
    if (mesoFailures === 0 && weekFailures === 0) {
      await setPullWatermark(supabaseUserId, 'mesocycles', nextWatermark(wm, mesos ?? []));
    }
    return n;
  } catch (e) { logWarn('sync._pullMesocycles', e?.message); return 0; }
}

async function _pullMorningWeights(sb, supabaseUserId) {
  try {
    const wm = await getPullWatermark(supabaseUserId, 'morning_weights');
    const data = await fetchAllRows(
      'sync._pullMorningWeights',
      () => {
        let q = sb.from('morning_weights').select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
        if (wm > 0) q = q.gte('updated_at', isoFromMs(wm));
        return q;
      },
    );
    let n = 0;
    let failures = 0;
    for (const w of data ?? []) {
      try { await insertMorningWeightFromCloud(supabaseUserId, w); n++; }
      catch (e) { failures++; logWarn('sync._pullMorningWeights', 'insert failed', { id: w.id, error: e?.message }); }
    }
    if (failures === 0) await setPullWatermark(supabaseUserId, 'morning_weights', nextWatermark(wm, data ?? []));
    return n;
  } catch (e) { logWarn('sync._pullMorningWeights', e?.message); return 0; }
}

async function _pullCoachOutputs(sb, supabaseUserId) {
  try {
    const wm = await getPullWatermark(supabaseUserId, 'coach_outputs');
    let q = sb.from('coach_outputs').select('*').eq('user_id', supabaseUserId).is('deleted_at', null);
    if (wm > 0) q = q.gte('updated_at', isoFromMs(wm));
    const { data, error } = await q;
    if (error) { logWarn('sync._pullCoachOutputs', error.message); return 0; }
    let n = 0;
    let failures = 0;
    for (const co of data ?? []) {
      try { await insertCoachOutputFromCloud(supabaseUserId, co); n++; }
      catch (e) { failures++; logWarn('sync._pullCoachOutputs', 'insert failed', { id: co.id, error: e?.message }); }
    }
    if (failures === 0) await setPullWatermark(supabaseUserId, 'coach_outputs', nextWatermark(wm, data ?? []));
    return n;
  } catch (e) { logWarn('sync._pullCoachOutputs', e?.message); return 0; }
}


// Public-facing push for nutrition targets. Call this any time
// saveNutritionTargets is invoked so the cloud copy stays in step
// with the local one. Safe no-op when there's no cloud session.
// Delegates to the registry-driven transport so the on-save path
// and the periodic sync path use the same code; tests cover the
// transport handler in src/lib/sync/__tests__/sync.transport.test.js.
export async function syncNutritionTargets(supabaseUserId, localUserId) {
  if (!supabaseUserId) return;
  // Re-triage 2026-08-01: covered wholesale by the next good syncAll (the
  // registry pushes nutrition_targets), so a dead session defers quietly.
  if (await _blockedByDeadSession('sync.syncNutritionTargets')) return;
  // eslint-disable-next-line global-require
  const { pushTable } = require('./sync/transport');
  await pushTable('nutrition_targets', {
    userId: supabaseUserId,
    localUserId: localUserId ?? supabaseUserId,
  });
}

// ─── Public sync surface (re-exports from src/lib/sync/) ─────────────────
//
// Callers like App.js + SyncStatusBadge import from '../lib/sync', which
// under Node's CommonJS resolver picks this file (sync.js) over the
// sibling sync/ directory. The spec'd public API (syncAll / syncTable /
// getStatus) lives in src/lib/sync/index.js. Without these re-exports
// the App.js trigger wiring + SyncStatusBadge import silently get
// `undefined` and the calls become no-ops.
//
// Codex re-audit 2026-05-26 F5: this bug was silently introduced by
// commit 5235bb1 (sync triggers) because the test that "verified" it
// imports from '../runner' directly and the App.js source-grep guard
// only asserts the source text contains callSyncAll, not that the
// import resolves to a real function. The new test at
// src/lib/sync/__tests__/sync.publicApi.test.js requires through the
// same path App.js uses and asserts every re-exported member is a
// function.
export {
  syncAll,
  syncTable,
  getStatus,
  SYNC_REGISTRY,
  getRegistryEntry,
  listSyncableTables,
  listBidirectionalTables,
  listPullOnlyTables,
  resolveConflict,
  trackSyncRun,
  trackSyncConflictResolved,
} from './sync/index';
