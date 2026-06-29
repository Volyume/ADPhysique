# 13 — Engagement & notifications — Hevy vs Volyume

Competitive teardown. **Learnings only** — never copy Hevy code, copy, or assets
verbatim. Hevy strings are from a Hermes bundle (string table); corroborated by
grep where possible, treated as signal not gospel. All recommendations respect
the CLAUDE.md sacred rules: ED-safe, no-shame, no Pro-feature leakage to free,
offline-first, British English, no AI in the engine.

Hevy corpus: `scratchpad/corpus/` (bundle_strings.txt, events_keys.txt,
screens_components.txt, sdk_fingerprints.txt).
Volyume code: `/home/user/ADPhysique/src/`.

## Engagement & notifications — Hevy vs Volyume

### How Hevy does it

Evidence is from the Hermes string table, so symbol names are concatenated; the
distinct tokens below recur enough to be reliable signals.

- **Streak — weekly cadence, day-counted, gamified flame.**
  - `computeCurrentStreak`, `calculateCurrentWeekStreak`, `calculateBestWeekStreak`,
    `Week Streak Calendar`, `StreakPageContent`, `WeeklyGoalBadge`.
  - Copy is explicitly motivational and loss-framed:
    - "Train this week to start your streak and light your flame"
    - "Keep your streak strong" / "your streak is looking strong"
    - "Stay consistent and keep your streak growing"
    - "Dein Streak ist in Gefahr" (= *your streak is in danger*) — an explicit
      **streak-at-risk** notification.
    - "Wahnsinniger Streak on fire" (= *insane streak, on fire*).
  - Streak unit is the **week** with a **weekly goal** (`WeeklyGoalBadge`,
    `durationThisWeekly Goal`) and a flame icon (`currentStreakFlameSvg`,
    `innerFlameFillColor`, `OutlinedStreakCountSvg`). Rest days are tracked
    inside the week ("displays the number of rest days so far this week",
    `restDayCount.plural`) so a rest day does **not** break the streak — the
    week is the unit, not the day.
  - `streak_paused`-style state not seen; Hevy's streak looks **breakable**
    (loss-framed "in danger" copy), with no forgiveness/pause mechanic.

- **Notifications — local + push, several types.**
  - **Rest-timer Live Activity** (the headline one): `LiveActivityRestTimer`,
    `TimerNotification`, `clearFiredTimerNotification`, `LiveSyncNotification`,
    `clearScheduledTimerNotification`. An ongoing OS notification / live
    activity that counts the rest timer between sets.
  - **Live PR notification**: `LivePRNotificationEnabled`, `LivePRBadgeSvg`,
    `LivePRSoundFileName`, `LivePRSoundVolume`, `New personal record`,
    "you achieve a Personal Record upon checking the set" — a real-time PR
    celebration fired mid-workout with sound.
  - **Active-workout reminder**: `ScheduleActiveWorkoutReminder`,
    `cancelScheduleActiveWorkoutReminder` — nudges you when a workout is left
    open/unfinished.
  - **Workout/training reminders** scheduled locally
    (`StaticNotificationSettingWarningMessage`, `PushNotificationScreen`,
    `WorkoutNotificationSubscriptionOverlay`, `handleLaunchFromNotification`).
  - SDKs: **OneSignal** (push) + **Branch** (deep-link/attribution, 45
    fingerprints) confirm a server-push + deep-link engagement stack.

- **Achievements / milestones**: `UnlockAchievement`, `MilestoneBadge`,
  `WorkoutMilestoneShareable`, "Celebrate your achievements and motivate others
  by sharing" — milestones are explicit, badged, and **shareable**.

- **Year in Review / recaps**: `YearInReview` (YIR), `YIRCard…` (TopExercises,
  Summary, Supporter), `calculateBestWeekStreak` feeds it — a swipeable annual
  recap deck designed for social sharing (`ShareStorie`, `ShareWorkoutModal`).

- **Referral / affiliate — a real growth loop.**
  - `AffiliateProgram`, `AffiliateProgramScreenStack`, `HowDidYouHearScreen`
    plus the Branch SDK = a **public referral/affiliate** program with
    attributable invite links.
  - Plus social invites: `InviteFriend`, `Inviter des Amis`, "invite your
    community to sign up", "invite your workout buddies", contact invites
    (`Inviter vos contacts`). And a **coach↔client** invite system
    (`coachClientInvite`, `acceptCoachInvite`) — separate from peer invites.

### How Volyume does it today (file:line)

Volyume already has a deliberately **no-shame, week-counted** consistency system
and a structured notification category model — more disciplined than Hevy's, by
design.

- **Weekly streak ("weeks running", never the word "streak" in UI):**
  - `src/lib/streakState.js` — pure state: pauses, high-water mark, milestones,
    perfect-months. `MILESTONES = [4, 12, 26, 52]` weeks
    (`streakState.js:25`); `addPauseSpan` renewable without limit
    (`:66`); `pendingPerfectMonth` (`:97`); `longestRun` (`:81`).
  - `src/lib/streak.js` — `detectPerfectMonth` (imported at `streakState.js:23`).
  - `src/hooks/useWeeklyStreak.js` — resolves last 12 weeks against plan/manual
    goal; **session-count fallback when no plan/goal** (`:60`); ED flag is read
    and can suppress the artefact (`:75`).
  - `src/components/WeeklyStreakStrip.js` — home strip; header comment
    (`:8–9`): *"No-shame by construction … the word 'streak' never appears
    (the unit is 'weeks running'); there is no [loss frame]"*.
  - `src/components/StreakWeeksSection.js` — "Your weeks" deep view (COMP-018);
    surfaces silent **streak repair** (`:63`, `:216`); suppressed when ED flag
    set (`:8`); fires `streak_paused` telemetry (`:83`).
  - Surfaced in `src/screens/ConsistencyScreen.js:44–45`.

- **Notification system (mature category model):**
  - `src/lib/notifications/categories.js` — `CATEGORY` enum (`:17–40`):
    `TRAINING_REMINDER`, `DAILY_CHECKIN_REMINDER`, `WEEKLY_CHECKIN_REMINDER`,
    `MORNING_WEIGHT`, `MONTHLY_RECAP`, `YEAR_OF_LIFTS_UNLOCK`, `WINBACK`,
    `TRIAL_DAY3`, `PARTNER_CHEER`, `CHECKIN_MISSED`, `PLANNED_MEAL_CONFIRM`,
    `WEEKLY_COACH_READY`, plus safety in-app types (`ED_PATTERN_LOCKOUT`,
    `FFM_FLOOR_HOLD`). Per-category channel routing (`:55–84`), push/in-app/email.
  - `src/lib/notifications/scheduler.js`, `quietHours.js`, `preferences.js`,
    `telemetry.js`, `budget.js` — quiet hours, per-category telemetry, send
    budget, all enforced uniformly via the category.
  - `src/lib/notifications/trainingReminders.js` — training-reminder scheduling.
  - `src/lib/notifications/missedCheckin.js` — ghost-prevention nudge.
  - `src/lib/notifications/winbackContent.js` — win-back copy.
  - `src/lib/notifications/activeWorkout.js` — active-workout handling.

- **Recaps:** `src/screens/YearOfLiftsScreen.js` — swipeable Year-of-Lifts story
  (`:2`) and the **monthly recap deck** COMP-005 (`:182`, max 8 cards, empty
  cards dropped); a `neutral` mode that drops comparison framing (`:200`).
  `BlockReflectionScreen.js` for per-block reflection.

- **Social / referral:** `src/hooks/usePartners.js` — **1:1 (free) / up-to-3
  (Pro)** training-partner system with `createPartnerInvite`/`redeemPartnerInvite`
  (`:93–99`), `sendCheer` (one per day), shared streak.
  `src/lib/partners/link.js` — invite codes + deep links
  (`buildInviteLinks`, `parseInviteCode`). `src/screens/PartnerScreen.js` —
  derived signals only, privacy receipt, shared streak counted **in weeks**
  (`:38`). Telemetry: `partner_invite_sent` / `partner_invite_accepted`
  (`src/lib/telemetry/events.js:165–166`).
  **No public referral/affiliate program** — invites are partner-pairing only.

- **PR celebration:** `src/components/PRCelebration.js` exists (in-app), but
  there is **no LivePR-style OS notification / sound** mid-workout.

### Gaps

1. **No rest-timer foreground/Live notification.** Hevy's single most-used
   engagement surface is the rest-timer Live Activity / ongoing notification
   (`LiveActivityRestTimer`, `clearFiredTimerNotification`). Volyume's
   notification model has no rest-timer category; if a rest timer exists it
   does not surface as a controllable OS notification. (Note: Core-Haptics /
   live-activity dependency is decision-gated per CLAUDE.md item 14 — flag, do
   not build.)
2. **No public referral / "how did you hear" growth loop.** Hevy runs an
   Affiliate Program + Branch-attributed invite links + contact/community
   invites. Volyume's only social loop is private partner-pairing — there is no
   acquisition referral, no attributable invite, no "how did you hear" capture.
3. **Streak repair / milestone / perfect-month moments are silent.** The state
   exists (`streakState.js`: `pendingMilestone`, `pendingPerfectMonth`, repair),
   and milestones are well chosen (4/12/26/52), but there is **no notification
   category** to surface a reached milestone or a repaired week — Hevy badges,
   celebrates and makes milestones shareable. Volyume earns the moment then
   keeps it in-app and easy to miss.

Other gaps: no shareable milestone/recap card export (Hevy `…Shareable`,
`ShareStorie`); PR celebration is in-app only (no LivePR-equivalent moment, with
sound/haptic, gated behind a setting). These are smaller.

### Recommendations (adopt / adapt)

ED-safe / no-shame constraint applies to **everything** here: never loss-frame
("in danger", "don't break it", flame-going-out), never shame a missed week,
always respect the ED suppression flag and quiet hours, and keep the "weeks
running" unit (never day-counted streaks). Hevy's loss-framing is exactly what
Volyume must **not** copy.

| # | Rec | Adopt/Adapt | Size | Priority |
|---|-----|-------------|------|----------|
| R1 | Add a **milestone / perfect-month / repair notification category** (e.g. `STREAK_MILESTONE`) that fires the already-computed `pendingMilestone`/`pendingPerfectMonth`/repair as a calm, positive push + in-app moment. No loss frame; suppressed under ED flag; respects quiet hours. Reuses `streakState.js` + the category model — low new surface. | Adapt | S | **P1** |
| R2 | Add a **shareable recap / milestone card** (image export of a Year-of-Lifts / monthly-recap card and of a reached milestone), neutral framing, opt-in. Drives organic acquisition the way Hevy's YIR cards do, without a referral programme. | Adapt | M | **P2** |
| R3 | Add a **rest-timer foreground notification** category so the timer is visible/controllable from the lock screen. Decision-gated (live-activity/Core-Haptics dependency, CLAUDE.md item 14) — **surface as a founder decision before building**, do not start. | Adopt | M/L | **P2** |
| R4 | Decision-gate a **referral / "how did you hear" + attributable invite** loop. This is a new growth surface and Branch is a new dependency (ask first per CLAUDE.md). Could extend the existing partner deep-link infra (`partners/link.js`) rather than add an SDK. **Surface as a founder decision; do not build.** | Adapt | L | **P3** |
| R5 | Add an opt-in **PR-celebration moment with sound/haptic** at set completion (adapt `PRCelebration.js`), gated behind a setting, off by default. No new notification needed if in-app. | Adapt | S | **P3** |

### Quick wins

- **R1 (S, P1):** the streak-milestone/repair notification — the engine state is
  *already computed and tested* in `streakState.js`; this is mostly a new
  `CATEGORY` value + scheduler wiring + calm copy. Highest value per effort, and
  it converts already-earned no-shame moments into retention without any
  loss-framing.
- **Copy audit of existing nudges** (`trainingReminders.js`, `missedCheckin.js`,
  `winbackContent.js`): confirm none drift toward Hevy-style loss/shame framing;
  keep "weeks running", never "streak in danger". Zero new code, pure review.
- **Wire the existing `streak_paused` / partner telemetry into Panel 1** so the
  pairing funnel and pause/repair rates are visible before adding loops —
  measure before building R2–R4.
