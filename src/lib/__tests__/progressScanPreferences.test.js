import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getProgressScanHideExactPreference,
  PROGRESS_SCAN_HIDE_EXACT_KEY,
  setProgressScanHideExactPreference,
} from '../progressScanPreferences';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('progressScanPreferences', () => {
  test('new installs default to trend-only Volyume Score details', async () => {
    expect(await getProgressScanHideExactPreference()).toBe(true);
  });

  test('saved hide-exact preference is respected', async () => {
    await setProgressScanHideExactPreference(false);
    expect(await AsyncStorage.getItem(PROGRESS_SCAN_HIDE_EXACT_KEY)).toBe('false');
    expect(await getProgressScanHideExactPreference()).toBe(false);

    await setProgressScanHideExactPreference(true);
    expect(await AsyncStorage.getItem(PROGRESS_SCAN_HIDE_EXACT_KEY)).toBe('true');
    expect(await getProgressScanHideExactPreference()).toBe(true);
  });
});
