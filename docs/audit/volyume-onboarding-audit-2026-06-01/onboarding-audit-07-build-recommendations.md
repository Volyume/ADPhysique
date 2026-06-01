# Onboarding Audit 07 — Prioritised Build Recommendations

Status: COMPLETE (Phase 7 of 7)
Date: 2026-06-01
Method: every proposed change broken into an implementable unit, scored by
Impact (1-5) and Effort (1-5, lower is cheaper). Priority = Impact first, then
low Effort. Nothing is built yet. Await confirmation.

---

## CRITICAL (copy referencing things that no longer work, or active misdirection)

| ID | Change | Files | Impact | Effort |
|---|---|---|---|---|
| C1 | Replace the "Use MyFitnessPal or Cronometer" instruction with an introduction to the Eat / Diary logger. | `NutritionEducationScreen.js:103-109` | 5 | 1 |
| C2 | Re-frame the paywall: Pro is the coach, not "adds food data / food layer". | `PaywallScreen.js:107-109` | 4 | 1 |
| C3 | Remove the defunct `Complete` column from the comparison strip (2-tier model). | `TierComparisonStrip.js:23-74`, `PaywallScreen.js` | 4 | 2 |
| C4 | Make trial length consistent and wired to `cascade.js`. Fix the "14 days" CTA and the day14/28 docstring. | `PaywallScreen.js:92-94`, `CascadeGateScreen.js:5-7` | 3 | 2 |
| C5 | Fix the price to read from the catalogue (no hardcoded £2.99). | `PaywallScreen.js:91` | 3 | 1 |
| C6 | Fix "Answer 3 questions" to match the 2-step quiz (or add a third step). | `PlanLibraryScreen.js:439` | 2 | 1 |
| C7 | Replace the "MAV-level volume" jargon leak in user copy. | `coachingGoals.js:240` | 2 | 1 |

C1 is the single highest-value fix: it is one paragraph, and it stops onboarding
sending new users to a competitor.

## CRITICAL (parity / broken paths)

| ID | Change | Files | Impact | Effort |
|---|---|---|---|---|
| C8 | Add days-per-week to onboarding (currently hardcoded 4) so first plans are not always 4-day. | `ProOnboardingScreen.js:41,536`, step 3 UI | 5 | 3 |
| C9 | Make the coached builder (`ProGoalSetup`) reachable from the Plans tab for every Pro user, not only Pro-with-active-plan. | `PlansScreen.js:33-49,362-367` | 4 | 2 |
| C10 | Persist `planWeakPoints` into the saved profile so a later regenerate keeps them. | `ProOnboardingScreen.js:460-483` | 3 | 1 |

## HIGH (structural / new introductions / pre-population)

| ID | Change | Files | Impact | Effort |
|---|---|---|---|---|
| H1 | Add the "How coaching works" line (weigh in, check in, food optional) to onboarding and the reveal. | `ProOnboardingScreen.js` step 4, `ProSetupCompleteScreen.js` | 5 | 2 |
| H2 | Introduce the Eat logger in the flow (in context), replacing the deferred external explainer. | `ProSetupCompleteScreen.js`, new in-context cue | 4 | 3 |
| H3 | Add protein approach to onboarding (collapsible, default optimised). | `ProOnboardingScreen.js` step 3 | 3 | 2 |
| H4 | Remove the duplicate account step, share one account component between Login and the wizard. | `LoginScreen.js`, `ProOnboardingScreen.js:602-727` | 3 | 4 |
| H5 | Unify selection components so onboarding and the builder look identical. | `ProOnboardingScreen.js`, `ProGoalSetupScreen.js` | 3 | 4 |
| H6 | Surface read-only body weight in the builder (the nutrition recalc depends on it). | `ProGoalSetupScreen.js:183-209` | 2 | 2 |
| H7 | Align weak-point scope between onboarding (scoped) and builder (full list). | `ProGoalSetupScreen.js:355`, `coachingGoals.weakPointSetForGoal` | 2 | 2 |
| H8 | Consolidate the five goal/division vocabularies to one source. | `ManualBuilderScreen.js`, `PlanLibraryScreen.js`, `coachingGoals.js` | 3 | 4 |

## POLISH (copy, residue, micro-interactions)

| ID | Change | Files | Impact | Effort |
|---|---|---|---|---|
| P1 | Make or remove the cosmetic Manual Builder goal pills. | `ManualBuilderScreen.js:20-26,378-379` | 2 | 2 |
| P2 | Remove dead create-block modal styles from MesocycleBuilder. | `MesocycleBuilderScreen.js:495-529` | 1 | 1 |
| P3 | Gloss "Precision Coaching" at first use. | `WelcomeScreen.js` | 2 | 1 |
| P4 | Fix the "Not competing" + trophy-icon mismatch on the reveal chip. | `ProSetupCompleteScreen.js:166-167` | 1 | 1 |
| P5 | Move the developer crash banner out of the user-facing Login surface (beta only). | `LoginScreen.js:238-247` | 1 | 1 |
| P6 | Add a one-line first-run cue on Home for new Pro users. | `HomeScreen.js` | 2 | 2 |
| P7 | Confirm the canonical food-feature name (Eat vs Diary) and make the tab + copy consistent. | `RootNavigator.js:350`, `DiaryScreen.js:450` | 2 | 1 |

## Suggested sequencing

1. **Ship C1-C7 first** (one short PR). All are copy/asset, mostly Effort 1,
   and they stop the active misdirection and the defunct-tier display.
2. **Then C8-C10 + H1-H3** (parity and the coaching-truth message). Medium
   effort, high impact.
3. **Then H4-H8** (structural unification). Higher effort, do once the copy and
   parity are right.
4. **Polish P1-P7** alongside or after.

Impact x (6 - Effort) ranking puts C1, C5, C6, C10, H1 at the top: highest
impact for least work.
