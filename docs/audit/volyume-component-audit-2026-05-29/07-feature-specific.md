# 07 · Feature-specific, workout, plans, progress, coaching, food, onboarding

Phase 3 assessment of the domain surfaces, benchmarked against the
strongest apps in each lane: Hevy / Strong (logging), MacroFactor /
Cronometer (food), Whoop (recovery), RP / Boostcamp (programming).
Grouped by feature domain rather than file, since coherence within a
domain is what the user actually experiences.

## Phase 2, best-in-class references (fitness)

- **Hevy:** the logging benchmark, single-session workflow, every common
  action 1–2 taps, fast set entry, flexible rest timers, heavy haptics,
  deep free tier. "Less tapping, more lifting", which is literally
  Volyume's tagline, so this is the bar.
- **Strong:** clean serious-lifter logging, plate calc, strong history.
- **MacroFactor:** adaptive targets from weight-trend × intake (Volyume's
  Precision Coaching is the analogue), fast UK-strong food DB, barcode,
  recipe importer, photo logging (Apr 2025), Apple Watch glance. Its
  differentiator is the *adjustment with a written rationale*, exactly the
  "Why this plan / held decision" surfaces Volyume is building.
- **Whoop:** one calm data language for recovery/readiness.
- **RP / Boostcamp:** volume landmarks (MEV/MAV/MRV), mesocycle structure,
  autoregulation, Volyume already implements these.

The encouraging headline: Volyume's *feature set* is competitive or ahead
(adaptive coaching, volume landmarks, muscle map, recipes, scan, year-in-
review). The gaps are execution polish and the systemic component issues
from 01–06 landing hardest on the densest screens.

---

## Domain: Workout logging (the core loop)

**Screens:** `ActiveWorkoutScreen.js` (2616), `SetEntry.js`,
`RestTimer.js`, `BuildWorkoutScreen.js`, `PlateCalculator.js`.

**Current state:** The components are strong, SetEntry and RestTimer are
reference-quality (see 04/05). The loop has depth Hevy doesn't: cluster
sets, supersets, time-crunch mode, swap engine, per-side unilateral, live
e1RM, PR celebration.

**Best-in-class reference:** Hevy, open app, log set, move on; minimal
friction; one-tap repeat-last-set.

**Gap:**
1. **ActiveWorkout is a 2616-line screen rendering its exercise carousel
   via `map`** (l.477), not FlatList. During a long session (many
   exercises × many sets), everything is mounted at once, the worst place
   for jank, exactly when the user is mid-set and least tolerant of it.
   (Critical, also in 03-layout.)
2. **Errors via Alert** (l.870) interrupt the lift; a toast is the right
   tool mid-session.
3. **Sparse a11y** outside the reorder controls.
4. **Inconsistent hitSlop** (8 vs 12) and an opacity literal (0.4, l.546).
5. Friction check vs Hevy: confirm "repeat last set / fill from last
   session" is one tap (the single biggest logging-speed lever).

**Improvement:** Virtualise the carousel (FlatList/FlashList), correctness
+ perf. Route mid-session errors to Toast. Decompose the screen into
sub-components (set list, rest bar, superset head, time-crunch), both for
maintainability and to cut re-renders during logging. Add a11y to the set
rows. Verify one-tap repeat-last.

**Priority:** Critical (virtualise + decompose), High (toast + a11y).

---

## Domain: Plan creation & management

**Screens:** `PlansScreen.js` (999), `PlanDetailScreen.js`,
`PlanLibraryScreen.js` (794, quiz), `ManualBuilderScreen.js` (1270),
`MesocycleBuilderScreen.js`, `RoutineDetailScreen.js`.

**Current state:** Rich, auto-generated plans with the restored "Why this
plan" rationale, a library with a recommendation quiz, manual builder with
plan-balance analysis, mesocycle dashboard with deload prediction. This is
deeper than Hevy's template system and approaches RP/Boostcamp.

**Best-in-class reference:** Boostcamp/RP, guided programme selection +
clear mesocycle structure; the *why* is explained.

**Gap:**
1. **PlansScreen (999) renders the whole page in a ScrollView with `map`
   lists** and **no loading skeleton** (loads on focus), blank-then-pop.
2. **ManualBuilder (1270)** embeds an ExercisePickerModal and is a lot of
   screen; Alert-based validation rather than inline. The "create custom
   exercise" affordance was recently fixed here and in ActiveWorkout, good.
3. Uneven a11y labels on manage rows (PlanDetail) and library buttons.
4. The "Why this plan" rationale now appears at enrollment + active plan
   (just shipped), strong differentiator vs every competitor; make sure
   PlanLibrary's pre-built plans also explain *why this plan suits you*
   after the quiz (parity with the auto-gen rationale).

**Improvement:** Add skeletons to Plans/PlanLibrary/PlanDetail/Mesocycle;
move ManualBuilder validation inline (shared Field error); extract the
ExercisePickerModal (shared with ActiveWorkout's picker, they're similar);
a11y sweep on rows/buttons; extend the rationale to quiz results.

**Priority:** High (skeletons + a11y), Medium (builder decomposition +
rationale parity).

---

## Domain: Progress & analytics

**Screens:** `AnalyticsScreen.js` (1395), `ExerciseDetailScreen.js`
(1046), `PRWallScreen.js`, `VolumeHeatmapScreen.js`,
`WorkoutHistoryScreen.js`, `YearOfLiftsScreen.js`, `BlockReflectionScreen.js`,
`ShareCardScreen.js`.

**Current state:** Genuinely a strength and a differentiator: volume
heatmap + body map, strength trends, PR wall with strength standards,
year-in-review story cards, block reflection, shareable cards. This is
Whoop/Strava-tier ambition.

**Best-in-class reference:** Whoop (one data language), Strava (shareables,
muscle maps), Robinhood (stripped charts).

**Gap:**
1. **The four-charting-library problem (D0) lands hardest here**,
   AnalyticsScreen, ExerciseDetail (victory-native), PRWall (gifted),
   Mesocycle (gifted) each look slightly different. The progress section,
   which should feel most unified, is the least visually coherent.
2. **Charts are silent to a11y (D1).**
3. AnalyticsScreen at 1395 lines is a hub doing a lot; risk of the
   "three-card dashboard / 2×2 stat grid for symmetry's sake" patterns the
   CLAUDE.md rules warn against, worth a layout pass for "by importance,
   not symmetry".
4. ShareCard hardcodes the palette in Canvas HTML (l.40-49), drift risk if
   theme changes.

**Improvement:** Converge charts (D0), biggest single win for this domain;
add chart a11y (D1); review AnalyticsScreen's grid against the
importance-not-symmetry rule; generate ShareCard's palette from tokens at
build/runtime instead of hardcoding.

**Priority:** High (chart convergence + a11y), Medium (Analytics layout
review).

---

## Domain: Coaching (Precision Coaching)

**Screens:** `CoachOutputScreen.js` (2062), `WeeklyCheckInScreen.js`
(1259), `AthleteHubScreen.js` (1151), `CoachReviewScreen.js`,
`CoachHeldHistoryScreen.js`, `HeldDecisionCard.js`, `DifferentialBadge.js`,
`GoalChangeSummaryScreen.js`.

**Current state:** This is Volyume's MacroFactor-class differentiator, an
adaptive coach that adjusts targets *with a written rationale*, plus safety
holds (FFM floor, ED-pattern) surfaced honestly via HeldDecisionCard. The
"why" framing is on-voice and genuinely better than most competitors'
black-box adjustments.

**Best-in-class reference:** MacroFactor adjustment cards, the change + a
plain-English reason, weekly, never alarming.

**Gap:**
1. **CoachOutputScreen at 2062 lines** is the second-largest file in the
   app, a lot of weight on the screen that carries the core value prop. A
   decomposition + skeleton-load pass would protect it.
2. **HeldDecisionCard swallows the support-link failure** (`.catch(()=>{})`,
   l.45), the least acceptable silent failure in the app, because it's a
   safety path for a potentially vulnerable user. (Flagged High in 05.)
3. WeeklyCheckIn (1259) is a long capture flow; ensure validation is inline
   (not Alert) and progress is obvious.
4. Several upgrade entry points around coaching (DifferentialBadge,
   ProGate, Paywall), keep pricing/CTA copy single-sourced so they never
   disagree (also 07-paywall below).

**Improvement:** Decompose CoachOutput + add skeleton; **fix the
HeldDecisionCard support-link fallback (safety)**; inline validation in
WeeklyCheckIn; single-source upgrade copy.

**Priority:** High (safety fix; CoachOutput decomposition), Medium (check-in
polish).

---

## Domain: Food logging

**Screens:** `DiaryScreen.js`, `FoodSearchScreen.js`,
`AddCustomFoodScreen.js`, `MyMealsScreen.js`, `MyRecipesScreen.js`,
`RecipeBuilderScreen.js`, `FoodInsightsScreen.js`,
`NutritionTargetsScreen.js`, `ScanBarcodeScreen.js`, `ScanLabelScreen.js`,
+ food components (06).

**Current state:** After the recent build-out this is close to
best-in-class: global waterfall search, tabbed browse, plate multi-add,
quick-add, barcode + label OCR, custom foods, saved meals, recipes
(now loggable), 7-day adherence insights, UK-strong DB (OFF + CoFID).
This rivals MacroFactor on capability.

**Best-in-class reference:** MacroFactor, fast UK DB, barcode, recipe
importer, photo logging (2025), Watch glance; the algorithmic target
adjustment (Volyume's coaching covers this).

**Gap:**
1. **DiaryScreen FAB shadow hardcoded + dynamic `require` in
   copy-yesterday** (l.392, l.650), code-smell and off-token.
2. **No error recovery** on several log paths (MyMeals/MyRecipes reject,
   FoodInsights rollup), silent failure (F0).
3. **FoodDetailSheet macro preview has no a11y live region** (04).
4. Two competitor features Volyume lacks: **photo/AI food logging** (MF
   shipped Apr 2025) and an **Apple/Wear glance**. Not a defect, a roadmap
   note; the brand's "one lifter built it" ethos doesn't demand AI, but
   photo-logging is becoming an expectation.
5. Plate-review modal height hardcoded 360 (FoodSearch l.634); scan
   reticle/frame dims + colours hardcoded.

**Improvement:** Token the FAB shadow; remove the dynamic require; add toast
recovery to log paths; macro-preview live region; consider photo-logging on
the roadmap (post-systemic-fixes). Token scan-overlay dims/colours.

**Priority:** Medium (polish + recovery + a11y); photo-logging = roadmap.

---

## Domain: Onboarding, paywall & account

**Screens:** `WelcomeScreen.js`, `ProOnboardingScreen.js` (1332),
`ProSetupCompleteScreen.js`, `ProGoalSetupScreen.js`, `FirstRunScreen.js`,
`Article9ConsentScreen.js`, `ProUpgradeScreen.js`, `PaywallScreen.js`,
`TierComparisonStrip.js`, `SubscriptionScreen.js`, `YouScreen.js`,
`SettingsScreen.js`.

**Current state:** Onboarding is information-collection-not-tutorial (on
spec, per ONBOARDING_SEQUENCE_LOCKED). ProSetupComplete now shows the "Why
this plan" rationale + founder note, a strong, human finish that
competitors lack. The aggressive-cuts interstitial was correctly removed.
The You/Settings split (recent) reads cleanly.

**Best-in-class reference:** Robinhood/Monzo onboarding, minimal, builds
trust fast; one consistent paywall.

**Gap:**
1. **ProOnboarding (1332)** + ProUpgrade + Paywall + ProGate + CascadeGate
   = several auth/upgrade surfaces. Apple-button text hardcoded `#FFFFFF`
   (ProUpgrade l.291, brand-required, mark as deliberate). Ensure all
   paywall surfaces single-source pricing so they never disagree.
2. Inline `Dropdown` in ProOnboarding is a bespoke control (not the shared
   picker that should exist per 04).
3. ProOnboarding's length is inherent (it collects a lot) but it's a prime
   candidate for the shared `<Field>`/`<Chip>`/`<Button>` once they exist,
   it currently re-implements all three.

**Improvement:** Single-source pricing/CTA copy across upgrade surfaces;
adopt shared inputs in ProOnboarding once built; mark the Apple `#FFFFFF`
as a deliberate brand exception. Keep the founder note + rationale, they're
differentiators.

**Priority:** Medium.

---

## Feature-specific summary

| Domain | Top gap | Priority |
| --- | --- | --- |
| Workout logging | ActiveWorkout `map` carousel (2616 lines) | Critical |
| Coaching | HeldDecisionCard support-link silent fail (safety) | High |
| Progress | four chart libs land hardest here (D0/D1) | High |
| Plans | no skeletons + uneven a11y | High |
| Workout logging | mid-session Alerts → Toast | High |
| Food | silent log-failure recovery + a11y live region | Medium |
| Onboarding/paywall | single-source pricing; adopt shared inputs | Medium |
| Progress/Food | roadmap: chart convergence, photo-logging | Medium |

The reassuring conclusion: **Volyume's feature depth is competitive with
or ahead of Hevy, Strong, and MacroFactor in several areas** (adaptive
coaching with rationale, volume landmarks, muscle map, year-in-review,
loggable recipes). The work is not "add features", it's (1) make the
densest screens performant and decomposed (ActiveWorkout, CoachOutput),
(2) land the systemic component fixes (Button/Card/chart-kit/Toast-errors/
skeletons) on these screens, and (3) close the safety-critical and a11y
gaps. Do that and the feature set is already best-in-class.

Sources:
- [Hevy feature list](https://www.hevyapp.com/features/)
- [Hevy vs Strong 2026 (Setgraph)](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026)
- [MacroFactor, official](https://macrofactor.com/)
- [MacroFactor vs MyFitnessPal 2025](https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/)
- [Best app to log workout, tested by lifters (Setgraph)](https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters)
