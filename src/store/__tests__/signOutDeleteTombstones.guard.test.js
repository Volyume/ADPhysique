/**
 * AC-04 (Codex adversarial audit, 2026-07-12) source guard.
 *
 * clearAuthStateForSignOut runs a push-first syncAll, then wipes local data
 * (including pending_sync_ops). That bulk push re-pushes every table by UPSERT,
 * which CANNOT express a DELETE - so the workout_delete / workout_set_delete
 * tombstones that live only in the queue are destroyed by the wipe and the
 * deleted workouts resurrect on the next sign-in. The existing "we deliberately
 * do NOT block on pending" reasoning is blind to this: it holds for upserts,
 * not deletes.
 *
 * The fix drains the queue (shipping the tombstones) and refuses to wipe while
 * any delete op remains, unless the user forced sign-out. clearAuthStateForSignOut
 * is a store method with a large live dependency surface (SQLCipher, supabase,
 * notifications) that is impractical to mount, so this is a scoped source guard
 * in the same style as the other sign-out guards. The queue counter itself is
 * behaviourally tested in src/lib/__tests__/syncQueue.test.js.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../useAppStore.js'),
  'utf8',
);

// The clearAuthStateForSignOut body: from its declaration to the wipe section
// that follows the push-first guard.
const start = SRC.indexOf('clearAuthStateForSignOut');
const fn = SRC.slice(start, SRC.indexOf('SYNC-3: we\'re now committed to wiping', start));

describe('AC-04: sign-out ships delete tombstones before wiping the queue', () => {
  test('the push-first section is located', () => {
    expect(start).toBeGreaterThan(-1);
    expect(fn.length).toBeGreaterThan(0);
  });

  test('it drains the sync queue during the push-first phase', () => {
    expect(fn).toMatch(/drainSyncQueue\(sbClient, prevUid\)/);
  });

  test('it checks the remaining delete-op count', () => {
    expect(fn).toMatch(/getPendingDeleteOpCount\(prevUid\)/);
  });

  test('it aborts sign-out (unless forced) while a delete tombstone remains un-shipped', () => {
    expect(fn).toMatch(/if \(!force && \(deletes\.count \?\? 0\) > 0\) \{[\s\S]*?return \{ ok: false, reason: 'unsynced' \};/);
  });

  test('it also aborts when the delete queue cannot be READ (unknown is not empty)', () => {
    // P1 sync truth: getPendingDeleteOpCount used to return 0 on a failed read,
    // so an unreadable queue passed the `> 0` check and the wipe went ahead.
    // The count check alone can never catch that; the ok flag must be read too.
    expect(fn).toMatch(/if \(!force && !deletes\.ok\) \{[\s\S]*?return \{ ok: false, reason: 'unsynced' \};/);
  });

  test('the drain + delete check sit BEFORE the wipe commitment', () => {
    const drainIdx = SRC.indexOf('drainSyncQueue(sbClient, prevUid)');
    const wipeIdx = SRC.indexOf('SYNC-3: we\'re now committed to wiping');
    expect(drainIdx).toBeGreaterThan(-1);
    expect(wipeIdx).toBeGreaterThan(drainIdx);
  });
});


describe('B3 / B4 (audit 2026-10-17): sign-out delete ops and watermark order', () => {
  test('B3: delete ops are made due again and drained in a bounded loop before the count', () => {
    const reset = SRC.indexOf('sq.resetDeleteOpsForRetry(prevUid)');
    const drain = SRC.indexOf('drainSyncQueue(sbClient, prevUid)');
    const count = SRC.indexOf('const deletes = await sq.getPendingDeleteOpCount(prevUid)');
    expect(reset).toBeGreaterThan(-1);
    expect(reset).toBeLessThan(drain);
    expect(drain).toBeLessThan(count);
    expect(SRC).toMatch(/for \(let pass = 0; pass < 3; pass \+= 1\)/);
  });

  test('B3: a refused sign-out names the deletions that are waiting', () => {
    expect(SRC).toMatch(/reason: 'unsynced', pendingDeletes: deletes\.count/);
  });

  test('B4: the sync watermarks are cleared BEFORE the SQLite wipe', () => {
    const wm = SRC.indexOf("require('../lib/sync/watermark').clearWatermarksForUser(prevUid)");
    const wipe = SRC.indexOf('await wipeAllUserDataWithRetry(prevUid)');
    const storage = SRC.indexOf('await wipeAsyncStorageWithRetry()');
    expect(wm).toBeGreaterThan(-1);
    expect(wm).toBeLessThan(wipe);
    expect(wipe).toBeLessThan(storage);
  });
});
