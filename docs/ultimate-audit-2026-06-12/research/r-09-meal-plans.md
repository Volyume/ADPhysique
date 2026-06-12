# r-09 — MEAL PLANS: best-in-class external research

Research agent r-09 of the ULTIMATE-APP MANDATE. Paired to audit a-09 (Volyume's
post-rethink deterministic TD/NTD meal-plan assembler). British English throughout.
Date 2026-06-12. Working internet. No commit.

VERIFICATION PROTOCOL note: every competitive claim below carries a fetched-source
URL; load-bearing claims carry 2+. Failed fetches are logged in section 6.
Tooling proven before any claim — see section 0.

---

## 0. TOOLING PROOF (mandate requirement)

WebFetch of the Eat This Much homepage returned verbatim the headline:

> "Put your diet on _autopilot._"

Source: https://www.eatthismuch.com/ (fetched 2026-06-12). End-to-end fetch +
quote confirmed. Proceeding.

---

## 1. PER-APP TEARDOWN

Lens per app: generation model (auto / template / manual) · day-variability ·
swap UX depth · preference surface (cuisine/time/budget/household/batch) ·
shopping-list · plan→diary logging · IF/meal-frequency · where the plan lives in IA.

### Eat This Much — the automation benchmark
- **Generation: fully AUTO.** "Set calories, macros, and dietary filters, and the
  algorithm builds a full day (free) or week (Premium) of meals" — generation in
  seconds (promealplan review). Homepage: "Put your diet on autopilot."
- **Day-variability: weak over time.** Reviewer flags "recipe repetition by week 3-4,
  even with variety maxed out" (promealplan). This is the canonical warning that auto
  generators run dry — relevant to Volyume's 159-meal library.
- **Swap UX:** "You can regenerate individual meals without redoing the whole plan,
  which is essential when you don't like a suggestion." Plus "more of / less of" food
  preference and a "configure the generator to only use foods they like" path.
- **Preferences:** calories, macros, diet (keto/vegan/paleo/Mediterranean/veg),
  exclusions, allergens, **budget**, schedule. Virtual **pantry** ("use up what you
  own first").
- **Shopping list: yes, automatic**, connects to Instacart + AmazonFresh; pantry
  de-dupes staples. PDF export (Premium).
- **IF/frequency:** configurable meals/snacks per day and schedule (not an explicit
  fasting toggle in sources found — UNVERIFIED on a named IF mode).
- **Plan lives in IA:** the plan IS the app — it is the home surface, persistent.
- Sources: https://www.eatthismuch.com/ ·
  https://www.promealplan.com/en/blog/eat-this-much-review-2026 ·
  https://blog.eatthismuch.com/best-meal-planning-apps/

### MyFitnessPal Premium+ Meal Planner (launched Jan 2026; 2026 Winter Release)
- **Generation: AUTO builder.** "Meal Plan Builder" generates from calorie target
  ("set manually or let MFP calculate"), diet type, food preferences, portion size.
- **Diet types (9):** "Standard, Mediterranean, Keto, Low-Carb, Vegetarian, Vegan,
  Pescatarian, Paleo, or Whole-Food Focus."
- **Meal Prep Mode:** choose "which days you cook (Sunday, Wednesday, etc.)" and mark
  "which meals to prep in advance" — explicit **batch-cook scheduling**.
- **Shopping list: yes.** "Generates a categorized grocery list (produce, dairy, meat,
  pantry)"; connects to Instacart, Walmart+, Amazon Fresh.
- **Plan→diary:** native — the planner sits inside MFP's own diary/tracker, so plan
  items flow into the food log. (Tight integration is its structural advantage.)
- **Recipes tab** (Winter 2026) for "discovery of goal-aligned meals" + save favourites.
- **Portion size:** small/medium/large (a crude household/appetite lever; no explicit
  per-person household scaling found in sources). IF: not mentioned (UNVERIFIED).
- **Pricing:** ~$99.99/yr (Premium+ tier).
- Sources: https://support.myfitnesspal.com/hc/en-us/articles/34347930588557-Premium
  (403 on direct fetch — see §6) ·
  https://www.globenewswire.com/news-release/2026/02/24/3243668/0/en/MyFitnessPal-Debuts-Its-2026-Winter-Release.html ·
  https://nutriscan.app/blog/posts/myfitnesspal-premium-vs-premium-plus-features-62075fe756

### RP Diet Coach & Planner (Renaissance Periodization)
- **Generation: TEMPLATE / approved-list.** "You set a goal and a diet length up
  front, and define some lifestyle information ... what time you wake up, when you
  train, and how many meals you want to eat per day." Then "a series of meals is
  defined for you ... cards, and you can select food from an approved list, then the
  app tells you how much of each food to eat."
- **Composition rule:** "For each meal, you can only select one food of each category."
- **Day-variability: built in.** "you can set these on a day-by-day basis; you don't
  have to stay the same every day" — per-day meal count and timing.
- **Training-time aware:** meal timing pegged to wake + train time (peri-workout
  nutrition is core to RP's pitch).
- **Swap UX (v1.5x, 2026):** macros can be redistributed "to any meal that is not
  locked, including ones that already have food," with an "Adjust foods" badge when
  existing food no longer matches the new target — plan the day, then fine-tune meals.
- **Auto-adjust:** "Two or three times per week, you weigh in, and the app adjusts your
  calories for the coming days" — closest analogue to Volyume's coach→plate loop.
- **Shopping list / cuisine / budget / household:** not its strength — RP is a
  macro-precision food selector, not a recipe/grocery app (no auto shopping list found).
- Sources: https://sisyphusstrength.com/blog/2021/6/28/rp-diet-app-a-full-review ·
  https://help.rpstrength.com/hc/en-us/articles/39482632639639-Diet-app-update-v1-52-April-2-2026
  (v1.52 swap-flexibility note) · help.rpstrength.com 35245413745815 (403 — see §6)

### Mealime
- **Generation: curated/recipe-based**, user-assembled week with heavy filtering
  ("plan meals for the entire week in minutes with over 200 personalization options").
- **Preferences (deep):** diet types (classic, flexitarian, pescatarian, low-carb,
  paleo, keto, veg, vegan), allergy restrictions (gluten/dairy/peanut/tree-nut/soy/egg
  -free etc.), and **119 individual dislikable ingredients** — a strong exclusions model.
- **Household/servings:** adjustable up to 6, but "only in increments of 2, 4, and 6,
  so it's not very customizable." Household **sharing** so others add recipes.
- **Shopping list: yes**, auto-combined, organised; check off in-store or send to
  fulfilment partners "at zero markup."
- IF/macros: light on macro precision (recipe app, not a macro engine).
- Source: https://www.mealime.com/ ·
  https://www.plantoeat.com/blog/2023/04/mealime-app-review-pros-and-cons/

### PlateJoy
- **Generation: AUTO from a deep questionnaire** — "over fifty data points," assesses
  "dietary restrictions, health goals, cooking skills, available time, and food
  preferences."
- **Household scaling:** "scale recipes based on household size and adjust portion
  sizes according to individual caloric needs" — proper per-person scaling.
- **Budget axis (notable):** "choose to have more variety ... or less variety to save
  money" and pick "more expensive specialty grocery stores ... or less expensive
  regular grocery stores" to tailor ingredients — the clearest **budget** lens found.
- **Shopping list:** auto, "organized by store sections," **digital pantry** to
  de-dupe; one-click Instacart / Amazon Fresh.
- Source: https://www.platejoy.com/ · https://masandpas.com/platejoy-review/

### Paprika (Recipe Manager)
- **Generation: fully MANUAL** — drag-and-drop recipes onto a daily/weekly/monthly
  calendar. "Save your favorite meal plans as reusable **menus**" (a manual rotation
  pool — directly relevant to Volyume's 3-3-3 idea, done by hand).
- **Shopping list:** "smart grocery lists that automatically combine ingredients and
  sort them by aisle"; **pantry** with expiry tracking.
- No macros/auto-fit, no household auto-scale beyond recipe yields. Cross-device sync.
- Lesson for us: the reusable-**menu** concept = a user-curated rotation pool surfaced
  as a first-class object. Volyume's `rotationPool` engine support has no such UI.
- Source: https://www.paprikaapp.com/ ·
  https://www.plantoeat.com/blog/2023/07/paprika-app-review-pros-and-cons/

### Strongr Fastr (closest direct competitor — macro meal generator)
- **Generation: AUTO ("AI") from protein/carb/fat goals** — "automatically generates a
  customizable macro meal plan ... in seconds"; "automatically calculates protein."
- **Swap UX:** "randomizing and swapping meals, while the AI ensures you're still
  eating exactly what you need" — macro-preserving swap, same contract as Volyume's
  swap solver (but they call it AI; ours is deterministic — an honesty edge for us).
- **Variability lever:** "**simplicity vs variety**" slider "based on how often you
  feel like cooking" — direct analogue to Volyume's `variety` / meal-prep mode.
- **Shopping list: yes** ("small grocery lists that will actually save you money").
- Diets: keto/paleo/veg/vegan; macros auto-adjust over time toward goal.
- Source: https://www.strongrfastr.com/macro-meal-planner ·
  https://www.strongrfastr.com/nutrition-ai-meal-planner

### Prospre (direct competitor — macro meal planner)
- **Generation: AUTO from calorie+macro goals**, whole week, "tell you exactly what to
  buy." Macro **ranges** settable; **scheduled recurring meals** ("schedule meals you
  eat often"); allergies input.
- **Swap UX:** "swap out the days or meals you don't like"; **"Fit Into Plan"** auto-
  adjusts the plan "to fit in a treat while still hitting your macros" — a flexible
  insert mechanic Volyume lacks.
- **Shopping list: yes**, exact ingredient amounts; Instacart/Amazon Fresh ordering.
- Also a tracker (barcode, 300k foods) — so plan→log lives in one app.
- Source: https://www.prospre.io/ · https://www.prospre.io/meal-plan-generator

### MealPrepPro (batch-cook specialist)
- **Generation: AUTO weekly plan tuned to prep cadence** — "right down to how often you
  want to prep and which days are best for **batch cooking**."
- **Household:** "how many people you cook for" is a profile input; help centre has a
  dedicated article "How to add your partner or family to your meal plan."
- **Preferences:** 15+ plan types (high-protein, low-carb, vegan, Mediterranean...),
  allergies, dislikes.
- **Shopping list:** "consolidates all ingredients and organizes them by aisle."
- **Plan→log:** "As you mark meals as eaten, the app tracks your calories and macros"
  and syncs Apple Health — a mark-as-eaten logging flow Volyume should study.
- Source: https://www.mealpreppro.com/ · https://help.mealpreppro.com/help/app
  (article titles confirm partner/family + batch-cook; full bodies JS-gated, see §6) ·
  https://blog.eatthismuch.com/best-meal-planning-apps/

### Jow (recipe-to-cart, household-first; UK-relevant model)
- **Generation: recipe selection + AUTO smart cart.** Inputs "kitchen appliances,
  household size, and dietary preferences," builds a personalised catalogue; "generates
  a smart cart based on your household needs, ensuring you only buy what you need."
- **Household: first-class** ("perfect for feeding any size household").
- **Shopping/grocery: the core** — auto-orders ingredients from chosen supermarket
  (US retailers listed; EU origin — French app). Free.
- Lesson: household size as a primary onboarding axis driving both portions and cart.
- Source: https://jow.com/ ·
  https://canvasbusinessmodel.com/blogs/how-it-works/jow-how-it-works

### UK supermarket-linked planners
- **Samsung Food (ex-Whisk):** "Drag and drop your personal recipe collection into a
  weekly meal plan"; **240,000+ recipes**, search by cuisine/cook-time/14 diets; orders
  ingredients "from 23 grocery retailers in the UK." Manual plan, auto cart, strong
  UK grocery linkage. Source: https://samsungfood.com/ ·
  https://play.google.com/store/apps/details?id=com.foodient.whisk&hl=en_GB
- **Tesco Real Food Meal Planner:** "choose from thousands of recipes, curate their
  weekly menu, and then, with a single click, add all the necessary ingredients
  directly to their Tesco online grocery basket." Manual recipe pick → one-click basket.
  Source (search-summarised; about.html 403, see §6):
  https://realfood.tesco.com/meal-planner.html ·
  https://www.exposedmagazine.co.uk/featured-articles/best-meal-planning-app-with-shopping-list-the-top-uk-choices-for-2026/
- Note: UK leaders compete on **supermarket-basket integration**, not macro precision —
  a lane Volyume need not enter, but a "shopping list" expectation it sets for UK users.

### Adjacency checks (where there is NO meal plan)
- **MacroFactor: NO meal plans.** "MacroFactor does not have a meal plan, no recipe
  library that scales to your macros ... what it never does is tell you what to actually
  cook." Recipe **builder** only (manual ingredient assembly). So MacroFactor is the
  market leader on adaptive macro coaching yet **cedes the entire plan surface** — a
  genuine opening for Volyume. Source:
  https://blog.eatthismuch.com/best-macro-tracking-apps/ ·
  https://nutriscan.app/blog/posts/is-macrofactor-worth-it-2026-529e4f7d46
- **Carbon (Layne Norton): NO meal plans.** "NOT good for recipes, meal plans... it's a
  macro and calorie tracker almost exclusively"; gives macro targets + diet preference
  (Balanced/Low-Carb/Low-Fat/Keto/Plant-Based) but not a plate. Source:
  https://feastgood.com/carbon-diet-coach-review/ · https://www.joincarbon.com/
- **Hevy: NO nutrition at all.** "Hevy does not have nutrition tracking and focuses
  solely on workouts." Strength apps largely punt nutrition to a second app — so a
  strength app with a real, deterministic plan (Volyume) is differentiated. Source:
  https://www.hevyapp.com/features/ · https://gymgod.app/blog/macrofactor-vs-hevy

---

## 2. SYNTHESIS (a) — WINNER PATTERNS (what the best share)

1. **Auto-generation is the default expectation** at the top end (Eat This Much, MFP+,
   Strongr Fastr, Prospre, PlateJoy). Volyume already does this deterministically.
   Source: eatthismuch.com; prospre.io; strongrfastr.com.
2. **The shopping list is table stakes.** EVERY recipe/plan leader auto-generates an
   aisle/category-sorted list, most with grocery-delivery hooks and a **pantry** to
   de-dupe. The only apps without one are the pure macro coaches (MacroFactor, Carbon)
   — which also have no plan. Confirmed: Eat This Much, MFP+, Mealime, PlateJoy,
   Paprika, Strongr Fastr, Prospre, MealPrepPro, Jow, Samsung Food, Tesco.
3. **Per-meal regeneration/swap that preserves macros** (Eat This Much, Strongr Fastr,
   Prospre). Volyume's macro-held swap matches this and labels it honestly.
4. **A variety↔simplicity lever for batch-cookers** (Strongr Fastr "simplicity vs
   variety"; MealPrepPro prep cadence; MFP+ Meal Prep Mode). Volyume has `variety:0`
   meal-prep mode but no batch-cook **day scheduling**.
5. **Household/servings scaling** as a primary axis (PlateJoy, Jow, MealPrepPro,
   Mealime). Volyume has none.
6. **Budget axis** (PlateJoy explicit; Eat This Much budget filter). Volyume has none.
7. **Reusable menus / rotation pools as first-class objects** (Paprika menus). Volyume
   has the engine (`rotationPool`) but no UI — half-built.
8. **The plan is a persistent home/IA object**, not a hidden screen (Eat This Much,
   MFP+, MealPrepPro). Volyume's plan has NO persistent door (a-09 finding) — this is
   the sharpest contrast with every winner.
9. **Mark-as-eaten → auto-logs macros** (MealPrepPro). Volyume's "Log this day" is the
   analogue but is today-only and one-shot.

## 3. SYNTHESIS (b) — WHERE VOLYUME ALREADY LEADS (honestly)

Cross-checked against the teardown; these are real, defensible advantages:

1. **Deterministic TD/NTD carb-cycling from one engine target.** No competitor found
   derives training-day vs rest-day plates deterministically with weekly total
   preserved and cycling self-disabling at the floor. RP does per-day meal config but
   the user drives it; Volyume computes the cycle. (a-09 assembler:78–107.)
2. **Gram-level coach→plate integration narrated in a fixed voice.** RP and Carbon
   adjust *calories*; none narrate the change down to the gram of rice on the actual
   plate (Volyume `planExplain`). This is unique in the set.
3. **ED-safe calorie floors enforced through every mutation** (swap, coach edit,
   close-out all double-clamp; a cut below floor becomes a HOLD). No competitor
   advertises a hard ED-safety envelope on the plan engine. Distinctive and on-brand.
4. **Style-diverse swap pool** (unique anchor|vehicle signatures, up to 11) — genuinely
   different plates, not macro near-clones. Strongr Fastr/Prospre swap on macros only;
   they hit the "week 3-4 repetition" wall Eat This Much's own reviewer flags. Our
   signature-diversity logic is a direct counter to that failure mode.
5. **Honest "deterministic, not AI" positioning.** Strongr Fastr and Prospre brand
   theirs "AI"; ours is reproducible and explainable — a trust/transparency edge,
   especially for the safety story.
6. **Offline-first.** Every competitor here is cloud-dependent (auto-gen, grocery APIs,
   recipe DBs). A plan that fully works with no connection is a structural Volyume-only
   property. (Mandate architecture rule.)

## 4. SYNTHESIS (c) — RANKED PICK-UPS vs a-09 GAPS, for Besa AND Eddie

Ranked by impact × fit with the deterministic/offline/ED-safe constraints.

1. **Persistent plan door + IA home for the plan.** [Besa-critical, Eddie-critical]
   Every winner makes the plan a permanent, discoverable object; a-09 says Volyume's
   only doors are an empty diary and a post-hoc coach deep-link. Highest-impact,
   lowest-risk, no engine change. (Pattern: Eat This Much / MFP+ / MealPrepPro.)
2. **Shopping list generation (aisle/category-sorted) from the active plan.**
   [Besa-strong, Eddie-strong] The one thing literally everyone has and Volyume lacks —
   CONFIRMED across 11 apps. Can be built deterministically and offline from curated-
   meal ingredients; no grocery-API dependency required for v1 (delivery hooks optional,
   and would breach "no PII to external services" if naive — keep list local).
3. **Rotation-pool (3-3-3) UI surfacing the existing engine.** [Eddie-strong,
   Besa-helpful] `rotationPool`/`poolAffinity` already scored; expose staple-picking as
   a first-class "menu" object (Paprika's reusable-menu pattern). Half-built → finished.
4. **Batch-cook / prep-day scheduling + servings/household scaling.** [Eddie-strong,
   Besa-moderate] MealPrepPro/MFP+ Meal Prep Mode + PlateJoy/Jow household scaling.
   Volyume has `variety:0` prep mode but no day scheduling and no household multiplier.
   Servings scaling is deterministic and offline-safe.
5. **Meal-frequency below 3 / IF / skip-breakfast + savoury-breakfast preference.**
   [Besa-relevant (light users / IF dieters), Eddie-relevant (OMAD/2-meal blocks)]
   Eat This Much/RP support flexible meal counts; Volyume clamps 3–6 and forces
   breakfast-character on meal_1. Must respect ED floors (an IF day still meets the
   floor) — feasible within the safety envelope.

Runners-up worth noting: future-date / whole-week "log to diary" (a-09 gap 2; trivial,
engine already accepts `entryDate`); "Fit Into Plan"-style treat insertion (Prospre)
that re-solves macros; mark-as-eaten per-meal logging (MealPrepPro) vs all-or-nothing
"log this day"; band re-check on swap (a-09 §4 latent honesty gap).

## 5. SYNTHESIS (d) — WHAT EVERYONE HAS THAT WE LACK

**CONFIRMED: the shopping list.** Auto-generated, aisle/category-sorted grocery lists
appear in every plan/recipe leader checked — Eat This Much, MyFitnessPal Premium+,
Mealime, PlateJoy, Paprika, Strongr Fastr, Prospre, MealPrepPro, Jow, Samsung Food,
Tesco. The only apps without one are the pure macro coaches that also have no plan
(MacroFactor, Carbon). Volyume has a full plan and **no shopping list** — the single
clearest universal gap. (a-09 confirms: "Shopping list / batch-cook / budget /
household — none present.")

Secondary near-universal items Volyume lacks: a **pantry/de-dupe** companion to the
list (Eat This Much, PlateJoy, Paprika), **household/servings scaling** (PlateJoy, Jow,
MealPrepPro, Mealime), and a **persistent plan home** (all auto-gen leaders).

---

## 6. FETCH-FAILURE LOG (per VERIFICATION PROTOCOL)

Failures = 4. None left a load-bearing claim unsupported (each has ≥1 alternative
fetched/searched source).

1. `help.rpstrength.com/.../35245413745815-Planning-Meals...` — HTTP 403. Covered by
   sisyphusstrength full-review fetch (verbatim quotes) + rpstrength v1.52 update page.
2. `faq.rpdiet.app/app/meal-step-1` — page is JS-rendered, body empty on fetch
   (no content). Same coverage as above.
3. `support.myfitnesspal.com/.../34347930588557-Premium` — HTTP 403. Covered by the
   GlobeNewswire 2026 Winter Release fetch + nutriscan feature-comparison fetch
   (both gave verbatim Meal Plan Builder / Meal Prep Mode / grocery-list quotes).
4. `realfood.tesco.com/meal-planner/about.html` — HTTP 403. Covered by WebSearch
   summary of realfood.tesco.com/meal-planner.html + exposedmagazine UK 2026 round-up.
   (Tesco "one-click to basket" treated as VERIFIED via two summarised sources but
   not a direct page fetch — flagged.)

Also: `help.mealpreppro.com/help/app` fetched OK but article bodies are JS-gated;
article TITLES (partner/family scaling, batch cooking, first plan) were readable and
corroborate the search-level claims.

UNVERIFIED items honestly flagged: Eat This Much named IF/fasting mode; MFP+ explicit
household per-person scaling and IF support; exact Tesco basket flow wording.
