// Sentry wrapper, lazy-loaded so the app keeps building and running
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

import { scrubEvent, scrubBreadcrumb } from './observability/sentryScrub';

let SentryNative = null;
let initialised = false;

try {
  // eslint-disable-next-line global-require, import/no-unresolved
  SentryNative = require('@sentry/react-native');
} catch (_) {
  // Package not installed yet, that's fine. All calls below no-op.
}

export function isSentryAvailable() {
  return SentryNative != null;
}

/**
 * Initialise the Sentry SDK. Safe to call multiple times, guards
 * against double-init. No-op if the package isn't installed or the
 * DSN env var is missing.
 *
 * Call once at app startup (App.js).
 *
 * Release/dist are deliberately NOT set here: the @sentry/react-native/expo
 * plugin uploads source maps tagged with the SDK's auto-detected release
 * (bundleId@version+build) and dist (the native build number). Setting a
 * custom `release` here (and no `dist`) made events arrive under a name that
 * did not match the uploaded artifacts, so Sentry could not symbolicate and
 * every production stack trace came back minified. Leaving them unset lets the
 * SDK auto-detect both, so events line up with the maps and traces resolve.
 */
export function initSentry({ environment } = {}) {
  if (!SentryNative || initialised) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  // Validate the DSN format in JS BEFORE handing it to the native SDK.
  // sentry-android continues init on a background thread after
  // SentryNative.init() returns; a malformed DSN throws a Java
  // exception on that thread which JS try/catch cannot catch and which
  // kills the process before any handler is registered. The symptom is
  // a splash flash then immediate close, with no JS log, no tombstone
  // and no Sentry event. Reject obviously bad DSNs here so the app
  // still launches; the only cost is no error reporting until the DSN
  // is fixed.
  // Expected shape: https://<publicKey>@<host>/<projectId>
  // Self-hosted Sentry instances are allowed http for local-network use.
  // Trim first: env vars routinely pick up a trailing newline from
  // shell heredocs and CI secret injection, and the native parser
  // treats that as a malformed value.
  const trimmed = dsn.trim();
  const DSN_PATTERN = /^https?:\/\/[^@\s/]+@[^/\s]+\/\d+$/;
  if (!DSN_PATTERN.test(trimmed)) return;

  try {
    SentryNative.init({
      dsn: trimmed,
      // release + dist auto-detected (see the note above) so events match the
      // plugin-uploaded source maps and stack traces symbolicate.
      environment: environment ?? (__DEV__ ? 'development' : 'production'),
      // The observability layer emits a breadcrumb per screen change, user
      // action, store action and DB query, so a busy session generates plenty.
      // The SDK default (100) can evict early crumbs before a late crash; 150
      // keeps a longer trail at negligible cost.
      maxBreadcrumbs: 150,
      // 5% performance trace sampling in production. At the 100k-user
      // target, every foreground / screen mount / sync is a candidate
      // transaction, so even a few percent is plenty to surface slow
      // paths without burning the Sentry quota. Raise it temporarily
      // when chasing a specific perf regression. In dev we sample 100%
      // so local profiling is always visible.
      tracesSampleRate: __DEV__ ? 1.0 : 0.05,
      // Sentry's own session tracking, counts crash-free sessions
      // and users per release. Required for the release-health
      // dashboard view to populate.
      enableAutoSessionTracking: true,
      attachStacktrace: true,
      // beforeSend is Sentry's last-chance hook to mutate an event
      // before it leaves the device. We use it to:
      //   1. Strip known PII keys from extra context (observability
      //      already redacts most callers but this is a belt-and-
      //      braces defence for direct Sentry calls or third-party
      //      breadcrumbs).
      //   2. Drop events tagged "drop" by the caller (used to
      //      suppress duplicate or noisy patterns).
      beforeSend: (event) => {
        try { return scrubEvent(event); }
        catch (_) { return event; }
      },
      beforeBreadcrumb: (crumb) => {
        try { return scrubBreadcrumb(crumb); }
        catch (_) { return crumb; }
      },
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
      // Don't add username / ip, keeps PII surface small.
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

// PII / sensitive-data redaction lives in src/lib/observability/sentryScrub.js
// per PRIVACY_CONSENT_LOCKED.md line 282. This file imports `scrubEvent`
// and `scrubBreadcrumb` and wires them into Sentry's beforeSend +
// beforeBreadcrumb hooks above. Audit tests live in
// src/lib/__tests__/sentryScrub.test.js.
