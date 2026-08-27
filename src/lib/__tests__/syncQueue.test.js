/**
 * syncQueue drain, body_metric fallback (audit Phase 1 / finding B2).
 *
 * The legacy queue's body_metric op used to call its dedicated sync fn
 * and unconditionally report success, so if that export were ever
 * renamed or removed the op would be deleted without shipping, silent
 * data loss. morning_weight and check_in already fall back to the bulk
 * push in that case; body_metric now matches them. These tests pin that
 * fallback and the normal path.
 *
 * db() and ./sync are mocked (expo-sqlite is unavailable under node);
 * we assert which sync fn the drain reached and that the op was drained
 * (DELETE), not stranded (retry).
 */

const mockDb = {
  getAllAsync: jest.fn(async () => []),
  runAsync: jest.fn(async () => {}),
  getFirstAsync: jest.fn(async () => ({ c: 0 })),
};
jest.mock('../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../errorLog', () => ({
  logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn(),
}));

const mockSync = {};
jest.mock('../sync', () => mockSync);

const { drainSyncQueue } = require('../syncQueue');

const CLIENT = {}; // any truthy supabase client
const UID = 'user-1';

function bodyMetricRow(over = {}) {
  return {
    id: 'q1', op_type: 'body_metric', entity_id: 'bm1', user_id: UID,
    payload: JSON.stringify({ weightKg: 80 }),
    created_at: 1, retries: 0, next_attempt_at: 0, last_error: null,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.getAllAsync.mockResolvedValue([]);
  // Reset the mocked sync surface each test.
  delete mockSync.syncBodyMetric;
  mockSync.bulkUploadLocalData = jest.fn(async () => {});
});

describe('drainSyncQueue body_metric fallback (B2)', () => {
  test('falls back to bulkUploadLocalData when syncBodyMetric is missing; op is drained, not stranded', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([bodyMetricRow()]);
    // syncBodyMetric intentionally absent (simulates a renamed/removed export).

    const res = await drainSyncQueue(CLIENT, UID);

    expect(mockSync.bulkUploadLocalData).toHaveBeenCalledWith(UID, UID);
    // Drained: the op row was deleted, not left for retry.
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM pending_sync_ops/),
      ['q1'],
    );
    expect(res).toMatchObject({ drained: 1, failed: 0 });
  });

  test('uses syncBodyMetric when present, no bulk fallback', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([bodyMetricRow()]);
    mockSync.syncBodyMetric = jest.fn(async () => {});

    const res = await drainSyncQueue(CLIENT, UID);

    // rethrow:true so a real cloud failure throws to the queue (F-003) rather
    // than the helper re-enqueuing and the drain reporting a false success.
    expect(mockSync.syncBodyMetric).toHaveBeenCalledWith(UID, { weightKg: 80 }, { rethrow: true });
    expect(mockSync.bulkUploadLocalData).not.toHaveBeenCalled();
    expect(res).toMatchObject({ drained: 1 });
  });

  test('a real cloud failure is counted failed and the row is kept, not a false drain (F-003)', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([bodyMetricRow()]);
    // With rethrow:true the helper throws on a cloud failure instead of
    // re-enqueuing; the queue must record a failure, not delete the op.
    mockSync.syncBodyMetric = jest.fn(async () => { throw new Error('rls denied'); });

    const res = await drainSyncQueue(CLIENT, UID);

    expect(res).toMatchObject({ drained: 0, failed: 1 });
    expect(mockDb.runAsync).not.toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM pending_sync_ops/),
      ['q1'],
    );
  });
});

describe('AC-04: getPendingDeleteOpCount counts un-shipped delete tombstones', () => {
  const { getPendingDeleteOpCount } = require('../syncQueue');

  test('counts workout_delete / workout_set_delete rows for the user', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ c: 3 });
    const r = await getPendingDeleteOpCount('u1');
    expect(r).toEqual({ ok: true, count: 3 });
    // The query is scoped to the two cloud-DELETE op types, not all pending ops.
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringMatching(/op_type IN \('workout_delete', 'workout_set_delete'\)/),
      ['u1'],
    );
  });

  test('a missing user is a genuine zero, but a query failure is UNKNOWN', async () => {
    // INVERTED 2026-08-27, adversarial audit P1. This test previously asserted
    // that a query failure "tolerates" its way to 0. That was the defect: the
    // sign-out guard reads this count to decide whether wiping
    // pending_sync_ops is safe, so an unreadable queue looked like an empty
    // one, the wipe destroyed the delete tombstones, and every workout the user
    // had deleted offline came back on the next sign-in.
    //
    // No user really does mean no tombstones, so that stays a measured zero.
    expect(await getPendingDeleteOpCount(null)).toEqual({ ok: true, count: 0 });
    // A failed read knows nothing, and must say so rather than guess zero.
    mockDb.getFirstAsync.mockRejectedValueOnce(new Error('no table'));
    expect(await getPendingDeleteOpCount('u1')).toEqual({ ok: false, count: null });
  });
});

describe('C6 S-5 (D97-23): offline never spends the delete retry budget', () => {
  // The drain reads rows WHERE retries < MAX_RETRIES; before this ruling
  // six offline foreground drains parked a delete op for 365 days and it
  // was never retried after reconnecting - sign-out refused for ever and
  // the deleted workout resurrected from the cloud on reinstall.
  const row = (retries = 0) => ({
    id: 'q1', user_id: 'u1', op_type: 'workout_delete', entity_id: 'w1',
    retries, next_attempt_at: 0, created_at: 1,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('a network-shaped failure reschedules WITHOUT incrementing retries', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([row(5)]); // one failure from parking
    mockSync.deleteWorkoutFromCloud = jest.fn(async () => { throw new Error('Network request failed'); });
    await drainSyncQueue(CLIENT, 'u1');
    // The reschedule UPDATE must not touch the retries column.
    const updates = mockDb.runAsync.mock.calls.filter(([sql]) => /UPDATE pending_sync_ops/.test(sql));
    expect(updates.length).toBe(1);
    expect(updates[0][0]).not.toMatch(/SET retries/);
    // And it is scheduled for a finite backoff, not the 365-day park.
    const nextAt = updates[0][1][1];
    expect(nextAt - Date.now()).toBeLessThanOrEqual(8 * 60 * 60_000 + 1000);
  });

  test('a definitive failure still counts toward the budget and can park', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([row(5)]);
    mockSync.deleteWorkoutFromCloud = jest.fn(async () => { throw new Error('row-level security violation'); });
    await drainSyncQueue(CLIENT, 'u1');
    const updates = mockDb.runAsync.mock.calls.filter(([sql]) => /UPDATE pending_sync_ops/.test(sql));
    expect(updates.length).toBe(1);
    expect(updates[0][0]).toMatch(/SET retries = \?/);
    expect(updates[0][1][0]).toBe(6); // parked at MAX_RETRIES
  });
});
