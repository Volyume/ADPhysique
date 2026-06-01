/**
 * A2-021: a new user who confirms their email slowly (or signs in first on a
 * second device) has an old auth row and no per-uid cache, so the created_at
 * heuristic optimistically routes them to MainTabs as "returning". The
 * background cloud read must correct that to the onboarding wizard when the
 * cloud profile is missing or explicitly says first_run_complete=false.
 *
 * The correction is gated on the optimistic decision having come from the
 * created_at heuristic, never a per-uid cache hit, so a device that has
 * genuinely seen the user finish onboarding is never flipped (the wizard-flash
 * bug). Transient read failures (throw/timeout) must also leave the optimistic
 * decision alone.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

let mockCloudProfile = null;
let mockThrow = false;

jest.mock('../supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (mockThrow) throw new Error('network down');
            return { data: mockCloudProfile, error: null };
          },
        }),
      }),
    }),
  }),
}));

jest.mock('../sync', () => ({
  syncProfile: jest.fn().mockResolvedValue({}),
  bulkUploadLocalData: jest.fn().mockResolvedValue(undefined),
  cancelScheduledSync: jest.fn(),
}));

jest.mock('../engineTelemetry', () => ({
  track: jest.fn().mockResolvedValue(undefined),
  flushPendingTelemetry: jest.fn().mockResolvedValue(undefined),
}));

const useAppStore = require('../../store/useAppStore').default;
const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');

const FIRST_RUN_PFX = '@volyume_first_run_complete_';
const oldAuthRow = () => new Date(Date.now() - 5 * 60 * 1000).toISOString(); // > 60s
const freshAuthRow = () => new Date().toISOString();
const restore = (uid, sessionUser) =>
  useAppStore.getState().restoreSessionFromCloud(uid, sessionUser);

beforeEach(async () => {
  mockCloudProfile = null;
  mockThrow = false;
  await AsyncStorage.clear();
  useAppStore.setState({
    user: null, session: null, userProfile: null,
    tier: null, tierChecked: false,
    firstRunComplete: false, firstRunChecked: false,
  });
});

describe('A2-021 slow-confirm / cross-device new user is corrected to the wizard', () => {
  test('old auth row, no cache, no cloud profile → wizard (false), cache seeded false', async () => {
    await restore('u1', { id: 'u1', created_at: oldAuthRow() });
    expect(useAppStore.getState().firstRunComplete).toBe(false);
    expect(await AsyncStorage.getItem(FIRST_RUN_PFX + 'u1')).toBe('false');
  });

  test('old auth row, no cache, cloud profile says first_run_complete=false → wizard', async () => {
    mockCloudProfile = { first_run_complete: false, units: 'kg', bar_weight: 20 };
    await restore('u1', { id: 'u1', created_at: oldAuthRow() });
    expect(useAppStore.getState().firstRunComplete).toBe(false);
  });
});

describe('A2-021 genuine returning users are NOT disrupted', () => {
  test('old auth row, cloud profile complete → stays MainTabs (true)', async () => {
    mockCloudProfile = { first_run_complete: true, units: 'kg', bar_weight: 20 };
    await restore('u1', { id: 'u1', created_at: oldAuthRow() });
    expect(useAppStore.getState().firstRunComplete).toBe(true);
  });

  test('cache hit=true overrides a cloud incomplete (no wizard-flash)', async () => {
    // This device has seen the user finish onboarding. Even if the cloud read
    // momentarily disagrees, the cache-based decision must never be flipped.
    await AsyncStorage.setItem(FIRST_RUN_PFX + 'u1', 'true');
    mockCloudProfile = { first_run_complete: false, units: 'kg', bar_weight: 20 };
    await restore('u1', { id: 'u1', created_at: oldAuthRow() });
    expect(useAppStore.getState().firstRunComplete).toBe(true);
  });

  test('transient read failure leaves the optimistic returning decision alone', async () => {
    mockThrow = true;
    await restore('u1', { id: 'u1', created_at: oldAuthRow() });
    expect(useAppStore.getState().firstRunComplete).toBe(true);
  });
});

describe('A2-021 fresh signup (recent auth row) routes straight to the wizard', () => {
  test('created_at < 60s → wizard (false) via Cue C, no flip needed', async () => {
    mockCloudProfile = null;
    await restore('u2', { id: 'u2', created_at: freshAuthRow() });
    expect(useAppStore.getState().firstRunComplete).toBe(false);
  });
});

describe('A2-021 signup seed (noteSignupPendingOnboarding)', () => {
  test('writes the per-uid first-run flag false', async () => {
    await useAppStore.getState().noteSignupPendingOnboarding('u9');
    expect(await AsyncStorage.getItem(FIRST_RUN_PFX + 'u9')).toBe('false');
  });

  test('a missing uid is a no-op (no throw, nothing written)', async () => {
    await useAppStore.getState().noteSignupPendingOnboarding(undefined);
    expect(await AsyncStorage.getItem(FIRST_RUN_PFX + 'undefined')).toBeNull();
  });

  test('a seeded flag routes a slow-confirmer to the wizard with no flash (Cue A, no heuristic guess)', async () => {
    // Seeded at signup. On the eventual sign-in the old auth row would
    // otherwise trip the heuristic, but Cue A answers first and there is no
    // optimistic MainTabs render to flash.
    await useAppStore.getState().noteSignupPendingOnboarding('u1');
    mockCloudProfile = null;
    await restore('u1', { id: 'u1', created_at: oldAuthRow() });
    expect(useAppStore.getState().firstRunComplete).toBe(false);
  });
});
