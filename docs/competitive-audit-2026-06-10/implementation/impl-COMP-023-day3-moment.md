# COMP-023 — Trial day-3 "the coach saw you" moment

> Implementation blueprint, round 2 of the 2026-06-10 audit. Approved spec
> seed: `../competitive-audit-03-master-proposals.md` (COMP-023, impact 6,
> effort 2). Code ground truth verified on branch
> `claude/main-branch-content-update-dcqicf`. No code changes in this
> document — blueprint only.

## 0. Code ground truth — the trial touchpoint map today (verified)

The 14-day cardless Pro trial starts at Article 9 consent
(`startCascade()`, `src/lib/payments/cascade.js:105`), which mirrors
`trialState: 'pro_trial_active'` + `proTrialEndsAt` into the local profile
and fire-and-forgets `scheduleCascadeGateNotifications(endsAt)`
(`cascade.js:146-153`).

What a trial user is actually scheduled to receive:

| Day | Touchpoint | Source | Verified behaviour |
|-----|-----------|--------|--------------------|
| 0 | Consent → trial grant; Pro onboarding lays morning-weight (daily, default 07:00) + weekly check-in reminder (user-chosen day, default Sunday 12:00) | `ProOnboardingScreen.js:432-440`, `scheduler.js:77,146` | Enrolment also seeds one morning weight (`WeeklyCheckInScreen.js:370-373` comment) |
| 1–11 | Morning-weight push daily (suppressed if already logged); check-in reminder on chosen day (suppressed if done) | `handler.js:22-30` | No trial-specific content at all |
| 12 | "Your free Pro trial ends in two days", 10:00 local | `scheduler.js:251-254` | **Naming trap:** the constants are `NOTIF_ID_CASCADE_19/21` (legacy 21-day cascade) but fire at `proTrialEndsAt − 2d` and `proTrialEndsAt`, i.e. day 12 and day 14 of the current 14-day trial |
| 14 | "You're back on the free plan", 10:00 local + one-time Home-mounted CascadeGate | `scheduler.js:255-258`, `HomeScreen.js:72-99` (H-2) | |
| After 1st check-in | `weekly_coach_ready` Monday 09:00 — only laid once a check-in has been submitted | `scheduler.js:362` | Never fires for a user who never checked in |

The first check-in itself is gated (`WeeklyCheckInScreen.js:494-514`):
wrong day → too soon (`FIRST_CHECKIN_MIN_DAYS = 5` since first weight,
line 75) → not enough weigh-ins (`MIN_WEIGH_INS = 3` in the trailing
7 days, line 37) → open. Because the check-in day is user-chosen
(default Sunday), the first review realistically lands **day 5–11**
depending on the start weekday — a Wednesday starter's first Sunday is
day 4 (too soon), so their first eligible review is day 11, one cycle
before the gate.

**The gap, precisely:** between day 0 and day 12 there is not a single
touchpoint that names the coaching review or tells the user what their
logging is building toward. The morning-weight pushes ask for inputs
without ever stating the payoff. The Home coaching nudge
(`HomeScreen.js:466-479`) requires 3 completed sessions AND today being
the check-in day. A trial user who drifts gets, as their first
trial-specific communication, a paywall warning on day 12. Round 1
called this "free/trial users never see the coach working"
(`../competitive-audit-01-monetisation-research.md` § baseline gaps).

**Adjacent defect found while verifying (mention, not fixed here):**
`restoreNotifications` (`scheduler.js:451-471`, called from
`RootNavigator.js:690` on every session restore) runs
`cancelAllNotifications()` then re-lays only morning + check-in. The
cascade day-12/14 pushes laid once at `startCascade` are therefore
**wiped on the next app launch and never re-laid**; the only surviving
day-14 surface is the H-2 Home-mounted gate. Any day-3 schedule must be
re-laid inside `restoreNotifications` to survive — and the same
treatment for the cascade gates should be approved alongside this work,
since it is the same function.

## 1. Best-in-market bar

1. **Blinkist — trial transparency (the single best reference).** Blinkist
   added a mid-trial push ("you will be charged in two days", sent day 5
   of 7) and advertised the reminder on the subscription screen itself.
   Results: trial starts +23%, support complaints −55%, push opt-in from
   6% to 74% ([growth.design case study](https://growth.design/case-studies/trial-paywall-challenge);
   [Purchasely interview with Eveline Moczko](https://www.purchasely.com/blog/using-transparency-to-increase-your-conversion-rate-with-eveline-moczko-blinkist);
   [Sub Club podcast, Jaycee Day](https://subclub.com/episode/how-ethical-design-led-to-23-growth-jaycee-day-github)).
   *Search-extract only: direct fetches of growth.design returned 403.*
   The transferable mechanic: **telling users what happens when, before
   it happens, raises both conversion and trust.** COMP-023 applies the
   same mechanic to the value side ("your first review unlocks
   {day}") instead of the charge side.
2. **RevenueCat activation doctrine.** Reaching the product's value
   moment early in the trial is the single biggest predictor of
   conversion; 84% of 3-day-trial and 64% of 7-day-trial cancellations
   happen on day 0–1, so the early window decides the outcome
   ([RevenueCat trial-length analysis](https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app/);
   [RevenueCat activation metrics](https://www.revenuecat.com/blog/growth/activation-metrics/) —
   *search-extract only, direct fetch 403*). H&F median trial→paid is
   39.9% ([RevenueCat State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)).
3. **Whoop/Oura-style "data is building" framing.** Whoop's trial is
   deliberately long because its features need weeks of data, and its
   internal activation metric is feature use, not paywall views (round 1,
   `../competitive-audit-01-monetisation-research.md` § Whoop). The
   countdown-to-value framing ("the system is learning you") is the
   honest version of anticipation.
4. **Duolingo — restraint as strategy.** Hard cap of two pushes per day;
   "routine" notifications around the user's habit window and "save"
   notifications reserved for genuine loss moments; everything else
   stays in-app ([Deconstructor of Fun teardown](https://duolingo.deconstructoroffun.com/mechanics/notifications) —
   *search-extract only, direct fetch 403*). The lesson is the budget,
   not the guilt copy.
5. **Phiture trial-length framework.** Align trial communication to
   time-to-value: one early signal shortly after start, one before the
   gate ([Phiture, How to Optimize Your Free Trial Length](https://phiture.com/mobilegrowthstack/the-subscription-stack-how-to-optimize-trial-length/)).
   Volyume's time-to-value is structurally day 5–11 (the check-in gate),
   which is exactly why a day-3 *countdown* beats a day-3 *feature tour*.

## 2. What fails

- **The silent trial → day-12 ambush.** Flo's opaque trial mechanics
  generate sustained complaint volume ("charged me for a free trial",
  [Google Play thread](https://support.google.com/googleplay/thread/113887055),
  TikTok complaint genre) — when the first trial communication is about
  money, every prior silence is reread as a trap. Volyume's current map
  is structurally this shape, minus the card.
- **Trials too short to show compounding value.** Fitbod's 3-workout
  trial is its most criticised monetisation feature — "the algorithm
  needs 10–15 workouts… the trial gives you a glimpse" (round 1,
  monetisation research § Fitbod). Volyume has the opposite asset (14
  days spanning a full coach cycle) and currently doesn't tell anyone.
- **Nudge desperation / fatigue.** 64% of users say they delete an app
  receiving 5+ pushes a week (HelpLama survey via
  [MagicBell](https://www.magicbell.com/blog/help-your-users-avoid-notification-fatigue);
  see also [Appbot push best-practice 2026](https://appbot.co/blog/app-push-notifications-2026-best-practices/)).
  Trial users already receive up to 7 morning-weight pushes + 1 check-in
  + optional training reminders per week. Anti-pattern to avoid by name:
  the **day-N drip campaign** (day 2, 4, 7, 10, 12 upsell sequence common
  in SaaS playbooks, e.g. [Product Fruits](https://productfruits.com/blog/strategies-to-convert-trial-users)) —
  in a notification budget this full, each additional push reads as
  desperation and burns the morning-weight habit loop the coach depends on.
- **Selling instead of counting down.** Any "upgrade now" framing before
  day 12 violates the approved spec's constraint and the house voice.
  The paywall stays at day 12–14; day 3 is value-side only.

## 3. User psychology

- **Moment of need:** day 3 is when initial novelty fades and the user
  silently asks "is this doing anything?". 84%/64% of early-trial
  cancellations cluster at the start (RevenueCat, above); day 3 is the
  last reliable moment to answer before drift. The answer must be
  *their own data echoed back* — that is what "the coach saw you" means.
- **Habit loop:** cue = the day-3 push / Home line; action = keep
  logging (or start); reward = a named, dated unlock ("your first review
  unlocks Sunday") plus visible progress counts. This converts the
  morning-weight chore from "the app nags me" into "I am feeding my
  review" — the same reframe that makes Whoop's calibration period
  tolerable.
- **Effort budget:** zero new asks. Every variant points at actions the
  user was already being asked to do; the banner is one line in an
  existing slot; the push is one per trial.
- **Emotional safety:** no shame state. The "has nothing" variant is a
  fresh start, not a telling-off. Weight-related asks are suppressed
  entirely under an open ED flag (§ 5).
- **Word-of-mouth surface:** "it told me on day 3 exactly when my first
  coaching review would unlock — and it did." The tellable moment is the
  kept promise, the value-side twin of Blinkist's charge reminder.
- **Trust mechanics:** show the working — real counts, real dates,
  derived from the same maths as the check-in gate. Never promise a date
  the gate would then refuse (§ 4, the unlock-date helper).

## 4. The Volyume implementation

### 4.1 Shape: one push + one Home line + nothing else

- **One** new local notification per trial, fired at **trial start + 3
  days, 10:00 local**, quiet-hours-shifted via `shiftDateOutOfQuietHours`
  — the exact pattern of `scheduleCascadeGateNotifications`
  (`scheduler.js:271-326`). Trial start derived as `proTrialEndsAt − 14d`
  (no new storage).
- **One Home banner line** in the existing single-banner priority slot
  (`HomeScreen.js:743-752`), visible days 2–7 of the trial, self-retiring.
- **Explicitly no day-7 push.** The midpoint is in-app only: the banner
  copy advances (see 4.4). Rationale: the notification budget is already
  at the deletion-risk threshold (§ 2); the existing weekly check-in
  reminder is the day ~5–7 push. Total trial-specific pushes: day 3,
  day 12, day 14. Three, evenly spaced, each with a different job
  (value, warning, outcome).

### 4.2 Variant selection — real data states

A new pure helper (proposed `src/lib/trialActivation.js`) selects the
variant from local counters at **schedule time**, and the schedule is
**re-laid on every app open during days 0–3** (inside
`restoreNotifications` + the `rescheduleForTimezoneIfChanged` path), so
the baked copy tracks the freshest state. A user who never reopens after
day 0 holds the "has nothing" variant — which is, by definition, correct
for them. Inputs (all existing reads): completed sessions since trial
start (`getAllWorkouts`), weigh-ins in the trailing 7 days
(`getMorningWeightsLast14Days`), first-weight timestamp, check-in day
pref (`@volyume_notification_prefs`.checkinDay), open ED flag
(`getOpenEdPatternFlag`).

| State | Condition | Job |
|-------|-----------|-----|
| S1 — on track | ≥1 completed session AND ≥3 weigh-ins in last 7d | Name the unlock date; reflect their work back |
| S2 — training, not weighing | ≥1 session, <3 weigh-ins | One concrete ask with the payoff attached |
| S3 — nothing yet | 0 completed sessions | Re-onboarding; point at the plan, smallest possible step |

**The unlock-date helper** `firstReviewUnlockDate()` must share the
*identical* gate maths as `WeeklyCheckInScreen` — next occurrence of
`checkinDay` that is ≥ `FIRST_CHECKIN_MIN_DAYS` (5) after the first
weight log. Extract `FIRST_CHECKIN_MIN_DAYS` and `MIN_WEIGH_INS` from
the screen into the helper and import them back, so the two can never
drift. The weigh-in requirement is future-conditional, so all S1/S2 copy
keeps the promise honest with "keep logging".

### 4.3 Copy (house voice: plain, terse, honest, numerals the hero, BrE)

Push, `data.type: 'trial_day3'` (counts and day name computed):

- **S1** — title: `Your coach has a read on you` · body:
  `3 sessions and 4 weigh-ins logged. Keep logging and your first
  coaching review unlocks on Sunday.`
- **S2** — title: `Your coach can see your training` · body:
  `2 sessions logged. 2 more morning weigh-ins and your first coaching
  review unlocks on Sunday.`
- **S3** — title: `Your plan is ready when you are` · body:
  `One session this week is all it takes to start your first coaching
  review. It's waiting on the Train tab.`

Home banner (single line + chevron, tappable, dismissible):

- **S1:** `First coaching review unlocks Sunday · 3 sessions, 4 weigh-ins in`
- **S2:** `2 more morning weigh-ins unlock your first coaching review`
- **S3:** `Your 14-day trial is live. One session starts your first
  coaching review.`
- **Day-7 midpoint advance (in-app only):** S1 →
  `Half-way. Your first coaching review unlocks Sunday`; S2/S3 keep
  their ask with updated counts. No new push.

No "Pro", no price, no "upgrade", no urgency words anywhere in this
surface. It is a countdown to value, full stop.

### 4.4 Home banner slotting (must not break the priority system)

`HomeScreen.js:743-752` currently renders at most one of
coach > deload > phase. Insert the trial line at **second priority**:

```
coachBanner > trialCountdownBanner > deloadBanner > phaseBanner
```

`showTrialCountdownBanner = stageOf(profile) === 'pro_trial' && trialDay
∈ [2,7] && !firstCheckinDone && !dismissed && !showCoachBanner`, and
`showDeloadBanner`/`showPhaseBanner` each gain
`&& !showTrialCountdownBanner`. The one-banner invariant holds. A fresh
coach review outranks it because if a review exists the value moment has
already happened — the banner's own retirement condition. Also suppress
when the existing day-of coaching nudge (`showCoachingNudge`,
`HomeScreen.js:470-476`) is showing, to avoid two voices saying the same
thing. Dismissal: one AsyncStorage key per trial
(`@volyume_trial_value_banner_dismissed_<userId>`); a dismiss hides the
banner for the rest of the trial (it is a courtesy, not a campaign).
Under COMP-027's "one big thing" reordering the slot itself moves with
the banner stack; this line adds no new card and is unaffected.

### 4.5 Deep links

New route in `notificationRoute.js` (and the same targets for banner
taps):

- S1/S2 → `{ tab: 'ProfileTab', screen: 'WeeklyCheckIn' }` — the gate
  screens are already the honest destination: they show the countdown
  made visible ("Precision Coaching needs at least 5 days…", "You've
  logged 2 readings… needs at least 3", `WeeklyCheckInScreen.js:1088,1116`).
  No new screen needed; the gate screen *is* the day-3 landing.
- S3 → `{ tab: 'HomeTab' }` — lands on the session hero card (the start
  button is the re-onboarding).
- Variant baked into `data` at schedule time so the router stays pure.

### 4.6 States, edges, offline

- **Already converted / cancelled:** re-lay path checks
  `stageOf(profile) === 'pro_trial'`; anything else cancels the pending
  day-3 id (mirror `cancelCascadeGateNotifications`).
- **Checked in before day 3** (early-week starters): handler-level
  suppression is foreground-only, so rely on the re-lay: on next app
  open, first-check-in-done cancels the push; the banner is already
  retired. Residual case (checked in then never reopened before 10:00
  day 3) receives an S1 push pointing at a review that exists — harmless.
- **No notification permission:** banner still carries the moment;
  the push silently doesn't exist (permission status already gates
  `restoreNotifications`).
- **Offline:** everything is local — SQLite counters, local scheduling,
  no server push. Fully offline-capable.
- **Quiet hours:** `shiftDateOutOfQuietHours`, as cascade gates.
- **Accessibility:** banner is one `TouchableOpacity` row,
  `accessibilityRole="button"`, label reads the full sentence; dismiss
  target ≥44pt via hitSlop (match coach banner, `HomeScreen.js:832-842`);
  counts in tabular figures.

## 5. Whole-package integration

- **Strengthens the check-in ritual:** the day-3 moment is an
  advertisement for `WeeklyCheckIn`'s existing gate screens and for the
  morning-weight habit the coach needs — it adds zero parallel surface
  and deep-links into surfaces that already exist.
- **Strengthens the cascade gates:** a user who has *felt* the coach by
  day 12 receives the gate as "keep this" rather than "buy this" — the
  reverse-trial conversion mechanic round 1 identified
  (monetisation research § 4.3).
- **Duplication avoided:** suppressed by the coach banner and the day-of
  coaching nudge; retires permanently on first check-in. Never coexists
  with deload/phase banners (priority chain).
- **ED/wellbeing flags:** if `getOpenEdPatternFlag` returns an open flag
  at re-lay time, the day-3 push is **not scheduled** and the banner
  falls back to a neutral S1-shape line with no weigh-in counts and no
  weight ask (`First coaching review unlocks Sunday`). No weight-related
  nudge is ever added on top of an open flag; calorie floors, thresholds
  and signposting untouched.
- **COMP-006/COMP-013 adjacency:** the reveal moment (COMP-013) sets the
  promise at day 0; COMP-023 is the first proof the promise is being
  kept; COMP-006's published methodology is where the curious land next.

## 6. Retention & word-of-mouth mechanics

The loop: morning-weight push → log → day-3 echo with counts → check-in
gate screens showing progress → first CoachOutput (the aha) →
`weekly_coach_ready` cadence. COMP-023 is the missing rung between
"logging" and "being coached". The tellable moment: **the app named a
date on day 3 and kept it** — kept promises are the cheapest trust
compounder in the category (Blinkist's entire result, § 1).

## 7. Beating the benchmark

Blinkist's transparency pattern is charge-side: "we'll remind you before
we bill you." Volyume's data position lets it run the same mechanic
value-side and personally: the day-3 message is built from the user's own
session and weigh-in counts and a real, gate-accurate unlock date — not a
campaign blast. No audited competitor does a mid-trial value countdown
driven by live data states (Fitbod gates by workout count, Flo and Cal AI
run silent trials, Whoop explains calibration only in marketing). One
push, three data states, one kept promise: better than the bar because it
is *quieter* than the bar and more specific than the bar at the same time.

## 8. Measurement

All within the existing allowlist (`src/lib/telemetry/events.js`) —
no new events needed for v1:

1. **Trial → first check-in rate (primary):** % of `cascade_started`
   cohort with a `weekly_coach_run` within their 14 trial days, pre vs
   post release. Target: meaningful lift (baseline currently unmeasured —
   this also establishes it).
2. **Trial → paid lift:** `paid_converted` / `cascade_started`, split by
   release cohort; secondary split by `notification_tapped` with the new
   `trial_day3` category (Panel 6 already carries category).
3. **Median day of first check-in** relative to `cascade_started`
   (should move toward the first eligible gate day).
4. **Guardrail:** Panel 6 send/open rates for `trial_day3` and the
   morning-weight category (no opt-out spike); `churn_at_gate` flat or
   down.

## 9. Build notes

- **Files:** `src/lib/notifications/scheduler.js`
  (+`scheduleTrialDay3Notification`/cancel, ~60 lines mirroring the
  cascade-gate helper; re-lay call inside `restoreNotifications`);
  `src/lib/notifications/categories.js` (+`TRIAL_DAY3` category,
  channels PUSH+IN_APP, `categoryForDataType` case);
  `src/lib/notifications/notificationRoute.js` (+`trial_day3` route);
  `src/lib/payments/cascade.js` (one fire-and-forget line in
  `startCascade` beside the cascade-gate lay); new pure
  `src/lib/trialActivation.js` (variant selection + unlock-date maths,
  exporting `FIRST_CHECKIN_MIN_DAYS`/`MIN_WEIGH_INS` for
  `WeeklyCheckInScreen` to import); `src/screens/HomeScreen.js` (banner
  + two priority-line edits). Tests: scheduler test additions +
  `trialActivation` unit tests (gate-parity fixtures against the
  check-in screen's maths). No DB changes, no migrations, no billing
  files.
- **Reuse:** quiet hours, greetName, notification telemetry, gate
  screens as landing pages, banner styles from the coach banner.
- **Effort sanity-check:** approved score 2; realistic 2–2.5 — the
  unlock-date helper with gate-parity tests and the restore-path
  survival work are the additions over the seed estimate. Still a small,
  contained change.
- **Risks:** (1) **The kept-promise risk — the one that kills it:** if
  the promised unlock date ever disagrees with the check-in gate, the
  coach's first promise is a broken one; mitigated by single-source gate
  constants + parity fixtures. (2) **Pre-existing cascade-gate wipe**
  (§ 0): the day-3 push must live inside the `restoreNotifications`
  re-lay to survive; recommend founder approve re-laying the cascade
  gates there too in the same PR (same function, same pattern) — flagged
  as adjacent fix, not silently included. (3) Notification fatigue —
  held to exactly one new push per trial; day 7 is in-app only.
  (4) Legacy `NOTIF_ID_CASCADE_19/21` naming invites a wrong "day fix";
  noted here so it doesn't get one.

### Sources

- [growth.design — Blinkist trial paywall case study](https://growth.design/case-studies/trial-paywall-challenge) *(search-extract only; direct fetch 403)*
- [Purchasely — Blinkist transparency interview (Eveline Moczko)](https://www.purchasely.com/blog/using-transparency-to-increase-your-conversion-rate-with-eveline-moczko-blinkist)
- [Sub Club — How Ethical Design at Blinkist Led to 23% Growth](https://subclub.com/episode/how-ethical-design-led-to-23-growth-jaycee-day-github)
- [RevenueCat — trial length analysis](https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app/)
- [RevenueCat — activation metrics](https://www.revenuecat.com/blog/growth/activation-metrics/) *(search-extract only; direct fetch 403)*
- [RevenueCat — State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- [Phiture — How to Optimize Your Free Trial Length](https://phiture.com/mobilegrowthstack/the-subscription-stack-how-to-optimize-trial-length/)
- [Deconstructor of Fun — Duolingo push notifications teardown](https://duolingo.deconstructoroffun.com/mechanics/notifications) *(search-extract only; direct fetch 403)*
- [MagicBell — notification fatigue (HelpLama 64%/5+ pushes survey)](https://www.magicbell.com/blog/help-your-users-avoid-notification-fatigue)
- [Appbot — push notification best practices 2026](https://appbot.co/blog/app-push-notifications-2026-best-practices/)
- [Product Fruits — trial conversion drip playbook (the anti-pattern)](https://productfruits.com/blog/strategies-to-convert-trial-users)
- [Google Play support thread — Flo trial billing complaints](https://support.google.com/googleplay/thread/113887055)
- Round-1 in-repo: `../competitive-audit-01-monetisation-research.md`, `../competitive-audit-01-onboarding-research.md`
