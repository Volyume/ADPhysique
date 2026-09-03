/**
 * checkTier under the FULLY-FREE PRODUCT (founder decision 2026-09-03).
 *
 * WHAT THIS SUITE PINNED BEFORE, AND WHY IT IS INVERTED
 *
 * C-3 / M-3 (trial-subscription audit 2026-06-08) made checkTier enforce trial
 * expiry locally at launch: a cached 'pro' whose pro_trial_active end date had
 * passed was downgraded to 'free' offline, before the cloud read landed.
 *
 * Volyume has no trial, no Free/Pro split, no paywall and no expiry any more.
 * `_effectiveTier` in useAppStore resolves every tier write to 'pro' while
 * proGate.FULL_ACCESS_FOR_ALL is true, and checkTier skips the local
 * trial-expiry demotion entirely. So the three demotion expectations below are
 * inverted BY DECISION: a cached expired trial, a cached 'free' and a missing
 * cache all resolve to full access.
 *
 * What is NOT inverted, and is pinned harder here:
 *   - tierChecked is set in every branch (RootNavigator's splash gate waits on
 *     it; a launch that never sets it hangs on the splash forever);
 *   - the read error path still resolves rather than throwing;
 *   - no downgrade path exists any more, from any cached state.
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
const { FULL_ACCESS_FOR_ALL } = require('../../lib/proGate');

const TIER_KEY = '@volyume_tier';
const TRIAL_STATE_KEY = '@volyume_trial_state';
const PRO_TRIAL_ENDS_KEY = '@volyume_pro_trial_ends_at';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAppStore.setState({ tier: null, tierChecked: false });
});

describe('checkTier grants full access to everyone (fully-free product)', () => {
  test('the override this suite is written against is actually on', () => {
    expect(FULL_ACCESS_FOR_ALL).toBe(true);
  });

  test('INVERTED: a cached pro trial whose end date has passed is NOT downgraded', async () => {
    await AsyncStorage.setItem(TIER_KEY, 'pro');
    await AsyncStorage.setItem(TRIAL_STATE_KEY, 'pro_trial_active');
    await AsyncStorage.setItem(PRO_TRIAL_ENDS_KEY, new Date(Date.now() - 1000).toISOString());
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('a cached pro trial that has not yet expired stays pro', async () => {
    await AsyncStorage.setItem(TIER_KEY, 'pro');
    await AsyncStorage.setItem(TRIAL_STATE_KEY, 'pro_trial_active');
    await AsyncStorage.setItem(PRO_TRIAL_ENDS_KEY, new Date(Date.now() + 60_000).toISOString());
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('a paid_pro user past the (irrelevant) trial end date stays pro', async () => {
    await AsyncStorage.setItem(TIER_KEY, 'pro');
    await AsyncStorage.setItem(TRIAL_STATE_KEY, 'paid_pro');
    await AsyncStorage.setItem(PRO_TRIAL_ENDS_KEY, new Date(Date.now() - 1000).toISOString());
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('INVERTED: a device carrying a cached free tier is lifted to full access', async () => {
    // The existing-user case: this device ran the trial build, the trial ended
    // and 'free' was cached. Nothing about that state may keep a feature away
    // from them now.
    await AsyncStorage.setItem(TIER_KEY, 'free');
    await AsyncStorage.setItem(TRIAL_STATE_KEY, 'cascade_expired');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
  });

  test('INVERTED (M-3): no cached tier at all still resolves to full access', async () => {
    await AsyncStorage.setItem('@volyume_first_run_complete', 'true');
    // deliberately no TIER_KEY
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tier).toBe('pro');
  });
});

describe('checkTier bootstrap contract (unchanged)', () => {
  test('tierChecked is set on the happy path (the splash gate waits on it)', async () => {
    await AsyncStorage.setItem(TIER_KEY, 'pro');
    await useAppStore.getState().checkTier();
    expect(useAppStore.getState().tierChecked).toBe(true);
  });

  test('tierChecked is set on the read-failure path too, and nothing throws', async () => {
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('boom'));
    await expect(useAppStore.getState().checkTier()).resolves.toBeUndefined();
    expect(useAppStore.getState().tierChecked).toBe(true);
    // A failed read must not strand the user on a free shell either.
    expect(useAppStore.getState().tier).toBe('pro');
    spy.mockRestore();
  });
});
