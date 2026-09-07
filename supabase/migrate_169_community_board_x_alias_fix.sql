-- migrate_169_community_board_x_alias_fix.sql
--
-- Purpose:           `community_board` (migrate_165, the "My gym" /
--                    "Following" / "Everyone" / group consistency board)
--                    has failed on EVERY call since it was deployed, for
--                    every user, on every scope and window: founder
--                    device report 2026-09-07 ("Could not load this
--                    board"), confirmed via Sentry (VOLYUME-37 changed
--                    error under the same grouping, Postgres 42P01,
--                    "missing FROM-clause entry for table \"x\"", scope
--                    redacted, first seen 2026-09-06 -- i.e. since the
--                    day 165 shipped).
--
--                    Root cause, read directly off the live function
--                    definition: all three of its ranking CTEs write
--                      SELECT x.*, row_number() OVER (...) AS rnk
--                      FROM (SELECT unnest(v_items) AS x) u
--                    `x` here is the COLUMN alias `unnest(v_items)` was
--                    given, not a table alias -- the derived table itself
--                    is aliased `u`. `x.*` asks Postgres to expand a
--                    table called `x`, which does not exist in this
--                    FROM clause, hence the exact reported error. Every
--                    OTHER Community function using this identical
--                    keyset-paging idiom (migrate_160, 161, 162, 163,
--                    164) correctly writes `SELECT u.x` / `SELECT t.x`;
--                    this is a one-off copy-paste slip isolated to
--                    `community_board`, confirmed by grepping every
--                    `unnest(v_items) AS x` site in the repo. No SQL
--                    syntax error like this can be caught by the JS unit
--                    suite (there is no local Postgres in CI for these
--                    SECURITY DEFINER functions), which is why it
--                    shipped and stayed hidden until first exercised
--                    against production.
--
--                    Fix: replace `SELECT x.*,` with `SELECT u.x,` in all
--                    three CTEs. The column stays named `x` either way
--                    (an unqualified column reference keeps its own
--                    name), so every downstream `r.x ->> '...'` reference
--                    is unaffected. No other change to the function.
--
-- Applied locally:   N/A (cloud-only function).
-- Applied remotely:  NOT YET APPLIED. Founder gate: apply on the exact
--                    phrase "run against production" (CLAUDE.md).
-- Safe to re-run:    Yes. CREATE OR REPLACE FUNCTION, same signature,
--                    grants unchanged (EXECUTE stays revoked from PUBLIC
--                    and anon, granted to authenticated).
-- Rollback:          Re-apply migrate_165's version of `community_board`
--                    (not recommended, restores the 100%-failure defect).
--
-- ─── The fix ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_board(_scope text, _scope_key text DEFAULT NULL::text, _window text DEFAULT 'week'::text, _cursor text DEFAULT NULL::text, _limit integer DEFAULT 20, _today text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid   uuid := public._community_caller();
  v_me    public.community_profiles%ROWTYPE;
  v_lim   int  := public._community_limit(_limit);
  v_row   record;
  v_items jsonb[] := ARRAY[]::jsonb[];
  v_count int := 0;
  v_cur_metric int;
  v_cur_tie    int;
  v_cur_handle text;
  v_cur_id     uuid;
  v_out_rows   jsonb;
  v_last_metric int;
  v_last_tie    int;
  v_last_handle text;
  v_last_id     uuid;
  v_remaining   int;
  v_page_len    int;
  v_next_cursor text;
  v_you_rank   int;
  v_you_metric int;
  v_you jsonb := NULL;
  v_gym_id     uuid;
BEGIN
  IF _scope NOT IN ('gym', 'following', 'group', 'everyone') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _window NOT IN ('week', 'month', 'consistency') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _scope = 'group' AND (_scope_key IS NULL OR btrim(_scope_key) = '') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _today IS NULL OR _today !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'board', 120, 120, interval '1 hour');

  IF _scope = 'group' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.community_group_members m
      WHERE m.group_id = _scope_key::uuid AND m.user_id = v_uid AND m.state = 'member'
    ) THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
  END IF;

  -- Lead ruling (community product audit): gym scope targets `_scope_key`
  -- as the gym id when supplied -- any gym's board, not only the caller's
  -- own -- falling back to the caller's own gym_id when `_scope_key` is
  -- null or blank.
  IF _scope = 'gym' THEN
    IF _scope_key IS NOT NULL AND btrim(_scope_key) <> '' THEN
      BEGIN
        v_gym_id := _scope_key::uuid;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END;
    ELSE
      v_gym_id := v_me.gym_id;
    END IF;
  END IF;

  IF _cursor IS NOT NULL AND btrim(_cursor) <> '' THEN
    BEGIN
      v_cur_metric := split_part(_cursor, '|', 1)::int;
      v_cur_tie    := nullif(split_part(_cursor, '|', 2), '')::int;
      v_cur_handle := nullif(split_part(_cursor, '|', 3), '');
      v_cur_id     := split_part(_cursor, '|', 4)::uuid;
      IF v_cur_id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END;
  END IF;

  -- Design 60 §2: gather every eligible profile (uncapped by page size, so
  -- ranking and the caller's own off-page rank are correct), then rank and
  -- keyset-page in memory the same way community_find_people does.
  FOR v_row IN
    SELECT p.user_id, p.handle, p.c_trained_days_week, p.c_last_trained_day,
      CASE _window WHEN 'week' THEN p.c_sessions_week
                   WHEN 'month' THEN p.c_sessions_month
                   ELSE p.c_weeks_streak END AS metric,
      CASE _window
        WHEN 'week' THEN coalesce(array_length(p.c_trained_days_week, 1), 0)
        WHEN 'consistency' THEN coalesce(p.c_consistent_weeks_12w, 0) * 1000 + coalesce(p.c_planned_pct_4w, 0)
        ELSE 0
      END AS tiebreak
    FROM public.community_profiles p
    WHERE p.status = 'active'
      AND p.is_minor = false
      AND p.share_consistency = true
      AND p.c_updated_at IS NOT NULL
      AND p.c_updated_at >= now() - interval '14 days'
      AND NOT public._community_is_blocked(v_uid, p.user_id)
      AND (
        _scope = 'everyone'
        OR (_scope = 'following' AND (
              p.user_id = v_uid
              OR EXISTS (SELECT 1 FROM public.community_follows f
                         WHERE f.follower_id = v_uid AND f.followee_id = p.user_id AND f.state = 'accepted')))
        OR (_scope = 'gym' AND v_gym_id IS NOT NULL AND (
              p.gym_id = v_gym_id
              OR v_gym_id = ANY (coalesce(p.other_gym_ids, ARRAY[]::uuid[]))))
        OR (_scope = 'group' AND EXISTS (
              SELECT 1 FROM public.community_group_members m
              WHERE m.group_id = _scope_key::uuid AND m.user_id = p.user_id AND m.state = 'member'))
      )
    LIMIT 2000
  LOOP
    IF v_row.metric IS NULL THEN CONTINUE; END IF;
    v_count := v_count + 1;
    v_items := v_items || jsonb_build_object(
      'user_id', v_row.user_id,
      'handle', coalesce(v_row.handle, ''),
      'metric', v_row.metric,
      'tiebreak', v_row.tiebreak,
      'trained_days', to_jsonb(coalesce(v_row.c_trained_days_week, ARRAY[]::text[])),
      'trained_today', (v_row.c_last_trained_day IS NOT NULL AND v_row.c_last_trained_day = _today)
    );
  END LOOP;

  WITH ranked AS (
    SELECT u.x, row_number() OVER (
      ORDER BY (x ->> 'metric')::int DESC, (x ->> 'tiebreak')::int DESC,
               (x ->> 'handle') DESC, (x ->> 'user_id') DESC
    ) AS rnk
    FROM (SELECT unnest(v_items) AS x) u
  )
  SELECT r.rnk, (r.x ->> 'metric')::int INTO v_you_rank, v_you_metric
  FROM ranked r WHERE (r.x ->> 'user_id')::uuid = v_uid;

  IF v_you_rank IS NOT NULL THEN
    v_you := jsonb_build_object('rank', v_you_rank, 'metric', v_you_metric);
  END IF;

  WITH ranked AS (
    SELECT u.x, row_number() OVER (
      ORDER BY (x ->> 'metric')::int DESC, (x ->> 'tiebreak')::int DESC,
               (x ->> 'handle') DESC, (x ->> 'user_id') DESC
    ) AS rnk
    FROM (SELECT unnest(v_items) AS x) u
  ),
  page AS (
    SELECT r.*
    FROM ranked r
    WHERE v_cur_metric IS NULL OR (
      ((r.x ->> 'metric')::int, coalesce((r.x ->> 'tiebreak')::int, 0),
       coalesce(r.x ->> 'handle', ''), (r.x ->> 'user_id')::uuid)
      < (v_cur_metric, coalesce(v_cur_tie, 0), coalesce(v_cur_handle, ''), v_cur_id)
    )
    ORDER BY r.rnk
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
      'card',   public._community_profile_card((p.x ->> 'user_id')::uuid, v_uid),
      'metric', (p.x ->> 'metric')::int,
      'trained_days',  p.x -> 'trained_days',
      'trained_today', (p.x ->> 'trained_today')::boolean,
      'is_you', (p.x ->> 'user_id')::uuid = v_uid,
      'rank',   p.rnk
    ) ORDER BY p.rnk), '[]'::jsonb),
    (array_agg((p.x ->> 'metric')::int ORDER BY p.rnk DESC))[1],
    (array_agg((p.x ->> 'tiebreak')::int ORDER BY p.rnk DESC))[1],
    (array_agg(p.x ->> 'handle' ORDER BY p.rnk DESC))[1],
    (array_agg((p.x ->> 'user_id')::uuid ORDER BY p.rnk DESC))[1]
  INTO v_out_rows, v_last_metric, v_last_tie, v_last_handle, v_last_id
  FROM page p;

  v_out_rows := coalesce(v_out_rows, '[]'::jsonb);
  v_page_len := jsonb_array_length(v_out_rows);

  WITH ranked AS (
    SELECT u.x, row_number() OVER (
      ORDER BY (x ->> 'metric')::int DESC, (x ->> 'tiebreak')::int DESC,
               (x ->> 'handle') DESC, (x ->> 'user_id') DESC
    ) AS rnk
    FROM (SELECT unnest(v_items) AS x) u
  )
  SELECT count(*) INTO v_remaining
  FROM ranked r
  WHERE v_cur_metric IS NULL OR (
    ((r.x ->> 'metric')::int, coalesce((r.x ->> 'tiebreak')::int, 0),
     coalesce(r.x ->> 'handle', ''), (r.x ->> 'user_id')::uuid)
    < (v_cur_metric, coalesce(v_cur_tie, 0), coalesce(v_cur_handle, ''), v_cur_id)
  );

  IF v_remaining > v_lim AND v_page_len > 0 THEN
    v_next_cursor := v_last_metric::text || '|' || coalesce(v_last_tie::text, '')
      || '|' || coalesce(v_last_handle, '') || '|' || v_last_id::text;
  END IF;

  RETURN jsonb_build_object(
    'rows', v_out_rows,
    'you', v_you,
    'count', v_count,
    'threshold_met', v_count >= 8,
    'cursor', v_next_cursor
  );
END $function$;

REVOKE ALL ON FUNCTION public.community_board(text, text, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_board(text, text, text, text, integer, text) TO authenticated;

-- ─── Acceptance check (read-only) ───────────────────────────────────────
DO $$
DECLARE
  v_src text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_src
  FROM pg_proc WHERE proname = 'community_board' AND pronamespace = 'public'::regnamespace;

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_board not found';
  END IF;
  IF v_src ILIKE '%SELECT x.*,%' THEN
    RAISE EXCEPTION 'acceptance failed: the x.* alias bug is still present';
  END IF;
  IF v_src NOT ILIKE '%SELECT u.x,%' THEN
    RAISE EXCEPTION 'acceptance failed: expected qualified u.x reference not found';
  END IF;

  RAISE NOTICE 'migrate_169 acceptance: OK — community_board no longer references a nonexistent table alias';
END $$;
