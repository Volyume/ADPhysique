export function localAlarmMinuteOfDay(ts: number): number {
  const date = new Date(ts);
  return date.getHours() * 60 + date.getMinutes();
}

/** Build the next occurrence from a persisted local wall-clock minute. */
export function nextLocalAlarmTimestamp(minuteOfDay: number, now = Date.now()): number {
  const minute = Math.max(0, Math.min(24 * 60 - 1, Math.round(minuteOfDay)));
  const next = new Date(now);
  next.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  if (next.getTime() <= now) next.setDate(next.getDate() + 1);
  return next.getTime();
}
