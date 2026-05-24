-- Migration 018: composite (user_id, id) primary keys
--
-- ============================================================
-- DO NOT APPLY YET.
--
-- Release policy locked 2026-05-24: the current Play Console
-- closed-testing build stays in place until the full app is built
-- out -- not half done. This migration ships as part of the
-- accumulated branch state; it applies to production cloud only at
-- the coordinated release the user decides to trigger.
--
-- When the user is ready to release, the sequence is:
--   1. Confirm every committed move + design fix on the branch is
--      ready (no pending blockers in HANDOFF.md).
--   2. Build the new app version from this branch and upload to
--      Play Console closed testing.
--   3. Wait until every tester device shows the new release
--      (Play Console > Releases > Active devices).
--   4. THEN apply this migration via Supabase Dashboard -> SQL Editor.
--   5. New code uses onConflict: 'user_id,id' from this point on.
--
-- Until that day arrives, this file sits unapplied. The current
-- production cloud schema (no composite PK) continues to serve the
-- old app build without disruption.
--
-- ============================================================
--
-- Locked in docs/IDENTITY_AND_OWNERSHIP_LOCKED.md:
--   "Every user-scoped table is PRIMARY KEY (user_id, id). Two users
--   cannot collide on a row at the schema level. Cross-user-id-clash
--   becomes impossible, not merely unlikely."
--
-- This single change fixes the existing 42501 cascade automatically:
-- previously-failing local rows push as fresh (current_user, id)
-- inserts because (current_user, id) is a different primary key from
-- the (old_user, id) that already exists in cloud.

-- ─────────────────────────────────────────────────────────────────────
-- Helper: drop every FK constraint pointing AT a given table. We need
-- this because changing a PK to composite invalidates every FK that
-- referenced the old single-column PK. We don't re-add app-layer FKs
-- after the change; RLS + app-side joins handle the integrity. This
-- keeps the migration short and skips a thousand lines of constraint
-- rebuild SQL. Foreign-key checks at the app layer were already the
-- de-facto enforcer for years.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
                  c.connamespace::regnamespace, c.conrelid::regclass, c.conname) AS cmd
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.confrelid::regclass::text IN (
        -- Parents whose PK is changing; FKs that reference these by id
        -- need to come down. exercises + recipes excluded (their PKs
        -- aren't changing in this migration; see notes below).
        'routines', 'workouts', 'mesocycles', 'programmes'
      )
  LOOP
    BEGIN
      EXECUTE r.cmd;
    EXCEPTION WHEN OTHERS THEN
      -- Already dropped or never existed. Continue.
      NULL;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Add user_id to children that don't have one. Backfill from parent.
-- These columns become NOT NULL once backfilled.
-- ─────────────────────────────────────────────────────────────────────

-- routine_exercises: no user_id; inherits from routines.
ALTER TABLE routine_exercises ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE routine_exercises re
SET user_id = r.user_id
FROM routines r
WHERE re.routine_id = r.id AND re.user_id IS NULL;
-- Rows with no resolvable parent get deleted (cascade-orphan cleanup).
DELETE FROM routine_exercises WHERE user_id IS NULL;
ALTER TABLE routine_exercises ALTER COLUMN user_id SET NOT NULL;

-- mesocycle_weeks: no user_id; inherits from mesocycles.
ALTER TABLE mesocycle_weeks ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE mesocycle_weeks mw
SET user_id = m.user_id
FROM mesocycles m
WHERE mw.mesocycle_id = m.id AND mw.user_id IS NULL;
DELETE FROM mesocycle_weeks WHERE user_id IS NULL;
ALTER TABLE mesocycle_weeks ALTER COLUMN user_id SET NOT NULL;

-- recipe_ingredients deliberately excluded: food tables retain their
-- existing (id) primary keys for now. The food sync RPC (migration 016)
-- uses ON CONFLICT (id) internally and would need a coordinated
-- update; that's a separate workstream when the food layer matures.
-- The 42501 cascade reported by the founder did not include food
-- tables, so deferring is safe.

-- ─────────────────────────────────────────────────────────────────────
-- Swap each table's PK from (id) to (user_id, id).
--
-- Pattern: discover the existing PK constraint name, drop it, add the
-- composite. PK constraint names vary across environments depending on
-- whether the table was created via PRIMARY KEY shorthand, named
-- explicitly, or recreated by a prior migration. Walking pg_constraint
-- finds whatever's there.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  pkname text;
  tables text[] := ARRAY[
    -- Tables that hit 42501 in the founder's debug log and the
    -- supporting tables they reference. Composite-PK these; old app
    -- builds continue to read and insert fresh rows; only their
    -- upsert-with-id-conflict path stops working.
    'routines', 'routine_exercises',
    'workouts', 'workout_sets',
    -- exercises excluded: mixed-ownership (user_id nullable for the
    -- shared library rows). Composite PK requires NOT NULL; a
    -- library/custom split is a separate workstream.
    'mesocycles', 'mesocycle_weeks',
    'planned_muscle_volume', 'adaptation_events',
    'programmes',
    'morning_weights', 'weekly_checkins_v2', 'coach_outputs',
    'body_metrics',
    'nutrition_targets', 'user_insights',
    'peak_week_plans', 'exercise_user_notes', 'exercise_goals',
    'workout_notes_v2',
    'ed_pattern_flags', 'engine_telemetry', 'engine_overrides'
    -- Food tables (custom_foods, food_entries, saved_meals, recipes,
    -- recipe_ingredients) deliberately excluded; see comment above.
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Skip the table if it doesn't exist in this database. Beta
    -- testers' older Supabase project may not have shipped the food
    -- or ED-pattern migrations yet, so those tables may be missing.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      RAISE NOTICE 'Skipping %: table does not exist', tbl;
      CONTINUE;
    END IF;

    -- Find the existing PK name.
    SELECT conname INTO pkname
    FROM pg_constraint
    WHERE conrelid = format('public.%I', tbl)::regclass
      AND contype = 'p'
    LIMIT 1;

    -- If a composite (user_id, id) already exists, skip. Re-runnable.
    IF pkname IS NOT NULL THEN
      DECLARE
        pkcols text;
      BEGIN
        SELECT string_agg(attname, ',' ORDER BY array_position(conkey, attnum))
          INTO pkcols
        FROM pg_attribute a
        JOIN pg_constraint c ON c.conrelid = a.attrelid
        WHERE c.conname = pkname AND a.attnum = ANY(c.conkey)
          AND a.attrelid = format('public.%I', tbl)::regclass;
        IF pkcols = 'user_id,id' OR pkcols = 'id,user_id' THEN
          RAISE NOTICE 'Skipping %: composite PK already present (%)', tbl, pkcols;
          CONTINUE;
        END IF;
      END;
    END IF;

    -- Some user-scoped tables already use a different composite PK
    -- (daily_intake_rollups uses (user_id, entry_date) which is the
    -- correct natural key). Skip those: they're already collision-safe.
    IF pkname IS NOT NULL THEN
      DECLARE
        pkhas_user_id boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM pg_attribute a
          JOIN pg_constraint c ON c.conrelid = a.attrelid
          WHERE c.conname = pkname
            AND a.attname = 'user_id'
            AND a.attnum = ANY(c.conkey)
            AND a.attrelid = format('public.%I', tbl)::regclass
        ) INTO pkhas_user_id;
        IF pkhas_user_id THEN
          RAISE NOTICE 'Skipping %: PK already includes user_id', tbl;
          CONTINUE;
        END IF;
      END;
    END IF;

    -- Drop the old PK, add the composite. Wrapped per-table so one
    -- failure (e.g. orphan rows blocking the new PK) doesn't abort
    -- the whole migration -- the user sees which table needs hand
    -- attention.
    BEGIN
      IF pkname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, pkname);
      END IF;
      EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (user_id, id)', tbl);
      RAISE NOTICE 'Composite PK installed on %', tbl;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to set composite PK on %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Indexes that the old single-column PK provided for free. Recreate
-- explicitly so id-only lookups (used by some app paths and PostgREST
-- /table/{id} routes) stay fast.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'routines', 'routine_exercises',
    'workouts', 'workout_sets',
    -- exercises excluded: mixed-ownership (user_id nullable for the
    -- shared library rows). Composite PK requires NOT NULL; a
    -- library/custom split is a separate workstream.
    'mesocycles', 'mesocycle_weeks',
    'planned_muscle_volume', 'adaptation_events',
    'programmes',
    'morning_weights', 'weekly_checkins_v2', 'coach_outputs',
    'body_metrics',
    'nutrition_targets', 'user_insights',
    'peak_week_plans', 'exercise_user_notes', 'exercise_goals',
    'workout_notes_v2',
    'ed_pattern_flags', 'engine_telemetry', 'engine_overrides'
    -- Food tables (custom_foods, food_entries, saved_meals, recipes,
    -- recipe_ingredients) deliberately excluded; see comment above.
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;
    BEGIN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_id ON public.%I(id)',
        tbl, tbl
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to add id-index on %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Acceptance check. Should print one row per migrated table showing
-- the new composite PK. Reads cleanly in the Supabase SQL Editor
-- output panel.
-- ─────────────────────────────────────────────────────────────────────

SELECT
  c.conrelid::regclass::text AS table_name,
  string_agg(a.attname, ',' ORDER BY array_position(c.conkey, a.attnum)) AS pk_cols
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'p'
  AND c.conrelid::regclass::text = ANY(ARRAY[
    'routines', 'routine_exercises',
    'workouts', 'workout_sets',
    -- exercises excluded: mixed-ownership (user_id nullable for the
    -- shared library rows). Composite PK requires NOT NULL; a
    -- library/custom split is a separate workstream.
    'mesocycles', 'mesocycle_weeks',
    'planned_muscle_volume', 'adaptation_events',
    'programmes',
    'morning_weights', 'weekly_checkins_v2', 'coach_outputs',
    'body_metrics',
    'nutrition_targets', 'user_insights',
    'peak_week_plans', 'exercise_user_notes', 'exercise_goals',
    'workout_notes_v2',
    'ed_pattern_flags', 'engine_telemetry', 'engine_overrides'
    -- Food tables (custom_foods, food_entries, saved_meals, recipes,
    -- recipe_ingredients) deliberately excluded; see comment above.
  ])
GROUP BY c.conrelid
ORDER BY table_name;
