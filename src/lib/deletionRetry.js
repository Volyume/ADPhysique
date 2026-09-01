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
 *     success (and tells the user honestly that credential removal
 *     finishes only if they sign in once more with the same identity);
 *   - RootNavigator's auth listener AWAITS retryPendingAuthDeletion at the
 *     top of the sign-in pipeline (Wave-3 review fix: it used to fire
 *     alongside the restore flow and could silently erase a just-restored
 *     account mid-session). While a marker exists for the uid, the sign-in
 *     never proceeds into restore/sync: the navigator signs the session
 *     out with a calm explanation whether the retry succeeded or not.
 *
 * Boot retries are best-effort. Establishing the retry record during the
 * destructive deletion flow is not: the caller must prove at least one
 * durable server/device backstop before it signs out and wipes local state.
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
    const key = deletionAuthPendingKey(userId);
    const existing = await AsyncStorage.getItem(key);
    if (typeof existing === 'string' && existing.length > 0) return true;
    const marker = String(Date.now());
    await AsyncStorage.setItem(key, marker);
    return (await AsyncStorage.getItem(key)) === marker;
  } catch (e) {
    logError('deletionRetry.mark', e, { userId });
    return false;
  }
}

/**
 * Attempt both independent durable retry channels. Supabase clients resolve
 * many failures as `{ error }`, so a fulfilled promise alone is never counted
 * as a server record.
 */
export async function establishAuthDeletionBackstop(
  userId,
  { recordServer, markLocal = markAuthDeletionPending } = {},
) {
  let serverRecorded = false;
  let serverError = null;
  try {
    if (typeof recordServer !== 'function') throw new Error('server deletion backstop unavailable');
    const result = await recordServer();
    if (result?.error) throw result.error;
    serverRecorded = true;
  } catch (error) {
    serverError = error;
  }

  let localRecorded = false;
  let localError = null;
  try {
    localRecorded = (await markLocal(userId)) === true;
    if (!localRecorded) localError = new Error('device deletion marker was not durably verified');
  } catch (error) {
    localError = error;
  }
  return {
    durable: serverRecorded || localRecorded,
    serverRecorded,
    localRecorded,
    serverError,
    localError,
  };
}

/** Remove every AsyncStorage key except an already-durable retry marker. */
export async function clearDeletedAccountStorage(userId, preserveAuthDeletionMarker) {
  if (!preserveAuthDeletionMarker) {
    await AsyncStorage.clear();
    return true;
  }
  const keep = deletionAuthPendingKey(userId);
  const keys = await AsyncStorage.getAllKeys();
  const remove = keys.filter((key) => key !== keep);
  if (remove.length) await AsyncStorage.multiRemove(remove);
  return typeof (await AsyncStorage.getItem(keep)) === 'string';
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
 * @returns {Promise<{ attempted: boolean, ok?: boolean, pending: boolean }>}
 *   `pending` is true whenever a marker for this uid still stands after the
 *   call (failed attempt, or the once-per-launch guard blocked a retry).
 *   Callers treat pending as "this account's deletion is unfinished: do not
 *   proceed into the session".
 */
export async function retryPendingAuthDeletion(userId, { client } = {}) {
  if (!userId) return { attempted: false, pending: false };
  let marker = null;
  try { marker = await AsyncStorage.getItem(deletionAuthPendingKey(userId)); }
  catch (_) { return { attempted: false, pending: false }; }
  if (!marker) return { attempted: false, pending: false };
  if (_attemptedThisLaunch) return { attempted: false, pending: true };
  _attemptedThisLaunch = true;
  try {
    let sb = client;
    if (!sb) {
      // Lazy require: this module is reached from the boot path and must
      // not add supabase to every importer's module graph.
      // eslint-disable-next-line global-require
      sb = require('./supabase').getSupabaseClient();
    }
    if (!sb) return { attempted: false, pending: true };
    const result = await sb.functions.invoke('delete-account', {
      body: { reason: 'auth_removal_retry', app_version: null, platform: Platform.OS },
    });
    if (result?.error) {
      logError('deletionRetry.invoke', result.error, { userId });
      return { attempted: true, ok: false, pending: true };
    }
    await clearAuthDeletionPending(userId);
    logInfo('deletionRetry.completed', 'pending auth-row deletion completed', { userId });
    return { attempted: true, ok: true, pending: false };
  } catch (e) {
    logError('deletionRetry.retry', e, { userId });
    return { attempted: true, ok: false, pending: true };
  }
}
