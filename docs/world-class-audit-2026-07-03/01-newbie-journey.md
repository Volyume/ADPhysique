# Track 1: newbie journey (day 0 to day 14)

JOURNEY VERDICT: Welcome/consent/free on-ramp/trial-end/lapse are EXEMPLARY (OB-1
trial-first, Article 9 UX, FreeStarter 3-question ramp, CascadeGate calm, winback
ED-safe). The gaps cluster in ProOnboarding polish, first-moment confirmations, and one
big conceptual hole. Note: quiz-first pre-account path is BUILT but switched OFF
(quizFlow.js:24 ONBOARDING_QUIZ_FIRST=false).

TOP FINDINGS RANKED:
1. S: "Precision Coaching" never explained BEFORE it acts — MethodologyScreen only
   linked from CoachOutput (after first output). Wire links from ProSetupComplete
   check-in card + Home trial banner. THE conceptual hole of the trial.
2. S copy: trial length/day-14 consequence never stated at setup — one calm sentence on
   ProSetupComplete (reuse CascadeGate copy).
3. S TRUST BUG: every exercise's first-ever set fires full PERSONAL RECORD confetti
   (algorithms.js:567, heaviestEver starts 0) — every exercise, every user. Relabel
   "First lift logged" / suppress when history empty. Celebration logic, not engine.
4. S: first-ever food log = weakest confirmation in app (silent goBack, no toast/Undo
   unlike every other log action). Apply existing toast pattern.
5. S copy: ProOnboarding Step 2 headlined "Set up your training" but captures body data
   (sex/age/height/weight) — rename "About you"; age+height lack "why we ask" hints
   (sex/weight have them).
6. S: "volume" jargon x3 in onboarding + surplus/deficit/compound/isolation unglossed —
   glossary entries EXIST and are wired elsewhere (Q-NE1 from Ultimate Audit). Assembly.
7. S: Progress tab day-0 empty state = the ONLY one with no CTA (EmptyState primitive
   supports actionLabel already).
8. S: Copy-yesterday dead-end on day-0 diary (matches nutrition track) — swap for
   "Try a suggested meal" → Suggested tab (has pre-history content).
9. S: OAuth spinner uncaptioned; cancelled OAuth = zero feedback.
10. S-M: PlanLibrary not default-sorted beginner-first outside quiz path.
11. S-M: Progress tab uses SAME dimmed style for Pro-lock vs not-enough-data-yet locks
    (Recaps countdown pattern is the right one — extend).
12. S cleanup: dead intent/fromQuiz route params.
13. S: search/barcode failures degrade silently (offline reads as "no matches").
14. INFO: WorkoutSummary background sync empty-catches (architecture protects data).
GATED: exercise demo media (NE-3/EL-1) — founder decision, L, assets/licensing.
