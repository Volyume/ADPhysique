# Meal-plan RETHINK — research + blueprint (2026-06-12)

**Why this exists.** Founder device-walked the shipped "Plan my day" / meal-plan
flagship and hit three credibility-breaking faults, all confirmed in code. This
document is the cited research and the resulting engine blueprint to fix them
properly rather than patch them. It supersedes the relevant parts of
`bp-meal-plan-generator.md` where they conflict; the engine modules
(`src/lib/food/*`) are otherwise sound and reused.

> Status: RESEARCH + BLUEPRINT. No code changed by this document. Build is a
> separate, reviewed effort (added to the NEXT list).

---

## 1. The three confirmed faults (verified in code today)

1. **Slot blindness.** `slotMatches()` (`src/lib/food/mealSuggest.js:61`) returns
   `true` for any `meal_\d+` slot, so the numbered-meal model (the default) never
   filters on a meal's `breakfast`/`lunch`/`dinner` tag. The curated library IS
   tagged (`curatedMeals.js`) but the tags are bypassed. Result: turkey
   bolognese, chicken + jacket potato + salad, or chickpea-lentil curry served as
   "Meal 1 (breakfast)". This is the single worst credibility hit.
2. **Swap tunnel-vision.** `swapMealInPlan()` (`src/lib/food/mealSwap.js:151`)
   ranks candidates purely by macro-distance to the outgoing plate
   (`distance()`, line 168). The nearest macro clone always wins, so lentil curry
   → lentil dahl, chicken-jacket-potato → chicken-sweet-potato. There is no
   "different style", no "I don't eat this for breakfast", no sweet/savoury axis.
3. **Invented training schedule.** `defaultSchedule()`
   (`src/lib/food/mealPlanService.js:83`) spreads N training days evenly across an
   abstract Day 1-7, and `MealPlanScreen` exposes a day-type CHIP but no control
   to set it — the day's training/rest variant (and its calorie/carb split) is
   enforced by the generated spread. Our own app does NOT fix training to
   weekdays (sessions are sequential/whenever-suits), so the plan asserts a
   schedule the rest of the product never claimed.

A fourth, raised by the founder and confirmed by the research below:

4. **Protein-source quality not ranked.** The library leans on soya/pea protein
   and lentil/chickpea "protein" meals as if interchangeable with whey, dairy,
   eggs, meat and fish. For omnivores that is both a palatability miss and a
   protein-quality miss (see §2.4). Plant staples belong in vegan/veg plans,
   dose-adjusted — not as default omnivore anchors.

---

## 2. Research findings (cited)

### 2.1 How evidence-based physique coaches structure a day
- **Meals/day:** 3-5 protein feedings, evenly spaced ~every 3 hours, is the
  consensus structure; total daily protein is the dominant variable and timing
  sits below it in the hierarchy. [ISSN Nutrient Timing position stand, 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/)
- **Protein per meal:** ~0.4-0.55 g/kg/meal, ~25-40 g quality protein, enough to
  clear the ~2.5-3 g leucine threshold that maximally triggers MPS; bigger doses
  add little hypertrophic benefit. [ISSN 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/); [Frontiers in Nutrition 2024, protein distribution & body composition](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11099237/)
- **Nutrient timing / the "anabolic window":** muscle stays primed ~24 h
  post-training; there is no 30-minute deadline. Pre/post-workout carb+protein
  placement helps glycogen and training quality but is a refinement, not the
  spine. **Implication: anchor carbs around training where convenient, but do
  not let timing override total daily targets or force an alien meal order.** [Aragon & Schoenfeld, "Nutrient timing revisited"](https://academicworks.cuny.edu/le_pubs/152/); [ISSN 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/)
- **Real food diaries:** off-season bodybuilders eat 4-6 meals, repetitive
  prep-cooked staples (3 proteins × 3 carbs × 3 fats, batch-cooked and
  mixed/matched), breakfast oats/eggs-led, savoury rice/chicken lunches and
  dinners. [Healthline bodybuilding meal plan](https://www.healthline.com/nutrition/bodybuilding-meal-plan); [How to eat like a bodybuilder, MyProMeals](https://www.mypromeals.com/blog/article/how-to-eat-like-a-bodybuilder-not-spend-hours-in-the-kitchen)

### 2.2 What normal British people actually eat (so plans feel normal)
- **Breakfast:** cereal, toast, porridge on weekdays; cooked "fry-up" reserved
  for weekends. Largely sweet or light-savoury, rarely a full dinner-style
  plate. [NDNS 2019-2023 report, GOV.UK](https://www.gov.uk/government/statistics/national-diet-and-nutrition-survey-2019-to-2023/national-diet-and-nutrition-survey-2019-to-2023-report); [Breakfast Consumption in the UK, IBRI](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6115898/)
- **Lunch:** sandwiches / meal-deal style, lighter; midday. [British meals, projectbritain](https://projectbritain.com/food/meals.html)
- **Dinner:** the cooked meal — roasts, cottage/shepherd's pie, chilli, spag bol,
  curry, fish and chips. ~23% of energy now comes from out-of-home eating. [NDNS 2019-2023](https://www.gov.uk/government/statistics/national-diet-and-nutrition-survey-2019-to-2023/national-diet-and-nutrition-survey-2019-to-2023-report)
- **Macro-friendly British dinners exist and are mainstream:** cottage pie
  (~50 g protein/serving with lean beef), slow-cooker chilli con carne, chicken
  karahi/"fakeaway" curries — all batch-cook friendly. [Food For Fitness, UK high-protein recipes](https://www.foodforfitness.co.uk/high-protein-recipes/); [Sainsbury's 30 high-protein recipes](https://www.sainsburys.co.uk/gol-ui/recipes/scrapbooks/30-high-protein-recipes)

**Design read:** breakfast must be breakfast-shaped (sweet or light savoury);
dinners can be familiar British comfort meals made macro-friendly. A curry or
bolognese at dinner is normal; the same plate at 7am is the bug.

### 2.3 Product benchmarks
- **RP Diet Coach** asks wake time, **training time**, and meals/day; generates
  **meal-by-meal** plans with **named meal types incl. training-day, rest-day,
  pre-workout, post-workout**; weigh-ins drive calorie auto-adjust. Known
  weakness: one food per category per meal, limited "coherent meal" feel. The
  key transferable idea is **a per-day training-time input, not a fixed weekly
  schedule.** [RP Diet App review, Sisyphus Strength](https://sisyphusstrength.com/blog/2021/6/28/rp-diet-app-a-full-review); [Athletic Insight RP guide](https://www.athleticinsight.com/diet/renaissance-periodization)
- **Eat This Much** does named breakfast/lunch/dinner slots, easy per-meal swap,
  and "Recurring Foods" / preferred-food locking so plans stay familiar. [Eat This Much review, Ultimate Meal Plans](https://ultimatemealplans.com/eat-this-much-review/)
- **MacroFactor** deliberately ships **no meal plans** — pure flexible tracking,
  on the philosophy that prescribed meals fight adherence and the only thing that
  must be solved is energy expenditure. Built by Stronger By Science (Nuckols,
  Trexler). **Implication: our plan must be a flexible scaffold the user can bend,
  never a rigid prescription, or we inherit the failure MacroFactor avoids.** [MacroFactor algorithms & philosophy, Stronger By Science](https://www.strongerbyscience.com/macrofactor-algorithms-philosophy/)
- IF / breakfast-skip and sweet/savoury preferences are common, expected
  meal-app settings. [Best meal planning apps 2026, comparison](https://weeklymealsplanner.app/guides/best-meal-planning-apps)

### 2.4 Protein quality — the founder's soy/pea concern, answered
- **Per gram, animal proteins are superior:** whey/casein DIAAS >1.0; milk, egg,
  beef, chicken ≥0.90; leucine ~8-11% of protein (whey ~10.9%, egg ~8.8%). Soy
  isolate ~0.90 DIAAS / ~8% leucine is the best single plant source; pea, rice,
  wheat fall below, lower in leucine/lysine/methionine. [Best complete protein foods by DIAAS](https://drinkdigits.com/blog/best-complete-protein-foods-ranked/); [Plant-based protein isolate amino-acid composition](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6245118/)
- **BUT, leucine/dose-matched, outcomes converge:** RCTs and meta-analyses find
  no significant hypertrophy/strength difference between plant and animal protein
  **when leucine and total dose are matched** — which in practice means **~20-30%
  more plant protein per meal** to clear the same threshold. [Soy vs whey leucine-matched RCT, 12 wk](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7312446/); [Plant vs animal MPS systematic review/meta-analysis](https://sportrxiv.org/index.php/server/preprint/view/526); [Plant vs animal RCT meta-analysis, Nutrition Reviews 2025](https://academic.oup.com/nutritionreviews/article/83/7/e1581/7954494)

**Design read (founder is right, with a nuance):**
- **Omnivore plans should anchor protein on whey, dairy (Greek yogurt, skyr,
  cottage cheese, milk), eggs, lean meat and fish** — higher quality per gram,
  more familiar, more palatable, no dose inflation.
- **Lentils/chickpeas/beans are CARB-forward foods with side protein, not
  protein anchors** for omnivores. They belong as the carb/fibre component, or in
  vegetarian/vegan plans.
- **Soy/pea isolates are legitimate but VEGAN-plan tools**, and the engine must
  apply the ~20-30% per-meal protein uplift for plant sources to hit the same
  leucine threshold. Never surface them as default omnivore staples.

### 2.5 Adherence science (governs everything above)
- **Flexible > rigid for adherence.** Rigid "specific-foods" dieting drives an
  all-or-nothing mindset, disinhibition and dropout; flexible structures match on
  weight loss but win on satisfaction and sustainability. [Flexible vs rigid dieting RCT, JISSN 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8243453/)
- **Repetition tolerance is slot-specific.** ~68% of people repeat a breakfast
  within a week and are happy to; only ~9% repeat a dinner — hedonic variety
  goals rise across the day. [Why do people eat the same breakfast every day? (Appetite, 2021)](https://pubmed.ncbi.nlm.nih.gov/34597744/)

**Design read:** repeat breakfasts cheaply, vary dinners. A plan that re-rolls a
new breakfast every day is fighting the grain; one that re-rolls dinners is
expected.

---

## 3. Blueprint — what to build

### 3.1 Position-derived slot character (FOUNDER AMENDMENT 2026-06-12)
**Founder directive supersedes the earlier named-slot idea:** keep the
bodybuilder numbered-meal model — "Meal 1..N" labels, 3/4/5/6 meals a day, and
the pre/post-workout slot positioning — and do NOT label slots
breakfast/lunch/dinner. Instead each numbered position carries an internal FOOD
CHARACTER the matcher enforces:
- **Meal 1 places a breakfast meal** (breakfast-tagged candidates only; safe
  relaxation if a diet/exclusion combo empties the pool, never an empty slot).
- **The final meal is a cooked main** (lunch/dinner-tagged).
- **Middle meals** draw mains + snack-shaped meals (macro share + variety
  decide; small shares naturally pull snack-sized meals on 5-6 meal days).
  Breakfast-ONLY meals (pancakes, omelette + toast) do not appear mid-day;
  dual-tagged bowls/smoothies still can via their snack tag.
- Pre/post-workout slots keep their existing kind-based behaviour and
  positions.
- **Per-slot repetition policy:** Meal 1 may repeat across the week (and
  defaults to a small rotation); the final main maximises variety. Encodes §2.5
  without renaming anything.
- The diary's own flexible numbered logging is untouched.

### 3.2 Daily training-day input (replaces the invented weekly spread)
- "Plan my day" asks **"Training today?"** (and optionally a rough training
  time) as a per-day input, defaulting from recent logging but **always
  user-overridable on the day**. The day's TD/NTD calorie/carb variant follows
  that answer, not a generated Mon-Sun spread.
- Carbs nudge toward the training-time meals when a time is given (a refinement,
  not a hard timing rule, per §2.1). No fixed weekly schedule is ever asserted.

### 3.3 Swap interaction model (replaces nearest-macro-clone)
- Swap offers **a short list of genuinely different alternatives within the same
  slot**, deliberately spreading across style/cuisine/protein-source, each
  macro-fitted by re-gramming (the existing macro-preserving food swap stays for
  fine adjustment). Distance stops being the sole ranker; **style diversity is a
  selection objective.**
- **"Not for breakfast" / dislike → persistent exclusion** (the existing
  `mealPlanExcludeFoods` plus a new per-slot meal/style exclusion).
- **Sweet vs savoury breakfast preference** as an explicit setting; skip-breakfast
  / eating-window (IF) support so the breakfast slot can be dropped and its
  macros redistributed.

### 3.4 Protein-quality ranking (§2.4)
- Tag every curated food with a **protein-quality class** (high =
  whey/dairy/egg/meat/fish; moderate = soy/quorn/tofu/tempeh; carb-protein =
  legumes/grains).
- **Omnivore plans anchor each meal's protein on a high-quality source**;
  legumes are carb/fibre components, never the meal's protein anchor.
- **Plant-anchored meals (veg/vegan) apply a ~20-30% per-meal protein uplift** to
  clear the leucine threshold, and the curated plant meals are re-checked to hit
  the real per-meal protein target after that uplift.
- Retire soy/pea **isolate** meals from omnivore rotation; keep them vegan-only.

### 3.5 Curated library expansion
- Build a **per-slot British-palate library** (~30-50 meals/slot across diets):
  - *Breakfast:* porridge variants, Greek-yogurt/skyr bowls, eggs on toast,
    omelettes, protein overnight oats, smoothies, breakfast-shaped only.
  - *Lunch:* chicken/tuna/egg sandwiches & wraps, jacket potato + tuna/beans/
    cheese, pasta salads, leftover-dinner portions.
  - *Dinner:* cottage/shepherd's pie, chilli con carne, spag bol, chicken
    curry/karahi, fajitas, stir-fries, roast dinner, fish & chips (baked),
    burgers — lean-protein versions, batch-cook friendly.
  - *Snacks:* yogurt, fruit + protein, rice cakes + tuna, protein shakes, nuts
    (fat-budgeted).
- Each meal: foods + grams only; macros computed from the food table (existing
  pattern); slot tag(s); protein-quality class; sweet/savoury flag for breakfast.

---

### 3.6 Founder directives (2026-06-12, during this research)
These are explicit requirements, not options:
- **Many swap options, not 2 near-clones.** Each slot must offer a GENEROUS list
  of genuinely different alternatives (target: a deep per-slot pool, surfaced as a
  scrollable list, not a single "next" suggestion). Variety/style spread is a
  hard requirement of the swap UI, not a nice-to-have.
- **Common, easy, staple foods only.** Every meal must be something a normal
  person can easily buy and make — staples of health and bodybuilding eating, not
  novelty or hard-to-source dishes. Familiarity and ease beat cleverness.
- **Real meals, not random food piles.** Components must form a coherent plate
  someone would actually choose for that slot.

## 4. Founder decisions — ANSWERED 2026-06-12 (locked)
1. **Plan model: FULLY GENERATED, EASILY SWAPPED.** Generate a complete day
   every time, but every slot carries a deep, style-diverse swap pool (the
   "many options, not 2 clones" requirement is load-bearing here — a fully
   generated plan is only acceptable if the swaps are genuinely generous and
   varied).
2. **Dinner style: MIX OF BOTH.** Familiar British comfort dinners
   (cottage pie, chilli, spag bol, curry/fakeaway, fajitas, stir-fry, baked
   fish & chips) AND simple staple plates, balance influenced by the
   variety setting.
3. **Protein sources: ANIMAL-ANCHORED OMNIVORE.** Omnivore meals anchor on
   whey/dairy/eggs/lean meat/fish; legumes are carbs-with-side-protein, never
   omnivore anchors; soy/pea isolates are vegan/veg-plan tools with the
   ~20-30% per-meal leucine uplift applied. (§3.4 stands as written.)

---

## 5. Sources
All inline above. Primary anchors: ISSN Nutrient Timing 2017; Aragon &
Schoenfeld nutrient-timing review; NDNS 2019-2023; flexible-vs-rigid RCT (JISSN
2021); breakfast-variety study (Appetite 2021); MacroFactor philosophy (Stronger
By Science); RP Diet structure; plant-vs-animal protein RCTs/meta-analyses; DIAAS
rankings.
