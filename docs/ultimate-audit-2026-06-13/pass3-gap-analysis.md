# pass3-gap-analysis.md — GAP ANALYSIS (per `_AUDIT-SPEC.md:158-204`)

SUPERSEDES the earlier off-spec C1–C18 version. Anti-drop: every finding ID in `pass2-findings-index.md`
(97 rows) is assigned to exactly one GAP below and listed in SOURCE FINDINGS — none dropped, the 2 EXCLUDED
rows are carried with resolution=EXCLUDED. VOLYUME STATUS resolved against Pass 1 at exact file:line;
unresolvable → `pass3-unresolved-questions.md` (Q-id), answered in `pass3-unresolved-answers.md`.
Per-entry: SOURCE FINDINGS / RESEARCH FINDING / VOLYUME STATUS / PASS 1 REF / IF PARTIAL / NEWBIE+ATHLETE
IMPACT / EVIDENCE QUALITY.

---

### G-01 — Fast set logging (taps, autofill, keyboard)
SOURCE: CG:WS-F1, GE:WS-K1, CL:WS-F1, CL:WS-F2. RESEARCH: best loggers ~2-4 taps/set with autofilled
previous performance; keyboard "next" valued. VOLYUME STATUS: CONFIRMED PARTIAL. PASS1 REF: progression/
prev-set targets `algorithms.js:354-438 (computeSetTargets)`; in-workout logging screen `ActiveWorkoutScreen.js`
(gating ref pass1-section1-gating.md:52). IF PARTIAL: targets/autofill logic exists; exact tap-count of the
log UI not measured → Q1. NEWBIE: low friction helps adherence. ATHLETE: speed matters mid-session.
EVIDENCE: VERIFIED(market)/PARTIAL(code).

### G-02 — Inline last-session data
SOURCE: CG:WS-F2, GE:WS-K2[EXCLUDED—pelaris FF1]. RESEARCH: prev-session data shown inline = expectation.
VOLYUME STATUS: CONFIRMED PARTIAL → Q1 (whether prev set shown inline on log screen). PASS1 REF: prev-week
data feeds `computeSetTargets algorithms.js:400-438`. EVIDENCE: PARTIAL. (GE:WS-K2 resolution = EXCLUDED.)

### G-03 — Mid-workout reliability / offline / first-use confusion
SOURCE: CG:WS-F3, GE:WS-K3. RESEARCH: freezing/data-loss/confusing first-use are top complaints; offline-
first prevents loss. VOLYUME STATUS: CONFIRMED YES (offline-first). PASS1 REF: offline-first architecture
(CLAUDE.md ARCHITECTURE); local SQLite source of truth `database.js`. NEWBIE: confusing first-use is the
risk → see G-09/G-33. ATHLETE: no data loss. EVIDENCE: VERIFIED.

### G-04 — Recovery/HRV not read by loggers (the wished gap)
SOURCE: CL:WS-F3, GE:MF-F1, GE:MF-F3, CL:MF-F1. RESEARCH: top loggers ignore HRV/sleep; reading them to
drive volume is most-wished. VOLYUME STATUS: CONFIRMED PARTIAL. PASS1 REF: recovery is self-reported —
`getRecoveryScore weeklyCoach.js:144-154` → `autoregulationMatrix weeklyCoach.js:176-191`; health reads
**steps+weight only** `health.js` (Steps :454/:464, weight :361/:371, no HRV/sleep). IF PARTIAL: readiness
consumer EXISTS; sensor HRV/sleep ingestion ABSENT. NEWBIE: subjective inputs fine. ATHLETE: wants sensor
HRV. EVIDENCE: VERIFIED(code).

### G-05 — Deterministic/algorithmic trusted over LLM
SOURCE: CG:PG-F1, GE:PG-F1, CL:AC-F3, CG:AC-F1. RESEARCH: LLM coaching distrusted; deterministic preferred.
VOLYUME STATUS: CONFIRMED YES (lead). PASS1 REF: engine fully deterministic, no LLM (CLAUDE.md sacred;
pass1-section2 all hardcoded). NEWBIE+ATHLETE: trust asset both ends. EVIDENCE: VERIFIED.

### G-06 — Real periodisation / autoregulated mesocycles
SOURCE: CG:PG-F2, GE:PG-F2, CL:PG-F2, GE:AC-F3, CG:AC-F2. RESEARCH: RP/Juggernaut mesocycle autoregulation
is the respected architecture. VOLYUME STATUS: CONFIRMED YES. PASS1 REF: `VOLUME_LANDMARKS algorithms.js:20-54`,
deload `algorithms.js:1474-1482`/`:727-763`, adaptive landmarks `:1005-1041`, autoreg `getAutoRegSuggestion
:646-695`, weekly matrix `weeklyCoach.js:176-191`. NEWBIE: hidden complexity. ATHLETE: genuine. EVIDENCE: VERIFIED.

### G-07 — Daily-rotation engines lack volume ramp (Fitbod)
SOURCE: CL:PG-F1. RESEARCH: Fitbod rotates daily, no systematic weekly volume ramp. VOLYUME STATUS: CONFIRMED
YES (Volyume ramps). PASS1 REF: `runAdaptiveEngine algorithms.js:963-979` clamps next-week sets [mev,mrv];
`computeAdaptiveLandmarks :1005`. EVIDENCE: VERIFIED.

### G-08 — Users punish arbitrary/illogical volume prescriptions
SOURCE: CG:PG-F3. RESEARCH: JuggernautAI criticised when volume logic feels arbitrary/black-box. VOLYUME
STATUS: CONFIRMED YES (transparency). PASS1 REF: plain-English reasons `WHY_LIBRARY weeklyCoach.js:254-297`;
landmark-bounded volume. NEWBIE+ATHLETE: explained. EVIDENCE: VERIFIED.

### G-09 — Onboarding: quiz, fast time-to-value, no paywall/jargon-first
SOURCE: GE:PG-F3, GE:ON-F1, GE:ON-F2, GE:ON-F3, CL:ON-F1, CL:ON-F2, CG:ON-U1. RESEARCH: progressive quiz,
value <~60s, ≤3 actions/screen; paywall/jargon-before-value kills beginners; D1 26%→D28 10%. VOLYUME STATUS:
CONFIRMED PARTIAL → Q2. PASS1 REF: onboarding forks on tier `RootNavigator.js:1138`; screens
WelcomeScreen/QuizScreen/FirstRunScreen/ProOnboardingScreen/ProGoalSetupScreen/ProSetupCompleteScreen. IF
PARTIAL: flow exists; time-to-first-value, jargon level, paywall position NOT verified → Q2. NEWBIE: decisive.
ATHLETE: minor. EVIDENCE: VERIFIED(market)/PARTIAL(code).

### G-10 — Adherence-neutral vs adherence-strict
SOURCE: GE:AC-F1, CL:AC-F1. RESEARCH: MacroFactor neutral (no guilt) preferred over Carbon strict. VOLYUME
STATUS: CONFIRMED PARTIAL (hybrid, non-punitive). PASS1 REF: `sessionAdherence<0.5 → stabilise weeklyCoach.js:620-621`;
cooldown/off-target gates `:668,:692-693`; trend-driven calorie logic `:766-785`. IF PARTIAL: trend-driven
(neutral-like) but stabilises (not guilt). NEWBIE: no shame. ATHLETE: predictable. EVIDENCE: VERIFIED(code).

### G-11 — Reverse-diet protocol
SOURCE: CL:AC-F2. RESEARCH: Carbon ships a dedicated reverse-diet (start at maintenance). VOLYUME STATUS:
CONFIRMED PARTIAL → Q3. PASS1 REF: diet-break `nutritionEngine.js:1056-1062`/`weeklyCoach.js:992-1010`,
refeed `:1041-1050`. IF PARTIAL: diet-break/refeed exist; an explicit user-facing "reverse diet" mode not
confirmed → Q3. NEWBIE: n/a. ATHLETE: post-show relevant. EVIDENCE: PARTIAL.

### G-12 — ED-safety guardrails: competitor absence vs Volyume lead
SOURCE: CG:AC-F3, GE:AC-F2[EXCLUDED—FF2], CL:FL-F1. RESEARCH: competitors don't advertise always-on/FFM
floors; calorie-tracking↔ED harm is academically real (Levinson 2017). VOLYUME STATUS: CONFIRMED YES (lead by
absence). PASS1 REF: FFM floor `nutritionEngine.js:119,:614`, sex floor `:792` (1500/1200), hard-gate loss
`:104,:808`, apply floor `coachApply.js:22`, ED detector `edPatternDetector.js`, FFM-hold `weeklyCoach.js:837-862`,
ED lockout `:1105-1163` — all tier-blind `proGate.js:22-23`. NEWBIE: protected. ATHLETE: protected even in
contest prep. EVIDENCE: VERIFIED(code) + NOT FOUND(competitor guardrails). (GE:AC-F2 resolution=EXCLUDED.)

### G-13 — UK curated food-DB moat
SOURCE: CG:NU-F1, GE:NU-F2, CL:NU-F1, CG:FL-F2. RESEARCH: curated UK DB (Nutracheck ~500K) beats
crowdsourced; real moat. VOLYUME STATUS: CONFIRMED YES. PASS1 REF: ships two UK snapshots — OpenFoodFacts UK
(branded) + CoFID UK (~3k generic) `src/lib/food/seed.js:7-11`. IF PARTIAL: coverage vs 500K bar not
measured → Q4. NEWBIE+ATHLETE(UK): moat. EVIDENCE: VERIFIED(code).

### G-14 — Compete on coaching logic, not DB size
SOURCE: CG:NU-F2. RESEARCH: MacroFactor/Carbon win on coaching logic not DB size. VOLYUME STATUS: CONFIRMED
YES. PASS1 REF: full nutrition engine `nutritionEngine.js` + coaching loop `weeklyCoach.js`. EVIDENCE: VERIFIED.

### G-15 — MFP scale + gates utilities; free barcode as lever
SOURCE: CG:NU-F3. RESEARCH: MFP 100M+ but gates barcode/scan. VOLYUME STATUS: CONFIRMED PARTIAL → Q5
(barcode tier in Volyume). PASS1 REF: barcode/food-diary are Pro (CLAUDE.md). IF PARTIAL: confirm barcode gate
line → Q5. EVIDENCE: PARTIAL.

### G-16 — Calorie planner / weekly macro flexibility
SOURCE: GE:NU-F1. RESEARCH: users want weekly calorie redistribution (borrow weekday→weekend). VOLYUME
STATUS: CONFIRMED PARTIAL → Q6. PASS1 REF: carb cycle `coachApply.js:81 MACRO_CYCLE_REST_DAY_CARB_CUT`,
macro-cycle eligibility `weeklyCoach.js:1020-1021`. IF PARTIAL: rest-day carb cut exists; user-facing weekly
calorie planner not confirmed → Q6. NEWBIE: helpful. ATHLETE: wanted. EVIDENCE: PARTIAL.

### G-17 — Micronutrient / NRV tracking
SOURCE: GE:NU-F3, CL:NU-F2, CL:NU-F3. RESEARCH: rising demand for micros vs UK NRVs. VOLYUME STATUS: CONFIRMED
PARTIAL → Q7. PASS1 REF: macros engine present; micronutrient tracking not located → Q7 (files: src/lib/food/).
NEWBIE: low priority. ATHLETE: some demand. EVIDENCE: PARTIAL.

### G-18 — Logging friction / adherence decay
SOURCE: CG:FL-F1, GE:FL-F1, CL:FL-F2, CG:FL-F3. RESEARCH: logging burden is the central churn lever
(~80% quit 90d; ~21% wk12). VOLYUME STATUS: CONFIRMED PARTIAL → Q8 (friction reducers present: copy-meal/
favourites/recipe?). PASS1 REF: food domain `src/lib/food/` (frequents.js, bulkEntryOps.js). NEWBIE: decisive.
ATHLETE: decisive. EVIDENCE: VERIFIED(market)/PARTIAL(code).

### G-19 — AI photo logging inaccuracy
SOURCE: GE:FL-F2, CL:FL-F3. RESEARCH: Cal AI/SnapCalorie 15-40% error; distrust. VOLYUME STATUS: CONFIRMED
YES (not a gap — sidesteps by design). PASS1 REF: deterministic manual logging, no LLM photo est (G-05).
EVIDENCE: VERIFIED.

### G-20 — Paywalling essential utilities backlash
SOURCE: GE:FL-F3. RESEARCH: moving barcode behind paywall = hostile, esp UK. VOLYUME STATUS: CONFIRMED PARTIAL
→ Q5 (barcode is Pro in Volyume — tension with this finding; founder pricing call). PASS1 REF: barcode Pro
(CLAUDE.md). IF PARTIAL: gating is a deliberate FREE/PRO decision → carry to Pass-4 as FOUNDER-GATE. EVIDENCE: PARTIAL.

### G-21 — Progress views: per-exercise + volume graphs
SOURCE: CG:PR-F1, GE:PR-K2. RESEARCH: per-exercise weight progression, volume/heatmaps, PR callouts. VOLYUME
STATUS: CONFIRMED YES. PASS1 REF: progress hooks `useProgressData.js`; PR detection `algorithms.js:530-580`;
PR celebration `PRCelebration.js`; analytics `AnalyticsScreen.js`. NEWBIE+ATHLETE: motivating. EVIDENCE: VERIFIED.

### G-22 — Trend-weight smoothing
SOURCE: CG:PR-F2, GE:PR-K1. RESEARCH: moving-average trend is standard, protects morale. VOLYUME STATUS:
CONFIRMED YES. PASS1 REF: `computeEWMA weeklyCoach.js:39` & `nutritionEngine.js:158`; robust trend
`weeklyCoach.js:577`; `WeightTrendCard.js`. EVIDENCE: VERIFIED.

### G-23 — Recomposition reframing (flat scale weight)
SOURCE: GE:PR-K3, CG:PR-F3. RESEARCH: flat weight must be reframed via measures/photos/PRs/body-fat. VOLYUME
STATUS: CONFIRMED PARTIAL → Q9. PASS1 REF: recomp phase `weeklyCoach.js:196-204`/`nutritionEngine.js:27-35`;
measurements `BodyMetricsScreen.js`. IF PARTIAL: data exists; whether the UI explicitly REFRAMES recomp not
confirmed → Q9; photos absent (G-24). NEWBIE: prevents churn. ATHLETE: relevant. EVIDENCE: PARTIAL.

### G-24 — Progress photos + measurements
SOURCE: CL:PR-F1, CL:PR-F2. RESEARCH: photos+measurements top demand; photos private-by-default. VOLYUME
STATUS: CONFIRMED PARTIAL. PASS1 REF: measurements PRESENT `BodyMetricsScreen.js:57-94`; photos ABSENT in
src (grep 0) though backend table exists `supabase/setup_complete.sql:251`. IF PARTIAL: measurements yes,
photos missing. NEWBIE+ATHLETE: high demand. EVIDENCE: VERIFIED(code).

### G-25 — Exercise library size + demo media
SOURCE: GE:EL-F3, CL:EL-F1, CL:EL-F2, CL:EL-F3, CG:EL-U1. RESEARCH: bar ~250→1,400; HD video/looping
animation demo norm. VOLYUME STATUS: CONFIRMED PARTIAL → Q10. PASS1 REF: exercises table + seed
`database.js` / `seedExercises.js`. IF PARTIAL: count + demo media (video/animation/none) not located → Q10.
NEWBIE: demos build confidence. ATHLETE: breadth. EVIDENCE: PARTIAL.

### G-26 — Custom exercises + smart substitutions
SOURCE: GE:EL-F1, GE:EL-F2. RESEARCH: custom creation + equipment-busy substitutions expected. VOLYUME
STATUS: CONFIRMED PARTIAL → Q10. PASS1 REF: substitution engine `getExerciseSubstitutes algorithms.js:785-812`;
custom-exercise creation UI not located → Q10. NEWBIE: helpful. ATHLETE: needed. EVIDENCE: PARTIAL.

### G-27 — Retention mechanics / streak-freeze / no-guilt
SOURCE: GE:RE-K1, GE:RE-K2, GE:RE-K3, CL:RE-F1, CL:RE-F2, CL:RE-F3, CG:RE-U1. RESEARCH: streaks/PRs/social
retain; streak-freeze beats all-or-nothing guilt; D30 ~3%. VOLYUME STATUS: CONFIRMED YES (lead). PASS1 REF:
streak system `useWeeklyStreak.js`, `WeeklyStreakStrip.js`, `lib/streak.js`, `lib/streakState.js`;
ED-safe freeze `useWeeklyStreak.js:9`; PR celebration `PRCelebration.js`. IF PARTIAL: social feed not located
→ Q11. NEWBIE: forgiving. ATHLETE: PRs. EVIDENCE: VERIFIED(code).

### G-28 — Navigation IA / feature-overload / redesign backlash
SOURCE: GE:NA-F1, GE:NA-F2, GE:NA-F3, CL:NA-F1, CL:NA-F2, CG:NA-U1. RESEARCH: ≤5 tabs; overload (JEFIT) =
uninstall; Fitbit/Google-Health & MFP redesigns backlashed (glanceable data > AI text). VOLYUME STATUS:
CONFIRMED PARTIAL → Q12. PASS1 REF: 108 routes `extract/s7-routes.txt`; tab count/IA not isolated → Q12.
NEWBIE: overload risk. ATHLETE: depth without clutter. EVIDENCE: PARTIAL.

### G-29 — Touch targets / WCAG / EAA
SOURCE: GE:DE-K1, GE:DE-K2, GE:DE-K3, CL:DE-F1, CL:DE-F2, CG:DE-U1. RESEARCH: 24px AA / 44px AAA; 44
practical; EAA legal in EU; data>text. VOLYUME STATUS: CONFIRMED PARTIAL → Q13. PASS1 REF: 189 touch-targets
`extract/s8-touch.txt`; theme tokens pass1-sections-5to8. IF PARTIAL: 189 located; full compliance of ALL
interactive elements not audited → Q13 (Volyume is EU → EAA applies). NEWBIE+ATHLETE: mis-taps. EVIDENCE: VERIFIED(std)/PARTIAL(audit).

### G-30 — Wearable integration / standalone watch
SOURCE: GE:MF-F2, CL:MF-F2. RESEARCH: Apple Health/Health Connect table-stakes; standalone watch valued.
VOLYUME STATUS: CONFIRMED PARTIAL. PASS1 REF: `health.js` reads steps+weight, writes workouts (`:517,:524`);
HealthConnect present. IF PARTIAL: sync yes; standalone watch app not located → Q14. NEWBIE: convenience.
ATHLETE: wanted. EVIDENCE: PARTIAL.

### G-31 — Apple medical-device declaration (26 Mar 2026)
SOURCE: CL:MF-F3. RESEARCH: Apple requires Health/Fitness apps to declare medical-device status. VOLYUME
STATUS: cannot resolve from code → Q15 (compliance/store-listing, not code). EVIDENCE: PARTIAL(single-source).

### G-32 — Contest-prep / peak-week / posing tools
SOURCE: CG:MF-U1. RESEARCH: posing/peak-week tooling = white space (absent in competitors). VOLYUME STATUS:
CONFIRMED PARTIAL. PASS1 REF: contest_prep phase `nutritionEngine.js:27-35`, contest refeed/diet-break
`:1041-1062`, competition macro-cycle `weeklyCoach.js:1020-1050`. IF PARTIAL: nutrition peak logic yes; a
posing/peak-week UI tool not located → Q16. ATHLETE: high value. NEWBIE: n/a. EVIDENCE: PARTIAL.

### G-33 — Jargon / newbie barrier
SOURCE: GE:NE-F1, GE:NE-F2, GE:NE-F3, CL:NE-F1, CL:NE-F2, CG:NE-U1. RESEARCH: RIR/MEV/mesocycle alienates;
blank canvas churns; inline video + auto-progression guide. VOLYUME STATUS: CONFIRMED PARTIAL → Q2/Q17.
PASS1 REF: plain-English coach `WHY_LIBRARY weeklyCoach.js:254-297`; experience tiers `nutritionEngine.js:709-723`.
IF PARTIAL: coach copy plain; whether in-app LABELS/tooltips are jargon-free not audited → Q17. NEWBIE: decisive.
ATHLETE: precision retained. EVIDENCE: VERIFIED(coach copy)/PARTIAL(labels).

### G-34 — Weekly check-in: short, conditional, wellbeing-aware
SOURCE: GE:CK-F1, GE:CK-F2, GE:CK-F3, CL:CK-F1, CL:CK-F2, CG:CK-U1. RESEARCH: short (~3 Q) + branch on
adherence + sleep/soreness/readiness; auto-pull averages. VOLYUME STATUS: CONFIRMED YES. PASS1 REF:
`WeeklyCheckInScreen.js`; recovery from energy/soreness/stress `getRecoveryScore weeklyCoach.js:144-154`;
sleep `:974-979`; menstrual/illness/injury `parseNoteFlags :313`; conditional gates `:620,:645-651,:668`.
IF PARTIAL: question count/length not measured → Q18. NEWBIE: easy. ATHLETE: contextual. EVIDENCE: VERIFIED(code).

### G-35 — Progressive disclosure / dual-audience / tiered autonomy
SOURCE: GE:SC-K1, GE:SC-K2, GE:SC-K3, CL:SC-F1, CL:SC-F2, CG:SC-U1. RESEARCH: progressive disclosure is the
one-product dual-audience mechanism; MacroFactor Coached/Collaborative/Manual; granular override for elite;
no app spans beginner→elite. VOLYUME STATUS: CONFIRMED PARTIAL → Q19. PASS1 REF: engine tiers
`SURPLUS_EXP_MULT nutritionEngine.js:709-714`, `GAIN_RATE_TARGETS :718-723`, `goal_lock_advanced
edPatternDetector.js:23-24`, experience UI `ProGoalSetupScreen.js:38-110`; explicit user-apply step
`CoachOutputScreen markApplied/isApplied` (pass1-section1 + locate). IF PARTIAL: engine tiers + apply-step
exist; a Coached/Collaborative/MANUAL autonomy toggle + UI progressive-disclosure not confirmed; manual-goal
editor "a later pass" `useWeeklyStreak.js` docstring → Q19. NEWBIE+ATHLETE: core thesis. EVIDENCE: PARTIAL.

---

## COVERAGE CHECK (anti-drop)
35 GAP entries cover all 97 finding IDs (WS9 PG8 AC9 NU9 FL9 PR8 ON6 EL7 RE7 NA6 DE6 MF7 NE6 CK6 SC6).
2 EXCLUDED rows (GE:WS-K2, GE:AC-F2) listed with resolution=EXCLUDED — present, not dropped. Open items go to
`pass3-unresolved-questions.md` as Q1–Q19. Comparison matrix per area → `pass3-comparison-matrix.md`.
Reconciliation counts → `pass3-reconciliation.md` (built after the resolution loop closes Q1–Q19).
