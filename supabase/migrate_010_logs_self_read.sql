-- Migration 010: let users pull their own debug logs back out of the table
--
-- The debug_log_uploads table has an INSERT-only RLS policy (so anyone
-- can ship logs) but no SELECT policy — meaning the client SDK can't
-- read rows even for the user who owns them. That's the right default
-- (users can't read each other's logs) but it leaves a gap: a remote
-- beta tester can't pull their own logs out of the cloud to share with
-- support unless they keep them in the on-device buffer (which holds
-- only the last 200 entries).
--
-- This RPC fills that gap. SECURITY DEFINER bypasses RLS, and the
-- WHERE clause hard-locks rows to auth.uid() so a user can only ever
-- get back their own logs — no cross-user leak possible.
--
-- The client wraps this in a "Share cloud logs" button that formats the
-- result as text and opens the OS share sheet. The user picks how to
-- send (Mail, Messages, Slack, etc.) and ships them to support.
--
-- Apply with: Supabase Dashboard → SQL Editor → paste → Run.

CREATE OR REPLACE FUNCTION get_my_recent_logs(limit_n int DEFAULT 200)
RETURNS TABLE (
  ts          bigint,
  level       text,
  scope       text,
  message     text,
  stack       text,
  context     text,
  uploaded_at timestamptz,
  app_version text,
  platform    text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ts, level, scope, message, stack, context,
         uploaded_at, app_version, platform
  FROM debug_log_uploads
  WHERE user_id = auth.uid()
  ORDER BY uploaded_at DESC
  LIMIT LEAST(GREATEST(limit_n, 1), 1000);  -- clamp 1-1000
$$;

-- Only authenticated callers — anon shouldn't be able to call this
-- (and even if they could, auth.uid() would be null so no rows).
GRANT EXECUTE ON FUNCTION get_my_recent_logs(int) TO authenticated;
REVOKE EXECUTE ON FUNCTION get_my_recent_logs(int) FROM anon, public;
