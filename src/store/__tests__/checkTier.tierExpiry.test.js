/**
 * C-3 / M-3 (trial-subscription audit 2026-06-08): checkTier must enforce trial
 * expiry locally at launch (so a cached pro trial that has ended downgrades
 * offline / before the cloud read), must NOT touch a paid_pro user, and must no
 * longer auto-grant pro from the legacy "first-run done" heuristic.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../lib/database', () => ({
  wipeAllUserData: jest.fn().mockResolvedValue(undefined),
  wipeAllUserDataWithRetry: jest.fn().mockResolvedValue({ ok: true }),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const useAppStore = require('../useAppStore').default;

const TIER_KEY = '@volyume_tier';
const TRIAL_STATE_KEY = '@volyume_trial_state';
const PRO_TRIAL_ENDS_KEY = '@volyume_pro_trial_ends_at';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAppStore.setState({ tier: null, tierChecked: false });
});

describe('checkTier local trial-expiry enforcement', () => {
  test('downgrades a cached pro trial whose end date has passed', async () => {
    await AsyncStorage.setItem(TIER_KEY, 'pro');
    await AsyncStorage.setItem(TRIAL_STATE_KEY, 'pro_trial_active');
    await AsyncStorage.setItem(PRO_TRIAL_ENDS_KEY, new Date(Date.now() - 1000).toISOString());
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('free');
    expect(await AsyncStorage.getItem(TIER_KEY)).toBe('free');
  });

  test('keeps a cached pro trial that has not yet expired', async () => {
    await AsyncStorage.setItem(TIER_KEY, 'pro');
    await AsyncStorage.setItem(TRIAL_STATE_KEY, 'pro_trial_active');
    await AsyncStorage.setItem(PRO_TRIAL_ENDS_KEY, new Date(Date.now() + 60_000).toISOString());
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('does NOT downgrade a paid_pro user past the (irrelevant) trial end date', async () => {
    await AsyncStorage.setItem(TIER_KEY, 'pro');
    await AsyncStorage.setItem(TRIAL_STATE_KEY, 'paid_pro');
    await AsyncStorage.setItem(PRO_TRIAL_ENDS_KEY, new Date(Date.now() - 1000).toISOString());
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('M-3: legacy first-run-done no longer auto-grants pro', async () => {
    await AsyncStorage.setItem('@volyume_first_run_complete', 'true');
    // deliberately no TIER_KEY
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBeNull();
  });
});
