# Notifications (locked)

Push, in-app, and email (where applicable) at v1. Locked 2026-05-23.

## Provider stack

- **Push (mobile):** Expo Push at v1 (free, already wired). Migrate
  to FCM/APNs direct if Expo Push hits limits or reliability drops.
- **In-app:** Custom banner/toast component in `src/components/`.
- **Email:** Not at v1 for client-facing flows (see MASTER 11.1).
  Coach-facing emails from phase 2 launch via Postmark or SendGrid
  free tier.

## Principles

- ED-pattern flag NEVER fires via push or email. Surfaces in-app
  only. Reason: notifying someone about a possible eating disorder
  via push is the harm pattern.
- All push respects a quiet-hours window. Default 22:00 to 07:00
  local; user-configurable in You → Diary preferences.
- One notification per topic per day max. No drip campaigns.
- Every push has a clear unsubscribe path (single tap to disable
  the category).
- Locale-aware timing: notifications fire in user's local time, not
  server time.

## Categories

| Category | Channel | Default | User can disable |
| --- | --- | --- | --- |
| Daily check-in reminder | Push | On | Yes |
| Weekly check-in reminder | Push | On | Yes |
| Cascade gate (day 19, 21) | Push + in-app | On | Push only |
| Subscription payment failure | Push + in-app | On | Push only |
| Subscription about to expire | Push + in-app | On | Push only |
| Sync error (persistent) | In-app only | On | No |
| ED-pattern lockout | In-app only | On | No |
| FFM-floor hold | In-app only | On | No |
| Weekly coach output ready | Push | On | Yes |
| Coach trial ending (coach side, v1.1) | Email | On | No |

## Timing

| Event | Default time | Configurable |
| --- | --- | --- |
| Daily check-in reminder | 19:00 local | Yes |
| Weekly check-in reminder | Sunday 18:00 local | Yes (day + time) |
| Weekly coach output ready | Monday 09:00 local | Time only |
| Cascade day 19 (Pro winding down) | 10:00 local | No |
| Cascade day 21 (auto-downgrade fired) | 10:00 local | No |

Quiet hours always win. If a scheduled push falls inside quiet
hours, it shifts to the next available minute after quiet hours
ends.

## Copy

British English. No jargon-blocklist terms. **Voice (founder direction
2026-06-10): warm, human, welcoming and encouraging — like a good coach, not
a system alert.** No clipped commands or one-word fragments ("Done.", "Do
it."). Greet by first name where we have it (`, {First}` suffix, omitted
cleanly when unknown). Keep within ~80 chars where possible (push truncates),
but a warm, complete sentence beats a terse one that fits.

Source of truth for the shipped strings is `src/lib/notifications/scheduler.js`
+ `trainingReminders.js`; the payment-failure push lives in the
`play-billing-rtdn` / `_shared/appStore.ts` Edge Functions.

### Morning weight (rotates across the week)
```
Title: Good morning{, First}
Body:  Whenever you're ready, hop on the scales and log today's weight.
       (+ gentle variants: "A quiet weigh-in to start the day…", etc.)
```

### Weekly check-in reminder
```
Title: How has your week gone{, First}
Body:  A two-minute check-in is all it takes, and your coach tunes next
       week around it.
```

### Training day reminder
```
Title: Today's a training day
Body:  You've got a session on for today. Enjoy it whenever it suits you.
```

### Cascade day 19 (trial winding down)
```
Title: Your free Pro trial ends in two days
Body:  Hope you've been enjoying it. Have a look at your options whenever
       you're ready.
```

### Cascade day 21 (auto-downgrade fired)
```
Title: You're back on the free plan
Body:  Everything you've logged is safe and waiting. You can go Pro again
       any time.
```

### Subscription payment failure
```
Title: Your payment didn't go through
Body:  No worries, it happens. Update your billing in [the App Store /
       Google Play] to keep your Pro features.
```

### Weekly coach output ready
```
Title: Your coaching for the week is ready
Body:  Have a look at what's changed for you this week, and the thinking
       behind it.
```

### A year of lifts (anniversary)
```
Title: A whole year of lifts
Body:  What a year. Your wrap-up is ready, swipe through it on the
       Progress tab.
```

## Implementation

Files:

```
src/lib/notifications/
├── index.js              -- public API: schedule(), cancel(), getCategories()
├── categories.js         -- the category enum + defaults
├── scheduler.js          -- cron-like scheduling helpers
├── quietHours.js         -- the time-shift rule
└── permissions.js        -- request / status helpers (reuses existing)
```

Database:
- `notification_preferences(user_id, category, enabled, time_pref)`
  table. RLS scoped to user_id. Synced via the registry.

## Behaviour on tier transitions

When a user transitions to `free`, Pro-tier-only categories
(differential paywall reminders, refeed prescriptions in Complete
context) silently disable. No "you lost this notification" message.

When upgrading, they re-enable to their previous user setting (or
default if never set).

## Permissions

Asked once at onboarding screen 11 (locked in
`ONBOARDING_SEQUENCE_LOCKED.md`). If user denies, the app still
works; notifications just go to in-app only.

If user later wants to enable push, You → Notifications has a
"Open system settings" CTA (we can't re-prompt in-app per platform
rules).

## Telemetry

Every push send and tap emits:

```js
{
  event: 'notification_sent' | 'notification_tapped' | 'notification_failed',
  category: 'daily_checkin' | ...,
  scheduled_for: '2026-05-23T19:00:00+01:00',
  delivered_at: '2026-05-23T19:00:05+01:00',
  tapped_at: '2026-05-23T19:02:11+01:00' | null,
  device: 'ios' | 'android',
  expo_status: 'ok' | 'error' | 'DeviceNotRegistered',
}
```

Aggregated daily in `engine_telemetry_daily`:
- Send rate per category
- Open rate per category
- Failure rate
- Quiet-hours-deferred count

## Acceptance check

- Push permission prompt appears on onboarding screen 11.
- A test push fires at 19:00 local on a test device.
- A scheduled push at 23:00 local shifts to 07:00 next day.
- Disabling "Daily check-in reminder" from You → Notifications
  cancels the schedule on next sync.
- Tapping a cascade day-14 push routes to the cascade gate screen.
