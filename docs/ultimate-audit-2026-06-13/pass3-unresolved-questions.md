# pass3-unresolved-questions.md (per `_AUDIT-SPEC.md:182-185`)
Format: Q[n]: question | depends-on: gap-id | files-to-check. Each is answered with file:line in
`pass3-unresolved-answers.md` via the resolution loop. Pass 4 cannot start while any is open.

Q1: How many taps to log a set, and is previous-session data shown inline on the log screen? | depends-on: G-01,G-02 | files: src/screens/ActiveWorkoutScreen.js
Q2: Onboarding — time to first value, jargon level, and paywall position in the first-run flow? | depends-on: G-09,G-33 | files: src/screens/WelcomeScreen.js, QuizScreen.js, FirstRunScreen.js, ProOnboardingScreen.js
Q3: Is there an explicit user-facing reverse-diet mode? | depends-on: G-11 | files: src/lib/nutritionEngine.js, src/screens/CoachOutputScreen.js
Q4: UK food-DB coverage (item count / snapshot size)? | depends-on: G-13 | files: src/lib/food/seed.js, assets/seed/
Q5: Is barcode scanning gated FREE or PRO, at which line? | depends-on: G-15,G-20 | files: src/screens/ScanBarcodeScreen.js
Q6: Is there a user-facing weekly calorie planner / day-to-day redistribution? | depends-on: G-16 | files: src/screens/CoachOutputScreen.js, NutritionTargetsScreen.js, src/lib/coachApply.js
Q7: Does the app track micronutrients (vitamins/minerals vs NRVs)? | depends-on: G-17 | files: src/lib/food/
Q8: Which logging friction-reducers exist (copy-meal, favourites/frequents, recipes)? | depends-on: G-18 | files: src/lib/food/frequents.js, bulkEntryOps.js
Q9: Does the progress UI explicitly reframe recomposition on flat weight? | depends-on: G-23 | files: src/screens/AnalyticsScreen.js, BodyMetricsScreen.js
Q10: Exercise library size, demo media format, and custom-exercise creation? | depends-on: G-25,G-26 | files: src/lib/seedExercises.js, src/lib/database.js, exercise library screen
Q11: Is there a social/accountability feed? | depends-on: G-27 | files: src/hooks/usePartners.js, src/lib/partners/
Q12: Bottom-tab count and IA? | depends-on: G-28 | files: src/navigation/RootNavigator.js
Q13: Are all interactive elements WCAG-compliant (≥44/48), beyond the 189 located? | depends-on: G-29 | files: extract/s8-touch.txt, src/styles/theme.js
Q14: Is there a standalone (phone-free) watch app? | depends-on: G-30 | files: app.json, src/lib/health.js
Q16: Is there a posing / peak-week UI tool (beyond nutrition peak logic)? | depends-on: G-32 | files: src/screens/, src/navigation/RootNavigator.js
Q17: Are in-app labels/tooltips jargon-free (RIR/MEV/mesocycle explained inline)? | depends-on: G-33 | files: src/screens/ (coach/plan), src/components/
Q18: How many questions is the weekly check-in, and is it conditional? | depends-on: G-34 | files: src/screens/WeeklyCheckInScreen.js
Q19: Are there Coached/Collaborative/Manual coaching-autonomy modes / override? | depends-on: G-35 | files: src/screens/CoachOutputScreen.js, SettingsCoachingScreen.js, src/lib/coachApply.js

NON-CODE (routed to Pass-4 founder-gate, not the codebase loop):
Q15: Apple 26 Mar 2026 medical-device declaration compliance | depends-on: G-31 | NOT code-resolvable — store/compliance decision → pass4-needs-answer-register / FOUNDER-GATE.
