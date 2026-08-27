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

/**
 * The last `count` local day-keys, oldest first, ending on the day containing
 * `endMs` (default today).
 *
 * DST (adversarial audit 2026-08-26, finding 7). Callers used to build a run of
 * days by subtracting `offset * 86400000` from the current instant. A fixed
 * 24-hour step is not a calendar day across a transition, so on the spring
 * change the sequence slides by an hour and a real calendar day drops out of
 * it. Measured for Europe/London: the 84-day training grid rendered at 00:30 on
 * 2025-04-15 contains no square at all for 2025-03-30, the spring-forward day.
 * A user who trained that day simply does not see it, and the grid's own
 * "Trained N of the last 84 days" label counts a window it is not showing.
 *
 * Stepping a local Date with setDate crosses transitions correctly. The anchor
 * is midday rather than midnight so the arithmetic never lands inside an hour
 * that does not exist locally on a transition day.
 *
 * @param {number} count how many days
 * @param {number} [endMs] the instant whose local day ends the run
 * @returns {string[]} YYYY-MM-DD, oldest first, length `count`
 */
export function localDayKeysEndingAt(count, endMs = Date.now()) {
  const n = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  const d = new Date(Number.isFinite(endMs) ? endMs : Date.now());
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push(localDayKey(d.getTime()));
    d.setDate(d.getDate() + 1);
  }
  return out;
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
