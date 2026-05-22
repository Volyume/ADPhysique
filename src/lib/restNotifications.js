import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_PROMPT_KEY = 'volyume_notif_prompt_seen';
const TRAINING_REMINDERS_CHANNEL = 'training-reminders';
const REST_TIMER_CHANNEL = 'rest-timer';

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
    // Low-importance channel for the live rest-timer countdown. No
    // sound, no vibration — the OS chronometer ticks silently while
    // the user is between sets. End-of-rest feedback comes from the
    // in-app sound + haptic in src/lib/restSound + haptics.js.
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

export async function hasSeenNotifPrompt() {
  try {
    const val = await AsyncStorage.getItem(NOTIF_PROMPT_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markNotifPromptSeen() {
  try {
    await AsyncStorage.setItem(NOTIF_PROMPT_KEY, 'true');
  } catch {}
}

export async function getNotifPermissionStatus() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'undetermined';
  }
}

export async function requestNotifPermission() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── Live chronometer rest-timer notification ────────────────────────────
//
// The native module modules/rest-timer-live posts a notification that
// uses Android's built-in chronometer to count DOWN to a future
// timestamp. The OS does the ticking — the app doesn't have to wake
// every second to update the display. End result: the user sees a
// live "rest ends in 1:24" countdown on their lock screen and in the
// notification shade without unlocking.
//
// On iOS the native module is unavailable (expo-modules-core's
// requireNativeModule returns null) so isAvailable() is false and
// these calls become silent no-ops. iOS gets a Live Activity in a
// follow-up commit; for now the in-app timer is the only feedback.

const REST_CHANNEL_ID = 'rest-timer';

let _nativeRest = null;
function getNativeRest() {
  if (_nativeRest !== null) return _nativeRest;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    _nativeRest = require('rest-timer-live');
  } catch (_) {
    _nativeRest = false;
  }
  return _nativeRest || null;
}

/**
 * Post (or replace) the live-countdown rest-timer notification.
 * No-op on iOS or when the native module isn't bundled.
 *
 * Returns the notification id-equivalent string when posted, or null
 * if the native side declined (POST_NOTIFICATIONS permission denied,
 * platform unsupported, etc.). Callers should pass the returned id
 * to cancelRestNotif when the timer stops.
 *
 * @param {number} seconds       Seconds remaining when the timer started.
 *                               The actual end time is computed as
 *                               Date.now() + seconds * 1000 so the
 *                               OS chronometer counts down to a
 *                               concrete moment, not a duration.
 * @param {string} exerciseName  Shown as the notification title.
 */
export async function scheduleRestNotif(seconds, exerciseName) {
  const native = getNativeRest();
  if (!native?.isAvailable?.()) return null;
  if (!seconds || seconds <= 0) return null;
  try {
    await ensureNotifChannels();
    const ok = await native.start({
      exerciseName: exerciseName || 'Rest timer',
      endTimeMs: Date.now() + seconds * 1000,
      channelId: REST_CHANNEL_ID,
      deepLink: 'volyume://active-workout',
    });
    return ok ? REST_CHANNEL_ID : null;
  } catch (_) {
    return null;
  }
}

/**
 * Cancel the live-countdown notification. Safe to call when nothing
 * is posted or when the native module is unavailable.
 */
export async function cancelRestNotif() {
  const native = getNativeRest();
  if (!native?.cancel) return;
  try { await native.cancel(); } catch (_) { /* best effort */ }
}
