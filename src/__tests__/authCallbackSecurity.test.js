/** Hostile regression tests for the production auth callback implementation. */

const mockSecure = new Map();
let mockSecureFailure = null;
let mockSilentDeleteFailure = false;
let mockSilentWriteFailure = false;

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  getItemAsync: jest.fn(async (key) => {
    if (mockSecureFailure === 'read') throw new Error('keychain unavailable');
    return mockSecure.has(key) ? mockSecure.get(key) : null;
  }),
  setItemAsync: jest.fn(async (key, value) => {
    if (mockSecureFailure === 'write') throw new Error('keychain unavailable');
    if (!mockSilentWriteFailure) mockSecure.set(key, value);
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
  stageAuthCallbackAdmission, clearAuthCallbackAdmission,
  validatePendingAuthCallbackAdmission, _resetAuthFlowQueueForTests,
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
  installedEmail = verifiedEmail, installedId = verifiedId,
  getUserError = null, installedGetUserError = null,
  setSessionError = null, setSessionReturnsIdentity = true,
  exchangeError = null, otpError = null,
} = {}) {
  const verifiedUser = { id: verifiedId, email: verifiedEmail };
  const installedUser = installedId ? { id: installedId, email: installedEmail } : null;
  return {
    auth: {
      getUser: jest.fn(async (token) => (token
        ? { data: { user: getUserError ? null : verifiedUser }, error: getUserError }
        : { data: { user: installedGetUserError ? null : installedUser }, error: installedGetUserError })),
      setSession: jest.fn(async () => ({
        data: setSessionReturnsIdentity
          ? { session: { user: installedUser }, user: installedUser }
          : { session: null, user: null },
        error: setSessionError,
      })),
      verifyOtp: jest.fn(async () => ({ data: { user: installedUser, session: { user: installedUser } }, error: otpError })),
      exchangeCodeForSession: jest.fn(async () => ({ data: {}, error: exchangeError })),
      signOut: jest.fn(async () => ({ error: null })),
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
  mockSilentWriteFailure = false;
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
    const nonce = await beginAuthFlow(kind, 'victim@example.com');
    const sb = fakeSupabase({ verifiedEmail: 'attacker@example.com', verifiedId: 'attacker-id' });
    const result = await handleAuthDeepLink(implicitUrl(ATTACKER_ACCESS, REFRESH, nonce), { supabase: sb });
    expect(result).toMatchObject({ action: 'refused', reason: 'identity_mismatch' });
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('a new flow requires its nonce and succeeds only for the bound identity', async () => {
    const nonce = await beginAuthFlow('signup', ' Victim@Example.COM ');
    const sb = fakeSupabase();
    await expect(handleAuthDeepLink(implicitUrl(ACCESS, REFRESH, nonce), { supabase: sb }))
      .resolves.toEqual({ action: 'signedIn', via: 'implicit' });
    expect(sb.auth.getUser).toHaveBeenNthCalledWith(1, ACCESS);
    expect(sb.auth.getUser).toHaveBeenNthCalledWith(2);
    expect(sb.auth.setSession).toHaveBeenCalledWith({ access_token: ACCESS, refresh_token: REFRESH });
  });

  test('missing state is refused for every newly-created flow', async () => {
    await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase();
    expect((await handleAuthDeepLink(implicitUrl(), { supabase: sb })).reason).toBe('state_missing');
    expect(sb.auth.getUser).not.toHaveBeenCalled();
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('a version-less pending record gets one bounded compatibility window', async () => {
    const legacyNonce = 'ab'.repeat(24);
    mockSecure.set('volyume.authCallbackState', JSON.stringify({
      nonce: legacyNonce, kind: 'signup', expectedEmail: 'victim@example.com', at: Date.now(),
    }));
    await expect(handleAuthDeepLink(implicitUrl(), { supabase: fakeSupabase() }))
      .resolves.toEqual({ action: 'signedIn', via: 'implicit' });
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
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase({ getUserError: { message: 'invalid JWT' } });
    expect((await handleAuthDeepLink(implicitUrl(ACCESS, REFRESH, nonce), { supabase: sb })).reason).toBe('token_invalid');
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('a returned setSession error is not mistaken for success', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase({ setSessionError: { message: 'refresh rejected' } });
    expect(await handleAuthDeepLink(implicitUrl(ACCESS, REFRESH, nonce), { supabase: sb }))
      .toEqual({ action: 'failed', via: 'implicit' });
  });

  test.each([
    ['missing identity', { setSessionReturnsIdentity: false }],
    ['different returned identity', { installedId: 'attacker-id', installedEmail: 'victim@example.com' }],
    ['unreadable installed session', { installedGetUserError: { message: 'unreadable' } }],
  ])('%s is signed out and never reported as success', async (_label, options) => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase(options);
    expect(await handleAuthDeepLink(implicitUrl(ACCESS, REFRESH, nonce), { supabase: sb }))
      .toEqual({ action: 'failed', via: 'implicit' });
    expect(sb.auth.signOut).toHaveBeenCalled();
  });

  test('token-hash reports a returned API error after consuming a matching flow', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase({ otpError: { message: 'rejected' } });
    const url = `volyume://auth-callback?state=${nonce}&token_hash=hash&type=signup`;
    expect(await handleAuthDeepLink(url, { supabase: sb })).toEqual({ action: 'failed', via: 'token_hash' });
    expect(sb.auth.verifyOtp).toHaveBeenCalled();
  });

  test('PKCE code exchange reports a returned API error', async () => {
    const url = 'volyume://?code=pkce-code';
    const sb = fakeSupabase({ exchangeError: { message: 'rejected' } });
    expect(await handleAuthDeepLink(url, { supabase: sb })).toEqual({ action: 'failed', via: 'code' });
    expect(sb.auth.exchangeCodeForSession).toHaveBeenCalled();
  });

  test('token-hash identity and flow kind are independently bound', async () => {
    const nonce = await beginAuthFlow('recovery', 'victim@example.com');
    const wrongKind = `volyume://auth-callback?state=${nonce}&token_hash=hash&type=signup`;
    const sb = fakeSupabase();
    expect((await handleAuthDeepLink(wrongKind, { supabase: sb })).reason).toBe('wrong_flow_kind');
    expect(sb.auth.verifyOtp).not.toHaveBeenCalled();

    const nonce2 = await beginAuthFlow('signup', 'victim@example.com');
    const wrongIdentity = fakeSupabase({ installedId: 'attacker-id', installedEmail: 'attacker@example.com' });
    const url = `volyume://auth-callback?state=${nonce2}&token_hash=hash&type=signup`;
    expect((await handleAuthDeepLink(url, { supabase: wrongIdentity })).reason).toBe('identity_mismatch');
    expect(wrongIdentity.auth.signOut).toHaveBeenCalled();
  });

  test('token-hash stages identity before an auth event can publish it', async () => {
    expect(await stageAuthCallbackAdmission('signup', 'victim@example.com')).toBe(true);
    const mismatch = await validatePendingAuthCallbackAdmission({
      id: 'attacker-id', email: 'attacker@example.com',
    });
    expect(mismatch).toMatchObject({ ok: false, gated: true, reason: 'admission_identity_mismatch' });

    // A racing old-account event cannot consume the latch. The independently
    // verified identity can still pass, exactly once, at RootNavigator.
    const match = await validatePendingAuthCallbackAdmission({
      id: 'victim-id', email: 'Victim@Example.com',
    });
    expect(match).toMatchObject({ ok: true, gated: true, reason: 'admission_matched' });
    expect(await validatePendingAuthCallbackAdmission({
      id: 'victim-id', email: 'victim@example.com',
    })).toMatchObject({ ok: true, gated: false });
  });

  test('token-hash exchange never starts when the pre-admission latch cannot persist', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    mockSilentWriteFailure = true;
    const sb = fakeSupabase();
    const url = `volyume://auth-callback?state=${nonce}&token_hash=hash&type=signup`;
    expect(await handleAuthDeepLink(url, { supabase: sb }))
      .toMatchObject({ action: 'refused', reason: 'admission_unavailable' });
    expect(sb.auth.verifyOtp).not.toHaveBeenCalled();
  });

  test('failed token-hash exchange clears the latch and signs out any partial session', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase({ otpError: { message: 'rejected' } });
    const url = `volyume://auth-callback?state=${nonce}&token_hash=hash&type=signup`;
    await handleAuthDeepLink(url, { supabase: sb });
    expect(sb.auth.signOut).toHaveBeenCalled();
    expect(await validatePendingAuthCallbackAdmission({
      id: 'victim-id', email: 'victim@example.com',
    })).toMatchObject({ ok: true, gated: false });
  });

  test('expired admission latches fail closed and are removed', async () => {
    const now = Date.now();
    await stageAuthCallbackAdmission('recovery', 'victim@example.com');
    jest.spyOn(Date, 'now').mockReturnValue(now + AUTH_FLOW_WINDOW_MS + 1);
    expect(await validatePendingAuthCallbackAdmission({
      id: 'victim-id', email: 'victim@example.com',
    })).toMatchObject({ ok: false, reason: 'admission_expired' });
    expect(await clearAuthCallbackAdmission()).toBe(true);
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
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const sb = fakeSupabase();
    const result = await handleAuthDeepLink(
      `volyume://?state=${nonce}&token_hash=h&type=signup&code=c#access_token=${ACCESS}&refresh_token=${REFRESH}`,
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
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + AUTH_FLOW_WINDOW_MS + 1);
    expect((await consumeAuthFlow(nonce)).reason).toBe('expired');
  });

  test('clock rollback is rejected', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now - 1);
    expect((await consumeAuthFlow(nonce)).reason).toBe('expired');
  });

  test('a SecureStore read failure refuses the callback', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    mockSecureFailure = 'read';
    expect((await consumeAuthFlow(nonce)).ok).toBe(false);
  });

  test('a delete exception is safe when the invalidation tombstone persisted', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    mockSecureFailure = 'delete';
    expect(await consumeAuthFlow(nonce)).toMatchObject({ ok: true });
    mockSecureFailure = null;
    expect((await consumeAuthFlow(nonce)).ok).toBe(false);
  });

  test('a silently failed delete leaves only a verified non-authorising tombstone', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    mockSilentDeleteFailure = true;
    expect(await consumeAuthFlow(nonce)).toMatchObject({ ok: true });
    expect((await consumeAuthFlow(nonce)).ok).toBe(false);
    expect(mockSecure.get('volyume.authCallbackState')).toContain('"invalidated":true');
  });

  test.each([
    ['throwing write', () => { mockSecureFailure = 'write'; }],
    ['silent write mismatch', () => { mockSilentWriteFailure = true; }],
  ])('%s cannot open a callback window', async (_label, arrange) => {
    arrange();
    expect(await beginAuthFlow('signup', 'victim@example.com')).toBeNull();
  });

  test('unbound or corrupt state is rejected', async () => {
    const nonce = 'ab'.repeat(24);
    mockSecure.set('volyume.authCallbackState', JSON.stringify({ nonce, kind: 'signup', at: Date.now() }));
    expect((await consumeAuthFlow(nonce)).reason).toBe('identity_unbound');
    mockSecure.set('volyume.authCallbackState', 'not-json');
    expect((await consumeAuthFlow(null)).reason).toBe('state_malformed');
  });

  test('clear verifies absence', async () => {
    await beginAuthFlow('signup', 'victim@example.com');
    expect(await clearAuthFlow()).toBe(true);
  });

  test('logout invalidation survives a delete failure and refuses the old callback', async () => {
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    mockSilentDeleteFailure = true;
    expect(await clearAuthFlow()).toBe(true);
    const sb = fakeSupabase();
    expect((await handleAuthDeepLink(implicitUrl(ACCESS, REFRESH, nonce), { supabase: sb })).action)
      .toBe('refused');
    expect(sb.auth.setSession).not.toHaveBeenCalled();
  });

  test('account switch clears both callback capabilities and refuses the old callback', async () => {
    const nonce = await beginAuthFlow('recovery', 'account-a@example.com');
    expect(await stageAuthCallbackAdmission('recovery', 'account-a@example.com')).toBe(true);

    // RootNavigator performs this same account-boundary invalidation for every
    // SIGNED_OUT event, including a switch to account B.
    expect(await clearAuthFlow()).toBe(true);

    const sb = fakeSupabase({ email: 'account-a@example.com' });
    const result = await handleAuthDeepLink(
      implicitUrl(ACCESS, REFRESH, nonce),
      { supabase: sb },
    );
    expect(result).toEqual(expect.objectContaining({ action: 'refused' }));
    expect(sb.auth.setSession).not.toHaveBeenCalled();
    expect(await validatePendingAuthCallbackAdmission({ id: 'a', email: 'account-a@example.com' }))
      .toEqual(expect.objectContaining({ gated: false }));
  });

  test('implicit callback type must match the bound flow kind', async () => {
    const nonce = await beginAuthFlow('recovery', 'victim@example.com');
    const url = `${implicitUrl(ACCESS, REFRESH, nonce)}&type=signup`;
    const sb = fakeSupabase();
    expect((await handleAuthDeepLink(url, { supabase: sb })).reason).toBe('wrong_flow_kind');
    expect(sb.auth.getUser).not.toHaveBeenCalled();
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
    const nonce = await beginAuthFlow('signup', 'victim@example.com');
    await handleAuthDeepLink(implicitUrl(ACCESS, REFRESH, nonce), { supabase: fakeSupabase() });
    await handleAuthDeepLink(implicitUrl(ATTACKER_ACCESS), { supabase: fakeSupabase() });
    const logged = JSON.stringify([mockLog.error.mock.calls, mockLog.info.mock.calls]);
    expect(logged).not.toContain(ACCESS);
    expect(logged).not.toContain(ATTACKER_ACCESS);
    expect(logged).not.toContain(REFRESH);
  });
});
