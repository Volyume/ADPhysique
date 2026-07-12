-- migrate_119_marketing_waitlist.sql
--
-- Purpose:          Create marketing_waitlist, the single public-facing
--                   table for the Volyume Marketing HQ: captures
--                   GDPR-consented "notify me about product updates"
--                   signups from the volyume.app marketing site. Additive
--                   only -- no existing table, column, policy or function is
--                   touched. Spec: marketing/hq/DATA-SCHEMA.md section 1.
--
-- Applied locally:  NO -- this is a cloud-only marketing table, no local
--                   SQLite equivalent exists or is planned.
-- Applied remotely: YES -- applied to production (project sujrylzzxcqxxfygptns)
--                   on 2026-07-12 by the marketing HQ founding session on
--                   the founder's "run against production" instruction.
-- Safe to re-run:   YES (idempotent). CREATE TABLE IF NOT EXISTS, CREATE
--                   UNIQUE INDEX IF NOT EXISTS, ALTER TABLE ... ENABLE ROW
--                   LEVEL SECURITY (idempotent by nature), DROP POLICY IF
--                   EXISTS before each CREATE POLICY, GRANT (idempotent by
--                   nature).
-- Rollback:         DROP TABLE marketing_waitlist; -- no app data depends
--                   on it, this table is entirely separate from the
--                   product schema.

CREATE TABLE IF NOT EXISTS public.marketing_waitlist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  consented_at  timestamptz NOT NULL DEFAULT now(),
  source        text,
  created_at    timestamptz DEFAULT now()
);

-- Case-insensitive dedupe: one signup per email regardless of casing.
CREATE UNIQUE INDEX IF NOT EXISTS marketing_waitlist_email_lower_idx
  ON public.marketing_waitlist (lower(email));

ALTER TABLE public.marketing_waitlist ENABLE ROW LEVEL SECURITY;

-- anon may insert a signup, and nothing else: no select/update/delete, so a
-- visitor can add themselves but can never read or edit their own row (or
-- anyone else's) through the public API.
DROP POLICY IF EXISTS marketing_waitlist_anon_insert ON public.marketing_waitlist;
CREATE POLICY marketing_waitlist_anon_insert
  ON public.marketing_waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- service_role: explicit full-access policy (belt-and-braces; service_role
-- already bypasses RLS, but this documents intent alongside the other
-- marketing tables and survives if RLS bypass behaviour is ever revisited).
DROP POLICY IF EXISTS marketing_waitlist_service_role_all ON public.marketing_waitlist;
CREATE POLICY marketing_waitlist_service_role_all
  ON public.marketing_waitlist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant INSERT only to anon; no SELECT/UPDATE/DELETE grant at any point.
GRANT INSERT ON public.marketing_waitlist TO anon;

-- Verification:
--   SELECT policyname, cmd, roles FROM pg_policies
--   WHERE tablename = 'marketing_waitlist';
--   -- expect marketing_waitlist_anon_insert (INSERT, {anon}) and
--   -- marketing_waitlist_service_role_all (ALL, {service_role})
--   SELECT indexname FROM pg_indexes WHERE tablename = 'marketing_waitlist';
--   -- expect marketing_waitlist_pkey and marketing_waitlist_email_lower_idx
