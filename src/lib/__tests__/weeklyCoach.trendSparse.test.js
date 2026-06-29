/**
 * Invariant: the weekly weight trend must NOT be fabricated from sub-7-day data.
 *
 * Regression guard for D1 #3 — getEwmaSevenDaysAgo used to fall back to the
 * earliest recent EWMA reading when no weigh-in was at-or-before the 7-day
 * cutoff, so a 2-3 day span got scaled as a full weekly rate (~2x overstated),
 * feeding a wrong on/off-target verdict and calorie adjustment. It must return
 * null (trend not yet computable) instead.
 */
import { getEwmaSevenDaysAgo, computeWeeklyTrendPct } from '../weeklyCoach';

const DAY = 86_400_000;

describe('weekly trend on sparse data (D1 #3)', () => {
  test('getEwmaSevenDaysAgo returns null when no weigh-in is >= 7 days old', () => {
    const now = Date.now();
    const sparse = [3, 2, 1, 0].map((d) => ({ loggedAt: now - d * DAY, weightKg: 85 - d * 0.1 }));
    expect(getEwmaSevenDaysAgo(sparse)).toBeNull();
  });

  test('getEwmaSevenDaysAgo returns a number once the data spans >= 7 days', () => {
    const now = Date.now();
    const wide = [10, 7, 3, 0].map((d) => ({ loggedAt: now - d * DAY, weightKg: 85 - (10 - d) * 0.05 }));
    expect(typeof getEwmaSevenDaysAgo(wide)).toBe('number');
  });

  test('computeWeeklyTrendPct returns null on <7-day data rather than a fabricated rate', () => {
    const now = Date.now();
    const sparse = [3, 2, 1, 0].map((d) => ({ loggedAt: now - d * DAY, weightKg: 85 - d * 0.1 }));
    expect(computeWeeklyTrendPct(sparse, 85)).toBeNull();
  });
});
