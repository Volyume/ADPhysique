-- Migration 034: fix record_engine_telemetry INSERT column name.
--
-- Migrations 029 and 032 (extending the event allow-list) introduced a
-- typo: they INSERT into a column named `payload` but the actual
-- engine_telemetry column from migration 017 is `payload_json`. With
-- migration 032 currently live, every cloud push raises:
--
--   column "payload" of relation "engine_telemetry" does not exist
--
-- visible in the client as repeated WARN engineTelemetry.flush.rpc
-- entries. The local SQLite row still lands (it has its own column
-- shape and INSERT path), but the cloud row is dropped.
--
-- This migration restores the correct column name. It keeps the full
-- event allow-list from migration 032 (the most recent superset).
--
-- Additive only. No schema change, no RLS change. Safe to apply now;
-- existing closed-test build never emits the newer events so the
-- broader allow-list doesn't change behaviour for it.
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
    'paywall_tapped_cta'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
