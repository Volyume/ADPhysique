-- Migration 108: founder Pro ledger.
--
-- Purpose:
--   Founder test accounts must stay Pro forever, even after repeated account
--   deletion and re-sign-up cycles used for onboarding/testing. This mirrors
--   the private trial-ledger pattern: the public profile row can be deleted,
--   but the private entitlement ledger survives and is matched against the
--   next auth.users email.
--
-- Privacy:
--   The private ledger stores a salted hash of the lower-cased email, not the
--   email itself. The three founder emails appear only in this migration so the
--   hashes can be inserted in the target deployment.
--
-- Safe to re-run: YES (IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT).
-- Rollback:
--   DROP TRIGGER IF EXISTS users_profile_founder_pro_entitlement ON users_profile;
--   DROP FUNCTION IF EXISTS public.founder_pro_entitlement_trigger();
--   DROP FUNCTION IF EXISTS public.apply_founder_pro_entitlement(uuid, text);
--   DROP FUNCTION IF EXISTS private.is_founder_pro_user(uuid);
--   DROP FUNCTION IF EXISTS private.is_founder_pro_email(text);
--   DROP TABLE IF EXISTS private.founder_pro_ledger;
--
-- Depends on:
--   030 tier infrastructure, 068/070 trusted tier-write GUC protection, and
--   071 trial-ledger hashing. The hash/salt objects are recreated here with
--   IF NOT EXISTS / CREATE OR REPLACE so the file is tolerant of partial dev
--   schemas while preserving any existing deployment salt.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.trial_salt (
  id   int  PRIMARY KEY DEFAULT 1,
  salt text NOT NULL,
  CONSTRAINT trial_salt_singleton CHECK (id = 1)
);

INSERT INTO private.trial_salt (id, salt)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;

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

CREATE TABLE IF NOT EXISTS private.founder_pro_ledger (
  email_hash text        PRIMARY KEY,
  reason     text        NOT NULL DEFAULT 'founder_test_account',
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.founder_pro_ledger FROM PUBLIC;
REVOKE ALL ON TABLE private.founder_pro_ledger FROM anon;
REVOKE ALL ON TABLE private.founder_pro_ledger FROM authenticated;

INSERT INTO private.founder_pro_ledger (email_hash, reason)
VALUES
  (private.email_trial_hash('allansdouglas1983@gmail.com'), 'founder_test_account'),
  (private.email_trial_hash('allansdoug1983@gmail.com'), 'founder_test_account'),
  (private.email_trial_hash('allanhendy69@gmail.com'), 'founder_test_account')
ON CONFLICT (email_hash) DO UPDATE
SET reason = EXCLUDED.reason;

CREATE OR REPLACE FUNCTION private.is_founder_pro_email(_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, extensions
AS $$
  SELECT COALESCE(
    length(trim(_email)) > 0
    AND EXISTS (
      SELECT 1
      FROM private.founder_pro_ledger f
      WHERE f.email_hash = private.email_trial_hash(_email)
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION private.is_founder_pro_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT COALESCE((
    SELECT private.is_founder_pro_email(u.email)
    FROM auth.users u
    WHERE u.id = _user_id
  ), false);
$$;

REVOKE ALL ON FUNCTION private.is_founder_pro_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_founder_pro_user(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.apply_founder_pro_entitlement(
  _user_id uuid,
  _source_surface text DEFAULT 'founder_pro_entitlement'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur record;
  history_from text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'apply_founder_pro_entitlement: _user_id is required';
  END IF;

  IF NOT private.is_founder_pro_user(_user_id) THEN
    RETURN jsonb_build_object('founder_pro', false);
  END IF;

  SELECT tier, trial_state
    INTO cur
    FROM users_profile
   WHERE id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'founder_pro', true,
      'profile_found', false
    );
  END IF;

  IF cur.tier = 'pro' AND cur.trial_state = 'paid_pro' THEN
    RETURN jsonb_build_object(
      'founder_pro', true,
      'already_applied', true,
      'tier', 'pro',
      'trial_state', 'paid_pro'
    );
  END IF;

  history_from := CASE cur.trial_state
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'pro_trial_active'      THEN 'pro_trial'
    WHEN 'paid_complete'         THEN 'complete'
    WHEN 'paid_pro'              THEN 'pro'
    ELSE CASE WHEN cur.tier = 'pro' THEN 'pro' ELSE 'free' END
  END;

  PERFORM set_config('app.allow_tier_change', 'on', true);
  UPDATE users_profile
     SET tier = 'pro',
         trial_state = 'paid_pro',
         trial_started_at = NULL,
         complete_trial_ends_at = NULL,
         pro_trial_ends_at = NULL
   WHERE id = _user_id;
  PERFORM set_config('app.allow_tier_change', 'off', true);

  INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
  VALUES (_user_id, history_from, 'pro', 'admin', _source_surface);

  RETURN jsonb_build_object(
    'founder_pro', true,
    'tier', 'pro',
    'trial_state', 'paid_pro'
  );
END $$;

REVOKE ALL ON FUNCTION public.apply_founder_pro_entitlement(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_founder_pro_entitlement(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.founder_pro_entitlement_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- The entitlement helper updates users_profile itself. Avoid re-entering the
  -- trigger from that corrective write.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  PERFORM public.apply_founder_pro_entitlement(NEW.id, 'founder_pro_profile_trigger');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS users_profile_founder_pro_entitlement ON users_profile;
CREATE TRIGGER users_profile_founder_pro_entitlement
  AFTER INSERT OR UPDATE OF tier, trial_state ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.founder_pro_entitlement_trigger();

-- Backfill any currently existing founder accounts immediately.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.id
    FROM users_profile p
    JOIN auth.users u ON u.id = p.id
    WHERE private.is_founder_pro_email(u.email)
  LOOP
    PERFORM public.apply_founder_pro_entitlement(r.id, 'founder_pro_migration_backfill');
  END LOOP;
END $$;

-- Recreate start_cascade from migration 095, with one new first branch:
-- founder-ledger emails are promoted to paid_pro forever instead of entering
-- a 14-day trial or the trial-reuse refusal path.
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
  ledger_first_trial_at timestamptz := NULL;
  original_window_end timestamptz;
  founder_result jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT trial_state INTO cur_state FROM users_profile WHERE id = uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  founder_result := public.apply_founder_pro_entitlement(uid, 'onboarding_founder_pro');
  IF founder_result ->> 'founder_pro' = 'true' THEN
    RETURN jsonb_build_object(
      'trial_state', 'paid_pro',
      'tier', 'pro',
      'founder_pro', true,
      'already_started', cur_state <> 'unstarted'
    );
  END IF;

  IF cur_state <> 'unstarted' THEN
    IF cur_state = 'cascade_expired' THEN
      SELECT email INTO user_email FROM auth.users WHERE id = uid;
      IF user_email IS NOT NULL AND length(trim(user_email)) > 0 THEN
        e_hash := private.email_trial_hash(user_email);
        SELECT l.first_trial_at INTO ledger_first_trial_at
          FROM private.trial_ledger l
         WHERE l.email_hash = e_hash;
      END IF;

      IF ledger_first_trial_at IS NOT NULL THEN
        original_window_end := ledger_first_trial_at + interval '14 days';

        IF starts_at < original_window_end THEN
          PERFORM set_config('app.allow_tier_change', 'on', true);
          UPDATE users_profile SET
            tier = 'pro',
            trial_state = 'pro_trial_active',
            trial_started_at = ledger_first_trial_at,
            pro_trial_ends_at = original_window_end
          WHERE id = uid;
          PERFORM set_config('app.allow_tier_change', 'off', true);

          INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
          VALUES (uid, 'free', 'pro_trial', 'admin', 'onboarding_article9_trial_resumed');

          RETURN jsonb_build_object(
            'trial_state', 'pro_trial_active',
            'tier', 'pro',
            'trial_started_at', ledger_first_trial_at,
            'pro_trial_ends_at', original_window_end,
            'resumed', true
          );
        END IF;
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'trial_state', cur_state,
      'already_started', true
    );
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = uid;
  IF user_email IS NOT NULL AND length(trim(user_email)) > 0 THEN
    e_hash := private.email_trial_hash(user_email);
    SELECT l.first_trial_at INTO ledger_first_trial_at
      FROM private.trial_ledger l
     WHERE l.email_hash = e_hash;
  END IF;

  IF ledger_first_trial_at IS NOT NULL THEN
    original_window_end := ledger_first_trial_at + interval '14 days';

    IF starts_at < original_window_end THEN
      PERFORM set_config('app.allow_tier_change', 'on', true);
      UPDATE users_profile SET
        tier = 'pro',
        trial_state = 'pro_trial_active',
        trial_started_at = ledger_first_trial_at,
        pro_trial_ends_at = original_window_end
      WHERE id = uid;
      PERFORM set_config('app.allow_tier_change', 'off', true);

      INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
      VALUES (uid, 'free', 'pro_trial', 'admin', 'onboarding_article9_trial_resumed');

      RETURN jsonb_build_object(
        'trial_state', 'pro_trial_active',
        'tier', 'pro',
        'trial_started_at', ledger_first_trial_at,
        'pro_trial_ends_at', original_window_end,
        'resumed', true
      );
    END IF;

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

  ends_at := starts_at + interval '14 days';

  PERFORM set_config('app.allow_tier_change', 'on', true);
  UPDATE users_profile SET
    tier = 'pro',
    trial_state = 'pro_trial_active',
    trial_started_at = starts_at,
    pro_trial_ends_at = ends_at
  WHERE id = uid;
  PERFORM set_config('app.allow_tier_change', 'off', true);

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

-- Verification after apply:
--   1. Sign up with one founder email and create a users_profile row:
--        SELECT tier, trial_state FROM users_profile WHERE id = auth.uid();
--      Expected: pro / paid_pro.
--   2. Delete the account and sign up again with the same email:
--        SELECT start_cascade();
--      Expected: {"tier":"pro","trial_state":"paid_pro","founder_pro":true}.
--   3. Attempt a downgrade:
--        SELECT upgrade_tier('free', 'user_skip', 'manual_test');
--        SELECT tier, trial_state FROM users_profile WHERE id = auth.uid();
--      Expected after trigger correction: pro / paid_pro.
--   4. Confirm the private entitlement ledger is not touched by deletion:
--        SELECT private.is_founder_pro_email('allansdouglas1983@gmail.com');
--      Expected after deletion/recreate cycles: true.
