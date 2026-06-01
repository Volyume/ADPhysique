# Onboarding Audit 07 — Prioritised Build Recommendations (live tracker)

Status: IN PROGRESS. Date opened 2026-06-01. Last updated end of 2026-06-01
session. Scored Impact (1-5) x Effort (1-5, lower is cheaper).

Shipped this session in three batches on main:
- Batch 1 `fc30e30` (critical copy/asset)
- Batch 2 `096167e` (critical parity + high-value truth)
- Batch 3 `708fccd` (polish)

Status key: DONE = merged to main this session. OPEN = for the next session.

---

## Critical
| ID | Change | Files | Impact | Effort | Status |
|---|---|---|---|---|---|
| C1 | Replace "use MyFitnessPal/Cronometer" with the in-app food process | NutritionEducationScreen:103-109 | 5 | 1 | DONE `fc30e30` |
| C2 | Remove the defunct `Complete` column (Free vs Pro strip) | TierComparisonStrip | 4 | 2 | DONE `fc30e30` |
| C3 | Trial length consistent (21 days), fix docstring | PaywallScreen, CascadeGateScreen | 3 | 2 | DONE `fc30e30` |
| C4 | Price from the catalogue, drop hardcoded £2.99 | PaywallScreen:91 | 3 | 1 | DONE `fc30e30` |
| C5 | Reframe the paywall: Pro is the coach, not "food data" | PaywallScreen:107-109 | 4 | 1 | DONE `fc30e30` |
| C6 | Fix "Answer 3 questions" to match the 2-step quiz | PlanLibraryScreen:439 | 2 | 1 | DONE `fc30e30` |
| C7 | Add days-per-week to onboarding (not hardcoded 4) | ProOnboardingScreen | 5 | 3 | DONE `096167e` |
| C8 | Coached builder reachable for every Pro user | PlansScreen | 4 | 2 | DONE `096167e` |

## High
| ID | Change | Files | Impact | Effort | Status |
|---|---|---|---|---|---|
| H1 | "How coaching works / food optional" message | ProOnboardingScreen, ProSetupCompleteScreen | 5 | 2 | PARTIAL: reveal line shipped `096167e`; the step-4 card is OPEN |
| H2 | Introduce the in-app food process in context | ProSetupCompleteScreen, NutritionEducationScreen | 4 | 2 | DONE `fc30e30`/`096167e` |
| H3 | Add protein approach to onboarding (collapsible) | ProOnboardingScreen step 3 | 3 | 2 | OPEN. Verify the engine's protein default first so targets do not shift |
| H4 | Persist planWeakPoints into the saved profile | ProOnboardingScreen:460-483 | 3 | 1 | DONE `096167e` |
| H5 | Put the app's ScreenHeader frame on the flow screens | all flow screens | 4 | 3 | OPEN. Verify visually in the running app |
| H6 | Render the reveal's calories/macros/plan via MacroRings + plan card | ProSetupCompleteScreen | 4 | 3 | OPEN. Verify visually |
| H7 | Remove the duplicate account step (one shared component) | LoginScreen, ProOnboardingScreen:602-727 | 3 | 4 | OPEN. Auth-critical, verify OAuth + email paths |
| H8 | Unify the three plan-creation selection components | ProOnboarding, ProGoalSetup, ManualBuilder | 3 | 4 | OPEN |
| H9 | Surface read-only body weight in the builder | ProGoalSetupScreen:183-209 | 2 | 2 | OPEN |

## Polish
| ID | Change | Files | Impact | Effort | Status |
|---|---|---|---|---|---|
| P1 | Make or remove the cosmetic Manual Builder goal pills | ManualBuilderScreen:20-26 | 2 | 2 | OPEN |
| P2 | Remove dead create-block modal styles | MesocycleBuilderScreen:495-529 | 1 | 1 | OPEN. Grep-verify unused before deleting |
| P3 | Remove dead legacy-goal branches | GoalChangeSummaryScreen:38-44 | 1 | 1 | DONE `708fccd` |
| P4 | Replace "MAV-level volume" jargon | coachingGoals.js:240 | 2 | 1 | DONE `fc30e30` |
| P5 | Gloss "Precision Coaching" at first use | WelcomeScreen | 2 | 1 | OPEN (arguably already glossed inline) |
| P6 | First-run cue on Home for new Pro users | HomeScreen | 2 | 2 | OPEN |
| P7 | Move the developer crash banner out of Login | LoginScreen:238-247 | 1 | 1 | OPEN. Deliberate beta tool, confirm with founder before removing |
| P8 | Fix "Not competing" + trophy-icon mismatch on the reveal chip | ProSetupCompleteScreen:166 | 1 | 1 | DONE `708fccd` |

## Next-session plan
1. Design unification with the app running and verified visually: H5 (ScreenHeader
   on the flow), H6 (reveal via MacroRings + plan card), then H8.
2. H7 account-step dedup, with explicit auth-path verification (email + Google +
   Apple, and the consent interruption).
3. Contained additive items: H3 (after checking the protein default), H9, P6,
   plus the H1 step-4 card and the remaining polish P1, P2, P5.
4. Leave P7 pending a founder call.
