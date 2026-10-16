/**
 * Pure local-calendar date helpers for the food diary.
 *
 * Extracted from DiaryScreen so the diary's day-key maths is locked with tests:
 * all keys are the LOCAL calendar day (TZ-1), matching the local-day food/water
 * writes and the weight/workout buckets, so "today" is the user's today, not
 * UTC's. weekDatesMon in particular drives calorie banking (the Mon..Sun week),
 * so its boundary behaviour must not drift.
 */
import { localDayKey, parseLocalDay } from '../dayKey';

/** Local day-key (YYYY-MM-DD) for a Date. */
export function isoDate(d) {
  return localDayKey(d.getTime());
}

/** Shift a local day-key by whole days, staying on the user's calendar. */
export function shiftDate(isoStr, days) {
  const d = parseLocalDay(isoStr);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** The 7 local dates Mon..Sun of the week containing `iso` (calorie banking). */
export function weekDatesMon(iso) {
  const dow = parseLocalDay(iso).getDay(); // 0 Sun .. 6 Sat
  const monday = shiftDate(iso, -((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Short weekday label ("Mon") for a local day-key. */
export function weekdayShort(iso) {
  return WEEKDAY_SHORT[parseLocalDay(iso).getDay()];
}

/**
 * Human label for a local day-key: "Today" / "Yesterday" / "Tomorrow" relative
 * to `todayIso`, otherwise a "Mon, 5 Jun"-style date. `todayIso` is injectable
 * for tests and defaults to the live local today.
 */
export function friendlyDate(isoStr, todayIso = isoDate(new Date())) {
  const yesterday = shiftDate(todayIso, -1);
  const tomorrow = shiftDate(todayIso, 1);
  if (isoStr === todayIso) return 'Today';
  if (isoStr === yesterday) return 'Yesterday';
  if (isoStr === tomorrow) return 'Tomorrow';
  const d = parseLocalDay(isoStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// D230 R5: the quiet line that says which day an add lands on, shown only
// when that day is not today ("For Wednesday 14 October."). Built from the
// local day-key helpers and fixed English names, as weekdayShort is, so the
// words never depend on the device's date-format data. The year is added
// only when it differs from this year's. Returns null for today or an
// unreadable key. Shared by the add sheet (FoodDetailSheet) and the add
// screen (FoodSearchScreen), so the two say the day the same way.
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export function entryDateLine(entryDate, todayIso = isoDate(new Date())) {
  if (!entryDate || entryDate === todayIso) return null;
  const d = parseLocalDay(entryDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = parseLocalDay(todayIso);
  const year = !Number.isNaN(today.getTime()) && d.getFullYear() !== today.getFullYear()
    ? ` ${d.getFullYear()}`
    : '';
  return `For ${WEEKDAY_LONG[d.getDay()]} ${d.getDate()} ${MONTH_LONG[d.getMonth()]}${year}.`;
}
