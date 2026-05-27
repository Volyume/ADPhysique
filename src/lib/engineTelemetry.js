/**
 * engineTelemetry.js (Move #3)
 *
 * Local-first event log for the cohort dashboard. Events get written
 * to the SQLite engine_telemetry table immediately so they survive
 * an offline period, then a debounced background flusher pushes the
 * unpushed rows to Supabase via the record_engine_telemetry RPC.
 *
 * The same allow-list is enforced server-side in the RPC, so a typo
 * in a client call surfaces as a thrown PostgrestError on push (not
 * silently dropped).
 *
 * Canonical event allow-list lives at `lib/telemetry/events.js`. This
 * file is the queue + push implementation that `lib/telemetry/transport.js`
 * delegates to; future cleanup is to fold the queue logic directly
 * into the telemetry/ module per its index.js header note.
 */

import { getSupabaseClient } from './supabase';
import {
  recordEngineTelemetry as dbRecord,
  getUnpushedEngineTelemetry,
  markEngineTelemetryPushed,
} from './database';
import { logWarn } from './errorLog';
import { ALLOWED_EVENTS } from './telemetry/events';

let _flushTimer = null;
const FLUSH_DEBOUNCE_MS = 5000;

/**
 * Record a telemetry event. Writes locally first (always succeeds
 * when the DB is up), then schedules a debounced push to Supabase.
 * Callers do not need to await the push.
 */
export async function track(userId, event, payload = null) {
  if (!userId || !event) return null;
  if (!ALLOWED_EVENTS.has(event)) {
    // Hard fail in dev so a typo doesn't sit dark in production.
    // eslint-disable-next-line no-console
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(`[engineTelemetry] unknown event "${event}" -- check the allow-list`);
    }
    return null;
  }
  const id = await dbRecord(userId, event, payload).catch((e) => {
    logWarn('engineTelemetry.track.persist', e?.message ?? 'unknown', { event });
    return null;
  });
  _scheduleFlush();
  return id;
}

function _scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flushPendingTelemetry().catch(() => {});
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * Push everything that hasn't shipped yet. Called by the debounced
 * timer and also exposed directly so app startup / sign-in flows can
 * drain immediately.
 */
export async function flushPendingTelemetry() {
  const sb = getSupabaseClient();
  if (!sb) return { pushed: 0, skipped: 'no_client' };
  const rows = await getUnpushedEngineTelemetry(200);
  if (!rows.length) return { pushed: 0 };

  const pushedIds = [];
  for (const row of rows) {
    let payload = null;
    if (row.payload_json) {
      try { payload = JSON.parse(row.payload_json); } catch (_) { payload = null; }
    }
    const { error } = await sb.rpc('record_engine_telemetry', {
      _event: row.event,
      _payload: payload,
      _occurred_at: new Date(row.occurred_at).toISOString(),
    });
    if (error) {
      logWarn('engineTelemetry.flush.rpc', error.message ?? 'unknown', { event: row.event });
      // Skip this row; we'll retry on the next flush. Don't break
      // the loop -- a single bad row shouldn't block the rest.
      continue;
    }
    pushedIds.push(row.id);
  }
  if (pushedIds.length) await markEngineTelemetryPushed(pushedIds);
  return { pushed: pushedIds.length, total: rows.length };
}
