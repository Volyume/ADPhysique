/**
 * Local-day key (YYYY-MM-DD) for bucketing user data by the user's own
 * calendar day, not UTC.
 *
 * TZ-1: weight + workouts already key by local midnight, but food / water /
 * steps used to key by UTC (`new Date().toISOString().slice(0,10)`). For a
 * user not at UTC+0 that put a meal logged in the evening (west of UTC) or
 * early morning (east of UTC) on a different calendar day than the weight or
 * workout logged at the same moment: the diary's "today" looked empty and
 * rollups / "this week" windows read the wrong day. This unifies every
 * food/water/steps day-key onto the local calendar day.
 *
 * Format matches the existing string keys (YYYY-MM-DD) so it is a drop-in for
 * the old `toISOString().slice(0,10)` call sites and compares equal to the
 * weight/workout local-midnight buckets.
 */
export function localDayKey(ms = Date.now()) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalKey() {
  return localDayKey(Date.now());
}

/**
 * Reverse a 'YYYY-MM-DD' day-key back to a Date at LOCAL midnight. Use this
 * (not `new Date(isoStr)`, which parses as UTC) whenever a stored day-key is
 * turned back into a Date for navigation or labelling, so it stays on the
 * user's calendar. Returns an Invalid Date for unparseable input.
 */
export function parseLocalDay(isoStr) {
  const [y, m, d] = String(isoStr).split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}
