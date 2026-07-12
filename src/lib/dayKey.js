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
  // Guard a non-finite timestamp so a bad caller can never produce the
  // 'NaN-NaN-NaN' key that would corrupt a day bucket. Fall back to now.
  const d = new Date(Number.isFinite(ms) ? ms : Date.now());
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

/**
 * Start of the LOCAL week (Monday 00:00 local) containing `ms`, in epoch ms.
 *
 * The training / coaching week anchors on the user's local Monday, never
 * UTC, so a session or check-in logged near midnight (especially during
 * British Summer Time, when local is UTC+1) lands in the right week. Using
 * getUTCDay/setUTCHours here put the boundary up to an hour off and could
 * bucket a Monday-morning check-in into the previous week. Use this for
 * every "this week" boundary; do not recompute with the UTC getters.
 */
export function localWeekStartMs(ms = Date.now()) {
  const d = new Date(Number.isFinite(ms) ? ms : Date.now());
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

/**
 * The exclusive end of a local week: the NEXT local Monday 00:00.
 *
 * LS-06 (Codex audit, 2026-07-12): the weekly windows added a fixed
 * 7 * 86400000 ms (168h) to a local Monday midnight. A UK week that contains
 * a BST/GMT transition is 167h (spring) or 169h (autumn), not 168, so the
 * fixed offset landed the boundary an hour off - a late-Sunday or early-Monday
 * session was double-counted or dropped for the two transition weeks a year.
 * Deriving the next Monday via local calendar arithmetic (setDate(+7) on a
 * local-midnight Date) crosses the DST change correctly. Pass the week start
 * (from localWeekStartMs); any ms inside the week also works.
 */
export function localWeekEndMs(ms = Date.now()) {
  const d = new Date(localWeekStartMs(ms));
  d.setDate(d.getDate() + 7);
  return d.getTime();
}
