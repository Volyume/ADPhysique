# S6 — day-14 activation instrumentation — BUILD SPEC (execute-only)

**Status:** researched on Opus (read-only), ready to BUILD ON FABLE. Founder
chose "flip to Fable, then build S6" (2026-07-03). This spec exists so the
Fable window is spent on the safety/GDPR decision + the small build, not on
research. Nothing here is committed as code yet — this is the plan.

**Why Fable:** S6's core is the telemetry allow-list + a cloud migration. The
Article 9 rule is "no health values ever reach telemetry"; a leak there is the
highest-cost mistake in the backlog. It passes tests while being wrong, so it
needs top-tier judgement, not Opus.

---

## The research finding that reframes S6

The activation + 90s benchmark are, on inspection, **largely already
instrumented**. All of these events are live, non-deferred, in the client
allow-list (`src/lib/telemetry/events.js`) AND the server CHECK
(`supabase/migrate_099_funnel_telemetry.sql`), and every emitter runs through
the same opt-out gate:

- `account_created` (Panel 8) — carries `occurred_at`; the install/first-run
  moment. (Server-side install date. On-device equivalent:
  `session.user.created_at`, read in `RootNavigator.js` ~line 1015.)
- `workout_started` (Panel 1) — fires each session start.
- `workout_completed` (Panel 1) — fires each completed session.
- `first_workout_logged` (Panel 1) — durable once-per-user via `trackFirst`
  (`src/lib/telemetry/firsts.js`), backed by AsyncStorage.
- `first_food_logged`, `first_plan_generated`, `onboarding_step_completed`,
  `trial_lapse_day1_return` — the E7.2 funnel (migrate_099).

From these raw rows a dashboard can already derive, per user, with **no client
change and no migration**:

- **Sessions in first 14 days** =
  `count(workout_completed WHERE occurred_at <= account_created.occurred_at + interval '14 days')`.
  Bucket against the <3-sessions = 3–4× churn threshold (the S6 research
  number).
- **Install-to-first-set latency (90s benchmark)** =
  `min(workout_started.occurred_at) − account_created.occurred_at` per user
  (session-start is the closest proxy to "first set"; there is no
  `first_set_logged` event). `first_workout_logged − account_created` gives
  install-to-first-*completed*-workout as a second, stricter cut.

**Implication:** the safest, cheapest S6 is a documented dashboard derivation,
not new code. The safest new telemetry event is no new event.

---

## The Fable decision (make this first, with fresh eyes)

### Option A — derive, no new event (RECOMMENDED, zero leak surface)
- No client code, no allow-list entry, no migration.
- Deliverable: a short `docs/audit/` note (or a section in
  `TELEMETRY_DASHBOARDS_LOCKED.md`) recording the two derivations above as the
  standing dashboard queries, and adopting **90s install-to-first-set** as the
  documented activation benchmark.
- Optional guard test: a source-scan JS test asserting `account_created`,
  `workout_started`, `workout_completed` stay non-deferred in `events.js` (so a
  future edit can't silently drop the rows the derivation depends on). The
  existing `allowlistDrift.test.js` already pins their server allow-listing.
- Honours opt-out automatically (existing events already gate on `_enabled`).

### Option B — one derived event (only if an in-app reaction or a
pre-computed flag is wanted)
If the founder wants the activation verdict available in-app (e.g. to trigger a
future nudge) or a pre-bucketed flag so the dashboard needs no windowed join,
add exactly one event. Counts/flags/small enums ONLY — never a weight, a
calorie, a food name, a step count, or any body value.

Proposed shape:
- **Name:** `activation_window_resolved` (Panel 1).
- **Payload:** `{ sessions: <int count in first 14d>, activated: <bool,
  sessions >= 3>, days_to_first_session: <small bucket enum, e.g.
  '0'|'1'|'2-3'|'4-7'|'8-14'|'none'> }`. No timestamps of body events, no
  health values.
- **Fire:** once per user at the 14-day mark (or on the first app-open after
  install + 14 days), durably via `trackFirst(userId,
  'activation_window_resolved', payload)` so it can't double-count.
- **Wiring checklist (all required together, or the drift guard + server
  reject fail):**
  1. Add the entry to `TELEMETRY_EVENTS` in `src/lib/telemetry/events.js`
     (`deferred: false`, `panel: 1`) with a comment block naming the exact
     payload keys and the "counts/flags only" rule, and citing the new
     migration.
  2. New **additive** migration `supabase/migrate_101_activation_telemetry.sql`
     (next free number — CONFIRM the highest existing migrate_NNN before
     writing; 100 is Wave 5 partners). `CREATE OR REPLACE FUNCTION
     record_engine_telemetry` reproducing the migrate_099 CHECK list **verbatim**
     plus `'activation_window_resolved'`. Header: purpose, applied-locally NO /
     applied-remotely NO (founder-applied manually), safe-to-re-run YES
     (CREATE OR REPLACE), rollback = re-apply migrate_099. Note it must be
     applied BEFORE a client build emitting the event, else pushes are rejected
     and retried (nothing else breaks).
  3. Emitter: a single site that computes the count once at the window close.
     Compute from local data (completed workouts since install) — do NOT send
     the raw session rows, only the derived counts/flags/bucket.
  4. Opt-out: inherited free via `trackFirst` -> `track` -> `postEvent`
     (`_enabled` gate). No extra work, but assert it in a test.
  5. Tests: (a) payload carries only the allow-listed keys and no numeric body
     values; (b) fires at most once per user; (c) suppressed when telemetry is
     disabled; (d) `allowlistDrift.test.js` passes (server migration lists the
     name). Header comment explains what each pins.

**Recommendation:** Option A unless the founder states a concrete in-app use
for the verdict. The handover's earlier "add ONE derived event" wording
predates noticing the derivation path; do not treat it as a mandate to emit.

---

## Guardrails for whichever option (do not violate)
- NO health values in any payload: no weight, calories, macros, food names,
  step counts, body measurements. Counts / booleans / small coded enums only.
- Route through `trackFirst`/`track` so the LB-9 opt-out and the dual
  allow-list both apply. Never call the Supabase RPC directly.
- Additive + idempotent migration, founder-applied manually (never
  auto-applied; deploy-migrations workflow is retired, E0).
- British English, no em dash, in any user-facing or doc copy.

## Verify before declaring done
`npm run lint` (0 errors), `npx tsc --noEmit`, `npm run check:imports`,
`npx jest --runInBand` (the release gate — the only run that catches stray
timers/handles). Then update this file's status and the Wave A status doc.
