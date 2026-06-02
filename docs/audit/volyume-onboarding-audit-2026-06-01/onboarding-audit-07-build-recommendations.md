# Onboarding Audit 07 — Prioritised Build Recommendations (live tracker)

Status: IN PROGRESS. Date opened 2026-06-01. Last updated 2026-06-02 session.
Scored Impact (1-5) x Effort (1-5, lower is cheaper).

Shipped 2026-06-01 in three batches on main:
- Batch 1 `fc30e30` (critical copy/asset)
- Batch 2 `096167e` (critical parity + high-value truth)
- Batch 3 `708fccd` (polish)

Shipped 2026-06-02 on main (pushed, build the APK from main):
- `3a2a2eb` H1 step-4 coaching-loop card + H9 read-only weight in the builder
- `aed6c78` H5 (partial) coached builder routed through the shared BackHeader
- `0920b70` H3 protein selector in onboarding, with no-target-shift invariant tests
- `94badc8` P2 dead modal-style removal

Status key: DONE = merged to main. OPEN = still to do. N/A = assessed, no change
needed (reason given).

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
| H1 | "How coaching works / food optional" message | ProOnboardingScreen, ProSetupCompleteScreen | 5 | 2 | DONE: reveal line `096167e` + step-4 card `3a2a2eb` |
| H2 | Introduce the in-app food process in context | ProSetupCompleteScreen, NutritionEducationScreen | 4 | 2 | DONE `fc30e30`/`096167e` |
| H3 | Add protein approach to onboarding (collapsible) | ProOnboardingScreen step 3 | 3 | 2 | DONE `0920b70`. Default is a passthrough = engine auto-pick, so no target shift. Invariant tests added |
| H4 | Persist planWeakPoints into the saved profile | ProOnboardingScreen:460-483 | 3 | 1 | DONE `096167e` |
| H5 | Put the app's shared header chrome on the flow screens | flow screens | 4 | 3 | PARTIAL: coached builder now uses BackHeader `aed6c78`. ManualBuilder, wizard and reveal still bespoke. Decide per screen in the running app (the wizard's progress bar and the reveal's celebratory frame are intentional, not every screen wants the tab/back header) |
| H6 | Render the reveal's calories/macros/plan via MacroRings + plan card | ProSetupCompleteScreen | 4 | 3 | OPEN, NEEDS A CALL. MacroRings is a progress tracker (eaten vs target, "X remaining"). On the reveal nothing is logged yet, so it would draw an empty ring and "{target} remaining" instead of the current target-as-hero. Either accept that (it equals day-one Diary) or keep target framing and only borrow the macro-bar look. Eyeball the current reveal in the APK and decide |
| H7 | Remove the duplicate account step (one shared component) | LoginScreen, ProOnboardingScreen:602-727 | 3 | 4 | OPEN. Auth-critical, verify OAuth + email paths |
| H8 | Unify the three plan-creation selection components | ProOnboarding, ProGoalSetup, ManualBuilder | 3 | 4 | OPEN |
| H9 | Surface read-only body weight in the builder | ProGoalSetupScreen | 2 | 2 | DONE `3a2a2eb` |

## Polish
| ID | Change | Files | Impact | Effort | Status |
|---|---|---|---|---|---|
| P1 | Make or remove the "cosmetic" Manual Builder goal pills | ManualBuilderScreen | 2 | 2 | N/A. Audit finding was wrong. The pill is not cosmetic: `selectedGoal` flows through `goalLabel` into `createProgramme(...)` (ManualBuilderScreen:378-379), so it is persisted onto the plan record. A hand-built plan does not run the engine, so storing a label is the correct behaviour. No change |
| P2 | Remove dead create-block modal styles | MesocycleBuilderScreen | 1 | 1 | DONE `94badc8`. Verified every style unreferenced before removing |
| P3 | Remove dead legacy-goal branches | GoalChangeSummaryScreen:38-44 | 1 | 1 | DONE `708fccd` |
| P4 | Replace "MAV-level volume" jargon | coachingGoals.js:240 | 2 | 1 | DONE `fc30e30` |
| P5 | Gloss "Precision Coaching" at first use | WelcomeScreen | 2 | 1 | N/A. Already glossed inline at first use (WelcomeScreen:22, "Precision Coaching that adjusts your training and nutrition as your body responds"). Adding more would be footnote-creep |
| P6 | First-run cue on Home for new Pro users | HomeScreen | 2 | 2 | OPEN |
| P7 | Move the developer crash banner out of Login | LoginScreen:238-247 | 1 | 1 | OPEN. Deliberate beta tool, confirm with founder before removing |
| P8 | Fix "Not competing" + trophy-icon mismatch on the reveal chip | ProSetupCompleteScreen:166 | 1 | 1 | DONE `708fccd` |

## Next-session plan
1. The reveal (H6): eyeball it in the APK and pick a direction (literal
   MacroRings vs target-forward with a borrowed bar look). Then H5 on the
   wizard and reveal once the reveal direction is set, then H8.
2. H7 account-step dedup, with explicit auth-path verification (email + Google +
   Apple, and the consent interruption).
3. P6 first-run Home cue, then P7 pending a founder call.

All Critical (C1-C8) and all High except H5 (partial), H6, H7, H8 are done.
Polish: P1 and P5 closed as N/A (corrections above), P2/P3/P4/P8 done, P6/P7 open.
