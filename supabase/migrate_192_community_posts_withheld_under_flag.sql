-- migrate_192_community_posts_withheld_under_flag.sql
--
-- Purpose:           D228 addendum Q1 (founder "Go as recommended",
--                    2026-10-15). Posting to Community already pauses on
--                    the device while an ED-pattern flag is open, but the
--                    automatic session posts a person made BEFORE the flag
--                    stayed on the feed, the profile and the public pages,
--                    and nothing restored or withdrew them. Now the server
--                    withholds the author's automatic posts for the flag's
--                    duration and returns them when it clears. Calm mode
--                    leaves posts alone (founder choice, D228 addendum).
--
--                    THE DESIGN: every reader of community_posts (the
--                    feed, discover, get_post, profile, group feed, the
--                    public edge function) already filters
--                    `status = 'visible'`, and the moderation path uses
--                    `status = 'hidden'`. A third status, 'withheld', is
--                    added to the CHECK, and one helper flips the author's
--                    auto=true posts between 'visible' and 'withheld' from
--                    the state of ed_pattern_flags. The helper runs inside
--                    `ed_flag_push` (migrate_182), the only client write
--                    path for a flag, so a raise withholds and a clear
--                    restores in the same transaction as the flag itself.
--                    No reader changes; moderation-hidden posts are never
--                    touched (only 'visible' <-> 'withheld'); hand-written
--                    posts (auto=false) are the person's own words and
--                    stay. The feed, discover, the profile and the public
--                    pages withhold the posts from everyone; the author can
--                    still open one of their own by id (community_get_post
--                    lets an author read their own row), and the device's
--                    sharing surfaces are already quiet under a flag. A post
--                    made by a device that does not yet know the flag is
--                    withheld on the next push cycle (the helper runs on
--                    every ed_flag_push, which the client sends first in
--                    every sync), not at insert.
--
-- Applied locally:   no (nothing local; cloud-only objects)
-- Applied remotely:  YES, 2026-10-15 15:37:42 UTC (founder: "run against
--                    production 192.", 2026-10-15; Claude-run through the
--                    Supabase connector under the checksum protocol).
-- Safe to re-run:    yes. CREATE OR REPLACE for both functions; the CHECK
--                    is dropped and re-added by name in one statement; the
--                    helper takes a per-person advisory lock; its UPDATEs
--                    are idempotent (they only move rows that are not
--                    already in the target state).
-- Rollback:          re-run migrate_182's ed_flag_push definition (the
--                    version without the PERFORM), then
--                    DROP FUNCTION public._community_apply_flag_withhold(uuid);
--                    UPDATE public.community_posts SET status = 'visible'
--                      WHERE status = 'withheld';
--                    and re-add the two-value CHECK from migrate_160.
-- Depends on:        160 (community_posts, its status CHECK), 170 (the
--                    `auto` column), 182 (ed_flag_push).
-- Harness:           NOT yet proved on a PostgreSQL 16 harness in this
--                    session (no database available to the lead); the
--                    founder's apply runs the acceptance check below.

-- ─── Part 1: the third status ──────────────────────────────────────────
-- One statement, so there is no instant without the CHECK.
ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_status_check,
  ADD CONSTRAINT community_posts_status_check
  CHECK (status IN ('visible', 'hidden', 'withheld'));

-- ─── Part 2: the helper ───────────────────────────────────────────────
-- Withholds or restores ONE person's automatic posts from the state of
-- their flags. Called by ed_flag_push with auth.uid(); never callable by a
-- client role. Moderation ('hidden') is never touched in either direction.
CREATE OR REPLACE FUNCTION public._community_apply_flag_withhold(_uid uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open boolean;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  -- One person at a time: two devices racing a raise of one flag against a
  -- clear of another cannot leave the posts in the wrong state for the
  -- rest of the cycle.
  PERFORM pg_advisory_xact_lock(hashtext('community_flag_withhold:' || _uid::text));
  SELECT EXISTS (
    SELECT 1 FROM public.ed_pattern_flags f
    WHERE f.user_id = _uid AND f.cleared_at IS NULL AND f.deleted_at IS NULL
  ) INTO v_open;
  IF v_open THEN
    UPDATE public.community_posts
       SET status = 'withheld'
     WHERE author_id = _uid AND auto = true AND status = 'visible';
  ELSE
    UPDATE public.community_posts
       SET status = 'visible'
     WHERE author_id = _uid AND status = 'withheld';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public._community_apply_flag_withhold(uuid) FROM PUBLIC, anon, authenticated;

-- ─── Part 3: ed_flag_push runs the helper (body from migrate_182, one
-- PERFORM added before the final read; every other line is verbatim) ───
CREATE OR REPLACE FUNCTION public.ed_flag_push(
  _id uuid,
  _raised_at timestamptz,
  _cleared_at timestamptz DEFAULT NULL,
  _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.ed_pattern_flags%ROWTYPE;
  v_reason text;
  v_raised timestamptz;
  v_cleared timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _id IS NULL OR _raised_at IS NULL THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  -- A device clock ahead of the server is CLAMPED to now(), never refused
  -- (review L3): a refusal would leave that device's flag out of the cloud
  -- for ever, retried every cycle, with every server gate off for it.
  v_raised := least(_raised_at, now());
  v_cleared := CASE WHEN _cleared_at IS NULL THEN NULL ELSE least(_cleared_at, now()) END;
  v_reason := nullif(left(btrim(coalesce(_reason, '')), 80), '');

  -- The caller's OWN row only: the table's primary key is (user_id, id)
  -- since migrate_018, so every statement here is scoped by user_id and a
  -- row another user holds under the same id is invisible and untouched
  -- (review M1). The row is locked for the rest of the transaction so two
  -- pushes of the same flag cannot interleave (review L1): a concurrent
  -- clear waits, then re-reads the stored clear and keeps it.
  SELECT * INTO v_row FROM public.ed_pattern_flags
   WHERE user_id = v_uid AND id = _id
   FOR UPDATE;
  IF FOUND THEN
    -- FORWARD ONLY, measured against the STORED raise (review L2): a
    -- clear can never precede it (clamped up to it), cleared_at is set once
    -- and never nulled or moved, raised_at and deleted_at are never
    -- touched, reason is set once.
    IF v_cleared IS NOT NULL AND v_cleared < v_row.raised_at THEN
      v_cleared := v_row.raised_at;
    END IF;
    v_cleared := coalesce(v_row.cleared_at, v_cleared);
    UPDATE public.ed_pattern_flags
       SET cleared_at = v_cleared,
           flag_state = CASE WHEN v_cleared IS NULL THEN 'raised' ELSE 'cleared' END,
           reason     = coalesce(v_row.reason, v_reason),
           updated_at = now()
     WHERE user_id = v_uid AND id = _id
       AND (cleared_at IS DISTINCT FROM v_cleared
            OR reason IS DISTINCT FROM coalesce(v_row.reason, v_reason));
  ELSE
    IF v_cleared IS NOT NULL AND v_cleared < v_raised THEN
      v_cleared := v_raised;
    END IF;
    -- Two first pushes of one new flag racing each other: the loser is a
    -- no-op here and re-pushes on its next cycle (the RPC is idempotent).
    INSERT INTO public.ed_pattern_flags
      (id, user_id, flag_state, reason, signals_json, raised_at, cleared_at, updated_at, deleted_at)
    VALUES
      (_id, v_uid,
       CASE WHEN v_cleared IS NULL THEN 'raised' ELSE 'cleared' END,
       v_reason, NULL, v_raised, v_cleared, now(), NULL)
    ON CONFLICT (user_id, id) DO NOTHING;
  END IF;

  -- migrate_192 (D228 addendum Q1): the person's automatic posts follow the
  -- flag. Open flag anywhere on the account: withhold; none open: restore.
  -- Never at the flag's expense: a failure here (a lock or statement
  -- timeout on community_posts, a partial apply) is logged and swallowed,
  -- so the safety row above always lands and the server gates learn it;
  -- the next push cycle runs the helper again.
  BEGIN
    PERFORM public._community_apply_flag_withhold(v_uid);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'community withhold skipped for %: %', v_uid, SQLERRM;
  END;

  SELECT * INTO v_row FROM public.ed_pattern_flags WHERE user_id = v_uid AND id = _id;
  RETURN jsonb_build_object('id', v_row.id, 'state', v_row.flag_state, 'cleared_at', v_row.cleared_at);
END $$;

REVOKE ALL ON FUNCTION public.ed_flag_push(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ed_flag_push(uuid, timestamptz, timestamptz, text) TO authenticated;

-- ─── Part 4: bring existing accounts into line once ─────────────────────
-- Anyone whose flag is open at apply time has their automatic posts
-- withheld now, not at their next push. Idempotent.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.ed_pattern_flags
            WHERE cleared_at IS NULL AND deleted_at IS NULL LOOP
    PERFORM public._community_apply_flag_withhold(r.user_id);
  END LOOP;
END $$;

-- ─── Acceptance check (read-only) ────────────────────────────────────────
-- Expect: the CHECK lists three statuses; the helper exists, SECURITY
-- DEFINER, not executable by anon or authenticated; ed_flag_push's source
-- contains the PERFORM; and the counts of withheld posts and open flags.
SELECT pg_get_constraintdef(oid) AS posts_status_check
  FROM pg_constraint WHERE conname = 'community_posts_status_check';
SELECT p.proname, p.prosecdef,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname IN ('_community_apply_flag_withhold', 'ed_flag_push');
SELECT position('_community_apply_flag_withhold' IN pg_get_functiondef('public.ed_flag_push(uuid, timestamptz, timestamptz, text)'::regprocedure)) > 0 AS push_calls_helper;
SELECT count(*) FILTER (WHERE status = 'withheld') AS withheld_posts,
       (SELECT count(*) FROM public.ed_pattern_flags WHERE cleared_at IS NULL AND deleted_at IS NULL) AS open_flags
  FROM public.community_posts;
