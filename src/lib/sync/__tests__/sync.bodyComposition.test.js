/**
 * body_composition_log per-table push (D16, NAV-2 weigh-in edit/delete).
 *
 * Pins the fix that made soft-deleted (edited-away / deleted) Body Metrics
 * entries actually propagate to the cloud: getBodyMetricLog's default read
 * now excludes deleted_at rows (so the History list and every other UI
 * consumer never sees a tombstone), which means the sync push MUST pass
 * { includeDeleted: true } or a delete would silently stop syncing while
 * still surviving on another device's pull. Mirrors sync.cardioLog.test.js.
 */

jest.mock('../../supabase', () => ({ getSupabaseClient: jest.fn() }));

jest.mock('../../database', () => ({
  getBodyMetricLog: jest.fn(),
  insertBodyMetricFromCloud: jest.fn(),
  getBodyMetricUpdatedAt: jest.fn(),
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

beforeAll(() => {
  // eslint-disable-next-line global-require
  require('../../../store/useAppStore').default.setState({ healthConsent: true });
});

describe('body_composition_log registration', () => {
  test('is a migrated table', () => {
    expect(MIGRATED_TABLES).toContain('body_composition_log');
  });
});

describe('body_composition_log push', () => {
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

  test('reads the local log with includeDeleted so a tombstone still pushes', async () => {
    dbModule.getBodyMetricLog.mockResolvedValue([]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });

    expect(dbModule.getBodyMetricLog).toHaveBeenCalledWith('u1', 365, { includeDeleted: true });
  });

  test('propagates a soft-deleted (edited-away/deleted) entry as a cloud tombstone', async () => {
    dbModule.getBodyMetricLog.mockResolvedValue([
      {
        id: 'bm1', loggedAt: Date.UTC(2026, 6, 1), weightKg: 82,
        updatedAt: Date.UTC(2026, 6, 2), deletedAt: Date.UTC(2026, 6, 2),
      },
    ]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });

    expect(result.count).toBe(1);
    expect(sb._calls.upserts[0].rows[0].deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('a live (non-deleted) entry pushes with deleted_at null', async () => {
    dbModule.getBodyMetricLog.mockResolvedValue([
      { id: 'bm2', loggedAt: Date.UTC(2026, 6, 3), weightKg: 81, updatedAt: Date.UTC(2026, 6, 3), deletedAt: null },
    ]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });

    expect(result.count).toBe(1);
    expect(sb._calls.upserts[0].rows[0].deleted_at).toBeNull();
  });
});

// LS-07: metric_date must be the LOCAL calendar day (dayKey.js's
// localDayKey), not a UTC ISO slice -- an early-morning BST weigh-in is a
// different UTC day to its local day. Proves the push path delegates to
// the real, shared localDayKey rather than re-deriving the day itself
// (the genuine BST round-trip is proven separately, under a real
// Europe/London Node process, in bodyComposition.lsO7.dst.test.js -- Jest
// itself cannot exercise a real BST offset because its sandbox timezone
// is pinned at startup).
describe('body_composition_log push: metric_date uses the shared local-day key (LS-07)', () => {
  function makeSb() {
    const calls = { upserts: [] };
    return {
      _calls: calls,
      from: jest.fn(() => ({
        upsert: jest.fn(async (rows) => {
          calls.upserts.push(rows);
          return { error: null };
        }),
      })),
    };
  }

  test('metric_date is produced by the real localDayKey helper, given the raw loggedAt ms', async () => {
    // eslint-disable-next-line global-require
    const dayKeyModule = require('../../dayKey');
    const spy = jest.spyOn(dayKeyModule, 'localDayKey');

    const loggedAt = Date.UTC(2026, 6, 15, 23, 30, 0); // arbitrary instant
    dbModule.getBodyMetricLog.mockResolvedValue([
      { id: 'bm1', loggedAt, weightKg: 80, updatedAt: loggedAt, deletedAt: null },
    ]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });

    expect(spy).toHaveBeenCalledWith(loggedAt);
    expect(sb._calls.upserts[0][0].metric_date).toBe(dayKeyModule.localDayKey(loggedAt));
    spy.mockRestore();
  });

  test('a falsy loggedAt still yields a null metric_date and the row is filtered out', async () => {
    dbModule.getBodyMetricLog.mockResolvedValue([
      { id: 'bm-no-date', loggedAt: 0, weightKg: 80, updatedAt: 1, deletedAt: null },
    ]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });
    expect(result.count).toBe(0); // filtered: no metric_date
  });
});

// LS-07 source guard: locks the fix in place so a future edit can't
// silently reintroduce the UTC ISO-slice bug.
describe('LS-07 source guard', () => {
  test('msToDate no longer derives the day via a UTC toISOString slice', () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '../tables/bodyComposition.js'),
      'utf8',
    );
    expect(source).not.toMatch(/return\s+new Date\(ms\)\.toISOString\(\)\.split/);
    expect(source).toMatch(/localDayKey\(/);
  });
});

describe('body_composition_log pull (LWW)', () => {
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
        { user_id: 'u1', id: 'bm1', metric_date: '2026-07-01', updated_at: new Date(1000).toISOString() },
        { user_id: 'u1', id: 'bm2', metric_date: '2026-07-02', updated_at: new Date(5000).toISOString() },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.getBodyMetricUpdatedAt.mockImplementation(async (_uid, id) => (id === 'bm1' ? 9999 : null));
    dbModule.insertBodyMetricFromCloud.mockResolvedValue(true);

    const result = await pullTable('body_composition_log', { userId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0, skipped: 1 });
    expect(dbModule.insertBodyMetricFromCloud).toHaveBeenCalledTimes(1);
    expect(dbModule.insertBodyMetricFromCloud).toHaveBeenCalledWith('u1', expect.objectContaining({ id: 'bm2' }));
  });
});
