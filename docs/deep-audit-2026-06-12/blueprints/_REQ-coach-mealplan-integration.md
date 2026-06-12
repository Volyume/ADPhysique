# Core requirement — Coach ↔ Meal-Plan integration (founder, 2026-06-12)

This MUST be designed into the meal-plan generator blueprint
(`bp-meal-plan-generator.md`), not added later. It is the feature's
differentiator, not a nice-to-have.

## The requirement (founder, verbatim intent)
"The coach should pull food FROM the meal plan and explain it in the same coach
voice. e.g. 'We need to pull 50g of carbs, so I've removed [X]g of white rice
from your plan. See your meal plan.' — conditional on the user being on a meal
plan."

## What this means
When Precision Coaching makes a nutrition adjustment (the adaptive-TDEE / macro
change the engine already computes — e.g. calories down ~150 kcal this week), and
the user **has an active generated meal plan**, the coach must:

1. **Translate the macro delta into a concrete food change in THAT plan,
   deterministically.** Not a generic "carbs down 50g" — an actual edit:
   reduce/raise specific staple foods and restate the grams. Follow real coaching
   priority: **protect protein; adjust carbs/fats first**; prefer the food + meal
   where the change is least disruptive; keep portions in sane ranges.
2. **Apply it to the plan** so the plan now reflects the new target (logging stays
   accurate against the current plan).
3. **Explain it in the five-part coach voice** (Theme A) at the food level:
   > "Your target dropped 150 kcal this week. I've taken 50g of carbs off your
   > plan — that's 65g less white rice at dinner. Open your meal plan to see it."
4. **Link straight to the meal plan** ("See your meal plan") from the coach output.

If the user is **NOT** on a meal plan, the coach explains the macro change as it
does today (no food-level edit) — the food-level narration is the on-a-plan path.

## Why it matters
- It is the literal embodiment of the "every change has a reason" moat, pushed
  down to the gram of rice — uncopyable, and it makes the coach feel real (Theme A).
- Dual-market: Besa never has to work out what to change (it's done + explained);
  Eddie gets a precise, prep-accurate plan that stays in sync with the engine.

## Constraints (unchanged)
- Deterministic, no AI/LLM (it's the same `mealSuggest`/`curatedMeals` macro-fit
  logic run to REMOVE/ADD macros from existing plan items, reusing the swap maths).
- Routes THROUGH the ED-safety calorie/FFM floors — the food-level edit can never
  take the plan below a floor; if a reduction would, it clamps and the coach says so.
- British English; Pro feature (nutrition gating intact).

## Build note
The plan-edit engine is the inverse of the plan-assembler: given a target delta,
choose plan items + gram changes that realise it within tolerance, protein-protected,
floor-clamped, and emit a structured "what changed at the food level" object the
coach-voice layer renders. Pure + unit-testable. The coach-output screen already
hosts the held-decisions card (Theme A); this adds the food-level line + a deep
link to the meal-plan screen.
</content>
