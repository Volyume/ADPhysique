# Onboarding Audit 02 — Copy and Tone

> HANDOFF UPDATE, end of 2026-06-01 session. Shipped (batches 1-3): C1 food line
> now points to the in-app diary; C2 Complete-tier strip removed; C3/C4 trial and
> price corrected; C5 paywall reframed to "Pro is the coach"; C6 "2 questions";
> P4 "MAV-level volume" jargon replaced. REMAINING copy items: H1 full "how
> coaching works" line in step 4, H3 protein copy, P5 gloss "Precision Coaching".
> See doc 07.

Status: COMPLETE (Phase 2 of 7). Fresh audit from the live code. Date: 2026-06-01.

Assesses every user-facing string in both flows for accuracy, clarity, tone,
length, trust signalling, jargon and cross-surface consistency.

---

## Verdict

The voice is the app's strength: plain, confident, British, human, no AI tells,
no emoji, no motivational filler. The weaknesses are localised, a few inaccurate
references, a couple of jargon leaks, and copy that is not adapted between the
two flows.

## Strengths to keep
- "Why" hints on every wizard field, e.g. biological sex "Used to calculate your
  calorie and nutrition targets accurately." (ProOnboarding:760), recovery "Be
  honest. It adjusts to protect you." (:1077). This is the highest-value pattern
  in the flow.
- Confident positioning: "The coach who writes back." (WelcomeScreen:85), the
  disqualifier "there are faster ones out there" (:65-67).
- Accurate, plain steps copy (:1179, :1190) and the reveal's founder note.

## Issues by severity

### Critical (accuracy, references behaviour that is not current)
- C1 Food logging: `NutritionEducationScreen:103-109` tells the user to "Use an
  app like MyFitnessPal or Cronometer", which is not how the app works (it has
  its own logger). Flag as a critical copy error. One line to fix.
- C2 Pro value proposition told two ways: coaching (WelcomeScreen:22,
  ProUpgrade:222) vs "Pro adds food data / the food layer" (PaywallScreen:107-109).
- C3 Trial length stated three ways: "14 days" (PaywallScreen:92-94), "Day 14 /
  Day 28" (CascadeGateScreen:5-7 docstring), day-21 (cascade.js implementation).
- C4 Price "£2.99/month" (PaywallScreen:91) is not in the catalogue
  (£0.99/£1.99/£3.99, catalogue.js).
- C5 "Answer 3 questions" but the quiz has 2 (PlanLibraryScreen:439 vs :84-104).

### High (clarity / adaptation)
- H1 Goal vs phase distinction is unlabelled. A first-timer cannot tell that
  "Competing in a category?" biases muscle distribution while "What are you
  focused on right now?" drives calories (ProOnboarding:989, :1001).
- H2 Manual Builder goal pills imply plan personalisation they do not deliver
  (ManualBuilderScreen:20-26, :378-379).
- H3 Plan builder copy is only partly adapted: `ProGoalSetup` reads as
  returning-user ("Rebuild my plan", :575), but `ManualBuilder` copy is identical
  first build or fifth ("we will walk you through adding workouts day by day",
  :551).

### Medium (tone / jargon / consistency)
- M1 Jargon leak: "MAV-level volume" in a user-facing phase detail
  (coachingGoals.js:240). Replace with plain language.
- M2 "Precision Coaching" used before it is defined (Welcome, reveal, Plans,
  CascadeGate). Gloss at first use.
- M3 Option copy (experience/equipment/recovery) duplicated verbatim across
  ProOnboarding and ProGoalSetup (two sources of truth that can drift).
- M4 Developer crash banner with a raw stack trace in a user surface
  (LoginScreen:240-242). Beta-only, not shippable voice.

## Plan-builder copy specifically
Adapted well in `ProGoalSetup` and `GoalChangeSummary` (the latter writes a
plain reason for each change, e.g. "You're entering a controlled calorie
deficit. Protein stays high…", GoalChangeSummary:18-19). Not adapted in
`ManualBuilder`.
