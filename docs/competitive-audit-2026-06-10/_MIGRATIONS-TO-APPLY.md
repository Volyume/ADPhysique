# Server migrations 072–080 — auto-applied by CI on merge to main

**Correction (2026-06-11):** these do NOT need manual apply. `.github/workflows/
deploy-migrations.yml` auto-applies every `supabase/migrate_*.sql` on merge to
`main` (idempotent tracking table `claude_schema_migrations`; HELD list is only
049/059). So 072–080 apply themselves the moment this branch merges to main —
the founder pastes no SQL ("I do not deploy anything", founder 2026-06-06).

This table is just the record of what merging will apply. All are idempotent /
safe to re-run; each telemetry migration is a `CREATE OR REPLACE` of
`record_engine_telemetry` whose allow-list GROWS (080 already contains every
name from 073–079).

| # | File | What it does | Type | If skipped |
|---|---|---|---|---|
| 072 | `migrate_072_workouts_readiness_columns.sql` | Adds nullable `sleep_quality` + `energy_score` to `workouts` | Schema (additive) | The local SQLite half ships with the app already; the SERVER columns are needed for those fields to sync up. Apply it. |
| 073 | `migrate_073_session_adjustment_telemetry.sql` | Allow-lists `session_adjustment_shown/_reverted` (COMP-015) | Telemetry CHECK | events rejected + re-pushed forever |
| 074 | `migrate_074_methodology_telemetry.sql` | Allow-lists `methodology_opened` (COMP-006) | Telemetry CHECK | as above |
| 075 | `migrate_075_recap_telemetry.sql` | Allow-lists `recap_opened` (COMP-005) | Telemetry CHECK | as above |
| 076 | `migrate_076_first_session_choice_telemetry.sql` | Allow-lists `first_session_choice` (COMP-013) | Telemetry CHECK | as above |
| 077 | `migrate_077_chart_window_telemetry.sql` | Allow-lists `chart_window_changed` (COMP-019-1a) | Telemetry CHECK | as above |
| 078 | `migrate_078_streak_telemetry.sql` | Allow-lists `streak_week_resolved/_milestone_reached/_paused` (COMP-018) | Telemetry CHECK | as above |
| 079 | `migrate_079_cancel_reason_telemetry.sql` | Allow-lists `cancel_reason_captured` (COMP-025-A) | Telemetry CHECK | as above |
| 080 | `migrate_080_step_tdee_telemetry.sql` | Allow-lists `step_tdee_modifier_evaluated` (COMP-026) | Telemetry CHECK | the COMP-026 modifier monitoring event is rejected; the app is otherwise unaffected |

**Shortcut:** applying **072** + **080** covers everything — 080's allow-list
already contains every event name from 073–079 (each migration reproduced the
prior list verbatim and appended). Verify 080's `_event NOT IN (...)` list
contains all the names before relying on the shortcut.

**Nothing here gates the app.** Until applied, the listed telemetry events
no-op server-side (rejected + retried); no user-facing behaviour depends on them.
