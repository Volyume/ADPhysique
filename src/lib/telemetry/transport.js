/**
 * Telemetry transport, owns persist + push.
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
import { logWarn, logInfo } from '../errorLog';
import { isDeletedAccountFkError } from '../sync/telemetry';
import { ALLOWED_EVENTS } from './events';
import { sanitisePayload, allowedBeforeConsent, isDebugLoggedSignal, SCHEMA_BY_NAME } from './schema';
import { noteSessionEvent, publicRoute } from './session';
import { GROWTH_TELEMETRY } from '../sync/featureFlags';

// Founder decision 2026-10-19 (telemetry brief, answer 4): nothing that
// touches health leaves the device before Article 9 consent; failure and
// performance events (schema `preConsent`) do, so a fault before consent
// is still seen. Fails closed: an unreadable consent state is "not given".
function consentGiven() {
  try {
    // eslint-disable-next-line global-require
    return require('../../store/useAppStore').default.getState()?.healthConsent === true;
  } catch (_) {
    return false;
  }
}

// Stamped on every event so a regression shows by release and platform.
let _appVersion;
function appStamp() {
  if (_appVersion === undefined) {
    try {
      // eslint-disable-next-line global-require
      _appVersion = require('expo-application').nativeApplicationVersion ?? null;
    } catch (_) { _appVersion = null; }
  }
  let platform = null;
  try {
    // eslint-disable-next-line global-require
    platform = require('react-native').Platform?.OS ?? null;
  } catch (_) { platform = null; }
  return { ...(_appVersion ? { app_version: String(_appVersion) } : {}), ...(platform ? { platform } : {}) };
}

// Adversarial review B1, B2: a route-typed field (screen, from_screen) never
// carries a private route name (session.js PRIVATE_ROUTES), whichever caller
// built the payload. The sender already maps; this is the second lock.
function maskPrivateRoutes(event, clean) {
  const fields = SCHEMA_BY_NAME[event]?.fields;
  if (!fields || !clean || typeof clean !== 'object') return clean;
  const out = { ...clean };
  for (const [k, spec] of Object.entries(fields)) {
    if (spec.type === 'route' && typeof out[k] === 'string') out[k] = publicRoute(out[k]);
  }
  return out;
}

// Adversarial review M2 (rows the server will never take): a row the server
// refuses for what it IS (an event name it does not know, or a payload over
// its size cap) can never succeed on a retry, so it is marked handled and
// never blocks the queue. A transient failure (network, timeout, auth) is
// NOT a refusal and stays queued. Messages are the RAISE texts in
// supabase/migrate_193 and migrate_200 record_engine_telemetry.
const isRowRefusal = (error) => /unknown engine telemetry event|payload too large/i.test(String(error?.message || ''));

const FLUSH_DEBOUNCE_MS = 5000;
// True once this session learns the batch function is not deployed yet.
let _batchMissing = false;
const isMissingFunction = (error) => error?.code === 'PGRST202' || error?.code === '42883'
  || /could not find the function|does not exist/i.test(String(error?.message || ''));
/** Test seam: forget what the session learned about the batch function. */
export function __resetBatchProbe() { _batchMissing = false; }
let _flushTimer = null;

// LB-9: product telemetry runs under legitimate interest with a user
// opt-out. Default enabled (opt-out, not opt-in); the store flips this
// from the saved privacy pref at boot and whenever the toggle changes.
// When disabled, nothing is persisted and nothing is pushed, so an
// opted-out user generates no analytics at all.
let _enabled = true;

export function setTelemetryEnabled(value) {
  _enabled = value !== false;
}

export function isTelemetryEnabled() {
  return _enabled;
}

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
  // LB-9: user opted out of product analytics. Drop before persisting.
  if (!_enabled) return null;
  // Adversarial review M2: every event in the schema catalogue is new with
  // migrate_200 (none appears in migrate_001 to migrate_199), and the server
  // refuses a name it does not know. While the migration is not applied
  // (GROWTH_TELEMETRY off, src/lib/sync/featureFlags.js) these events are
  // DROPPED here, not queued, so no row is ever persisted that the server
  // would refuse. Legacy events are unaffected.
  if (!GROWTH_TELEMETRY && SCHEMA_BY_NAME[event]) return null;
  if (!ALLOWED_EVENTS.has(event)) {
    // Surface a typo rather than letting it sit dark. logWarn already routes to
    // the console in dev (errorLog), so a separate console.warn is redundant
    // (CODE-001).
    logWarn('telemetry.transport.unknownEvent', `unknown event "${event}", check the allow-list`, { event });
    return null;
  }
  if (!allowedBeforeConsent(event) && !consentGiven()) return null;
  // A declared event keeps only its declared, valid fields (schema.js).
  const { payload: sanitised, dropped } = sanitisePayload(event, payload);
  const clean = maskPrivateRoutes(event, sanitised);
  if (dropped.length) logWarn('telemetry.transport.droppedFields', `"${event}" dropped ${dropped.join(', ')}`, { event });
  const stamped = clean && typeof clean === 'object' && !Array.isArray(clean)
    ? { ...clean, ...appStamp() }
    : (clean == null ? appStamp() : clean);
  noteSessionEvent(event);
  // Development builds also put friction, performance and confusion events
  // in the on-device debug log (Settings, Debug logs).
  if (typeof __DEV__ !== 'undefined' && __DEV__ && isDebugLoggedSignal(event)) {
    logWarn('telemetry.signal', event, stamped);
  }
  const id = await dbRecord(userId, event, stamped).catch((e) => {
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
  // LB-9: don't ship anything while opted out, including rows that were
  // queued before the opt-out. They stay local and never leave the device.
  if (!_enabled) return { pushed: 0, skipped: 'opted_out' };
  const sb = getSupabaseClient();
  if (!sb) return { pushed: 0, skipped: 'no_client' };
  // Only flush rows that belong to the user whose session is signing the RPC.
  // The server stamps each telemetry row with auth.uid(), so pushing another
  // account's leftover rows would misattribute them to whoever is signed in
  // now. Derive the uid from the live session (local read, no network) and
  // scope the query to it; no session means nothing to ship.
  let uid = null;
  try {
    const { data } = await sb.auth.getSession();
    uid = data?.session?.user?.id ?? null;
  } catch (_) { uid = null; }
  if (!uid) return { pushed: 0, skipped: 'no_session' };
  const rows = await getUnpushedEngineTelemetry(uid, 200);
  if (!rows.length) return { pushed: 0 };

  const pushedIds = [];
  const refusedIds = [];
  // Founder decision 2026-10-19 (answer 2a): one request carries the batch
  // (migrate_200). Until that migration is applied the batch function does
  // not exist, so the rows go one at a time exactly as before.
  if (!_batchMissing) {
    const batch = rows.map((row) => {
      let payload = null;
      if (row.payload_json) {
        try { payload = JSON.parse(row.payload_json); } catch (_) { payload = null; }
      }
      return { event: row.event, payload, occurred_at: new Date(row.occurred_at).toISOString() };
    });
    const { data, error } = await sb.rpc('record_engine_telemetry_batch', { _events: batch });
    if (!error) {
      // The server returns the indexes it rejected (an unknown name, an
      // oversized payload, a malformed row). A refused row can never succeed
      // on a retry, so it is marked handled with the rest and never blocks
      // the queue (adversarial review M2); only a failed call, below, keeps
      // rows queued.
      const rejected = new Set(Array.isArray(data?.rejected) ? data.rejected : []);
      const refused = rows.filter((_, i) => rejected.has(i)).length;
      await markEngineTelemetryPushed(rows.map((r) => r.id));
      if (refused) logInfo('telemetry.transport.batch.refused', 'the server refused rows; marked handled', { refused, total: rows.length });
      return { pushed: rows.length - refused, ...(refused ? { rejected: refused } : {}), total: rows.length, batched: true };
    }
    if (isMissingFunction(error)) {
      _batchMissing = true;
    } else {
      if (isDeletedAccountFkError(error)) {
        logInfo('telemetry.transport.batch.deletedAccountResidual', 'benign user_id FK rejection from a deleted-account device; session will clear', {});
      } else {
        logWarn('telemetry.transport.batch', error.message ?? 'unknown', { rows: rows.length });
      }
      return { pushed: 0, total: rows.length };
    }
  }
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
    if (error && isRowRefusal(error)) {
      // The server will never take this row: handled, not retried (M2).
      logInfo('telemetry.transport.rpc.refused', 'the server refused a row; marked handled', { event: row.event });
      refusedIds.push(row.id);
      continue;
    }
    if (error) {
      // Same benign classification sync/telemetry.js's logSyncError already
      // applies: a deleted account whose device still holds a live JWT fails
      // this FK on every flush until the token expires - the correct server
      // response, not an app fault (Sentry VOLYUME-39).
      if (isDeletedAccountFkError(error)) {
        logInfo('telemetry.transport.rpc.deletedAccountResidual', 'benign user_id FK rejection from a deleted-account device; session will clear', { event: row.event });
      } else {
        logWarn('telemetry.transport.rpc', error.message ?? 'unknown', { event: row.event });
      }
      // Skip this row; we'll retry on the next flush. Don't break
      // the loop -- a single bad row shouldn't block the rest.
      continue;
    }
    pushedIds.push(row.id);
  }
  if (pushedIds.length || refusedIds.length) await markEngineTelemetryPushed([...pushedIds, ...refusedIds]);
  return { pushed: pushedIds.length, ...(refusedIds.length ? { rejected: refusedIds.length } : {}), total: rows.length };
}
