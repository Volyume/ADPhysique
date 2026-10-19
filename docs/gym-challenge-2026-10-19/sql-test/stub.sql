CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE TABLE gym_venues (id uuid PRIMARY KEY, name text, display_name text, status text);
CREATE TABLE community_profiles (user_id uuid PRIMARY KEY, handle text, display_name text, is_minor boolean DEFAULT false, status text DEFAULT 'active', gym_id uuid, other_gym_ids uuid[]);
CREATE TABLE workouts (id uuid PRIMARY KEY, user_id uuid, started_at timestamp, ended_at timestamp, duration_minutes int, is_completed boolean, deleted_at timestamptz, created_at timestamp DEFAULT now());
CREATE TABLE workout_sets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, workout_id uuid, exercise_id text, set_type text, actual_reps int, weight numeric, deleted_at timestamptz);
CREATE TABLE food_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, entry_date date, kcal numeric, deleted_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE body_metrics (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, metric_date date, body_weight numeric, deleted_at timestamptz, created_at timestamp DEFAULT now());
CREATE TABLE morning_weights (id text PRIMARY KEY, user_id uuid, weight_kg numeric, logged_at timestamptz, deleted_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE weekly_checkins_v2 (id text PRIMARY KEY, user_id uuid, week_start bigint, created_at timestamptz, deleted_at timestamptz);
CREATE TABLE community_posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid, kind text, status text, created_at timestamptz);
CREATE TABLE test_withheld (user_id uuid PRIMARY KEY);
CREATE FUNCTION _community_caller() RETURNS uuid LANGUAGE plpgsql STABLE AS $$ DECLARE v uuid := auth.uid(); BEGIN IF v IS NULL THEN RAISE EXCEPTION USING message='not_signed_in'; END IF; RETURN v; END $$;
CREATE FUNCTION _community_consistency_withheld(_uid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM test_withheld WHERE user_id=_uid) $$;
-- Review round 1 additions: date of birth, ED flag history, the free-text
-- gate, and a stand-in for pg_cron.
CREATE TABLE user_body_profile (user_id uuid PRIMARY KEY, date_of_birth text);
CREATE TABLE ed_pattern_flags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, raised_at timestamptz, cleared_at timestamptz, deleted_at timestamptz);
CREATE FUNCTION _community_clean_text(_t text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT btrim(_t) $$;
CREATE SCHEMA cron;
CREATE TABLE cron.job (jobid bigserial PRIMARY KEY, jobname text, schedule text, command text);
CREATE FUNCTION cron.schedule(_n text, _s text, _c text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job (jobname, schedule, command) VALUES (_n, _s, _c) RETURNING jobid $$;
CREATE FUNCTION cron.unschedule(_id bigint) RETURNS boolean LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobid = _id RETURNING true $$;
