/**
 * The Apple name must survive the app being killed.
 *
 * WHY THIS SUITE EXISTS, in one sentence: Apple hands the name over ONCE per
 * Apple ID, ever, and returns null on every sign-in after that
 * (node_modules/expo-apple-authentication/src/AppleAuthentication.types.ts:
 * "May be null ... if the user denied access, or if this is not the first time
 * the user has signed into your app"), so anything that loses it loses it for
 * good.
 *
 * The first cut of appleIdentity.js kept the credential in a module-level
 * variable. Between the Apple sheet handing the name over and the profile write
 * at the end of onboarding, the athlete crosses the Article 9 consent gate and
 * a six-step wizard - minutes, during which iOS may reclaim a backgrounded app,
 * the app may crash, or the athlete may force-quit. With a memory-only stash
 * every one of those is a permanent loss, and there is no way to notice: the
 * user simply has no name for ever after, and no error is raised.
 *
 * So these tests kill the process. `jest.resetModules()` gives a brand-new
 * appleIdentity module with an empty in-memory mirror, exactly like a relaunch,
 * while the AsyncStorage double below is deliberately backed by a Map declared
 * OUTSIDE the module factory so it behaves like the disk it stands for and
 * survives the reset.
 */

// Disk. Outside the factory on purpose (see the header); the `mock` prefix
// is Jest's requirement for a factory referencing an out-of-scope variable.
const mockDisk = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k) => Promise.resolve(mockDisk.get(k) ?? null)),
    setItem: jest.fn((k, v) => { mockDisk.set(k, v); return Promise.resolve(); }),
    removeItem: jest.fn((k) => { mockDisk.delete(k); return Promise.resolve(); }),
  },
}));

const KEY = '@volyume_apple_credential_v1';

beforeEach(() => {
  mockDisk.clear();
  jest.resetModules();
});

/** A fresh process: new module registry, same disk. */
function relaunch() {
  jest.resetModules();
  // eslint-disable-next-line global-require
  return require('../appleIdentity');
}

describe('the name Apple gave once survives a relaunch', () => {
  test('it is on disk the moment signInWithApple hands it over', async () => {
    // eslint-disable-next-line global-require
    const { noteAppleCredential } = require('../appleIdentity');
    await noteAppleCredential({ givenName: 'Ada', email: 'ada@example.com' });
    expect(JSON.parse(mockDisk.get(KEY))).toEqual({ givenName: 'Ada', email: 'ada@example.com' });
  });

  test('THE CASE THAT WAS BROKEN: app killed mid-onboarding, name still there', async () => {
    // eslint-disable-next-line global-require
    const { noteAppleCredential } = require('../appleIdentity');
    await noteAppleCredential({ givenName: 'Ada', email: 'ada@example.com' });

    // iOS reclaims the backgrounded app somewhere in the six-step wizard.
    const fresh = relaunch();

    // The mirror is empty, as it would be on a cold start...
    expect(fresh.readAppleCredential()).toEqual({ givenName: null, email: null });
    // ...and the disk answers.
    await fresh.loadAppleCredential();
    expect(fresh.readAppleCredential().givenName).toBe('Ada');
    expect(fresh.currentAppleIdentity({}).firstName).toBe('Ada');
  });

  test('and Apple never offering it again does not undo that', async () => {
    // eslint-disable-next-line global-require
    const { noteAppleCredential } = require('../appleIdentity');
    await noteAppleCredential({ givenName: 'Ada' });

    const fresh = relaunch();
    await fresh.loadAppleCredential();
    // The repeat sign-in: Apple returns null for both, as it always will now.
    await fresh.noteAppleCredential({ givenName: null, email: null });
    expect(fresh.currentAppleIdentity({}).firstName).toBe('Ada');
    expect(JSON.parse(mockDisk.get(KEY)).givenName).toBe('Ada');
  });

  test('a name learned this process beats a staler one on disk', async () => {
    mockDisk.set(KEY, JSON.stringify({ givenName: 'Old', email: null }));
    const fresh = relaunch();
    await fresh.noteAppleCredential({ givenName: 'New' });
    await fresh.loadAppleCredential();
    expect(fresh.readAppleCredential().givenName).toBe('New');
  });

  test('sign-out wipes the disk copy, so no account inherits another name', async () => {
    // eslint-disable-next-line global-require
    const { noteAppleCredential, clearAppleCredential } = require('../appleIdentity');
    await noteAppleCredential({ givenName: 'Ada', email: 'ada@example.com' });
    clearAppleCredential();
    expect(mockDisk.has(KEY)).toBe(false);

    const fresh = relaunch();
    await fresh.loadAppleCredential();
    expect(fresh.readAppleCredential()).toEqual({ givenName: null, email: null });
  });
});

describe('it never throws, whatever the disk does', () => {
  test('corrupt JSON on disk leaves the mirror intact', async () => {
    mockDisk.set(KEY, 'not json {{{');
    const fresh = relaunch();
    await fresh.noteAppleCredential({ givenName: 'Ada' });
    await expect(fresh.loadAppleCredential()).resolves.toEqual({ givenName: 'Ada', email: null });
  });

  test('a nothing-to-store call writes nothing rather than a null blob', async () => {
    // eslint-disable-next-line global-require
    const { noteAppleCredential } = require('../appleIdentity');
    await noteAppleCredential({ givenName: null, email: null });
    expect(mockDisk.has(KEY)).toBe(false);
  });

  test('an empty disk resolves to empty, not to a throw', async () => {
    const fresh = relaunch();
    await expect(fresh.loadAppleCredential()).resolves.toEqual({ givenName: null, email: null });
  });
});
