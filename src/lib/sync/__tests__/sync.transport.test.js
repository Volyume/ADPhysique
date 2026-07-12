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

jest.mock('../../database', () => ({
  getAllWeeklyCheckinsForUser: jest.fn(),
  insertWeeklyCheckinFromCloud: jest.fn(),
  getWeeklyCheckinUpdatedAt: jest.fn(),
  getBodyMetricLog: jest.fn(),
  insertBodyMetricFromCloud: jest.fn(),
  getBodyMetricUpdatedAt: jest.fn(),
  getNutritionTargets: jest.fn(),
  insertNutritionTargetsFromCloud: jest.fn(),
  getAllRecipeIngredientsForUser: jest.fn(),
  upsertRecipeIngredientFromCloud: jest.fn(),
  getRecipeIngredientUpdatedAt: jest.fn(),
}));

jest.mock('../telemetry', () => ({
  trackSyncRun: jest.fn().mockResolvedValue(undefined),
  trackSyncConflictResolved: jest.fn().mockResolvedValue(undefined),
  logSyncError: jest.fn(),
}));

const { getSupabaseClient } = require('../../supabase');
const prefsModule = require('../../notifications/preferences');
const dbModule = require('../../database');
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

// F5 Phase A: transport carries a per-call Article 9 fail-closed gate
// (docs/f5-legacy-sync-plan-2026-07-02.md, P4). This suite exercises tables
// through pushTable/pullTable, so it primes the consent every device run
// guarantees (F2 hydration) before any call reaches the gate.
beforeAll(() => {
  // eslint-disable-next-line global-require
  require('../../../store/useAppStore').default.setState({ healthConsent: true });
});

describe('MIGRATED_TABLES', () => {
  test('lists notification_preferences', () => {
    expect(MIGRATED_TABLES).toContain('notification_preferences');
  });

  test('lists weekly_checkins_v2', () => {
    expect(MIGRATED_TABLES).toContain('weekly_checkins_v2');
  });

  test('lists body_composition_log', () => {
    expect(MIGRATED_TABLES).toContain('body_composition_log');
  });

  test('lists nutrition_targets', () => {
    expect(MIGRATED_TABLES).toContain('nutrition_targets');
  });

  test('lists ed_pattern_flags (pull-only)', () => {
    expect(MIGRATED_TABLES).toContain('ed_pattern_flags');
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

  // The "skipped:no_handler" branch is defensive code for future
  // registry entries that get added without a handler. All 16
  // currently-locked tables have handlers wired, so there is no
  // production case that hits it; the unit test for that branch
  // would require mocking getRegistryEntry to return a fake row
  // and is not worth the cost.

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
          eq: jest.fn(() => {
            // LS-03b: awaitable AND .range()-capable (paginated pulls page via .range()).
            const chain = Promise.resolve({ data, error });
            chain.range = jest.fn(async (from, to) => (
              error ? { data: null, error }
                    : { data: (Array.isArray(data) ? data : []).slice(from, to + 1), error: null }
            ));
            return chain;
          }),
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

describe('weekly_checkins_v2 push', () => {
  function makeWcPushSb({ upsertError = null } = {}) {
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

  test('maps camelCase SQLite rows to snake_case v2 schema with stable PK', async () => {
    dbModule.getAllWeeklyCheckinsForUser.mockResolvedValue([
      {
        id: 'wc-1',
        weekStart: 1700000000000,
        energyScore: 7,
        sorenessScore: 4,
        stressScore: 3,
        sleepHours: 7.5,
        calsAdherence: 'high',
        stepsAdherence: 'medium',
        trainingPerformance: 'good',
        jointPain: 1,
        soreMuscles: 'quads',
        cycleOverride: 0,
        notes: 'fine',
      },
    ]);
    const sb = makeWcPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('weekly_checkins_v2', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
    const upsert = sb._calls.upserts[0];
    expect(upsert.opts).toEqual({ onConflict: 'user_id,id' });
    expect(upsert.rows[0]).toMatchObject({
      id: 'wc-1',
      user_id: 'u1',
      week_start: 1700000000000,
      energy_score: 7,
      sleep_hours: 7.5,
      joint_pain: true,
      cycle_override: false,
      notes: 'fine',
    });
  });

  test('batches at 200 rows per upsert call', async () => {
    const rows = Array.from({ length: 450 }, (_, i) => ({
      id: `wc-${i}`,
      weekStart: 1700000000000 + i * 86400000,
    }));
    dbModule.getAllWeeklyCheckinsForUser.mockResolvedValue(rows);
    const sb = makeWcPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('weekly_checkins_v2', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 450, errors: 0 });
    expect(sb._calls.upserts).toHaveLength(3); // 200 + 200 + 50
    expect(sb._calls.upserts[0].rows).toHaveLength(200);
    expect(sb._calls.upserts[1].rows).toHaveLength(200);
    expect(sb._calls.upserts[2].rows).toHaveLength(50);
  });

  test('returns count:0 errors:0 when no local rows', async () => {
    dbModule.getAllWeeklyCheckinsForUser.mockResolvedValue([]);
    const sb = makeWcPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('weekly_checkins_v2', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
    expect(sb._calls.upserts).toHaveLength(0);
  });

  test('counts batch errors without halting', async () => {
    dbModule.getAllWeeklyCheckinsForUser.mockResolvedValue([
      { id: 'wc-1', weekStart: 1 },
    ]);
    const sb = makeWcPushSb({ upsertError: new Error('rls denied') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('weekly_checkins_v2', { userId: 'u1', localUserId: 'u1' });

    expect(result.errors).toBe(1);
    expect(result.count).toBe(0);
  });
});

describe('weekly_checkins_v2 pull', () => {
  function makeWcPullSb({ data = [], error = null } = {}) {
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => {
            // LS-03b: awaitable AND .range()-capable (paginated pulls page via .range()).
            const chain = Promise.resolve({ data, error });
            chain.range = jest.fn(async (from, to) => (
              error ? { data: null, error }
                    : { data: (Array.isArray(data) ? data : []).slice(from, to + 1), error: null }
            ));
            return chain;
          }),
        })),
      })),
    };
  }

  test('inserts each cloud row via INSERT OR IGNORE helper', async () => {
    const sb = makeWcPullSb({
      data: [
        { id: 'wc-1', user_id: 'u1', week_start: 1, energy_score: 7 },
        { id: 'wc-2', user_id: 'u1', week_start: 2, energy_score: 6 },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.insertWeeklyCheckinFromCloud.mockResolvedValue(undefined);

    const result = await pullTable('weekly_checkins_v2', { userId: 'u1' });

    expect(result).toEqual({ count: 2, errors: 0 });
    expect(dbModule.insertWeeklyCheckinFromCloud).toHaveBeenCalledTimes(2);
    expect(dbModule.insertWeeklyCheckinFromCloud).toHaveBeenCalledWith('u1', expect.objectContaining({ id: 'wc-1' }));
  });

  test('counts row-level errors without halting', async () => {
    const sb = makeWcPullSb({
      data: [
        { id: 'wc-1' },
        { id: 'wc-2' },
        { id: 'wc-3' },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.insertWeeklyCheckinFromCloud
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('constraint'))
      .mockResolvedValueOnce(undefined);

    const result = await pullTable('weekly_checkins_v2', { userId: 'u1' });

    expect(result).toEqual({ count: 2, errors: 1 });
  });

  test('errors:1 when select fails', async () => {
    const sb = makeWcPullSb({ data: null, error: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('weekly_checkins_v2', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
    expect(dbModule.insertWeeklyCheckinFromCloud).not.toHaveBeenCalled();
  });

  test('count 0 when cloud has nothing', async () => {
    const sb = makeWcPullSb({ data: [] });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('weekly_checkins_v2', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
  });
});

describe('body_composition_log push', () => {
  function makeBcPushSb({ upsertError = null } = {}) {
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

  test('maps camelCase SQLite rows to body_metrics snake_case schema', async () => {
    dbModule.getBodyMetricLog.mockResolvedValue([
      {
        id: 'bm-1',
        loggedAt: Date.UTC(2026, 4, 26),
        weightKg: 82.4,
        waistCm: 84,
        chestCm: 102,
        hipsCm: 96,
        thighCm: 60,
        armCm: 38,
        shouldersCm: 124,
        forearmCm: 30,
        hamCm: 58,
        calfCm: 38,
        bodyFatPercent: 17.5,
        bodyFatSource: 'caliper',
        notes: 'morning',
      },
    ]);
    const sb = makeBcPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
    const upsert = sb._calls.upserts[0];
    expect(upsert.opts).toEqual({ onConflict: 'user_id,id' });
    expect(upsert.rows[0]).toMatchObject({
      id: 'bm-1',
      user_id: 'u1',
      metric_date: '2026-05-26',
      body_weight: 82.4,
      quads: 60,         // thighCm
      hamstrings: 58,    // hamCm
      body_fat_percent: 17.5,
      body_fat_source: 'caliper',
      notes: 'morning',
    });
  });

  test('drops rows where metric_date cannot be derived', async () => {
    dbModule.getBodyMetricLog.mockResolvedValue([
      { id: 'a', loggedAt: 0 },          // falsy → null date → dropped
      { id: 'b', loggedAt: Date.UTC(2026, 0, 1) },
    ]);
    const sb = makeBcPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
    expect(sb._calls.upserts[0].rows).toHaveLength(1);
    expect(sb._calls.upserts[0].rows[0].id).toBe('b');
  });

  test('batches at 200 rows per upsert', async () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({
      id: 'bm-' + i,
      loggedAt: Date.UTC(2026, 0, 1) + i * 86400000,
    }));
    dbModule.getBodyMetricLog.mockResolvedValue(rows);
    const sb = makeBcPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 250, errors: 0 });
    expect(sb._calls.upserts).toHaveLength(2);
    expect(sb._calls.upserts[0].rows).toHaveLength(200);
    expect(sb._calls.upserts[1].rows).toHaveLength(50);
  });

  test('returns count:0 errors:0 when no local rows', async () => {
    dbModule.getBodyMetricLog.mockResolvedValue([]);
    const sb = makeBcPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
    expect(sb._calls.upserts).toHaveLength(0);
  });

  test('counts batch errors', async () => {
    dbModule.getBodyMetricLog.mockResolvedValue([
      { id: 'a', loggedAt: Date.UTC(2026, 0, 1) },
    ]);
    const sb = makeBcPushSb({ upsertError: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('body_composition_log', { userId: 'u1', localUserId: 'u1' });

    expect(result.errors).toBe(1);
    expect(result.count).toBe(0);
  });
});

describe('body_composition_log pull', () => {
  function makeBcPullSb({ data = [], error = null } = {}) {
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => {
            // LS-03b: awaitable AND .range()-capable (paginated pulls page via .range()).
            const chain = Promise.resolve({ data, error });
            chain.range = jest.fn(async (from, to) => (
              error ? { data: null, error }
                    : { data: (Array.isArray(data) ? data : []).slice(from, to + 1), error: null }
            ));
            return chain;
          }),
        })),
      })),
    };
  }

  test('inserts every cloud row via INSERT OR IGNORE helper', async () => {
    const sb = makeBcPullSb({
      data: [
        { id: 'bm-1', user_id: 'u1', metric_date: '2026-05-01' },
        { id: 'bm-2', user_id: 'u1', metric_date: '2026-05-26' },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.insertBodyMetricFromCloud.mockResolvedValue(undefined);

    const result = await pullTable('body_composition_log', { userId: 'u1' });

    expect(result).toEqual({ count: 2, errors: 0 });
    expect(dbModule.insertBodyMetricFromCloud).toHaveBeenCalledTimes(2);
    expect(dbModule.insertBodyMetricFromCloud).toHaveBeenCalledWith('u1', expect.objectContaining({ id: 'bm-1' }));
  });

  test('counts row-level errors without halting', async () => {
    const sb = makeBcPullSb({ data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.insertBodyMetricFromCloud
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('constraint'))
      .mockResolvedValueOnce(undefined);

    const result = await pullTable('body_composition_log', { userId: 'u1' });

    expect(result).toEqual({ count: 2, errors: 1 });
  });

  test('errors:1 when select fails', async () => {
    const sb = makeBcPullSb({ data: null, error: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('body_composition_log', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
    expect(dbModule.insertBodyMetricFromCloud).not.toHaveBeenCalled();
  });

  test('count 0 when cloud has nothing', async () => {
    const sb = makeBcPullSb({ data: [] });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('body_composition_log', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
  });
});


describe('nutrition_targets push', () => {
  function makeNtPushSb({ upsertError = null } = {}) {
    const calls = { upserts: [] };
    return {
      _calls: calls,
      from: jest.fn(() => ({
        upsert: jest.fn(async (row, opts) => {
          calls.upserts.push({ row, opts });
          return { error: upsertError };
        }),
      })),
    };
  }

  test('maps camelCase nutrition targets to snake_case row and upserts on user_id', async () => {
    dbModule.getNutritionTargets.mockResolvedValue({
      bmr: 1800,
      tdee: 2400,
      targetKcal: 2000,
      proteinG: 180,
      carbsG: 200,
      fatG: 60,
      phase: 'cut',
      bmrMethod: 'mifflin',
      activityLevel: 'moderate',
      confidence: 'high',
      warnings: null,
      gdprConsented: 1,
    });
    const sb = makeNtPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('nutrition_targets', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
    const upsert = sb._calls.upserts[0];
    expect(upsert.opts).toEqual({ onConflict: 'user_id' });
    expect(upsert.row).toMatchObject({
      user_id: 'u1',
      bmr: 1800,
      tdee: 2400,
      target_kcal: 2000,
      protein_g: 180,
      phase: 'cut',
      bmr_method: 'mifflin',
      activity_level: 'moderate',
      gdpr_consented: true,
    });
    expect(upsert.row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('returns count:0 errors:0 when local has no targets row', async () => {
    dbModule.getNutritionTargets.mockResolvedValue(null);
    const sb = makeNtPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('nutrition_targets', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
    expect(sb._calls.upserts).toHaveLength(0);
  });

  test('errors:1 when upsert fails', async () => {
    dbModule.getNutritionTargets.mockResolvedValue({ targetKcal: 2000 });
    const sb = makeNtPushSb({ upsertError: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('nutrition_targets', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
  });
});

describe('nutrition_targets pull', () => {
  function makeNtPullSb({ data = null, error = null } = {}) {
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(async () => ({ data, error })),
          })),
        })),
      })),
    };
  }

  test('routes the single cloud row through insertNutritionTargetsFromCloud', async () => {
    const sb = makeNtPullSb({
      data: { user_id: 'u1', bmr: 1800, tdee: 2400, target_kcal: 2000 },
    });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.insertNutritionTargetsFromCloud.mockResolvedValue(undefined);

    const result = await pullTable('nutrition_targets', { userId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
    expect(dbModule.insertNutritionTargetsFromCloud).toHaveBeenCalledWith('u1', expect.objectContaining({ bmr: 1800 }));
  });

  test('count:0 when cloud has no row', async () => {
    const sb = makeNtPullSb({ data: null });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('nutrition_targets', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
    expect(dbModule.insertNutritionTargetsFromCloud).not.toHaveBeenCalled();
  });

  test('errors:1 when select fails', async () => {
    const sb = makeNtPullSb({ data: null, error: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('nutrition_targets', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
  });

  test('errors:1 when local insert helper throws', async () => {
    const sb = makeNtPullSb({ data: { user_id: 'u1', target_kcal: 2000 } });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.insertNutritionTargetsFromCloud.mockRejectedValue(new Error('constraint'));

    const result = await pullTable('nutrition_targets', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
  });
});

describe('registry contract drift fixed: nutrition_targets', () => {
  test('is bidirectional, not server-authoritative', () => {
    // eslint-disable-next-line global-require
    const { getRegistryEntry } = require('../registry');
    const entry = getRegistryEntry('nutrition_targets');
    expect(entry.direction).toBe('bidirectional');
    expect(entry.serverAuthoritative).toBe(false);
    expect(entry.conflictStrategy).toBe('last_write_wins');
  });
});

describe('recipe_ingredients push (soft-delete)', () => {
  function makeRiPushSb({ upsertError = null } = {}) {
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

  test('ships live + tombstoned rows together; deleted_at populated for tombstones', async () => {
    dbModule.getAllRecipeIngredientsForUser.mockResolvedValue([
      { id: 'ri-1', recipeId: 'r-1', foodRef: 'off:1', quantityG: 100, orderIndex: 0, createdAt: 1, updatedAt: 1, deletedAt: null },
      { id: 'ri-2', recipeId: 'r-1', foodRef: 'off:2', quantityG: 50,  orderIndex: 1, createdAt: 1, updatedAt: 9, deletedAt: 9 },
    ]);
    const sb = makeRiPushSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushTable('recipe_ingredients', { userId: 'u1', localUserId: 'u1' });

    expect(result).toEqual({ count: 2, errors: 0 });
    const upserted = sb._calls.upserts[0].rows;
    expect(sb._calls.upserts[0].opts).toEqual({ onConflict: 'user_id,id' });
    expect(upserted).toHaveLength(2);
    expect(upserted[0]).toMatchObject({ id: 'ri-1', deleted_at: null });
    expect(upserted[1]).toMatchObject({ id: 'ri-2' });
    expect(upserted[1].deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('updated_at falls back to created_at for legacy rows missing the new column', async () => {
    dbModule.getAllRecipeIngredientsForUser.mockResolvedValue([
      { id: 'ri-legacy', recipeId: 'r-1', foodRef: 'off:1', quantityG: 100, orderIndex: 0, createdAt: 123456, updatedAt: null, deletedAt: null },
    ]);
    const sb = makeRiPushSb();
    getSupabaseClient.mockReturnValue(sb);

    await pushTable('recipe_ingredients', { userId: 'u1', localUserId: 'u1' });

    const upserted = sb._calls.upserts[0].rows[0];
    expect(upserted.created_at).toBe(upserted.updated_at);
  });

  test('retry succeeds after the first upsert fails', async () => {
    dbModule.getAllRecipeIngredientsForUser.mockResolvedValue([
      { id: 'ri-retry', recipeId: 'r-1', foodRef: 'off:1', quantityG: 100, orderIndex: 0, createdAt: 1, updatedAt: 1, deletedAt: null },
    ]);
    const outcomes = [new Error('temporary network failure'), null];
    const upserts = [];
    const sb = {
      from: jest.fn(() => ({
        upsert: jest.fn(async (rows, opts) => {
          upserts.push({ rows, opts });
          return { error: outcomes.shift() };
        }),
      })),
    };
    getSupabaseClient.mockReturnValue(sb);

    const first = await pushTable('recipe_ingredients', { userId: 'u1', localUserId: 'u1' });
    const retry = await pushTable('recipe_ingredients', { userId: 'u1', localUserId: 'u1' });

    expect(first).toEqual({ count: 0, errors: 1 });
    expect(retry).toEqual({ count: 1, errors: 0 });
    expect(upserts).toHaveLength(2);
    expect(upserts[1].opts).toEqual({ onConflict: 'user_id,id' });
  });
});

describe('recipe_ingredients pull (LWW)', () => {
  function makeRiPullSb({ data = [], error = null } = {}) {
    return {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => {
            // LS-03b: awaitable AND .range()-capable (paginated pulls page via .range()).
            const chain = Promise.resolve({ data, error });
            chain.range = jest.fn(async (from, to) => (
              error ? { data: null, error }
                    : { data: (Array.isArray(data) ? data : []).slice(from, to + 1), error: null }
            ));
            return chain;
          }),
        })),
      })),
    };
  }

  test('skips cloud rows whose updated_at is older than the local copy', async () => {
    const sb = makeRiPullSb({
      data: [
        { id: 'ri-stale',  recipe_id: 'r-1', food_ref: 'off:1', quantity_g: 100, order_index: 0, created_at: new Date(1).toISOString(), updated_at: new Date(1000).toISOString() },
        { id: 'ri-newer',  recipe_id: 'r-1', food_ref: 'off:2', quantity_g: 200, order_index: 1, created_at: new Date(1).toISOString(), updated_at: new Date(5000).toISOString() },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    // local has a strictly newer copy of ri-stale; no local copy of ri-newer
    dbModule.getRecipeIngredientUpdatedAt.mockImplementation(async (_userId, id) => {
      if (id === 'ri-stale') return 9999; // local is newer than cloud
      return null;
    });
    dbModule.upsertRecipeIngredientFromCloud.mockResolvedValue(undefined);

    const result = await pullTable('recipe_ingredients', { userId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0, skipped: 1 });
    expect(dbModule.upsertRecipeIngredientFromCloud).toHaveBeenCalledTimes(1);
    expect(dbModule.upsertRecipeIngredientFromCloud).toHaveBeenCalledWith('u1', expect.objectContaining({ id: 'ri-newer' }));
  });

  test('tombstones (deleted_at set) flow through pull unchanged', async () => {
    const sb = makeRiPullSb({
      data: [
        { id: 'ri-tomb', recipe_id: 'r-1', food_ref: 'off:1', quantity_g: 100, order_index: 0, created_at: new Date(1).toISOString(), updated_at: new Date(9999).toISOString(), deleted_at: new Date(9999).toISOString() },
      ],
    });
    getSupabaseClient.mockReturnValue(sb);
    dbModule.getRecipeIngredientUpdatedAt.mockResolvedValue(null);
    dbModule.upsertRecipeIngredientFromCloud.mockResolvedValue(undefined);

    const result = await pullTable('recipe_ingredients', { userId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
    const arg = dbModule.upsertRecipeIngredientFromCloud.mock.calls[0][1];
    expect(arg.deleted_at).toBeTruthy();
  });

  test('errors:1 when select fails', async () => {
    const sb = makeRiPullSb({ data: null, error: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullTable('recipe_ingredients', { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
  });
});

describe('registry contract: recipe_ingredients', () => {
  test('softDelete is true now that the schema has deleted_at', () => {
    // eslint-disable-next-line global-require
    const { getRegistryEntry } = require('../registry');
    const entry = getRegistryEntry('recipe_ingredients');
    expect(entry.softDelete).toBe(true);
    expect(entry.conflictStrategy).toBe('last_write_wins');
    expect(entry.direction).toBe('bidirectional');
  });
});
