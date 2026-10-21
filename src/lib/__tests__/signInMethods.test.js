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
    // The consent conditions moved into canOpenPasswordRecovery (review fix,
    // which also waits for a workout to end); pin both the call and the gate.
    expect(nav).toMatch(/recoveryReady = canOpenPasswordRecovery\(\{ user, firstRunComplete, healthConsent, workoutActive \}\)/);
    expect(read('src/lib/passwordRecoveryState.js'))
      .toMatch(/return !!user && !user\.isLocal && !!firstRunComplete && healthConsent === true && !workoutActive;/);
  });
  // 2026-10-21: a placeholder iosUrlScheme ("...REPLACE_WITH_IOS_CLIENT_ID")
  // got iOS build 94 (3.3.0) rejected by App Store Connect (ITMS-90158: URL
  // schemes must start with a letter and hold only letters, digits, '.', '-'
  // and '+'). The plugin stays option-free, as it was for every build up to
  // 3.2.0, until the founder has the real reversed iOS client ID; then the
  // option and GOOGLE_IOS_CLIENT_ID go in together.
  test('app.json never carries a placeholder, and every URL scheme is one Apple accepts', () => {
    const raw = read('app.json');
    expect(raw).not.toMatch(/REPLACE_WITH|YOUR_|PLACEHOLDER/i);
    const expo = JSON.parse(raw).expo;
    const schemes = [];
    if (expo.scheme) schemes.push(...[].concat(expo.scheme));
    for (const t of expo.ios?.infoPlist?.CFBundleURLTypes || []) schemes.push(...(t.CFBundleURLSchemes || []));
    for (const p of expo.plugins || []) {
      if (Array.isArray(p) && p[1] && typeof p[1].iosUrlScheme === 'string') schemes.push(p[1].iosUrlScheme);
    }
    expect(schemes.length).toBeGreaterThan(0);
    for (const sch of schemes) expect(sch).toMatch(/^[A-Za-z][A-Za-z0-9.+-]*$/);
  });
  test('the Google sign-in plugin has an iOS URL scheme only together with a real iOS client ID', () => {
    const expo = JSON.parse(read('app.json')).expo;
    const entry = (expo.plugins || []).find((p) => (Array.isArray(p) ? p[0] : p) === '@react-native-google-signin/google-signin');
    expect(entry).toBeTruthy();
    const scheme = Array.isArray(entry) ? entry[1]?.iosUrlScheme : null;
    const configured = /GOOGLE_IOS_CLIENT_ID\s*=\s*'[^']+'/.test(read('src/lib/supabase.js'));
    if (scheme) {
      expect(scheme).toMatch(/^com\.googleusercontent\.apps\.[0-9]+-[a-z0-9]+$/);
      expect(configured).toBe(true);
    } else {
      expect(configured).toBe(false);
    }
  });
  test('sign-in screen carries the Apple hint', () => {
    expect(read('src/components/auth/AuthSheet.js')).toMatch(/If you signed up with Apple, use Apple to sign in\./);
  });
});
