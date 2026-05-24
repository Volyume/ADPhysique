-- Migration 027: extend record_engine_telemetry allow-list for Move #3
--
-- Adds one event to the server-side allow-list so the upward gate
-- compression fire site can push it without the RPC rejecting the
-- row. Allow-list is duplicated client/server by design (catches
-- typos at both ends).
--
-- Event added:
--   rapid_loss_compression_triggered
--     payload: { weekly_loss_pct: number, energy_score: number,
--                kcal_delta: number, days_compressed: 7 }
--
-- Locked in MOVE_3_UPWARD_GATE_COMPRESSION.md and
-- TELEMETRY_DASHBOARDS_LOCKED.md.
--
-- Safe to apply now. Old app builds don't push the event, so cloud
-- can roll ahead of client without anything breaking. The
-- engine_telemetry_daily view (created in migration 017) is generic
-- and pivots on event name, so no view change is needed --
-- 'rapid_loss_compression_triggered' just appears as a new row in
-- the daily aggregation.
--
-- Migration 017 declared the function with `_occurred_at timestamptz
-- DEFAULT now()`; subsequent migrations (022, this one) DROP +
-- CREATE rather than CREATE OR REPLACE because pg_proc default
-- changes can raise 42P13 on existing rows. Idempotent: re-running
-- this migration produces the same function definition.

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
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, COALESCE(_occurred_at, now()))
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
