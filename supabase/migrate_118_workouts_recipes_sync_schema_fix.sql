-- migrate_118_workouts_recipes_sync_schema_fix.sql
--
-- Purpose:          Fix real, ongoing cloud/client schema drift found while
--                   triaging a week of Sentry issues (VOLYUME-S, VOLYUME-1C,
--                   VOLYUME-1A, plus latent breaks in recipes/saved_meals
--                   sync found during the same audit). Four independent
--                   fixes, all additive/renaming on empty or client-tolerant
--                   tables, no destructive drops:
--
--   1. workouts: add energy_score, sleep_quality (this is migrate_072's
--      content -- that file was written in 2026-06 but never applied to
--      production; the client has been writing these fields on every
--      pre-workout intent since, and sync.js's missingSchemaColumn shim
--      silently stripped them before every upsert, so every user's
--      pre-workout readiness data has been discarded before reaching
--      cloud. 3800+/450+ Sentry occurrences (VOLYUME-S/1C).
--
--   2. recipes: rename total_servings -> servings, add notes. The live
--      food_sync_push RPC (below) has read/written `servings`/`notes`
--      since migrate_021/023 shipped; the table itself was never migrated
--      to match, so every recipe push has thrown "column servings does
--      not exist" since. recipes has 0 rows in production -- this has
--      never worked, for anyone. Rename is safe (no other reader of
--      total_servings found in the codebase).
--
--   3. recipe_ingredients: rename position -> order_index, add created_at.
--      The client (src/lib/sync/tables/recipeIngredients.js) upserts
--      directly against this table using order_index/created_at; the
--      table has neither. 0 rows in production -- same story as #2.
--
--   4. food_sync_push RPC: the saved_meals branch inserts/updates a
--      column named `ingredients`, but the table's real column (and what
--      every layer of the client agrees on -- migrate_015 DDL, local
--      schema, applySavedMealFromCloud) is `items_json`. Every saved-meal
--      push has been throwing "column ingredients does not exist".
--      Re-declaring the whole function (CREATE OR REPLACE) with just
--      that one column reference fixed; every other branch copied
--      verbatim from the live definition, unchanged.
--
-- Applied locally:  N/A -- local SQLite already uses the target names
--                   (total_servings/order_index/created_at/energy_score/
--                   sleep_quality/items_json) documented in the mapper
--                   comments in src/lib/sync/tables/foodDomain.js,
--                   recipeIngredients.js and src/lib/sync.js; this
--                   migration brings cloud in line with what the client
--                   has always sent, not the other way round.
-- Applied remotely: YES -- applied 2026-07-11 via Claude, founder said
--                   "run against production".
-- Safe to re-run:   YES. IF NOT EXISTS / IF EXISTS guards throughout;
--                   the RENAMEs no-op with an error if already renamed,
--                   guarded below; CREATE OR REPLACE FUNCTION is
--                   idempotent by definition.
-- Rollback:         ALTER TABLE workouts DROP COLUMN energy_score, DROP
--                   COLUMN sleep_quality; ALTER TABLE recipes RENAME
--                   COLUMN servings TO total_servings, DROP COLUMN notes;
--                   ALTER TABLE recipe_ingredients RENAME COLUMN
--                   order_index TO position, DROP COLUMN created_at;
--                   food_sync_push: re-apply the prior CREATE OR REPLACE
--                   with `ingredients` in the saved_meals branch (git
--                   history has the exact prior body).

-- 1. workouts readiness columns (migrate_072 content).
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS sleep_quality integer,
  ADD COLUMN IF NOT EXISTS energy_score integer;

-- 2. recipes: match the RPC's long-standing servings/notes usage.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'total_servings'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipes' AND column_name = 'servings'
  ) THEN
    ALTER TABLE recipes RENAME COLUMN total_servings TO servings;
  END IF;
END $$;
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. recipe_ingredients: match the client's direct-upsert column names.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipe_ingredients' AND column_name = 'position'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipe_ingredients' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE recipe_ingredients RENAME COLUMN position TO order_index;
  END IF;
END $$;
ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 4. food_sync_push RPC: fix the saved_meals column name only.
-- Every other branch below is copied verbatim from the live function
-- (pg_get_functiondef), unchanged.
CREATE OR REPLACE FUNCTION public.food_sync_push(changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_result jsonb := '{}'::jsonb;
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'food_sync_push: not authenticated';
  END IF;

  IF changes ? 'custom_foods' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO custom_foods (
        id, user_id, name, brand, serving_g, serving_label,
        kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
        sodium_100g, sugar_100g, barcode_ean, created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        v_row->>'name', v_row->>'brand',
        (v_row->>'serving_g')::real, v_row->>'serving_label',
        (v_row->>'kcal_100g')::real, (v_row->>'protein_100g')::real,
        (v_row->>'carbs_100g')::real, (v_row->>'fat_100g')::real,
        NULLIF(v_row->>'fibre_100g','')::real,
        NULLIF(v_row->>'sodium_100g','')::real,
        NULLIF(v_row->>'sugar_100g','')::real,
        NULLIF(v_row->>'barcode_ean',''),
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO UPDATE
        SET name = EXCLUDED.name,
            brand = EXCLUDED.brand,
            serving_g = EXCLUDED.serving_g,
            serving_label = EXCLUDED.serving_label,
            kcal_100g = EXCLUDED.kcal_100g,
            protein_100g = EXCLUDED.protein_100g,
            carbs_100g = EXCLUDED.carbs_100g,
            fat_100g = EXCLUDED.fat_100g,
            fibre_100g = EXCLUDED.fibre_100g,
            sodium_100g = EXCLUDED.sodium_100g,
            sugar_100g = EXCLUDED.sugar_100g,
            barcode_ean = EXCLUDED.barcode_ean,
            updated_at = v_now;
    END LOOP;
  END IF;

  IF changes ? 'food_entries' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO food_entries (
        id, user_id, entry_date, meal_slot, food_ref, quantity_g,
        kcal, protein_g, carbs_g, fat_g, fibre_g, weight_state, eaten_at,
        created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        (v_row->>'entry_date')::date, v_row->>'meal_slot',
        v_row->>'food_ref', (v_row->>'quantity_g')::real,
        (v_row->>'kcal')::real, (v_row->>'protein_g')::real,
        (v_row->>'carbs_g')::real, (v_row->>'fat_g')::real,
        NULLIF(v_row->>'fibre_g','')::real,
        COALESCE(NULLIF(v_row->>'weight_state',''), 'as_weighed'),
        NULLIF(v_row->>'eaten_at','')::timestamptz,
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'updated', '[]'::jsonb))
    LOOP
      UPDATE food_entries SET
        entry_date = (v_row->>'entry_date')::date,
        meal_slot = v_row->>'meal_slot',
        food_ref = v_row->>'food_ref',
        quantity_g = (v_row->>'quantity_g')::real,
        kcal = (v_row->>'kcal')::real,
        protein_g = (v_row->>'protein_g')::real,
        carbs_g = (v_row->>'carbs_g')::real,
        fat_g = (v_row->>'fat_g')::real,
        fibre_g = NULLIF(v_row->>'fibre_g','')::real,
        weight_state = COALESCE(NULLIF(v_row->>'weight_state',''), 'as_weighed'),
        eaten_at = NULLIF(v_row->>'eaten_at','')::timestamptz,
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM food_entries
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  IF changes ? 'daily_intake_rollups' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'daily_intake_rollups'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO daily_intake_rollups (
        user_id, entry_date, kcal_total, protein_total, carbs_total,
        fat_total, fibre_total, updated_at
      ) VALUES (
        v_uid, (v_row->>'entry_date')::date,
        (v_row->>'kcal_total')::real, (v_row->>'protein_total')::real,
        (v_row->>'carbs_total')::real, (v_row->>'fat_total')::real,
        NULLIF(v_row->>'fibre_total','')::real, v_now
      )
      ON CONFLICT (user_id, entry_date) DO UPDATE
        SET kcal_total = EXCLUDED.kcal_total,
            protein_total = EXCLUDED.protein_total,
            carbs_total = EXCLUDED.carbs_total,
            fat_total = EXCLUDED.fat_total,
            fibre_total = EXCLUDED.fibre_total,
            updated_at = v_now;
    END LOOP;
  END IF;

  IF changes ? 'food_favourites' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_favourites'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO food_favourites (user_id, food_ref, last_used_at)
      VALUES (
        v_uid, v_row->>'food_ref',
        COALESCE((v_row->>'last_used_at')::timestamptz, v_now)
      )
      ON CONFLICT (user_id, food_ref) DO UPDATE
        SET last_used_at = EXCLUDED.last_used_at,
            deleted_at = NULL
        WHERE food_favourites.last_used_at < EXCLUDED.last_used_at;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_favourites'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE food_favourites
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            last_used_at = COALESCE((v_row->>'last_used_at')::timestamptz, v_now)
      WHERE user_id = v_uid AND food_ref = v_row->>'food_ref';
    END LOOP;
  END IF;

  IF changes ? 'daily_water' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'daily_water'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO daily_water (user_id, entry_date, ml, updated_at)
      VALUES (
        v_uid, (v_row->>'entry_date')::date,
        (v_row->>'ml')::integer, v_now
      )
      ON CONFLICT (user_id, entry_date) DO UPDATE
        SET ml = EXCLUDED.ml,
            updated_at = v_now,
            deleted_at = NULL
        WHERE daily_water.updated_at < EXCLUDED.updated_at;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'daily_water'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE daily_water
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = COALESCE((v_row->>'updated_at')::timestamptz, v_now)
      WHERE user_id = v_uid AND entry_date = (v_row->>'entry_date')::date;
    END LOOP;
  END IF;

  IF changes ? 'saved_meals' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'created', '[]'::jsonb))
    LOOP
      -- FIX: column is items_json (matches the table + every client
      -- layer), not ingredients. Was silently failing every push.
      INSERT INTO saved_meals (id, user_id, name, items_json, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        COALESCE(v_row->'items_json', '[]'::jsonb), v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'updated', '[]'::jsonb))
    LOOP
      UPDATE saved_meals SET
        name = v_row->>'name',
        items_json = COALESCE(v_row->'items_json', '[]'::jsonb),
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM saved_meals
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  IF changes ? 'recipes' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO recipes (id, user_id, name, servings, notes, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        NULLIF(v_row->>'servings','')::real,
        v_row->>'notes', v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'updated', '[]'::jsonb))
    LOOP
      UPDATE recipes SET
        name = v_row->>'name',
        servings = NULLIF(v_row->>'servings','')::real,
        notes = v_row->>'notes',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM recipes
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  IF changes ? 'recipe_ingredients' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipe_ingredients'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO recipe_ingredients (
        id, user_id, recipe_id, food_ref, quantity_g, created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        (v_row->>'recipe_id')::uuid,
        v_row->>'food_ref', (v_row->>'quantity_g')::real,
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipe_ingredients'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM recipe_ingredients
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  v_result := jsonb_build_object('applied_at', v_now);
  RETURN v_result;
END;
$function$;

-- Verification:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'workouts' AND column_name IN ('sleep_quality', 'energy_score');
--   -- expect 2 rows
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'recipes' AND column_name IN ('servings', 'notes');
--   -- expect 2 rows
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'recipe_ingredients' AND column_name IN ('order_index', 'created_at');
--   -- expect 2 rows
