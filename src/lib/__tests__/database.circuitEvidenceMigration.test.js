/**
 * Exercise library expansion 2026-09-05, EL-9/EL-7 (database.js
 * SCHEMA_MIGRATIONS tail): two nullable columns on routine_exercises
 * (group_kind, round_rest_seconds) and one on workout_sets
 * (evidence_class). No backfill - every pre-migration row must read as
 * NULL (ordinary superset/no-group; conventional evidence), byte-identical
 * to today.
 *
 * BEHAVIOURAL, real SQLite (node:sqlite), same harness as
 * database.demandMetadataMigration.test.js. Pins:
 *  - a pre-migration database upgrades cleanly with every existing row's
 *    new columns NULL;
 *  - the migration is idempotent (a second run changes nothing and throws
 *    on neither run);
 *  - the columns round-trip a written value (the write functions this
 *    migration exists to support carry them correctly).
 *
 * 2026-09-05 (EL-14/EL-19, appended immediately after this migration):
 * exercises.aliases/load_character now runs alongside this migration in
 * the "last 2" window, so the fixture also carries a minimal exercises
 * table (that ALTER is a no-op against it).
 */
const { DatabaseSync } = require('node:sqlite');
const { runMigrations, CURRENT_SCHEMA_VERSION } = require('../database');

jest.mock('expo-sqlite');

function adapt(raw) {
  return {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
  };
}

function freshDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE routine_exercises (
    id TEXT PRIMARY KEY, routine_id TEXT, exercise_id TEXT,
    order_in_routine INTEGER, recommended_sets INTEGER, updated_at INTEGER
  )`);
  raw.exec(`CREATE TABLE workout_sets (
    id TEXT PRIMARY KEY, user_id TEXT, workout_id TEXT, exercise_id TEXT,
    set_type TEXT DEFAULT 'straight', updated_at INTEGER
  )`);
  raw.exec(`CREATE TABLE exercises (
    id TEXT PRIMARY KEY, name TEXT, primary_muscle TEXT, equipment TEXT,
    is_custom INTEGER DEFAULT 0
  )`);
  raw.prepare('INSERT INTO routine_exercises (id, routine_id, exercise_id, order_in_routine, recommended_sets, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('re-1', 'routine-1', 'ex-squat', 0, 3, 111);
  raw.prepare('INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_type, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('set-1', 'user-1', 'workout-1', 'ex-squat', 'straight', 222);
  return raw;
}

async function runLast(raw, count) {
  raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - count}`);
  await runMigrations(adapt(raw));
  return CURRENT_SCHEMA_VERSION;
}

test('a pre-migration database upgrades: existing rows read NULL on every new column', async () => {
  const raw = freshDb();
  await runLast(raw, 2);

  const re = raw.prepare('SELECT group_kind, round_rest_seconds, updated_at FROM routine_exercises WHERE id = ?').get('re-1');
  expect(re.group_kind).toBeNull();
  expect(re.round_rest_seconds).toBeNull();
  expect(re.updated_at).toBe(111); // no backfill touches existing rows

  const set = raw.prepare('SELECT evidence_class, updated_at FROM workout_sets WHERE id = ?').get('set-1');
  expect(set.evidence_class).toBeNull();
  expect(set.updated_at).toBe(222);
});

test('is idempotent: a second run changes nothing and errors on neither run', async () => {
  const raw = freshDb();
  const total = await runLast(raw, 2);
  const before = {
    re: raw.prepare('SELECT * FROM routine_exercises WHERE id = ?').get('re-1'),
    set: raw.prepare('SELECT * FROM workout_sets WHERE id = ?').get('set-1'),
  };

  raw.exec(`PRAGMA user_version = ${total - 2}`);
  await expect(runMigrations(adapt(raw))).resolves.not.toThrow();

  expect(raw.prepare('SELECT * FROM routine_exercises WHERE id = ?').get('re-1')).toEqual(before.re);
  expect(raw.prepare('SELECT * FROM workout_sets WHERE id = ?').get('set-1')).toEqual(before.set);
});

test('the new columns round-trip a written value (group_kind/round_rest_seconds/evidence_class)', async () => {
  const raw = freshDb();
  await runLast(raw, 2);

  raw.prepare('UPDATE routine_exercises SET group_kind = ?, round_rest_seconds = ? WHERE id = ?')
    .run('circuit', 90, 're-1');
  raw.prepare('UPDATE workout_sets SET evidence_class = ? WHERE id = ?')
    .run('circuit_ballistic', 'set-1');

  const re = raw.prepare('SELECT group_kind, round_rest_seconds FROM routine_exercises WHERE id = ?').get('re-1');
  expect(re).toEqual({ group_kind: 'circuit', round_rest_seconds: 90 });

  const set = raw.prepare('SELECT evidence_class FROM workout_sets WHERE id = ?').get('set-1');
  expect(set.evidence_class).toBe('circuit_ballistic');
});
