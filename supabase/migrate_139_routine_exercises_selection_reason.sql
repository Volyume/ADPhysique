-- migrate_139_routine_exercises_selection_reason.sql
--
-- Campaign 16 independent adversarial verification (2026-08-14).
--
-- The selector's machine-readable reason was persisted locally but omitted
-- from the routine_exercises cloud contract. A fresh-device restore therefore
-- lost "Why this exercise" even though the original device could render it.
--
-- Additive and nullable: rows written by older clients remain valid and read
-- as having no recorded provenance. No RLS, ownership, keys or grants change.
-- The client push retries without this optional column until the migration is
-- present, so application and migration order are independent.
--
-- PRODUCTION STATUS: UNKNOWN. This file was authored during the audit and was
-- not executed from that session. Do not infer remote state from its presence.

ALTER TABLE public.routine_exercises
  ADD COLUMN IF NOT EXISTS selection_reason text;

