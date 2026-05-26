/**
 * Telemetry transport: validates against the canonical allow-list
 * in events.js, then delegates to the existing engineTelemetry
 * batched-push implementation. This module is the spec-compliant
 * surface; engineTelemetry.js will eventually fold under it.
 *
 * Keeping the delegation pattern preserves the current behaviour
 * (local SQLite write + debounced push via record_engine_telemetry
 * RPC) without re-implementing the queue in a parallel file.
 */

import { ALLOWED_EVENTS } from './events';
import { logWarn } from '../errorLog';

let _engineTelemetry = null;
function getEngine() {
  if (_engineTelemetry) return _engineTelemetry;
  // eslint-disable-next-line global-require
  _engineTelemetry = require('../engineTelemetry');
  return _engineTelemetry;
}

/**
 * Validate + persist + queue-push. Returns true if the event
 * passed validation; throws never.
 */
export async function postEvent(userId, event, payload = null) {
  if (!ALLOWED_EVENTS.has(event)) {
    logWarn('telemetry.transport.unknownEvent', { event });
    return false;
  }
  try {
    const engine = getEngine();
    await engine.track(userId, event, payload);
    return true;
  } catch (e) {
    logWarn('telemetry.transport.trackFailed', { event, message: String(e?.message ?? e) });
    return false;
  }
}

export async function flushPending() {
  try {
    const engine = getEngine();
    await engine.flushPendingTelemetry();
  } catch (_) { /* tolerate */ }
}
