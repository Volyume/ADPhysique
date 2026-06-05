/**
 * The single source of truth for "what day did this workout happen".
 *
 * A workout row's `startedAt` is stamped when the session is CREATED
 * (createWorkout → Date.now()). A session can be created on one calendar day
 * and finished the next: started the night before, or an abandoned session
 * resumed and completed the following morning. Dating by `startedAt` then shows
 * the wrong day (the creation day, not the training day). `endedAt` is written
 * when the session is finished, so it reflects when the lifter actually
 * trained. We attribute the workout to `endedAt`, falling back to `startedAt`
 * (then `createdAt`) for older or in-progress rows that have no end time.
 *
 * All day bucketing uses the LOCAL calendar (dayKey helpers), never UTC, per
 * the UK locale/timezone rule.
 */
import { localDayKey, parseLocalDay } from './dayKey';

// Epoch ms of the day a workout is attributed to (training/completion day).
export function workoutDayMs(w) {
  if (!w) return Date.now();
  return w.endedAt ?? w.startedAt ?? w.createdAt ?? Date.now();
}

// Local day-key (YYYY-MM-DD) for the workout's attributed day.
export function workoutDayKey(w) {
  return localDayKey(workoutDayMs(w));
}

/**
 * Calendar-relative label that is computed from LOCAL day-keys, so it never
 * disagrees with the absolute date shown beside it. The old
 * formatDistanceToNow rounds by elapsed hours (24-42h all read "1 day ago"),
 * which made a workout dated two calendar days back still say "1 day ago".
 * This counts whole calendar days instead.
 */
export function calendarRelativeLabel(ms, nowMs = Date.now()) {
  const dayMs = parseLocalDay(localDayKey(ms)).getTime();
  const todayMs = parseLocalDay(localDayKey(nowMs)).getTime();
  if (!Number.isFinite(dayMs) || !Number.isFinite(todayMs)) return '';
  const diffDays = Math.round((todayMs - dayMs) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'Last week';
  if (diffDays < 365) return `${Math.round(diffDays / 7)} weeks ago`;
  const years = Math.round(diffDays / 365);
  return years <= 1 ? '1 year ago' : `${years} years ago`;
}
