/**
 * When should Home re-read its data on coming back to the foreground?
 *
 * Home reloads on focus, on a cloud pull and on two timers after sign-in, but
 * a phone left in the pocket overnight returns to the SAME focused screen, so
 * none of those fire: yesterday's logged weight, "today" counts and the
 * weigh-in strip would stay on screen. Pure (no I/O) so the rule is testable.
 *
 * Reload when the local day has changed since the data was loaded, or when the
 * data is older than RELOAD_AFTER_MS. Nothing loaded yet (null) is not a
 * reload: the focus effect owns the first load.
 */
export const RELOAD_AFTER_MS = 5 * 60 * 1000;

export function shouldReloadHomeOnResume({ loadedDayKey, lastLoadAt, todayKey, now }) {
  if (loadedDayKey == null || lastLoadAt == null) return false;
  if (todayKey !== loadedDayKey) return true;
  return Number.isFinite(now) && Number.isFinite(lastLoadAt) && now - lastLoadAt > RELOAD_AFTER_MS;
}
