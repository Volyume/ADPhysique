-- migrate_174_community_minor_closed_rules_v3.sql
--
-- Purpose:           Two Community rulings of 2026-09-11 (D159, ruled by the
--                    lead on the founder's delegation, "the best app, never
--                    quick or easy"; docs/communities-revamp-2026-09-10/
--                    25-ONBOARDING-COMMUNITY-SPEC.md section 3; CR-15).
--
--                    Part 1, the under-18 check FAILS CLOSED. `_community_
--                    minor(_uid)` reads the caller's own
--                    `user_body_profile.date_of_birth`; migrate_160 read an
--                    absent, blank or unparseable value as "not a minor",
--                    reasoning that the app collects the age at onboarding
--                    so a gap is a data gap, not a child. A profile created
--                    before that row reached the cloud was therefore public
--                    and discoverable for a minor. It now reads as a minor
--                    until the date of birth arrives: followers-only, out of
--                    search, suggestions, cohorts, boards and groups, exactly
--                    the treatment a known minor gets (CR-08, "minors
--                    excluded everywhere"). The value is recomputed on every
--                    `community_upsert_profile` (migrate_170) AND on every
--                    hub open (`community_get_me`, migrate_161, self-heals
--                    the stored is_minor), so it corrects itself as soon as
--                    the row exists; the same recompute means an existing
--                    member whose cloud row were ever absent would read as
--                    a minor on their next open. The client half (same
--                    landing): every profile write pushes the body profile
--                    row first, an edit still runs on a failed push, and a
--                    CREATE never runs without the row (the onboarding join
--                    queues itself, the Join screen refuses calmly), because
--                    a profile created without it would be stored
--                    followers-only and the server's merge re-supplies that
--                    stored value on every later write. Verified before
--                    writing (read-only count through the connector): every
--                    existing member has a cloud date of birth, so no
--                    existing member changes state on apply.
--
--                    Part 2, the rules version is 3. The rules text moved to
--                    version 3 in the communities revamp (phase 0, CR-11) and
--                    the client accepts version 3 (`COMMUNITY_RULES_VERSION`,
--                    src/lib/community/limits.js), but
--                    `_community_rules_version()` still returned 2, so a
--                    member who accepted version 2 was never asked to
--                    re-accept the rewritten text; CR-08 requires that once.
--                    `_community_require_rules` (migrate_161) raises
--                    `rules_outdated` on the first connect, message or
--                    training-profile share from such a profile, and the
--                    client's existing updated-rules path shows the rules
--                    and calls `acceptRules()`.
--
--                    ORDER IN THE BATCH: this file runs BEFORE migrate_173.
--                    The client on main already sends version 3 on every
--                    profile write and `community_upsert_profile` requires
--                    EXACT equality with this function (migrate_170; an
--                    `invalid_input` refusal, after the rate rail is
--                    spent), so until this file is applied every Community
--                    profile create and edit fails, 173's onboarding join
--                    included. Constraint recorded for the NEXT rules bump
--                    (hostile review OJ-REV-SQL-2, F6): the gate is exact,
--                    so the migration must be applied before the build that
--                    carries the new constant ships, and before that bump
--                    the client must answer a version-mismatch refusal on
--                    a profile write with an update prompt rather than a
--                    generic error (an old build cannot show a text it does
--                    not carry). This batch is safe because no shipped build
--                    carries Community.
--
-- Applied locally:   n/a (cloud-only objects; nothing in database.js)
-- Applied remotely:  YES - 2026-09-11 22:34 UTC, FIRST in the batch (before
--                    173), under the founder's exact phrase
--                    "run against production" given 2026-09-11; Claude-run
--                    through the Supabase connector under the checksum protocol
--                    (supabase/README.md status block): one chunk, verified
--                    md5 0e2c53a320838b910941c9b9ed17b384 / 9,129 bytes (the
--                    file as applied, before this line was updated),
--                    re-checked inside the executing DO block; acceptance
--                    block passed; verified read-only afterwards (rules
--                    version 3, an unknown account reads as a minor, both
--                    functions on the pinned search_path, no existing
--                    member flagged).
-- Safe to re-run:    YES - CREATE OR REPLACE FUNCTION only; the acceptance
--                    block is read-only.
-- Rollback:          re-issue `_community_minor(uuid)` from migrate_160
--                    lines 830-861 (the fail-open body) and
--                    `_community_rules_version()` from migrate_161 lines
--                    474-482 (`SELECT 2`). No table changes.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        160 (_community_minor, user_body_profile), 161
--                    (_community_rules_version, _community_require_rules),
--                    170 (community_upsert_profile recomputes is_minor on
--                    every write).

-- ─── Part 1: the under-18 check fails closed ────────────────────────────────
-- migrate_160 lines 830-861, with the three fail-open returns turned to
-- TRUE and nothing else changed. Only a boolean is ever stored.

CREATE OR REPLACE FUNCTION public._community_minor(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_raw text;
  v_dob date;
BEGIN
  SELECT date_of_birth INTO v_raw
  FROM public.user_body_profile
  WHERE user_id = _uid
  LIMIT 1;

  -- Unknown reads as a minor until the date of birth arrives (D159).
  IF v_raw IS NULL OR btrim(v_raw) = '' THEN
    RETURN true;
  END IF;

  BEGIN
    v_dob := substring(btrim(v_raw) FROM 1 FOR 10)::date;
  EXCEPTION WHEN others THEN
    RETURN true;
  END;

  IF v_dob IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_dob > (current_date - interval '18 years');
END $$;

-- ─── Part 2: the rules version the server requires ──────────────────────────
-- migrate_161 lines 474-482 with the one value changed. A CONSENT record,
-- not a build number: bumped only because the text changed, with the
-- re-consent path already in place.

CREATE OR REPLACE FUNCTION public._community_rules_version()
RETURNS int
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 3;
$$;

-- ─── Acceptance check (read-only) ──────────────────────────────────────────

DO $$
DECLARE
  v_vol "char";
BEGIN
  IF to_regprocedure('public._community_minor(uuid)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_minor missing';
  END IF;
  IF to_regprocedure('public._community_rules_version()') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_rules_version missing';
  END IF;

  SELECT p.provolatile INTO v_vol
  FROM pg_proc p WHERE p.oid = to_regprocedure('public._community_minor(uuid)');
  IF v_vol IS DISTINCT FROM 's' THEN
    RAISE EXCEPTION 'acceptance failed: _community_minor is not STABLE';
  END IF;
  SELECT p.provolatile INTO v_vol
  FROM pg_proc p WHERE p.oid = to_regprocedure('public._community_rules_version()');
  IF v_vol IS DISTINCT FROM 'i' THEN
    RAISE EXCEPTION 'acceptance failed: _community_rules_version is not IMMUTABLE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('_community_minor', '_community_rules_version')
      -- `proconfig IS NULL` named explicitly: `= ANY (NULL)` is NULL, not
      -- false, so a function with NO SET clause would slip through.
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_174 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  -- Fail closed: an account with no body profile row reads as a minor.
  IF public._community_minor(gen_random_uuid()) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'acceptance failed: _community_minor does not fail closed';
  END IF;

  IF public._community_rules_version() IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'acceptance failed: _community_rules_version is not 3';
  END IF;

  RAISE NOTICE 'migrate_174 acceptance: OK';
END $$;
