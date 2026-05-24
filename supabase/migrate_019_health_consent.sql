-- Migration 019: Article 9 health-data consent + audit log
--
-- Safe to apply now. Adds nullable columns + new table; no breaking
-- changes to old app. Old app reads users_profile unchanged; the new
-- consent columns just stay null for users who haven't ticked the
-- box yet. New app builds gate the main UI behind the consent screen.
--
-- Locked in docs/PRIVACY_CONSENT_LOCKED.md + ONBOARDING_SEQUENCE_LOCKED.md
-- Screen 3.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

-- ─────────────────────────────────────────────────────────────────────
-- users_profile gains two columns: the current consent state + when
-- it was granted. State is intentionally nullable so the existence
-- of a value (rather than its truthiness) is the "user has been
-- through the consent screen" signal. A user can revoke consent
-- later from You → Privacy; revoking sets health_data_consent=false
-- and triggers the account-delete flow under Article 17.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS health_data_consent boolean,
  ADD COLUMN IF NOT EXISTS health_data_consent_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────
-- consent_log: append-only audit trail for every grant + revoke.
-- Required per Article 9 best practice so a regulator audit can
-- trace exactly when consent was given, by whom, and from what
-- client. Rows are NEVER updated or deleted (RLS denies both); on
-- account delete the rows go with the user via FK cascade.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consent_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type    text NOT NULL CHECK (consent_type IN ('health_data', 'marketing', 'analytics')),
  granted         boolean NOT NULL,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  app_version     text,
  platform        text
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user ON consent_log(user_id, granted_at DESC);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own consent_log"  ON consent_log;
DROP POLICY IF EXISTS "Users can write own consent_log" ON consent_log;

CREATE POLICY "Users can read own consent_log"
  ON consent_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can write own consent_log"
  ON consent_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies. The audit log is append-only by
-- design; the only way a row leaves consent_log is via the FK
-- cascade when auth.users.delete fires.

-- ─────────────────────────────────────────────────────────────────────
-- record_health_consent RPC: single entry point the client calls to
-- record a consent grant or revoke. Updates users_profile + appends
-- to consent_log in one transaction so the two surfaces stay
-- consistent. Returns nothing meaningful; client checks the boolean
-- on users_profile after the call.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'record_health_consent'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION record_health_consent(
  _granted     boolean,
  _app_version text DEFAULT NULL,
  _platform    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update the live state on users_profile.
  UPDATE users_profile
  SET health_data_consent    = _granted,
      health_data_consent_at = now()
  WHERE id = uid;

  -- Append the audit row. Never updates an existing row; every
  -- grant + revoke gets its own immutable timestamped record.
  INSERT INTO consent_log (user_id, consent_type, granted, granted_at, app_version, platform)
  VALUES (uid, 'health_data', _granted, now(), _app_version, _platform);
END;
$$;

GRANT EXECUTE ON FUNCTION record_health_consent TO authenticated;
