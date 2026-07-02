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
 * Known trade-off, recorded for the founder's device walk: the chronometer
 * notification does not carry the four category action buttons the JS sticky
 * has; for short rests the shade shows a live countdown without +15s/skip.
 * Rests longer than the window keep the sticky-with-buttons path unchanged.
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
