/**
 * Sign-in methods for the signed-in account (Account > Sign-in methods).
 *
 * Pure rules over the identities Supabase reports (supabase.auth
 * .getUserIdentities). The one hard rule: the LAST method can never be
 * removed, because there is no anonymous mode (IDENTITY_AND_OWNERSHIP_LOCKED)
 * and an account with no way in is lost. The rule is enforced here, in the
 * lib that performs the unlink, and not only by hiding a button.
 */

export const METHOD_KEYS = ['apple', 'google', 'email'];

export const METHOD_LABELS = {
  apple: 'Apple',
  google: 'Google',
  email: 'Email and password',
};

/** The methods this account can currently sign in with, in display order. */
export function activeMethods(identities) {
  const have = new Set(
    (Array.isArray(identities) ? identities : [])
      .map((i) => String(i?.provider ?? '').toLowerCase())
      .filter((p) => METHOD_KEYS.includes(p)),
  );
  return METHOD_KEYS.filter((k) => have.has(k));
}

/** True only when removing `method` still leaves at least one other way in. */
export function canUnlink(identities, method) {
  const active = activeMethods(identities);
  if (!active.includes(method)) return false;
  return active.length >= 2;
}

export const LAST_METHOD_MESSAGE = 'This is your only way to sign in, so it cannot be removed. Add another one first.';
