# Telemetry, dashboards, alerts (locked)

> **Status (2026-05-24): infrastructure SHIPPED PARTIAL.**
> `src/lib/engineTelemetry.js` provides `track(userId, event,
> payload)` + `flushPendingTelemetry()`. Local SQLite table
> `engine_telemetry` queues events; debounced push ships them via
> the `record_engine_telemetry` RPC in Supabase migration 017.
> Allow-listed event taxonomy enforced client-side AND server-side.
>
> **Currently emitting:** `tier_changed`, `ed_pattern_flag_fired`,
> `ed_pattern_flag_cleared`, `goal_lock_set`, `goal_lock_cleared`.
>
> **Allow-listed but no caller yet** (belong to Move #4 / #5):
> `cascade_started`, `cascade_advanced`, `cascade_skipped_ahead`,
> `paid_converted`, `churn_at_gate`.
>
> **Cohort dashboard:** the `engine_telemetry_daily` view in
> migration 017 aggregates per day, readable directly from
> Supabase Studio. No in-app coach-only dashboard surface yet —
> open question whether one is needed for v1.
>
> Migration 017 needs the founder to apply via Supabase
> Dashboard before any telemetry round-trips to the server.

Every event we emit, every dashboard panel, every alert threshold.
Locked 2026-05-23.

## Event taxonomy

Every event has the shape:

```js
{
  event: string,              // canonical event name (snake_case)
  user_id: uuid | null,       // null only for unauthenticated surfaces
  tier: 'free'|'pro'|'complete'|'pro_trial'|'complete_trial',
  device: 'ios' | 'android',
  app_version: '1.2.0+5',
  timestamp: ISO8601,
  properties: { ... },        // event-specific payload
}
```

Events sent to:
- **Sentry as breadcrumbs** (for crash context)
- **Supabase `engine_telemetry_raw` table** (server-side rollup)

`engine_telemetry_raw` is aggregated nightly into
`engine_telemetry_daily` (per
`DATABASE_SCHEMA_LOCKED.md`). Raw events retained 90 days, then
purged. Daily aggregates retained indefinitely (no PII).

## Event catalogue

### Engine events

```
weekly_coach_run
  properties: {
    user_tier, phase, energy_score, recovery_score,
    flags_fired: [], held_decisions: [],
    adjustment_magnitude_kcal, data_confidence_tier,
    duration_ms
  }

ffm_floor_hold_fired
  properties: { user_tier, ffm_floor_kcal, current_intake_avg_kcal }

ed_pattern_flag_fired
  properties: {
    flag_state, reason, signal_count,
    goal_lock_at_raise, days_to_clear (cleared events only)
  }

rapid_loss_compression_triggered
  properties: { weekly_loss_pct, energy_score, days_compressed }

held_decision_created | held_decision_cleared
  properties: { type, reason, days_held }
```

### Food events

```
food_search_attempt
  properties: { query_len, debounce_ms, source_hit, source_miss }

food_lookup_barcode
  properties: { source_hit, latency_ms, cache_hit }

food_logged
  properties: {
    food_ref_source: 'global'|'custom',
    meal_slot, source_chip, quantity_g
  }

custom_food_created
  properties: { ocr_used: bool, sanity_warning_shown: bool }

ocr_writeback_attempted
  properties: { user_consented: bool, off_response: 'ok'|'fail' }
```

### Sync events

```
sync_run
  properties: {
    status: 'success'|'partial'|'failure',
    duration_ms, triggered_by, pull_count, push_count,
    rejected_count, errored_count, queue_depth_before,
    queue_depth_after
  }

sync_conflict_resolved
  properties: { table, strategy, winner: 'local'|'server' }
```

### Subscription / cascade events

```
cascade_state_transition
  properties: { from_state, to_state, reason, source_surface }

purchase_initiated
  properties: { sku, current_pricing_window }

purchase_completed
  properties: { sku, transaction_id, locked_in_price_tier }

purchase_failed
  properties: { sku, error_code, error_message }

subscription_cancelled
  properties: { reason: 'user_cancelled'|'grace_lapsed'|'refunded' }

restore_purchases_attempted
  properties: { tier_restored: text | null }

paywall_shown
  properties: {
    surface: 'cascade_gate_d14' | 'cascade_gate_d28' |
             'differential_stalled_lift' | ...
    user_pricing_window: 'open_beta' | 'founders' | 'standard',
  }

paywall_tapped_cta
  properties: { surface, cta: 'pay_complete'|'pay_pro'|'skip_free'|'skip_pro' }
```

### Notification events

```
notification_sent | notification_tapped | notification_failed
  properties: { category, scheduled_for, delivered_at,
                tapped_at, expo_status }
```

### Account events

```
account_created | account_deleted | sign_in | sign_out

article9_consent_recorded
  properties: { initial: true | renewed: true }

article9_consent_withdrawn
  properties: { triggered_account_deletion: bool }

goal_lock_set | goal_lock_cleared
  properties: { goal_type }
```

### App lifecycle

```
app_foregrounded | app_backgrounded | app_cold_start
  properties: { duration_ms (for foreground), since_last_open_min }
```

## Dashboards

Hosted on Supabase native (free tier). One workspace,
`Volyume Engine`, with the panels listed below. Built as SQL views
against `engine_telemetry_daily`. No paid analytics tools at v1.

### Panel 1: Active users

- DAU, WAU, MAU as time series
- Split by tier (Free / Pro_trial / Pro / Complete_trial / Complete)
- Cumulative signups
- 7-day retention curve

### Panel 2: Engine health

- `weekly_coach_run` count per day
- p50 / p95 / p99 duration_ms
- Held decisions fired per day, split by type
- FFM-floor hold rate (% of cut users)
- ED-pattern flag firing rate (% of active users)
- Goal-locked users vs total

### Panel 3: Food layer health

- `food_logged` events per day
- Active food loggers (users with >=1 entry that day)
- % of cut users logging on >=4 days/week (rolling 7-day window)
- Source breakdown (% OFF, USDA, CoFID, custom)
- Barcode scan hit rate
- OCR writeback contributions count
- Cumulative custom_foods created

### Panel 4: Sync health

- Sync runs per day
- p50 / p95 sync duration
- Failure rate
- Average queue depth
- Conflict resolution count

### Panel 5: Cascade and conversion

- Funnel: new signup -> Article 9 consent -> first meal logged ->
  first weekly check-in -> first week of engine output
- Cascade transitions per day (sankey-style)
- Conversion rate at day 14 gate
- Conversion rate at day 28 gate
- Trial-to-paid conversion by pricing window
- Lifetime value at 30, 60, 90 days (cohort)
- Differential paywall trigger -> trial start rate
- Differential paywall trigger -> paid conversion rate (28-day)

### Panel 6: Notifications

- Send count per category per day
- Open rate per category
- Failure rate per category
- Quiet-hours-deferred count

### Panel 7: Crash and error health (from Sentry)

- Crash-free session rate (daily)
- Top 5 unresolved issues
- New issues today
- Affected users on top issue

### Panel 8: Privacy and consent

- Article 9 consent rate at signup
- Consent withdrawal -> account deletion completed
- Open account deletion queue depth

## Alert thresholds

All alerts pipe to email (founder) and a future Discord/Slack
webhook. Configurable per channel.

| Alert | Threshold | Severity |
| --- | --- | --- |
| Crash-free session rate below 99.5% | Sustained 1 hour | P1 |
| Sync failure rate above 2% | 24-hour rolling | P2 |
| ED-pattern flag firing rate above 3% of active users | Daily | P1 (false-positive risk) |
| FFM floor hold rate above 8% of cut users | Daily | P2 (threshold miscalibration) |
| Cascade day-14 payment-completion rate below 30% | Weekly | P2 (conversion regression) |
| Cascade day-28 payment-completion rate below 25% | Weekly | P2 |
| Food search latency p95 above 600ms | 1-hour rolling | P3 |
| Barcode scan hit rate below 80% | Daily | P3 |
| Account deletion queue stuck (no progress 48h) | Per-stuck-row | P1 |
| Sentry event volume spike (3x daily average) | Hourly | P1 |
| Notification failure rate above 5% | Daily | P3 |

## Sentry integration

- DSN at runtime (no auth token, per
  `BUDGET_POSTURE_LOCKED.md` and the recent CI fix).
- `beforeSend` hook applies scrub rules from
  `PRIVACY_CONSENT_LOCKED.md`.
- Error ring buffer (200 events) attached to every Sentry event as
  a breadcrumb chain.
- Performance traces sampled at 10% in production, 100% in
  development.
- Release tag matches `app_version`.
- Source-map upload disabled at v1; revisit when symbolication
  becomes worth the build-time and operational cost.

## Feedback pipeline

Existing views:
- `v_feedback_weekly_digest` (Supabase view)
- `v_feedback_error_correlation`

New for the food and cascade work:
- `v_feedback_food_layer`: feedback strings filtered to those
  posted within 7 days of the user's first food log
- `v_feedback_cascade_gates`: feedback posted within 24h of a
  cascade gate appearing

All reviewed weekly by the founder. Any feedback tied to a safety
guardrail (FFM floor, ED-flag, rapid-loss) triaged within 48h.

## Data retention

- Raw events: 90 days, then purged via a scheduled job.
- Daily aggregates: indefinite (no PII).
- Sentry: 90 days on the free tier.
- Notification logs: 30 days.

## Implementation

```
src/lib/telemetry/
├── index.js              -- public API: track(event, properties)
├── events.js             -- canonical event names + payload shapes
├── transport.js          -- batches events, posts to Supabase
└── sentryBridge.js       -- mirrors events as Sentry breadcrumbs

supabase/functions/telemetry-ingest/
└── index.ts              -- validates event shape, inserts row

supabase/migrate_009_telemetry.sql
  engine_telemetry_raw       (90-day TTL)
  daily_aggregation_job      (cron, runs 02:00 UTC)
```

## Acceptance check

- Every event in the catalogue has a corresponding `track()` call
  in the codebase, verified by a test scanning the source.
- Daily aggregation job populates `engine_telemetry_daily` rows
  containing all panel inputs.
- Crash-free session rate dashboard panel shows real Sentry data.
- One synthetic test event for each alert threshold validates the
  notification path end-to-end.
- Sentry events from production contain no scrubbed-pattern fields.
