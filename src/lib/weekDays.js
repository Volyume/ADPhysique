/**
 * The product's weekday vocabulary, in one place.
 *
 * These three values were defined inside `components/community/DayDots.js`,
 * which was fine while Community was the only surface that drew a week. The
 * week ribbon (D166, design direction D) puts a week on Today and on Progress
 * too, and a shared component importing from `components/community/` would be
 * wrong-way coupling. So the vocabulary moves here and both draw from it;
 * `DayDots` re-exports `currentDayKey` so its existing callers and its own
 * test are untouched.
 *
 * `dayKey.js` is a different job and is not a substitute: it keys by calendar
 * DATE (YYYY-MM-DD) for "this week" boundaries and DST-correct day runs. This
 * file keys by WEEKDAY, which is what a seven-cell week draws.
 *
 * Monday first, matching `localWeekStartMs` in `dayKey.js` and the UK-local
 * week the rest of the app uses.
 */

/** Display order for a week: Monday first. */
export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Indexed by `Date#getDay()`, which is Sunday-first. */
export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Single-letter column headers, in DAY_ORDER. */
export const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Full names, in DAY_ORDER, for accessibility labels. */
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Today's short day key ('mon'..'sun'), read from the local device clock.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function currentDayKey(now = new Date()) {
  return WEEKDAY_KEYS[now.getDay()];
}
