-- Migration 017: ED-pattern detection + goal lock + engine telemetry
--
-- Cloud companion for Move #2 (ED-pattern detection) and Move #3
-- (cascade telemetry). The local SQLite schema added in this same
-- release writes to ed_pattern_flags, user_body_profile.goal_lock_*
-- and engine_telemetry. This migration mirrors those tables on the
-- Supabase side so sync round-trips them, and adds two RPCs the
-- engine and the You-tab edit surface call directly.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

-- ─── ed_pattern_flags ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ed_pattern_flags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_state      text NOT NULL CHECK (flag_state IN ('raised', 'cleared')),
  reason          text,
  signals_json    jsonb,
  raised_at       timestamptz NOT NULL DEFAULT now(),
  cleared_at      timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ed_pattern_flags_user      ON ed_pattern_flags(user_id, raised_at DESC);
CREATE INDEX IF NOT EXISTS idx_ed_pattern_flags_open      ON ed_pattern_flags(user_id) WHERE cleared_at IS NULL AND deleted_at IS NULL;

ALTER TABLE ed_pattern_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ed_pattern_flags"  ON ed_pattern_flags;
DROP POLICY IF EXISTS "Users can write own ed_pattern_flags" ON ed_pattern_flags;
DROP POLICY IF EXISTS "Users can update own ed_pattern_flags" ON ed_pattern_flags;

CREATE POLICY "Users can read own ed_pattern_flags"
  ON ed_pattern_flags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can write own ed_pattern_flags"
  ON ed_pattern_flags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ed_pattern_flags"
  ON ed_pattern_flags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── user_body_profile.goal_lock_advanced ──────────────────────────

ALTER TABLE user_body_profile
  ADD COLUMN IF NOT EXISTS goal_lock_advanced boolean DEFAULT false;

ALTER TABLE user_body_profile
  ADD COLUMN IF NOT EXISTS goal_lock_set_at   timestamptz;

-- ─── clear_goal_lock RPC ───────────────────────────────────────────
-- The user can flip goal_lock_advanced from the You-tab Goal lock
-- edit surface. This RPC also writes a telemetry event so cohort
-- analysis can track who turned advanced mode off vs on.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'clear_goal_lock'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION clear_goal_lock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE user_body_profile
  SET goal_lock_advanced = false,
      goal_lock_set_at   = now(),
      updated_at         = now()
  WHERE user_id = uid;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, 'goal_lock_cleared', '{"source":"rpc"}'::jsonb, now());
END;
$$;

GRANT EXECUTE ON FUNCTION clear_goal_lock TO authenticated;

-- ─── engine_telemetry ──────────────────────────────────────────────
-- Per-event log. Written client-side and pushed via
-- record_engine_telemetry. The daily rollup view aggregates this
-- into engine_telemetry_daily for the cohort dashboard.

CREATE TABLE IF NOT EXISTS engine_telemetry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event           text NOT NULL,
  payload_json    jsonb,
  occurred_at     timestamptz NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engine_telemetry_user        ON engine_telemetry(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_engine_telemetry_event_day   ON engine_telemetry(event, occurred_at);

ALTER TABLE engine_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own engine_telemetry"  ON engine_telemetry;
DROP POLICY IF EXISTS "Users can write own engine_telemetry" ON engine_telemetry;

CREATE POLICY "Users can read own engine_telemetry"
  ON engine_telemetry FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can write own engine_telemetry"
  ON engine_telemetry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── record_engine_telemetry RPC ───────────────────────────────────
-- Single entry point the client calls in the push helper. Validates
-- the event name against an allow-list so a misconfigured client
-- can't pollute the table with arbitrary strings.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'record_engine_telemetry'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event   text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid    uuid := auth.uid();
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
    'churn_at_gate'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry TO authenticated;

-- ─── engine_telemetry_daily view ───────────────────────────────────
-- Daily aggregations for the cohort dashboard. Selected by
-- analytics queries, not by the client. RLS is intentionally NOT
-- enabled on this view; the founder's Supabase Studio access reads
-- it directly and exports for the weekly review.

CREATE OR REPLACE VIEW engine_telemetry_daily AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  event,
  COUNT(*)                              AS event_count,
  COUNT(DISTINCT user_id)               AS user_count
FROM engine_telemetry
GROUP BY 1, 2;

-- ─── engine_overrides (groundwork) ─────────────────────────────────
-- Locked spec calls for this table in phase 2 (B2B). No client
-- consumers yet at this move; the table exists so the schema is
-- migration-complete and we don't ship a partial 017 to production.

CREATE TABLE IF NOT EXISTS engine_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  override_key    text NOT NULL,
  override_value  jsonb NOT NULL,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_engine_overrides_user ON engine_overrides(user_id, override_key);

ALTER TABLE engine_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own engine_overrides" ON engine_overrides;
CREATE POLICY "Users can read own engine_overrides"
  ON engine_overrides FOR SELECT
  USING (auth.uid() = user_id);
