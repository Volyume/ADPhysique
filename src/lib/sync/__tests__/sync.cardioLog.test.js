/**
 * cardio_log per-table pull (cardio session store, cardio-integration
 * audit). Cardio logging itself is retired (D92-1/D95 founder boundary,
 * Campaign 4): the registry entry is `direction: 'pull_only'` and the push
 * handler is gone (D95 H1), so this suite now only exercises pushTable's
 * pull_only skip plus the retained pull path (a fake supabase client and
 * mocked database helpers, the last-write-wins gate on pull).
 */

jest.mock('../../supabase', () => ({ getSupabaseClient: jest.fn() }));

jest.mock('../../database', () => ({
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

// F5 Phase A: transport carries a per-call Article 9 fail-closed gate
// (docs/f5-legacy-sync-plan-2026-07-02.md, P4). This suite exercises tables
// through pushTable/pullTable, so it primes the consent every device run
// guarantees (F2 hydration) before any call reaches the gate.
beforeAll(() => {
  // eslint-disable-next-line global-require
  require('../../../store/useAppStore').default.setState({ healthConsent: true });
});

describe('cardio_log registration', () => {
  test('is a migrated table', () => {
    expect(MIGRATED_TABLES).toContain('cardio_log');
  });
});

// D95 H1: cardio logging is retired, so cardio_log is pull_only. pushTable
// must refuse before ever touching a handler or the network, the same
// contract every other pull_only table (ed_pattern_flags, tier_history,
// daily_intake_rollups) already gets.
describe('cardio_log push (retired, D95 H1)', () => {
  test('pushTable skips cardio_log as pull_only without calling supabase', async () => {
    const sb = { from: jest.fn() };
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('cardio_log', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0, skipped: 'pull_only' });
    expect(sb.from).not.toHaveBeenCalled();
  });
});

describe('cardio_log pull (LWW)', () => {
  function makePullSb({ data = [], error = null } = {}) {
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          // LS-03b: pull pages via .range() now.
          eq: jest.fn(() => ({
            range: jest.fn(async (from, to) => (
              error ? { data: null, error } : { data: (data || []).slice(from, to + 1), error: null }
            )),
          })),
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

  test('benign skip (errors:0) when the cloud table is not migrated yet', async () => {
    const sb = makePullSb({ data: null, error: { code: '42P01', message: 'relation "cardio_log" does not exist' } });
    getSupabaseClient.mockReturnValue(sb);
    const result = await pullTable('cardio_log', { userId: 'u1' });
    expect(result).toMatchObject({ count: 0, errors: 0, skipped: 'cloud_table_missing' });
    expect(dbModule.insertCardioLogFromCloud).not.toHaveBeenCalled();
  });

  test('count:0 when cloud has nothing', async () => {
    const sb = makePullSb({ data: [] });
    getSupabaseClient.mockReturnValue(sb);
    const result = await pullTable('cardio_log', { userId: 'u1' });
    expect(result).toEqual({ count: 0, errors: 0 });
  });
});
