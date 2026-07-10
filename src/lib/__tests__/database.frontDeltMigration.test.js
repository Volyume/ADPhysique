/**
 * SCHEMA_MIGRATIONS v62 + v63 - front-delt muscle-taxonomy corrections
 * (plan-D, docs/exercise-planning-2026-07-09/plan-D-intelligent-supersets.md
 * section 1b, Q1 founder-confirmed; v63 extends the same ruling per
 * docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md D14 Group A).
 * Migration v2 (database.js :411-429) mistagged "Machine Shoulder Press",
 * generic "Shoulder Press", "Viking Press" and "Plate-Loaded Shoulder Press"
 * as side_delts; correct is front_delts (an overhead push, matching Overhead
 * Press / Military Press / Arnold Press / Seated Dumbbell Press). v2 already
 * ran on every device and is not safe to edit in place. v62 closed the first
 * two names; v63 (this extension) closes the remaining two that v62
 * deliberately left out of scope by exact name.
 *
 * Run against a REAL SQLite (node:sqlite, Node 22), following the pattern
 * src/lib/food/__tests__/localCacheFts.test.js uses, so the UPDATE actually
 * executes and is verified against real rows rather than a string match on
 * the migration source. Only the `exercises` table is created.
 *
 * Isolation note (original, pre-v64): runMigrations always runs from the
 * given starting version through to the true end of SCHEMA_MIGRATIONS (it
 * has no "stop early" option), so once v63 sat after v62, isolating v62
 * alone by starting one version below the array's top was no longer
 * possible -- that offset ran v63 as well. Both migrations only ever touch
 * the `exercises` table (created fresh in every test here, so no earlier
 * migration can break on a missing table), so the v62 tests originally ran
 * the last TWO migrations together via `runLastMigrations(raw, 2)`; the
 * v63-only tests used `runLastMigrations(raw, 1)`, which correctly isolated
 * v63 as the true last entry.
 *
 * v64 addendum (D8 residue fix, 2026-07-09, biceps subregion tags): the same
 * drift happens again now that v64 (`subregion` UPDATEs, scoped to
 * primary_muscle = 'biceps') lands after v63. v64 shares the `exercises`
 * table with v62/v63 and only needs a `subregion` column added to
 * `freshExercisesDb` (a no-op UPDATE against these delt-press seed rows,
 * none of which are biceps), so isolating v63 alone is no longer possible
 * either: the v62 block below now runs the last THREE migrations
 * (`runLastMigrations(raw, 3)`) and the v63 block runs the last TWO
 * (`runLastMigrations(raw, 2)`), asserting the same end states as before.
 * v64's own dedicated coverage lives in database.bicepsSubregion.test.js.
 *
 * v65 addendum (D18, 2026-07-09, progress-scan classification history): another
 * migration lands after v64, shifting every offset by one more. It only
 * CREATE TABLE IF NOT EXISTS an unrelated table, inert against the delt-press
 * seed rows here. The v62 block now runs the last FOUR migrations
 * (`runLastMigrations(raw, 4)`) and the v63 block the last THREE
 * (`runLastMigrations(raw, 3)`), asserting the same end states as before.
 *
 * v66 addendum (Ultimate-Audit item 12, 2026-07-10, raw/cooked weight-state):
 * another migration lands after v65 and, unlike v65, is NOT inert against a
 * fixture missing its table -- it ALTERs food_entries, which this file never
 * created. freshExercisesDb now also creates a minimal food_entries table so
 * the ALTER succeeds harmlessly (no exercises row is affected). The v62 block
 * runs the last FIVE migrations (`runLastMigrations(raw, 5)`) and the v63
 * block the last FOUR (`runLastMigrations(raw, 4)`), asserting the same end
 * states as before.
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
  // subregion is unused by v62/v63 but v64 (biceps subregion tags) now runs
  // alongside them in this file's "last N migrations" harness, and its
  // UPDATE targets that column.
  raw.exec(`CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    primary_muscle TEXT,
    subregion TEXT
  );`);
  // v66 (Ultimate-Audit item 12) now also runs alongside v62/v63 in this same
  // harness and ALTERs food_entries, which no earlier migration in this
  // file's fixture needed; a minimal table is enough for the ALTER to
  // succeed (no exercises row is affected).
  raw.exec(`CREATE TABLE food_entries (id TEXT PRIMARY KEY);`);
  return raw;
}

function seedRows(raw) {
  const rows = [
    ['ex-1', 'Machine Shoulder Press', 'side_delts'],   // the mistagged pair (v62 scope)
    ['ex-2', 'Shoulder Press', 'side_delts'],
    ['ex-3', 'Dumbbell Shoulder Press', 'front_delts'], // already correct, must not move
    ['ex-4', 'Plate-Loaded Shoulder Press', 'side_delts'], // out of v62's OWN scope (name-exact); v63 below closes this
    ['ex-5', 'Dumbbell Lateral Raise', 'side_delts'],   // genuinely side-delt, must not move
    ['ex-6', 'Upright Row', 'side_delts'],              // genuinely side-delt, must not move
  ];
  for (const [id, name, muscle] of rows) {
    raw.prepare('INSERT INTO exercises (id, name, primary_muscle) VALUES (?, ?, ?)').run(id, name, muscle);
  }
}

function seedRowsV63(raw) {
  const rows = [
    ['ex-1', 'Viking Press', 'side_delts'],                // the mistagged pair (v63 scope)
    ['ex-2', 'Plate-Loaded Shoulder Press', 'side_delts'],  // the mistagged pair (v63 scope)
    ['ex-3', 'Machine Shoulder Press', 'front_delts'],      // already corrected by v62, must not move
    ['ex-4', 'Dumbbell Shoulder Press', 'front_delts'],     // already correct, must not move
    ['ex-5', 'Dumbbell Lateral Raise', 'side_delts'],       // genuinely side-delt, must not move
    ['ex-6', 'Upright Row', 'side_delts'],                  // genuinely side-delt, must not move
  ];
  for (const [id, name, muscle] of rows) {
    raw.prepare('INSERT INTO exercises (id, name, primary_muscle) VALUES (?, ?, ?)').run(id, name, muscle);
  }
}

// Generalises the old "run only the last migration" helper to run the last
// `count` migrations (see the isolation note in the file header for why v62
// now needs count=2 while v63 stays at count=1).
async function runLastMigrations(raw, count) {
  const total = await totalMigrationCount();
  raw.exec(`PRAGMA user_version = ${total - count}`);
  const d = adapt(raw);
  await runMigrations(d);
  return total;
}

describe('SCHEMA_MIGRATIONS v62 (+ v63 alongside it): front-delt muscle-taxonomy correction', () => {
  test('re-tags Machine Shoulder Press and generic Shoulder Press to front_delts', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    await runLastMigrations(raw, 5);

    const machine = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-1');
    const generic = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-2');
    expect(machine.primary_muscle).toBe('front_delts');
    expect(generic.primary_muscle).toBe('front_delts');
  });

  test('is exactly scoped by name: does not touch Dumbbell Shoulder Press, Dumbbell Lateral Raise, or Upright Row', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    await runLastMigrations(raw, 5);

    const untouched = ['ex-3', 'ex-5', 'ex-6'];
    for (const id of untouched) {
      const before = { 'ex-3': 'front_delts', 'ex-5': 'side_delts', 'ex-6': 'side_delts' }[id];
      const row = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get(id);
      expect(row.primary_muscle).toBe(before);
    }
  });

  // v62 alone left this exact name out of its own scope (see the seedRows
  // comment above). v63 cannot be isolated away from v62 any more (the file
  // header explains why), so this pins the combined, real-world end state:
  // by the time both have run on a device, Plate-Loaded Shoulder Press is
  // correctly front_delts too.
  test('Plate-Loaded Shoulder Press, out of v62\'s own scope, is retagged once v63 runs alongside it', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    await runLastMigrations(raw, 5);

    const plateLoaded = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-4');
    expect(plateLoaded.primary_muscle).toBe('front_delts');
  });

  test('is idempotent: running the migrations a second time leaves the corrected rows unchanged and errors on neither run', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    const total = await runLastMigrations(raw, 5);

    // Re-run the exact same migration set (simulating a second boot that
    // still sees the pre-migration version, e.g. a restored snapshot) by
    // resetting user_version back to before both and running again.
    raw.exec(`PRAGMA user_version = ${total - 4}`);
    const d = adapt(raw);
    await expect(runMigrations(d)).resolves.not.toThrow();

    const machine = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-1');
    const generic = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-2');
    expect(machine.primary_muscle).toBe('front_delts');
    expect(generic.primary_muscle).toBe('front_delts');
  });

  test('an install already at the top version (already corrected) runs nothing further', async () => {
    const raw = freshExercisesDb();
    // Seed already-correct rows, as a device that already ran v62+v63 would have.
    raw.prepare('INSERT INTO exercises (id, name, primary_muscle) VALUES (?, ?, ?)').run('ex-1', 'Machine Shoulder Press', 'front_delts');
    const total = await totalMigrationCount();
    raw.exec(`PRAGMA user_version = ${total}`);
    const d = adapt(raw);
    await expect(runMigrations(d)).resolves.not.toThrow();
    const machine = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-1');
    expect(machine.primary_muscle).toBe('front_delts');
  });
});

describe('SCHEMA_MIGRATIONS v63: extends the front-delt correction to Viking Press and Plate-Loaded Shoulder Press', () => {
  test('re-tags Viking Press and Plate-Loaded Shoulder Press to front_delts', async () => {
    const raw = freshExercisesDb();
    seedRowsV63(raw);
    await runLastMigrations(raw, 4); // v63 is the true last migration

    const viking = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-1');
    const plateLoaded = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-2');
    expect(viking.primary_muscle).toBe('front_delts');
    expect(plateLoaded.primary_muscle).toBe('front_delts');
  });

  test('is exactly scoped by name: does not touch Machine Shoulder Press (already corrected by v62), Dumbbell Shoulder Press, Dumbbell Lateral Raise, or Upright Row', async () => {
    const raw = freshExercisesDb();
    seedRowsV63(raw);
    await runLastMigrations(raw, 4);

    const untouched = ['ex-3', 'ex-4', 'ex-5', 'ex-6'];
    for (const id of untouched) {
      const before = { 'ex-3': 'front_delts', 'ex-4': 'front_delts', 'ex-5': 'side_delts', 'ex-6': 'side_delts' }[id];
      const row = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get(id);
      expect(row.primary_muscle).toBe(before);
    }
  });

  test('is idempotent: running the migration a second time leaves the corrected rows unchanged and errors on neither run', async () => {
    const raw = freshExercisesDb();
    seedRowsV63(raw);
    const total = await runLastMigrations(raw, 4);

    raw.exec(`PRAGMA user_version = ${total - 3}`);
    const d = adapt(raw);
    await expect(runMigrations(d)).resolves.not.toThrow();

    const viking = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-1');
    const plateLoaded = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-2');
    expect(viking.primary_muscle).toBe('front_delts');
    expect(plateLoaded.primary_muscle).toBe('front_delts');
  });

  test('an install already at the top version (already corrected) runs nothing further', async () => {
    const raw = freshExercisesDb();
    // Seed an already-correct row, as a device that already ran v63 would have.
    raw.prepare('INSERT INTO exercises (id, name, primary_muscle) VALUES (?, ?, ?)').run('ex-1', 'Viking Press', 'front_delts');
    const total = await totalMigrationCount();
    raw.exec(`PRAGMA user_version = ${total}`);
    const d = adapt(raw);
    await expect(runMigrations(d)).resolves.not.toThrow();
    const viking = raw.prepare('SELECT primary_muscle FROM exercises WHERE id = ?').get('ex-1');
    expect(viking.primary_muscle).toBe('front_delts');
  });
});
