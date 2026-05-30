/**
 * activitySteps: read today's step count from the phone, no wearable.
 *
 * The cardio/steps audit (section 3a) established that the phone already
 * counts steps natively, so for most users the app should read that figure
 * rather than ask them to type it. This module reads today's steps using the
 * lowest-friction source per platform:
 *
 *   iOS:     expo-sensors Pedometer, which reads Core Motion (the motion
 *            coprocessor) directly. One "Motion and Fitness" permission, no
 *            HealthKit, no account. getStepCountAsync works on iOS and covers
 *            today plus a 7-day history window.
 *   Android: expo-sensors cannot return a daily total (getStepCountAsync is
 *            not implemented on Android, it is live/session-only), so we read
 *            Health Connect instead via the existing health.js readStepsToday
 *            (react-native-health-connect, one permission sheet, still no
 *            wearable).
 *
 * Everything here is guarded and lazy: if the sensor or permission is
 * unavailable the functions resolve to a safe value and the caller falls
 * back to manual entry. No path here forces a wearable or a health account.
 *
 * This module does NOT write anything. The card reads today's count, the
 * user confirms or overrides, and the write goes through database.setDailySteps.
 */

import { Platform } from 'react-native';

// Lazy require so the app keeps building if expo-sensors is ever removed,
// and so importing this module never drags the native sensor in on web.
function getPedometer() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    return require('expo-sensors').Pedometer;
  } catch (_) {
    return null;
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Whether an automatic step source is usable on this device right now.
 * iOS: the Pedometer reports availability. Android: Health Connect
 * availability (health.js isHealthAvailable). Never throws.
 */
export async function isStepSourceAvailable() {
  if (Platform.OS === 'ios') {
    const Pedometer = getPedometer();
    if (!Pedometer?.isAvailableAsync) return false;
    try {
      return await Pedometer.isAvailableAsync();
    } catch (_) {
      return false;
    }
  }
  if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line global-require
      const { isHealthAvailable } = require('./health');
      return isHealthAvailable();
    } catch (_) {
      return false;
    }
  }
  return false;
}

/**
 * Permission status WITHOUT prompting, so the card can decide whether to
 * auto-read silently (already granted) or show a "use my phone's steps"
 * button (not yet granted) rather than firing a system dialog on mount.
 * Returns 'granted' | 'undetermined' | 'denied' | 'unavailable'. Never throws.
 */
export async function getStepPermissionStatus() {
  if (Platform.OS === 'ios') {
    const Pedometer = getPedometer();
    if (!Pedometer?.getPermissionsAsync) return 'unavailable';
    try {
      const res = await Pedometer.getPermissionsAsync();
      if (res?.granted) return 'granted';
      if (res?.canAskAgain === false) return 'denied';
      return res?.status === 'granted' ? 'granted' : 'undetermined';
    } catch (_) {
      return 'unavailable';
    }
  }
  if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line global-require
      const { getHealthPermissionStatus } = require('./health');
      return await getHealthPermissionStatus(['steps']);
    } catch (_) {
      return 'unavailable';
    }
  }
  return 'unavailable';
}

/**
 * Ask for whatever permission the automatic source needs. iOS: the
 * Pedometer's Motion and Fitness prompt. Android: the Health Connect
 * READ_STEPS sheet (health.js requestHealthPermissions(['steps'])).
 * Returns true when reads are likely to succeed. Never throws.
 */
export async function requestStepPermission() {
  if (Platform.OS === 'ios') {
    const Pedometer = getPedometer();
    if (!Pedometer?.requestPermissionsAsync) return false;
    try {
      const res = await Pedometer.requestPermissionsAsync();
      return res?.granted === true || res?.status === 'granted';
    } catch (_) {
      return false;
    }
  }
  if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line global-require
      const { requestHealthPermissions } = require('./health');
      const status = await requestHealthPermissions(['steps']);
      return status === 'granted';
    } catch (_) {
      return false;
    }
  }
  return false;
}

/**
 * Today's step count from the phone, or null when no automatic figure is
 * available (sensor missing, permission denied, platform unsupported). Null
 * means "fall back to manual", which the caller already handles. Never
 * throws.
 */
export async function readTodaySteps() {
  if (Platform.OS === 'ios') {
    const Pedometer = getPedometer();
    if (!Pedometer?.getStepCountAsync) return null;
    try {
      const result = await Pedometer.getStepCountAsync(startOfToday(), new Date());
      const steps = result?.steps;
      return typeof steps === 'number' && steps >= 0 ? Math.round(steps) : null;
    } catch (_) {
      return null;
    }
  }
  if (Platform.OS === 'android') {
    try {
      // Health Connect path, already implemented for the NEAT estimate.
      // Returns 0 when permission isn't granted, so treat 0 as "no figure"
      // and let the caller fall back rather than logging a false zero.
      // eslint-disable-next-line global-require
      const { readStepsToday } = require('./health');
      const steps = await readStepsToday();
      return typeof steps === 'number' && steps > 0 ? Math.round(steps) : null;
    } catch (_) {
      return null;
    }
  }
  return null;
}
