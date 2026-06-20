-- migrate_088: drop the open INSERT policy on debug_log_uploads (audit F-013).
--
-- setup_complete.sql created an "Anyone can insert debug logs" policy
-- (FOR INSERT WITH CHECK (true)) so anon + authenticated callers could write
-- this table. The client no longer touches it (src/lib/errorLog.js:238), so the
-- policy is an unused abuse surface: an unauthenticated caller can spam rows.
--
-- Dropping the policy leaves RLS enabled with no client INSERT policy = default
-- deny for clients; service_role still writes/reads (it bypasses RLS), so any
-- dashboard/diagnostic path is unaffected. Idempotent and table-existence
-- guarded, so it is safe whether or not the legacy table is present.
--
-- Apply to production only with the explicit "run against production" instruction.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'debug_log_uploads'
  ) THEN
    DROP POLICY IF EXISTS "Anyone can insert debug logs" ON public.debug_log_uploads;
  END IF;
END $$;
