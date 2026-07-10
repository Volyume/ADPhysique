-- migrate_115_food_entry_eaten_at.sql
-- Applied remotely: YES (2026-07-10, applied to EU-Dublin by Claude via the
--   Supabase connector, founder-authorised "run against production").
-- Ultimate-Audit item 15 (timeline food logging): editable "time eaten" on
-- food_entries.
--
-- Purpose:
--   Lead ruling D22 (founder-delegated, docs/ux-world-class-audit-2026-07-09/
--   DECISIONS-2026-07-09.md): "15b time truth: EDITABLE EATEN-TIME + UNTIMED
--   BULK. Entries gain an optional editable eaten-at time; bulk-confirmed
--   entries carry no precise time and display grouped under their meal tag
--   rather than a false timestamp." This adds ONE additive, nullable column
--   distinct from logged_at (which means "the moment the client wrote the
--   row", not "the moment the user ate" -- docs/ux-world-class-audit-
--   2026-07-09/item-15-timeline-scoping.md Section 3, Stage 0).
--
-- Write semantics (app-side, src/lib/food/db.js):
--   - logFoodEntry: an actual (non-planned) entry gets eaten_at = now at
--     insert; a planned (is_planned=1) meal-plan row gets eaten_at = NULL
--     until confirmed (it has not been eaten yet).
--   - updateFoodEntry: eaten_at is user-editable via the edit sheet
--     (FoodDetailSheet); omitted, it keeps its existing value.
--   - confirmPlannedEntry (new, per-entry "mark eaten"): stamps eaten_at =
--     now for the one row confirmed -- a genuine single action at a real
--     moment.
--   - confirmPlannedDay: a single-meal confirm (mealSlot given) stamps
--     eaten_at = now (same reasoning as confirmPlannedEntry); the whole-day
--     bulk confirm (mealSlot omitted, the "mark all meals as eaten"
--     control) leaves eaten_at NULL for every row it touches, because the
--     app has no honest idea when each individual meal was actually eaten --
--     stamping them all with one instant would be a false, invented
--     timestamp (item-15-timeline-scoping.md Section 5 point 3: "a user
--     could read that as 'I ate everything at once tonight'", the exact
--     honesty-test failure CLAUDE.md's ED-safety standard flags).
--
-- Data honesty:
--   NULLABLE, no DEFAULT: NULL is a real, permanent state ("no known eaten
--   time"), not "pending a value". Backfilled ONCE from logged_at for every
--   pre-existing row so an existing user's history keeps showing exactly
--   what it always has (logged_at was already shown as the quiet "when you
--   ate" time); the backfill cannot retroactively distinguish a historical
--   bulk confirm from an individual log (both wrote logged_at = now
--   identically before this build).
--
-- ED-safety note: this column is the item-15 honesty-test fix itself. No
--   calorie floor, macro total, adherence value, or MacroRings computation
--   reads it; the client-side timeline (src/lib/food/diaryTimeline.js) never
--   derives meal-timing judgement copy from it (no "should eat by", no gap
--   callouts, no fasting-window framing -- explicit non-goal per the
--   scoping doc Section 5).
--
-- Applied: LOCALLY via schema v67 (src/lib/database.js SCHEMA_MIGRATIONS),
--   remotely PENDING (founder-run, EU-Dublin; per CLAUDE.md the app never
--   runs cloud migrations and the deploy-migrations workflow is
--   manual-dispatch only). The client tolerates this column's absence in
--   the meantime: the push RPC below is additive to the food_entries branch
--   only, and every other branch is byte-for-byte identical to
--   migrate_114 (its last redefinition), so nothing else in
--   food_sync_push/pull changes behaviour.
-- Safe to re-run: YES (ADD COLUMN IF NOT EXISTS, the backfill UPDATE only
--   touches rows still NULL, and CREATE OR REPLACE FUNCTION are all
--   idempotent).
-- Rollback:
--   ALTER TABLE public.food_entries DROP COLUMN IF EXISTS eaten_at;
--   then re-apply migrate_114's food_sync_push definition verbatim (the
--   food_entries branch loses the eaten_at column/value again).
--   food_sync_pull is untouched by this migration (it already uses
--   to_jsonb(t), so it already returns eaten_at automatically once the
--   column exists -- a rollback here just removes the label from future
--   pulls; no other food data is affected.

-- ─────────────────────────────────────────────────────────────────────
-- 1. The column. Nullable, no default: NULL means "no known eaten time",
--    a real and permanent state (bulk-confirmed rows), not a placeholder.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS eaten_at timestamptz;

-- One-time backfill: every pre-existing row keeps showing what it always
-- has (logged_at was already displayed as "when you ate"). Only rows still
-- NULL are touched, so re-running this migration is a no-op the second time.
UPDATE public.food_entries
  SET eaten_at = logged_at
  WHERE eaten_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 2. food_sync_push: reproduced from migrate_114 (its last redefinition).
--    ONLY the food_entries branch changes -- INSERT/UPDATE now carry
--    eaten_at. Every other branch (custom_foods, daily_intake_rollups,
--    food_favourites, daily_water, saved_meals, recipes, recipe_ingredients)
--    is byte-for-byte identical to migrate_114.
--
--    food_sync_pull is UNCHANGED and not reproduced here: its food_entries
--    branch already uses `to_jsonb(t)` (SELECT * equivalent), so it starts
--    returning eaten_at automatically once the column exists, with no
--    function edit required.
--
--    DROP every overload first (migrate_023/090/114 pattern): CREATE OR
--    REPLACE cannot change a signature, so an older variant could survive.
--    The body here keeps the same (jsonb) signature, so this is
--    belt-and-braces.
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

  -- food_entries: CHANGED here. eaten_at added to created/updated so the
  -- "time eaten" (Ultimate-Audit item 15) round-trips through push.
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

  -- food_favourites (unchanged from migration 090)
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

  -- daily_water (unchanged from migration 090)
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

GRANT EXECUTE ON FUNCTION food_sync_push(jsonb) TO authenticated;
