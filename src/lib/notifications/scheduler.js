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
import { COACHING_REMINDERS_CHANNEL } from './channels';
import { localWeekStartMs } from '../dayKey';
import { logWarn } from '../errorLog';

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
    await cancelMorningNotification();
    const quiet = await getQuietHours();
    const { hour: h, minute: m } = shiftHourMinuteOutOfQuietHours(hour, minute, quiet);
    // NOTIF-4: schedule one WEEKLY trigger per weekday so the morning copy
    // actually rotates. The old single DAILY trigger froze whatever copy was
    // picked at schedule time, so the per-weekday rotation never happened until
    // the next re-lay. expo weekday is 1=Sunday..7=Saturday -> JS getDay (w-1).
    for (let expoWeekday = 1; expoWeekday <= 7; expoWeekday += 1) {
      const copy = pickMorningCopy(expoWeekday - 1);
      // eslint-disable-next-line no-await-in-loop
      await Notifications.scheduleNotificationAsync({
        identifier: `${NOTIF_ID_MORNING}_${expoWeekday}`,
        content: {
          title: copy.title,
          body: copy.body,
          data: { type: 'morning_weight' },
          sound: false,
        },
        trigger: {
          channelId: COACHING_REMINDERS_CHANNEL,
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday,
          hour: h,
          minute: m,
        },
      });
    }
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.MORNING_WEIGHT,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleMorningWeight', e?.message);
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
        channelId: COACHING_REMINDERS_CHANNEL,
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
      logWarn('notifications.scheduleCheckin', e?.message);
    }
  }
}

/**
 * Start (Monday 00:00 LOCAL) of the current week, in epoch ms. Local, not
 * UTC, so it matches getCurrentWeekStart in WeeklyCheckInScreen and the
 * rest of the app's week boundary (UK-local rule).
 */
function getCurrentMondayWeekStartMs() {
  return localWeekStartMs();
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
      // Suppress on the check-in's actual creation instant, not its stored
      // week_start. created_at is an absolute timestamp, so it matches the
      // local week regardless of how week_start was computed (older rows
      // stored a UTC-Monday week_start); falls back to weekStart only if a
      // row somehow lacks created_at.
      // A row can exist from a completed workout (which contributes only
      // sleep_quality), so require a real check-in: energy_score is always set
      // by the weekly check-in. Without this, training suppressed the next
      // check-in reminder even though the user never checked in.
      const madeAt = latest?.createdAt ?? latest?.weekStart ?? 0;
      if (latest && latest.energyScore != null && madeAt >= cycleStart && madeAt <= now) {
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
  body: 'Your data\'s safe. Upgrade whenever you like.',
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
          channelId: COACHING_REMINDERS_CHANNEL,
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
      logWarn('notifications.scheduleCascadeGate', e?.message);
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
 * Schedule a ONE-OFF "weekly coach output ready" reminder for the next Monday.
 *
 * @param {number} hour    0-23, default 9 (09:00 local)
 * @param {number} minute  0-59, default 0
 *
 * This is laid only when the user submits a check-in
 * (WeeklyCheckInScreen.handleSubmit), so the "your plan is ready" notification
 * fires only in a week the user actually checked in, i.e. only when a real
 * review exists. A week with no check-in gets no notification. Previously this
 * was a RECURRING weekly notification that fired every Monday regardless, and
 * tapping it (with no review for the week) dropped the user on the
 * "building baseline" screen. One-off + re-laid each check-in fixes that.
 * Re-running cancels and re-lays, so it stays idempotent.
 */
export async function scheduleWeeklyCoachReady(hour = 9, minute = 0) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_COACH_READY).catch(() => {});
    const quiet = await getQuietHours();
    const { hour: h, minute: m } = shiftHourMinuteOutOfQuietHours(hour, minute, quiet);
    // Next Monday at h:m (getNextWeekdayDate uses JS getDay, Monday = 1).
    const fireAt = getNextWeekdayDate(1, h, m, new Date());
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_COACH_READY,
      content: {
        title: COACH_READY_COPY.title,
        body: COACH_READY_COPY.body,
        data: { type: 'weekly_coach_ready' },
        sound: false,
      },
      trigger: {
        channelId: COACHING_REMINDERS_CHANNEL,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.WEEKLY_COACH_READY,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleWeeklyCoachReady', e?.message);
    }
  }
}

export async function cancelWeeklyCoachReady() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_COACH_READY); } catch {}
}

// ─── Training Partners weekly digest ────────────────────────────────────────
// A Sunday-evening local digest nudging the user to look at their week and
// their partners'. Local-only (no remote push needed); the body is generic
// because counts aren't known at schedule time. Scheduled when the user turns
// on partner sharing, cancelled when they turn it off.
const NOTIF_ID_PARTNER_DIGEST = 'volyume_partner_digest';
const PARTNER_DIGEST_COPY = {
  title: 'Your training week',
  body: 'See how you and your training partners did this week.',
};

export async function scheduleWeeklyPartnerDigest(hour = 18, minute = 0) {
  if (Platform.OS === 'web') return;
  try {
    await cancelWeeklyPartnerDigest();
    const quiet = await getQuietHours();
    const { hour: h, minute: m } = shiftHourMinuteOutOfQuietHours(hour, minute, quiet);
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_PARTNER_DIGEST,
      content: {
        title: PARTNER_DIGEST_COPY.title,
        body: PARTNER_DIGEST_COPY.body,
        data: { type: 'partner_digest' },
        sound: false,
      },
      trigger: {
        channelId: COACHING_REMINDERS_CHANNEL,
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,            // expo weekday 1 = Sunday
        hour: h,
        minute: m,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.PARTNER_DIGEST,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.schedulePartnerDigest', e?.message);
    }
  }
}

export async function cancelWeeklyPartnerDigest() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_PARTNER_DIGEST); } catch {}
}

// ─── Cancel helpers ───────────────────────────────────────────────────────────

export async function cancelMorningNotification() {
  // Legacy single id (pre-NOTIF-4) plus the 7 per-weekday ids.
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MORNING); } catch {}
  for (let w = 1; w <= 7; w += 1) {
    try { await Notifications.cancelScheduledNotificationAsync(`${NOTIF_ID_MORNING}_${w}`); } catch {}
  }
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
// NOTIF-1: the morning/check-in/coach triggers bake the quiet-hours-shifted
// hour in at schedule time, computed against the device's timezone THEN. After
// the user changes timezone (travel), that baked-in hour is wrong until the
// next cold start re-lays it. Call this on foreground: if the timezone offset
// changed since we last scheduled, re-lay the notifications so quiet-hours is
// recomputed for the new zone. Gated on the offset so a normal foreground does
// no work.
const TZ_OFFSET_KEY = '@volyume_notif_tz_offset';

export async function rescheduleForTimezoneIfChanged(userId = null) {
  if (Platform.OS === 'web') return;
  try {
    const current = new Date().getTimezoneOffset();
    const storedRaw = await AsyncStorage.getItem(TZ_OFFSET_KEY);
    const stored = storedRaw == null ? null : Number(storedRaw);
    if (stored === current) return; // no change, nothing to do
    await AsyncStorage.setItem(TZ_OFFSET_KEY, String(current));
    if (stored === null) return; // first run: just record the baseline
    const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
    if (raw) await restoreNotifications(JSON.parse(raw), userId);
  } catch (_) { /* tolerate */ }
}

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
      trigger: { channelId: COACHING_REMINDERS_CHANNEL },
    });
    await AsyncStorage.setItem(YEAR_OF_LIFTS_NOTIFIED_KEY, 'true');
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.YEAR_OF_LIFTS_UNLOCK,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.yearOfLiftsUnlock', e?.message);
    }
  }
}
