/**
 * "Around this time" (D230 R7, food level-up 2026-10-16).
 *
 * The add screen already knows what the person eats at this hour: their own
 * diary. This ranks the foods they have actually eaten, on other days, within
 * a window of the current clock time, so a food usually eaten at 07:30 is one
 * tap away at 07:30 whichever meal it is being added to. (The slot recents are
 * keyed by meal, so a food usually logged at Meal 1 never appears when adding
 * to Meal 2; this list is keyed by the clock instead.)
 *
 * Pure and deterministic: no I/O, no randomness, no clock read. The caller
 * passes `nowMs` and the rows (from food/db.js getEntriesForClockWindow, which
 * returns actual, undeleted entries with an eaten_at, between two day keys);
 * the same input always gives the same output.
 *
 * Clock times are LOCAL: each timestamp's own local hours and minutes, so a
 * breakfast eaten at 07:30 in winter and one at 07:30 in summer are both
 * 07:30 across a clock change. The window wraps midnight: at 00:30, a food
 * eaten at 23:30 is 60 minutes away, not 1,380.
 */

const MINUTES_PER_DAY = 24 * 60;

/** Local minutes past midnight for an epoch-ms timestamp, or null. */
function localMinuteOfDay(ms) {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

/** The shorter way round the clock between two minutes-of-day. */
function clockDistance(a, b) {
  const diff = Math.abs(a - b) % MINUTES_PER_DAY;
  return Math.min(diff, MINUTES_PER_DAY - diff);
}

/**
 * Rank the foods eaten around the current clock time on other days.
 *
 * @param {Array<{food_ref: string, eaten_at: number, quantity_g: number, entry_date: string}>} entries
 * @param {object} opts
 * @param {number} opts.nowMs            the moment to centre the window on
 * @param {number} [opts.windowMinutes]  half-width of the window, either side (90)
 * @param {number} [opts.limit]          how many foods to return (6)
 * @param {Array<string>|Set<string>} [opts.excludeRefs]  refs already shown elsewhere
 *   (the slot recents), dropped BEFORE the limit so they never take a place
 * @returns {Array<{foodRef: string, count: number, quantityG: number, lastEatenAt: number}>}
 *   ordered by count (most first), then by the most recent eaten_at, then by
 *   food_ref so equal rows still come back in one fixed order. `quantityG` is
 *   the portion of the most recent of those meals, the one a "+" adds.
 */
export function rankAroundThisTime(entries, {
  nowMs, windowMinutes = 90, limit = 6, excludeRefs = [],
} = {}) {
  const nowMinute = localMinuteOfDay(nowMs);
  if (nowMinute == null || !Array.isArray(entries) || entries.length === 0) return [];
  const span = Number.isFinite(windowMinutes) && windowMinutes >= 0 ? windowMinutes : 90;
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  if (cap === 0) return [];
  const excluded = excludeRefs instanceof Set ? excludeRefs : new Set(Array.isArray(excludeRefs) ? excludeRefs : []);

  const byRef = new Map();
  for (const row of entries) {
    const ref = row?.food_ref;
    if (typeof ref !== 'string' || !ref) continue;
    // A quick add is calories with no food behind it (no name, no per-100 g
    // profile, no grams), so it is never offered as a food to add again; the
    // slot recents skip it for the same reason (upsertSlotRecent).
    if (ref.startsWith('quick:')) continue;
    if (excluded.has(ref)) continue;
    // No eaten_at is no clock time (a bulk-confirmed plan row); never read
    // a missing value as midnight of 1970.
    if (row.eaten_at == null) continue;
    const eatenAt = Number(row.eaten_at);
    const minute = localMinuteOfDay(eatenAt);
    if (minute == null) continue;
    if (clockDistance(minute, nowMinute) > span) continue;
    const prev = byRef.get(ref);
    if (!prev) {
      byRef.set(ref, { foodRef: ref, count: 1, quantityG: Number(row.quantity_g), lastEatenAt: eatenAt });
    } else {
      prev.count += 1;
      if (eatenAt > prev.lastEatenAt) {
        prev.lastEatenAt = eatenAt;
        prev.quantityG = Number(row.quantity_g);
      }
    }
  }

  return [...byRef.values()]
    .sort((a, b) => (b.count - a.count)
      || (b.lastEatenAt - a.lastEatenAt)
      || (a.foodRef < b.foodRef ? -1 : a.foodRef > b.foodRef ? 1 : 0))
    .slice(0, cap);
}
