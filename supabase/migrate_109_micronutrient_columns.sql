-- Migration 109: MN-1 micronutrient columns on the food tables.
-- Applied remotely: YES (2026-07-10, applied to EU-Dublin by Claude via the
--   Supabase connector, founder-authorised "run against production").
--
-- Purpose:
--   Cloud counterpart of local schema v58 (database.js). Adds the 27 UK-NRV
--   vitamin/mineral per-100g columns (the set in src/lib/food/micronutrients.js)
--   to public.foods and public.custom_foods, so custom foods round-trip their
--   micronutrients through sync and the shared library can carry them once its
--   seed is regenerated with micro data. Audit §15 item 2, founder-approved
--   full build 2026-07-08.
--
-- Data honesty:
--   All columns are nullable numeric. A missing value stays NULL and is rendered
--   "unknown" in-app, never 0. Existing rows are unaffected.
--
-- Applied: LOCALLY/staging via db push; PRODUCTION only on the founder running
--   this file explicitly (run against production). Not auto-applied.
-- Safe to re-run: YES (ADD COLUMN IF NOT EXISTS).
-- Rollback:
--   ALTER TABLE public.foods DROP COLUMN IF EXISTS <col>; (x27, both tables)
--
-- Downstream (NOT in this migration, tracked): the food-library pull RPC
--   (migrate_028_food_library_pull.sql) returns an explicit column list, so it
--   must be re-issued to SELECT these columns when the shared library is
--   re-published with micro data (the seed .dat regeneration task). Custom-food
--   sync needs no RPC change (row-level upsert of the whole table).

ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS vit_a_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS vit_d_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS vit_e_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS vit_k_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS vit_c_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS thiamin_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS riboflavin_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS niacin_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS vit_b6_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS folate_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS vit_b12_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS biotin_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS pantothenic_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS potassium_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS chloride_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS calcium_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS phosphorus_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS magnesium_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS iron_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS zinc_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS copper_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS manganese_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS fluoride_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS selenium_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS chromium_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS molybdenum_100g numeric;
ALTER TABLE public.foods        ADD COLUMN IF NOT EXISTS iodine_100g numeric;

ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS vit_a_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS vit_d_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS vit_e_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS vit_k_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS vit_c_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS thiamin_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS riboflavin_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS niacin_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS vit_b6_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS folate_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS vit_b12_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS biotin_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS pantothenic_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS potassium_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS chloride_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS calcium_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS phosphorus_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS magnesium_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS iron_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS zinc_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS copper_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS manganese_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS fluoride_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS selenium_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS chromium_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS molybdenum_100g numeric;
ALTER TABLE public.custom_foods ADD COLUMN IF NOT EXISTS iodine_100g numeric;
