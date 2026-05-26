import * as Notifications from 'expo-notifications';

const TRAINING_REMINDERS_CHANNEL = 'training-reminders';
const REST_TIMER_CHANNEL = 'rest-timer';

/**
 * Registers the Android notification channels Volyume uses.
 *
 * Per NOTIFICATIONS_LOCKED.md, all push respects a quiet-hours window
 * and OS-level channel grouping. Android requires channels to be
 * declared before any scheduled notification can target them; iOS
 * silently ignores. Call at app boot from App.js.
 *
 * Channels:
 *   training-reminders: HIGH importance, sound + vibrate, used by
 *     the weekly training-day push and the daily check-in reminder.
 *   rest-timer: LOW importance, silent, used by the live rest-timer
 *     countdown notification while the user is between sets. End-of-
 *     rest feedback comes from the in-app sound + haptic, not the
 *     notification itself.
 */
export async function ensureNotifChannels() {
  try {
    await Notifications.setNotificationChannelAsync(TRAINING_REMINDERS_CHANNEL, {
      name: 'Training reminders',
      description: 'Reminders on your scheduled training days',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      showBadge: false,
    });
    await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL, {
      name: 'Rest timer',
      description: 'Live countdown shown while a rest timer is running',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
      showBadge: false,
    });
  } catch {}
}
