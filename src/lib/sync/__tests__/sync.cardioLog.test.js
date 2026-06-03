/**
 * cardio_log per-table push + pull (cardio session store, cardio-integration
 * audit). Mirrors sync.dailySteps.test.js: a fake supabase client and mocked
 * database helpers, exercising the map-to-cloud-shape + batched upsert on push
 * (incl. soft-delete propagation), and the last-write-wins gate on pull.
 */

jest.mock('../../supabase', () => ({ getSupabaseClient: jest.fn() }));

jest.mock('../../database', () => ({
  getCardioLogForPush: jest.fn(),
  insertCardioLogFromCloud: jest.fn(),
  getCardioLogUpdatedAt: jest.fn(),
}));

jest.mock('../telemetry', () => ({
  trackSyncRun: jest.fn().mockResolvedValue(undefined),
  trackSyncConflictResolved: jest.fn().mockResolvedValue(undefined),
  logSyncError: jest.fn(),
}));

const { getSupabaseClient } = require('../../supabase');
const dbModule = require('../../database');
const { pushTable, pullTable, MIGRATED_TABLES } = require('../transport');

beforeEach(() => jest.clearAllMocks());

describe('cardio_log registration', () => {
  test('is a migrated table', () => {
    expect(MIGRATED_TABLES).toContain('cardio_log');
  });
});

describe('cardio_log push', () => {
  function makeSb({ upsertError = null } = {}) {
    const calls = { upserts: [] };
    return {
      _calls: calls,
      from: jest.fn(() => ({
        upsert: jest.fn(async (rows, opts) => {
          calls.upserts.push({ rows, opts });
          return { error: upsertError };
        }),
      })),
    };
  }

  test('maps a session to the cloud shape and upserts on (user_id, id)', async () => {
    dbModule.getCardioLogForPush.mockResolvedValue([
      {
        id: 'c1', entryDate: '2026-06-03', activityId: 'a1', activityName: 'Outdoor Run',
        category: 'running', durationMin: 30, intensity: 'moderate', met: 9.8, estKcal: 392,
        recoveryImpact: 'moderate', impactType: 'both', source: 'manual',
        createdAt: 1700000000000, updatedAt: 1700000000000, deletedAt: null,
      },
    ]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('cardio_log', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
    const upsert = sb._calls.upserts[0];
    expect(upsert.opts).toEqual({ onConflict: 'user_id,id' });
    expect(upsert.rows[0]).toMatchObject({
      user_id: 'u1', id: 'c1', entry_date: '2026-06-03',
      activity_name: 'Outdoor Run', duration_min: 30, est_kcal: 392,
    });
    expect(upsert.rows[0].updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(upsert.rows[0].deleted_at).toBeNull();
  });

  test('propagates a soft delete (deleted_at set)', async () => {
    dbModule.getCardioLogForPush.mockResolvedValue([
      { id: 'c2', entryDate: '2026-06-01', activityName: 'Cardio', durationMin: 20, intensity: 'low', updatedAt: 2, deletedAt: 1700000005000 },
    ]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('cardio_log', { userId: 'u1', localUserId: 'u1' });
    expect(result.count).toBe(1);
    expect(sb._calls.upserts[0].rows[0].deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('batches at 200 rows per upsert', async () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({
      id: `c${i}`, entryDate: '2026-06-03', activityName: 'Cardio', durationMin: 20, intensity: 'low', updatedAt: 1700000000000 + i,
    }));
    dbModule.getCardioLogForPush.mockResolvedValue(rows);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('cardio_log', { userId: 'u1', localUserId: 'u1' });
    expect(result).toEqual({ count: 250, errors: 0 });
    expect(sb._calls.upserts).toHaveLength(2);
  });

  test('count:0 errors:0 when there are no local rows', async () => {
    dbModule.getCardioLogForPush.mockResolvedValue([]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);
    const result = await pushTable('cardio_log', { userId: 'u1', localUserId: 'u1' });
    expect(result).toEqual({ count: 0, errors: 0 });
  });
});

describe('cardio_log pull (LWW)', () => {
  function makePullSb({ data = [], error = null } = {}) {
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(async () => ({ data, error })),
        })),
      })),
    };
  }

  test('skips rows the local copy is newer than, applies the rest', async () => {
    const sb = makePullSb({
      data: [
        { user_id: 'u1', id: 'c1', entry_date: '2026-06-01', activity_name: 'Run', updated_at: new Date(1000).toISOString() },
        { user_id: 'u1', id: 'c2', entry_date: '2026-06-02', activity_name: 'Bike', updated_at: new Date(5000).toISOString() },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.getCardioLogUpdatedAt.mockImplementation(async (_uid, id) => (id === 'c1' ? 9999 : null));
    dbModule.insertCardioLogFromCloud.mockResolvedValue(true);

    const result = await pullTable('cardio_log', { userId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0, skipped: 1 });
    expect(dbModule.insertCardioLogFromCloud).toHaveBeenCalledTimes(1);
    expect(dbModule.insertCardioLogFromCloud).toHaveBeenCalledWith('u1', expect.objectContaining({ id: 'c2' }));
  });

  test('errors:1 when the select fails', async () => {
    const sb = makePullSb({ data: null, error: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);
    const result = await pullTable('cardio_log', { userId: 'u1' });
    expect(result).toEqual({ count: 0, errors: 1 });
    expect(dbModule.insertCardioLogFromCloud).not.toHaveBeenCalled();
  });

  test('count:0 when cloud has nothing', async () => {
    const sb = makePullSb({ data: [] });
    getSupabaseClient.mockReturnValue(sb);
    const result = await pullTable('cardio_log', { userId: 'u1' });
    expect(result).toEqual({ count: 0, errors: 0 });
  });
});
