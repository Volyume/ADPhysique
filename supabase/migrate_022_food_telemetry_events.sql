-- Migration 022: extend record_engine_telemetry allow-list for Move #1.5
--
-- Adds two food-domain events to the server-side allow-list so the
-- waterfall + OFF write-back queue can push them without the RPC
-- rejecting the row. Allow-list is duplicated client/server by
-- design (catches typos at both ends).
--
-- Events added:
--   food_lookup_barcode      every barcode resolve, source = local | off_live | usda | miss
--   ocr_writeback_attempted  every OFF contribution POST, status = success | failure
--
-- Safe to apply now. Old app builds don't push either event, so
-- nothing breaks if cloud rolls ahead of client.

-- Migration 017 declared the function with `_occurred_at timestamptz
-- DEFAULT now()`, but cloud projects that pre-date that change (or
-- that took an earlier in-flight variant of 017) may have a different
-- default set on the row in pg_proc, which makes CREATE OR REPLACE
-- raise 42P13 ("cannot remove parameter defaults from existing
-- function"). Drop + recreate is the documented escape hatch and is
-- atomic inside Supabase's SQL editor transaction, so callers never
-- observe a missing function.
DROP FUNCTION IF EXISTS record_engine_telemetry(text, jsonb, timestamptz);

CREATE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb,
  _occurred_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
    'ocr_writeback_attempted'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, COALESCE(_occurred_at, now()))
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
