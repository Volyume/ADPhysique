/**
 * ADVERSARIAL probes for plan_folders sync (claude/codebase-audit-docs-pv6mjd).
 *
 * The shipped planFolders.test.js only asserts SQL strings against a mock; it
 * never round-trips a delete through a pull to prove the folder does not
 * resurrect, and never exercises the LWW gate. These tests drive the REAL
 * pull/push handlers with the database helpers mocked, to attack:
 *   - resurrection: a stale cloud (live) row must NOT revive a locally-deleted folder
 *   - tombstone propagation: a cloud tombstone newer than local must be applied
 *   - same-ms LWW: equal updated_at must not clobber a local edit
 */

jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));

// Mock the database module the handlers require() lazily.
const mockDb = {
  getPlanFoldersForPush: jest.fn(),
  getPlanFolderUpdatedAt: jest.fn(),
  insertPlanFolderFromCloud: jest.fn(),
};
jest.mock('../../database', () => mockDb);

const { pullPlanFolders, pushPlanFolders } = require('../tables/planFolders');

beforeEach(() => {
  jest.clearAllMocks();
});

function sbWithRows(rows) {
  return {
    from: () => ({
      select: () => ({
        eq: async () => ({ data: rows, error: null }),
      }),
    }),
  };
}

describe('pullPlanFolders — resurrection invariant', () => {
  test('a STALE cloud LIVE row must NOT revive a locally-deleted folder', async () => {
    // Local: folder f1 was DELETED at t=2000 (tombstone bumps updated_at to 2000).
    mockDb.getPlanFolderUpdatedAt.mockResolvedValue(2000);
    // Cloud: an older, still-LIVE copy of f1 (updated_at=1000, deleted_at null).
    const sb = sbWithRows([
      { id: 'f1', user_id: 'u1', name: 'Push', sort_order: 0,
        deleted_at: null, created_at: '1970-01-01T00:00:01.000Z',
        updated_at: new Date(1000).toISOString() },
    ]);

    const res = await pullPlanFolders(sb, { userId: 'u1' });

    // The local delete (newer) wins: the stale live cloud row must be SKIPPED,
    // not applied — otherwise the deleted folder resurrects on this device.
    expect(mockDb.insertPlanFolderFromCloud).not.toHaveBeenCalled();
    expect(res.count).toBe(0);
  });

  test('a NEWER cloud tombstone IS applied (delete propagates cross-device)', async () => {
    // Local: folder f1 still live, last touched at t=1000.
    mockDb.getPlanFolderUpdatedAt.mockResolvedValue(1000);
    // Cloud: f1 was deleted elsewhere at t=2000 (tombstone, newer).
    const sb = sbWithRows([
      { id: 'f1', user_id: 'u1', name: 'Push', sort_order: 0,
        deleted_at: new Date(2000).toISOString(),
        created_at: '1970-01-01T00:00:01.000Z',
        updated_at: new Date(2000).toISOString() },
    ]);

    const res = await pullPlanFolders(sb, { userId: 'u1' });

    expect(mockDb.insertPlanFolderFromCloud).toHaveBeenCalledTimes(1);
    const [, row] = mockDb.insertPlanFolderFromCloud.mock.calls[0];
    expect(row.deleted_at).toBe(new Date(2000).toISOString());
    expect(res.count).toBe(1);
  });

  test('SAME-millisecond updated_at: local wins, cloud is NOT applied', async () => {
    // Local edit and cloud edit collide at the exact same ms.
    mockDb.getPlanFolderUpdatedAt.mockResolvedValue(1500);
    const sb = sbWithRows([
      { id: 'f1', user_id: 'u1', name: 'CloudName', sort_order: 0,
        deleted_at: null, created_at: '1970-01-01T00:00:01.000Z',
        updated_at: new Date(1500).toISOString() },
    ]);

    const res = await pullPlanFolders(sb, { userId: 'u1' });

    // Gate is `localUpdatedAt >= cloudUpdatedAt` → equal means skip.
    expect(mockDb.insertPlanFolderFromCloud).not.toHaveBeenCalled();
    expect(res.count).toBe(0);
  });

  test('a brand-new cloud folder (no local row) IS applied', async () => {
    mockDb.getPlanFolderUpdatedAt.mockResolvedValue(0); // not present locally
    const sb = sbWithRows([
      { id: 'fNew', user_id: 'u1', name: 'New', sort_order: 0,
        deleted_at: null, created_at: '1970-01-01T00:00:01.000Z',
        updated_at: new Date(1000).toISOString() },
    ]);

    const res = await pullPlanFolders(sb, { userId: 'u1' });
    expect(mockDb.insertPlanFolderFromCloud).toHaveBeenCalledTimes(1);
    expect(res.count).toBe(1);
  });
});

describe('pushPlanFolders — tombstones ship', () => {
  test('a locally-deleted folder is pushed (tombstone in the upsert batch)', async () => {
    mockDb.getPlanFoldersForPush.mockResolvedValue([
      { id: 'f1', name: 'Live', sortOrder: 0, createdAt: 1, updatedAt: 1, deletedAt: null },
      { id: 'f2', name: 'Gone', sortOrder: 1, createdAt: 1, updatedAt: 2000, deletedAt: 2000 },
    ]);
    let upserted = null;
    const sb = {
      from: () => ({
        upsert: async (batch) => { upserted = batch; return { error: null }; },
      }),
    };

    const res = await pushPlanFolders(sb, { userId: 'u1', localUserId: 'u1' });

    expect(res.count).toBe(2);
    const gone = upserted.find((r) => r.id === 'f2');
    expect(gone.deleted_at).toBe(new Date(2000).toISOString());
  });
});
