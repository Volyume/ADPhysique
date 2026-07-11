/**
 * Android BLE keep-alive.
 *
 * The native service keeps the app process eligible for Android's connected
 * device foreground-service exemption. It does not access location. Workout
 * GPS remains in bgLocation.ts and continues to use expo-location there.
 *
 * iOS keeps BLE alive through bluetooth-central and state restoration, so this
 * service is intentionally a no-op on iOS.
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

type NativeKeepAlive = {
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  isRunning: () => Promise<boolean>;
};

const nativeKeepAlive = NativeModules.VolyumeKeepAlive as NativeKeepAlive | undefined;

let running = false;
let startPromise: Promise<boolean> | null = null;
let stopPromise: Promise<void> | null = null;

export async function startKeepAlive(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (!nativeKeepAlive) return false;
  if (stopPromise) {
    await stopPromise;
    return startKeepAlive();
  }
  if (running) return true;
  if (startPromise) return startPromise;

  const pendingStart = (async (): Promise<boolean> => {
    try {
      await requestNotificationPermission();
      const started = await nativeKeepAlive.start();
      running = started;
      return started;
    } catch {
      running = false;
      return false;
    } finally {
      startPromise = null;
    }
  })();
  startPromise = pendingStart;
  return pendingStart;
}

async function requestNotificationPermission(): Promise<void> {
  if ((Platform.Version as number) < 33) return;
  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
}

export async function stopKeepAlive(): Promise<void> {
  if (Platform.OS !== 'android' || !nativeKeepAlive) {
    running = false;
    return;
  }
  if (stopPromise) return stopPromise;

  const pendingStart = startPromise;
  const pendingStop = (async (): Promise<void> => {
    await pendingStart?.catch(() => false);
    try {
      await nativeKeepAlive.stop();
    } catch {
      // The service may already have been stopped by Android.
    } finally {
      running = false;
    }
  })();
  stopPromise = pendingStop;
  try {
    await pendingStop;
  } finally {
    stopPromise = null;
  }
}

export function isKeepAliveRunning(): boolean {
  return Platform.OS !== 'android' || running;
}

/**
 * Kept as a compatibility hook for the sync supervisor. The native service
 * protects the process; it does not run JavaScript callbacks from a location
 * task, so there is no background heartbeat to register here anymore.
 */
export function setKeepAliveHeartbeat(_listener: (() => void) | null): void {}
