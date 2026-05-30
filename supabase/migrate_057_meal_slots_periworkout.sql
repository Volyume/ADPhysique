-- Migration 057: pre-workout and post-workout meal slots
--
-- The food diary slots were locked to four values by migration 015:
--   meal_slot text NOT NULL CHECK (meal_slot IN
--     ('breakfast','lunch','dinner','snack'))
-- That is the generic calorie-counter taxonomy. A bodybuilding app needs
-- the two meals that sit around training, which are nutritionally distinct
-- (pre: easy carbs plus moderate protein to fuel; post: fast protein plus
-- carbs to recover). The app now offers Pre-workout and Post-workout
-- sections on the diary and curated meals tagged to them, so the server
-- CHECK has to allow the two new values or every peri-workout entry is
-- rejected on sync.
--
-- This migration relaxes the CHECK to add 'preworkout' and 'postworkout'.
-- It is purely additive: the four original values still pass, so nothing
-- already stored is affected and no row needs migrating.
--
-- Old AAB compatibility (release policy 2026-05-24): safe. The frozen
-- closed-test build only ever sends the four original slots, which remain
-- valid under the relaxed constraint, so it keeps syncing unchanged. The
-- new values only arrive from a build that knows about them. There is no
-- direction in which the old build breaks.
--
-- Ordering dependency: apply this BEFORE a client that can write the new
-- slots reaches production sync, otherwise that client's peri-workout
-- entries fail the old CHECK on push (caught per-table, so the entry stays
-- local and the wider sync run still succeeds, but the row never reaches
-- the cloud until this is applied).
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        057
--   - Purpose:                 allow 'preworkout' and 'postworkout' in
--                              food_entries.meal_slot so the new diary
--                              sections sync.
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (DROP CONSTRAINT IF EXISTS then ADD;
--                              each run rebuilds the same constraint).
--   - Rollback:                only if no peri-workout rows exist yet, or
--                              they are deleted/remapped first, since the
--                              old CHECK would reject them:
--                                ALTER TABLE food_entries
--                                  DROP CONSTRAINT IF EXISTS
--                                  food_entries_meal_slot_check;
--                                ALTER TABLE food_entries
--                                  ADD CONSTRAINT
--                                  food_entries_meal_slot_check
--                                  CHECK (meal_slot IN
--                                  ('breakfast','lunch','dinner','snack'));
--   - App-code dependencies:   DiaryScreen MEAL_SLOTS and QuickAddSheet
--                              MEAL_SLOTS (the two new sections),
--                              curatedMeals.js (meals tagged
--                              ['preworkout'] / ['postworkout']). The
--                              local SQLite food_entries.meal_slot has no
--                              CHECK, so local logging works before this
--                              is applied; only cloud sync needs it.
--   - Dependencies:            migration 015 (creates food_entries and the
--                              original CHECK this replaces).
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run. See verification in
-- supabase/README.md § Verify peri-workout meal slots.

ALTER TABLE food_entries
  DROP CONSTRAINT IF EXISTS food_entries_meal_slot_check;

ALTER TABLE food_entries
  ADD CONSTRAINT food_entries_meal_slot_check
  CHECK (meal_slot IN ('breakfast','lunch','dinner','snack','preworkout','postworkout'));
