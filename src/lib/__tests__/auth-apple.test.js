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
const {
  readAppleCredential, clearAppleCredential, loadAppleCredential,
} = require('../appleIdentity');

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
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1', user_metadata: {} } } }),
      updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    _setClientForTests({ auth });
    clearAppleCredential();
  });

  afterAll(() => {
    Platform.OS = 'android';
    _setClientForTests(null);
  });

  test('iOS: exchanges the native Apple identity token via signInWithIdToken', async () => {
    const res = await signInWithApple();
    expect(appleAuth.signInAsync).toHaveBeenCalledTimes(1);
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-id-token' });
    // Guideline 4: no name/email in the credential (later sign-in) -> nulls.
    expect(res).toEqual({ ok: true, appleGivenName: null, appleEmail: null });
  });

  test('iOS: returns the name and email Apple provides on first sign-in (Guideline 4, no re-prompt)', async () => {
    appleAuth.signInAsync.mockResolvedValueOnce({
      identityToken: 'apple-id-token',
      fullName: { givenName: 'Allan', familyName: 'Douglas' },
      email: 'allan@example.com',
    });
    const res = await signInWithApple();
    expect(res).toEqual({ ok: true, appleGivenName: 'Allan', appleEmail: 'allan@example.com' });
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
    // No fullName/email in this mock credential -> Guideline 4 fields are null.
    expect(await first).toEqual({ ok: true, appleGivenName: null, appleEmail: null });
    expect(auth.signInWithIdToken).toHaveBeenCalledTimes(1);
    // The guard releases: a later, non-overlapping call runs normally.
    appleAuth.signInAsync.mockResolvedValue({ identityToken: 'apple-id-token' });
    expect(await signInWithApple()).toEqual({ ok: true, appleGivenName: null, appleEmail: null });
  });

  test('non-iOS (Android): falls back to web OAuth, never touches the native module', async () => {
    Platform.OS = 'android';
    await signInWithApple();
    expect(appleAuth.signInAsync).not.toHaveBeenCalled();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple' }));
  });
});

/**
 * Apple discloses the name ONCE per Apple ID, ever
 * (node_modules/expo-apple-authentication/src/AppleAuthentication.types.ts:
 * fullName "May be null ... if this is not the first time the user has signed
 * into your app"). So the single job of that one moment is to put the name
 * somewhere it cannot be lost, and these tests are about that, not about the
 * return value - which two of the three calling screens ignored.
 */
describe('signInWithApple keeps the name Apple will never send again', () => {
  let auth;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    appleAuth.isAvailableAsync.mockResolvedValue(true);
    auth = {
      signInWithIdToken: jest.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1', user_metadata: {} } } }),
      updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
    _setClientForTests({ auth });
    clearAppleCredential();
  });

  afterAll(() => {
    Platform.OS = 'android';
    _setClientForTests(null);
    clearAppleCredential();
  });

  test('the credential is stashed, so a screen that ignores the return value still gets it', async () => {
    appleAuth.signInAsync.mockResolvedValueOnce({
      identityToken: 'apple-id-token',
      fullName: { givenName: 'Allan', familyName: 'Douglas' },
      email: 'allan@example.com',
    });
    await signInWithApple();
    expect(readAppleCredential()).toEqual({ givenName: 'Allan', email: 'allan@example.com' });
  });

  test('it reaches disk BEFORE the call returns, not on a floating promise', async () => {
    // The window this closes is the whole of onboarding. If the write were left
    // unawaited, a kill moments later would still lose the name.
    appleAuth.signInAsync.mockResolvedValueOnce({
      identityToken: 'apple-id-token',
      fullName: { givenName: 'Allan' },
      email: 'allan@example.com',
    });
    await signInWithApple();
    // eslint-disable-next-line global-require
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem('@volyume_apple_credential_v1');
    expect(JSON.parse(raw).givenName).toBe('Allan');
  });

  test('the name is written to the auth user too, which is what survives a reinstall', async () => {
    // Apple's identity token carries the e-mail but not the name, and
    // signInWithIdToken has no field for one, so Supabase cannot learn it by
    // itself on the native flow. A reviewer who deletes and reinstalls has no
    // local disk cache and no users_profile row; the auth user is all that is
    // left, so the name has to be put there deliberately.
    appleAuth.signInAsync.mockResolvedValueOnce({
      identityToken: 'apple-id-token',
      fullName: { givenName: 'Allan' },
      email: 'allan@example.com',
    });
    await signInWithApple();
    expect(auth.updateUser).toHaveBeenCalledWith({ data: { given_name: 'Allan' } });
  });

  test('a name already on the auth user is never overwritten', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', user_metadata: { full_name: 'Bear Grylls' } } } });
    appleAuth.signInAsync.mockResolvedValueOnce({
      identityToken: 'apple-id-token',
      fullName: { givenName: 'Allan' },
    });
    await signInWithApple();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  test('a REPEAT sign-in writes nothing: Apple sends null, and null must not erase', async () => {
    appleAuth.signInAsync.mockResolvedValueOnce({
      identityToken: 'apple-id-token',
      fullName: { givenName: 'Allan' },
    });
    await signInWithApple();

    appleAuth.signInAsync.mockResolvedValueOnce({ identityToken: 'apple-id-token' });
    await signInWithApple();

    expect(auth.updateUser).toHaveBeenCalledTimes(1);
    expect(readAppleCredential().givenName).toBe('Allan');
  });

  test('a failed metadata write never fails the sign-in', async () => {
    auth.updateUser.mockRejectedValue(new Error('network'));
    appleAuth.signInAsync.mockResolvedValueOnce({
      identityToken: 'apple-id-token',
      fullName: { givenName: 'Allan' },
      email: 'allan@example.com',
    });
    const res = await signInWithApple();
    expect(res.ok).toBe(true);
    // The disk copy still carries it.
    await loadAppleCredential();
    expect(readAppleCredential().givenName).toBe('Allan');
  });

  test('an athlete who refused the name is not blocked and nothing is written', async () => {
    appleAuth.signInAsync.mockResolvedValueOnce({
      identityToken: 'apple-id-token',
      fullName: { givenName: null },
      email: null,
    });
    const res = await signInWithApple();
    expect(res).toEqual({ ok: true, appleGivenName: null, appleEmail: null });
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(readAppleCredential()).toEqual({ givenName: null, email: null });
  });
});
