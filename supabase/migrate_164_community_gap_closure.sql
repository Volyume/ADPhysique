-- migrate_164_community_gap_closure.sql
--
-- Purpose:           Final competitive gap closure for Community (community
--                    product audit 2026-09-07, authority
--                    `docs/community-product-audit-2026-09-07/
--                    40-GAP-CLOSURE.md` section 1 decision table and
--                    section 2). DEPENDS ON 160, 161, 162 and 163; must
--                    never run before any of them.
--
--                    A. Programme-social retirement (40-GAP-CLOSURE.md
--                       section 2, founder rule: individualised programmes
--                       are Volyume's model, the Community programme-
--                       sharing layer is the wrong one). EXECUTE revoked
--                       from `authenticated`, `PUBLIC` and `anon` on every
--                       programme RPC: `community_publish_programme`,
--                       `community_unpublish_programme`,
--                       `community_discover_programmes`,
--                       `community_search_programmes`,
--                       `community_get_programme`,
--                       `community_record_programme_use`,
--                       `community_programme_people`,
--                       `community_set_show_programmes`,
--                       `community_my_programmes`. `community_find_people`,
--                       `community_suggested_people` and
--                       `community_dimension` re-issued without the
--                       programme signal, programme tiles or the programme
--                       door/mode (`community_dimension` keeps 'programme'
--                       as a VALID `_kind` -- a stale shared link never
--                       500s -- but always renders the empty page: label
--                       NULL, count 0, no people, no programmes).
--                       `community_comment` and `community_report`
--                       re-issued to reject `target_kind = 'programme'`.
--                       The fourteen `community_programmes`/
--                       `community_programme_uses` etc. tables are NOT
--                       dropped -- they hold no rows (the layer went live
--                       the same day it is retired, so there is nothing to
--                       migrate or anonymise) and stay in place should a
--                       future decision ever want the schema back.
--                    B. `community_search_people` re-issued: display-name
--                       matching widens from word-prefix to case-folded
--                       SUBSTRING, alongside the unchanged handle-prefix
--                       match; returns up to 40 candidates (was 20) so the
--                       client can fuzzy-rank.
--                    C. Follow management: `community_remove_follower`
--                       (migrate_160/161) and `community_list_connections`
--                       (migrate_161) already exist and are unchanged.
--                       `community_list_followers(_cursor, _limit)` added
--                       -- a self-only wrapper over
--                       `community_list_follows(v_uid, 'followers', ...)`,
--                       which already carries keyset paging, viewer gating
--                       and the suspended-profile exclusion; being self-
--                       only by signature satisfies SD-32 here (it can
--                       never list a page for anyone but the caller).
--                    D. Granular privacy: `community_profiles` gains
--                       `show_gym`/`show_place` (both `boolean NOT NULL
--                       DEFAULT true`). `community_set_show_gym(_on)` and
--                       `community_set_show_place(_on)` added.
--                       `_community_profile_card` re-issued to hide
--                       `gym_label`/`gym_id`/`gym_key` when `show_gym` is
--                       false and `place_label`/`place_key`/`area_label`
--                       when `show_place` is false, for any viewer but the
--                       owner. `community_find_people` re-issued so every
--                       gym/place door, `_filters.scope` predicate and
--                       match-reason line also respects the candidate's
--                       own toggle -- a hidden fact is never a match
--                       signal, on either side of the predicate.
--                       `community_upsert_profile` needs no re-issue: it
--                       already preserves any column it does not
--                       explicitly write, so the two new DEFAULT-true
--                       columns survive every save untouched.
--                    E. Moderated-person notice: `community_my_status()`
--                       added -- `{status, reason_class, since}` for the
--                       caller only, reason CLASS only (never the
--                       reporter, which `community_moderation_log` has no
--                       column for anyway).
--                    F. Session suggestion: `community_messages` gains
--                       `ref_payload jsonb`; the `ref_kind` CHECK widens
--                       to add `'session'`. `community_send_message`
--                       re-issued (new trailing `_ref_payload jsonb`
--                       parameter, DROP-by-name first: a different
--                       argument count is a different signature to
--                       Postgres, the same pattern 163 used for
--                       `gyms_search`/`community_find_people`) to accept
--                       `_ref_kind = 'session'` with a payload validated
--                       key-by-key (`day` one of mon..sun, `time_band` one
--                       of early/morning/midday/afternoon/evening/late,
--                       `gym_id` null or an existing `gym_venues.id`; any
--                       other key is `invalid_input`). No new activity row
--                       and no new `notification_preferences` category: it
--                       rides the existing `community_message` category
--                       and push path untouched, per the brief's "no
--                       reminders, no notification kind change".
--                       `community_respond_session(_message_id, _accept)`
--                       added: party-checked (either side of the
--                       conversation, never the sender responding to their
--                       own suggestion), once only (`ref_payload ?
--                       'accepted'` already set is `already_responded`),
--                       recorded as `{accepted, responded_at}` merged into
--                       the SAME message's `ref_payload` -- one row of
--                       truth, no second table to fall out of step.
--                       `_community_message_json` re-issued to return the
--                       payload for a `session` ref plus the gym's
--                       `display_name` from `gym_venues` (resolved fresh
--                       every read, never cached on the message, since a
--                       venue can be renamed or merged afterwards).
--                    G. Quiet hours projection:
--                       `notification_preferences` (migrate_044; per-
--                       category rows, composite PK `(user_id,
--                       category)`, not a single per-user prefs row) gains
--                       `quiet_start smallint`, `quiet_end smallint`
--                       (minutes from midnight, nullable) and `tz text`.
--                       Because the table has no single per-user row,
--                       quiet hours is stored on ONE sentinel row per user
--                       (`category = 'quiet_hours'`, added to the existing
--                       category CHECK) rather than repeated across every
--                       category. `community_set_quiet_hours(_start,
--                       _end, _tz)` added (upserts that row; NULL/NULL
--                       clears it; `_tz` is checked by asking Postgres to
--                       convert with it). `supabase/functions/
--                       community-notify/index.ts` updated to read that
--                       row and hold a push (deliver in_app) when now, in
--                       the recipient's tz, falls inside their window
--                       (including an overnight window that wraps past
--                       midnight); a failed read or an unset window never
--                       blocks a push that would otherwise have gone
--                       (fail OPEN on absence, same as every other
--                       preference read in that function already fails
--                       CLOSED only on an actual read ERROR, never on a
--                       missing row). Also removes the retired
--                       `programme_used` notification kind from that
--                       function. `supabase/functions/community-public/
--                       index.ts` updated to 404 the `programme` kind
--                       (the shared-programme public page is retired with
--                       the layer).
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
--                    CHECK widenings (`community_messages_ref_kind_check`,
--                    `notification_preferences_category_check`) are each
--                    DROP CONSTRAINT IF EXISTS then re-ADD inside a
--                    duplicate_object-tolerant `DO $$ ... EXCEPTION WHEN
--                    duplicate_object THEN NULL; END $$;` block; every
--                    function is CREATE OR REPLACE; the one signature
--                    change (`community_send_message`) drops the old
--                    overload by name first via the same dynamic-DROP
--                    pattern 163 used; the privilege REVOKE/GRANT loop is
--                    idempotent by construction. Re-running changes
--                    nothing.
--
-- Rollback:          REVOKE ALL granted here back off `authenticated` for
--                      every function this file names in Part 8's grant
--                      loop; re-apply 160/161/163 (see their own file
--                      headers) to restore `community_find_people`,
--                      `community_suggested_people`, `community_dimension`,
--                      `community_search_people`, `community_comment`,
--                      `community_report`, `community_send_message`,
--                      `_community_message_json` and
--                      `_community_profile_card` to their pre-164 bodies
--                      (CREATE OR REPLACE means the LATEST definition wins
--                      until a later file replaces it again -- there is no
--                      automatic revert); re-GRANT EXECUTE to
--                      `authenticated` on the nine programme RPCs this
--                      file revokes (their bodies are untouched, only the
--                      grant moves); drop
--                      `community_set_show_gym`/`community_set_show_place`/
--                      `community_list_followers`/`community_my_status`/
--                      `community_set_quiet_hours`/
--                      `community_respond_session`;
--                      ALTER TABLE public.community_profiles DROP COLUMN
--                      show_gym, DROP COLUMN show_place;
--                      ALTER TABLE public.community_messages DROP COLUMN
--                      ref_payload; ALTER TABLE public.notification_
--                      preferences DROP COLUMN quiet_start, DROP COLUMN
--                      quiet_end, DROP COLUMN tz (and DELETE the
--                      `category = 'quiet_hours'` rows first, since the
--                      CHECK narrowing back would otherwise reject
--                      whatever is left); re-narrow both CHECKs to their
--                      pre-164 lists (both re-added by name above, so the
--                      previous list is a one-line edit against 161/163's
--                      own headers). No table is dropped or created by
--                      this file, so a rollback loses only this file's own
--                      additions.
--
-- GDPR note:         No new personal-data CATEGORY. `show_gym`/
--                    `show_place` are visibility toggles over data already
--                    covered by 160/162/163's GDPR notes (chosen gym/area
--                    facts, Article 6(1)(a) consent under the existing
--                    Community rules acceptance). `community_my_status()`
--                    reads only the caller's own row and the reason CLASS
--                    of a report about them, never another person's data.
--                    `ref_payload` on a session-suggestion message (day,
--                    time band, an optional gym id) is the same category
--                    of voluntary user-authored content as the message
--                    body it travels with; it carries no health data and
--                    is deleted exactly when the message is (unchanged
--                    two-sided message delete in `delete_user_data()`,
--                    which needs no re-issue here: the new columns live on
--                    tables already deleted whole-row by that function).
--                    `notification_preferences.quiet_start/quiet_end/tz`
--                    are a scheduling preference, not health data, and are
--                    already deleted whole-row by `delete_user_data()`'s
--                    existing `notification_preferences` line.
--
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.

-- ─── Part 1: community_profiles gains show_gym / show_place ──────────────

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS show_gym   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_place boolean NOT NULL DEFAULT true;

-- ─── Part 2: community_messages gains ref_payload; ref_kind widens ───────

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS ref_payload jsonb;

DO $$ BEGIN
  ALTER TABLE public.community_messages
    DROP CONSTRAINT IF EXISTS community_messages_ref_kind_check;
  ALTER TABLE public.community_messages
    ADD CONSTRAINT community_messages_ref_kind_check
    CHECK (ref_kind IS NULL OR ref_kind IN ('programme', 'post', 'session'));
END $$;

-- ─── Part 3: notification_preferences gains the quiet-hours columns ──────
--
-- Nullable: absent means "no quiet hours set", the same absence-is-consent-
-- by-default shape every other preference read in community-notify already
-- treats as "nothing to hold the push for".

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS quiet_start smallint,
  ADD COLUMN IF NOT EXISTS quiet_end   smallint,
  ADD COLUMN IF NOT EXISTS tz          text;

DO $$ BEGIN
  ALTER TABLE public.notification_preferences
    DROP CONSTRAINT IF EXISTS notification_preferences_category_check;
  ALTER TABLE public.notification_preferences
    ADD CONSTRAINT notification_preferences_category_check CHECK (category IN (
      'daily_checkin_reminder',
      'weekly_checkin_reminder',
      'cascade_gate',
      'subscription_payment_failure',
      'subscription_expiring',
      'sync_error',
      'ed_pattern_lockout',
      'ffm_floor_hold',
      'weekly_coach_ready',
      'coach_trial_ending',
      'morning_weight',
      'evening_weight',
      'training_reminder',
      'year_of_lifts_unlock',
      'checkin_missed',
      'community_follow',
      'community_activity',
      'community_message',
      -- migrate_164 (spec G): the one sentinel row per user that carries
      -- quiet_start/quiet_end/tz. Never toggled enabled=false by the
      -- client -- `enabled` on this row is meaningless; the columns
      -- themselves being NULL is what "no quiet hours" means.
      'quiet_hours'
    ));
END $$;

-- ─── Part 4: community_send_message signature change (new trailing param)
--
-- A different argument count is a different signature to Postgres, so the
-- old 4-argument overload is dropped by name first (the DROP-by-name
-- pattern migrate_163 already used for gyms_search/community_find_people),
-- rather than risking a stale duplicate overload PostgREST could pick.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'community_send_message' AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

-- ─── Part 5: A - programme-social retirement, functions re-issued ────────

-- ─── Part 6: B - community_search_people (substring name match, cap 40) ──

CREATE OR REPLACE FUNCTION public.community_search_people(_q text, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  -- Spec B (40-GAP-CLOSURE.md decision table, "People search tolerance"):
  -- up to 40 candidates so the client can fuzzy-rank, never more than the
  -- house cap of 50 _community_limit already enforces.
  v_lim int  := least(public._community_limit(_limit), 40);
  v_q   text := nullif(public._community_fold(_q), '');
  v_out jsonb;
BEGIN
  IF v_q IS NULL OR length(v_q) < 2 THEN
    RETURN jsonb_build_object('people', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(public._community_profile_card(p.user_id, v_uid)
           ORDER BY (p.handle LIKE v_q || '%') DESC,
                    (public._community_fold(p.display_name) LIKE v_q || '%') DESC,
                    p.last_active_at DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT pr.user_id, pr.handle, pr.display_name, pr.last_active_at
    FROM public.community_profiles pr
    WHERE pr.status = 'active'
      AND pr.visibility = 'public'
      AND pr.is_minor = false
      AND pr.user_id <> v_uid
      AND NOT public._community_is_blocked(v_uid, pr.user_id)
      AND (
        pr.handle LIKE v_q || '%'
        -- Spec B: display-name match is case-folded SUBSTRING, not just a
        -- word prefix, so "sam" also finds "Awesome Sam" and "samantha"
        -- inside a longer name, on top of the handle prefix match kept
        -- above (a full substring scan of handle would defeat its own
        -- index; the prefix match there already covers the common case).
        OR public._community_fold(pr.display_name) LIKE '%' || v_q || '%'
      )
    ORDER BY (pr.handle LIKE v_q || '%') DESC,
             (public._community_fold(pr.display_name) LIKE v_q || '%') DESC,
             pr.last_active_at DESC
    LIMIT v_lim
  ) p;

  RETURN jsonb_build_object('people', v_out);
END $$;


-- ─── Part 7: C - follow management (self-only followers list) ───────────

CREATE OR REPLACE FUNCTION public.community_list_followers(
  _cursor text DEFAULT NULL, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
BEGIN
  PERFORM public._community_require_profile(v_uid, false);
  RETURN public.community_list_follows(v_uid, 'followers', _cursor, _limit);
END $$;


-- ─── Part 8: D - granular privacy (_community_profile_card re-issued) ───

CREATE OR REPLACE FUNCTION public._community_profile_card(_uid uuid, _viewer uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  p public.community_profiles%ROWTYPE;
  v_following text;
  v_viewable boolean;
  v_show_gym boolean;
  v_show_place boolean;
BEGIN
  SELECT * INTO p FROM public.community_profiles WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p.status = 'suspended' AND _viewer <> _uid THEN RETURN NULL; END IF;
  v_viewable := public._community_can_view(_viewer, _uid);
  -- Spec D (40-GAP-CLOSURE.md, "Granular privacy"): the owner always sees
  -- their own gym/place; every other viewer is gated by the toggle on top
  -- of the existing viewability gate. Default true (ADD COLUMN ... DEFAULT
  -- true) preserves today's behaviour for every existing profile.
  v_show_gym   := _viewer = _uid OR coalesce(p.show_gym, true);
  v_show_place := _viewer = _uid OR coalesce(p.show_place, true);

  SELECT f.state INTO v_following
  FROM public.community_follows f
  WHERE f.follower_id = _viewer AND f.followee_id = _uid;

  RETURN jsonb_build_object(
    'user_id',         p.user_id,
    'handle',          p.handle,
    'display_name',    p.display_name,
    'avatar_preset',   p.avatar_preset,
    'bio',             p.bio,
    'styles',          CASE WHEN v_viewable THEN to_jsonb(p.styles) ELSE '[]'::jsonb END,
    'goal',            CASE WHEN v_viewable THEN p.goal END,
    'setting',         CASE WHEN v_viewable THEN p.setting END,
    -- Spec D: area_label travels under the SAME show_place gate as
    -- place_label/place_key (the brief bundles the three as one fact).
    'area_label',      CASE WHEN v_viewable AND v_show_place THEN p.area_label END,
    'place_label',     CASE WHEN v_viewable AND v_show_place THEN p.place_label END,
    'gym_id',          CASE WHEN v_viewable AND v_show_gym THEN p.gym_id END,
    'gym_label',       CASE WHEN v_viewable AND v_show_gym THEN p.gym_label END,
    'show_gym',        CASE WHEN _viewer = _uid THEN coalesce(p.show_gym, true) END,
    'show_place',      CASE WHEN _viewer = _uid THEN coalesce(p.show_place, true) END,
    'visibility',      p.visibility,
    'follower_count',  p.follower_count,
    'following_count', p.following_count,
    'connection',      public._community_connection_state(_viewer, _uid),
    'connection_count', CASE WHEN v_viewable THEN p.connection_count END,
    'open_to_partner', CASE WHEN v_viewable THEN p.open_to_partner ELSE false END,
    'tp_days',           CASE WHEN v_viewable THEN to_jsonb(p.tp_days) END,
    'tp_time_bands',     CASE WHEN v_viewable THEN to_jsonb(p.tp_time_bands) END,
    'tp_sessions_band',  CASE WHEN v_viewable THEN p.tp_sessions_band END,
    'tp_staple_lifts',   CASE WHEN v_viewable THEN to_jsonb(p.tp_staple_lifts) END,
    'tp_experience_band', CASE WHEN v_viewable THEN p.tp_experience_band END,
    'tp_programme_key',  CASE WHEN v_viewable THEN p.tp_programme_key END,
    'tp_age_band',       CASE WHEN v_viewable THEN p.tp_age_band END,
    'age_band',          CASE WHEN v_viewable THEN p.tp_age_band END,
    'other_gym_ids',    CASE WHEN _viewer = _uid THEN to_jsonb(p.other_gym_ids) END,
    'can_connect',      public._community_can_connect(_viewer, _uid),
    'relationship',    jsonb_build_object(
      'following',   coalesce(v_following, 'none'),
      'followed_by', EXISTS (
        SELECT 1 FROM public.community_follows f2
        WHERE f2.follower_id = _uid AND f2.followee_id = _viewer
          AND f2.state = 'accepted'),
      'muted',       EXISTS (
        SELECT 1 FROM public.community_mutes m
        WHERE m.muter_id = _viewer AND m.muted_id = _uid),
      'blocked',     EXISTS (
        SELECT 1 FROM public.community_blocks b
        WHERE b.blocker_id = _viewer AND b.blocked_id = _uid)
    )
  );
END $$;


-- ─── Part 9: D - community_find_people re-issued (gym/place gate, no
--             programme door) ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_find_people(
  _mode text DEFAULT 'like_me', _cursor text DEFAULT NULL, _limit int DEFAULT 20,
  _filters jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := public._community_caller();
  v_lim     int  := public._community_limit(_limit);
  v_me      public.community_profiles%ROWTYPE;
  v_key     text;
  v_label   text;
  v_row     record;
  v_score   int;
  v_reasons text[];
  v_items   jsonb[] := ARRAY[]::jsonb[];
  v_style   text;
  v_band    text;
  v_days    text[];
  v_mconn   int;
  v_mfoll   int;
  v_lifts   int;
  v_place_m double precision;
  v_scanned int := 0;
  -- _filters (spec 1.1 C): every key optional, every one a HARD filter.
  v_scope         text;
  v_band_raw      text;
  v_band_m        int;
  v_partner_only  boolean;
  v_f_days        text[];
  v_f_bands       text[];
  v_f_styles      text[];
  v_f_goal        text;
  v_f_exp         text;
  v_f_age         text;
  -- Keyset paging.
  v_cur_score int;
  v_cur_ts    timestamptz;
  v_cur_id    uuid;
  v_page      jsonb;
  v_remaining int;
  v_next_cursor text;
  -- SD-28 fallback.
  v_already   uuid[];
  v_fallback  jsonb;
  v_page_len  int;
BEGIN
  -- migrate_164 (community product audit gap closure, section 2/40-GAP-
  -- CLOSURE.md): 'programme' retired as a door. The shared-programme layer
  -- it pointed at (community_programmes/community_programme_uses) is
  -- retired; a stale client still sending it gets invalid_input, the same
  -- refusal any other unknown mode gets, never a silent empty page.
  IF _mode IS NULL OR _mode NOT IN
     ('like_me', 'gym', 'area', 'partners', 'might_know') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'find_people', 120, 120, interval '1 hour');

  IF _filters IS NOT NULL THEN
    IF jsonb_typeof(_filters) <> 'object' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;

    v_scope := nullif(btrim(coalesce(_filters ->> 'scope', '')), '');
    IF v_scope IS NOT NULL AND v_scope NOT IN ('gym', 'place', 'any') THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;

    IF _filters ? 'place_band_miles' THEN
      v_band_raw := _filters ->> 'place_band_miles';
      IF v_band_raw NOT IN ('0', '5', '10', '25') THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      v_band_m := CASE v_band_raw WHEN '0' THEN 0 WHEN '5' THEN 8047
                                   WHEN '10' THEN 16093 ELSE 40234 END;
    END IF;

    v_partner_only := _filters ? 'partner_only'
      AND coalesce((_filters ->> 'partner_only')::boolean, false);

    IF jsonb_typeof(_filters -> 'days') = 'array' THEN
      SELECT array_agg(DISTINCT value) INTO v_f_days FROM jsonb_array_elements_text(_filters -> 'days');
    END IF;
    IF jsonb_typeof(_filters -> 'time_bands') = 'array' THEN
      SELECT array_agg(DISTINCT value) INTO v_f_bands FROM jsonb_array_elements_text(_filters -> 'time_bands');
    END IF;
    IF jsonb_typeof(_filters -> 'styles') = 'array' THEN
      SELECT array_agg(DISTINCT value) INTO v_f_styles FROM jsonb_array_elements_text(_filters -> 'styles');
    END IF;
    v_f_goal := nullif(btrim(coalesce(_filters ->> 'goal', '')), '');
    v_f_exp  := nullif(btrim(coalesce(_filters ->> 'experience_band', '')), '');
    -- age_band: usable only when the caller shares their own band (a
    -- caller with none simply cannot filter by a band they never chose to
    -- reveal about themselves either).
    v_f_age := nullif(btrim(coalesce(_filters ->> 'age_band', '')), '');
    IF v_f_age IS NOT NULL AND v_me.tp_age_band IS NULL THEN
      v_f_age := NULL;
    END IF;
  END IF;

  IF v_scope IS NULL THEN
    v_scope := CASE WHEN _mode = 'gym' THEN 'gym' WHEN _mode = 'area' THEN 'place' ELSE 'any' END;
  END IF;

  IF _cursor IS NOT NULL AND btrim(_cursor) <> '' THEN
    SELECT c_score, c_ts, c_id INTO v_cur_score, v_cur_ts, v_cur_id
    FROM public._community_find_people_cursor_parts(_cursor);
  END IF;

  IF _mode = 'gym' THEN
    v_key := v_me.gym_key; v_label := v_me.gym_label;
  ELSIF _mode = 'area' THEN
    -- Spec 1.1 C: place_key when the caller has one, else the legacy
    -- area_key path for a pre-163 profile.
    IF v_me.place_key IS NOT NULL THEN
      v_key := v_me.place_key; v_label := v_me.place_label;
    ELSE
      v_key := v_me.area_key; v_label := v_me.area_label;
    END IF;
  ELSIF _mode = 'partners' THEN
    IF coalesce((v_me.partner_prefs ->> 'same_gym_only')::boolean, false)
       AND v_me.gym_key IS NOT NULL THEN
      v_label := 'at your gym';
    ELSE
      v_label := 'in your area';
    END IF;
  END IF;

  IF (_mode IN ('gym', 'area') AND v_key IS NULL)
     OR (_mode = 'partners' AND NOT coalesce(v_me.open_to_partner, false))
     OR (v_scope = 'gym' AND v_me.gym_key IS NULL)
     OR (v_scope = 'place' AND v_me.place_key IS NULL AND v_me.area_key IS NULL) THEN
    RETURN jsonb_build_object(
      'mode', _mode, 'key', v_key, 'label', v_label,
      'count', 0, 'count_truncated', false, 'people', '[]'::jsonb, 'cursor', NULL);
  END IF;

  FOR v_row IN
    SELECT p.*
    FROM public.community_profiles p
    WHERE p.status = 'active'
      AND p.visibility = 'public'
      AND p.is_minor = false
      AND p.user_id <> v_uid
      AND NOT public._community_is_blocked(v_uid, p.user_id)
      AND NOT public._community_is_connected(v_uid, p.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes mu
        WHERE mu.muter_id = v_uid AND mu.muted_id = p.user_id)
      -- Spec D (40-GAP-CLOSURE.md, "Granular privacy"): a hidden fact is
      -- never a match signal, so every gym/place door and filter below adds
      -- the candidate's own show_gym/show_place toggle to the predicate.
      AND (_mode <> 'gym'       OR (coalesce(p.show_gym, true) AND (
             p.gym_key = v_key
             OR (v_me.gym_id IS NOT NULL AND v_me.gym_id = ANY (p.other_gym_ids)))))
      AND (_mode <> 'area'      OR (coalesce(p.show_place, true) AND (
             (v_me.place_key IS NOT NULL AND p.place_key = v_key)
             OR (v_me.place_key IS NULL AND p.area_key = v_key)
           )))
      AND (_mode <> 'partners'  OR p.open_to_partner = true)
      AND (_mode <> 'partners'
           OR NOT coalesce((p.partner_prefs ->> 'same_gym_only')::boolean, false)
           OR (v_me.gym_key IS NOT NULL AND coalesce(p.show_gym, true) AND p.gym_key = v_me.gym_key))
      -- _filters (findings item 5): independent of _mode, ANDed alongside.
      AND (v_scope <> 'gym' OR (coalesce(p.show_gym, true) AND (
             p.gym_key = v_me.gym_key
             OR (v_me.gym_id IS NOT NULL AND v_me.gym_id = ANY (p.other_gym_ids)))))
      AND (v_scope <> 'place' OR (coalesce(p.show_place, true) AND (
             CASE
               WHEN v_band_m IS NULL THEN
                 (v_me.place_key IS NOT NULL AND p.place_key = v_me.place_key)
                 OR (v_me.place_key IS NULL AND v_me.area_key IS NOT NULL AND p.area_key = v_me.area_key)
               WHEN v_band_m = 0 THEN
                 (v_me.place_key IS NOT NULL AND p.place_key = v_me.place_key)
               ELSE
                 coalesce(public._community_place_band_m(v_uid, p.user_id), 1e12::double precision) <= v_band_m
             END
           )))
      AND (NOT coalesce(v_partner_only, false) OR p.open_to_partner = true)
      AND (v_f_days IS NULL OR (p.tp_days IS NOT NULL AND p.tp_days && v_f_days))
      AND (v_f_bands IS NULL OR (p.tp_time_bands IS NOT NULL AND p.tp_time_bands && v_f_bands))
      AND (v_f_styles IS NULL OR (p.styles IS NOT NULL AND p.styles && v_f_styles))
      AND (v_f_goal IS NULL OR p.goal = v_f_goal)
      AND (v_f_exp IS NULL OR p.tp_experience_band = v_f_exp)
      AND (v_f_age IS NULL OR p.tp_age_band = v_f_age)
    ORDER BY p.last_active_at DESC
    LIMIT 1000
  LOOP
    v_scanned := v_scanned + 1;
    v_score := 0;
    v_reasons := ARRAY[]::text[];

    -- Spec D: a candidate who hides their gym never surfaces it as a
    -- match reason either, even to someone who shares it.
    IF coalesce(v_row.show_gym, true) AND v_me.gym_key IS NOT NULL
       AND v_row.gym_key = v_me.gym_key THEN
      v_score := v_score + 3;
      v_reasons := v_reasons || ('Trains at ' || coalesce(v_row.gym_label, v_me.gym_label));
    ELSIF coalesce(v_row.show_gym, true) AND v_me.gym_id IS NOT NULL
          AND v_row.other_gym_ids IS NOT NULL
          AND v_me.gym_id = ANY (v_row.other_gym_ids) THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || 'Also trains at your gym'::text;
    END IF;

    SELECT s INTO v_style
    FROM unnest(v_me.styles) AS s
    WHERE s = ANY (v_row.styles)
    LIMIT 1;
    IF v_style IS NOT NULL THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Also trains ' || public._community_style_label(v_style));
    END IF;

    -- Spec D: area_label carries the same show_place gate as place_label.
    IF coalesce(v_row.show_place, true) AND v_me.area_key IS NOT NULL
       AND v_row.area_key = v_me.area_key THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Lists ' || coalesce(v_row.area_label, v_me.area_label));
    END IF;

    -- Spec 1.1 C: place reasons are FIXED TOKENS, never a distance number
    -- for a person (only a venue ever carries distance_m). Spec D: a
    -- candidate hiding their place never contributes a place reason.
    IF NOT coalesce(v_row.show_place, true) THEN
      NULL;
    ELSIF v_me.place_key IS NOT NULL AND v_row.place_key = v_me.place_key THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || 'same_place'::text;
    ELSE
      v_place_m := public._community_place_band_m(v_uid, v_row.user_id);
      IF v_place_m IS NOT NULL AND v_place_m <= 16093 THEN
        v_score := v_score + 1;
        v_reasons := v_reasons || 'near_place'::text;
      ELSIF v_place_m IS NOT NULL AND v_place_m <= 40234 THEN
        v_score := v_score + 1;
        v_reasons := v_reasons || 'within_25_miles'::text;
      END IF;
    END IF;

    IF v_me.tp_age_band IS NOT NULL AND v_row.tp_age_band = v_me.tp_age_band THEN
      v_score := v_score + 1;
      v_reasons := v_reasons || 'same_age_band'::text;
    END IF;

    SELECT count(*) INTO v_mconn FROM (
      SELECT CASE WHEN c.user_a = v_uid THEN c.user_b ELSE c.user_a END AS m
      FROM public.community_connections c
      WHERE c.state = 'connected' AND (c.user_a = v_uid OR c.user_b = v_uid)
      INTERSECT
      SELECT CASE WHEN d.user_a = v_row.user_id THEN d.user_b ELSE d.user_a END
      FROM public.community_connections d
      WHERE d.state = 'connected'
        AND (d.user_a = v_row.user_id OR d.user_b = v_row.user_id)
    ) q;
    IF v_mconn > 0 THEN
      v_score := v_score + least(v_mconn * 2, 3);
      v_reasons := v_reasons || ('Connected to ' || v_mconn::text || ' of your connections');
    END IF;

    SELECT count(*) INTO v_mfoll
    FROM public.community_follows mine
    JOIN public.community_follows theirs ON theirs.follower_id = mine.followee_id
    WHERE mine.follower_id = v_uid AND mine.state = 'accepted'
      AND theirs.followee_id = v_row.user_id AND theirs.state = 'accepted';
    IF v_mfoll > 0 THEN
      v_score := v_score + least(v_mfoll, 3);
      v_reasons := v_reasons || ('Followed by ' || v_mfoll::text || ' you follow');
    END IF;

    IF v_me.goal IS NOT NULL AND v_row.goal = v_me.goal THEN
      v_score := v_score + 1;
      v_reasons := v_reasons || 'Same goal'::text;
    END IF;

    IF v_me.tp_time_bands IS NOT NULL AND v_row.tp_time_bands IS NOT NULL THEN
      SELECT b INTO v_band
      FROM unnest(v_me.tp_time_bands) AS b
      WHERE b = ANY (v_row.tp_time_bands)
      ORDER BY array_position(public._community_tp_time_bands_list(), b)
      LIMIT 1;
      IF v_band IS NOT NULL THEN
        v_score := v_score + 2;
        v_reasons := v_reasons
          || ('Both usually train ' || public._community_time_band_phrase(v_band));
      END IF;
    END IF;

    IF v_me.tp_days IS NOT NULL AND v_row.tp_days IS NOT NULL THEN
      SELECT array_agg(s.d ORDER BY array_position(public._community_tp_days_list(), s.d))
      INTO v_days
      FROM (SELECT unnest(v_me.tp_days) AS d
            INTERSECT
            SELECT unnest(v_row.tp_days)) s;
      IF v_days IS NOT NULL AND array_length(v_days, 1) >= 2 THEN
        v_score := v_score + 1;
        v_reasons := v_reasons || ('Both train ' || public._community_day_list(v_days));
      END IF;
    END IF;

    IF v_me.tp_sessions_band IS NOT NULL
       AND v_row.tp_sessions_band = v_me.tp_sessions_band THEN
      v_score := v_score + 1;
      v_reasons := v_reasons
        || ('Both train ' || public._community_sessions_phrase(v_me.tp_sessions_band)
            || ' times a week');
    END IF;

    IF v_me.tp_experience_band IS NOT NULL
       AND v_row.tp_experience_band = v_me.tp_experience_band THEN
      v_score := v_score + 1;
      v_reasons := v_reasons || 'Similar experience'::text;
    END IF;

    IF v_me.tp_staple_lifts IS NOT NULL AND v_row.tp_staple_lifts IS NOT NULL THEN
      SELECT count(*) INTO v_lifts FROM (
        SELECT unnest(v_me.tp_staple_lifts) AS l
        INTERSECT
        SELECT unnest(v_row.tp_staple_lifts)) s;
      IF v_lifts > 0 THEN
        v_score := v_score + least(v_lifts, 3);
        v_reasons := v_reasons || (v_lifts::text ||
          CASE WHEN v_lifts = 1 THEN ' staple lift in common'
               ELSE ' staple lifts in common' END);
      END IF;
    END IF;

    IF coalesce(v_me.open_to_partner, false) AND coalesce(v_row.open_to_partner, false) THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || 'Both open to training together'::text;
    END IF;

    IF v_score >= 1 OR _mode IN ('gym', 'area', 'partners') THEN
      v_items := v_items || jsonb_build_object(
        'card',    public._community_profile_card(v_row.user_id, v_uid),
        'reasons', to_jsonb(v_reasons),
        'score',   v_score,
        'last_active_at', v_row.last_active_at,
        'user_id', v_row.user_id);
    END IF;
  END LOOP;

  -- Keyset page: strictly AFTER the cursor row in (score DESC,
  -- last_active_at DESC, user_id DESC) order.
  SELECT jsonb_agg(t.x ORDER BY (t.x ->> 'score')::int DESC,
                    (t.x ->> 'last_active_at')::timestamptz DESC,
                    (t.x ->> 'user_id')::uuid DESC)
  INTO v_page
  FROM (
    SELECT u.x
    FROM (SELECT unnest(v_items) AS x) u
    WHERE v_cur_score IS NULL OR (
      ((u.x ->> 'score')::int, (u.x ->> 'last_active_at')::timestamptz, (u.x ->> 'user_id')::uuid)
      < (v_cur_score, v_cur_ts, v_cur_id)
    )
    ORDER BY (u.x ->> 'score')::int DESC, (u.x ->> 'last_active_at')::timestamptz DESC,
             (u.x ->> 'user_id')::uuid DESC
    LIMIT v_lim
  ) t;
  v_page := coalesce(v_page, '[]'::jsonb);

  SELECT count(*) INTO v_remaining
  FROM (SELECT unnest(v_items) AS x) u
  WHERE v_cur_score IS NULL OR (
    ((u.x ->> 'score')::int, (u.x ->> 'last_active_at')::timestamptz, (u.x ->> 'user_id')::uuid)
    < (v_cur_score, v_cur_ts, v_cur_id)
  );

  v_page_len := jsonb_array_length(v_page);
  IF v_remaining > v_lim AND v_page_len > 0 THEN
    v_next_cursor := public._community_find_people_cursor_of(
      ((v_page -> (v_page_len - 1)) ->> 'score')::int,
      ((v_page -> (v_page_len - 1)) ->> 'last_active_at')::timestamptz,
      ((v_page -> (v_page_len - 1)) ->> 'user_id')::uuid
    );
  END IF;

  -- SD-28 fallback: first page only, only when no hard filter narrowed the
  -- pool, and only when the real result is thin. Never for a keyed door
  -- whose key is missing (that case already returned early above).
  IF _cursor IS NULL AND _filters IS NULL AND v_page_len < 5 THEN
    SELECT coalesce(array_agg((x ->> 'user_id')::uuid), ARRAY[]::uuid[]) INTO v_already
    FROM jsonb_array_elements(v_page) x;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'card',    public._community_profile_card(f.user_id, v_uid),
             'reasons', '[]'::jsonb,
             'score',   0,
             'fallback', true)
           ORDER BY f.last_active_at DESC), '[]'::jsonb)
    INTO v_fallback
    FROM (
      SELECT p.user_id, p.last_active_at
      FROM public.community_profiles p
      WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
        AND p.user_id <> v_uid
        AND NOT (p.user_id = ANY (v_already))
        AND NOT public._community_is_blocked(v_uid, p.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.community_mutes mu
          WHERE mu.muter_id = v_uid AND mu.muted_id = p.user_id)
      ORDER BY p.last_active_at DESC
      LIMIT 10
    ) f;

    v_page := v_page || coalesce(v_fallback, '[]'::jsonb);
  END IF;

  -- The card-only output shape every existing caller reads: strip the
  -- internal 'user_id'/'last_active_at' sort keys back out.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'card', x -> 'card', 'reasons', x -> 'reasons', 'score', x -> 'score',
           'fallback', coalesce(x -> 'fallback', 'false'::jsonb))), '[]'::jsonb)
  INTO v_page
  FROM jsonb_array_elements(v_page) x;

  RETURN jsonb_build_object(
    'mode',   _mode,
    'key',    v_key,
    'label',  v_label,
    'count',  v_scanned,
    'count_truncated', v_scanned >= 1000,
    'people', v_page,
    'cursor', v_next_cursor);
END $$;


-- ─── Part 10: A - community_suggested_people re-issued (no programme
--              signal) ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_suggested_people(_limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_lim   int  := public._community_limit(_limit);
  v_me    public.community_profiles%ROWTYPE;
  v_out   jsonb := '[]'::jsonb;
  v_row   record;
  v_score int;
  v_reasons text[];
  v_style text;
  v_mutual int;
  v_items jsonb[] := ARRAY[]::jsonb[];
BEGIN
  v_me := public._community_require_profile(v_uid, false);

  FOR v_row IN
    SELECT p.*
    FROM public.community_profiles p
    WHERE p.status = 'active'
      AND p.visibility = 'public'
      AND p.is_minor = false
      AND p.user_id <> v_uid
      AND NOT public._community_is_blocked(v_uid, p.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes mu
        WHERE mu.muter_id = v_uid AND mu.muted_id = p.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.community_follows f
        WHERE f.follower_id = v_uid AND f.followee_id = p.user_id)
    ORDER BY p.last_active_at DESC
    LIMIT 200
  LOOP
    v_score := 0;
    v_reasons := ARRAY[]::text[];

    -- migrate_164 (40-GAP-CLOSURE.md section 2): the "uses a programme you
    -- use" signal read community_programme_uses/community_programmes, the
    -- retired shared-programme layer. Removed rather than left to score
    -- zero rows forever.
    IF v_me.gym_key IS NOT NULL AND v_row.gym_key = v_me.gym_key THEN
      v_score := v_score + 3;
      v_reasons := v_reasons || ('Trains at ' || coalesce(v_row.gym_label, v_me.gym_label));
    END IF;

    SELECT s INTO v_style
    FROM unnest(v_me.styles) AS s
    WHERE s = ANY (v_row.styles)
    LIMIT 1;
    IF v_style IS NOT NULL THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Also trains ' || public._community_style_label(v_style));
    END IF;

    IF v_me.area_key IS NOT NULL AND v_row.area_key = v_me.area_key THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Lists ' || coalesce(v_row.area_label, v_me.area_label));
    END IF;

    IF v_me.goal IS NOT NULL AND v_row.goal = v_me.goal THEN
      v_score := v_score + 1;
      v_reasons := v_reasons || ('Same goal')::text;
    END IF;

    SELECT count(*) INTO v_mutual
    FROM public.community_follows mine
    JOIN public.community_follows theirs ON theirs.follower_id = mine.followee_id
    WHERE mine.follower_id = v_uid AND mine.state = 'accepted'
      AND theirs.followee_id = v_row.user_id AND theirs.state = 'accepted';
    IF v_mutual > 0 THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Followed by ' || v_mutual::text || ' you follow');
    END IF;

    IF v_score >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'card',    public._community_profile_card(v_row.user_id, v_uid),
        'reasons', to_jsonb(v_reasons),
        'score',   v_score,
        'last_active_at', v_row.last_active_at);
    END IF;
  END LOOP;

  SELECT coalesce(jsonb_agg(z.x ORDER BY (z.x ->> 'score')::int DESC,
                            (z.x ->> 'last_active_at')::timestamptz DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT t.x
    FROM (SELECT unnest(v_items) AS x) t
    ORDER BY (t.x ->> 'score')::int DESC, (t.x ->> 'last_active_at')::timestamptz DESC
    LIMIT v_lim
  ) z;

  RETURN jsonb_build_object('people', v_out);
END $$;


-- ─── Part 11: A - community_dimension re-issued (programme kind always
--              empty) ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_dimension(
  _kind text, _key text, _cursor text DEFAULT NULL, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_lim   int  := public._community_limit(_limit);
  v_ts    timestamptz;
  v_id    uuid;
  v_label text;
  v_count int := 0;
  v_people jsonb := '[]'::jsonb;
  v_progs  jsonb := '[]'::jsonb;
  v_lts   timestamptz;
  v_lid   uuid;
BEGIN
  IF _kind NOT IN ('style', 'programme', 'gym', 'area') OR _key IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- migrate_164 (40-GAP-CLOSURE.md section 2): the shared-programme layer
  -- (community_programmes/community_programme_uses) is retired. 'programme'
  -- stays a VALID _kind (a stale client link never becomes a 500) but
  -- always renders the empty page the brief specifies, without touching
  -- the retired tables or _community_can_view_programme.
  IF _kind = 'programme' THEN
    RETURN jsonb_build_object(
      'label', NULL, 'count', 0,
      'people', '[]'::jsonb, 'programmes', '[]'::jsonb, 'cursor', NULL);
  END IF;

  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  IF _kind = 'style' THEN
    v_label := public._community_style_label(_key);
  ELSE
    SELECT CASE WHEN _kind = 'gym' THEN gym_label ELSE area_label END INTO v_label
    FROM public.community_profiles
    WHERE (_kind = 'gym' AND gym_key = _key) OR (_kind = 'area' AND area_key = _key)
    LIMIT 1;
  END IF;

  WITH page AS (
    SELECT p.user_id AS user_id, p.created_at AS created_at
    FROM public.community_profiles p
    WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
      AND p.user_id <> v_uid
      AND NOT public._community_is_blocked(v_uid, p.user_id)
      AND (
        (_kind = 'style' AND _key = ANY (p.styles))
     OR (_kind = 'gym'   AND p.gym_key = _key)
     OR (_kind = 'area'  AND p.area_key = _key)
      )
      AND (v_ts IS NULL OR (p.created_at, p.user_id) < (v_ts, v_id))
    ORDER BY p.created_at DESC, p.user_id DESC
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(public._community_profile_card(page.user_id, v_uid)
             ORDER BY page.created_at DESC, page.user_id DESC), '[]'::jsonb),
    (array_agg(page.created_at ORDER BY page.created_at ASC, page.user_id ASC))[1],
    (array_agg(page.user_id    ORDER BY page.created_at ASC, page.user_id ASC))[1]
  INTO v_people, v_lts, v_lid
  FROM page;

  SELECT count(*) INTO v_count
  FROM public.community_profiles p
  WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
    AND p.user_id <> v_uid
    AND NOT public._community_is_blocked(v_uid, p.user_id)
    AND (
      (_kind = 'style' AND _key = ANY (p.styles))
   OR (_kind = 'gym'   AND p.gym_key = _key)
   OR (_kind = 'area'  AND p.area_key = _key)
    );

  -- migrate_164: no programme tiles anywhere, for any kind. The 'style'
  -- branch used to surface community_programmes rows sharing the style; the
  -- table now holds none and never will while the layer is retired.
  v_progs := '[]'::jsonb;

  RETURN jsonb_build_object(
    'label', v_label, 'count', v_count,
    'people', coalesce(v_people, '[]'::jsonb),
    'programmes', v_progs,
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;


-- ─── Part 12: A - community_comment / community_report re-issued (reject
--              target_kind = 'programme') ──────────────────────────────

CREATE OR REPLACE FUNCTION public.community_comment(
  _target_kind text, _target_id uuid, _body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_owner uuid;
  v_body  text;
  v_id    uuid;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  -- migrate_164 (40-GAP-CLOSURE.md section 2): 'programme' retired as a
  -- comment target along with the shared-programme layer it named.
  IF _target_kind NOT IN ('post') OR _target_id IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_body := public._community_clean_text(btrim(coalesce(_body, '')));
  IF v_body IS NULL OR length(v_body) < 1 OR length(v_body) > 500 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  SELECT author_id INTO v_owner FROM public.community_posts
  WHERE id = _target_id AND status = 'visible';
  IF v_owner IS NULL THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF public._community_is_blocked(v_uid, v_owner) THEN
    RAISE EXCEPTION USING message = 'blocked';
  END IF;
  -- Security review 2026-09-06 (findings 1-2): the TARGET's own visibility
  -- decides, not the owner's profile visibility.
  IF NOT public._community_can_view_post(v_uid, _target_id) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  -- Comments are the most abusable surface, so the window is an hour rather
  -- than a day.
  PERFORM public._community_rate_check(v_uid, 'comment', 10, 30, interval '1 hour');

  INSERT INTO public.community_comments (target_kind, target_id, author_id, body)
  VALUES (_target_kind, _target_id, v_uid, v_body)
  RETURNING id INTO v_id;

  PERFORM public._community_add_activity(v_owner, v_uid, 'comment', _target_kind, _target_id);

  RETURN jsonb_build_object('id', v_id);
END $$;

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
  -- migrate_164 (40-GAP-CLOSURE.md section 2): 'programme' retired as a
  -- report target along with the shared-programme layer it named. The
  -- CHECK on community_reports.target_kind keeps 'programme' (historic
  -- rows, no DROP COLUMN/CONSTRAINT here) but this RPC never inserts one.
  IF _target_kind NOT IN ('profile', 'post', 'comment', 'message')
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
  ELSE
    -- _target_kind = 'message'. The target owner is the message SENDER; the
    -- caller must be a party to the conversation (either side); a message
    -- from a closed conversation is still reportable -- evidence survives
    -- closure, so `closed_at` is never checked here.
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

  PERFORM public._community_auto_hide(_target_kind, _target_id);

  RETURN jsonb_build_object('id', v_id);
END $$;


-- ─── Part 13: E, G, D - moderated-person notice, quiet hours, privacy
--              setters ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_my_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_status text;
  v_since  timestamptz;
  v_reason text;
BEGIN
  SELECT status, updated_at INTO v_status, v_since
  FROM public.community_profiles WHERE user_id = v_uid;
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('status', NULL, 'reason_class', NULL, 'since', NULL);
  END IF;

  IF v_status IN ('restricted', 'suspended') THEN
    SELECT r.reason INTO v_reason
    FROM public.community_moderation_log l
    JOIN public.community_reports r ON r.id = l.report_id
    WHERE r.target_kind = 'profile' AND r.target_id = v_uid
    ORDER BY l.created_at DESC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'status', v_status, 'reason_class', v_reason, 'since', v_since);
END $$;

CREATE OR REPLACE FUNCTION public.community_set_quiet_hours(
  _start smallint, _end smallint, _tz text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_tz  text;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  PERFORM public._community_rate_check(v_uid, 'set_quiet_hours', 60, 60, interval '1 hour');

  -- NULL/NULL clears quiet hours; otherwise both bounds are required and
  -- must be valid minutes-from-midnight (an overnight window, e.g. 1380 to
  -- 420, is valid and read as wrapping past midnight by the projection).
  IF _start IS NULL AND _end IS NULL THEN
    NULL;
  ELSIF _start IS NULL OR _end IS NULL
     OR _start < 0 OR _start > 1439 OR _end < 0 OR _end > 1439 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_tz := nullif(btrim(coalesce(_tz, '')), '');
  IF v_tz IS NOT NULL AND length(v_tz) > 64 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  -- A real IANA zone name is checked the only honest way Postgres can:
  -- asking it to convert with it. An unknown zone raises here rather than
  -- silently storing a string the edge function's Intl call rejects later.
  IF v_tz IS NOT NULL THEN
    PERFORM now() AT TIME ZONE v_tz;
  END IF;

  INSERT INTO public.notification_preferences
    (user_id, category, enabled, quiet_start, quiet_end, tz)
  VALUES (v_uid, 'quiet_hours', true, _start, _end, v_tz)
  ON CONFLICT (user_id, category) DO UPDATE SET
    quiet_start = excluded.quiet_start,
    quiet_end   = excluded.quiet_end,
    tz          = excluded.tz,
    updated_at  = now();

  RETURN jsonb_build_object(
    'quiet_start', _start, 'quiet_end', _end, 'tz', v_tz);
END $$;

CREATE OR REPLACE FUNCTION public.community_set_show_gym(_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
BEGIN
  IF _on IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  PERFORM public._community_require_profile(v_uid, true);
  PERFORM public._community_rate_check(v_uid, 'set_show_gym', 120, 120, interval '1 hour');

  UPDATE public.community_profiles SET show_gym = _on WHERE user_id = v_uid;
  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_set_show_place(_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
BEGIN
  IF _on IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  PERFORM public._community_require_profile(v_uid, true);
  PERFORM public._community_rate_check(v_uid, 'set_show_place', 120, 120, interval '1 hour');

  UPDATE public.community_profiles SET show_place = _on WHERE user_id = v_uid;
  RETURN public._community_profile_card(v_uid, v_uid);
END $$;


-- ─── Part 14: F - session suggestion (message ref kind, response,
--              message json) ───────────────────────────────────────────

-- ── F: session suggestion ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_send_message(
  _target uuid, _body text, _ref_kind text DEFAULT NULL, _ref_id uuid DEFAULT NULL,
  _ref_payload jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_me    public.community_profiles%ROWTYPE;
  v_them  public.community_profiles%ROWTYPE;
  v_body  text;
  v_kind  text;
  v_payload jsonb;
  v_day   text;
  v_band  text;
  v_gym_id uuid;
  v_a     uuid;
  v_b     uuid;
  v_conv  public.community_conversations%ROWTYPE;
  v_msg   public.community_messages%ROWTYPE;
BEGIN
  IF _target IS NULL OR _target = v_uid THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_me := public._community_require_profile(v_uid, true);
  PERFORM public._community_require_rules(v_me);

  SELECT * INTO v_them FROM public.community_profiles WHERE user_id = _target;
  IF NOT FOUND OR v_them.status <> 'active' THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;
  IF public._community_is_blocked(v_uid, _target) THEN
    RAISE EXCEPTION USING message = 'blocked';
  END IF;
  IF public._community_caller_is_minor(v_uid) OR public._community_other_is_minor(_target) THEN
    RAISE EXCEPTION USING message = 'minor_restricted';
  END IF;
  IF NOT public._community_is_connected(v_uid, _target) THEN
    RAISE EXCEPTION USING message = 'not_connected';
  END IF;

  v_body := nullif(btrim(coalesce(_body, '')), '');
  IF v_body IS NULL OR length(v_body) > 1000 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_body := public._community_clean_text(v_body);

  -- One context reference, and only to something this sender may actually
  -- see: a message must never become a way to name a hidden programme or a
  -- followers-only story (SD-14b). migrate_164 adds 'session': a proposed
  -- training session, never a shared entity to look up, so it carries its
  -- own validated payload instead of a ref_id lookup.
  v_kind := nullif(btrim(coalesce(_ref_kind, '')), '');
  IF v_kind IS NOT NULL THEN
    IF v_kind NOT IN ('programme', 'post', 'session') THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    IF v_kind = 'programme' THEN
      IF _ref_id IS NULL OR NOT public._community_can_view_programme(v_uid, _ref_id) THEN
        RAISE EXCEPTION USING message = 'not_found';
      END IF;
    ELSIF v_kind = 'post' THEN
      IF _ref_id IS NULL OR NOT public._community_can_view_post(v_uid, _ref_id) THEN
        RAISE EXCEPTION USING message = 'not_found';
      END IF;
    ELSE
      -- 'session': _ref_id is never used (nothing to look up); _ref_payload
      -- is the whole of it and every key is checked by hand -- jsonb has no
      -- CHECK-constraint equivalent, so this is the validation.
      IF _ref_payload IS NULL OR jsonb_typeof(_ref_payload) <> 'object' THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      IF (SELECT count(*) FROM jsonb_object_keys(_ref_payload) k
          WHERE k NOT IN ('day', 'time_band', 'gym_id')) > 0 THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      v_day := _ref_payload ->> 'day';
      IF v_day IS NULL OR v_day NOT IN
         ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun') THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      v_band := _ref_payload ->> 'time_band';
      IF v_band IS NULL OR v_band NOT IN
         ('early', 'morning', 'midday', 'afternoon', 'evening', 'late') THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      IF _ref_payload ? 'gym_id' AND (_ref_payload -> 'gym_id') IS NOT NULL
         AND jsonb_typeof(_ref_payload -> 'gym_id') <> 'null' THEN
        v_gym_id := (_ref_payload ->> 'gym_id')::uuid;
        IF NOT EXISTS (SELECT 1 FROM public.gym_venues WHERE id = v_gym_id) THEN
          RAISE EXCEPTION USING message = 'invalid_input';
        END IF;
      END IF;
      v_payload := jsonb_build_object('day', v_day, 'time_band', v_band, 'gym_id', v_gym_id);
    END IF;
  END IF;

  PERFORM public._community_rate_check(v_uid, 'message', 20, 60, interval '1 hour');

  v_a := least(v_uid, _target);
  v_b := greatest(v_uid, _target);
  SELECT * INTO v_conv FROM public.community_conversations WHERE user_a = v_a AND user_b = v_b;
  IF NOT FOUND THEN
    INSERT INTO public.community_conversations (user_a, user_b) VALUES (v_a, v_b)
    RETURNING * INTO v_conv;
  ELSIF v_conv.closed_at IS NOT NULL THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  INSERT INTO public.community_messages
    (conversation_id, sender_id, body, ref_kind, ref_id, ref_payload)
  VALUES (v_conv.id, v_uid, v_body, v_kind,
          CASE WHEN v_kind IN ('programme', 'post') THEN _ref_id END,
          CASE WHEN v_kind = 'session' THEN v_payload END)
  RETURNING * INTO v_msg;

  UPDATE public.community_conversations SET
    last_message_at = now(),
    a_last_read_at = CASE WHEN v_a = v_uid THEN now() ELSE a_last_read_at END,
    b_last_read_at = CASE WHEN v_b = v_uid THEN now() ELSE b_last_read_at END
  WHERE id = v_conv.id;

  RETURN jsonb_build_object(
    'conversation_id', v_conv.id,
    'message',         public._community_message_json(v_msg, v_uid));
END $$;

-- Spec F: once-only, party-checked. Neither the proposer nor the recipient
-- can respond twice; the response lives on the SAME message row, in its
-- ref_payload, so there is exactly one row of truth for "did they say
-- yes" and no second table to keep in step with the message it answers.
CREATE OR REPLACE FUNCTION public.community_respond_session(
  _message_id uuid, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_msg public.community_messages%ROWTYPE;
  v_conv public.community_conversations%ROWTYPE;
BEGIN
  IF _message_id IS NULL OR _accept IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  PERFORM public._community_require_profile(v_uid, true);

  SELECT * INTO v_msg FROM public.community_messages WHERE id = _message_id;
  IF NOT FOUND OR v_msg.ref_kind <> 'session' THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;

  SELECT * INTO v_conv FROM public.community_conversations WHERE id = v_msg.conversation_id;
  -- Party-checked: only the two people in the conversation, and never the
  -- sender responding to their own suggestion.
  IF NOT FOUND OR (v_conv.user_a <> v_uid AND v_conv.user_b <> v_uid)
     OR v_msg.sender_id = v_uid THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_conv.closed_at IS NOT NULL THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_msg.ref_payload ? 'accepted' THEN
    RAISE EXCEPTION USING message = 'already_responded';
  END IF;

  UPDATE public.community_messages
  SET ref_payload = coalesce(ref_payload, '{}'::jsonb)
    || jsonb_build_object('accepted', _accept, 'responded_at', now())
  WHERE id = _message_id
  RETURNING * INTO v_msg;

  RETURN jsonb_build_object(
    'conversation_id', v_msg.conversation_id,
    'message',         public._community_message_json(v_msg, v_uid));
END $$;

CREATE OR REPLACE FUNCTION public._community_message_json(_r public.community_messages, _viewer uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ref jsonb := NULL;
  v_g   public.community_programmes%ROWTYPE;
  v_p   public.community_posts%ROWTYPE;
  v_gym_name text;
BEGIN
  IF _r.ref_kind = 'programme' AND _r.ref_id IS NOT NULL
     AND public._community_can_view_programme(_viewer, _r.ref_id) THEN
    SELECT * INTO v_g FROM public.community_programmes WHERE id = _r.ref_id;
    IF FOUND THEN v_ref := public._community_programme_tile(v_g); END IF;
  ELSIF _r.ref_kind = 'post' AND _r.ref_id IS NOT NULL
     AND public._community_can_view_post(_viewer, _r.ref_id) THEN
    SELECT * INTO v_p FROM public.community_posts WHERE id = _r.ref_id;
    IF FOUND THEN
      v_ref := public._community_post_json(v_p)
        || jsonb_build_object('author', public._community_profile_card(v_p.author_id, _viewer));
    END IF;
  ELSIF _r.ref_kind = 'session' THEN
    -- Spec F: the gym display name via the gym directory when gym_id is
    -- set, resolved fresh every read rather than cached on the message (a
    -- venue can be renamed or merged after the message was sent).
    IF _r.ref_payload ? 'gym_id' AND jsonb_typeof(_r.ref_payload -> 'gym_id') <> 'null' THEN
      SELECT display_name INTO v_gym_name FROM public.gym_venues
      WHERE id = (_r.ref_payload ->> 'gym_id')::uuid;
    END IF;
    v_ref := _r.ref_payload || jsonb_build_object('gym_name', v_gym_name);
  END IF;

  RETURN jsonb_build_object(
    'id',              _r.id,
    'conversation_id', _r.conversation_id,
    'sender_id',       _r.sender_id,
    'mine',            _r.sender_id = _viewer,
    'body',            _r.body,
    'ref_kind',        _r.ref_kind,
    'ref_id',          _r.ref_id,
    'ref',             v_ref,
    'created_at',      _r.created_at
  );
END $$;

-- ─── Part 15: A - programme RPCs, EXECUTE revoked entirely ───────────────
--
-- Not re-granted to anyone. Bodies are untouched (no DROP FUNCTION): only
-- the grant moves, so a rollback that wants the layer back needs nothing
-- but the reverse GRANT (see the file header).

DO $$
DECLARE sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'community_publish_programme(jsonb)',
    'community_unpublish_programme(uuid)',
    'community_discover_programmes(text, text, int)',
    'community_search_programmes(text, text, text, int)',
    'community_get_programme(uuid)',
    'community_record_programme_use(uuid, text)',
    'community_programme_people(uuid, text, int)',
    'community_set_show_programmes(boolean)',
    'community_my_programmes()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', sig);
  END LOOP;
END $$;

-- ─── Part 16: privileges for everything else this file touches ──────────

DO $$
DECLARE
  sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    '_community_profile_card(uuid, uuid)',
    '_community_message_json(community_messages, uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', sig);
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'community_search_people(text, int)',
    'community_list_followers(text, int)',
    'community_find_people(text, text, int, jsonb)',
    'community_suggested_people(int)',
    'community_dimension(text, text, text, int)',
    'community_comment(text, uuid, text)',
    'community_report(text, uuid, text, text)',
    'community_my_status()',
    'community_set_quiet_hours(smallint, smallint, text)',
    'community_set_show_gym(boolean)',
    'community_set_show_place(boolean)',
    'community_send_message(uuid, text, text, uuid, jsonb)',
    'community_respond_session(uuid, boolean)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', sig);
  END LOOP;
END $$;

-- ─── Part 17: acceptance check (read-only) ───────────────────────────────
--
-- Run after the apply and read the output before declaring this migration
-- landed. Expect: the two community_profiles columns, the community_
-- messages column, the three notification_preferences columns all present;
-- every function below SECURITY DEFINER with the search_path pinned;
-- `authenticated` executing exactly the client RPCs this file grants;
-- the nine programme RPCs executable by NOBODY (authenticated_can_execute
-- and anon_can_execute both false).

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'community_profiles'
  AND column_name IN ('show_gym', 'show_place')
ORDER BY column_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'community_messages'
  AND column_name = 'ref_payload';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notification_preferences'
  AND column_name IN ('quiet_start', 'quiet_end', 'tz')
ORDER BY column_name;

SELECT p.proname,
       p.prosecdef AS security_definer,
       p.proconfig AS settings,
       pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'community_search_people', 'community_list_followers', 'community_find_people',
    'community_suggested_people', 'community_dimension', 'community_comment',
    'community_report', 'community_my_status', 'community_set_quiet_hours',
    'community_set_show_gym', 'community_set_show_place', 'community_send_message',
    'community_respond_session', '_community_profile_card', '_community_message_json',
    'community_publish_programme', 'community_unpublish_programme',
    'community_discover_programmes', 'community_search_programmes',
    'community_get_programme', 'community_record_programme_use',
    'community_programme_people', 'community_set_show_programmes', 'community_my_programmes'
  )
ORDER BY p.proname, args;
