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
// On iOS the equivalent is a Live Activity (Dynamic Island + lock
// screen). modules/live-activity wraps ActivityKit. Both modules are
// guarded by lazy requires so this file compiles cleanly even when
// either is missing from the build.

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

let _nativeLiveActivity = null;
function getLiveActivity() {
  if (_nativeLiveActivity !== null) return _nativeLiveActivity;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    _nativeLiveActivity = require('live-activity');
  } catch (_) {
    _nativeLiveActivity = false;
  }
  return _nativeLiveActivity || null;
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
  if (!seconds || seconds <= 0) return null;
  const endTimeMs = Date.now() + seconds * 1000;
  // Fire both surfaces — Android chronometer and iOS Live Activity
  // — concurrently. Either one being unavailable on this platform
  // is fine; each module guards itself.
  const native = getNativeRest();
  const liveActivity = getLiveActivity();
  let posted = null;
  if (native?.isAvailable?.()) {
    try {
      await ensureNotifChannels();
      const ok = await native.start({
        exerciseName: exerciseName || 'Rest timer',
        endTimeMs,
        channelId: REST_CHANNEL_ID,
        deepLink: 'volyume://active-workout',
      });
      if (ok) posted = REST_CHANNEL_ID;
    } catch (_) { /* tolerate */ }
  }
  if (liveActivity?.isAvailable?.()) {
    try {
      await liveActivity.startRestActivity({
        exerciseName: exerciseName || 'Rest timer',
        endTimeMs,
      });
      // Returning a non-null sentinel so the caller knows SOMETHING
      // is posted even if the Android path didn't.
      if (!posted) posted = 'live-activity';
    } catch (_) { /* tolerate */ }
  }
  return posted;
}

/**
 * Cancel the live-countdown notification on every platform that
 * posts one. Safe to call when nothing is posted or when neither
 * module is bundled.
 */
export async function cancelRestNotif() {
  const native = getNativeRest();
  const liveActivity = getLiveActivity();
  if (native?.cancel) {
    try { await native.cancel(); } catch (_) { /* best effort */ }
  }
  if (liveActivity?.endRestActivity) {
    try { await liveActivity.endRestActivity(); } catch (_) { /* best effort */ }
  }
}
