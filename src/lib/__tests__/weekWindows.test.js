/**
 * weekWindowsEndingAt (src/lib/weekWindows.js, ALGO-001).
 *
 * Progress-tab audit 2026-09-24, lane E follow-up (lead ruling, defect
 * fixed): this used to step back from the anchor by a FIXED 7 * 24h
 * multiple. A UK clock-change week is 167h (spring-forward) or 169h
 * (fall-back) of real time, not 168h, so with a Monday-midnight anchor
 * (every current caller of getWeeklyVolumeByMuscle in database.js: the
 * weekly check-in and the volume heatmap trend) the fixed step drifted
 * every boundary in the window an hour off local midnight across the
 * change. It now steps one calendar week at a time via Date#setDate --
 * the same technique dayKey.js's localWeekEndMs and trainingLoad.js's
 * mondayWeekLoadSeries use.
 *
 * Jest runs with TZ=Europe/London from jest.globalSetup.js (set before any
 * worker starts, so it is inherited by every one of them), so the
 * 2026-10-25 clock-change case runs in-process here exactly as
 * blockWeekProgress.test.js already does for the same date -- no child
 * process needed.
 */
import { weekWindowsEndingAt } from '../weekWindows';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

describe('weekWindowsEndingAt: ordinary weeks (no clock change nearby)', () => {
  test('returns `weeksBack` windows, oldest to newest, the last ending exactly at the anchor', () => {
    const anchor = new Date(2026, 5, 15).getTime(); // a plain Monday, no DST edge nearby
    const windows = weekWindowsEndingAt(anchor, 4);
    expect(windows).toHaveLength(4);
    expect(windows[windows.length - 1].weekEnd).toBe(anchor);
    for (const w of windows) expect(w.weekEnd - w.weekStart).toBe(WEEK_MS);
    for (let i = 0; i < windows.length - 1; i++) {
      expect(windows[i + 1].weekStart).toBe(windows[i].weekEnd);
    }
  });

  test('a non-midnight anchor lands on exactly the same instants the old fixed-ms step gave, outside a clock change', () => {
    const anchor = new Date(2026, 5, 15, 15, 30, 0).getTime(); // Mon 15 Jun 2026, 15:30 local
    const windows = weekWindowsEndingAt(anchor, 2);
    expect(windows).toEqual([
      { weekStart: anchor - 2 * WEEK_MS, weekEnd: anchor - WEEK_MS },
      { weekStart: anchor - WEEK_MS, weekEnd: anchor },
    ]);
  });

  test('weeksBack of 0 or negative returns an empty array, matching the old loop', () => {
    expect(weekWindowsEndingAt(Date.now(), 0)).toEqual([]);
    expect(weekWindowsEndingAt(Date.now(), -2)).toEqual([]);
  });

  test('a non-finite anchor falls back to Date.now()', () => {
    const before = Date.now();
    const windows = weekWindowsEndingAt(NaN, 1);
    const after = Date.now();
    expect(windows[0].weekEnd).toBeGreaterThanOrEqual(before);
    expect(windows[0].weekEnd).toBeLessThanOrEqual(after);
  });
});

describe('weekWindowsEndingAt: the 2026-10-25 UK clock change (fall-back)', () => {
  // Clocks go BST -> GMT at 2am on Sun 25 Oct 2026. The week
  // [Mon 19 Oct 00:00 local, Mon 26 Oct 00:00 local) contains it and is
  // 169 real hours long, not 168. Anchor on the Monday AFTER the change
  // (as getWeeklyVolumeByMuscle's real callers do: a Monday-midnight
  // anchor), asking for the 3 weeks before it.
  const anchor = new Date(2026, 9, 26).getTime(); // Mon 26 Oct 2026, 00:00 local

  test('every boundary is still exactly local midnight on a Monday, both sides of the change', () => {
    const windows = weekWindowsEndingAt(anchor, 3);
    const allBounds = [windows[0].weekStart, ...windows.map((w) => w.weekEnd)];
    for (const ms of allBounds) {
      const d = new Date(ms);
      expect(d.getDay()).toBe(1); // Monday
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    }
  });

  test('the week containing the change is 169 hours; the other two stay 168', () => {
    const windows = weekWindowsEndingAt(anchor, 3);
    // windows: [Mon 5 Oct->Mon 12 Oct], [Mon 12 Oct->Mon 19 Oct], [Mon 19 Oct->Mon 26 Oct] (the change week)
    expect(windows[0].weekEnd - windows[0].weekStart).toBe(WEEK_MS);
    expect(windows[1].weekEnd - windows[1].weekStart).toBe(WEEK_MS);
    expect(windows[2].weekEnd - windows[2].weekStart).toBe(WEEK_MS + HOUR_MS);
  });

  test('a fixed 7*24h step would have missed local midnight by an hour -- proves the fix, not just the old behaviour', () => {
    const windows = weekWindowsEndingAt(anchor, 1);
    const fixedStepWouldGive = anchor - WEEK_MS;
    expect(windows[0].weekStart).not.toBe(fixedStepWouldGive);
    expect(windows[0].weekStart).toBe(fixedStepWouldGive - HOUR_MS); // the true local midnight, an hour earlier
    expect(new Date(windows[0].weekStart).getHours()).toBe(0);
    expect(new Date(fixedStepWouldGive).getHours()).toBe(1); // what the old code would have used instead
  });
});
