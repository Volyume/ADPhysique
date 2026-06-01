# Onboarding Audit 06 — Redesign Proposal

Status: COMPLETE (Phase 6 of 7)
Date: 2026-06-01
Method: a complete proposal for both flows, grounded in docs 01-05. Proposed
copy is written to final standard (British English, no em dashes, no AI tells,
plain voice). Nothing here is built yet. Await confirmation.

---

## Guiding principles

1. Collect only what shapes the plan or the targets, and justify each field
   (keep Volyume's strength).
2. Tell the truth about how coaching works: weigh in and check in, the coach
   reads your weight, food logging in Eat sharpens it but is optional.
3. Introduce the Eat logger as the food path. Never point at another app.
4. One coached builder, reachable from both onboarding and the Plans tab,
   visually identical, pre-populated for returning users.
5. One Pro story, one trial length, one price source, no defunct tiers.

---

## ONBOARDING FLOW PROPOSAL

### Information architecture (first-time Pro)

Target sequence, 5 input steps plus consent and reveal:

1. Welcome / tier (unchanged structure, copy tightened).
2. Account (single account UI, used by both Login and the wizard, see below).
3. Health consent (unchanged, it is legally required, but smooth the
   interruption so it reads as step 2.5, not a detour).
4. About you (body profile).
5. Your training (goal, phase, experience, days, session, equipment, weak
   points).
6. Recovery and habits (recovery, reminders, steps, plus the new one-line "how
   coaching works").
7. Reveal.

Key structural changes:
- **Remove the duplicate account step.** The wizard's step 1 duplicates Login
  (ProOnboarding:602-727 vs LoginScreen). Use one shared account component so a
  Pro user authenticates once.
- **Add days-per-week to the training step** (currently hardcoded to 4). Default
  to 4, let the user pick 3 to 6, matching `ProGoalSetup`.
- **Add protein approach to the training step** (currently defaulted). Default
  to optimised with the "Suggested" badge, collapsible so it does not bloat the
  step.
- **Defer food mechanics out of onboarding.** No pre-emptive nutrition
  explainer that points elsewhere. Introduce Eat in context.

### Screen-by-screen

**Welcome (tier).** Keep the two-card structure and the disqualifier. Tighten
the Pro subtitle. Proposed:
- Pro card subtitle: "The coach who writes back." (keep)
- Pro bullets (replace the food-ambiguous one): keep the schedule, coaching,
  and targets bullets; add "Log food in Eat when you want sharper calls. You
  never have to."
- CTA: "Go Pro" (keep). Free CTA and copy unchanged.

**Account.** One shared component. Headline "Create your account." Sub: "Pro
backs up your plan, weight history, and coaching across devices." OAuth first,
email second. No second account step later.

**Health consent.** Keep the locked copy. Add a one-line lead so it does not
feel like an ambush after sign-up: "One legal step before we start. Volyume
uses your health data to coach you."

**About you.** Keep the fields and the why-hints (they are good). Order: name,
sex, age, height, weight. Hint on weight stays: "Used with your height and age
to set your calorie targets. Update it daily on Home."

**Your training.** Keep the primary "What are you focused on right now?" phase
question and the optional "Competing in a category?" division question. Add:
- Days per week: "How many days can you train?" 3 / 4 / 5 / 6, default 4. Hint:
  "Your plan is built to fit this many sessions."
- Protein (collapsible "Advanced"): standard / optimised / advanced, default
  optimised. Hint: "Optimised suits most people. Open this only if you want to
  change it."
- Weak points: use the same division-scoped set as today, and use it in the
  builder too (resolve the scope mismatch toward division-scoped, doc 02 M1).

**Recovery and habits.** Keep recovery, reminders, steps. Add one card "How
coaching works" with final copy:
> "Each morning, weigh in. Once a week, check in. Your coach reads the trend and
> adjusts your calories and training for you. Logging food in Eat is optional,
> it makes the calls sharper, but your weight does the heavy lifting."

### Feature introductions (exact copy)

- **Steps** (keep, it is accurate): "Your phone counts your steps. Nothing to
  set up. If you wear a watch, that takes over."
- **Eat / food** (new, replaces the MyFitnessPal instruction): "Eat is your food
  diary. Scan a barcode, snap a label, or pick a saved meal. It shows your
  coach's targets and tracks the day against them. Optional, but it sharpens
  your coaching."
- **Division** (keep, accurate): "Pick your category and your plan biases volume
  toward the muscles it is judged on."
- **Nutrition targets** (keep): "Your targets come from your weight, height, age
  and goal, and move with your weight trend."

### Pro and trial proposal

- One value story everywhere: Pro is the coach (training plus nutrition
  adjustments). Eat is part of it, not the headline.
- During beta: "Free beta. No subscription required." (keep, it is true).
- For the eventual paid state, one trial length wired to `cascade.js` (currently
  21 days), one price from `catalogue.js`, and delete the `Complete` comparison.
  Proposed paywall headline: "Pro is the coach. Free is the logbook." Proposed
  trial CTA, pulling the real number: "Try Pro free for {N} days." Proposed
  price line from catalogue: "{priceText} after that. Cancel anytime."

### First workout screen arrival

- Add a single first-run cue on Home for new Pro users: "Your plan is ready.
  Start your first session." pointing at the Continue card. One line, dismissed
  on first tap. No tour.

---

## PLAN BUILDER FLOW PROPOSAL

### Adapted architecture

- **One coached builder.** Promote `ProGoalSetup` to the canonical coached
  builder, reachable from the Plans tab for every Pro user (not only Pro with an
  active plan), and from a "Build with the coach" entry for Free users that
  upsells Pro at the point of intent.
- **Make it look like onboarding.** Adopt the wizard's selection components (or
  vice versa) so experience, equipment, days, etc, are visually identical across
  both flows (resolves doc 03 D1/D2).
- **Keep it lighter than onboarding.** No app introduction, no "how coaching
  works" card, pre-populated everything. This is correct already.

### Pre-population strategy

- Pre-fill goal, phase, experience, days, session, equipment, recovery, protein,
  weak points from `userProfile` (already done, ProGoalSetup:70-87).
- Show the previous answer as the selected state and let the user change any of
  it (already done).
- Surface body weight read-only at the top ("Targets use your latest weight,
  {x}. Log a new one on Home."), since the nutrition recalc depends on it but
  the field is invisible today (doc 04 section 5).
- Fix the latent bug: persist `planWeakPoints` into the saved profile so a later
  regenerate does not lose them (doc 04, F9).

### Screen-by-screen (builder)

- Entry from Plans: "Update plan and rebuild" (keep copy, it is good,
  PlansScreen:59).
- The builder screen: keep the section order, adopt onboarding's visual
  language, add the read-only weight line, keep "Rebuild my plan" CTA.
- Manual Builder: remove the cosmetic goal pills (they drive nothing,
  ManualBuilder:20-26), or make them real. Add a one-line "This is a hand-built
  plan, your coach still reads your data" so it is clear it is not the coached
  path.
- Plan Library: fix "Answer 3 questions" to match the 2-step quiz (or add the
  third step), and align the division keys/labels with `coachingGoals`.

### Parity confirmation (proposed)

| Option | Proposed onboarding | Proposed builder | Parity |
|---|---|---|---|
| Goal / division | Yes | Yes | Match |
| Phase | Yes | Yes | Match |
| Experience | Yes | Yes | Match |
| Days per week | Yes (new) | Yes | Match |
| Session length | Yes | Yes | Match |
| Equipment | Yes | Yes | Match |
| Recovery | Yes | Yes | Match |
| Weak points | Division-scoped | Division-scoped (aligned) | Match |
| Protein approach | Yes (new, collapsible) | Yes | Match |
| Body metrics | Yes (collected) | Read-only summary + link | Match (adapted) |
| Reminders / steps | Yes | In Settings (lifecycle) | Adapted, acceptable |

Zero coached-option gaps in the proposed state. The only deliberate asymmetry
is reminders/steps, which belong to lifecycle settings for a returning user, not
the plan build.
