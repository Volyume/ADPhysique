-- migrate_130_revoke_anon_execute_security_definer.sql
--
-- Purpose: posture hardening from the 2026-07-27 security-advisor pass
--   (docs/TASKBOARD.md, OPEN hardening item): 34 SECURITY DEFINER functions
--   in public were executable by the anon role. The two without an
--   auth.uid() guard were verified safe in effect (allow-list gated /
--   downgrade-only), so this is not a live hole - but anon has no business
--   reaching tier/billing RPCs at all. Founder GO 2026-08-06 (multi-choice
--   ruling). Verified before writing: every RPC the app calls runs with an
--   authenticated session (grep of src for .rpc( - no pre-auth callers),
--   and the deliberate anonymous surfaces (marketing_waitlist,
--   marketing_survey_responses, scan_calibration_events) are table INSERT
--   policies, not functions, so they are untouched by this.
--
-- Mechanism note: anon almost always holds EXECUTE via the implicit PUBLIC
--   grant Postgres puts on new functions, not via a direct grant - so a
--   bare REVOKE FROM anon would be a silent no-op. The loop therefore
--   revokes from PUBLIC and anon, then re-grants authenticated and
--   service_role, preserving today's behaviour for every signed-in user
--   and worker while closing only the anonymous path.
--
-- Applied locally:  n/a (grants are environment state; nothing local)
-- Applied remotely: YES 2026-08-06 (founder GO). Verified: 34 -> 0
--   anon-executable SECURITY DEFINER functions; authenticated lost nothing;
--   the service-role-only trio (record_account_deletion_*, 
--   upgrade_tier_for_user) unchanged as intended.
-- Safe to re-run:   yes (second run finds nothing anon-executable; the
--                   re-grants are idempotent)
-- Rollback:         GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO PUBLIC;
--                   per function (the DO block RAISEs NOTICE for each one it
--                   closes, so the applied run's output is the rollback list)
--
-- Future functions still arrive PUBLIC-executable (Postgres default).
-- Deliberately NOT changing ALTER DEFAULT PRIVILEGES here: that would
-- silently change what every future migration must grant and is a wider
-- decision than this ruling. Re-run this migration after any batch that
-- adds SECURITY DEFINER functions, or fold the revoke into those
-- migrations' own footers.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    RAISE NOTICE 'closed anon EXECUTE on % (PUBLIC revoked; authenticated + service_role re-granted)', fn.sig;
  END LOOP;
END $$;
