-- migrate_162_gym_directory.sql
--
-- Purpose:           The UK gym master database (founder brief 2026-09-06,
--                    authority docs/gym-database-2026-09-06/
--                    20-BLUEPRINT.md, rulings GD-01 to GD-17). Ships the
--                    directory as its own infrastructure under Community
--                    (GD-01), not a profile field:
--
--                      * seven new tables: `gym_brands`, `gym_venues`,
--                        `gym_venue_sources`, `gym_venue_history`,
--                        `gym_submissions`, `gym_reports`,
--                        `gym_postcode_sectors` -- exactly the Data model
--                        section of the blueprint, no more, no fewer columns;
--                      * two additive `community_profiles` columns
--                        (`gym_id`, `other_gym_ids`) plus a trigger that
--                        derives `gym_key`/`gym_label` from `gym_id` the
--                        moment it is set (GD-14), so every existing reader
--                        that already keys off `gym_key` (Find people 'gym'
--                        mode, the profile card) needs no change at all;
--                      * eleven new SECURITY DEFINER RPCs: five reads
--                        (`gyms_search`, `gyms_near`, `gyms_in_place`,
--                        `gyms_get`, `gyms_suggest`), three write-throughs
--                        (`gyms_submit`, `gyms_confirm_submission`,
--                        `gyms_report`), two moderator actions
--                        (`gyms_review_submission`, `gyms_review_report`)
--                        and one Community-side setter
--                        (`community_set_gyms`);
--                      * `community_gym_summary` and `community_gym_suggest`
--                        (both declared in migrate_161_community_
--                        connections.sql) are RE-ISSUED here, CREATE OR
--                        REPLACE, so a `gym:<uuid>` key resolves its label
--                        and venue fields from `gym_venues` while the old
--                        `<area fold>:<gym fold>` free-text key keeps its
--                        original path untouched (GD-14). This file does
--                        NOT edit migrate_161_community_connections.sql --
--                        exactly the same "latest definition wins" pattern
--                        161 itself used to extend 160 without editing it;
--                      * Review 35 fix lane (2026-09-07): three more
--                        migrate_161 functions are RE-ISSUED here for the
--                        same reason, each with the review's own fix and
--                        nothing else changed from its 161 body:
--                        `community_upsert_profile` (finding 2 -- a
--                        picker-derived `gym_label`/`gym_key` is never
--                        re-validated or re-derived once `gym_id` is set,
--                        so the trigger is the sole owner of both, same
--                        seam as finding 5), `_community_profile_card`
--                        (lead addition (a) -- carries `gym_id` alongside
--                        `gym_label` under the same visibility gate, and
--                        `other_gym_ids` for the self view only) and
--                        `community_find_people` (lead addition (b) --
--                        'gym' mode also matches a person whose
--                        `other_gym_ids` contains the viewer's `gym_id`,
--                        reason "Also trains at your gym", score 2, the
--                        primary match staying 3);
--                      * `delete_user_data()` is re-issued IN FULL a third
--                        time (160 defined it, 161 re-issued it in full,
--                        this file does too) so a deleted account's
--                        `gym_submissions.submitter_id`,
--                        `gym_submissions.reviewed_by` (review 35 finding 8)
--                        and `gym_reports.reporter_id` are anonymised the
--                        same way `community_reports.reporter_id` already is.
--
--                    RLS shape (GD data model header): `gym_brands`,
--                    `gym_venues` and `gym_postcode_sectors` are
--                    `global_read_only` -- RLS enabled, exactly ONE SELECT
--                    policy granting `authenticated` read, no write policy
--                    at all, the same disposition `exercises` and `foods`
--                    already carry. `gym_venue_sources`, `gym_venue_
--                    history`, `gym_submissions` and `gym_reports` are
--                    `rpc_only` -- RLS enabled, NO policy, ALL privileges
--                    revoked from anon and authenticated, exactly the
--                    community_* shape (SD-14): the RPCs below are the only
--                    ingress and egress. Every RPC is SECURITY DEFINER,
--                    `search_path = public, pg_temp`, derives its caller
--                    from `_community_caller()` (auth.uid() under the
--                    hood), is revoked from PUBLIC and anon and granted to
--                    `authenticated` only; the `_gyms_*` and `_community_
--                    gym_key_sync` helpers beneath them are granted to
--                    nobody.
--
--                    Error codes: the `gyms_*` RPCs (routed through
--                    `callGyms`) raise exactly the codes
--                    `src/lib/gyms/transport.js` GYM_ERROR_CODES already
--                    declares -- `invalid`, `invalid_postcode` (a
--                    postcode-shaped failure specifically, so
--                    CommunityGymAddScreen can say "check the postcode"),
--                    `not_found`, `rate_limited` (from the reused
--                    `_community_rate_check`) and `not_signed_in` (from
--                    the reused `_community_caller()`) -- discovered as
--                    the authoritative client contract already committed
--                    to this tree and matched exactly rather than
--                    inventing a second vocabulary. `not_allowed`
--                    (gyms_confirm_submission's own-submission refusal;
--                    both moderator RPCs' non-moderator refusal) and
--                    `already_confirmed` are also raised but are not yet
--                    in that client list -- there is no consuming screen
--                    for confirm/moderate yet, so they fall back to the
--                    client's generic `unavailable` toast today; add them
--                    to GYM_ERROR_CODES when that screen is built.
--                    `community_set_gyms` is routed through Community's
--                    OWN transport (`callCommunity`, the same as
--                    `community_gym_summary`/`community_gym_suggest`), so
--                    it raises Community's `invalid_input` convention
--                    instead, exactly like every other community_* RPC.
--
--                    Push:  none from the app. `gyms_submit`, `gyms_
--                           confirm_submission`, `gyms_report`,
--                           `community_set_gyms` and the two moderator RPCs
--                           are online-first writes, exactly like every
--                           other Community mutation (SD-13): no local
--                           SQLite table, no sync registry entry, no
--                           watermark.
--                    Pull:  none, for the same reason. The directory reads
--                           (`gyms_search`/`gyms_near`/`gyms_in_place`/
--                           `gyms_get`/`gyms_suggest`) are re-run on demand
--                           from the picker and the gym dimension page.
--
-- Applied locally:   N/A -- no local SQLite table. Nothing in
--                    `src/lib/database.js` changes; `PRAGMA user_version`
--                    is untouched.
--
-- Applied remotely:  NO -- WRITTEN, NOT APPLIED. This file waits for the
--                    founder's exact phrase "run against production" for
--                    the batch that contains it (supabase/README.md status
--                    block, CLAUDE.md section 2 "Database schema"). It
--                    depends on migrate_160_community.sql and migrate_161_
--                    community_connections.sql (it re-issues two of 161's
--                    functions and adds columns 160 already created on
--                    `community_profiles`): 162 must never run before 161,
--                    which must never run before 160.
--
--                    SEEDING (blueprint "Pipeline" and "Seed loading
--                    convention" sections): this migration ships the SCHEMA
--                    ONLY. It contains no venue rows. `scripts/gyms/seed-
--                    sql.mjs` generates `supabase/seed_gyms_v1.sql`
--                    (`INSERT ... ON CONFLICT (id) DO UPDATE`, so it is
--                    itself idempotent and re-runnable), and THAT file is
--                    the one gated on the founder's phrase for its own
--                    batch, separately from this one landing the schema.
--
-- Safe to re-run:    YES. CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT
--                    EXISTS, CREATE INDEX IF NOT EXISTS, every named CHECK
--                    added inside a `do $$ ... exception when
--                    duplicate_object then null; end $$;` block, CREATE OR
--                    REPLACE FUNCTION throughout, DROP TRIGGER IF EXISTS
--                    before the one CREATE TRIGGER, and DROP POLICY IF
--                    EXISTS before every CREATE POLICY. Re-running changes
--                    nothing.
--
-- Rollback:          drop table if exists public.gym_reports,
--                      public.gym_submissions, public.gym_venue_history,
--                      public.gym_venue_sources, public.gym_venues,
--                      public.gym_brands, public.gym_postcode_sectors cascade;
--                    alter table public.community_profiles
--                      drop column if exists gym_id, other_gym_ids;
--                    drop function if exists every public.gyms_* and
--                      public._gyms_* function created below, plus
--                      public._community_gym_key_sync and its trigger
--                      community_profiles_gym_key_sync;
--                    re-apply migrate_161_community_connections.sql to
--                      restore community_gym_summary, community_gym_suggest
--                      and delete_user_data() to their 161 bodies (CREATE OR
--                      REPLACE means the LATEST definition wins until a
--                      later file replaces it again -- there is no automatic
--                      revert).
--                    Nothing existing is dropped or rewritten by this file
--                    other than those three function bodies, so a rollback
--                    loses only the directory, the gym picker link and the
--                    gym-erasure lines in delete_user_data().
--
-- GDPR note:         The venue catalogue itself (gym_brands, gym_venues,
--                    gym_venue_sources, gym_venue_history, gym_postcode_
--                    sectors) is business/public-register data, not
--                    personal data, and reaches this database only via the
--                    pipeline or a user's own submission -- never Google
--                    (GD-02: "Runtime only: Google, never stored"). The two
--                    personal-data columns this file introduces are
--                    `gym_submissions.submitter_id` (Article 6(1)(a): the
--                    person chose to submit a gym, exactly the same consent
--                    shape as a Community post) and `gym_reports.
--                    reporter_id` (Article 6(1)(f): a legitimate-interest
--                    safety/accuracy record, the same basis
--                    `community_reports.reporter_id` already has).
--                    `community_profiles.gym_id`/`other_gym_ids` are the
--                    SAME chosen fact the free-text `gym_label` already was
--                    (GD-13): no inference, no check-ins, no session-to-
--                    venue association anywhere in this file. Erasure:
--                    `delete_user_data()` is re-issued below to NULL
--                    `submitter_id`, `reviewed_by` (review 35 finding 8 --
--                    a moderator's id, missed in the first draft) and
--                    `reporter_id` for the deleted user (the submission/
--                    report content itself survives, the same posture
--                    `community_reports.reporter_id` already has) --
--                    `community_profiles.gym_id`/`other_gym_ids` need no
--                    separate handling because the whole profile row is
--                    deleted by the existing Community block above it. It
--                    carries NO Article 9 health data: nothing in this file
--                    reads bodyweight, body composition, Progress Scan,
--                    nutrition, injuries, coaching output or check-ins.
--
--                    Retention (review 35 finding 20): `gym_venue_history`
--                    is kept for the life of the venue -- GD-07 "nothing is
--                    deleted" -- and is never pruned on a schedule the way
--                    `community_rate_events` is; its `actor` and any
--                    `confirmer` id inside `after` are anonymised to
--                    `'deleted'` on the acting user's own erasure (this
--                    file's `delete_user_data()`, Part 10), so the row
--                    survives as an anonymous fact about the venue rather
--                    than a personal-data record about the person who
--                    caused it.
--
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.

-- ─── Part 1: the seven directory tables ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gym_brands (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text UNIQUE NOT NULL,
  name         text NOT NULL,
  aliases      text[] NOT NULL DEFAULT '{}',
  wikidata_qid text,
  website      text,
  kind         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_brands_key_idx ON public.gym_brands (key);

-- `venue_type` is GD-03's closed classification; `status` is GD-07's closed
-- history state. Both CHECKs are added in a duplicate_object-tolerant block
-- because the table itself is CREATE TABLE IF NOT EXISTS, so a re-run must
-- tolerate the constraint already existing.
CREATE TABLE IF NOT EXISTS public.gym_venues (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name         text NOT NULL,
  name                 text NOT NULL,
  brand_id             uuid REFERENCES public.gym_brands(id) ON DELETE SET NULL,
  venue_type           text NOT NULL DEFAULT 'independent_gym',
  status               text NOT NULL DEFAULT 'pending',
  address_line         text,
  town                 text,
  town_key             text,
  local_authority_code text,
  local_authority_name text,
  region_code          text,
  region_name          text,
  country              text,
  postcode             text,
  outward              text,
  sector               text,
  lat                  double precision,
  lng                  double precision,
  coord_source         text,
  geocell              text,
  website              text,
  phone                text,
  facility_count       int NOT NULL DEFAULT 1,
  parent_venue_id      uuid REFERENCES public.gym_venues(id) ON DELETE SET NULL,
  succeeded_by         uuid REFERENCES public.gym_venues(id) ON DELETE SET NULL,
  verification_status  text NOT NULL DEFAULT 'unverified',
  source_count         int NOT NULL DEFAULT 0,
  tokens               text[] NOT NULL DEFAULT '{}',
  -- GD-12: two distinct reports of the same kind flag the row for review.
  -- Additive column, not in the blueprint's own list of gym_venues fields,
  -- but GD-12 explicitly asks for it ("add a boolean column").
  needs_review         boolean NOT NULL DEFAULT false,
  first_seen           timestamptz NOT NULL DEFAULT now(),
  last_verified        timestamptz,
  closed_at            timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.gym_venues
    ADD CONSTRAINT gym_venues_status_check
    CHECK (status IN ('open', 'closed', 'merged', 'pending'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.gym_venues
    ADD CONSTRAINT gym_venues_venue_type_check
    CHECK (venue_type IN (
      'commercial_gym', 'independent_gym', 'health_club', 'leisure_centre',
      'strength_gym', 'crossfit_functional', 'womens_gym', 'boutique_studio',
      'university_gym', 'hotel_gym', 'martial_arts', 'other_fitness', 'excluded'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS gym_venues_lat_lng_idx    ON public.gym_venues (lat, lng);
CREATE INDEX IF NOT EXISTS gym_venues_geocell_idx    ON public.gym_venues (geocell);
CREATE INDEX IF NOT EXISTS gym_venues_outward_idx    ON public.gym_venues (outward);
CREATE INDEX IF NOT EXISTS gym_venues_town_key_idx   ON public.gym_venues (town_key);
CREATE INDEX IF NOT EXISTS gym_venues_tokens_gin_idx ON public.gym_venues USING GIN (tokens);
CREATE INDEX IF NOT EXISTS gym_venues_brand_id_idx   ON public.gym_venues (brand_id);

CREATE TABLE IF NOT EXISTS public.gym_venue_sources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          uuid NOT NULL REFERENCES public.gym_venues(id) ON DELETE CASCADE,
  source            text NOT NULL,
  source_record_id  text,
  source_url        text,
  source_name       text,
  source_status     text,
  source_updated_at timestamptz,
  retrieved_at      timestamptz NOT NULL DEFAULT now(),
  payload           jsonb
);

CREATE INDEX IF NOT EXISTS gym_venue_sources_venue_idx ON public.gym_venue_sources (venue_id);

CREATE TABLE IF NOT EXISTS public.gym_venue_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   uuid NOT NULL REFERENCES public.gym_venues(id) ON DELETE CASCADE,
  change     text NOT NULL,
  before     jsonb,
  after      jsonb,
  actor      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_venue_history_venue_idx
  ON public.gym_venue_history (venue_id, created_at DESC);

-- DESIGN NOTE (not a blueprint column, a shared-key decision): the blueprint
-- lists no `venue_id` column on gym_submissions, only `duplicate_of` (which
-- points at an EXISTING venue when the submission turns out to be one). A
-- brand new submission still needs a way for `gyms_confirm_submission` and
-- the moderator RPC to find the pending venue it created, so `gyms_submit`
-- generates ONE uuid and uses it as the primary key of BOTH the new
-- gym_venues row and this gym_submissions row in the same transaction. This
-- adds no column beyond the blueprint's list and is read back throughout
-- this file as "gym_submissions.id = gym_venues.id for a user-submitted
-- venue".
CREATE TABLE IF NOT EXISTS public.gym_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id  uuid,
  name          text NOT NULL,
  address_line  text NOT NULL,
  town          text NOT NULL,
  postcode      text NOT NULL,
  website       text,
  operator      text,
  lat           double precision,
  lng           double precision,
  status        text NOT NULL DEFAULT 'pending',
  duplicate_of  uuid REFERENCES public.gym_venues(id) ON DELETE SET NULL,
  confirmations int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid
);

DO $$ BEGIN
  ALTER TABLE public.gym_submissions
    ADD CONSTRAINT gym_submissions_status_check
    CHECK (status IN ('pending', 'verified', 'rejected', 'merged', 'duplicate'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS gym_submissions_submitter_idx
  ON public.gym_submissions (submitter_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gym_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid NOT NULL REFERENCES public.gym_venues(id) ON DELETE CASCADE,
  reporter_id uuid,
  kind        text NOT NULL,
  detail      text,
  status      text NOT NULL DEFAULT 'open',
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

DO $$ BEGIN
  ALTER TABLE public.gym_reports
    ADD CONSTRAINT gym_reports_kind_check
    CHECK (kind IN ('closed', 'wrong_name', 'wrong_location', 'duplicate_of',
                    'not_a_gym', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.gym_reports
    ADD CONSTRAINT gym_reports_status_check
    CHECK (status IN ('open', 'resolved', 'dismissed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS gym_reports_venue_idx ON public.gym_reports (venue_id, kind, status);

CREATE TABLE IF NOT EXISTS public.gym_postcode_sectors (
  sector               text PRIMARY KEY,
  lat                  double precision NOT NULL,
  lng                  double precision NOT NULL,
  count                int NOT NULL DEFAULT 0,
  country              text,
  region_code          text,
  local_authority_code text
);

-- ─── Part 2: RLS on every table; grants exactly per disposition ─────────
--
-- `gym_brands`, `gym_venues` and `gym_postcode_sectors` are catalogue data
-- (the same shape as `exercises`/`foods`): RLS enabled, ALL privileges
-- revoked first (clears any legacy blanket grant), then SELECT alone
-- re-granted to `authenticated` and backed by one SELECT policy. No role
-- ever gets INSERT/UPDATE/DELETE on these three: they are written only by
-- the pipeline's seed file and by the SECURITY DEFINER RPCs below (which run
-- as the function owner, not as `authenticated`).

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gym_brands', 'gym_venues', 'gym_postcode_sectors'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      'authenticated can read ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'authenticated can read ' || t, t);
  END LOOP;
END $$;

-- `gym_venue_sources`, `gym_venue_history`, `gym_submissions` and
-- `gym_reports` are `rpc_only`, the same shape as every community_* table
-- (SD-14): RLS enabled, NO policy, ALL privileges revoked from anon and
-- authenticated, so there is no PostgREST ingress or egress at all. The
-- RPCs below are the only way in or out.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gym_venue_sources', 'gym_venue_history', 'gym_submissions', 'gym_reports'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- ─── Part 3: community_profiles gains the picker's write path ───────────
--
-- Additive and defaulted: an existing profile converges with gym_id NULL
-- (its free-text gym_key/gym_label from migrate_160/161 is untouched) and
-- other_gym_ids as an empty array.

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gym_venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS other_gym_ids uuid[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  ALTER TABLE public.community_profiles
    ADD CONSTRAINT community_profiles_other_gym_ids_check
    CHECK (array_length(other_gym_ids, 1) IS NULL OR array_length(other_gym_ids, 1) <= 3);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS community_profiles_gym_id_idx
  ON public.community_profiles (gym_id) WHERE gym_id IS NOT NULL;

-- ─── Part 4: internal helpers (`_gyms_*`, revoked from authenticated) ────
--
-- Folding reuses `_community_fold` (migrate_160) rather than a duplicate
-- `_gyms_fold` wrapper: one fold table, one place it can drift from the
-- client's foldText().

CREATE OR REPLACE FUNCTION public._gyms_postcode_compact(_pc text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT upper(regexp_replace(coalesce(_pc, ''), '\s+', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public._gyms_postcode_full_valid(_pc text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public._gyms_postcode_compact(_pc) ~ '^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$';
$$;

CREATE OR REPLACE FUNCTION public._gyms_postcode_outward_valid(_pc text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public._gyms_postcode_compact(_pc) ~ '^[A-Z]{1,2}[0-9][A-Z0-9]?$';
$$;

CREATE OR REPLACE FUNCTION public._gyms_outward_of(_pc text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN public._gyms_postcode_full_valid(_pc)
    THEN substring(public._gyms_postcode_compact(_pc) FROM '^([A-Z]{1,2}[0-9][A-Z0-9]?)[0-9][A-Z]{2}$')
    WHEN public._gyms_postcode_outward_valid(_pc)
    THEN public._gyms_postcode_compact(_pc)
    ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public._gyms_sector_of(_pc text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- "L40 8" shape: outward, a space, then the inward code's leading digit.
  SELECT CASE WHEN public._gyms_postcode_full_valid(_pc)
    THEN public._gyms_outward_of(_pc) || ' ' ||
         substring(public._gyms_postcode_compact(_pc) FROM '^[A-Z]{1,2}[0-9][A-Z0-9]?([0-9])[A-Z]{2}$')
    ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public._gyms_distance_m(
  _lat1 double precision, _lng1 double precision,
  _lat2 double precision, _lng2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- Haversine, metres, mean earth radius 6,371,000 m.
  SELECT CASE WHEN _lat1 IS NULL OR _lng1 IS NULL OR _lat2 IS NULL OR _lng2 IS NULL THEN NULL
    ELSE 6371000 * 2 * asin(sqrt(
      sin(radians((_lat2 - _lat1) / 2)) ^ 2 +
      cos(radians(_lat1)) * cos(radians(_lat2)) * sin(radians((_lng2 - _lng1) / 2)) ^ 2
    ))
  END;
$$;

CREATE OR REPLACE FUNCTION public._gyms_bbox_lat_delta(_radius_m double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _radius_m / 111320.0;
$$;

CREATE OR REPLACE FUNCTION public._gyms_bbox_lng_delta(_lat double precision, _radius_m double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _radius_m / (111320.0 * greatest(cos(radians(coalesce(_lat, 0))), 0.01));
$$;

CREATE OR REPLACE FUNCTION public._gyms_geocell(_lat double precision, _lng double precision)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- GD-06's ~250 m blocking grid: 0.00225 degrees of latitude is
  -- approximately 250 m, matched to the pipeline's dedupe.mjs convention.
  SELECT CASE WHEN _lat IS NULL OR _lng IS NULL THEN NULL
    ELSE floor(_lat / 0.00225)::text || '_' || floor(_lng / 0.00225)::text
  END;
$$;

CREATE OR REPLACE FUNCTION public._gyms_tokens_of(_name text, _town text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(array_agg(DISTINCT t) FILTER (WHERE t <> ''), ARRAY[]::text[])
  FROM unnest(string_to_array(
    public._community_fold(coalesce(_name, '') || ' ' || coalesce(_town, '')), ' '
  )) AS t;
$$;

CREATE OR REPLACE FUNCTION public._gyms_token_jaccard(_a text[], _b text[])
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN _a IS NULL OR _b IS NULL OR array_length(_a, 1) IS NULL OR array_length(_b, 1) IS NULL
    THEN 0::double precision
    ELSE (SELECT count(*) FROM (SELECT unnest(_a) INTERSECT SELECT unnest(_b)) i)::double precision
       / greatest((SELECT count(*) FROM (SELECT unnest(_a) UNION SELECT unnest(_b)) u), 1)
  END;
$$;

-- GD-11: a pending venue is "immediately selectable by its submitter" and
-- invisible to everyone else until a second independent confirmation or a
-- moderator's verification. `_uid` is the VIEWER; NULL (no session) can
-- only ever see `open` rows, which matches every RPC below being granted to
-- `authenticated` only in any case.
CREATE OR REPLACE FUNCTION public._gyms_visible(_v public.gym_venues, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _v.status = 'open'
      OR (_v.status = 'pending' AND _uid IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.gym_submissions s
            WHERE s.id = _v.id AND s.submitter_id = _uid));
$$;

-- A gym a person may pick as their own (community_set_gyms, GD-14): open,
-- or their own not-yet-verified submission.
CREATE OR REPLACE FUNCTION public._gyms_selectable(_id uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gym_venues v
    WHERE v.id = _id
      AND (v.status = 'open'
           OR (v.status = 'pending' AND EXISTS (
                 SELECT 1 FROM public.gym_submissions s
                 WHERE s.id = v.id AND s.submitter_id = _uid)))
  );
$$;

-- ─── Part 5: gym_id -> gym_key/gym_label sync trigger ────────────────────
--
-- GD-14: gym_id is the picker's write path; gym_key/gym_label are DERIVED
-- from it here, so every reader that already keys off gym_key (Find people
-- 'gym' mode, community_gym_summary below, the profile card) needs no
-- change at all. A profile that has never used the picker keeps whatever
-- free-text gym_key/gym_label pair community_upsert_profile wrote
-- (migrate_160/161): this trigger only overrides the pair when gym_id IS
-- NOT NULL, and only on the row being written.

-- Review 35 findings 1, 2 and 5: this trigger is the SOLE writer of
-- gym_key/gym_label whenever gym_id is set -- community_upsert_profile
-- (re-issued below, Part 13) leaves both columns alone in that case, so
-- there is exactly one place that can produce a value either of them has
-- to accept.
CREATE OR REPLACE FUNCTION public._community_gym_key_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_display text;
BEGIN
  IF NEW.gym_id IS NOT NULL THEN
    SELECT display_name INTO v_display FROM public.gym_venues WHERE id = NEW.gym_id;
    NEW.gym_key := 'gym:' || NEW.gym_id::text;
    -- Finding 1 belt-and-braces / finding 2: clamp to the SAME 60
    -- characters community_upsert_profile's own gym_label cap enforces,
    -- so a catalogue display_name longer than that (145 open venues in
    -- the real catalogue, one 4,598 characters) can never lock the
    -- profile out of saving.
    NEW.gym_label := left(v_display, 60);
  ELSIF TG_OP = 'UPDATE' AND coalesce(OLD.gym_key, '') LIKE 'gym:%' THEN
    -- Finding 5: gym_id went from set to NULL (community_set_gyms(NULL,
    -- ...)) -- clear the derived key/label rather than leaving a stale
    -- picker-linked value the person no longer chose. A legacy free-text
    -- gym_key (never 'gym:%') is untouched, which is the case the
    -- original bare IF was written to protect; the TG_OP guard keeps this
    -- branch from ever reading OLD on an INSERT, where it does not exist.
    NEW.gym_key := NULL;
    NEW.gym_label := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS community_profiles_gym_key_sync ON public.community_profiles;
CREATE TRIGGER community_profiles_gym_key_sync
  BEFORE INSERT OR UPDATE OF gym_id ON public.community_profiles
  FOR EACH ROW EXECUTE FUNCTION public._community_gym_key_sync();

-- ─── Part 6: client RPCs -- reads (GD-09, GD-10) ─────────────────────────

-- GD-09. Postcode input (full or outward) is recognised and matched by
-- outward code only; everything else folds to tokens and matches by prefix
-- on `tokens` (exact via the GIN `&&`, prefix via unnest+LIKE), by brand
-- alias, and by town_key. A ~40 km bounding box restricts the scan when
-- coordinates are supplied; distance_m is returned whenever they are.
--
-- Review 35 finding 3 (measured 61 s on a 46k-row catalogue): `_q` is now
-- capped at 80 characters and 8 tokens (truncated, never refused, so a
-- long paste still searches on its first words) and `_limit` clamped to
-- 1..40 (GD-09; review 35 finding 24 -- it had drifted to 50); a shared
-- read rail (`_community_rate_check`, key 'gyms_read', 120 calls a
-- minute) covers this and the other four read RPCs, since `gyms_suggest`
-- delegates straight into this function below and so is covered by the
-- same call. Retention (review 35 finding 25, left as is): each read
-- writes one `gyms_read` row to `community_rate_events`, pruned at the
-- same 7-day window as every other rate key (migrate_160:869-877).
-- The un-indexable prefix `LIKE` scan that made the query 61 s no longer
-- drives the row scan at all: the WHERE clause below matches only via the
-- GIN `tokens && v_toks` array-overlap, an exact brand-alias fold or an
-- exact `town_key`, all indexed or cheap; the prefix fallback runs ONLY on
-- the LAST query token (the "still typing" token), bounded by the 80-
-- character / 8-token caps and by the outward/town restriction where the
-- WHERE clause already applies one, never by a coordinate gate. Review 35
-- finding 21: the fix lane had also required an indexed-narrowing
-- predicate (a bounding box or a recognised outward code) before the
-- prefix branch could run at all; the app never sends coordinates
-- (src/lib/gyms/index.js), so that gate made "puregy"/"motherw" return
-- nothing until the token was complete, and it was measured to buy
-- nothing (148 ms ungated versus 168 ms gated on the same 46,004 rows,
-- both against the 61 s baseline) -- so it is removed here; the caps are
-- what carry the safety. The brand_match/town_match columns below keep
-- their broader prefix check because they run on the SELECT list, over
-- rows the WHERE clause has already narrowed, not on the scan itself
-- (finding 3's own suggested fix: "restrict the prefix EXISTS to rows
-- already selected by the indexable predicates").
-- Finding 10: ORDER BY now runs INSIDE the subquery, before LIMIT, so the
-- 40 candidates handed to the client's ranker are the best 40, not an
-- arbitrary scan-order sample.
CREATE OR REPLACE FUNCTION public.gyms_search(
  _q text, _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL,
  _limit int DEFAULT 40
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       uuid := public._community_caller();
  v_raw       text := left(btrim(coalesce(_q, '')), 80);
  v_is_pc     boolean := public._gyms_postcode_full_valid(v_raw)
                      OR public._gyms_postcode_outward_valid(v_raw);
  v_outward   text := public._gyms_outward_of(v_raw);
  v_toks      text[] := (array_remove(
                  string_to_array(public._community_fold(v_raw), ' '), ''))[1:8];
  v_last_tok  text;
  v_limit     int := least(greatest(coalesce(_limit, 40), 1), 40);
  v_lat_delta double precision;
  v_lng_delta double precision;
  v_venues    jsonb;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  IF array_length(v_toks, 1) > 0 THEN
    v_last_tok := v_toks[array_length(v_toks, 1)];
  END IF;

  IF _lat IS NOT NULL AND _lng IS NOT NULL THEN
    v_lat_delta := public._gyms_bbox_lat_delta(40000);
    v_lng_delta := public._gyms_bbox_lng_delta(_lat, 40000);
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(z)::jsonb
           ORDER BY z.brand_match DESC, z.town_match DESC,
                    z.distance_m ASC NULLS LAST, z.display_name ASC),
         '[]'::jsonb)
  INTO v_venues
  FROM (
    SELECT
      v.id, v.display_name, v.name, b.name AS brand, v.venue_type, v.town,
      v.outward, v.postcode, v.lat, v.lng,
      CASE WHEN _lat IS NOT NULL AND _lng IS NOT NULL
        THEN public._gyms_distance_m(_lat, _lng, v.lat, v.lng) END AS distance_m,
      v.status, v.verification_status,
      (CASE WHEN array_length(v_toks, 1) > 0 AND EXISTS (
         SELECT 1 FROM unnest(coalesce(b.aliases, ARRAY[]::text[])) al
         WHERE public._community_fold(al) = ANY (v_toks)
            OR EXISTS (SELECT 1 FROM unnest(v_toks) qt WHERE public._community_fold(al) LIKE qt || '%')
       ) THEN 1 ELSE 0 END) AS brand_match,
      (CASE WHEN array_length(v_toks, 1) > 0 AND (
         v.town_key = ANY (v_toks)
         OR EXISTS (SELECT 1 FROM unnest(v_toks) qt WHERE v.town_key LIKE qt || '%')
       ) THEN 1 ELSE 0 END) AS town_match
    FROM public.gym_venues v
    LEFT JOIN public.gym_brands b ON b.id = v.brand_id
    WHERE v.venue_type <> 'excluded'
      AND public._gyms_visible(v, v_uid)
      AND (
        (v_is_pc AND v_outward IS NOT NULL AND v.outward = v_outward)
        OR (NOT v_is_pc AND array_length(v_toks, 1) > 0 AND (
          v.tokens && v_toks
          OR EXISTS (SELECT 1 FROM unnest(coalesce(b.aliases, ARRAY[]::text[])) al
                     WHERE public._community_fold(al) = ANY (v_toks))
          OR v.town_key = ANY (v_toks)
          OR (
            -- Review 35 finding 21: the prefix fallback runs on every call
            -- now, not only once a bounding box or outward code has
            -- already narrowed the row set -- that coordinate gate made
            -- the picker match whole tokens only, since the app never
            -- sends coordinates. The 80-character / 8-token caps above
            -- (finding 3) and the outward/town restriction the WHERE
            -- clause already applies where present are what carry the
            -- safety (measured: 148 ms ungated vs 168 ms gated on 46,004
            -- rows), so this branch is bounded by those, and by the last
            -- token only, and nothing else.
            v_last_tok IS NOT NULL
            AND (
              EXISTS (SELECT 1 FROM unnest(v.tokens) t WHERE t LIKE v_last_tok || '%')
              OR v.town_key LIKE v_last_tok || '%'
              OR EXISTS (SELECT 1 FROM unnest(coalesce(b.aliases, ARRAY[]::text[])) al
                         WHERE public._community_fold(al) LIKE v_last_tok || '%')
            )
          )
        ))
      )
      AND (_lat IS NULL OR _lng IS NULL OR v.lat IS NULL OR v.lng IS NULL OR (
        v.lat BETWEEN _lat - v_lat_delta AND _lat + v_lat_delta AND
        v.lng BETWEEN _lng - v_lng_delta AND _lng + v_lng_delta
      ))
    ORDER BY brand_match DESC, town_match DESC, distance_m ASC NULLS LAST, v.display_name ASC
    LIMIT v_limit
  ) z;

  RETURN jsonb_build_object('venues', coalesce(v_venues, '[]'::jsonb),
                            'recognised_postcode', v_is_pc);
END $$;

-- GD-10. Mile bands are a client-side rendering choice over this one
-- radius query; the server's job is the bounding box, the haversine
-- distance and the visibility/venue-type filter.
CREATE OR REPLACE FUNCTION public.gyms_near(
  _lat double precision, _lng double precision, _radius_m int DEFAULT 8000, _limit int DEFAULT 40
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       uuid := public._community_caller();
  v_radius    double precision := least(greatest(coalesce(_radius_m, 8000), 1), 50000);
  v_limit     int := least(greatest(coalesce(_limit, 40), 1), 50);
  v_lat_delta double precision := public._gyms_bbox_lat_delta(v_radius);
  v_lng_delta double precision := public._gyms_bbox_lng_delta(_lat, v_radius);
  v_venues    jsonb;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  IF _lat IS NULL OR _lng IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(z)::jsonb ORDER BY z.distance_m ASC), '[]'::jsonb)
  INTO v_venues
  FROM (
    SELECT v.id, v.display_name, v.name, b.name AS brand, v.venue_type, v.town,
           v.outward, v.postcode, v.lat, v.lng,
           public._gyms_distance_m(_lat, _lng, v.lat, v.lng) AS distance_m,
           v.status, v.verification_status
    FROM public.gym_venues v
    LEFT JOIN public.gym_brands b ON b.id = v.brand_id
    WHERE v.venue_type NOT IN ('excluded', 'other_fitness')
      AND public._gyms_visible(v, v_uid)
      AND v.lat IS NOT NULL AND v.lng IS NOT NULL
      AND v.lat BETWEEN _lat - v_lat_delta AND _lat + v_lat_delta
      AND v.lng BETWEEN _lng - v_lng_delta AND _lng + v_lng_delta
      AND public._gyms_distance_m(_lat, _lng, v.lat, v.lng) <= v_radius
    ORDER BY public._gyms_distance_m(_lat, _lng, v.lat, v.lng) ASC
    LIMIT v_limit
  ) z;

  RETURN jsonb_build_object('venues', coalesce(v_venues, '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.gyms_in_place(_town_key text, _limit int DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_key    text := nullif(btrim(coalesce(_town_key, '')), '');
  v_limit  int := least(greatest(coalesce(_limit, 60), 1), 80);
  v_venues jsonb;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  IF v_key IS NULL THEN
    RETURN jsonb_build_object('venues', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(z)::jsonb
           ORDER BY z.brand_match DESC, z.display_name ASC), '[]'::jsonb)
  INTO v_venues
  FROM (
    SELECT v.id, v.display_name, v.name, b.name AS brand, v.venue_type, v.town,
           v.outward, v.postcode, v.lat, v.lng, NULL::double precision AS distance_m,
           v.status, v.verification_status,
           (CASE WHEN v.brand_id IS NOT NULL THEN 1 ELSE 0 END) AS brand_match
    FROM public.gym_venues v
    LEFT JOIN public.gym_brands b ON b.id = v.brand_id
    WHERE v.venue_type <> 'excluded'
      AND public._gyms_visible(v, v_uid)
      AND v.town_key = v_key
    ORDER BY brand_match DESC, v.display_name ASC
    LIMIT v_limit
  ) z;

  RETURN jsonb_build_object('venues', coalesce(v_venues, '[]'::jsonb));
END $$;

-- Never the source payload -- provenance only (source, source_name,
-- retrieved_at), matching what gyms_get's own comment promises above.
CREATE OR REPLACE FUNCTION public.gyms_get(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid          uuid := public._community_caller();
  v_v            public.gym_venues%ROWTYPE;
  v_brand        text;
  v_source_names jsonb;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  SELECT * INTO v_v FROM public.gym_venues WHERE id = _id;
  IF NOT FOUND OR NOT public._gyms_visible(v_v, v_uid) THEN
    RETURN NULL;
  END IF;

  SELECT b.name INTO v_brand FROM public.gym_brands b WHERE b.id = v_v.brand_id;

  -- Provenance NAMES only, never the raw source payload (the fixed
  -- contract src/lib/gyms/index.js `get()` reads as `data.source_names`,
  -- a flat array of display strings): falls back to the source code
  -- itself when a friendlier `source_name` was never recorded.
  SELECT coalesce(jsonb_agg(DISTINCT coalesce(s.source_name, s.source)
           ORDER BY coalesce(s.source_name, s.source)), '[]'::jsonb)
  INTO v_source_names
  FROM public.gym_venue_sources s
  WHERE s.venue_id = v_v.id;

  RETURN jsonb_build_object(
    'id', v_v.id, 'display_name', v_v.display_name, 'name', v_v.name, 'brand', v_brand,
    'venue_type', v_v.venue_type, 'address_line', v_v.address_line, 'town', v_v.town,
    'outward', v_v.outward, 'postcode', v_v.postcode, 'lat', v_v.lat, 'lng', v_v.lng,
    'website', v_v.website, 'phone', v_v.phone, 'facility_count', v_v.facility_count,
    'status', v_v.status, 'verification_status', v_v.verification_status,
    'source_names', v_source_names
  );
END $$;

-- GD-09: "8 rows for autocomplete", the SAME matching as gyms_search --
-- delegation rather than a second copy of the query, so the two can never
-- silently disagree about what counts as a match.
CREATE OR REPLACE FUNCTION public.gyms_suggest(
  _q text, _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('venues', public.gyms_search(_q, _lat, _lng, 8) -> 'venues');
$$;

-- ─── Part 7: client RPCs -- write-throughs (GD-11, GD-12) ────────────────

-- GD-11. Duplicate check first (150 m of an existing open/pending venue, or
-- same postcode unit with token Jaccard >= 0.6); otherwise inserts a
-- `pending` venue, its submission row (sharing the same id -- see the
-- design note on gym_submissions above) and a `source = 'user'` provenance
-- row, with coordinates from the postcode sector centroid. Rate 3/day via
-- the existing `_community_rate_check` rail (reused rather than a second
-- rail: the same table, the same opportunistic prune, one definition of
-- "too many actions today").
CREATE OR REPLACE FUNCTION public.gyms_submit(_p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_name     text;
  v_address  text;
  v_town     text;
  v_postcode text;
  v_website  text;
  v_operator text;
  v_sector   text;
  v_lat      double precision;
  v_lng      double precision;
  v_tokens   text[];
  v_brand_id uuid;
  v_type     text := 'independent_gym';
  v_id       uuid;
  v_dup_id   uuid;
  v_dup_name text;
  v_twin_id     uuid;
  v_twin_name   text;
  v_twin_status text;
  v_twin_distinct int;
BEGIN
  IF _p IS NULL OR jsonb_typeof(_p) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;

  v_name     := btrim(coalesce(_p ->> 'name', ''));
  v_address  := btrim(coalesce(_p ->> 'address_line', ''));
  v_town     := btrim(coalesce(_p ->> 'town', ''));
  v_postcode := upper(btrim(coalesce(_p ->> 'postcode', '')));
  v_website  := nullif(btrim(coalesce(_p ->> 'website', '')), '');
  v_operator := nullif(btrim(coalesce(_p ->> 'operator', '')), '');

  -- Finding 1: every free-text field goes through the SAME blocked-terms
  -- gate every other Community free-text field uses
  -- (`_community_clean_text`, migrate_160:913), which raises
  -- `content_not_allowed` on a match. Without this a pro-ED string became
  -- gym_venues.display_name and, via the sync trigger, another user's
  -- profile card.
  v_name := public._community_clean_text(v_name);
  v_address := public._community_clean_text(v_address);
  v_town := public._community_clean_text(v_town);
  IF v_operator IS NOT NULL THEN v_operator := public._community_clean_text(v_operator); END IF;
  IF v_website IS NOT NULL THEN v_website := public._community_clean_text(v_website); END IF;

  -- GD-11 client contract (src/lib/gyms/transport.js GYM_ERROR_CODES,
  -- CommunityGymAddScreen's REFUSALS map): a postcode-shaped failure is
  -- `invalid_postcode` specifically, so the screen can say "check the
  -- postcode" rather than a generic "check what you have typed"; every
  -- other field failure is the generic `invalid`. Finding 2: `name` is
  -- capped at 60, the same cap `community_upsert_profile` enforces on
  -- `gym_label`, so a submitted name can never be longer than what the
  -- profile field (and the sync trigger's own clamp) will accept.
  IF length(v_name) < 1 OR length(v_name) > 60
     OR length(v_address) < 1 OR length(v_address) > 200
     OR length(v_town) < 1 OR length(v_town) > 80 THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;
  -- Finding 13: website and operator had no length or format validation
  -- (a 200,000-character website was measured, stored twice). `website`
  -- must look like a URL so nothing else can ever render it as a tappable
  -- link.
  IF v_website IS NOT NULL AND (length(v_website) > 200 OR v_website !~* '^https?://') THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;
  IF v_operator IS NOT NULL AND length(v_operator) > 80 THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;
  IF NOT public._gyms_postcode_full_valid(v_postcode) THEN
    RAISE EXCEPTION USING message = 'invalid_postcode';
  END IF;

  PERFORM public._community_rate_check(v_uid, 'gyms_submit', 3, 3, interval '24 hours');

  v_sector := public._gyms_sector_of(v_postcode);
  SELECT lat, lng INTO v_lat, v_lng FROM public.gym_postcode_sectors WHERE sector = v_sector;
  IF v_lat IS NULL THEN
    -- A validly-SHAPED postcode whose sector is not yet in gym_postcode_
    -- sectors (ONSPD not seeded, or a genuinely unrecognised sector) is
    -- still a postcode-field problem from the caller's point of view.
    RAISE EXCEPTION USING message = 'invalid_postcode';
  END IF;

  v_tokens := public._gyms_tokens_of(v_name, v_town);

  -- Finding 9: gyms_submit always geocodes to the postcode SECTOR centroid
  -- (above), so a 150 m distance test between two sector-centroid points
  -- is meaningless -- two unrelated gyms in the same sector sit at
  -- distance 0 by construction, which refused every submission after the
  -- first in a sector. The duplicate test is text-only instead: same
  -- postcode UNIT with token Jaccard >= 0.6 (a tight address match), or
  -- same OUTWARD code with Jaccard >= 0.85 (a looser area match that
  -- needs a near-identical name). Finding 15: bounded to the submission's
  -- own outward code first (`gym_venues_outward_idx`) rather than scanning
  -- every venue's tokens. Finding 4: only a row this caller may SEE is
  -- ever offered back as a duplicate here -- an invisible venue never
  -- appears in THIS scan's result or its 'duplicate_of' reply, which is
  -- the privacy property finding 4 fixed and this scan keeps. Review 35
  -- finding 22: a stranger's invisible PENDING venue is handled by the
  -- separate twin check below instead of being allowed to insert as a
  -- second, identical pending row.
  SELECT v.id, v.display_name INTO v_dup_id, v_dup_name
  FROM public.gym_venues v
  WHERE v.status IN ('open', 'pending')
    AND v.outward = public._gyms_outward_of(v_postcode)
    AND public._gyms_visible(v, v_uid)
    AND (
      (v.postcode IS NOT NULL
        AND public._gyms_postcode_compact(v.postcode) = public._gyms_postcode_compact(v_postcode)
        AND public._gyms_token_jaccard(v.tokens, v_tokens) >= 0.6)
      OR public._gyms_token_jaccard(v.tokens, v_tokens) >= 0.85
    )
  ORDER BY public._gyms_token_jaccard(v.tokens, v_tokens) DESC
  LIMIT 1;

  IF v_dup_id IS NOT NULL THEN
    RETURN jsonb_build_object('duplicate_of', v_dup_id, 'display_name', v_dup_name);
  END IF;

  -- Review 35 finding 22: the same text match, this time WITHOUT the
  -- visibility restriction and narrowed to 'pending' only ('open' rows are
  -- always visible and so are already caught by the scan above). A hit
  -- here is a genuine twin -- another caller's pending submission this
  -- caller cannot see. Rather than insert a second, identical pending
  -- venue that the two submitters could then confirm into the catalogue
  -- as two separate rows, this caller is recorded as a distinct confirmer
  -- on the EXISTING venue, exactly as gyms_confirm_submission does below
  -- (a 'confirm' history row, confirmations + 1, and the flip to open /
  -- user_submitted_verified once two distinct confirmers exist). The
  -- reply carries only the venue's own id/display_name/status -- never the
  -- other submitter's identity.
  SELECT v.id, v.display_name, v.status INTO v_twin_id, v_twin_name, v_twin_status
  FROM public.gym_venues v
  WHERE v.status = 'pending'
    AND v.outward = public._gyms_outward_of(v_postcode)
    AND (
      (v.postcode IS NOT NULL
        AND public._gyms_postcode_compact(v.postcode) = public._gyms_postcode_compact(v_postcode)
        AND public._gyms_token_jaccard(v.tokens, v_tokens) >= 0.6)
      OR public._gyms_token_jaccard(v.tokens, v_tokens) >= 0.85
    )
  ORDER BY public._gyms_token_jaccard(v.tokens, v_tokens) DESC
  LIMIT 1;

  IF v_twin_id IS NOT NULL THEN
    -- v_twin_id was excluded from the visible scan above, so it is never
    -- this caller's own submission and this caller can never already be a
    -- confirmer on it; still guard both, defensively and idempotently.
    IF NOT EXISTS (
      SELECT 1 FROM public.gym_submissions s
      WHERE s.id = v_twin_id AND s.submitter_id = v_uid
    ) AND NOT EXISTS (
      SELECT 1 FROM public.gym_venue_history h
      WHERE h.venue_id = v_twin_id AND h.change = 'confirm' AND h.actor = v_uid::text
    ) THEN
      INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
      VALUES (gen_random_uuid(), v_twin_id, 'confirm', NULL,
              jsonb_build_object('confirmer', v_uid), v_uid::text, now());

      UPDATE public.gym_submissions SET confirmations = confirmations + 1 WHERE id = v_twin_id;

      SELECT count(DISTINCT h.actor)::int INTO v_twin_distinct
      FROM public.gym_venue_history h
      WHERE h.venue_id = v_twin_id AND h.change = 'confirm';

      IF v_twin_distinct >= 2 THEN
        UPDATE public.gym_venues
           SET status = 'open', verification_status = 'user_submitted_verified'
         WHERE id = v_twin_id AND status = 'pending';
        UPDATE public.gym_submissions
           SET status = 'verified', reviewed_at = now()
         WHERE id = v_twin_id AND status = 'pending';
        INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
        VALUES (gen_random_uuid(), v_twin_id, 'verify',
                jsonb_build_object('status', 'pending'), jsonb_build_object('status', 'open'),
                v_uid::text, now());
        v_twin_status := 'open';
      END IF;
    END IF;

    RETURN jsonb_build_object('id', v_twin_id, 'display_name', v_twin_name, 'status', v_twin_status);
  END IF;

  -- Operator classification (GD-03, "operator brand type" outranks name
  -- tokens): if the given operator folds to a known brand alias, the venue
  -- is classified commercial_gym and linked to that brand; otherwise it
  -- stays independent_gym, the last-resort default for a user submission
  -- with no other classification signal.
  IF v_operator IS NOT NULL THEN
    SELECT b.id INTO v_brand_id FROM public.gym_brands b
    WHERE public._community_fold(v_operator) = ANY (
      SELECT public._community_fold(a) FROM unnest(b.aliases) a
    ) LIMIT 1;
    IF v_brand_id IS NOT NULL THEN v_type := 'commercial_gym'; END IF;
  END IF;

  v_id := gen_random_uuid();

  INSERT INTO public.gym_venues (
    id, display_name, name, brand_id, venue_type, status, address_line, town, town_key,
    postcode, outward, sector, lat, lng, coord_source, website, facility_count,
    verification_status, source_count, tokens, first_seen, geocell
  ) VALUES (
    v_id, v_name, v_name, v_brand_id, v_type, 'pending', v_address, v_town,
    nullif(public._community_fold(v_town), ''),
    v_postcode, public._gyms_outward_of(v_postcode), v_sector, v_lat, v_lng,
    'postcode_sector', v_website, 1,
    'user_submitted_pending', 1, v_tokens, now(), public._gyms_geocell(v_lat, v_lng)
  );

  INSERT INTO public.gym_submissions (
    id, submitter_id, name, address_line, town, postcode, website, operator,
    lat, lng, status, confirmations, created_at
  ) VALUES (
    v_id, v_uid, v_name, v_address, v_town, v_postcode, v_website, v_operator,
    v_lat, v_lng, 'pending', 1, now()
  );

  INSERT INTO public.gym_venue_sources (id, venue_id, source, source_record_id, retrieved_at)
  VALUES (gen_random_uuid(), v_id, 'user', v_uid::text, now());

  INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
  VALUES (gen_random_uuid(), v_id, 'submit', NULL,
          jsonb_build_object('display_name', v_name, 'status', 'pending'), v_uid::text, now());
  -- The submitter's own implicit confirmation (GD-11: "immediately
  -- selectable by its submitter"), recorded as the first 'confirm' actor so
  -- gyms_confirm_submission's distinct-confirmer count starts at one, not
  -- zero, and a SECOND, independent confirmer is what reaches two.
  INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
  VALUES (gen_random_uuid(), v_id, 'confirm', NULL,
          jsonb_build_object('confirmer', v_uid, 'implicit', true), v_uid::text, now());

  RETURN jsonb_build_object('id', v_id, 'display_name', v_name, 'status', 'pending');
END $$;

-- GD-11: a second, DISTINCT confirmer flips a pending venue to open and
-- 'user_submitted_verified'. Distinct-confirmer tracking reuses
-- gym_venue_history's `actor` column (change = 'confirm') rather than a new
-- table: the submitter's own implicit confirmation from gyms_submit is
-- already an actor there, so a genuinely different second actor is what
-- reaches the count of two this function checks for. Review 35 finding
-- 22: this is not the only path to that second confirmer -- when
-- gyms_submit's own duplicate scan finds a twin PENDING venue it cannot
-- see (another caller's independent submission of the same gym), it
-- performs this exact confirm-and-maybe-flip sequence inline rather than
-- inserting a second identical pending row, so the two entry points must
-- stay in step.
CREATE OR REPLACE FUNCTION public.gyms_confirm_submission(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_sub      public.gym_submissions%ROWTYPE;
  v_venue    public.gym_venues%ROWTYPE;
  v_distinct int;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_confirm', 20, 20, interval '1 hour');

  SELECT * INTO v_sub FROM public.gym_submissions WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  -- Finding 7: neither the venue nor the submission had a pending
  -- precondition, so an ordinary account could flip a moderator-rejected
  -- (or already-verified) row back to open.
  IF v_sub.status <> 'pending' THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  SELECT * INTO v_venue FROM public.gym_venues WHERE id = _id;
  IF NOT FOUND OR v_venue.status <> 'pending' THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_sub.submitter_id = v_uid THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.gym_venue_history h
    WHERE h.venue_id = _id AND h.change = 'confirm' AND h.actor = v_uid::text
  ) THEN
    RAISE EXCEPTION USING message = 'already_confirmed';
  END IF;

  INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
  VALUES (gen_random_uuid(), _id, 'confirm', NULL,
          jsonb_build_object('confirmer', v_uid), v_uid::text, now());

  UPDATE public.gym_submissions SET confirmations = confirmations + 1 WHERE id = _id;

  SELECT count(DISTINCT h.actor)::int INTO v_distinct
  FROM public.gym_venue_history h
  WHERE h.venue_id = _id AND h.change = 'confirm';

  IF v_distinct >= 2 THEN
    UPDATE public.gym_venues
       SET status = 'open', verification_status = 'user_submitted_verified'
     WHERE id = _id AND status = 'pending';
    UPDATE public.gym_submissions
       SET status = 'verified', reviewed_at = now()
     WHERE id = _id AND status = 'pending';
    INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
    VALUES (gen_random_uuid(), _id, 'verify',
            jsonb_build_object('status', 'pending'), jsonb_build_object('status', 'open'),
            v_uid::text, now());
  END IF;

  RETURN jsonb_build_object('id', _id, 'distinct_confirmers', v_distinct);
END $$;

-- GD-12: two DISTINCT reporters of the same kind set needs_review. Reports
-- themselves are never auto-applied -- a moderator applies the change via
-- gyms_review_report below, and the history row records it.
CREATE OR REPLACE FUNCTION public.gyms_report(_venue_id uuid, _kind text, _detail text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_kind     text := lower(btrim(coalesce(_kind, '')));
  v_detail   text := nullif(btrim(coalesce(_detail, '')), '');
  v_distinct int;
BEGIN
  IF v_kind NOT IN ('closed', 'wrong_name', 'wrong_location', 'duplicate_of', 'not_a_gym', 'other') THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;
  IF v_detail IS NOT NULL AND length(v_detail) > 500 THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;
  -- Finding 1: detail is free text and goes through the same blocked-terms
  -- gate every other Community free-text field uses.
  IF v_detail IS NOT NULL THEN v_detail := public._community_clean_text(v_detail); END IF;

  -- Finding 14: the rail now runs BEFORE the existence check below, so
  -- probing whether a venue id exists is itself rated rather than a free
  -- oracle.
  PERFORM public._community_rate_check(v_uid, 'gyms_report', 10, 10, interval '24 hours');

  -- Finding 11: a closed venue, a merged venue and another user's
  -- invisible pending venue all used to report `{"ok": true}`. Only a
  -- venue this caller may SEE can be reported.
  IF NOT EXISTS (
    SELECT 1 FROM public.gym_venues v WHERE v.id = _venue_id AND public._gyms_visible(v, v_uid)
  ) THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;

  INSERT INTO public.gym_reports (id, venue_id, reporter_id, kind, detail, status, created_at)
  VALUES (gen_random_uuid(), _venue_id, v_uid, v_kind, v_detail, 'open', now());

  SELECT count(DISTINCT reporter_id)::int INTO v_distinct
  FROM public.gym_reports
  WHERE venue_id = _venue_id AND kind = v_kind AND status = 'open';

  IF v_distinct >= 2 THEN
    UPDATE public.gym_venues SET needs_review = true WHERE id = _venue_id AND needs_review = false;
    INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
    VALUES (gen_random_uuid(), _venue_id, 'flag',
            jsonb_build_object('needs_review', false),
            jsonb_build_object('needs_review', true, 'kind', v_kind), v_uid::text, now());
  END IF;

  RETURN jsonb_build_object('ok', true, 'distinct_reports', v_distinct);
END $$;

-- ─── Part 8: moderator RPCs (GD-12) ───────────────────────────────────────
--
-- Both write gym_venue_history on every change, per the founder brief's
-- acceptance line "history written by both review RPCs".

CREATE OR REPLACE FUNCTION public.gyms_review_submission(
  _id uuid, _action text, _merge_into uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_action text := lower(btrim(coalesce(_action, '')));
  v_venue  public.gym_venues%ROWTYPE;
BEGIN
  IF NOT public.community_is_moderator() THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_action NOT IN ('approve', 'reject', 'merge') THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;

  SELECT * INTO v_venue FROM public.gym_venues WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  IF v_action = 'approve' THEN
    -- Finding 17: approve had no status precondition, so it could reopen a
    -- venue that was already merged or closed while `succeeded_by` still
    -- pointed elsewhere.
    IF v_venue.status <> 'pending' THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
    UPDATE public.gym_venues
       SET status = 'open', verification_status = 'moderator_verified'
     WHERE id = _id;
    UPDATE public.gym_submissions
       SET status = 'verified', reviewed_at = now(), reviewed_by = v_uid
     WHERE id = _id;
    INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
    VALUES (gen_random_uuid(), _id, 'moderator_approve',
            jsonb_build_object('status', v_venue.status),
            jsonb_build_object('status', 'open'), v_uid::text, now());

  ELSIF v_action = 'reject' THEN
    -- Review 35 finding 23: reject had no status precondition, so it could
    -- close an already-open, long-established venue with one call. Same
    -- guard approve already has (finding 17).
    IF v_venue.status <> 'pending' THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
    UPDATE public.gym_venues
       SET status = 'closed', verification_status = 'rejected', closed_at = now()
     WHERE id = _id;
    UPDATE public.gym_submissions
       SET status = 'rejected', reviewed_at = now(), reviewed_by = v_uid
     WHERE id = _id;
    INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
    VALUES (gen_random_uuid(), _id, 'moderator_reject',
            jsonb_build_object('status', v_venue.status),
            jsonb_build_object('status', 'closed'), v_uid::text, now());

  ELSIF v_action = 'merge' THEN
    -- Finding 17: refuse a self-merge, and refuse a target that does not
    -- exist.
    IF _merge_into IS NULL OR _merge_into = _id
       OR NOT EXISTS (SELECT 1 FROM public.gym_venues WHERE id = _merge_into) THEN
      RAISE EXCEPTION USING message = 'invalid';
    END IF;
    UPDATE public.gym_venues SET status = 'merged', succeeded_by = _merge_into WHERE id = _id;
    UPDATE public.gym_submissions
       SET status = 'merged', duplicate_of = _merge_into, reviewed_at = now(), reviewed_by = v_uid
     WHERE id = _id;
    -- GD-07: user associations survive a merge.
    UPDATE public.community_profiles SET gym_id = _merge_into WHERE gym_id = _id;
    -- Finding 17: array_replace alone can leave a duplicate `_merge_into`
    -- entry when the profile already held both gyms in other_gym_ids; the
    -- replace and the de-duplicate happen together.
    UPDATE public.community_profiles
       SET other_gym_ids = (
         SELECT coalesce(array_agg(DISTINCT g), ARRAY[]::uuid[])
         FROM unnest(array_replace(other_gym_ids, _id, _merge_into)) g
       )
     WHERE _id = ANY (other_gym_ids);
    INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
    VALUES (gen_random_uuid(), _id, 'moderator_merge',
            jsonb_build_object('status', v_venue.status),
            jsonb_build_object('status', 'merged', 'succeeded_by', _merge_into),
            v_uid::text, now());
    -- Finding 17: the merge also writes a history row on the TARGET venue
    -- that absorbed it, never only on the source.
    INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
    VALUES (gen_random_uuid(), _merge_into, 'moderator_merge_absorbed',
            jsonb_build_object('absorbed_venue_id', _id),
            jsonb_build_object('absorbed_venue_id', _id), v_uid::text, now());
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', _id, 'action', v_action);
END $$;

CREATE OR REPLACE FUNCTION public.gyms_review_report(_id uuid, _action text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid        uuid := public._community_caller();
  v_action     text := lower(btrim(coalesce(_action, '')));
  v_report     public.gym_reports%ROWTYPE;
  v_other_open int;
BEGIN
  IF NOT public.community_is_moderator() THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_action NOT IN ('resolve', 'dismiss') THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;

  SELECT * INTO v_report FROM public.gym_reports WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  UPDATE public.gym_reports
     SET status = CASE WHEN v_action = 'resolve' THEN 'resolved' ELSE 'dismissed' END,
         resolved_at = now()
   WHERE id = _id;

  -- Finding 12: this used to recount only the dismissed report's OWN kind,
  -- so clearing needs_review for one kind's queue silently dropped another
  -- kind's still-open reports off the moderator queue. Count open reports
  -- across every kind for the venue.
  SELECT count(*) INTO v_other_open
  FROM public.gym_reports
  WHERE venue_id = v_report.venue_id AND status = 'open';

  IF v_other_open = 0 THEN
    UPDATE public.gym_venues SET needs_review = false WHERE id = v_report.venue_id;
  END IF;

  INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
  VALUES (gen_random_uuid(), v_report.venue_id, 'moderator_review_report',
          jsonb_build_object('report_id', _id, 'status', v_report.status),
          jsonb_build_object('report_id', _id, 'status',
            CASE WHEN v_action = 'resolve' THEN 'resolved' ELSE 'dismissed' END),
          v_uid::text, now());

  RETURN jsonb_build_object('ok', true, 'id', _id, 'action', v_action);
END $$;

-- ─── Part 9: Community integration (GD-14) ───────────────────────────────

-- Sets the caller's chosen gym(s). Validates each id exists and is open, or
-- the caller's own pending submission; caps other_gym_ids at 3 (also
-- enforced by the CHECK in Part 3, belt and braces).
CREATE OR REPLACE FUNCTION public.community_set_gyms(_gym_id uuid, _other_gym_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_others uuid[];
  v_id     uuid;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  PERFORM public._community_rate_check(v_uid, 'set_gyms', 60, 60, interval '1 hour');

  -- Finding 16: de-duplicate and exclude the primary gym BEFORE the cap
  -- and selectability checks below, so a repeated id can neither inflate
  -- the count past 3 nor sit in the array twice.
  SELECT coalesce(array_agg(DISTINCT g), ARRAY[]::uuid[])
    INTO v_others
  FROM unnest(coalesce(_other_gym_ids, ARRAY[]::uuid[])) g
  WHERE g IS NOT NULL AND g IS DISTINCT FROM _gym_id;

  IF array_length(v_others, 1) > 3 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF _gym_id IS NOT NULL AND NOT public._gyms_selectable(_gym_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF array_length(v_others, 1) IS NOT NULL THEN
    FOREACH v_id IN ARRAY v_others LOOP
      IF NOT public._gyms_selectable(v_id, v_uid) THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
    END LOOP;
  END IF;

  UPDATE public.community_profiles
     SET gym_id = _gym_id, other_gym_ids = v_others
   WHERE user_id = v_uid;

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

-- migrate_161's body, RE-ISSUED with ONE change: a `gym:<uuid>` key
-- resolves its label and venue fields from gym_venues; a legacy
-- `<area fold>:<gym fold>` key keeps the exact 161 path (label read off a
-- member's own gym_label). The member scan below is UNCHANGED for either
-- key shape: the Part 5 trigger keeps gym_key in sync with gym_id, so
-- `p.gym_key = v_key` already finds every member who picked this venue.
CREATE OR REPLACE FUNCTION public.community_gym_summary(_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_key      text := nullif(btrim(coalesce(_key, '')), '');
  v_label    text;
  v_venue    jsonb;
  v_gym_uuid uuid;
  v_members  uuid[];
  v_count    int := 0;
  v_follow   int := 0;
  v_partner  int := 0;
  v_styles   jsonb := '[]'::jsonb;
  v_bands    jsonb := '[]'::jsonb;
  v_people   jsonb := '[]'::jsonb;
  v_progs    jsonb := '[]'::jsonb;
  v_posts    jsonb := '[]'::jsonb;
BEGIN
  IF v_key IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  PERFORM public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'gym_summary', 120, 120, interval '1 hour');

  IF v_key LIKE 'gym:%'
     AND v_key ~ '^gym:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    v_gym_uuid := substring(v_key FROM 5)::uuid;
    -- Finding 4: this branch had no visibility predicate at all, so a
    -- pending venue was disclosed (name, coordinates, status) to every
    -- caller, not only its submitter. A row this caller may not SEE
    -- simply leaves v_venue/v_label NULL, the same "not found" shape
    -- gyms_get already returns for the same case.
    SELECT jsonb_build_object(
             'id', gv.id, 'display_name', gv.display_name, 'venue_type', gv.venue_type,
             'town', gv.town, 'outward', gv.outward, 'postcode', gv.postcode,
             'lat', gv.lat, 'lng', gv.lng, 'status', gv.status,
             'verification_status', gv.verification_status),
           gv.display_name
      INTO v_venue, v_label
    FROM public.gym_venues gv
    WHERE gv.id = v_gym_uuid AND public._gyms_visible(gv, v_uid);
  ELSE
    SELECT gym_label INTO v_label FROM public.community_profiles
    WHERE gym_key = v_key AND status = 'active' AND visibility = 'public'
    LIMIT 1;
  END IF;

  SELECT coalesce(array_agg(p.user_id), ARRAY[]::uuid[])
  INTO v_members
  FROM public.community_profiles p
  WHERE p.gym_key = v_key
    AND p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
    AND p.user_id <> v_uid
    AND NOT public._community_is_blocked(v_uid, p.user_id);

  v_count := coalesce(array_length(v_members, 1), 0);
  IF v_count = 0 THEN
    RETURN jsonb_build_object(
      'key', v_key, 'label', v_label, 'venue', v_venue, 'count', 0,
      'following_count', 0, 'open_to_partner_count', 0,
      'by_style', '[]'::jsonb, 'by_time_band', '[]'::jsonb,
      'people', '[]'::jsonb, 'programmes', '[]'::jsonb, 'posts', '[]'::jsonb);
  END IF;

  SELECT count(*) INTO v_follow
  FROM public.community_follows f
  WHERE f.follower_id = v_uid AND f.state = 'accepted'
    AND f.followee_id = ANY (v_members);

  SELECT count(*) INTO v_partner
  FROM public.community_profiles p
  WHERE p.user_id = ANY (v_members) AND p.open_to_partner = true;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'key', s.style_key, 'label', public._community_style_label(s.style_key),
           'count', s.n) ORDER BY s.n DESC, s.style_key ASC), '[]'::jsonb)
  INTO v_styles
  FROM (
    SELECT st AS style_key, count(*)::int AS n
    FROM public.community_profiles p
    CROSS JOIN LATERAL unnest(p.styles) AS st
    WHERE p.user_id = ANY (v_members)
    GROUP BY st
    ORDER BY count(*) DESC, st ASC
    LIMIT 8
  ) s;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'band', b.band,
           'label', 'usually train ' || public._community_time_band_phrase(b.band),
           'count', b.n)
         ORDER BY array_position(public._community_tp_time_bands_list(), b.band)), '[]'::jsonb)
  INTO v_bands
  FROM (
    SELECT tb AS band, count(*)::int AS n
    FROM public.community_profiles p
    CROSS JOIN LATERAL unnest(p.tp_time_bands) AS tb
    WHERE p.user_id = ANY (v_members) AND p.tp_time_bands IS NOT NULL
    GROUP BY tb
  ) b;

  SELECT coalesce(jsonb_agg(public._community_profile_card(z.user_id, v_uid)
           ORDER BY z.last_active_at DESC), '[]'::jsonb)
  INTO v_people
  FROM (
    SELECT p.user_id, p.last_active_at
    FROM public.community_profiles p
    WHERE p.user_id = ANY (v_members)
    ORDER BY p.last_active_at DESC
    LIMIT 20
  ) z;

  SELECT coalesce(jsonb_agg(public._community_programme_tile(g.row) ORDER BY g.updated_at DESC),
                  '[]'::jsonb)
  INTO v_progs
  FROM (
    SELECT gg AS row, gg.updated_at AS updated_at
    FROM public.community_programmes gg
    WHERE gg.owner_id = ANY (v_members)
      AND gg.status = 'visible' AND gg.visibility = 'public'
    ORDER BY gg.updated_at DESC
    LIMIT 20
  ) g;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'post',   public._community_post_json(r.row),
           'author', public._community_profile_card(r.author_id, v_uid))
         ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_posts
  FROM (
    SELECT pp AS row, pp.author_id AS author_id, pp.created_at AS created_at
    FROM public.community_posts pp
    WHERE pp.author_id = ANY (v_members)
      AND pp.status = 'visible' AND pp.visibility = 'public'
      AND public._community_can_view_post(v_uid, pp.id)
    ORDER BY pp.created_at DESC
    LIMIT 10
  ) r;

  RETURN jsonb_build_object(
    'key',                   v_key,
    'label',                 v_label,
    'venue',                 v_venue,
    'count',                 v_count,
    'following_count',       v_follow,
    'open_to_partner_count', v_partner,
    'by_style',              v_styles,
    'by_time_band',          v_bands,
    'people',                v_people,
    'programmes',            v_progs,
    'posts',                 v_posts);
END $$;

-- migrate_161's body, RE-ISSUED to delegate its matching to gyms_suggest
-- (GD-14: "community_gym_suggest is replaced by gyms_suggest") while
-- KEEPING the exact signature and {gyms:[{label,key,count}]} shape the
-- picker and privacy screen already call. gyms_suggest's own signature is
-- fixed by the blueprint's RPC list and carries no area parameter, so this
-- delegation is not town-scoped by gyms_suggest itself; the caller's own
-- area is still enforced below as the authorisation check it always was,
-- and the re-ranking by member count restores a "most used in Community
-- first" order over whatever gyms_suggest's own ranking returns.
CREATE OR REPLACE FUNCTION public.community_gym_suggest(_area_key text, _prefix text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_me     public.community_profiles%ROWTYPE;
  v_area   text := nullif(btrim(coalesce(_area_key, '')), '');
  v_pre    text := coalesce(public._community_fold(_prefix), '');
  v_result jsonb;
  v_out    jsonb := '[]'::jsonb;
BEGIN
  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'gym_suggest', 120, 120, interval '1 hour');

  IF v_area IS NOT NULL AND v_area <> coalesce(v_me.area_key, '') THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;
  IF v_area IS NULL THEN v_area := v_me.area_key; END IF;
  IF v_area IS NULL THEN
    RETURN jsonb_build_object('gyms', '[]'::jsonb);
  END IF;

  v_result := public.gyms_suggest(v_pre, NULL, NULL);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'label', x.display_name, 'key', 'gym:' || x.id::text, 'count', x.member_count)
         ORDER BY x.member_count DESC, x.display_name ASC), '[]'::jsonb)
  INTO v_out
  FROM (
    -- Finding 6: this count had dropped every membership filter 161's own
    -- body had (status, visibility, is_minor, area_key), so a minor on a
    -- followers-only profile could be counted and named nationally, with
    -- `count: 1` identifying them uniquely. All four are restored,
    -- verbatim, exactly as 161's body enforced them.
    SELECT (elem ->> 'id')::uuid AS id, elem ->> 'display_name' AS display_name,
      (SELECT count(*)::int FROM public.community_profiles p
        WHERE p.gym_key = 'gym:' || (elem ->> 'id')
          AND p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
          AND p.area_key = v_area) AS member_count
    FROM jsonb_array_elements(coalesce(v_result -> 'venues', '[]'::jsonb)) elem
    LIMIT 8
  ) x;

  RETURN jsonb_build_object('gyms', v_out);
END $$;

-- ─── Part 9b: three more migrate_161 functions, re-issued (review 35) ────
--
-- Same "latest definition wins" pattern as community_gym_summary/
-- community_gym_suggest above: each body below is migrate_161's, verbatim,
-- with only the one review fix named in its own comment changed.

-- Finding 2 (and finding 5's "same seam" note): migrate_161's merge step
-- re-injects the EXISTING gym_label into every save that omits it, and the
-- validation immediately below re-derives and re-caps it -- so a
-- picker-derived label the trigger already wrote (up to the catalogue's
-- own length, unfiltered) could fail community_upsert_profile's OWN 60-
-- character cap or blocked-terms check on every future save, permanently
-- locking the privacy toggle and rules re-consent. The fix: once a profile
-- has gym_id set, `_community_gym_key_sync` (Part 5 above) is the SOLE
-- writer of gym_key/gym_label -- this function leaves both columns
-- exactly as they stood, never re-validating or re-deriving a value it
-- did not itself receive from the caller. A profile with no gym_id (never
-- picked one, or free-text from before the picker existed) keeps the
-- exact 161 validation path, unchanged.
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
BEGIN
  IF _p IS NULL OR jsonb_typeof(_p) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  SELECT * INTO v_existing FROM public.community_profiles WHERE user_id = v_uid;
  v_is_new := NOT FOUND;
  -- Product review 2026-09-06 (findings 1-2): on an UPDATE, a key that is
  -- absent from the payload keeps its current value; a key sent as null
  -- clears it. Edit profile and the privacy screen send only the fields
  -- they own, and a full-replace contract made every such save fail on
  -- handle_invalid.
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
      'visibility',    v_existing.visibility
    ) || coalesce(_p, '{}'::jsonb);
  END IF;

  IF NOT v_is_new AND v_existing.status = 'suspended' THEN
    RAISE EXCEPTION USING message = 'profile_suspended';
  END IF;

  -- Handle.
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

  -- Display name, bio, avatar. Free text goes through the keyword filter.
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

  -- Styles: at most three chosen keys. The key SHAPE is enforced here; the
  -- list of offered styles is the app's (SD-05, "chosen, not inferred"), and a
  -- key that is not offered simply never appears in any dimension.
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

  -- Review 35 finding 2: once the picker has set gym_id, the trigger
  -- (Part 5) is the sole owner of gym_key/gym_label -- this function never
  -- re-derives or re-validates them, so a catalogue name the picker wrote
  -- can never fail THIS function's own 60-character cap or blocked-terms
  -- check on a later, unrelated save (a privacy toggle, a re-consent).
  IF v_existing.gym_id IS NOT NULL THEN
    v_gym_label := v_existing.gym_label;
    v_gym_key   := v_existing.gym_key;
  ELSE
    v_gym_label := nullif(btrim(coalesce(_p ->> 'gym_label', '')), '');
    IF v_gym_label IS NOT NULL THEN
      v_gym_label := public._community_clean_text(v_gym_label);
      IF length(v_gym_label) > 60 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      -- A gym key is scoped by area, so two same-named chain branches in
      -- different towns are different gyms and never merge into one
      -- dimension.
      v_gym_key := nullif(coalesce(v_area_key, '') || ':' || public._community_fold(v_gym_label), ':');
    END IF;
  END IF;

  v_visibility := coalesce(nullif(btrim(coalesce(_p ->> 'visibility', '')), ''), 'public');
  IF v_visibility NOT IN ('public', 'followers') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- The minor rule runs on EVERY call, not only on create, so a birthday or a
  -- corrected date of birth is honoured the next time the profile is saved.
  v_minor := public._community_minor(v_uid);
  IF v_minor THEN v_visibility := 'followers'; END IF;

  -- The rate check runs LAST, after every validation, so a rejected save
  -- (a taken handle, a name that fails the filter) does not spend one of the
  -- day's five.
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
      user_id, handle, display_name, avatar_preset, bio, styles, goal, setting,
      area_label, area_key, gym_label, gym_key, visibility, is_minor, status,
      rules_version, last_active_at)
    VALUES (
      v_uid, v_handle, v_display, v_avatar, v_bio, v_styles, v_goal, v_setting,
      v_area_label, v_area_key, v_gym_label, v_gym_key, v_visibility, v_minor,
      'active', public._community_rules_version(), now());

    -- Article 6(1)(a) record on the existing append-only rail.
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

    -- Re-consent (rules version 2). An absent key changes nothing; a version
    -- that is not the current one is bad input rather than a silent no-op.
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

    -- Also runs on update: a partner who joined AFTER this user did becomes a
    -- mutual follow the next time either of them saves a profile.
    PERFORM public._community_convert_partnerships(v_uid);
  END IF;

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

-- Lead addition (a): _community_profile_card carries gym_id wherever it
-- already carries gym_label, under the SAME v_viewable gate (self, public,
-- or accepted follower -- nothing about where a followers-only or minor
-- profile trains leaks any wider than gym_label already did), plus
-- other_gym_ids for the SELF view only (_viewer = _uid), since "other
-- gyms" is used to power the caller's own Find People matching (lead
-- addition (b) below) and is not a fact anyone else needs read back.
-- Everything else is migrate_161's body, verbatim.
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
BEGIN
  SELECT * INTO p FROM public.community_profiles WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Security review 2026-09-06 (finding 12): a suspended profile has no
  -- card for anyone but itself.
  IF p.status = 'suspended' AND _viewer <> _uid THEN RETURN NULL; END IF;
  v_viewable := public._community_can_view(_viewer, _uid);

  SELECT f.state INTO v_following
  FROM public.community_follows f
  WHERE f.follower_id = _viewer AND f.followee_id = _uid;

  RETURN jsonb_build_object(
    'user_id',         p.user_id,
    'handle',          p.handle,
    'display_name',    p.display_name,
    'avatar_preset',   p.avatar_preset,
    'bio',             p.bio,
    -- Security review 2026-09-06 (finding 5): the chosen facts travel only
    -- to someone who may view the profile (self, public, or accepted
    -- follower). A followers-only card, and so every minor's card, is
    -- handle, name, avatar, bio and counts. Nothing about where they train.
    'styles',          CASE WHEN v_viewable THEN to_jsonb(p.styles) ELSE '[]'::jsonb END,
    'goal',            CASE WHEN v_viewable THEN p.goal END,
    'setting',         CASE WHEN v_viewable THEN p.setting END,
    'area_label',      CASE WHEN v_viewable THEN p.area_label END,
    'gym_id',          CASE WHEN v_viewable THEN p.gym_id END,
    'gym_label',       CASE WHEN v_viewable THEN p.gym_label END,
    'visibility',      p.visibility,
    'follower_count',  p.follower_count,
    'following_count', p.following_count,
    -- Discovery campaign (blueprint section 11).
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
    -- Lead addition (a): the caller's OWN other gyms, never a viewer's.
    'other_gym_ids',    CASE WHEN _viewer = _uid THEN to_jsonb(p.other_gym_ids) END,
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

-- Lead addition (b): 'gym' mode also matches a person whose other_gym_ids
-- contains the VIEWER's gym_id (reason "Also trains at your gym", score
-- 2); the primary gym_key match stays first and stays worth 3. No
-- privacy predicate changes: the row-selection WHERE clause below keeps
-- every 161 predicate (active, public, not minor, not blocked, not
-- already connected) and only widens WHICH gym_key/other_gym_ids
-- combination counts as a 'gym'-mode match. Everything else is
-- migrate_161's body, verbatim.
CREATE OR REPLACE FUNCTION public.community_find_people(
  _mode text DEFAULT 'like_me', _cursor text DEFAULT NULL, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := public._community_caller();
  v_lim     int  := public._community_limit(_limit);
  v_off     int  := 0;
  v_me      public.community_profiles%ROWTYPE;
  v_key     text;
  v_label   text;
  v_count   int := 0;
  v_row     record;
  v_score   int;
  v_reasons text[];
  v_items   jsonb[] := ARRAY[]::jsonb[];
  v_out     jsonb := '[]'::jsonb;
  v_style   text;
  v_band    text;
  v_days    text[];
  v_mconn   int;
  v_mfoll   int;
  v_lifts   int;
  v_total   int;
BEGIN
  IF _mode IS NULL OR _mode NOT IN
     ('like_me', 'gym', 'area', 'programme', 'partners', 'might_know') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_me := public._community_require_profile(v_uid, false);
  -- Security review 2026-09-06 (finding 10): the most expensive read in this
  -- file, up to 300 profiles with four correlated subqueries each, had no
  -- rail at all.
  PERFORM public._community_rate_check(v_uid, 'find_people', 120, 120, interval '1 hour');

  IF _cursor IS NOT NULL AND btrim(_cursor) <> '' THEN
    IF btrim(_cursor) !~ '^[0-9]{1,6}$' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    v_off := btrim(_cursor)::int;
  END IF;

  IF _mode = 'gym' THEN
    v_key := v_me.gym_key; v_label := v_me.gym_label;
  ELSIF _mode = 'area' THEN
    v_key := v_me.area_key; v_label := v_me.area_label;
  ELSIF _mode = 'programme' THEN
    v_key := v_me.tp_programme_key;
    IF v_key LIKE 'style:%' THEN
      v_label := public._community_style_label(substring(v_key FROM 7));
    -- Security review 2026-09-06 (finding 2): the label must re-ask the same
    -- "may I see this programme" predicate community_dimension already gates
    -- on, rather than reading the title with no visibility, owner-status or
    -- block check at all. `tp_programme_key` is validated at write time now
    -- (finding 8), so this is belt and braces against a value written before
    -- that validation existed.
    ELSIF v_key IS NOT NULL AND public._community_can_view_programme(v_uid, v_key::uuid) THEN
      SELECT g.title INTO v_label FROM public.community_programmes g
      WHERE g.id = v_key::uuid;
    END IF;
  ELSIF _mode = 'partners' THEN
    -- Security review 2026-09-06 (finding 5): the label must say what the
    -- scan and count actually restrict to, since the client renders this
    -- string rather than composing its own claim.
    IF coalesce((v_me.partner_prefs ->> 'same_gym_only')::boolean, false)
       AND v_me.gym_key IS NOT NULL THEN
      v_label := 'at your gym';
    ELSE
      v_label := 'in your area';
    END IF;
  END IF;

  -- An honest empty door rather than a pretend list: the row on the screen
  -- already says what would make it work (SD-28).
  IF (_mode IN ('gym', 'area', 'programme') AND v_key IS NULL)
     OR (_mode = 'partners' AND NOT coalesce(v_me.open_to_partner, false)) THEN
    RETURN jsonb_build_object(
      'mode', _mode, 'key', v_key, 'label', v_label,
      'count', 0, 'people', '[]'::jsonb, 'cursor', NULL);
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
      AND (_mode <> 'gym'       OR p.gym_key = v_key
             OR (v_me.gym_id IS NOT NULL AND v_me.gym_id = ANY (p.other_gym_ids)))
      AND (_mode <> 'area'      OR p.area_key = v_key)
      AND (_mode <> 'programme' OR (p.tp_programme_key = v_key AND p.show_programmes = true))
      AND (_mode <> 'partners'  OR p.open_to_partner = true)
      -- Security review 2026-09-06 (finding 5): "same gym only" is a stored
      -- preference (SD-25), not an unread column. A person who switched it
      -- on is listed only to callers who share their gym.
      AND (_mode <> 'partners'
           OR NOT coalesce((p.partner_prefs ->> 'same_gym_only')::boolean, false)
           OR (v_me.gym_key IS NOT NULL AND p.gym_key = v_me.gym_key))
    ORDER BY p.last_active_at DESC
    LIMIT 300
  LOOP
    v_score := 0;
    v_reasons := ARRAY[]::text[];

    IF v_me.gym_key IS NOT NULL AND v_row.gym_key = v_me.gym_key THEN
      v_score := v_score + 3;
      v_reasons := v_reasons || ('Trains at ' || coalesce(v_row.gym_label, v_me.gym_label));
    -- Lead addition (b): a person who lists MY gym as one of their OTHER
    -- gyms is a weaker, but still real, signal -- worth less than the
    -- primary match above, which stays 3.
    ELSIF v_me.gym_id IS NOT NULL AND v_row.other_gym_ids IS NOT NULL
          AND v_me.gym_id = ANY (v_row.other_gym_ids) THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || 'Also trains at your gym'::text;
    END IF;

    -- Every bare reason literal is cast to text: `text[] || 'literal'`
    -- resolves to array || array against an UNKNOWN-typed literal and fails
    -- at runtime with "malformed array literal". The concatenated reasons
    -- ('Trains at ' || ...) are already text, so only the bare ones need it.
    IF v_me.tp_programme_key IS NOT NULL
       AND v_row.tp_programme_key = v_me.tp_programme_key THEN
      v_score := v_score + 3;
      v_reasons := v_reasons || 'On the same programme'::text;
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

    -- Mutual connections: two points each, capped at three.
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

    -- Mutual follows: one point each, capped at three.
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

    -- Shared bands only ever compare what BOTH people chose to share.
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
        -- Singular when there is one. The blueprint fixes the wording as
        -- "<n> staple lifts in common"; "1 staple lifts in common" is not
        -- English, and calm plain copy is a standing rule (CLAUDE.md 3).
        v_reasons := v_reasons || (v_lifts::text ||
          CASE WHEN v_lifts = 1 THEN ' staple lift in common'
               ELSE ' staple lifts in common' END);
      END IF;
    END IF;

    IF coalesce(v_me.open_to_partner, false) AND coalesce(v_row.open_to_partner, false) THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || 'Both open to training together'::text;
    END IF;

    -- Minimum score 1 for the two modes with no key of their own; a keyed
    -- door returns its matching rows even when nothing else is shared.
    IF v_score >= 1 OR _mode IN ('gym', 'area', 'programme', 'partners') THEN
      v_items := v_items || jsonb_build_object(
        'card',    public._community_profile_card(v_row.user_id, v_uid),
        'reasons', to_jsonb(v_reasons),
        'score',   v_score,
        'last_active_at', v_row.last_active_at);
    END IF;
  END LOOP;

  v_total := coalesce(array_length(v_items, 1), 0);

  SELECT coalesce(jsonb_agg(z.x ORDER BY (z.x ->> 'score')::int DESC,
                            (z.x ->> 'last_active_at')::timestamptz DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT t.x
    FROM (SELECT unnest(v_items) AS x) t
    ORDER BY (t.x ->> 'score')::int DESC, (t.x ->> 'last_active_at')::timestamptz DESC
    OFFSET v_off
    LIMIT v_lim
  ) z;

  -- The door's live count: every candidate the mode matches, before scoring.
  SELECT count(*) INTO v_count
  FROM public.community_profiles p
  WHERE p.status = 'active'
    AND p.visibility = 'public'
    AND p.is_minor = false
    AND p.user_id <> v_uid
    AND NOT public._community_is_blocked(v_uid, p.user_id)
    AND NOT public._community_is_connected(v_uid, p.user_id)
    AND (_mode <> 'gym'       OR p.gym_key = v_key
           OR (v_me.gym_id IS NOT NULL AND v_me.gym_id = ANY (p.other_gym_ids)))
    AND (_mode <> 'area'      OR p.area_key = v_key)
    AND (_mode <> 'programme' OR (p.tp_programme_key = v_key AND p.show_programmes = true))
    AND (_mode <> 'partners'  OR p.open_to_partner = true)
    AND (_mode <> 'partners'
         OR NOT coalesce((p.partner_prefs ->> 'same_gym_only')::boolean, false)
         OR (v_me.gym_key IS NOT NULL AND p.gym_key = v_me.gym_key));

  RETURN jsonb_build_object(
    'mode',   _mode,
    'key',    v_key,
    'label',  v_label,
    'count',  CASE WHEN _mode IN ('like_me', 'might_know') THEN v_total ELSE v_count END,
    'people', v_out,
    'cursor', CASE WHEN v_total > v_off + v_lim THEN (v_off + v_lim)::text END);
END $$;

-- ─── Part 10: delete_user_data() re-issued IN FULL a third time ──────────
--
-- migrate_161's body, verbatim, with `gym_submissions.submitter_id` and
-- `gym_reports.reporter_id` anonymised (the venue/report content survives,
-- the same posture `community_reports.reporter_id` already has). Re-issued
-- IN FULL for the same reason 161 re-issued 160's: this function has one
-- definition and the latest one wins, so a partial re-declaration would
-- silently drop every table the earlier version covers. CREATE OR REPLACE
-- preserves the existing ACL, so migrate_130's revoke of anon/PUBLIC
-- survives this file too.

CREATE OR REPLACE FUNCTION public.delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
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

  -- 162: the gym directory. The submission/report CONTENT is a directory
  -- fact and survives (it is what makes the venue real for other users); the
  -- link back to the deleted person does not, the same posture
  -- community_reports.reporter_id already has above.
  BEGIN UPDATE gym_submissions SET submitter_id = NULL WHERE submitter_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  -- Finding 8: a moderator's id, which this same file introduces on
  -- gym_submissions.reviewed_by, survived erasure. Anonymised alongside
  -- submitter_id above.
  BEGIN UPDATE gym_submissions SET reviewed_by = NULL WHERE reviewed_by = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN UPDATE gym_reports SET reporter_id = NULL WHERE reporter_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  -- Lead ruling 2026-09-07 (GDPR data minimisation): the history actor and
  -- the 'user' source record also carry the caller's id as text, so they are
  -- anonymised with the rows above. A pending venue whose confirmers have
  -- since deleted their accounts needs fresh, distinct confirmers, which is
  -- the conservative side.
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

-- Finding 19: this used to rely solely on CREATE OR REPLACE preserving
-- migrate_130's original revoke of PUBLIC/anon, which the contract test
-- (src/lib/__tests__/dbFunctionPrivilege.contract.test.js) confirms is
-- true in practice -- but that made this file incorrect on a genuinely
-- fresh cluster (130 never applied). A defensive revoke costs nothing.
REVOKE ALL ON FUNCTION public.delete_user_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_data() TO authenticated;

-- ─── Part 11: privileges ─────────────────────────────────────────────────
--
-- Same two-loop shape as migrate_160 Part 10 / migrate_161 Part 15, over
-- the functions THIS file declares (plus the two migrate_161 functions it
-- re-issues, restated here for readability even though CREATE OR REPLACE
-- alone would not have changed their already-granted ACL -- measured,
-- src/lib/__tests__/dbFunctionPrivilege.contract.test.js "the CREATE OR
-- REPLACE ACL claim is recorded as measured, not assumed").

DO $$
DECLARE
  sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    '_gyms_postcode_compact(text)',
    '_gyms_postcode_full_valid(text)',
    '_gyms_postcode_outward_valid(text)',
    '_gyms_outward_of(text)',
    '_gyms_sector_of(text)',
    '_gyms_distance_m(double precision, double precision, double precision, double precision)',
    '_gyms_bbox_lat_delta(double precision)',
    '_gyms_bbox_lng_delta(double precision, double precision)',
    '_gyms_geocell(double precision, double precision)',
    '_gyms_tokens_of(text, text)',
    '_gyms_token_jaccard(text[], text[])',
    '_gyms_visible(public.gym_venues, uuid)',
    '_gyms_selectable(uuid, uuid)',
    '_community_gym_key_sync()',
    -- Review 35 lead addition (a): restated here for the same reason
    -- community_gym_summary/community_gym_suggest are restated below --
    -- CREATE OR REPLACE alone does not change an already-granted ACL, and
    -- this internal helper's ACL (revoked from authenticated since
    -- migrate_161) is unchanged by this file, but pinning it here keeps
    -- the acceptance check and the guard tests honest about what this
    -- file actually re-issues.
    '_community_profile_card(uuid, uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', sig);
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'gyms_search(text, double precision, double precision, int)',
    'gyms_near(double precision, double precision, int, int)',
    'gyms_in_place(text, int)',
    'gyms_get(uuid)',
    'gyms_suggest(text, double precision, double precision)',
    'gyms_submit(jsonb)',
    'gyms_confirm_submission(uuid)',
    'gyms_report(uuid, text, text)',
    'gyms_review_submission(uuid, text, uuid)',
    'gyms_review_report(uuid, text)',
    'community_set_gyms(uuid, uuid[])',
    'community_gym_summary(text)',
    'community_gym_suggest(text, text)',
    -- Review 35 fixes F2 and lead addition (b): restated for the same
    -- readability/honesty reason as the two lines above; the ACL itself
    -- is unchanged from migrate_161.
    'community_upsert_profile(jsonb)',
    'community_find_people(text, text, int)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', sig);
  END LOOP;
END $$;

-- ─── Part 12: acceptance check ────────────────────────────────────────────
--
-- Read-only. Every table this migration adds must be present, RLS-enabled,
-- and carry exactly the policy count its disposition promises (1 for the
-- three global_read_only tables, 0 for the four rpc_only ones); every
-- function it declares must be SECURITY DEFINER with the search_path
-- pinned, executable by `authenticated` for exactly the gyms_*/
-- community_set_gyms client RPCs and by nobody for any `_gyms_*` helper or
-- `_community_gym_key_sync`; the two community_profiles columns must exist.
-- Review 35 finding 18: the function query below now also names every
-- migrate_161 function this file re-issues (community_gym_summary,
-- community_gym_suggest, community_upsert_profile, _community_profile_card,
-- community_find_people) plus delete_user_data, so a bad apply that left
-- any of them in its 161 (or, for delete_user_data, 160/161) state shows up
-- here rather than passing silently; and a table-grants query covers the
-- SELECT-only re-grant to `authenticated` the header promises, since the
-- earlier check above only proved RLS was ON, never what was GRANTed.
-- Run this after the apply and read the output before declaring the
-- migration landed.

SELECT t.table_name,
       c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'gym_brands', 'gym_venues', 'gym_venue_sources', 'gym_venue_history',
    'gym_submissions', 'gym_reports', 'gym_postcode_sectors')
ORDER BY t.table_name;

-- Finding 18: table GRANTs, not just RLS-enabled. Expect SELECT/
-- authenticated on the three catalogue tables and NOTHING for the four
-- rpc_only tables (an empty result for those four is the PASS state).
SELECT g.table_name, g.grantee, g.privilege_type
FROM information_schema.role_table_grants g
WHERE g.table_schema = 'public'
  AND g.table_name IN (
    'gym_brands', 'gym_venues', 'gym_venue_sources', 'gym_venue_history',
    'gym_submissions', 'gym_reports', 'gym_postcode_sectors')
  AND g.grantee IN ('anon', 'authenticated')
ORDER BY g.table_name, g.grantee, g.privilege_type;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'community_profiles'
  AND column_name IN ('gym_id', 'other_gym_ids')
ORDER BY column_name;

SELECT p.proname,
       p.prosecdef AS security_definer,
       p.proconfig AS settings,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname LIKE 'gyms\_%' OR p.proname LIKE '\_gyms\_%'
       OR p.proname IN (
         'community_set_gyms', '_community_gym_key_sync',
         'community_gym_summary', 'community_gym_suggest',
         'community_upsert_profile', '_community_profile_card',
         'community_find_people', 'delete_user_data'
       ))
ORDER BY p.proname;
