/**
 * introReoffer.test.js (founder order 2026-09-22 item 2)
 *
 * What this suite pins and why:
 * - parseIntroDismissal correctly handles null/undefined (never dismissed),
 *   the legacy 'true' string (migrates to {count: 1, sessionsAtDismiss: 0}),
 *   valid JSON strings that round-trip, corrupt JSON (reads as null),
 *   and malformed counts (returns null when count < 1 or not finite);
 * - nextIntroDismissal increments count up to INTRO_DISMISSAL_MAX_COUNT (2),
 *   caps the second dismissal, never exceeds it on a third, and records the
 *   session count at dismissal time;
 * - isIntroDismissedNow correctly hides the card at the right session counts
 *   (immediately on second dismissal, or after a gap following the first
 *   dismissal), and shows it again after the INTRO_REOFFER_SESSIONS gap;
 * - the reoffer window and max count constants are used correctly.
 */

const {
  parseIntroDismissal,
  nextIntroDismissal,
  isIntroDismissedNow,
  INTRO_REOFFER_SESSIONS,
  INTRO_DISMISSAL_MAX_COUNT,
} = require('../introReoffer');

describe('parseIntroDismissal', () => {
  test('null returns null', () => {
    expect(parseIntroDismissal(null)).toBeNull();
  });

  test('undefined returns null', () => {
    expect(parseIntroDismissal(undefined)).toBeNull();
  });

  test('legacy string \'true\' returns {count: 1, sessionsAtDismiss: 0}', () => {
    expect(parseIntroDismissal('true')).toEqual({ count: 1, sessionsAtDismiss: 0 });
  });

  test('valid JSON string round-trips', () => {
    const original = { count: 1, sessionsAtDismiss: 5 };
    const serialized = JSON.stringify(original);
    expect(parseIntroDismissal(serialized)).toEqual(original);
  });

  test('corrupt JSON string returns null', () => {
    expect(parseIntroDismissal('{not valid json')).toBeNull();
  });

  test('count below 1 returns null', () => {
    expect(parseIntroDismissal(JSON.stringify({ count: 0, sessionsAtDismiss: 5 }))).toBeNull();
    expect(parseIntroDismissal(JSON.stringify({ count: -1, sessionsAtDismiss: 5 }))).toBeNull();
  });

  test('non-finite count returns null', () => {
    expect(parseIntroDismissal(JSON.stringify({ count: NaN, sessionsAtDismiss: 5 }))).toBeNull();
    expect(parseIntroDismissal(JSON.stringify({ count: Infinity, sessionsAtDismiss: 5 }))).toBeNull();
  });

  test('missing or non-numeric sessionsAtDismiss defaults to 0', () => {
    expect(parseIntroDismissal(JSON.stringify({ count: 1 }))).toEqual({ count: 1, sessionsAtDismiss: 0 });
    expect(parseIntroDismissal(JSON.stringify({ count: 1, sessionsAtDismiss: 'not a number' }))).toEqual({
      count: 1,
      sessionsAtDismiss: 0,
    });
  });

  test('negative sessionsAtDismiss is clamped to 0', () => {
    expect(parseIntroDismissal(JSON.stringify({ count: 1, sessionsAtDismiss: -5 }))).toEqual({
      count: 1,
      sessionsAtDismiss: 0,
    });
  });
});

describe('nextIntroDismissal', () => {
  test('null previous increments to {count: 1, sessionsAtDismiss: totalSessions}', () => {
    expect(nextIntroDismissal(null, 3)).toEqual({ count: 1, sessionsAtDismiss: 3 });
  });

  test('second dismissal caps count at INTRO_DISMISSAL_MAX_COUNT (2)', () => {
    const first = { count: 1, sessionsAtDismiss: 3 };
    const second = nextIntroDismissal(first, 5);
    expect(second.count).toBe(INTRO_DISMISSAL_MAX_COUNT);
    expect(second.sessionsAtDismiss).toBe(5);
  });

  test('third dismissal never exceeds INTRO_DISMISSAL_MAX_COUNT', () => {
    const first = { count: 1, sessionsAtDismiss: 2 };
    const second = nextIntroDismissal(first, 4);
    const third = nextIntroDismissal(second, 6);
    expect(third.count).toBe(INTRO_DISMISSAL_MAX_COUNT);
    expect(third.count).not.toBeGreaterThan(INTRO_DISMISSAL_MAX_COUNT);
  });

  test('totalSessions is normalised to 0 when NaN or falsy', () => {
    expect(nextIntroDismissal(null, NaN)).toEqual({ count: 1, sessionsAtDismiss: 0 });
    expect(nextIntroDismissal(null, undefined)).toEqual({ count: 1, sessionsAtDismiss: 0 });
    expect(nextIntroDismissal(null, null)).toEqual({ count: 1, sessionsAtDismiss: 0 });
  });
});

describe('isIntroDismissedNow', () => {
  test('null dismissal returns false', () => {
    expect(isIntroDismissedNow(null, 100)).toBe(false);
  });

  test('any totalSessions with null dismissal returns false', () => {
    expect(isIntroDismissedNow(null, 0)).toBe(false);
    expect(isIntroDismissedNow(null, 1)).toBe(false);
    expect(isIntroDismissedNow(null, 1000)).toBe(false);
  });

  test('second dismissal (count >= INTRO_DISMISSAL_MAX_COUNT) returns true at any session count', () => {
    const secondDismissal = { count: INTRO_DISMISSAL_MAX_COUNT, sessionsAtDismiss: 5 };
    expect(isIntroDismissedNow(secondDismissal, 5)).toBe(true);
    expect(isIntroDismissedNow(secondDismissal, 6)).toBe(true);
    expect(isIntroDismissedNow(secondDismissal, 1000)).toBe(true);
  });

  test('first dismissal at 3 sessions hides card at 3, 4, 7 and shows at 8', () => {
    const firstDismissal = { count: 1, sessionsAtDismiss: 3 };
    // Hidden while totalSessions < 3 + 5
    expect(isIntroDismissedNow(firstDismissal, 3)).toBe(true);
    expect(isIntroDismissedNow(firstDismissal, 4)).toBe(true);
    expect(isIntroDismissedNow(firstDismissal, 7)).toBe(true);
    // Shown at 8 and beyond
    expect(isIntroDismissedNow(firstDismissal, 8)).toBe(false);
    expect(isIntroDismissedNow(firstDismissal, 9)).toBe(false);
  });

  test('first dismissal at 0 sessions hides until session 5 (0 + INTRO_REOFFER_SESSIONS)', () => {
    const firstDismissal = { count: 1, sessionsAtDismiss: 0 };
    expect(isIntroDismissedNow(firstDismissal, 0)).toBe(true);
    expect(isIntroDismissedNow(firstDismissal, 4)).toBe(true);
    expect(isIntroDismissedNow(firstDismissal, 5)).toBe(false);
  });

  test('negative totalSessions is treated as 0', () => {
    const firstDismissal = { count: 1, sessionsAtDismiss: 3 };
    expect(isIntroDismissedNow(firstDismissal, -5)).toBe(true); // -5 is treated as 0, which is < 3+5
  });

  test('NaN totalSessions is treated as 0', () => {
    const firstDismissal = { count: 1, sessionsAtDismiss: 3 };
    expect(isIntroDismissedNow(firstDismissal, NaN)).toBe(true); // NaN is treated as 0, which is < 3+5
  });
});

describe('constants', () => {
  test('INTRO_REOFFER_SESSIONS is 5', () => {
    expect(INTRO_REOFFER_SESSIONS).toBe(5);
  });

  test('INTRO_DISMISSAL_MAX_COUNT is 2', () => {
    expect(INTRO_DISMISSAL_MAX_COUNT).toBe(2);
  });
});
