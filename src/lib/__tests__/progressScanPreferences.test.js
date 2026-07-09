import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getProgressScanHideExactPreference,
  PROGRESS_SCAN_HIDE_EXACT_KEY,
  setProgressScanHideExactPreference,
  getProgressScanMeaningMomentSeen,
  getSeenRecalibrationScanIds,
  markRecalibrationNoteSeen,
  nextSeenRecalibrationIds,
  PROGRESS_SCAN_MEANING_MOMENT_SEEN_KEY,
  PROGRESS_SCAN_RECALIBRATION_SEEN_KEY,
  setProgressScanMeaningMomentSeen,
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

// Wave 3: the recalibration note and the meaning moment each render at most
// once ever, backed by these two device-local flags.
describe('nextSeenRecalibrationIds (pure reducer)', () => {
  test('appends a new id once and is a no-op for a duplicate', () => {
    expect(nextSeenRecalibrationIds([], 'a')).toEqual(['a']);
    const withA = nextSeenRecalibrationIds([], 'a');
    expect(nextSeenRecalibrationIds(withA, 'a')).toBe(withA); // same reference: true no-op
    expect(nextSeenRecalibrationIds(withA, 'b')).toEqual(['a', 'b']);
  });

  test('ignores a missing scan id and a non-array input', () => {
    expect(nextSeenRecalibrationIds(['a'], null)).toEqual(['a']);
    expect(nextSeenRecalibrationIds(undefined, 'a')).toEqual(['a']);
  });

  test('caps the stored list so a long-lived install cannot grow it without bound', () => {
    const many = Array.from({ length: 500 }, (_, i) => `id-${i}`);
    const next = nextSeenRecalibrationIds(many, 'new-id');
    expect(next).toHaveLength(500);
    expect(next[0]).toBe('id-1'); // oldest dropped
    expect(next[next.length - 1]).toBe('new-id');
  });
});

describe('recalibration-seen persistence', () => {
  test('new installs report no scan ids as seen', async () => {
    expect(await getSeenRecalibrationScanIds()).toEqual([]);
  });

  test('marking a scan id seen persists it, and marking it twice is idempotent', async () => {
    await markRecalibrationNoteSeen('scan-1');
    expect(await getSeenRecalibrationScanIds()).toEqual(['scan-1']);
    await markRecalibrationNoteSeen('scan-1');
    expect(await getSeenRecalibrationScanIds()).toEqual(['scan-1']);
    await markRecalibrationNoteSeen('scan-2');
    expect(await getSeenRecalibrationScanIds()).toEqual(['scan-1', 'scan-2']);
  });

  test('a missing scan id is a no-op', async () => {
    await markRecalibrationNoteSeen(null);
    expect(await AsyncStorage.getItem(PROGRESS_SCAN_RECALIBRATION_SEEN_KEY)).toBeNull();
  });

  test('a corrupt stored value fails soft to an empty list rather than throwing', async () => {
    await AsyncStorage.setItem(PROGRESS_SCAN_RECALIBRATION_SEEN_KEY, 'not json');
    expect(await getSeenRecalibrationScanIds()).toEqual([]);
  });
});

describe('meaning-moment-seen persistence', () => {
  test('new installs have not seen the meaning moment', async () => {
    expect(await getProgressScanMeaningMomentSeen()).toBe(false);
  });

  test('setting it persists true, forever (no un-set path)', async () => {
    await setProgressScanMeaningMomentSeen();
    expect(await AsyncStorage.getItem(PROGRESS_SCAN_MEANING_MOMENT_SEEN_KEY)).toBe('true');
    expect(await getProgressScanMeaningMomentSeen()).toBe(true);
  });
});
