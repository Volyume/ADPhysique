/**
 * health.js
 * Unified wrapper over Apple HealthKit (iOS) and Health Connect (Android).
 *
 * Goals:
 *   - One API surface so the rest of the app doesn't branch on Platform.
 *   - Lazy-require the native modules. If the user is on a version of
 *     the app that wasn't built with them (Expo Go, JS reload during
 *     development), every call no-ops with a clear "unavailable" return
 *     rather than crashing.
 *   - Quiet on failure. Health reads run in the background; a denied
 *     permission or missing device feature should never throw upstream.
 *
 * Read scopes supported so far:
 *   - 'weight'   bodyweight in kilograms
 *
 * Write scopes planned (not yet wired):
 *   - 'workout'  log Volyume sessions back to Health
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-user "last imported" marker. Storing per-uid lets a shared device
// keep separate import windows for each Volyume account.
const LAST_IMPORT_KEY_PFX = '@volyume_health_last_import_';

// In-memory cache of the resolved native modules so we don't pay the
// require + initialise cost on every call. Loaded lazily.
let _iosModule = null;
let _androidModule = null;
let _iosInited = false;

function getIosModule() {
  if (_iosModule || Platform.OS !== 'ios') return _iosModule;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    _iosModule = require('react-native-health').default;
  } catch (_) { _iosModule = null; }
  return _iosModule;
}

function getAndroidModule() {
  if (_androidModule || Platform.OS !== 'android') return _androidModule;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    _androidModule = require('react-native-health-connect');
  } catch (_) { _androidModule = null; }
  return _androidModule;
}

/**
 * True when the native module is loadable on the current device.
 * Doesn't say anything about permissions, just about availability.
 */
export function isHealthAvailable() {
  if (Platform.OS === 'ios') return !!getIosModule();
  if (Platform.OS === 'android') return !!getAndroidModule();
  return false;
}

/**
 * Human-readable label for the underlying platform integration. Used
 * by the Settings screen so the row says "Apple Health" on iOS and
 * "Health Connect" on Android.
 */
export function getHealthProviderLabel() {
  if (Platform.OS === 'ios') return 'Apple Health';
  if (Platform.OS === 'android') return 'Health Connect';
  return 'Health';
}

// ─── Permissions ──────────────────────────────────────────────────────

/**
 * Initialise HealthKit (iOS only). Idempotent. Returns whether the
 * native init succeeded. Permission acceptance still needs the system
 * dialog, which happens on first read.
 */
async function _ensureIosInited(perms) {
  if (_iosInited) return true;
  const HK = getIosModule();
  if (!HK) return false;
  return new Promise(resolve => {
    HK.initHealthKit(perms, (err) => {
      if (err) {
        _iosInited = false;
        resolve(false);
        return;
      }
      _iosInited = true;
      resolve(true);
    });
  });
}

/**
 * Request the given scopes. Returns 'granted' | 'denied' | 'unavailable'.
 * On iOS, HealthKit doesn't expose explicit "granted" state to the app
 * (privacy by design), so a successful init is treated as granted for
 * the requested scopes. Subsequent reads / writes will silently no-op
 * if the user actually denied them in the system sheet.
 *
 * Supported scopes:
 *   'weight'        read bodyweight samples
 *   'workout'       write completed workouts (plus active energy)
 *   'steps'         read daily step counts
 */
export async function requestHealthPermissions(scopes = ['weight']) {
  if (!isHealthAvailable()) return 'unavailable';

  if (Platform.OS === 'ios') {
    const HK = getIosModule();
    const Constants = HK.Constants;
    const reads = [];
    const writes = [];
    if (scopes.includes('weight')) reads.push(Constants.Permissions.Weight);
    if (scopes.includes('steps')) reads.push(Constants.Permissions.StepCount);
    if (scopes.includes('workout')) {
      writes.push(Constants.Permissions.Workout);
      writes.push(Constants.Permissions.ActiveEnergyBurned);
    }
    const perms = { permissions: { read: reads, write: writes } };
    const ok = await _ensureIosInited(perms);
    return ok ? 'granted' : 'denied';
  }

  if (Platform.OS === 'android') {
    const HC = getAndroidModule();
    try {
      // Tell "Health Connect isn't set up on this phone" apart from "the
      // user said no". Without this the caller can only ever say
      // "permission needed", which is a dead end when the real fix is to
      // install or open Health Connect. SDK_AVAILABLE is the only state
      // where a permission request can succeed.
      const sdk = await HC.getSdkStatus();
      if (sdk !== HC.SdkAvailabilityStatus.SDK_AVAILABLE) return 'sdk_unavailable';
      const initialised = await HC.initialize();
      if (!initialised) return 'sdk_unavailable';
      const recordTypes = [];
      if (scopes.includes('weight')) recordTypes.push({ accessType: 'read', recordType: 'Weight' });
      if (scopes.includes('steps')) recordTypes.push({ accessType: 'read', recordType: 'Steps' });
      if (scopes.includes('workout')) {
        recordTypes.push({ accessType: 'write', recordType: 'ExerciseSession' });
        recordTypes.push({ accessType: 'write', recordType: 'ActiveCaloriesBurned' });
      }
      const granted = await HC.requestPermission(recordTypes);
      const allGranted = Array.isArray(granted) && granted.length >= recordTypes.length;
      return allGranted ? 'granted' : 'denied';
    } catch (_) { return 'denied'; }
  }

  return 'unavailable';
}

/**
 * Check status without prompting. Returns 'granted' | 'denied' |
 * 'unavailable'. Useful for rendering Settings toggle state. Pass the
 * exact scopes you want to verify, e.g. ['weight'] or ['workout'].
 */
export async function getHealthPermissionStatus(scopes = ['weight']) {
  if (!isHealthAvailable()) return 'unavailable';

  if (Platform.OS === 'ios') {
    // HealthKit deliberately doesn't expose read auth status to the
    // app, so we treat a successful prior init as granted. Writes do
    // expose status, but for a uniform API we settle for "init worked".
    return _iosInited ? 'granted' : 'denied';
  }

  if (Platform.OS === 'android') {
    const HC = getAndroidModule();
    try {
      await HC.initialize();
      const granted = await HC.getGrantedPermissions();
      const want = (recordType, accessType) =>
        granted?.some?.(p => p?.recordType === recordType && p?.accessType === accessType);
      let ok = true;
      if (scopes.includes('weight')) ok = ok && want('Weight', 'read');
      if (scopes.includes('steps')) ok = ok && want('Steps', 'read');
      if (scopes.includes('workout')) {
        ok = ok && want('ExerciseSession', 'write') && want('ActiveCaloriesBurned', 'write');
      }
      return ok ? 'granted' : 'denied';
    } catch (_) { return 'denied'; }
  }

  return 'unavailable';
}

/**
 * Opens the OS-level Health settings so the user can revoke
 * permissions or change what Volyume can see. HealthKit and Health
 * Connect both intentionally don't let the app revoke its own access
 * (you'd be able to lock yourself out otherwise), so a Settings deep
 * link is the only correct disconnect path.
 */
export async function openSystemHealthSettings() {
  // eslint-disable-next-line global-require
  const { Linking } = require('react-native');
  try {
    if (Platform.OS === 'ios') {
      // Sources tab inside iOS Settings -> Health. iOS deep-link
      // surface is limited; this is the closest stable entry.
      await Linking.openURL('x-apple-health://');
      return true;
    }
    if (Platform.OS === 'android') {
      // Use the library's native intent. The old `package:` URL never
      // resolved, so this row used to go nowhere. openHealthConnectSettings
      // launches the Health Connect app's own settings where the user can
      // grant or revoke Volyume's access.
      const HC = getAndroidModule();
      if (HC?.openHealthConnectSettings) {
        await HC.openHealthConnectSettings();
        return true;
      }
      // Fallback for the unlikely case the native method is missing: open
      // the Health Connect data-management screen if exposed, else the app's
      // own OS settings.
      if (HC?.openHealthConnectDataManagement) {
        await HC.openHealthConnectDataManagement();
        return true;
      }
    }
  } catch (_) {
    try { await Linking.openSettings(); return true; } catch (__) {}
  }
  try { await Linking.openSettings(); return true; } catch (_) {}
  return false;
}

/**
 * Android only. Returns whether the Health Connect SDK is usable right now:
 *   'available'       Health Connect installed and ready to grant permissions
 *   'update_required' Health Connect (or the system provider) needs an update
 *   'not_installed'   Health Connect app isn't installed on this phone
 *   'unavailable'     not Android, or the native module didn't load
 * Lets the UI send the user to install/update Health Connect rather than
 * showing a dead "permission needed" with no way forward. Never throws.
 */
export async function getHealthConnectSdkStatus() {
  if (Platform.OS !== 'android') return 'unavailable';
  const HC = getAndroidModule();
  if (!HC?.getSdkStatus) return 'unavailable';
  try {
    const sdk = await HC.getSdkStatus();
    if (sdk === HC.SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (sdk === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update_required';
    return 'not_installed';
  } catch (_) { return 'unavailable'; }
}

/**
 * Opens the Google Play listing for Health Connect so a user without it can
 * install it. On Android 14+ Health Connect ships in the OS and this is a
 * no-op path, but on Android 13 and below it's a separate app. Never throws.
 */
export async function openHealthConnectInstall() {
  if (Platform.OS !== 'android') return false;
  // eslint-disable-next-line global-require
  const { Linking } = require('react-native');
  const PLAY_URL = 'market://details?id=com.google.android.apps.healthdata';
  const WEB_URL = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';
  try {
    await Linking.openURL(PLAY_URL);
    return true;
  } catch (_) {
    try { await Linking.openURL(WEB_URL); return true; } catch (__) {}
  }
  return false;
}

// ─── Weight read ──────────────────────────────────────────────────────

/**
 * Returns the most recent weight reading, or null if none.
 * Result: { weightKg: number, loggedAtMs: number, source: string } | null
 */
export async function readLatestWeight() {
  const samples = await readWeightsSince(0);
  if (!samples?.length) return null;
  return samples[0];
}

/**
 * Returns weight samples logged at or after `sinceMs`, sorted newest first.
 * Each sample: { weightKg, loggedAtMs, source }.
 */
export async function readWeightsSince(sinceMs = 0) {
  if (!isHealthAvailable()) return [];
  const startISO = new Date(Math.max(0, sinceMs)).toISOString();
  const endISO = new Date().toISOString();

  if (Platform.OS === 'ios') {
    const HK = getIosModule();
    if (!HK) return [];
    return new Promise(resolve => {
      HK.getWeightSamples({ startDate: startISO, endDate: endISO, unit: 'gram' }, (err, results) => {
        if (err || !results?.length) { resolve([]); return; }
        const out = results.map(r => ({
          weightKg: typeof r.value === 'number' ? r.value / 1000 : null,
          loggedAtMs: r.startDate ? new Date(r.startDate).getTime() : Date.now(),
          source: r?.sourceName || 'Apple Health',
        })).filter(s => s.weightKg && s.weightKg > 0);
        out.sort((a, b) => b.loggedAtMs - a.loggedAtMs);
        resolve(out);
      });
    });
  }

  if (Platform.OS === 'android') {
    const HC = getAndroidModule();
    if (!HC) return [];
    try {
      const { records } = await HC.readRecords('Weight', {
        timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
      });
      if (!records?.length) return [];
      const out = records.map(r => ({
        weightKg: r?.weight?.inKilograms ?? null,
        loggedAtMs: r?.time ? new Date(r.time).getTime() : Date.now(),
        source: r?.metadata?.dataOrigin || 'Health Connect',
      })).filter(s => s.weightKg && s.weightKg > 0);
      out.sort((a, b) => b.loggedAtMs - a.loggedAtMs);
      return out;
    } catch (_) { return []; }
  }

  return [];
}

// ─── Steps read ───────────────────────────────────────────────────────

/**
 * Total steps for today, summed from Health. Returns 0 when permission
 * isn't granted or the platform doesn't expose it. Used by the Home
 * screen "steps today" pill and by the nutrition NEAT estimator.
 */
export async function readStepsToday() {
  if (!isHealthAvailable()) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startISO = start.toISOString();
  const endISO = new Date().toISOString();

  if (Platform.OS === 'ios') {
    const HK = getIosModule();
    if (!HK) return 0;
    return new Promise(resolve => {
      HK.getStepCount({ startDate: startISO, endDate: endISO }, (err, result) => {
        if (err || typeof result?.value !== 'number') { resolve(0); return; }
        resolve(Math.round(result.value));
      });
    });
  }

  if (Platform.OS === 'android') {
    const HC = getAndroidModule();
    if (!HC) return 0;
    try {
      // Aggregate, not raw readRecords. The aggregate API deduplicates
      // overlapping data across sources (phone, watch, Garmin, Whoop) using
      // Health Connect's per-app priority, so a user with several trackers
      // sees one accurate total rather than the sum of every source. Summing
      // raw records would double-count anyone with more than one tracker.
      const result = await HC.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
      });
      const total = result?.COUNT_TOTAL ?? 0;
      return Math.round(total);
    } catch (_) {
      // A denied permission or an older Health Connect can throw on aggregate.
      // Fall back to summing raw records so a single-source user still gets a
      // number rather than a silent zero.
      try {
        const { records } = await HC.readRecords('Steps', {
          timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
        });
        const total = (records ?? []).reduce((sum, r) => sum + (r?.count ?? 0), 0);
        return Math.round(total);
      } catch (_) { return 0; }
    }
  }

  return 0;
}

// ─── Workout write ────────────────────────────────────────────────────

/**
 * Conservative kcal estimate for a strength session. Tonnage-driven so
 * it reflects how much actual work the user moved, not just duration.
 *
 * Method: ACSM resistance-training rate (~5 kcal/min for moderate
 * intensity at a 75 kg lifter) scaled by bodyweight and clamped so a
 * 4-set warm-up doesn't return zero and a marathon arm day doesn't
 * read as 1500 kcal.
 */
function estimateWorkoutKcal({ durationMin, tonnageKg, bodyWeightKg }) {
  const bw = bodyWeightKg && bodyWeightKg > 30 ? bodyWeightKg : 75;
  const minutes = Math.max(5, Math.min(durationMin || 30, 180));
  const baseRate = 5 * (bw / 75);          // kcal per minute, bw-scaled
  const tonnageBoost = tonnageKg ? Math.min(tonnageKg / 4000, 1.4) : 0; // up to +40%
  const kcal = baseRate * minutes * (1 + tonnageBoost);
  return Math.max(40, Math.min(Math.round(kcal), 1200));
}

/**
 * Writes a single completed workout into Health.
 *
 *   workout: {
 *     startedAt:    epoch ms
 *     endedAt:      epoch ms
 *     tonnageKg?:   total lifted volume (optional, sharpens kcal estimate)
 *     bodyWeightKg?: lifter's bodyweight (optional, sharpens kcal estimate)
 *     notes?:       short string
 *   }
 *
 * Returns true if the platform accepted the write. Silently no-ops if
 * the workout permission wasn't granted or the native module isn't
 * loaded.
 */
export async function writeWorkoutToHealth(workout) {
  if (!isHealthAvailable()) return false;
  if (!workout?.startedAt || !workout?.endedAt || workout.endedAt <= workout.startedAt) return false;
  const status = await getHealthPermissionStatus(['workout']);
  if (status !== 'granted') return false;

  const startISO = new Date(workout.startedAt).toISOString();
  const endISO = new Date(workout.endedAt).toISOString();
  const durationMin = (workout.endedAt - workout.startedAt) / 60000;
  const kcal = estimateWorkoutKcal({
    durationMin,
    tonnageKg: workout.tonnageKg,
    bodyWeightKg: workout.bodyWeightKg,
  });

  if (Platform.OS === 'ios') {
    const HK = getIosModule();
    if (!HK) return false;
    return new Promise(resolve => {
      HK.saveWorkout({
        type: HK.Constants.Activities.TraditionalStrengthTraining,
        startDate: startISO,
        endDate: endISO,
        energyBurned: kcal,
        energyBurnedUnit: 'kilocalorie',
      }, (err) => resolve(!err));
    });
  }

  if (Platform.OS === 'android') {
    const HC = getAndroidModule();
    if (!HC) return false;
    try {
      await HC.insertRecords([
        {
          recordType: 'ExerciseSession',
          startTime: startISO,
          endTime: endISO,
          exerciseType: 49, // strength_training in Health Connect's enum
          title: 'Volyume session',
          notes: workout.notes ?? null,
        },
        {
          recordType: 'ActiveCaloriesBurned',
          startTime: startISO,
          endTime: endISO,
          energy: { unit: 'kilocalories', value: kcal },
        },
      ]);
      return true;
    } catch (_) { return false; }
  }

  return false;
}

// ─── Per-user last-import window ──────────────────────────────────────

/**
 * Returns the timestamp (ms) of the last successful import for this
 * user. Defaults to 0 (= "pull everything").
 */
export async function getLastImportMs(userId) {
  if (!userId) return 0;
  try {
    const raw = await AsyncStorage.getItem(LAST_IMPORT_KEY_PFX + userId);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch (_) { return 0; }
}

export async function setLastImportMs(userId, ms) {
  if (!userId) return;
  try { await AsyncStorage.setItem(LAST_IMPORT_KEY_PFX + userId, String(ms)); }
  catch (_) {}
}

// ─── Convenience: import new weight readings into Volyume ─────────────

/**
 * Pulls new weight samples from Health since the last import, writes
 * them into Volyume's morning_weights table, and updates the cursor.
 *
 * Returns { imported, latestMs } so callers can show a toast or
 * surface the result on the Settings screen.
 *
 * Safe to call from foreground listeners and Settings "Sync now":
 * never throws, silently no-ops if permission isn't granted.
 */
export async function importNewWeights(userId) {
  if (!userId) return { imported: 0, latestMs: 0 };
  const status = await getHealthPermissionStatus(['weight']);
  if (status !== 'granted') return { imported: 0, latestMs: 0 };

  const sinceMs = await getLastImportMs(userId);
  const samples = await readWeightsSince(sinceMs);
  if (!samples?.length) return { imported: 0, latestMs: sinceMs };

  // Local import, keep this lazy so health.js isn't a hard dep of
  // database.js at module load.
  let logMorningWeight = null;
  try {
    // eslint-disable-next-line global-require
    ({ logMorningWeight } = require('./database'));
  } catch (_) { return { imported: 0, latestMs: sinceMs }; }

  let imported = 0;
  let latestMs = sinceMs;
  for (const s of samples) {
    if (!s.weightKg || s.loggedAtMs <= sinceMs) continue;
    try {
      // logMorningWeight de-duplicates by day, so re-importing the same
      // morning's reading just updates the existing row.
      await logMorningWeight(userId, {
        weightKg: s.weightKg,
        loggedAt: s.loggedAtMs,
        notes: s.source ? `Imported from ${s.source}` : 'Imported from Health',
      });
      imported += 1;
      if (s.loggedAtMs > latestMs) latestMs = s.loggedAtMs;
    } catch (_) {
      // One bad row shouldn't break the import. Log and carry on so
      // subsequent samples still land.
      // eslint-disable-next-line global-require
      try { require('./errorLog').logWarn('health.importNewWeights', 'save failed', { error: 'one row' }); } catch (__) {}
    }
  }

  if (latestMs > sinceMs) await setLastImportMs(userId, latestMs);
  return { imported, latestMs };
}
