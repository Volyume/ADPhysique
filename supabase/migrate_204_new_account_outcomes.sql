-- migrate_204_new_account_outcomes.sql
--
-- Purpose:           LOC-661 (plan LOC-583 revision 7, section 6 "the one
--                    measure" and section 8 row 1; brief in
--                    docs/growth-totals/SPEC.md). The weekly growth totals
--                    need "new accounts that logged three workouts in their
--                    first 14 days" (the app's own activation rule,
--                    src/lib/activation.js ACTIVATION_TARGET_SESSIONS = 3,
--                    ACTIVATION_WINDOW_DAYS = 14) and "still training after
--                    7, 14 and 30 days". telemetry_weekly_digest() gives
--                    neither: v_activation_by_path has a first workout within
--                    7 days and "active" (any visit) after day N, as rounded
--                    percentages, and nothing per app version.
--                    This is the smallest read-only addition: one aggregate
--                    view and one function that returns it, both service
--                    role only, reading only engine_telemetry through the
--                    existing v_user_signups (migrate_200): the same records
--                    and the same sign-up moment as the digest. One row per
--                    sign-up week and app version at sign-up, counts only:
--                    no person, no identifier, nothing about safety
--                    (ed_pattern_flags is not read).
--                    Definitions:
--                     - signed up: v_user_signups.signed_up_at (the
--                       account_created event, else the first event seen);
--                     - app version at sign-up: the version stamped on the
--                       account_created event, else on the first event;
--                     - a workout: a workout_completed event, counted by
--                       when it was recorded (activation.js counts by the
--                       workout's start, so a workout started just before
--                       day 14 and finished after it counts here as later);
--                     - three_workouts_14d and window_14d_closed count only
--                       people whose 14 days are over;
--                     - trained_after_day_N: a workout recorded on or after
--                       day N, among the people who signed up more than N
--                       days ago (eligible_day_N).
--                    Only people who share usage data appear, as in every
--                    digest view (Settings > Privacy & legal > Share usage
--                    data).
--
-- Applied locally:   no (cloud-only objects)
-- Applied remotely:  NOT APPLIED. Written 2026-11-21 for the founder to apply
--                    with "run against production 204". Until then the weekly
--                    totals report this section as "not_applied".
-- Safe to re-run:    yes (CREATE OR REPLACE VIEW, CREATE OR REPLACE FUNCTION,
--                    REVOKE and GRANT are idempotent). Read only: no table,
--                    row or existing object is changed.
-- Rollback:          DROP FUNCTION public.telemetry_new_account_outcomes(int);
--                    DROP VIEW public.v_new_account_outcomes;
-- Depends on:        200 (engine_telemetry views, v_user_signups).

CREATE OR REPLACE VIEW public.v_new_account_outcomes AS
WITH version_at_signup AS (
  SELECT DISTINCT ON (e.user_id) e.user_id,
         COALESCE(e.payload_json->>'app_version', 'unknown') AS app_version
  FROM public.engine_telemetry e
  ORDER BY e.user_id, (e.event = 'account_created') DESC, e.occurred_at
),
per_person AS (
  SELECT u.user_id, u.signed_up_at,
    (SELECT count(*) FROM public.engine_telemetry w
      WHERE w.user_id = u.user_id AND w.event = 'workout_completed'
        AND w.occurred_at >= u.signed_up_at
        AND w.occurred_at < u.signed_up_at + interval '14 days') AS workouts_14d,
    (SELECT max(w.occurred_at) FROM public.engine_telemetry w
      WHERE w.user_id = u.user_id AND w.event = 'workout_completed') AS last_workout_at
  FROM public.v_user_signups u
)
SELECT date_trunc('week', p.signed_up_at)::date AS signup_week,
       COALESCE(v.app_version, 'unknown') AS app_version,
       count(*) AS new_accounts,
       count(*) FILTER (WHERE p.workouts_14d >= 1) AS first_workout_14d,
       count(*) FILTER (WHERE p.signed_up_at < now() - interval '14 days') AS window_14d_closed,
       count(*) FILTER (WHERE p.signed_up_at < now() - interval '14 days' AND p.workouts_14d >= 3) AS three_workouts_14d,
       count(*) FILTER (WHERE p.signed_up_at < now() - interval '7 days') AS eligible_day_7,
       count(*) FILTER (WHERE p.signed_up_at < now() - interval '7 days'
                          AND p.last_workout_at >= p.signed_up_at + interval '7 days') AS trained_after_day_7,
       count(*) FILTER (WHERE p.signed_up_at < now() - interval '14 days') AS eligible_day_14,
       count(*) FILTER (WHERE p.signed_up_at < now() - interval '14 days'
                          AND p.last_workout_at >= p.signed_up_at + interval '14 days') AS trained_after_day_14,
       count(*) FILTER (WHERE p.signed_up_at < now() - interval '30 days') AS eligible_day_30,
       count(*) FILTER (WHERE p.signed_up_at < now() - interval '30 days'
                          AND p.last_workout_at >= p.signed_up_at + interval '30 days') AS trained_after_day_30
FROM per_person p
LEFT JOIN version_at_signup v ON v.user_id = p.user_id
GROUP BY 1, 2;

-- Service role only, like every migrate_200 view: a view runs with its
-- owner's rights, so a client role must never be able to select from it.
REVOKE ALL ON public.v_new_account_outcomes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_new_account_outcomes TO service_role;

-- One read for the weekly totals: the last `_weeks` sign-up weeks. STABLE,
-- because it only reads, so PostgREST runs it READ ONLY by GET or POST.
CREATE OR REPLACE FUNCTION public.telemetry_new_account_outcomes(_weeks int DEFAULT 8)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'weeks', _weeks,
    'new_account_outcomes', (SELECT jsonb_agg(to_jsonb(x) ORDER BY signup_week, app_version)
                             FROM v_new_account_outcomes x WHERE signup_week > current_date - (_weeks * 7))
  );
$$;
REVOKE ALL ON FUNCTION public.telemetry_new_account_outcomes(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telemetry_new_account_outcomes(int) TO service_role;
