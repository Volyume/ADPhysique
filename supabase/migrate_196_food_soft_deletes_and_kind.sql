-- migrate_196_food_soft_deletes_and_kind.sql
--
-- Purpose:          Food data-layer audit (2026-10-16). Four defects in the
--                   cloud's reading of what the app already sends, all in
--                   food_sync_push:
--                   (a) food_entries, saved_meals and recipes `deleted` were
--                       HARD deletes, so food_sync_pull's `deleted` slice
--                       (deleted_at newer than the caller's cursor,
--                       migrate_090) never carried them and another device
--                       kept the deleted entry and its calories for ever.
--                       They become SOFT deletes, 195's custom_foods
--                       convention: deleted_at and updated_at from the
--                       record, else now(), on the caller's own row.
--                   (b) their `updated` branches gain `AND deleted_at IS
--                       NULL`: an edit never touches or revives a tombstone.
--                   (c) LEAD RULING on restore: the food_entries `created`
--                       branch becomes ON CONFLICT (user_id, id) DO UPDATE,
--                       setting every column as the insert sets it plus
--                       deleted_at = NULL and updated_at = now(), ONLY WHERE
--                       the stored row is a tombstone made at or before the
--                       record's created_at. The app now stamps created_at
--                       at the moment of an Undo (restoreFoodEntry and
--                       restoreFoodEntries in src/lib/food/db.js), so a
--                       restore of an entry already deleted in the cloud
--                       comes back; a stale re-send of an old `created`
--                       record (created_at older than the delete) changes
--                       nothing; a live row is never touched by `created`.
--                       saved_meals and recipes have no restore in the app,
--                       so their `created` stays ON CONFLICT DO NOTHING.
--                   (d) food_favourites `kind` is written, in the insert and
--                       in the DO UPDATE under the existing last-write-wins
--                       condition; 'fav' when the record has no `kind` (a
--                       build before migrate_048) or anything but 'dislike'.
--                       Before 196 it was never read, so every row took the
--                       default 'fav' and a "Not suggested" food came back as
--                       a favourite on the device's own next pull.
--                   (e) Founder ruling "Add cooked weight": an additive,
--                       nullable `recipes.cooked_weight_g numeric` (ADD COLUMN
--                       IF NOT EXISTS), the weight of the whole cooked recipe
--                       in grams. The recipes `created` insert takes it when
--                       the record carries the key; the `updated` UPDATE
--                       writes it only when the record carries the key, else
--                       keeps the stored value (the 194/195 note and portions
--                       pattern), so a build that never sends it never blanks
--                       it. The app sends it only behind
--                       RECIPE_COOKED_WEIGHT_PUSH (src/lib/sync/
--                       featureFlags.js, false until this file is applied).
--                   deleted_at exists on all three tables in the cloud: it
--                   is in each CREATE TABLE of migrate_015, and
--                   food_sync_pull (migrate_090), which production runs on
--                   every food sync, selects t.deleted_at from each of them.
--                   No deleted_at column is added; the guard below proves it
--                   before anything changes.
-- Applied locally:  NOT APPLICABLE (the change is the cloud's reading of
--                   the push; the local tables already soft-delete).
-- Applied remotely: YES, 2026-10-16 23:04:58 UTC, under the founder's
--                   "run against production 196" (checksum-verified apply,
--                   then the read-only verification below, all true). The
--                   app never applies it.
-- Safe to re-run:   YES. The guard only reads the catalogue; the DROP
--                   FUNCTION loop then CREATE OR REPLACE FUNCTION leave the
--                   same single function each time. Its writes repeat
--                   cleanly: a second `deleted` record rewrites the same
--                   tombstone, a second `created` record for a revived row
--                   meets a live row and changes nothing, a second `updated`
--                   writes the same values.
-- Rollback:         ALTER TABLE public.recipes DROP COLUMN IF EXISTS
--                     cooked_weight_g; then
--                   re-apply migrate_195_custom_foods_portions.sql's
--                   food_sync_push definition verbatim (its DROP FUNCTION
--                   loop, CREATE OR REPLACE FUNCTION and GRANT; its guard and
--                   ADD COLUMN IF NOT EXISTS are no-ops on a database that
--                   has 195). That restores hard deletes, edits of
--                   tombstones, DO NOTHING on `created` and the unread
--                   `kind`. Rows written under 196 stay: a tombstone is an
--                   ordinary row with deleted_at set, which every reader
--                   already filters (the rollup trigger, migrate_015;
--                   refresh_food_frequents, migrate_051; the pull's slices,
--                   migrate_090), and a stored 'dislike' is a value the
--                   column has allowed since migrate_048.
-- Depends on:       migrate_195_custom_foods_portions.sql (APPLIED
--                   2026-10-16), which must be applied FIRST: the guard
--                   below refuses without its custom_foods.portions_json.
--                   THIS FILE RE-ISSUES food_sync_push: its body is
--                   migrate_195's body verbatim, changed ONLY in the
--                   food_entries `created`, `updated` and `deleted` loops,
--                   the saved_meals and recipes `updated` and `deleted`
--                   loops, the recipes `created` loop (cooked_weight_g),
--                   and the food_favourites `updated` loop.
--                   Every other branch (custom_foods, daily_intake_rollups,
--                   the food_favourites `deleted` loop, daily_water,
--                   recipe_ingredients) and the saved_meals `created` loop
--                   are byte for byte 195's
--                   (pinned by src/lib/__tests__/migrate196.guard.test.js).
--                   195 must not be re-applied after 196 (that would undo
--                   all of 196); if it is, re-apply 196.
--                   food_sync_pull is NOT re-issued: migrate_090's
--                   food_entries, saved_meals and recipes `deleted` slices
--                   already select `t.deleted_at > v_safe_last`, and its
--                   `updated` slices `t.deleted_at IS NULL`, so a revived
--                   row is returned in `created` or `updated` again.
--
-- WHY EACH CHANGE IS SAFE FOR THE BUILDS IN THE STORES (2.17.0 and 2.18.0),
-- which push keys exactly as today (read from their source at the Version
-- 2.17.0 and 2.18.0 commits, src/lib/sync/tables/foodDomain.js): every food
-- record carries id, created_at, updated_at and deleted_at (ISO 8601 or
-- null); a favourite carries food_ref, last_used_at, kind and deleted_at.
-- They bucket a row `deleted` when deleted_at is set, `created` when
-- created_at equals updated_at, else `updated`.
--   * Soft deletes. The `deleted` loops read only id, deleted_at and
--     updated_at, which those builds send; null falls to now() through
--     COALESCE, exactly as the custom_foods `deleted` loop (195) already
--     does for the same builds. A row not in the cloud matches nothing. Their
--     pull already applies a tombstone from the `deleted` slice
--     (applyFoodEntryFromCloud, applySavedMealFromCloud and
--     applyRecipeFromCloud store deleted_at under the last-write-wins gate,
--     and the food_entries pull rebuilds each touched day's rollup), so
--     those devices now LEARN of deletes made elsewhere instead of keeping
--     the food.
--   * `updated` with `AND deleted_at IS NULL`. It only ever skips an update,
--     never raises: an edit to a row deleted in the cloud is accepted and
--     changes nothing. Under 195 that row did not exist (hard delete), so the
--     same UPDATE also matched nothing; the outcome for those builds is the
--     same.
--   * food_entries `created` DO UPDATE. Those builds never restamp
--     created_at on an Undo (their restore goes up as `updated`), so their
--     restore of a row deleted in the cloud stays lost, exactly as under 195
--     (where the row was gone); no regression. Their `created` records carry
--     the row's original created_at, which is before any delete of it, so
--     they never revive a tombstone, and against a live row the DO UPDATE's
--     WHERE is false (nothing changes, as DO NOTHING). The casts are the
--     insert's own, which their records already pass.
--   * food_favourites `kind`. Those builds already send `kind` ('fav' or
--     'dislike'); it is now stored instead of ignored, so their "Not
--     suggested" survives the round trip. The CASE never yields a value the
--     CHECK refuses, so no push can fail on it.
--   * A key the old function ignored and 196 reads: cooked_weight_g, which
--     those builds never send; absent, the insert stores NULL and the update
--     keeps the stored value. 196 needs no key those builds do not send
--     (created_at was always sent).
--
-- KNOWN LIMITS (recorded, not changed here; the lead's ruling sets the
-- convention): deleted_at is the deleting device's clock, as for
-- custom_foods, food_favourites and daily_water since 090/195, so a device
-- whose clock runs behind the server can write a tombstone older than another
-- device's pull cursor, which that device then never pulls; a full pull
-- (sign-in) recovers it. The revive compares two stamps from the same
-- device's clock (the delete and the Undo), so it is not exposed to skew
-- between devices.

-- Guard: stop before anything changes when 195 is not applied, or when any
-- of the three tables lacks deleted_at (196's loops name it).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'custom_foods'
      AND column_name = 'portions_json'
  ) THEN
    RAISE EXCEPTION 'migrate_196: public.custom_foods.portions_json does not exist. Apply migrate_195_custom_foods_portions.sql first, then re-run 196.';
  END IF;
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('food_entries', 'saved_meals', 'recipes')
      AND column_name = 'deleted_at'
  ) <> 3 THEN
    RAISE EXCEPTION 'migrate_196: deleted_at is missing from public.food_entries, saved_meals or recipes. Nothing was changed.';
  END IF;
END $$;

-- (e) Founder ruling "Add cooked weight": additive, nullable, no default.
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS cooked_weight_g numeric;

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
    -- 195: `created` AND `updated` go through this one upsert. Before 195 only
    -- `created` was read, so an edited food (and a food edited before its
    -- first push, which the client sends as `updated`) never reached the
    -- cloud. The client maps both buckets with the same mapper, so an
    -- `updated` record carries exactly the keys a `created` one does.
    FOR v_row IN SELECT jsonb_array_elements(
      COALESCE(changes->'custom_foods'->'created', '[]'::jsonb)
      || COALESCE(changes->'custom_foods'->'updated', '[]'::jsonb))
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
            updated_at = v_now
        -- 195: a food tombstoned in the cloud stays exactly as it is. A
        -- `created` or `updated` record for it (a stale device, a re-push)
        -- changes nothing: deleted_at is never cleared here, and the row's
        -- figures and updated_at are not touched either.
        WHERE custom_foods.deleted_at IS NULL;
    END LOOP;

    -- 195: `deleted` is a soft delete, the tombstone convention this
    -- function's food_favourites and daily_water branches use (migrate_090):
    -- deleted_at from the record, else now, and the change time likewise.
    -- custom_foods has carried deleted_at since migrate_015, and
    -- food_sync_pull (migrate_090) already returns a custom food whose
    -- deleted_at is newer than the caller's cursor in its `deleted` slice.
    -- A food not yet in the cloud matches nothing and is left alone.
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE custom_foods
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = COALESCE((v_row->>'updated_at')::timestamptz, v_now)
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
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
      -- 196 (lead ruling on restore): a `created` record revives a TOMBSTONE
      -- made at or before the record's own created_at, and nothing else. The
      -- client stamps created_at at the moment of an Undo (restoreFoodEntry,
      -- restoreFoodEntries), so a restore of an entry deleted in the cloud
      -- brings it back with the values it carries. A stale re-send of an old
      -- `created` record (its created_at older than the delete) changes
      -- nothing, and a live row is never touched by `created`. A record with
      -- no readable created_at compares as NULL and revives nothing.
      ON CONFLICT (user_id, id) DO UPDATE
        SET entry_date = EXCLUDED.entry_date,
            meal_slot = EXCLUDED.meal_slot,
            food_ref = EXCLUDED.food_ref,
            quantity_g = EXCLUDED.quantity_g,
            kcal = EXCLUDED.kcal,
            protein_g = EXCLUDED.protein_g,
            carbs_g = EXCLUDED.carbs_g,
            fat_g = EXCLUDED.fat_g,
            fibre_g = EXCLUDED.fibre_g,
            weight_state = EXCLUDED.weight_state,
            eaten_at = EXCLUDED.eaten_at,
            note = EXCLUDED.note,
            created_at = EXCLUDED.created_at,
            deleted_at = NULL,
            updated_at = v_now
        WHERE food_entries.deleted_at IS NOT NULL
          AND food_entries.deleted_at <= (v_row->>'created_at')::timestamptz;
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
      -- 196: an edit never touches (or revives) a tombstone.
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid AND deleted_at IS NULL;
    END LOOP;

    -- 196: `deleted` is a SOFT delete (195's custom_foods convention, from
    -- migrate_090): deleted_at and updated_at from the record, else now. The
    -- tombstone stays, so food_sync_pull's `deleted` slice (deleted_at newer
    -- than the caller's cursor, migrate_090) tells every other device, and the
    -- rollup trigger (migrate_015) leaves the row out of the day's totals.
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE food_entries
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = COALESCE((v_row->>'updated_at')::timestamptz, v_now)
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
      -- 196: `kind` is written, in the insert and (under the same
      -- last-write-wins condition) in the update. Before 196 it was never
      -- read, so every row took the column default 'fav' and a "Not
      -- suggested" (dislike) came back as a favourite on the next pull. A
      -- record without the key (a build before migrate_048) or with any value
      -- other than 'dislike' stores 'fav', so no push can fail the CHECK
      -- (kind IN ('fav', 'dislike'), migrate_048).
      INSERT INTO food_favourites (user_id, food_ref, last_used_at, kind)
      VALUES (
        v_uid, v_row->>'food_ref',
        COALESCE((v_row->>'last_used_at')::timestamptz, v_now),
        CASE WHEN v_row->>'kind' = 'dislike' THEN 'dislike' ELSE 'fav' END
      )
      ON CONFLICT (user_id, food_ref) DO UPDATE
        SET last_used_at = EXCLUDED.last_used_at,
            kind = EXCLUDED.kind,
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
      -- 196: an edit never touches (or revives) a tombstone.
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid AND deleted_at IS NULL;
    END LOOP;

    -- 196: a soft delete, as food_entries above.
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE saved_meals
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = COALESCE((v_row->>'updated_at')::timestamptz, v_now)
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  IF changes ? 'recipes' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'created', '[]'::jsonb))
    LOOP
      -- 196 (e): cooked_weight_g when the record carries it, else NULL.
      INSERT INTO recipes (id, user_id, name, servings, notes, cooked_weight_g, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        NULLIF(v_row->>'servings','')::real,
        v_row->>'notes',
        CASE WHEN v_row ? 'cooked_weight_g' THEN NULLIF(v_row->>'cooked_weight_g','')::numeric ELSE NULL END,
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'updated', '[]'::jsonb))
    LOOP
      UPDATE recipes SET
        name = v_row->>'name',
        servings = NULLIF(v_row->>'servings','')::real,
        notes = v_row->>'notes',
        -- 196 (e): written only when the record carries the key.
        cooked_weight_g = CASE WHEN v_row ? 'cooked_weight_g'
                               THEN NULLIF(v_row->>'cooked_weight_g','')::numeric
                               ELSE recipes.cooked_weight_g END,
        updated_at = v_now
      -- 196: an edit never touches (or revives) a tombstone.
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid AND deleted_at IS NULL;
    END LOOP;

    -- 196: a soft delete, as food_entries above. The recipe's ingredients
    -- stay in the cloud under their tombstoned recipe (the client stops
    -- pushing them, src/lib/sync/tables/recipeIngredients.js).
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE recipes
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = COALESCE((v_row->>'updated_at')::timestamptz, v_now)
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

-- Verification (read-only, after the apply):
--   SELECT prosrc LIKE '%UPDATE food_entries%SET deleted_at = COALESCE%'
--      AND prosrc LIKE '%UPDATE saved_meals%SET deleted_at = COALESCE%'
--      AND prosrc LIKE '%UPDATE recipes%SET deleted_at = COALESCE%'
--      AND prosrc NOT LIKE '%DELETE FROM food_entries%'
--      AND prosrc NOT LIKE '%DELETE FROM saved_meals%'
--      AND prosrc NOT LIKE '%DELETE FROM recipes%'
--   FROM pg_proc WHERE proname = 'food_sync_push' AND pronamespace = 'public'::regnamespace;
--   -- expect true (soft deletes)
--   SELECT prosrc LIKE '%food_entries.deleted_at <= (v_row->>''created_at'')::timestamptz%'
--      AND prosrc LIKE '%INSERT INTO food_favourites (user_id, food_ref, last_used_at, kind)%'
--      AND prosrc LIKE '%WHERE custom_foods.deleted_at IS NULL%'
--   FROM pg_proc WHERE proname = 'food_sync_push' AND pronamespace = 'public'::regnamespace;
--   -- expect true (the revive, the kind, and 195's custom_foods branch kept)
--   SELECT count(*) FROM pg_proc WHERE proname = 'food_sync_push' AND pronamespace = 'public'::regnamespace;
--   -- expect 1
