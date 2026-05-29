-- Cloud schema drift audit.
--
-- Source of truth: the per-table sync handlers under
-- src/lib/sync/tables/ and the food-domain coordinator
-- src/lib/sync/tables/foodDomain.js. Every column the client
-- sends in an upsert payload (push) or reads off a pulled row
-- must exist in the live cloud schema, or sync silently drops
-- data (PGRST204 + an entry in the device sync error log).
--
-- This audit was prompted by the recipe_ingredients.created_at
-- divergence that broke migration 046's first apply attempt
-- (commit 6aa79ca tracked it). Tracked as a LATER follow-up in
-- docs/CURRENT_STATUS.md § 8 "Phase A exit prep".
--
-- How to use:
--   1. Supabase Dashboard -> SQL Editor -> paste the whole file.
--   2. Run. The single result set lists every (table, column)
--      the client expects, with status = 'OK' when the column
--      exists in the live cloud, 'MISSING' when it doesn't.
--   3. Any MISSING row is a drift the client will trip over on
--      the next sync. Write a migration to add it, or fix the
--      handler if the column was renamed.
--
-- This file is NOT a migration. It introspects information_schema
-- read-only and never writes. Safe to re-run any time.
--
-- The expected set is hand-maintained, not generated. When a
-- handler gains a new column (push or pull), add a row to the
-- VALUES block below in the matching table section. If you don't,
-- a real divergence will not surface in this audit.

WITH expected (cloud_table, column_name, source) AS (
  VALUES
    -- ─── body_metrics (registry: body_composition_log) ──────────
    ('body_metrics', 'id',                  'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'user_id',             'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'metric_date',         'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'body_weight',         'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'waist',               'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'chest',               'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'hips',                'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'quads',               'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'arms',                'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'shoulders',           'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'forearms',            'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'hamstrings',          'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'calves',              'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'body_fat_percent',    'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'body_fat_source',     'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'notes',               'sync/tables/bodyComposition.js push+pull'),
    ('body_metrics', 'updated_at',          'sync/tables/bodyComposition.js push+pull (mig 047)'),
    ('body_metrics', 'deleted_at',          'sync/tables/bodyComposition.js push+pull (mig 047)'),

    -- ─── weekly_checkins_v2 ────────────────────────────────────
    ('weekly_checkins_v2', 'id',                    'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'user_id',               'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'week_start',            'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'energy_score',          'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'soreness_score',        'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'stress_score',          'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'sleep_hours',           'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'cals_adherence',        'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'steps_adherence',       'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'training_performance',  'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'joint_pain',            'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'sore_muscles',          'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'cycle_override',        'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'notes',                 'sync/tables/weeklyCheckins.js push+pull'),
    ('weekly_checkins_v2', 'updated_at',            'sync/tables/weeklyCheckins.js push+pull (mig 047)'),

    -- ─── notification_preferences ──────────────────────────────
    ('notification_preferences', 'user_id',    'sync/tables/notificationPreferences.js push+pull'),
    ('notification_preferences', 'category',   'sync/tables/notificationPreferences.js push+pull'),
    ('notification_preferences', 'enabled',    'sync/tables/notificationPreferences.js push+pull'),
    ('notification_preferences', 'time_pref',  'sync/tables/notificationPreferences.js push+pull'),
    ('notification_preferences', 'updated_at', 'sync/tables/notificationPreferences.js push+pull'),

    -- ─── nutrition_targets ─────────────────────────────────────
    ('nutrition_targets', 'user_id',         'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'bmr',             'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'tdee',            'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'target_kcal',     'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'protein_g',       'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'carbs_g',         'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'fat_g',           'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'phase',           'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'bmr_method',      'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'activity_level',  'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'confidence',      'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'warnings',        'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'gdpr_consented',  'sync/tables/nutritionTargets.js push+pull'),
    ('nutrition_targets', 'updated_at',      'sync/tables/nutritionTargets.js push+pull'),

    -- ─── users_profile (registry: profiles) ────────────────────
    ('users_profile', 'id',                 'sync/tables/profiles.js push+pull'),
    ('users_profile', 'first_name',         'sync/tables/profiles.js push+pull'),
    ('users_profile', 'units',              'sync/tables/profiles.js push+pull'),
    ('users_profile', 'training_focus',     'sync/tables/profiles.js push+pull'),
    ('users_profile', 'training_age',       'sync/tables/profiles.js push+pull'),
    ('users_profile', 'primary_equipment',  'sync/tables/profiles.js push+pull'),
    ('users_profile', 'bar_weight',         'sync/tables/profiles.js push+pull'),
    ('users_profile', 'updated_at',         'sync/tables/profiles.js push+pull'),
    ('users_profile', 'column_updates_at',  'sync/tables/profiles.js push+pull (mig 045)'),

    -- ─── recipe_ingredients ────────────────────────────────────
    ('recipe_ingredients', 'id',          'sync/tables/recipeIngredients.js push+pull'),
    ('recipe_ingredients', 'recipe_id',   'sync/tables/recipeIngredients.js push+pull'),
    ('recipe_ingredients', 'food_ref',    'sync/tables/recipeIngredients.js push+pull'),
    ('recipe_ingredients', 'quantity_g',  'sync/tables/recipeIngredients.js push+pull'),
    ('recipe_ingredients', 'order_index', 'sync/tables/recipeIngredients.js push+pull'),
    ('recipe_ingredients', 'user_id',     'sync/tables/recipeIngredients.js push+pull'),
    ('recipe_ingredients', 'created_at',  'sync/tables/recipeIngredients.js push+pull'),
    ('recipe_ingredients', 'updated_at',  'sync/tables/recipeIngredients.js push+pull (mig 046)'),
    ('recipe_ingredients', 'deleted_at',  'sync/tables/recipeIngredients.js push+pull (mig 046)'),

    -- ─── ed_pattern_flags (pull-only, server_wins) ─────────────
    ('ed_pattern_flags', 'id',           'sync/tables/edPatternFlags.js pull'),
    ('ed_pattern_flags', 'user_id',      'sync/tables/edPatternFlags.js pull'),
    ('ed_pattern_flags', 'flag_state',   'sync/tables/edPatternFlags.js pull'),
    ('ed_pattern_flags', 'raised_at',    'sync/tables/edPatternFlags.js pull'),
    ('ed_pattern_flags', 'updated_at',   'sync/tables/edPatternFlags.js pull'),

    -- ─── tier_history (pull-only, server_wins) ─────────────────
    ('tier_history', 'id',           'sync/tables/tierHistory.js pull'),
    ('tier_history', 'user_id',      'sync/tables/tierHistory.js pull'),
    ('tier_history', 'from_tier',    'sync/tables/tierHistory.js pull'),
    ('tier_history', 'to_tier',      'sync/tables/tierHistory.js pull'),
    ('tier_history', 'event_type',   'sync/tables/tierHistory.js pull'),
    ('tier_history', 'occurred_at',  'sync/tables/tierHistory.js pull'),
    ('tier_history', 'payload_json', 'sync/tables/tierHistory.js pull'),
    ('tier_history', 'created_at',   'sync/tables/tierHistory.js pull'),

    -- ─── food_entries (via food_sync_push/pull RPC) ────────────
    ('food_entries', 'id',         'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'user_id',    'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'entry_date', 'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'meal_slot',  'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'food_ref',   'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'quantity_g', 'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'kcal',       'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'protein_g',  'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'carbs_g',    'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'fat_g',      'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'fibre_g',    'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'logged_at',  'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'created_at', 'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'updated_at', 'sync/tables/foodDomain.js RPC payload'),
    ('food_entries', 'deleted_at', 'sync/tables/foodDomain.js RPC payload'),

    -- ─── custom_foods (via food_sync_push/pull RPC) ────────────
    ('custom_foods', 'id',            'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'user_id',       'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'name',          'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'brand',         'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'barcode_ean',   'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'kcal_100g',     'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'protein_100g',  'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'carbs_100g',    'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'fat_100g',      'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'fibre_100g',    'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'serving_g',     'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'serving_label', 'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'created_at',    'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'updated_at',    'sync/tables/foodDomain.js RPC payload'),
    ('custom_foods', 'deleted_at',    'sync/tables/foodDomain.js RPC payload'),

    -- ─── saved_meals (via food_sync_push/pull RPC) ─────────────
    -- Canonical columns per migrate_015 DDL + migrate_016 RPC. An
    -- earlier audit listed slot + foods_json, copied from a buggy
    -- serialiser that invented those names; the real table has neither.
    ('saved_meals', 'id',         'sync/tables/foodDomain.js RPC payload'),
    ('saved_meals', 'user_id',    'sync/tables/foodDomain.js RPC payload'),
    ('saved_meals', 'name',       'sync/tables/foodDomain.js RPC payload'),
    ('saved_meals', 'items_json', 'sync/tables/foodDomain.js RPC payload'),
    ('saved_meals', 'created_at', 'sync/tables/foodDomain.js RPC payload'),
    ('saved_meals', 'updated_at', 'sync/tables/foodDomain.js RPC payload'),
    ('saved_meals', 'deleted_at', 'sync/tables/foodDomain.js RPC payload'),

    -- ─── recipes (via food_sync_push/pull RPC) ─────────────────
    ('recipes', 'id',         'sync/tables/foodDomain.js RPC payload'),
    ('recipes', 'user_id',    'sync/tables/foodDomain.js RPC payload'),
    ('recipes', 'name',       'sync/tables/foodDomain.js RPC payload'),
    ('recipes', 'servings',   'sync/tables/foodDomain.js RPC payload'),
    ('recipes', 'notes',      'sync/tables/foodDomain.js RPC payload'),
    ('recipes', 'created_at', 'sync/tables/foodDomain.js RPC payload'),
    ('recipes', 'updated_at', 'sync/tables/foodDomain.js RPC payload'),
    ('recipes', 'deleted_at', 'sync/tables/foodDomain.js RPC payload'),

    -- ─── food_favourites (via food_sync_push/pull RPC) ─────────
    ('food_favourites', 'user_id',    'sync/tables/foodDomain.js RPC payload'),
    ('food_favourites', 'food_ref',   'sync/tables/foodDomain.js RPC payload'),
    ('food_favourites', 'updated_at', 'sync/tables/foodDomain.js RPC payload'),

    -- ─── daily_water (via food_sync_push/pull RPC) ─────────────
    ('daily_water', 'user_id',    'sync/tables/foodDomain.js RPC payload'),
    ('daily_water', 'entry_date', 'sync/tables/foodDomain.js RPC payload'),
    ('daily_water', 'ml',         'sync/tables/foodDomain.js RPC payload'),
    ('daily_water', 'updated_at', 'sync/tables/foodDomain.js RPC payload')
),
actual AS (
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
)
SELECT
  e.cloud_table,
  e.column_name AS expected_column,
  COALESCE(a.data_type, '—')   AS actual_type,
  CASE WHEN a.column_name IS NULL THEN 'MISSING' ELSE 'OK' END AS status,
  e.source
FROM expected e
LEFT JOIN actual a
  ON  a.table_name  = e.cloud_table
  AND a.column_name = e.column_name
ORDER BY
  CASE WHEN a.column_name IS NULL THEN 0 ELSE 1 END,  -- MISSING first
  e.cloud_table,
  e.column_name;

-- Companion query: list every table on the cloud that ISN'T in the
-- registry's known set. New tables added server-side without a
-- client-side handler show up here. Not necessarily wrong (e.g.
-- service-role-only tables like account_deletions_log,
-- debug_log_uploads, engine_telemetry are intentionally not in the
-- registry); just an awareness check.
SELECT table_name AS unregistered_cloud_table
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type   = 'BASE TABLE'
  AND table_name NOT IN (
    'body_metrics', 'weekly_checkins_v2', 'notification_preferences',
    'nutrition_targets', 'users_profile', 'recipe_ingredients',
    'ed_pattern_flags', 'tier_history', 'food_entries', 'custom_foods',
    'saved_meals', 'recipes', 'food_favourites', 'daily_water',
    'daily_intake_rollups',
    -- intentionally non-registry (service-role / telemetry / audit):
    'account_deletions_log', 'debug_log_uploads', 'engine_telemetry',
    'consent_log', 'tier_history', 'pricing_config', 'trial_state',
    'user_feedback',
    -- legacy / co-existing schema:
    'weekly_checkins', 'morning_weights', 'coach_outputs',
    'workouts', 'workout_sets', 'workout_notes', 'workout_notes_v2',
    'routines', 'routine_exercises', 'programmes',
    'mesocycles', 'mesocycle_weeks',
    'user_body_profile', 'user_insights', 'exercise_user_notes',
    'peak_week_plans', 'progress_photos', 'custom_exercises',
    'exercises'
  )
ORDER BY table_name;
