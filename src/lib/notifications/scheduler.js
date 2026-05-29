/**
 * notifications/scheduler.js
 *
 * Cron-like scheduling helpers built on top of expo-notifications.
 * Each helper:
 *   1. Applies quiet hours to the requested trigger.
 *   2. Cancels the previous schedule for the same logical slot.
 *   3. Calls expo-notifications.scheduleNotificationAsync.
 *   4. On failure, fires notification_failed with the category.
 *
 * The handler in handler.js does the smart-suppression check at
 * delivery time. This file just lays the schedules down.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY } from './categories';
import {
  getQuietHours,
  shiftHourMinuteOutOfQuietHours,
  shiftDateOutOfQuietHours,
} from './quietHours';
import { trackNotificationFailed } from './telemetry';

const NOTIF_ID_MORNING = 'volyume_morning_weight';
const NOTIF_ID_CHECKIN = 'volyume_weekly_checkin';

// ─── Morning weight copy ──────────────────────────────────────────────────────

const MORNING_COPIES = [
  { title: 'Morning.', body: 'Weight when you\'re ready.' },
  { title: 'Daily weight', body: 'Takes 3 seconds.' },
  { title: 'Step on. Log it. Done.', body: 'One number, then coffee.' },
  { title: 'One number.', body: 'Step on, log it, done.' },
];

function pickMorningCopy(dayOfWeek) {
  return MORNING_COPIES[dayOfWeek % MORNING_COPIES.length];
}

/**
 * Daily morning weight reminder. Quiet-hours shifts the trigger out
 * of the window if needed.
 *
 * @param {number} hour    0-23, default 7
 * @param {number} minute  0-59, default 0
 */
export async function scheduleMorningWeightNotification(hour = 7, minute = 0) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MORNING).catch(() => {});
    const quiet = await getQuietHours();
    const { hour: h, minute: m } = shiftHourMinuteOutOfQuietHours(hour, minute, quiet);
    const copy = pickMorningCopy(new Date().getDay());
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_MORNING,
      content: {
        title: copy.title,
        body: copy.body,
        data: { type: 'morning_weight' },
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: m,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.MORNING_WEIGHT,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[notifications] scheduleMorningWeight failed:', e?.message);
    }
  }
}

// ─── Weekly check-in reminder ─────────────────────────────────────────────────

const CHECKIN_COPY = {
  title: 'Precision Coaching · check-in',
  body: 'Two minutes. Your nutrition adjusts automatically based on this week.',
};

/**
 * Returns a Date for the next occurrence of (weekday at hour:minute)
 * strictly after `after`. Used for one-off check-in reminders so we
 * can skip the week when the user has already checked in.
 */
function getNextWeekdayDate(weekday, hour, minute, after = new Date()) {
  const target = new Date(after);
  const currentDow = target.getDay();
  let daysUntil = (weekday - currentDow + 7) % 7;
  target.setHours(hour, minute, 0, 0);
  if (daysUntil === 0 && target.getTime() <= after.getTime()) {
    daysUntil = 7;
  }
  target.setDate(target.getDate() + daysUntil);
  return target;
}

export async function scheduleCheckinReminder(weekday = 0, hour = 12, minute = 0, options = {}) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CHECKIN).catch(() => {});

    const baseAfter = options.skipThisWeek
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : new Date();
    let fireAt = getNextWeekdayDate(weekday, hour, minute, baseAfter);

    // Minimum-gap enforcement: when the user changes their check-in
    // day mid-cycle, the next reminder must still land at least
    // minGapDays after their LAST check-in so the coach gets a full
    // weekly trend window.
    const minGapMs = (options.minGapDays ?? 0) * 24 * 60 * 60 * 1000;
    const lastCheckinMs = options.lastCheckinMs ?? 0;
    if (minGapMs > 0 && lastCheckinMs > 0) {
      const earliest = lastCheckinMs + minGapMs;
      while (fireAt.getTime() < earliest) {
        fireAt.setDate(fireAt.getDate() + 7);
      }
    }

    const quiet = await getQuietHours();
    const { date: shiftedDate } = shiftDateOutOfQuietHours(fireAt, quiet);

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_CHECKIN,
      content: {
        title: CHECKIN_COPY.title,
        body: CHECKIN_COPY.body,
        data: { type: 'weekly_checkin' },
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: shiftedDate,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.WEEKLY_CHECKIN_REMINDER,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[notifications] scheduleCheckin failed:', e?.message);
    }
  }
}

/**
 * Returns the start (Monday 00:00 UTC) of the current ISO week, in
 * epoch ms. Mirrors getCurrentWeekStart in WeeklyCheckInScreen.
 */
function getCurrentMondayWeekStartMs() {
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d.getTime();
}

/**
 * Schedule the next check-in reminder, but skip the upcoming
 * check-in day if the user has already saved a check-in for this
 * calendar week.
 */
export async function scheduleNextCheckinReminder(userId, weekday = 0, hour = 12, minute = 0) {
  let alreadyDone = false;
  try {
    if (userId) {
      // eslint-disable-next-line global-require
      const { getLatestCheckin } = require('../database');
      const latest = await getLatestCheckin(userId);
      const cycleStart = getCurrentMondayWeekStartMs();
      const now = Date.now();
      const weekStartMs = latest?.weekStart ?? 0;
      if (latest && weekStartMs >= cycleStart && weekStartMs <= now) {
        alreadyDone = true;
      }
    }
  } catch {}
  await scheduleCheckinReminder(weekday, hour, minute, { skipThisWeek: alreadyDone });
}

// ─── Cascade gate (day 19 + day 21) ─────────────────────────────────────────────
// NOTIFICATIONS_LOCKED.md "Timing": cascade day 19 (Pro winding down)
// and day 21 (auto-downgrade fired) both at 10:00 local, not
// configurable. These are LOCAL one-shots derived from the trial end
// date the device already holds (proTrialEndsAt); no server push is
// involved. The end date is the day-21 cutover; day 19 is 2 days
// before, matching the "ends in 2 days" copy.

const NOTIF_ID_CASCADE_19 = 'volyume_cascade_day19';
const NOTIF_ID_CASCADE_21 = 'volyume_cascade_day21';

const CASCADE_19_COPY = {
  title: 'Your Pro trial ends in 2 days',
  body: 'Tap to choose what\'s next.',
};
const CASCADE_21_COPY = {
  title: 'You\'re now on Free',
  body: 'Your data stays. Some features are read-only. Upgrade any time.',
};

/**
 * Schedule both cascade-gate reminders from the trial end date.
 *
 * @param {number|string|Date} trialEndsAt  proTrialEndsAt: the day-21
 *        cutover instant. Day 19 is derived as 2 days earlier.
 *
 * Both fire at 10:00 local on their day, shifted out of quiet hours.
 * Past gates are skipped (a trial ending tomorrow has no day-19 push).
 * Re-running cancels and re-lays the schedules, so calling this on
 * every launch is safe and idempotent.
 */
export async function scheduleCascadeGateNotifications(trialEndsAt) {
  if (Platform.OS === 'web') return;
  const endMs = trialEndsAt instanceof Date
    ? trialEndsAt.getTime()
    : (typeof trialEndsAt === 'number' ? trialEndsAt : Date.parse(trialEndsAt));
  if (!Number.isFinite(endMs)) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CASCADE_19).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CASCADE_21).catch(() => {});

    const quiet = await getQuietHours();
    const now = Date.now();

    // Day 21: 10:00 local on the cutover day.
    const day21 = new Date(endMs);
    day21.setHours(10, 0, 0, 0);
    // Day 19: 10:00 local, two days before the cutover.
    const day19 = new Date(endMs);
    day19.setDate(day19.getDate() - 2);
    day19.setHours(10, 0, 0, 0);

    const gates = [
      { id: NOTIF_ID_CASCADE_19, when: day19, copy: CASCADE_19_COPY },
      { id: NOTIF_ID_CASCADE_21, when: day21, copy: CASCADE_21_COPY },
    ];

    for (const g of gates) {
      if (g.when.getTime() <= now) continue; // past gate, don't schedule
      const { date: shifted } = shiftDateOutOfQuietHours(g.when, quiet);
      await Notifications.scheduleNotificationAsync({
        identifier: g.id,
        content: {
          title: g.copy.title,
          body: g.copy.body,
          data: { type: 'cascade_gate' },
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: shifted,
        },
      });
    }
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.CASCADE_GATE,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[notifications] scheduleCascadeGate failed:', e?.message);
    }
  }
}

export async function cancelCascadeGateNotifications() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CASCADE_19); } catch {}
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CASCADE_21); } catch {}
}

// ─── Weekly coach output ready ───────────────────────────────────────────────────
// NOTIFICATIONS_LOCKED.md "Timing": Monday 09:00 local, time-only
// configurable. Coach output is computed client-side after the weekly
// check-in, so this is a LOCAL recurring weekly reminder, not a server
// push. The default weekday is Monday (weekday 2 in expo's 1=Sunday
// convention); hour/minute are user-adjustable.

const NOTIF_ID_COACH_READY = 'volyume_weekly_coach_ready';

const COACH_READY_COPY = {
  title: 'Your week\'s plan is ready',
  body: 'Tap to see what changes and why.',
};

/**
 * Schedule the recurring "weekly coach output ready" reminder.
 *
 * @param {number} hour    0-23, default 9 (09:00 local)
 * @param {number} minute  0-59, default 0
 *
 * expo's WEEKLY trigger uses weekday 1=Sunday..7=Saturday; Monday is 2.
 * Quiet hours are applied to the hour/minute the same way the morning
 * reminder does. Recurring (repeats:true), so it fires every Monday
 * until cancelled. Re-running cancels and re-lays, so it's idempotent.
 */
export async function scheduleWeeklyCoachReady(hour = 9, minute = 0) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_COACH_READY).catch(() => {});
    const quiet = await getQuietHours();
    const { hour: h, minute: m } = shiftHourMinuteOutOfQuietHours(hour, minute, quiet);
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_COACH_READY,
      content: {
        title: COACH_READY_COPY.title,
        body: COACH_READY_COPY.body,
        data: { type: 'weekly_coach_ready' },
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2, // Monday (1=Sunday)
        hour: h,
        minute: m,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.WEEKLY_COACH_READY,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[notifications] scheduleWeeklyCoachReady failed:', e?.message);
    }
  }
}

export async function cancelWeeklyCoachReady() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_COACH_READY); } catch {}
}

// ─── Cancel helpers ───────────────────────────────────────────────────────────

export async function cancelMorningNotification() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MORNING); } catch {}
}

export async function cancelCheckinNotification() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CHECKIN); } catch {}
}

export async function cancelAllNotifications() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
}

// ─── Restore on app launch ────────────────────────────────────────────────────

/**
 * Re-applies saved notification preferences on app launch.
 * Call from RootNavigator after the user session is restored.
 *
 * @param {object} prefs - { morningEnabled, morningHour, morningMinute,
 *                           checkinEnabled, checkinDay, checkinHour, checkinMinute }
 * @param {string|null} userId
 */
export async function restoreNotifications(prefs, userId = null) {
  if (!prefs) return;
  // eslint-disable-next-line global-require
  const { getNotificationPermissionStatus } = require('./permissions');
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return;

  await cancelAllNotifications();

  if (prefs.morningEnabled) {
    await scheduleMorningWeightNotification(prefs.morningHour ?? 7, prefs.morningMinute ?? 0);
  }
  if (prefs.checkinEnabled) {
    await scheduleNextCheckinReminder(
      userId,
      prefs.checkinDay ?? 0,
      prefs.checkinHour ?? 12,
      prefs.checkinMinute ?? 0,
    );
  }
}

// ─── Year of Lifts unlock ─────────────────────────────────────────────────────
// Year of Lifts is gated until the user has 365 days of training (see
// AnalyticsScreen). The first time the gate opens, we fire a one-shot
// local notification. Idempotent via AsyncStorage flag.

const YEAR_OF_LIFTS_NOTIFIED_KEY = '@volyume_year_of_lifts_notified';

export async function checkYearOfLiftsUnlock(earliestWorkoutAt) {
  if (Platform.OS === 'web') return;
  if (!earliestWorkoutAt) return;
  const YEAR_MS = 365 * 86400000;
  if (Date.now() - earliestWorkoutAt < YEAR_MS) return;
  try {
    const already = await AsyncStorage.getItem(YEAR_OF_LIFTS_NOTIFIED_KEY);
    if (already === 'true') return;
    await Notifications.scheduleNotificationAsync({
      identifier: 'volyume_year_of_lifts_unlock',
      content: {
        title: 'A year of lifts',
        body: 'Your wrap-up is ready. Swipe through your training year on the Progress tab.',
        data: { type: 'year_of_lifts_unlock' },
        sound: true,
      },
      trigger: null,
    });
    await AsyncStorage.setItem(YEAR_OF_LIFTS_NOTIFIED_KEY, 'true');
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.YEAR_OF_LIFTS_UNLOCK,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[notifications] year of lifts unlock failed:', e?.message);
    }
  }
}
