/** F-05/F-06 behavioral backup truth, completeness and round-trip tests. */

const { DatabaseSync } = require('node:sqlite');
const {
  BACKUP_TABLES,
  BACKUP_TABLE_DISPOSITION,
  WIPE_DIRECT_TABLES,
  dumpAllTablesFromDb,
  restoreAllTablesIntoDb,
} = require('../database');

const USER = 'user-a';
const INDIRECT = new Set(['planned_muscle_volume', 'adaptation_events']);

test('every known direct owner table has an authoritative backup disposition', () => {
  const classified = new Set([
    ...BACKUP_TABLES,
    ...Object.keys(BACKUP_TABLE_DISPOSITION.cloudReconstructed),
    ...Object.keys(BACKUP_TABLE_DISPOSITION.transient),
    ...Object.keys(BACKUP_TABLE_DISPOSITION.preferenceBacked),
  ]);
  expect(WIPE_DIRECT_TABLES.filter((table) => !classified.has(table))).toEqual([]);
  expect(BACKUP_TABLES).toEqual(expect.arrayContaining([
    'custom_exercises', 'exercise_user_notes', 'exercise_goals',
    'workout_notes', 'plan_folders', 'session_resolutions',
    'progress_scan_classification_history',
  ]));
});

function adapt(raw, failReadTable = null) {
  return {
    execAsync: async (sql) => raw.exec(String(sql)),
    getAllAsync: async (sql, params = []) => {
      if (failReadTable && new RegExp(`(?:FROM|table_info\\()\\s*${failReadTable}\\b`, 'i').test(sql)) {
        throw new Error(`injected read failure for ${failReadTable}`);
      }
      return raw.prepare(sql).all(...params);
    },
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
    withTransactionAsync: async (fn) => {
      raw.exec('BEGIN');
      try { await fn(); raw.exec('COMMIT'); }
      catch (error) { raw.exec('ROLLBACK'); throw error; }
    },
    isInTransactionSync: () => raw.isTransaction,
  };
}

function extraColumns(table) {
  const columns = {
    workout_sets: 'workout_id TEXT, exercise_id TEXT',
    routine_exercises: 'routine_id TEXT, exercise_id TEXT',
    mesocycle_weeks: 'mesocycle_id TEXT',
    planned_muscle_volume: 'mesocycle_week_id TEXT',
    adaptation_events: 'mesocycle_week_id TEXT, exercise_id TEXT',
    recipe_ingredients: 'recipe_id TEXT',
    progress_scan_assets: 'scan_id TEXT',
    workout_notes_v2: 'workout_id TEXT',
    session_constraint_effects: 'workout_id TEXT',
    session_resolutions: 'mesocycle_week_id TEXT, routine_id TEXT, workout_id TEXT',
  };
  return columns[table] ? `, ${columns[table]}` : '';
}

function buildFixture() {
  const raw = new DatabaseSync(':memory:');
  for (const table of BACKUP_TABLES) {
    const owner = INDIRECT.has(table) ? '' : ', user_id TEXT NOT NULL';
    raw.exec(`CREATE TABLE ${table} (id TEXT PRIMARY KEY${owner}${extraColumns(table)})`);
  }
  raw.exec('PRAGMA user_version = 101');

  const ids = Object.fromEntries(BACKUP_TABLES.map((table) => [table, `${table}-id`]));
  for (const table of BACKUP_TABLES) {
    const columns = ['id'];
    const values = [ids[table]];
    if (!INDIRECT.has(table)) { columns.push('user_id'); values.push(USER); }
    const refs = {
      workout_sets: { workout_id: ids.workouts, exercise_id: 'canonical-exercise' },
      routine_exercises: { routine_id: ids.routines, exercise_id: 'canonical-exercise' },
      mesocycle_weeks: { mesocycle_id: ids.mesocycles },
      planned_muscle_volume: { mesocycle_week_id: ids.mesocycle_weeks },
      adaptation_events: { mesocycle_week_id: ids.mesocycle_weeks, exercise_id: null },
      recipe_ingredients: { recipe_id: ids.recipes },
      progress_scan_assets: { scan_id: ids.progress_scan_sessions },
      workout_notes_v2: { workout_id: ids.workouts },
      session_constraint_effects: { workout_id: ids.workouts },
      session_resolutions: {
        mesocycle_week_id: ids.mesocycle_weeks,
        routine_id: ids.routines,
        workout_id: ids.workouts,
      },
    }[table] || {};
    for (const [column, value] of Object.entries(refs)) { columns.push(column); values.push(value); }
    const placeholders = columns.map(() => '?').join(',');
    raw.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`).run(...values);
  }
  return raw;
}

test.each(BACKUP_TABLES)('a failed %s read aborts the whole export instead of serializing []', async (table) => {
  const raw = buildFixture();
  await expect(dumpAllTablesFromDb(adapt(raw, table), USER)).rejects.toMatchObject({ backupTable: table });
  raw.close();
});

test('PRAGMA user_version failure aborts rather than inventing schema version zero', async () => {
  const raw = buildFixture();
  const d = adapt(raw);
  d.getFirstAsync = async () => { throw new Error('injected PRAGMA failure'); };
  await expect(dumpAllTablesFromDb(d, USER)).rejects.toMatchObject({ backupTable: 'PRAGMA user_version' });
  raw.close();
});

test('every current included table completes an owner-bound round-trip', async () => {
  const raw = buildFixture();
  const d = adapt(raw);
  const dump = await dumpAllTablesFromDb(d, USER);
  expect(Object.keys(dump.tables)).toEqual(BACKUP_TABLES);
  for (const table of BACKUP_TABLES) {
    expect(dump.tables[table]).toHaveLength(1);
    expect(dump.tables[table][0].user_id).toBe(USER);
  }

  await restoreAllTablesIntoDb(d, dump, USER);
  for (const table of BACKUP_TABLES) {
    expect(raw.prepare(`SELECT count(*) AS n FROM ${table}`).get().n).toBe(1);
  }
  raw.close();
});

test('a missing table makes the snapshot non-destructive and invalid', async () => {
  const raw = buildFixture();
  const d = adapt(raw);
  const dump = await dumpAllTablesFromDb(d, USER);
  delete dump.tables.custom_exercises;
  await expect(restoreAllTablesIntoDb(d, dump, USER)).rejects.toThrow(/incomplete.*custom_exercises/i);
  expect(raw.prepare('SELECT count(*) AS n FROM workouts').get().n).toBe(1);
  raw.close();
});

test('a broken child reference is rejected before destructive mutation', async () => {
  const raw = buildFixture();
  const d = adapt(raw);
  const dump = await dumpAllTablesFromDb(d, USER);
  dump.tables.workout_sets[0].workout_id = 'missing-workout';
  await expect(restoreAllTablesIntoDb(d, dump, USER)).rejects.toThrow(/workout_sets\.workout_id/);
  expect(raw.prepare('SELECT id FROM workouts').get().id).toBe('workouts-id');
  raw.close();
});
