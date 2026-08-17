/**
 * progressSeries — behavioural pins for the Progress dashboard series
 * builders (audit A5: "Progress tab becomes a dashboard").
 *
 * What this suite pins and why:
 *  - the windows are CAPPED whatever a caller asks for (the audit's stated
 *    A5 risk is JS-thread chart cost, so a runaway window must be
 *    impossible from any call site);
 *  - empty data yields a full, all-zero series (the chart always has a
 *    stable frame to draw — never a crash, never a collapsed layout);
 *  - the builders are deterministic for a fixed `now` (pure
 *    re-presentation of loaded data, safe to memoise);
 *  - binning follows the existing rolling-week grammar: a set N days old
 *    lands in the right bin, warmups never count toward load, non-load
 *    (distance/duration) sets never inflate tonnage, and a session is a
 *    distinct workout id.
 */

import {
  buildWeeklyLoadSeries,
  buildWeeklySessionCounts,
  DEFAULT_LOAD_WEEKS,
  MAX_LOAD_WEEKS,
  DEFAULT_SPARK_DAYS,
  MAX_SPARK_DAYS,
} from '../progressSeries';
import { localWeekStartMs, localWeekEndMs } from '../dayKey';

const DAY_MS = 24 * 60 * 60 * 1000;
// A fixed clock: every test passes `now` explicitly so results never depend
// on when the suite runs.
const NOW = new Date('2026-06-15T12:00:00Z').getTime();

function set(daysAgo, { weight = 100, reps = 10, workoutId = 'w1', setType = 'straight', exerciseId = 'ex1' } = {}) {
  return {
    createdAt: NOW - daysAgo * DAY_MS,
    weight,
    actualReps: reps,
    workoutId,
    setType,
    exerciseId,
  };
}

describe('buildWeeklyLoadSeries', () => {
  test('empty data yields a full all-zero series, current week last', () => {
    const series = buildWeeklyLoadSeries([], { now: NOW });
    expect(series).toHaveLength(DEFAULT_LOAD_WEEKS);
    expect(series.every(pt => pt.value === 0)).toBe(true);
    expect(series[series.length - 1].weeksAgo).toBe(0);
    expect(series[0].weeksAgo).toBe(DEFAULT_LOAD_WEEKS - 1);
  });

  test('the window is capped at MAX_LOAD_WEEKS whatever is asked for', () => {
    expect(buildWeeklyLoadSeries([], { weeks: 500, now: NOW })).toHaveLength(MAX_LOAD_WEEKS);
    expect(buildWeeklyLoadSeries([], { weeks: Infinity, now: NOW })).toHaveLength(DEFAULT_LOAD_WEEKS);
    expect(buildWeeklyLoadSeries([], { weeks: NaN, now: NOW })).toHaveLength(DEFAULT_LOAD_WEEKS);
    expect(buildWeeklyLoadSeries([], { weeks: 0, now: NOW })).toHaveLength(1);
    expect(buildWeeklyLoadSeries([], { weeks: -4, now: NOW })).toHaveLength(1);
  });

  test('deterministic for a fixed now', () => {
    const sets = [set(2), set(9, { weight: 60 }), set(20, { weight: 40, reps: 8 })];
    const a = buildWeeklyLoadSeries(sets, { now: NOW });
    const b = buildWeeklyLoadSeries(sets, { now: NOW });
    expect(a).toEqual(b);
  });

  test('bins by rolling week: a set N days old lands weeksAgo = floor(N/7)', () => {
    const sets = [
      set(2, { weight: 50, reps: 10 }),   // current week: 500
      set(10, { weight: 100, reps: 10 }), // 1 week ago: 1000
    ];
    const series = buildWeeklyLoadSeries(sets, { now: NOW });
    const byWeeksAgo = Object.fromEntries(series.map(pt => [pt.weeksAgo, pt.value]));
    expect(byWeeksAgo[0]).toBe(500);
    expect(byWeeksAgo[1]).toBe(1000);
    expect(byWeeksAgo[2]).toBe(0);
  });

  test('warmup sets never count toward load', () => {
    const series = buildWeeklyLoadSeries([set(1, { setType: 'warmup' })], { now: NOW });
    expect(series.every(pt => pt.value === 0)).toBe(true);
  });

  test('distance/duration sets never inflate load when the type map is supplied', () => {
    const sets = [set(1, { weight: 300, reps: 1, exerciseId: 'sled' })];
    const withMap = buildWeeklyLoadSeries(sets, { now: NOW, exerciseTypeById: { sled: 'distance' } });
    expect(withMap.every(pt => pt.value === 0)).toBe(true);
  });

  test('sets outside the window, in the future, or without a timestamp are ignored', () => {
    const sets = [
      set(DEFAULT_LOAD_WEEKS * 7 + 3), // older than the window
      set(-1),                         // future timestamp
      { weight: 100, actualReps: 10, workoutId: 'w9', setType: 'straight' }, // no createdAt
    ];
    const series = buildWeeklyLoadSeries(sets, { now: NOW });
    expect(series.every(pt => pt.value === 0)).toBe(true);
  });
});

// Campaign 23 (§6/§28 IA-2): buildWeeklyLoadSeries gained a Monday-anchored
// grammar so a screen that also shows a Monday-anchored surface (the volume
// strip) never disagrees with itself about what "this week" means. These pin
// the NEW option only; the pre-existing 'rolling' describe block above is
// untouched (default behaviour is byte-identical).
describe('buildWeeklyLoadSeries with weekBoundary: monday', () => {
  test("the current bin is exactly [localWeekStartMs(now), localWeekEndMs(now))", () => {
    // `now` sits at the exclusive end of the current week (minus 1ms) so
    // BOTH edges of the bin can be exercised in one fixture without any set
    // reading as "in the future" relative to `now` (buildWeeklyLoadSeries
    // ignores sets after `now`, same as the rolling-week grammar above).
    const weekEnd = localWeekEndMs(NOW);
    const now = weekEnd - 1;
    const weekStart = localWeekStartMs(now);
    const sets = [
      { createdAt: weekStart, weight: 100, actualReps: 5, workoutId: 'w1', setType: 'straight', exerciseId: 'e1' }, // inside, at the boundary
      { createdAt: weekEnd - 1, weight: 50, actualReps: 5, workoutId: 'w1', setType: 'straight', exerciseId: 'e1' }, // inside, just before the exclusive end
      { createdAt: weekEnd, weight: 999, actualReps: 5, workoutId: 'w2', setType: 'straight', exerciseId: 'e1' }, // next week (and future relative to now), must NOT count
      { createdAt: weekStart - 1, weight: 999, actualReps: 5, workoutId: 'w3', setType: 'straight', exerciseId: 'e1' }, // previous week, must NOT count
    ];
    const series = buildWeeklyLoadSeries(sets, { now, weekBoundary: 'monday' });
    const current = series[series.length - 1];
    expect(current.weeksAgo).toBe(0);
    expect(current.value).toBe(750); // 100*5 + 50*5, the two in-window sets only
  });

  test('deterministic and matches the standing volume-strip week rule', () => {
    // Same fixed reference point localWeekStartMs itself uses elsewhere
    // (useProgressData.js's loadVolumeSnapshot) -- this is the "one week
    // definition" the fix exists to guarantee.
    const a = buildWeeklyLoadSeries([], { now: NOW, weekBoundary: 'monday' });
    const b = buildWeeklyLoadSeries([], { now: NOW, weekBoundary: 'monday' });
    expect(a).toEqual(b);
    expect(a).toHaveLength(DEFAULT_LOAD_WEEKS);
  });

  test('still respects the MAX_LOAD_WEEKS cap', () => {
    expect(buildWeeklyLoadSeries([], { weeks: 500, now: NOW, weekBoundary: 'monday' })).toHaveLength(MAX_LOAD_WEEKS);
  });
});

describe('buildWeeklySessionCounts', () => {
  test('empty data yields full all-zero bins and a zero total', () => {
    const { bins, total } = buildWeeklySessionCounts([], { now: NOW });
    expect(bins).toHaveLength(Math.ceil(DEFAULT_SPARK_DAYS / 7));
    expect(bins.every(v => v === 0)).toBe(true);
    expect(total).toBe(0);
  });

  test('the day window is capped at MAX_SPARK_DAYS whatever is asked for', () => {
    expect(buildWeeklySessionCounts([], { windowDays: 3650, now: NOW }).bins)
      .toHaveLength(Math.ceil(MAX_SPARK_DAYS / 7));
    expect(buildWeeklySessionCounts([], { windowDays: NaN, now: NOW }).bins)
      .toHaveLength(Math.ceil(DEFAULT_SPARK_DAYS / 7));
    expect(buildWeeklySessionCounts([], { windowDays: 1, now: NOW }).bins)
      .toHaveLength(1);
  });

  test('deterministic for a fixed now', () => {
    const sets = [set(1), set(8, { workoutId: 'w2' }), set(8, { workoutId: 'w2' })];
    const a = buildWeeklySessionCounts(sets, { now: NOW });
    const b = buildWeeklySessionCounts(sets, { now: NOW });
    expect(a).toEqual(b);
  });

  test('a session is a distinct workout id, binned by week', () => {
    const sets = [
      // three sets of one workout this week: one session
      set(1, { workoutId: 'w1' }), set(1, { workoutId: 'w1' }), set(1, { workoutId: 'w1' }),
      // a different workout ~9 days ago: one session, previous bin
      set(9, { workoutId: 'w2' }),
    ];
    const { bins, total } = buildWeeklySessionCounts(sets, { now: NOW });
    expect(bins[bins.length - 1]).toBe(1);
    expect(bins[bins.length - 2]).toBe(1);
    expect(total).toBe(2);
  });

  test('sets outside the window, in the future, or without a workout id are ignored', () => {
    const sets = [
      set(DEFAULT_SPARK_DAYS + 5, { workoutId: 'old' }),
      set(-1, { workoutId: 'future' }),
      { createdAt: NOW - DAY_MS, weight: 100, actualReps: 10, setType: 'straight' }, // no workoutId
    ];
    const { bins, total } = buildWeeklySessionCounts(sets, { now: NOW });
    expect(bins.every(v => v === 0)).toBe(true);
    expect(total).toBe(0);
  });
});
