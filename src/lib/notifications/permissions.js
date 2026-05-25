/**
 * notifications/permissions.js
 *
 * Permission helpers for OS notification access. Pure expo-notifications
 * wrappers; the project-wide rule is "ask once at onboarding screen 11",
 * with You -> Notifications offering an "Open system settings" CTA for
 * users who later want to re-enable.
 *
 * No quiet hours, no categories, no telemetry here. Those layers wrap
 * permission state from outside.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Request notification permissions. Returns 'granted' | 'denied' |
 * 'undetermined'. Sound is requested off by default -- the in-app
 * surfaces drive every sound or haptic; OS notification audio is not
 * part of the design.
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return 'granted';
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: false,
      },
    });
    return status;
  } catch {
    return 'undetermined';
  }
}

/**
 * Returns the current permission status without prompting.
 */
export async function getNotificationPermissionStatus() {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'undetermined';
  }
}
