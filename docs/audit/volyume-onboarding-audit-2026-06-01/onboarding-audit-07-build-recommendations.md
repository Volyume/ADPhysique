# Onboarding Audit 07 — Prioritised Build Recommendations

Status: COMPLETE (Phase 7 of 7). Date: 2026-06-01. Scored Impact (1-5) x Effort
(1-5, lower is cheaper). No code changed.

---

## Critical (old-feature copy, parity gaps, dead ends)
| ID | Change | Files | Impact | Effort |
|---|---|---|---|---|
| C1 | Replace the "use MyFitnessPal/Cronometer" line with the in-app food process | NutritionEducationScreen:103-109 | 5 | 1 |
| C2 | Remove the defunct `Complete` column from the comparison strip | TierComparisonStrip:23-74, PaywallScreen | 4 | 2 |
| C3 | Make trial length consistent and wired to cascade.js (fix "14 days" + docstring) | PaywallScreen:92-94, CascadeGateScreen:5-7 | 3 | 2 |
| C4 | Read price from the catalogue (drop hardcoded £2.99) | PaywallScreen:91 | 3 | 1 |
| C5 | Re-frame the paywall: Pro is the coach, not "food data" | PaywallScreen:107-109 | 4 | 1 |
| C6 | Fix "Answer 3 questions" to match the 2-step quiz | PlanLibraryScreen:439 | 2 | 1 |
| C7 | Add days-per-week to onboarding (so first plans are not always 4-day) | ProOnboardingScreen:41,536 + step 3 | 5 | 3 |
| C8 | Make the coached builder reachable on the Plans tab for every Pro user | PlansScreen:33-49,362-367 | 4 | 2 |

## High (structure, pre-population, absent introductions)
| ID | Change | Files | Impact | Effort |
|---|---|---|---|---|
| H1 | Add the "how coaching works / food optional" line to onboarding + reveal | ProOnboardingScreen, ProSetupCompleteScreen | 5 | 2 |
| H2 | Introduce the in-app food logging process in context (replace external explainer) | ProSetupCompleteScreen, NutritionEducationScreen | 4 | 2 |
| H3 | Add protein approach to onboarding (collapsible, default optimised) | ProOnboardingScreen step 3 | 3 | 2 |
| H4 | Persist planWeakPoints into the saved profile | ProOnboardingScreen:460-483 | 3 | 1 |
| H5 | Put the app's ScreenHeader frame on the flow screens | all flow screens | 4 | 3 |
| H6 | Render the reveal's calories/macros/plan via MacroRings + plan card | ProSetupCompleteScreen | 4 | 3 |
| H7 | Remove the duplicate account step (share one account component) | LoginScreen, ProOnboardingScreen:602-727 | 3 | 4 |
| H8 | Unify the three plan-creation surfaces to one selection language | ProOnboarding, ProGoalSetup, ManualBuilder | 3 | 4 |
| H9 | Surface read-only body weight in the builder | ProGoalSetupScreen:183-209 | 2 | 2 |

## Polish
| ID | Change | Files | Impact | Effort |
|---|---|---|---|---|
| P1 | Make or remove the cosmetic Manual Builder goal pills | ManualBuilderScreen:20-26 | 2 | 2 |
| P2 | Remove dead create-block modal styles | MesocycleBuilderScreen:495-529 | 1 | 1 |
| P3 | Remove dead legacy-goal branches | GoalChangeSummaryScreen:38-44 | 1 | 1 |
| P4 | Replace "MAV-level volume" jargon | coachingGoals.js:240 | 2 | 1 |
| P5 | Gloss "Precision Coaching" at first use | WelcomeScreen | 2 | 1 |
| P6 | Align the five goal/division vocabularies to one source | ManualBuilder, PlanLibrary, coachingGoals | 3 | 4 |
| P7 | Move the developer crash banner out of the user Login surface | LoginScreen:238-247 | 1 | 1 |
| P8 | Fix "Not competing" + trophy-icon mismatch on the reveal chip | ProSetupCompleteScreen:166 | 1 | 1 |

## Suggested order
1. Ship C1-C6 (copy/asset, mostly Effort 1): stops the wrong references and the
   defunct-tier display.
2. C7-C8 + H1-H4: parity and the coaching-truth message.
3. H5-H9: design unification of the journey with the app.
4. Polish.
Highest impact for least work: C1, C4, C5, C6, H1, H4.
