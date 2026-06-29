/**
 * ADVERSARIAL probes for muscleRecovery freshnessBand / recoveryWindowDays.
 * Attacks the boundary and bad-input cases the shipped suite skims.
 */
import {
  freshnessBand,
  recoveryWindowDays,
  RECOVERY_WINDOW_DAYS,
  DEFAULT_RECOVERY_WINDOW_DAYS,
} from '../muscleRecovery';

describe('freshnessBand — adversarial inputs', () => {
  test('fractional day just under a 1-day window is recovering, not fresh', () => {
    // calves window = 1. 0 < 0.5 < 1 → recovering.
    expect(freshnessBand(0.5, 'calves')).toBe('recovering');
  });

  test('exactly 0 is fatigued even for a 1-day window', () => {
    expect(freshnessBand(0, 'calves')).toBe('fatigued');
  });

  test('a negative window key cannot exist, but a 0-window-key clamps to >=1', () => {
    // No muscle has window 0, but recoveryWindowDays for an unknown key returns
    // the default (2); freshnessBand clamps window to >=1 regardless. Drive an
    // unknown muscle and assert bands are well-ordered (no fresh-before-recovering).
    expect(freshnessBand(0, 'unknownmuscle')).toBe('fatigued');
    expect(freshnessBand(1, 'unknownmuscle')).toBe('recovering'); // default window 2
    expect(freshnessBand(2, 'unknownmuscle')).toBe('fresh');
  });

  test('string daysSince is treated as non-finite → null (never coerced)', () => {
    // A caller passing "3" (string) must not silently band as 3 days.
    expect(freshnessBand('3', 'back')).toBeNull();
  });

  test('boolean / object daysSince → null, never a band', () => {
    expect(freshnessBand(true, 'back')).toBeNull();
    expect(freshnessBand({}, 'back')).toBeNull();
    expect(freshnessBand([], 'back')).toBeNull();
  });

  test('every known muscle bands consistently at its own window boundary', () => {
    for (const muscle of Object.keys(RECOVERY_WINDOW_DAYS)) {
      const w = recoveryWindowDays(muscle);
      expect(freshnessBand(0, muscle)).toBe('fatigued');
      expect(freshnessBand(w, muscle)).toBe('fresh');
      if (w > 1) expect(freshnessBand(w - 0.5, muscle)).toBe('recovering');
    }
  });

  test('a numeric-string-looking but huge value still null-guards (no Infinity band)', () => {
    expect(freshnessBand(Number.POSITIVE_INFINITY, 'back')).toBeNull();
  });
});

describe('recoveryWindowDays — adversarial', () => {
  test('numeric key (not a muscle) returns the default, does not throw', () => {
    expect(recoveryWindowDays(42)).toBe(DEFAULT_RECOVERY_WINDOW_DAYS);
  });

  test('object key returns the default, does not throw', () => {
    expect(recoveryWindowDays({})).toBe(DEFAULT_RECOVERY_WINDOW_DAYS);
  });
});
