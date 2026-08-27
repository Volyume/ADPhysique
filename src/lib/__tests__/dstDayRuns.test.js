/**
 * A run of calendar days survives a DST change (adversarial audit 2026-08-26,
 * finding 7).
 *
 * THE DEFECT. The 84-day training grid built each square by subtracting
 * `offset * 86400000` from the current instant. A fixed 24 hours is not a
 * calendar day: a week containing a UK transition is 167 or 169 hours, so the
 * run slides by an hour as it crosses one and a real calendar day falls out of
 * it. Measured for Europe/London, a grid drawn at 00:30 on 2025-04-15 contained
 * no square at all for 2025-03-30, the spring-forward day. Someone who trained
 * that day saw nothing for it, and the grid's own "Trained N of the last 84
 * days" label counted a window it was not showing. It needed the render to fall
 * in the hour after local midnight, which is why it sat there unnoticed.
 *
 * WHY THE SUITE NOW PINS A TIMEZONE. The first version of this file tried to
 * set process.env.TZ per test. That does not work inside Jest: the worker's
 * sandbox binds its timezone when the context is created, so the env var reads
 * back as changed while Date carries on in UTC. The tests passed, comparing one
 * UTC implementation against another, and proved nothing about the bug they
 * were written for. `npm test` now runs under TZ=Europe/London — the app's own
 * timezone, and the one its British-English, Monday-start week is written for —
 * and the guard below fails loudly rather than let this file go quiet again.
 *
 * WHAT WAS CHECKED AND FOUND CLEAN. The sibling pattern
 * `localDayKey(weekStartMs + 6 * 86400000)`, used for the weekly check-in's end
 * key in four places, never drifts across all 104 weeks of 2025 and 2026: UK
 * transitions happen on a Sunday at 01:00/02:00, always after that Sunday's
 * local midnight, so a Monday-to-Sunday span never contains one. Pinned below
 * so nobody "fixes" a correct thing later.
 */

const { localDayKey, localDayKeysEndingAt, localWeekStartMs } = require('../dayKey');

/** The old implementation, so the defect is demonstrated rather than described. */
function fixedStepDayKeys(count, endMs) {
  return Array.from({ length: count }, (_, i) => localDayKey(endMs - (count - 1 - i) * 86400000));
}

/** Independent reference: step a local Date one calendar day at a time. */
function calendarDayKeys(count, endMs) {
  const d = new Date(endMs);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (count - 1));
  return Array.from({ length: count }, () => {
    const key = localDayKey(d.getTime());
    d.setDate(d.getDate() + 1);
    return key;
  });
}

describe('the tests below are actually running somewhere with DST', () => {
  test('the process timezone observes British Summer Time', () => {
    // Without this, every assertion in this file is a UTC tautology. Asserted
    // through Date itself, not process.env.TZ, because Jest lets that env var
    // be set while Date ignores it — which is exactly how the first version of
    // this file fooled itself.
    const january = new Date(2025, 0, 15).getTimezoneOffset();
    const july = new Date(2025, 6, 15).getTimezoneOffset();
    expect(january).toBe(0);      // GMT
    expect(july).toBe(-60);       // BST, one hour ahead
  });
});

describe('the spring transition, in the timezone the app is written for', () => {
  // 00:30 on 2025-04-15: the 84-day window reaches back over the 30 March
  // spring-forward, and the render time is inside the hour that exposes it.
  const AT = new Date(2025, 3, 15, 0, 30).getTime();

  test('the old fixed-24h step really did drop a day', () => {
    const old = fixedStepDayKeys(84, AT);
    expect(old).not.toContain('2025-03-30');
    // A missing calendar day, not a duplicate — so counting the squares would
    // never have caught it. Eighty-four squares, eighty-four distinct days,
    // one of them not the day it should be.
    expect(new Set(old).size).toBe(84);
  });

  test('the fix contains that day', () => {
    expect(localDayKeysEndingAt(84, AT)).toContain('2025-03-30');
  });

  test('the fix matches an independent calendar walk, day for day', () => {
    expect(localDayKeysEndingAt(84, AT)).toEqual(calendarDayKeys(84, AT));
  });

  test('it ends on today and starts 83 days earlier', () => {
    const keys = localDayKeysEndingAt(84, AT);
    expect(keys[83]).toBe('2025-04-15');
    expect(keys[0]).toBe('2025-01-22');
    expect(keys).toHaveLength(84);
  });
});

describe('the autumn transition', () => {
  const AT = new Date(2025, 10, 15, 0, 30).getTime();

  test('no day is dropped or repeated', () => {
    const keys = localDayKeysEndingAt(84, AT);
    expect(new Set(keys).size).toBe(84);
    expect(keys).toContain('2025-10-26');   // the clocks-back day
    expect(keys).toEqual(calendarDayKeys(84, AT));
  });
});

describe('every render time of day gives the same run of days', () => {
  test.each([0, 1, 6, 12, 18, 23])('rendered at %s:30 local', (hour) => {
    const keys = localDayKeysEndingAt(84, new Date(2025, 3, 15, hour, 30).getTime());
    expect(keys).toContain('2025-03-30');
    expect(keys[83]).toBe('2025-04-15');
  });

  test('and only the 00:30 render exposed the old bug', () => {
    // Why it survived: at midday the fixed-step run happens to land on the
    // right days anyway. The defect was real but only visible for an hour a
    // day, which is the worst kind to leave in.
    expect(fixedStepDayKeys(84, new Date(2025, 3, 15, 12, 30).getTime()))
      .toContain('2025-03-30');
    expect(fixedStepDayKeys(84, new Date(2025, 3, 15, 0, 30).getTime()))
      .not.toContain('2025-03-30');
  });
});

describe('degenerate inputs are safe', () => {
  test('zero and negative counts give an empty run rather than throwing', () => {
    expect(localDayKeysEndingAt(0)).toEqual([]);
    expect(localDayKeysEndingAt(-5)).toEqual([]);
  });

  test('a non-finite count is treated as none', () => {
    expect(localDayKeysEndingAt(NaN)).toEqual([]);
    expect(localDayKeysEndingAt(Infinity)).toEqual([]);
  });

  test('a non-finite end falls back to now rather than producing NaN keys', () => {
    // A 'NaN-NaN-NaN' key in a day bucket is the failure mode this guards.
    const keys = localDayKeysEndingAt(3, NaN);
    expect(keys).toHaveLength(3);
    expect(keys.every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))).toBe(true);
  });

  test('a single day is just today', () => {
    expect(localDayKeysEndingAt(1, new Date(2025, 3, 15, 9, 0).getTime()))
      .toEqual(['2025-04-15']);
  });
});

describe('the week-end key pattern is correct and stays untouched', () => {
  test('weekStartMs + 6 days never disagrees with the calendar Sunday', () => {
    // Four call sites use this for the weekly check-in's end key. It looks like
    // the same defect and is not: UK transitions land on a Sunday at 01:00 or
    // 02:00, always after that Sunday's local midnight, so a Monday-to-Sunday
    // span never contains one. Measured across two years, not argued.
    const mismatches = [];
    for (let i = 0; i < 104; i += 1) {
      const weekStart = localWeekStartMs(new Date(2025, 0, 6 + i * 7, 12).getTime());
      const plusSix = localDayKey(weekStart + 6 * 86400000);
      const walked = new Date(weekStart);
      walked.setDate(walked.getDate() + 6);
      if (plusSix !== localDayKey(walked.getTime())) {
        mismatches.push(`${localDayKey(weekStart)} -> ${plusSix}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  test('the weeks either side of a transition really were covered', () => {
    // Guard against the loop above silently testing nothing: the 2025 spring
    // and autumn transition weeks must be inside its range.
    const covered = Array.from({ length: 104 }, (_, i) => localDayKey(
      localWeekStartMs(new Date(2025, 0, 6 + i * 7, 12).getTime()),
    ));
    expect(covered).toContain('2025-03-24');   // week containing 30 March
    expect(covered).toContain('2025-10-20');   // week containing 26 October
  });
});

describe('the grid component uses the calendar helper, not a fixed step', () => {
  const fs = require('fs');
  const path = require('path');
  const SRC = fs.readFileSync(
    path.join(__dirname, '..', '..', 'components', 'ProgressSections.js'), 'utf8',
  );
  const code = SRC.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  test('it calls localDayKeysEndingAt', () => {
    expect(code).toMatch(/localDayKeysEndingAt\(84\)/);
  });

  test('the fixed-step arithmetic is gone', () => {
    expect(code).not.toMatch(/dayOffset \* 86400000/);
  });
});
