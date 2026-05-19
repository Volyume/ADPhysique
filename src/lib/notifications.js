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
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
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
  title: 'Weekly coaching',
  body: 'Your week\'s done. 2 minutes to set up next week.',
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
export async function scheduleCheckinReminder(weekday = 0, hour = 18, minute = 0) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CHECKIN).catch(() => {});

    // expo-notifications uses 1=Sunday … 7=Saturday for weekly triggers
    // We accept JS day index (0=Sun … 6=Sat) and convert
    const expoWeekday = weekday + 1;

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_CHECKIN,
      content: {
        title: CHECKIN_COPY.title,
        body: CHECKIN_COPY.body,
        data: { type: 'weekly_checkin' },
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: expoWeekday,
        hour,
        minute,
      },
    });
  } catch (e) {
    console.warn('[notifications] scheduleCheckin failed:', e?.message);
  }
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
export async function restoreNotifications(prefs) {
  if (!prefs) return;
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return;

  await cancelAllNotifications();

  if (prefs.morningEnabled) {
    await scheduleMorningWeightNotification(prefs.morningHour ?? 7, prefs.morningMinute ?? 0);
  }
  if (prefs.checkinEnabled) {
    await scheduleCheckinReminder(
      prefs.checkinDay ?? 0,
      prefs.checkinHour ?? 18,
      prefs.checkinMinute ?? 0,
    );
  }
}
