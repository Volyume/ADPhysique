/**
 * appleIdentity.js
 *
 * Founder report (2026-08-19): onboarding asks for a first name on the screen
 * straight after the Sign in with Apple button, when Apple has already supplied
 * it. So don't ask. This module answers the two questions that needs:
 *
 *   isAppleUser(user)  - is this an Apple account? (hide the field)
 *   appleFirstName(..) - what is their name, so we never need to ask?
 *
 * Apple hands the name over on the FIRST authorisation for an Apple ID and
 * returns null on every sign-in after that, so the name is remembered from the
 * moment it arrives (noteAppleCredential, called by signInWithApple) until
 * onboarding writes it to the profile.
 *
 * Pure and I/O-free apart from that one in-memory note.
 */

/** Trimmed string, or null for anything empty/absent/not-a-string. */
function clean(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Leading token of a name: Supabase carries "Ada Lovelace", we store "Ada". */
function firstToken(value) {
  const v = clean(value);
  return v ? clean(v.split(/\s+/)[0]) : null;
}

const APPLE_RELAY_SUFFIX = '@privaterelay.appleid.com';

/**
 * Is this one of Apple's Hide My Email relay addresses?
 *
 * They look like ab12cd34ef@privaterelay.appleid.com: a random token, not a
 * person. Anywhere that falls back to the local part of an e-mail address for
 * a display name has to skip these, or the athlete's profile header greets
 * them as "ab  cd  ef".
 *
 * @param {string|null|undefined} email
 * @returns {boolean}
 */
export function isApplePrivateRelayEmail(email) {
  const e = clean(email);
  return !!e && e.toLowerCase().endsWith(APPLE_RELAY_SUFFIX);
}

/**
 * Is this account signed in through Apple?
 *
 * Read from the Supabase auth user, NOT from a flag set during sign-in. The
 * first attempt used such a flag on ProOnboardingScreen and it was dead
 * code: that screen only mounts once a session exists, so the sign-in step it
 * lived on never rendered and the field stayed visible for every real user.
 *
 * Several signals, any of which is proof. A false negative puts the box back;
 * a false positive only hides an optional field that Settings -> Profile still
 * edits.
 *
 * @param {object|null} sessionUser the store's `user` (the Supabase auth user)
 * @returns {boolean}
 */
export function isAppleUser(sessionUser) {
  if (!sessionUser || typeof sessionUser !== 'object') return false;
  const app = sessionUser.app_metadata ?? {};
  if (app.provider === 'apple') return true;
  if (Array.isArray(app.providers) && app.providers.includes('apple')) return true;
  if (Array.isArray(sessionUser.identities)
    && sessionUser.identities.some((i) => i?.provider === 'apple')) return true;
  // A private relay address can only have come from Apple.
  return isApplePrivateRelayEmail(sessionUser.email);
}

// What Apple handed over on the first authorisation. Sign-in completes through
// RootNavigator's auth listener rather than signInWithApple's return, and two
// of the three screens calling it ignored the return value, so the name is kept
// here instead of being passed along.
let _givenName = null;

/** Called by signInWithApple. A later null never erases a name already given. */
export function noteAppleCredential({ givenName = null } = {}) {
  _givenName = clean(givenName) ?? _givenName;
}

/** Sign-out: the next account must not inherit this one's name. */
export function clearAppleCredential() {
  _givenName = null;
}

/**
 * The first name to use for an Apple athlete, so they are never asked for it.
 * The stored profile wins outright - a name they set themselves is never
 * overwritten. Then what Apple just gave, then what Supabase kept from the
 * Apple identity on the auth user (the Android web flow populates this).
 *
 * @returns {string|null} null means "we do not know", which is a nameless
 *   greeting, never a prompt.
 */
export function appleFirstName({ sessionUser = null, storedProfile = null } = {}) {
  const meta = sessionUser?.user_metadata ?? {};
  return firstToken(storedProfile?.firstName)
    ?? firstToken(_givenName)
    ?? firstToken(meta.given_name)
    ?? firstToken(meta.full_name)
    ?? firstToken(meta.name)
    ?? null;
}
