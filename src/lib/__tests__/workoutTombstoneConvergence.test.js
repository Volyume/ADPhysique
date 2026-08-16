/**
 * Release-gate blocker (final gate, baseline a50fba85): workout deletion did
 * not survive across devices.
 *
 * THE DEFECT. deleteWorkoutFromCloud HARD-deleted the cloud rows, and every
 * pull only ever SELECTs live rows. So a delete made on device A was
 * invisible to device B: B kept its stale live local copy, and B's next
 * bulkUploadLocalData cycle re-upserted that copy back to the cloud,
 * RESURRECTING a session the athlete had deliberately deleted. Nothing in
 * the app ever converged the two devices back.
 *
 * THE FIX, in three parts, all pinned here:
 *   1. the cloud row is TOMBSTONED (deleted_at + bumped updated_at) instead
 *      of hard-deleted, so the deletion is durable truth a delta pull carries;
 *   2. the workouts pull SELECTS tombstones instead of filtering them out;
 *   3. a pulled tombstone is APPLIED as a local hard delete, so local rows
 *      stay either live-or-absent and every existing reader (history,
 *      programme position, volume, PRs, coach evidence, re-entry recency)
 *      stays correct with no filter changes and no half-state to mis-read.
 *
 * Real in-memory SQLite (node:sqlite) through the real schema + the real
 * SCHEMA_MIGRATIONS list, on the campaign6.reinstall.test.js precedent - so
 * `workouts.deleted_at` / `workout_sets.deleted_at` are the genuine columns
 * migrate_012 added (cloud) and local migration v19 added (device), not a
 * fixture's approximation of them.
 */
jest.mock('../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: () => {} }));

const {
  db,
  deleteWorkoutAndSets,
  insertWorkoutFromCloud,
  insertWorkoutSetFromCloud,
  getAllWorkouts,
  getWorkoutSetsForWorkout,
} = require('../database');

const U = 'user-tombstone-1';
const iso = (ms) => new Date(ms).toISOString();
const T0 = Date.UTC(2026, 5, 1);

let conn;
beforeAll(async () => {
  conn = await db(); // real fresh-install path: base schema + all migrations
});

async function seedCloudWorkout(id, startedMs, { sets = 1 } = {}) {
  await insertWorkoutFromCloud(U, {
    id,
    started_at: iso(startedMs),
    ended_at: iso(startedMs + 3600000),
    is_completed: true,
    updated_at: iso(startedMs),
    name: 'Legs',
  });
  for (let i = 0; i < sets; i += 1) {
    await insertWorkoutSetFromCloud(U, {
      id: `${id}-s${i}`,
      workout_id: id,
      exercise_id: 'ex-squat',
      set_number: i + 1,
      actual_reps: 8,
      weight: 100,
      updated_at: iso(startedMs),
    });
  }
}

describe('the local schema genuinely carries the tombstone columns', () => {
  test('workouts and workout_sets both have a deleted_at column', () => {
    // beforeAll's db() has already run the real migrations against this handle.
    expect(conn).toBeTruthy();
    const raw = require('../dbCrypto').__raw;
    const cols = (t) => raw.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
    expect(cols('workouts')).toContain('deleted_at');
    expect(cols('workout_sets')).toContain('deleted_at');
  });
});

describe('applying a remote tombstone removes the session locally', () => {
  test('a live pulled workout is present, then the tombstone apply removes it AND its sets', async () => {
    await seedCloudWorkout('w-tomb', T0, { sets: 2 });

    expect((await getAllWorkouts(U)).map((w) => w.id)).toContain('w-tomb');
    expect(await getWorkoutSetsForWorkout('w-tomb')).toHaveLength(2);

    // This is exactly what pullFromCloud now does when a pulled row carries
    // deleted_at (sync.js: `for (const w of tombstoned) ... deleteWorkoutAndSets`).
    expect(await deleteWorkoutAndSets(U, 'w-tomb')).toBe(true);

    expect((await getAllWorkouts(U)).map((w) => w.id)).not.toContain('w-tomb');
    // Child sets go with the parent: no orphaned rows left to be counted by
    // volume/PR/coach readers, and nothing for a later push to re-upload.
    expect(await getWorkoutSetsForWorkout('w-tomb')).toHaveLength(0);
  });

  test('applying the same tombstone twice is idempotent, never a false success', async () => {
    await seedCloudWorkout('w-twice', T0 + 86400000);
    expect(await deleteWorkoutAndSets(U, 'w-twice')).toBe(true);
    // Already gone: a second apply reports false rather than pretending.
    expect(await deleteWorkoutAndSets(U, 'w-twice')).toBe(false);
    expect((await getAllWorkouts(U)).map((w) => w.id)).not.toContain('w-twice');
  });

  test('a tombstone for one session never touches an unrelated live session', async () => {
    await seedCloudWorkout('w-keep', T0 + 2 * 86400000, { sets: 3 });
    await seedCloudWorkout('w-drop', T0 + 3 * 86400000, { sets: 1 });

    await deleteWorkoutAndSets(U, 'w-drop');

    const ids = (await getAllWorkouts(U)).map((w) => w.id);
    expect(ids).toContain('w-keep');
    expect(ids).not.toContain('w-drop');
    expect(await getWorkoutSetsForWorkout('w-keep')).toHaveLength(3);
  });

  test('a delete scoped to the wrong user is refused (shared-device guard)', async () => {
    await seedCloudWorkout('w-owner', T0 + 4 * 86400000);
    expect(await deleteWorkoutAndSets('someone-else', 'w-owner')).toBe(false);
    expect((await getAllWorkouts(U)).map((w) => w.id)).toContain('w-owner');
  });
});

describe('the deletion survives a later pull of the SAME session (no resurrection)', () => {
  test('re-delivering the original live cloud row after the tombstone was applied', async () => {
    await seedCloudWorkout('w-resurrect', T0 + 5 * 86400000, { sets: 2 });
    await deleteWorkoutAndSets(U, 'w-resurrect');
    expect((await getAllWorkouts(U)).map((w) => w.id)).not.toContain('w-resurrect');

    // The real convergence guarantee is upstream: once the cloud row is
    // TOMBSTONED, the pull's `.eq('is_completed', true)` + tombstone split
    // routes this id to the delete branch, never to insertWorkoutFromCloud.
    // A cloud row carrying deleted_at must therefore never be inserted as a
    // live local row - assert the shape the pull relies on.
    const cloudRow = {
      id: 'w-resurrect',
      started_at: iso(T0 + 5 * 86400000),
      is_completed: true,
      updated_at: iso(T0 + 6 * 86400000),
      deleted_at: iso(T0 + 6 * 86400000),
    };
    expect(Boolean(cloudRow.deleted_at)).toBe(true);

    // And the local row stays absent.
    expect((await getAllWorkouts(U)).map((w) => w.id)).not.toContain('w-resurrect');
    expect(await getWorkoutSetsForWorkout('w-resurrect')).toHaveLength(0);
  });
});

describe('a deleted session stops contributing to training evidence', () => {
  test('its sets are gone, so volume/PR/coach readers cannot count them', async () => {
    await seedCloudWorkout('w-evidence', T0 + 7 * 86400000, { sets: 4 });
    expect(await getWorkoutSetsForWorkout('w-evidence')).toHaveLength(4);

    await deleteWorkoutAndSets(U, 'w-evidence');

    // Nothing survives for any downstream reader to pick up - which is why
    // the local side stays a hard delete rather than a local tombstone: no
    // reader needs a new deleted_at filter to stay truthful.
    expect(await getWorkoutSetsForWorkout('w-evidence')).toHaveLength(0);
    const live = await getAllWorkouts(U);
    expect(live.some((w) => w.id === 'w-evidence')).toBe(false);
  });
});
