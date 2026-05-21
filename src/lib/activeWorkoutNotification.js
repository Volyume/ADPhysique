/**
 * activeWorkoutNotification.js
 *
 * Shows a persistent ("ongoing") notification while a workout is in
 * progress, so the user sees their current set count and elapsed time
 * on the lock screen and notification shade — without unlocking the
 * phone. Tap the notification to bring the app back to ActiveWorkout.
 *
 * Implementation is pure JS on top of expo-notifications. Each
 * present* call REPLACES the same notification (same identifier), so
 * updating the body just re-presents it. No real foreground service
 * (a full Android service would survive force-close; this doesn't),
 * but it covers the 99% case where the user backgrounds the app to
 * play music or text someone between sets.
 *
 * On iOS expo-notifications doesn't support ongoing notifications
 * directly (Apple style is Live Activities, which need a config-plugin
 * and a Swift widget). The whole module is a no-op on iOS for now.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const NOTIF_ID = 'volyume_active_workout';
const CHANNEL_ID = 'volyume_active_workout';

let channelEnsured = false;

async function ensureChannel() {
  if (channelEnsured || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Active workout',
      importance: Notifications.AndroidImportance.LOW,
      // No sound, no vibration — this is a persistent status display,
      // not an alert. We don't want the user's phone buzzing every
      // time we update the body text after a logged set.
      sound: null,
      vibrationPattern: [0],
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: false,
    });
    channelEnsured = true;
  } catch (_) { /* if channel setup fails the notif call will surface */ }
}

/**
 * Show or update the persistent workout notification.
 *
 *   workoutName        e.g. "Push Day A" or "Manual session"
 *   elapsedSeconds     total session length so far
 *   currentSetIndex    1-based set number being worked
 *   totalSetsForExercise optional, displayed as "Set 2 of 4"
 *   isResting          true → body reads "Resting · 1:23"
 *   restRemainingSec   countdown for the rest case
 *
 * Safe to call repeatedly; each call replaces the previous body.
 */
export async function showActiveWorkoutNotification({
  workoutName,
  elapsedSeconds = 0,
  currentSetIndex,
  totalSetsForExercise,
  exerciseName,
  isResting = false,
  restRemainingSec = 0,
} = {}) {
  if (Platform.OS !== 'android') return;
  try {
    await ensureChannel();

    const title = workoutName
      ? `Volyume · ${workoutName}`
      : 'Volyume · Workout in progress';

    let body;
    if (isResting && restRemainingSec > 0) {
      const mins = Math.floor(restRemainingSec / 60);
      const secs = restRemainingSec % 60;
      const t = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
      body = `Resting · ${t}${exerciseName ? `  ·  ${exerciseName}` : ''}`;
    } else if (currentSetIndex != null) {
      const elapsed = formatElapsed(elapsedSeconds);
      const setLabel = totalSetsForExercise
        ? `Set ${currentSetIndex} of ${totalSetsForExercise}`
        : `Set ${currentSetIndex}`;
      body = exerciseName
        ? `${setLabel}  ·  ${exerciseName}  ·  ${elapsed}`
        : `${setLabel}  ·  ${elapsed}`;
    } else {
      body = formatElapsed(elapsedSeconds);
    }

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title,
        body,
        data: { type: 'active_workout' },
        sticky: true,        // Android-only flag honoured by expo-notifications
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        sound: null,
      },
      trigger: null, // Show immediately. Re-calling replaces the existing.
    });
  } catch (_) { /* silent — workout flow shouldn't break on notif failure */ }
}

/**
 * Dismisses the persistent notification. Call this when the workout
 * ends or is cancelled.
 */
export async function dismissActiveWorkoutNotification() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.dismissNotificationAsync(NOTIF_ID);
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID).catch(() => {});
  } catch (_) {}
}

function formatElapsed(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
