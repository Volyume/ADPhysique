# PASS 1 — SECTION 3: DATA MODEL REGISTER (LOCATE-AND-CITE)

Method (Tier B): every table located with EXACT file:line in `supabase/`. Columns, RLS policies,
relationships, used-in-Coach, shown-to-user = **VALUE DEFERRED — verify on consumption** (pulled
when a Pass 4 blueprint touches the table). Offline-first: most tables have a local mirror in
`src/lib/database.js` (6,459 lines) — the device DB is source of truth, Supabase is the sync target
(CLAUDE.md architecture). No `~`.

## TABLES (defining file:line)
### supabase/setup_complete.sql (core schema)
users_profile :23 · exercises :61 · routines :92 · routine_exercises :104 · mesocycles :117 ·
mesocycle_weeks :134 · workouts :145 · workout_sets :165 · volume_landmarks :190 · weekly_volumes :203 ·
personal_records :218 · body_metrics :232 · progress_photos :251 · achievements :262 · weekly_checkins :272 ·
autoregulation_suggestions :291 · programmes :308 · morning_weights :320 · coach_outputs :332 ·
user_body_profile :342 · exercise_user_notes :355 · weekly_checkins_v :371 · debug_log_uploads :395

### supabase/migrate_015_food_logging.sql (food)
foods :18 · custom_foods :54 · food_entries :88 · daily_intake_rollups :119 · saved_meals :205 ·
recipes :226 · recipe_ingredients :245 · food_favourites :269 · daily_water :285

### supabase/migrate_012_complete_sync.sql (engine sync)
user_body_profile :159 (also setup_complete) · user_insights :187 · planned_muscle_volume :205 ·
adaptation_events :219 · peak_week_plans :233 (DROPPED later by migrate_049_drop_peak_week_plans.sql) ·
workout_notes :257 · exercise_goals :269 · user_prefs :287

### supabase/migrate_017_ed_pattern_and_telemetry.sql (safety/telemetry)
ed_pattern_flags :14 · engine_telemetry :108 · engine_overrides :217

### supabase/migrate_081_training_partners.sql (partners)
partnerships :75 · partner_week_signals :115 · partner_cheers :184 · partner_blocks :218

### supabase/migrate_030_tier_infrastructure.sql (billing/tier)
tier_history :63 · pricing_config :100

### supabase/migrate_071_trial_ledger.sql (trial, private schema)
private.trial_salt :72 · private.trial_ledger :85

### other migrations (one table each)
nutrition_targets — migrate_009_nutrition_targets.sql:14 · consent_log — migrate_019_health_consent.sql:34 ·
custom_exercises — migrate_020_custom_exercises.sql:26 · daily_water (reconcile redef) — migrate_052_daily_water_reconcile.sql:39 ·
daily_steps — migrate_056_daily_steps.sql:66 · device_push_tokens — migrate_053_device_push_tokens.sql:59 ·
notification_preferences — migrate_044_notification_preferences.sql:54 · cardio_log — migrate_064_cardio_log.sql:60 ·
weekly_checkins (early) — migrate_004_schema_improvements.sql:5 · user_feedback — migrate_013_user_feedback.sql:15 ·
meal_plans — migrate_086_meal_plans.sql:12 · food_frequents — migrate_051_food_frequents.sql:28 ·
account_deletions_log — migrate_039_account_deletions_log.sql:29

## COMPLETENESS
~60 distinct tables enumerated (grep false-positives "IF/somewhere/statement/uses" from comment
lines excluded). peak_week_plans is created in 012 then DROPPED by migrate_049 — flagged, not dropped
from the index. RLS: `create policy` present in many files (setup_complete 24, food_logging 10,
rls_hardening 16, partners 8, custom_exercises 4, device_push_tokens 4, …) — RLS policy bodies VALUE
DEFERRED. used-in-Coach / shown-to-user / per-column types = VALUE DEFERRED (verify on consumption).

## OFFLINE MIRROR
src/lib/database.js (6,459 lines) is the local DB/sync layer mirroring these tables on-device.
Per-table local schema + the sync mapping = VALUE DEFERRED; index database.js's table accessors when
a blueprint consumes a specific table's local shape.
