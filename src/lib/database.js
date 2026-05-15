import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { synchronize } from '@nozbe/watermelondb/sync';

import schema from '../models/schema';
import Exercise from '../models/Exercise';
import Workout from '../models/Workout';
import WorkoutSet from '../models/WorkoutSet';
import Routine from '../models/Routine';
import RoutineExercise from '../models/RoutineExercise';
import Mesocycle from '../models/Mesocycle';
import { supabase } from './supabase';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'volyume',
  jsi: true,
  onSetUpError: error => {
    console.error('WatermelonDB setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Exercise, Workout, WorkoutSet, Routine, RoutineExercise, Mesocycle],
});

// Sync tables that live locally
const SYNC_TABLES = ['workouts', 'workout_sets', 'routines', 'routine_exercises', 'mesocycles'];

export async function syncDatabase(userId) {
  if (!userId) return;

  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt, schemaVersion }) => {
        const timestamp = lastPulledAt || 0;
        const changes = {};

        for (const table of SYNC_TABLES) {
          const serverTime = new Date(timestamp).toISOString();
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', userId)
            .gt('updated_at', serverTime);

          if (error) throw error;

          const deleted = [];
          const created = [];
          const updated = [];

          for (const row of data || []) {
            const record = serverRowToLocal(table, row);
            if (record._deleted) {
              deleted.push(row.id);
            } else if (row.created_at === row.updated_at) {
              created.push(record);
            } else {
              updated.push(record);
            }
          }

          changes[table] = { created, updated, deleted };
        }

        // Also sync exercises (canonical ones without user_id)
        const { data: exercises } = await supabase
          .from('exercises')
          .select('*')
          .or(`user_id.eq.${userId},user_id.is.null`)
          .gt('updated_at', new Date(timestamp).toISOString());

        changes.exercises = {
          created: (exercises || []).map(r => serverRowToLocal('exercises', r)),
          updated: [],
          deleted: [],
        };

        return { changes, timestamp: Date.now() };
      },

      pushChanges: async ({ changes, lastPulledAt }) => {
        for (const table of SYNC_TABLES) {
          const tableChanges = changes[table];
          if (!tableChanges) continue;

          const toUpsert = [
            ...tableChanges.created.map(r => localRowToServer(table, r, userId)),
            ...tableChanges.updated.map(r => localRowToServer(table, r, userId)),
          ];

          if (toUpsert.length > 0) {
            const { error } = await supabase.from(table).upsert(toUpsert);
            if (error) console.error(`Sync push error (${table}):`, error);
          }

          if (tableChanges.deleted.length > 0) {
            const { error } = await supabase
              .from(table)
              .delete()
              .in('id', tableChanges.deleted);
            if (error) console.error(`Sync delete error (${table}):`, error);
          }
        }
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
  }
}

function serverRowToLocal(table, row) {
  const base = {
    id: row.id,
    server_id: row.id,
    created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };

  switch (table) {
    case 'exercises':
      return {
        ...base,
        user_id: row.user_id || null,
        name: row.name,
        primary_muscle: row.primary_muscle,
        secondary_muscles: row.secondary_muscles ? JSON.stringify(row.secondary_muscles) : null,
        equipment: row.equipment,
        movement_pattern: row.movement_pattern,
        compound_isolation: row.compound_isolation,
        default_rep_min: row.default_rep_min,
        default_rep_max: row.default_rep_max,
        fatigue_cost: row.fatigue_cost,
        stimulus_to_fatigue_ratio: row.stimulus_to_fatigue_ratio,
        is_custom: row.is_custom || false,
        notes: row.notes,
      };
    case 'workouts':
      return {
        ...base,
        user_id: row.user_id,
        routine_id: row.routine_id,
        mesocycle_id: row.mesocycle_id,
        started_at: row.started_at ? new Date(row.started_at).getTime() : Date.now(),
        ended_at: row.ended_at ? new Date(row.ended_at).getTime() : null,
        duration_minutes: row.duration_minutes,
        notes: row.notes,
        session_difficulty: row.session_difficulty,
        overall_pump: row.overall_pump,
        soreness_24h_before: row.soreness_24h_before,
        fatigue_level: row.fatigue_level,
        is_completed: row.is_completed || false,
      };
    case 'workout_sets':
      return {
        ...base,
        user_id: row.user_id,
        workout_id: row.workout_id,
        exercise_id: row.exercise_id,
        set_number: row.set_number,
        set_type: row.set_type || 'straight',
        target_reps_min: row.target_reps_min,
        target_reps_max: row.target_reps_max,
        actual_reps: row.actual_reps,
        weight: row.weight,
        rir: row.rir,
        rpe: row.rpe,
        failed: row.failed || false,
        notes: row.notes,
        post_set_pump: row.post_set_pump,
        post_set_muscle_connection: row.post_set_muscle_connection,
        joint_discomfort: row.joint_discomfort,
        is_amrap: row.is_amrap || false,
        amrap_reps: row.amrap_reps,
      };
    case 'routines':
      return {
        ...base,
        user_id: row.user_id,
        name: row.name,
        description: row.description,
        split_type: row.split_type,
        is_active: row.is_active !== false,
      };
    case 'routine_exercises':
      return {
        ...base,
        routine_id: row.routine_id,
        exercise_id: row.exercise_id,
        order_in_routine: row.order_in_routine,
        recommended_sets: row.recommended_sets,
        recommended_reps_min: row.recommended_reps_min,
        recommended_reps_max: row.recommended_reps_max,
        notes: row.notes,
      };
    case 'mesocycles':
      return {
        ...base,
        user_id: row.user_id,
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        duration_weeks: row.duration_weeks,
        focus: row.focus,
        goals: row.goals,
        is_active: row.is_active !== false,
        deload_week: row.deload_week,
        auto_regulation_enabled: row.auto_regulation_enabled !== false,
      };
    default:
      return base;
  }
}

function localRowToServer(table, row, userId) {
  const base = {
    id: row.server_id || row.id,
    user_id: userId,
    updated_at: new Date(row.updated_at || Date.now()).toISOString(),
  };

  switch (table) {
    case 'workouts':
      return {
        ...base,
        routine_id: row.routine_id || null,
        mesocycle_id: row.mesocycle_id || null,
        started_at: new Date(row.started_at).toISOString(),
        ended_at: row.ended_at ? new Date(row.ended_at).toISOString() : null,
        duration_minutes: row.duration_minutes || null,
        notes: row.notes || null,
        session_difficulty: row.session_difficulty || null,
        overall_pump: row.overall_pump || null,
        soreness_24h_before: row.soreness_24h_before || null,
        fatigue_level: row.fatigue_level || null,
        is_completed: row.is_completed || false,
      };
    case 'workout_sets':
      return {
        ...base,
        workout_id: row.workout_id,
        exercise_id: row.exercise_id,
        set_number: row.set_number,
        set_type: row.set_type || 'straight',
        target_reps_min: row.target_reps_min || null,
        target_reps_max: row.target_reps_max || null,
        actual_reps: row.actual_reps,
        weight: row.weight || null,
        rir: row.rir !== undefined ? row.rir : null,
        rpe: row.rpe !== undefined ? row.rpe : null,
        failed: row.failed || false,
        notes: row.notes || null,
        post_set_pump: row.post_set_pump || null,
        post_set_muscle_connection: row.post_set_muscle_connection || null,
        joint_discomfort: row.joint_discomfort || null,
        is_amrap: row.is_amrap || false,
        amrap_reps: row.amrap_reps || null,
      };
    case 'routines':
      return {
        ...base,
        name: row.name,
        description: row.description || null,
        split_type: row.split_type || null,
        is_active: row.is_active !== false,
      };
    case 'routine_exercises':
      return {
        ...base,
        routine_id: row.routine_id,
        exercise_id: row.exercise_id,
        order_in_routine: row.order_in_routine || 0,
        recommended_sets: row.recommended_sets || 3,
        recommended_reps_min: row.recommended_reps_min || 6,
        recommended_reps_max: row.recommended_reps_max || 12,
        notes: row.notes || null,
      };
    case 'mesocycles':
      return {
        ...base,
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        duration_weeks: row.duration_weeks || null,
        focus: row.focus || null,
        goals: row.goals || null,
        is_active: row.is_active !== false,
        deload_week: row.deload_week || null,
        auto_regulation_enabled: row.auto_regulation_enabled !== false,
      };
    default:
      return base;
  }
}

// Query helpers
export async function getExercisesByMuscle(muscle) {
  return database
    .get('exercises')
    .query()
    .fetch()
    .then(all => all.filter(e => e.primaryMuscle?.toLowerCase() === muscle?.toLowerCase()));
}

export async function getWorkoutSetsForExercise(exerciseId, userId, limit = 100) {
  const allSets = await database.get('workout_sets').query().fetch();
  return allSets
    .filter(s => s.exerciseId === exerciseId && s.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function getPreviousWorkoutSets(exerciseId, currentWorkoutId) {
  const allSets = await database.get('workout_sets').query().fetch();
  const otherSets = allSets.filter(
    s => s.exerciseId === exerciseId && s.workoutId !== currentWorkoutId,
  );
  otherSets.sort((a, b) => b.createdAt - a.createdAt);

  if (otherSets.length === 0) return [];

  const mostRecentWorkoutId = otherSets[0].workoutId;
  return otherSets.filter(s => s.workoutId === mostRecentWorkoutId);
}
