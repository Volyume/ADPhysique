-- Migration 039: account_deletions_log
--
-- Non-cascading audit table for account deletion events. The
-- engine_telemetry table has ON DELETE CASCADE on user_id, so any
-- account_deleted event written there would die instantly with the
-- auth.users row during the delete flow. This table intentionally
-- does NOT have a foreign key to auth.users so the row survives.
--
-- Drives TELEMETRY_DASHBOARDS_LOCKED.md Panel 8:
--   - "Open account deletion queue depth" = COUNT(*) WHERE completed_at IS NULL
--   - "Account deletion queue stuck" alert = age(initiated_at) > 48h AND completed_at IS NULL
--   - "Consent withdrawal → account deletion completed" ratio against
--     the reason column (the consent_log table also cascades, so we
--     capture the withdrawal context here at delete time)
--
-- Written by the delete-account Edge Function via service-role key.
-- No client-side INSERT policy (RLS denies all by default), so no
-- caller can spoof a deletion event. Read access stays
-- service-role-only too; the dashboard reads via the analytics SQL
-- role (Supabase Studio).
--
-- FTC HBNR + UK GDPR: stores the user's email at deletion time so
-- the breach-notification obligation can be satisfied without
-- needing the dead auth.users row. Email is PII and retained
-- indefinitely; this is an acceptable trade-off for compliance.
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE TABLE IF NOT EXISTS account_deletions_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  user_email      text,
  initiated_at    timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  reason          text,
  source          text NOT NULL DEFAULT 'in_app',
  app_version     text,
  platform        text
);

CREATE INDEX IF NOT EXISTS idx_account_deletions_log_open
  ON account_deletions_log(initiated_at DESC)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_account_deletions_log_user
  ON account_deletions_log(user_id, initiated_at DESC);

ALTER TABLE account_deletions_log ENABLE ROW LEVEL SECURITY;

-- No policies. RLS denies all access for anon/authenticated roles;
-- only the service-role key (used by the delete-account Edge
-- Function and analytics SQL) bypasses RLS.

DROP POLICY IF EXISTS "deny all on account_deletions_log" ON account_deletions_log;

-- ─────────────────────────────────────────────────────────────────────
-- record_account_deletion_started: called by the Edge Function with
-- the service-role client AFTER delete_user_data() succeeds and
-- BEFORE auth.admin.deleteUser() runs. Returns the new row id so
-- the function can update completed_at after the auth delete lands.
-- ─────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS record_account_deletion_started(uuid, text, text, text, text, text) CASCADE;

CREATE FUNCTION record_account_deletion_started(
  _user_id     uuid,
  _user_email  text,
  _reason      text DEFAULT NULL,
  _source      text DEFAULT 'in_app',
  _app_version text DEFAULT NULL,
  _platform    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO account_deletions_log
    (user_id, user_email, reason, source, app_version, platform)
  VALUES (_user_id, _user_email, _reason, _source, _app_version, _platform)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- Service role only. No GRANT to authenticated; the Edge Function
-- runs with the service role for this step.
REVOKE EXECUTE ON FUNCTION record_account_deletion_started(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION record_account_deletion_started(uuid, text, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION record_account_deletion_started(uuid, text, text, text, text, text) FROM anon;

-- ─────────────────────────────────────────────────────────────────────
-- record_account_deletion_completed: called immediately after
-- auth.admin.deleteUser() returns successfully. Sets completed_at so
-- the queue depth dashboard goes back to zero.
-- ─────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS record_account_deletion_completed(uuid) CASCADE;

CREATE FUNCTION record_account_deletion_completed(
  _row_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE account_deletions_log
  SET completed_at = now()
  WHERE id = _row_id AND completed_at IS NULL;
  RETURN FOUND;
END $$;

REVOKE EXECUTE ON FUNCTION record_account_deletion_completed(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION record_account_deletion_completed(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION record_account_deletion_completed(uuid) FROM anon;
