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
} from './database';

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

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * Upsert user profile to Supabase after sign-in or profile update.
 */
export async function syncProfile(supabaseUserId, userProfile, tier) {
  const sb = getClient();
  if (!sb || !supabaseUserId) return;
  try {
    await sb.from('users_profile').upsert({
      id: supabaseUserId,
      first_name: userProfile?.firstName ?? null,
      units: userProfile?.units ?? 'kg',
      training_focus: userProfile?.trainingFocus ?? 'bodybuilding',
      training_age: userProfile?.trainingAgeYears ?? null,
      primary_equipment: userProfile?.primaryEquipment ?? null,
      tier: tier ?? 'free',
      bar_weight: userProfile?.barWeight ?? 20,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (e) {
    console.warn('[sync] syncProfile failed:', e?.message);
  }
}

// ─── Exercises ────────────────────────────────────────────────────────────────

/**
 * Upload custom exercises (user-created ones) to Supabase.
 * Canonical exercises are seeded separately via scripts/seed-exercises.js.
 */
export async function syncCustomExercises(supabaseUserId) {
  const sb = getClient();
  if (!sb || !supabaseUserId) return;
  try {
    const all = await getAllExercises();
    const custom = all.filter(e => e.isCustom);
    if (!custom.length) return;
    const rows = custom.map(e => ({
      id: e.id,
      user_id: supabaseUserId,
      name: e.name,
      primary_muscle: e.primaryMuscle,
      secondary_muscles: e.secondaryMuscles ?? [],
      equipment: e.equipment ?? null,
      movement_pattern: e.movementPattern ?? null,
      fatigue_cost: e.fatigueCost ?? 1,
      stimulus_to_fatigue_ratio: e.stimulusToFatigueRatio ?? 3,
      is_custom: true,
      notes: e.notes ?? null,
      updated_at: new Date().toISOString(),
    }));
    await sb.from('exercises').upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
  } catch (e) {
    console.warn('[sync] syncCustomExercises failed:', e?.message);
  }
}

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
    console.warn('[sync] syncWorkout failed:', e?.message);
  }
}

async function _upsertWorkout(sb, supabaseUserId, w) {
  await sb.from('workouts').upsert({
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
}

async function _upsertSets(sb, supabaseUserId, sets) {
  if (!sets?.length) return;
  const rows = sets.map(s => ({
    id: s.id,
    user_id: supabaseUserId,
    workout_id: s.workoutId,
    exercise_id: s.exerciseId,
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
    updated_at: new Date().toISOString(),
  }));
  // Chunk to avoid hitting Supabase row limits
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    try {
      await sb.from('workout_sets').upsert(chunk, { onConflict: 'id' });
    } catch (e) {
      console.warn('[sync] _upsertSets chunk failed:', e?.message);
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
    await sb.from('body_metrics').upsert({
      id: metric.id,
      user_id: supabaseUserId,
      metric_date: msToDate(metric.loggedAt),
      body_weight: metric.weightKg ?? null,
      waist: metric.waistCm ?? null,
      notes: metric.notes ?? null,
    }, { onConflict: 'id' });
  } catch (e) {
    console.warn('[sync] syncBodyMetric failed:', e?.message);
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
    for (let i = 0; i < completed.length; i += 10) {
      const batch = completed.slice(i, i + 10);
      await Promise.all(
        batch.map(async w => {
          try {
            await _upsertWorkout(sb, supabaseUserId, w);
            const sets = await getWorkoutSetsForWorkout(w.id);
            await _upsertSets(sb, supabaseUserId, sets);
          } catch (_e) {
            // One failing workout doesn't abort the rest
          }
        })
      );
      // Brief yield to avoid blocking the JS thread
      await new Promise(r => setTimeout(r, 50));
    }

    // Body metrics
    try {
      const metrics = await getBodyMetricLog(localUserId, 365);
      if (metrics?.length) {
        const rows = metrics.map(m => ({
          id: m.id,
          user_id: supabaseUserId,
          metric_date: msToDate(m.loggedAt),
          body_weight: m.weightKg ?? null,
          waist: m.waistCm ?? null,
          notes: m.notes ?? null,
        })).filter(r => r.metric_date);
        for (let i = 0; i < rows.length; i += 200) {
          await sb.from('body_metrics').upsert(rows.slice(i, i + 200), { onConflict: 'id' });
        }
      }
    } catch (_e) {}

    console.log('[sync] bulk upload complete');
  } catch (e) {
    console.warn('[sync] bulkUploadLocalData failed:', e?.message);
  }
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
  try {
    const { data: cloudWorkouts } = await sb
      .from('workouts')
      .select('id, started_at, ended_at, duration_minutes, notes, is_completed, session_difficulty, overall_pump, soreness_24h_before, fatigue_level, routine_id, mesocycle_id')
      .eq('user_id', supabaseUserId)
      .eq('is_completed', true)
      .order('started_at', { ascending: false })
      .limit(500);

    if (!cloudWorkouts?.length) return 0;

    let count = 0;
    for (const w of cloudWorkouts) {
      try {
        await insertWorkoutFromCloud(supabaseUserId, w);
        const { data: sets } = await sb
          .from('workout_sets')
          .select('*')
          .eq('workout_id', w.id);
        if (sets?.length) {
          for (const s of sets) {
            await insertWorkoutSetFromCloud(supabaseUserId, s);
          }
        }
        count++;
      } catch (_e) {}
    }
    return count;
  } catch (e) {
    console.warn('[sync] pullFromCloud failed:', e?.message);
    return 0;
  }
}
