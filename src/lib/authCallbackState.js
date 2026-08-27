/**
 * authCallbackState.js
 *
 * Volyume must not accept an access token merely because it arrived through a
 * Volyume deep link (founder law, 2026-08-27).
 *
 * THE PROBLEM, precisely. `volyume://` is a custom scheme. Any installed app can
 * open one, and the OS will route it to us with no origin information whatever.
 * So a link carrying `#access_token=...&refresh_token=...` used to be adopted
 * with `setSession`, which signs this device into whatever account those tokens
 * belong to. An attacker with a real Supabase account of their own could sign a
 * victim's phone into it and then read everything the victim logged next:
 * weight, food, photos, notes. Nothing about the link says who sent it.
 *
 * THREE MECHANISMS, IN ORDER OF STRENGTH. The callback handler tries them in
 * this order and the weakest is the only one that needs this module.
 *
 *   1. token_hash    Supabase's documented PKCE-safe email mechanism. The link
 *                    carries a one-time hash, and verifyOtp asks the SERVER to
 *                    validate it and mint the session. The app never receives a
 *                    token from the link at all, so there is nothing to forge:
 *                    an attacker would need Supabase to issue them a hash for
 *                    someone else's email. Unforgeable, and it needs no help
 *                    from this file.
 *   2. code          PKCE proper, used by the OAuth flow. The exchange requires
 *                    the code_verifier that supabase-js stored when THIS app
 *                    started the flow, so a code from anywhere else fails.
 *                    Unforgeable, and also needs no help from this file.
 *   3. access_token  The implicit fallback. Supabase's default email templates
 *                    still produce it, because its own documentation notes the
 *                    PKCE handshake is broken for mobile email links: the link
 *                    opens in the phone's BROWSER while the verifier sits in the
 *                    app. This is the one that can be forged, and this module is
 *                    what stands in front of it.
 *
 * WHAT THIS BUYS, STATED HONESTLY. An implicit callback is refused unless this
 * app itself began an email auth flow within the last ten minutes. That moves
 * the attack from "any installed app, at any moment" to "any installed app,
 * inside a ten-minute window that opens only when the user has just tapped sign
 * up or reset password on this device". It is a large reduction and it is not
 * zero. The complete fix is the dashboard change described below, after which
 * the implicit path stops being reachable at all.
 *
 * A nonce is also minted and passed as `emailRedirectTo`, and when a callback
 * carries one it must match and is consumed. That is deliberately NOT treated as
 * the security boundary: an attacker simply omits it, and a check that only
 * binds honest callers binds nobody. It is there so that the moment the project
 * allows `volyume://*` as a redirect, the binding becomes real without another
 * code change, and so a replayed genuine link is refused.
 *
 * THE DASHBOARD CHANGE THAT CLOSES THIS COMPLETELY (founder action):
 *   Authentication -> Email Templates -> Confirm signup, and Reset password:
 *     <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">
 *   Authentication -> URL Configuration -> Additional Redirect URLs: volyume://*
 * With those, every email link arrives as mechanism 1 and the implicit branch
 * becomes dead code, at which point it should be deleted rather than kept.
 *
 * NO TOKENS ARE LOGGED OR STORED HERE. This module handles a random nonce and a
 * timestamp, nothing else.
 */

import * as SecureStore from 'expo-secure-store';
import { logError, logInfo } from './errorLog';

const STATE_KEY = 'volyume.authCallbackState';
const KEY_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

/**
 * How long a started email auth flow stays open.
 *
 * Ten minutes: long enough that a user can switch to their mail app, wait for
 * the message, and tap the link, on a slow connection, without being told their
 * verification failed. Short enough that the window is not simply always open.
 * A verification that misses it is not lost -- the user asks for another email.
 */
export const AUTH_FLOW_WINDOW_MS = 10 * 60 * 1000;

function randomNonce() {
  // Not a secret and not a credential: a value an attacker cannot predict, used
  // once. Math.random is sufficient for that and avoids adding a dependency.
  const part = () => Math.random().toString(36).slice(2, 10);
  return `${part()}${part()}${part()}`;
}

/**
 * Records that THIS app has just started an email auth flow, and returns the
 * nonce to hand to Supabase as part of emailRedirectTo.
 *
 * @param {string} kind 'signup' | 'recovery' | 'oauth', for diagnostics only
 * @returns {Promise<string|null>} the nonce, or null if it could not be stored
 */
export async function beginAuthFlow(kind) {
  const nonce = randomNonce();
  try {
    await SecureStore.setItemAsync(
      STATE_KEY,
      JSON.stringify({ nonce, kind, at: Date.now() }),
      KEY_OPTS,
    );
    return nonce;
  } catch (e) {
    // Fail CLOSED by returning null: with nothing recorded, consumeAuthFlow
    // refuses, so an implicit callback is rejected rather than admitted on a
    // storage failure. The user can retry; a wrongly-adopted session cannot be
    // retried out of existence.
    logError('auth.callbackState.beginFailed', e, { kind });
    return null;
  }
}

/**
 * Decides whether an implicit callback may be adopted, and consumes the state
 * either way so a link cannot be replayed.
 *
 * @param {string|null} nonceFromLink the `state` the callback carried, if any
 * @returns {Promise<{ok: boolean, reason: string}>}
 */
export async function consumeAuthFlow(nonceFromLink) {
  let raw = null;
  try {
    raw = await SecureStore.getItemAsync(STATE_KEY, KEY_OPTS);
  } catch (e) {
    logError('auth.callbackState.readFailed', e, {});
    return { ok: false, reason: 'state_unreadable' };
  }
  if (!raw) return { ok: false, reason: 'no_flow_started' };

  // One shot. Cleared before the decision so a refusal cannot be retried into
  // an acceptance, and a genuine link cannot be replayed after it is used.
  try { await SecureStore.deleteItemAsync(STATE_KEY, KEY_OPTS); } catch (_) { /* best-effort */ }

  let state = null;
  try { state = JSON.parse(raw); } catch (_) { return { ok: false, reason: 'state_malformed' }; }

  const at = Number(state?.at);
  // Explicit finiteness first: an ordering check alone is false for NaN in both
  // directions, which is the failure mode this whole audit kept finding.
  if (!Number.isFinite(at)) return { ok: false, reason: 'state_malformed' };
  if (Date.now() - at > AUTH_FLOW_WINDOW_MS) return { ok: false, reason: 'expired' };
  if (Date.now() < at) return { ok: false, reason: 'expired' };   // clock moved back

  // If the callback carried a nonce it must be ours. If it carried none, the
  // window is all we have -- see the honesty note at the top of this file.
  if (nonceFromLink != null && nonceFromLink !== state?.nonce) {
    return { ok: false, reason: 'state_mismatch' };
  }

  logInfo('auth.callbackState.accepted', 'implicit callback matched an app-initiated flow', {
    kind: typeof state?.kind === 'string' ? state.kind : null,
    hadNonce: nonceFromLink != null,
  });
  return { ok: true, reason: 'ok' };
}

/** Drops any pending flow. Called on sign-out so state never crosses accounts. */
export async function clearAuthFlow() {
  try { await SecureStore.deleteItemAsync(STATE_KEY, KEY_OPTS); } catch (_) { /* best-effort */ }
}
