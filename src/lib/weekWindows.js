// ALGO-001: pure trailing-week window builder. Kept dependency-free so
// database.js can import it without adding cycles around SQLite setup.
//
// LEAD FIX (progress-tab audit 2026-09-24, lane E, follow-up): this used to
// step back from the anchor by a FIXED 7 * 24h multiple. A UK clock-change
// week is 167h (spring-forward) or 169h (fall-back) of real time, not
// 168h, so with a Monday-midnight anchor (every current caller: the
// weekly check-in and the volume heatmap trend) the fixed step drifted
// every boundary in the window an hour off local midnight across the
// change. It now steps one calendar week at a time via Date#setDate --
// the same technique dayKey.js's localWeekEndMs and trainingLoad.js's
// mondayWeekLoadSeries use -- preserving the anchor's own time-of-day. A
// non-midnight anchor, and every anchor outside a clock-change week,
// lands on exactly the same instants as before.
export function weekWindowsEndingAt(anchorMs, weeksBack = 4) {
  const anchor = Number.isFinite(anchorMs) ? anchorMs : Date.now();
  const n = Number.isFinite(weeksBack) && weeksBack > 0 ? Math.trunc(weeksBack) : 0;

  // Oldest -> newest anchor-aligned starts; the last is the anchor itself.
  const starts = [anchor];
  for (let i = 0; i < n; i++) {
    const d = new Date(starts[0]);
    d.setDate(d.getDate() - 7);
    starts.unshift(d.getTime());
  }

  const windows = [];
  for (let i = 0; i < n; i++) {
    windows.push({ weekStart: starts[i], weekEnd: starts[i + 1] });
  }
  return windows;
}
