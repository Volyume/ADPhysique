/**
 * volumeWindow.js -- D200-1 (Progress-tab audit 2026-09-24, findings F1/F6;
 * docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md). Pins the
 * divisor (weeksCounted) and the division (perWeekVolume) that fix the
 * VolumeHeatmapScreen defect: a 2- or 4-week window summed working sets
 * against WEEKLY MEV/MAV/MRV bands with nothing dividing by the weeks in
 * the window.
 *
 * D214 (Progress, recovery heatmap and Consistency elevation, section 7.4 item
 * 2 of docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md) amends ruling 1's "1-week view unchanged": "This week"
 * is the Monday-anchored local week so far (volumeWindowBounds), so the
 * heatmap agrees with the Progress strip and the plan. The 2- and 4-week
 * windows stay exactly the rolling weekly averages the tests below pin; the
 * D214 tests at the end of this file pin both halves.
 */
import { weeksCounted, perWeekVolume, volumeWindowBounds, normaliseWindowWeeks } from '../volumeWindow';
import { localWeekStartMs } from '../dayKey';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const NOW = Date.UTC(2026, 8, 24, 12, 0, 0);

// Mirrors VolumeHeatmapScreen.loadData's own window maths, so the test
// inputs are exactly what the screen would pass.
function currentWindow(weeks) {
  return { windowStartMs: NOW - weeks * WEEK, windowEndMs: NOW };
}
function previousWindow(weeks) {
  const windowMs = weeks * WEEK;
  return { windowStartMs: NOW - 2 * windowMs, windowEndMs: NOW - windowMs };
}

describe('weeksCounted -- an account with a long history counts the full window', () => {
  const earliestSetMs = NOW - 400 * DAY;

  test('1 week -> 1', () => {
    expect(weeksCounted({ ...currentWindow(1), earliestSetMs })).toBe(1);
  });
  test('2 weeks -> 2', () => {
    expect(weeksCounted({ ...currentWindow(2), earliestSetMs })).toBe(2);
  });
  test('4 weeks -> 4', () => {
    expect(weeksCounted({ ...currentWindow(4), earliestSetMs })).toBe(4);
  });
});

describe('weeksCounted -- a young account divides by what it actually has', () => {
  test('a ten-day-old account viewing "4 weeks" counts 2 weeks', () => {
    const earliestSetMs = NOW - 10 * DAY;
    expect(weeksCounted({ ...currentWindow(4), earliestSetMs })).toBe(2);
  });

  test('a two-day-old account viewing "2 weeks" counts 1 week', () => {
    const earliestSetMs = NOW - 2 * DAY;
    expect(weeksCounted({ ...currentWindow(2), earliestSetMs })).toBe(1);
  });

  test('a two-week-old account viewing "4 weeks" counts 2 weeks', () => {
    // Named explicitly in the D200-1 ruling text alongside the ten-day case.
    const earliestSetMs = NOW - 14 * DAY;
    expect(weeksCounted({ ...currentWindow(4), earliestSetMs })).toBe(2);
  });

  test('never exceeds the window it was asked about, even for a brand-new account', () => {
    const earliestSetMs = NOW - 1000; // a set logged moments ago
    expect(weeksCounted({ ...currentWindow(1), earliestSetMs })).toBe(1);
    expect(weeksCounted({ ...currentWindow(2), earliestSetMs })).toBe(1);
    expect(weeksCounted({ ...currentWindow(4), earliestSetMs })).toBe(1);
  });
});

describe('weeksCounted -- no usable data reads as 0, never divides', () => {
  test('no sets at all (null earliestSetMs)', () => {
    expect(weeksCounted({ ...currentWindow(4), earliestSetMs: null })).toBe(0);
  });

  test('no sets at all (undefined earliestSetMs)', () => {
    expect(weeksCounted({ ...currentWindow(2), earliestSetMs: undefined })).toBe(0);
  });

  test('a non-finite earliestSetMs (malformed data) reads as 0, not NaN', () => {
    expect(weeksCounted({ ...currentWindow(4), earliestSetMs: NaN })).toBe(0);
  });

  test('a previous window entirely before the account\'s first set', () => {
    // Account is 3 days old; the "previous" 2-week window (days 14-28 ago)
    // lies wholly before that -- the ghost bar must be hidden, not divided.
    const earliestSetMs = NOW - 3 * DAY;
    expect(weeksCounted({ ...previousWindow(2), earliestSetMs })).toBe(0);
  });

  test('a previous window exactly abutting the first set (still before it) reads 0', () => {
    // earliestSetMs sits exactly on the previous window's end boundary --
    // the window is [start, end), so equality still means "not inside".
    const { windowEndMs } = previousWindow(4);
    expect(weeksCounted({ ...previousWindow(4), earliestSetMs: windowEndMs })).toBe(0);
  });
});

describe('weeksCounted -- the previous window for a mature account counts its own full span', () => {
  test('an old account\'s previous 4-week window still counts 4 weeks', () => {
    const earliestSetMs = NOW - 400 * DAY;
    expect(weeksCounted({ ...previousWindow(4), earliestSetMs })).toBe(4);
  });
});

describe('perWeekVolume -- divides workingSets only', () => {
  const volumeByMuscle = {
    chest: { workingSets: 24, reps: 240, tonnage: 12000 },
    back: { workingSets: 10, reps: 80, tonnage: 6000 },
  };

  test('divides workingSets by the given weeks, leaves reps and tonnage untouched', () => {
    const out = perWeekVolume(volumeByMuscle, 4);
    expect(out.chest.workingSets).toBe(6);
    expect(out.chest.reps).toBe(240);
    expect(out.chest.tonnage).toBe(12000);
    expect(out.back.workingSets).toBe(2.5);
    expect(out.back.reps).toBe(80);
    expect(out.back.tonnage).toBe(6000);
  });

  test('flags each entry perWeek: true when it divided', () => {
    const out = perWeekVolume(volumeByMuscle, 2);
    expect(out.chest.perWeek).toBe(true);
    expect(out.back.perWeek).toBe(true);
  });

  test('weeks <= 0 returns workingSets unchanged, flagged perWeek: false', () => {
    const out = perWeekVolume(volumeByMuscle, 0);
    expect(out.chest.workingSets).toBe(24);
    expect(out.chest.perWeek).toBe(false);
    expect(out.back.workingSets).toBe(10);
    expect(out.back.perWeek).toBe(false);
  });

  test('a negative or non-finite weeks value also leaves workingSets unchanged', () => {
    expect(perWeekVolume(volumeByMuscle, -1).chest.workingSets).toBe(24);
    expect(perWeekVolume(volumeByMuscle, NaN).chest.workingSets).toBe(24);
  });

  test('does not mutate the input object', () => {
    const original = { chest: { workingSets: 24, reps: 240, tonnage: 12000 } };
    const copy = JSON.parse(JSON.stringify(original));
    perWeekVolume(original, 4);
    expect(original).toEqual(copy);
  });

  test('an empty or missing volumeByMuscle returns an empty object, never throws', () => {
    expect(perWeekVolume({}, 4)).toEqual({});
    expect(perWeekVolume(undefined, 4)).toEqual({});
  });
});

describe('determinism', () => {
  test('weeksCounted is pure: same inputs give the same output', () => {
    const args = { ...currentWindow(4), earliestSetMs: NOW - 10 * DAY };
    expect(weeksCounted(args)).toBe(weeksCounted(args));
  });

  test('perWeekVolume is pure: same inputs give the same output', () => {
    const vol = { chest: { workingSets: 24, reps: 240, tonnage: 12000 } };
    expect(perWeekVolume(vol, 4)).toEqual(perWeekVolume(vol, 4));
  });
});

describe('D214: "This week" is the Monday-anchored week so far (amending ruling 1\'s "1-week view unchanged")', () => {
  // Local-time fixtures (new Date(y, m, d, h)), so the pins hold in any TZ.
  const WED_NOON = new Date(2026, 5, 10, 12, 0, 0).getTime(); // Wed 10 Jun 2026
  const MONDAY_MIDNIGHT = new Date(2026, 5, 8, 0, 0, 0).getTime();

  test('a Wednesday reads from that week\'s Monday 00:00 to now, flagged Monday-anchored', () => {
    expect(volumeWindowBounds({ windowWeeks: 1, nowMs: WED_NOON }))
      .toEqual({ weeks: 1, startMs: MONDAY_MIDNIGHT, endMs: WED_NOON, mondayAnchored: true });
  });

  test('it is NOT the rolling seven days ruling 1 kept: Sunday evening is last week', () => {
    const { startMs } = volumeWindowBounds({ windowWeeks: 1, nowMs: WED_NOON });
    const sundayEvening = new Date(2026, 5, 7, 20, 0, 0).getTime();
    expect(sundayEvening).toBeGreaterThan(WED_NOON - 7 * DAY); // inside a rolling 7 days
    expect(sundayEvening).toBeLessThan(startMs); // outside the Monday week
  });

  test('on a Monday morning the window is almost empty (the cost the plan accepts)', () => {
    const monday = new Date(2026, 5, 8, 0, 30, 0).getTime();
    const { startMs, endMs } = volumeWindowBounds({ windowWeeks: 1, nowMs: monday });
    expect(endMs - startMs).toBe(30 * 60 * 1000);
  });

  test('on a Sunday night the window is the whole week behind it', () => {
    const sunday = new Date(2026, 5, 14, 23, 59, 0).getTime();
    expect(volumeWindowBounds({ windowWeeks: 1, nowMs: sunday }).startMs).toBe(MONDAY_MIDNIGHT);
  });

  test('it agrees with the helper every other "this week" reading uses', () => {
    for (const day of [8, 9, 10, 11, 12, 13, 14]) {
      const now = new Date(2026, 5, day, 15, 0, 0).getTime();
      expect(volumeWindowBounds({ windowWeeks: 1, nowMs: now }).startMs).toBe(localWeekStartMs(now));
    }
  });

  test('2 and 4 weeks stay rolling spans (now minus N x 7 days), unchanged from D200-1', () => {
    expect(volumeWindowBounds({ windowWeeks: 2, nowMs: WED_NOON }))
      .toEqual({ weeks: 2, startMs: WED_NOON - 2 * WEEK, endMs: WED_NOON, mondayAnchored: false });
    expect(volumeWindowBounds({ windowWeeks: 4, nowMs: WED_NOON }))
      .toEqual({ weeks: 4, startMs: WED_NOON - 4 * WEEK, endMs: WED_NOON, mondayAnchored: false });
  });

  test('the 4-week average is the D200-1 reading: 48 sets over four counted weeks is 12 a week', () => {
    const { startMs, endMs } = volumeWindowBounds({ windowWeeks: 4, nowMs: WED_NOON });
    const earliestSetMs = WED_NOON - 60 * DAY;
    const divisor = weeksCounted({ windowStartMs: startMs, windowEndMs: endMs, earliestSetMs });
    expect(divisor).toBe(4);
    expect(perWeekVolume({ chest: { workingSets: 48 } }, divisor).chest.workingSets).toBe(12);
  });

  test('the 4-week window of a ten-day-old account still divides by the weeks it has (2)', () => {
    const { startMs, endMs } = volumeWindowBounds({ windowWeeks: 4, nowMs: WED_NOON });
    const divisor = weeksCounted({ windowStartMs: startMs, windowEndMs: endMs, earliestSetMs: WED_NOON - 10 * DAY });
    expect(divisor).toBe(2);
  });
});

describe('D214: normaliseWindowWeeks reads a route param as 1, 2 or 4', () => {
  test('1, 2 and 4 pass, as numbers or numeric strings', () => {
    expect(normaliseWindowWeeks(1)).toBe(1);
    expect(normaliseWindowWeeks(2)).toBe(2);
    expect(normaliseWindowWeeks(4)).toBe(4);
    expect(normaliseWindowWeeks('2')).toBe(2);
    expect(normaliseWindowWeeks('4')).toBe(4);
  });

  test('anything else reads as 1 ("This week")', () => {
    for (const bad of [undefined, null, 0, 3, 8, -1, NaN, Infinity, 'x', '', {}, []]) {
      expect(normaliseWindowWeeks(bad)).toBe(1);
    }
  });

  test('volumeWindowBounds applies it, so an unsupported window can never open', () => {
    expect(volumeWindowBounds({ windowWeeks: 3, nowMs: NOW }).weeks).toBe(1);
    expect(volumeWindowBounds({ windowWeeks: 'x', nowMs: NOW }).mondayAnchored).toBe(true);
  });
});
