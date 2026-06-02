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
| H5 | Put the app's shared header chrome on the flow screens | flow screens | 4 | 3 | PARTIAL: coached builder now uses BackHeader `aed6c78`. Reveal now shares the wizard's header system (brand row, full step bar, eyebrow, h2 title, matched card chrome) `89e0a9f`, so it reads as the last beat of the wizard rather than a different screen; the glowing-orb completion frame is gone. ManualBuilder and the wizard's own header still bespoke by design (the wizard progress bar is intentional). The wizard's back control is now folded into the shared Header (chevron inline on the brand row) instead of floating above the logo `384a3d3`. Remaining: decide if ManualBuilder wants BackHeader |
| H6 | Render the reveal's calories/macros via the Diary macro-bar look | ProSetupCompleteScreen | 4 | 3 | DONE `803019b`. Founder picked "match Diary look, target framing": kcal hero + Diary-style horizontal macro bars showing the targets, no empty ring / "remaining". Literal MacroRings was rejected because it is a progress tracker and would show zeros on the reveal |
| H7 | Remove the duplicate account step (one shared component) | LoginScreen, ProOnboardingScreen:602-727 | 3 | 4 | OPEN. Auth-critical, verify OAuth + email paths |
| H8 | Unify the three plan-creation selection components | ProOnboarding, ProGoalSetup, ManualBuilder | 3 | 4 | DONE `182c11c` (wizard + coached builder). Founder picked the hybrid: shared `SegmentedControl` for days/session, shared `OptionCard` (icon + label + one-line detail + checkmark) for experience/equipment/focus/recovery, used on both screens. Division and protein pickers left as distinct control types. ManualBuilder is a different surface (exercise picking, not profile selection), not part of this unification |
| H9 | Surface read-only body weight in the builder | ProGoalSetupScreen | 2 | 2 | DONE `3a2a2eb` |

## Polish
| ID | Change | Files | Impact | Effort | Status |
|---|---|---|---|---|---|
| P1 | Make or remove the "cosmetic" Manual Builder goal pills | ManualBuilderScreen | 2 | 2 | N/A. Audit finding was wrong. The pill is not cosmetic: `selectedGoal` flows through `goalLabel` into `createProgramme(...)` (ManualBuilderScreen:378-379), so it is persisted onto the plan record. A hand-built plan does not run the engine, so storing a label is the correct behaviour. No change |
| P2 | Remove dead create-block modal styles | MesocycleBuilderScreen | 1 | 1 | DONE `94badc8`. Verified every style unreferenced before removing |
| P3 | Remove dead legacy-goal branches | GoalChangeSummaryScreen:38-44 | 1 | 1 | DONE `708fccd` |
| P4 | Replace "MAV-level volume" jargon | coachingGoals.js:240 | 2 | 1 | DONE `fc30e30` |
| P5 | Gloss "Precision Coaching" at first use | WelcomeScreen | 2 | 1 | N/A. Already glossed inline at first use (WelcomeScreen:22, "Precision Coaching that adjusts your training and nutrition as your body responds"). Adding more would be footnote-creep |
| P6 | First-run cue on Home for new Pro users | HomeScreen | 2 | 2 | DONE `4127306`. One line above the workout card, "Your plan is ready. Start your first session.", starts the session on tap and dismisses. Gated on totalSessions === 0 plus a per-user saved flag. No tour |
| P7 | Move the developer crash banner out of Login | LoginScreen:238-247 | 1 | 1 | OPEN. Deliberate beta tool, confirm with founder before removing |
| P8 | Fix "Not competing" + trophy-icon mismatch on the reveal chip | ProSetupCompleteScreen:166 | 1 | 1 | DONE `708fccd` |

## Next-session plan
1. H7 account-step dedup, with explicit auth-path verification (email + Google +
   Apple, and the consent interruption). Auth-critical, needs a founder call.
2. P7 crash banner, pending a founder call (deliberate beta tool).
3. H5 leftover: decide whether ManualBuilder adopts BackHeader.

Done: all Critical (C1-C8); High H1, H2, H3, H4, H6, H8, H9, plus H5 mostly
(coached builder BackHeader, reveal shares the wizard header system, wizard back
control folded into the shared Header, wizard + builder selectors unified).
Remaining High: H7. Polish: P2/P3/P4/P6/P8 done, P1/P5 closed as N/A
(corrections recorded above), P7 open (founder call).

Also fixed from device testing (not original audit items): training-load
suitability (assisted regressions kept out of plans and swaps for
non-beginners) and a custom-exercise path from the in-workout Swap sheet
`fe9b225`.
