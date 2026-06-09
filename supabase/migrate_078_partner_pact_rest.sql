-- ════════════════════════════════════════════════════════════════════
-- Migration 078: Training Partners — Shared Weekly Pact + rest weeks
-- ════════════════════════════════════════════════════════════════════
--
-- Two evidence-led upgrades (phase2-06 §2, founder-approved 2026-06-09):
--
-- 1. SHARED WEEKLY PACT. Dyadic-accountability research finds the largest
--    effect when partners hold the SAME goal (not parallel ones). A circle can
--    now carry one shared weekly session target (`pact_sessions`). Any active
--    member may set or clear it (small consensual circles); it feeds each
--    member's sessions_planned display, nothing else. No new personal data.
--
-- 2. REST WEEKS COUNT. A deliberate recovery week (the app's own coach
--    suggested a deload) must not read as a broken chain — rest is training.
--    `is_rest_week` lets the client mark the CURRENT week as deliberate rest;
--    the streak walk and the terminal label then treat it as kept ('rest',
--    shown as "resting well", never 'quiet'). The flag carries no coaching
--    detail (no phase, no reason) — the same privacy envelope as before.
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending founder apply)
-- Safe to re-run:                    YES (IF NOT EXISTS / OR REPLACE; the one
--                                    DROP is conditional on the old signature)
-- Rollback:                          re-apply 077's publish/streak/finalise
--                                    bodies; ALTER TABLE ... DROP COLUMN
--                                    pact_sessions / is_rest_week.
-- Depends on:                        075 (tables), 077 (rollover functions).
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.partner_circles
  ADD COLUMN IF NOT EXISTS pact_sessions int
  CHECK (pact_sessions IS NULL OR (pact_sessions BETWEEN 1 AND 7));

ALTER TABLE public.partner_weekly_signal
  ADD COLUMN IF NOT EXISTS is_rest_week boolean NOT NULL DEFAULT false;

-- ── Shared pact setter ────────────────────────────────────────────────
-- Members have no UPDATE policy on partner_circles (by design), so the pact
-- is set through a SECURITY DEFINER RPC that enforces active membership.
CREATE OR REPLACE FUNCTION public.set_circle_pact(p_circle uuid, p_sessions int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE circle_id = p_circle AND user_id = v_uid AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;
  IF p_sessions IS NOT NULL AND (p_sessions < 1 OR p_sessions > 7) THEN
    RAISE EXCEPTION 'invalid_pact';
  END IF;
  UPDATE public.partner_circles SET pact_sessions = p_sessions WHERE id = p_circle;
END;
$$;

REVOKE ALL ON FUNCTION public.set_circle_pact(uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.set_circle_pact(uuid, int) TO authenticated;

-- ── Streak walk: a rest week is a kept week ──────────────────────────
CREATE OR REPLACE FUNCTION private.partner_streak(p_uid uuid, p_week date)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak int := 0;
  v_cur date := p_week;
  v_done int;
  v_rest boolean;
BEGIN
  LOOP
    SELECT sessions_done, is_rest_week INTO v_done, v_rest
    FROM public.partner_weekly_signal
    WHERE user_id = p_uid AND iso_week = v_cur;
    IF NOT FOUND OR (COALESCE(v_done, 0) < 1 AND NOT COALESCE(v_rest, false)) THEN
      EXIT;
    END IF;
    v_streak := v_streak + 1;
    v_cur := v_cur - interval '7 days';
  END LOOP;
  RETURN v_streak;
END;
$$;

-- ── Terminal label: deliberate rest beats 'quiet' ────────────────────
CREATE OR REPLACE FUNCTION private.partner_finalise_week(p_uid uuid, p_week date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_done int;
  v_planned int;
  v_rest boolean;
BEGIN
  SELECT sessions_done, sessions_planned, is_rest_week
    INTO v_done, v_planned, v_rest
  FROM public.partner_weekly_signal
  WHERE user_id = p_uid AND iso_week = p_week;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.partner_weekly_signal
  SET status = CASE
        WHEN v_planned > 0 AND v_done >= v_planned THEN 'on_track'
        WHEN v_done >= 1 THEN 'easy'
        WHEN COALESCE(v_rest, false) THEN 'rest'
        ELSE 'quiet'
      END
  WHERE user_id = p_uid AND iso_week = p_week;
END;
$$;

-- ── Publish: gains the rest-week flag ────────────────────────────────
-- The signature changes (int) -> (int, boolean): drop the old overload first
-- so PostgREST RPC dispatch stays unambiguous. Old clients calling with only
-- p_sessions_planned still match via the default.
DROP FUNCTION IF EXISTS public.publish_my_weekly_signal(int);

CREATE OR REPLACE FUNCTION public.publish_my_weekly_signal(
  p_sessions_planned int DEFAULT 0,
  p_rest_week boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_week    date := date_trunc('week', now())::date;     -- Monday anchor
  v_prev    date := (date_trunc('week', now()) - interval '7 days')::date;
  v_done    int;
  v_planned int := GREATEST(COALESCE(p_sessions_planned, 0), 0);
  v_status  text;
  v_streak  int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM private.partner_finalise_week(v_uid, v_prev);

  SELECT count(*) INTO v_done FROM public.workouts
  WHERE user_id = v_uid AND is_completed = true
    AND started_at >= v_week AND started_at < v_week + interval '7 days'
    AND COALESCE(duration_minutes, 0) >= 10;

  -- Live-week label stays non-shaming; a declared rest week reads as 'rest'.
  IF v_planned > 0 AND v_done >= v_planned THEN
    v_status := 'on_track';
  ELSIF COALESCE(p_rest_week, false) AND v_done = 0 THEN
    v_status := 'rest';
  ELSE
    v_status := 'in_progress';
  END IF;

  v_streak := private.partner_streak(v_uid, v_prev);

  INSERT INTO public.partner_weekly_signal
    (user_id, iso_week, sessions_done, sessions_planned, streak_weeks, status, is_rest_week, server_updated_at)
  VALUES (v_uid, v_week, v_done, v_planned, v_streak, v_status, COALESCE(p_rest_week, false), now())
  ON CONFLICT (user_id, iso_week) DO UPDATE
    SET sessions_done     = excluded.sessions_done,
        sessions_planned  = excluded.sessions_planned,
        streak_weeks      = excluded.streak_weeks,
        status            = excluded.status,
        is_rest_week      = excluded.is_rest_week,
        server_updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.publish_my_weekly_signal(int, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.publish_my_weekly_signal(int, boolean) TO authenticated;

-- Verification (run after apply):
--   1. set_circle_pact(circle, 3) as a member -> partner_circles.pact_sessions = 3;
--      as a non-member -> 'not_a_member'.
--   2. publish_my_weekly_signal(0, true) with no sessions -> status 'rest'.
--   3. A prior 'rest' week does not break private.partner_streak.
--   4. Old-style rpc('publish_my_weekly_signal', { p_sessions_planned: 3 })
--      still works (default p_rest_week = false).
