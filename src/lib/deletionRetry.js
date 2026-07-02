/**
 * Account-deletion completion retry (audit SC-2, client leg).
 *
 * When the delete-account Edge Function is unreachable, the client falls
 * back to the delete_user_data RPC. The RPC wipes the user's public.*
 * rows but cannot reach auth.users (different schema, lacks rights), so
 * the sign-in credentials survive as a zombie auth record. Previously the
 * flow reported plain success and the zombie was never cleaned up.
 *
 * This module owns the device-local retry marker for that state:
 *   - useAccountActions writes the marker after an RPC-only fallback
 *     success (and tells the user honestly that credential removal is
 *     still pending);
 *   - RootNavigator's auth listener calls retryPendingAuthDeletion on the
 *     next authenticated launch or sign-in, which re-invokes the Edge
 *     Function once and clears the marker on success.
 *
 * Everything here is best-effort: a failure logs and returns; it never
 * throws into a boot path and never blocks sign-in.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logError, logInfo } from './errorLog';

export const DELETION_AUTH_PENDING_PREFIX = '@volyume_deletion_auth_pending_';

/**
 * PURE. AsyncStorage key for a user's pending-auth-deletion marker.
 * Keyed by uid so the retry can never fire against a different account.
 */
export function deletionAuthPendingKey(userId) {
  return `${DELETION_AUTH_PENDING_PREFIX}${userId}`;
}

/**
 * Persist the marker. Called AFTER the delete flow's AsyncStorage.clear()
 * so the marker survives to the next launch. Returns true on success.
 */
export async function markAuthDeletionPending(userId) {
  if (!userId) return false;
  try {
    await AsyncStorage.setItem(deletionAuthPendingKey(userId), String(Date.now()));
    return true;
  } catch (e) {
    logError('deletionRetry.mark', e, { userId });
    return false;
  }
}

export async function clearAuthDeletionPending(userId) {
  if (!userId) return;
  try { await AsyncStorage.removeItem(deletionAuthPendingKey(userId)); }
  catch (e) { logError('deletionRetry.clear', e, { userId }); }
}

// One attempt per JS lifetime: the seam fires on every auth-enter event
// and a failed Edge Function should not be hammered in a single session.
let _attemptedThisLaunch = false;

/** Test seam only. */
export function _resetRetryGuardForTests() {
  _attemptedThisLaunch = false;
}

/**
 * If this user has a pending-auth-deletion marker, re-invoke the
 * delete-account Edge Function once and clear the marker on success.
 *
 * @param {string} userId  the CURRENT session's user id (the marker is
 *   only honoured for the same uid, so another account signing in on
 *   this device can never trigger someone else's deletion).
 * @param {{ client?: object }} [deps]  injectable Supabase client for tests.
 * @returns {Promise<{ attempted: boolean, ok?: boolean }>}
 */
export async function retryPendingAuthDeletion(userId, { client } = {}) {
  if (!userId || _attemptedThisLaunch) return { attempted: false };
  let marker = null;
  try { marker = await AsyncStorage.getItem(deletionAuthPendingKey(userId)); }
  catch (_) { return { attempted: false }; }
  if (!marker) return { attempted: false };
  _attemptedThisLaunch = true;
  try {
    let sb = client;
    if (!sb) {
      // Lazy require: this module is reached from the boot path and must
      // not add supabase to every importer's module graph.
      // eslint-disable-next-line global-require
      sb = require('./supabase').getSupabaseClient();
    }
    if (!sb) return { attempted: false };
    const result = await sb.functions.invoke('delete-account', {
      body: { reason: 'auth_removal_retry', app_version: null, platform: Platform.OS },
    });
    if (result?.error) {
      logError('deletionRetry.invoke', result.error, { userId });
      return { attempted: true, ok: false };
    }
    await clearAuthDeletionPending(userId);
    logInfo('deletionRetry.completed', 'pending auth-row deletion completed', { userId });
    return { attempted: true, ok: true };
  } catch (e) {
    logError('deletionRetry.retry', e, { userId });
    return { attempted: true, ok: false };
  }
}
