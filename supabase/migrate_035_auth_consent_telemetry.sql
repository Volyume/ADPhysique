-- Migration 035: extend record_engine_telemetry allow-list with the
-- auth + consent funnel events.
--
-- Events added:
--   sign_in                     SIGNED_IN auth event (not session restore)
--   sign_out                    sign-out flow start, before local wipe
--   article9_consent_recorded   UK GDPR Article 9 explicit consent granted
--
-- Together they cover the funnel from account entry through consent
-- through exit, which Panel 1 (engine health) and Panel 8 (account
-- lifecycle) of TELEMETRY_DASHBOARDS_LOCKED.md need to populate.
--
-- The legal evidence trail for Article 9 consent still lives in the
-- consent_log table (migration 019); this event is the dashboard
-- counterpart, not the legal record.
--
-- Additive only. No schema change, no RLS change. Compatible with
-- the existing closed-test build (it never emits these events).
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
    'article9_consent_recorded'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
