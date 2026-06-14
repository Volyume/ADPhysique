# PASS 1 — SECTION 4: FEATURE EXISTENCE REGISTER (LOCATE-AND-CITE)

Method (Tier B): each mandated feature given EXISTS / PARTIAL / ABSENT with file:line evidence.
Where PARTIAL, the missing half is named; deeper detail VALUE DEFERRED. No `~`.

## MANDATORY LIST (all assessed)
1. **Progress photos** — PARTIAL (table-only). DB table `progress_photos` (setup_complete.sql:251);
   NO UI in src (grep ProgressPhoto → none). Matches U-D-1 "largest absent progress feature".
2. **Exercise demonstrations** — ABSENT. `ExerciseDetailScreen.js` has no Image/Video import
   (the :685 animationType is a Modal slide, not media). Text-only. (U-A-6.)
3. **Plate calculator** — PARTIAL. Logic EXISTS: `calculatePlates` + `PLATE_SETS`/`DEFAULT_BAR_WEIGHT`
   (algorithms.js:836-863). UI wiring (plateBtn) VALUE DEFERRED — verify on consumption (U-A-8 flagged style-only).
4. **Velocity/tempo capture** — ABSENT (no velocity/tempo capture in src).
5. **Mood correlation** — ABSENT (no mood field/correlation; only unrelated test-file matches).
6. **Readiness scoring** — EXISTS. `blockAdvisor.js` checkinReadiness/detectSignals (:45,:78) +
   `components/ReadinessCards.js` (Pro-gated, :139/215/240).
7. **Streak system** — EXISTS. `components/StreakWeeksSection.js`, `components/WeeklyStreakStrip.js`,
   `lib/milestones.js` (MILESTONES ladder :50, hasThreeInSeven :115).
8. **Accountability groups** — EXISTS (training partners). Tables partnerships/partner_week_signals/
   partner_cheers/partner_blocks (migrate_081_training_partners.sql:75-218); `lib/partners/signals.js`;
   `components/__tests__/PartnerSurfaces.test.js`.
9. **Audio cues** — EXISTS (rest-timer sound). `lib/restSound.js`, `components/RestTimer.js`.
10. **RPE/RIR fields** — EXISTS. RIR throughout (SetEntry.js rirRow :239; engine reads rir); RPE field
    present (database.js; calculateEffectiveSets RPE→RIR fallback algorithms.js:1383).
11. **History import/export** — EXISTS. `screens/ImportScreen.js`, `screens/SettingsDataScreen.js`
    (data export). Scope (what's importable/exportable) VALUE DEFERRED.
12. **Plan diff/preview** — PARTIAL. `screens/PlanUpdateScreen.js` EXISTS (plan rebuild/update); a
    pre-commit DIFF/PREVIEW is ABSENT (U-B-7 gap). 
13. **Conditional check-in steps** — PARTIAL. `WeeklyCheckInScreen.js` has step/cardio conditional
    sections (stepsEnabled/showSteps, registered-average gating); fuller conditional-step branching is
    the U-B-2 gap. VALUE DEFERRED on exact conditions.
14. **Wellbeing correlation output** — PARTIAL. Wellbeing mode EXISTS (`lib/wellbeing.js` WELLBEING_KEY/
    isCalm; SCOFF `scoffPositive` gates deficit suggestions in weeklyCoach). A correlation OUTPUT surface
    is not confirmed — VALUE DEFERRED.
15. **Pain flag rotation** — EXISTS. `lib/swapEngine.js` detectJointDiscomfortPattern :252 +
    autoSwapForJointDiscomfort :293 (auto-swap on joint-discomfort pattern over a 30-day window);
    jointPain flag consumed in weeklyCoach (safetyHold).
16. **Cycle tracking** — PARTIAL. Menstrual-cycle FLAG exists (`cycleOverride` in check-in; weeklyCoach
    discounts the weight reading + suppresses rapid-loss override when flagged); full cycle TRACKING
    (phase logging) ABSENT.
17. **Dense mode** — ABSENT (no denseMode/compact setting in src).
18. **Manual barcode entry** — EXISTS. `screens/ScanBarcodeScreen.js` + `ScanLabelScreen.js` (scan);
    barcode handled in AddCustomFood/FoodSearch/Diary. Manual-entry path VALUE DEFERRED.
19. **VBT (velocity-based training)** — ABSENT.

## NOTE (other features) — full app feature sweep is Section 7 (79 screens) territory; this section
covers the mandated list. EXISTS-but-detail-deferred items get pulled at blueprint consumption.

COMPLETENESS: all 19 mandated features assessed with a verdict + evidence. EXISTS: readiness scoring,
streak, partners, audio cues, RPE/RIR, import/export, pain-flag rotation, barcode scan. PARTIAL:
progress photos, plate calc, plan diff/preview, conditional check-in, wellbeing correlation, cycle
tracking, manual barcode. ABSENT: exercise demos, velocity/tempo, mood correlation, dense mode, VBT.
