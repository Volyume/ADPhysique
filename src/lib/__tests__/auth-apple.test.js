/**
 * Native Sign in with Apple (App Store Guideline 4.8).
 *
 * Verifies the iOS path uses expo-apple-authentication's signInAsync and
 * exchanges the identity token via Supabase signInWithIdToken, that a user
 * cancel and a missing token are handled, and that any non-iOS platform falls
 * back to the web-OAuth flow so Android behaviour is unchanged.
 *
 * Robustness: this suite is made immune to cross-file state in a shared jest
 * worker (a sibling suite mocks @supabase/supabase-js and mutates process.env).
 * It (1) re-asserts the Supabase env vars in beforeEach, (2) re-fetches the
 * client in beforeEach (not at collection time), and (3) spies on the live
 * client's auth methods — which works whether the createClient mock below
 * applied (parallel runs) or the real module leaked in (a --runInBand quirk).
 */
const { Platform } = require('react-native');

// Identity-wrap the observability proxy so client.auth is the raw auth object.
jest.mock('../observability', () => ({ instrumentSupabase: c => c }));

// Deterministic fake client so the happy path never hits the network.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { signInWithIdToken: jest.fn(), signInWithOAuth: jest.fn() },
  })),
}));

// expo-apple-authentication is mapped to its mock via jest.moduleNameMapper.
const appleAuth = require('expo-apple-authentication');
const { signInWithApple, getSupabaseClient } = require('../supabase');

describe('signInWithApple', () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-assert every test: a sibling suite in the same worker can delete these,
    // and getSupabaseClient() returns null without them.
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
    Platform.OS = 'ios';
    appleAuth.isAvailableAsync.mockResolvedValue(true);
    appleAuth.signInAsync.mockResolvedValue({ identityToken: 'apple-id-token' });

    client = getSupabaseClient();
    jest.spyOn(client.auth, 'signInWithIdToken').mockResolvedValue({ error: null });
    jest.spyOn(client.auth, 'signInWithOAuth').mockResolvedValue({ data: { url: null }, error: null });
  });

  afterAll(() => { Platform.OS = 'android'; });

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
    Platform.OS = 'android';
    await signInWithApple();
    expect(appleAuth.signInAsync).not.toHaveBeenCalled();
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple' }));
  });
});
