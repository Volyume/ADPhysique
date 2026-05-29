-- Migration 052: reconcile the drifted daily_water table (sync error fix)
--
-- Symptom (founder-reported 2026-05-29, Sentry scope
-- sync.tables.foodDomain.push, error 42703):
--   column "entry_date" of relation "daily_water" does not exist
--
-- Root cause: the live cloud daily_water table predates migrate_015 and
-- was created without an entry_date column. migrate_015's
-- `CREATE TABLE IF NOT EXISTS daily_water (... entry_date ...)` found the
-- table already present and skipped it, so the column was never added.
-- food_sync_push (migrate_016 / migrate_021) inserts into
-- daily_water(user_id, entry_date, ml, updated_at); the missing column
-- makes the RPC throw, which fails the entire food-domain push AND the
-- whole sync run. That is what lights the red "Sync error" badge on
-- every screen and spams Sentry (food_favourites/recipes/etc. all report
-- errors because they share the one food_sync_push call).
--
-- Why drop + recreate is safe here: daily_water has never received a
-- successful push (the column has always been wrong, so every push
-- errored; pull/push counts are 0). There is no cloud water data to
-- preserve. Clients hold the source of truth in local SQLite and
-- re-push on the next sync. This block ONLY acts when entry_date is
-- genuinely missing, so it is a no-op on a healthy cloud and safe to
-- re-run.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run. See verification
-- in supabase/README.md § Verify daily_water reconcile.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'daily_water'
      AND column_name  = 'entry_date'
  ) THEN
    DROP TABLE IF EXISTS daily_water CASCADE;

    CREATE TABLE daily_water (
      user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      entry_date date        NOT NULL,
      ml         int         NOT NULL DEFAULT 0,
      updated_at timestamptz DEFAULT now(),
      PRIMARY KEY (user_id, entry_date)
    );

    ALTER TABLE daily_water ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage own water log" ON daily_water;
    CREATE POLICY "Users can manage own water log" ON daily_water
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    RAISE NOTICE 'daily_water recreated to the canonical (user_id, entry_date, ml, updated_at) shape';
  ELSE
    RAISE NOTICE 'daily_water already has entry_date; no change made';
  END IF;
END $$;
