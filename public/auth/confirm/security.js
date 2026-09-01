(function exposeConfirmSecurity(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VolyumeConfirmSecurity = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildConfirmSecurity() {
  'use strict';

  var NONCE_RE = /^[0-9a-f]{48}$/;
  var TOKEN_RE = /^[A-Za-z0-9_-]{20,4096}$/;
  var TYPES = { signup: true, recovery: true };

  function exactlyOne(params, key) {
    var all = params.getAll(key);
    return all.length === 1 ? all[0] : null;
  }

  /**
   * The value originates in the email URL and is attacker-controlled. Only
   * the two callback endpoints owned by Volyume are admissible. No arbitrary
   * scheme, host, path, fragment or extra query parameter reaches Supabase's
   * redirect_to parameter.
   */
  function safeCallbackTarget(raw) {
    if (raw === 'volyume://') return raw; // currently shipped legacy fallback
    if (typeof raw !== 'string' || raw.length > 512) return null;

    var parsed;
    try { parsed = new URL(raw); } catch (_) { return null; }
    if (parsed.username || parsed.password || parsed.hash) return null;
    if (parsed.searchParams.getAll('state').length !== 1
      || !NONCE_RE.test(parsed.searchParams.get('state') || '')) return null;
    var keys = [];
    parsed.searchParams.forEach(function eachParam(_, key) { keys.push(key); });
    if (keys.length !== 1 || keys[0] !== 'state') return null;

    var legacy = parsed.protocol === 'volyume:'
      && parsed.hostname === 'auth-callback'
      && !parsed.port
      && (parsed.pathname === '' || parsed.pathname === '/');
    var universal = parsed.protocol === 'https:'
      && parsed.hostname === 'volyume.app'
      && !parsed.port
      && (parsed.pathname === '/auth/callback' || parsed.pathname === '/auth/callback/');
    return legacy || universal ? parsed.href : null;
  }

  function parseConfirmRequest(search) {
    var params;
    try { params = new URLSearchParams(String(search || '').replace(/^\?/, '')); } catch (_) {
      return { ok: false, reason: 'malformed_query' };
    }

    var token = exactlyOne(params, 'token');
    var tokenHash = exactlyOne(params, 'token_hash');
    if ((token == null) === (tokenHash == null)) return { ok: false, reason: 'token_ambiguity' };
    token = token == null ? tokenHash : token;
    if (!TOKEN_RE.test(token)) return { ok: false, reason: 'malformed_token' };

    var types = params.getAll('type');
    var type = types.length === 0 ? 'signup' : (types.length === 1 ? types[0] : null);
    if (!type || !TYPES[type]) return { ok: false, reason: 'invalid_type' };

    var redirects = params.getAll('redirect_to');
    if (redirects.length > 1) return { ok: false, reason: 'duplicate_redirect' };
    var redirectTo = safeCallbackTarget(redirects.length ? redirects[0] : 'volyume://');
    if (!redirectTo) return { ok: false, reason: 'unsafe_redirect' };

    return { ok: true, token: token, type: type, redirectTo: redirectTo };
  }

  return { parseConfirmRequest: parseConfirmRequest, safeCallbackTarget: safeCallbackTarget };
}));
