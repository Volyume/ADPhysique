# AUDIT F — Weekly check-in, weekly coach, precedence/coordination, Apply/Decline

Capability Campaign 25 (CC25), Wave 1. Evidence report. **No product or
architecture decisions are made here.** Every claim carries file:line as
OBSERVED in the working tree at the time of the audit.

---

## 1 SCOPE / METHOD

### 1.1 Scope as briefed

- The weekly check-in: every question (exact wording), value domains, storage,
  and which engine input each answer becomes.
- `runWeeklyCoach` end-to-end: inputs, limiter classification, the intervention
  ladder, per-muscle vs global decisions, exercise-level vs volume-level.
- Cross-domain coordination (`coachPrecedence.js` — the real module name),
  ordering/suppression, anti-causal-claim constraints.
- `coach_outputs` persistence, explanation generation, Apply/Decline and
  exactly what each writes.
- Restraint machinery (weak-evidence holds, caps, revert memory, suppression,
  deload/recovery gating of adds).
- ED-safety integration points in the coach path (mapped factually only).
- Check-in / coach state persisted between weeks.

### 1.2 Method

1. `grep` for exported symbols in each candidate module to enumerate the
   surface, then `Read` of the **full body** of every function whose behaviour
   is asserted below. Thresholds are copied from the literal source.
2. Production callers were established by `grep` over `src/screens`,
   `src/lib`, `src/store` — never from a doc comment claiming a caller. Where
   no production caller was found, the symbol is marked NO PRODUCTION CALLER
   with the grep evidence.
3. Campaign 21's `GRAPH-TRAINING.md` / `GRAPH-NUTRITION-SAFETY.md` /
   `ORACLE-LOCK.md` were read for the rules in this domain and treated as
   MAPS. Every line reference cited by those docs for a file in this domain
   was re-resolved against live code; drift is recorded in §11.

### 1.3 Files opened in full

- `src/lib/weeklyCoach.js` (2,613 lines — full)
- `src/lib/coachPrecedence.js` (476 — full)
- `src/lib/coachContext.js` (429 — full)
- `src/lib/coachApply.js` (340 — full)
- `src/lib/coachDecline.js` (202 — full)
- `src/lib/coachStory.js` (322 — full)
- `src/lib/coachIntervention.js` (618 — full)
- `src/lib/checkinDerive.js` (155 — full)
- `src/lib/coachApplyView.js` (86 — full), `src/lib/coachOutputZones.js` (35 — full)

### 1.4 Files opened in load-bearing part

- `src/screens/WeeklyCheckInScreen.js` (2,254 — step renderers, auto-derive,
  submit)
- `src/screens/CoachOutputScreen.js` (3,781 — load/derive block, the
  `runWeeklyCoach` call, all apply/decline handlers, autonomy effect, cards)
- `src/lib/database.js` (schema block, `saveWeeklyCheckin`, `saveCoachOutput`,
  `preserveAppliedAdjustments`, `insertCoachOutputFromCloud`,
  `getWeeklySessionStats`, `getRecentCheckins`)
- `src/lib/algorithms.js` (`computeSessionAdjustments`,
  `buildSessionAdjustmentInput`)
- `src/lib/programmeEpoch.js` (`slotVerdict`), `src/lib/blockReview.js`,
  `src/lib/blockAdvisor.js` (`evidenceFor`), `src/lib/planAutoGen.js`
  (`buildSlotEvidence`)
- `src/lib/livePrescription.js` (`adjustStronger`, packet `senior` block)
- `src/lib/coachResponse.js`, `coachRegister.js`, `coachOutcome.js`,
  `whyThisTemplates.js` (export surfaces + decision/why paths)
- `src/lib/sync.js` (`_pushCoachOutputs`, coach_outputs pull),
  `src/lib/sync/tables/weeklyCheckins.js`

### 1.5 Method limitation (recorded, not worked around)

The repository is a **shallow clone** (`.git/shallow` present; `git log` shows
59 commits, oldest `c8021cd` 2026-08-17). History before that boundary is not
available, so drift between the Campaign 21 docs (2026-08-16) and live code
**cannot be attributed to a commit** from this clone. §11 records the drift as
an observed line-reference mismatch only, with no causal claim.

---

## 2 CURRENT BEHAVIOUR

### 2.1 The loop, as wired

```
WeeklyCheckInScreen ──save──▶ weekly_checkins (SQLite)
                                     │
CoachOutputScreen.load() ────────────┤ reads checkin + 13 other sources
        │                            ▼
        └─▶ runWeeklyCoach(inputs)  [pure, one clock read]
                 │
                 ├─ buildCoachContext ──▶ facts (GOOD/POOR/UNKNOWN + provenance)
                 ├─ classifyLimiters   ──▶ {nutrition, training} limiter
                 ├─ autoregulationMatrix ▶ volumeSignal, trainingSignal, deloadFlag
                 ├─ 8 sequential HOLD gates over the calorie proposal
                 ├─ coordinateChanges  ──▶ withhold-only cross-domain gate
                 └─ output object (~60 fields)
                          │
        ┌─────────────────┼───────────────────────────┐
        ▼                 ▼                           ▼
   saveCoachOutput   buildCoachStory (copy)    Apply / Decline handlers
   (coach_outputs)   coachResponse (5-part)    (write real targets/volume,
                                                then re-save output_json)
```

### 2.2 Three early-return paths exist before any decision

| Path | Condition | Line |
|---|---|---|
| data hold | `assessDataConfidence(...).level === 'data_hold'` (distinct weigh-in **days** < 3, or unusual-event flagged with < 5) | `weeklyCoach.js:872` |
| baseline | `!hasEnoughData` (`weeksInPhase < 2` OR `< 4` weigh-in rows) | `weeklyCoach.js:1180` |
| adherence | `sessionsCompleted / sessionsPlanned < 0.5` | `weeklyCoach.js:1187` |

All three return `training.signal = 'hold'`, `calories: null`, `steps: null`,
`volumeSignal: 0` (`weeklyCoach.js:900-903`, `:2547-2552`, `:2596-2601`) and
`autoApplyHoldActive: false` (`:914`, `:2564`, `:2611`).

### 2.3 What the coach can decide, in one week

Exactly four applyable keys reach the UI: `calories`, `training` (a single
scalar volume delta), `deload`, `dietBreak`. Plus `steps`, which is dead in
production (`CoachOutputScreen.js:1889-1890` passes
`currentStepsTarget: 0, stepsEnabled: false`; the engine's own note at
`weeklyCoach.js:747-758` states every step branch is unreachable in the
shipped app).

### 2.4 The whole training decision is ONE global integer

`volumeSignal` ∈ `[-2 … +3]` from `autoregulationMatrix`
(`weeklyCoach.js:398-417`). It is not per-muscle, not per-exercise, and it is
applied by `computeVolumeApply` **uniformly to every trained muscle row** for
the target week (`coachApply.js:269-299`), clamped per muscle only by that
muscle's own `[mev, mrv]`. There is no mechanism in the weekly coach for
"add to legs, hold shoulders".

---

## 3 FILES & FUNCTIONS

### 3.1 Engine core

| File | Symbol | Line | Role |
|---|---|---|---|
| `weeklyCoach.js` | `runWeeklyCoach` | 619 | the whole weekly decision |
| | `assessDataConfidence` | 213 | high/medium/low/data_hold |
| | `corroborateConfidenceLevel` | 288 | bounded +1 photo step (D99) |
| | `getRecoveryScore` | 306 | energy/soreness/stress → 1-4 |
| | `getPerformanceScore` | 342 | adherence/PR density/slope → 1-4 |
| | `contextAdjustedRecovery` | 371 | peak-week softening (push branch only) |
| | `autoregulationMatrix` | 398 | (recovery × performance) → volumeDelta |
| | `phaseConfig` / `PHASE_CONFIG` | 456 / 427 | goal rate per phase |
| | `WHY_LIBRARY` / `pickWhy` | 481 / 533 | user-facing WHY strings |
| | `parseNoteFlags` | 547 | free-text → travel/illness/injury/menstrual |
| | `mapCalsAdherence` | 568 | stored answer → engine vocabulary |
| | `computeEWMA`, `computeWeeklyTrendPct`, `weeklyComparatorMs`, `elapsedWeeksSinceComparator`, `weeklyComparatorFresh`, `getEwmaSevenDaysAgo` | 57, 104, 134, 160, 173, 190 | trend maths |
| `coachContext.js` | `buildCoachContext` | 378 | the one fact set |
| | `trainingExecutionFact` | 133 | sessions done/planned → signal |
| | `trainingProgressFact` | 155 | block slope or PR count → signal |
| | `systemicRecoveryFact` | 187 | check-in energy/soreness → signal + `scope` |
| | `intakeCoverageFact` / `intakeAdherenceFact` / `proteinAdherenceFact` | 219 / 244 / 277 | diary facts |
| | `weightTrendFact` | 314 | rate + onTarget → signal |
| | `intentFacts` | 349 | user choices (not a signal) |
| | `contextFacts` | 418 | flattened, for receipts |
| `coachPrecedence.js` | `LIMITER` | 40 | PLAN / EXECUTION / RECOVERY / INSUFFICIENT_EVIDENCE |
| | `INTERVENTION` / `LADDER` | 61 / 71 | the ladder |
| | `classifyNutritionLimiter` | 117 | |
| | `classifyTrainingLimiter` | 189 | |
| | `classifyLimiters` | 213 | both |
| | `nutritionQualifier` | 231 | may we mention food in a training explanation |
| | `chooseInterventions` | 264 | which rung each domain may reach |
| | `coordinateChanges` | 380 | **the only gate with decision force** |
| | `conflictOutcome` | 440 | **NO PRODUCTION CALLER** (§5.3) |
| `coachApply.js` | `computeCalorieTargets` | 68 | floors re-enforced here |
| | `computeDietBreakTargets` | 101 | |
| | `computeDeloadVolume` | 175 | per-muscle strain-scaled cut |
| | `computeVolumeApply` | 269 | global delta, per-muscle clamp |
| | `computeWeeklySessionAllocation` | 324 | week volume → session set counts |
| | `markApplied` / `markDeclined` / `isApplied` / `isDeclined` | 210 / 232 / 249 / 240 | |
| | `kcalFloorForSex` | 38 | delegates to `nutritionEngine` |
| `coachIntervention.js` | `INTERVENTION_KIND` / `OUTCOME` / `OBSERVE` | 45 / 58 / 93 | |
| | `buildInterventionRecord` | 156 | written at apply |
| | `interventionsFromHistory` | 201 | read at load |
| | `observationWindowMet` | 229 | 2 weeks (cal), 2 weeks (volume) |
| | `classifyOutcome` | 256 | confound-first |
| | `wouldReverseRecent` | 398 | anti-oscillation |
| | `doseEscalation` | 439 | ×1.5, heavily gated |
| | `volumeDecisionMemory` | 515 | training-side memory |
| | `holdReinforcement` | 565 | "it worked, leave it alone" |
| `coachDecline.js` | `evidenceSignature` | 47 | coarse week shape |
| | `buildDeclineRecord` | 70 | |
| | `declinesFromHistory` | 88 | |
| | `materialEvidenceChange` | 113 | when a decline stops binding |
| | `suppressedByDecline` | 153 | |
| | `returningCopy` / `heldByDeclineCopy` | 172 / 196 | |
| `coachStory.js` | `whatHappened` / `whatItMeans` / `whatIsChanging` / `whatStaysTheSame` / `whatWeWatchNext` / `buildCoachStory` / `storyLines` | 56 / 92 / 168 / 202 / 244 / 289 / 316 | the 5-part account |
| | `BANNED_TERMS` / `HOLD_COPY` | 37 / 231 | |
| `checkinDerive.js` | `deriveTrainingPerformance` | 74 | pre-fills the step-3 chip |
| | `deriveCalsAdherence` | 118 | pre-fills the calorie chip |
| | `stripAutoNotes` | 132 | reverses the notes append |
| | `PERF_VERDICT_TEXT` | 150 | |

### 3.2 Screens

| File | Symbol | Line |
|---|---|---|
| `CoachOutputScreen.js` | `runWeeklyCoach({...})` call | 1834 |
| | `handleApplyCalories` | 1110 |
| | `handleDeclineCalories` | 1239 |
| | `handleApplyTraining` | 1270 |
| | `handleApplyDeload` | 1342 |
| | `handleApplyDietBreak` | 1397 |
| | Coached-mode auto-apply effect | 2236-2282 |
| | `buildCoachStory({...})` | 2374 |
| | between-week counters | 1604-1730 |
| `WeeklyCheckInScreen.js` | `renderStep0` … `renderStep3` | 946, 1001, 1152, 1235 |
| | Fast Check-In | 1300+ |
| | `handleSubmit` save | 770-830 |
| | auto-derive block | 455-520 |

---

## 4 TABLES & FIELDS

### 4.1 `weekly_checkins` (local; cloud `weekly_checkins_v2`)

Base create: `database.js:566-580`. Additive columns: `:602-603`
(`training_performance`, `joint_pain`), `:615` (`sore_muscles`), `:632`
(`sleep_quality`), `:786-787` (`updated_at`, `deleted_at`), `:1243`
(`cardio_adherence`), `:1359` (`steps_avg`).

| Column | Type | Written by | Reaches the engine as |
|---|---|---|---|
| `week_start` | INTEGER | check-in | week seed, counter adjacency |
| `energy_score` | INTEGER 1-5 | check-in step 0 | `energyScore` |
| `soreness_score` | INTEGER 1-5 | check-in step 2 | `sorenessScore` |
| `stress_score` | INTEGER 1-5 | check-in step 0 | `stressScore` |
| `sleep_hours` | REAL 0-24 | check-in step 0 | `sleepHours` (deload trigger only) |
| `cals_adherence` | TEXT `yes`/`no`/`untracked` | check-in step 1 | mapped → `hit`/`under`/`over`/`no`/`untracked` |
| `steps_adherence` | TEXT | legacy only | `stepsAdherence` (copy only) |
| `steps_avg` | INTEGER | **always written `null`** (`WeeklyCheckInScreen.js:799`) | `stepsAvg` |
| `cardio_adherence` | TEXT | never written now (deliberately omitted, `:801-804`) | not read |
| `cycle_override` | INTEGER tri-state | check-in step 1 (only when opted in) | `cycleOverride` |
| `training_performance` | TEXT | check-in step 3 | `trainingPerformance` |
| `joint_pain` | INTEGER tri-state | check-in step 2 | `checkin.jointPain` |
| `sore_muscles` | TEXT CSV of display names | check-in step 2 | **NOT read by `runWeeklyCoach`** (§5.4) |
| `notes` | TEXT ≤ 280 + auto-appended lines | check-in step 2 | `hasUnusualEvent`, `parseNoteFlags` |
| `sleep_quality` | INTEGER | **WorkoutSummaryScreen**, not the check-in | not read by the coach |

`saveWeeklyCheckin` (`database.js:7192-7241`) is a **preserving** write: a key
whose value is `undefined` leaves the stored column untouched; explicit `null`
clears it. This exists because `weekly_checkins` has two writers (the check-in
and the workout summary's sleep-quality write).

### 4.2 `coach_outputs`

Create: `database.js:582-597`. Additive: `:788-789` (`updated_at`,
`deleted_at`), `:1070` (`applied`). Unique index on `(user_id, week_start)`
added at v71 (`:2144`); legacy ids re-minted to `co_<week_start>_<user_id>` at
v72 (`:2147-2166`).

Columns: `id`, `user_id`, `week_start`, `goal_phase`, `volume_signal`,
`load_signal`, `recovery_flag`, `calorie_change`, `steps_target`,
`cardio_prescription` (dead), `why_this`, `output_json`, `applied`,
`created_at`, `updated_at`, `deleted_at`.

**All coach state that matters lives in `output_json`.** The scalar columns are
derived from it at every write (`saveCoachOutput`, `database.js:8042-8109`);
`applied` is derived from `appliedAdjustments` and never set independently
(`:8069-8073`, `:8100-8101`).

### 4.3 Persisted `output_json` keys used by a LATER week

| Key | Read next week by | Line |
|---|---|---|
| `trend.onTarget` | `consecutiveOffTargetWeeks` chain | `CoachOutputScreen.js:1685` |
| `consecutiveOffTargetWeeks` | itself, +1 | `:1686`, written `:2094` |
| `lastCalAdjustmentWeekStart` | `lastCalAdjustmentWeeksAgo` cooldown | `:1722-1725`, written `:2083-2085` |
| `adjustments.calories.change` | `lastCalAdjustmentDirection` | `:1712-1714` |
| `appliedAdjustments[*].intervention` | `interventionsFromHistory` → dose/oscillation/volume memory | `:1812` |
| `declinedAdjustments[*].decline` | `declinesFromHistory` → decline suppression | `:1816` |
| `weekStart` (row) | `getCoachOutputWeekStartsSince` → `evidencedWeeksInPhase` | `:1611-1613` |

`deloadSuggested` is also read historically via `getDeloadSuggestedWeekStarts`
(`database.js:5154`).

### 4.4 Cloud schema

`weekly_checkins_v2` columns enumerated at
`supabase/audit_cloud_schema_drift.sql:55-69`. `coach_outputs` RLS at
`migrate_007_pro_rls_hardening.sql:29,46-47,107-108`; stale-write trigger at
`migrate_134_stale_write_triggers.sql:177-202`; unique-week constraint at
`migrate_135_coach_outputs_week_unique.sql`.

---

## 5 READERS

### 5.1 What `runWeeklyCoach` actually reads from the check-in

Destructured / read at `weeklyCoach.js:922-937`:
`energyScore`, `sorenessScore`, `stressScore`, `calsAdherence`,
`stepsAdherence`, `stepsAvg`, `cycleOverride`, `sleepHours`; plus
`checkin.trainingPerformance` (`:1190`), `checkin.jointPain` (`:1236`),
`checkin.notes` (`:859` for `hasUnusualEvent`, `:1237` for `parseNoteFlags`),
`checkin.weekStart` (`:983` for the copy seed).

**`checkin.soreMuscles` is never read by the engine.** Verified by grep across
`src/`: the only non-test readers are `algorithms.js:1300`
(`buildSessionAdjustmentInput`) and `database.js:10102`.

### 5.2 Every consumer of the coach output

| Consumer | What it reads | Evidence |
|---|---|---|
| `CoachOutputScreen` cards | the whole object | `CoachOutputScreen.js` |
| `coachStory.buildCoachStory` | `context`, `limiters`, `changes` | `:2374` |
| `coachResponse` / `coachRegister` | `heldDecisions`, `adjustments`, `trend`, `whyThisWeek` | `coachResponse.js:214-236` |
| `coachOutcome` | `appliedAdjustments`, next week's `trend.onTarget` | `coachOutcome.js:32` |
| `coachIntervention.interventionsFromHistory` | `appliedAdjustments[*].intervention` | `coachIntervention.js:201` |
| `coachDecline.declinesFromHistory` | `declinedAdjustments[*].decline` | `coachDecline.js:88` |
| `algorithms.buildSessionAdjustmentInput` | `coachOutput.volumeSignal`, `coachOutput.safetyHold` | `algorithms.js:1329-1338` |
| `coachOutputZones` | `output.primary.domain` | `coachOutputZones.js:18` |
| telemetry | `heldDecisions.length`, `edPatternFired`, `ffmFloorHeld`, `rapidLossCorrectionApplied`, kcal delta | `CoachOutputScreen.js:2039-2075` |
| `coachReport` (PDF handover) | persisted decisions + reasons | `coachReport.js:247` |

### 5.3 Emitted-but-unread

- `conflictOutcome` (`coachPrecedence.js:440`) — grep across `src/` finds no
  caller outside `coachPrecedence.js` itself and `coachPrecedence.test.js`.
  **NO PRODUCTION CALLER.**
- `coordination.bothIndependentlyJustified` (`weeklyCoach.js:2495`) — grep
  finds no reader.
- `chooseInterventions` reaches production **only** through
  `coachStory.whatStaysTheSame` (`coachStory.js:221`, copy) and inside
  `coordinateChanges` (`coachPrecedence.js:384`), where only `plan.both` is
  used (`:426`). Its `nutrition`/`training`/`smallest` rungs therefore have no
  decision force.
- `INTERVENTION.PRESCRIPTION`, `.EXERCISE`, `.STRUCTURE` — never consumed by
  any writer. `OBSERVE` entries exist for `PRESCRIPTION`,
  `EXERCISE_REPLACEMENT`, `STRUCTURE` (`coachIntervention.js:107-118`) but grep
  shows `buildInterventionRecord` is only ever called with
  `INTERVENTION_KIND.CALORIE_TARGET` (`CoachOutputScreen.js:1174`) and
  `INTERVENTION_KIND.VOLUME_START` (`:1298`).

### 5.4 The one per-muscle reader in the whole domain

`algorithms.buildSessionAdjustmentInput` (`algorithms.js:1299-1305`) splits the
`soreMuscles` CSV through `CHECKIN_MUSCLE_MAP` into engine muscle keys and sets
`muscleSignals[m].checkinSore`. `computeSessionAdjustments`
(`algorithms.js:1082`) then makes at most a ±1 set change **per muscle** for
**this session only**, on the first exercise encountered for that muscle
(`:1103-1113`). It never writes the plan (`:1049-1054`).

---

## 6 WRITERS

### 6.1 Apply — calories (`CoachOutputScreen.js:1110-1231`)

Ordered writes:

1. Re-read `getNutritionTargets` at tap time (`:1117`) — never a stale snapshot.
2. Read sex from body profile, falling back to `userProfile` (`:1122-1123`) —
   sex selects the ED floor.
3. `classifyCalorieApply` + `computeCalorieTargets` (`:1128-1129`).
   **Floor re-enforced here**: `Math.max(kcalFloorForSex(sex), current + change)`
   (`coachApply.js:71`), which delegates to `nutritionEngine.kcalFloorForSex`
   (`coachApply.js:38-40`; unknown sex takes the HIGHER 1,500 floor,
   `:34-37`).
4. Consent re-check: if the freshly computed `newKcal` differs from the
   preview the athlete was shown, refresh and require a second tap (`:1157-1163`).
5. `saveNutritionTargets` + AsyncStorage mirror (`:1165-1168`).
6. `appliedChange = computed.newKcal - current.targetKcal` — **the landed
   change, not the requested one** (`:1174`).
7. `markApplied(output,'calories', {newKcal, clampedToFloor?, intervention})`
   (`:1170-1192`). The intervention record carries `direction`, `magnitude`,
   `appliedValue`, `because` (the limiter's reason code), `authorisedBy` (the
   context fact keys that were GOOD), `heldConstant`, `baseline`
   (`weight.trend.value`), `goalPhase`, `maintenanceAuthority`.
8. `saveCoachOutput` (`:1193`).
9. Best-effort meal-plan pull-through `applyCoachAdjustmentToActivePlan`
   (`:1211-1215`) with `minimumKcal: check.floorKcal`.

### 6.2 Apply — training volume (`:1270-1334`)

`delta = output.volumeSignal`; refused when `delta === 0`, when there is no
`nextTrainingWeekId`, or when `delta > 0 && nextWeekIsDeload` (`:1274-1277`).
Then `computeVolumeApply(rows, delta)` and one
`upsertPlannedMuscleVolume(..., source:'coach')` **per changed muscle**
(`:1283-1291`). Record baselines are BOTH `training.progress` and
`recovery.systemic` (`:1315-1318`).

### 6.3 Apply — deload (`:1342-1388`)

`setMesocycleWeekDeload(nextTrainingWeekId)`, then `computeDeloadVolume` rows
written. `markApplied(output,'deload', {weekId, musclesChanged, sharePct})` —
**no intervention record** (`:1373-1378`).

### 6.4 Apply — diet break (`:1397-1465`)

`computeDietBreakTargets` → `saveNutritionTargets`. Requires a second tap when
the maintenance estimate moved since the preview (`:1435-1445`).
`markApplied(output,'dietBreak', {newKcal, maintenanceAuthority})` — **no
intervention record** (`:1451-1454`).

### 6.5 Decline

**Only calories can be declined.** `handleDeclineCalories`
(`:1239-1262`) writes `markDeclined(output,'calories', {decline:
buildDeclineRecord({domain:'nutrition', kind:'calorie_target', direction,
magnitude, signature: output.evidenceSignature, declinedAtMs})})`, then
`saveCoachOutput`. **It writes nothing else** — no target change, no
suppression flag outside the output blob.

`TrainingNextWeekCard` (`:363-503`) has no `onDecline` prop; `AdjustmentRow`
supports one (`:216`, `:272-280`) but only `NextWeekCard`'s calorie row passes
it (`:343`). Deload and diet break have no decline control either.

### 6.6 Coached-mode auto-apply

`CoachOutputScreen.js:2236-2282`. When `coachAutonomy === 'coached'`, the
effect walks deload → training → calories → dietBreak, calling the same
handlers. It returns early when `output.autoApplyHoldActive` is true (`:2240`)
and when the output is more than 7 days old (`:2250-2254`).

### 6.7 Persistence merge rules

- `saveCoachOutput` runs `preserveAppliedAdjustments` before an UPDATE
  (`database.js:8052`, pure fn at `:8025-8040`) so a routine same-week
  recompute cannot erase `appliedAdjustments` **or** `declinedAdjustments`.
- `insertCoachOutputFromCloud` (`database.js:8645-8737`) is last-write-wins
  with an **applied-receipt ratchet**: a newer cloud row carrying no
  `appliedAdjustments` never clears a local receipt (`:8674-8683`).
- The on-load save is gated on `weekWasCheckedIn` (`CoachOutputScreen.js:2101`)
  so merely opening the screen no longer manufactures a stored decision.

---

## 7 CURRENT INVARIANTS

### 7.1 The four limiters, as implemented

`coachPrecedence.js:40-45`. Read in this exact order.

**Nutrition** (`classifyNutritionLimiter`, `:117-159`):

| # | Condition | Result |
|---|---|---|
| 1 | `weight.trend` missing or `UNKNOWN` | `INSUFFICIENT_EVIDENCE` / `weight_trend_unknown` |
| 2 | `weight.trend.signal === GOOD` | `PLAN` / `on_target`, `onTarget:true` |
| 3 | `nutrition.intake` missing or `UNKNOWN` | `INSUFFICIENT_EVIDENCE` / `intake_coverage_unknown` \| `intake_unknown` |
| 4 | `intake POOR` **and** `sign(intake.direction) !== sign(weight.shortfall)` (both non-zero) | `EXECUTION` / `target_not_eaten` |
| 5 | `intake POOR` otherwise | `PLAN` / `off_target_despite_miss` |
| 6 | else | `PLAN` / `off_target_on_adherence` |

`shortfall` is supplied by the caller as `-offTargetDirection`
(`weeklyCoach.js:1379`).

**Training** (`classifyTrainingLimiter`, `:189-210`):

| # | Condition | Result |
|---|---|---|
| 1 | `training.execution` missing or `UNKNOWN` | `INSUFFICIENT_EVIDENCE` / `execution_unknown` |
| 2 | `execution POOR` | `EXECUTION` / `sessions_missed` |
| 3 | `recovery.systemic POOR` | `RECOVERY` / `recovery_poor`, `scope:'systemic'` |
| 4 | `training.progress` missing or `UNKNOWN` | `INSUFFICIENT_EVIDENCE` / `progress_unknown` |
| 5 | `progress POOR` | `PLAN` / `not_progressing_on_a_run_programme` |
| 6 | else | `PLAN` / `progressing`, `progressing:true` |

Nutrition appears nowhere in the training classifier — stated as deliberate at
`:185-187`.

### 7.2 Signal thresholds (`coachContext.js:83-98`)

`TRAINING_EXECUTION_GOOD = 0.8`; `TRAINING_EXECUTION_POOR = 0.6`;
`MIN_PLANNED_SESSIONS = 2`; `MIN_INTAKE_DAYS = 5`;
`INTAKE_ON_TARGET_FRACTION = 0.10`; `MIN_WEIGH_INS = 4`;
`CHECKIN_FRESH_DAYS = 14`.

The 0.6-0.8 band maps to **GOOD**, not POOR, with the stated reason "the middle
band is imperfect, not poor: it still tested the plan" (`:140-142`).

`trainingProgressFact` (`:155-173`): returns UNKNOWN when execution is UNKNOWN
or POOR; otherwise `slope > 0 ? GOOD : POOR` — **slope exactly 0 is POOR**
(`:164`); with no slope it falls back to `prs > 0 ? GOOD : UNKNOWN`.

`systemicRecoveryFact` (`:187-208`): POOR when `energy <= 2 || soreness >= 4`;
UNKNOWN when there is no check-in, the check-in is > 14 days old, or both
scores are null.

### 7.3 The ladder — VERIFIED against code

`coachPrecedence.js:61-79`. Order as declared in `LADDER`:

```
NONE  <  EXPLAIN  <  PRESCRIPTION  <  EXERCISE  <  VOLUME  <  NUTRITION_TARGET  <  STRUCTURE
```

This **matches the brief exactly**. The header (`:47-59`) records that safety
holds and explicit user intent sit outside and above the ladder.

`chooseInterventions` (`:264-317`) maps limiters to rungs:

| Domain | Limiter | Rung allowed |
|---|---|---|
| nutrition | `PLAN` + `onTarget === false` | `NUTRITION_TARGET` |
| nutrition | `EXECUTION` | `EXPLAIN` (+hold `target_not_eaten`) |
| nutrition | `INSUFFICIENT_EVIDENCE` | `NONE` (+hold) |
| nutrition | on target | `NONE` |
| training | `EXECUTION` | `EXPLAIN` (+hold `sessions_missed`) |
| training | `RECOVERY` | `VOLUME` |
| training | `INSUFFICIENT_EVIDENCE` | `NONE` (+hold) |
| training | `PLAN` + progressing | `NONE` |
| training | `PLAN` + not progressing | `EXERCISE` |

**Caveat (§5.3): none of these rungs drives a decision.** The engine's real
training decision is the autoregulation matrix; the `EXERCISE` rung's only
effect is the story line at `coachStory.js:129-130`.

### 7.4 The coordination gate — the only cross-domain rule with force

`coordinateChanges` (`coachPrecedence.js:380-427`), called at
`weeklyCoach.js:1775-1783` with the engines' **real** proposals.

- Header states it **can only withhold** (`:339-341`).
- `volumeIsRestraint = volumeChange < 0` — a reduction is never a
  coordination question (`:391`).
- `safety.calorie` is passed `!!rapidLossOverride` (`weeklyCoach.js:1782`) and
  exempts the calorie change from R1 and R3.

| Rule | Condition | Effect |
|---|---|---|
| R1 | calorie change, not safety, nutrition limiter `EXECUTION` | withhold calories, hold `target_not_eaten` (`:396-401`) |
| R2 | volume ADD, training limiter `EXECUTION` | withhold volume, `sessions_missed` (`:405-407`) |
| R2 | volume ADD, training limiter `RECOVERY` | withhold volume, `recovery_calls_for_restraint` (`:408-411`) |
| R3 | both survived, volume is an add, training `INSUFFICIENT_EVIDENCE` | withhold **volume**, `one_change_at_a_time` (`:416-418`) |
| R3 | both survived, volume is an add, not safety, nutrition `INSUFFICIENT_EVIDENCE` | withhold **calories**, `one_change_at_a_time` (`:419-423`) |

### 7.5 Anti-causal-claim constraints

1. `conflictOutcome.neverClaim = ['nutrition_caused_training_outcome',
   'training_caused_weight_outcome']` (`coachPrecedence.js:474`) — but this
   function has NO PRODUCTION CALLER (§5.3), so it constrains nothing live.
2. `nutritionQualifier` (`:231-240`) returns `'unknown'` unless coverage is
   GOOD and intake is known; `coachStory` renders `'unknown'` as **silence**
   rather than a hedge (`coachStory.js:133-138`).
3. Where food may be mentioned beside a training stall, it is worded as
   co-observation: *"Worth knowing alongside, though not something we can call
   the reason."* (`coachStory.js:143-147`).
4. `coachStory.js:22-27` states the module never joins two domains with a
   "because".
5. `BANNED_TERMS` (`coachStory.js:37-41`) is checkable vocabulary, not causality.
6. **Materiality gating on provenance claims.** The safety-hold note is only
   attributed to the free-text note when the flag actually changed the outcome
   (`weeklyCoach.js:1245-1247`, `holdChangedDecision`); the stress note is only
   emitted when a counterfactual re-run shows the matrix would have landed
   elsewhere (`:1214-1226`).
7. `outcomeCopy` "States the observation and stops. Never says the change
   CAUSED the result" (`coachIntervention.js:592-596`).

### 7.6 Restraint machinery — the eight sequential holds on a calorie proposal

In execution order inside `runWeeklyCoach`:

| # | Gate | Line | Can it hold an increase? | Safety-exempt? |
|---|---|---|---|---|
| 0 | `canAdjustCals` (cycle, SCOFF, target exists, adherence known **or** diary stands in, off-target counter ≥ 2 or 3, 2-week cooldown) | 1410-1424 | yes | `rapidLossOverride` bypasses the counter + cooldown |
| 1 | `targetNotTestedHeld` (nutrition limiter `EXECUTION`) | 1640-1648 | yes | yes (`!rapidLossOverride`) |
| 2 | `declineHeld` (same kind, same direction, unmoved signature) | 1663-1676 | yes | yes |
| 3 | `oscillationHeld` (`wouldReverseRecent`) | 1692-1697 | yes | yes |
| 4 | `ffmFloorHeld` (7-day intake ≤ FFM floor) | 1709-1751 | **cuts only** | not exempt — this IS safety |
| 5 | `intakeReadHeld` (diary read threw) | 1755-1758 | **cuts only** | not exempt |
| 6 | `coordinationCalorieHeld` (R1/R3) | 1775-1792 | yes | R1/R3 exempt safety |
| 7 | `edPatternHeld` (open or just-fired ED flag) | 1964-1968 | **cuts only** | not exempt |

Additional caps: `±5%` of the current target (`:1592-1595`); the rapid-loss
boost is itself capped at `+300` (`:1512-1517`).

Training-side restraint:

- `volumeMemory.holdIncrease` takes a proposed increase to 0 (`:1402-1407`);
  never touches a reduction (`coachIntervention.js:525`).
- `volumeMemory.blockEscalation` refuses the discretionary D15 step
  (`weeklyCoach.js:2168`).
- Revert memory in the SESSION layer: two `session_adjustment_reverted` events
  for a muscle within the caller's 6-week window suppress that muscle
  (`algorithms.js:1170-1172`, window documented `:1116-1124`).
- Same-week add cap in the SESSION layer: `addedThisWeek`
  (`algorithms.js:1127-1138`, consumed `:1204`).

### 7.7 Deload / recovery gating of adds — the 2026-08-16 ruling

Ruling text, verbatim (`docs/live-prescription-campaign-20-2026-08-16/FOUNDER-RULINGS-2026-08-16.md:15-17`):

> "Overshoot only. No mid-session load ADD during deload/recovery, re-entry
> easing or an active readiness reduction. Those are senior."

**Implementation:** `livePrescription.js:372-378` —

```js
const seniorBlocks = !!(senior.isDeload || senior.blockFinished
  || senior.reEntryEaseActive || senior.readinessReductionActive);
if (seniorBlocks) return { changed: false };
```

`senior.reEntryEaseActive` / `readinessReductionActive` are packet fields with
derived fallbacks (`livePrescription.js:570-573`, `:595-597`).

Sibling gates, all separate implementations of the same idea:

- `computeSessionAdjustments` returns `[]` outright on a deload week
  (`algorithms.js:1092-1093`).
- `handleApplyTraining` refuses an upward apply into a deload week
  (`CoachOutputScreen.js:1277`), and the card labels it as a hold
  (`:387-397`).
- `exceededEscalationEligible` requires `!deloadSuggested && !matrixDeload &&
  !poorRecovery && !safetyHold && …` (`weeklyCoach.js:2150-2172`).

### 7.8 ED-safety integration points in the coach path (map only)

| Point | Line | Behaviour |
|---|---|---|
| FFM energy floor gate | `weeklyCoach.js:1709-1751` | computes floor from the run's ONE resolved safety weight (`:1017-1021`); wipes a cut when 7-day intake ≤ floor; requires ≥ 5 logged days |
| Intake-read-failed hold | `:1755-1758` | a failed diary read holds any cut rather than proceeding floor-blind |
| Rapid-loss override | `:1308-1314` | `phase.isCut && !cycleOverride && actualRatePct <= -1.5 && energyScore <= 2` |
| Rapid-loss flag | `:1856-1861` | same predicate, `<=` so flag and correction agree at the boundary |
| ED-pattern detect/clear | `:1935-1955` | `detectEdPatternFlag` / `hasEdPatternCleared`; screen persists the transition (`CoachOutputScreen.js:1979-2005`) |
| ED lockout | `:1964-1974` | wipes a downward calorie change, pushes `ed_pattern_lockout` to the top of `heldDecisions` |
| SCOFF (`scoffPositive`) | `:1410-1412`, `:2090` | fail-closed at the caller: `userProfile == null || scoffScore >= 2` (`CoachOutputScreen.js:1897`) |
| Calm mode | `:2158`, `:2126`, `:2364` | gates the D15 escalation, `autoApplyHoldActive`, photo corroboration |
| `autoApplyHoldActive` | `:2118-2128` | the ONE emitted "a hold is open" flag; nine constituents |
| `photoCorroborationBlocked` | `:2359-2366` | six constituents; suppresses the bounded confidence step |
| Calorie floors at Apply | `coachApply.js:38-40`, `:71` | 1,500 male / 1,200 female / **1,500 unknown** |
| Notification cancel on flag raise | `CoachOutputScreen.js:1988` | `cancelMorningNotification()` immediately |

`autoApplyHoldActive` constituents (`:2119-2127`): `deloadSuggested`,
`matrixDeload`, `poorRecovery`, `safetyHold`, `ffmFloorHeld`, `edPatternHeld`,
`rapidWeightLossFlag`, `scoffPositive`, `calmMode`.

### 7.9 The safety cap (`weeklyCoach.js:1236-1264`)

```js
const jointPainFlagged = !!(checkin?.jointPain);
const noteFlags = parseNoteFlags(checkin?.notes);
const safetyHold = jointPainFlagged || noteFlags.injury || noteFlags.illness;
if (safetyHold && trainingSignal !== 'reduce') {
  if (volumeSignal > 0) volumeSignal = 0;
  if (trainingSignal === 'push') trainingSignal = 'hold';
}
```

Observed properties: it caps an increase; it never converts a planned reduce or
deload into a progress; it is **whole-plan**, not per-muscle or per-exercise.
Its user-facing note when joint pain is the source
(`:1254`): *"You flagged joint pain, so the plan holds rather than adding work.
Ease the load on the sore movement or swap it for a pain-free variation."* —
i.e. the app instructs the athlete to do the per-exercise work itself.

---

## 8 CURRENT TESTS

### 8.1 Domain-specific suites

| File | Lines | Pins |
|---|---|---|
| `src/lib/__tests__/weeklyCoach.test.js` | 517 | general engine behaviour |
| `weeklyCoach.d15ExceededEscalation.test.js` | 300 | the bounded one-step escalation and every gate on it |
| `weeklyCoach.d16AutonomyHold.test.js` | 262 | `autoApplyHoldActive` |
| `weeklyCoach.ffmFloor.test.js` | 233 | the FFM energy-floor hold |
| `weeklyCoach.stage4.fatigueContext.test.js` | 271 | peak-week softening, cause-gating |
| `weeklyCoach.signals.audit.test.js` | 129 | PIPE-001 stress, **PIPE-002 joint pain**, PIPE-003 note flags, ALGO-004 mapping |
| `weeklyCoach.evidencedClaims.test.js` | 176 | C6 P-2 evidence-bounded phase claims |
| `weeklyCoach.f10.test.js` | 152 | one-clock determinism |
| `weeklyCoach.stepTrend.test.js` | 110 | COMP-026 step modifier |
| `weeklyCoach.voice.snapshot.test.js` | 136 | copy register |
| `weeklyCoach.trendSparse.test.js` | 32 | sparse-trend behaviour |
| `weeklyCoach.identityRegister.guard.test.js` | 23 | source-level guard |
| `coachPrecedence.test.js` | 308 | the four classifications, ladder ranks, the ten-row conflict matrix, jobs 3/11/14/16 |
| `coachCoordination.test.js` | 212 | job C, **through `runWeeklyCoach`**, "a gate that agrees with itself proves nothing" |
| `coachCrossDomain.test.js` | 239 | job 4 cases A-F through the real engine + the rapid-loss exemption |
| `coachIntervention.test.js` | 360 | records, windows, outcomes, dose, oscillation |
| `coachStory.test.js` | 281 | traceability, banned terms |
| `coachAdversarial.test.js` | 317 | job 20, the ten hostile questions |
| `coachLearningLoop.test.js` / `coachTrainingLoop.test.js` | 354 / 244 | the learning loops |
| `coachCoherenceTrace.test.js` | 293 | cross-surface coherence |
| `coachLongitudinal.test.js` | 322 | multi-week |
| `coachOutputPersist.guard.test.js` | 71 | `preserveAppliedAdjustments` merge |
| `upwardGateCompression.test.js` | — | Move #3 rapid-loss compression |
| `progressScanSafetyFloorIsolation.test.js` | — | the D18/D99 bounded-delta isolation guard |

### 8.2 Campaign 21 validation harness

`src/__tests__/coachValidation/` — 12,330 lines total.
`harness.js` (687) imports the **real** production functions
(`harness.js:28-80`) and mocks only IO boundaries. `ledger.json` (3,616) is the
rule ledger; `ledger.coverage.test.js` (102) enforces coverage.
`restraint.test.js` (130) names **34 restraint scenarios**, of which these fall
in this domain: NUT-46, NUT-47, NUT-48, NUT-54, NUT-55, NUT-56, NUT-58,
TRN-06, TRN-51, REC-13, REC-14, LSO-14 (`restraint.test.js:17-54`).
Scenario data: `scenarios.conflict.data.js` (719),
`scenarios.nutrition.data.js` (1,521), `scenarios.training.data.js` (1,440),
`scenarios.recovery.data.js` (446), `scenarios.liveset.data.js` (837).

### 8.3 Screen-level guards

`CoachOutputScreen.d15ExceededEscalation.guard.test.js`,
`CoachOutputScreen.morningWeightsSource.guard.test.js`,
`CoachOutputScreen.offTargetCounter.guard.test.js`,
`CoachOutputScreen.photoCorroborationCaption.test.js`,
`CoachOutputScreen.progressScanAssessment.test.js`,
`progressScanCoachIsolation.guard.test.js`.

### 8.4 Test coverage gap observed

No test in this domain asserts anything about a **per-muscle or per-exercise
physical restriction**, because no such input exists. `soreMuscles` appears in
tests only as a fixture field set to `null`
(`weeklyCoach.test.js:67`, `upwardGateCompression.test.js:55`,
`campaign4.boundaries.test.js:40`, `weeklyCoach.evidencedClaims.test.js:39`) —
never as a value under test in the weekly engine. It IS under test in
`sessionAdjustments.test.js:358,388`.

---

## 9 REUSABLE INFRASTRUCTURE

Listed as observed facts about what already exists, with no recommendation as
to whether it should be used.

1. **A fact type with provenance.** `fact(signal, {value, coverage, source,
   detail})` (`coachContext.js:115-117`) with three-valued `SIGNAL` and a nine-
   member `SOURCE` enum (`:53-73`). `unknown(source, detail)` (`:120-122`) makes
   "we do not know, and here is why" a first-class value. `contextFacts`
   (`:418-429`) flattens the set for receipts.

2. **A scope field already exists on a fact.** `systemicRecoveryFact` returns
   `scope: 'systemic'` (`coachContext.js:197`, `:206`) precisely so a
   muscle-scoped reading could coexist without the two contradicting each
   other. The header (`:181-185`) states this explicitly. No other fact carries
   a scope today.

3. **An intent channel that is deliberately NOT a signal.** `intentFacts`
   (`coachContext.js:349-365`) already carries `manualVolumeMuscles`,
   `excludedExerciseIds`, `excludedFoodKeys`, `pinnedMealIds` — user
   instructions that outrank inference, with the documented rule that a
   RELEASED choice is absent rather than remembered (`:344-347`).

4. **A withhold-only coordination gate** whose contract is "it can only ever
   withhold" (`coachPrecedence.js:339-341`) and which already accepts a
   `safety` argument that outranks it (`:378`, `:389`).

5. **A one-flag hold read.** `autoApplyHoldActive` (`weeklyCoach.js:2118-2128`)
   is the single place the engine answers "is a hold open right now", emitted
   so display-only consumers never re-derive it.

6. **A decline memory with a coarse situation signature.** `evidenceSignature`
   (`coachDecline.js:47-57`) is seven coded fields; `materialEvidenceChange`
   (`:113-139`) defines when a "no" stops binding. Domain/kind/direction are
   already generic (`:70-85`), so the mechanism is not calorie-specific.

7. **An intervention/outcome record with pluggable observation windows.**
   `OBSERVE` (`coachIntervention.js:93-118`) is a per-kind table of
   `{unit, min, signals, compare}` and is **stored inside each record** so old
   records keep being judged under the rules they were written with
   (`:120-127`). Entries for `PRESCRIPTION`, `EXERCISE_REPLACEMENT` and
   `STRUCTURE` already exist but have no writer (§5.3).

8. **A confound-first outcome classifier.** `classifyOutcome`
   (`coachIntervention.js:256-340`) checks user override, goal-phase change,
   manual volume muscles, training stoppage and missing signals *before* any
   verdict.

9. **A traceable copy layer.** Every story line is `{text, from}` where `from`
   is a context key (`coachStory.js:44`), so a sentence without evidence cannot
   be written by accident and `storyLines` (`:316-328`) exposes them all for
   checking.

10. **Coded-reason → copy maps** rather than stored prose: `HOLD_COPY`
    (`coachStory.js:231-239`), `returningCopy.reasons`
    (`coachDecline.js:174-187`), `WHY_LIBRARY` (`weeklyCoach.js:481-531`),
    `SESSION_REASON_CODES` + `getSessionAdjustmentMessage`
    (`whyThisTemplates.js:299`, `:345`), `SLOT_REASON`
    (`programmeEpoch.js`), `ED_PATTERN_LOCKOUT_COPY` /
    `RAPID_LOSS_CORRECTED_COPY` (`whyThisTemplates.js:399`, `:433`).

11. **A jargon guard.** `checkJargon` (`whyThisTemplates.js:469`) with
    word-boundary patterns (`:40-62`), plus `BANNED_TERMS`
    (`coachStory.js:37-41`).

12. **A per-muscle session layer that already exists and already reads
    check-in muscle data.** `computeSessionAdjustments` (`algorithms.js:1082`)
    with `CHECKIN_MUSCLE_MAP` (`whyThisTemplates.js:322`) and
    `MUSCLE_DISPLAY_NAMES`. It is pure, honours a weekly-precedence hold
    (`HOLD_WEEKLY_PRECEDENCE`, `algorithms.js:1211`) and a safety hold
    (`HOLD_SAFETY`, `:1209`), and caps at 2 adjusted exercises per session
    (`:1262-1268`).

13. **A slot-level verdict engine with a joint branch already written.**
    `slotVerdict` (`programmeEpoch.js:265-351`) has
    `if (evidence.jointDiscomfort) return REPLACE / JOINT_DISCOMFORT` at
    `:283`, ranked **above** plateau and variation and below only explicit
    exclusion and repeated swaps. See §10.3 for its reachability.

14. **A per-muscle apply path.** `computeDeloadVolume`
    (`coachApply.js:175-200`) already takes per-muscle `peaks` and per-muscle
    `strains`, so the apply layer can already write different numbers to
    different muscles.

15. **Tri-state persistence already established.** `joint_pain` and
    `cycle_override` store null/0/1 with the documented rule that "unasked" is
    never recorded as an answer (`database.js:7223-7238`), and the sync layer
    carries the tri-state through (`sync/tables/weeklyCheckins.js:71-76`).

16. **Preserving column writes.** `saveWeeklyCheckin`'s `COLS` map with
    `value !== undefined` semantics (`database.js:7205-7241`) means a new
    writer touching only some fields cannot null the others.

17. **A scenario harness over the real seams.** `coachValidation/harness.js`
    with a deliberately small assertion vocabulary (`:14-17`) and a fixed
    `NOW`.

---

## 10 CONFLICTS WITH NEW SYSTEM

Stated as observed structural facts about the current code, not as design
positions.

### 10.1 There is no per-muscle or per-exercise channel into the weekly coach

`buildCoachContext` (`coachContext.js:378-412`) returns exactly five branches:
`training`, `recovery`, `nutrition`, `weight`, `intent`. The only
muscle/exercise-shaped values anywhere in it are:

- `training.plateauedExerciseCount` — a plain integer, `Number(...) || 0`
  (`:388`). It is passed through and **never read** by any consumer:
  `classifyTrainingLimiter` does not touch it, `coachStory` does not, and grep
  finds no other reader.
- `intent.manualVolumeMuscles` — a list of muscle names, read only by
  `classifyOutcome` as a confound test (`coachIntervention.js:297-300`).
- `intent.excludedExerciseIds` — a list, with **no reader anywhere** in the
  coach path (grep finds only the `intentFacts` producer).

Everything else is whole-athlete. There is no `perMuscle`, no `perExercise`,
no `restrictions`, no `capabilities` key.

### 10.2 The check-in collects per-muscle data and the engine discards it

`soreMuscles` is collected as a 10-chip multi-select
(`WeeklyCheckInScreen.js:1178-1197`), persisted as CSV (`:823`,
`database.js:7239`), synced (`sync/tables/weeklyCheckins.js:74`), and reaches
only the **session** layer (`algorithms.js:1300`). It never reaches
`runWeeklyCoach`.

Worse for provenance: the same submit **also concatenates it into the free-text
notes** (`WeeklyCheckInScreen.js:825-829`):

```js
notes: [
  notes.trim(),
  jointPain === 'yes' ? 'Joint pain flagged this week.' : '',
  soreMuscles.length > 0 ? `Sore: ${soreMuscles.join(', ')}.` : '',
].filter(Boolean).join(' ') || null,
```

so the structured answer arrives at the engine only as unstructured prose,
where it is consumed by a regex (`parseNoteFlags`, `weeklyCoach.js:547-566`)
and by a boolean (`hasUnusualEvent`, `:859`).

### 10.3 The exercise-level "joint discomfort" branch is unreachable in production

`slotVerdict`'s `JOINT_DISCOMFORT` REPLACE branch (`programmeEpoch.js:283`)
requires `evidence.jointDiscomfort`. The two production evidence builders never
set it:

- `blockAdvisor.evidenceFor` (`blockAdvisor.js:509-533`) sets nine fields;
  `jointDiscomfort` is not among them.
- `planAutoGen.buildSlotEvidence` (`planAutoGen.js:425-464`) documents the
  omission explicitly (`:419-423`): *"Joint discomfort in particular is not
  inferred: the app has no per-exercise tolerance signal (`exerciseEvidence`
  reports `tolerance: 'not_tracked'`), and manufacturing one would be inventing
  a safety fact."*

`exerciseEvidence` returns the literal `tolerance: 'not_tracked'`
(`exercise/intent.js:477`, documented `:441-456`).

The whole-session `jointDiscomfort` 0-3 rating does exist and is collected
(`WorkoutSummaryScreen.js:1742`), stored (`database.js:3206`,
`workouts.joint_discomfort`) and read by `mesocycle.js:232,241`,
`interBlock.js:132,374`, `blockLedgerGather.js:315`,
`blockMetrics.js:425` — but it is per **session**, not per exercise or muscle.

### 10.4 Execution is measured in sessions, never in sets or exercises

`trainingExecutionFact` reads only `sessionsCompleted / sessionsPlanned`
(`coachContext.js:133-147`). Those come from `getWeeklySessionStats`
(`database.js:7370-7426`): `completed` counts completed workouts that have at
least one set and were not resolved `ended_early`; `planned` is the **number of
routines in the active plan** (`:7409-7415`), falling back to a trailing
4-week average. Neither number can see missed sets, skipped exercises, or
substituted movements.

### 10.5 The volume decision has no muscle granularity anywhere in the weekly path

`volumeSignal` is one integer (§2.4). `computeVolumeApply` spreads it over
every trained-muscle row identically (`coachApply.js:269-299`), and the card
label says so in words: *"Add N sets to each muscle group"* /
*"Pull back N sets per muscle group"* (`CoachOutputScreen.js:395-397`).

### 10.6 The safety hold is binary and whole-plan

`safetyHold` (`weeklyCoach.js:1238`) is one boolean OR-ing joint pain, a
parsed injury word and a parsed illness word. Its effect is
`volumeSignal → 0` and `push → hold` across the entire plan (`:1240-1242`).
There is no representation of "restricted at the shoulder, unrestricted at the
hip".

### 10.7 The `EXERCISE` rung is a label with no actuator

`chooseInterventions` can return `INTERVENTION.EXERCISE`
(`coachPrecedence.js:301`) but no production consumer acts on it (§5.3). The
only surfaces that change exercises are the **block boundary**
(`blockReview.proposeNextBlock` → `slotVerdict`) and the **plan rebuild**
(`planAutoGen.withContinuity`), neither of which is the weekly coach and
neither of which runs weekly.

### 10.8 Flagging a physical problem currently degrades the whole week's evidence

`hasUnusualEvent` is `!!(checkin?.notes?.trim())` (`weeklyCoach.js:859`). The
check-in appends `'Joint pain flagged this week.'` and `'Sore: …'` to notes,
so answering the safety questions makes `hasUnusualEvent` true, which:

- with `< 5` distinct weigh-in days → **`data_hold`**, the hard early return
  that suppresses every decision that week (`weeklyCoach.js:224-231`, `:872`);
- otherwise downgrades `high → medium` (`:239`), which raises
  `offTargetWeeksRequired` from 2 to 3 (`weeklyCoach.js:1299`);
- and, at the caller, sets `confounded: true` on the maintenance-learning call
  (`CoachOutputScreen.js:1932`), holding the learned-maintenance update.

Additionally, `'Joint pain flagged this week.'` contains the token `pain`,
which `parseNoteFlags`'s injury pattern matches
(`/\b(injur\w*|tweak\w*|strain\w*|sprain\w*|hurt|pulled|pain)\b/`,
`weeklyCoach.js:560`), so a single joint-pain answer sets **both**
`jointPainFlagged` and `noteFlags.injury`. This does not change the outcome
(`safetyHold` is an OR, and the joint-pain branch owns the copy at `:1253-1256`)
but it is a self-generated duplicate signal, and `noteFlags` is emitted in the
output (`:2513`) where any future consumer would read the injury flag as
independent free-text evidence.

### 10.9 Copy already promises per-exercise judgement the engine cannot make

- `weeklyCoach.js:1254`: *"Ease the load on the sore movement or swap it for a
  pain-free variation."* — an instruction to the athlete, not an app action.
- `coachResponse.js:284`: *"Keep load off the sore joint this week. Swap any
  movement that aggravates it for a pain-free option."*
- `coachStory.js:180-186` can render *"X is being replaced"* from
  `changes.exerciseChanges`, but the CoachOutput call site
  (`CoachOutputScreen.js:2374`) — the only production caller of
  `buildCoachStory` — never supplies that key (grep for `exerciseChanges`
  outside `coachStory.js` finds only `PlansScreen.js:559,567,648,1935,1943`,
  a different data path). The branch is therefore dead on the coach screen.

### 10.10 Decline is nutrition-only

§6.5. A restriction-aware system that proposes training changes would have no
decline channel, and no `declinedAdjustments` entry would ever exist for a
training proposal, so `suppressedByDecline({domain:'training'})` — which the
module supports (`coachDecline.js:153-164`) — can never fire today.

### 10.11 `weekly_checkins` has two writers and a preserving-write contract

`WorkoutSummaryScreen` writes `sleep_quality` into the same row
(`database.js:7207-7213`). Any new per-muscle/per-restriction column would
inherit that two-writer constraint.

---

## 11 PROVENANCE RISKS

### 11.1 Doc/code drift — Campaign 21 line references

`GRAPH-TRAINING.md` records `src/lib/weeklyCoach.js (2557 lines, opened in
full)` (`:24`). Live: **2,613 lines**. Every cited anchor in that file has
moved:

| Doc citation | Doc line | Live line | Δ |
|---|---|---|---|
| `assessDataConfidence` | 186 | 213 | +27 |
| `corroborateConfidenceLevel` | 261 | 288 | +27 |
| `getRecoveryScore` | 279 | 306 | +27 |
| `getPerformanceScore` | 344 | 342 | −2 |
| `canAdjustCals` | 1377 | 1410 | +33 |
| `volumeDecisionMemory` applied | 1365 | 1398 | +33 |
| `targetNotTested` | 1607 | 1640 | +33 |
| decline hold | 1630 | 1663 | +33 |
| oscillation hold | 1659 | 1692 | +33 |
| FFM floor | 1667 | 1709 | +42 |
| coordination gate applied | 1742 | 1775 | +33 |
| `rapidWeightLossFlag` | 1818 | 1856 | +38 |
| `edPatternHeld` | 1931 | 1964 | +33 |
| `autoApplyHoldActive` | 2085 | 2118 | +33 |
| D15 escalation | 2115 | 2148 | +33 |

`GRAPH-TRAINING.md:231` cites `weeklyCoach.js:29-30 PHASE_CONFIG` — live
`PHASE_CONFIG` is at **427**; lines 29-30 are import statements. That citation
was wrong when written, not drifted.

**No drift found** in `coachPrecedence.js` (doc `:264` / `:380` = live
`:264` / `:380`), `coachIntervention.js` (`:439` = `:439`; `:515` = `:515`;
`:201` = `:201`), `coachDecline.js` (`:113-164` matches),
`coachApply.js` `computeVolumeApply` (`:269` = `:269`), `markApplied`
(`:210` = `:210`). `coachApply.js` is 340 lines live vs `334` in the doc
(`GRAPH-TRAINING.md:26`); the doc's `:318` for the session allocator resolves
to live **324**.

Cause not attributable from this clone (§1.5).

### 11.2 Doc/code drift — T-WEEKLY-02 is materially out of date

`GRAPH-TRAINING.md:94-115` describes photo corroboration as
`OUTPUT: possibly-raised confidence level string, DISPLAY ONLY` and
`PRECEDENCE: display-only`. Live code supersedes this: `weeklyCoach.js:2313`
states *"Campaign 23 R2 (D99, founder ruling 2026-08-17; supersedes D18's
render-time-only split — the corroborated confidence is now THE emitted,
persisted confidence)"*, and `emittedConfidenceLevel` (`:2386-2390`) is what
lands in `output.confidence` (`:2429`) and therefore in `output_json`.

The doc's own safety claim still holds in live code: the **pre**-corroboration
`confidence.level` is what feeds `offTargetWeeksRequired` (`:1299`), so no
calorie/training/floor decision moves (`:2325-2331`). Neither `D99` nor
`Campaign 23` appears anywhere in the three Campaign 21 docs (grep: zero hits).

### 11.3 Rule count

`GRAPH-TRAINING.md` carries 53 `RULE_ID:` blocks and
`GRAPH-NUTRITION-SAFETY.md` 64 — **117 total**, against the brief's "113
production rules". 11 rules in GRAPH-TRAINING and 2 in
GRAPH-NUTRITION-SAFETY carry a DEAD/TEST-ONLY marker; the exact arithmetic
reconciling 117 to 113 is **UNVERIFIED** (§14 item 1).

### 11.4 Signals that reach the engine only as prose

Per-muscle soreness and joint pain reach `runWeeklyCoach` through
`checkin.notes` (§10.2, §10.8), where a regex decides what they mean. The
regex is documented as "Deliberately simple word matching, not NLP"
(`weeklyCoach.js:541`). Any athlete free text containing `pain`, `hurt`,
`pulled`, `strain*`, `tweak*` sets `noteFlags.injury`; `ill`, `sick`, `cold`,
`flu`, `fever`, `virus`, `covid`, `unwell`, `poorly` set `noteFlags.illness`.
Both feed `safetyHold`.

### 11.5 The copy-variant seed is inert

`pickWhy(keys, seed)` returns `pool[seed % pool.length]`
(`weeklyCoach.js:533-537`). Every `WHY_LIBRARY` entry is a **single-element
array** (`:481-531`), so `weekSeed` selects index 0 always. The rotating-variant
machinery (and the careful Monday-UTC bucket derivation at `:975-985`) has no
observable effect on the WHY line today. OBSERVED; no claim about intent.

### 11.6 A first-week `planned` can be an estimate presented as a plan

`getWeeklySessionStats` falls back to `Math.max(completed, Math.round(avgPrev)
|| 3)` when there is no active plan (`database.js:7419-7421`) and flags this as
`plannedIsEstimate` (`:7425`). `runWeeklyCoach` receives only
`sessionStats.planned` (`CoachOutputScreen.js:1842`) — **the estimate flag is
not passed**, so `trainingExecutionFact` cannot tell a prescribed denominator
from a guessed one.

### 11.7 Historical adherence direction is judged against the CURRENT target

`recentWeeklyHistory` maps each past week's `calsAdherence` through
`mapCals(ci.calsAdherence, weekAvg)` where the target is always
`nutrition?.targetKcal` — today's (`CoachOutputScreen.js:1592-1593`,
`:1738-1757`). The code documents this as a known approximation
(`:1732-1737`). It feeds the ED-pattern detector.

### 11.8 `weekStart` conventions

`saveWeeklyCheckin` matches an existing row by `created_at` within the week
rather than by `week_start`, explicitly to catch rows written under an older
UTC-Monday convention (`database.js:7195-7203`). The copy seed normalises
Sunday- and Monday-anchored `weekStart` values to the same Monday-UTC bucket
(`weeklyCoach.js:975-985`). Both are evidence that historic rows carry mixed
week-start conventions.

---

## 12 SYNC / MIGRATION ISSUES

1. **`weekly_checkins` is registry-driven; `coach_outputs` is not.**
   `weekly_checkins_v2` has a dedicated table module
   (`sync/tables/weeklyCheckins.js`, registered `sync/registry.js:24`) with a
   per-row LWW gate on `updated_at` (`:105-120`). `coach_outputs` is still in
   the monolith: push `sync.js:1145-1164`, pull `sync.js:2978-3002` with a
   watermark.

2. **`sore_muscles` syncs as an opaque CSV string** — push
   `sync/tables/weeklyCheckins.js:74`, cloud column
   `supabase/audit_cloud_schema_drift.sql:66`. The muscle names are the
   **display strings** from the UI (`'Chest'`, `'Hamstrings'`, …), mapped to
   engine keys only at read time by `CHECKIN_MUSCLE_MAP`
   (`algorithms.js:1301-1303`). A renamed chip label would silently break the
   mapping for historical rows.

3. **All coach decision state is a JSON blob.** `output_json` carries
   `context`, `limiters`, `evidenceSignature`, `appliedAdjustments`,
   `declinedAdjustments`, `consecutiveOffTargetWeeks`,
   `lastCalAdjustmentWeekStart` and ~55 other keys. It is unversioned — grep
   finds no schema-version field on the output object. The individual RECORDS
   inside it are versioned (`coachIntervention.js:131 RECORD_VERSION = 1`,
   `coachDecline.js:29 RECORD_VERSION = 1`) and readers reject a mismatched
   `v` (`coachIntervention.js:208`, `coachDecline.js:95`).

4. **Two ratchets protect apply state across sync.**
   `preserveAppliedAdjustments` on local re-save (`database.js:8025-8040`,
   used `:8052`) and the cloud applied-receipt ratchet
   (`:8674-8683`). Both exist because a newer row that merely VIEWED the week
   would otherwise clear a receipt and re-arm Apply.

5. **Deterministic ids.** `co_<week_start>_<user_id>`
   (`database.js:8086`) with a local unique index at v71 (`:2144`), a
   duplicate-purge (`:2136-2143`), a v72 re-id of legacy `uid()` rows
   (`:2147-2166`), and a cloud-side unique constraint
   (`migrate_135_coach_outputs_week_unique.sql`). A v71 collision on the cloud
   path logs a warning rather than silently discarding (`:8732-8737`).

6. **Cloud stale-write trigger** on `coach_outputs`
   (`migrate_134_stale_write_triggers.sql:177-202`) gives the pull-side LWW
   gate a monotonic clock. Migrations 132-135 are written and awaiting the
   founder's phrase per `CLAUDE.md`.

7. **`applied` was inert until recently.** `database.js:8069-8073` records that
   the column "previously had NO local writer at all, so every production
   cloud row carried applied = false" and that v71's tiebreak, migrate_135's
   predicate and the reinstall E2E assertion were all inert as a result. It is
   now derived from the JSON on every save.

8. **A new per-muscle/per-restriction table would need four touch points**, by
   the pattern every existing table follows: local `CREATE TABLE` + additive
   `ALTER` block in `database.js`, a `supabase/migrate_NNN_*.sql`, a
   `sync/tables/*.js` module + `registry.js` entry, and a `DELETE FROM` line in
   the `delete_user_data` RPC (current version
   `migrate_096_delete_user_data_completeness2.sql`).

9. **`cardio_adherence` is the precedent for a retired column.** It is
   deliberately omitted (not nulled) from the check-in write
   (`WeeklyCheckInScreen.js:801-804`) so historical answers survive a same-week
   re-save. Its cloud column and sync mapping remain
   (`sync/tables/weeklyCheckins.js:69`).

10. **`steps_avg` is written null on every modern check-in**
    (`WeeklyCheckInScreen.js:799`) while the engine still has full step logic
    behind `stepsEnabled` (`weeklyCoach.js:1801-1855`), dead because the only
    call site passes `false` (`CoachOutputScreen.js:1890`). Recorded as founder
    item FR-C4-11 in the code (`weeklyCoach.js:754-757`).

---

## 13 ANSWERS TO SPECIFIC QUESTIONS

### Q1 — The real decision-graph entry points: where does the coach ingest per-muscle/per-exercise context today, and what are the exact contracts at those seams?

**Answer: the weekly coach ingests none.** Four seams exist in the wider
system; none of them is inside `runWeeklyCoach`. Contracts stated factually.

---

**Seam 1 — `buildCoachContext` (the one authoritative context).**
`coachContext.js:378-412`.

```
buildCoachContext({ nowMs, training, recovery, nutrition, weight, intent })
  → { training: { execution, progress, plateauedExerciseCount,
                  blockWeekIndex, blockAccumWeeks },
      recovery: { systemic },              // carries scope: 'systemic'
      nutrition: { coverage, intake, protein, targetKcal },
      weight:    { trend, shortfall },
      intent:    { goalPhase, trainingGoal, division,
                   manualVolumeMuscles[], excludedExerciseIds[],
                   excludedFoodKeys[], persistentFoodReplacements,
                   pinnedMealIds[], calorieBankActive, source } }
```

- Called three times inside one run: the data-hold return
  (`weeklyCoach.js:876-897`), the pre-filter builder (`:1140-1166`), and the
  main path (`:1349-1382`).
- Documented rules that bind anything entering here: **"DUPLICATE NO
  AUTHORITY"** — the module classifies values the owning authority already
  produced and derives nothing (`coachContext.js:37-42`); **"NOT LOGGED IS NOT
  ZERO"** — `num()` returns null for anything non-finite and every caller reads
  null as UNKNOWN (`:100-109`); every fact carries
  `{signal, value, coverage, source, detail}` (`:115-117`) with `source` drawn
  from the nine-member `SOURCE` enum (`:63-73`); **scope is part of the fact**
  where scopes can differ (`:181-185`, implemented as `scope: 'systemic'` at
  `:197`/`:206`).
- Muscle/exercise-shaped fields present today: `plateauedExerciseCount` (an
  integer, no reader), `intent.manualVolumeMuscles` (read only as a confound at
  `coachIntervention.js:297-300`), `intent.excludedExerciseIds` (no reader).

---

**Seam 2 — `classifyLimiters` (the meaning layer).**
`coachPrecedence.js:213-218`.

```
classifyLimiters(context) → {
  nutrition: { limiter, because, onTarget?, direction? },
  training:  { limiter, because, scope?, progressing? }
}
```

- Reads exactly five paths: `context.weight.trend`, `context.weight.shortfall`,
  `context.nutrition.intake`, `context.nutrition.coverage`,
  `context.training.execution`, `context.training.progress`,
  `context.recovery.systemic`.
- The `RECOVERY` verdict already propagates a `scope` field
  (`:201`), taken from `recovery.systemic.scope`.
- Contract stated in the header (`:19-24`): the classification lives here
  **once** and both sides read it, so the same week cannot mean two things.
- Purity: "PURE. No I/O, no clock." (`:35`).

---

**Seam 3 — `coordinateChanges` (the only gate with decision force).**
`coachPrecedence.js:380-427`, called `weeklyCoach.js:1775-1783`.

```
coordinateChanges({ context, limiters,
                    proposed: { calorieChange, volumeChange },
                    safety:   { calorie } })
  → { allowCalorieChange, allowVolumeChange, holds[], both }
```

- Contract: **withhold-only** — "There is no path here that creates a change,
  enlarges one, reverses one or relaxes a clamp" (`:339-341`).
- Safety is senior: a caller-marked safety calorie change and any negative
  `volumeChange` are never withheld (`:343-347`, `:389-391`).
- `proposed.volumeChange` is a **single scalar** for the whole plan.

---

**Seam 4 — `buildSessionAdjustmentInput` → `computeSessionAdjustments` (the
only live per-muscle seam in the app).** `algorithms.js:1284-1345` →
`:1082-1260`.

```
computeSessionAdjustments({
  todaysExercises: [{ exerciseId, primaryMuscle, plannedSets }],
  muscleSignals:   { [muscle]: { lastTrainedAt,
                                 lastFeedback: { pump, joint, performance },
                                 checkinSore, checkinAt,
                                 presessionSoreness, displayName } },
  weeklyContext:   { doneThisWeekByMuscle, landmarks,
                     weeklySignal:'reduce'|'hold'|'push',
                     safetyHold, isDeload, weekStartMs },
  recentSessionEvents, now, presessionIntent, formatDay
}) → [{ exerciseId, muscle, setDelta, adjustedSets, plannedSets,
         reasonCode, reasonText, show, signals }]
```

- `checkinSore` is the ONLY place check-in per-muscle data enters a decision
  (`algorithms.js:1299-1305`, consumed `:1319`).
- `weeklyContext.weeklySignal` and `weeklyContext.safetyHold` are read straight
  off the weekly coach output (`:1329-1331`), so the weekly decision flows
  **down** into the session layer but nothing flows up.
- Contract stated at `:1049-1054`: it "NEVER mutates the plan, routines, or
  weekly volume: it returns at most a ±1 set delta per affected exercise for
  THIS session only. The weekly coach remains the sole owner of next-week
  volume direction … because only one of the two ever writes."
- Per-muscle rule order (`:1170-1220`): revert memory → `lastJoint >= 2` hold →
  residual soreness drop −1 → stale soreness hold → under-stimulus add +1.
  Only the FIRST exercise per muscle is ever adjusted (`:1103-1113`); at most 2
  adjusted exercises per session (`:1262-1268`).

---

**Seam 5 (block boundary, not weekly) — `slotVerdict`.**
`programmeEpoch.js:265-351`, called from `blockReview.proposeNextBlock`
(`blockReview.js:95`) and `exercise/continuity.js:206`.

```
slotVerdict(evidence, { epochBlocks, goalChanged,
                        sessionLengthChanged, executionJudgeable })
  → { verdict, reason }
```

`evidence` fields consumed, in precedence order: `excluded`,
`swappedAwayCount`, **`jointDiscomfort`**, `equipmentLost`, `autoEligible`,
`redundant`, `conflictsWithGoal`, `doesNotFitSession`, `plateau`,
`prescriptionFix`, `systematicCandidate`, `progressing`,
`establishedPersonalFit`, `sessions`. `jointDiscomfort` is ranked **third**,
above plateau. It is never populated in production (§10.3).

---

### Q2 — How are user-facing WHY strings produced?

Four independent mechanisms, all template/rule-id based. **No string is ever
generated; none is stored as prose and replayed.**

**(a) `WHY_LIBRARY` — the single "why this week" line.**
`weeklyCoach.js:481-531`. A frozen map from a **reason key** to an array of
candidate strings. Keys are chosen by a strict single-winner if/else ladder
(`:2241-2264`), in this order:

```
ffm_floor_hold > rapid_loss_corrected > deload_suggested > diet_break_suggested
  > recovery_lagging > exceeded_escalation > push_volume
  > off_target_cal_up > off_target_cal_down > steps_bump > on_target_holding
```
plus a non-exclusive `low_data_weight` append (`:2264`).
`pickWhy(keys, weekSeed)` (`:533-537`) flattens and indexes; every pool has one
element so the seed is inert (§11.5). `whyKeys[0]` is also surfaced structurally
as `primary.reasonKey` with a domain map (`:2277-2291`).

**(b) `heldDecisions[]` — one row per hold, with a `type` and a `reason`
string.** Built at `weeklyCoach.js:1957-2079` in a deliberate precedence order:

| Order | `type` | Line |
|---|---|---|
| 1 | `ed_pattern_lockout` / `ed_pattern_cleared` | 1965-1978 |
| 2 | `ffm_floor` | 1985-1990 |
| 3 | `target_not_tested` | 1996-2004 |
| 4 | `declined_last_time` | 2007-2012 |
| 5 | `awaiting_last_change` | 2016-2021 |
| 6 | `volume_outcome_memory` | 2025-2033 |
| 7 | `one_change_at_a_time` (calorie) | 2038-2043 |
| 8 | `one_change_at_a_time` / `training_volume_held` | 2044-2054 |
| 9 | `intake_read_failed` | 2057-2062 |
| 10 | `rapid_loss_corrected` | 2068-2077 |
| 11 | generic `calories` (5 mutually exclusive reasons) | 2082-2094 |

The generic bucket is explicitly suppressed under an ED lockout or FFM hold so
two explanations never stack (`:2080-2082`).

**(c) `coachStory` — the five-part account, every line traceable.**
`coachStory.js`. Each line is `{text, from}` where `from` is a context key
(`:44`). `whatHappened` (`:56-83`) reads signals; `whatItMeans` (`:92-151`)
switches on **limiter + because**; `whatIsChanging` (`:168-198`) gives each
change its own `why`; `whatStaysTheSame` (`:202-228`) renders
`chooseInterventions().holds` through the coded `HOLD_COPY` map (`:231-239`);
`whatWeWatchNext` (`:244-273`) returns at most one line. Called once, at
`CoachOutputScreen.js:2374`.

**(d) `coachResponse` / `coachRegister` — the five-part spoken response.**
`coachResponse.js`. Part 3 (`buildDecision`, `:214-236`) reuses the engine's
own strings verbatim in precedence: ED lockout reason → the calorie call +
`calories.note` → the first `calories`/`ffm_floor` held reason →
`output.whyThisWeek`. Part 4 (`buildCue`, `:257-306`) is a 7-rung deterministic
priority ladder with suppression carve-outs. `coachRegister.js:282` re-renders
the same facts in a `precise` register, with a register-blind safety carve-out
(`coachRegister.js:21-27`).

**Supporting maps:** `returningCopy.reasons` (`coachDecline.js:174-187`),
`heldByDeclineCopy` (`:196-202`), `outcomeCopy` (`coachIntervention.js:597`),
`SESSION_REASON_CODES` + `getSessionAdjustmentMessage`
(`whyThisTemplates.js:299`, `:345`), `ED_PATTERN_LOCKOUT_COPY` (`:399`),
`RAPID_LOSS_CORRECTED_COPY` (`:433`), `SLOT_REASON` (`programmeEpoch.js`),
`PERF_VERDICT_TEXT` (`checkinDerive.js:150`),
`GLOSSARY` (`coachGlossary.js`).

**Guards:** `checkJargon` (`whyThisTemplates.js:469`) with word-boundary
patterns (`:40-62`); `BANNED_TERMS` (`coachStory.js:37-41`);
`weeklyCoach.voice.snapshot.test.js`.

---

### Q3 — All persisted coach state between weeks

**Tables:** `coach_outputs` and `weekly_checkins` (local + cloud). No other
table holds coach state.

**A. Read from the PREVIOUS `coach_outputs` row** (`getLatestCoachOutput`,
`database.js:8112-8120`; only chains when the row is the immediately previous
calendar week, `CoachOutputScreen.js:1682-1684`):

| Path in `output_json` | Becomes | Line |
|---|---|---|
| `trend.onTarget` | `consecutiveOffTargetWeeks` chain | `:1685` |
| `consecutiveOffTargetWeeks` | +1, else 0 | `:1685-1687`; written `:2094` |
| `lastCalAdjustmentWeekStart` | `lastCalAdjustmentWeeksAgo` (2-week cooldown) | `:1722-1725`; written `:2083-2085` |
| `adjustments.calories.change` | `lastCalAdjustmentDirection` | `:1712-1714` |

**B. Read from the last 8 `coach_outputs` rows** (`getCoachOutputHistory`,
`database.js:8810`; called `CoachOutputScreen.js:1812`):

| Path | Becomes | Line |
|---|---|---|
| `appliedAdjustments[key].intervention` | `priorInterventions` → `doseEscalation`, `wouldReverseRecent`, `volumeDecisionMemory`, `holdReinforcement` | `:1813` |
| `appliedAdjustments[key].appliedAt` / `.newKcal` | legacy fallbacks in the record | `coachIntervention.js:212-217` |
| `declinedAdjustments[key].decline` | `priorDeclines` → `suppressedByDecline` | `:1816` |

**C. Read as a set of week-starts** (`getCoachOutputWeekStartsSince`,
`database.js:5171`): `evidencedWeeksInPhase`
(`CoachOutputScreen.js:1611-1613`) — bounds CLAIM copy only, never the phase
clock.

**D. Read from the last 4 `weekly_checkins` rows** (`getRecentCheckins`,
`database.js:7306-7313`; called `CoachOutputScreen.js:1616`):

| Column | Becomes | Line |
|---|---|---|
| `energy_score`, `soreness_score` | `consecutivePoorRecoveryWeeks` (calendar-adjacency-gated; a row with no scores is skipped, never breaks the run) | `:1629-1653` |
| `soreness_score` | `consecutiveGrade3RecoveryWeeks` (deliberately NOT adjacency-gated; a missing score counts as grade-3) | `:1656-1672` |
| `training_performance` | `consecutiveExceededWeeks` (adjacency-gated) | `:1695-1710` |
| `energy_score`, `cals_adherence`, `week_start` | `recentWeeklyHistory[]` for the ED detector | `:1738-1757` |
| `created_at` / `week_start` of the newest row with real answers | `lastCheckinAt` (14-day gate on the food-diary stand-in) | `:1901-1906` |

**E. Coach-adjacent state OUTSIDE these two tables** (read by the coach path,
not written by it): the ED-pattern flag (`getOpenEdPatternFlag`,
`CoachOutputScreen.js:1761`; raised/cleared `:1982`/`:1997`),
`userProfile.phaseStartedAt` / `goalStartDate` / `goalLockAdvanced` /
`scoffScore` / `coachAutonomy` / `coachTone`, `nutrition_targets`,
`planned_muscle_volume` (the target of a training apply),
`mesocycle_weeks.is_deload` (the target of a deload apply),
`adaptation_events` (session-layer add cap and revert memory,
`algorithms.js:1127-1138`), and the learned-maintenance memo
(`learnEffectiveMaintenanceForUser`, `CoachOutputScreen.js:1925-1934`).

---

### Q4 — How exercise-level coach decisions are made and applied end-to-end

**The weekly coach makes none.** Three separate systems make exercise-level
decisions, on three different cadences, none of them the weekly coach.

**Path A — per session, per muscle (live, ±1 set, this session only).**

1. Read: `getSessionAdjustmentSignals` + weekly/meso context
   (`sessionAdjustments.js`).
2. Assemble: `buildSessionAdjustmentInput` (`algorithms.js:1284-1345`) — maps
   `checkin.soreMuscles` CSV → engine keys (`:1299-1305`), derives
   `weeklySignal` from `coachOutput.volumeSignal` (`:1329-1331`), carries
   `coachOutput.safetyHold` (`:1336`).
3. Decide: `computeSessionAdjustments` (`:1082-1260`) — deload returns `[]`
   (`:1092`); one candidate per muscle, first exercise only (`:1103-1113`);
   rule ladder `:1170-1220`; cap of 2 adjusted exercises (`:1262-1268`).
4. Output: `{exerciseId, muscle, setDelta, adjustedSets, reasonCode,
   reasonText, show, signals}`. Copy from
   `getSessionAdjustmentMessage(reasonCode, opts)`
   (`whyThisTemplates.js:345`); visibility from `SESSION_SHOWN_CODES`
   (`:314`) plus a "Sharp" pre-session answer for precedence holds
   (`algorithms.js:1225-1229`).
5. Apply: session-scope only; **never writes the plan**
   (`algorithms.js:1049-1054`). A revert writes a
   `session_adjustment_reverted` event that suppresses that muscle after two
   occurrences within the caller's 6-week window (`:1170-1172`).

**Path B — per block boundary, per slot (the real exercise-change engine).**

1. Gather: `blockAdvisor.evidenceFor` (`blockAdvisor.js:509-533`) from
   `loadExerciseIntentState` + `exerciseEvidence`.
2. Decide: `blockReview.proposeNextBlock` (`blockReview.js:64-120`) calls
   `slotVerdict` per slot (`:95`) then `programmeVerdict`.
3. Verdicts: `KEEP`, `KEEP_WITH_PRESCRIPTION_CHANGE`, `REPLACE`,
   `REMOVE_OR_REDISTRIBUTE`, each with a `SLOT_REASON`.
   A `KEEP_WITH_PRESCRIPTION_CHANGE` carries exact values
   (`prescriptionChange: {repMin: 15, repMax: 20}` for the rep-range fix,
   `blockAdvisor.js:521-523`), and `proposeNextBlock` refuses to reconstruct a
   prescription from a reason code (`blockReview.js:104-109`).
4. Apply: the reviewed proposal is consumed by
   `planAutoGen.reviewedReplacementIds` (`planAutoGen.js:475-483`) and
   `libraryForReviewedProposal` (`:492-495`), then written through the plan
   rebuild; `PlansScreen.js:559-567` renders the receipt.

**Path C — plan rebuild continuity.** `planAutoGen.buildSlotEvidence`
(`:425-464`) → `exercise/continuity.js:206` → `applyContinuity`, splicing
retained incumbents back into a generated plan
(`planAutoGen.js:501-540`).

**What is NOT wired end-to-end:**
- No `INTERVENTION_KIND.PRESCRIPTION` / `EXERCISE_REPLACEMENT` / `STRUCTURE`
  record is ever written, so an exercise change is never entered into the
  outcome-memory loop (§5.3) even though `OBSERVE` defines its window
  (3 exposures, `coachIntervention.js:107-113`).
- `slotVerdict`'s `jointDiscomfort` branch is unreachable (§10.3).
- `coachStory.whatIsChanging`'s `exerciseChanges` branch is dead on the coach
  screen (§10.9).

---

### Q5 — Where would a constrained week be misread TODAY?

Both walks assume a Pro user with a live block, ≥ 5 weigh-in days, a logged
diary, mid-cut, and a shoulder restriction that is real but is not "an injury
the athlete wrote about".

---

#### Walk A — bench performance falls while a shoulder is restricted

| # | What happens | File:line |
|---|---|---|
| A1 | Athlete attends every session. `getWeeklySessionStats` counts completed workouts with ≥ 1 set; `planned` = number of routines. `completed/planned = 1.0`. | `database.js:7387-7421` |
| A2 | `trainingExecutionFact`: ratio 1.0 ≥ 0.8 → **GOOD**, `detail: "4 of 4 sessions"`. | `coachContext.js:133-147` |
| A3 | Bench e1RM falls. `computeLiveBlockSlopePct` builds per-muscle `computeBlockPerformance`, then `effectiveBlockSlopePct` takes the **median** across trained muscles. | `blockLedgerRunner.js:500-540`; `blockMetrics.js:475-481` |
| A4 | If the median lands ≤ 0 → `trainingProgressFact` returns **POOR** ("block strength slope"). Note `slope > 0 ? GOOD : POOR` — exactly 0 is POOR. | `coachContext.js:163-166` |
| A5 | Recovery: energy 4, soreness 2 — the shoulder is restricted, not systemically fatiguing → `systemicRecoveryFact` **GOOD**. | `coachContext.js:199-207` |
| A6 | `classifyTrainingLimiter`: execution GOOD (not UNKNOWN, not POOR) → recovery GOOD → progress POOR → **`PLAN` / `not_progressing_on_a_run_programme`**. | `coachPrecedence.js:194-207` |
| A7 | `chooseInterventions` → training rung = **`INTERVENTION.EXERCISE`**. | `coachPrecedence.js:301` |
| A8 | **No engine acts on that rung** (§5.3). The real training decision is the matrix. | `weeklyCoach.js:1201` |
| A9 | Matrix inputs: `getRecoveryScore(4, 2, stress)` → energy ≥ 4 and soreness ≤ 1 is false, so score **2**. `getPerformanceScore`: no `exceeded`, PR density low, slope not ≥ 1.5, adherence 1.0 → falls to `trainingPerformance` or `>= 0.75` → **2** (or **3** if the athlete answered "struggled"). | `weeklyCoach.js:306-321`, `:342-356` |
| A10 | `autoregulationMatrix(2, 2)` → `{volumeDelta: +1, trainingSignal:'push'}`. With performance 3 → `{0, 'hold'}`. | `weeklyCoach.js:398-417` |
| A11 | **On the (2,2) path the coach proposes ADDING a set to every muscle group, including the restricted shoulder.** `coordinateChanges` R2 does not fire (limiter is `PLAN`, not `EXECUTION`/`RECOVERY`); R3 does not fire (training limiter is not `INSUFFICIENT_EVIDENCE`). | `coachPrecedence.js:403-424` |
| A12 | `computeVolumeApply(rows, +1)` raises **every** muscle row by 1, clamped only at each muscle's own `mrv`. | `coachApply.js:269-299` |
| A13 | Card label: *"Add 1 set to each muscle group"*. | `CoachOutputScreen.js:395` |
| A14 | Story: *"You have run the programme and recovered from it, so the lifts not moving is about the training itself."* | `coachStory.js:129-130` |
| A15 | `whyKeys` ladder → `push_volume` if `excellentRec` else `on_target_holding`. WHY line: *"Recovery's good and your lifts are moving, so there's a bit more work in the plan this week."* | `weeklyCoach.js:2255-2262`, `:519-521` |
| A16 | If `coachAutonomy === 'coached'` and no hold is open, the volume apply runs **without a tap** (`autoApplyHoldActive` is false: no deload, no poor recovery, no safety hold, no ED/FFM/rapid-loss, no SCOFF, no calm). | `CoachOutputScreen.js:2236-2272`; `weeklyCoach.js:2118-2128` |

**Net:** one restricted joint is read as *"the programme is not working"*, and
the whole plan gets more volume. The only thing standing between this and an
automatic write is the athlete's autonomy mode.

**Variant A′ — the athlete answers the joint-pain question "Yes".**

| # | What happens | File:line |
|---|---|---|
| A′1 | Submit appends `'Joint pain flagged this week.'` to `notes`. | `WeeklyCheckInScreen.js:825-829` |
| A′2 | `hasUnusualEvent = !!(notes.trim())` → **true**. With < 5 distinct weigh-in days this is a hard **`data_hold`**: every decision suppressed for the week. | `weeklyCoach.js:859`, `:224-231`, `:872` |
| A′3 | With ≥ 5 weigh-in days, confidence drops `high → medium`, so `offTargetWeeksRequired` goes 2 → 3: **the calorie side gets slower for a week the athlete told the truth about**. | `weeklyCoach.js:239`, `:1299` |
| A′4 | `jointPainFlagged` true AND `parseNoteFlags` matches `\bpain\b` → `noteFlags.injury` also true, from the app's own generated sentence. | `weeklyCoach.js:1236-1237`, `:560` |
| A′5 | `safetyHold` true → `volumeSignal → 0`, `push → hold` **for every muscle**. The restricted shoulder and the unaffected legs are treated identically. | `weeklyCoach.js:1238-1242` |
| A′6 | Note: *"You flagged joint pain, so the plan holds rather than adding work. Ease the load on the sore movement or swap it for a pain-free variation."* — the app asks the athlete to do the per-exercise work. | `weeklyCoach.js:1254` |
| A′7 | `autoApplyHoldActive` true → Coached mode falls back to confirm-first. | `weeklyCoach.js:2118-2128`, `:2240` |
| A′8 | `photoCorroborationBlocked` true → the confidence step is suppressed. | `weeklyCoach.js:2359-2366` |
| A′9 | Caller sets `confounded: true` on the maintenance-learning call, so the week teaches the maintenance model nothing. | `CoachOutputScreen.js:1932` |
| A′10 | The chosen sore-muscle chips reach only the SESSION layer, and only as `checkinSore` per muscle. The weekly engine never sees which shoulder. | `algorithms.js:1299-1319` |

---

#### Walk B — missed prescribed sets on a restricted exercise

| # | What happens | File:line |
|---|---|---|
| B1 | Athlete trains every session but drops the pressing sets. The workout still completes with ≥ 1 set and is not `ended_early`, so `completed` is unchanged. | `database.js:7379-7392` |
| B2 | `planned` is the **routine count**, not a set count, so it is unchanged. | `database.js:7409-7421` |
| B3 | `trainingExecutionFact` sees `4/4 = 1.0` → **GOOD**. **EXECUTION is blind to missed sets by construction — it has no set-level input at all.** | `coachContext.js:133-147` |
| B4 | `classifyTrainingLimiter` therefore never reaches `EXECUTION` (`sessions_missed`). It falls through to recovery, then progress. | `coachPrecedence.js:194-199` |
| B5 | Consequently `coordinateChanges` R2 (`sessions_missed`) cannot fire, and the held-decision line *"The sessions already planned have not been run consistently enough this week"* is never shown for this week. | `coachPrecedence.js:404-407`; `weeklyCoach.js:2050-2051` |
| B6 | Where the dropped sets DO show up: the check-in's own pre-fill. `getWeeklyVolumeByMuscle` gives `volDeltaPct`; a drop ≥ 10% makes `deriveTrainingPerformance` return **`'struggled'`**. | `WeeklyCheckInScreen.js:467-477`; `checkinDerive.js:97` |
| B7 | The athlete sees *"training volume down N% on last week, a lighter week than planned or last week"* pre-selected. | `WeeklyCheckInScreen.js:1249-1258`; `checkinDerive.js:153` |
| B8 | If accepted: `trainingPerformance = 'struggled'` → `getPerformanceScore` returns **3**. | `weeklyCoach.js:354` |
| B9 | `autoregulationMatrix(recovery, 3)` → `{volumeDelta: 0, trainingSignal: 'hold'}` for every muscle. | `weeklyCoach.js:407-409` |
| B10 | `trainingProgressFact` is unaffected by B8 (it reads slope/PRs, not the chip), so if the block slope is also flat the training limiter is still **`PLAN` / not progressing** while the matrix says hold. The two reads disagree and nothing reconciles them: `chooseInterventions` says `EXERCISE`, the engine holds volume. | `coachContext.js:155-173`; `coachPrecedence.js:206-207`; `weeklyCoach.js:1227-1228` |
| B11 | Consequence for memory: an accepted volume increase from a prior week is judged on `training.progress` **and** `recovery.systemic`, both of which the constrained week distorts. `classifyOutcome` can return `WORSENED` → `volumeDecisionMemory.holdIncrease` → volume held next week too, with the copy *"The last time we added work, your recovery and your lifts went the other way."* | `coachIntervention.js:99-105`, `:330-340`, `:537-543`; `weeklyCoach.js:2028-2031` |
| B12 | Consequence for the calorie side: nothing. The nutrition limiter reads only weight trend and intake. A constrained training week is invisible to it, so an unchanged weight trend on a cut still routes to `PLAN` → a calorie cut, gated only by the standard holds. | `coachPrecedence.js:117-159` |
| B13 | Where the app DOES notice, per muscle: the session layer, one session later. If the athlete rated joint discomfort ≥ 2 on the last session for that muscle, `computeSessionAdjustments` fires `HOLD_JOINT` — but only for the FIRST exercise of that muscle, only for this session, and it writes nothing. | `algorithms.js:1173-1175`, `:1103-1113`, `:1049-1054` |

**Net:** dropped sets on a restricted movement are invisible to EXECUTION,
land on the athlete as a self-reported "struggled", flow into a whole-plan
hold, and can poison the outcome verdict of a previously accepted volume
increase.

---

## 14 UNKNOWN / UNVERIFIED

1. **Rule-count arithmetic.** The brief states 113 production rules; the two
   graph docs carry 117 `RULE_ID:` blocks with 13 DEAD/TEST-ONLY markers
   between them. Which 4 are excluded, and whether the markers and the count
   were reconciled, is **UNVERIFIED**. `ledger.json` (3,616 lines) was not
   parsed rule-by-rule in this pass.

2. **Cause of the weeklyCoach.js line drift.** Not attributable from this
   shallow clone (§1.5). The observed facts are the line-reference mismatches
   in §11.1 and the 2,557 → 2,613 line-count difference; no claim is made about
   which change produced them.

3. **Whether `plateauedExerciseCount` ever carries a non-zero value in
   production.** `buildCoachContext` reads `training.plateauedExerciseCount`
   (`coachContext.js:388`), but none of the three call sites inside
   `runWeeklyCoach` (`:876`, `:1140`, `:1349`) passes that key, so it is
   always 0 in the shipped path. Whether any other caller of
   `buildCoachContext` exists outside tests: grep found none, but this was not
   exhaustively re-verified against dynamic `require` sites.

4. **`applyTimeCrunch`.** `GRAPH-TRAINING.md:1836-1846` flags it as
   TEST-ONLY/UNCONFIRMED and asks for a caller check. Out of this audit's
   scope; **not re-verified here**.

5. **Live cloud schema.** Every cloud-side statement in §4.4 and §12 is read
   from `supabase/migrate_*.sql` and `audit_cloud_schema_drift.sql`. Whether
   migrations 132-135 have been applied to production is **UNKNOWN** from the
   tree (`CLAUDE.md` says they are written and awaiting the founder's phrase).

6. **Runtime behaviour.** Nothing in this report was executed. No test suite
   was run and no device walk was performed; every claim is static-read
   evidence. Whether the `data_hold`-on-unusual-event path (§10.8, A′2) fires
   at the rate the code implies for real users is **UNKNOWN** — it depends on
   the distribution of weigh-in-day counts, which was not measured.

7. **`recovery.systemic.scope`.** The field exists and is documented as
   deliberate (`coachContext.js:181-185`). Whether any consumer branches on it
   today: grep finds it read only in `classifyTrainingLimiter`
   (`coachPrecedence.js:201`, where it is copied into the limiter result) and
   the limiter's `scope` is then read by **no** production consumer that this
   pass could find. Marked UNVERIFIED rather than DEAD because the search was
   for the literal token `scope`, which is common.

8. **Whether `steps_avg` has any historical non-null population.** The modern
   check-in always writes null (`WeeklyCheckInScreen.js:799`); whether older
   builds wrote values that still exist in user data is **UNKNOWN** from the
   tree.
