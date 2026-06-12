# Core requirements — Meal-plan personalisation & variety (founder, 2026-06-12)

Feeds `bp-meal-plan-generator.md`. The founder's bar: "an absolutely elite feature
with variability day to day and customisation based on the individual." These are
core, not optional.

## R1 — Food dislikes / exclusions with automatic alternatives
- A persistent per-user **food preference profile**: "never show me [food]"
  (dislikes), plus allergens/intolerances (hard excludes). One-tap "flag this food"
  from any plan item or food row.
- The generator and every swap **respect exclusions** and offer a sensible
  **alternative of equivalent macro role** (the macro-preserving swap, rescaled).
  e.g. dislike white rice → offered potato / pasta / couscous at the grams that
  hold the meal's carbs.
- Excludes are remembered across plans/days (part of the individual's profile).

## R2 — Meal-level swap (not just food-level)
- "Don't fancy this meal" → swap the **whole meal** for another that fits the same
  slot, the same macro share, and the diet/exclusion profile (reusing the
  curated-meal library + the fit ranking). One tap, plan stays on-target.

## R3 — Day-to-day variability / anti-repetition
- A generated week should **rotate** meals, not repeat the same day 7x — controllable
  variety (some users want repeatable meal-prep, some want variety; expose a
  "variety vs repeat" preference). Anti-repetition is a scoring term in the
  assembler (penalise a meal used recently), deterministic and seedable so it's
  reproducible/testable.

## R4 — Individual customisation
- Meals/day count, preferred cuisines, prep effort (quick vs cook), budget tier,
  pinned favourites ("always keep my oats breakfast"), and the diet axis
  (omnivore/veg/vegan) already present. All feed the generator as filters/weights.
- Customisation is **progressive** (dual-market): Besa accepts smart defaults and
  just swaps when she wants; Eddie can tune every lever. Same generator.

## How it fits what already exists
- `curatedMeals.js` (diet-filtered, slot-tagged, macros computed) + `mealSuggest.js`
  (protein-first macro-fit ranking, portion scaling) already provide the swap/fit
  machinery. R1–R4 are: a preference-profile model, an exclusion filter + alternative
  picker, a meal-swap entry point, and an anti-repetition term — all deterministic,
  pure, unit-testable. No AI.

## Constraints (unchanged)
- Deterministic, offline-first, Pro-gated, British English.
- Every generated/edited plan routes through the ED-safety calorie/FFM floors;
  exclusions can never push the plan below a floor (clamp + tell the user).
- Ties to the coach integration (`_REQ-coach-mealplan-integration.md`): when the
  coach edits the plan, it respects the same exclusion/variety profile.
</content>
