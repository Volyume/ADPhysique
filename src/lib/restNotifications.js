import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RestTimerLive from 'rest-timer-live';

const NOTIF_PROMPT_KEY = 'volyume_notif_prompt_seen';
const REST_TIMER_CHANNEL = 'rest-timer';
const REST_DONE_CHANNEL = 'rest-done';
const TRAINING_REMINDERS_CHANNEL = 'training-reminders';

// Track the IDs of both notifications so we can cancel them cleanly
let ongoingNotifId = null;
let doneNotifId = null;
// True once the native live-chronometer module has successfully posted the
// ongoing notification for the current rest period. While true, we skip the
// static expo-notifications ongoing notification so the user sees ONE live
// ticking notification, not two stacked notifications in the shade.
let liveNotifActive = false;

// ---------------------------------------------------------------------------
// Android notification channels
// Must be called before any notification is posted. Safe to call multiple times.
// ---------------------------------------------------------------------------
export async function ensureNotifChannels() {
  try {
    await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL, {
      name: 'Rest timer',
      description: 'Ongoing notification shown while the rest timer is running',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      enableVibrate: false,
      showBadge: false,
    });
    await Notifications.setNotificationChannelAsync(REST_DONE_CHANNEL, {
      name: 'Rest complete',
      description: 'Alert when your rest period has finished',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
      showBadge: false,
    });
    await Notifications.setNotificationChannelAsync(TRAINING_REMINDERS_CHANNEL, {
      name: 'Training reminders',
      description: 'Reminders on your scheduled training days',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      showBadge: false,
    });
  } catch {
    // Channels are Android-only; silently skip on iOS
  }
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------
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
    return status; // 'granted' | 'denied' | 'undetermined'
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

// ---------------------------------------------------------------------------
// scheduleRestNotif
//
// Posts two notifications:
//   1. An immediate ongoing/sticky notification showing the exercise name and
//      the absolute end time — visible on the lock screen while the user rests.
//      On Android this is sticky and stays in the notification shade.
//      On iOS it appears immediately as a standard local notification.
//   2. A scheduled alert that fires when rest is over.
//
// Returns the ID of the ongoing notification so the caller can cancel it.
// ---------------------------------------------------------------------------
export async function scheduleRestNotif(seconds, exerciseName = '') {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    await ensureNotifChannels();

    // Cancel any leftover notifications from a previous rest period
    await cancelRestNotif();

    const endTimeMs = Date.now() + seconds * 1000;
    const endTime = new Date(endTimeMs);
    const timeStr = endTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const title = exerciseName || 'Rest timer';
    const ongoingBody = `Rest ends at ${timeStr} — tap to return`;

    // 1a. Try the native live-chronometer notification on Android. This shows
    // a ticking countdown on the lock screen rather than a static end time.
    liveNotifActive = false;
    if (Platform.OS === 'android' && RestTimerLive.isAvailable()) {
      try {
        const posted = await RestTimerLive.start({
          exerciseName: title,
          endTimeMs,
          channelId: REST_TIMER_CHANNEL,
          deepLink: 'volyume://workout',
        });
        if (posted) {
          liveNotifActive = true;
        }
      } catch (_) {
        liveNotifActive = false;
      }
    }

    // 1b. Fallback: static expo-notifications ongoing notification (iOS, or
    // Android when the native module is unavailable or rejected the post).
    if (!liveNotifActive) {
      ongoingNotifId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: ongoingBody,
          sound: false,
          data: { url: 'volyume://workout' },
          // Android-specific sticky/ongoing flags
          android: {
            channelId: REST_TIMER_CHANNEL,
            ongoing: true,
            sticky: true,
            priority: Notifications.AndroidNotificationPriority.LOW,
            color: '#F59E0B',
            smallIcon: 'notification_icon',
          },
        },
        trigger: null, // show immediately
      });
    }

    // 2. Alert notification that fires when rest is over
    doneNotifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: exerciseName ? `${exerciseName} — rest complete` : 'Rest complete',
        body: 'Time for your next set.',
        sound: true,
        data: { url: 'volyume://workout' },
        android: {
          channelId: REST_DONE_CHANNEL,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: '#F59E0B',
          smallIcon: 'notification_icon',
        },
      },
      trigger: { seconds: Math.max(1, seconds) },
    });

    return ongoingNotifId;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// cancelRestNotif
//
// Cancels both the ongoing lock-screen notification and the scheduled alert.
// Safe to call at any time (no-ops if nothing is pending).
// ---------------------------------------------------------------------------
export async function cancelRestNotif(notifId) {
  try {
    // Cancel the live chronometer notification first (Android native module).
    if (liveNotifActive) {
      await RestTimerLive.cancel().catch(() => {});
      liveNotifActive = false;
    }
    // Cancel the ongoing notification (passed ID or module-level ref)
    const idToCancel = notifId || ongoingNotifId;
    if (idToCancel) {
      await Notifications.dismissNotificationAsync(idToCancel).catch(() => {});
      await Notifications.cancelScheduledNotificationAsync(idToCancel).catch(() => {});
    }
    // Cancel the scheduled done alert
    if (doneNotifId) {
      await Notifications.cancelScheduledNotificationAsync(doneNotifId).catch(() => {});
      doneNotifId = null;
    }
    ongoingNotifId = null;
  } catch {}
}
