-- migrate_122_marketing_admins_self_read.sql
--
-- RENUMBERED:       applied to production 2026-07-12 under the historical
--                   name migrate_121_marketing_admins_self_read; renumbered after a parallel
--                   migrate_119 landed on main. Do not re-apply; the DDL is
--                   idempotent so an accidental re-run is harmless.
--
-- Purpose:          Allow a signed-in user to read THEIR OWN row (and only
--                   their own row) in marketing_admins, so the dashboard's
--                   requireMarketingAdmin() check can confirm membership.
--                   Without this, marketing_admins returns no rows to any
--                   authenticated session (migrate_120 deliberately created
--                   no authenticated policy), which locks the founder out of
--                   the marketing dashboard as well. Non-admins still see
--                   nothing: the policy only ever exposes a row whose email
--                   equals the caller's own JWT email claim, so a user learns
--                   only whether they themselves are an admin, never who the
--                   admins are. Additive only. Spec:
--                   marketing/hq/DATA-SCHEMA.md section 1a.
--
-- Applied locally:  NO -- cloud-only marketing table, no local equivalent.
-- Applied remotely: YES -- applied to production (project
--                   sujrylzzxcqxxfygptns) on 2026-07-12 on the founder's
--                   "run against production" instruction.
-- Safe to re-run:   YES (idempotent). DROP POLICY IF EXISTS before CREATE
--                   POLICY; GRANT is idempotent by nature.
-- Rollback:         DROP POLICY marketing_admins_self_read ON
--                   public.marketing_admins; REVOKE SELECT ON
--                   public.marketing_admins FROM authenticated;

DROP POLICY IF EXISTS marketing_admins_self_read ON public.marketing_admins;
CREATE POLICY marketing_admins_self_read
  ON public.marketing_admins
  FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

GRANT SELECT ON public.marketing_admins TO authenticated;

-- Verification:
--   SELECT policyname, cmd, roles FROM pg_policies
--   WHERE tablename = 'marketing_admins';
--   -- expect marketing_admins_self_read (SELECT, {authenticated}) and
--   -- marketing_admins_service_role_all (ALL, {service_role})
