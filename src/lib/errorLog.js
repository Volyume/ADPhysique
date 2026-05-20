/**
 * Verbose error logging — ring buffer in AsyncStorage so test users can
 * surface what went wrong off-device.
 *
 * Use cases:
 *   - logError(scope, error, ctx) — catch handlers replace `.catch(() => {})`
 *   - logWarn(scope, msg, ctx)    — recoverable issues worth knowing about
 *   - logInfo(scope, msg, ctx)    — DEV only; production no-ops to save space
 *
 * Buffer keeps last MAX_ENTRIES entries (most recent first).
 * Viewable on-device via DebugLogScreen (Settings → Debug logs).
 *
 * Coexists with the existing single-slot @volyume_crash_log so the
 * LoginScreen banner continues to work.
 */
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
  if (!__DEV__) return;
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
