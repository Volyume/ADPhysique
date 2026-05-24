-- Migrate 014: lock down the feedback dashboard views
-- ─────────────────────────────────────────────────────────────────────
--
-- migrate_013_user_feedback.sql created two views in the public schema:
--   v_feedback_weekly_digest
--   v_feedback_error_correlation
--
-- Both pull user_feedback.message and user_feedback.last_error, which
-- contain user-typed text and (potentially) Sentry-grouped error
-- messages from other users' sessions.
--
-- By default, a Postgres view runs as the view OWNER, not the calling
-- role. That means the underlying RLS on user_feedback (insert-only
-- by authenticated users) is BYPASSED on read for anyone who can
-- SELECT the view. Since both views were created in the public schema
-- and not explicitly locked down, any authenticated client could read
-- every user's feedback messages by querying the view directly.
--
-- This migration:
--   1. Sets security_invoker = true on both views so they respect the
--      calling user's RLS (Postgres 15+).
--   2. Revokes SELECT from anon + authenticated as a belt-and-braces
--      so even pre-PG15 deployments are safe.
--   3. Grants SELECT to service_role only (used by the dashboard /
--      digest scripts that should be the only readers of these views).

-- Step 1: security_invoker (Postgres 15+; ignored harmlessly on older).
DO $$
BEGIN
  BEGIN
    ALTER VIEW public.v_feedback_weekly_digest SET (security_invoker = true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'security_invoker not available, falling back to REVOKE: %', SQLERRM;
  END;
  BEGIN
    ALTER VIEW public.v_feedback_error_correlation SET (security_invoker = true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'security_invoker not available, falling back to REVOKE: %', SQLERRM;
  END;
END $$;

-- Step 2: hard-revoke read access from the API roles.
REVOKE ALL ON public.v_feedback_weekly_digest      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_feedback_error_correlation  FROM PUBLIC, anon, authenticated;

-- Step 3: only the service role (SQL editor / cron / scheduled
-- functions) gets to read these. Dashboards that need the digest
-- should run as service_role.
GRANT SELECT ON public.v_feedback_weekly_digest     TO service_role;
GRANT SELECT ON public.v_feedback_error_correlation TO service_role;
