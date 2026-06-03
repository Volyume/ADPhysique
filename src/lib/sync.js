/**
 * sync.js, cloud backup layer
 *
 * SQLite is the source of truth. Supabase is the cloud backup.
 * All functions are fire-and-forget safe: they never throw, never block UI.
 *
 * Flow:
 *   1. User signs up/in → syncProfile() + bulkUploadLocalData()
 *   2. Workout completed → syncWorkout()
 *   3. Body metric logged → syncBodyMetric()
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
import { getPullWatermark, setPullWatermark, nextWatermark, isoFromMs } from './sync/watermark';
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

function msToDate(ms) {
  if (!ms) return null;
  try { return new Date(ms).toISOString().split('T')[0]; } catch { return null; }
}

function getClient() {
  return getSupabaseClient();
}

// PostgREST errors carry a code + hint + details that the user (and we)
// need to see. The default `e?.message` we'd been logging often comes
// back empty or as a useless one-liner, which made every silently-
// failed upsert look the same. Surface the full shape so the next
// debug log dump tells us exactly which column / constraint blew up.
function logPgErr(scope, err) {
  if (!err) return;
  logWarn(scope, err.message || String(err), {
    code: err.code ?? null,
    details: err.details ?? null,
    hint: err.hint ?? null,
  });
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
    if (error) { logWarn(scope, error.message); return out; }
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
        : getClient().from(table).select('*').in(column, slice);
      const { data, error } = await base.range(from, from + PAGE - 1);
      if (error) { logWarn(scope, error.message); break; }
      if (!data?.length) break;
      out.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  return out;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * Upsert user profile to Supabase after sign-in or profile update.
 */
export async function syncProfile(supabaseUserId, userProfile, _tier, { isBetaTester = false } = {}) {
  const sb = getClient();
  if (!sb || !supabaseUserId) return;
  try {
    // `tier` is deliberately NOT sent from the client. Server has DEFAULT
    // 'free' on new rows, and migrate_005's trigger rolls back any client
    // UPDATE to it. Tier upgrades happen via the Stripe webhook only.
    // _tier kept in the signature for callsite compatibility but ignored.
    const payload = {
      id: supabaseUserId,
      first_name: userProfile?.firstName ?? null,
      units: userProfile?.units ?? 'kg',
      training_focus: userProfile?.trainingFocus ?? 'bodybuilding',
      training_age: userProfile?.trainingAgeYears ?? null,
      primary_equipment: userProfile?.primaryEquipment ?? null,
      bar_weight: userProfile?.barWeight ?? 20,
      diet_preference: userProfile?.dietPreference ?? 'omnivore',
      updated_at: new Date().toISOString(),
    };
    // Beta-tester flag is still client-writable during the beta window
    // (set on first sign-up only, the migrate_005 trigger does NOT
    // protect this column, only `tier`). Server enforces tier strictly,
    // beta-tester is a soft tag for the future Pro extension.
    if (isBetaTester) payload.is_beta_tester = true;
    await sb.from('users_profile').upsert(payload, { onConflict: 'id' });
  } catch (e) {
    logError('sync.syncProfile', e, { supabaseUserId });
  }
}

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
      updated_at: new Date().toISOString(),
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
export async function syncWorkout(supabaseUserId, workoutId) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !workoutId) return;
  try {
    const w = await getWorkoutById(workoutId);
    if (!w) return;
    await _upsertWorkout(sb, supabaseUserId, w);
    const sets = await getWorkoutSetsForWorkout(workoutId);
    await _upsertSets(sb, supabaseUserId, sets);
  } catch (e) {
    logWarn('sync.syncWorkout', e?.message, { workoutId });
    // Enqueue for retry on next foreground / connection return.
    // Without this, a dropped sync was silent data loss until the
    // user's next sign-in cycle triggered bulkUploadLocalData.
    try {
      // eslint-disable-next-line global-require
      const { enqueueSyncOp } = require('./syncQueue');
      await enqueueSyncOp('workout', workoutId, supabaseUserId);
    } catch (_) { /* enqueue itself failed, nothing more we can do */ }
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
  const { error } = await sb.from('workouts').upsert({
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
    set_count: w.setCount ?? null,
    total_volume: w.totalVolume ?? null,
    is_completed: true,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,id' });
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
    updated_at: new Date().toISOString(),
  }));
  // Chunk to avoid hitting Supabase row limits
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await sb.from('workout_sets').upsert(chunk, { onConflict: 'user_id,id' });
    if (error) {
      logPgErr('sync._upsertSets', error);
      // Continue with the next chunk rather than aborting all
      // remaining work, the previous behaviour swallowed the error
      // and silently lost every set in the failing batch.
    }
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
      bulkUploadLocalData(supabaseUserId, localUserId).catch(() => {});
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

export async function syncMorningWeight(supabaseUserId, entry) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !entry) return;
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
    try {
      // eslint-disable-next-line global-require
      const { enqueueSyncOp } = require('./syncQueue');
      await enqueueSyncOp('morning_weight', entry?.id ?? `mw-${Date.now()}`, supabaseUserId, entry);
    } catch (_) {}
  }
}

/**
 * Push a single weekly check-in to cloud immediately. Cloud table is
 * weekly_checkins_v2 (the modern schema runWeeklyCoach reads from).
 */
export async function syncWeeklyCheckin(supabaseUserId, checkin) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !checkin) return;
  try {
    const { error } = await sb.from('weekly_checkins_v2').upsert({
      id: checkin.id,
      user_id: supabaseUserId,
      week_start: checkin.weekStart,
      energy_score: checkin.energyScore ?? null,
      soreness_score: checkin.sorenessScore ?? null,
      stress_score: checkin.stressScore ?? null,
      sleep_hours: checkin.sleepHours ?? null,
      cals_adherence: checkin.calsAdherence ?? null,
      steps_adherence: checkin.stepsAdherence ?? null,
      training_performance: checkin.trainingPerformance ?? null,
      joint_pain: !!checkin.jointPain,
      sore_muscles: checkin.soreMuscles ?? null,
      cycle_override: !!checkin.cycleOverride,
      notes: checkin.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,id' });
    if (error) { logPgErr('sync.syncWeeklyCheckin', error); throw error; }
  } catch (e) {
    logWarn('sync.syncWeeklyCheckin', e?.message, { id: checkin?.id });
    try {
      // eslint-disable-next-line global-require
      const { enqueueSyncOp } = require('./syncQueue');
      await enqueueSyncOp('check_in', checkin?.id ?? `ci-${Date.now()}`, supabaseUserId, checkin);
    } catch (_) {}
  }
}

export async function syncBodyMetric(supabaseUserId, metric) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !metric) return;
  try {
    // Cloud column names: body_weight, waist, chest, hips, quads,
    // hamstrings, arms, shoulders, forearms, calves. The previous push
    // wrote `thigh` / `ham` / `body_fat_percent` / `body_fat_source`
    // which don't exist in the body_metrics schema → PostgREST
    // rejected the entire upsert and every body metric the user logged
    // was lost on cross-device restore. Migration 010 adds the
    // body-fat columns; the limb columns map straight onto the
    // existing cloud names.
    const { error } = await sb.from('body_metrics').upsert({
      id: metric.id,
      user_id: supabaseUserId,
      metric_date: msToDate(metric.loggedAt),
      body_weight: metric.weightKg ?? null,
      waist: metric.waistCm ?? null,
      chest: metric.chestCm ?? null,
      hips: metric.hipsCm ?? null,
      quads: metric.thighCm ?? null,
      arms: metric.armCm ?? null,
      shoulders: metric.shouldersCm ?? null,
      forearms: metric.forearmCm ?? null,
      hamstrings: metric.hamCm ?? null,
      calves: metric.calfCm ?? null,
      body_fat_percent: metric.bodyFatPercent ?? null,
      body_fat_source: metric.bodyFatSource ?? null,
      notes: metric.notes ?? null,
    }, { onConflict: 'user_id,id' });
    if (error) {
      logPgErr('sync.syncBodyMetric', error);
      throw error;
    }
  } catch (e) {
    logWarn('sync.syncBodyMetric', e?.message, { metricId: metric?.id });
    try {
      // eslint-disable-next-line global-require
      const { enqueueSyncOp } = require('./syncQueue');
      await enqueueSyncOp('body_metric', metric?.id ?? `bm-${Date.now()}`, supabaseUserId, metric);
    } catch (_) {}
  }
}

// ─── Bulk upload ──────────────────────────────────────────────────────────────

/**
 * First-time upload: push all local completed workouts to Supabase.
 * Called once after the user creates a cloud account or signs in for the first time.
 * Runs in the background, never blocks UI.
 */
export async function bulkUploadLocalData(supabaseUserId, localUserId) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !localUserId) return;

  try {
    // Every exercise, canonical + custom, pushed first so all the
    // downstream FK references (routine_exercises, workout_sets) land
    // on cloud rows that exist. Previously only is_custom=1 rows were
    // pushed, which is what left routine_exercises pointing at
    // unresolvable canonical UUIDs and broke cross-device restore.
    await syncExercises(supabaseUserId);

    const allWorkouts = await getAllWorkouts(localUserId);
    const completed = allWorkouts.filter(w => w.isCompleted);

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
          } catch (e) {
            failures++;
            // Per-workout failure doesn't abort the batch but it is logged
            // so the user can spot patterns in the Debug logs surface
            // (e.g. "every workout from 2024-12 fails, schema mismatch").
            logWarn('sync.bulkUploadLocalData', 'workout upload failed', {
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

    console.log('[sync] bulk upload complete');
  } catch (e) {
    logError('sync.bulkUploadLocalData', e, { supabaseUserId, localUserId });
  }
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
      source_programme_id: p.sourceProgrammeId ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await sb.from('programmes').upsert(rows, { onConflict: 'user_id,id' });
    if (error) logPgErr('sync._pushProgrammes', error);
  } catch (e) { logWarn('sync._pushProgrammes', e?.message, { error: e?.message }); }
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
        updated_at: new Date().toISOString(),
      }));
      // Chunk so a single row's RLS rejection doesn't take the whole
      // library down, and so the payload stays small.
      let rPushed = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const slice = rows.slice(i, i + 200);
        const { error: rErr } = await sb.from('routines').upsert(slice, { onConflict: 'user_id,id' });
        if (rErr) logPgErr('sync._pushRoutines', rErr);
        else rPushed += slice.length;
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
      // in the routines we just pushed. Cloud RLS on
      // routine_exercises checks EXISTS (SELECT 1 FROM routines WHERE
      // id = routine_id AND user_id = auth.uid()), an orphan
      // routine_id (left over from a soft-deleted routine or a partial
      // sync state locally) fails that check and rejects the entire
      // 200-row chunk. Excluding orphans keeps the rest of the batch
      // alive.
      const pushableRoutineIds = new Set((routines || []).map(r => r.id));
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
        }));
      const orphanCount = routineExs.length - rows.length;
      if (orphanCount > 0) {
        logWarn('sync._pushRoutinesAndExercises', 'orphan routine_exercises skipped', { orphanCount });
      }
      for (let i = 0; i < rows.length; i += 200) {
        const { error: reErr } = await sb.from('routine_exercises').upsert(
          rows.slice(i, i + 200), { onConflict: 'user_id,id' },
        );
        if (reErr) logPgErr('sync._pushRoutineExercises', reErr);
      }
    }
  } catch (e) { logWarn('sync._pushRoutinesAndExercises', e?.message, { error: e?.message }); }
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
        focus: m.focus ?? null,
        is_active: !!m.isActive,
        updated_at: new Date().toISOString(),
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
      }));
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await sb.from('mesocycle_weeks').upsert(
          rows.slice(i, i + 200), { onConflict: 'user_id,id' },
        );
        if (error) logPgErr('sync._pushMesocycleWeeks', error);
      }
    }
  } catch (e) { logWarn('sync._pushMesocycles', e?.message, { error: e?.message }); }
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
    })).filter(r => r.logged_at && r.weight_kg != null);
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('morning_weights').upsert(
        rows.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushMorningWeights', error);
    }
  } catch (e) { logWarn('sync._pushMorningWeights', e?.message, { error: e?.message }); }
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
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('coach_outputs').upsert(
        rows.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushCoachOutputs', error);
    }
  } catch (e) { logWarn('sync._pushCoachOutputs', e?.message, { error: e?.message }); }
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
  } catch (e) { logWarn('sync._pushExerciseUserNotes', e?.message); }
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
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) logPgErr('sync._pushUserBodyProfile', error);
  } catch (e) { logWarn('sync._pushUserBodyProfile', e?.message); }
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
      updated_at: new Date().toISOString(),
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await sb.from('user_insights').upsert(
        payload.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushUserInsights', error);
    }
  } catch (e) { logWarn('sync._pushUserInsights', e?.message); }
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
  } catch (e) { logWarn('sync._pushWorkoutNotes', e?.message); }
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
  } catch (e) { logWarn('sync._pushExerciseGoals', e?.message); }
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
  } catch (e) { logWarn('sync._pushPeakWeekPlans', e?.message); }
}

async function _pushPlannedMuscleVolume(sb, supabaseUserId, localUserId) {
  try {
    const rows = await getAllPlannedMuscleVolumeForUser(localUserId);
    if (!rows?.length) return;
    const payload = rows.map(r => ({
      id: r.id, user_id: supabaseUserId,
      mesocycle_week_id: r.mesocycleWeekId,
      muscle: r.muscle,
      planned_sets: r.plannedSets ?? null,
      created_at: new Date(r.createdAt ?? Date.now()).toISOString(),
      updated_at: new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toISOString(),
      deleted_at: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await sb.from('planned_muscle_volume').upsert(
        payload.slice(i, i + 200), { onConflict: 'user_id,id' },
      );
      if (error) logPgErr('sync._pushPlannedMuscleVolume', error);
    }
  } catch (e) { logWarn('sync._pushPlannedMuscleVolume', e?.message); }
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
  } catch (e) { logWarn('sync._pushAdaptationEvents', e?.message); }
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
];

export function shouldSyncPref(key) {
  if (!key.startsWith(PREF_PREFIX)) return false;
  return !PREF_EXCLUDE_PATTERNS.some(re => re.test(key));
}

/**
 * Push one preference key to the cloud. Idempotent, upsert on
 * (user_id, key). Called from the store whenever a synced
 * preference changes so the cloud copy stays current.
 */
export async function syncUserPref(supabaseUserId, key, value) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !key || !shouldSyncPref(key)) return;
  try {
    const { error } = await sb.from('user_prefs').upsert({
      user_id: supabaseUserId, key,
      value: value == null ? '' : String(value),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,key' });
    if (error) logPgErr('sync.syncUserPref', error);
  } catch (e) { logWarn('sync.syncUserPref', e?.message, { key }); }
}


async function _pushAllUserPrefs(sb, supabaseUserId) {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keys = allKeys.filter(shouldSyncPref);
    if (!keys.length) return;
    const pairs = await AsyncStorage.multiGet(keys);
    const rows = pairs.map(([k, v]) => ({
      user_id: supabaseUserId, key: k,
      value: v == null ? '' : String(v),
      updated_at: new Date().toISOString(),
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('user_prefs').upsert(
        rows.slice(i, i + 200), { onConflict: 'user_id,key' },
      );
      if (error) logPgErr('sync._pushAllUserPrefs', error);
    }
  } catch (e) { logWarn('sync._pushAllUserPrefs', e?.message); }
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
          .eq('is_completed', true);
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
    if (workoutFailures === 0 && setFailures === 0) {
      await setPullWatermark(supabaseUserId, 'workouts', nextWatermark(wmWorkouts, cloudWorkouts));
    }

    // Pro-state tables. Each runs independently regardless of whether
    // workouts came back; one missing table doesn't break the others.
    const programmeCount = await _pullProgrammes(sb, supabaseUserId);
    const routineCount = await _pullRoutinesAndExercises(sb, supabaseUserId);
    const mesoCount = await _pullMesocycles(sb, supabaseUserId);
    const weightCount = await _pullMorningWeights(sb, supabaseUserId);
    // weekly_checkins_v2 moved to src/lib/sync/transport.js
    // (registry-driven per-table pull). See MIGRATED_TABLES.
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
    const exerciseNoteCount = await _pullExerciseUserNotes(sb, supabaseUserId);
    const workoutNoteCount = await _pullWorkoutNotes(sb, supabaseUserId);
    const goalCount = await _pullExerciseGoals(sb, supabaseUserId);
    const peakWeekCount = await _pullPeakWeekPlans(sb, supabaseUserId);
    const plannedVolCount = await _pullPlannedMuscleVolume(sb, supabaseUserId);
    const adaptCount = await _pullAdaptationEvents(sb, supabaseUserId);
    const customExerciseCount = await _pullCustomExercises(sb, supabaseUserId);
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
      () => sb.from('exercises').select('*').eq('user_id', supabaseUserId),
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
      .select('*').eq('user_id', supabaseUserId);
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
    let q = sb.from('exercise_user_notes').select('*').eq('user_id', supabaseUserId);
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
      .select('*').eq('user_id', supabaseUserId);
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
      .select('*').eq('user_id', supabaseUserId);
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
      .select('*').eq('user_id', supabaseUserId);
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
    const { data, error } = await sb.from('planned_muscle_volume')
      .select('*').eq('user_id', supabaseUserId);
    if (error) { logPgErr('sync._pullPlannedMuscleVolume', error); return 0; }
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
      () => sb.from('adaptation_events').select('*').eq('user_id', supabaseUserId),
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
 * notification_preferences pull.
 *
 * Reads every row owned by the user from the cloud
 * `notification_preferences` table (migration 044) and applies it
 * to the local SQLite mirror via applyPreferenceFromPull. Last-
 * write-wins resolution only applies the cloud row when its
 * updated_at is strictly newer than the local row.
 */
async function _pullUserPrefs(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('user_prefs')
      .select('*').eq('user_id', supabaseUserId);
    if (error) { logPgErr('sync._pullUserPrefs', error); return 0; }
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const entries = data.map(r => [r.key, r.value == null ? '' : String(r.value)]);
    try { await AsyncStorage.multiSet(entries); } catch (_) {}
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
    let q = sb.from('programmes').select('*').eq('user_id', supabaseUserId);
    if (wm > 0) q = q.gte('updated_at', isoFromMs(wm));
    const { data, error } = await q;
    if (error) { logWarn('sync._pullProgrammes', error.message); return 0; }
    let n = 0;
    let failures = 0;
    let firstErr = null;
    for (const p of data ?? []) {
      try { await insertProgrammeFromCloud(supabaseUserId, p); n++; }
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
        let q = sb.from('routines').select('*').eq('user_id', supabaseUserId);
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
    let mq = sb.from('mesocycles').select('*').eq('user_id', supabaseUserId);
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
        let q = sb.from('morning_weights').select('*').eq('user_id', supabaseUserId);
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
    let q = sb.from('coach_outputs').select('*').eq('user_id', supabaseUserId);
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
  ensureSyncQueueTable,
  enqueue,
  listPending,
  getQueueDepth,
  markSucceeded,
  markFailed,
  clearQueue,
  resolveConflict,
  trackSyncRun,
  trackSyncConflictResolved,
} from './sync/index';
