-- migrate_180_community_consistency_server_gate.sql
--
-- Purpose:           Founder order 2026-09-22, item 6 ("safety backstop"):
--                    "The calm-mode and ED withhold on consistency sharing
--                    is enforced only on the phone. Add the same check in
--                    the server function." Audit evidence: `docs/audit/
--                    community-audit-2026-09-22/B-functionality-backend-
--                    safety-engineering.md` B-02 and Question 5.
--
--                    THE GAP. The client withholds the consistency
--                    counters (`c_sessions_week`, `c_sessions_month`,
--                    `c_weeks_streak`, `c_prs_4w` and the rest of the `c_*`
--                    family, plus `share_consistency` itself) under calm
--                    mode or an open ED-pattern flag
--                    (`src/lib/community/trainingConsistency.js`
--                    `consistencyGateState`/`readEdOrCalmSuppressed`,
--                    which reuses `src/hooks/usePhotoSuppression.js`'s
--                    `readEdOrCalmSuppressed`). No equivalent existed
--                    server-side: a client bug, an old build or a direct
--                    RPC call could show a flagged person's streaks.
--
--                    FACT (a), the open-ED-flag definition, and WHO WRITES
--                    THE CLOUD ROW. The predicate: both edge functions
--                    that already gate on the flag read EXACTLY
--                    `ed_pattern_flags WHERE user_id = <id> AND cleared_at
--                    IS NULL AND deleted_at IS NULL`
--                    (`supabase/functions/partner-cheer/index.ts:155-162`,
--                    `supabase/functions/community-notify/
--                    index.ts:607-614`) -- the same predicate the table's
--                    own partial index encodes
--                    (`migrate_017_ed_pattern_and_telemetry.sql:14-27`,
--                    `idx_ed_pattern_flags_open ... WHERE cleared_at IS
--                    NULL AND deleted_at IS NULL`) and the client's own
--                    `getOpenEdPatternFlag` uses on its local mirror
--                    (`src/lib/database.js:11947-11955`). The helper
--                    below uses that predicate and no other.
--                    OBSERVED (Opus adversarial review 2026-09-23, H1;
--                    verified by the lead against the tree): NOTHING
--                    WRITES THE CLOUD TABLE TODAY. `raiseEdPatternFlag`
--                    and `clearEdPatternFlag` write the device's SQLite
--                    only (`src/lib/database.js:12000-12030`); the sync
--                    registry has `ed_pattern_flags` `direction:
--                    'pull_only'` (`src/lib/sync/registry.js:153-160`)
--                    and PUSH_HANDLERS leaves it out on purpose
--                    (`src/lib/sync/transport.js:125-128`); no migration
--                    inserts or updates it, and both edge functions only
--                    read it (repo grep, 2026-09-23). The register's
--                    D92-11 (2026-08-10) records exactly this as an OPEN
--                    FOUNDER QUESTION: the recorded design is a raise-only
--                    push, held because the row is Article 9
--                    special-category data and the ED-safety system is
--                    locked. CONSEQUENCE: for a flag the engine raises on
--                    a device, this gate answers "no open flag" and
--                    withholds nothing -- it is DORMANT until D92-11
--                    lands a cloud write, exactly as the two edge
--                    functions' existing ED gates have been since they
--                    shipped. DECIDED 2026-09-23 (founder decision B,
--                    register D196): migrate_182 adds that write path
--                    (`ed_flag_push`: raises and clears, forward-only,
--                    scoped to the caller's own row, no signals) and the
--                    client pushes on raise, clear and every sync cycle;
--                    once 182 is applied and a device on a build with the
--                    push raises a flag, this gate is live with no
--                    further change here. The prior draft's
--                    sentence that the cloud row is "at least as reliable
--                    as the client's own read" was an inference from the
--                    table module's docstring, not observed behaviour,
--                    and is withdrawn. Audit B-02 is therefore NOT closed
--                    by this migration alone: it closes with migrate_182
--                    and the client push landed beside it (decision B),
--                    this file being the second wall behind the client
--                    gate.
--                    RLS (review L2, resolved by migrate_182): the owner
--                    INSERT and UPDATE policies from `migrate_017` lines
--                    38-45 are dropped there and table writes revoked
--                    from the client roles, so the RPC is the only client
--                    write path. An owner can still CLEAR their own flag
--                    through the RPC (a clear is one of its two inputs,
--                    forward-only, never reversible); that changes only
--                    what OTHERS see of their counters, which the device
--                    gate already lets them change, and it is the same
--                    action their own engine takes. The acceptance block
--                    below reports the count of open flags in the cloud
--                    table at apply time, so the state of the ED arm is
--                    visible in the apply output, not assumed.
--
--                    FACT (b), calm mode: gated here too since founder
--                    decision B (2026-09-23, register D196), READ-SIDE
--                    ONLY. `@volyume_wellbeing_mode` (`src/lib/
--                    wellbeing.js:17`, values 'calm' | 'normal' |
--                    'unspecified') is a GUARDED synced pref: the bulk
--                    prefs push carries it to `user_prefs` (`user_id,
--                    key, value` -- `migrate_012_complete_sync.sql:
--                    287-293`) on every sync cycle with its honest local
--                    write stamp (`src/lib/sync.js` `_pushAllUserPrefs`,
--                    `_guardedPrefUpdatedAt`), a stale device's push can
--                    never walk the cloud value backwards over a newer
--                    edit (`_dropStaleGuardedPushes`), and the pull side
--                    ratchets: a pulled 'normal' never replaces a local
--                    'calm' (`filterGuardedPulledPrefs`). So the cloud
--                    value is the NEWEST edit any of the person's devices
--                    has pushed (newest-edit-wins on push; the ratchet
--                    protects the device's own copy, not the mirror),
--                    refreshed each cycle: a person who turns calm on
--                    on one device is withheld here from that device's
--                    next push, and a person who turns it off is shown
--                    again from that push. Review M4. The prior
--                    draft's ruling that this mirror was "not reliably
--                    fresh" enough to read was the lead's, made before
--                    the founder's decision; the decision supersedes it.
--                    What the arm does: `_community_calm_mode_on(uid)`
--                    answers true when the mirror says 'calm' (and on any
--                    read error), and `_community_consistency_withheld(
--                    uid)` = open ED flag OR calm mode -- the same OR the
--                    client's `isPhotoSuppressed` / `derivePhotoSuppression`
--                    apply (`src/hooks/usePhotoSuppression.js`), fail
--                    closed. Every reader below calls the withheld helper.
--                    What it deliberately does NOT do: force the STORED
--                    `share_consistency` off in Part 8. That force stays
--                    ED-flag-only, because a mirror that lags a device
--                    which just turned calm off would otherwise pin the
--                    person's stored preference to false silently (the
--                    client discards the response); withholding on read
--                    resumes by itself the moment the mirror catches up,
--                    a stored false would not. Purpose limitation: the
--                    server reads the person's own calm choice only to
--                    withhold their own counters from others, the same
--                    purpose the choice serves on the device; nothing
--                    else reads it and nothing new is stored or shared.
--                    The lead's earlier instruction "do not invent a calm
--                    signal" (item 6 build brief; not a founder
--                    quotation, review L3) meant: never derive calm from
--                    anything but the person's own pref. This arm reads
--                    exactly that pref and nothing else.
--
--                    DELIVERABLE. Part 1: `_community_ed_flag_open(uuid)`,
--                    `_community_calm_mode_on(uuid)` and
--                    `_community_consistency_withheld(uuid)` (the OR of
--                    the two), new SECURITY DEFINER helpers, each
--                    fail-closed (true) on a null input or any read
--                    error. Parts 2-7 re-issue,
--                    byte-for-byte, every server reader found by grepping
--                    every migration for `share_consistency`, `v_show_
--                    consistency`, `c_sessions`, `c_streak`, `c_prs_4w`:
--                    `_community_profile_card` (migrate_172 lines
--                    302-406), `community_board` (migrate_170 lines
--                    1268-1531), `_community_cohort_stats` (migrate_170
--                    lines 882-961), `community_hub_summary` (LEAD
--                    RULING 2026-09-23: built on migrate_176 lines
--                    88-241, not migrate_170's -- 176 is WRITTEN, NOT
--                    APPLIED, but already carries the closed-groups fix
--                    this body must keep; see Part 5 and "Depends on"
--                    below for the required apply order),
--                    `community_group_get` (migrate_170 lines 3632-3719)
--                    and `community_friends_trained_today` (migrate_171
--                    lines 63-114) -- each with the marked change
--                    `AND NOT public._community_consistency_withheld(<owner>)`
--                    inserted alongside its existing `share_consistency`
--                    test, nothing else touched. Part 8 re-issues
--                    `community_update_training_profile` (migrate_172
--                    lines 63-292): a caller with an open ED flag (the
--                    flag only, not calm mode: fact (b)) now has
--                    `share_consistency` stored false regardless of what
--                    was sent, mirroring the existing minor check
--                    immediately above it; the response is unchanged
--                    (`_community_profile_card` already nulls every
--                    counter once `share_consistency` is false), so no
--                    new key reaches a client that would not recognise
--                    it. `community_upsert_profile`/`share_sessions`/
--                    `c_planned_per_week` are a DIFFERENT toggle (ambient
--                    "what I did" sharing, not consistency sharing) and
--                    are out of scope for this order; `community_group_
--                    get`'s aggregate sum over `c_planned_per_week` is
--                    already covered because it shares `community_group_
--                    get`'s one `share_consistency`-gated WHERE clause
--                    (Part 6).
--
--                    Every re-issue is guard-proved:
--                    src/__tests__/migrate180.guard.test.js reverts the
--                    marked lines and compares with the source files.
--
-- Applied locally:   n/a (cloud-only objects; nothing in database.js)
-- Applied remotely:  NOT YET - WRITTEN 2026-09-23; waits for the
--                    founder's exact phrase "run against production"
--                    (supabase/README.md status block is the live
--                    record). Claude-run through the Supabase connector
--                    under the checksum protocol when it runs.
-- Safe to re-run:    YES - CREATE OR REPLACE FUNCTION throughout,
--                    REVOKE/GRANT idempotent by nature, acceptance block
--                    read-only; Part 0's pre-flight is read-only and
--                    passes on every re-run once 176 is live.
-- Rollback:          re-issue `_community_profile_card` and
--                    `community_update_training_profile` from migrate_172
--                    lines 302-406 and 63-292; `community_board`,
--                    `_community_cohort_stats` and `community_group_get`
--                    from migrate_170 lines 1268-1531, 882-961 and
--                    3632-3719; `community_hub_summary` from migrate_176
--                    lines 88-241 (176's own body, assuming 176 stays
--                    applied -- only fall back to migrate_170 lines
--                    1550-1702 if 176 is ALSO being rolled back in the
--                    same operation); `community_friends_trained_today`
--                    from migrate_171 lines 63-114 (the versions without
--                    the withheld test); then
--                    DROP FUNCTION public._community_consistency_withheld(uuid),
--                    DROP FUNCTION public._community_calm_mode_on(uuid) and
--                    DROP FUNCTION public._community_ed_flag_open(uuid).
--                    No table changes to reverse.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        017 (ed_pattern_flags), 160 (community_profiles,
--                    the caller/visibility helpers), 165 (the c_*
--                    counters and share_consistency), 170
--                    (_community_profile_card, _community_cohort_stats,
--                    community_board, community_group_get), 171
--                    (community_friends_trained_today), 172 (c_prs_4w,
--                    _community_profile_card and community_update_
--                    training_profile's current bodies), 176
--                    (community_hub_summary's closed-groups body).
--                    LEAD RULING 2026-09-23, REQUIRED APPLY ORDER: 176
--                    BEFORE 180. 176 is WRITTEN, NOT APPLIED; this
--                    migration's community_hub_summary is re-issued from
--                    176's body (not 170's) precisely so that fix is
--                    never lost, so 176 must land BEFORE 180 -- see
--                    Part 5 for the mechanics. ENFORCED MECHANICALLY
--                    (review H2): Part 0 below refuses to run until 176's
--                    marked change is live, and migrate_176's own Part 0
--                    refuses to (re-)run once this file's ED gate is
--                    live, so the order is a refusal, not prose.

-- ─── Part 0: pre-flight, migrate_176 must already be live (review H2) ───
-- Part 5 re-issues community_hub_summary from migrate_176's body, so 176
-- must be applied first; this block makes that a refusal rather than a
-- note. It tests community_group_list_mine, which only 176 touches
-- (community_hub_summary carries 176's marker after THIS file runs too,
-- so it could not tell the two apart on a re-run). migrate_176's own
-- Part 0 refuses to (re-)run once this file's ED gate is live, closing
-- the other direction. Read-only; passes on every re-run once 176 is live.

DO $$
DECLARE
  v_def text;
BEGIN
  IF to_regprocedure('public.community_group_list_mine()') IS NULL THEN
    RAISE EXCEPTION 'migrate_180 refused: community_group_list_mine missing; apply migrate_176 first';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public.community_group_list_mine()'));
  IF v_def IS NULL OR strpos(v_def, 'AND g.status = ''active''; -- migrate_176') = 0 THEN
    RAISE EXCEPTION 'migrate_180 refused: migrate_176 is not applied (community_group_list_mine has no status test); apply migrate_176 first';
  END IF;
END $$;

-- ─── Part 1: _community_ed_flag_open, the new helper ────────────────────
-- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"): the
-- client's calm/ED withhold on consistency sharing had no server-side
-- equivalent (audit B-02). This is the ONE place the open-ED-pattern-flag
-- test lives; every reader below calls it rather than re-writing the
-- predicate inline, so a future change to the definition cannot silently
-- drift between call sites. Exactly the predicate partner-cheer and
-- community-notify already use, and the table's own partial index
-- encodes (fact (a), file header above).

CREATE OR REPLACE FUNCTION public._community_ed_flag_open(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open boolean;
BEGIN
  -- Fail closed: a null owner id is an unexpected shape, not "no flag".
  IF _uid IS NULL THEN
    RETURN true;
  END IF;

  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM public.ed_pattern_flags
      WHERE user_id = _uid AND cleared_at IS NULL AND deleted_at IS NULL
    ) INTO v_open;
  EXCEPTION WHEN OTHERS THEN
    -- Fail closed: any unexpected error (a missing table, a type
    -- mismatch) withholds the counters rather than exposing them.
    RETURN true;
  END;

  RETURN v_open;
END $$;

REVOKE ALL ON FUNCTION public._community_ed_flag_open(uuid) FROM PUBLIC, anon, authenticated;

-- Founder decision B (2026-09-23, register D196): the calm-mode arm, read
-- from the guarded synced pref (fact (b), file header). True when the
-- mirror says 'calm'; a missing row is 'not calm' (most people never set
-- it); any read error fails closed.

CREATE OR REPLACE FUNCTION public._community_calm_mode_on(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_calm boolean;
BEGIN
  -- Fail closed: a null owner id is an unexpected shape, not "not calm".
  IF _uid IS NULL THEN
    RETURN true;
  END IF;

  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM public.user_prefs
      WHERE user_id = _uid AND key = '@volyume_wellbeing_mode' AND value = 'calm'
    ) INTO v_calm;
  EXCEPTION WHEN OTHERS THEN
    -- Fail closed: any unexpected error withholds rather than exposes.
    RETURN true;
  END;

  RETURN v_calm;
END $$;

REVOKE ALL ON FUNCTION public._community_calm_mode_on(uuid) FROM PUBLIC, anon, authenticated;

-- The one OR every reader below calls: withheld when the ED flag is open
-- OR calm mode is on, exactly the client's `isPhotoSuppressed` composition
-- (`src/hooks/usePhotoSuppression.js`). Both arms fail closed, so a null
-- id or a read error withholds.

CREATE OR REPLACE FUNCTION public._community_consistency_withheld(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public._community_ed_flag_open(_uid) OR public._community_calm_mode_on(_uid);
END $$;

REVOKE ALL ON FUNCTION public._community_consistency_withheld(uuid) FROM PUBLIC, anon, authenticated;

-- ─── Part 2: _community_profile_card re-issued ──────────────────────────
-- migrate_172 lines 302-406 carried forward byte-for-byte; the marked
-- migrate_180 change below is the ONLY difference (guard-proved).
-- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop").

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
  v_show_consistency boolean; -- migrate_170
BEGIN
  SELECT * INTO p FROM public.community_profiles WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p.status = 'suspended' AND _viewer <> _uid THEN RETURN NULL; END IF;
  v_viewable := public._community_can_view(_viewer, _uid);
  v_show_gym   := _viewer = _uid OR coalesce(p.show_gym, true);
  v_show_place := _viewer = _uid OR coalesce(p.show_place, true);

  -- migrate_170 (blueprint section 3/21-PHASE1-SPEC.md section 5): the
  -- counters travel to ANY viewer who may see the profile, but only while
  -- the OWNER keeps sharing them, is active and is not a minor. Applies
  -- uniformly, including to the owner's own view - a restricted/suspended-
  -- from-counters state hides them from their own card too, matching how
  -- community_board's own eligibility predicate already treats these same
  -- three conditions as one gate, not two.
  v_show_consistency := v_viewable AND coalesce(p.share_consistency, false)
    AND p.status = 'active' AND p.is_minor = false;
  -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"): the
  -- client's calm/ED withhold on consistency sharing had no server-side
  -- equivalent (audit B-02); this is the one place it is enforced here.
  v_show_consistency := v_show_consistency AND NOT public._community_consistency_withheld(p.user_id);

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
    -- migrate_170: same v_viewable gate styles uses, same empty-array
    -- shape when not viewable (never null, so the client never has to
    -- special-case a missing key).
    'discipline_keys',   CASE WHEN v_viewable THEN to_jsonb(p.discipline_keys) ELSE '[]'::jsonb END,
    'discipline_labels', CASE WHEN v_viewable THEN (
      SELECT coalesce(jsonb_agg(public._community_discipline_label(k)), '[]'::jsonb)
      FROM unnest(p.discipline_keys) AS k
    ) ELSE '[]'::jsonb END,
    'goal',            CASE WHEN v_viewable THEN p.goal END,
    'setting',         CASE WHEN v_viewable THEN p.setting END,
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
    -- migrate_170: the nine migrate_165 counters, gated as above. Every
    -- key is always present; the VALUE is null unless v_show_consistency.
    'c_sessions_week',        CASE WHEN v_show_consistency THEN p.c_sessions_week END,
    'c_sessions_month',       CASE WHEN v_show_consistency THEN p.c_sessions_month END,
    'c_weeks_streak',         CASE WHEN v_show_consistency THEN p.c_weeks_streak END,
    'c_planned_pct_4w',       CASE WHEN v_show_consistency THEN p.c_planned_pct_4w END,
    'c_consistent_weeks_12w', CASE WHEN v_show_consistency THEN p.c_consistent_weeks_12w END,
    'c_trained_days_week',    CASE WHEN v_show_consistency THEN to_jsonb(p.c_trained_days_week) END,
    'c_last_trained_day',     CASE WHEN v_show_consistency THEN p.c_last_trained_day END,
    'c_updated_at',           CASE WHEN v_show_consistency THEN p.c_updated_at END,
    'c_weeks_history',        CASE WHEN v_show_consistency THEN to_jsonb(p.c_weeks_history) END,
    -- migrate_172 (blueprint section 4): the PR count travels only when the
    -- owner shares consistency AND shares what they did; a count, never a
    -- lift. The key is always present, the value null otherwise.
    'c_prs_4w',               CASE WHEN v_show_consistency AND coalesce(p.share_sessions, false) THEN p.c_prs_4w END,
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

REVOKE ALL ON FUNCTION public._community_profile_card(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ─── Part 3: community_board re-issued ───────────────────────────────────
-- migrate_170 lines 1268-1531 carried forward byte-for-byte; the marked
-- migrate_180 change below is the ONLY difference (guard-proved).
-- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop").

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
  v_area_key   text; -- migrate_170
BEGIN
  -- migrate_170: four new scopes.
  IF _scope NOT IN ('gym', 'following', 'group', 'everyone', 'area', 'style', 'discipline', 'age_band') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _window NOT IN ('week', 'month', 'consistency') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _scope = 'group' AND (_scope_key IS NULL OR btrim(_scope_key) = '') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  -- migrate_170: style/discipline have no single implicit "yours" (a
  -- profile can hold up to three of either), so - like group - they
  -- require an explicit key. discipline's key is checked against the
  -- taxonomy here too, the same helper community_upsert_profile uses.
  IF _scope IN ('style', 'discipline') AND (_scope_key IS NULL OR btrim(_scope_key) = '') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _scope = 'discipline' AND _scope_key IS NOT NULL
     AND NOT public._community_discipline_key_ok(ARRAY[_scope_key]) THEN
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

  -- migrate_170: age_band is reciprocal, exactly like community_dimension's
  -- age_band kind - the caller must already share their own band, and it
  -- always means their OWN band (no scope_key). "not_allowed" mirrors the
  -- refusal the group scope above already gives a non-member.
  IF _scope = 'age_band' AND v_me.tp_age_band IS NULL THEN
    RAISE EXCEPTION USING message = 'not_allowed';
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

  -- migrate_170: area falls back to the caller's own area_key exactly like
  -- gym falls back to the caller's own gym_id above. A caller with neither
  -- an explicit key nor an own area_key simply sees an empty board
  -- (v_area_key stays NULL, so no row can ever match below) rather than an
  -- error - the same graceful-empty behaviour the gym scope already has
  -- when v_gym_id ends up NULL.
  IF _scope = 'area' THEN
    IF _scope_key IS NOT NULL AND btrim(_scope_key) <> '' THEN
      v_area_key := _scope_key;
    ELSE
      v_area_key := v_me.area_key;
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
      -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"):
      -- withhold consistency data for an owner with an open ED-pattern
      -- flag, matching the client's calm/ED withhold server-side (B-02).
      AND NOT public._community_consistency_withheld(p.user_id)
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
        -- migrate_170: the four new scopes.
        -- reviewer 2026-09-10: each new arm is ANDed with _community_can_view.
        -- A SCOPED board discloses the scope fact itself - "this handle is in
        -- your area / your discipline / your age band" - and those are exactly
        -- the three fields _community_profile_card withholds from a viewer who
        -- may not see the profile (area_label, discipline_keys, tp_age_band are
        -- all behind v_viewable). Without this the board would state what the
        -- card refuses to. community_dimension and _community_cohort_stats
        -- already require visibility = 'public' for the same reason; the
        -- helper is used here instead so a follower you accepted, and you
        -- yourself, still appear on your own cohort board. The pre-existing
        -- gym/following/group/everyone arms are untouched.
        OR (_scope = 'area' AND v_area_key IS NOT NULL AND p.area_key = v_area_key
            AND public._community_can_view(v_uid, p.user_id))
        OR (_scope = 'style' AND _scope_key = ANY (p.styles)
            AND public._community_can_view(v_uid, p.user_id))
        OR (_scope = 'discipline' AND _scope_key = ANY (p.discipline_keys)
            AND public._community_can_view(v_uid, p.user_id))
        OR (_scope = 'age_band' AND v_me.tp_age_band IS NOT NULL AND p.tp_age_band = v_me.tp_age_band
            AND public._community_can_view(v_uid, p.user_id))
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

-- ─── Part 4: _community_cohort_stats re-issued ──────────────────────────
-- migrate_170 lines 882-961 carried forward byte-for-byte; the marked
-- migrate_180 changes below (two, same shape) are the ONLY difference
-- (guard-proved). RE-ANCHORED 2026-09-22 (founder order, item 6, "safety
-- backstop").

CREATE OR REPLACE FUNCTION public._community_cohort_stats(
  _uid uuid, _kind text, _key text, _today text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member_count  int := 0;
  v_trained_count int := 0;
  v_sample        jsonb := '[]'::jsonb;
BEGIN
  -- reviewer 2026-09-10: "trained today" is consistency data, so it is only
  -- ever counted for someone actually sharing it. Correct before this line
  -- only by side effect (migrate_165 nulls every c_* column when
  -- share_consistency goes false); community_board states the predicate
  -- outright, so this states it too and a future write-path change cannot
  -- turn a silent invariant into a leak.
  SELECT count(*),
         count(*) FILTER (
           WHERE p.share_consistency = true
             AND p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today
             -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety
             -- backstop"): withhold "trained today" for an owner with an
             -- open ED-pattern flag, matching the client's calm/ED
             -- withhold server-side (B-02). Last in the AND (review L1):
             -- the cheap column tests run first, so the helper is called
             -- only for members who trained today.
             AND NOT public._community_consistency_withheld(p.user_id))
  INTO v_member_count, v_trained_count
  FROM public.community_profiles p
  WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
    AND p.user_id <> _uid
    AND NOT public._community_is_blocked(_uid, p.user_id)
    AND (
      (_kind = 'style'      AND _key = ANY (p.styles))
   OR (_kind = 'gym'        AND p.gym_key = _key)
   OR (_kind = 'area'       AND p.area_key = _key)
   OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))
   OR (_kind = 'age_band'   AND p.tp_age_band = _key)
    );

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'user_id', x.user_id, 'handle', x.handle,
           'display_name', x.display_name, 'avatar_preset', x.avatar_preset
         ) ORDER BY x.trained_today DESC, x.user_id), '[]'::jsonb)
  INTO v_sample
  FROM (
    SELECT p.user_id, p.handle, p.display_name, p.avatar_preset,
      -- reviewer 2026-09-10: same explicit share_consistency gate as the
      -- count above - the sample ORDER BY leaks "who trained today" just as
      -- surely as the count does.
      (p.share_consistency = true
       AND p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today
       -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"); last in the AND (review L1).
       AND NOT public._community_consistency_withheld(p.user_id)) AS trained_today
    FROM public.community_profiles p
    WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
      AND p.user_id <> _uid
      AND NOT public._community_is_blocked(_uid, p.user_id)
      -- reviewer 2026-09-10 (lead ruling 5): a mute means "I do not want to
      -- see this person", and a sample IS seeing them - a face on the Hub.
      -- The SAMPLE therefore takes community_find_people's rule (there is no
      -- _community_is_muted helper; this is that function's own predicate,
      -- one-directional, muter -> muted). The COUNTS above are deliberately
      -- unchanged: community_dimension's roster count is blocked-only, and a
      -- cohort size that shrank because you muted someone would be wrong.
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes mu
        WHERE mu.muter_id = _uid AND mu.muted_id = p.user_id)
      AND (
        (_kind = 'style'      AND _key = ANY (p.styles))
     OR (_kind = 'gym'        AND p.gym_key = _key)
     OR (_kind = 'area'       AND p.area_key = _key)
     OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))
     OR (_kind = 'age_band'   AND p.tp_age_band = _key)
      )
    ORDER BY trained_today DESC, p.user_id
    LIMIT 3
  ) x;

  RETURN jsonb_build_object(
    'member_count', v_member_count,
    'trained_today_count', v_trained_count,
    'sample', v_sample
  );
END $$;

REVOKE ALL ON FUNCTION public._community_cohort_stats(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- ─── Part 5: community_hub_summary re-issued ────────────────────────────
-- LEAD RULING 2026-09-23 (resolving the migrate_176/180 sequencing
-- conflict flagged in the prior draft of this migration): migrate_176
-- (WRITTEN, NOT APPLIED) already re-issues this exact function from
-- migrate_170 with its own single marked change (`AND g.status =
-- 'active'`; closed groups leave the Hub). Building from migrate_170
-- here, as the prior draft did, would silently drop that fix the moment
-- 176 applies -- CREATE OR REPLACE FUNCTION replaces the whole body, it
-- does not merge the two. So this re-issue is instead built on
-- migrate_176 lines 88-241 (which already carries the closed-groups
-- change) plus the same two marked ED-gate lines below, unchanged.
--
-- REQUIRED APPLY ORDER: 176 before 180 (file header, "Depends on"),
-- enforced by Part 0 (this file refuses to run until 176 is live) and by
-- migrate_176's own Part 0 (it refuses to re-run once this gate is live),
-- so neither direction rests on prose. What must never happen is 176
-- applying (or re-applying) AFTER 180 unmodified: its CREATE OR REPLACE
-- would restore the pre-ED-gate body (170 + closed-groups, no ED-gate),
-- silently reverting this founder order. Hence the standing rule: 176
-- lands no later than 180, and if 176 is ever touched again before it
-- applies, these two marked lines must move with it.
--
-- migrate_176 lines 88-241 carried forward byte-for-byte; the marked
-- migrate_180 changes below (two, same shape) are the ONLY difference
-- (guard-proved). RE-ANCHORED 2026-09-22 (founder order, item 6, "safety
-- backstop").

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

  RETURN jsonb_build_object('cohorts', v_cohorts, 'groups', coalesce(v_groups, '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.community_hub_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_hub_summary(text) TO authenticated;

-- ─── Part 6: community_group_get re-issued ──────────────────────────────
-- migrate_170 lines 3632-3719 carried forward byte-for-byte; the marked
-- migrate_180 change below is the ONLY difference (guard-proved).
-- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop").

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
  RETURN v_out || jsonb_build_object('my_role', v_role, 'my_state',
    (SELECT state FROM public.community_group_members WHERE group_id = _group_id AND user_id = v_uid));
END $$;

REVOKE ALL ON FUNCTION public.community_group_get(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_get(uuid) TO authenticated;

-- ─── Part 7: community_friends_trained_today re-issued ─────────────────
-- migrate_171 lines 63-114 carried forward byte-for-byte; the marked
-- migrate_180 change below is the ONLY difference (guard-proved).
-- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop").

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
    -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop").
    AND NOT public._community_consistency_withheld(p.user_id)
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

-- ─── Part 8: community_update_training_profile re-issued ────────────────
-- migrate_172 lines 63-292 carried forward byte-for-byte; the marked
-- migrate_180 change below is the ONLY difference (guard-proved).
-- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop").

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
  v_c_weeks_history     smallint[];
  -- migrate_172 (blueprint section 4, CR-05): PRs in the last four weeks,
  -- a count only, never a lift; accepted under the same gate as every
  -- counter above.
  v_c_prs_4w           smallint;
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
  -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"): the
  -- client already refuses to turn consistency sharing on while calm mode
  -- or an open ED-pattern flag is active
  -- (src/lib/community/trainingConsistency.js consistencyGateState); this
  -- makes the server agree rather than trust the client. The response is
  -- unchanged (RETURN public._community_profile_card below already nulls
  -- every counter once share_consistency is false), so no new key reaches
  -- a client that would not recognise it.
  IF v_share_consistency AND public._community_ed_flag_open(v_uid) THEN
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
    -- Design 60 section 4, D4: the 8-week history for the mini bars.
    -- Malformed input (wrong length, non-numeric elements) is dropped to
    -- null rather than refusing the whole call, the same posture every
    -- other counter here has.
    IF jsonb_typeof(_p -> 'c_weeks_history') = 'array' THEN
      BEGIN
        SELECT array_agg(greatest(0, least(x.v, 21))::smallint ORDER BY x.ord)
        INTO v_c_weeks_history
        FROM (
          SELECT (elem)::int AS v, ord
          FROM jsonb_array_elements_text(_p -> 'c_weeks_history') WITH ORDINALITY AS e(elem, ord)
        ) x;
      EXCEPTION WHEN others THEN
        v_c_weeks_history := NULL;
      END;
      IF v_c_weeks_history IS NOT NULL AND array_length(v_c_weeks_history, 1) <> 8 THEN
        v_c_weeks_history := NULL;
      END IF;
    END IF;
    -- migrate_172: the PR count, clamped like its siblings; an out-of-range
    -- or missing value is null, never a refusal.
    IF jsonb_typeof(_p -> 'c_prs_4w') = 'number' THEN
      v_c_prs_4w := greatest(0, least((_p ->> 'c_prs_4w')::int, 200))::smallint;
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
    c_weeks_history         = v_c_weeks_history,
    c_prs_4w               = v_c_prs_4w,
    c_updated_at           = CASE WHEN v_share_consistency THEN now() ELSE NULL END
  WHERE user_id = v_uid;

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

REVOKE ALL ON FUNCTION public.community_update_training_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_update_training_profile(jsonb) TO authenticated;

-- ─── Acceptance check (read-only) ────────────────────────────────────────
-- Run after the apply and read the output before declaring this migration
-- landed. Expect: the ed_pattern_flags and user_prefs tables present; the ED
-- helper present,
-- STABLE (checked, not assumed), SECURITY DEFINER, search_path pinned,
-- executable by no client role, and answering true for NULL, false for an
-- id with no row and true for an open row when one exists (review M3;
-- nothing is written); the calm and withheld helpers present and probed the
-- same way; all ten functions (the three helpers and the seven re-issues)
-- SECURITY DEFINER on the pinned search_path; the five client-callable RPCs
-- executable by authenticated and not by anon; the two internal helpers
-- executable by neither; and every reader's live body actually calling the
-- new helper (the fix is wired, not only declared); the two decision-B
-- helpers STABLE like the first, the withheld helper's live body compared
-- to its expected body exactly (not only searched for the OR), and the calm
-- arm probed against a real 'calm' pref row when one exists (review L8).
-- The NOTICE at the end prints the count of open flags in the cloud table:
-- 0 means no device on a build carrying the migrate_182 push has raised a
-- flag yet, or 182 is not applied; the ED arm is live from the first push,
-- the calm arm from apply (fact (a)).

DO $$
DECLARE
  v_def text;
  v_probe uuid;
  v_open_count bigint;
BEGIN
  IF to_regclass('public.ed_pattern_flags') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: ed_pattern_flags table missing (the helper would fail closed on every read)';
  END IF;
  IF to_regprocedure('public._community_ed_flag_open(uuid)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_ed_flag_open missing';
  END IF;
  IF (SELECT p.provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '_community_ed_flag_open') IS DISTINCT FROM 's' THEN
    RAISE EXCEPTION 'acceptance failed: _community_ed_flag_open is not STABLE';
  END IF;
  -- Behavioural probes (review M3): fail closed on NULL, false for an id
  -- with no row, true for an open row (probed only when one exists).
  IF public._community_ed_flag_open(NULL) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'acceptance failed: _community_ed_flag_open(NULL) is not true';
  END IF;
  IF public._community_ed_flag_open(gen_random_uuid()) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'acceptance failed: _community_ed_flag_open answers true for an id with no row';
  END IF;
  -- The calm arm and the OR (founder decision B): same probes, same
  -- fail-closed shape; the withheld helper must be exactly the OR of the
  -- two arms, so an edit that drops one arm fails here.
  IF to_regclass('public.user_prefs') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: user_prefs table missing (the calm arm would fail closed on every read)';
  END IF;
  IF public._community_calm_mode_on(NULL) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'acceptance failed: _community_calm_mode_on(NULL) is not true';
  END IF;
  IF public._community_calm_mode_on(gen_random_uuid()) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'acceptance failed: _community_calm_mode_on answers true for an id with no row';
  END IF;
  IF public._community_consistency_withheld(NULL) IS DISTINCT FROM true
     OR public._community_consistency_withheld(gen_random_uuid()) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'acceptance failed: _community_consistency_withheld does not compose the two arms';
  END IF;
  -- Review L8: the two decision-B helpers are STABLE like the first, and
  -- the withheld helper's LIVE body is compared to its expected body
  -- exactly (prosrc is stored verbatim), not only searched for the OR, so
  -- an extra arm, a dropped arm or a changed operator fails here.
  IF (SELECT p.provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '_community_calm_mode_on') IS DISTINCT FROM 's' THEN
    RAISE EXCEPTION 'acceptance failed: _community_calm_mode_on is not STABLE';
  END IF;
  IF (SELECT p.provolatile FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '_community_consistency_withheld') IS DISTINCT FROM 's' THEN
    RAISE EXCEPTION 'acceptance failed: _community_consistency_withheld is not STABLE';
  END IF;
  v_def := (SELECT btrim(p.prosrc, E' \n') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = '_community_consistency_withheld');
  IF v_def IS DISTINCT FROM E'BEGIN\n  RETURN public._community_ed_flag_open(_uid) OR public._community_calm_mode_on(_uid);\nEND' THEN
    RAISE EXCEPTION 'acceptance failed: _community_consistency_withheld live body is not exactly the OR of the two arms';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public._community_consistency_withheld(uuid)'));
  IF v_def IS NULL OR strpos(v_def, '_community_ed_flag_open(_uid) OR public._community_calm_mode_on(_uid)') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: _community_consistency_withheld is not the OR of the two arms';
  END IF;
  SELECT f.user_id INTO v_probe FROM public.ed_pattern_flags f
   WHERE f.cleared_at IS NULL AND f.deleted_at IS NULL LIMIT 1;
  IF v_probe IS NOT NULL AND public._community_ed_flag_open(v_probe) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'acceptance failed: _community_ed_flag_open answers false for an open flag';
  END IF;
  -- Review L8: the calm arm against REAL pref rows when any exist (nothing
  -- is written): a person whose mirror says 'calm' is withheld; a person
  -- whose mirror says anything else, with no open flag, is NOT withheld
  -- (the arm must never over-withhold either).
  v_probe := NULL;
  SELECT u.user_id INTO v_probe FROM public.user_prefs u
   WHERE u.key = '@volyume_wellbeing_mode' AND u.value = 'calm' LIMIT 1;
  IF v_probe IS NOT NULL AND (public._community_calm_mode_on(v_probe) IS DISTINCT FROM true
     OR public._community_consistency_withheld(v_probe) IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'acceptance failed: the calm arm answers false for a real calm pref row';
  END IF;
  v_probe := NULL;
  SELECT u.user_id INTO v_probe FROM public.user_prefs u
   WHERE u.key = '@volyume_wellbeing_mode' AND u.value IS DISTINCT FROM 'calm'
     AND NOT EXISTS (SELECT 1 FROM public.ed_pattern_flags f
                     WHERE f.user_id = u.user_id AND f.cleared_at IS NULL AND f.deleted_at IS NULL)
   LIMIT 1;
  IF v_probe IS NOT NULL AND (public._community_calm_mode_on(v_probe) IS DISTINCT FROM false
     OR public._community_consistency_withheld(v_probe) IS DISTINCT FROM false) THEN
    RAISE EXCEPTION 'acceptance failed: the calm arm withholds a person who is neither calm nor flagged';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        '_community_ed_flag_open', '_community_calm_mode_on',
        '_community_consistency_withheld', '_community_profile_card',
        '_community_cohort_stats', 'community_board', 'community_hub_summary',
        'community_group_get', 'community_friends_trained_today',
        'community_update_training_profile'
      )
      -- `proconfig IS NULL` named explicitly: `= ANY (NULL)` is NULL, not
      -- false, so a function with NO SET clause would slip through.
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_180 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  IF has_function_privilege('authenticated', 'public._community_ed_flag_open(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public._community_ed_flag_open(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: _community_ed_flag_open is executable by a client role';
  END IF;
  IF has_function_privilege('authenticated', 'public._community_calm_mode_on(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public._community_calm_mode_on(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._community_consistency_withheld(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public._community_consistency_withheld(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a withheld helper is executable by a client role';
  END IF;
  IF has_function_privilege('authenticated', 'public._community_profile_card(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public._community_profile_card(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: _community_profile_card is executable by a client role';
  END IF;
  IF has_function_privilege('authenticated', 'public._community_cohort_stats(uuid, text, text, text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public._community_cohort_stats(uuid, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: _community_cohort_stats is executable by a client role';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.community_board(text, text, text, text, integer, text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.community_hub_summary(text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.community_group_get(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.community_friends_trained_today(text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.community_update_training_profile(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_180 client-callable function is not executable by authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.community_board(text, text, text, text, integer, text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_hub_summary(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_group_get(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_friends_trained_today(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_update_training_profile(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_180 client-callable function is executable by anon';
  END IF;

  -- Every reader actually calls the new helper - the fix is wired, not
  -- only declared.
  v_def := pg_get_functiondef(to_regprocedure('public._community_profile_card(uuid, uuid)'));
  IF v_def IS NULL OR strpos(v_def, '_community_consistency_withheld(p.user_id)') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: _community_profile_card does not call _community_consistency_withheld';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public.community_board(text, text, text, text, integer, text)'));
  IF v_def IS NULL OR strpos(v_def, '_community_consistency_withheld(p.user_id)') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_board does not call _community_consistency_withheld';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public._community_cohort_stats(uuid, text, text, text)'));
  IF v_def IS NULL OR strpos(v_def, '_community_consistency_withheld(p.user_id)') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: _community_cohort_stats does not call _community_consistency_withheld';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public.community_hub_summary(text)'));
  IF v_def IS NULL OR strpos(v_def, '_community_consistency_withheld(p2.user_id)') = 0
     OR strpos(v_def, '_community_consistency_withheld(p3.user_id)') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_hub_summary does not call _community_consistency_withheld';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public.community_group_get(uuid)'));
  IF v_def IS NULL OR strpos(v_def, '_community_consistency_withheld(p2.user_id)') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_group_get does not call _community_consistency_withheld';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public.community_friends_trained_today(text)'));
  IF v_def IS NULL OR strpos(v_def, '_community_consistency_withheld(p.user_id)') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_friends_trained_today does not call _community_consistency_withheld';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public.community_update_training_profile(jsonb)'));
  IF v_def IS NULL OR strpos(v_def, '_community_ed_flag_open(v_uid)') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_update_training_profile does not call _community_ed_flag_open';
  END IF;

  SELECT count(*) INTO v_open_count FROM public.ed_pattern_flags f
   WHERE f.cleared_at IS NULL AND f.deleted_at IS NULL;
  RAISE NOTICE 'migrate_180: open ED-pattern flags in the cloud table: % (0 means no device on a build with the migrate_182 push has raised a flag yet, or 182 is not applied; the calm arm reads user_prefs and is live on apply; fact (a))', v_open_count;
  RAISE NOTICE 'migrate_180 acceptance: OK';
END $$;
