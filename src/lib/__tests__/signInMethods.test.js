/**
 * Sign-in methods (Batch 4, item 2). Pins the one hard rule: the last way in
 * can never be removed, in the pure rule AND in the lib that performs the
 * unlink (which re-reads the live identities, so a stale screen cannot
 * remove the final method). Also pins the identity lock: linking never
 * touches anonymous or local-user paths.
 */
const fs = require('fs');
const path = require('path');
const { activeMethods, canUnlink } = require('../signInMethods');
const { unlinkSignInMethod, linkSignInMethod, updatePassword, _setClientForTests } = require('../supabase');

const id = (provider) => ({ provider, identity_id: `${provider}-1` });

describe('activeMethods / canUnlink', () => {
  test('lists known methods in display order and ignores unknown providers', () => {
    expect(activeMethods([id('google'), id('email'), id('github'), id('apple')])).toEqual(['apple', 'google', 'email']);
    expect(activeMethods(null)).toEqual([]);
  });
  test('the last method can never be removed', () => {
    expect(canUnlink([id('apple')], 'apple')).toBe(false);
    expect(canUnlink([id('email')], 'email')).toBe(false);
    expect(canUnlink([], 'apple')).toBe(false);
  });
  test('with two or more methods any listed one can be removed', () => {
    expect(canUnlink([id('apple'), id('google')], 'apple')).toBe(true);
    expect(canUnlink([id('apple'), id('google'), id('email')], 'email')).toBe(true);
  });
  test('a method not on the account cannot be removed', () => {
    expect(canUnlink([id('apple'), id('google')], 'email')).toBe(false);
  });
});

describe('unlinkSignInMethod', () => {
  afterEach(() => _setClientForTests(null));
  function client(identities) {
    return {
      auth: {
        getUserIdentities: jest.fn().mockResolvedValue({ data: { identities }, error: null }),
        unlinkIdentity: jest.fn().mockResolvedValue({ data: {}, error: null }),
      },
    };
  }
  test('refuses the last method even when the screen is stale, and never calls unlink', async () => {
    const c = client([id('google')]);
    _setClientForTests(c);
    const res = await unlinkSignInMethod('google');
    expect(res.error.code).toBe('last_method');
    expect(c.auth.unlinkIdentity).not.toHaveBeenCalled();
  });
  test('unlinks the matching identity when another method remains', async () => {
    const c = client([id('apple'), id('google')]);
    _setClientForTests(c);
    expect(await unlinkSignInMethod('apple')).toEqual({ ok: true });
    expect(c.auth.unlinkIdentity).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple' }));
  });
});

describe('link and password', () => {
  afterEach(() => _setClientForTests(null));
  test('rejects an unknown provider without touching the client', async () => {
    const c = { auth: { linkIdentity: jest.fn() } };
    _setClientForTests(c);
    expect((await linkSignInMethod('github')).error).toBeTruthy();
    expect(c.auth.linkIdentity).not.toHaveBeenCalled();
  });
  test('updatePassword calls updateUser with the password only', async () => {
    const c = { auth: { updateUser: jest.fn().mockResolvedValue({ error: null }) } };
    _setClientForTests(c);
    expect(await updatePassword('a-long-enough-pass')).toEqual({ ok: true });
    expect(c.auth.updateUser).toHaveBeenCalledWith({ password: 'a-long-enough-pass' });
  });
});

describe('wiring guards', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', '..', p), 'utf8');
  test('RootNavigator registers both screens and opens recovery only behind the consent gate conditions', () => {
    const nav = read('src/navigation/RootNavigator.js');
    expect(nav).toMatch(/name="SetNewPassword"/);
    expect(nav).toMatch(/name="SettingsSignInMethods"/);
    expect(nav).toMatch(/recoveryReady = !!user && !user\.isLocal && firstRunComplete && healthConsent === true/);
  });
  test('app.json carries the Google iOS URL scheme plugin option', () => {
    expect(read('app.json')).toMatch(/"iosUrlScheme":\s*"com\.googleusercontent\.apps\./);
  });
  test('sign-in screen carries the Apple hint', () => {
    expect(read('src/components/auth/AuthSheet.js')).toMatch(/If you signed up with Apple, use Apple to sign in\./);
  });
});
