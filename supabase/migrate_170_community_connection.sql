-- migrate_170_community_connection.sql
--
-- Purpose:           PART A of the Community connection/consistency revamp
--                     (authority `docs/communities-revamp-2026-09-10/
--                     20-BLUEPRINT.md` sections 3, 4 (profile-strip rule
--                     only), 7 and 8; `21-PHASE1-SPEC.md` section 5 "Honest
--                     gaps carried to phase 2"). Phase 2 of the blueprint's
--                     section 11 build order: the discipline taxonomy, the
--                     discipline and age-band cohorts, the counters other
--                     people's profile cards were missing, and one summary
--                     RPC for the Hub. PART B below (added 2026-09-10,
--                     authority `docs/communities-revamp-2026-09-10/
--                     23-PHASE3-SPEC.md` sections 1-7) is ambient sharing,
--                     group audiences, Together this week, Respect
--                     everyone and the daily digest tally - it now lives
--                     IN THIS FILE, additive to Parts A and A2 above, under
--                     the same "run against production" gate.
--
--                     PART B, in brief (its own header comment at its own
--                     site in the file carries the full detail):
--                       1. `community_profiles.share_sessions`/
--                          `sessions_audience`/`c_planned_per_week`;
--                          `community_upsert_profile` DROPped and
--                          recreated (`_remove_shared` added) to accept
--                          them in `_p` on the same omit-to-keep contract
--                          `discipline_keys` already has.
--                       2. `community_posts.auto`/`client_ref`, a partial
--                          unique index, visibility widened to 'groups',
--                          new table `community_post_groups`.
--                          `community_create_post` DROPped and recreated
--                          (auto/client_ref idempotent upsert, `_group_ids`
--                          membership-checked). New `community_post_set_
--                          note`. Every reader of post visibility -
--                          `_community_can_view_post`, `community_get_
--                          post`, `community_feed`, `community_group_feed`,
--                          `community_get_profile` - re-issued with the
--                          'groups' branch. `delete_user_data` re-issued.
--                       3. `community_group_get` re-issued: `together_
--                          sessions_week`, `together_planned_week`,
--                          `sharing_members`.
--                       4. New `community_respect_all(_scope, _scope_key,
--                          _today)`: bulk Respect for a roster.
--                       5. `_community_connect_reasons_list` re-issued:
--                          `same_programme` out, `same_discipline` in.
--                       6. New table `community_notify_daily`; the
--                          `community-notify` edge function (separate
--                          file) collapses `reaction` pushes to one per
--                          recipient per UK-local day.
--
--                     1. `community_profiles.discipline_keys text[]` (up to
--                        three, from a fixed 15-value taxonomy), validated
--                        by a new IMMUTABLE helper `_community_discipline_
--                        key_ok` and labelled in British English by
--                        `_community_discipline_label`. `community_upsert_
--                        profile` re-issued to accept `discipline_keys`
--                        inside its existing `_p jsonb` payload, on the
--                        SAME "omit the key to leave it unchanged" contract
--                        every other optional field on that RPC already
--                        has (the styles array is the model: absent key =
--                        untouched, explicit array = replaces it).
--                     2. `_community_profile_card` re-issued: always
--                        returns `discipline_keys`/`discipline_labels`
--                        under the existing v_viewable gate (same gate
--                        `styles` uses), and now ALSO returns the nine
--                        `c_*` consistency counters migrate_165 added to
--                        the table, but ONLY when the OWNER's
--                        `share_consistency` is true, `status = 'active'`
--                        and `is_minor = false` - otherwise every counter
--                        key is present and null. This is the "counters on
--                        other people's profile cards" gap 21-PHASE1-
--                        SPEC.md section 5 named and explicitly deferred to
--                        this migration (lane B STOP, 2026-09-10). Nothing
--                        else about the person is added to the card.
--                     3. `community_dimension` gains two `_kind` values:
--                        `discipline` (membership = active, non-minor,
--                        public profiles whose discipline_keys contains
--                        the key) and `age_band` (reciprocal: the caller
--                        must share their own tp_age_band AND the
--                        requested key must equal it, else the function
--                        returns the same empty shape 'programme' already
--                        returns - never an error, never another band's
--                        roster). `programme` keeps returning empty.
--                     4. New internal helper `_community_cohort_stats`
--                        computes `member_count`, `trained_today_count`
--                        and a a to-three-person `sample` for a
--                        (kind, key) cohort, reusing the exact
--                        `c_last_trained_day = _today` day-level test
--                        `community_board` (migrate_165/169) already uses
--                        for "trained today". `community_dimensions_me` is
--                        DROPped and re-created taking a new `_today`
--                        parameter (the board already requires one for the
--                        same reason: "today" is the caller's LOCAL day,
--                        never the server's `now()::date`), so every row
--                        it returns - the existing style/gym/area rows
--                        (now sourced from the same helper instead of a
--                        second, separately-computed count) plus one new
--                        row per discipline key the caller holds and one
--                        new reciprocal age-band row - carries
--                        member_count/trained_today_count/sample. Minors
--                        are excluded from every count and every sample by
--                        the helper's own WHERE clause (`is_minor = false`
--                        is never conditional).
--                     5. `community_board` re-issued: adds scopes `area`,
--                        `style`, `discipline` and `age_band` to the
--                        existing `gym`/`following`/`group`/`everyone` set.
--                        `style` and `discipline` require an explicit
--                        `_scope_key` (a profile can hold up to three of
--                        either, so there is no single implicit "yours"
--                        the way there is for gym/area); `area` falls back
--                        to the caller's own `area_key` exactly like `gym`
--                        falls back to the caller's own `gym_id`;
--                        `age_band` requires the caller to already share
--                        their own tp_age_band (else `not_allowed`, the
--                        same refusal shape the `group` scope already
--                        uses when the caller is not a member) and always
--                        means the caller's own band. Body is otherwise
--                        BYTE-IDENTICAL to migrate_169's fix: same
--                        windows, same small-group threshold
--                        (`threshold_met: count >= 8`), same keyset
--                        paging, same `u.x` alias (never migrate_165's
--                        `x.*` bug), same own-row return, same rate rail.
--                     6. New `community_hub_summary(_today)`: one call
--                        returning `{cohorts: [...], groups: [...]}` for
--                        the caller's gym, area, up to three styles, up to
--                        three disciplines, age band (only while shared)
--                        and the groups they are a MEMBER of (not
--                        requested/invited) - each cohort/group carrying
--                        member_count/trained_today_count/sample, built on
--                        the same `_community_cohort_stats` helper
--                        `community_dimensions_me` now uses, so the two
--                        callers can never disagree about who counts. Rate-
--                        railed and VOLATILE (it calls
--                        `_community_rate_check`, which writes - the exact
--                        migrate_167 lesson: a function that calls it must
--                        never be STABLE/IMMUTABLE, or PostgREST forces a
--                        read-only transaction and every call fails on the
--                        rate check's own INSERT).
--                     7. `community_find_people` DROPped and re-created
--                        with a new trailing `_discipline text DEFAULT
--                        NULL` parameter: a HARD filter (narrows the
--                        candidate pool in the WHERE clause), not a scored
--                        signal, matching how `_filters`' own hard filters
--                        (days/bands/goal/age_band) already work there.
--                        `delete_user_data()` needs no change: no new
--                        table, and `community_profiles` is already
--                        deleted whole-row, taking `discipline_keys` with
--                        it.
--
--                     REVIEWER PASS 2026-09-10 (hostile security and
--                     correctness review of this file, before any
--                     application). Nine changes, every one a tightening or
--                     a truth correction, each marked `-- reviewer
--                     2026-09-10:` at its site:
--                       1. `_community_cohort_stats` states
--                          `share_consistency = true` on the trained-today
--                          count AND on the sample's trained_today flag
--                          (was correct only by side effect of migrate_165
--                          nulling the c_* columns).
--                       2. `community_hub_summary`'s group rows: the same
--                          share_consistency statement, blocked pairs
--                          excluded from the figure AND the sample, and
--                          `member_count` computed on the same predicate
--                          instead of `community_groups.member_count`,
--                          which counts minors, suspended and restricted
--                          members.
--                       3. The four new `community_board` scopes are ANDed
--                          with `_community_can_view`: a scoped board
--                          otherwise discloses the caller's area /
--                          discipline / age band membership for a profile
--                          whose card withholds exactly those fields.
--                       4. `community_upsert_profile` refuses a
--                          `discipline_keys` value that is present but not
--                          an array, instead of silently erasing the
--                          stored keys.
--                       5. `community_dimensions_me` gets the house
--                          120/hour rail (it now runs the cohort helper up
--                          to eight times per call and had none).
--                       6. New `community_profiles_tp_age_band_idx`: the
--                          only new cohort predicate with no index.
--                       7. The GIN index comment now states honestly that
--                          no predicate in this file is in a GIN-usable
--                          form. Lead ruling 4, 2026-09-10: discipline
--                          predicates use `= ANY` inside an OR chain, so
--                          the GIN index is not used today; accepted at
--                          current profile counts; review trigger: profile
--                          count above 50,000, then move the discipline
--                          arms to `@>` outside the OR. No refactor now.
--                       8. Stable group ordering (`g.name, g.id`).
--                       9. Two rationale comments restored to
--                          `community_board`, so "byte-identical to
--                          migrate_169" is true again.
--                     Lead rulings applied 2026-09-10, same pass:
--                      1. BACKWARDS COMPATIBILITY IS MANDATORY. The review
--                         found that `community_dimensions_me`'s signature
--                         change broke every already-installed build
--                         (`src/lib/community/feed.js:168` calls it with
--                         `{}`; the Hub's Discover section silently emptied,
--                         feed.js:117-126 swallowing the rejection). Both
--                         `community_dimensions_me` and
--                         `community_hub_summary` now ACCEPT a NULL or
--                         absent `_today` and fall back to the UK-local day
--                         key, `to_char(timezone('Europe/London', now()),
--                         'YYYY-MM-DD')` - the exact zero-padded format
--                         src/lib/dayKey.js's localDayKey() produces, so
--                         old and new clients compare equal against
--                         c_last_trained_day. A SUPPLIED `_today` is still
--                         validated and still refused when malformed, and
--                         the fallback is never `now()::date`. Old clients
--                         get the enriched shape; a superset is harmless to
--                         them. `community_board` is untouched: it has
--                         required `_today` since migrate_165 and every
--                         shipped caller already passes one.
--                      5. `_community_cohort_stats`' SAMPLE excludes muted
--                         people (community_find_people's rule); the counts
--                         stay blocked-only, as community_dimension's do.
--
--                     Every re-issued or new function keeps the standing
--                     shape: SECURITY DEFINER, `SET search_path = public,
--                     pg_temp`, no STABLE/IMMUTABLE on anything that calls
--                     `_community_rate_check` (migrate_167's lesson),
--                     revoked from PUBLIC and anon (helpers ALSO revoked
--                     from authenticated, never granted), granted to
--                     authenticated only for the public RPCs.
--
-- Applied locally:   N/A. Community has no local SQLite table (SD-13,
--                     online-first); nothing in src/lib/database.js or
--                     PRAGMA user_version changes.
--
-- Applied remotely:  NO - WRITTEN, NOT APPLIED. This file waits for the
--                     founder's exact phrase "run against production" for
--                     the batch that carries it (CLAUDE.md section 2
--                     "Database schema"; supabase/README.md status block).
--                     Nothing here has reached EU-Dublin. DEPENDS ON 160,
--                     161, 162, 163, 164, 165, 167 and 169; must never run
--                     before any of them (it re-issues functions each of
--                     those last touched).
--
-- Safe to re-run:    YES. `ADD COLUMN IF NOT EXISTS`; the discipline_keys
--                     CHECK is added inside a `DO $$ ... EXCEPTION WHEN
--                     duplicate_object THEN NULL; END $$;` block; both new
--                     indexes are `CREATE INDEX IF NOT EXISTS`; every
--                     function is `CREATE OR REPLACE FUNCTION`; the two
--                     functions whose PARAMETER LIST changes
--                     (`community_dimensions_me`, `community_find_people`)
--                     are preceded by a `DO $$ ... DROP FUNCTION IF EXISTS
--                     %I.%I(%s) CASCADE ... END $$;` block that
--                     introspects `pg_proc`/`pg_get_function_identity_
--                     arguments` for whatever signature is CURRENTLY
--                     installed and drops exactly that - the same pattern
--                     migrate_163 and migrate_164 already use for this
--                     exact reason, so a second run finds the new
--                     signature already installed, drops it, and recreates
--                     the identical thing. Re-running changes nothing.
--
--                     PART B, same guarantee: `ADD COLUMN IF NOT EXISTS`
--                     throughout; `CREATE TABLE IF NOT EXISTS` for
--                     `community_post_groups`/`community_notify_daily`;
--                     `CREATE UNIQUE INDEX IF NOT EXISTS` for the client_ref
--                     index; the two widened CHECKs
--                     (`community_posts_visibility_check` and the new
--                     `community_profiles_sessions_audience_check`) use the
--                     same duplicate_object-tolerant or drop-and-re-add
--                     pattern named at their own site; `community_upsert_
--                     profile` and `community_create_post` (both gain a
--                     genuinely new parameter) get the identical DROP-
--                     first dynamic block the two Part A signature changes
--                     use, for the identical reason; every other Part B
--                     function is a plain `CREATE OR REPLACE FUNCTION` on
--                     an unchanged signature. Re-running Part B changes
--                     nothing.
--
-- Rollback:          ALTER TABLE public.community_profiles DROP COLUMN IF
--                       EXISTS discipline_keys; (also drops its CHECK and
--                       the GIN index)
--                     DROP INDEX IF EXISTS public.community_profiles_tp_age_band_idx;
--                     DROP FUNCTION IF EXISTS public._community_discipline_key_ok(text[]);
--                     DROP FUNCTION IF EXISTS public._community_discipline_label(text);
--                     DROP FUNCTION IF EXISTS public._community_cohort_stats(uuid, text, text, text);
--                     DROP FUNCTION IF EXISTS public.community_hub_summary(text);
--                     DROP FUNCTION IF EXISTS public.community_dimensions_me(text);
--                     DROP FUNCTION IF EXISTS public.community_find_people(text, text, integer, jsonb, text);
--                     then re-apply migrate_164's `_community_profile_card`
--                     and `community_dimension`, migrate_163's
--                     `community_upsert_profile`, migrate_160's
--                     `community_dimensions_me()` (no-arg), migrate_169's
--                     `community_board` and migrate_164's
--                     `community_find_people` (4-arg) to restore their
--                     pre-170 bodies (CREATE OR REPLACE means the LATEST
--                     definition wins until a later file replaces it again
--                     - there is no automatic revert).
--
--                     PART B rollback (additive on top of the above):
--                     DROP FUNCTION IF EXISTS public.community_respect_all(text, text, text);
--                     DROP FUNCTION IF EXISTS public.community_post_set_note(uuid, text);
--                     DROP TABLE IF EXISTS public.community_post_groups;
--                     DROP TABLE IF EXISTS public.community_notify_daily;
--                     ALTER TABLE public.community_posts DROP COLUMN IF
--                       EXISTS auto; DROP COLUMN IF EXISTS client_ref;
--                       (also drops the author_id/client_ref unique index
--                       and, with it, community_create_post's conflict
--                       target - the function itself must be rolled back
--                       first, below, or it would fail on its next call)
--                     ALTER TABLE public.community_posts DROP CONSTRAINT IF
--                       EXISTS community_posts_visibility_check; then
--                       re-add CHECK (visibility IN ('public', 'followers'))
--                       to drop 'groups'.
--                     ALTER TABLE public.community_profiles DROP CONSTRAINT
--                       IF EXISTS community_profiles_sessions_audience_check;
--                       DROP COLUMN IF EXISTS share_sessions; DROP COLUMN IF
--                       EXISTS sessions_audience; DROP COLUMN IF EXISTS
--                       c_planned_per_week;
--                     DROP FUNCTION IF EXISTS public.community_upsert_profile(jsonb, boolean);
--                     DROP FUNCTION IF EXISTS public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[]);
--                     DROP FUNCTION IF EXISTS public._community_connect_reasons_list();
--                     then re-apply migrate_163's `community_upsert_profile`
--                     (1-arg) and migrate_160's `community_create_post`
--                     (5-arg) to restore their pre-part-B bodies; migrate_
--                     161's `_community_connect_reasons_list` to restore
--                     `same_programme`; and this file's OWN Part A/A2/
--                     migrate_165 bodies for `_community_can_view_post`,
--                     `community_get_post`, `community_feed`,
--                     `community_group_feed`, `community_get_profile` and
--                     `community_group_get` to drop their 'groups'
--                     branches and Together fields (CREATE OR REPLACE means
--                     the latest definition wins until a later file
--                     replaces it again - there is no automatic revert,
--                     exactly as above). delete_user_data needs no
--                     rollback of its own once the two tables it names are
--                     dropped: its DELETE/undefined_table guard already
--                     tolerates a table that no longer exists.
--
-- GDPR note:         `discipline_keys` is a new voluntary, self-declared
--                     identity fact on the SAME consent rail every other
--                     Community profile field already rides
--                     (`community_visibility`, Article 6(1)(a), recorded
--                     at `community_upsert_profile` time) - it is not a
--                     new consent TYPE, and it is never inferred, only
--                     chosen. It carries no Article 9 health data: the
--                     taxonomy is fifteen closed identity labels, never a
--                     free-text field, and the seven physique-adjacent
--                     values (bodybuilding, mens_physique, classic_
--                     physique, womens_physique, figure, bikini, wellness -
--                     lead ruling 3, 2026-09-10: Q1 added Women's physique
--                     to the list without removing Wellness, so the set
--                     20-BLUEPRINT.md section 8 calls "the six" is seven,
--                     and the contract doc names all seven for the client
--                     lane that implements the Q1b withhold) are body-
--                     adjacent but not body DATA - no measurement, weight
--                     or size ever accompanies them here or anywhere in
--                     Community. This migration does not implement the
--                     blueprint's calm-mode/open-ED-flag withholding of a
--                     person's OWN physique-division cohort pages
--                     (section 8, Q1b): that is the viewer's own client
--                     choosing not to open/render that page for
--                     themselves, which needs no server support - the
--                     server has no reason to know a viewer's calm-mode
--                     state to serve a `discipline` cohort to everyone
--                     ELSE. The consistency counters this migration
--                     exposes on OTHER people's profile cards are gated
--                     by the SAME `share_consistency` toggle and consent
--                     migrate_165 already captured; this file enforces
--                     that existing choice on a surface (someone else's
--                     card) that previously never read it, and adds no
--                     new toggle. Minors are excluded from every count,
--                     sample and board row this migration touches by the
--                     same `is_minor = false` predicate already used
--                     everywhere else in Community, unconditionally.
--
--                     PART B: `share_sessions`/`sessions_audience` are two
--                     more voluntary, self-declared choices riding the
--                     SAME `community_visibility` consent record every
--                     other Community field already uses (still not a new
--                     consent TYPE); the ambient item it produces carries
--                     only the existing session/PR payload allow-list
--                     (`_community_payload_keys`, unchanged by this part) -
--                     no new field, no body or nutrition data, ever.
--                     `c_planned_per_week` is a plan count, not a health
--                     figure. Unlike Part A, Part B DOES add two new
--                     tables: `community_post_groups` (post id, group id -
--                     no new personal fact beyond "this post's audience
--                     includes this group", which the poster already
--                     chose) and `community_notify_daily` (a per-recipient
--                     per-day push counter, holding nothing about WHO gave
--                     the Respect being counted - deleted with the
--                     recipient in delete_user_data, which now also names
--                     `community_post_groups`). A minor's `sessions_
--                     audience` is forced to `followers` and `everyone` is
--                     refused, mirroring the existing minor-safety posture
--                     this file already applies to `visibility`.
--
--                     PART B, stated plainly (reviewer 2026-09-10 (B)): an
--                     auto item IS Article 9 health data on this repo's own
--                     reading (training data), published automatically
--                     without a compose step. Its lawful basis is the
--                     express, informed act of turning `share_sessions` on
--                     (20-BLUEPRINT.md section 8, tightening R3), so
--                     `community_create_post` re-reads that toggle and the
--                     chosen `sessions_audience` from the profile on EVERY
--                     `_auto` write rather than trusting the client that
--                     set the flag, and refuses when consent is off or the
--                     requested audience is wider than the one chosen.
--                     Withdrawal is real and is the same act: turning the
--                     toggle off with `_remove_shared` deletes every auto
--                     item the account has posted, with its comments and
--                     activity rows. `community_notify_daily` carries a
--                     stated retention rule (7 days, pruned per recipient
--                     by the edge function as it claims each day) rather
--                     than growing for the life of the account.
--
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.

-- ─── Part 1: community_profiles.discipline_keys ──────────────────────────

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS discipline_keys text[] NOT NULL DEFAULT '{}';

-- ─── Part 2: discipline taxonomy helpers ─────────────────────────────────
--
-- Q1/Q1b (20-BLUEPRINT.md section 12): the fifteen founder-ruled keys,
-- fixed snake_case, British English labels. No adaptive/para tag on
-- purpose (self-declaring it would disclose disability, special-category
-- data, in a social profile).

-- Returns true iff `_keys` has at most three elements and every element is
-- one of the fifteen taxonomy keys. Used both as the column CHECK below and
-- inside community_upsert_profile/community_find_people/community_board,
-- so the taxonomy list itself exists exactly once in this file.
CREATE OR REPLACE FUNCTION public._community_discipline_key_ok(_keys text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _keys IS NOT NULL
    AND coalesce(array_length(_keys, 1), 0) <= 3
    AND NOT EXISTS (
      SELECT 1 FROM unnest(_keys) AS k
      WHERE k <> ALL (ARRAY[
        'bodybuilding', 'mens_physique', 'classic_physique', 'womens_physique',
        'figure', 'bikini', 'wellness', 'powerlifting', 'olympic_weightlifting',
        'strongman', 'crossfit_functional', 'calisthenics', 'hybrid',
        'sport_sc', 'general_strength'
      ]::text[])
    );
$$;

REVOKE ALL ON FUNCTION public._community_discipline_key_ok(text[]) FROM PUBLIC, anon, authenticated;

-- British English label for one discipline key. NULL for anything outside
-- the taxonomy (the caller already refused that at save time via the
-- helper above; this never has to raise).
CREATE OR REPLACE FUNCTION public._community_discipline_label(_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE _key
    WHEN 'bodybuilding'          THEN 'Bodybuilding'
    WHEN 'mens_physique'         THEN 'Men''s physique'
    WHEN 'classic_physique'      THEN 'Classic physique'
    WHEN 'womens_physique'       THEN 'Women''s physique'
    WHEN 'figure'                THEN 'Figure'
    WHEN 'bikini'                THEN 'Bikini'
    WHEN 'wellness'              THEN 'Wellness'
    WHEN 'powerlifting'          THEN 'Powerlifting'
    WHEN 'olympic_weightlifting' THEN 'Olympic weightlifting'
    WHEN 'strongman'             THEN 'Strongman and strongwoman'
    WHEN 'crossfit_functional'   THEN 'CrossFit and functional fitness'
    WHEN 'calisthenics'          THEN 'Calisthenics'
    WHEN 'hybrid'                THEN 'Hybrid (lifting and endurance)'
    WHEN 'sport_sc'              THEN 'Sport strength and conditioning'
    WHEN 'general_strength'      THEN 'General strength and fitness'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public._community_discipline_label(text) FROM PUBLIC, anon, authenticated;

-- The CHECK itself. Added here, AFTER the helper it calls exists, inside
-- the standard duplicate_object-tolerant block every other named CHECK in
-- this migration family uses.
DO $$ BEGIN
  ALTER TABLE public.community_profiles
    ADD CONSTRAINT community_profiles_discipline_keys_check
    CHECK (public._community_discipline_key_ok(discipline_keys));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Same treatment styles already gets (migrate_160 line 165): a GIN index on
-- the array column.
-- reviewer 2026-09-10, honest scope: every discipline predicate in this file
-- is written `_key = ANY (p.discipline_keys)` and sits inside an OR chain on
-- a runtime parameter (`_kind`/`_scope`/`v_discipline IS NULL OR ...`).
-- Neither form is GIN-usable - the planner needs a containment operator
-- (`p.discipline_keys @> ARRAY[_key]`) and a predicate it can push down - so
-- this index is not what makes those scans fast today; it is here for the
-- containment queries part B and the client add, and because dropping it
-- later is far cheaper than adding it to a live table. See the open question
-- in the review report.
CREATE INDEX IF NOT EXISTS community_profiles_discipline_keys_idx
  ON public.community_profiles USING gin (discipline_keys);

-- reviewer 2026-09-10: tp_age_band becomes a cohort key in this migration
-- (community_dimension's age_band kind, community_board's age_band scope and
-- _community_cohort_stats), and it was the only new cohort predicate with no
-- supporting index - gym_key, area_key, place_key and styles all have one
-- (migrate_160:161-166, migrate_163:311). Same additive, re-runnable form.
CREATE INDEX IF NOT EXISTS community_profiles_tp_age_band_idx
  ON public.community_profiles (tp_age_band)
  WHERE tp_age_band IS NOT NULL;

-- ─── Part 3: community_upsert_profile re-issued (discipline_keys) ───────
--
-- Body identical to migrate_163's version except for the additions marked
-- migrate_170 below. Same signature (_p jsonb): discipline_keys travels as
-- a key inside the payload, on the exact "omit to leave unchanged" contract
-- `styles` already has via the existing-row defaults-merge a few lines in.

CREATE OR REPLACE FUNCTION public.community_upsert_profile(_p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid        uuid := public._community_caller();
  v_existing   public.community_profiles%ROWTYPE;
  v_is_new     boolean;
  v_handle     text;
  v_display    text;
  v_bio        text;
  v_avatar     text;
  v_styles     text[];
  v_goal       text;
  v_setting    text;
  v_area_label text;
  v_area_key   text;
  v_gym_label  text;
  v_gym_key    text;
  v_visibility text;
  v_minor      boolean;
  v_accept     int;
  v_style      text;
  v_discipline_keys text[]; -- migrate_170
  v_dk         text;        -- migrate_170
BEGIN
  IF _p IS NULL OR jsonb_typeof(_p) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  SELECT * INTO v_existing FROM public.community_profiles WHERE user_id = v_uid;
  v_is_new := NOT FOUND;
  IF NOT v_is_new THEN
    _p := jsonb_build_object(
      'handle',        v_existing.handle,
      'display_name',  v_existing.display_name,
      'avatar_preset', v_existing.avatar_preset,
      'bio',           v_existing.bio,
      'styles',        to_jsonb(v_existing.styles),
      'goal',          v_existing.goal,
      'setting',       v_existing.setting,
      'area_label',    v_existing.area_label,
      'gym_label',     v_existing.gym_label,
      'visibility',    v_existing.visibility,
      -- migrate_170: same "existing value survives an omitted key" rule.
      'discipline_keys', to_jsonb(coalesce(v_existing.discipline_keys, ARRAY[]::text[]))
    ) || coalesce(_p, '{}'::jsonb);
  END IF;

  IF NOT v_is_new AND v_existing.status = 'suspended' THEN
    RAISE EXCEPTION USING message = 'profile_suspended';
  END IF;

  v_handle := lower(btrim(coalesce(_p ->> 'handle', '')));
  IF NOT public._community_handle_valid(v_handle) THEN
    RAISE EXCEPTION USING message = 'handle_invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.community_profiles
    WHERE handle = v_handle AND user_id <> v_uid
  ) THEN
    RAISE EXCEPTION USING message = 'handle_taken';
  END IF;
  IF NOT v_is_new AND v_handle <> v_existing.handle THEN
    IF v_existing.handle_changed_at IS NOT NULL
       AND v_existing.handle_changed_at > now() - interval '30 days' THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
  END IF;

  v_display := public._community_clean_text(btrim(coalesce(_p ->> 'display_name', '')));
  IF v_display IS NULL OR length(v_display) < 1 OR length(v_display) > 40 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_bio := nullif(btrim(coalesce(_p ->> 'bio', '')), '');
  IF v_bio IS NOT NULL THEN
    v_bio := public._community_clean_text(v_bio);
    IF length(v_bio) > 160 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  END IF;

  v_avatar := nullif(btrim(coalesce(_p ->> 'avatar_preset', '')), '');
  IF v_avatar IS NOT NULL AND v_avatar !~ '^[a-z0-9_]{1,32}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_styles := ARRAY[]::text[];
  IF _p ? 'styles' AND jsonb_typeof(_p -> 'styles') = 'array' THEN
    FOR v_style IN SELECT jsonb_array_elements_text(_p -> 'styles') LOOP
      v_style := lower(btrim(coalesce(v_style, '')));
      IF v_style = '' THEN CONTINUE; END IF;
      IF v_style !~ '^[a-z0-9_]{2,32}$' THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      IF NOT (v_style = ANY (v_styles)) THEN v_styles := v_styles || v_style; END IF;
    END LOOP;
  END IF;
  IF array_length(v_styles, 1) > 3 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;

  -- migrate_170: discipline_keys, same shape of parsing as styles above,
  -- validated against the taxonomy (and the <= 3 cap) by the one helper.
  v_discipline_keys := ARRAY[]::text[];
  -- reviewer 2026-09-10: a `discipline_keys` key that is present but is not
  -- an array used to fall straight through to the empty array, i.e. it
  -- silently ERASED the stored keys instead of refusing. Refuse instead;
  -- losing a person's saved choices to a malformed payload is worse than an
  -- error. (`styles` a few lines above has the same shape, pre-existing and
  -- deliberately left alone here.)
  IF _p ? 'discipline_keys' AND jsonb_typeof(_p -> 'discipline_keys') <> 'array' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _p ? 'discipline_keys' AND jsonb_typeof(_p -> 'discipline_keys') = 'array' THEN
    FOR v_dk IN SELECT jsonb_array_elements_text(_p -> 'discipline_keys') LOOP
      v_dk := lower(btrim(coalesce(v_dk, '')));
      IF v_dk = '' THEN CONTINUE; END IF;
      IF NOT (v_dk = ANY (v_discipline_keys)) THEN v_discipline_keys := v_discipline_keys || v_dk; END IF;
    END LOOP;
  END IF;
  IF NOT public._community_discipline_key_ok(v_discipline_keys) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_goal := nullif(btrim(coalesce(_p ->> 'goal', '')), '');
  IF v_goal IS NOT NULL
     AND v_goal NOT IN ('build_muscle', 'get_stronger', 'general_fitness', 'returning') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_setting := nullif(btrim(coalesce(_p ->> 'setting', '')), '');
  IF v_setting IS NOT NULL
     AND v_setting NOT IN ('commercial_gym', 'home_gym', 'minimal_kit') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_area_label := nullif(btrim(coalesce(_p ->> 'area_label', '')), '');
  IF v_area_label IS NOT NULL THEN
    v_area_label := public._community_clean_text(v_area_label);
    IF length(v_area_label) > 40 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
    v_area_key := nullif(public._community_fold(v_area_label), '');
  END IF;

  IF v_existing.gym_id IS NOT NULL THEN
    v_gym_label := v_existing.gym_label;
    v_gym_key   := v_existing.gym_key;
  ELSE
    v_gym_label := nullif(btrim(coalesce(_p ->> 'gym_label', '')), '');
    IF v_gym_label IS NOT NULL THEN
      v_gym_label := public._community_clean_text(v_gym_label);
      IF length(v_gym_label) > 60 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      v_gym_key := nullif(coalesce(v_area_key, '') || ':' || public._community_fold(v_gym_label), ':');
    END IF;
  END IF;

  v_visibility := coalesce(nullif(btrim(coalesce(_p ->> 'visibility', '')), ''), 'public');
  IF v_visibility NOT IN ('public', 'followers') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_minor := public._community_minor(v_uid);
  IF v_minor THEN v_visibility := 'followers'; END IF;

  PERFORM public._community_rate_check(v_uid, 'profile_upsert', 5, 5);

  IF v_is_new THEN
    IF coalesce(_p ->> 'accept_rules_version', '') !~ '^[0-9]{1,6}$' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    v_accept := (_p ->> 'accept_rules_version')::int;
    IF v_accept IS DISTINCT FROM public._community_rules_version() THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;

    INSERT INTO public.community_profiles (
      user_id, handle, display_name, avatar_preset, bio, styles, discipline_keys,
      goal, setting, area_label, area_key, gym_label, gym_key, visibility, is_minor,
      status, rules_version, last_active_at)
    VALUES (
      v_uid, v_handle, v_display, v_avatar, v_bio, v_styles, v_discipline_keys,
      v_goal, v_setting, v_area_label, v_area_key, v_gym_label, v_gym_key,
      v_visibility, v_minor, 'active', public._community_rules_version(), now());

    INSERT INTO public.consent_log
      (user_id, consent_type, granted, granted_at, notice_version)
    VALUES (v_uid, 'community_visibility', true, now(),
            public._community_rules_version()::text);

    PERFORM public._community_convert_partnerships(v_uid);
  ELSE
    UPDATE public.community_profiles SET
      handle            = v_handle,
      handle_changed_at = CASE WHEN v_handle <> v_existing.handle THEN now()
                               ELSE v_existing.handle_changed_at END,
      display_name      = v_display,
      avatar_preset     = v_avatar,
      bio               = v_bio,
      styles            = v_styles,
      discipline_keys   = v_discipline_keys,
      goal              = v_goal,
      setting           = v_setting,
      area_label        = v_area_label,
      area_key          = v_area_key,
      gym_label         = v_gym_label,
      gym_key           = v_gym_key,
      visibility        = v_visibility,
      is_minor          = v_minor,
      last_active_at    = now()
    WHERE user_id = v_uid;

    IF _p ? 'accept_rules_version' THEN
      IF coalesce(_p ->> 'accept_rules_version', '') !~ '^[0-9]{1,6}$' THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      v_accept := (_p ->> 'accept_rules_version')::int;
      IF v_accept IS DISTINCT FROM public._community_rules_version() THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      IF coalesce(v_existing.rules_version, 0) < v_accept THEN
        UPDATE public.community_profiles SET rules_version = v_accept WHERE user_id = v_uid;
        INSERT INTO public.consent_log
          (user_id, consent_type, granted, granted_at, notice_version)
        VALUES (v_uid, 'community_visibility', true, now(), v_accept::text);
      END IF;
    END IF;

    PERFORM public._community_convert_partnerships(v_uid);
  END IF;

  PERFORM public._community_populate_place_from_gym(v_uid);

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

REVOKE ALL ON FUNCTION public.community_upsert_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_upsert_profile(jsonb) TO authenticated;

-- ─── Part 4: _community_profile_card re-issued (discipline + counters) ──
--
-- Body identical to migrate_164's version except for the additions marked
-- migrate_170 below. Still STABLE: every addition here is a read of the
-- same row already loaded, never a write and never a call to
-- _community_rate_check.

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

-- ─── Part 5: _community_cohort_stats (new internal helper) ──────────────
--
-- member_count / trained_today_count / a to-three "who trained today, else
-- who's a member" sample for one (kind, key) cohort, from the caller's own
-- viewpoint (blocked pairs excluded, never a minor, never the caller
-- themselves in their own sample). Shared by community_dimensions_me
-- (every row) and community_hub_summary (every cohort), so the counting
-- and sampling rule lives once. Handles style/gym/area/discipline/age_band;
-- 'programme' is deliberately NOT one of the kinds here - that layer is
-- retired (migrate_164) and community_programmes holds no rows, so
-- community_dimensions_me's own programme loop (unchanged by this
-- migration) never has anything to enrich.

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
             AND p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today)
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
       AND p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today) AS trained_today
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

-- ─── Part 6: community_dimension re-issued (discipline, age_band kinds) ─
--
-- Body identical to migrate_164's version except for the additions marked
-- migrate_170 below. No STABLE/VOLATILE keyword, same as migrate_164's
-- version (defaults to VOLATILE; it does not call _community_rate_check
-- either way, so this is unaffected by the migrate_167 lesson).

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
  v_my_age_band text; -- migrate_170
BEGIN
  -- migrate_170: two new kinds.
  IF _kind NOT IN ('style', 'programme', 'gym', 'area', 'discipline', 'age_band')
     OR _key IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF _kind = 'programme' THEN
    RETURN jsonb_build_object(
      'label', NULL, 'count', 0,
      'people', '[]'::jsonb, 'programmes', '[]'::jsonb, 'cursor', NULL);
  END IF;

  -- migrate_170 (blueprint section 3): age_band is reciprocal. A caller who
  -- does not share their own band, or asks for a band that is not their
  -- own, gets the same empty shape 'programme' returns above - never an
  -- error, never another band's roster.
  IF _kind = 'age_band' THEN
    SELECT tp_age_band INTO v_my_age_band
    FROM public.community_profiles WHERE user_id = v_uid;
    IF v_my_age_band IS NULL OR v_my_age_band <> _key THEN
      RETURN jsonb_build_object(
        'label', NULL, 'count', 0,
        'people', '[]'::jsonb, 'programmes', '[]'::jsonb, 'cursor', NULL);
    END IF;
  END IF;

  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  IF _kind = 'style' THEN
    v_label := public._community_style_label(_key);
  ELSIF _kind = 'discipline' THEN
    v_label := public._community_discipline_label(_key);
  ELSIF _kind = 'age_band' THEN
    -- migrate_170: no server-side age-band prose exists anywhere in this
    -- schema; the client already owns the key->text mapping (TP_AGE_BANDS)
    -- for every other age-band surface, so the raw key travels as its own
    -- label rather than this file inventing new copy.
    v_label := _key;
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
     OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))
     OR (_kind = 'age_band'   AND p.tp_age_band = _key)
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
   OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))
   OR (_kind = 'age_band'   AND p.tp_age_band = _key)
    );

  v_progs := '[]'::jsonb;

  RETURN jsonb_build_object(
    'label', v_label, 'count', v_count,
    'people', coalesce(v_people, '[]'::jsonb),
    'programmes', v_progs,
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;

REVOKE ALL ON FUNCTION public.community_dimension(text, text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_dimension(text, text, text, int) TO authenticated;

-- ─── Part 7: community_dimensions_me DROPped and re-created (_today) ────
--
-- Signature change (0 args -> 1): dynamically drop whatever is currently
-- installed first, the same pattern migrate_163/164 use for
-- community_find_people/community_send_message, so a second run of this
-- file finds the new signature already there, drops it, and recreates the
-- identical thing.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'community_dimensions_me' AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.community_dimensions_me(_today text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := public._community_caller();
  v_me   public.community_profiles%ROWTYPE;
  v_out  jsonb := '[]'::jsonb;
  v_items jsonb[] := ARRAY[]::jsonb[];
  v_style text;
  v_count int;
  v_prog  record;
  v_discipline text; -- migrate_170
  v_stats jsonb;      -- migrate_170
  v_today text;       -- reviewer 2026-09-10
BEGIN
  -- migrate_170: "today" is the caller's LOCAL day, the same reason
  -- community_board already requires it rather than trusting now()::date.
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
  -- reviewer 2026-09-10: this call now runs _community_cohort_stats up to
  -- eight times (two passes over community_profiles each) where migrate_160
  -- ran a handful of counts, and it had no rail at all. Same 120/hour rail
  -- community_board, community_find_people and community_hub_summary carry -
  -- the house figure set by security review 72 finding 10 for expensive
  -- reads. The function has no STABLE/IMMUTABLE keyword (migrate_167's
  -- lesson), so the rail's own INSERT is legal.
  PERFORM public._community_rate_check(v_uid, 'dimensions_me', 120, 120, interval '1 hour');

  -- migrate_170: style rows now source member_count from the same helper
  -- that produces trained_today_count/sample, instead of a second,
  -- functionally-identical COUNT query.
  FOREACH v_style IN ARRAY v_me.styles LOOP
    v_stats := public._community_cohort_stats(v_uid, 'style', v_style, v_today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'style', 'key', v_style,
        'label', public._community_style_label(v_style), 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  IF v_me.gym_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'gym', v_me.gym_key, v_today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'gym', 'key', v_me.gym_key, 'label', v_me.gym_label, 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  IF v_me.area_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'area', v_me.area_key, v_today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'area', 'key', v_me.area_key, 'label', v_me.area_label, 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  -- migrate_170 (blueprint section 3): one row per discipline key the
  -- caller holds, same shape as the style loop above.
  FOREACH v_discipline IN ARRAY v_me.discipline_keys LOOP
    v_stats := public._community_cohort_stats(v_uid, 'discipline', v_discipline, v_today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'discipline', 'key', v_discipline,
        'label', public._community_discipline_label(v_discipline), 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  -- migrate_170: one reciprocal age-band row, only while the caller shares
  -- their own band.
  IF v_me.tp_age_band IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'age_band', v_me.tp_age_band, v_today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'age_band', 'key', v_me.tp_age_band, 'label', v_me.tp_age_band, 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  -- Programmes I published or use. Unchanged by migrate_170: the layer is
  -- retired (migrate_164) and community_programmes holds no rows, so this
  -- loop never actually emits a row; left exactly as migrate_160 wrote it
  -- rather than extending a retired layer's join shape into the new
  -- cohort-stats helper.
  FOR v_prog IN
    SELECT g.id, g.title
    FROM public.community_programmes g
    WHERE g.status = 'visible'
      AND (g.owner_id = v_uid
           OR EXISTS (SELECT 1 FROM public.community_programme_uses u
                      WHERE u.programme_id = g.id AND u.user_id = v_uid))
  LOOP
    SELECT count(*) INTO v_count
    FROM public.community_programme_uses u
    JOIN public.community_profiles p ON p.user_id = u.user_id
    WHERE u.programme_id = v_prog.id AND u.user_id <> v_uid
      AND p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
      AND NOT public._community_is_blocked(v_uid, p.user_id);
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'programme', 'key', v_prog.id::text, 'label', v_prog.title, 'count', v_count);
    END IF;
  END LOOP;

  SELECT coalesce(jsonb_agg(x ORDER BY (x ->> 'count')::int DESC), '[]'::jsonb)
  INTO v_out FROM (SELECT unnest(v_items) AS x) t;

  RETURN jsonb_build_object('dimensions', v_out);
END $$;

REVOKE ALL ON FUNCTION public.community_dimensions_me(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_dimensions_me(text) TO authenticated;

-- ─── Part 8: community_board re-issued (area, style, discipline, age_band) ─
--
-- Body identical to migrate_169's fix except for the additions marked
-- migrate_170 below. Same signature, same windows, same small-group
-- threshold, same keyset paging, same `u.x` alias throughout (never
-- `x.*` - the exact migrate_165 bug migrate_169 fixed), same own-row
-- return, same rate rail. No STABLE/IMMUTABLE keyword (migrate_167's
-- lesson: it calls _community_rate_check, which writes).

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

-- ─── Part 9: community_hub_summary (new) ─────────────────────────────────
--
-- One call for the Hub (21-PHASE1-SPEC.md section 2 / blueprint section 9):
-- cohorts for the caller's gym, area, up to three styles, up to three
-- disciplines and age band (only while shared), plus the groups the caller
-- is a MEMBER of (state = 'member', not requested/invited). Rate-railed
-- and VOLATILE like every other Community read that writes a rate-check
-- row (migrate_167's lesson: STABLE/IMMUTABLE here would force PostgREST
-- into a read-only transaction and fail on the rate check's own INSERT).
-- No explicit minor-caller gate beyond what _community_cohort_stats and
-- the group query already enforce (is_minor = false on every counted or
-- sampled row, unconditionally) - no existing Community read blocks a
-- minor CALLER outright, so this does not invent one.

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
      ),
      'sample', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'user_id', s.user_id, 'handle', s.handle,
                 'display_name', s.display_name, 'avatar_preset', s.avatar_preset
               ) ORDER BY s.trained_today DESC, s.user_id), '[]'::jsonb)
        FROM (
          SELECT p3.user_id, p3.handle, p3.display_name, p3.avatar_preset,
            (p3.share_consistency = true
             AND p3.c_last_trained_day IS NOT NULL AND p3.c_last_trained_day = v_today) AS trained_today
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
  WHERE m.user_id = v_uid AND m.state = 'member';

  RETURN jsonb_build_object('cohorts', v_cohorts, 'groups', coalesce(v_groups, '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.community_hub_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_hub_summary(text) TO authenticated;

-- ─── Part 10: community_find_people DROPped and re-created (_discipline) ─
--
-- Signature change (4 args -> 5): dynamically drop whatever is currently
-- installed first, same pattern as Part 7. Body identical to migrate_164's
-- version except for the additions marked migrate_170 below. _discipline is
-- a HARD filter only (narrows the WHERE clause), not a scored signal -
-- matching how _filters' own hard filters (days/bands/goal/age_band)
-- already behave, as distinct from the scored "shared attribute" reasons
-- computed later in the function.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'community_find_people' AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.community_find_people(
  _mode text DEFAULT 'like_me', _cursor text DEFAULT NULL, _limit int DEFAULT 20,
  _filters jsonb DEFAULT NULL, _discipline text DEFAULT NULL
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
  v_cur_score int;
  v_cur_ts    timestamptz;
  v_cur_id    uuid;
  v_page      jsonb;
  v_remaining int;
  v_next_cursor text;
  v_already   uuid[];
  v_fallback  jsonb;
  v_page_len  int;
  v_discipline text; -- migrate_170
BEGIN
  IF _mode IS NULL OR _mode NOT IN
     ('like_me', 'gym', 'area', 'partners', 'might_know') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'find_people', 120, 120, interval '1 hour');

  -- migrate_170: _discipline is a trailing parameter of its own (not
  -- nested in _filters), because a discipline is a first-class cohort door
  -- like gym/area, not a combinable _filters preference. Validated against
  -- the same taxonomy helper community_upsert_profile uses.
  v_discipline := nullif(btrim(coalesce(_discipline, '')), '');
  IF v_discipline IS NOT NULL AND NOT public._community_discipline_key_ok(ARRAY[v_discipline]) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

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
      -- migrate_170: hard filter, independent of _mode/_filters, same shape.
      AND (v_discipline IS NULL OR v_discipline = ANY (p.discipline_keys))
    ORDER BY p.last_active_at DESC
    LIMIT 1000
  LOOP
    v_scanned := v_scanned + 1;
    v_score := 0;
    v_reasons := ARRAY[]::text[];

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

    IF coalesce(v_row.show_place, true) AND v_me.area_key IS NOT NULL
       AND v_row.area_key = v_me.area_key THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Lists ' || coalesce(v_row.area_label, v_me.area_label));
    END IF;

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

REVOKE ALL ON FUNCTION public.community_find_people(text, text, int, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_find_people(text, text, int, jsonb, text) TO authenticated;

-- ─── Acceptance check (read-only) ────────────────────────────────────────

DO $$
DECLARE
  v_ok  boolean;
  v_src text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'community_profiles'
      AND column_name = 'discipline_keys'
  ) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'acceptance failed: discipline_keys column missing'; END IF;

  IF to_regprocedure('public._community_discipline_key_ok(text[])') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_discipline_key_ok missing';
  END IF;
  IF to_regprocedure('public._community_discipline_label(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_discipline_label missing';
  END IF;
  IF to_regprocedure('public._community_cohort_stats(uuid, text, text, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_cohort_stats missing';
  END IF;
  IF to_regprocedure('public.community_hub_summary(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_hub_summary missing';
  END IF;
  IF to_regprocedure('public.community_dimensions_me(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_dimensions_me(text) missing (old 0-arg signature not dropped, or new one not created)';
  END IF;
  IF to_regprocedure('public.community_find_people(text, text, integer, jsonb, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_find_people(..., _discipline) missing';
  END IF;

  -- migrate_167's lesson: a function that calls _community_rate_check must
  -- never be STABLE/IMMUTABLE (provolatile 's'/'i'), or PostgREST forces a
  -- read-only transaction and the rate check's own write fails every time.
  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.community_hub_summary(text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_hub_summary is not VOLATILE';
  END IF;

  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure(
    'public.community_board(text, text, text, text, integer, text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_board is not VOLATILE';
  END IF;

  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure(
    'public.community_find_people(text, text, integer, jsonb, text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_find_people is not VOLATILE';
  END IF;

  -- reviewer 2026-09-10: community_dimensions_me now calls
  -- _community_rate_check too, so it falls under the same migrate_167 rule.
  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.community_dimensions_me(text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_dimensions_me is not VOLATILE';
  END IF;

  -- reviewer 2026-09-10: both new indexes present.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
      AND indexname = 'community_profiles_discipline_keys_idx'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_profiles_discipline_keys_idx missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
      AND indexname = 'community_profiles_tp_age_band_idx'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_profiles_tp_age_band_idx missing';
  END IF;

  -- migrate_169's lesson: no ranking CTE may reference the nonexistent
  -- table alias `x` (unnest's own column alias) instead of the derived
  -- table `u`.
  SELECT pg_get_functiondef(oid) INTO v_src
  FROM pg_proc WHERE proname = 'community_board' AND pronamespace = 'public'::regnamespace;
  IF v_src ILIKE '%SELECT x.*,%' THEN
    RAISE EXCEPTION 'acceptance failed: the x.* alias bug is present in community_board';
  END IF;
  IF v_src NOT ILIKE '%discipline%' THEN
    RAISE EXCEPTION 'acceptance failed: community_board does not mention the discipline scope';
  END IF;

  -- Every function this migration touches stays SECURITY DEFINER with the
  -- pinned search_path.
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        '_community_discipline_key_ok', '_community_discipline_label',
        '_community_cohort_stats', 'community_hub_summary',
        'community_dimensions_me', 'community_dimension',
        'community_board', 'community_find_people', 'community_upsert_profile',
        '_community_profile_card')
      AND (NOT p.prosecdef OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_170 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  -- The two helpers must never be reachable by authenticated or anon.
  IF has_function_privilege('authenticated', 'public._community_discipline_key_ok(text[])', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._community_discipline_label(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._community_cohort_stats(uuid, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_170 helper is executable by authenticated';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.community_hub_summary(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_hub_summary is not executable by authenticated';
  END IF;

  RAISE NOTICE 'migrate_170 part A acceptance: OK';
END $$;

-- ─── PART A2: community_dimension_recent + community_group_get alignment ─
--
-- Additive to Part A above (unchanged), same file, same "run against
-- production" gate (the header's "Applied remotely: NO" still covers
-- everything below). Authority: `docs/communities-revamp-2026-09-10/
-- 21-PHASE1-SPEC.md` section 3 (the RECENT correction, lane P1-B STOP
-- 2026-09-10: "community_dimension returns no stories, only label, count,
-- people and cursor; this section is built in phase 2 on a new
-- community_dimension_recent RPC added to migration 170 as part A2");
-- `20-BLUEPRINT.md` section 3 (cohort page item 3, "Recent: shared moments
-- from cohort members whose audience is Everyone") and section 9's
-- cohort-page RECENT eyebrow. `22-MIGRATION-170A-CONTRACT.md` documents
-- both pieces below for the client lane.
--
-- 1. community_dimension_recent(_kind, _key, _cursor, _limit): the RECENT
--    section's data source. Same cohort membership test community_
--    dimension and _community_cohort_stats already use for style/gym/
--    area/discipline/age_band (active, non-minor, public profiles, never
--    the caller, never a blocked pair), the same age-band reciprocity
--    gate community_dimension uses, and the same empty shape community_
--    dimension returns for 'programme' - extended here to also cover any
--    kind this function does not recognise, since it supports five kinds,
--    not community_dimension's six ('programme' has no posts of its own
--    to page; the layer is retired, migrate_164). Posts are filtered to
--    exactly what community_discover_posts (migrate_160) already lets the
--    viewer see: status = 'visible', visibility = 'public', author
--    active/public/non-minor, never blocked either way, never muted by
--    the viewer - never a minor's post, never a followers-only post.
--    Newest first, keyset-paged the same (created_at, id) way community_
--    feed/community_discover_posts/community_group_feed already page (a
--    straight indexed ORDER BY needs none of the array/unnest 'u.x' idiom
--    community_board/community_find_people use for an in-memory metric
--    rank - migrate_169's lesson does not apply to a query ordered on
--    real indexed columns). Rows carry the exact {post, author,
--    my_reaction} shape community_feed returns, wrapped as {rows, cursor}
--    so the client's existing normalisePostRow (CommunityHubScreen.js)
--    reads a row of that shape regardless of which RPC produced it.
--    VOLATILE and rate-railed at 120/hour (action 'dimension_recent'),
--    the same rail every other cohort read in this file carries - it
--    calls _community_rate_check, so migrate_167's lesson applies: no
--    STABLE/IMMUTABLE keyword.
-- 2. community_group_get re-issued: member_count is now computed on the
--    same predicate community_hub_summary's group block already uses
--    (active, non-minor - which alone also means non-suspended and
--    non-restricted, since community_profiles.status's CHECK is only
--    'active'/'restricted'/'suspended'), replacing the raw stored
--    community_groups.member_count counter, which counts every member
--    row regardless of status or age. Lead ruling 6, 2026-09-10 (this
--    file's own header, community_hub_summary section) named this a
--    part B (phase 3) job; it is pulled forward into part A2 instead, so
--    the two RPCs never disagree about who counts from the moment either
--    ships, not only once part B lands. Signature unchanged (_group_id
--    uuid only) - CREATE OR REPLACE, not the DROP-first dance part 7/10
--    above use, because no parameter list changes. Unlike community_hub_
--    summary's figure, this one is NOT reduced by the caller's own
--    blocks: the card is shown to every member of an open group, and to
--    a non-member browsing one (Design 60 section 3), not only the
--    caller, so a personal block list must never change the group's own
--    stated size - only community_hub_summary's per-viewer sample and
--    count (a face the caller would actually see) does that.

CREATE OR REPLACE FUNCTION public.community_dimension_recent(
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
  v_rows  jsonb;
  v_lts   timestamptz;
  v_lid   uuid;
  v_my_age_band text;
BEGIN
  IF _key IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  PERFORM public._community_rate_check(v_uid, 'dimension_recent', 120, 120, interval '1 hour');

  -- part A2: five recognised kinds, not community_dimension's six -
  -- 'programme' and anything else this function does not recognise get
  -- the same empty shape community_dimension returns for 'programme',
  -- never an error, so a stale or future kind value degrades honestly
  -- instead of failing the whole cohort page's RECENT section.
  IF _kind NOT IN ('gym', 'area', 'style', 'discipline', 'age_band') THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb, 'cursor', NULL);
  END IF;

  -- part A2 (blueprint section 3): age_band is reciprocal, byte-identical
  -- to community_dimension's own gate - a caller who does not share their
  -- own band, or asks for a band that is not their own, gets the same
  -- empty shape, never another band's stories.
  IF _kind = 'age_band' THEN
    SELECT tp_age_band INTO v_my_age_band
    FROM public.community_profiles WHERE user_id = v_uid;
    IF v_my_age_band IS NULL OR v_my_age_band <> _key THEN
      RETURN jsonb_build_object('rows', '[]'::jsonb, 'cursor', NULL);
    END IF;
  END IF;

  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  -- part A2: the exact community_discover_posts visibility predicate,
  -- ANDed with the same cohort membership test _community_cohort_stats/
  -- community_dimension use.
  WITH page AS (
    SELECT r AS rec, r.created_at AS created_at, r.id AS id, r.author_id AS author_id
    FROM public.community_posts r
    JOIN public.community_profiles p ON p.user_id = r.author_id
    WHERE r.status = 'visible'
      AND r.visibility = 'public'
      AND p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
      AND p.user_id <> v_uid
      AND NOT public._community_is_blocked(v_uid, p.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes m
        WHERE m.muter_id = v_uid AND m.muted_id = r.author_id)
      AND (
        (_kind = 'style'      AND _key = ANY (p.styles))
     OR (_kind = 'gym'        AND p.gym_key = _key)
     OR (_kind = 'area'       AND p.area_key = _key)
     OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))
     OR (_kind = 'age_band'   AND p.tp_age_band = _key)
      )
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
    'rows', coalesce(v_rows, '[]'::jsonb),
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;

REVOKE ALL ON FUNCTION public.community_dimension_recent(text, text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_dimension_recent(text, text, text, int) TO authenticated;

-- part A2: community_group_get re-issued. Body identical to migrate_165's
-- version except for the member_count override marked part A2 below.

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

  -- Design 60 §3: name and count visible to all for an open group, name
  -- only for an invite group, unless the caller is already a member.
  IF v_role IS NULL AND v_g.access = 'invite' THEN
    v_out := v_out - 'member_count' - 'blurb';
  END IF;
  RETURN v_out || jsonb_build_object('my_role', v_role, 'my_state',
    (SELECT state FROM public.community_group_members WHERE group_id = _group_id AND user_id = v_uid));
END $$;

REVOKE ALL ON FUNCTION public.community_group_get(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_get(uuid) TO authenticated;

-- ─── Part A2 acceptance check (read-only) ────────────────────────────────

DO $$
DECLARE v_ok boolean;
BEGIN
  IF to_regprocedure('public.community_dimension_recent(text, text, text, int)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_dimension_recent missing';
  END IF;

  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure(
    'public.community_dimension_recent(text, text, text, int)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_dimension_recent is not VOLATILE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'community_dimension_recent'
      AND (NOT p.prosecdef OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_dimension_recent is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  IF NOT has_function_privilege('authenticated',
      'public.community_dimension_recent(text, text, text, int)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_dimension_recent is not executable by authenticated';
  END IF;

  RAISE NOTICE 'migrate_170 part A2 acceptance: OK';
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- ─── PART B: ambient sharing, groups, Together, Respect, the digest ─────
-- ═══════════════════════════════════════════════════════════════════════
--
-- Additive to Part A and Part A2 above (both unchanged), same file, same
-- "run against production" gate (the header's "Applied remotely: NO" still
-- covers everything below). Authority: `docs/communities-revamp-2026-09-10/
-- 23-PHASE3-SPEC.md` sections 1-7 (the edit gate for this lane) and
-- `20-BLUEPRINT.md` sections 4-8. Contract:
-- `22-MIGRATION-170A-CONTRACT.md` PART B section documents every RPC below
-- for the client lane.
--
-- 1. `community_profiles.share_sessions` / `sessions_audience` /
--    `c_planned_per_week`; `community_upsert_profile` re-issued (signature
--    now `(_p jsonb, _remove_shared boolean DEFAULT false)` - DROPped and
--    recreated, the same pg_proc-introspecting pattern Part A used for
--    `community_dimensions_me`/`community_find_people`, because a genuinely
--    new parameter changes the function's identity) to accept the three
--    fields inside `_p` on the same "omit the key to leave it unchanged"
--    contract `discipline_keys` already has, and `_remove_shared` to bulk-
--    delete the caller's own auto items when sharing turns off.
-- 2. `community_posts.auto` / `client_ref`, a partial unique index on
--    (author_id, client_ref), the visibility CHECK widened to add
--    'groups', and new table `community_post_groups`. `community_create_
--    post` DROPped and recreated (three new trailing parameters) to accept
--    `_auto`, `_client_ref` (idempotent upsert-on-conflict, returning the
--    existing row) and `_group_ids` (membership-checked, minor-refused).
--    New `community_post_set_note`. Every reader of post visibility -
--    `_community_can_view_post` (shared by react/comment/report/group
--    feed), `community_get_post`, `community_feed`, `community_group_feed`
--    and `community_get_profile` (the profile's own posts list) - is re-
--    issued with the same new 'groups' branch: visible to members of a
--    named group, the author always. `delete_user_data` re-issued to name
--    `community_post_groups` (and, for the same completeness reason,
--    `community_notify_daily` from item 6 below).
-- 3. `community_group_get` re-issued (signature unchanged) to add
--    `together_sessions_week`, `together_planned_week` and
--    `sharing_members`, stripped for a non-member of an invite-only group
--    exactly like `member_count`/`blurb` already are.
-- 4. New `community_respect_all(_scope, _scope_key, _today)`: bulk Respect
--    for a roster, targeting each eligible member's LATEST auto session
--    post trained today, idempotent per post through the same rows
--    `community_react` writes.
-- 5. `_community_connect_reasons_list` re-issued: `same_programme` out,
--    `same_discipline` in, same position, same order otherwise.
-- 6. New table `community_notify_daily`, and the `community-notify` edge
--    function collapses `reaction` pushes to one per recipient per UK-
--    local day (separate file, not SQL).
--
-- Nothing here touches the coaching engine, food, bodyweight, tier or
-- billing. Nothing here weakens a Section 2 inviolable: the ED-safety
-- floors are untouched, the deterministic engine is untouched, minors stay
-- excluded from every count/sample/roster this part adds to, and consent
-- for the two new toggles rides the same `community_visibility` record
-- every other Community field already uses (no new consent TYPE).

-- ─── B1: community_profiles sharing columns ──────────────────────────────

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS share_sessions boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS sessions_audience text NOT NULL DEFAULT 'followers';
ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS c_planned_per_week int;

DO $$ BEGIN
  ALTER TABLE public.community_profiles
    ADD CONSTRAINT community_profiles_sessions_audience_check
    CHECK (sessions_audience IN ('followers', 'groups', 'everyone'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── B2: community_upsert_profile DROPped and re-created (_remove_shared) ─
--
-- Signature change (1 arg -> 2): dynamically drop whatever is currently
-- installed first, the same pattern Part A used for community_dimensions_
-- me/community_find_people, so a second run of this file finds the new
-- signature already there, drops it, and recreates the identical thing.
-- Body identical to Part A's version except for the additions marked
-- migrate_170 part B below.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'community_upsert_profile' AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.community_upsert_profile(_p jsonb, _remove_shared boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid        uuid := public._community_caller();
  v_existing   public.community_profiles%ROWTYPE;
  v_is_new     boolean;
  v_handle     text;
  v_display    text;
  v_bio        text;
  v_avatar     text;
  v_styles     text[];
  v_goal       text;
  v_setting    text;
  v_area_label text;
  v_area_key   text;
  v_gym_label  text;
  v_gym_key    text;
  v_visibility text;
  v_minor      boolean;
  v_accept     int;
  v_style      text;
  v_discipline_keys text[]; -- migrate_170
  v_dk         text;        -- migrate_170
  v_share_sessions    boolean; -- migrate_170 part B
  v_sessions_audience text;    -- migrate_170 part B
  v_c_planned_per_week int;    -- migrate_170 part B
BEGIN
  IF _p IS NULL OR jsonb_typeof(_p) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  SELECT * INTO v_existing FROM public.community_profiles WHERE user_id = v_uid;
  v_is_new := NOT FOUND;
  IF NOT v_is_new THEN
    _p := jsonb_build_object(
      'handle',        v_existing.handle,
      'display_name',  v_existing.display_name,
      'avatar_preset', v_existing.avatar_preset,
      'bio',           v_existing.bio,
      'styles',        to_jsonb(v_existing.styles),
      'goal',          v_existing.goal,
      'setting',       v_existing.setting,
      'area_label',    v_existing.area_label,
      'gym_label',     v_existing.gym_label,
      'visibility',    v_existing.visibility,
      -- migrate_170: same "existing value survives an omitted key" rule.
      'discipline_keys', to_jsonb(coalesce(v_existing.discipline_keys, ARRAY[]::text[])),
      -- migrate_170 part B: same rule, for the three new fields.
      'share_sessions',    coalesce(v_existing.share_sessions, false),
      'sessions_audience', coalesce(v_existing.sessions_audience, 'followers'),
      'c_planned_per_week', v_existing.c_planned_per_week
    ) || coalesce(_p, '{}'::jsonb);
  END IF;

  IF NOT v_is_new AND v_existing.status = 'suspended' THEN
    RAISE EXCEPTION USING message = 'profile_suspended';
  END IF;

  v_handle := lower(btrim(coalesce(_p ->> 'handle', '')));
  IF NOT public._community_handle_valid(v_handle) THEN
    RAISE EXCEPTION USING message = 'handle_invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.community_profiles
    WHERE handle = v_handle AND user_id <> v_uid
  ) THEN
    RAISE EXCEPTION USING message = 'handle_taken';
  END IF;
  IF NOT v_is_new AND v_handle <> v_existing.handle THEN
    IF v_existing.handle_changed_at IS NOT NULL
       AND v_existing.handle_changed_at > now() - interval '30 days' THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
  END IF;

  v_display := public._community_clean_text(btrim(coalesce(_p ->> 'display_name', '')));
  IF v_display IS NULL OR length(v_display) < 1 OR length(v_display) > 40 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_bio := nullif(btrim(coalesce(_p ->> 'bio', '')), '');
  IF v_bio IS NOT NULL THEN
    v_bio := public._community_clean_text(v_bio);
    IF length(v_bio) > 160 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  END IF;

  v_avatar := nullif(btrim(coalesce(_p ->> 'avatar_preset', '')), '');
  IF v_avatar IS NOT NULL AND v_avatar !~ '^[a-z0-9_]{1,32}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_styles := ARRAY[]::text[];
  IF _p ? 'styles' AND jsonb_typeof(_p -> 'styles') = 'array' THEN
    FOR v_style IN SELECT jsonb_array_elements_text(_p -> 'styles') LOOP
      v_style := lower(btrim(coalesce(v_style, '')));
      IF v_style = '' THEN CONTINUE; END IF;
      IF v_style !~ '^[a-z0-9_]{2,32}$' THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      IF NOT (v_style = ANY (v_styles)) THEN v_styles := v_styles || v_style; END IF;
    END LOOP;
  END IF;
  IF array_length(v_styles, 1) > 3 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;

  -- migrate_170: discipline_keys, same shape of parsing as styles above,
  -- validated against the taxonomy (and the <= 3 cap) by the one helper.
  v_discipline_keys := ARRAY[]::text[];
  -- reviewer 2026-09-10: a `discipline_keys` key that is present but is not
  -- an array used to fall straight through to the empty array, i.e. it
  -- silently ERASED the stored keys instead of refusing. Refuse instead;
  -- losing a person's saved choices to a malformed payload is worse than an
  -- error. (`styles` a few lines above has the same shape, pre-existing and
  -- deliberately left alone here.)
  IF _p ? 'discipline_keys' AND jsonb_typeof(_p -> 'discipline_keys') <> 'array' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _p ? 'discipline_keys' AND jsonb_typeof(_p -> 'discipline_keys') = 'array' THEN
    FOR v_dk IN SELECT jsonb_array_elements_text(_p -> 'discipline_keys') LOOP
      v_dk := lower(btrim(coalesce(v_dk, '')));
      IF v_dk = '' THEN CONTINUE; END IF;
      IF NOT (v_dk = ANY (v_discipline_keys)) THEN v_discipline_keys := v_discipline_keys || v_dk; END IF;
    END LOOP;
  END IF;
  IF NOT public._community_discipline_key_ok(v_discipline_keys) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_goal := nullif(btrim(coalesce(_p ->> 'goal', '')), '');
  IF v_goal IS NOT NULL
     AND v_goal NOT IN ('build_muscle', 'get_stronger', 'general_fitness', 'returning') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_setting := nullif(btrim(coalesce(_p ->> 'setting', '')), '');
  IF v_setting IS NOT NULL
     AND v_setting NOT IN ('commercial_gym', 'home_gym', 'minimal_kit') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_area_label := nullif(btrim(coalesce(_p ->> 'area_label', '')), '');
  IF v_area_label IS NOT NULL THEN
    v_area_label := public._community_clean_text(v_area_label);
    IF length(v_area_label) > 40 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
    v_area_key := nullif(public._community_fold(v_area_label), '');
  END IF;

  IF v_existing.gym_id IS NOT NULL THEN
    v_gym_label := v_existing.gym_label;
    v_gym_key   := v_existing.gym_key;
  ELSE
    v_gym_label := nullif(btrim(coalesce(_p ->> 'gym_label', '')), '');
    IF v_gym_label IS NOT NULL THEN
      v_gym_label := public._community_clean_text(v_gym_label);
      IF length(v_gym_label) > 60 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      v_gym_key := nullif(coalesce(v_area_key, '') || ':' || public._community_fold(v_gym_label), ':');
    END IF;
  END IF;

  v_visibility := coalesce(nullif(btrim(coalesce(_p ->> 'visibility', '')), ''), 'public');
  IF v_visibility NOT IN ('public', 'followers') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_minor := public._community_minor(v_uid);
  IF v_minor THEN v_visibility := 'followers'; END IF;

  -- migrate_170 part B (phase3 spec section 1): share_sessions/
  -- sessions_audience, same "omit key = unchanged" contract as every other
  -- optional field above (the merge-defaults block already folded the
  -- existing values back into _p when the key was omitted).
  v_share_sessions := false;
  IF jsonb_typeof(_p -> 'share_sessions') = 'boolean' THEN
    v_share_sessions := (_p ->> 'share_sessions')::boolean;
  END IF;

  v_sessions_audience := coalesce(nullif(btrim(coalesce(_p ->> 'sessions_audience', '')), ''), 'followers');
  IF v_sessions_audience NOT IN ('followers', 'groups', 'everyone') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- migrate_170 part B (phase3 spec section 1, blueprint section 8): a
  -- minor never gets an audience wider than their followers. 'everyone' is
  -- refused outright rather than silently rewritten - the same "refuse,
  -- never quietly erase/rewrite a minor's choice" posture the discipline_
  -- keys refusal above set - because it is the one value a minor must never
  -- reach even transiently; anything else a minor sends (including
  -- 'groups', which they can never actually populate: community_group_join/
  -- _create already refuse a minor) is simply forced down to 'followers'.
  IF v_minor THEN
    IF v_sessions_audience = 'everyone' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    v_sessions_audience := 'followers';
  END IF;

  -- migrate_170 part B: c_planned_per_week, the same clamp-or-drop posture
  -- community_update_training_profile already uses for its own counters
  -- (out-of-range or malformed is dropped to NULL, never a hard refusal -
  -- a stale build sending one bad field should not lose the whole call).
  v_c_planned_per_week := NULL;
  IF jsonb_typeof(_p -> 'c_planned_per_week') = 'number' THEN
    -- reviewer 2026-09-10 (B): upper bound 14, not 21. This number is only
    -- ever summed into the group's "Together" planned figure, and a bound
    -- nobody can plan to is a bound that only ever makes that line read
    -- wrong. Two sessions a day, every day, is already past any plan this
    -- engine generates.
    v_c_planned_per_week := greatest(0, least((_p ->> 'c_planned_per_week')::int, 14));
  END IF;

  PERFORM public._community_rate_check(v_uid, 'profile_upsert', 5, 5);

  IF v_is_new THEN
    IF coalesce(_p ->> 'accept_rules_version', '') !~ '^[0-9]{1,6}$' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    v_accept := (_p ->> 'accept_rules_version')::int;
    IF v_accept IS DISTINCT FROM public._community_rules_version() THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;

    INSERT INTO public.community_profiles (
      user_id, handle, display_name, avatar_preset, bio, styles, discipline_keys,
      goal, setting, area_label, area_key, gym_label, gym_key, visibility, is_minor,
      status, rules_version, last_active_at,
      share_sessions, sessions_audience, c_planned_per_week)
    VALUES (
      v_uid, v_handle, v_display, v_avatar, v_bio, v_styles, v_discipline_keys,
      v_goal, v_setting, v_area_label, v_area_key, v_gym_label, v_gym_key,
      v_visibility, v_minor, 'active', public._community_rules_version(), now(),
      v_share_sessions, v_sessions_audience, v_c_planned_per_week);

    INSERT INTO public.consent_log
      (user_id, consent_type, granted, granted_at, notice_version)
    VALUES (v_uid, 'community_visibility', true, now(),
            public._community_rules_version()::text);

    PERFORM public._community_convert_partnerships(v_uid);
  ELSE
    UPDATE public.community_profiles SET
      handle            = v_handle,
      handle_changed_at = CASE WHEN v_handle <> v_existing.handle THEN now()
                               ELSE v_existing.handle_changed_at END,
      display_name      = v_display,
      avatar_preset     = v_avatar,
      bio               = v_bio,
      styles            = v_styles,
      discipline_keys   = v_discipline_keys,
      goal              = v_goal,
      setting           = v_setting,
      area_label        = v_area_label,
      area_key          = v_area_key,
      gym_label         = v_gym_label,
      gym_key           = v_gym_key,
      visibility        = v_visibility,
      is_minor          = v_minor,
      share_sessions      = v_share_sessions,
      sessions_audience   = v_sessions_audience,
      c_planned_per_week  = v_c_planned_per_week,
      last_active_at    = now()
    WHERE user_id = v_uid;

    IF _p ? 'accept_rules_version' THEN
      IF coalesce(_p ->> 'accept_rules_version', '') !~ '^[0-9]{1,6}$' THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      v_accept := (_p ->> 'accept_rules_version')::int;
      IF v_accept IS DISTINCT FROM public._community_rules_version() THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      IF coalesce(v_existing.rules_version, 0) < v_accept THEN
        UPDATE public.community_profiles SET rules_version = v_accept WHERE user_id = v_uid;
        INSERT INTO public.consent_log
          (user_id, consent_type, granted, granted_at, notice_version)
        VALUES (v_uid, 'community_visibility', true, now(), v_accept::text);
      END IF;
    END IF;

    PERFORM public._community_convert_partnerships(v_uid);
  END IF;

  PERFORM public._community_populate_place_from_gym(v_uid);

  -- migrate_170 part B (phase3 spec section 1): "Remove the items already
  -- shared?" turning share_sessions off with removal requested deletes
  -- every auto item this account posted, mirroring community_delete_post's
  -- own cleanup (comments, activity) since a bulk delete here bypasses that
  -- single-post RPC; community_reactions and community_post_groups cascade
  -- via their post_id foreign key. A no-op (nothing to delete, or sharing
  -- was not actually turned off) is harmless, so this never needs an extra
  -- guard beyond the two conditions in the IF.
  IF _remove_shared AND NOT v_share_sessions THEN
    DELETE FROM public.community_comments
    WHERE target_kind = 'post'
      AND target_id IN (SELECT id FROM public.community_posts WHERE author_id = v_uid AND auto = true);
    DELETE FROM public.community_activity
    WHERE target_kind = 'post'
      AND target_id IN (SELECT id FROM public.community_posts WHERE author_id = v_uid AND auto = true);
    DELETE FROM public.community_posts WHERE author_id = v_uid AND auto = true;
  END IF;

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

REVOKE ALL ON FUNCTION public.community_upsert_profile(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_upsert_profile(jsonb, boolean) TO authenticated;

-- ─── B3: community_posts.auto/client_ref, visibility CHECK, community_post_groups ─

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS auto boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS client_ref text;

-- Idempotency key for an ambient item (phase3 spec section 2): a retried
-- flush of the same pending payload must return the row that already
-- exists, never duplicate it. Partial (WHERE client_ref IS NOT NULL) so an
-- ordinary manual post, which never carries one, is never constrained by
-- this at all.
CREATE UNIQUE INDEX IF NOT EXISTS community_posts_author_client_ref_idx
  ON public.community_posts (author_id, client_ref) WHERE client_ref IS NOT NULL;

-- Widen the visibility CHECK to add 'groups', idempotently: drop it if
-- present (pg_constraint introspection, not the duplicate_object-tolerant
-- DO block every ADD CONSTRAINT elsewhere in this file uses, because this
-- one must actually change on a second run against an already-migrated
-- database, not silently no-op) and re-add the same-named constraint with
-- the wider set.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_visibility_check'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_visibility_check;
  END IF;
  ALTER TABLE public.community_posts
    ADD CONSTRAINT community_posts_visibility_check
    CHECK (visibility IN ('public', 'followers', 'groups'));
END $$;

-- Post-to-group audience (phase3 spec section 3/blueprint section 6): RLS
-- on, no grants, RPC-only, the same posture every other community_* table
-- has. Deliberately no ON DELETE action row of its own choice for a
-- membership removal (see the contract's Part B "what did not change"
-- note): only the FK cascades below apply.
CREATE TABLE IF NOT EXISTS public.community_post_groups (
  post_id  uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, group_id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['community_post_groups'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- ─── B4: community_create_post DROPped and re-created (auto/client_ref/groups) ─
--
-- Signature change (5 args -> 8): dynamically drop whatever is currently
-- installed first, the same pg_proc-introspecting pattern as B2 above and
-- Part A's community_dimensions_me/community_find_people. Body identical
-- to migrate_160's version except for the additions marked migrate_170
-- part B below.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'community_create_post' AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.community_create_post(
  _kind text, _payload jsonb, _caption text DEFAULT NULL,
  _programme_id uuid DEFAULT NULL, _visibility text DEFAULT 'public',
  _auto boolean DEFAULT false, _client_ref text DEFAULT NULL,
  _group_ids uuid[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := public._community_caller();
  v_allowed text[];
  v_key     text;
  v_caption text;
  v_vis     text;
  v_id      uuid;
  v_client_ref text; -- migrate_170 part B
  v_group_ids  uuid[]; -- migrate_170 part B
  v_gid        uuid; -- migrate_170 part B
  v_inserted   boolean; -- migrate_170 part B
  v_share_sessions    boolean; -- reviewer 2026-09-10 (B)
  v_sessions_audience text;    -- reviewer 2026-09-10 (B)
  v_auto_vis          text;    -- reviewer 2026-09-10 (B)
  v_day_start         timestamptz; -- lead ruling 2026-09-10 (B)
BEGIN
  PERFORM public._community_require_profile(v_uid, true);

  v_allowed := public._community_payload_keys(_kind);
  IF v_allowed IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF octet_length(_payload::text) > 16384 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  FOR v_key IN SELECT key FROM jsonb_each(_payload) LOOP
    IF NOT (v_key = ANY (v_allowed)) THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
  END LOOP;
  PERFORM public._community_forbidden_keys(_payload);

  v_caption := nullif(btrim(coalesce(_caption, '')), '');
  IF v_caption IS NOT NULL THEN
    v_caption := public._community_clean_text(v_caption);
    IF length(v_caption) > 280 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  END IF;

  -- migrate_170 part B (phase3 spec section 3): visibility gains 'groups'.
  v_vis := coalesce(nullif(btrim(coalesce(_visibility, '')), ''), 'public');
  IF v_vis NOT IN ('public', 'followers', 'groups') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF _programme_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.community_programmes WHERE id = _programme_id) THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;

  -- migrate_170 part B (phase3 spec section 2): client_ref, trimmed to a
  -- sane bound. NULL stays NULL (an ordinary manual post never carries
  -- one), so the partial unique index above never applies to it.
  v_client_ref := nullif(btrim(coalesce(_client_ref, '')), '');
  IF v_client_ref IS NOT NULL AND length(v_client_ref) > 120 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- migrate_170 part B (phase3 spec sections 3 and 6): a 'groups' post must
  -- name at least one group (never zero - that would be a post nobody but
  -- its own author could ever see), the caller must currently belong to
  -- every group named, and a minor is refused outright with its own error
  -- rather than silently stripped - the same "refuse, never erase" posture
  -- community_upsert_profile's discipline_keys check already set for this
  -- file (reviewer 2026-09-10, part A). Minors cannot be group members at
  -- all (community_group_join/_create already refuse them), so this is
  -- belt and braces, not the only thing standing in a minor's way.
  v_group_ids := NULL;
  IF _group_ids IS NOT NULL AND array_length(_group_ids, 1) > 0 THEN
    IF v_vis <> 'groups' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    IF public._community_caller_is_minor(v_uid) THEN
      RAISE EXCEPTION USING message = 'minor_restricted';
    END IF;
    SELECT array_agg(DISTINCT g) INTO v_group_ids FROM unnest(_group_ids) AS g;
    IF array_length(v_group_ids, 1) > 20 THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    FOREACH v_gid IN ARRAY v_group_ids LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.community_group_members m
        WHERE m.group_id = v_gid AND m.user_id = v_uid AND m.state = 'member'
      ) THEN
        RAISE EXCEPTION USING message = 'not_allowed';
      END IF;
    END LOOP;
  ELSIF v_vis = 'groups' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- reviewer 2026-09-10 (B): CONSENT, checked on the server, not only in
  -- the client that sets _auto. An ambient item is Article 9 training data
  -- published on an express toggle (blueprint section 8, tightening R3), so
  -- "share_sessions is on" must be a fact this function establishes for
  -- itself: a stale build, a replayed offline queue flushed after the
  -- toggle went off, or any caller holding a session JWT could otherwise
  -- publish auto items the owner never consented to. The audience is
  -- enforced with it - an auto item may never be WIDER than the audience
  -- the owner chose ('public' only under 'everyone', 'groups' only under
  -- 'groups'), while 'followers' stays permitted under every audience
  -- because it is this product's consent floor: the value a minor is
  -- forced to, and the value a queued item narrows to when the owner's
  -- choice moved on. A minor therefore can never reach 'public' or
  -- 'groups' here at all, since sessions_audience is forced to 'followers'
  -- for them on write (B2 above); the explicit minor line below is belt
  -- and braces on top of that, never the only thing standing in the way.
  IF coalesce(_auto, false) THEN
    SELECT p.share_sessions, p.sessions_audience
      INTO v_share_sessions, v_sessions_audience
    FROM public.community_profiles p WHERE p.user_id = v_uid;
    IF NOT coalesce(v_share_sessions, false) THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
    v_auto_vis := CASE coalesce(v_sessions_audience, 'followers')
                    WHEN 'everyone' THEN 'public'
                    WHEN 'groups'   THEN 'groups'
                    ELSE 'followers' END;
    IF v_vis <> 'followers' AND v_vis <> v_auto_vis THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
    IF v_vis <> 'followers' AND public._community_caller_is_minor(v_uid) THEN
      RAISE EXCEPTION USING message = 'minor_restricted';
    END IF;
  END IF;

  -- reviewer 2026-09-10 (B): resolve an already-flushed client_ref BEFORE
  -- the rate rail. The ON CONFLICT below made the WRITE idempotent, but the
  -- rail is spent before it is ever reached, so the contract's "safe to
  -- retry an offline-queued flush any number of times" was false: three
  -- retries of one pending item exhaust a new member's whole day of three
  -- and the queue can then never drain. A ref this author has already
  -- posted is not a new post and must not cost one. The ON CONFLICT clause
  -- stays as the race-safe backstop for two flushes landing at once.
  IF v_client_ref IS NOT NULL THEN
    SELECT p.id INTO v_id FROM public.community_posts p
    WHERE p.author_id = v_uid AND p.client_ref = v_client_ref;
    IF FOUND THEN
      RETURN jsonb_build_object('id', v_id);
    END IF;
  END IF;

  -- The rate check runs LAST, after every validation: a rejected post must
  -- not spend one of the day's three.
  --
  -- Lead ruling 2026-09-10 (B): an ambient item does NOT spend the manual
  -- post rail. One workout makes at most four items (a session plus up to
  -- three PR moments), so the manual rail's 3-a-day for an account under a
  -- week old made the feature unusable on a new member's first PR-heavy
  -- session. `post_auto` is its own action, 12 a day (three workouts at
  -- four items), flat for new and established accounts alike; the manual
  -- `post` rail is untouched, and neither can eat the other. The window is
  -- a real UK-local day rather than the helper's default rolling 24 hours:
  -- the interval passed is exactly "how long since UK-local midnight", so
  -- _community_rate_check counts only today's own items and the allowance
  -- resets at midnight the way a person expects it to.
  IF coalesce(_auto, false) THEN
    v_day_start := date_trunc('day', timezone('Europe/London', now())) AT TIME ZONE 'Europe/London';
    PERFORM public._community_rate_check(v_uid, 'post_auto', 12, 12, now() - v_day_start);
  ELSE
    PERFORM public._community_rate_check(v_uid, 'post', 3, 10);
  END IF;

  -- migrate_170 part B: idempotent on (author_id, client_ref) when a
  -- client_ref is supplied - a retried flush of the same pending ambient
  -- item returns the row that already exists rather than duplicating it
  -- (phase3 spec section 2). "DO UPDATE SET id = id" is a deliberate
  -- no-op: it exists only so ON CONFLICT has something to update, which is
  -- what makes RETURNING fire for the conflicting row; nothing about the
  -- existing row actually changes. xmax = 0 is the standard way to tell a
  -- fresh INSERT apart from an UPDATE that hit that no-op path.
  INSERT INTO public.community_posts (
    author_id, kind, payload, caption, programme_id, visibility, auto, client_ref)
  VALUES (
    v_uid, _kind, _payload, v_caption, _programme_id, v_vis,
    coalesce(_auto, false), v_client_ref)
  ON CONFLICT (author_id, client_ref) WHERE client_ref IS NOT NULL
  DO UPDATE SET id = community_posts.id
  RETURNING id, (xmax = 0) INTO v_id, v_inserted;

  -- Only a genuinely NEW row gets its group audience written; a conflict
  -- hit returns the row exactly as it already stood.
  IF v_inserted AND v_group_ids IS NOT NULL THEN
    FOREACH v_gid IN ARRAY v_group_ids LOOP
      INSERT INTO public.community_post_groups (post_id, group_id)
      VALUES (v_id, v_gid) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', v_id);
END $$;

REVOKE ALL ON FUNCTION public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[]) TO authenticated;

-- ─── B5: community_post_set_note (new) ───────────────────────────────────
--
-- phase3 spec section 2: "Add a note" on an auto item. Author only, the
-- SAME content check community_create_post applies to its own caption
-- (clean_text + 280 chars) - never _community_forbidden_keys, which
-- guards the payload jsonb tree, not a plain text field.

CREATE OR REPLACE FUNCTION public.community_post_set_note(_post_id uuid, _text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := public._community_caller();
  v_note text;
  v_r    public.community_posts%ROWTYPE;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  IF _post_id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;

  SELECT * INTO v_r FROM public.community_posts WHERE id = _post_id AND author_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  -- Lead ruling 2026-09-10 (B): a post moderation has hidden is not
  -- editable. not_allowed, not not_found: the author knows their own post
  -- exists, and a report/auto-hide is not something to edit around.
  IF v_r.status <> 'visible' THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;

  v_note := nullif(btrim(coalesce(_text, '')), '');
  IF v_note IS NOT NULL THEN
    v_note := public._community_clean_text(v_note);
    IF length(v_note) > 280 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  END IF;

  -- reviewer 2026-09-10 (B): 10/10, not 10/30. The contract states this
  -- rail as "10 per hour" flat, the same shape community_respect_all uses;
  -- an established account editing its own note thirty times an hour is
  -- not a case worth widening a rail for.
  PERFORM public._community_rate_check(v_uid, 'post_set_note', 10, 10, interval '1 hour');

  UPDATE public.community_posts SET caption = v_note, updated_at = now() WHERE id = _post_id;
  SELECT * INTO v_r FROM public.community_posts WHERE id = _post_id;

  RETURN public._community_post_json(v_r);
END $$;

REVOKE ALL ON FUNCTION public.community_post_set_note(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_post_set_note(uuid, text) TO authenticated;

-- ─── B6: _community_can_view_post re-issued (the 'groups' branch) ───────
--
-- The single shared "may I see THIS post?" gate every write and every read
-- that touches one post goes through (community_react, community_comment,
-- community_report, community_group_feed, the connect/share preview
-- paths). Re-issuing it here alone is what makes every one of those
-- callers groups-aware without touching any of them. Signature unchanged.

CREATE OR REPLACE FUNCTION public._community_can_view_post(_viewer uuid, _post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_posts r
    WHERE r.id = _post_id
      AND (
        r.author_id = _viewer
        OR (
          r.status = 'visible'
          AND public._community_can_view(_viewer, r.author_id)
          AND (
            r.visibility = 'public'
            -- reviewer 2026-09-10 (B): this follows arm used to carry NO
            -- visibility test at all, which was correct only while the set
            -- was {public, followers}. With 'groups' added it admitted every
            -- accepted FOLLOWER to a groups post they were not in the group
            -- for - through the one gate community_react, community_comment,
            -- community_report, community_list_comments, community_group_
            -- feed, the connect/share previews and community_respect_all all
            -- call. Scoped to 'followers', which is byte-identical in effect
            -- for the two old values and closes the leak for the new one.
            -- community_get_profile's programme OR-chain already spells it
            -- this way (gg.visibility = 'followers' AND EXISTS ...).
            OR (
              r.visibility = 'followers'
              AND EXISTS (
                SELECT 1 FROM public.community_follows f
                WHERE f.follower_id = _viewer AND f.followee_id = r.author_id
                  AND f.state = 'accepted')
            )
            -- migrate_170 part B (phase3 spec section 3): a 'groups' post is
            -- visible to a member of any group it names.
            OR (
              r.visibility = 'groups'
              AND EXISTS (
                SELECT 1 FROM public.community_post_groups pg
                JOIN public.community_group_members gm ON gm.group_id = pg.group_id
                WHERE pg.post_id = r.id AND gm.user_id = _viewer AND gm.state = 'member')
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public._community_can_view_post(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ─── B7: community_get_post re-issued (the 'groups' branch) ─────────────
--
-- Duplicates _community_can_view_post's check inline (pre-existing shape,
-- migrate_160) rather than calling it, so it gets the identical new branch
-- written out rather than delegated.

CREATE OR REPLACE FUNCTION public.community_get_post(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_r   public.community_posts%ROWTYPE;
BEGIN
  SELECT * INTO v_r FROM public.community_posts WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  IF v_r.author_id <> v_uid THEN
    IF v_r.status <> 'visible' THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
    IF NOT public._community_can_view(v_uid, v_r.author_id) THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
    IF v_r.visibility = 'followers'
       AND NOT EXISTS (
         SELECT 1 FROM public.community_follows f
         WHERE f.follower_id = v_uid AND f.followee_id = v_r.author_id
           AND f.state = 'accepted') THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
    -- migrate_170 part B: the 'groups' branch.
    IF v_r.visibility = 'groups'
       AND NOT EXISTS (
         SELECT 1 FROM public.community_post_groups pg
         JOIN public.community_group_members gm ON gm.group_id = pg.group_id
         WHERE pg.post_id = v_r.id AND gm.user_id = v_uid AND gm.state = 'member') THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'post',        public._community_post_json(v_r),
    'author',      public._community_profile_card(v_r.author_id, v_uid),
    'my_reaction', EXISTS (
      SELECT 1 FROM public.community_reactions r
      WHERE r.post_id = _id AND r.user_id = v_uid));
END $$;

REVOKE ALL ON FUNCTION public.community_get_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_get_post(uuid) TO authenticated;

-- ─── B8: community_feed re-issued (the 'groups' branch) ─────────────────
--
-- The Following feed never checked r.visibility at all before this: being
-- a follower already qualifies for both 'public' and 'followers' posts
-- from that author, so there was nothing to gate. 'groups' is the first
-- visibility value that does NOT reduce to "you follow them" - a follower
-- who is not in the named group must not see it here.

CREATE OR REPLACE FUNCTION public.community_feed(_cursor text DEFAULT NULL, _limit int DEFAULT 20)
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
  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  WITH page AS (
    SELECT r AS rec, r.created_at AS created_at, r.id AS id, r.author_id AS author_id
    FROM public.community_posts r
    WHERE r.status = 'visible'
      AND (
        r.author_id = v_uid
        OR EXISTS (
          SELECT 1 FROM public.community_follows f
          WHERE f.follower_id = v_uid AND f.followee_id = r.author_id
            AND f.state = 'accepted')
      )
      -- migrate_170 part B: the 'groups' branch. Everything else about this
      -- WHERE clause (the author-or-follows test above) is unchanged; this
      -- is an extra AND, never a replacement of it.
      AND (
        r.visibility <> 'groups'
        OR r.author_id = v_uid
        OR EXISTS (
          SELECT 1 FROM public.community_post_groups pg
          JOIN public.community_group_members gm ON gm.group_id = pg.group_id
          WHERE pg.post_id = r.id AND gm.user_id = v_uid AND gm.state = 'member')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes m
        WHERE m.muter_id = v_uid AND m.muted_id = r.author_id)
      AND NOT public._community_is_blocked(v_uid, r.author_id)
      -- SD-11: a suspended profile is invisible everywhere, including to
      -- the people who already followed it (lead review, 2026-09-06).
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

REVOKE ALL ON FUNCTION public.community_feed(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_feed(text, int) TO authenticated;

-- ─── B9: community_group_feed re-issued (audience names the group) ──────
--
-- Adds the audience-based inclusion phase3 spec section 3 names ("includes
-- posts whose audience names the group") alongside the EXISTING "posted by
-- a current member" inclusion (migrate_165, unchanged): an OR, never a
-- replacement, so a follower-visibility post by a group member still
-- appears here exactly as it always has. _community_can_view_post (B6)
-- already carries the 'groups' branch, so a groups-post reached through
-- either arm is still checked against the viewer's own membership before
-- it is ever returned.

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
      AND (
        -- reviewer 2026-09-10 (B): `r.visibility <> 'groups'` added to this
        -- pre-existing arm. Without it, a post addressed to group X by an
        -- author who also belongs to group Y appeared in group Y's feed
        -- whenever the viewer happened to be in X (which is all _community_
        -- can_view_post asks). A named audience means the groups it names,
        -- so a groups post now only ever reaches the feeds of those groups,
        -- through the second arm below.
        (r.visibility <> 'groups' AND EXISTS (
          SELECT 1 FROM public.community_group_members m
          WHERE m.group_id = _group_id AND m.user_id = r.author_id AND m.state = 'member'))
        -- migrate_170 part B (phase3 spec section 3).
        OR EXISTS (
          SELECT 1 FROM public.community_post_groups pg
          WHERE pg.post_id = r.id AND pg.group_id = _group_id)
      )
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

REVOKE ALL ON FUNCTION public.community_group_feed(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_feed(uuid, text, int) TO authenticated;

-- ─── B10: community_get_profile re-issued (the 'groups' branch) ─────────
--
-- The RPC that lists a profile's own posts (the profile page). Its inline
-- visibility OR-chain gets the same new branch every other reader above
-- carries; 'v_target = v_uid' already IS the "author always" case, since
-- the target being viewed is the caller's own profile.

CREATE OR REPLACE FUNCTION public.community_get_profile(
  _handle text DEFAULT NULL, _uid uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_target   uuid;
  v_viewable boolean;
  v_posts    jsonb := '[]'::jsonb;
  v_progs    jsonb := '[]'::jsonb;
BEGIN
  IF _uid IS NOT NULL THEN
    v_target := _uid;
  ELSIF _handle IS NOT NULL THEN
    SELECT user_id INTO v_target FROM public.community_profiles
    WHERE handle = lower(btrim(_handle));
  END IF;
  IF v_target IS NULL THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  -- A blocked person is not told they are blocked; the profile simply is not
  -- there (SD-11, two-way invisibility).
  IF public._community_is_blocked(v_uid, v_target) THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_profiles
    WHERE user_id = v_target AND (status <> 'suspended' OR user_id = v_uid)
  ) THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;

  v_viewable := public._community_can_view(v_uid, v_target);

  IF v_viewable THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'post',   public._community_post_json(r),
             'author', public._community_profile_card(r.author_id, v_uid),
             'my_reaction', EXISTS (
               SELECT 1 FROM public.community_reactions rr
               WHERE rr.post_id = r.id AND rr.user_id = v_uid))
           ORDER BY r.created_at DESC, r.id DESC), '[]'::jsonb)
    INTO v_posts
    FROM (
      SELECT * FROM public.community_posts p
      WHERE p.author_id = v_target AND p.status = 'visible'
        AND (p.visibility = 'public' OR v_target = v_uid
             -- reviewer 2026-09-10 (B): the follows arm carried no
             -- visibility test, so once 'groups' existed a plain FOLLOWER
             -- saw a groups post on the author's profile without being in
             -- any named group. Scoped to 'followers' - identical in effect
             -- for the two old values, and exactly the shape the programme
             -- OR-chain fifteen lines below already uses.
             OR (p.visibility = 'followers'
                 AND EXISTS (SELECT 1 FROM public.community_follows f
                             WHERE f.follower_id = v_uid AND f.followee_id = v_target
                               AND f.state = 'accepted'))
             -- migrate_170 part B: the 'groups' branch.
             OR (p.visibility = 'groups'
                 AND EXISTS (
                   SELECT 1 FROM public.community_post_groups pg
                   JOIN public.community_group_members gm ON gm.group_id = pg.group_id
                   WHERE pg.post_id = p.id AND gm.user_id = v_uid AND gm.state = 'member')))
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 20
    ) r;

    SELECT coalesce(jsonb_agg(public._community_programme_tile(g)
           ORDER BY g.updated_at DESC), '[]'::jsonb)
    INTO v_progs
    FROM (
      SELECT * FROM public.community_programmes gg
      WHERE gg.owner_id = v_target AND gg.status = 'visible'
        AND (gg.visibility = 'public' OR v_target = v_uid
             OR (gg.visibility = 'followers'
                 AND EXISTS (SELECT 1 FROM public.community_follows f
                             WHERE f.follower_id = v_uid AND f.followee_id = v_target
                               AND f.state = 'accepted')))
      ORDER BY gg.updated_at DESC
      LIMIT 50
    ) g;
  END IF;

  RETURN jsonb_build_object(
    'card',       public._community_profile_card(v_target, v_uid),
    'viewable',   v_viewable,
    'posts',      v_posts,
    'programmes', v_progs);
END $$;

REVOKE ALL ON FUNCTION public.community_get_profile(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_get_profile(text, uuid) TO authenticated;

-- ─── B11: community_group_get re-issued (Together this week) ────────────
--
-- Signature unchanged (_group_id uuid only): CREATE OR REPLACE only, never
-- the DROP-first dance B2/B4 above use for a real signature change. Body
-- identical to Part A2's version except for the additions marked
-- migrate_170 part B below. Blueprint section 4/phase3 spec section 4:
-- together_sessions_week and together_planned_week are both summed over
-- exactly the same member set sharing_members counts (active, non-minor,
-- share_consistency, not blocked from the viewer) - a member without a
-- plan (c_planned_per_week IS NULL) contributes nothing to the planned
-- sum, not zero, so a group with nobody planning does not read as "0 of 0
-- planned". Stripped alongside member_count/blurb for a non-member of an
-- invite-only group: these are the same "count-shaped" fact.

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

-- ─── B12: community_respect_all (new) ────────────────────────────────────
--
-- Blueprint section 5/phase3 spec section 5: "Respect everyone who trained
-- today" on a roster. The target of each Respect is a member's LATEST
-- auto=true, kind='session' post; "trained today" is read directly off
-- that post's own created_at (UK-local, the same to_char(timezone(
-- 'Europe/London', ...)) conversion Part A's day-key fallback uses)
-- because share_sessions is a toggle independent of share_consistency
-- (phase3 spec section 1) - c_last_trained_day is only ever populated
-- while share_consistency is on (community_update_training_profile,
-- migrate_165), so it is the wrong signal for whether an ambient item
-- exists today. "whose post is visible to the caller" is the single
-- shared _community_can_view_post gate (B6), applied uniformly regardless
-- of scope, rather than duplicating community_board's per-scope
-- _community_can_view arms: the unit Respect acts on is a POST, not a
-- roster row, and _community_can_view_post already implies
-- _community_can_view(v_uid, author) as one of its own preconditions.
-- Scopes are community_board's set minus 'everyone' (encouragement is
-- always a named roster, never a global blast).

CREATE OR REPLACE FUNCTION public.community_respect_all(
  _scope text, _scope_key text DEFAULT NULL, _today text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_me       public.community_profiles%ROWTYPE;
  v_today    text;
  v_gym_id   uuid;
  v_group_id uuid; -- reviewer 2026-09-10 (B)
  v_area_key text;
  v_given    int := 0;
  v_row      record;
BEGIN
  IF _scope NOT IN ('gym', 'area', 'style', 'discipline', 'age_band', 'group', 'following') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _scope IN ('style', 'discipline', 'group') AND (_scope_key IS NULL OR btrim(_scope_key) = '') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _scope = 'discipline' AND _scope_key IS NOT NULL
     AND NOT public._community_discipline_key_ok(ARRAY[_scope_key]) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- Same fallback shape as community_dimensions_me/community_hub_summary
  -- (lead ruling 1, part A): a NULL/absent _today falls back to the
  -- UK-local day key; a SUPPLIED value is still validated.
  v_today := nullif(btrim(coalesce(_today, '')), '');
  IF v_today IS NULL THEN
    v_today := to_char(timezone('Europe/London', now()), 'YYYY-MM-DD');
  ELSIF v_today !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_me := public._community_require_profile(v_uid, true);

  IF _scope = 'group' THEN
    -- reviewer 2026-09-10 (B): the cast is guarded, exactly as the gym
    -- scope's already was. A non-uuid _scope_key used to raise Postgres's
    -- own 22P02 here, which reaches the client as a raw invalid-input-
    -- syntax string instead of this file's own 'invalid_input' envelope.
    BEGIN
      v_group_id := _scope_key::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END;
    IF NOT EXISTS (
      SELECT 1 FROM public.community_group_members m
      WHERE m.group_id = v_group_id AND m.user_id = v_uid AND m.state = 'member'
    ) THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
  END IF;

  IF _scope = 'age_band' AND v_me.tp_age_band IS NULL THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

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

  IF _scope = 'area' THEN
    IF _scope_key IS NOT NULL AND btrim(_scope_key) <> '' THEN
      v_area_key := _scope_key;
    ELSE
      v_area_key := v_me.area_key;
    END IF;
  END IF;

  -- reviewer 2026-09-10 (B): the rail runs LAST, after every validation -
  -- this file's own stated convention ("a rejected post must not spend one
  -- of the day's three", community_create_post). It used to sit above the
  -- group-membership, age-band and gym-key checks, so a refused call still
  -- spent one of the ten an hour and a client looping on a not_allowed
  -- locked the caller out of the button for an hour.
  PERFORM public._community_rate_check(v_uid, 'respect_all', 10, 10, interval '1 hour');

  -- One reaction per eligible member's latest today-dated auto session
  -- post, exactly community_react's own INSERT ... ON CONFLICT DO NOTHING,
  -- looped so v_given only counts genuinely NEW reactions (idempotent per
  -- post: calling this twice the same day never double-gives or
  -- double-notifies). LIMIT 500 on the candidate scan is a defensive
  -- bound, the same shape community_find_people's 1000-row scan cap has.
  FOR v_row IN
    WITH scope_members AS (
      SELECT p.user_id
      FROM public.community_profiles p
      WHERE p.status = 'active' AND p.is_minor = false
        AND p.user_id <> v_uid
        AND p.share_sessions = true
        AND NOT public._community_is_blocked(v_uid, p.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.community_mutes mu
          WHERE mu.muter_id = v_uid AND mu.muted_id = p.user_id)
        AND (
             (_scope = 'gym' AND v_gym_id IS NOT NULL AND (
                p.gym_id = v_gym_id OR v_gym_id = ANY (coalesce(p.other_gym_ids, ARRAY[]::uuid[]))))
          OR (_scope = 'area' AND v_area_key IS NOT NULL AND p.area_key = v_area_key)
          OR (_scope = 'style' AND _scope_key = ANY (p.styles))
          OR (_scope = 'discipline' AND _scope_key = ANY (p.discipline_keys))
          OR (_scope = 'age_band' AND v_me.tp_age_band IS NOT NULL AND p.tp_age_band = v_me.tp_age_band)
          OR (_scope = 'group' AND EXISTS (
                SELECT 1 FROM public.community_group_members gm
                WHERE gm.group_id = v_group_id AND gm.user_id = p.user_id AND gm.state = 'member'))
          OR (_scope = 'following' AND EXISTS (
                SELECT 1 FROM public.community_follows f
                WHERE f.follower_id = v_uid AND f.followee_id = p.user_id AND f.state = 'accepted'))
        )
      LIMIT 500
    ),
    latest_post AS (
      SELECT DISTINCT ON (r.author_id) r.id, r.author_id, r.created_at
      FROM public.community_posts r
      JOIN scope_members sm ON sm.user_id = r.author_id
      WHERE r.auto = true AND r.kind = 'session' AND r.status = 'visible'
      ORDER BY r.author_id, r.created_at DESC
    )
    SELECT lp.id AS post_id, lp.author_id
    FROM latest_post lp
    WHERE to_char(timezone('Europe/London', lp.created_at), 'YYYY-MM-DD') = v_today
      AND public._community_can_view_post(v_uid, lp.id)
  LOOP
    INSERT INTO public.community_reactions (post_id, user_id)
    VALUES (v_row.post_id, v_uid) ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_given := v_given + 1;
      PERFORM public._community_add_activity(v_row.author_id, v_uid, 'reaction', 'post', v_row.post_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('given', v_given);
END $$;

REVOKE ALL ON FUNCTION public.community_respect_all(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_respect_all(text, text, text) TO authenticated;

-- ─── B13: _community_connect_reasons_list re-issued (same_discipline) ───
--
-- Blueprint section 7/phase3 spec section 7: same_programme retired,
-- same_discipline added in the same position - the SQL helper and the
-- client CONNECT_REASONS constant move together (contract doc, Part B).
-- Signature unchanged: plain CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public._community_connect_reasons_list()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ARRAY['same_gym', 'same_discipline', 'train_like_me', 'train_together']::text[];
$$;

REVOKE ALL ON FUNCTION public._community_connect_reasons_list() FROM PUBLIC, anon, authenticated;

-- ─── B14: community_notify_daily (new table, digest collapse) ───────────
--
-- Blueprint section 5/phase3 spec section 6: the per-recipient daily tally
-- backing the community-notify edge function's reaction-push collapse
-- (supabase/functions/community-notify/index.ts, not SQL - that function
-- runs with the service role, which bypasses RLS and grants entirely, so
-- "no grants" here is belt and braces exactly like community_rate_events).
-- RLS on, no grants, RPC-only posture; no RPC in this file writes it, only
-- the edge function's service-role client does.

--
-- reviewer 2026-09-10 (B): RETENTION. One row per recipient per day they
-- were pushed at is unbounded growth with nothing anywhere pruning it. The
-- rule is 7 days: the edge function deletes that recipient's rows older
-- than 7 days at the moment it claims the day's first push, which is the
-- same opportunistic, per-user, no-cron-job prune _community_rate_check
-- already does for community_rate_events. Nothing reads a row older than
-- today, so 7 days is pure slack for a clock or a timezone edge.
CREATE TABLE IF NOT EXISTS public.community_notify_daily (
  recipient uuid NOT NULL,
  day       text NOT NULL,
  count     int NOT NULL DEFAULT 0,
  PRIMARY KEY (recipient, day)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['community_notify_daily'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- ─── B15: delete_user_data re-issued (community_post_groups, community_notify_daily) ─
--
-- Body identical to migrate_165's version (the latest before this file)
-- except for the two additions marked migrate_170 part B below.
-- community_post_groups is also cascade-cleaned via its post_id foreign
-- key when the caller's own posts are deleted a few lines down, but this
-- migration family names every table explicitly rather than leaning on a
-- cascade alone (community_reactions/community_comments below do the
-- same, even though some of their own rows would also cascade) - the GDPR
-- note in this file's header: "a table added to the schema and forgotten
-- there is a GDPR defect that nothing else in the repo would catch".
-- community_notify_daily is named for the same reason even though task 6
-- itself only asked for its RLS/grants: it is a new per-user table, and
-- leaving it out of erasure while naming community_post_groups would be
-- the exact inconsistency this function exists to prevent.

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
  -- migrate_170 part B: the daily push-collapse tally is per-recipient.
  BEGIN DELETE FROM community_notify_daily WHERE recipient = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
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
  -- migrate_170 part B: named explicitly (belt and braces alongside the
  -- post_id FK cascade below - see this part's own header note).
  BEGIN
    DELETE FROM community_post_groups
    WHERE post_id IN (SELECT id FROM community_posts WHERE author_id = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
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

-- ─── Part B acceptance check (read-only) ─────────────────────────────────

DO $$
DECLARE
  v_ok  boolean;
  v_src text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'community_profiles'
      AND column_name IN ('share_sessions', 'sessions_audience', 'c_planned_per_week')
    HAVING count(*) = 3
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_profiles sharing columns missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'community_posts'
      AND column_name IN ('auto', 'client_ref')
    HAVING count(*) = 2
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_posts auto/client_ref columns missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'community_post_groups'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_post_groups table missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'community_notify_daily'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_notify_daily table missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
      AND indexname = 'community_posts_author_client_ref_idx'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_posts_author_client_ref_idx missing';
  END IF;

  IF to_regprocedure('public.community_upsert_profile(jsonb, boolean)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile(jsonb, boolean) missing (new signature not created)';
  END IF;
  IF to_regprocedure('public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_create_post with auto/client_ref/_group_ids missing (new signature not created)';
  END IF;
  -- reviewer 2026-09-10 (B): the two checks above only ever proved the NEW
  -- signature exists, while their own message claimed to catch "old
  -- signature not dropped". A surviving old overload is the actual danger
  -- (PostgREST resolves by the argument names a client sends, so a stale
  -- 1-arg community_upsert_profile would keep answering and silently skip
  -- every part B field), so prove it is gone.
  IF to_regprocedure('public.community_upsert_profile(jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'acceptance failed: the old community_upsert_profile(jsonb) overload still exists';
  END IF;
  IF to_regprocedure('public.community_create_post(text, jsonb, text, uuid, text)') IS NOT NULL THEN
    RAISE EXCEPTION 'acceptance failed: the old community_create_post 5-arg overload still exists';
  END IF;
  IF to_regprocedure('public.community_post_set_note(uuid, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_post_set_note missing';
  END IF;
  IF to_regprocedure('public.community_respect_all(text, text, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_respect_all missing';
  END IF;

  -- migrate_167's lesson: anything that calls _community_rate_check must
  -- never be STABLE/IMMUTABLE, or PostgREST forces a read-only transaction
  -- and the rate check's own write fails every time. Checked one at a time
  -- (Part A's own established shape), not a loop over a scalar.
  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.community_upsert_profile(jsonb, boolean)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile is not VOLATILE';
  END IF;

  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure(
    'public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_create_post is not VOLATILE';
  END IF;

  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.community_post_set_note(uuid, text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_post_set_note is not VOLATILE';
  END IF;

  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.community_respect_all(text, text, text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_respect_all is not VOLATILE';
  END IF;

  -- Every function this part touches or adds stays SECURITY DEFINER with
  -- the pinned search_path.
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'community_upsert_profile', 'community_create_post', 'community_post_set_note',
        '_community_can_view_post', 'community_get_post', 'community_feed',
        'community_group_feed', 'community_get_profile', 'community_group_get',
        'community_respect_all', '_community_connect_reasons_list', 'delete_user_data')
      AND (NOT p.prosecdef OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
      -- delete_user_data pins only `public` (matching migrate_165's own
      -- shape, unchanged by this part), never `public, pg_temp`.
      AND p.proname <> 'delete_user_data'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a part B function is missing SECURITY DEFINER or its pinned search_path';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.delete_user_data()')
      AND p.prosecdef AND 'search_path=public' = ANY (p.proconfig)
  ) THEN
    RAISE EXCEPTION 'acceptance failed: delete_user_data is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  -- _community_can_view_post and _community_connect_reasons_list are
  -- helpers: never reachable by authenticated.
  IF has_function_privilege('authenticated', 'public._community_can_view_post(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._community_connect_reasons_list()', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a part B helper is executable by authenticated';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.community_respect_all(text, text, text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.community_post_set_note(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a part B public RPC is not executable by authenticated';
  END IF;

  -- Every table this part adds has RLS on and no grant to anon/authenticated.
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('community_post_groups', 'community_notify_daily')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a part B table does not have RLS enabled';
  END IF;
  -- reviewer 2026-09-10 (B): INSERT/UPDATE/DELETE checked too, not SELECT
  -- alone. A write grant on either table is worse than a read one - a
  -- direct INSERT into community_post_groups would hand any account the
  -- power to add its own group to somebody else's post's audience.
  IF has_table_privilege('authenticated', 'public.community_post_groups', 'SELECT, INSERT, UPDATE, DELETE')
     OR has_table_privilege('anon', 'public.community_post_groups', 'SELECT, INSERT, UPDATE, DELETE')
     OR has_table_privilege('authenticated', 'public.community_notify_daily', 'SELECT, INSERT, UPDATE, DELETE')
     OR has_table_privilege('anon', 'public.community_notify_daily', 'SELECT, INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'acceptance failed: a part B table has a grant reaching anon or authenticated';
  END IF;

  -- delete_user_data names both new tables (the GDPR erasure completeness
  -- this suite exists to catch, per this file's own header note).
  SELECT pg_get_functiondef(oid) INTO v_src
  FROM pg_proc WHERE proname = 'delete_user_data' AND pronamespace = 'public'::regnamespace;
  IF v_src NOT ILIKE '%community_post_groups%' THEN
    RAISE EXCEPTION 'acceptance failed: delete_user_data does not name community_post_groups';
  END IF;
  IF v_src NOT ILIKE '%community_notify_daily%' THEN
    RAISE EXCEPTION 'acceptance failed: delete_user_data does not name community_notify_daily';
  END IF;

  -- The visibility CHECK now allows 'groups'.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_visibility_check'
      AND conrelid = 'public.community_posts'::regclass
      AND pg_get_constraintdef(oid) ILIKE '%groups%'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_posts_visibility_check does not allow groups';
  END IF;

  -- The sessions_audience CHECK exists and names all three values.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_profiles_sessions_audience_check'
      AND conrelid = 'public.community_profiles'::regclass
      AND pg_get_constraintdef(oid) ILIKE '%followers%'
      AND pg_get_constraintdef(oid) ILIKE '%groups%'
      AND pg_get_constraintdef(oid) ILIKE '%everyone%'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_profiles_sessions_audience_check missing or incomplete';
  END IF;

  RAISE NOTICE 'migrate_170 part B acceptance: OK';
END $$;
