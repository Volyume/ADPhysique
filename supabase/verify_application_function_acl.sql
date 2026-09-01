-- Deployment-time proof for the hosted Supabase application-owner model.
-- Read/catalog assertions are followed by throwaway functions in a transaction
-- that is always rolled back. No probe object or data survives this script.

\if :{?ON_ERROR_STOP}
\else
\set ON_ERROR_STOP on
\endif

BEGIN;

DO $guard$
BEGIN
  IF current_user <> 'postgres' OR session_user <> 'postgres' THEN
    RAISE EXCEPTION 'Volyume migrations must run as postgres (current=%, session=%)',
      current_user, session_user USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'private')
      AND pg_get_userbyid(p.proowner) <> 'postgres'
  ) THEN
    RAISE EXCEPTION 'public/private application functions must be owned by postgres'
      USING ERRCODE = '42501';
  END IF;
END
$guard$;

CREATE FUNCTION public._volyume_function_acl_probe()
RETURNS void LANGUAGE sql AS 'SELECT';

CREATE FUNCTION private._volyume_function_acl_probe()
RETURNS void LANGUAGE sql AS 'SELECT';

DO $probe$
BEGIN
  IF has_function_privilege('anon', 'public._volyume_function_acl_probe()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._volyume_function_acl_probe()', 'EXECUTE') THEN
    RAISE EXCEPTION 'new public function is client-executable by default'
      USING ERRCODE = '42501';
  END IF;
  IF NOT has_function_privilege('service_role', 'public._volyume_function_acl_probe()', 'EXECUTE') THEN
    RAISE EXCEPTION 'new public function lost the intended service_role default'
      USING ERRCODE = '42501';
  END IF;
  IF has_function_privilege('anon', 'private._volyume_function_acl_probe()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'private._volyume_function_acl_probe()', 'EXECUTE') THEN
    RAISE EXCEPTION 'new private function is client-executable by default'
      USING ERRCODE = '42501';
  END IF;
END
$probe$;

ROLLBACK;
