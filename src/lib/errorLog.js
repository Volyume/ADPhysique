/**
 * Verbose error logging, ring buffer in AsyncStorage so test users can
 * surface what went wrong off-device.
 *
 * Use cases:
 *   - logError(scope, error, ctx), catch handlers replace `.catch(() => {})`
 *   - logWarn(scope, msg, ctx)   , recoverable issues worth knowing about
 *   - logInfo(scope, msg, ctx)   , verbose milestone events (auth, plan
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

// Master verbose toggle (audit SC-6). Gated on the build channel: dev
// builds keep the info-level trail in the on-device buffer; production
// builds drop the info noise (warnings + errors stay on, and logInfo
// still feeds Sentry breadcrumbs either way). Jest sets __DEV__=true in
// jest.setup.js, so tests exercise the verbose path.
export const VERBOSE_LOGGING = typeof __DEV__ !== 'undefined' && !!__DEV__;

// Under Jest, async logError/logWarn/logInfo paths that resolve AFTER
// their test has ended hit a torn-down console wrapper and emit a
// "Cannot log after tests are done" warning. Jest's --ci flag treats
// this as a failure signal (exit 1) even when every assertion passes.
// The on-device buffer (pushEntry) + Sentry breadcrumb still fire so
// production observability is unchanged. Codex re-audit 2026-05-26
// F2-CI: 141 of these warnings were tripping the Main CI Jest job
// from a green-tests run.
const IS_JEST = typeof process !== 'undefined'
  && process.env
  && !!process.env.JEST_WORKER_ID;

import AsyncStorage from '@react-native-async-storage/async-storage';
// SC-7: the ring buffer reuses the LOCKED sentryScrub key patterns so the
// on-device redaction is at least as wide as the wire-to-Sentry scrub
// (kcal*/protein*/weight* etc. variants the exact-key list below misses).
// One source of truth; never duplicate the patterns here.
import { isSensitiveKey } from './observability/sentryScrub';

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
  // Auth secrets, every shape we've seen plus camelCase variants.
  'email', 'emailAddress', 'email_address',
  'password', 'pwd', 'passcode',
  'token', 'authToken', 'auth_token',
  'access_token', 'accessToken',
  'refresh_token', 'refreshToken',
  'session', 'sessionToken', 'session_token',
  'idToken', 'id_token', 'jwt', 'apiKey', 'api_key',
  // Body data
  'weight', 'weightKg', 'weight_kg', 'bodyWeight', 'bodyweight',
  'bodyFatPercent', 'body_fat_percent', 'bodyFat',
  'heightCm', 'height_cm', 'height',
  'dateOfBirth', 'date_of_birth', 'dob', 'birthDate', 'birthdate',
  'waistCm', 'chestCm', 'hipsCm', 'thighCm', 'armCm',
  'shouldersCm', 'forearmCm', 'hamCm', 'calfCm',
  'measurements',
  // Free text (workout notes, feedback messages)
  'notes', 'note', 'message',
  // Names
  'firstName', 'first_name', 'lastName', 'last_name', 'fullName', 'full_name',
]);

function redactPII(value, depth = 0) {
  if (depth > 4) return '[deep]';
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(v => redactPII(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    // Exact-key list (auth secrets, free text) PLUS the locked sentryScrub
    // regexes (SC-7) so key VARIANTS (kcalTarget, protein_g, weight_kg_avg,
    // …) are caught here exactly as they are on the wire to Sentry.
    if (PII_KEYS.has(k) || isSensitiveKey(k)) out[k] = v == null ? null : '[redacted]';
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

function stripAnsi(s) {
  return String(s || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function sanitizeStack(stack) {
  if (!stack) return '';
  const out = [];
  for (const line of String(stack).split('\n')) {
    const clean = stripAnsi(line);
    // Jest/Babel can inject source-frame lines into Error.stack. Those
    // lines may include literal test/user values, so keep call frames
    // but drop code excerpts before the debug log becomes exportable.
    if (/^\s*>?\s*\d+\s*\|/.test(clean)) continue;
    if (/^\s*\|/.test(clean)) continue;
    out.push(line);
  }
  return out.join('\n').slice(0, MAX_STACK);
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
    stack: isError && errOrMsg.stack ? sanitizeStack(errOrMsg.stack) : '',
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
  const safeContext = redactPII(context);
  const entry = buildEntry('error', scope, error, safeContext);
  // eslint-disable-next-line no-console
  if (typeof console !== 'undefined' && console.error && !IS_JEST) {
    console.error(`[${entry.scope}]`, entry.message, safeContext || '');
  }
  pushEntry(entry).catch(() => {});
  // Forward to Sentry. Use the same redacted context so the broader
  // PII_KEYS list defined here applies on both the local ring buffer
  // AND the wire to Sentry. Without this Sentry would receive the raw
  // tokens, body weights, and notes that the local buffer scrubs.
  try { _sentry()?.captureError(error ?? new Error(entry.message), { scope, extra: { context: safeContext } }); } catch (_) {}
  return entry;
}

export function logWarn(scope, message, context) {
  const safeContext = redactPII(context);
  const entry = buildEntry('warn', scope, message, safeContext);
  if (typeof console !== 'undefined' && console.warn && !IS_JEST) {
    console.warn(`[${entry.scope}]`, entry.message, safeContext || '');
  }
  pushEntry(entry).catch(() => {});
  try { _sentry()?.captureWarning(entry.message, { scope, extra: { context: safeContext } }); } catch (_) {}
  return entry;
}

export function logInfo(scope, message, context) {
  const safeContext = redactPII(context);
  // Gated by VERBOSE_LOGGING for the on-device buffer. Even when off,
  // we forward to Sentry as a breadcrumb so the run-up to an error is
  // visible in the issue detail view, breadcrumbs are cheap (no event
  // created on their own, only attached to subsequent errors).
  if (VERBOSE_LOGGING) {
    const entry = buildEntry('info', scope, message, safeContext);
    // Console direct write gated by IS_JEST (declared at file top).
    // Async log paths can resolve after Jest tears down the console
    // wrapper; the post-teardown warning is what --ci was treating
    // as a failure signal. pushEntry + Sentry breadcrumb still fire.
    if (typeof console !== 'undefined' && console.log && !IS_JEST) {
      console.log(`[${entry.scope}]`, entry.message, safeContext || '');
    }
    pushEntry(entry).catch(() => {});
    try { _sentry()?.addBreadcrumb(entry.message, { scope, extra: { context: safeContext } }); } catch (_) {}
    return entry;
  }
  // Quiet mode (post-beta) still feeds Sentry breadcrumbs, almost free.
  try { _sentry()?.addBreadcrumb(message, { scope, extra: { context: safeContext } }); } catch (_) {}
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

// Cloud shipping is now handled by Sentry (see src/lib/sentry.js)
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

  // Unhandled promise rejections, RN private but stable for years.
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
  } catch (_) { /* tracking unavailable, fine */ }
}
