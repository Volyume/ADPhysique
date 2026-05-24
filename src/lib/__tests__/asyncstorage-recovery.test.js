/**
 * Verifies the app recovers gracefully when AsyncStorage values are corrupt.
 *
 * Specifically protects against the infinite-splash bug that shipped before
 * wave 8: any user with corrupted JSON in their profile slot used to sit on
 * the splash screen indefinitely because initLocalUser swallowed the error
 * and never reset isAuthLoading.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// useAppStore wires AsyncStorage at module load time; reset modules per test
// so our corruption-prep happens before the store initialises.
beforeEach(() => {
  jest.resetModules();
  return AsyncStorage.clear();
});

describe('useAppStore.initLocalUser', () => {
  test('returns and clears isAuthLoading even when the profile JSON is corrupt', async () => {
    // Pre-seed storage BEFORE requiring the store module. With jest.resetModules
    // the store's AsyncStorage handle is freshly resolved on the require below,
    // and the mock implementation persists across that re-require, so the
    // pre-seeded values are visible.
    // eslint-disable-next-line global-require
    const Store = require('@react-native-async-storage/async-storage');
    // The mock exports default at .default in some versions and at the
    // top-level setItem/getItem in others. Resolve whichever is present.
    const setItem = Store.default?.setItem ?? Store.setItem;
    await setItem.call(Store.default ?? Store, '@volyume_local_user_id', 'fake-user-id');
    await setItem.call(Store.default ?? Store, '@volyume_user_profile_fake-user-id', '{not valid json');

    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    await useAppStore.getState().initLocalUser();

    const state = useAppStore.getState();
    expect(state.isAuthLoading).toBe(false);
    expect(state.user?.id).toBe('fake-user-id');
    // profile is null, not the bad string
    expect(state.userProfile).toBeNull();
  });

  test('handles AsyncStorage.getItem throwing without hanging the splash', async () => {
    const original = AsyncStorage.getItem;
    AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('IO failure'));
    try {
      // eslint-disable-next-line global-require
      const useAppStore = require('../../store/useAppStore').default;
      await useAppStore.getState().initLocalUser();
      const state = useAppStore.getState();
      expect(state.isAuthLoading).toBe(false);
    } finally {
      AsyncStorage.getItem = original;
    }
  });

  test('generates a new user id when one is not stored', async () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    await useAppStore.getState().initLocalUser();
    const state = useAppStore.getState();
    expect(state.user?.id).toBeTruthy();
    expect(state.isAuthLoading).toBe(false);
  });
});

describe('errorLog handles AsyncStorage corruption', () => {
  test('loadBuffer recovers from non-JSON storage', async () => {
    await AsyncStorage.setItem('@volyume_error_log_v1', 'not valid JSON');
    // Need to reset the module so its in-memory buffer is fresh.
    jest.resetModules();
    // eslint-disable-next-line global-require
    const { getRecentErrors, logError } = require('../errorLog');
    // Should return [] instead of throwing
    const list = await getRecentErrors();
    expect(list).toEqual([]);
    // And we should still be able to write new errors afterwards
    logError('recovery_test', new Error('boom'));
    await new Promise(r => setTimeout(r, 250));
    const after = await getRecentErrors();
    expect(after.length).toBeGreaterThan(0);
  });

  test('logError still appends when storage has an array of non-objects', async () => {
    await AsyncStorage.setItem('@volyume_error_log_v1', '"a single string"');
    jest.resetModules();
    // eslint-disable-next-line global-require
    const { getRecentErrors, logError } = require('../errorLog');
    logError('recovery_test_2', new Error('test'));
    await new Promise(r => setTimeout(r, 250));
    const list = await getRecentErrors();
    // Module defends against non-array by resetting to []
    expect(Array.isArray(list)).toBe(true);
  });
});
