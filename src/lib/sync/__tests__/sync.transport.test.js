/**
 * transport.pushTable / pullTable dispatch tests + the
 * notification_preferences per-table handler that is the first
 * table fully migrated off the legacy bulkUploadLocalData /
 * pullFromCloud helpers.
 *
 * Coverage:
 *   - MIGRATED_TABLES is the canonical list.
 *   - pushTable / pullTable refuse unknown tables.
 *   - pushTable returns skipped:'pull_only' for pull-only registry rows.
 *   - pushTable / pullTable return skipped:'no_handler' when the
 *     registry has the entry but no handler is wired (e.g. an
 *     unmigrated bidirectional table).
 *   - pushTable / pullTable return skipped:'no_client' when the
 *     supabase client is unavailable (offline / not signed in).
 *   - notification_preferences push: latest-by-category fold,
 *     read-server-then-skip-stale, upsert with onConflict.
 *   - notification_preferences pull: applyPreferenceFromPull is
 *     called for every server row.
 */

jest.mock('../../supabase', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('../../notifications/preferences', () => ({
  getAllPreferences: jest.fn(),
  applyPreferenceFromPull: jest.fn(),
}));

jest.mock('../telemetry', () => ({
  trackSyncRun: jest.fn().mockResolvedValue(undefined),
  trackSyncConflictResolved: jest.fn().mockResolvedValue(undefined),
  logSyncError: jest.fn(),
}));

const { getSupabaseClient } = require('../../supabase');
const prefsModule = require('../../notifications/preferences');
const {
  MIGRATED_TABLES,
  pushTable,
  pullTable,
} = require('../transport');

function makeSb({ select = [], readError = null, upsertError = null } = {}) {
  const calls = { upsert: null, selectFilter: null };
  const fromMock = jest.fn((table) => {
    return {
      _table: table,
      select: jest.fn(function (cols) {
        return {
          eq: jest.fn(function (k, v) {
            calls.selectFilter = { table, cols, eq: { k, v } };
            return {
              in: jest.fn(async () => ({ data: select, error: readError })),
              then: undefined,
              // Allow `await sb.from(...).select(...).eq(...)` to resolve
              // for the pull path (which doesn't chain .in()).
            };
          }),
          // For pull: `.select(cols).eq('user_id', userId)` directly.
          // The eq above already returns the chain. Pull awaits it.
        };
      }),
      upsert: jest.fn(async function (rows, opts) {
        calls.upsert = { rows, opts };
        return { error: upsertError };
      }),
    };
  });
  return { from: fromMock, _calls: calls };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MIGRATED_TABLES', () => {
  test('lists notification_preferences first', () => {
    expect(MIGRATED_TABLES).toContain('notification_preferences');
  });

  test('is frozen so callers can iterate but not mutate', () => {
    expect(() => { MIGRATED_TABLES.push('food_entries'); }).toThrow();
  });
});

describe('pushTable dispatch', () => {
  test('returns errors:1 for unknown table', async () => {
    const result = await pushTable('not_a_real_table', { userId: 'u1' });
    expect(result).toMatchObject({ count: 0, errors: 1, reason: 'unknown_table' });
  });

  test('returns skipped:pull_only for pull-only registry rows', async () => {
    const result = await pushTable('daily_intake_rollups', { userId: 'u1' });
    expect(result).toMatchObject({ count: 0, errors: 0, skipped: 'pull_only' });
  });

  test('returns skipped:no_handler for bidirectional table without handler', async () => {
    // food_entries is in the registry but has no migrated handler.
    const result = await pushTable('food_entries', { userId: 'u1' });
    expect(result).toMatchObject({ count: 0, errors: 0, skipped: 'no_handler' });
  });

  test('returns skipped:no_client when supabase client unavailable', async () => {
    getSupabaseClient.mockReturnValue(null);
    const result = await pushTable('notification_preferences', { userId: 'u1' });
    expect(result).toMatchObject({ count: 0, errors: 0, skipped: 'no_client' });
  });
});

describe('pullTable dispatch', () => {
  test('returns errors:1 for unknown table', async () => {
    const result = await pullTable('not_a_real_table', { userId: 'u1' });
    expect(result).toMatchObject({ count: 0, errors: 1, reason: 'unknown_table' });
  });

  test('returns skipped:no_handler for unmigrated table', async () => {
    const result = await pullTable('food_entries', { userId: 'u1' });
    expect(result).toMatchObject({ count: 0, errors: 0, skipped: 'no_handler' });
  });

  test('returns skipped:no_client when supabase client unavailable', async () => {
    getSupabaseClient.mockReturnValue(null);
    const result = await pullTable('notification_preferences', { userId: 'u1' });
    expect(result).toMatchObject({ count: 0, errors: 0, skipped: 'no_client' });
  });
});

describe('notification_preferences push', () => {
  test('folds duplicate-category rows to the latest updated_at, then upserts', async () => {
    prefsModule.getAllPreferences.mockImplementation(async (uid) => {
      if (uid === 'user-1') {
        return [
          { category: 'morning_weight', enabled: true,  time_pref: '08:00', updated_at: 1000 },
          { category: 'morning_weight', enabled: false, time_pref: '09:00', updated_at: 3000 }, // newer
          { category: 'weekly_checkin', enabled: true,  time_pref: 'sun',   updated_at: 2000 },
        ];
      }
      return [];
    });

    const sb = makeSb({ select: [] });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('notification_preferences', { userId: 'user-1', localUserId: 'user-1' });

    expect(result.count).toBe(2);
    expect(result.errors).toBe(0);
    const upsertCall = sb._calls.upsert;
    expect(upsertCall.opts).toEqual({ onConflict: 'user_id,category' });
    // morning_weight is the newer (enabled:false, time_pref:09:00) row
    const mw = upsertCall.rows.find((r) => r.category === 'morning_weight');
    expect(mw.enabled).toBe(false);
    expect(mw.time_pref).toBe('09:00');
    expect(mw.user_id).toBe('user-1');
    expect(mw.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO
  });

  test('skips rows the server has a newer copy of', async () => {
    prefsModule.getAllPreferences.mockImplementation(async (uid) => {
      if (uid === 'user-1') {
        return [
          { category: 'morning_weight', enabled: true, time_pref: '08:00', updated_at: 1000 },
          { category: 'weekly_checkin', enabled: true, time_pref: 'sun',   updated_at: 5000 },
        ];
      }
      return [];
    });

    const sb = makeSb({
      select: [
        { category: 'morning_weight', updated_at: new Date(9999).toISOString() }, // newer server
        { category: 'weekly_checkin', updated_at: new Date(2000).toISOString() }, // older server
      ],
    });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('notification_preferences', { userId: 'user-1', localUserId: 'user-1' });

    expect(result.count).toBe(1); // only weekly_checkin upserted
    expect(result.skipped).toBe(1);
    const upserted = sb._calls.upsert.rows;
    expect(upserted).toHaveLength(1);
    expect(upserted[0].category).toBe('weekly_checkin');
  });

  test('returns count:0 with no errors when there are no local rows', async () => {
    prefsModule.getAllPreferences.mockResolvedValue([]);
    const sb = makeSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('notification_preferences', { userId: 'user-1', localUserId: 'user-1' });

    expect(result).toEqual({ count: 0, errors: 0 });
    expect(sb._calls.upsert).toBeNull();
  });

  test('errors:1 when the read-server step fails', async () => {
    prefsModule.getAllPreferences.mockResolvedValue([
      { category: 'morning_weight', enabled: true, time_pref: '08:00', updated_at: 1000 },
    ]);
    const sb = makeSb({ readError: new Error('boom') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('notification_preferences', { userId: 'user-1', localUserId: 'user-1' });

    expect(result.errors).toBe(1);
    expect(result.count).toBe(0);
  });
});

describe('notification_preferences pull', () => {
  function makePullSb({ data, error = null } = {}) {
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(async () => ({ data, error })),
        })),
      })),
    };
  }

  test('calls applyPreferenceFromPull for each cloud row', async () => {
    const sb = makePullSb({
      data: [
        { user_id: 'u1', category: 'morning_weight',  enabled: true,  time_pref: '08:00', updated_at: new Date(5000).toISOString() },
        { user_id: 'u1', category: 'weekly_checkin',  enabled: false, time_pref: 'sun',   updated_at: new Date(6000).toISOString() },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    prefsModule.applyPreferenceFromPull.mockResolvedValue(true);

    const result = await pullTable('notification_preferences', { userId: 'u1' });

    expect(result).toEqual({ count: 2, errors: 0 });
    expect(prefsModule.applyPreferenceFromPull).toHaveBeenCalledTimes(2);
    expect(prefsModule.applyPreferenceFromPull).toHaveBeenCalledWith('u1', 'morning_weight', expect.objectContaining({
      enabled: true,
      time_pref: '08:00',
      updated_at: 5000,
    }));
  });

  test('count counts only rows that were actually applied', async () => {
    const sb = makePullSb({
      data: [
        { category: 'a', enabled: true, time_pref: null, updated_at: new Date(1).toISOString() },
        { category: 'b', enabled: true, time_pref: null, updated_at: new Date(2).toISOString() },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    prefsModule.applyPreferenceFromPull.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await pullTable('notification_preferences', { userId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
  });

  test('errors:1 when the cloud select fails', async () => {
    const sb = makePullSb({ data: null, error: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('notification_preferences', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
    expect(prefsModule.applyPreferenceFromPull).not.toHaveBeenCalled();
  });

  test('count 0 when cloud has nothing', async () => {
    const sb = makePullSb({ data: [] });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('notification_preferences', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
  });
});
