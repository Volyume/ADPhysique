/**
 * Back-compat shim. The queue + push implementation has moved to
 * `lib/telemetry/transport.js` (GAP_ANALYSIS row 13). Existing callers
 * importing `track` or `flushPendingTelemetry` from this path keep
 * working unchanged.
 *
 * New code should import from `lib/telemetry` (or
 * `lib/telemetry/transport`) directly.
 */

export { postEvent as track, flushPending as flushPendingTelemetry } from './telemetry/transport';
