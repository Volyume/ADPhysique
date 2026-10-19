/**
 * notifications/permissions.js
 *
 * Permission helpers for OS notification access. Pure expo-notifications
 * wrappers; the project-wide rule is "ask once at onboarding screen 11",
 * with You -> Notifications offering an "Open system settings" CTA for
 * users who later want to re-enable.
 *
 * No quiet hours, no categories here. Those layers wrap permission state
 * from outside. requestNotificationPermissions() DOES emit one activation-
 * funnel telemetry event on its own result (lead activation ruling,
 * 2026-09-03) so every caller is covered without threading userId through;
 * see _trackPermissionResult below.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Looked up lazily (never at module load) so a caller can require this
// module in a test environment that has no store/telemetry wired up.
// Mirrors the pattern in notifications/telemetry.js.
function _currentUserId() {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    return useAppStore.getState().user?.id ?? null;
  } catch {
    return null;
  }
}

// Counts/flags/small enums only, per the standing telemetry rule. `status`
// is normalised to the closed enum the catalogue declares; any value the OS
// might return that isn't one of the three expo-notifications statuses
// (in practice, the hardcoded 'denied' this module returns on web, where no
// real prompt happened) reports as 'unknown' rather than a misleading
// 'denied'. Fire-and-forget; never blocks the caller and never throws.
function _trackPermissionResult(status) {
  const userId = _currentUserId();
  if (!userId) return;
  try {
    const normalised = (status === 'granted' || status === 'denied' || status === 'undetermined')
      ? status
      : 'unknown';
    // eslint-disable-next-line global-require
    const { track } = require('../telemetry');
    track(userId, 'notification_permission_requested', { status: normalised }).catch(() => {});
  } catch (_) { /* best-effort telemetry */ }
}

// Growth telemetry (brief 2026-10-19): the answer to the system prompt as
// granted, denied, or blocked (denied and the system will not ask again).
// Sent only when the system was actually asked; an already-granted check is
// not an answer. Lazy require keeps this module free of import cycles.
function _trackPermissionOutcome(status, canAskAgain) {
  try {
    let outcome = null;
    if (status === 'granted') outcome = 'granted';
    else if (status === 'denied') outcome = canAskAgain === false ? 'blocked' : 'denied';
    if (!outcome) return;
    // eslint-disable-next-line global-require
    require('../telemetry/growth').trackNow('notification_permission_result', { outcome });
  } catch (_) { /* best-effort telemetry */ }
}

/**
 * Request notification permissions. Returns 'granted' | 'denied' |
 * 'undetermined'. Sound is requested off by default -- the in-app
 * surfaces drive every sound or haptic; OS notification audio is not
 * part of the design.
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    // No real prompt happens on web; telemetry says so honestly rather than
    // reporting a fabricated 'denied' outcome, while the return value is
    // unchanged for existing callers.
    _trackPermissionResult('unknown');
    return 'denied';
  }
  let result;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') {
      result = 'granted';
    } else {
      const answer = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: false,
        },
      });
      result = answer.status;
      _trackPermissionOutcome(answer.status, answer.canAskAgain);
    }
  } catch {
    result = 'undetermined';
  }
  _trackPermissionResult(result);
  return result;
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
