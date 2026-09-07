-- migrate_165_community_boards_groups.sql
--
-- Purpose:           Community boards, consistency counters and groups
--                    (community product audit 2026-09-07, authority
--                    `docs/community-product-audit-2026-09-07/
--                    60-DESIGN-PROGRESS-COMMUNITY.md` sections 1-3 and 6,
--                    `40-GAP-CLOSURE.md` sections 4-5). DEPENDS ON 160, 161,
--                    162, 163 and 164; must never run before any of them.
--
--                    1. `community_profiles` gains nine additive columns:
--                       eight device-computed consistency counters
--                       (`c_sessions_week`, `c_sessions_month`,
--                       `c_weeks_streak`, `c_planned_pct_4w`,
--                       `c_consistent_weeks_12w`, `c_trained_days_week`,
--                       `c_last_trained_day`, `c_updated_at`) plus the
--                       publish toggle `share_consistency` (default false).
--                       `community_update_training_profile` re-issued: the
--                       counters are accepted ONLY when `share_consistency`
--                       is sent true; sent false or absent nulls every
--                       counter and the toggle. A minor or a non-active
--                       profile never stores a counter (`_community_require_
--                       profile(v_uid, true)` already refuses a non-active
--                       write; the minor check is explicit alongside it).
--                    2. `community_board(_scope, _scope_key, _window,
--                       _cursor, _limit, _today)` added: one RPC, four
--                       scopes (gym/following/group/everyone), three
--                       windows (week/month/consistency). Eligibility:
--                       active, not minor, `share_consistency`, counters
--                       not null, `c_updated_at` within 14 days, not
--                       blocked either way, group scope requires caller
--                       membership, gym scope matches `gym_id` or
--                       `other_gym_ids` on either side. Ranked over the
--                       WHOLE eligible set (not just the page) so an
--                       off-page caller's own rank is correct; keyset
--                       paged by (metric, tiebreak, handle, user_id), all
--                       descending. `trained_today` compares
--                       `c_last_trained_day` to the caller-supplied local
--                       day `_today` (day-level only, added as a new
--                       trailing parameter -- no existing caller passes
--                       it). Rate rail 120 per hour, the same numbers
--                       `community_find_people` uses.
--                    3. Groups: three new tables, `community_groups`,
--                       `community_group_members`, `community_group_
--                       invites`, RLS on with NO policy for anon/
--                       authenticated (SD-14). Sixteen RPCs: `community_
--                       group_create/_update/_close/_join/_leave/_invite/
--                       _invite_link/_accept_invite/_approve/_remove/
--                       _promote/_list_mine/_get/_members/_search`, plus
--                       `community_group_feed`. Minors refused everywhere a
--                       group is joined, created or administered. A closed
--                       group accepts no new members (join/invite/accept
--                       all refuse `group_closed`) but stays readable to
--                       its existing members. The last admin cannot leave
--                       or be removed without first promoting another
--                       member; `community_group_promote` is how that
--                       member becomes an admin. `community_report` re-
--                       issued to accept `target_kind = 'group'` (owner =
--                       the group's `created_by`); `community_moderation_
--                       queue` re-issued so a group report's preview is
--                       the group's name and blurb. `community_activity.
--                       kind` widens (`group_request`, `group_accepted`,
--                       `group_invited`), so the join/approve/invite
--                       actions get the same activity-row proof and
--                       replay-guard shape `connect_request`/
--                       `connect_accepted` already have; those three ride
--                       the existing `community_follow` notification
--                       category budget (no new category, no push for an
--                       ordinary open-group join). `supabase/functions/
--                       community-notify/index.ts` updated to prove and
--                       push the three kinds from the membership/invite
--                       row. `delete_user_data()` re-issued (latest body
--                       carried by migrate_162, the last file to touch
--                       it) with two-sided deletes for the three group
--                       tables plus the promote-or-close rule: a group
--                       whose only admin is deleted promotes its earliest
--                       remaining member to admin, or closes if none is
--                       left.
--                    4. Acceptance check (Part 12, read-only).
--
-- Push:              none (unchanged from 160: Community stays online-
--                    first, SD-13).
-- Pull:              none (unchanged from 160).
--
-- Applied locally:   N/A - no local SQLite table; nothing in
--                    `src/lib/database.js` changes, `PRAGMA user_version`
--                    is untouched.
--
-- Applied remotely:  NO - WRITTEN, NOT APPLIED. This file waits for the
--                    founder's exact phrase "run against production" for
--                    the batch that contains it (supabase/README.md status
--                    block, CLAUDE.md section 2 "Database schema"). Nothing
--                    here has reached EU-Dublin.
--
-- Safe to re-run:    YES. ADD COLUMN IF NOT EXISTS throughout; the two
--                    CHECK widenings (`community_activity_kind_check`,
--                    `community_reports_target_kind_check`) are each
--                    DROP CONSTRAINT IF EXISTS then re-ADD inside a
--                    duplicate_object-tolerant `DO $$ ... EXCEPTION WHEN
--                    duplicate_object THEN NULL; END $$;` block; every
--                    function is CREATE OR REPLACE; the three new tables
--                    use CREATE TABLE IF NOT EXISTS with their own CHECK
--                    constraints inside duplicate_object-tolerant blocks;
--                    the privilege REVOKE/GRANT loop is idempotent by
--                    construction. Re-running changes nothing.
--
-- Rollback:          REVOKE ALL granted here back off `authenticated` for
--                      every function this file names in the grant loop;
--                      re-apply migrate_162 to restore `delete_user_data()`
--                      to its pre-165 body (162 is the LAST file before
--                      this one to re-issue it); re-apply migrate_164 to
--                      restore `community_update_training_profile`,
--                      `community_report` and `community_moderation_queue`
--                      (161/163/163 respectively are the last files before
--                      this one to declare each -- CREATE OR REPLACE means
--                      the LATEST definition wins until a later file
--                      replaces it again, there is no automatic revert);
--                      drop `community_board`, `community_group_create`,
--                      `_update`, `_close`, `_join`, `_leave`, `_invite`,
--                      `_invite_link`, `_accept_invite`, `_approve`,
--                      `_remove`, `_promote`, `_list_mine`, `_get`,
--                      `_members`, `_search`, `community_group_feed` and
--                      the `_community_group_*` helpers;
--                      DROP TABLE public.community_group_invites,
--                      public.community_group_members,
--                      public.community_groups;
--                      ALTER TABLE public.community_profiles DROP COLUMN
--                      c_sessions_week, c_sessions_month, c_weeks_streak,
--                      c_planned_pct_4w, c_consistent_weeks_12w,
--                      c_trained_days_week, c_last_trained_day,
--                      c_updated_at, share_consistency;
--                      re-narrow both CHECKs to their pre-165 lists (both
--                      re-added by name above, so the previous list is a
--                      one-line edit against 161/164's own headers). No
--                      table this file did not itself create is dropped,
--                      so a rollback loses only this file's own additions.
--
-- GDPR note:         The consistency counters are training-activity
--                    derivatives (session counts and calendar day keys),
--                    never bodyweight, food or measurements, computed on
--                    device from data already covered by the Community
--                    rules consent (Article 6(1)(a)); they are sent only
--                    when the caller explicitly toggles `share_consistency`
--                    on, and turning it off nulls every column server-side
--                    in the same statement (D41 §1). `community_board`
--                    reads only profiles that already opted in and are not
--                    minors; a minor's counters are never accepted in the
--                    first place. `_today` is a caller-supplied local day
--                    key (day-level only, `YYYY-MM-DD`), never a device
--                    position or a timestamp finer than a day. Groups add
--                    no personal-data category beyond a name and a blurb
--                    the creator chooses to write, already the same kind
--                    of voluntary content `community_profiles.bio`
--                    carries; membership rows record only user ids, roles
--                    and state, all deleted by `delete_user_data()` below.
--
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.

-- ─── Part 1: community_profiles gains the consistency counters ───────────

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS c_sessions_week        int,
  ADD COLUMN IF NOT EXISTS c_sessions_month       int,
  ADD COLUMN IF NOT EXISTS c_weeks_streak         int,
  ADD COLUMN IF NOT EXISTS c_planned_pct_4w       smallint,
  ADD COLUMN IF NOT EXISTS c_consistent_weeks_12w smallint,
  ADD COLUMN IF NOT EXISTS c_trained_days_week    text[],
  ADD COLUMN IF NOT EXISTS c_last_trained_day     text,
  ADD COLUMN IF NOT EXISTS c_updated_at           timestamptz,
  ADD COLUMN IF NOT EXISTS share_consistency      boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS community_profiles_share_consistency_idx
  ON public.community_profiles (share_consistency, status, is_minor, c_updated_at DESC)
  WHERE share_consistency = true;

-- ─── Part 2: three group tables, RLS on, no policy (SD-14) ───────────────

CREATE TABLE IF NOT EXISTS public.community_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  blurb        text,
  access       text NOT NULL DEFAULT 'open',
  created_by   uuid NOT NULL REFERENCES public.community_profiles(user_id) ON DELETE RESTRICT,
  member_count int NOT NULL DEFAULT 1,
  status       text NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.community_groups
    ADD CONSTRAINT community_groups_name_len_check CHECK (char_length(name) BETWEEN 1 AND 40);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_groups
    ADD CONSTRAINT community_groups_blurb_len_check CHECK (blurb IS NULL OR char_length(blurb) <= 140);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_groups
    ADD CONSTRAINT community_groups_access_check CHECK (access IN ('open', 'invite'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_groups
    ADD CONSTRAINT community_groups_status_check CHECK (status IN ('active', 'closed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS community_groups_name_idx
  ON public.community_groups (lower(name) text_pattern_ops) WHERE access = 'open' AND status = 'active';
CREATE INDEX IF NOT EXISTS community_groups_created_by_idx
  ON public.community_groups (created_by);

CREATE TABLE IF NOT EXISTS public.community_group_members (
  group_id  uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES public.community_profiles(user_id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member',
  state     text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

DO $$ BEGIN
  ALTER TABLE public.community_group_members
    ADD CONSTRAINT community_group_members_role_check CHECK (role IN ('admin', 'member'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_group_members
    ADD CONSTRAINT community_group_members_state_check
    CHECK (state IN ('member', 'requested', 'invited'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS community_group_members_user_idx
  ON public.community_group_members (user_id, state);
CREATE INDEX IF NOT EXISTS community_group_members_group_idx
  ON public.community_group_members (group_id, state, joined_at DESC, user_id DESC);

CREATE TABLE IF NOT EXISTS public.community_group_invites (
  token      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.community_profiles(user_id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_group_invites_group_idx
  ON public.community_group_invites (group_id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'community_groups', 'community_group_members', 'community_group_invites'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- ─── Part 3: CHECK widenings ──────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.community_activity
    DROP CONSTRAINT IF EXISTS community_activity_kind_check;
  ALTER TABLE public.community_activity
    ADD CONSTRAINT community_activity_kind_check
    CHECK (kind IN ('follow', 'follow_request', 'follow_accepted',
                    'reaction', 'comment', 'programme_used',
                    'connect_request', 'connect_accepted',
                    'group_request', 'group_accepted', 'group_invited'));
END $$;

DO $$ BEGIN
  ALTER TABLE public.community_reports
    DROP CONSTRAINT IF EXISTS community_reports_target_kind_check;
  ALTER TABLE public.community_reports
    ADD CONSTRAINT community_reports_target_kind_check
    CHECK (target_kind IN ('profile', 'post', 'comment', 'programme', 'message', 'group'));
END $$;

-- ─── Part 4: community_update_training_profile re-issued (counters) ──────

CREATE OR REPLACE FUNCTION public.community_update_training_profile(_p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_me       public.community_profiles%ROWTYPE;
  v_days     text[];
  v_bands    text[];
  v_lifts    text[];
  v_sessions text;
  v_exp      text;
  v_prog     text;
  v_share    boolean := false;
  v_age      text;
  v_raw      text;
  v_dob      date;
  v_years    int;
  v_v        text;
  -- Design 60 §1: consistency counters, accepted only when share_consistency
  -- is sent true; a minor or non-active caller never gets one stored.
  v_share_consistency boolean := false;
  v_c_sessions_week    int;
  v_c_sessions_month   int;
  v_c_weeks_streak     int;
  v_c_planned_pct_4w   smallint;
  v_c_consistent_12w   smallint;
  v_c_trained_days     text[];
  v_c_last_trained_day text;
BEGIN
  IF _p IS NULL OR jsonb_typeof(_p) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  -- Belt and braces: a payload that somehow carried a body or nutrition key
  -- is refused before anything is written (migrate_160 Part 7).
  PERFORM public._community_forbidden_keys(_p);

  v_me := public._community_require_profile(v_uid, true);
  PERFORM public._community_require_rules(v_me);

  IF jsonb_typeof(_p -> 'tp_days') = 'array' THEN
    SELECT array_agg(s.d ORDER BY array_position(public._community_tp_days_list(), s.d))
    INTO v_days
    FROM (SELECT DISTINCT value AS d FROM jsonb_array_elements_text(_p -> 'tp_days')) s;
    IF v_days IS NOT NULL THEN
      IF array_length(v_days, 1) > 7 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      FOREACH v_v IN ARRAY v_days LOOP
        IF NOT (v_v = ANY (public._community_tp_days_list())) THEN
          RAISE EXCEPTION USING message = 'invalid_input';
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF jsonb_typeof(_p -> 'tp_time_bands') = 'array' THEN
    SELECT array_agg(s.b ORDER BY array_position(public._community_tp_time_bands_list(), s.b))
    INTO v_bands
    FROM (SELECT DISTINCT value AS b FROM jsonb_array_elements_text(_p -> 'tp_time_bands')) s;
    IF v_bands IS NOT NULL THEN
      IF array_length(v_bands, 1) > 2 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      FOREACH v_v IN ARRAY v_bands LOOP
        IF NOT (v_v = ANY (public._community_tp_time_bands_list())) THEN
          RAISE EXCEPTION USING message = 'invalid_input';
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF jsonb_typeof(_p -> 'tp_staple_lifts') = 'array' THEN
    SELECT array_agg(s.l) INTO v_lifts
    FROM (SELECT DISTINCT value AS l FROM jsonb_array_elements_text(_p -> 'tp_staple_lifts')) s;
    IF v_lifts IS NOT NULL THEN
      IF array_length(v_lifts, 1) > 5 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      FOREACH v_v IN ARRAY v_lifts LOOP
        IF v_v !~ '^[a-z0-9_:-]{1,64}$' THEN
          RAISE EXCEPTION USING message = 'invalid_input';
        END IF;
      END LOOP;
    END IF;
  END IF;

  v_sessions := nullif(btrim(coalesce(_p ->> 'tp_sessions_band', '')), '');
  IF v_sessions IS NOT NULL
     AND NOT (v_sessions = ANY (public._community_tp_sessions_list())) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_exp := nullif(btrim(coalesce(_p ->> 'tp_experience_band', '')), '');
  IF v_exp IS NOT NULL
     AND NOT (v_exp = ANY (public._community_tp_experience_list())) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_prog := nullif(btrim(coalesce(_p ->> 'tp_programme_key', '')), '');
  IF v_prog IS NOT NULL THEN
    IF v_prog LIKE 'community:%' THEN v_prog := btrim(substring(v_prog FROM 11)); END IF;
    IF NOT (v_prog ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            OR v_prog ~ '^style:[a-z0-9_]{1,64}$') THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    IF v_prog !~ '^style:' AND NOT public._community_can_view_programme(v_uid, v_prog::uuid) THEN
      v_prog := NULL;
    END IF;
  END IF;

  IF jsonb_typeof(_p -> 'share_age_band') = 'boolean' THEN
    v_share := (_p ->> 'share_age_band')::boolean;
  END IF;
  IF v_share AND NOT public._community_caller_is_minor(v_uid) THEN
    SELECT date_of_birth INTO v_raw FROM public.user_body_profile
    WHERE user_id = v_uid LIMIT 1;
    IF v_raw IS NOT NULL AND btrim(v_raw) <> '' THEN
      BEGIN
        v_dob := substring(btrim(v_raw) FROM 1 FOR 10)::date;
      EXCEPTION WHEN others THEN
        v_dob := NULL;
      END;
    END IF;
    IF v_dob IS NOT NULL THEN
      v_years := date_part('year', age(current_date, v_dob))::int;
      v_age := CASE
        WHEN v_years < 18 THEN NULL
        WHEN v_years <= 24 THEN '18_24'
        WHEN v_years <= 34 THEN '25_34'
        WHEN v_years <= 44 THEN '35_44'
        WHEN v_years <= 54 THEN '45_54'
        ELSE '55_plus'
      END;
    END IF;
  END IF;

  -- Design 60 §1: the counters travel only when share_consistency is sent
  -- true, and only for a caller who is neither a minor nor restricted (the
  -- `_community_require_profile(v_uid, true)` call above already refused a
  -- non-active caller before this point is reached). Every counter is
  -- validated key-by-key -- jsonb has no CHECK-constraint equivalent -- and
  -- an out-of-range value is simply dropped (null), never a hard refusal:
  -- a device on a stale build sending one bad field should not lose every
  -- other field it sent correctly.
  IF jsonb_typeof(_p -> 'share_consistency') = 'boolean' THEN
    v_share_consistency := (_p ->> 'share_consistency')::boolean;
  END IF;
  IF v_share_consistency AND public._community_caller_is_minor(v_uid) THEN
    v_share_consistency := false;
  END IF;

  IF v_share_consistency THEN
    IF jsonb_typeof(_p -> 'c_sessions_week') = 'number' THEN
      v_c_sessions_week := greatest(0, least((_p ->> 'c_sessions_week')::int, 21));
    END IF;
    IF jsonb_typeof(_p -> 'c_sessions_month') = 'number' THEN
      v_c_sessions_month := greatest(0, least((_p ->> 'c_sessions_month')::int, 93));
    END IF;
    IF jsonb_typeof(_p -> 'c_weeks_streak') = 'number' THEN
      v_c_weeks_streak := greatest(0, least((_p ->> 'c_weeks_streak')::int, 520));
    END IF;
    IF jsonb_typeof(_p -> 'c_planned_pct_4w') = 'number' THEN
      v_c_planned_pct_4w := greatest(0, least((_p ->> 'c_planned_pct_4w')::int, 100))::smallint;
    END IF;
    IF jsonb_typeof(_p -> 'c_consistent_weeks_12w') = 'number' THEN
      v_c_consistent_12w := greatest(0, least((_p ->> 'c_consistent_weeks_12w')::int, 12))::smallint;
    END IF;
    IF jsonb_typeof(_p -> 'c_trained_days_week') = 'array' THEN
      SELECT array_agg(DISTINCT value) INTO v_c_trained_days
      FROM jsonb_array_elements_text(_p -> 'c_trained_days_week') AS value
      WHERE value IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
    END IF;
    v_c_last_trained_day := nullif(btrim(coalesce(_p ->> 'c_last_trained_day', '')), '');
    IF v_c_last_trained_day IS NOT NULL AND v_c_last_trained_day !~ '^\d{4}-\d{2}-\d{2}$' THEN
      v_c_last_trained_day := NULL;
    END IF;
  END IF;

  PERFORM public._community_rate_check(v_uid, 'update_training_profile', 120, 120, interval '1 hour');

  UPDATE public.community_profiles SET
    tp_days            = v_days,
    tp_time_bands      = v_bands,
    tp_sessions_band   = v_sessions,
    tp_staple_lifts    = v_lifts,
    tp_experience_band = v_exp,
    tp_programme_key   = v_prog,
    tp_age_band        = v_age,
    tp_updated_at      = now(),
    share_consistency      = v_share_consistency,
    c_sessions_week        = v_c_sessions_week,
    c_sessions_month       = v_c_sessions_month,
    c_weeks_streak         = v_c_weeks_streak,
    c_planned_pct_4w       = v_c_planned_pct_4w,
    c_consistent_weeks_12w = v_c_consistent_12w,
    c_trained_days_week    = v_c_trained_days,
    c_last_trained_day     = v_c_last_trained_day,
    c_updated_at           = CASE WHEN v_share_consistency THEN now() ELSE NULL END
  WHERE user_id = v_uid;

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

-- ─── Part 5: community_board (design 60 §2) ───────────────────────────────

CREATE OR REPLACE FUNCTION public.community_board(
  _scope text, _scope_key text DEFAULT NULL, _window text DEFAULT 'week',
  _cursor text DEFAULT NULL, _limit int DEFAULT 20, _today text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
        OR (_scope = 'gym' AND v_me.gym_id IS NOT NULL AND (
              p.gym_id = v_me.gym_id
              OR v_me.gym_id = ANY (coalesce(p.other_gym_ids, ARRAY[]::uuid[]))
              OR p.gym_id = ANY (coalesce(v_me.other_gym_ids, ARRAY[]::uuid[]))))
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
    SELECT x.*, row_number() OVER (
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
    SELECT x.*, row_number() OVER (
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
    SELECT x.*, row_number() OVER (
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
END $$;

-- ─── Part 6: group helpers ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._community_group_role(_gid uuid, _uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.role FROM public.community_group_members m
  WHERE m.group_id = _gid AND m.user_id = _uid AND m.state = 'member';
$$;

CREATE OR REPLACE FUNCTION public._community_group_is_admin(_gid uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public._community_group_role(_gid, _uid) = 'admin';
$$;

-- The number of remaining admin MEMBERS a group has, excluding `_exclude`
-- (used to test "would removing/demoting this admin leave zero").
CREATE OR REPLACE FUNCTION public._community_group_admin_count(_gid uuid, _exclude uuid DEFAULT NULL)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::int FROM public.community_group_members m
  WHERE m.group_id = _gid AND m.role = 'admin' AND m.state = 'member'
    AND (_exclude IS NULL OR m.user_id <> _exclude);
$$;

CREATE OR REPLACE FUNCTION public._community_group_card(_g public.community_groups)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', _g.id, 'name', _g.name, 'blurb', _g.blurb, 'access', _g.access,
    'created_by', _g.created_by, 'member_count', _g.member_count,
    'status', _g.status, 'created_at', _g.created_at
  );
$$;

-- ─── Part 7: group create / update / close / leave (admin actions) ──────

CREATE OR REPLACE FUNCTION public.community_group_create(_name text, _blurb text DEFAULT NULL, _access text DEFAULT 'open')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_me    public.community_profiles%ROWTYPE;
  v_name  text;
  v_blurb text;
  v_g     public.community_groups%ROWTYPE;
BEGIN
  v_me := public._community_require_profile(v_uid, true);
  IF public._community_caller_is_minor(v_uid) THEN
    RAISE EXCEPTION USING message = 'minor_restricted';
  END IF;
  IF _access NOT IN ('open', 'invite') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_name := public._community_clean_text(btrim(coalesce(_name, '')));
  IF v_name IS NULL OR length(v_name) < 1 OR length(v_name) > 40 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_blurb := nullif(btrim(coalesce(_blurb, '')), '');
  IF v_blurb IS NOT NULL THEN
    v_blurb := public._community_clean_text(v_blurb);
    IF length(v_blurb) > 140 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  END IF;

  PERFORM public._community_rate_check(v_uid, 'group_create', 5, 20, interval '1 hour');

  INSERT INTO public.community_groups (name, blurb, access, created_by)
  VALUES (v_name, v_blurb, _access, v_uid)
  RETURNING * INTO v_g;

  INSERT INTO public.community_group_members (group_id, user_id, role, state)
  VALUES (v_g.id, v_uid, 'admin', 'member');

  RETURN public._community_group_card(v_g);
END $$;

CREATE OR REPLACE FUNCTION public.community_group_update(
  _group_id uuid, _name text DEFAULT NULL, _blurb text DEFAULT NULL, _access text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := public._community_caller();
  v_g    public.community_groups%ROWTYPE;
  v_name text;
  v_blurb text;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF NOT public._community_group_is_admin(_group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_g.status <> 'active' THEN RAISE EXCEPTION USING message = 'group_closed'; END IF;

  IF _name IS NOT NULL THEN
    v_name := public._community_clean_text(btrim(_name));
    IF v_name IS NULL OR length(v_name) < 1 OR length(v_name) > 40 THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
  END IF;
  IF _blurb IS NOT NULL THEN
    v_blurb := nullif(btrim(_blurb), '');
    IF v_blurb IS NOT NULL THEN
      v_blurb := public._community_clean_text(v_blurb);
      IF length(v_blurb) > 140 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
    END IF;
  END IF;
  IF _access IS NOT NULL AND _access NOT IN ('open', 'invite') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  UPDATE public.community_groups SET
    name       = coalesce(v_name, name),
    blurb      = CASE WHEN _blurb IS NOT NULL THEN v_blurb ELSE blurb END,
    access     = coalesce(_access, access),
    updated_at = now()
  WHERE id = _group_id
  RETURNING * INTO v_g;

  RETURN public._community_group_card(v_g);
END $$;

CREATE OR REPLACE FUNCTION public.community_group_close(_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_g   public.community_groups%ROWTYPE;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF NOT public._community_group_is_admin(_group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  UPDATE public.community_groups SET status = 'closed', updated_at = now()
  WHERE id = _group_id
  RETURNING * INTO v_g;

  RETURN public._community_group_card(v_g);
END $$;

CREATE OR REPLACE FUNCTION public.community_group_leave(_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := public._community_caller();
  v_role text;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  v_role := public._community_group_role(_group_id, v_uid);
  IF v_role IS NULL THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  -- The last admin cannot leave without first promoting someone else
  -- (community_group_promote), so a group is never left with zero admins.
  IF v_role = 'admin' AND public._community_group_admin_count(_group_id, v_uid) = 0 THEN
    RAISE EXCEPTION USING message = 'last_admin';
  END IF;

  DELETE FROM public.community_group_members WHERE group_id = _group_id AND user_id = v_uid;
  UPDATE public.community_groups
  SET member_count = greatest(0, member_count - 1), updated_at = now()
  WHERE id = _group_id;

  RETURN jsonb_build_object('left', true);
END $$;

-- ─── Part 8: join / approve / remove / promote ───────────────────────────

CREATE OR REPLACE FUNCTION public.community_group_join(_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_g   public.community_groups%ROWTYPE;
  v_existing text;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  IF public._community_caller_is_minor(v_uid) THEN
    RAISE EXCEPTION USING message = 'minor_restricted';
  END IF;

  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF v_g.status <> 'active' THEN RAISE EXCEPTION USING message = 'group_closed'; END IF;

  SELECT state INTO v_existing FROM public.community_group_members
  WHERE group_id = _group_id AND user_id = v_uid;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION USING message = 'already_member';
  END IF;

  PERFORM public._community_rate_check(v_uid, 'group_join', 30, 100, interval '1 hour');

  IF v_g.access = 'open' THEN
    INSERT INTO public.community_group_members (group_id, user_id, role, state)
    VALUES (_group_id, v_uid, 'member', 'member');
    UPDATE public.community_groups SET member_count = member_count + 1, updated_at = now()
    WHERE id = _group_id;
    -- Design 60 §3: no push for an ordinary open-group join.
    RETURN jsonb_build_object('state', 'member');
  ELSE
    INSERT INTO public.community_group_members (group_id, user_id, role, state)
    VALUES (_group_id, v_uid, 'member', 'requested');
    -- Notified to every admin as `group_request` (design 60 §3); the
    -- client fans this out to each admin the way it already does for
    -- follow requests.
    PERFORM public._community_add_activity(a.user_id, v_uid, 'group_request', 'group', _group_id)
    FROM public.community_group_members a
    WHERE a.group_id = _group_id AND a.role = 'admin' AND a.state = 'member';
    RETURN jsonb_build_object('state', 'requested');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.community_group_approve(_group_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_g   public.community_groups%ROWTYPE;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF NOT public._community_group_is_admin(_group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_g.status <> 'active' THEN RAISE EXCEPTION USING message = 'group_closed'; END IF;

  UPDATE public.community_group_members
  SET state = 'member', joined_at = now()
  WHERE group_id = _group_id AND user_id = _user_id AND state = 'requested';
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  UPDATE public.community_groups SET member_count = member_count + 1, updated_at = now()
  WHERE id = _group_id;

  PERFORM public._community_add_activity(_user_id, v_uid, 'group_accepted', 'group', _group_id);

  RETURN jsonb_build_object('approved', true);
END $$;

CREATE OR REPLACE FUNCTION public.community_group_remove(_group_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := public._community_caller();
  v_role text;
  v_was_member boolean;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  IF NOT public._community_group_is_admin(_group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF _user_id = v_uid THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  SELECT role, state = 'member' INTO v_role, v_was_member
  FROM public.community_group_members WHERE group_id = _group_id AND user_id = _user_id;
  IF v_role IS NULL THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  -- The last admin cannot be removed either, mirroring community_group_leave.
  IF v_role = 'admin' AND public._community_group_admin_count(_group_id, _user_id) = 0 THEN
    RAISE EXCEPTION USING message = 'last_admin';
  END IF;

  DELETE FROM public.community_group_members WHERE group_id = _group_id AND user_id = _user_id;
  IF v_was_member THEN
    UPDATE public.community_groups
    SET member_count = greatest(0, member_count - 1), updated_at = now()
    WHERE id = _group_id;
  END IF;

  RETURN jsonb_build_object('removed', true);
END $$;

CREATE OR REPLACE FUNCTION public.community_group_promote(_group_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  IF NOT public._community_group_is_admin(_group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  UPDATE public.community_group_members
  SET role = 'admin'
  WHERE group_id = _group_id AND user_id = _user_id AND state = 'member';
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  RETURN jsonb_build_object('promoted', true);
END $$;

-- ─── Part 9: invite by handle, invite link, accept ───────────────────────

CREATE OR REPLACE FUNCTION public.community_group_invite(_group_id uuid, _handle text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_g   public.community_groups%ROWTYPE;
  v_target uuid;
  v_existing text;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF NOT public._community_group_is_admin(_group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_g.status <> 'active' THEN RAISE EXCEPTION USING message = 'group_closed'; END IF;

  SELECT user_id INTO v_target FROM public.community_profiles
  WHERE handle = lower(btrim(coalesce(_handle, '')));
  IF v_target IS NULL THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF public._community_other_is_minor(v_target) THEN
    RAISE EXCEPTION USING message = 'minor_restricted';
  END IF;
  IF public._community_is_blocked(v_uid, v_target) THEN
    RAISE EXCEPTION USING message = 'blocked';
  END IF;

  SELECT state INTO v_existing FROM public.community_group_members
  WHERE group_id = _group_id AND user_id = v_target;
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION USING message = 'already_member'; END IF;

  PERFORM public._community_rate_check(v_uid, 'group_invite', 30, 100, interval '1 hour');

  INSERT INTO public.community_group_members (group_id, user_id, role, state)
  VALUES (_group_id, v_target, 'member', 'invited');

  PERFORM public._community_add_activity(v_target, v_uid, 'group_invited', 'group', _group_id);

  RETURN jsonb_build_object('invited', v_target);
END $$;

CREATE OR REPLACE FUNCTION public.community_group_invite_link(_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_g   public.community_groups%ROWTYPE;
  v_token uuid;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF NOT public._community_group_is_admin(_group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_g.status <> 'active' THEN RAISE EXCEPTION USING message = 'group_closed'; END IF;

  PERFORM public._community_rate_check(v_uid, 'group_invite_link', 10, 30, interval '1 hour');

  INSERT INTO public.community_group_invites (group_id, created_by)
  VALUES (_group_id, v_uid)
  RETURNING token INTO v_token;

  RETURN jsonb_build_object('token', v_token, 'expires_at', now() + interval '14 days');
END $$;

CREATE OR REPLACE FUNCTION public.community_group_accept_invite(_token uuid DEFAULT NULL, _group_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_inv public.community_group_invites%ROWTYPE;
  v_g   public.community_groups%ROWTYPE;
  v_gid uuid;
  v_existing text;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  IF public._community_caller_is_minor(v_uid) THEN
    RAISE EXCEPTION USING message = 'minor_restricted';
  END IF;
  IF _token IS NULL AND _group_id IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF _token IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.community_group_invites WHERE token = _token;
    IF NOT FOUND OR v_inv.expires_at < now() THEN
      RAISE EXCEPTION USING message = 'not_found';
    END IF;
    v_gid := v_inv.group_id;
  ELSE
    v_gid := _group_id;
    SELECT state INTO v_existing FROM public.community_group_members
    WHERE group_id = v_gid AND user_id = v_uid;
    IF v_existing IS DISTINCT FROM 'invited' THEN
      RAISE EXCEPTION USING message = 'not_found';
    END IF;
  END IF;

  SELECT * INTO v_g FROM public.community_groups WHERE id = v_gid;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF v_g.status <> 'active' THEN RAISE EXCEPTION USING message = 'group_closed'; END IF;

  IF _token IS NOT NULL THEN
    SELECT state INTO v_existing FROM public.community_group_members
    WHERE group_id = v_gid AND user_id = v_uid;
    IF v_existing = 'member' THEN RAISE EXCEPTION USING message = 'already_member'; END IF;
  END IF;

  IF v_existing = 'invited' THEN
    UPDATE public.community_group_members SET state = 'member', joined_at = now()
    WHERE group_id = v_gid AND user_id = v_uid;
  ELSE
    -- A link accepted by someone with no pending invite row: an open group
    -- admits directly, an invite-only group is still admitted by the link
    -- (the link IS the invitation) unless already a member/requested.
    IF v_existing IS NOT NULL THEN RAISE EXCEPTION USING message = 'already_member'; END IF;
    INSERT INTO public.community_group_members (group_id, user_id, role, state)
    VALUES (v_gid, v_uid, 'member', 'member');
  END IF;

  UPDATE public.community_groups SET member_count = member_count + 1, updated_at = now()
  WHERE id = v_gid;

  RETURN public._community_group_card(v_g);
END $$;

-- ─── Part 10: list mine / get / members / search / feed ─────────────────

CREATE OR REPLACE FUNCTION public.community_group_list_mine()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_out jsonb;
BEGIN
  PERFORM public._community_require_profile(v_uid, false);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'group', public._community_group_card(g), 'role', m.role, 'state', m.state)
         ORDER BY m.joined_at DESC), '[]'::jsonb)
  INTO v_out
  FROM public.community_group_members m
  JOIN public.community_groups g ON g.id = m.group_id
  WHERE m.user_id = v_uid AND m.state IN ('member', 'requested', 'invited');

  RETURN jsonb_build_object('groups', v_out);
END $$;

CREATE OR REPLACE FUNCTION public.community_group_get(_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_g   public.community_groups%ROWTYPE;
  v_role text;
  v_out jsonb;
BEGIN
  PERFORM public._community_require_profile(v_uid, false);
  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  v_role := public._community_group_role(_group_id, v_uid);
  v_out := public._community_group_card(v_g);
  -- Design 60 §3: name and count visible to all for an open group, name
  -- only for an invite group, unless the caller is already a member.
  IF v_role IS NULL AND v_g.access = 'invite' THEN
    v_out := v_out - 'member_count' - 'blurb';
  END IF;
  RETURN v_out || jsonb_build_object('my_role', v_role, 'my_state',
    (SELECT state FROM public.community_group_members WHERE group_id = _group_id AND user_id = v_uid));
END $$;

CREATE OR REPLACE FUNCTION public.community_group_members(
  _group_id uuid, _cursor text DEFAULT NULL, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_lim int  := public._community_limit(_limit);
  v_ts  timestamptz;
  v_id  uuid;
  v_rows jsonb;
  v_lts timestamptz;
  v_lid uuid;
BEGIN
  PERFORM public._community_require_profile(v_uid, false);
  -- Design 60 §3: the roster is visible to members only. Requests are
  -- included only for an admin caller (the queue), never for an ordinary
  -- member.
  IF public._community_group_role(_group_id, v_uid) IS NULL THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  WITH page AS (
    SELECT m.user_id, m.role, m.state, m.joined_at
    FROM public.community_group_members m
    WHERE m.group_id = _group_id
      AND (m.state = 'member'
           OR (m.state = 'requested' AND public._community_group_is_admin(_group_id, v_uid)))
      AND (v_ts IS NULL OR (m.joined_at, m.user_id) < (v_ts, v_id))
    ORDER BY m.joined_at DESC, m.user_id DESC
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
      'card', public._community_profile_card(page.user_id, v_uid),
      'role', page.role, 'state', page.state) ORDER BY page.joined_at DESC, page.user_id DESC), '[]'::jsonb),
    (array_agg(page.joined_at ORDER BY page.joined_at ASC, page.user_id ASC))[1],
    (array_agg(page.user_id   ORDER BY page.joined_at ASC, page.user_id ASC))[1]
  INTO v_rows, v_lts, v_lid
  FROM page;

  RETURN jsonb_build_object('members', coalesce(v_rows, '[]'::jsonb),
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;

CREATE OR REPLACE FUNCTION public.community_group_search(_q text, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_lim int  := least(public._community_limit(_limit), 40);
  v_q   text := nullif(public._community_fold(_q), '');
  v_out jsonb;
BEGIN
  PERFORM public._community_require_profile(v_uid, false);
  IF v_q IS NULL OR length(v_q) < 2 THEN
    RETURN jsonb_build_object('groups', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(public._community_group_card(g) ORDER BY g.name ASC), '[]'::jsonb)
  INTO v_out
  FROM public.community_groups g
  WHERE g.access = 'open' AND g.status = 'active'
    AND lower(g.name) LIKE lower(v_q) || '%'
  LIMIT v_lim;

  RETURN jsonb_build_object('groups', coalesce(v_out, '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.community_group_feed(
  _group_id uuid, _cursor text DEFAULT NULL, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
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
  PERFORM public._community_require_profile(v_uid, false);
  IF public._community_group_role(_group_id, v_uid) IS NULL THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  WITH page AS (
    SELECT r AS rec, r.created_at AS created_at, r.id AS id, r.author_id AS author_id
    FROM public.community_posts r
    WHERE r.status = 'visible'
      AND EXISTS (
        SELECT 1 FROM public.community_group_members m
        WHERE m.group_id = _group_id AND m.user_id = r.author_id AND m.state = 'member')
      AND public._community_can_view_post(v_uid, r.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes m
        WHERE m.muter_id = v_uid AND m.muted_id = r.author_id)
      AND NOT public._community_is_blocked(v_uid, r.author_id)
      AND EXISTS (
        SELECT 1 FROM public.community_profiles ap
        WHERE ap.user_id = r.author_id AND ap.status <> 'suspended')
      AND (v_ts IS NULL OR (r.created_at, r.id) < (v_ts, v_id))
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
        'post',   public._community_post_json(page.rec),
        'author', public._community_profile_card(page.author_id, v_uid),
        'my_reaction', EXISTS (
          SELECT 1 FROM public.community_reactions rr
          WHERE rr.post_id = page.id AND rr.user_id = v_uid))
      ORDER BY page.created_at DESC, page.id DESC), '[]'::jsonb),
    (array_agg(page.created_at ORDER BY page.created_at ASC, page.id ASC))[1],
    (array_agg(page.id         ORDER BY page.created_at ASC, page.id ASC))[1]
  INTO v_rows, v_lts, v_lid
  FROM page;

  RETURN jsonb_build_object(
    'posts', coalesce(v_rows, '[]'::jsonb),
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;

-- ─── Part 11: community_report / community_moderation_queue re-issued
--              (target_kind = 'group'); delete_user_data re-issued ──────

CREATE OR REPLACE FUNCTION public.community_report(
  _target_kind text, _target_id uuid, _reason text, _detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_owner  uuid;
  v_detail text;
  v_id     uuid;
BEGIN
  IF _target_kind NOT IN ('profile', 'post', 'comment', 'message', 'group')
     OR _target_id IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _reason NOT IN ('spam', 'harassment', 'impersonation',
                     'harmful_body_or_eating_content', 'inappropriate', 'other') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_reports
    WHERE reporter_id = v_uid AND target_kind = _target_kind
      AND target_id = _target_id AND status = 'open'
  ) THEN
    RAISE EXCEPTION USING message = 'already_reported';
  END IF;

  PERFORM public._community_rate_check(v_uid, 'report', 20, 20);

  v_detail := nullif(btrim(coalesce(_detail, '')), '');
  IF v_detail IS NOT NULL AND length(v_detail) > 1000 THEN
    v_detail := left(v_detail, 1000);
  END IF;

  IF _target_kind = 'profile' THEN
    SELECT user_id  INTO v_owner FROM public.community_profiles   WHERE user_id = _target_id;
  ELSIF _target_kind = 'post' THEN
    SELECT author_id INTO v_owner FROM public.community_posts      WHERE id = _target_id;
  ELSIF _target_kind = 'comment' THEN
    SELECT author_id INTO v_owner FROM public.community_comments   WHERE id = _target_id;
  ELSIF _target_kind = 'group' THEN
    -- Design 60 §3: the group's owner is its creator.
    SELECT created_by INTO v_owner FROM public.community_groups WHERE id = _target_id;
  ELSE
    SELECT m.sender_id INTO v_owner
    FROM public.community_messages m
    JOIN public.community_conversations c ON c.id = m.conversation_id
    WHERE m.id = _target_id AND (c.user_a = v_uid OR c.user_b = v_uid);
  END IF;
  IF v_owner IS NULL THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  INSERT INTO public.community_reports
    (reporter_id, target_kind, target_id, target_owner_id, reason, detail, priority)
  VALUES (v_uid, _target_kind, _target_id, v_owner, _reason, v_detail,
          _reason = 'harmful_body_or_eating_content')
  RETURNING id INTO v_id;

  -- migrate_160's auto-hide only knows post/comment/programme; a group is
  -- never auto-hidden (the same posture a profile already has -- suspension
  -- is a human decision), so it is deliberately not passed through.
  IF _target_kind IN ('post', 'comment') THEN
    PERFORM public._community_auto_hide(_target_kind, _target_id);
  END IF;

  RETURN jsonb_build_object('id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.community_moderation_queue(
  _status text DEFAULT 'open', _cursor text DEFAULT NULL, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
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
    RAISE EXCEPTION USING message = 'not_moderator';
  END IF;
  IF _status IS NOT NULL AND _status NOT IN ('open', 'actioned', 'dismissed') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  WITH page AS (
    SELECT r.*
    FROM public.community_reports r
    WHERE (_status IS NULL OR r.status = _status)
      AND (v_ts IS NULL OR (r.created_at, r.id) < (v_ts, v_id))
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
        'id',          page.id,
        'target_kind', page.target_kind,
        'target_id',   page.target_id,
        'target_owner_id', page.target_owner_id,
        'reason',      page.reason,
        'detail',      page.detail,
        'status',      page.status,
        'priority',    page.priority,
        'created_at',  page.created_at,
        'resolution',  page.resolution,
        'resolved_at', page.resolved_at,
        'report_count', (SELECT count(*) FROM public.community_reports rc
                         WHERE rc.target_kind = page.target_kind
                           AND rc.target_id = page.target_id),
        'note',        (SELECT l.note FROM public.community_moderation_log l
                        WHERE l.report_id = page.id
                        ORDER BY l.created_at DESC LIMIT 1),
        'moderator_handle', (SELECT mp.handle
                             FROM public.community_moderation_log l
                             LEFT JOIN public.community_profiles mp ON mp.user_id = l.moderator_id
                             WHERE l.report_id = page.id
                             ORDER BY l.created_at DESC LIMIT 1),
        'content',     CASE
          WHEN page.target_kind = 'post' THEN
            (SELECT jsonb_build_object('kind', p.kind, 'caption', p.caption,
                                       'status', p.status)
             FROM public.community_posts p WHERE p.id = page.target_id)
          WHEN page.target_kind = 'comment' THEN
            (SELECT jsonb_build_object('body', c.body, 'status', c.status)
             FROM public.community_comments c WHERE c.id = page.target_id)
          WHEN page.target_kind = 'programme' THEN
            (SELECT jsonb_build_object('title', g.title, 'description', g.description,
                                       'status', g.status)
             FROM public.community_programmes g WHERE g.id = page.target_id)
          WHEN page.target_kind = 'message' THEN
            (SELECT jsonb_build_object('body', left(m.body, 200), 'conversation_id', m.conversation_id)
             FROM public.community_messages m WHERE m.id = page.target_id)
          -- migrate_165 (design 60 §3): a reported group's preview is its
          -- name and blurb -- the same shape a profile report already has.
          WHEN page.target_kind = 'group' THEN
            (SELECT jsonb_build_object('name', gr.name, 'blurb', gr.blurb, 'status', gr.status)
             FROM public.community_groups gr WHERE gr.id = page.target_id)
          ELSE
            (SELECT jsonb_build_object('handle', pr.handle, 'display_name', pr.display_name,
                                       'bio', pr.bio, 'status', pr.status)
             FROM public.community_profiles pr WHERE pr.user_id = page.target_id)
        END)
      ORDER BY page.priority DESC, page.created_at DESC, page.id DESC), '[]'::jsonb),
    (array_agg(page.created_at ORDER BY page.created_at ASC, page.id ASC))[1],
    (array_agg(page.id         ORDER BY page.created_at ASC, page.id ASC))[1]
  INTO v_rows, v_lts, v_lid
  FROM page;

  RETURN jsonb_build_object(
    'reports', coalesce(v_rows, '[]'::jsonb),
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;

-- delete_user_data(): the latest body is migrate_162's (the last file
-- before this one to re-issue it), reproduced here verbatim with two-sided
-- deletes added for the three group tables and the promote-or-close rule
-- run FIRST, before the caller's own membership rows are deleted, so the
-- rule can still see which groups the caller administered.
CREATE OR REPLACE FUNCTION public.delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  gid uuid;
  successor uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  BEGIN DELETE FROM engine_telemetry            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM engine_overrides            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM ed_pattern_flags            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM consent_log                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM recipe_ingredients          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM recipes                     WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM saved_meals                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_favourites             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_water                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_intake_rollups        WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_entries                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_foods                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM foods_custom                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_swaps                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM diary_entries               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM workout_sets                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workout_notes               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workout_notes_v2            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workouts                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routine_exercises           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routines                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM session_resolutions         WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycle_weeks             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycles                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM planned_muscle_volume       WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM adaptation_events           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM programmes                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM peak_week_plans             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_user_notes         WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_goals              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_exercises            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM volume_landmarks            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_volumes              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM personal_records            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM weekly_checkins_v2          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_checkins             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM morning_weights             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM body_metrics                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM progress_photos             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM achievements                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM coach_outputs               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM nutrition_targets           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM effective_maintenance_memos WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM perday_target_offsets       WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_insights               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM autoregulation_suggestions  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM user_body_profile           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_feedback               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM debug_log_uploads           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_prefs                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM tier_history                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM notification_preferences    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_frequents              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM device_push_tokens          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_steps                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM cardio_log                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM meal_plans                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM plan_folders                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM coach_assignments
    WHERE client_user_id = uid OR coach_user_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM partner_week_signals
    WHERE user_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM partner_cheers
    WHERE sender_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM partner_win_cards
    WHERE sender_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM partner_shared_blocks
    WHERE proposed_by = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM partner_weekly_intentions
    WHERE user_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_weekly_signal       WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_blocks WHERE blocker_id = uid OR blocked_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_nudges WHERE from_user = uid OR to_user = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_invites             WHERE created_by = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_circles             WHERE created_by = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_members             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    UPDATE partnerships
    SET member_a = NULL, status = 'ended',
        ended_at = COALESCE(ended_at, now()), invite_code_hash = NULL
    WHERE member_a = uid;
    UPDATE partnerships
    SET member_b = NULL, status = 'ended',
        ended_at = COALESCE(ended_at, now()), invite_code_hash = NULL
    WHERE member_b = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM exercises                   WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM exercise_slot_defaults      WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_swaps              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_intent             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM session_constraint_effects  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM capability_constraints      WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- migrate_165 (design 60 §3): promote-or-close, run BEFORE the caller's
  -- own membership rows are deleted below, so it can still see every group
  -- this account administered. For each group where the caller is the ONLY
  -- admin, promote the earliest-joined remaining member, or close the group
  -- if none is left.
  BEGIN
    FOR gid IN
      SELECT m.group_id FROM public.community_group_members m
      WHERE m.user_id = uid AND m.role = 'admin' AND m.state = 'member'
        AND public._community_group_admin_count(m.group_id, uid) = 0
    LOOP
      SELECT m2.user_id INTO successor
      FROM public.community_group_members m2
      WHERE m2.group_id = gid AND m2.user_id <> uid AND m2.state = 'member'
      ORDER BY m2.joined_at ASC, m2.user_id ASC
      LIMIT 1;

      IF successor IS NOT NULL THEN
        UPDATE public.community_group_members SET role = 'admin'
        WHERE group_id = gid AND user_id = successor;
      ELSE
        UPDATE public.community_groups SET status = 'closed', updated_at = now()
        WHERE id = gid;
      END IF;
    END LOOP;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM community_group_invites WHERE created_by = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM community_group_members WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  -- A group this account created keeps existing (its content is what makes
  -- it real for the remaining members, exactly like a gym directory entry);
  -- only the link back to the deleted creator is anonymised, the same
  -- posture community_reports.reporter_id already has.
  BEGIN UPDATE community_groups SET created_by = NULL WHERE created_by = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM community_rate_events WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM community_activity WHERE user_id = uid OR actor_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM community_blocks WHERE blocker_id = uid OR blocked_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM community_mutes WHERE muter_id = uid OR muted_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM community_follows WHERE follower_id = uid OR followee_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM community_messages WHERE sender_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM community_conversations WHERE user_a = uid OR user_b = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM community_connections WHERE user_a = uid OR user_b = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM community_reactions          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM community_comments           WHERE author_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM community_programme_uses     WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM community_posts              WHERE author_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM community_programmes         WHERE owner_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    UPDATE community_reports SET reporter_id = NULL WHERE reporter_id = uid;
    DELETE FROM community_reports WHERE target_owner_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    UPDATE community_moderation_log SET moderator_id = NULL WHERE moderator_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM community_profiles           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM community_moderators
    WHERE email = (SELECT u.email FROM auth.users u WHERE u.id = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN UPDATE gym_submissions SET submitter_id = NULL WHERE submitter_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE gym_submissions SET reviewed_by = NULL WHERE reviewed_by = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE gym_reports SET reporter_id = NULL WHERE reporter_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    UPDATE gym_venue_history
       SET actor = 'deleted',
           after = CASE WHEN after ? 'confirmer' THEN (after - 'confirmer') || '{"confirmer":"deleted"}'::jsonb ELSE after END
     WHERE actor = uid::text;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE gym_venue_sources SET source_record_id = 'deleted' WHERE source = 'user' AND source_record_id = uid::text; EXCEPTION WHEN undefined_table THEN NULL; END;

  DELETE FROM users_profile WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_data() TO authenticated;

-- ─── Part 12: privileges (SD-14: helpers to nobody, RPCs to authenticated) ─

DO $$
DECLARE sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    '_community_group_role(uuid, uuid)',
    '_community_group_is_admin(uuid, uuid)',
    '_community_group_admin_count(uuid, uuid)',
    '_community_group_card(community_groups)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', sig);
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'community_update_training_profile(jsonb)',
    'community_board(text, text, text, text, int, text)',
    'community_group_create(text, text, text)',
    'community_group_update(uuid, text, text, text)',
    'community_group_close(uuid)',
    'community_group_leave(uuid)',
    'community_group_join(uuid)',
    'community_group_approve(uuid, uuid)',
    'community_group_remove(uuid, uuid)',
    'community_group_promote(uuid, uuid)',
    'community_group_invite(uuid, text)',
    'community_group_invite_link(uuid)',
    'community_group_accept_invite(uuid, uuid)',
    'community_group_list_mine()',
    'community_group_get(uuid)',
    'community_group_members(uuid, text, int)',
    'community_group_search(text, int)',
    'community_group_feed(uuid, text, int)',
    'community_report(text, uuid, text, text)',
    'community_moderation_queue(text, text, int)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', sig);
  END LOOP;
END $$;

-- ─── Part 13: acceptance check (read-only) ───────────────────────────────
--
-- Run after the apply and read the output before declaring this migration
-- landed. Expect: nine community_profiles columns present; the three group
-- tables present with RLS enabled and zero grants to anon/authenticated;
-- every function below SECURITY DEFINER with the search_path pinned;
-- `authenticated` executing exactly the client RPCs this file grants and
-- NOT the `_community_group_*` helpers.

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'community_profiles'
  AND column_name IN (
    'c_sessions_week', 'c_sessions_month', 'c_weeks_streak', 'c_planned_pct_4w',
    'c_consistent_weeks_12w', 'c_trained_days_week', 'c_last_trained_day',
    'c_updated_at', 'share_consistency'
  )
ORDER BY column_name;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_can_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE c.relname IN ('community_groups', 'community_group_members', 'community_group_invites')
ORDER BY c.relname;

SELECT p.proname,
       p.prosecdef AS security_definer,
       p.proconfig AS settings,
       pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname LIKE 'community\_group\_%' OR p.proname = 'community_board'
       OR p.proname = 'community_update_training_profile'
       OR p.proname = 'community_report' OR p.proname = 'community_moderation_queue'
       OR p.proname = 'delete_user_data'
       OR p.proname LIKE '\_community\_group\_%')
ORDER BY p.proname, args;

SELECT conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace n ON n.oid = rel.relnamespace AND n.nspname = 'public'
WHERE con.conname IN ('community_activity_kind_check', 'community_reports_target_kind_check')
ORDER BY con.conname;
