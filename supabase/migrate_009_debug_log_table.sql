-- Migration 009: ensure debug_log_uploads table exists
--
-- The user's previous debug log dump showed:
--   ERROR: relation "debug_log_uploads" does not exist
-- coming from the delete-account RPC. That implies setup_complete.sql
-- wasn't run end-to-end on their Supabase project, and the table is
-- absent — which also means every silent auto-flush from the on-device
-- ring buffer has been failing for the duration of beta with no rows
-- ever landing in the database.
--
-- This migration creates the table, indexes, and RLS policy in
-- isolation so it can be applied standalone without re-running the
-- full setup. CREATE TABLE IF NOT EXISTS + ENABLE / DROP+CREATE
-- POLICY are all idempotent — safe to apply on a project that
-- already has it.
--
-- Apply with: Supabase Dashboard → SQL Editor → New query → paste → Run.

CREATE TABLE IF NOT EXISTS debug_log_uploads (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  device_id TEXT,                  -- @volyume_local_user_id when no auth
  ts BIGINT NOT NULL,              -- ms since epoch from the device clock
  level TEXT NOT NULL,             -- 'error' | 'warn' | 'info'
  scope TEXT,
  message TEXT,
  stack TEXT,
  context TEXT,
  app_version TEXT,
  platform TEXT,                   -- 'android' | 'ios' | 'web'
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debug_log_uploads_uploaded ON debug_log_uploads(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_log_uploads_user_ts  ON debug_log_uploads(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_debug_log_uploads_level    ON debug_log_uploads(level, uploaded_at DESC);

ALTER TABLE debug_log_uploads ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can INSERT. Reads are service-role only,
-- which means rows are visible from the Supabase dashboard but not from
-- the client SDK using anon or user JWTs. This keeps log shipping
-- frictionless for local-only users while preventing other users from
-- reading each other's logs.
DROP POLICY IF EXISTS "Anyone can insert debug logs" ON debug_log_uploads;
CREATE POLICY "Anyone can insert debug logs" ON debug_log_uploads
  FOR INSERT WITH CHECK (true);

-- After applying:
--   1. Open the app and trigger any action (sign-in, workout start, etc.)
--   2. Background it (home button) — App.js's AppState 'active' handler
--      will run flushDebugLogs on next foreground.
--   3. Foreground it. Go to Settings → Debug logs. The new status row
--      at the top will show "Cloud backup OK — N entries shipped" if
--      the upload reached Supabase, or the exact error if not.
--   4. Verify in Dashboard → Table Editor → debug_log_uploads. Rows
--      should appear with ts / level / scope / message matching the
--      on-device buffer.
