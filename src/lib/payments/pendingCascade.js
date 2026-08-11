/**
 * FQ-6.1 (D96, founder-approved 2026-08-10): the trial-grant retry queue.
 *
 * A transient failure of start_cascade at the Article 9 consent step used to
 * cost a brand-new user their 14-day trial permanently: the call was
 * fire-and-tolerate, nothing ever retried, and the consent screen's own
 * comment ("cascade catches up on next sync") described a catch-up that did
 * not exist. This module makes that comment true, in the exact shape the
 * consent architecture already uses (consent/pendingConsent.js: queue on
 * failure, flush inside the sync runner).
 *
 * Safety properties, per the ruling:
 *  - IDEMPOTENT: the retry calls the same start_cascade RPC, which no-ops
 *    server-side for already-started users, so no duplicate grant, no
 *    extension abuse, no repeated trial creation is possible from here.
 *  - NO LOCAL PRO INVENTION: nothing here touches the tier. Only the RPC's
 *    ok-path (inside cascade.startCascade) mirrors the server's answer down.
 *  - FAILURE vs INELIGIBILITY: only a NETWORK-shaped failure stays queued.
 *    A definitive server answer (including "not eligible") clears the queue,
 *    because retrying cannot change it and must not hammer the RPC.
 *  - Existing trial-abuse controls are untouched: eligibility is entirely
 *    the server's decision.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError, logInfo } from '../errorLog';

const PENDING_KEY_PFX = '@volyume_pending_cascade_';

// Connection-shaped failures, the same family authErrorCopy names (E-5).
const NETWORK_RE = /network request failed|network error|networkerror|failed to fetch|fetch failed|timed? ?out|offline|no internet|econnreset|econnrefused|econnaborted|enotfound|etimedout|unable to (connect|resolve)|connection (was |is )?(failed|refused|error|lost|unavailable)/i;

export function isNetworkShapedError(error) {
  const raw = String((error && typeof error === 'object' ? error.message : error) || '');
  return NETWORK_RE.test(raw);
}

export async function queuePendingCascade(userId, error = null) {
  if (!userId) return;
  // A definitive non-network answer is not retryable from the client.
  if (error != null && !isNetworkShapedError(error)) return;
  try {
    await AsyncStorage.setItem(PENDING_KEY_PFX + userId, JSON.stringify({ queuedAt: Date.now() }));
    logInfo('cascade.retry.queued', `uid=${userId}`);
  } catch (_) { /* best-effort: the flag is a retry aid, never a gate */ }
}

export async function hasPendingCascade(userId) {
  if (!userId) return false;
  try { return (await AsyncStorage.getItem(PENDING_KEY_PFX + userId)) != null; }
  catch (_) { return false; }
}

export async function clearPendingCascade(userId) {
  if (!userId) return;
  try { await AsyncStorage.removeItem(PENDING_KEY_PFX + userId); } catch (_) {}
}

/**
 * Retry the queued grant. Called from the sync runner beside
 * flushPendingConsent, so it runs on every sync trigger (foreground,
 * session restore, push) without its own scheduler. Resolves
 * { flushed: boolean }; never throws.
 */
export async function flushPendingCascade(userId) {
  if (!userId) return { flushed: false };
  if (!(await hasPendingCascade(userId))) return { flushed: false };
  try {
    // eslint-disable-next-line global-require
    const { startCascade } = require('./cascade');
    await startCascade();
    // A resolved round-trip - whatever the server decided - ends the retry:
    // the RPC is idempotent and its ok-path already mirrored any grant down.
    await clearPendingCascade(userId);
    logInfo('cascade.retry.flushed', `uid=${userId}`);
    return { flushed: true };
  } catch (e) {
    if (!isNetworkShapedError(e)) {
      // Definitive failure: retrying cannot change the answer.
      await clearPendingCascade(userId);
      logError('cascade.retry.definitive', e, { uid: userId });
      return { flushed: false };
    }
    // Still offline: keep the flag for the next sync trigger.
    return { flushed: false };
  }
}
