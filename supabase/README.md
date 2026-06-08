# Supabase migrations — application + verification guide

> **Migration tracking is mandatory** per `CLAUDE.md` §
> "Permanent engineering rules" Rule 6. This document is the
> authoritative tracker for: migration number, purpose, applied
> locally, applied remotely, safe to re-run, rollback notes, and
> app-code dependencies. Keep this file current when adding any
> migration; an undocumented migration is not considered complete.

This is the playbook for applying the pending migrations and
proving each one landed. Run them in numeric order in the Supabase
Dashboard SQL Editor. Every migration is additive and idempotent
unless the file header says otherwise.

## Application order and verification playbook (migrations 037-057)

> Authoritative applied-vs-pending status lives in `docs/CURRENT_STATUS.md`
> § 3. This table is the apply-order and verification playbook for every
> migration from 037 onward; a row appearing here does not by itself mean
> the migration is still unapplied. Per CURRENT_STATUS § 3, migrations
> 037-048, 050-058 are applied (the 048, 050-055, 058 set was applied by the
> founder on 2026-06-01); 049 remains held until the next AAB ships; 059
> (numbered meal slots) is DRAFTED and pending founder apply, to ship with the
> diary flexible-meal change; and **060-067 were APPLIED by the founder on
> 2026-06-06** (060 morning-weights reconcile / SYNC-6, 061 search_path pinning /
> HP-1, 062 delete-fallback erasure gap / HP-3, 063 engagement telemetry / LB-8,
> 064 cardio_log table, 065 trial 21→14 days, 066 users_profile.billing_period,
> 067 client-pro self-grant fix / subscriptions audit C-1); **068 (tier-RPC
> GUC bypass) and 069 (auth.users FK cascade) were APPLIED by the founder on
> 2026-06-07** (068 still needs its verification query run to confirm the tier
> RPCs no longer throw). Only **049 and 059 remain held** until the next AAB
> ships. **070 (protect trial/entitlement columns from client writes / subscriptions
audit C-1 follow-up) is DRAFTED and pending founder apply** — apply it to close
the trial extend/reset hole. Apply any future migration in numeric order in the
SQL Editor.

| # | File | What it adds | Verification query |
|---|---|---|---|
| 037 | `migrate_037_lifecycle_sync_telemetry.sql` | Extends `record_engine_telemetry` allow-list with `app_cold_start`, `app_foregrounded`, `app_backgrounded`, `sync_run`. | See § Verify allow-list extension |
| 038 | `migrate_038_payments_cascade_telemetry.sql` | Adds `cascade_state_transition`, `purchase_initiated`, `purchase_completed`, `purchase_failed`, `subscription_cancelled`, `restore_purchases_attempted`. | Same |
| 039 | `migrate_039_account_deletions_log.sql` | Creates `account_deletions_log` table + `record_account_deletion_started` / `record_account_deletion_completed` RPCs. Service-role only. | See § Verify account_deletions_log |
| 040 | `migrate_040_notification_telemetry.sql` | Adds `notification_sent`, `notification_tapped`, `notification_failed` to the allow-list. | See § Verify allow-list extension |
| 041 | `migrate_041_consent_withdrawal_telemetry.sql` | Adds `article9_consent_withdrawn` to the allow-list. | Same |
| 042 | `migrate_042_upgrade_tier_for_user.sql` | Service-role-only `upgrade_tier_for_user(_user_id, ...)` RPC for the Play Billing RTDN webhook. | See § Verify upgrade_tier_for_user |
| 043 | `migrate_043_sync_conflict_telemetry.sql` | Adds `sync_conflict_resolved` to the allow-list. Fires from `src/lib/sync/conflict.js`. | See § Verify allow-list extension |
| 044 | `migrate_044_notification_preferences.sql` | Creates `notification_preferences(user_id, category, enabled, time_pref)` with RLS + updated_at trigger. Backs NOTIFICATIONS_LOCKED.md lines 117-119. | See § Verify notification_preferences |
| 045 | `migrate_045_users_profile_column_updates_at.sql` | Adds `column_updates_at jsonb` to `users_profile` + safe-merge trigger so the per-column merge conflict strategy can decide field-by-field which side wrote a profile field most recently. Backs SYNC_REGISTRY profiles.merge contract. | See § Verify users_profile.column_updates_at |
| 046 | `migrate_046_recipe_ingredients_soft_delete.sql` | Adds `updated_at` + `deleted_at` columns to `recipe_ingredients`, plus a BEFORE UPDATE touch trigger and a partial index over live rows. Required for the registry's softDelete:true + LWW contract on recipe_ingredients; without it the per-table push raises PGRST204 on every sync. | See § Verify recipe_ingredients soft-delete |
| 047 | `migrate_047_body_metrics_weekly_checkins_lww.sql` | Adds `updated_at` to both `body_metrics` and `weekly_checkins_v2` (+ touch triggers refusing stale writes), plus `deleted_at` and a partial live index to `body_metrics`. Closes the locked LWW + soft-delete gaps for `body_composition_log` and `weekly_checkins_v2` registry entries. | See § Verify body_metrics + weekly_checkins_v2 LWW |
| 048 | `migrate_048_food_preferences_kind.sql` | Adds `kind text NOT NULL DEFAULT 'fav'` + a CHECK constraint to `food_favourites` so the same table holds both "user likes this" (fav) and "user excluded this" (dislike). Backs the food-dislike feature added 2026-05-27. Old AAB sends rows without `kind`; DEFAULT covers them. | See § Verify food_favourites.kind |
| 050 | `migrate_050_weekly_checkins_cardio_adherence.sql` | Adds nullable `cardio_adherence text` to `weekly_checkins_v2`. Destination for the coach's confirm-then-apply cardio prescription (GAP row 4): once applied, the check-in shows a cardio-adherence question and the answer ships in the per-table push. Additive + nullable; the frozen +4 AAB omits it (left NULL), no behaviour change. | See § Verify weekly_checkins_v2.cardio_adherence |
| 051 | `migrate_051_food_frequents.sql` | Creates `food_frequents` cache table (RLS read-own) + `refresh_food_frequents()` nightly pg_cron worker (top-20 foods over 30 days, all users) + `food_frequents_pull()` RPC the client calls. Backs the Frequents search tab (GAP row 28). Fully additive: the frozen AAB never references it, and it sits outside the food_sync_pull/push cycle, so existing sync is untouched. Requires `pg_cron` (already enabled by migration 031). | See § Verify food_frequents |
| 052 | `migrate_052_daily_water_reconcile.sql` | **Apply ASAP: fixes the live "Sync error" badge.** The live `daily_water` table is missing `entry_date` (drifted from migrate_015), so `food_sync_push` throws 42703 and fails the whole food push + the entire sync run. This recreates `daily_water` to the canonical shape, but only when `entry_date` is missing (no-op + safe to re-run otherwise). No data loss: daily_water never synced successfully, so the cloud table is empty; clients re-push local water on next sync. | See § Verify daily_water reconcile |
| 053 | `migrate_053_device_push_tokens.sql` | Creates `device_push_tokens(user_id, expo_push_token, platform, ...)` with composite PK + RLS + touch trigger. Backs the Expo remote-push pipeline (NOTIFICATIONS_LOCKED.md provider stack). The client registers its token after sign-in; the `send-push` Edge Function reads rows (service role) to fan out; the Play Billing RTDN webhook calls it on payment failure. Fully additive; the frozen AAB has no writer for this table. **Also requires `extra.eas.projectId` in app.json before any token can be obtained (see founder-action queue).** | See § Verify device_push_tokens |
| 054 | `migrate_054_workout_sets_unilateral.sql` | Adds nullable `left_reps` + `right_reps` to `workout_sets` for per-side (unilateral) logging (GAP row 20). `actual_reps` holds the lower side, so volume/PR/progression are unchanged; the new columns are a display record. Additive; the frozen AAB sends the old column set and reads `actual_reps` as before. Apply before the next AAB ships (same ordering rule as every additive workout_sets column). | See § Verify workout_sets unilateral |
| 055 | `migrate_055_diet_preference.sql` | Adds `diet_preference text DEFAULT 'omnivore'` to `users_profile`. Backs the curated meal-suggestion feature: the user's diet layer (omnivore/vegetarian/vegan) filters the curated meal library in the Suggested food-search tab. Joins the migration-045 per-column merge set (no trigger change; the jsonb merge handles the new key). Additive + defaulted; the frozen AAB neither writes nor reads it. Apply before the next AAB ships. | See § Verify users_profile.diet_preference |
| 056 | `migrate_056_daily_steps.sql` | Creates `daily_steps(user_id, entry_date, steps, source, updated_at)` with composite PK + RLS + a BEFORE UPDATE touch trigger (last-write-wins), same per-day shape as `daily_water`. The activity store for the cardio/steps audit: the manual step log writes here and the coach's step target checks against it. Bidirectional sync via the `daily_steps` registry entry + `src/lib/sync/tables/dailySteps.js`. `user_id` FK is ON DELETE CASCADE so account deletion clears it; `delete_user_data` is not rewritten here (fold a `daily_steps` DELETE in at its next revision). Fully additive: the frozen AAB has no writer. Safe to apply any time. | See § Verify daily_steps |
| 057 | `migrate_057_meal_slots_periworkout.sql` | Relaxes the `food_entries.meal_slot` CHECK (set by migration 015) to also allow `'preworkout'` and `'postworkout'`, backing the new Pre-workout and Post-workout diary sections and the curated peri-workout meals. Purely additive: the four original slots still pass, so nothing stored changes and the frozen AAB (which only sends the original four) keeps syncing. Local SQLite `meal_slot` has no CHECK, so logging works before this is applied; only cloud sync of the new slots needs it. Apply before a build that writes the new slots reaches production sync. | See § Verify peri-workout meal slots |
| 058 | `migrate_058_weekly_checkins_steps_avg.sql` | Adds nullable `steps_avg integer` to `weekly_checkins_v2`. The persistent home for the week's average steps the Precision Coach reads as a secondary signal: the check-in saves the auto average when 4+ days of `daily_steps` are registered, otherwise the user's typed average. Additive + nullable, mirrors migration 050; the frozen AAB omits it (left NULL). The per-table weekly-checkins push ships `steps_avg`, so without the column that push is rejected. | See § Verify weekly_checkins_v2.steps_avg |
| 059 | `migrate_059_meal_slots_numbered.sql` | **Numbered meal slots. Pending founder apply.** Replaces the fixed `food_entries.meal_slot` CHECK (six legacy values, set by 015 + 057) with a pattern CHECK allowing `meal_[0-9]+` plus the legacy values, backing the flexible "Meal 1..N" diary model (founder direction 2026-06-01). Purely additive: the six legacy values still match, so the frozen AAB keeps syncing; a `meal_N` row synced down to the old build is just not displayed, no crash. Apply before a client that writes `meal_N` slots reaches production sync, otherwise those pushes fail the old CHECK (caught per-table, row stays local, wider run still succeeds). | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%meal_slot%';` shows the `meal_[0-9]+` pattern. |
| 060 | `migrate_060_morning_weights_updated_at.sql` | **SYNC-6. Applied 2026-06-06 (founder).** Adds `updated_at timestamptz NOT NULL DEFAULT now()` + a BEFORE UPDATE touch trigger to `morning_weights` (mirrors 047; no `deleted_at`, the table is hard-delete). The cloud table never had `updated_at`, so the client pull's `.gte('updated_at', cursor)` watermark could never advance and the local applier's `INSERT OR IGNORE` never updated an existing row: a weight edited on another device never reconciled. The client commit switches `insertMorningWeightFromCloud` to a last-write-wins upsert. Additive: the frozen AAB pushes without `updated_at` (DEFAULT + trigger fill it) and its pull starts working rather than breaking. `_pushMorningWeights` does NOT send `updated_at`; the trigger manages it. Apply before a build that relies on cross-device weight reconcile. | `SELECT column_name FROM information_schema.columns WHERE table_name='morning_weights' AND column_name='updated_at';` returns 1 row; `SELECT tgname FROM pg_trigger WHERE tgname='morning_weights_touch_updated_at';` returns 1 row. |
| 061 | `migrate_061_pin_securitydefiner_search_path.sql` | **HP-1. Applied 2026-06-06 (founder).** Pins `search_path = public` on the last three SECURITY DEFINER functions that never set it: `recompute_daily_intake_rollup(uuid, date)` (migration 015), `clear_goal_lock()` (017), `record_health_consent(boolean, text, text)` (019). Every other SECURITY DEFINER function already pins it. Uses `ALTER FUNCTION ... SET search_path`, so bodies and signatures are unchanged and the RPC contract is identical: the app and the frozen AAB are unaffected. Safe to apply any time; idempotent. | `SELECT proname, proconfig FROM pg_proc WHERE proname IN ('recompute_daily_intake_rollup','clear_goal_lock','record_health_consent');` returns 3 rows, each `proconfig` containing `search_path=public`. |
| 063 | `migrate_063_engagement_telemetry_events.sql` | **LB-8. Applied 2026-06-06 (founder).** Adds `workout_started`, `workout_completed`, `plan_activated` to the `record_engine_telemetry` allow-list (the core activation/retention loop the dashboards were missing). Reproduces the migration 043 list verbatim plus the three names; payloads carry counts/flags only and flow through the LB-9 opt-out gate. Apply before a build that emits them reaches production sync; until then those three pushes are rejected and retried, nothing else affected. Idempotent. | `SELECT pg_get_functiondef('record_engine_telemetry(text,jsonb,timestamptz)'::regprocedure)` contains `workout_started`, `workout_completed` and `plan_activated`. |
| 064 | `migrate_064_cardio_log.sql` | **Cardio integration. Applied 2026-06-06 (founder).** New `cardio_log` table (one row per logged cardio session, PK `(user_id, id)`, soft delete + LWW, RLS own-rows, BEFORE UPDATE touch trigger). Backs user-led cardio logging so cardio survives reinstall and syncs across devices via the `cardio_log` registry entry + `src/lib/sync/tables/cardioLog.js`. `est_kcal` is feedback only. Fully additive; the frozen AAB has no writer or reader. Safe to apply any time; idempotent. **Until this is applied, the `cardio_log` push/pull handlers treat the "table not in schema cache" (PGRST205 / 42P01) response as a benign skip (errors:0), so the missing cloud table does not raise `sync.push.cardio_log.errors` in Sentry or block sign-out (sign-out is push-first and aborts on any errored table). Apply 064 to turn on cardio cloud sync.** Separately, the LOCAL SQLite `cardio_log` schema was first added in the middle of `SCHEMA_MIGRATIONS` instead of appended, so existing installs never created the table; a corrective trailing migration (database.js, 2026-06-03) now creates it on next launch. | `SELECT to_regclass('public.cardio_log');` is non-null; `SELECT tgname FROM pg_trigger WHERE tgname='cardio_log_touch_updated_at';` returns 1 row; an own-row insert succeeds and a cross-user insert is rejected by RLS. |
| 065 | `migrate_065_trial_14_days.sql` | **Trial 21→14 days. Applied 2026-06-06 (founder).** `CREATE OR REPLACE start_cascade` with the in-app cardless reverse-trial window changed from `interval '21 days'` to `interval '14 days'` (founder direction 2026-06-06: 14 cardless days + a 7-day Play intro free trial = 21 days free total). Only the interval changes; signature, return keys and the `tier_history` insert are identical to migration 033. The `cascade_advance_due_users` worker is unchanged (it expires on `pro_trial_ends_at <= now()`, so a 14-day window auto-expires at day 14). Safe during beta: `PRO_BETA_ACTIVE` masks trial_state, so no one loses Pro on the current build. The frozen AAB reads `pro_trial_ends_at` with no hardcoded 21-day break (its paywall string still shows "21 days", cosmetic only). Idempotent; safe to re-run. Rollback = re-apply 033's body. Apply alongside the real Play Billing path + the Play Console 7-day offer. | `SELECT pg_get_functiondef('start_cascade()'::regprocedure)` contains `interval '14 days'` and not `interval '21 days'`. |
| 066 | `migrate_066_users_profile_billing_period.sql` | **Billing period. Applied 2026-06-06 (founder).** Adds nullable `billing_period text` to `users_profile` so the Subscription screen shows the right price for monthly vs annual subscribers (flat pricing, 2026-06-06). The Play RTDN webhook (`play-billing-rtdn`) sets it from the purchased product id (`pro_monthly`→'monthly', `pro_annual`→'annual') via a service-role PATCH; not guarded by the `protect_users_profile_tier` trigger (that guards `tier` only). Client reads it via `refreshTierFromCloud`→`store.billingPeriod`→SubscriptionScreen; NULL shows the monthly price, so the frozen AAB and pre-webhook rows are fine. Additive, idempotent (`ADD COLUMN IF NOT EXISTS`). **Redeploy the play-billing-rtdn edge function after applying so it writes the column.** Rollback = `DROP COLUMN billing_period`. | `SELECT column_name FROM information_schema.columns WHERE table_name='users_profile' AND column_name='billing_period';` returns 1 row. |
| 067 | `migrate_067_upgrade_tier_block_client_pro.sql` | **C-1 self-grant fix. Applied 2026-06-06 (founder).** `CREATE OR REPLACE upgrade_tier` (the authenticated function) so it may only downgrade toward `free`: it now raises on `_target_tier <> 'free'` and on `_reason IN ('user_paid','admin')`. Closes the hole where any signed-in caller could grant itself `paid_pro` with a fabricated `_payment_ref` and no receipt check. Real Pro grants come only from the Google Play RTDN via the service-role `upgrade_tier_for_user` (042) after Play API verification; the trial grant is `start_cascade` (both unchanged). Body is migration 033's verbatim plus the guard. Ships WITH the client change (paid purchase = optimistic local unlock reconciled by the RTDN-written tier: `cascade.payAt` + `store.setOptimisticPaid`). Frozen-AAB safe (it never calls `upgrade_tier('pro')`). Idempotent; safe to re-run. Rollback = re-apply 033's `upgrade_tier`. **Apply alongside deploying play-billing-rtdn, or new purchases won't grant Pro server-side.** | `SELECT upgrade_tier('pro','user_paid',NULL,'x');` raises; `SELECT upgrade_tier('free','user_skip','t',NULL);` succeeds with `tier=free`. |
| 069 | `migrate_069_auth_user_fk_cascade.sql` | **Auth-user FK cascade (account deletion). APPLIED 2026-06-07 (founder).** Deleting a user failed with "Database error deleting user" in the dashboard, and the in-app delete left the auth row behind whenever `delete_user_data` missed a table the account had rows in. Root cause: `users_profile.id` and ~25 other public tables reference `auth.users(id)` with NO `ON DELETE` action (defaults to NO ACTION / RESTRICT), so Postgres refuses to delete the auth row while any child row exists. This migration converts every public FK to `auth.users` that is NO ACTION or RESTRICT to `ON DELETE CASCADE` via a dynamic `DO` block; FKs with `ON DELETE SET NULL` (e.g. `ed_pattern_flags.set_by`) are left alone. After this, deleting the auth user cascades all child rows automatically, so deletion works from the dashboard, the admin API and the Edge Function, and a missing table in `delete_user_data` can never strand an account again. Idempotent (skips FKs already CASCADE); safe to re-run. Rollback = recreate the specific constraints without CASCADE (not advised). No app-code or RLS change. | Verification query in the migration footer must return ZERO rows; then deleting a stuck user from Authentication -> Users succeeds. |
| 068 | `migrate_068_tier_trigger_guc_bypass.sql` | **Tier RPC GUC bypass. APPLIED 2026-06-07 (founder), verification query still to run.** Sentry (prod, 2026-06-06): `permission denied to set parameter "session_replication_role"`. `start_cascade`, `upgrade_tier`, `upgrade_tier_for_user` and `cascade_advance_due_users` all toggled `session_replication_role` (a superuser-only parameter) to bypass the `users_profile_protect_tier` trigger while writing `tier`. On hosted Supabase the function owner is not a superuser, so every one threw and aborted: the 14-day Pro trial never started, so a user tapping "Go Pro" never became Pro and the app routed them to the free first-run screen. This migration makes the trigger also allow a tier change when a transaction-local custom GUC `app.allow_tier_change='on'` is set (dotted-namespace GUCs need no special role), and re-creates all four functions to set that flag instead of `session_replication_role`. Bodies reproduced verbatim from 065/067/042/033 with only the two `set_config` lines swapped; signatures, return shapes, grants and transition logic unchanged. Client direct tier writes are still blocked (a client cannot set the GUC). Idempotent (`CREATE OR REPLACE`); safe to re-run. Rollback = re-apply 065/067/042/033 + setup_complete.sql's trigger (restores the broken state, so only roll back if 068 is wrong). No new app-code dependency; the frozen AAB calls `start_cascade` too and benefits. | As an authenticated user with `trial_state='unstarted'`: `SELECT start_cascade();` returns `tier='pro'` and `SELECT tier,trial_state FROM users_profile WHERE id=auth.uid();` shows `pro`/`pro_trial_active`. Then `UPDATE users_profile SET tier='pro' WHERE id=auth.uid();` followed by a re-select must STILL show `free` (client write blocked). |
| 070 | `migrate_070_protect_trial_columns.sql` | **Protect trial columns (audit C-1). DRAFTED, pending founder apply.** `CREATE OR REPLACE protect_users_profile_tier` so the trigger also reverts client writes to `trial_state`, `trial_started_at`, `pro_trial_ends_at`, `complete_trial_ends_at`, `locked_in_price_tier` (previously only `tier` was guarded), and clamps a client INSERT to a clean unstarted free state. Closes the hole where a user could PATCH their own `pro_trial_ends_at`/`trial_state` via PostgREST for unlimited free Pro (RLS is FOR ALL own-row, migrate_005). Uses the same `app.allow_tier_change` GUC bypass as 068, so the trusted RPCs (start_cascade / upgrade_tier / upgrade_tier_for_user / cascade_advance_due_users) are unaffected, and service role bypasses. Frozen-AAB safe: the shipped client never writes these columns. Idempotent (`CREATE OR REPLACE`); rollback = re-apply 068's trigger body. | As an authenticated user with `trial_state='pro_trial_active'`: `UPDATE users_profile SET pro_trial_ends_at = now() + interval '999 days' WHERE id=auth.uid();` then re-select shows the ORIGINAL end (write reverted); `UPDATE users_profile SET trial_state='unstarted' WHERE id=auth.uid();` then re-select still shows `pro_trial_active`. `SELECT start_cascade();` from a genuinely unstarted account still returns `pro`. |
| 062 | `migrate_062_delete_user_data_post025_tables.sql` | **HP-3. Applied 2026-06-06 (founder).** Extends the `delete_user_data` fallback RPC (last completed in migration 025) to the five user-scoped tables added since: `tier_history` (030), `notification_preferences` (044), `food_frequents` (051), `device_push_tokens` (053), `daily_steps` (056). The primary delete path (Edge Function -> `auth.admin.deleteUser` -> ON DELETE CASCADE) already wiped these; the gap was only the fallback used when the Edge Function is un-deployed. `account_deletions_log` is deliberately NOT wiped (it is the surviving deletion audit trail). Reproduces the 025 body verbatim plus the new section; every delete stays wrapped in `EXCEPTION WHEN undefined_table`. Identical signature, so old builds and the frozen AAB keep working. Safe to apply any time; idempotent. | `SELECT pg_get_functiondef('delete_user_data()'::regprocedure)` contains `tier_history`, `notification_preferences`, `food_frequents`, `device_push_tokens` and `daily_steps`, and still contains `account_deletions_log` nowhere. |

> Migration 049 (`migrate_049_drop_peak_week_plans.sql`) is **drafted but held** — do NOT apply until the next AAB ships, so the frozen closed-test build keeps working against the table. Apply 050 before 049 if 050 is ready first; they're independent.

> Migration 051 is independent of 049/050 and safe to apply any time. Until it's applied, the Frequents tab simply shows its empty state (the `food_frequents_pull` RPC call fails quietly and the cache stays empty); nothing else is affected.

## How to apply

Migrations 037-048 and 050-058 are applied (founder applied the 048,
050-055, 058 set on 2026-06-01). 049 is held until the next AAB ships. This
playbook stands for any future migration; apply in numeric order in the SQL
Editor. After applying 051, `SELECT refresh_food_frequents();` was run once
to seed the cache.

1. Open the Supabase Dashboard → SQL Editor → New query.
2. Open one migration file at a time from this folder in numeric order.
3. Paste the full contents into the SQL Editor.
4. Click **Run**. The migrations are wrapped in `CREATE OR REPLACE
   FUNCTION` / `CREATE TABLE IF NOT EXISTS`, so re-running an
   already-applied migration is a no-op (does not throw).
5. After running, paste the matching verification query (below).
6. If a verification fails, stop and report back before applying
   the next one. Don't skip ahead.

## Verifications

### Verify allow-list extension (works for migrations 037, 038, 040, 041, 043)

After applying each allow-list migration, this query lists every
event the RPC currently accepts. You should see every event the
migration added.

```sql
-- Pull the IN-list from the RPC source.
SELECT pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'record_engine_telemetry';
```

Read the `IF _event NOT IN (...)` block in the returned definition.
The complete expected list after all five migrations (037 through
041) is:

```
ed_pattern_flag_fired, ed_pattern_flag_cleared,
goal_lock_set, goal_lock_cleared,
tier_changed,
cascade_started, cascade_advanced, cascade_skipped_ahead,
paid_converted, churn_at_gate,
food_lookup_barcode, ocr_writeback_attempted,
rapid_loss_compression_triggered,
weekly_coach_run, ffm_floor_hold_fired,
food_logged, food_search_attempt,
paywall_shown, paywall_tapped_cta,
sign_in, sign_out, article9_consent_recorded,
account_created, custom_food_created,
app_cold_start, app_foregrounded, app_backgrounded, sync_run,
cascade_state_transition, purchase_initiated, purchase_completed,
purchase_failed, subscription_cancelled, restore_purchases_attempted,
notification_sent, notification_tapped, notification_failed,
article9_consent_withdrawn,
sync_conflict_resolved
```

39 events total.

### Verify `account_deletions_log` (migration 039)

```sql
-- Table exists with the expected columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'account_deletions_log'
ORDER BY ordinal_position;
```

Expected columns: `id (uuid)`, `user_id (uuid)`, `user_email (text)`,
`initiated_at (timestamptz)`, `completed_at (timestamptz)`,
`reason (text)`, `source (text)`, `app_version (text)`,
`platform (text)`.

```sql
-- RLS is enabled
SELECT relrowsecurity FROM pg_class
WHERE relname = 'account_deletions_log' AND relnamespace = (
  SELECT oid FROM pg_namespace WHERE nspname = 'public'
);
-- Expected: t
```

```sql
-- The two RPCs are service-role only (no GRANT to authenticated)
SELECT p.proname,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_call,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_can_call
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('record_account_deletion_started', 'record_account_deletion_completed');
-- Expected: auth_can_call = f, service_can_call = t
```

### Verify `upgrade_tier_for_user` (migration 042)

```sql
-- Function exists with the expected signature
SELECT pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'upgrade_tier_for_user';
-- Expected: _user_id uuid, _target_tier text, _reason text, _source_surface text, _payment_ref text
```

```sql
-- Service-role only (no GRANT to authenticated/anon)
SELECT has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_call,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_can_call,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_can_call
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'upgrade_tier_for_user';
-- Expected: auth_can_call = f, anon_can_call = f, service_can_call = t
```

### Verify `notification_preferences` (migration 044)

```sql
-- Table exists with the expected columns + composite PK
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notification_preferences'
ORDER BY ordinal_position;
-- Expected: user_id (uuid, NO), category (text, NO), enabled (boolean, NO),
--           time_pref (text, YES), created_at (timestamptz, NO), updated_at (timestamptz, NO)
```

```sql
-- Composite PK on (user_id, category)
SELECT a.attname AS column_name
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'notification_preferences'::regclass AND i.indisprimary
ORDER BY array_position(i.indkey, a.attnum);
-- Expected: user_id, category
```

```sql
-- RLS enabled + four per-operation policies
SELECT relrowsecurity FROM pg_class
WHERE relname = 'notification_preferences' AND relnamespace = (
  SELECT oid FROM pg_namespace WHERE nspname = 'public'
);
-- Expected: t
```

## After all eight are applied

Smoke-test from the live app build:

1. Cold-start the app. Should fire `app_cold_start`. Background the
   app and bring it back to active — should fire
   `app_backgrounded` then `app_foregrounded`.
2. Log a workout, see set fire `food_logged` / lifecycle events
   reach the cloud (drain queue).
3. Settings → Privacy → Withdraw health-data consent. Should
   produce a new row in `consent_log` with `granted = false` AND a
   row in `engine_telemetry` with `event = 'article9_consent_withdrawn'`.
4. Sign in, tap Delete Account, type DELETE, confirm. After ~30s
   check `account_deletions_log` for a row with both `initiated_at`
   and `completed_at` populated.
5. Trigger a sync conflict (edit the same row on two devices, sync
   both). Should produce a row in `engine_telemetry` with
   `event = 'sync_conflict_resolved'` carrying `table`, `record_id`,
   `strategy`, `winner` in the payload.
6. Toggle a category in You → Notifications. Should produce or
   update a row in `notification_preferences` for that
   `(user_id, category)` pair with `enabled = false` / new
   `time_pref`, and the sync indicator should briefly show
   `pending` before going back to `synced`.

If `completed_at` is null after a few minutes for step 4, the
`auth.admin.deleteUser` leg in the Edge Function failed silently
and you'll need to inspect the function logs.

## Re-application safety

All five migrations are additive and idempotent:

- 037, 038, 040, 041 are `CREATE OR REPLACE FUNCTION
  record_engine_telemetry(...)`. The function definition is
  replaced wholesale each time. The most recently applied one
  carries the union of all allow-listed events.
- 039 uses `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT
  EXISTS` + `CREATE OR REPLACE FUNCTION`. Safe to re-run.

If you apply them out of order, the last allow-list migration you
run determines the final allow-list. Apply them in order anyway —
the documentation in each file references the previous ones for
context.

### Verify `users_profile.column_updates_at` (migration 045)

```sql
-- Column exists, jsonb, NOT NULL, default '{}'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users_profile'
  AND column_name = 'column_updates_at';
-- Expected: column_updates_at | jsonb | NO | '{}'::jsonb

-- Safe-merge trigger is installed
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'users_profile'
  AND trigger_name = 'users_profile_merge_column_updates_at';
-- Expected: one row

-- Existing rows defaulted to empty maps (not NULL)
SELECT count(*) FILTER (WHERE column_updates_at IS NULL) AS null_rows,
       count(*) AS total_rows
FROM users_profile;
-- Expected: null_rows = 0
```

Then sanity-check the trigger does the right thing on a touch:

```sql
-- Pick a real user id from auth.users for this. Replace <UID>.
UPDATE users_profile
SET first_name = first_name,
    column_updates_at = '{"first_name": "2026-05-27T00:00:00Z"}'::jsonb
WHERE id = '<UID>';

SELECT column_updates_at FROM users_profile WHERE id = '<UID>';
-- Expected: { "first_name": "2026-05-27T00:00:00Z" } merged with whatever
-- was there before (other keys preserved).
```

If `column_updates_at` does not appear, the migration did not run.
If trigger row is missing, the merge function did not install.
If existing rows still show NULL, the DEFAULT did not back-fill —
re-run the migration (idempotent) and re-check.

### Verify `recipe_ingredients` soft-delete (migration 046)

```sql
-- Both columns present, with the expected types and defaults
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'recipe_ingredients'
  AND column_name IN ('updated_at', 'deleted_at')
ORDER BY column_name;
-- Expected:
--   deleted_at | timestamp with time zone | YES | (null)
--   updated_at | timestamp with time zone | NO  | now()

-- Touch trigger is installed
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'recipe_ingredients'
  AND trigger_name = 'recipe_ingredients_touch_updated_at';
-- Expected: one row

-- Partial live index is installed
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'recipe_ingredients'
  AND indexname = 'idx_recipe_ingredients_live';
-- Expected: one row

-- Every row has a non-NULL updated_at thanks to the DEFAULT now()
-- on column creation.
SELECT count(*) FILTER (WHERE updated_at IS NULL) AS null_rows,
       count(*) AS total_rows
FROM recipe_ingredients;
-- Expected: null_rows = 0
```

If `updated_at` does not appear, the migration did not run. If
trigger row is missing, the touch function did not install. If
any rows show NULL updated_at, the DEFAULT did not land. Re-run
the migration (idempotent) and re-check.

### Verify `body_metrics` + `weekly_checkins_v2` LWW (migration 047)

```sql
-- body_metrics: updated_at + deleted_at present, with expected
-- types + defaults.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'body_metrics'
  AND column_name IN ('updated_at', 'deleted_at')
ORDER BY column_name;
-- Expected:
--   deleted_at | timestamp with time zone | YES | (null)
--   updated_at | timestamp with time zone | NO  | now()

-- weekly_checkins_v2: updated_at only (registry says
-- softDelete:false, so no deleted_at).
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'weekly_checkins_v2'
  AND column_name = 'updated_at';
-- Expected:
--   updated_at | timestamp with time zone | NO  | now()

-- Touch triggers installed on both tables.
SELECT event_object_table, trigger_name
FROM information_schema.triggers
WHERE event_object_table IN ('body_metrics', 'weekly_checkins_v2')
  AND trigger_name IN (
    'body_metrics_touch_updated_at',
    'weekly_checkins_v2_touch_updated_at'
  )
ORDER BY event_object_table;
-- Expected: two rows, one per table.

-- Partial live index on body_metrics for Athlete Hub reads.
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'body_metrics'
  AND indexname = 'idx_body_metrics_live';
-- Expected: one row.

-- Every existing row carries the migration-time DEFAULT now().
SELECT
  (SELECT count(*) FILTER (WHERE updated_at IS NULL) FROM body_metrics)       AS body_metrics_null_updated_at,
  (SELECT count(*) FILTER (WHERE updated_at IS NULL) FROM weekly_checkins_v2) AS weekly_checkins_v2_null_updated_at;
-- Expected: both 0.
```

If either column does not appear, the migration did not run on
that table. If trigger rows are missing, the touch functions did
not install. Re-run (idempotent) and re-check.

### Verify `food_favourites.kind` (migration 048)

```sql
-- Column present with the right type + default
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'food_favourites'
  AND column_name = 'kind';
-- Expected:
--   kind | text | 'fav'::text | NO

-- CHECK constraint installed
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'food_favourites_kind_check';
-- Expected: one row with definition CHECK ((kind = ANY (ARRAY['fav','dislike'])))

-- Every existing row has kind populated (DEFAULT applied)
SELECT count(*) FILTER (WHERE kind IS NULL) AS null_kind_rows,
       count(*) AS total_rows
FROM food_favourites;
-- Expected: null_kind_rows = 0.
```

If the column doesn't appear, the ADD COLUMN didn't run. If the
constraint is missing, the DO block fell through; re-run the
migration (idempotent) and re-check.

### Verify `weekly_checkins_v2.cardio_adherence` (migration 050)

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'weekly_checkins_v2'
  AND column_name = 'cardio_adherence';
-- Expected: cardio_adherence | text | YES
```

If the column is absent, the per-table weekly-checkins push will
reject any row carrying a cardio adherence answer ("column
cardio_adherence does not exist"). Re-run the migration (IF NOT
EXISTS makes it safe) and re-check.

### Verify `food_frequents` (migration 051)

Three checks: the table exists, the cron job is scheduled, and the
worker runs.

```sql
-- 1. Table + RLS.
SELECT relrowsecurity FROM pg_class WHERE relname = 'food_frequents';
-- Expected: t (RLS enabled)

-- 2. Cron job scheduled.
SELECT jobname, schedule FROM cron.job WHERE jobname = 'refresh-food-frequents';
-- Expected: refresh-food-frequents | 10 3 * * *

-- 3. Run the worker once by hand to seed before the first night.
SELECT refresh_food_frequents();
-- Expected: {"rows": <n>, "ran_at": ..., "duration_ms": ...}

-- 4. Spot-check a user's rows (replace the uid).
SELECT food_ref, log_count FROM food_frequents
WHERE user_id = '<uid>' ORDER BY log_count DESC;
```

The client calls `food_frequents_pull()` (returns the caller's rows as
a jsonb array) when the Frequents tab opens and the local cache is
older than 12h. If the migration isn't applied, that RPC 404s, the app
swallows it, and the tab shows "Nothing logged often enough yet." No
other surface is affected.

### Verify daily_water reconcile (migration 052)

```sql
-- 1. Confirm the column is now present.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'daily_water'
ORDER BY ordinal_position;
-- Expected to include: user_id (uuid), entry_date (date), ml (integer), updated_at (timestamptz)

-- 2. Confirm the composite primary key.
SELECT a.attname
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'daily_water'::regclass AND i.indisprimary;
-- Expected: user_id, entry_date
```

After applying, open the app and pull-to-refresh / let it sync. The red
"Sync error" badge should clear (no more `food_sync_push` 42703), and the
Sentry `sync.tables.foodDomain.push` errors should stop.

### Verify `users_profile.diet_preference` (migration 055)

```sql
-- Column present with the right type + default
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users_profile'
  AND column_name = 'diet_preference';
-- Expected:
--   diet_preference | text | 'omnivore'::text
```

If the column doesn't appear, the ADD COLUMN didn't run; re-run the
migration (idempotent) and re-check. Until it's applied, the new
build's profile pull errors on the missing column, so apply this
before the next AAB ships. Existing rows read as 'omnivore' on the
client whether the stored value is the default or NULL.

### Verify daily_steps (migration 056)

After applying, confirm the table, policy, and trigger exist:

```sql
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'daily_steps' ORDER BY ordinal_position;
-- expect: user_id uuid, entry_date date, steps integer,
--         source text, updated_at timestamp with time zone

SELECT polname FROM pg_policies WHERE tablename = 'daily_steps';
-- expect: "Users can manage own steps"

SELECT tgname FROM pg_trigger WHERE tgrelid = 'daily_steps'::regclass
  AND NOT tgisinternal;
-- expect: daily_steps_touch_updated_at
```

If any are missing, re-run the migration (idempotent) and re-check.
Additive and independent, so it can go any time; until it's applied
the new client keeps step data local (per-table push errors are
caught and do not fail the wider sync run).

### Verify peri-workout meal slots (migration 057)

After applying, confirm the relaxed CHECK is in place:

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'food_entries_meal_slot_check';
-- expect the definition to list all six values:
--   CHECK ((meal_slot = ANY (ARRAY['breakfast','lunch','dinner',
--           'snack','preworkout','postworkout'])))

-- A peri-workout insert is now accepted (rolls back, no row kept):
BEGIN;
INSERT INTO food_entries
  (id, user_id, entry_date, meal_slot, food_ref, quantity_g,
   kcal, protein_g, carbs_g, fat_g)
VALUES (gen_random_uuid(), auth.uid(), current_date, 'preworkout',
   'global:test', 100, 0, 0, 0, 0);
ROLLBACK;
-- expect: INSERT 0 1 (no CHECK violation), then ROLLBACK
```

If the constraint still lists only four values, re-run the migration
(idempotent) and re-check. Additive: the four original slots stay
valid, so the frozen AAB keeps syncing; only the two new values need
this applied before they can reach the cloud.

### Verify weekly_checkins_v2.steps_avg (migration 058)

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'weekly_checkins_v2'
  AND column_name = 'steps_avg';
-- Expected: steps_avg | integer | YES
```

If the column is absent, the per-table weekly-checkins push rejects any
row carrying a steps average ("column steps_avg does not exist"). Re-run
the migration (IF NOT EXISTS makes it safe) and re-check. Additive +
nullable, so the frozen AAB is unaffected (its pushes omit the column).

### Verify numbered meal slots (migration 059)

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.food_entries'::regclass
  AND conname = 'food_entries_meal_slot_check';
-- Expected: CHECK ((meal_slot ~ '^(breakfast|lunch|dinner|snack|preworkout|postworkout|meal_[0-9]+)$'::text))
```

Until this is applied, any 'meal_N' entry from a build using the flexible
meal model fails the old fixed-list CHECK on push (caught per-table; the row
stays local, the wider sync run still succeeds). The six legacy values still
match the new pattern, so the frozen AAB is unaffected. DRAFTED, pending
founder apply; ship the app-side flexible-meal change with it, not before.

## Cloud schema drift audit

`supabase/audit_cloud_schema_drift.sql` is a read-only audit query.
Run it any time you suspect the live cloud has diverged from what
the sync handlers expect (the recipe_ingredients.created_at gap
that broke migration 046's first apply was this kind of drift).

How to use:

1. Supabase Dashboard -> SQL Editor -> paste the whole file -> Run.
2. The first result set lists every (table, column) the per-table
   sync handlers depend on, with `status = OK` when present in
   the live cloud and `status = MISSING` when not. MISSING rows
   sort to the top; any MISSING row is a drift that needs a
   migration (or a handler fix if the column was renamed
   client-side).
3. The second result set lists every public table on the cloud
   that is neither in the SYNC_REGISTRY nor on the audit's
   intentional exclusion list (service-role only, telemetry,
   legacy schema). New tables added server-side without a
   client-side handler surface here.

The expected column set is hand-maintained inside the audit file;
when you add a column to a sync handler, add a row to the
matching VALUES section in the audit. CI does not catch this
omission yet; tracked as a follow-up in CURRENT_STATUS § 8 LATER.
