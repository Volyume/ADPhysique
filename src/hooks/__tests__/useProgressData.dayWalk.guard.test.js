/**
 * useProgressData.dayWalk.guard.test.js — the twelve-week training calendar
 * walks CALENDAR days, not fixed 24-hour steps.
 *
 * THE DEFECT, fixed 2026-09-15. `loadCalendar` built its 84-day window with
 * `localDayKey(now - i * DAY_MS)`: a fixed 24-hour subtraction, then the LOCAL
 * day key of whatever instant that landed on. Those two disagree across a DST
 * transition. The UK's clocks change twice a year, an 84-day window spans a
 * transition for a large part of the year, and within an hour of midnight the
 * walk lands on the same local day twice and skips a real one.
 *
 * It is not theoretical, and the case below is the measured proof rather than
 * an argument: standing at 2026-12-01 23:30 Europe/London, the fixed-24h walk
 * visits 2026-10-25 (the transition day) TWICE and never visits 2026-09-09 at
 * all. A user who trained on the 9th of September lost that square from their
 * calendar, and the count beneath it was wrong by one.
 *
 * The fix is not new code. `localDayKeysEndingAt` is the shared authority for
 * this exact walk and was already in the tree: it anchors at NOON and steps
 * with `setDate`, which is calendar-aware, so an hour of drift cannot move it
 * off a day. The hook now calls it.
 *
 * This suite pins BOTH halves, because either alone would rot: the property
 * (the helper really does return 84 distinct days across a transition) and the
 * call site (the hook really does use the helper, rather than growing its own
 * walk again).
 *
 * The runner pins TZ=Europe/London (`package.json` test script), so the dates
 * below are stable rather than machine-dependent.
 */
const fs = require('fs');
const path = require('path');
const { localDayKey, localDayKeysEndingAt } = require('../../lib/dayKey');

// 23:30 on 1 December 2026. Late enough in the evening that an hour of drift
// crosses midnight, and far enough from the late-October change that the
// 84-day window spans it.
const LATE_EVENING_AFTER_THE_CLOCKS_WENT_BACK = new Date(2026, 11, 1, 23, 30, 0).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

describe('the twelve-week calendar walks calendar days', () => {
  test('the shared helper returns 84 DISTINCT local days across a DST transition', () => {
    const keys = localDayKeysEndingAt(84, LATE_EVENING_AFTER_THE_CLOCKS_WENT_BACK);
    expect(keys).toHaveLength(84);
    expect(new Set(keys).size).toBe(84);
    // The edges are the two the broken walk got wrong.
    expect(keys).toContain('2026-09-09');
    expect(keys.filter((k) => k === '2026-10-25')).toHaveLength(1);
  });

  test('the fixed 24-hour walk it replaced really was wrong, in this exact way', () => {
    // Kept as a live measurement, not a comment: if a future platform or
    // timezone change ever makes the two walks agree, this case fails and the
    // guard above can be re-justified rather than carried on faith.
    const walk = [];
    for (let i = 0; i < 84; i += 1) {
      walk.push(localDayKey(LATE_EVENING_AFTER_THE_CLOCKS_WENT_BACK - i * DAY_MS));
    }
    expect(walk).toHaveLength(84);
    expect(new Set(walk).size).toBe(83); // one day lost
    expect(walk.filter((k) => k === '2026-10-25')).toHaveLength(2); // and one doubled
    expect(walk).not.toContain('2026-09-09'); // the square a user would have lost
  });

  test('the hook uses the shared helper and has not regrown its own walk', () => {
    const SRC = fs.readFileSync(
      path.resolve(__dirname, '..', 'useProgressData.js'),
      'utf8',
    );
    const code = SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(code).toContain('localDayKeysEndingAt(84, now)');
    // The exact shape of the old bug, banned by pattern rather than by name so
    // a rewritten-but-equivalent walk is caught too.
    expect(code).not.toMatch(/localDayKey\(\s*now\s*-\s*i\s*\*\s*DAY_MS\s*\)/);
  });
});
