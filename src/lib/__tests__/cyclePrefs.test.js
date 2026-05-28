import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCycleTracking, setCycleTracking, shouldShowCycleQuestion, CYCLE_TRACKING_KEY,
} from '../cyclePrefs';

beforeEach(async () => { await AsyncStorage.clear(); });

describe('cycle tracking pref (GAP row 15)', () => {
  test('defaults to off when nothing is stored', async () => {
    expect(await getCycleTracking()).toBe(false);
  });

  test('persists on and off', async () => {
    await setCycleTracking(true);
    expect(await getCycleTracking()).toBe(true);
    expect(await AsyncStorage.getItem(CYCLE_TRACKING_KEY)).toBe('true');
    await setCycleTracking(false);
    expect(await getCycleTracking()).toBe(false);
  });
});

describe('shouldShowCycleQuestion', () => {
  test('shown only when opted in AND sex is female', () => {
    expect(shouldShowCycleQuestion('female', true)).toBe(true);
  });

  test('hidden when not opted in, whatever the sex', () => {
    expect(shouldShowCycleQuestion('female', false)).toBe(false);
  });

  test('hidden for male or unknown sex even when opted in', () => {
    expect(shouldShowCycleQuestion('male', true)).toBe(false);
    expect(shouldShowCycleQuestion(null, true)).toBe(false);
    expect(shouldShowCycleQuestion(undefined, true)).toBe(false);
  });
});
