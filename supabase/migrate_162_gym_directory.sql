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
--                      * `delete_user_data()` is re-issued IN FULL a third
--                        time (160 defined it, 161 re-issued it in full,
--                        this file does too) so a deleted account's
--                        `gym_submissions.submitter_id` and
--                        `gym_reports.reporter_id` are anonymised the same
--                        way `community_reports.reporter_id` already is.
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
--                    `delete_user_data()` is re-issued below to NULL both
--                    `submitter_id` and `reporter_id` for the deleted user
--                    (the submission/report content itself survives, the
--                    same posture `community_reports.reporter_id` already
--                    has) -- `community_profiles.gym_id`/`other_gym_ids`
--                    need no separate handling because the whole profile
--                    row is deleted by the existing Community block above
--                    it. It carries NO Article 9 health data: nothing in
--                    this file reads bodyweight, body composition, Progress
--                    Scan, nutrition, injuries, coaching output or
--                    check-ins.
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
    NEW.gym_label := v_display;
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
  v_raw       text := btrim(coalesce(_q, ''));
  v_is_pc     boolean := public._gyms_postcode_full_valid(v_raw)
                      OR public._gyms_postcode_outward_valid(v_raw);
  v_outward   text := public._gyms_outward_of(v_raw);
  v_toks      text[] := array_remove(
                  string_to_array(public._community_fold(v_raw), ' '), '');
  v_limit     int := least(greatest(coalesce(_limit, 40), 1), 40);
  v_lat_delta double precision;
  v_lng_delta double precision;
  v_venues    jsonb;
BEGIN
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
          OR EXISTS (SELECT 1 FROM unnest(v.tokens) t, unnest(v_toks) qt WHERE t LIKE qt || '%')
          OR EXISTS (SELECT 1 FROM unnest(coalesce(b.aliases, ARRAY[]::text[])) al
                     WHERE public._community_fold(al) = ANY (v_toks)
                        OR EXISTS (SELECT 1 FROM unnest(v_toks) qt WHERE public._community_fold(al) LIKE qt || '%'))
          OR v.town_key = ANY (v_toks)
          OR EXISTS (SELECT 1 FROM unnest(v_toks) qt WHERE v.town_key LIKE qt || '%')
        ))
      )
      AND (_lat IS NULL OR _lng IS NULL OR v.lat IS NULL OR v.lng IS NULL OR (
        v.lat BETWEEN _lat - v_lat_delta AND _lat + v_lat_delta AND
        v.lng BETWEEN _lng - v_lng_delta AND _lng + v_lng_delta
      ))
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
  v_limit     int := least(greatest(coalesce(_limit, 40), 1), 40);
  v_lat_delta double precision := public._gyms_bbox_lat_delta(v_radius);
  v_lng_delta double precision := public._gyms_bbox_lng_delta(_lat, v_radius);
  v_venues    jsonb;
BEGIN
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
  v_limit  int := least(greatest(coalesce(_limit, 60), 1), 60);
  v_venues jsonb;
BEGIN
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

  -- GD-11 client contract (src/lib/gyms/transport.js GYM_ERROR_CODES,
  -- CommunityGymAddScreen's REFUSALS map): a postcode-shaped failure is
  -- `invalid_postcode` specifically, so the screen can say "check the
  -- postcode" rather than a generic "check what you have typed"; every
  -- other field failure is the generic `invalid`.
  IF length(v_name) < 1 OR length(v_name) > 120
     OR length(v_address) < 1 OR length(v_address) > 200
     OR length(v_town) < 1 OR length(v_town) > 80 THEN
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

  -- GD-06 duplicate check: 150 m of an existing open/pending venue, OR the
  -- same postcode unit with token Jaccard >= 0.6.
  SELECT v.id, v.display_name INTO v_dup_id, v_dup_name
  FROM public.gym_venues v
  WHERE v.status IN ('open', 'pending')
    AND (
      (v.lat IS NOT NULL AND v.lng IS NOT NULL
        AND public._gyms_distance_m(v_lat, v_lng, v.lat, v.lng) <= 150)
      OR (
        v.postcode IS NOT NULL
        AND public._gyms_postcode_compact(v.postcode) = public._gyms_postcode_compact(v_postcode)
        AND public._gyms_token_jaccard(v.tokens, v_tokens) >= 0.6
      )
    )
  ORDER BY (CASE WHEN v.lat IS NOT NULL
                 THEN public._gyms_distance_m(v_lat, v_lng, v.lat, v.lng) ELSE 999999 END) ASC
  LIMIT 1;

  IF v_dup_id IS NOT NULL THEN
    RETURN jsonb_build_object('duplicate_of', v_dup_id, 'display_name', v_dup_name);
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
-- reaches the count of two this function checks for.
CREATE OR REPLACE FUNCTION public.gyms_confirm_submission(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_sub      public.gym_submissions%ROWTYPE;
  v_distinct int;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_confirm', 20, 20, interval '1 hour');

  SELECT * INTO v_sub FROM public.gym_submissions WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
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
    UPDATE public.gym_submissions SET status = 'verified', reviewed_at = now() WHERE id = _id;
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
  IF NOT EXISTS (SELECT 1 FROM public.gym_venues WHERE id = _venue_id) THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;
  PERFORM public._community_rate_check(v_uid, 'gyms_report', 10, 10, interval '24 hours');

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
    IF _merge_into IS NULL OR NOT EXISTS (SELECT 1 FROM public.gym_venues WHERE id = _merge_into) THEN
      RAISE EXCEPTION USING message = 'invalid';
    END IF;
    UPDATE public.gym_venues SET status = 'merged', succeeded_by = _merge_into WHERE id = _id;
    UPDATE public.gym_submissions
       SET status = 'merged', duplicate_of = _merge_into, reviewed_at = now(), reviewed_by = v_uid
     WHERE id = _id;
    -- GD-07: user associations survive a merge.
    UPDATE public.community_profiles SET gym_id = _merge_into WHERE gym_id = _id;
    UPDATE public.community_profiles
       SET other_gym_ids = array_replace(other_gym_ids, _id, _merge_into)
     WHERE _id = ANY (other_gym_ids);
    INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
    VALUES (gen_random_uuid(), _id, 'moderator_merge',
            jsonb_build_object('status', v_venue.status),
            jsonb_build_object('status', 'merged', 'succeeded_by', _merge_into),
            v_uid::text, now());
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

  SELECT count(*) INTO v_other_open
  FROM public.gym_reports
  WHERE venue_id = v_report.venue_id AND kind = v_report.kind AND status = 'open';

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
  v_others uuid[] := coalesce(_other_gym_ids, ARRAY[]::uuid[]);
  v_id     uuid;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  PERFORM public._community_rate_check(v_uid, 'set_gyms', 60, 60, interval '1 hour');

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
    SELECT jsonb_build_object(
             'id', gv.id, 'display_name', gv.display_name, 'venue_type', gv.venue_type,
             'town', gv.town, 'outward', gv.outward, 'postcode', gv.postcode,
             'lat', gv.lat, 'lng', gv.lng, 'status', gv.status,
             'verification_status', gv.verification_status),
           gv.display_name
      INTO v_venue, v_label
    FROM public.gym_venues gv WHERE gv.id = v_gym_uuid;
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
    SELECT (elem ->> 'id')::uuid AS id, elem ->> 'display_name' AS display_name,
      (SELECT count(*)::int FROM public.community_profiles p
        WHERE p.gym_key = 'gym:' || (elem ->> 'id')) AS member_count
    FROM jsonb_array_elements(coalesce(v_result -> 'venues', '[]'::jsonb)) elem
    LIMIT 8
  ) x;

  RETURN jsonb_build_object('gyms', v_out);
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
    '_community_gym_key_sync()'
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
    'community_gym_suggest(text, text)'
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
       OR p.proname IN ('community_set_gyms', '_community_gym_key_sync'))
ORDER BY p.proname;
