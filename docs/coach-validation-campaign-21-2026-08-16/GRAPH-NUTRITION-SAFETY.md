# GRAPH — Nutrition / Cross-Domain / Safety (Campaign 21 Step 1)

## Method

Read-only trace of production source (no test files used as authority). For
every consequential rule (changes what the athlete is told, what is
persisted, or what is suppressed) the AUTHORITY is the exact function/line
that computes it and PRODUCTION_CALLER is the traced chain to a
user-reachable path (screen tap → lib call), or DEAD/TEST-ONLY. Files read in
full: `src/lib/nutritionEngine.js`, `src/lib/coachApply.js`,
`src/lib/edPatternDetector.js`, `src/lib/wellbeing.js`,
`src/lib/effectiveMaintenance.js`, `src/lib/effectiveMaintenanceService.js`,
`src/lib/food/effectiveTargets.js`, `src/lib/food/calorieBank.js`,
`src/lib/food/adherence.js`, `src/lib/coachDecline.js`,
`src/lib/coachIntervention.js`, `src/lib/coachPrecedence.js`. Read in large
targeted sections: `src/lib/weeklyCoach.js` (2,557 lines; lines 592–2150
read in full covering `runWeeklyCoach`), `src/navigation/RootNavigator.js`
(consent-gate sections), `src/lib/notifications/scheduler.js` (ED/calm
suppression sections), `src/screens/NutritionTargetsScreen.js`,
`src/screens/DiaryScreen.js`, `src/screens/CoachOutputScreen.js` (grep +
targeted reads for call sites). `docs/TASKBOARD.md` C18/C19/C20 entries read
for landed-vs-pending status.

Caller chains verified: nutritionEngine → NutritionTargetsScreen (target
persistence); coachApply → CoachOutputScreen (confirm-then-apply,
`markApplied`/`markDeclined`); weeklyCoach.runWeeklyCoach →
CoachOutputScreen (weekly run); effectiveMaintenanceService →
NutritionTargetsScreen + CoachOutputScreen; calorieBank →
DiaryScreen (`bankingAvailable` gate) + food/mealPlanService; edPatternDetector
→ weeklyCoach → CoachOutputScreen (heldDecisions, held banking, held
notifications); coachDecline/coachIntervention → weeklyCoach
(`priorDeclines`/`priorInterventions` inputs, sourced from
`getCoachOutputHistory`).

---

## DOMAIN N-TARGETS — nutrition target calculation & persistence

```
RULE_ID: N-TARGETS-01
DOMAIN: nutrition targets
AUTHORITY: src/lib/nutritionEngine.js calcBMR() + calculateNutritionTargets() :586-608,897-1105
PRODUCTION_CALLER: NutritionTargetsScreen (target save flow) -> calculateNutritionTargets
INPUTS: sex, ageYears, heightCm, weightKg, bodyFatPercent, bodyFatSource, activityLevel
OUTPUT: bmrKcal, formula ('mifflin'|'katch_mcardle')
THRESHOLDS: Katch-McArdle used only when bodyFatPercent is finite, >0, <60, AND
  bodyFatSource in {dexa,caliper,bia,visual,manual,self_reported}
  (isBaselineBodyFatSource). Otherwise Mifflin-St Jeor. Age clamp [13,100],
  height clamp [100,250]cm, weight clamp [30,350]kg.
PRECEDENCE: base formula for TDEE below; no gate overrides formula choice.
PERSISTENCE: nutrition_targets row (bmrKcal, bmrMethod)
USER_VISIBLE: yes (target breakdown screen)
PROVENANCE: static
SENIOR_RULES: none (foundational calc)
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-TARGETS-02
DOMAIN: nutrition targets
AUTHORITY: src/lib/nutritionEngine.js ACTIVITY_MULTIPLIERS + calculateNutritionTargets():946-951
PRODUCTION_CALLER: NutritionTargetsScreen -> calculateNutritionTargets
INPUTS: activityLevel ('sedentary'|'light'|'moderate'|'active'|'very_active'), bmr, effectiveMaintenanceResidualKcal
OUTPUT: maintenanceKcal (TDEE)
THRESHOLDS: multipliers sedentary 1.2, light 1.375, moderate 1.55, active 1.65,
  very_active 1.725 (tuned down from generic 1.725/1.9 for gym-only pop).
  maintenanceKcal = max(1, round(bmr*multiplier) + effectiveResidual)
PRECEDENCE: effectiveMaintenanceResidualKcal (N-MAINT-05) is additive on top
  of the formula TDEE, applied exactly once per call.
PERSISTENCE: nutrition_targets.tdee
USER_VISIBLE: yes
PROVENANCE: static (multipliers), dynamic (residual)
SENIOR_RULES: N-MAINT-05 supplies the residual
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-TARGETS-03
DOMAIN: nutrition targets — phase calorie adjustment + experience scaling
AUTHORITY: src/lib/nutritionEngine.js PHASE_ADJUSTMENTS, SURPLUS_EXP_MULT :27-34,881-886,954-974
PRODUCTION_CALLER: NutritionTargetsScreen -> calculateNutritionTargets
INPUTS: goal (phase key), experienceLevel, weightKg (Number.isFinite check)
OUTPUT: targetKcal (pre-floor)
THRESHOLDS: phase adjustments: lean_gain +10%, build +17%, maintain 0%,
  recomp -5%, mild_cut -13%, aggressive_cut -22%. Surplus phases scaled by
  experience: beginner x1.30(lean_gain)/x1.25(build), intermediate x1.00/1.00,
  advanced x0.65/0.80, competitive x0.50/0.65.
PRECEDENCE: senior to floors below (floors clamp AFTER this).
PERSISTENCE: nutrition_targets.targetKcal (pre-floor value not itself stored)
USER_VISIBLE: yes (phase label + %)
PROVENANCE: static
SENIOR_RULES: overridden downstream by N-TARGETS-04/05/06 (safety floors)
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-TARGETS-04
DOMAIN: nutrition targets — missing-weight deficit guard
AUTHORITY: src/lib/nutritionEngine.js calculateNutritionTargets():962-973
PRODUCTION_CALLER: NutritionTargetsScreen -> calculateNutritionTargets
INPUTS: weightKg (raw, pre-clamp), phaseAdj sign
OUTPUT: phaseAdj forced to 0 when weight missing AND phaseAdj<0; warning pushed
THRESHOLDS: Number.isFinite(weightKg) === false triggers the guard
PRECEDENCE: senior to N-TARGETS-03's deficit sizing; a deficit is NEVER sized
  off the invented 75kg display-fallback weight (Campaign 1 P0-7 D4).
PERSISTENCE: nutrition_targets.warnings[]
USER_VISIBLE: yes (warning string)
PROVENANCE: static
SENIOR_RULES: none above it (this IS the safety rule for missing weight)
EXCLUSIONS: applies only to deficits; surplus/maintain unaffected
NOTES: none
```

```
RULE_ID: N-TARGETS-05
DOMAIN: nutrition targets — sex-aware calorie floor (ED-SAFETY, INVIOLABLE)
AUTHORITY: src/lib/nutritionEngine.js kcalFloorForSex():695-697; enforced calculateNutritionTargets():982-991
PRODUCTION_CALLER: NutritionTargetsScreen -> calculateNutritionTargets; also
  coachApply.computeCalorieTargets (re-export, coachApply.js:29-40) enforces
  the same floor on the Apply path; food/calorieBank.sexFloorKcal delegates
  to the same function for banking floors.
INPUTS: sex ('male'|'female'|null)
OUTPUT: kcalFloor; targetKcal clamped up to floor; floorApplied=true; warning
THRESHOLDS: male 1500 kcal, female 1200 kcal, unknown sex -> 1500 (HIGHER
  floor, never the lower one — Campaign 1 P0-7 D4)
PRECEDENCE: senior to the phase adjustment (N-TARGETS-03); junior to nothing
  — this is a hard founder floor (Section 2 INVIOLABLE, never lower).
PERSISTENCE: nutrition_targets.targetKcal, .floorApplied, .warnings[]
USER_VISIBLE: yes
PROVENANCE: static (founder-fixed constants)
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: ONE canonical statement — Campaign 1 review finding 14 consolidated
  three prior restatements (nutritionEngine, coachApply, food/calorieBank)
  onto this single function to prevent drift.
```

```
RULE_ID: N-TARGETS-06
DOMAIN: nutrition targets — 1.5% BW/week hard loss gate (ED-SAFETY, INVIOLABLE)
AUTHORITY: src/lib/nutritionEngine.js HARD_GATE_LOSS_RATE + calculateNutritionTargets():993-1016
PRODUCTION_CALLER: NutritionTargetsScreen -> calculateNutritionTargets
INPUTS: targetKcal (post sex-floor), maintenanceKcal, safeWeight
OUTPUT: targetKcal raised so weekly deficit caps at 1.5% BW; floorApplied=true; warning
THRESHOLDS: HARD_GATE_LOSS_RATE = 0.015 (1.5% BW/week); maxWeeklyDeficit =
  0.015 * BW * 7700 kcal/kg; maxDailyDeficit = maxWeeklyDeficit/7
PRECEDENCE: senior to phase adjustment; runs AFTER the sex floor (both can
  compound — the higher of the two constraints wins since both clamp targetKcal).
PERSISTENCE: nutrition_targets.targetKcal, .floorApplied, .warnings[]
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: none — this is a hard founder gate (Section 2 INVIOLABLE, never raise)
EXCLUSIONS: deficit phases only
NOTES: none
```

```
RULE_ID: N-TARGETS-07
DOMAIN: nutrition targets — 0.8% BW/week recommended-cap caution
AUTHORITY: src/lib/nutritionEngine.js MAX_SAFE_LOSS_RATE + calculateNutritionTargets():1010-1015
PRODUCTION_CALLER: NutritionTargetsScreen -> calculateNutritionTargets
INPUTS: same as N-TARGETS-06
OUTPUT: warning only, no target change
THRESHOLDS: MAX_SAFE_LOSS_RATE = 0.008 (0.8% BW/week); fires when
  0.8% < lossFraction <= 1.5% (below the hard gate)
PRECEDENCE: junior to N-TARGETS-06 (advisory only, does not clamp)
PERSISTENCE: nutrition_targets.warnings[]
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-TARGETS-08
DOMAIN: nutrition targets — preventive energy-availability caution (U3)
AUTHORITY: src/lib/nutritionEngine.js energyAvailabilityCaution() + EA_CAUTION_KCAL_PER_KG :748-796,1018-1033
PRODUCTION_CALLER: NutritionTargetsScreen -> calculateNutritionTargets (eaCaution field)
INPUTS: finalised targetKcal, maintenanceKcal, weightKg, bodyFatPercent/Source, sex
OUTPUT: eaCaution object {proxyEA, cautionKcalPerKg, ffmKg, suggestedKcal} or null; warning text
THRESHOLDS: EA_CAUTION_KCAL_PER_KG = {male:35, female:40}; unknown sex takes
  the FEMALE (more cautious) 40 line (F3, audit EN-7). Fires only when
  targetKcal<maintenanceKcal AND proxyEA (targetKcal/ffmKg) < line.
  suggestedKcal = clamp(line*ffmKg, [sexFloor, maintenanceKcal]) — can only
  RAISE, never push below sexFloor or above maintenance.
PRECEDENCE: set ABOVE the 30 kcal/kg FFM hard floor (N-COACH-11) — fires
  earlier/softer than the hard floor; never lowers a target itself.
PERSISTENCE: nutrition_targets.eaCaution, .warnings[]
USER_VISIBLE: yes (warning + optional one-tap ease-to-suggestedKcal)
PROVENANCE: static
SENIOR_RULES: none above; advisory only
EXCLUSIONS: only relevant when a cut is being prescribed
NOTES: none
```

```
RULE_ID: N-TARGETS-09
DOMAIN: nutrition targets — protein approach & basis (LBM vs bodyweight) + cap
AUTHORITY: src/lib/nutritionEngine.js calcProtein():811-853, PROTEIN_APPROACHES:63-96, getPlanNutritionContext() 2.2g/kg cap :1148-1165
PRODUCTION_CALLER: NutritionTargetsScreen -> calculateNutritionTargets (target
  save); planEngine (getPlanNutritionContext) for the training-context cap
INPUTS: goal, weightKg, lbm (from Katch-McArdle path), bodyFatSource,
  proteinApproach ('standard'|'optimised'|'advanced'|'custom'), customGPerKg
OUTPUT: proteinG, basis ('lbm'|'bodyweight'), proteinRateUsed
THRESHOLDS: PROTEIN_MAX_GKGBW=2.2 (cap when BF% unknown, Morton 2018 CI);
  PROTEIN_CUSTOM_MAX_GKGBW=3.5 (custom-entry sanity ceiling); per-approach
  floor (standard 2.0, optimised 2.2, advanced 2.5, custom 1.2 g/kg)
PRECEDENCE: physique/strength goals auto-select 'advanced' unless caller
  overrides (ADVANCED_PROTEIN_GOALS list)
PERSISTENCE: nutrition_targets.proteinG, .proteinBasis, .proteinRateUsed
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: none
```

---

## DOMAIN N-ADAPTIVE — weight-trend interpretation & adaptive calorie sizing

```
RULE_ID: N-ADAPTIVE-01
DOMAIN: adaptive TDEE — EWMA smoothing (diet-planning variant)
AUTHORITY: src/lib/nutritionEngine.js computeEWMA() :168-185
PRODUCTION_CALLER: nutritionEngine.getPlanNutritionContext() -> BodyMetricsScreen/CoachOutputScreen nutrition trend display
INPUTS: weightData [{weightKg,date}], alpha (default 0.28)
OUTPUT: smoothed series
THRESHOLDS: EWMA_ALPHA=0.28 (~3.5-day memory); drops rows with
  weightKg<=0 or non-finite (DATA-001/EN-6 parity)
PRECEDENCE: distinct from weeklyCoach.computeEWMA (alpha 0.1, ~10-day
  memory) — deliberately different output shapes so callers cannot cross-wire them.
PERSISTENCE: none (display-only compute)
USER_VISIBLE: indirectly (trend line)
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-ADAPTIVE-02
DOMAIN: adaptive TDEE — weekly weight-change rate (date-aware)
AUTHORITY: src/lib/nutritionEngine.js computeWeeklyWeightChange() :211-245
PRODUCTION_CALLER: getPlanNutritionContext -> computeAdaptiveTDEEAdjustment;
  weeklyCoach has its own analogous computeWeeklyTrendPct (N-ADAPTIVE-08)
INPUTS: ewmaData (computeEWMA output)
OUTPUT: kg/week rate
THRESHOLDS: MIN_SPAN_DAYS=6 (date-aware path needs >=6 days span between
  newest and comparator); index-based fallback needs >=8 points (assumes
  daily logging) when no usable date exists
PRECEDENCE: date-aware path preferred; index fallback only for date-less rows
PERSISTENCE: none
USER_VISIBLE: indirectly
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-ADAPTIVE-03
DOMAIN: adaptive TDEE — main resize function
AUTHORITY: src/lib/nutritionEngine.js computeAdaptiveTDEEAdjustment() :277-424
PRODUCTION_CALLER: weeklyCoach.runWeeklyCoach() :1405-1469 (adaptiveCal); also
  getPlanNutritionContext (display-only path, no safety consequence)
INPUTS: ewmaData, prescribedKcal, currentTDEEEstimate, adherenceFactor,
  ffmFloorContext, rapidLossOverride, actualIntakeKcal (B1), updateGain (COMP-026)
OUTPUT: {adjustmentKcal, adjustedTDEE, confidence, insight, weeks, floorHeld}
THRESHOLDS: MIN_POINTS=14 (>=2 weeks of data required, else
  confidence='insufficient_data'); confidence 'high' at weeks>=4, 'medium'
  weeks>=3, else 'low'; updateGain clamped [0.5,0.65] regardless of caller
  input (safeGain = min(0.65,max(0.5,updateGain)))
PRECEDENCE: B1 (actualIntakeKcal, when foodDaysLogged>=5 & avg>0) replaces
  the prescribedKcal*adherenceFactor guess. ffmFloorContext clamps negative
  adjustments to 0 when recentIntakeAvgKcal<=floorKcal (senior to the raw
  computation). rapidLossOverride clamps ANY negative adjustment to 0,
  applied LAST so it composes without double-counting.
PERSISTENCE: not directly persisted here; weeklyCoach feeds the output into
  calorieAdjustment and effectiveMaintenance memo derivation
USER_VISIBLE: yes (insight sentence surfaces in coach output)
PROVENANCE: dynamic (weight/intake history)
SENIOR_RULES: FFM floor (N-COACH-11), rapid-loss override (N-COACH-08) both senior
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-ADAPTIVE-04
DOMAIN: adaptive TDEE — step-trend confidence modifier (COMP-026 B)
AUTHORITY: src/lib/nutritionEngine.js computeStepTrendModifier() + constants :427-569
PRODUCTION_CALLER: weeklyCoach.runWeeklyCoach() :1459-1468
INPUTS: dailyStepsSeries (~42 days), todayKey, adjustmentSign (sign of the
  gain-0.5 pass's adjustmentKcal)
OUTPUT: {gain, active, direction, reason}
THRESHOLDS: STEP_WINSOR_CAP=40000/day; STEP_DELTA_MIN=1500 steps/day AND
  STEP_DELTA_RATIO_MIN=0.20 of baseline (floored at STEP_BASELINE_FLOOR=4000)
  both required; STEP_PERSIST_MIN=1000 (each recent half must clear baseline
  by this); data sufficiency >=10/14 recent days AND >=14/28 baseline days;
  gain ramps linearly STEP_GAIN_BASE=0.50 at delta=1500 to
  STEP_GAIN_MAX=0.65 at delta>=4000 (STEP_GAIN_RAMP_SPAN=2500)
PRECEDENCE: NEVER produces, sizes, or reverses a calorie change on its own
  (explicit anti-eat-back design, comment :430-437) — only alters how fast
  the adaptive resize updates, and only when direction AGREES with the
  weight-trend-derived adjustment sign. Never runs on rapidLossOverride path.
PERSISTENCE: surfaces via stepTrendApplied flag in coach output (receipt copy)
USER_VISIBLE: yes (one-sentence receipt when active)
PROVENANCE: static thresholds, dynamic data
SENIOR_RULES: rapid-loss override disables it entirely
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-ADAPTIVE-05
DOMAIN: FFM energy floor computation (shared authority)
AUTHORITY: src/lib/nutritionEngine.js computeFFMFloor() + FFM_FLOOR_KCAL_PER_KG :117,655-684
PRODUCTION_CALLER: weeklyCoach.runWeeklyCoach() FFM gate (N-COACH-11);
  nutritionEngine.computeAdaptiveTDEEAdjustment (ffmFloorContext branch);
  nutritionEngine.energyAvailabilityCaution (N-TARGETS-08)
INPUTS: weightKg, bodyFatPercent, bodyFatSource, sex
OUTPUT: {floorKcal, ffmKg, source:'katch_mcardle'|'fallback'}
THRESHOLDS: FFM_FLOOR_KCAL_PER_KG=30 (Mountjoy 2014/2023 IOC RED-S
  consensus); credible BF% path requires
  isAuthoritativeBodyFatSource (dexa/caliper/bia only, NOT visual);
  fallback fraction FFM_FALLBACK_FRACTION={male:0.78,female:0.72}
  (conservative population estimate, errs toward a HIGHER, more protective floor)
PRECEDENCE: foundational — every FFM-gated consumer reads this
PERSISTENCE: n/a (pure calc)
USER_VISIBLE: via held-decision copy quoting floorKcal
PROVENANCE: static constants
SENIOR_RULES: none — Section 2 INVIOLABLE (never remove, raise threshold, or
  make conditional)
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-ADAPTIVE-06
DOMAIN: FFM floor — canonical safety-weight resolver (C10I)
AUTHORITY: src/lib/nutritionEngine.js resolveFfmFloorWeightKg() :739-746
PRODUCTION_CALLER: weeklyCoach.runWeeklyCoach() :966-970 (ffmSafetyWeightKg,
  the ONE resolved value reused by both the adaptive-TDEE FFM context and the
  enforcing gate — C10I removed the prior two-resolution disagreement risk)
INPUTS: profileWeightKg, ewmaTodayKg, lastWeighInKg
OUTPUT: single resolved weightKg or null
THRESHOLDS: precedence order 1) today's 7-day EWMA (needs >=3 pts)
  2) most recent valid weigh-in 3) profile bodyweight. Returns null only
  when NO positive weight exists anywhere (callers hold status quo).
PRECEDENCE: this IS the precedence rule — replaces the freshness-vs-profile
  question (C10A R-18: profile weight is stale after onboarding since
  logMorningWeight never updates the profile row)
PERSISTENCE: n/a
USER_VISIBLE: indirectly (drives the floor shown)
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: SUSPECTED-DEFECT (historical, now fixed by this resolver): prior to
  C10A/C10I, `users_profile.weightKg` set at onboarding and never refreshed
  by weigh-ins meant a user who had lost weight since enrolment kept the
  FFM floor computed off their enrolment weight indefinitely. Confirmed
  fixed in current code (comment :709-737); recorded here as provenance,
  not a live defect.
```

```
RULE_ID: N-ADAPTIVE-07
DOMAIN: diet-break trigger
AUTHORITY: src/lib/nutritionEngine.js shouldSuggestDietBreak() + DIET_BREAK_THRESHOLD_WEEKS :105-107,1119-1142
PRODUCTION_CALLER: weeklyCoach.runWeeklyCoach() :1857-1884
INPUTS: goalStartDate (or weeksInPhase fallback), currentDate(nowMs)
OUTPUT: {suggest, weeksInDeficit, message}; heldDecisions/dietBreakSuggested fields
THRESHOLDS: DIET_BREAK_THRESHOLD_WEEKS=8 weeks in deficit (MATADOR trial,
  2017 Int J Obesity); fallback path (no goalStartDate) also uses
  weeksInPhase>=8
PRECEDENCE: cut phases only (phase.isCut); this is a SUGGESTION card, not an
  auto-applied change (confirm-then-apply, N-COACH-14 family)
PERSISTENCE: surfaced in coach output; applying it (computeDietBreakTargets)
  is a coachApply.js function (N-TARGETS-10 below)
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-TARGETS-10
DOMAIN: diet-break apply (confirm-then-apply)
AUTHORITY: src/lib/coachApply.js computeDietBreakTargets() :91-109
PRODUCTION_CALLER: CoachOutputScreen Apply-diet-break tap -> computeDietBreakTargets -> saveNutritionTargets
INPUTS: nutrition (current targets), sex, effectiveMaintenanceKcal
OUTPUT: {newKcal, targets} raising target to maintenance for the week; null if no-op
THRESHOLDS: only fires when maintenance > current target (else null, i.e.
  already at/above maintenance is a no-op)
PRECEDENCE: delegates to computeCalorieTargets (N-TARGETS-05 floor still enforced)
PERSISTENCE: nutrition_targets row on Apply tap
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: N-TARGETS-05 (sex floor) enforced inside computeCalorieTargets
EXCLUSIONS: none
NOTES: none
```

---

## DOMAIN N-MAINT — effective-maintenance authority (Campaign 19)

```
RULE_ID: N-MAINT-01
DOMAIN: effective maintenance — resolution precedence
AUTHORITY: src/lib/effectiveMaintenance.js resolveEffectiveMaintenance() :219-319
PRODUCTION_CALLER: src/lib/effectiveMaintenanceService.js resolveEffectiveMaintenanceForUser()
  -> NutritionTargetsScreen (:381,552,560) and CoachOutputScreen (:1408,1453,1563,1880,1926)
INPUTS: formulaPriorKcal, memo (stored), context (sex/age/height/weight/BF%/
  activityLevel/goalPhase), evidenceSignature, nowMs
OUTPUT: {effectiveMaintenanceKcal, cumulativeResidualKcal, source, status, reason}
THRESHOLDS: no memo or invalid memo -> status FORMULA (formula prior only).
  Valid memo with algorithmVersion mismatch OR formulaContextSignature
  changed -> status REVALIDATING. Else: materialWeightChange (>=5% BW,
  MATERIAL_BODYWEIGHT_CHANGE_FRACTION=0.05) -> REVALIDATING; goalPhase
  changed -> REVALIDATING; evidenceSignature changed -> REVALIDATING; stale
  (asOf older than EFFECTIVE_MAINTENANCE_STALE_DAYS=14 days) -> HELD;
  else -> CURRENT (source=athlete_history).
PRECEDENCE: history (validated learned residual) senior to raw formula ONLY
  while CURRENT; any REVALIDATING/HELD/INVALID state falls back toward the
  formula prior + last-known residual rather than trusting stale learning.
PERSISTENCE: effective_maintenance_memo row (via saveEffectiveMaintenanceMemo)
USER_VISIBLE: yes (effectiveMaintenance receipt surfaced in coach output/target screen)
PROVENANCE: dynamic
SENIOR_RULES: none above; downstream N-TARGETS-02 applies the residual once
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-MAINT-02
DOMAIN: effective maintenance — memo validity gate (fail-closed)
AUTHORITY: src/lib/effectiveMaintenance.js isValidEffectiveMaintenanceMemo() :171-201
PRODUCTION_CALLER: resolveEffectiveMaintenance() (N-MAINT-01), gates every stored memo before use
INPUTS: stored memo fields
OUTPUT: boolean
THRESHOLDS: hard requires foodDaysLogged>=5, weightPoints>=14, all numeric
  fields integer & finite, prior+residual===effective exactly,
  versionKey must match a fresh recompute (effectiveMaintenanceVersionKey)
PRECEDENCE: senior — an invalid memo can NEVER become authority; falls to
  formula-only base (N-MAINT-01's FORMULA branch)
PERSISTENCE: n/a (read-time gate)
USER_VISIBLE: indirectly
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: fail-closed by construction — "Fail closed before any stored residual
  is allowed to become authority" (module comment :170)
```

```
RULE_ID: N-MAINT-03
DOMAIN: effective maintenance — learning gate (when a new residual may be derived)
AUTHORITY: src/lib/effectiveMaintenance.js deriveEffectiveMaintenanceMemo() :327-406
PRODUCTION_CALLER: src/lib/effectiveMaintenanceService.js learnEffectiveMaintenanceForUser()
  -> CoachOutputScreen (weekly run, after runWeeklyCoach computes maintenanceObservation)
INPUTS: formulaPriorKcal, resolved (current authority), adaptiveObservation
  (from N-ADAPTIVE-03), actualIntakeKcal, foodDaysLogged, evidenceSignature,
  weights, context, weightEvidenceFresh, confounded
OUTPUT: {updated:boolean, reason, memo|null}
THRESHOLDS: requires foodDaysLogged>=5; canonicalWeightEvidence(weights)
  length>=14 AND weightEvidenceFresh===true; evidence not already consumed
  (signature must differ from resolved's;) confounded=false;
  adaptiveObservation.confidence==='high' (i.e. N-ADAPTIVE-03's weeks>=4
  bar); during REVALIDATING with a context/algorithm-version marker,
  requires >=14 distinct fresh-weight-days AFTER the marker timestamp
  before a new residual may be derived
PRECEDENCE: uses adjustedTDEE (the OBSERVATIONAL value), never the
  safety-clamped adjustmentKcal — "Safety can still veto a target change
  elsewhere; it must not rewrite this observational result" (:324-326).
  RESIDUAL_REVALIDATION_FRACTION=0.20 flags largeDivergence (>20% of
  formula prior) for downstream display, does not itself block the memo.
PERSISTENCE: effective_maintenance_memo row on successful derivation
USER_VISIBLE: indirectly (feeds N-MAINT-01's next resolution)
PROVENANCE: dynamic
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-MAINT-04
DOMAIN: effective maintenance — manual-target seniority over learned residual
AUTHORITY: src/lib/coachIntervention.js classifyOutcome() :261-267 (user-override confound check)
PRODUCTION_CALLER: weeklyCoach.runWeeklyCoach (indirectly, via priorInterventions
  outcome classification feeding doseEscalation N-COACH-16); direct persistence
  path is NutritionTargetsScreen's own manual save, which simply overwrites
  nutrition_targets.targetKcal
INPUTS: record.appliedValue (the kcal the coach last landed), after.nutrition.targetKcal (current)
OUTPUT: outcome forced to CONFOUNDED, because:'user_changed_it_themselves'
THRESHOLDS: any mismatch between the coach's last-applied kcal and the
  currently-stored target is treated as a manual user override
PRECEDENCE: user's manual edit is senior — the app never claims credit or
  blame for a week the user overrode themselves, and doseEscalation
  (N-COACH-16) explicitly will not fire off a CONFOUNDED outcome.
PERSISTENCE: nutrition_targets row (the manual save itself); no separate
  "manual override" flag exists — the mismatch IS the detection mechanism
USER_VISIBLE: indirectly (affects future coach receipts, not shown as a
  standalone "you overrode this" message)
PROVENANCE: dynamic
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: there is no dedicated `manualOverride`/`isManualTarget` flag in the
  nutrition-target schema (unlike training's manualVolumeMuscles,
  N-VOL-01 below) — user authority over calories is inferred structurally
  by comparing the last coach-applied value to the current stored value.
```

```
RULE_ID: N-MAINT-05
DOMAIN: effective maintenance — application into the base formula (single-application law)
AUTHORITY: src/lib/nutritionEngine.js calculateNutritionTargets() :949-951 (effectiveMaintenanceResidualKcal)
PRODUCTION_CALLER: NutritionTargetsScreen passes maintenanceAuthority.resolved.
  cumulativeResidualKcal through as effectiveMaintenanceResidualKcal
INPUTS: _effectiveResidual (from Campaign 19 resolver only; legacy callers omit)
OUTPUT: maintenanceKcal = max(1, formulaMaintenanceKcal + effectiveResidual)
THRESHOLDS: none beyond max(1, ...) floor against non-positive results
PRECEDENCE: "Campaign 19: supplied only by the canonical resolver. It is
  cumulative history, not the latest weekly adjustment, and is applied
  exactly once" (comment :912-914) — prevents double-application of the
  same learned residual across repeated calls
PERSISTENCE: nutrition_targets.effectiveMaintenanceResidualKcal, .tdee
USER_VISIBLE: yes (shown as maintenance/TDEE figure)
PROVENANCE: dynamic
SENIOR_RULES: N-MAINT-01/02/03 govern what residual is available to apply
EXCLUSIONS: none
NOTES: none
```

---

## DOMAIN N-COACH — weekly coach (weeklyCoach.runWeeklyCoach)

```
RULE_ID: N-COACH-01
DOMAIN: weekly coach — data-confidence gate (pre-filter)
AUTHORITY: src/lib/weeklyCoach.js assessDataConfidence() :186-227, applied :788-888
PRODUCTION_CALLER: CoachOutputScreen weekly run -> runWeeklyCoach
INPUTS: weighInDayCount (distinct calendar days, deduped, 7-day window
  anchored on nowMs — NOT newest-row-anchored, C6 R-1/D97-22),
  adherenceKnown, weeksInPhase, hasUnusualEvent
OUTPUT: confidence.level ('data_hold' | other); when data_hold, run returns
  early with hasEnoughData:false and no adjustments
THRESHOLDS: see assessDataConfidence body (not fully quoted here — governs
  minimum weigh-in count before ANY trend-based decision is made)
PRECEDENCE: senior to every calorie/volume decision below — nothing computes
  without this gate passing
PERSISTENCE: none written on hold path
USER_VISIBLE: yes (dataNote/holdMessage)
PROVENANCE: dynamic
SENIOR_RULES: none above
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-COACH-02
DOMAIN: weekly coach — session-adherence stabilise gate ("Andy Morgan rule")
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() :1142-1149
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: sessionsCompleted, sessionsPlanned
OUTPUT: early return via _buildAdherenceOutput (no calorie/volume adjustment this week)
THRESHOLDS: sessionAdherence = completed/planned; fires when < 0.5 (50%).
  Unknown denominator (sessionsPlanned<=0) routes to 0 (stabilise), never 1
  (perfect) — Campaign 1 P0-7 D5.
PRECEDENCE: senior to calorie/volume/steps adjustments
PERSISTENCE: none
USER_VISIBLE: yes
PROVENANCE: static threshold
SENIOR_RULES: N-COACH-01
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-COACH-03
DOMAIN: weekly coach — calorie adjustment eligibility gate
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() canAdjustCals :1377-1389
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: cycleOverride, scoffPositive, currentCalTarget, calsAdherence,
  foodDiaryStandsIn, rapidLossOverride, consecutiveOffTargetWeeks,
  offTargetWeeksRequired, lastCalAdjustmentWeeksAgo
OUTPUT: boolean gate for whether ANY calorie change may be proposed
THRESHOLDS: requires !cycleOverride AND !scoffPositive AND currentCalTarget
  set AND (calsAdherence!=='untracked' OR foodDiaryStandsIn) AND
  (rapidLossOverride OR (consecutiveOffTargetWeeks>=offTargetWeeksRequired
  AND lastCalAdjustmentWeeksAgo>=2)). offTargetWeeksRequired = 2 at
  confidence 'high', else 3 (N-COACH-01's confidence level). 2-week cooldown
  applies to non-rapid-loss changes only.
PRECEDENCE: senior to the calorie-sizing block below; rapidLossOverride
  (N-COACH-08) bypasses the off-target-weeks + cooldown legs but NOT the
  cycleOverride/scoffPositive/currentCalTarget/adherence legs
PERSISTENCE: none (gate only)
USER_VISIBLE: yes (held-decision copy when it blocks, N-COACH-13)
PROVENANCE: dynamic
SENIOR_RULES: none above
EXCLUSIONS: none
NOTES: foodDiaryStandsIn (B1, founder 2026-07-02) requires
  recentIntakeDaysLogged>=5 AND recentIntakeAvgKcal>0 AND checkinRecentEnough
  (a completed check-in within the last 14 days) — a real food diary
  unfreezes weekly recalibration even on a skipped check-in, but only while
  the wellbeing capture has not gone dark >=14 days.
```

```
RULE_ID: N-COACH-04
DOMAIN: weekly coach — fixed-step calorie sizing (non-adaptive baseline)
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() :1472-1502
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: phase.isCut/isBulk, offTargetDirection, calsAdherence
OUTPUT: change (kcal delta), calNote
THRESHOLDS: cut+losing-too-slowly: -150 if calsAdherence==='hit' else -100;
  cut+losing-too-fast: +125; bulk+gaining-too-slowly: +150;
  bulk+gaining-too-fast: -125
PRECEDENCE: superseded by the adaptive resize (N-COACH-05) when confident
  AND same-direction; superseded entirely by rapid-loss sizing (N-COACH-08)
  when that override is active
PERSISTENCE: feeds calorieAdjustment (applied on user tap, N-TARGETS coachApply)
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: none above this specific branch (adaptive resize is a peer that wins when eligible)
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-COACH-05
DOMAIN: weekly coach — adaptive resize supersedes fixed step
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() :1510-1519
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: useAdaptiveCal (adaptiveCal.confidence==='high'), adaptiveCal.adjustmentKcal, change (fixed-step value)
OUTPUT: change overwritten to adaptiveCal.adjustmentKcal when eligible
THRESHOLDS: fires only when useAdaptiveCal AND !rapidLossOverride AND
  change!==0 AND adaptiveCal.adjustmentKcal!==0 AND
  sign(adaptiveCal.adjustmentKcal)===sign(change) — NEVER reverses direction,
  only resizes
PRECEDENCE: junior to rapidLossOverride (never applies on that path);
  senior to the fixed-step magnitude
PERSISTENCE: feeds calorieAdjustment
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: N-COACH-08 (rapid loss) exempt from this branch
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-COACH-06
DOMAIN: weekly coach — dose escalation (Campaign 18 job A2)
AUTHORITY: src/lib/coachIntervention.js doseEscalation() :439-472; applied weeklyCoach.js :1535-1544
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: priorInterventions (accepted calorie changes), coachContext, nowMs,
  Math.sign(change), goalPhase
OUTPUT: change *= DOSE_ESCALATION_MULTIPLIER when escalate===true
THRESHOLDS: DOSE_ESCALATION_MULTIPLIER=1.5. ALL required: prior same-domain
  CALORIE_TARGET intervention, same goalPhase, same direction, its
  observation window COMPLETED (>=2 weeks, OBSERVE.calorie_target.min=2),
  classified outcome exactly UNCHANGED (never CONFOUNDED, never IMPROVED),
  AND current evidence itself reliable (weight.trend and
  nutrition.coverage both known/GOOD)
PRECEDENCE: applied AFTER the fixed-step/adaptive sizing (N-COACH-04/05),
  BEFORE the ±5% cap (N-COACH-07) — so the learned step is still bounded by
  the same ceiling as an unlearned one. Never applied on rapidLossOverride path.
PERSISTENCE: feeds calorieAdjustment.note (receipt: "larger than we would normally make")
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: N-COACH-07 (±5% cap) still senior/downstream
EXCLUSIONS: rapidLossOverride path
NOTES: none
```

```
RULE_ID: N-COACH-07
DOMAIN: weekly coach — ±5% of current target hard cap on any calorie change
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() :1546-1552
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: currentCalTarget, change (post dose-escalation)
OUTPUT: change clamped to sign(change)*min(abs(change), round(currentCalTarget*0.05))
THRESHOLDS: 5% of current target
PRECEDENCE: senior to fixed-step, adaptive resize AND dose escalation; the
  rapid-loss compression's own +300 absolute cap (N-COACH-08) can only be
  tightened further by this, never relaxed
PERSISTENCE: n/a (final clamp before calorieAdjustment object is built)
USER_VISIBLE: yes (implicit in the magnitude shown)
PROVENANCE: static
SENIOR_RULES: none above
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-COACH-08
DOMAIN: weekly coach — rapid-loss upward-only override (Move #3, ED-SAFETY)
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() rapidLossOverride :1275-1280, sizing :1476-1485
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: phase.isCut, cycleOverride, actualRatePct, energyScore
OUTPUT: calorieAdjustment forced upward (never negative); bypasses the
  2-week cooldown AND the consecutiveOffTargetWeeks gate
THRESHOLDS: fires when phase.isCut AND !cycleOverride AND
  actualRatePct<=-1.5 (%BW/week) AND energyScore<=2. Magnitude:
  base 125 + 150 per additional 1.0% of weekly loss past -1.5%, capped at 300.
PRECEDENCE: SENIOR to: 2-week cooldown, consecutiveOffTargetWeeks gate,
  anti-oscillation (N-COACH-15), dose escalation (exempt outright), decline
  memory (N-U-AUTH-02, exempt outright), coordination gate's safety carve-out
  (N-COACH-17). JUNIOR to: FFM floor is moot here since override is
  upward-only and FFM floor only blocks negative changes; ED-pattern
  lockout (N-SAFETY-03) still nulls the change if calorieAdjustment.change<0
  (structurally impossible here since override forces upward) — so in
  practice the ED lockout cannot undo this override, only a downward change.
PERSISTENCE: heldDecisions push {type:'rapid_loss_corrected', kcalDelta,...}; applied on user tap
USER_VISIBLE: yes (locked copy card)
PROVENANCE: static thresholds
SENIOR_RULES: none — this is itself a safety escalation, Section 2 INVIOLABLE territory
EXCLUSIONS: bulk/maintain phases; cycle-flagged weeks
NOTES: same -1.5% threshold as rapidWeightLossFlag (N-SAFETY-01) and
  edPatternDetector's isRapidLoss (N-SAFETY-02) — F3/EN-9 explicitly
  aligned all three to `<=` at the boundary so they never disagree.
```

```
RULE_ID: N-COACH-09
DOMAIN: weekly coach — "target not tested" execution hold (Campaign 18 job 4B)
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() :1607-1615; classification src/lib/coachPrecedence.js classifyNutritionLimiter() :117-159
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: coachLimiters.nutrition.limiter (LIMITER.EXECUTION), calorieAdjustment, rapidLossOverride
OUTPUT: calorieAdjustment nulled; targetNotTestedHeld=true
THRESHOLDS: fires when the weight-trend miss direction matches the intake
  shortfall direction (missExplains, coachPrecedence.js :150-156) — i.e. a
  bulker eating UNDER target who is not gaining has not disproved the
  target; a bulker eating AT/OVER target who is not gaining HAS (that case
  is NOT held, it is a real PLAN finding)
PRECEDENCE: exempt for rapidLossOverride (protective increases never wait
  for good-adherence evidence); FFM floor, calorie floors, ED lockout all
  still apply below/after this and are senior
PERSISTENCE: heldDecisions push {type:'target_not_tested'}
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: N-COACH-08 exempt
EXCLUSIONS: rapidLossOverride
NOTES: none
```

```
RULE_ID: N-COACH-10
DOMAIN: weekly coach — decline memory (Campaign 18 job B)
AUTHORITY: src/lib/coachDecline.js suppressedByDecline()+materialEvidenceChange() :113-164; applied weeklyCoach.js :1630-1641
PRODUCTION_CALLER: CoachOutputScreen weekly run (priorDeclines from getCoachOutputHistory)
INPUTS: priorDeclines, domain='nutrition', kind='calorie_target',
  direction=sign(calorieAdjustment.change), currentSignature (evidenceSignature)
OUTPUT: calorieAdjustment nulled when same recommendation on materially
  unchanged evidence; declineHeld set
THRESHOLDS: MATERIAL_RATE_SHIFT_PCT=0.15 (rate must move >=0.15%/week to
  count as changed evidence); direction must match the prior decline
  exactly; any GOOD->POOR signal deterioration, any UNKNOWN->known
  transition, or a goalPhase change is automatically material (re-offers
  the recommendation)
PRECEDENCE: exempt for rapidLossOverride ("SAFETY IS NOT A RECOMMENDATION" —
  module header :16-20); sits ABOVE the FFM floor/ED lockout gates (i.e.
  those gates run later and are not affected by this one either way, since
  this only ever nulls what was already proposed)
PERSISTENCE: declinedAdjustments map inside coach_output.output_json
  (coachApply.markDeclined); persists until materially superseded — no fixed TTL
USER_VISIBLE: yes ("You chose to keep this as it was" held-decision copy)
PROVENANCE: dynamic
SENIOR_RULES: N-COACH-08 exempt
EXCLUSIONS: rapidLossOverride
NOTES: this is the U-AUTH "explicit rejection of suggestions" mechanism —
  cross-referenced as N-U-AUTH-02 below
```

```
RULE_ID: N-COACH-11
DOMAIN: weekly coach — FFM floor enforcing gate (ED-SAFETY, INVIOLABLE)
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() :1667-1717
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: ffmSafetyWeightKg (N-ADAPTIVE-06), recentIntakeAvgKcal,
  recentIntakeDaysLogged, bodyFatPercent, bodyFatSource, sex, calorieAdjustment.change
OUTPUT: calorieAdjustment nulled, ffmFloorHeld=true, ffmFloorContext set
THRESHOLDS: fires only with recentIntakeDaysLogged>=5 AND finite
  recentIntakeAvgKcal; threshold = computeFFMFloor's floorKcal (30 kcal/kg
  FFM, N-ADAPTIVE-05); fires when recentIntakeAvgKcal<=floorKcal AND
  calorieAdjustment.change<0 (increases never blocked)
PRECEDENCE: senior to decline memory, oscillation hold, dose escalation
  (runs after them in the pipeline and can still null what survived);
  applies AFTER rapidLossOverride sizing but rapidLossOverride only
  produces upward changes so this gate is structurally moot on that path
PERSISTENCE: heldDecisions push {type:'ffm_floor'} ranked SECOND (below
  ED-pattern lockout, above generic holds) — "supersedes the other
  calorie-hold reasons" (:1949-1951)
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: none above — Section 2 INVIOLABLE (never remove, raise
  threshold, or make conditional)
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-COACH-12
DOMAIN: weekly coach — intake-read-failure fail-closed hold
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() :1719-1726
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: intakeReadFailed (caller signal: the food-diary read THREW)
OUTPUT: calorieAdjustment nulled (only if change<0), intakeReadHeld=true
THRESHOLDS: fires whenever intakeReadFailed===true AND a cut was about to
  be proposed; upward/neutral changes pass unaffected
PRECEDENCE: same "most-protective" shape as the FFM floor — a failed read
  cannot let a cut proceed floor-blind (Campaign 1 P0-7 D1)
PERSISTENCE: heldDecisions push {type:'intake_read_failed'}
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: none above for cuts specifically
EXCLUSIONS: upward/neutral changes
NOTES: none
```

```
RULE_ID: N-COACH-13
DOMAIN: weekly coach — generic "calories held" fallback reasons
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() :2051-2066
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: scoffPositive, cycleOverride, onTarget, lastCalAdjustmentWeeksAgo,
  consecutiveOffTargetWeeks, offTargetWeeksRequired, calsAdherence
OUTPUT: heldDecisions push {type:'calories', reason:<one of five strings>}
THRESHOLDS: precedence-ordered if/else: wellbeing-screen restriction >
  cycle flag > on-target > <2-week cooldown remaining > off-target-weeks
  not yet met > untracked food
PRECEDENCE: explicitly gated OFF (F3/EN-10) when ffmFloorHeld or
  edPatternHeld are true — "never stack a generic reason under the ED
  lockout" (:2048-2050) so the safety message is never diluted
PERSISTENCE: heldDecisions array (display only)
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: N-SAFETY-03 (ED lockout), N-COACH-11 (FFM floor) both suppress this block entirely
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-COACH-14
DOMAIN: weekly coach — autonomy-mode hold gate (D16)
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() autoApplyHoldActive :2068-2095
PRODUCTION_CALLER: CoachOutputScreen (reads the single emitted flag rather than re-deriving)
INPUTS: deloadSuggested, matrixDeload, poorRecovery, safetyHold,
  ffmFloorHeld, edPatternHeld, rapidWeightLossFlag, scoffPositive, calmMode
OUTPUT: autoApplyHoldActive (boolean)
THRESHOLDS: OR of all nine inputs — any one open hold forces confirm-first
  behaviour regardless of coachAutonomy mode
PRECEDENCE: "a more autonomous mode changes WHO confirms, never whether the
  apply path's clamps run" (:2077-2078) — this is the single authority any
  autonomy-mode consumer must read
PERSISTENCE: coach output field (not itself persisted beyond the run)
USER_VISIBLE: indirectly (governs whether auto-apply is offered at all)
PROVENANCE: dynamic
SENIOR_RULES: none — this composes the senior safety flags, does not add a new one
EXCLUSIONS: none
NOTES: founder ruling 2026-07-10 (pass3-v2-founder-decisions.md:166,
  NA-coaching-10 :186-187): "Coached never auto-applies while a safety
  hold / ED-flag / suppression is active"
```

```
RULE_ID: N-COACH-15
DOMAIN: weekly coach — anti-oscillation gate (Campaign 18)
AUTHORITY: src/lib/coachIntervention.js wouldReverseRecent()+recentUnjudgedIntervention() :381-406; applied weeklyCoach.js :1659-1665
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: priorInterventions, domain='nutrition', sign(calorieAdjustment.change), nowMs, goalPhase
OUTPUT: calorieAdjustment nulled when it would REVERSE a same-domain,
  same-goalPhase intervention still inside its own observation window
THRESHOLDS: observation window = OBSERVE.calorie_target.min=2 weeks (same
  constant N-COACH-06 uses). Only a direction REVERSAL is blocked;
  continuing the same direction is governed by the ordinary cooldown/gate instead.
PRECEDENCE: exempt for rapidLossOverride ("protecting an athlete losing
  weight too fast must never wait for a previous decision to finish being
  judged" :1656-1658)
PERSISTENCE: heldDecisions push {type:'awaiting_last_change'}
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: N-COACH-08 exempt
EXCLUSIONS: rapidLossOverride
NOTES: this is the training-side mirror of volumeDecisionMemory
  (N-VOL-02) — the same founder rule F ("A recent intervention awaiting
  sufficient evidence should generally prevent another weakly supported
  reversal") applied to both domains via one shared primitive
  (recentUnjudgedIntervention/wouldReverseRecent).
```

```
RULE_ID: N-COACH-16
DOMAIN: weekly coach — dose-escalation eligibility duplication note
AUTHORITY: (see N-COACH-06)
PRODUCTION_CALLER: (see N-COACH-06)
NOTES: merged into N-COACH-06 to avoid duplicate entries; kept as a
  cross-reference stub because the mission brief names it separately (dose
  escalation vs. anti-oscillation are two different founder rules — A2 vs F).
```

```
RULE_ID: N-COACH-17
DOMAIN: weekly coach — cross-domain coordination gate ("one change at a time")
AUTHORITY: src/lib/coachPrecedence.js coordinateChanges() :380-427; applied weeklyCoach.js :1742-1765
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: coachContext, coachLimiters, proposed{calorieChange,volumeChange},
  safety{calorie: rapidLossOverride}
OUTPUT: allowCalorieChange/allowVolumeChange booleans; calorieAdjustment or
  volumeSignal nulled when disallowed
THRESHOLDS: R1 nutrition permission — a non-safety calorie change is held
  when nutrition limiter===EXECUTION (target not eaten). R2 training
  permission — a volume INCREASE (not a reduction) is held when training
  limiter===EXECUTION (sessions missed) or ===RECOVERY. R3 minimum
  effective intervention — when BOTH survive R1/R2 and are non-restraint,
  whichever domain's limiter===INSUFFICIENT_EVIDENCE is the one withheld
  (never both withheld, never the PLAN-classified one withheld)
PRECEDENCE: "SAFETY IS SENIOR TO PRECEDENCE" — rapidLossOverride-marked
  calorie changes and ANY volume reduction are NEVER withheld by this gate
  (:342-347). This is Option 2 architecture deliberately: domain engines
  (nutritionEngine floors, weeklyCoach autoregulation) stay authoritative;
  this only withholds from what already survived them.
PERSISTENCE: heldDecisions push {type:'one_change_at_a_time'} or domain-specific reason
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: N-COACH-08 (rapid loss) and volume-reduction are exempt outright
EXCLUSIONS: volume reductions
NOTES: cross-domain orchestration rule — X-SAFETY-04 cross-reference
```

```
RULE_ID: N-COACH-18
DOMAIN: weekly coach — cross-domain classification (limiter taxonomy)
AUTHORITY: src/lib/coachPrecedence.js classifyNutritionLimiter()+classifyTrainingLimiter() :117-210
PRODUCTION_CALLER: CoachOutputScreen weekly run (feeds N-COACH-09, N-COACH-17, and coachStory copy)
INPUTS: coachContext (weight.trend, nutrition.intake/coverage, training.execution/progress, recovery.systemic)
OUTPUT: LIMITER.{PLAN|EXECUTION|RECOVERY|INSUFFICIENT_EVIDENCE} per domain
THRESHOLDS: nutrition: unknown trend -> INSUFFICIENT_EVIDENCE; on-target ->
  PLAN(fine); off-target+unknown intake -> INSUFFICIENT_EVIDENCE; off-target
  +poor intake in the direction that explains the miss -> EXECUTION;
  off-target+eaten-at/over-target -> PLAN (real finding). training: unknown/
  poor execution -> EXECUTION; poor recovery -> RECOVERY; unknown progress
  -> INSUFFICIENT_EVIDENCE; poor progress on a run+recovered programme -> PLAN.
PRECEDENCE: "Nutrition appears NOWHERE in classifyTrainingLimiter,
  deliberately" (:185-187) — training judged independent of food logging
  (job 14 founder law: never punish for not using the diary)
PERSISTENCE: n/a (pure classification)
USER_VISIBLE: indirectly (drives copy + gating decisions above)
PROVENANCE: dynamic
SENIOR_RULES: none — this is the shared vocabulary every downstream gate reads
EXCLUSIONS: none
NOTES: none
```

---

## DOMAIN N-VOL — training-volume outcome memory (nutrition-adjacent, C18)

```
RULE_ID: N-VOL-01
DOMAIN: training volume — manual-muscle user authority (confounds outcome judging)
AUTHORITY: src/lib/coachIntervention.js classifyOutcome() :278-281
PRODUCTION_CALLER: weeklyCoach.runWeeklyCoach (manualVolumeMuscles input, sourced
  from effectiveLandmarks.getManualLandmarks per weeklyCoach.js comment :709-713)
INPUTS: after.intent.manualVolumeMuscles (non-empty list)
OUTPUT: outcome forced CONFOUNDED, because:'user_changed_it_themselves'
THRESHOLDS: any non-empty manualVolumeMuscles list on a VOLUME_START record's judgement
PRECEDENCE: mirrors N-MAINT-04's calorie-target check exactly
PERSISTENCE: n/a (read-time classification)
USER_VISIBLE: indirectly
PROVENANCE: dynamic
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: this IS a stored, dedicated flag (unlike calories) — manualVolumeMuscles
  is a real per-muscle user-authority list read from effectiveLandmarks.
```

```
RULE_ID: N-VOL-02
DOMAIN: training volume — outcome memory (harm/no-response holds)
AUTHORITY: src/lib/coachIntervention.js volumeDecisionMemory() :515-556; applied weeklyCoach.js :1365-1374,2135-2145
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: priorInterventions (VOLUME_START records), coachContext, nowMs, proposedDirection
OUTPUT: holdIncrease (zeroes a proposed volume increase), blockEscalation
  (refuses the D15 discretionary +1 step, N-COACH-EXCEEDED below)
THRESHOLDS: last VOLUME_START record still inside its window
  (OBSERVE.volume_start.min=2 weeks) AND pointed DOWN -> holdIncrease=true,
  blockEscalation=true (oscillation). Window met AND classified WORSENED
  with last.direction>0 -> holdIncrease=true, blockEscalation=true (harm).
  Window met AND classified UNCHANGED with last.direction>0 ->
  holdIncrease=false, blockEscalation=true (no-response: discretionary step
  refused but evidence-backed increase still allowed)
PRECEDENCE: can only WITHHOLD, never create/enlarge/reverse; a volume
  REDUCTION is never touched by this at all ("easing an athlete who is not
  recovering must never wait" :488-491)
PERSISTENCE: heldDecisions push {type:'volume_outcome_memory'}
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: none above
EXCLUSIONS: volume reductions
NOTES: none
```

```
RULE_ID: N-COACH-EXCEEDED
DOMAIN: weekly coach — sustained over-performance volume escalation (D15)
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() :2097-2145
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: consecutiveExceededWeeks, trainingSignal, peakWeekContextApplied,
  deloadSuggested/matrixDeload/poorRecovery/safetyHold/ffmFloorHeld/
  edPatternHeld/rapidWeightLossFlag/scoffPositive/calmMode,
  volumeMemory.blockEscalation, coordinationVolumeHeld
OUTPUT: volumeSignal += 1 (capped at MATRIX_PUSH_CEILING=3)
THRESHOLDS: EXCEEDED_ESCALATION_WEEKS=3 consecutive 'exceeded'
  trainingPerformance verdicts AND this week's autoregulation already reads
  'push'; gated OFF ENTIRELY by ANY of the nine safety/hold flags listed above
PRECEDENCE: "Gated off entirely (weaker signal always wins) while ANY
  safety hold is open" (:2108) — same senior-hold list as N-COACH-14's
  autoApplyHoldActive, plus volume-specific memory/coordination holds
PERSISTENCE: exceededEscalationApplied flag in coach output
USER_VISIBLE: yes (implicit in the volume note)
PROVENANCE: static (weeks threshold, ceiling), dynamic (eligibility)
SENIOR_RULES: every listed safety flag
EXCLUSIONS: hold/reduce weeks
NOTES: never bypasses computeVolumeApply's [mev,mrv] downstream clamp
  (coachApply.js:269-293, N-VOL-03 below)
```

```
RULE_ID: N-VOL-03
DOMAIN: training volume — apply-time MEV/MRV clamp
AUTHORITY: src/lib/coachApply.js computeVolumeApply() :269-293, ABSOLUTE_WEEKLY_SET_CEILING :50
PRODUCTION_CALLER: CoachOutputScreen Apply-volume tap
INPUTS: plannedRows (planned_muscle_volume), volumeDelta
OUTPUT: per-muscle plannedSets clamped to [mev, mrv-or-mav-or-ceiling]
THRESHOLDS: ABSOLUTE_WEEKLY_SET_CEILING=30 (last-resort backstop when a row
  has neither mrv nor mav — PROG-1, prevents +Infinity uncapped progression)
PRECEDENCE: senior to every volume proposal above — this is the final
  write-time clamp, independent of how the delta was decided
PERSISTENCE: planned_muscle_volume rows on Apply tap
USER_VISIBLE: indirectly (shows as the applied set count)
PROVENANCE: static
SENIOR_RULES: none above
EXCLUSIONS: none
NOTES: none
```

---

## DOMAIN N-BANK — calorie bank (the sole per-day exception to one-daily-truth)

```
RULE_ID: N-BANK-01
DOMAIN: calorie bank — one-daily-truth law (ordinary days identical)
AUTHORITY: src/lib/food/effectiveTargets.js resolveEffectiveTargets() :36-40 (module header :1-25)
PRODUCTION_CALLER: DiaryScreen day-target display (MacroRings)
INPUTS: stored targets, bankedDelta
OUTPUT: unchanged target unless bankedDelta!=0
THRESHOLDS: none — this IS the null-hypothesis rule: no training-day/rest-day
  cycling, no scheduled refeed, no weekday-specific targets exist in production
PRECEDENCE: senior structural law (Campaign 17A). Display-only: "The
  engine's stored target is untouched either way, so the coach, the
  rapid-loss gate and the ED-pattern detector always see the real target" (:23-24)
PERSISTENCE: no write — display resolution only
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: calorie bank is the ONLY exception
NOTES: HARD LAW confirmed in code as specified in the mission brief.
  MACRO_CYCLE_REST_DAY_CARB_CUT/computeMacroCycle/computeRefeedDay are
  explicitly REMOVED (coachApply.js :111-118) — confirmed dead-by-design,
  not merely unreachable.
```

```
RULE_ID: N-BANK-02
DOMAIN: calorie bank — planning maths (redistribution, weekly total invariant)
AUTHORITY: src/lib/food/calorieBank.js planCalorieBank() :53-100
PRODUCTION_CALLER: DiaryScreen "Plan a bigger day" flow -> food/mealPlanService
INPUTS: perDayBaseKcal (>=2 days), bigDayKey, requestedBumpKcal, floorKcal
  (max of sex/FFM floor), bandMaxKcal, maxBankDelta
OUTPUT: {ok, reason, appliedBumpKcal, perDayDeltaKcal} — deltaSum always 0 on success
THRESHOLDS: MIN_BANK_DELTA_KCAL=50 (below this, refuse as "presentation
  noise"); MAX_BANK_DELTA_KCAL=500 (founder-confirmed 2026-06-16 hard
  ceiling); refuses outright if ANY day (including the big day) is already
  <floorKcal ("Banking may never legitimise an already-unsafe week" :70-72);
  bump = floor(min(requested, maxBankDelta, roomUp, maxSpread)) where
  roomUp=bandMax-bigDayBase and maxSpread=min(otherDay-floor)*n
PRECEDENCE: pure maths only — caller enforces the ED-pattern/calm-mode/
  floored-target carve-out BEFORE calling (N-BANK-04)
PERSISTENCE: calorie_bank row (perDayDeltaKcal map)
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: N-BANK-04 (eligibility carve-out) gates whether this ever runs
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: N-BANK-03
DOMAIN: calorie bank — food-level application (CB-1b)
AUTHORITY: src/lib/food/calorieBank.js bankedPlanDayEdits() :207-221, applyBankToTarget() :228-240
PRODUCTION_CALLER: DiaryScreen / mealPlanService, after N-BANK-02 succeeds
INPUTS: planDays, dayKeys, perDayDeltaKcal, floorKcal
OUTPUT: edited plan days (carbs-first lever, protein/fat held), edited target display
THRESHOLDS: routes the delta through applyMacroDeltaToPlan (carbs-first,
  protein protected, double floor-clamp per module comment :189-193)
PRECEDENCE: junior to N-BANK-02's maths (only edits days that already have
  a non-zero delta)
PERSISTENCE: plan day rows edited; nutrition target display (targetKcal,
  carbsG) via applyBankToTarget — engine's STORED target row is untouched
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: none above
EXCLUSIONS: days with zero banked delta are left untouched
NOTES: none
```

```
RULE_ID: N-BANK-04
DOMAIN: calorie bank — eligibility carve-out (ED-SAFETY intersection)
AUTHORITY: src/screens/DiaryScreen.js bankingAvailable :364; src/lib/food/calorieBank.js displayBankedDelta() :183-185; src/lib/food/mealPlanAssembler.js targetWasFloored() :54
PRODUCTION_CALLER: DiaryScreen (governs BOTH whether the "Plan a bigger day"
  control appears AND whether a persisted bank displays)
INPUTS: targets (current), targetWasFloored(targets), edFlagOpen
OUTPUT: bankingAvailable=false disables the control AND zeroes the
  displayed delta even if a bank row is still persisted
THRESHOLDS: disabled when target was floored/compressed (any safety floor
  from N-TARGETS-05/06 fired) OR an ED-pattern flag is currently open
PRECEDENCE: senior to N-BANK-02/03 — "stops a stale bank from applying
  after ... the target gets floored, or an ED-pattern flag opens" (:177-181)
PERSISTENCE: no write; a stale persisted bank row is simply not displayed/applied
USER_VISIBLE: yes (control hidden/disabled)
PROVENANCE: dynamic
SENIOR_RULES: N-TARGETS-05/06 (floors), N-SAFETY-03 (ED flag)
EXCLUSIONS: none
NOTES: carb-cycle and refeed carve-outs "went with those features under the
  one-daily-truth law" — banking is now the ONLY per-day lever, so this is
  the only carve-out gate left in the module.
```

```
RULE_ID: N-BANK-05
DOMAIN: calorie bank — per-day sex/FFM floor
AUTHORITY: src/lib/food/calorieBank.js safeDayFloorKcal()+sexFloorKcal() :161-175
PRODUCTION_CALLER: DiaryScreen -> planCalorieBank (floorKcal argument)
INPUTS: sex, ffmFloorKcal (caller-computed via nutritionEngine.computeFFMFloor)
OUTPUT: floorKcal = max(sexFloor, ffmFloorKcal-if-higher)
THRESHOLDS: delegates to nutritionEngine.kcalFloorForSex (N-TARGETS-05) —
  no independent restatement, closing the pre-Campaign-1 drift where this
  module fell back to 1200 for unknown sex instead of 1500
PRECEDENCE: THE floor N-BANK-02's planCalorieBank enforces
PERSISTENCE: n/a
USER_VISIBLE: indirectly
PROVENANCE: static
SENIOR_RULES: N-TARGETS-05
EXCLUSIONS: none
NOTES: none
```

---

## DOMAIN N-ADHERENCE — logging-quality evidence gates

```
RULE_ID: N-ADHERENCE-01
DOMAIN: nutrition adherence — per-macro tolerance bands
AUTHORITY: src/lib/food/adherence.js ADHERENCE_TOLERANCE :12-16
PRODUCTION_CALLER: Food Insights screen pass/fail display (day "hit" classification)
INPUTS: logged macro values vs target
OUTPUT: boolean "hit" per macro
THRESHOLDS: kcal 10%, protein 10%, carbs 15%, fat 15%
PRECEDENCE: display/insights only — NOT the same signal weeklyCoach's
  calsAdherence ('under'|'hit'|'over'|'untracked', N-COACH mapCalsAdherence)
  uses for calorie-decision gating; that is a separate check-in-derived value
PERSISTENCE: none (computed on read)
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: SUSPECTED-CONTRADICTION (naming, not behaviour): the mission brief's
  "complete/partial/poor days" logging-quality gate is NOT this module.
  The actual weekly-coach-facing adherence gate is
  foodDiaryStandsIn/recentIntakeDaysLogged>=5 (N-COACH-03/N-COACH-11/
  N-MAINT-03's shared "5 days" bar) plus mapCalsAdherence's check-in-derived
  under/hit/over. No separate "complete/partial/poor day" three-tier
  classification was found as a PRODUCTION calorie-decision input; the
  closest named concept (ADHERENCE_TOLERANCE) governs Insights display only.
```

---

## DOMAIN X-SAFETY — ED-pattern detection, wellbeing, consent, notification suppression

```
RULE_ID: X-SAFETY-01
DOMAIN: safety — rapid-weight-loss display flag
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() rapidWeightLossFlag :1818-1828
PRODUCTION_CALLER: CoachOutputScreen weekly run
INPUTS: actualRatePct, energyScore, cycleOverride
OUTPUT: rapidWeightLossFlag (boolean)
THRESHOLDS: actualRatePct<=-1.5 (%BW/week, `<=` not `<`) AND
  energyScore<=2 AND !cycleOverride
PRECEDENCE: feeds N-COACH-14's autoApplyHoldActive; deliberately aligned
  (F3/EN-9) with N-COACH-08's rapidLossOverride and N-SAFETY-02's
  isRapidLoss to fire at the identical boundary
PERSISTENCE: coach output field
USER_VISIBLE: yes
PROVENANCE: static
SENIOR_RULES: none
EXCLUSIONS: cycle-flagged weeks
NOTES: none
```

```
RULE_ID: X-SAFETY-02
DOMAIN: safety — ED-pattern detector (multi-signal harm-prevention)
AUTHORITY: src/lib/edPatternDetector.js detectEdPatternFlag() :56-74, signal helpers :111-137
PRODUCTION_CALLER: weeklyCoach.runWeeklyCoach() :1904-1921 -> CoachOutputScreen (heldDecisions, N-BANK-04, notification gates)
INPUTS: userState.weightTrendPctPerWeek (computeWeeklyTrendPct),
  weeklyHistory (most-recent-first {energy,adherence,hasCheckin,hasFoodData}), goalLockAdvanced
OUTPUT: {fired, reason, signals:{s1..s4,count}, thresholdRequired}
THRESHOLDS: s1 rapid_loss: weightTrendPctPerWeek<=-1.5%. s2 low_energy:
  energy<=2 for >=2 (LOW_ENERGY_MIN_WEEKS) of the last 2 weeks
  (LOW_ENERGY_THRESHOLD=2). s3 sustained_under_adherence: adherence==='under'
  for >=2 (UNDER_ADHERENCE_MIN_WEEKS) of the last 3 weeks
  (UNDER_ADHERENCE_WINDOW=3). s4 weight_only_checkins: hasCheckin AND
  !hasFoodData for >=2 (WEIGHT_ONLY_MIN_WEEKS) of the last 3 weeks
  (WEIGHT_ONLY_WINDOW=3). Fires at signalsFired>=2 normally, >=3 when
  goalLockAdvanced===true.
PRECEDENCE: raises edPatternHeld (N-SAFETY-03) which is ranked FIRST among
  held decisions — "the strongest hold" (weeklyCoach.js :1926-1927)
PERSISTENCE: DB layer writes the state-machine transition (open/cleared) —
  not itself persisted by this pure function; caller (weeklyCoach via
  CoachOutputScreen) writes ed_pattern_flag row
USER_VISIBLE: yes (locked held-decision card)
PROVENANCE: static thresholds
SENIOR_RULES: none — Section 2 INVIOLABLE ("ED-safety system — do not touch")
EXCLUSIONS: none
NOTES: "The FFM energy floor is a separate guardrail ... and is never
  affected by goal_lock_advanced" (module header :26-27) — confirms the two
  safety systems are independent, not layered.
```

```
RULE_ID: X-SAFETY-03
DOMAIN: safety — ED-pattern flag clearance (fail-closed to "not cleared")
AUTHORITY: src/lib/edPatternDetector.js hasEdPatternCleared() :83-107
PRODUCTION_CALLER: weeklyCoach.runWeeklyCoach() :1906-1910 -> CoachOutputScreen
INPUTS: same shape as detectEdPatternFlag, current userState trend
OUTPUT: boolean; edPatternClearedThisWeek when true
THRESHOLDS: requires ALL of: 2 most-recent weeks with energy RECORDED
  (non-null) AND >LOW_ENERGY_THRESHOLD(2); adherence !=='under' both weeks;
  hasFoodData===true both weeks; current weightTrendPctPerWeek is a
  non-null finite value AND !isRapidLoss (i.e. >-1.5%)
PRECEDENCE: clearance requires POSITIVE evidence, never the mere ABSENCE of
  data (audit 2026-07-01 HIGH, module comment :93-96) — "a protective hold
  must NOT lift just because an at-risk user stopped logging"; a null
  energy or null trend counts as NOT cleared
PERSISTENCE: DB layer writes the clear transition on caller's instruction
USER_VISIBLE: yes ("Hold lifted" held-decision card)
PROVENANCE: static
SENIOR_RULES: none — Section 2 INVIOLABLE
EXCLUSIONS: none
NOTES: none
```

```
RULE_ID: X-SAFETY-04
DOMAIN: safety — ED-pattern lockout: what it suppresses
AUTHORITY: src/lib/weeklyCoach.js runWeeklyCoach() edPatternHeld :1931-1947
PRODUCTION_CALLER: CoachOutputScreen weekly run; DiaryScreen (N-BANK-04);
  notifications/scheduler.js (X-SAFETY-06/07/08)
INPUTS: edPatternResult.fired OR edPatternOpen (persisted state)
OUTPUT: any negative calorieAdjustment nulled; heldDecisions
  {type:'ed_pattern_lockout'} ranked first; feeds autoApplyHoldActive
  (N-COACH-14), N-COACH-EXCEEDED's gate, N-COACH-13's suppression,
  N-BANK-04's banking disable, and (via CoachOutputScreen's isPhotoSuppressed)
  the progress-photo comparison card
THRESHOLDS: same as X-SAFETY-02
PRECEDENCE: TOP of the held-decision stack; senior to FFM floor display
  ranking (though FFM floor gate itself is an independent, equally
  INVIOLABLE gate that runs regardless — the ranking is a COPY decision,
  not a logic bypass)
PERSISTENCE: heldDecisions array; ed_pattern_flag DB row (open/cleared state)
USER_VISIBLE: yes
PROVENANCE: dynamic
SENIOR_RULES: none
EXCLUSIONS: only downward calorie changes are nulled; upward changes pass
NOTES: none
```

```
RULE_ID: X-SAFETY-05
DOMAIN: safety — wellbeing calm mode (user-set, single source of truth)
AUTHORITY: src/lib/wellbeing.js getWellbeingMode()/isCalm() :22-47
PRODUCTION_CALLER: Settings -> Coaching (canonical editor, both tiers);
  weeklyCoach.runWeeklyCoach (calmMode input); notifications/scheduler.js
  (multiple sites, X-SAFETY-06/07/08); CoachOutputScreen (isPhotoSuppressed)
INPUTS: AsyncStorage key '@volyume_wellbeing_mode'
OUTPUT: 'calm'|'normal'|'unspecified' (default)
THRESHOLDS: isCalm() === (mode==='calm')
PRECEDENCE: user-controlled, no mandatory prompt (FQ-1(c), D96 — "never
  asks a mandatory question", corrected from a prior header claim that it did)
PERSISTENCE: AsyncStorage; sync notes the write time (notePrefWrite) so a
  cloud pull cannot silently downgrade a local calm setting with a stale
  cloud copy ("the calm ratchet in the pull still applies")
USER_VISIBLE: yes (Settings toggle)
PROVENANCE: dynamic (user choice)
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: calm mode gates ONLY training-side D15 escalation per weeklyCoach's
  own comment (:574,627-630: "D15 ... Gates ONLY") plus the notification/
  photo-card suppressions traced below — it is explicitly NOT a general
  override of every coaching computation, only of the specific
  escalation/suppression surfaces enumerated in N-COACH-14/EXCEEDED and X-SAFETY-06/07/08.
```

```
RULE_ID: X-SAFETY-06
DOMAIN: safety — notification suppression under open ED flag / calm mode (fail-closed)
AUTHORITY: src/lib/notifications/scheduler.js scheduleWinbackNotification() :893-933 (representative; same pattern at :1031,1151,1245,1813)
PRODUCTION_CALLER: app-open notification scheduling pass (win-back, weight/
  food-adjacent event pushes, partner-beat surfaces)
INPUTS: db.getOpenEdPatternFlag(userId), wellbeing.getWellbeingMode()
OUTPUT: notification never laid; any already-laid instance cancelled
THRESHOLDS: n/a — binary suppression
PRECEDENCE: "ED-safety, fail CLOSED: a transient flag read maps to the
  truthy 'read_failed' sentinel so the gate suppresses" (:903-905) — a DB
  read error is treated as an OPEN flag, never as "no flag". Calm mode
  ORed in as an equal-weight suppression posture (C6 R-17/D97-22): "if
  getWellbeingMode() itself throws, the catch also cancels" (:912-917,
  fail-closed on the calm read too).
PERSISTENCE: cancels/withholds scheduled local notification
USER_VISIBLE: no (silence is the point)
PROVENANCE: dynamic
SENIOR_RULES: none — Section 2 INVIOLABLE ("Weight/food-adjacent
  notifications suppress under an open ED flag; never weaken that suppression")
EXCLUSIONS: none
NOTES: repeated at scheduler.js:1031 and :1151 ("Open ED/wellbeing flag →
  never lay ... Silence is the respectful behaviour"), :1245 (food-push
  specific: "a food push at a flagged user is the..."), :1813 (partner
  surface: "silence (the partner surface freezes benignly...)"). All five
  sites share the identical fail-closed-on-read-error pattern.
```

```
RULE_ID: X-SAFETY-07
DOMAIN: safety — notification delivery downgrade under open ED flag (foreground)
AUTHORITY: src/lib/notifications/categories.js :127 (comment context)
PRODUCTION_CALLER: foreground notification handler
INPUTS: open ED/wellbeing flag state
OUTPUT: foregrounded delivery downgrades (softened presentation) rather than full alert
THRESHOLDS: n/a
PRECEDENCE: junior variant of X-SAFETY-06 — this is a softening of
  PRESENTATION for notifications that DO fire, distinct from the categories
  suppressed outright at X-SAFETY-06
PERSISTENCE: n/a
USER_VISIBLE: yes (softer presentation)
PROVENANCE: dynamic
SENIOR_RULES: X-SAFETY-06 (outright suppression) takes precedence for the categories it covers
EXCLUSIONS: none
NOTES: full text not re-quoted here (single-line comment context read via grep, not full block read)
```

```
RULE_ID: X-SAFETY-08
DOMAIN: safety — Article 9 health-data consent gate, fail-closed
AUTHORITY: src/navigation/RootNavigator.js consent-gate block :1594-1757 (healthConsentLatch failsafe :1605-1620, gate condition :1748-1757)
PRODUCTION_CALLER: app boot / sign-in routing (every session)
INPUTS: healthConsent (store), healthConsentChecked (store), firstRunComplete, user
OUTPUT: routes to Article9ConsentStack; blocks the rest of the app until resolved
THRESHOLDS: consentUnresolvedForNewUser = (healthConsent==null &&
  !firstRunComplete); gate fires when healthConsentChecked && (healthConsent
  ===false || consentUnresolvedForNewUser). A failsafe timer
  (healthConsentLatch) fires if the consent check "never resolved" and
  routes to the gate treating it as consent NOT granted (:1614-1618).
PRECEDENCE: un-skippable, cannot be reordered; also gates cloud
  restore/pull ("consent NOT yet affirmative" blocks push/pull until
  resolved, :1531-1547) and is itself checked again at the sync runner
  layer ("the runner enforces the same gate fail-closed", :1534-1536)
PERSISTENCE: healthConsent flag in store/DB
USER_VISIBLE: yes (the consent screen itself)
PROVENANCE: dynamic
SENIOR_RULES: none — Section 2 INVIOLABLE (GDPR/Article 9)
EXCLUSIONS: none
NOTES: "granting consent on the Article 9 screen skipped and logged" comment
  (:1536) documents a defensive log path, not a bypass — full RootNavigator
  read confirms no path reaches authenticated app state with
  healthConsent!==true for a non-local, non-first-run-complete user.
```

```
RULE_ID: X-SAFETY-09
DOMAIN: safety — guardrail tier-blindness
AUTHORITY: cross-cutting (verified by ABSENCE): grep of nutritionEngine.js,
  weeklyCoach.js, edPatternDetector.js, coachApply.js for tier/proGate
  references returns none in any floor/gate/detector computation path
PRODUCTION_CALLER: n/a (structural invariant)
INPUTS: n/a
OUTPUT: n/a
THRESHOLDS: n/a
PRECEDENCE: n/a
PERSISTENCE: n/a
USER_VISIBLE: n/a
PROVENANCE: structural
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: confirms proGate.js's documented mandate ("Guardrails are tier-blind
  ... they never consult tier") holds in the traced engine files. Not
  exhaustively re-verified across every screen wrapper; recorded as a
  structural finding from this trace's file set, not a full repo-wide proof.
```

---

## DOMAIN U-AUTH — user authority (declines, manual overrides, dismissals)

```
RULE_ID: U-AUTH-01
DOMAIN: user authority — accepted intervention memory (only what was tapped)
AUTHORITY: src/lib/coachIntervention.js interventionsFromHistory() :201-221; write side src/lib/coachApply.js markApplied() :210-222
PRODUCTION_CALLER: CoachOutputScreen Apply-tap handlers (both calorie and
  volume Apply buttons write the record; weekly run reads it back via priorInterventions)
INPUTS: coach_output.output_json.appliedAdjustments map
OUTPUT: {kind, direction, magnitude, appliedValue, because, goalPhase, observe, ...}
THRESHOLDS: n/a — records are written ONLY on a deliberate tap
  ("Volyume never scores a change it proposed and the user declined",
  module header :32-34); RECORD_VERSION=1 gate skips malformed/legacy-shape entries
PRECEDENCE: this IS the confirm-then-apply law's data trail — "nothing
  changes until the user taps" (coachApply.js header :3-7)
PERSISTENCE: coach_output.output_json (appliedAdjustments), rides existing sync/restore
USER_VISIBLE: yes (applied state renders as "applied" on the card)
PROVENANCE: dynamic
SENIOR_RULES: none
EXCLUSIONS: none
NOTES: no separate schema migration was needed — deliberately piggybacks the
  existing output_json blob (coachApply.js header :13-16)
```

```
RULE_ID: U-AUTH-02
DOMAIN: user authority — explicit decline (rejection of a suggestion)
AUTHORITY: src/lib/coachApply.js markDeclined()/isDeclined() :232-243; suppression logic src/lib/coachDecline.js (full file, see N-COACH-10)
PRODUCTION_CALLER: CoachOutputScreen decline-tap handler; read back via
  priorDeclines -> weeklyCoach.runWeeklyCoach -> suppressedByDecline
INPUTS: coach_output.output_json.declinedAdjustments map
OUTPUT: kept in ITS OWN map, deliberately separate from appliedAdjustments
  so isApplied's meaning never blurs (coachApply.js :224-231)
THRESHOLDS: see N-COACH-10 (MATERIAL_RATE_SHIFT_PCT=0.15, signal-transition rules)
PRECEDENCE: "A DECLINE IS NOT AN EXCLUSION... NOT NOW, not NEVER" (coachDecline.js
  header :10) — expires the moment materialEvidenceChange finds the
  situation has genuinely moved, no fixed TTL otherwise
PERSISTENCE: coach_output.output_json (declinedAdjustments)
USER_VISIBLE: yes ("You chose to keep this as it was" + "Since then ..." on return)
PROVENANCE: dynamic
SENIOR_RULES: none — but NEVER overrides safety (coachDecline.js header :16-20:
  "A decline can never suppress a calorie floor, rapid-loss protection, an
  ED hold or a joint-safety hold... the engines that own them never consult this module")
EXCLUSIONS: safety holds/floors are not offers and cannot be declined
NOTES: this is the direct answer to the mission's "explicit rejection of
  suggestions... where stored, what they suppress, how long they last" ask.
```

```
RULE_ID: U-AUTH-03
DOMAIN: user authority — manual calorie-target edit (structural, no dedicated flag)
AUTHORITY: (see N-MAINT-04)
NOTES: cross-reference stub — see N-MAINT-04 for the full record. No
  separate `manual_override` column exists in nutrition_targets; user
  authority is inferred by comparing the coach's last-applied kcal value to
  the currently-stored target at outcome-classification time.
```

```
RULE_ID: U-AUTH-04
DOMAIN: user authority — manual training-volume muscles
AUTHORITY: (see N-VOL-01)
NOTES: cross-reference stub — see N-VOL-01. Unlike calories, this IS a
  dedicated stored list (effectiveLandmarks.getManualLandmarks), read into
  weeklyCoach as manualVolumeMuscles and consulted at both context-build
  time (weeklyCoach.js :709-714 comment) and outcome-classification time
  (coachIntervention.js :278-281).
```

```
RULE_ID: U-AUTH-05
DOMAIN: user authority — readiness/coach-line dismiss surfaces
AUTHORITY: NOT FOUND as a nutrition/safety-consequential rule
PRODUCTION_CALLER: n/a
NOTES: DEAD/NOT-APPLICABLE FOR THIS DOMAIN. `src/lib/readinessSummary.js`
  (buildReadinessSummary) composes a training-readiness chip from existing
  HomeScreen state and is a pure display-priority function with no
  dismiss/suppression state of its own — the module's own header notes a
  SEPARATE dismissible "Recovery week suggested" banner is deliberately NOT
  folded into it. No dismiss persistence or nutrition/safety consequence was
  found inside readinessSummary.js itself; the dismissible banner it refers
  to lives in HomeScreen and was not traced in this nutrition/safety-scoped
  pass (out of Step 1's domain — training-surface dismiss belongs to the
  training/exercise validation lane). Recorded here as a scope boundary, not
  a defect.
```

---

## Inventory Table

| rule_id | authority (file:function) | caller-status |
|---|---|---|
| N-TARGETS-01 | nutritionEngine.js:calcBMR/calculateNutritionTargets | LIVE — NutritionTargetsScreen |
| N-TARGETS-02 | nutritionEngine.js:calculateNutritionTargets (TDEE) | LIVE — NutritionTargetsScreen |
| N-TARGETS-03 | nutritionEngine.js:calculateNutritionTargets (phase adj) | LIVE — NutritionTargetsScreen |
| N-TARGETS-04 | nutritionEngine.js:calculateNutritionTargets (weight guard) | LIVE — NutritionTargetsScreen |
| N-TARGETS-05 | nutritionEngine.js:kcalFloorForSex | LIVE — NutritionTargetsScreen + coachApply + calorieBank |
| N-TARGETS-06 | nutritionEngine.js:calculateNutritionTargets (1.5% gate) | LIVE — NutritionTargetsScreen |
| N-TARGETS-07 | nutritionEngine.js:calculateNutritionTargets (0.8% caution) | LIVE — NutritionTargetsScreen |
| N-TARGETS-08 | nutritionEngine.js:energyAvailabilityCaution | LIVE — NutritionTargetsScreen |
| N-TARGETS-09 | nutritionEngine.js:calcProtein | LIVE — NutritionTargetsScreen |
| N-TARGETS-10 | coachApply.js:computeDietBreakTargets | LIVE — CoachOutputScreen Apply |
| N-ADAPTIVE-01 | nutritionEngine.js:computeEWMA | LIVE — display only |
| N-ADAPTIVE-02 | nutritionEngine.js:computeWeeklyWeightChange | LIVE — feeds N-ADAPTIVE-03 |
| N-ADAPTIVE-03 | nutritionEngine.js:computeAdaptiveTDEEAdjustment | LIVE — weeklyCoach.js |
| N-ADAPTIVE-04 | nutritionEngine.js:computeStepTrendModifier | LIVE — weeklyCoach.js |
| N-ADAPTIVE-05 | nutritionEngine.js:computeFFMFloor | LIVE — weeklyCoach.js + engine consumers |
| N-ADAPTIVE-06 | nutritionEngine.js:resolveFfmFloorWeightKg | LIVE — weeklyCoach.js |
| N-ADAPTIVE-07 | nutritionEngine.js:shouldSuggestDietBreak | LIVE — weeklyCoach.js |
| N-MAINT-01 | effectiveMaintenance.js:resolveEffectiveMaintenance | LIVE — NutritionTargetsScreen + CoachOutputScreen |
| N-MAINT-02 | effectiveMaintenance.js:isValidEffectiveMaintenanceMemo | LIVE — gates N-MAINT-01 |
| N-MAINT-03 | effectiveMaintenance.js:deriveEffectiveMaintenanceMemo | LIVE — CoachOutputScreen weekly run |
| N-MAINT-04 | coachIntervention.js:classifyOutcome (user-override check) | LIVE — weeklyCoach dose-escalation input |
| N-MAINT-05 | nutritionEngine.js:calculateNutritionTargets (residual apply) | LIVE — NutritionTargetsScreen |
| N-COACH-01 | weeklyCoach.js:assessDataConfidence | LIVE — CoachOutputScreen |
| N-COACH-02 | weeklyCoach.js:runWeeklyCoach (session gate) | LIVE — CoachOutputScreen |
| N-COACH-03 | weeklyCoach.js:runWeeklyCoach (canAdjustCals) | LIVE — CoachOutputScreen |
| N-COACH-04 | weeklyCoach.js:runWeeklyCoach (fixed steps) | LIVE — CoachOutputScreen |
| N-COACH-05 | weeklyCoach.js:runWeeklyCoach (adaptive resize) | LIVE — CoachOutputScreen |
| N-COACH-06 | coachIntervention.js:doseEscalation | LIVE — CoachOutputScreen |
| N-COACH-07 | weeklyCoach.js:runWeeklyCoach (±5% cap) | LIVE — CoachOutputScreen |
| N-COACH-08 | weeklyCoach.js:runWeeklyCoach (rapidLossOverride) | LIVE — CoachOutputScreen |
| N-COACH-09 | coachPrecedence.js:classifyNutritionLimiter | LIVE — CoachOutputScreen |
| N-COACH-10 | coachDecline.js:suppressedByDecline | LIVE — CoachOutputScreen |
| N-COACH-11 | weeklyCoach.js:runWeeklyCoach (FFM gate) | LIVE — CoachOutputScreen |
| N-COACH-12 | weeklyCoach.js:runWeeklyCoach (intake-read-fail hold) | LIVE — CoachOutputScreen |
| N-COACH-13 | weeklyCoach.js:runWeeklyCoach (generic hold copy) | LIVE — CoachOutputScreen |
| N-COACH-14 | weeklyCoach.js:runWeeklyCoach (autoApplyHoldActive) | LIVE — CoachOutputScreen |
| N-COACH-15 | coachIntervention.js:wouldReverseRecent | LIVE — CoachOutputScreen |
| N-COACH-16 | (= N-COACH-06, cross-ref) | n/a |
| N-COACH-17 | coachPrecedence.js:coordinateChanges | LIVE — CoachOutputScreen |
| N-COACH-18 | coachPrecedence.js:classifyNutritionLimiter/classifyTrainingLimiter | LIVE — CoachOutputScreen |
| N-VOL-01 | coachIntervention.js:classifyOutcome (manualVolumeMuscles) | LIVE — weeklyCoach input |
| N-VOL-02 | coachIntervention.js:volumeDecisionMemory | LIVE — CoachOutputScreen |
| N-COACH-EXCEEDED | weeklyCoach.js:runWeeklyCoach (D15 escalation) | LIVE — CoachOutputScreen |
| N-VOL-03 | coachApply.js:computeVolumeApply | LIVE — CoachOutputScreen Apply |
| N-BANK-01 | food/effectiveTargets.js:resolveEffectiveTargets | LIVE — DiaryScreen |
| N-BANK-02 | food/calorieBank.js:planCalorieBank | LIVE — DiaryScreen |
| N-BANK-03 | food/calorieBank.js:bankedPlanDayEdits/applyBankToTarget | LIVE — DiaryScreen |
| N-BANK-04 | DiaryScreen.js:bankingAvailable | LIVE — DiaryScreen |
| N-BANK-05 | food/calorieBank.js:safeDayFloorKcal | LIVE — DiaryScreen |
| N-ADHERENCE-01 | food/adherence.js:ADHERENCE_TOLERANCE | LIVE — Food Insights display only |
| X-SAFETY-01 | weeklyCoach.js:runWeeklyCoach (rapidWeightLossFlag) | LIVE — CoachOutputScreen |
| X-SAFETY-02 | edPatternDetector.js:detectEdPatternFlag | LIVE — weeklyCoach.js |
| X-SAFETY-03 | edPatternDetector.js:hasEdPatternCleared | LIVE — weeklyCoach.js |
| X-SAFETY-04 | weeklyCoach.js:runWeeklyCoach (edPatternHeld) | LIVE — multiple consumers |
| X-SAFETY-05 | wellbeing.js:getWellbeingMode/isCalm | LIVE — multiple consumers |
| X-SAFETY-06 | notifications/scheduler.js (5 sites) | LIVE — notification scheduling |
| X-SAFETY-07 | notifications/categories.js:127 | LIVE — foreground handler (comment-level trace only) |
| X-SAFETY-08 | RootNavigator.js (consent gate) | LIVE — app boot |
| X-SAFETY-09 | (structural, absence-verified) | LIVE (by absence) |
| U-AUTH-01 | coachIntervention.js:interventionsFromHistory + coachApply.js:markApplied | LIVE — CoachOutputScreen |
| U-AUTH-02 | coachApply.js:markDeclined/isDeclined + coachDecline.js | LIVE — CoachOutputScreen |
| U-AUTH-03 | (= N-MAINT-04, cross-ref) | LIVE |
| U-AUTH-04 | (= N-VOL-01, cross-ref) | LIVE |
| U-AUTH-05 | readinessSummary.js | OUT-OF-SCOPE / no nutrition-safety consequence found |

**Total unique rule records: 47** (43 fully specified + 4 cross-reference
stubs pointing at a record above: N-COACH-16→N-COACH-06, U-AUTH-03→N-MAINT-04,
U-AUTH-04→N-VOL-01, U-AUTH-05 recorded as an explicit scope-boundary negative
finding).

---

## Deduplicated Threshold List (for Step 9)

| Threshold | Value | Source rule(s) |
|---|---|---|
| Male calorie floor | 1500 kcal/day | N-TARGETS-05, N-BANK-05 |
| Female / unknown-sex calorie floor | 1200 / 1500 kcal/day (unknown takes higher) | N-TARGETS-05, N-BANK-05 |
| FFM energy floor | 30 kcal/kg FFM/day | N-ADAPTIVE-05, N-COACH-11, N-TARGETS-08 |
| FFM fallback fraction (no credible BF%) | male 0.78, female 0.72 | N-ADAPTIVE-05 |
| Rapid-loss hard gate (target-time) | 1.5% BW/week | N-TARGETS-06 |
| Rapid-loss correction trigger (weekly, coach-time) | ≤ -1.5% BW/week AND energy ≤2 | N-COACH-08, X-SAFETY-01, N-SAFETY-02(s1) |
| Recommended-cap caution | 0.8% BW/week | N-TARGETS-07 |
| Energy-availability caution line | male 35, female/unknown 40 kcal/kg FFM | N-TARGETS-08 |
| Diet-break trigger | 8 weeks in deficit | N-ADAPTIVE-07 |
| Adaptive-TDEE minimum data | 14 points (~2 weeks) | N-ADAPTIVE-03 |
| Adaptive-TDEE confidence bands | high ≥4wk, medium ≥3wk, low <3wk | N-ADAPTIVE-03 |
| Adaptive-TDEE update-gain clamp | [0.50, 0.65] | N-ADAPTIVE-03 |
| Step-trend modifier delta thresholds | ≥1500 steps/day AND ≥20% of baseline (floor 4000) | N-ADAPTIVE-04 |
| Step-trend persistence bar | ≥1000 steps/day each half | N-ADAPTIVE-04 |
| Step-trend gain ramp | 0.50→0.65 over 1500–4000 step delta | N-ADAPTIVE-04 |
| Effective-maintenance staleness | 14 days | N-MAINT-01 |
| Effective-maintenance material weight change | ≥5% BW | N-MAINT-01 |
| Effective-maintenance residual divergence flag | >20% of formula prior | N-MAINT-03 |
| Effective-maintenance memo validity minimums | ≥5 food days, ≥14 weight points | N-MAINT-02, N-MAINT-03 |
| Weekly coach data-confidence — off-target weeks required | 2 (high confidence) / 3 (low/medium) | N-COACH-03 |
| Weekly coach — calorie change cooldown | 2 weeks | N-COACH-03 |
| Weekly coach — session-adherence stabilise gate | <50% sessions | N-COACH-02 |
| Weekly coach — ±5% target cap on any single change | 5% of current target | N-COACH-07 |
| Rapid-loss compression cap | +300 kcal absolute (125 base + 150/1%excess) | N-COACH-08 |
| Fixed-step calorie sizing | ±100/±125/±150 kcal by direction/adherence | N-COACH-04 |
| Dose-escalation multiplier | 1.5x | N-COACH-06 |
| Decline material-change bar | ratePct shift ≥0.15%/week | N-COACH-10 |
| Anti-oscillation / outcome observation window (calorie) | 2 weeks | N-COACH-15, N-COACH-06 |
| Anti-oscillation / outcome observation window (volume) | 2 weeks | N-VOL-02 |
| Sustained over-performance escalation | 3 consecutive "exceeded" weeks | N-COACH-EXCEEDED |
| Volume apply hard ceiling (no mrv/mav) | 30 sets/week | N-VOL-03 |
| ED-pattern signal count to fire | ≥2 signals (≥3 if goalLockAdvanced) | X-SAFETY-02 |
| ED-pattern s1 rapid-loss | ≤-1.5%/week | X-SAFETY-02 |
| ED-pattern s2 low energy | energy ≤2 for ≥2 of last 2 weeks | X-SAFETY-02 |
| ED-pattern s3 under-adherence | 'under' for ≥2 of last 3 weeks | X-SAFETY-02 |
| ED-pattern s4 weight-only check-ins | ≥2 of last 3 weeks | X-SAFETY-02 |
| ED-pattern clearance | 2 consecutive weeks of positive evidence (not absence) | X-SAFETY-03 |
| Calorie bank minimum meaningful delta | 50 kcal | N-BANK-02 |
| Calorie bank maximum per-day bump | 500 kcal (founder-confirmed) | N-BANK-02 |
| Adherence display tolerance (Insights only) | kcal/protein 10%, carbs/fat 15% | N-ADHERENCE-01 |
| Food-diary minimum days to "stand in" for check-in | 5 days logged in the diary window | N-COACH-03, N-COACH-11, N-MAINT-03 |
| Check-in staleness for recalibration freeze | 14 days since last completed check-in | N-COACH-03 |

---

## Suspected Contradictions / Defects (do not fix)

1. **N-ADHERENCE-01 naming mismatch** — the mission brief's "complete/
   partial/poor days" three-tier logging-quality gate does not exist as a
   named production concept feeding calorie decisions. The nearest thing
   (`food/adherence.js` `ADHERENCE_TOLERANCE`) is Food-Insights display-only.
   The actual coach-facing gate is the binary "≥5 logged days" bar used
   identically in three places (N-COACH-03, N-COACH-11, N-MAINT-03) plus the
   check-in-derived `calsAdherence` under/hit/over/untracked chip. Recorded
   as a naming gap, not a behavioural defect — flagging for Step 9 in case a
   downstream campaign document assumed the three-tier gate exists in code.

2. **N-ADAPTIVE-06 historical note** — the C10A/C10I resolver fix
   (`resolveFfmFloorWeightKg`) is confirmed present and correct in the
   current tree; recorded as provenance only, not a live defect.

No live SUSPECTED-DEFECT or SUSPECTED-CONTRADICTION was found between
documented law and production behaviour in the files traced for this step.
