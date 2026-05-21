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
 * (privacy by design), so a successful init is treated as granted.
 */
export async function requestHealthPermissions(scopes = ['weight']) {
  if (!isHealthAvailable()) return 'unavailable';

  if (Platform.OS === 'ios') {
    const HK = getIosModule();
    const Constants = HK.Constants;
    const reads = [];
    if (scopes.includes('weight')) reads.push(Constants.Permissions.Weight);
    const perms = { permissions: { read: reads, write: [] } };
    const ok = await _ensureIosInited(perms);
    return ok ? 'granted' : 'denied';
  }

  if (Platform.OS === 'android') {
    const HC = getAndroidModule();
    try {
      const initialised = await HC.initialize();
      if (!initialised) return 'unavailable';
      const recordTypes = [];
      if (scopes.includes('weight')) recordTypes.push({ accessType: 'read', recordType: 'Weight' });
      const granted = await HC.requestPermission(recordTypes);
      const allGranted = Array.isArray(granted) && granted.length >= recordTypes.length;
      return allGranted ? 'granted' : 'denied';
    } catch (_) { return 'denied'; }
  }

  return 'unavailable';
}

/**
 * Check status without prompting. Returns 'granted' | 'denied' |
 * 'unavailable'. Useful for rendering the Settings toggle state.
 */
export async function getHealthPermissionStatus(scopes = ['weight']) {
  if (!isHealthAvailable()) return 'unavailable';

  if (Platform.OS === 'ios') {
    // HealthKit doesn't expose read auth status (intentional privacy
    // design from Apple). Treat a successful prior init as granted.
    return _iosInited ? 'granted' : 'denied';
  }

  if (Platform.OS === 'android') {
    const HC = getAndroidModule();
    try {
      await HC.initialize();
      const granted = await HC.getGrantedPermissions();
      const want = scopes.includes('weight');
      const hasWeight = granted?.some?.(p => p?.recordType === 'Weight' && p?.accessType === 'read');
      return want && hasWeight ? 'granted' : 'denied';
    } catch (_) { return 'denied'; }
  }

  return 'unavailable';
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

  // Local import — keep this lazy so health.js isn't a hard dep of
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
