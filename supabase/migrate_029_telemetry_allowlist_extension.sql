-- Migration 029: extend record_engine_telemetry allow-list
--
-- Adds four events from the locked TELEMETRY_DASHBOARDS_LOCKED.md
-- catalogue that exist for shipped Moves but had no server-side
-- allow-list entry. Without this, the client's `track()` call
-- succeeds locally (the row sits in the SQLite engine_telemetry
-- table) but the cloud push raises "Unknown engine telemetry event".
--
-- Events added:
--   weekly_coach_run        every weekly coach run on a user
--   ffm_floor_hold_fired    FFM floor held a calorie cut
--   food_logged             user logged a food entry
--   food_search_attempt     user ran a text search via the waterfall
--
-- Migration is additive only. No schema change, no RLS change.
-- Safe to apply now. Compatible with the existing closed-testing
-- build (old client never calls these events, so the broader
-- allow-list doesn't change behaviour for it).
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
    'food_search_attempt'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
