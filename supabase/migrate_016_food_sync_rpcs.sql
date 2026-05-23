-- Migration 016: food sync RPC functions
--
-- The hand-rolled sync engine (docs/SYNC_ARCHITECTURE_LOCKED.md) calls
-- two RPCs per cycle: food_sync_pull to fetch changes since the client's
-- last_pulled_at, and food_sync_push to apply queued local writes.
--
-- Both RPCs are scoped to auth.uid() and reject any payload that
-- references another user's data.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

-- ─────────────────────────────────────────────────────────────────────
-- food_sync_pull: returns changes since last_pulled_at.
-- Shape: { timestamp, changes: { <table>: { created: [], updated: [], deleted: [] } } }
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

      'food_favourites', jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_favourites t
          WHERE t.user_id = v_uid AND t.last_used_at > v_safe_last
        ), '[]'::jsonb),
        'deleted', '[]'::jsonb
      ),

      'daily_water', jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM daily_water t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last
        ), '[]'::jsonb),
        'deleted', '[]'::jsonb
      )

    )
  );

  RETURN v_result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- food_sync_push: applies inserts, updates, and soft-deletes from the
-- client. Last-write-wins per record using updated_at. Rejects payload
-- that references other users' data.
-- ─────────────────────────────────────────────────────────────────────
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

  -- custom_foods
  IF changes ? 'custom_foods' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO custom_foods (
        id, user_id, name, brand, serving_g, serving_label,
        kcal_100g, protein_100g, carbs_100g, fat_100g,
        fibre_100g, sodium_100g, sugar_100g, photo_url, notes,
        created_at, updated_at
      )
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name', v_row->>'brand',
        (v_row->>'serving_g')::numeric, v_row->>'serving_label',
        (v_row->>'kcal_100g')::numeric, (v_row->>'protein_100g')::numeric,
        (v_row->>'carbs_100g')::numeric, (v_row->>'fat_100g')::numeric,
        (v_row->>'fibre_100g')::numeric, (v_row->>'sodium_100g')::numeric,
        (v_row->>'sugar_100g')::numeric, v_row->>'photo_url', v_row->>'notes',
        COALESCE((v_row->>'created_at')::timestamptz, v_now), v_now
      )
      ON CONFLICT (id) DO UPDATE
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
            photo_url = EXCLUDED.photo_url,
            notes = EXCLUDED.notes,
            updated_at = v_now
        WHERE custom_foods.user_id = v_uid
          AND custom_foods.updated_at < EXCLUDED.updated_at;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'updated', '[]'::jsonb))
    LOOP
      UPDATE custom_foods SET
        name = v_row->>'name',
        brand = v_row->>'brand',
        serving_g = (v_row->>'serving_g')::numeric,
        serving_label = v_row->>'serving_label',
        kcal_100g = (v_row->>'kcal_100g')::numeric,
        protein_100g = (v_row->>'protein_100g')::numeric,
        carbs_100g = (v_row->>'carbs_100g')::numeric,
        fat_100g = (v_row->>'fat_100g')::numeric,
        fibre_100g = (v_row->>'fibre_100g')::numeric,
        sodium_100g = (v_row->>'sodium_100g')::numeric,
        sugar_100g = (v_row->>'sugar_100g')::numeric,
        photo_url = v_row->>'photo_url',
        notes = v_row->>'notes',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid
        AND user_id = v_uid
        AND updated_at < (v_row->>'updated_at')::timestamptz;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE custom_foods
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- food_entries
  IF changes ? 'food_entries' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO food_entries (
        id, user_id, entry_date, meal_slot, food_ref, quantity_g,
        kcal, protein_g, carbs_g, fat_g, fibre_g, logged_at,
        created_at, updated_at
      )
      VALUES (
        (v_row->>'id')::uuid, v_uid, (v_row->>'entry_date')::date,
        v_row->>'meal_slot', v_row->>'food_ref',
        (v_row->>'quantity_g')::numeric,
        (v_row->>'kcal')::numeric, (v_row->>'protein_g')::numeric,
        (v_row->>'carbs_g')::numeric, (v_row->>'fat_g')::numeric,
        (v_row->>'fibre_g')::numeric,
        COALESCE((v_row->>'logged_at')::timestamptz, v_now),
        COALESCE((v_row->>'created_at')::timestamptz, v_now), v_now
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'updated', '[]'::jsonb))
    LOOP
      UPDATE food_entries SET
        entry_date = (v_row->>'entry_date')::date,
        meal_slot = v_row->>'meal_slot',
        food_ref = v_row->>'food_ref',
        quantity_g = (v_row->>'quantity_g')::numeric,
        kcal = (v_row->>'kcal')::numeric,
        protein_g = (v_row->>'protein_g')::numeric,
        carbs_g = (v_row->>'carbs_g')::numeric,
        fat_g = (v_row->>'fat_g')::numeric,
        fibre_g = (v_row->>'fibre_g')::numeric,
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid
        AND user_id = v_uid
        AND updated_at < (v_row->>'updated_at')::timestamptz;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE food_entries
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- food_favourites (composite PK)
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
        (v_row->>'ml')::int, v_now
      )
      ON CONFLICT (user_id, entry_date) DO UPDATE
        SET ml = EXCLUDED.ml,
            updated_at = v_now
        WHERE daily_water.updated_at < EXCLUDED.updated_at;
    END LOOP;
  END IF;

  -- saved_meals
  IF changes ? 'saved_meals' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO saved_meals (id, user_id, name, items_json, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        COALESCE(v_row->'items_json', '[]'::jsonb),
        COALESCE((v_row->>'created_at')::timestamptz, v_now), v_now
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'updated', '[]'::jsonb))
    LOOP
      UPDATE saved_meals SET
        name = v_row->>'name',
        items_json = COALESCE(v_row->'items_json', items_json),
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid
        AND user_id = v_uid
        AND updated_at < (v_row->>'updated_at')::timestamptz;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE saved_meals
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- recipes (recipe_ingredients sync separately via a follow-up call to keep this RPC bounded)
  IF changes ? 'recipes' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO recipes (id, user_id, name, total_servings, notes, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        (v_row->>'total_servings')::numeric, v_row->>'notes',
        COALESCE((v_row->>'created_at')::timestamptz, v_now), v_now
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'updated', '[]'::jsonb))
    LOOP
      UPDATE recipes SET
        name = v_row->>'name',
        total_servings = (v_row->>'total_servings')::numeric,
        notes = v_row->>'notes',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid
        AND user_id = v_uid
        AND updated_at < (v_row->>'updated_at')::timestamptz;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE recipes
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  v_result := jsonb_build_object('timestamp', v_now);
  RETURN v_result;
END;
$$;

-- Grant execute to authenticated role.
GRANT EXECUTE ON FUNCTION food_sync_pull(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION food_sync_push(jsonb) TO authenticated;
