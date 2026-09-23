-- migrate_181_gym_moderation_lists.sql
--
-- Purpose:           Founder order 2026-09-22, item 7 of eleven ("Moderation
--                    gap. Gym submissions and gym reports can only be
--                    actioned with raw SQL. A minimal moderator screen
--                    closes it."). Audit: docs/audit/community-audit-
--                    2026-09-22/B-functionality-backend-safety-
--                    engineering.md, B-03 and Question 7 ("no app surface
--                    exists to act on a pending gym submission or a venue
--                    report except peer-confirmation... a moderator can
--                    only act via raw SQL").
--
--                    FACT ESTABLISHED FIRST, against migrate_162_gym_
--                    directory.sql (APPLIED to production since 2026-09-07,
--                    unchanged since): `gyms_review_submission` (line 1367)
--                    and `gyms_review_report` (line 1464) ALREADY check
--                    `community_is_moderator()` internally (lines 1380-1382
--                    and 1476-1478 respectively) and ALREADY carry
--                    `GRANT EXECUTE ... TO authenticated` with PUBLIC and
--                    anon revoked -- the same single privilege loop every
--                    other gyms_* RPC goes through (migrate_162 lines
--                    2667-2689, both signatures named at lines 2676-2677).
--                    Confirmed a third, independent way: the ALREADY-PASSING
--                    assertion in src/__tests__/gyms.rpcOnly.guard.test.js
--                    ("both review RPCs require community_is_moderator()",
--                    lines 299-306) pins exactly this. Grepped: neither
--                    migrate_163, migrate_167 nor migrate_168 touches either
--                    function name at all. So the audit's own hedge ("may
--                    be SQL-only") does not hold for either precondition
--                    this migration was asked to check -- the real gap is
--                    CLIENT-ONLY (no JS wrapper, no screen), not a missing
--                    SQL check or a missing grant. This migration therefore
--                    makes NO CHANGE to `gyms_review_submission` or
--                    `gyms_review_report`: not a re-issue, and not even a
--                    defensive re-statement of their grants, because both
--                    already hold exactly what was asked for and a no-op
--                    restatement would only be a drive-by touch of a
--                    function this file has no evidenced reason to open.
--
--                    What this migration actually adds: the missing LISTING
--                    half. Two new SECURITY DEFINER RPCs, `gyms_pending_
--                    submissions(_limit int, _cursor text)` and `gyms_
--                    pending_reports(_limit int, _cursor text)`, so a
--                    moderator has a keyset-paged queue to read before
--                    acting with the existing, unchanged `gyms_review_
--                    submission` / `gyms_review_report`. Both new RPCs:
--                      * refuse `not_allowed` unless `community_is_
--                        moderator()` is true -- the exact refusal code
--                        `gyms_confirm_submission` and both review RPCs
--                        already use, already present in `GYM_ERROR_CODES`
--                        (src/lib/gyms/transport.js), so no client transport
--                        change is needed for this migration to be usable;
--                      * reuse the existing Community keyset-cursor helpers
--                        (`_community_cursor_parts`, `_community_cursor_of`,
--                        `_community_limit`) exactly the way `community_
--                        moderation_queue` already does (migrate_165 lines
--                        1469-1559), the closest existing sibling in shape
--                        and purpose;
--                      * are STABLE: neither writes anything, and migrate_
--                        167's lesson (a STABLE function must never call a
--                        write path such as `_community_rate_check`, or
--                        PostgREST's forced read-only transaction fails the
--                        write deterministically) does not apply here
--                        because neither new RPC calls a write path at all
--                        -- STABLE is both safe and accurate;
--                      * return only what a moderator needs to decide,
--                        never a submitter's or reporter's identity beyond
--                        a count:
--                          - gyms_pending_submissions: each PENDING
--                            gym_submissions row's id, name, address_line,
--                            town, postcode, website, operator,
--                            confirmation_count (the row's own `confirmations`
--                            column -- the count GD-11's two-confirmer rule
--                            already tracks) and created_at;
--                          - gyms_pending_reports: each OPEN gym_reports
--                            row's id, venue_id, the venue's display_name,
--                            reason (the row's own `kind` column, aliased to
--                            match community_moderation_queue's field name
--                            for the same concept), detail, reporter_count
--                            (distinct reporters of the SAME kind on the
--                            SAME venue, still open -- the exact aggregate
--                            gyms_report/gyms_review_report already compute
--                            inline) and created_at.
--                      * apply no `_gyms_visible` filter: a moderator
--                        reviews every pending row, including one submitted
--                        by, or about, someone the moderator could not
--                        otherwise see.
--
-- Applied locally:   N/A -- no local SQLite table; nothing in database.js
--                    changes; PRAGMA user_version is untouched.
-- Applied remotely:  NOT YET - WRITTEN 2026-09-23; waits for the founder's
--                    exact phrase "run against production" (supabase/README
--                    status block is the live record).
-- Safe to re-run:    YES. Both functions are CREATE OR REPLACE; the
--                    REVOKE/GRANT pair is idempotent; the acceptance block
--                    is read-only.
-- Rollback:          DROP FUNCTION public.gyms_pending_submissions(int, text);
--                    DROP FUNCTION public.gyms_pending_reports(int, text);
--                    Nothing else needs reverting: this file changes no
--                    existing function, table, grant or policy.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        160 (_community_cursor_parts, _community_cursor_of,
--                    _community_limit, _community_caller,
--                    community_is_moderator), 162 (gym_submissions,
--                    gym_reports, gym_venues, gyms_review_submission,
--                    gyms_review_report, community_moderators seeded).

-- ─── Part 1: the two RPCs ──────────────────────────────────────────────────

-- Keyset-paged, moderator-only. Shape and helper reuse deliberately mirror
-- community_moderation_queue (migrate_165 lines 1469-1559).
CREATE OR REPLACE FUNCTION public.gyms_pending_submissions(
  _limit int DEFAULT 20, _cursor text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := public._community_caller();
  v_lim  int  := public._community_limit(_limit);
  v_ts   timestamptz;
  v_id   uuid;
  v_rows jsonb;
  v_lts  timestamptz;
  v_lid  uuid;
BEGIN
  IF NOT public.community_is_moderator() THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  WITH page AS (
    SELECT s.*
    FROM public.gym_submissions s
    WHERE s.status = 'pending'
      AND (v_ts IS NULL OR (s.created_at, s.id) < (v_ts, v_id))
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
        'id',              page.id,
        'name',            page.name,
        'address_line',    page.address_line,
        'town',            page.town,
        'postcode',        page.postcode,
        'website',         page.website,
        'operator',        page.operator,
        'confirmation_count', page.confirmations,
        'created_at',      page.created_at)
      ORDER BY page.created_at DESC, page.id DESC), '[]'::jsonb),
    (array_agg(page.created_at ORDER BY page.created_at ASC, page.id ASC))[1],
    (array_agg(page.id         ORDER BY page.created_at ASC, page.id ASC))[1]
  INTO v_rows, v_lts, v_lid
  FROM page;

  RETURN jsonb_build_object(
    'submissions', coalesce(v_rows, '[]'::jsonb),
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;

-- Keyset-paged, moderator-only. One row per OPEN gym_reports record (never
-- grouped): gyms_review_report's own signature targets a single report id,
-- so the listing stays at the same grain the action RPC already acts on.
-- reporter_count gives the moderator the SAME "how many people, of the same
-- kind, on the same venue" context gyms_report/gyms_review_report already
-- compute, without ever naming a reporter.
CREATE OR REPLACE FUNCTION public.gyms_pending_reports(
  _limit int DEFAULT 20, _cursor text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := public._community_caller();
  v_lim  int  := public._community_limit(_limit);
  v_ts   timestamptz;
  v_id   uuid;
  v_rows jsonb;
  v_lts  timestamptz;
  v_lid  uuid;
BEGIN
  IF NOT public.community_is_moderator() THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  WITH page AS (
    SELECT r.*
    FROM public.gym_reports r
    WHERE r.status = 'open'
      AND (v_ts IS NULL OR (r.created_at, r.id) < (v_ts, v_id))
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
        'id',             page.id,
        'venue_id',       page.venue_id,
        'venue_name',     (SELECT v.display_name FROM public.gym_venues v WHERE v.id = page.venue_id),
        'reason',         page.kind,
        'detail',         page.detail,
        'reporter_count', (SELECT count(DISTINCT rc.reporter_id)::int FROM public.gym_reports rc
                            WHERE rc.venue_id = page.venue_id AND rc.kind = page.kind AND rc.status = 'open'),
        'created_at',     page.created_at)
      ORDER BY page.created_at DESC, page.id DESC), '[]'::jsonb),
    (array_agg(page.created_at ORDER BY page.created_at ASC, page.id ASC))[1],
    (array_agg(page.id         ORDER BY page.created_at ASC, page.id ASC))[1]
  INTO v_rows, v_lts, v_lid
  FROM page;

  RETURN jsonb_build_object(
    'reports', coalesce(v_rows, '[]'::jsonb),
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;

-- ─── Part 2: privileges ─────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.gyms_pending_submissions(int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gyms_pending_submissions(int, text) TO authenticated;
REVOKE ALL ON FUNCTION public.gyms_pending_reports(int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gyms_pending_reports(int, text) TO authenticated;

-- ─── Part 3: acceptance check (read-only) ──────────────────────────────────

DO $$
BEGIN
  IF to_regprocedure('public.gyms_pending_submissions(int, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: gyms_pending_submissions missing';
  END IF;
  IF to_regprocedure('public.gyms_pending_reports(int, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: gyms_pending_reports missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('gyms_pending_submissions', 'gyms_pending_reports')
      -- `proconfig IS NULL` named explicitly: `= ANY (NULL)` is NULL, not
      -- false, so a function with NO SET clause would slip through.
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: missing SECURITY DEFINER or the pinned search_path';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('gyms_pending_submissions', 'gyms_pending_reports')
      AND p.provolatile <> 's'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: not STABLE';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.gyms_pending_submissions(int, text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.gyms_pending_reports(int, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: not executable by authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.gyms_pending_submissions(int, text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.gyms_pending_reports(int, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: executable by anon';
  END IF;

  RAISE NOTICE 'migrate_181 acceptance: OK';
END $$;
