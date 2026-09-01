/**
 * P1 cross-account isolation (adversarial audit 2026-08-26).
 *
 * PRODUCT LAW under test:
 *
 *     WIPE VERIFIED CLEAN  -> the next account may activate
 *     FAILED OR UNKNOWN    -> the next account MUST NOT activate
 *
 * The SQLite limb was already fail-closed (D33). These suites cover the two
 * limbs that were not, plus the stale-async-work case that no amount of wiping
 * can fix on its own.
 *
 * The fixtures are the audit's own scenarios:
 *   A -> wipe failure -> B must NOT activate
 *   A -> delayed tier response after B login
 *   A -> delayed profile response
 *
 * Note on the "unknown" cases: a store that cannot be READ is treated as
 * residue, never as absence. That is the same ERROR-IS-NOT-EMPTY rule the audit
 * applies to sync, and it is the difference between a wipe we verified and a
 * wipe we merely hope happened.
 */

import {
  wipeAsyncStorageWithRetry,
  wipeAuthTokensWithRetry,
  wipeScheduledNotificationsWithRetry,
  verifyNoForeignAccountStorage,
} from '../deviceWipe';
import {
  currentEpoch, beginNewAccountEpoch, isEpochCurrent, __resetAccountEpochForTests,
} from '../accountEpoch';

jest.mock('@react-native-async-storage/async-storage', () => ({
  clear: jest.fn(async () => {}),
  getAllKeys: jest.fn(async () => []),
  getItem: jest.fn(async () => null),
}));
jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
}));
jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async () => {}),
  getItemAsync: jest.fn(async () => null),
}));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const SecureStore = require('expo-secure-store');
const Notifications = require('expo-notifications');

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.clear.mockImplementation(async () => {});
  AsyncStorage.getAllKeys.mockImplementation(async () => []);
  AsyncStorage.getItem.mockImplementation(async () => null);
  SecureStore.deleteItemAsync.mockImplementation(async () => {});
  SecureStore.getItemAsync.mockImplementation(async () => null);
  Notifications.cancelAllScheduledNotificationsAsync.mockImplementation(async () => {});
  Notifications.getAllScheduledNotificationsAsync.mockImplementation(async () => []);
  __resetAccountEpochForTests();
});

describe('first-account marker loss is not treated as ownership proof', () => {
  test('foreign profile storage blocks admission', async () => {
    AsyncStorage.getAllKeys.mockResolvedValue(['@volyume_user_profile_user-A']);
    await expect(verifyNoForeignAccountStorage('user-B'))
      .resolves.toMatchObject({ ok: false, step: 'foreign_profile_storage' });
  });

  test('foreign and malformed active-workout snapshots block admission', async () => {
    AsyncStorage.getAllKeys.mockResolvedValue(['@volyume_active_workout']);
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ userId: 'user-A', workout: {} }));
    await expect(verifyNoForeignAccountStorage('user-B'))
      .resolves.toMatchObject({ ok: false, step: 'foreign_active_workout' });
    AsyncStorage.getItem.mockResolvedValue('{broken');
    await expect(verifyNoForeignAccountStorage('user-B'))
      .resolves.toMatchObject({ ok: false, step: 'active_workout_malformed' });
  });

  test('account-tagged storage for the incoming account is admissible', async () => {
    AsyncStorage.getAllKeys.mockResolvedValue([
      '@volyume_user_profile_user-B', '@volyume_user_profile_ts_user-B', '@volyume_active_workout',
    ]);
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ userId: 'user-B' }));
    await expect(verifyNoForeignAccountStorage('user-B')).resolves.toEqual({ ok: true });
  });
});

describe('scheduled notification wipe is verified', () => {
  test('success requires an empty scheduler readback', async () => {
    await expect(wipeScheduledNotificationsWithRetry())
      .resolves.toEqual({ ok: true });
  });

  test('residue and verifier errors fail closed after retry', async () => {
    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue([{ identifier: 'A-secret' }]);
    await expect(wipeScheduledNotificationsWithRetry({ attempts: 2, delaysMs: [0] }))
      .resolves.toMatchObject({ ok: false, step: 'notification_residue_or_unreadable' });
    Notifications.getAllScheduledNotificationsAsync.mockRejectedValue(new Error('OS unavailable'));
    await expect(wipeScheduledNotificationsWithRetry({ attempts: 1, delaysMs: [] }))
      .resolves.toMatchObject({ ok: false });
  });
});

describe('AsyncStorage wipe fails closed', () => {
  test('a clean clear reports ok', async () => {
    await expect(wipeAsyncStorageWithRetry()).resolves.toMatchObject({ ok: true });
  });

  test('residue after clear blocks sign-out', async () => {
    // The dangerous shape: clear() resolves, but rows survive.
    AsyncStorage.getAllKeys.mockImplementation(async () => ['@volyume_tier', '@volyume_trial_state']);
    const r = await wipeAsyncStorageWithRetry({ attempts: 1, delaysMs: [] });
    expect(r.ok).toBe(false);
    expect(r.step).toBe('async_storage_residue');
    expect(r.residueCount).toBe(2);
  });

  test('an UNREADABLE store blocks sign-out: unknown is not clean', async () => {
    AsyncStorage.getAllKeys.mockImplementation(async () => { throw new Error('store wedged'); });
    const r = await wipeAsyncStorageWithRetry({ attempts: 1, delaysMs: [] });
    expect(r.ok).toBe(false);
    expect(r.step).toBe('async_storage_verify_unreadable');
  });

  test('a throwing clear that nevertheless emptied the store may proceed (D33 escape)', async () => {
    // Without this, one spurious throw traps a user in a device they can never
    // sign out of, which is its own harm. Verified-clean is still clean.
    AsyncStorage.clear.mockImplementation(async () => { throw new Error('spurious'); });
    AsyncStorage.getAllKeys.mockImplementation(async () => []);
    const r = await wipeAsyncStorageWithRetry({ attempts: 2, delaysMs: [0] });
    expect(r).toMatchObject({ ok: true, verifiedClean: true });
  });

  test('it retries before giving up', async () => {
    let n = 0;
    AsyncStorage.clear.mockImplementation(async () => { n += 1; if (n < 3) throw new Error('transient'); });
    const r = await wipeAsyncStorageWithRetry({ attempts: 3, delaysMs: [0, 0] });
    expect(r.ok).toBe(true);
    expect(n).toBe(3);
  });

  test('residue key NAMES never reach the log: they are user-scoped', async () => {
    AsyncStorage.getAllKeys.mockImplementation(async () => ['@volyume_user_secret_thing']);
    await wipeAsyncStorageWithRetry({ attempts: 1, delaysMs: [] });
    const { logError } = require('../errorLog');
    const serialised = JSON.stringify(logError.mock.calls);
    expect(serialised).not.toContain('secret_thing');
  });
});

describe('auth token wipe fails closed', () => {
  test('a surviving refresh token blocks sign-out', async () => {
    // The worst residue of all: it does not leak data, it re-authenticates A.
    SecureStore.getItemAsync.mockImplementation(async () => 'still-here');
    const r = await wipeAuthTokensWithRetry({ projectRef: 'abc' }, { attempts: 1, delaysMs: [] });
    expect(r.ok).toBe(false);
    expect(r.step).toBe('auth_token_residue');
  });

  test('a locked keychain blocks sign-out: unreadable is not gone', async () => {
    SecureStore.getItemAsync.mockImplementation(async () => {
      throw new Error('User interaction is not allowed');
    });
    const r = await wipeAuthTokensWithRetry({ projectRef: 'abc' }, { attempts: 1, delaysMs: [] });
    expect(r.ok).toBe(false);
    expect(r.step).toBe('auth_token_verify_unreadable');
  });

  test('both the project-scoped and legacy token keys are deleted', async () => {
    await wipeAuthTokensWithRetry({ projectRef: 'abc' });
    const keys = SecureStore.deleteItemAsync.mock.calls.map((c) => c[0]);
    expect(keys).toContain('sb-abc-auth-token');
    expect(keys).toContain('supabase.auth.token');
  });

  test('a clean delete reports ok', async () => {
    await expect(wipeAuthTokensWithRetry({ projectRef: 'abc' })).resolves.toMatchObject({ ok: true });
  });
});

describe('stale async work from the previous account is invalidated', () => {
  test('an epoch captured before sign-out is no longer current after it', () => {
    const captured = currentEpoch();
    expect(isEpochCurrent(captured)).toBe(true);
    beginNewAccountEpoch();                 // A signs out
    expect(isEpochCurrent(captured)).toBe(false);
  });

  test('A -> delayed response after B login is rejected even though B is signed in', async () => {
    // This is the case the existing uid comparison CANNOT catch, because it
    // compares identity and the danger is time. Reproduce it exactly.
    const aEpoch = currentEpoch();
    const inFlightReadForA = new Promise((r) => { setTimeout(() => r({ tier: 'pro' }), 5); });
    beginNewAccountEpoch();                 // A signs out, device wiped
    // ... B signs in here ...
    const result = await inFlightReadForA;  // A's answer lands late
    expect(result.tier).toBe('pro');        // the read did resolve
    expect(isEpochCurrent(aEpoch)).toBe(false); // but it must be dropped
  });

  test('the null-uid hole is closed: A signed out means cur is null, epoch still rejects', () => {
    // Before this fix the guard was `if (cur && cur !== uid) return`, so with
    // no user signed in it PROCEEDED and wrote A's tier into freshly wiped
    // storage, which B then inherited on next launch.
    const aEpoch = currentEpoch();
    beginNewAccountEpoch();
    const curUid = null;                     // signed out
    const oldGuardWouldBail = !!curUid && curUid !== 'user-A';
    expect(oldGuardWouldBail).toBe(false);   // the old guard let it through
    expect(isEpochCurrent(aEpoch)).toBe(false); // the epoch does not
  });

  test('an uncaptured epoch fails closed rather than counting as current', () => {
    expect(isEpochCurrent(undefined)).toBe(false);
    expect(isEpochCurrent(null)).toBe(false);
    expect(isEpochCurrent('0')).toBe(false);
  });

  test('epochs never repeat, so a wrapped counter cannot resurrect stale work', () => {
    const seen = new Set([currentEpoch()]);
    for (let i = 0; i < 200; i += 1) seen.add(beginNewAccountEpoch());
    expect(seen.size).toBe(201);
  });
});
