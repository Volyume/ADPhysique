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

// Feature flag for the foreground-service-backed notification path.
// When false, we use the standard expo-notifications sticky path
// (works while the app is alive, dies on force-close). When true, we
// drive the native foreground service in rest-timer-live which
// survives force-close. Flipped ON so the workout state stays on the
// lock screen even after Android (or the user) force-closes Volyume.
// If anything misbehaves on Android 14 health-permission prompts,
// flip back to false here and rebuild.
const USE_FOREGROUND_SERVICE = true;

// Lazy require of the native module. The require itself is cheap on
// Android (the module is already loaded by the runtime); on iOS or in
// Expo Go it throws and we silently fall back to the JS-only path.
function getRestTimerLive() {
  try {
    // eslint-disable-next-line global-require
    return require('rest-timer-live');
  } catch (_) { return null; }
}

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
function buildTitleAndBody({
  workoutName, elapsedSeconds = 0, currentSetIndex,
  totalSetsForExercise, exerciseName, isResting = false, restRemainingSec = 0,
}) {
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
  return { title, body };
}

export async function showActiveWorkoutNotification(args = {}) {
  if (Platform.OS !== 'android') return;
  const { title, body } = buildTitleAndBody(args);

  // Path A: native foreground service. Survives force-close and
  // doesn't need the user to grant POST_NOTIFICATIONS in advance
  // (Android shows the notif at service start). Off by default until
  // we verify the next build is healthy.
  if (USE_FOREGROUND_SERVICE) {
    const rtl = getRestTimerLive();
    if (rtl?.isWorkoutForegroundAvailable?.()) {
      try {
        const ok = await rtl.startWorkoutForeground({
          title,
          body,
          channelId: CHANNEL_ID,
          deepLink: 'volyume://active-workout',
        });
        if (ok) return; // success — skip the JS fallback
      } catch (_) { /* fall through to JS fallback */ }
    }
  }

  // Path B: standard expo-notifications sticky. Works while the app
  // is alive; cleared on force-close. This is the prior behaviour and
  // the safe default.
  try {
    await ensureChannel();

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
 * ends or is cancelled. Tears down both the foreground service
 * (if running) and the standard sticky notification, so it doesn't
 * matter which path was used to start things.
 */
export async function dismissActiveWorkoutNotification() {
  if (Platform.OS !== 'android') return;
  // Stop the foreground service if it's running. Safe even when the
  // feature flag is off — stopWorkoutForeground is a no-op when the
  // service isn't active or the module is unavailable.
  const rtl = getRestTimerLive();
  try { await rtl?.stopWorkoutForeground?.(); } catch (_) {}
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
