Status: COMPLETE | Timestamp: 2026-06-01 | Phase 4: Integration accuracy

# Integration accuracy audit

Do the two flows describe the app as it actually works, and do their selections
reach the engine intact? Two real defects, both in the weak-point path, plus a
handful of accuracy notes.

## Steps and activity tracking

- Onboarding describes steps correctly: automatic, phone-filled, the coach's
  first lever before food (`ProOnboardingScreen.js:1124,1133-1136`). Health
  access is requested on opt-in (`:470-476`,
  `activitySteps.connectHealthStepsAndWeight`). No claim of manual entry as
  primary. Accurate.
- The builder does not mention steps, which is fine: steps are a profile/
  settings concern, not a per-plan input.

## Food logging and Diary

- Onboarding does not introduce the Diary at all. The first mention is the
  setup-complete "Hit your daily targets" card
  (`ProSetupCompleteScreen.js:130-192`) and the nutrition primer link
  (`:180-190`). The brief asks that Diary food logging be introduced and its
  contribution to coaching be explained. Today neither flow explains that
  logged food feeds the weekly check-in and coaching adjustments. Gap, not an
  inaccuracy. Proposed in Phase 6 as a one-line feature note, not a tutorial.

## Division-specific training

- The data is genuinely division-specific. `GOAL_OVERLAYS`
  (`coachingGoals.js:339-473`) sets per-muscle multipliers per division, and
  `applyGoalOverlay` (`planEngine.js:127-152`) places priority muscles inside
  their MAV to MRV band rather than scaling from MEV, so the emphasis reaches
  the plate. `DIVISION_SUBREGION_BIAS` (`planEngine.js`, around `:608`) biases
  exercise sub-region (for example incline chest, vertical pull) per division.
- Both flows let the user pick a division, but neither explains, at selection
  time, what that division does to the plan. The `coachingNote` per goal exists
  and is unused on both the onboarding dropdown and the builder card. Accuracy
  is fine; the explanation is missing.

## Weak-point specialisation, the two real defects

### Defect 1: onboarding cannot pass weak points

`ProOnboardingScreen.js:519` hard-codes `planWeakPoints: []` into the plan
profile. The engine accepts `weakPoints` (`planEngine.js:1400`, resolved at
`:1410`), so the handoff exists; onboarding just never fills it. A user who
selects the "Bring up a weak point" phase in onboarding gets the default
weak-point day (side delts and biceps, `planEngine.js:976`) rather than their
own muscles. This is the brief's confirmed omission, and it is real.

### Defect 2: selected weak points are ignored off the weak-point phase

The builder collects weak points on every goal and phase
(`ProGoalSetupScreen.js:345-372`), and the copy promises a volume bias
(`:351-353`). But the engine only applies the weak-point bonus when
`phase === 'weak_point'` (`planEngine.js:173`). On any other phase the selected
muscles change nothing. The data is saved to the profile
(`ProGoalSetupScreen.js:156`) and passed to the engine
(`planAutoGen.js:97`), then dropped on the floor by the phase gate.

Founder decision for this audit: always-on division bias. A selected weak point
should always bias the plan (a small additive emphasis on any phase), with the
larger effect reserved for the weak-point phase. The integration point is the
single line at `planEngine.js:173`; the change is to apply a smaller additive
bonus when the phase is not `weak_point`, protected by the existing per-muscle
MRV clamp (`:199-202`) and the recovery-scaled systemic cap (`:211-218`) so the
always-on bias cannot push total volume past the user's recovery envelope. Full
spec and the science guardrails are in Phase 6.

### The reinstated selector must be division-specific in both flows

Today the selector list is one flat array for everyone
(`WEAK_POINT_MUSCLES`, `coachingGoals.js:126-132`). The brief requires
division-specific options: Men's Physique shows MP-relevant options, Bikini
shows Bikini-relevant options. The mapping to internal keys already exists
(`WEAK_POINT_MAP`, `planEngine.js:31-48`), so a per-division option set can be
defined in `coachingGoals.js` and consumed by one shared selector component in
both flows. Spec in Phase 6.

## Pre-population in the builder

- The builder pre-populates every field from `userProfile`
  (`ProGoalSetupScreen.js:70-87`) and uses the latest morning-weight EWMA for
  nutrition (`:183-209`). This is correct and should be the model for any new
  field added (days, weak points, protein already pre-fill).
- Interaction with a division change: on changing to a goal that does not
  support weak points the selection is cleared (`:145-147`). Since all goals
  support weak points today this branch is dead, but it becomes meaningful once
  the list is division-specific: changing division should re-scope the selector
  to that division's muscles and drop any previously selected muscle that is
  not in the new division's set. This needs handling in the shared component
  (Phase 6).

## Nutrition targets, Pro, trial

- Nutrition: both flows compute targets through `calculateNutritionTargets`
  (`nutritionEngine.js`). The builder recalculates on save with the latest
  weight; onboarding computes once from the entered weight. Accurate.
- Pro and the 28-day cascade trial: started at Article 9 consent, gated by
  `CascadeGateScreen`. Descriptions are accurate. The builder is Pro-only by
  entry (it is reached from the Pro action cards), which is consistent.

## Summary of integration work

1. Let onboarding collect and pass weak points (remove the hard-coded empty
   array, wire the shared selector).
2. Make the weak-point bonus always-on with a phase-scaled magnitude
   (`planEngine.js:173`), inside the existing clamps.
3. Define division-specific weak-point option sets and a shared selector.
4. Re-scope the selector on division change in both flows.
5. Surface each division's judging note at selection time (copy + wiring).
6. Add a one-line Diary/coaching feature note to onboarding.
