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

    expect(mockSync.syncBodyMetric).toHaveBeenCalledWith(UID, { weightKg: 80 });
    expect(mockSync.bulkUploadLocalData).not.toHaveBeenCalled();
    expect(res).toMatchObject({ drained: 1 });
  });
});
