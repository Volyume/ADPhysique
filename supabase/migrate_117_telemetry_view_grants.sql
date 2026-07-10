-- migrate_117_telemetry_view_grants.sql
--
-- Purpose:          Close the Supabase security advisor's ERROR finding
--                   (security_definer_view) on engine_telemetry_daily. The
--                   view (migrate_017) aggregates ALL users' telemetry into
--                   daily counts (day, event, event_count, user_count) and
--                   deliberately carries no RLS -- it exists for the
--                   founder's Studio access and the weekly review export.
--                   But under Supabase's default grants it was also
--                   SELECT-able by the anon and authenticated roles over
--                   PostgREST, so any app user could read cohort-level
--                   business metrics, including counts for sensitive event
--                   names such as ed_pattern_flag_fired. Aggregates only,
--                   no identities -- not a personal-data leak -- but the
--                   read belongs to Studio (postgres) and service_role
--                   only. This revokes the app-facing grants; the view's
--                   definition and the founder's Studio/reporting access
--                   are unchanged (postgres owns the view; service_role
--                   grant is re-stated explicitly for the avoidance of
--                   doubt).
-- Applied locally:  N/A -- cloud only; no local-DB analogue.
-- Applied remotely: NO -- pending; Claude-run model, applies only after the
--                   founder's exact "run against production" phrase.
-- Safe to re-run:   YES. REVOKE on an absent privilege and a repeated GRANT
--                   are both no-ops.
-- Rollback:         GRANT SELECT ON engine_telemetry_daily TO authenticated;
--                   (and TO anon) -- restores the previous exposure.

REVOKE SELECT ON public.engine_telemetry_daily FROM anon;
REVOKE SELECT ON public.engine_telemetry_daily FROM authenticated;
GRANT  SELECT ON public.engine_telemetry_daily TO service_role;
