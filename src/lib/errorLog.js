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

// Keys whose values should never land in the on-device ring buffer. The
// buffer is exportable by the user via Settings → Debug Logs → Share,
// so anything sensitive that reaches it is effectively shared. Same list
// as src/lib/sentry.js#PII_KEYS but applied caller-side here too.
const PII_KEYS = new Set([
  'email', 'password', 'token', 'access_token', 'refresh_token', 'session',
  'weight', 'weightKg', 'weight_kg', 'bodyWeight', 'bodyweight',
  'bodyFatPercent', 'body_fat_percent', 'bodyFat',
  'heightCm', 'height_cm', 'height',
  'dateOfBirth', 'date_of_birth', 'dob', 'birthDate',
  'waistCm', 'chestCm', 'hipsCm', 'thighCm', 'armCm',
  'shouldersCm', 'forearmCm', 'hamCm', 'calfCm',
  'notes', 'note', 'message',
  'firstName', 'first_name', 'lastName', 'last_name',
]);

function redactPII(value, depth = 0) {
  if (depth > 4) return '[deep]';
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(v => redactPII(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (PII_KEYS.has(k)) out[k] = v == null ? null : '[redacted]';
    else out[k] = redactPII(v, depth + 1);
  }
  return out;
}

function safeStringify(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.slice(0, MAX_MSG);
  // Redact PII keys recursively before stringifying. The buffer can be
  // exported by the user, so workout notes, body weights, emails etc.
  // must not land in it verbatim.
  try { return JSON.stringify(redactPII(v)).slice(0, MAX_MSG); }
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

// Lazy require so we don't pull sentry.js into modules that import
// errorLog purely for its types (jest setup, etc.). The wrapper is
// safe even if @sentry/react-native isn't installed.
function _sentry() {
  try { return require('./sentry'); } catch (_) { return null; }
}

export function logError(scope, error, context) {
  const entry = buildEntry('error', scope, error, context);
  // eslint-disable-next-line no-console
  if (typeof console !== 'undefined' && console.error) {
    console.error(`[${entry.scope}]`, entry.message, context || '');
  }
  pushEntry(entry).catch(() => {});
  // Forward to Sentry — handles its own dedup, source-map symbolication,
  // alerting. Wrap in try/catch so a Sentry SDK problem can never break
  // an error log call.
  try { _sentry()?.captureError(error ?? new Error(entry.message), { scope, extra: { context } }); } catch (_) {}
  return entry;
}

export function logWarn(scope, message, context) {
  const entry = buildEntry('warn', scope, message, context);
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[${entry.scope}]`, entry.message, context || '');
  }
  pushEntry(entry).catch(() => {});
  try { _sentry()?.captureWarning(entry.message, { scope, extra: { context } }); } catch (_) {}
  return entry;
}

export function logInfo(scope, message, context) {
  // Gated by VERBOSE_LOGGING for the on-device buffer. Even when off,
  // we forward to Sentry as a breadcrumb so the run-up to an error is
  // visible in the issue detail view — breadcrumbs are cheap (no event
  // created on their own, only attached to subsequent errors).
  if (VERBOSE_LOGGING) {
    const entry = buildEntry('info', scope, message, context);
    if (typeof console !== 'undefined' && console.log) {
      console.log(`[${entry.scope}]`, entry.message, context || '');
    }
    pushEntry(entry).catch(() => {});
    try { _sentry()?.addBreadcrumb(entry.message, { scope, extra: { context } }); } catch (_) {}
    return entry;
  }
  // Quiet mode (post-beta) still feeds Sentry breadcrumbs — almost free.
  try { _sentry()?.addBreadcrumb(message, { scope, extra: { context } }); } catch (_) {}
  return null;
}

export async function getRecentErrors(limit = MAX_ENTRIES) {
  const buf = await loadBuffer();
  return buf.slice(0, limit);
}

export async function clearErrors() {
  memBuffer = [];
  try { await AsyncStorage.removeItem(LOG_KEY); } catch (_) {}
}

// Cloud shipping is now handled by Sentry (see src/lib/sentry.js) —
// the local ring buffer above is retained for on-device viewing in
// Settings → Debug logs. Removed: flushDebugLogs, shouldShipDebugLogs,
// setShipDebugLogs, getLastFlushOutcome, the watermark + ship-pref
// AsyncStorage keys, and the per-session memo for upload failures.
// The debug_log_uploads Supabase table is no longer touched.

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
