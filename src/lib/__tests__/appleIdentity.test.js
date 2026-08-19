/**
 * Sign in with Apple must not be followed by a name prompt: Authentication
 * Services already supplied the name. This suite covers the two questions the
 * module answers; the screens that use them are covered by a real mount in
 * src/screens/__tests__/appleNoNamePrompt.mount.test.js.
 */
import {
  isAppleUser, appleFirstName, noteAppleCredential, clearAppleCredential,
} from '../appleIdentity';

const RELAY = 'ab12cd34ef@privaterelay.appleid.com';

beforeEach(() => clearAppleCredential());

describe('isAppleUser: the gate that keeps the name box off the screen', () => {
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
  });

  test('null and junk are not Apple, and never throw', () => {
    for (const v of [null, undefined, 0, 'apple', {}, { app_metadata: null }, { identities: 'apple' }]) {
      expect(isAppleUser(v)).toBe(false);
    }
  });
});

describe('appleFirstName: never ask for a name we already have', () => {
  test('FIRST signup: Apple just gave it, and signInWithApple noted it', () => {
    noteAppleCredential({ givenName: 'Ada' });
    expect(appleFirstName({ storedProfile: null })).toBe('Ada');
  });

  test('REPEAT sign-in: Apple sends null now, the stored profile answers', () => {
    expect(appleFirstName({ storedProfile: { firstName: 'Ada' } })).toBe('Ada');
  });

  test('the auth user answers when neither of those can', () => {
    for (const meta of [{ given_name: 'Ada' }, { full_name: 'Ada Lovelace' }, { name: 'Ada Lovelace' }]) {
      expect(appleFirstName({ sessionUser: { user_metadata: meta } })).toBe('Ada');
    }
  });

  test('a name the athlete set themselves is never overwritten', () => {
    noteAppleCredential({ givenName: 'Ada' });
    expect(appleFirstName({
      sessionUser: { user_metadata: { full_name: 'Ada Lovelace' } },
      storedProfile: { firstName: 'Bear' },
    })).toBe('Bear');
  });

  test('a full name is reduced to a first name', () => {
    noteAppleCredential({ givenName: 'Ada Lovelace' });
    expect(appleFirstName({})).toBe('Ada');
  });

  test('a later null sign-in never erases a name already given', () => {
    noteAppleCredential({ givenName: 'Ada' });
    noteAppleCredential({ givenName: null });
    expect(appleFirstName({})).toBe('Ada');
  });

  test('sign-out clears it, so the next account cannot inherit a name', () => {
    noteAppleCredential({ givenName: 'Ada' });
    clearAppleCredential();
    expect(appleFirstName({})).toBeNull();
  });

  test('nothing anywhere is null, which is a nameless greeting, never a prompt', () => {
    expect(appleFirstName()).toBeNull();
    expect(appleFirstName({})).toBeNull();
  });

  test('blank, whitespace and junk all count as absent', () => {
    noteAppleCredential({ givenName: '   ' });
    expect(appleFirstName({ storedProfile: { firstName: '  ' } })).toBeNull();
    expect(appleFirstName({
      storedProfile: { firstName: [] },
      sessionUser: { user_metadata: null },
    })).toBeNull();
  });
});
