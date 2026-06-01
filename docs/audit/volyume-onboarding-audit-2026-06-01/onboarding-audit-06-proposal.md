# Onboarding Audit 06 — Redesign Proposal

Status: COMPLETE (Phase 6 of 7). Date: 2026-06-01. Proposed copy is written to
final standard (British, no em dashes, plain voice). No code changed.

---

## Principles
1. Collect only what shapes the plan or the targets, and justify each field.
2. Tell the truth about how the app works, in context, never point to another app.
3. One coached builder, reachable from both onboarding and the Plans tab,
   visually consistent and pre-populated for returning users.
4. One Pro story, one trial length, one price source, no removed tiers.
5. The journey and the reveal should look like the same product as the Train tab.

## ONBOARDING FLOW PROPOSAL

### Information architecture (first-time Pro)
Welcome/tier → Account (single shared component) → Health consent (smoothed) →
About you → Your training → Recovery and habits → Reveal. Changes:
- Remove the duplicate account step (the wizard step 1 duplicates Login).
- Add training days per week to the training step (default 4, range 3 to 6).
- Add protein approach to the training step (collapsible, default optimised).
- Put the app's `ScreenHeader` frame on every flow screen.

### Screen-by-screen (headlines/body/buttons to final standard)
- Welcome: keep two cards + disqualifier. Pro subtitle "The coach who writes
  back." Replace the food-ambiguous bullet with "Log food when you want sharper
  calls. You never have to." CTA "Go Pro".
- Account: "Create your account." Sub: "Pro backs up your plan, weight and
  coaching across devices." OAuth first.
- Health consent: keep locked copy, add a lead line "One legal step before we
  start."
- About you: keep fields and the "why" hints.
- Your training: keep phase + division questions; add Days ("How many days can
  you train?", 3-6, default 4, hint "Your plan is built to fit this many
  sessions.") and Protein (collapsible, default optimised).
- Recovery and habits: keep recovery, reminders, steps. Add one "How coaching
  works" line: "Each morning, weigh in. Once a week, check in. Your coach reads
  the trend and adjusts your calories and training. Logging food sharpens it but
  is optional."

### Feature introductions (exact copy)
- Steps: "Your phone counts your steps. Nothing to set up. A watch takes over if
  you wear one."
- Food: "Log food in the app: scan a barcode, snap a label, or pick a saved
  meal. It shows your targets and tracks the day against them. Optional, but it
  sharpens your coaching." (Replaces the MyFitnessPal line.)
- Division: "Pick your category and your plan biases volume toward the muscles
  it is judged on."
- Nutrition: "Your targets come from your weight, height, age and goal, and move
  with your weight trend."

### Pro and trial proposal
- One value story: Pro is the coach (training + nutrition), not "food data".
- One trial length wired to `cascade.js`, one price from `catalogue.js`, remove
  the `Complete` comparison. Proposed headline "Pro is the coach. Free is the
  logbook." Trial CTA "Try Pro free for {N} days." Price "{priceText} after that.
  Cancel anytime."

### First workout screen arrival
One first-run cue on Home: "Your plan is ready. Start your first session.",
dismissed on first tap. No tour. Reveal calorie/macro/plan presentation uses the
app's `MacroRings` and plan card so it matches Home.

## PLAN BUILDER FLOW PROPOSAL
- Promote `ProGoalSetup` to the canonical coached builder, reachable on the Plans
  tab for every Pro user (and an upsell entry for Free), and adopt the wizard's
  selection components so they look identical.
- Keep it lighter than onboarding: no app intro, pre-populated, plus a read-only
  body-weight line ("Targets use your latest weight, {x}. Log a new one on
  Home.").
- Persist `planWeakPoints` so a later regenerate keeps them.
- Manual Builder: remove the cosmetic goal pills or make them real; add "This is
  a hand-built plan, your coach still reads your data."
- Plan Library: fix "3 questions" and align division keys with `coachingGoals`.

## Parity confirmation (proposed)
| Option | Proposed onboarding | Proposed builder | Parity |
|---|---|---|---|
| Goal/division, phase, experience, session, equipment, recovery | Yes | Yes | Match |
| Days per week | Yes (new) | Yes | Match |
| Protein approach | Yes (new) | Yes | Match |
| Weak points | Division-scoped | Division-scoped (aligned) | Match |
| Body metrics | Collected | Read-only summary + link | Match (adapted) |
| Reminders/steps | Yes | Settings (lifecycle) | Adapted |
Zero coached-option gaps in the proposed state.
