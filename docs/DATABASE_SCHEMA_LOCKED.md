# Database schema (locked)

Every new table, column, index, RLS policy, and RPC function needed to
support moves #0 through #5. Locked 2026-05-23.

All tables use UUID primary keys (`uuid_generate_v4()` default) and
include `created_at` / `updated_at` timestamptz columns with triggers
populating them. RLS enabled on every user-scoped table. Service role
bypasses RLS for sync and admin RPC.

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

User-created food records (typed manually or saved from OCR).

```
id              uuid PK
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
photo_url       text                            -- nullable, Supabase Storage path
notes           text
deleted_at      timestamptz                     -- soft delete
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

Indexes:
- `(user_id, deleted_at) WHERE deleted_at IS NULL`
- `(user_id, lower(name))` (search)

RLS: SELECT, INSERT, UPDATE, DELETE for `auth.uid() = user_id`.

#### `food_entries`

The diary. Every food a user logs creates one row.

```
id              uuid PK
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
id              uuid PK
user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name            text NOT NULL
items_json      jsonb NOT NULL                  -- [{food_ref, quantity_g, meal_slot_hint}]
deleted_at      timestamptz
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

RLS: full CRUD for `auth.uid() = user_id`.

#### `recipes` and `recipe_ingredients`

User recipes with per-ingredient breakdown.

```
recipes
  id              uuid PK
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  name            text NOT NULL
  total_servings  numeric NOT NULL
  notes           text
  deleted_at      timestamptz
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

recipe_ingredients
  id              uuid PK
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE
  food_ref        text NOT NULL
  quantity_g      numeric NOT NULL
  order_index     int NOT NULL DEFAULT 0
  created_at      timestamptz DEFAULT now()
```

RLS on `recipes`: full CRUD for `auth.uid() = user_id`. RLS on
`recipe_ingredients`: full CRUD where parent recipe `user_id` matches
`auth.uid()`.

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

### `record_engine_telemetry(run_date date, metrics jsonb) RETURNS void`

Service-role only. Used by the scheduled engine runner to write daily
aggregates to `engine_telemetry_daily`.

## Migration files

The schema lands across these migrations, in order:

- `supabase/migrate_005_food_logging.sql`: foods, custom_foods,
  food_entries, daily_intake_rollups, saved_meals, recipes,
  recipe_ingredients, food_favourites, daily_water. Plus food_sync RPCs.
- `supabase/migrate_006_ed_pattern_and_engine_telemetry.sql`:
  ed_pattern_flags, engine_telemetry_daily, engine_overrides
  (groundwork), record_engine_telemetry RPC, clear_goal_lock RPC.
- `supabase/migrate_007_tier_infrastructure.sql`: tier_history,
  profiles column additions, upgrade_tier RPC, tier-protect trigger
  update to whitelist upgrade_tier.
- `supabase/migrate_008_body_composition.sql`: body_composition_log
  only. `photo_progress` is client-side SQLite, added in a SQLite
  migration (`src/lib/db/migrations/v25_photo_progress.js`).

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
