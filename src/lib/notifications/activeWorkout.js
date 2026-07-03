/**
 * activeWorkoutNotification.js
 *
 * Shows a persistent ("ongoing") notification while a workout is in
 * progress, so the user sees their current set count and elapsed time
 * on the lock screen and notification shade, without unlocking the
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

import { REST_TIMER_CATEGORY_ID } from './categories';

const NOTIF_ID = 'volyume_active_workout';
const CHANNEL_ID = 'volyume_active_workout';

// The live rest-timer notification (U1 / 13-engagement-notifications R3).
// Separate id + the silent 'rest-timer' channel (channels.js) so updating
// the countdown body every tick never buzzes the phone. categoryIdentifier
// attaches the four action buttons registered via registerRestTimerCategory().
const REST_NOTIF_ID = 'volyume_rest_timer';
const REST_CHANNEL_ID = 'rest-timer';

// Feature flag for the foreground-service-backed WORKOUT notification path
// (the whole-session notification, not the rest window). Stays false: the
// session-length notification surface itself is disabled below (the "Set 3
// of 2" founder decision), so there is nothing for a service to host.
//
// History: this was originally held off because WorkoutForegroundService
// used FOREGROUND_SERVICE_TYPE_HEALTH, which from Android 14 throws
// SecurityException without a health runtime permission. E6A (2026-07-02)
// retyped the service to SHORT_SERVICE for the rest window — see
// notifications/restForeground.js for the path that IS live — so the old
// crash no longer exists, but a shortService (~3 min) cannot host a
// session-length notification anyway. If the session surface is ever
// revived, it needs its own service-type decision.
const USE_FOREGROUND_SERVICE = false;

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
      // No sound, no vibration, this is a persistent status display,
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

// All workout-progress notifications are disabled. The user found the
// set numbering ("Set 3 of 2") confusing and the lock-screen surface
// itself unhelpful, so the entire path no-ops. The functions are
// kept exported so call sites in ActiveWorkoutScreen can stay
// untouched, they fire into the void. Re-enable later only with a
// correct numbering policy + a settings toggle.
export async function showActiveWorkoutNotification(args = {}) {
  return; // notification surface disabled, see comment above
  // eslint-disable-next-line no-unreachable
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
        if (ok) return; // success, skip the JS fallback
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
  } catch (_) { /* silent, workout flow shouldn't break on notif failure */ }
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
  // feature flag is off, stopWorkoutForeground is a no-op when the
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

// The rest sticky shows a STATIC end time (see presentRestTimerNotification):
// a fixed "Ends HH:MM" never needs a per-second update, so it can't flicker the
// shade, lag the in-app timer, or freeze at a stale value when JS suspends in
// the background. 24-hour local clock (UK-first, unambiguous).
function formatEndClock(ms) {
  const t = Number(ms);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

let restChannelEnsured = false;
async function ensureRestChannel() {
  if (restChannelEnsured || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: [0],
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: false,
    });
    restChannelEnsured = true;
  } catch (_) { /* notif call will surface any failure */ }
}

/**
 * Present (or refresh) the persistent rest-timer notification with the four
 * action buttons. Posted ONCE per rest, and again only when the rest is
 * re-anchored (a ±15s adjust) — NOT on every tick. It shows a STATIC end time
 * ("Ends HH:MM"), so the shade never re-animates every second, the value never
 * lags the in-app timer, and it stays correct while the app is backgrounded
 * (the old per-tick re-present flickered, ran ~half a second behind, and froze
 * at its last value because JS suspends in the background). The "rest is over"
 * moment is handled separately: the scheduled rest-end alert (store) fires it
 * natively, and the in-app timer carries the live countdown on screen.
 *
 *   endsAtMs      wall-clock end of the rest; shown as "Ends HH:MM"
 *   workoutName   title context, optional
 *   exerciseName  appended to the body, optional
 *
 * Android-only (iOS ongoing notifications need Live Activities).
 */
export async function presentRestTimerNotification({
  endsAtMs, workoutName, exerciseName,
} = {}) {
  if (Platform.OS !== 'android') return;
  try {
    await ensureRestChannel();
    const title = workoutName ? `Resting · ${workoutName}` : 'Resting';
    const endLabel = formatEndClock(endsAtMs);
    const parts = [];
    if (endLabel) parts.push(`Ends ${endLabel}`);
    if (exerciseName) parts.push(exerciseName);
    const body = parts.length ? parts.join('  ·  ') : 'Rest in progress';
    await Notifications.scheduleNotificationAsync({
      identifier: REST_NOTIF_ID,
      content: {
        title,
        body,
        data: { type: 'rest_timer' },
        categoryIdentifier: REST_TIMER_CATEGORY_ID,
        sticky: true,
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        sound: null,
      },
      trigger: null, // immediate; re-calling replaces the existing one
    });
  } catch (_) { /* never break the rest flow on a notif failure */ }
}

/**
 * Dismiss the live rest-timer notification. Call when the rest ends, is
 * skipped, or the workout stops. Safe to call when nothing is showing.
 */
export async function dismissRestTimerNotification() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.dismissNotificationAsync(REST_NOTIF_ID);
    await Notifications.cancelScheduledNotificationAsync(REST_NOTIF_ID).catch(() => {});
  } catch (_) { /* tolerate */ }
}
