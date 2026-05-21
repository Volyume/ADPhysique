/**
 * Verbose error logging — ring buffer in AsyncStorage so test users can
 * surface what went wrong off-device.
 *
 * Use cases:
 *   - logError(scope, error, ctx) — catch handlers replace `.catch(() => {})`
 *   - logWarn(scope, msg, ctx)    — recoverable issues worth knowing about
 *   - logInfo(scope, msg, ctx)    — verbose milestone events (auth, plan
 *     gen, set saves, etc.). Persists during beta so testers' traces
 *     are recoverable; gated by VERBOSE_LOGGING. Flip the constant to
 *     false to quiet things down before public release.
 *
 * Buffer keeps last MAX_ENTRIES entries (most recent first).
 * Viewable on-device via DebugLogScreen (Settings → Debug logs).
 *
 * Coexists with the existing single-slot @volyume_crash_log so the
 * LoginScreen banner continues to work.
 */

// Master verbose toggle. True during beta so info-level events ship to
// the on-device buffer and via flushDebugLogs to the cloud. Set to false
// before public release to drop the info noise; warnings + errors stay on.
export const VERBOSE_LOGGING = true;
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = '@volyume_error_log_v1';
const CRASH_LOG_KEY = '@volyume_crash_log';
const MAX_ENTRIES = 200;
const MAX_STACK = 1800;
const MAX_MSG = 600;

let memBuffer = null;
let loadingPromise = null;

function safeStringify(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.slice(0, MAX_MSG);
  try { return JSON.stringify(v).slice(0, MAX_MSG); }
  catch (_) { return String(v).slice(0, MAX_MSG); }
}

function buildEntry(level, scope, errOrMsg, context) {
  const isError = errOrMsg && typeof errOrMsg === 'object' && (errOrMsg.stack || errOrMsg.message);
  return {
    ts: Date.now(),
    level,
    scope: String(scope || 'app').slice(0, 80),
    message: isError
      ? String(errOrMsg.message || errOrMsg).slice(0, MAX_MSG)
      : safeStringify(errOrMsg),
    stack: isError && errOrMsg.stack ? String(errOrMsg.stack).slice(0, MAX_STACK) : '',
    context: context ? safeStringify(context) : '',
  };
}

async function loadBuffer() {
  if (memBuffer) return memBuffer;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(LOG_KEY);
      memBuffer = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(memBuffer)) memBuffer = [];
    } catch (_) {
      memBuffer = [];
    }
    loadingPromise = null;
    return memBuffer;
  })();
  return loadingPromise;
}

let pendingWriteTimer = null;
async function persistDebounced() {
  if (pendingWriteTimer) return;
  pendingWriteTimer = setTimeout(async () => {
    pendingWriteTimer = null;
    try { await AsyncStorage.setItem(LOG_KEY, JSON.stringify(memBuffer || [])); }
    catch (_) { /* can't log a failure to log */ }
  }, 200);
}

async function pushEntry(entry) {
  const buf = await loadBuffer();
  buf.unshift(entry);
  if (buf.length > MAX_ENTRIES) buf.length = MAX_ENTRIES;
  memBuffer = buf;
  persistDebounced();
}

export function logError(scope, error, context) {
  const entry = buildEntry('error', scope, error, context);
  // eslint-disable-next-line no-console
  if (typeof console !== 'undefined' && console.error) {
    console.error(`[${entry.scope}]`, entry.message, context || '');
  }
  pushEntry(entry).catch(() => {});
  return entry;
}

export function logWarn(scope, message, context) {
  const entry = buildEntry('warn', scope, message, context);
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[${entry.scope}]`, entry.message, context || '');
  }
  pushEntry(entry).catch(() => {});
  return entry;
}

export function logInfo(scope, message, context) {
  // Gated by VERBOSE_LOGGING so we can quiet the buffer for public
  // release in one place. During beta this fires and ships.
  if (!VERBOSE_LOGGING) return;
  const entry = buildEntry('info', scope, message, context);
  if (typeof console !== 'undefined' && console.log) {
    console.log(`[${entry.scope}]`, entry.message, context || '');
  }
  pushEntry(entry).catch(() => {});
  return entry;
}

export async function getRecentErrors(limit = MAX_ENTRIES) {
  const buf = await loadBuffer();
  return buf.slice(0, limit);
}

export async function clearErrors() {
  memBuffer = [];
  try { await AsyncStorage.removeItem(LOG_KEY); } catch (_) {}
}

// ─── Cloud shipping (beta diagnostics) ────────────────────────────────────
//
// Drains the on-device ring buffer to the Supabase `debug_log_uploads`
// table so beta failures show up in your dashboard for analysis. Tracks
// an upload watermark so we never re-ship the same entry twice.
//
// Called from:
//   - App.js AppState 'active' handler (after foreground sync)
//   - Settings → Diagnostics → "Send logs to support" (manual)
//
// Honours an opt-out preference: if `@volyume_a11y_prefs` has
// shipDebugLogs=false, this is a no-op. Defaulted to on for beta.

const UPLOAD_WATERMARK_KEY = '@volyume_log_upload_watermark';
const SHIP_PREF_KEY = '@volyume_ship_debug_logs';
const MAX_BATCH = 50;

export async function shouldShipDebugLogs() {
  try {
    const pref = await AsyncStorage.getItem(SHIP_PREF_KEY);
    if (pref == null) return true;          // default on for beta
    return pref !== 'false';
  } catch (_) { return true; }
}

export async function setShipDebugLogs(enabled) {
  try { await AsyncStorage.setItem(SHIP_PREF_KEY, enabled ? 'true' : 'false'); }
  catch (_) {}
}

// Per-session memo so we don't spam the buffer with the same upload
// failure on every AppState foreground — table-doesn't-exist or RLS
// rejection won't fix itself between foregrounds, no point logging it
// 50 times. Records the first failure, then stays quiet until success.
let lastFlushOutcome = null;

export async function flushDebugLogs(supabaseClient, { force = false, userId = null, deviceId = null, appVersion = null, platform = null } = {}) {
  if (!supabaseClient) return { sent: 0, skipped: 'no-client' };
  if (!force && !(await shouldShipDebugLogs())) return { sent: 0, skipped: 'opted-out' };

  const buf = await loadBuffer();
  if (!buf.length) return { sent: 0, skipped: 'empty' };

  let watermark = 0;
  try {
    const raw = await AsyncStorage.getItem(UPLOAD_WATERMARK_KEY);
    if (raw) watermark = parseInt(raw, 10) || 0;
  } catch (_) {}

  // Buffer is newest-first; pick entries with ts > watermark.
  const newEntries = buf.filter(e => (e.ts ?? 0) > watermark).slice(0, MAX_BATCH);
  if (!newEntries.length) return { sent: 0, skipped: 'caught-up' };

  // Generate a UUID id per row so Supabase accepts the TEXT PK.
  function uid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // The cloud `context` column is TEXT. Stringify objects so PostgREST
  // accepts them — previously we shipped the raw object which Supabase
  // either rejected or silently dropped depending on version, killing
  // the whole batch insert.
  function safeStringify(value) {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  }
  const rows = newEntries.map(e => ({
    id: uid(),
    user_id: userId || null,
    device_id: deviceId || null,
    ts: e.ts,
    level: e.level,
    scope: e.scope,
    message: e.message,
    stack: e.stack || null,
    context: safeStringify(e.context),
    app_version: appVersion || null,
    platform: platform || null,
  }));

  try {
    const { error } = await supabaseClient.from('debug_log_uploads').insert(rows);
    if (error) {
      // Log the first failure of the session so the on-device buffer has
      // evidence that uploads aren't reaching Supabase. We deliberately
      // write directly to console (not pushEntry) so the buffer doesn't
      // get a recursive flush failure entry that itself tries to upload.
      if (lastFlushOutcome?.error !== error.message) {
        lastFlushOutcome = { ts: Date.now(), error: error.message, rows: rows.length };
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[errorLog.flushDebugLogs] insert failed:', error.message, '— would have shipped', rows.length, 'rows');
        }
      }
      return { sent: 0, error: error.message };
    }
    // Advance the watermark to the newest entry we just shipped.
    const newest = Math.max(...newEntries.map(e => e.ts ?? 0));
    try { await AsyncStorage.setItem(UPLOAD_WATERMARK_KEY, String(newest)); } catch (_) {}
    lastFlushOutcome = { ts: Date.now(), sent: rows.length };
    if (typeof console !== 'undefined' && console.log) {
      console.log('[errorLog.flushDebugLogs] shipped', rows.length, 'rows up to ts', newest);
    }
    return { sent: rows.length };
  } catch (e) {
    if (lastFlushOutcome?.error !== e?.message) {
      lastFlushOutcome = { ts: Date.now(), error: e?.message ?? 'upload failed', rows: rows.length };
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[errorLog.flushDebugLogs] threw:', e?.message);
      }
    }
    return { sent: 0, error: e?.message ?? 'upload failed' };
  }
}

// Exposes the most recent flush outcome so DebugLogScreen can show it.
// Returns null until the first flush attempt of the session.
export function getLastFlushOutcome() {
  return lastFlushOutcome;
}

export async function exportErrorsAsText() {
  const buf = await loadBuffer();
  if (!buf.length) return 'No errors logged.';
  return buf.map((e) => {
    const when = new Date(e.ts).toISOString();
    const lines = [
      `[${when}] ${e.level.toUpperCase()} ${e.scope}`,
      `  ${e.message}`,
    ];
    if (e.context) lines.push(`  ctx: ${e.context}`);
    if (e.stack) lines.push(`  ${e.stack.split('\n').slice(0, 6).join('\n  ')}`);
    return lines.join('\n');
  }).join('\n\n');
}

export async function getCrashLog() {
  try {
    const raw = await AsyncStorage.getItem(CRASH_LOG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export async function clearCrashLog() {
  try { await AsyncStorage.removeItem(CRASH_LOG_KEY); } catch (_) {}
}

/**
 * Install global handlers for uncaught JS exceptions and unhandled promise
 * rejections. Call once at app startup (App.js).
 *
 * Preserves any previously-installed handler so the existing crash UI
 * (LoginScreen banner) keeps working.
 */
export function installGlobalHandlers() {
  // Uncaught JS exceptions
  if (global.ErrorUtils && typeof global.ErrorUtils.setGlobalHandler === 'function') {
    const prev = global.ErrorUtils.getGlobalHandler && global.ErrorUtils.getGlobalHandler();
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      logError('global', error, { isFatal: !!isFatal });
      // Mirror to the legacy single-slot crash log so the LoginScreen banner
      // continues to surface the most recent fatal error.
      if (isFatal) {
        AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify({
          message: error?.message || String(error),
          stack: error?.stack?.slice(0, 1200) || '',
          isFatal: true,
          ts: Date.now(),
        })).catch(() => {});
      }
      if (prev) try { prev(error, isFatal); } catch (_) {}
    });
  }

  // Unhandled promise rejections — RN private but stable for years.
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    const tracking = require('react-native/Libraries/promiseRejectionTracking');
    if (tracking && typeof tracking.enable === 'function') {
      tracking.enable({
        allRejections: true,
        onUnhandled: (id, rejection) => {
          logError('unhandledRejection', rejection, { id });
        },
        onHandled: () => { /* no-op */ },
      });
    }
  } catch (_) { /* tracking unavailable — fine */ }
}
