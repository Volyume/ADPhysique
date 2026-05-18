import * as SQLite from 'expo-sqlite';
import { generateInsights } from './insightsEngine';

let _db = null;
let _initPromise = null;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function rowToCamel(row) {
  if (!row) return null;
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    if (key === 'secondary_muscles' && typeof value === 'string') {
      try { result[camelKey] = JSON.parse(value); } catch { result[camelKey] = []; }
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

export function initDatabase() {
  if (_db) return Promise.resolve(_db);
  if (_initPromise) return _initPromise;
  _initPromise = _doInit();
  return _initPromise;
}

async function _doInit() {
  _db = await SQLite.openDatabaseAsync('volyume.db');
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      primary_muscle TEXT,
      secondary_muscles TEXT,
      equipment TEXT,
      movement_pattern TEXT,
      compound_isolation TEXT,
      default_rep_min INTEGER,
      default_rep_max INTEGER,
      fatigue_cost INTEGER,
      stimulus_to_fatigue_ratio INTEGER,
      subregion TEXT,
      is_custom INTEGER DEFAULT 0,
      notes TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      routine_id TEXT,
      mesocycle_id TEXT,
      started_at INTEGER,
      ended_at INTEGER,
      duration_minutes INTEGER,
      notes TEXT,
      session_difficulty INTEGER,
      overall_pump INTEGER,
      soreness_24h_before INTEGER,
      fatigue_level INTEGER,
      is_completed INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workout_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      set_number INTEGER,
      set_type TEXT DEFAULT 'straight',
      target_reps_min INTEGER,
      target_reps_max INTEGER,
      actual_reps INTEGER,
      weight REAL,
      rir INTEGER,
      rpe REAL,
      failed INTEGER DEFAULT 0,
      notes TEXT,
      post_set_pump INTEGER,
      post_set_muscle_connection INTEGER,
      joint_discomfort INTEGER,
      is_amrap INTEGER DEFAULT 0,
      amrap_reps INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      split_type TEXT,
      is_active INTEGER DEFAULT 1,
      is_library INTEGER DEFAULT 0,
      source_routine_id TEXT,
      programme_id TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS programmes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      is_library INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS routine_exercises (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      order_in_routine INTEGER DEFAULT 0,
      recommended_sets INTEGER DEFAULT 3,
      recommended_reps_min INTEGER DEFAULT 6,
      recommended_reps_max INTEGER DEFAULT 12,
      notes TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS mesocycles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      duration_weeks INTEGER,
      focus TEXT,
      goals TEXT,
      is_active INTEGER DEFAULT 1,
      deload_week INTEGER,
      auto_regulation_enabled INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON workout_sets(workout_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id);
    CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON routine_exercises(routine_id);
    CREATE INDEX IF NOT EXISTS idx_mesocycles_user ON mesocycles(user_id);
  `);

  // Nutrition & body data tables (idempotent)
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS nutrition_targets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bmr REAL,
      tdee REAL,
      target_kcal REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      phase TEXT,
      bmr_method TEXT,
      activity_level TEXT,
      confidence TEXT,
      warnings TEXT,
      gdpr_consented INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS body_metric_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      logged_at INTEGER,
      weight_kg REAL,
      body_fat_percent REAL,
      body_fat_source TEXT,
      waist_cm REAL,
      chest_cm REAL,
      hips_cm REAL,
      thigh_cm REAL,
      arm_cm REAL,
      shoulders_cm REAL,
      forearm_cm REAL,
      ham_cm REAL,
      calf_cm REAL,
      notes TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS user_insights (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      insight_key TEXT NOT NULL,
      type TEXT,
      severity INTEGER,
      copy TEXT,
      action_payload TEXT,
      generated_at INTEGER,
      dismissed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS user_body_profile (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      sex TEXT,
      date_of_birth TEXT,
      height_cm REAL,
      experience_level TEXT,
      training_age_years REAL,
      primary_goal TEXT,
      gdpr_consented INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_nutrition_user ON nutrition_targets(user_id);
    CREATE INDEX IF NOT EXISTS idx_body_log_user ON body_metric_log(user_id, logged_at);
    CREATE INDEX IF NOT EXISTS idx_insights_user ON user_insights(user_id, dismissed_at, type);
  `);

  // Backward-compatible column migrations
  const colMigrations = [
    'ALTER TABLE routine_exercises ADD COLUMN starting_weight REAL',
    'ALTER TABLE routine_exercises ADD COLUMN rest_seconds INTEGER',
    'ALTER TABLE workouts ADD COLUMN last_activity_at INTEGER',
    'ALTER TABLE workouts ADD COLUMN active_elapsed_seconds INTEGER',
    'ALTER TABLE routines ADD COLUMN is_library INTEGER DEFAULT 0',
    'ALTER TABLE routines ADD COLUMN source_routine_id TEXT',
    'ALTER TABLE routines ADD COLUMN programme_id TEXT',
    `CREATE TABLE IF NOT EXISTS programmes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      is_library INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    )`,
    'ALTER TABLE programmes ADD COLUMN is_active INTEGER DEFAULT 0',
    'ALTER TABLE programmes ADD COLUMN next_workout_index INTEGER DEFAULT 0',
    'ALTER TABLE programmes ADD COLUMN tags TEXT',
    'ALTER TABLE programmes ADD COLUMN split_type TEXT',
    'ALTER TABLE programmes ADD COLUMN is_archived INTEGER DEFAULT 0',
    'ALTER TABLE routines ADD COLUMN is_template INTEGER DEFAULT 0',
    'ALTER TABLE workouts ADD COLUMN name TEXT',
    'ALTER TABLE workouts ADD COLUMN set_count INTEGER',
    'ALTER TABLE workouts ADD COLUMN total_volume REAL',
    'ALTER TABLE exercises ADD COLUMN subregion TEXT',
    'ALTER TABLE body_metric_log ADD COLUMN shoulders_cm REAL',
    'ALTER TABLE body_metric_log ADD COLUMN forearm_cm REAL',
    'ALTER TABLE body_metric_log ADD COLUMN ham_cm REAL',
    'ALTER TABLE body_metric_log ADD COLUMN calf_cm REAL',
    'ALTER TABLE workout_sets ADD COLUMN missed_reps INTEGER',
  ];
  for (const sql of colMigrations) {
    try { await _db.execAsync(sql); } catch (_) {}
  }

  // One-time migration: remap exercises.primary_muscle from 'shoulders' to the correct delt head
  // based on exercise name patterns. Idempotent — no-ops once rows are updated.
  const deltMigrations = [
    `UPDATE exercises SET primary_muscle = 'front_delts'
     WHERE primary_muscle = 'shoulders'
     AND (name LIKE '%Overhead Press%' OR name LIKE '%Military Press%'
       OR name LIKE '%Front Raise%' OR name LIKE '%Arnold%'
       OR name LIKE '%Seated Dumbbell Press%')`,
    `UPDATE exercises SET primary_muscle = 'side_delts'
     WHERE primary_muscle = 'shoulders'
     AND (name LIKE '%Lateral%' OR name LIKE '%Upright Row%'
       OR name LIKE '%Machine Shoulder Press%' OR name LIKE '%Shoulder Press%')`,
    `UPDATE exercises SET primary_muscle = 'rear_delts'
     WHERE primary_muscle = 'shoulders'
     AND (name LIKE '%Rear Delt%' OR name LIKE '%Face Pull%'
       OR name LIKE '%Y-Raise%' OR name LIKE '%Pec Deck%'
       OR name LIKE '%Rear%')`,
    // Catch-all: any remaining 'shoulders' exercises map to side_delts
    `UPDATE exercises SET primary_muscle = 'side_delts'
     WHERE primary_muscle = 'shoulders'`,
  ];
  for (const sql of deltMigrations) {
    try { await _db.execAsync(sql); } catch (_) {}
  }

  return _db;
}

async function db() {
  return _db || initDatabase();
}

// ─── Exercises ───────────────────────────────────────────────────────────────────────────────────

export async function getAllExercises() {
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM exercises ORDER BY name ASC');
  return rows.map(rowToCamel);
}

export async function getExerciseById(id) {
  const d = await db();
  const row = await d.getFirstAsync('SELECT * FROM exercises WHERE id = ?', [id]);
  return rowToCamel(row);
}

export async function getExercisesByMuscle(muscle) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM exercises WHERE lower(primary_muscle) = lower(?)',
    [muscle],
  );
  return rows.map(rowToCamel);
}

export async function insertExercise(data) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT OR IGNORE INTO exercises
      (id, name, primary_muscle, secondary_muscles, equipment, movement_pattern,
       compound_isolation, default_rep_min, default_rep_max, fatigue_cost,
       stimulus_to_fatigue_ratio, subregion, is_custom, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.primaryMuscle || null,
      data.secondaryMuscles ? JSON.stringify(data.secondaryMuscles) : null,
      data.equipment || null,
      data.movementPattern || null,
      data.compoundIsolation || null,
      data.defaultRepMin ?? null,
      data.defaultRepMax ?? null,
      data.fatigueCost ?? null,
      data.stimulusToFatigueRatio ?? null,
      data.subregion ?? null,
      data.isCustom ? 1 : 0,
      data.notes || null,
      now,
      now,
    ],
  );
  return { id, ...data, createdAt: now, updatedAt: now };
}

// ─── Workouts ─────────────────────────────────────────────────────────────────────────────────────

export async function getAllWorkouts(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT w.*, r.name AS routine_name
     FROM workouts w
     LEFT JOIN routines r ON r.id = w.routine_id
     WHERE w.user_id = ?
     ORDER BY w.started_at DESC`,
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function getWorkoutById(id) {
  const d = await db();
  const row = await d.getFirstAsync('SELECT * FROM workouts WHERE id = ?', [id]);
  return rowToCamel(row);
}

export async function createWorkout(userId, routineId = null) {
  const d = await db();
  // Auto-link to the active mesocycle so tonnage + recovery data flows into the block dashboard
  const activeMeso = await d.getFirstAsync(
    'SELECT id FROM mesocycles WHERE user_id = ? AND is_active = 1 LIMIT 1',
    [userId],
  );
  const mesocycleId = activeMeso?.id ?? null;
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO workouts (id, user_id, routine_id, mesocycle_id, started_at, is_completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, userId, routineId, mesocycleId, now, now, now],
  );
  return { id, userId, routineId, mesocycleId, startedAt: now, isCompleted: 0, createdAt: now, updatedAt: now };
}

export async function updateWorkout(id, data) {
  const d = await db();
  const now = Date.now();
  const fieldMap = {
    endedAt: 'ended_at',
    durationMinutes: 'duration_minutes',
    isCompleted: 'is_completed',
    notes: 'notes',
    sessionDifficulty: 'session_difficulty',
    overallPump: 'overall_pump',
    soreness24hBefore: 'soreness_24h_before',
    fatigueLevel: 'fatigue_level',
    lastActivityAt: 'last_activity_at',
    activeElapsedSeconds: 'active_elapsed_seconds',
    name: 'name',
    setCount: 'set_count',
    totalVolume: 'total_volume',
  };
  const fields = [];
  const values = [];
  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in data) {
      fields.push(`${col} = ?`);
      values.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
    }
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(now, id);
  await d.runAsync(`UPDATE workouts SET ${fields.join(', ')} WHERE id = ?`, values);
}

// ─── Workout Sets ──────────────────────────────────────────────────────────────────────────────────────

export async function getAllWorkoutSets(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM workout_sets WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  );
  return rows.map(rowToCamel);
}

// Returns only sets from completed workouts — use for volume analytics.
export async function getCompletedWorkoutSets(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT ws.* FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     WHERE ws.user_id = ? AND w.is_completed = 1
     ORDER BY ws.created_at DESC`,
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function getWorkoutSetsForWorkout(workoutId) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM workout_sets WHERE workout_id = ? ORDER BY set_number ASC',
    [workoutId],
  );
  return rows.map(rowToCamel);
}

export async function getWorkoutSetsForExercise(exerciseId, userId, limit = 100) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM workout_sets
     WHERE exercise_id = ? AND user_id = ?
     ORDER BY created_at DESC LIMIT ?`,
    [exerciseId, userId, limit],
  );
  return rows.map(rowToCamel);
}

export async function getPreviousWorkoutSets(exerciseId, currentWorkoutId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT ws.* FROM workout_sets ws
     JOIN workouts w ON w.id = ws.workout_id
     WHERE ws.exercise_id = ? AND ws.workout_id != ? AND w.is_completed = 1
     ORDER BY ws.created_at DESC`,
    [exerciseId, currentWorkoutId],
  );
  if (rows.length === 0) return [];
  const mapped = rows.map(rowToCamel);
  const mostRecentWorkoutId = mapped[0].workoutId;
  return mapped.filter(s => s.workoutId === mostRecentWorkoutId);
}

export async function getAllCompletedSetsForExercise(exerciseId, currentWorkoutId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT ws.* FROM workout_sets ws
     JOIN workouts w ON w.id = ws.workout_id
     WHERE ws.exercise_id = ? AND ws.workout_id != ? AND w.is_completed = 1
     ORDER BY ws.created_at DESC`,
    [exerciseId, currentWorkoutId],
  );
  return rows.map(rowToCamel);
}

export async function createWorkoutSet(data) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO workout_sets
      (id, user_id, workout_id, exercise_id, set_number, set_type,
       target_reps_min, target_reps_max, actual_reps, weight, rir, rpe,
       failed, notes, is_amrap, amrap_reps, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.userId,
      data.workoutId,
      data.exerciseId,
      data.setNumber || 1,
      data.setType || 'straight',
      data.targetRepsMin ?? null,
      data.targetRepsMax ?? null,
      data.actualReps || 0,
      data.weight || 0,
      data.rir ?? null,
      data.rpe ?? null,
      data.failed ? 1 : 0,
      data.notes || null,
      data.isAmrap ? 1 : 0,
      data.amrapReps ?? null,
      now,
      now,
    ],
  );
  return { id, ...data, createdAt: now, updatedAt: now };
}

// ─── Routines ───────────────────────────────────────────────────────────────────────────────────

export async function getAllRoutines(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM routines WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function getRoutineById(id) {
  const d = await db();
  const row = await d.getFirstAsync('SELECT * FROM routines WHERE id = ?', [id]);
  return rowToCamel(row);
}

export async function createRoutine(userId, name, description = null, splitType = null, isLibrary = 0, sourceRoutineId = null, programmeId = null) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO routines (id, user_id, name, description, split_type, is_active, is_library, source_routine_id, programme_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    [id, userId, name, description, splitType, isLibrary, sourceRoutineId, programmeId, now, now],
  );
  return { id, userId, name, description, splitType, isActive: 1, isLibrary, sourceRoutineId, programmeId, createdAt: now, updatedAt: now };
}

export async function softDeleteRoutine(id) {
  const d = await db();
  await d.runAsync(
    'UPDATE routines SET is_active = 0, updated_at = ? WHERE id = ?',
    [Date.now(), id],
  );
}

// ─── Programmes ───────────────────────────────────────────────────────────────────────────────────────

export async function createProgramme(userId, name, description = null, isLibrary = 0) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO programmes (id, user_id, name, description, is_library, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId || null, name, description, isLibrary, now, now],
  );
  return { id, userId, name, description, isLibrary, createdAt: now, updatedAt: now };
}

export async function getAllProgrammes(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM programmes WHERE user_id = ? OR is_library = 1 ORDER BY created_at ASC',
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function getProgrammeById(id) {
  const d = await db();
  const row = await d.getFirstAsync('SELECT * FROM programmes WHERE id = ?', [id]);
  return rowToCamel(row);
}

export async function copyRoutineFromLibrary(routineId, userId) {
  const original = await getRoutineById(routineId);
  if (!original) throw new Error('Routine not found');
  const newRoutine = await duplicateRoutine(routineId, userId, original.name);
  await (await db()).runAsync(
    'UPDATE routines SET source_routine_id = ?, is_library = 0 WHERE id = ?',
    [routineId, newRoutine.id],
  );
  return { ...newRoutine, sourceRoutineId: routineId, isLibrary: 0 };
}

// ─── Routine Exercises ────────────────────────────────────────────────────────────────────────────────────

export async function getRoutineExercisesWithDetails(routineId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT re.*,
            e.name AS exercise_name,
            e.primary_muscle,
            e.secondary_muscles,
            e.equipment,
            e.movement_pattern,
            e.compound_isolation,
            e.default_rep_min,
            e.default_rep_max,
            e.fatigue_cost,
            e.stimulus_to_fatigue_ratio
     FROM routine_exercises re
     JOIN exercises e ON e.id = re.exercise_id
     WHERE re.routine_id = ?
     ORDER BY re.order_in_routine ASC`,
    [routineId],
  );
  return rows.map(row => {
    const re = rowToCamel(row);
    const exercise = {
      id: row.exercise_id,
      name: row.exercise_name,
      primaryMuscle: row.primary_muscle,
      secondaryMuscles: (() => { try { return JSON.parse(row.secondary_muscles || '[]'); } catch { return []; } })(),
      equipment: row.equipment,
      movementPattern: row.movement_pattern,
      compoundIsolation: row.compound_isolation,
      defaultRepMin: row.default_rep_min,
      defaultRepMax: row.default_rep_max,
      fatigueCost: row.fatigue_cost,
      stimulusToFatigueRatio: row.stimulus_to_fatigue_ratio,
    };
    return { routineExercise: re, exercise };
  });
}

export async function addExerciseToRoutine(routineId, exerciseId, order, repsMin = 6, repsMax = 12, notes = null, sets = 3, startingWeight = null, restSeconds = null) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO routine_exercises
      (id, routine_id, exercise_id, order_in_routine, recommended_sets,
       recommended_reps_min, recommended_reps_max, notes, starting_weight, rest_seconds, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, routineId, exerciseId, order, sets, repsMin, repsMax, notes, startingWeight, restSeconds, now, now],
  );
  return { id, routineId, exerciseId, orderInRoutine: order };
}

export async function updateRoutineExercise(id, data) {
  const d = await db();
  const now = Date.now();
  const fieldMap = {
    recommendedSets: 'recommended_sets',
    recommendedRepsMin: 'recommended_reps_min',
    recommendedRepsMax: 'recommended_reps_max',
    notes: 'notes',
    startingWeight: 'starting_weight',
    restSeconds: 'rest_seconds',
  };
  const fields = [];
  const values = [];
  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in data) {
      fields.push(`${col} = ?`);
      values.push(data[key]);
    }
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(now, id);
  await d.runAsync(`UPDATE routine_exercises SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function getAllRoutineExerciseCounts() {
  const d = await db();
  const rows = await d.getAllAsync('SELECT routine_id, COUNT(*) as cnt FROM routine_exercises GROUP BY routine_id');
  return Object.fromEntries(rows.map(r => [r.routine_id, r.cnt]));
}

export async function updateRoutineName(id, name) {
  const d = await db();
  await d.runAsync('UPDATE routines SET name = ?, updated_at = ? WHERE id = ?', [name, Date.now(), id]);
}

export async function duplicateRoutine(routineId, userId, newName) {
  const d = await db();
  const original = await getRoutineById(routineId);
  if (!original) throw new Error('Routine not found');
  const newRoutine = await createRoutine(userId, newName, original.description, original.splitType);
  const exercises = await getRoutineExercisesWithDetails(routineId);
  for (let i = 0; i < exercises.length; i++) {
    const { routineExercise: re } = exercises[i];
    await addExerciseToRoutine(
      newRoutine.id,
      re.exerciseId,
      i,
      re.recommendedRepsMin,
      re.recommendedRepsMax,
      re.notes,
      re.recommendedSets,
      re.startingWeight,
      re.restSeconds,
    );
  }
  return newRoutine;
}

export async function removeExerciseFromRoutine(id) {
  const d = await db();
  await d.runAsync('DELETE FROM routine_exercises WHERE id = ?', [id]);
}

// ─── Plans (active plan logic, workout templates) ────────────────────

export async function getActivePlan(userId) {
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM programmes WHERE user_id = ? AND is_active = 1 AND (is_library = 0 OR is_library IS NULL) LIMIT 1',
    [userId],
  );
  return rowToCamel(row);
}

export async function setActivePlan(userId, planId) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    'UPDATE programmes SET is_active = 0, updated_at = ? WHERE user_id = ?',
    [now, userId],
  );
  if (planId) {
    await d.runAsync(
      'UPDATE programmes SET is_active = 1, updated_at = ? WHERE id = ?',
      [now, planId],
    );
  }
}

export async function getAllPlansForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM programmes
     WHERE user_id = ? AND (is_library = 0 OR is_library IS NULL) AND (is_archived = 0 OR is_archived IS NULL)
     ORDER BY is_active DESC, updated_at DESC`,
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function getLibraryPlans() {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM programmes WHERE is_library = 1 ORDER BY created_at ASC',
  );
  return rows.map(rowToCamel);
}

export async function getRoutinesForPlan(planId) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM routines WHERE programme_id = ? AND (is_active = 1 OR is_active IS NULL) ORDER BY created_at ASC',
    [planId],
  );
  return rows.map(rowToCamel);
}

export async function advancePlanNextWorkout(planId, totalWorkouts) {
  if (!totalWorkouts || totalWorkouts < 1) return;
  const d = await db();
  const plan = await getProgrammeById(planId);
  if (!plan) return;
  const currentIndex = plan.nextWorkoutIndex || 0;
  const nextIndex = (currentIndex + 1) % totalWorkouts;
  await d.runAsync(
    'UPDATE programmes SET next_workout_index = ?, updated_at = ? WHERE id = ?',
    [nextIndex, Date.now(), planId],
  );
}

export async function copyPlanFromLibrary(libraryPlanId, userId) {
  const d = await db();
  const libPlan = await getProgrammeById(libraryPlanId);
  if (!libPlan) throw new Error('Plan not found');

  const newPlan = await createProgramme(userId, libPlan.name, libPlan.description, 0);

  const libRoutineRows = await d.getAllAsync(
    'SELECT * FROM routines WHERE programme_id = ? AND (is_active = 1 OR is_active IS NULL) ORDER BY created_at ASC',
    [libraryPlanId],
  );

  for (const row of libRoutineRows) {
    const libRoutine = rowToCamel(row);
    const newRoutine = await duplicateRoutine(libRoutine.id, userId, libRoutine.name);
    await d.runAsync(
      'UPDATE routines SET programme_id = ?, is_library = 0, source_routine_id = ?, is_template = 0 WHERE id = ?',
      [newPlan.id, libRoutine.id, newRoutine.id],
    );
  }

  return newPlan;
}

export async function archivePlan(planId) {
  const d = await db();
  await d.runAsync(
    'UPDATE programmes SET is_active = 0, is_archived = 1, updated_at = ? WHERE id = ?',
    [Date.now(), planId],
  );
}

export async function duplicatePlan(planId, userId) {
  const plan = await getProgrammeById(planId);
  if (!plan) throw new Error('Plan not found');

  const newPlan = await createProgramme(userId, `Copy of ${plan.name}`, plan.description, 0);

  const d = await db();
  const routineRows = await d.getAllAsync(
    'SELECT * FROM routines WHERE programme_id = ? AND (is_active = 1 OR is_active IS NULL) ORDER BY created_at ASC',
    [planId],
  );

  for (const row of routineRows) {
    const routine = rowToCamel(row);
    const newRoutine = await duplicateRoutine(routine.id, userId, routine.name);
    await d.runAsync(
      'UPDATE routines SET programme_id = ?, is_library = 0 WHERE id = ?',
      [newPlan.id, newRoutine.id],
    );
  }

  return newPlan;
}

export async function getWorkoutTemplates(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM routines
     WHERE user_id = ? AND (programme_id IS NULL OR programme_id = '') AND (is_library = 0 OR is_library IS NULL) AND (is_active = 1 OR is_active IS NULL)
     ORDER BY updated_at DESC`,
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function createWorkoutTemplateFromWorkout(userId, name, exerciseData) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO routines (id, user_id, name, is_active, is_library, is_template, created_at, updated_at)
     VALUES (?, ?, ?, 1, 0, 1, ?, ?)`,
    [id, userId, name, now, now],
  );
  for (let i = 0; i < exerciseData.length; i++) {
    const ex = exerciseData[i];
    if (!ex.exerciseId) continue;
    await addExerciseToRoutine(id, ex.exerciseId, i, ex.repsMin || 8, ex.repsMax || 12, null, ex.recommendedSets || 3);
  }
  return { id, userId, name, isActive: 1, isLibrary: 0, isTemplate: 1, createdAt: now, updatedAt: now };
}

export async function getPlanWorkoutCounts() {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT programme_id, COUNT(*) as cnt FROM routines
     WHERE programme_id IS NOT NULL AND programme_id != '' AND (is_active = 1 OR is_active IS NULL)
     GROUP BY programme_id`,
  );
  return Object.fromEntries(rows.map(r => [r.programme_id, r.cnt]));
}

export async function updateProgrammeName(id, name) {
  const d = await db();
  await d.runAsync('UPDATE programmes SET name = ?, updated_at = ? WHERE id = ?', [name, Date.now(), id]);
}

// ─── Mesocycles ───────────────────────────────────────────────────────────────────────────────────

export async function getAllMesocycles(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM mesocycles WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function createMesocycle(data) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO mesocycles
      (id, user_id, name, start_date, end_date, duration_weeks, focus,
       is_active, deload_week, auto_regulation_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.userId,
      data.name,
      data.startDate || null,
      data.endDate || null,
      data.durationWeeks || null,
      data.focus || null,
      data.isActive ? 1 : 0,
      data.deloadWeek || null,
      data.autoRegulationEnabled ? 1 : 0,
      now,
      now,
    ],
  );
  return { id, ...data, createdAt: now, updatedAt: now };
}

// ─── Nutrition Targets ────────────────────────────────────

export async function saveNutritionTargets(userId, targets) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    'SELECT id FROM nutrition_targets WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (existing) {
    await d.runAsync(
      `UPDATE nutrition_targets SET
        bmr=?, tdee=?, target_kcal=?, protein_g=?, carbs_g=?, fat_g=?,
        phase=?, bmr_method=?, activity_level=?, confidence=?, warnings=?,
        gdpr_consented=?, updated_at=?
       WHERE user_id=?`,
      [
        targets.bmr ?? null, targets.tdee ?? null, targets.targetKcal ?? null,
        targets.proteinG ?? null, targets.carbsG ?? null, targets.fatG ?? null,
        targets.phase ?? null, targets.bmrMethod ?? null, targets.activityLevel ?? null,
        targets.confidence ?? null,
        targets.warnings ? JSON.stringify(targets.warnings) : null,
        targets.gdprConsented ? 1 : 0,
        now, userId,
      ],
    );
    return existing.id;
  }
  const id = uid();
  await d.runAsync(
    `INSERT INTO nutrition_targets
      (id, user_id, bmr, tdee, target_kcal, protein_g, carbs_g, fat_g,
       phase, bmr_method, activity_level, confidence, warnings, gdpr_consented, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId,
      targets.bmr ?? null, targets.tdee ?? null, targets.targetKcal ?? null,
      targets.proteinG ?? null, targets.carbsG ?? null, targets.fatG ?? null,
      targets.phase ?? null, targets.bmrMethod ?? null, targets.activityLevel ?? null,
      targets.confidence ?? null,
      targets.warnings ? JSON.stringify(targets.warnings) : null,
      targets.gdprConsented ? 1 : 0, now, now,
    ],
  );
  return id;
}

export async function getNutritionTargets(userId) {
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM nutrition_targets WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!row) return null;
  const result = rowToCamel(row);
  if (result.warnings && typeof result.warnings === 'string') {
    try { result.warnings = JSON.parse(result.warnings); } catch { result.warnings = []; }
  }
  return result;
}

// ─── Body Metrics ─────────────────────────────────────────────

export async function logBodyMetric(userId, data) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO body_metric_log
      (id, user_id, logged_at, weight_kg, body_fat_percent, body_fat_source,
       waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm,
       shoulders_cm, forearm_cm, ham_cm, calf_cm, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, data.loggedAt ?? now,
      data.weightKg ?? null, data.bodyFatPercent ?? null, data.bodyFatSource ?? null,
      data.waistCm ?? null, data.chestCm ?? null, data.hipsCm ?? null,
      data.thighCm ?? null, data.armCm ?? null,
      data.shouldersCm ?? null, data.forearmCm ?? null, data.hamCm ?? null,
      data.calfCm ?? null, data.notes ?? null, now,
    ],
  );
  return { id, userId, createdAt: now, ...data };
}

export async function getBodyMetricLog(userId, limitRows = 90) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM body_metric_log WHERE user_id = ? ORDER BY logged_at DESC LIMIT ?',
    [userId, limitRows],
  );
  return rows.map(rowToCamel);
}

export async function getLatestBodyWeight(userId) {
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT weight_kg, logged_at FROM body_metric_log
     WHERE user_id = ? AND weight_kg IS NOT NULL
     ORDER BY logged_at DESC LIMIT 1`,
    [userId],
  );
  if (!row || row.weight_kg == null) return null;
  return { weightKg: row.weight_kg, loggedAt: row.logged_at };
}

// ─── CSV / JSON export ────────────────────────────────────────────

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function buildWorkoutCSV(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT
       ws.created_at        AS set_created_at,
       w.name               AS workout_name,
       r.name               AS routine_name,
       p.name               AS programme_name,
       e.name               AS exercise_name,
       ws.set_number, ws.set_type, ws.weight, ws.actual_reps,
       ws.rir, ws.rpe, ws.failed, ws.missed_reps, ws.notes
     FROM workout_sets ws
     LEFT JOIN workouts   w ON ws.workout_id = w.id
     LEFT JOIN routines   r ON w.routine_id  = r.id
     LEFT JOIN programmes p ON r.programme_id = p.id
     LEFT JOIN exercises  e ON ws.exercise_id = e.id
     WHERE ws.user_id = ?
     ORDER BY ws.created_at ASC`,
    [userId],
  );

  const header = [
    'date', 'time', 'routine', 'programme', 'exercise',
    'set_n', 'set_type', 'weight_kg', 'weight_lb', 'reps',
    'rir', 'rpe', 'failed', 'missed_reps', 'notes',
  ];
  const lines = [header.join(',')];

  for (const r of rows) {
    const dt = r.set_created_at ? new Date(r.set_created_at) : null;
    const date = dt ? dt.toISOString().slice(0, 10) : '';
    const time = dt ? dt.toISOString().slice(11, 19) : '';
    const wkg = r.weight ?? '';
    const wlb = r.weight != null ? Math.round(r.weight * 2.20462 * 10) / 10 : '';
    lines.push([
      date, time,
      csvEscape(r.routine_name), csvEscape(r.programme_name), csvEscape(r.exercise_name),
      r.set_number ?? '', csvEscape(r.set_type), wkg, wlb, r.actual_reps ?? '',
      r.rir ?? '', r.rpe ?? '', r.failed ? 1 : 0, r.missed_reps ?? '',
      csvEscape(r.notes),
    ].join(','));
  }

  return { csv: lines.join('\n'), rowCount: rows.length };
}

// ─── User Insights ────────────────────────────────────────────────

/**
 * Upserts freshly-generated insights. An insight is keyed by `insight_key`.
 * If a non-dismissed row with the same key exists, it is refreshed in place
 * (so the same condition doesn't stack). Dismissed insights are NOT
 * resurrected unless their key disappears and reappears after dismissal age.
 */
export async function persistInsights(userId, insights) {
  const d = await db();
  const now = Date.now();
  for (const ins of insights) {
    const existing = await d.getFirstAsync(
      `SELECT id, dismissed_at FROM user_insights
       WHERE user_id = ? AND insight_key = ?
       ORDER BY generated_at DESC LIMIT 1`,
      [userId, ins.key],
    );
    if (existing) {
      // Don't resurrect something the user dismissed in the last 14 days.
      if (existing.dismissed_at && now - existing.dismissed_at < 14 * 24 * 60 * 60 * 1000) {
        continue;
      }
      if (!existing.dismissed_at) {
        await d.runAsync(
          `UPDATE user_insights
           SET type=?, severity=?, copy=?, action_payload=?, generated_at=?
           WHERE id=?`,
          [ins.type, ins.severity, ins.copy,
           ins.actionPayload ? JSON.stringify(ins.actionPayload) : null,
           now, existing.id],
        );
        continue;
      }
    }
    await d.runAsync(
      `INSERT INTO user_insights
        (id, user_id, insight_key, type, severity, copy, action_payload, generated_at, dismissed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [uid(), userId, ins.key, ins.type, ins.severity, ins.copy,
       ins.actionPayload ? JSON.stringify(ins.actionPayload) : null, now],
    );
  }
}

export async function getActiveInsights(userId, limitRows = 3) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM user_insights
     WHERE user_id = ? AND dismissed_at IS NULL
     ORDER BY severity DESC, generated_at DESC
     LIMIT ?`,
    [userId, limitRows],
  );
  return rows.map(r => {
    const c = rowToCamel(r);
    if (c.actionPayload) {
      try { c.actionPayload = JSON.parse(c.actionPayload); } catch { c.actionPayload = null; }
    }
    return c;
  });
}

export async function dismissInsight(insightId) {
  const d = await db();
  await d.runAsync(
    'UPDATE user_insights SET dismissed_at = ? WHERE id = ?',
    [Date.now(), insightId],
  );
}

/**
 * Loads the last 28 days of training, runs the deterministic insight engine,
 * and persists results. Safe to call on screen mount + post-session.
 */
export async function runInsightsEngine(userId) {
  if (!userId) return [];
  try {
    const [workouts, sets, exercises] = await Promise.all([
      getAllWorkouts(userId),
      getAllWorkoutSets(userId),
      getAllExercises(),
    ]);
    const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));
    const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const recentSets = sets.filter(s => (s.createdAt ?? s.created_at ?? 0) >= cutoff);
    const insights = generateInsights({
      workouts, sets: recentSets, exerciseMap, now: Date.now(),
    });
    await persistInsights(userId, insights);
    return getActiveInsights(userId, 3);
  } catch (e) {
    console.warn('runInsightsEngine failed:', e);
    return [];
  }
}

// ─── User Body Profile ────────────────────────────────────────────

export async function saveUserBodyProfile(userId, profile) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    'SELECT id FROM user_body_profile WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (existing) {
    await d.runAsync(
      `UPDATE user_body_profile SET
        sex=?, date_of_birth=?, height_cm=?, experience_level=?,
        training_age_years=?, primary_goal=?, gdpr_consented=?, updated_at=?
       WHERE user_id=?`,
      [
        profile.sex ?? null, profile.dateOfBirth ?? null, profile.heightCm ?? null,
        profile.experienceLevel ?? null, profile.trainingAgeYears ?? null,
        profile.primaryGoal ?? null, profile.gdprConsented ? 1 : 0, now, userId,
      ],
    );
    return existing.id;
  }
  const id = uid();
  await d.runAsync(
    `INSERT INTO user_body_profile
      (id, user_id, sex, date_of_birth, height_cm, experience_level,
       training_age_years, primary_goal, gdpr_consented, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, profile.sex ?? null, profile.dateOfBirth ?? null, profile.heightCm ?? null,
      profile.experienceLevel ?? null, profile.trainingAgeYears ?? null,
      profile.primaryGoal ?? null, profile.gdprConsented ? 1 : 0, now, now,
    ],
  );
  return id;
}

export async function getUserBodyProfile(userId) {
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM user_body_profile WHERE user_id = ? LIMIT 1',
    [userId],
  );
  return rowToCamel(row);
}

export async function clearWorkoutHistory(userId) {
  const d = await db();
  await d.runAsync('DELETE FROM workout_sets WHERE user_id = ?', [userId]);
  await d.runAsync('DELETE FROM workouts WHERE user_id = ?', [userId]);
}
