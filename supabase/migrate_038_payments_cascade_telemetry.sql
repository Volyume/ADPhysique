-- Migration 038: extend record_engine_telemetry allow-list with the
-- payments + cascade telemetry catalogue.
--
-- Events added:
--   cascade_state_transition       generic umbrella with reason +
--                                  source_surface + target_tier; fired
--                                  on every cascade.* RPC success.
--   purchase_initiated             top of playBilling.purchasePackage,
--                                  before the IAP dialog opens.
--   purchase_completed             purchaseUpdatedListener success path.
--   purchase_failed                purchaseErrorListener (excluding
--                                  user-cancel; that's a normal flow).
--   subscription_cancelled         cascade.cancel / graceLapsed /
--                                  refunded paths (RTDN webhook
--                                  reconciliation).
--   restore_purchases_attempted    top of payments/restore.restorePurchases.
--
-- Together these populate Panel 5 (cascade and conversion) with the
-- full state-transition stream + the purchase funnel. The granular
-- cascade variants (cascade_started, cascade_advanced,
-- cascade_skipped_ahead, paid_converted, churn_at_gate) were already
-- allow-listed in migration 017 and 029; this migration is the new
-- coverage layer on top.
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
    'restore_purchases_attempted'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
