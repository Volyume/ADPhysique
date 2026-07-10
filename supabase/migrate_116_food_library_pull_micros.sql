-- migrate_116_food_library_pull_micros.sql
-- Item 16 data spike (Ultimate-Audit item 16, MN-1), 2026-07-10.
--
-- Purpose:
--   Re-issues food_library_pull (migrate_028_food_library_pull.sql) to
--   SELECT the 27 UK-NRV micronutrient columns added to public.foods by
--   migrate_109_micronutrient_columns.sql. migrate_109's own header named
--   this exact gap: "the food-library pull RPC... must be re-issued to
--   SELECT these columns when the shared library is re-published with
--   micro data." That data pass is scripts/seed/buildCofidSnapshot.js
--   (this task): the bundled cofid_uk.dat snapshot now carries 24 of the 27
--   columns for ~2,850 generic UK foods, sourced from the McCance &
--   Widdowson "1.4 Inorganics" and "1.5 Vitamins" sheets. This migration is
--   the missing link that lets the SHARED (server-synced) library carry
--   those values to a device via food_library_pull -- the bundled snapshot
--   itself reaches devices through the local seed importer
--   (src/lib/food/seed.js) independently of this RPC; this RPC only matters
--   once cloud `foods` rows are populated with micro data by some future
--   server-side import/backfill pass (not part of this task -- the bundled
--   snapshot is a local asset, not synced through this function).
--
-- Client-side: src/lib/food/libraryDelta.js already binds these columns on
--   its local insert (per the item 16 scoping doc, section 3, "Built and
--   solid" -- `:147-174`), so no client change is needed for this migration
--   to take effect; it was only ever waiting on the server-side SELECT list.
--
-- Why DROP before CREATE (not CREATE OR REPLACE): PostgreSQL disallows
--   CREATE OR REPLACE FUNCTION from changing a function's RETURNS TABLE
--   column list. This adds 27 new output columns, which IS a return-type
--   change, so the old overload must be dropped first (same DROP-then-CREATE
--   pattern already used in migrate_114 for an analogous case).
--
-- Data honesty: every new column is nullable numeric, SELECTed as-is from
--   public.foods. A NULL stays NULL through this RPC (never coerced to 0);
--   the client's own micronutrients.js maths already treats NULL as
--   "unknown". No behaviour changes for any existing column or client that
--   doesn't yet read the new fields (additive to the RETURNS TABLE only).
--
-- Applied: LOCALLY/staging via db push; PRODUCTION only on the founder
--   running this file explicitly (run against production). Not auto-applied
--   (per CLAUDE.md, the app never runs cloud migrations and the
--   deploy-migrations workflow is manual-dispatch only).
-- Safe to re-run: YES. The DROP...CREATE pair is idempotent: dropping a
--   function that doesn't exist is a no-op (IF EXISTS), and CREATE FUNCTION
--   (no OR REPLACE needed after the DROP) always succeeds from a clean slate.
-- Rollback:
--   DROP FUNCTION IF EXISTS food_library_pull(timestamptz);
--   then re-run migrate_028_food_library_pull.sql verbatim to restore the
--   pre-MN-1 26-column signature. No data is affected either way; this is a
--   read-only RPC.

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
    WHERE p.proname = 'food_library_pull'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE FUNCTION food_library_pull(_since timestamptz)
RETURNS TABLE (
  id uuid,
  source text,
  source_id text,
  barcode_ean text,
  name text,
  brand text,
  serving_g numeric,
  serving_label text,
  kcal_100g numeric,
  protein_100g numeric,
  carbs_100g numeric,
  fat_100g numeric,
  fibre_100g numeric,
  sodium_100g numeric,
  sugar_100g numeric,
  -- MN-1 (item 16): the 27 UK-NRV micronutrient columns, same order as
  -- src/lib/food/micronutrients.js MICRO_COLUMNS.
  vit_a_100g numeric,
  vit_d_100g numeric,
  vit_e_100g numeric,
  vit_k_100g numeric,
  vit_c_100g numeric,
  thiamin_100g numeric,
  riboflavin_100g numeric,
  niacin_100g numeric,
  vit_b6_100g numeric,
  folate_100g numeric,
  vit_b12_100g numeric,
  biotin_100g numeric,
  pantothenic_100g numeric,
  potassium_100g numeric,
  chloride_100g numeric,
  calcium_100g numeric,
  phosphorus_100g numeric,
  magnesium_100g numeric,
  iron_100g numeric,
  zinc_100g numeric,
  copper_100g numeric,
  manganese_100g numeric,
  fluoride_100g numeric,
  selenium_100g numeric,
  chromium_100g numeric,
  molybdenum_100g numeric,
  iodine_100g numeric,
  verified boolean,
  fetched_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    SELECT f.id, f.source, f.source_id, f.barcode_ean,
           f.name, f.brand, f.serving_g, f.serving_label,
           f.kcal_100g, f.protein_100g, f.carbs_100g, f.fat_100g,
           f.fibre_100g, f.sodium_100g, f.sugar_100g,
           f.vit_a_100g, f.vit_d_100g, f.vit_e_100g, f.vit_k_100g, f.vit_c_100g,
           f.thiamin_100g, f.riboflavin_100g, f.niacin_100g, f.vit_b6_100g,
           f.folate_100g, f.vit_b12_100g, f.biotin_100g, f.pantothenic_100g,
           f.potassium_100g, f.chloride_100g, f.calcium_100g, f.phosphorus_100g,
           f.magnesium_100g, f.iron_100g, f.zinc_100g, f.copper_100g,
           f.manganese_100g, f.fluoride_100g, f.selenium_100g, f.chromium_100g,
           f.molybdenum_100g, f.iodine_100g,
           f.verified, f.fetched_at, f.updated_at
    FROM foods f
    WHERE f.updated_at > COALESCE(_since, '1970-01-01'::timestamptz)
    ORDER BY f.updated_at ASC
    LIMIT 5000;
END $$;

GRANT EXECUTE ON FUNCTION food_library_pull(timestamptz) TO authenticated;
