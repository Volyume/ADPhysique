/**
 * prCountInWindow.test.js
 *
 * migrate_172 (client half, blueprint section 4 CR-05 "N PRs in 4 weeks" on
 * the Community progress strip; lead ruling 1). getPRCountInWindow is
 * getWeeklyPRCount's calculate1RM-based comparison (X4,
 * weeklyPRCount.formulaConsistency.test.js) generalised from a calendar
 * week to an arbitrary [sinceMs, untilMs) window; getWeeklyPRCount now
 * delegates to it for a week's bounds. This suite pins:
 *
 *  - delegation: getWeeklyPRCount(userId, weekStart) and
 *    getPRCountInWindow(userId, weekStart, weekEnd) reach the SAME verdict
 *    for the SAME week over the SAME raw rows -- byte-identical behaviour,
 *    per ruling 1 of the migrate_172 client-half brief;
 *  - the window's own bounds reach the query, not a hardcoded week: the
 *    exact [sinceMs, untilMs] passed in are the bind values on the window
 *    query, and [sinceMs] alone on the prior-best query;
 *  - a window that excludes a set counts nothing: this repo drives
 *    getAllAsync directly with raw rows rather than a real SQL engine
 *    (see weeklyPRCount.formulaConsistency.test.js's own header) -- what a
 *    set falling outside [sinceMs, untilMs) looks like from this
 *    function's side is the window query answering no rows, and that
 *    yields 0, not a stale count and not a crash from the prior query
 *    running over nothing.
 *
 * The expo-sqlite mock is a shape stub (no real SQL engine, repo
 * convention); getAllAsync is driven directly with the raw rows, the same
 * approach weeklyPRCount.formulaConsistency.test.js uses.
 */
jest.mock('expo-sqlite');

const { db, getWeeklyPRCount, getPRCountInWindow } = require('../database');
const { localWeekEndMs } = require('../dayKey');

let conn;

beforeEach(async () => {
  conn = await db();
  conn.getAllAsync.mockReset();
});

const WEEK_START = Date.UTC(2026, 6, 27); // a Monday, the same fixture X4's suite uses

describe('getPRCountInWindow: delegation from getWeeklyPRCount', () => {
  test('the same week, the same rows: both reach the same verdict (1 PR, the X4 worked divergence case)', async () => {
    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-bench', weight: 60, reps: 20 }]) // this week
      .mockResolvedValueOnce([{ exerciseId: 'ex-bench', weight: 94, reps: 2 }]); // prior
    const viaWeekly = await getWeeklyPRCount('u1', WEEK_START);

    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-bench', weight: 60, reps: 20 }])
      .mockResolvedValueOnce([{ exerciseId: 'ex-bench', weight: 94, reps: 2 }]);
    const weekEnd = localWeekEndMs(WEEK_START);
    const viaWindow = await getPRCountInWindow('u1', WEEK_START, weekEnd);

    expect(viaWindow).toBe(viaWeekly);
    expect(viaWindow).toBe(1);
  });

  test('a genuine non-PR week agrees on both paths too: 0', async () => {
    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-squat', weight: 100, reps: 5 }])
      .mockResolvedValueOnce([{ exerciseId: 'ex-squat', weight: 100, reps: 5 }]);
    const viaWeekly = await getWeeklyPRCount('u1', WEEK_START);

    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-squat', weight: 100, reps: 5 }])
      .mockResolvedValueOnce([{ exerciseId: 'ex-squat', weight: 100, reps: 5 }]);
    const viaWindow = await getPRCountInWindow('u1', WEEK_START, localWeekEndMs(WEEK_START));

    expect(viaWindow).toBe(viaWeekly);
    expect(viaWindow).toBe(0);
  });

  test('getWeeklyPRCount binds exactly the week\'s own [weekStart, weekEnd] and [weekStart] to the two queries getPRCountInWindow runs', async () => {
    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-x', weight: 100, reps: 5 }])
      .mockResolvedValueOnce([]);
    await getWeeklyPRCount('u1', WEEK_START);

    const weekEnd = localWeekEndMs(WEEK_START);
    expect(conn.getAllAsync).toHaveBeenNthCalledWith(1, expect.any(String), ['u1', WEEK_START, weekEnd]);
    expect(conn.getAllAsync).toHaveBeenNthCalledWith(2, expect.any(String), ['u1', WEEK_START]);
  });
});

describe('getPRCountInWindow: a window that excludes a set counts nothing', () => {
  test('binds exactly [userId, sinceMs, untilMs] to the window query and [userId, sinceMs] to the prior query', async () => {
    // A non-empty window row so the function does not short-circuit before
    // running the second (prior-best) query -- see the next test for the
    // short-circuit itself. No prior best for it, so the count is still 0.
    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-1', weight: 50, reps: 5 }])
      .mockResolvedValueOnce([]);
    const since = Date.UTC(2026, 7, 14);
    const until = Date.UTC(2026, 7, 21);
    const count = await getPRCountInWindow('u2', since, until);

    expect(count).toBe(0);
    expect(conn.getAllAsync).toHaveBeenNthCalledWith(1, expect.any(String), ['u2', since, until]);
    expect(conn.getAllAsync).toHaveBeenNthCalledWith(2, expect.any(String), ['u2', since]);
  });

  test('no rows in the window (what a real engine answers once a set falls outside it): 0, and the prior query never even runs', async () => {
    conn.getAllAsync.mockResolvedValueOnce([]); // window query: nothing in range
    const count = await getPRCountInWindow('u2', Date.UTC(2026, 7, 14), Date.UTC(2026, 7, 21));

    expect(count).toBe(0);
    // Short-circuits before the prior-best query: one call, not two.
    expect(conn.getAllAsync).toHaveBeenCalledTimes(1);
  });

  test('the same set counts inside a window that includes it, and counts nothing once the window is narrowed to exclude it', async () => {
    // The X4 worked-divergence fixture, inside a window that includes it.
    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-bench', weight: 60, reps: 20 }])
      .mockResolvedValueOnce([{ exerciseId: 'ex-bench', weight: 94, reps: 2 }]);
    const inside = await getPRCountInWindow('u3', Date.UTC(2026, 7, 1), Date.UTC(2026, 7, 8));
    expect(inside).toBe(1);

    // The same set now falls outside [sinceMs, untilMs): a real engine's
    // `w.started_at >= ? AND w.started_at < ?` excludes it, so the window
    // query answers empty.
    conn.getAllAsync.mockReset();
    conn.getAllAsync.mockResolvedValueOnce([]);
    const excluded = await getPRCountInWindow('u3', Date.UTC(2026, 7, 9), Date.UTC(2026, 7, 16));
    expect(excluded).toBe(0);
  });
});
