# AUDIT E — Progression, volume landmarks, blocks, long-term learning

Evidence report for Capability Campaign 25 (CC25), Wave 1. Read-only audit.
No recommendations, no product or architecture decisions. Every claim below
carries file:line. OBSERVED = read in the code at the cited line.
REPORTED = stated by a doc/comment and not independently confirmed here.

---

## 1 SCOPE / METHOD

**Scope.** Every mechanism in Volyume that turns training history into
durable or re-derived state about *how much*, *how hard* and *how well* a
muscle or lift is progressing: the volume landmark stack (research /
profile-adjusted / adapted / manual / learned), the Block Ledger and its
seeding chain, mesocycle + deload logic, `adaptation_events`, live set
prescription (C20), PR detection, plateau detection, programme-structure
memory, coach intervention memory, and the effective-maintenance memo
(named in the brief as a long-term learning mechanism with a revalidation
marker).

**Method.** Read every named module end to end rather than grepping for
symbols; followed each mechanism from its raw SQL reader through its pure
transform to its persisted output and its onward readers; cross-checked
comments against the code they describe and against `supabase/README.md`
and `supabase/migrate_*.sql`; checked the test suites that pin each law.
Nothing was executed (`npm test` was not run — read-only brief).

**Files read in full:** `src/lib/effectiveLandmarks.js`,
`src/lib/learnedRange.js`, `src/lib/interBlock.js`, `src/lib/blockSeed.js`,
`src/lib/blockMetrics.js`, `src/lib/blockLedgerGather.js`,
`src/lib/blockLedgerRunner.js`, `src/lib/coachApply.js`,
`src/lib/recoveryEMA.js`, `src/lib/programmeStructureMemory.js`,
`src/lib/effectiveMaintenance.js`, `src/lib/effectiveMaintenanceService.js`,
`src/lib/trainingRecency.js`, `src/lib/workoutRecordLine.js`.
**Read in relevant part:** `src/lib/algorithms.js`, `src/lib/database.js`,
`src/lib/planEngine.js`, `src/lib/weeklyCoach.js`,
`src/lib/livePrescription.js`, `src/lib/coachIntervention.js`,
`src/lib/mesocycle.js`, `src/lib/sessionAdjustments.js`,
`src/lib/planAutoGen.js`, `src/lib/nextBlockPreview.js`,
`src/lib/blockExplain.js`, `src/lib/sync.js`, `src/screens/PlansScreen.js`,
`src/components/ExercisePickerModal.js`,
`docs/blueprint-adaptive-mesocycle-2026-08-09.md`, `supabase/README.md`.

**Verification status of the blueprint.** The brief said "map only, verify
live". OBSERVED: the build described in
`docs/blueprint-adaptive-mesocycle-2026-08-09.md` §3.1–§3.9 is live and
wired. Stages 1–8 all exist as shipped modules and are reachable from
`src/screens/PlansScreen.js:372-651` (decision card) and
`src/lib/database.js:4399` (activation). One statement in the blueprint's
own build list is now stale — see §10.

---

## 2 CURRENT BEHAVIOUR

### 2.1 The volume landmark stack (five layers, two resolvers)

There are **five** distinct landmark sources and **two** separate
resolvers that combine subsets of them. They do not agree on precedence.

| Layer | Where it lives | Grain |
|---|---|---|
| RESEARCH | `algorithms.js:25` `VOLUME_LANDMARKS` (18 muscles, mv/mev/mav/mrv) | static |
| GENERATOR overrides | `planEngine.js:296` `GENERATOR_LANDMARK_OVERRIDES` → `SPEC_LANDMARKS` (`planEngine.js:313`) | static, plan generation only |
| PROFILE-ADJUSTED | `planEngine.js:127` `computeLandmarks(experience, recoveryRating, nutritionPhase, age)` | static per profile |
| ADAPTED (session-grain) | `algorithms.js:965` `computeAdaptiveLandmarks(history)` fed by `database.js:6543` `getAdaptiveLandmarkHistory` | recomputed each read |
| LEARNED (block-grain) | `learnedRange.js:102` `computeLearnedRange` replaying stored Block Ledgers | recomputed each read |
| MANUAL | AsyncStorage `@volyume_landmarks_<userId>` written at `VolumeHeatmapScreen.js:286,331,354` | durable, user-set |

**Resolver A — display + weekly surfaces.** `effectiveLandmarks.js:41`
`mergeLandmarkPrecedence`: MANUAL > ADAPTED (Pro only, `isAdapted`) >
RESEARCH, per muscle independently. The learned block-grain range is **not**
in this chain. `getAdaptedLandmarks` is Pro-gated at
`effectiveLandmarks.js:151` (`tier !== 'pro'` returns null). Readers:
`AnalyticsScreen.js:144`, `VolumeHeatmapScreen.js:213`,
`CoachReviewScreen.js:290`, `WorkoutSummaryScreen.js:622`, and
`blockLedgerRunner.js:306` (as the ledger's `landmarks` frame).

**Resolver B — next-block seeding.** `blockSeed.js:59` `resolveSeedRange`:
MANUAL (`blockSeed.js:77`) > valid LEDGER entry (`:89`) > repeat-observed
(`:159`) > LEARNED band (`:179`) > PROFILE-ADJUSTED (`:230`) > RESEARCH
(`:238`). ADAPTED appears here only as a *ceiling clamp* on the learned
range (`learnedRange.js:120`, fed at `blockLedgerRunner.js:355`), never as
a seed source.

### 2.2 What a block does, start to end

1. **Activation** (`database.js:4399` `activatePlanWithBlock`) creates one
   mesocycle of `BLOCK_PLANNED_WEEKS = 6` (`mesocycle.js:28`), last week the
   deload (`mesocycle.js:29`), RIR ladder `[3,2,1,0,0,4]`
   (`database.js:4485`), then `generateMesocycleWeeks(id)` and
   `generateInitialPlannedVolume(id, VOLUME_LANDMARKS, effectiveLedger)`
   (`database.js:4500`).
2. **Seeding write** (`database.js:4942`): a muscle with a resolved seed
   ramps start→peak via `buildSeededWeeklyTargets`
   (`blockLedgerGather.js:429`); anything unresolved keeps the static
   `mev + (mav-mev)*progress` template (`database.js:5000`). The row's
   `source` column records which path wrote it (`database.js:4985`).
3. **During the block**, `planned_muscle_volume` drives real session set
   counts through `coachApply.js:324` `computeWeeklySessionAllocation`
   (called from `sessionAdjustments.js:48` `getSessionWeeklyAllocation`).
4. **Block end** is date-derived: `mesocycle.js:533` `getBlockStatus`
   returns `awaitingDecision` once `currentWeek > recoveryWeek`.
5. **Ledger computation** (`blockLedgerRunner.js:213`
   `computeAndStoreBlockLedger`) runs only on `awaitingDecision`
   (`:232`), is idempotent by `LEDGER_VERSION` (`:236-247`), and persists
   JSON to `mesocycles.block_ledger` via `database.js:5388`.
6. **Decision** (`PlansScreen.js:588` `runBlockActivation`): `repeat` or
   (Pro only) `adjust`. `adjust` calls `buildSeedRangesForNextBlock`
   (`blockLedgerRunner.js:740`), which back-fills any unjudged finished
   blocks first (`:743`, `backfillMissingBlockLedgers` at `:571`).
7. **Outcome recorded** back onto the source ledger as `seedOutcome`
   (`blockLedgerRunner.js:836` `recordSeedOutcome`).

### 2.3 Progression post-C20

`livePrescription.js` is live and wired: `ActiveWorkoutScreen.js:72`
imports `resolveSetPrescription`, called at `:1744`, `:2102`, `:2239`,
`:3107`. `algorithms.js:354-371` records that `computeSetTargets` and
`stalledAdvice` were retired. The resolver is a pure recompute over at most
the **3 most recent** sessions for that exercise
(`livePrescription.js:566` `.slice(0, 3)`), inside a **45-day** window
(`livePrescription.js:76` `FORTY_FIVE_DAYS_MS`, applied `:562`). It
persists **nothing**.

### 2.4 PR detection

`algorithms.js:389` `detectPR` is the single detector, reused verbatim by
the live "record if you hit this" line (`workoutRecordLine.js:115`). Three
ordinary record types (`1rm_estimate`, `heaviest_weight`,
`most_reps_at_weight`) and, for `loadSemantics === 'assisted'`, an inverted
branch (`algorithms.js:414-445`) producing `least_assistance` and
`most_reps_at_weight`, with no e1RM estimate at all. Rank order at
`algorithms.js:499-507` puts `least_assistance` level with
`heaviest_weight`. **There is no `personal_records` table**: `database.js:7739`
and `:7848` both state it "was never created"; every PR figure is derived
from `workout_sets` on demand (`database.js:7486` `getWeeklyPRCount`).

### 2.5 Plateau detection

`algorithms.js:1408` `detectPlateau` — per exercise, newest-first sessions,
best eligible e1RM per session (`sessionBestE1rm`, `algorithms.js:1368`),
4-session qualification window, ≥2 consecutive non-progressing comparisons,
then a duration extension backwards over the full eligible history bounded
by `PLATEAU_MAX_GAP_DAYS = 14` (`algorithms.js:1393`). Requires
`PLATEAU_MIN_WEEKS = 3` distinct local weeks and `PLATEAU_MIN_SPAN_DAYS = 14`.
No durable state; recomputed by `plateauSurfacing.js:63` and
`exercise/intent.js:97`.

---

## 3 FILES & FUNCTIONS

**Landmarks**
- `src/lib/algorithms.js:25` `VOLUME_LANDMARKS`; `:965` `computeAdaptiveLandmarks`; `:237` `allocateExerciseVolume`; `:270` `calculateWeeklyVolume`; `:306` `getVolumeStatus`.
- `src/lib/planEngine.js:127` `computeLandmarks`; `:296` `GENERATOR_LANDMARK_OVERRIDES`; `:313` `SPEC_LANDMARKS`.
- `src/lib/effectiveLandmarks.js:41` `mergeLandmarkPrecedence`; `:78` `getEffectiveLandmarks`; `:95` `isManualEdit`; `:118` `getManualLandmarks`; `:139` `getManualVolumeMuscles`; `:151` `getAdaptedLandmarks`.
- `src/lib/learnedRange.js:102` `computeLearnedRange`.

**Block system**
- `src/lib/interBlock.js:67` `LEDGER_VERSION=1`; `:68` `LEDGER_ALGORITHM_VERSION=2`; `:70` `BLOCK_CLASS`; `:162` `classifyMuscleBlock`; `:441` `buildBlockLedger`.
- `src/lib/blockMetrics.js:164` `computeBlockPerformance`; `:461` `effectiveBlockSlopePct`; `:105` `theilSenSlopePct`.
- `src/lib/blockLedgerGather.js:64` `remapSoreness13to15`; `:106` `computeMuscleRecoveryAggregates`; `:161` `computeReadinessSlope`; `:169` `countSleepFlaggedWeeks`; `:186` `deriveDeloadFlags`; `:216` `computeReboundWindows`; `:249` `sumPlannedSets`; `:265` `sumCompletedSets`; `:290` `collectMuscleSessionRows`; `:325` `computeAchievedWeeklyPeak`; `:383` `profileAdjustedPrior`; `:405` `priorLedgerEntries`; `:421` `trailingStaleCount`; `:429` `buildSeededWeeklyTargets`.
- `src/lib/blockSeed.js:59` `resolveSeedRange`.
- `src/lib/blockLedgerRunner.js:98` `judgedEvidenceAgeByMuscle`; `:132` `learnedActionability`; `:157` `probeEligible`; `:181` `replayableMesos`; `:198` `readSuppression`; `:213` `computeAndStoreBlockLedger`; `:454` `getAchievedWeeklyPeaks`; `:500` `computeLiveBlockSlopePct`; `:571` `backfillMissingBlockLedgers`; `:672` `buildLearnedSeedRangesForActivation`; `:740` `buildSeedRangesForNextBlock`; `:836` `recordSeedOutcome`.
- `src/lib/mesocycle.js:28-29` block constants; `:73` `localDaysElapsed`; `:164` `getCurrentBlockWeekIndex`; `:513` `blockCompletionState`; `:533` `getBlockStatus`.
- `src/lib/blockExplain.js:109` `summariseSeededPlan`; `:193` `buildBlockStartLines`; `:273` `buildLedgerReflectionRows`; `:308` `buildSeedReceipt`; `:393` `recoveryProposalLine`.
- `src/lib/nextBlockPreview.js:71` `buildAdjustPreview`.

**Apply / deload**
- `src/lib/coachApply.js:50` `ABSOLUTE_WEEKLY_SET_CEILING = 30`; `:140` `deloadSharePct`; `:152` `deloadFloor`; `:175` `computeDeloadVolume`; `:269` `computeVolumeApply`; `:324` `computeWeeklySessionAllocation`; `:210` `markApplied`; `:249` `isApplied`.

**Weekly coach volume decision**
- `src/lib/weeklyCoach.js:342` `getPerformanceScore`; `:371` `contextAdjustedRecovery`; `:398` `autoregulationMatrix`; `:1398` `volumeDecisionMemory` call; `:57` `computeEWMA`.
- `src/lib/coachIntervention.js:92` `OBSERVE` windows; `:156` `buildInterventionRecord`; `:201` `interventionsFromHistory`; `:229` `observationWindowMet`; `:256` `classifyOutcome`; `:398` `wouldReverseRecent`; `:439` `doseEscalation`; `:515` `volumeDecisionMemory`; `:565` `holdReinforcement`.

**Session grain**
- `src/lib/algorithms.js:1082` `computeSessionAdjustments`; `:817` `computeAdaptiveDecision`; `:930` `runAdaptiveEngine`; `:562` `shouldDeload`; `:685` `buildLast4WeekDeloadBuckets`.
- `src/lib/sessionAdjustments.js:48` `getSessionWeeklyAllocation`; `:~90-190` `computeAndLogSessionAdjustments`.

**Live prescription (C20)**
- `src/lib/livePrescription.js:116` `resolveLoadIncrement`; `:178` `discountOutliers`; `:195` `nextSessionOpeningLoad`; `:263` `stableBackoffRatio`; `:314` `expectedReps`; `:489` `assembleEvidencePacket`; `:870` `resolveSetPrescription`.

**PR / plateau / strength**
- `src/lib/algorithms.js:101` `calculate1RM`; `:384` `isE1rmEligibleRow`; `:389` `detectPR`; `:524` `bestPRPerExercise`; `:1408` `detectPlateau`; `:1576` `detectProgressionConsistency`; `:1636` `detectLaggingMuscles`.
- `src/lib/workoutRecordLine.js:54` `buildRecordLine`.
- `src/lib/liftProgress.js:34` `buildLiftProgressRows`; `src/lib/strengthStandards.js:16` `STRENGTH_STANDARDS` (bodyweight-ratio guide, no learning).

**Structure memory / epoch**
- `src/lib/programmeStructureMemory.js:59` `structureKey`; `:126` `blockOutcomeFromLedger`; `:166` `structureEvidence`; `:205` `demonstratedStructure`; `:239` `structureMemoryCopy`.
- `src/lib/programmeEpoch.js:155` `structureSignature`; `:226` `countEpochBlocks`.
- `src/lib/planAutoGen.js:180` `readDemonstratedStructure`.

**Effective maintenance (memo + revalidation marker)**
- `src/lib/effectiveMaintenance.js:15-18` constants; `:78` `semanticEvidenceSignature`; `:110` `formulaContextSignature`; `:131` `effectiveMaintenanceVersionKey`; `:162` `revalidationContextSignature`; `:170` `isValidEffectiveMaintenanceMemo`; `:219` `resolveEffectiveMaintenance`; `:315` `deriveEffectiveMaintenanceMemo`.
- `src/lib/effectiveMaintenanceService.js:51` `resolveEffectiveMaintenanceForUser` (marker write at `:87-113`); `:119` `learnEffectiveMaintenanceForUser`.

---

## 4 TABLES & FIELDS (local + cloud, migration refs)

### 4.1 `mesocycles` (local `database.js:292`)
`id, user_id, name, start_date, end_date, duration_weeks, focus, goals,
is_active, deload_week, auto_regulation_enabled, created_at, updated_at`,
plus later columns `planned_weeks`, `block_type`, `rir_ladder`,
`progression_anchor_week`, `mesocycle_id` links, and
**`block_ledger TEXT`** added at `database.js:2123`.
Cloud: `block_ledger jsonb` via `supabase/migrate_131_mesocycles_block_ledger.sql`
(applied to production 2026-08-09, `supabase/README.md:331`);
`deload_week integer` via `migrate_129` (applied 2026-08-06,
`supabase/README.md` CURRENT STATUS block).

**`block_ledger` JSON shape** (written at `blockLedgerRunner.js:434-444`):
```
{ version, algorithmVersion, entries[], proposedRecoveryDays, suppressed,
  weeksSinceBlockEnd, mesocycleId, mesocycleName, programmeSignature,
  blockStartDate, blockEndDate, computedAt, seedOutcome? }
```
Each `entries[]` element (`interBlock.js:266-296`):
```
{ muscle, classification, confidence, evidence[5], observed:{startSets,
  achievedPeak, plannedPeak, suppressed}, upwardCarryPrevented,
  proposal:{startSets, peakSets, stimulusChange, deferredToManual},
  rationale }
```
`evidence[]` signals are exactly `e1rm_slope_pct`, `pr_density_discounted`,
`pr_count_raw`, `recovery_cost_weight`, `adherence_ratio`
(`interBlock.js:194-200`), plus optional `progression_suppressed`,
`evidence_weeks_old`, `insufficient` (`:201-206`, `:322`, `:327`, …).

### 4.2 `mesocycle_weeks` (local `database.js:506`)
`id, mesocycle_id, week_index, is_deload, rir_target, started_at,
completed_at, notes, created_at`. `is_deload = 1` on a non-final week is
the persisted "applied early deload" signal (`blockLedgerRunner.js:270`).

### 4.3 `planned_muscle_volume` (local `database.js:517`)
`id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source,
created_at, updated_at`. Row id is deterministic:
`pmv_${week.id}_${muscle}` (`database.js:5001`), inserted with
`INSERT OR IGNORE` (`:5002`, `:5017`).
`source` values written: `'template'`, `'seed_manual'`, `'seed_ledger'`,
`'seed_learned'`, `'seed_learned_probe'`, `'seed_profile'`,
`'seed_research'` (`database.js:4985-4987`), plus `'coach'` written by the
Apply path (read at `sessionAdjustments.js:148`).
Cloud: `mev, mav, mrv, source` added by
`supabase/migrate_132_planned_muscle_volume_provenance.sql`
(applied 2026-08-12, `supabase/README.md:332`).
A local sync-mirror `planned_muscle_volume_sync` also exists
(`database.js:806`).

### 4.4 `adaptation_events` (local `database.js:529`)
`id, mesocycle_week_id (NOT NULL), muscle, exercise_id, decision,
delta, reason_code, reason_text, signals_json, created_at`.
**No `user_id` column** — ownership is derived by joining
`mesocycle_weeks → mesocycles.user_id` (`database.js:5436-5438`,
`:8316-8319`). Cloud shape differs: `event_type` + `payload` JSON, mapped
at push time (`sync.js:1499-1512`). Local sync mirror
`adaptation_events_sync` at `database.js:816`.

### 4.5 `effective_maintenance_memos` (local `database.js:335`, cloud `migrate_141`)
One row per user (PK `user_id`). Durable residual model:
`cumulative_residual_kcal`, `formula_prior_kcal_at_derivation`,
`effective_maintenance_kcal_at_derivation`, `source`, `status`, `reason`,
`algorithm_version`, `as_of`, `evidence_signature`, `food_days_logged`,
`weight_points`, `bodyweight_kg`, `goal_phase`, `activity_level`,
`formula_method`, `formula_context_signature`, `large_divergence`,
**`revalidation_started_at`**, **`revalidation_context_signature`**,
`version_key`, `created_at`, `updated_at`.
Cloud CHECKs enforce `effective = prior + residual`, `food_days_logged >= 5`,
`weight_points >= 14`, and that the two revalidation fields are both null or
both set (`migrate_141:20-43`). A deterministic refuse-stale trigger is
defined at `migrate_141:49-68`.

### 4.6 Non-table durable state
- **Manual landmarks**: AsyncStorage `@volyume_landmarks_<userId>`, a whole-blob
  JSON of `{ [muscle]: {mev,mav,mrv,explicit?} }`
  (`effectiveLandmarks.js:123`, written `VolumeHeatmapScreen.js:286`).
  Synced through the `user_prefs` blob path (`sync.js:1702`, `:1762`).
- **Intervention memory**: lives inside `coach_outputs.output_json` at
  `appliedAdjustments[key].intervention` (`coachApply.js:210` writes,
  `coachIntervention.js:201` reads). No dedicated table.
- **Session resolutions**: `session_resolutions` (cloud `migrate_140`) —
  read by `database.js:5104` to exclude ENDED_EARLY workouts from the
  "fully completed" subset.

---

## 5 READERS

| Durable state | Read by |
|---|---|
| `VOLUME_LANDMARKS` | `planEngine.js:127,313`; `algorithms.js:306,965,1146`; `effectiveLandmarks.js:29`; `blockLedgerGather.js:384`; `blockLedgerRunner.js:311,352,363,690,761`; `blockSeed` via caller; `nextBlockPreview.js:101`; `database.js:4500` |
| Manual landmark blob | `effectiveLandmarks.js:118,139,151`; `blockLedgerRunner.js:305,690,772`; `VolumeHeatmapScreen.js:207`; `CoachOutputScreen.js:1822` |
| Adapted landmarks (recomputed) | `effectiveLandmarks.js:160`; `sessionAdjustments.js:131`; `blockLedgerRunner.js:307,355` |
| `mesocycles.block_ledger` | `blockLedgerGather.js:405` `priorLedgerEntries`; `blockLedgerRunner.js:98,681,747`; `planAutoGen.js:192`; `blockExplain.js:273,308,393`; `nextBlockPreview.js:73`; `PlansScreen.js`, `BlockReflectionScreen.js:162` |
| `planned_muscle_volume` | `blockLedgerRunner.js:253` (per block); `sessionAdjustments.js:55` (session allocation); `coachApply.js:175,269` (deload/volume apply); `useProgressData.js:238`; `blockExplain.js:109` |
| `adaptation_events` | `components/EngineLog.js:71` (4-week window); `sessionAdjustments.js:127` (6-week window) → `algorithms.js:1126-1138` (add-frequency cap + revert memory) |
| `mesocycle_weeks.is_deload` | `blockLedgerRunner.js:269-271` → deload flags, rebound windows, recovery-row exclusion, `lateRecoveryOk` exclusion |
| Effective-maintenance memo | `effectiveMaintenanceService.js:59` → `resolveEffectiveMaintenance`; `coachApply.js:104` diet-break; weekly coach nutrition path |
| Intervention records | `weeklyCoach.js:735,1398`; `CoachOutputScreen.js:1813` |

---

## 6 WRITERS

| Durable state | Written by | Trigger |
|---|---|---|
| `mesocycles.block_ledger` | `database.js:5388` `storeBlockLedger`, called from `blockLedgerRunner.js:432` and `:846` | block finished (`awaitingDecision`) and a caller asks; or `recordSeedOutcome` after a decision |
| `planned_muscle_volume` (initial) | `database.js:4942` `generateInitialPlannedVolume` (`INSERT OR IGNORE`) | plan/block activation (`database.js:4500`) |
| `planned_muscle_volume` (updates) | `database.js:5483` `upsertPlannedMuscleVolume` | coach Apply of `volumeDelta` / deload (`coachApply.js:269,175`) |
| `adaptation_events` | `database.js:5398` `createAdaptationEvent` | (a) `sessionAdjustments.js:173` for every session decision incl. holds; (b) `WorkoutSummaryScreen.js:845` for each muscle's weekly adaptive decision; (c) `useAppStore.js:1296` |
| Manual landmarks | `VolumeHeatmapScreen.js:286,331,354` | user edits volume targets |
| Effective-maintenance memo | `database.js` `saveEffectiveMaintenanceMemo` via `effectiveMaintenanceService.js:105` (marker) and `:136` (learned memo) | context change (marker) / weekly coach run (memo) |
| Intervention record | `coachApply.js:210` `markApplied` writing into `coach_outputs.output_json` | user taps Apply |

**Nothing in the progression domain writes durable state automatically at
session end except `adaptation_events`.** The ledger requires a finished
block; planned volume requires activation or an explicit Apply.

---

## 7 CURRENT INVARIANTS

Stated as they are implemented, with the enforcement site.

1. **Manual beats everything, in both resolvers.** `effectiveLandmarks.js:57-63`
   and `blockSeed.js:71-87`. A manual muscle's ledger entry is
   `deferredToManual` (`interBlock.js:172`, set from
   `blockLedgerRunner.js:367`) and its proposal numbers are nulled
   (`interBlock.js:290-291`).
2. **Only a REAL edit counts as manual.** `effectiveLandmarks.js:95`
   `isManualEdit`: `explicit === true`, else at least one band differs from
   research. Untouched editor defaults fall through to adapted/research.
3. **Research MEV is the absolute floor anchor.** `learnedRange.js:117-125`
   (`floorAnchor` out-ranks every cap), `blockSeed.js:61-67` (`clamp`),
   `interBlock.js:245` (hold cap `max(previousStart, researchMev)`).
4. **`ABSOLUTE_WEEKLY_SET_CEILING = 30`** backstops every path:
   `coachApply.js:50`, applied at `learnedRange.js:123`,
   `blockSeed.js:64-65`, `interBlock.js:229`, `coachApply.js:275`.
5. **No upward carry under suppression or stale evidence.**
   `interBlock.js:240-251`; suppression read fail-CLOSED at
   `blockLedgerRunner.js:198-203` (an ED-flag or wellbeing read failure
   counts as suppressed). Learned band skipped under suppression
   (`blockSeed.js:181`); ledger seed degrades to repeat numbers
   (`blockSeed.js:108-112`); learned deload sizing withheld
   (`blockSeed.js:132`).
6. **`STALE_EVIDENCE_WEEKS = 4`** (`interBlock.js:118`) is the single
   actionability boundary, shared by the classifier (`interBlock.js:241`),
   the Adjust path (`blockLedgerRunner.js:791`) and the activation carry
   (`:781`) through one helper `learnedActionability`
   (`blockLedgerRunner.js:132`).
7. **A block that cannot be judged teaches nothing and erases nothing.**
   `INSUFFICIENT_DATA` entries are skipped by the learned replay
   (`learnedRange.js:148`), refused as a seed source (`blockSeed.js:94`),
   and do not restart the freshness clock (`blockLedgerRunner.js:112`).
8. **Manual-override blocks do not teach.** `learnedRange.js:152`.
9. **Suppressed blocks may lower but never raise.** Ceiling
   (`learnedRange.js:168`), established start (`learnedRange.js:227-231`).
10. **The learned floor is monotone downward only.** `learnedRange.js:202-209`.
11. **The ledger is computed once and frozen.** Idempotent by
    `LEDGER_VERSION` (`blockLedgerRunner.js:236-247`); an
    `algorithmVersion` mismatch deliberately does **not** force recompute
    (`interBlock.js:56-64`).
12. **Deleted raw evidence stops teaching but the ledger stays readable.**
    `blockLedgerRunner.js:181` `replayableMesos` + `database.js:5067`
    `getBlocksWithTrainingEvidence`, fail-OPEN on read error.
13. **A deload can only reduce a row.** `coachApply.js:187`
    (`if (current > target)`), and the recovery week can never exceed the
    block's lightest training week (`blockSeed.js:150-154`).
14. **The session layer never pushes past MAV or MRV and never writes
    next-week volume.** `algorithms.js:1216-1220`;
    `WorkoutSummaryScreen.js:829-834` records the founder decision.
15. **Confirm-then-apply, end to end.** An unapplied coach proposal cannot
    move a session: `sessionAdjustments.js:148` gates `volumeSignal` on a
    persisted `source === 'coach'` row.
16. **`weeklyVolumeSummary` intent must match persisted delivery** —
    pinned by `campaign16.volumeIntegrity.test.js`.
17. **Free tier gets no coaching carry.** `blockLedgerRunner.js:673`
    (`tier !== 'pro'` returns null); adapted layer Pro-gated
    (`effectiveLandmarks.js:151`).
18. **Free's only reachable block intent is `repeat`.**
    `PlansScreen.js:590` (`intent === 'adjust' && tier === 'pro'`).

---

## 8 CURRENT TESTS

397 test files under `src/lib/__tests__/`. The suites that pin this domain:

| Suite | Pins |
|---|---|
| `interBlock.stage2.test.js` | quadrant classification, caps, suppression, low-data gates; written test-first |
| `blockMetrics.stage3.test.js` | stable-exercise rule, per-exercise slopes never averaged raw, discounts, PR density denominator |
| `learnedRange.stage5.test.js` | ceiling/floor fold rules, research-MEV anchor, suppressed no-raise, manual-override non-teaching |
| `blockSeed.stage6.test.js` | the five-step fallback chain, repeat vs adjust semantics, suppression degradation |
| `blockLedgerGather.stage6.test.js` | scale contracts (soreness 1-3 → 1-5, readiness slope /100), deload flags, rebound windows, ramp |
| `adaptiveBlock.e2e.test.js` | one synthetic athlete, six muscles, six outcomes through the whole pure chain, plus suppression/stale/manual/null variants |
| `effectiveLandmarks.test.js` | manual > adapted > research, per muscle, tier gate, fail-open |
| `campaign8.learnedCarry.test.js` | activation carry across plan/phase change, Free→Pro, manual, suppression |
| `campaign10n.learnedFreshness.test.js` | Adjust-path staleness gate; explicitly records that the learned floor carries no memory of a start |
| `campaign11.adaptiveMemory.test.js` | `establishedStart`, one freshness law, bounded capacity probe |
| `campaign10j/10k` | early-deload exclusion from recovery aggregates and from `lateRecoveryOk` |
| `campaign10g.blockEvidence.test.js` | live block slope seam |
| `campaign12.plateauIntegrity.test.js` | plateau basis (best e1RM), time span, one verdict |
| `campaign16.volumeIntegrity.test.js` | target vs preview vs persisted vs activated planned volume |
| `livePrescription.{test,scenarios,properties,fq3}.test.js` | the C20 resolver, 13 provenance codes, determinism |
| `mesocycle.f10.dst.test.js`, `blockWeekResolver.test.js` | DST-safe week maths; single-resolver guard |
| `campaign19.*`, `adaptiveTdee.b1.replay.test.js` | effective-maintenance memo contract and replay |
| `planengineLandmarkSource.test.js`, `prefSync.landmarks.test.js` | landmark source and pref sync |

Coverage gaps OBSERVED (no suite found by filename or grep):
- No test pins the *unit* of `getAdaptiveLandmarkHistory.weeklyVolume`
  against `computeAdaptiveLandmarks`'s `bestVolume → mav` use (§11.1).
- No test pins per-workout feedback attribution (`joint_discomfort`,
  `overall_pump`, `soreness_24h_before`) to the *right* muscle when a
  session trains several muscles (§11.2).
- No test pins behaviour for a custom exercise with a null `primary_muscle`
  (§11.5).

---

## 9 REUSABLE INFRASTRUCTURE

Things CC25 could build on that already exist and are load-bearing:

1. **A versioned, append-only-in-practice per-block record**
   (`mesocycles.block_ledger`) with a schema version, an algorithm version,
   a programme-structure signature, a `computedAt` stamp and a
   `seedOutcome` provenance field (`blockLedgerRunner.js:434-444`,
   `:836`). It already carries a per-entry `suppressed` marker
   (`interBlock.js:275`) that gates learning direction — the closest
   existing analogue to a "was this evidence representative?" flag.
2. **A single evidence-actionability boundary** with one helper
   (`learnedActionability`, `blockLedgerRunner.js:132`) and one constant
   (`STALE_EVIDENCE_WEEKS`, `interBlock.js:118`), already shared by two
   entry points that used to disagree.
3. **A named provenance vocabulary** for prescriptions: 13 codes in
   `livePrescription.js:52-66` and 7 `source` values on
   `planned_muscle_volume` (`database.js:4985`) — the explanation layer
   (`blockExplain.js`) is built to read written rows, never intent.
4. **A fail-closed suppression read** (`blockLedgerRunner.js:198`) that
   ORs calm mode and an open ED flag and treats a read failure as
   suppressed.
5. **An evidence-deleted → stop-teaching mechanism**
   (`replayableMesos`, `blockLedgerRunner.js:181`) that keeps the historical
   record readable while removing it from future personalisation.
6. **A confounding-aware outcome memory** with an explicit CONFOUNDED
   state and per-domain observation windows (`coachIntervention.js:92`,
   `:256`), already consulted by the volume decision
   (`weeklyCoach.js:1398`).
7. **A residual-plus-marker durable-memory pattern**
   (`effective_maintenance_memos`): store a *residual against a current
   prior* rather than an absolute, plus a `revalidation_started_at` /
   `revalidation_context_signature` pair that invalidates old evidence when
   the *context* changes, requiring fresh post-marker evidence before the
   memory regains authority (`effectiveMaintenance.js:340-357`,
   `effectiveMaintenanceService.js:87-113`). This is the only mechanism in
   the repo that already models "the person's context changed, so the old
   learning is held rather than deleted".
8. **One shared muscle allocator** (`algorithms.js:237`) used by every
   volume consumer, and one shared DST-safe day counter
   (`mesocycle.js:73`).
9. **`exercise_intent` / PATTERN_AVOID (C31)** and `load_semantics` (C32)
   already exist; `detectPR`'s assisted branch (`algorithms.js:414`) is a
   worked precedent for "the same metric means something different under a
   different equipment context".

---

## 10 CONFLICTS WITH NEW SYSTEM

Stated as observed facts about today's code, not as recommendations.

**C1 — Nothing in this domain records the context a set was performed
under.** OBSERVED: `workout_sets` rows are consumed by
`blockMetrics.js:164`, `blockLedgerGather.js:265,325`,
`database.js:6543`, `livePrescription.js:489` and
`database.js:3351` purely on `(exercise_id, weight, actual_reps, set_type,
created_at)`. No consumer reads any constraint, episode, restriction or
capability marker, because none exists on the row. The only
"representativeness" flag anywhere is `observed.suppressed`
(`interBlock.js:275`), which means *calm mode or an open ED flag*, not
*this training was constrained*.

**C2 — The block ledger absorbs a constrained block as ordinary
evidence, and it is frozen.** A finished block is judged once
(`blockLedgerRunner.js:236-247`) and never recomputed even when the
algorithm version moves (`interBlock.js:56-64`). Because the ledger is the
*only* record the learned range replays (`learnedRange.js:15-20` states
this explicitly: "Pure replay, no parallel store"), a constrained block's
verdict is permanent unless its raw sets are deleted
(`blockLedgerRunner.js:181`). There is no per-entry "exclude from
learning" that the classifier can be told after the fact.

**C3 — Suppression is a global user state, not a per-muscle or
per-episode one.** `readSuppression(userId)`
(`blockLedgerRunner.js:198`) returns one boolean for the whole ledger; it
is passed to `buildBlockLedger` once (`:399`) and stamped on every entry.
A shoulder episode cannot suppress upward learning for delts while leaving
quads free.

**C4 — Two landmark precedences exist and the learned band is absent
from one of them.** `mergeLandmarkPrecedence`
(`effectiveLandmarks.js:41`) has no learned layer; `resolveSeedRange`
(`blockSeed.js:59`) has no adapted layer as a source. A capability-aware
band would have to be inserted into both, or the divergence becomes
three-way.

**C5 — Muscle attribution is exercise-metadata-driven and binary.**
`allocateExerciseVolume` (`algorithms.js:237`) credits primary 1.0 and each
secondary at `contribution ?? 0.5`. A substituted or adapted movement is
credited to whatever its own `primary_muscle`/`secondary_muscles` say;
there is no notion of "this is a reduced-ROM / seated / unilateral variant
of the same slot". `blockMetrics.js:216` requires PRIMARY role for a set to
count as an exposure at all.

**C6 — Exercise substitution is treated only as a *measurement* problem,
never as a *context* one.** `blockMetrics.js:274` marks an exercise `isNew`
(×0.5 weight) and `:283` marks a rep-range shift (×0.5); `:307` computes
`discontinuity` when fewer than half the muscle's block sessions came from
stable exercises, which forces `INSUFFICIENT_DATA` (`interBlock.js:336`).
That correctly refuses to *judge* a mid-block swap, but a block run
*entirely* on substituted movements is fully stable, fully judged, and
teaches the ledger and the learned range as if nothing had changed.

**C7 — The freshness/staleness model is calendar-only.**
`STALE_EVIDENCE_WEEKS` (`interBlock.js:118`) and
`getBlockStatus().weeksOverdue` (`mesocycle.js:568`) measure elapsed weeks.
Nothing measures "how long has this person been under this restriction",
and `reEntryCheck.js:20-24` explicitly refuses to encode elapsed time as
detraining evidence.

**C8 — `adaptation_events.mesocycle_week_id` is NOT NULL, so the entire
session-adjustment learning loop is off outside a mesocycle.**
`sessionAdjustments.js:9-14` states this; the add-frequency cap and revert
memory therefore do not exist for a user training outside an active block.

**C9 — Blueprint statement now stale.**
`docs/blueprint-adaptive-mesocycle-2026-08-09.md:288-290` lists
"Ledger persistence (additive: JSON column on mesocycles **or a small
table**)" as an open shape choice; the JSON column was chosen and is live
(`migrate_131`). Recorded because a future reader could take the blueprint
as still-open design.

**C10 — Free tier has no learned volume memory at all.**
`blockLedgerRunner.js:673` returns null for a non-Pro activation, and
`PlansScreen.js:590` collapses every Free block decision to `repeat`.
Under FD-1 (core capability accommodation not Pro-gated) this is a direct
collision: the mechanisms that would remember "this person's demonstrated
working range under their capability" are all Pro today.

---

## 11 PROVENANCE RISKS

**P1 — `weeklyVolume` fed to `computeAdaptiveLandmarks` is a
PER-SESSION set count, and it becomes the adapted MAV.** OBSERVED:
`database.js:6548-6570` groups `GROUP BY w.id, e.primary_muscle` and
returns `weeklyVolume: row.set_count` (`:6614`) — the muscle's set count in
**one workout**. `algorithms.js:1050` then sets
`mav: Math.max(base.mev + 1, Math.min(base.mrv - 1, Math.round(bestVolume)))`
where `bestVolume` is the highest-"quality" entry's `weeklyVolume`
(`:1039-1046`). A muscle trained twice a week at 6 sets/session has a true
weekly volume of 12 but yields `bestVolume = 6`. Consequence: the adapted
MAV is systematically pulled toward a single session's count, and — because
`mergeLandmarkPrecedence` puts ADAPTED above RESEARCH for every Pro user
with ≥3 data points (`effectiveLandmarks.js:64-69`) — that number becomes
the displayed "good range" ceiling on the heatmap and Analytics, and the
`adaptedMrv` clamp on the learned ceiling
(`blockLedgerRunner.js:355`). The variable name says weekly; the query
produces per-session. No test pins it.

**P2 — Per-workout feedback is attributed to every muscle in the
workout.** `overall_pump`, `soreness_24h_before` and `joint_discomfort` are
columns on `workouts` (`database.js:549` for `joint_discomfort`).
`getAdaptiveLandmarkHistory` (`database.js:6548-6556`) emits one row per
`(workout, primary_muscle)` carrying the same three workout-level values.
At block grain, `collectMuscleSessionRows` (`blockLedgerGather.js:290`)
does the same: any workout in which the muscle appeared as primary
contributes that workout's soreness and joint numbers to *that muscle's*
recovery aggregate. A shoulder problem reported once on a push day
therefore lowers the adapted landmarks and raises the block-ledger
`recovery_cost_weight` for chest, triceps and front delts alike. This is
the single largest cross-contamination path in the domain for a
capability-aware system.

**P3 — Block-level systemic signals are mirrored into every muscle's
recovery input.** `blockLedgerRunner.js:385-393` copies `readinessSlope`,
`sleepFlaggedWeeks`, `deloadFlagFired` and `deloadFlagMidBlock` into every
muscle. `interBlock.js:127-138` weights each at 1 and calls cost
"excessive" at 2 (`:105`). Two systemic signals therefore make *every*
muscle `recoveryPoor`. The code acknowledges and bounds this
(`interBlock.js:79-97`, RA6-2 lowering the deload flag from 2 to 1), but
the mirroring itself is unchanged.

**P4 — Scale mismatch between `achievedPeak` and `plannedPeak` /
`previousStart`, and the code contradicts itself about it.**
`computeAchievedWeeklyPeak` (`blockLedgerGather.js:325`) sums allocator
credit (primary 1.0 + secondary 0.5). `previousStart` and `plannedPeak`
come from `planned_muscle_volume.planned_sets`
(`blockLedgerRunner.js:343-348`), which `computeWeeklySessionAllocation`
scales by **primary muscle only** (`coachApply.js:335-341`).
`blockSeed.js:141-143` states the mismatch as fact ("achieved peaks carry
secondary half-credit; the planned week they recover from does not"), while
`blockLedgerGather.js:259-263` claims `sumCompletedSets` uses "the same
attribution the planned targets were built with, so the adherence ratio
compares like with like". Both comments cannot be true. The adherence ratio
(`interBlock.js:190`) and the learned ceiling (`learnedRange.js:167-193`,
which learns from `achievedPeak`) sit on the allocator scale; the floor and
`establishedStart` (`learnedRange.js:202,224`) sit on the planned scale.

**P5 — A custom exercise with no primary muscle earns zero credit,
silently.** `ExercisePickerModal.js:232-236` validates only the name;
`primaryMuscle: createMuscle || null` at `:241` allows null.
`allocateExerciseVolume` returns `[]` for a null primary
(`algorithms.js:241-243`), so such a set contributes nothing to
`calculateWeeklyVolume`, `sumCompletedSets`, `computeAchievedWeeklyPeak` or
`getAdaptiveLandmarkHistory` (whose `JOIN exercises` also requires
`e.primary_muscle` non-null to bucket, `database.js:6577`). CSV import
creates such rows unconditionally (`importExternal.js:477-486`,
`primary_muscle NULL`). Directly relevant to FD-1's "adapted/custom
exercise logging" on Free.

**P6 — `getWeeklyVolumeByMuscle` and `getLastTrainedByMuscle` read only
the `exercises` table.** `database.js:3381` selects from `exercises`;
`database.js:3418-3423` joins `exercises`. Custom exercises created in-app
*are* written into `exercises` with `is_custom = 1`
(`ExercisePickerModal.js:261`, `database.js:2972` `insertExerciseWithId`),
so this is currently consistent — but `getExerciseRowsById`
(`database.js:5186`) additionally unions `custom_exercises`, so the two
readers can diverge for any row that reaches `custom_exercises` without an
`exercises` mirror. UNVERIFIED whether such rows can exist post-restore;
`sync.js:2590` restores cloud customs back into `exercises` with
`is_custom: 1`.

**P7 — `getBlockTrainingData` returns ENDED_EARLY workouts inside
`workouts` and `sets`.** `database.js:5104-5110` computes a
`fullyCompletedWorkouts` subset, but `blockLedgerRunner.js:317-332` passes
`training.sets` and `training.workouts` (the full sets) to
`computeBlockPerformance` and `collectMuscleSessionRows`. Only
`planAutoGen.js:204` uses `fullyCompletedWorkouts`. So a part-performed
session's sets and feedback are ordinary block evidence.

**P8 — `LEDGER_ALGORITHM_VERSION` is recorded but deliberately not
consulted for reuse.** `interBlock.js:56-64` documents that a version
mismatch must never force recompute. So a ledger written under
algorithm v1 (pre-C10L strength model) sits alongside v2 ledgers in the
same replay (`learnedRange.js:139`) with no discounting.

**P9 — `programmeSignature` is only snapshotted for the ACTIVE block.**
`blockLedgerRunner.js:407` guards on `meso.isActive`. A ledger backfilled
for a switched-away block (`:571`) carries `programmeSignature: null`,
and `planAutoGen.js:194-197` then drops that block from structure evidence
entirely. So the structure memory sees only blocks judged while active.

**P10 — Manual landmarks are an AsyncStorage whole-blob synced through
`user_prefs`.** `sync.js:1746` describes it as "One whole-blob" —
last-writer-wins over the entire table, not per muscle. A concurrent edit
on two devices loses one device's whole landmark table.

**P11 — `interBlock` proposals do not retain `doseResponse`.**
`blockLedgerRunner.js:143-155` documents this and reconstructs probe
eligibility by *inferring* from `proposal.startSets > observed.startSets`.
The inference is one-way and conservative, but it means the stored ledger
cannot answer "why did this muscle earn a climb" directly.

---

## 12 SYNC / MIGRATION ISSUES

**S1 — Same-version block ledgers never cross devices.**
`database.js:8899-8922`: a newer cloud row does **not** replace a local
`block_ledger` of the same `LEDGER_VERSION`; the local one is kept. A
device that pulled less of the block's evidence keeps its own poorer
judgement rather than accepting a fuller one. This is deliberate and
documented (C6 RC6-4), but it means the ledger is effectively
device-authoritative per version.

**S2 — Cloud-null preserves local ledger.** `database.js:8912` —
required because pre-`migrate_131` cloud rows carry none.

**S3 — Stale code comment about `deload_week`.**
`database.js:8956-8960` asserts "The cloud has NO deload_week column
(confirmed absent from every supabase/migrate_*.sql), so m.deload_week is
always undefined here". OBSERVED FALSE:
`supabase/migrate_129_mesocycles_deload_week.sql:28` adds it, it was
applied 2026-08-06 (`supabase/README.md` CURRENT STATUS), and
`sync.js:1023` pushes `deload_week`. Behaviour is unaffected (the `??`
chain prefers the cloud value), but the stated reasoning is wrong.

**S4 — `migrate_141` header contradicts the ledger.**
`supabase/migrate_141_effective_maintenance_memos.sql:9` says
"APPLIED REMOTELY: NO. Founder-gated." `supabase/README.md:341` says
"YES - LIVE, verified 2026-08-18". The README is the declared authority
(`_CAMPAIGN-LOG.md` log entry 2026-08-20 also notes CLAUDE.md's numbers are
stale).

**S5 — `adaptation_events` has no `user_id` locally but does in the
cloud.** Local ownership requires a two-table join
(`database.js:5436-5438`, `:8316-8319`); the push maps
`decision → event_type` and rolls the rest into `payload`
(`sync.js:1499-1512`). The pull writes back with `INSERT OR IGNORE`
(`database.js:9689`). Round-tripping through the cloud therefore reshapes
the row.

**S6 — Two unread mirror tables.** `planned_muscle_volume_sync`
(`database.js:806`) and `adaptation_events_sync` (`:816`) exist locally;
`database.js:8310-8314` records that reading from the mirror "only ever
returned cloud-pulled rows, never the locally-written ones", which is why
the bulk getters now join the primary tables. The mirrors remain in
`BACKUP_TABLES` (`database.js:6072`).

**S7 — `planned_muscle_volume` seeding uses `INSERT OR IGNORE` with a
deterministic id.** `database.js:5001-5005`. Re-seeding an existing block
is a no-op, so a corrected seed cannot overwrite a bad one without an
explicit upsert.

**S8 — Local schema migration count.** `block_ledger` added locally at
`database.js:2123`; the file's `SCHEMA_MIGRATIONS` list is the
`PRAGMA user_version` ladder. Effective-maintenance memo table at
`database.js:335`.

---

## 13 ANSWERS TO SPECIFIC QUESTIONS

### Q1 — Per-mechanism table

*"Recompute" = the state is derived fresh from raw rows at every read.
"Incremental" = a stored value is updated in place and the inputs are not
re-consulted. "Frozen" = computed once from raw rows, then stored and never
recomputed.*

| # | Mechanism | Evidence window | Update mode (proof) | Durable state written | Onward readers | Re-derivable from raw history? |
|---|---|---|---|---|---|---|
| 1 | Research landmarks | n/a | static constant `algorithms.js:25` | none | everything | n/a |
| 2 | Profile-adjusted landmarks | n/a (profile fields only) | **recompute** `planEngine.js:127` | none | `blockLedgerGather.js:383`, `blockSeed.js:230` | YES — pure function of profile |
| 3 | Adapted landmarks | last **200 workout×muscle rows** (`database.js:6570`), then `slice(-8)` (`algorithms.js:988`) | **recompute** at every read; `getAdaptedLandmarks` re-queries (`effectiveLandmarks.js:158-160`) | none | `mergeLandmarkPrecedence` `effectiveLandmarks.js:64`; `sessionAdjustments.js:131`; `adaptedMrv` clamp `blockLedgerRunner.js:355` | YES — raw `workouts`+`workout_sets` retained |
| 4 | Manual landmarks | n/a | **user write** `VolumeHeatmapScreen.js:286` | AsyncStorage blob `@volyume_landmarks_<uid>` | `effectiveLandmarks.js:118`; `blockSeed.js:77`; `blockLedgerRunner.js:305` | NO — user intent, not derivable |
| 5 | Learned range | ALL prior blocks' stored ledger entries for the muscle (`blockLedgerGather.js:405`) | **recompute over frozen inputs** `learnedRange.js:139` | none itself | `blockSeed.js:179`; `interBlock.js` `learnedCeiling` (`blockLedgerRunner.js:366`) | ONLY from ledgers, not from raw sets — the ledgers are the sole input (`learnedRange.js:15-20`) |
| 6 | Block Ledger entry | ONE finished block's sets/workouts/checkins/coach outputs/planned rows (`blockLedgerRunner.js:249-257`) + 180-day prior window (`:78`) | **frozen** — idempotent by version, `blockLedgerRunner.js:236-247` | `mesocycles.block_ledger` JSON | learned range, seeding, structure memory, explanation, epoch | YES in principle (raw rows retained) but the code deliberately refuses to (`interBlock.js:56-64`) |
| 7 | `planned_muscle_volume` | seeded once at activation | **frozen at insert** (`INSERT OR IGNORE`, `database.js:5002`), then **incrementally updated** by Apply (`coachApply.js:269` → `upsertPlannedMuscleVolume`) | rows w/ `planned_sets, mev, mav, mrv, source` | sessions (`coachApply.js:324`), ledger (`blockLedgerRunner.js:253`), explanation (`blockExplain.js:109`) | NO — the applied deltas are not reconstructible from raw sets |
| 8 | `adaptation_events` | write-once per decision | **append-only** `database.js:5398` | rows | Engine Log 4wk (`EngineLog.js:71`); session engine 6wk (`sessionAdjustments.js:127`) | NO — records a decision, not an observation |
| 9 | Session adjustments | 72h/4d/14d signal ages (`algorithms.js:1061-1067`); 6-week event window | **recompute** `algorithms.js:1082` (pure) | only the `adaptation_events` audit rows | in-session UI; caps read their own past events | YES for the decision; NO for the historical events |
| 10 | Live prescription (C20) | last **3** comparable sessions, **45-day** bound (`livePrescription.js:562,566`) | **recompute** every set (`ActiveWorkoutScreen.js:3107`) | none | UI only | YES — fully |
| 11 | PR detection | full exercise history (`ActiveWorkoutScreen.js:2004`) | **recompute** `algorithms.js:389` | none (no `personal_records` table, `database.js:7739`) | UI, share cards, `getWeeklyPRCount` | YES |
| 12 | Plateau detection | 4-session qualification + full eligible history for duration (`algorithms.js:1408,1475-1480`) | **recompute** | none | `plateauSurfacing.js:63`; `exercise/intent.js:97` | YES |
| 13 | Programme-structure memory | all mesocycles with a ledger + signature (`planAutoGen.js:189-215`) | **recompute over frozen ledgers** | none | `planEngine.js:3143` `demonstratedStructure`; `PlanUpdateScreen.js:261` | ONLY from ledgers (needs `programmeSignature`, §11 P9) |
| 14 | Intervention memory | coach-output history, per-domain windows 2wk/3 exposures/4wk (`coachIntervention.js:92`) | **append at Apply** (`coachApply.js:210`), **recompute** of the verdict (`:256`) | inside `coach_outputs.output_json` | `weeklyCoach.js:1398`; `CoachOutputScreen.js:1813` | NO — only accepted applies are recorded |
| 15 | Recovery EMA | half-life 7 days, unbounded input list (`recoveryEMA.js:11,23`) | **recompute** (pure, `now` injected) | none | readiness surfaces | YES |
| 16 | Weight EWMA (C21 fix) | all valid weigh-ins, one per local day | **recompute**; same-day collapse at `weeklyCoach.js:73-79` and `nutritionEngine.js:196-203` | none | calorie magnitude, ED rapid-loss signal | YES |
| 17 | Effective-maintenance memo | ≥5 food days, ≥14 weight points, latest 60 weigh-ins (`effectiveMaintenanceService.js:66`); 14-day staleness (`effectiveMaintenance.js:16`) | **incremental durable residual**, re-derived only when a new judgeable window exists (`effectiveMaintenance.js:315`) | `effective_maintenance_memos` row | `resolveEffectiveMaintenance` (`:219`), diet-break apply (`coachApply.js:104`) | PARTIALLY — food/weight rows are retained, but the memo records a residual against the prior *at derivation time*; the prior has moved since |
| 18 | Live block slope | current block so far (`blockLedgerRunner.js:500`) | **recompute**, writes nothing (`:519` refuses a finished block) | none | `weeklyCoach.js:609` `blockE1rmSlopePct` | YES |

**Summary of the recompute/incremental split (H3's kill-test).**
Genuinely recompute-from-raw: 2, 3, 9, 10, 11, 12, 15, 16, 18.
Frozen-then-replayed (raw retained, but the code refuses to re-judge):
5, 6, 13. Incremental / not re-derivable: 4, 7, 8, 14, 17.

### Q2 — Exactly what a finished block teaches the next, field by field

Every path runs through `blockSeed.js:59` `resolveSeedRange`. The inputs it
receives are assembled at `blockLedgerRunner.js:794-809`.

**(a) Directly, via the ledger entry for that muscle** (`intent: 'adjust'`,
Pro only):

| Field consumed | Source | Effect on the next block |
|---|---|---|
| `proposal.startSets` | `interBlock.js:289` | becomes the next block's week-1 planned sets (`blockSeed.js:105` → `database.js:4967` `buildSeededWeeklyTargets` start) |
| `proposal.peakSets` | `interBlock.js:290` | the ramp's top (`buildSeededWeeklyTargets` peak, `blockLedgerGather.js:429`) |
| `proposal.deferredToManual` | `interBlock.js:291` | invalidates the entry as a seed source (`blockSeed.js:93`) |
| `classification` | `interBlock.js:268` | `INSUFFICIENT_DATA` invalidates the entry (`blockSeed.js:94`) |
| `observed.startSets` | `interBlock.js:271` | the `repeat` intent's start (`blockSeed.js:107`); also the suppression floor for an adjust (`:111`) |
| `observed.plannedPeak` | `interBlock.js:273` | the `repeat` intent's peak (`:108`) |
| `observed.achievedPeak` | `interBlock.js:272` | the base of the next block's **deload week** dose (`blockSeed.js:145-155`) |
| `evidence[recovery_cost_weight]` | `interBlock.js:198` | scales that deload share, 60%→40% (`coachApply.js:140`) |

**(b) Indirectly, via `computeLearnedRange` replaying ALL prior ledgers**
(`blockLedgerRunner.js:352-358`, `learnedRange.js:139`):

| Field consumed | Gate | Effect |
|---|---|---|
| `confidence` | `< 0.6` skips the entry (`learnedRange.js:147`) | — |
| `classification` | must be RESPONSIVE / OVERREACHED / STALE / STRAINED (`:153-156`) | selects the fold branch |
| `proposal.deferredToManual` | skips (`:152`) | manual blocks never teach |
| `observed.suppressed` | blocks upward moves (`:168`, `:227`) | safety |
| `observed.achievedPeak` | RESPONSIVE → running max, ceiling steps ≤2/block toward it, capped at `achievedPeak+2` (`:167-193`); OVERREACHED → ceiling steps down toward `achievedPeak-2` (`:194-196`) | learned ceiling |
| `observed.startSets` | STRAINED → ceiling steps down toward it (`:197-199`); RESPONSIVE → floor steps down 1/block toward the lowest progressing start (`:202-209`) | learned ceiling + floor |
| `proposal.startSets` | most recent legitimate value wins, up or down (`:222-231`) | `establishedStart` — the actual seed start when the ledger cannot speak (`blockSeed.js:190-192`) |
| (nothing) | STALE | ceiling unmoved (`learnedRange.js:200`) |

**(c) Via freshness** — `judgedEvidenceAgeByMuscle`
(`blockLedgerRunner.js:98`) records the newest **judged** entry per muscle
and how many weeks overdue its block is; `learnedActionability` (`:132`)
gates both the ledger entry and the learned band on
`weeksOverdue < 4` (`:134`).

**(d) Via the capacity probe** — `probeEligible`
(`blockLedgerRunner.js:157`) grants exactly `+1` to the **peak** of a
learned seed (never the start, never above `ceilingCap`) when the newest
judged entry is RESPONSIVE with `proposal.startSets > observed.startSets`
(`:169-171`), and the seed is labelled `seed_learned_probe`
(`database.js:4986`).

**(e) Via structure memory** — `blockOutcomeFromLedger`
(`programmeStructureMemory.js:126`) reduces the whole `entries[]` array to
three booleans (`productive`, `recoveryAcceptable`, `structuralProblem`),
keyed on `ledger.programmeSignature`; ≥3 blocks on one
`splitType|dayCount` with >50% productive and ≤50% poor make that
structure the starting point for the next generated programme
(`programmeStructureMemory.js:205`, consumed `planEngine.js:3219-3222`).

**(f) Via `proposedRecoveryDays`** — `interBlock.js:459-465`: 10 days
instead of 7 when any muscle is STRAINED **and** ≥2 persistent systemic
signals. Read by `blockExplain.js:393` and
`programmeStructureMemory.js:148`.

**(g) NOT taught forward:** `doseResponse` (not stored,
`blockLedgerRunner.js:143-149`), `e1rmSlopePct` beyond the evidence array
(never re-read as a number by any consumer found), exercise identity
(`programmeStructureMemory.js:22-26` states this deliberately), and
anything about *which* exercises produced the volume.

### Q3 — Manual overrides vs learned values: precedence as implemented

1. **Both resolvers put manual first, unconditionally.**
   `effectiveLandmarks.js:57-63` (display) and `blockSeed.js:71-87`
   (seeding). In `blockSeed`, manual is checked before suppression is
   consulted at all — `blockSeed.js:19-22` records this as deliberate
   ("a manual override is the user's own explicit numbers and stands").
2. **"Manual" means a genuine edit only.** `isManualEdit`
   (`effectiveLandmarks.js:95`): `explicit === true` wins outright
   (`:102`); otherwise at least one of mev/mav/mrv must differ from the
   research row (`:110-114`); with no research row to compare, the entry
   wins (`:105`).
3. **A manual muscle stops the engine learning from it.**
   `blockLedgerRunner.js:367` sets `manualOverride: isManualEdit(...)`;
   `interBlock.js:172` turns that into `deferredToManual`;
   `interBlock.js:289-291` nulls the proposal numbers;
   `learnedRange.js:152` skips such entries entirely, so the learned
   ceiling, floor and `establishedStart` all ignore blocks run under a
   manual override.
4. **A manual muscle is never confounded into a coach outcome.**
   `getManualVolumeMuscles` (`effectiveLandmarks.js:139`) is read at
   `CoachOutputScreen.js:1823` and threaded into the weekly run as
   `manualVolumeMuscles` (`weeklyCoach.js:746,887,1164,1382`).
5. **A manual muscle is not counted as an "Adjust changes something"
   difference.** `nextBlockPreview.js:85-99`.
6. **Manual still obeys hard bounds.** `blockSeed.js:88` clamps to
   `[researchMev, ABSOLUTE_WEEKLY_SET_CEILING]`.
7. **Manual is NOT gated by freshness.** `blockLedgerRunner.js:665-667`
   states this explicitly: "A manual override is NOT evidence and is not
   gated by this."
8. **Consequence, OBSERVED:** a manual value can sit *below* the learned
   floor or *above* the learned ceiling and wins in both directions; the
   learned range is still computed (`blockLedgerRunner.js:352`) and still
   supplies `learnedCeiling` to the classifier (`:366`), but never reaches
   the seed for that muscle.

### Q4 — All existing evidence-quality gates

**Block-ledger gates** (`interBlock.js`)
| Gate | Value | Line |
|---|---|---|
| adherence floor | `completedSets/plannedSets < 0.6` → INSUFFICIENT_DATA | `:108`, `:321` |
| minimum exposures | `eligibleExposures < 4` | `:109`, `:326` |
| minimum recovery points | `dataPoints < 4` | `:110`, `:331` |
| exercise discontinuity | `performance.discontinuity` | `:336` |
| confidence floor | `performance.confidence < 0.6` | `:111`, `:341` |
| composite confidence | `min(perfConfidence, min(1, dataPoints/8))` | `:184-186` |
| landmark sanity | missing/non-positive bands → null proposal, no observed echo | `:209-226` |
| inverted bands | re-ordered, never allowed below the floor | `:228-230` |
| perf thresholds | ±1.5% e1RM slope | `:76-77` |
| recovery cost | weight ≥2 of {soreness≥4, joint≥3, readinessSlope≤−0.3, sleepWeeks≥2, deloadFlag} | `:101-105`, `:127-138` |
| stale evidence | `weeksSinceBlockEnd >= 4` blocks upward carry | `:118`, `:241` |
| suppression | calm/ED → hold cap `max(previousStart, researchMev)` | `:240-249` |
| raw PR count | echoed only, never drives classification | `:196`, `:44-47` |

**Performance-metric gates** (`blockMetrics.js`)
| Gate | Value | Line |
|---|---|---|
| stability | ≥3 block sessions, both accumulation halves, ≥3 distinct weeks | `:80-81`, `:274` |
| new-exercise discount | ×0.5, only if ≥4 usable prior rows exist | `:82,84`, `:276`, `:270` |
| rep-shift discount | ×0.5, only when early and late target pairs are disjoint | `:83`, `:283-292` |
| slope robustness | Theil-Sen median-of-pairwise, clamped ±25% | `:105-127`, `:79` |
| unusable fit | excluded (weight 0), never a false 0% | `:299-301` |
| confidence | only exercises with a usable strength series count | `:311-313` |
| discontinuity | stable/total < 0.5 | `:307` |
| rebound PR weight | ×0.25 inside a post-deload window | `:78`, `:344` |
| deload week | excluded from slope, PRs and exposures | `:194-197` |
| `lateProgression` | ≥50% of weighted stable exercises beat early peak by ≥1%, or a late PR | `:86`, `:359-372` |
| `lateRecoveryOk` | BOTH soreness and joint answered on ≥max(2, half) legitimate late sessions, all calm | `:87-88`, `:424-429` |
| early-deload exclusion | reduced-dose sessions leave numerator and denominator together | `:397-409` |
| load-bearing | e1RM maths requires `weight > 0`; unweighted work still counts as exposure | `:227-230` |
| type exclusion | `distance`/`duration` never enter | `:222` |

**Gather-level gates** (`blockLedgerGather.js`)
- Applied early-deload weeks excluded from recovery aggregates
  (`:106-141`), while calendar identity of "late weeks" is decided from the
  PLANNED structure first (`:117-121`).
- `jointDiscomfortAvg` is `null` when unanswered, never 0 (`:145-152`,
  "UNKNOWN is not NO").
- `computeReadinessSlope` returns 0 for <2 points (`:163`).
- `countSleepFlaggedWeeks` never counts unknowns (`:171`).
- Rebound windows require the previous block to have ended within 14 days
  (`:37`, `:224`).
- `priorLedgerEntries` treats unparseable JSON as no evidence (`:415`).

**Learned-range gates** (`learnedRange.js`)
- `MIN_ENTRY_CONFIDENCE = 0.6` (`:62`, `:147`).
- Step caps: ceiling ±2/block (`:63`), floor −1/block (`:64`).
- Usable observation required — an empty `observed` teaches nothing
  (`:164-165`).
- Degenerate prior → fail closed, null bounds (`:110-113`).
- `isLearned` only when ≥1 entry qualified (`:248`).
- Muscle guard: entries for other muscles skipped (`:145`).

**Seed gates** (`blockSeed.js`) — the five-step chain plus: probe refused
when the ceiling already sits at `ceilingCap` (`:196`); a learned band
identical to the profile prior is relabelled `profile` rather than
`learned` (`:206-217`).

**Runner gates** (`blockLedgerRunner.js`) — finished-block precondition
(`:232`); idempotency (`:236`); fail-closed suppression (`:198`);
deleted-evidence removal, fail-open (`:181`); Pro-only activation carry
(`:673`); per-muscle carry only for `ledger|learned|manual`
(`:800-802`).

**Session gates** (`algorithms.js:1082`) — deload weeks silent (`:1093`);
revert memory at ≥2 reverts in the 6-week window (`:1170`); one add per
muscle per week (`:1128`); ≤2 adjusted exercises per session (`:1259`);
feedback older than 14 days certifies nothing (`:1196-1203`); joint ≥2
suppresses any add (`:1173`).

**Live-prescription gates** (`livePrescription.js`) — 45-day recency
including future-dated rejection (`:562`); ≥50% rep-band overlap (`:556`);
deload sessions never enter history (`:548`); outlier discount at >10%
below the window median top e1RM (`:178-192`); back-off structure needs ≥2
of the last 3 sessions agreeing within 0.05 (`:263-286`); consecutive-miss
drop requires two comparable sessions (`:211-226`).

**Plateau gates** (`algorithms.js:1408`) — eligible rows only
(`isE1rmEligibleRow`, `:384`); ≥3 eligible sessions (`:1428`); ≥2
consecutive stalls (`:1452`); ≥3 distinct local weeks and ≥14 days
(`:1391-1392`); continuity gap ≤14 days (`:1393`).

**Intervention gates** (`coachIntervention.js`) — observation windows
(`:92-113`); CONFOUNDED checked first (`:260`); only accepted applies
recorded (`:196-198`); CONFOUNDED never teaches (`:466`, `:551`).

**Effective-maintenance gates** (`effectiveMaintenance.js`) —
`foodDays < 5` or `weightPoints < 14` invalid (`:187`); residual identity
`prior + residual = effective` (`:188`); `versionKey` must recompute
(`:200`); evidence already consumed → hold (`:334`); revalidation needs 14
fresh post-marker weight days (`:346-353`); `confidence !== 'high'` → hold
(`:359`); `confounded` → hold (`:358`).

### Q5 — Six weeks at reduced volume with substituted exercises (shoulder problem)

**Scenario as modelled.** One 6-week block. From block start (worst case
for contamination) the athlete replaces overhead pressing and lateral
raises with pain-free substitutes, and trains delts/chest/triceps at
reduced set counts. They log honestly: `joint_discomfort` on the affected
sessions, normal soreness, normal check-ins.

**Absorption path 1 — `planned_muscle_volume` becomes the new baseline.**
If the reduction was applied through the coach (`computeVolumeApply`,
`coachApply.js:269` → `upsertPlannedMuscleVolume`, `database.js:5483`),
the rows for the affected week(s) are rewritten with `source = 'coach'`.
`blockLedgerRunner.js:343-346` then reads `week1Planned` as
`previousStart` and the max non-deload row as `plannedPeak`. If the
reduction was chosen at *seeding* time (a prior STRAINED block), week 1
already carries the reduced number. Either way the reduced figure is what
`interBlock` treats as "the dose this block ran"
(`interBlock.js:232-234`). **Nothing distinguishes a
capability-constrained reduction from a coached one.**

**Absorption path 2 — the Block Ledger judges the block and freezes the
verdict.** `computeAndStoreBlockLedger` (`blockLedgerRunner.js:213`) runs
as soon as the block's calendar runs out, or lazily via
`backfillMissingBlockLedgers` (`:571`) if the athlete switched plans.
Per affected muscle:
- `adherence = sumCompletedSets / sumPlannedSets`
  (`blockLedgerRunner.js:372-375`). A *reduced but adhered-to* block
  passes the 0.6 floor (`interBlock.js:321`) — the reduction is invisible
  to the adherence gate because the plan was reduced too.
- `discontinuity` (`blockMetrics.js:307`) fires only if fewer than half
  the muscle's block sessions came from *stable* exercises. **A
  substitution made at block START is stable for the whole block**
  (`blockMetrics.js:274`: `stable` needs ≥3 sessions, both halves, ≥3
  weeks) — so the block IS judged. Only a **mid-block** swap trips
  `discontinuity` and lands on `INSUFFICIENT_DATA` (`interBlock.js:336`).
- The substitute is marked `isNew` (×0.5 weight, `blockMetrics.js:274`)
  **only if** ≥4 usable prior rows exist across the whole prior window
  (`:270`, `MIN_PRIOR_ROWS_FOR_NEWNESS = 4`). The discount halves its
  weight in the slope and its PR events — it does not exclude it.
- `joint_discomfort` is a **workout-level** column
  (`blockLedgerGather.js:305`), so every muscle that was primary in a
  flagged session gets that joint number in `jointDiscomfortAvg`
  (`:106-153`). A shoulder flag on a push day therefore raises
  `recovery_cost_weight` (`interBlock.js:129`) for chest and triceps too
  once the block mean reaches 3.
- Systemic signals are mirrored into every muscle
  (`blockLedgerRunner.js:385-393`).
- Outcome, OBSERVED: with joint discomfort high and performance flat on
  the substituted lifts, the likely classification is **STRAINED**
  (`interBlock.js:348`) → `proposal.startSets = min(previousStart − 2,
  mav)`, `peakSets = min(mav, plannedPeak)`. If performance rose on the
  substitutes (common — a new movement improves fast), it is
  **OVERREACHED** (`:359`) → start holds or drops 1, peak =
  `min(achievedPeak, plannedPeak) − 2`.
- The entry is written with `observed.startSets` = the reduced week-1
  number, `observed.achievedPeak` = the reduced achieved credit
  (`interBlock.js:270-276`), and `observed.suppressed = false` (the
  athlete has no ED flag and is not in calm mode) — so **no gate marks
  this evidence as unrepresentative**.
- The whole record is persisted (`blockLedgerRunner.js:432`) and, at the
  current `LEDGER_VERSION`, will never be recomputed
  (`:236-247`).

**Absorption path 3 — the learned working range folds it in permanently.**
`computeLearnedRange` (`learnedRange.js:102`) replays that entry on every
subsequent read:
- STRAINED → `ceiling = stepToward(ceiling, observed.startSets, 2)`
  (`:197-199`). Six weeks of reduced training therefore pulls the learned
  ceiling **down by up to 2 sets, permanently**, because the down-step is
  applied at every replay and the only thing that raises the ceiling again
  is a later RESPONSIVE block — and that upward step is capped at that
  block's own `achievedPeak + 2` (`:181-187`, the C6 RA6-3 rule), so
  recovering the previous ceiling takes several full blocks of
  re-demonstration.
- OVERREACHED → `ceiling` steps toward `achievedPeak − 2` (`:194-196`),
  i.e. toward *the reduced peak* minus 2.
- The **floor never rises back** (`:202-209`, monotone down only), so the
  reduction cannot be undone from the floor side either.
- `establishedStart` is set to that block's `proposal.startSets`
  (`:222-226`) — "the most RECENT legitimate prescription wins, up or
  down". So the reduced start becomes the athlete's *established* start.
- Nothing in the fold examines exercise identity, so the fact that the
  peak was achieved on a substitute movement is invisible.

**Absorption path 4 — next-block seeding uses it.**
`buildSeedRangesForNextBlock` (`blockLedgerRunner.js:740`) supplies that
entry as `ledgerEntry` (`:797`); `resolveSeedRange` step 2
(`blockSeed.js:89`) takes its `startSets`/`peakSets` directly. The
`deloadSets` of the next block are sized from the reduced
`observed.achievedPeak` × the strain-scaled share
(`blockSeed.js:145-155`, `coachApply.js:140`). `generateInitialPlannedVolume`
(`database.js:4942`) writes those numbers as the new
`planned_muscle_volume` with `source = 'seed_ledger'`, and
`computeWeeklySessionAllocation` (`coachApply.js:324`) scales the actual
session set counts by them. **The reduction is now the plan.**

**Absorption path 5 — plan activation carries it across programmes.**
Even without pressing Adjust, `activatePlanWithBlock`
(`database.js:4399`) calls `buildLearnedSeedRangesForActivation`
(`blockLedgerRunner.js:672`) for Pro users, which resolves the same
learned band and the same recent judged entry
(`:781-791`). So switching plan, phase or programme does **not** escape it
— that is the explicit purpose of the C8 D97-9 carry
(`blockLedgerRunner.js:620-640`).

**Absorption path 6 — adapted landmarks absorb it at session grain.**
`getAdaptiveLandmarkHistory` (`database.js:6543`) returns up to 200
`(workout, primary_muscle)` rows including the constrained six weeks.
`computeAdaptiveLandmarks` (`algorithms.js:965`) takes the last 8 per
muscle (`:988`) — six weeks of reduced training at 2 sessions/week is
~12 rows, so **the constrained period completely fills the window** for
the affected muscles. `avgJoint` is weighted at −0.8 per point
(`:1013`), the strongest negative term after performance; the net
adjustment reduces MEV (`:1049`) and MRV (`:1051`), and MAV is set to
`bestVolume` — the reduced session count (`:1050`, and see §11 P1). Because
`mergeLandmarkPrecedence` puts ADAPTED above RESEARCH
(`effectiveLandmarks.js:64`), the athlete's displayed targets on
Analytics, the heatmap, the workout summary and the coach review all move
down. This layer *does* recover: it is recomputed from a rolling 200-row
window, so ~8 normal sessions per muscle displace the constrained ones.

**Absorption path 7 — the coach's volume decision.**
`getPerformanceScore` (`weeklyCoach.js:342`) reads PR density and the live
block slope; `contextAdjustedRecovery` (`:371`) can only *soften* a
soreness-driven grade 3 in the peak week. `jointPain` on the check-in
forces a safety hold that caps any push (`weeklyCoach.js:1237-1243`).
`volumeDecisionMemory` (`coachIntervention.js:515`) will additionally
`holdIncrease` for two weeks after any accepted reduction
(`:530-537`), and `blockEscalation` afterwards if the outcome reads
WORSENED or UNCHANGED (`:540-553`).

**Absorption path 8 — programme-structure memory.**
`blockOutcomeFromLedger` (`programmeStructureMemory.js:126`) reduces the
constrained block to `productive/recoveryAcceptable/structuralProblem`. A
majority-STRAINED block with good execution sets `structuralProblem = true`
(`:151`), and `structureEvidence` (`:166`) counts it as `poor` against
that split. Three such blocks make the athlete's split ineligible as a
demonstrated structure (`:213`). So a capability episode can teach the app
that the athlete's *split* does not work for them.

**Absorption path 9 — exercise-level intent and plateau.**
`detectPlateau` (`algorithms.js:1408`) runs on the *old* exercise's
history, which now has a 6-week gap: `PLATEAU_MAX_GAP_DAYS = 14`
(`:1393`) breaks the continuity so no false plateau is claimed. The
substitute accumulates its own history and, via
`exercise/intent.js:96-101`, its progression/plateau verdict feeds
selection. `livePrescription` (`:562`) simply ages out the old exercise's
sessions after 45 days, so the first session back on the original movement
resolves as `INSUFFICIENT_EVIDENCE` or `FIRST_TIME_BAND`
(`livePrescription.js:63-64`) rather than re-proposing pre-episode loads —
this path is *not* contaminated.

**What DOES stop absorption today, and what does not.**

| Stops it | Does not stop it |
|---|---|
| A **mid-block** swap → `discontinuity` → `INSUFFICIENT_DATA` (`blockMetrics.js:307`, `interBlock.js:336`) | A swap made at block start (fully stable, fully judged) |
| Adherence below 60% (`interBlock.js:321`) | A reduced plan that was fully adhered to |
| Fewer than 4 exposures (`:326`) or 4 recovery points (`:331`) | Six weeks of honest logging |
| Calm mode / open ED flag (`blockLedgerRunner.js:198`) | A shoulder problem — there is no equivalent flag |
| A manual landmark override on that muscle (`blockSeed.js:77`, `learnedRange.js:152`) | Anything short of the user hand-setting the numbers |
| Deleting the block's raw training rows (`blockLedgerRunner.js:181`) | Keeping the history |
| ≥4 weeks elapsed before the next block (`interBlock.js:241`) — blocks upward carry only | Downward carry; a reduction always passes |

**The single sentence.** Under today's code the only user-reachable ways to
stop six constrained weeks becoming the athlete's durable baseline are: set
the muscle's volume targets by hand, delete the block's training history,
or swap the exercise *mid*-block so the strength comparison breaks. There
is no representativeness concept, and every safety gate that would hold the
learning back is calibrated on ED/calm mode, not on physical capability.

---

## 14 UNKNOWN / UNVERIFIED

1. **UNVERIFIED — test suite state.** `npm run lint && npm test` was not
   run (read-only brief). All test claims in §8 are from file headers and
   filenames, not from execution.
2. **UNKNOWN — real-world frequency.** No production data was consulted, so
   nothing here says how often any path actually fires.
3. **UNVERIFIED — whether `custom_exercises` rows can exist without an
   `exercises` mirror.** `getExerciseRowsById` (`database.js:5186`) unions
   both; `getWeeklyVolumeByMuscle` (`:3381`) and `getAllExercises`
   (`:2943`) read only `exercises`. `sync.js:2590` restores cloud customs
   into `exercises`. I did not trace every write path into
   `custom_exercises` to prove the sets are always equal (§11 P6).
4. **UNVERIFIED — `runAdaptiveEngine` / `computeAdaptiveDecision`
   (`algorithms.js:817,930`) call sites.** I confirmed
   `WorkoutSummaryScreen.js:845` writes their decisions as
   `adaptation_events`, but did not trace every consumer of
   `adaptiveDecisions`.
5. **UNKNOWN — whether `interBlock`'s `learnedCeiling` input is ever
   non-null in practice for a first-time block.** It requires
   `learned.isLearned` (`blockLedgerRunner.js:366`), which requires ≥1
   qualifying prior ledger entry.
6. **UNVERIFIED — the exact classification a real constrained block
   receives.** §13 Q5 states the branches and their conditions from the
   code; which branch a given athlete lands in depends on their logged
   numbers and was not simulated.
7. **UNKNOWN — `progression_anchor_week`.** Written as `1` at
   `database.js:4487`. I found no reader; not traced further.
8. **UNVERIFIED — whether any UI surfaces `establishedStart` or
   `ceilingCap` to the user.** Both are returned by
   `computeLearnedRange` (`learnedRange.js:236-247`); I traced consumers
   in `blockSeed.js` only.
9. **UNVERIFIED — CLAUDE.md §STATUS migration numbers.** CLAUDE.md says
   "133 files, highest `migrate_136`"; the folder holds files through
   `migrate_144`. `_CAMPAIGN-LOG.md` already records this as stale and
   queues the fix.
10. **OUT OF SCOPE, flagged for Audit C/D.** `exercise_intent`,
    PATTERN_AVOID expiry semantics, `exercise_swaps.scope`, per-set pain
    capture and `workout_set_flags` were read only where they touch a
    progression mechanism.
