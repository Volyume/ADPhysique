# Onboarding Audit 00 — Executive Summary

Status: COMPLETE. Fresh seven-phase audit, written last. Date: 2026-06-01.
Scope: first launch to the workout screen (Flow A) and the Plans-tab plan builder
(Flow B). Grounded in the live code, every claim cited in the companion docs.
No code changed. Awaiting confirmation before any build work.

Companion docs: 01 flow map, 02 copy and tone, 03 design, 04 integration
accuracy, 05 research, 06 proposal, 07 build recommendations.

---

## Overall verdict
The onboarding is well built and well written. The Pro wizard justifies each
question, the reveal is premium, the voice is human and confident. Three things
hold it back, in proportion:

1. The two flows are not at parity. The richest builder (`ProGoalSetup`) is
   hidden unless the user is Pro with an active plan, Free users get no coached
   builder anywhere, and onboarding itself omits two options the builder has
   (days per week, protein). (Phase 1.)
2. The journey does not look like the app it leads into. No flow screen uses the
   shared `ScreenHeader` that all five tabs use, and the page before Home (the
   reveal listing plan, calories and macros) presents that data in a bespoke
   layout instead of the app's own `MacroRings` and plan-card components. (Phase
   3.)
3. A few references describe the app as it used to be. Most accuracy checks pass
   (steps, division, nutrition are all correct); the failures are the food line
   that points to MyFitnessPal, and the Pro/trial surfaces that carry 3-tier
   residue (wrong trial length, wrong price, a removed "Complete" tier). (Phase
   4.)

## The six accuracy checks, weighted equally
- Steps: accurate (automatic).
- Division-specific training: accurate.
- Nutrition targets: accurate.
- Food logging: the process is not clearly introduced and the one pointer sends
  users to a competitor app. Copy fix.
- Pro and trial: inconsistent and partly defunct. Copy + config fix.
- Pre-population: correct in the builder, one latent bug (weak points dropped).

## What is good (keep)
The per-question "why" hints, the accurate steps/division/nutrition copy, the
"Why this plan, for you" rationale, the founder note, the confident disqualifier,
and a design system that already targets the credible end of the field
(precision instrument, no gamification).

## Order of work (doc 07)
1. Short copy/asset PR: fix the food line, the trial/price, remove the Complete
   column, fix small copy errors.
2. Parity and truth: add days-per-week and protein to onboarding, make the
   coached builder reachable for all Pro users, persist weak points, add the
   "how coaching works" line.
3. Design unification: ScreenHeader frame and shared `Button`/`MacroRings`/plan
   components across the flow so the journey and reveal match the Train tab.
4. Polish.
