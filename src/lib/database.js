import * as SQLite from 'expo-sqlite';
import { generateInsights } from './insightsEngine';
import { calculate1RM, allocateExerciseVolume } from './algorithms';
import { pickBestLift } from './bestLift';
import { logError, logWarn } from './errorLog';
import { localDayKey, localWeekStartMs } from './dayKey';
import { openEncryptedDb } from './dbCrypto';
import { weekWindowsEndingAt as buildWeekWindowsEndingAt } from './weekWindows';
import { createActivityRepository } from './database/activity';
import { createBodyMetricsRepository } from './database/bodyMetrics';
import { createPlanFoldersRepository } from './database/planFolders';
import { MICRO_COLUMNS, microColumnsCreateFragment } from './food/micronutrients';

export function weekWindowsEndingAt(anchorMs, weeksBack = 4) {
  return buildWeekWindowsEndingAt(anchorMs, weeksBack);
}

let _db = null;
let _initPromise = null;
// Whether the local DB is actually SQLCipher-encrypted. null = not yet opened,
// false = opened on the safe plaintext fallback (audit F-002: surface this so it
// isn't invisible while the consent screen claims encrypted local storage).
let _dbEncrypted = null;

/** Current local DB encryption state: true (encrypted), false (plaintext
 *  fallback), or null (DB not opened yet). Read by privacy/consent surfaces. */
export function isLocalDbEncrypted() {
  return _dbEncrypted;
}

/**
 * Flush the WAL into the main DB file so a byte-for-byte file copy (a snapshot)
 * is complete. In WAL mode recent commits can sit in volyume.db-wal until
 * checkpointed (audit F-003). Best-effort and never throws; a no-op if the DB
 * isn't open yet.
 */
export async function checkpointWal() {
  if (!_db) return;
  try { await _db.execAsync('PRAGMA wal_checkpoint(FULL);'); } catch (_) { /* best-effort */ }
}

// Fire a debounced full cloud sync after a local write. Lazy-required
// to avoid the circular import (sync.js → database.js → sync.js).
// Every mutating write function below calls this AFTER its local
// SQLite mutation succeeds so rapid edits coalesce into one push
// within ~2 seconds.
function _scheduleSync() {
  try {
    // eslint-disable-next-line global-require
    require('./sync').scheduleSync();
  } catch (_) { /* sync module unavailable, tolerate */ }
}

export function uid() {
  // UUID v4, required so rows sync cleanly to Supabase, whose primary-key
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

const bodyMetricsRepository = createBodyMetricsRepository({
  db,
  uid,
  rowToCamel,
  scheduleSync: _scheduleSync,
});

const activityRepository = createActivityRepository({
  db,
  uid,
  rowToCamel,
  scheduleSync: _scheduleSync,
  dayKey: localDayKey,
});

const planFoldersRepository = createPlanFoldersRepository({
  db,
  uid,
  rowToCamel,
  runInTransaction,
  scheduleSync: _scheduleSync,
});

// COMP-009: close the SQLite handle and reset init state so the file can be
// safely overwritten (snapshot restore) and reopened on the next db() call /
// app relaunch. Restoring a snapshot over a live, open handle risks corruption,
// so the restore flow closes first. Best-effort: a close error still clears the
// in-memory handle.
export async function closeDatabase() {
  const handle = _db;
  _db = null;
  _initPromise = null;
  try { await handle?.closeAsync?.(); } catch (_) { /* tolerate */ }
}

export function initDatabase() {
  // Gate on the in-flight init FIRST (audit 2026-07-01 race): _db is now only
  // set once _doInit has finished all schema + migrations, so while init is
  // running _db is still null and _initPromise is the only handle — returning it
  // makes concurrent callers await a fully-ready DB instead of a half-open one.
  if (_initPromise) return _initPromise;
  if (_db) return Promise.resolve(_db);
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
  // F-004: open the DB SQLCipher-encrypted, migrating an existing plaintext DB
  // in place on first run. openEncryptedDb sets `PRAGMA key` as the first
  // statement and falls back to a working plaintext handle if encryption fails,
  // so the app never bricks or loses data. `PRAGMA key` MUST precede any other
  // statement, so this runs before `PRAGMA journal_mode`.
  const { db: opened, encrypted } = await openEncryptedDb(SQLite);
  // Do NOT publish `_db` yet (audit 2026-07-01 race): all schema + migration
  // work below runs on the local `opened` handle, and `_db` is assigned only
  // AFTER everything completes (bottom of this function). Publishing early let a
  // concurrent db() caller receive a handle whose tables did not exist yet.
  // db()/initDatabase() gate on `_initPromise` so concurrent callers await this
  // whole function rather than reading a half-initialised `_db`.
  _dbEncrypted = !!encrypted;
  // F-002: a plaintext fallback is a real availability decision, but it must not
  // be silent — the consent screen tells users their data is in encrypted local
  // storage. Log it (non-sensitive) so the field state is visible; a surface can
  // read isLocalDbEncrypted() to keep privacy copy honest.
  if (!encrypted) {
    // eslint-disable-next-line global-require
    try { require('./errorLog').logWarn('database.plaintextFallback', 'local DB opened UNENCRYPTED (SQLCipher unavailable / migration fallback)', {}); } catch (_) {}
  }
  await opened.execAsync('PRAGMA journal_mode = WAL;');
  await opened.execAsync(`
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
      exercise_type TEXT DEFAULT 'weight_reps',
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
  await opened.execAsync(`
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

  await runMigrations(opened);
  // Schema + migrations are complete: NOW publish the handle. A concurrent
  // db()/initDatabase() awaiting _initPromise resolves to a fully-ready DB.
  _db = opened;
  return _db;
}

// ─── Structured migration system ────────────────────────────────────────────
//
// Each entry in SCHEMA_MIGRATIONS is one schema version: an ordered list of
// SQL statements. The applied version is tracked in SQLite's own
// `PRAGMA user_version`, so every migration runs exactly once and future
// schema changes only need a new array entry appended here, existing user
// data is never wiped or re-migrated.
//
// IMPORTANT: never edit or reorder an existing migration once shipped. Only
// append new ones. To change the schema, add a new sub-array.
const SCHEMA_MIGRATIONS = [
  // v1, additive columns + the programmes table. These predate version
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
  // v2, remap exercises.primary_muscle from generic 'shoulders' to the
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
  // v3, mesocycle week scaffold: week table, planned volume, adaptation events,
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
  // v4, add joint_discomfort to workouts so feedback is fully persisted
  [
    `ALTER TABLE workouts ADD COLUMN joint_discomfort INTEGER`,
  ],
  // v5, add difficulty to programmes so library filter chips work
  [
    'ALTER TABLE programmes ADD COLUMN difficulty INTEGER',
  ],
  // v6, Pro coaching tables: morning weights, weekly check-ins, coach outputs
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
  // v7, add training performance and joint pain to weekly check-ins
  [
    'ALTER TABLE weekly_checkins ADD COLUMN training_performance TEXT',
    'ALTER TABLE weekly_checkins ADD COLUMN joint_pain INTEGER DEFAULT 0',
  ],
  // v8, wellbeing screening score on user body profile
  [
    'ALTER TABLE user_body_profile ADD COLUMN scoff_score INTEGER',
  ],
  // v9, pre-workout intent captured before each session
  [
    'ALTER TABLE workouts ADD COLUMN pre_workout_intent TEXT',
  ],
  // v10, muscle-specific soreness on weekly check-ins
  [
    'ALTER TABLE weekly_checkins ADD COLUMN sore_muscles TEXT',
  ],
  // v11, exercise user notes: persistent per-user per-exercise notes for machine settings, cues, etc.
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
  // v12, sleep quality field in weekly_checkins for post-session recovery tracking
  [
    'ALTER TABLE weekly_checkins ADD COLUMN sleep_quality INTEGER',
  ],
  // v13, proper boolean flag to identify sample/library routines, replacing the fragile [SAMPLE] name prefix
  [
    'ALTER TABLE routines ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0',
  ],
  // v14, between-session "next time" coaching notes
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
  // v15, exercise milestone goals: target weight + optional target date per exercise
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

  // v16, pending sync ops queue. Mutations that fail to ship to the
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
  // v17, columns that insertRoutineFromCloud + insertProgrammeFromCloud
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
  // v18, backfill deterministic canonical exercise IDs.
  //
  // Canonical exercises had random uid() IDs minted at seed time, so
  // every install produced a different ID for the same exercise. That
  // meant a routine_exercises row pushed from device A with
  // exercise_id = X resolved on device B's INNER JOIN only if device
  // B's seed had produced the same random X, which it never did.
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
  // v19, universal sync columns + denormalised exercise_name.
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
    // is best-effort, rows whose exercise_id no longer resolves locally
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
  // v20, indexes on the sync-mirror tables introduced in v19. The
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

  // v21, backfill mesocycles.end_date for rows that pre-date the fix
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

  // v22, re-issue mesocycle_weeks IDs that pre-date the UUID fix.
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
        await runInTransaction(d, async () => {
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

  // v23, indexes that matter at scale. Every aggregate query
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
      ${microColumnsCreateFragment()},
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
      ${microColumnsCreateFragment()},
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
  // Move #2: ED-pattern detection + goal lock + engine telemetry.
  // - ed_pattern_flags is the state machine: one open row per user
  //   while the flag is raised, cleared_at populated on clearance.
  // - goal_lock_advanced lives on user_body_profile and raises the
  //   detector threshold from 2 signals to 3 for users who picked
  //   physique_competition or advanced_recomp at onboarding AND
  //   declared prior experience managing aggressive cuts.
  // - engine_telemetry is the local mirror for Move #3 (cascade
  //   telemetry) -- written here so the SQLite layer owns both
  //   safety and instrumentation in the same migration block.
  [
    `CREATE TABLE IF NOT EXISTS ed_pattern_flags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      flag_state TEXT NOT NULL,
      reason TEXT,
      signals_json TEXT,
      raised_at INTEGER NOT NULL,
      cleared_at INTEGER,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_ed_pattern_flags_user ON ed_pattern_flags(user_id, raised_at)',
    'CREATE INDEX IF NOT EXISTS idx_ed_pattern_flags_open ON ed_pattern_flags(user_id, cleared_at)',
    // tier_history local mirror so the per-table pull in
    // src/lib/sync/tables/tierHistory.js has somewhere to land.
    // Server-authoritative + pull_only per SYNC_REGISTRY; rows
    // arrive via the upsert helper in this file.
    `CREATE TABLE IF NOT EXISTS tier_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      from_tier TEXT,
      to_tier TEXT,
      event_type TEXT,
      occurred_at INTEGER NOT NULL,
      payload_json TEXT,
      created_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_tier_history_user ON tier_history(user_id, occurred_at)',
    'ALTER TABLE user_body_profile ADD COLUMN goal_lock_advanced INTEGER DEFAULT 0',
    'ALTER TABLE user_body_profile ADD COLUMN goal_lock_set_at INTEGER',
    `CREATE TABLE IF NOT EXISTS engine_telemetry (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event TEXT NOT NULL,
      payload_json TEXT,
      occurred_at INTEGER NOT NULL,
      pushed_at INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_engine_telemetry_user ON engine_telemetry(user_id, occurred_at)',
    'CREATE INDEX IF NOT EXISTS idx_engine_telemetry_pushed ON engine_telemetry(pushed_at)',
  ],
  // Identity + ownership locked design (docs/IDENTITY_AND_OWNERSHIP_LOCKED.md).
  // Mirror the cloud migration 018: child tables that join through a
  // parent's user_id need the column locally so the new composite-key
  // upserts work correctly. SQLite is more forgiving than Postgres so
  // we don't have to restructure PKs here: the local schema is wiped
  // on every sign-out under the locked design, so collisions across
  // accounts cannot happen locally by construction.
  //
  // For now we only ADD user_id columns + backfill from parents. The
  // sign-out wipe + sync code changes ship in parallel commits.
  [
    'ALTER TABLE routine_exercises ADD COLUMN user_id TEXT',
    // LOCKED-OK: one-shot backfill of the column just added above.
    // Not a runtime ownership mutation; rows get their user_id from
    // the parent routine. Runs once per install.
    `UPDATE routine_exercises SET user_id = (
      SELECT r.user_id FROM routines r WHERE r.id = routine_exercises.routine_id
    ) WHERE user_id IS NULL`,
    'CREATE INDEX IF NOT EXISTS idx_routine_exercises_user ON routine_exercises(user_id, routine_id)',

    'ALTER TABLE mesocycle_weeks ADD COLUMN user_id TEXT',
    // LOCKED-OK: same pattern as routine_exercises above.
    `UPDATE mesocycle_weeks SET user_id = (
      SELECT m.user_id FROM mesocycles m WHERE m.id = mesocycle_weeks.mesocycle_id
    ) WHERE user_id IS NULL`,
    'CREATE INDEX IF NOT EXISTS idx_mesocycle_weeks_user ON mesocycle_weeks(user_id, mesocycle_id)',
  ],
  // Custom exercises split (locked in IDENTITY_AND_OWNERSHIP_LOCKED.md).
  // Per-user exercise rows live in custom_exercises with composite PK
  // (user_id, id). The legacy exercises table stays library-only.
  [
    `CREATE TABLE IF NOT EXISTS custom_exercises (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
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
      exercise_category TEXT,
      increment_kg REAL,
      notes TEXT,
      exercise_type TEXT DEFAULT 'weight_reps',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      PRIMARY KEY (user_id, id)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_custom_exercises_id ON custom_exercises(id)',
    'CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_updated ON custom_exercises(user_id, updated_at)',
  ],
  // Food layer: mirror cloud migration 021. Add user_id to
  // recipe_ingredients (the one food child table that lacked it),
  // backfill from parent recipes. Composite PK at this layer would
  // require dropping + recreating the existing recipe_ingredients
  // table -- SQLite doesn't support ALTER ... DROP CONSTRAINT --
  // and we'd need to copy data through a temp table. Skipping that
  // for now since local SQLite doesn't enforce PK at the same
  // strictness as Postgres; the user_id column + index is enough
  // for the sync layer to operate correctly. Future migration
  // rebuilds the table properly when we have a clean window.
  [
    'ALTER TABLE recipe_ingredients ADD COLUMN user_id TEXT',
    // LOCKED-OK: one-shot backfill, same pattern as routine_exercises.
    `UPDATE recipe_ingredients SET user_id = (
      SELECT r.user_id FROM recipes r WHERE r.id = recipe_ingredients.recipe_id
    ) WHERE user_id IS NULL`,
    'CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_user ON recipe_ingredients(user_id, recipe_id)',
  ],
  // Move #1.5 phase 3: barcode persistence on custom_foods.
  // Closes the scan-miss -> save -> rescan loop: a barcode the
  // user entered manually now lives on the custom food, so the
  // next scan resolves locally instead of hitting OFF/USDA again.
  [
    'ALTER TABLE custom_foods ADD COLUMN barcode_ean TEXT',
    'CREATE INDEX IF NOT EXISTS idx_custom_foods_barcode ON custom_foods(barcode_ean) WHERE barcode_ean IS NOT NULL',
  ],
  // recipe_ingredients soft-delete + LWW columns. Closes the
  // gap flagged in 12808b3: the table was the only food child
  // without a deleted_at + updated_at, so cross-device deletes
  // and conflict resolution had no signals to operate on. With
  // these columns the registry's softDelete:true + LWW contract
  // is honourable. Cloud schema for these columns landed
  // founder-side. Idempotent on re-apply via the additive
  // migration error allow-list.
  [
    'ALTER TABLE recipe_ingredients ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE recipe_ingredients ADD COLUMN updated_at INTEGER',
    // Backfill updated_at from created_at for existing rows so
    // the LWW comparison has something to chew on rather than
    // treating every legacy row as forever-stale.
    'UPDATE recipe_ingredients SET updated_at = created_at WHERE updated_at IS NULL',
    'CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_live ON recipe_ingredients(user_id, recipe_id) WHERE deleted_at IS NULL',
  ],
  // v?: food preferences = favourites + dislikes (same table, kind column).
  // Mirrors cloud migration 048. Default 'fav' keeps every legacy row
  // behaving exactly as before.
  [
    "ALTER TABLE food_favourites ADD COLUMN kind TEXT NOT NULL DEFAULT 'fav'",
  ],
  // Cardio adherence on weekly check-ins. Mirrors cloud migration 050.
  // Destination for the coach's confirm-then-apply cardio prescription
  // (GAP row 4): once a prescription is applied (userProfile.cardioPrescription
  // set), the weekly check-in shows a "did you do the cardio?" question
  // and saves the answer here -- same pattern as steps_adherence. Additive
  // + nullable so the frozen closed-test build is unaffected.
  [
    'ALTER TABLE weekly_checkins ADD COLUMN cardio_adherence TEXT',
  ],
  // food_frequents: local cache of the most-logged foods (GAP row 28,
  // Frequents tab). Server computes the top-20-over-30-days nightly
  // (cloud migration 051); the client pulls a snapshot via the
  // food_frequents_pull RPC when the tab is opened and renders from
  // this table. Derived/disposable data, so it sits outside the
  // food_sync_pull/push cycle. Additive: the frozen build never reads it.
  [
    `CREATE TABLE IF NOT EXISTS food_frequents (
      user_id TEXT NOT NULL,
      food_ref TEXT NOT NULL,
      log_count INTEGER NOT NULL DEFAULT 0,
      last_logged_at INTEGER,
      computed_at INTEGER,
      PRIMARY KEY (user_id, food_ref)
    )`,
  ],
  // Per-side reps for unilateral exercises (GAP row 20). When a set is
  // logged left/right, both counts are stored here and actual_reps holds
  // the lower side, so volume + PR + progression (all of which read
  // actual_reps) stay conservative with no engine change. Mirrors cloud
  // migration 054. Additive + nullable: the frozen build never writes
  // them and reads actual_reps as before.
  [
    'ALTER TABLE workout_sets ADD COLUMN left_reps INTEGER',
    'ALTER TABLE workout_sets ADD COLUMN right_reps INTEGER',
  ],
  // daily_steps: the activity store for the cardio/steps audit
  // (docs/audit/volyume-cardio-steps-audit-2026-05-30.md). One row per
  // local day, same per-day shape as daily_water. Holds the day's step
  // total so the manual step-logging path has somewhere to write with no
  // wearable, and so the coach's step target has real data to check
  // against. source records whether the figure was typed ('manual') or
  // filled from a health platform ('health') so an auto-fill and a manual
  // entry can be told apart. Last-write-wins on updated_at; mirrored to
  // cloud via the daily_steps registry entry (additive, cloud migration
  // 056). entry_date is the diary day key (toISOString slice), so a day's
  // steps and that day's food share a boundary on the Diary view.
  [
    `CREATE TABLE IF NOT EXISTS daily_steps (
      user_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      steps INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, entry_date)
    )`,
  ],
  // cardio_log: one row per logged cardio session (audit
  // docs/audit/volyume-cardio-integration-2026-06-03). Unlike daily_steps
  // (one row per day) a day can hold several cardio sessions, so the PK is
  // (user_id, id) per the identity rule, with entry_date a regular indexed
  // column. activity_id references the in-code cardio library; activity_name
  // + met are snapshotted so the row is self-describing if the library later
  // changes. est_kcal is session FEEDBACK only and is never added to the
  // calorie target. updated_at drives last-write-wins; deleted_at gives a
  // soft delete so a delete syncs. Fully additive; the frozen build has no
  // writer or reader.
  [
    `CREATE TABLE IF NOT EXISTS cardio_log (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      activity_id TEXT,
      activity_name TEXT NOT NULL,
      category TEXT,
      duration_min INTEGER NOT NULL DEFAULT 0,
      intensity TEXT NOT NULL DEFAULT 'moderate',
      met REAL,
      est_kcal INTEGER,
      recovery_impact TEXT,
      impact_type TEXT,
      distance REAL,
      avg_hr INTEGER,
      source TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      PRIMARY KEY (user_id, id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cardio_log_user_date ON cardio_log(user_id, entry_date)`,
    `CREATE INDEX IF NOT EXISTS idx_cardio_log_user_updated ON cardio_log(user_id, updated_at)`,
  ],
  // Exercise-library schema expansion (docs/audit/volyume-exercise-audit-
  // 2026-05-30). The richer metadata that lets plan construction reason
  // about anatomical subregion, granular equipment, machine type, goal
  // alignment and difficulty. All additive; canonical exercises are seeded
  // locally so no server migration is needed. equipment_profiles is stored
  // as a JSON array string. See seedExercises.js for the populated values.
  [
    `ALTER TABLE exercises ADD COLUMN equipment_category TEXT`,
    `ALTER TABLE exercises ADD COLUMN machine_type TEXT`,
    `ALTER TABLE exercises ADD COLUMN force TEXT`,
    `ALTER TABLE exercises ADD COLUMN laterality TEXT`,
    `ALTER TABLE exercises ADD COLUMN difficulty INTEGER`,
    `ALTER TABLE exercises ADD COLUMN machine_ok INTEGER DEFAULT 0`,
    `ALTER TABLE exercises ADD COLUMN home_ok INTEGER DEFAULT 0`,
    `ALTER TABLE exercises ADD COLUMN cue TEXT`,
    `ALTER TABLE exercises ADD COLUMN equipment_profiles TEXT`,
  ],
  // Weekly steps average on the check-in. Mirrors cloud migration 058.
  // The persistent home for the week's steps figure the coach reads as a
  // secondary signal: when at least four days of daily_steps are registered
  // the check-in saves the auto average here; otherwise the user types a
  // single average on the check-in and that lands here. Additive + nullable,
  // so the frozen closed-test build is unaffected.
  [
    'ALTER TABLE weekly_checkins ADD COLUMN steps_avg INTEGER',
  ],
  // Corrective re-create of cardio_log. The original cardio_log block (above,
  // search "CREATE TABLE IF NOT EXISTS cardio_log") was added in the MIDDLE of
  // this array instead of appended. Installs that already sat at the array's
  // top version when the cardio build landed never reached the inserted index,
  // so runMigrations skipped it and the table was never created on those
  // devices: every cardio insert then failed with "no such table: cardio_log"
  // and sign-out's push-first sync errored on the same missing table, which
  // blocked sign-out. Reordering the original block is not allowed (shipped
  // migrations are append-only), so this fresh trailing migration creates the
  // table for any install already past the inserted index. Idempotent
  // (IF NOT EXISTS), so installs that did run the original block re-run this as
  // a no-op. See the cardio bug fix, 2026-06-03.
  [
    `CREATE TABLE IF NOT EXISTS cardio_log (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      activity_id TEXT,
      activity_name TEXT NOT NULL,
      category TEXT,
      duration_min INTEGER NOT NULL DEFAULT 0,
      intensity TEXT NOT NULL DEFAULT 'moderate',
      met REAL,
      est_kcal INTEGER,
      recovery_impact TEXT,
      impact_type TEXT,
      distance REAL,
      avg_hr INTEGER,
      source TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      PRIMARY KEY (user_id, id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cardio_log_user_date ON cardio_log(user_id, entry_date)`,
    `CREATE INDEX IF NOT EXISTS idx_cardio_log_user_updated ON cardio_log(user_id, updated_at)`,
  ],
  // Corrective re-apply of the exercise-library expansion. The SAME mid-array
  // insertion that skipped cardio_log (the original cardio_log block above) also
  // shifted the exercise-library expansion block (the 9 ALTER TABLE exercises
  // ADD COLUMN ... above) down by one index. An install that already sat at the
  // array's top version when the cardio build landed ran only the new final
  // index (steps_avg, a benign duplicate) and never reached the shifted
  // exercise-expansion block, so those 9 columns were never added. cardio_log
  // got a trailing corrective; this one did not, so upsertExercise / the
  // exercise backfill on those installs throws "table exercises has no column
  // named equipment_category". Reordering shipped migrations is not allowed, so
  // this fresh trailing migration re-applies the columns. Each ADD COLUMN is
  // duplicate-column-tolerant via isBenignMigrationError, so installs that did
  // run the original block re-run this as a no-op. See the migration-ordering
  // audit, 2026-06-03. Local-only: exercises are seeded locally, no cloud
  // counterpart.
  [
    `ALTER TABLE exercises ADD COLUMN equipment_category TEXT`,
    `ALTER TABLE exercises ADD COLUMN machine_type TEXT`,
    `ALTER TABLE exercises ADD COLUMN force TEXT`,
    `ALTER TABLE exercises ADD COLUMN laterality TEXT`,
    `ALTER TABLE exercises ADD COLUMN difficulty INTEGER`,
    `ALTER TABLE exercises ADD COLUMN machine_ok INTEGER DEFAULT 0`,
    `ALTER TABLE exercises ADD COLUMN home_ok INTEGER DEFAULT 0`,
    `ALTER TABLE exercises ADD COLUMN cue TEXT`,
    `ALTER TABLE exercises ADD COLUMN equipment_profiles TEXT`,
  ],
  // food_slot_recents: client-only memory of what's been logged to each meal
  // slot (COMP-002 "Add again" tab). One row per (user, slot, food) holding
  // how often and how much, so the picker's first tab shows this slot's
  // staples with the last-used portion pre-filled. Written on every food log,
  // never synced: derived/disposable data that rebuilds as the user logs, so
  // it sits outside the food_sync_pull/push cycle like food_frequents.
  [
    `CREATE TABLE IF NOT EXISTS food_slot_recents (
      user_id         TEXT NOT NULL,
      meal_slot       TEXT NOT NULL,
      food_ref        TEXT NOT NULL,
      log_count       INTEGER NOT NULL DEFAULT 1,
      last_logged_at  INTEGER NOT NULL,
      last_quantity_g REAL NOT NULL,
      PRIMARY KEY (user_id, meal_slot, food_ref)
    )`,
  ],
  // COMP-008 survey diet: pre-workout readiness capture. sleep_quality and
  // energy_score are captured on the pre-workout intent prompt and written to
  // the workout row at createWorkout time (soreness_24h_before already exists,
  // line 95, and is reused — no re-add). Both nullable: a Skip-started or
  // pre-COMP-008 session simply leaves them NULL, which every reader already
  // tolerates. Mirrors supabase/migrate_072_workouts_readiness_columns.sql;
  // additive + nullable, so the frozen old AAB that never writes them is
  // unaffected. Duplicate-column is tolerated by isBenignMigrationError.
  [
    'ALTER TABLE workouts ADD COLUMN sleep_quality INTEGER',
    'ALTER TABLE workouts ADD COLUMN energy_score INTEGER',
  ],
  // NEW-002 training partners: the local mirror the partner row reads (offline-
  // first — components never query Supabase). The pair-scoped sync handler
  // (src/lib/sync/tables/partners.js) populates these from cloud migration 081.
  // partner_blocks is a server-only write surface, not mirrored locally.
  [
    `CREATE TABLE IF NOT EXISTS partnerships (
      id             TEXT PRIMARY KEY NOT NULL,
      member_a       TEXT,
      member_b       TEXT,
      status         TEXT NOT NULL DEFAULT 'invited',
      streak_enabled INTEGER NOT NULL DEFAULT 1,
      created_at     INTEGER,
      accepted_at    INTEGER,
      ended_at       INTEGER,
      updated_at     INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS partner_week_signals (
      pair_id       TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      week_start    TEXT NOT NULL,
      planned_count INTEGER NOT NULL DEFAULT 0,
      done_count    INTEGER NOT NULL DEFAULT 0,
      week_met      INTEGER NOT NULL DEFAULT 0,
      state         TEXT NOT NULL DEFAULT 'training',
      updated_at    INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (pair_id, user_id, week_start)
    )`,
    `CREATE TABLE IF NOT EXISTS partner_cheers (
      id         TEXT PRIMARY KEY NOT NULL,
      pair_id    TEXT NOT NULL,
      sender_id  TEXT NOT NULL,
      sent_on    TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0
    )`,
  ],
  // Generated meal plan (deep-audit Theme G). One active plan per user,
  // stored as JSON like saved_meals: the assembled day/week, the prefs and
  // engine-target snapshot it was built from (so coach edits + swaps can
  // re-solve), and the seed. Soft-deleted for sync parity.
  [
    `CREATE TABLE IF NOT EXISTS meal_plans (
      id          TEXT PRIMARY KEY NOT NULL,
      user_id     TEXT NOT NULL,
      plan_json   TEXT NOT NULL,
      is_active   INTEGER NOT NULL DEFAULT 1,
      deleted_at  INTEGER,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_meal_plans_user_active ON meal_plans(user_id) WHERE deleted_at IS NULL AND is_active = 1',
  ],
  // Passive cardio import (ULTIMATE-CUX-PCI). ext_id holds the platform sample
  // id (HealthKit UUID / Health Connect record id) so re-running the import
  // never duplicates a session. Manual rows leave it NULL; the partial unique
  // index de-dups imported rows without constraining manual ones. Cloud parity:
  // supabase/migrate_087_cardio_log_ext_id.sql (apply separately, never from here).
  [
    'ALTER TABLE cardio_log ADD COLUMN ext_id TEXT',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_cardio_log_user_extid ON cardio_log(user_id, ext_id) WHERE ext_id IS NOT NULL',
  ],
  // Plan-vs-eaten separation (adherence model 2026-06-15): meal-plan entries are
  // written as scaffolding (is_planned=1) and EXCLUDED from the rollup,
  // adherence, the FFM floor and sync until the user confirms they ate them
  // (is_planned -> 0, which then syncs as a normal actual). Default 0 keeps every
  // existing and manually logged entry an actual. Local-only: planned rows never
  // leave the device, so no cloud migration is needed. Duplicate-column is
  // tolerated by isBenignMigrationError.
  [
    'ALTER TABLE food_entries ADD COLUMN is_planned INTEGER NOT NULL DEFAULT 0',
    'CREATE INDEX IF NOT EXISTS idx_food_entries_user_date_planned ON food_entries(user_id, entry_date, is_planned) WHERE deleted_at IS NULL',
  ],
  // Plan folders (Hevy teardown 02-routines-programs.md, R1 "Routine/plan
  // folders", P1). Organise the My Plans list (= programmes) into collapsible
  // folders. FREE feature, no Pro gate. Cloud parity:
  // supabase/migrate_089_plan_folders.sql. Timestamps are epoch ms (INTEGER) to
  // match the LWW sync contract; deleted_at carries a soft-delete tombstone for
  // sync parity. programmes.folder_id is nullable: deleting a folder UNFILES its
  // plans (folder_id -> NULL) and NEVER deletes a plan.
  [
    `CREATE TABLE IF NOT EXISTS plan_folders (
      id          TEXT PRIMARY KEY NOT NULL,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      deleted_at  INTEGER,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_plan_folders_user ON plan_folders(user_id, sort_order) WHERE deleted_at IS NULL',
    'ALTER TABLE programmes ADD COLUMN folder_id TEXT',
  ],
  // Food delete tombstones (Hevy teardown D1 #8). food_favourites and
  // daily_water had no deleted_at, so their deletes were device-local: removing
  // a favourite/water row never reached the cloud and re-pulled back from
  // another device. Add a soft-delete tombstone to both, matching the cloud
  // counterpart in supabase/migrate_090_food_delete_tombstones.sql. Deletes now
  // set deleted_at (see setFoodPreference / setWater) and normal reads exclude
  // tombstoned rows; the food sync slices carry a real `deleted` slice and apply
  // remote tombstones on pull. Additive + nullable: the frozen old AAB never
  // writes the column and reads as before. Duplicate-column is tolerated by
  // isBenignMigrationError.
  [
    'ALTER TABLE food_favourites ADD COLUMN deleted_at INTEGER',
    'ALTER TABLE daily_water ADD COLUMN deleted_at INTEGER',
  ],
  // Exercise TYPE axis (Hevy teardown 03-exercise-library.md, R3 "exerciseType",
  // P2). One logger handles reps-only / duration / distance / weighted-bodyweight
  // exercises, not only weight x reps. exercise_type drives which set-input
  // fields render; it does NOT change how a weight_reps row is stored or scored.
  // Default 'weight_reps' for every existing and new row keeps the weight x reps
  // path byte-identical. No new workout_sets columns: duration seconds reuse the
  // reps field and distance metres reuse the weight field (see SetEntry /
  // ActiveWorkoutScreen). Cloud parity: supabase/migrate_091_exercise_type.sql.
  // Additive + idempotent; duplicate-column is tolerated by isBenignMigrationError.
  [
    `ALTER TABLE exercises ADD COLUMN exercise_type TEXT DEFAULT 'weight_reps'`,
    `ALTER TABLE custom_exercises ADD COLUMN exercise_type TEXT DEFAULT 'weight_reps'`,
    `UPDATE exercises SET exercise_type = 'weight_reps' WHERE exercise_type IS NULL`,
    `UPDATE custom_exercises SET exercise_type = 'weight_reps' WHERE exercise_type IS NULL`,
  ],
  // E3 search (approved 2026-07-02): FTS5 name/brand index over foods +
  // custom_foods, replacing SQL LIKE as the local search's first attempt
  // (localCache.searchLocalByName; it falls back to LIKE if these tables are
  // absent). External-content tables: the index stores no food data of its
  // own and is FULLY reconstructible from the base tables at any time via
  // rebuildFoodSearchIndex(). Triggers keep it in step with every insert /
  // update / delete, including the bundled-snapshot seeding and library-delta
  // upserts. Additive and idempotent (IF NOT EXISTS throughout); wrapped in a
  // function op so a SQLite build without FTS5 skips the index entirely
  // instead of failing the migration chain — search then simply stays on
  // LIKE. FTS5 is compiled into the shipped SQLCipher build on both
  // platforms (verified 2026-07-02).
  [ensureFoodSearchIndex],
  // Wave 5 C5 A1: the pair-scoped shared training block (one row per pair;
  // block reference + display name + proposed|active — never plan content).
  // Local mirror of cloud migrate_100; the sync handler populates it and the
  // §5 purge paths (unpair, ended pair on pull, sign-out) clear it alongside
  // signals + cheers. Additive + idempotent.
  [
    `CREATE TABLE IF NOT EXISTS partner_shared_blocks (
      pair_id     TEXT PRIMARY KEY NOT NULL,
      block_ref   TEXT,
      block_name  TEXT NOT NULL,
      proposed_by TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'proposed',
      created_at  INTEGER,
      updated_at  INTEGER NOT NULL DEFAULT 0
    )`,
  ],
  // Partner STEP A milestone-moment booleans (brief Direction 1). Two derived
  // flags carried on the EXISTING weekly signal row: finished a block this week,
  // set a PB this week. Booleans only, never a number or content. Local mirror
  // of cloud migrate_102's additive columns; the sender's weekSignalWriter
  // derives them (forced false under the ED freeze), the pull applies them.
  // Plus the partner's real FIRST name (founder addition): the OTHER member's
  // server-snapshotted first name, mapped from the cloud row's
  // member_a/b_first_name at pull time, so every consumer's existing
  // pair.partnerFirstName read works with zero changes (legacy rows stay NULL
  // and the 'Your partner' fallback holds). First names only, never full names.
  // Additive + idempotent (duplicate-column is a benign migration error).
  [
    'ALTER TABLE partner_week_signals ADD COLUMN completed_block INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE partner_week_signals ADD COLUMN hit_pb INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE partnerships ADD COLUMN partner_first_name TEXT',
  ],
  // v54, progress-photo metadata (progress-photos upgrade B0). Purpose: give
  // each on-device progress photo an optional, editable metadata row keyed by
  // its existing `<epochMs>.jpg` filename — an editable "date taken", a
  // front/side/back pose, a bodyweight snapshot (nearest weigh-in to taken_at),
  // and a short note. A photo with no row still behaves exactly as today
  // (taken_at derived from the filename, pose/weight null), so this is fully
  // back-compatible with every existing photo.
  // Applied: LOCALLY only, once, via this user_version bump. There is NO cloud
  // counterpart — photos AND their metadata are device-local by constraint and
  // are deliberately NOT in SYNC_REGISTRY (they never leave the device).
  // Safe to re-run: yes (CREATE TABLE IF NOT EXISTS; a re-run is a benign no-op).
  // Rollback: DROP TABLE progress_photo_meta (data loss confined to this
  // on-device metadata; the photo files themselves are untouched).
  [
    `CREATE TABLE IF NOT EXISTS progress_photo_meta (
      name       TEXT PRIMARY KEY,
      taken_at   INTEGER NOT NULL,
      pose       TEXT,
      weight_kg  REAL,
      note       TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  ],
  // Partners D5 (A + B1): the mutual weekly intention + the cheer acknowledgement
  // enum. Local mirrors of cloud migrate_105 / migrate_106.
  //   partner_weekly_intentions  one row per (pair, member, week_start): the
  //     member's integer weekly session aim against their OWN plan. Derived-safe
  //     (a small integer, never raw training data). Both members write only their
  //     OWN row; the pull mirrors both sides so the PairCard can show each own aim
  //     without comparison. Purged alongside signals/cheers on every §5 path
  //     (unpair, ended pair on pull, sign-out, wipe).
  //   partner_cheers.kind  the sender's chosen acknowledgement key (closed enum,
  //     never free text). Nullable + DEFAULT 'here' (the quiet line) so old rows
  //     and the pre-106 edge function read as the neutral acknowledgement.
  // Additive + idempotent (duplicate-column / already-exists are benign).
  [
    `CREATE TABLE IF NOT EXISTS partner_weekly_intentions (
      pair_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      week_start TEXT NOT NULL,
      weekly_aim INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (pair_id, user_id, week_start)
    )`,
    `ALTER TABLE partner_cheers ADD COLUMN kind TEXT DEFAULT 'here'`,
  ],
  // Partner win cards: explicit, user-approved, pair-scoped celebration cards.
  // Sanitized text only: no raw workout sets/reps/load, food, coach notes, body
  // metrics, raw photos, image files or scan internals. Revocation is a
  // timestamp so both devices can hide the card without losing audit context.
  [
    `CREATE TABLE IF NOT EXISTS partner_win_cards (
      id                 TEXT PRIMARY KEY NOT NULL,
      pair_id            TEXT NOT NULL,
      sender_id          TEXT NOT NULL,
      card_type          TEXT NOT NULL,
      title              TEXT NOT NULL,
      summary            TEXT NOT NULL,
      detail             TEXT NOT NULL,
      visible_to_partner TEXT NOT NULL,
      remains_private    TEXT NOT NULL,
      created_at         INTEGER NOT NULL,
      revoked_at         INTEGER,
      updated_at         INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_partner_win_cards_pair ON partner_win_cards(pair_id, created_at)',
  ],
  // v56, Progress Scan foundation. Local-only, no cloud counterpart:
  //   1) rebuild progress_photo_meta as user-scoped so one account cannot read
  //      another account's photo metadata on a shared device;
  //   2) create scan-session tables for the flagship Progress Scan flow.
  // Raw photos, assets and analysis stay on-device and are deliberately NOT in
  // SYNC_REGISTRY.
  [
    migrateProgressPhotoMetaUserScope,
    `CREATE TABLE IF NOT EXISTS progress_scan_sessions (
      id                         TEXT PRIMARY KEY NOT NULL,
      user_id                    TEXT NOT NULL,
      captured_at                INTEGER NOT NULL,
      status                     TEXT NOT NULL DEFAULT 'draft',
      analysis_status            TEXT NOT NULL DEFAULT 'none',
      consent_version            TEXT,
      camera_facing              TEXT,
      timer_seconds              INTEGER NOT NULL DEFAULT 0,
      required_poses_complete    INTEGER NOT NULL DEFAULT 0,
      estimate_body_fat_percent  REAL,
      estimate_range_low         REAL,
      estimate_range_high        REAL,
      estimate_confidence        TEXT,
      estimate_source            TEXT,
      trend_direction            TEXT,
      trend_magnitude_pct_points REAL,
      quality_score              REAL,
      quality_label              TEXT,
      model_version              TEXT,
      estimator_version          TEXT,
      signals_json               TEXT,
      abstention_reasons_json    TEXT,
      bias_flags_json            TEXT,
      copy_summary               TEXT,
      created_at                 INTEGER NOT NULL,
      updated_at                 INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS progress_scan_assets (
      id                      TEXT PRIMARY KEY NOT NULL,
      scan_id                 TEXT NOT NULL,
      user_id                 TEXT NOT NULL,
      pose                    TEXT NOT NULL,
      photo_name              TEXT NOT NULL,
      uri                     TEXT NOT NULL,
      taken_at                INTEGER NOT NULL,
      quality_score           REAL,
      landmark_confidence     REAL,
      segmentation_confidence REAL,
      blur_score              REAL,
      lighting_score          REAL,
      framing_score           REAL,
      camera_tilt_degrees     REAL,
      created_at              INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_progress_photo_meta_user_taken ON progress_photo_meta(user_id, taken_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_progress_scan_sessions_user_time ON progress_scan_sessions(user_id, captured_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_progress_scan_assets_scan ON progress_scan_assets(scan_id, pose)',
  ],
  // v57, Progress Scan v1 on-device model signals. Each asset may carry the
  // local TFLite mask-derived measurements used to finish the scan session.
  // Still local-only and deliberately absent from SYNC_REGISTRY.
  [
    'ALTER TABLE progress_scan_assets ADD COLUMN signals_json TEXT',
  ],
  // v58, MN-1 micronutrients (audit §15 item 2, founder-approved 2026-07-08).
  // Additive, nullable REAL per-100g columns on foods + custom_foods for the 27
  // UK-NRV vitamins/minerals in src/lib/food/micronutrients.js. Existing rows
  // keep NULL (rendered "unknown", never 0). Cloud counterpart: migrate_109
  // (founder-run). Duplicate-column errors are tolerated by the runner.
  MICRO_COLUMNS.flatMap((c) => [
    `ALTER TABLE foods ADD COLUMN ${c} REAL`,
    `ALTER TABLE custom_foods ADD COLUMN ${c} REAL`,
  ]),
  // v59, progress-photos quick-add fence (progress-photos audit, scoring
  // blueprint §4 "uniform pipeline rule", founder gate F2 = tag route).
  // Purpose: a persistent, permanent origin marker on progress_photo_meta so
  // quick-add photos (camera/library routes in ProgressPhotosScreen.pickFrom)
  // can never be treated as scored-comparison material. Existing rows default
  // to 0 (not quick-add), which is correct back-compat: every photo saved
  // before this migration went through a route that is not the quick-add
  // fence's concern, and the fence only ever needs to SET this flag going
  // forward from pickFrom. Applied: LOCALLY only, once, via this
  // user_version bump. No cloud counterpart: progress_photo_meta is
  // device-local and deliberately NOT in SYNC_REGISTRY (see v54/v56 notes).
  // Safe to re-run: yes (duplicate-column errors are tolerated by the runner).
  // Rollback: ALTER TABLE progress_photo_meta DROP COLUMN unscored (SQLite
  // 3.35+; data loss confined to this on-device flag, photo files and the
  // rest of the metadata row are untouched).
  [
    'ALTER TABLE progress_photo_meta ADD COLUMN unscored INTEGER NOT NULL DEFAULT 0',
  ],
  // v60, L05-NT1 (design-usability audit 2026-07-09, founder "keep going on
  // all" + D5): persist the nutrition goal key and protein-approach choice on
  // the nutrition_targets row itself. Previously these two fields lived only
  // in an AsyncStorage copy written alongside the same save, so the rich "Why
  // these targets" explanation (phase description, protein-approach label)
  // silently degraded to blanks/defaults on a new device once the DB row
  // synced without the local AsyncStorage copy. Additive, nullable TEXT
  // columns; existing rows keep NULL (screen already falls back to inverting
  // the phase label / hardcoded default when null, so this is pure
  // data-portability, not a behaviour change). Cloud counterpart: migrate_111
  // (founder-run). Duplicate-column errors are tolerated by the runner.
  [
    'ALTER TABLE nutrition_targets ADD COLUMN goal TEXT',
    'ALTER TABLE nutrition_targets ADD COLUMN protein_approach TEXT',
  ],
  // v61, day-level plan reorder (Ultimate-Audit decision-gated item, verified
  // unbuilt: routines had no position column, so a plan's days/workouts could
  // never be reordered independently of routine_exercises.order_in_routine,
  // which only orders exercises WITHIN a day). Additive, nullable INTEGER
  // column. Backfill assigns each existing routine its current display rank
  // (0-based, restarting at 0 per programme_id) so an upgrading install's
  // day order is preserved exactly as shown today, matching the
  // `ORDER BY created_at ASC` fallback every plan-routines query already
  // uses. Cloud counterpart: migrate_113 (founder-run). Duplicate-column
  // errors are tolerated by the runner.
  // Safe to re-run: yes.
  // Rollback: ALTER TABLE routines DROP COLUMN position (SQLite 3.35+); every
  // read falls back to the created_at ordering that was in place before this
  // migration, so no behaviour is lost beyond the reorder feature itself.
  [
    'ALTER TABLE routines ADD COLUMN position INTEGER',
    async (d) => {
      const rows = await d.getAllAsync(
        `SELECT id, programme_id FROM routines
         WHERE position IS NULL
         ORDER BY programme_id IS NULL, programme_id, created_at ASC`,
      );
      const counters = new Map();
      for (const row of rows) {
        const key = row.programme_id ?? '';
        const next = counters.get(key) ?? 0;
        await d.runAsync('UPDATE routines SET position = ? WHERE id = ?', [next, row.id]);
        counters.set(key, next + 1);
      }
    },
  ],
  // v62, fix a muscle-taxonomy mistag on "Machine Shoulder Press" and generic
  // "Shoulder Press": migration v2 above (:419-422) bundled these two
  // front-delt-dominant overhead pushes into the side_delts UPDATE clause
  // alongside genuinely side-delt moves (Lateral Raise / Upright Row). Correct
  // is front_delts, matching Overhead Press / Military Press / Arnold Press /
  // Seated Dumbbell Press in the v2 front_delts clause. This corrupted both
  // superset pairing (planEngine's tier-2 compound->isolation rule treated a
  // front-delt press and a side-delt raise as "same muscle") and front/
  // side-delt weekly volume tracking system-wide. See
  // docs/exercise-planning-2026-07-09/plan-D-intelligent-supersets.md
  // section 1b (Option A/C, founder-confirmed).
  // v2 has already run on every device and is not safe to edit in place, so
  // this is a NEW, additive migration that re-corrects any row still holding
  // the wrong tag. Exactly scoped by exact name match so no other Shoulder
  // Press variant is touched (Dumbbell/Plate-Loaded/Half-Kneeling/Band
  // Shoulder Press and the "(Front Delt Focus)" variant are already
  // front_delts in seedExercises and are left untouched).
  // No cloud counterpart: the canonical exercise catalogue (user_id NULL
  // rows) is seeded locally per device and is never pushed to or pulled from
  // Supabase (src/lib/sync.js only pulls `exercises` rows scoped to
  // `user_id = <this user>`, i.e. legacy custom exercises); there is nothing
  // to correct in EU-Dublin for this fix.
  // Safe to re-run: yes (setting an already-correct row to the same value is
  // a no-op).
  // Rollback: UPDATE exercises SET primary_muscle = 'side_delts' WHERE name
  // IN ('Machine Shoulder Press', 'Shoulder Press') (restores the pre-fix
  // mistag; not recommended, kept only for the mandated rollback note).
  [
    `UPDATE exercises SET primary_muscle = 'front_delts'
     WHERE name IN ('Machine Shoulder Press', 'Shoulder Press')`,
  ],
  // v63, extend the v62 front-delt muscle-taxonomy correction to two more
  // exact-name matches that v62 deliberately left out of scope: "Viking
  // Press" and "Plate-Loaded Shoulder Press" (both overhead PUSHES,
  // front-delt dominant, matching Machine Shoulder Press / Overhead Press /
  // Military Press / Arnold Press / Seated Dumbbell Press). Same v2
  // taxonomy bug as v62 (the original side_delts UPDATE clause above,
  // :419-422), just a wider founder-approved retag landing after v62
  // shipped. Founder ruling: docs/ux-world-class-audit-2026-07-09/
  // DECISIONS-2026-07-09.md D14 Group A ("Viking Press + Plate-Loaded
  // Shoulder Press retag"). v62 is already shipped and not safe to edit in
  // place, so this is a NEW, additive, idempotent migration, exactly scoped
  // by name so no other Shoulder Press / delt variant is touched (every
  // other side_delts row -- the Lateral Raise family, Upright Row, Cable
  // Upright Row, Dumbbell Y-Raise -- is genuinely side-delt and stays put;
  // Dumbbell/Half-Kneeling/Band Shoulder Press and the "(Front Delt Focus)"
  // variant are already front_delts in seedExercises and are left alone).
  // Applied: LOCALLY only (no rows have run this yet), via this
  // user_version bump.
  // No cloud counterpart: the canonical exercise catalogue (user_id NULL
  // rows) is seeded locally per device and is never pushed to or pulled
  // from Supabase (src/lib/sync.js only pulls `exercises` rows scoped to
  // `user_id = <this user>`, i.e. legacy custom exercises); there is
  // nothing to correct in EU-Dublin for this fix.
  // Safe to re-run: yes (setting an already-correct row to the same value
  // is a no-op).
  // Rollback: UPDATE exercises SET primary_muscle = 'side_delts' WHERE name
  // IN ('Viking Press', 'Plate-Loaded Shoulder Press') (restores the
  // pre-fix mistag; not recommended, kept only for the mandated rollback
  // note).
  [
    `UPDATE exercises SET primary_muscle = 'front_delts'
     WHERE name IN ('Viking Press', 'Plate-Loaded Shoulder Press')`,
  ],
  // v64, biceps subregion tags (D8 residue fix, docs/ux-world-class-audit-
  // 2026-06-13.../_HANDOVER-AND-RESUME.md "SUBREGION_TRANSLATION.biceps
  // pass-through once library subregion tags exist"). D8 (2026-07-09) added
  // SUBREGION_REQUIREMENTS.biceps to planEngine.js (required: ['long_head',
  // 'short_head'], minSets 8) on the understanding that seedExercises.js
  // would tag biceps exercises with the same long_head/short_head/brachialis
  // vocab planEngine's hand-written POOL already used for biceps -- but the
  // seeded library carried NO biceps subregion tags at all, so the
  // requirement could never bind against the generated pool (every biceps
  // exercise fell through poolGenerator's DEFAULT_SUBREGION to 'short_head'
  // regardless of its real angle). seedExercises.js's SUBREGION_MAP now
  // tags all 36 canonical biceps exercises and poolGenerator.js's
  // SUBREGION_TRANSLATION.biceps passes those tags straight through; this
  // migration applies the same 36 tags to exercises already seeded on
  // existing installs (the seed early-returns once any rows exist, so a
  // SUBREGION_MAP change alone never reaches a device that seeded before
  // this landed).
  // Applied: LOCALLY only, via this user_version bump. There is no cloud
  // counterpart: the canonical exercise catalogue (user_id NULL rows) is
  // seeded locally per device and is never pushed to or pulled from Supabase
  // (src/lib/sync.js only pulls `exercises` rows scoped to `user_id = <this
  // user>`, i.e. legacy custom exercises); there is nothing to correct in
  // EU-Dublin for this fix. LIBRARY_VERSION_KEY's AsyncStorage top-up
  // (seedExercises.js topUpNewExercisesIfNeeded) does not apply here either:
  // it only inserts rows whose canonical ID is missing, and all 36 of these
  // rows already exist on every install, so a version bump there would be a
  // no-op -- this schema migration is the correct and only mechanism for a
  // metadata-only change to already-seeded rows (the same reasoning behind
  // backfillExerciseMetadataIfNeeded/rederiveExerciseMetadataIfNeeded above).
  // Safe to re-run: yes (setting an already-correct row to the same value is
  // a no-op; scoped by exact name AND primary_muscle = 'biceps' so it can
  // never touch a differently-tagged row of the same name in another
  // muscle).
  // Rollback: UPDATE exercises SET subregion = NULL WHERE primary_muscle =
  // 'biceps' (restores the pre-fix untagged state; not recommended, kept
  // only for the mandated rollback note).
  [
    `UPDATE exercises SET subregion = 'long_head'
     WHERE primary_muscle = 'biceps' AND name IN (
       'Incline Dumbbell Curl', 'Spider Curl', 'Prone Incline Curl',
       'Bayesian Curl', 'Lying Cable Curl', 'Barbell Drag Curl',
       'EZ Bar Drag Curl', 'Incline Hammer Curl', 'Chin-Up (Supinated)'
     )`,
    `UPDATE exercises SET subregion = 'short_head'
     WHERE primary_muscle = 'biceps' AND name IN (
       'Barbell Curl', 'EZ Bar Curl', 'Dumbbell Curl', 'Cable Curl',
       'Machine Curl', 'Concentration Curl', 'Preacher Curl (Barbell)',
       'Preacher Curl (Dumbbell)', 'Preacher Curl (EZ Bar)',
       'EZ Bar Preacher Curl', 'Plate-Loaded Preacher Curl',
       'Preacher Curl Machine', 'Cable Concentration Curl',
       'Zottman Preacher Curl', 'Waiter Curl', 'High Cable Curl',
       'Cable Overhead Bicep Curl', 'Seated Dumbbell Curl',
       'Band Bicep Curl', 'TRX Curl'
     )`,
    `UPDATE exercises SET subregion = 'brachialis'
     WHERE primary_muscle = 'biceps' AND name IN (
       'Hammer Curl', 'Cable Hammer Curl (Rope)', 'Cable Rope Hammer Curl',
       'Zottman Curl', 'Cross-Body Hammer Curl', 'Reverse Curl',
       'Cable Reverse Curl'
     )`,
  ],
];

async function migrateProgressPhotoMetaUserScope(d) {
  const cols = await d.getAllAsync('PRAGMA table_info(progress_photo_meta)').catch(() => []);
  if (!Array.isArray(cols) || cols.length === 0) {
    await d.execAsync(`CREATE TABLE IF NOT EXISTS progress_photo_meta (
      user_id    TEXT,
      name       TEXT NOT NULL,
      taken_at   INTEGER NOT NULL,
      pose       TEXT,
      weight_kg  REAL,
      note       TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, name)
    )`);
    return;
  }
  if (cols.some((c) => c?.name === 'user_id')) return;

  await d.execAsync('ALTER TABLE progress_photo_meta RENAME TO progress_photo_meta_legacy_v55');
  await d.execAsync(`CREATE TABLE IF NOT EXISTS progress_photo_meta (
    user_id    TEXT,
    name       TEXT NOT NULL,
    taken_at   INTEGER NOT NULL,
    pose       TEXT,
    weight_kg  REAL,
    note       TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, name)
  )`);
  await d.execAsync(`INSERT OR REPLACE INTO progress_photo_meta
      (user_id, name, taken_at, pose, weight_kg, note, created_at, updated_at)
    SELECT NULL, name, taken_at, pose, weight_kg, note, created_at, updated_at
      FROM progress_photo_meta_legacy_v55`);
  await d.execAsync('DROP TABLE progress_photo_meta_legacy_v55');
}

// E3 search: the FTS5 index DDL, exported as a named function so the
// migration test can drive the REAL statements against a real SQLite build
// (node:sqlite) instead of pinning a copy that could drift. Called exactly
// once by the migration entry above; safe to re-run (IF NOT EXISTS
// throughout).
export async function ensureFoodSearchIndex(d) {
      try {
        await d.execAsync(
          `CREATE VIRTUAL TABLE IF NOT EXISTS foods_fts USING fts5(
             name, brand,
             content='foods', content_rowid='rowid',
             tokenize='porter unicode61', prefix='2 3 4')`
        );
      } catch (e) {
        // Swallow ONLY a genuinely missing FTS5 module (search then stays on
        // LIKE forever, by design). Any OTHER failure here — disk full, I/O
        // error, locked DB — must rethrow so the migration does NOT mark this
        // version done and retries on the next launch (E3 review: the old
        // blanket catch made one transient error permanently silent).
        const msg = String(e?.message || e).toLowerCase();
        if (msg.includes('no such module') || msg.includes('fts5')) {
          logWarn('database.migration.fts', `FTS5 unavailable, search stays on LIKE: ${e?.message || e}`);
          return; // no index, no triggers; query-time fallback covers it
        }
        throw e;
      }
      await d.execAsync(
        `CREATE VIRTUAL TABLE IF NOT EXISTS custom_foods_fts USING fts5(
           name, brand,
           content='custom_foods', content_rowid='rowid',
           tokenize='porter unicode61', prefix='2 3 4')`
      );
      // External-content sync triggers (the canonical FTS5 pattern): 'delete'
      // commands remove the OLD row's tokens; plain inserts add the new ones.
      await d.execAsync(
        `CREATE TRIGGER IF NOT EXISTS trg_foods_fts_ai AFTER INSERT ON foods BEGIN
           INSERT INTO foods_fts(rowid, name, brand) VALUES (new.rowid, new.name, new.brand);
         END`
      );
      await d.execAsync(
        `CREATE TRIGGER IF NOT EXISTS trg_foods_fts_ad AFTER DELETE ON foods BEGIN
           INSERT INTO foods_fts(foods_fts, rowid, name, brand) VALUES ('delete', old.rowid, old.name, old.brand);
         END`
      );
      await d.execAsync(
        `CREATE TRIGGER IF NOT EXISTS trg_foods_fts_au AFTER UPDATE ON foods BEGIN
           INSERT INTO foods_fts(foods_fts, rowid, name, brand) VALUES ('delete', old.rowid, old.name, old.brand);
           INSERT INTO foods_fts(rowid, name, brand) VALUES (new.rowid, new.name, new.brand);
         END`
      );
      await d.execAsync(
        `CREATE TRIGGER IF NOT EXISTS trg_custom_foods_fts_ai AFTER INSERT ON custom_foods BEGIN
           INSERT INTO custom_foods_fts(rowid, name, brand) VALUES (new.rowid, new.name, new.brand);
         END`
      );
      await d.execAsync(
        `CREATE TRIGGER IF NOT EXISTS trg_custom_foods_fts_ad AFTER DELETE ON custom_foods BEGIN
           INSERT INTO custom_foods_fts(custom_foods_fts, rowid, name, brand) VALUES ('delete', old.rowid, old.name, old.brand);
         END`
      );
      await d.execAsync(
        `CREATE TRIGGER IF NOT EXISTS trg_custom_foods_fts_au AFTER UPDATE ON custom_foods BEGIN
           INSERT INTO custom_foods_fts(custom_foods_fts, rowid, name, brand) VALUES ('delete', old.rowid, old.name, old.brand);
           INSERT INTO custom_foods_fts(rowid, name, brand) VALUES (new.rowid, new.name, new.brand);
         END`
      );
      // One-time build over whatever the tables already hold (existing
      // installs carry the ~29k-row bundled corpus at this point; fresh
      // installs rebuild an empty index and the triggers index the seed).
      await d.execAsync(`INSERT INTO foods_fts(foods_fts) VALUES('rebuild')`);
      await d.execAsync(`INSERT INTO custom_foods_fts(custom_foods_fts) VALUES('rebuild')`);
}

// Errors that are safe to ignore when re-applying additive migrations on
// installs that pre-date version tracking (the column/table already exists).
function isBenignMigrationError(err) {
  const m = String(err?.message || err).toLowerCase();
  return m.includes('duplicate column')
    || m.includes('already exists')
    || m.includes('duplicate column name');
}

// Exported for the migration ordering regression test (cardio_log incident,
// 2026-06-03). Takes a database handle so the test can drive it with a fake.
export async function runMigrations(d) {
  let current = 0;
  try {
    const row = await d.getFirstAsync('PRAGMA user_version');
    current = row?.user_version ?? 0;
  } catch (_) { current = 0; }

  // COMP-009: take a byte-for-byte snapshot once, only when migrations are
  // actually pending, BEFORE the first op runs — so a failed migration is
  // recoverable from Settings. Pending-only because _doInit runs on every cold
  // start and snapshotting an unchanged DB each launch would copy a multi-MB
  // file for nothing. Fully best-effort: a snapshot (or checkpoint) failure
  // must NEVER block the migration, or a full disk could brick an update.
  if (current < SCHEMA_MIGRATIONS.length) {
    try {
      // Flush WAL so the copied file is a complete, consistent database.
      await d.execAsync('PRAGMA wal_checkpoint(FULL);');
    } catch (_) { /* checkpoint best-effort */ }
    try {
      // Lazy require keeps expo-file-system out of database.js's module graph
      // (and out of every test that imports the database module).
      // eslint-disable-next-line global-require
      const { snapshotBeforeMigration } = require('./dbSnapshot');
      await snapshotBeforeMigration(current, SCHEMA_MIGRATIONS.length);
    } catch (_) { /* snapshot best-effort */ }
  }

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
        // A genuine migration failure, surface it instead of silently
        // corrupting the schema and crashing later at an unrelated query.
        logWarn('database.migration', `migration v${v + 1} failed: ${e?.message || e}`);
        throw e;
      }
    }
    // PRAGMA does not accept bound params; v is an integer we control.
    await d.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
}

// E3 search: rebuild the FTS index from the base tables. The index is
// external-content (stores nothing of its own), so this is always safe and
// makes it fully reconstructible on demand — the required recovery path if
// the index ever drifts from foods/custom_foods (e.g. rows written while a
// pre-FTS app version ran alongside, or an interrupted restore). Returns
// false (never throws) when FTS5/the tables are unavailable.
export async function rebuildFoodSearchIndex() {
  try {
    const d = await db();
    await d.execAsync(`INSERT INTO foods_fts(foods_fts) VALUES('rebuild')`);
    await d.execAsync(`INSERT INTO custom_foods_fts(custom_foods_fts) VALUES('rebuild')`);
    return true;
  } catch (e) {
    logWarn('database.rebuildFoodSearchIndex', e?.message || String(e));
    return false;
  }
}

// Exported so peer modules (syncQueue.js) can grab the SQLite handle
// directly. Without this export, `import { db } from './database'` in
// syncQueue resolved to undefined and every `await db()` call there
// threw "undefined is not a function" on entry, the bug that made
// every drainSyncQueue invocation fail before processing any row.
export async function db() {
  // Gate on the in-flight init first (audit 2026-07-01 race): while _doInit runs,
  // _db is null and _initPromise resolves only once schema + migrations finish,
  // so awaiting it hands back a fully-ready handle rather than a half-open one.
  if (_initPromise) return _initPromise;
  return _db || initDatabase();
}

// Serialise every SQLite transaction through one queue.
//
// expo-sqlite's withTransactionAsync is explicitly NOT exclusive on the
// shared connection (its own docs: "not exclusive and can be interrupted by
// other async queries"). When two transaction blocks overlap on the single
// connection — e.g. plan generation (generateMesocycleWeeks) running while
// the offline-sync retry queue drains (syncQueue.js), which both fire during
// onboarding — SQLite rejects the second BEGIN with "cannot start a
// transaction within a transaction". That surfaced as plan setup failing
// with "NativeDatabase.execAsync has been rejected".
//
// runInTransaction chains transactions so only one BEGIN/COMMIT is ever in
// flight across the whole app (database, food, sync all route through here).
// A reentrancy guard runs the task inline if a transaction is somehow
// already open, so a task that itself calls runInTransaction cannot deadlock
// on the queue or nest a second BEGIN.
let _txTail = Promise.resolve();
export async function runInTransaction(d, task) {
  const inTx = () => typeof d.isInTransactionSync === 'function' && d.isInTransactionSync();
  if (inTx()) return task();
  const run = _txTail.then(() => (inTx() ? task() : d.withTransactionAsync(task)));
  // Keep the queue alive whatever this transaction's outcome.
  _txTail = run.then(() => {}, () => {});
  return run;
}

// ─── Exercises ───────────────────────────────────────────────────────────────────────────────────

// HP-9: the exercise library (~400 rows) is read on nearly every analysis
// screen, and it barely ever changes within a session. Cache the camelCased
// list in memory and serve it until an exercise write invalidates it. Every
// function that writes the exercises table calls _invalidateExercisesCache,
// so a created / edited / deleted / synced exercise shows up immediately;
// the cache is never stale. Callers treat the result as read-only (every
// current one only maps/filters it), so the shared reference is safe.
let _allExercisesCache = null;

export function _invalidateExercisesCache() {
  _allExercisesCache = null;
}

export async function getAllExercises() {
  if (_allExercisesCache) return _allExercisesCache;
  const d = await db();
  const rows = await d.getAllAsync('SELECT * FROM exercises ORDER BY name ASC');
  _allExercisesCache = rows.map(rowToCamel);
  return _allExercisesCache;
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
// name, see canonicalExerciseId() in seedExercises.js for the
// rationale.
export async function insertExerciseWithId(id, data) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `INSERT OR IGNORE INTO exercises
      (id, name, primary_muscle, secondary_muscles, equipment, movement_pattern,
       compound_isolation, default_rep_min, default_rep_max, fatigue_cost,
       stimulus_to_fatigue_ratio, subregion, is_custom, notes, created_at, updated_at,
       exercise_category, increment_kg,
       equipment_category, machine_type, force, laterality, difficulty,
       machine_ok, home_ok, cue, equipment_profiles, exercise_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.equipmentCategory ?? null,
      data.machineType ?? null,
      data.force ?? null,
      data.laterality ?? null,
      data.difficulty ?? null,
      data.machineOk ? 1 : 0,
      data.homeOk ? 1 : 0,
      data.cue ?? null,
      data.equipmentProfiles ? JSON.stringify(data.equipmentProfiles) : null,
      data.exerciseType ?? 'weight_reps',
    ],
  );
  _invalidateExercisesCache();
  return { id, ...data, createdAt: now, updatedAt: now };
}

export async function deleteExercise(id) {
  const d = await db();
  await d.runAsync('DELETE FROM exercises WHERE id = ? AND is_custom = 1', [id]);
  _invalidateExercisesCache();
  _scheduleSync();
}

// Update only the derived metadata columns on an exercise. Used by the
// one-time backfill that populates equipment_category and friends on
// installs whose canonical rows were seeded before those columns existed
// (docs/audit/volyume-exercise-audit-2026-05-30). Additive and idempotent:
// it overwrites the metadata columns and nothing else. equipment_profiles
// is stored as a JSON array string, matching insertExerciseWithId. Does not
// schedule a sync; canonical exercises are local and the columns don't sync.
export async function updateExerciseMetadata(id, meta) {
  const d = await db();
  await d.runAsync(
    `UPDATE exercises SET
       equipment_category = ?, machine_type = ?, force = ?, laterality = ?,
       difficulty = ?, machine_ok = ?, home_ok = ?, equipment_profiles = ?,
       updated_at = ?
     WHERE id = ?`,
    [
      meta.equipmentCategory ?? null,
      meta.machineType ?? null,
      meta.force ?? null,
      meta.laterality ?? null,
      meta.difficulty ?? null,
      meta.machineOk ? 1 : 0,
      meta.homeOk ? 1 : 0,
      meta.equipmentProfiles ? JSON.stringify(meta.equipmentProfiles) : null,
      Date.now(),
      id,
    ],
  );
  _invalidateExercisesCache();
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

// Workout History renders a bounded recent page. Keep this separate from
// getAllWorkouts because analytics, sync and coach flows still need full
// history reads.
export async function getRecentCompletedWorkouts(userId, limit = 50) {
  const parsedLimit = Number(limit);
  const safeLimit = Number.isFinite(parsedLimit) ? Math.max(0, Math.floor(parsedLimit)) : 50;
  if (!userId || safeLimit <= 0) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT w.*, r.name AS routine_name
     FROM workouts w
     LEFT JOIN routines r ON r.id = w.routine_id
     WHERE w.user_id = ? AND w.is_completed = 1
     ORDER BY COALESCE(w.ended_at, w.started_at, w.created_at) DESC
     LIMIT ?`,
    [userId, safeLimit],
  );
  return rows.map(rowToCamel);
}

export async function getWorkoutById(id) {
  const d = await db();
  const row = await d.getFirstAsync('SELECT * FROM workouts WHERE id = ?', [id]);
  return rowToCamel(row);
}

// LB-8: fire-and-forget engagement telemetry. Lazy-requires the transport
// (like food/db.js) so test environments that mock the DB don't pull in the
// supabase client, and so the opt-out gate in transport applies uniformly.
function _trackEvent(userId, event, payload) {
  if (!userId) return;
  try {
    // eslint-disable-next-line global-require
    const { track } = require('./engineTelemetry');
    track(userId, event, payload ?? null).catch(() => {});
  } catch (_) { /* tolerate test env without telemetry */ }
}

export async function createWorkout(
  userId,
  routineId = null,
  // COMP-008: the pre-workout intent prompt now also captures the three
  // walked-in-with readiness facts. soreness24hBefore is on the existing 1-3
  // scale (Fresh/Mild/Sore) the adaptive engine + computeRecoveryEMAs read;
  // sleepQuality/energyScore are on the 1-5 domain (the prompt offers 2/3/4).
  // All three are optional: a Skip start passes none and they stay NULL.
  { intent = null, soreness24hBefore = null, sleepQuality = null, energyScore = null } = {},
) {
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
    `INSERT INTO workouts (id, user_id, routine_id, mesocycle_id, mesocycle_week_id, started_at, is_completed, pre_workout_intent, soreness_24h_before, sleep_quality, energy_score, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
    [id, userId, routineId, mesocycleId, mesocycleWeekId, now, intent, soreness24hBefore, sleepQuality, energyScore, now, now],
  );
  // LB-8: a session was started. from_routine distinguishes plan-driven
  // starts from free/empty sessions; no training content in the payload.
  _trackEvent(userId, 'workout_started', { from_routine: !!routineId });
  return { id, userId, routineId, mesocycleId, mesocycleWeekId, startedAt: now, isCompleted: 0, preWorkoutIntent: intent, soreness24hBefore, sleepQuality, energyScore, createdAt: now, updatedAt: now };
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

// Hard-delete ANY workout and its sets (founder request 2026-06-12: remove a
// half-logged session, or start fresh, from Workout History). Local rows go
// immediately; every derived surface (streaks, weekly volume, PRs, lift
// progress) recomputes from local rows, so they self-heal on next view. The
// streak high-water deliberately never shrinks (retro-shrink guard) and
// already-seen milestones stay seen, both by design.
//
// The CLOUD copy is removed by sync.deleteWorkoutFromCloud (the caller pairs
// the two; on failure it enqueues a 'workout_delete' op) so a restore pull
// cannot resurrect the session. Scoped to the owning user as a guard against
// a stale id crossing accounts on a shared device.
export async function deleteWorkoutAndSets(userId, workoutId) {
  if (!userId || !workoutId) return false;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT id FROM workouts WHERE id = ? AND user_id = ?', [workoutId, userId],
  );
  if (!row) return false;
  await d.runAsync('DELETE FROM workout_sets WHERE workout_id = ?', [workoutId]);
  await d.runAsync('DELETE FROM workouts WHERE id = ?', [workoutId]);
  return true;
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

// Returns only sets from completed workouts, use for volume analytics.
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

// LB-7: a bounded recent window of sets, so the recent-window callers
// (Home block progress, the 28-day insights engine) pull a slice instead
// of the whole history. completedOnly mirrors the two prior call sites
// exactly: Home used getCompletedWorkoutSets (completed-workout sets),
// the insights engine used getAllWorkoutSets (every set, incl. an
// in-progress session) then filtered by created_at.
export async function getWorkoutSetsSince(userId, sinceMs, { completedOnly = true } = {}) {
  const d = await db();
  if (completedOnly) {
    const rows = await d.getAllAsync(
      `SELECT ws.* FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       WHERE ws.user_id = ? AND w.is_completed = 1 AND ws.created_at >= ?
       ORDER BY ws.created_at DESC`,
      [userId, sinceMs],
    );
    return rows.map(rowToCamel);
  }
  const rows = await d.getAllAsync(
    `SELECT * FROM workout_sets WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC`,
    [userId, sinceMs],
  );
  return rows.map(rowToCamel);
}

// LB-7: sets for a specific set of workout ids. The history list needs
// per-workout counts for only the page it shows (most recent 50), so it
// fetches those workouts' sets rather than every set ever logged.
export async function getWorkoutSetsForWorkoutIds(workoutIds) {
  if (!Array.isArray(workoutIds) || workoutIds.length === 0) return [];
  const d = await db();
  const placeholders = workoutIds.map(() => '?').join(',');
  const rows = await d.getAllAsync(
    `SELECT * FROM workout_sets WHERE workout_id IN (${placeholders}) ORDER BY created_at DESC`,
    workoutIds,
  );
  return rows.map(rowToCamel);
}

// Returns an array of `weeksBack` entries, ordered oldest → newest.
// Each entry: { weekLabel: 'W1'|...'W4', weekStart: ms, weekEnd: ms, volumeByMuscle: { chest: 8, ... } }
// Only working sets (set_type != 'warmup') are counted. Volume is allocated via
// allocateExerciseVolume across the exercise's PRIMARY and SECONDARY muscles
// (primary 1.0, each secondary 0.5), not primary_muscle alone.
export async function getWeeklyVolumeByMuscle(userId, weeksBack = 4, anchorMs = Date.now()) {
  const d = await db();
  // ALGO-001: the trailing windows anchor here. The default Date.now() keeps
  // the heatmap callers unchanged; the weekly check-in passes the END of its
  // Monday-anchored week (weekStartMs + 7d) so the week-over-week comparison
  // matches the week the user is actually submitting, not a rolling 7-day
  // window read off the wall clock. Index 0 = oldest week, last = most recent.
  const now = Number.isFinite(anchorMs) ? anchorMs : Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const weekBoundaries = weekWindowsEndingAt(now, weeksBack);

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

  // Build exercise_id → exercise row map. Carry secondary_muscles too so this
  // trend path uses the SAME allocation as the heatmap tiles
  // (allocateExerciseVolume): primary 1.0 + each secondary 0.5. Previously
  // this counted the primary only, so the trend and the tile disagreed for
  // the same week (the headline volume-audit defect, P1.1).
  const exerciseRows = await d.getAllAsync(
    'SELECT id, primary_muscle, secondary_muscles FROM exercises',
  );
  const exerciseById = {};
  for (const ex of exerciseRows) exerciseById[ex.id] = ex;

  // Bucket each set into the correct week and credit each trained muscle.
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
    const ex = exerciseById[row.exercise_id];
    if (!ex) continue;
    const vbm = result[weekIdx].volumeByMuscle;
    for (const { muscle, sets } of allocateExerciseVolume(ex)) {
      if (!muscle) continue;
      vbm[muscle] = (vbm[muscle] || 0) + sets;
    }
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
 * L07-F7 (design-usability-audit-2026-07-09): the exercise picker's "recents"
 * row. Returns exercise ids ordered by the most recent COMPLETED workout that
 * logged a working set on that exercise, most recent first, deduped, capped
 * at `limit`. Warm-up sets are excluded so the row reflects what the user
 * actually trained, matching getLastTrainedByMuscle's own filter.
 */
export async function getRecentlyUsedExerciseIds(userId, limit = 8) {
  const d = await db();
  const rows = await d.getAllAsync(`
    SELECT s.exercise_id AS exerciseId, MAX(w.started_at) AS last_session_ms
    FROM workout_sets s
    JOIN workouts w ON w.id = s.workout_id
    WHERE w.user_id = ?
      AND w.is_completed = 1
      AND s.set_type != 'warmup'
    GROUP BY s.exercise_id
    ORDER BY last_session_ms DESC
    LIMIT ?
  `, [userId, limit]);
  return rows.map(r => r.exerciseId);
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

  // Fetch hard sets from last 5 weeks.
  // distance/duration exercises reuse the weight column (metres) / reps column
  // (seconds); they must never enter a load (weight*reps) sum or they pollute
  // the ACWR. LEFT JOINs keep unknown/unmatched exercises as weight_reps so
  // ordinary lifting tonnage is unchanged.
  const fiveWeeksAgo = now - 35 * MS_DAY;
  const rows = await d.getAllAsync(`
    SELECT s.weight, s.actual_reps AS reps, w.started_at
    FROM workout_sets s
    JOIN workouts w ON w.id = s.workout_id
    LEFT JOIN exercises e ON e.id = s.exercise_id
    LEFT JOIN custom_exercises ce ON ce.id = s.exercise_id AND ce.user_id = s.user_id
    WHERE w.user_id = ?
      AND w.is_completed = 1
      AND s.set_type != 'warmup'
      AND s.weight > 0
      AND s.actual_reps > 0
      AND w.started_at >= ?
      AND COALESCE(ce.exercise_type, e.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')
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
 * warm-up sets, they don't count towards "working tonnage" and including
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
       failed, notes, is_amrap, amrap_reps, left_reps, right_reps, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.leftReps ?? null,
      data.rightReps ?? null,
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

// Edit an already-logged set in place (Hevy-parity: fix a mistyped set without
// leaving the session). Only the fields actually passed are written, each is
// mapped to its column; updated_at is bumped so the per-set upsert ships the
// correction on the next push. No-op when nothing editable was supplied.
const _SET_EDIT_COLUMNS = {
  weight: 'weight',
  actualReps: 'actual_reps',
  rir: 'rir',
  rpe: 'rpe',
  setType: 'set_type',
  notes: 'notes',
  failed: 'failed',
  leftReps: 'left_reps',
  rightReps: 'right_reps',
};
export async function updateWorkoutSet(setId, fields = {}) {
  if (!setId) return;
  const sets = [];
  const vals = [];
  for (const [key, col] of Object.entries(_SET_EDIT_COLUMNS)) {
    if (fields[key] === undefined) continue;
    let v = fields[key];
    if (key === 'failed') v = v ? 1 : 0;
    else if (key === 'weight' || key === 'actualReps') v = v ?? 0;
    else v = v ?? null;
    sets.push(`${col} = ?`);
    vals.push(v);
  }
  if (!sets.length) return;
  sets.push('updated_at = ?');
  vals.push(Date.now());
  vals.push(setId);
  const d = await db();
  await d.runAsync(`UPDATE workout_sets SET ${sets.join(', ')} WHERE id = ?`, vals);
}

// Hard-delete a single logged set (Hevy-parity: remove a fat-fingered set
// mid-session). Mirrors deleteWorkoutAndSets: local row goes immediately and
// every derived surface (tonnage, PRs, lift progress) recomputes from local
// rows. Scoped to the owning user as a stale-id / shared-device guard. The
// CLOUD copy is removed by sync.deleteWorkoutSetFromCloud — the caller pairs the
// two and enqueues a 'workout_set_delete' op on failure so a restore pull cannot
// resurrect the set. workout_sets is hard-deleted (not tombstoned) exactly like
// whole-workout deletes, so the deleted_at column stays unused for these rows.
export async function deleteWorkoutSet(userId, setId) {
  if (!userId || !setId) return false;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT id FROM workout_sets WHERE id = ? AND user_id = ?', [setId, userId],
  );
  if (!row) return false;
  await d.runAsync('DELETE FROM workout_sets WHERE id = ? AND user_id = ?', [setId, userId]);
  return true;
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
  // Day-level plan reorder: append after this plan's current last day (or
  // the templates pool when programmeId is null) so a freshly added routine
  // never collides with an existing position.
  const maxRow = programmeId
    ? await d.getFirstAsync('SELECT MAX(position) as maxPos FROM routines WHERE programme_id = ?', [programmeId])
    : await d.getFirstAsync('SELECT MAX(position) as maxPos FROM routines WHERE programme_id IS NULL');
  const position = (maxRow?.maxPos ?? -1) + 1;
  await d.runAsync(
    `INSERT INTO routines (id, user_id, name, description, split_type, is_active, is_library, is_sample, source_routine_id, programme_id, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, name, description, splitType, isLibrary, isSampleInt, sourceRoutineId, programmeId, position, now, now],
  );
  _scheduleSync();
  return { id, userId, name, description, splitType, isActive: 1, isLibrary, isSample: isSampleInt, sourceRoutineId, programmeId, position, createdAt: now, updatedAt: now };
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
 * IDs. They can't be opened in ActiveWorkout meaningfully, the
 * INNER JOIN returns zero rows. The user's only path forward is to
 * either re-link each exercise manually OR delete the routine.
 *
 * Returns an array of { id, name, exerciseCount, programmeId } so the
 * cleanup UI can show the user what's about to be removed before they
 * confirm. exerciseCount is the TOTAL count in routine_exercises; all
 * of those are unresolved (otherwise the routine isn't fully
 * orphaned and shouldn't appear in the cleanup list).
 *
 * A routine with zero routine_exercises is NOT orphaned, that's just
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
 * requires a matching routine row owned by the same user, every
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

// ─── Plan Folders ─────────────────────────────────────────────────────────────────────────────────────────
// Organise the My Plans list (= programmes) into collapsible folders. FREE
// feature (organisation of a free feature), NO Pro gate. Cloud parity:
// supabase/migrate_089_plan_folders.sql. A folder NEVER owns a plan's
// lifecycle: deleting a folder UNFILES its plans (folder_id -> null) and never
// deletes a plan.

export async function getPlanFolders(userId) {
  return planFoldersRepository.getPlanFolders(userId);
}

export async function createPlanFolder(userId, name) {
  return planFoldersRepository.createPlanFolder(userId, name);
}

export async function renamePlanFolder(folderId, name) {
  return planFoldersRepository.renamePlanFolder(folderId, name);
}

// Deleting a folder UNFILES its plans (programmes.folder_id -> NULL) and tombstones
// the folder. The plans themselves are NEVER touched beyond clearing folder_id.
export async function deletePlanFolder(folderId) {
  return planFoldersRepository.deletePlanFolder(folderId);
}

// Move a plan into a folder, or out of any folder when folderId is null.
export async function setPlanFolder(planId, folderId) {
  return planFoldersRepository.setPlanFolder(planId, folderId);
}

// Sync helpers (mirror the cardio_log contract). Push window keeps the batch
// small; soft-deleted rows are included so a folder deletion propagates.
export async function getPlanFoldersForPush(userId) {
  return planFoldersRepository.getPlanFoldersForPush(userId);
}

export async function getPlanFolderUpdatedAt(userId, id) {
  return planFoldersRepository.getPlanFolderUpdatedAt(userId, id);
}

export async function insertPlanFolderFromCloud(userId, f) {
  return planFoldersRepository.insertPlanFolderFromCloud(userId, f);
}

// ─── Routine Exercises ────────────────────────────────────────────────────────────────────────────────────

export async function getRoutineExercisesWithDetails(routineId) {
  const d = await db();
  // LEFT JOIN, a routine_exercise whose exercise_id doesn't resolve to
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
            e.stimulus_to_fatigue_ratio,
            e.equipment_category,
            e.laterality
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
      // When the FK didn't resolve these are all null, coach insights
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
      // plan-D builder nudge (docs/exercise-planning-2026-07-09/
      // plan-D-intelligent-supersets.md): ManualBuilderScreen needs this to
      // classify a superset pair the same way the auto-gen engine does.
      equipmentCategory: row.equipment_category,
      // D9 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md):
      // 'bilateral' | 'unilateral', derived by exerciseMetadata.js's
      // deriveLaterality and stored on the exercise at insert/update time.
      // Previously computed and never read anywhere; ActiveWorkoutScreen
      // reads it to suggest per-side logging.
      laterality: row.laterality,
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

// Sum of the actual prescribed working sets per routine (recommended_sets,
// which defaults to 3 where unset). Used for an honest "sets/week" estimate
// rather than assuming a flat 3 sets per exercise.
export async function getAllRoutineSetCounts() {
  const d = await db();
  const rows = await d.getAllAsync('SELECT routine_id, SUM(COALESCE(recommended_sets, 3)) as total FROM routine_exercises GROUP BY routine_id');
  return Object.fromEntries(rows.map(r => [r.routine_id, r.total]));
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
  // Atomic, was N+1 individual inserts; an interruption used to leave a
  // routine row pointing at no exercises (or partial), which the UI
  // couldn't recover and the user couldn't see.
  await runInTransaction(d, async () => {
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

// Day-level plan reorder: persists a routine's position among its plan's
// other days (or the templates pool when it has no programme_id). Mirrors
// updateRoutineExerciseOrder above, one level up the hierarchy.
export async function updateRoutinePosition(id, newPosition) {
  const d = await db();
  await d.runAsync(
    'UPDATE routines SET position = ?, updated_at = ? WHERE id = ?',
    [newPosition, Date.now(), id],
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
    // LB-8: a plan was activated (onboarding success / re-engagement). Only
    // on a real activation, not the planId=null deactivate-all path.
    _trackEvent(userId, 'plan_activated', null);
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

  // C12: refresh the weekly training reminders so their copy names the plan
  // that just became active. Read the name back from the persisted active plan
  // (not the raw planName arg, which above labels the mesocycle) so the push can
  // never name anything other than the plan the Train tab shows. Best-effort and
  // self-gating (the scheduler no-ops when reminders are off or permission is
  // absent); a lazy require keeps the data layer free of a static notifications
  // dependency, and every path here leaves plan activation itself unaffected.
  try {
    const activeForReminder = await getActivePlan(userId).catch(() => null);
    // eslint-disable-next-line global-require
    require('./notifications/trainingReminders')
      .scheduleTrainingReminders(activeForReminder?.name)
      .catch(() => {});
  } catch (_) { /* notifications layer unavailable -- reminders refresh on next schedule */ }

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
  // Day-level plan reorder: order by the user-set position when present;
  // rows that predate the migration (or arrived via an older cloud payload
  // without the column) sort last, keeping their prior created_at order.
  const rows = await d.getAllAsync(
    `SELECT * FROM routines WHERE programme_id = ? AND (is_active = 1 OR is_active IS NULL)
     ORDER BY (position IS NULL), position ASC, created_at ASC`,
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
    `SELECT * FROM routines WHERE programme_id = ? AND (is_active = 1 OR is_active IS NULL)
     ORDER BY (position IS NULL), position ASC, created_at ASC`,
    [libraryPlanId],
  );

  for (let i = 0; i < libRoutineRows.length; i++) {
    const libRoutine = rowToCamel(libRoutineRows[i]);
    const newRoutine = await duplicateRoutine(libRoutine.id, userId, libRoutine.name);
    // Day order carries over from the library plan (loop index, not the
    // position createRoutine assigned while the copy briefly had no
    // programme_id).
    await d.runAsync(
      'UPDATE routines SET programme_id = ?, is_library = 0, source_routine_id = ?, is_template = 0, position = ? WHERE id = ?',
      [newPlan.id, libRoutine.id, i, newRoutine.id],
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
    `SELECT * FROM routines WHERE programme_id = ? AND (is_active = 1 OR is_active IS NULL)
     ORDER BY (position IS NULL), position ASC, created_at ASC`,
    [planId],
  );

  for (let i = 0; i < routineRows.length; i++) {
    const routine = rowToCamel(routineRows[i]);
    const newRoutine = await duplicateRoutine(routine.id, userId, routine.name);
    // Day order carries over from the source plan (loop index), not the
    // position createRoutine assigned while the copy briefly had no
    // programme_id.
    await d.runAsync(
      'UPDATE routines SET programme_id = ?, is_library = 0, position = ? WHERE id = ?',
      [newPlan.id, i, newRoutine.id],
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
  // with a partial week list (and so the writes commit atomically, much
  // faster than N round trips even on success).
  await runInTransaction(d, async () => {
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

    // Find the week linked to the most recent workout, that's the current week
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

// Flip a mesocycle week to a deload (recovery) week. Used by the weekly
// coach's confirm-then-apply early-deload (CoachOutputScreen): when the
// user applies it, next week becomes a recovery week. is_deload drives
// the deload prescription in ActiveWorkoutScreen; rir_target moves to the
// deload value (4) to match how generateMesocycleWeeks seeds the
// scheduled recovery week. is_deload is in the cloud push payload, so the
// flag syncs; the planned-volume cut to the floor is written separately
// by the caller via upsertPlannedMuscleVolume.
export async function setMesocycleWeekDeload(weekId, { isDeload = true, rirTarget = 4 } = {}) {
  if (!weekId) return;
  const d = await db();
  await d.runAsync(
    'UPDATE mesocycle_weeks SET is_deload = ?, rir_target = ?, updated_at = ? WHERE id = ?',
    [isDeload ? 1 : 0, rirTarget, Date.now(), weekId],
  );
  _scheduleSync();
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

    await runInTransaction(d, async () => {
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
        gdpr_consented=?, goal=?, protein_approach=?, updated_at=?
       WHERE user_id=?`,
      [
        targets.bmr ?? null, targets.tdee ?? null, targets.targetKcal ?? null,
        targets.proteinG ?? null, targets.carbsG ?? null, targets.fatG ?? null,
        targets.phase ?? null, targets.bmrMethod ?? null, targets.activityLevel ?? null,
        targets.confidence ?? null,
        targets.warnings ? JSON.stringify(targets.warnings) : null,
        targets.gdprConsented ? 1 : 0,
        targets.goal ?? null, targets.proteinApproach ?? null,
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
       phase, bmr_method, activity_level, confidence, warnings, gdpr_consented,
       goal, protein_approach, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId,
      targets.bmr ?? null, targets.tdee ?? null, targets.targetKcal ?? null,
      targets.proteinG ?? null, targets.carbsG ?? null, targets.fatG ?? null,
      targets.phase ?? null, targets.bmrMethod ?? null, targets.activityLevel ?? null,
      targets.confidence ?? null,
      targets.warnings ? JSON.stringify(targets.warnings) : null,
      targets.gdprConsented ? 1 : 0,
      targets.goal ?? null, targets.proteinApproach ?? null, now, now,
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
  return bodyMetricsRepository.logBodyMetric(userId, data);
}

export async function getBodyMetricLog(userId, limitRows = 90) {
  return bodyMetricsRepository.getBodyMetricLog(userId, limitRows);
}

export async function getLatestBodyWeight(userId) {
  // No onboarding fallback: onboarding bodyweight lives in AsyncStorage
  // userProfile.weightKg, not a body-weight table.
  return bodyMetricsRepository.getLatestBodyWeight(userId);
}

// Nearest logged bodyweight to an arbitrary instant `t` (epoch ms), across BOTH
// body_metric_log and morning_weights. Used to snapshot a bodyweight beside a
// progress photo at its taken_at (progress-photos upgrade). Unlike
// getLatestBodyWeight (latest overall), this finds the weigh-in closest to `t`:
// the most recent one on-or-before `t` is preferred (the weight the user was at
// when the photo was taken); only if the photo predates every weigh-in do we
// fall back to the nearest one overall (the earliest recorded). Returns
// { weightKg, loggedAt } or null when the user has no logged weigh-in.
export async function getBodyWeightNearestTo(userId, t) {
  return bodyMetricsRepository.getBodyWeightNearestTo(userId, t);
}

// Most recent logged body composition that actually carries a body fat figure.
// Used by the plan-update and nutrition-target flows to recover BF% + method for
// users who onboarded before the profile started persisting them, so the BMR
// formula (Katch-McArdle when a credible BF% exists) stays consistent across
// onboarding, Update Your Plan and the manual recalc. Read-only, returns null
// when the user has never logged a body fat reading.
export async function getLatestBodyComposition(userId) {
  return bodyMetricsRepository.getLatestBodyComposition(userId);
}

// ─── CSV / JSON export ────────────────────────────────────────────

function csvEscape(value) {
  if (value == null) return '';
  let s = String(value);
  // Neutralise spreadsheet formula injection: a cell that begins with =, +, -,
  // @, tab or carriage return can be run as a formula by Excel / Google Sheets.
  // A workout note is free text, so it is the most likely carrier. Prefix it
  // with a single quote so it is treated as plain text. (A2-060.)
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
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
    // Local date + time, not UTC. A set logged at 00:30 BST belongs to the
    // user's "today", not yesterday 23:30 (locked rule: every date the user
    // sees is their local calendar day).
    const date = dt ? localDayKey(r.set_created_at) : '';
    const time = dt
      ? `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`
      : '';
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
  // condition that has resolved, or a rule that no longer applies after a
  // logic fix, stops showing instead of lingering forever. Dismissed rows
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
    // LB-7: pull only the 28-day window the engine uses, in SQL, instead
    // of loading every set ever logged and filtering in JS. completedOnly
    // false keeps the prior getAllWorkoutSets semantics (all sets, incl.
    // an in-progress session) so the output is unchanged.
    const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const [workouts, recentSets, exercises] = await Promise.all([
      getAllWorkouts(userId),
      getWorkoutSetsSince(userId, cutoff, { completedOnly: false }),
      getAllExercises(),
    ]);
    const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));
    const insights = generateInsights({
      workouts, sets: recentSets, exerciseMap, now: Date.now(),
    });
    await persistInsights(userId, insights);
    return getActiveInsights(userId, 3);
  } catch (e) {
    logWarn('database.runInsightsEngine', e?.message);
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
  // Atomic, was two separate runAsync calls; an interruption between
  // them would orphan workout rows whose sets had already been deleted.
  await runInTransaction(d, async () => {
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
//
// The direct-user_id table set lives here (exported) so the regression test
// can assert it. The food tables were added 2026-05-29 (audit Phase 2,
// finding A4): they were previously omitted, so on a shared device the next
// user could read the prior user's cached food log, recipes, and water until
// a pull overwrote them.
export const WIPE_DIRECT_TABLES = [
  'workout_sets', 'workouts',
  'routines', 'programmes', 'mesocycles',
  'morning_weights', 'weekly_checkins', 'coach_outputs',
  'nutrition_targets', 'peak_week_plans',
  'body_metric_log', 'user_insights', 'user_body_profile',
  'exercise_user_notes', 'exercise_goals', 'workout_notes',
  'custom_exercises',
  // queue table from v16: wipe so a deleted user has no orphan ops shipping.
  'pending_sync_ops',
  // Sync-mirror tables (migration v19): wipe so the next account on this
  // device does not inherit orphan rows tagged with the deleted user's id.
  'workout_notes_v2', 'planned_muscle_volume_sync', 'adaptation_events_sync',
  // SQLite mirror of cloud migration 044 (Codex re-audit 2026-05-26 #3):
  // without this a sign-out left notification prefs visible to the next user.
  'notification_preferences',
  // Food domain (audit Phase 2, finding A4). All carry user_id locally.
  'food_entries', 'custom_foods', 'saved_meals',
  'recipes', 'recipe_ingredients',
  'daily_water', 'food_favourites', 'daily_intake_rollups',
  'food_frequents',
  // Generated meal plan (deep-audit Theme G): carries user_id + a calorie-
  // target snapshot (health data) — must never survive sign-out/delete.
  'meal_plans',
  // Activity store (cardio/steps audit). Carries user_id locally; wipe so
  // the next account on a shared device never inherits a step history.
  'daily_steps',
  // Locked decision 2 (IDENTITY_AND_OWNERSHIP_LOCKED.md): sign-out wipes
  // EVERY user-scoped table. These four each carry a user_id column and were
  // missing from the set, so they survived sign-out, the cross-user safety
  // net, and account-delete. ed_pattern_flags is eating-disorder pattern
  // state and engine_telemetry leftover rows could ship under the next
  // account, so the omission was a real ownership leak, not cosmetic.
  'cardio_log', 'ed_pattern_flags', 'tier_history', 'engine_telemetry',
  // audit 2026-07-01: both carry a user_id column locally and were missing, so
  // they survived sign-out / account-delete / the cross-user switch — the next
  // account on a shared device inherited the prior user's plan folders and
  // per-slot food-logging memory. plan_folders (migration 089) and
  // food_slot_recents (client-only) both DELETE cleanly by user_id.
  'plan_folders', 'food_slot_recents',
  'progress_photo_meta', 'progress_scan_sessions', 'progress_scan_assets',
];

export const FATAL_LOCAL_WIPE_TABLES = new Set([
  'progress_photo_meta',
  'progress_scan_sessions',
  'progress_scan_assets',
]);

export async function wipeAllUserData(userId) {
  if (!userId) return;
  const d = await db();

  // Direct-user_id tables (the exported set above), each wiped by
  // DELETE ... WHERE user_id = ?. A missing table on an older schema is
  // tolerated by the per-table try/catch in the loop below.
  const directTables = WIPE_DIRECT_TABLES;

  // Tables that DON'T have user_id and must be wiped through a parent FK.
  // routine_exercises   → keys off routine_id     → routines.user_id
  // mesocycle_weeks     → keys off mesocycle_id   → mesocycles.user_id
  // planned_muscle_volume → keys off mesocycle_week_id → mesocycle_weeks → mesocycles.user_id
  // adaptation_events   → keys off mesocycle_week_id → same chain
  //
  // Order matters: deepest child first so each step's FK target still
  // exists when we delete it.
  await runInTransaction(d, async () => {
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
        if (FATAL_LOCAL_WIPE_TABLES.has(table)) throw e;
      }
    }

    try {
      await d.runAsync('DELETE FROM progress_photo_meta WHERE user_id IS NULL');
    } catch (e) {
      logError('database.wipeAllUserData.progress_photo_meta_legacy', e, { userId });
      throw e;
    }

    try {
      // Lazy require keeps expo-file-system out of database.js's module graph.
      // Per-user scope (founder decision 2026-07-09): wipe ONLY this account's
      // photo subfolder, never the whole progress_photos/ tree, so a second
      // account on a shared device keeps its photos after this account is
      // wiped (evidence-gaps §7 Q5; safety-privacy-blueprint.md §6.4).
      // eslint-disable-next-line global-require
      await require('./progressPhotos').wipeProgressPhotoDirectoryForUser(userId);
    } catch (e) {
      logError('database.wipeAllUserData.progress_photo_files', e, { userId });
      throw e;
    }

    try {
      // SQLite snapshots are byte-for-byte DB copies. Purge them on user
      // boundary changes so local-only scan/photo rows cannot survive in a
      // retained pre-wipe snapshot.
      // eslint-disable-next-line global-require
      await require('./dbSnapshot').purgeSnapshots();
    } catch (e) {
      logError('database.wipeAllUserData.snapshots', e, { userId });
      throw e;
    }

    // 6. Custom exercises. Canonical seed exercises are shared library data
    // and aren't keyed per user, so leave them. is_custom = 1 means
    // user-added, wipe those.
    try {
      await d.runAsync('DELETE FROM exercises WHERE is_custom = 1');
    } catch (e) {
      logError('database.wipeAllUserData.exercises', e, { userId });
    }
    _invalidateExercisesCache();

    // 7. NEW-002 partner mirror. Local SQLite is single-user, so a flat wipe of
    //    all partner rows is correct on sign-out (partnerships/cheers aren't
    //    user_id-keyed). The cloud copy is intact; it re-pulls on next sign-in.
    //    partner_shared_blocks is wiped here too so this path matches
    //    clearLocalPartners exactly (A1 s8.5: the two wipe paths must clear the
    //    SAME partner tables; shared blocks + intentions must not be left behind).
    try {
      await d.runAsync('DELETE FROM partner_cheers');
      await d.runAsync('DELETE FROM partner_week_signals');
      await d.runAsync('DELETE FROM partner_shared_blocks');
      await d.runAsync('DELETE FROM partner_weekly_intentions');
      await d.runAsync('DELETE FROM partner_win_cards');
      await d.runAsync('DELETE FROM partnerships');
    } catch (e) {
      logError('database.wipeAllUserData.partners', e, { userId });
    }

    // 8. Rebuild the custom-foods search index from the (now wiped) base
    // table (E3 review). SQLite reuses freed rowids, so any tokens left in
    // custom_foods_fts after the DELETEs above could otherwise attach to the
    // NEXT account's rows and surface the previous user's custom food names
    // in their search results. Best-effort: absent on a pre-FTS install.
    try {
      await d.execAsync(`INSERT INTO custom_foods_fts(custom_foods_fts) VALUES('rebuild')`);
    } catch (_) { /* no FTS index on this install */ }
  });
}

// ─── Full local backup / restore ────────────────────────────────────────────
//
// Every user-owned table. The `exercises` table is intentionally excluded: its
// canonical rows are seed data, re-seeded on launch, so dumping ~150 of them
// would only bloat the backup.
// CAVEAT (audit 2026-06-21): this local backup does NOT include custom exercises
// — neither `exercises` rows with is_custom=1 nor the `custom_exercises` table is
// listed — so a LOCAL-only restore onto a fresh install will not recreate a
// user's custom exercise definitions (workout_sets that reference them would be
// left pointing at unknown ids). Custom exercises ARE preserved across devices
// via cloud sync (custom_exercises is in the sync table set), which is the path
// most restores take. Add `custom_exercises` here if local backup must be
// self-contained.
export const BACKUP_TABLES = [
  'workouts',
  'workout_sets',
  'routines',
  'routine_exercises',
  'programmes',
  'mesocycles',
  // Mesocycle child tables, restoring without these leaves orphan week-rows
  // pointing at deleted mesocycle ids and planned-volume drift.
  'mesocycle_weeks',
  'planned_muscle_volume',
  'adaptation_events',
  'nutrition_targets',
  'peak_week_plans',
  'body_metric_log',
  'user_insights',
  'user_body_profile',
  // Coaching tables, added so Pro users don't lose their check-in / coach
  // output / morning-weight history on restore.
  'morning_weights',
  'weekly_checkins',
  'coach_outputs',
  // E10-F1(a): the food domain. These are the user's own Article 9 health
  // records; leaving them out of the free backup meant a lapsed trial user
  // had NO self-service portability path for 14 days of logged food (GDPR
  // Article 20 exposure). The shared `foods` library cache is deliberately
  // NOT here: it is 25k+ reseedable reference rows, not user data.
  'food_entries',
  'custom_foods',
  'saved_meals',
  'recipes',
  'recipe_ingredients',
  'daily_water',
  'food_favourites',
  'meal_plans',
  // Rollups are derived but only recomputed on new writes for a day, so
  // restore them too or historic diary days would render empty totals.
  'daily_intake_rollups',
  // Device-local physique-photo records. The backup carries the SQLite
  // metadata and scan rows so a restore does not drop the user's own history;
  // image files themselves remain private app documents, not JSON rows.
  'progress_photo_meta',
  'progress_scan_sessions',
  'progress_scan_assets',
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
  await runInTransaction(d, async () => {
    for (const t of BACKUP_TABLES) {
      const rows = tables[t];
      if (!Array.isArray(rows)) continue;
      // Allowlist columns from the LIVE schema so a crafted backup can't inject
      // arbitrary identifiers into the INSERT column list (audit F-005). t is a
      // fixed BACKUP_TABLES name; only real columns survive the filter.
      const info = await d.getAllAsync(`PRAGMA table_info(${t})`);
      const allowed = new Set((info || []).map(c => c.name));
      if (allowed.size === 0) continue;
      await d.runAsync(`DELETE FROM ${t}`);
      for (const row of rows) {
        const cols = Object.keys(row).filter(c => allowed.has(c));
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
  // Defence in depth. The weight column is NOT NULL and a single precise
  // measurement, so a non-finite or non-positive value has no sensible
  // default: coercing it would poison the weight trend. Reject it loudly
  // here rather than letting it bind as NULL and surface as an opaque
  // SQLite constraint error. Callers (HomeScreen) already guard the input
  // and handle a throw by reverting the optimistic update.
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error(`logMorningWeight: weightKg must be a positive finite number, got ${weightKg}`);
  }
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
  // TZ-2: end the window at the NEXT local midnight, not dayStart + 86400000.
  // On a DST day the local day is 23 or 25h long, so a fixed 24h window either
  // overlaps the adjacent day or misses the last hour (duplicate day rows).
  const nextLocalDay = (ms) => {
    const d2 = new Date(ms);
    return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate() + 1).getTime();
  };
  const dayStart = startLocalDay(loggedAt);
  const dayEnd = nextLocalDay(loggedAt);
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
  } catch (_) { /* sync module unavailable, bulk upload will catch up later */ }
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
  // TZ-2: next local midnight, not +86400000 (DST-safe; see logMorningWeight).
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const row = await d.getFirstAsync(
    'SELECT * FROM morning_weights WHERE user_id = ? AND logged_at >= ? AND logged_at < ?',
    [userId, dayStart, dayEnd],
  );
  return rowToCamel(row);
}

// ─── Daily steps (activity store) ─────────────────────────────────────────────
//
// The cardio/steps audit
// (docs/audit/volyume-cardio-steps-audit-2026-05-30.md) found no store for
// what the user actually did, only the coach's target and a weekly
// hit/mostly/missed memory. daily_steps is that store: one row per day, a
// step total, and the source of the figure. It backs the manual step log
// (no wearable needed) and the baseline-and-compliance reads the coach uses.

// The day key for an activity row. Matches the Diary's day key so a day's
// steps and that day's food line up on the same calendar day. TZ-1: this is
// now the LOCAL calendar day (localDayKey), the same bucket weight + workouts
// use, so everything agrees about "today" for users not at UTC+0.
export function activityDayKey(ms = Date.now()) {
  return activityRepository.activityDayKey(ms);
}

// Write (or overwrite) the step total for a day. steps is clamped to a
// sane non-negative integer. updated_at drives last-write-wins on sync.
export async function setDailySteps(userId, { entryDate, steps, source = 'manual' } = {}) {
  return activityRepository.setDailySteps(userId, { entryDate, steps, source });
}

export async function getDailySteps(userId, entryDate) {
  return activityRepository.getDailySteps(userId, entryDate);
}

export async function getDailyStepsToday(userId) {
  return activityRepository.getDailyStepsToday(userId);
}

// Inclusive range read, oldest first. Backs the baseline average (a week
// of normal days) and the compliance view (target hit rate over time).
export async function getDailyStepsRange(userId, fromDate, toDate) {
  return activityRepository.getDailyStepsRange(userId, fromDate, toDate);
}

// ─── Cardio log (audit volyume-cardio-integration-2026-06-03) ──────────────
// One row per logged cardio session. est_kcal is session feedback only; it is
// never added to the calorie target (the energy-balance model absorbs cardio
// via the weight trend). Soft delete via deleted_at so a delete syncs; LWW on
// updated_at.

// Write a new cardio session. Returns the stored row (camelCase). The caller
// has already resolved the activity + computed met/est_kcal (cardioMath), so
// this layer just persists what it is given, clamped.
export async function insertCardioLog(userId, session = {}) {
  return activityRepository.insertCardioLog(userId, session);
}

// True if an imported cardio session with this platform sample id already
// exists for the user (ULTIMATE-CUX-PCI de-dup; NA-cux-4). Manual rows have a
// NULL ext_id and are never matched here.
export async function cardioExtIdExists(userId, extId) {
  return activityRepository.cardioExtIdExists(userId, extId);
}

// Patch an existing session (duration/intensity/notes etc.). Recompute of
// est_kcal is the caller's job (pass the new value). Bumps updated_at.
export async function updateCardioLog(userId, id, fields = {}) {
  return activityRepository.updateCardioLog(userId, id, fields);
}

// Soft delete: mark deleted_at + bump updated_at so the deletion syncs.
export async function deleteCardioLog(userId, id) {
  return activityRepository.deleteCardioLog(userId, id);
}

export async function getCardioLogById(userId, id) {
  return activityRepository.getCardioLogById(userId, id);
}

// Live sessions for a day (deleted rows excluded), newest first.
export async function getCardioLogForDate(userId, entryDate) {
  return activityRepository.getCardioLogForDate(userId, entryDate);
}

// Inclusive date-range read (deleted excluded), newest first. Backs the Plans
// weekly card, the check-in compliance prefill, and the coach week summary.
export async function getCardioLogRange(userId, fromDate, toDate) {
  return activityRepository.getCardioLogRange(userId, fromDate, toDate);
}

// Recent history for the Progress surface (deleted excluded), newest first.
export async function getRecentCardioLog(userId, limit = 50) {
  return activityRepository.getRecentCardioLog(userId, limit);
}

// Rows for the sync push window (anything inserted/edited/deleted in the last
// N days, by updated_at). Includes soft-deleted rows so a delete propagates.
// Used by the cardio_log per-table push handler.
export async function getCardioLogForPush(userId, days = 400) {
  return activityRepository.getCardioLogForPush(userId, days);
}

// Local updated_at (ms) for one row id, or null. The pull handler's LWW gate.
export async function getCardioLogUpdatedAt(userId, id) {
  return activityRepository.getCardioLogUpdatedAt(userId, id);
}

// Apply a cloud row (snake_case) into the local mirror, including soft-delete
// state. Upsert on (user_id, id); the caller has already won the LWW check.
export async function insertCardioLogFromCloud(userId, row) {
  return activityRepository.insertCardioLogFromCloud(userId, row);
}

// Rows for the sync push window (most recent N days). Step history is one
// small row per day, so a generous window is cheap. Used by the
// daily_steps per-table push handler.
export async function getDailyStepsForPush(userId, days = 400) {
  return activityRepository.getDailyStepsForPush(userId, days);
}

// Local updated_at (ms) for one day, or null if no local row. The pull
// handler uses this as the last-write-wins gate so a stale cloud row never
// clobbers a fresher local edit.
export async function getDailyStepsUpdatedAt(userId, entryDate) {
  return activityRepository.getDailyStepsUpdatedAt(userId, entryDate);
}

// Restore one cloud daily_steps row into local SQLite. INSERT OR REPLACE so
// the pull handler's LWW gate gets the overwrite it expects when the cloud
// row wins. Cloud updated_at is an ISO string; store it as ms to match the
// local convention.
export async function insertDailyStepsFromCloud(userId, row) {
  return activityRepository.insertDailyStepsFromCloud(userId, row);
}

// ─── NEW-002: training partners (local mirror) ───────────────────────────────
// Offline-first reads for the partner row. The pair-scoped sync handler keeps
// these current; the UI reads here, never Supabase directly. Derived signals
// only (planned/done/met/state) — never raw workouts.

const _toMsLocal = (v) => (v == null ? null : (typeof v === 'string' ? new Date(v).getTime() : v));

/** The user's partnerships (invited/active/ended), newest first. */
export async function getPartnershipsLocal(userId) {
  if (!userId) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM partnerships
     WHERE member_a = ? OR member_b = ?
     ORDER BY created_at DESC`,
    [userId, userId],
  );
  return rows.map(rowToCamel);
}

/** Count the user's ACTIVE partnerships (drives the free/Pro cap). */
export async function getActivePartnerCount(userId) {
  if (!userId) return 0;
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT COUNT(*) AS n FROM partnerships
     WHERE status = 'active' AND (member_a = ? OR member_b = ?)`,
    [userId, userId],
  );
  return row?.n ?? 0;
}

/** The most recent week signal for a given (pair, user). */
export async function getPartnerWeekSignal(pairId, userId, weekStart) {
  if (!pairId || !userId) return null;
  const d = await db();
  const row = weekStart
    ? await d.getFirstAsync(
        `SELECT * FROM partner_week_signals WHERE pair_id = ? AND user_id = ? AND week_start = ?`,
        [pairId, userId, String(weekStart)])
    : await d.getFirstAsync(
        `SELECT * FROM partner_week_signals WHERE pair_id = ? AND user_id = ? ORDER BY week_start DESC LIMIT 1`,
        [pairId, userId]);
  return row ? rowToCamel(row) : null;
}

/** All week signals for a pair (both members), oldest-first — feeds the shared streak. */
export async function getPairWeekSignals(pairId) {
  if (!pairId) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM partner_week_signals WHERE pair_id = ? ORDER BY week_start ASC`,
    [pairId],
  );
  return rows.map(rowToCamel);
}

/** The local day the user last cheered into a pair, or null. */
export async function getLastCheerSentOn(pairId, senderId) {
  if (!pairId || !senderId) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT sent_on FROM partner_cheers WHERE pair_id = ? AND sender_id = ? ORDER BY sent_on DESC LIMIT 1`,
    [pairId, senderId],
  );
  return row?.sent_on ?? null;
}

/** The most recent cheer RECEIVED in a pair (sender != me), or null. */
export async function getLastCheerReceived(pairId, myId) {
  if (!pairId || !myId) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT * FROM partner_cheers WHERE pair_id = ? AND sender_id != ? ORDER BY sent_on DESC LIMIT 1`,
    [pairId, myId],
  );
  return row ? rowToCamel(row) : null;
}

// ── Cloud-restore writers used by the sync handler ──
export async function upsertPartnershipFromCloud(row) {
  if (!row?.id) return;
  const d = await db();
  const values = [
    row.id, row.member_a ?? null, row.member_b ?? null, row.status ?? 'invited',
    row.streak_enabled ? 1 : 0,
    _toMsLocal(row.created_at), _toMsLocal(row.accepted_at), _toMsLocal(row.ended_at),
    _toMsLocal(row.updated_at ?? row.accepted_at ?? row.created_at) ?? Date.now(),
  ];
  try {
    await d.runAsync(
      `INSERT OR REPLACE INTO partnerships
         (id, member_a, member_b, status, streak_enabled, partner_first_name, created_at, accepted_at, ended_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values[0], values[1], values[2], values[3], values[4],
        // The OTHER member's server-snapshotted FIRST name, resolved by the sync
        // pull relative to this device's user. Null for legacy pairs ('Your
        // partner' fallback holds at every consumer).
        row.partner_first_name ?? null,
        values[5], values[6], values[7], values[8],
      ],
    );
  } catch (e) {
    const message = String(e?.message || e || '').toLowerCase();
    if (!message.includes('partner_first_name')) throw e;
    await d.runAsync(
      `INSERT OR REPLACE INTO partnerships
         (id, member_a, member_b, status, streak_enabled, created_at, accepted_at, ended_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values,
    );
  }
}

export async function upsertPartnerWeekSignalFromCloud(row) {
  if (!row?.pair_id || !row?.user_id || !row?.week_start) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO partner_week_signals
       (pair_id, user_id, week_start, planned_count, done_count, week_met, state, completed_block, hit_pb, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.pair_id, row.user_id, String(row.week_start),
      Math.max(0, Math.round(Number(row.planned_count) || 0)),
      Math.max(0, Math.round(Number(row.done_count) || 0)),
      row.week_met ? 1 : 0, row.state === 'resting' ? 'resting' : 'training',
      row.completed_block ? 1 : 0, row.hit_pb ? 1 : 0,
      _toMsLocal(row.updated_at) ?? Date.now(),
    ],
  );
}

export async function upsertPartnerCheerFromCloud(row) {
  if (!row?.id || !row?.pair_id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO partner_cheers (id, pair_id, sender_id, sent_on, kind, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      row.id, row.pair_id, row.sender_id, row.sent_on,
      // The chosen acknowledgement key (D5-B1); legacy/pre-106 rows read as the
      // quiet default 'here'. Never free text — the closed enum is the contract.
      row.kind ?? 'here',
      _toMsLocal(row.created_at) ?? Date.now(),
    ],
  );
}

// ── Weekly intention (Partners D5-A) ──
// One row per (pair, member, week_start): the member's integer weekly session
// aim against their OWN plan. Derived-safe. Both members read both rows so the
// PairCard can show each own aim; nobody's number is ever compared.

/** Local mirror write after the edge function accepts today's cheer. */
export async function setLocalPartnerCheerSent({ pairId, senderId, sentOn, kind } = {}) {
  if (!pairId || !senderId || !sentOn) return;
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `INSERT OR REPLACE INTO partner_cheers (id, pair_id, sender_id, sent_on, kind, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      `local:${pairId}:${senderId}:${sentOn}`,
      pairId,
      senderId,
      sentOn,
      kind || 'here',
      now,
    ],
  );
}

/** A single member's aim for a (pair, week), or null. */
export async function getPartnerWeeklyIntention(pairId, userId, weekStart) {
  if (!pairId || !userId || !weekStart) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM partner_weekly_intentions WHERE pair_id = ? AND user_id = ? AND week_start = ?',
    [pairId, userId, String(weekStart)],
  );
  return row ? rowToCamel(row) : null;
}

/** Write the local user's OWN aim immediately (before the cloud push lands). */
export async function setLocalPartnerWeeklyIntention({ pairId, userId, weekStart, weeklyAim } = {}) {
  if (!pairId || !userId || !weekStart) return;
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `INSERT OR REPLACE INTO partner_weekly_intentions
       (pair_id, user_id, week_start, weekly_aim, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [pairId, userId, String(weekStart), Math.max(0, Math.round(Number(weeklyAim) || 0)), now, now],
  );
}

/** Cloud-restore writer used by the sync pull (both members' aims). */
export async function upsertPartnerWeeklyIntentionFromCloud(row) {
  if (!row?.pair_id || !row?.user_id || !row?.week_start) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO partner_weekly_intentions
       (pair_id, user_id, week_start, weekly_aim, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      row.pair_id, row.user_id, String(row.week_start),
      Math.max(0, Math.round(Number(row.weekly_aim) || 0)),
      _toMsLocal(row.created_at), _toMsLocal(row.updated_at) ?? Date.now(),
    ],
  );
}

// ── Shared training block (Wave 5 C5 A1) ──
// One row per pair: block reference + the display name the proposer chose to
// share + proposed|active. Never plan content — the §5 contract holds.

/** The pair's shared block row, or null. */
export async function getPartnerSharedBlock(pairId) {
  if (!pairId) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM partner_shared_blocks WHERE pair_id = ?', [pairId]);
  return row ? rowToCamel(row) : null;
}

export async function upsertPartnerSharedBlockFromCloud(row) {
  if (!row?.pair_id || !row?.block_name) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO partner_shared_blocks
       (pair_id, block_ref, block_name, proposed_by, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      row.pair_id, row.block_ref ?? null, String(row.block_name).slice(0, 80),
      row.proposed_by ?? '', row.status === 'active' ? 'active' : 'proposed',
      _toMsLocal(row.created_at), _toMsLocal(row.updated_at) ?? Date.now(),
    ],
  );
}

/** Remove the pair's shared block locally (leave, or cloud says it is gone). */
export async function deleteLocalPartnerSharedBlock(pairId) {
  if (!pairId) return;
  const d = await db();
  await d.runAsync('DELETE FROM partner_shared_blocks WHERE pair_id = ?', [pairId]);
}

/** Local "what cloud rows exist for my pairs" — used to prune unpaired rows on pull. */
export async function getPartnerWinCards(pairId, { limit = 5, includeRevoked = false } = {}) {
  if (!pairId) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM partner_win_cards
     WHERE pair_id = ? ${includeRevoked ? '' : 'AND revoked_at IS NULL'}
     ORDER BY created_at DESC
     LIMIT ?`,
    [pairId, Math.max(1, Math.min(20, Math.round(Number(limit) || 5)))],
  );
  return rows.map(rowToCamel);
}

export async function upsertPartnerWinCardFromCloud(row) {
  if (!row?.id || !row?.pair_id || !row?.sender_id || !row?.card_type) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO partner_win_cards
       (id, pair_id, sender_id, card_type, title, summary, detail, visible_to_partner, remains_private, created_at, revoked_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.pair_id,
      row.sender_id,
      String(row.card_type).slice(0, 40),
      String(row.title || 'Shared win').slice(0, 80),
      String(row.summary || '').slice(0, 160),
      String(row.detail || '').slice(0, 240),
      String(row.visible_to_partner || '').slice(0, 180),
      String(row.remains_private || '').slice(0, 220),
      _toMsLocal(row.created_at) ?? Date.now(),
      _toMsLocal(row.revoked_at),
      _toMsLocal(row.updated_at ?? row.created_at) ?? Date.now(),
    ],
  );
}

export async function markLocalPartnerWinCardRevoked(cardId, revokedAt = Date.now()) {
  if (!cardId) return;
  const d = await db();
  const ts = _toMsLocal(revokedAt) ?? Date.now();
  await d.runAsync(
    'UPDATE partner_win_cards SET revoked_at = ?, updated_at = ? WHERE id = ?',
    [ts, ts, cardId],
  );
}

export async function getLocalPartnershipIds(userId) {
  if (!userId) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT id FROM partnerships WHERE member_a = ? OR member_b = ?`, [userId, userId]);
  return rows.map((r) => r.id);
}

/**
 * Purge the local mirror of one pair's SHARED data (its week signals + cheers),
 * leaving the partnership tombstone in place. Honours the unpair deletion promise
 * (blueprint §5) on-device: called both on the unpairing user's own device (for
 * immediate effect) and during the pull for any pair the cloud now reports as
 * ended, so the OTHER member's device clears the shared rows too.
 */
export async function deleteLocalPairSharedData(pairId) {
  if (!pairId) return;
  const d = await db();
  await d.runAsync('DELETE FROM partner_cheers WHERE pair_id = ?', [pairId]);
  await d.runAsync('DELETE FROM partner_week_signals WHERE pair_id = ?', [pairId]);
  await d.runAsync('DELETE FROM partner_shared_blocks WHERE pair_id = ?', [pairId]);
  await d.runAsync('DELETE FROM partner_weekly_intentions WHERE pair_id = ?', [pairId]);
  await d.runAsync('DELETE FROM partner_win_cards WHERE pair_id = ?', [pairId]);
}

/**
 * Mark a local partnership as ended, mirroring what end_partnership does
 * server-side. Cancelling a pending invite (or ending an active pairing) has
 * to move the local row out of both the active and the pending derivations at
 * once: usePartners.load reads only SQLite and the next pull may be minutes
 * away, so without this the cancelled invite's card keeps showing (its row is
 * still status='invited') even though the cancel succeeded. Keeps the row as an
 * 'ended' tombstone rather than deleting it, matching deleteLocalPairSharedData.
 */
export async function markLocalPartnershipEnded(pairId) {
  if (!pairId) return;
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    "UPDATE partnerships SET status = 'ended', ended_at = ?, updated_at = ? WHERE id = ?",
    [now, now, pairId],
  );
}

/** Wipe all local partner data (sign-out guard). */
export async function clearLocalPartners() {
  const d = await db();
  await d.runAsync('DELETE FROM partner_cheers');
  await d.runAsync('DELETE FROM partner_week_signals');
  await d.runAsync('DELETE FROM partner_shared_blocks');
  await d.runAsync('DELETE FROM partner_weekly_intentions');
  await d.runAsync('DELETE FROM partner_win_cards');
  await d.runAsync('DELETE FROM partnerships');
}

// ─── Pro: Weekly Check-Ins ────────────────────────────────────────────────────

export async function saveWeeklyCheckin(userId, data) {
  const d = await db();
  const now = Date.now();
  // Find this week's check-in by when it was made, not its stored
  // week_start: created_at is an absolute instant, so a row written under
  // the older UTC-Monday week_start convention is still matched and updated
  // rather than duplicated. data.weekStart is the local Monday 00:00.
  const weekEnd = data.weekStart + 7 * 86400000;
  const existing = await d.getFirstAsync(
    'SELECT id FROM weekly_checkins WHERE user_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at DESC LIMIT 1',
    [userId, data.weekStart, weekEnd],
  );

  // Column map: data key -> [column, coerce]. The write is PRESERVING: a field
  // is only touched when the caller actually provides it (value !== undefined).
  // weekly_checkins has two writers (the weekly check-in and, for sleep
  // quality, WorkoutSummaryScreen). The old write set every column to
  // `value ?? null`, so whichever writer ran last NULLED the other's answers,
  // wiping the user's calorie / steps / cardio / training data within a week.
  // Now a writer that owns only some fields leaves the rest untouched. Passing
  // an explicit null still clears a field; only `undefined` means "leave the
  // stored value alone".
  const COLS = [
    ['energyScore', 'energy_score', (v) => v],
    ['sorenessScore', 'soreness_score', (v) => v],
    ['stressScore', 'stress_score', (v) => v],
    ['sleepHours', 'sleep_hours', (v) => v],
    ['calsAdherence', 'cals_adherence', (v) => v],
    ['stepsAdherence', 'steps_adherence', (v) => v],
    ['cardioAdherence', 'cardio_adherence', (v) => v],
    ['stepsAvg', 'steps_avg', (v) => v],
    ['cycleOverride', 'cycle_override', (v) => (v ? 1 : 0)],
    ['notes', 'notes', (v) => v],
    ['trainingPerformance', 'training_performance', (v) => v],
    ['jointPain', 'joint_pain', (v) => (v ? 1 : 0)],
    ['soreMuscles', 'sore_muscles', (v) => v],
    ['sleepQuality', 'sleep_quality', (v) => v],
  ];

  let savedId;
  if (existing?.id) {
    const setParts = [];
    const args = [];
    for (const [key, col, coerce] of COLS) {
      if (data[key] === undefined) continue; // preserve the stored value
      setParts.push(`${col} = ?`);
      args.push(coerce(data[key]));
    }
    setParts.push('updated_at = ?');
    args.push(now, existing.id);
    await d.runAsync(
      `UPDATE weekly_checkins SET ${setParts.join(', ')} WHERE id = ?`,
      args,
    );
    savedId = existing.id;
  } else {
    savedId = uid();
    const cols = ['id', 'user_id', 'week_start'];
    const vals = [savedId, userId, data.weekStart];
    for (const [key, col, coerce] of COLS) {
      cols.push(col);
      vals.push(data[key] === undefined ? null : coerce(data[key]));
    }
    cols.push('created_at', 'updated_at');
    vals.push(now, now);
    await d.runAsync(
      `INSERT INTO weekly_checkins (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals,
    );
  }
  // Fire-and-forget cloud push through the registry runner (E12 step 1: the
  // legacy per-save syncWeeklyCheckin dual writer is retired; the registry
  // weekly_checkins handler reads the merged SQLite row saved above, so a
  // partial writer can't null the cloud copy either).
  try {
    // eslint-disable-next-line global-require
    const { syncAll } = require('./sync');
    syncAll({ userId, localUserId: userId, triggeredBy: 'write' }).catch(() => {});
  } catch (_) { /* sync module unavailable, the next lifecycle sync catches up */ }
  return savedId;
}

export async function getLatestCheckin(userId, weekStart = null) {
  const d = await db();
  if (weekStart != null) {
    // Prefer a real check-in row (energy_score set) over a workout's
    // sleep-only contribution if both ever share a week_start, and be
    // deterministic when more than one row exists.
    const row = await d.getFirstAsync(
      `SELECT * FROM weekly_checkins WHERE user_id = ? AND week_start = ?
       ORDER BY (energy_score IS NOT NULL) DESC, created_at DESC LIMIT 1`,
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

// TZ/data-window guard for the weekly-stat readers. A Date here (the 2026-06
// check-in bug) would string-concatenate in `weekStart + 7 * 86400000` and
// silently break the query window. Coerce a Date to epoch-ms and reject
// anything that isn't a finite number, so a bad arg surfaces loudly instead
// of returning wrong session/PR counts. Exported so the coercion is unit
// tested directly (the CRUD itself runs on device, not under jest).
export function coerceWeekStartMs(weekStart, fnName = 'weekStart') {
  // Only a Date, a finite number, or a non-empty numeric string is a valid
  // window start. Guard against the JS coercion traps: Number(null),
  // Number('') and Number(false) are all 0 (a silent 1970 window), and an
  // Invalid Date is NaN. Anything else throws rather than running a wrong
  // query.
  if (weekStart instanceof Date) {
    const ms = weekStart.getTime();
    if (Number.isFinite(ms)) return ms;
  } else if (typeof weekStart === 'number' && Number.isFinite(weekStart)) {
    return weekStart;
  } else if (typeof weekStart === 'string' && weekStart.trim() !== '') {
    const n = Number(weekStart);
    if (Number.isFinite(n)) return n;
  }
  throw new Error(`${fnName}: weekStart must be epoch-ms, got ${weekStart}`);
}

// Which past calendar weeks were engine-prescribed deload (recovery) weeks.
// COMP-018's run-length must treat a deload week as "resting", never a miss,
// so a user who correctly backs off during a planned recovery week is not
// punished. There is no calendar-dated deload record (mesocycle_weeks are
// keyed by week-index, not date), so we infer it the only reliable way: a
// calendar week is a deload week if a completed workout in it was linked to a
// mesocycle_week flagged is_deload = 1. Returns an array of week-start epochs
// (local Monday 00:00). Known gap: a deload week with zero logged sessions
// has no workout to link, so it cannot be detected here; a single such week
// is covered by the streak's one-week repair, which is why this is correct
// for realistic 1-week deloads.
export async function getDeloadWeeksInRange(userId, fromMs, toMs) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT w.started_at AS startedAt
     FROM workouts w
     JOIN mesocycle_weeks mw ON mw.id = w.mesocycle_week_id
     WHERE w.user_id = ? AND w.is_completed = 1
       AND w.started_at >= ? AND w.started_at < ?
       AND mw.is_deload = 1`,
    [userId, fromMs, toMs],
  );
  const set = new Set();
  for (const r of rows) {
    if (Number.isFinite(r.startedAt)) set.add(localWeekStartMs(r.startedAt));
  }
  return Array.from(set);
}

export async function getWeeklySessionStats(userId, weekStart) {
  const weekStartMs = coerceWeekStartMs(weekStart, 'getWeeklySessionStats');
  const d = await db();
  const weekEnd = weekStartMs + 7 * 86400000;
  const row = await d.getFirstAsync(
    `SELECT COUNT(*) AS completed FROM workouts
     WHERE user_id = ? AND is_completed = 1 AND started_at >= ? AND started_at < ?`,
    [userId, weekStartMs, weekEnd],
  );
  const prev4 = await d.getAllAsync(
    `SELECT COUNT(*) AS wk_count FROM workouts
     WHERE user_id = ? AND is_completed = 1
       AND started_at >= ? AND started_at < ?
     GROUP BY CAST((started_at - ?) / (7 * 86400000) AS INTEGER)`,
    [userId, weekStartMs - 28 * 86400000, weekStartMs, weekStartMs - 28 * 86400000],
  );
  const avgPrev = prev4.length
    ? prev4.reduce((s, r) => s + (r.wk_count ?? 0), 0) / prev4.length
    : 3;

  // ALGO-002: planned sessions come from the active plan's training days (the
  // number of routines in the active programme), which is what the plan
  // actually prescribes this week. The trailing-average estimate is only a
  // fallback for users with no active plan to read.
  let plannedFromPlan = null;
  try {
    const plan = await getActivePlan(userId);
    if (plan?.id) {
      const routines = await getRoutinesForPlan(plan.id);
      if (Array.isArray(routines) && routines.length > 0) plannedFromPlan = routines.length;
    }
  } catch (_) { /* fall back to the historical estimate below */ }

  const completed = row?.completed ?? 0;
  const planned = plannedFromPlan != null
    ? plannedFromPlan
    : Math.max(completed, Math.round(avgPrev) || 3);
  return { completed, planned };
}

// True when a workout exists for the given calendar day (any state,
// completed or in progress). Drives the Diary's training-day / rest-day
// carb-cycle target (GAP row 6): the day flips to the training-day
// target as soon as a session is started, so the higher carb allowance
// is available while training rather than only after the workout is
// finished. dateIso is a 'YYYY-MM-DD' string. TZ-1/TZ-2: parse it as a LOCAL
// day (the diary now keys by local day) and bound at the next local midnight,
// so a late-evening workout is matched to the right calendar day and DST days
// don't drift the window.
export async function hasWorkoutOnDate(userId, dateIso) {
  if (!userId || !dateIso) return false;
  const [y, m, dd] = String(dateIso).split('-').map(Number);
  if (!y || !m || !dd) return false;
  const start = new Date(y, m - 1, dd).getTime();
  const end = new Date(y, m - 1, dd + 1).getTime();
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT 1 AS hit FROM workouts WHERE user_id = ? AND started_at >= ? AND started_at < ? LIMIT 1',
    [userId, start, end],
  );
  return !!row;
}

// The UTC date ('YYYY-MM-DD') of the earliest workout on or after the
// calendar day that contains sinceMs, or null. Resolves which day an
// applied refeed lands on (GAP row 7): the refeed is the first training
// day on or after the day it was confirmed. The threshold is snapped to
// UTC midnight so a session trained earlier on the confirm day counts.
export async function getFirstWorkoutDateOnOrAfter(userId, sinceMs) {
  if (!userId || sinceMs == null) return null;
  const dayStart = Date.parse(`${new Date(sinceMs).toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(dayStart)) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT started_at FROM workouts WHERE user_id = ? AND started_at >= ? ORDER BY started_at ASC LIMIT 1',
    [userId, dayStart],
  );
  if (!row?.started_at) return null;
  return new Date(row.started_at).toISOString().slice(0, 10);
}

export async function getWeeklyPRCount(userId, weekStart) {
  // Same data-window guard as getWeeklySessionStats: coerce a Date to
  // epoch-ms and reject a non-finite window rather than silently miscount PRs.
  const weekStartMs = coerceWeekStartMs(weekStart, 'getWeeklyPRCount');
  const d = await db();
  const weekEnd = weekStartMs + 7 * 86400000;
  // ALGO-003: a PR is the best estimated 1RM for an exercise beating its prior
  // best estimated 1RM, not just a heavier top-set weight. Epley e1RM =
  // weight * (1 + reps/30) credits a same-weight higher-rep set and a pure rep
  // PR, both of which a weight-only comparison missed. Warm-up sets excluded.
  const row = await d.getFirstAsync(
    // distance/duration reuse the weight column, so they must never enter an
    // e1RM (weight-based) comparison or they manufacture phantom PRs. LEFT JOIN
    // keeps unknown/unmatched exercises as weight_reps (counted) on both sides.
    `SELECT COUNT(*) AS pr_count FROM (
       SELECT ws.exercise_id,
              MAX(ws.weight * (1.0 + COALESCE(ws.actual_reps, 1) / 30.0)) AS wk_e1rm
       FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       LEFT JOIN exercises e ON e.id = ws.exercise_id
       LEFT JOIN custom_exercises ce ON ce.id = ws.exercise_id AND ce.user_id = ws.user_id
       WHERE ws.user_id = ? AND w.is_completed = 1
         AND w.started_at >= ? AND w.started_at < ?
         AND ws.weight IS NOT NULL AND ws.weight > 0
         AND (ws.set_type IS NULL OR ws.set_type != 'warmup')
         AND COALESCE(ce.exercise_type, e.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')
       GROUP BY ws.exercise_id
     ) cur
     WHERE cur.wk_e1rm > COALESCE((
       SELECT MAX(ws2.weight * (1.0 + COALESCE(ws2.actual_reps, 1) / 30.0))
       FROM workout_sets ws2
       JOIN workouts w2 ON ws2.workout_id = w2.id
       LEFT JOIN exercises e2 ON e2.id = ws2.exercise_id
       LEFT JOIN custom_exercises ce2 ON ce2.id = ws2.exercise_id AND ce2.user_id = ws2.user_id
       WHERE ws2.exercise_id = cur.exercise_id
         AND ws2.user_id = ?
         AND w2.is_completed = 1
         AND w2.started_at < ?
         AND ws2.weight IS NOT NULL AND ws2.weight > 0
         AND (ws2.set_type IS NULL OR ws2.set_type != 'warmup')
         AND COALESCE(ce2.exercise_type, e2.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')
     ), 0)`,
    [userId, weekStartMs, weekEnd, userId, weekStartMs],
  );
  return row?.pr_count ?? 0;
}

// The standout lift of a given week, for the "Great Week" recap share card.
// Pulls this week's working sets + each exercise's prior best e1RM and defers
// the choice to the pure pickBestLift() (biggest e1RM gain, else heaviest set;
// see src/lib/bestLift.js). e1RM here is plain Epley to match getWeeklyPRCount,
// so the featured lift is consistent with the PR count on the same card.
export async function getBestLiftThisWeek(userId, weekStart) {
  const weekStartMs = coerceWeekStartMs(weekStart, 'getBestLiftThisWeek');
  const d = await db();
  const weekEnd = weekStartMs + 7 * 86400000;

  const weekSets = await d.getAllAsync(
    `SELECT ws.exercise_id AS exerciseId, ex.name AS exerciseName,
            ws.weight AS weight, ws.actual_reps AS reps
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     LEFT JOIN exercises ex ON ex.id = ws.exercise_id
     LEFT JOIN custom_exercises ce ON ce.id = ws.exercise_id AND ce.user_id = ws.user_id
     WHERE ws.user_id = ? AND w.is_completed = 1
       AND w.started_at >= ? AND w.started_at < ?
       AND ws.weight IS NOT NULL AND ws.weight > 0
       AND (ws.set_type IS NULL OR ws.set_type != 'warmup')
       AND COALESCE(ce.exercise_type, ex.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')`,
    [userId, weekStartMs, weekEnd],
  );
  if (!weekSets.length) return null;

  const priorRows = await d.getAllAsync(
    // NULLIF(...,0) so a 0-rep set floors to 1 rep, matching pickBestLift's
    // JS e1RM on the week side — otherwise the same set scores ~3% higher this
    // week than as a prior best and falsely reads as a new best.
    // distance/duration excluded so a cardio set can't pose as a prior best.
    `SELECT ws.exercise_id AS exerciseId,
            MAX(ws.weight * (1.0 + COALESCE(NULLIF(ws.actual_reps, 0), 1) / 30.0)) AS priorE1rm
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     LEFT JOIN exercises e ON e.id = ws.exercise_id
     LEFT JOIN custom_exercises ce ON ce.id = ws.exercise_id AND ce.user_id = ws.user_id
     WHERE ws.user_id = ? AND w.is_completed = 1
       AND w.started_at < ?
       AND ws.weight IS NOT NULL AND ws.weight > 0
       AND COALESCE(ce.exercise_type, e.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')
       AND (ws.set_type IS NULL OR ws.set_type != 'warmup')
     GROUP BY ws.exercise_id`,
    [userId, weekStartMs],
  );
  const priorByEx = new Map(priorRows.map((r) => [r.exerciseId, r.priorE1rm]));
  return pickBestLift(weekSets, priorByEx);
}

/**
 * Total weight lifted across the user's whole history (Phase 2 lifetime-tonnage
 * landmark): SUM(weight × reps) over every completed, non-warmup working set, in
 * the user's gym unit. No date window — this is the all-time figure. Returns a
 * rounded number (0 when there is nothing logged).
 */
export async function getLifetimeTonnage(userId) {
  const d = await db();
  // Exclude 'distance'/'duration' exercises: those repurpose the weight column
  // to store metres (and reps for seconds), so weight × reps is not load and
  // would inflate tonnage with garbage. The exercise_type lives on `exercises`
  // (library) or `custom_exercises` (per-user, composite PK user_id+id); we LEFT
  // JOIN both so an unknown / unmatched exercise defaults to load-bearing
  // (weight_reps) and the figure is byte-identical for normal lifting sets.
  const row = await d.getFirstAsync(
    `SELECT COALESCE(SUM(ws.weight * ws.actual_reps), 0) AS tonnage
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     LEFT JOIN exercises e ON e.id = ws.exercise_id
     LEFT JOIN custom_exercises ce ON ce.id = ws.exercise_id AND ce.user_id = ws.user_id
     WHERE ws.user_id = ? AND w.is_completed = 1
       AND (ws.set_type IS NULL OR ws.set_type != 'warmup') AND ws.actual_reps > 0 AND ws.weight > 0
       AND COALESCE(ce.exercise_type, e.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')`,
    [userId],
  );
  return Math.round(row?.tonnage ?? 0);
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
    // distance/duration reuse the weight column; exclude them so the Year of
    // Lifts tonnage and e1RM PRs aren't polluted by metres/seconds. LEFT JOINs
    // keep unknown/unmatched exercises as weight_reps (counted).
    `SELECT ws.weight, ws.actual_reps, ws.exercise_id, ex.name AS exercise_name,
            ex.primary_muscle AS muscle
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     LEFT JOIN exercises ex ON ex.id = ws.exercise_id
     LEFT JOIN custom_exercises ce ON ce.id = ws.exercise_id AND ce.user_id = ws.user_id
     WHERE ws.user_id = ? AND w.is_completed = 1 AND w.started_at >= ?
       AND ws.set_type != 'warmup' AND ws.actual_reps > 0 AND ws.weight > 0
       AND COALESCE(ce.exercise_type, ex.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')`,
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

  // Top PRs during the year, compute best estimated 1RM per exercise
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

// COMP-005: window-bounded recap aggregates for the monthly recap story (and
// reusable for any [startMs, endMs) window). getYearOfLiftsData is deliberately
// left untouched so Year of Lifts stays byte-identical; this is a sibling, not a
// refactor of it. Unlike the year function it (a) takes an explicit end bound,
// (b) divides sessions by the window's actual weeks rather than a flat 52,
// (c) surfaces the best single session by tonnage, and (d) optionally runs the
// same aggregates over the immediately preceding window for delta captions.
export async function getRecapData(userId, { startMs, endMs = Date.now(), compare = false } = {}) {
  const d = await db();
  const WEEK = 7 * 86400000;

  const aggregate = async (s, e) => {
    const workouts = await d.getAllAsync(
      `SELECT w.id, w.started_at
       FROM workouts w
       WHERE w.user_id = ? AND w.is_completed = 1 AND w.started_at >= ? AND w.started_at < ?
       ORDER BY w.started_at ASC`,
      [userId, s, e],
    );
    const sets = await d.getAllAsync(
      // distance/duration reuse the weight column; exclude them so recap
      // tonnage, best-session and e1RM PRs aren't polluted. LEFT JOINs keep
      // unknown/unmatched exercises as weight_reps (counted).
      `SELECT ws.workout_id, ws.weight, ws.actual_reps, ws.exercise_id, ex.name AS exercise_name
       FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       LEFT JOIN exercises ex ON ex.id = ws.exercise_id
       LEFT JOIN custom_exercises ce ON ce.id = ws.exercise_id AND ce.user_id = ws.user_id
       WHERE ws.user_id = ? AND w.is_completed = 1 AND w.started_at >= ? AND w.started_at < ?
         AND ws.set_type != 'warmup' AND ws.actual_reps > 0 AND ws.weight > 0
         AND COALESCE(ce.exercise_type, ex.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')`,
      [userId, s, e],
    );
    return { workouts, sets };
  };

  const { workouts, sets } = await aggregate(startMs, endMs);
  const totalSessions = workouts.length;
  const totalSets = sets.length;
  const tonnage = Math.round(sets.reduce((t, x) => t + x.weight * x.actual_reps, 0));
  const weeks = Math.max(1, (endMs - startMs) / WEEK);
  const avgSessionsPerWeek = totalSessions > 0 ? Math.round((totalSessions / weeks) * 10) / 10 : 0;

  const exerciseCounts = {};
  for (const x of sets) {
    const k = x.exercise_name ?? 'Unknown';
    exerciseCounts[k] = (exerciseCounts[k] ?? 0) + 1;
  }
  const topExercises = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, sets: count }));
  const uniqueExercises = Object.keys(exerciseCounts).length;

  // Best single session by tonnage in the window.
  const tonnageByWorkout = {};
  for (const x of sets) {
    tonnageByWorkout[x.workout_id] = (tonnageByWorkout[x.workout_id] ?? 0) + x.weight * x.actual_reps;
  }
  let bestSession = null;
  for (const w of workouts) {
    const t = Math.round(tonnageByWorkout[w.id] ?? 0);
    if (t > 0 && (!bestSession || t > bestSession.tonnage)) {
      bestSession = { startedAt: w.started_at, tonnage: t };
    }
  }

  // Best estimated 1RM per exercise this window (the personal_records table was
  // never created locally; derive from logged sets, mirroring getYearOfLiftsData).
  const bestByExercise = new Map();
  for (const x of sets) {
    if (!x.exercise_name) continue;
    const e1rm = calculate1RM(x.weight || 0, x.actual_reps || 0);
    if (!e1rm) continue;
    const prev = bestByExercise.get(x.exercise_name);
    if (!prev || e1rm > prev.value) {
      bestByExercise.set(x.exercise_name, { value: parseFloat(e1rm.toFixed(1)), reps: x.actual_reps, exerciseName: x.exercise_name });
    }
  }
  const topPRs = Array.from(bestByExercise.values()).sort((a, b) => b.value - a.value).slice(0, 5);

  let previous = null;
  if (compare) {
    const len = endMs - startMs;
    const { workouts: pw, sets: ps } = await aggregate(startMs - len, startMs);
    previous = {
      totalSessions: pw.length,
      tonnage: Math.round(ps.reduce((t, x) => t + x.weight * x.actual_reps, 0)),
    };
  }

  return {
    startMs, endMs, totalSessions, totalSets, tonnage,
    avgSessionsPerWeek, uniqueExercises, topExercises, bestSession, topPRs, previous,
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
    // COMP-005: ws.workout_id is projected so the first/last-week tonnage
    // filters below can match sets to their workout. Without it s.workout_id
    // was undefined, both week buckets were always empty, and tonnageDelta
    // (the block story's "climb" slide + BlockReflectionScreen's progress
    // figure) always computed as null.
    // distance/duration reuse the weight column; exclude them so the block's
    // first/last-week tonnage and tonnageDelta aren't polluted. LEFT JOINs keep
    // unknown/unmatched exercises as weight_reps (counted).
    `SELECT ws.workout_id, ws.weight, ws.actual_reps, ws.set_type, ws.exercise_id, ex.name AS exercise_name
     FROM workout_sets ws
     JOIN workouts w ON ws.workout_id = w.id
     LEFT JOIN exercises ex ON ex.id = ws.exercise_id
     LEFT JOIN custom_exercises ce ON ce.id = ws.exercise_id AND ce.user_id = ws.user_id
     WHERE ws.user_id = ? AND w.mesocycle_id = ? AND w.is_completed = 1
       AND ws.set_type != 'warmup' AND ws.actual_reps > 0 AND ws.weight > 0
       AND COALESCE(ce.exercise_type, ex.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')`,
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

  // PRs during this block, compute best estimated 1RM per exercise from the
  // block's logged sets (no local personal_records table, see comment above).
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

/**
 * Preserve confirm-then-apply state across CoachOutputScreen.load()'s remount
 * re-save. load() writes a fresh runWeeklyCoach() result on every mount, and
 * that result never carries appliedAdjustments (only markApplied writes them,
 * at the moment of an Apply tap). saveCoachOutput keys on (user_id, week_start),
 * so its UPDATE only ever hits the SAME week's row; carrying that row's
 * already-applied map forward keeps the "Applied" history and everything that
 * reads it (isApplied, the diary coach-receipt chip) intact. A genuine apply
 * still lands, because markApplied's own save DOES carry the map, and an
 * incoming map wins outright over the stored one.
 *
 * Pure and exported so the merge is regression-testable without a SQL engine
 * (repo convention: raw CRUD is exercised on device).
 * @param {string} existingOutputJson the stored row's output_json (may be null)
 * @param {object} data the incoming coach output about to be written
 * @returns {object} the object to persist
 */
export function preserveAppliedAdjustments(existingOutputJson, data) {
  if (data?.appliedAdjustments) return data;
  let prevApplied = null;
  try { prevApplied = JSON.parse(existingOutputJson)?.appliedAdjustments ?? null; }
  catch { prevApplied = null; } // unreadable stored JSON: keep data as-is
  return prevApplied ? { ...data, appliedAdjustments: prevApplied } : data;
}

export async function saveCoachOutput(userId, data) {
  const d = await db();
  const now = Date.now();
  const existing = await d.getFirstAsync(
    'SELECT id, output_json FROM coach_outputs WHERE user_id = ? AND week_start = ?',
    [userId, data.weekStart],
  );
  if (existing?.id) {
    const toStore = preserveAppliedAdjustments(existing.output_json, data);
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
        data.whyThisWeek ?? null, JSON.stringify(toStore), existing.id,
      ],
    );
    _scheduleSync();
    return existing.id;
  }
  const json = JSON.stringify(data);
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
// Return every row owned by `userId` for a given table, used by sync.js to
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
  return bodyMetricsRepository.getAllBodyMetricsForUser(userId);
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

// B4 contest countdown: the show date lives on the user's active
// peak_week_plans row (the column has existed since the table was created;
// these are its first readers/writer). Only show_date is ever written here.
// The countdown does no prep maths (docs/b4-contest-countdown-ed-review).
export async function getActivePeakWeekPlan(userId) {
  const d = await db();
  try {
    const row = await d.getFirstAsync(
      `SELECT * FROM peak_week_plans
       WHERE user_id = ? AND status = 'active' AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 1`,
      [userId],
    );
    return row ? rowToCamel(row) : null;
  } catch (_) { return null; }
}

export async function setPeakWeekShowDate(userId, showDate) {
  const d = await db();
  const existing = await getActivePeakWeekPlan(userId);
  const now = Date.now();
  if (existing) {
    await d.runAsync(
      'UPDATE peak_week_plans SET show_date = ?, updated_at = ? WHERE id = ?',
      [showDate ?? null, now, existing.id],
    );
    return existing.id;
  }
  if (!showDate) return null; // nothing to clear
  const id = uid();
  await d.runAsync(
    `INSERT INTO peak_week_plans (id, user_id, show_date, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
    [id, userId, showDate, now, now],
  );
  return id;
}

export async function getAllPlannedMuscleVolumeForUser(userId) {
  const d = await db();
  try {
    // The primary planned_muscle_volume table has no user_id column, so
    // we JOIN through mesocycle_weeks → mesocycles to filter. Previously
    // this read from the _sync mirror, which was only populated by
    // cloud pulls, so locally-computed planned volumes never reached
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
       is_library, is_sample, source_routine_id, programme_id, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.id, userId, r.name, r.description ?? null, r.split_type ?? r.splitType ?? null,
      r.day_of_week ?? r.dayOfWeek ?? null,
      r.is_active ?? r.isActive ?? 1,
      r.is_library ?? r.isLibrary ?? 0,
      r.is_sample ?? r.isSample ?? 0,
      r.source_routine_id ?? r.sourceRoutineId ?? null,
      r.programme_id ?? r.programmeId ?? null,
      // position may be absent on a cloud row pulled before migrate_113 lands;
      // null falls back to created_at ordering (getRoutinesForPlan).
      r.position ?? null,
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
  // action, the cure for the 114-routines-with-zero-exercises bug.
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
  if (!userId || !w?.id) return;
  const d = await db();
  const toMs = (t) => (typeof t === 'string' ? new Date(t).getTime() : (t ?? null));
  // Last-write-wins (SYNC-6). The legacy INSERT OR IGNORE never updated an
  // existing local row, so a morning weight edited on another device never
  // reconciled here. Now: insert when there's no local row, otherwise only
  // overwrite when the cloud copy is provably newer.
  const cloudMs = toMs(w.updated_at);
  const existing = await d.getFirstAsync('SELECT updated_at FROM morning_weights WHERE id = ?', [w.id]);
  const localMs = existing?.updated_at ?? null;
  // When a local row exists, skip unless the cloud copy is provably newer.
  // If the cloud row carries no updated_at (e.g. before migration 060 lands,
  // when the cloud table has no such column), we cannot prove it's newer, so we
  // keep the local row rather than clobber a possibly-newer un-pushed local edit
  // (preserves the old non-destructive behaviour until 060 enables real LWW).
  if (existing && (cloudMs == null || (localMs != null && localMs >= cloudMs))) return;
  const createdAt = toMs(w.created_at) ?? Date.now();
  await d.runAsync(
    `INSERT OR REPLACE INTO morning_weights (id, user_id, weight_kg, logged_at, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      w.id, userId, w.weight_kg,
      toMs(w.logged_at) ?? Date.now(),
      w.notes ?? null,
      createdAt,
      cloudMs ?? createdAt,
    ],
  );
}

// Restores a single body_metrics row from cloud into local SQLite.
// The cloud column names diverge from the local _cm-suffixed naming:
// cloud uses body_weight / waist / chest / hips / quads / arms /
// shoulders / forearms / hamstrings / calves with a DATE-typed
// metric_date instead of an ms epoch logged_at. The previous version
// of this function was reading m.weight_kg / m.thigh_cm / m.arm_cm
// / etc., none of which exist on the cloud row, so every measured
// value came back as null on cross-device restore. The Athlete Hub
// then showed "Body metrics: No entries yet" even though the user had
// dutifully logged dozens of weigh-ins.
//
// INSERT OR REPLACE so the per-table sync handler's LWW gate
// (src/lib/sync/tables/bodyComposition.js) gets the overwrite it
// expects when the cloud row beats local. Without the REPLACE the
// pull would never actually update an existing row.
export async function insertBodyMetricFromCloud(userId, m) {
  return bodyMetricsRepository.insertBodyMetricFromCloud(userId, m);
}

// INSERT OR REPLACE, the per-table sync handler at
// src/lib/sync/tables/weeklyCheckins.js applies the LWW gate
// before calling this. Without the REPLACE a cloud edit to an
// already-synced row would never land locally.
export async function insertWeeklyCheckinFromCloud(userId, c) {
  const d = await db();
  const tsToMs = (v) => v == null ? null : (typeof v === 'string' ? new Date(v).getTime() : v);
  await d.runAsync(
    `INSERT OR REPLACE INTO weekly_checkins
      (id, user_id, week_start, energy_score, soreness_score, stress_score, sleep_hours,
       cals_adherence, steps_adherence, cardio_adherence, steps_avg, cycle_override, notes,
       training_performance, joint_pain, sore_muscles, sleep_quality, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      c.id, userId, c.week_start,
      c.energy_score ?? null, c.soreness_score ?? null, c.stress_score ?? null,
      c.sleep_hours ?? null, c.cals_adherence ?? null, c.steps_adherence ?? null,
      c.cardio_adherence ?? null, c.steps_avg ?? null,
      c.cycle_override ? 1 : 0, c.notes ?? null,
      c.training_performance ?? null,
      c.joint_pain ? 1 : 0,
      c.sore_muscles ?? null,
      c.sleep_quality ?? null,
      Date.now(),
      tsToMs(c.updated_at) ?? Date.now(),
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
        gdpr_consented=?, goal=?, protein_approach=?, updated_at=?
       WHERE user_id=?`,
      [
        t.bmr ?? null, t.tdee ?? null, t.target_kcal ?? null,
        t.protein_g ?? null, t.carbs_g ?? null, t.fat_g ?? null,
        t.phase ?? null, t.bmr_method ?? null, t.activity_level ?? null,
        t.confidence ?? null, warningsStr,
        t.gdpr_consented ? 1 : 0,
        t.goal ?? null, t.protein_approach ?? null,
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
       gdpr_consented, goal, protein_approach, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId,
      t.bmr ?? null, t.tdee ?? null, t.target_kcal ?? null,
      t.protein_g ?? null, t.carbs_g ?? null, t.fat_g ?? null,
      t.phase ?? null, t.bmr_method ?? null, t.activity_level ?? null,
      t.confidence ?? null, warningsStr,
      t.gdpr_consented ? 1 : 0,
      t.goal ?? null, t.protein_approach ?? null,
      createdAt, updatedAt,
    ],
  );
}

export async function getCoachOutputHistory(userId, limit = 52) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT week_start, output_json FROM coach_outputs
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY week_start DESC LIMIT ?`,
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
  // Last-write-wins: don't let a stale cloud copy clobber a newer local
  // edit. The legacy REPLACE had no guard, so a pull after a failed push
  // (SYNC-1) reverted local workout edits. Only skip when both sides have a
  // timestamp and local is at least as new (matches the migrated-table gate).
  const cloudMs = toMs(w.updated_at);
  const existing = await d.getFirstAsync('SELECT updated_at FROM workouts WHERE id = ?', [w.id]);
  const localMs = existing?.updated_at ?? null;
  if (localMs && cloudMs && localMs >= cloudMs) return;
  // Must stay column-symmetric with _upsertWorkout in sync.js.
  // Missing columns here silently drop user-entered fields on
  // cross-device restore.
  await d.runAsync(
    `INSERT OR REPLACE INTO workouts
      (id, user_id, routine_id, mesocycle_id, mesocycle_week_id,
       started_at, ended_at, duration_minutes,
       notes, name, pre_workout_intent,
       session_difficulty, overall_pump, soreness_24h_before, fatigue_level, joint_discomfort,
       sleep_quality, energy_score,
       set_count, total_volume,
       is_completed, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
    [
      w.id, userId, w.routine_id ?? null, w.mesocycle_id ?? null, w.mesocycle_week_id ?? null,
      // started_at falls back to now when the cloud row carries none, so a
      // restored workout never lands with a NULL/epoch start that renders as a
      // 1970 date in history and lift-progress. ended_at can legitimately be
      // null (an unfinished session), so it keeps no fallback.
      toMs(w.started_at) ?? Date.now(), toMs(w.ended_at), w.duration_minutes ?? null,
      w.notes ?? null, w.name ?? null, w.pre_workout_intent ?? null,
      w.session_difficulty ?? null, w.overall_pump ?? null,
      w.soreness_24h_before ?? null, w.fatigue_level ?? null, w.joint_discomfort ?? null,
      // COMP-008 pre-workout readiness, column-symmetric with _upsertWorkout.
      w.sleep_quality ?? null, w.energy_score ?? null,
      w.set_count ?? null, w.total_volume ?? null,
      toMs(w.started_at) ?? Date.now(), cloudMs ?? Date.now(),
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

// migrateLocalUserId deleted per IDENTITY_AND_OWNERSHIP_LOCKED.md
// rule 5 ("Sign-in path does not call migrateLocalUserId. That
// function is deleted from database.js in this refactor.") and
// anti-patterns section ("migrateLocalUserId or any function that
// updates user_id on existing rows"). Anonymous mode has been
// removed (rule 1), so by spec local SQLite is empty at signup
// time and there is no row that requires re-keying. Cross-user
// contamination on the same device is prevented by the wipe in
// useAppStore.clearAuthStateForSignOut + RootNavigator.

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
  // Last-write-wins, same as insertWorkoutFromCloud: a stale cloud set must
  // not clobber a newer local edit (RIR, notes, post-set ratings).
  const cloudMs = _tsToMs(s.updated_at);
  const existing = await d.getFirstAsync('SELECT updated_at FROM workout_sets WHERE id = ?', [s.id]);
  const localMs = existing?.updated_at ?? null;
  if (localMs && cloudMs && localMs >= cloudMs) return;
  await d.runAsync(
    `INSERT OR REPLACE INTO workout_sets
      (id, user_id, workout_id, exercise_id, exercise_name, set_number, set_type,
       target_reps_min, target_reps_max, actual_reps, weight, rir, rpe,
       failed, notes, post_set_pump, post_set_muscle_connection, joint_discomfort,
       is_amrap, amrap_reps, missed_reps, left_reps, right_reps, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      s.left_reps ?? null, s.right_reps ?? null,
      Date.now(), cloudMs ?? Date.now(),
      s.deleted_at ? new Date(s.deleted_at).getTime() : null,
    ],
  );
}

// ─── Sync helpers for previously local-only tables ────────────────────────
//
// Each helper accepts a raw cloud row (snake_case keys) and writes it
// into the matching local table. INSERT OR REPLACE keeps repeated
// syncs idempotent, re-pulling the same row updates instead of
// double-inserting. Cloud timestamps (ISO strings) are converted to
// the local ms epoch convention.

const _tsToMs = (v) => {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const ms = Date.parse(String(v));
  return Number.isFinite(ms) ? ms : null;
};

// F5/exercise-restore audit (2026-07-09): the INSERT below intentionally
// carries exercise_type but NOT equipment_category, machine_type, force,
// laterality, difficulty, machine_ok, home_ok, cue or equipment_profiles.
// Those eight are canonical-exercise-library metadata, derived locally by
// deriveExerciseMetadata()/updateExerciseMetadata() in seedExercises.js --
// they are never set on a user-created custom exercise (see
// ExercisePickerModal.handleCreate) and never sent to the cloud by
// syncExercises() (sync.js), and neither the cloud `exercises` nor
// `custom_exercises` table has these columns (migrate_020_custom_exercises.sql
// defines custom_exercises' full column list; no later migration adds them).
// Reading them off `e` here would only ever produce null, so they are left
// out on purpose rather than papering over with dead null-coalesces.
// exercise_type IS a real cloud column on both tables (migrate_091) and IS
// user-settable on a custom exercise (createExerciseType), so it round-trips
// here; syncExercises() (sync.js) now pushes it too, so the value survives
// a full sign-out/sign-in cycle end to end.
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
       exercise_category, increment_kg, exercise_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      e.exercise_type ?? 'weight_reps',
    ],
  );
  _invalidateExercisesCache();
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
  // Local table is workout_notes_v2, the v1 schema had a different
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

/**
 * ed_pattern_flags from cloud. Server is authoritative per
 * SYNC_REGISTRY (conflictStrategy=server_wins), so INSERT OR
 * REPLACE: any local edits to the row are stomped by the cloud
 * copy on the next pull. Local writes still go through
 * raise/clear; they reach the cloud via the existing supabase
 * upsert path inside the engine, not through this helper.
 */
/**
 * recipe_ingredients all-rows reader for SYNC. Includes
 * tombstones (deleted_at IS NOT NULL) so the per-table push in
 * src/lib/sync/tables/recipeIngredients.js can ship the delete
 * to the cloud. UI consumers should call
 * getLiveRecipeIngredientsForRecipe instead.
 */
export async function getAllRecipeIngredientsForUser(userId) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM recipe_ingredients WHERE user_id = ? ORDER BY recipe_id, order_index',
    [userId],
  );
  return rows.map(rowToCamel);
}

/**
 * Live (non-deleted) ingredients for one recipe. The recipe-
 * builder UI reads through this so tombstoned rows never appear
 * even though they still live in SQLite for sync.
 */
export async function getLiveRecipeIngredientsForRecipe(userId, recipeId) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM recipe_ingredients
     WHERE user_id = ? AND recipe_id = ? AND deleted_at IS NULL
     ORDER BY order_index`,
    [userId, recipeId],
  );
  return rows.map(rowToCamel);
}

/**
 * Soft-delete an ingredient. Sets deleted_at + updated_at; the
 * row survives in SQLite so the next sync round ships the
 * tombstone to the cloud. Cloud-side then either tombstones
 * (if newer) or revives it (if cloud is newer per LWW).
 */
export async function softDeleteRecipeIngredient(userId, id) {
  if (!id) return;
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `UPDATE recipe_ingredients
     SET deleted_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [now, now, id, userId],
  );
}

/**
 * recipe_ingredients from cloud. Last-write-wins on updated_at;
 * tombstones (deleted_at IS NOT NULL on the cloud row) flow
 * through unchanged. SQLite's INSERT OR REPLACE keeps the local
 * write minimal; the LWW gate is applied by the caller in
 * src/lib/sync/tables/recipeIngredients.js.
 */
export async function upsertRecipeIngredientFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO recipe_ingredients
       (id, recipe_id, food_ref, quantity_g, order_index, created_at,
        updated_at, deleted_at, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.recipe_id ?? null,
      row.food_ref ?? null,
      Number(row.quantity_g) || 0,
      Number(row.order_index) || 0,
      _tsToMs(row.created_at) ?? Date.now(),
      _tsToMs(row.updated_at) ?? Date.now(),
      row.deleted_at ? _tsToMs(row.deleted_at) : null,
      userId,
    ],
  );
}

/**
 * Existing local updated_at for one ingredient. Used by the
 * per-table pull handler to decide whether a cloud row beats
 * what we have locally per the LWW contract. Returns null when
 * the local row doesn't exist (cloud row wins by default).
 */
export async function getRecipeIngredientUpdatedAt(userId, id) {
  if (!id) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT updated_at FROM recipe_ingredients WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return row?.updated_at ?? null;
}

/**
 * Existing local updated_at for one body metric row. Used by
 * src/lib/sync/tables/bodyComposition.js pull handler as the LWW
 * gate: cloud rows older than the local copy are skipped on pull
 * (matches the registry contract conflictStrategy='last_write_wins').
 * Returns null when the local row doesn't exist (cloud wins by
 * default).
 */
export async function getBodyMetricUpdatedAt(userId, id) {
  return bodyMetricsRepository.getBodyMetricUpdatedAt(userId, id);
}

/**
 * Existing local updated_at for one weekly check-in row. Used by
 * src/lib/sync/tables/weeklyCheckins.js pull handler for the same
 * LWW gate as body metrics. Null when the local row doesn't exist.
 */
export async function getWeeklyCheckinUpdatedAt(userId, id) {
  if (!id) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT updated_at FROM weekly_checkins WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return row?.updated_at ?? null;
}

/**
 * tier_history cloud rows mirrored to local SQLite. Server-
 * authoritative per the registry (conflictStrategy=server_wins).
 * The local table is an append-only audit log; the cloud is the
 * source of truth.
 */
export async function upsertTierHistoryFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO tier_history
       (id, user_id, from_tier, to_tier, event_type, occurred_at, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, userId,
      row.from_tier ?? null,
      row.to_tier ?? null,
      row.event_type ?? null,
      _tsToMs(row.occurred_at) ?? Date.now(),
      typeof row.payload_json === 'string'
        ? row.payload_json
        : (row.payload_json ? JSON.stringify(row.payload_json) : null),
      _tsToMs(row.created_at) ?? Date.now(),
    ],
  );
}

export async function upsertEdPatternFlagFromCloud(userId, row) {
  if (!row?.id) return;
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO ed_pattern_flags
       (id, user_id, flag_state, reason, signals_json,
        raised_at, cleared_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, userId,
      row.flag_state ?? 'raised',
      row.reason ?? null,
      typeof row.signals_json === 'string'
        ? row.signals_json
        : (row.signals_json ? JSON.stringify(row.signals_json) : null),
      _tsToMs(row.raised_at) ?? Date.now(),
      row.cleared_at ? _tsToMs(row.cleared_at) : null,
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
// COMP-015: the read side of session autoregulation. Per-muscle "last
// completed session" signals + the latest weekly check-in's sore-muscle flags,
// local only. Returns RAW scales (no mapping); buildSessionAdjustmentInput in
// algorithms.js maps them to the engine's input shape and applies the shared
// muscle-name map. Thin and defensive like getAdaptiveLandmarkHistory; the
// tested logic lives in the pure engine, not here.
export async function getSessionAdjustmentSignals(userId) {
  const d = await db();
  let perMuscle = {};
  try {
    // MAX(w.started_at) with bare columns: SQLite returns the other columns
    // from the row holding that max within each group, i.e. the most recent
    // completed session that trained each primary muscle. Warmups excluded so a
    // warmup-only touch never counts as training the muscle.
    const rows = await d.getAllAsync(
      `SELECT e.primary_muscle AS muscle,
              MAX(w.started_at) AS last_trained_at,
              w.session_difficulty,
              w.overall_pump,
              w.joint_discomfort
       FROM workouts w
       JOIN workout_sets ws ON ws.workout_id = w.id AND ws.set_type != 'warmup'
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE w.user_id = ? AND w.is_completed = 1 AND e.primary_muscle IS NOT NULL
       GROUP BY e.primary_muscle`,
      [userId],
    );
    for (const r of rows) {
      perMuscle[r.muscle] = {
        lastTrainedAt: r.last_trained_at ?? null,
        sessionDifficulty: r.session_difficulty ?? null,
        pump: r.overall_pump ?? null,
        joint: r.joint_discomfort ?? 0,
      };
    }
  } catch (_e) {
    perMuscle = {};
  }

  let checkin = null;
  try {
    const c = await getLatestCheckin(userId);
    if (c) checkin = { soreMuscles: c.soreMuscles ?? null, checkinAt: c.createdAt ?? c.weekStart ?? null };
  } catch (_e) { /* no check-in yet */ }

  return { perMuscle, checkin };
}

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

// ─── ED-pattern flag state machine (Move #2) ─────────────────────────────────

export async function getOpenEdPatternFlag(userId) {
  const d = await db();
  return d.getFirstAsync(
    `SELECT * FROM ed_pattern_flags
     WHERE user_id = ? AND cleared_at IS NULL AND deleted_at IS NULL
     ORDER BY raised_at DESC LIMIT 1`,
    [userId],
  );
}

export async function getRecentEdPatternFlags(userId, limit = 5) {
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM ed_pattern_flags
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY raised_at DESC LIMIT ?`,
    [userId, limit],
  );
  return rows;
}

export async function raiseEdPatternFlag(userId, { reason, signals }) {
  const d = await db();
  const now = Date.now();
  const existing = await getOpenEdPatternFlag(userId);
  if (existing) {
    await d.runAsync(
      `UPDATE ed_pattern_flags SET reason = ?, signals_json = ?, updated_at = ? WHERE id = ?`,
      [reason, JSON.stringify(signals ?? {}), now, existing.id],
    );
    return existing.id;
  }
  const id = uid();
  await d.runAsync(
    `INSERT INTO ed_pattern_flags
       (id, user_id, flag_state, reason, signals_json, raised_at, updated_at)
     VALUES (?, ?, 'raised', ?, ?, ?, ?)`,
    [id, userId, reason, JSON.stringify(signals ?? {}), now, now],
  );
  return id;
}

export async function clearEdPatternFlag(userId) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `UPDATE ed_pattern_flags
     SET flag_state = 'cleared', cleared_at = ?, updated_at = ?
     WHERE user_id = ? AND cleared_at IS NULL AND deleted_at IS NULL`,
    [now, now, userId],
  );
}

// ─── Goal lock (Move #2) ─────────────────────────────────────────────────────

export async function setGoalLockAdvanced(userId, advanced) {
  const d = await db();
  const now = Date.now();
  await d.runAsync(
    `UPDATE user_body_profile
     SET goal_lock_advanced = ?, goal_lock_set_at = ?, updated_at = ?
     WHERE user_id = ?`,
    [advanced ? 1 : 0, now, now, userId],
  );
}

export async function getGoalLockAdvanced(userId) {
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT goal_lock_advanced FROM user_body_profile WHERE user_id = ?`,
    [userId],
  );
  return !!(row?.goal_lock_advanced);
}

// ─── Engine telemetry (Move #3) ──────────────────────────────────────────────

export async function recordEngineTelemetry(userId, event, payload = null) {
  if (!userId || !event) return null;
  const d = await db();
  const id = uid();
  const now = Date.now();
  await d.runAsync(
    `INSERT INTO engine_telemetry (id, user_id, event, payload_json, occurred_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, event, payload ? JSON.stringify(payload) : null, now],
  );
  return id;
}

// Scoped to a single user_id. Telemetry rows are stamped server-side with
// the caller's auth.uid() on push, so a flush must only ever read rows that
// belong to the currently signed-in user. Reading every unpushed row (the old
// behaviour) let one account's leftover rows ship under the next account that
// signs in on the same device. A falsy userId returns nothing rather than
// every row, so a missing session can't reopen that hole.
export async function getUnpushedEngineTelemetry(userId, limit = 200) {
  if (!userId) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM engine_telemetry WHERE user_id = ? AND pushed_at IS NULL ORDER BY occurred_at ASC LIMIT ?`,
    [userId, limit],
  );
  return rows;
}

export async function markEngineTelemetryPushed(ids) {
  if (!ids?.length) return;
  const d = await db();
  const now = Date.now();
  const placeholders = ids.map(() => '?').join(',');
  await d.runAsync(
    `UPDATE engine_telemetry SET pushed_at = ? WHERE id IN (${placeholders})`,
    [now, ...ids],
  );
}

// ─── Sync diagnostics (one-shot, read-only) ──────────────────────────────────

/**
 * Counts rows per user_id across every user-scoped local table. Used
 * to diagnose RLS-rejection cascades on push -- a healthy local DB
 * has every user_id column matching the current auth.uid; anything
 * else is bad data that will either fail to sync (different uid in
 * cloud) or syncs but accumulates noise.
 *
 * Read-only. Returns a structured report the caller can render or log.
 */
export async function diagnoseSyncConflicts(currentSessionUid) {
  const d = await db();
  const tables = [
    'workouts', 'workout_sets', 'routines', 'routine_exercises', 'programmes',
    'mesocycles', 'mesocycle_weeks', 'planned_muscle_volume', 'adaptation_events',
    'nutrition_targets', 'body_metric_log', 'morning_weights',
    'weekly_checkins', 'coach_outputs', 'user_body_profile',
    'user_insights', 'peak_week_plans', 'exercise_user_notes',
    'exercise_goals', 'workout_notes_v2',
    'custom_exercises', 'meal_plans',
    'custom_foods', 'food_entries', 'daily_intake_rollups',
    'saved_meals', 'recipes', 'food_favourites', 'daily_water',
    'daily_steps',
    'pending_sync_ops',
  ];
  const report = {
    currentSessionUid: currentSessionUid ?? null,
    tables: {},
    summary: { totalRowsUnderForeignUids: 0, distinctForeignUids: new Set() },
  };
  for (const table of tables) {
    try {
      // routine_exercises has no user_id column -- join through routines.
      const isJoinTable = table === 'routine_exercises';
      const sql = isJoinTable
        ? `SELECT r.user_id AS user_id, COUNT(*) AS n
           FROM routine_exercises re
           LEFT JOIN routines r ON r.id = re.routine_id
           GROUP BY r.user_id
           ORDER BY n DESC`
        : `SELECT user_id, COUNT(*) AS n FROM ${table} GROUP BY user_id ORDER BY n DESC`;
      const rows = await d.getAllAsync(sql);
      const buckets = rows.map(r => ({
        userId: r.user_id ?? null,
        rowCount: r.n ?? 0,
        isCurrent: r.user_id === currentSessionUid,
      }));
      report.tables[table] = buckets;
      for (const b of buckets) {
        if (b.userId && !b.isCurrent) {
          report.summary.totalRowsUnderForeignUids += b.rowCount;
          report.summary.distinctForeignUids.add(b.userId);
        }
      }
    } catch (e) {
      report.tables[table] = [{ error: e?.message ?? 'query failed' }];
    }
  }
  report.summary.distinctForeignUids = Array.from(report.summary.distinctForeignUids);
  return report;
}
