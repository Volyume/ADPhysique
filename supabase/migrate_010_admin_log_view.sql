-- Migration 010: admin log view + dedup bookkeeping
--
-- Adds the columns + helper functions needed for the in-app admin
-- diagnostics screen (and, tomorrow, the repeated-bug email digest).
--
-- Design:
--   - dedup_key (TEXT, indexed) — stable hash of (level, scope, first
--     80 chars of message), maintained by a BEFORE INSERT/UPDATE
--     trigger. Lets us group recurrences of the same bug into a single
--     row in the admin view.
--   - notified_via_email_at (TIMESTAMPTZ) — when this dedup_key last
--     triggered a support email. Wired up tomorrow alongside the
--     domain + Edge Function. Today it's just an unused column.
--   - is_admin_email() — checks if the calling user is on the admin
--     whitelist. Email-based, not UID-based, so deleting + re-
--     registering with the same email keeps you admin.
--     Whitelist:
--       allansdouglas1983*@gmail.com  (covers + aliases for testing)
--       support@volyume.app           (ready for tomorrow's inbox)
--   - admin_get_recent_bugs(hours_back) — deduped list for the admin
--     view. Groups by dedup_key, returns occurrence count, first/last
--     seen, unique-users count, platform mix.
--   - admin_get_bug_occurrences(key, limit) — drill-in: most recent
--     N raw occurrences for a single dedup_key.
--
-- All admin functions enforce is_admin_email() server-side. A non-admin
-- calling them gets zero rows. The client-side gate (session.user.email
-- pattern match) only controls whether the UI is visible — it doesn't
-- protect data, the RPCs do.
--
-- Apply with: Supabase Dashboard → SQL Editor → paste → Run.

ALTER TABLE debug_log_uploads
  ADD COLUMN IF NOT EXISTS dedup_key TEXT,
  ADD COLUMN IF NOT EXISTS notified_via_email_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION compute_debug_log_dedup_key()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dedup_key := COALESCE(NEW.level, '') || '|'
                || COALESCE(NEW.scope, '') || '|'
                || substr(COALESCE(NEW.message, ''), 1, 80);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_debug_log_dedup_key ON debug_log_uploads;
CREATE TRIGGER set_debug_log_dedup_key
  BEFORE INSERT OR UPDATE OF level, scope, message ON debug_log_uploads
  FOR EACH ROW
  EXECUTE FUNCTION compute_debug_log_dedup_key();

-- Backfill existing rows so the admin view sees historic data grouped too.
UPDATE debug_log_uploads
   SET dedup_key = COALESCE(level, '') || '|'
                || COALESCE(scope, '') || '|'
                || substr(COALESCE(message, ''), 1, 80)
 WHERE dedup_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_debug_log_dedup_key
  ON debug_log_uploads(dedup_key, uploaded_at DESC)
  WHERE dedup_key IS NOT NULL;

-- ─── Admin whitelist ─────────────────────────────────────────────────
-- Email-based so a delete-and-reregister cycle (same email, new UID)
-- keeps admin access. Plus Gmail + aliases are honoured.

CREATE OR REPLACE FUNCTION is_admin_email()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND (
        email ILIKE 'allansdouglas1983%@gmail.com'
        OR email = 'support@volyume.app'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin_email() TO authenticated;
REVOKE EXECUTE ON FUNCTION is_admin_email() FROM anon, public;

-- ─── Admin: deduped recent bugs ──────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_get_recent_bugs(hours_back int DEFAULT 168)
RETURNS TABLE (
  dedup_key         TEXT,
  level             TEXT,
  scope             TEXT,
  sample_message    TEXT,
  occurrence_count  BIGINT,
  first_seen        TIMESTAMPTZ,
  last_seen         TIMESTAMPTZ,
  unique_users      BIGINT,
  platforms         TEXT[],
  app_versions      TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.dedup_key,
    (ARRAY_AGG(d.level    ORDER BY d.uploaded_at DESC))[1] AS level,
    (ARRAY_AGG(d.scope    ORDER BY d.uploaded_at DESC))[1] AS scope,
    (ARRAY_AGG(d.message  ORDER BY d.uploaded_at DESC))[1] AS sample_message,
    COUNT(*) AS occurrence_count,
    MIN(d.uploaded_at) AS first_seen,
    MAX(d.uploaded_at) AS last_seen,
    COUNT(DISTINCT COALESCE(d.user_id::text, d.device_id, 'unknown')) AS unique_users,
    ARRAY(SELECT DISTINCT platform FROM (
            SELECT platform FROM debug_log_uploads dd
             WHERE dd.dedup_key = d.dedup_key AND dd.platform IS NOT NULL
          ) p) AS platforms,
    ARRAY(SELECT DISTINCT app_version FROM (
            SELECT app_version FROM debug_log_uploads dd
             WHERE dd.dedup_key = d.dedup_key AND dd.app_version IS NOT NULL
          ) v) AS app_versions
  FROM debug_log_uploads d
  WHERE is_admin_email()
    AND d.uploaded_at >= NOW() - (LEAST(GREATEST(hours_back, 1), 720) * INTERVAL '1 hour')
    AND d.dedup_key IS NOT NULL
    AND d.level IN ('error', 'warn')
  GROUP BY d.dedup_key
  ORDER BY MAX(d.uploaded_at) DESC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION admin_get_recent_bugs(int) TO authenticated;
REVOKE EXECUTE ON FUNCTION admin_get_recent_bugs(int) FROM anon, public;

-- ─── Admin: occurrences for a single bug ─────────────────────────────

CREATE OR REPLACE FUNCTION admin_get_bug_occurrences(
  dedup_key_in TEXT,
  limit_n      INT DEFAULT 50
)
RETURNS TABLE (
  id           TEXT,
  uploaded_at  TIMESTAMPTZ,
  ts           BIGINT,
  level        TEXT,
  scope        TEXT,
  message      TEXT,
  context      TEXT,
  stack        TEXT,
  user_id      UUID,
  device_id    TEXT,
  app_version  TEXT,
  platform     TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, uploaded_at, ts, level, scope, message, context, stack,
         user_id, device_id, app_version, platform
  FROM debug_log_uploads
  WHERE is_admin_email()
    AND dedup_key = dedup_key_in
  ORDER BY uploaded_at DESC
  LIMIT LEAST(GREATEST(limit_n, 1), 200);
$$;

GRANT EXECUTE ON FUNCTION admin_get_bug_occurrences(text, int) TO authenticated;
REVOKE EXECUTE ON FUNCTION admin_get_bug_occurrences(text, int) FROM anon, public;
