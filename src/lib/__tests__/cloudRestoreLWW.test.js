/**
 * SYNC-4: legacy cloud-restore must not clobber a newer local edit.
 *
 * insertWorkoutFromCloud / insertWorkoutSetFromCloud used an unconditional
 * INSERT OR REPLACE, so a pull (especially after a failed push) reverted
 * local workout/set edits to the stale cloud copy. They now apply a
 * last-write-wins gate: skip the write when the local row exists and its
 * updated_at is at least as new as the cloud row's.
 *
 * The expo-sqlite mock is a shape stub, so we drive the gate directly:
 * control getFirstAsync (the local-row lookup) and assert whether runAsync
 * (the write) fires.
 */

jest.mock('expo-sqlite');

const { db, insertWorkoutFromCloud, insertWorkoutSetFromCloud, insertMorningWeightFromCloud } = require('../database');

const iso = (ms) => new Date(ms).toISOString();
let conn;

beforeEach(async () => {
  conn = await db();
  conn.runAsync.mockClear();
  conn.getFirstAsync.mockReset();
});

describe('insertWorkoutFromCloud LWW gate', () => {
  test('skips the write when the local workout is newer than the cloud row', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('FROM workouts') ? { updated_at: 2000 } : null);

    await insertWorkoutFromCloud('u1', { id: 'w1', started_at: iso(500), updated_at: iso(1000) });

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('writes when the cloud row is newer than the local workout', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('FROM workouts') ? { updated_at: 1000 } : null);

    await insertWorkoutFromCloud('u1', { id: 'w1', started_at: iso(500), updated_at: iso(2000) });

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });

  test('writes when there is no local workout', async () => {
    conn.getFirstAsync.mockResolvedValue(null);

    await insertWorkoutFromCloud('u1', { id: 'w1', started_at: iso(500), updated_at: iso(2000) });

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });

  test('writes when the cloud row has no updated_at (cannot compare, fall back to restore)', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('FROM workouts') ? { updated_at: 5000 } : null);

    await insertWorkoutFromCloud('u1', { id: 'w1', started_at: iso(500) });

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });

  test('fills started_at with a finite timestamp when the cloud row carries none', async () => {
    // A cloud workout with a missing started_at used to land as NULL, which
    // renders as a 1 Jan 1970 date in history and lift-progress. The restore
    // must substitute a real timestamp instead.
    conn.getFirstAsync.mockResolvedValue(null); // fresh restore, no local row
    await insertWorkoutFromCloud('u1', { id: 'w1', updated_at: iso(2000) }); // no started_at

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    const params = conn.runAsync.mock.calls[0][1];
    // started_at is the 6th column in the INSERT (index 5).
    expect(typeof params[5]).toBe('number');
    expect(Number.isFinite(params[5])).toBe(true);
  });
});

describe('insertWorkoutSetFromCloud LWW gate', () => {
  // No exercise_id so the FK-resolution lookups are skipped and the only
  // getFirstAsync call is the gate's workout_sets lookup.
  const setRow = (updatedMs) => ({ id: 's1', workout_id: 'w1', updated_at: iso(updatedMs) });

  test('skips the write when the local set is newer', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('FROM workout_sets') ? { updated_at: 2000 } : null);

    await insertWorkoutSetFromCloud('u1', setRow(1000));

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('writes when the cloud set is newer', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('FROM workout_sets') ? { updated_at: 1000 } : null);

    await insertWorkoutSetFromCloud('u1', setRow(2000));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });

  test('writes when there is no local set', async () => {
    conn.getFirstAsync.mockResolvedValue(null);

    await insertWorkoutSetFromCloud('u1', setRow(2000));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });
});

// SYNC-6: morning_weights cloud-restore used INSERT OR IGNORE, so an existing
// local row was never updated and a weight edited on another device never
// reconciled. It now applies the same last-write-wins gate.
describe('insertMorningWeightFromCloud LWW gate', () => {
  const row = (updatedMs) => ({ id: 'mw1', weight_kg: 80, logged_at: iso(500), updated_at: iso(updatedMs) });

  test('skips the write when the local weight is newer than the cloud row', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('FROM morning_weights') ? { updated_at: 2000 } : null);

    await insertMorningWeightFromCloud('u1', row(1000));

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('writes when the cloud row is newer than the local weight (cross-device edit)', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('FROM morning_weights') ? { updated_at: 1000 } : null);

    await insertMorningWeightFromCloud('u1', row(2000));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });

  test('writes when there is no local weight', async () => {
    conn.getFirstAsync.mockResolvedValue(null);

    await insertMorningWeightFromCloud('u1', row(2000));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });

  test('restores when there is no local weight even if the cloud row has no updated_at', async () => {
    conn.getFirstAsync.mockResolvedValue(null); // fresh device, no local row

    await insertMorningWeightFromCloud('u1', { id: 'mw1', weight_kg: 80, logged_at: iso(500) });

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });

  // SYNC-6 re-audit: when a local row exists and the cloud row has no
  // updated_at (e.g. before migration 060), we cannot prove the cloud copy is
  // newer, so we must NOT clobber a possibly-newer un-pushed local edit.
  test('does NOT clobber an existing local row when the cloud row has no updated_at', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('FROM morning_weights') ? { updated_at: 5000 } : null);

    await insertMorningWeightFromCloud('u1', { id: 'mw1', weight_kg: 80, logged_at: iso(500) });

    expect(conn.runAsync).not.toHaveBeenCalled();
  });
});
