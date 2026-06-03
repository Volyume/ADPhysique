/**
 * WK-4: a rest-timer decrement must never drop below 5s and never flip sign.
 * The old `Math.max(delta, -(remaining - 5))` turned "-30s" into +3s when under
 * 5s remained.
 */
import { clampRestDelta } from '../restTimerMath';

describe('clampRestDelta', () => {
  test('full decrement applies when there is plenty of room', () => {
    expect(clampRestDelta(-30, 90)).toBe(-30);
    expect(clampRestDelta(-15, 90)).toBe(-15);
  });
  test('decrement is capped so it never goes below 5s', () => {
    expect(clampRestDelta(-30, 7)).toBe(-2);
    expect(clampRestDelta(-30, 5)).toBe(0);
  });
  test('never adds time on a decrement when under 5s (the bug)', () => {
    expect(clampRestDelta(-30, 2)).toBe(0);
    expect(clampRestDelta(-15, 3)).toBe(0);
    expect(clampRestDelta(-30, 4)).toBe(0);
  });
  test('increments pass through unchanged', () => {
    expect(clampRestDelta(30, 2)).toBe(30);
    expect(clampRestDelta(15, 90)).toBe(15);
  });
  test('non-finite inputs never produce NaN', () => {
    expect(clampRestDelta(-30, NaN)).toBe(0);
    expect(clampRestDelta(NaN, 90)).toBe(0);
    expect(clampRestDelta(-30, undefined)).toBe(0);
  });
});
