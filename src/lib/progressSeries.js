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
 * @param {{weeks?: number, now?: number, exerciseTypeById?: object|null, weekBoundary?: ('rolling'|'monday')}} [opts]
 * @returns {Array<{value: number, weeksAgo: number}>}
 */
export function buildWeeklyLoadSeries(sets, {
  weeks = DEFAULT_LOAD_WEEKS, now = Date.now(), exerciseTypeById = null, weekBoundary = 'rolling',
} = {}) {
  const n = clampInt(weeks, 1, MAX_LOAD_WEEKS, DEFAULT_LOAD_WEEKS);

  if (weekBoundary === 'monday') {
    // Build n Monday-anchored week boundaries, oldest first, current week
    // last. localWeekEndMs/localWeekStartMs handle BST/GMT transitions
    // (a DST week is 167h or 169h, never a fixed 168h), so this stays
    // correct across the spring/autumn boundary the rolling grammar never
    // had to worry about.
    const bounds = [];
    let end = localWeekEndMs(now);
    for (let i = 0; i < n; i++) {
      const start = localWeekStartMs(end - 1);
      bounds.unshift({ start, end });
      end = start;
    }
    const bins = bounds.map(() => []);
    for (const s of (sets || [])) {
      const at = setTimestamp(s);
      if (!at || at > now) continue;
      const idx = bounds.findIndex((b) => at >= b.start && at < b.end);
      if (idx === -1) continue;
      bins[idx].push(s);
    }
    return bins.map((binSets, i) => ({
      value: Math.round(calculateTonnage(binSets, exerciseTypeById)),
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
    value: Math.round(calculateTonnage(binSets, exerciseTypeById)),
    weeksAgo: n - 1 - i,
  }));
}

/**
 * Sessions-per-week sparkline bins over a capped day window, oldest → newest,
 * plus the distinct-session total across the whole window. A session is a
 * distinct workout id — the same rule as the data layer's sessionCount — and
 * the binning mirrors computePRsPerWeek so the two sparkline cards share one
 * week grammar.
 *
 * @param {Array<object>} sets - completed workout sets
 * @param {{windowDays?: number, now?: number}} [opts]
 * @returns {{bins: number[], total: number}}
 */
export function buildWeeklySessionCounts(sets, { windowDays = DEFAULT_SPARK_DAYS, now = Date.now() } = {}) {
  const days = clampInt(windowDays, 7, MAX_SPARK_DAYS, DEFAULT_SPARK_DAYS);
  const totalWeeks = Math.ceil(days / 7);
  const perBin = Array.from({ length: totalWeeks }, () => new Set());
  const all = new Set();
  const windowStart = now - days * DAY_MS;
  for (const s of (sets || [])) {
    const at = setTimestamp(s);
    if (!at || at < windowStart || at > now) continue;
    const workoutId = s.workoutId ?? s.workout_id;
    if (workoutId == null) continue;
    const daysAgo = Math.floor((now - at) / DAY_MS);
    const idx = totalWeeks - 1 - Math.floor(daysAgo / 7);
    if (idx < 0 || idx >= totalWeeks) continue;
    perBin[idx].add(workoutId);
    all.add(workoutId);
  }
  return { bins: perBin.map(ids => ids.size), total: all.size };
}
