-- Migration 040: extend record_engine_telemetry allow-list with the
-- notification surface catalogue (Panel 6, NOTIFICATIONS_LOCKED.md).
--
-- Events added:
--   notification_sent     fired from the expo-notifications received-
--                         listener when the OS delivers a notification
--                         while the app process is alive enough to
--                         observe it. Payload carries the category +
--                         scheduled_for + delivered_at so Panel 6 can
--                         break send rate down per category.
--   notification_tapped   fired from the response-listener whenever
--                         a delivered notification is opened. Powers
--                         per-category open rate.
--   notification_failed   fired when a local schedule call throws
--                         (storage failure, expo-notifications threw,
--                         missing channel). Cross-device push
--                         deliverability failures live with the Expo
--                         Push service and are not surfaced here.
--
-- Together these populate Panel 6 (notification rates) with send /
-- open / fail counts per category. The categories themselves come
-- from src/lib/notifications/categories.js -- no server-side enum
-- is enforced; the RPC just records whatever string the client
-- sends in the payload.category JSON field.
--
-- Additive only. No schema change, no RLS change. Compatible with
-- the existing closed-test build (it never emits these events).
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
    'notification_failed'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
