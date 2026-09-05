/**
 * D149 (founder, 2026-09-05): the stored-session probe behind the
 * fresh-install open. Pins that it reads the exact keychain item
 * supabase-js keeps the session under, and that every failure is
 * 'unknown' (never 'absent'), because 'absent' from a broken read would
 * open Welcome on a device that might be signed in.
 */
import * as SecureStore from 'expo-secure-store';
import { hasStoredAuthSession, storedAuthSessionKey } from '../supabase';

const URL_ENV = 'EXPO_PUBLIC_SUPABASE_URL';

describe('storedAuthSessionKey', () => {
  test('derives the supabase-js default key from the first hostname label', () => {
    expect(storedAuthSessionKey('https://abcdefgh.supabase.co')).toBe('sb-abcdefgh-auth-token');
    expect(storedAuthSessionKey('https://api.volyume.app/')).toBe('sb-api-auth-token');
  });

  test('is null when no URL is configured', () => {
    expect(storedAuthSessionKey('')).toBeNull();
    expect(storedAuthSessionKey(undefined)).toBeNull();
    expect(storedAuthSessionKey('not a url')).toBeNull();
  });
});

describe('hasStoredAuthSession', () => {
  const saved = process.env[URL_ENV];
  beforeEach(() => {
    process.env[URL_ENV] = 'https://abcdefgh.supabase.co';
    SecureStore.getItemAsync.mockClear();
  });
  afterAll(() => {
    if (saved === undefined) delete process.env[URL_ENV];
    else process.env[URL_ENV] = saved;
  });

  test('present when the keychain item holds a value', async () => {
    await SecureStore.setItemAsync('sb-abcdefgh-auth-token', '{"access_token":"x"}');
    await expect(hasStoredAuthSession()).resolves.toBe('present');
    await SecureStore.deleteItemAsync('sb-abcdefgh-auth-token');
  });

  test('absent when the keychain item is missing', async () => {
    await SecureStore.deleteItemAsync('sb-abcdefgh-auth-token');
    await expect(hasStoredAuthSession()).resolves.toBe('absent');
    // The same KEY_OPTS object the session adapter reads with (the mock
    // has no AFTER_FIRST_UNLOCK constant, so only the shape is pinned).
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      'sb-abcdefgh-auth-token',
      expect.objectContaining({}),
    );
    expect(SecureStore.getItemAsync.mock.calls[0][1]).toHaveProperty('keychainAccessible');
  });

  test('absent when no Supabase URL is configured (no session can exist)', async () => {
    delete process.env[URL_ENV];
    await expect(hasStoredAuthSession()).resolves.toBe('absent');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  test('unknown, never absent, when the keychain read throws', async () => {
    SecureStore.getItemAsync.mockImplementationOnce(() => Promise.reject(new Error('keychain locked')));
    await expect(hasStoredAuthSession()).resolves.toBe('unknown');
  });
});
