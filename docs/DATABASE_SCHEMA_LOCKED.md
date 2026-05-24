# Database schema (locked)

> **Status (2026-05-24, post audit):**
> - Food domain (Move #1): SHIPPED in `migrate_015_food_logging.sql`
>   and `migrate_016_food_sync_rpcs.sql`. Applied to cloud.
> - Engine domain (Move #2 + #3): SHIPPED in
>   `migrate_017_ed_pattern_and_telemetry.sql`. Includes
>   `ed_pattern_flags`, `engine_telemetry`, `engine_overrides`
>   (groundwork), `clear_goal_lock` RPC, `record_engine_telemetry`
>   RPC, `engine_telemetry_daily` view, `users_profile.goal_lock_advanced`
>   + `users_profile.goal_lock_set_at` columns. Applied to cloud.
> - Identity + ownership refactor: SHIPPED in
>   `migrate_018_composite_pks.sql`. Drops single-column PKs on every
>   user-scoped non-food table and reinstalls them as
>   `(user_id, id)`. Old-app safety triggers populate `user_id` on
>   child tables (`routine_exercises`, `mesocycle_weeks`,
>   `recipe_ingredients`) from the parent on INSERT so the
>   closed-testing build continues to write. Applied to cloud.
> - Article 9 health-data consent (Move #2 deferral): SHIPPED in
>   `migrate_019_health_consent.sql`. Adds
>   `users_profile.health_data_consent` (boolean) +
>   `users_profile.health_data_consent_at` (timestamptz), creates
>   `consent_log` append-only audit table, registers
>   `record_health_consent` RPC. Applied to cloud.
> - Custom exercises split (Move #2 follow-up): SHIPPED in
>   `migrate_020_custom_exercises.sql`. Creates `custom_exercises`
>   with composite PK, backfills any pre-existing user-customs out
>   of the mixed-ownership `exercises` table. Applied to cloud.
> - Food domain composite PKs (deferred from 018): SHIPPED in
>   `migrate_021_food_composite_pks.sql`. Drops simple PKs on
>   `custom_foods`, `food_entries`, `saved_meals`, `recipes`,
>   `recipe_ingredients` and reinstalls them as `(user_id, id)`.
>   Updates `food_sync_push` to `ON CONFLICT (user_id, id)`. Adds
>   `user_id` + old-client trigger to `recipe_ingredients`. Applied
>   to cloud.
> - Move #1.5 food telemetry events (server allow-list): SHIPPED in
>   `migrate_022_food_telemetry_events.sql`. Adds
>   `food_lookup_barcode` and `ocr_writeback_attempted` to the
>   `record_engine_telemetry` allow-list. Applied to cloud.
> - Move #1.5 barcode persistence on custom foods: SHIPPED in
>   `migrate_023_custom_foods_barcode.sql`. Adds
>   `custom_foods.barcode_ean` (nullable) + partial index. Extends
>   `food_sync_push` to write the column. Applied to cloud.
> - consent_log composite PK rectification: SHIPPED in
>   `migrate_024_consent_log_composite_pk.sql`. Brings the consent
>   audit log into IDENTITY_AND_OWNERSHIP_LOCKED.md compliance.
>   Applied to cloud.
> - Tier and subscription domain (Move #5): NOT STARTED.

Every new table, column, index, RLS policy, and RPC function needed to
support moves #0 through #5. Locked 2026-05-23, schema-lock updated
2026-05-24 to reflect migrations 018–024.

All tables use UUID primary keys with `gen_random_uuid()` default and
include `created_at` / `updated_at` timestamptz columns. RLS enabled
on every user-scoped table. Service role bypasses RLS for sync and
admin RPC. Every user-scoped table uses composite `(user_id, id)` PKs
per IDENTITY_AND_OWNERSHIP_LOCKED.md.

## Schema by domain

### Food domain (move #1)

#### `foods`

Canonical food records, shared across all users. Read-only for clients;
writes go through the food sync RPCs from authoritative sources
(OpenFoodFacts, USDA, CoFID) or via the OCR write-back flow (server-
moderated insert).

```
id                  uuid PK
source              text NOT NULL CHECK (source IN ('off','usda','cofid','user_ocr'))
source_id           text                       -- e.g. OFF barcode, USDA fdcId
barcode_ean         text                       -- nullable
name                text NOT NULL
brand               text
serving_g           numeric NOT NULL
serving_label       text                       -- "1 slice", "1 cup", etc.
kcal_100g           numeric NOT NULL
protein_100g        numeric NOT NULL
carbs_100g          numeric NOT NULL
fat_100g            numeric NOT NULL
fibre_100g          numeric
sodium_100g         numeric
sugar_100g          numeric
verified            boolean DEFAULT false       -- true once a coach or moderator confirms
fetched_at          timestamptz                 -- when pulled from upstream
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

Indexes:
- `(barcode_ean)` partial WHERE barcode_ean IS NOT NULL (high-cardinality lookups)
- `(lower(name) text_pattern_ops)` (search)
- `(source, source_id)` UNIQUE
- `(verified, updated_at DESC)` (verified-first ranking)

RLS: SELECT to authenticated. INSERT and UPDATE service-role only.

#### `custom_foods`

User-created food records (typed manually or saved from OCR, or from
a barcode-miss followed by manual fill).

```
id              uuid NOT NULL DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name            text NOT NULL
brand           text
serving_g       numeric NOT NULL
serving_label   text
kcal_100g       numeric NOT NULL
protein_100g    numeric NOT NULL
carbs_100g      numeric NOT NULL
fat_100g        numeric NOT NULL
fibre_100g      numeric
sodium_100g     numeric
sugar_100g      numeric
barcode_ean     text                            -- nullable; populated via Move #1.5 scan-miss flow
photo_url       text                            -- nullable, Supabase Storage path
notes           text
deleted_at      timestamptz                     -- soft delete
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
PRIMARY KEY (user_id, id)
```

Indexes:
- `(user_id, deleted_at) WHERE deleted_at IS NULL`
- `(user_id, lower(name))` (search)
- `(user_id, barcode_ean) WHERE barcode_ean IS NOT NULL` (Move #1.5 scan-miss promotion)

RLS: SELECT, INSERT, UPDATE, DELETE for `auth.uid() = user_id`.

#### `food_entries`

The diary. Every food a user logs creates one row.

```
id              uuid NOT NULL DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
entry_date      date NOT NULL                   -- the day the food is logged for
meal_slot       text NOT NULL CHECK (meal_slot IN ('breakfast','lunch','dinner','snack'))
food_ref        text NOT NULL                   -- 'global:<uuid>' or 'custom:<uuid>'
quantity_g      numeric NOT NULL
kcal            numeric NOT NULL                -- computed at log time, denormalised for fast reads
protein_g       numeric NOT NULL
carbs_g         numeric NOT NULL
fat_g           numeric NOT NULL
fibre_g         numeric
logged_at       timestamptz DEFAULT now()
deleted_at      timestamptz                     -- soft delete
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
PRIMARY KEY (user_id, id)
```

Indexes:
- `(user_id, entry_date, meal_slot) WHERE deleted_at IS NULL`
- `(user_id, logged_at DESC) WHERE deleted_at IS NULL` (recents)

RLS: full CRUD for `auth.uid() = user_id`.

Note: macros are denormalised at log time so changing the underlying
food doesn't retroactively rewrite history.

#### `daily_intake_rollups`

Derived totals for fast engine reads. Maintained by a trigger on
`food_entries`.

```
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
entry_date      date NOT NULL
kcal_total      numeric NOT NULL DEFAULT 0
protein_g       numeric NOT NULL DEFAULT 0
carbs_g         numeric NOT NULL DEFAULT 0
fat_g           numeric NOT NULL DEFAULT 0
fibre_g         numeric
entries_count   int NOT NULL DEFAULT 0
updated_at      timestamptz DEFAULT now()
PRIMARY KEY (user_id, entry_date)
```

Indexes:
- Implicit on PK (sufficient for 7-day rolling reads).

RLS: SELECT, UPDATE for `auth.uid() = user_id`. INSERT via trigger only.

Trigger `food_entries_to_rollup`: on INSERT/UPDATE/DELETE of
`food_entries`, recompute the rollup row for that `(user_id,
entry_date)`. Runs in the same transaction.

#### `saved_meals`

User-created meal templates ("My breakfast", "Pre-workout snack").

```
id              uuid NOT NULL DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name            text NOT NULL
items_json      jsonb NOT NULL                  -- [{food_ref, quantity_g, meal_slot_hint}]
deleted_at      timestamptz
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
PRIMARY KEY (user_id, id)
```

RLS: full CRUD for `auth.uid() = user_id`.

#### `recipes` and `recipe_ingredients`

User recipes with per-ingredient breakdown.

```
recipes
  id              uuid NOT NULL DEFAULT gen_random_uuid()
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  name            text NOT NULL
  total_servings  numeric NOT NULL
  notes           text
  deleted_at      timestamptz
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()
  PRIMARY KEY (user_id, id)

recipe_ingredients
  id              uuid NOT NULL DEFAULT gen_random_uuid()
  user_id         uuid NOT NULL                   -- inherited from parent via trigger for old-app pushes
  recipe_id       uuid NOT NULL                   -- FK to recipes; relationship enforced at app + RLS level
  food_ref        text NOT NULL
  quantity_g      numeric NOT NULL
  order_index     int NOT NULL DEFAULT 0
  created_at      timestamptz DEFAULT now()
  PRIMARY KEY (user_id, id)
```

RLS on `recipes`: full CRUD for `auth.uid() = user_id`. RLS on
`recipe_ingredients`: full CRUD for `auth.uid() = user_id`. The
`recipe_id` FK was dropped in migration 021 to accommodate the
composite-PK swap on `recipes`; integrity is preserved via the
parent's user_id appearing on the child plus RLS.

Old-app safety: a BEFORE INSERT trigger
(`recipe_ingredients_inherit_user_id`) auto-fills `user_id` from the
parent recipe when an old-build client pushes a row without it.

#### `food_favourites`

```
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
food_ref        text NOT NULL
last_used_at    timestamptz NOT NULL DEFAULT now()
PRIMARY KEY (user_id, food_ref)
```

RLS: full CRUD for `auth.uid() = user_id`.

#### `daily_water`

```
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
entry_date      date NOT NULL
ml              int NOT NULL DEFAULT 0
updated_at      timestamptz DEFAULT now()
PRIMARY KEY (user_id, entry_date)
```

RLS: full CRUD for `auth.uid() = user_id`.

### Identity and ownership

The cross-domain refactor that locked composite PKs everywhere. Lives
in `IDENTITY_AND_OWNERSHIP_LOCKED.md`; surfaces here as the migrations
that enforce it (018, 020, 021, 024).

#### `custom_exercises`

Per-user exercise rows. Split out of the legacy `exercises` table in
migration 020 because `exercises` is mixed-ownership (library rows
have `user_id NULL`, user customs had `user_id` set), which blocks
the composite-PK rule (PK columns must be NOT NULL).

```
id                       uuid NOT NULL DEFAULT gen_random_uuid()
user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name                     text NOT NULL
primary_muscle           text
secondary_muscles        jsonb
equipment                text
movement_pattern         text
compound_isolation       text
default_rep_min          integer
default_rep_max          integer
fatigue_cost             integer
stimulus_to_fatigue_ratio integer
subregion                text
exercise_category        text
increment_kg             real
notes                    text
created_at               timestamptz NOT NULL DEFAULT now()
updated_at               timestamptz NOT NULL DEFAULT now()
deleted_at               timestamptz
PRIMARY KEY (user_id, id)
```

Indexes:
- `(user_id, updated_at DESC)`
- `(id)` — bare-id lookups for sync conflict detection
- `(user_id) WHERE deleted_at IS NULL` — active-record scans

RLS: full CRUD for `auth.uid() = user_id`.

Old user-custom rows that lived in `exercises` (i.e. `user_id IS NOT
NULL`) were backfilled into this table in migration 020 with `ON
CONFLICT DO NOTHING`; the originals stay in `exercises` so old-app
references by id continue to resolve.

### Consent and audit

#### `users_profile` consent columns

Migration 019 adds:

```
health_data_consent      boolean                  -- nullable; null = "has not seen consent screen"
health_data_consent_at   timestamptz              -- when the current state was set
```

State is intentionally nullable so the existence of a value, rather
than its truthiness, is the "user has been through the consent
screen" signal. Revoking consent sets `false` and queues account
deletion under Article 17.

#### `consent_log`

Append-only audit trail for every consent grant + revoke. No UPDATE
or DELETE policies; rows leave only when the FK cascade fires on
account delete.

```
id              uuid NOT NULL DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
consent_type    text NOT NULL CHECK (consent_type IN ('health_data', 'marketing', 'analytics'))
granted         boolean NOT NULL
granted_at      timestamptz NOT NULL DEFAULT now()
app_version     text
platform        text
PRIMARY KEY (user_id, id)
```

Indexes:
- `(user_id, granted_at DESC)`
- `(id)` (added in migration 024)

RLS: SELECT for `auth.uid() = user_id`. INSERT for
`auth.uid() = user_id` only via the RPC.

### Engine domain (moves #1, #2)

#### `ed_pattern_flags`

```
id              uuid PK
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
flag_state      text NOT NULL CHECK (flag_state IN ('raised','cleared','manually_cleared'))
reason          text NOT NULL                   -- enum: 'rapid_loss_low_energy', 'sustained_under_adherence', etc.
signals_json    jsonb NOT NULL                  -- snapshot of all signals at firing time
raised_at       timestamptz NOT NULL DEFAULT now()
cleared_at      timestamptz
goal_lock_at_raise  boolean NOT NULL DEFAULT false
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

Indexes:
- `(user_id, raised_at DESC)`
- `(flag_state, raised_at DESC) WHERE flag_state = 'raised'`

RLS: SELECT for `auth.uid() = user_id`. INSERT, UPDATE service-role
only (the engine writes via RPC; clients never write directly).

#### `engine_telemetry_daily`

Aggregate, no PII. Used for dashboards.

```
date                                date PRIMARY KEY
active_users                        int NOT NULL DEFAULT 0
flag_firing_count                   int NOT NULL DEFAULT 0
flag_firing_rate                    numeric NOT NULL DEFAULT 0
false_positive_count                int NOT NULL DEFAULT 0
ffm_floor_hold_count                int NOT NULL DEFAULT 0
ffm_floor_hold_rate                 numeric NOT NULL DEFAULT 0
rapid_loss_compression_count        int NOT NULL DEFAULT 0
goal_locked_users                   int NOT NULL DEFAULT 0
goal_locked_flag_count              int NOT NULL DEFAULT 0
created_at                          timestamptz DEFAULT now()
updated_at                          timestamptz DEFAULT now()
```

RLS: SELECT for service-role only. Dashboard reads use service role.

#### `engine_overrides`

B2B phase 2 groundwork. Schema lives in phase 1 so we don't need a
schema migration when the coach surface ships.

```
id              uuid PK
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
coach_id        uuid                            -- null until phase 2 coach accounts exist
week_start      date NOT NULL
override_field  text NOT NULL                   -- 'target_kcal', 'target_protein_g', 'phase', etc.
original_value  text NOT NULL                   -- stringified original engine output
override_value  text NOT NULL                   -- coach's value
reason          text                            -- free text from coach
created_at      timestamptz DEFAULT now()
expires_at      timestamptz                     -- nullable; null = until cleared
```

Indexes:
- `(user_id, week_start DESC)`
- `(coach_id, created_at DESC) WHERE coach_id IS NOT NULL`

RLS: SELECT for `auth.uid() = user_id` OR `auth.uid() = coach_id`.
INSERT, UPDATE service-role only.

### Tier and subscription domain (move #5)

#### `tier_history`

Audit trail of every tier change.

```
id              uuid PK
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
from_tier       text NOT NULL CHECK (from_tier IN ('free','pro','complete','complete_trial','pro_trial'))
to_tier         text NOT NULL CHECK (to_tier IN ('free','pro','complete','complete_trial','pro_trial'))
reason          text NOT NULL CHECK (reason IN ('auto_downgrade','user_skip','user_paid','user_cancelled','grace_lapsed','admin'))
source_surface  text                            -- 'cascade_day14_gate','cascade_day28_gate','manual_upgrade','revenuecat_webhook'
payment_ref     text                            -- RevenueCat transaction ID where applicable
occurred_at     timestamptz NOT NULL DEFAULT now()
created_at      timestamptz DEFAULT now()
```

Indexes:
- `(user_id, occurred_at DESC)`

RLS: SELECT for `auth.uid() = user_id`. INSERT service-role only.

#### `trial_state` (or extend `users` profile)

Tracks where each user is in the cascade. Stored as columns on the
existing user profile table (no separate table) to avoid double-write
race conditions.

Columns added to existing `profiles` table:

```
trial_state             text NOT NULL DEFAULT 'unstarted'
                        CHECK (trial_state IN (
                          'unstarted',
                          'complete_trial_active',
                          'pro_trial_active',
                          'paid_complete',
                          'paid_pro',
                          'free',
                          'cascade_expired'
                        ))
trial_started_at        timestamptz
complete_trial_ends_at  timestamptz
pro_trial_ends_at       timestamptz
locked_in_price_tier    text                    -- 'open_beta', 'founders', 'standard'
goal_lock_advanced      boolean NOT NULL DEFAULT false
goal_lock_set_at        timestamptz
```

RLS unchanged from existing profile policies.

### Sync domain (move #1)

#### `sync_queue` (client-side SQLite only; not Supabase)

```
id                  integer PK AUTOINCREMENT
table_name          text NOT NULL
operation           text NOT NULL                -- 'insert','update','delete'
record_id           text NOT NULL                -- uuid or composite key as text
payload_json        text NOT NULL                -- the record payload
queued_at           text NOT NULL                -- ISO timestamp
attempt_count       integer NOT NULL DEFAULT 0
last_error          text
```

Lives only in SQLite; never synced. The sync runner reads from this,
attempts the Supabase write, removes on success or backs off on error.

### Body composition (Complete tier surface)

Note: `photo_progress` is client-side SQLite only, not a Supabase
table. Photos stay on-device; OS-level backup (iCloud Photos, Google
Photos) is the user's responsibility. See `BUDGET_POSTURE_LOCKED.md`.

#### `body_composition_log`

```
id              uuid PK
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
measured_at     date NOT NULL
body_fat_pct    numeric
ffm_kg          numeric                         -- derived from BF% and weight if not measured
fm_kg           numeric
source          text                            -- 'manual','dexa','impedance','bodpod'
notes           text
deleted_at      timestamptz
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

Indexes:
- `(user_id, measured_at DESC) WHERE deleted_at IS NULL`

RLS: full CRUD for `auth.uid() = user_id`.

## RPC functions

### `food_sync_pull(last_pulled_at timestamptz) RETURNS jsonb`

Returns changes since `last_pulled_at` for all syncable tables in a
shape the hand-rolled sync engine consumes. Shape:

```json
{
  "timestamp": "2026-05-23T12:00:00Z",
  "changes": {
    "food_entries": {
      "created": [...],
      "updated": [...],
      "deleted": [...]
    },
    ...one entry per syncable table...
  }
}
```

Scoped to `auth.uid()`. Uses `updated_at > last_pulled_at` filter.

### `food_sync_push(changes jsonb) RETURNS jsonb`

Applies inserts/updates/deletes with last-write-wins per record.
Returns the server-side `updated_at` for each affected record so the
client can update its local rows.

Shape mirrors the pull format. Scoped to `auth.uid()`.

### `upgrade_tier(target_tier text, payment_ref text DEFAULT NULL) RETURNS jsonb`

Server-side tier change. Whitelisted to bypass the existing
tier-protect trigger. Writes a `tier_history` row, updates
`profiles.trial_state` and locked-in price, and returns the new state.

Reasons accepted:
- `user_paid` (requires payment_ref)
- `user_skip`
- `user_cancelled`
- `admin` (requires service-role JWT)

### `clear_goal_lock() RETURNS void`

Sets `profiles.goal_lock_advanced = false`. ED-pattern detector
returns to standard sensitivity at the next weekly run. Logs the
clear event for telemetry.

### `record_engine_telemetry(_event text, _payload jsonb, _occurred_at timestamptz DEFAULT now()) RETURNS uuid`

Single entry point for engine telemetry writes from the client.
Allow-listed events (extended in migrations 017 and 022):

```
ed_pattern_flag_fired
ed_pattern_flag_cleared
goal_lock_set
goal_lock_cleared
tier_changed
cascade_started
cascade_advanced
cascade_skipped_ahead
paid_converted
churn_at_gate
food_lookup_barcode          -- Move #1.5
ocr_writeback_attempted      -- Move #1.5
```

Unknown events raise `Unknown engine telemetry event`. Migration 022
drops and recreates the function to handle a pg_proc default-shape
mismatch between migration 017's original and the in-flight variants;
the signature with `_occurred_at DEFAULT now()` is canonical.

### `record_health_consent(_granted boolean, _app_version text DEFAULT NULL, _platform text DEFAULT NULL) RETURNS void`

Single entry point the client calls to record an Article 9 health-data
consent grant or revoke. Updates `users_profile.health_data_consent`
+ `_at` and appends a row to `consent_log` in one transaction. The
client must succeed locally first (AsyncStorage `consent_<uid>`
flag); cloud failure logs the discrepancy but does not block the user
from proceeding past the consent screen, since the local flag is the
gating source of truth.

## Migration files

The schema lands across these migrations, in order. Migration numbers
015 onward because 001-014 are already taken in the live Supabase
project. The locked plan originally numbered the cluster 015-019;
the actual shipping order diverged because the identity refactor
landed mid-flight as 018 and pushed body composition + tier
infrastructure to later slots.

Shipped (in order, all applied to cloud):

- `migrate_015_food_logging.sql` (Move #1): foods, custom_foods,
  food_entries, daily_intake_rollups (with trigger), saved_meals,
  recipes, recipe_ingredients, food_favourites, daily_water.
- `migrate_016_food_sync_rpcs.sql` (Move #1): food_sync_pull,
  food_sync_push. Both scoped to auth.uid() and last-write-wins per
  record by updated_at.
- `migrate_017_ed_pattern_and_telemetry.sql` (Move #2): ed_pattern_flags,
  engine_telemetry, engine_telemetry_daily view, engine_overrides
  (groundwork), record_engine_telemetry RPC, clear_goal_lock RPC,
  users_profile.goal_lock_advanced + goal_lock_set_at columns.
- `migrate_018_composite_pks.sql` (Identity refactor): drops simple
  PKs on every user-scoped non-food table and reinstalls them as
  `(user_id, id)`. Adds user_id + old-client inheritance triggers to
  child tables (routine_exercises, mesocycle_weeks).
- `migrate_019_health_consent.sql` (Move #2 deferral, Article 9):
  users_profile.health_data_consent + _at, consent_log table,
  record_health_consent RPC.
- `migrate_020_custom_exercises.sql` (Identity follow-up): splits
  per-user exercise rows out of the mixed-ownership `exercises`
  table; new `custom_exercises` table with composite PK; idempotent
  backfill from exercises where user_id IS NOT NULL.
- `migrate_021_food_composite_pks.sql` (Identity follow-up, food):
  composite PKs on custom_foods, food_entries, saved_meals, recipes,
  recipe_ingredients; food_sync_push RPC updated to ON CONFLICT
  (user_id, id); recipe_ingredients.user_id + inheritance trigger.
- `migrate_022_food_telemetry_events.sql` (Move #1.5): extends
  record_engine_telemetry allow-list with food_lookup_barcode +
  ocr_writeback_attempted. DROP + CREATE pattern to handle pg_proc
  default mismatches.
- `migrate_023_custom_foods_barcode.sql` (Move #1.5): adds
  custom_foods.barcode_ean + partial index; food_sync_push updated
  to write the column.
- `migrate_024_consent_log_composite_pk.sql` (audit rectification):
  brings consent_log into IDENTITY_AND_OWNERSHIP_LOCKED.md compliance
  with composite PK.

Not yet shipped (per move):

- Tier infrastructure (Move #5): tier_history, profiles column
  additions, upgrade_tier RPC, tier-protect trigger update.
- Body composition (Complete tier surface): body_composition_log.
  `photo_progress` is client-side SQLite only.

`sync_queue` is client-side only; it lives in a SQLite migration
(`src/lib/db/migrations/v24_sync_queue.js` or equivalent).

## Indexes summary

Indexes already named per table. Cross-cutting concerns:

- All `updated_at` columns get default indexes via the sync flow
  hitting them constantly.
- All soft-delete partial indexes WHERE `deleted_at IS NULL` to keep
  active-record scans fast.
- All foreign keys auto-indexed.

## Backwards compatibility

- No existing tables modified except `profiles` (additive columns
  only, all with safe defaults).
- The existing `nutrition_targets` table is untouched. Move #1 reads
  it; never writes.
- The existing `weekly_checkins_v2` is untouched. Move #2's
  ED-pattern detector reads it via the existing engine code path.

## Out of scope at v1

- Multi-tenant data partitioning for B2B agency accounts (phase 2
  v2).
- Read replicas for analytical queries (Supabase managed if needed).
- GraphQL or PostgREST view layer beyond what Supabase ships.

## Acceptance check

- `supabase db reset` followed by all four new migrations runs clean.
- All RLS policies pass the Supabase RLS test suite.
- A user with `auth.uid() = X` can read their own rows in every
  user-scoped table, can read nothing from any other user.
- Service role can read everything.
- The four RPC functions return correct shapes when called from a
  test fixture.
