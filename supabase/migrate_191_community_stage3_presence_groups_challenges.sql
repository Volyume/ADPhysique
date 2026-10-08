-- migrate_191_community_stage3_presence_groups_challenges.sql
--
-- Tables and columns changing (all ADDITIVE, nothing dropped or rewritten):
--   public.community_profiles          + training_since timestamptz NULL,
--                                      + show_training_now boolean NOT NULL DEFAULT false
--   public.community_group_members     + last_read_at timestamptz NULL,
--                                      + last_push_at timestamptz NULL
--   NEW public.community_group_messages, public.community_group_challenges,
--       public.community_challenge_entries (RLS on, no policy, all grants
--       revoked: RPC-only, as every Community table).
--   NEW functions: _community_group_message_visible,
--       _community_group_message_json, _community_challenge_json,
--       _community_training_now,
--       community_set_training_now, community_set_show_training_now,
--       community_group_messages, community_group_send_message,
--       community_group_message_delete, community_group_mark_read,
--       community_group_message_recipients (service role only),
--       community_group_decline_invite, community_challenge_create,
--       community_challenge_end, community_challenge_log_session,
--       community_challenge_board.
--   REPLACED (same signatures, CREATE OR REPLACE): community_hub_summary(text),
--       community_group_get(uuid), community_group_list_mine().
-- Environment: the EU-Dublin production project (and any staging copy),
-- applied by hand only.
--
-- Purpose:           register D221 ruling 4, docs/audit/community-level-up-
--                    2026-10-08/15-STAGE3-SPEC.md "Server" (lane 3S).
--                    3a Presence: an opt-in "training now" marker. A person
--                       turns show_training_now on (never for a minor, D212);
--                       the app sets training_since at session start and
--                       clears it at finish; readers see only people the
--                       caller follows (hub) or shares a group with (group
--                       page), training_since within 3 hours, names capped
--                       at 3. Withheld (null) for a caller the migrate_180
--                       gate withholds; a person the gate withholds is never
--                       listed. No push.
--                    3b Group chat: text only, members only, 500 characters,
--                       keyword filter and a per-hour rate rail, a block or
--                       mute hides the sender from the person who blocked or
--                       muted them, author or admin delete, an unread count
--                       per group on community_group_list_mine, and
--                       community_group_decline_invite (removes the caller's
--                       'invited' row; not_found otherwise).
--                    3c Session-count challenges: one active challenge per
--                       group (partial unique index), admin create and end,
--                       member log (idempotent on session_key, inside the
--                       window and within 2 days of the UK-local today), and
--                       a board of session COUNTS only, withheld for a gated
--                       caller. No load, body figure or food figure exists in
--                       any column, argument or payload below.
--
-- ROUND 3R ADDITIONS (2026-10-08, still UNAPPLIED, edited in place):
--                    S1 community_group_get / community_group_list_mine carry
--                       'active_challenge' ({id, name, starts_on, ends_on,
--                       target_sessions} or null; active and unexpired, members
--                       only), and the member RPC community_group_active_
--                       challenges() lists the caller's active challenge ids.
--                    S2 community_get_me carries 'show_training_now'.
--                    S3 community_report accepts target_kind 'group_message'
--                       (the message must exist, the reporter must be a
--                       current member; the target_kind CHECK is widened).
--                    S4 THE CHALLENGE BOARD ROWS OMIT PEOPLE THE CALLER MUTED
--                       OR BLOCKED; the group total still counts them (a group
--                       figure with no identity).
--                    S5 chat reads need state = 'member' (via _community_group_
--                       role, migrate_165), so an invited, requested, removed or
--                       former member is refused even for a closed group; a
--                       current member can still read a closed group's chat.
--                    S6 the hub 'training_now' payload gains 'trained_today',
--                       a COUNT from community_friends_trained_today's predicate.
--                    N4 (documented, intended): turning show_training_now ON keeps
--                       a training_since from the last 3 hours, so someone who
--                       began a session with the switch off shows as training
--                       from the moment it is turned on, until the 3 hours pass.
--                    N1/N2 are resolved by S4 and S5 above.
--                    Also REPLACED here: community_get_me() (migrate_184 body)
--                    and community_report(text,uuid,text,text) (migrate_165
--                    body), each plus marked additions; new internal helper
--                    _community_active_challenge(uuid). Rollback also re-runs
--                    those two bodies verbatim and DROPs the two new functions.
--
-- READ-SIDE GATE REUSED, NEVER RE-IMPLEMENTED: public._community_consistency_
--                    withheld(uuid) (migrate_180 line 337: the open ED flag
--                    arm, line 266, OR the calm mode arm, line 302; both fail
--                    closed). Called by _community_training_now (caller and
--                    each listed person) and by community_challenge_board
--                    (caller and each counted member). Part 0 refuses to run
--                    until 180 is live.
-- OTHER HELPERS REUSED: _community_caller (migrate_160 line 1096),
--                    _community_require_profile (migrate_160 line 1114),
--                    _community_limit (migrate_160 line 996),
--                    _community_cursor_parts (migrate_160 line 977),
--                    _community_cursor_of (migrate_160 line 1007),
--                    _community_is_blocked (migrate_160 line 718),
--                    _community_rate_check (migrate_160 line 869; the DM call
--                    shape of community_send_message, migrate_164 line 1431),
--                    _community_clean_text (migrate_160 line 913: the keyword
--                    filter community_send_message applies to a body, and the
--                    same blocked-term list migrate_178's
--                    _community_payload_has_blocked_term, line 198, walks),
--                    _community_require_rules (migrate_161 line 487; as the DM send),
--                    _community_caller_is_minor (migrate_161 line 710),
--                    _community_group_role / _community_group_is_admin
--                    (migrate_165 lines 736, 747),
--                    _community_group_card (migrate_165 line 771).
-- BODIES RE-ISSUED: community_hub_summary from migrate_180 lines 869-1031
--                    and community_group_get from migrate_180 lines 1038-1133
--                    (the latest of each; nothing later touches them) with
--                    ONE marked addition each (the training_now key);
--                    community_group_list_mine from migrate_176 lines
--                    250-275 with ONE marked addition (the unread key).
--
-- Applied locally:   N/A (Community adds no local SQLite table; the client is
--                    src/lib/community/{presence,groupChat,challenges,groups}.js).
-- Applied remotely:  NO (UNAPPLIED). STATUS: UNAPPLIED, written 2026-10-08 by
--                    lane 3S. Apply only on the founder's exact phrase
--                    "run against production: 191" (CLAUDE.md section 2,
--                    "Database schema"); the app never runs it and the deploy
--                    workflow is manual-dispatch only. The route is the Claude
--                    session's Supabase connector under the checksum protocol
--                    (docs/rules/supabase.md, "Cloud route"). After the apply:
--                    the acceptance block at the foot, this header edited to
--                    the applied state, the README ledger row and the
--                    CLAUDE.md "applied through" line updated.
-- Safe to re-run:    YES. ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT
--                    EXISTS, CREATE INDEX IF NOT EXISTS, constraints added
--                    inside duplicate_object handlers, CREATE OR REPLACE
--                    FUNCTION throughout, REVOKE and GRANT restated, no row
--                    is created, changed or deleted by the file itself.
--                    Part 0 is read-only and passes on every re-run.
-- Additive and idempotent: yes (no DROP of a table, column or row; no
--                    function is dropped, and every signature is unchanged
--                    so no overload can appear).
-- Rollback:          DROP FUNCTION IF EXISTS for the sixteen new functions
--                    named above (with their argument lists); then re-run
--                    the migrate_180 community_hub_summary and
--                    community_group_get blocks and the migrate_176
--                    community_group_list_mine block verbatim (lines given
--                    above); then, only if the columns and tables hold
--                    nothing worth keeping: DROP TABLE IF EXISTS
--                    public.community_challenge_entries,
--                    public.community_group_challenges,
--                    public.community_group_messages; ALTER TABLE
--                    public.community_group_members DROP COLUMN IF EXISTS
--                    last_read_at, DROP COLUMN IF EXISTS last_push_at; ALTER
--                    TABLE public.community_profiles DROP COLUMN IF EXISTS
--                    training_since, DROP COLUMN IF EXISTS show_training_now.
-- GDPR note:         new personal data: a message body a member chose to
--                    write to their own group, a challenge session count, and
--                    a transient "training now" timestamp the person opted
--                    into. All of it is removed when delete_user_data()
--                    deletes the community_profiles row (the new tables
--                    reference community_profiles with ON DELETE CASCADE,
--                    and challenges and messages reference
--                    community_groups with ON DELETE CASCADE). Nothing about
--                    body figures, food or health is stored. EU-Dublin
--                    residency unchanged. A minor never gets the presence
--                    marker (D212) and groups already exclude minors.

-- ─── Part 0: pre-flight (read-only) ─────────────────────────────────────

DO $$
BEGIN
  IF to_regprocedure('public._community_consistency_withheld(uuid)') IS NULL THEN
    RAISE EXCEPTION 'migrate_191 refused: _community_consistency_withheld missing; apply migrate_180 first';
  END IF;
  IF to_regprocedure('public._community_caller_is_minor(uuid)') IS NULL THEN
    RAISE EXCEPTION 'migrate_191 refused: _community_caller_is_minor missing; apply migrate_161 first';
  END IF;
  IF to_regprocedure('public.community_group_list_mine()') IS NULL THEN
    RAISE EXCEPTION 'migrate_191 refused: community_group_list_mine missing; apply migrate_165 first';
  END IF;
END $$;

-- ─── Part 1: columns and tables ─────────────────────────────────────────

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS training_since timestamptz;
ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS show_training_now boolean NOT NULL DEFAULT false;

ALTER TABLE public.community_group_members
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;
-- The 15-minute per-group, per-recipient push collapse clock, written only by
-- the community-notify edge function with the service role (the DM pattern:
-- community_conversations.a_last_push_at / b_last_push_at, migrate_161).
ALTER TABLE public.community_group_members
  ADD COLUMN IF NOT EXISTS last_push_at timestamptz;

CREATE TABLE IF NOT EXISTS public.community_group_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES public.community_profiles(user_id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.community_group_messages
    ADD CONSTRAINT community_group_messages_body_len_check
    CHECK (char_length(body) BETWEEN 1 AND 500);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS community_group_messages_group_idx
  ON public.community_group_messages (group_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS community_group_messages_author_idx
  ON public.community_group_messages (author_id);

CREATE TABLE IF NOT EXISTS public.community_group_challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  name            text NOT NULL,
  starts_on       date NOT NULL,
  ends_on         date NOT NULL,
  target_sessions int,
  created_by      uuid NOT NULL REFERENCES public.community_profiles(user_id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.community_group_challenges
    ADD CONSTRAINT community_group_challenges_name_len_check
    CHECK (char_length(name) BETWEEN 1 AND 40);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_group_challenges
    ADD CONSTRAINT community_group_challenges_window_check
    CHECK (ends_on > starts_on AND ends_on <= starts_on + 31);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_group_challenges
    ADD CONSTRAINT community_group_challenges_target_check
    CHECK (target_sessions IS NULL OR target_sessions BETWEEN 1 AND 200);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_group_challenges
    ADD CONSTRAINT community_group_challenges_status_check
    CHECK (status IN ('active', 'ended'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One active challenge per group.
CREATE UNIQUE INDEX IF NOT EXISTS community_group_challenges_one_active_idx
  ON public.community_group_challenges (group_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS community_group_challenges_group_idx
  ON public.community_group_challenges (group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_challenge_entries (
  challenge_id uuid NOT NULL REFERENCES public.community_group_challenges(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.community_profiles(user_id) ON DELETE CASCADE,
  session_key  text NOT NULL,
  logged_on    date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id, session_key)
);

DO $$ BEGIN
  ALTER TABLE public.community_challenge_entries
    ADD CONSTRAINT community_challenge_entries_key_len_check
    CHECK (char_length(session_key) BETWEEN 1 AND 64);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS community_challenge_entries_user_idx
  ON public.community_challenge_entries (user_id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'community_group_messages', 'community_group_challenges', 'community_challenge_entries'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- ─── Part 2 (3a): presence ──────────────────────────────────────────────

-- Who is training now, for one viewer. _group_id NULL: the people the viewer
-- follows (accepted). _group_id set: that group's members (the caller of this
-- helper has already proved the viewer is a member). Returns
-- {count, names[]} (names are display_name, newest first, at most 3), or SQL
-- NULL when the VIEWER is withheld by the migrate_180 gate. A person the gate
-- withholds, a minor, a blocked or muted person, a non-active profile, the
-- viewer, and anyone whose training_since is older than 3 hours, is never
-- listed.
CREATE OR REPLACE FUNCTION public._community_training_now(_viewer uuid, _group_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_out jsonb;
BEGIN
  IF public._community_consistency_withheld(_viewer) THEN
    RETURN NULL;
  END IF;

  WITH t AS (
    SELECT p.user_id, p.display_name, p.training_since
    FROM public.community_profiles p
    WHERE p.show_training_now = true
      AND p.training_since IS NOT NULL
      AND p.training_since > now() - interval '3 hours'
      AND p.status = 'active'
      AND p.is_minor = false
      AND p.user_id <> _viewer
      AND NOT public._community_is_blocked(_viewer, p.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes mu
        WHERE mu.muter_id = _viewer AND mu.muted_id = p.user_id)
      AND (
        (_group_id IS NULL AND EXISTS (
           SELECT 1 FROM public.community_follows f
           WHERE f.follower_id = _viewer AND f.followee_id = p.user_id
             AND f.state = 'accepted'))
        OR
        (_group_id IS NOT NULL AND EXISTS (
           SELECT 1 FROM public.community_group_members gm
           WHERE gm.group_id = _group_id AND gm.user_id = p.user_id
             AND gm.state = 'member'))
      )
      -- last in the AND: the migrate_180 gate, per listed person.
      AND NOT public._community_consistency_withheld(p.user_id)
  )
  SELECT jsonb_build_object(
    'count', (SELECT count(*) FROM t),
    'names', coalesce((
      SELECT jsonb_agg(x.display_name ORDER BY x.training_since DESC, x.user_id)
      FROM (SELECT t.display_name, t.training_since, t.user_id FROM t
            ORDER BY t.training_since DESC, t.user_id LIMIT 3) x), '[]'::jsonb))
  INTO v_out;

  RETURN v_out;
END $$;

REVOKE ALL ON FUNCTION public._community_training_now(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Own row only. true sets training_since = now(); false clears it. Allowed
-- for a minor in the clearing direction only: the marker is never visible
-- for a minor (show_training_now cannot be true, and the reader excludes
-- is_minor), so setting it is a harmless no-op that still refuses nothing.
CREATE OR REPLACE FUNCTION public.community_set_training_now(_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
BEGIN
  IF _on IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  -- Setting needs good standing; clearing never does (a restricted person
  -- must always be able to switch themselves off).
  PERFORM public._community_require_profile(v_uid, _on);
  PERFORM public._community_rate_check(v_uid, 'set_training_now', 120, 240, interval '1 hour');

  UPDATE public.community_profiles
  SET training_since = CASE WHEN _on THEN now() ELSE NULL END
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('training', _on);
END $$;

REVOKE ALL ON FUNCTION public.community_set_training_now(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_set_training_now(boolean) TO authenticated;

-- Own row only, refused for a minor (D212: a minor's audience never widens).
-- Turning it off also clears training_since.
CREATE OR REPLACE FUNCTION public.community_set_show_training_now(_on boolean)
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
  IF public._community_caller_is_minor(v_uid) THEN
    RAISE EXCEPTION USING message = 'forbidden';
  END IF;
  PERFORM public._community_rate_check(v_uid, 'set_show_training_now', 120, 120, interval '1 hour');

  UPDATE public.community_profiles
  SET show_training_now = _on,
      training_since = CASE WHEN _on THEN training_since ELSE NULL END
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('show_training_now', _on);
END $$;

REVOKE ALL ON FUNCTION public.community_set_show_training_now(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_set_show_training_now(boolean) TO authenticated;

-- ─── Part 3 (3a): community_hub_summary re-issued with training_now ─────
-- migrate_180 lines 869-1031 carried forward byte-for-byte; the marked
-- migrate_191 additions are the ONLY difference.

CREATE OR REPLACE FUNCTION public.community_hub_summary(_today text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := public._community_caller();
  v_me      public.community_profiles%ROWTYPE;
  v_cohorts jsonb := '[]'::jsonb;
  v_groups  jsonb := '[]'::jsonb;
  v_style   text;
  v_disc    text;
  v_stats   jsonb;
  v_today   text;     -- reviewer 2026-09-10
  v_training jsonb;   -- migrate_191 (3a)
BEGIN
  -- reviewer 2026-09-10 (lead ruling 1): backwards compatibility is
  -- mandatory. Live builds on Google Play call this with no `_today` at
  -- all, so a NULL or absent value falls back to the UK-local day key
  -- rather than refusing - `to_char(timezone('Europe/London', now()),
  -- 'YYYY-MM-DD')` produces the exact zero-padded YYYY-MM-DD string
  -- src/lib/dayKey.js's localDayKey() builds, so an old client and a new
  -- one compare equal against c_last_trained_day. A value that IS supplied
  -- must still be well-formed: the caller's own local day is the only
  -- correct answer whenever the client can give it, and this fallback is
  -- never `now()::date` (server UTC), which would put a late-evening UK
  -- session on the wrong day for half the year.
  v_today := nullif(btrim(coalesce(_today, '')), '');
  IF v_today IS NULL THEN
    v_today := to_char(timezone('Europe/London', now()), 'YYYY-MM-DD');
  ELSIF v_today !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'hub_summary', 120, 120, interval '1 hour');

  IF v_me.gym_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'gym', v_me.gym_key, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'gym', 'key', v_me.gym_key, 'label', v_me.gym_label,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  IF v_me.area_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'area', v_me.area_key, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'area', 'key', v_me.area_key, 'label', v_me.area_label,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  FOREACH v_style IN ARRAY v_me.styles LOOP
    v_stats := public._community_cohort_stats(v_uid, 'style', v_style, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'style', 'key', v_style, 'label', public._community_style_label(v_style),
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  FOREACH v_disc IN ARRAY v_me.discipline_keys LOOP
    v_stats := public._community_cohort_stats(v_uid, 'discipline', v_disc, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'discipline', 'key', v_disc, 'label', public._community_discipline_label(v_disc),
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  IF v_me.tp_age_band IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'age_band', v_me.tp_age_band, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'age_band', 'key', v_me.tp_age_band, 'label', v_me.tp_age_band,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  -- reviewer 2026-09-10: three fixes to this block.
  --  1. member_count was `g.member_count`, the stored counter on
  --     community_groups, which counts EVERY member row - minors, suspended
  --     and restricted profiles included - while the two figures beside it
  --     exclude exactly those. A hub object could therefore report more
  --     members than the roster it samples, and a minor could be counted.
  --     It is now computed on the same predicate as its siblings, so
  --     trained_today_count <= member_count always holds and no minor is
  --     ever in a count (blueprint section 8, "minors never in cohorts,
  --     boards, groups or age bands").
  --  2. neither figure excluded blocked pairs, so a blocked person's face
  --     could appear in the caller's own Hub sample. Every other new query
  --     path in this migration calls _community_is_blocked; these now do.
  --  3. share_consistency stated outright on the trained-today tests, for
  --     the same reason as _community_cohort_stats above.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'access', g.access,
      'member_count', (
        SELECT count(*)
        FROM public.community_group_members gm1
        JOIN public.community_profiles p1 ON p1.user_id = gm1.user_id
        WHERE gm1.group_id = g.id AND gm1.state = 'member'
          AND p1.status = 'active' AND p1.is_minor = false
          AND NOT public._community_is_blocked(v_uid, p1.user_id)
      ),
      'trained_today_count', (
        SELECT count(*)
        FROM public.community_group_members gm2
        JOIN public.community_profiles p2 ON p2.user_id = gm2.user_id
        WHERE gm2.group_id = g.id AND gm2.state = 'member'
          AND p2.status = 'active' AND p2.is_minor = false
          AND NOT public._community_is_blocked(v_uid, p2.user_id)
          AND p2.share_consistency = true
          AND p2.c_last_trained_day IS NOT NULL AND p2.c_last_trained_day = v_today
          -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety
          -- backstop"); last in the AND (review L1).
          AND NOT public._community_consistency_withheld(p2.user_id)
      ),
      'sample', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'user_id', s.user_id, 'handle', s.handle,
                 'display_name', s.display_name, 'avatar_preset', s.avatar_preset
               ) ORDER BY s.trained_today DESC, s.user_id), '[]'::jsonb)
        FROM (
          SELECT p3.user_id, p3.handle, p3.display_name, p3.avatar_preset,
            (p3.share_consistency = true
             AND p3.c_last_trained_day IS NOT NULL AND p3.c_last_trained_day = v_today
             -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety
             -- backstop"); last in the AND (review L1).
             AND NOT public._community_consistency_withheld(p3.user_id)) AS trained_today
          FROM public.community_group_members gm3
          JOIN public.community_profiles p3 ON p3.user_id = gm3.user_id
          WHERE gm3.group_id = g.id AND gm3.state = 'member'
            AND p3.status = 'active' AND p3.is_minor = false
            AND NOT public._community_is_blocked(v_uid, p3.user_id)
          ORDER BY trained_today DESC, p3.user_id
          LIMIT 3
        ) s
      )
    ) ORDER BY g.name, g.id), '[]'::jsonb)
  INTO v_groups
  FROM public.community_group_members m
  JOIN public.community_groups g ON g.id = m.group_id
  WHERE m.user_id = v_uid AND m.state = 'member'
    AND g.status = 'active'; -- migrate_176: a closed group leaves the Hub

  -- migrate_191 (3a, marked addition): who the caller follows is training now;
  -- JSON null when the caller is withheld by the migrate_180 gate.
  v_training := public._community_training_now(v_uid, NULL);
  -- migrate_191 round 3R (S6): trained_today is a COUNT of followed people
  -- with a session today, from community_friends_trained_today's own
  -- predicate (migrate_180: gated people, blocked, non-sharing and minors
  -- excluded). No names. Skipped (stays JSON null) when the caller is withheld.
  IF v_training IS NOT NULL THEN
    v_training := v_training || jsonb_build_object(
      'trained_today', public.community_friends_trained_today(v_today));
  END IF;

  RETURN jsonb_build_object('cohorts', v_cohorts, 'groups', coalesce(v_groups, '[]'::jsonb),
    'training_now', v_training);
END $$;

REVOKE ALL ON FUNCTION public.community_hub_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_hub_summary(text) TO authenticated;

-- ─── Part 4 (3a): community_group_get re-issued with training_now ───────
-- migrate_180 lines 1038-1133 carried forward byte-for-byte; the marked
-- migrate_191 additions are the ONLY difference.

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
  v_member_count int; -- part A2
  v_together_sessions int; -- migrate_170 part B
  v_together_planned  int; -- migrate_170 part B
  v_sharing_members    int; -- migrate_170 part B
  v_training           jsonb; -- migrate_191 (3a)
BEGIN
  PERFORM public._community_require_profile(v_uid, false);
  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  v_role := public._community_group_role(_group_id, v_uid);
  v_out := public._community_group_card(v_g);

  -- part A2 (lead ruling 6 alignment, pulled forward from part B): the
  -- card's member_count is the stored community_groups.member_count
  -- counter, which counts every member row - minors, suspended and
  -- restricted profiles included. community_hub_summary's group block
  -- already computes member_count on active/non-minor members only (its
  -- own reviewer pass, 2026-09-10); this overrides the card's figure with
  -- the same predicate so the two RPCs never disagree about who counts.
  -- Not reduced by the caller's own blocks (see the part A2 header note
  -- above): this card is shown to every member, and to a non-member
  -- browsing an open group, not only the caller.
  SELECT count(*) INTO v_member_count
  FROM public.community_group_members gm
  JOIN public.community_profiles p ON p.user_id = gm.user_id
  WHERE gm.group_id = _group_id AND gm.state = 'member'
    AND p.status = 'active' AND p.is_minor = false;
  v_out := v_out || jsonb_build_object('member_count', v_member_count);

  -- migrate_170 part B (blueprint section 4, phase3 spec section 4):
  -- "Together this week". Unlike member_count above, this figure IS
  -- reduced by the caller's own blocks - it is the viewer's own sense of
  -- "us", not the group's stated size, and a blocked pair should not
  -- silently count towards a number the blocker reads as their own team.
  -- Lead ruling 2026-09-10 (B): MEMBERS only. A non-member browsing an
  -- OPEN group used to get all three, and with sharing_members = 1 that
  -- "aggregate" is one identifiable member's exact weekly session count.
  -- A non-member now gets null for all three (the key is always present,
  -- the same shape the profile card's consistency counters use) and the
  -- sum is never even computed for them - they still see the group's name
  -- and, for an open group, its member count.
  IF v_role IS NULL THEN
    v_together_sessions := NULL;
    v_together_planned  := NULL;
    v_sharing_members   := NULL;
  ELSE
    SELECT
      coalesce(sum(p2.c_sessions_week), 0),
      coalesce(sum(p2.c_planned_per_week) FILTER (WHERE p2.c_planned_per_week IS NOT NULL), 0),
      count(*)
    INTO v_together_sessions, v_together_planned, v_sharing_members
    FROM public.community_group_members gm2
    JOIN public.community_profiles p2 ON p2.user_id = gm2.user_id
    WHERE gm2.group_id = _group_id AND gm2.state = 'member'
      AND p2.status = 'active' AND p2.is_minor = false
      AND p2.share_consistency = true
      -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"):
      -- withhold this member's contribution to the sum while their
      -- ED-pattern flag is open, matching the client's calm/ED withhold
      -- server-side (B-02).
      AND NOT public._community_consistency_withheld(p2.user_id)
      AND NOT public._community_is_blocked(v_uid, p2.user_id);
  END IF;

  v_out := v_out || jsonb_build_object(
    'together_sessions_week', v_together_sessions,
    'together_planned_week',  v_together_planned,
    'sharing_members',        v_sharing_members);

  -- Design 60 §3: name and count visible to all for an open group, name
  -- only for an invite group, unless the caller is already a member. The
  -- three new Together figures are stripped alongside member_count/blurb -
  -- the same "count-shaped" fact an invite-only group withholds from a
  -- non-member.
  IF v_role IS NULL AND v_g.access = 'invite' THEN
    -- The three Together keys are already null for every non-member above,
    -- so this strip stays exactly what it was before part B.
    v_out := v_out - 'member_count' - 'blurb';
  END IF;
  -- migrate_191 (3a, marked addition): members only; JSON null for a
  -- non-member and for a caller the migrate_180 gate withholds.
  IF v_role IS NOT NULL THEN
    v_training := public._community_training_now(v_uid, _group_id);
  END IF;
  v_out := v_out || jsonb_build_object('training_now', v_training);
  -- migrate_191 round 3R (S1): the group's active, unexpired challenge, for
  -- members only (JSON null otherwise).
  v_out := v_out || jsonb_build_object('active_challenge',
    CASE WHEN v_role IS NOT NULL THEN public._community_active_challenge(_group_id) END);
  RETURN v_out || jsonb_build_object('my_role', v_role, 'my_state',
    (SELECT state FROM public.community_group_members WHERE group_id = _group_id AND user_id = v_uid));
END $$;

REVOKE ALL ON FUNCTION public.community_group_get(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_get(uuid) TO authenticated;

-- ─── Part 5 (3b): group chat ────────────────────────────────────────────

-- Whether _viewer may see a message by _author: the author's own message,
-- always; otherwise the author must not be suspended, blocked either way,
-- or muted by the viewer. The sender is hidden from the person who blocked
-- or muted them, on read.
CREATE OR REPLACE FUNCTION public._community_group_message_visible(_viewer uuid, _author uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _viewer = _author
    OR (
      EXISTS (SELECT 1 FROM public.community_profiles ap
              WHERE ap.user_id = _author AND ap.status <> 'suspended')
      AND NOT public._community_is_blocked(_viewer, _author)
      AND NOT EXISTS (SELECT 1 FROM public.community_mutes mu
                      WHERE mu.muter_id = _viewer AND mu.muted_id = _author)
    );
$$;

REVOKE ALL ON FUNCTION public._community_group_message_visible(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._community_group_message_json(_m public.community_group_messages, _viewer uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', _m.id, 'group_id', _m.group_id, 'body', _m.body,
    'created_at', _m.created_at, 'mine', _m.author_id = _viewer,
    'author', (
      SELECT jsonb_build_object(
        'user_id', p.user_id, 'handle', p.handle,
        'display_name', p.display_name, 'avatar_preset', p.avatar_preset)
      FROM public.community_profiles p WHERE p.user_id = _m.author_id));
$$;

REVOKE ALL ON FUNCTION public._community_group_message_json(public.community_group_messages, uuid) FROM PUBLIC, anon, authenticated;

-- Newest first, keyset paged, members only.
CREATE OR REPLACE FUNCTION public.community_group_messages(
  _group_id uuid, _cursor text DEFAULT NULL, _limit int DEFAULT 30)
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
  IF _group_id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  PERFORM public._community_require_profile(v_uid, false);
  -- round 3R (S5): _community_group_role answers only for state = 'member'
  -- (migrate_165), so an invited, requested or removed person is refused, and
  -- so is anyone once the group is closed AND they are not a current member.
  -- A current member keeps reading a closed group's chat (sending is refused
  -- elsewhere). Pinned by fixtures C8 to C10.
  IF public._community_group_role(_group_id, v_uid) IS NULL THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  WITH page AS (
    SELECT m AS rec, m.created_at AS created_at, m.id AS id
    FROM public.community_group_messages m
    WHERE m.group_id = _group_id
      AND public._community_group_message_visible(v_uid, m.author_id)
      AND (v_ts IS NULL OR (m.created_at, m.id) < (v_ts, v_id))
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(public._community_group_message_json(page.rec, v_uid)
             ORDER BY page.created_at DESC, page.id DESC), '[]'::jsonb),
    (array_agg(page.created_at ORDER BY page.created_at ASC, page.id ASC))[1],
    (array_agg(page.id         ORDER BY page.created_at ASC, page.id ASC))[1]
  INTO v_rows, v_lts, v_lid
  FROM page;

  RETURN jsonb_build_object('messages', coalesce(v_rows, '[]'::jsonb),
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;

REVOKE ALL ON FUNCTION public.community_group_messages(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_messages(uuid, text, int) TO authenticated;

-- Member only; the keyword filter and the rate rail as the DM send applies
-- them. The sender's own read clock moves to now.
CREATE OR REPLACE FUNCTION public.community_group_send_message(_group_id uuid, _body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := public._community_caller();
  v_me   public.community_profiles%ROWTYPE;
  v_g    public.community_groups%ROWTYPE;
  v_body text;
  v_msg  public.community_group_messages%ROWTYPE;
BEGIN
  IF _group_id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  v_me := public._community_require_profile(v_uid, true);
  PERFORM public._community_require_rules(v_me);

  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF public._community_group_role(_group_id, v_uid) IS NULL THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_g.status <> 'active' THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  v_body := nullif(btrim(coalesce(_body, '')), '');
  IF v_body IS NULL OR char_length(v_body) > 500 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_body := public._community_clean_text(v_body);

  PERFORM public._community_rate_check(v_uid, 'group_message', 20, 60, interval '1 hour');

  INSERT INTO public.community_group_messages (group_id, author_id, body)
  VALUES (_group_id, v_uid, v_body)
  RETURNING * INTO v_msg;

  UPDATE public.community_group_members SET last_read_at = now()
  WHERE group_id = _group_id AND user_id = v_uid;

  RETURN jsonb_build_object('message', public._community_group_message_json(v_msg, v_uid));
END $$;

REVOKE ALL ON FUNCTION public.community_group_send_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_send_message(uuid, text) TO authenticated;

-- A hard delete by the author, or by an admin of the message's group. Anyone
-- else (including a former member) gets not_found, as the DM delete does.
CREATE OR REPLACE FUNCTION public.community_group_message_delete(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_m   public.community_group_messages%ROWTYPE;
BEGIN
  IF _id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  PERFORM public._community_require_profile(v_uid, false);

  SELECT * INTO v_m FROM public.community_group_messages WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF v_m.author_id <> v_uid AND NOT public._community_group_is_admin(v_m.group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;

  DELETE FROM public.community_group_messages WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.community_group_message_delete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_message_delete(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.community_group_mark_read(_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
BEGIN
  IF _group_id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  PERFORM public._community_require_profile(v_uid, false);
  IF public._community_group_role(_group_id, v_uid) IS NULL THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;

  UPDATE public.community_group_members SET last_read_at = now()
  WHERE group_id = _group_id AND user_id = v_uid AND state = 'member';
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.community_group_mark_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_mark_read(uuid) TO authenticated;

-- Decline an invite: removes the caller's 'invited' row only. A 'member' or
-- 'requested' row, or no row at all, is not_found.
CREATE OR REPLACE FUNCTION public.community_group_decline_invite(_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_n   int;
BEGIN
  IF _group_id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  PERFORM public._community_require_profile(v_uid, false);

  DELETE FROM public.community_group_members
  WHERE group_id = _group_id AND user_id = v_uid AND state = 'invited';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  RETURN jsonb_build_object('declined', true);
END $$;

REVOKE ALL ON FUNCTION public.community_group_decline_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_decline_invite(uuid) TO authenticated;

-- SERVICE ROLE ONLY (the migrate_177 precedent for "the server tells the
-- notifier who"): the recipients of one group message, for the
-- community-notify edge function's group_message fan-out. The sender comes
-- from the message row. Current members ('member') except the sender, minus
-- anyone blocked either way with the sender, minus anyone who muted the
-- sender, minus anyone the migrate_180 gate withholds. _group_id is optional;
-- when given it must match the message's group. NULL when the message is
-- not found. No client can call it: EXECUTE is revoked from PUBLIC, anon and
-- authenticated and granted to service_role only.
CREATE OR REPLACE FUNCTION public.community_group_message_recipients(
  _message_id uuid, _group_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m    public.community_group_messages%ROWTYPE;
  v_name text;
  v_ids  jsonb;
BEGIN
  IF _message_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_m FROM public.community_group_messages WHERE id = _message_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF _group_id IS NOT NULL AND _group_id <> v_m.group_id THEN RETURN NULL; END IF;

  SELECT g.name INTO v_name FROM public.community_groups g
  WHERE g.id = v_m.group_id AND g.status = 'active';
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT coalesce(jsonb_agg(gm.user_id ORDER BY gm.user_id), '[]'::jsonb)
  INTO v_ids
  FROM public.community_group_members gm
  JOIN public.community_profiles p ON p.user_id = gm.user_id
  WHERE gm.group_id = v_m.group_id AND gm.state = 'member'
    AND gm.user_id <> v_m.author_id
    AND p.status = 'active'
    AND NOT public._community_is_blocked(gm.user_id, v_m.author_id)
    AND NOT EXISTS (SELECT 1 FROM public.community_mutes mu
                    WHERE mu.muter_id = gm.user_id AND mu.muted_id = v_m.author_id)
    AND NOT public._community_consistency_withheld(gm.user_id);

  RETURN jsonb_build_object(
    'group_id', v_m.group_id, 'group_name', v_name,
    'author_id', v_m.author_id, 'created_at', v_m.created_at,
    'recipients', v_ids);
END $$;

REVOKE ALL ON FUNCTION public.community_group_message_recipients(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_group_message_recipients(uuid, uuid) TO service_role;

-- ─── Part 6 (3b): community_group_list_mine re-issued with unread ───────
-- migrate_176 lines 250-275 carried forward byte-for-byte; the marked
-- migrate_191 addition (the 'unread' key) is the ONLY difference.

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
           'group', public._community_group_card(g), 'role', m.role, 'state', m.state,
           -- migrate_191 (3b, marked addition): unread chat messages (capped
           -- at 99) for a joined group; messages from a blocked or muted
           -- author do not count.
           'unread', CASE WHEN m.state = 'member' THEN (
             SELECT count(*) FROM (
               SELECT 1 FROM public.community_group_messages gmsg
               WHERE gmsg.group_id = g.id AND gmsg.author_id <> v_uid
                 AND gmsg.created_at > coalesce(m.last_read_at, m.joined_at)
                 AND public._community_group_message_visible(v_uid, gmsg.author_id)
               LIMIT 99) u) ELSE 0 END,
           -- migrate_191 round 3R (S1): the active, unexpired challenge of a
           -- joined group (JSON null otherwise).
           'active_challenge', CASE WHEN m.state = 'member'
             THEN public._community_active_challenge(g.id) END)
         ORDER BY m.joined_at DESC), '[]'::jsonb)
  INTO v_out
  FROM public.community_group_members m
  JOIN public.community_groups g ON g.id = m.group_id
  WHERE m.user_id = v_uid AND m.state IN ('member', 'requested', 'invited')
    AND g.status = 'active'; -- migrate_176: a closed group leaves "My groups"

  RETURN jsonb_build_object('groups', v_out);
END $$;

REVOKE ALL ON FUNCTION public.community_group_list_mine() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_list_mine() TO authenticated;

-- ─── Part 7 (3c): session-count challenges ──────────────────────────────

CREATE OR REPLACE FUNCTION public._community_challenge_json(_c public.community_group_challenges)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', _c.id, 'group_id', _c.group_id, 'name', _c.name,
    'starts_on', _c.starts_on, 'ends_on', _c.ends_on,
    'target_sessions', _c.target_sessions, 'status', _c.status,
    'created_by', _c.created_by, 'created_at', _c.created_at);
$$;

REVOKE ALL ON FUNCTION public._community_challenge_json(public.community_group_challenges) FROM PUBLIC, anon, authenticated;

-- Admin only. One active challenge per group: an earlier one whose window has
-- passed is ended here first; a still-running one refuses with not_allowed.
CREATE OR REPLACE FUNCTION public.community_challenge_create(
  _group_id uuid, _name text, _starts_on date, _ends_on date, _target int DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_g     public.community_groups%ROWTYPE;
  v_name  text;
  v_today date := (timezone('Europe/London', now()))::date;
  v_c     public.community_group_challenges%ROWTYPE;
BEGIN
  IF _group_id IS NULL OR _starts_on IS NULL OR _ends_on IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  PERFORM public._community_require_profile(v_uid, true);

  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF NOT public._community_group_is_admin(_group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_g.status <> 'active' THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;

  v_name := nullif(btrim(coalesce(_name, '')), '');
  IF v_name IS NULL OR char_length(v_name) > 40 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_name := public._community_clean_text(v_name);
  IF _ends_on <= _starts_on OR _ends_on > _starts_on + 31 OR _ends_on < v_today THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _target IS NOT NULL AND (_target < 1 OR _target > 200) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  PERFORM public._community_rate_check(v_uid, 'challenge_create', 10, 10, interval '24 hours');

  UPDATE public.community_group_challenges SET status = 'ended'
  WHERE group_id = _group_id AND status = 'active' AND ends_on < v_today;

  IF EXISTS (SELECT 1 FROM public.community_group_challenges
             WHERE group_id = _group_id AND status = 'active') THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  INSERT INTO public.community_group_challenges
    (group_id, name, starts_on, ends_on, target_sessions, created_by)
  VALUES (_group_id, v_name, _starts_on, _ends_on, _target, v_uid)
  RETURNING * INTO v_c;

  RETURN jsonb_build_object('challenge', public._community_challenge_json(v_c));
END $$;

REVOKE ALL ON FUNCTION public.community_challenge_create(uuid, text, date, date, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_challenge_create(uuid, text, date, date, int) TO authenticated;

-- Admin only; ending an already-ended challenge answers it unchanged.
CREATE OR REPLACE FUNCTION public.community_challenge_end(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_c   public.community_group_challenges%ROWTYPE;
BEGIN
  IF _id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  PERFORM public._community_require_profile(v_uid, true);

  SELECT * INTO v_c FROM public.community_group_challenges WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF NOT public._community_group_is_admin(v_c.group_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  UPDATE public.community_group_challenges SET status = 'ended'
  WHERE id = _id AND status = 'active'
  RETURNING * INTO v_c;
  IF NOT FOUND THEN
    SELECT * INTO v_c FROM public.community_group_challenges WHERE id = _id;
  END IF;

  RETURN jsonb_build_object('challenge', public._community_challenge_json(v_c));
END $$;

REVOKE ALL ON FUNCTION public.community_challenge_end(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_challenge_end(uuid) TO authenticated;

-- Member only; idempotent on (challenge, user, session_key). logged_on must
-- lie inside the challenge window and within 2 days of the UK-local today.
CREATE OR REPLACE FUNCTION public.community_challenge_log_session(
  _challenge_id uuid, _session_key text, _logged_on date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_c     public.community_group_challenges%ROWTYPE;
  v_key   text;
  v_today date := (timezone('Europe/London', now()))::date;
  v_n     int;
BEGIN
  IF _challenge_id IS NULL OR _logged_on IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_key := nullif(btrim(coalesce(_session_key, '')), '');
  IF v_key IS NULL OR char_length(v_key) > 64 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  PERFORM public._community_require_profile(v_uid, true);

  SELECT * INTO v_c FROM public.community_group_challenges WHERE id = _challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF public._community_group_role(v_c.group_id, v_uid) IS NULL THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;
  IF v_c.status <> 'active' THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;
  IF _logged_on < v_c.starts_on OR _logged_on > v_c.ends_on
     OR abs(_logged_on - v_today) > 2 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  PERFORM public._community_rate_check(v_uid, 'challenge_log', 60, 60, interval '1 hour');

  INSERT INTO public.community_challenge_entries (challenge_id, user_id, session_key, logged_on)
  VALUES (_challenge_id, v_uid, v_key, _logged_on)
  ON CONFLICT (challenge_id, user_id, session_key) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  RETURN jsonb_build_object('logged', true, 'new', v_n > 0);
END $$;

REVOKE ALL ON FUNCTION public.community_challenge_log_session(uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_challenge_log_session(uuid, text, date) TO authenticated;

-- Members only. SQL NULL (JSON null) for a caller the migrate_180 gate
-- withholds. Counts are sessions only; a member the gate withholds, a
-- blocked pair, a minor or a non-active profile is not counted or listed.
CREATE OR REPLACE FUNCTION public.community_challenge_board(_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := public._community_caller();
  v_c       public.community_group_challenges%ROWTYPE;
  v_today   date := (timezone('Europe/London', now()))::date;
  v_members jsonb;
  v_total   int;
BEGIN
  IF _challenge_id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  PERFORM public._community_require_profile(v_uid, false);

  SELECT * INTO v_c FROM public.community_group_challenges WHERE id = _challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF public._community_group_role(v_c.group_id, v_uid) IS NULL THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;

  IF public._community_consistency_withheld(v_uid) THEN
    RETURN NULL;
  END IF;

  WITH counted AS (
    SELECT p.user_id, p.handle, p.display_name, p.avatar_preset,
           (SELECT count(*) FROM public.community_challenge_entries e
            WHERE e.challenge_id = _challenge_id AND e.user_id = p.user_id)::int AS sessions
    FROM public.community_group_members gm
    JOIN public.community_profiles p ON p.user_id = gm.user_id
    WHERE gm.group_id = v_c.group_id AND gm.state = 'member'
      AND p.status = 'active' AND p.is_minor = false
      AND NOT public._community_consistency_withheld(p.user_id)
  )
  -- round 3R (S4): the group total counts every eligible member (it is a
  -- group figure and carries no identity), but the ROWS omit anyone the
  -- caller blocked, was blocked by, or muted.
  SELECT coalesce((SELECT sum(sessions) FROM counted), 0)::int,
         coalesce(jsonb_agg(jsonb_build_object(
           'user_id', user_id, 'handle', handle, 'display_name', display_name,
           'avatar_preset', avatar_preset, 'sessions', sessions,
           'me', user_id = v_uid) ORDER BY sessions DESC, user_id), '[]'::jsonb)
  INTO v_total, v_members
  FROM (SELECT * FROM counted c0
        WHERE c0.user_id = v_uid
           OR (NOT public._community_is_blocked(v_uid, c0.user_id)
               AND NOT EXISTS (SELECT 1 FROM public.community_mutes mu
                               WHERE mu.muter_id = v_uid AND mu.muted_id = c0.user_id))
        ORDER BY sessions DESC, user_id LIMIT 100) c;

  RETURN jsonb_build_object(
    'challenge', public._community_challenge_json(v_c),
    'group_total', v_total,
    'days_remaining', greatest(0, v_c.ends_on - v_today),
    'members', v_members);
END $$;

REVOKE ALL ON FUNCTION public.community_challenge_board(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_challenge_board(uuid) TO authenticated;


-- ─── Part 8 (round 3R): active challenge reads, get_me, report ─────────

-- The group's active, unexpired challenge as {id, name, starts_on, ends_on,
-- target_sessions}, or SQL NULL. Internal; callers gate on membership.
CREATE OR REPLACE FUNCTION public._community_active_challenge(_gid uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('id', c.id, 'name', c.name, 'starts_on', c.starts_on,
                            'ends_on', c.ends_on, 'target_sessions', c.target_sessions)
  FROM public.community_group_challenges c
  WHERE c.group_id = _gid AND c.status = 'active'
    AND c.ends_on >= (timezone('Europe/London', now()))::date
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._community_active_challenge(uuid) FROM PUBLIC, anon, authenticated;

-- S1: the caller's groups' active challenge ids, for the logger's finish
-- path. Members only; ids and group ids, nothing else.
CREATE OR REPLACE FUNCTION public.community_group_active_challenges()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
BEGIN
  PERFORM public._community_require_profile(v_uid, false);
  RETURN jsonb_build_object('challenges', coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', c.id, 'group_id', c.group_id,
                                        'starts_on', c.starts_on, 'ends_on', c.ends_on)
                     ORDER BY c.ends_on, c.id)
    FROM public.community_group_members m
    JOIN public.community_groups g ON g.id = m.group_id AND g.status = 'active'
    JOIN public.community_group_challenges c ON c.group_id = g.id
    WHERE m.user_id = v_uid AND m.state = 'member'
      AND c.status = 'active'
      AND c.ends_on >= (timezone('Europe/London', now()))::date), '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.community_group_active_challenges() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_active_challenges() TO authenticated;

-- S2: community_get_me re-issued. migrate_184 lines 428-511 carried forward
-- byte-for-byte; the ONE marked addition is the 'show_training_now' key.
CREATE OR REPLACE FUNCTION public.community_get_me()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_p        public.community_profiles%ROWTYPE;
  v_card     jsonb;
  v_pending  int := 0;
  v_unseen   int := 0;
  v_connects int := 0;
  v_msgs     int := 0;
BEGIN
  v_card := public._community_profile_card(v_uid, v_uid);
  SELECT * INTO v_p FROM public.community_profiles WHERE user_id = v_uid;

  IF v_card IS NOT NULL THEN
    SELECT count(*) INTO v_pending
    FROM public.community_follows
    WHERE followee_id = v_uid AND state = 'requested';

    SELECT count(*) INTO v_unseen
    FROM public.community_activity
    WHERE user_id = v_uid AND seen_at IS NULL;

    SELECT count(*) INTO v_connects
    FROM public.community_connections c
    WHERE c.state = 'requested' AND c.requester_id <> v_uid
      AND (c.user_a = v_uid OR c.user_b = v_uid);

    -- Unread MESSAGES, in open conversations only, from the other person
    -- only, newer than this person's own read marker.
    SELECT count(*) INTO v_msgs
    FROM public.community_messages m
    JOIN public.community_conversations c ON c.id = m.conversation_id
    WHERE c.closed_at IS NULL
      AND (c.user_a = v_uid OR c.user_b = v_uid)
      AND m.sender_id <> v_uid
      AND m.created_at > coalesce(
        CASE WHEN c.user_a = v_uid THEN c.a_last_read_at ELSE c.b_last_read_at END,
        '-infinity'::timestamptz)
      AND NOT public._community_is_blocked(v_uid, m.sender_id);

    -- Security review 2026-09-06 (finding 1): every hub open self-heals the
    -- stored is_minor column from a fresh derivation, so a birthday or a
    -- corrected date of birth is never more than one open away from being
    -- enforced everywhere that column is read (find_people, gym summary,
    -- the profile card).
    UPDATE public.community_profiles
       SET last_active_at = now(),
           is_minor = public._community_minor(v_uid)
     WHERE user_id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'profile',                 v_card,
    'pending_requests',        v_pending,
    'unseen_activity',         v_unseen,
    'is_moderator',            public.community_is_moderator(),
    'is_minor',                public._community_minor(v_uid),
    'rules_version',           public._community_rules_version(),
    'accepted_rules_version',  v_p.rules_version,
    'pending_connect_requests', v_connects,
    'unseen_messages',         v_msgs,
    'connect_from',            coalesce(v_p.connect_from, 'anyone'),
    'open_to_partner',         coalesce(v_p.open_to_partner, false),
    'partner_prefs',           v_p.partner_prefs,
    'show_programmes',         coalesce(v_p.show_programmes, true),
    'tp_days',                 to_jsonb(v_p.tp_days),
    'tp_time_bands',           to_jsonb(v_p.tp_time_bands),
    'tp_sessions_band',        v_p.tp_sessions_band,
    'tp_staple_lifts',         to_jsonb(v_p.tp_staple_lifts),
    'tp_experience_band',      v_p.tp_experience_band,
    'tp_programme_key',        v_p.tp_programme_key,
    'tp_age_band',             v_p.tp_age_band,
    -- migrate_184 (register D194 addendum 2): the row's own sharing
    -- setting, so the device can mirror it. NULL when the caller has no
    -- profile; the client mirrors only a boolean.
    'share_sessions',          v_p.share_sessions,
    'sessions_audience',       v_p.sessions_audience,
    -- migrate_191 round 3R (S2, marked addition): the row's own presence
    -- switch, so the device reads the server first. NULL with no profile.
    'show_training_now',       v_p.show_training_now
  );
END $$;

REVOKE ALL ON FUNCTION public.community_get_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_get_me() TO authenticated;

-- S3: community_report accepts target_kind 'group_message'. migrate_165 lines
-- 1399-1458 carried forward byte-for-byte; the marked additions are the new
-- kind, its owner lookup (the message must exist and the reporter must be a
-- current member of its group) and the widened CHECK just below.
DO $$ BEGIN
  ALTER TABLE public.community_reports
    DROP CONSTRAINT IF EXISTS community_reports_target_kind_check;
  ALTER TABLE public.community_reports
    ADD CONSTRAINT community_reports_target_kind_check
    CHECK (target_kind IN ('profile', 'post', 'comment', 'programme', 'message', 'group',
                           'group_message'));
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
  IF _target_kind NOT IN ('profile', 'post', 'comment', 'message', 'group', 'group_message') -- 191
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
  ELSIF _target_kind = 'group_message' THEN
    -- migrate_191 round 3R (S3, marked addition): the message must exist and
    -- the reporter must be a CURRENT member of its group; otherwise
    -- v_owner stays NULL and the call raises not_found below.
    SELECT gm.author_id INTO v_owner
    FROM public.community_group_messages gm
    WHERE gm.id = _target_id
      AND public._community_group_role(gm.group_id, v_uid) IS NOT NULL;
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

REVOKE ALL ON FUNCTION public.community_report(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_report(text, uuid, text, text) TO authenticated;

-- ─── Acceptance ─────────────────────────────────────────────────────────
-- (1) Executable, read-only catalogue check: raises on any miss.

DO $$
DECLARE
  v_fn text;
  v_t  text;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'public.community_set_training_now(boolean)',
    'public.community_set_show_training_now(boolean)',
    'public.community_group_messages(uuid, text, integer)',
    'public.community_group_send_message(uuid, text)',
    'public.community_group_message_delete(uuid)',
    'public.community_group_mark_read(uuid)',
    'public.community_group_decline_invite(uuid)',
    'public.community_challenge_create(uuid, text, date, date, integer)',
    'public.community_challenge_end(uuid)',
    'public.community_challenge_log_session(uuid, text, date)',
    'public.community_challenge_board(uuid)',
    'public.community_hub_summary(text)',
    'public.community_group_get(uuid)',
    'public.community_group_list_mine()',
    'public.community_group_active_challenges()',
    'public.community_get_me()',
    'public.community_report(text, uuid, text, text)'
  ] LOOP
    IF to_regprocedure(v_fn) IS NULL THEN
      RAISE EXCEPTION 'acceptance failed: % missing', v_fn;
    END IF;
    IF NOT has_function_privilege('authenticated', to_regprocedure(v_fn), 'EXECUTE')
       OR has_function_privilege('anon', to_regprocedure(v_fn), 'EXECUTE') THEN
      RAISE EXCEPTION 'acceptance failed: % privileges wrong', v_fn;
    END IF;
  END LOOP;

  IF to_regprocedure('public.community_group_message_recipients(uuid, uuid)') IS NULL
     OR has_function_privilege('authenticated', 'public.community_group_message_recipients(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_group_message_recipients(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_group_message_recipients missing or callable by a client';
  END IF;

  FOREACH v_t IN ARRAY ARRAY[
    'community_group_messages', 'community_group_challenges', 'community_challenge_entries'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = 'public' AND c.relname = v_t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'acceptance failed: RLS not enabled on %', v_t;
    END IF;
    IF has_table_privilege('authenticated', 'public.' || v_t, 'SELECT')
       OR has_table_privilege('anon', 'public.' || v_t, 'SELECT') THEN
      RAISE EXCEPTION 'acceptance failed: % is readable outside the RPCs', v_t;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
                 AND indexname = 'community_group_challenges_one_active_idx') THEN
    RAISE EXCEPTION 'acceptance failed: one-active-challenge index missing';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'community_profiles'
              AND column_name IN ('training_since', 'show_training_now'))
          OR (table_name = 'community_group_members'
              AND column_name IN ('last_read_at', 'last_push_at')))) <> 4 THEN
    RAISE EXCEPTION 'acceptance failed: a new column is missing';
  END IF;
  -- The three new tables hold exactly these columns and no figure of any kind.
  IF (SELECT string_agg(table_name || '.' || column_name, ',' ORDER BY table_name, column_name)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('community_group_messages', 'community_group_challenges',
                           'community_challenge_entries'))
     IS DISTINCT FROM 'community_challenge_entries.challenge_id,community_challenge_entries.created_at,community_challenge_entries.logged_on,community_challenge_entries.session_key,community_challenge_entries.user_id,community_group_challenges.created_at,community_group_challenges.created_by,community_group_challenges.ends_on,community_group_challenges.group_id,community_group_challenges.id,community_group_challenges.name,community_group_challenges.starts_on,community_group_challenges.status,community_group_challenges.target_sessions,community_group_messages.author_id,community_group_messages.body,community_group_messages.created_at,community_group_messages.group_id,community_group_messages.id' THEN
    RAISE EXCEPTION 'acceptance failed: a Stage 3 table has an unexpected column';
  END IF;
END $$;

-- (2) Behaviour fixtures. Run on a STAGING copy or inside a transaction that
-- is rolled back (never leave the fixture rows behind). Impersonate a user
-- with set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true).
-- Profiles: A (caller), B, C, D, M (a minor), G (A gated: calm mode on).
--
-- Presence
--   P1 follower on/off: A follows B (accepted); B calls
--      community_set_show_training_now(true) then community_set_training_now(true);
--      A: community_hub_summary()->'training_now' = {"count":1,"names":["<B name>"]}.
--      B calls community_set_show_training_now(false): A sees count 0, names [].
--   P2 minor refused: M calls community_set_show_training_now(true)
--      -> raises forbidden.
--   P3 gated caller null: with A's user_prefs '@volyume_wellbeing_mode' = 'calm'
--      (or an open ed_pattern_flags row), A's hub_summary 'training_now' is JSON null
--      and community_group_get 'training_now' is JSON null.
--   P4 stale excluded: UPDATE community_profiles SET training_since =
--      now() - interval '3 hours 1 minute' WHERE user_id = B -> A's count 0.
--      A gated FOLLOWEE (B in calm mode) is not listed either.
--   P5 group: A and B members of group X: community_group_get(X)->'training_now'
--      lists B; a non-member's call returns JSON null for the key.
-- Group chat
--   C1 member only: a non-member's community_group_messages(X) and
--      community_group_send_message(X,'hi') raise not_allowed.
--   C2 blocked pair hidden: A blocks B (or A mutes B); B sends; A's
--      community_group_messages(X) omits B's message; B still sees their own.
--   C3 keyword refused: community_group_send_message(X, '<a blocked term>')
--      raises content_not_allowed; a 501 character body raises invalid_input.
--   C4 rate rail: the 21st send inside an hour by an account under 7 days old
--      (61st for an older one) raises rate_limited.
--   C5 unread: B sends 3 messages; A's community_group_list_mine() row for X has
--      'unread' = 3; community_group_mark_read(X) then 'unread' = 0.
--   C7 recipients (service role only): for a message by A in X, community_group_
--      message_recipients(<message id>) lists members except A, omits anyone who
--      blocked or muted A, omits a gated member; calling it as authenticated is
--      permission denied.
--   C6 delete: the author or a group admin deletes (ok); another member gets
--      not_found.
--   C8 invited (not a member) cannot read the chat: not_allowed.
--   C9 a removed or left member cannot read: not_allowed.
--   C10 closed group: UPDATE community_groups SET status = 'closed'; a current
--      member still reads; an invited or former member gets not_allowed.
--   C11 group message report (S3): a member's community_report('group_message',
--      <message id>, 'harassment') returns {id}; a non-member and an unknown id
--      raise not_found; a second identical report raises already_reported.
--   P8 (S2) community_get_me()->'show_training_now' reads the caller's switch.
--   P9 (S6) hub_summary()->'training_now'->'trained_today' counts followed people
--      with a session today (a number, no names); JSON null training_now stays null.
-- Decline
--   D1 B invited to X: community_group_decline_invite(X) -> {"declined":true} and
--      the row is gone; a second call raises not_found; a 'member' row raises
--      not_found and is untouched.
-- Challenges
--   H1 one active per group: an admin creates a challenge; a second create while
--      the first is active raises not_allowed; after community_challenge_end it
--      succeeds. A non-admin create raises not_allowed.
--   H2 idempotent log: community_challenge_log_session(c,'k1',today) twice ->
--      second returns "new": false and the board shows 1 session for the caller.
--   H3 window and 2-day checks: a logged_on outside starts_on..ends_on, or more
--      than 2 days from the UK-local today, raises invalid_input.
--   H4 board withheld: A gated -> community_challenge_board(c) is JSON null; a
--      gated MEMBER is absent from every other member's board and total.
--   H6 muted/blocked off the board (S4): A mutes B; A's board rows omit B, the
--      group_total still counts B's sessions; B's own board still lists B.
--   H7 active_challenge (S1): community_group_get(X) and list_mine()'s row for X
--      carry {id,name,starts_on,ends_on,target_sessions} for a member while a
--      challenge is active and unexpired; JSON null after community_challenge_end
--      and for a non-member. community_group_active_challenges() lists the
--      caller's active challenge ids (member groups only).
--   H5 never a figure column: the acceptance DO block above proves the three new
--      tables hold exactly the listed columns, and the board payload carries
--      only counts.
