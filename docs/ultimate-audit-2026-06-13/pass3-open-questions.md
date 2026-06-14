# PASS 3 — COLLECTED OPEN QUESTIONS (founder decisions)

Every open question from the 15 area files, in one place. Each: the question, its area, and the context
needed to answer it (what the market finding was + what Pass 1 found in code at file:line). Not answered,
not recommended — surfaced for the founder to make the calls. 22 questions.

## AI-COACHING
- **Q-AC1 — Add an explicit reverse-diet mode?**
  Finding (Claude, single-source): Carbon ships a dedicated reverse-diet protocol (starts at maintenance).
  In code: Volyume has diet-break + refeed (`nutritionEngine.js:1041-1062`) but no explicit reverse-diet mode (grep 0).
- **Q-AC2 — Confirm human-coach hybrid stays a deliberate non-feature?**
  Finding (ChatGPT + Claude): human-coach hybrid (Caliber/Future) is the premium alternative.
  In code: Volyume is the deterministic engine only; no human-coach surface (coverage grep → 0).

## WORKOUT-SCREEN
- **Q-WS1 — Accept tap-count as observational, or verify by device walk?**
  Finding (all three): fast set logging (~2–4 taps, autofill) is the benchmark.
  In code: autofill/targets exist (`ActiveWorkoutScreen.js:138,:559-565`; `algorithms.js:354-438`); exact tap-count is device-runtime, not provable from code.

## NUTRITION
- **Q-NU1 — Add a user-facing weekly calorie planner (borrow weekday→weekend)?**
  Finding (all three): weekly calorie redistribution / carb-cycling wanted.
  In code: diet phases + carb-cycle apply card exist (`coachApply.js:81`; `CoachOutputScreen.js:425-432`); no general weekly calorie planner.
- **Q-NU2 — Measure exact UK food-DB item count vs the ~500K bar?**
  Finding (all three): Nutracheck ~500K curated UK items is the moat.
  In code: ships OpenFoodFacts UK + CoFID UK snapshots (`food/seed.js:7-11`); exact count is build-time inside the `.dat`.
- **Q-NU3 — Add micronutrient/NRV (vitamins/minerals) tracking?**
  Finding (Gemini + Claude): rising demand for micros vs UK NRVs.
  In code: food schema tracks fibre/sodium/sugar only (`food/db.js:240`); no vitamin/mineral columns.

## FOOD-LOGGING
- **Q-FL1 — Keep barcode as Pro, or move to Free (UK acquisition lever)?**
  Finding (Gemini + ChatGPT): paywalling barcode causes backlash, especially UK.
  In code: barcode is Pro (`ScanBarcodeScreen.js`; CLAUDE.md gating). [Billing/gating — not changed without permission.]

## PROGRESS
- **Q-PR1 — Add progress photos?**
  Finding (all three): photos + measurements are top demand; photos private-by-default.
  In code: measurements present (`BodyMetricsScreen.js:88`); progress photos absent in src (grep 0); a backend table already exists (`supabase/setup_complete.sql:251`).
- **Q-PR2 — Add a progress view that reframes flat scale weight via measurements/BF/PRs?**
  Finding (all three): recomposition reframing when the scale is flat.
  In code: recomp goal + copy and BF/measurement trends exist (`NutritionTargetsScreen.js:84`; `BodyMetricsScreen.js:240,:307`); no progress view that explicitly reframes flat weight.

## RETENTION
- **Q-RE1 — Broaden the 1:1 partner mechanic into a social feed?**
  Finding (all three): social accountability retains.
  In code: partner accountability exists (`src/lib/partners/`, `usePartners.js`; free 1 / Pro 3); no broad social feed (grep 0).
- **Q-RE2 — Add challenges/leaderboards?**
  Finding (Claude, single-source): Strava "Challenges" raised 90-day retention 18%→32%.
  In code: no challenges feature (grep 0).

## ONBOARDING
- **Q-ON1 — Verify time-to-first-value (<60s) and actions-per-screen (≤3) by device walk?**
  Finding (all three): fast TTV; paywall/jargon-first kills beginners.
  In code: flow exists, no paywall/jargon in first-run (grep 0); TTV/actions are device-runtime, not provable from code.

## EXERCISE-LIBRARY
- **Q-EL1 — Add exercise demo media (video/animation)?**
  Finding (Gemini + ChatGPT): HD video / looping animation is the demo norm (also blocks beginner execution confidence, NE-3).
  In code: exercises table has no video/image/media column (`database.js:78-92`); form tips are text only (`formTips.js`).
- **Q-EL2 — Measure exact library count vs the 250–1,400 bar?**
  Finding (ChatGPT + Claude): size bar ~250 (specialist) → ~1,400 (breadth).
  In code: library seeded (`seedExercises.js`); exact count not parseable by grep (build-time).

## NAVIGATION
- (none)

## DESIGN
- **Q-DE1 — Audit every interactive element for ≥44/48 touch-target compliance (beyond the 189 located)?**
  Finding (all three): 44px practical; EAA makes WCAG AA the EU legal floor.
  In code: hitSlop + 189 touch-targets located (`theme.js:431`; `extract/s8-touch.txt`); full-element compliance not audited.

## MISSING-FEATURES
- **Q-MF1 — Add HRV/sleep read into the existing readiness path?**
  Finding (all three): reading HRV/sleep to drive training volume is the most-wished gap.
  In code: recovery is self-reported into `getRecoveryScore weeklyCoach.js:144-154`; health reads steps+weight only, no HRV (grep 0). [Wearables are Pro per CLAUDE.md.]
- **Q-MF2 — Build a standalone (phone-free) watch app?**
  Finding (Gemini, single-source): standalone watch valued.
  In code: watch bridge is rest-timer haptic only (`lib/watch/bridge.js`); no standalone watchOS/Wear app.
- **Q-MF3 — Add a posing/peak-week UI tool on top of the nutrition peak logic?**
  Finding (ChatGPT, single-source): posing/peak-week tooling = white space.
  In code: nutrition peak logic exists (`nutritionEngine.js:1041-1062`; `weeklyCoach.js:1020-1050`); no posing/peak-week UI (grep 0).
- **Q-MF4 — Apple 26 Mar 2026 medical-device declaration: compliance decision?**
  Finding (Claude, single-source): Apple requires Health/Fitness apps to declare medical-device status.
  In code: not code-resolvable — store/compliance/legal decision.

## NEWBIE-EXPERIENCE
- **Q-NE1 — Audit in-app labels/tooltips for jargon-free coverage?**
  Finding (all three): jargon (RIR/MEV/mesocycle) is the primary beginner barrier.
  In code: plain-English coach copy + InfoTooltip exist (`weeklyCoach.js:254-297`; `components/InfoTooltip.js` used `ProgressSections.js:257`); comprehensive label coverage not audited.

## CHECK-IN
- (none)

## SCALING
- **Q-SC1 — Does the UI progressively disclose (clean beginner view → advanced depth behind a toggle), end to end?**
  Finding (all three): progressive disclosure is THE dual-audience mechanism.
  In code: engine experience tiers + experience UI exist (`nutritionEngine.js:709-723`; `ProGoalSetupScreen.js:38,:457`); UI-level hide-advanced-behind-toggle not confirmed.
- **Q-SC2 — Add Coached/Collaborative/Manual autonomy modes + manual target override (respecting safety floors)?**
  Finding (Gemini, single-source): tiered autonomy + granular override for elite.
  In code: per-domain confirm-then-apply exists (`CoachOutputScreen.js:780-792`); no autonomy-mode toggle, no manual target override (manual-goal editor "a later pass").
