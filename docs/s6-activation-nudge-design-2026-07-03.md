# S6 — Activation Nudge — DESIGN (from lever research, awaiting founder calls)

Supersedes the "instrument + lever" half of `docs/s6-build-spec-2026-07-03.md`.
Produced by a 3-angle research workflow (retention / ED-ethics / build-fit),
synthesised. Founder chose to INTERVENE, not just measure, and asked for the
best solution for user + retention. This is the recommendation, and the calls
that are the founder's before it ships.

## The lever (recommended)

**A two-stage, gap-triggered, single-shot push + Home banner pair that catches
a brand-new user who has stalled just short of the activation threshold.**

- **Who it reaches.** A signed-in user who has completed **exactly 1** or
  **exactly 2** workouts ever and then gone quiet for **4+ days**, inside the
  first ~14 days (with a 3-day grace to day 17). Reaches BOTH the user who has
  stopped opening the app (via push — the only channel that can) and the user
  who still opens it (via the same-data Home banner, zero extra push budget).
- **Why this population.** The founder's own research: <3 completed sessions in
  14 days = 3-4x churn. `welcomeCard` already covers 0 sessions (in-app) and a
  Pro-teaser covers 3+. The 1- and 2-session stall is the exact unfilled gap,
  and a post-first-session stall is an unambiguous, actionable signal (unlike a
  0-session "hasn't started yet" state, which may just be a busy first week).
- **Self-cancelling.** Logging the next session invalidates the pending stage
  at both schedule and delivery time, so an improving user gets total silence.
  The two stages are mutually exclusive in time, so the lever never competes
  with itself.
- **No migration, no new dependency, no native rebuild.** Reads the existing
  `workouts` table (`getAllWorkouts`) + `getOpenEdPatternFlag`; reuses the
  `COACHING_REMINDERS_CHANNEL`; telemetry rides the existing
  `notification_sent/_tapped/_failed` events (already allow-listed). OTA-
  deployable. Roughly a half-day-to-day build (comparable to `missedCheckin.js`).

## Safety envelope (all reused from existing house patterns)
- **ED-flag suppressed at BOTH schedule and delivery time** (double-check closes
  the schedule-time-goes-stale race; matches every existing event scheduler).
- **Quiet hours always win** (`shiftDateOutOfQuietHours`).
- **Push budget respected** (`requestEventPriority`/`requestEventPushSlot`;
  one-per-topic-per-day; at most one nudge ever pending per user).
- **Forward-looking, no-shame copy** (no "you missed", no "behind", no streaks);
  British English, no em dash. Voice sign-off at PR per house convention.
- **One-tap disable** as its own category.

## Draft copy (voice sign-off required at PR)
- Stage 1 push: *"One session down" / "Your next session is ready in your plan
  whenever you are."*
- Stage 1 banner: *"You've made a start" / "A second session is what turns a
  first one into a habit. Your next one is ready in your plan whenever you
  are."*
- Stage 2 push: *"Two sessions in" / "One more and this starts to feel
  automatic. Your plan is ready whenever you are."*
- Stage 2 banner: *"You're nearly there" / "That's two done. A third is what
  makes the habit stick."*

## The founder's calls (this is what needs your sign-off)
1. **Approve a new push category** `activation_nudge` as a PROPOSED addendum to
   `NOTIFICATIONS_LOCKED.md` (the file's own convention: founder reviews at PR).
2. **Tier**: tier-blind (reaches free + Pro-trial) vs Pro-only. Activation is a
   FREE action, so tier-blind reaches more of the at-risk population, but it is a
   deliberate deviation from other levers' Pro-only gating.
3. **Scope**: the 2-stage (1->2, 2->3) design vs also building the **0-session
   cold-start** push now (deferred here because its exit condition is unresolved
   — `lapseDetect.js` is built for post-active churn, not never-active accounts).
4. **Eviction priority** on a rare same-day budget collision: rank the nudge
   **above** `checkin_missed` (a brand-new user's activation outranks an engaged
   Pro user's missed check-in — retention-first) vs **below** (conservative).
5. **Home banner placement**: recommended above the free-tier Pro-upsell banners
   (retention over monetisation for a barely-active new user).
6. **Timing defaults**: 4-day stall gap, 3-day post-14-day grace — reasoned first
   cut, tunable once `notification_sent/_tapped` telemetry accumulates.
7. **Disable mechanism**: follow whichever the newest category uses (verify
   legacy `NOTIF_PREFS_KEY` blob vs newer `preferences.js` SQLite at build time).

## Build plan (once the calls are made)
1. `src/lib/activationNudge.js` (pure): `resolveActivationStage(...)`,
   `activationNudgePush(stage)`, `activationBannerLine(stage)`, constants; built
   on the already-committed `src/lib/activation.js` model. Colocated tests incl.
   a banned-shame-phrase guard.
2. `categories.js` (+CATEGORY.ACTIVATION_NUDGE), `budget.js` (EVENT_PRIORITY),
   `scheduler.js` (schedule/cancel + wire into `restoreNotifications`),
   `ActiveWorkoutScreen.js` (best-effort call beside `first_workout_logged`),
   `handler.js` (foreground double-check), `HomeScreen.js` (banner slot),
   Notifications settings (toggle row), `NOTIFICATIONS_LOCKED.md` (addendum).
3. Tests: scheduler ED/quiet-hours/budget/single-shot; HomeScreen banner slot.
4. On-device EAS checklist (per CLAUDE.md) + full `jest --runInBand` gate.

## Honest gaps (not parked silently)
- **0-session accounts that never reopen** get no push lever in this build
  (in-app `welcomeCard` only). Deferred deliberately; decision 3 above.
- **Install date = account_created**, not true install (no install-date field
  exists); a re-sign-in days later mis-calibrates the window slightly. Shared
  with every other lever anchored this way.
- Timing defaults are reasoned, not A/B-proven (decision 6).
