-- Migration 037: extend record_engine_telemetry allow-list with the
-- app lifecycle + sync cadence events.
--
-- Events added:
--   app_cold_start     once per process, the first time the foreground
--                      sync resolves a signed-in user.
--   app_foregrounded   AppState change to 'active' AFTER cold-start
--                      (so the first 'active' on mount doesn't double-
--                      count with app_cold_start).
--   app_backgrounded   AppState change to 'background'. Excludes
--                      'inactive' (the iOS transient control-centre /
--                      phone-call state), which would otherwise
--                      overstate sessions.
--   sync_run           end of each maybeSync round that resolved a
--                      signed-in user. Throttled by the upstream
--                      MIN_SYNC_INTERVAL_MS = 60s gate.
--
-- Together these fill Panel 1 (engine health) — DAU / WAU / MAU
-- cohorts, sync staleness alerts, and time-to-foreground after
-- background. Closed-test build doesn't emit any of them so the
-- broader allow-list is a no-op for it.
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

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
    'sync_run'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
