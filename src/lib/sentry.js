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
  // Validate the DSN shape before handing it to the native SDK. The
  // JS-side try/catch below can't catch a Java exception thrown
  // async on the native init thread, and a malformed DSN crashes the
  // Android process before the first frame renders (flash + close,
  // no error reachable from JS, no Sentry event, no logcat tombstone).
  // Sentry DSNs are always https://<key>@<host>/<projectId>.
  // Anything else: log and skip init. App boots fine; errors just
  // don't get captured until the DSN is fixed.
  const DSN_PATTERN = /^https:\/\/[^@\s]+@[^/\s]+\/\d+$/;
  const trimmed = String(dsn).trim();
  if (!DSN_PATTERN.test(trimmed)) {
    // eslint-disable-next-line no-console
    console.warn(
      '[sentry] EXPO_PUBLIC_SENTRY_DSN does not look like a valid DSN '
      + '(expected https://<key>@<host>/<projectId>). Length: '
      + trimmed.length + '. Skipping init.',
    );
    return;
  }
  try {
    SentryNative.init({
      dsn: trimmed,
      release: release ?? undefined,
      environment: environment ?? (__DEV__ ? 'development' : 'production'),
      // 10% performance trace sampling in production — enough to
      // surface slow paths (sync, screen mount, large DB scans)
      // without burning quota at scale. In dev we sample 100% so
      // local profiling is always visible.
      tracesSampleRate: __DEV__ ? 1.0 : 0.1,
      // Sentry's own session tracking — counts crash-free sessions
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
        try { return _redactSentryEvent(event); }
        catch (_) { return event; }
      },
      beforeBreadcrumb: (crumb) => {
        try { return _redactBreadcrumb(crumb); }
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

// ─── PII redaction (Sentry side belt-and-braces) ────────────────────────
//
// observability.redactPII handles caller-side redaction. These hooks
// catch anything that reaches Sentry through other paths (direct
// Sentry SDK calls, native crash data, third-party libraries that
// register breadcrumbs). Same key list as observability.js — kept
// in sync because the two run independently.

const PII_KEYS = new Set([
  'email', 'firstName', 'lastName', 'fullName',
  'dateOfBirth', 'date_of_birth', 'birthDate',
  'weightKg', 'weight_kg', 'bodyWeight', 'body_weight',
  'heightCm', 'height_cm', 'bodyFatPercent', 'body_fat_percent',
  'phone', 'phoneNumber', 'address',
  'waistCm', 'waist_cm', 'chestCm', 'chest_cm',
  'hipsCm', 'hips_cm', 'thighCm', 'quads',
  'hamCm', 'hamstrings', 'calfCm', 'calves',
  'armCm', 'arms', 'shouldersCm', 'shoulders',
  'forearmCm', 'forearms',
]);

function _redactObject(obj, depth = 0) {
  if (obj == null || depth > 5) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => _redactObject(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PII_KEYS.has(k)) out[k] = v == null ? null : '[redacted]';
    else out[k] = _redactObject(v, depth + 1);
  }
  return out;
}

function _redactSentryEvent(event) {
  if (!event) return event;
  if (event.extra) event.extra = _redactObject(event.extra);
  if (event.contexts) event.contexts = _redactObject(event.contexts);
  if (event.tags) event.tags = _redactObject(event.tags);
  // User identity: keep id (low-risk, opaque uuid) but redact email.
  // The Sentry "user" panel shows the id alone; email is what we
  // don't want shipped at all even though Sentry has its own PII
  // controls.
  if (event.user) {
    const { id } = event.user;
    event.user = { id };
  }
  // Breadcrumbs nested inside the event payload also need
  // recursing — they sometimes carry context the observability
  // layer didn't redact (e.g. console messages with raw values).
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map(_redactBreadcrumb);
  }
  return event;
}

function _redactBreadcrumb(crumb) {
  if (!crumb) return crumb;
  if (crumb.data) crumb.data = _redactObject(crumb.data);
  return crumb;
}
