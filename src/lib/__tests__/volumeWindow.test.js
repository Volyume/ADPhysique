/**
 * volumeWindow.js -- D200-1 (Progress-tab audit 2026-09-24, findings F1/F6;
 * docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md). Pins the
 * divisor (weeksCounted) and the division (perWeekVolume) that fix the
 * VolumeHeatmapScreen defect: a 2- or 4-week window summed working sets
 * against WEEKLY MEV/MAV/MRV bands with nothing dividing by the weeks in
 * the window.
 */
import { weeksCounted, perWeekVolume } from '../volumeWindow';

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
