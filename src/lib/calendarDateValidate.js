/**
 * calendarDateValidate.js
 *
 * A7 (pre-release sweep 2026-07-27, LANE A): shared calendar-date validator
 * for freeform 'YYYY-MM-DD' text fields. A native `new Date(str)` silently
 * normalises an impossible calendar date instead of rejecting it --
 * `new Date('2026-02-30')` rolls forward to 2 March 2026 with no error, and
 * getTime() returns a real, finite number, so the existing
 * `Number.isNaN(d.getTime())` fallback never catches it. A mistyped date
 * lands silently in the user's history, on the wrong day, with no warning.
 *
 * This checks the calendar arithmetic explicitly -- exact 'YYYY-MM-DD' shape,
 * month 1-12, day valid for that specific month AND year (leap years
 * included) -- rather than trusting Date's rollover behaviour. Shared by
 * BodyMetricsScreen (body-metric date) and ProGoalSetupScreen (prep
 * countdown show date) so the rule and the copy never drift between the two
 * screens.
 *
 * Pure, no I/O and no store reads -- safe to import from any screen or
 * validator, and safe to unit test in isolation.
 */

const DATE_SHAPE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * True only for a string in exactly 'YYYY-MM-DD' shape that is also a real
 * calendar date: month 1-12, day valid for that month and year (leap years
 * handled for February). Rejects "2026-13-45" (month out of range) and
 * "2026-02-30" (day out of range for February) alike; accepts "2026-02-29"
 * only when `year` is actually a leap year.
 */
export function isValidCalendarDateString(value) {
  const trimmed = String(value ?? '').trim();
  const m = DATE_SHAPE_RE.exec(trimmed);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  const maxDay = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
  if (day < 1 || day > maxDay) return false;
  return true;
}

/**
 * Parses a validated 'YYYY-MM-DD' string to LOCAL-midnight epoch ms, or null
 * if it is not a real calendar date. Use this instead of `new Date(str)`
 * anywhere a freeform date string needs to become a timestamp, so an
 * impossible date never silently rolls over into a different real one.
 */
export function parseCalendarDateString(value) {
  const trimmed = String(value ?? '').trim();
  if (!isValidCalendarDateString(trimmed)) return null;
  const m = DATE_SHAPE_RE.exec(trimmed);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return new Date(year, month - 1, day).getTime();
}

// Calm, British-English message shared by every screen that rejects an
// invalid freeform date, so the copy never drifts between call sites.
export const INVALID_CALENDAR_DATE_MESSAGE =
  'That date does not look right. Use the format YYYY-MM-DD with a real calendar date.';
