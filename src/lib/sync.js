/**
 * sync.js — cloud backup layer
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
  getBodyMetricLog,
  insertWorkoutFromCloud,
  insertWorkoutSetFromCloud,
  // Bulk read helpers
  getAllProgrammes,
  getAllRoutinesForUser,
  getAllRoutineExercisesForUser,
  getAllMesocyclesForUser,
  getAllMesocycleWeeksForUser,
  getAllMorningWeightsForUser,
  getAllWeeklyCheckinsForUser,
  getAllCoachOutputsForUser,
  getAllBodyMetricsForUser,
  getAllExerciseUserNotesForUser,
  // Cloud restore helpers
  insertRoutineFromCloud,
  insertProgrammeFromCloud,
  insertRoutineExerciseFromCloud,
  insertMorningWeightFromCloud,
  insertWeeklyCheckinFromCloud,
  insertCoachOutputFromCloud,
  insertNutritionTargetsFromCloud,
  getNutritionTargets,
} from './database';
import { logError, logWarn, logInfo } from './errorLog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msToISO(ms) {
  if (!ms) return null;
  try { return new Date(ms).toISOString(); } catch { return null; }
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
      updated_at: new Date().toISOString(),
    };
    // Beta-tester flag is still client-writable during the beta window
    // (set on first sign-up only — the migrate_005 trigger does NOT
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
 * Push EVERY exercise — canonical + custom — to the cloud.
 *
 * Renamed from syncCustomExercises (which only pushed is_custom=1
 * rows). Without canonical exercises in cloud, every routine_exercise
 * and workout_set ref to a canonical exercise was rejected by the FK
 * (now relaxed in migration 010) and silently fell into the cloud as
 * an orphan id with no name lookup possible. Now canonical exercises
 * round-trip with deterministic IDs (canonicalExerciseId in
 * seedExercises.js) so every device produces the same UUID for
 * "Bench Press" — the natural primary key dedupes upserts across
 * sign-ins from multiple devices.
 *
 * Idempotent — onConflict: 'id' means re-running the push touches
 * existing rows' updated_at but creates no duplicates.
 */
export async function syncExercises(supabaseUserId, { customOnly = false } = {}) {
  const sb = getClient();
  if (!sb || !supabaseUserId) return;
  try {
    const all = await getAllExercises();
    const subset = customOnly ? all.filter(e => e.isCustom) : all;
    if (!subset.length) return;
    const rows = subset.map(e => ({
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
      is_custom: !!e.isCustom,
      notes: e.notes ?? null,
      updated_at: new Date().toISOString(),
    }));
    // Chunk to avoid hitting Supabase's request size limit on the
    // first full-canonical upload (~450 rows × a dozen columns).
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('exercises').upsert(
        rows.slice(i, i + 200), { onConflict: 'id', ignoreDuplicates: false },
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
    } catch (_) { /* enqueue itself failed — nothing more we can do */ }
  }
}

async function _upsertWorkout(sb, supabaseUserId, w) {
  const { error } = await sb.from('workouts').upsert({
    id: w.id,
    user_id: supabaseUserId,
    routine_id: w.routineId ?? null,
    mesocycle_id: w.mesocycleId ?? null,
    started_at: msToISO(w.startedAt),
    ended_at: msToISO(w.endedAt),
    duration_minutes: w.durationMinutes ?? null,
    notes: w.notes ?? null,
    session_difficulty: w.sessionDifficulty ?? null,
    overall_pump: w.overallPump ?? null,
    soreness_24h_before: w.soreness24hBefore ?? null,
    fatigue_level: w.fatigueLevel ?? null,
    is_completed: true,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
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
    // Denormalised exercise name — restores correctly on a new
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
    updated_at: new Date().toISOString(),
  }));
  // Chunk to avoid hitting Supabase row limits
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await sb.from('workout_sets').upsert(chunk, { onConflict: 'id' });
    if (error) {
      logPgErr('sync._upsertSets', error);
      // Continue with the next chunk rather than aborting all
      // remaining work — the previous behaviour swallowed the error
      // and silently lost every set in the failing batch.
    }
  }
}

// ─── Body metrics ─────────────────────────────────────────────────────────────

/**
 * Sync a single body metric entry after it's logged locally.
 */
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
    }, { onConflict: 'id' });
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
 * Runs in the background — never blocks UI.
 */
export async function bulkUploadLocalData(supabaseUserId, localUserId) {
  const sb = getClient();
  if (!sb || !supabaseUserId || !localUserId) return;

  try {
    // Custom exercises first (sets reference them)
    await syncCustomExercises(supabaseUserId);

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
            // (e.g. "every workout from 2024-12 fails — schema mismatch").
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

    // Body metrics — see syncBodyMetric for the column-name rationale.
    // thigh→quads, ham→hamstrings, plus body_fat_* columns added in
    // migrate_010. Pre-migration this upsert had been silently rejected
    // for every metric in the user's history.
    try {
      const metrics = await getBodyMetricLog(localUserId, 365);
      if (metrics?.length) {
        const rows = metrics.map(m => ({
          id: m.id,
          user_id: supabaseUserId,
          metric_date: msToDate(m.loggedAt),
          body_weight: m.weightKg ?? null,
          waist: m.waistCm ?? null,
          chest: m.chestCm ?? null,
          hips: m.hipsCm ?? null,
          quads: m.thighCm ?? null,
          arms: m.armCm ?? null,
          shoulders: m.shouldersCm ?? null,
          forearms: m.forearmCm ?? null,
          hamstrings: m.hamCm ?? null,
          calves: m.calfCm ?? null,
          body_fat_percent: m.bodyFatPercent ?? null,
          body_fat_source: m.bodyFatSource ?? null,
          notes: m.notes ?? null,
        })).filter(r => r.metric_date);
        for (let i = 0; i < rows.length; i += 200) {
          const { error } = await sb.from('body_metrics').upsert(
            rows.slice(i, i + 200), { onConflict: 'id' },
          );
          if (error) logPgErr('sync.bulkUploadLocalData.body_metrics', error);
        }
      }
    } catch (e) {
      logWarn('sync.bulkUploadLocalData', 'body metrics upload failed', { error: e?.message });
    }

    // ─── New Pro-state tables ─────────────────────────────────────────────
    // Each block is independently fault-tolerant: failures on one table
    // log + carry on. None of these are needed for free-tier UX so they
    // can degrade gracefully on a partial cloud schema.

    await _pushProgrammes(sb, supabaseUserId, localUserId);
    await _pushRoutinesAndExercises(sb, supabaseUserId, localUserId);
    await _pushMesocycles(sb, supabaseUserId, localUserId);
    await _pushMorningWeights(sb, supabaseUserId, localUserId);
    await _pushWeeklyCheckins(sb, supabaseUserId, localUserId);
    await _pushCoachOutputs(sb, supabaseUserId, localUserId);
    await _pushNutritionTargets(sb, supabaseUserId, localUserId);

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
    const { error } = await sb.from('programmes').upsert(rows, { onConflict: 'id' });
    if (error) logPgErr('sync._pushProgrammes', error);
  } catch (e) { logWarn('sync._pushProgrammes', e?.message, { error: e?.message }); }
}

async function _pushRoutinesAndExercises(sb, supabaseUserId, localUserId) {
  try {
    const routines = await getAllRoutinesForUser(localUserId);
    if (routines?.length) {
      // programme_id, day_of_week, is_sample, is_library, source_routine_id
      // are added to the cloud routines table in migrate_010. They were
      // local-only before, which is why a fresh-device sign-in restored
      // 114 routines but lost the link back to the active plan — every
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
      const { error: rErr } = await sb.from('routines').upsert(rows, { onConflict: 'id' });
      if (rErr) logPgErr('sync._pushRoutines', rErr);
    }
    const routineExs = await getAllRoutineExercisesForUser(localUserId);
    if (routineExs?.length) {
      // starting_weight, rest_seconds, superset_group_id are also added
      // by migrate_010 — they govern the pre-filled weight, the rest
      // timer default, and superset pairing. Without them, every restore
      // dropped users back to the global default rest timer.
      //
      // exercise_name is the denormalised display name added by
      // migrate_012 — it's what makes a routine recoverable on a new
      // device even if the exercise_id can't resolve locally.
      const rows = routineExs.map(re => ({
        id: re.id, routine_id: re.routineId, exercise_id: re.exerciseId,
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
      for (let i = 0; i < rows.length; i += 200) {
        const { error: reErr } = await sb.from('routine_exercises').upsert(
          rows.slice(i, i + 200), { onConflict: 'id' },
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
        const { error } = await sb.from('mesocycles').upsert(rows, { onConflict: 'id' });
        if (error) logPgErr('sync._pushMesocycles', error);
      }
    }
    const weeks = await getAllMesocycleWeeksForUser(localUserId);
    if (weeks?.length) {
      const rows = weeks.map(w => ({
        id: w.id, mesocycle_id: w.mesocycleId,
        week_number: w.weekIndex ?? w.weekNumber ?? 1,
        is_deload: !!w.isDeload,
        notes: w.notes ?? null,
      }));
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await sb.from('mesocycle_weeks').upsert(
          rows.slice(i, i + 200), { onConflict: 'id' },
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
        rows.slice(i, i + 200), { onConflict: 'id' },
      );
      if (error) logPgErr('sync._pushMorningWeights', error);
    }
  } catch (e) { logWarn('sync._pushMorningWeights', e?.message, { error: e?.message }); }
}

async function _pushWeeklyCheckins(sb, supabaseUserId, localUserId) {
  try {
    const checkins = await getAllWeeklyCheckinsForUser(localUserId);
    if (!checkins?.length) return;
    // Writes to weekly_checkins_v2 (created in setup_complete.sql) so the
    // shape matches what runWeeklyCoach reads. The original v1 weekly_checkins
    // table has a different schema for a separate UX that's not in scope.
    const rows = checkins.map(c => ({
      id: c.id, user_id: supabaseUserId,
      week_start: c.weekStart,
      energy_score: c.energyScore ?? null,
      soreness_score: c.sorenessScore ?? null,
      stress_score: c.stressScore ?? null,
      sleep_hours: c.sleepHours ?? null,
      cals_adherence: c.calsAdherence ?? null,
      steps_adherence: c.stepsAdherence ?? null,
      training_performance: c.trainingPerformance ?? null,
      joint_pain: !!c.jointPain,
      sore_muscles: c.soreMuscles ?? null,
      cycle_override: !!c.cycleOverride,
      notes: c.notes ?? null,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('weekly_checkins_v2').upsert(
        rows.slice(i, i + 200), { onConflict: 'id' },
      );
      if (error) logPgErr('sync._pushWeeklyCheckins', error);
    }
  } catch (e) { logWarn('sync._pushWeeklyCheckins', e?.message, { error: e?.message }); }
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
        rows.slice(i, i + 200), { onConflict: 'id' },
      );
      if (error) logPgErr('sync._pushCoachOutputs', error);
    }
  } catch (e) { logWarn('sync._pushCoachOutputs', e?.message, { error: e?.message }); }
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

    const { data: cloudWorkouts, error: wErr } = await sb
      .from('workouts')
      .select('id, started_at, ended_at, duration_minutes, notes, is_completed, session_difficulty, overall_pump, soreness_24h_before, fatigue_level, routine_id, mesocycle_id, name, pre_workout_intent, set_count, total_volume, mesocycle_week_id, joint_discomfort')
      .eq('user_id', supabaseUserId)
      .eq('is_completed', true)
      .order('started_at', { ascending: false })
      .limit(500);

    if (wErr) {
      logError('sync.pullFromCloud.workouts', wErr, { supabaseUserId });
    } else if (cloudWorkouts?.length) {
      for (const w of cloudWorkouts) {
        try {
          await insertWorkoutFromCloud(supabaseUserId, w);
          const { data: sets } = await sb
            .from('workout_sets')
            .select('*')
            .eq('workout_id', w.id);
          if (sets?.length) {
            for (const s of sets) {
              try {
                await insertWorkoutSetFromCloud(supabaseUserId, s);
                setCount++;
              } catch (setErr) {
                setFailures++;
                logWarn('sync.pullFromCloud', 'set insert failed', {
                  workoutId: w.id, setId: s.id, error: setErr?.message,
                });
              }
            }
          }
          workoutCount++;
        } catch (e) {
          logWarn('sync.pullFromCloud', 'workout insert failed', { workoutId: w?.id, error: e?.message });
        }
      }
    }
    if (setFailures > 0) {
      logWarn('sync.pullFromCloud', `${setFailures} sets failed to insert`, { supabaseUserId });
    }

    // Pro-state tables. Each runs independently regardless of whether
    // workouts came back; one missing table doesn't break the others.
    const programmeCount = await _pullProgrammes(sb, supabaseUserId);
    const routineCount = await _pullRoutinesAndExercises(sb, supabaseUserId);
    const weightCount = await _pullMorningWeights(sb, supabaseUserId);
    const checkinCount = await _pullWeeklyCheckins(sb, supabaseUserId);
    const coachCount = await _pullCoachOutputs(sb, supabaseUserId);
    const nutritionFound = await _pullNutritionTargets(sb, supabaseUserId);
    const bodyMetricCount = await _pullBodyMetrics(sb, supabaseUserId);
    // New tables that previously stayed local-only on every cross-
    // device sign-in. Each is fault-tolerant — a missing cloud table
    // logs and returns 0 rather than crashing the whole pull.
    const bodyProfileFound = await _pullUserBodyProfile(sb, supabaseUserId);
    const insightCount = await _pullUserInsights(sb, supabaseUserId);
    const exerciseNoteCount = await _pullExerciseUserNotes(sb, supabaseUserId);
    const workoutNoteCount = await _pullWorkoutNotes(sb, supabaseUserId);
    const goalCount = await _pullExerciseGoals(sb, supabaseUserId);
    const peakWeekCount = await _pullPeakWeekPlans(sb, supabaseUserId);
    const plannedVolCount = await _pullPlannedMuscleVolume(sb, supabaseUserId);
    const adaptCount = await _pullAdaptationEvents(sb, supabaseUserId);
    const prefCount = await _pullUserPrefs(sb, supabaseUserId);

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
      morningWeights: weightCount,
      checkins: checkinCount,
      coachOutputs: coachCount,
      nutritionTargets: nutritionFound ? 1 : 0,
      bodyMetrics: bodyMetricCount,
      bodyProfile: bodyProfileFound ? 1 : 0,
      insights: insightCount,
      exerciseNotes: exerciseNoteCount,
      workoutNotes: workoutNoteCount,
      exerciseGoals: goalCount,
      peakWeekPlans: peakWeekCount,
      plannedVolume: plannedVolCount,
      adaptationEvents: adaptCount,
      prefs: prefCount,
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
    const { data, error } = await sb.from('exercises')
      .select('*')
      .eq('user_id', supabaseUserId);
    if (error) { logPgErr('sync._pullExercises', error); return 0; }
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
    const { data, error } = await sb.from('exercise_user_notes')
      .select('*').eq('user_id', supabaseUserId);
    if (error) { logPgErr('sync._pullExerciseUserNotes', error); return 0; }
    if (!data?.length) return 0;
    // eslint-disable-next-line global-require
    const { insertOrUpdateExerciseUserNoteFromCloud } = require('./database');
    let n = 0;
    for (const row of data) {
      try { await insertOrUpdateExerciseUserNoteFromCloud(supabaseUserId, row); n++; }
      catch (e) { logWarn('sync._pullExerciseUserNotes', 'insert failed', { id: row?.id, error: e?.message }); }
    }
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
    const { data, error } = await sb.from('adaptation_events')
      .select('*').eq('user_id', supabaseUserId);
    if (error) { logPgErr('sync._pullAdaptationEvents', error); return 0; }
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
// the cloud. Errors are logged but never thrown — one missing table
// shouldn't take down the rest of the restore.

async function _pullProgrammes(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('programmes').select('*').eq('user_id', supabaseUserId);
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
    return n;
  } catch (e) { logWarn('sync._pullProgrammes', e?.message); return 0; }
}

async function _pullRoutinesAndExercises(sb, supabaseUserId) {
  try {
    const { data: routines, error: rErr } = await sb.from('routines').select('*').eq('user_id', supabaseUserId);
    if (rErr) { logWarn('sync._pullRoutines', rErr.message); return 0; }
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
    if (routineIds.length === 0) return n;
    const { data: reRows, error: reErr } = await sb
      .from('routine_exercises').select('*').in('routine_id', routineIds);
    if (reErr) { logWarn('sync._pullRoutineExercises', reErr.message); return n; }
    let reFailures = 0;
    let firstReErr = null;
    for (const re of reRows ?? []) {
      try { await insertRoutineExerciseFromCloud(re); }
      catch (e) { reFailures++; if (!firstReErr) firstReErr = e?.message; }
    }
    if (reFailures > 0) {
      logWarn('sync._pullRoutineExercises', `${reFailures} routine_exercise insert(s) failed`, { firstError: firstReErr });
    }
    return n;
  } catch (e) { logWarn('sync._pullRoutinesAndExercises', e?.message); return 0; }
}

async function _pullMorningWeights(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('morning_weights').select('*').eq('user_id', supabaseUserId);
    if (error) { logWarn('sync._pullMorningWeights', error.message); return 0; }
    let n = 0;
    for (const w of data ?? []) {
      try { await insertMorningWeightFromCloud(supabaseUserId, w); n++; }
      catch (e) { logWarn('sync._pullMorningWeights', 'insert failed', { id: w.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullMorningWeights', e?.message); return 0; }
}

async function _pullWeeklyCheckins(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('weekly_checkins_v2').select('*').eq('user_id', supabaseUserId);
    if (error) { logWarn('sync._pullWeeklyCheckins', error.message); return 0; }
    let n = 0;
    for (const c of data ?? []) {
      try { await insertWeeklyCheckinFromCloud(supabaseUserId, c); n++; }
      catch (e) { logWarn('sync._pullWeeklyCheckins', 'insert failed', { id: c.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullWeeklyCheckins', e?.message); return 0; }
}

async function _pullCoachOutputs(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('coach_outputs').select('*').eq('user_id', supabaseUserId);
    if (error) { logWarn('sync._pullCoachOutputs', error.message); return 0; }
    let n = 0;
    for (const co of data ?? []) {
      try { await insertCoachOutputFromCloud(supabaseUserId, co); n++; }
      catch (e) { logWarn('sync._pullCoachOutputs', 'insert failed', { id: co.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullCoachOutputs', e?.message); return 0; }
}

async function _pullBodyMetrics(sb, supabaseUserId) {
  try {
    const { data, error } = await sb.from('body_metrics').select('*').eq('user_id', supabaseUserId);
    if (error) { logWarn('sync._pullBodyMetrics', error.message); return 0; }
    let n = 0;
    for (const m of data ?? []) {
      try {
        // eslint-disable-next-line global-require
        const { insertBodyMetricFromCloud } = require('./database');
        await insertBodyMetricFromCloud(supabaseUserId, m);
        n++;
      } catch (e) { logWarn('sync._pullBodyMetrics', 'insert failed', { id: m.id, error: e?.message }); }
    }
    return n;
  } catch (e) { logWarn('sync._pullBodyMetrics', e?.message); return 0; }
}

// Public-facing push for nutrition targets. Call this any time
// saveNutritionTargets is invoked so the cloud copy stays in step with
// the local one. Safe no-op when there's no cloud session.
export async function syncNutritionTargets(supabaseUserId, localUserId) {
  const sb = getClient();
  if (!sb || !supabaseUserId) return;
  await _pushNutritionTargets(sb, supabaseUserId, localUserId ?? supabaseUserId);
}

async function _pushNutritionTargets(sb, supabaseUserId, localUserId) {
  try {
    const targets = await getNutritionTargets(localUserId);
    if (!targets) return;
    const row = {
      user_id: supabaseUserId,
      bmr: targets.bmr ?? null,
      tdee: targets.tdee ?? null,
      target_kcal: targets.targetKcal ?? null,
      protein_g: targets.proteinG ?? null,
      carbs_g: targets.carbsG ?? null,
      fat_g: targets.fatG ?? null,
      phase: targets.phase ?? null,
      bmr_method: targets.bmrMethod ?? null,
      activity_level: targets.activityLevel ?? null,
      confidence: targets.confidence ?? null,
      warnings: targets.warnings ?? null,
      gdpr_consented: !!targets.gdprConsented,
      updated_at: new Date().toISOString(),
    };
    // Unique index on user_id makes onConflict: 'user_id' the right
    // upsert key. If the migration hasn't been applied yet, the table
    // doesn't exist and we'll log + carry on.
    await sb.from('nutrition_targets').upsert(row, { onConflict: 'user_id' });
  } catch (e) { logWarn('sync._pushNutritionTargets', e?.message, { error: e?.message }); }
}

async function _pullNutritionTargets(sb, supabaseUserId) {
  try {
    const { data, error } = await sb
      .from('nutrition_targets').select('*').eq('user_id', supabaseUserId).maybeSingle();
    if (error) { logWarn('sync._pullNutritionTargets', error.message); return false; }
    if (!data) return false;
    try { await insertNutritionTargetsFromCloud(supabaseUserId, data); return true; }
    catch (e) { logWarn('sync._pullNutritionTargets', 'insert failed', { error: e?.message }); return false; }
  } catch (e) { logWarn('sync._pullNutritionTargets', e?.message); return false; }
}
