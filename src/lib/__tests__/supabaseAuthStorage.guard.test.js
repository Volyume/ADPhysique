/**
 * supabaseAuthStorage.guard.test.js
 *
 * Pins VOLYUME-2E: the Supabase auth-session SecureStore adapter must carry
 * keychainAccessible AFTER_FIRST_UNLOCK on every call. Without it, iOS
 * stores the session WHEN_UNLOCKED and any locked-phone background wake
 * (token auto-refresh, notification handling) fails the Keychain read with
 * "User interaction is not allowed"; the adapter swallows that to null and
 * Supabase can treat a signed-in user as signed out. The database key
 * already uses this accessibility (dbCrypto.js) for the same reason -- the
 * two must never diverge. Source-level guard: the adapter is module-private,
 * so the contract is pinned against the source.
 */

import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.join(__dirname, '..', 'supabase.js'),
  'utf8'
);

describe('Supabase auth session SecureStore accessibility (VOLYUME-2E)', () => {
  test('adapter defines AFTER_FIRST_UNLOCK options', () => {
    expect(src).toMatch(
      /const KEY_OPTS = \{ keychainAccessible: SecureStore\.AFTER_FIRST_UNLOCK \}/
    );
  });

  test('every SecureStore call in the adapter passes the options', () => {
    expect(src).toMatch(/SecureStore\.getItemAsync\(key, KEY_OPTS\)/);
    expect(src).toMatch(/SecureStore\.setItemAsync\(key, value, KEY_OPTS\)/);
    expect(src).toMatch(/SecureStore\.deleteItemAsync\(key, KEY_OPTS\)/);
    // No bare calls may remain anywhere in the module.
    expect(src).not.toMatch(/SecureStore\.getItemAsync\(key\)/);
    expect(src).not.toMatch(/SecureStore\.setItemAsync\(key, value\)/);
    expect(src).not.toMatch(/SecureStore\.deleteItemAsync\(key\)/);
  });
});
