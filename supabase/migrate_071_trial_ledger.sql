-- ════════════════════════════════════════════════════════════════════
-- Migration 071: trial ledger (stop delete-and-restart trial abuse)
-- ════════════════════════════════════════════════════════════════════
--
-- Problem (founder direction 2026-06-08):
--   The 14-day cardless in-app trial is anchored to users_profile.trial_state,
--   keyed by auth.uid(). Account delete (delete-account Edge Function) removes
--   the users_profile row AND auth.users. A re-signup, even with the same
--   email, is a new auth.uid() with trial_state='unstarted', so start_cascade()
--   grants a fresh 14-day trial. There is no server-side guard, so a user can
--   delete and re-sign-up to get unlimited 14-day Pro trials.
--   (Google's 7-day intro trial is already one-time per Google account; only
--   our own cardless 14-day period is repeatable.)
--
-- Fix:
--   A private.trial_ledger that records a SALTED HASH of every email that has
--   consumed the cardless trial, and which deliberately SURVIVES account
--   deletion (it has no user_id and is not in delete_user_data's table list).
--   start_cascade() now checks the ledger for an 'unstarted' account: if the
--   email has already used its cardless trial, the account is moved straight to
--   the post-trial 'cascade_expired' (free) state instead of getting another 14
--   days. The first time an email trials, the hash is written to the ledger.
--
-- Privacy / lawful basis:
--   Retaining a hash after deletion is a deliberate, documented exception to
--   the "delete wipes everything" guarantee (IDENTITY_AND_OWNERSHIP_LOCKED.md
--   §E). Lawful basis: legitimate interest (preventing trial fraud). The stored
--   value is a one-way salted SHA-256 of the lowercased email and nothing else:
--   no email, no user id, no other PII. The salt is a per-deployment random
--   value in the private schema, so the hash is not a reversible/enumerable
--   bare sha256(email). Disclosed in the privacy policy (section on deletion).
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending founder apply)
-- Safe to re-run:                    YES (IF NOT EXISTS + CREATE OR REPLACE;
--                                    the salt insert is ON CONFLICT DO NOTHING
--                                    so the salt is generated once and kept)
-- Rollback:                          re-apply migration 068's start_cascade()
--                                    body and DROP the private.trial_ledger /
--                                    private.trial_salt / private.email_trial_hash
--                                    objects. (Rolling back re-opens the abuse.)
-- App-code dependency:               none required. The client already reads
--                                    trial_state/tier from the start_cascade
--                                    return and routes free users to the
--                                    paywall; a returning-trialler simply gets
--                                    trial_state='cascade_expired', tier='free'.
-- Depends on:                        068 (CURRENT start_cascade body + the
--                                    app.allow_tier_change GUC bypass) and 070
--                                    (protect trigger). NOTE: uses the GUC
--                                    bypass, NOT session_replication_role, which
--                                    is superuser-only on hosted Supabase and
--                                    threw before 068. Do not reintroduce it.
-- ════════════════════════════════════════════════════════════════════

-- pgcrypto provides digest() and gen_random_bytes(). Supabase keeps extensions
-- in the `extensions` schema; reference them schema-qualified.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

-- Per-deployment random salt so the stored value is not a bare sha256(email)
-- (which would be enumerable from a known email list). Generated once and kept.
CREATE TABLE IF NOT EXISTS private.trial_salt (
  id   int  PRIMARY KEY DEFAULT 1,
  salt text NOT NULL,
  CONSTRAINT trial_salt_singleton CHECK (id = 1)
);
INSERT INTO private.trial_salt (id, salt)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;

-- One row per email that has ever consumed the 14-day cardless trial. NO
-- user_id and NOT referenced by delete_user_data, so it survives account
-- deletion by design (abuse prevention). Lives in the private schema so it is
-- never exposed through the PostgREST API.
CREATE TABLE IF NOT EXISTS private.trial_ledger (
  email_hash     text        PRIMARY KEY,
  first_trial_at timestamptz NOT NULL DEFAULT now()
);

-- Salted one-way hash of an email. SECURITY DEFINER so it can read the salt.
CREATE OR REPLACE FUNCTION private.email_trial_hash(_email text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, extensions
AS $$
  SELECT encode(
    extensions.digest(
      lower(trim(_email)) || (SELECT salt FROM private.trial_salt WHERE id = 1),
      'sha256'
    ),
    'hex'
  );
$$;

-- ── start_cascade(): add the trial-ledger guard ──────────────────────
-- Mirrors migration 068 exactly (the current body), plus the ledger
-- check/write. The trial-column writes use the app.allow_tier_change GUC so the
-- protect trigger (migration 070) lets them through, the same bypass migration
-- 068 introduced. (session_replication_role is superuser-only on hosted
-- Supabase and threw before 068; it must not be used here.)
CREATE OR REPLACE FUNCTION start_cascade()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur_state text;
  starts_at timestamptz := now();
  ends_at timestamptz;
  user_email text;
  e_hash text;
  already_trialled boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT trial_state INTO cur_state FROM users_profile WHERE id = uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  -- Existing account that has already started its cascade: unchanged behaviour.
  IF cur_state <> 'unstarted' THEN
    RETURN jsonb_build_object(
      'trial_state', cur_state,
      'already_started', true
    );
  END IF;

  -- Trial-abuse guard (071): has THIS email already consumed the cardless
  -- trial on any prior (possibly deleted) account? Anchored on the email hash,
  -- which survives deletion. Null/blank email (should not happen for our
  -- email + OAuth signups) falls through and is granted, as before.
  SELECT email INTO user_email FROM auth.users WHERE id = uid;
  IF user_email IS NOT NULL AND length(trim(user_email)) > 0 THEN
    e_hash := private.email_trial_hash(user_email);
    SELECT EXISTS (
      SELECT 1 FROM private.trial_ledger l WHERE l.email_hash = e_hash
    ) INTO already_trialled;
  END IF;

  IF already_trialled THEN
    -- Already used the one cardless trial. Move straight to the post-trial free
    -- state so onboarding routes to the paywall (where Google decides 7-day
    -- intro vs pay-now). No second 14-day trial.
    PERFORM set_config('app.allow_tier_change', 'on', true);
    UPDATE users_profile SET
      tier = 'free',
      trial_state = 'cascade_expired',
      trial_started_at = COALESCE(trial_started_at, starts_at)
    WHERE id = uid;
    PERFORM set_config('app.allow_tier_change', 'off', true);

    INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
    VALUES (uid, 'free', 'free', 'admin', 'onboarding_article9_trial_reused');

    RETURN jsonb_build_object(
      'trial_state', 'cascade_expired',
      'tier', 'free',
      'already_trialled', true
    );
  END IF;

  -- First cardless trial for this email. 14-day in-app reverse trial (the 7-day
  -- Play intro trial is configured in Play Console, not here).
  ends_at := starts_at + interval '14 days';

  PERFORM set_config('app.allow_tier_change', 'on', true);
  UPDATE users_profile SET
    tier = 'pro',
    trial_state = 'pro_trial_active',
    trial_started_at = starts_at,
    pro_trial_ends_at = ends_at
  WHERE id = uid;
  PERFORM set_config('app.allow_tier_change', 'off', true);

  -- Record the email hash so a future delete + re-signup cannot restart it.
  IF e_hash IS NOT NULL THEN
    INSERT INTO private.trial_ledger (email_hash, first_trial_at)
    VALUES (e_hash, starts_at)
    ON CONFLICT (email_hash) DO NOTHING;
  END IF;

  INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
  VALUES (uid, 'free', 'pro_trial', 'admin', 'onboarding_article9');

  RETURN jsonb_build_object(
    'trial_state', 'pro_trial_active',
    'tier', 'pro',
    'trial_started_at', starts_at,
    'pro_trial_ends_at', ends_at
  );
END $$;

GRANT EXECUTE ON FUNCTION start_cascade() TO authenticated;

-- Verification (run after apply):
--   1. Fresh account, first ever trial:
--        SELECT start_cascade();           -- -> trial_state=pro_trial_active
--        SELECT count(*) FROM private.trial_ledger;  -- one row added
--   2. Simulate delete + re-signup with the same email: delete the account,
--      sign up again with the same email, run onboarding to Article 9:
--        SELECT start_cascade();           -- -> already_trialled=true,
--                                          --    trial_state=cascade_expired,
--                                          --    tier=free  (NO new 14 days)
--   3. The ledger is never exposed to clients (private schema) and is not
--      touched by delete_user_data, so it persists across the delete.
