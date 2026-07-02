import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

type StartOptions = {
  exerciseName: string;
  endTimeMs: number;
  channelId?: string;
  deepLink?: string;
};

type WorkoutForegroundOptions = {
  title: string;
  body: string;
  channelId?: string;
  deepLink?: string;
};

type RestForegroundOptions = {
  exerciseName?: string;
  endTimeMs: number;
  channelId?: string;
  deepLink?: string;
};

type NativeModuleShape = {
  start(options: StartOptions): Promise<boolean>;
  cancel(): Promise<void>;
  startWorkoutForeground?(options: WorkoutForegroundOptions): Promise<boolean>;
  stopWorkoutForeground?(): Promise<void>;
  startRestForeground?(options: RestForegroundOptions): Promise<boolean>;
  stopRestForeground?(): Promise<void>;
  canScheduleExactAlarms?(): Promise<boolean>;
  requestExactAlarmAccess?(): Promise<boolean>;
};

let nativeModule: NativeModuleShape | null = null;
try {
  nativeModule = requireNativeModule<NativeModuleShape>('RestTimerLive');
} catch (_e) {
  nativeModule = null;
}

/**
 * True only on Android with the live chronometer native module compiled in.
 * iOS and Expo Go return false; callers fall back to the standard notification.
 */
export function isAvailable(): boolean {
  return Platform.OS === 'android' && nativeModule !== null;
}

/**
 * Post a live, ticking countdown notification.
 *
 * The notification uses Android's built-in chronometer so the number counts
 * down on the lock screen and in the notification shade without the app
 * having to wake every second to update it.
 *
 * @returns true if the notification was posted, false if the native module
 *   is unavailable or the system rejected it (e.g. POST_NOTIFICATIONS denied).
 */
export async function start(options: StartOptions): Promise<boolean> {
  if (!isAvailable()) return false;
  try {
    return await nativeModule!.start(options);
  } catch (_e) {
    return false;
  }
}

/**
 * Cancel the live countdown notification. No-op if the module is unavailable
 * or no notification is currently posted.
 */
export async function cancel(): Promise<void> {
  if (!isAvailable()) return;
  try {
    await nativeModule!.cancel();
  } catch (_e) {
    // swallow — cancellation is best-effort
  }
}

/**
 * True when the foreground-service variant is available. Two reasons it
 * can be false even when isAvailable() is true:
 *   1. Older native module shipped without the methods (returns
 *      undefined from requireNativeModule), so we don't try to call
 *      them.
 *   2. iOS / Expo Go.
 */
export function isWorkoutForegroundAvailable(): boolean {
  return isAvailable() && typeof nativeModule?.startWorkoutForeground === 'function';
}

/**
 * Start (or update) the workout foreground service. Unlike the
 * standard NotificationManager sticky notification, this one is owned
 * by a service and survives a force-close.
 *
 * Calling repeatedly with new title / body updates the existing
 * notification body in place — no flicker, no re-vibrate, no
 * permission re-prompt.
 */
export async function startWorkoutForeground(options: WorkoutForegroundOptions): Promise<boolean> {
  if (!isWorkoutForegroundAvailable()) return false;
  try {
    return await nativeModule!.startWorkoutForeground!(options);
  } catch (_e) {
    return false;
  }
}

/**
 * Stop the workout foreground service and tear down its notification.
 * Best-effort; no-op when the module / service isn't running.
 */
export async function stopWorkoutForeground(): Promise<void> {
  if (!isWorkoutForegroundAvailable()) return;
  try {
    await nativeModule!.stopWorkoutForeground!();
  } catch (_e) { /* swallow */ }
}

/**
 * E6A: whether the shortService rest-window host is available (Android with
 * a native build carrying the new methods). Older installed builds return
 * false and callers keep the plain sticky-notification path.
 */
export function isRestForegroundAvailable(): boolean {
  return isAvailable() && typeof nativeModule?.startRestForeground === 'function';
}

/**
 * Start (or update) the shortService rest-window foreground service: a
 * native chronometer countdown that stays live while the app is
 * backgrounded, and keeps the process alive for the rest window. The caller
 * gates on the ~3-minute shortService window; the service self-stops at the
 * rest end and on the OS timeout regardless.
 */
export async function startRestForeground(options: RestForegroundOptions): Promise<boolean> {
  if (!isRestForegroundAvailable()) return false;
  try {
    return await nativeModule!.startRestForeground!(options);
  } catch (_e) {
    return false;
  }
}

/** Stop the rest-window foreground service. Best-effort. */
export async function stopRestForeground(): Promise<void> {
  if (!isRestForegroundAvailable()) return;
  try {
    await nativeModule!.stopRestForeground!();
  } catch (_e) { /* swallow */ }
}

/**
 * E6A: whether the app currently holds the SCHEDULE_EXACT_ALARM special app
 * access (Android 12+). True on iOS / older Android / missing module so
 * callers never prompt where the concept does not exist.
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || typeof nativeModule?.canScheduleExactAlarms !== 'function') return true;
  try {
    return await nativeModule.canScheduleExactAlarms();
  } catch (_e) {
    return true;
  }
}

/**
 * Open the system grant screen for exact alarms. Resolves true if the
 * screen was opened; the caller re-checks canScheduleExactAlarms() on
 * return (there is no result callback from the settings surface).
 */
export async function requestExactAlarmAccess(): Promise<boolean> {
  if (Platform.OS !== 'android' || typeof nativeModule?.requestExactAlarmAccess !== 'function') return false;
  try {
    return await nativeModule.requestExactAlarmAccess();
  } catch (_e) {
    return false;
  }
}
