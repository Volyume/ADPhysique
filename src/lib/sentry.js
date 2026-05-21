// Sentry wrapper — lazy-loaded so the app keeps building and running
// even before @sentry/react-native is installed. Once you've added
// the package and set EXPO_PUBLIC_SENTRY_DSN, initSentry() does the
// real wiring; until then every call is a no-op.
//
// This file is the only place that talks to Sentry directly. The rest
// of the codebase calls into errorLog.js, which forwards to here. That
// way the on-device ring buffer (Settings → Debug logs) and Sentry
// receive the same events, and we can swap Sentry out without touching
// every call site.
//
// Why so cautious about the import? @sentry/react-native depends on
// native modules. If the package is missing, calling its functions
// throws synchronously. Wrapping the import in try/catch and exposing
// no-ops means the JS bundle keeps loading and the app keeps running
// during the transition between "no Sentry" and "Sentry installed".

let SentryNative = null;
let initialised = false;

try {
  // eslint-disable-next-line global-require, import/no-unresolved
  SentryNative = require('@sentry/react-native');
} catch (_) {
  // Package not installed yet — that's fine. All calls below no-op.
}

export function isSentryAvailable() {
  return SentryNative != null;
}

/**
 * Initialise the Sentry SDK. Safe to call multiple times — guards
 * against double-init. No-op if the package isn't installed or the
 * DSN env var is missing.
 *
 * Call once at app startup (App.js). Pass `release` so errors can be
 * grouped by app version and "regression after release" alerts work.
 */
export function initSentry({ release, environment } = {}) {
  if (!SentryNative || initialised) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    SentryNative.init({
      dsn,
      release: release ?? undefined,
      environment: environment ?? (__DEV__ ? 'development' : 'production'),
      // Sample 100% of errors during beta; can be turned down later
      // to save quota once we're at scale.
      tracesSampleRate: 0,
      // Sentry has its own offline buffering — if the device is offline
      // when an error fires, the SDK queues and ships on next launch.
      enableAutoSessionTracking: true,
      // Avoid double-reporting: we forward warn/error from errorLog.js
      // explicitly; disable the SDK's own breadcrumb collection of
      // console messages so we don't get noise from logInfo calls.
      attachStacktrace: true,
    });
    initialised = true;
  } catch (_) {
    // SDK init can throw on missing native modules in some builds.
    // Treat as "not available" rather than crashing the app.
    SentryNative = null;
  }
}

/**
 * Tag the current session with a user identity so issues are
 * searchable by user. Call after sign-in (and on auth state changes).
 * Pass null to clear (call on sign-out).
 */
export function setSentryUser(user) {
  if (!SentryNative || !initialised) return;
  try {
    if (!user) {
      SentryNative.setUser(null);
      return;
    }
    SentryNative.setUser({
      id: user.id,
      email: user.email,
      // Don't add username / ip — keeps PII surface small.
    });
  } catch (_) {}
}

/**
 * Forward an error to Sentry. errorLog.logError → captureError.
 *
 * @param {Error|unknown} error    Error instance or anything throwable
 * @param {Object}  ctx            Optional structured context
 * @param {string}  ctx.scope      Logical scope (e.g. 'ProUpgrade.activatePro')
 * @param {Object}  ctx.extra      Arbitrary key/value extras
 * @param {Object}  ctx.tags       Search-friendly tags (low cardinality)
 */
export function captureError(error, ctx = {}) {
  if (!SentryNative || !initialised) return;
  try {
    SentryNative.withScope((scope) => {
      if (ctx.scope) scope.setTag('scope', ctx.scope);
      if (ctx.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, String(v));
      }
      if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      SentryNative.captureException(error);
    });
  } catch (_) {}
}

/**
 * Forward a warning-level event. errorLog.logWarn → captureWarning.
 * Use this for "something's not right but we recovered" cases.
 */
export function captureWarning(message, ctx = {}) {
  if (!SentryNative || !initialised) return;
  try {
    SentryNative.withScope((scope) => {
      scope.setLevel('warning');
      if (ctx.scope) scope.setTag('scope', ctx.scope);
      if (ctx.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, String(v));
      }
      if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      SentryNative.captureMessage(message);
    });
  } catch (_) {}
}

/**
 * Add a breadcrumb (low-priority crumb of context that's attached to
 * the next error). errorLog.logInfo → addBreadcrumb. Doesn't create
 * a Sentry event on its own; only enriches subsequent errors.
 */
export function addBreadcrumb(message, ctx = {}) {
  if (!SentryNative || !initialised) return;
  try {
    SentryNative.addBreadcrumb({
      message,
      category: ctx.scope ?? 'app',
      level: 'info',
      data: ctx.extra ?? undefined,
    });
  } catch (_) {}
}
