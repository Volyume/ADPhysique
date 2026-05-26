/**
 * Focused tests for src/lib/sync/tables/profiles.js — the merge
 * conflict path landing alongside migration 045
 * (users_profile.column_updates_at jsonb).
 *
 * Covers:
 *   - push payload includes column_updates_at populated from the
 *     useAppStore field-timestamp map;
 *   - push omits tier (server-owned) and stamps updated_at;
 *   - pull feeds cloud + local rows into conflict.resolve(merge),
 *     applies the merged result back to the store column-by-column;
 *   - pull short-circuits when the cloud row is absent.
 */

jest.mock('../../supabase', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('../telemetry', () => ({
  trackSyncRun: jest.fn().mockResolvedValue(undefined),
  trackSyncConflictResolved: jest.fn().mockResolvedValue(undefined),
  logSyncError: jest.fn(),
}));

// jest.mock factories are hoisted before module-level state is
// initialised, so the mock must reference state through a function
// that resolves lazily. The "mock" prefix is on the global
// allowlist for jest.mock factories.
const mockStoreRef = { state: null };
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: {
    getState: () => mockStoreRef.state,
  },
}));

const { pushProfiles, pullProfiles } = require('../tables/profiles');
const { getSupabaseClient } = require('../../supabase');

function setStoreState(s) { mockStoreRef.state = s; }

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreRef.state = null;
});

function makeUpsertSb({ upsertError = null } = {}) {
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

function makeMaybeSingleSb({ data = null, error = null } = {}) {
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

describe('profiles push', () => {
  test('payload carries column_updates_at + omits tier + upserts on id', async () => {
    setStoreState({
      userProfile: {
        firstName: 'Allan',
        units: 'kg',
        trainingFocus: 'bodybuilding',
        trainingAgeYears: 8,
        primaryEquipment: 'commercial',
        barWeight: 20,
      },
      userProfileFieldUpdatedAt: {
        firstName: Date.UTC(2026, 4, 27, 9, 11, 42),
        units:     Date.UTC(2026, 4, 26),
        barWeight: Date.UTC(2026, 4, 20),
      },
    });
    const sb = makeUpsertSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushProfiles(sb, { userId: 'u1' });

    expect(result).toEqual({ count: 1, errors: 0 });
    const { row, opts } = sb._calls.upserts[0];
    expect(opts).toEqual({ onConflict: 'id' });

    expect(row.id).toBe('u1');
    expect(row.first_name).toBe('Allan');
    expect(row.units).toBe('kg');
    expect(row.bar_weight).toBe(20);
    expect(row.training_age).toBe(8);
    expect('tier' in row).toBe(false);

    expect(row.column_updates_at).toEqual({
      first_name: '2026-05-27T09:11:42.000Z',
      units:      '2026-05-26T00:00:00.000Z',
      bar_weight: '2026-05-20T00:00:00.000Z',
    });
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('empty column_updates_at when no field has been touched locally', async () => {
    setStoreState({
      userProfile: { firstName: 'Allan' },
      userProfileFieldUpdatedAt: {},
    });
    const sb = makeUpsertSb();
    getSupabaseClient.mockReturnValue(sb);

    await pushProfiles(sb, { userId: 'u1' });

    const { row } = sb._calls.upserts[0];
    expect(row.column_updates_at).toEqual({});
  });

  test('returns count:0 when there is no profile in the store', async () => {
    setStoreState({ userProfile: null });
    const sb = makeUpsertSb();
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushProfiles(sb, { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
    expect(sb._calls.upserts).toHaveLength(0);
  });

  test('errors:1 when upsert fails', async () => {
    setStoreState({
      userProfile: { firstName: 'Allan' },
      userProfileFieldUpdatedAt: {},
    });
    const sb = makeUpsertSb({ upsertError: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pushProfiles(sb, { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
  });
});

describe('profiles pull (merge)', () => {
  test('per-column merge applies cloud values for fields server wrote more recently', async () => {
    const setUserProfile = jest.fn();
    setStoreState({
      userProfile: {
        firstName: 'OldName',
        units: 'kg',
        trainingFocus: 'bodybuilding',
        barWeight: 20,
      },
      userProfileFieldUpdatedAt: {
        firstName: Date.UTC(2026, 0, 1),
        units:     Date.UTC(2026, 5, 1),
      },
      setUserProfile,
    });

    const sb = makeMaybeSingleSb({
      data: {
        first_name: 'CloudName',
        units: 'lbs',
        training_focus: 'powerlifting',
        training_age: 5,
        primary_equipment: 'home',
        bar_weight: 25,
        updated_at: new Date(Date.UTC(2026, 5, 1)).toISOString(),
        column_updates_at: {
          first_name:     '2026-05-15T00:00:00.000Z',
          units:          '2026-05-15T00:00:00.000Z',
          training_focus: '2026-04-01T00:00:00.000Z',
          bar_weight:     '2026-04-01T00:00:00.000Z',
        },
      },
    });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullProfiles(sb, { userId: 'u1' });

    expect(result.count).toBe(1);
    expect(result.errors).toBe(0);

    const applied = setUserProfile.mock.calls[0][0];
    expect(applied.firstName).toBe('CloudName');
    expect(applied.units).toBe('kg');
  });

  test('pull short-circuits when the cloud row does not exist', async () => {
    const setUserProfile = jest.fn();
    setStoreState({
      userProfile: { firstName: 'Allan' },
      userProfileFieldUpdatedAt: {},
      setUserProfile,
    });
    const sb = makeMaybeSingleSb({ data: null });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullProfiles(sb, { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 0 });
    expect(setUserProfile).not.toHaveBeenCalled();
  });

  test('errors:1 when select fails', async () => {
    const setUserProfile = jest.fn();
    setStoreState({
      userProfile: { firstName: 'Allan' },
      userProfileFieldUpdatedAt: {},
      setUserProfile,
    });
    const sb = makeMaybeSingleSb({ data: null, error: new Error('rls') });
    getSupabaseClient.mockReturnValue(sb);

    const result = await pullProfiles(sb, { userId: 'u1' });

    expect(result).toEqual({ count: 0, errors: 1 });
    expect(setUserProfile).not.toHaveBeenCalled();
  });
});
