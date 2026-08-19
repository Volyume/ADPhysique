/**
 * appleIdentity.js
 *
 * Resolves the name and e-mail an Apple-authenticated user already gave us,
 * so the app never asks them for either again.
 *
 * WHY THIS EXISTS. App Review rejected Volyume twice on the same sentence:
 *
 *   "The app requires users to provide their name and/or email address after
 *    using Sign in with Apple. This information is already provided by the
 *    Authentication Services framework."
 *
 * The trap is that Apple hands over `fullName` and `email` on the FIRST
 * authorisation for an Apple ID and returns null for both on every sign-in
 * after that. Any fix that reads only the credential therefore works once, on
 * the developer's fresh test account, and fails for a reviewer who signs in
 * again or re-tests after a delete and reinstall. That is precisely how the
 * 2026-07-21 pre-fill attempt passed local testing and still got rejected.
 *
 * So resolution reads three sources, in a fixed order of authority:
 *
 *   1. THE STORED PROFILE. Whatever the athlete already has wins outright,
 *      including a name they typed or edited themselves in Settings. This
 *      function can only ever FILL A GAP; it must never overwrite a real
 *      value with an older one from a provider.
 *   2. THE CREDENTIAL, when Apple actually supplied it (first authorisation).
 *   3. THE SUPABASE SESSION USER. Supabase persists the name and e-mail out
 *      of the Apple identity token onto the auth user, so this is the durable
 *      source that survives the credential going null on repeat sign-ins.
 *
 * PRIVATE RELAY IS A REAL ADDRESS. An @privaterelay.appleid.com address is
 * exactly as valid as any other and is deliberately passed through untouched.
 * Nothing here validates, filters or flags an e-mail, because doing so is the
 * other half of what Apple rejects: asking a relay user for a "real" address.
 *
 * Pure and I/O-free, so the precedence can be tested without a session, a
 * database or a mounted screen. Callers persist the result.
 */

/** Trimmed string, or null for anything empty/absent/not-a-string. */
function clean(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * First name out of a full name. Apple's own field is `givenName`, but the
 * Supabase fallback carries `full_name`/`name` ("Ada Lovelace"), and the
 * profile stores a FIRST name, so take the leading token. Anything already
 * single-token passes through unchanged.
 */
function firstToken(value) {
  const v = clean(value);
  if (!v) return null;
  return clean(v.split(/\s+/)[0]);
}

/**
 * What the athlete's profile should carry after an Apple sign-in.
 *
 * @param {object}  [args]
 * @param {string|null} [args.credentialGivenName] Apple's givenName, first auth only
 * @param {string|null} [args.credentialEmail]     Apple's email, first auth only
 * @param {object|null} [args.sessionUser]         the Supabase auth user
 * @param {object|null} [args.storedProfile]       the profile already on device
 * @returns {{ firstName: string|null, email: string|null }} resolved values;
 *   a null means "we still do not know", NOT "clear what is stored".
 */
export function resolveAppleIdentity({
  credentialGivenName = null,
  credentialEmail = null,
  sessionUser = null,
  storedProfile = null,
} = {}) {
  const meta = sessionUser?.user_metadata ?? {};

  const firstName =
    // 1. The athlete's own value always wins; never overwrite it.
    firstToken(storedProfile?.firstName)
    // 2. What Apple just handed us.
    ?? firstToken(credentialGivenName)
    // 3. What Supabase kept from the Apple identity token. Several key names
    //    are checked because the shape varies by provider and Supabase
    //    version, and guessing one would silently resolve to nothing.
    ?? firstToken(meta.given_name)
    ?? firstToken(meta.full_name)
    ?? firstToken(meta.name)
    ?? null;

  const email =
    clean(storedProfile?.email)
    ?? clean(credentialEmail)
    // Supabase puts the Apple address (relay or not) on the auth user.
    ?? clean(sessionUser?.email)
    ?? clean(meta.email)
    ?? null;

  return { firstName, email };
}

/**
 * The profile patch to persist, or null when nothing new was learned.
 *
 * Returns only the keys that are genuinely NEW, so a caller can merge it
 * without ever rewriting a value the athlete set. Returning null (rather than
 * an empty object) lets a caller skip the write, and the sync it would
 * trigger, entirely.
 */
export function appleProfilePatch(args = {}) {
  const { firstName, email } = resolveAppleIdentity(args);
  const stored = args.storedProfile ?? null;
  const patch = {};
  if (firstName && !clean(stored?.firstName)) patch.firstName = firstName;
  if (email && !clean(stored?.email)) patch.email = email;
  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * Whether the athlete's name is known from any source, so a screen can decide
 * not to ask. Deliberately separate from the patch: a repeat Apple sign-in may
 * already have the name stored, in which case there is no patch to write but
 * the field must still stay hidden.
 */
export function hasKnownName(args = {}) {
  return resolveAppleIdentity(args).firstName != null;
}

// ── Is this an Apple account? ────────────────────────────────────────────────
//
// The gate that actually keeps the name box off the screen. It has to work on
// EVERY route a signed-in user can reach, and long after the sign-in call has
// returned, so it is derived from the Supabase auth user rather than from a
// flag some screen set during the sign-in it happened to run. (The 2026-08-19
// attempt used exactly such a flag on ProOnboardingScreen; the screen only
// ever mounts for an already-signed-in user, so the handler that set it never
// ran and the field stayed visible for every real Apple user.)
//
// Four independent signals, ANY of which is proof. Redundancy is deliberate:
// the failure that matters is a false NEGATIVE (the box comes back and App
// Review rejects again), whereas a false positive only hides an optional
// field that is still editable in Settings -> Profile.
const APPLE_RELAY_SUFFIX = '@privaterelay.appleid.com';

/**
 * @param {object|null} sessionUser the Supabase auth user (the store's `user`)
 * @returns {boolean} true when this account authenticates through Apple
 */
export function isAppleUser(sessionUser) {
  if (!sessionUser || typeof sessionUser !== 'object') return false;
  const app = sessionUser.app_metadata ?? {};
  // 1. The provider that created the account.
  if (app.provider === 'apple') return true;
  // 2. Every provider linked to it, so a Google-first account that later
  //    linked Apple still counts.
  if (Array.isArray(app.providers) && app.providers.includes('apple')) return true;
  // 3. The identity rows, which carry the same fact in a different shape
  //    across Supabase versions.
  if (Array.isArray(sessionUser.identities)
    && sessionUser.identities.some((i) => i?.provider === 'apple')) return true;
  // 4. A private relay address can only have come from Apple.
  const email = clean(sessionUser.email);
  if (email && email.toLowerCase().endsWith(APPLE_RELAY_SUFFIX)) return true;
  return false;
}

// ── The first-authorisation credential ───────────────────────────────────────
//
// Apple hands the name to signInWithApple() and to nobody else, once, ever.
// Sign-in completion is then driven asynchronously by RootNavigator's
// onAuthStateChange, and three separate screens call signInWithApple, so the
// value has to outlive the call that received it. It is stashed here at the
// source (src/lib/supabase.js) and read wherever a profile is next written.
//
// IT IS WRITTEN TO DISK, IMMEDIATELY. This was memory-only in the first cut of
// this file and that was a real defect, not a style point. Apple hands the name
// over once and never again, and between that moment and the profile write at
// the end of onboarding the athlete crosses the Article 9 consent gate and a
// six-step wizard - minutes, during which iOS may reclaim a backgrounded app,
// the app may crash, or the athlete may force-quit. Any of those with a
// memory-only stash loses the name PERMANENTLY: Apple returns null on every
// later sign-in, so there is no second chance to recover it. Apple's own
// guidance is to cache the name on first receipt, and this is that cache.
//
// A synchronous in-memory mirror is kept alongside, because the onboarding
// screens read the name in a `useState` initialiser and cannot await. On a cold
// start the mirror is empty until `loadAppleCredential()` resolves, so those
// screens also run an effect that picks up the late value (see their call
// sites). Disk is the truth; the mirror is a fast path.
const CREDENTIAL_KEY = '@volyume_apple_credential_v1';

let _credential = { givenName: null, email: null };

function _storage() {
  // Lazy: this module is imported by pure-logic tests that have no AsyncStorage
  // mock, and a missing store must degrade to the memory mirror, never throw.
  try {
    // eslint-disable-next-line global-require
    return require('@react-native-async-storage/async-storage').default;
  } catch (_) { return null; }
}

/**
 * Called by signInWithApple with whatever Authentication Services returned.
 *
 * @returns {Promise<void>} resolves once the value is on disk. Callers should
 *   await it: this is the one moment the name exists anywhere, so the write
 *   must not be racing the rest of the sign-in.
 */
export async function noteAppleCredential({ givenName = null, email = null } = {}) {
  const g = clean(givenName);
  const e = clean(email);
  // Never let a later null sign-in erase a name an earlier one supplied.
  const next = {
    givenName: g ?? _credential.givenName,
    email: e ?? _credential.email,
  };
  _credential = next;
  if (!next.givenName && !next.email) return;
  const store = _storage();
  if (!store) return;
  try {
    await store.setItem(CREDENTIAL_KEY, JSON.stringify(next));
  } catch (_) { /* the memory mirror still serves this process */ }
}

/**
 * Rehydrate the in-memory mirror from disk. Call before reading the credential
 * on a cold start (the onboarding screens do, in an effect).
 *
 * @returns {Promise<{ givenName: string|null, email: string|null }>}
 */
export async function loadAppleCredential() {
  const store = _storage();
  if (!store) return { ..._credential };
  try {
    const raw = await store.getItem(CREDENTIAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Disk fills gaps only; anything this process already learned is at least
      // as fresh, so it wins.
      _credential = {
        givenName: _credential.givenName ?? clean(parsed?.givenName),
        email: _credential.email ?? clean(parsed?.email),
      };
    }
  } catch (_) { /* unreadable or corrupt: the mirror stands */ }
  return { ..._credential };
}

/**
 * Synchronous read of the mirror. May be empty on a cold start before
 * loadAppleCredential() has resolved - that is what the screens' effect covers.
 *
 * @returns {{ givenName: string|null, email: string|null }}
 */
export function readAppleCredential() {
  return { ..._credential };
}

/** Sign-out: the next account must not inherit this one's name. */
export function clearAppleCredential() {
  _credential = { givenName: null, email: null };
  const store = _storage();
  if (!store) return;
  try { store.removeItem(CREDENTIAL_KEY)?.catch?.(() => {}); } catch (_) { /* best effort */ }
}

/**
 * resolveAppleIdentity with the stashed credential already folded in, which is
 * what every caller in the app actually wants.
 */
export function currentAppleIdentity({ sessionUser = null, storedProfile = null } = {}) {
  return resolveAppleIdentity({
    credentialGivenName: _credential.givenName,
    credentialEmail: _credential.email,
    sessionUser,
    storedProfile,
  });
}

/** appleProfilePatch with the stashed credential already folded in. */
export function currentAppleProfilePatch({ sessionUser = null, storedProfile = null } = {}) {
  return appleProfilePatch({
    credentialGivenName: _credential.givenName,
    credentialEmail: _credential.email,
    sessionUser,
    storedProfile,
  });
}
