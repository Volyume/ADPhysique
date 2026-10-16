-- migrate_195_custom_foods_portions.sql
--
-- Purpose:          D230 R20 (docs/audit/food-levelup-2026-10-16/
--                   03-ASSESSMENT-AND-PLAN.md, lane 4B): custom portions on a
--                   custom food. A person who thinks in "1 slice" and "1 mug"
--                   names up to three portions of a food. The first stays in
--                   serving_g and serving_label; the second and third are a
--                   jsonb array of at most two { label, grams } objects (label
--                   1 to 24 characters, grams 1 to 5000; the app validates and
--                   the push sends the parsed array). One additive, nullable
--                   jsonb column on custom_foods, and food_sync_push taught
--                   to store it.
-- Applied locally:  YES, via the schema step in src/lib/database.js that adds
--                   custom_foods.portions_json (ALTER TABLE ADD COLUMN as TEXT,
--                   no default, no backfill: every existing row reads NULL).
-- Applied remotely: NO. HELD for the founder's exact phrase "run against
--                   production" for 195. The app never applies it. Until it is
--                   applied the push omits the column
--                   (CUSTOM_FOOD_PORTIONS_PUSH in src/lib/sync/featureFlags.js
--                   is false). Flip the flag to true only after this is
--                   applied and verified read-only.
-- Safe to re-run:   YES. ADD COLUMN IF NOT EXISTS; DROP FUNCTION IF EXISTS
--                   then CREATE OR REPLACE FUNCTION are idempotent.
-- Rollback:         ALTER TABLE public.custom_foods
--                     DROP COLUMN IF EXISTS portions_json;
--                   then re-apply migrate_194's food_sync_push definition
--                   verbatim (the custom_foods branch loses portions_json
--                   again; the food_entries branch keeps 194's note).
--                   food_sync_pull is NOT re-issued: its custom_foods branch
--                   uses to_jsonb(t) (migrate_115), so it returns
--                   portions_json automatically once the column exists.
-- Depends on:       migrate_194_food_entries_note.sql, which must be applied
--                   FIRST. THIS FILE RE-ISSUES food_sync_push: its body is
--                   migrate_194's body verbatim (which is migrate_118's with
--                   194's note handling in the food_entries branch), changed
--                   ONLY in the custom_foods branch (portions_json added to
--                   the insert column list, its value, and the ON CONFLICT
--                   update). Applied before 194, it would leave a function that
--                   names food_entries.note, a column the cloud would lack, so
--                   every food_entries push would fail. Whichever of 194 and
--                   195 applies last wins, so this later file is built on the
--                   earlier file's body, and 194 must not be re-applied after
--                   195 (that would drop portions_json from the function; if
--                   it is, re-apply 195).

ALTER TABLE public.custom_foods
  ADD COLUMN IF NOT EXISTS portions_json jsonb;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'food_sync_push'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

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
        sodium_100g, sugar_100g, barcode_ean, portions_json, created_at, updated_at
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
        CASE WHEN jsonb_typeof(v_row->'portions_json') = 'array'
             THEN v_row->'portions_json' ELSE NULL END,
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
            -- portions_json: written only when the pushed record carries the
            -- key, so a build that predates the column never blanks the
            -- portions another device set.
            portions_json = CASE WHEN v_row ? 'portions_json'
                                 THEN EXCLUDED.portions_json
                                 ELSE custom_foods.portions_json END,
            updated_at = v_now;
    END LOOP;
  END IF;

  IF changes ? 'food_entries' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO food_entries (
        id, user_id, entry_date, meal_slot, food_ref, quantity_g,
        kcal, protein_g, carbs_g, fat_g, fibre_g, weight_state, eaten_at, note,
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
        NULLIF(left(v_row->>'note', 120), ''),
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
        -- note: written only when the pushed record carries the key, so a
        -- build that predates the column never blanks a note another device set.
        note = CASE WHEN v_row ? 'note' THEN NULLIF(left(v_row->>'note', 120), '') ELSE note END,
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

GRANT EXECUTE ON FUNCTION public.food_sync_push(jsonb) TO authenticated;

-- Verification:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'custom_foods' AND column_name = 'portions_json';
--   -- expect 1 row, jsonb
--   SELECT prosrc LIKE '%portions_json%' AND prosrc LIKE '%left(v_row->>''note'', 120)%'
--   FROM pg_proc WHERE proname = 'food_sync_push' AND pronamespace = 'public'::regnamespace;
--   -- expect true (the function carries both 194's note and 195's portions)
