/**
 * Public telemetry API per TELEMETRY_DASHBOARDS_LOCKED.md lines
 * 310-315. The spec'd 4-file split:
 *
 *   index.js       , public API (this file)
 *   events.js      , canonical event names + deferral metadata
 *   transport.js   , validates + posts to Supabase
 *   sentryBridge.js, mirrors as Sentry breadcrumbs
 *
 * The legacy single-file src/lib/engineTelemetry.js stays in place
 * as the actual queue + push implementation; transport.js delegates
 * to it. Future PRs can fold engineTelemetry.js into this module
 * directly without re-plumbing callers.
 *
 * Surface:
 *   track(userId, event, payload)
 *     → validate, persist, queue-push, Sentry breadcrumb.
 *   flush()
 *     → drain the local queue immediately (used at app foreground).
 *
 * Existing imports of `track` from '../engineTelemetry' continue to
 * work. New code should import from '../telemetry' (or
 * '../telemetry/index').
 */

import { postEvent, flushPending } from './transport';
import { mirrorAsBreadcrumb } from './sentryBridge';

export async function track(userId, event, payload = null) {
  mirrorAsBreadcrumb(event, payload);
  return postEvent(userId, event, payload);
}

export async function flush() {
  return flushPending();
}

export { TELEMETRY_EVENTS, ALLOWED_EVENTS, isDeferred } from './events';
