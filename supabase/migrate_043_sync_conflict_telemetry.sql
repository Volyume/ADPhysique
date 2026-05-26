-- Migration 043: extend record_engine_telemetry allow-list with the
-- sync_conflict_resolved event.
--
-- Event added:
--   sync_conflict_resolved   fires from src/lib/sync/conflict.js
--                            whenever a row is contested between the
--                            local SQLite copy and the cloud row.
--                            Payload carries:
--                              table          (registry table name)
--                              record_id      (composite key as text)
--                              strategy       ('last_write_wins' |
--                                              'server_wins' | 'merge')
--                              winner         ('client' | 'server' |
--                                              'merged')
--
-- Drives the conflict-resolution slice of Panel 4 (sync health),
-- giving us rejection rate over time and a per-table breakdown of
-- which tables generate the most cross-device contention.
--
-- Additive only. No schema change, no RLS change. Compatible with the
-- existing closed-test build (it doesn't emit this event yet because
-- the new sync runner ships unwired in this iteration).
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        043
--   - Purpose:                 extend record_engine_telemetry allow-list
--                              with sync_conflict_resolved
--   - Applied locally:         no (no local dev Supabase project at v1)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (CREATE OR REPLACE FUNCTION); each
--                              re-run replaces the function definition
--                              wholesale, so the IN-list always
--                              represents the most recent migration.
--   - Rollback:                re-run migration 041 to restore the
--                              previous allow-list. The event itself
--                              is harmless once allow-listed; the only
--                              rollback path is the previous IN-list.
--   - App-code dependencies:   src/lib/sync/conflict.js emits the
--                              event via src/lib/sync/telemetry.js +
--                              src/lib/engineTelemetry.js. Old AAB
--                              has no emitter so nothing breaks for
--                              the closed-test build.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
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
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded',
    'account_created',
    'custom_food_created',
    'app_cold_start',
    'app_foregrounded',
    'app_backgrounded',
    'sync_run',
    'cascade_state_transition',
    'purchase_initiated',
    'purchase_completed',
    'purchase_failed',
    'subscription_cancelled',
    'restore_purchases_attempted',
    'notification_sent',
    'notification_tapped',
    'notification_failed',
    'article9_consent_withdrawn',
    'sync_conflict_resolved'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
