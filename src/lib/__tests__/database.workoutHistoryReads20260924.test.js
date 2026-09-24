/**
 * database.workoutHistoryReads20260924.test.js
 *
 * BUILD LANE A (progress-tab audit 2026-09-24, second pass), A3. Three
 * additive reads behind the WorkoutHistoryScreen fixes:
 *   - getRecentCompletedWorkouts gains an additive `before` keyset cursor
 *     ({ attributedAt, id }) for "Show more" paging; the existing two-arg
 *     call stays byte-identical. A plain `< attributedAt` cursor (the
 *     first version of this fix) would skip a session sharing that exact
 *     millisecond with the boundary row, so `id` breaks the tie the same
 *     way the read's own ORDER BY does.
 *   - getCompletedWorkoutCount: the TRUE lifetime completed-session count,
 *     same completion predicate as getRecentCompletedWorkouts.
 *   - getCompletedWorkoutsBetween: FULL rows (same shape as
 *     getRecentCompletedWorkouts) for a month range, so the calendar's
 *     trained-day dots and the sessions listed under it are always built
 *     from the exact same data (the first version of this read returned
 *     day-keys only, which let a day be dotted with no session actually
 *     loaded for the list under it -- lead review, reworked here).
 *
 * The expo-sqlite mock is a shape stub (no real SQL engine), so per repo
 * convention (database.deleteExercise.test.js, database.writeGuards.test.js)
 * this pins the SQL/params contract rather than exercising a real SQL
 * engine; CRUD itself is exercised on device.
 */

jest.mock('expo-sqlite');

const {
  db, getRecentCompletedWorkouts, getCompletedWorkoutCount, getCompletedWorkoutsBetween,
} = require('../database');

let conn;

beforeEach(async () => {
  conn = await db();
  conn.getAllAsync.mockReset();
  conn.getFirstAsync.mockReset();
});

describe('getRecentCompletedWorkouts (additive keyset cursor)', () => {
  test('the existing two-arg call stays byte-identical: no cursor clause, two bound params', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getRecentCompletedWorkouts('u1', 50);

    expect(conn.getAllAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = conn.getAllAsync.mock.calls[0];
    expect(sql).toMatch(/WHERE w\.user_id = \? AND w\.is_completed = 1/);
    expect(sql).not.toMatch(/COALESCE\(w\.ended_at, w\.started_at, w\.created_at\) < \?/);
    expect(sql).toMatch(/ORDER BY COALESCE\(w\.ended_at, w\.started_at, w\.created_at\) DESC, w\.id DESC/);
    expect(params).toEqual(['u1', 50]);
  });

  test('a { attributedAt, id } cursor adds the tiebreak clause and binds all three params, in order, before the limit', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getRecentCompletedWorkouts('u1', 50, { attributedAt: 1_700_000_000_000, id: 'w-boundary' });

    const [sql, params] = conn.getAllAsync.mock.calls[0];
    expect(sql).toMatch(
      /AND \(COALESCE\(w\.ended_at, w\.started_at, w\.created_at\) < \?\s*OR \(COALESCE\(w\.ended_at, w\.started_at, w\.created_at\) = \? AND w\.id < \?\)\)/,
    );
    // attributedAt bound twice (the < branch and the = tiebreak branch),
    // then id, then userId came first, then the limit last.
    expect(params).toEqual(['u1', 1_700_000_000_000, 1_700_000_000_000, 'w-boundary', 50]);
  });

  test('a cursor missing attributedAt or id is treated exactly as omitted (no cursor clause)', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getRecentCompletedWorkouts('u1', 50, { attributedAt: NaN, id: 'w1' });
    expect(conn.getAllAsync.mock.calls[0][1]).toEqual(['u1', 50]);

    conn.getAllAsync.mockClear();
    await getRecentCompletedWorkouts('u1', 50, { attributedAt: 1, id: null });
    expect(conn.getAllAsync.mock.calls[0][1]).toEqual(['u1', 50]);

    conn.getAllAsync.mockClear();
    await getRecentCompletedWorkouts('u1', 50, null);
    expect(conn.getAllAsync.mock.calls[0][1]).toEqual(['u1', 50]);
  });
});

describe('getCompletedWorkoutCount', () => {
  test('COUNTs over the same completion predicate getRecentCompletedWorkouts uses', async () => {
    conn.getFirstAsync.mockResolvedValue({ count: 137 });
    const n = await getCompletedWorkoutCount('u1');

    expect(n).toBe(137);
    const [sql, params] = conn.getFirstAsync.mock.calls[0];
    expect(sql).toMatch(/SELECT COUNT\(\*\) AS count FROM workouts WHERE user_id = \? AND is_completed = 1/);
    expect(params).toEqual(['u1']);
  });

  test('a null row (no match, or a stubbed read) reads as 0, never null/undefined', async () => {
    conn.getFirstAsync.mockResolvedValue(null);
    expect(await getCompletedWorkoutCount('u1')).toBe(0);
  });

  test('no userId short-circuits to 0 without touching the database', async () => {
    expect(await getCompletedWorkoutCount(null)).toBe(0);
    expect(conn.getFirstAsync).not.toHaveBeenCalled();
  });
});

describe('getCompletedWorkoutsBetween', () => {
  test('queries the [startMs, endMs) range for FULL rows, same shape as getRecentCompletedWorkouts', async () => {
    conn.getAllAsync.mockResolvedValue([
      { id: 'w1', user_id: 'u1', is_completed: 1, routine_name: 'Push' },
    ]);

    const rows = await getCompletedWorkoutsBetween('u1', 1_000, 2_000);

    const [sql, params] = conn.getAllAsync.mock.calls[0];
    expect(sql).toMatch(/SELECT w\.\*, r\.name AS routine_name/);
    expect(sql).toMatch(/LEFT JOIN routines r ON r\.id = w\.routine_id/);
    expect(sql).toMatch(/WHERE w\.user_id = \? AND w\.is_completed = 1/);
    expect(sql).toMatch(/COALESCE\(w\.ended_at, w\.started_at, w\.created_at\) >= \?/);
    expect(sql).toMatch(/COALESCE\(w\.ended_at, w\.started_at, w\.created_at\) < \?/);
    expect(sql).toMatch(/ORDER BY COALESCE\(w\.ended_at, w\.started_at, w\.created_at\) DESC, w\.id DESC/);
    expect(params).toEqual(['u1', 1_000, 2_000]);
    // rowToCamel applied, same as every other workout row reader.
    expect(rows).toEqual([{ id: 'w1', userId: 'u1', isCompleted: 1, routineName: 'Push' }]);
  });

  test('missing userId or a non-finite range short-circuits to [] without touching the database', async () => {
    expect(await getCompletedWorkoutsBetween(null, 1, 2)).toEqual([]);
    expect(await getCompletedWorkoutsBetween('u1', NaN, 2)).toEqual([]);
    expect(await getCompletedWorkoutsBetween('u1', 1, undefined)).toEqual([]);
    expect(conn.getAllAsync).not.toHaveBeenCalled();
  });
});
