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
 * Events instrumented (locked):
 *   ed_pattern_flag_fired   — engine raised an ED-pattern flag
 *   ed_pattern_flag_cleared — engine cleared an open flag
 *   goal_lock_set           — user opted into advanced goal lock
 *   goal_lock_cleared       — user opted out / never opted in
 *   tier_changed            — tier changed (free / pro / complete)
 *   cascade_started         — first paid trial day began
 *   cascade_advanced        — moved to the next cascade phase
 *   cascade_skipped_ahead   — user fast-forwarded through cascade
 *   paid_converted          — first non-trial payment landed
 *   churn_at_gate           — user downgraded at a gate
 */

import { getSupabaseClient } from './supabase';
import {
  recordEngineTelemetry as dbRecord,
  getUnpushedEngineTelemetry,
  markEngineTelemetryPushed,
} from './database';
import { logWarn } from './errorLog';

const ALLOWED_EVENTS = new Set([
  'ed_pattern_flag_fired',
  'ed_pattern_flag_cleared',
  'goal_lock_set',
  'goal_lock_cleared',
  'tier_changed',
  'cascade_started',
  'cascade_advanced',
  'cascade_skipped_ahead',
  'paid_converted',
  'churn_at_gate',
  // Move #1.5: food source observability. Lets us see how often
  // the network fall-through actually fires and which API resolves
  // it, so the bundled snapshot strategy stays evidence-based.
  'food_lookup_barcode',
  'ocr_writeback_attempted',
  // Move #3: upward-only gate compression fires when the rapid-loss
  // safety condition skips the two-week cooldown and adds calories
  // straight away. Cohort dashboard reads it as a count of how often
  // the safety override actually engages in the wild.
  'rapid_loss_compression_triggered',
  // Migration 029 (TELEMETRY_DASHBOARDS_LOCKED.md catalogue):
  // shipped-Move coverage gaps. weekly_coach_run powers the engine
  // health panel; ffm_floor_hold_fired powers the FFM-floor hold
  // rate alert; food_logged + food_search_attempt power the food
  // layer health panel and search latency monitoring.
  'weekly_coach_run',
  'ffm_floor_hold_fired',
  'food_logged',
  'food_search_attempt',
  // Migration 032 (Move #4): differential paywall surfaces. The
  // shown event captures the impression; tapped_cta captures the
  // decision (pay / dismiss). Together they drive the Panel 5
  // cascade-and-conversion dashboards.
  'paywall_shown',
  'paywall_tapped_cta',
  // Migration 035: auth + consent funnel coverage. sign_in fires on
  // an actual SIGNED_IN auth event (not INITIAL_SESSION restore).
  // sign_out fires at the top of clearAuthStateForSignOut so the
  // event is in the queue before the local wipe runs.
  // article9_consent_recorded is the UK GDPR Article 9 explicit-
  // consent evidence trail; the consent_log table holds the
  // legal record, this event powers the consent rate dashboard.
  'sign_in',
  'sign_out',
  'article9_consent_recorded',
  // Migration 036: signup funnel closure. account_created fires on
  // SIGNED_IN when session.user.created_at is within the last 5
  // minutes (covers email-auto-confirm + OAuth signup; misses
  // email-confirm-later sign-ins more than 5 min after the confirm
  // link, which is fine for funnel ratios). custom_food_created
  // fires after insertCustomFood succeeds in AddCustomFoodScreen.
  'account_created',
  'custom_food_created',
  // Migration 037: app lifecycle + sync cadence. app_cold_start
  // fires once per process the first time maybeSync resolves a
  // signed-in user. app_foregrounded / app_backgrounded cover
  // subsequent AppState 'active' / 'background' transitions (not
  // 'inactive', which is the iOS transient control-centre state).
  // sync_run fires at the end of each successful maybeSync round,
  // throttled to once per 60s by the upstream MIN_SYNC_INTERVAL_MS.
  'app_cold_start',
  'app_foregrounded',
  'app_backgrounded',
  'sync_run',
]);

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
