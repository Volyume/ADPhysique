/**
 * database.coachOutputReid.test.js — C6 S-15 (D97-23): local migration
 * v72 re-ids legacy coach_outputs rows to the deterministic
 * co_<week_start>_<user_id> form saveCoachOutput mints, so every
 * device's cloud upsert converges on ONE (user_id, id) per week and the
 * corrected cloud migration 135's unique index can never permanently
 * poison a device's batch push.
 *
 * BEHAVIOURAL: runs the real SCHEMA_MIGRATIONS pipeline against a real
 * in-memory SQLite (node:sqlite), same harness as
 * database.bicepsSubregion.test.js. If a later migration appends to the
 * array, bump the runLastMigrations counts per that file's convention.
 */

const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('../database');

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

function fakeProbeDb() {
  let version = 0;
  return {
    getFirstAsync: async (sql) => (/user_version/i.test(String(sql)) ? { user_version: version } : null),
    getAllAsync: async () => [],
    runAsync: async () => ({}),
    execAsync: async (sql) => {
      const m = /PRAGMA user_version = (\d+)/.exec(String(sql));
      if (m) version = Number(m[1]);
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    get _version() { return version; },
  };
}

async function totalMigrationCount() {
  const probe = fakeProbeDb();
  await runMigrations(probe);
  return probe._version;
}

function freshDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE coach_outputs (id TEXT PRIMARY KEY, user_id TEXT, week_start INTEGER, applied INTEGER, created_at INTEGER, updated_at INTEGER);`);
  // Campaign 16 job 3 appended a migration that re-tags exercise subregions.
  // The window this fixture runs now includes it, so the table it targets has
  // to exist here as it always does on a real device. Empty is enough: the
  // migration is metadata-only and this suite asserts nothing about it.
  // C16 job 10 (v76) adds a column to routine_exercises, so the fixture has
  // to declare the table this migration list touches.
  raw.exec('CREATE TABLE routine_exercises (id TEXT PRIMARY KEY, routine_id TEXT, exercise_id TEXT);');
  raw.exec(`CREATE TABLE exercises (id TEXT PRIMARY KEY, name TEXT, primary_muscle TEXT, subregion TEXT);`);
  // C18 block progression widened this window by two, which pulls a migration
  // touching exercise_swaps into range. Same reasoning as the tables above:
  // it exists on a real device, and empty is enough because this suite
  // asserts nothing about it.
  raw.exec('CREATE TABLE exercise_swaps (id TEXT PRIMARY KEY, user_id TEXT, from_exercise_id TEXT, to_exercise_id TEXT, scope TEXT, created_at INTEGER, updated_at INTEGER, deleted_at INTEGER);');
  // C18 adds the progression anchor column to mesocycles.
  raw.exec('CREATE TABLE mesocycles (id TEXT PRIMARY KEY, user_id TEXT, planned_weeks INTEGER, deload_week INTEGER);');
  return raw;
}

async function runLast(raw, count) {
  const total = await totalMigrationCount();
  raw.exec(`PRAGMA user_version = ${total - count}`);
  await runMigrations(adapt(raw));
  return total;
}

const rows = (raw) => raw.prepare('SELECT id, user_id, week_start, updated_at FROM coach_outputs ORDER BY week_start').all();

test('v72 re-ids legacy uid() rows to the deterministic form, without touching updated_at', () => {
  const raw = freshDb();
  raw.prepare('INSERT INTO coach_outputs VALUES (?, ?, ?, ?, ?, ?)')
    .run('legacy-abc', 'user-1', 1735000000000, 1, 100, 200);
  raw.prepare('INSERT INTO coach_outputs VALUES (?, ?, ?, ?, ?, ?)')
    .run('co_1734000000000_user-1', 'user-1', 1734000000000, 0, 90, 90);
  // C18 block progression appended two migrations and Campaign 19 appended
  // the memo plus its audit remediation, so this window widens by four to
  // keep testing the SAME v72 migration rather than a later pair.
  return runLast(raw, 11).then(() => {
    const after = rows(raw);
    expect(after).toEqual([
      // Already deterministic: byte-identical.
      { id: 'co_1734000000000_user-1', user_id: 'user-1', week_start: 1734000000000, updated_at: 90 },
      // Legacy: re-idded; updated_at untouched (honest timestamps, F5).
      { id: 'co_1735000000000_user-1', user_id: 'user-1', week_start: 1735000000000, updated_at: 200 },
    ]);
  });
});

test('v72 is idempotent: a second run changes nothing', async () => {
  const raw = freshDb();
  raw.prepare('INSERT INTO coach_outputs VALUES (?, ?, ?, ?, ?, ?)')
    .run('legacy-abc', 'user-1', 1735000000000, 1, 100, 200);
  await runLast(raw, 11); // widened by four, C18 + Campaign 19 remediation
  const once = rows(raw);
  raw.exec(`PRAGMA user_version = ${(await totalMigrationCount()) - 10}`);
  await runMigrations(adapt(raw));
  expect(rows(raw)).toEqual(once);
});

test('the deterministic form matches what saveCoachOutput mints (contract lock)', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
  expect(src).toMatch(/const id = `co_\$\{data\.weekStart\}_\$\{userId\}`;/);
});
