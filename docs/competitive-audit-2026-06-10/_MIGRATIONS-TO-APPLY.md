# Server migrations pending manual apply (072–080)

Per `docs/rules/supabase.md`, Claude never runs anything against the database —
the founder applies. This is the consolidated checklist for the migrations that
accrued across the build sessions. **Apply against STAGING first**, verify, then
production (production requires the explicit phrase "run against production").

Apply **in numeric order**. Each telemetry migration is a `CREATE OR REPLACE` of
`record_engine_telemetry` whose allow-list GROWS — so applying the latest
(`080`) alone is sufficient for the telemetry allow-list, but apply the
non-telemetry ones (072) regardless. All are idempotent / safe to re-run.

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
| 080 | `migrate_080_step_tdee_telemetry.sql` | Allow-lists `step_tdee_modifier_evaluated` (COMP-026) | Telemetry CHECK (**STAGING only** until reviewed) | the COMP-026 modifier monitoring event is rejected; the app is otherwise unaffected |

**Shortcut:** applying **072** + **080** covers everything — 080's allow-list
already contains every event name from 073–079 (each migration reproduced the
prior list verbatim and appended). Verify 080's `_event NOT IN (...)` list
contains all the names before relying on the shortcut.

**Nothing here gates the app.** Until applied, the listed telemetry events
no-op server-side (rejected + retried); no user-facing behaviour depends on them.
