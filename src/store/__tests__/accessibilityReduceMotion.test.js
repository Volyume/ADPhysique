/**
 * AX-09 (launch accessibility audit, src/lib/haptics.js:13 note; store slice
 * src/store/useAppStore.js's accessibility block): the native reduce-motion
 * preference used to default to false and was never hydrated from
 * AccessibilityInfo.isReduceMotionEnabled() - a user with iOS Reduce Motion /
 * Android Remove Animations already on still got Volyume's custom springs
 * until they separately found the in-app toggle.
 *
 * Fix shape: `accessibility.reduceMotion` becomes the EFFECTIVE value every
 * existing consumer reads (systemReduceMotion || reduceMotionUserPref).
 * `reduceMotionUserPref` is the user's own explicit in-app Settings choice
 * (persisted, as `reduceMotion` used to be). `systemReduceMotion` mirrors the
 * OS setting, set by App.js from AccessibilityInfo - runtime-only, never
 * persisted.
 *
 * This suite pins:
 *  - effective reduceMotion is true when EITHER flag is true, false only when
 *    both are false (all four OR combinations);
 *  - setAccessibilityPref('reduceMotionUserPref', v) (what the Settings
 *    toggle calls) drives the user pref and persists it, recomputing the
 *    effective field;
 *  - setSystemReduceMotion(v) (what App.js's AccessibilityInfo hydration +
 *    'reduceMotionChanged' subscription call) updates the effective field
 *    live WITHOUT persisting systemReduceMotion itself;
 *  - loadAccessibility migrates a pre-AX-09 persisted `reduceMotion` value
 *    into `reduceMotionUserPref` for upgrading installs.
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

const A11Y_PREFS_KEY = '@volyume_a11y_prefs';

function baseAccessibility(overrides = {}) {
  return {
    ...useAppStore.getState().accessibility,
    reduceMotion: false,
    reduceMotionUserPref: false,
    ...overrides,
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAppStore.setState({
    accessibility: baseAccessibility(),
    accessibilityLoaded: false,
    systemReduceMotion: false,
  });
});

describe('AX-09: effective reduceMotion = systemReduceMotion || reduceMotionUserPref', () => {
  test('false when both are false', () => {
    useAppStore.setState({
      systemReduceMotion: false,
      accessibility: baseAccessibility({ reduceMotionUserPref: false, reduceMotion: false }),
    });
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(false);
  });

  test('true when only the system flag is true', () => {
    useAppStore.getState().setSystemReduceMotion(true);
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(true);
    expect(useAppStore.getState().accessibility.reduceMotionUserPref).toBe(false);
  });

  test('true when only the user pref is true', async () => {
    await useAppStore.getState().setAccessibilityPref('reduceMotionUserPref', true);
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(true);
    expect(useAppStore.getState().systemReduceMotion).toBe(false);
  });

  test('true when both are true', async () => {
    await useAppStore.getState().setAccessibilityPref('reduceMotionUserPref', true);
    useAppStore.getState().setSystemReduceMotion(true);
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(true);
  });
});

describe('AX-09: the Settings toggle drives reduceMotionUserPref, not the effective value', () => {
  test('setAccessibilityPref persists reduceMotionUserPref to AsyncStorage', async () => {
    await useAppStore.getState().setAccessibilityPref('reduceMotionUserPref', true);
    const raw = await AsyncStorage.getItem(A11Y_PREFS_KEY);
    expect(JSON.parse(raw).reduceMotionUserPref).toBe(true);
  });

  test('turning the user pref back off drops the effective value, unless the OS forces it on', async () => {
    await useAppStore.getState().setAccessibilityPref('reduceMotionUserPref', true);
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(true);

    await useAppStore.getState().setAccessibilityPref('reduceMotionUserPref', false);
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(false);

    // Now with the OS setting also forcing it on, turning the user pref off
    // must NOT clear the effective value - the OS is an independent force-on.
    useAppStore.getState().setSystemReduceMotion(true);
    await useAppStore.getState().setAccessibilityPref('reduceMotionUserPref', false);
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(true);
  });
});

describe('AX-09: setSystemReduceMotion (the AccessibilityInfo subscription) updates the effective value live and never persists', () => {
  test('flips the effective field without touching AsyncStorage', async () => {
    useAppStore.getState().setSystemReduceMotion(true);
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(true);
    expect(useAppStore.getState().systemReduceMotion).toBe(true);
    // Nothing has been saved yet (no setAccessibilityPref call in this test).
    expect(await AsyncStorage.getItem(A11Y_PREFS_KEY)).toBeNull();

    useAppStore.getState().setSystemReduceMotion(false);
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(false);
    expect(await AsyncStorage.getItem(A11Y_PREFS_KEY)).toBeNull();
  });

  test('a later setAccessibilityPref call never persists systemReduceMotion as part of the accessibility object', async () => {
    useAppStore.getState().setSystemReduceMotion(true);
    await useAppStore.getState().setAccessibilityPref('largerText', true);
    const raw = await AsyncStorage.getItem(A11Y_PREFS_KEY);
    const saved = JSON.parse(raw);
    expect(saved.systemReduceMotion).toBeUndefined();
  });
});

describe('AX-09: loadAccessibility migrates a pre-split persisted reduceMotion into reduceMotionUserPref', () => {
  test('legacy install with reduceMotion: true but no reduceMotionUserPref seeds the user pref', async () => {
    await AsyncStorage.setItem(A11Y_PREFS_KEY, JSON.stringify({ reduceMotion: true }));
    useAppStore.setState({ accessibilityLoaded: false });
    await useAppStore.getState().loadAccessibility();
    expect(useAppStore.getState().accessibility.reduceMotionUserPref).toBe(true);
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(true);
  });

  test('an install that already has reduceMotionUserPref is not overridden by the legacy field', async () => {
    await AsyncStorage.setItem(
      A11Y_PREFS_KEY,
      JSON.stringify({ reduceMotion: true, reduceMotionUserPref: false }),
    );
    useAppStore.setState({ accessibilityLoaded: false });
    await useAppStore.getState().loadAccessibility();
    expect(useAppStore.getState().accessibility.reduceMotionUserPref).toBe(false);
    // No system flag hydrated yet in this test, so effective collapses to the user pref.
    expect(useAppStore.getState().accessibility.reduceMotion).toBe(false);
  });
});
