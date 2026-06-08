-- ════════════════════════════════════════════════════════════════════
-- Migration 072: Exercise demonstrations (Phase 2)
-- ════════════════════════════════════════════════════════════════════
--
-- Adds per-exercise demonstration media + structured technique content to the
-- exercises table. Additive and nullable only — no existing column, RLS
-- policy, or constraint is touched, so this is safe to apply to production
-- without behavioural change. Existing canonical-read RLS
-- ("Anyone can read canonical exercises") continues to apply unchanged.
--
--   demo_url               TEXT    self-hosted media URL (EU Supabase Storage)
--   demo_thumbnail_url     TEXT    WebP poster/thumbnail URL
--   form_cues              JSONB   { setup:[...], execution:[...], cues:[...] }
--   common_mistakes        JSONB   ["...", "..."]
--   demo_duration_seconds  INTEGER loop length hint
--
-- Demonstrations are a FREE feature (all tiers). Media is null until a
-- licence-cleared, self-hosted media set is populated; the app renders an
-- illustrated-diagram + written-cues fallback when demo_url is null.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS demo_url TEXT,
  ADD COLUMN IF NOT EXISTS demo_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS form_cues JSONB,
  ADD COLUMN IF NOT EXISTS common_mistakes JSONB,
  ADD COLUMN IF NOT EXISTS demo_duration_seconds INTEGER;
