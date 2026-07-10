/**
 * trainingHabitSchedule.js
 *
 * D17 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md): the
 * training-day reminder's schedule substrate, SCHEDULE_KEY
 * ('@volyume_schedule_v1', trainingReminders.js:12), had no real writer on a
 * live device -- nothing ever populated it outside test fixtures, so the
 * shipped reminder was silent, while NotificationSettingsScreen told the
 * user it fired "on the training days from your active plan". Founder
 * steer on the fix (verbatim): "Rest days are not strictly adhered to, user
 * trains on the days they want and have lives." Lead ruling under that
 * steer: do NOT wire a rigid plan-day schedule writer -- rebuild the
 * schedule from HABIT, derived from completed-workout history, instead.
 *
 * This module is that writer. The pure rule (deriveHabitualTrainingWeekdays)
 * is exported separately from the DB-touching refresh
 * (refreshHabitDerivedTrainingSchedule) so the derivation itself is
 * unit-testable with fixed epoch-ms fixtures and no AsyncStorage/SQLite
 * mocking.
 *
 * Writes SCHEDULE_KEY in the EXACT shape trainingReminders.js's own reader
 * already expects ({ days: number[] }, JS weekdays 0=Sun..6=Sat) -- that
 * reader's contract is untouched by this change, and so are quiet hours,
 * the push budget and foreground suppression.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { localWeekStartMs } from '../dayKey';
import { SCHEDULE_KEY, scheduleTrainingReminders } from './trainingReminders';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Trailing window, in calendar weeks (Monday-Sunday local, per
// localWeekStartMs), used to derive the habitual training weekdays.
//
// 6 weeks gives six independent weekly observations per weekday: enough to
// smooth over a single atypical week (illness, travel, a one-off swapped
// rest day) without needing months of history, while staying short enough
// that a genuine change in the user's real-life training days (new job,
// house move) is picked up within about a month and a half rather than
// lagging for a whole quarter. A shorter 4-week window was considered and
// rejected: with only 4 weekly observations a single missed week can flip a
// weekday's read entirely. A longer 12-week window was also considered and
// rejected as too slow to reflect the founder's "lives change" steer.
export const HABIT_WINDOW_WEEKS = 6;

// Minimum span of completed-workout history, in FULL weeks, required before
// deriving anything at all. Below this, a "pattern" is really just whatever
// the user happened to do in their first few sessions. The founder steer is
// "do not guess" -- a brand-new user (or one whose history was wiped) gets
// no schedule at all rather than a confident-looking wrong one.
export const MIN_HISTORY_WEEKS = 2;

/**
 * Pure. Given every completed-workout start timestamp (ms, any order, any
 * lookback -- the caller passes full history, not a pre-windowed slice) and
 * "now", derives the user's habitual training weekdays.
 *
 * Returns:
 *   - null: insufficient history (fewer than MIN_HISTORY_WEEKS of completed
 *     workouts exist at all). The caller must NOT write a schedule -- this
 *     is the "don't guess for a brand-new user" case.
 *   - number[]: the JS weekdays (0=Sunday..6=Saturday, ascending) trained on
 *     in at least half of the observed weeks. May be an EMPTY array when
 *     there is enough history but no single weekday clears the threshold
 *     (a genuinely irregular trainer) -- that is a real "no consistent
 *     pattern" signal, distinct from insufficient history, and the caller
 *     writes it as-is so the reminder honestly falls silent instead of
 *     guessing.
 */
export function deriveHabitualTrainingWeekdays(workoutTimestampsMs, nowMs = Date.now()) {
  const timestamps = Array.isArray(workoutTimestampsMs)
    ? workoutTimestampsMs.filter((t) => Number.isFinite(t))
    : [];
  if (timestamps.length === 0) return null;

  const currentWeekStart = localWeekStartMs(nowMs);
  const earliestWeekStart = localWeekStartMs(Math.min(...timestamps));

  // Full calendar weeks between the earliest workout's week and the current
  // (in-progress) week. The current week is always excluded from the
  // window: it is incomplete, and counting it would bias early-in-the-week
  // reads toward "not trained" for weekdays that simply have not arrived
  // yet.
  const historySpanWeeks = Math.floor((currentWeekStart - earliestWeekStart) / WEEK_MS);
  if (historySpanWeeks < MIN_HISTORY_WEEKS) return null;

  const observedWeeks = Math.min(HABIT_WINDOW_WEEKS, historySpanWeeks);
  const windowStart = currentWeekStart - observedWeeks * WEEK_MS;

  // weekdayWeekSets[wd] = the set of week-bucket indices (0..observedWeeks-1)
  // in which the user completed at least one workout on weekday wd.
  const weekdayWeekSets = Array.from({ length: 7 }, () => new Set());
  for (const ts of timestamps) {
    if (ts < windowStart || ts >= currentWeekStart) continue;
    const weekIndex = Math.floor((ts - windowStart) / WEEK_MS);
    const weekday = new Date(ts).getDay();
    weekdayWeekSets[weekday].add(weekIndex);
  }

  // "At least half the observed weeks", rounded UP: you cannot train on
  // half a week, so an odd window (e.g. 3 observed weeks) requires a
  // majority (2 of 3) rather than a bare plurality.
  const threshold = Math.ceil(observedWeeks / 2);

  const days = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    if (weekdayWeekSets[weekday].size >= threshold) days.push(weekday);
  }
  return days;
}

/**
 * Best-effort, never throws. Reads the user's completed-workout history,
 * derives the habitual weekdays, and -- only when there is enough history
 * to derive anything -- writes them to SCHEDULE_KEY in the exact
 * { days: number[] } shape scheduleTrainingReminders already reads
 * (trainingReminders.js:140-158), then asks it to re-lay the OS-level
 * reminders against the fresh schedule (itself a no-op if reminders are off
 * or permission is absent).
 *
 * Skips the write entirely when history is insufficient: matches
 * deriveHabitualTrainingWeekdays' null contract of "do not guess" -- for a
 * brand-new user that means leaving the key exactly as it was (nothing).
 */
export async function refreshHabitDerivedTrainingSchedule(userId) {
  if (Platform.OS === 'web') return;
  if (!userId) return;
  try {
    // eslint-disable-next-line global-require
    const { getCompletedWorkoutStartTimestamps } = require('../database');
    const timestamps = await getCompletedWorkoutStartTimestamps(userId).catch(() => []);
    const days = deriveHabitualTrainingWeekdays(timestamps, Date.now());
    if (days === null) return; // insufficient history -- do not guess

    await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify({ days }));
    await scheduleTrainingReminders();
  } catch (e) {
    // Fail silently for the user; fire notification_failed telemetry so
    // Panel 6 sees the outage, mirroring scheduleTrainingReminders' own
    // failure telemetry pattern.
    try {
      // eslint-disable-next-line global-require
      const { trackNotificationFailed, CATEGORY } = require('./index');
      trackNotificationFailed({
        category: CATEGORY.TRAINING_REMINDER,
        reason: 'habit_schedule_refresh_threw',
        payload: { message: e?.message ?? 'unknown' },
      });
    } catch (_) { /* telemetry layer unavailable -- accepted */ }
  }
}
