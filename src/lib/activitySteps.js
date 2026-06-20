/**
 * activitySteps: read today's step count from the platform health aggregator.
 *
 * Steps come from Apple HealthKit on iOS and Health Connect on Android, both
 * via the unified wrapper in health.js. Both are AGGREGATORS: the phone's own
 * pedometer, the Apple Watch, and connected wearables (Garmin, Fitbit, Whoop,
 * Samsung, Pixel Watch, etc.) all write their steps there, and the aggregator
 * returns one deduplicated daily total. Reading the aggregator rather than the
 * iPhone's Core Motion chip is what lets a user's watch or band count, which
 * Core Motion alone cannot do (it sees only the phone in your pocket).
 *
 * Everything here is guarded and lazy: if the platform module or permission
 * is unavailable the functions resolve to a safe value and the caller falls
 * back to manual entry. No path forces a wearable or a health account.
 *
 * This module does NOT write anything. The caller reads today's count, the
 * user confirms or overrides, and the write goes through database.setDailySteps.
 */

import { Platform } from 'react-native';

// Lazy require so importing this module never drags the native health module
// in on web, and so the app keeps building if it is ever removed.
function getHealth() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line global-require
    return require('./health');
  } catch (_) {
    return null;
  }
}

/**
 * Whether an automatic step source is usable on this device right now.
 * Reflects whether the platform health module loaded (HealthKit on iOS,
 * Health Connect on Android). Says nothing about permissions. Never throws.
 */
export async function isStepSourceAvailable() {
  const health = getHealth();
  if (!health?.isHealthAvailable) return false;
  try {
    return !!health.isHealthAvailable();
  } catch (_) {
    return false;
  }
}

/**
 * Permission status WITHOUT prompting, so the caller can decide whether to
 * read silently (already granted) or offer to connect (not yet granted)
 * rather than firing a system sheet unprompted.
 * Returns 'granted' | 'undetermined' | 'denied' | 'unavailable'. Never throws.
 */
export async function getStepPermissionStatus() {
  const health = getHealth();
  if (!health?.getHealthPermissionStatus) return 'unavailable';
  try {
    const status = await health.getHealthPermissionStatus(['steps']);
    // HealthKit deliberately does not expose read authorisation to the app,
    // so health.js returns 'denied' before the first init even when the user
    // has never been asked. Map that to 'undetermined' on iOS so the caller
    // still offers to connect; re-initing is harmless if it was truly denied.
    if (Platform.OS === 'ios' && status === 'denied') return 'undetermined';
    return status;
  } catch (_) {
    return 'unavailable';
  }
}

/**
 * Ask for the steps read permission. iOS: the HealthKit sheet for step count.
 * Android: the Health Connect READ_STEPS sheet. Returns true when reads are
 * likely to succeed. Never throws.
 */
export async function requestStepPermission() {
  const health = getHealth();
  if (!health?.requestHealthPermissions) return false;
  try {
    const status = await health.requestHealthPermissions(['steps']);
    return status === 'granted';
  } catch (_) {
    return false;
  }
}

/**
 * Like requestStepPermission but returns the full status string so the caller
 * can react to 'sdk_unavailable' (send the user to install Health Connect)
 * rather than treating everything that isn't 'granted' as a flat refusal.
 * Returns 'granted' | 'denied' | 'sdk_unavailable' | 'unavailable'. Never throws.
 */
export async function requestStepPermissionStatus() {
  const health = getHealth();
  if (!health?.requestHealthPermissions) return 'unavailable';
  try {
    return await health.requestHealthPermissions(['steps']);
  } catch (_) {
    return 'unavailable';
  }
}

/**
 * Today's step count from the aggregator, or null when no automatic figure is
 * available (module missing, permission not granted, or a genuine zero so far
 * today). Null means "fall back to manual", which the caller already handles.
 * Never throws.
 */
export async function readTodaySteps() {
  const health = getHealth();
  if (!health?.readStepsToday) return null;
  try {
    const steps = await health.readStepsToday();
    // readStepsToday returns 0 when permission isn't granted, so treat 0 as
    // "no figure" and let the caller fall back rather than logging a false zero.
    return typeof steps === 'number' && steps > 0 ? Math.round(steps) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Read today's steps and record them in daily_steps, but only when the read
 * permission is already granted (which only happens after the user opts in).
 * Silent and guarded: no prompt, no-op on any failure or a null figure. Called
 * from the app-foreground handler so the step store and the weekly coach
 * average stay current without a visible daily step card. Returns the written
 * row, or null when nothing was written.
 */
export async function recordTodaySteps(userId) {
  if (!userId) return null;
  try {
    const status = await getStepPermissionStatus();
    if (status !== 'granted') return null;
    const steps = await readTodaySteps();
    if (steps == null) return null;
    // eslint-disable-next-line global-require
    const { setDailySteps } = require('./database');
    return await setDailySteps(userId, { steps, source: 'auto' });
  } catch (_) {
    return null;
  }
}

/**
 * Backfill COMPLETE daily step totals for the last `days` days into daily_steps.
 *
 * recordTodaySteps only ever writes a partial "steps so far" snapshot whenever
 * the app is foregrounded, so past days are left under-counted and the weekly
 * coach average reads far too low. This pulls each day's real end-of-day total
 * from the health aggregator and writes it. It NEVER overwrites a manual entry
 * (a user override always wins). Best-effort, guarded, never throws. Returns the
 * number of days written.
 */
export async function backfillDailySteps(userId, days = 14) {
  if (!userId) return 0;
  try {
    const status = await getStepPermissionStatus();
    if (status !== 'granted') return 0;
    const health = getHealth();
    if (!health?.readDailyStepTotals) return 0;
    const sinceMs = Date.now() - days * 86400000;
    const totals = await health.readDailyStepTotals(sinceMs);
    if (!Array.isArray(totals) || !totals.length) return 0;
    // eslint-disable-next-line global-require
    const { setDailySteps, getDailyStepsRange, activityDayKey } = require('./database');
    const existing = await getDailyStepsRange(userId, activityDayKey(sinceMs), activityDayKey()).catch(() => []);
    const manualDays = new Set((existing || []).filter((r) => r.source === 'manual').map((r) => r.entryDate));
    let written = 0;
    for (const { entryDate, steps } of totals) {
      if (!entryDate || !(steps > 0) || manualDays.has(entryDate)) continue;
      // eslint-disable-next-line no-await-in-loop
      await setDailySteps(userId, { entryDate, steps, source: 'auto' });
      written += 1;
    }
    return written;
  } catch (_) {
    return 0;
  }
}

/**
 * The single "connect your health data" ask used by the launch prompt and Pro
 * enrolment. Requests steps AND weight together in one system sheet, and on a
 * grant kicks the immediate reads so the user sees both straight away: today's
 * steps into daily_steps, and any new bodyweight from a scale or wearable into
 * the morning-weight log (which the weekly check-in reads). Asking for both in
 * one sheet is what links weight in without a second prompt or a Settings trip.
 *
 * Returns the permission status string ('granted' | 'denied' | 'sdk_unavailable'
 * | 'unavailable') so the caller can send the user to install Health Connect
 * when that is the real blocker. Never throws.
 */
export async function connectHealthStepsAndWeight(userId) {
  const health = getHealth();
  if (!health?.requestHealthPermissions) return 'unavailable';
  let status;
  try {
    status = await health.requestHealthPermissions(['steps', 'weight']);
  } catch (_) {
    return 'unavailable';
  }
  if (status === 'granted') {
    try { await recordTodaySteps(userId); } catch (_) { /* steps best effort */ }
    // Backfill complete history so past days aren't stuck at partial snapshots.
    try { await backfillDailySteps(userId); } catch (_) { /* best effort */ }
    try {
      // importNewWeights self-gates on the weight permission and only reads
      // since the last import, so it is cheap and safe to fire here.
      health.importNewWeights?.(userId)?.catch?.(() => {});
      // Passive cardio import rides the same foreground trigger (NA-cux-3). It
      // self-gates on the 'cardio' permission, so it no-ops until the user has
      // connected cardio in Settings; once connected it pulls new sessions here.
      health.importNewCardio?.(userId)?.catch?.(() => {});
    } catch (_) { /* health import best effort */ }
  }
  return status;
}
