/**
 * notifications/pushToken.js
 *
 * Remote-push token lifecycle. Backs the Expo Push provider in
 * NOTIFICATIONS_LOCKED.md. Local scheduled notifications (scheduler.js)
 * do NOT need any of this; this module exists only so the server can
 * deliver pushes the device can't schedule for itself (subscription
 * payment failure, fired by the Play Billing RTDN webhook).
 *
 * Lifecycle:
 *   - registerPushToken(userId): called after sign-in (and on app
 *     launch for an already-signed-in user). Obtains the Expo push
 *     token and upserts a device_push_tokens row (migration 053).
 *   - unregisterPushToken(userId): called on sign-out, BEFORE local
 *     wipe, so the row for THIS device stops receiving server pushes.
 *
 * Hard requirements, each of which makes the module no-op rather than
 * throw when unmet:
 *   - not web (Expo push tokens are a native concern)
 *   - notification permission granted
 *   - an EAS projectId in app.json under extra.eas.projectId. Without
 *     it getExpoPushTokenAsync cannot resolve a token. The project has
 *     no projectId at time of writing, so until the founder adds one
 *     this module logs once and no-ops; local notifications are
 *     unaffected. See supabase/README.md founder-action queue.
 *
 * The token is cached in AsyncStorage under @volyume_expo_push_token
 * (the same key sync.js already excludes from preference sync, because
 * tokens are device-bound and must never sync across devices).
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '../supabase';
import { logWarn } from '../errorLog';
import { getNotificationPermissionStatus } from './permissions';

export const PUSH_TOKEN_KEY = '@volyume_expo_push_token';

let _warnedNoProjectId = false;

/**
 * Read the EAS projectId from app config. Returns null when absent.
 * expo-constants is required lazily so this module stays importable in
 * the node test env (where the native module isn't present).
 */
function getProjectId() {
  try {
    // eslint-disable-next-line global-require
    const Constants = require('expo-constants').default;
    return (
      Constants?.expoConfig?.extra?.eas?.projectId
      ?? Constants?.easConfig?.projectId
      ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Obtain the Expo push token for this device, or null if it can't be
 * obtained (web, permission denied, no projectId, offline, or the
 * Expo push service rejects the request). Never throws.
 */
export async function getExpoPushToken() {
  if (Platform.OS === 'web') return null;
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return null;
  const projectId = getProjectId();
  if (!projectId) {
    if (!_warnedNoProjectId) {
      _warnedNoProjectId = true;
      logWarn(
        'notifications.pushToken.noProjectId',
        'extra.eas.projectId missing in app.json; remote push disabled. Local notifications still work.',
      );
    }
    return null;
  }
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data ?? null;
  } catch (e) {
    logWarn('notifications.pushToken.fetchFailed', e?.message ?? 'unknown');
    return null;
  }
}

/**
 * Register this device's push token for `userId`. Idempotent: re-runs
 * upsert the same (user_id, token) row, which the migration-053 trigger
 * touches to keep last_seen_at fresh. No-ops without a token or client.
 *
 * @returns {Promise<boolean>} true if a row was written.
 */
export async function registerPushToken(userId) {
  if (!userId) return false;
  const token = await getExpoPushToken();
  if (!token) return false;

  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb
      .from('device_push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        },
        { onConflict: 'user_id,expo_push_token' },
      );
    if (error) {
      logWarn('notifications.pushToken.register', error.message);
      return false;
    }
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => {});
    return true;
  } catch (e) {
    logWarn('notifications.pushToken.register', e?.message ?? 'unknown');
    return false;
  }
}

/**
 * Remove this device's push-token row for `userId` so it stops
 * receiving server pushes. Called on sign-out BEFORE the local wipe.
 * Deletes the cloud row for the cached token only (this device), never
 * the user's other devices. No-ops cleanly when there's nothing cached.
 *
 * @returns {Promise<boolean>} true if a delete was attempted cleanly.
 */
export async function unregisterPushToken(userId) {
  if (!userId) return false;
  let token = null;
  try { token = await AsyncStorage.getItem(PUSH_TOKEN_KEY); } catch {}
  // Clear the cache regardless; a stale cached token must not linger
  // into the next account on a shared device.
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
  if (!token) return false;

  const sb = getSupabaseClient();
  if (!sb) return false;
  try {
    const { error } = await sb
      .from('device_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('expo_push_token', token);
    if (error) {
      logWarn('notifications.pushToken.unregister', error.message);
      return false;
    }
    return true;
  } catch (e) {
    logWarn('notifications.pushToken.unregister', e?.message ?? 'unknown');
    return false;
  }
}
