/**
 * notifications/restForeground.js — the E6A shortService rest-window
 * orchestration (approved 2026-07-02; evidence in
 * docs/rest-timer-android-survival-DRAFT.md §2a).
 *
 * While a rest that FITS the Android shortService window (~3 minutes) is
 * running, the native WorkoutForegroundService hosts a chronometer
 * notification instead of the per-tick JS sticky. That buys, for the window:
 *   - a countdown that stays LIVE on the lock screen while the app is
 *     backgrounded (the JS sticky froze at its last value),
 *   - protection from OS reap mid-rest,
 *   - JS execution while backgrounded, so the 3-2-1 end cues actually fire.
 *
 * Update (2026-07-10, D34): the chronometer notification now DOES carry timer
 * controls — a "+15s" and a "Skip rest" action button, added natively in
 * WorkoutForegroundService.buildRestNotification. Their taps route back into
 * the service via getService PendingIntents (never getActivity, so the app is
 * never foregrounded — mirroring the JS sticky's opensAppToForeground:false),
 * are emitted to JS through the module's onRestTimerAction event, and land in
 * the SAME handleRestTimerAction seam the expo sticky uses (store guards +
 * clampRestDelta floor + stale-tap no-op). +15 extends the chronometer end
 * time natively (the JS re-anchor is background-blocked) and the in-app timer
 * via the store; Skip stops the rest in both places. The chronometer path now
 * exposes two of the sticky's controls (not Log set / Add exercise, which
 * open the app by design). Rests longer than the window keep the full
 * sticky-with-five-buttons path unchanged.
 *
 * Everything here is best-effort: the in-app timer, the end-of-rest alarm
 * (restEnd.js) and the session snapshot never depend on this layer.
 */
import { Platform } from 'react-native';

// The service self-stops at min(rest end, 170 s) and implements onTimeout(),
// but the JS gate keeps us from ever STARTING a foreground for a rest the
// window cannot cover end-to-end — a countdown that dies mid-rest reads as a
// broken timer, which is worse than the frozen sticky.
export const REST_FOREGROUND_MAX_MS = 170_000;

function getRestTimerLive() {
  try {
    // eslint-disable-next-line global-require
    return require('rest-timer-live');
  } catch (_) { return null; }
}

/**
 * Whether this rest should ride the shortService host: Android, native
 * module with the E6A methods present (older installed builds return false
 * and keep the sticky path), and the remaining window fits.
 */
export function shouldUseRestForeground(endsAtMs, nowMs = Date.now()) {
  if (Platform.OS !== 'android') return false;
  if (!(Number(endsAtMs) > nowMs)) return false;
  if (endsAtMs - nowMs > REST_FOREGROUND_MAX_MS) return false;
  const rtl = getRestTimerLive();
  return !!rtl?.isRestForegroundAvailable?.();
}

/**
 * Start (or, on a ±15 s adjust, update) the rest-window foreground service.
 * Resolves true when the native side accepted the start; false means the
 * caller keeps the JS sticky path for this rest.
 */
export async function startRestForeground({ endsAtMs, exerciseName } = {}) {
  if (!shouldUseRestForeground(endsAtMs)) return false;
  const rtl = getRestTimerLive();
  try {
    return !!(await rtl.startRestForeground({
      endTimeMs: endsAtMs,
      exerciseName: exerciseName || 'Rest timer',
      channelId: 'rest-timer',
      deepLink: 'volyume://active-workout',
    }));
  } catch (_) {
    return false;
  }
}

/** Stop the rest-window foreground service. Safe when nothing is running. */
export async function stopRestForeground() {
  const rtl = getRestTimerLive();
  try { await rtl?.stopRestForeground?.(); } catch (_) { /* best-effort */ }
}

/**
 * Founder device order 2026-08-18 ("the resting notification never updates
 * the time"): rests LONGER than the shortService window used to fall back
 * to the static "Ends HH:MM" sticky, which on a real device reads as a
 * frozen timer. A ticking countdown does not actually need the foreground
 * service - the service only buys background JS + reap protection - so the
 * long-rest path now posts the module's PLAIN chronometer notification
 * (NotificationManager + setUsesChronometer/setChronometerCountDown, the
 * OS renders the tick itself with the app fully suspended). No window cap
 * applies. Resolves false when the module is unavailable (Expo Go / iOS),
 * in which case the caller keeps the static sticky as the last resort.
 */
export async function startRestChronometerNotification({ endsAtMs, exerciseName } = {}) {
  if (Platform.OS !== 'android') return false;
  if (!(Number(endsAtMs) > Date.now())) return false;
  const rtl = getRestTimerLive();
  if (typeof rtl?.start !== 'function') return false;
  try {
    return !!(await rtl.start({
      endTimeMs: endsAtMs,
      exerciseName: exerciseName || 'Rest timer',
      channelId: 'rest-timer',
      deepLink: 'volyume://active-workout',
    }));
  } catch (_) {
    return false;
  }
}

/** Cancel the plain chronometer notification. Safe when nothing is showing. */
export async function cancelRestChronometerNotification() {
  const rtl = getRestTimerLive();
  try { await rtl?.cancel?.(); } catch (_) { /* best-effort */ }
}

/**
 * E6A exact alarms: whether the end-of-rest alarm can be second-accurate.
 * expo-notifications auto-upgrades to setExactAndAllowWhileIdle the moment
 * the special app access is granted; nothing in restEnd.js changes. True on
 * iOS / Android 11 and lower / builds without the native method.
 */
export async function canScheduleExactAlarms() {
  const rtl = getRestTimerLive();
  if (typeof rtl?.canScheduleExactAlarms !== 'function') return true;
  try { return !!(await rtl.canScheduleExactAlarms()); } catch (_) { return true; }
}

/** Open the system grant screen for exact alarms (Android 12+). */
export async function requestExactAlarmAccess() {
  const rtl = getRestTimerLive();
  if (typeof rtl?.requestExactAlarmAccess !== 'function') return false;
  try { return !!(await rtl.requestExactAlarmAccess()); } catch (_) { return false; }
}

/**
 * Founder order 2026-08-18: the countdown cues must sound with the app
 * minimised, on ANY rest length. JS timers cannot do that - Android freezes
 * a backgrounded process, and this app runs no long-lived foreground service
 * (the rest shortService covers ~170s; the `health` type was rejected for
 * needing a Play declaration - see the native AndroidManifest). These hand
 * the cue times to AlarmManager, which plays the same cached beeps natively.
 *
 * Scheduled ONLY while the app is backgrounded and cancelled the moment it
 * returns, so a cue is never heard twice. Muted users schedule nothing.
 */
export async function scheduleBackgroundRestCues(endsAtMs) {
  if (Platform.OS !== 'android') return false;
  if (!(Number(endsAtMs) > Date.now())) return false;
  try {
    // eslint-disable-next-line global-require
    if (require('../../store/useAppStore').default.getState().restSoundsEnabled === false) {
      return false;
    }
  } catch (_) { /* unreadable pref: keep the default-on behaviour */ }
  const rtl = getRestTimerLive();
  try {
    return !!(await rtl?.scheduleRestCues?.({ endTimeMs: Number(endsAtMs) }));
  } catch (_) {
    return false;
  }
}

/** Cancel any OS-scheduled rest cues. Safe when none are set. */
export async function cancelBackgroundRestCues() {
  if (Platform.OS !== 'android') return;
  const rtl = getRestTimerLive();
  try { await rtl?.cancelRestCues?.(); } catch (_) { /* best-effort */ }
}
