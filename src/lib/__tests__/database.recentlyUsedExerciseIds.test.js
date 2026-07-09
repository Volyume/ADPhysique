/**
 * database.recentlyUsedExerciseIds.test.js
 *
 * Pins getRecentlyUsedExerciseIds, the read behind the exercise picker's
 * "Recent" row (L07-F7, design-usability-audit-2026-07-09 /
 * DECISIONS-2026-07-09.md D14 Group A). The function must:
 *   - query workout_sets/workouts scoped to the given user, completed
 *     workouts only, warm-up sets excluded (matches getLastTrainedByMuscle's
 *     own filter, so "recent" means actually-trained, not just browsed);
 *   - group by exercise_id so each exercise appears once (distinct);
 *   - order by the most recent completed session first;
 *   - cap at the given limit (default 8).
 *
 * The expo-sqlite mock is a shape stub (no real SQL engine), so per repo
 * convention (routineReorder.test.js, database.writeGuards.test.js) this
 * pins the SQL/params contract and the row->id mapping rather than exercising
 * a real SQL engine; CRUD itself is exercised on device.
 */

jest.mock('expo-sqlite');

const { db, getRecentlyUsedExerciseIds } = require('../database');

let conn;

beforeEach(async () => {
  conn = await db();
  conn.getAllAsync.mockReset();
});

describe('getRecentlyUsedExerciseIds', () => {
  test('scopes to the user, completed workouts, and excludes warm-up sets', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getRecentlyUsedExerciseIds('u1');

    const [sql, params] = conn.getAllAsync.mock.calls[0];
    expect(sql).toMatch(/FROM workout_sets s/);
    expect(sql).toMatch(/JOIN workouts w ON w\.id = s\.workout_id/);
    expect(sql).toMatch(/WHERE w\.user_id = \?/);
    expect(sql).toMatch(/w\.is_completed = 1/);
    expect(sql).toMatch(/s\.set_type != 'warmup'/);
    expect(sql).toMatch(/GROUP BY s\.exercise_id/);
    expect(sql).toMatch(/ORDER BY last_session_ms DESC/);
    expect(params).toEqual(['u1', 8]);
  });

  test('defaults the cap to 8 and forwards a custom limit', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getRecentlyUsedExerciseIds('u1');
    expect(conn.getAllAsync.mock.calls[0][1]).toEqual(['u1', 8]);

    conn.getAllAsync.mockClear();
    await getRecentlyUsedExerciseIds('u1', 3);
    expect(conn.getAllAsync.mock.calls[0][1]).toEqual(['u1', 3]);
  });

  test('maps rows to a distinct, most-recent-first list of exercise ids', async () => {
    // The mock stands in for GROUP BY + ORDER BY already having done the
    // distinct-and-sort work in SQL; this pins that the JS layer trusts and
    // forwards that row order rather than re-sorting or re-deduping.
    conn.getAllAsync.mockResolvedValue([
      { exerciseId: 'ex-3', last_session_ms: 3000 },
      { exerciseId: 'ex-1', last_session_ms: 2000 },
      { exerciseId: 'ex-2', last_session_ms: 1000 },
    ]);
    const ids = await getRecentlyUsedExerciseIds('u1');
    expect(ids).toEqual(['ex-3', 'ex-1', 'ex-2']);
  });

  test('returns an empty array for a user with no logged history', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    const ids = await getRecentlyUsedExerciseIds('new-user');
    expect(ids).toEqual([]);
  });

  test('caps the SQL LIMIT at 8 even if more rows are asked for elsewhere', async () => {
    conn.getAllAsync.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({ exerciseId: `ex-${i}`, last_session_ms: 1000 - i })),
    );
    const ids = await getRecentlyUsedExerciseIds('u1');
    expect(ids.length).toBe(8);
    expect(conn.getAllAsync.mock.calls[0][1][1]).toBe(8);
  });
});
