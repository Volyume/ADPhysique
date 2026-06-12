-- migrate_086_meal_plans.sql
-- Theme G follow-up (founder-approved, 2026-06-12): cloud mirror for the
-- local meal_plans table so an active plan survives a device change.
-- ADDITIVE only. Applied by CI on merge to main (deploy-migrations.yml);
-- never run by hand against production.
--
-- Shape mirrors the local SQLite table verbatim: timestamps stay as epoch
-- milliseconds (bigint) so last-write-wins comparisons round-trip without
-- timezone/precision conversion. plan_json is the assembled plan snapshot
-- (target band, prefs, days, variants) stored as jsonb.

CREATE TABLE IF NOT EXISTS meal_plans (
  id          text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_json   jsonb NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  deleted_at  bigint,
  created_at  bigint NOT NULL,
  updated_at  bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_active
  ON meal_plans (user_id, updated_at DESC)
  WHERE deleted_at IS NULL AND is_active = true;

-- RLS: mandatory on every new table (docs/rules/supabase.md).
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON meal_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: deletion is a soft tombstone (deleted_at), matching
-- the local table and the sync registry's softDelete contract.
