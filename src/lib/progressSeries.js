// progressSeries — pure series builders for the Progress dashboard (audit A5).
//
// Re-presentation only: these bin the already-loaded set list into rolling
// week windows using the same grammar the Progress data layer already uses
// (rolling weeks back from `now`, tonnage via calculateTonnage, a session is
// a distinct workout id). No I/O, no store reads, no new engine logic; the
// output is deterministic for a given `now`, so hosts memoise on the loaded
// data and nothing recomputes per render.
//
// Every window is CAPPED regardless of what the caller asks for — the
// audit's stated A5 risk is JS-thread chart cost, so a runaway window must
// be impossible from any call site.

import { calculateTonnage } from './algorithms';
import { localWeekStartMs, localWeekEndMs } from './dayKey';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export const DEFAULT_LOAD_WEEKS = 8;
export const MAX_LOAD_WEEKS = 12;
export const DEFAULT_SPARK_DAYS = 30;
export const MAX_SPARK_DAYS = 90;

function clampInt(n, lo, hi, fallback) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

function setTimestamp(s) {
  return s.createdAt ?? s.created_at ?? 0;
}

// The Monday-anchored week boundaries a weekBoundary:'monday' series bins
// into, oldest -> newest, current week last. Extracted out of
// buildWeeklyLoadSeries (B2, progress-tab audit 2026-09-24) so a caller that
// needs to know whether a raw timestamp falls INSIDE the exact window a
// weekBoundary:'monday' series call draws -- e.g. gating a "this week" hero
// on there being enough sessions inside its OWN chart's window, not just
// anywhere in all-time history -- reuses these bounds rather than
// recomputing them by a different route and risking drift from the series
// itself. `weeks` is the already-clamped count (see clampInt at the call
// sites below); this performs no clamping of its own.
function buildMondayWeekBounds(weeks, now) {
  const bounds = [];
  let end = localWeekEndMs(now);
  for (let i = 0; i < weeks; i++) {
    const start = localWeekStartMs(end - 1);
    bounds.unshift({ start, end });
    end = start;
  }
  return bounds;
}

/**
 * The Monday-anchored window a `buildWeeklyLoadSeries(sets, { weeks, now,
 * weekBoundary: 'monday' })` call draws, as a single [startMs, endMs) range
 * covering every bin (oldest week's start to the current week's exclusive
 * end) -- not the per-week bins themselves.
 *
 * B2 (progress-tab audit 2026-09-24): LiftProgressScreen's "Weight lifted"
 * hero used to gate on session count over ALL loaded history while its own
 * chart only ever drew the last 8 Monday-anchored weeks, so a returning
 * user with old sessions and nothing recent saw the hero appear with an
 * empty "This week: 0" chart. A caller filters its own sets/sessions against
 * this window (a set at `t` is inside when `t >= startMs && t < endMs`) so
 * whatever it gates matches EXACTLY what the paired series call will draw,
 * using the identical bounds-building helper.
 *
 * @param {number} [weeks] - same meaning as buildWeeklyLoadSeries's `weeks`
 *   (clamped the same way, so passing the same value to both always agrees).
 * @param {number} [now] - epoch ms "now"; pass the SAME value given to the
 *   paired buildWeeklyLoadSeries call so both derive from one clock read.
 * @returns {{startMs: number, endMs: number}}
 */
export function getWeeklyLoadWindow(weeks = DEFAULT_LOAD_WEEKS, now = Date.now()) {
  const n = clampInt(weeks, 1, MAX_LOAD_WEEKS, DEFAULT_LOAD_WEEKS);
  const bounds = buildMondayWeekBounds(n, now);
  return { startMs: bounds[0].start, endMs: bounds[bounds.length - 1].end };
}

/**
 * Weekly training-load (tonnage) series for the hero chart, oldest → newest.
 * The last entry is the current week (weeksAgo 0). `exerciseTypeById` is
 * passed straight through to calculateTonnage so distance/duration sets
 * never inflate load.
 *
 * `weekBoundary` picks the week grammar:
 *  - 'rolling' (default): a trailing 7-day window measured back from `now`,
 *    matching the original A5 hero binning.
 *  - 'monday': the same Monday-anchored calendar week every other "this
 *    week" surface uses (dayKey.js's localWeekStartMs/localWeekEndMs, DST
 *    safe). Campaign 23 §6 (IA-2): a screen that shows both a rolling and a
 *    Monday-anchored series disagrees with itself about what "this week"
 *    means; callers that sit beside a Monday-anchored surface (e.g. the
 *    weekly volume strip) should pass 'monday' so the whole screen shares
 *    one definition.
 *
 * @param {Array<object>} sets - completed workout sets
 * @param {{weeks?: number, now?: number, exerciseTypeById?: object|null, loadSemanticsById?: object|null, weekBoundary?: ('rolling'|'monday')}} [opts]
 * @returns {Array<{value: number, weeksAgo: number}>}
 */
export function buildWeeklyLoadSeries(sets, {
  weeks = DEFAULT_LOAD_WEEKS, now = Date.now(), exerciseTypeById = null, loadSemanticsById = null, weekBoundary = 'rolling',
} = {}) {
  const n = clampInt(weeks, 1, MAX_LOAD_WEEKS, DEFAULT_LOAD_WEEKS);

  if (weekBoundary === 'monday') {
    // Build n Monday-anchored week boundaries, oldest first, current week
    // last. localWeekEndMs/localWeekStartMs handle BST/GMT transitions
    // (a DST week is 167h or 169h, never a fixed 168h), so this stays
    // correct across the spring/autumn boundary the rolling grammar never
    // had to worry about.
    const bounds = buildMondayWeekBounds(n, now);
    const bins = bounds.map(() => []);
    for (const s of (sets || [])) {
      const at = setTimestamp(s);
      if (!at || at > now) continue;
      const idx = bounds.findIndex((b) => at >= b.start && at < b.end);
      if (idx === -1) continue;
      bins[idx].push(s);
    }
    return bins.map((binSets, i) => ({
      value: Math.round(calculateTonnage(binSets, exerciseTypeById, loadSemanticsById)),
      weeksAgo: n - 1 - i,
    }));
  }

  const bins = Array.from({ length: n }, () => []);
  for (const s of (sets || [])) {
    const at = setTimestamp(s);
    if (!at || at > now) continue;
    const weeksAgo = Math.floor((now - at) / WEEK_MS);
    if (weeksAgo < 0 || weeksAgo >= n) continue;
    bins[n - 1 - weeksAgo].push(s);
  }
  return bins.map((binSets, i) => ({
    value: Math.round(calculateTonnage(binSets, exerciseTypeById, loadSemanticsById)),
    weeksAgo: n - 1 - i,
  }));
}
