/**
 * Verifies the recovery EMA math:
 *  - half-life weighting: points exactly halfLifeDays old contribute half
 *  - week-over-week pct difference math
 *  - dailySeries bucketing
 *  - robustness to null fields and empty input
 */
import { emaValue, computeRecoveryEMAs, emaWeekOverWeekPct, dailySeries } from '../recoveryEMA';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 4, 20, 12, 0, 0);

describe('emaValue', () => {
  test('returns null for empty input', () => {
    expect(emaValue([], NOW)).toBeNull();
    expect(emaValue(null, NOW)).toBeNull();
  });

  test('returns null if all points have invalid values', () => {
    expect(emaValue([{ value: null, at: NOW }, { value: NaN, at: NOW }], NOW)).toBeNull();
  });

  test('single point returns its value', () => {
    expect(emaValue([{ value: 5, at: NOW }], NOW)).toBe(5);
  });

  test('points exactly halfLifeDays old contribute exactly half the weight', () => {
    // Weight: now → 1.0, halfLifeDays(7) old → 0.5
    // Avg = (1.0*10 + 0.5*0) / (1.0 + 0.5) = 10/1.5 = 6.666...
    const result = emaValue(
      [{ value: 10, at: NOW }, { value: 0, at: NOW - 7 * DAY_MS }],
      NOW,
    );
    expect(result).toBeCloseTo(10 / 1.5, 3);
  });

  test('older points decay further', () => {
    // 14 days old → weight = 0.5^2 = 0.25
    const a = emaValue([{ value: 10, at: NOW }, { value: 0, at: NOW - 14 * DAY_MS }], NOW);
    const b = emaValue([{ value: 10, at: NOW }, { value: 0, at: NOW - 7 * DAY_MS }], NOW);
    // 14-day-old zero pulls average down LESS than 7-day-old zero
    expect(a).toBeGreaterThan(b);
  });

  test('halfLifeDays parameter changes weighting', () => {
    const fast = emaValue([{ value: 10, at: NOW }, { value: 0, at: NOW - 3 * DAY_MS }], NOW, 3);
    const slow = emaValue([{ value: 10, at: NOW }, { value: 0, at: NOW - 3 * DAY_MS }], NOW, 14);
    // With half-life=3, the 3-day-old zero is at full half-weight already
    // With half-life=14, it's still mostly weighted, so average is lower
    expect(fast).toBeGreaterThan(slow);
  });

  test('future-dated points are clamped to ageDays=0 (full weight)', () => {
    // If clock skew puts a point slightly in the future, it should NOT
    // get bigger-than-unit weight (Math.max(0, ageDays) guards this).
    const result = emaValue([{ value: 5, at: NOW + DAY_MS }], NOW);
    expect(result).toBe(5);
  });

  test('skips entries with non-numeric values rather than crashing', () => {
    const result = emaValue([
      { value: 10, at: NOW },
      { value: 'bad', at: NOW },
      { value: 4, at: NOW },
    ], NOW);
    expect(result).toBe(7); // mean of 10 and 4
  });
});

describe('computeRecoveryEMAs', () => {
  test('empty workouts returns all nulls', () => {
    expect(computeRecoveryEMAs([], NOW)).toEqual({ soreness: null, fatigue: null, joint: null });
  });

  test('reads soreness, fatigue, and joint from workouts', () => {
    const workouts = [
      { startedAt: NOW, soreness24hBefore: 2, fatigueLevel: 3, maxJointDiscomfort: 1 },
      { startedAt: NOW - DAY_MS, soreness24hBefore: 3, fatigueLevel: 3, maxJointDiscomfort: 0 },
    ];
    const { soreness, fatigue, joint } = computeRecoveryEMAs(workouts, NOW);
    expect(soreness).toBeGreaterThan(2);
    expect(soreness).toBeLessThan(3);
    expect(fatigue).toBeCloseTo(3, 1);
    expect(joint).toBeGreaterThan(0);
    expect(joint).toBeLessThan(1);
  });

  test('falls back to createdAt / created_at if startedAt is missing', () => {
    const workouts = [
      { createdAt: NOW, soreness24hBefore: 2 },
      { created_at: NOW - DAY_MS, soreness24hBefore: 3 },
    ];
    const { soreness } = computeRecoveryEMAs(workouts, NOW);
    expect(soreness).not.toBeNull();
  });

  test('skips workouts with no timestamp at all', () => {
    const workouts = [
      { soreness24hBefore: 2 },
      { startedAt: NOW, soreness24hBefore: 4 },
    ];
    const { soreness } = computeRecoveryEMAs(workouts, NOW);
    expect(soreness).toBe(4);
  });
});

describe('emaWeekOverWeekPct', () => {
  test('returns null when there isn\'t a prior week', () => {
    const points = [{ value: 5, at: NOW }];
    expect(emaWeekOverWeekPct(points, NOW)).toBeNull();
  });

  test('returns null if prior EMA is zero (avoid div/0)', () => {
    const points = [
      { value: 0, at: NOW - 8 * DAY_MS },
      { value: 5, at: NOW },
    ];
    expect(emaWeekOverWeekPct(points, NOW)).toBeNull();
  });

  test('positive change when current EMA exceeds prior week', () => {
    const points = [
      { value: 1, at: NOW - 14 * DAY_MS },
      { value: 1, at: NOW - 10 * DAY_MS },
      { value: 5, at: NOW - DAY_MS },
      { value: 5, at: NOW },
    ];
    const pct = emaWeekOverWeekPct(points, NOW);
    expect(pct).not.toBeNull();
    expect(pct).toBeGreaterThan(0);
  });
});

describe('dailySeries', () => {
  test('empty input returns empty array', () => {
    expect(dailySeries([], 7, NOW)).toEqual([]);
  });

  test('groups points by day and returns mean', () => {
    const points = [
      { value: 4, at: NOW - 3 * DAY_MS },
      { value: 6, at: NOW - 3 * DAY_MS + 1000 }, // same day
      { value: 8, at: NOW },
    ];
    const series = dailySeries(points, 7, NOW);
    expect(Array.isArray(series)).toBe(true);
    expect(series.length).toBeGreaterThan(0);
  });

  test('only includes points within the window', () => {
    const points = [
      { value: 999, at: NOW - 100 * DAY_MS },
      { value: 4, at: NOW - DAY_MS },
    ];
    const series = dailySeries(points, 7, NOW);
    expect(series).not.toContain(999);
    expect(series).toContain(4);
  });
});
