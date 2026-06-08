-- ════════════════════════════════════════════════════════════════════
-- Migration 077: Training Partners — weekly rollover (streaks + finalisation)
-- ════════════════════════════════════════════════════════════════════
--
-- Completes the consistency signal that migration 075 left dormant:
--   * streak_weeks was always 0.
--   * the terminal end-of-week labels ('easy' = trained but under plan,
--     'quiet' = no sessions) were never assigned.
--
-- Design — no scheduler required, but a job is provided:
--   The publish RPC now does the rollover INLINE every time it runs: it
--   finalises the PREVIOUS week's terminal label and writes the current week's
--   streak (consecutive completed weeks with at least one session). This means
--   the signal stays correct from normal app usage alone, with no cron/Edge
--   dependency. A standalone public.finalise_partner_signals() is ALSO provided
--   so an operator can run a true weekly job (pg_cron / Edge Function) to
--   finalise the weeks of users who stopped opening the app — recommended for
--   GA but not required for the feature to work.
--
-- Streak definition (deterministic, never shaming):
--   The streak shown on the in-progress week counts consecutive COMPLETED weeks
--   (strictly before the current week) that had >= 1 session. The current,
--   in-flight week is NOT counted, so a quiet Monday never resets the streak
--   mid-week. When the week ends and the next publish runs, that week is
--   finalised and folds into the streak.
--
-- Terminal labels (assigned only to an ENDED week):
--   on_track  done >= planned (planned > 0)        -- left as-is
--   easy      1 <= done < planned                  -- "taking it easy"
--   quiet     done = 0                              -- neutral; never "missed"
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending founder apply)
-- Safe to re-run:                    YES (CREATE OR REPLACE only)
-- Rollback:                          re-apply migration 075's
--                                    publish_my_weekly_signal body and DROP
--                                    private.partner_streak +
--                                    public.finalise_partner_signals.
-- Depends on:                        075 (partner_weekly_signal + the publish
--                                    RPC it replaces).
-- ════════════════════════════════════════════════════════════════════

-- Consecutive completed weeks (ending at and including p_week) with >= 1
-- session, walking backwards while contiguous rows exist. Bounded by data.
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
BEGIN
  LOOP
    SELECT sessions_done INTO v_done
    FROM public.partner_weekly_signal
    WHERE user_id = p_uid AND iso_week = v_cur;
    IF NOT FOUND OR COALESCE(v_done, 0) < 1 THEN
      EXIT;
    END IF;
    v_streak := v_streak + 1;
    v_cur := v_cur - interval '7 days';
  END LOOP;
  RETURN v_streak;
END;
$$;

-- Recompute a single week row's terminal label from its own counts. Idempotent.
CREATE OR REPLACE FUNCTION private.partner_finalise_week(p_uid uuid, p_week date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_done int;
  v_planned int;
BEGIN
  SELECT sessions_done, sessions_planned INTO v_done, v_planned
  FROM public.partner_weekly_signal
  WHERE user_id = p_uid AND iso_week = p_week;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.partner_weekly_signal
  SET status = CASE
        WHEN v_planned > 0 AND v_done >= v_planned THEN 'on_track'
        WHEN v_done >= 1 THEN 'easy'
        ELSE 'quiet'
      END
  WHERE user_id = p_uid AND iso_week = p_week;
END;
$$;

-- publish_my_weekly_signal: now also finalises the previous week and writes the
-- streak. Server-authoritative session count is unchanged (real completed
-- workouts >= 10 min for the current ISO week).
CREATE OR REPLACE FUNCTION public.publish_my_weekly_signal(p_sessions_planned int DEFAULT 0)
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

  -- Finalise the previous week's terminal label (no-op if no row exists).
  PERFORM private.partner_finalise_week(v_uid, v_prev);

  SELECT count(*) INTO v_done FROM public.workouts
  WHERE user_id = v_uid AND is_completed = true
    AND started_at >= v_week AND started_at < v_week + interval '7 days'
    AND COALESCE(duration_minutes, 0) >= 10;             -- plausibility threshold

  -- Live-week label stays non-shaming.
  IF v_planned > 0 AND v_done >= v_planned THEN
    v_status := 'on_track';
  ELSE
    v_status := 'in_progress';
  END IF;

  -- Streak = consecutive COMPLETED weeks (ending at the previous week) with a
  -- session. The in-flight current week is excluded so a quiet start never
  -- resets the streak mid-week.
  v_streak := private.partner_streak(v_uid, v_prev);

  INSERT INTO public.partner_weekly_signal
    (user_id, iso_week, sessions_done, sessions_planned, streak_weeks, status, server_updated_at)
  VALUES (v_uid, v_week, v_done, v_planned, v_streak, v_status, now())
  ON CONFLICT (user_id, iso_week) DO UPDATE
    SET sessions_done     = excluded.sessions_done,
        sessions_planned  = excluded.sessions_planned,
        streak_weeks      = excluded.streak_weeks,
        status            = excluded.status,
        server_updated_at = now();
END;
$$;

-- finalise_partner_signals(): the optional weekly JOB. Finalises the terminal
-- label of the most-recently-ended ISO week for EVERY user that has a row for
-- it (covers users who didn't open the app to self-finalise via publish).
-- Returns the number of rows finalised. Intended to be invoked by the service
-- role from a pg_cron schedule or an Edge Function early each Monday (UTC).
CREATE OR REPLACE FUNCTION public.finalise_partner_signals()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev date := (date_trunc('week', now()) - interval '7 days')::date;
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT user_id FROM public.partner_weekly_signal
    WHERE iso_week = v_prev AND status IN ('in_progress','on_track')
  LOOP
    PERFORM private.partner_finalise_week(r.user_id, v_prev);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_my_weekly_signal(int) FROM public;
GRANT EXECUTE ON FUNCTION public.publish_my_weekly_signal(int) TO authenticated;
-- finalise_partner_signals is operator-only: NOT granted to authenticated. It
-- runs as the service role (cron / Edge Function) and touches every user's row.
REVOKE ALL ON FUNCTION public.finalise_partner_signals() FROM public;

-- Verification (run after apply):
--   1. publish across two weeks (simulate by inserting a prior-week row with
--      sessions_done >= 1), then SELECT streak_weeks for the current week -> 1.
--   2. A prior week with sessions_done = 0 left non-terminal becomes 'quiet'
--      after the next publish (or after finalise_partner_signals()).
--   3. SELECT public.finalise_partner_signals(); -> count of rows finalised.
--   4. finalise_partner_signals() is not callable as `authenticated`.
