-- ============================================================================
-- Migration 147: capability consent (CC26; CC-D18 separate granular consent)
-- ============================================================================
-- PURPOSE. A SEPARATE, granular explicit-consent record for the capability
-- purpose (ARCHITECTURE.md section 26.2; R1 L5): its withdrawal disables
-- and erases the capability lane WITHOUT touching the existing health-data
-- consent or the account. Mirrors migration 019's shape exactly: live state
-- on users_profile + an append-only consent_log row per grant/revoke, via
-- one RPC.
--
-- APPLIED LOCALLY: n/a (cloud-only; the client keeps a local flag and
-- queues this RPC through the standing pending-consent retry pattern).
-- APPLIED REMOTELY: NOT YET - founder-gated; required before any build
-- carrying the capability consent flow ships.
-- ADDITIVE: YES - one CHECK widened, two nullable columns, one new RPC.
-- SAFE TO RE-RUN: YES. ROLLBACK: drop function record_capability_consent;
-- the columns and the widened CHECK are harmless to leave.
-- GDPR NOTE: consent records themselves are ordinary accountability data
-- (R1 classification row 23); the CHECK widening adds the
-- 'capability_data' consent_type.
-- ============================================================================

-- 1. Widen the consent_type CHECK (drop + re-add; append-only log rows are
--    untouched). The re-added list is the CURRENT live list - migration
--    019's three values plus 102's 'partner_sharing' - with
--    'capability_data' appended. Omitting 'partner_sharing' here would
--    make ADD CONSTRAINT fail against existing partner consent rows.
alter table public.consent_log
  drop constraint if exists consent_log_consent_type_check;
alter table public.consent_log
  add constraint consent_log_consent_type_check
  check (consent_type in ('health_data', 'marketing', 'analytics', 'partner_sharing', 'capability_data'));

-- 2. Live state on users_profile, mirroring health_data_consent.
alter table public.users_profile
  add column if not exists capability_data_consent boolean;
alter table public.users_profile
  add column if not exists capability_data_consent_at timestamptz;

-- 3. The RPC, mirroring record_health_consent.
create or replace function public.record_capability_consent(
  _granted     boolean,
  _app_version text default null,
  _platform    text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.users_profile
  set capability_data_consent    = _granted,
      capability_data_consent_at = now()
  where id = uid;

  insert into public.consent_log (user_id, consent_type, granted, app_version, platform)
  values (uid, 'capability_data', _granted, _app_version, _platform);
end $$;

-- Acceptance check
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'record_capability_consent';
