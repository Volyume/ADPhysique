/**
 * Background keep-alive — keeps the app's process running while the phone is
 * locked during WHOOP connect/reconnect and stored-history sync.
 *
 * Android suspends background apps (Doze), which kills the BLE link — the reason
 * live diagnostics can stop updating. The only first-party Expo mechanism to prevent that is a
 * foreground service, and Expo exposes one via expo-location. So we run a
 * MINIMAL, lowest-accuracy location foreground service purely as a keep-alive:
 * its job is the persistent notification that stops Android suspending us, not the
 * location data (which we ignore). This mirrors WHOOP's own
 * `connectedDevice|location` foreground service.
 *
 * Trade-offs (surfaced to the user): a persistent notification while active,
 * location permission, notification permission on Android 13+, and extra battery.
 *
 * iOS keeps BLE alive via the bluetooth-central background mode + state
 * restoration (see whoopBle), so this is primarily for Android.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { PermissionsAndroid, Platform } from 'react-native';

const TASK = 'volyume-pulse-keepalive';

// The task is a no-op: the foreground SERVICE is what keeps us alive, not the work.
TaskManager.defineTask(TASK, async () => {
  // intentionally empty
});

let running = false;

export async function startKeepAlive(): Promise<boolean> {
  if (running) return true;
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') return false;
    await requestBackgroundPermission();
    await requestNotificationPermission();
    if (await TaskManager.isTaskRegisteredAsync(TASK)) {
      running = true;
      return true;
    }
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.Lowest,
      timeInterval: 300000, // 5 min — we don't need the data, just the service
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: false,
      foregroundService: {
        notificationTitle: 'VOLYUME Pulse',
        notificationBody: 'Keeping WHOOP sync running in the background',
        notificationColor: '#F59E0B',
      },
    });
    running = true;
    return true;
  } catch {
    return false;
  }
}

async function requestBackgroundPermission(): Promise<boolean> {
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    return bg.status === 'granted';
  } catch {
    // Some Android builds send users to Settings or reject the prompt. The
    // foreground service can still protect sync while the app remains foreground.
    return true;
  }
}

async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if ((Platform.Version as number) < 33) return;
  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
}

export async function stopKeepAlive(): Promise<void> {
  running = false;
  try {
    if (await TaskManager.isTaskRegisteredAsync(TASK)) {
      await Location.stopLocationUpdatesAsync(TASK);
    }
  } catch {
    // already stopped
  }
}

export function isKeepAliveRunning(): boolean {
  return running;
}
