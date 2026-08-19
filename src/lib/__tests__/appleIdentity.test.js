/**
 * Apple identity resolution: the app must never ask for a name or e-mail
 * Authentication Services already gave it.
 *
 * App Review rejected Volyume TWICE on this, so these cases are written from
 * the reviewer's actual journeys rather than the happy path a developer sees
 * on a fresh test account:
 *
 *   - first Apple signup            credential carries name + email
 *   - REPEAT Apple sign-in          credential carries NOTHING, both null
 *   - reinstall / delete + re-test  no stored profile, credential still null
 *   - private relay address         must pass through untouched
 *   - Apple name refused by user    nothing anywhere; must not block onboarding
 *
 * The second and third are the ones that got the app rejected: the 2026-07-21
 * fix read only the credential, so it worked once and then silently stopped.
 */
import {
  resolveAppleIdentity, appleProfilePatch, hasKnownName,
  isAppleUser, noteAppleCredential, readAppleCredential, clearAppleCredential,
  currentAppleIdentity, currentAppleProfilePatch,
} from '../appleIdentity';

beforeEach(() => clearAppleCredential());

const RELAY = 'ab12cd34ef@privaterelay.appleid.com';

describe('first Apple signup: the credential carries everything', () => {
  test('name and email are taken from the credential', () => {
    const out = resolveAppleIdentity({
      credentialGivenName: 'Ada',
      credentialEmail: 'ada@example.com',
      sessionUser: { email: 'ada@example.com' },
      storedProfile: null,
    });
    expect(out).toEqual({ firstName: 'Ada', email: 'ada@example.com' });
  });

  test('a full name from the credential is reduced to a first name', () => {
    const out = resolveAppleIdentity({ credentialGivenName: 'Ada Lovelace' });
    expect(out.firstName).toBe('Ada');
  });

  test('both are offered as a patch to persist', () => {
    expect(appleProfilePatch({
      credentialGivenName: 'Ada',
      credentialEmail: 'ada@example.com',
    })).toEqual({ firstName: 'Ada', email: 'ada@example.com' });
  });
});

describe('repeat Apple sign-in: the credential is empty (the rejection case)', () => {
  const repeatCredential = { credentialGivenName: null, credentialEmail: null };

  test('the stored profile answers, so nothing is asked', () => {
    const out = resolveAppleIdentity({
      ...repeatCredential,
      storedProfile: { firstName: 'Ada', email: 'ada@example.com' },
    });
    expect(out).toEqual({ firstName: 'Ada', email: 'ada@example.com' });
    expect(hasKnownName({ ...repeatCredential, storedProfile: { firstName: 'Ada' } })).toBe(true);
  });

  test('with NO stored profile, the Supabase session still answers', () => {
    // The decisive case. After a delete and reinstall a reviewer has no local
    // profile AND gets a null credential, so this is the only source left. A
    // fix that reads only the credential shows them an empty name box here,
    // which is exactly what Apple rejected.
    const out = resolveAppleIdentity({
      ...repeatCredential,
      storedProfile: null,
      sessionUser: {
        email: 'ada@example.com',
        user_metadata: { full_name: 'Ada Lovelace' },
      },
    });
    expect(out).toEqual({ firstName: 'Ada', email: 'ada@example.com' });
    expect(hasKnownName({ ...repeatCredential, sessionUser: { user_metadata: { full_name: 'Ada Lovelace' } } })).toBe(true);
  });

  test('the several metadata key spellings are all read', () => {
    for (const meta of [{ given_name: 'Ada' }, { full_name: 'Ada Lovelace' }, { name: 'Ada Lovelace' }]) {
      expect(resolveAppleIdentity({ sessionUser: { user_metadata: meta } }).firstName).toBe('Ada');
    }
  });
});

describe('the stored profile always wins: an athlete edit is never overwritten', () => {
  test('a name the athlete set beats the credential and the session', () => {
    const out = resolveAppleIdentity({
      credentialGivenName: 'Ada',
      sessionUser: { user_metadata: { full_name: 'Ada Lovelace' } },
      storedProfile: { firstName: 'Bear' },
    });
    expect(out.firstName).toBe('Bear');
  });

  test('and no patch is produced for something already stored', () => {
    expect(appleProfilePatch({
      credentialGivenName: 'Ada',
      credentialEmail: 'ada@example.com',
      storedProfile: { firstName: 'Bear', email: 'bear@example.com' },
    })).toBeNull();
  });

  test('a patch fills only the missing half', () => {
    expect(appleProfilePatch({
      credentialGivenName: 'Ada',
      credentialEmail: 'ada@example.com',
      storedProfile: { firstName: 'Bear' },
    })).toEqual({ email: 'ada@example.com' });
  });
});

describe('Apple private relay is a real address', () => {
  test('a relay address is accepted from the credential, untouched', () => {
    expect(resolveAppleIdentity({ credentialEmail: RELAY }).email).toBe(RELAY);
  });

  test('and from the session on a repeat sign-in', () => {
    expect(resolveAppleIdentity({ sessionUser: { email: RELAY } }).email).toBe(RELAY);
  });

  test('it is persisted like any other address, never flagged', () => {
    expect(appleProfilePatch({ credentialEmail: RELAY })).toEqual({ email: RELAY });
  });
});

describe('Apple supplied nothing: onboarding must still not be blocked', () => {
  test('everything null resolves to null rather than throwing', () => {
    expect(resolveAppleIdentity()).toEqual({ firstName: null, email: null });
    expect(resolveAppleIdentity({})).toEqual({ firstName: null, email: null });
  });

  test('no patch is produced, so no pointless write or sync happens', () => {
    expect(appleProfilePatch()).toBeNull();
  });

  test('hasKnownName is false, and that is a UI decision, not a block', () => {
    // The caller may then show an optional field. What it must never do is
    // REQUIRE one: the name is presentation only and no engine reads it.
    expect(hasKnownName()).toBe(false);
  });

  test('blank and whitespace values count as absent, not as a name', () => {
    expect(resolveAppleIdentity({
      credentialGivenName: '   ',
      credentialEmail: '',
      storedProfile: { firstName: '  ', email: '   ' },
    })).toEqual({ firstName: null, email: null });
  });

  test('non-string junk never throws', () => {
    expect(resolveAppleIdentity({
      credentialGivenName: 42,
      credentialEmail: {},
      storedProfile: { firstName: [], email: null },
      sessionUser: { email: undefined, user_metadata: null },
    })).toEqual({ firstName: null, email: null });
  });
});

describe('isAppleUser: the gate that keeps the name box off the screen', () => {
  // This is the assertion that matters. The 2026-08-19 attempt gated the field
  // on a flag set inside ProOnboardingScreen's OAuth handler; that screen only
  // mounts once a session exists, so step 1 never rendered, the handler never
  // ran and the flag was false for every real user. Deriving the answer from
  // the session is what makes the gate reachable at all.
  test('the provider that created the account', () => {
    expect(isAppleUser({ app_metadata: { provider: 'apple' } })).toBe(true);
  });

  test('a linked provider, so a Google-first account that added Apple counts', () => {
    expect(isAppleUser({ app_metadata: { provider: 'google', providers: ['google', 'apple'] } })).toBe(true);
  });

  test('an identity row', () => {
    expect(isAppleUser({ identities: [{ provider: 'apple' }] })).toBe(true);
  });

  test('a private relay address, which can only have come from Apple', () => {
    expect(isAppleUser({ email: RELAY })).toBe(true);
    expect(isAppleUser({ email: RELAY.toUpperCase() })).toBe(true);
  });

  test('a Google or e-mail account is untouched', () => {
    expect(isAppleUser({ app_metadata: { provider: 'google', providers: ['google'] }, email: 'ada@gmail.com' })).toBe(false);
    expect(isAppleUser({ app_metadata: { provider: 'email' }, email: 'ada@example.com' })).toBe(false);
    expect(isAppleUser({ identities: [{ provider: 'google' }] })).toBe(false);
  });

  test('null and junk are not Apple, and never throw', () => {
    for (const v of [null, undefined, 0, 'apple', {}, { app_metadata: null }, { identities: 'apple' }]) {
      expect(isAppleUser(v)).toBe(false);
    }
  });
});

describe('the first-authorisation credential outlives the call that got it', () => {
  // Apple hands the name to signInWithApple and to nobody else, once per Apple
  // ID ever. Sign-in completion is then driven by RootNavigator's
  // onAuthStateChange rather than by that call's return value, and two of the
  // three screens calling it dropped the name on the floor, so the value has
  // to be stashed at the source to survive to the next profile write.
  test('what Apple gave is readable afterwards', () => {
    noteAppleCredential({ givenName: 'Ada', email: RELAY });
    expect(readAppleCredential()).toEqual({ givenName: 'Ada', email: RELAY });
  });

  test('a later empty sign-in never erases it', () => {
    noteAppleCredential({ givenName: 'Ada', email: 'ada@example.com' });
    noteAppleCredential({ givenName: null, email: null });
    expect(readAppleCredential()).toEqual({ givenName: 'Ada', email: 'ada@example.com' });
  });

  test('sign-out clears it, so the next account cannot inherit a name', () => {
    noteAppleCredential({ givenName: 'Ada' });
    clearAppleCredential();
    expect(readAppleCredential()).toEqual({ givenName: null, email: null });
    expect(currentAppleIdentity({}).firstName).toBeNull();
  });

  test('blank input is treated as absent', () => {
    noteAppleCredential({ givenName: '   ', email: '' });
    expect(readAppleCredential()).toEqual({ givenName: null, email: null });
  });

  test('reading it does not consume it: several screens may ask', () => {
    noteAppleCredential({ givenName: 'Ada' });
    expect(readAppleCredential().givenName).toBe('Ada');
    expect(readAppleCredential().givenName).toBe('Ada');
    expect(currentAppleIdentity({}).firstName).toBe('Ada');
  });
});

describe('currentAppleIdentity: the API the screens actually call', () => {
  test('FIRST Apple signup: the stashed credential answers with no profile at all', () => {
    noteAppleCredential({ givenName: 'Ada', email: RELAY });
    expect(currentAppleIdentity({
      sessionUser: { app_metadata: { provider: 'apple' }, email: RELAY },
      storedProfile: null,
    })).toEqual({ firstName: 'Ada', email: RELAY });
  });

  test('REPEAT Apple sign-in: nothing stashed, the stored profile answers', () => {
    expect(currentAppleIdentity({
      sessionUser: { app_metadata: { provider: 'apple' }, email: RELAY },
      storedProfile: { firstName: 'Ada' },
    })).toEqual({ firstName: 'Ada', email: RELAY });
  });

  test('reinstall: nothing stashed, no profile, the auth user still answers', () => {
    expect(currentAppleIdentity({
      sessionUser: {
        app_metadata: { provider: 'apple' },
        email: RELAY,
        user_metadata: { full_name: 'Ada Lovelace' },
      },
      storedProfile: null,
    })).toEqual({ firstName: 'Ada', email: RELAY });
  });

  test('Apple gave no name and none was kept: null, and the caller must not block', () => {
    // The native flow is the case that reaches here: Apple\'s identity token
    // carries the e-mail but never the name, so a reviewer who re-tests after
    // a delete and reinstall has no name available anywhere. Onboarding still
    // has to complete, and the field still must not be shown.
    const out = currentAppleIdentity({
      sessionUser: { app_metadata: { provider: 'apple' }, email: RELAY },
      storedProfile: null,
    });
    expect(out).toEqual({ firstName: null, email: RELAY });
    expect(isAppleUser({ app_metadata: { provider: 'apple' }, email: RELAY })).toBe(true);
  });

  test('the patch form folds the credential in the same way', () => {
    noteAppleCredential({ givenName: 'Ada', email: RELAY });
    expect(currentAppleProfilePatch({ storedProfile: null }))
      .toEqual({ firstName: 'Ada', email: RELAY });
    expect(currentAppleProfilePatch({ storedProfile: { firstName: 'Bear', email: 'b@e.com' } }))
      .toBeNull();
  });
});
