-- migrate_203_free_for_life_on_completion.sql
--
-- Purpose:           Founder answers 2026-10-20 (Stage 2, item 34): free for
--                    life is EARNED by completing a challenge, not given for
--                    joining. A final score of 50 or more when the challenge
--                    closes earns it; withdrawing before the end ends the
--                    chance. The grant is written at close, by the founder
--                    (closing is founder-run). Production held 0 grants and
--                    0 challenges when read on 2026-10-20, so there is
--                    nothing to revoke.
--
--                    WHAT CHANGES (migrate_201 is left as applied; these are
--                    CREATE OR REPLACE over its functions):
--                    * gym_challenge_join no longer writes a
--                      free_for_life_grants row, and no longer returns a
--                      free_for_life flag. Everything else in it, the age
--                      guards included, is byte-for-byte migrate_201's.
--                    * gym_challenge_grant_free_for_life (new, service role
--                      only): for a CLOSED challenge, writes one grant for
--                      each entrant who has not withdrawn, is not a known
--                      minor, and has final_score >= 50. final_score is the
--                      frozen figure gym_challenge_close wrote from the
--                      existing scoring (_gym_challenge_score); nothing is
--                      scored again. Idempotent (ON CONFLICT DO NOTHING on
--                      the user); returns how many NEW grants it wrote.
--                    * gym_challenge_close now calls it as its last step, so
--                      closing a challenge writes the grants. The function
--                      can also be called alone to repeat a close safely.
--                    No table, column or policy is added or altered.
--                    free_for_life_grants stays RLS on, no policy, every
--                    privilege revoked from PUBLIC, anon and authenticated.
--
-- Applied locally:   no (cloud-only; the app never runs migrations)
-- Applied remotely:  APPLIED 2026-10-21 02:46:54 UTC under the founder's
--                    "run against production 203" (apply-named-sql.yml
--                    run 14 from main 40507ed). Depends on 201.
-- Safe to re-run:    yes (CREATE OR REPLACE; the grant insert is
--                    ON CONFLICT DO NOTHING).
-- Rollback:          Re-run the gym_challenge_join and gym_challenge_close
--                    definitions from migrate_201, then
--                    DROP FUNCTION IF EXISTS
--                    public.gym_challenge_grant_free_for_life(uuid);
--                    Grants already written stay: the promise is kept
--                    (docs/rules/billing.md); never delete them.

-- ─── Join: no grant ─────────────────────────────────────────────────────

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
  v_name  text := public._community_clean_text(nullif(btrim(coalesce(_display_name, '')), ''));
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

  INSERT INTO public.gym_challenge_gate_days AS gd (challenge_id, user_id, day, withheld)
  VALUES (v_c.id, v_uid, v_today, public._community_consistency_withheld(v_uid))
  ON CONFLICT (challenge_id, user_id, day) DO UPDATE SET withheld = gd.withheld OR EXCLUDED.withheld;

  RETURN jsonb_build_object('challenge_id', v_c.id, 'joined', true);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_join(text, text, text, int, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_challenge_join(text, text, text, int, text, boolean) TO authenticated;

-- ─── Close: grant for a final score of 50 or more ────────────────────────

-- Writes the earned grants for one closed challenge. Service role only.
CREATE OR REPLACE FUNCTION public.gym_challenge_grant_free_for_life(_challenge_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_c public.gym_challenges%ROWTYPE;
  v_n int;
BEGIN
  SELECT * INTO v_c FROM public.gym_challenges WHERE id = _challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF v_c.status <> 'closed' THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;
  INSERT INTO public.free_for_life_grants (user_id, source, source_code)
  SELECT e.user_id, 'gym_challenge', v_c.code
    FROM public.gym_challenge_entrants e
   WHERE e.challenge_id = _challenge_id
     AND e.withdrawn_at IS NULL
     AND e.final_score >= 50
     AND NOT public._gym_challenge_is_minor(e.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_grant_free_for_life(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gym_challenge_grant_free_for_life(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.gym_challenge_close(_challenge_id uuid, _force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_c public.gym_challenges%ROWTYPE;
  v_n int;
  v_g int;
BEGIN
  SELECT * INTO v_c FROM public.gym_challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF public._gym_challenge_phase(v_c) <> 'ended' THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;
  IF NOT coalesce(_force, false)
     AND (timezone('Europe/London', now()))::date < v_c.ends_on + 3 THEN
    RAISE EXCEPTION USING message = 'too_early';
  END IF;
  UPDATE public.gym_challenge_entrants e
     SET final_parts = public._gym_challenge_score(v_c, e),
         final_score = (public._gym_challenge_score(v_c, e) ->> 'total')::int
   WHERE e.challenge_id = _challenge_id AND e.withdrawn_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  UPDATE public.gym_challenges SET status = 'closed', closed_at = now() WHERE id = _challenge_id;
  v_g := public.gym_challenge_grant_free_for_life(_challenge_id);
  RETURN jsonb_build_object('closed', true, 'entrants', v_n, 'free_for_life_granted', v_g);
END $$;
REVOKE ALL ON FUNCTION public.gym_challenge_close(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gym_challenge_close(uuid, boolean) TO service_role;
