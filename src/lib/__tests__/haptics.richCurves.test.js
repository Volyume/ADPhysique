/**
 * haptics.richCurves.test.js — D17 Core-Haptics-level curves.
 *
 * Pins the exact contract decision D17 requires (research
 * docs/ux-world-class-audit-2026-07-09/core-haptics-research.md,
 * DECISIONS-2026-07-09.md entry D17): on iOS, when
 * react-native-haptic-feedback is available, restDone()/prAchieved() play
 * the richer triggerPattern() curve; on Android, or if the library fails to
 * load, they fall back to the EXACT pre-existing three-beat expo-haptics
 * ladder; and the app's one haptics on/off setting (reduce motion) silences
 * both paths identically, same as every other event in the vocabulary.
 *
 * Scope note: every other haptic in the vocabulary stays on expo-haptics
 * untouched (haptics.importBan.test.js / motionFitRules.guard.test.js pin
 * that separately) — this suite only covers the two D17 call sites.
 */

let mockReduceMotion = false;

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ accessibility: { reduceMotion: mockReduceMotion } }) },
}));

const mockExpoNotificationAsync = jest.fn(() => Promise.resolve());
const mockExpoImpactAsync = jest.fn(() => Promise.resolve());

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  notificationAsync: (...args) => mockExpoNotificationAsync(...args),
  impactAsync: (...args) => mockExpoImpactAsync(...args),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

// The root __mocks__/react-native-haptic-feedback.js manual mock (jest.fn()
// stubs mirroring the real surface, same pattern as expo-sqlite/expo-secure-
// store in that folder) — opted into explicitly, matching this codebase's
// convention for node_modules mocks.
jest.mock('react-native-haptic-feedback');

const { Platform } = require('react-native');
const haptics = require('../haptics');
const RNHapticFeedback = require('react-native-haptic-feedback');

describe('haptics rich curves (D17)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduceMotion = false;
    mockExpoNotificationAsync.mockClear();
    mockExpoImpactAsync.mockClear();
    RNHapticFeedback.triggerPattern.mockClear();
    Platform.OS = 'android';
  });

  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = 'android';
  });

  describe('iOS path: triggerPattern with the defined patterns', () => {
    test('restDone() plays the rest settle-swell curve and skips the legacy ladder', async () => {
      Platform.OS = 'ios';
      await haptics.restDone();
      expect(RNHapticFeedback.triggerPattern).toHaveBeenCalledTimes(1);
      expect(RNHapticFeedback.triggerPattern).toHaveBeenCalledWith(haptics.REST_DONE_PATTERN_IOS);
      jest.runAllTimers();
      expect(mockExpoNotificationAsync).not.toHaveBeenCalled();
      expect(mockExpoImpactAsync).not.toHaveBeenCalled();
    });

    test('prAchieved() plays the PR two-peak curve and skips the legacy ladder', async () => {
      Platform.OS = 'ios';
      await haptics.prAchieved();
      expect(RNHapticFeedback.triggerPattern).toHaveBeenCalledTimes(1);
      expect(RNHapticFeedback.triggerPattern).toHaveBeenCalledWith(haptics.PR_ACHIEVED_PATTERN_IOS);
      jest.runAllTimers();
      expect(mockExpoNotificationAsync).not.toHaveBeenCalled();
      expect(mockExpoImpactAsync).not.toHaveBeenCalled();
    });

    test('the two patterns are distinct and shaped as documented (timings/intensities)', () => {
      expect(haptics.REST_DONE_PATTERN_IOS).toEqual([
        { time: 0, type: 'continuous', duration: 90, intensity: 0.18, sharpness: 0.15 },
        { time: 90, type: 'continuous', duration: 90, intensity: 0.32, sharpness: 0.2 },
        { time: 180, type: 'continuous', duration: 110, intensity: 0.48, sharpness: 0.3 },
        { time: 300, type: 'transient', intensity: 0.7, sharpness: 0.4 },
      ]);
      expect(haptics.PR_ACHIEVED_PATTERN_IOS).toEqual([
        { time: 0, type: 'transient', intensity: 0.6, sharpness: 0.5 },
        { time: 140, type: 'continuous', duration: 60, intensity: 0.4, sharpness: 0.35 },
        { time: 260, type: 'transient', intensity: 0.85, sharpness: 0.6 },
      ]);
      // PR is the brighter of the two: its peak intensity/sharpness exceed rest-done's.
      const restPeak = Math.max(...haptics.REST_DONE_PATTERN_IOS.map(e => e.intensity));
      const prPeak = Math.max(...haptics.PR_ACHIEVED_PATTERN_IOS.map(e => e.intensity));
      expect(prPeak).toBeGreaterThan(restPeak);
    });
  });

  describe('Android path: legacy ladder, richer curve never attempted', () => {
    test('restDone() on Android plays the exact three-beat expo-haptics ladder', async () => {
      Platform.OS = 'android';
      await haptics.restDone();
      expect(RNHapticFeedback.triggerPattern).not.toHaveBeenCalled();
      expect(mockExpoNotificationAsync).toHaveBeenCalledWith('success');
      jest.advanceTimersByTime(200);
      jest.advanceTimersByTime(200);
      expect(mockExpoImpactAsync).toHaveBeenNthCalledWith(1, 'heavy');
      expect(mockExpoImpactAsync).toHaveBeenNthCalledWith(2, 'heavy');
      expect(mockExpoImpactAsync).toHaveBeenCalledTimes(2);
    });

    test('prAchieved() on Android plays the exact three-beat expo-haptics ladder', async () => {
      Platform.OS = 'android';
      await haptics.prAchieved();
      expect(RNHapticFeedback.triggerPattern).not.toHaveBeenCalled();
      expect(mockExpoNotificationAsync).toHaveBeenCalledWith('success');
      jest.advanceTimersByTime(150);
      jest.advanceTimersByTime(150);
      expect(mockExpoImpactAsync).toHaveBeenNthCalledWith(1, 'heavy');
      expect(mockExpoImpactAsync).toHaveBeenNthCalledWith(2, 'heavy');
      expect(mockExpoImpactAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('failure path: the library fails at runtime, iOS falls back to the ladder', () => {
    test('restDone() falls back when triggerPattern throws (native call fails)', async () => {
      Platform.OS = 'ios';
      RNHapticFeedback.triggerPattern.mockImplementationOnce(() => {
        throw new Error('RNReactNativeHapticFeedback: triggerPattern failed');
      });
      await haptics.restDone();
      jest.runAllTimers();
      // The rich curve was attempted (and threw) before the fallback ran.
      expect(RNHapticFeedback.triggerPattern).toHaveBeenCalledTimes(1);
      expect(mockExpoNotificationAsync).toHaveBeenCalledWith('success');
      expect(mockExpoImpactAsync).toHaveBeenCalledTimes(2);
    });

    test('prAchieved() falls back when the module resolves without a usable triggerPattern', async () => {
      Platform.OS = 'ios';
      // Simulates a partially-loaded / not-actually-linked native module: the
      // JS require succeeds but the native side never wired up the method.
      const originalTriggerPattern = RNHapticFeedback.triggerPattern;
      RNHapticFeedback.triggerPattern = undefined;
      try {
        await haptics.prAchieved();
        jest.runAllTimers();
        expect(mockExpoNotificationAsync).toHaveBeenCalledWith('success');
        expect(mockExpoImpactAsync).toHaveBeenCalledTimes(2);
      } finally {
        RNHapticFeedback.triggerPattern = originalTriggerPattern;
      }
    });
  });

  describe('reduce-motion setting suppresses both paths', () => {
    test('iOS: reduce motion silences the richer curve entirely', async () => {
      Platform.OS = 'ios';
      mockReduceMotion = true;
      await haptics.restDone();
      await haptics.prAchieved();
      jest.runAllTimers();
      expect(RNHapticFeedback.triggerPattern).not.toHaveBeenCalled();
      expect(mockExpoNotificationAsync).not.toHaveBeenCalled();
      expect(mockExpoImpactAsync).not.toHaveBeenCalled();
    });

    test('Android: reduce motion silences the legacy ladder identically', async () => {
      Platform.OS = 'android';
      mockReduceMotion = true;
      await haptics.restDone();
      await haptics.prAchieved();
      jest.runAllTimers();
      expect(RNHapticFeedback.triggerPattern).not.toHaveBeenCalled();
      expect(mockExpoNotificationAsync).not.toHaveBeenCalled();
      expect(mockExpoImpactAsync).not.toHaveBeenCalled();
    });
  });
});
