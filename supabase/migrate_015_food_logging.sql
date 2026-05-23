-- Migration 015: food logging cloud schema
--
-- Adds the food-domain tables for Move #1 (food foundation + FFM floor).
-- All tables are sync targets registered in src/lib/sync/registry.js per
-- docs/SYNC_ARCHITECTURE_LOCKED.md.
--
-- Schema locked in docs/DATABASE_SCHEMA_LOCKED.md. The plan referenced
-- this as "migration 005" but that number is already taken on Supabase;
-- the actual file is migrate_015_food_logging.sql.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

-- ─────────────────────────────────────────────────────────────────────
-- foods: canonical food records, readable by all authenticated users.
-- Source field allows mixing OpenFoodFacts, USDA, CoFID, user-created
-- via OCR. Writes happen through service role only.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL CHECK (source IN ('off','usda','cofid','user_ocr')),
  source_id       text,
  barcode_ean     text,
  name            text NOT NULL,
  brand           text,
  serving_g       numeric NOT NULL,
  serving_label   text,
  kcal_100g       numeric NOT NULL,
  protein_100g    numeric NOT NULL,
  carbs_100g      numeric NOT NULL,
  fat_100g        numeric NOT NULL,
  fibre_100g      numeric,
  sodium_100g     numeric,
  sugar_100g      numeric,
  verified        boolean DEFAULT false,
  fetched_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode_ean) WHERE barcode_ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foods_name_lower ON foods(lower(name) text_pattern_ops);
CREATE UNIQUE INDEX IF NOT EXISTS uq_foods_source_source_id ON foods(source, source_id);
CREATE INDEX IF NOT EXISTS idx_foods_verified_updated ON foods(verified, updated_at DESC);

ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read foods" ON foods;
CREATE POLICY "Authenticated users can read foods" ON foods
  FOR SELECT TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- custom_foods: user-created food records.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_foods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  brand           text,
  serving_g       numeric NOT NULL,
  serving_label   text,
  kcal_100g       numeric NOT NULL,
  protein_100g    numeric NOT NULL,
  carbs_100g      numeric NOT NULL,
  fat_100g        numeric NOT NULL,
  fibre_100g      numeric,
  sodium_100g     numeric,
  sugar_100g      numeric,
  photo_url       text,
  notes           text,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_foods_user_active ON custom_foods(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_custom_foods_user_name ON custom_foods(user_id, lower(name));

ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own custom foods" ON custom_foods;
CREATE POLICY "Users can manage own custom foods" ON custom_foods
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- food_entries: the diary. Macros denormalised at log time so changes
-- to the underlying food don't rewrite history.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date      date NOT NULL,
  meal_slot       text NOT NULL CHECK (meal_slot IN ('breakfast','lunch','dinner','snack')),
  food_ref        text NOT NULL,
  quantity_g      numeric NOT NULL,
  kcal            numeric NOT NULL,
  protein_g       numeric NOT NULL,
  carbs_g         numeric NOT NULL,
  fat_g           numeric NOT NULL,
  fibre_g         numeric,
  logged_at       timestamptz DEFAULT now(),
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_entries_user_date_slot ON food_entries(user_id, entry_date, meal_slot) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_food_entries_user_recent ON food_entries(user_id, logged_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own food entries" ON food_entries;
CREATE POLICY "Users can manage own food entries" ON food_entries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- daily_intake_rollups: derived totals for fast engine reads.
-- Maintained by trigger on food_entries.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_intake_rollups (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date      date NOT NULL,
  kcal_total      numeric NOT NULL DEFAULT 0,
  protein_g       numeric NOT NULL DEFAULT 0,
  carbs_g         numeric NOT NULL DEFAULT 0,
  fat_g           numeric NOT NULL DEFAULT 0,
  fibre_g         numeric,
  entries_count   int NOT NULL DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, entry_date)
);

ALTER TABLE daily_intake_rollups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own intake rollups" ON daily_intake_rollups;
CREATE POLICY "Users can read own intake rollups" ON daily_intake_rollups
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own intake rollups" ON daily_intake_rollups;
CREATE POLICY "Users can update own intake rollups" ON daily_intake_rollups
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger function: recompute the rollup for a (user, date) on any
-- food_entries insert/update/delete. Runs in the same transaction.
CREATE OR REPLACE FUNCTION recompute_daily_intake_rollup(
  target_user_id uuid,
  target_date    date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_intake_rollups (
    user_id, entry_date, kcal_total, protein_g, carbs_g, fat_g, fibre_g, entries_count, updated_at
  )
  SELECT
    target_user_id,
    target_date,
    COALESCE(SUM(kcal), 0),
    COALESCE(SUM(protein_g), 0),
    COALESCE(SUM(carbs_g), 0),
    COALESCE(SUM(fat_g), 0),
    NULLIF(COALESCE(SUM(fibre_g), 0), 0),
    COUNT(*),
    now()
  FROM food_entries
  WHERE user_id = target_user_id
    AND entry_date = target_date
    AND deleted_at IS NULL
  ON CONFLICT (user_id, entry_date) DO UPDATE
    SET kcal_total = EXCLUDED.kcal_total,
        protein_g  = EXCLUDED.protein_g,
        carbs_g    = EXCLUDED.carbs_g,
        fat_g      = EXCLUDED.fat_g,
        fibre_g    = EXCLUDED.fibre_g,
        entries_count = EXCLUDED.entries_count,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION food_entries_rollup_trigger() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_daily_intake_rollup(OLD.user_id, OLD.entry_date);
    RETURN OLD;
  END IF;
  PERFORM recompute_daily_intake_rollup(NEW.user_id, NEW.entry_date);
  -- If an update changed the entry_date, also recompute the old date.
  IF TG_OP = 'UPDATE' AND OLD.entry_date <> NEW.entry_date THEN
    PERFORM recompute_daily_intake_rollup(OLD.user_id, OLD.entry_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS food_entries_to_rollup ON food_entries;
CREATE TRIGGER food_entries_to_rollup
  AFTER INSERT OR UPDATE OR DELETE ON food_entries
  FOR EACH ROW
  EXECUTE FUNCTION food_entries_rollup_trigger();

-- ─────────────────────────────────────────────────────────────────────
-- saved_meals: user-created meal templates.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_meals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  items_json      jsonb NOT NULL,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_meals_user_active ON saved_meals(user_id) WHERE deleted_at IS NULL;

ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own saved meals" ON saved_meals;
CREATE POLICY "Users can manage own saved meals" ON saved_meals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- recipes + recipe_ingredients.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  total_servings  numeric NOT NULL,
  notes           text,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_active ON recipes(user_id) WHERE deleted_at IS NULL;

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own recipes" ON recipes;
CREATE POLICY "Users can manage own recipes" ON recipes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  food_ref        text NOT NULL,
  quantity_g      numeric NOT NULL,
  order_index     int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can manage own recipe ingredients" ON recipe_ingredients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────
-- food_favourites: composite PK on (user_id, food_ref).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_favourites (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_ref        text NOT NULL,
  last_used_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, food_ref)
);

ALTER TABLE food_favourites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own favourites" ON food_favourites;
CREATE POLICY "Users can manage own favourites" ON food_favourites
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- daily_water: composite PK on (user_id, entry_date).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_water (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date      date NOT NULL,
  ml              int NOT NULL DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, entry_date)
);

ALTER TABLE daily_water ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own water log" ON daily_water;
CREATE POLICY "Users can manage own water log" ON daily_water
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
