-- Migration 028: food_library_pull RPC for cloud-side delta sync
--
-- Step 3 of the food data plan. The bundled OFF UK snapshot
-- (assets/seed/off_uk_snapshot.json) primes every fresh install
-- with ~20-25k UK products. Between APK releases, new products and
-- corrections land in OpenFoodFacts. We mirror those into cloud
-- `foods` via a separate CI job, then the client polls THIS RPC
-- to pull just the changed rows since its last pull. No full
-- re-download; only the delta.
--
-- Read-only. Returns rows with updated_at > _since. Caps at 5000
-- rows per call so the response stays bounded. Client paginates
-- via repeated calls using the highest updated_at it saw.
--
-- Safe to apply now. Strictly additive; no schema change.
-- Compatible with the old client (won't call this RPC).
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION food_library_pull(_since timestamptz)
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
           f.verified, f.fetched_at, f.updated_at
    FROM foods f
    WHERE f.updated_at > COALESCE(_since, '1970-01-01'::timestamptz)
    ORDER BY f.updated_at ASC
    LIMIT 5000;
END $$;

GRANT EXECUTE ON FUNCTION food_library_pull(timestamptz) TO authenticated;
