/**
 * Native Sign in with Apple (App Store Guideline 4.8).
 *
 * Verifies the iOS path uses expo-apple-authentication's signInAsync and
 * exchanges the identity token via Supabase signInWithIdToken, that a user
 * cancel and a missing token are handled, and that any non-iOS platform falls
 * back to the web-OAuth flow so Android behaviour is unchanged.
 *
 * The Supabase client is injected via _setClientForTests (the module's test
 * seam, mirroring playBilling's provider injection). Earlier versions tried
 * env vars + createClient mocks + resetModules; all were defeated by shared
 * jest workers where a sibling suite initialises the client singleton first.
 * Injection is deterministic in any worker order.
 */
const { Platform } = require('react-native');

// expo-apple-authentication is mapped to its mock via jest.moduleNameMapper.
const appleAuth = require('expo-apple-authentication');
const { signInWithApple, _setClientForTests } = require('../supabase');

describe('signInWithApple', () => {
  let auth;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    appleAuth.isAvailableAsync.mockResolvedValue(true);
    appleAuth.signInAsync.mockResolvedValue({ identityToken: 'apple-id-token' });
    auth = {
      signInWithIdToken: jest.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: null }, error: null }),
    };
    _setClientForTests({ auth });
  });

  afterAll(() => {
    Platform.OS = 'android';
    _setClientForTests(null);
  });

  test('iOS: exchanges the native Apple identity token via signInWithIdToken', async () => {
    const res = await signInWithApple();
    expect(appleAuth.signInAsync).toHaveBeenCalledTimes(1);
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-id-token' });
    expect(res).toEqual({ ok: true });
  });

  test('iOS: a user cancel returns { cancelled } and never exchanges a token', async () => {
    appleAuth.signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });
    const res = await signInWithApple();
    expect(res).toEqual({ cancelled: true });
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  test('iOS: a missing identity token surfaces an error, no exchange', async () => {
    appleAuth.signInAsync.mockResolvedValue({ identityToken: null });
    const res = await signInWithApple();
    expect(res.error).toBeTruthy();
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  test('iOS: a Supabase exchange error is surfaced', async () => {
    auth.signInWithIdToken.mockResolvedValue({ error: { message: 'bad token' } });
    const res = await signInWithApple();
    expect(res.error).toEqual({ message: 'bad token' });
  });

  test('iOS: Apple error 1000 (ERR_REQUEST_UNKNOWN) is flagged as device state so the UI can show the iCloud remedy (VOLYUME-18)', async () => {
    appleAuth.signInAsync.mockRejectedValue({
      code: 'ERR_REQUEST_UNKNOWN',
      message: 'The authorization attempt failed for an unknown reason',
    });
    const res = await signInWithApple();
    expect(res.error?.code).toBe('apple_device_state');
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  test('iOS: a concurrent second call is single-flighted, never starting a duplicate native request (VOLYUME-2B)', async () => {
    // Fabric can fire the native Apple button's onPress twice per tap. The
    // duplicate ASAuthorization request was always rejected by iOS with
    // error 1000, logging a sign-in error against every SUCCESSFUL sign-in.
    // The second overlapping call must return { duplicate: true } without
    // touching the native module or Supabase.
    let resolveSheet;
    appleAuth.signInAsync.mockImplementation(
      () => new Promise((resolve) => { resolveSheet = resolve; }),
    );
    const first = signInWithApple();
    // Let the first call pass isAvailableAsync and reach the native sheet.
    await new Promise((r) => setImmediate(r));
    const second = await signInWithApple();
    expect(second).toEqual({ duplicate: true });
    expect(appleAuth.signInAsync).toHaveBeenCalledTimes(1);
    resolveSheet({ identityToken: 'apple-id-token' });
    expect(await first).toEqual({ ok: true });
    expect(auth.signInWithIdToken).toHaveBeenCalledTimes(1);
    // The guard releases: a later, non-overlapping call runs normally.
    appleAuth.signInAsync.mockResolvedValue({ identityToken: 'apple-id-token' });
    expect(await signInWithApple()).toEqual({ ok: true });
  });

  test('non-iOS (Android): falls back to web OAuth, never touches the native module', async () => {
    Platform.OS = 'android';
    await signInWithApple();
    expect(appleAuth.signInAsync).not.toHaveBeenCalled();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple' }));
  });
});
