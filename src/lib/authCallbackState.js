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
const ADMISSION_KEY = 'volyume.authCallbackAdmission';
const KEY_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
const EMAIL_FLOW_KINDS = new Set(['signup', 'recovery']);
const FLOW_RECORD_VERSION = 2;
const NONCE_RE = /^[0-9a-f]{48}$/;
const INVALIDATED_STATE = JSON.stringify({ version: FLOW_RECORD_VERSION, invalidated: true });
const INVALIDATED_ADMISSION = JSON.stringify({ version: FLOW_RECORD_VERSION, invalidated: true });

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
    const record = JSON.stringify({
      version: FLOW_RECORD_VERSION,
      nonce,
      kind,
      expectedEmail: email,
      at: Date.now(),
      requireNonce: true,
    });
    await SecureStore.setItemAsync(
      STATE_KEY,
      record,
      KEY_OPTS,
    );
    // A resolved SecureStore write is not proof that the state landed. If the
    // callback URL is issued without a durable matching record, the legitimate
    // flow will fail later and a stale record could remain authoritative.
    const readBack = await SecureStore.getItemAsync(STATE_KEY, KEY_OPTS);
    if (readBack !== record) throw new Error('auth callback state write did not persist');
    return nonce;
  } catch (e) {
    logError('auth.callbackState.beginFailed', e, { kind });
    // Best effort is safe here because invalidation overwrites the old flow
    // before attempting deletion. A confirmed tombstone is non-authorising
    // even if the platform refuses to delete it.
    await invalidateAndDeleteState();
    return null;
  }
}

async function invalidateAndDeleteKey(key, tombstone, scope) {
  let invalidated = false;
  try {
    await SecureStore.setItemAsync(key, tombstone, KEY_OPTS);
    invalidated = await SecureStore.getItemAsync(key, KEY_OPTS) === tombstone;
  } catch (e) {
    logError(`${scope}.invalidateFailed`, e, {});
  }

  try { await SecureStore.deleteItemAsync(key, KEY_OPTS); } catch (e) {
    logError(`${scope}.deleteFailed`, e, {});
  }

  try {
    const residue = await SecureStore.getItemAsync(key, KEY_OPTS);
    return residue == null || (invalidated && residue === tombstone);
  } catch (e) {
    logError(`${scope}.deleteVerifyFailed`, e, {});
    // Once the tombstone was read back, a later delete failure cannot restore
    // the authorising record it replaced.
    return invalidated;
  }
}

async function invalidateAndDeleteState() {
  return invalidateAndDeleteKey(STATE_KEY, INVALIDATED_STATE, 'auth.callbackState');
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
  if (!(await invalidateAndDeleteState())) return { ok: false, reason: 'state_not_consumed' };

  let state = null;
  try { state = JSON.parse(raw); } catch (_) { return { ok: false, reason: 'state_malformed' }; }

  if (!NONCE_RE.test(state?.nonce ?? '')) return { ok: false, reason: 'state_malformed' };
  const at = Number(state?.at);
  if (!Number.isFinite(at)) return { ok: false, reason: 'state_malformed' };
  const now = Date.now();
  if (now - at > AUTH_FLOW_WINDOW_MS || now < at) {
    return { ok: false, reason: 'expired' };
  }
  if (!EMAIL_FLOW_KINDS.has(state?.kind)) return { ok: false, reason: 'wrong_flow_kind' };
  const expectedEmail = normalizeAuthEmail(state?.expectedEmail);
  if (!expectedEmail) return { ok: false, reason: 'identity_unbound' };
  // Version 2 records are emitted only by a build that puts the nonce in the
  // redirect URL, so a missing nonce is no longer a legitimate compatibility
  // case. Version-less records are accepted for one ten-minute upgrade window
  // so a confirmation initiated immediately before an app update can finish.
  if (state?.requireNonce === true && nonceFromLink == null) {
    return { ok: false, reason: 'state_missing' };
  }
  if (nonceFromLink != null && (!NONCE_RE.test(nonceFromLink) || nonceFromLink !== state?.nonce)) {
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

/**
 * Drops every pending callback capability at an account boundary and reports
 * whether both absences (or durable tombstones) were verified.
 */
export async function clearAuthFlow() {
  const stateCleared = await invalidateAndDeleteState();
  const admissionCleared = await clearAuthCallbackAdmission();
  return stateCleared && admissionCleared;
}

/**
 * Stages the identity that an exchange-style callback is allowed to publish.
 *
 * `verifyOtp()` installs its session before its promise resolves and can fire
 * `onAuthStateChange` synchronously. The handler's returned-user check is
 * therefore necessary but not sufficient: navigation needs this durable latch
 * before the exchange starts so the auth event cannot publish another user in
 * the intervening turn.
 */
export async function stageAuthCallbackAdmission(kind, expectedEmail) {
  const email = normalizeAuthEmail(expectedEmail);
  if (!EMAIL_FLOW_KINDS.has(kind) || !email) return false;
  try {
    const record = JSON.stringify({
      version: FLOW_RECORD_VERSION,
      kind,
      expectedEmail: email,
      at: Date.now(),
    });
    await SecureStore.setItemAsync(ADMISSION_KEY, record, KEY_OPTS);
    const readBack = await SecureStore.getItemAsync(ADMISSION_KEY, KEY_OPTS);
    if (readBack !== record) throw new Error('auth callback admission write did not persist');
    return true;
  } catch (e) {
    logError('auth.callbackAdmission.stageFailed', e, { kind });
    await invalidateAndDeleteKey(ADMISSION_KEY, INVALIDATED_ADMISSION, 'auth.callbackAdmission');
    return false;
  }
}

export async function clearAuthCallbackAdmission() {
  return invalidateAndDeleteKey(ADMISSION_KEY, INVALIDATED_ADMISSION, 'auth.callbackAdmission');
}

let admissionTail = Promise.resolve();

async function validatePendingAdmissionOnce(user) {
  let raw = null;
  try {
    raw = await SecureStore.getItemAsync(ADMISSION_KEY, KEY_OPTS);
  } catch (e) {
    logError('auth.callbackAdmission.readFailed', e, {});
    return { ok: false, gated: true, reason: 'admission_unreadable' };
  }
  if (!raw) return { ok: true, gated: false, reason: 'no_pending_callback' };

  let gate = null;
  try { gate = JSON.parse(raw); } catch (_) {
    await clearAuthCallbackAdmission();
    return { ok: false, gated: true, reason: 'admission_malformed' };
  }
  const at = Number(gate?.at);
  const now = Date.now();
  if (gate?.version !== FLOW_RECORD_VERSION
    || !EMAIL_FLOW_KINDS.has(gate?.kind)
    || !normalizeAuthEmail(gate?.expectedEmail)
    || !Number.isFinite(at)) {
    await clearAuthCallbackAdmission();
    return { ok: false, gated: true, reason: 'admission_malformed' };
  }
  if (now < at || now - at > AUTH_FLOW_WINDOW_MS) {
    await clearAuthCallbackAdmission();
    return { ok: false, gated: true, reason: 'admission_expired' };
  }

  // A mismatched event does not consume the latch. A refresh from the old
  // account can race the intended exchange; refusing that event must not make
  // the next, correctly-bound event ungated.
  const incomingEmail = normalizeAuthEmail(user?.email);
  if (!user?.id || incomingEmail !== normalizeAuthEmail(gate.expectedEmail)) {
    return { ok: false, gated: true, reason: 'admission_identity_mismatch' };
  }
  if (!(await clearAuthCallbackAdmission())) {
    return { ok: false, gated: true, reason: 'admission_not_consumed' };
  }
  return { ok: true, gated: true, reason: 'admission_matched', kind: gate.kind };
}

export function validatePendingAuthCallbackAdmission(user) {
  const run = admissionTail.then(() => validatePendingAdmissionOnce(user));
  admissionTail = run.catch(() => {});
  return run;
}

export function _resetAuthFlowQueueForTests() {
  consumeTail = Promise.resolve();
  admissionTail = Promise.resolve();
}
