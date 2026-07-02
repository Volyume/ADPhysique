/**
 * SC-2 (client leg): the pending-auth-deletion retry marker.
 *
 * When delete-account falls back to the delete_user_data RPC, the
 * auth.users row survives. These tests pin the contract that keeps that
 * honest: the marker is uid-keyed, the retry only fires for the SAME
 * uid, the Edge Function is invoked at most once per launch, and the
 * marker is cleared only on success (kept on failure so a later launch
 * retries). Weakening any of these either deletes the wrong account's
 * credentials or silently abandons an Article 17 erasure.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DELETION_AUTH_PENDING_PREFIX,
  deletionAuthPendingKey,
  markAuthDeletionPending,
  clearAuthDeletionPending,
  retryPendingAuthDeletion,
  _resetRetryGuardForTests,
} from '../deletionRetry';

function fakeClient(invokeImpl) {
  return {
    functions: {
      invoke: jest.fn(invokeImpl ?? (async () => ({ data: { ok: true }, error: null }))),
    },
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetRetryGuardForTests();
});

describe('marker helpers', () => {
  test('key is uid-scoped under the stable prefix', () => {
    expect(deletionAuthPendingKey('uid-1')).toBe('@volyume_deletion_auth_pending_uid-1');
    expect(deletionAuthPendingKey('uid-1').startsWith(DELETION_AUTH_PENDING_PREFIX)).toBe(true);
  });

  test('mark then clear round-trips through storage', async () => {
    expect(await markAuthDeletionPending('uid-1')).toBe(true);
    expect(await AsyncStorage.getItem(deletionAuthPendingKey('uid-1'))).not.toBeNull();
    await clearAuthDeletionPending('uid-1');
    expect(await AsyncStorage.getItem(deletionAuthPendingKey('uid-1'))).toBeNull();
  });

  test('mark without a uid is refused', async () => {
    expect(await markAuthDeletionPending(null)).toBe(false);
    expect(await markAuthDeletionPending('')).toBe(false);
  });
});

describe('retryPendingAuthDeletion', () => {
  test('no marker: nothing is attempted and nothing is invoked', async () => {
    const client = fakeClient();
    const res = await retryPendingAuthDeletion('uid-1', { client });
    expect(res).toEqual({ attempted: false, pending: false });
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  test("another account's marker is never honoured", async () => {
    await markAuthDeletionPending('uid-deleted');
    const client = fakeClient();
    const res = await retryPendingAuthDeletion('uid-other', { client });
    expect(res).toEqual({ attempted: false, pending: false });
    expect(client.functions.invoke).not.toHaveBeenCalled();
    // The original marker is untouched for uid-deleted's own next launch.
    expect(await AsyncStorage.getItem(deletionAuthPendingKey('uid-deleted'))).not.toBeNull();
  });

  test('marker + success: invokes delete-account once and clears the marker', async () => {
    await markAuthDeletionPending('uid-1');
    const client = fakeClient();
    const res = await retryPendingAuthDeletion('uid-1', { client });
    expect(res).toEqual({ attempted: true, ok: true, pending: false });
    expect(client.functions.invoke).toHaveBeenCalledTimes(1);
    expect(client.functions.invoke.mock.calls[0][0]).toBe('delete-account');
    expect(await AsyncStorage.getItem(deletionAuthPendingKey('uid-1'))).toBeNull();
  });

  test('marker + failure: reports failure and KEEPS the marker for next launch', async () => {
    await markAuthDeletionPending('uid-1');
    const client = fakeClient(async () => ({ data: null, error: new Error('fn unreachable') }));
    const res = await retryPendingAuthDeletion('uid-1', { client });
    expect(res).toEqual({ attempted: true, ok: false, pending: true });
    expect(await AsyncStorage.getItem(deletionAuthPendingKey('uid-1'))).not.toBeNull();
  });

  test('marker + thrown invoke: swallowed (never propagates into boot), marker kept', async () => {
    await markAuthDeletionPending('uid-1');
    const client = fakeClient(async () => { throw new Error('network down'); });
    await expect(retryPendingAuthDeletion('uid-1', { client })).resolves.toEqual({ attempted: true, ok: false, pending: true });
    expect(await AsyncStorage.getItem(deletionAuthPendingKey('uid-1'))).not.toBeNull();
  });

  test('at most one attempt per launch, even across repeated auth events', async () => {
    await markAuthDeletionPending('uid-1');
    const client = fakeClient(async () => ({ data: null, error: new Error('still down') }));
    await retryPendingAuthDeletion('uid-1', { client });
    const second = await retryPendingAuthDeletion('uid-1', { client });
    // Wave-3 review fix: a guard-blocked call still reports the standing
    // marker as pending, so the navigator never lets the sign-in proceed
    // into a half-deleted account within the same JS lifetime.
    expect(second).toEqual({ attempted: false, pending: true });
    expect(client.functions.invoke).toHaveBeenCalledTimes(1);
  });
});

describe('navigator wiring (Wave-3 review fixes, source-level pins)', () => {
  const fs = require('fs');
  const path = require('path');
  const nav = fs.readFileSync(path.join(__dirname, '..', '..', 'navigation', 'RootNavigator.js'), 'utf8');
  const hook = fs.readFileSync(path.join(__dirname, '..', '..', 'hooks', 'useAccountActions.js'), 'utf8');

  test('the retry is AWAITED inside the sign-in pipeline, before the cross-account gate', () => {
    const retryAt = nav.indexOf('await retryPendingAuthDeletion(session.user.id)');
    const lastUidAt = nav.indexOf("@volyume_last_supabase_user_id'");
    expect(retryAt).toBeGreaterThan(-1);
    expect(lastUidAt).toBeGreaterThan(-1);
    expect(retryAt).toBeLessThan(lastUidAt);
  });

  test('a standing marker never lets the sign-in proceed: both outcomes sign out', () => {
    expect(nav).toMatch(/if \(retry\.attempted \|\| retry\.pending\)/);
    const block = nav.slice(nav.indexOf('if (retry.attempted || retry.pending)'));
    expect(block.indexOf('client.auth.signOut()')).toBeGreaterThan(-1);
    expect(block.indexOf('return;')).toBeGreaterThan(-1);
  });

  test('the partial-success alert no longer promises completion on a plain restart', () => {
    expect(hook).not.toMatch(/completes automatically the next time the app starts/);
    expect(hook).toMatch(/sign in again with the same Apple or Google account/);
  });
});
