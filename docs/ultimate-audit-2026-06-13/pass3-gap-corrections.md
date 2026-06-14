# PASS 3 — GAP CORRECTIONS (evidence-based; how each was decided)

Rule applied: a verdict requires EITHER the register's read-based EXISTS/PARTIAL/ABSENT (with its file:line)
OR a full read of the implementation showing the lines. A grep returning nothing is NOT a verdict — those
are listed as "NEEDS FULL READ of [file]", not ABSENT.

Reads actually done so far: `pass1-section4-features.md` (register, full); `src/screens/AnalyticsScreen.js`
(full, 1-717); `src/screens/CoachOutputScreen.js` (partial, 1-1315 of 2448). Everything decided below is
from one of those reads or the register; anything that would need a file I haven't fully read is in list C.

---

## A. FALSE GAPS — feature already exists (evidence)
1. **Recovery / readiness (was WS-5, MF-1 "no recovery read").** Register #6 **EXISTS** — `blockAdvisor.js:45,:78`
   (checkinReadiness/detectSignals) + `components/ReadinessCards.js` (Pro-gated). Recovery is read and scored.
   (Only wearable-sensor HRV ingestion is unconfirmed → C10.)
2. **Social / accountability (was RE-3, WS-7 "no social feed").** Register #8 **EXISTS** — full training-partners
   feature: `migrate_081_training_partners.sql:75-218` (partnerships/partner_week_signals/partner_cheers/
   partner_blocks), `lib/partners/signals.js`. Partners IS the social feature.
3. **Manual barcode (was NU-6, FL-5 "barcode gap").** Register #18 **EXISTS** — `ScanBarcodeScreen.js`,
   `ScanLabelScreen.js`. Not a feature gap; only a Free-vs-Pro pricing question.
4. **Progress views / graphs (was PR-1).** Full read `AnalyticsScreen.js`: PR-rate sparkline (:487-524),
   weekly volume summary → heatmap (:431-485, :295-298), Pro weight-trend card (:256-263), recent sessions
   (:267-283), nav to Lifts/Consistency/BodyMetrics (:341-353). EXISTS.
5. **Nutrition planning — carb-cycle / refeed / diet-break (part of NU-1).** Read `CoachOutputScreen.js`:
   `MacroCycleCard` training/rest-day carb split (:431-470), `RefeedCard` (:477-510), `DietBreakCard`
   maintenance week (:389-423), all confirm-then-apply (handlers :987-1045, :959-979). EXISTS.
6. **Per-domain confirm-then-apply coaching (part of SC-2).** Read `CoachOutputScreen.js`: `markApplied/isApplied`
   used per domain (calories/training/steps/cardio/deload/dietBreak/macroCycle/refeed), handlers :778-1045;
   Apply UI `AdjustmentRow` :189-220. The user already confirms each adjustment — a "collaborative" step EXISTS.
7. **Streak (RE-1/RE-2).** Register #7 **EXISTS** — `StreakWeeksSection.js`, `WeeklyStreakStrip.js`,
   `lib/milestones.js:50,:115`.

## B. REAL GAPS — survives (evidence ABSENT/PARTIAL by read)
1. **Exercise demo media (EL-1, NE-3).** Register #2 **ABSENT** — `ExerciseDetailScreen.js` has no Image/Video
   import (`:685` is a Modal slide, not media); text-only. REAL.
2. **Progress-photo UI (PR-3).** Register #1 **PARTIAL** — table exists (`supabase setup_complete.sql:251`),
   NO UI in src. REAL (build UI on an existing table).
3. **Full cycle tracking (CK-4).** Register #16 **PARTIAL** — menstrual FLAG exists (`cycleOverride` in check-in;
   weeklyCoach discounts the flagged weigh-in); full phase TRACKING ABSENT. REAL partial.
4. **Conditional check-in depth (corrects CK-1).** Register #13 **PARTIAL** — step/cardio conditional sections
   exist (`WeeklyCheckInScreen.js` stepsEnabled/showSteps); fuller conditional branching is the gap. (My
   "CONFIRMED YES" was wrong — it's PARTIAL.)
5. **Plate-calculator UI wiring (corrects WS-8).** Register #3 **PARTIAL** — logic exists (`algorithms.js:836-863`),
   UI wiring VALUE DEFERRED. (My "CONFIRMED YES" leaned on a grep of PlateCalculator.js I did not read in full
   → downgrade to PARTIAL pending C-read.)

## C. NEEDS FULL READ — could NOT be confirmed by reading (NOT a verdict; grep is not evidence)
These were "grep-0" in my Pass-3 files. They are unproven until the named file is read in full.
1. **Strength-score composite (PR-5).** `AnalyticsScreen.js` (full) shows no composite score, but the metric
   could live elsewhere → read `LiftProgressScreen.js`, `hooks/useProgressData.js`.
2. **Recomp progress view (PR-4).** Not in `AnalyticsScreen.js`; → read `BodyMetricsScreen.js`,
   `ConsistencyScreen.js`.
3. **Weekly calorie "banking" planner specifically (NU-1 remainder).** Carb-cycle/refeed/diet-break exist (A5);
   a weekday→weekend banking planner → read `DiaryScreen.js`, `NutritionTargetsScreen.js`, `CoachOutputScreen.js:1316-2448`.
4. **Explicit reverse-diet mode (AC-9).** DietBreakCard (maintenance) exists (A5); a progressive reverse-diet
   → read `NutritionTargetsScreen.js`, the reverse-diet path in `nutritionEngine.js`, rest of CoachOutputScreen.
5. **Autonomy-mode toggle / manual target override (SC-2 remainder).** Confirm-then-apply exists (A6); a
   Coached/Collaborative/Manual toggle or manual override → read `NutritionTargetsScreen.js`,
   `SettingsCoachingScreen.js`, rest of CoachOutputScreen.
6. **Micronutrient/NRV display (NU-7).** Schema carries fibre/sodium/sugar (`food/db.js:240`) but the display
   is unread → read `DiaryScreen.js`, `FoodDetailScreen.js`, `AddCustomFoodScreen.js`.
7. **Challenges/leaderboards (RE-7).** → read `lib/partners/service.js`, `signals.js`, `sharedStreak.js`.
8. **Posing/peak-week tool (MF-3).** A training "peak week" phase exists in `mesocycle.js` (not fully read);
   → read `mesocycle.js`, `planEngine.js`, any contest-prep screen.
9. **Standalone watch app (MF-2).** → read `lib/watch/bridge.js` in full + `app.json` watch config.
10. **Wearable HRV/sleep ingestion (WS-5/MF-1 slice).** Readiness EXISTS (A1); whether health ingests HRV →
    read `lib/health.js` in full.

## HOLD (register confirms, unchanged)
RPE/RIR EXISTS (#10), audio cues EXISTS (#9), pain-flag rotation EXISTS (#15), import/export EXISTS (#11),
custom exercises/substitutions (Pass-2 reconciled, engine-read), colour-blind palette (read `theme.js:328-329`
earlier — EXISTS), no-LLM (coverage across 9 coaching files — EXISTS). Velocity/tempo (#4), mood (#5), dense
mode (#17), VBT (#19) ABSENT per register but had no market finding.

## NEXT
Clear list C by full reads (10 files), then finalise A/B. No founder questions until C is cleared and A/B final.
