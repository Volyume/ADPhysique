/**
 * Native Sign in with Apple (App Store Guideline 4.8).
 *
 * Verifies the iOS path uses expo-apple-authentication's signInAsync and
 * exchanges the identity token via Supabase signInWithIdToken, that a user
 * cancel and a missing token are handled, and that any non-iOS platform falls
 * back to the web-OAuth flow so Android behaviour is unchanged.
 *
 * Robustness: getSupabaseClient() is a module-level singleton. In a shared CI
 * worker a sibling suite can initialise it before this suite runs (caching a
 * client/null that a later env-set can't undo). So each test does
 * jest.resetModules() and re-requires react-native, expo-apple-authentication
 * and ../supabase fresh, AFTER setting the env vars — guaranteeing a clean
 * singleton that initialises with a real (mocked) client.
 */
jest.mock('../observability', () => ({ instrumentSupabase: c => c }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { signInWithIdToken: jest.fn(), signInWithOAuth: jest.fn() },
  })),
}));

describe('signInWithApple', () => {
  let RN;
  let appleAuth;
  let signInWithApple;
  let client;

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';

    // Re-require everything fresh so they share one module graph with a clean
    // Supabase singleton, initialised now that the env vars are set.
    // eslint-disable-next-line global-require
    RN = require('react-native');
    RN.Platform.OS = 'ios';
    // eslint-disable-next-line global-require
    appleAuth = require('expo-apple-authentication');
    appleAuth.isAvailableAsync.mockResolvedValue(true);
    appleAuth.signInAsync.mockResolvedValue({ identityToken: 'apple-id-token' });

    // eslint-disable-next-line global-require
    const supabase = require('../supabase');
    signInWithApple = supabase.signInWithApple;
    client = supabase.getSupabaseClient();
    // spyOn works whether client.auth methods are the createClient-mock jest.fns
    // or (if the module mock ever fails to apply) a real client's methods.
    jest.spyOn(client.auth, 'signInWithIdToken').mockResolvedValue({ error: null });
    jest.spyOn(client.auth, 'signInWithOAuth').mockResolvedValue({ data: { url: null }, error: null });
  });

  afterAll(() => {
    if (RN) RN.Platform.OS = 'android';
  });

  test('iOS: exchanges the native Apple identity token via signInWithIdToken', async () => {
    const res = await signInWithApple();
    expect(appleAuth.signInAsync).toHaveBeenCalledTimes(1);
    expect(client.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-id-token' });
    expect(res).toEqual({ ok: true });
  });

  test('iOS: a user cancel returns { cancelled } and never exchanges a token', async () => {
    appleAuth.signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });
    const res = await signInWithApple();
    expect(res).toEqual({ cancelled: true });
    expect(client.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  test('iOS: a missing identity token surfaces an error, no exchange', async () => {
    appleAuth.signInAsync.mockResolvedValue({ identityToken: null });
    const res = await signInWithApple();
    expect(res.error).toBeTruthy();
    expect(client.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  test('iOS: a Supabase exchange error is surfaced', async () => {
    client.auth.signInWithIdToken.mockResolvedValue({ error: { message: 'bad token' } });
    const res = await signInWithApple();
    expect(res.error).toEqual({ message: 'bad token' });
  });

  test('non-iOS (Android): falls back to web OAuth, never touches the native module', async () => {
    RN.Platform.OS = 'android';
    await signInWithApple();
    expect(appleAuth.signInAsync).not.toHaveBeenCalled();
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple' }));
  });
});
