/**
 * notifications.js
 * Local notification scheduling for Volyume Pro.
 * Wraps expo-notifications with Volyume-specific copy and timing.
 *
 * Two notification types:
 *   1. Morning weight reminder — daily at user-configured time
 *   2. Weekly check-in reminder — weekly on user-configured day/time
 *
 * All notifications are LOCAL ONLY — no server, no push tokens required.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getLatestCheckin } from './database';

// Notification IDs — used to cancel/replace specific scheduled notifications
const NOTIF_ID_MORNING = 'volyume_morning_weight';
const NOTIF_ID_CHECKIN = 'volyume_weekly_checkin';

// ─── Permission ───────────────────────────────────────────────────────────────

/**
 * Request notification permissions.
 * Returns 'granted' | 'denied' | 'undetermined'.
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return 'granted';

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: false, // keep it quiet — no sounds for habit notifications
      },
    });
    return status;
  } catch {
    return 'undetermined';
  }
}

/**
 * Returns current permission status without prompting.
 */
export async function getNotificationPermissionStatus() {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'undetermined';
  }
}

// ─── Handler configuration ────────────────────────────────────────────────────

/**
 * Call once at app startup (in RootNavigator or App.js).
 * Ensures notifications received while the app is foregrounded are shown.
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    // Smart suppression: before showing a scheduled notification, check
    // if the relevant action was ALREADY DONE today/this week. Don't
    // pester users with "log your weight" 30 minutes after they logged
    // it. The data tag (set via the schedule call) identifies which
    // kind of relevance check to run.
    handleNotification: async (notification) => {
      const dataType = notification?.request?.content?.data?.type;
      try {
        if (dataType === 'morning_weight' && await _alreadyLoggedWeightToday()) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
        if (dataType === 'weekly_checkin' && await _alreadyCheckedInThisWeek()) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
        if (dataType === 'training_reminder' && await _alreadyTrainedToday()) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
      } catch (_) { /* fall through to showing the notification */ }
      return {
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    },
  });
}

// Relevance helpers — each returns true if the action was done within
// the relevant window so the matching notification should be suppressed.
// Wrapped in try/catch so a database read failure falls through to
// "show the notification" rather than silently swallowing it.
async function _alreadyLoggedWeightToday() {
  try {
    // eslint-disable-next-line global-require
    const { getMorningWeightToday } = require('./database');
    // eslint-disable-next-line global-require
    const useAppStore = require('../store/useAppStore').default;
    const uid = useAppStore.getState().user?.id;
    if (!uid) return false;
    const entry = await getMorningWeightToday(uid);
    return !!entry?.weightKg;
  } catch (_) { return false; }
}

async function _alreadyCheckedInThisWeek() {
  try {
    // eslint-disable-next-line global-require
    const { getLatestCheckin } = require('./database');
    // eslint-disable-next-line global-require
    const useAppStore = require('../store/useAppStore').default;
    const uid = useAppStore.getState().user?.id;
    if (!uid) return false;
    const d = new Date();
    const daysFromMon = (d.getUTCDay() + 6) % 7;
    const monMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - daysFromMon * 86400000;
    const ci = await getLatestCheckin(uid, monMs);
    return !!ci;
  } catch (_) { return false; }
}

async function _alreadyTrainedToday() {
  try {
    // eslint-disable-next-line global-require
    const { getAllWorkouts } = require('./database');
    // eslint-disable-next-line global-require
    const useAppStore = require('../store/useAppStore').default;
    const uid = useAppStore.getState().user?.id;
    if (!uid) return false;
    const all = await getAllWorkouts(uid);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return all.some(w => w.isCompleted && w.startedAt >= todayStart.getTime());
  } catch (_) { return false; }
}

// ─── Morning weight copy ──────────────────────────────────────────────────────

const MORNING_COPIES = [
  { title: 'Morning.', body: 'Weight when you\'re ready.' },
  { title: 'Daily weight', body: 'Takes 3 seconds.' },
  { title: 'Step on. Log it. Done.' , body: 'One number, then coffee.' },
  { title: 'One number.', body: 'Step on, log it, done.' },
];

function pickMorningCopy(dayOfWeek) {
  return MORNING_COPIES[dayOfWeek % MORNING_COPIES.length];
}

// ─── Schedule morning weight notification ─────────────────────────────────────

/**
 * Schedules a daily repeating local notification for morning weight logging.
 * Cancels any existing morning notification first.
 *
 * @param {number} hour    - 0–23, default 7
 * @param {number} minute  - 0–59, default 0
 */
export async function scheduleMorningWeightNotification(hour = 7, minute = 0) {
  if (Platform.OS === 'web') return;
  try {
    // Cancel existing
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MORNING).catch(() => {});

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
        hour,
        minute,
      },
    });
  } catch (e) {
    console.warn('[notifications] scheduleMorningWeight failed:', e?.message);
  }
}

// ─── Schedule weekly check-in reminder ────────────────────────────────────────

const CHECKIN_COPY = {
  title: 'Precision Coaching · check-in',
  body: 'Two minutes. Your nutrition adjusts automatically based on this week.',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Schedules a weekly repeating check-in reminder.
 * Cancels any existing check-in notification first.
 *
 * @param {number} weekday  - 1 (Sun) … 7 (Sat) in expo-notifications weekday format
 *                            OR pass 0–6 JS day index and we convert internally
 * @param {number} hour     - 0–23, default 18 (6pm)
 * @param {number} minute   - 0–59, default 0
 */
/**
 * Returns a Date for the next occurrence of (weekday at hour:minute) strictly
 * after `after`. Used for one-off check-in reminders so we can skip the week
 * when the user has already checked in.
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

    // If the caller already knows the user checked in for the current cycle,
    // they pass skipThisWeek=true and we schedule for the cycle after next.
    const baseAfter = options.skipThisWeek
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) // bump past today
      : new Date();
    let fireAt = getNextWeekdayDate(weekday, hour, minute, baseAfter);

    // Minimum-gap enforcement: when the user changes their check-in day
    // mid-cycle, the next reminder must still land at least
    // `minGapDays` (default 7) after their LAST check-in so the coach
    // gets a full weekly trend window. Without this they could change
    // from Sunday → Wednesday on a Monday and be reminded just 2 days
    // after their previous check-in — the trend math would be noisy.
    const minGapMs = (options.minGapDays ?? 0) * 24 * 60 * 60 * 1000;
    const lastCheckinMs = options.lastCheckinMs ?? 0;
    if (minGapMs > 0 && lastCheckinMs > 0) {
      const earliest = lastCheckinMs + minGapMs;
      while (fireAt.getTime() < earliest) {
        // Advance one full week at a time so we always land on the
        // chosen weekday at the chosen time.
        fireAt.setDate(fireAt.getDate() + 7);
      }
    }

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
        date: fireAt,
      },
    });
  } catch (e) {
    console.warn('[notifications] scheduleCheckin failed:', e?.message);
  }
}

/**
 * Returns the start (Monday 00:00 UTC) of the current ISO week, in epoch ms.
 * Mirrors getCurrentWeekStart in WeeklyCheckInScreen so a row keyed at that
 * timestamp tells us the user has checked in for this week.
 */
function getCurrentMondayWeekStartMs() {
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d.getTime();
}

/**
 * Schedule the next check-in reminder, but skip the upcoming check-in day
 * if the user has already saved a check-in for this calendar week.
 */
export async function scheduleNextCheckinReminder(userId, weekday = 0, hour = 12, minute = 0) {
  let alreadyDone = false;
  try {
    if (userId) {
      const latest = await getLatestCheckin(userId);
      const cycleStart = getCurrentMondayWeekStartMs();
      // Only count check-ins from THIS week's Monday up to "now". A row
      // dated in the future (clock skew, manual edit, etc.) used to
      // suppress the reminder forever; bound it to <= now so future-dated
      // rows are ignored.
      const now = Date.now();
      const weekStartMs = latest?.weekStart ?? 0;
      if (latest && weekStartMs >= cycleStart && weekStartMs <= now) {
        alreadyDone = true;
      }
    }
  } catch {}
  await scheduleCheckinReminder(weekday, hour, minute, { skipThisWeek: alreadyDone });
}

// ─── Cancel helpers ───────────────────────────────────────────────────────────

export async function cancelMorningNotification() {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MORNING);
  } catch {}
}

export async function cancelCheckinNotification() {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CHECKIN);
  } catch {}
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

// ─── Restore on app launch ────────────────────────────────────────────────────

/**
 * Re-applies saved notification preferences on app launch.
 * Call from RootNavigator after user session is restored.
 *
 * @param {object} prefs - { morningEnabled, morningHour, morningMinute,
 *                           checkinEnabled, checkinDay, checkinHour, checkinMinute }
 */
export async function restoreNotifications(prefs, userId = null) {
  if (!prefs) return;
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

// ─── Year of Lifts unlock ──────────────────────────────────────────────────
// Year of Lifts is gated until the user has 365 days of training (see
// AnalyticsScreen). The first time the gate opens, we fire a one-shot
// local notification so the user doesn't have to discover the unlock
// by checking the tile. Idempotent via AsyncStorage flag — only fires
// once per account ever.
import AsyncStorage from '@react-native-async-storage/async-storage';

const YEAR_OF_LIFTS_NOTIFIED_KEY = '@volyume_year_of_lifts_notified';

/**
 * Check whether the user has just crossed the 365-day mark and, if so,
 * present a celebratory local notification + flip the seen flag so the
 * notification never fires twice.
 *
 * Called on app foreground from App.js's AppState 'active' handler.
 * Caller passes the earliest completed workout's started_at (ms epoch).
 */
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
      trigger: null, // present immediately
    });
    await AsyncStorage.setItem(YEAR_OF_LIFTS_NOTIFIED_KEY, 'true');
  } catch (e) {
    console.warn('[notifications] year of lifts unlock failed:', e?.message);
  }
}
