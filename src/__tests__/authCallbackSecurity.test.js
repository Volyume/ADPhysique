/**
 * Volyume does not accept an access token merely because it arrived through a
 * Volyume deep link (founder law, 2026-08-27).
 *
 * WHY THIS LAW EXISTS. `volyume://` is a custom scheme. Any installed app can
 * open one and the OS hands it to us with no origin information whatever. The
 * handler used to call setSession with whatever tokens the link carried, so an
 * attacker holding a real Supabase account of their own could sign a victim's
 * phone into it and then read everything the victim logged next: weight, food,
 * photos, private notes. Nothing about the link says who sent it.
 *
 * THREE MECHANISMS, STRONGEST FIRST, and only the last needs guarding.
 *
 *   token_hash    Supabase's documented PKCE-safe email mechanism. The SERVER
 *                 validates the hash and mints the session; the app never
 *                 receives a token from the link. Forging it means getting
 *                 Supabase to issue a hash for someone else's address.
 *   code          PKCE proper, used by OAuth. The exchange needs the verifier
 *                 supabase-js stored when THIS app started the flow.
 *   access_token  The implicit fallback, and the only forgeable one. Supabase's
 *                 own docs say the PKCE handshake is broken for mobile email
 *                 links (the link opens in the browser, the verifier is in the
 *                 app), which is why the default templates still emit it and
 *                 why it cannot simply be deleted without breaking
 *                 verification.
 *
 * WHAT THE GUARD BUYS, HONESTLY. An implicit callback is refused unless this app
 * began an email auth flow within ten minutes. That is "any installed app, at
 * any moment" reduced to "any installed app, inside a window that opens only
 * when the user has just tapped sign up or reset password on this device". Large,
 * and not zero. The dashboard change in authCallbackState.js closes it fully.
 */

const mockSecure = new Map();
let mockSecureThrows = null;

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  getItemAsync: jest.fn(async (k) => {
    if (mockSecureThrows === 'read') throw new Error('keychain unavailable');
    return mockSecure.has(k) ? mockSecure.get(k) : null;
  }),
  setItemAsync: jest.fn(async (k, v) => {
    if (mockSecureThrows === 'write') throw new Error('keychain unavailable');
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k) => { mockSecure.delete(k); }),
}), { virtual: true });

const mockLog = { logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn() };
jest.mock('../lib/errorLog', () => ({
  logError: (...a) => mockLog.logError(...a),
  logInfo: (...a) => mockLog.logInfo(...a),
  logWarn: (...a) => mockLog.logWarn(...a),
  installGlobalHandlers: jest.fn(),
}));

const {
  beginAuthFlow, consumeAuthFlow, clearAuthFlow, AUTH_FLOW_WINDOW_MS,
} = require('../lib/authCallbackState');

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.c2lnbmF0dXJlaGVyZQ';
const OTHER_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdHRhY2tlciJ9.b3RoZXJzaWduYXR1cmU';

beforeEach(() => {
  mockSecure.clear();
  mockSecureThrows = null;
  mockLog.logError.mockClear();
  mockLog.logInfo.mockClear();
  jest.restoreAllMocks();
});

// ── The parser and predicates, copied from App.js so behaviour is testable ──

function parseAuthParams(url) {
  const s = String(url ?? '');
  const out = {};
  const readPairs = (blob) => {
    for (const pair of String(blob || '').split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const k = eq === -1 ? pair : pair.slice(0, eq);
      const v = eq === -1 ? '' : pair.slice(eq + 1);
      if (!k) continue;
      try { out[decodeURIComponent(k)] = decodeURIComponent(v); } catch (_) { out[k] = v; }
    }
  };
  const hash = s.indexOf('#');
  const withoutHash = hash === -1 ? s : s.slice(0, hash);
  const q = withoutHash.indexOf('?');
  if (q !== -1) readPairs(withoutHash.slice(q + 1));
  if (hash !== -1) readPairs(s.slice(hash + 1));
  return out;
}

function isVolyumeLink(url) {
  const s = String(url ?? '');
  if (s.startsWith('volyume://')) return true;
  const m = /^https:\/\/([^/?#]+)/i.exec(s);
  return !!m && m[1].toLowerCase() === 'volyume.app';
}

function looksLikeJwt(token) {
  return typeof token === 'string'
    && token.length >= 20 && token.length <= 8192
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

/** The handler's decision procedure, as implemented. */
async function handle(url, supabase) {
  if (!url || !isVolyumeLink(url) || !supabase) return { action: 'ignored' };
  const params = parseAuthParams(url);
  if (params.token_hash && params.type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash, type: params.type,
    });
    return error ? { action: 'failed', via: 'token_hash' } : { action: 'signedIn', via: 'token_hash' };
  }
  if (params.code) {
    try {
      await supabase.auth.exchangeCodeForSession(params.code);
      return { action: 'signedIn', via: 'code' };
    } catch (_) { return { action: 'failed', via: 'code' }; }
  }
  if (params.access_token && params.refresh_token) {
    if (!looksLikeJwt(params.access_token) || !looksLikeJwt(params.refresh_token)) {
      return { action: 'refused', reason: 'malformed' };
    }
    const gate = await consumeAuthFlow(params.state ?? null);
    if (!gate.ok) return { action: 'refused', reason: gate.reason };
    await supabase.auth.setSession({
      access_token: params.access_token, refresh_token: params.refresh_token,
    });
    return { action: 'signedIn', via: 'implicit' };
  }
  return { action: 'ignored' };
}

function fakeSupabase({ verifyOtpError = null, exchangeThrows = false } = {}) {
  const calls = { verifyOtp: [], exchange: [], setSession: [] };
  return {
    calls,
    auth: {
      verifyOtp: jest.fn(async (a) => { calls.verifyOtp.push(a); return { error: verifyOtpError }; }),
      exchangeCodeForSession: jest.fn(async (c) => {
        calls.exchange.push(c);
        if (exchangeThrows) throw new Error('invalid code or verifier');
      }),
      setSession: jest.fn(async (a) => { calls.setSession.push(a); }),
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────

describe('the law: a token is never adopted just for arriving on a deep link', () => {
  test('a callback Volyume did not initiate is REFUSED', async () => {
    // The whole finding, in one case. No flow was begun on this device.
    const sb = fakeSupabase();
    const r = await handle(`volyume://#access_token=${OTHER_JWT}&refresh_token=${OTHER_JWT}`, sb);
    expect(r).toEqual({ action: 'refused', reason: 'no_flow_started' });
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('the attacker cannot make one by supplying their own state', async () => {
    const sb = fakeSupabase();
    const r = await handle(
      `volyume://auth-callback?state=attacker-chosen#access_token=${OTHER_JWT}&refresh_token=${OTHER_JWT}`, sb,
    );
    expect(r.action).toBe('refused');
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('nor by omitting the state entirely', async () => {
    // Omission must not be a bypass. That is the shape of guard this whole
    // audit kept finding: a check that only binds honest callers.
    const sb = fakeSupabase();
    const r = await handle(`volyume://#access_token=${OTHER_JWT}&refresh_token=${OTHER_JWT}`, sb);
    expect(r.action).toBe('refused');
  });

  test('a refusal is loud, because it is the only trace an attempt leaves', async () => {
    await consumeAuthFlow(null);
    // The handler logs; here we assert the gate reports a reason worth logging.
    const gate = await consumeAuthFlow(null);
    expect(gate).toEqual({ ok: false, reason: 'no_flow_started' });
  });
});

describe('genuine journeys still complete', () => {
  test('email verification, via the app-initiated window', async () => {
    const nonce = await beginAuthFlow('signup');
    const sb = fakeSupabase();
    const r = await handle(
      `volyume://auth-callback?state=${nonce}#access_token=${JWT}&refresh_token=${JWT}`, sb,
    );
    expect(r).toEqual({ action: 'signedIn', via: 'implicit' });
    expect(sb.calls.setSession[0]).toEqual({ access_token: JWT, refresh_token: JWT });
  });

  test('email verification on the CURRENT templates, which carry no state', async () => {
    // This is the case that would break if the guard demanded a nonce: today's
    // default Supabase template redirects to plain volyume:// with no state.
    await beginAuthFlow('signup');
    const sb = fakeSupabase();
    const r = await handle(`volyume://#access_token=${JWT}&refresh_token=${JWT}`, sb);
    expect(r).toEqual({ action: 'signedIn', via: 'implicit' });
  });

  test('password reset, same binding', async () => {
    const nonce = await beginAuthFlow('recovery');
    const sb = fakeSupabase();
    const r = await handle(
      `volyume://auth-callback?state=${nonce}#access_token=${JWT}&refresh_token=${JWT}`, sb,
    );
    expect(r.action).toBe('signedIn');
  });

  test('token_hash needs no window at all, because it cannot be forged', async () => {
    // No beginAuthFlow. The server validates the hash, so an app-initiated
    // window would add nothing and would break links opened days later.
    const sb = fakeSupabase();
    const r = await handle('volyume://auth-callback?token_hash=abc123&type=signup', sb);
    expect(r).toEqual({ action: 'signedIn', via: 'token_hash' });
    expect(sb.calls.verifyOtp[0]).toEqual({ token_hash: 'abc123', type: 'signup' });
  });

  test('a token_hash Supabase rejects does not sign anyone in', async () => {
    const sb = fakeSupabase({ verifyOtpError: { message: 'expired' } });
    const r = await handle('volyume://auth-callback?token_hash=stale&type=recovery', sb);
    expect(r.action).toBe('failed');
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('OAuth returning from Apple or Google, via PKCE', async () => {
    const sb = fakeSupabase();
    const r = await handle('volyume://?code=pkce-code-abc', sb);
    expect(r).toEqual({ action: 'signedIn', via: 'code' });
    expect(sb.calls.exchange[0]).toBe('pkce-code-abc');
  });

  test('an OAuth code from another app fails inside Supabase, not here', async () => {
    // The verifier is ours. A forged code cannot be exchanged, which is why
    // this path needs no window of its own.
    const sb = fakeSupabase({ exchangeThrows: true });
    const r = await handle('volyume://?code=forged', sb);
    expect(r).toEqual({ action: 'failed', via: 'code' });
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('the strongest available mechanism is the one used', async () => {
    // A link carrying everything must take token_hash, never the implicit
    // tokens sitting in the same fragment.
    await beginAuthFlow('signup');
    const sb = fakeSupabase();
    const r = await handle(
      `volyume://auth-callback?token_hash=h&type=signup&code=c#access_token=${JWT}&refresh_token=${JWT}`, sb,
    );
    expect(r.via).toBe('token_hash');
    expect(sb.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });
});

describe('replay, expiry and interruption', () => {
  test('a genuine link cannot be used twice', async () => {
    const nonce = await beginAuthFlow('signup');
    const url = `volyume://auth-callback?state=${nonce}#access_token=${JWT}&refresh_token=${JWT}`;
    const sb = fakeSupabase();
    expect((await handle(url, sb)).action).toBe('signedIn');
    expect((await handle(url, sb)).action).toBe('refused');
    expect(sb.calls.setSession).toHaveLength(1);
  });

  test('an expired window is refused', async () => {
    const nonce = await beginAuthFlow('signup');
    const realNow = Date.now;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + AUTH_FLOW_WINDOW_MS + 1000);
    const sb = fakeSupabase();
    const r = await handle(
      `volyume://auth-callback?state=${nonce}#access_token=${JWT}&refresh_token=${JWT}`, sb,
    );
    expect(r).toEqual({ action: 'refused', reason: 'expired' });
  });

  test('a window still inside its ten minutes is accepted', async () => {
    const nonce = await beginAuthFlow('signup');
    const realNow = Date.now;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + AUTH_FLOW_WINDOW_MS - 5000);
    const sb = fakeSupabase();
    const r = await handle(
      `volyume://auth-callback?state=${nonce}#access_token=${JWT}&refresh_token=${JWT}`, sb,
    );
    expect(r.action).toBe('signedIn');
  });

  test('a clock moved backwards is refused rather than trusted', async () => {
    await beginAuthFlow('signup');
    const realNow = Date.now;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() - 60_000);
    expect((await consumeAuthFlow(null)).reason).toBe('expired');
  });

  test('an interrupted flow leaves the window open for the retry, then closes', async () => {
    // Start, abandon, come back to a link: the first attempt consumes it.
    await beginAuthFlow('signup');
    expect((await consumeAuthFlow(null)).ok).toBe(true);
    expect((await consumeAuthFlow(null)).reason).toBe('no_flow_started');
  });

  test('a refusal cannot be retried into an acceptance', async () => {
    // State is cleared BEFORE the decision, so a mismatched attempt does not
    // leave a usable window behind for a second, better-guessed try.
    const nonce = await beginAuthFlow('signup');
    expect((await consumeAuthFlow('wrong')).reason).toBe('state_mismatch');
    expect((await consumeAuthFlow(nonce)).reason).toBe('no_flow_started');
  });
});

describe('malformed callbacks', () => {
  test.each([
    ['not a JWT', 'notatoken', JWT],
    ['two segments', 'a.b', JWT],
    ['markup', 'aaaaaaaaaaaaaaaaaaaaaa.bbbb.<script>', JWT],
    ['a bad refresh token', JWT, 'nope'],
  ])('%s is refused before the window is even consulted', async (_l, at, rt) => {
    const nonce = await beginAuthFlow('signup');
    const sb = fakeSupabase();
    const r = await handle(`volyume://auth-callback?state=${nonce}#access_token=${at}&refresh_token=${rt}`, sb);
    expect(r).toEqual({ action: 'refused', reason: 'malformed' });
    // And the window survives, so the user's real link still works afterwards.
    expect((await consumeAuthFlow(nonce)).ok).toBe(true);
  });

  test('an access token with no refresh token does nothing', async () => {
    await beginAuthFlow('signup');
    const sb = fakeSupabase();
    expect((await handle(`volyume://#access_token=${JWT}`, sb)).action).toBe('ignored');
  });

  test('an empty or junk link is ignored, not crashed on', async () => {
    const sb = fakeSupabase();
    for (const url of ['volyume://', 'volyume://???', 'volyume://#', 'volyume://#=&=&']) {
      await expect(handle(url, sb)).resolves.toMatchObject({ action: 'ignored' });
    }
  });

  test('a link from a host that is not ours never reaches any mechanism', async () => {
    const sb = fakeSupabase();
    const r = await handle(`https://volyume.app.evil.com/?token_hash=h&type=signup`, sb);
    expect(r).toEqual({ action: 'ignored' });
    expect(sb.auth.verifyOtp).not.toHaveBeenCalled();
  });
});

describe('the parser reads both halves of a callback URL', () => {
  test('query and fragment together', () => {
    const p = parseAuthParams('volyume://auth-callback?state=s1&type=signup#access_token=a&refresh_token=b');
    expect(p).toMatchObject({ state: 's1', type: 'signup', access_token: 'a', refresh_token: 'b' });
  });

  test('percent-encoding is decoded', () => {
    expect(parseAuthParams('volyume://?code=a%2Bb%2Fc').code).toBe('a+b/c');
  });

  test('a malformed escape does not discard the link', () => {
    // A dropped callback is a user who cannot verify their email.
    expect(parseAuthParams('volyume://?code=%E0%A4%A').code).toBe('%E0%A4%A');
  });

  test('a fragment-only link parses', () => {
    expect(parseAuthParams('volyume://#access_token=x&refresh_token=y'))
      .toEqual({ access_token: 'x', refresh_token: 'y' });
  });
});

describe('account isolation', () => {
  test('signing out closes any pending window', async () => {
    // Otherwise a callback begun by the previous user could be adopted by the
    // next one on the same device.
    await beginAuthFlow('signup');
    await clearAuthFlow();
    expect((await consumeAuthFlow(null)).reason).toBe('no_flow_started');
  });

  test('a nonce from one flow does not validate another', async () => {
    const first = await beginAuthFlow('signup');
    await beginAuthFlow('recovery');            // replaces it
    expect((await consumeAuthFlow(first)).reason).toBe('state_mismatch');
  });
});

describe('storage failures fail closed', () => {
  test('a keychain write failure means no window is opened', async () => {
    mockSecureThrows = 'write';
    expect(await beginAuthFlow('signup')).toBeNull();
    mockSecureThrows = null;
    expect((await consumeAuthFlow(null)).reason).toBe('no_flow_started');
  });

  test('a keychain read failure refuses rather than admits', async () => {
    await beginAuthFlow('signup');
    mockSecureThrows = 'read';
    expect((await consumeAuthFlow(null))).toEqual({ ok: false, reason: 'state_unreadable' });
  });

  test('corrupt stored state is refused', async () => {
    mockSecure.set('volyume.authCallbackState', 'not json');
    expect((await consumeAuthFlow(null)).reason).toBe('state_malformed');
  });

  test('stored state with a non-finite timestamp is refused', async () => {
    // An ordering check alone is false for NaN in both directions.
    mockSecure.set('volyume.authCallbackState', JSON.stringify({ nonce: 'n', at: 'later' }));
    expect((await consumeAuthFlow('n')).reason).toBe('state_malformed');
  });
});

describe('no token is ever logged', () => {
  test('accepting a callback logs no token material', async () => {
    await beginAuthFlow('signup');
    await consumeAuthFlow(null);
    const logged = JSON.stringify(mockLog.logInfo.mock.calls) + JSON.stringify(mockLog.logError.mock.calls);
    expect(logged).not.toContain(JWT);
    expect(logged).not.toContain('eyJ');
  });

  test('nor does the handler on the source side', () => {
    const fs = require('fs');
    const path = require('path');
    const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
    const handler = app.slice(app.indexOf('async function handleAuthDeepLink'));
    const block = handler.slice(0, handler.indexOf('const CRASH_LOG_KEY'));
    expect(block).not.toMatch(/log\w+\([^)]*access_token/);
    expect(block).not.toMatch(/log\w+\([^)]*refresh_token/);
    expect(block).not.toMatch(/log\w+\([^)]*token_hash/);
    expect(block).not.toMatch(/log\w+\([^)]*params\.code/);
  });
});

describe('the source keeps the mechanism order and the flow bindings', () => {
  const fs = require('fs');
  const path = require('path');
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
  const sup = fs.readFileSync(path.join(__dirname, '..', 'lib', 'supabase.js'), 'utf8');
  const strip = (s) => s.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  const handler = strip(app.slice(app.indexOf('async function handleAuthDeepLink'), app.indexOf('const CRASH_LOG_KEY')));

  test('token_hash, then code, then implicit', () => {
    const a = handler.indexOf('verifyOtp');
    const b = handler.indexOf('exchangeCodeForSession');
    const c = handler.indexOf('setSession');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  test('the implicit branch is gated on consumeAuthFlow before setSession', () => {
    const gate = handler.indexOf('consumeAuthFlow');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(handler.indexOf('setSession'));
  });

  test('an ungated setSession cannot creep back', () => {
    expect(handler).not.toMatch(/if \(params\.access_token && params\.refresh_token\) \{\s*try \{\s*await supabase\.auth\.setSession/);
  });

  test('sign-up and reset both begin a flow', () => {
    expect(strip(sup)).toMatch(/beginAuthFlow\('signup'\)/);
    expect(strip(sup)).toMatch(/beginAuthFlow\('recovery'\)/);
  });

  test('sign-out clears it', () => {
    expect(strip(sup)).toMatch(/clearAuthFlow\(\)/);
    const signOut = strip(sup).slice(strip(sup).indexOf('export async function signOut'));
    expect(signOut.slice(0, 400)).toMatch(/clearAuthFlow/);
  });

  test('the dashboard change that closes this fully is written down', () => {
    const state = fs.readFileSync(path.join(__dirname, '..', 'lib', 'authCallbackState.js'), 'utf8');
    expect(state).toMatch(/token_hash=\{\{ \.TokenHash \}\}/);
    expect(state).toMatch(/Additional Redirect URLs: volyume:\/\/\*/);
  });
});
