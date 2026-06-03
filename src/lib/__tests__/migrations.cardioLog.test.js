/**
 * Migration ordering regression for the cardio_log incident (2026-06-03).
 *
 * The cardio_log CREATE was first added in the MIDDLE of SCHEMA_MIGRATIONS
 * rather than appended. runMigrations only runs versions from the stored
 * PRAGMA user_version up to the array length, so any install already sitting at
 * the array's top version never reached the inserted index: the table was never
 * created, every cardio insert threw "no such table: cardio_log", and sign-out
 * (push-first) errored on the same missing table and could not complete.
 *
 * These tests drive the real runMigrations with a fake SQLite handle and assert
 * that cardio_log is created BOTH for a fresh install (version 0) and for an
 * install one step behind the top version (the founder's exact case). The
 * latter is the guard that fails if cardio_log ever drifts back into the middle
 * of the array.
 */

const { runMigrations } = require('../database');

function makeFakeDb(startVersion) {
  let version = startVersion;
  const exec = [];
  return {
    _exec: exec,
    get _version() { return version; },
    getFirstAsync: async (sql) => {
      if (/user_version/i.test(String(sql))) return { user_version: version };
      return null;
    },
    getAllAsync: async () => [],
    runAsync: async () => ({}),
    execAsync: async (sql) => {
      const s = String(sql);
      exec.push(s);
      const m = /PRAGMA user_version = (\d+)/.exec(s);
      if (m) version = Number(m[1]);
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
  };
}

function createdCardioLog(execList) {
  return execList.some((s) => /CREATE TABLE IF NOT EXISTS cardio_log/i.test(s));
}

function addedExerciseExpansionColumn(execList) {
  // The exercise-library expansion block is identified by its first column.
  return execList.some((s) => /ALTER TABLE exercises ADD COLUMN equipment_category/i.test(s));
}

// Find the migration index of the Nth op matching `pattern` by probing a
// from-zero run and reading the PRAGMA user_version that the runner sets
// immediately after that op's migration completes. The migration's own index
// is (version - 1), so an install sitting at that index is the one that first
// runs it. This stays correct as more migrations are appended, unlike a
// hardcoded "top - 1" which drifts every time the array grows.
async function migrationIndexOf(pattern, occurrence = 1) {
  const d = makeFakeDb(0);
  await runMigrations(d);
  const exec = d._exec;
  let seen = 0;
  for (let i = 0; i < exec.length; i++) {
    if (pattern.test(exec[i])) {
      seen += 1;
      if (seen === occurrence) {
        for (let j = i + 1; j < exec.length; j++) {
          const m = /PRAGMA user_version = (\d+)/.exec(exec[j]);
          if (m) return Number(m[1]) - 1;
        }
      }
    }
  }
  return -1;
}

describe('cardio_log migration ordering', () => {
  test('a fresh install (version 0) creates cardio_log', async () => {
    const d = makeFakeDb(0);
    await runMigrations(d);
    expect(createdCardioLog(d._exec)).toBe(true);
  });

  test('an install sitting at the corrective cardio_log index still creates the table', async () => {
    // Simulate the founder's device: it had already advanced to the version it
    // sat at under the buggy build, the index the corrective cardio_log block
    // (the 2nd CREATE in the array) occupies. Starting there must run it. Using
    // the located index instead of "top - 1" keeps this true as the array grows.
    const correctiveIndex = await migrationIndexOf(/CREATE TABLE IF NOT EXISTS cardio_log/i, 2);
    expect(correctiveIndex).toBeGreaterThan(0);

    const d = makeFakeDb(correctiveIndex);
    await runMigrations(d);
    expect(createdCardioLog(d._exec)).toBe(true);
  });

  test('an install already at the top version runs nothing further', async () => {
    const probe = makeFakeDb(0);
    await runMigrations(probe);
    const total = probe._version;

    const d = makeFakeDb(total);
    await runMigrations(d);
    // Only the PRAGMA read happened; no migration ops were executed.
    expect(d._exec.length).toBe(0);
  });
});

describe('exercise-library expansion migration ordering', () => {
  // The same mid-array insertion that skipped cardio_log shifted the
  // exercise-library expansion block down a slot, so an install at the old top
  // version never ran it and was left missing 9 exercises columns. A trailing
  // corrective re-applies them. These pin that it runs for the affected cohort.
  test('a fresh install adds the expansion columns', async () => {
    const d = makeFakeDb(0);
    await runMigrations(d);
    expect(addedExerciseExpansionColumn(d._exec)).toBe(true);
  });

  test('an install sitting at the corrective expansion index still gets the columns', async () => {
    // The corrective expansion block is the 2nd ALTER...equipment_category in
    // the array (the original block plus the trailing corrective). An install
    // at that index must run it.
    const correctiveIndex = await migrationIndexOf(/ALTER TABLE exercises ADD COLUMN equipment_category/i, 2);
    expect(correctiveIndex).toBeGreaterThan(0);

    const d = makeFakeDb(correctiveIndex);
    await runMigrations(d);
    expect(addedExerciseExpansionColumn(d._exec)).toBe(true);
  });
});
