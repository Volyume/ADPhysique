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
Body (plan known):  Your {Plan} plan has a session on today. Enjoy it
                    whenever it suits you.
Body (fallback):    You've got a session on for today. Enjoy it whenever
                    it suits you.
```
The body names the active PLAN by its stored name verbatim (matching
`src/lib/planDisplay.js`), never a specific routine: plans rotate round-robin
(decision D5), so a weekly repeating notification cannot know which routine
will be next on a future date. The plan-agnostic fallback is used when no plan
is active, the name can't be resolved, or the name is too long to fit the tray
copy without truncation. The body is (re)resolved whenever reminders are
scheduled and refreshed on plan activation (`buildTrainingReminderBody` /
`scheduleTrainingReminders` in `trainingReminders.js`, hook in
`database.activatePlanWithBlock`). Title unchanged. Added 2026-07-03 (Wave A
C12).

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

---

## PROPOSED ADDENDUM — push budget reconciliation (2026-06-12)

**Status: PROPOSED, not yet locked. Founder reviews at PR** (deep-audit
decision 5, `_FOUNDER-DECISIONS-2026-06-12.md`; gap G6 in the
competitive audit). The locked body above predates several shipped
push types; this section reconciles the full inventory and adds a
global budget. New pushes ship only within this budget.

### Full push inventory

| Push | Category (code) | Class | Trigger | Frequency cap |
| --- | --- | --- | --- | --- |
| Morning weight | `morning_weight` | Habit | Recurring, every morning at the user's hour (default 07:00) | 1 per day |
| Training day reminder | `training_reminder` | Habit | Recurring on the user's chosen training days (default 08:00) | 1 per day |
| Weekly check-in reminder | `weekly_checkin_reminder` | Habit | One-shot per week on the user's check-in day; skipped when already checked in | 1 per week |
| Trial day-3 moment | `trial_day3` | Event | Trial start + 3 days, 10:00 | Once per trial |
| Cascade gate, trial winding down | `cascade_gate` | Event | Trial end minus 2 days (day 12 of 14), 10:00 | Once per trial |
| Cascade gate, downgrade fired | `cascade_gate` | Event | Trial end day (day 14), 10:00 | Once per trial |
| Weekly coach output ready | `weekly_coach_ready` | Event | Laid at check-in submit; next Monday 09:00 | 1 per week |
| Monthly recap | `monthly_recap` | Event | First qualifying app open of the new month | 1 per month |
| Year of lifts | `year_of_lifts_unlock` | Event | 365 days since first workout | Once ever |
| Win-back | `winback` | Event | Lapse + 30 days (or stated return window); 180-day floor across episodes | 1 per churn episode |
| Partner cheer | `partner_cheer` | Event | Partner sends a cheer; in-app toast when foregrounded | 1 per topic per day (locked principle) |
| Missed check-in, same evening (NEW, OPP-C03) | `checkin_missed` | Event | 20:00 local on a missed check-in day (Pro only) | 1 per missed episode |
| Missed check-in, value follow-up (NEW, OPP-C03) | `checkin_missed` | Event | Check-in time + 48 hours, same episode (Pro only) | 1 per missed episode |
| Payment failure | `subscription_payment_failure` | Transactional | Server push from the Play Billing RTDN webhook | Per store event |
| Subscription expiring | `subscription_expiring` | Transactional | Server push | Per store event |

No streak-milestone push exists at v1 (streaks surface in-app only).
ED-pattern lockout, FFM-floor hold and sync errors remain in-app only,
never push, as locked above. Safety and consent surfaces never use
push, full stop.

### Global cap

- **At most 2 event-class pushes per day, and at most 8 per week.**
- Habit reminders (morning weight, training day, weekly check-in) sit
  outside the event cap: the user schedules them, each is capped at
  one per day (check-in one per week), and each self-suppresses at
  delivery once the action is already done. Counting them inside the
  event cap would mean a user training five days a week could almost
  never receive any event push, including the trial-end gate.
- Transactional pushes (payment failure, expiring) are server-sent
  store-state notices and are exempt; they cannot be locally budgeted.
- The cap is enforced on the pending local schedule by
  `src/lib/notifications/budget.js`; every event push must request a
  slot through it before scheduling.

### Collision priority (highest first)

1. `cascade_gate`
2. `weekly_coach_ready`
3. `checkin_missed`
4. `trial_day3`
5. `winback`
6. `year_of_lifts_unlock`
7. `monthly_recap`
8. `partner_cheer`

**Collision rule:** when a day (or week) is at cap, higher priority
wins. An incoming push that outranks the lowest-priority push already
laid for that day takes its slot and the loser is dropped, not queued
to a worse day. An incoming push that does not outrank anything is
itself dropped. Equal priority never evicts. Drops and evictions are
recorded as `notification_failed` with reason `budget_capped` /
`budget_evicted` (existing event name, no new telemetry events).

### Global suppression rules (unchanged, restated)

- An open ED/wellbeing flag suppresses every event push at schedule
  time, and at delivery where the app is foregrounded. Silence is the
  respectful behaviour. The flag itself never fires via push.
- Quiet hours always win, as locked above.
- One notification per topic per day, as locked above.
- Every user-facing category keeps a disable path. The new
  `checkin_missed` category has a toggle in Settings → Coaching
  reminders (default on, Pro only).

### Missed check-in copy (NEW, OPP-C03)

Shame copy is banned: "you missed" never appears. Both pushes are
single-shot per missed episode, ED-flag suppressed, quiet-hours
shifted and budget-gated.

```
Same evening (20:00 local on the check-in day)
Title: Your check-in is ready when you are{, First}
Body:  Your check-in data is ready to review. It takes about two
       minutes.

+48 hours (value-led, from data the engine already has)
Title: Your weekly trend is ready{, First}
Body:  Tap to see how the week compares, whenever suits you.
```

## Addendum: rest-finished alert (founder decision 2026-07-01, Wave 1 A2)

A new local notification, `rest_end`, fires once when an active rest timer
reaches zero (`src/lib/notifications/restEnd.js`, channel `rest-alerts`,
HIGH + sound on Android; a plain scheduled alert on iOS).

Recorded deviations from the rules above, accepted by the founder:

- **Quiet hours do not apply.** The user started this rest seconds earlier,
  mid-session; shifting or dropping the alert would recreate the silent-rest
  bug it exists to fix. It can only ever fire within a couple of minutes of a
  deliberate user action.
- **The push budget does not apply**, for the same reason: it is session
  feedback, not outreach, and cannot fire outside an active workout.

Rules that DO apply, unchanged:

- Clear disable path: an in-app toggle in Settings → Workout & units
  ("Rest finished alert", default on, takes effect immediately, including
  mid-rest). The Android channel toggle also works.
- Weight-free, calm copy; nothing ED-adjacent rides this surface, so the
  ED-flag suppression rules are not implicated.
- Foreground delivery is suppressed (the in-app timer owns the moment); the
  alert is cancelled on skip, adjust, session end and sign-out.
