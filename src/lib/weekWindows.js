// ALGO-001: pure trailing-week window builder. Kept dependency-free so
// database.js can import it without adding cycles around SQLite setup.
export function weekWindowsEndingAt(anchorMs, weeksBack = 4) {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const anchor = Number.isFinite(anchorMs) ? anchorMs : Date.now();
  const windows = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    windows.push({ weekStart: anchor - (i + 1) * WEEK_MS, weekEnd: anchor - i * WEEK_MS });
  }
  return windows;
}
