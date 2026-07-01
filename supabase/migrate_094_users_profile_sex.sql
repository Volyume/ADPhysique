-- migrate_094_users_profile_sex.sql
-- Add biological sex to users_profile (sex-tailoring upgrade U2, founder
-- 2026-07-01). Sex drives the ED calorie floor + BMR and is enforced present at
-- onboarding, but it previously lived ONLY in user_body_profile. If that row
-- ever failed to sync (or was never written), a fresh-install cloud pull
-- restored the rest of the profile from users_profile while sex was lost. Adding
-- sex to users_profile — the row restoreSessionFromCloud already reads — closes
-- that divergence/loss gap so sex survives alongside the rest of the profile.
--
-- ADDITIVE + idempotent. Applied by CI on merge to main (deploy-migrations.yml);
-- never run by hand against production.
--
-- Nullable (legacy rows have no value yet) with a CHECK that only permits the
-- two enforced values when present. Client writes sex via syncProfile and reads
-- it back in restoreSessionFromCloud (defensively, tolerant of this column being
-- absent on a not-yet-migrated project).
--
-- Applied locally:  NO (pending)
-- Applied remotely: NO (auto-applies on merge to main via deploy-migrations.yml)
-- Safe to re-run:   YES. ADD COLUMN IF NOT EXISTS; CHECK added idempotently.
-- Rollback:         ALTER TABLE users_profile DROP COLUMN IF EXISTS sex;
-- App dependency:   apply BEFORE a build that writes/reads users_profile.sex
--                   reaches production; until then the client write would be
--                   rejected and the read falls back to the sex-less select.

ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS sex text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'users_profile' AND constraint_name = 'users_profile_sex_check'
  ) THEN
    ALTER TABLE users_profile
      ADD CONSTRAINT users_profile_sex_check
      CHECK (sex IS NULL OR sex IN ('male', 'female'));
  END IF;
END $$;
