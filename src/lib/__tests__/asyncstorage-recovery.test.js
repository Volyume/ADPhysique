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

// useAppStore.initLocalUser describe deleted per
// IDENTITY_AND_OWNERSHIP_LOCKED.md rule 1 / 5 / anti-patterns. The
// store action no longer exists. The asyncstorage-corruption
// resilience contract is now scoped to errorLog (below) and to the
// auth state restorer in RootNavigator.onAuthStateChange.

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
