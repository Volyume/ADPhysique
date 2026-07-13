-- migrate_126_scan_calibration_events.sql
--
-- Purpose (D81, founder order 2026-07-13): anonymous scan calibration
-- telemetry so scoring can be fine-tuned against the real user population.
-- Rows are anonymous BY CONSTRUCTION: no user id, no photo, no uri, no
-- note, no exact timestamp (day only), height/weight in 5-unit bands --
-- the stored data is not personal data (GDPR recital 26). Clients may
-- INSERT only; no client may read, update or delete. Photos and per-user
-- scan records remain device-only (this is one-way telemetry, not sync).
--
-- Status: NOT applied locally or remotely at authoring time. Applied
-- manually by the founder ("run against production" per batch).
-- Safe to re-run: yes (IF NOT EXISTS / conditional policy creation).
-- Rollback: drop policy if exists "scan_calibration_insert_only" on
--   public.scan_calibration_events; drop table if exists
--   public.scan_calibration_events;

create table if not exists public.scan_calibration_events (
  id uuid primary key default gen_random_uuid(),
  created_day date not null default current_date,
  app_version text,
  platform text,
  sex text,
  height_band text,
  weight_band text,
  score int,
  band text,
  confidence text,
  ratios jsonb,
  pose_ratios jsonb,
  quality jsonb,
  engine text,
  model_version text,
  measurement_version text
);

alter table public.scan_calibration_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'scan_calibration_events'
      and policyname = 'scan_calibration_insert_only'
  ) then
    create policy "scan_calibration_insert_only"
      on public.scan_calibration_events
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

-- Deliberately NO select/update/delete policies for clients: with RLS
-- enabled and no policy, those operations are denied. The team reads the
-- table with the service role only.
