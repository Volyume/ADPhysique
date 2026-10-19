\set ON_ERROR_STOP 1
-- ids
INSERT INTO auth.users VALUES ('a0000000-0000-0000-0000-00000000000a','a@x'),('b0000000-0000-0000-0000-00000000000b','b@x'),('c0000000-0000-0000-0000-00000000000c','c@x'),('d0000000-0000-0000-0000-00000000000d','d@x');
INSERT INTO gym_venues VALUES ('99999999-0000-0000-0000-000000000001','Volt Gym','Volt Gym','active');
INSERT INTO community_profiles (user_id, handle, is_minor, gym_id) VALUES ('c0000000-0000-0000-0000-00000000000c','kid',true,NULL),('d0000000-0000-0000-0000-00000000000d','dee',false,'99999999-0000-0000-0000-000000000001'),('b0000000-0000-0000-0000-00000000000b','bee',false,NULL);
INSERT INTO gym_challenges (code, gym_id, title, starts_on, ends_on, prize_main, prize_second, terms_url)
VALUES ('volt-oct','99999999-0000-0000-0000-000000000001','Volt October Challenge', current_date - 18, current_date + 9, '3 months free','PT session','https://volyume.app/c/volt-oct/terms');
-- public
SELECT gym_challenge_public('VOLT-OCT') ->> 'status' AS public_status;
-- joins
SET test.uid = 'a0000000-0000-0000-0000-00000000000a';
SELECT gym_challenge_join('volt-oct','name','Allan D.',3,'challenge_consent_v1',true);
SET test.uid = 'b0000000-0000-0000-0000-00000000000b';
SELECT gym_challenge_join('volt-oct','handle',NULL,4,'challenge_consent_v1',true);
SET test.uid = 'c0000000-0000-0000-0000-00000000000c';
DO $$ BEGIN PERFORM gym_challenge_join('volt-oct','handle',NULL,3,'v1',true); RAISE EXCEPTION 'minor joined'; EXCEPTION WHEN others THEN IF SQLERRM <> 'not_allowed' THEN RAISE; END IF; END $$;
SET test.uid = 'd0000000-0000-0000-0000-00000000000d';
DO $$ BEGIN PERFORM gym_challenge_join('volt-oct','handle',NULL,3,'v1',false); RAISE EXCEPTION 'non-adult joined'; EXCEPTION WHEN others THEN IF SQLERRM <> 'not_allowed' THEN RAISE; END IF; END $$;
SELECT gym_challenge_for_my_gym() ->> 'code' AS invite_for_d;
-- backdate joins to the start
UPDATE gym_challenge_entrants SET joined_on = (SELECT starts_on FROM gym_challenges);
-- A: 3 qualifying days in each of 4 blocks (12), plus a short one and a warm-up-only one
DO $$
DECLARE s date := (SELECT starts_on FROM gym_challenges); i int; w uuid; k int;
BEGIN
  FOR i IN 0..3 LOOP FOR k IN 0..2 LOOP
    w := gen_random_uuid();
    INSERT INTO workouts VALUES (w,'a0000000-0000-0000-0000-00000000000a',(s+7*i+2*k)::timestamp + time '18:00',NULL,45,true,NULL,(s+7*i+2*k)::timestamp + time '19:00');
    INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight)
      SELECT 'a0000000-0000-0000-0000-00000000000a', w, 'row', 'straight', 10, 50 FROM generate_series(1,6);
  END LOOP; END LOOP;
  -- bench 60x8 on day 0, 65x8 on day 14; squat once; pull-up 8 then 10 reps
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
  -- a short workout on day 1 (does not qualify) and a backfilled one on day 3
  w := gen_random_uuid();
  INSERT INTO workouts VALUES (w,'a0000000-0000-0000-0000-00000000000a',(s+1)::timestamp + time '18:00',NULL,15,true,NULL,(s+1)::timestamp + time '19:00');
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight) SELECT 'a0000000-0000-0000-0000-00000000000a', w,'row','straight',10,50 FROM generate_series(1,8);
  w := gen_random_uuid();
  INSERT INTO workouts VALUES (w,'a0000000-0000-0000-0000-00000000000a',(s+3)::timestamp + time '18:00',NULL,50,true,NULL,(s+20)::timestamp);
  INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_type, actual_reps, weight) SELECT 'a0000000-0000-0000-0000-00000000000a', w,'row','straight',10,50 FROM generate_series(1,8);
  -- posts in blocks 0 and 1 (one withheld post in block 2 does not count)
  INSERT INTO community_posts (author_id, kind, status, created_at) VALUES
    ('a0000000-0000-0000-0000-00000000000a','session','visible',(s+1)::timestamptz + interval '12 hours'),
    ('a0000000-0000-0000-0000-00000000000a','session','visible',(s+8)::timestamptz + interval '12 hours'),
    ('a0000000-0000-0000-0000-00000000000a','session','withheld',(s+15)::timestamptz + interval '12 hours');
  -- 2 check-ins
  INSERT INTO weekly_checkins_v2 VALUES ('c1','a0000000-0000-0000-0000-00000000000a',1,(s+6)::timestamptz + interval '12 hours',NULL),
                                       ('c2','a0000000-0000-0000-0000-00000000000a',2,(s+13)::timestamptz + interval '12 hours',NULL);
  -- food: 5 days in block 0 (cap 3), 2 in block 1, a deleted one in block 2
  INSERT INTO food_entries (user_id, entry_date) SELECT 'a0000000-0000-0000-0000-00000000000a', s+g FROM generate_series(0,4) g;
  INSERT INTO food_entries (user_id, entry_date) VALUES ('a0000000-0000-0000-0000-00000000000a', s+7),('a0000000-0000-0000-0000-00000000000a', s+7),('a0000000-0000-0000-0000-00000000000a', s+8);
  INSERT INTO food_entries (user_id, entry_date, deleted_at) VALUES ('a0000000-0000-0000-0000-00000000000a', s+15, now());
  -- weigh-ins in blocks 0 and 2
  INSERT INTO body_metrics (user_id, metric_date, body_weight) VALUES ('a0000000-0000-0000-0000-00000000000a', s+1, 80);
  INSERT INTO morning_weights VALUES ('m1','a0000000-0000-0000-0000-00000000000a',80,(s+16)::timestamptz + interval '7 hours',NULL);
END $$;
-- B is withheld and logged nothing
INSERT INTO test_withheld VALUES ('b0000000-0000-0000-0000-00000000000b');
SET test.uid = 'a0000000-0000-0000-0000-00000000000a';
SELECT jsonb_pretty(gym_challenge_score((SELECT id FROM gym_challenges)) - 'max');
SELECT jsonb_pretty(gym_challenge_board((SELECT id FROM gym_challenges)));
SELECT jsonb_pretty(gym_challenge_mine());
SELECT gym_challenge_set_target((SELECT id FROM gym_challenges), 2) AS lower_target_ignored;
SET test.uid = 'b0000000-0000-0000-0000-00000000000b';
SELECT gym_challenge_score((SELECT id FROM gym_challenges)) -> 'parts' AS b_parts, gym_challenge_score((SELECT id FROM gym_challenges)) ->> 'total' AS b_total;
SELECT gym_challenge_board((SELECT id FROM gym_challenges)) IS NULL AS b_board_null;
SELECT gym_challenge_withdraw((SELECT id FROM gym_challenges));
-- close and draw on an ended copy
RESET test.uid;
UPDATE gym_challenges SET starts_on = current_date - 40, ends_on = current_date - 13;
UPDATE gym_challenge_entrants SET joined_on = current_date - 40;
SELECT gym_challenge_close((SELECT id FROM gym_challenges));
SELECT shown_as, total, food, weighin, frozen, withdrawn FROM gym_challenge_results((SELECT id FROM gym_challenges));
UPDATE gym_challenges SET main_threshold = 5, second_threshold = 1;
SELECT gym_challenge_draw((SELECT id FROM gym_challenges), 'main', 1) ->> 'eligible' AS main_eligible;
DO $$ BEGIN PERFORM gym_challenge_draw((SELECT id FROM gym_challenges), 'second', 1); RAISE EXCEPTION 'second should have no one left'; EXCEPTION WHEN others THEN IF SQLERRM <> 'none_eligible' THEN RAISE; END IF; END $$;
SET ROLE authenticated;
DO $$ BEGIN PERFORM gym_challenge_results((SELECT id FROM gym_challenges)); RAISE EXCEPTION 'authenticated ran results'; EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
RESET ROLE;
SELECT 'ALL OK';
