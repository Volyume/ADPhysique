# Production readiness (locked)

Recorded 2026-05-23. Three pillars that gate the move sequence going
live: full sync, simulation-grade testing, and observability at 100%.

## 1. Sync model: offline-first, everything synced

Current state: the engine only syncs the data it actively uses
(weekly check-ins, weight). User-generated data outside that path
(notes, photos, sessions, food entries when they land) is not fully
mirrored to Supabase. Locked target:

- **SQLite is the local source of truth.** All writes hit SQLite
  first. UI reads from SQLite. The app is fully usable offline.
- **Every table syncs to Supabase.** No selective sync based on
  "what the engine reads." All user-owned data mirrors to the cloud:
  weekly check-ins, weight history, food entries, sessions, sets,
  notes, photos (binary in Supabase Storage), preferences, tier
  history, ED-pattern flags, held decisions, intake rollups, custom
  foods.
- **Sync triggers:** app foreground, network reconnect, on every
  successful local write (debounced 2s), periodic background sync at
  15-minute intervals when the app is open.
- **Conflict resolution:** last-write-wins per row using a server
  `updated_at` timestamp. Special-category data (ED-pattern flags,
  scoff-positive state) is server-authoritative: client writes are
  rejected if they would clear a server-side flag.
- **Sync queue persistence.** Pending writes survive app restart and
  crashes. Stored in a dedicated `sync_queue` SQLite table.
- **Sync status visible in the UI.** ~~A small indicator shows
  `synced`, `pending`, or `offline`. Tappable for diagnostics, including
  last-sync timestamp and queue depth.~~ **Overridden 2026-05-31 by founder
  direction:** the in-app sync badge was removed from all headers. Sync is
  automatic and failures surface in logs and Sentry, so a permanent status
  pill was noise, and its transient red "error" state (a pull-side blip with
  no pending writes) was alarming. Do not re-add a header badge. If a manual
  resync or status view is ever wanted, put it in Settings, not a header.
- **Multi-device.** Opening Volyume on a second device with the same
  account pulls full history into local SQLite on first run. Subsequent
  device opens do an incremental pull.
- **Selective deletion.** Account deletion wipes both SQLite and
  Supabase. Item-level deletion soft-deletes locally and propagates a
  tombstone row to Supabase, then hard-deletes after 30 days.

Migration: a new `sync` module (or extension of `sync.js`) covers
every table behind a single API: `syncTable(tableName)`. A registry
file lists every syncable table. Adding a new table to the registry
is the only step needed to bring it into the sync flow.

Acceptance check: kill the app on a fresh install, log a week of data
fully offline, reinstall on a second device, sign in. All data
appears within 60 seconds, in order, with correct timestamps.

## 2. Testing and simulation

The engine output is product. Untested engine output is product
liability. Locked bar:

- **Engine simulator.** A test harness in `tests/simulator/` that
  feeds synthetic users (cut, recomp, bulk, RED-S risk, ED-flag
  candidate, rapid-loss, plateau, returning user, new user) through
  the weekly coach and nutrition engine for 12 simulated weeks. Each
  scenario has an expected output trajectory. CI runs all scenarios
  on every PR; any unexpected change fails the build.
- **Property-based tests for engine math.** Adaptive TDEE, FFM floor,
  protein calculation, refeed prescription, held-decision logic.
  Properties: monotonicity (smaller deficit means smaller adjustment),
  bounds (output never below the floor, never above the cap),
  reversibility (held decisions clear cleanly when conditions clear).
- **Snapshot tests for surface copy.** All WHY_LIBRARY keys, every
  conversion-trigger string, every empty-state. Snapshot regressions
  fail the build. Snapshot updates require explicit review.
- **End-to-end cascade flow tests.** Detox or Maestro: cascade
  transitions (day 1 to 14 to 28), hold-at-stage flows, skip-ahead
  flows, payment success, payment failure, account deletion mid-trial.
- **Sync regression tests.** Each table in the sync registry has a
  paired test: offline write -> reconnect -> server contains write.
  Two-device flow: write on device A, read on device B within 60s.
- **Load test on Supabase.** Simulated 1,000 concurrent users
  syncing 30 days of history. Target: P95 sync completion under 8s.
- **ED-pattern flag false-positive harness.** Run 50 synthetic
  physique-competition profiles (aggressive cut, well-supervised,
  high adherence). Flag fires on no more than 5%. Run 50 synthetic
  at-risk profiles. Flag fires on at least 80%.

Existing Jest suite (903 tests, 26 suites) is the floor. New work
must extend it.

## 3. Observability: Sentry and feedback at 100%

Sentry is already wired in the live app. Feedback views exist in
Supabase. Locked bar:

- **Every uncaught exception lands in Sentry with the on-device
  error ring buffer attached.** No silent failures. Promise rejections
  caught at the boundary.
- **Engine output telemetry.** Every weekly coach run emits a
  structured event: user tier, scenario flags fired, held decisions,
  adjustment magnitude, data-confidence tier. Aggregated server-side
  for the engine dashboard.
- **Sync telemetry.** Every sync attempt emits start, end, success,
  failure with reason, queue depth, table list, duration. Sync
  failure rate above 2% triggers an alert.
- **Feedback pipeline operational on schedule.**
  `v_feedback_weekly_digest` and `v_feedback_error_correlation` run
  daily, are reviewed weekly. Any feedback tied to an engine
  guardrail (FFM floor, ED flag, rapid-loss) is triaged within 48
  hours.
- **Alerting thresholds.**
  - Crash-free session rate below 99.5%: alert.
  - Sync failure rate above 2%: alert.
  - ED-pattern flag firing rate above 3% of active users: alert
    (false-positive risk).
  - FFM floor hold rate above 8% of cut users: alert (threshold
    miscalibration risk).
  - Cascade payment-completion rate below 30% at day 14 gate or 25%
    at day 28 gate: alert (conversion regression).
- **Dashboards.** Supabase native or Grafana, doesn't matter, but
  the dashboards must show: active users by tier, daily engine
  outputs by scenario, sync health, ED-flag firing trend, FFM floor
  hold trend, cascade conversion funnel, feedback theme distribution.
- **Data leakage detection.** Sentry filters scrub user weight,
  intake, BF%, photos before send. Quarterly audit confirms scrub
  rules still cover all sensitive fields.

Pre-launch checklist (every box ticked before move #1 ships to
production):

- [ ] Sentry catches synthetic test exception in production build.
- [ ] Error ring buffer survives forced crash and attaches to next
      Sentry event.
- [ ] All sync registry tables present in Supabase with correct RLS.
- [ ] All engine guardrails emit telemetry events.
- [ ] All alerting thresholds wired in Supabase / monitoring stack.
- [ ] Feedback digest review cadence scheduled.
- [ ] Privacy filters scrub-tested on a sample event.
- [ ] Account-deletion path verified to wipe SQLite + Supabase + Storage.

## Why this matters now

Move #1 introduces food logging. That doubles the volume of
user-owned data and adds the first special-category surface (intake
tied to deficit recommendations under UK GDPR Article 9). Shipping
move #1 without full sync, simulation testing, and observability at
100% is exactly the failure mode the FTC HBNR rule was written to
catch. Pillars locked here are pre-conditions for move #1 going live.
