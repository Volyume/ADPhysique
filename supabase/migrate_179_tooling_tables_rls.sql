-- migrate_179_tooling_tables_rls.sql
--
-- Purpose:           Close the one "Table publicly accessible"
--                    (rls_disabled_in_public) finding Supabase's security
--                    advisor raises for this project (the founder's
--                    Supabase email of 19 Sep 2026; audit
--                    docs/audit/community-audit-2026-09-22, side finding,
--                    proposals item 11). The two tables are the migration
--                    tooling's own ledgers, `public.claude_schema_migrations`
--                    (which migration files have run) and
--                    `public.claude_seed_files` (which seed files have run),
--                    created by `.github/workflows/deploy-migrations.yml` and
--                    `apply-named-sql.yml` with `CREATE TABLE IF NOT EXISTS`
--                    and no RLS. They hold file names and timestamps, never
--                    user data, but with RLS off and the default grants in
--                    place they were readable and writable through the
--                    project's public API by anyone holding the anon key.
--
--                    Every writer of these tables runs as the service role
--                    or through the Management API (the two workflows, and
--                    the Claude-run connector path recorded in
--                    supabase/README.md), both of which bypass RLS, so
--                    enabling RLS with no policies and revoking the client
--                    roles changes nothing for the tooling and closes the
--                    public path. Nothing in src/ or scripts/ reads either
--                    table (grep, 2026-09-23).
--
-- Applied locally:   n/a (cloud-only tooling tables; nothing in database.js)
-- Applied remotely:  NOT YET - WRITTEN 2026-09-23; waits for the founder's
--                    exact phrase "run against production" (supabase/README
--                    status block is the live record). Safe to apply on its
--                    own, ahead of 177 and 178: it depends on nothing.
-- Safe to re-run:    YES. ENABLE ROW LEVEL SECURITY and REVOKE are
--                    idempotent; IF EXISTS covers an environment where the
--                    tooling never created a table.
-- Rollback:          ALTER TABLE public.claude_schema_migrations DISABLE ROW
--                    LEVEL SECURITY; ALTER TABLE public.claude_seed_files
--                    DISABLE ROW LEVEL SECURITY; and re-grant only if a
--                    client-role reader is ever introduced (none exists).
-- Depends on:        nothing.

ALTER TABLE IF EXISTS public.claude_schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.claude_seed_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.claude_schema_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.claude_schema_migrations FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regclass('public.claude_seed_files') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.claude_seed_files FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- Acceptance (read-only; run after apply): both rows must read true, and
-- neither table may grant anything to anon or authenticated.
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('claude_schema_migrations', 'claude_seed_files');
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_schema = 'public'
--     AND table_name IN ('claude_schema_migrations', 'claude_seed_files')
--     AND grantee IN ('anon', 'authenticated');
