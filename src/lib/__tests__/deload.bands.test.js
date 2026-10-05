/**
 * deload.bands.test.js -- D219 lane A5 (design 5.3): "The deload check's
 * over-MRV pass reads the same bands and the role: a focus muscle inside its
 * focus range is never counted as 'more sets than it can usually recover
 * from'."
 *
 * What this pins, and why:
 *   - buildLast4WeekDeloadBuckets reads the one band function (plan/bands.js)
 *     and the muscle's role, not the landmark table's MRV. Before D219 a week
 *     of 27 biceps sets was over biceps' MRV of 22 and counted toward a deload
 *     suggestion even when the plan itself had raised the muscle to bring it
 *     up (the founder's 27-sets case).
 *   - A focus (or raised) muscle is counted only past the 42 weekly sets
 *     studies have tested; any other muscle past 30 (the top of the focus
 *     range, far above the 20 a standard muscle's plan peaks at); nothing
 *     below that is ever counted, for any role.
 *   - The shouldDeload score is unchanged by this: only whether the over
 *     pass fires moves, and its reason no longer claims the muscle "cannot
 *     recover" from the sets (a set count cannot say that, Meeusen 2013).
 */
import {
  buildLast4WeekDeloadBuckets, shouldDeload, weeklyTotalBeyondRoleBand,
} from '../algorithms';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const NOW = new Date('2026-08-17T10:00:00.000Z').getTime();

const exerciseMap = { curl: { id: 'curl', primaryMuscle: 'biceps', secondaryMuscles: [], exerciseType: 'weight_reps' } };

/** Four weeks of `perWeek` working biceps sets each, in one session a week. */
function fourWeeks(perWeek) {
  const sets = [];
  const workouts = [];
  for (let wk = 0; wk < 4; wk++) {
    const at = NOW - wk * WEEK - 2 * DAY;
    workouts.push({ id: `w${wk}`, startedAt: at, isCompleted: true });
    for (let i = 0; i < perWeek; i++) {
      sets.push({
        id: `s${wk}-${i}`, workoutId: `w${wk}`, exerciseId: 'curl', createdAt: at + i * 1000,
        setType: 'straight', actualReps: 10, actualWeight: 20, isCompleted: true,
      });
    }
  }
  return { sets, workouts };
}

const buckets = (perWeek, roles) => {
  const { sets, workouts } = fourWeeks(perWeek);
  return buildLast4WeekDeloadBuckets(sets, workouts, exerciseMap, { now: NOW, ...(roles ? { roles } : {}) });
};

describe('the over pass reads the bands and the role', () => {
  test('27 biceps sets a week, four weeks running, on a focus muscle: never counted', () => {
    const b = buckets(27, { biceps: 'focus' });
    expect(b.map((w) => w.hasOverMRV)).toEqual([false, false, false, false]);
    expect(shouldDeload(b).reasons).not.toContain('Far more weekly sets on a muscle than your plan calls for, in 2 or more weeks');
  });

  test('the same 27 sets on a muscle that is not a focus are still inside the studied range', () => {
    expect(buckets(27).map((w) => w.hasOverMRV)).toEqual([false, false, false, false]);
    expect(buckets(27, { biceps: 'standard' }).map((w) => w.hasOverMRV)).toEqual([false, false, false, false]);
  });

  test('a muscle that is not a focus is counted past 30 sets, a focus muscle only past 42', () => {
    expect(buckets(33).every((w) => w.hasOverMRV)).toBe(true);
    expect(buckets(33, { biceps: 'focus' }).some((w) => w.hasOverMRV)).toBe(false);
    expect(buckets(45, { biceps: 'focus' }).every((w) => w.hasOverMRV)).toBe(true);
  });

  test('two weeks beyond the band still adds the 12 points, now with a reason that makes no claim about recovery', () => {
    const result = shouldDeload(buckets(33));
    expect(result.reasons).toContain('Far more weekly sets on a muscle than your plan calls for, in 2 or more weeks');
    expect(result.reasons.join(' ')).not.toMatch(/recover from/);
  });
});

describe('weeklyTotalBeyondRoleBand', () => {
  test.each([
    [27, 'focus', false], [30, 'standard', false], [31, 'standard', true], [31, 'maintenance', true],
    [42, 'focus', false], [43, 'focus', true], [43, 'raised', true], [35, 'raised', false],
    [27, undefined, false], [0, 'focus', false], [NaN, 'standard', false],
  ])('%p sets, role %s -> %s', (sets, role, expected) => {
    expect(weeklyTotalBeyondRoleBand(sets, role)).toBe(expected);
  });
});
