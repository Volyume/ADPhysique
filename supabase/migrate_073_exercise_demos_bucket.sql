-- ════════════════════════════════════════════════════════════════════
-- Migration 073: Exercise demonstrations storage bucket (Phase 2)
-- ════════════════════════════════════════════════════════════════════
--
-- Creates the public, read-only Storage bucket that holds the self-hosted
-- exercise demonstration media (animated GIF/WebP) populated by
-- scripts/seed/seedExerciseDemos.js. The exercises.demo_url column
-- (migration 072) points at public URLs in this bucket.
--
-- Public read is intentional: demonstrations are a FREE feature for all
-- tiers and the media carries no PII. Writes are service-role only (no
-- anon/authenticated insert/update/delete policy is created), so end
-- users can never mutate the bucket — only the seed script, run with the
-- service-role key, can populate it.
--
-- EU data residency: the bucket lives in the project's EU (Dublin) region
-- like all other Volyume storage. No media leaves the EU.
--
-- Idempotent and additive: safe to re-run. Touches nothing outside the
-- new bucket.
-- ════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-demos', 'exercise-demos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public bucket already grants public SELECT on its objects via Supabase's
-- built-in policy. We add no INSERT/UPDATE/DELETE policy, so only the
-- service-role key (which bypasses RLS) can write — exactly the seed
-- script's access path.
