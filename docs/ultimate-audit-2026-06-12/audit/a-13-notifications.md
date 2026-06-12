# a-13 — Notifications & re-engagement (internal audit)

ULTIMATE-APP MANDATE, Phase 1, Area 13. Code-verified, no internet. Branch
`claude/admiring-bohr-2kb7pd`. All paths absolute-from-repo-root; line numbers
are at audit time.

Scope: the full push inventory, push-budget enforcement, collision priority,
the settings surfaces and their defaults, permission ask timing, quiet hours,
and an exhaustive verification of the a-01 finding that training-day reminders
are never armed.

---

## 0. Module map

`src/lib/notifications/`:

| File | Role |
| --- | --- |
| `index.js` | public re-export barrel |
| `categories.js` | category enum, channel routing, `categoryForDataType` |
| `channels.js` | Android channels (`ensureNotifChannels`) |
| `quietHours.js` | 22:00–07:00 default shift logic |
| `permissions.js` | request / status wrappers |
| `handler.js` | foreground delivery handler (smart suppression) |
| `scheduler.js` | every schedule/cancel helper (1053 lines) |
| `budget.js` | push-budget core + `requestEventPushSlot` |
| `notificationRoute.js` | pure `data.type` → nav target |
| `listeners.js` | OS listener wiring + tap telemetry |
| `trainingReminders.js` | training-day weekly push (separate channel) |
| `missedCheckin.js` | ghost-prevention copy + date maths (pure) |
| `partnerBeats.js` | partner cheer/streak copy + watermark (pure) |
| `winbackContent.js` | win-back copy (pure) |
| `telemetry.js`, `pushToken.js`, `preferences.js`, `activeWorkout.js` | supporting |

Screens: `NotificationSettingsScreen.js` (training reminders + Pro cross-link),
`CoachingRemindersScreen.js` (Pro morning/check-in/missed), `ProOnboardingScreen.js`
(activation), `WeeklyCheckInScreen.js` (check-in submit re-lay).

---

## 1. WHAT — every scheduled / triggered notification

Trigger, copy (verbatim), tap route, gates. "Habit" = user-scheduled recurring,
budget-exempt. "Event" = one-shot lifecycle, budgeted.

### 1.1 Morning weight (habit) — `scheduler.js:99`
- **Trigger:** 7 WEEKLY triggers, one per weekday, default 07:00 local, quiet-shifted. Channel `coaching-reminders`. `data.type='morning_weight'`, `sound:false`.
- **Copy:** rotates 4 lines (`scheduler.js:78-85`), e.g. title `Good morning, {First}`, body `Whenever you're ready, hop on the scales and log today's weight.` Name suffix `, First` when known (`greetName` `:59`, capped 20 chars).
- **Tap route:** **none** — `morning_weight` is absent from `routeForNotificationType` → tap dead-ends (opens app, no nav). **GAP.**
- **Suppression:** handler suppresses if weight already logged today (`handler.js:22`).
- **Armed by:** `CoachingRemindersScreen` (Pro), `ProOnboardingScreen` (if `morningEnabled`), `restoreNotifications` on launch.

### 1.2 Weekly check-in reminder (habit) — `scheduler.js:168` / `:235`
- **Trigger:** one-off DATE at next chosen weekday (default Sunday 12:00 in `scheduleCheckinReminder`; `CoachingRemindersScreen` default Mon 18:00), quiet-shifted, with a 7-day min-gap from last check-in. `data.type='weekly_checkin'`.
- **Copy:** title `How has your week gone{, First}`, body `A two-minute check-in is all it takes, and your coach tunes next week around it.` (`:144`).
- **Tap route:** ProfileTab → WeeklyCheckIn (`notificationRoute.js:22`).
- **Suppression:** `scheduleNextCheckinReminder` skips the week if already checked in (`:235`); handler suppresses on delivery (`handler.js:25`).
- **Single-shot, re-laid each launch (`restoreNotifications`) and after each check-in submit (`WeeklyCheckInScreen:617`).**

### 1.3 Weekly coach-ready (event, rank 2) — `scheduler.js:689`
- **Trigger:** one-off DATE, next Monday 09:00 local, quiet-shifted. Budget slot requested. `data.type='weekly_coach_ready'`.
- **Copy:** title `Your coaching for the week is ready`, body `Have a look at what's changed for you this week, and the thinking behind it.` (`:669`).
- **Tap route:** ProfileTab → CoachOutput (`notificationRoute.js:35`).
- **Laid only on check-in submit** (`WeeklyCheckInScreen:628`) — so it fires only in a week a real review exists. Not re-laid by `restoreNotifications` (correct: a launch with no new check-in shouldn't re-promise it).

### 1.4 Training-day reminder (habit) — `trainingReminders.js:74`
- **Trigger:** one WEEKLY repeat per training day in `SCHEDULE_KEY.days`, default 08:00, channel `training-reminders` (`sound:'default'`, HIGH importance). `data.type='training_reminder'`.
- **Copy:** title `Today's a training day`, body `You've got a session on for today. Enjoy it whenever it suits you.` (`:132,141`).
- **Tap route:** **none** — absent from `routeForNotificationType` → dead-ends. **GAP.**
- **Suppression:** handler suppresses if already trained today (`handler.js:28`).
- **NEVER FIRES IN PRODUCTION — see §1.A (the a-01 finding, expanded).**

### 1.5 Trial day-3 value moment (event, rank 4) — `scheduler.js:371`
- **Trigger:** one-off DATE, trial start + 3 days, 10:00 local, quiet-shifted, budgeted. Variant S1/S2/S3 baked from live counts. `data.type='trial_day3'`.
- **Copy (`trialActivation.js:115`):** S1 title `Your coach has a read on you`; S2 `Your coach can see your training`; S3 `Your plan is ready when you are`. Bodies carry live session/weigh-in counts + the unlock weekday.
- **Tap route:** S3 → HomeTab; S1/S2 → ProfileTab → WeeklyCheckIn (`notificationRoute.js:58`).
- **Gates:** suppressed entirely under an open ED flag (`:394`); skipped if day-3 already passed.
- **Armed by:** `startCascade` (`cascade.js:156`), `HomeScreen:322`, and `restoreNotifications` (`:819`).

### 1.6 Trial cascade gates — "D12 / D14" (event, rank 1) — `scheduler.js:293`
- The mandate calls these D3/D12/D14. **D3 is §1.5 above.** The two cascade gates are **day 19 and day 21 of the 14+7 model**, internally also described as trial-end−2d and trial-end (i.e. day 12 and day 14 of the 14-day in-app trial). Identifiers `volyume_cascade_day19/_21` (`:270-271`).
- **Trigger:** two one-off DATEs at 10:00 local on (end−2d) and (end day), quiet-shifted, budgeted (top priority — evicts lower pushes, never dropped). `data.type='cascade_gate'`. Past gates skipped.
- **Copy:** day-19 title `Your free Pro trial ends in two days`, body `Hope you've been enjoying it. Have a look at your options whenever you're ready.`; day-21 title `You're back on the free plan`, body `Everything you've logged is safe and waiting. You can go Pro again any time.` (`:273-280`).
- **Tap route:** ProfileTab → CascadeGate `{variant:'day14'}` (`notificationRoute.js:31`). Both gate variants share one route.
- **Armed by:** `startCascade` (`cascade.js:151`) and `restoreNotifications` (`:818`).

### 1.7 Missed check-in / ghost prevention (event, rank 3) — `scheduler.js:565`
- **Trigger:** TWO one-off DATEs per missed-check-in episode — a same-evening nudge (20:00 on the check-in day) and a +48h follow-up, quiet-shifted, each budgeted. `data.type='checkin_missed'`, `slot:'evening'|'followup'`.
- **Copy (`missedCheckin.js:27`):** evening title `Your check-in is ready when you are{, First}`, body `Your check-in data is ready to review. It takes about two minutes.`; followup title `Your weekly trend is ready{, First}`, body `Tap to see how the week compares, whenever suits you.` Word "missed" is explicitly banned (no-shame).
- **Tap route:** evening → ProfileTab → WeeklyCheckIn; followup → ProgressTab → Analytics (`notificationRoute.js:49`).
- **Gates:** Pro-only (`:572`), toggle `missedCheckinEnabled` default on (`:584`), open ED flag suppresses (`:597`), handler stands down if checked in within 72h or ED flag open (`handler.js:35`).
- **Armed by:** `CoachingRemindersScreen` toggle/save, `ProOnboardingScreen:549`, `restoreNotifications:839`.

### 1.8 Win-back (event, rank 5) — `scheduler.js:467`
- **Trigger:** one one-off DATE per churn episode, lapse + 30d (or §4d stated-return window), quiet-shifted, budgeted. `data.type='winback'`. Single-shot enforced by `winbackState` (+ a cross-episode 180-day floor).
- **Copy (`winbackContent.js:42`):** if sessions since lapse > 0, title `Still lifting. {n} sessions since {Month}.`, body `Your trend data never stopped. Pro picks up exactly where it left off.` Else falls back to `Your training is saved.` Never shows a zero. Sessions only — never weight/calorie figures.
- **Tap route:** ProfileTab → Subscription `{fromWinback:true}` (`notificationRoute.js:39`).
- **Gates:** open ED flag suppresses + cancels (`:478`).
- **Armed by:** `lapseDetect.js:74` and `restoreNotifications:829`.
- **Honest v1 limit (documented `:459`):** a user who never reopens during the lapse never gets it (local-only; no server push to the never-returning segment).

### 1.9 Partner cheer (event, rank 8) — `scheduler.js:946`
- **Trigger:** fires ~5s out (quiet-shifted) when a fresh cheer arrives on the partner sync pull (`sync/tables/partners.js:152`). `data.type='partner_cheer'`. Watermark = once per cheer id; only while cheer < 48h fresh.
- **Copy (`partnerBeats.js:22`):** title `{PartnerName} cheered you on`, body `A tap from your training partner. They can see your week is being kept.` Framed FROM the partner, never the app.
- **Tap route:** ProgressTab → Consistency (`notificationRoute.js:45`).
- **Gates:** open ED flag suppresses (`:957`), toggle `partnerCheerEnabled` default on (`:966`) — **no UI exposes this toggle (a-12 finding).**

### 1.10 Partner shared-streak kept (event, rank 8) — `scheduler.js:1006`
- **Trigger:** same sync moment, when the shared-streak run grows past the watermark and run ≥ 2 and pair `streakEnabled`. `data.type='partner_streak'`.
- **Copy (`partnerBeats.js:31`):** title `{n} weeks running, together`, body `You and {name} both kept your training week.`
- **Tap route: NONE.** `partner_streak` is absent from `routeForNotificationType` → tap dead-ends. **GAP (a-12 finding #12, verified).**

### 1.11 Year-of-Lifts unlock (event, rank 6) — `scheduler.js:850`
- **Trigger:** fires immediately on the app-open that first satisfies 365 days since earliest workout, idempotent flag, budgeted. `data.type='year_of_lifts_unlock'`, `sound:true`.
- **Copy:** title `A whole year of lifts`, body `What a year. Your wrap-up is ready, swipe through it on the Progress tab.` (`:865`).
- **Tap route:** ProgressTab → YearOfLifts (`notificationRoute.js:26`).
- **DEAD: `checkYearOfLiftsUnlock` has no live call site — see §4 GAP.**

### 1.12 Monthly recap (event, rank 7) — `scheduler.js:893`
- **Trigger:** fires immediately once/calendar month when ≥10 lifetime sessions AND ≥1 session that month, idempotent per-month flag, budgeted. `data.type='monthly_recap'`, `sound:true`. A zero-session month gets silence.
- **Copy:** title `Your {Month} recap is ready`, body `45 seconds of what you put in last month. Have a look when you fancy.` (neutral variant under calm/ED: `Last month's training, summed up. Have a look when you fancy.`) (`:908`).
- **Tap route:** ProgressTab → Analytics (`notificationRoute.js:27`).
- **DEAD: `checkMonthlyRecapReady` has no live call site — see §4 GAP.**

### 1.13 Server / transactional (budget-exempt, categories defined, no local code)
- `subscription_payment_failure`, `subscription_expiring` — push categories exist (`categories.js`), routed in `notificationRoute`? No (`subscription_*` absent → would dead-end if fired). Driven server-side via send-push/RTDN per `index.js:18-25` (not in this repo's device code).
- `coach_trial_ending` — EMAIL channel only.

### 1.14 In-app-only (never push, by ED policy)
`ed_pattern_lockout`, `ffm_floor_hold`, `sync_error` are `IN_APP` only (`categories.js:60-62`). Pushing those is the harm pattern. Rest-timer live countdown is a separate LOW-importance foreground notification (`activeWorkout.js:157`, channel `rest-timer`), out of the re-engagement scope.

### 1.A — a-01 FINDING VERIFIED & EXPANDED: training-day reminders never fire

The mandate asks to verify exhaustively that training-day reminders are never
armed at onboarding. **Verified, and it is worse than "not at onboarding":**

1. `scheduleTrainingReminders` (`trainingReminders.js:74`) gates on BOTH
   `REMINDER_PREF_KEY==='true'` AND a parsed `SCHEDULE_KEY` with non-empty
   `days[]`. Missing/empty either → `cancelTrainingReminders()` + return.
2. **`SCHEDULE_KEY` (`@volyume_schedule_v1`) is never WRITTEN anywhere in `src/`.**
   Grep finds only READS: `HomeScreen.js:463`, `widgets/writer.js:49`. No writer
   exists. (Confirmed by `Grep SCHEDULE_KEY|@volyume_schedule_v1` over `src`.)
3. The only caller of `scheduleTrainingReminders` is `NotificationSettingsScreen`
   (`:400`, `:423`) — the toggle and time-picker. **Not** onboarding, **not** plan
   build, **not** `restoreNotifications`.
4. Therefore: a user toggling "Remind me to train" on writes `REMINDER_PREF_KEY=true`,
   but `scheduleTrainingReminders` finds no `SCHEDULE_KEY.days`, cancels, returns.
   **No training-day reminder can ever be scheduled through the shipping UI.**
5. UX compounding bug: the settings card helper text reads "Pick a time and **the
   days** you want the nudge" (`NotificationSettingsScreen.js:526`) but the screen
   renders **only a time picker — no day picker exists**. The promised day
   selection is absent, and the underlying `days[]` it would write is the missing
   key. The toggle and time are pure dead controls.

The channel (`training-reminders`) and the per-day scheduling code are fully
built and unit-tested (`notifications.trainingReminders.test.js`); only the
`SCHEDULE_KEY` writer + day-picker UI are missing. This is the single biggest
functional gap in the area.

---

## 2. WHERE — settings surfaces & defaults

### 2.1 `NotificationSettingsScreen` (Settings → Notifications; all tiers)
- **Training reminders:** toggle `Remind me to train` (default OFF) + time picker (presets 06:00–20:00, default 08:00). **Both non-functional — §1.A.** No day picker.
- **Pro cross-link:** "Coaching reminders" row → `CoachingRemindersScreen` (Pro only).
- **Permission ask:** `requestNotificationPermissions()` is called **on mount** (`:298`) — an implicit second ask point. Shows a denied banner if not granted.
- Subtitle copy: "Volyume uses local notifications only. No marketing, ever."
- Note: `applyNotifications` / `scheduleApply` are **retained but unreachable** ("half-finished refactor", `:316-319`). Morning/check-in are no longer editable here (moved to the Pro screen).

### 2.2 `CoachingRemindersScreen` (Settings → Coaching reminders; Pro only)
- **Morning weight:** hour chips (5–12), default 07:00. No toggle (always on for Pro).
- **Weekly check-in:** day chips (Sun–Sat, default Mon=1) + hour chips (14–21, default 18:00). No toggle. Shows honest "next check-in will be …" with 7-day-gap explainer.
- **Check-in follow-up (missed):** toggle `missedCheckinEnabled` (default ON).
- Permission asked on mount (`:187`).

### 2.3 Per-category SQLite mirror (`preferences.js`, migration 044)
`morning_weight`, `weekly_checkin_reminder`, `training_reminder`, `checkin_missed`
rows are mirrored for cross-device sync. `partnerCheerEnabled` and quiet-hours
are **not** mirrored (AsyncStorage only).

### 2.4 Defaults summary
| Category | Default state | Default time |
| --- | --- | --- |
| Morning weight | on for Pro (no toggle) | 07:00 |
| Weekly check-in | on for Pro (no toggle) | Mon 18:00 |
| Missed check-in follow-up | ON (Pro toggle) | evening 20:00 + 48h |
| Training reminders | OFF, **non-functional** | 08:00 |
| Partner cheer/streak | ON (no UI toggle) | event-driven |
| Quiet hours | ON, **no UI** | 22:00–07:00 |

### 2.5 Permission ask timing
Project rule (`permissions.js:7`): "ask once at onboarding screen 11". Live ask
sites: `ProOnboardingScreen:517` (only if morning/check-in chosen),
`WeeklyCheckInScreen:651`, `CoachingRemindersScreen:187` (on mount),
`NotificationSettingsScreen:298` (on mount). Sound is requested OFF (iOS);
the app drives all audio in-app. **Friction:** the ask is conditional in
onboarding — a user who declines both coaching reminders is never prompted, so
no event push (cascade/trial/win-back) has OS permission either.

### 2.6 Quiet hours
- Default 22:00–07:00, configurable via `setQuietHours` (`quietHours.js:50`).
- **No screen calls `setQuietHours` and no UI references `QUIET_HOURS_KEY`** (grep over `src/screens`+`src/components` = empty). The header comment claiming it "lives in NotificationSettingsScreen / You → Notifications" is **stale** — quiet hours is effectively a fixed constant. Applied to every push via `shiftHourMinuteOutOfQuietHours` / `shiftDateOutOfQuietHours`.

---

## 3. FEEL

### 3.1 New Besa (gym-newbie, free or just-started trial) — week 1
Assuming she grants permission at onboarding (chose a coaching reminder):
- **Day 0:** onboarding. If Pro-trial started, `startCascade` lays the day-3 push + two cascade gates immediately.
- **Daily AM (from day 1):** "Good morning, Besa — hop on the scales…" at 07:00, suppressed on days she's already weighed. Soft, no command tone, `sound:false`.
- **Day 3, 10:00:** trial day-3 value moment, variant by her real activity. If she's done nothing: "Your plan is ready when you are" → Home. Warm, not shaming. Suppressed entirely if an ED flag is open.
- **Her check-in day (default Mon 18:00 Pro / Sun 12:00 default):** "How has your week gone, Besa…" → check-in wizard. Skipped if already done.
- **Training reminders: she will never receive one** (§1.A), even if she toggles it on — a silent letdown.
- **Net:** a calm, low-frequency week (≤1 push/day for habits; budget caps events at 2/day, 8/week). Tone is consistently gentle, British, named. Nothing spammy.

### 3.2 Eddie (athlete, Pro, in prep)
- Morning weight + weekly check-in on his chosen schedule.
- If he misses a check-in: a 20:00 same-day nudge + a +48h "your weekly trend is ready" — both no-shame, both stand down if he checks in within 72h. This is the strongest retention surface and it reads as helpful, not nagging.
- If he has a partner: cheer pushes when cheered (framed from the partner), streak-kept pushes — though the streak one dead-ends on tap (§1.10).
- Coach-ready Monday 09:00 only in weeks he checked in.
- **ED lens:** every weight/calorie-adjacent push checks `getOpenEdPatternFlag` and goes silent; win-back and partner copy never reference weight; "missed" is banned. The system is unusually careful here — a genuine strength.

### 3.3 Spammy / shaming risk (ED lens)
- **No shaming copy found.** All bodies are complete, warm sentences; "missed" is explicitly banned; zeros are never shown (win-back, recap, partner all guard).
- **Budget keeps volume sane:** 2 events/day, 8/week, one-per-topic-per-day, quiet-hours always wins.
- **One subtle risk:** `year_of_lifts_unlock` and `monthly_recap` are `sound:true` (vs `sound:false` everywhere else) — louder by design, but both are currently dead (§4) so the risk is latent.

---

## 4. GAPS / FRICTION (per code)

1. **Training-day reminders are unschedulable (CRITICAL).** No `SCHEDULE_KEY`
   writer; no day picker; helper text lies about "days you want". Toggle + time
   are dead controls. (`trainingReminders.js:91`, `NotificationSettingsScreen.js:526`.)
   Verifies & expands the a-01 finding: not just un-armed at onboarding — un-armable.
2. **`checkYearOfLiftsUnlock` and `checkMonthlyRecapReady` are dead code.** Exported,
   unit-tested, fully built — but no screen/navigation/component calls them
   (grep over `src` minus tests/index/scheduler = empty). The Year-of-Lifts and
   Monthly-Recap pushes **never fire in production.** (`scheduler.js:850,893`.)
3. **`partner_streak` tap dead-ends.** Scheduled (`scheduler.js:1021`) but absent
   from `routeForNotificationType` → returns null → no navigation. (a-12 finding,
   verified.)
4. **`morning_weight` and `training_reminder` taps dead-end.** Both data types are
   absent from `routeForNotificationType` (`:20`). Tapping the morning weigh-in
   reminder opens the app on the last screen, no nav to weight logging — a daily,
   high-volume push with no destination. (Morning is moot for training_reminder
   since it never fires, but morning_weight is live and the most frequent push.)
5. **Quiet hours has no UI and a stale comment.** Effectively a fixed 22:00–07:00
   constant; `setQuietHours` is never called from any screen
   (`quietHours.js:11` comment is false). Users can't adjust their quiet window.
6. **Partner cheer/streak toggle has no UI.** `partnerCheerEnabled` is read
   (`scheduler.js:966`) but no screen sets it; the only off-switch is OS-level.
   (a-12 finding.)
7. **`subscription_payment_failure` / `subscription_expiring` would dead-end on
   tap** if the server fires them — both absent from `routeForNotificationType`.
   (Latent; server side not in this repo.)
8. **Conditional onboarding permission ask.** A user who declines both coaching
   reminders is never prompted (`ProOnboardingScreen:516`), so cascade/trial/
   win-back events silently have no OS permission.
9. **Two reminder schedules diverge.** `scheduleCheckinReminder` default is
   Sunday 12:00 (`scheduler.js:168`) while `CoachingRemindersScreen` default is
   Mon 18:00 (`:148`) and `ProOnboardingScreen` passes 12:00 — defaults drift by
   screen; not user-visible but a maintenance hazard.
10. **`applyNotifications` / `scheduleApply` dead in `NotificationSettingsScreen`**
    (`:35`,`:320`) — retained "half-finished refactor" code, no caller.

---

## 5. Surface inventory

Distinct user-/system-facing notification surfaces (delivered or intended):

| # | Surface | data.type | Class | Route | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Morning weight | morning_weight | habit | — (dead-end) | live |
| 2 | Weekly check-in reminder | weekly_checkin | habit | WeeklyCheckIn | live |
| 3 | Weekly coach-ready | weekly_coach_ready | event r2 | CoachOutput | live |
| 4 | Training-day reminder | training_reminder | habit | — (dead-end) | **never fires** |
| 5 | Trial day-3 moment | trial_day3 | event r4 | Home / WeeklyCheckIn | live |
| 6 | Cascade gate day-19 (D12) | cascade_gate | event r1 | CascadeGate | live |
| 7 | Cascade gate day-21 (D14) | cascade_gate | event r1 | CascadeGate | live |
| 8 | Missed check-in evening | checkin_missed | event r3 | WeeklyCheckIn | live (Pro) |
| 9 | Missed check-in +48h | checkin_missed | event r3 | Analytics | live (Pro) |
| 10 | Win-back +30d | winback | event r5 | Subscription | live |
| 11 | Partner cheer | partner_cheer | event r8 | Consistency | live |
| 12 | Partner streak-kept | partner_streak | event r8 | — (dead-end) | live, **unrouted** |
| 13 | Year-of-Lifts unlock | year_of_lifts_unlock | event r6 | YearOfLifts | **dead code** |
| 14 | Monthly recap | monthly_recap | event r7 | Analytics | **dead code** |
| 15 | Subscription payment failure | subscription_payment_failure | server | — | server-only |
| 16 | Subscription expiring | subscription_expiring | server | — | server-only |
| 17 | Coach trial-ending (email) | coach_trial_ending | email | n/a | email |
| 18 | ED pattern lockout | — | in-app | n/a | in-app only |
| 19 | FFM floor hold | — | in-app | n/a | in-app only |
| 20 | Sync error | — | in-app | n/a | in-app only |
| 21 | Rest-timer live | — | foreground svc | n/a | out of scope |

**Push surfaces: 14 (#1–14).** Of those: 11 live, 1 live-but-unrouted (#12),
2 dead code (#13–14), 1 never-fires (#4). Plus 2 server-only push categories,
1 email, 3 in-app-only, 1 foreground service. **Total surfaces: 21.**

Android channels (`channels.js`): `coaching-reminders` (HIGH), `training-reminders`
(HIGH), `rest-timer` (LOW). 3 channels.

---

## 6. Push-budget enforcement (`budget.js`)

- **Caps:** `EVENT_DAILY_CAP=2`, `EVENT_WEEKLY_CAP=8` (`:35-36`), per local day / local
  Monday-anchored week.
- **Routed through `requestEventPushSlot`:** cascade gates (`scheduler.js:326`),
  trial day-3 (`:422`), win-back (`:514`), missed check-in (`:630`), weekly
  coach-ready (`:699`), year-of-lifts (`:860`), monthly recap (`:903`), partner
  cheer + streak (`:987`,`:1018`). **Every event-class scheduler routes through it.**
- **Exempt (habit, no slot request):** morning weight, weekly check-in,
  training-day reminder. Each self-caps via its own schedule + delivery-time
  suppression (handler.js). Transactional server pushes exempt.
- **Collision priority** (`EVENT_PRIORITY`, highest first, `:43`):
  CASCADE_GATE > WEEKLY_COACH_READY > CHECKIN_MISSED > TRIAL_DAY3 > WINBACK >
  YEAR_OF_LIFTS_UNLOCK > MONTHLY_RECAP > PARTNER_CHEER (partner_streak shares
  PARTNER_CHEER rank, lowest).
- **Rules:** one-per-topic-per-day (`:186`); on a full day, a strictly-higher
  priority evicts the lowest occupant (equal priority never evicts, `:197`);
  evicted loser is cancelled + logged `budget_evicted`, never re-queued; a blocked
  push logs `budget_capped`.
- **Fail-open:** if the pending schedule can't be read, the slot is granted
  (`:239`) — budget never silently breaks a push. Telemetry never throws into
  scheduling (`:257`).
- **Verdict:** the budget is sound and comprehensively wired. Its real-world
  effect is currently muted because two event surfaces are dead and one habit
  surface never fires — the day cap of 2 is rarely approached in practice.

---

## 7. Cross-references
- a-01 (onboarding): training-reminder arming gap — verified & expanded here (§1.A).
- a-12 (partner-social): `partner_streak` unrouted (#12) + missing partner toggle (gap 6) — verified.
- a-11 (retention): Year-of-Lifts (#13) + Monthly recap (#14) push surfaces are
  dead — the recap/YoL *screens* exist, only their notification triggers are unwired.
