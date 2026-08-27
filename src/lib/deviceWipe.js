/**
 * deviceWipe.js
 *
 * Fail-closed wipe of the two device stores that sign-out clears outside
 * SQLite: AsyncStorage and the SecureStore auth tokens.
 *
 * WHY THIS EXISTS (P1 cross-account isolation, adversarial audit 2026-08-26).
 *
 * The SQLite half of sign-out was already fail-closed (D33, 2026-07-11):
 * wipeAllUserDataWithRetry retries, verifies, and sign-out refuses to proceed
 * unless the device is verifiably clean. The other two stores were not. Both
 * were best-effort:
 *
 *     try { await AsyncStorage.clear(); }
 *     catch (e) { log.logError(...); }        // and then carry on
 *
 * so a failed clear was logged and stepped past, and sign-out still returned
 * ok. Account B could then sign in on a device still holding account A's
 * cached tier, trial state, entitlement-verified timestamp, consent cache,
 * notification preferences and error-log ring buffer. A failed SecureStore
 * delete is worse in kind: A's refresh token survives, and a later
 * restoreSession can revive A's session under B's hands.
 *
 * The product law from the audit is unambiguous, so this module makes the
 * non-SQLite stores obey it too:
 *
 *     WIPE VERIFIED CLEAN  -> the next account may activate
 *     FAILED OR UNKNOWN    -> the next account MUST NOT activate
 *
 * "Unknown" is the important half. A read that throws tells us nothing about
 * whether residue exists, so it is treated as residue, never as absence. This
 * is the same ERROR-IS-NOT-EMPTY rule the audit applies to sync.
 *
 * SHAPE. Deliberately mirrors wipeAllUserDataWithRetry: bounded retry, then a
 * verify pass that can still let sign-out through if the device turns out to be
 * clean despite the throws. That last part matters. The D33 ruling exists
 * because a strict fail-closed rule with no verify pass produced a dead end
 * where one spurious throw blocked sign-out forever, which is its own kind of
 * user harm.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError, logWarn, logInfo } from './errorLog';

/**
 * Keys allowed to remain after a wipe. Empty by deliberate founder direction:
 * "signing out should leave nothing behind". Kept as a named constant rather
 * than an inline `length === 0` so that if a genuinely device-scoped key is
 * ever introduced, the exemption has to be written down here and reviewed,
 * instead of being smuggled in as a loosened comparison.
 */
export const KEYS_ALLOWED_TO_SURVIVE_SIGN_OUT = [];

function residualKeys(keys) {
  return (keys ?? []).filter((k) => !KEYS_ALLOWED_TO_SURVIVE_SIGN_OUT.includes(k));
}

/**
 * Clear AsyncStorage and prove it is empty.
 *
 * @returns {Promise<{ok: boolean, step?: string, residueCount?: number}>}
 */
export async function wipeAsyncStorageWithRetry({ attempts = 3, delaysMs = [300, 1000] } = {}) {
  let lastErr = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await AsyncStorage.clear();
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      logError('deviceWipe.asyncStorage.clear', e, { attempt: i + 1, attempts });
      if (i < attempts - 1) {
        const wait = delaysMs[Math.min(i, delaysMs.length - 1)] ?? 0;
        if (wait > 0) await new Promise((resolve) => { setTimeout(resolve, wait); });
      }
    }
  }

  // Verify rather than trust. A clear() that resolved can still have left rows
  // behind on a wedged store, and a clear() that threw may nonetheless have
  // completed, which is the case the D33 verify pass exists to let through.
  let keys;
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch (e) {
    // Cannot read, so cannot claim clean. Unknown is residue.
    logError('deviceWipe.asyncStorage.verify', e, {});
    return { ok: false, step: 'async_storage_verify_unreadable' };
  }

  const residue = residualKeys(keys);
  if (residue.length === 0) {
    if (lastErr) {
      logWarn('deviceWipe.asyncStorage.verifiedClean',
        'clear threw but the store is verifiably empty; sign-out may proceed', {});
    } else {
      logInfo('deviceWipe.asyncStorage.ok', 'cleared');
    }
    return { ok: true, verifiedClean: !!lastErr };
  }
  // Never log the key names: they are user-scoped and this trail is shareable.
  logError('deviceWipe.asyncStorage.residue',
    new Error(`AsyncStorage still holds ${residue.length} keys after wipe`), {
      residueCount: residue.length,
    });
  return { ok: false, step: 'async_storage_residue', residueCount: residue.length };
}

/**
 * Delete the Supabase auth tokens and prove they are gone.
 *
 * A surviving refresh token is the most dangerous single residue on the device,
 * because it does not merely leak data, it can re-authenticate the previous
 * account.
 *
 * @param {{projectRef?: string|null}} opts
 * @returns {Promise<{ok: boolean, step?: string}>}
 */
export async function wipeAuthTokensWithRetry({ projectRef } = {}, { attempts = 3, delaysMs = [300, 1000] } = {}) {
  let SecureStore;
  try {
    // eslint-disable-next-line global-require
    SecureStore = require('expo-secure-store');
  } catch (e) {
    // No module means no SecureStore residue is possible on this platform.
    logWarn('deviceWipe.secureStore.unavailable', e?.message ?? 'unknown', {});
    return { ok: true };
  }

  const keys = ['supabase.auth.token'];
  if (projectRef) keys.unshift(`sb-${projectRef}-auth-token`);

  for (const key of keys) {
    let lastErr = null;
    for (let i = 0; i < attempts; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await SecureStore.deleteItemAsync(key);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        logError('deviceWipe.secureStore.delete', e, { attempt: i + 1, attempts });
        if (i < attempts - 1) {
          const wait = delaysMs[Math.min(i, delaysMs.length - 1)] ?? 0;
          // eslint-disable-next-line no-await-in-loop
          if (wait > 0) await new Promise((resolve) => { setTimeout(resolve, wait); });
        }
      }
    }

    // Read back. A delete that resolved is not proof, and a delete that threw
    // is not proof of failure either.
    let stillThere;
    try {
      // eslint-disable-next-line no-await-in-loop
      stillThere = await SecureStore.getItemAsync(key);
    } catch (e) {
      // On iOS a locked keychain throws here. We cannot prove the token is
      // gone, so we must not say it is.
      logError('deviceWipe.secureStore.verify', e, {});
      return { ok: false, step: 'auth_token_verify_unreadable' };
    }
    if (stillThere != null) {
      logError('deviceWipe.secureStore.residue',
        new Error('auth token still present after delete'), {});
      return { ok: false, step: 'auth_token_residue' };
    }
    if (lastErr) {
      logWarn('deviceWipe.secureStore.verifiedClean',
        'delete threw but the token is verifiably gone; sign-out may proceed', {});
    }
  }
  return { ok: true };
}
