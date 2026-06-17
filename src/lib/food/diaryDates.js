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
