# Volyume — observability + feedback playbook

What's wired, where the data lands, and how to act on it without
manual collection. This is the doc you read once and then ignore.

**See also:** `HANDOFF.md` section 4.8 (engine telemetry catalogue, 36 events allow-listed, 33 currently emitting) and section 7 (event-to-panel mapping for all 8 dashboard panels). This doc covers the Sentry + feedback layer; the engine telemetry layer is a separate cohort-dashboard pipeline at `src/lib/engineTelemetry.js` + Supabase `engine_telemetry` table.

---

## Where data goes

| Signal | Destination | How to view |
|---|---|---|
| Errors (JS exceptions, unhandled rejections, native crashes) | Sentry (cloud) + on-device ring buffer | Sentry dashboard / Settings → Debug logs |
| Warnings (recoverable issues, "this shouldn't happen but we coped") | Sentry (warning level) + ring buffer | Sentry "Issues" with level:warning |
| Breadcrumbs (store actions, navigation, Supabase queries, screen views) | Sentry (attached to next event) + ring buffer | Sentry issue detail → Breadcrumbs panel |
| Performance traces (slow paths) | Sentry (sampled 10% prod / 100% dev) | Sentry → Performance tab |
| Engine telemetry events (sign_in, weekly_coach_run, paywall_shown, etc.) | Supabase `engine_telemetry` table + daily rollup view | Supabase Studio → SQL queries against `engine_telemetry_daily` (per `TELEMETRY_DASHBOARDS_LOCKED.md` Panels 1-8) |
| Account deletion audit | Supabase `account_deletions_log` table | Same. NON-cascading; survives auth.users delete. Drives Panel 8 queue-depth alert. |
| User feedback (sentiment + optional message) | Supabase `user_feedback` table | Supabase SQL Editor + two views |

---

## One-time setup

1. **Sentry account** — sign up at sentry.io, create a React Native project, copy the DSN.
2. **EAS secret** — `eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://..."`. The SDK no-ops without a DSN.
3. **Apply `supabase/migrate_013_user_feedback.sql`** in the Supabase SQL Editor. Creates the table, RLS, and two views.

That's the entire ongoing setup. The rest is automatic.

---

## Daily / weekly cadence

### Once a week — feedback digest

Open Supabase SQL Editor, paste:

```sql
SELECT * FROM v_feedback_weekly_digest LIMIT 50;
```

Returns one row per `(sentiment, screen, app_version, platform)` bucket
ordered by count. Scan top to bottom — the patterns reveal themselves:

- A row reading `confusing · WorkoutSummary · v1.1 · android · cnt=14` means
  14 users in v1.1 found the WorkoutSummary screen confusing. Skim
  `sample_messages` for specifics.
- A row reading `buggy · ActiveWorkout · cnt=8` with high `cnt_with_error`
  means those reports came with a JS error attached — jump to Sentry and
  filter `scope:store.startRestTimer` or whatever the error fingerprint is.

### When investigating a Sentry issue

Open the issue → Breadcrumbs panel shows the last ~100 actions /
navigations / Supabase queries leading up to the crash. The session id
(top of the event) lets you find every other event from the same user
session via `session_id:<id>` in Sentry's search.

To correlate with feedback, run:

```sql
SELECT * FROM v_feedback_error_correlation
WHERE error_message ILIKE '%<keyword>%'
ORDER BY cnt_reports DESC;
```

Shows every feedback row that had a recent error matching the keyword,
grouped by error fingerprint × screen × version. Tells you "this Sentry
issue affected N users, here's how they described it".

---

## What's auto-instrumented

You don't need to add log calls for any of this — every call site is
already covered:

| Surface | What gets logged |
|---|---|
| **Every zustand action** | `store.<actionName>` breadcrumb with duration. Errors auto-captured. |
| **Every navigation** | `screen.<RouteName>` breadcrumb. The active screen is also tagged on every subsequent event. |
| **Every Supabase query** | `db.<op>` breadcrumb tagged with table + duration + hasError. |
| **Every screen mount** | Performance transaction (sampled). Slow mounts surface in Sentry → Performance. |
| **Every uncaught error / promise rejection** | Captured as a Sentry issue. |
| **Every native crash** | Sentry's native SDK captures + symbolicates. |

To add **manual** breadcrumbs / events at custom points:

```js
import { audit, track } from '../lib/observability';

// User-action breadcrumb (the common case). Shorthand for
// track.userAction. Lands as a `user`-category breadcrumb in
// Sentry and a row in the on-device debug log. PII-scrubbed by
// the existing redactPII layer.
audit('workout.set.logged', { exerciseId, setType, isWorking });
audit('food.add',           { source, mealSlot });
audit('paywall.upgrade.tap',{ surface, target: 'pro' });

// Lower-level helpers — only when audit() doesn't fit:
track.breadcrumb('plan.generated', 'coach', { goal: 'lean_gain' });
track.event('plan.activated', { planId });
track.error(err, 'sync.something', { extra });

// For perf timing:
const finish = track.transaction('myExpensiveOp');
await doIt();
finish();   // logs duration
```

All four methods auto-enrich with session id, build version, screen,
user id. PII redaction is automatic — see redactPII for the key list.

### `audit()` call-site inventory (as of 2026-05-26)

23 call sites wired across the highest-value boundaries:

| Area | Events |
|---|---|
| Workout | `workout.set.logged`, `workout.exercise.next`, `workout.start.tap`, `workout.finish.tap` |
| Food | `food.add`, `food.delete`, `food.barcode.scan`, `food.barcode.resolved`, `food.custom.create` |
| Auth | `auth.signin.attempt` (email + OAuth), `auth.signup.attempt`, `auth.signout.tap` |
| Privacy / account | `consent.article9.continue.tap`, `consent.article9.withdraw.tap`, `account.delete.tap`, `account.delete.confirm` |
| Payments / cascade | `paywall.upgrade.tap`, `paywall.dismiss.tap`, `cascade.pay.tap`, `cascade.skip.tap`, `subscription.upgrade.tap`, `subscription.restore.tap` |
| Engagement | `checkin.weekly.submit` |

Naming convention: `<area>.<action>` dot-delimited. Don't pass
tokens, passwords, raw email, weight values, or kcal — the
redactPII layer would strip them anyway but it's better to not
include them in the first place.

---

## What gets stripped before leaving the device

`src/lib/observability/sentryScrub.js` is the authoritative scrub
module (per `PRIVACY_CONSENT_LOCKED.md` line 282). 110 audit tests
assert the scrub list matches the schema. `src/lib/sentry.js` calls
`scrubSentryEvent` from the `beforeSend` hook so every outbound event
passes the same filter.

Keys redacted (recursively, at any depth):

`email`, `firstName`, `lastName`, `fullName`, `dateOfBirth`,
`weightKg`, `bodyWeight`, `heightCm`, `bodyFatPercent`, `phone`,
`address`, every body-measurement key (`waistCm`, `chestCm`,
`hipsCm`, `thighCm`, `quads`, `hamCm`, `hamstrings`, `calfCm`,
`calves`, `armCm`, `arms`, `shouldersCm`, `shoulders`, `forearmCm`,
`forearms`), plus per-table fields the schema audit derives from
`DATABASE_SCHEMA_LOCKED.md`.

The shape is preserved — a redacted email shows as `"[redacted]"`
not as a missing key — so log readers can tell "the email field was
present, just stripped" vs "the email field never existed".

Sentry's `event.user` is reduced to `{ id }` only. Email never ships
even though Sentry's own PII controls would already drop it server-
side; defence in depth.

To explicitly INCLUDE sensitive data in a one-off debug session, pass
`{ allowPII: true }` to the track method:

```js
track.error(err, 'scope', extra, { allowPII: true });
```

---

## User-facing feedback flow

Three triggers, all routed to the same sheet (`FeedbackSheet`) and the
same submission helper (`feedback.submitFeedback`):

| Trigger | When | Suppression |
|---|---|---|
| `contextual` | After workout session 1, after session 10, after first plan generated | 14 days per trigger key |
| `shake` | Vigorous device shake (3 samples > 2.5g) | 30 seconds between opens |
| `settings` | Settings → Send feedback | None (user-initiated) |
| `crash_recovery` | Toast action button after prior-session crash | One shot per crash event |

Every submission auto-attaches:

- session id, app version, build number, platform, commit SHA
- current screen + last 10 screens + last 20 store actions
- most recent error from the last 60 seconds, if any
- low-cardinality tags for grouping (`v1.1`, `screen:WorkoutSummary`,
  `recent_error`, `platform:android`)

Offline submissions (no cloud session at the time) are queued in
AsyncStorage and shipped on next foreground via `flushPendingFeedback`.

---

## Architecture in one diagram

```
                  ┌─────────────────────────────────────────┐
                  │            App.js (entry)               │
                  │   ┌──────────────────────────────────┐  │
                  │   │   installGlobalHandlers()        │  │
                  │   │   bootObservability()            │  │
                  │   │   initSentry()                   │  │
                  │   └──────────────────────────────────┘  │
                  └────────────┬────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
   ┌────────▼────────┐ ┌──────▼───────┐  ┌──────▼─────────┐
   │  observability  │ │   errorLog   │  │     sentry     │
   │   .js (entry)   │ │ ring buffer  │  │  SDK (cloud)   │
   └────────┬────────┘ └──────┬───────┘  └──────┬─────────┘
            │                  │                  │
            │           Settings → Debug          │
            │             logs (user)             │
            │                                     │
   ┌────────▼─────────────────────────────────────▼─────────┐
   │ Auto-instrumentation (one-shot at app boot)            │
   │  • useAppStore → instrumentStore                        │
   │  • NavigationContainer.onReady → instrumentNavigation   │
   │  • getSupabaseClient → instrumentSupabase               │
   └─────────────────────────────────────────────────────────┘

User feedback:
   FeedbackProvider mounted at root
     └─ useFeedback() hook from any screen
        └─ feedback.submitFeedback (auto-attaches context)
           └─ Supabase user_feedback table
              └─ v_feedback_weekly_digest VIEW (you read once a week)
              └─ v_feedback_error_correlation VIEW (joins to error msgs)
```
