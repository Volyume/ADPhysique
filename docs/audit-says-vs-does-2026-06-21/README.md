# AUDIT — "What the app SAYS vs what the app DOES" + scientific correctness

**Started:** 2026-06-21 · **Branch:** `claude/audit-work-quality-review-benrin`

## Scope (founder, 2026-06-21)
Two audits, run together, in full, no cherry-picking:

1. **Says-vs-does.** For every claim the app makes to the *user in-app* (UI text,
   coaching explanations, tooltips, feature/onboarding copy), verify the app
   actually does it — traced UI → state → persistence → engine → output, by
   **reading each file in full**, with a **reachability** verdict (can a real user
   actually reach/trigger it?). **Store/marketing listings are explicitly OUT of
   scope.**
2. **Scientific correctness / no hallucinations.** Where copy or code claims a
   method, number, or study, the maths must implement it correctly and the cited
   science must be **real and accurate** (verified against the literature).

### Verdict legend
`MATCHES` · `PARTIAL` (weaker/different than stated) · `CONTRADICTS` · `UNREACHABLE`
(code exists, no user path) · `SCIENCE-OK` · `SCIENCE-OFF` · `UNCERTAIN`.
Every finding quotes the claim (file:line) AND the code (file:line). No unevidenced claims.

---

## Method per module
read in full → list its user-facing claims + scientific claims → trace each to
behaviour + reachability → verify any cited study (web) → record finding with
file:line both sides → tick the checklist → commit.

---

## SCOPE CHECKLIST

Status: `[ ]` not started · `[~]` in progress · `[x]` done.

### Engine / calc modules — `src/lib`
- [~] nutritionEngine.js   (SCIENCE axis read-in-full + verified: F-S1..S7; says-vs-does of nutrition copy still owed)
- [ ] weeklyCoach.js
- [ ] algorithms.js
- [ ] planEngine.js
- [ ] blockAdvisor.js
- [ ] mesocycle.js
- [ ] liftProgress.js
- [ ] coachApply.js
- [ ] coachResponse.js
- [ ] coachOutputZones.js
- [ ] coachRegister.js
- [ ] coachingGoals.js
- [ ] insightsEngine.js
- [ ] volumeInsightCopy.js
- [ ] nutritionTargetsView.js
- [ ] planAutoGen.js
- [ ] planDiff.js
- [ ] planSwitch.js
- [ ] swapEngine.js
- [ ] cyclePrefs.js
- [ ] activitySteps.js / stepsSummary.js / stepsLaunchPrompt.js
- [ ] whyThisTemplates.js
- [ ] coachGlossary.js

### Food engine — `src/lib/food`
- [ ] nutritionEngine consumers: mealPlanAssembler.js, mealPlanService.js
- [ ] calorieBank.js
- [ ] adherence.js
- [ ] effectiveTargets.js
- [ ] macros.js, gramSolve.js, mealSuggest.js, mealSwap.js
- [ ] planEdit.js, planExplain.js, planPreferences.js
- [ ] sanityChecks.js, waterfall.js, writeback.js
- [ ] curatedFoods.js, curatedMeals.js, foodRoles.js
- [ ] groceryList.js, frequents.js, libraryDelta.js, ocrParser.js

### In-app CLAIM surfaces (says-vs-does)
- [~] Goal/phase system: ProGoalSetupScreen, QuizScreen, NutritionTargetsScreen,
      PlanLibraryScreen, coachingGoals (TRAINING_PHASES) — **contest_prep finding logged**
- [ ] PaywallScreen.js / ProUpgradeScreen.js / ProOnboardingScreen.js (in-app Pro claims)
- [ ] CoachOutputScreen.js (what the weekly review tells the user it did)
- [ ] whyThisTemplates.js / coachGlossary.js (coaching explanations)
- [ ] ActiveWorkoutScreen.js (progression/RIR claims surfaced in-session)
- [ ] DiaryScreen.js / MealPlanScreen.js (nutrition/plan claims)
- [ ] Settings* health/wearable/steps/cardio claims

---

## FINDINGS LOG

### F-A1 — `contest_prep` (nutrition/coaching) is UNREACHABLE — but the app states it as a real path
**Verdict: UNREACHABLE.** Severity: HIGH.
- Onboarding phase picker `TRAINING_PHASES` (`src/lib/coachingGoals.js:220-288`):
  lean_gain, bulk, strength_size, weak_point, cut→`mild_cut`, recomp, maintain.
  No contest/competition phase; deepest cut maps to `mild_cut`.
- Nutrition goal picker `GOALS` (`src/screens/NutritionTargetsScreen.js:42-49`):
  lean_gain, build, maintain, recomp, mild_cut, aggressive_cut. No `contest_prep`.
- "Get on stage" (`stage_prep`) in `src/screens/PlanLibraryScreen.js:90,128-132`
  only biases the *plan recommendation* toward `category:division` training plans;
  it writes nothing to nutrition goal or coaching phase (whole file read).
- `contest_prep` is consumed by `nutritionEngine.js` (PHASE_ADJUSTMENTS −0.28,
  protein tables, refeed/diet-break) and `weeklyCoach`, but is only ever *set*
  via cloud sync (`NutritionTargetsScreen.js:205 VALID_SYNC_GOALS`). No UI writes it.
- IN-APP statement of the path: `NutritionTargetsScreen.js:58` describes
  `contest_prep` ("run-in to a stage") as if selectable; the engine's
  `PHASE_LABELS.contest_prep = 'Contest preparation'` implies a real phase.
**Action options:** wire a contest-prep phase into the pickers, OR remove the dead
branches + in-app references. Founder ruling needed.

### F-A2 — `aggressive_cut` reachable in NutritionTargets but NOT in onboarding phases
**Verdict: PARTIAL / inconsistency.** Severity: MEDIUM.
- `NutritionTargetsScreen.js:48` offers `aggressive_cut`; `TRAINING_PHASES`
  (`coachingGoals.js:220-288`) has no equivalent (deepest = `cut`→mild_cut). Which
  surface the user goes through decides whether a fast cut is even selectable.

### F-S1 — Protein science (Morton 2018) — REAL and correctly implemented
**Verdict: SCIENCE-OK.**
- `nutritionEngine.js:131` cites "Morton et al. (2018) … no benefit beyond
  2.2 g/kg BW"; `PROTEIN_MAX_GKGBW = 2.2` (`:133`); tooltip "gains plateau
  ~1.62 g/kg" (`NutritionTargetsScreen.js`).
- Verified vs literature: Morton RW et al. 2018 BJSM meta-analysis (49 trials)
  found the FFM dose-response plateau at **1.62 g/kg** with 95% CI to **~2.2 g/kg**.
  Citation real, numbers accurate.

### F-S2 — RED-S energy floor (Mountjoy) — REAL value, but applied to INTAKE not AVAILABILITY
**Verdict: SCIENCE-OK (value) / PARTIAL (definition).** Severity: LOW-MED.
- `nutritionEngine.js:111-119` cites Mountjoy IOC RED-S; `FFM_FLOOR_KCAL_PER_KG = 30`.
- Verified: the RED-S low-energy-availability threshold is genuinely **30 kcal/kg
  FFM/day** (Mountjoy IOC consensus 2018/2023, BJSM). Value + citation correct.
- NUANCE: RED-S defines 30 kcal/kg on **energy availability** (intake − exercise
  energy expenditure)/FFM. The app floors **raw 7-day intake**/FFM
  (`computeFFMFloor` + the intake check in `computeAdaptiveTDEEAdjustment:364-381`),
  not availability. Defensible proxy, but not the literal definition; with high
  training expenditure, true availability can be below 30 while intake clears it.

### F-S3 — Adaptive TDEE / EWMA maths — SOUND
**Verdict: MATCHES / SCIENCE-OK.**
- `computeEWMA` α=0.28 (`:158,171-185`), `computeAdaptiveTDEEAdjustment`
  (`:277-402`): expected weekly change = (intake−TDEE)·7/7700; correction =
  −discrepancy·7700/7, damped to [0.5, 0.65]; FFM-floor clamps cuts; rapid-loss
  override clamps cuts. Sign convention and clamps verified by reading in full.

---

### F-S4 — Mifflin-St Jeor & Katch-McArdle BMR — EXACT
**Verdict: SCIENCE-OK.**
- `nutritionEngine.js:569-572` male `10W+6.25H-5A+5`, female `...-161` — exact
  published Mifflin-St Jeor. `:566` `370 + 21.6*LBM` — exact Katch-McArdle.
  Katch used only with a credible (non-visual) BF% (`:560-566`), else Mifflin.

### F-S5 — Protein / FFM-floor target functions — SOUND
**Verdict: MATCHES.**
- `computeFFMFloor` (`:597-627`): credible BF% -> FFM=W*(1-BF/100); else sex-aware
  conservative fraction (male 0.78 / female 0.72) erring to a higher (safer) FFM;
  floor = FFM*30. `calcProtein` (`:637-682`): lbm-vs-bw tables, custom clamped to
  PROTEIN_CUSTOM_MAX_GKGBW=3.5, floor enforced. Read in full; sound.

### F-S6 — MATADOR / Pontzer citations — REAL (one year nuance)
**Verdict: SCIENCE-OK with a minor precision flag.**
- `:107` "MATADOR trial (2017, Int J Obesity)" — the MATADOR intermittent-energy-
  restriction trial (Byrne et al.) is real; commonly dated **2018** (Int J Obes
  42:129-138). Year likely off by one. The 2-week-break/metabolic-rate finding is
  accurately represented; DIET_BREAK_THRESHOLD = 8 weeks (`:109`) matches.
- `:16` Pontzer et al. 2016 Current Biology 26:410-417 (constrained TDEE) — real;
  used only to motivate the activity-multiplier tuning (see F-S7).

### F-S7 — Activity-multiplier downward tuning — UNSOURCED (self-declared)
**Verdict: UNCERTAIN / disclosed.** Severity: LOW.
- `:12-18` multipliers cut from standard 1.725/1.9 to 1.65/1.725 "based on coaching
  observation that standard multipliers overestimate gym-only TDEE by 200-400
  kcal/day." Explicit non-literature adjustment. Not a hallucination (disclosed),
  but a judgement call; the adaptive-TDEE loop (F-S3) corrects it over time.

### F-S8 — Davy 2025 PNAS citation — REAL
**Verdict: SCIENCE-OK.** DOI `10.1073/pnas.2519626122` resolves to the actual PNAS
2025 paper "Physical activity is directly associated with total energy expenditure
without evidence of constraint or compensation." Code at `:17` accurately
characterises it as contesting Pontzer's constrained-TDEE. Real, not hallucinated.

**nutritionEngine.js SCIENCE AXIS: COMPLETE — every cited study verified real and
accurately implemented (Morton 2018, Mountjoy RED-S, Mifflin-St Jeor, Katch-McArdle,
MATADOR, Pontzer 2016, Davy 2025). No hallucinated science.** Remaining nuances:
F-S2 (intake vs availability), F-S6 (MATADOR year 2017 vs 2018), F-S7 (multiplier
tuning unsourced-by-design).

## STILL TO VERIFY (later modules)
- Epley / Brzycki 1RM formulas — when algorithms.js is audited.
- NutritionTargetsScreen full says-vs-does trace (protein label brackets vs delivery;
  the 2.2 cap path divergence already noted in prior pass) — still owed.
