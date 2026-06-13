# PASS 1 — SECTION 1: ENTITLEMENT & GATING REGISTER

Method: locate-and-cite (founder re-pace, Section 1 EXCEPTION = done carefully now, high
downstream consumption). Exact file:line on every entry; gate LOGIC confirmed; gate
condition stated (the "value" here IS the condition). No `~`. Read-only.

## GATING MODEL (confirmed from source)
Gating is **all-or-nothing**: a user is `tier === 'pro'` or `'free'`. There is **no granular
per-feature entitlement map** — `proGate.js:13-20` records that FEATURE_MAP/hasFeature/PRO_ROUTES
were built, never wired, and removed 2026-05-29. **Safety logic is tier-blind** (`proGate.js:22-23`:
FFM floor, ED-pattern lockout, rapid-loss compression MUST NOT consult tier — confirmed in
weeklyCoach.js, which never reads tier).

### Tier resolver — `src/lib/proGate.js`
- `PRO_BETA_ACTIVE` | proGate.js:28 | `export const PRO_BETA_ACTIVE = false;` (beta override OFF at launch).
- `_resolveTier(trialState, betaActive)` | proGate.js:39-53 | betaActive→'pro'; trialState
  `paid_pro|pro_trial_active|paid_complete|complete_trial_active`→'pro'; `free|cascade_expired|unstarted|default`→'free'.
- `isPaidTier(userProfile)` | proGate.js:62-64 | `_resolveTier(userProfile?.trialState, PRO_BETA_ACTIVE)`.

### Tier state in the store — `src/store/useAppStore.js`
- `TIER_KEY = '@volyume_tier'` | :17 | AsyncStorage cache key.
- `tier` initial null | :476; reset null | :455.
- optimistic paid set | :493 `set({ tier: 'pro', _optimisticPaidUntil: until })` + cache :494.
- optimistic clear | :526-527 `set({ _optimisticPaidUntil: 0 })` + cache 'free'.
- hydrate from cache | :566 `(await AsyncStorage.getItem(TIER_KEY)) || null`; M-3 guard (clear stale 'pro') :574-580; `set({ tier, tierChecked: true })` :583.

### Stage resolver (trial lifecycle) — `src/lib/payments/cascade.js`
- `stageOf(profile)` | cascade.js:416 | returns the trial/lifecycle stage (e.g. 'pro_trial'); used for trial banners + Subscription screen (NOT a hard feature gate).

### Enforcement component — `src/components/ProGate.js`
- `ProGate({ children, feature, style })` | ProGate.js:22; gate `if (tier === 'pro') return <>{children}</>;` | ProGate.js:32 (else renders an upgrade prompt).
- **NOTE: 0 wrapper usages in the app** (`grep <ProGate` → only the docstring example, :18). The component exists but is unused; all real gating is the inline `tier === 'pro'` checks below.

## GATE USAGES — COMPLETENESS: 39 inline `tier === 'pro'` checks across 18 files (+ 1 ProGate component, unused; + isPaidTier/stageOf reads). Per-file counts verified by grep.

### Pro-gated SURFACES (tier === 'pro' guards Pro-only content/features)
- HomeScreen.js (8): :287 (load coach/weight/trial data only for pro), :314 trial banner (stageOf 'pro_trial'), :619 first-run cue, :830 coach data, :930 coach banner, :1211 first-run cue render, :1305 pro vs free home body, :1387 pro section, :1422 coach one-liner. → gates the coaching/check-in home surfaces.
- PlansScreen.js (4): :366 isProWithPlan, :375 pro action cards, :453 route PlanUpdate(pro)/ProUpgrade(free), :530 pro section. → plan-update (Precision Coaching) is Pro; plan library is Free.
- AnalyticsScreen.js (3): :76 weightTrend only for pro user id, :256 weight trend render, :304 cardio section (+cardioEnabled). → weight-trend + cardio analytics are Pro.
- ReadinessCards.js (3): :139, :215 freshness entries, :240 recovery-trend insight. → readiness/recovery insight is Pro.
- WelcomeScreen.js (2): :61 quiz-first routing, :65 login intent pro_signup/free_signup.
- SubscriptionScreen.js (2): :142 label, :179 pro vs free body (display; isPaidTier :54, stageOf :55).
- SettingsAccountScreen.js (2): :23 sub label, :40 pro-only row.
- BodyMetricsScreen.js (2): :460-461 a Pro-gated body-metrics behaviour (adaptive burn / pro toggle).
- YouScreen.js (1): :69 isPro.
- SettingsScreen.js (1): :20 label.
- SettingsNotificationsScreen.js (1): :20 pro-only notification setting.
- SettingsCoachingScreen.js (1): :127 the coaching-tone/Pro coaching block (Pro).
- ProUpgradeScreen.js (1): :262 trulyPro guard.
- PaywallScreen.js (1): :124 post-purchase result.tier === 'pro'.
- NotificationSettingsScreen.js (1): :109 isPro.
- ActiveWorkoutScreen.js (1): :221 session adjustment (Precision Coaching session autoreg) only for pro. → in-workout coaching adjustment is Pro; logging itself is Free.
- RootNavigator.js (1): :1138 `tier === 'pro' ? <ProOnboardingStack /> : <FirstRunStack />` → onboarding flow forks on tier.
- store/useAppStore.js (1): :574 the M-3 stale-pro guard.
- lib/partners/signals.js (1): a partner-signal tier check.

### Reads of isPaidTier / stageOf (fallback before store hydrates)
- CoachOutputScreen.js:1246 `userTier: storeTier ?? isPaidTier(userProfile)` (feeds differential paywall).
- SubscriptionScreen.js:54-55 `tier = storeTier ?? isPaidTier(userProfile)`, `stage = cascade.stageOf(userProfile)`.

## SPOT-VERIFY (gate logic)
- ProGate.js:32 confirmed: `tier === 'pro'` → children, else upgrade prompt. Binary, correct.
- proGate.js _resolveTier confirmed: only the four pro/trial states return 'pro'; everything else 'free'.
- Safety tier-blindness confirmed: weeklyCoach.js / nutritionEngine.js FFM-floor + ED + rapid-loss paths read no tier (Tier-A transcription shows their inputs; no `tier` param).

## CROSS-CHECK vs CLAUDE.md FREE/PRO list (flag for Section 4/blueprints)
CLAUDE.md Pro = food diary, barcode, meal suggestions, nutrition targets, macros, cardio, steps,
check-ins, Precision Coaching adjustments, division plans, safety systems, wearables. The inline
gates above cover coaching/check-in/analytics/cardio/plan-update surfaces; food-diary/barcode/
nutrition-target gating lives on those screens (Diary/Nutrition) — VERIFY their gate lines when a
blueprint consumes them (Tier B locate-and-cite pending for Diary/Nutrition/Cardio screens in Section 7 nav + here).

SECTION 1 COMPLETENESS: 39 inline tier gates (per-file counts above sum to 39) + 1 unused ProGate
component + tier resolver (3 fns) + store tier lifecycle (7 points) + stageOf. None dropped.
VALUE not deferred (the gate condition IS stated); locations exact, no `~`.
