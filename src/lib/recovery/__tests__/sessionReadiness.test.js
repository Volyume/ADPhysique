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
 *
 * D219 (lane B3a, design 4.13 last row): the result also names the muscle
 * that is estimated recovered LAST (`latestMuscle`, `latestReadyAtMs`), so
 * "every muscle in this session is estimated recovered by ..." can be true;
 * the limiting-muscle fields stay exactly as pinned above and are not read
 * from the new ones.
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
    // D219 (design 4.13 last row): the shape gained latestMuscle and
    // latestReadyAtMs, null here like the limiting fields; nothing else moved.
    expect(result).toEqual({
      verdict: 'ready',
      minPercent: 100,
      weightedPercent: 100,
      limitingMuscle: null,
      limitingReadyAtMs: null,
      latestMuscle: null,
      latestReadyAtMs: null,
      evidence: false,
      muscles: [],
    });
  });

  test('undefined/null inputs do not throw and read the same as empty', () => {
    expect(() => sessionReadiness(undefined, undefined)).not.toThrow();
    expect(sessionReadiness(null, null)).toEqual(sessionReadiness({}, {}));
  });
});

describe('sessionReadiness -- the latest ready time among the counted muscles (D219, design 4.13 last row)', () => {
  const H = 60 * 60 * 1000;

  test('names the muscle estimated recovered last and carries ITS readyAtMs; the limiting fields stay the least-recovered muscle\'s', () => {
    // The probe the design cites: calves 11% recovered (ready in 28 h) limit
    // the session, but the quads a few lines down are not ready for 61 h.
    const result = sessionReadiness(
      { quads: 6, calves: 4 },
      { quads: entry(29, { readyAtMs: 61 * H }), calves: entry(11, { readyAtMs: 28 * H }) },
    );
    expect(result.limitingMuscle).toBe('calves');
    expect(result.limitingReadyAtMs).toBe(28 * H);
    expect(result.latestMuscle).toBe('quads');
    expect(result.latestReadyAtMs).toBe(61 * H);
  });

  test('every existing field and the verdict read exactly as they did without the new fields', () => {
    const { latestMuscle, latestReadyAtMs, ...rest } = sessionReadiness(
      { quads: 10, chest: 8, calves: 4 },
      {
        quads: entry(95, { readyAtMs: null }),
        chest: entry(60, { readyAtMs: 123456, status: 'recovering' }),
        calves: entry(99, { readyAtMs: null, status: 'recovered' }),
      },
    );
    expect(latestMuscle).toBe('chest');
    expect(latestReadyAtMs).toBe(123456);
    expect(rest).toEqual({
      verdict: 'not_yet',
      minPercent: 60,
      weightedPercent: (95 * 10 + 60 * 8 + 99 * 4) / 22,
      limitingMuscle: 'chest',
      limitingReadyAtMs: 123456,
      evidence: true,
      muscles: [
        { muscle: 'quads', plannedSets: 10, recoveredPercent: 95, status: 'recovering' },
        { muscle: 'chest', plannedSets: 8, recoveredPercent: 60, status: 'recovering' },
        { muscle: 'calves', plannedSets: 4, recoveredPercent: 99, status: 'recovered' },
      ],
    });
  });

  test('only counted muscles count: a muscle with fewer than 2 planned sets never sets the latest time', () => {
    const result = sessionReadiness(
      { quads: 6, calves: 1 },
      { quads: entry(40, { readyAtMs: 10 * H }), calves: entry(5, { readyAtMs: 99 * H }) },
    );
    expect(result.latestMuscle).toBe('quads');
    expect(result.latestReadyAtMs).toBe(10 * H);
  });

  test('a muscle already recovered, or with no recent session, has no ready time and never sets the latest', () => {
    const result = sessionReadiness(
      { quads: 6, chest: 6, back: 6 },
      {
        quads: entry(95, { readyAtMs: null }),
        chest: { recoveredPercent: 100, status: 'no_recent_session', readyAtMs: null },
        back: entry(70, { readyAtMs: 5 * H }),
      },
    );
    expect(result.latestMuscle).toBe('back');
    expect(result.latestReadyAtMs).toBe(5 * H);
  });

  test('nothing pending (all recovered, no evidence, or no counted muscle) leaves both fields null', () => {
    const recovered = sessionReadiness({ quads: 6, chest: 6 }, { quads: entry(95), chest: entry(100) });
    expect(recovered.verdict).toBe('ready');
    expect(recovered.latestMuscle).toBeNull();
    expect(recovered.latestReadyAtMs).toBeNull();
    const none = sessionReadiness({ calves: 1 }, { calves: entry(10, { readyAtMs: 7 * H }) });
    expect(none.latestMuscle).toBeNull();
    expect(none.latestReadyAtMs).toBeNull();
    expect(sessionReadiness(undefined, undefined).latestMuscle).toBeNull();
  });

  test('a tie goes to the first muscle in the planned order, as the limiting muscle does', () => {
    const result = sessionReadiness(
      { back: 6, chest: 6, quads: 6 },
      {
        back: entry(50, { readyAtMs: 30 * H }),
        chest: entry(50, { readyAtMs: 30 * H }),
        quads: entry(80, { readyAtMs: 10 * H }),
      },
    );
    expect(result.latestMuscle).toBe('back');
    expect(result.latestReadyAtMs).toBe(30 * H);
  });

  test('a muscle missing from the map has no ready time and is never the latest', () => {
    const result = sessionReadiness({ quads: 6, chest: 6 }, { quads: entry(70, { readyAtMs: 4 * H }) });
    expect(result.latestMuscle).toBe('quads');
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
