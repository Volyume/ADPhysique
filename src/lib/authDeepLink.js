import { consumeAuthFlow, clearAuthFlow, normalizeAuthEmail } from './authCallbackState';
import { logError, logInfo } from './errorLog';

const AUTH_KEYS = new Set([
  'token_hash', 'type', 'code', 'access_token', 'refresh_token', 'state',
]);
const OTP_TYPES = new Set(['signup', 'recovery', 'invite', 'magiclink', 'email', 'email_change']);

export function isVolyumeLink(url) {
  const s = String(url ?? '');
  if (/^volyume:\/\//i.test(s)) return true;
  const m = /^https:\/\/([^/?#]+)/i.exec(s);
  return !!m && m[1].toLowerCase() === 'volyume.app';
}

export function parseAuthParams(url) {
  const s = String(url ?? '');
  const out = {};
  const duplicates = new Set();
  const readPairs = (blob) => {
    for (const pair of String(blob || '').split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const rawKey = eq === -1 ? pair : pair.slice(0, eq);
      const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
      if (!rawKey) continue;
      let key = rawKey;
      let value = rawValue;
      try { key = decodeURIComponent(rawKey); } catch (_) {}
      try { value = decodeURIComponent(rawValue); } catch (_) {}
      if (Object.prototype.hasOwnProperty.call(out, key)) duplicates.add(key);
      else out[key] = value;
    }
  };
  const hash = s.indexOf('#');
  const withoutHash = hash === -1 ? s : s.slice(0, hash);
  const q = withoutHash.indexOf('?');
  if (q !== -1) readPairs(withoutHash.slice(q + 1));
  if (hash !== -1) readPairs(s.slice(hash + 1));
  Object.defineProperty(out, '_duplicates', { value: [...duplicates], enumerable: false });
  return out;
}

export function looksLikeAccessToken(token) {
  return typeof token === 'string'
    && token.length >= 20 && token.length <= 8192
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

// Supabase refresh tokens are opaque strings, not JWTs. Keep a narrow,
// whitespace-free transport shape and let setSession validate the credential.
export function looksLikeRefreshToken(token) {
  return typeof token === 'string'
    && token.length >= 16 && token.length <= 4096
    && /^[A-Za-z0-9._~-]+$/.test(token);
}

function fail(notifyAuthLinkFailed, scope, reason) {
  logError(scope, new Error(`auth callback refused (${reason})`), { reason });
  notifyAuthLinkFailed?.();
  return { action: 'refused', reason };
}

/** Handles the real production callback path. No token material is logged. */
export async function handleAuthDeepLink(url, { supabase, notifyAuthLinkFailed } = {}) {
  if (!url || !isVolyumeLink(url) || !supabase?.auth) return { action: 'ignored' };
  const params = parseAuthParams(url);
  const duplicate = (params._duplicates ?? []).find((key) => AUTH_KEYS.has(key));
  if (duplicate) return fail(notifyAuthLinkFailed, 'auth.deepLink.duplicateParameter', 'duplicate_parameter');

  if (params.token_hash || params.type) {
    if (!params.token_hash || !OTP_TYPES.has(params.type) || params.token_hash.length > 4096) {
      return fail(notifyAuthLinkFailed, 'auth.deepLink.malformedTokenHash', 'malformed_token_hash');
    }
    try {
      const { error } = await supabase.auth.verifyOtp({ token_hash: params.token_hash, type: params.type });
      if (error) throw error;
      logInfo('auth.deepLink.tokenHash', 'session established from a server-verified token hash');
      await clearAuthFlow();
      return { action: 'signedIn', via: 'token_hash' };
    } catch (_) {
      notifyAuthLinkFailed?.();
      return { action: 'failed', via: 'token_hash' };
    }
  }

  if (params.code) {
    if (params.code.length > 4096 || /[\s\x00-\x1f]/.test(params.code)) {
      return fail(notifyAuthLinkFailed, 'auth.deepLink.malformedCode', 'malformed_code');
    }
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) throw error;
      await clearAuthFlow();
      return { action: 'signedIn', via: 'code' };
    } catch (_) {
      notifyAuthLinkFailed?.();
      return { action: 'failed', via: 'code' };
    }
  }

  if (params.access_token || params.refresh_token) {
    if (!looksLikeAccessToken(params.access_token) || !looksLikeRefreshToken(params.refresh_token)) {
      return fail(notifyAuthLinkFailed, 'auth.deepLink.malformedTokens', 'malformed_tokens');
    }
    const gate = await consumeAuthFlow(params.state ?? null);
    if (!gate.ok) {
      return fail(notifyAuthLinkFailed, 'auth.deepLink.unsolicitedImplicitCallback', gate.reason);
    }

    // Validate the access token against Supabase Auth without installing it.
    // The legacy no-state template is safe only because the verified identity is
    // compared to the email bound when this device started the flow.
    let verifiedUser = null;
    try {
      const { data, error } = await supabase.auth.getUser(params.access_token);
      if (error) throw error;
      verifiedUser = data?.user ?? null;
    } catch (_) {
      return fail(notifyAuthLinkFailed, 'auth.deepLink.tokenValidationFailed', 'token_invalid');
    }
    if (!verifiedUser?.id
      || normalizeAuthEmail(verifiedUser.email) !== normalizeAuthEmail(gate.expectedEmail)) {
      return fail(notifyAuthLinkFailed, 'auth.deepLink.identityMismatch', 'identity_mismatch');
    }

    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) throw error;
      const installedUid = data?.user?.id ?? data?.session?.user?.id ?? null;
      if (installedUid && installedUid !== verifiedUser.id) throw new Error('installed session identity changed');
      return { action: 'signedIn', via: 'implicit' };
    } catch (_) {
      notifyAuthLinkFailed?.();
      return { action: 'failed', via: 'implicit' };
    }
  }
  return { action: 'ignored' };
}
