# Cardio integration audit - Phase 1: Internal audit (from the code)

Status: COMPLETE. Timestamp: 2026-06-03. Scope: cardio only (steps is locked
and liked, untouched). Every claim cites a file:line read this session.

---

## 1. The entire current "cardio system", end to end

Cardio today is a single coach lever plus a profile flag plus a check-in
question. There is no activity, no library, no logging of what was done, no
calorie figure, and no recovery classification. The full chain:

1. **Coach emits a generic target** (`weeklyCoach.js:727-757`).
   `cardioAdjustment` is `{ prescribed, type, note }`. Two variants:
   - `type: 'Steady cardio'`, note "Add 3 sessions of 20 to 30 min at an easy
     pace. You should be able to hold a conversation throughout."
   - `type: 'Cardio boost'` (only `agg_cut` + 4+ weeks off target), note "Add
     one short high-intensity interval session (10 to 15 min) on top of your
     steady-paced cardio."
   - Poor recovery overrides both: `{ prescribed: false, note: 'Cardio paused
     this week. Recovery takes priority.' }` (lines 737-742).
   It fires **only** when `phase.isCut && !onTarget && offTargetDirection > 0
   && stepsAtUpperBand` (line 735). Never for bulk / maintenance / recomp /
   general fitness.

2. **User applies it** (`CoachOutputScreen.js:814-829`, `handleApplyCardio`).
   Writes `userProfile.cardioPrescription = cardio.type` (a string like
   "Steady cardio") via `saveLocalProfile`, then marks the output applied.
   This is the confirm-then-apply contract: nothing happens until Apply.

3. **Check-in asks for adherence** (`WeeklyCheckInScreen.js:680-695`). Gated on
   `hasCardioPrescription = Boolean(userProfile?.cardioPrescription)`
   (line 271). A 3-option row: `Did it` / `Mostly` / `Missed it`
   (`cardioAdherence`). Submitted as `checkin.cardioAdherence` (line 436).

4. **Next coach run reads adherence back** - `cardioAdherence` is a coach
   input (`weeklyCoach.js` consumes the check-in object), closing the loop.

**Storage:** `coach_outputs.cardio_prescription TEXT`
(`database.js:430`); `weekly_checkins.cardio_adherence TEXT` (local migration
`database.js:1066-1072`, cloud migration 050). `userProfile.cardioPrescription`
is a local-profile string (no dedicated column, same destination pattern as
steps).

**What is NOT captured anywhere:** which activity, duration done, intensity
done, distance, calories, or any per-session cardio record. `cardioAdherence`
is the only cardio datum that persists, and it is a 3-way verdict against a
target the coach itself set.

---

## 2. Where cardio appears in each surface

| Surface | Cardio provision today | Evidence |
|---|---|---|
| **Plans** (`PlansScreen.js`, `PlanDetailScreen.js`) | **None.** No cardio slot, no non-lifting session type, no weekly target block. Grep for `cardio/rest day/conditioning/session type` returns nothing. | `PlansScreen.js` grep empty |
| **Onboarding** (`ProOnboardingScreen.js`) | Cardio is **named but not captured.** Captures `activityLevel` (derived from days/week, line 471) and steps opt-in (`stepsTargetOn`, default true, lines 229-257, 499-500). Steps copy references cardio as a later lever: "later on cardio, instead of steps" (line 1247). No cardio opt-in, no activity selection. | lines 471, 499-500, 1247 |
| **Check-in** (`WeeklyCheckInScreen.js`) | Adherence only, gated on an applied prescription (Did it / Mostly / Missed it). No duration/type logged. | lines 680-695 |
| **Calories / Diary** | **None.** Cardio is not added to the target. Maintenance is `bmr * activityMultiplier` and the adaptive TDEE absorbs activity from the weight trend. | `nutritionEngine.js:589-591`, 255-361 |
| **Coach** | The cut-only generic lever in §1. | `weeklyCoach.js:727-757` |
| **Recovery** | Cardio can be paused by poor recovery, but no cardio session feeds the recovery model. The recovery EMAs read lifting feedback only. | `weeklyCoach.js:737`, `recoveryEMA.js:48-67` |

---

## 3. The lifting exercise library - the reference architecture

This is the model the brief asks the cardio library to be built to.

**Table `exercises`** (`database.js:66-83`):
`id TEXT PK, name, primary_muscle, secondary_muscles, equipment,
movement_pattern, compound_isolation, default_rep_min, default_rep_max,
fatigue_cost, stimulus_to_fatigue_ratio, subregion, is_custom, notes,
created_at, updated_at`.

**Seed row shape** (`seedExercises.js:375+`, `RAW` array): a positional tuple
`[name, primaryMuscle, [secondaryMuscles], equipment, movementPattern,
isCompound, repMin, repMax, fatigueCost, SFR]`. Example:
`['Barbell Bench Press', 'chest', ['triceps','front_delts'], 'barbell',
'push', true, 4, 8, 4, 3]`. ~475 rows.

**Deterministic IDs:** `canonicalExerciseId(name)` hashes the name into a
UUID-shaped string so the same canonical exercise has the same id on every
device (`seedExercises.js:41-76`). Custom exercises keep random uids and
round-trip via `custom_exercises` (composite PK `(user_id, id)`,
`database.js:991-1014`).

**Derived metadata** (`exerciseMetadata.js`, pure, no DB): from the seed
fields it derives `equipmentCategory, machineType, force, laterality,
difficulty, machineOk, homeOk, equipmentProfiles`. Override maps handle the
judgment calls. Seed and backfill both call `deriveExerciseMetadata` for
identical results (`seedExercises.js:1-15` backfill keys).

**Consumption:** the metadata drives the plan generator's pool filter
(`equipmentProfiles` is read by `planEngine` filterPool), the swap engine,
difficulty gating, and the library browse/search. Volume accounting reads
`primary_muscle` + `secondary_muscles` (the `allocateExerciseVolume`
allocator). `fatigue_cost` and `SFR` feed selection scoring and recovery.

**The discipline to copy:** a small authored table, rich flags derived not
hand-typed, deterministic IDs, one pure deriver shared by seed + backfill.
The cardio library should mirror this exactly, with MET where lifting has
fatigue_cost/SFR.

**Relevant detail:** `exerciseMetadata.js:38` `CONDITIONING_RE` already names
cardio implements (`sled|prowler|battle rope|assault bike|cycling|tyre flip|
rower|ski erg|treadmill|elliptical`) and buckets them as `other` so they never
count as resistance machines. The vocabulary exists; the activity model does
not.

---

## 4. Coach check-in process - full map

**Check-in capture** (`WeeklyCheckInScreen.js`): a multi-step weekly form.
Step 1 collects weight trend context, nutrition adherence (derived from food
rollups, line 98+), steps (auto average when 4+ days registered via
`summariseWeekSteps`, else a manual average, lines 646-678), and cardio
adherence when a prescription is applied (lines 680-695). Step 2 collects
recovery + issues (training performance, joint pain, notes; line 700+). The
submitted object includes `stepsAvg`, `cardioAdherence`, `stepsAdherence`
(legacy/null), `trainingPerformance`, `jointPain`, `notes` (lines 430-436,
503).

**Coach compute** (`weeklyCoach.js`, ~1159 lines): consumes the check-in plus
weight history, recovery EMAs, and phase config. Produces `adjustments:
{ training, calories, steps, cardio }` plus deload/diet-break/refeed and a
`why_this` string. Levers in order: calories (adaptive when confident, lines
554-589), steps (the gentlest lever, lines 686-725), cardio (next lever, cut
+ steps maxed, lines 727-757). Phase vocabulary is normalised via
`PHASE_ALIASES` (line 205).

**Apply** (`CoachOutputScreen.js` + `coachApply.js`): each adjustment is an
AdjustmentRow with an Apply button; nothing writes until tapped. Steps →
`userProfile.stepsTarget`; cardio → `userProfile.cardioPrescription`; calories
→ `nutrition_targets`; volume/deload → next week's planned volume.

---

## 5. Calorie / TDEE calculation - full map

`computeCalorieTargets` (`nutritionEngine.js:552+`):
`bmr` (Mifflin-St Jeor or Katch-McArdle) → `maintenanceKcal = bmr *
ACTIVITY_MULTIPLIERS[activityLevel]` (line 590) → `targetKcal = maintenance *
(1 + phaseAdj)` (line 602) → safety clamps (FFM floor, max deficit).
`ACTIVITY_MULTIPLIERS` (lines 19-25): sedentary 1.2, light 1.375, moderate
1.55, active 1.65, very_active 1.725 - **deliberately tuned down** for a
gym-only population (comment lines 12-18, cites Pontzer 2016 / Davy 2025).

`computeAdaptiveTDEEAdjustment` (lines 255-361): once ~4 weeks of weight data
exist, it back-calculates actual TDEE from `prescribedKcal` vs observed
EWMA weight change and nudges the maintenance estimate within a ±5% cap. This
is the energy-balance correction that **absorbs all activity, including
cardio**, into the maintenance figure.

**Implication (carried to Phase 5/6):** there is no place in this model for
"+250 kcal because you ran today" without double-counting against the adaptive
correction. A MET figure is therefore display/feedback only.

---

## 6. Onboarding flow - cardio-relevant capture

`ProOnboardingScreen.js` (~1529 lines, multi-step Pro setup): profile → training
→ recovery → plan + nutrition generation. Cardio-relevant captures:
`daysPerWeek` → `activityLevel` (line 471), `stepsTargetOn` default true
(line 231) writing `stepsTarget` (default 8000) + `stepsEnabled` (lines
499-500), and a one-sheet health permission request for steps+weight on a
steps opt-in (lines 519-524). **No cardio question exists.** The steps step
copy already foreshadows cardio (line 1247). Free users go through
`FirstRunScreen` (name only, no cardio).

Cross-ref: `volyume-onboarding-audit-2026-06-01/` proposes onboarding changes
(H5-H8, P6/P7) shipped 2026-06-02; none add cardio. A cardio opt-in is a net-new
onboarding step and must respect that audit's "short, no bloat" finding.

---

## 7. Plans tab - provision for non-lifting sessions

`PlansScreen.js` (1034 lines) and `PlanDetailScreen.js` (430 lines) model
lifting only: routines, days, exercises, mesocycle weeks. There is **no**
session-type concept, no cardio slot, no weekly non-lifting target block. A
cardio target today lives only on the coach card and the profile flag, never
in the plan view. Adding cardio to Plans is net-new and must stay invisible to
non-cardio users (CLAUDE design rule, "ship what's there or hide it").

`whyThisTemplates.js:333` has one cardio-aware copy line ("low-impact cardio
added after each session"), used by the coach narrative, not the plan.

---

## 8. Recovery data currently captured

- **Per session:** `soreness24hBefore`, `fatigueLevel`, per-set
  `jointDiscomfort` (read into `recoveryEMA.computeRecoveryEMAs`, lines 48-67).
- **EMA model:** 7-day half-life decay over soreness/fatigue/joint
  (`recoveryEMA.js:11,23-36`). Week-over-week % change drives the coach's
  recovery flag.
- **Check-in:** training performance verdict + joint pain (`WeeklyCheckInScreen`
  step 2).
- **Cardio's only recovery interaction today:** poor recovery pauses the cardio
  prescription (`weeklyCoach.js:737`). No cardio session contributes fatigue to
  the model. A cardio recovery-impact classification (HIIT vs LISS) has no input
  path yet - this is the recovery gap the proposal must fill.

---

## 9. What is logged at check-in (cardio-relevant)

`stepsAvg` (auto or manual), `cardioAdherence` (Did it/Mostly/Missed, only when
a prescription is applied), `stepsAdherence` (legacy null), plus weight,
nutrition adherence, training performance, joint pain, notes
(`WeeklyCheckInScreen.js:430-436, 503`). **No discrete cardio session log
exists at check-in or anywhere else.** Cardio compliance is a single weekly
3-way verdict, not a count of sessions completed vs a numeric target.

---

## 10. Cross-reference with existing audits

- **GAP_ANALYSIS.md** rows 4 / 176-177 / 460 / 515: confirms steps + cardio
  confirm-then-apply shipped 2026-05-28 (steps `6cd63cd`, cardio `7b2757a`);
  cardio adherence needed migration 050; wearable integration beyond
  weight/steps reads is explicitly out of scope.
- **BACKLOG.md** line 19 (wearable carve-out) and 137 (coach apply destinations)
  corroborate §1 and §5.
- **CURRENT_STATUS.md** records the removed cardio-steps audit and the
  steps-automatic-first decisions; none contradict the above.
- **volyume-coach-plan-audit-2026-06-01/**: the coach/plan engine reference; the
  cardio lever is part of `weeklyCoach`, in scope of that audit but not expanded
  there. No conflicting cardio decision found.

**Net:** the foundations a cardio integration needs already exist in skeleton
(coach target slot, apply contract, adherence read-back, a per-day activity
table to copy, a metadata-derivation discipline to copy). The gaps are: a
real activity library, user selection, per-session logging, a calorie figure
that does not double-count, availability beyond cuts, and a cardio recovery
signal. Phases 5-7 design these.
