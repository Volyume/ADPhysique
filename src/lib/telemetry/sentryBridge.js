/**
 * Mirrors every telemetry event as a Sentry breadcrumb so it shows
 * up in crash context. Spec: TELEMETRY_DASHBOARDS_LOCKED.md
 * "Events sent to: Sentry as breadcrumbs (for crash context)".
 *
 * The Sentry SDK is only initialised in real builds with a DSN; on
 * dev / tests / when DSN is missing, addBreadcrumb is a no-op.
 */

let _Sentry = null;
function getSentry() {
  if (_Sentry !== null) return _Sentry;
  try {
    // eslint-disable-next-line global-require
    _Sentry = require('@sentry/react-native');
  } catch (_) {
    _Sentry = false;
  }
  return _Sentry || null;
}

export function mirrorAsBreadcrumb(event, payload = null) {
  const Sentry = getSentry();
  if (!Sentry || typeof Sentry.addBreadcrumb !== 'function') return;
  try {
    Sentry.addBreadcrumb({
      category: 'telemetry',
      type: 'info',
      message: event,
      level: 'info',
      data: payload ?? undefined,
    });
  } catch (_) { /* tolerate */ }
}
