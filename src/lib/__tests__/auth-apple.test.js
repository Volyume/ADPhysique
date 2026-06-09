/**
 * Native Sign in with Apple (App Store Guideline 4.8).
 *
 * Verifies the iOS path uses expo-apple-authentication's signInAsync and
 * exchanges the identity token via Supabase signInWithIdToken, that a user
 * cancel and a missing token are handled, and that any non-iOS platform falls
 * back to the web-OAuth flow so Android behaviour is unchanged.
 *
 * We spy on the real Supabase client instance (rather than mocking
 * createClient) because a sibling suite mocks @supabase/supabase-js and that
 * registration leaks across files under runInBand; spying on the singleton's
 * auth methods is immune to which createClient ends up loaded.
 */
const { Platform } = require('react-native');

// Identity-wrap the observability proxy so client.auth is the raw auth object
// we can spy on (the proxy is only for .from() breadcrumbs in production).
jest.mock('../observability', () => ({ instrumentSupabase: c => c }));

// getSupabaseClient() returns null without these; set before requiring supabase.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';

// expo-apple-authentication is mapped to its mock via jest.moduleNameMapper.
const appleAuth = require('expo-apple-authentication');
// eslint-disable-next-line import/first
const { signInWithApple, getSupabaseClient } = require('../supabase');

describe('signInWithApple', () => {
  const client = getSupabaseClient();
  let idTokenSpy;
  let oauthSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    appleAuth.isAvailableAsync.mockResolvedValue(true);
    appleAuth.signInAsync.mockResolvedValue({ identityToken: 'apple-id-token' });
    idTokenSpy = jest.spyOn(client.auth, 'signInWithIdToken').mockResolvedValue({ error: null });
    oauthSpy = jest
      .spyOn(client.auth, 'signInWithOAuth')
      .mockResolvedValue({ data: { url: null }, error: null });
  });

  afterEach(() => {
    idTokenSpy.mockRestore();
    oauthSpy.mockRestore();
  });

  afterAll(() => {
    Platform.OS = 'android';
  });

  test('iOS: exchanges the native Apple identity token via signInWithIdToken', async () => {
    const res = await signInWithApple();
    expect(appleAuth.signInAsync).toHaveBeenCalledTimes(1);
    expect(idTokenSpy).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-id-token' });
    expect(res).toEqual({ ok: true });
  });

  test('iOS: a user cancel returns { cancelled } and never exchanges a token', async () => {
    appleAuth.signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });
    const res = await signInWithApple();
    expect(res).toEqual({ cancelled: true });
    expect(idTokenSpy).not.toHaveBeenCalled();
  });

  test('iOS: a missing identity token surfaces an error, no exchange', async () => {
    appleAuth.signInAsync.mockResolvedValue({ identityToken: null });
    const res = await signInWithApple();
    expect(res.error).toBeTruthy();
    expect(idTokenSpy).not.toHaveBeenCalled();
  });

  test('iOS: a Supabase exchange error is surfaced', async () => {
    idTokenSpy.mockResolvedValue({ error: { message: 'bad token' } });
    const res = await signInWithApple();
    expect(res.error).toEqual({ message: 'bad token' });
  });

  test('non-iOS (Android): falls back to web OAuth, never touches the native module', async () => {
    Platform.OS = 'android';
    await signInWithApple();
    expect(appleAuth.signInAsync).not.toHaveBeenCalled();
    expect(oauthSpy).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple' }));
  });
});
