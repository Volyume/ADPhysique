-- migrate_090_food_delete_tombstones.sql
-- Cross-device delete sync for food_favourites + daily_water
-- (Hevy teardown docs/hevy-teardown-2026-06-29/D1-code-bugs.md, finding #8).
--
-- THE BUG (#8, data-loss): food_favourites and daily_water had NO tombstone
-- column and their food_sync_pull/push slices only ever carried `updated`. A
-- delete on device A was simply absent from the next change query, so it never
-- reached the cloud and re-pulled back from device B. This migration gives both
-- tables a `deleted_at` tombstone and teaches the two bulk RPCs to (a) emit a
-- real `deleted` slice on pull, (b) exclude tombstoned rows from `updated` on
-- pull, and (c) apply a `deleted` slice (set deleted_at, last-write-wins) on
-- push. Mirrors the soft-delete contract the core food tables already use.
--
-- ADDITIVE + idempotent only. Applied by CI on merge to main
-- (deploy-migrations.yml); never run by hand against production.
--
-- The two functions are reproduced in FULL because plpgsql has no "patch one
-- branch" operation — CREATE OR REPLACE needs the whole body. food_sync_pull is
-- reproduced from its canonical definition in migrate_016 (last redefinition);
-- food_sync_push from migrate_023 (last redefinition). Every other table's
-- branch is byte-for-byte identical to those sources; ONLY the food_favourites
-- and daily_water branches change. No return-type/argument change, so plain
-- CREATE OR REPLACE is safe (no PostgREST 42P13).
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:  090
--   - Purpose:           food_favourites.deleted_at + daily_water.deleted_at
--                        tombstones; food_sync_pull/push carry a `deleted`
--                        slice for both tables so deletes propagate cross-device.
--   - Applied locally:   NO (no local dev Supabase project)
--   - Applied remotely:  NO (auto-applies on merge to main via
--                        deploy-migrations.yml; STAGING per docs/rules/supabase.md)
--   - Safe to re-run:    YES (ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE
--                        FUNCTION + CREATE INDEX IF NOT EXISTS — idempotent)
--   - Rollback:          ALTER TABLE food_favourites DROP COLUMN IF EXISTS deleted_at;
--                        ALTER TABLE daily_water    DROP COLUMN IF EXISTS deleted_at;
--                        then re-apply migrate_016 (pull) + migrate_023 (push).
--                        Only roll back paired with a client revert of the
--                        foodDomain.js deleted-slice change, or live deletes
--                        would error against a missing column.
--   - App-code deps:     src/lib/sync/tables/foodDomain.js builds a `deleted`
--                        slice for both tables and applies remote tombstones on
--                        pull; registry.js sets softDelete:true for both.
--
-- Apply via deploy-migrations.yml on merge, or Dashboard -> SQL Editor.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Tombstone columns (NULL = live; non-NULL = deleted). Nullable +
--    additive: the frozen old AAB never writes them and keeps working.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE food_favourites
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE daily_water
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial indexes over the live rows so the common (non-deleted) read stays
-- fast once cloud-side reads land.
CREATE INDEX IF NOT EXISTS idx_food_favourites_live
  ON food_favourites(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_water_live
  ON daily_water(user_id)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 2. food_sync_pull: reproduced from migrate_016 (its last redefinition).
--    ONLY the food_favourites and daily_water branches change:
--      - `updated` now excludes tombstoned rows (deleted_at IS NULL)
--      - `deleted` now returns rows tombstoned since the cursor
--    Every other branch is byte-for-byte identical to migrate_016.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION food_sync_pull(last_pulled_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_result jsonb;
  v_safe_last timestamptz := COALESCE(last_pulled_at, 'epoch'::timestamptz);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'food_sync_pull: not authenticated';
  END IF;

  v_result := jsonb_build_object(
    'timestamp', v_now,
    'changes', jsonb_build_object(

      'custom_foods', jsonb_build_object(
        'created', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM custom_foods t
          WHERE t.user_id = v_uid AND t.created_at > v_safe_last AND t.created_at = t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM custom_foods t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last AND t.created_at <> t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM custom_foods t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      ),

      'food_entries', jsonb_build_object(
        'created', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_entries t
          WHERE t.user_id = v_uid AND t.created_at > v_safe_last AND t.created_at = t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_entries t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last AND t.created_at <> t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_entries t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      ),

      'daily_intake_rollups', jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM daily_intake_rollups t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last
        ), '[]'::jsonb),
        'deleted', '[]'::jsonb
      ),

      'saved_meals', jsonb_build_object(
        'created', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM saved_meals t
          WHERE t.user_id = v_uid AND t.created_at > v_safe_last AND t.created_at = t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM saved_meals t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last AND t.created_at <> t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM saved_meals t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      ),

      'recipes', jsonb_build_object(
        'created', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM recipes t
          WHERE t.user_id = v_uid AND t.created_at > v_safe_last AND t.created_at = t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM recipes t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last AND t.created_at <> t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM recipes t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      ),

      -- food_favourites: CHANGED for #8. `updated` now skips tombstones;
      -- `deleted` now carries rows tombstoned since the cursor so the delete
      -- reaches other devices. (Tombstone time tracked via deleted_at.)
      'food_favourites', jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_favourites t
          WHERE t.user_id = v_uid AND t.last_used_at > v_safe_last AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_favourites t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      ),

      -- daily_water: CHANGED for #8, same shape as food_favourites above.
      'daily_water', jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM daily_water t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM daily_water t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      )

    )
  );

  RETURN v_result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. food_sync_push: reproduced from migrate_023 (its last redefinition).
--    ONLY the food_favourites and daily_water branches change — each gains a
--    `deleted` loop that tombstones the row (last-write-wins on the same clock
--    the `updated` upsert uses). Every other branch is byte-for-byte identical
--    to migrate_023.
--
--    DROP every overload first (migrate_023 pattern): CREATE OR REPLACE cannot
--    change a signature, so an older variant could survive. The body here keeps
--    the same (jsonb) signature, so this is belt-and-braces.
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

  -- custom_foods (composite PK + barcode_ean as of migration 023)
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

  -- daily_intake_rollups (unchanged from migration 021)
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

  -- food_favourites: CHANGED for #8. `updated` upsert unchanged from
  -- migrate_023; a `deleted` loop is ADDED that tombstones the row (sets
  -- deleted_at + bumps last_used_at so the delete out-clocks an older edit and
  -- propagates on the next pull).
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

  -- daily_water: CHANGED for #8, same pattern as food_favourites.
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
$$;

GRANT EXECUTE ON FUNCTION food_sync_pull(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION food_sync_push(jsonb) TO authenticated;
