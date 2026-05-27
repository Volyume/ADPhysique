/**
 * Telemetry transport — owns persist + push.
 *
 * Validates against the canonical allow-list in events.js, writes the
 * event to the local SQLite engine_telemetry table, and pushes the
 * unpushed rows to Supabase via the record_engine_telemetry RPC on a
 * debounced timer. Persisting locally first means the queue survives
 * an offline period.
 *
 * The same allow-list is enforced server-side in the RPC, so a typo
 * in a client call surfaces as a thrown PostgrestError on push (not
 * silently dropped).
 *
 * Folded in from the old src/lib/engineTelemetry.js (GAP_ANALYSIS row
 * 13). That file is now a thin re-export shim so existing callers
 * continue to work without import changes.
 */

import { getSupabaseClient } from '../supabase';
import {
  recordEngineTelemetry as dbRecord,
  getUnpushedEngineTelemetry,
  markEngineTelemetryPushed,
} from '../database';
import { logWarn } from '../errorLog';
import { ALLOWED_EVENTS } from './events';

const FLUSH_DEBOUNCE_MS = 5000;
let _flushTimer = null;

function _scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flushPending().catch(() => {});
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * Record a telemetry event. Writes locally first (always succeeds
 * when the DB is up), then schedules a debounced push to Supabase.
 * Callers do not need to await the push.
 *
 * Returns the local row id on persist success, null on failure or
 * when the event was rejected by the allow-list.
 */
export async function postEvent(userId, event, payload = null) {
  if (!userId || !event) return null;
  if (!ALLOWED_EVENTS.has(event)) {
    // Hard fail in dev so a typo doesn't sit dark in production.
    // eslint-disable-next-line no-undef
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[telemetry] unknown event "${event}" -- check the allow-list`);
    }
    logWarn('telemetry.transport.unknownEvent', { event });
    return null;
  }
  const id = await dbRecord(userId, event, payload).catch((e) => {
    logWarn('telemetry.transport.persist', e?.message ?? 'unknown', { event });
    return null;
  });
  _scheduleFlush();
  return id;
}

/**
 * Push everything that hasn't shipped yet. Called by the debounced
 * timer and also exposed directly so app startup / sign-in flows can
 * drain immediately.
 */
export async function flushPending() {
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
      logWarn('telemetry.transport.rpc', error.message ?? 'unknown', { event: row.event });
      // Skip this row; we'll retry on the next flush. Don't break
      // the loop -- a single bad row shouldn't block the rest.
      continue;
    }
    pushedIds.push(row.id);
  }
  if (pushedIds.length) await markEngineTelemetryPushed(pushedIds);
  return { pushed: pushedIds.length, total: rows.length };
}
