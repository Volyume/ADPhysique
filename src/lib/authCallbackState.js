/**
 * One-shot state for legacy implicit email callbacks.
 *
 * `volyume://` has no trustworthy sender identity. A token-bearing callback is
 * therefore accepted only when this app has just started an email flow AND the
 * server-validated token belongs to the same normalised email address. The
 * identity comparison is performed by authDeepLink.js before setSession.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { logError, logInfo } from './errorLog';

const STATE_KEY = 'volyume.authCallbackState';
const KEY_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
const EMAIL_FLOW_KINDS = new Set(['signup', 'recovery']);

export const AUTH_FLOW_WINDOW_MS = 10 * 60 * 1000;

export function normalizeAuthEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function randomNonce() {
  const bytes = await Crypto.getRandomBytesAsync(24);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Records a bound email flow. Storage/entropy failures fail closed. */
export async function beginAuthFlow(kind, expectedEmail) {
  const email = normalizeAuthEmail(expectedEmail);
  if (!EMAIL_FLOW_KINDS.has(kind) || !email) {
    logError('auth.callbackState.invalidBegin', new Error('implicit auth flow was not identity-bound'), { kind });
    return null;
  }
  try {
    const nonce = await randomNonce();
    await SecureStore.setItemAsync(
      STATE_KEY,
      JSON.stringify({ nonce, kind, expectedEmail: email, at: Date.now() }),
      KEY_OPTS,
    );
    return nonce;
  } catch (e) {
    logError('auth.callbackState.beginFailed', e, { kind });
    return null;
  }
}

async function deleteAndVerifyState() {
  try {
    await SecureStore.deleteItemAsync(STATE_KEY, KEY_OPTS);
    const residue = await SecureStore.getItemAsync(STATE_KEY, KEY_OPTS);
    return residue == null;
  } catch (e) {
    logError('auth.callbackState.deleteFailed', e, {});
    return false;
  }
}

// Serialise consumption. Two callbacks delivered in the same JS turn must not
// both read the same one-shot value before either delete completes.
let consumeTail = Promise.resolve();

async function consumeAuthFlowOnce(nonceFromLink) {
  let raw = null;
  try {
    raw = await SecureStore.getItemAsync(STATE_KEY, KEY_OPTS);
  } catch (e) {
    logError('auth.callbackState.readFailed', e, {});
    return { ok: false, reason: 'state_unreadable' };
  }
  if (!raw) return { ok: false, reason: 'no_flow_started' };

  // Delete and verify before any decision can authorise a session. A keychain
  // delete that silently fails is not a consumed nonce and must fail closed.
  if (!(await deleteAndVerifyState())) return { ok: false, reason: 'state_not_consumed' };

  let state = null;
  try { state = JSON.parse(raw); } catch (_) { return { ok: false, reason: 'state_malformed' }; }

  const at = Number(state?.at);
  if (!Number.isFinite(at)) return { ok: false, reason: 'state_malformed' };
  if (Date.now() - at > AUTH_FLOW_WINDOW_MS || Date.now() < at) {
    return { ok: false, reason: 'expired' };
  }
  if (!EMAIL_FLOW_KINDS.has(state?.kind)) return { ok: false, reason: 'wrong_flow_kind' };
  const expectedEmail = normalizeAuthEmail(state?.expectedEmail);
  if (!expectedEmail) return { ok: false, reason: 'identity_unbound' };
  if (nonceFromLink != null && nonceFromLink !== state?.nonce) {
    return { ok: false, reason: 'state_mismatch' };
  }

  logInfo('auth.callbackState.accepted', 'implicit callback matched a bound app-initiated flow', {
    kind: state.kind,
    hadNonce: nonceFromLink != null,
  });
  return { ok: true, reason: 'ok', kind: state.kind, expectedEmail };
}

export function consumeAuthFlow(nonceFromLink) {
  const run = consumeTail.then(() => consumeAuthFlowOnce(nonceFromLink));
  consumeTail = run.catch(() => {});
  return run;
}

/** Drops pending state and reports whether absence was verified. */
export async function clearAuthFlow() {
  return deleteAndVerifyState();
}

export function _resetAuthFlowQueueForTests() {
  consumeTail = Promise.resolve();
}
