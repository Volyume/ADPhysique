/**
 * SC-2 source guards: delete-account never over-reports success.
 *
 * The hook drives alerts + native modules, so it is device-walked, not
 * jest-mounted (repo convention); these scoped source guards pin the
 * founder-facing honesty rules instead:
 *
 *   1. Total cloud failure (Edge Function AND RPC fallback both fail)
 *      aborts BEFORE any sign-out or local wipe: the user is told it
 *      failed, never shown success.
 *   2. RPC-only fallback success is PARTIAL success (auth.users row
 *      survives): the pending marker is written AFTER the
 *      AsyncStorage.clear() so it survives to the next launch, and the
 *      user is told credential removal is still pending.
 *   3. RootNavigator's auth listener retries the Edge Function via the
 *      uid-keyed marker (fire-and-forget, never blocking boot).
 *
 * The marker/retry behaviour itself is behaviourally tested in
 * src/lib/__tests__/deletionRetry.test.js.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const HOOK = read('../useAccountActions.js');
const NAV = read('../../navigation/RootNavigator.js');

describe('SC-2: total cloud failure aborts honestly', () => {
  test('a failed RPC fallback marks the cloud wipe as failed', () => {
    expect(HOOK).toMatch(/if \(rpcErr\) \{\s*\n\s*cloudOk = false;/);
  });
  test('the abort (alert + return) runs BEFORE sign-out and the local wipe', () => {
    const abortAt = HOOK.indexOf('if (!cloudOk) {');
    const signOutAt = HOOK.indexOf('try { await signOut(); }');
    const localWipeAt = HOOK.indexOf('await wipeAllUserData(userId);');
    expect(abortAt).toBeGreaterThan(-1);
    expect(signOutAt).toBeGreaterThan(-1);
    expect(localWipeAt).toBeGreaterThan(-1);
    expect(abortAt).toBeLessThan(signOutAt);
    expect(abortAt).toBeLessThan(localWipeAt);
    // The abort block surfaces the failure and returns without falling
    // through to the success path.
    const abortBlock = HOOK.slice(abortAt, HOOK.indexOf('}', HOOK.indexOf('return;', abortAt)));
    expect(abortBlock).toContain("Couldn't delete your account");
    expect(abortBlock).toContain('return;');
  });
});

describe('SC-2: RPC-only fallback is reported as partial success', () => {
  test('RPC success (after Edge Function failure) flags pending auth removal', () => {
    expect(HOOK).toMatch(/\} else \{[\s\S]{0,400}?authRemovalPending = true;/);
  });
  test('the marker is written AFTER AsyncStorage.clear() so it survives it', () => {
    const clearAt = HOOK.indexOf('await AsyncStorage.clear();');
    const markAt = HOOK.indexOf('await markAuthDeletionPending(userId);');
    expect(clearAt).toBeGreaterThan(-1);
    expect(markAt).toBeGreaterThan(-1);
    expect(markAt).toBeGreaterThan(clearAt);
  });
  test('the user is told honestly that credential removal is pending', () => {
    // Wave-3 review fix: the alert names the TRUE trigger (a future sign-in
    // with the same identity), never a plain app restart, which the delete
    // flow makes session-less by design.
    expect(HOOK).toMatch(/if \(authRemovalPending\) \{[\s\S]{0,900}?sign in again with the same Apple or Google account/);
    expect(HOOK).not.toMatch(/completes automatically the next time the app starts/);
    // The honest alert precedes the bundle reload so it is actually seen.
    const alertAt = HOOK.indexOf('sign in again with the same Apple or Google account');
    const reloadAt = HOOK.indexOf('await Updates.reloadAsync();', alertAt);
    expect(alertAt).toBeGreaterThan(-1);
    expect(reloadAt).toBeGreaterThan(alertAt);
  });
});

describe('SC-2: sign-in retry seam (Wave-3 review fix)', () => {
  test('the retry is awaited at the top of the sign-in pipeline, never fire-and-forget beside it', () => {
    expect(NAV).toMatch(/const retry = await retryPendingAuthDeletion\(session\.user\.id\);/);
    expect(NAV).not.toMatch(/retryPendingAuthDeletion\(session\.user\.id\)\.catch\(\(\) => \{\}\);/);
  });
  test('a standing marker blocks the session: sign-out + explanation + return before any restore', () => {
    const gateAt = NAV.indexOf('if (retry.attempted || retry.pending)');
    expect(gateAt).toBeGreaterThan(-1);
    // The sign-in pipeline's own restore call sits DOWNSTREAM of the gate
    // (the file's earlier restoreSessionFromCloud occurrences are the import
    // and the boot path, which a deleted account cannot reach).
    expect(NAV.indexOf('restoreSessionFromCloud(', gateAt)).toBeGreaterThan(gateAt);
    const block = NAV.slice(gateAt, gateAt + 1600);
    expect(block).toMatch(/client\.auth\.signOut\(\)/);
    expect(block).toMatch(/return;/);
  });
});
