/**
 * E-5 / E-2 (D96 Campaign 5). The app's very first action is an account, and
 * every failure of it used to read as either "that didn't go through" or, at
 * the email form, "that email or password is not right" — the second of which
 * blames the user for a dead connection or for an account that already exists.
 *
 * This suite pins the two decisions that copy depends on:
 *   - a connection-shaped failure names connectivity, never credentials,
 *   - the one signup response shape that means "this address already has an
 *     account" is read as exactly that, so the app never promises a
 *     confirmation email Supabase does not send.
 * The raw provider string must never appear in anything returned here.
 */
import { authErrorMessage, isDuplicateSignup, AUTH_COPY } from '../authErrorCopy';

describe('authErrorMessage: a connection failure is not a wrong password', () => {
  const networkShapes = [
    'Network request failed',
    'TypeError: Network request failed',
    'NetworkError when attempting to fetch resource.',
    'Failed to fetch',
    'fetch failed',
    'request timed out',
    'The request timeout',
    'connect ECONNREFUSED 127.0.0.1:443',
    'getaddrinfo ENOTFOUND sujrylzzxcqxxfygptns.supabase.co',
    'Unable to connect to the server',
    'The connection was lost.',
  ];

  test.each(networkShapes)('%s names connectivity', (raw) => {
    expect(authErrorMessage(new Error(raw))).toBe(AUTH_COPY.network);
    expect(authErrorMessage({ message: raw })).toBe(AUTH_COPY.network);
    expect(authErrorMessage(raw)).toBe(AUTH_COPY.network);
  });

  test('the connectivity sentence also answers Welcome\'s "Works fully offline" row', () => {
    // The trust row is true for the rest of the app, so the copy must say
    // which part needs a line rather than contradict it.
    expect(AUTH_COPY.network).toMatch(/internet connection/i);
    expect(AUTH_COPY.network).toMatch(/works offline/i);
  });

  test('a network failure never reads as bad credentials', () => {
    expect(authErrorMessage(new Error('Network request failed'))).not.toBe(AUTH_COPY.badCredentials);
  });
});

describe('authErrorMessage: the mapped provider cases keep their wording', () => {
  test('genuinely wrong details still say so', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe(AUTH_COPY.badCredentials);
  });

  test('an explicit duplicate points at signing in', () => {
    expect(authErrorMessage({ message: 'User already registered' })).toBe(AUTH_COPY.duplicate);
    expect(AUTH_COPY.duplicate).toMatch(/sign(ing)? in/i);
  });

  test('an unconfirmed account is told to confirm', () => {
    expect(authErrorMessage({ message: 'Email not confirmed' })).toBe(AUTH_COPY.unconfirmed);
  });

  test('a short password is named', () => {
    expect(authErrorMessage({ message: 'Password should be at least 6 characters' })).toBe(AUTH_COPY.weakPassword);
  });

  test('the Supabase cooldown asks for a wait, not a retry loop', () => {
    expect(authErrorMessage({ message: 'For security purposes, you can only request this after 51 seconds' }))
      .toBe(AUTH_COPY.rateLimited);
    expect(authErrorMessage({ message: 'Email rate limit exceeded' })).toBe(AUTH_COPY.rateLimited);
  });

  test('anything else gets the calm fallback, never the raw text', () => {
    const raw = 'AuthApiError: internal_server_error {"code":500}';
    expect(authErrorMessage({ message: raw })).toBe(AUTH_COPY.fallback);
    expect(authErrorMessage(null)).toBe(AUTH_COPY.fallback);
    expect(authErrorMessage(undefined)).toBe(AUTH_COPY.fallback);
    expect(authErrorMessage({})).toBe(AUTH_COPY.fallback);
  });

  test('no message ever leaks the provider string', () => {
    for (const copy of Object.values(AUTH_COPY)) {
      expect(copy).not.toMatch(/supabase|auth ?api|sdk|http|\{|\}/i);
    }
  });
});

describe('isDuplicateSignup: enumeration protection is read honestly (E-2)', () => {
  test('an empty identities array means the address already has an account', () => {
    expect(isDuplicateSignup({ user: { id: 'u1', identities: [] }, session: null })).toBe(true);
  });

  test('a real new signup is not a duplicate', () => {
    expect(isDuplicateSignup({ user: { id: 'u1', identities: [{ provider: 'email' }] }, session: null })).toBe(false);
  });

  test('an absent identities array is NOT treated as a duplicate', () => {
    // Enumeration protection off: signUp returns an explicit "User already
    // registered" error instead, which authErrorMessage maps. Guessing here
    // would tell a genuine new user to sign in to an account they lack.
    expect(isDuplicateSignup({ user: { id: 'u1' }, session: null })).toBe(false);
    expect(isDuplicateSignup({ user: null })).toBe(false);
    expect(isDuplicateSignup(null)).toBe(false);
    expect(isDuplicateSignup(undefined)).toBe(false);
  });
});
