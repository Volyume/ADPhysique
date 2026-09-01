-- Daybreak Blue effective RLS / RPC / ACL evidence capture.
-- READ ONLY. Run against an isolated/staging project after migrations 152-155.
-- Do not paste credential values into this file or its captured output.

begin transaction read only;

select
  n.nspname as schema_name,
  c.relname as relation_name,
  c.relkind,
  c.relrowsecurity,
  c.relforcerowsecurity,
  c.relacl
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'private')
  and c.relkind in ('r', 'p', 'v', 'm')
order by 1, 2;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname in ('public', 'private')
order by schemaname, tablename, policyname;

select
  n.nspname as schema_name,
  p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_catalog.pg_get_userbyid(p.proowner) as owner_name,
  p.prosecdef,
  p.proconfig,
  p.proacl,
  pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
order by n.nspname, p.proname, identity_arguments;

select
  n.nspname as schema_name,
  n.nspacl,
  pg_catalog.has_schema_privilege('anon', n.oid, 'USAGE') as anon_usage,
  pg_catalog.has_schema_privilege('authenticated', n.oid, 'USAGE') as authenticated_usage,
  pg_catalog.has_schema_privilege('service_role', n.oid, 'USAGE') as service_role_usage
from pg_catalog.pg_namespace n
where n.nspname in ('public', 'private')
order by n.nspname;

select
  d.defaclrole::regrole as grantor,
  coalesce(n.nspname, '<all schemas>') as schema_name,
  d.defaclobjtype,
  d.defaclacl
from pg_catalog.pg_default_acl d
left join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
order by 1, 2, 3;

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public' and tablename = 'partner_cheers'
order by policyname;

rollback;
