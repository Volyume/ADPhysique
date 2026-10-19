-- migrate_201_gym_challenges.sql
--
-- Purpose:           The gym challenge (docs/gym-challenge-2026-10-19/SPEC.md,
--                    founder answers 2026-10-19 in its section 0). A
--                    challenge belongs to one gym, runs for at most 31 days,
--                    scores each entrant out of 100 from the records the app
--                    already syncs, and ends in two recorded prize draws
--                    (main at 70, second at 50 by default).
--
--                    WHAT IS ADDED (all additive; nothing existing changes):
--                    * gym_challenges, gym_challenge_entrants,
--                      gym_challenge_draws, free_for_life_grants (RLS on,
--                      no policy, every grant revoked: RPC only, as every
--                      Community table).
--                    * FREE FOR LIFE (founder, 2026-10-19): joining a
--                      challenge writes a free_for_life_grants row, kept
--                      through withdrawal and challenge deletion; any future
--                      billing must honour it (docs/rules/billing.md).
--                    * _gym_challenge_phase, _gym_challenge_score (SPEC 3),
--                      _gym_challenge_name, _gym_challenge_json.
--                    * Member RPCs (authenticated): gym_challenge_lookup,
--                      gym_challenge_join, gym_challenge_withdraw,
--                      gym_challenge_set_target, gym_challenge_mine,
--                      gym_challenge_score, gym_challenge_board,
--                      gym_challenge_for_my_gym.
--                    * Public RPC (anon and authenticated):
--                      gym_challenge_public (the landing page; challenge
--                      facts and an entrant count, nothing about anyone).
--                    * Founder RPCs (service role only): gym_challenge_close,
--                      gym_challenge_results, gym_challenge_draw.
--
--                    SAFETY (SPEC 3.3, founder "Go as written"):
--                    * Food and weigh-ins score on "a row exists" only. No
--                      amount, calorie, weight or weight change is read: the
--                      only columns touched on food_entries are user_id,
--                      entry_date and deleted_at; on body_metrics user_id,
--                      metric_date, body_weight IS NOT NULL and deleted_at;
--                      on morning_weights user_id, logged_at and deleted_at.
--                    * Logging more often earns nothing: 3 food days and 1
--                      weigh-in per 7-day block.
--                    * While _community_consistency_withheld(user) is true
--                      (open ED flag or calm mode, fail closed; migrate_180)
--                      food and weigh-in score in full, the person is never
--                      listed on a board, a withheld viewer gets no board
--                      and no gym invite. They stay in the draws (founder).
--                    * Adults only: join needs an explicit 18+ answer and is
--                      refused for a Community profile marked is_minor.
--
-- Applied locally:   tested on a local Postgres 16 with stub tables (see
--                    the test notes at the end of SPEC.md).
-- Applied remotely:  NO. Founder phrase required: "run against production
--                    201". Depends on migrate_160 (_community_caller),
--                    migrate_162 (gym_venues, community_profiles.gym_id and
--                    other_gym_ids) and migrate_180
--                    (_community_consistency_withheld); all applied.
-- Safe to re-run:    yes. CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
--                    EXISTS, CREATE OR REPLACE FUNCTION, idempotent grants.
-- Rollback:          DROP FUNCTION the twelve public functions and four
--                    helpers listed above; DROP TABLE gym_challenge_draws,
--                    gym_challenge_entrants, gym_challenges (in that order).
--                    free_for_life_grants records promises made to members:
--                    never drop it without the founder's decision.
--                    Nothing else references them.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.

-- ─── Part 1: tables ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gym_challenges (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9-]{3,32}$'),
  gym_id           uuid NOT NULL REFERENCES public.gym_venues(id),
  title            text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 60),
  starts_on        date NOT NULL,
  ends_on          date NOT NULL,
  prize_main       text CHECK (prize_main IS NULL OR char_length(prize_main) <= 120),
  prize_second     text CHECK (prize_second IS NULL OR char_length(prize_second) <= 120),
  main_threshold   int  NOT NULL DEFAULT 70 CHECK (main_threshold BETWEEN 1 AND 100),
  second_threshold int  NOT NULL DEFAULT 50 CHECK (second_threshold BETWEEN 1 AND 100),
  terms_url        text CHECK (terms_url IS NULL OR terms_url ~ '^https://'),
  status           text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  closed_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on AND ends_on - starts_on <= 30),
  CHECK (second_threshold < main_threshold)
);

CREATE TABLE IF NOT EXISTS public.gym_challenge_entrants (
  challenge_id     uuid NOT NULL REFERENCES public.gym_challenges(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  joined_on        date NOT NULL,
  display_mode     text NOT NULL CHECK (display_mode IN ('name', 'handle')),
  display_name     text CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 30),
  planned_per_week int  NOT NULL DEFAULT 3 CHECK (planned_per_week BETWEEN 2 AND 6),
  consent_version  text NOT NULL,
  withdrawn_at     timestamptz,
  final_score      int,
  final_parts      jsonb,
  PRIMARY KEY (challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS gym_challenge_entrants_user_idx
  ON public.gym_challenge_entrants (user_id);

CREATE TABLE IF NOT EXISTS public.gym_challenge_draws (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id   uuid NOT NULL REFERENCES public.gym_challenges(id) ON DELETE CASCADE,
  tier           text NOT NULL CHECK (tier IN ('main', 'second')),
  drawn_at       timestamptz NOT NULL DEFAULT now(),
  eligible       jsonb NOT NULL,   -- [{user_id, score, draw_value}] in draw order
  eligible_hash  text  NOT NULL,   -- md5 of the eligible list before the draw
  winners        uuid[] NOT NULL
);

-- Free for life (founder, 2026-10-19): everyone who joins a challenge is
-- promised Volyume free for life, even if paid plans ever arrive. A row here
-- is that promise. It is written on join, never removed by withdrawal or by
-- deleting a challenge, and any future billing must honour it
-- (docs/rules/billing.md).
CREATE TABLE IF NOT EXISTS public.free_for_life_grants (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  source      text NOT NULL CHECK (source IN ('gym_challenge')),
  source_code text,
  granted_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_challenges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_for_life_grants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_challenge_entrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_challenge_draws    ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gym_challenges, public.gym_challenge_entrants, public.gym_challenge_draws,
  public.free_for_life_grants FROM PUBLIC, anon, authenticated;

-- ─── Part 2: helpers ────────────────────────────────────────────────────

-- upcoming / active / ended (window over, not yet closed) / closed / cancelled.
CREATE OR REPLACE FUNCTION public._gym_challenge_phase(_c public.gym_challenges)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN _c.status = 'cancelled' THEN 'cancelled'
    WHEN _c.status = 'closed' THEN 'closed'
    WHEN (timezone('Europe/London', now()))::date < _c.starts_on THEN 'upcoming'
    WHEN (timezone('Europe/London', now()))::date <= _c.ends_on THEN 'active'
    ELSE 'ended'
  END
$$;

-- The name an entrant chose to be shown by.
CREATE OR REPLACE FUNCTION public._gym_challenge_name(_e public.gym_challenge_entrants)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN _e.display_mode = 'name' AND _e.display_name IS NOT NULL THEN _e.display_name
    ELSE coalesce((SELECT '@' || p.handle FROM public.community_profiles p
                    WHERE p.user_id = _e.user_id AND p.handle IS NOT NULL), 'Member')
  END
$$;

-- An entrant is a minor when their Community profile says so.
CREATE OR REPLACE FUNCTION public._gym_challenge_is_minor(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce((SELECT p.is_minor FROM public.community_profiles p WHERE p.user_id = _uid), false)
$$;

-- SPEC section 3. Returns {total, parts, max, detail, withheld}. Reads only
-- the columns named in the header. Pure for a given database state.
CREATE OR REPLACE FUNCTION public._gym_challenge_score(
  _c public.gym_challenges, _e public.gym_challenge_entrants)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
SET client_min_messages = warning
AS $$
DECLARE
  v_uid       uuid := _e.user_id;
  v_start     date := greatest(_c.starts_on, _e.joined_on);
  v_end       date := _c.ends_on;
  v_days      int;
  v_t         int  := coalesce(_e.planned_per_week, 3);
  v_withheld  boolean;
  v_train_days int; v_target_days int;
  v_week_num numeric := 0; v_week_den numeric := 0; v_weeks_hit int := 0; v_weeks int := 0;
  v_post_num numeric := 0; v_posts_weeks int := 0;
  v_food_num int := 0; v_food_cap int := 0;
  v_weigh_hits int := 0;
  v_checkins int; v_w int;
  v_lifts int;
  r record;
  p_train numeric; p_week numeric; p_stronger numeric; p_comm numeric;
  p_checkin numeric; p_food numeric; p_weigh numeric;
BEGIN
  IF v_start > v_end THEN
    v_start := v_end;  -- a join on the last day still has one day
  END IF;
  v_days := v_end - v_start + 1;
  v_withheld := public._community_consistency_withheld(v_uid);

  -- Qualifying workouts (SPEC 3.1): completed, not deleted, 20 minutes or
  -- more, 6 or more working sets, reached the server within 7 days.
  CREATE TEMP TABLE IF NOT EXISTS _gc_q (workout_id uuid, d date) ON COMMIT DROP;
  TRUNCATE _gc_q;
  INSERT INTO _gc_q (workout_id, d)
  SELECT w.id, ((w.started_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/London')::date
    FROM public.workouts w
   WHERE w.user_id = v_uid
     AND w.is_completed IS TRUE
     AND w.deleted_at IS NULL
     AND w.started_at >= (v_start - 1)::timestamp
     AND w.started_at <  (v_end + 2)::timestamp
     AND w.created_at <= w.started_at + interval '7 days'
     AND coalesce(w.duration_minutes::numeric,
                  extract(epoch FROM (w.ended_at - w.started_at)) / 60) >= 20
     AND (SELECT count(*) FROM public.workout_sets s
           WHERE s.workout_id = w.id AND s.user_id = v_uid AND s.deleted_at IS NULL
             AND coalesce(s.set_type, 'straight') <> 'warmup' AND s.actual_reps > 0) >= 6;
  DELETE FROM _gc_q WHERE d < v_start OR d > v_end;

  SELECT count(DISTINCT d) INTO v_train_days FROM _gc_q;
  v_target_days := greatest(1, round(v_t * v_days / 7.0)::int);
  p_train := 40 * least(1, v_train_days::numeric / v_target_days);

  -- 7-day blocks from the person's start.
  FOR r IN
    SELECT b.bs, least(b.bs + 6, v_end) AS be,
           (least(b.bs + 6, v_end) - b.bs + 1) / 7.0 AS f
      FROM (SELECT v_start + 7 * g AS bs
              FROM generate_series(0, ((v_days - 1) / 7)) g) b
  LOOP
    v_weeks := v_weeks + 1;
    v_week_den := v_week_den + r.f;
    IF (SELECT count(DISTINCT d) FROM _gc_q WHERE d BETWEEN r.bs AND r.be)
         >= greatest(1, round(v_t * r.f)::int) THEN
      v_week_num := v_week_num + r.f; v_weeks_hit := v_weeks_hit + 1;
    END IF;
    IF EXISTS (SELECT 1 FROM public.community_posts cp
                WHERE cp.author_id = v_uid AND cp.status = 'visible'
                  AND (timezone('Europe/London', cp.created_at))::date BETWEEN r.bs AND r.be) THEN
      v_post_num := v_post_num + r.f; v_posts_weeks := v_posts_weeks + 1;
    END IF;
    v_food_cap := v_food_cap + greatest(1, round(3 * r.f)::int);
    v_food_num := v_food_num + least(greatest(1, round(3 * r.f)::int),
      (SELECT count(DISTINCT fe.entry_date) FROM public.food_entries fe
        WHERE fe.user_id = v_uid AND fe.deleted_at IS NULL
          AND fe.entry_date BETWEEN r.bs AND r.be)::int);
    IF EXISTS (SELECT 1 FROM public.body_metrics bm
                WHERE bm.user_id = v_uid AND bm.deleted_at IS NULL AND bm.body_weight IS NOT NULL
                  AND bm.metric_date BETWEEN r.bs AND r.be)
       OR EXISTS (SELECT 1 FROM public.morning_weights mw
                   WHERE mw.user_id = v_uid AND mw.deleted_at IS NULL
                     AND (timezone('Europe/London', mw.logged_at))::date BETWEEN r.bs AND r.be) THEN
      v_weigh_hits := v_weigh_hits + 1;
    END IF;
  END LOOP;

  p_week := CASE WHEN v_week_den > 0 THEN 15 * v_week_num / v_week_den ELSE 0 END;
  p_comm := CASE WHEN v_week_den > 0 THEN 10 * v_post_num / v_week_den ELSE 0 END;

  -- Get stronger (SPEC 3.2): first qualifying day's best against any later
  -- qualifying day's best, per exercise, inside the window only.
  WITH eff AS (
    SELECT s.exercise_id, q.d,
           max(CASE WHEN s.weight > 0 AND s.actual_reps BETWEEN 1 AND 12
                    THEN s.weight * (1 + s.actual_reps / 30.0) END) AS e1rm,
           max(CASE WHEN coalesce(s.weight, 0) <= 0 THEN s.actual_reps END) AS reps
      FROM _gc_q q
      JOIN public.workout_sets s ON s.workout_id = q.workout_id
     WHERE s.user_id = v_uid AND s.deleted_at IS NULL
       AND coalesce(s.set_type, 'straight') <> 'warmup' AND s.actual_reps > 0
     GROUP BY s.exercise_id, q.d
  ), firsts AS (
    SELECT DISTINCT ON (exercise_id) exercise_id, d AS first_d, e1rm AS f_e1rm, reps AS f_reps
      FROM eff ORDER BY exercise_id, d
  ), later AS (
    SELECT e.exercise_id, max(e.e1rm) AS l_e1rm, max(e.reps) AS l_reps
      FROM eff e JOIN firsts f USING (exercise_id)
     WHERE e.d > f.first_d
     GROUP BY e.exercise_id
  )
  SELECT count(*) INTO v_lifts
    FROM firsts f JOIN later l USING (exercise_id)
   WHERE (f.f_e1rm IS NOT NULL AND l.l_e1rm > f.f_e1rm)
      OR (f.f_e1rm IS NULL AND f.f_reps IS NOT NULL AND l.l_reps > f.f_reps);
  p_stronger := 3 * least(5, v_lifts);

  -- Coaching extras (SPEC 3.3).
  v_w := greatest(1, round(v_days / 7.0)::int);
  SELECT count(DISTINCT wc.week_start) INTO v_checkins
    FROM public.weekly_checkins_v2 wc
   WHERE wc.user_id = v_uid AND wc.deleted_at IS NULL
     AND (timezone('Europe/London', wc.created_at))::date BETWEEN v_start AND v_end;
  p_checkin := 10 * least(1, v_checkins::numeric / v_w);

  IF v_withheld THEN
    -- Nothing pushes logging food or weighing in while the gate is on.
    p_food := 6; p_weigh := 4;
  ELSE
    p_food  := CASE WHEN v_food_cap > 0 THEN 6 * v_food_num::numeric / v_food_cap ELSE 0 END;
    p_weigh := CASE WHEN v_weeks > 0 THEN 4 * v_weigh_hits::numeric / v_weeks ELSE 0 END;
  END IF;

  RETURN jsonb_build_object(
    'total', round(p_train + p_week + p_stronger + p_comm + p_checkin + p_food + p_weigh)::int,
    'parts', jsonb_build_object(
      'train', round(p_train, 1), 'week', round(p_week, 1), 'stronger', round(p_stronger, 1),
      'community', round(p_comm, 1), 'checkin', round(p_checkin, 1),
      'food', round(p_food, 1), 'weighin', round(p_weigh, 1)),
    'max', jsonb_build_object('train', 40, 'week', 15, 'stronger', 15, 'community', 10,
      'checkin', 10, 'food', 6, 'weighin', 4),
    'detail', jsonb_build_object(
      'training_days', v_train_days, 'target_days', v_target_days,
      'weeks_hit', v_weeks_hit, 'weeks', v_weeks, 'lifts_beaten', least(5, v_lifts),
      'posts_weeks', v_posts_weeks, 'checkins', least(v_checkins, v_w), 'checkins_target', v_w,
      'food_days', CASE WHEN v_withheld THEN NULL ELSE v_food_num END,
      'food_cap', CASE WHEN v_withheld THEN NULL ELSE v_food_cap END,
      'weighin_weeks', CASE WHEN v_withheld THEN NULL ELSE v_weigh_hits END),
    'withheld', v_withheld);
END $$;

-- An entrant's current score: frozen after close, live before.
CREATE OR REPLACE FUNCTION public._gym_challenge_entrant_score(
  _c public.gym_challenges, _e public.gym_challenge_entrants)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN _c.status = 'closed' AND _e.final_parts IS NOT NULL
              THEN _e.final_parts || jsonb_build_object('frozen', true)
              ELSE public._gym_challenge_score(_c, _e) || jsonb_build_object('frozen', false)
         END
$$;

-- Public facts about a challenge (no person, no score).
CREATE OR REPLACE FUNCTION public._gym_challenge_json(_c public.gym_challenges)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', _c.id, 'code', _c.code, 'title', _c.title,
    'gym_name', (SELECT coalesce(g.display_name, g.name) FROM public.gym_venues g WHERE g.id = _c.gym_id),
    'starts_on', _c.starts_on, 'ends_on', _c.ends_on,
    'status', public._gym_challenge_phase(_c),
    'days_left', greatest(0, _c.ends_on - (timezone('Europe/London', now()))::date + 1),
    'prize_main', _c.prize_main, 'prize_second', _c.prize_second,
    'main_threshold', _c.main_threshold, 'second_threshold', _c.second_threshold,
    'terms_url', _c.terms_url,
    'entrants', (SELECT count(*) FROM public.gym_challenge_entrants e
                  WHERE e.challenge_id = _c.id AND e.withdrawn_at IS NULL))
$$;

REVOKE ALL ON FUNCTION public._gym_challenge_phase(public.gym_challenges) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._gym_challenge_name(public.gym_challenge_entrants) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._gym_challenge_is_minor(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._gym_challenge_score(public.gym_challenges, public.gym_challenge_entrants) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._gym_challenge_entrant_score(public.gym_challenges, public.gym_challenge_entrants) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._gym_challenge_json(public.gym_challenges) FROM PUBLIC, anon, authenticated;

-- ─── Part 3: public and member RPCs ─────────────────────────────────────

-- The landing page. Facts and a count only. Not for a cancelled challenge.
CREATE OR REPLACE FUNCTION public.gym_challenge_public(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_c public.gym_challenges%ROWTYPE;
BEGIN
  SELECT * INTO v_c FROM public.gym_challenges WHERE code = lower(btrim(coalesce(_code, '')));
  IF NOT FOUND OR v_c.status = 'cancelled' THEN RETURN NULL; END IF;
  RETURN public._gym_challenge_json(v_c) - 'id';
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gym_challenge_public(text) TO anon, authenticated;

-- The join screen: the public facts plus the caller's own state.
CREATE OR REPLACE FUNCTION public.gym_challenge_lookup(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_c   public.gym_challenges%ROWTYPE;
  v_e   public.gym_challenge_entrants%ROWTYPE;
BEGIN
  SELECT * INTO v_c FROM public.gym_challenges WHERE code = lower(btrim(coalesce(_code, '')));
  IF NOT FOUND OR v_c.status = 'cancelled' THEN RETURN NULL; END IF;
  SELECT * INTO v_e FROM public.gym_challenge_entrants
   WHERE challenge_id = v_c.id AND user_id = v_uid;
  RETURN public._gym_challenge_json(v_c) || jsonb_build_object(
    'joined', FOUND AND v_e.withdrawn_at IS NULL,
    'withdrawn', FOUND AND v_e.withdrawn_at IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_lookup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_challenge_lookup(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gym_challenge_join(
  _code text, _display_mode text, _display_name text, _planned_per_week int,
  _consent_version text, _adult boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_c     public.gym_challenges%ROWTYPE;
  v_name  text := nullif(btrim(coalesce(_display_name, '')), '');
  v_ppw   int  := least(6, greatest(2, coalesce(_planned_per_week, 3)));
  v_today date := (timezone('Europe/London', now()))::date;
BEGIN
  IF _adult IS NOT TRUE THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;
  IF _display_mode NOT IN ('name', 'handle') THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  IF _display_mode = 'name' AND (v_name IS NULL OR char_length(v_name) > 30) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF nullif(btrim(coalesce(_consent_version, '')), '') IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF public._gym_challenge_is_minor(v_uid) THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;

  SELECT * INTO v_c FROM public.gym_challenges WHERE code = lower(btrim(coalesce(_code, '')));
  IF NOT FOUND OR v_c.status = 'cancelled' THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF public._gym_challenge_phase(v_c) NOT IN ('upcoming', 'active') THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  INSERT INTO public.gym_challenge_entrants AS e
    (challenge_id, user_id, joined_on, display_mode, display_name, planned_per_week, consent_version)
  VALUES (v_c.id, v_uid, v_today, _display_mode,
          CASE WHEN _display_mode = 'name' THEN v_name END, v_ppw, btrim(_consent_version))
  ON CONFLICT (challenge_id, user_id) DO UPDATE
    SET withdrawn_at = NULL,
        display_mode = EXCLUDED.display_mode,
        display_name = EXCLUDED.display_name,
        planned_per_week = greatest(e.planned_per_week, EXCLUDED.planned_per_week),
        consent_version = EXCLUDED.consent_version;

  INSERT INTO public.free_for_life_grants (user_id, source, source_code)
  VALUES (v_uid, 'gym_challenge', v_c.code)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object('challenge_id', v_c.id, 'joined', true, 'free_for_life', true);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_join(text, text, text, int, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_challenge_join(text, text, text, int, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.gym_challenge_withdraw(_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_uid uuid := public._community_caller();
BEGIN
  UPDATE public.gym_challenge_entrants SET withdrawn_at = now()
   WHERE challenge_id = _challenge_id AND user_id = v_uid AND withdrawn_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  RETURN jsonb_build_object('withdrawn', true);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_withdraw(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_challenge_withdraw(uuid) TO authenticated;

-- The weekly target may only rise during a challenge (SPEC 3).
CREATE OR REPLACE FUNCTION public.gym_challenge_set_target(_challenge_id uuid, _planned_per_week int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_ppw int;
BEGIN
  IF _planned_per_week IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  UPDATE public.gym_challenge_entrants
     SET planned_per_week = greatest(planned_per_week, least(6, greatest(2, _planned_per_week)))
   WHERE challenge_id = _challenge_id AND user_id = v_uid AND withdrawn_at IS NULL
  RETURNING planned_per_week INTO v_ppw;
  IF v_ppw IS NULL THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  RETURN jsonb_build_object('planned_per_week', v_ppw);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_set_target(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_challenge_set_target(uuid, int) TO authenticated;

-- The caller's challenges: upcoming, active, ended, and closed for 14 days.
CREATE OR REPLACE FUNCTION public.gym_challenge_mine()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_uid uuid := public._community_caller();
BEGIN
  RETURN coalesce((
    SELECT jsonb_agg(public._gym_challenge_json(c)
             || jsonb_build_object('total', (public._gym_challenge_entrant_score(c, e) ->> 'total')::int)
           ORDER BY c.starts_on DESC)
      FROM public.gym_challenge_entrants e
      JOIN public.gym_challenges c ON c.id = e.challenge_id
     WHERE e.user_id = v_uid AND e.withdrawn_at IS NULL AND c.status <> 'cancelled'
       AND (c.status <> 'closed' OR c.closed_at > now() - interval '14 days')), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_mine() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_challenge_mine() TO authenticated;

-- The caller's own score, with their draw tier and the gap to each line.
CREATE OR REPLACE FUNCTION public.gym_challenge_score(_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_c   public.gym_challenges%ROWTYPE;
  v_e   public.gym_challenge_entrants%ROWTYPE;
  v_s   jsonb;
  v_t   int;
BEGIN
  SELECT * INTO v_c FROM public.gym_challenges WHERE id = _challenge_id AND status <> 'cancelled';
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  SELECT * INTO v_e FROM public.gym_challenge_entrants
   WHERE challenge_id = _challenge_id AND user_id = v_uid AND withdrawn_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  v_s := public._gym_challenge_entrant_score(v_c, v_e);
  v_t := (v_s ->> 'total')::int;
  RETURN v_s || jsonb_build_object(
    'tier', CASE WHEN v_t >= v_c.main_threshold THEN 'main'
                 WHEN v_t >= v_c.second_threshold THEN 'second' END,
    'to_main', greatest(0, v_c.main_threshold - v_t),
    'to_second', greatest(0, v_c.second_threshold - v_t),
    'planned_per_week', v_e.planned_per_week);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_challenge_score(uuid) TO authenticated;

-- Entrants only. NULL for a caller the migrate_180 gate withholds. Top 10
-- by score; a withdrawn, withheld or minor entrant is never listed.
CREATE OR REPLACE FUNCTION public.gym_challenge_board(_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
SET client_min_messages = warning
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_c      public.gym_challenges%ROWTYPE;
  v_me     int;
  v_top    jsonb;
  v_counts jsonb;
  v_win    jsonb;
BEGIN
  SELECT * INTO v_c FROM public.gym_challenges WHERE id = _challenge_id AND status <> 'cancelled';
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gym_challenge_entrants
                  WHERE challenge_id = _challenge_id AND user_id = v_uid AND withdrawn_at IS NULL) THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;
  IF public._community_consistency_withheld(v_uid) THEN RETURN NULL; END IF;

  CREATE TEMP TABLE IF NOT EXISTS _gc_b (user_id uuid, name text, score int, joined_at timestamptz,
                                         listable boolean) ON COMMIT DROP;
  TRUNCATE _gc_b;
  INSERT INTO _gc_b
  SELECT e.user_id, public._gym_challenge_name(e),
         (public._gym_challenge_entrant_score(v_c, e) ->> 'total')::int, e.joined_at,
         NOT public._gym_challenge_is_minor(e.user_id)
           AND NOT public._community_consistency_withheld(e.user_id)
    FROM public.gym_challenge_entrants e
   WHERE e.challenge_id = _challenge_id AND e.withdrawn_at IS NULL;

  SELECT score INTO v_me FROM _gc_b WHERE user_id = v_uid;
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'score', t.score, 'me', t.user_id = v_uid)
                  ORDER BY t.score DESC, t.joined_at), '[]'::jsonb)
    INTO v_top
    FROM (SELECT * FROM _gc_b WHERE listable ORDER BY score DESC, joined_at LIMIT 10) t;
  SELECT jsonb_build_object(
           'entrants', count(*),
           'main', count(*) FILTER (WHERE score >= v_c.main_threshold),
           'second', count(*) FILTER (WHERE score >= v_c.second_threshold))
    INTO v_counts FROM _gc_b;
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', public._gym_challenge_name(e), 'tier', d.tier)
                  ORDER BY d.drawn_at), '[]'::jsonb)
    INTO v_win
    FROM public.gym_challenge_draws d
    CROSS JOIN LATERAL unnest(d.winners) AS w(user_id)
    JOIN public.gym_challenge_entrants e ON e.challenge_id = d.challenge_id AND e.user_id = w.user_id
   WHERE d.challenge_id = _challenge_id;

  RETURN jsonb_build_object(
    'status', public._gym_challenge_phase(v_c),
    'days_left', greatest(0, v_c.ends_on - (timezone('Europe/London', now()))::date + 1),
    'top', v_top,
    'me', jsonb_build_object('score', v_me,
            'in_top', coalesce((SELECT bool_or(x ->> 'me' = 'true') FROM jsonb_array_elements(v_top) x), false)),
    'counts', v_counts,
    'winners', v_win);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_board(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_challenge_board(uuid) TO authenticated;

-- The invite card: an upcoming or active challenge at the caller's gym that
-- they are not in. Nothing for a withheld caller.
CREATE OR REPLACE FUNCTION public.gym_challenge_for_my_gym()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_c   public.gym_challenges%ROWTYPE;
BEGIN
  IF public._community_consistency_withheld(v_uid) OR public._gym_challenge_is_minor(v_uid) THEN
    RETURN NULL;
  END IF;
  SELECT c.* INTO v_c
    FROM public.gym_challenges c
    JOIN public.community_profiles p ON p.user_id = v_uid
   WHERE (c.gym_id = p.gym_id OR c.gym_id = ANY (coalesce(p.other_gym_ids, '{}'::uuid[])))
     AND public._gym_challenge_phase(c) IN ('upcoming', 'active')
     AND NOT EXISTS (SELECT 1 FROM public.gym_challenge_entrants e
                      WHERE e.challenge_id = c.id AND e.user_id = v_uid AND e.withdrawn_at IS NULL)
   ORDER BY c.starts_on
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN public._gym_challenge_json(v_c) - 'id' - 'entrants';
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_for_my_gym() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_challenge_for_my_gym() TO authenticated;

-- ─── Part 4: founder operations (service role only) ─────────────────────

-- Freeze the final scores. Run 3 or more days after ends_on (late syncs).
CREATE OR REPLACE FUNCTION public.gym_challenge_close(_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_c public.gym_challenges%ROWTYPE;
  v_n int;
BEGIN
  SELECT * INTO v_c FROM public.gym_challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF public._gym_challenge_phase(v_c) <> 'ended' THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;
  UPDATE public.gym_challenge_entrants e
     SET final_parts = public._gym_challenge_score(v_c, e),
         final_score = (public._gym_challenge_score(v_c, e) ->> 'total')::int
   WHERE e.challenge_id = _challenge_id AND e.withdrawn_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  UPDATE public.gym_challenges SET status = 'closed', closed_at = now() WHERE id = _challenge_id;
  RETURN jsonb_build_object('closed', true, 'entrants', v_n);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_close(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gym_challenge_close(uuid) TO service_role;

-- Every entrant with each part, for the founder's export (contact email
-- included so winners can be told; service role only).
CREATE OR REPLACE FUNCTION public.gym_challenge_results(_challenge_id uuid)
RETURNS TABLE (user_id uuid, email text, shown_as text, joined_on date, withdrawn boolean,
               minor boolean, total int, train numeric, week numeric, stronger numeric,
               community numeric, checkin numeric, food numeric, weighin numeric, frozen boolean)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_c public.gym_challenges%ROWTYPE;
BEGIN
  SELECT * INTO v_c FROM public.gym_challenges WHERE id = _challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  RETURN QUERY
  SELECT e.user_id, u.email::text, public._gym_challenge_name(e), e.joined_on,
         e.withdrawn_at IS NOT NULL, public._gym_challenge_is_minor(e.user_id),
         (s ->> 'total')::int,
         (s -> 'parts' ->> 'train')::numeric, (s -> 'parts' ->> 'week')::numeric,
         (s -> 'parts' ->> 'stronger')::numeric, (s -> 'parts' ->> 'community')::numeric,
         (s -> 'parts' ->> 'checkin')::numeric, (s -> 'parts' ->> 'food')::numeric,
         (s -> 'parts' ->> 'weighin')::numeric, (s ->> 'frozen')::boolean
    FROM public.gym_challenge_entrants e
    JOIN auth.users u ON u.id = e.user_id
    CROSS JOIN LATERAL (SELECT public._gym_challenge_entrant_score(v_c, e) AS s) x
   WHERE e.challenge_id = _challenge_id
   ORDER BY (s ->> 'total')::int DESC, e.joined_at;
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_results(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gym_challenge_results(uuid) TO service_role;

-- A recorded random draw (CAP 8.24: verifiable computer randomness). Main:
-- frozen score at or above the main line. Second: at or above the second
-- line, excluding anyone already drawn as a winner (lead ruling). Minors and
-- withdrawn entrants are never eligible; withheld entrants stay eligible
-- (founder). Every call is stored, so a redraw (a winner who cannot be
-- reached) is visible and excludes earlier winners.
CREATE OR REPLACE FUNCTION public.gym_challenge_draw(_challenge_id uuid, _tier text, _winners int DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_c        public.gym_challenges%ROWTYPE;
  v_line     int;
  v_eligible jsonb;
  v_hash     text;
  v_winners  uuid[];
  v_id       uuid;
BEGIN
  IF _tier NOT IN ('main', 'second') OR _winners IS NULL OR _winners < 1 OR _winners > 20 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  SELECT * INTO v_c FROM public.gym_challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF v_c.status <> 'closed' THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;
  v_line := CASE _tier WHEN 'main' THEN v_c.main_threshold ELSE v_c.second_threshold END;

  SELECT coalesce(jsonb_agg(jsonb_build_object('user_id', e.user_id, 'score', e.final_score)
                  ORDER BY e.user_id), '[]'::jsonb)
    INTO v_eligible
    FROM public.gym_challenge_entrants e
   WHERE e.challenge_id = _challenge_id AND e.withdrawn_at IS NULL
     AND e.final_score >= v_line
     AND NOT public._gym_challenge_is_minor(e.user_id)
     AND NOT EXISTS (SELECT 1 FROM public.gym_challenge_draws d
                      WHERE d.challenge_id = _challenge_id AND e.user_id = ANY (d.winners));
  IF jsonb_array_length(v_eligible) = 0 THEN RAISE EXCEPTION USING message = 'none_eligible'; END IF;
  v_hash := md5(v_eligible::text);

  -- gen_random_uuid() is cryptographically random; each eligible entrant's
  -- draw value is stored, and the lowest values win.
  SELECT jsonb_agg(x.obj || jsonb_build_object('draw_value', x.v) ORDER BY x.v),
         (array_agg((x.obj ->> 'user_id')::uuid ORDER BY x.v))[1:_winners]
    INTO v_eligible, v_winners
    FROM (SELECT o AS obj, gen_random_uuid()::text AS v FROM jsonb_array_elements(v_eligible) o) x;

  INSERT INTO public.gym_challenge_draws (challenge_id, tier, eligible, eligible_hash, winners)
  VALUES (_challenge_id, _tier, v_eligible, v_hash, v_winners)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('draw_id', v_id, 'tier', _tier, 'eligible', jsonb_array_length(v_eligible),
                            'eligible_hash', v_hash, 'winners', to_jsonb(v_winners));
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_draw(uuid, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gym_challenge_draw(uuid, text, int) TO service_role;
