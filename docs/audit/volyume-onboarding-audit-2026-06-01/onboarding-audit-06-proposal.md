Status: COMPLETE | Timestamp: 2026-06-01 | Phase 6: Redesign proposal

# Redesign proposal, both flows

Built on the corrected reality (Phase 1) and the two founder decisions for this
audit: full audit on the corrected basis, and always-on division bias for weak
points. Nothing here is built yet. This is the spec to approve before code.

## Design principle for this work

One shared option layer, two flows. Every selectable training variable should
have a single definition in `coachingGoals.js` and a single selection component,
used by both onboarding and the builder. The flows differ only in framing copy
and in which questions appear, never in the option set or the control. That is
what makes a returning user feel they are in the same product, and it is what
guarantees parity by construction rather than by manual matching.

## 1. Shared division-specific weak-point system

### Option sets per division

A weak point should only offer muscles that division is judged on or commonly
wants to bring up. Derived from `GOAL_OVERLAYS` (`coachingGoals.js:339-473`)
and each goal's `coachingNote`. Internal keys reuse `WEAK_POINT_MAP`
(`planEngine.js:31-48`). Proposed sets (UI label list per division):

- general (not competing): the full balanced list. Chest, Upper Chest,
  Lats / Back Width, Back Thickness, Side Delts, Rear Delts, Biceps, Triceps,
  Quads, Hamstrings, Glutes, Calves, Core / Abs. (The full set, since no
  division bias applies.)
- mens_physique: Side Delts, Rear Delts, Front Delts, Lats / Back Width, Back
  Thickness, Upper Chest, Chest, Biceps, Triceps. (Upper-body and V-taper. Legs
  are de-emphasised in this division, so they are not offered as bring-up
  targets.)
- classic_physique: Side Delts, Lats / Back Width, Back Thickness, Upper Chest,
  Chest, Quads, Hamstrings, Calves, Biceps, Triceps, Rear Delts. (All groups
  judged, calves specifically.)
- bodybuilding: the full list. (Everything is judged.)
- bikini: Glutes, Hamstrings, Adductors, Side Delts, Lats / Back Width, Rear
  Delts. (Glute and hamstring led, capped shoulder line.)
- wellness: Glutes, Quads, Hamstrings, Adductors, Calves, Side Delts. (Fuller
  lower body than bikini.)
- figure: Side Delts, Rear Delts, Lats / Back Width, Back Thickness, Glutes,
  Hamstrings. (Capped shoulders, wide back, glutes.)
- womens_physique: Side Delts, Lats / Back Width, Back Thickness, Quads,
  Glutes, Hamstrings, Upper Chest, Biceps, Triceps, Calves.
- womens_bodybuilding: the full list.

Implementation: add `WEAK_POINT_SETS` keyed by goal value in
`coachingGoals.js`, falling back to the full list for `general`. Keep
`WEAK_POINT_MUSCLES` as the canonical superset so `WEAK_POINT_MAP` stays the
single label-to-key resolver.

### Always-on bias (engine)

Change `applyGoalOverlay` (`planEngine.js:165-196`) so a selected weak point
biases the plan on every phase, not only `weak_point`:

- weak_point phase: unchanged. Each weak-point muscle closes ~40% of the gap to
  its MRV (`:178`), offset by trimming the lowest-priority muscles toward MV.
- any other phase: each weak-point muscle closes a smaller fraction of the gap
  to MRV (propose ~15%, tuned so an average intermediate gains roughly 1 to 3
  sets on a brought-up muscle, not a block's worth). Same trim-to-offset logic,
  same order.
- Both paths keep the existing guardrails untouched: the per-muscle clamp at
  110% of MRV (`:199-202`) and the recovery-scaled systemic cap at 40% of total
  MRV (`:211-218`). This is the science guarantee the founder asked for: the
  always-on bias redistributes volume within the individual's recovery
  envelope, it never raises the ceiling, so it cannot create overtraining. A
  poor-recovery or beginner user is held lower automatically because their MRVs
  and the systemic cap are already lower.

This makes the selector's promise true on every phase, which is the
precondition for showing it on every phase.

### Shared selector component

A new `WeakPointSelector` component (props: `goal`, `value`, `onChange`,
`variant: 'onboarding' | 'builder'`). Renders the division's set as chips
grouped by region (upper / lower / core) with a small group label, the max-3
rule with the existing toast (`ProGoalSetupScreen.js:96-98`), the existing
amber selected treatment, and a "Not sure" affordance that deselects all and is
a valid end state. On a division change, drop any selected muscle not in the
new division's set. Both flows mount this same component.

## 2. Onboarding flow proposal (first-time)

Keep the four-step shape; close the three gaps and standardise the controls.

- Step 1, account. Unchanged.
- Step 2, profile. Unchanged (name, sex, age, height, weight).
- Step 3, training. Convert the dropdowns to the builder's card/chip language
  (Phase 3). Order: experience, training days per week (new, chip row 3 to 6,
  default 4), session length, equipment, "What are you focused on right now?"
  (phase), recovery (moved here from step 4 where it belongs with training).
  When a division is chosen, show that division's one-line judging note.
- Step 3b, division and weak points. Promote division from a buried optional
  dropdown to a clear card choice ("Competing in a category?"), defaulting to
  "Not competing". Immediately below, the shared `WeakPointSelector` scoped to
  the chosen division, intro copy written for a first-timer: one line on what a
  weak point is and that picking one (or none) is fine. "Not sure" is
  prominent.
- Step 4, reminders. Morning weight, weekly check-in, steps. Add one short
  feature note that logged food and weight feed the weekly check-in, so the
  user knows why logging matters. No tutorial.
- Reveal (`ProSetupCompleteScreen`). No change needed: the "Why this plan, for
  you" list already has a `weakPoints` slot (`:20,239-249`) that will now be
  populated because onboarding passes real weak points. Remove the hard-coded
  `planWeakPoints: []` at `ProOnboardingScreen.js:519` and pass the collected
  value, plus the new `daysPerWeek` and `proteinApproach`.

Protein approach: add it to step 3 or step 4 as the builder has it
(`ProGoalSetupScreen.js:521-560`), defaulting to the suggested approach for the
chosen division (`ADVANCED_PROTEIN_GOALS`). Closes the third parity gap.

## 3. Plan builder flow proposal (returning user)

The builder already has days, protein and a weak-point selector, strong
pre-population, and returning-user copy. The changes are smaller:

- Swap the flat 16-muscle grid for the shared `WeakPointSelector` scoped to the
  selected division, so the option set matches onboarding and is
  division-specific.
- Show the selected division's judging note inline when a division card is
  chosen (the `coachingNote` is already in the data, just unused here).
- Rewrite the weak-point copy for the always-on model: one line that holds true
  on every phase ("Your plan puts extra work into these. More so on a bring-up
  block."). No cheerleading.
- Reflect weak-point changes on `GoalChangeSummaryScreen` so a returning user
  sees that part of their edit landed (confirm the summary takes a weak-point
  before/after; if not, add it).
- Keep pre-population as-is. On division change, the shared component re-scopes
  and prunes the selection (point 1).

## 4. Returning-user adaptation, explicit

- No app-intro copy is repeated; the builder header stays "Update your plan."
- Every field stays pre-populated from the profile.
- Context-specific explanations remain: the division judging note shows on
  change, and the weak-point copy explains the effect on the new plan.
- The builder stays a single screen; onboarding stays stepped. Same options,
  different pacing, which is the correct returning-user adaptation.

## 5. Final parity table (proposed end state)

| Variable | Onboarding (proposed) | Builder (proposed) | Match |
|---|---|---|---|
| Physique division | Card choice + judging note | Card choice + judging note | Yes |
| Weak-point selection | Shared selector, division-specific | Shared selector, division-specific | Yes |
| Training phase | Cards | Cards | Yes |
| Training days per week | Chip row 3 to 6 (new) | Chip row 3 to 6 | Yes |
| Session length | Chip row | Chip row | Yes |
| Equipment | Cards | Cards | Yes |
| Experience | Cards | Cards | Yes |
| Recovery | Cards (moved to training step) | Cards | Yes |
| Protein approach | Cards (new) | Cards | Yes |
| Physical metrics | Collected | From profile | Expected difference |
| Reminders / steps | Collected | From settings | Expected difference |

Zero option gaps. The only remaining differences are the ones that should
differ between a first-timer and a returning user (physical metrics, reminders),
and the pacing (stepped versus single screen).

## 5b. Experience gating (from Phase 5 research)

The research is clear that specialisation is an intermediate-plus tool, and
that for a beginner "everything is a weak point", so a balanced plan serves
them better than an early bias. Apply this in both flows:

- For beginners, default the weak-point selector to "Not sure" and frame that
  as the right call, not a fallback: one line that says training everything
  hard now beats specialising early, and they can bring a muscle up later. The
  selector is still shown (so the feature is discoverable) but the recommended
  state is no selection.
- For intermediate and above, present the selector normally.
- This pairs cleanly with the always-on bias: a beginner who does pick a muscle
  still only gets the small off-phase bonus, held by the same recovery caps, so
  the downside is bounded either way.

## 6. Science guardrails (carried from the coach-plan audit)

- Volume only ever moves within `computeLandmarks` individualised MRVs
  (`planEngine.js:100-121`). The always-on bias redistributes, it does not
  raise ceilings.
- Per-muscle clamp at 110% MRV and systemic cap at 40% of total MRV stay in
  place for both bias magnitudes.
- Adherence-neutral and ED-safe framing extends to all weak-point copy: state
  what the plan does, never coach the user's feelings, no colour judgement.
