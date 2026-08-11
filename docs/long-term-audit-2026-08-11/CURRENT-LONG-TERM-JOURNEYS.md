# CURRENT LONG-TERM JOURNEYS - traced from main, 2026-08-11

Campaign 6, Phase 1 ("BUILD THE CURRENT LONG-TERM JOURNEY MAP"). Authority: the
founder's Campaign 6 order, Phase 1, verbatim: *"Map the actual current
behaviour for: A ... P. Do not assume behaviour. Trace current main."*
Constraints: `docs/long-term-audit-2026-08-11/CAMPAIGN-LOG.md`.

**Baseline.** Branch `claude/campaign6-long-term`, identical to main `5764a947`
plus campaign docs.

**Method.** Every claim below is read out of the source on this tree and carries
`file:line`. Where a doc comment and the code disagree, the CODE is recorded and
the disagreement is listed as a seam. Nothing here is inferred from a docs
summary. Nothing outside this file was modified.

**Reading key.** "Seams noticed" are candidate defects, ambiguities or
characterisation items for later phases. They are NOT fixed here and NOT ruled
on. Where behaviour depends on an unapplied migration (132-135) or a known
deferral (D91-24 / D91-25) that is stated explicitly with the migration file or
register entry.

---

## 0. Shared mechanics the personas depend on

These are traced once and referenced by anchor from the personas.

### 0.1 Tier resolution (S-TIER)

1. `src/lib/proGate.js:28` - `PRO_BETA_ACTIVE = false`. Tier comes from real
   trial/subscription state.
2. `src/lib/proGate.js:39-53` - `_resolveTier(trialState, betaActive)`:
   `paid_pro`, `pro_trial_active`, `paid_complete`, `complete_trial_active` map
   to `'pro'`; `free`, `cascade_expired`, `unstarted` and anything unknown map
   to `'free'`. `src/lib/proGate.js:62-64` - `isPaidTier(userProfile)` reads
   `userProfile.trialState`.
3. The live gate that screens actually consult is `store.tier`, not
   `isPaidTier`: `src/components/ProGate.js:289` (`withProGuard`) and the
   Pro-gated route list `src/navigation/RootNavigator.js:208-249`.
4. `store.tier` is written by four paths:
   `src/store/useAppStore.js:696-719` (`checkTier`, cold launch from
   `@volyume_tier` plus a LOCAL trial-expiry override at `:706-714`),
   `:727-771` (`setTier`, persists to AsyncStorage BEFORE the in-memory set),
   `:1001-1078` (`refreshTierFromCloud`, server-authoritative), and
   `:610-623` (`setOptimisticPaid`, a 5-minute optimistic window at `:611`).
5. `src/store/useAppStore.js:706-714` is the only client-side downgrade of a
   trial: `trial_state === 'pro_trial_active'` AND `Date.now() > pro_trial_ends_at`
   forces `'free'`. Paid lapses are NOT enforced here (comment `:699-705`).

### 0.2 Launch pipeline (S-LAUNCH)

1. Cold launch: `src/navigation/RootNavigator.js:1004` awaits `checkTier`,
   then `:1006-1063` reads the Supabase session. With a session it hydrates
   `userProfile` from `@volyume_user_profile_<uid>` (`:1022-1039`), fires
   `refreshTierFromCloud(...).then(() => _reconcilePaidEntitlement(...))`
   (`:1044-1046`), initialises billing (`:1054-1058`) and **returns at
   `:1062`**.
2. `restoreNotifications` is only reached at `src/navigation/RootNavigator.js:1093-1099`,
   which sits AFTER that return - i.e. only on the **no-session** branch. The
   only other caller is
   `src/lib/notifications/scheduler.js:1234`, inside `rescheduleForTimezoneIfChanged`,
   which self-gates on a changed timezone offset (`:1226-1231`) and is invoked
   from `App.js:992-994` on foreground.
3. Auth enter (`SIGNED_IN` or `INITIAL_SESSION`):
   `src/navigation/RootNavigator.js:1176-1209` with a 3s dedup, then
   `restoreSessionFromCloud` (`:1295`), `refreshTierFromCloud` +
   `_reconcilePaidEntitlement` (`:1300-1301`), and a consent-gated
   `syncAll({triggeredBy:'sign_in'})` (`:1446-1467`).
4. `_reconcilePaidEntitlement` (`src/navigation/RootNavigator.js:184-199`) calls
   `cascade.reconcilePaidEntitlement` then `lapseDetect.handlePotentialLapse`.
5. Ongoing triggers, `App.js:984-1035`: foreground `syncAll`, timezone re-lay,
   habit-schedule refresh; network reconnect; a 15-minute periodic `syncAll`.

### 0.3 Block week maths (S-BLOCK)

1. `src/lib/mesocycle.js:73-79` - `localDaysElapsed`, the shared DST-safe day
   counter.
2. `src/lib/mesocycle.js:106-124` - `getCurrentMesoWeek(start, experience, now, {wrap})`.
   `wrap: true` (default) wraps modulo the 5- or 6-row EXPERIENCE schedule
   (`:123`); `wrap: false` clamps to `schedule.length` (`:122`). The header at
   `:85-98` records that this function has **zero production callers** and is
   retained as a DST oracle and single-resolver guard; the live resolvers are
   `getCurrentBlockWeekIndex` (`:151-158`) and `getBlockStatus` (`:457-496`).
   Confirmed by grep: no `src/` caller outside `mesocycle.js` and its tests.
3. `src/lib/mesocycle.js:457-496` - `getBlockStatus`. `currentWeek =
   floor(days/7)+1` (`:469`), unclamped. Status is `active` (`:481`) while
   `currentWeek < plannedWeeks`, `recovery` (`:483`) at exactly `plannedWeeks`,
   otherwise `completed_awaiting_decision` (`:485`).
   `weeksOverdue = max(0, currentWeek - recoveryWeek - 1)` (`:493`), so it is 0
   in the first post-recovery week.
4. Blocks are always 6 weeks: `src/lib/mesocycle.js:28-29`
   (`BLOCK_PLANNED_WEEKS = 6`, `BLOCK_DELOAD_WEEK = 6`), written by
   `src/lib/database.js:3742-3756`.
5. `src/lib/database.js:4065-4103` - `getCurrentMesocycleWeek` clamps the row
   lookup to `getCurrentBlockWeekIndex` (`:4071`) and carries
   `awaitingDecision` from `getBlockStatus` (`:4075`). A finished block
   therefore always resolves to the **deload row** (week 6) with
   `awaitingDecision: true`.
6. There is no automatic block transition anywhere: `getBlockStatus` never
   writes, and the only block creators are `activatePlanWithBlock`
   (`src/lib/database.js:3715`) and its callers.

### 0.4 The adaptive memory chain (S-MEMORY)

Order of operations when a finished block is turned into the next block's
volume:

1. `src/lib/blockLedgerRunner.js:93-277` - `computeAndStoreBlockLedger`.
   Hard precondition `status.awaitingDecision` (`:106-107`); idempotent reuse of
   a stored ledger at the current version (`:109-114`); suppression read
   fail-closed (`:78-83`, ED flag OR calm OR read failure).
2. Per-muscle performance: `src/lib/blockMetrics.js:140-392`.
3. Per-muscle recovery/systemic: `src/lib/blockLedgerGather.js:74-117`,
   `:124-138`, `:147-173`.
4. Classification and proposal: `src/lib/interBlock.js:130-371`
   (`classifyMuscleBlock`) and `:384-414` (`buildBlockLedger`). Suppression /
   stale-evidence hold at `:240-245`; `STALE_EVIDENCE_WEEKS = 4` at `:88`.
   `weeksSinceBlockEnd` is fed from `status.weeksOverdue`
   (`src/lib/blockLedgerRunner.js:259`).
5. Block-grain memory: `src/lib/learnedRange.js:90-184`
   (`computeLearnedRange`). `MIN_ENTRY_CONFIDENCE = 0.6` (`:50`),
   ceiling step ≤ 2 (`:51`), floor step ≤ 1 monotone-down (`:52`,
   `:170-178`); suppressed entries never raise the ceiling (`:153-160`);
   manual-override blocks do not teach (`:138`); INSUFFICIENT_DATA skipped
   (`:134`).
6. Seeding fallback chain: `src/lib/blockSeed.js:52-174`, in order -
   manual (`:69-79`), valid ledger (`:81-149`), learned band (`:151-161`),
   profile-adjusted research (`:163-169`), raw research (`:171-173`).
7. Write: `src/lib/database.js:4161-4240` (`generateInitialPlannedVolume`),
   called from `activatePlanWithBlock` (`:3760`). The row's `source` column
   records `seed_<source>` or `template` (`:4201`).

### 0.5 Sync (S-SYNC)

1. Registry: `src/lib/sync/registry.js:22-250`. 22 tables; `last_write_wins`
   for most, `server_wins` + `pull_only` for `daily_intake_rollups`,
   `cardio_log`, `ed_pattern_flags`, `tier_history`; `merge` for `profiles`.
2. Runner: `src/lib/sync/runner.js:90-345`. Article 9 fail-closed gate
   (`:105-114`), live-session check (`:127-136`), single run lock (`:137-140`),
   per-table push (`:204-226`) then legacy bulk push (`:228-251`), then
   per-table pull (`:253-278`) then legacy bulk pull (`:281-292`).
   **Push always precedes pull.**
3. Watermarks: `src/lib/sync/watermark.js:28-29` (pull/push prefixes),
   `:69-71` (`nextWatermark` never moves backwards), `:74-90`. They live in
   AsyncStorage, which sign-out clears (`:16-19` header, and
   `src/store/useAppStore.js:541`).
4. Conflict: `src/lib/sync/conflict.js:23-69`. `last_write_wins` compares
   `updated_at` (`:71-77`); `merge` uses `column_updates_at` per column
   (`:86-102`).
5. Legacy pull: `src/lib/sync.js:1485-1698`, gated on `healthConsent === true`
   (`:1496-1506`). Restores exercises, workouts+sets, programmes, routines,
   mesocycles, morning weights, coach outputs, body profile, insights, notes,
   goals, peak-week plans, planned volume, custom exercises and prefs.
6. Profile field map: `src/lib/sync/tables/profiles.js:30-43`. Exactly nine
   fields cross the wire: `firstName`, `units`, `trainingFocus`,
   `trainingAgeYears`, `primaryEquipment`, `barWeight`, `dietPreference`,
   `sex`, `mealPlanExcludeTags`.
7. Guarded prefs: `src/lib/sync.js:1383-1392` (`@volyume_landmarks_*`,
   `@volyume_wellbeing_mode`), stamp on local write `:1404-1409`, pull filter
   `:1952-1986` with a calm ratchet at `:1981` (a locally-calm device never
   accepts a non-calm cloud value).

---

## A. Continuously active FREE user

### Trace

1. **Launch.** S-LAUNCH 1-3. `store.tier` resolves `'free'` from
   `@volyume_tier` (`src/store/useAppStore.js:698`) and is reconciled by
   `refreshTierFromCloud` (`:1020-1069`). `reconcilePaidEntitlement` returns
   immediately at `src/lib/payments/cascade.js:282` because `trial_state !== 'paid_pro'`.
2. **Home.** `HomeScreen` loads `getCurrentMesocycleWeek` (S-BLOCK 5) into
   `currentMesoWeek` (`src/screens/HomeScreen.js:1180-1181`) and composes
   `readinessSummary` (`:1509-1516`). The coach brief is the tier-blind
   `buildCoachBrief` (`src/lib/homeCoachBrief.js:10-73`) with the content-free
   default suppressed (`src/screens/HomeScreen.js:1494-1496`).
3. **Banners.** One at a time by fixed priority
   (`src/screens/HomeScreen.js:1518-1600`). `showCoachBanner` requires
   `tier === 'pro'` (`:1546`). The free-tier weekly one-liner and the
   differential paywall are the free-side surfaces
   (`src/lib/differentialPaywall.js:11-36`: free tier + 2-of-3 adherence
   deviation + one of four contexts; the two distress contexts were removed as
   triggers, `:21-29`).
4. **Streak.** `src/hooks/useWeeklyStreak.js:50-212`, tier-blind. Target comes
   from the active plan's routine count (`:66-73`) or a manual goal
   (`:112-119`), lower of the two wins (`:117`). Window starts at the first
   completed workout's week (`:85-97`). `computeStreak`
   (`src/lib/streak.js:125-147`) labels weeks and one lone miss per rolling six
   is repaired (`:48-61`). High-water within the current week key prevents a
   retro shrink (`src/hooks/useWeeklyStreak.js:145-151`).
5. **Training.** Logging, PRs, exercise library, plan builder and plan library
   are all ungated. PR detection: `src/screens/ActiveWorkoutScreen.js:1674-1726`
   (working sets only, `:1674-1677`; FQ-7 first-exposure baseline at
   `:1689-1712`).
6. **Block lifecycle.** At week 6 `getBlockStatus` returns `recovery`; from
   week 7 `completed_awaiting_decision` (S-BLOCK 3). PlansScreen calls
   `getBlockAdvice(..., { isPro: tier === 'pro' })`
   (`src/screens/PlansScreen.js:243`). For free,
   `buildNextBlockRecommendation` takes the `!isPro` branch
   (`src/lib/blockAdvisor.js:255-265`): `recommendation: null`,
   `coached: false`, and copy that offers a plain repeat.
7. **The two options are a constant of the surface.**
   `buildNextBlockOptions` (`src/lib/blockAdvisor.js:190-214`) always returns
   both; `repeat` has `requiresPro: false, locked: false` (`:199-200`),
   `adjust` has `requiresPro: true, locked: !isPro` (`:209-210`).
8. **Restarting.** `handleRestartPlan('repeat')`
   (`src/screens/PlansScreen.js:342-437`). `seedIntent` is forced to
   `'repeat'` for a non-Pro user (`:397`). `buildSeedRangesForNextBlock`
   (`src/lib/blockLedgerRunner.js:322-382`) still runs, still computes and
   persists the ledger (`:335-337`), still replays `computeLearnedRange`
   (`:359-365`) and still calls `resolveSeedRange` (`:367-375`). Only
   `getAdaptedLandmarks` is tier-gated
   (`src/lib/effectiveLandmarks.js:117-118`).
9. **Result of a free repeat.** `resolveSeedRange` with `intent === 'repeat'`
   returns the finished block's own `observed.startSets` / `observed.plannedPeak`
   (`src/lib/blockSeed.js:98-101`), source `'ledger'`, and no `deloadSets`
   (gated out at `:126`). Those numbers are written into the new block's
   `planned_muscle_volume` rows with `source = 'seed_ledger'`
   (`src/lib/database.js:4192-4218`).
10. **Notifications.** Weight prompts and the check-in reminder are re-laid for
    Pro only (`src/lib/notifications/scheduler.js:1255-1274`). Training
    reminders are tier-blind (`:1372-1379`). The activation nudge is tier-blind
    (`:922-1013`) but hard-stops past its window (`:952`).

### Seams noticed (A)

- **A-1.** A Free user's next block IS seeded from a persisted Block Ledger via
  the `'repeat'` path (`src/lib/blockSeed.js:98-101`,
  `src/screens/PlansScreen.js:397-403`). The numbers are the user's own
  previous block, so it is arguably "training, not coaching" per
  `src/lib/blockAdvisor.js:199-200` - but the ledger computation, the learned
  range replay and the `seed_ledger` provenance label all run for Free. The
  tier boundary is drawn at the *intent*, not at the *machinery*.
- **A-2.** If the finished block classifies INSUFFICIENT_DATA, `ledgerValid` is
  false (`src/lib/blockSeed.js:88-92`) and the chain falls through to the
  **learned band** at `:151-161`, which has **no tier gate**. A Free user can
  therefore receive a `source: 'learned'` seed built from multi-block history.
  This is the sharpest tier-boundary question in the memory chain.
- **A-3.** `buildCoachBrief` rule 3 (`src/lib/homeCoachBrief.js:33-40`) fires at
  `lastWorkoutDaysAgo >= 5` with no upper bound, so the same "Good to see you
  back. Ease in." line serves a 5-day gap and a 5-month gap.
- **A-4.** The block decision card lives only on the Train tab
  (`src/screens/PlansScreen.js:746-748`) and is snoozeable for 7 days via a
  **non-per-uid** key `@volyume_block_snooze`
  (`src/screens/PlansScreen.js:46, :441`). Home only says "Block finished.
  Targets hold at recovery-week volume until you choose what comes next."
  (`src/screens/HomeScreen.js:1510`).

---

## B. Continuously active PRO user

### Trace

1. **Launch and tier.** S-LAUNCH. For `trial_state === 'paid_pro'`,
   `reconcilePaidEntitlement` (`src/lib/payments/cascade.js:279-363`) runs on
   every launch: reads `readPaidEntitlementVerifiedAt`
   (`src/store/useAppStore.js:630-636`), computes the 24h grace window
   (`cascade.js:255, :287-296`), reads Play (`:313-327`) and either re-stamps
   the verified clock (`:330-333`) or defers/downgrades.
2. **Weekly loop.** Check-in reminder is a one-shot DATE trigger
   (`src/lib/notifications/scheduler.js:392-453`, trigger at `:437-441`),
   re-laid after each submitted check-in
   (`src/screens/WeeklyCheckInScreen.js:855`) with a skip-this-week guard
   (`scheduler.js:468-528`).
3. **Coach output.** `runWeeklyCoach` gates on
   `weeksInPhase >= 2 && morningWeights.length >= 4`
   (`src/lib/weeklyCoach.js:819`); below that it returns the baseline output
   (`:845-849`). `weeksInPhase` is computed in the screen as wall-clock weeks
   since `userProfile.phaseStartedAt`
   (`src/screens/CoachOutputScreen.js:1599-1602`).
4. **Apply.** Autonomy from `userProfile.coachAutonomy ?? 'collaborative'`
   (`src/screens/CoachOutputScreen.js:1016`). `'coached'` auto-walks the apply
   list (`:2129-2168`) unless `output.autoApplyHoldActive` (`:2133`).
5. **Block end.** `getBlockAdvice(..., { isPro: true })` produces a coached
   recommendation: `repeat` when no high signals and `avgReadiness >= 60`
   (`src/lib/blockAdvisor.js:273-289`), `adjust` when `highSignals <= 1 ||
   avgReadiness >= 50` (`:293-309`), otherwise `consider_rebuild` (`:312-329`).
6. **Adjust path.** `seedIntent = 'adjust'`
   (`src/screens/PlansScreen.js:397`) → full ledger proposal
   (`src/lib/blockSeed.js:93-148`), including a strain-scaled deload week
   (`:124-147`), then `recordSeedOutcome`
   (`src/lib/blockLedgerRunner.js:391-407`) and a seed receipt
   (`src/screens/PlansScreen.js:418-427`).
7. **Compounding, per muscle.** RESPONSIVE retains by default; `+1` only on the
   `doseResponse` pair AND not suppressed AND not stale AND composite
   confidence ≥ 0.6 (`src/lib/interBlock.js:342-345`). The start is capped at
   `learnedCeiling - 2` and at MAV (`:348-349`); the peak is the learned
   ceiling when earned, else `min(rampTop, max(plannedPeak, start))` (`:351`).
8. **Learned band growth.** Ceiling steps ≤ 2 per block toward the running
   maximum handled peak (`src/lib/learnedRange.js:153-161`). Floor only ever
   moves down, ≤ 1 per block (`:170-178`). Research MEV out-ranks every cap
   (`:104-111, :122-125`).

### Seams noticed (B)

- **B-1.** `phaseStartedAt` is written in **exactly one place**:
  `src/screens/ProOnboardingScreen.js:1066`. A phase change
  (`src/screens/ProGoalSetupScreen.js:262-286`) does NOT reset it. So
  `weeksInPhase` (`src/screens/CoachOutputScreen.js:1599-1602`) is weeks since
  *onboarding*, not weeks in the current phase. A one-year Pro user sees
  "Week 53 · <current phase>" regardless of how many phases they have run.
- **B-2.** Because `weeksInPhase` never resets, the `weeksInPhase >= 2` half of
  `hasEnoughData` (`src/lib/weeklyCoach.js:819`) is permanently satisfied after
  week 2 of the account. A brand-new phase never re-enters the honest baseline
  period; it gets full trend coaching from day one on a weight series that
  spans the previous phase.
- **B-3.** `checkinReadiness` (`src/lib/blockAdvisor.js:47-75`) renormalises to
  energy/soreness 0.5/0.5 when sleep is unknown (`:70-72`) while the block
  ledger's slope deliberately uses a sleep-free score for every week
  (`src/lib/blockLedgerRunner.js:157-163`). Two readiness scales coexist; only
  the ledger path is scale-consistent.
- **B-4.** `computeAndStoreBlockLedger` is frozen once written
  (`src/lib/blockLedgerRunner.js:109-114`). The `weeksSinceBlockEnd` staleness
  input is captured at first computation (`:259`), so a ledger computed in the
  first post-recovery week keeps `weeksSinceBlockEnd: 0` forever even if the
  user acts on it months later. See F/G/H and P for the consequence.

---

## C. PRO → FREE (trial expiry, subscription expiry)

### Trace

**C.i Trial expiry (14-day cardless in-app trial).**

1. Trial start writes `trial_state = 'pro_trial_active'` plus
   `pro_trial_ends_at` via `start_cascade`
   (`src/lib/payments/cascade.js:105-166`), mirrors tier to `'pro'` awaited
   (`:131`), mirrors the profile fields (`:133-141`) and lays the gate pushes
   (`:151-163`).
2. `refreshTierFromCloud` caches `trial_state` and `pro_trial_ends_at` into
   AsyncStorage on every run (`src/store/useAppStore.js:1039-1043`).
3. At the next cold launch after the end instant, `checkTier`
   (`src/store/useAppStore.js:706-714`) forces `tier = 'free'` locally and
   persists it. This is the **only** device-side trial downgrade.
4. The authoritative server downgrade is `autoDowngrade('free', ...)`
   (`src/lib/payments/cascade.js:387-403`), driven by the server cron, not the
   client (`:388-391`).
5. `lapseDetect` deliberately does **not** fire for a trial expiry:
   `reconcilePaidEntitlement` returns at `cascade.js:282` for any
   `trial_state !== 'paid_pro'`, and the module header says so at
   `src/lib/payments/lapseDetect.js:17-18`.
6. Notifications: `NOTIF_ID_CASCADE_19` / `_21` fire at trial end − 2 days and
   trial end (`src/lib/notifications/scheduler.js:512-528, :531-592`).

**C.ii Paid subscription expiry.**

1. `reconcilePaidEntitlement` (`src/lib/payments/cascade.js:279-363`) is the
   authoritative client-side churn signal because the RTDN push subscription is
   not wired (`:259-263`).
2. Four outcomes:
   - No real Play provider AND past the 24h grace → local-only lockdown
     `lockStalePaidEntitlement` (`:305-310` → `src/store/useAppStore.js:644-648`),
     reason `stale_no_provider`.
   - Play read threw AND past grace → same lockdown, reason
     `stale_read_failed` (`:320-325`).
   - Play read succeeded and reports active → `markPaidEntitlementVerified`
     (`:330-333`).
   - Play read succeeded, reports inactive, and the last verified-active stamp
     is inside grace → `deferred: true`, no downgrade (`:344-354`).
     Past grace → `cancel('client_reconcile')` (`:357`), which calls
     `upgrade_tier` with reason `user_cancelled` (`:405-414`).
3. `handlePotentialLapse` (`src/lib/payments/lapseDetect.js:48-96`) treats only
   the last case as authoritative (`isAuthoritativeLapse`, `:31-36`: downgraded
   AND inactive AND **no** `reason` field - the stale lockdowns carry one).
4. On an authoritative lapse it: opens a churn episode
   (`winbackState.openEpisode`, `:67`), cancels the morning and evening weight
   prompts (`:79-84`) and lays the single win-back (`:88-92`).
5. `PostLapseSheet` shows once per episode
   (`src/components/PostLapseSheet.js:37-60`, gated by
   `shouldShowPostLapseSheet`, `src/lib/payments/winbackState.js:104-107`).
   Copy at `PostLapseSheet.js:30`: everything logged is saved; training, plans
   and progress stay free.
6. Post-downgrade the user keeps every Free surface (persona A) and loses every
   `withProGuard` route (`src/navigation/RootNavigator.js:208-249`).
7. Local training data is untouched: nothing in the downgrade path calls the
   wipe. `wipeAllUserData` runs only on sign-out/delete
   (`src/store/useAppStore.js:512-534`).

### Seams noticed (C)

- **C-1.** The stale-entitlement lockdown (`stale_no_provider` /
  `stale_read_failed`) downgrades `store.tier` to `'free'` locally
  (`src/store/useAppStore.js:644-648`) but **never** cancels the two daily
  weight prompts, because `handlePotentialLapse` rejects it as non-authoritative
  (`src/lib/payments/lapseDetect.js:35`). The remedial cancel at
  `lapseDetect.js:79-84` exists precisely because the off-switch is Pro-gated -
  and this branch reaches the same "Pro screens gone, prompts still firing"
  state by a different door.
- **C-2.** A trial expiry never cancels the coaching weight prompts either: the
  trial path never reaches `handlePotentialLapse` (`cascade.js:282`,
  `lapseDetect.js:17-18`), and `restoreNotifications` - the Pro-gated re-lay
  that would stand them down (`scheduler.js:1255-1266`) - does not run for a
  signed-in user (S-LAUNCH 2).
- **C-3.** `checkTier`'s local trial expiry (`useAppStore.js:706-714`) only runs
  at cold launch. A device left foregrounded across the trial end instant keeps
  `tier === 'pro'` until `refreshTierFromCloud` lands from a foreground sync or
  the next launch.
- **C-4.** `stageOf` and `canStillTrial` (`src/lib/payments/cascade.js:449-472`)
  map an unknown/absent `trial_state` to `'unstarted'` and
  `canStillTrial: true`. A profile that failed to hydrate therefore reads as
  trial-eligible on the paywall CTA.

---

## D. FREE → PRO (upgrade)

### Trace

1. Entry: `ProUpgradeScreen`. `completeUpgrade`
   (`src/screens/ProUpgradeScreen.js:225-291`).
2. It never writes tier from the client for the paid path (`:236-239`
   comment). It pushes local data (`:240-245`) then branches on
   `cascade.canStillTrial(userProfile)` (`:246`).
3. **Trial-eligible branch** (`:246-289`): `startCascade()` (`:255`),
   fail-closed on a missing `trial_state` (`:270-273`), then
   `setTier('pro', 'ProUpgrade.trialStart')` if needed (`:285-287`) and
   `resetFirstRun()` (`:289`).
4. **Purchase branch** (`:290`): `subscribePro()` (`:168-223`) →
   `playBilling.purchasePackage` (`:180`) → `cascade.payAt('pro', ref, ...)`
   (`:182`, which calls `setOptimisticPaid`, `cascade.js:186`) →
   awaited `cascade.confirmPurchase` (`:191-193`), which invokes the store
   verifier edge function and then `refreshTierFromCloud`
   (`cascade.js:228-241`).
5. Success state (`src/screens/ProUpgradeScreen.js:415-437`): if
   `!firstRunComplete`, `startSetup()` calls `resetFirstRun()` (`:425`).
6. `resetFirstRun` (`src/store/useAppStore.js:1101-1125`): refuses when a
   workout is live (`:1102-1109`), writes `FIRST_RUN_KEY` and the per-uid key
   to `'false'` (`:1112-1113`), sets `firstRunComplete: false` (`:1115`) and
   clears the wizard's build record (`:1119-1122`).
7. RootNavigator then mounts the Pro onboarding stack. At the end,
   `ProOnboardingScreen` writes the profile including
   `phaseStartedAt: Date.now()` (`:1066`), `goalPhase`
   (`:1047`), the nutrition goal key (`:1084`) and lays the first check-in
   reminder (`:932-943`).
8. **What carries over.** Everything in local SQLite: workouts, sets, PRs,
   exercises, notes, plans, routines. Nothing in the upgrade path deletes local
   rows.
9. **What is replaced.** The onboarding wizard generates a new plan via
   `generateAndSavePlan` → `activatePlanWithBlock(userId, prog.id, planName)`
   with **no** `ledger` argument (`src/lib/planAutoGen.js:223`), so
   `generateInitialPlannedVolume` writes the static MEV→MAV template ramp
   (`src/lib/database.js:4184-4217`, `source = 'template'` at `:4201`) and
   `archiveOtherUserPlans` archives every other plan (`planAutoGen.js:230`).

### Seams noticed (D)

- **D-1.** A Free user with months of training history who upgrades gets a
  **template** first Pro block: `planAutoGen.js:223` passes no ledger, so the
  seeding chain (S-MEMORY 6) is never consulted, even though their previous
  blocks carry a persisted `block_ledger` and a computable learned band. The
  compounding promise resets at the tier boundary.
- **D-2.** `resetFirstRun` clears the build record and flips the navigator, but
  the previous plan's active block remains `is_active = 1` until the wizard's
  `activatePlanWithBlock` runs its deactivate-then-insert transaction
  (`src/lib/database.js:3742-3756`). If the user abandons the wizard mid-way the
  old block is still live and `firstRunComplete` is `false`.
- **D-3.** `completeFirstRun` (`src/store/useAppStore.js:1139-1174`) mirrors
  `first_run_complete: true` to the cloud fire-and-forget (`:1166-1170`) with no
  retry queue, unlike the consent and cascade retries
  (`src/lib/payments/pendingCascade.js:64-86`).
- **D-4.** The optimistic paid window is 5 minutes
  (`src/store/useAppStore.js:611`) while `confirmPurchase` awaits a network
  round trip plus `refreshTierFromCloud`. A purchase whose server grant lands
  later than the window reverts to free until the next successful refresh.

---

## E. PRO lapse → later RESUBSCRIBE

### Trace

1. Lapse opens a churn episode: `openEpisode` is idempotent and preserves an
   existing episode (`src/lib/payments/winbackState.js:88-98`). Episode shape:
   `{ lapseAt, reasonCaptured, winbackLaid }` (`:92`), plus `lapseSheetShown`
   (`:109-116`).
2. Win-back fire date: `winbackFireDate(lapseAt, statedReturn)`
   (`:55-58`) - `lapse + 30d` by default (`:41`), or 30/75/60 days from the
   stated-return map (`:43-47`).
3. `canLayWinback` (`:64-68`) enforces one per episode and an absolute
   180-day floor across episodes (`WINBACK_FLOOR_MS`, `:39`).
4. `scheduleWinbackNotification`
   (`src/lib/notifications/scheduler.js:708-786`): no episode → cancel
   (`:711`); ED flag fail-closed → cancel (`:719-721`); a past fire date is
   never chased (`:727`); budget block returns without marking laid
   (`:756-757`); copy is built from session counts only, never weight or
   calories (`:739-750`).
5. **Return via Restore purchases.** `restorePurchases`
   (`src/lib/payments/restore.js:30-88`): reads Play (`:33`), maps the `'pro'`
   entitlement (`:42`), short-circuits when local state already matches
   (`:51-53`), otherwise `payAt` for the optimistic unlock (`:61`) and an
   awaited `confirmPurchase` (`:72-80`) whose failure does not fail the restore
   (`:77-79`).
6. **Return via purchase.** `subscribePro` as in D, with the win-back Play offer
   preferred when the user arrived from the win-back push
   (`src/screens/ProUpgradeScreen.js:180`).
7. **Episode closure.** On the next reconcile that reports active,
   `handlePotentialLapse` clears the episode and cancels the scheduled win-back
   (`src/lib/payments/lapseDetect.js:50-62`), but only when an episode is
   actually open (`:54`). `clearEpisode` deliberately keeps the 180-day floor
   key (`src/lib/payments/winbackState.js:155-160`).
8. **Data on return.** Local SQLite was never wiped by the lapse, so training
   history, PRs, food diary and check-ins are all still there. Pro screens
   unlock the moment `store.tier` flips.
9. **Coach state on return.** `weeksInPhase` keeps counting (B-1), the block is
   `completed_awaiting_decision` with a large `weeksOverdue`
   (`src/lib/mesocycle.js:493`), and the seeding chain behaves as in F/G/H.

### Seams noticed (E)

- **E-1.** The win-back has exactly one lay opportunity for a signed-in user.
  `markWinbackLaid` is only reached on a successful schedule
  (`scheduler.js:777`), and the documented re-lay path - "the next app-open
  re-lay retries the same window" (`scheduler.js:756-757`) - is
  `restoreNotifications`, which does not run for a signed-in user (S-LAUNCH 2).
  `reconcilePaidEntitlement` cannot re-fire it either, because a downgraded user
  is no longer `paid_pro` and returns at `cascade.js:282`. A budget block or an
  open ED flag at lapse time therefore loses the win-back permanently for that
  episode.
- **E-2.** The 180-day floor survives `clearEpisode`
  (`winbackState.js:155-160`) but the floor key is in AsyncStorage, which
  sign-out clears wholesale (`src/store/useAppStore.js:541`). Sign-out then
  sign-in resets the anti-drip-feed guarantee.
- **E-3.** `restorePurchases` compares against
  `currentTrialState === 'paid_pro'` for the already-current short circuit
  (`restore.js:51`). A user restored while local state says `'free'` always
  takes the `payAt` path, which is correct, but a legacy `paid_complete` state
  (still mapped to Pro at `proGate.js:44`) would not short-circuit.
- **E-4.** Nothing on return re-lays the weight prompts that
  `handlePotentialLapse` cancelled at lapse (`lapseDetect.js:79-84`). The
  comment at `:75-78` says "restoreNotifications re-lays them for Pro only, so a
  user who returns gets them back" - that re-lay does not run for a signed-in
  user (S-LAUNCH 2). The prompts return only if the user opens Coaching
  reminders, changes timezone, or signs out and back in.

---

## F. INACTIVE 2 WEEKS

Assume a Pro user in week 3 of a 6-week block who stops for 14 days.

### Trace

1. **Block week.** `getBlockStatus(start, 6)` at day 28 gives
   `currentWeek = 5`, status `active`
   (`src/lib/mesocycle.js:468-486`). `getCurrentMesocycleWeek` returns the week
   5 row (`src/lib/database.js:4071-4099`) with `awaitingDecision: false`.
   **The block advanced on the calendar, not on the training.**
2. **Home.** `readinessSummary` takes the normal
   `buildReadinessSummary` path (`src/screens/HomeScreen.js:1512-1516`) because
   `awaitingDecision` is false. `buildCoachBrief` rule 3 fires
   (`lastWorkoutDaysAgo >= 5`, `src/lib/homeCoachBrief.js:33-40`): "Good to see
   you back. It's been a while since your last session. Ease in."
3. **Train tab.** `getBlockAdvice` with a live block: the early-deload and
   heads-up branches both require `hasEnoughHistory`
   (`src/lib/blockAdvisor.js:442`: `checkins.length >= 2 && currentWeek >= 2`).
   `getRecentCheckins(userId, 8)` (`src/lib/database.js:6065-6072`) is
   **count-bounded, not time-bounded**, so two check-ins from before the gap
   satisfy it. `detectSignals` labels `checkins[0]` as "this week"
   (`src/lib/blockAdvisor.js:106, :112-114, :125-127, :133`).
4. If those stale rows carry low energy/high soreness, the user returns to
   "Your body is asking for a lighter week" (`:447`) built from
   `buildEarlyDeloadBody` (`:496-519`), whose text says "Your check-in shows
   ..." and "You're in week 5".
5. **Streak.** Two finished weeks with `completed: 0` against a real plan target
   label as `'missed'` (`src/lib/streak.js:40-41`). Two consecutive misses are
   not repairable (`:48-61` needs a keeping week on both sides), so the run
   drops to 0. That is an absence, not a shown state (`streak.js:22` header).
   `longestRun` still renders (`src/hooks/useWeeklyStreak.js:152`).
6. **Coach.** `weeksInPhase` keeps climbing
   (`src/screens/CoachOutputScreen.js:1600-1602`). `hasEnoughData` also needs
   `morningWeights.length >= 4` (`src/lib/weeklyCoach.js:818-819`) over the
   14-day morning-weight window, so an inactive user usually drops to the
   baseline output (`:845-849`) - "Log your morning weight at least 4 days this
   week to get trend coaching."
7. **Notifications.** Weekly weight prompts are true OS WEEKLY triggers, one per
   weekday (`src/lib/notifications/scheduler.js:117-139`) and keep firing. The
   check-in reminder is a one-shot DATE trigger (`:437-441`) laid at the last
   check-in submit; it fires once during the gap and is then **not re-laid**,
   because the only re-lay sites are the check-in submit
   (`src/screens/WeeklyCheckInScreen.js:855`), the Coaching reminders screen
   (`src/screens/CoachingRemindersScreen.js:117`) and `restoreNotifications`
   (S-LAUNCH 2).
8. **Missed check-in follow-ups.** `missedCheckinFireDates`
   (`src/lib/notifications/missedCheckin.js:102-134`) pre-lays against the next
   expected occurrence when the recent episode has elapsed (`:121-127`), and the
   header at `:88-89` records the rule: "An elapsed episode is never chased".
   But the pair is laid only from a check-in submit
   (`src/screens/WeeklyCheckInScreen.js:890`), the reminders screen
   (`src/screens/CoachingRemindersScreen.js:167, :337`) or
   `restoreNotifications` (`scheduler.js:1332-1337`). After the first episode
   the pair is exhausted.

### Seams noticed (F)

- **F-1 (load-bearing).** `getRecentCheckins(userId, 8)` is count-bounded
  (`src/lib/database.js:6068`). `blockAdvisor.detectSignals` then narrates the
  newest row as "this week" (`src/lib/blockAdvisor.js:112-133`) and
  `buildEarlyDeloadBody` writes "Your check-in shows ..." (`:510`). After any
  gap the advisor speaks about arbitrarily old data in the present tense. Direct
  hit on the second long-term law (no personalisation without provenance) and
  on Phase 7.
- **F-2.** The block clock is pure wall-clock (`src/lib/mesocycle.js:468-469`).
  Two weeks off silently consumes two accumulation weeks; `planned_muscle_volume`
  for those weeks was written but never trained, which lowers the adherence
  ratio at block end (`src/lib/interBlock.js:152-154, :282-286`) and pushes the
  muscle to INSUFFICIENT_DATA - conservative, but it makes absence look like
  non-adherence rather than absence.
- **F-3.** The check-in reminder and the missed-check-in pair are single-shot
  DATE triggers whose only durable re-lay path (`restoreNotifications`) does not
  run for a signed-in user (S-LAUNCH 2). Practical effect: a user who stops
  checking in stops being reminded to check in.
- **F-4.** The morning and evening weight prompts, being WEEKLY OS triggers
  (`scheduler.js:117-139`, `:222-286`), keep firing at an inactive user
  indefinitely. Their delivery-time stand-down (`weighInEdFlagOpen`, `:190-206`)
  covers ED flags but not inactivity.

---

## G. INACTIVE 1 MONTH

Same starting point, 30 days.

### Trace

1. **Block week.** Day 44 from block start → `currentWeek = 7`, status
   `completed_awaiting_decision`, `weeksOverdue = max(0, 7 - 6 - 1) = 0`
   (`src/lib/mesocycle.js:469, :485, :493`).
2. `getCurrentMesocycleWeek` clamps the row to week 6 (the deload row) and sets
   `awaitingDecision: true` (`src/lib/database.js:4071-4092`).
3. **Home.** `readinessSummary` short-circuits
   (`src/screens/HomeScreen.js:1509-1511`): "Block finished. Targets hold at
   recovery-week volume until you choose what comes next."
   `inScheduledRecovery` becomes true (`:1573`), suppressing the deload banner
   (`:1574`). `blockSeedLines` is cleared for a finished block
   (`src/screens/HomeScreen.js:1192-1193`).
4. **Train tab.** `getBlockAdvice` takes the `completed_awaiting_decision`
   branch (`src/lib/blockAdvisor.js:403-421`): headline "Block finished"
   (`weeksOverdue === 0`), body "You've finished this block, recovery week
   included. The next step is choosing your next block." (`:416`).
   `buildNextBlockRecommendation(..., 'finished', isPro)` runs (`:404`) on the
   same stale 8 check-ins.
5. **No automatic transition.** Nothing advances the block. The user must tap
   an option on the decision card (`src/screens/PlansScreen.js:342`).
6. **Coach.** Baseline output as in F.6. `runWeeklyCoach` needs a fresh check-in
   to run at all (the screen loads the latest check-in,
   `src/screens/CoachOutputScreen.js:1580-1596`).
7. **Streak.** Four missed finished weeks; run 0.
8. **Sync.** Foreground `syncAll` still runs on every launch
   (`App.js:1006-1008`), pulling any cross-device changes and pushing nothing
   new.

### Seams noticed (G)

- **G-1 (load-bearing).** `weeksOverdue` is `currentWeek - recoveryWeek - 1`
  (`src/lib/mesocycle.js:493`), so the whole of week 7 reports 0 and the
  advisor's "Recovery week passed N weeks ago" copy
  (`src/lib/blockAdvisor.js:408-415`) understates the gap by one week. The
  docstring at `mesocycle.js:453-455` states this is intended ("0 in the first
  post-recovery week"), so this is a copy-truth question, not a maths bug.
- **G-2.** The Home line "Targets hold at recovery-week volume"
  (`src/screens/HomeScreen.js:1510`) is literally true - `getCurrentMesocycleWeek`
  clamps to the deload row - but for a month-absent user it describes a
  prescription nobody is following, and it is the only Home statement about the
  block.
- **G-3.** The decision card is snoozeable for 7 days
  (`src/screens/PlansScreen.js:441`) via a global key, and after a month the
  snooze has expired, so the card returns. There is no escalation and no
  distinction between "finished last week" and "finished last month" beyond the
  `weeksOverdue` sentence.

---

## H. INACTIVE 3 MONTHS

Same starting point, ~90 days.

### Trace

1. **Block week.** ~day 105 → `currentWeek = 16`, status
   `completed_awaiting_decision`, `weeksOverdue = 9`
   (`src/lib/mesocycle.js:469, :493`).
2. **Train tab.** `getBlockAdvice` → headline "Recovery week passed 9 weeks
   ago", body "Your recovery week has been and gone. **The sooner you start the
   next block the better. Your body's ready.**"
   (`src/lib/blockAdvisor.js:408-415`).
3. **Next-block recommendation.** Still computed from the same stale 8
   check-ins. With no high signals and `avgReadiness >= 60` the branch is
   `repeat` with body "Pick up where you left off. Same exercises, same
   structure. You'll come back a little stronger each block."
   (`src/lib/blockAdvisor.js:275-289`).
4. **The seeding chain on return.** `buildSeedRangesForNextBlock`
   (`src/lib/blockLedgerRunner.js:322-382`):
   - `current` = most recent block by start date (`:328-330`); it IS finished
     (`:331-333`), so `computeAndStoreBlockLedger` runs (`:335-337`).
   - Inside, `weeksSinceBlockEnd = status.weeksOverdue = 9` (`:259`), which is
     `>= STALE_EVIDENCE_WEEKS (4)` (`src/lib/interBlock.js:88`), so
     `finish()` applies the hold: `holdCap = max(previousStart, researchMev)`
     and no upward carry (`src/lib/interBlock.js:240-245`).
   - **But** the abandoned block will usually classify INSUFFICIENT_DATA on
     adherence (`src/lib/interBlock.js:282-286`) or eligible exposures
     (`:287-291`).
   - `resolveSeedRange` treats INSUFFICIENT_DATA as **not a valid ledger**
     (`src/lib/blockSeed.js:88-92`) and falls through to the **learned band**
     (`:151-161`).
   - `computeLearnedRange` (`src/lib/learnedRange.js:90-184`) has **no
     staleness input at all**. Its floor/ceiling are replayed from every prior
     qualifying ledger entry regardless of age.
   - Result: `{ startSets: learned.floor, peakSets: learned.ceiling, source:
     'learned' }`, written into the new block's rows as `seed_learned`
     (`src/lib/database.js:4201`).
5. **Coach.** `weeksInPhase` is now ~week 20+ of the same phase label (B-1).
   `hasEnoughData` fails on morning weights, so the baseline output shows.
6. **Notifications.** Weight prompts still firing weekly (F-4). Check-in
   reminder and missed-check-in pair exhausted (F-3). The activation nudge is
   past its window and stands down (`scheduler.js:953`).
7. **Streak.** ~12 missed weeks; `useWeeklyStreak`'s 12-week window
   (`src/hooks/useWeeklyStreak.js:28, :92-97`) is now entirely quiet weeks;
   `anyTrained` is false so the strip does not render at all (`:184, :188`).

### Seams noticed (H)

- **H-1 (load-bearing, D91-25 characterisation).** The stale-evidence hold
  guards the **ledger** path (`src/lib/interBlock.js:240-245`) but the
  **learned band** path has no age input whatsoever
  (`src/lib/learnedRange.js:90-96` - the signature takes `prior`,
  `researchMev`, `adaptedMrv`, `ledgerHistory`, `muscle`, and nothing else).
  A 3-month absence routes the seed through exactly the unguarded path, because
  the abandoned block classifies INSUFFICIENT_DATA and
  `src/lib/blockSeed.js:88-92` skips a ledger entry with that classification.
  This is the concrete mechanism behind the recorded FUTURE item
  **D91-25** (`docs/_FULL-APP-PRODUCT-MAP.md:5964-5968`, quoting
  `DECISIONS-2026-07-09.md:2360-2365`: *"the learned ceiling currently ages only
  through new block evidence; stale-evidence holds cover overdue blocks, not
  multi-month absences. No arbitrary weekly decay."*). **Characterisation only -
  no fix proposed here.**
- **H-2 (load-bearing).** "The sooner you start the next block the better. Your
  body's ready." (`src/lib/blockAdvisor.js:415`) is emitted at
  `weeksOverdue > 0` with no upper bound and no reference to training absence.
  After three months it is both a claim about the user's body the app cannot
  support and pressure copy at exactly the moment the third long-term law
  (LAPSE ≠ FAILURE) says there must be none.
- **H-3.** The second stale bypass: `computeAndStoreBlockLedger` is idempotent
  (`src/lib/blockLedgerRunner.js:109-114`). If a ledger was computed during
  week 7 (`weeksSinceBlockEnd: 0`, no hold) and the user returns at week 16, the
  stored record is returned verbatim (`:112`) and the hold never applies.
- **H-4.** `getPriorCompletedSets` uses a fixed 180-day prior window
  (`src/lib/blockLedgerRunner.js:69, :125`). After a long absence the "prior
  bests" baseline for PR replay and the newness check
  (`src/lib/blockMetrics.js:235-248`) may be empty, which makes
  `historyExists` false (`:248`) and therefore makes every exercise NOT-new
  (`:260`) - the newness discount silently switches off for a returning user.

---

## I. REINSTALL, SAME DEVICE

### Trace

1. Uninstall removes the app sandbox: the SQLCipher database file
   (`src/lib/dbCrypto.js:26`, `volyume.db`), the whole of AsyncStorage, and
   `FileSystem.documentDirectory` - which is where progress photos live
   (`src/lib/progressPhotos.js:1-11, :32`: "DEVICE-LOCAL only ... never synced
   to Supabase, never uploaded").
2. On reinstall the user signs in. `restoreSessionFromCloud`
   (`src/store/useAppStore.js:791-992`) finds no per-uid cache
   (`:826-828`), falls to the `created_at` heuristic (`:837-855`): an auth row
   older than 60s routes optimistically to MainTabs
   (`:839-848`) with `optimisticReturningFromHeuristic = true`.
3. The cloud read (`:871-908`) selects only
   `first_name, training_focus, training_age, primary_equipment, units,
   bar_weight, tier, trial_state, pro_trial_ends_at, first_run_complete` plus
   `sex` (`:884, :891`), with a sex-less retry (`:892-895`).
4. If the profile row exists and says `first_run_complete`, the heuristic
   stands and `userProfile` is hydrated from those columns
   (`:939-969`). If there is no row, the heuristic is corrected back to the
   wizard (`:913-928`).
5. `refreshTierFromCloud` (`:1001-1078`) writes the authoritative tier and
   re-caches `trial_state` / `pro_trial_ends_at`.
6. `syncAll({triggeredBy:'sign_in'})` (`src/navigation/RootNavigator.js:1462`)
   runs push-then-pull. With no watermarks in AsyncStorage
   (`src/lib/sync/watermark.js:74-82` returns 0) every table full-pulls.
7. Legacy `pullFromCloud` (`src/lib/sync.js:1485-1698`) restores exercises,
   workouts and sets, programmes, routines, mesocycles (including
   `block_ledger`, `src/lib/database.js:7538-7540`), morning weights, coach
   outputs, body profile, insights, notes, goals, peak-week plans, planned
   volume, custom exercises and prefs.
8. Migrated tables restore via the registry: check-ins, weight log, body
   composition, nutrition targets, profiles, food domain, notification
   preferences, plan folders, meal plans, per-day offsets, partner signals
   (`src/lib/sync/transport.js:82-...`, `src/lib/sync/registry.js:22-250`).

### What is restored vs lost, reinstall, same device

| Restored from cloud | Lost |
| --- | --- |
| workouts + sets, PRs derived from them | progress photos (`progressPhotos.js:1-11`) |
| programmes, routines, routine exercises | progress-scan image assets (same document dir) |
| mesocycles incl. `block_ledger` (`database.js:7538`) | streak high-water / pauses (`@volyume_streak_*`) |
| morning weights, check-ins, body composition | wellbeing mode until the prefs pull runs |
| nutrition targets incl. `phase`/`goal` (`sync/tables/nutritionTargets.js:57,63`) | win-back episode + 180-day floor (E-2) |
| notification preferences, meal plans, folders | pull/push watermarks (by design, `watermark.js:16-19`) |
| prefs incl. manual landmarks + wellbeing (`sync.js:1986-2031`) | `@volyume_block_snooze` |
| the 9 profile fields in `sync/tables/profiles.js:30-43` | every other `userProfile` field (see J) |

### Seams noticed (I)

- **I-1 (load-bearing).** `planned_muscle_volume`'s `mev/mav/mrv/source`
  columns do not exist in the cloud yet, and the pull writes into a shadow
  table. This is exactly what **unapplied migration 132** exists to fix:
  `supabase/migrate_132_planned_muscle_volume_provenance.sql:1-23` - *"the cloud
  table only ever held planned_sets, so a new device restored set counts with no
  provenance, and in practice restored them into an unread mirror table ...
  Applied remotely: NO."* Until 132 is applied and its client half ships, a
  reinstalled user's block-start explanation
  (`src/lib/blockExplain.buildBlockStartLines`, consumed at
  `src/screens/HomeScreen.js:1196-1200`) has no personalised source labels to
  read.
- **I-2.** `restoreSessionFromCloud` only hydrates `userProfile` when the store
  has none (`src/store/useAppStore.js:939`), from a **10-column** select
  (`:884`). Everything else the coach and plan engine read
  (`trainingPhase`, `goalPhase`, `experience`, `daysPerWeek`, `age`,
  `heightCm`, `weightKg`, `bodyFatPct`, `recoveryRating`, `coachAutonomy`,
  `coachTone`, `phaseStartedAt`, `planWeakPoints`, `goalStartDate`) is absent.
  See J-1.
- **I-3.** A reinstall silently loses progress photos with no warning anywhere
  in the reinstall path. `src/lib/progressPhotos.js:1-11` documents the
  device-local decision; nothing tells the user before they uninstall.
- **I-4.** Wellbeing mode (calm) is restored only when `_pullUserPrefs`
  (`src/lib/sync.js:1986-2031`) runs and the calm ratchet lets it through
  (`:1975-1981`). Between first launch and that pull, the fresh install reads
  `'unspecified'` (`src/lib/wellbeing.js:22-29`), i.e. NOT calm. Any
  suppression-sensitive surface that renders in that window renders unsuppressed.

---

## J. NEW DEVICE (same account, old device still exists)

### Trace

1. Identical restore pipeline to I (`src/store/useAppStore.js:791-992`,
   `src/navigation/RootNavigator.js:1290-1305, :1446-1467`).
2. The per-uid AsyncStorage keys that do **not** travel, because AsyncStorage
   is device-local and the pref sync excludes device-bound keys
   (`src/lib/sync.js:1296-1360`, `shouldSyncPref` at `:1362-1365`):
   - `@volyume_first_run_complete_<uid>` (`useAppStore.js:14`) - hence the
     `created_at` heuristic path at `:837-855`.
   - `@volyume_user_profile_<uid>` (`:15`) and
     `@volyume_user_profile_ts_<uid>` (`:16`).
   - `@volyume_tier`, `@volyume_trial_state`, `@volyume_pro_trial_ends_at`,
     `@volyume_paid_verified_at` (`:17, :24, :25, :32`) - all re-derived by
     `refreshTierFromCloud`.
   - `@volyume_active_workout` (`:38`) and `@volyume_workout_prefs` (`:52`).
   - `@volyume_pull_wm_*` / `@volyume_push_wm_*`
     (`src/lib/sync/watermark.js:28-29`) - excluded from pref sync by pattern
     and correctly so.
   - `@volyume_winback_*` (`src/lib/payments/winbackState.js:33-35`).
   - `@volyume_pending_cascade_<uid>`
     (`src/lib/payments/pendingCascade.js:27`).
   - `@volyume_block_snooze` (`src/screens/PlansScreen.js:46`).
   - `@volyume_notif_tz_offset` (`src/lib/notifications/scheduler.js:1222`).
3. **Does travel** through `_pullUserPrefs`: everything under `@volyume_`
   that is not excluded, including `@volyume_landmarks_<uid>` (manual
   landmarks) and `@volyume_wellbeing_mode`, both guarded
   (`src/lib/sync.js:1383-1392, :1952-1986`).
4. **Photos and scans are local-only** and therefore absent on the new device:
   `src/lib/progressPhotos.js:1-11`; the scan store writes assets into the
   filesystem alongside SQLite rows
   (`src/lib/progressScanStore.js:1-25`).
5. Two devices now both push. See K.

### Seams noticed (J)

- **J-1 (load-bearing).** The store `userProfile` is the plan engine's and the
  coach's primary input, and only **nine** of its fields sync
  (`src/lib/sync/tables/profiles.js:30-43`). On a new device:
  - `coachAutonomy` silently reverts to `'collaborative'`
    (`src/screens/CoachOutputScreen.js:1016`), so a Manual-mode user's explicit
    choice is lost and Apply pills reappear.
  - `phaseStartedAt` is absent, so `weeksInPhase` collapses to 1
    (`src/screens/CoachOutputScreen.js:1600-1602`) and the coach re-enters the
    baseline period (`src/lib/weeklyCoach.js:819, :845-849`).
  - `trainingPhase` / `goalPhase` are absent from the profile even though the
    nutrition targets row carries `phase` and `goal`
    (`src/lib/sync/tables/nutritionTargets.js:57, :63`), so the two can
    disagree on the same device.
  - `experience`, `recoveryRating`, `age` are absent, so
    `profileAdjustedPrior` (`src/lib/blockLedgerGather.js:336-350`) silently
    falls back to raw research landmarks at `:349` - the learned band's prior
    changes device to device.
- **J-2.** `restoreSessionFromCloud` refuses to flip an optimistic `true` back
  to the wizard unless the decision came from the heuristic
  (`src/store/useAppStore.js:982-991`). Correct for the wizard-flash bug, but it
  means a genuinely-unfinished old account on a new device stays in MainTabs
  with no plan (comment acknowledges this at `:976-977`).
- **J-3.** Progress photos and the progress-scan assets are silently
  device-bound; the Pro before/after progress card has nothing to render on the
  new device. No copy anywhere in the restore path says so.

---

## K. TWO DEVICES IN PARALLEL

### Trace

1. Every sync cycle pushes before it pulls
   (`src/lib/sync/runner.js:204-251` then `:253-292`). A device that has been
   offline therefore uploads its stale world before it learns the cloud moved
   on. This is stated verbatim in
   `supabase/migrate_134_stale_write_triggers.sql:6-11`.
2. **Guarded tables.** Only eight cloud tables carry a refuse-stale-write
   trigger today (`migrate_134...sql:12-18`): `body_metrics`,
   `weekly_checkins_v2`, `notification_preferences`, `recipe_ingredients`,
   `daily_steps`, `morning_weights`, `cardio_log`, `perday_target_offsets`.
3. **Unguarded tables (migration 134 pending).** `mesocycles`,
   `mesocycle_weeks`, `coach_outputs`, `nutrition_targets`,
   `user_body_profile`, `programmes`, `routines`, `routine_exercises`,
   `planned_muscle_volume` (`migrate_134...sql:31-33`). The migration's own
   header records the proven consequences at `:19-27`: *"a stale device
   re-activating a COMPLETED training block and nulling its Block Ledger; a
   stale device's calorie/macro targets landing over newer ones; a stale
   device's scoff_score (ED-screening data) overwriting the up-to-date copy."*
   **Applied remotely: NO** (`:96-99`).
4. **Client-side mitigations already in place.** The push omits `block_ledger`
   entirely when the device has none, rather than sending null
   (`src/lib/sync.js:975-984`), and the pull refuses an older cloud row over a
   newer local one (`src/lib/database.js:7495-7504`). So a device that already
   holds the newer row is protected; **a fresh install with no local row is
   not** - it takes whatever the cloud holds.
5. `is_active` is pushed unconditionally
   (`src/lib/sync.js:987`), and `getActiveBlock` takes
   `is_active = 1 ORDER BY created_at DESC LIMIT 1`
   (`src/lib/database.js:3986-3988`), so two active rows resolve to the newest
   by creation, not by decision.
6. **Profiles** use the per-column merge (`src/lib/sync/registry.js:177-183`,
   `src/lib/sync/conflict.js:41-50, :86-102`) driven by
   `column_updates_at`, so simultaneous edits to different profile fields do not
   clobber.
7. **Coach outputs** currently mint a per-device id, so two devices can create
   two rows for the same week; **unapplied migration 135**
   (`supabase/migrate_135_coach_outputs_week_unique.sql:1-19`) records the
   double-apply consequence and makes the identity structural, with the local
   half at `database.js` schema v71. **Applied remotely: NO** (`:16-19`).
8. **Prefs.** Guarded families are protected in both directions:
   manual landmarks and wellbeing (`src/lib/sync.js:1383-1392`), with the
   fail-closed filter at `:1961-1985` and the calm ratchet at `:1981` - a
   locally-calm device never accepts a non-calm cloud value.
9. **Watermarks** are per-device (`src/lib/sync/watermark.js:31-37`), so each
   device tracks its own cursor. `.gte` on the boundary makes the pull
   idempotent (`watermark.js:21-23`).
10. **Live workout** state is device-local (`@volyume_active_workout`,
    `src/store/useAppStore.js:38`), with a remote set-event applier at
    `:1351-1426`.

### Seams noticed (K)

- **K-1 (load-bearing).** Nine coaching-state tables have no server-side
  last-write-wins enforcement, and the registry documents `last_write_wins` as
  *"server compares incoming updated_at, newer wins"*
  (`src/lib/sync/registry.js:11-13`) - a contract the server does not currently
  keep for those nine. The fix is written and **unapplied**
  (`supabase/migrate_134_stale_write_triggers.sql`, remote status at `:96-99`).
  The blast radius named by the migration includes the Block Ledger and
  ED-screening data.
- **K-2.** The pull-side guard protects a device that already has the row
  (`src/lib/database.js:7501-7504`) but a **fresh install** takes the cloud row
  unconditionally. So the stale-write hole converts into a reinstall/new-device
  restore hole (I/J), not just a live two-device hole.
- **K-3.** `is_active` is authoritative-by-`created_at` locally
  (`src/lib/database.js:3986-3988`) but pushed as a plain boolean
  (`src/lib/sync.js:987`). Two devices activating different plans can leave two
  `is_active = 1` rows in the cloud; the local resolver then picks the newest
  block, which is not necessarily the one the user chose.
- **K-4.** The calm ratchet is deliberately one-way
  (`src/lib/sync.js:1981` and the header at `:1940-1947`): turning calm OFF on
  device A does not turn it off on device B. Intended, and it is the safer
  default, but it means a user must lift calm on every device - see O.

---

## L. PLAN SWITCH

### Trace

1. **Confirmation.** `confirmPlanSwitchMidBlock`
   (`src/lib/planSwitch.js:20-59`). It proceeds SILENTLY when: no userId
   (`:22`), `getActiveBlock` throws or returns null (`:25-27`),
   `currentWeek <= 1` (`:38`), or status is anything other than `'active'`
   (`:39`) - i.e. during the recovery week and during
   `completed_awaiting_decision`.
2. Otherwise it shows "Restart your training block?" naming the week and stating
   "Your workout history and PRs are kept." (`:41-57`).
3. **Activation.** `handleSetActive` (`src/screens/PlansScreen.js:473-509`)
   calls `activatePlanWithBlock(user.id, plan.id, name)` at `:500` with **no
   `ledger` argument**.
4. `activatePlanWithBlock` (`src/lib/database.js:3715-3778`):
   `setActivePlan` (`:3716`); one transaction deactivating all mesocycles then
   inserting the new one (`:3742-3756`); 6 planned weeks with deload week 6
   (`:3753`); `generateMesocycleWeeks` (`:3758`);
   `generateInitialPlannedVolume(id, VOLUME_LANDMARKS, ledger)` (`:3760`); then
   a training-reminder refresh (`:3769-3775`).
5. With `ledger === null`, `generateInitialPlannedVolume` writes the static
   MEV→MAV linear ramp with `source = 'template'`
   (`src/lib/database.js:4184-4218`, source at `:4201`, deload week at MEV at
   `:4227`).
6. **Ledger attachment happens only on the same-plan restart path.**
   `handleRestartPlan` (`src/screens/PlansScreen.js:342-437`) builds
   `seedRanges` (`:398-402`) and passes them as `{ ledger: seedRanges }`
   (`:403`), then records the outcome (`:406-410`).
7. `buildSeedRangesForNextBlock` picks the block being decided on as *the most
   recent mesocycle by start date* (`src/lib/blockLedgerRunner.js:328-330`),
   with no check that it belongs to the plan being activated.
8. The rebuild path (`ProGoalSetupScreen` → `generateAndSavePlan` →
   `activatePlanWithBlock`, `src/lib/planAutoGen.js:223`) also passes no ledger.
9. **Archiving.** The Pro auto-gen path archives every other plan
   (`src/lib/planAutoGen.js:230`); the manual switch path does not.

### Seams noticed (L)

- **L-1 (load-bearing).** Switching plans discards the entire adaptive memory:
  `src/screens/PlansScreen.js:500` and `src/lib/planAutoGen.js:223` both call
  `activatePlanWithBlock` with no ledger, so `generateInitialPlannedVolume`
  falls to the template ramp (`src/lib/database.js:4184-4218`). Even the
  learned band - which is muscle-scoped, not plan-scoped
  (`src/lib/learnedRange.js:90-96`) and therefore arguably portable - is never
  consulted. A user on block 8 who changes plan gets block-1 volumes.
- **L-2.** `confirmPlanSwitchMidBlock` passes silently for a
  `completed_awaiting_decision` block (`src/lib/planSwitch.js:39`). That is the
  exact state in which a Block Ledger is pending, so a plan switch at that
  moment discards a computable recommendation with no dialogue at all.
- **L-3.** `buildSeedRangesForNextBlock` resolves "the block being decided on"
  purely by most-recent start date
  (`src/lib/blockLedgerRunner.js:328-330`). If a user activates plan B and then
  restarts plan B, the ledger read comes from whatever block started last -
  which after a switch is plan B's own new block, so in practice this is
  self-consistent; but nothing structurally binds a ledger to its programme.
  Phase 9 should test the archive/reactivate ordering directly.
- **L-4.** `activatePlanWithBlock` always writes a 6-week block
  (`src/lib/database.js:3753`) with `start_date` = today
  (`:3721`), so any switch resets the block clock. Combined with S-BLOCK 3 this
  is the only way a block ever restarts, which satisfies "no automatic block
  transitions" but also means a mid-block switch loses the accumulated week
  position permanently.

---

## M. PHASE SWITCH (nutrition phase change)

### Trace

1. Entry: `ProGoalSetupScreen.handleSave`
   (`src/screens/ProGoalSetupScreen.js:203-440`).
2. Show-date validation (`:207-212`), then `confirmPlanSwitchMidBlock(user?.id,
   { mode: 'rebuild' })` (`:220`) with the rebuild wording
   (`src/lib/planSwitch.js:43-45`).
3. `goalPhase = phaseToCoachingKey(selectedPhase)` (`:223`); previous state
   captured for the change summary (`:227-245`).
4. Deficit tracking: `goalStartDate` is set on entering a deficit phase, cleared
   on leaving, preserved on staying (`:248-259`).
5. Weak points cleared if the new goal does not support them (`:263-266`).
6. `updatedProfile` (`:268-286`) sets `trainingGoal`, `trainingPhase`,
   `goalPhase`, `goal` (nutrition key), `proteinApproach`, `goalStartDate`,
   `planWeakPoints`, plus the training setup fields.
   **`phaseStartedAt` is not touched.**
7. **Nutrition recalc** (`:288-395`): latest weight preferred via
   `getMorningWeightsLast14Days` + EWMA (`:305-314`); body fat from profile or
   the latest logged reading (`:339-350`); a hard biology-completeness gate
   (`:325-329`) that SKIPS the recalculation and keeps the stored targets when
   sex/age/height/weight are missing (`:366-373`), then
   `calculateNutritionTargets(buildNutritionEngineInputs(...))` (`:374-385`)
   written to AsyncStorage and `saveNutritionTargets` (`:386-389`).
8. `saveLocalProfile(user.id, updatedProfile)` (`:406`).
9. **Plan rebuild** (`:419-427`): `generateAndSavePlan(user.id, updatedProfile)`
   → `activatePlanWithBlock(userId, prog.id, planName)`
   (`src/lib/planAutoGen.js:223`) with no ledger, then
   `archiveOtherUserPlans` (`:230`).
10. Navigates to `GoalChangeSummary` (`:437-440`).
11. **Proposal cancellation.** There is no explicit cancellation of a pending
    coach proposal in this path. The next `runWeeklyCoach` recomputes from the
    new `goalPhase` (`src/lib/weeklyCoach.js` phase config), and
    `CoachOutputScreen` re-reads the stored output; applied receipts live on the
    `coach_outputs` row.

### Seams noticed (M)

- **M-1 (load-bearing).** A phase switch does NOT reset `phaseStartedAt`
  (written only at `src/screens/ProOnboardingScreen.js:1066`). Consequences:
  the coach's week label reads "Week N · <new phase>" where N counts from
  onboarding (`src/screens/CoachOutputScreen.js:1599-1602`); and the
  `weeksInPhase >= 2` half of `hasEnoughData`
  (`src/lib/weeklyCoach.js:819`) is already satisfied, so a brand-new cut gets
  full trend coaching on its very first week using a weight trend built during
  a bulk.
- **M-2.** The phase switch rebuilds the plan (`planAutoGen.js:223`) and so
  drops the adaptive seed exactly as L-1 does. Changing nutrition phase should
  not, on the face of it, reset training volume memory.
- **M-3.** `confirmPlanSwitchMidBlock` is called for the rebuild
  (`ProGoalSetupScreen.js:220`) but its skip rules
  (`src/lib/planSwitch.js:38-39`) mean the user is never warned when the block
  is in its recovery week or finished - the two states where a Block Ledger is
  about to become available.
- **M-4.** When biology is incomplete the goal saves and the plan rebuilds while
  the nutrition targets deliberately stay stale
  (`src/screens/ProGoalSetupScreen.js:366-373`). The user is toasted, but the
  profile now says one phase while the stored targets say another; the
  nutrition targets row carries its own `phase`
  (`src/lib/sync/tables/nutritionTargets.js:57`), so the divergence is
  persisted and syncs.
- **M-5.** No pending coach proposal is invalidated on a phase change. An
  un-applied proposal computed under the old phase remains applyable on
  `CoachOutputScreen` until the next weekly run replaces it.

---

## N. MANUAL COACHING MODE (`coachAutonomy: 'manual'`)

### Trace

1. **Setting.** `SettingsCoachingScreen`
   (`src/screens/SettingsCoachingScreen.js:47` reads
   `userProfile?.coachAutonomy ?? 'collaborative'`; `:61` writes it via
   `saveLocalProfile`). Three chips at `:233-236`. Copy for manual at `:228`:
   "The coach shows each change and the reason. You make the change yourself."
2. **CoachOutputScreen.** `coachAutonomy` at `:1016`,
   `applyDisabled = coachAutonomy === 'manual'` at `:1017`.
3. Every Apply handler is stripped, not disabled: `onApply={applyDisabled ?
   undefined : handler}` at `:2390` (training), `:2410` (deload), `:2418`
   (calories), `:2432` (macro cycle), `:2448` (refeed), `:2459` (diet break).
4. A single explanatory line renders above the hero card when
   `applyDisabled` (`:2576-2579`): "Manual mode: these are recommendations. The
   coach applies nothing; any change is yours to make. Change modes in Settings,
   under Coaching."
5. The Coached auto-walk effect returns immediately for any non-coached mode
   (`:2129`).
6. **What the learner does.** Nothing in `coachAutonomy` reaches the engine.
   `weeklyCoach.js` does not read it (grep: the only mention is the comment at
   `src/lib/weeklyCoach.js:1476`). The Block Ledger's "manual" concept is a
   completely different thing: `manualOverride` is
   `isManualEdit(manualTable[muscle], VOLUME_LANDMARKS[muscle])`
   (`src/lib/blockLedgerRunner.js:227`), i.e. hand-set MEV/MAV/MRV landmarks,
   not the autonomy setting.
7. That landmark-based manual override does two things: it sets
   `deferredToManual` on the ledger entry
   (`src/lib/interBlock.js:140, :266-271`), which nulls the proposal numbers
   and turns the rationale into "this is a note, not a change" (`:215-217`); and
   it makes `computeLearnedRange` skip the entry entirely
   (`src/lib/learnedRange.js:138`) so manual blocks do not teach.
8. In the seeding chain a real manual edit wins outright and is
   suppression-proof (`src/lib/blockSeed.js:69-79`).

### Seams noticed (N)

- **N-1 (load-bearing).** "Manual" means two unrelated things in this product.
  `coachAutonomy: 'manual'` (`src/screens/CoachOutputScreen.js:1017`) removes
  Apply buttons and changes nothing in the engine; `manualOverride`
  (`src/lib/blockLedgerRunner.js:227`) is a hand-set landmark table that
  suppresses proposals AND stops the learned range from learning. A user in
  autonomy-manual mode who never edits landmarks is still fully taught by the
  learner; a user in coached mode who edits one muscle's landmarks silently
  stops that muscle teaching.
- **N-2.** Because `coachAutonomy` never reaches the engine, a manual-mode user
  who *does* make the change themselves (editing next week's sets by hand)
  produces training evidence that the learner reads exactly as if the coach had
  prescribed it. Manual intent is invisible to the memory.
- **N-3.** `coachAutonomy` lives only in the local profile blob and is not in
  the profile sync field map (`src/lib/sync/tables/profiles.js:30-43`), so it
  reverts to `'collaborative'` on a new device (J-1).
- **N-4.** The manual-mode explanatory line renders only inside the hero-card
  branch (`src/screens/CoachOutputScreen.js:2570-2580`). When
  `heroCardEl` is null (the "hold steady" branch at `:2590+`) the line does not
  render, so a manual-mode user on a hold week sees no ownership statement.

---

## O. CALM MODE PERIOD → LATER STANDARD

### Trace

1. **Storage.** `@volyume_wellbeing_mode` in AsyncStorage
   (`src/lib/wellbeing.js:17`), values `'calm' | 'normal' | 'unspecified'`
   (`:11-13`). `getWellbeingMode` swallows failures to `'unspecified'`
   (`:22-29`); `setWellbeingMode` stamps a guarded-pref write time
   (`:31-43` calling `sync.notePrefWrite`).
2. **Suppression read.** `readSuppression`
   (`src/lib/blockLedgerRunner.js:78-83`) is calm OR an open ED flag OR **any
   read failure** - fail closed. It reads the raw key rather than
   `getWellbeingMode` precisely so a failure is distinguishable (`:80-81`).
3. **During calm - ledger.** `classifyMuscleBlock` receives `ctx.suppressed`
   (`src/lib/interBlock.js:132`), pushes a
   `progression_suppressed` evidence marker (`:167`), and in `finish()`
   applies the hold: `holdCap = max(previousStart, researchMev ?? 0)`, start
   clamped to it, peak clamped to `max(plannedPeak, start)`, and
   `upwardCarryPrevented` set when the hold actually bit
   (`:240-245`). Reductions pass through untouched.
4. RESPONSIVE cannot earn its `+1` under suppression
   (`src/lib/interBlock.js:343-345`).
5. The suppressed marker is written into the persisted entry:
   `observed.suppressed` (`src/lib/interBlock.js:259-264`).
6. **During calm - seeding.** `resolveSeedRange`: a manual override still wins
   (`src/lib/blockSeed.js:69-79`); a ledger proposal degrades to the repeat
   numbers where it climbs and passes where it reduces (`:102-107`); the
   ledger-sourced deload sizing is skipped entirely (`:126`); the **learned band
   is skipped** for the conservative profile/research default (`:151-161`).
7. **During calm - streak.** `useWeeklyStreak` ORs calm into `edSuppressed`
   (`src/hooks/useWeeklyStreak.js:137-140`), and `computeStreak` then labels
   every week `'resting'` (`src/lib/streak.js:36-38`) and flags `suppressed`
   so the UI hides the number (`:146`). Milestones, perfect month and the
   longest-run PB are all nulled (`useWeeklyStreak.js:153-165`).
8. **Lifting calm.** `setWellbeingMode('normal')` writes the key and the stamp
   (`src/lib/wellbeing.js:31-43`). From the next read:
   - `readSuppression` returns false, so new blocks classify unsuppressed.
   - `resolveSeedRange` re-enables the learned band (`blockSeed.js:154`) and the
     ledger deload sizing (`:126`).
   - The streak un-suppresses; but the calm weeks stay labelled `'resting'`
     only while the flag is live - after lifting, past weeks re-label through
     `labelBase` (`src/lib/streak.js:35-42`), so a zero-session calm week
     becomes `'missed'` retroactively unless it was a deload or an explicit
     pause. The high-water guard
     (`src/hooks/useWeeklyStreak.js:145-151`) only protects the CURRENT week key.
   - **The ledger entries written during calm keep `observed.suppressed: true`
     forever** (`src/lib/interBlock.js:263`), so `computeLearnedRange`
     permanently refuses to raise the ceiling from them
     (`src/lib/learnedRange.js:153-160`) while still accepting their downward
     evidence (`:162-167`).
9. **Cross-device.** The calm ratchet (K-4) means lifting calm on device A does
   not lift it on device B (`src/lib/sync.js:1981`).

### Seams noticed (O)

- **O-1 (load-bearing).** Retroactive streak re-labelling. While calm is on,
  every week reads `'resting'` and keeps the run
  (`src/lib/streak.js:36-38`, `:26`). The instant calm is lifted, the same
  historical zero-session weeks re-evaluate as `'missed'`
  (`src/lib/streak.js:40-41`) because nothing persists the suppression per
  week, and the high-water guard is scoped to the current week key only
  (`src/hooks/useWeeklyStreak.js:145-151`). Turning off a wellbeing protection
  can therefore retroactively break a run the user was shown as intact.
- **O-2.** Calm-period blocks are permanently barred from raising the learned
  ceiling (`src/lib/learnedRange.js:153-160` gated on
  `observed.suppressed`, written at `src/lib/interBlock.js:263`). This is the
  first long-term law working as written ("never teach upward from calm/ED
  suppressed periods"), but it also means a user who trained productively for
  six months in calm mode has that capacity evidence discounted for ever, with
  no surface that says so. Characterisation item, not a defect claim.
- **O-3.** `readSuppression` fails closed on a read error
  (`src/lib/blockLedgerRunner.js:82`), which is correct - but it means a
  transient AsyncStorage failure at the moment a user restarts their block
  silently produces a held, non-climbing seed with `progression_suppressed` in
  the evidence and no user-visible explanation.
- **O-4.** `getWellbeingMode` fails OPEN to `'unspecified'`
  (`src/lib/wellbeing.js:25`), while `useWeeklyStreak`
  (`src/hooks/useWeeklyStreak.js:109`) and `readSuppression`
  (`src/lib/blockLedgerRunner.js:80-81`) both bypass it to read raw and fail
  closed. Any caller that still uses `getWellbeingMode` for a
  suppression decision fails the wrong way. Phase-later sweep item.

---

## P. LONG-RUNNING USER ADDS A BRAND-NEW EXERCISE

### Trace

1. **First working set, first exposure.**
   `src/screens/ActiveWorkoutScreen.js:1674-1712`.
   `prHistory` is built from working sets only, both from all-time history and
   the session ref (`:1674-1677`). `hadPriorExposure = allTimeSets.some(isWorkingSetRow)`
   (`:1689`) - `allTimeSets` excludes the current workout by id and a swapped-in
   exercise loads its own history, so substitution cannot inherit an unrelated
   baseline (`:1684-1687`).
2. PR detection runs only when `isWeightReps && !isWarmupSet &&
   hadPriorExposure` (`:1694-1695`). For a first exposure it does not run at
   all.
3. The first working set of a first exposure shows the calm
   `first_lift` toast: "<weight><units> x <reps> logged as your starting
   point" (`:1704-1712`), and it never joins the session's PR list
   (`:1701-1703`). Later sets of the same first exposure are silent baseline
   material (`:1702-1703`).
4. The same rule is applied on the edit path (`:1975-1976`).
5. **Block metrics, the same block.**
   `src/lib/blockMetrics.js:140-392`:
   - The new exercise becomes an eligible exposure the first time it is logged
     as a **primary** mover for the muscle (`:184-193, :205-225`; exposures
     counted at `:210, :225`).
   - `historyExists` requires ≥ 4 usable prior rows across all exercises
     (`MIN_PRIOR_ROWS_FOR_NEWNESS = 4`, `:65, :248`). For a long-running user
     this is true, so `isNew = historyExists && !priorBest.has(exId)` is TRUE
     (`:260`) and the exercise carries a 0.5 discount (`:61, :276`).
   - Stability requires ≥ 3 block sessions, presence in both accumulation
     halves, and ≥ 3 distinct block weeks (`:62-63, :257-258`). A brand-new
     exercise added mid-block fails `inEarly` and is therefore NOT stable.
   - An unstable exercise contributes `weight: 0` (`:293`) so it does not move
     `e1rmSlopePct` (`:308-310`), and it does not count toward
     `confidenceWeight` (`:304-306`) - but its `rawSessions` DO count toward
     `totalRawSessions` (`:298`), which is the denominator of both
     `confidence` (`:311`) and `discontinuity` (`:312`).
   - PR replay: `runningBest` starts from the prior best, and the first loaded
     session sets the baseline without counting as a PR
     (`:325`). So the FQ-7 rule is mirrored in the metric.
   - `prDensity` divides weighted PR events by eligible exposures (`:334`), so
     adding a new exercise raises the denominator immediately.
6. **Ledger consequences.** A lower `confidence` can trip
   `CONFIDENCE_FLOOR = 0.6` (`src/lib/interBlock.js:84, :302-306`) →
   INSUFFICIENT_DATA. `discontinuity` (stable share below 50%,
   `blockMetrics.js:312`) trips the explicit
   "An exercise change broke the strength comparison" gate
   (`src/lib/interBlock.js:297-301`).
7. **Adherence.** Adding an exercise adds completed allocator credit
   (`src/lib/blockLedgerGather.js:221-239`) against a `plannedSets` total that
   was fixed at block creation (`sumPlannedSets`, `:206-213`;
   `planned_muscle_volume` written once at
   `src/lib/database.js:4192-4235`). The adherence ratio therefore rises above
   what the plan prescribed.
8. **Learned range.** An INSUFFICIENT_DATA entry is skipped entirely
   (`src/lib/learnedRange.js:134`), so a block disrupted by a new exercise
   teaches nothing at all rather than teaching something wrong.

### Seams noticed (P)

- **P-1 (load-bearing).** Adding one new exercise mid-block can flip the whole
  muscle to INSUFFICIENT_DATA by two independent routes: the discontinuity gate
  (`src/lib/blockMetrics.js:312` → `src/lib/interBlock.js:297-301`) and the
  confidence floor (`blockMetrics.js:311` → `interBlock.js:302-306`), because
  the unstable exercise's sessions inflate the denominator
  (`blockMetrics.js:298`) without contributing evidence. Combined with
  `src/lib/blockSeed.js:88-92` (INSUFFICIENT_DATA is not a valid ledger), the
  next block's seed silently drops to the learned band - i.e. one new exercise
  routes a mature user's prescription through the un-aged path (H-1).
- **P-2.** `historyExists` is a **global** prior-row count
  (`src/lib/blockMetrics.js:248`), not per-exercise. After a long layoff the
  180-day prior window (`src/lib/blockLedgerRunner.js:69`) can be empty, making
  `historyExists` false, which makes every exercise read as NOT new
  (`:260`) and removes the novelty discount for a returning user - the case
  where novelty discounting matters most.
- **P-3.** Adherence compares completed credit against a planned total frozen at
  block creation (`src/lib/blockLedgerGather.js:206-213` vs
  `src/lib/database.js:4192-4235`). Adding exercises inflates the ratio; the
  `ADHERENCE_FLOOR = 0.6` gate (`src/lib/interBlock.js:81, :282`) is therefore
  easier to pass for a user who added work, which is the opposite of a
  conservative bias.
- **P-4.** The FQ-7 first-exposure toast copy
  (`src/screens/ActiveWorkoutScreen.js:1710`) reads
  "<weight> x <reps> logged as your starting point". For a veteran meeting a
  new variation of a lift they have done for years, "starting point" is
  literally true of the record baseline but may read as a claim about their
  training.

---

## Q. Cross-cutting seam index (for later phases)

Ranked by how much later phases depend on them.

| ID | Seam | Evidence | Phases |
| --- | --- | --- | --- |
| H-1 | Learned band has no age input; INSUFFICIENT_DATA routes a long-absent user straight to it | `learnedRange.js:90-96`; `blockSeed.js:88-92, :151-161`; `interBlock.js:240-245` | 5, 6 (D91-25) |
| F-1 | `getRecentCheckins` is count-bounded; advisor narrates ancient rows as "this week" | `database.js:6068`; `blockAdvisor.js:112-133, :510` | 6, 7 |
| S-LAUNCH 2 | `restoreNotifications` never runs for a signed-in user | `RootNavigator.js:1062, :1093-1099`; `scheduler.js:1234` | 6, and any notification phase |
| B-1 / M-1 | `phaseStartedAt` written once at onboarding; never reset on phase change | `ProOnboardingScreen.js:1066`; `ProGoalSetupScreen.js:268-286`; `CoachOutputScreen.js:1600-1602` | 2, 7 |
| L-1 / M-2 / D-1 | Plan switch, phase switch and Free→Pro upgrade all discard the adaptive seed | `PlansScreen.js:500`; `planAutoGen.js:223`; `database.js:4184-4218` | 4, 9 |
| K-1 | Nine coaching-state tables have no server LWW; migration 134 unapplied | `migrate_134_stale_write_triggers.sql:31-33, :96-99` | 60 (migration analysis) |
| J-1 | Only nine profile fields sync; autonomy/phase/experience do not travel | `sync/tables/profiles.js:30-43` | 2, 9 |
| A-2 | Learned band has no tier gate; a Free user can receive a `seed_learned` prescription | `blockSeed.js:151-161`; `blockLedgerRunner.js:359-375` | 4 (tier law) |
| O-1 | Lifting calm retroactively re-labels calm weeks as missed | `streak.js:36-42`; `useWeeklyStreak.js:145-151` | 5, and any wellbeing phase |
| N-1 | Two unrelated meanings of "manual" | `CoachOutputScreen.js:1017` vs `blockLedgerRunner.js:227` | 2, 4 |
| H-2 | "Your body's ready" pressure copy at unbounded overdue | `blockAdvisor.js:415` | 7 |
| I-1 | Planned-volume provenance does not survive restore; migration 132 unapplied | `migrate_132_planned_muscle_volume_provenance.sql:1-23` | 60 |
| P-1 | One new exercise can flip a muscle to INSUFFICIENT_DATA by two routes | `blockMetrics.js:298, :311-312`; `interBlock.js:297-306` | 10, 12 |
| B-4 / H-3 | Ledger idempotence freezes the staleness input at first computation | `blockLedgerRunner.js:109-114, :259` | 5, 6 |
| G-1 | `weeksOverdue` is off by one week by design; copy inherits it | `mesocycle.js:493`; `blockAdvisor.js:408-415` | 7 |

### Known deferrals and unapplied migrations touched by this map

- **D91-24** (early-deload weeks still count as accumulation weeks). Verified
  live in this tree: `src/lib/blockLedgerGather.js:54-58`
  (`accumulationWeeks` excludes only `deloadWeekIndex`) while
  `appliedEarlyDeloadWeekIndices` is used only for the deload-flag derivation
  (`:165-167`) and rebound windows (`:194-201`), never to remove a week from the
  accumulation set. Register entry:
  `docs/_FULL-APP-PRODUCT-MAP.md:5952-5961`. **Not stealth-fixed. Phase 8 owns
  its characterisation.**
- **D91-25** (training-epoch / learned-ceiling freshness). Mechanism traced at
  H-1. Register entry: `docs/_FULL-APP-PRODUCT-MAP.md:5964-5968` quoting
  `DECISIONS-2026-07-09.md:2360-2365`. **Not implemented. Phase 6 owns its
  characterisation.**
- **Migration 132** (`supabase/migrate_132_planned_muscle_volume_provenance.sql`)
  - planned-volume provenance to cloud. Applied remotely: NO (`:16-18`).
  Affects I, J.
- **Migration 133** (`supabase/migrate_133_delete_privacy_pref_rows.sql`) -
  removes `@volyume_privacy_prefs` rows that should never have been transmitted.
  Applied remotely: NO (`:13-17`). Affects the pref-sync surface in I, J, K.
- **Migration 134** (`supabase/migrate_134_stale_write_triggers.sql`) -
  refuse-stale-write triggers on nine coaching-state tables. Applied remotely:
  NO (`:96-99`). Affects K (and, via K-2, I and J).
- **Migration 135** (`supabase/migrate_135_coach_outputs_week_unique.sql`) -
  one coach output per user-week. Applied remotely: NO (`:16-19`). Affects K.
- **Migration 049** remains HELD (campaign log). Not touched by any path traced
  here.

---

*End of Phase 1 map. 16 personas traced. Nothing outside this file was
modified; no code, tests or other docs were changed.*
