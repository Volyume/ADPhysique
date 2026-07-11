# C5 — Day-14 factual recap: founder decision memo

**Date:** 2026-07-11 · **Lane:** marketing sequence (C1→C2→C7→C8→C3→**C5**)
**Status:** decision memo only. NO code has been changed and nothing is built
until the founder rules. Fact recon by a read agent, lead-verified at the
two load-bearing points (the day-14 notification slot and the day-3 ED
precedent).

The founder's accepted framing: a possible **factual** recap around day 14
(end of the cardless trial), with **mandatory ED guardrails: no
body-change/outcome language, no weight/food lines under calm mode or an
open ED flag, no thin recap.** Those guardrails are conditions on every
option below, not one of the options.

---

## 1. What "day 14" actually is in the app today (verified facts)

- The cardless 14-day trial starts at Article 9 consent
  (`Article9ConsentScreen.js:142` → `cascade.startCascade()`), and ends at
  `proTrialEndsAt` with the single auto-downgrade to free
  (`cascade.js:381-397`).
- The day is already occupied by UX: a **day-12 push** ("Your free Pro
  trial ends in two days") and a **day-14 push** ("You're back on the free
  plan"), both local one-shots at 10:00, quiet-hours-shifted, in the
  top-priority `CATEGORY.CASCADE_GATE` budget slot
  (`scheduler.js:436-507`). `CascadeGateScreen` (variant `day14`) is
  force-shown once when a lapsed user next opens Home
  (`HomeScreen.js:220-255`); its copy is purely subscription-status, zero
  facts (`CascadeGateScreen.js:73-83`).
- Push budget reality: event pushes are capped at **2/day, 8/week**
  (`budget.js:35-36`), and the day-14 `CASCADE_GATE` push already takes one
  of the two daily slots at the highest priority (`budget.js:43-57`). There
  is no existing category for a recap-at-trial-end push.
- The app already has a recap machine: `RecapStory` (route
  `RootNavigator.js:521`, rendered by `YearOfLiftsScreen` with variants
  `year|month|week|block`), fed by `getRecapData(userId, {startMs, endMs})`
  → totalSessions, totalSets, tonnage, avgSessionsPerWeek, topExercises,
  uniqueExercises, bestSession (`database.js:5933-5992`), plus
  `getWeeklyPRCount`, `getWeeklySessionStats`. **A 14-day factual recap
  needs no new stats engine.**
- The closest precedent is the **day-3 trial value push** (COMP-023,
  `scheduler.js:555-599`): counts-only copy, ED flag read fail-closed
  (`.catch(() => 'read_failed')`), and the push **cancels entirely** under
  any open flag — the exact discipline C5 must inherit.
- Win-back machinery (`lapseDetect.js`/`winbackState.js`) covers only
  paid→free churn, explicitly not trial lapses (`lapseDetect.js:9-19`), so
  nothing existing "already does" a trial-end recap.

## 2. Mandatory guardrails (founder-set; conditions on EVERY option)

1. **No body-change or outcome language.** The recap states what the user
   *did* (sessions, sets, PRs, exercises), never what their body *became*.
   No weight-change numbers, no "progress towards goal", no before/after
   framing — regardless of flags, for every user.
2. **No weight or food lines under calm mode or an open ED flag**, read
   fail-closed via the canonical pattern
   (`getOpenEdPatternFlag(...).catch(() => 'read_failed')`;
   `edFlagFailClosed.guard.test.js` pins the shape; `usePhotoSuppression.js`
   holds the canonical OR). Given guardrail 1 already bans weight outcomes,
   the only flag-sensitive candidates are *activity* lines ("you logged
   food on N days", "N weigh-ins") — under calm/ED these are removed, and
   per the day-3 precedent, if the surface is a push it is **cancelled**,
   not degraded.
3. **No thin recap.** Below a data threshold the recap does not render at
   all — the user sees the existing gate copy, never "You completed 1
   workout." The threshold value is a founder parameter (the existing
   monthly recap uses ≥10 workouts; a 14-day equivalent would be smaller).
4. Free/Pro law is untouched: the recap describes the trial, it does not
   gate or expose anything; product IDs and the cascade mechanics are not
   touched by any option.

## 3. The decision — three forks

### Q1: Where does the recap live?

**Option A — Enrich CascadeGateScreen.** A facts block ("In your 14 days:
N workouts · N PRs · N different exercises") rendered above the existing
Stay-on-Pro/Drop-to-Free choice, on both its entry paths (Subscription
mid-trial, post-lapse Home force-show). Smallest surface; the facts appear
exactly at the pay/stay decision; no notification-budget interaction; but
the moment is inherently an upsell screen, so the recap reads as a sales
argument.

**Option B — A `trial` variant of RecapStory.** The full recap experience
the app already renders for month/week/block, offered from the day-14 gate
(and/or the lapsed Home banner) as "See your first two weeks". Richest and
most native-feeling (recap machinery, suppression logic and share-card
rules already exist there); more build than A; adds a navigation hop
between the user and the pay/stay decision.

**Option C — Fold facts into the existing day-14 push.** Amend
`CASCADE_21_COPY` from static copy to counts-aware copy (the day-3 push
pattern). No new budget slot needed (same push), but pushes render outside
the app where suppression context is thinnest; per the day-3 precedent the
whole push must fall back to the current static copy (or cancel) under any
flag or on thin data — so the marketing surface silently vanishes for
exactly the users the founder is most protective of, which is correct but
limits reach.

**Option D — No day-14 recap; close C5.** The gate stays as-is. The day-3
value push already carries the "look what you did" moment mid-trial, and
C2's funnel telemetry will show whether the day-14 gate is where users are
actually lost before more surface is spent there.

(A+B or A+C are composable if the founder wants both an in-app block and a
richer story; that is a founder call, not a default.)

### Q2: What facts are in scope?

**Option 1 — Training-mechanics only.** Sessions completed, PRs, unique
exercises, total sets (tonnage optional). Nothing weight- or
food-adjacent exists on the surface at all, so guardrail 2 has nothing to
suppress and the surface is identical for every user — flags never change
what renders, which also means no flag-correlated difference is ever
observable.

**Option 2 — Training + neutral activity counts.** Adds "logged food on N
days" / "N check-ins" style *activity* lines (never contents, never
weights). Shows the breadth of Pro the user actually touched (the thing
they lose on downgrade), at the cost of making the surface flag-sensitive:
under calm/ED those lines are removed (screen) or the surface falls back
entirely (push), with fail-closed reads and a pinned guard test — the same
machinery the day-3 push and weekly story already carry.

### Q3: Thin-recap threshold (parameter, founder-set)

The floor below which no recap renders. For a 14-day window the natural
candidates: **≥3 completed workouts** (roughly one a week plus one — shows
a real pattern), **≥5** (solid habit evidence, fewer users qualify), or a
compound rule (≥3 workouts AND ≥2 distinct weeks touched). Whatever the
number, below it the surface is absent, never apologetic.

## 4. Cost and test obligations (whichever way the ruling goes)

- All options reuse existing data functions; none require a migration, a
  new event name (recap impressions can ride `paywall_shown`-style existing
  events only if the founder wants measurement — otherwise nothing is
  emitted), or a new dependency.
- Options A/B/C each require: the fail-closed flag read in the pinned
  shape (extending `edFlagFailClosed.guard.test.js`'s FILES list), a guard
  test for the no-outcome-language rule (regex over the copy source, same
  class as the R10 clipped-copy lint), a thin-data test, and a device
  checklist including the ED spot-case (open flag → surface
  absent/fallback).
- Option C additionally touches `NOTIFICATIONS_LOCKED.md` territory
  (cascade push copy is documented there) — that doc's rules require the
  change to be recorded, and the identifier strings must not be renamed
  (`scheduler.js:443-447`).

## Build landed — device checklist

Ruling D72 (Option A) built on `CascadeGateScreen.js`: a factual
training-recap block above the Stay-on-Pro / Drop-to-Free choice on the
trial-end variant only. Facts are training-mechanics only (workouts, sets,
exercises, personal bests) so the block is flag-invariant. Run on a physical
Android device from an EAS build (custom native modules, so not Expo Go).

1. **Trial user with 3 or more workouts sees the block.** Sign in as a Pro
   trial account that has logged at least 3 completed workouts inside the
   14-day window. Open the trial-end gate (Subscription screen mid-trial, or
   the force-show after lapse on Home).
   *Expected:* a small neutral card sits between the subtitle and the billing
   period selector, titled "During your trial", with a single facts line such
   as "6 workouts · 48 sets · 7 exercises · 2 personal bests". Counts match
   the trial window. The personal-bests segment is absent if there were no PBs.
   The card is not tappable and has no accent colour.
2. **Fresh trial with fewer than 3 workouts sees NO block.** Sign in as a Pro
   trial account with 0 to 2 completed workouts. Open the trial-end gate.
   *Expected:* no recap card at all — the gate shows exactly its existing
   title, subtitle and choice, never a sparse "1 workout" line.
3. **Payment-failure variant shows no block.** Trigger the payment-failure
   gate (billing failure grace overlay).
   *Expected:* no recap card — the block is trial-end only.
4. **ED spot-check (house rule, weight/food-adjacent surface family).** Sign
   in as a user with an open ED pattern flag, and separately as a user in calm
   mode, each with 3 or more workouts in the trial window. Open the trial-end
   gate.
   *Expected:* the identical recap block renders with the same training facts
   (the block is flag-invariant by design — it reads no flag), and nothing
   weight-, food- or outcome-related appears anywhere on the card. No
   body-change or "progress/results" language. The block is the same for every
   user.
