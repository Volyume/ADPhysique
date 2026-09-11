-- migrate_171_community_friends_trained_today.sql
--
-- Purpose:           One count-only RPC for the home-screen widget's
--                    "N friends trained today" line (communities revamp
--                    phase 4, CR-14, `docs/communities-revamp-2026-09-10/
--                    24-PHASE4-SPEC.md`). The fresh-eyes review of phase 4
--                    (2026-09-11, finding 9) observed that the client
--                    derived that single integer by loading up to fifty
--                    full profile cards through `community_board`'s
--                    `following` scope (handle, display name, avatar
--                    preset, bio, gym and area labels) into app memory,
--                    and spending one rate-railed board call per widget
--                    refresh to do it. Data minimisation says the client
--                    should receive the integer and nothing else.
--
--                    `community_friends_trained_today(_today)` returns
--                    that integer, computed with EXACTLY the eligibility
--                    predicate `community_board`'s `following` scope uses
--                    (migrate_165, re-issued unchanged for that arm by
--                    migrate_170): an accepted follow from the caller, a
--                    profile that is active, not a minor, sharing
--                    consistency, with counters published inside the last
--                    fourteen days, not blocked in either direction, whose
--                    `c_last_trained_day` equals the supplied day; the
--                    caller's own row is never counted, and a row whose
--                    week metric is NULL is dropped as the board drops it.
--                    Nothing is
--                    disclosed that the caller's own Following board does
--                    not already show; this function shows LESS (a count).
--                    Capped at 999, the client's own clamp.
--
--                    Read-only: no rate-rail write (the board's rail exists
--                    for a query that gathers every eligible profile; this
--                    is one indexed count), so the function is STABLE and
--                    safe inside PostgREST's read-only transaction
--                    (migrate_167's lesson runs the other way: a STABLE
--                    function must not write, and this one does not).
--
--                    `_today` follows migrate_170's contract: a supplied
--                    value must be a zero-padded YYYY-MM-DD key (the exact
--                    format src/lib/dayKey.js's localDayKey() produces) and
--                    is refused when malformed; NULL falls back to the
--                    UK-local day, never `now()::date`.
--
-- Applied locally:   n/a (cloud-only object; nothing in database.js)
-- Applied remotely:  NOT YET - waits for the founder's exact phrase
--                    "run against production". Claude-run on that phrase
--                    (supabase/README.md status block); the client keeps
--                    its board path until this is live, then switches.
-- Safe to re-run:    YES - CREATE OR REPLACE FUNCTION, REVOKE/GRANT are
--                    idempotent, and the acceptance block is read-only.
-- Rollback:          DROP FUNCTION public.community_friends_trained_today(text);
--                    the client's board path is unaffected by the drop.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        160 (community_profiles, community_follows,
--                    _community_caller, _community_is_blocked,
--                    _community_require_profile), 165 (the c_* consistency
--                    counters and c_last_trained_day), 170 (the _today
--                    contract this mirrors).

-- ─── Part 1: the RPC ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_friends_trained_today(_today text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid   uuid := public._community_caller();
  v_me    public.community_profiles%ROWTYPE;
  v_today text;
  v_n     integer := 0;
BEGIN
  -- migrate_170's _today contract, in its exact shape (community_hub_summary,
  -- community_dimensions_me): trimmed, an empty or absent day falls back to
  -- the UK-local day, a malformed one is refused, never now()::date.
  v_today := nullif(btrim(coalesce(_today, '')), '');
  IF v_today IS NULL THEN
    v_today := to_char(timezone('Europe/London', now()), 'YYYY-MM-DD');
  ELSIF v_today !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- The same gate the board applies: a joined, unsuspended profile.
  v_me := public._community_require_profile(v_uid, false);

  -- EXACTLY community_board's `following` arm (migrate_165 / migrate_170),
  -- minus the caller's own row, plus the day-level test the board answers
  -- per row as `trained_today`. Muted people stay counted, as they stay on
  -- the board (a mute hides stories, not consistency rows).
  SELECT count(*) INTO v_n
  FROM public.community_profiles p
  WHERE p.user_id <> v_uid
    AND p.status = 'active'
    AND p.is_minor = false
    AND p.share_consistency = true
    AND p.c_updated_at IS NOT NULL
    AND p.c_updated_at >= now() - interval '14 days'
    AND p.c_last_trained_day IS NOT NULL
    AND p.c_last_trained_day = v_today
    -- The board drops any gathered row whose window metric is NULL
    -- (migrate_170, `IF v_row.metric IS NULL THEN CONTINUE`); the widget
    -- reads the week window, so the same row is dropped here.
    AND p.c_sessions_week IS NOT NULL
    AND NOT public._community_is_blocked(v_uid, p.user_id)
    AND EXISTS (
      SELECT 1 FROM public.community_follows f
      WHERE f.follower_id = v_uid AND f.followee_id = p.user_id AND f.state = 'accepted');

  RETURN least(coalesce(v_n, 0), 999);
END;
$function$;

REVOKE ALL ON FUNCTION public.community_friends_trained_today(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_friends_trained_today(text) TO authenticated;

-- ─── Acceptance check (read-only) ──────────────────────────────────────────

DO $$
DECLARE v_ok boolean;
BEGIN
  IF to_regprocedure('public.community_friends_trained_today(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_friends_trained_today missing';
  END IF;

  -- Read-only by design (no rate-rail write inside), so STABLE is correct
  -- and VOLATILE would be the mistake here.
  SELECT p.provolatile = 's' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.community_friends_trained_today(text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_friends_trained_today is not STABLE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'community_friends_trained_today'
      AND (NOT p.prosecdef OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_friends_trained_today is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.community_friends_trained_today(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_friends_trained_today is not executable by authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.community_friends_trained_today(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_friends_trained_today is executable by anon';
  END IF;

  RAISE NOTICE 'migrate_171 acceptance: OK';
END $$;
