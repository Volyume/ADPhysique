/**
 * database.deleteExercise.test.js
 *
 * Exercise-library-expansion-2026-09-05 (EL-18, 05-DECISIONS.md EL-18):
 * pins deleteExercise as a SOFT delete (deleted_at set), not the previous
 * hard DELETE, and pins the new getRoutinesReferencingExercise read the
 * delete confirm uses to disclose routine usage.
 *
 * `deleteExercise` was a HARD `DELETE FROM exercises` before this
 * campaign, with no UI ever calling it (01-SCHEMA-AND-CONSUMERS.md
 * finding 6: "no UI can delete a custom exercise"). It is scoped to
 * `is_custom = 1` in both forms - a canonical row is never reachable
 * either way.
 *
 * The expo-sqlite mock is a shape stub (no real SQL engine), so per repo
 * convention (database.recentlyUsedExerciseIds.test.js,
 * database.writeGuards.test.js) this pins the SQL/params contract rather
 * than exercising a real SQL engine; CRUD itself is exercised on device.
 */

jest.mock('expo-sqlite');

const {
  db, deleteExercise, getRoutinesReferencingExercise, getAllExercises, _invalidateExercisesCache,
} = require('../database');

let conn;

beforeEach(async () => {
  conn = await db();
  conn.runAsync.mockReset();
  conn.getAllAsync.mockReset();
  _invalidateExercisesCache();
});

describe('deleteExercise', () => {
  test('soft-deletes: UPDATEs deleted_at, never a hard DELETE', async () => {
    conn.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });
    await deleteExercise('ex1');

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    const [sql] = conn.runAsync.mock.calls[0];
    expect(sql).toMatch(/^UPDATE exercises SET deleted_at = \?, updated_at = \?/);
    expect(sql).not.toMatch(/^DELETE/);
  });

  test('is scoped to is_custom = 1 - a canonical row is never reachable', async () => {
    conn.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });
    await deleteExercise('ex1');
    const [sql, params] = conn.runAsync.mock.calls[0];
    expect(sql).toMatch(/WHERE id = \? AND is_custom = 1/);
    expect(params).toEqual([expect.any(Number), expect.any(Number), 'ex1']);
  });

  test('sets deleted_at and updated_at to the SAME timestamp', async () => {
    conn.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });
    await deleteExercise('ex1');
    const [, params] = conn.runAsync.mock.calls[0];
    expect(params[0]).toBe(params[1]);
  });
});

describe('getAllExercises excludes a soft-deleted row', () => {
  test('the query filters WHERE deleted_at IS NULL', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getAllExercises();
    const [sql] = conn.getAllAsync.mock.calls[0];
    expect(sql).toMatch(/FROM exercises WHERE deleted_at IS NULL ORDER BY name ASC/);
  });
});

describe('getRoutinesReferencingExercise', () => {
  test('scopes to the user\'s own undeleted routines and undeleted routine_exercises rows', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getRoutinesReferencingExercise('u1', 'ex1');

    const [sql, params] = conn.getAllAsync.mock.calls[0];
    expect(sql).toMatch(/FROM routine_exercises re/);
    expect(sql).toMatch(/JOIN routines r ON r\.id = re\.routine_id/);
    expect(sql).toMatch(/re\.exercise_id = \? AND re\.deleted_at IS NULL/);
    expect(sql).toMatch(/r\.user_id = \? AND r\.deleted_at IS NULL/);
    expect(params).toEqual(['ex1', 'u1']);
  });

  test('maps rows to { id, name }', async () => {
    conn.getAllAsync.mockResolvedValue([{ id: 'r1', name: 'Push day' }]);
    const result = await getRoutinesReferencingExercise('u1', 'ex1');
    expect(result).toEqual([{ id: 'r1', name: 'Push day' }]);
  });

  test('returns [] without querying when userId or exerciseId is missing', async () => {
    expect(await getRoutinesReferencingExercise(null, 'ex1')).toEqual([]);
    expect(await getRoutinesReferencingExercise('u1', null)).toEqual([]);
    expect(conn.getAllAsync).not.toHaveBeenCalled();
  });
});
