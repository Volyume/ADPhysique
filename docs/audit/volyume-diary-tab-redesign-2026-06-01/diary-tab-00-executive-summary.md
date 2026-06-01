Status: COMPLETE | Timestamp: 2026-06-01

# Diary tab redesign: executive summary

## The core direction
The Diary tab's summary is already close to best-in-class. The calorie ring,
the remaining readout, the day-type chip and the adherence-neutral amber are
strong and stay. Everything below the summary is where the tab reads as
unfinished: uncontained meal sections, six identical dashed "Add food" boxes on
an empty day, a lone trailing empty-state sentence, kcal-only meal totals, a
stepper-style water widget, and Pre/Post-workout slots that ignore the workout.

The fix is not a new template. It is the Volyume card-and-amber language,
already used by the summary and the water row, applied consistently to the rest
of the screen, plus two things the research is loud about: keep per-meal macros
visible in place (MyFitnessPal's April 2026 redesign buried them and drew the
category's loudest backlash), and protect the speed of logging (users abandon
once a log passes roughly 30 seconds). And one thing only a training app can do:
tie food to the session.

The whole redesign stays inside the locked rules: adherence-neutral colour (no
green-for-good, no red-for-over), the `#0D0D0D` background, no gradients, amber
as the one accent, and plain copy with no cheerleading. `MacroRings`,
`EntryRow` and `MealSection` are Diary-only, so the visual work risks no other
tabs. One change is bigger than the rest: moving off the fixed Breakfast /
Lunch / Dinner / Snacks frame to a flexible numbered-meal model needs a
`meal_slot` data change and touches the food domain. It is flagged as its own
piece of work.

## The top 5 changes, functional to premium

1. One card language for the body. Each meal becomes a contained
   `surface`+border+`radius.lg` card; food items become clean in-card rows;
   the dashed "Add food" box and the per-item borders go. This single change
   removes most of the "unfinished" read.

2. A designed empty state. Replace the six dashed boxes and the trailing
   sentence with one calm card: the targets stated in context ("2,800 kcal and
   200g protein to hit today") and clear actions (Add food, Copy yesterday).
   (The user-configured day-type label already shows in the summary rings; the
   empty state does not assert a training day.)

3. Per-meal macros, visible in place. Show kcal AND protein on every meal
   header, and turn the three equal macro sub-rings into slim bars with protein
   first and primary, so a training user reads all four numbers at a glance.
   Keep the hero calorie ring.

4. Fix the meal model for a physique athlete. Drop the fixed Breakfast / Lunch
   / Dinner / Snacks frame (a wellness convention) for flexible numbered meals
   ("Meal 1..N", renameable, the user sets how many), with Pre-workout and
   Post-workout as always-available named meals the user places around training
   whenever they train. No training-day detection, no scheduling, no rest-day
   collapse: people train when they want. The athlete eats 4-8 structured
   meals, not three and a snack, which is why the workout meals exist. This is
   the one change that needs a `meal_slot` data change, plan it separately.

5. Protect logging speed. A one-tap quick-log strip of the user's Frequents and
   Saved meals (both already in the app), and copy-yesterday available any day
   rather than vanishing the moment the first item is logged.

## What stays
The calorie ring summary, adherence-neutral colour, swipe-delete, multi-select
and the bulk tools. The redesign elevates the body to the standard the summary
already sets, it does not throw away what works.

## Documents
`diary-tab-01-internal-audit.md`, `-02-competitor-research.md`,
`-03-user-sentiment.md`, `-04-design-assessment.md`, `-05-redesign-proposal.md`,
`-06-build-recommendations.md`. No app code was changed in this pass.
