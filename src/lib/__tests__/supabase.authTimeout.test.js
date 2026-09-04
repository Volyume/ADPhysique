/**
 * D141 item 1 (2026-09-04): every sign-in exchange with Supabase is bounded.
 *
 * The defect: Google/Apple token exchange, email sign-in and sign-up had no
 * network timeout (every other network call in the app does), so a captive
 * portal or a socket that never answers left the sign-in button disabled
 * for as long as the OS kept the request open, with no toast.
 *
 * What this pins, against the real module:
 *   - withAuthTimeout rejects after its bound with a network-shaped message
 *     that authErrorMessage maps to the calm connectivity sentence;
 *   - a hung signInWithPassword / signUp resolves to { error } instead of
 *     hanging, and a fast one is untouched;
 *   - the Google and Apple token exchanges go through the bound (source);
 *   - the steps the USER is inside of (account picker, Apple sheet, Play
 *     Services dialogue) are NOT bounded (source).
 */
const fs = require('fs');
const path = require('path');

jest.mock('../authCallbackState', () => ({
  beginAuthFlow: jest.fn(async () => 'nonce-1'),
  clearAuthFlow: jest.fn(async () => {}),
}));

const {
  withAuthTimeout, signInWithEmail, signUpWithEmail, _setClientForTests,
  AUTH_TIMEOUT_MESSAGE, AUTH_NETWORK_TIMEOUT_MS,
} = require('../supabase');
const { authErrorMessage, AUTH_COPY } = require('../authErrorCopy');

const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'supabase.js'), 'utf8');
const never = () => new Promise(() => {});

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); _setClientForTests(null); });

describe('withAuthTimeout', () => {
  test('a hung promise rejects at the bound with a network-shaped message', async () => {
    const p = withAuthTimeout(never(), 1000);
    const settled = p.catch((e) => e);
    jest.advanceTimersByTime(1000);
    const err = await settled;
    expect(err.message).toBe(AUTH_TIMEOUT_MESSAGE);
    expect(authErrorMessage(err)).toBe(AUTH_COPY.network);
  });

  test('a fast promise is returned untouched and the timer is cleared', async () => {
    await expect(withAuthTimeout(Promise.resolve({ ok: 1 }), 1000)).resolves.toEqual({ ok: 1 });
    expect(jest.getTimerCount()).toBe(0);
  });

  test('the default bound matches the sign-out push bound (20s)', () => {
    expect(AUTH_NETWORK_TIMEOUT_MS).toBe(20000);
  });
});

describe('email sign-in and sign-up cannot hang', () => {
  test('a hung signInWithPassword resolves to a calm connectivity error', async () => {
    _setClientForTests({ auth: { signInWithPassword: jest.fn(never) } });
    const p = signInWithEmail('a@b.c', 'secret123');
    jest.advanceTimersByTime(AUTH_NETWORK_TIMEOUT_MS);
    const res = await p;
    expect(res.data).toBeNull();
    expect(authErrorMessage(res.error)).toBe(AUTH_COPY.network);
  });

  test('a fast signInWithPassword result passes straight through', async () => {
    const result = { data: { session: {} }, error: null };
    _setClientForTests({ auth: { signInWithPassword: jest.fn(async () => result) } });
    await expect(signInWithEmail('a@b.c', 'secret123')).resolves.toBe(result);
  });

  test('a hung signUp resolves to a calm connectivity error and clears the auth flow', async () => {
    _setClientForTests({ auth: { signUp: jest.fn(never) } });
    const { clearAuthFlow } = require('../authCallbackState');
    const p = signUpWithEmail('a@b.c', 'secret123');
    await Promise.resolve();
    jest.advanceTimersByTime(AUTH_NETWORK_TIMEOUT_MS);
    const res = await p;
    expect(authErrorMessage(res.error)).toBe(AUTH_COPY.network);
    expect(clearAuthFlow).toHaveBeenCalled();
  });
});

describe('native token exchanges are bounded; user-facing steps are not', () => {
  test('Google and Apple signInWithIdToken go through withAuthTimeout', () => {
    expect(SRC).toMatch(/withAuthTimeout\(c\.auth\.signInWithIdToken\(\{ provider: 'google'/);
    expect(SRC).toMatch(/withAuthTimeout\(c\.auth\.signInWithIdToken\(\{ provider: 'apple'/);
  });

  test('the account picker, the Apple sheet and Play Services are never bounded', () => {
    expect(SRC).not.toMatch(/withAuthTimeout\(GoogleSignin\.signIn\(/);
    expect(SRC).not.toMatch(/withAuthTimeout\(GoogleSignin\.hasPlayServices/);
    expect(SRC).not.toMatch(/withAuthTimeout\(AppleAuthentication\.signInAsync/);
  });
});
