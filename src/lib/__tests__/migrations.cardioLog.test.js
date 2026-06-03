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

describe('cardio_log migration ordering', () => {
  test('a fresh install (version 0) creates cardio_log', async () => {
    const d = makeFakeDb(0);
    await runMigrations(d);
    expect(createdCardioLog(d._exec)).toBe(true);
  });

  test('an install one step behind the top version still creates cardio_log', async () => {
    // Discover the total number of migration versions by running from 0.
    const probe = makeFakeDb(0);
    await runMigrations(probe);
    const total = probe._version;
    expect(total).toBeGreaterThan(0);

    // Simulate the founder's device: it had already advanced to the previous
    // top version under the buggy build. The corrective trailing migration must
    // run for it.
    const d = makeFakeDb(total - 1);
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
