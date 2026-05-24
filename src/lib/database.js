import * as SQLite from 'expo-sqlite';
import { generateInsights } from './insightsEngine';
import { calculate1RM } from './algorithms';
import { logError } from './errorLog';

let _db = null;
let _initPromise = null;

// Fire a debounced full cloud sync after a local write. Lazy-required
// to avoid the circular import (sync.js → database.js → sync.js).
// Every mutating write function below calls this AFTER its local
// SQLite mutation succeeds so rapid edits coalesce into one push
// within ~2 seconds.
function _scheduleSync() {
  try {
    // eslint-disable-next-line global-require
    require('./sync').scheduleSync();
  } catch (_) { /* sync module unavailable — tolerate */ }
}

function uid() {
  // UUID v4 — required so rows sync cleanly to Supabase, whose primary-key
  // columns are typed UUID. The previous compact format (timestamp + random
  // suffix) silently FK-failed on every Supabase upsert.
  // Math.random is fine here; ids are not security-sensitive.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
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
  _initPromise = _doInit().catch(e => {
    // Clear state so a retry attempt re-runs init instead of returning
    // a half-open handle. SQLite.openDatabaseAsync sets _db before
    // schema work completes; without this reset the next caller would
    // get a database where some tables were never created.
    _db = null;
    _initPromise = null;
    throw e;
  });
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
      is_sample INTEGER NOT NULL DEFAULT 0,
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
    'ALTER TABLE routine_exercises ADD COLUMN superset_group_id TEXT',
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
      applied INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_coach_outputs_user ON coach_outputs(user_id, week_start)`,
  ],
  // v7 — add training performance and joint pain to weekly check-ins
  [
    'ALTER TABLE weekly_checkins ADD COLUMN training_performance TEXT',
    'ALTER TABLE weekly_checkins ADD COLUMN joint_pain INTEGER DEFAULT 0',
  ],
  // v8 — wellbeing screening score on user body profile
  [
    'ALTER TABLE user_body_profile ADD COLUMN scoff_score INTEGER',
  ],
  // v9 — pre-workout intent captured before each session
  [
    'ALTER TABLE workouts ADD COLUMN pre_workout_intent TEXT',
  ],
  // v10 — muscle-specific soreness on weekly check-ins
  [
    'ALTER TABLE weekly_checkins ADD COLUMN sore_muscles TEXT',
  ],
  // v11 — exercise user notes: persistent per-user per-exercise notes for machine settings, cues, etc.
  [
    `CREATE TABLE IF NOT EXISTS exercise_user_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(user_id, exercise_id)
  )`,
    `CREATE INDEX IF NOT EXISTS idx_exercise_notes_user ON exercise_user_notes(user_id, exercise_id)`,
  ],
  // v12 — sleep quality field in weekly_checkins for post-session recovery tracking
  [
    'ALTER TABLE weekly_checkins ADD COLUMN sleep_quality INTEGER',
  ],
  // v13 — proper boolean flag to identify sample/library routines, replacing the fragile [SAMPLE] name prefix
  [
    'ALTER TABLE routines ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0',
  ],
  // v14 — between-session "next time" coaching notes
  [
    `CREATE TABLE IF NOT EXISTS workout_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      routine_id TEXT,
      exercise_id TEXT,
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_after_uses INTEGER NOT NULL DEFAULT 1,
      shown_count INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS idx_workout_notes_user ON workout_notes(user_id, routine_id)`,
  ],
  // v15 — exercise milestone goals: target weight + optional target date per exercise
  [
    `CREATE TABLE IF NOT EXISTS exercise_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      target_weight REAL NOT NULL,
      target_date INTEGER,
      created_at INTEGER NOT NULL,
      achieved_at INTEGER,
      UNIQUE(user_id, exercise_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_exercise_goals_user ON exercise_goals(user_id, exercise_id)`,
  ],

  // v16 — pending sync ops queue. Mutations that fail to ship to the
  // cloud (offline, flaky connection, server hiccup) are enqueued here
  // and retried on app foreground / next sign-in. Without this, a
  // dropped sync was silent data loss until the user's next sign-in
  // cycle triggered a full bulkUploadLocalData catch-up.
  [
    `CREATE TABLE IF NOT EXISTS pending_sync_ops (
      id          TEXT PRIMARY KEY,
      op_type     TEXT NOT NULL,        -- 'workout' | 'body_metric' | 'morning_weight' | 'check_in'
      entity_id   TEXT NOT NULL,        -- the row id we're trying to sync
      user_id     TEXT NOT NULL,        -- supabase user.id
      payload     TEXT,                 -- JSON-serialised payload, optional (sync code can re-read from local SQLite by entity_id)
      created_at  INTEGER NOT NULL,
      retries     INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL, -- ms epoch; queue drainer skips rows where now() < next_attempt_at
      last_error  TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pending_sync_user_ready
      ON pending_sync_ops(user_id, next_attempt_at)`,
  ],
  // v17 — columns that insertRoutineFromCloud + insertProgrammeFromCloud
  // had been INSERTing into for ages without ever being added to the
  // local schema. Every cross-device restore was failing every
  // routine and programme insert with "table routines has no column
  // named day_of_week" / "table programmes has no column named
  // source_programme_id". A user signing into a populated cloud
  // account came back to zero plans and zero routines because each
  // INSERT was rejected.
  [
    'ALTER TABLE routines ADD COLUMN day_of_week INTEGER',
    'ALTER TABLE programmes ADD COLUMN source_programme_id TEXT',
  ],
  // v18 — backfill deterministic canonical exercise IDs.
  //
  // Canonical exercises had random uid() IDs minted at seed time, so
  // every install produced a different ID for the same exercise. That
  // meant a routine_exercises row pushed from device A with
  // exercise_id = X resolved on device B's INNER JOIN only if device
  // B's seed had produced the same random X — which it never did.
  //
  // From this version forward the seed uses canonicalExerciseId(name)
  // (a name hash) instead of uid(). This migration brings existing
  // installs up to the new scheme by recomputing the ID for every
  // is_custom=0 row and cascading the UPDATE through every reference.
  //
  // Run order matters: update the referencing tables first so the FK
  // never points at a stale id, then update exercises itself.
  [
    async (d) => {
      // eslint-disable-next-line global-require
      const { canonicalExerciseId } = require('./seedExercises');
      const rows = await d.getAllAsync(
        'SELECT id, name FROM exercises WHERE is_custom = 0',
      );
      for (const row of rows) {
        if (!row?.name) continue;
        const newId = canonicalExerciseId(row.name);
        if (newId === row.id) continue;
        await d.runAsync(
          'UPDATE routine_exercises SET exercise_id = ? WHERE exercise_id = ?',
          [newId, row.id],
        );
        await d.runAsync(
          'UPDATE workout_sets SET exercise_id = ? WHERE exercise_id = ?',
          [newId, row.id],
        );
        await d.runAsync(
          'UPDATE exercise_user_notes SET exercise_id = ? WHERE exercise_id = ?',
          [newId, row.id],
        );
        await d.runAsync(
          'UPDATE exercise_goals SET exercise_id = ? WHERE exercise_id = ?',
          [newId, row.id],
        ).catch(() => { /* table may not exist yet on older installs */ });
        // Update the exercise row last so the FK references stay
        // valid throughout the transaction.
        await d.runAsync(
          'UPDATE exercises SET id = ? WHERE id = ?',
          [newId, row.id],
        );
      }
    },
  ],
  // v19 — universal sync columns + denormalised exercise_name.
  //
  // updated_at gives the sync layer a stable cursor for delta
  // queries ("give me everything modified since last sync"). Without
  // it, the previous bulk-upload / full-pull dance had to ship every
  // row on every sign-in, which got increasingly slow for power users
  // and silently dropped writes that happened between pull start and
  // local insert.
  //
  // deleted_at carries a soft-delete tombstone so a delete made on
  // device A propagates to device B as a deleted_at IS NOT NULL row
  // rather than getting resurrected by an in-flight push.
  //
  // exercise_name on routine_exercises and workout_sets denormalises
  // the exercise display name onto the row so a pull can recover
  // even when the cloud exercise_id no longer matches any local
  // exercise (the architectural bug that caused the 114-routines-
  // with-zero-exercises issue on the prior build).
  [
    'ALTER TABLE workouts ADD COLUMN updated_at_iso TEXT',
    'ALTER TABLE workouts ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE workout_sets ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE workout_sets ADD COLUMN exercise_name TEXT',
    'ALTER TABLE routines ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE programmes ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE routine_exercises ADD COLUMN updated_at INTEGER',
    'ALTER TABLE routine_exercises ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE routine_exercises ADD COLUMN exercise_name TEXT',
    'ALTER TABLE mesocycles ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE mesocycle_weeks ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE mesocycle_weeks ADD COLUMN updated_at INTEGER',
    'ALTER TABLE nutrition_targets ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE body_metric_log ADD COLUMN updated_at INTEGER',
    'ALTER TABLE body_metric_log ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE morning_weights ADD COLUMN updated_at INTEGER',
    'ALTER TABLE morning_weights ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE weekly_checkins ADD COLUMN updated_at INTEGER',
    'ALTER TABLE weekly_checkins ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE coach_outputs ADD COLUMN updated_at INTEGER',
    'ALTER TABLE coach_outputs ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE exercises ADD COLUMN updated_at_v2 INTEGER',
    'ALTER TABLE exercises ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE user_body_profile ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE user_insights ADD COLUMN updated_at INTEGER',
    'ALTER TABLE user_insights ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE exercise_user_notes ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE peak_week_plans ADD COLUMN deleted_at INTEGER',
    `CREATE TABLE IF NOT EXISTS workout_notes_v2 (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workout_id TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS planned_muscle_volume_sync (
      id TEXT PRIMARY KEY,
      mesocycle_week_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      muscle TEXT NOT NULL,
      planned_sets INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS adaptation_events_sync (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mesocycle_week_id TEXT,
      event_type TEXT NOT NULL,
      payload TEXT,
      recorded_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS sync_meta (
      table_name TEXT PRIMARY KEY,
      last_pull_at INTEGER,
      last_push_at INTEGER
    )`,
    // Backfill: populate exercise_name on every existing routine_exercise
    // and workout_set by joining against the local exercises table. This
    // is best-effort — rows whose exercise_id no longer resolves locally
    // (the broken-from-cloud rows) get NULL and will surface in the
    // self-healing UI on the next pull.
    `UPDATE routine_exercises SET exercise_name = (
      SELECT name FROM exercises WHERE exercises.id = routine_exercises.exercise_id
    ) WHERE exercise_name IS NULL`,
    `UPDATE workout_sets SET exercise_name = (
      SELECT name FROM exercises WHERE exercises.id = workout_sets.exercise_id
    ) WHERE exercise_name IS NULL`,
    // Index every per-table updated_at so delta pull can use an index
    // scan rather than a full-table scan on increasingly large
    // workout_sets / morning_weights tables.
    'CREATE INDEX IF NOT EXISTS idx_workout_sets_updated ON workout_sets(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_workouts_updated ON workouts(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_morning_weights_updated ON morning_weights(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_body_metric_log_updated ON body_metric_log(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_routine_exercises_updated ON routine_exercises(updated_at)',
  ],
  // v20 — indexes on the sync-mirror tables introduced in v19. The
  // bulk getters (getAllWorkoutNotesForUser etc.) all scan by
  // user_id; without the index those scans degrade to full-table
  // sweeps as the row count grows. Cheap to add now while the
  // tables are still small for most users.
  [
    'CREATE INDEX IF NOT EXISTS idx_workout_notes_v2_user ON workout_notes_v2(user_id) WHERE deleted_at IS NULL',
    'CREATE INDEX IF NOT EXISTS idx_planned_muscle_volume_sync_user ON planned_muscle_volume_sync(user_id) WHERE deleted_at IS NULL',
    'CREATE INDEX IF NOT EXISTS idx_adaptation_events_sync_user ON adaptation_events_sync(user_id) WHERE deleted_at IS NULL',
    'CREATE INDEX IF NOT EXISTS idx_workout_notes_v2_user_updated ON workout_notes_v2(user_id, updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_planned_muscle_volume_sync_user_updated ON planned_muscle_volume_sync(user_id, updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_adaptation_events_sync_user_updated ON adaptation_events_sync(user_id, updated_at)',
  ],

  // v21 — backfill mesocycles.end_date for rows that pre-date the fix
  // in activatePlanWithBlock. The cloud schema declares end_date NOT
  // NULL, so any pre-existing local block with a null end_date was
  // silently dropped by the push and never reached the user's other
  // devices.
  [
    async (d) => {
      const rows = await d.getAllAsync(
        'SELECT id, start_date, duration_weeks FROM mesocycles WHERE end_date IS NULL AND start_date IS NOT NULL',
      );
      for (const r of rows) {
        const weeks = r.duration_weeks || 6;
        const startMs = new Date(r.start_date).getTime();
        if (!Number.isFinite(startMs)) continue;
        const endDate = new Date(startMs + weeks * 7 * 24 * 60 * 60 * 1000)
          .toISOString().slice(0, 10);
        await d.runAsync(
          'UPDATE mesocycles SET end_date = ?, updated_at = ? WHERE id = ?',
          [endDate, Date.now(), r.id],
        );
      }
    },
  ],

  // v22 — re-issue mesocycle_weeks IDs that pre-date the UUID fix.
  // Old rows used a composite key `mw_<mesocycleId>_<weekIndex>` which
  // the cloud's UUID column rejected on every push, leaving every
  // user's weekly progression unable to sync. This migration rewrites
  // each bad ID to a fresh UUID and updates the three tables that
  // reference it.
  [
    async (d) => {
      const bad = await d.getAllAsync(
        "SELECT id FROM mesocycle_weeks WHERE id LIKE 'mw\\_%' ESCAPE '\\'",
      );
      for (const row of bad) {
        const oldId = row.id;
        const newId = uid();
        await d.withTransactionAsync(async () => {
          await d.runAsync('UPDATE planned_muscle_volume      SET mesocycle_week_id = ? WHERE mesocycle_week_id = ?', [newId, oldId]);
          await d.runAsync('UPDATE planned_muscle_volume_sync SET mesocycle_week_id = ? WHERE mesocycle_week_id = ?', [newId, oldId]);
          await d.runAsync('UPDATE adaptation_events          SET mesocycle_week_id = ? WHERE mesocycle_week_id = ?', [newId, oldId]);
          await d.runAsync('UPDATE adaptation_events_sync     SET mesocycle_week_id = ? WHERE mesocycle_week_id = ?', [newId, oldId]);
          await d.runAsync('UPDATE workouts                   SET mesocycle_week_id = ? WHERE mesocycle_week_id = ?', [newId, oldId]);
          await d.runAsync('UPDATE mesocycle_weeks            SET id = ?, updated_at = ? WHERE id = ?', [newId, Date.now(), oldId]);
        });
      }
    },
  ],

  // v23 — indexes that matter at scale. Every aggregate query
  // (analytics, history, weekly volume) filters by created_at; without
  // a btree index those queries scan the full workout_sets table.
  // Same for mesocycle_weeks.mesocycle_id which is the most common
  // join column in the plan + progress screens. SQLite ignores
  // CREATE INDEX IF NOT EXISTS gracefully so re-runs are cheap.
  [
    'CREATE INDEX IF NOT EXISTS idx_workout_sets_created_at ON workout_sets(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_workout_sets_user_created ON workout_sets(user_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_mesocycle_weeks_mesocycle ON mesocycle_weeks(mesocycle_id)',
    'CREATE INDEX IF NOT EXISTS idx_mesocycle_weeks_meso_index ON mesocycle_weeks(mesocycle_id, week_index)',
    'CREATE INDEX IF NOT EXISTS idx_planned_muscle_volume_week ON planned_muscle_volume(mesocycle_week_id)',
  ],
  // Food logging schema (Move #1, mirrors Supabase migrate_015_food_logging.sql).
  // SQLite types map: jsonb -> TEXT (JSON encoded), timestamptz -> INTEGER (ms since epoch),
  // numeric -> REAL, uuid -> TEXT. All user-owned data; sync registry handles push/pull.
  [
    `CREATE TABLE IF NOT EXISTS foods (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT,
      barcode_ean TEXT,
      name TEXT NOT NULL,
      brand TEXT,
      serving_g REAL NOT NULL,
      serving_label TEXT,
      kcal_100g REAL NOT NULL,
      protein_100g REAL NOT NULL,
      carbs_100g REAL NOT NULL,
      fat_100g REAL NOT NULL,
      fibre_100g REAL,
      sodium_100g REAL,
      sugar_100g REAL,
      verified INTEGER DEFAULT 0,
      fetched_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode_ean) WHERE barcode_ean IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_foods_name_lower ON foods(lower(name))',
    'CREATE UNIQUE INDEX IF NOT EXISTS uq_foods_source_source_id ON foods(source, source_id)',

    `CREATE TABLE IF NOT EXISTS custom_foods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      serving_g REAL NOT NULL,
      serving_label TEXT,
      kcal_100g REAL NOT NULL,
      protein_100g REAL NOT NULL,
      carbs_100g REAL NOT NULL,
      fat_100g REAL NOT NULL,
      fibre_100g REAL,
      sodium_100g REAL,
      sugar_100g REAL,
      photo_url TEXT,
      notes TEXT,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_custom_foods_user_active ON custom_foods(user_id) WHERE deleted_at IS NULL',
    'CREATE INDEX IF NOT EXISTS idx_custom_foods_user_name ON custom_foods(user_id, lower(name))',

    `CREATE TABLE IF NOT EXISTS food_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      meal_slot TEXT NOT NULL,
      food_ref TEXT NOT NULL,
      quantity_g REAL NOT NULL,
      kcal REAL NOT NULL,
      protein_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      fibre_g REAL,
      logged_at INTEGER NOT NULL,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_food_entries_user_date_slot ON food_entries(user_id, entry_date, meal_slot) WHERE deleted_at IS NULL',
    'CREATE INDEX IF NOT EXISTS idx_food_entries_user_recent ON food_entries(user_id, logged_at) WHERE deleted_at IS NULL',

    `CREATE TABLE IF NOT EXISTS daily_intake_rollups (
      user_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      kcal_total REAL NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      fibre_g REAL,
      entries_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, entry_date)
    )`,

    `CREATE TABLE IF NOT EXISTS saved_meals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_saved_meals_user_active ON saved_meals(user_id) WHERE deleted_at IS NULL',

    `CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      total_servings REAL NOT NULL,
      notes TEXT,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_recipes_user_active ON recipes(user_id) WHERE deleted_at IS NULL',

    `CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      food_ref TEXT NOT NULL,
      quantity_g REAL NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id)',

    `CREATE TABLE IF NOT EXISTS food_favourites (
      user_id TEXT NOT NULL,
      food_ref TEXT NOT NULL,
      last_used_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, food_ref)
    )`,

    `CREATE TABLE IF NOT EXISTS daily_water (
      user_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      ml INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, entry_date)
    )`,
  ],
  // Coach output "applied" flag: insertCoachOutputFromCloud (the puller)
  // writes the column, but the v6 CREATE TABLE for coach_outputs never
  // included it. On installs that pre-date the CREATE TABLE update, every
  // pull cycle logs "table coach_outputs has no column named applied".
  // Additive ALTER is no-op for installs that already have the column.
  [
    'ALTER TABLE coach_outputs ADD COLUMN applied INTEGER DEFAULT 0',
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
    for (const op of SCHEMA_MIGRATIONS[v]) {
      try {
        // Function migrations let us run JS (e.g. compute deterministic
        // IDs and UPDATE rows) inside the same versioned migration
        // pipeline as plain SQL strings. The function is passed the
        // database handle and may use any of its async methods.
        if (typeof op === 'function') {
          await op(d);
        } else {
          await d.execAsync(op);
        }
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

// Exported so peer modules (syncQueue.js) can grab the SQLite handle
// directly. Without this export, `import { db } from './database'` in
// syncQueue resolved to undefined and every `await db()` call there
// threw "undefined is not a function" on entry — the bug that made
// every drainSyncQueue invocation fail before processing any row.
export async function db() {
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
  return insertExerciseWithId(uid(), data);
}

// Variant that accepts a caller-supplied id. seedExercisesIfNeeded uses
// it to plant canonical exercises with deterministic (name-hashed)
// UUIDs so every install produces the same ID for the same canonical
// name — see canonicalExerciseId() in seedExercises.js for the
// rationale.
export async function insertExerciseWithId(id, data) {
  const d = await db();
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

export async function deleteExercise(id) {
  const d = await db();
  await d.runAsync('DELETE FROM exercises WHERE id = ? AND is_custom = 1', [id]);
  _scheduleSync();
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

export async function createWorkout(userId, routineId = null, { intent = null } = {}) {
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
    `INSERT INTO workouts (id, user_id, routine_id, mesocycle_id, mesocycle_week_id, started_at, is_completed, pre_workout_intent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [id, userId, routineId, mesocycleId, mesocycleWeekId, now, intent, now, now],
  );
  return { id, userId, routineId, mesocycleId, mesocycleWeekId, startedAt: now, isCompleted: 0, preWorkoutIntent: intent, createdAt: now, updatedAt: now };
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

// Hard-delete an incomplete workout and its sets. Used when the user
// discards a session mid-way. Incomplete workouts never sync to the
// cloud (bulkUploadLocalData + pullFromCloud both filter on
// is_completed=true), so a hard delete here is safe and avoids the
// SQLite bloat that comes from leaving orphaned in_progress rows
// around with all their sets attached.
export async function deleteIncompleteWorkout(workoutId) {
  if (!workoutId) return;
  const d = await db();
  await d.runAsync('DELETE FROM workout_sets WHERE workout_id = ?', [workoutId]);
  await d.runAsync('DELETE FROM workouts WHERE id = ? AND is_completed = 0', [workoutId]);
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

// Returns an array of `weeksBack` entries, ordered oldest → newest.
// Each entry: { weekLabel: 'W1'|...'W4', weekStart: ms, weekEnd: ms, volumeByMuscle: { chest: 8, ... } }
// Only working sets (set_type != 'warmup') are counted. Uses the exercise's primary_muscle field.
export async function getWeeklyVolumeByMuscle(userId, weeksBack = 4) {
  const d = await db();
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // Build week boundaries going back `weeksBack` weeks from now.
  // Index 0 = oldest week, index weeksBack-1 = most recent week.
  const weekBoundaries = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    weekBoundaries.push({
      weekStart: now - (i + 1) * WEEK_MS,
      weekEnd: now - i * WEEK_MS,
    });
  }

  // Fetch all completed working sets in the full window in one query.
  const windowStart = now - weeksBack * WEEK_MS;
  const rows = await d.getAllAsync(
    `SELECT ws.created_at, ws.exercise_id
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     WHERE ws.user_id = ? AND w.is_completed = 1
       AND ws.created_at >= ?
       AND (ws.set_type IS NULL OR ws.set_type != 'warmup')
     ORDER BY ws.created_at ASC`,
    [userId, windowStart],
  );

  // Build exercise_id → primary_muscle map from the exercises table.
  const exerciseRows = await d.getAllAsync(
    'SELECT id, primary_muscle FROM exercises',
  );
  const muscleByExercise = {};
  for (const ex of exerciseRows) {
    let m = (ex.primary_muscle || '').toLowerCase();
    if (m === 'shoulders') m = 'side_delts'; // legacy normalisation
    if (m) muscleByExercise[ex.id] = m;
  }

  // Bucket each set into the correct week and count by muscle.
  const result = weekBoundaries.map(({ weekStart, weekEnd }, idx) => ({
    weekLabel: `W${idx + 1}`,
    weekStart,
    weekEnd,
    volumeByMuscle: {},
  }));

  for (const row of rows) {
    const ts = row.created_at;
    const weekIdx = result.findIndex(w => ts >= w.weekStart && ts < w.weekEnd);
    if (weekIdx === -1) continue;
    const muscle = muscleByExercise[row.exercise_id];
    if (!muscle) continue;
    const vbm = result[weekIdx].volumeByMuscle;
    vbm[muscle] = (vbm[muscle] || 0) + 1;
  }

  return result;
}

/**
 * Returns the most recent session date for each muscle group trained by the user.
 * Used to show recovery status (days since last trained) on the volume heatmap.
 * Returns an object: { [muscle]: { daysAgo: number, lastDate: timestamp } }
 */
export async function getLastTrainedByMuscle(userId) {
  const d = await db();
  const rows = await d.getAllAsync(`
    SELECT e.primary_muscle AS muscle,
           MAX(w.started_at) AS last_session_ms
    FROM workout_sets s
    JOIN workouts w ON w.id = s.workout_id
    JOIN exercises e ON e.id = s.exercise_id
    WHERE w.user_id = ?
      AND w.is_completed = 1
      AND s.set_type != 'warmup'
      AND e.primary_muscle IS NOT NULL
    GROUP BY e.primary_muscle
  `, [userId]);

  const now = Date.now();
  const MS_PER_DAY = 86400000;
  const result = {};
  for (const row of rows) {
    const daysAgo = Math.floor((now - row.last_session_ms) / MS_PER_DAY);
    result[row.muscle] = { daysAgo, lastDate: row.last_session_ms };
  }
  return result;
}

/**
 * Returns acute (this week) and chronic (4-week average) training tonnage
 * for calculating the Acute:Chronic Workload Ratio.
 * Only counts hard sets from completed workouts (setType != 'warmup').
 */
export async function getAcuteChronicWorkload(userId) {
  const d = await db();
  const now = Date.now();
  const MS_DAY = 86400000;

  // Fetch hard sets from last 5 weeks
  const fiveWeeksAgo = now - 35 * MS_DAY;
  const rows = await d.getAllAsync(`
    SELECT s.weight, s.actual_reps AS reps, w.started_at
    FROM workout_sets s
    JOIN workouts w ON w.id = s.workout_id
    WHERE w.user_id = ?
      AND w.is_completed = 1
      AND s.set_type != 'warmup'
      AND s.weight > 0
      AND s.actual_reps > 0
      AND w.started_at >= ?
    ORDER BY w.started_at ASC
  `, [userId, fiveWeeksAgo]);

  // Bucket into weekly tonnage (week 0 = this week, week 1 = last week, etc.)
  const weeklyTonnage = [0, 0, 0, 0, 0]; // index 0 = most recent
  for (const row of rows) {
    const daysAgo = Math.floor((now - row.started_at) / MS_DAY);
    const weekIdx = Math.floor(daysAgo / 7);
    if (weekIdx < 5) {
      weeklyTonnage[weekIdx] += row.weight * row.reps;
    }
  }

  const acute = weeklyTonnage[0];
  // Chronic = average of weeks 1-4 (exclude current week)
  const pastWeeks = weeklyTonnage.slice(1, 5).filter(t => t > 0);
  if (pastWeeks.length < 2) return null; // not enough data

  const chronic = pastWeeks.reduce((s, t) => s + t, 0) / pastWeeks.length;
  const ratio = chronic > 0 ? acute / chronic : null;

  return {
    acute: Math.round(acute),
    chronic: Math.round(chronic),
    ratio: ratio ? Math.round(ratio * 100) / 100 : null,
    weeksOfData: pastWeeks.length,
  };
}

export async function getWorkoutSetsForWorkout(workoutId) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM workout_sets WHERE workout_id = ? ORDER BY set_number ASC',
    [workoutId],
  );
  return rows.map(rowToCamel);
}

/**
 * Return per-workout tonnage totals for the last N days, filtered by routine.
 * Used by the Workout Summary screen to compare the current session to the
 * recent moving average (and rank it within the window).
 *
 * Aggregates in SQL so we don't pay an N+1 trip per workout. Excludes
 * warm-up sets — they don't count toward "working tonnage" and including
 * them would inflate the average vs the headline tonnage shown on the
 * summary screen.
 */
export async function getRoutineWorkoutTonnages(userId, routineId, sinceMs, excludeWorkoutId = null) {
  if (!userId || !routineId) return [];
  const d = await db();
  const params = [userId, routineId, sinceMs];
  let sql = `
    SELECT
      w.id AS workout_id,
      w.started_at AS started_at,
      COALESCE(SUM(
        CASE
          WHEN ws.set_type = 'warmup' THEN 0
          ELSE COALESCE(ws.weight, 0) * COALESCE(ws.actual_reps, 0)
        END
      ), 0) AS tonnage
    FROM workouts w
    LEFT JOIN workout_sets ws ON ws.workout_id = w.id
    WHERE w.user_id = ?
      AND w.routine_id = ?
      AND w.started_at >= ?
      AND w.is_completed = 1
  `;
  if (excludeWorkoutId) {
    sql += ' AND w.id != ?';
    params.push(excludeWorkoutId);
  }
  sql += ' GROUP BY w.id ORDER BY w.started_at DESC';
  const rows = await d.getAllAsync(sql, params);
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
  // Look up the exercise name once and denormalise it onto the set row.
  // The sync layer ships this alongside exercise_id so a new device can
  // recover the row's identity even if the exercise_id doesn't resolve
  // locally (e.g. canonical exercises that pre-date deterministic IDs).
  let exerciseName = data.exerciseName ?? null;
  if (!exerciseName && data.exerciseId) {
    try {
      const exRow = await d.getFirstAsync(
        'SELECT name FROM exercises WHERE id = ?',
        [data.exerciseId],
      );
      exerciseName = exRow?.name ?? null;
    } catch (_) { /* tolerate */ }
  }
  await d.runAsync(
    `INSERT INTO workout_sets
      (id, user_id, workout_id, exercise_id, exercise_name, set_number, set_type,
       target_reps_min, target_reps_max, actual_reps, weight, rir, rpe,
       failed, notes, is_amrap, amrap_reps, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.userId,
      data.workoutId,
      data.exerciseId,
      exerciseName,
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

// Update the post-set stimulus rating on the most recently logged set for an exercise.
// pump: 1–5, muscleConnection: 1–5
export async function updateWorkoutSetPostRating(setId, pump, muscleConnection) {
  const d = await db();
  await d.runAsync(
    'UPDATE workout_sets SET post_set_pump = ?, post_set_muscle_connection = ? WHERE id = ?',
    [pump, muscleConnection, setId]
  );
}

// Returns the most recent post-set pump and connection scores grouped by primary muscle,
// using only the last logged set per exercise in a given workout.
export async function getExerciseStimulusRatings(workoutId) {
  const d = await db();
  const rows = await d.getAllAsync(`
    SELECT s.exercise_id, e.name AS exercise_name, e.primary_muscle,
           s.post_set_pump, s.post_set_muscle_connection
    FROM workout_sets s
    LEFT JOIN exercises e ON e.id = s.exercise_id
    WHERE s.workout_id = ?
      AND s.post_set_pump IS NOT NULL
    ORDER BY s.created_at DESC
  `, [workoutId]);

  // Dedupe: keep first occurrence per exercise (most recent set with a rating)
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    if (!seen.has(row.exercise_id)) {
      seen.add(row.exercise_id);
      result.push(rowToCamel(row));
    }
  }
  return result;
}

// ─── Routines ───────────────────────────────────────────────────────────────────────────────────

export async function getAllRoutines(userId) {
  const d = await db();
  // Filter out soft-deleted rows (is_active = 0). Other consumers
  // (getRoutinesForPlan, getWorkoutTemplates) already do this; getAllRoutines
  // used to return them, so deleted routines kept appearing in the list.
  const rows = await d.getAllAsync(
    'SELECT * FROM routines WHERE user_id = ? AND COALESCE(is_active, 1) = 1 ORDER BY updated_at DESC',
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function getRoutineById(id) {
  const d = await db();
  const row = await d.getFirstAsync('SELECT * FROM routines WHERE id = ?', [id]);
  return rowToCamel(row);
}

export async function createRoutine(userId, name, description = null, splitType = null, isLibrary = 0, sourceRoutineId = null, programmeId = null, isSample = false) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  const isSampleInt = isSample ? 1 : 0;
  await d.runAsync(
    `INSERT INTO routines (id, user_id, name, description, split_type, is_active, is_library, is_sample, source_routine_id, programme_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    [id, userId, name, description, splitType, isLibrary, isSampleInt, sourceRoutineId, programmeId, now, now],
  );
  _scheduleSync();
  return { id, userId, name, description, splitType, isActive: 1, isLibrary, isSample: isSampleInt, sourceRoutineId, programmeId, createdAt: now, updatedAt: now };
}

export async function softDeleteRoutine(id) {
  const d = await db();
  await d.runAsync(
    'UPDATE routines SET is_active = 0, updated_at = ? WHERE id = ?',
    [Date.now(), id],
  );
  _scheduleSync();
}

/**
 * Find routines where every routine_exercise row has an exercise_id
 * that doesn't resolve against the local exercises table. These are
 * the "orphaned" routines left over from a cloud restore that
 * pre-dates the denormalised exercise_name + deterministic canonical
 * IDs. They can't be opened in ActiveWorkout meaningfully — the
 * INNER JOIN returns zero rows. The user's only path forward is to
 * either re-link each exercise manually OR delete the routine.
 *
 * Returns an array of { id, name, exerciseCount, programmeId } so the
 * cleanup UI can show the user what's about to be removed before they
 * confirm. exerciseCount is the TOTAL count in routine_exercises; all
 * of those are unresolved (otherwise the routine isn't fully
 * orphaned and shouldn't appear in the cleanup list).
 *
 * A routine with zero routine_exercises is NOT orphaned — that's just
 * an empty draft the user can still add exercises to.
 */
export async function getOrphanedRoutines(userId) {
  const d = await db();
  // Pull every routine with its exercise count + count of unresolved
  // routine_exercises (those whose FK target doesn't exist in
  // exercises). A routine is orphaned when total > 0 AND all of
  // them are unresolved.
  const rows = await d.getAllAsync(
    `SELECT r.id, r.name, r.programme_id,
            COUNT(re.id) AS total_count,
            SUM(CASE WHEN ex.id IS NULL THEN 1 ELSE 0 END) AS unresolved_count
     FROM routines r
     LEFT JOIN routine_exercises re ON re.routine_id = r.id
     LEFT JOIN exercises ex ON ex.id = re.exercise_id
     WHERE r.user_id = ? AND (r.is_active = 1 OR r.is_active IS NULL)
     GROUP BY r.id, r.name, r.programme_id
     HAVING total_count > 0 AND unresolved_count = total_count`,
    [userId],
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    programmeId: r.programme_id,
    exerciseCount: r.total_count,
  }));
}

/**
 * Hard-delete routine_exercises whose routine_id no longer exists in
 * the routines table. These rows can accumulate when older code paths
 * removed routines without cascading children, and they break the
 * cloud push because Supabase's RLS check on routine_exercises
 * requires a matching routine row owned by the same user — every
 * sync without this cleanup logs "orphan routine_exercises skipped".
 * Idempotent, runs once at boot.
 */
export async function cleanupOrphanRoutineExercises() {
  try {
    const d = await db();
    const result = await d.runAsync(
      `DELETE FROM routine_exercises
       WHERE routine_id NOT IN (SELECT id FROM routines)`,
    );
    return result?.changes ?? 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Soft-delete every orphaned routine in a single transaction. Returns
 * the number deleted so the UI can confirm "Removed N routines".
 *
 * The deletion is soft (is_active = 0) so the sync layer ships the
 * deletion to the cloud rather than just dropping the row locally.
 * The cloud row's updated_at advances; other devices pick up the
 * deletion on next pull.
 */
export async function deleteOrphanedRoutines(userId) {
  const orphans = await getOrphanedRoutines(userId);
  if (!orphans.length) return 0;
  const d = await db();
  await d.execAsync('BEGIN');
  try {
    const now = Date.now();
    for (const r of orphans) {
      await d.runAsync(
        'UPDATE routines SET is_active = 0, deleted_at = ?, updated_at = ? WHERE id = ?',
        [now, now, r.id],
      );
    }
    await d.execAsync('COMMIT');
    _scheduleSync();
    return orphans.length;
  } catch (e) {
    try { await d.execAsync('ROLLBACK'); } catch (_) {}
    throw e;
  }
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
  _scheduleSync();
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
  // LEFT JOIN — a routine_exercise whose exercise_id doesn't resolve to
  // a local exercise (e.g. cloud-restored rows from before deterministic
  // canonical IDs) still surfaces. The fallback uses the denormalised
  // exercise_name stored on the routine_exercises row so the user sees
  // the name they originally logged rather than a blank slot.
  const rows = await d.getAllAsync(
    `SELECT re.*,
            COALESCE(e.name, re.exercise_name) AS resolved_name,
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
     LEFT JOIN exercises e ON e.id = re.exercise_id
     WHERE re.routine_id = ? AND re.deleted_at IS NULL
     ORDER BY re.order_in_routine ASC`,
    [routineId],
  );
  return rows.map(row => {
    const re = rowToCamel(row);
    const exercise = {
      id: row.exercise_id,
      name: row.resolved_name,
      // When the FK didn't resolve these are all null — coach insights
      // and volume calculations downstream guard on missing muscle.
      primaryMuscle: row.primary_muscle,
      secondaryMuscles: (() => { try { return JSON.parse(row.secondary_muscles || '[]'); } catch { return []; } })(),
      equipment: row.equipment,
      movementPattern: row.movement_pattern,
      compoundIsolation: row.compound_isolation,
      defaultRepMin: row.default_rep_min,
      defaultRepMax: row.default_rep_max,
      fatigueCost: row.fatigue_cost,
      stimulusToFatigueRatio: row.stimulus_to_fatigue_ratio,
      // Flag for the UI: this row needs to be repaired by the user
      // because the exercise lookup failed. Active screens can render
      // an inline "Re-link exercise" affordance here.
      unresolved: !row.primary_muscle && !!row.resolved_name,
    };
    return { routineExercise: re, exercise };
  });
}

export async function addExerciseToRoutine(routineId, exerciseId, order, repsMin = 6, repsMax = 12, notes = null, sets = 3, startingWeight = null, restSeconds = null, supersetGroupId = null) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  // Denormalise the exercise name onto the routine_exercise row so the
  // sync layer can ship it alongside exercise_id. A new device pulling
  // this row recovers the lift even when the FK can't resolve.
  let exerciseName = null;
  try {
    const exRow = await d.getFirstAsync('SELECT name FROM exercises WHERE id = ?', [exerciseId]);
    exerciseName = exRow?.name ?? null;
  } catch (_) { /* tolerate */ }
  await d.runAsync(
    `INSERT INTO routine_exercises
      (id, routine_id, exercise_id, exercise_name, order_in_routine, recommended_sets,
       recommended_reps_min, recommended_reps_max, notes, starting_weight, rest_seconds, superset_group_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, routineId, exerciseId, exerciseName, order, sets, repsMin, repsMax, notes, startingWeight, restSeconds, supersetGroupId, now, now],
  );
  _scheduleSync();
  return { id, routineId, exerciseId, orderInRoutine: order, supersetGroupId };
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
  _scheduleSync();
}

/**
 * Plan-level exercise swap: replaces the exercise referenced by a routine_exercises row,
 * leaving set/rep/rest/starting-weight targets unchanged.
 */
export async function updateRoutineExerciseExercise(routineExerciseId, newExerciseId) {
  const d = await db();
  const now = Date.now();
  // Look up the canonical name for the new exercise and store it on
  // the row alongside the FK update. Keeps the denormalised
  // exercise_name in sync with the FK so future syncs ship the
  // correct name and other devices' LEFT JOIN fallback resolves
  // correctly.
  let newName = null;
  try {
    const exRow = await d.getFirstAsync('SELECT name FROM exercises WHERE id = ?', [newExerciseId]);
    newName = exRow?.name ?? null;
  } catch (_) { /* tolerate */ }
  await d.runAsync(
    'UPDATE routine_exercises SET exercise_id = ?, exercise_name = ?, updated_at = ? WHERE id = ?',
    [newExerciseId, newName, now, routineExerciseId],
  );
  _scheduleSync();
}

export async function getAllRoutineExerciseCounts() {
  const d = await db();
  const rows = await d.getAllAsync('SELECT routine_id, COUNT(*) as cnt FROM routine_exercises GROUP BY routine_id');
  return Object.fromEntries(rows.map(r => [r.routine_id, r.cnt]));
}

export async function updateRoutineName(id, name) {
  const d = await db();
  await d.runAsync('UPDATE routines SET name = ?, updated_at = ? WHERE id = ?', [name, Date.now(), id]);
  _scheduleSync();
}

export async function duplicateRoutine(routineId, userId, newName) {
  const d = await db();
  const original = await getRoutineById(routineId);
  if (!original) throw new Error('Routine not found');
  const newRoutine = await createRoutine(userId, newName, original.description, original.splitType);
  const exercises = await getRoutineExercisesWithDetails(routineId);
  // Atomic — was N+1 individual inserts; an interruption used to leave a
  // routine row pointing at no exercises (or partial), which the UI
  // couldn't recover and the user couldn't see.
  await d.withTransactionAsync(async () => {
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
        re.supersetGroupId,
      );
    }
  });
  return newRoutine;
}

export async function removeExerciseFromRoutine(id) {
  const d = await db();
  await d.runAsync('DELETE FROM routine_exercises WHERE id = ?', [id]);
}

export async function updateRoutineExerciseOrder(id, newOrderIndex) {
  const d = await db();
  await d.runAsync(
    'UPDATE routine_exercises SET order_in_routine = ?, updated_at = ? WHERE id = ?',
    [newOrderIndex, Date.now(), id],
  );
  _scheduleSync();
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
  _scheduleSync();
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
  // end_date is required by the cloud schema (NOT NULL). Without it the
  // push silently drops the row and a fresh-install sign-in lands with
  // an active plan but no training block.
  const endDate = new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  // 6 weeks: 5 accumulation (RIR 3→2→1→0→0) + 1 deload (RIR 4)
  await d.runAsync(
    `INSERT INTO mesocycles
      (id, user_id, name, start_date, end_date, duration_weeks, planned_weeks, focus,
       block_type, rir_ladder, is_active, auto_regulation_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 6, 6, ?, ?, ?, 1, 1, ?, ?)`,
    [id, userId, planName, startDate, endDate, 'hypertrophy', 'offseason_hypertrophy', '[3,2,1,0,0,4]', now, now],
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

export async function unarchivePlan(planId) {
  const d = await db();
  await d.runAsync(
    'UPDATE programmes SET is_archived = 0, updated_at = ? WHERE id = ?',
    [Date.now(), planId],
  );
}

export async function getArchivedPlansForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM programmes
     WHERE user_id = ? AND (is_library = 0 OR is_library IS NULL) AND is_archived = 1
     ORDER BY updated_at DESC`,
    [userId],
  );
  return rows.map(rowToCamel);
}

// Pro auto-gen contract: a single managed plan. When a fresh plan is
// auto-generated and activated, every other non-archived non-library plan
// for this user gets archived so the "My plans" list shows just the
// current plan. Users can restore from the Archived section if needed.
export async function archiveOtherUserPlans(userId, keepPlanId) {
  const d = await db();
  await d.runAsync(
    `UPDATE programmes
     SET is_active = 0, is_archived = 1, updated_at = ?
     WHERE user_id = ?
       AND id != ?
       AND (is_library = 0 OR is_library IS NULL)
       AND (is_archived = 0 OR is_archived IS NULL)`,
    [Date.now(), userId, keepPlanId],
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
    // addExerciseToRoutine already calls _scheduleSync internally;
    // the 2-second debounce in sync.scheduleSync coalesces every
    // call from this loop into a single bulk push.
    await addExerciseToRoutine(id, ex.exerciseId, i, ex.repsMin || 8, ex.repsMax || 12, null, ex.recommendedSets || 3);
  }
  _scheduleSync();
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
  _scheduleSync();
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

  // Wrap in a single transaction so a crash mid-loop doesn't leave a meso
  // with a partial week list (and so the writes commit atomically — much
  // faster than N round trips even on success).
  await d.withTransactionAsync(async () => {
    for (let i = 0; i < plannedWeeks; i++) {
      const weekIndex = i + 1;
      const isDeload = weekIndex === plannedWeeks ? 1 : 0;
      const rirTarget = rirLadder[i] ?? (isDeload ? 4 : Math.max(0, 3 - i));
      // Use a proper UUID v4. The previous composite id format
      // `mw_${mesocycleId}_${weekIndex}` looked sensible locally but the
      // cloud's mesocycle_weeks.id column is TYPE UUID and rejected
      // every push with "invalid input syntax for type uuid", which
      // meant mesocycle weeks never synced. Now uses uid() like every
      // other table; the (mesocycle_id, week_index) pair is the logical
      // key inside the row.
      const id = uid();

      await d.runAsync(
        `INSERT OR IGNORE INTO mesocycle_weeks (id, mesocycle_id, week_index, is_deload, rir_target, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, mesocycleId, weekIndex, isDeload, rirTarget, now],
      );

      weeks.push({ id, mesocycleId, weekIndex, isDeload, rirTarget });
    }
  });

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

// Seed planned_muscle_volume for all weeks of a mesocycle with a MEV→MAV ramp.
// Called once when a mesocycle is created (or can be called again to re-seed).
// Wrapped in a transaction so the ~70 INSERTs commit atomically (was a
// multi-second blocking write on slow Android devices; an interrupted call
// used to leave a half-seeded mesocycle that the UI couldn't recover).
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
    const now = Date.now();

    await d.withTransactionAsync(async () => {
      for (const [muscle, landmarks] of Object.entries(volumeLandmarks)) {
        const { mev, mav, mrv } = landmarks;
        for (let i = 0; i < accWeeks.length; i++) {
          const week = accWeeks[i];
          const progress = totalAcc <= 1 ? 1 : i / (totalAcc - 1);
          const planned = Math.round(mev + (mav - mev) * progress);
          const id = `pmv_${week.id}_${muscle}`;
          await d.runAsync(
            `INSERT OR IGNORE INTO planned_muscle_volume
               (id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'template', ?, ?)`,
            [id, week.id, muscle, planned, mev, mav, mrv, now, now],
          );
        }
        if (deloadWeek) {
          const id = `pmv_${deloadWeek.id}_${muscle}`;
          await d.runAsync(
            `INSERT OR IGNORE INTO planned_muscle_volume
               (id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'template', ?, ?)`,
            [id, deloadWeek.id, muscle, mev, mev, mav, mrv, now, now],
          );
        }
      }
    });
  } catch (e) {
    logError('database.generateInitialPlannedVolume', e, { mesocycleId });
  }
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
    _scheduleSync();
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
    _scheduleSync();
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
  _scheduleSync();
  return { id, ...data, createdAt: now, updatedAt: now };
}

// ─── Nutrition Targets ────────────────────────────────────

export async function saveNutritionTargets(userId, targets) {
  const d = await db();
  const now = Date.now();
  // Push to cloud after the local write completes so a fresh device
  // sign-in restores the same target row. Fire-and-forget; if the
  // user isn't signed in this is a no-op.
  const pushToCloud = () => {
    try {
      // eslint-disable-next-line global-require
      const { syncNutritionTargets } = require('./sync');
      // eslint-disable-next-line global-require
      const useAppStore = require('../store/useAppStore').default;
      const sessionUserId = useAppStore.getState().session?.user?.id;
      if (sessionUserId) {
        syncNutritionTargets(sessionUserId, userId).catch(() => {});
      }
    } catch (_) { /* offline / module load fail: best-effort only */ }
  };
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
    pushToCloud();
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
  pushToCloud();
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
  _scheduleSync();
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
  const [bodyRow, morningRow, profileRow] = await Promise.all([
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
    // Fall back to the body weight the user entered during onboarding
    // (saved to user_body_profile). Without this, a user who's done
    // onboarding but hasn't logged a separate weigh-in shows up as
    // "no body weight" everywhere — Relative Strength, share cards etc.
    d.getFirstAsync(
      `SELECT weight_kg FROM user_body_profile
       WHERE user_id = ? AND weight_kg IS NOT NULL LIMIT 1`,
      [userId],
    ).catch(() => null),
  ]);
  const bodyTs   = bodyRow?.logged_at ?? 0;
  const morningTs = morningRow?.logged_at ?? 0;
  const winner = bodyTs >= morningTs ? bodyRow : morningRow;
  if (winner && winner.weight_kg != null) {
    return { weightKg: winner.weight_kg, loggedAt: winner.logged_at };
  }
  // No weigh-in logged — use the onboarding bodyweight as the baseline so
  // features that need a number still work. Marked with loggedAt=0 so
  // callers can tell it's a stale fallback if they care.
  if (profileRow?.weight_kg != null) {
    return { weightKg: profileRow.weight_kg, loggedAt: 0 };
  }
  return null;
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
        training_age_years=?, primary_goal=?, gdpr_consented=?,
        scoff_score=?, updated_at=?
       WHERE user_id=?`,
      [
        profile.sex ?? null, profile.dateOfBirth ?? null, profile.heightCm ?? null,
        profile.experienceLevel ?? null, profile.trainingAgeYears ?? null,
        profile.primaryGoal ?? null, profile.gdprConsented ? 1 : 0,
        profile.scoffScore ?? null, now, userId,
      ],
    );
    _scheduleSync();
    return existing.id;
  }
  const id = uid();
  await d.runAsync(
    `INSERT INTO user_body_profile
      (id, user_id, sex, date_of_birth, height_cm, experience_level,
       training_age_years, primary_goal, gdpr_consented, scoff_score,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, profile.sex ?? null, profile.dateOfBirth ?? null, profile.heightCm ?? null,
      profile.experienceLevel ?? null, profile.trainingAgeYears ?? null,
      profile.primaryGoal ?? null, profile.gdprConsented ? 1 : 0,
      profile.scoffScore ?? null, now, now,
    ],
  );
  _scheduleSync();
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
  // Atomic — was two separate runAsync calls; an interruption between
  // them would orphan workout rows whose sets had already been deleted.
  await d.withTransactionAsync(async () => {
    await d.runAsync('DELETE FROM workout_sets WHERE user_id = ?', [userId]);
    await d.runAsync('DELETE FROM workouts WHERE user_id = ?', [userId]);
  });
}

// ─── Full local wipe (sign out + sign in as different user, or delete account) ─
//
// Removes every row owned by `userId` across every table that has a user_id
// column. Used when:
//   - A user deletes their account (combined with the cloud delete_user_data RPC)
//   - A different user signs in on the same device (to prevent cross-user data
//     visibility on a shared phone)
//
// Custom exercises owned by the user are also removed. Canonical seed
// exercises (user_id IS NULL) are preserved because they're shared data.
// Wrapped in a single transaction so a kill mid-wipe doesn't leave a
// half-wiped DB the user can't recover from.
export async function wipeAllUserData(userId) {
  if (!userId) return;
  const d = await db();

  // Tables that have a user_id column on them directly — straight DELETE.
  const directTables = [
    'workout_sets', 'workouts',
    'routines', 'programmes',
    'mesocycles',
    'morning_weights', 'weekly_checkins', 'coach_outputs',
    'nutrition_targets', 'peak_week_plans',
    'body_metric_log', 'user_insights', 'user_body_profile',
    'exercise_user_notes', 'exercise_goals', 'workout_notes',
    'pending_sync_ops', // queue table from v16 — wipe so deleted user
                         // doesn't have orphan ops still trying to ship
    // Sync-mirror tables added by migration v19. Must be wiped on
    // account deletion otherwise the next account that lands on
    // this device inherits orphan rows tagged with the deleted
    // user's id.
    'workout_notes_v2', 'planned_muscle_volume_sync', 'adaptation_events_sync',
  ];

  // Tables that DON'T have user_id and must be wiped through a parent FK.
  // routine_exercises   → keys off routine_id     → routines.user_id
  // mesocycle_weeks     → keys off mesocycle_id   → mesocycles.user_id
  // planned_muscle_volume → keys off mesocycle_week_id → mesocycle_weeks → mesocycles.user_id
  // adaptation_events   → keys off mesocycle_week_id → same chain
  //
  // Order matters: deepest child first so each step's FK target still
  // exists when we delete it.
  await d.withTransactionAsync(async () => {
    // 1. adaptation_events (deepest child)
    try {
      await d.runAsync(
        `DELETE FROM adaptation_events WHERE mesocycle_week_id IN (
          SELECT mw.id FROM mesocycle_weeks mw
          JOIN mesocycles m ON m.id = mw.mesocycle_id
          WHERE m.user_id = ?
        )`,
        [userId],
      );
    } catch (e) {
      logError('database.wipeAllUserData.adaptation_events', e, { userId });
    }

    // 2. planned_muscle_volume (via mesocycle_week → mesocycle.user_id)
    try {
      await d.runAsync(
        `DELETE FROM planned_muscle_volume WHERE mesocycle_week_id IN (
          SELECT mw.id FROM mesocycle_weeks mw
          JOIN mesocycles m ON m.id = mw.mesocycle_id
          WHERE m.user_id = ?
        )`,
        [userId],
      );
    } catch (e) {
      logError('database.wipeAllUserData.planned_muscle_volume', e, { userId });
    }

    // 3. mesocycle_weeks (via mesocycle.user_id)
    try {
      await d.runAsync(
        `DELETE FROM mesocycle_weeks WHERE mesocycle_id IN (
          SELECT id FROM mesocycles WHERE user_id = ?
        )`,
        [userId],
      );
    } catch (e) {
      logError('database.wipeAllUserData.mesocycle_weeks', e, { userId });
    }

    // 4. routine_exercises (via routine.user_id)
    try {
      await d.runAsync(
        `DELETE FROM routine_exercises WHERE routine_id IN (
          SELECT id FROM routines WHERE user_id = ?
        )`,
        [userId],
      );
    } catch (e) {
      logError('database.wipeAllUserData.routine_exercises', e, { userId });
    }

    // 5. Everything else (direct user_id column)
    for (const table of directTables) {
      try {
        await d.runAsync(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
      } catch (e) {
        // Continue with other tables. A missing table on an older schema
        // shouldn't abort the whole wipe.
        logError(`database.wipeAllUserData.${table}`, e, { userId });
      }
    }

    // 6. Custom exercises. Canonical seed exercises are shared library data
    // and aren't keyed per user, so leave them. is_custom = 1 means
    // user-added — wipe those.
    try {
      await d.runAsync('DELETE FROM exercises WHERE is_custom = 1');
    } catch (e) {
      logError('database.wipeAllUserData.exercises', e, { userId });
    }
  });
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
  // Mesocycle child tables — restoring without these leaves orphan week-rows
  // pointing at deleted mesocycle ids and planned-volume drift.
  'mesocycle_weeks',
  'planned_muscle_volume',
  'adaptation_events',
  'nutrition_targets',
  'peak_week_plans',
  'body_metric_log',
  'user_insights',
  'user_body_profile',
  // Coaching tables — added so Pro users don't lose their check-in / coach
  // output / morning-weight history on restore.
  'morning_weights',
  'weekly_checkins',
  'coach_outputs',
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
  // Local-time midnight, not UTC midnight. The previous `loggedAt %
  // 86400000` form bucketed by UTC days, which meant a user in the UK
  // logging at 00:30 BST got the same bucket as one logging at 22:30
  // the previous day, and a user in PT logging at 23:30 got bucketed
  // with the next UTC day's entry.
  const startLocalDay = (ms) => {
    const d2 = new Date(ms);
    return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
  };
  const dayStart = startLocalDay(loggedAt);
  const dayEnd = dayStart + 86400000;
  const existing = await d.getFirstAsync(
    'SELECT id FROM morning_weights WHERE user_id = ? AND logged_at >= ? AND logged_at < ?',
    [userId, dayStart, dayEnd],
  );
  let savedId = id;
  if (existing?.id) {
    await d.runAsync(
      'UPDATE morning_weights SET weight_kg = ?, notes = ?, updated_at = ? WHERE id = ?',
      [weightKg, notes, now, existing.id],
    );
    savedId = existing.id;
  } else {
    await d.runAsync(
      'INSERT INTO morning_weights (id, user_id, logged_at, weight_kg, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, loggedAt, weightKg, notes, now, now],
    );
  }
  // Fire-and-forget cloud push so a sign-out between writes doesn't
  // strand the entry locally. Synthesises the row payload from the
  // arguments since the SELECT round-trip isn't worth it for a
  // single weight value.
  try {
    // eslint-disable-next-line global-require
    const { syncMorningWeight } = require('./sync');
    syncMorningWeight(userId, { id: savedId, weightKg, loggedAt, notes }).catch(() => {});
  } catch (_) { /* sync module unavailable — bulk upload will catch up later */ }
  return savedId;
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
  // Local-time midnight. See note in logMorningWeight above.
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
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
  let savedId;
  if (existing?.id) {
    await d.runAsync(
      `UPDATE weekly_checkins SET
        energy_score = ?, soreness_score = ?, stress_score = ?, sleep_hours = ?,
        cals_adherence = ?, steps_adherence = ?, cycle_override = ?, notes = ?,
        training_performance = ?, joint_pain = ?, sore_muscles = ?, sleep_quality = ?, updated_at = ?
       WHERE id = ?`,
      [
        data.energyScore ?? null, data.sorenessScore ?? null, data.stressScore ?? null,
        data.sleepHours ?? null, data.calsAdherence ?? null, data.stepsAdherence ?? null,
        data.cycleOverride ? 1 : 0, data.notes ?? null,
        data.trainingPerformance ?? null, data.jointPain ? 1 : 0,
        data.soreMuscles ?? null, data.sleepQuality ?? null, now, existing.id,
      ],
    );
    savedId = existing.id;
  } else {
    savedId = uid();
    await d.runAsync(
      `INSERT INTO weekly_checkins
        (id, user_id, week_start, energy_score, soreness_score, stress_score, sleep_hours,
         cals_adherence, steps_adherence, cycle_override, notes,
         training_performance, joint_pain, sore_muscles, sleep_quality, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        savedId, userId, data.weekStart,
        data.energyScore ?? null, data.sorenessScore ?? null, data.stressScore ?? null,
        data.sleepHours ?? null, data.calsAdherence ?? null, data.stepsAdherence ?? null,
        data.cycleOverride ? 1 : 0, data.notes ?? null,
        data.trainingPerformance ?? null, data.jointPain ? 1 : 0,
        data.soreMuscles ?? null, data.sleepQuality ?? null, now, now,
      ],
    );
  }
  // Fire-and-forget cloud push — fires from BOTH insert and update
  // paths so an edit-then-sign-out doesn't strand the change.
  try {
    // eslint-disable-next-line global-require
    const { syncWeeklyCheckin } = require('./sync');
    syncWeeklyCheckin(userId, { id: savedId, ...data }).catch(() => {});
  } catch (_) { /* sync module unavailable — bulk upload will catch up later */ }
  return savedId;
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

export async function getYearOfLiftsData(userId, yearMs = null) {
  const d = await db();
  const now = Date.now();
  const yearStart = yearMs ?? (now - 365 * 86400000);

  const workouts = await d.getAllAsync(
    `SELECT w.id, w.started_at, w.duration_minutes, w.set_count
     FROM workouts w
     WHERE w.user_id = ? AND w.is_completed = 1 AND w.started_at >= ?
     ORDER BY w.started_at ASC`,
    [userId, yearStart],
  );

  const sets = await d.getAllAsync(
    `SELECT ws.weight, ws.actual_reps, ws.exercise_id, ex.name AS exercise_name,
            ex.primary_muscle AS muscle
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     LEFT JOIN exercises ex ON ex.id = ws.exercise_id
     WHERE ws.user_id = ? AND w.is_completed = 1 AND w.started_at >= ?
       AND ws.set_type != 'warmup' AND ws.actual_reps > 0 AND ws.weight > 0`,
    [userId, yearStart],
  );

  const totalSessions = workouts.length;
  const totalSets = sets.length;
  const tonnage = Math.round(sets.reduce((t, s) => t + s.weight * s.actual_reps, 0));
  const avgSessionsPerWeek = totalSessions > 0 ? Math.round((totalSessions / 52) * 10) / 10 : 0;

  // Top 3 exercises by set count
  const exerciseCounts = {};
  for (const s of sets) {
    const key = s.exercise_name ?? 'Unknown';
    exerciseCounts[key] = (exerciseCounts[key] ?? 0) + 1;
  }
  const topExercises = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, sets: count }));

  // Most active month
  const monthCounts = {};
  for (const w of workouts) {
    const m = new Date(w.started_at).getMonth();
    monthCounts[m] = (monthCounts[m] ?? 0) + 1;
  }
  const topMonthEntry = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const topMonth = topMonthEntry ? MONTH_NAMES[parseInt(topMonthEntry[0])] : null;

  // 12-month session breakdown (index 0 = Jan)
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    sessions: monthCounts[i] ?? 0,
  }));

  // Unique exercise count
  const uniqueExercises = Object.keys(exerciseCounts).length;

  // Top PRs during the year — compute best estimated 1RM per exercise
  // from logged sets (the historical personal_records table was never
  // created locally; previous SQL silently caught and returned []).
  const bestByExercise = new Map();
  for (const s of sets) {
    if (!s.exercise_name) continue;
    const e1rm = calculate1RM(s.weight || 0, s.actual_reps || 0);
    if (!e1rm) continue;
    const prev = bestByExercise.get(s.exercise_name);
    if (!prev || e1rm > prev.value) {
      bestByExercise.set(s.exercise_name, {
        record_type: '1rm_estimate',
        value: parseFloat(e1rm.toFixed(1)),
        reps: s.actual_reps,
        exercise_name: s.exercise_name,
      });
    }
  }
  const yearPRs = Array.from(bestByExercise.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    totalSessions,
    totalSets,
    tonnage,
    avgSessionsPerWeek,
    uniqueExercises,
    topExercises,
    topMonth,
    monthlyBreakdown,
    topPRs: yearPRs.map(rowToCamel),
    yearStart,
    yearEnd: now,
  };
}

export async function getBlockReflectionData(userId, mesocycleId) {
  const d = await db();
  const meso = await d.getFirstAsync('SELECT * FROM mesocycles WHERE id = ?', [mesocycleId]);
  if (!meso) return null;
  const workouts = await d.getAllAsync(
    `SELECT w.id, w.started_at, w.duration_minutes, w.set_count, w.total_volume
     FROM workouts w
     WHERE w.user_id = ? AND w.mesocycle_id = ? AND w.is_completed = 1
     ORDER BY w.started_at ASC`,
    [userId, mesocycleId],
  );
  const sets = await d.getAllAsync(
    `SELECT ws.weight, ws.actual_reps, ws.set_type, ws.exercise_id, ex.name AS exercise_name
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     LEFT JOIN exercises ex ON ex.id = ws.exercise_id
     WHERE ws.user_id = ? AND w.mesocycle_id = ? AND w.is_completed = 1
       AND ws.set_type != 'warmup' AND ws.actual_reps > 0 AND ws.weight > 0`,
    [userId, mesocycleId],
  );
  const totalSessions = workouts.length;
  const totalSets = sets.length;
  const tonnage = sets.reduce((t, s) => t + (s.weight ?? 0) * (s.actual_reps ?? 0), 0);

  // First vs last week tonnage delta.
  // start_date / end_date are TEXT YYYY-MM-DD; convert to ms before arithmetic
  // (previously this was string-concat producing a non-numeric cutoff and
  // mis-bucketing every set lexicographically).
  const startMs = meso.start_date ? new Date(meso.start_date).getTime() : 0;
  const endMs = meso.end_date ? new Date(meso.end_date).getTime() : Date.now();
  const firstWeekCutoff = startMs + 7 * 86400000;
  const firstWeekSets = sets.filter(s => {
    const w = workouts.find(w2 => w2.id === s.workout_id);
    return w && w.started_at < firstWeekCutoff;
  });
  const lastWeekCutoff = endMs - 7 * 86400000;
  const lastWeekSets = sets.filter(s => {
    const w = workouts.find(w2 => w2.id === s.workout_id);
    return w && w.started_at >= lastWeekCutoff;
  });
  const firstTonnage = firstWeekSets.reduce((t, s) => t + s.weight * s.actual_reps, 0);
  const lastTonnage = lastWeekSets.reduce((t, s) => t + s.weight * s.actual_reps, 0);
  const tonnageDelta = firstTonnage > 0 ? Math.round(((lastTonnage - firstTonnage) / firstTonnage) * 100) : null;

  // Most-trained muscle (by set count)
  const muscleCounts = {};
  for (const s of sets) {
    const key = s.exercise_name ?? 'Unknown';
    muscleCounts[key] = (muscleCounts[key] ?? 0) + 1;
  }
  const topExercise = Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Average session duration
  const avgDuration = workouts.length > 0
    ? Math.round(workouts.reduce((s, w) => s + (w.duration_minutes ?? 0), 0) / workouts.length)
    : 0;

  // Best session by total volume
  const bestSession = workouts.reduce((best, w) => {
    const v = w.total_volume ?? 0;
    return v > (best?.volume ?? 0) ? { startedAt: w.started_at, volume: v, duration: w.duration_minutes } : best;
  }, null);

  // PRs during this block — compute best estimated 1RM per exercise from the
  // block's logged sets (no local personal_records table — see comment above).
  const blockBestByExercise = new Map();
  for (const s of sets) {
    if (!s.exercise_name) continue;
    const e1rm = calculate1RM(s.weight || 0, s.actual_reps || 0);
    if (!e1rm) continue;
    const prev = blockBestByExercise.get(s.exercise_name);
    if (!prev || e1rm > prev.value) {
      blockBestByExercise.set(s.exercise_name, {
        record_type: '1rm_estimate',
        value: parseFloat(e1rm.toFixed(1)),
        reps: s.actual_reps,
        exercise_name: s.exercise_name,
      });
    }
  }
  const prs = Array.from(blockBestByExercise.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    meso: rowToCamel(meso),
    totalSessions,
    totalSets,
    tonnage: Math.round(tonnage),
    tonnageDelta,
    topExercise,
    avgDuration,
    bestSession,
    prs: prs.map(rowToCamel),
    startDate: meso.start_date,
    endDate: meso.end_date,
  };
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
    _scheduleSync();
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
  _scheduleSync();
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

// ─── Bulk-sync read helpers ───────────────────────────────────────────────
// Return every row owned by `userId` for a given table — used by sync.js to
// upload the user's complete state to the cloud (idempotent upserts so
// re-running is safe). Kept separate from the paginated/recency-filtered
// reads the UI uses.

export async function getAllRoutineExercisesForUser(userId) {
  const d = await db();
  // Join via routines so we only pull this user's routine exercises.
  const rows = await d.getAllAsync(
    `SELECT re.* FROM routine_exercises re
     JOIN routines r ON r.id = re.routine_id
     WHERE r.user_id = ?`,
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function getAllRoutinesForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM routines WHERE user_id = ?', [userId]);
  return rows.map(rowToCamel);
}

export async function getAllMesocyclesForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM mesocycles WHERE user_id = ?', [userId]);
  return rows.map(rowToCamel);
}

export async function getAllMesocycleWeeksForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT mw.* FROM mesocycle_weeks mw
     JOIN mesocycles m ON m.id = mw.mesocycle_id
     WHERE m.user_id = ?`,
    [userId],
  );
  return rows.map(rowToCamel);
}

export async function getAllMorningWeightsForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM morning_weights WHERE user_id = ?', [userId]);
  return rows.map(rowToCamel);
}

export async function getAllWeeklyCheckinsForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM weekly_checkins WHERE user_id = ?', [userId]);
  return rows.map(rowToCamel);
}

export async function getAllCoachOutputsForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM coach_outputs WHERE user_id = ?', [userId]);
  return rows.map(rowToCamel);
}

export async function getAllBodyMetricsForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM body_metric_log WHERE user_id = ?', [userId]);
  return rows.map(rowToCamel);
}

export async function getAllExerciseUserNotesForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM exercise_user_notes WHERE user_id = ?', [userId]);
  return rows.map(rowToCamel);
}

// ─── Bulk getters for tables that previously didn't sync ──────────────────
// Each returns rows in camelCase ready for the sync push payload.
// They mirror the existing getAllX patterns above.

export async function getAllUserInsightsForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM user_insights WHERE user_id = ?', [userId]);
  return rows.map(rowToCamel);
}

export async function getAllWorkoutNotesForUser(userId) {
  const d = await db();
  // workout_notes_v2 is the sync-aware table introduced in migration v19.
  // Older notes in the original workout_notes table are migrated lazily
  // on first read by the WorkoutSummary screen; we only sync v2 rows.
  try {
    const rows = await d.getAllAsync(
      'SELECT * FROM workout_notes_v2 WHERE user_id = ?', [userId],
    );
    return rows.map(rowToCamel);
  } catch (_) { return []; }
}

export async function getAllExerciseGoalsForUser(userId) {
  const d = await db();
  try {
    const rows = await d.getAllAsync('SELECT * FROM exercise_goals WHERE user_id = ?', [userId]);
    return rows.map(rowToCamel);
  } catch (_) { return []; }
}

export async function getAllPeakWeekPlansForUser(userId) {
  const d = await db();
  try {
    const rows = await d.getAllAsync('SELECT * FROM peak_week_plans WHERE user_id = ?', [userId]);
    return rows.map(rowToCamel);
  } catch (_) { return []; }
}

export async function getAllPlannedMuscleVolumeForUser(userId) {
  const d = await db();
  try {
    // The primary planned_muscle_volume table has no user_id column, so
    // we JOIN through mesocycle_weeks → mesocycles to filter. Previously
    // this read from the _sync mirror, which was only populated by
    // cloud pulls — so locally-computed planned volumes never reached
    // the cloud and were lost on cross-device restore.
    const rows = await d.getAllAsync(
      `SELECT pmv.*, m.user_id AS user_id
       FROM planned_muscle_volume pmv
       JOIN mesocycle_weeks mw ON mw.id = pmv.mesocycle_week_id
       JOIN mesocycles m ON m.id = mw.mesocycle_id
       WHERE m.user_id = ?`,
      [userId],
    );
    return rows.map(rowToCamel);
  } catch (_) { return []; }
}

export async function getAllAdaptationEventsForUser(userId) {
  const d = await db();
  try {
    // Same shape as getAllPlannedMuscleVolumeForUser: the primary
    // adaptation_events table has no user_id column, so we JOIN through
    // mesocycle_weeks → mesocycles. Reading from the _sync mirror only
    // ever returned cloud-pulled rows, never the locally-written ones,
    // which meant adaptation decisions never reached the cloud.
    const rows = await d.getAllAsync(
      `SELECT ae.*, m.user_id AS user_id
       FROM adaptation_events ae
       JOIN mesocycle_weeks mw ON mw.id = ae.mesocycle_week_id
       JOIN mesocycles m ON m.id = mw.mesocycle_id
       WHERE m.user_id = ?`,
      [userId],
    );
    return rows.map(rowToCamel);
  } catch (_) { return []; }
}

// ─── Bulk-sync write helpers (used by pullFromCloud) ──────────────────────
// Insert OR IGNORE so a cloud restore doesn't overwrite a row that's already
// locally updated. Each function takes a row in camelCase as it comes back
// from Supabase via Volyume's existing snake_case→camel mapper.

export async function insertRoutineFromCloud(userId, r) {
  const d = await db();
  await d.runAsync(
    `INSERT OR IGNORE INTO routines
      (id, user_id, name, description, split_type, day_of_week, is_active,
       is_library, is_sample, source_routine_id, programme_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.id, userId, r.name, r.description ?? null, r.split_type ?? r.splitType ?? null,
      r.day_of_week ?? r.dayOfWeek ?? null,
      r.is_active ?? r.isActive ?? 1,
      r.is_library ?? r.isLibrary ?? 0,
      r.is_sample ?? r.isSample ?? 0,
      r.source_routine_id ?? r.sourceRoutineId ?? null,
      r.programme_id ?? r.programmeId ?? null,
      typeof (r.created_at ?? r.createdAt) === 'string' ? new Date(r.created_at ?? r.createdAt).getTime() : (r.created_at ?? r.createdAt ?? Date.now()),
      Date.now(),
    ],
  );
}

export async function insertProgrammeFromCloud(userId, p) {
  const d = await db();
  await d.runAsync(
    `INSERT OR IGNORE INTO programmes
      (id, user_id, name, description, is_library, is_active, source_programme_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id, userId, p.name, p.description ?? null,
      p.is_library ? 1 : 0,
      p.is_active ? 1 : 0,
      p.source_programme_id ?? null,
      typeof p.created_at === 'string' ? new Date(p.created_at).getTime() : (p.created_at ?? Date.now()),
      Date.now(),
    ],
  );
}

export async function insertRoutineExerciseFromCloud(re) {
  const d = await db();
  // Heal mismatched canonical IDs at insert time.
  // If the cloud row references an exercise_id that doesn't resolve
  // locally but carries a denormalised exercise_name, look up the
  // local exercise of that name and rewrite the FK. This turns a
  // would-be-broken row into a fully-resolved one without any user
  // action — the cure for the 114-routines-with-zero-exercises bug.
  let exerciseId = re.exercise_id;
  const exerciseName = re.exercise_name ?? null;
  if (exerciseId) {
    const local = await d.getFirstAsync(
      'SELECT 1 FROM exercises WHERE id = ?', [exerciseId],
    );
    if (!local && exerciseName) {
      const byName = await d.getFirstAsync(
        'SELECT id FROM exercises WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [exerciseName],
      );
      if (byName?.id) exerciseId = byName.id;
    }
  }
  await d.runAsync(
    `INSERT OR REPLACE INTO routine_exercises
      (id, routine_id, exercise_id, exercise_name, order_in_routine, recommended_sets,
       recommended_reps_min, recommended_reps_max, notes, starting_weight,
       rest_seconds, superset_group_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      re.id, re.routine_id, exerciseId, exerciseName,
      re.order_in_routine ?? 0,
      re.recommended_sets ?? 3,
      re.recommended_reps_min ?? 6,
      re.recommended_reps_max ?? 12,
      re.notes ?? null,
      re.starting_weight ?? null,
      re.rest_seconds ?? null,
      re.superset_group_id ?? null,
      typeof re.created_at === 'string' ? new Date(re.created_at).getTime() : (re.created_at ?? Date.now()),
      Date.now(),
      re.deleted_at ? new Date(re.deleted_at).getTime() : null,
    ],
  );
}

export async function insertMorningWeightFromCloud(userId, w) {
  const d = await db();
  await d.runAsync(
    `INSERT OR IGNORE INTO morning_weights (id, user_id, weight_kg, logged_at, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      w.id, userId, w.weight_kg,
      typeof w.logged_at === 'string' ? new Date(w.logged_at).getTime() : w.logged_at,
      w.notes ?? null,
      typeof w.created_at === 'string' ? new Date(w.created_at).getTime() : (w.created_at ?? Date.now()),
    ],
  );
}

// Restores a single body_metrics row from cloud into local SQLite.
// The cloud column names diverge from the local _cm-suffixed naming:
// cloud uses body_weight / waist / chest / hips / quads / arms /
// shoulders / forearms / hamstrings / calves with a DATE-typed
// metric_date instead of an ms epoch logged_at. The previous version
// of this function was reading m.weight_kg / m.thigh_cm / m.arm_cm
// / etc. — none of which exist on the cloud row — so every measured
// value came back as null on cross-device restore. The Athlete Hub
// then showed "Body metrics: No entries yet" even though the user had
// dutifully logged dozens of weigh-ins.
//
// INSERT OR IGNORE so repeated cloud syncs are idempotent.
export async function insertBodyMetricFromCloud(userId, m) {
  const d = await db();
  const dateToMs = (s) => {
    if (s == null) return null;
    if (typeof s === 'number') return s;
    // Cloud metric_date is a YYYY-MM-DD DATE. Parse at midnight UTC so
    // the local representation is the same instant regardless of
    // device time zone, then app code shows local-day dates from it.
    const ms = new Date(`${s}T00:00:00Z`).getTime();
    return Number.isFinite(ms) ? ms : null;
  };
  const tsToMs = (v) => v == null ? null : (typeof v === 'string' ? new Date(v).getTime() : v);
  await d.runAsync(
    `INSERT OR IGNORE INTO body_metric_log
      (id, user_id, logged_at, weight_kg, body_fat_percent, body_fat_source,
       waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm, shoulders_cm,
       forearm_cm, ham_cm, calf_cm, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      m.id, userId,
      dateToMs(m.metric_date) ?? tsToMs(m.logged_at),
      m.body_weight ?? null,
      m.body_fat_percent ?? null,
      m.body_fat_source ?? null,
      m.waist ?? null,
      m.chest ?? null,
      m.hips ?? null,
      m.quads ?? null,
      m.arms ?? null,
      m.shoulders ?? null,
      m.forearms ?? null,
      m.hamstrings ?? null,
      m.calves ?? null,
      m.notes ?? null,
      tsToMs(m.created_at) ?? Date.now(),
    ],
  );
}

export async function insertWeeklyCheckinFromCloud(userId, c) {
  const d = await db();
  await d.runAsync(
    `INSERT OR IGNORE INTO weekly_checkins
      (id, user_id, week_start, energy_score, soreness_score, stress_score, sleep_hours,
       cals_adherence, steps_adherence, cycle_override, notes,
       training_performance, joint_pain, sore_muscles, sleep_quality, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      c.id, userId, c.week_start,
      c.energy_score ?? null, c.soreness_score ?? null, c.stress_score ?? null,
      c.sleep_hours ?? null, c.cals_adherence ?? null, c.steps_adherence ?? null,
      c.cycle_override ? 1 : 0, c.notes ?? null,
      c.training_performance ?? null,
      c.joint_pain ? 1 : 0,
      c.sore_muscles ?? null,
      c.sleep_quality ?? null,
      Date.now(), Date.now(),
    ],
  );
}

export async function insertCoachOutputFromCloud(userId, co) {
  const d = await db();
  await d.runAsync(
    `INSERT OR IGNORE INTO coach_outputs (id, user_id, week_start, output_json, applied, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      co.id, userId, co.week_start, co.output_json,
      co.applied ? 1 : 0,
      typeof co.created_at === 'string' ? new Date(co.created_at).getTime() : (co.created_at ?? Date.now()),
    ],
  );
}

// Upserts nutrition_targets from a cloud row. Local table has one row
// per user (enforced by saveNutritionTargets), so an UPDATE wins if the
// user already has a local row and the cloud copy is newer.
export async function insertNutritionTargetsFromCloud(userId, t) {
  const d = await db();
  const updatedAt = typeof t.updated_at === 'string'
    ? new Date(t.updated_at).getTime()
    : (t.updated_at ?? Date.now());
  const createdAt = typeof t.created_at === 'string'
    ? new Date(t.created_at).getTime()
    : (t.created_at ?? updatedAt);
  const warningsStr = t.warnings == null
    ? null
    : (typeof t.warnings === 'string' ? t.warnings : JSON.stringify(t.warnings));

  const existing = await d.getFirstAsync(
    'SELECT id, updated_at FROM nutrition_targets WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (existing) {
    if ((existing.updated_at ?? 0) >= updatedAt) return;
    await d.runAsync(
      `UPDATE nutrition_targets SET
        bmr=?, tdee=?, target_kcal=?, protein_g=?, carbs_g=?, fat_g=?,
        phase=?, bmr_method=?, activity_level=?, confidence=?, warnings=?,
        gdpr_consented=?, updated_at=?
       WHERE user_id=?`,
      [
        t.bmr ?? null, t.tdee ?? null, t.target_kcal ?? null,
        t.protein_g ?? null, t.carbs_g ?? null, t.fat_g ?? null,
        t.phase ?? null, t.bmr_method ?? null, t.activity_level ?? null,
        t.confidence ?? null, warningsStr,
        t.gdpr_consented ? 1 : 0,
        updatedAt, userId,
      ],
    );
    return;
  }
  const id = t.id || uid();
  await d.runAsync(
    `INSERT OR IGNORE INTO nutrition_targets
      (id, user_id, bmr, tdee, target_kcal, protein_g, carbs_g, fat_g,
       phase, bmr_method, activity_level, confidence, warnings,
       gdpr_consented, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId,
      t.bmr ?? null, t.tdee ?? null, t.target_kcal ?? null,
      t.protein_g ?? null, t.carbs_g ?? null, t.fat_g ?? null,
      t.phase ?? null, t.bmr_method ?? null, t.activity_level ?? null,
      t.confidence ?? null, warningsStr,
      t.gdpr_consented ? 1 : 0,
      createdAt, updatedAt,
    ],
  );
}

export async function getCoachOutputHistory(userId, limit = 52) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT week_start, output_json FROM coach_outputs WHERE user_id = ? ORDER BY week_start DESC LIMIT ?',
    [userId, limit],
  );
  return rows.map(r => {
    let parsed = {};
    try { parsed = JSON.parse(r.output_json) ?? {}; } catch { /* ignore */ }
    return { weekStart: r.week_start, ...parsed };
  });
}

// ─── Cloud restore helpers (used by sync.js pullFromCloud) ────────────────────

export async function insertWorkoutFromCloud(userId, w) {
  const d = await db();
  const toMs = iso => iso ? new Date(iso).getTime() : null;
  // Must stay column-symmetric with _upsertWorkout in sync.js.
  // Missing columns here silently drop user-entered fields on
  // cross-device restore.
  await d.runAsync(
    `INSERT OR REPLACE INTO workouts
      (id, user_id, routine_id, mesocycle_id, mesocycle_week_id,
       started_at, ended_at, duration_minutes,
       notes, name, pre_workout_intent,
       session_difficulty, overall_pump, soreness_24h_before, fatigue_level, joint_discomfort,
       set_count, total_volume,
       is_completed, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
    [
      w.id, userId, w.routine_id ?? null, w.mesocycle_id ?? null, w.mesocycle_week_id ?? null,
      toMs(w.started_at), toMs(w.ended_at), w.duration_minutes ?? null,
      w.notes ?? null, w.name ?? null, w.pre_workout_intent ?? null,
      w.session_difficulty ?? null, w.overall_pump ?? null,
      w.soreness_24h_before ?? null, w.fatigue_level ?? null, w.joint_discomfort ?? null,
      w.set_count ?? null, w.total_volume ?? null,
      toMs(w.started_at) ?? Date.now(), Date.now(),
    ],
  );
}

export async function insertMesocycleFromCloud(userId, m) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `INSERT OR REPLACE INTO mesocycles
      (id, user_id, name, start_date, end_date, duration_weeks, planned_weeks,
       focus, block_type, rir_ladder, is_active, auto_regulation_enabled,
       deload_week, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      m.id, userId, m.name ?? null,
      m.start_date ?? null, m.end_date ?? null,
      m.duration_weeks ?? null, m.planned_weeks ?? m.duration_weeks ?? null,
      m.focus ?? null, m.block_type ?? null,
      m.rir_ladder ?? null,
      m.is_active ? 1 : 0,
      m.auto_regulation_enabled ? 1 : 0,
      m.deload_week ?? null,
      now, now,
    ],
  );
}

export async function insertMesocycleWeekFromCloud(w) {
  const d = await db();
  // Cloud uses week_number, local uses week_index. rir_target is
  // NOT NULL locally but isn't on the cloud schema; default it from
  // is_deload so the row still slots back in.
  const weekIdx = w.week_number ?? w.week_index ?? 1;
  await d.runAsync(
    `INSERT OR REPLACE INTO mesocycle_weeks
      (id, mesocycle_id, week_index, is_deload, rir_target, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      w.id, w.mesocycle_id, weekIdx,
      w.is_deload ? 1 : 0,
      w.is_deload ? 4 : 2,
      w.notes ?? null,
      Date.now(), Date.now(),
    ],
  );
}

// Re-stamps all local data from localUserId → supabaseUserId so the app
// reads it correctly after account creation during onboarding.
// Tables listed here MUST have a user_id column — adaptation_events keys off
// mesocycle_week_id so it doesn't need re-stamping, and personal_records
// doesn't exist locally at all (PRs are computed on the fly from sets).
export async function migrateLocalUserId(localUserId, supabaseUserId) {
  if (!localUserId || !supabaseUserId || localUserId === supabaseUserId) return;
  const d = await db();
  const tables = [
    'workouts', 'workout_sets', 'routines', 'programmes',
    'nutrition_targets', 'body_metric_log', 'morning_weights',
    'weekly_checkins', 'coach_outputs', 'mesocycles', 'user_body_profile',
    'user_insights', 'peak_week_plans', 'exercise_user_notes',
    'exercise_goals', // missed in the original migrate list — these are user-keyed
    // Sync-mirror tables from migration v19. user_id column is
    // present on all three; re-key them so the pre-signin local
    // sample data lands under the cloud uid for the push.
    'workout_notes_v2', 'planned_muscle_volume_sync', 'adaptation_events_sync',
    // Queued sync ops written while signed-out are keyed by the local
    // UUID. Without re-keying, the drainer would push them under the
    // wrong user and they'd fail RLS on the cloud, then get marked as
    // permanently failed and dropped.
    'pending_sync_ops',
    // Food domain tables (migration 015). Same rule: rows written
    // while signed-out are keyed under the anonymous localUserId and
    // need re-stamping before food_sync_push so RLS accepts them.
    // foods is a shared lookup cache and has no user_id column.
    'custom_foods', 'food_entries', 'daily_intake_rollups',
    'saved_meals', 'recipes', 'food_favourites', 'daily_water',
  ];
  for (const table of tables) {
    try {
      await d.runAsync(
        `UPDATE ${table} SET user_id = ? WHERE user_id = ?`,
        [supabaseUserId, localUserId],
      );
    } catch (e) {
      logError('database.migrateLocalUserId', e, { table });
    }
  }
}

export async function getProgressionTeaser(userId, lastWorkoutId, prevWorkoutId) {
  if (!lastWorkoutId || !prevWorkoutId) return null;
  const d = await db();
  const w1Rows = await d.getAllAsync(
    `SELECT ws.exercise_id, e.name, MAX(ws.weight) as max_weight
     FROM workout_sets ws
     JOIN exercises e ON e.id = ws.exercise_id
     WHERE ws.workout_id = ? AND ws.set_type != 'warmup' AND ws.weight > 0
     GROUP BY ws.exercise_id`,
    [lastWorkoutId],
  );
  if (w1Rows.length === 0) return null;
  const w2Rows = await d.getAllAsync(
    `SELECT ws.exercise_id, MAX(ws.weight) as max_weight
     FROM workout_sets ws
     WHERE ws.workout_id = ? AND ws.set_type != 'warmup' AND ws.weight > 0
     GROUP BY ws.exercise_id`,
    [prevWorkoutId],
  );
  const w2Map = Object.fromEntries(w2Rows.map(r => [r.exercise_id, r.max_weight]));
  let progressed = null;
  let stalled = null;
  for (const row of w1Rows) {
    const prev = w2Map[row.exercise_id];
    if (prev == null) continue;
    if (row.max_weight > prev && !progressed) progressed = row.name;
    else if (row.max_weight <= prev && !stalled) stalled = row.name;
    if (progressed && stalled) break;
  }
  return { progressed, stalled };
}

export async function insertWorkoutSetFromCloud(userId, s) {
  const d = await db();
  // Same self-heal as insertRoutineExerciseFromCloud: rewrite the FK
  // via name lookup when the original exercise_id doesn't resolve
  // locally. Crucial for restoring historical workouts cleanly across
  // devices.
  let exerciseId = s.exercise_id;
  const exerciseName = s.exercise_name ?? null;
  if (exerciseId) {
    const local = await d.getFirstAsync(
      'SELECT 1 FROM exercises WHERE id = ?', [exerciseId],
    );
    if (!local && exerciseName) {
      const byName = await d.getFirstAsync(
        'SELECT id FROM exercises WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [exerciseName],
      );
      if (byName?.id) exerciseId = byName.id;
    }
  }
  await d.runAsync(
    `INSERT OR REPLACE INTO workout_sets
      (id, user_id, workout_id, exercise_id, exercise_name, set_number, set_type,
       target_reps_min, target_reps_max, actual_reps, weight, rir, rpe,
       failed, notes, post_set_pump, post_set_muscle_connection, joint_discomfort,
       is_amrap, amrap_reps, missed_reps, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      s.id, userId, s.workout_id, exerciseId, exerciseName,
      s.set_number ?? 1, s.set_type ?? 'straight',
      s.target_reps_min ?? null, s.target_reps_max ?? null,
      s.actual_reps ?? 0, s.weight ?? null, s.rir ?? null, s.rpe ?? null,
      s.failed ? 1 : 0, s.notes ?? null,
      s.post_set_pump ?? null, s.post_set_muscle_connection ?? null,
      s.joint_discomfort ?? null,
      s.is_amrap ? 1 : 0, s.amrap_reps ?? null,
      s.missed_reps ?? null,
      Date.now(), Date.now(),
      s.deleted_at ? new Date(s.deleted_at).getTime() : null,
    ],
  );
}

// ─── Sync helpers for previously local-only tables ────────────────────────
//
// Each helper accepts a raw cloud row (snake_case keys) and writes it
// into the matching local table. INSERT OR REPLACE keeps repeated
// syncs idempotent — re-pulling the same row updates instead of
// double-inserting. Cloud timestamps (ISO strings) are converted to
// the local ms epoch convention.

const _tsToMs = (v) => {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const ms = Date.parse(String(v));
  return Number.isFinite(ms) ? ms : null;
};

export async function insertOrUpdateExerciseFromCloud(e) {
  if (!e?.id || !e?.name) return;
  const d = await db();
  const now = Date.now();
  // First: check if a local exercise of the same name exists with a
  // DIFFERENT id. If so, rewrite local refs from the local id to the
  // cloud id, then update the exercise row in place. This is how two
  // devices' canonical IDs merge cleanly into one source of truth.
  const sameName = await d.getFirstAsync(
    'SELECT id FROM exercises WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1',
    [e.name, e.id],
  );
  if (sameName?.id) {
    await d.runAsync('UPDATE routine_exercises SET exercise_id = ? WHERE exercise_id = ?', [e.id, sameName.id]);
    await d.runAsync('UPDATE workout_sets SET exercise_id = ? WHERE exercise_id = ?', [e.id, sameName.id]);
    await d.runAsync(
      'UPDATE exercise_user_notes SET exercise_id = ? WHERE exercise_id = ?',
      [e.id, sameName.id],
    ).catch(() => {});
    await d.runAsync(
      'UPDATE exercise_goals SET exercise_id = ? WHERE exercise_id = ?',
      [e.id, sameName.id],
    ).catch(() => {});
    // Remove the duplicate-by-name local row; the upsert below puts
    // the cloud row in its place.
    await d.runAsync('DELETE FROM exercises WHERE id = ?', [sameName.id]);
  }
  const secondary = (() => {
    if (e.secondary_muscles == null) return null;
    try { return JSON.stringify(e.secondary_muscles); } catch { return null; }
  })();
  await d.runAsync(
    `INSERT OR REPLACE INTO exercises
      (id, name, primary_muscle, secondary_muscles, equipment, movement_pattern,
       compound_isolation, default_rep_min, default_rep_max, fatigue_cost,
       stimulus_to_fatigue_ratio, subregion, is_custom, notes, created_at, updated_at,
       exercise_category, increment_kg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.id, e.name,
      e.primary_muscle ?? null, secondary,
      e.equipment ?? null, e.movement_pattern ?? null,
      e.compound_isolation ?? null,
      e.default_rep_min ?? null, e.default_rep_max ?? null,
      e.fatigue_cost ?? 1, e.stimulus_to_fatigue_ratio ?? 3,
      e.subregion ?? null,
      e.is_custom ? 1 : 0, e.notes ?? null,
      _tsToMs(e.created_at) ?? now, now,
      e.exercise_category ?? 'compound', e.increment_kg ?? 2.5,
    ],
  );
}

export async function insertOrUpdateUserBodyProfileFromCloud(userId, p) {
  if (!userId) return;
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    'SELECT id FROM user_body_profile WHERE user_id = ? LIMIT 1', [userId],
  );
  if (existing?.id) {
    await d.runAsync(
      `UPDATE user_body_profile SET
        sex = ?, date_of_birth = ?, height_cm = ?, experience_level = ?,
        training_age_years = ?, primary_goal = ?, scoff_score = ?,
        gdpr_consented = ?, updated_at = ?
       WHERE user_id = ?`,
      [
        p.sex ?? null, p.date_of_birth ?? null, p.height_cm ?? null,
        p.experience_level ?? null, p.training_age_years ?? null,
        p.primary_goal ?? null, p.scoff_score ?? null,
        p.gdpr_consented ? 1 : 0, now, userId,
      ],
    );
    return;
  }
  await d.runAsync(
    `INSERT INTO user_body_profile
      (id, user_id, sex, date_of_birth, height_cm, experience_level,
       training_age_years, primary_goal, scoff_score, gdpr_consented,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uid(), userId,
      p.sex ?? null, p.date_of_birth ?? null, p.height_cm ?? null,
      p.experience_level ?? null, p.training_age_years ?? null,
      p.primary_goal ?? null, p.scoff_score ?? null,
      p.gdpr_consented ? 1 : 0,
      _tsToMs(p.created_at) ?? now, now,
    ],
  );
}

export async function insertOrUpdateUserInsightFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO user_insights
      (id, user_id, insight_key, type, severity, copy, action_payload,
       generated_at, dismissed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, userId, row.insight_key, row.type ?? null, row.severity ?? null,
      row.copy ?? null, row.action_payload ?? null,
      _tsToMs(row.generated_at) ?? Date.now(),
      row.dismissed_at ? _tsToMs(row.dismissed_at) : null,
    ],
  );
}

export async function insertOrUpdateExerciseUserNoteFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO exercise_user_notes
      (id, user_id, exercise_id, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      row.id, userId, row.exercise_id, row.note,
      _tsToMs(row.created_at) ?? Date.now(),
      _tsToMs(row.updated_at) ?? Date.now(),
    ],
  );
}

export async function insertOrUpdateWorkoutNoteFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  // Local table is workout_notes_v2 — the v1 schema had a different
  // shape and we don't migrate user-typed notes between them.
  await d.runAsync(
    `INSERT OR REPLACE INTO workout_notes_v2
      (id, user_id, workout_id, note, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, userId, row.workout_id, row.note ?? '',
      _tsToMs(row.created_at) ?? Date.now(),
      _tsToMs(row.updated_at) ?? Date.now(),
      row.deleted_at ? _tsToMs(row.deleted_at) : null,
    ],
  );
}

export async function insertOrUpdateExerciseGoalFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO exercise_goals
      (id, user_id, exercise_id, target_weight, target_reps, target_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, userId, row.exercise_id,
      row.target_weight ?? null, row.target_reps ?? null,
      row.target_date ?? null, row.notes ?? null,
      _tsToMs(row.created_at) ?? Date.now(),
      _tsToMs(row.updated_at) ?? Date.now(),
    ],
  );
}

export async function insertOrUpdatePeakWeekPlanFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO peak_week_plans
      (id, user_id, show_date, federation, current_bodyweight, lean_estimate,
       prep_carbs_per_kg, prep_sodium_mg, prep_water_l, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, userId,
      row.show_date ?? null, row.federation ?? null,
      row.current_bodyweight ?? null, row.lean_estimate ?? null,
      row.prep_carbs_per_kg ?? null, row.prep_sodium_mg ?? null,
      row.prep_water_l ?? null,
      row.status ?? 'active',
      _tsToMs(row.created_at) ?? Date.now(),
      _tsToMs(row.updated_at) ?? Date.now(),
    ],
  );
}

export async function insertOrUpdatePlannedMuscleVolumeFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO planned_muscle_volume_sync
      (id, mesocycle_week_id, user_id, muscle, planned_sets, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, row.mesocycle_week_id, userId,
      row.muscle, row.planned_sets ?? null,
      _tsToMs(row.created_at) ?? Date.now(),
      _tsToMs(row.updated_at) ?? Date.now(),
      row.deleted_at ? _tsToMs(row.deleted_at) : null,
    ],
  );
}

export async function insertOrUpdateAdaptationEventFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO adaptation_events_sync
      (id, user_id, mesocycle_week_id, event_type, payload, recorded_at,
       created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, userId,
      row.mesocycle_week_id ?? null, row.event_type,
      row.payload ?? null,
      _tsToMs(row.recorded_at) ?? Date.now(),
      _tsToMs(row.created_at) ?? Date.now(),
      _tsToMs(row.updated_at) ?? Date.now(),
      row.deleted_at ? _tsToMs(row.deleted_at) : null,
    ],
  );
}

// ─── Exercise User Notes ──────────────────────────────────────────────────────

export async function saveExerciseUserNote(userId, exerciseId, note) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    'SELECT id FROM exercise_user_notes WHERE user_id = ? AND exercise_id = ?',
    [userId, exerciseId],
  );
  if (existing?.id) {
    await d.runAsync(
      'UPDATE exercise_user_notes SET note = ?, updated_at = ? WHERE id = ?',
      [note, now, existing.id],
    );
    _scheduleSync();
    return existing.id;
  }
  const id = uid();
  await d.runAsync(
    'INSERT INTO exercise_user_notes (id, user_id, exercise_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, exerciseId, note, now, now],
  );
  _scheduleSync();
  return id;
}

export async function getExerciseUserNote(userId, exerciseId) {
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT note FROM exercise_user_notes WHERE user_id = ? AND exercise_id = ?',
    [userId, exerciseId],
  );
  return row?.note ?? null;
}

export async function deleteExerciseUserNote(userId, exerciseId) {
  const d = await db();
  await d.runAsync(
    'DELETE FROM exercise_user_notes WHERE user_id = ? AND exercise_id = ?',
    [userId, exerciseId],
  );
  _scheduleSync();
}

// ─── Workout Feedback / Fatigue Trend ────────────────────────────────────────

/**
 * Returns the last `limit` completed workouts that have a fatigue_level value,
 * ordered newest-first so the caller can reverse for chart display.
 */
export async function getRecentWorkoutFeedback(userId, limit = 6) {
  try {
    const d = await db();
    const rows = await d.getAllAsync(
      `SELECT fatigue_level, session_difficulty, overall_pump, started_at
       FROM workouts
       WHERE user_id = ? AND is_completed = 1 AND fatigue_level IS NOT NULL
       ORDER BY started_at DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows.map(rowToCamel);
  } catch (_e) {
    return [];
  }
}

// ─── Next-time coaching notes ─────────────────────────────────────────────────

export async function saveNextTimeNote(userId, { routineId = null, exerciseId = null, note, expiresAfterUses = 1 }) {
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO workout_notes (id, user_id, routine_id, exercise_id, note, created_at, expires_after_uses, shown_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [id, userId, routineId ?? null, exerciseId ?? null, note, now, expiresAfterUses],
  );
  _scheduleSync();
  return { id, userId, routineId, exerciseId, note, createdAt: now, expiresAfterUses, shownCount: 0 };
}

export async function getNextTimeNotes(userId, routineId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM workout_notes
     WHERE user_id = ?
       AND (routine_id = ? OR routine_id IS NULL)
       AND shown_count < expires_after_uses
     ORDER BY created_at ASC`,
    [userId, routineId ?? null],
  );
  return rows.map(rowToCamel);
}

export async function markNoteShown(noteId) {
  const d = await db();
  // Increment shown_count; then delete if it has reached expires_after_uses.
  await d.runAsync(
    'UPDATE workout_notes SET shown_count = shown_count + 1 WHERE id = ?',
    [noteId],
  );
  await d.runAsync(
    'DELETE FROM workout_notes WHERE id = ? AND shown_count >= expires_after_uses',
    [noteId],
  );
}

// ─── Exercise Goals ───────────────────────────────────────────────────────────

export async function saveExerciseGoal(userId, exerciseId, { targetWeight, targetDate = null }) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    'SELECT id FROM exercise_goals WHERE user_id = ? AND exercise_id = ?',
    [userId, exerciseId],
  );
  if (existing?.id) {
    await d.runAsync(
      'UPDATE exercise_goals SET target_weight = ?, target_date = ?, achieved_at = NULL WHERE id = ?',
      [targetWeight, targetDate ?? null, existing.id],
    );
    _scheduleSync();
    return existing.id;
  }
  const id = uid();
  await d.runAsync(
    `INSERT INTO exercise_goals (id, user_id, exercise_id, target_weight, target_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, exerciseId, targetWeight, targetDate ?? null, now],
  );
  _scheduleSync();
  return id;
}

export async function getExerciseGoal(userId, exerciseId) {
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM exercise_goals WHERE user_id = ? AND exercise_id = ?',
    [userId, exerciseId],
  );
  return rowToCamel(row);
}

export async function markGoalAchieved(goalId) {
  const d = await db();
  await d.runAsync(
    'UPDATE exercise_goals SET achieved_at = ? WHERE id = ?',
    [Date.now(), goalId],
  );
  _scheduleSync();
}

export async function deleteExerciseGoal(userId, exerciseId) {
  const d = await db();
  await d.runAsync(
    'DELETE FROM exercise_goals WHERE user_id = ? AND exercise_id = ?',
    [userId, exerciseId],
  );
  _scheduleSync();
}

// Returns the most recent completed workout timestamp per primary muscle,
// limited to the last 90 days to avoid stale data.
export async function getLastTrainedPerMuscle(userId) {
  const d = await db();
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const rows = await d.getAllAsync(
    `SELECT e.primary_muscle, MAX(w.started_at) AS last_trained_at
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     JOIN exercises e ON ws.exercise_id = e.id
     WHERE ws.user_id = ?
       AND w.is_completed = 1
       AND ws.set_type != 'warmup'
       AND e.primary_muscle IS NOT NULL
       AND w.started_at >= ?
     GROUP BY e.primary_muscle`,
    [userId, cutoff],
  );
  const result = {};
  for (const row of rows) {
    if (row.primary_muscle) result[row.primary_muscle] = row.last_trained_at;
  }
  return result;
}
