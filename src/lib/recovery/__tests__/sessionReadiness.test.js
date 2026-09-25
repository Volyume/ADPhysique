/**
 * sessionReadiness.test.js -- register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 3.3. Pins: only
 * muscles with at least 2 planned sets are considered (a single incidental
 * set never holds a session back); the verdict follows the MINIMUM
 * recoveredPercent among those, naming the limiting muscle and carrying its
 * readyAtMs; a sets-weighted mean rides for display but never drives the
 * verdict; a muscle missing from the recovery map, or flagged
 * no_recent_session, counts as 100 (never as unready); an empty planned
 * input reads ready with no limiting muscle; the module is deterministic
 * and does no I/O.
 */
import fs from 'fs';
import path from 'path';
import { READY_PERCENT, NEARLY_PERCENT } from '../constants';
import { sessionReadiness } from '../sessionReadiness';

function entry(recoveredPercent, extra = {}) {
  return { recoveredPercent, status: 'recovering', readyAtMs: null, ...extra };
}

describe('sessionReadiness -- the 2-set threshold', () => {
  test('a muscle with 1 planned set is ignored entirely, even if it is the least recovered', () => {
    const result = sessionReadiness(
      { quads: 6, calves: 1 },
      { quads: entry(95), calves: entry(10) },
    );
    expect(result.muscles.map((m) => m.muscle)).toEqual(['quads']);
    expect(result.verdict).toBe('ready');
    expect(result.limitingMuscle).toBe('quads');
  });

  test('exactly 2 planned sets counts', () => {
    const result = sessionReadiness({ quads: 2 }, { quads: entry(50) });
    expect(result.muscles).toHaveLength(1);
    expect(result.limitingMuscle).toBe('quads');
  });

  test('zero, negative or non-finite planned sets are ignored', () => {
    const result = sessionReadiness(
      { quads: 0, chest: -5, back: NaN, calves: 4 },
      { quads: entry(10), chest: entry(10), back: entry(10), calves: entry(80) },
    );
    expect(result.muscles.map((m) => m.muscle)).toEqual(['calves']);
  });
});

describe('sessionReadiness -- the limiting muscle and verdict bands', () => {
  test('the limiting muscle is the minimum recoveredPercent among counted muscles', () => {
    const result = sessionReadiness(
      { quads: 10, chest: 8, calves: 4 },
      { quads: entry(95), chest: entry(60), calves: entry(99) },
    );
    expect(result.limitingMuscle).toBe('chest');
    expect(result.minPercent).toBe(60);
    expect(result.verdict).toBe('not_yet');
  });

  test('verdict is ready at exactly READY_PERCENT on the minimum', () => {
    const result = sessionReadiness({ quads: 10 }, { quads: entry(READY_PERCENT) });
    expect(result.verdict).toBe('ready');
  });

  test('verdict is nearly between NEARLY_PERCENT and just under READY_PERCENT', () => {
    const atFloor = sessionReadiness({ quads: 10 }, { quads: entry(NEARLY_PERCENT) });
    expect(atFloor.verdict).toBe('nearly');
    const justBelowReady = sessionReadiness({ quads: 10 }, { quads: entry(READY_PERCENT - 1) });
    expect(justBelowReady.verdict).toBe('nearly');
  });

  test('verdict is not_yet below NEARLY_PERCENT', () => {
    const result = sessionReadiness({ quads: 10 }, { quads: entry(NEARLY_PERCENT - 1) });
    expect(result.verdict).toBe('not_yet');
  });

  test("carries the limiting muscle's readyAtMs, not any other muscle's", () => {
    const result = sessionReadiness(
      { quads: 10, chest: 8 },
      { quads: entry(95, { readyAtMs: 999 }), chest: entry(60, { readyAtMs: 123456 }) },
    );
    expect(result.limitingMuscle).toBe('chest');
    expect(result.limitingReadyAtMs).toBe(123456);
  });
});

describe('sessionReadiness -- no_recent_session and missing entries count as 100', () => {
  test('a muscle flagged no_recent_session never limits the session', () => {
    const result = sessionReadiness(
      { quads: 10, chest: 8 },
      { quads: entry(95), chest: { recoveredPercent: 100, status: 'no_recent_session', readyAtMs: null } },
    );
    expect(result.verdict).toBe('ready');
    expect(result.limitingMuscle).toBe('quads');
  });

  test('a muscle absent from the recovery map counts as 100, not zero', () => {
    const result = sessionReadiness({ quads: 10, chest: 8 }, { quads: entry(95) });
    expect(result.verdict).toBe('ready');
    const chestRow = result.muscles.find((m) => m.muscle === 'chest');
    expect(chestRow.recoveredPercent).toBe(100);
    expect(chestRow.status).toBe('no_recent_session');
  });
});

describe('sessionReadiness -- the weighted mean is for display, never the verdict', () => {
  test('weightedPercent is the sets-weighted mean; the verdict still follows the minimum', () => {
    // 10 sets at 40%, 2 sets at 95%: the mean is pulled well above 40%, but
    // the verdict must still follow the MINIMUM, not the mean.
    const result = sessionReadiness(
      { quads: 10, calves: 2 },
      { quads: entry(40), calves: entry(95) },
    );
    expect(result.minPercent).toBe(40);
    expect(result.verdict).toBe('not_yet');
    expect(result.weightedPercent).toBeCloseTo((40 * 10 + 95 * 2) / 12, 6);
    expect(result.weightedPercent).toBeGreaterThan(result.minPercent);
  });
});

describe('sessionReadiness -- empty input', () => {
  test('no planned muscles at all reads ready, minPercent 100, no limiting muscle', () => {
    const result = sessionReadiness({}, {});
    expect(result).toEqual({
      verdict: 'ready',
      minPercent: 100,
      weightedPercent: 100,
      limitingMuscle: null,
      limitingReadyAtMs: null,
      muscles: [],
    });
  });

  test('undefined/null inputs do not throw and read the same as empty', () => {
    expect(() => sessionReadiness(undefined, undefined)).not.toThrow();
    expect(sessionReadiness(null, null)).toEqual(sessionReadiness({}, {}));
  });
});

describe('determinism', () => {
  test('two identical calls give deep-equal output', () => {
    const planned = { quads: 10, chest: 8, calves: 1 };
    const map = { quads: entry(72), chest: entry(88, { readyAtMs: 999 }) };
    expect(sessionReadiness(planned, map)).toEqual(sessionReadiness(planned, map));
  });
});

describe('purity (source guard)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'sessionReadiness.js'), 'utf8');

  test('imports nothing that does I/O and never reads the clock or randomness', () => {
    expect(src).not.toMatch(/from ['"]\.\.\/database/);
    expect(src).not.toMatch(/async-storage|expo-sqlite|react-native/i);
    expect(src).not.toMatch(/Date\.now\(|new Date\(|Math\.random/);
  });
});
