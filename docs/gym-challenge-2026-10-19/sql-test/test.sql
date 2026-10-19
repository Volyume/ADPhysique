\set ON_ERROR_STOP 1
-- A scripted month for migrate_201 (SPEC section 8). Day 0 is 18 days ago.
INSERT INTO auth.users VALUES
 ('a0000000-0000-0000-0000-00000000000a','a@x'),('b0000000-0000-0000-0000-00000000000b','b@x'),
 ('c0000000-0000-0000-0000-00000000000c','c@x'),('d0000000-0000-0000-0000-00000000000d','d@x'),
 ('e0000000-0000-0000-0000-00000000000e','e@x'),('f0000000-0000-0000-0000-00000000000f','f@x'),
 ('99000000-0000-0000-0000-000000000099','g@x');
INSERT INTO gym_venues VALUES ('99999999-0000-0000-0000-000000000001','Volt Gym','Volt Gym','active');
INSERT INTO community_profiles (user_id, handle, is_minor, gym_id) VALUES
 ('c0000000-0000-0000-0000-00000000000c','kid',true,NULL),
 ('d0000000-0000-0000-0000-00000000000d','dee',false,'99999999-0000-0000-0000-000000000001'),
 ('b0000000-0000-0000-0000-00000000000b','bee',false,NULL);
INSERT INTO user_body_profile VALUES ('f0000000-0000-0000-0000-00000000000f', '2012-03-04');

-- Codes are made by the create function: slug plus 8 random characters.
DO $$ BEGIN
  PERFORM gym_challenge_create('99999999-0000-0000-0000-000000000001','volt-oct','Volt October Challenge',
    current_date - 18, current_date + 9, 'https://volyume.app/challenge-terms/?c=volt-oct', '3 months free', 'PT session');
  BEGIN INSERT INTO gym_challenges (code, gym_id, title, starts_on, ends_on, terms_url)
        VALUES ('volt-nov','99999999-0000-0000-0000-000000000001','Guessable', current_date, current_date + 5, 'https://x');
        RAISE EXCEPTION 'guessable code accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO gym_challenges (code, gym_id, title, starts_on, ends_on)
        VALUES ('volt-nov-0123abcd','99999999-0000-0000-0000-000000000001','No terms', current_date, current_date + 5);
        RAISE EXCEPTION 'challenge without terms accepted';
  EXCEPTION WHEN not_null_violation THEN NULL; END;
END $$;
SELECT (SELECT code FROM gym_challenges) ~ '^volt-oct-[0-9a-f]{8}$' AS code_has_random_part;
SELECT (gym_challenge_public((SELECT code FROM gym_challenges)) ? 'entrants') AS public_has_count;
SELECT count(*) AS cron_jobs FROM cron.job WHERE jobname = 'gym-challenge-gate-readings';

-- Joins
SET test.uid = 'a0000000-0000-0000-0000-00000000000a';
SELECT gym_challenge_join((SELECT code FROM gym_challenges),'name','Allan D.',3,'challenge_consent_v1',true) ->> 'joined' AS a_joined;
SET test.uid = 'b0000000-0000-0000-0000-00000000000b';
SELECT gym_challenge_join((SELECT code FROM gym_challenges),'handle',NULL,4,'challenge_consent_v1',true) ->> 'joined' AS b_joined;
SET test.uid = 'e0000000-0000-0000-0000-00000000000e';
SELECT gym_challenge_join((SELECT code FROM gym_challenges),'name','Eve E.',3,'challenge_consent_v1',true) ->> 'joined' AS e_joined;
SET test.uid = '99000000-0000-0000-0000-000000000099';
-- No profile and no date of birth: rests on the 18+ answer.
SELECT gym_challenge_join((SELECT code FROM gym_challenges),'name','Gail G.',3,'challenge_consent_v1',true) ->> 'joined' AS unknown_age_joined;
SELECT gym_challenge_set_target((SELECT id FROM gym_challenges), 2) ->> 'planned_per_week' AS fresh_joiner_can_lower;
SET test.uid = 'c0000000-0000-0000-0000-00000000000c';
DO $$ BEGIN PERFORM gym_challenge_join((SELECT code FROM gym_challenges),'handle',NULL,3,'v1',true); RAISE EXCEPTION 'profile minor joined'; EXCEPTION WHEN others THEN IF SQLERRM <> 'not_allowed' THEN RAISE; END IF; END $$;
SET test.uid = 'f0000000-0000-0000-0000-00000000000f';
DO $$ BEGIN PERFORM gym_challenge_join((SELECT code FROM gym_challenges),'name','Finn F.',3,'v1',true); RAISE EXCEPTION 'date-of-birth minor joined'; EXCEPTION WHEN others THEN IF SQLERRM <> 'not_allowed' THEN RAISE; END IF; END $$;
SET test.uid = 'd0000000-0000-0000-0000-00000000000d';
DO $$ BEGIN PERFORM gym_challenge_join((SELECT code FROM gym_challenges),'handle',NULL,3,'v1',false); RAISE EXCEPTION 'non-adult answer joined'; EXCEPTION WHEN others THEN IF SQLERRM <> 'not_allowed' THEN RAISE; END IF; END $$;
SELECT gym_challenge_for_my_gym() ->> 'title' AS invite_for_d;

-- A minor whose age arrives after joining is never listed.
RESET test.uid;
UPDATE gym_challenge_entrants SET joined_on = (SELECT starts_on FROM gym_challenges)
 WHERE user_id IN ('a0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-00000000000b','e0000000-0000-0000-0000-00000000000e');

-- A: 3 qualifying days in each of 4 blocks (12), plus a short one and a late-synced one
DO $$
DECLARE s date := (SELECT starts_on FROM gym_challenges); i int; w uuid; k int;
BEGIN
  FOR i IN 0..3 LOOP FOR k IN 0..2 LOOP
    w := gen_random_uuid();
    INSERT INTO workouts VALUES (w,'a0000000-0000-0000-0000-00000000000a',(s+7*i+2*k)::timestamp + time '18:00',NULL,45,true,NULL,(s+7*i+2*k)::timestamp + time '19:00');
    INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight)
      SELECT 'a0000000-0000-0000-0000-00000000000a', w, 'row', 'straight', 10, 50 FROM generate_series(1,6);
  END LOOP; END LOOP;
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight)
    SELECT 'a0000000-0000-0000-0000-00000000000a', id, 'bench','straight',8,60 FROM workouts WHERE started_at::date = s;
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight)
    SELECT 'a0000000-0000-0000-0000-00000000000a', id, 'bench','straight',8,65 FROM workouts WHERE started_at::date = s+14;
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight)
    SELECT 'a0000000-0000-0000-0000-00000000000a', id, 'bench','warmup',8,200 FROM workouts WHERE started_at::date = s+16;
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight)
    SELECT 'a0000000-0000-0000-0000-00000000000a', id, 'squat','straight',5,100 FROM workouts WHERE started_at::date = s+2;
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight)
    SELECT 'a0000000-0000-0000-0000-00000000000a', id, 'pullup','straight',8,0 FROM workouts WHERE started_at::date = s+7;
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight)
    SELECT 'a0000000-0000-0000-0000-00000000000a', id, 'pullup','straight',10,NULL FROM workouts WHERE started_at::date = s+21;
  w := gen_random_uuid();
  INSERT INTO workouts VALUES (w,'a0000000-0000-0000-0000-00000000000a',(s+1)::timestamp + time '18:00',NULL,15,true,NULL,(s+1)::timestamp + time '19:00');
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight) SELECT 'a0000000-0000-0000-0000-00000000000a', w,'row','straight',10,50 FROM generate_series(1,8);
  w := gen_random_uuid();
  INSERT INTO workouts VALUES (w,'a0000000-0000-0000-0000-00000000000a',(s+3)::timestamp + time '18:00',NULL,50,true,NULL,(s+20)::timestamp);
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight) SELECT 'a0000000-0000-0000-0000-00000000000a', w,'row','straight',10,50 FROM generate_series(1,8);
  -- posts in blocks 0 and 1, and one the ED withhold hid in block 2 (it counts)
  INSERT INTO community_posts (author_id, kind, status, created_at) VALUES
    ('a0000000-0000-0000-0000-00000000000a','session','visible',(s+1)::timestamptz + interval '12 hours'),
    ('a0000000-0000-0000-0000-00000000000a','session','visible',(s+8)::timestamptz + interval '12 hours'),
    ('a0000000-0000-0000-0000-00000000000a','session','withheld',(s+15)::timestamptz + interval '12 hours'),
    ('a0000000-0000-0000-0000-00000000000a','session','hidden',(s+22)::timestamptz + interval '12 hours');
  INSERT INTO weekly_checkins_v2 VALUES ('c1','a0000000-0000-0000-0000-00000000000a',1,(s+6)::timestamptz + interval '12 hours',NULL),
                                       ('c2','a0000000-0000-0000-0000-00000000000a',2,(s+13)::timestamptz + interval '12 hours',NULL);
  -- food: 5 days in block 0 (cap 3), 2 in block 1, a deleted one and a backfilled one in block 2
  INSERT INTO food_entries (user_id, entry_date, created_at) SELECT 'a0000000-0000-0000-0000-00000000000a', s+g, (s+g)::timestamptz + interval '12 hours' FROM generate_series(0,4) g;
  INSERT INTO food_entries (user_id, entry_date, created_at) VALUES ('a0000000-0000-0000-0000-00000000000a', s+7, (s+7)::timestamptz),('a0000000-0000-0000-0000-00000000000a', s+7, (s+7)::timestamptz),('a0000000-0000-0000-0000-00000000000a', s+8, (s+8)::timestamptz);
  INSERT INTO food_entries (user_id, entry_date, created_at, deleted_at) VALUES ('a0000000-0000-0000-0000-00000000000a', s+15, (s+15)::timestamptz, now());
  INSERT INTO food_entries (user_id, entry_date, created_at) VALUES ('a0000000-0000-0000-0000-00000000000a', s+16, (s+16)::timestamptz + interval '10 days');
  INSERT INTO body_metrics (user_id, metric_date, body_weight, created_at) VALUES ('a0000000-0000-0000-0000-00000000000a', s+1, 80, (s+1)::timestamp);
  INSERT INTO morning_weights VALUES ('m1','a0000000-0000-0000-0000-00000000000a',80,(s+16)::timestamptz + interval '7 hours',NULL,(s+16)::timestamptz + interval '7 hours');
  -- E: an ED flag covered days 0 to 6, cleared since; nothing logged
  INSERT INTO ed_pattern_flags (user_id, raised_at, cleared_at) VALUES ('e0000000-0000-0000-0000-00000000000e', s::timestamptz + interval '9 hours', (s+6)::timestamptz + interval '9 hours');
  -- B: calm mode on every day so far (hourly readings) and now
  INSERT INTO gym_challenge_gate_days SELECT (SELECT id FROM gym_challenges), 'b0000000-0000-0000-0000-00000000000b', s+g, true FROM generate_series(0,18) g
    ON CONFLICT (challenge_id, user_id, day) DO UPDATE SET withheld = true;
END $$;
INSERT INTO test_withheld VALUES ('b0000000-0000-0000-0000-00000000000b');

SET test.uid = 'a0000000-0000-0000-0000-00000000000a';
SELECT gym_challenge_score((SELECT id FROM gym_challenges)) ->> 'total' AS a_total,
       gym_challenge_score((SELECT id FROM gym_challenges)) -> 'parts' AS a_parts,
       gym_challenge_score((SELECT id FROM gym_challenges)) -> 'detail' ->> 'food_days' AS a_food_days;
SELECT gym_challenge_set_target((SELECT id FROM gym_challenges), 2) ->> 'planned_per_week' AS a_lower_after_week_one_ignored;
SELECT jsonb_array_length(gym_challenge_board((SELECT id FROM gym_challenges)) -> 'top') AS a_board_rows,
       gym_challenge_board((SELECT id FROM gym_challenges)) -> 'top' -> 0 ->> 'name' AS a_board_first;
SET test.uid = 'b0000000-0000-0000-0000-00000000000b';
SELECT gym_challenge_score((SELECT id FROM gym_challenges)) ->> 'total' AS b_total,
       gym_challenge_score((SELECT id FROM gym_challenges)) ->> 'withheld' AS b_withheld,
       gym_challenge_score((SELECT id FROM gym_challenges)) -> 'detail' ->> 'food_days' AS b_food_days_hidden;
SELECT gym_challenge_board((SELECT id FROM gym_challenges)) IS NULL AS b_board_null;
SET test.uid = 'e0000000-0000-0000-0000-00000000000e';
SELECT gym_challenge_score((SELECT id FROM gym_challenges)) -> 'detail' ->> 'food_days' AS e_food_days_credited,
       gym_challenge_score((SELECT id FROM gym_challenges)) -> 'detail' ->> 'weighin_weeks' AS e_weighin_weeks_credited,
       gym_challenge_score((SELECT id FROM gym_challenges)) ->> 'withheld' AS e_withheld_now;

-- Expected values (worked by hand, SPEC section 8)
DO $$
DECLARE c uuid := (SELECT id FROM gym_challenges);
BEGIN
  PERFORM set_config('test.uid', 'a0000000-0000-0000-0000-00000000000a', true);
  IF (gym_challenge_score(c) ->> 'total')::int <> 78 THEN RAISE EXCEPTION 'A total %', gym_challenge_score(c) ->> 'total'; END IF;
  PERFORM set_config('test.uid', 'b0000000-0000-0000-0000-00000000000b', true);
  IF (gym_challenge_score(c) ->> 'total')::int <> 8 THEN RAISE EXCEPTION 'B total %', gym_challenge_score(c) ->> 'total'; END IF;
  PERFORM set_config('test.uid', 'e0000000-0000-0000-0000-00000000000e', true);
  IF (gym_challenge_score(c) -> 'detail' ->> 'food_days')::int <> 3 THEN RAISE EXCEPTION 'E food'; END IF;
  IF (gym_challenge_score(c) -> 'detail' ->> 'weighin_weeks')::int <> 1 THEN RAISE EXCEPTION 'E weigh'; END IF;
END $$;

-- The hourly reading records today's gate for running challenges.
RESET test.uid;
SELECT _gym_challenge_snapshot_gates() AS readings_written;
SELECT count(*) FILTER (WHERE withheld) AS withheld_readings_today FROM gym_challenge_gate_days WHERE day = current_date;

-- Withdraw B; close, draw and redraw on an ended copy.
SET test.uid = 'b0000000-0000-0000-0000-00000000000b';
SELECT gym_challenge_withdraw((SELECT id FROM gym_challenges)) ->> 'withdrawn' AS b_withdrawn;
RESET test.uid;
UPDATE gym_challenges SET starts_on = current_date - 28, ends_on = current_date - 1;
DO $$ BEGIN PERFORM gym_challenge_close((SELECT id FROM gym_challenges)); RAISE EXCEPTION 'closed too early'; EXCEPTION WHEN others THEN IF SQLERRM <> 'too_early' THEN RAISE; END IF; END $$;
UPDATE gym_challenges SET starts_on = current_date - 40, ends_on = current_date - 13;
SELECT gym_challenge_close((SELECT id FROM gym_challenges)) ->> 'entrants' AS closed_entrants;
SELECT shown_as, email, total, withdrawn FROM gym_challenge_results((SELECT id FROM gym_challenges)) ORDER BY shown_as;
DO $$ BEGIN IF (SELECT total FROM gym_challenge_results((SELECT id FROM gym_challenges)) WHERE shown_as = '@bee') IS NOT NULL THEN RAISE EXCEPTION 'withdrawn entrant was scored'; END IF; END $$;
UPDATE gym_challenges SET main_threshold = 2, second_threshold = 1;
SELECT gym_challenge_draw((SELECT id FROM gym_challenges), 'main', 1) ->> 'eligible' AS main_eligible;
-- A redraw (the first winner could not be reached) excludes the first winner,
-- and the board names only the latest draw's winner.
SELECT gym_challenge_draw((SELECT id FROM gym_challenges), 'main', 1) ->> 'eligible' AS redraw_eligible;
SET test.uid = 'a0000000-0000-0000-0000-00000000000a';
SELECT jsonb_array_length(gym_challenge_board((SELECT id FROM gym_challenges)) -> 'winners') AS board_winners;
DO $$ BEGIN IF jsonb_array_length(gym_challenge_board((SELECT id FROM gym_challenges)) -> 'winners') <> 1 THEN RAISE EXCEPTION 'redraw shows two winners'; END IF; END $$;
RESET test.uid;
SELECT count(*) FILTER (WHERE email IS NOT NULL) AS emails_exported FROM gym_challenge_results((SELECT id FROM gym_challenges));
SET ROLE authenticated;
DO $$ BEGIN PERFORM gym_challenge_results((SELECT id FROM gym_challenges)); RAISE EXCEPTION 'authenticated ran results'; EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM free_for_life_grants) <> 4 THEN RAISE EXCEPTION 'free for life grants: %', (SELECT count(*) FROM free_for_life_grants); END IF; END $$;
SELECT 'ALL OK';
