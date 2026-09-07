-- migrate_166_community_rate_check_hotfix.sql
--
-- Purpose:           PRODUCTION INCIDENT HOTFIX. `_community_rate_check`
--                    (migrate_160, called from 59 RPC sites across
--                    160-165 -- essentially every Community and gym
--                    directory read/write, including `gyms_search`,
--                    `gyms_near`, `community_find_people`,
--                    `community_connect`, `community_send_message`)
--                    opens with an "opportunistic prune":
--                      DELETE FROM public.community_rate_events
--                      WHERE user_id = _uid AND created_at < now() - interval '7 days';
--                    Confirmed live in production (Sentry VOLYUME-37,
--                    Postgres error 25006, "cannot execute DELETE in a
--                    read-only transaction"; first seen 2026-09-06,
--                    dozens of occurrences per minute, escalating,
--                    scope `Community.gyms_search`): some fraction of the
--                    connections the app's API path lands on are
--                    read-only (the primary database itself is not --
--                    confirmed healthy and read-write via direct
--                    connection -- so this is a pooler/routing condition
--                    outside this migration's reach, not a schema
--                    problem). Every call that lands on one of those
--                    connections fails this DELETE, and because it was
--                    never guarded, the exception propagates and takes
--                    the ENTIRE calling RPC down with it -- a person
--                    searching for a gym, finding people, connecting or
--                    messaging gets a generic failure for a plain read,
--                    with no connection to the real cause anywhere in
--                    the error they see.
--
--                    The function's own header comment already calls
--                    this "opportunistic": correctness never depended on
--                    it (the rate-check SELECT below it already filters
--                    `created_at > now() - _window` itself, so a
--                    delayed prune changes nothing about whether a
--                    request is allowed) -- the code just never treated
--                    a prune failure as anything other than a hard
--                    failure. This migration re-issues the function with
--                    the prune wrapped in its own exception handler that
--                    logs nothing and swallows any error, so a read-only
--                    connection (or any other prune failure) can never
--                    block the real rate-check/insert that follows it.
--                    No table, column, or RPC signature changes.
--
-- Applied locally:   N/A (cloud-only function).
-- Applied remotely:  NOT YET APPLIED. Founder gate: apply on the exact
--                    phrase "run against production" (CLAUDE.md). Given
--                    for hotfix: this migration is idempotent and safe
--                    to run in the same batch as any other pending
--                    migration, or alone.
-- Safe to re-run:    Yes. CREATE OR REPLACE FUNCTION, same signature,
--                    same grants (unchanged: EXECUTE revoked from
--                    PUBLIC and anon, granted to authenticated).
-- Rollback:          Re-apply the migrate_160 body of
--                    `_community_rate_check` (the unguarded DELETE) if
--                    ever needed -- not recommended, since it restores
--                    the incident.
--
-- ─── The fix ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._community_rate_check(
  _uid uuid,
  _action text,
  _limit_new integer,
  _limit_established integer,
  _window interval DEFAULT '24:00:00'::interval
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_created timestamptz;
  v_limit   int;
  v_count   int;
BEGIN
  -- Opportunistic prune, so the rail never needs a cron job. Genuinely
  -- opportunistic now: any failure here (a read-only connection, a lock,
  -- anything) is swallowed so it can never block the rate-check/insert
  -- below, which is the part callers actually depend on. Correctness of
  -- the rate limit itself never relied on this running -- the count
  -- below already scopes to `created_at > now() - _window`.
  BEGIN
    DELETE FROM public.community_rate_events
    WHERE user_id = _uid AND created_at < now() - interval '7 days';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  SELECT created_at INTO v_created
  FROM public.community_profiles WHERE user_id = _uid;

  v_limit := CASE
    WHEN v_created IS NOT NULL AND v_created <= now() - interval '7 days'
      THEN _limit_established
    ELSE _limit_new
  END;

  SELECT count(*) INTO v_count
  FROM public.community_rate_events
  WHERE user_id = _uid AND action = _action AND created_at > now() - _window;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION USING message = 'rate_limited';
  END IF;

  INSERT INTO public.community_rate_events (user_id, action) VALUES (_uid, _action);
END $$;

REVOKE ALL ON FUNCTION public._community_rate_check(uuid, text, integer, integer, interval) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._community_rate_check(uuid, text, integer, integer, interval) TO authenticated;

-- ─── Acceptance check (read-only) ───────────────────────────────────────
DO $$
DECLARE
  v_src text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_src
  FROM pg_proc WHERE proname = '_community_rate_check' AND pronamespace = 'public'::regnamespace;

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_rate_check not found';
  END IF;
  IF v_src NOT ILIKE '%EXCEPTION WHEN OTHERS THEN%' THEN
    RAISE EXCEPTION 'acceptance failed: prune is not guarded';
  END IF;

  RAISE NOTICE 'migrate_166 acceptance: OK — _community_rate_check prune is now failure-isolated';
END $$;
