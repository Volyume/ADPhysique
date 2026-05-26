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

## Pending application order (as of 2026-05-26)

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

## How to apply

1. Open the Supabase Dashboard → SQL Editor → New query.
2. Open one migration file at a time from this folder (numeric
   order: 037, 038, 039, 040, 041, 042, 043, 044, 045, 046).
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
any rows show NULL updated_at, the DEFAULT did not land — re-run
the migration (idempotent) and re-check.
