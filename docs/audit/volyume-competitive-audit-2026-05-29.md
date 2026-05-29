# Volyume competitive audit, 2026-05-29

Senior product and UX audit. Weighted toward usability, in-app flow, and the
progress/learning loop that makes a user understand the app, feel themselves
improving, convert to Pro, and recommend it.

**Method.** Phase 1 (internal) is read from the actual code in `src/` plus the
repo's own locked docs, verified against the current tree (HEAD `ee20c9b`, equal
to `origin/main`). Phase 2 (competitors) is fresh web research run today across
eleven apps, with sources in the Appendix. Where the repo's docs disagreed with
code, code won. Where a competitor fact could not be verified, it is flagged.

**Scope is derived from the repo, not assumed.** The locked exclusions below are
treated as fixed and no recommendation here violates them: no social feed; no
gamification beyond the single week-streak chip; no LLM anywhere in the product
or in marketing; deterministic coach only; photos stay on-device; no Apple Watch
app at v1; Android-first, iOS deferred; Peak Week removed; Play Billing direct,
not RevenueCat. Sources: `docs/CURRENT_STATUS.md` § 8, `docs/MASTER_VISION_AND_PLAN.md`
§ 19, `docs/BACKLOG.md` NEVER list, `docs/COMPLETE_TIER_SCOPE_LOCKED.md`.

---

## Executive summary: the five moves that matter

Volyume sits in a genuine gap. Every competitor researched is either a logger
with shallow coaching and no nutrition (Hevy, Strong, Setgraph, Fitbod), a
science-led coach with poor logging and no nutrition (RP Hypertrophy, Dr. Muscle,
Juggernaut), a nutrition app with no training (MacroFactor, MyFitnessPal), or a
human coach at £150 plus per month (Caliber). None bundles food logging, a
hypertrophy-grade adaptive coach, and a fast logger in one app. That hybrid, plus
tier-blind safety guardrails no rival has, is the moat.

The risk is not the strategy. It is execution on the two things every winning
app in this category nails and Volyume has not yet proven: fast logging, and a
visible "I am improving" loop. The top five moves:

1. **Close the logging-speed gap on the most-used screen.** Hevy, Strong and
   Setgraph log a set in seconds and are praised for exactly that. Volyume's
   `ActiveWorkoutScreen` is feature-rich but its set-entry density and tap cost
   are not yet best-in-class. This is the single highest-traffic surface and the
   first thing a switcher judges. Serves usability. Touches `ActiveWorkoutScreen.js`,
   `SetEntry.js`.

2. **Give the progress loop one signature artefact and make it legible from
   day one.** MacroFactor has the expenditure graph, Boostcamp has a 0-100
   Strength Score, Fitbod has the recovery map. Volyume shows improvement across
   six scattered surfaces with no single headline a user checks obsessively.
   Pick one deterministic spine. Serves understanding and word-of-mouth. Touches
   `AnalyticsScreen.js`, `PRWallScreen.js`, `HomeScreen.js`.

3. **Surface the adaptive expenditure the engine already computes.** MacroFactor's
   most-loved feature is watching its model learn your real burn. Volyume's
   `nutritionEngine.computeAdaptiveTDEEAdjustment` already does the maths but never
   renders it as a trend a user can watch. Surfacing it would match MacroFactor's
   best artefact and uniquely pair it with training. Serves understanding and
   conversion. Touches `BodyMetricsScreen.js`, `DiaryScreen.js`, `nutritionEngine.js`.

4. **Make the integrated safety and adherence-neutral story the spearhead, and
   honour it in the rings.** The FFM floor and ED-pattern lockout are things no
   competitor ships, and adherence-neutral framing is the single most-praised
   trait of MacroFactor. Volyume claims this philosophy but `MacroRings.js` still
   turns amber over target. Make the rings genuinely neutral so the product
   matches its own pitch. Serves conversion and trust. Touches `MacroRings.js`,
   store listing copy.

5. **Get conversion ready before the cascade goes live.** The six differential
   paywall triggers are built (`differentialPaywall.js`) but disabled, and
   `PRO_BETA_ACTIVE = true` means the paywall has never run in the wild. Tighten
   the onboarding disqualifier line, voice-check the six trigger copies against
   the locked rules, and instrument every cascade transition before Phase B.
   Serves conversion. Touches `proGate.js`, `CascadeGateScreen.js`, `ProOnboardingScreen.js`.

---

## Phase 1: internal audit, from the code

Verified against the current tree. Counts: 59 screen files in `src/screens`, ~39
components (`src/components` plus `src/components/food`), 97 test suites, 12 engine
simulator scenarios.

### Tab and screen inventory

Five bottom tabs (`RootNavigator.js:343-347`): **Train, Plans, Diary, Progress, You.**

**Train (HomeStack).** `HomeScreen` (daily narrative, today's planned workout,
morning-weight entry, weekly volume snapshot, today's intake card, coach link),
`BuildWorkout` (pick routine or travel plan), `ActiveWorkout` (the live logger),
`WorkoutSummary` (post-session: PR, volume, adaptive engine writes), plus
`WorkoutHistory`, `VolumeHeatmap`, `CoachReview`, `ShareCard`.

**Plans (PlansStack).** `Plans` (active plan, archived plans, quick start),
`PlanDetail`, `RoutineDetail` (the routine editor), `ExerciseLibrary`,
`ExerciseDetail` (1RM trend, plateau detection, swaps), `ManualBuilder`,
`PlanLibrary` (bundled library plus a guided quiz), `MesocycleBuilder`.

**Diary (DiaryStack).** `Diary` (date pager, meal sections, macro rings, water,
swipe-delete, long-press multi-select), `FoodSearch` (five sub-tabs: Recents,
Favourites, Frequents, Custom, Database), `AddCustomFood`, `ScanBarcode`
(vision-camera), `ScanLabel` (MLKit OCR), `FoodInsights` (CSV export), `MyRecipes`
plus `RecipeBuilder`, `MyMeals` (saved-meal templates, shipped 2026-05-29).

**Progress (ProgressStack).** `Analytics` (tonnage trend, PRs over time, weekly
volume, muscle freshness, fatigue trend, block progress), `PRWall`
(strength-standard tiers Beginner to Elite), `VolumeHeatmap` (body-diagram
MEV/MAV/MRV), `BodyMetrics` (weight + BF% + measurements, EWMA trend, Pro-gated),
`YearOfLifts`, plus shared workout screens.

**You (ProfileStack).** `AthleteHub` (recovery EMA, muscle freshness, milestones,
goal management), `CoachOutput` (the weekly Precision Coaching card),
`WeeklyCheckIn`, `NutritionTargets`, `ProGoalSetup`, `Settings`,
`NotificationSettings`, `CoachingReminders`, `Subscription`, `ProUpgrade`,
`Article9Consent`, `GoalLockConsent`, `WellbeingCheck` (SCOFF), `Credits`,
`PrivacyPolicy`, `SubscriptionPolicy`, `DebugLog`, `CoachHeldHistory`.

### New-user journey: first launch to first visible progress

`WelcomeScreen` (tier strip) to `LoginScreen` (email or Google or Apple) to
`Article9ConsentScreen` (mandatory health-data consent, also starts the trial
cascade) to `ProOnboardingScreen` (stats, goal, plan generation, notification
setup) to `ProSetupCompleteScreen` to the Train tab.

- **First logged session.** Home, start a routine, `ActiveWorkout`, log sets,
  finish, `WorkoutSummary`. PR detection (`algorithms.detectPR`) fires a
  celebration overlay in-session, and the post-workout flow writes adaptation
  events. This is real day-one value.
- **First visible progress.** Two clocks run at different speeds. The training
  clock is immediate: PRs, tonnage, the daily narrative on Home. The coaching
  clock is slow: the weekly card (`CoachOutputScreen` running `weeklyCoach`) holds
  output behind a data-confidence gate that needs three or more weigh-ins, and
  calorie or volume adjustments need two off-target weeks. So the headline payoff
  (the adaptive coach) is two to three weeks out.

### The progress loop: how the app shows improvement and teaches

Improvement is shown, but it is spread thin. The surfaces: `AnalyticsScreen`
(tonnage, PRs per week, weekly volume), `PRWallScreen` (all-time bests with
strength-standard tiers), `VolumeHeatmap` (per-muscle vs landmarks),
`AthleteHubScreen` (recovery EMA, milestones, muscle freshness), `ExerciseDetail`
(per-lift 1RM trend), `dailyNarrative` (one-line Home hero), `YearOfLifts`
(annual retrospective). Each is good. None is the single thing a user opens the
app to check.

Teaching is mostly implicit. The "why" is genuinely strong where it appears:
`whyThisTemplates.js` is a 12-key library of plain-English explanations, the coach
output names what changed and why (confirm-then-apply, `coachApply.js`), and
`InfoTooltip` is used throughout. But explicit education is thin: a static
`NutritionEducationScreen`, and onboarding teaches the system barely at all. The
model is sophisticated and a new user is not told how it thinks.

### Pro/free boundary

`proGate.js` is the source of truth. Two tiers (free, pro), Complete tier removed.
`PRO_BETA_ACTIVE = true` (`proGate.js:22`) currently grants every signed-in user
Pro, so the paywall is not exercised in production. The differential paywall is
built (`differentialPaywall.js`: six trigger contexts, locked copy, plus
no-trial variants) and surfaced via `DifferentialBadge` on the coach card and
`PaywallScreen`, but it is disabled until the cascade goes live in Phase B.
`CascadeGateScreen` (day 19 and day 21), `TierComparisonStrip`, `ProUpgradeScreen`
and `SubscriptionScreen` are all present. Pricing is Pro at £0.99 open beta,
£1.99 founders, £3.99 standard, with a 21-day trial (`COMPLETE_TIER_SCOPE_LOCKED.md`).

The honest read: the conversion machine is built but unproven, and the value of
Pro is communicated by a feature strip rather than by a felt moment, because the
felt moment (the differential "with food data we could have told you X") is
switched off.

### Friction log (file-cited)

| # | Friction | Evidence | Cost |
|---|---|---|---|
| F1 | Logging density on the highest-traffic screen | `ActiveWorkoutScreen.js` (2,427 lines), `SetEntry.js` | Set entry is more tap-heavy than Hevy/Strong; first thing a switcher judges |
| F2 | Long onboarding before first value | `ProOnboardingScreen.js` (1,340 lines, 32 `useState`) | Drop-off risk; competitors reach first value faster |
| F3 | Coach payoff delayed 2-3 weeks | `weeklyCoach` data-confidence gate, `CoachOutputScreen` | The headline feature is invisible during the exact window (days 7-21) that decides retention |
| F4 | No single progress headline | six progress surfaces, no spine | "Am I improving?" has no one-glance answer |
| F5 | Macro rings turn amber over target | `MacroRings.js` (`bandColour`) | Contradicts the adherence-neutral pitch and the ED-safe brief |
| F6 | Paywall unproven, value-moment disabled | `proGate.js:22`, `differentialPaywall.js` | Conversion mechanics untested before Phase B |
| F7 | Adaptive expenditure computed, never shown | `nutritionEngine.computeAdaptiveTDEEAdjustment` | The category's most-loved artefact is hidden |
| F8 | Two write paths for weekly check-in | `WeeklyCheckInScreen.js:385`, `WorkoutSummaryScreen.js:377` | Field-set drift risk (internal, not user-visible) |
| F9 | Settings and AthleteHub density | `SettingsScreen.js` (1,199 lines), `AthleteHubScreen.js` (1,240) | Cognitive load on the You tab |

---

## Phase 2: competitor research (live web, 2026)

Condensed. Full per-app detail and every source URL are in the Appendix. Prices
are as published in 2026; several are US-store figures and UK pricing was not
separately confirmed.

### Hypertrophy loggers

- **Hevy.** The category default. Sub-90-second onboarding, log a set in seconds,
  full Apple Watch plus Live Activity so the phone stays pocketed, clean graphs,
  real-time PR detection. As of 18 Feb 2026 it added Hevy Trainer, algorithmic
  (not LLM) auto-progression from logged performance. Free tier capped at 4
  routines, 7 custom exercises, 3 months history; Pro $2.99/mo, $23.99/yr, $74.99
  lifetime, the cheapest in the category. Praised for speed and price; serious
  lifters dislike the social feed as noise. Differentiator: community plus
  included AI auto-progression at the lowest price.
- **Strong.** The minimalist iOS original. Log-first, no plan, no coaching, the
  fastest no-thinking set entry, rock-solid offline. Free tier capped at 3
  templates. Interface now read as dated. Differentiator: frictionless logging
  refined over a decade.
- **Setgraph.** Apple-Watch and Live-Activity-first; claims a set logged in under
  three seconds with the phone pocketed; "amazing charts." Smaller exercise
  database; criticised as "analytics with no insight." Differentiator: best watch
  logging.
- **Alpha Progression.** Hypertrophy plan generator with RIR-based automatic
  progression, equipment-aware, generous free tier, generator and charts gated.
  ~€9.99/mo. Differentiator: the deepest equipment-aware, RIR-driven plan
  generator of the loggers.

### Adaptive and AI coaches

- **Fitbod.** Cleanest logging UI in the category, recovery/freshness map drives
  next-workout selection. Deterministic, marked as AI, but inputs are implicit
  (no RIR or readiness sliders) and the fatigue logic is called shallow. Watch
  app weak. 3 free workouts then $15.99/mo or $95.99/yr. Complaints: repetitive
  workouts, weak form-coaching for beginners. Differentiator: lowest-friction
  "tell me what to do today."
- **Dr. Muscle.** The deepest real autoregulation of the consumer set: daily
  undulating periodisation, automated overload and deloads, study-cited. Logging
  UX is the weak point ("feels like a research prototype"). ~$48.99/mo or
  $399.99/yr, the most expensive. Differentiator: genuinely study-cited
  after-every-session autoregulation, undermined by its UI.
- **Juggernaut AI.** Readiness-driven autoregulation for strength: every session
  starts with a 1-5 readiness rating (sleep, motivation, nutrition, soreness),
  adjusts across every timescale, pulls sleep and HRV from Health. $34.99/mo or
  $349.99/yr. Complaints: top sets often too light, no auto-correct.
  Differentiator: multi-timescale readiness system tied to credible JTS method.
- **RP Hypertrophy.** The canonical MEV-to-MRV volume-landmark engine. Logs RIR
  plus weekly pump, soreness and joint feedback, then modulates next week's set
  count per muscle, with auto-deloads. ~$24.99/mo on sale, ~$224.99/yr. No
  nutrition module (separate Diet app). Complaints: high price, confusing in
  spots, minimal exercise-selection help. Differentiator: the direct
  implementation of Israetel's published volume system.

### Nutrition and program hubs

- **MacroFactor.** The leading adaptive nutrition app: deterministic, no LLM,
  reverse-engineers real TDEE from logged intake and weight. Fastest logging in
  independent tests, but barcode coverage is "geographically uneven" outside the
  US, a direct opening for a UK-first rival. No free tier and never will be;
  $11.99/mo, $5.99/mo annual. Two things users love most, and both are squarely
  in Volyume's lane: the expenditure graph (watch your real burn surface), and
  the adherence-neutral tone (no shame, no red bars, the plan adapts from whatever
  you logged). Differentiator: adaptive expenditure plus adherence-neutral
  framing.
- **MyFitnessPal.** The incumbent: 20 million plus food database, but static
  targets, barcode scanner paywalled, ad-heavy, Trustpilot 1.6/5, launched an ad
  network in March 2026. Differentiator: database size and ubiquity, not quality.
- **Boostcamp.** Free program-library-first: 11,000 plus programs including
  coach-authored (RP, Nippard), full logger, PRs. Pro adds a 0-100 Strength Score,
  per-muscle volume heatmap, e1RM curves. $59.99/yr. No food logging.
  Differentiator: largest free library of credible coach-authored programs.
- **Caliber.** Free DIY logger up to human 1-on-1 coaching at roughly £150 plus
  per month. 20-plus-step onboarding. Differentiator: real human coaching in-app,
  the high-touch end Volyume undercuts on price.

---

## Phase 3: comparison matrix

Volyume marked against the field. "Leads" means best-in-class or close; "Matches"
means competitive; "Lags" means behind the leaders.

| Dimension | Volyume | Verdict | Detail |
|---|---|---|---|
| Usability (logging flow) | Full logger, plate calc, rest timer, supersets, swaps, cluster and unilateral sets | **Lags** | Hevy/Strong/Setgraph log faster and offer watch + pocketed logging. Volyume has no watch app (out of scope) and denser set entry. The most-used screen is not yet best-in-class. |
| Progress / learning loop | Six strong surfaces, plain-English "why", but no single headline | **Matches, could lead** | Rich data, no spine. MacroFactor (expenditure graph) and Boostcamp (Strength Score) win on one glanceable artefact. |
| Coaching intelligence | Deterministic weekly coach, confirm-then-apply, per-session adaptive engine, FFM floor and ED-pattern safety | **Leads on breadth and safety** | Deeper and safer than Fitbod or the loggers. RP and Juggernaut have more transparent per-muscle and readiness autoregulation; Volyume reads more inputs but surfaces the model less obsessively than RP's landmark view. The safety guardrails are unmatched. |
| Onboarding | Welcome, consent, full Pro onboarding, plan generation | **Lags on speed** | Thorough but long. Hevy and Fitbod reach first value faster. MacroFactor is also slow but is honest about it; Volyume is not yet honest about its cold start. |
| Pro conversion mechanics | Differential paywall (6 triggers), cascade gates, tier strip | **Matches on design, unproven** | Well-designed and on-brand, but disabled (`PRO_BETA_ACTIVE`) and the value-moment is off. Hevy and Boostcamp have simple, proven freemium caps. |
| Nutrition integration | Diary, barcode, OCR, recipes, saved meals, adaptive TDEE, three-source waterfall plus CoFID | **Leads (uniquely)** | No training competitor has this. MacroFactor has the nutrition but no training; MFP is static and paywalled. UK-first food data beats MacroFactor's US-leaning barcodes. |
| Word-of-mouth drivers | ShareCard, Year of Lifts, no social by design | **Lags structurally, by choice** | Hevy's social feed is the category's WOM engine and is out of scope for Volyume. The in-scope levers (ShareCard, a remarkable coach) are present but underexploited. |
| Price | £0.99 to £3.99 Pro | **Leads** | Undercuts everyone except Hevy, and far below the AI coaches ($35-49/mo) and MacroFactor ($12/mo). |
| Privacy and safety | On-device first, Article 9 consent, ED guardrails, no social | **Leads** | A genuine differentiator no rival matches, especially UK-first. |

---

## Phase 4: prioritised recommendations

Each scored Impact times Effort and tied to the goal it serves
(usability, understanding, conversion, virality). All consistent with the locked
scope: nothing here adds a social feed, an LLM, gamification, a watch app, or
cloud photos.

### Quick wins (low effort, high or medium impact)

1. **Logging-speed pass on `ActiveWorkoutScreen` and `SetEntry`.** Impact high,
   effort medium-low. Bigger tap targets, faster steppers, fewer taps to commit a
   set, keep the existing previous-performance prefill prominent. The rest timer
   and pocketed-notification path already exist; the gap is per-set tap cost.
   Serves usability. (Touches `ActiveWorkoutScreen.js`, `SetEntry.js`.)

2. **Make `MacroRings` genuinely adherence-neutral.** Impact medium, effort low.
   Today the over-target band is amber (`bandColour`). The adherence-neutral brief
   and MacroFactor's most-praised trait both say no colour judgement on a logged
   day. Drop the warning colour above target, keep the number factual. Serves
   understanding and trust, and removes an ED-safety contradiction. (Touches
   `MacroRings.js`.)

3. **Onboarding disqualifier line.** Impact medium, effort low. One honest line
   early in `ProOnboardingScreen` that lets a non-target user self-deselect before
   the trial clock starts (the growth docs already call this the cheapest
   retention lever). Serves conversion and retention, in the locked voice.
   (Touches `ProOnboardingScreen.js`, `WelcomeScreen.js`.)

4. **Honest cold-start framing for the coach.** Impact medium, effort low. State
   plainly on the Home coach card and at onboarding what Precision Coaching can
   see now and what it will tell the user once it has two weeks of data. This is
   exactly MacroFactor's move and it converts the slow payoff (F3) from a silent
   gap into a stated promise. Serves understanding and retention. (Touches
   `HomeScreen.js`, `CoachOutputScreen.js`.)

5. **Spacing and radius token sweep.** Impact low-medium (craft), effort medium.
   215 raw numeric `borderRadius`, `padding` and `margin` literals exist across
   screens and components despite `spacing` and `radius` tokens in `theme.js`.
   Route them through the tokens for visual consistency. Serves usability polish.
   (Touches screens and components broadly; see Phase 5.)

### High-impact bets (medium effort)

6. **One signature progress artefact.** Impact high, effort medium. Choose a
   single deterministic, glanceable headline the user opens the app to check.
   The strongest in-scope candidate already half-exists: elevate the
   strength-standard surface in `PRWallScreen` into a persistent "where you stand
   and where you are heading" headline, or promote a single weekly "this is
   working, here is the evidence" card. Match MacroFactor's expenditure graph and
   Boostcamp's Strength Score for stickiness without copying their domain. Serves
   understanding and word-of-mouth. (Touches `PRWallScreen.js`, `AnalyticsScreen.js`,
   `HomeScreen.js`.)

7. **Surface the adaptive expenditure as a trend.** Impact high, effort medium.
   `nutritionEngine.computeAdaptiveTDEEAdjustment` already reverse-engineers the
   user's burn. Render it as a watchable trend in `BodyMetricsScreen` or `Diary`,
   the way MacroFactor does, and pair it with training context no nutrition app
   can. This is the clearest single feature that would make the Diary feel
   intelligent rather than a log. Serves understanding and conversion. (Touches
   `BodyMetricsScreen.js`, `DiaryScreen.js`, `nutritionEngine.js`.)

8. **Activate, instrument and voice-check the conversion machine before Phase B.**
   Impact high, effort medium. The six differential paywall triggers
   (`differentialPaywall.js`) are the felt value-moment ("with food data,
   Precision Coaching could have told you X"). Confirm each copy obeys the locked
   voice (British English, no em dashes, no jargon, 25 words), wire cascade-stage
   telemetry from day one, and plan the move off `PRO_BETA_ACTIVE`. Serves
   conversion. (Touches `differentialPaywall.js`, `CascadeGateScreen.js`,
   `proGate.js`, telemetry.)

9. **Lean into ShareCard as the in-scope word-of-mouth artefact.** Impact medium,
   effort medium. With social out of scope, `ShareCardScreen` is the WOM lever.
   Make it trivially reachable from a PR, a weekly coach win, and Year of Lifts,
   and keep it on-brand (it currently carries its own hex palette; align it to the
   locked look). Serves virality. (Touches `ShareCardScreen.js`, `WorkoutSummaryScreen.js`,
   `PRWallScreen.js`.)

### Long-term (higher effort, or already deferred by founder)

10. **Coaching transparency parity with RP.** Impact medium, effort high. RP's
    per-muscle volume-vs-landmark view is the clearest "here is the dial the coach
    is turning" in the market. Volyume has the data (`VolumeHeatmap`, planned
    muscle volume) but does not tie it visibly to next week's coach decision.
    Connecting the heatmap to the confirm-then-apply volume move would make the
    coach feel legible. Serves understanding.

11. **Maintainability debt, already deferred with cause, do not relitigate.** The
    two coexisting sync layers (`lib/sync.js` plus `lib/sync/`), two telemetry
    modules, duplicate `computeEWMA`, two strength-standard implementations, and
    the god-screens (`HomeScreen` and `ActiveWorkout` at ~2,400 lines) are real
    debt, but the founder has explicitly deferred the row-12 sync refactor and the
    `database.js` split (`CURRENT_STATUS.md` § 0.0, `AUDIT.md` Phase 5). None is
    user-visible. Listed for completeness, not proposed.

---

## Phase 5: design quality and anti-vibe-code audit

**Verdict: deliberately crafted, not assembled by guesswork.** The evidence of
intent is strong and specific. Ranked below by visibility to a first-time user.

### Evidence of deliberate craft

- **A real design-token system.** `src/styles/theme.js` is not a scatter of
  values. It documents WCAG contrast ratios per colour (`#0D0D0D` chosen over pure
  black to avoid astigmatic halation, textPrimary at 19.44:1), ships an
  Okabe-Ito colour-blind-safe palette swap, a higher-contrast swap, a larger-text
  multiplier applied at boot, and tiered `spacing`, `radius`, `fontSize`,
  `fontWeight`, `iconSize`, `shadow` and `motion` scales. This is a designed
  system, not a guess.
- **Motion is intentional and accessible.** A `motion` token set (card 220ms,
  state 160ms, micro 90ms) and 79 references to motion or reduceMotion across
  screens and components. Reduce Motion is respected.
- **Quality gates exist.** `eslint.config.js` plus a `lint` script (added in the
  2026-05-29 audit), 97 test suites, 12 engine simulator scenarios, plus voice
  snapshot tests that lock user-facing copy. The prior audit (`docs/AUDIT.md`,
  2026-05-29) already fixed the gradient hero (C1), chatbot-shaped error toasts
  (C2), an unsolicited greeting (C3), and routed stray hex through tokens (C5).
- **`GradientCard` is now genuinely flat** (`GradientCard.js:7-9, 56`): a
  `colors.surface` card with an amber accent, no gradient, honouring the locked
  no-gradient rule even though the name is kept for call sites.

### Real debt, ranked by first-time-user visibility

1. **Logging density (high visibility).** Covered in Phase 4.1. The most-used
   screen is the most visible craft surface and it is not yet as tight as Hevy or
   Strong.
2. **215 ad-hoc layout literals (medium visibility).** `borderRadius`, `padding`
   and `margin` numbers hardcoded across screens and components despite tokens
   existing. The result is subtle inconsistency in gaps and corners between
   screens. A single token sweep fixes the cluster (Phase 4.5). The tokens are
   right; they are just not applied everywhere.
3. **`MacroRings` colour semantics (medium visibility, ED-sensitive).** The
   over-target amber contradicts the stated adherence-neutral philosophy. Phase 4.2.
4. **`ShareCardScreen` carries a parallel hex palette (low visibility).** This is
   an intentional standalone HTML/image template (the repo exempts it), but it is
   a second colour system. Worth aligning to the locked palette so the shared
   artefact looks unmistakably Volyume (Phase 4.9).
5. **Internal duplication and god-screens (not user-visible).** Two sync layers,
   two telemetry modules, duplicate `computeEWMA` and strength-standard
   implementations, 2,400-line screens. Maintainability, not craft as the user
   sees it; deferred by founder decision.

Copy and voice read as a single author. The voice rules in `CLAUDE.md` and
`COACHING_VOICE_SYNTHESIS_LOCKED.md` are enforced by snapshot tests and a copy
lint, and the prior audit confirmed em dashes and AI tells are absent from shipped
strings. Navigation follows a consistent stack-per-tab pattern. The visual
hierarchy is numbers-first by design (`DESIGN_SYSTEM.md`), which suits the
audience.

---

## Open questions (genuinely unclear from the repo)

1. **Is a single signature progress metric wanted, and which one?** The repo has
   the ingredients (strength standards, adaptive TDEE, volume landmarks) but no
   stated decision to elevate one as the headline. This is a product call.
2. **What is the intended day-one value proposition before the coach has data?**
   The code gives PRs and the daily narrative, but no doc states what the first
   session should make a new user feel. Needed to fix F2/F3.
3. **When does `PRO_BETA_ACTIVE` flip, and is the differential value-moment meant
   to be the primary converter or a secondary one?** Affects how hard to invest in
   Phase 4.8 now.
4. **Is the adherence-neutral brief meant to be absolute (no colour over target)
   or is amber a deliberate founder override?** `CURRENT_STATUS.md` § 5 records the
   founder chose amber; this audit recommends neutral, so it needs a founder call.
5. **What is the WOM strategy given social is out of scope?** ShareCard is the
   obvious lever but there is no stated WOM plan beyond it.

---

## Appendix

### A. Internal file references

- Tabs and navigation: `src/navigation/RootNavigator.js:165-348`.
- Design tokens: `src/styles/theme.js`.
- Logger: `src/screens/ActiveWorkoutScreen.js`, `src/components/SetEntry.js`.
- Coach: `src/lib/weeklyCoach.js`, `src/lib/coachApply.js`, `src/screens/CoachOutputScreen.js`.
- Adaptive nutrition: `src/lib/nutritionEngine.js` (`computeAdaptiveTDEEAdjustment`).
- Food layer: `src/screens/{DiaryScreen,FoodSearchScreen,ScanBarcodeScreen,ScanLabelScreen,MyMealsScreen}.js`, `src/lib/food/*`.
- Macro rings: `src/components/food/MacroRings.js`.
- Paywall and tiers: `src/lib/proGate.js`, `src/lib/differentialPaywall.js`, `src/screens/{CascadeGateScreen,PaywallScreen,ProUpgradeScreen}.js`.
- Safety: FFM floor and ED-pattern in `src/lib/{nutritionEngine,edPatternDetector,weeklyCoach}.js`.
- Code-level map of all 188 files: `docs/CODE_TRUTH_SURVEY.md` (dated ~2026-05-27, slightly behind the 2026-05-29 work; verified current where it mattered for this audit).
- Prior internal audit: `docs/AUDIT.md` (2026-05-29).

### B. Competitor sources (live, 2026)

Hevy, Strong, Setgraph, Alpha Progression: prpath.app, corahealth.app,
hevyapp.com (track-workouts, rest-timer, live-activity, workout-plan-generator,
announcing-hevy-trainer), arvo.guru/vs/hevy, push-pull.app, sensai.fit,
justuseapp.com, hotelgyms.com, prpath strong review, setgraph.app (review,
reviews, ai-blog), apps.apple.com Setgraph, jefit.com smartwatch 2026,
fitnessdrum.com alpha review, alphaprogression.com/en/subscribe,
screensdesign.com, mesostrength.com.

Fitbod, Dr. Muscle, Juggernaut AI, RP Hypertrophy: fitnessdrum.com fitbod,
indiehackers.com, arvo.guru (fitbod, juggernaut-ai), fitbod.zendesk.com,
fitbod.me/blog, help.fitbod.me, trustpilot.com (fitbod, dr-muscle),
dr-muscle.com (ai-personal-trainer, free-plan, rp-critique), leaveit2ai.com,
protokl.app, thefitflair.com, apps.apple.com (dr-muscle, rp-hypertrophy),
juggernautai.app (+ pricing), jtsstrength.com, techfixai.com, libredd.it
r/weightroom, skywork.ai, rpstrength.com/pages/hypertrophy-app,
wellness.alibaba.com, strengthlab360.com, ditchnet.org.

MacroFactor, MyFitnessPal, Boostcamp, Caliber: trygaya.com, arvo.guru/vs/macrofactor,
nutriscan.app (macrofactor-cost, is-worth-it, mfp-vs-macrofactor), macrofactor.com
(+ algorithms-and-core-philosophy), honestbrandreviews.com, fuelnutrition.app,
nutrola.app, boostcamp.app (+ pro, free-workout-app, workout-tracker),
apps.apple.com Boostcamp, barbend.com Caliber, corahealth.app/compare/caliber,
fitnessdrum.com caliber, trustpilot.com caliberstrong, fitbudd.com MFP cost,
community.myfitnesspal.com, calorie-trackers.com, syndigo.com, globenewswire.com
(MFP ad network, Mar 2026).

### C. Verification caveats

Competitor pricing is 2026 published, often US-store; UK pricing was not
separately confirmed. Strong, Caliber and Setgraph prices conflicted across
sources and are flagged inline. Direct Reddit threads were sparse in search; review
themes draw from store-review aggregators where Reddit was not reachable.
