import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

type StartOptions = {
  exerciseName: string;
  endTimeMs: number;
  channelId?: string;
  deepLink?: string;
};

type NativeModuleShape = {
  start(options: StartOptions): Promise<boolean>;
  cancel(): Promise<void>;
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
