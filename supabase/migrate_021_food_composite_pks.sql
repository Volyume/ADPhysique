-- Migration 021: composite (user_id, id) PKs on food tables
--
-- Safe to apply now. Extends the IDENTITY_AND_OWNERSHIP_LOCKED.md
-- design to the food domain. Deferred from migration 018 because the
-- food sync RPC (defined in migration 016) used ON CONFLICT (id)
-- internally and needed a coordinated update; this migration handles
-- both the schema change AND the RPC update in one apply.
--
-- Tables migrated to composite PK:
--   custom_foods         (PK was id; now (user_id, id))
--   food_entries         (PK was id; now (user_id, id))
--   saved_meals          (PK was id; now (user_id, id))
--   recipes              (PK was id; now (user_id, id))
--   recipe_ingredients   (no user_id today; added + backfilled, then
--                         (user_id, id) PK installed)
--
-- Already-composite (no change):
--   daily_intake_rollups (PK (user_id, entry_date) already correct)
--   food_favourites      (PK (user_id, food_ref) already correct)
--   daily_water          (PK (user_id, entry_date) already correct)
--
-- Library-only (no change):
--   foods                (shared OFF/USDA/CoFID cache, no user_id)
--
-- Old-client safety:
--   recipe_ingredients gets a BEFORE INSERT trigger that auto-fills
--   user_id from the parent recipe, mirroring the routine_exercises
--   approach in migration 018. Old app pushes that don't include
--   user_id continue to succeed.
--
-- Apply with: paste into Supabase Dashboard -> SQL Editor -> Run.

-- ─────────────────────────────────────────────────────────────────────
-- Add user_id column to recipe_ingredients (the one food child table
-- that lacks it). Backfill from parent, then enforce NOT NULL.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE recipe_ingredients ri
SET user_id = r.user_id
FROM recipes r
WHERE ri.recipe_id = r.id AND ri.user_id IS NULL;

DELETE FROM recipe_ingredients WHERE user_id IS NULL;

ALTER TABLE recipe_ingredients ALTER COLUMN user_id SET NOT NULL;

-- Old-client safety trigger: pre-Eat-component build pushes
-- recipe_ingredients without user_id. Trigger fills it from the
-- parent so inserts continue to succeed.
CREATE OR REPLACE FUNCTION recipe_ingredients_inherit_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM recipes WHERE id = NEW.recipe_id LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_recipe_ingredients_inherit_user_id ON recipe_ingredients;
CREATE TRIGGER trg_recipe_ingredients_inherit_user_id
BEFORE INSERT ON recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION recipe_ingredients_inherit_user_id();

-- ─────────────────────────────────────────────────────────────────────
-- Drop FK constraints that reference the parents whose PK is changing.
-- (recipe_ingredients.recipe_id was the only one; routine_exercises
--  and similar were already handled in migration 018.) App-layer
-- enforcement + RLS continue to keep referential integrity.
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
      AND c.confrelid::regclass::text IN ('custom_foods', 'food_entries', 'saved_meals', 'recipes')
  LOOP
    BEGIN
      EXECUTE r.cmd;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Swap each food table's PK from (id) to (user_id, id). Same per-table
-- pattern as migration 018, including skip-if-already-composite.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  pkname text;
  tables text[] := ARRAY[
    'custom_foods', 'food_entries', 'saved_meals', 'recipes', 'recipe_ingredients'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      RAISE NOTICE 'Skipping %: table does not exist', tbl;
      CONTINUE;
    END IF;

    SELECT conname INTO pkname
    FROM pg_constraint
    WHERE conrelid = format('public.%I', tbl)::regclass
      AND contype = 'p'
    LIMIT 1;

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

    BEGIN
      IF pkname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, pkname);
      END IF;
      EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (user_id, id)', tbl);
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_id ON public.%I(id)',
        tbl, tbl
      );
      RAISE NOTICE 'Composite PK installed on %', tbl;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to set composite PK on %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Update food_sync_push RPC to use ON CONFLICT (user_id, id) for the
-- food tables that just moved to composite PK. The recipe_ingredients
-- block also switches from (id) -> (user_id, id) since the column is
-- now NOT NULL on that table.
--
-- This re-declares the function. The DROP guard handles the case where
-- the existing function signature differs from the new one (PostgREST
-- otherwise refuses CREATE OR REPLACE on signature change).
-- ─────────────────────────────────────────────────────────────────────

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

CREATE OR REPLACE FUNCTION food_sync_push(changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_result jsonb := '{}'::jsonb;
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'food_sync_push: not authenticated';
  END IF;

  -- custom_foods (composite PK now)
  IF changes ? 'custom_foods' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO custom_foods (
        id, user_id, name, brand, serving_g, serving_label,
        kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
        sodium_100g, sugar_100g, created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        v_row->>'name', v_row->>'brand',
        (v_row->>'serving_g')::real, v_row->>'serving_label',
        (v_row->>'kcal_100g')::real, (v_row->>'protein_100g')::real,
        (v_row->>'carbs_100g')::real, (v_row->>'fat_100g')::real,
        NULLIF(v_row->>'fibre_100g','')::real,
        NULLIF(v_row->>'sodium_100g','')::real,
        NULLIF(v_row->>'sugar_100g','')::real,
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
            updated_at = v_now;
    END LOOP;
  END IF;

  -- food_entries
  IF changes ? 'food_entries' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO food_entries (
        id, user_id, entry_date, meal_slot, food_ref, quantity_g,
        kcal, protein_g, carbs_g, fat_g, fibre_g,
        created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        (v_row->>'entry_date')::date, v_row->>'meal_slot',
        v_row->>'food_ref', (v_row->>'quantity_g')::real,
        (v_row->>'kcal')::real, (v_row->>'protein_g')::real,
        (v_row->>'carbs_g')::real, (v_row->>'fat_g')::real,
        NULLIF(v_row->>'fibre_g','')::real,
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
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM food_entries
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- daily_intake_rollups (composite PK on (user_id, entry_date) already)
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

  -- food_favourites (composite PK on (user_id, food_ref) already)
  IF changes ? 'food_favourites' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_favourites'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO food_favourites (user_id, food_ref, last_used_at)
      VALUES (
        v_uid, v_row->>'food_ref',
        COALESCE((v_row->>'last_used_at')::timestamptz, v_now)
      )
      ON CONFLICT (user_id, food_ref) DO UPDATE
        SET last_used_at = EXCLUDED.last_used_at
        WHERE food_favourites.last_used_at < EXCLUDED.last_used_at;
    END LOOP;
  END IF;

  -- daily_water (composite PK)
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
            updated_at = v_now
        WHERE daily_water.updated_at < EXCLUDED.updated_at;
    END LOOP;
  END IF;

  -- saved_meals (composite PK now)
  IF changes ? 'saved_meals' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO saved_meals (id, user_id, name, ingredients, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        v_row->'ingredients', v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'updated', '[]'::jsonb))
    LOOP
      UPDATE saved_meals SET
        name = v_row->>'name',
        ingredients = v_row->'ingredients',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM saved_meals
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- recipes (composite PK now)
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

  -- recipe_ingredients (composite PK now; user_id auto-fills from
  -- parent via the trigger above for old-app inserts).
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
$$;

GRANT EXECUTE ON FUNCTION food_sync_push(jsonb) TO authenticated;
