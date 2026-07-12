/**
 * daily_steps per-table push + pull (activity store, cardio/steps audit).
 *
 * Mirrors the body_composition_log handler tests: a fake supabase client and
 * mocked database helpers, exercising the map-to-cloud-shape + batched upsert
 * on push, and the last-write-wins gate on pull.
 */

jest.mock('../../supabase', () => ({ getSupabaseClient: jest.fn() }));

jest.mock('../../database', () => ({
  getDailyStepsForPush: jest.fn(),
  insertDailyStepsFromCloud: jest.fn(),
  getDailyStepsUpdatedAt: jest.fn(),
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

// F5 Phase A: transport carries a per-call Article 9 fail-closed gate
// (docs/f5-legacy-sync-plan-2026-07-02.md, P4). This suite exercises tables
// through pushTable/pullTable, so it primes the consent every device run
// guarantees (F2 hydration) before any call reaches the gate.
beforeAll(() => {
  // eslint-disable-next-line global-require
  require('../../../store/useAppStore').default.setState({ healthConsent: true });
});

describe('daily_steps registration', () => {
  test('is a migrated table', () => {
    expect(MIGRATED_TABLES).toContain('daily_steps');
  });
});

describe('daily_steps push', () => {
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

  test('maps camelCase rows to the cloud shape and upserts on (user_id, entry_date)', async () => {
    dbModule.getDailyStepsForPush.mockResolvedValue([
      { entryDate: '2026-05-30', steps: 8421, source: 'manual', updatedAt: 1700000000000 },
    ]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('daily_steps', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
    const upsert = sb._calls.upserts[0];
    expect(upsert.opts).toEqual({ onConflict: 'user_id,entry_date' });
    expect(upsert.rows[0]).toMatchObject({
      user_id: 'u1',
      entry_date: '2026-05-30',
      steps: 8421,
      source: 'manual',
    });
    expect(upsert.rows[0].updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO
  });

  test('batches at 200 rows per upsert', async () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({
      entryDate: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      steps: 1000 + i,
      source: 'manual',
      updatedAt: 1700000000000 + i,
    }));
    dbModule.getDailyStepsForPush.mockResolvedValue(rows);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('daily_steps', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 250, errors: 0 });
    expect(sb._calls.upserts).toHaveLength(2);
    expect(sb._calls.upserts[0].rows).toHaveLength(200);
    expect(sb._calls.upserts[1].rows).toHaveLength(50);
  });

  test('count:0 errors:0 when there are no local rows', async () => {
    dbModule.getDailyStepsForPush.mockResolvedValue([]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('daily_steps', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
    expect(sb._calls.upserts).toHaveLength(0);
  });

  test('counts batch errors without throwing', async () => {
    dbModule.getDailyStepsForPush.mockResolvedValue([
      { entryDate: '2026-05-30', steps: 5000, source: 'manual', updatedAt: 1 },
    ]);
    const sb = makeSb({ upsertError: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('daily_steps', { userId: 'u1', localUserId: 'u1' });

    expect(result.errors).toBe(1);
    expect(result.count).toBe(0);
  });

  test('benign-skips (errors:0) when the cloud table is not migrated yet', async () => {
    // A missing cloud table must not trip the push-first sign-out guard, the
    // exact failure mode the cardio_log fix closed. daily_steps shares it now.
    dbModule.getDailyStepsForPush.mockResolvedValue([
      { entryDate: '2026-05-30', steps: 5000, source: 'manual', updatedAt: 1 },
    ]);
    const sb = makeSb({ upsertError: { code: 'PGRST205', message: "Could not find the table 'public.daily_steps' in the schema cache" } });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('daily_steps', { userId: 'u1', localUserId: 'u1' });

    expect(result).toMatchObject({ count: 0, errors: 0, skipped: 'cloud_table_missing' });
  });
});

describe('daily_steps pull (LWW)', () => {
  function makePullSb({ data = [], error = null } = {}) {
    // LS-03b: the pull now pages via .range(); model it so one page returns
    // the (sub-1000-row) data and the loop ends on the short page.
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            range: jest.fn(async (from, to) => (
              error ? { data: null, error } : { data: (data || []).slice(from, to + 1), error: null }
            )),
          })),
        })),
      })),
    };
  }

  test('skips cloud rows the local copy is newer than, applies the rest', async () => {
    const sb = makePullSb({
      data: [
        { user_id: 'u1', entry_date: '2026-05-29', steps: 7000, source: 'manual', updated_at: new Date(1000).toISOString() },
        { user_id: 'u1', entry_date: '2026-05-30', steps: 9000, source: 'health', updated_at: new Date(5000).toISOString() },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.getDailyStepsUpdatedAt.mockImplementation(async (_uid, date) => {
      if (date === '2026-05-29') return 9999; // local newer than cloud
      return null;                            // no local copy of the 30th
    });
    dbModule.insertDailyStepsFromCloud.mockResolvedValue(undefined);

    const result = await pullTable('daily_steps', { userId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0, skipped: 1 });
    expect(dbModule.insertDailyStepsFromCloud).toHaveBeenCalledTimes(1);
    expect(dbModule.insertDailyStepsFromCloud).toHaveBeenCalledWith('u1', expect.objectContaining({ entry_date: '2026-05-30' }));
  });

  test('errors:1 when the select fails', async () => {
    const sb = makePullSb({ data: null, error: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('daily_steps', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
    expect(dbModule.insertDailyStepsFromCloud).not.toHaveBeenCalled();
  });

  test('count:0 when cloud has nothing', async () => {
    const sb = makePullSb({ data: [] });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('daily_steps', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
  });

  test('benign-skips (errors:0) when the cloud table is not migrated yet', async () => {
    const sb = makePullSb({ data: null, error: { code: '42P01', message: 'relation "daily_steps" does not exist' } });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('daily_steps', { userId: 'u1' });

    expect(result).toMatchObject({ count: 0, errors: 0, skipped: 'cloud_table_missing' });
    expect(dbModule.insertDailyStepsFromCloud).not.toHaveBeenCalled();
  });
});
