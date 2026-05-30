import { estimateStepsFromMinutes, STEPS_PER_MINUTE } from '../stepEstimate';

describe('estimateStepsFromMinutes', () => {
  test('converts at the documented cadence, rounded to the nearest 100', () => {
    // 30 min * 110 = 3300
    expect(estimateStepsFromMinutes(30)).toBe(3300);
    // 45 min * 110 = 4950 -> nearest 100 = 5000
    expect(estimateStepsFromMinutes(45)).toBe(5000);
  });

  test('cadence constant is in the 100 to 120 coaching band', () => {
    expect(STEPS_PER_MINUTE).toBeGreaterThanOrEqual(100);
    expect(STEPS_PER_MINUTE).toBeLessThanOrEqual(120);
  });

  test('returns 0 for zero, negative, or non-numeric input', () => {
    expect(estimateStepsFromMinutes(0)).toBe(0);
    expect(estimateStepsFromMinutes(-10)).toBe(0);
    expect(estimateStepsFromMinutes('abc')).toBe(0);
    expect(estimateStepsFromMinutes(null)).toBe(0);
    expect(estimateStepsFromMinutes(undefined)).toBe(0);
  });

  test('accepts a numeric string', () => {
    expect(estimateStepsFromMinutes('20')).toBe(2200);
  });
});
