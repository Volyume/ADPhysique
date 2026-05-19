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
    CREATE TABLE IF NOT EXISTS peak_week_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      show_date TEXT,
      federation TEXT,
      current_bodyweight REAL,
      lean_estimate REAL,
      prep_carbs_per_kg REAL,
      prep_sodium_mg REAL,
      prep_water_l REAL,
      status TEXT DEFAULT 'active',
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

  await runMigrations(_db);
  return _db;
}

// ─── Structured migration system ────────────────────────────────────────────
//
// Each entry in SCHEMA_MIGRATIONS is one schema version: an ordered list of
// SQL statements. The applied version is tracked in SQLite's own
// `PRAGMA user_version`, so every migration runs exactly once and future
// schema changes only need a new array entry appended here — existing user
// data is never wiped or re-migrated.
//
// IMPORTANT: never edit or reorder an existing migration once shipped. Only
// append new ones. To change the schema, add a new sub-array.
const SCHEMA_MIGRATIONS = [
  // v1 — additive columns + the programmes table. These predate version
  // tracking, so on installs upgrading from the old swallow-all loop the
  // columns may already exist; "duplicate column" is tolerated below.
  [
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
  ],
  // v2 — remap exercises.primary_muscle from generic 'shoulders' to the
  // correct delt head. Idempotent: no-ops once rows are updated.
  [
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
    `UPDATE exercises SET primary_muscle = 'side_delts'
     WHERE primary_muscle = 'shoulders'`,
  ],
  // v3 — mesocycle week scaffold: week table, planned volume, adaptation events,
  // plus additive columns on mesocycles / workouts / exercises / workout_sets.
  [
    `ALTER TABLE mesocycles ADD COLUMN block_type TEXT DEFAULT 'offseason_hypertrophy'`,
    `ALTER TABLE mesocycles ADD COLUMN planned_weeks INTEGER DEFAULT 5`,
    `ALTER TABLE mesocycles ADD COLUMN deload_protocol TEXT DEFAULT 'rp_classic'`,
    `ALTER TABLE mesocycles ADD COLUMN rir_ladder TEXT DEFAULT '[3,2,1,0,4]'`,
    `ALTER TABLE mesocycles ADD COLUMN status TEXT DEFAULT 'active'`,
    `CREATE TABLE IF NOT EXISTS mesocycle_weeks (
      id TEXT PRIMARY KEY,
      mesocycle_id TEXT NOT NULL,
      week_index INTEGER NOT NULL,
      is_deload INTEGER NOT NULL DEFAULT 0,
      rir_target INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS planned_muscle_volume (
      id TEXT PRIMARY KEY,
      mesocycle_week_id TEXT NOT NULL,
      muscle TEXT NOT NULL,
      planned_sets INTEGER NOT NULL,
      mev INTEGER NOT NULL,
      mav INTEGER NOT NULL,
      mrv INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'template',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS adaptation_events (
      id TEXT PRIMARY KEY,
      mesocycle_week_id TEXT NOT NULL,
      muscle TEXT,
      exercise_id TEXT,
      decision TEXT NOT NULL,
      delta INTEGER,
      reason_code TEXT NOT NULL,
      reason_text TEXT,
      signals_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `ALTER TABLE workouts ADD COLUMN mesocycle_week_id TEXT`,
    `ALTER TABLE exercises ADD COLUMN increment_kg REAL DEFAULT 2.5`,
    `ALTER TABLE exercises ADD COLUMN exercise_category TEXT DEFAULT 'compound'`,
    `ALTER TABLE workout_sets ADD COLUMN rir INTEGER`,
    `ALTER TABLE workout_sets ADD COLUMN rpe REAL`,
  ],
  // v4 — add joint_discomfort to workouts so feedback is fully persisted
  [
    `ALTER TABLE workouts ADD COLUMN joint_discomfort INTEGER`,
  ],
  // v5 — add difficulty to programmes so library filter chips work
  [
    'ALTER TABLE programmes ADD COLUMN difficulty INTEGER',
  ],
  // v6 — Pro coaching tables: morning weights, weekly check-ins, coach outputs
  [
    `CREATE TABLE IF NOT EXISTS morning_weights (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      logged_at INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_morning_weights_user ON morning_weights(user_id, logged_at)`,
    `CREATE TABLE IF NOT EXISTS weekly_checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      week_start INTEGER NOT NULL,
      energy_score INTEGER,
      soreness_score INTEGER,
      stress_score INTEGER,
      sleep_hours REAL,
      cals_adherence TEXT,
      steps_adherence TEXT,
      cycle_override INTEGER DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_weekly_checkins_user ON weekly_checkins(user_id, week_start)`,
    `CREATE TABLE IF NOT EXISTS coach_outputs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      week_start INTEGER NOT NULL,
      goal_phase TEXT,
      volume_signal INTEGER,
      load_signal TEXT,
      recovery_flag TEXT,
      calorie_change INTEGER,
      steps_target INTEGER,
      cardio_prescription TEXT,
      why_this TEXT,
      output_json TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_coach_outputs_user ON coach_outputs(user_id, week_start)`,
  ],
  // v7 — add training performance and joint pain to weekly check-ins
  [
    'ALTER TABLE weekly_checkins ADD COLUMN training_performance TEXT',
    'ALTER TABLE weekly_checkins ADD COLUMN joint_pain INTEGER DEFAULT 0',
  ],
];

// Errors that are safe to ignore when re-applying additive migrations on
// installs that pre-date version tracking (the column/table already exists).
function isBenignMigrationError(err) {
  const m = String(err?.message || err).toLowerCase();
  return m.includes('duplicate column')
    || m.includes('already exists')
    || m.includes('duplicate column name');
}

async function runMigrations(d) {
  let current = 0;
  try {
    const row = await d.getFirstAsync('PRAGMA user_version');
    current = row?.user_version ?? 0;
  } catch (_) { current = 0; }

  for (let v = current; v < SCHEMA_MIGRATIONS.length; v++) {
    for (const sql of SCHEMA_MIGRATIONS[v]) {
      try {
        await d.execAsync(sql);
      } catch (e) {
        if (isBenignMigrationError(e)) continue;
        // A genuine migration failure — surface it instead of silently
        // corrupting the schema and crashing later at an unrelated query.
        console.warn(`[db] migration v${v + 1} failed:`, e?.message || e);
        throw e;
      }
    }
    // PRAGMA does not accept bound params; v is an integer we control.
    await d.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
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
       stimulus_to_fatigue_ratio, subregion, is_custom, notes, created_at, updated_at,
       exercise_category, increment_kg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.exerciseCategory ?? 'compound',
      data.incrementKg ?? 2.5,
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
  // Also link to the current mesocycle week if one exists
  let mesocycleWeekId = null;
  if (mesocycleId) {
    const activeWeek = await d.getFirstAsync(
      `SELECT id FROM mesocycle_weeks WHERE mesocycle_id = ? ORDER BY week_index ASC LIMIT 1`,
      [mesocycleId],
    );
    mesocycleWeekId = activeWeek?.id ?? null;
  }
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO workouts (id, user_id, routine_id, mesocycle_id, mesocycle_week_id, started_at, is_completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, userId, routineId, mesocycleId, mesocycleWeekId, now, now, now],
  );
  return { id, userId, routineId, mesocycleId, mesocycleWeekId, startedAt: now, isCompleted: 0, createdAt: now, updatedAt: now };
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
    jointDiscomfort: 'joint_discomfort',
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

// Returns sets from the last n completed workouts for an exercise,
// grouped as an array of arrays: [mostRecentSets, previousSets, ...].
export async function getLastNWorkoutSets(exerciseId, currentWorkoutId, n = 2) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT ws.* FROM workout_sets ws
     JOIN workouts w ON w.id = ws.workout_id
     WHERE ws.exercise_id = ? AND ws.workout_id != ? AND w.is_completed = 1
     ORDER BY w.started_at DESC, ws.set_number ASC`,
    [exerciseId, currentWorkoutId],
  );
  if (rows.length === 0) return [];
  const mapped = rows.map(rowToCamel);
  const order = [];
  const byWorkout = {};
  for (const s of mapped) {
    if (!byWorkout[s.workoutId]) { byWorkout[s.workoutId] = []; order.push(s.workoutId); }
    byWorkout[s.workoutId].push(s);
  }
  return order.slice(0, n).map(wId => byWorkout[wId]);
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

export async function createProgramme(userId, name, description = null, isLibrary = 0, tags = null, splitType = null, difficulty = null) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO programmes (id, user_id, name, description, is_library, tags, split_type, difficulty, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId || null, name, description, isLibrary, tags, splitType, difficulty, now, now],
  );
  return { id, userId, name, description, isLibrary, tags, splitType, difficulty, createdAt: now, updatedAt: now };
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

// Sets a plan active AND creates a matching training block so the Analytics
// card is populated immediately. Deactivates any existing active mesocycle first.
export async function activatePlanWithBlock(userId, planId, planName) {
  await setActivePlan(userId, planId);

  const d = await db();
  const now = Date.now();
  await d.runAsync(
    'UPDATE mesocycles SET is_active = 0, updated_at = ? WHERE user_id = ?',
    [now, userId],
  );

  const id = uid();
  const startDate = new Date().toISOString().slice(0, 10);
  // 6 weeks: 5 accumulation (RIR 3→2→1→0→0) + 1 deload (RIR 4)
  await d.runAsync(
    `INSERT INTO mesocycles
      (id, user_id, name, start_date, duration_weeks, planned_weeks, focus,
       block_type, rir_ladder, is_active, auto_regulation_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, 6, 6, ?, ?, ?, 1, 1, ?, ?)`,
    [id, userId, planName, startDate, 'hypertrophy', 'offseason_hypertrophy', '[3,2,1,0,0,4]', now, now],
  );

  await generateMesocycleWeeks(id);
  const { VOLUME_LANDMARKS } = await import('./algorithms');
  await generateInitialPlannedVolume(id, VOLUME_LANDMARKS);

  return id;
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

export async function getActiveBlock(userId) {
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM mesocycles WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
    [userId],
  );
  return row ? rowToCamel(row) : null;
}

export async function getAllMesocycles(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM mesocycles WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  );
  return rows.map(rowToCamel);
}

// Generate mesocycle_week rows for a mesocycle based on its RIR ladder
export async function generateMesocycleWeeks(mesocycleId) {
  const d = await db();
  const meso = await d.getFirstAsync('SELECT * FROM mesocycles WHERE id = ?', [mesocycleId]);
  if (!meso) return [];

  const plannedWeeks = meso.planned_weeks || 5;
  let rirLadder;
  try {
    rirLadder = JSON.parse(meso.rir_ladder || '[3,2,1,0,4]');
  } catch (_) {
    rirLadder = [3, 2, 1, 0, 4];
  }

  const now = Date.now();
  const weeks = [];

  for (let i = 0; i < plannedWeeks; i++) {
    const weekIndex = i + 1;
    const isDeload = weekIndex === plannedWeeks ? 1 : 0;
    const rirTarget = rirLadder[i] ?? (isDeload ? 4 : Math.max(0, 3 - i));
    const id = `mw_${mesocycleId}_${weekIndex}`;

    await d.runAsync(
      `INSERT OR IGNORE INTO mesocycle_weeks (id, mesocycle_id, week_index, is_deload, rir_target, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, mesocycleId, weekIndex, isDeload, rirTarget, now],
    );

    weeks.push({ id, mesocycleId, weekIndex, isDeload, rirTarget });
  }

  return weeks;
}

// Get the current active mesocycle week for a user
export async function getCurrentMesocycleWeek(userId) {
  try {
    const d = await db();

    // Find the week linked to the most recent workout — that's the current week
    const fromWorkout = await d.getFirstAsync(
      `SELECT mw.*, m.name AS meso_name, m.block_type, m.planned_weeks,
              m.rir_ladder, m.deload_protocol, m.status AS meso_status
       FROM mesocycle_weeks mw
       JOIN mesocycles m ON m.id = mw.mesocycle_id
       JOIN workouts w ON w.mesocycle_week_id = mw.id
       WHERE m.user_id = ? AND m.is_active = 1
       ORDER BY w.started_at DESC
       LIMIT 1`,
      [userId],
    );

    // Fall back to the first week if no workouts have been linked yet
    const row = fromWorkout ?? await d.getFirstAsync(
      `SELECT mw.*, m.name AS meso_name, m.block_type, m.planned_weeks,
              m.rir_ladder, m.deload_protocol, m.status AS meso_status
       FROM mesocycle_weeks mw
       JOIN mesocycles m ON m.id = mw.mesocycle_id
       WHERE m.user_id = ? AND m.is_active = 1 AND m.status = 'active'
       ORDER BY mw.week_index ASC
       LIMIT 1`,
      [userId],
    );

    if (!row) return null;

    return {
      id: row.id,
      mesocycleId: row.mesocycle_id,
      weekIndex: row.week_index,
      isDeload: row.is_deload === 1,
      rirTarget: row.rir_target,
      mesoName: row.meso_name,
      blockType: row.block_type,
      plannedWeeks: row.planned_weeks,
      deloadProtocol: row.deload_protocol,
    };
  } catch (_e) {
    return null;
  }
}

export async function getNextMesocycleWeek(currentWeekId) {
  try {
    const d = await db();
    const current = await d.getFirstAsync(
      'SELECT * FROM mesocycle_weeks WHERE id = ?',
      [currentWeekId],
    );
    if (!current) return null;
    return await d.getFirstAsync(
      'SELECT * FROM mesocycle_weeks WHERE mesocycle_id = ? AND week_index = ?',
      [current.mesocycle_id, current.week_index + 1],
    );
  } catch (_e) {
    return null;
  }
}

// Seed planned_muscle_volume for all weeks of a mesocycle with a MEV→MAV ramp
// Called once when a mesocycle is created (or can be called again to re-seed)
export async function generateInitialPlannedVolume(mesocycleId, volumeLandmarks) {
  try {
    const d = await db();
    const weeks = await d.getAllAsync(
      'SELECT * FROM mesocycle_weeks WHERE mesocycle_id = ? ORDER BY week_index ASC',
      [mesocycleId],
    );
    if (weeks.length === 0) return;

    const accWeeks = weeks.filter(w => !w.is_deload);
    const deloadWeek = weeks.find(w => w.is_deload);
    const totalAcc = accWeeks.length;

    for (const [muscle, landmarks] of Object.entries(volumeLandmarks)) {
      const { mev, mav, mrv } = landmarks;
      // Ramp from MEV to MAV over accumulation weeks
      for (let i = 0; i < accWeeks.length; i++) {
        const week = accWeeks[i];
        const progress = totalAcc <= 1 ? 1 : i / (totalAcc - 1);
        const planned = Math.round(mev + (mav - mev) * progress);
        const id = `pmv_${week.id}_${muscle}`;
        const now = Date.now();
        await d.runAsync(
          `INSERT OR IGNORE INTO planned_muscle_volume
             (id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'template', ?, ?)`,
          [id, week.id, muscle, planned, mev, mav, mrv, now, now],
        );
      }
      // Deload week = MEV
      if (deloadWeek) {
        const id = `pmv_${deloadWeek.id}_${muscle}`;
        const now = Date.now();
        await d.runAsync(
          `INSERT OR IGNORE INTO planned_muscle_volume
             (id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'template', ?, ?)`,
          [id, deloadWeek.id, muscle, mev, mev, mav, mrv, now, now],
        );
      }
    }
  } catch (_e) {}
}

// Get all weeks for a mesocycle
export async function getMesocycleWeeks(mesocycleId) {
  try {
    const d = await db();
    const rows = await d.getAllAsync(
      'SELECT * FROM mesocycle_weeks WHERE mesocycle_id = ? ORDER BY week_index ASC',
      [mesocycleId],
    );
    return rows;
  } catch (_e) {
    return [];
  }
}

// Write an adaptation event (engine decision log)
export async function createAdaptationEvent({ mesocycleWeekId, muscle, exerciseId, decision, delta, reasonCode, reasonText, signals }) {
  try {
    const d = await db();
    const id = `ae_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    await d.runAsync(
      `INSERT INTO adaptation_events (id, mesocycle_week_id, muscle, exercise_id, decision, delta, reason_code, reason_text, signals_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, mesocycleWeekId, muscle || null, exerciseId || null, decision, delta ?? null, reasonCode, reasonText || null, JSON.stringify(signals || {}), now],
    );
    return { id };
  } catch (_e) {
    return null;
  }
}

// Get planned muscle volume for a week
export async function getPlannedMuscleVolume(mesocycleWeekId) {
  try {
    const d = await db();
    const rows = await d.getAllAsync(
      'SELECT * FROM planned_muscle_volume WHERE mesocycle_week_id = ? ORDER BY muscle ASC',
      [mesocycleWeekId],
    );
    return rows;
  } catch (_e) {
    return [];
  }
}

// Fetch recent adaptation_events for the current mesocycle week (to evaluate deload triggers)
export async function getRecentAdaptationEvents(userId, limitWeeks = 1) {
  try {
    const d = await db();
    const cutoff = Date.now() - limitWeeks * 7 * 24 * 60 * 60 * 1000;
    const rows = await d.getAllAsync(
      `SELECT ae.*
       FROM adaptation_events ae
       JOIN mesocycle_weeks mw ON mw.id = ae.mesocycle_week_id
       JOIN mesocycles m ON m.id = mw.mesocycle_id
       WHERE m.user_id = ? AND ae.created_at >= ?
       ORDER BY ae.created_at DESC`,
      [userId, cutoff],
    );
    return rows;
  } catch (_e) {
    return [];
  }
}

// Get the week-1 sets for an exercise within a mesocycle (for deload anchoring)
export async function getWeek1SetsForExercise(mesocycleId, exerciseId) {
  try {
    const d = await db();
    const week1 = await d.getFirstAsync(
      'SELECT id FROM mesocycle_weeks WHERE mesocycle_id = ? AND week_index = 1',
      [mesocycleId],
    );
    if (!week1) return [];
    const sets = await d.getAllAsync(
      `SELECT ws.* FROM workout_sets ws
       JOIN workouts w ON w.id = ws.workout_id
       WHERE w.mesocycle_week_id = ? AND ws.exercise_id = ? AND ws.set_type != 'warmup'
       ORDER BY ws.set_number ASC`,
      [week1.id, exerciseId],
    );
    return sets.map(s => ({
      weight: s.weight,
      actualReps: s.actual_reps ?? s.actualReps,
      setType: s.set_type ?? s.setType ?? 'straight',
      rir: s.rir,
    }));
  } catch (_e) {
    return [];
  }
}

// Write or update planned muscle volume for a week (engine writes here)
export async function upsertPlannedMuscleVolume({ mesocycleWeekId, muscle, plannedSets, mev, mav, mrv, source = 'engine' }) {
  try {
    const d = await db();
    const id = `pmv_${mesocycleWeekId}_${muscle}`;
    const now = Date.now();
    await d.runAsync(
      `INSERT INTO planned_muscle_volume (id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET planned_sets = excluded.planned_sets, source = excluded.source, updated_at = excluded.updated_at`,
      [id, mesocycleWeekId, muscle, plannedSets, mev, mav, mrv, source, now, now],
    );
  } catch (_e) {}
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
  // Auto-generate week schedule
  await generateMesocycleWeeks(id);
  // Seed planned volume from default landmarks
  const { VOLUME_LANDMARKS } = await import('./algorithms');
  await generateInitialPlannedVolume(id, VOLUME_LANDMARKS);
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
  const [bodyRow, morningRow] = await Promise.all([
    d.getFirstAsync(
      `SELECT weight_kg, logged_at FROM body_metric_log
       WHERE user_id = ? AND weight_kg IS NOT NULL
       ORDER BY logged_at DESC LIMIT 1`,
      [userId],
    ),
    d.getFirstAsync(
      `SELECT weight_kg, logged_at FROM morning_weights
       WHERE user_id = ? AND weight_kg IS NOT NULL
       ORDER BY logged_at DESC LIMIT 1`,
      [userId],
    ),
  ]);
  const bodyTs   = bodyRow?.logged_at ?? 0;
  const morningTs = morningRow?.logged_at ?? 0;
  const winner = bodyTs >= morningTs ? bodyRow : morningRow;
  if (!winner || winner.weight_kg == null) return null;
  return { weightKg: winner.weight_kg, loggedAt: winner.logged_at };
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

  // Prune active (non-dismissed) insights that are no longer generated, so a
  // condition that has resolved — or a rule that no longer applies after a
  // logic fix — stops showing instead of lingering forever. Dismissed rows
  // are kept so the 14-day "don't resurrect" window still works.
  const liveKeys = insights.map(i => i.key);
  if (liveKeys.length > 0) {
    const placeholders = liveKeys.map(() => '?').join(', ');
    await d.runAsync(
      `DELETE FROM user_insights
       WHERE user_id = ? AND dismissed_at IS NULL
       AND insight_key NOT IN (${placeholders})`,
      [userId, ...liveKeys],
    );
  } else {
    await d.runAsync(
      'DELETE FROM user_insights WHERE user_id = ? AND dismissed_at IS NULL',
      [userId],
    );
  }

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

// ─── Full local backup / restore ────────────────────────────────────────────
//
// Every user-owned table. exercises is intentionally excluded: it is seed
// data, not user data, and is re-seeded on launch — dumping ~150 canonical
// rows would only bloat the backup. Custom exercises are preserved because
// they're referenced by workout_sets via exercise_id; if a restore lands on
// a fresh install the seed covers the canonical set.
export const BACKUP_TABLES = [
  'workouts',
  'workout_sets',
  'routines',
  'routine_exercises',
  'programmes',
  'mesocycles',
  'nutrition_targets',
  'peak_week_plans',
  'body_metric_log',
  'user_insights',
  'user_body_profile',
];

// Returns { schemaVersion, tables: { tableName: [rawRows...] } }.
// Raw rows (snake_case) are dumped as-is so a restore is a faithful round-trip.
export async function dumpAllTables() {
  const d = await db();
  let schemaVersion = 0;
  try {
    const v = await d.getFirstAsync('PRAGMA user_version');
    schemaVersion = v?.user_version ?? 0;
  } catch (_) {}
  const tables = {};
  for (const t of BACKUP_TABLES) {
    try {
      tables[t] = await d.getAllAsync(`SELECT * FROM ${t}`);
    } catch (_) {
      tables[t] = [];
    }
  }
  return { schemaVersion, tables };
}

// Wipes BACKUP_TABLES and reinserts the supplied rows inside one
// transaction. All-or-nothing: a failure rolls back and leaves the
// existing data untouched.
export async function restoreAllTables(dump) {
  const d = await db();
  const tables = dump?.tables || {};
  await d.withTransactionAsync(async () => {
    for (const t of BACKUP_TABLES) {
      const rows = tables[t];
      if (!Array.isArray(rows)) continue;
      await d.runAsync(`DELETE FROM ${t}`);
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map(c => row[c]);
        await d.runAsync(
          `INSERT OR REPLACE INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`,
          values,
        );
      }
    }
  });
}

// ─── Adaptive Volume Landmarks ──────────────────────────────────────────────
// Builds the history array consumed by computeAdaptiveLandmarks() in algorithms.js.
// Uses the workouts table (not the old workout_feedback table which never existed).
// Derives performanceTrend from rep history and missedReps from target vs actual.
export async function getAdaptiveLandmarkHistory(userId) {
  try {
    const d = await db();
    const rows = await d.getAllAsync(
      `SELECT
         w.id AS workout_id,
         w.started_at,
         w.overall_pump,
         w.soreness_24h_before,
         w.joint_discomfort,
         e.primary_muscle AS muscle,
         COUNT(*) AS set_count,
         AVG(ws.actual_reps) AS avg_reps,
         AVG(
           CASE
             WHEN ws.target_reps_min IS NOT NULL
              AND ws.actual_reps < ws.target_reps_min
             THEN ws.target_reps_min - ws.actual_reps
             ELSE 0
           END
         ) AS avg_missed
       FROM workouts w
       JOIN workout_sets ws ON ws.workout_id = w.id AND ws.set_type != 'warmup'
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE w.user_id = ? AND w.is_completed = 1 AND w.overall_pump IS NOT NULL
       GROUP BY w.id, e.primary_muscle
       ORDER BY w.started_at DESC
       LIMIT 200`,
      [userId],
    );

    if (rows.length === 0) return [];

    // Derive performanceTrend per muscle: compare avg reps from last 3 sessions vs 3 before.
    // -1 = declining, 0 = flat, 1 = improving.
    const byMuscle = {};
    for (const row of rows) {
      if (!row.muscle) continue;
      if (!byMuscle[row.muscle]) byMuscle[row.muscle] = [];
      byMuscle[row.muscle].push(row); // already DESC by started_at
    }
    const trendKey = {};
    for (const [muscle, sessions] of Object.entries(byMuscle)) {
      const recent  = sessions.slice(0, 3);
      const earlier = sessions.slice(3, 6);
      if (recent.length >= 2 && earlier.length >= 1) {
        const rAvg = recent.reduce((s, r)  => s + (r.avg_reps || 0), 0) / recent.length;
        const eAvg = earlier.reduce((s, r) => s + (r.avg_reps || 0), 0) / earlier.length;
        const trend = rAvg > eAvg + 1 ? 1 : rAvg < eAvg - 1 ? -1 : 0;
        for (const s of sessions) trendKey[`${s.workout_id}_${muscle}`] = trend;
      }
    }

    // Scale mapping: workouts store 1–3 sliders; computeAdaptiveLandmarks expects
    // pumpScore on a 1–5 scale (centred at 3) and sorenessScore on 1–5 (centred at 2).
    // These match the RP-scale conversions used in WorkoutSummaryScreen.
    const PUMP_MAP    = [1, 2, 4]; // overall_pump 1→1, 2→2, 3→4
    const SORENESS_MAP = [2, 3, 4]; // soreness_24h_before 1→2, 2→3, 3→4

    return rows.map(row => ({
      muscle: row.muscle,
      pumpScore:       PUMP_MAP[(row.overall_pump || 2) - 1]     ?? 3,
      sorenessScore:   SORENESS_MAP[(row.soreness_24h_before || 1) - 1] ?? 2,
      jointDiscomfort: row.joint_discomfort || 0,
      weeklyVolume:    row.set_count,
      performanceTrend: trendKey[`${row.workout_id}_${row.muscle}`] ?? 0,
      prFrequency:     0,
      missedReps:      Math.round((row.avg_missed || 0) * 10) / 10,
    }));
  } catch (_e) {
    return [];
  }
}

// ─── Pro: Morning Weights ─────────────────────────────────────────────────────

export async function logMorningWeight(userId, { weightKg, loggedAt = Date.now(), notes = null } = {}) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  const dayStart = loggedAt - (loggedAt % 86400000);
  const existing = await d.getFirstAsync(
    'SELECT id FROM morning_weights WHERE user_id = ? AND logged_at >= ? AND logged_at < ?',
    [userId, dayStart, dayStart + 86400000],
  );
  if (existing?.id) {
    await d.runAsync(
      'UPDATE morning_weights SET weight_kg = ?, notes = ? WHERE id = ?',
      [weightKg, notes, existing.id],
    );
    return existing.id;
  }
  await d.runAsync(
    'INSERT INTO morning_weights (id, user_id, logged_at, weight_kg, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, loggedAt, weightKg, notes, now],
  );
  return id;
}

export async function getMorningWeightsLast14Days(userId) {
  const d = await db();
  const since = Date.now() - 14 * 86400000;
  const rows = await d.getAllAsync(
    'SELECT * FROM morning_weights WHERE user_id = ? AND logged_at >= ? ORDER BY logged_at ASC',
    [userId, since],
  );
  return rows.map(rowToCamel);
}

export async function getMorningWeights(userId, limit = 90) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM morning_weights WHERE user_id = ? ORDER BY logged_at DESC LIMIT ?',
    [userId, limit],
  );
  return rows.map(rowToCamel).reverse();
}

export async function getMorningWeightToday(userId) {
  const d = await db();
  const dayStart = Date.now() - (Date.now() % 86400000);
  const row = await d.getFirstAsync(
    'SELECT * FROM morning_weights WHERE user_id = ? AND logged_at >= ? AND logged_at < ?',
    [userId, dayStart, dayStart + 86400000],
  );
  return rowToCamel(row);
}

// ─── Pro: Weekly Check-Ins ────────────────────────────────────────────────────

export async function saveWeeklyCheckin(userId, data) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    'SELECT id FROM weekly_checkins WHERE user_id = ? AND week_start = ?',
    [userId, data.weekStart],
  );
  if (existing?.id) {
    await d.runAsync(
      `UPDATE weekly_checkins SET
        energy_score = ?, soreness_score = ?, stress_score = ?, sleep_hours = ?,
        cals_adherence = ?, steps_adherence = ?, cycle_override = ?, notes = ?,
        training_performance = ?, joint_pain = ?, updated_at = ?
       WHERE id = ?`,
      [
        data.energyScore ?? null, data.sorenessScore ?? null, data.stressScore ?? null,
        data.sleepHours ?? null, data.calsAdherence ?? null, data.stepsAdherence ?? null,
        data.cycleOverride ? 1 : 0, data.notes ?? null,
        data.trainingPerformance ?? null, data.jointPain ? 1 : 0, now, existing.id,
      ],
    );
    return existing.id;
  }
  const id = uid();
  await d.runAsync(
    `INSERT INTO weekly_checkins
      (id, user_id, week_start, energy_score, soreness_score, stress_score, sleep_hours,
       cals_adherence, steps_adherence, cycle_override, notes,
       training_performance, joint_pain, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, data.weekStart,
      data.energyScore ?? null, data.sorenessScore ?? null, data.stressScore ?? null,
      data.sleepHours ?? null, data.calsAdherence ?? null, data.stepsAdherence ?? null,
      data.cycleOverride ? 1 : 0, data.notes ?? null,
      data.trainingPerformance ?? null, data.jointPain ? 1 : 0, now, now,
    ],
  );
  return id;
}

export async function getLatestCheckin(userId, weekStart = null) {
  const d = await db();
  if (weekStart != null) {
    const row = await d.getFirstAsync(
      'SELECT * FROM weekly_checkins WHERE user_id = ? AND week_start = ?',
      [userId, weekStart],
    );
    return rowToCamel(row);
  }
  const row = await d.getFirstAsync(
    'SELECT * FROM weekly_checkins WHERE user_id = ? ORDER BY week_start DESC LIMIT 1',
    [userId],
  );
  return rowToCamel(row);
}

export async function getRecentCheckins(userId, count = 4) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM weekly_checkins WHERE user_id = ? ORDER BY week_start DESC LIMIT ?',
    [userId, count],
  );
  return rows.map(rowToCamel);
}

// ─── Pro: Weekly session stats ────────────────────────────────────────────────

export async function getWeeklySessionStats(userId, weekStart) {
  const d = await db();
  const weekEnd = weekStart + 7 * 86400000;
  const row = await d.getFirstAsync(
    `SELECT COUNT(*) AS completed FROM workouts
     WHERE user_id = ? AND is_completed = 1 AND started_at >= ? AND started_at < ?`,
    [userId, weekStart, weekEnd],
  );
  const prev4 = await d.getAllAsync(
    `SELECT COUNT(*) AS wk_count FROM workouts
     WHERE user_id = ? AND is_completed = 1
       AND started_at >= ? AND started_at < ?
     GROUP BY CAST((started_at - ?) / (7 * 86400000) AS INTEGER)`,
    [userId, weekStart - 28 * 86400000, weekStart, weekStart - 28 * 86400000],
  );
  const avgPrev = prev4.length
    ? prev4.reduce((s, r) => s + (r.wk_count ?? 0), 0) / prev4.length
    : 3;
  return {
    completed: row?.completed ?? 0,
    planned: Math.max(row?.completed ?? 0, Math.round(avgPrev) || 3),
  };
}

export async function getWeeklyPRCount(userId, weekStart) {
  const d = await db();
  const weekEnd = weekStart + 7 * 86400000;
  const row = await d.getFirstAsync(
    `SELECT COUNT(DISTINCT ws.exercise_id) AS pr_count
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     WHERE ws.user_id = ? AND w.is_completed = 1
       AND w.started_at >= ? AND w.started_at < ?
       AND ws.weight > (
         SELECT COALESCE(MAX(ws2.weight), 0)
         FROM workout_sets ws2
         JOIN workouts w2 ON ws2.workout_id = w2.id
         WHERE ws2.exercise_id = ws.exercise_id
           AND ws2.user_id = ws.user_id
           AND w2.is_completed = 1
           AND w2.started_at < ?
       )`,
    [userId, weekStart, weekEnd, weekStart],
  );
  return row?.pr_count ?? 0;
}

// ─── Pro: Coach Outputs ───────────────────────────────────────────────────────

export async function saveCoachOutput(userId, data) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    'SELECT id FROM coach_outputs WHERE user_id = ? AND week_start = ?',
    [userId, data.weekStart],
  );
  const json = JSON.stringify(data);
  if (existing?.id) {
    await d.runAsync(
      `UPDATE coach_outputs SET
        goal_phase = ?, volume_signal = ?, load_signal = ?, recovery_flag = ?,
        calorie_change = ?, steps_target = ?, why_this = ?, output_json = ?
       WHERE id = ?`,
      [
        data.goalPhase ?? null, data.volumeSignal ?? null, data.loadSignal ?? null,
        data.recoveryFlag ?? null,
        data.adjustments?.calories?.change ?? null,
        data.adjustments?.steps?.target ?? null,
        data.whyThisWeek ?? null, json, existing.id,
      ],
    );
    return existing.id;
  }
  const id = uid();
  await d.runAsync(
    `INSERT INTO coach_outputs
      (id, user_id, week_start, goal_phase, volume_signal, load_signal, recovery_flag,
       calorie_change, steps_target, why_this, output_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, data.weekStart,
      data.goalPhase ?? null, data.volumeSignal ?? null, data.loadSignal ?? null,
      data.recoveryFlag ?? null,
      data.adjustments?.calories?.change ?? null,
      data.adjustments?.steps?.target ?? null,
      data.whyThisWeek ?? null, json, now,
    ],
  );
  return id;
}

export async function getLatestCoachOutput(userId) {
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM coach_outputs WHERE user_id = ? ORDER BY week_start DESC LIMIT 1',
    [userId],
  );
  if (!row) return null;
  try { return JSON.parse(row.output_json); } catch { return rowToCamel(row); }
}

// ─── Cloud restore helpers (used by sync.js pullFromCloud) ────────────────────

export async function insertWorkoutFromCloud(userId, w) {
  const d = await db();
  const toMs = iso => iso ? new Date(iso).getTime() : null;
  await d.runAsync(
    `INSERT OR IGNORE INTO workouts
      (id, user_id, routine_id, mesocycle_id, started_at, ended_at, duration_minutes,
       notes, session_difficulty, overall_pump, soreness_24h_before, fatigue_level,
       is_completed, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
    [
      w.id, userId, w.routine_id ?? null, w.mesocycle_id ?? null,
      toMs(w.started_at), toMs(w.ended_at), w.duration_minutes ?? null,
      w.notes ?? null, w.session_difficulty ?? null, w.overall_pump ?? null,
      w.soreness_24h_before ?? null, w.fatigue_level ?? null,
      toMs(w.started_at) ?? Date.now(), Date.now(),
    ],
  );
}

// Re-stamps all local data from localUserId → supabaseUserId so the app
// reads it correctly after account creation during onboarding.
export async function migrateLocalUserId(localUserId, supabaseUserId) {
  if (!localUserId || !supabaseUserId || localUserId === supabaseUserId) return;
  const d = await db();
  const tables = [
    'workouts', 'workout_sets', 'routines', 'programmes',
    'nutrition_targets', 'body_metric_log', 'morning_weights',
    'personal_records', 'adaptation_events',
  ];
  for (const table of tables) {
    try {
      await d.runAsync(
        `UPDATE ${table} SET user_id = ? WHERE user_id = ?`,
        [supabaseUserId, localUserId],
      );
    } catch (_) {}
  }
}

export async function insertWorkoutSetFromCloud(userId, s) {
  const d = await db();
  await d.runAsync(
    `INSERT OR IGNORE INTO workout_sets
      (id, user_id, workout_id, exercise_id, set_number, set_type,
       target_reps_min, target_reps_max, actual_reps, weight, rir, rpe,
       failed, notes, post_set_pump, post_set_muscle_connection, joint_discomfort,
       is_amrap, amrap_reps, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      s.id, userId, s.workout_id, s.exercise_id,
      s.set_number ?? 1, s.set_type ?? 'straight',
      s.target_reps_min ?? null, s.target_reps_max ?? null,
      s.actual_reps ?? 0, s.weight ?? null, s.rir ?? null, s.rpe ?? null,
      s.failed ? 1 : 0, s.notes ?? null,
      s.post_set_pump ?? null, s.post_set_muscle_connection ?? null,
      s.joint_discomfort ?? null,
      s.is_amrap ? 1 : 0, s.amrap_reps ?? null,
      Date.now(), Date.now(),
    ],
  );
}
