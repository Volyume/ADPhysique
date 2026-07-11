export const MIN_MANUAL_SLEEP_WINDOW_MIN = 20;
export const MAX_MANUAL_SLEEP_WINDOW_MIN = 30 * 60;

export function sleepWindowDurationMin(startTs: number, endTs: number): number {
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs <= startTs) return 0;
  return Math.round((endTs - startTs) / 60000);
}

export function isManualSleepWindowDurationAllowed(startTs: number, endTs: number): boolean {
  const durationMin = sleepWindowDurationMin(startTs, endTs);
  return durationMin >= MIN_MANUAL_SLEEP_WINDOW_MIN && durationMin <= MAX_MANUAL_SLEEP_WINDOW_MIN;
}
