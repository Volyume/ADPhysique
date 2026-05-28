-- Migration 051: food_frequents (GAP row 28, Frequents search tab)
--
-- The Frequents tab shows a user's most-logged foods over the last 30
-- days. Per UI_FLOWS_LOCKED.md it is "computed nightly server-side,
-- cached locally". This migration is the server half:
--   * food_frequents          cache table, one row per (user, food)
--   * refresh_food_frequents()  nightly worker, recomputes all users
--   * cron.schedule             runs the worker once a night
--   * food_frequents_pull()    RPC the client calls to fetch its rows
--
-- The client never writes food_frequents; it is derived data. The app
-- pulls a fresh snapshot (food_frequents_pull) when the Frequents tab is
-- opened and the local cache is stale, and renders from the local copy.
-- This keeps Frequents out of the main food_sync_pull / food_sync_push
-- cycle (it needs none of the conflict/queue machinery).
--
-- Additive and safe to re-run. The existing closed-test build never
-- references food_frequents, so its sync keeps working unchanged.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ────────────────────────────────────────────────────────────────────
-- Cache table
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS food_frequents (
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_ref       text        NOT NULL,
  log_count      integer     NOT NULL DEFAULT 0,
  last_logged_at timestamptz,
  computed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, food_ref)
);

ALTER TABLE food_frequents ENABLE ROW LEVEL SECURITY;

-- Read-own only. There is intentionally no insert/update/delete policy
-- for authenticated: the table is written exclusively by the
-- SECURITY DEFINER worker below, never by a client.
DROP POLICY IF EXISTS food_frequents_select_own ON food_frequents;
CREATE POLICY food_frequents_select_own ON food_frequents
  FOR SELECT USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────
-- Nightly worker: recompute every user's top-20 over the last 30 days
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_food_frequents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  started_at timestamptz := now();
  row_count  int;
BEGIN
  -- Full recompute. The function body is one transaction, so readers
  -- see either the old snapshot or the new one, never an empty table.
  DELETE FROM food_frequents;

  INSERT INTO food_frequents (user_id, food_ref, log_count, last_logged_at, computed_at)
  SELECT user_id, food_ref, cnt, last_at, started_at
  FROM (
    SELECT
      user_id,
      food_ref,
      count(*)         AS cnt,
      max(logged_at)   AS last_at,
      row_number() OVER (
        PARTITION BY user_id
        ORDER BY count(*) DESC, max(logged_at) DESC
      ) AS rn
    FROM food_entries
    WHERE deleted_at IS NULL
      AND logged_at >= started_at - interval '30 days'
    GROUP BY user_id, food_ref
  ) ranked
  WHERE rn <= 20;

  GET DIAGNOSTICS row_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'rows', row_count,
    'ran_at', started_at,
    'duration_ms', round(EXTRACT(epoch FROM (now() - started_at)) * 1000)
  );
END $$;

-- Worker is cron-only. Never callable by a client.
REVOKE EXECUTE ON FUNCTION refresh_food_frequents() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refresh_food_frequents() FROM authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Client pull: the caller's own frequents, most-logged first
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION food_frequents_pull()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'food_frequents_pull: not authenticated';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.log_count DESC), '[]'::jsonb)
    INTO v_result
  FROM food_frequents t
  WHERE t.user_id = v_uid;
  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION food_frequents_pull() TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Schedule: nightly at 03:10 UTC. Idempotent unschedule + reschedule so
-- re-running the migration updates the schedule cleanly (pattern from
-- migration 031).
-- ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('refresh-food-frequents');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

SELECT cron.schedule(
  'refresh-food-frequents',
  '10 3 * * *',
  $cron$SELECT refresh_food_frequents();$cron$
);
