-- migrate_197_food_late_delete_delivery.sql
--
-- Purpose:          Review finding D1 (lead-verified, food audit follow-up,
--                   2026-10-16). food_sync_pull's `deleted` slices
--                   (migrate_090) select `t.deleted_at > v_safe_last`, where
--                   v_safe_last is the caller's cursor on the SERVER's clock,
--                   while food_sync_push (migrate_196) stores deleted_at and
--                   updated_at from the PHONE's record. A delete made offline
--                   at phone time t and pushed after another phone pulled at
--                   server time S > t is therefore never delivered to that
--                   phone (only a full pull at sign-in finds it). The same
--                   holds for custom_foods, food_entries, saved_meals,
--                   recipes, food_favourites and daily_water.
--                   LEAD RULING, built here:
--                   (a) food_sync_push is re-issued from 196's body VERBATIM
--                       except that every `deleted` loop (custom_foods,
--                       food_entries, food_favourites, daily_water,
--                       saved_meals, recipes) stamps updated_at with the
--                       SERVER's time instead of the record's:
--                         updated_at = CASE WHEN <t>.deleted_at IS NULL
--                                           THEN v_now ELSE <t>.updated_at END
--                       deleted_at stays COALESCE(record deleted_at, v_now),
--                       so 196's revive (food_entries `created`: the stored
--                       tombstone's deleted_at <= the record's created_at,
--                       both from the same phone's clock) works unchanged.
--                       The CASE stamps the server's time when the row FIRST
--                       becomes a tombstone and leaves an existing
--                       tombstone's stamp alone. Without it every re-push of
--                       the same delete would restamp it: the client re-pushes
--                       the newest pushed row every cycle (its watermark is
--                       the newest updated_at less 1 ms, foodDomain.js D-M1),
--                       and a pulled tombstone takes the server's stamp
--                       locally, so a plain `v_now` would send the same
--                       tombstone to every device on every cycle, for ever.
--                       A revived row (196's food_entries `created`; the
--                       food_favourites and daily_water `updated` upserts set
--                       deleted_at = NULL) is live again, so its next delete
--                       is stamped afresh.
--                   (b) food_favourites has no server-stamped column
--                       (user_id, food_ref, last_used_at from migrate_015;
--                       kind, 048; deleted_at, 090), and last_used_at must
--                       NOT be overwritten with server time: it is the
--                       last-write-wins clock of the push upsert and of every
--                       client's applier. So ONE column is added:
--                       food_favourites.updated_at timestamptz DEFAULT now()
--                       (ADD COLUMN IF NOT EXISTS; additive, nullable). The
--                       default is needed: without it every tombstone written
--                       before 197 would read NULL and drop out of the
--                       `deleted` slice even on a full pull (a sign-in),
--                       which returns it today. With it, existing rows read
--                       the apply time (PostgreSQL stores the value once; no
--                       table rewrite), so each existing favourite tombstone
--                       is delivered once more to every device, harmless
--                       under the appliers' last_used_at gate. New rows take
--                       the insert time. Nothing but the `deleted` loop and
--                       the pull's `deleted` slice reads it.
--                   (c) food_sync_pull is re-issued from migrate_090 (its
--                       last definition; 091 to 196 never re-issue it) BYTE
--                       FOR BYTE except its six `deleted` slices, which now
--                       select
--                         t.deleted_at IS NOT NULL AND t.updated_at > v_safe_last
--                       (the server-stamped column), so a tombstone written
--                       after the caller's last pull is returned whatever the
--                       phone's clock said. Every `created` and `updated`
--                       slice, the daily_intake_rollups slice, the response
--                       shape and the signature are unchanged.
-- Applied locally:  NOT APPLICABLE (the change is the cloud's two food RPCs;
--                   the local tables are untouched).
-- Applied remotely: NO. NOT APPLIED. HELD for the founder's exact phrase
--                   "run against production" naming 197. The app never
--                   applies it.
-- Safe to re-run:   YES. The guard only reads the catalogue; ADD COLUMN IF
--                   NOT EXISTS is a no-op the second time; the DROP FUNCTION
--                   loop then CREATE OR REPLACE FUNCTION leave the same single
--                   food_sync_push; CREATE OR REPLACE FUNCTION food_sync_pull
--                   keeps its signature and return type. Its writes repeat
--                   cleanly: a second `deleted` record for a tombstone keeps
--                   the tombstone's first server stamp.
-- Rollback:         Re-apply migrate_196_food_soft_deletes_and_kind.sql's
--                   food_sync_push definition verbatim (its DROP FUNCTION
--                   loop, CREATE OR REPLACE FUNCTION and GRANT; its guard and
--                   ADD COLUMN IF NOT EXISTS are no-ops on a database that
--                   has 196), then migrate_090_food_delete_tombstones.sql's
--                   food_sync_pull definition and its GRANT (section 2 of that
--                   file, NOT the whole file: 090's push is far older), then
--                   ALTER TABLE public.food_favourites DROP COLUMN IF EXISTS
--                   updated_at; (neither restored function names it).
--                   Tombstones written under 197 stay valid under the old
--                   pull: their deleted_at is still the record's.
-- Depends on:       migrate_196_food_soft_deletes_and_kind.sql (APPLIED
--                   2026-10-16), which must be applied FIRST: the guard below
--                   refuses unless recipes.cooked_weight_g exists and the live
--                   food_sync_push carries 196's revive. 196 must not be
--                   re-applied after 197 (that would undo the push half); if
--                   it is, re-apply 197. migrate_090 must never be re-applied
--                   (its push predates 114 to 196).
--                   Pinned by src/lib/__tests__/migrate197.guard.test.js:
--                   every branch and loop of the push other than the six
--                   `deleted` loops is 196's byte for byte, each `deleted`
--                   loop is 196's with only its updated_at line changed, and
--                   the pull is 090's with only the six `deleted` filters
--                   changed.
--
-- WHY THIS IS SAFE FOR THE BUILDS IN THE STORES (2.17.0, 2.18.0, 2.19.0),
-- read from their source at the Version 2.17.0, 2.18.0 and 2.19.0 commits
-- (src/lib/sync/tables/foodDomain.js and src/lib/food/db.js):
--   * Push. The `deleted` loops now read only the row's key, deleted_at and
--     (favourites) last_used_at, all of which every build sends; the record's
--     updated_at, which they also send, is no longer read. No key is newly
--     required, so no push can fail on 197.
--   * Pull shape. Same keys, same slices; food_favourites rows gain an
--     `updated_at` key, and every build's applyFavouriteFromCloud reads only
--     food_ref, last_used_at, kind and deleted_at, so the key is ignored.
--   * Tombstones on server time. applyFoodEntryFromCloud,
--     applyCustomFoodFromCloud, applySavedMealFromCloud and
--     applyRecipeFromCloud skip a cloud row only when the local updated_at is
--     newer or equal (`localMs >= updatedAt`), and applyWaterFromCloud
--     applies when the cloud updated_at is newer or equal: a tombstone
--     stamped at the server's time of its push is newer than the row the
--     other phone holds, so it is applied, as the lead expected (a tombstone
--     wins). applyFavouriteFromCloud gates on last_used_at, which 197 leaves
--     as the record's, so favourites behave exactly as under 196. The
--     deleting phone gets its own tombstone back once (it is now newer than
--     its local copy), stores the same deleted state, and re-pushes the row
--     once as `deleted`, which the CASE leaves untouched, so it does not come
--     back again.
--   * Only the `deleted` filter moved; a phone whose clock runs AHEAD of the
--     server no longer re-receives its own tombstones on every pull until the
--     server catches up (the old filter compared its future deleted_at).
--
-- KNOWN LIMITS (recorded, not changed here):
--   * D5, a known regression of 196 on 2.17.0 and 2.18.0: an Undo after a
--     delete that has already synced goes up as `updated` (those builds never
--     restamp created_at on a restore), which 196 skips for a tombstone, so
--     the other phones keep the delete and drop the restored entry. There is
--     no server fix without reviving a tombstone on any `updated`, which
--     would let a stale edit from another phone resurrect a delete. 2.19.0
--     fixes it client-side (restoreFoodEntry and restoreFoodEntries stamp
--     created_at at the Undo, so it goes up as `created` and 196's revive
--     brings it back). 197 does not change this.
--   * Clock skew on the restoring phone. A tombstone now carries the server's
--     time of its push, so a phone whose clock runs BEHIND the server by more
--     than the gap between the delete reaching the cloud and an Undo can,
--     if it pulls before pushing that Undo, have the Undo overwritten by its
--     own tombstone (the F1 gate sees the cloud row as newer). This is the
--     exposure every `updated` row already has (its updated_at has been the
--     server's since migrate_016); under 196 tombstones alone were exempt.
--   * Tombstones written before 197 keep the phone-time updated_at 196 gave
--     them; one already missed by a phone stays missed until a full pull,
--     as today. (food_favourites tombstones are the exception: the column
--     default delivers each once more, see (b).)
--   * Not in scope: food_favourites' `updated` slice still selects
--     `last_used_at > v_safe_last`, a phone-time column, so a favourite made
--     offline and pushed late can miss a phone in the same way.

-- Guard: stop before anything changes unless 196 is applied (its
-- recipes.cooked_weight_g and its food_entries revive in the live
-- food_sync_push), and unless every table this file names has the columns it
-- reads.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recipes'
      AND column_name = 'cooked_weight_g'
  ) THEN
    RAISE EXCEPTION 'migrate_197: public.recipes.cooked_weight_g does not exist. Apply migrate_196_food_soft_deletes_and_kind.sql first, then re-run 197.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'food_sync_push'
      AND pronamespace = 'public'::regnamespace
      AND prosrc LIKE '%food_entries.deleted_at <= (v_row->>''created_at'')::timestamptz%'
  ) THEN
    RAISE EXCEPTION 'migrate_197: the live public.food_sync_push is not migrate_196''s (no food_entries revive). Apply migrate_196_food_soft_deletes_and_kind.sql first, then re-run 197.';
  END IF;
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('custom_foods', 'food_entries', 'saved_meals', 'recipes', 'food_favourites', 'daily_water')
      AND column_name = 'deleted_at'
  ) <> 6 OR (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('custom_foods', 'food_entries', 'saved_meals', 'recipes', 'daily_water')
      AND column_name = 'updated_at'
  ) <> 5 THEN
    RAISE EXCEPTION 'migrate_197: deleted_at or updated_at is missing from a food table. Nothing was changed.';
  END IF;
END $$;

-- (b) food_favourites' server-stamped change time for its tombstones.
-- Additive, nullable; the default gives existing rows the apply time (see
-- the header).
ALTER TABLE public.food_favourites
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- (a) food_sync_push: migrate_196's body; only the six `deleted` loops'
-- updated_at changes.
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
            -- 197: the change time is the SERVER's, stamped when the row first
            -- becomes a tombstone, so food_sync_pull's `deleted` slice delivers
            -- a delete pushed late to a device that pulled meanwhile (D1).
            updated_at = CASE WHEN custom_foods.deleted_at IS NULL THEN v_now ELSE custom_foods.updated_at END
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
            -- 197: the change time is the SERVER's, stamped when the row first
            -- becomes a tombstone, so food_sync_pull's `deleted` slice delivers
            -- a delete pushed late to a device that pulled meanwhile (D1).
            updated_at = CASE WHEN food_entries.deleted_at IS NULL THEN v_now ELSE food_entries.updated_at END
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
            last_used_at = COALESCE((v_row->>'last_used_at')::timestamptz, v_now),
            -- 197: the change time is the SERVER's, stamped when the row first
            -- becomes a tombstone, so food_sync_pull's `deleted` slice delivers
            -- a delete pushed late to a device that pulled meanwhile (D1).
            updated_at = CASE WHEN food_favourites.deleted_at IS NULL THEN v_now ELSE food_favourites.updated_at END
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
            -- 197: the change time is the SERVER's, stamped when the row first
            -- becomes a tombstone, so food_sync_pull's `deleted` slice delivers
            -- a delete pushed late to a device that pulled meanwhile (D1).
            updated_at = CASE WHEN daily_water.deleted_at IS NULL THEN v_now ELSE daily_water.updated_at END
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
            -- 197: the change time is the SERVER's, stamped when the row first
            -- becomes a tombstone, so food_sync_pull's `deleted` slice delivers
            -- a delete pushed late to a device that pulled meanwhile (D1).
            updated_at = CASE WHEN saved_meals.deleted_at IS NULL THEN v_now ELSE saved_meals.updated_at END
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
            -- 197: the change time is the SERVER's, stamped when the row first
            -- becomes a tombstone, so food_sync_pull's `deleted` slice delivers
            -- a delete pushed late to a device that pulled meanwhile (D1).
            updated_at = CASE WHEN recipes.deleted_at IS NULL THEN v_now ELSE recipes.updated_at END
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

-- (c) food_sync_pull: migrate_090's definition (section 2 of that file);
-- only the six `deleted` filters change, from `t.deleted_at > v_safe_last` to
-- the server-stamped `t.deleted_at IS NOT NULL AND t.updated_at > v_safe_last`.
-- (090's food_favourites comment below, "Tombstone time tracked via
-- deleted_at", is kept verbatim with the body; from 197 the tombstone's
-- delivery time is updated_at.)
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
          WHERE t.user_id = v_uid AND t.deleted_at IS NOT NULL AND t.updated_at > v_safe_last
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
          WHERE t.user_id = v_uid AND t.deleted_at IS NOT NULL AND t.updated_at > v_safe_last
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
          WHERE t.user_id = v_uid AND t.deleted_at IS NOT NULL AND t.updated_at > v_safe_last
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
          WHERE t.user_id = v_uid AND t.deleted_at IS NOT NULL AND t.updated_at > v_safe_last
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
          WHERE t.user_id = v_uid AND t.deleted_at IS NOT NULL AND t.updated_at > v_safe_last
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
          WHERE t.user_id = v_uid AND t.deleted_at IS NOT NULL AND t.updated_at > v_safe_last
        ), '[]'::jsonb)
      )

    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION food_sync_pull(timestamptz) TO authenticated;

-- Verification (read-only, after the apply):
--   SELECT count(*) = 6 FROM regexp_matches(prosrc,
--            'updated_at = CASE WHEN [a-z_]+\.deleted_at IS NULL THEN v_now ELSE [a-z_]+\.updated_at END', 'g')
--   FROM pg_proc WHERE proname = 'food_sync_push' AND pronamespace = 'public'::regnamespace;
--   -- expect true (every `deleted` loop stamps server time)
--   SELECT prosrc LIKE '%food_entries.deleted_at <= (v_row->>''created_at'')::timestamptz%'
--   FROM pg_proc WHERE proname = 'food_sync_push' AND pronamespace = 'public'::regnamespace;
--   -- expect true (196's revive kept)
--   SELECT (SELECT count(*) FROM regexp_matches(prosrc,
--            't\.deleted_at IS NOT NULL AND t\.updated_at > v_safe_last', 'g')) = 6
--      AND prosrc NOT LIKE '%t.deleted_at > v_safe_last%'
--   FROM pg_proc WHERE proname = 'food_sync_pull' AND pronamespace = 'public'::regnamespace;
--   -- expect true (every `deleted` slice on the server-stamped column)
--   SELECT count(*) FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'food_favourites' AND column_name = 'updated_at';
--   -- expect 1
--   SELECT count(*) FROM pg_proc WHERE proname IN ('food_sync_push', 'food_sync_pull') AND pronamespace = 'public'::regnamespace;
--   -- expect 2
