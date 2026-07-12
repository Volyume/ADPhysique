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
    const n = await getPendingDeleteOpCount('u1');
    expect(n).toBe(3);
    // The query is scoped to the two cloud-DELETE op types, not all pending ops.
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringMatching(/op_type IN \('workout_delete', 'workout_set_delete'\)/),
      ['u1'],
    );
  });

  test('returns 0 for a missing user and tolerates a query failure', async () => {
    expect(await getPendingDeleteOpCount(null)).toBe(0);
    mockDb.getFirstAsync.mockRejectedValueOnce(new Error('no table'));
    expect(await getPendingDeleteOpCount('u1')).toBe(0);
  });
});
