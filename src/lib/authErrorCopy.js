/**
 * Auth failure copy (E-5 / E-2, D96 Campaign 5).
 *
 * Every failure at the app's first action used to resolve to one sentence
 * ("That didn't go through. Try again.") or, worse, to "That email or
 * password is not right." A user on a train who reads "Works fully offline"
 * on Welcome and then cannot sign in was being told their details were
 * wrong. These helpers map the provider's raw message onto calm, plain,
 * accurate wording, and read the one signup response shape that means
 * "this email already has an account" rather than "we sent you a link".
 *
 * Pure and dependency-free: the raw string never reaches the user (FR-2),
 * and no message here ever names a Supabase/SDK internal.
 */

// Connection-shaped failures. React Native's fetch reports "Network request
// failed"; the SDK, the OS and the in-app browser add their own variants.
const NETWORK_RE = /network request failed|network error|networkerror|failed to fetch|fetch failed|timed? ?out|offline|no internet|econnreset|econnrefused|econnaborted|enotfound|etimedout|unable to (connect|resolve)|connection (was |is )?(failed|refused|error|lost|unavailable)/i;

// Supabase's per-request cooldown and hourly caps, e.g. "For security
// purposes, you can only request this after 51 seconds".
const RATE_LIMIT_RE = /only request this after|rate limit|too many requests|email rate limit exceeded/i;

export const AUTH_COPY = Object.freeze({
  // E-5: names connectivity, and repairs the apparent contradiction with
  // Welcome's "Works fully offline" trust row (this one step needs a line).
  network: 'You need an internet connection to create an account or sign in. Everything else works offline.',
  rateLimited: 'Too many attempts just now. Wait a minute, then try again.',
  badCredentials: 'That email or password is not right.',
  duplicate: 'That email already has an account. Try signing in instead.',
  unconfirmed: 'Check your email to confirm your account, then sign in.',
  weakPassword: 'Use a password of at least 6 characters.',
  fallback: "That didn't go through. Try again.",
});

/**
 * Map a provider error (or its message) onto one calm sentence.
 * @param {unknown} error an Error, a Supabase error object, or a string.
 * @returns {string} user-facing copy, never the raw provider text.
 */
export function authErrorMessage(error) {
  const raw = String((error && typeof error === 'object' ? error.message : error) || '');
  if (NETWORK_RE.test(raw)) return AUTH_COPY.network;
  if (RATE_LIMIT_RE.test(raw)) return AUTH_COPY.rateLimited;
  if (/invalid login credentials/i.test(raw)) return AUTH_COPY.badCredentials;
  if (/already registered|already been registered|user already exists/i.test(raw)) return AUTH_COPY.duplicate;
  if (/email not confirmed|confirm/i.test(raw)) return AUTH_COPY.unconfirmed;
  if (/password.*(6|characters|short)/i.test(raw)) return AUTH_COPY.weakPassword;
  return AUTH_COPY.fallback;
}

/**
 * E-2: with "Confirm email" ON and Supabase's email-enumeration protection
 * enabled, signing up with an address that already exists returns a user
 * object, NO session, and an EMPTY identities array instead of an error, so
 * the app promised a confirmation email that Supabase never sends. An empty
 * identities array is the documented duplicate signal; an absent array means
 * enumeration protection is off, in which case signUp returns an explicit
 * "User already registered" error that authErrorMessage already maps.
 * @param {any} data the signUp response's data object.
 * @returns {boolean} true when this signup was really an existing account.
 */
export function isDuplicateSignup(data) {
  const identities = data?.user?.identities;
  return Array.isArray(identities) && identities.length === 0;
}
