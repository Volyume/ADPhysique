# Trial Audit 05 — Bypass audit

Date: 2026-06-08. Every gate below was found by reading the source file, not by
a keyword conclusion. Spec: "no cached state, no navigation shortcut, no offline
loophole that allows Pro access when entitlement is not active."

## ENTITLEMENT GATE INVENTORY (every gate, read in source)

There are TWO entitlement resolvers in the codebase, and they read different
fields. This is the headline inconsistency.

### Resolver A — `store.tier` (the cached `users_profile.tier` column)
Set by `useAppStore.checkTier (:507-523)` (cached) and `refreshTierFromCloud
(:784-848)` (server). Used by:
- **Route guard** `withProGuard` — `src/components/ProGate.js:125-126`
  (`tier !== 'pro'` → `ProLocked`). Wraps: `RootNavigator.js:114-120`
  (WeeklyCheckIn, NutritionTargets, BodyMetrics, CoachOutput, ProGoalSetup,
  CoachingReminders) + the gated cardio routes.
- **Component overlay** `ProGate` — `src/components/ProGate.js:25,31`.
- **Inline UI conditioning** (renders/omits Pro surfaces), all reading
  `store.tier`:
  - `src/screens/HomeScreen.js:200,441,719,860,950,956,1006,1141,1165,1218,1236`
    (coach banner, weight card, steps/cardio cards, next-workout, etc.).
  - `src/screens/PlansScreen.js:275,365,374,452,529` (Pro-switch action cards,
    PlanUpdate vs ProUpgrade route).
  - `src/screens/AnalyticsScreen.js:123` (cardio card).
  - `src/screens/BodyMetricsScreen.js:394-395`.
  - `src/screens/SettingsScreen.js:20`, `SettingsAccountScreen.js:23,32,40`,
    `SettingsCoachingScreen.js:106`, `SettingsNotificationsScreen.js:20`,
    `NotificationSettingsScreen.js:109`, `YouScreen.js:69`,
    `PlanDetailScreen.js:336`.

### Resolver B — `isPaidTier(userProfile)` (derived from `userProfile.trialState`)
`src/lib/proGate.js:62-63` `_resolveTier(userProfile?.trialState, …)`. Used by:
- `src/screens/SubscriptionScreen.js:47` (`tier = isPaidTier(userProfile)`) and
  `:48` (`cascade.stageOf(userProfile)`), `:49` (`daysRemaining`).
- `src/screens/CoachOutputScreen.js:1104` (`userTier:
  require('../lib/proGate').isPaidTier(userProfile)`) + `:1105`
  (`hasUsedTrial: !canStillTrial(userProfile)`) — feeds the differential paywall.

**INCONSISTENCY (bypass risk per the spec's gate-consistency question).**
Resolver A is the `tier` column; Resolver B is the `trial_state` column. They
are kept in step by the server (every transition writes both) and both are read
by `refreshTierFromCloud` (`tier` → `store.tier` `:830`; `trial_state` →
`userProfile.trialState` `:835`). But they are two separately-cached values; if
one is updated and the other isn't (e.g. a partial write, or the C1 direct DB
edit that touches `trial_state` but not `tier`), the Subscription/CoachOutput
surfaces and the feature gates will disagree. Severity: MEDIUM (divergent check;
not itself a Pro-content gate, but it is the inconsistency the spec asks to
flag). Fix: resolve both from one source.

**Safety logic is tier-blind (CONFIRMED, matches `COMPLETE_TIER_SCOPE_LOCKED.md:
59-65`).** `weeklyCoach.js` reads `hasUsedTrial` only for the paywall CTA
(`:374,381,1089`), never to gate the FFM floor / ED lockout / rapid-loss logic.

## CRITICAL #1 — Trial extend/reset via direct DB write
Covered in 01: RLS `FOR ALL` own-row (`migrate_005:33-35`) + the protect trigger
guards only `tier` (`migrate_068:60-82`) ⇒ a client can UPDATE `pro_trial_ends_at`
/ `trial_state`. Reset `trial_state='unstarted'` then the legitimate
`ProUpgradeScreen.completeUpgrade:110-120` (or re-`startCascade`) grants a fresh
14-day trial. Violates the locked one-time rule (`COMPLETE_TIER_SCOPE_LOCKED.md:
91-94`). Severity: CRITICAL.

## CRITICAL #2 — Offline cached entitlement
`checkTier (:507-523)` sets `store.tier` from the cached `TIER_KEY` (`:509,519`)
with NO comparison to `pro_trial_ends_at`. `refreshTierFromCloud` can't run
offline — 5s timeout (`:794`) → catch (`:841-847`) leaves the cached value. So a
user whose trial/sub expired server-side, offline, keeps `store.tier='pro'` ⇒
every Resolver-A gate passes, indefinitely. There is no local expiry check
anywhere (`daysRemaining :330-344` is display-only). Severity: CRITICAL (Pro when
not entitled / spec "no offline loophole").

## HIGH — Startup-timing window
`checkTier()` is awaited at bootstrap (`RootNavigator.js:572`); the splash gate
only waits for `tierChecked` (`:956`). `refreshTierFromCloud` is fire-and-forget
(`:612,778`), not awaited before routing. So every launch renders gates from the
cached tier before the server reconciliation lands (≤5s, or never offline). A
recently-expired user gets a Pro window each launch. Severity: HIGH.

## NAVIGATION bypass
`withProGuard` enforces at the screen regardless of entry (deep link / stale nav
state) — `ProGate.js:123-128`; a direct nav to a guarded route with
`store.tier!=='pro'` renders `ProLocked`. No navigation bypass found **for
guarded routes**. CAVEAT: the inline-conditioned Pro surfaces on shared screens
(HomeScreen/PlansScreen/etc., Resolver A) are not route-guarded; they rely on the
same `store.tier`, so they share the offline/startup bypass above rather than a
separate navigation one.

## RACE conditions
Gates read `store.tier` synchronously at render and re-render on change. The
async risk is the startup window (above): during the fire-and-forget
`refreshTierFromCloud`, `store.tier` is the cached value. The optimistic-paid
window (`setOptimisticPaid :468-472`, honoured `:814-816`) deliberately holds
`'pro'` for 5 min post-purchase; it can't be triggered without a real
`purchasePackage`/`restore`, and reverts if the server never grants — not a
user-exploitable bypass on its own.

## OFFLINE for an active subscriber (intended)
An active subscriber offline keeps Pro on the cached tier — this is intended
fail-open. The problem is only the EXPIRED/LAPSED user keeping it (CRITICAL #2),
because nothing locally distinguishes "active, offline" from "expired, offline".
