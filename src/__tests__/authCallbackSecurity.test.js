/** Hostile regression tests for the production auth callback implementation. */

const mockSecure = new Map();
let mockSecureFailure = null;
let mockSilentDeleteFailure = false;

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  getItemAsync: jest.fn(async (key) => {
    if (mockSecureFailure === 'read') throw new Error('keychain unavailable');
    return mockSecure.has(key) ? mockSecure.get(key) : null;
  }),
  setItemAsync: jest.fn(async (key, value) => {
    if (mockSecureFailure === 'write') throw new Error('keychain unavailable');
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key) => {
    if (mockSecureFailure === 'delete') throw new Error('keychain unavailable');
    if (!mockSilentDeleteFailure) mockSecure.delete(key);
  }),
}), { virtual: true });

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (count) => Uint8Array.from({ length: count }, (_, i) => i + 1)),
}), { virtual: true });

const mockLog = { error: jest.fn(), info: jest.fn() };
jest.mock('../lib/errorLog', () => ({
  logError: (...args) => mockLog.error(...args),
  logInfo: (...args) => mockLog.info(...args),
}));

const {
  beginAuthFlow, consumeAuthFlow, clearAuthFlow, AUTH_FLOW_WINDOW_MS,
  _resetAuthFlowQueueForTests,
} = require('../lib/authCallbackState');
const {
  handleAuthDeepLink, parseAuthParams, isVolyumeLink,
  looksLikeAccessToken, looksLikeRefreshToken,
} = require('../lib/authDeepLink');

const ACCESS = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature_one';
const ATTACKER_ACCESS = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdHRhY2tlciJ9.signature_two';
const REFRESH = 'v1.opaqueRefreshToken_0123456789';

function fakeSupabase({
  verifiedEmail = 'victim@example.com', verifiedId = 'victim-id',
  getUserError = null, setSessionError = null, exchangeError = null, otpError = null,
} = {}) {
  const user = { id: verifiedId, email: verifiedEmail };
  return {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: getUserError ? null : user }, error: getUserError })),
      setSession: jest.fn(async () => ({ data: { session: { user }, user }, error: setSessionError })),
      verifyOtp: jest.fn(async () => ({ data: {}, error: otpError })),
      exchangeCodeForSession: jest.fn(async () => ({ data: {}, error: exchangeError })),
    },
  };
}

function implicitUrl(access = ACCESS, refresh = REFRESH, state = null) {
  const query = state == null ? '' : `?state=${state}`;
  return `volyume://auth-callback${query}#access_token=${access}&refresh_token=${refresh}`;
}

beforeEach(() => {
  mockSecure.clear();
  mockSecureFailure = null;
  mockSilentDeleteFailure = false;
  mockLog.error.mockClear();
  mockLog.info.mockClear();
  _resetAuthFlowQueueForTests();
  jest.restoreAllMocks();
});

describe('account-substitution resistance', () => {
  test('unsolicited attacker tokens are never installed', async () => {
    const sb = fakeSupabase({ verifiedEmail: 'attacker@example.com', verifiedId: 'attacker-id' });
    await expect(handleAuthDeepLink(implicitUrl(ATTACKER_ACCESS), { supabase: sb }))
      .resolves.toMatchObject({ action: 'refused', reason: 'no_flow_started' });
    expect(sb.auth.getUser).not.toHaveBeenCalled();
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test.each(['signup', 'recovery'])('%s window cannot be reused for an attacker identity', async (kind) => {
    await beginAuthFlow(kind, 'victim@example.com');
    const sb = fakeSupabase({ verifiedEmail: 'attacker@example.com', verifiedId: 'attacker-id' });
    const result = await handleAuthDeepLink(implicitUrl(ATTACKER_ACCESS), { supabase: sb });
    expect(result).toMatchObject({ action: 'refused', reason: 'identity_mismatch' });
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('the genuine no-state legacy template succeeds only for the bound identity', async () => {
    await beginAuthFlow('signup', ' Victim@Example.COM ');
    const sb = fakeSupabase();
    await expect(handleAuthDeepLink(implicitUrl(), { supabase: sb }))
      .resolves.toEqual({ action: 'signedIn', via: 'implicit' });
    expect(sb.auth.getUser).toHaveBeenCalledWith(ACCESS);
    expect(sb.auth.setSession).toHaveBeenCalledWith({ access_token: ACCESS, refresh_token: REFRESH });
  });

  test('a wrong nonce consumes the flow', async () => {
    const nonce = await beginAuthFlow('recovery', 'victim@example.com');
    const sb = fakeSupabase();
    expect((await handleAuthDeepLink(implicitUrl(ACCESS, REFRESH, 'wrong'), { supabase: sb })).reason)
      .toBe('state_mismatch');
    expect((await handleAuthDeepLink(implicitUrl(ACCESS, REFRESH, nonce), { supabase: sb })).reason)
      .toBe('no_flow_started');
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('an OAuth kind cannot open an implicit callback window', async () => {
    expect(await beginAuthFlow('oauth', 'victim@example.com')).toBeNull();
    expect((await consumeAuthFlow(null)).reason).toBe('no_flow_started');
  });
});

describe('credential validation and exchange failures', () => {
  test('opaque refresh tokens are accepted as the documented token shape', () => {
    expect(looksLikeAccessToken(ACCESS)).toBe(true);
    expect(looksLikeRefreshToken(REFRESH)).toBe(true);
    expect(looksLikeRefreshToken(ACCESS)).toBe(true);
  });

  test.each([
    ['bad access token', 'not-a-jwt', REFRESH],
    ['short refresh token', ACCESS, 'short'],
    ['refresh whitespace', ACCESS, 'opaque token with spaces'],
  ])('%s is rejected before consuming state', async (_label, access, refresh) => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase();
    expect((await handleAuthDeepLink(implicitUrl(access, refresh, nonce), { supabase: sb })).reason)
      .toBe('malformed_tokens');
    expect((await consumeAuthFlow(nonce)).ok).toBe(true);
  });

  test('server token validation failure never reaches setSession', async () => {
    await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase({ getUserError: { message: 'invalid JWT' } });
    expect((await handleAuthDeepLink(implicitUrl(), { supabase: sb })).reason).toBe('token_invalid');
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('a returned setSession error is not mistaken for success', async () => {
    await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase({ setSessionError: { message: 'refresh rejected' } });
    expect(await handleAuthDeepLink(implicitUrl(), { supabase: sb }))
      .toEqual({ action: 'failed', via: 'implicit' });
  });

  test.each([
    ['volyume://?token_hash=hash&type=signup', 'token_hash', 'verifyOtp', 'otpError'],
    ['volyume://?code=pkce-code', 'code', 'exchangeCodeForSession', 'exchangeError'],
  ])('%s reports a returned API error', async (url, via, method, errorOption) => {
    const sb = fakeSupabase({ [errorOption]: { message: 'rejected' } });
    expect(await handleAuthDeepLink(url, { supabase: sb })).toEqual({ action: 'failed', via });
    expect(sb.auth[method]).toHaveBeenCalled();
  });
});

describe('ambiguous callbacks, replay, and storage failures', () => {
  test.each([
    'volyume://?code=a&code=b',
    'volyume://?token_hash=a&type=signup#token_hash=b',
    `${implicitUrl()}&access_token=${ATTACKER_ACCESS}`,
  ])('duplicate auth parameters fail closed: %s', async (url) => {
    const sb = fakeSupabase();
    expect((await handleAuthDeepLink(url, { supabase: sb })).reason).toBe('duplicate_parameter');
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('token_hash has precedence over code and tokens', async () => {
    const sb = fakeSupabase();
    const result = await handleAuthDeepLink(
      `volyume://?token_hash=h&type=signup&code=c#access_token=${ACCESS}&refresh_token=${REFRESH}`,
      { supabase: sb },
    );
    expect(result.via).toBe('token_hash');
    expect(sb.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('the one-shot flow cannot replay or race', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase();
    const url = implicitUrl(ACCESS, REFRESH, nonce);
    const results = await Promise.all([
      handleAuthDeepLink(url, { supabase: sb }),
      handleAuthDeepLink(url, { supabase: sb }),
    ]);
    expect(results.filter((result) => result.action === 'signedIn')).toHaveLength(1);
    expect(sb.auth.setSession).toHaveBeenCalledTimes(1);
  });

  test('expired state is rejected', async () => {
    await beginAuthFlow('signup', 'victim@example.com');
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + AUTH_FLOW_WINDOW_MS + 1);
    expect((await consumeAuthFlow(null)).reason).toBe('expired');
  });

  test.each(['read', 'delete'])('%s failure refuses the callback', async (failure) => {
    await beginAuthFlow('signup', 'victim@example.com');
    mockSecureFailure = failure;
    expect((await consumeAuthFlow(null)).ok).toBe(false);
  });

  test('a silently failed delete is detected before authorization', async () => {
    await beginAuthFlow('signup', 'victim@example.com');
    mockSilentDeleteFailure = true;
    expect(await consumeAuthFlow(null)).toEqual({ ok: false, reason: 'state_not_consumed' });
  });

  test('unbound or corrupt state is rejected', async () => {
    mockSecure.set('volyume.authCallbackState', JSON.stringify({ nonce: 'n', kind: 'signup', at: Date.now() }));
    expect((await consumeAuthFlow('n')).reason).toBe('identity_unbound');
    mockSecure.set('volyume.authCallbackState', 'not-json');
    expect((await consumeAuthFlow(null)).reason).toBe('state_malformed');
  });

  test('clear verifies absence', async () => {
    await beginAuthFlow('signup', 'victim@example.com');
    expect(await clearAuthFlow()).toBe(true);
  });
});

describe('parser, origin, and privacy invariants', () => {
  test('query and fragment are parsed and duplicate keys are recorded', () => {
    const parsed = parseAuthParams('volyume://?state=s&type=signup#access_token=a&access_token=b');
    expect(parsed).toMatchObject({ state: 's', type: 'signup', access_token: 'a' });
    expect(parsed._duplicates).toContain('access_token');
  });

  test.each([
    'https://volyume.app.evil.com/?code=x', 'https://volyume.app:8443/?code=x',
    'http://volyume.app/?code=x', 'https://user@volyume.app/?code=x',
  ])('foreign origin is ignored: %s', async (url) => {
    expect(isVolyumeLink(url)).toBe(false);
    const sb = fakeSupabase();
    expect(await handleAuthDeepLink(url, { supabase: sb })).toEqual({ action: 'ignored' });
  });

  test('no credential material is logged on success or refusal', async () => {
    await beginAuthFlow('signup', 'victim@example.com');
    await handleAuthDeepLink(implicitUrl(), { supabase: fakeSupabase() });
    await handleAuthDeepLink(implicitUrl(ATTACKER_ACCESS), { supabase: fakeSupabase() });
    const logged = JSON.stringify([mockLog.error.mock.calls, mockLog.info.mock.calls]);
    expect(logged).not.toContain(ACCESS);
    expect(logged).not.toContain(ATTACKER_ACCESS);
    expect(logged).not.toContain(REFRESH);
  });
});
