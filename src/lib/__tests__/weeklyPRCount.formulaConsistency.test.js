/**
 * weeklyPRCount.formulaConsistency.test.js
 *
 * X4 (cross-surface consistency audit 2026-07-30,
 * docs/audit/cross-surface-consistency-audit-2026-07-30.md): the live
 * in-session PR detector (detectPR/calculate1RM, algorithms.js -- blended
 * Epley/Brzycki, reps clamped at 20, reps=1 special-cased, 0.1% margin) and
 * the weekly tally (getWeeklyPRCount/getBestLiftThisWeek, database.js) used
 * to run two DIFFERENT 1RM formulas (the weekly tally was plain Epley, no
 * clamp, no reps=1 case, zero margin) and could disagree on the same data.
 * Ruled: the weekly tally now conforms to calculate1RM -- calculate1RM and
 * detectPR themselves are unchanged.
 *
 * This pins the audit's own worked divergence case (prior best 94kg x 2,
 * this week 60kg x 20): both paths must reach the SAME verdict (a PR fires).
 * It also pins a case where neither path fires (no genuine progress), so the
 * fix isn't a one-way "always fire" regression.
 *
 * The expo-sqlite mock is a shape stub (no real SQL engine, repo convention);
 * getAllAsync is driven directly with the raw rows getWeeklyPRCount /
 * getBestLiftThisWeek now reduce with calculate1RM in JS.
 */
jest.mock('expo-sqlite');

const { db, getWeeklyPRCount, getBestLiftThisWeek } = require('../database');
const { detectPR, calculate1RM } = require('../algorithms');

let conn;

beforeEach(async () => {
  conn = await db();
  conn.getAllAsync.mockReset();
});

const WEEK_START = Date.UTC(2026, 6, 27); // a Monday

describe('X4: the weekly PR tally agrees with the live PR detector', () => {
  test("worked divergence case (94kg x 2 prior, 60kg x 20 this week) fires a PR on BOTH paths", () => {
    // Live path: detectPR compares the new set against all historical sets.
    const liveResult = detectPR(
      { weight: 60, actualReps: 20 },
      [{ weight: 94, actualReps: 2 }],
      { id: 'ex-bench', exercise_type: 'weight_reps' },
    );
    expect(liveResult.some((pr) => pr.type === '1rm_estimate')).toBe(true);

    // Sanity: plain Epley (the OLD weekly formula) would NOT have fired --
    // this is the exact contradiction the audit found.
    const plainEpleyPrior = 94 * (1 + 2 / 30);
    const plainEpleyThisWeek = 60 * (1 + 20 / 30);
    expect(plainEpleyThisWeek).toBeLessThanOrEqual(plainEpleyPrior);
  });

  test('getWeeklyPRCount fires exactly 1 PR for the same worked divergence case', async () => {
    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-bench', weight: 60, reps: 20 }]) // this week
      .mockResolvedValueOnce([{ exerciseId: 'ex-bench', weight: 94, reps: 2 }]); // prior

    const count = await getWeeklyPRCount('u1', WEEK_START);
    expect(count).toBe(1);
  });

  test('getBestLiftThisWeek features the same lift as a new best for the worked divergence case', async () => {
    conn.getAllAsync
      .mockResolvedValueOnce([
        { exerciseId: 'ex-bench', exerciseName: 'Bench Press', weight: 60, reps: 20 },
      ]) // this week
      .mockResolvedValueOnce([{ exerciseId: 'ex-bench', weight: 94, reps: 2 }]); // prior

    const best = await getBestLiftThisWeek('u1', WEEK_START);
    expect(best).not.toBeNull();
    expect(best.exerciseName).toBe('Bench Press');
    expect(best.isNewBest).toBe(true);
  });

  test('a genuine non-PR week (same weight/reps as the prior best) agrees on BOTH paths: no PR', async () => {
    const liveResult = detectPR(
      { weight: 100, actualReps: 5 },
      [{ weight: 100, actualReps: 5 }],
      { id: 'ex-squat', exercise_type: 'weight_reps' },
    );
    expect(liveResult.some((pr) => pr.type === '1rm_estimate')).toBe(false);

    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-squat', weight: 100, reps: 5 }])
      .mockResolvedValueOnce([{ exerciseId: 'ex-squat', weight: 100, reps: 5 }]);
    const count = await getWeeklyPRCount('u1', WEEK_START);
    expect(count).toBe(0);
  });

  test('a first-ever lift (no prior history) is not counted as a weekly PR, matching detectPR\'s own best1RM > 0 guard', async () => {
    const liveResult = detectPR(
      { weight: 80, actualReps: 10 },
      [],
      { id: 'ex-ohp', exercise_type: 'weight_reps' },
    );
    expect(liveResult.some((pr) => pr.type === '1rm_estimate')).toBe(false);

    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-ohp', weight: 80, reps: 10 }])
      .mockResolvedValueOnce([]); // no prior sets at all
    const count = await getWeeklyPRCount('u1', WEEK_START);
    expect(count).toBe(0);
  });

  test('the 0.1% margin is honoured: a 0.05% nudge over the prior best is NOT a PR on either path', async () => {
    const prior1RM = calculate1RM(100, 5);
    const nudged = prior1RM * 1.0005; // inside the margin, must not fire
    // Back-solve a weight at the same rep count that produces this e1RM.
    const w = nudged; // reps=1 branch of calculate1RM returns the raw weight
    const liveResult = detectPR({ weight: w, actualReps: 1 }, [{ weight: 100, actualReps: 5 }], { id: 'ex-x' });
    expect(liveResult.some((pr) => pr.type === '1rm_estimate')).toBe(false);

    conn.getAllAsync
      .mockResolvedValueOnce([{ exerciseId: 'ex-x', weight: w, reps: 1 }])
      .mockResolvedValueOnce([{ exerciseId: 'ex-x', weight: 100, reps: 5 }]);
    const count = await getWeeklyPRCount('u1', WEEK_START);
    expect(count).toBe(0);
  });
});
