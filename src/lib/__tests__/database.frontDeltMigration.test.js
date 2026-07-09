/**
 * SCHEMA_MIGRATIONS v62 - front-delt muscle-taxonomy correction (plan-D,
 * docs/exercise-planning-2026-07-09/plan-D-intelligent-supersets.md section
 * 1b, Q1 founder-confirmed). Migration v2 (database.js :411-429) mistagged
 * "Machine Shoulder Press" and generic "Shoulder Press" as side_delts; correct
 * is front_delts (an overhead push, matching Overhead Press / Military Press
 * / Arnold Press / Seated Dumbbell Press). v2 already ran on every device and
 * is not safe to edit in place, so v62 is a new, additive, idempotent
 * correction.
 *
 * Run against a REAL SQLite (node:sqlite, Node 22), following the pattern
 * src/lib/food/__tests__/localCacheFts.test.js uses, so the UPDATE actually
 * executes and is verified against real rows rather than a string match on
 * the migration source. Only the `exercises` table is created: runMigrations
 * is driven starting one version below the array's top, so only the LAST
 * migration entry (v62) executes and no earlier migration touches tables
 * that don't exist here.
 */

const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('../database');

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

// Fake db (no real SQL execution) purely to discover SCHEMA_MIGRATIONS'
// current length, matching the technique in migrations.cardioLog.test.js:
// probe from version 0 and read the final PRAGMA user_version the runner
// sets, which equals SCHEMA_MIGRATIONS.length.
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

function freshExercisesDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    primary_muscle TEXT
  );`);
  return raw;
}

function seedRows(raw) {
  const rows = [
    ['ex-1', 'Machine Shoulder Press', 'side_delts'],   // the mistagged pair
    ['ex-2', 'Shoulder Press', 'side_delts'],
    ['ex-3', 'Dumbbell Shoulder Press', 'front_delts'], // already correct, must not move
    ['ex-4', 'Plate-Loaded Shoulder Press', 'side_delts'], // out of scope: name-exact, left as-is
    ['ex-5', 'Dumbbell Lateral Raise', 'side_delts'],   // genuinely side-delt, must not move
    ['ex-6', 'Upright Row', 'side_delts'],              // genuinely side-delt, must not move
  ];
  for (const [id, name, muscle] of rows) {
    raw.prepare('INSERT INTO exercises (id, name, primary_muscle) VALUES (?, ?, ?)').run(id, name, muscle);
  }
}

async function runOnlyLastMigration(raw) {
  const total = await totalMigrationCount();
  raw.exec(`PRAGMA user_version = ${total - 1}`); // stand one migration short of the top
  const d = adapt(raw);
  await runMigrations(d);
  return total;
}

describe('SCHEMA_MIGRATIONS v62: front-delt muscle-taxonomy correction', () => {
  test('re-tags Machine Shoulder Press and generic Shoulder Press to front_delts', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    await runOnlyLastMigration(raw);

    const machine = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-1');
    const generic = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-2');
    expect(machine.primary_muscle).toBe('front_delts');
    expect(generic.primary_muscle).toBe('front_delts');
  });

  test('is exactly scoped by name: does not touch Dumbbell Shoulder Press, Plate-Loaded Shoulder Press, Dumbbell Lateral Raise, or Upright Row', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    await runOnlyLastMigration(raw);

    const untouched = ['ex-3', 'ex-4', 'ex-5', 'ex-6'];
    for (const id of untouched) {
      const before = { 'ex-3': 'front_delts', 'ex-4': 'side_delts', 'ex-5': 'side_delts', 'ex-6': 'side_delts' }[id];
      const row = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get(id);
      expect(row.primary_muscle).toBe(before);
    }
  });

  test('is idempotent: running the migration a second time leaves the corrected rows unchanged and errors on neither run', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    const total = await runOnlyLastMigration(raw);

    // Re-run the exact same migration set (simulating a second boot that
    // still sees the pre-migration version, e.g. a restored snapshot) by
    // resetting user_version back one step and running again.
    raw.exec(`PRAGMA user_version = ${total - 1}`);
    const d = adapt(raw);
    await expect(runMigrations(d)).resolves.not.toThrow();

    const machine = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-1');
    const generic = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-2');
    expect(machine.primary_muscle).toBe('front_delts');
    expect(generic.primary_muscle).toBe('front_delts');
  });

  test('an install already at the top version (already corrected) runs nothing further', async () => {
    const raw = freshExercisesDb();
    // Seed already-correct rows, as a device that already ran v62 would have.
    raw.prepare('INSERT INTO exercises (id, name, primary_muscle) VALUES (?, ?, ?)').run('ex-1', 'Machine Shoulder Press', 'front_delts');
    const total = await totalMigrationCount();
    raw.exec(`PRAGMA user_version = ${total}`);
    const d = adapt(raw);
    await expect(runMigrations(d)).resolves.not.toThrow();
    const machine = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-1');
    expect(machine.primary_muscle).toBe('front_delts');
  });
});
