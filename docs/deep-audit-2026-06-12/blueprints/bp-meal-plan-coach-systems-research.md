# Blueprint — Meal-Plan Coach Systems, Tooling & Structural Conventions

**Deep Audit 2026-06-12 · Research slice: coach systems, tooling, structural conventions**
*Companion to `bp-meal-plan-generator.md` (the algorithm). This report covers the
SYSTEMS coaches use, the STRUCTURAL CONVENTIONS they follow, and the DATA-MODEL
implications — so the generator mirrors elite practice, not just solves a maths problem.*

**Do NOT duplicate with:** `bp-meal-plan-generator.md` (generator algorithm, assembler
logic, swap maths, ED-safety routing — all there). `ext-06-elite-coaching-operations.md`
(check-in system, decision hierarchy, retention science — covered there).

---

## 0. Brief and scope

The prior agents covered what the Volyume coaching engine *decides* and how the
meal-plan *algorithm* works. This report answers: **how do elite coaches actually build,
structure and manage macro meal plans?** Specifically:

1. The tooling landscape — what software coaches use and what each does.
2. The structural conventions of a coach meal plan — the data model that matters.
3. Swap/substitution encoding in practice — the canonical format with concrete examples.
4. Management, revision and delivery — how plans evolve at check-in.
5. Preference, variety and allergy capture — the intake side of the model.
6. Recommendations — how Volyume's data model and swap-equivalence engine should
   be shaped to mirror elite practice, with notes on where the founder's real-coach
   spreadsheet (already extracted in `inputs/coach-spreadsheet-extract.md`) refines
   each point.

Hard constraints: deterministic, offline-first, Pro-gated, no AI/LLM, ED-safety floors
untouchable, British English. Every recommendation must be compatible with all.

---

## 1. The tooling landscape

### 1.1 B2B coaching platform comparison — nutrition/meal-plan modules

The market splits cleanly into two tiers: **B2B coaching management platforms** (coaches
use them to manage clients) and **dedicated nutrition/meal-plan software** (specialist
tools for building plans). None of the B2B platforms generates macro-accurate plans
*from scratch* without a separate tool or AI. The intelligence always lives in the coach's
head or in a dedicated nutrition app bolted on.

| Platform | Meal plan capability | Swap mechanism | Macro accuracy | Pricing (coach) | Key gap |
|---|---|---|---|---|---|
| **TrueCoach** | No native nutrition module; relies on MFP integration for client logging; coach can attach PDFs | None native — coach sends a hand-built plan | n/a (MFP passthrough) | from ~$19/mo | No plan-building capability — entirely manual |
| **Trainerize** | Smart Meal Planner (2025): generates up to 7 days from 1,000+ verified recipes, set calories + full macros / protein+calories / calories-only | Coach-side drag-and-drop swap; client portion adjust (permission-gated); no inline macro-rescale | Good — dietitian-verified recipe DB | ~$80–180/mo (Advanced Nutrition add-on ~$45/mo extra) | No food-level gram rescale on swap; AI meal variation in progress |
| **Everfit** | Native meal plans (structured: coach sets foods+grams; flexible: coach provides recipe collections within weekly macro target); Swap Recipe Variations; Day/Week edit views; Meal Plan Generator (AI-backed, 2025) | Swap Recipe Variations by diet tag (vegan/gluten-free etc.); no inline gram rescale for macro hold | Good within structured mode; flexible mode relies on client selecting correctly | Pro/Studio from ~$119–159/mo | AI swap is diet-tag not macro-exact; structured-mode is fully manual to build |
| **CoachRx** | Meal plan attachment + macro goal assignment per client; no generator; check-in macros; | None native — coach curates | None automated | from ~$59/mo | No plan builder — intended for coach-creates-externally workflow |
| **PT Distinction** | AI Meal Plan Builder (2025): generates from client stats + preferences; MFP full integration (macros, calories, micros, daily averages to coach); habit + photo tracking | AI generates variations; no inline gram rescale | AI-generated, not dietitian-verified | from ~$20–66/mo depending on tier | AI generator crosses the no-AI constraint; MFP integration useful reference |
| **WAG Seismic** | Coach assigns macros; Coaching Plus tier gives a 7-day personalised meal plan from the coach + 100+ mix-and-match ideas (1,000+ combinations); client tracks in Seismic | Coach-curated within food-category groups; macro-matching is manual | Human-coach calibrated | Consumer ($239–399/mo per client) | Human-only; scale is the bottleneck |

**Key lesson:** No B2B platform automates a macro-accurate meal plan with inline food-level
swap rescaling. Every platform either (a) generates via AI (accuracy unverified) or (b)
relies on a human coach building from scratch. Volyume's deterministic, curated-library
assembler closes this gap without the AI liability.

Sources: [Everfit nutrition page](https://everfit.io/nutrition/); [Everfit blog July 2025](https://blog.everfit.io/everfit-july-2025-updates); [Trainerize Smart Meal Planner](https://www.trainerize.com/blog/introducing-the-smart-meal-planner/); [PT Distinction AI Meal Plan](https://www.ptdistinction.com/blog/introducing-the-ai-meal-plan-builder); [sportfitnessapps comparison](https://sportfitnessapps.com/blog/abc-trainerize-vs-everfit-vs-truecoach/); [promealplan Everfit vs TrueCoach](https://www.promealplan.com/en/blog/everfit-vs-truecoach)

---

### 1.2 Dedicated nutrition / meal-plan software

| Tool | Who uses it | How plans are built | Swap mechanism | Pricing | Key strength / weakness |
|---|---|---|---|---|---|
| **That Clean Life** | RDs, nutritionists, health coaches | 7,000+ RD-created recipes; 150+ condition-specific templates; generate from kcal+diet type; assign exact portions; export branded PDF | Swap a meal for another from the recipe library (diet-filtered); no gram-level rescale | $30–60/mo (or ~$35/mo annual) | Clinical depth, beautiful PDFs; no physique/bodybuilding-specific plans; UK food coverage weak |
| **Evolution Nutrition** | Personal trainers, gym businesses | 4,400+ RD-created plans across 22 diet categories; coach assigns a pre-built plan (not generated per client); custom plans on Pro tier | Swap a plan meal for another of same diet category; macros shown but not rescaled | $59/mo | Scale via pre-built library; weak customisation — coach assigns, not generates; no white-label |
| **Nutritics** | Dietitians, universities, food businesses | 800,000+ food DB (incl. supplements); full meal-plan builder with recipe analysis; label generation; real-time macro analysis | Food-level substitution within recipe; no automated gram rescale | Contact for B2B pricing | Best-in-class database; very clinical/commercial; not consumer-facing |
| **Nutrium** | Clinical dietitians (~350k users, 90 countries) | Telehealth-integrated meal plan builder; micronutrient analysis; appointment scheduling bundled | Standard dietitian substitution (manual); no automated rescale | from $25/mo | European/Latin-American focus; overkill for physique coaching; macro-for-body-comp workflow awkward |
| **Eat This Much** | Self-coached consumers, coaches with a Pro account | Set calories + macros + dietary filters → auto-generates day (free) / week (Pro); regenerate individual meals; favourite/block foods | "List alternative meals" → macro-matched alternatives; drag-drop foods between meals; no food-level gram rescale | free tier; Pro ~$9/mo | Best consumer-grade meal generator outside Volyume's scope; macro filtering but no verified UK DB |
| **Strongr Fastr** | Consumers, macro-dieters | Generate plan from macro goals + 1,000+ recipe DB; swap any meal and portions **auto-adjust to better meet goals**; pin meals; diet axes (keto/paleo/veg) | Meal-level swap with portion auto-adjust to hold macros — closest to Volyume's target mechanic | Free tier + premium | The swap-with-rescale mechanic is the gold standard; no physique-specific or UK-specific features |
| **MealPrepPro** | Consumers doing batch cooking | Weekly meal plans for batch cooking; dietitian-approved recipes; grocery lists; macro + calorie tracking | Swap individual meals for alternatives; no gram rescale | $9.99/mo | Meal-prep repeatability emphasis — directly mirrors what Eddie wants |
| **Promealplan** | Coaches, dietitians | Generate from kcal + macro split + diet restrictions + 1,000+ dietitian-crafted recipes; portions to the gram, macros accurate within 2%; grocery list auto-generated; 200+ allergen filters | Meal-level swap for macro-matching alternative; coach can edit any meal; no live gram-rescale | from ~$29/mo | Closest to a deterministic macro-exact coach tool; built for coach workflow, not consumer self-serve |

**Key lesson:** The closest analogue to Volyume's target mechanic is **Strongr Fastr's
meal-level swap with auto portion-adjust** — but it operates on a generic food DB, not a
curated physique-specific UK library. Volyume uniquely combines macro-exact generation,
UK-verified data, physique-specific curated meals, AND coach integration (no app does
all four). That combination is genuinely uncopyable by any current tool.

Sources: [promealplan TCL review](https://www.promealplan.com/en/blog/that-clean-life-review-2026); [Strongr Fastr macro planner](https://www.strongrfastr.com/macro-meal-planner); [promealplan best coaches 2026](https://www.promealplan.com/en/blog/best-personalized-meal-planner-software-coaches-2026); [Eat This Much tutorial 7](https://blog.eatthismuch.com/eat-this-much-tutorial-7-time-savers-listing-alternative-meals-dragging-foods/); [promealplan EN review](https://www.promealplan.com/en/blog/evolution-nutrition-review-2026); [Nutrium review](https://www.promealplan.com/en/blog/nutrium-review-2026); [instituteofpersonaltrainers.com meal software](https://instituteofpersonaltrainers.com/blog/meal-planning-software-personal-trainers)

---

### 1.3 The ubiquitous spreadsheet workflow

Before and alongside every platform, **the spreadsheet remains the most common tool**
for physique prep coaches — especially for competition prep where the plan is highly
personalised and evolves weekly.

The canonical multi-tab spreadsheet (corroborated by the founder's real-coach spreadsheet
in `inputs/coach-spreadsheet-extract.md`) contains:

- **Nutrition Database tab** — the coach's personal food library: `food | amount | unit | kcal | protein | carbs | fat | category (PRO/CHO/FAT/VEG/FRUIT/OTHER)`. Typically 300–600 rows, heavily UK-branded, built over years.
- **Meal Plan tab** — the actual plan. Structure: `TRAINING DAY | NON-TRAINING DAY` side by side. Each has `MEAL 1–6` plus `PRE-WORKOUT / INTRA / POST-WORKOUT` on training days. Each food row: `food | amount | unit | kcal | PRO | CHO | FAT | category | OPTIONAL SWITCH (named sub + portion)`.
- **Daily Tracker tab** — fasted bodyweight, water, hunger 1–5, adherence 1–5, digestion, weekly averages.
- **Check-In tab** — 10 qualitative questions (energy/stress/nutrition/recovery, wins, struggles, what to improve).
- Other tabs: Dashboard, Timeline, Progress Photos, Training, Logbook, Supplements (PEDs tab out of scope for Volyume).

**What coaches praise about spreadsheets:**
- Full control over every gram and every food.
- The "Optional Switches" column is pre-curated and hand-calibrated — the coach knows these swaps hold macros because they built the food DB themselves.
- Can version-control plans across weeks (duplicate a tab, rename "Week 3").

**What coaches complain about:**
- Time to build from scratch: 45–90 minutes per client per plan, per week.
- No automation — recalculating after a macro change requires editing every affected food row.
- Cannot be shared elegantly with clients; usually exported as a PDF.
- No grocery list generation.
- No client-side logging integration — client must manually track in MFP/Cronometer and compare.

This directly validates Volyume's opportunity: a coach-quality plan that would take 60 minutes in a spreadsheet should be assembled in under a minute via the generator, and revise itself automatically when the engine changes the target.

Sources: `inputs/coach-spreadsheet-extract.md`; [coach workflow promealplan](https://www.promealplan.com/en/blog/how-to-create-an-effective-meal-plan-as-a-fitness-or-nutrition-coach); [strengthofsaad coaching spreadsheets](https://strengthofsaad.com/coaching-spreadsheets/)

---

## 2. Structural conventions of a coach meal plan

### 2.1 The canonical data model

Across RP Strength, WAG, Stronger U, Macros Inc, Beverly International, and the real-coach
spreadsheet, the structural conventions converge with striking consistency:

```
Plan
└── Day variant (TRAINING DAY / NON-TRAINING DAY)
    ├── Day totals  { kcal, protein_g, carbs_g, fat_g }
    │                expressed as both grams AND kcal-per-macro
    └── Meal 1..N
        ├── Meal totals  { kcal, protein_g, carbs_g, fat_g }
        └── Food item 1..M
            ├── food_name
            ├── amount (grams | item count | 'unlimited')
            ├── unit
            ├── macro role / category  (PRO / CHO / FAT / VEG / FREE)
            ├── kcal
            ├── protein_g, carbs_g, fat_g
            ├── optional_switch  { food_name, amount, unit }   ← THE SWAP
            └── notes  (constraints, cooking cues, e.g. "any cereal <4g fat/100g")
```

**Critical observations from the data model:**

1. **Every food item carries a macro role (category) field.** This is not optional
   decoration — it is the semantic anchor for the swap engine. PRO/CHO/FAT/VEG are the
   universal four categories. The real-coach spreadsheet adds FRUIT and OTHER. The RP
   template adds WORKOUT CARBS as a fifth training-specific category.

2. **Totals exist at TWO levels:** per-meal AND per-day. Both are non-negotiable. Elite
   coaches set per-meal protein targets (to maximise MPS) and per-day totals (to hit the
   energy balance). The meal-level total is what the swap preserves — not just the day.

3. **Training-day vs non-training-day is core, not optional.** Every elite coach plan
   has these as separate columns/tabs. Carbs flex (lower on non-training days); protein
   holds; fat partially fills the gap. The real-coach spreadsheet shows:
   - Training day: 3,392 kcal (1,188 protein + 1,412 carb + 792 fat)
   - Non-training day: 3,174 kcal (1,140 protein + 1,008 carb + 1,026 fat)
   Note: carbs down ~400 kcal, fat up ~234 kcal, protein held. RP template shows the same
   pattern with 6 meals on training days, 5 on non-training days.

4. **Peri-workout slots are structural, not cosmetic.** Training-day plans have dedicated
   PRE-WORKOUT, INTRA and POST-WORKOUT meals/snacks, not just numbered meals. This is RP's
   defining feature and it appears in the real-coach spreadsheet. For physique competitors
   (Eddie), this is mandatory structural support. For beginners (Besa), it is progressive
   disclosure.

5. **The "Optional Switch" / swap is a first-class field per food item.** Not a
   post-hoc suggestion — it is part of the plan schema. The coach pre-populates it with one
   or two named alternatives, hand-calibrated to hold macros.

6. **"Notes" per food item carries constraints and coaching cues.** Examples from the
   real-coach spreadsheet: "Any cereal that is less than 4g of fat per 100g", "Can be
   blended to help digestion and speed of eating." This is a machine-readable constraint
   (the first example), a coaching micro-cue (the second), and a validation rule.

Sources: `inputs/coach-spreadsheet-extract.md`; RP template structure via [athleticinsight RP guide](https://www.athleticinsight.com/diet/renaissance-periodization); [Stronger U structured flexibility](https://strongeru.com/structured-flexibility/); [Beverly International master food list](https://beverlyinternational.com/nutrition-blueprints-for-success/master-food-list/)

---

### 2.2 Meal count and timing conventions

| Phase / style | Meals/day (training) | Meals/day (rest) | Timing convention |
|---|---|---|---|
| RP physique template | 6 meals | 5 meals | Pre/intra/post structured around session; 3–4 hr intervals |
| WAG/Stronger U flexible | 3–5 (client-chosen) | 3–5 (same) | Protein at every meal; carbs can be timed around training but not mandatory |
| Prep coach (competition) | 5–6 meals | 4–5 meals | Pre/post mandatory; often a late-night protein meal |
| Beginner / mass-market | 3–4 meals | 3–4 meals | Breakfast/lunch/dinner + optional snack; no peri-workout complexity |

**Volyume implication:** The `mealsPerDay` field already exists. The generator should
default to 4 for Besa (no peri-workout slots shown), and offer 5–6 with peri-workout
split for Eddie when a training session exists for the day. This is the RP/prep-coach
standard. The real-coach spreadsheet validates this exactly.

---

### 2.3 The macro role taxonomy

Five categories are sufficient and are universally used:

| Category | Role | Example foods (UK context) | Swap constraint |
|---|---|---|---|
| **PRO** (Protein) | Primary protein source; protein-dominant | Chicken breast, cod, lean beef mince, eggs (whole), Skyr, cottage cheese, Quorn pieces, tofu | Swap holds the meal's *protein* grams at the prescribed portion |
| **CHO** (Carbohydrate) | Primary carb source; carb-dominant | White rice (cooked), oats (dry), sweet potato, pasta (dry), white potato, bagel thin, rice cakes, bread | Swap holds the meal's *carbs* grams at the equivalent cooked/dry weight |
| **FAT** | Primary fat source; fat-dominant | Cashews, peanut butter, avocado, olive oil, dark chocolate ≥85%, mixed nuts, seeds | Swap holds the meal's *fat* grams |
| **VEG** (Vegetables) | Fibre/micronutrient; low-macro "free" category | Broccoli, spinach, green beans, courgette, peppers, cucumber, lettuce | Generally unlimited or large fixed portion (150–200g); swap within this category is unconstrained |
| **FREE** | Seasonings, condiments, zero-cal drinks | Mustard, vinegar, hot sauce, calorie-free spray oil, herbs, spices | Below a threshold (e.g. <15 kcal/serving) these are excluded from macro accounting |

**Foods with dual roles** (eggs, full-fat dairy, fatty fish, nuts): the role is assigned
by the dominant macro contribution at the portion used. E.g. 2 whole eggs = PRO role
(~12g protein, ~10g fat — fat allowed as incidental per RP's rule of "1–2g fat per 6g
protein"). A fat-heavy source used as a fat addition (e.g. cashews 20g) = FAT role.

**The real-coach spreadsheet uses exactly these five categories** (PRO/CHO/FAT/FRUIT/VEG
with FRUIT as a sub-type of CHO and OTHER for condiments). This validates the model.

> **Where a founder-provided spreadsheet refines this point:** The coach's spreadsheet
> uses a 507-item food DB with explicit CATEGORY columns. The tag distribution confirms
> PRO/CHO/FAT/VEG as the core four for a physique plan, with FRUIT and OTHER (condiments)
> as minor supplementary categories. The generator's `curatedFoods.js` + the proposed
> `foodRoles.js` should mirror this taxonomy exactly.

---

## 3. Swap / substitution encoding — the canonical format with concrete examples

### 3.1 The standard practice

**Every elite physique coach builds a macro-preserving swap list.** The mechanism is
identical across RP templates, WAG's 3-food rotation, Stronger U's 3-3-3 method, Beverly
International's master food list, and the real-coach spreadsheet. The universal pattern:

> **Group foods by macro role → assign a standard-portion that delivers the same macro
> contribution → any food in the group can be substituted at the gram amount that holds
> the dominant macro for that role.**

The "standard portion" is the atom of the exchange. One exchange delivers a target macro
amount — typically 30g protein (PRO), 40–50g carbs (CHO), 10–15g fat (FAT). Foods within
a group are interchangeable at their respective gram amounts to deliver the same exchange.

This is structurally identical to the clinical **Exchange List System** (American Diabetes
Association) applied to physique nutrition — coaches apply it informally but consistently.

Sources: [macrosinc.net swapping macros](https://macrosinc.net/nutriwiki/swapping-macros/); [MTSU exchange list appendix](https://mtsu.pressbooks.pub/nutrition/back-matter/appendix-b-the-exchange-lists-for-meal-planning/); [iifym.com macro plan guide](https://iifym.com/blog/how-to-plan-your-meals-to-fit-your-macros/); [Stronger U 3-3-3 method](https://university.strongeru.com/home/3-3-3-method)

---

### 3.2 Concrete swap-list examples (the exact format Volyume should model)

**PROTEIN SOURCES — "30g protein exchange"**

The following portions each deliver approximately 30g protein with minimal fat incidental
(following RP's rule: tolerate ≤5g fat from the protein source itself):

| Food (UK context) | Portion | Protein | Carbs | Fat | Notes |
|---|---|---|---|---|---|
| Chicken breast (cooked) | 120–125g | ~30g | 0 | 1–2g | Benchmark source |
| Cod / haddock / tilapia | 130–140g | ~30g | 0 | 1–2g | White fish |
| Tuna (tinned in brine) | 115–120g | ~30g | 0 | 1g | Drain well |
| Turkey breast (cooked) | 120–125g | ~30g | 0 | 1–2g | |
| Lean beef mince ≥5% fat | 130–135g | ~30g | 0 | 7–9g | Fat slightly elevated |
| Egg whites | 240–250g (≈8 large) | ~30g | 1–2g | 0 | Volume eating |
| Whole eggs (mixed) | 200g (≈4 large) | ~25g | 1g | 18g | Fat = FAT role; use for PRO+FAT slot |
| Skyr / Icelandic yogurt | 200g | ~28–30g | 9–11g | 0–1g | Some carbs incidental |
| Low-fat cottage cheese | 200–220g | ~28–30g | 6–8g | 1g | |
| Quorn mince / pieces | 150g | ~20g | 4g | 4g | Lower protein density; increase portion |
| Tofu (firm) | 200–220g | ~20–22g | 2–4g | 6–8g | Lower density; vegan staple |

**CARBOHYDRATE SOURCES — "40g carbs exchange"**

The following portions each deliver approximately 40g carbohydrates (measuring conventions
noted — coaches typically weigh dry for grains, cooked for potato):

| Food (UK context) | Portion | Carbs | Protein | Fat | Measure |
|---|---|---|---|---|---|
| White rice | 55g dry / 165g cooked | ~40g | 4g | 0 | Dry weight preferred for accuracy |
| Brown rice | 55g dry / 155g cooked | ~40g | 4g | 1g | Dry weight |
| Rolled oats (porridge oats) | 55g dry | ~37–40g | 7g | 3g | Dry weight |
| Sweet potato | 170–180g raw (140g baked) | ~40g | 2g | 0 | Weigh raw |
| White potato | 200–210g raw (180g cooked) | ~40g | 4g | 0 | Weigh raw |
| Pasta (dry, white) | 55g dry / 135g cooked | ~40g | 7g | 1g | Dry weight |
| Pasta (dry, wholewheat) | 55g dry | ~38–40g | 8g | 2g | Dry weight |
| Bagel thin (1 item ≈ 50g) | 1 item | ~26g | 5g | 1g | Item count; carbs lower — adjust |
| White bread (sliced medium) | 55–60g (≈2 slices) | ~28g | 5g | 2g | 2 slices = ~30g carbs only |
| Rice cakes | 40g (≈4–5 cakes) | ~32g | 3g | 0.5g | Lower density; higher volume |
| Couscous | 55g dry | ~40g | 6g | 0.5g | Dry weight |
| Quinoa | 60g dry | ~38g | 8g | 3g | Dry weight; higher protein |

> **Real-coach spreadsheet corroboration:** The spreadsheet shows exactly this mechanic
> with explicit named swaps: Rice (Microwave) 125g → Pasta 50g [dry] (both CHO), Wrap 1
> item → Bagel Thin 1 item (CHO). The gram amounts are hand-calibrated to hold the carb
> contribution at that meal's slot. This is the data Volyume should pre-populate in the
> food DB's swap relationships.

**FAT SOURCES — "10–12g fat exchange"**

| Food (UK context) | Portion | Fat | Protein | Carbs |
|---|---|---|---|---|
| Cashews | 20g | ~10g | 4g | 7g |
| Mixed nuts | 18–20g | ~10–12g | 4g | 4–6g |
| Almonds | 18g | ~10g | 4g | 3g |
| Peanut butter | 15g | ~9g | 4g | 3g |
| Dark chocolate ≥85% | 20–21g | ~10–12g | 1g | 5g |
| Avocado | 65g (~⅓ medium) | ~10g | 1g | 3g |
| Olive oil / rapeseed oil | 11–12g (1 tbsp) | ~10–11g | 0 | 0 |
| Light cream cheese | 45g | ~10g | 3g | 2g |
| Light mayo | 25g | ~9g | 0 | 2g |

> **Real-coach spreadsheet corroboration:** Cashews 20g → Dark Chocolate 85% 21g (FAT);
> Light Mayo 25g → Peanut Butter 12g (FAT). Both hold approximately the same fat
> contribution at the adjusted gram amounts. This is pre-calibrated by the coach.

**VEGETABLE / FREE FOOD CONVENTIONS**

The universal convention for physique coaches is that non-starchy vegetables are **free**
or **unconstrained** in volume. RP allows unlimited vegetables alongside meals. Beverly
International and WAG specify a "free vegetables" category that can be eaten in any
quantity. The real-coach spreadsheet uses VEG as a category with either a large fixed
portion (200–300g) or "as needed."

Condiments below ~15 kcal/serving (mustard, hot sauce, vinegar, herbs, spices, zero-cal
spray) are categorised as FREE and excluded from macro accounting. This is universal.

> **Where a founder-provided spreadsheet would refine:** The incoming spreadsheet will
> likely show specific VEG and FREE food lists with their typical portions. This can
> populate the generator's "VEG" and "FREE" food pools and the unconstrained-swap logic.

---

### 3.3 The "3-foods-per-category" rotation method (Stronger U, WAG)

The most beginner-accessible encoding of swaps is Stronger U's **3-3-3 method**: pick 3
protein sources, 3 carb sources, 3 fat sources you enjoy and rotate. WAG teaches the same
as "4-step meal prep": pick protein source → carb source → veg source → fat source; choose
3–6 options per category and rotate weekly.

This maps directly to Volyume's `variety` dial in the preference profile:
- `variety = 0` (meal-prep mode, Eddie): fix 3 sources per category, repeat all week.
- `variety = 0.5` (default): rotate the 3 sources across the week's meals.
- `variety = 1` (maximum variety, Besa who wants novelty): pull from the full pool.

The swap list **is** the curated sub-pool for the user's preferred foods — not the entire
food DB. A Volyume "food rotation" is mechanically identical to Stronger U's 3-3-3 method:
declare preferred items, and the generator assembles from them.

Sources: [Stronger U 3-3-3 method](https://university.strongeru.com/home/3-3-3-method); [WAG 4-step meal prep](https://www.workingagainstgravity.com/articles/4-step-meal-prep-guide)

---

### 3.4 The cross-macro swap (when coaches swap fat for carbs and vice versa)

Macros Inc documents the practice explicitly: 1g of fat can be swapped for 2.25g of carbs
(both at 9 kcal/g vs 4 kcal/g respectively). Coaches use this when a client tolerates
higher fat or lower fat, holding calories constant by adjusting the other macro.

This is rarely applied at the food level in physique coaching — more often it is a phase
transition (cutting: reduce fat from high to moderate and fill with carbs for training fuel;
lean bulk: higher fat tolerance). It does not change the per-food swap logic but it does
explain why TD/NTD macro ratios shift the way they do: the carb reduction on rest days is
partially compensated by a fat increase at a 2.25:1 carb-to-fat ratio.

**Volyume implication:** The `delta` object from `computeAdaptiveTDEEAdjustment` may
reduce carbs or fat. The plan-edit engine in `planEdit.js` should default to reducing
carbs (adjust the CHO-category staples) before touching FAT-category staples, but can
split the reduction across both using the 2.25:1 ratio if the carb reduction alone would
breach a sane floor for any CHO staple.

Sources: [Macros Inc swapping macros](https://macrosinc.net/nutriwiki/swapping-macros/)

---

## 4. Management, revision and delivery

### 4.1 The check-in → plan revision loop

The universal physique coaching workflow:

1. **Friday/Saturday:** client submits check-in (weight trend, adherence, energy, wins,
   struggles, photos).
2. **Coach reviews within 24 hours** (Sunday response is standard).
3. **Decision hierarchy (per ext-06):** verify adherence → assess biofeedback → consider
   NEAT increase → adjust macros if needed. Most weeks: macros held.
4. **When macros are adjusted:** conservative cut of 100–200 kcal/day, almost always from
   carbs. The coach updates the plan. In a spreadsheet, this means editing one or two
   food rows in the MEAL PLAN tab — typically reducing a CHO-category staple by 10–20g
   dry weight.
5. **New plan delivered:** updated PDF or updated spreadsheet sent/pushed to client.
   Client uses it for the next week.

The key insight: **the weekly macro adjustment at check-in maps to a tiny food-level
change**, not a plan rebuild. 150 kcal less = ~37g fewer carbs = roughly 50g less cooked
white rice across 2 meals. This is exactly the `applyMacroDeltaToPlan` function in
`planEdit.js` — it is not hypothetical, it is the exact workflow elite coaches follow
manually in a spreadsheet.

**Typical revision frequency:**
- Competition prep (12–20 weeks out): weekly macro adjustments, sometimes twice-weekly.
- Off-season / body recomposition: every 2–3 weeks, with holds in between.
- Beginner / mass-market (Besa): every 2–4 weeks; most changes are calorie +/- 100–200.

Sources: [promealplan coach workflow](https://www.promealplan.com/en/blog/how-to-create-an-effective-meal-plan-as-a-fitness-or-nutrition-coach); [nutritioncoachingacademy check-ins](https://www.nutritioncoachingacademy.com/blog/how-to-do-nutrition-coaching-check-ins); `inputs/coach-spreadsheet-extract.md`

---

### 4.2 Variety and rotation management

**The problem coaches are actually solving** with variety is different for each persona:

- **Eddie (Elite/prep):** wants repeatability — the same 5–6 meals cycled each week so
  meal prep is efficient. Variety = 0. Coaches confirm: "prep clients eat the same 6 meals
  on repeat; variety is not the goal — precision and compliance are." The RP template's
  design philosophy is identical.
- **Besa (Beginner):** has no established food rotation yet. Wants guidance ("tell me what
  to eat") but gets bored if shown the same plan every week. Variety = 0.5–0.7 by default.

**How coaches handle it:** Stronger U and WAG both use the 3-foods-per-category approach
— limited rotation that provides perceived variety without overwhelming the client. Every
week, the plan uses the same 9 "approved" foods (3 per macro category) but arranges them
differently across meals and days. The client never feels like they are on a rigid plan
because the meals *feel* different even though the food pool is the same.

This is directly implementable in Volyume as the "recently-used" scoring term in the
assembler: weight against foods used in the last N plans, but only within the user's
declared preferred sub-pool. The sub-pool size (3 or the full library) is the `variety`
dial.

**Rotation cadence:** Most coaches rebuild or re-present the plan every 4 weeks rather
than every week unless macros change. This implies the generator should distinguish
between a "macro adjustment" re-render (same structure, adjusted grams on CHO/FAT
staples) and a "refresh rotation" re-render (new seed, rotate food selections, same
macro targets).

Sources: [promealplan.com coach workflow](https://www.promealplan.com/en/blog/how-to-create-an-effective-meal-plan-as-a-fitness-or-nutrition-coach); [3DMJ coaching philosophy](https://www.3dmusclejourney.com/blog/my-coaching-philosophy-3-keys-to-keep-in-mind-with-every-coaching-interaction); RP template structure

---

### 4.3 Delivery format and client education

**Standard delivery formats:**
1. **PDF** — the dominant method for spreadsheet-based coaches. Branded, static, sent via
   email or coaching app. Client screenshots and refers to it; cannot log from it.
2. **In-app plan assignment** — Everfit, Trainerize, PT Distinction all push the plan
   directly to the client app. Client taps a meal → logs it. This is the Volyume model
   and it is categorically superior to PDFs.
3. **Google Sheets shared link** — common for DIY coaches; client can see the plan
   updating in real time but cannot log from it.

**Teaching clients to use swaps:** Every coaching resource identifies this as a specific
coaching task, not a trivial one. The standard approach is:

1. Provide the full plan AND a "food swap reference" (one page listing the same
   categories with their 3–6 interchangeable options at the gram amounts).
2. Teach the rule: "You can swap any food for another in the same category at the portion
   listed. Never swap a CHO for a FAT or vice versa."
3. Reinforce in the first two check-in responses: acknowledge a swap the client made and
   confirm it was correct ("I see you swapped rice for potato — perfect, that's exactly
   how swaps work").

**Volyume implication:** The one-tap swap UX (tap a food → see alternatives → tap to
swap) does this teaching automatically by presenting same-category alternatives at the
correct gram amounts. No explicit educational content is needed if the mechanic itself
is transparent. But a one-line explanation under each swap — "this holds your carbs at
Xg" — is the teaching moment the coach would deliver verbally. Map this to `buildSwapReason`
in `mealSwap.js`.

Sources: [promealplan client guide 2026](https://www.promealplan.com/en/blog/nutrition-coaching-guide); [CoachRx personalized nutrition](https://www.coachrx.app/articles/personalized-nutrition-coaching-meal-planspersonalized-nutrition-coaching-meal-plans)

---

## 5. Preference, variety and allergy capture

### 5.1 The standard intake form fields (nutrition-relevant)

From cross-referencing WAG, Stronger U, Macros Inc, PT Distinction, Nutrium, and That
Clean Life onboarding processes, the standard preference capture for a macro-based plan is:

**Hard constraints (excludes — never appear in plan):**
- Food allergies: nuts, shellfish, dairy, gluten, eggs, soy — the standard 14 UK major
  allergens (Food Standards Agency list). Captured as yes/no at onboarding.
- Religious/ethical restrictions: halal, kosher, vegan, vegetarian — diet axis.
- Medical intolerances: lactose, fructose, FODMAP — tagged as excludes.

**Soft constraints (preferences — weight the generator but do not hard-filter):**
- Food dislikes: "I hate [food]" — persistent excludes per item. Coaches call this the
  "never show me" list. WAG explicitly collects this in onboarding.
- Cuisine preference: British staples vs Mediterranean vs Asian flavours etc.
- Prep effort: "I have 20 minutes" vs "I'm happy to cook" — maps to quick/cook prep tag.
- Budget: low / mid / high — maps to ingredient cost tier.
- Meals per day: already captured in Volyume.

**Structured food preferences:**
- Pinned favourites: "always include my porridge at breakfast" — the Stronger U "anchor
  meal" concept. Common among experienced coaches for client compliance.
- Recurring foods: "I eat X every day regardless" — Eat This Much's "Recurring Foods"
  feature. Deducted from the target before the plan fills the remaining slots.

**The standard onboarding sequence** (from coaching practice):
1. Diet axis (omnivore / vegetarian / vegan) — day 1.
2. Hard allergens — day 1.
3. Food dislikes — can be captured progressively ("flag this food") rather than
   exhaustively at onboarding. This is the recommended approach to reduce friction.
4. Preferred cuisines and prep effort — week 1, optional.
5. Pinned meals — once the user has identified their go-to meals (typically after 2–4
   weeks of using the plan), these can be pinned.

Sources: [nutriadmin nutritional assessment](https://nutriadmin.com/blog/nutritional-assessment-form/); [stephanielong.ca intake form](https://www.stephanielong.ca/blog/nutrition-client-intake-form); [Trainerize flexible meal planner](https://www.trainerize.com/blog/trainerize-update-flexible-meal-planner-coach-nutrition-your-way/); [Everfit food options](https://help.everfit.io/en/articles/4578482-nutrition-coaching-macros)

---

### 5.2 The "flag this food" progressive capture model (recommended for Volyume)

Elite coaches learn client dislikes over weeks of check-ins — they do not expect complete
preference lists at onboarding. The digital equivalent is the "flag this food" button on
any plan item or food row: tap once → food is added to the permanent excludes list →
never appears in future plans or swaps.

This model has three advantages:
1. **Zero onboarding friction** — no long preference questionnaire before the first plan.
2. **Learning over time** — the exclude list grows naturally as the client uses the plan.
3. **Autonomy signal** — the client *controls* the plan rather than just receiving it.
   This maps to the 3DMJ "collaborative not dictated" principle, which is the strongest
   retention lever in coaching.

Volyume already has `food_favourites` table with `kind: 'fav' | 'dislike'` and
`cycleFoodPreference` / `getDislikes` — the data layer exists. The missing piece is the
UI touchpoint (flag button on plan items) and the generator's exclusion filter.

---

### 5.3 Allergen tagging on the food database

For the generator to respect hard allergens, foods in `curatedFoods.js` need an
ingredient-tag layer. The minimal viable set for UK physique coaching:

```js
// Proposed tag schema addition to curatedFoods entries
tags: {
  allergens: ['nuts', 'dairy', 'eggs', 'gluten', 'soy', 'shellfish', 'fish'],
  diet:      'omnivore' | 'vegetarian' | 'vegan',   // already exists as dietAllows
  cuisine:   'british' | 'mediterranean' | 'asian' | 'american' | null,
  prep:      'quick' | 'cook' | null,
  budget:    'low' | 'mid' | null,
}
```

The `allergens` array on a food means: "this food contains or may contain these allergens."
The generator's exclusion filter: `!userAllergens.some(a => food.tags.allergens.includes(a))`.
This is a hard filter — any food with a user's declared allergen is excluded without
exception.

The real-coach spreadsheet already applies a similar implicit exclusion: the Nutrition
Database tab excludes foods the coach knows the client cannot eat; Volyume's `tags` layer
makes this machine-readable and generalisable.

---

## 6. Recommendations for Volyume's data model and swap-equivalence engine

The following recommendations are ordered by implementation priority and compatibility
with the `bp-meal-plan-generator.md` blueprint. Each notes where a founder-provided real
coach spreadsheet would refine the point.

---

### REC-1 — Adopt the canonical five-category food role taxonomy

**What:** Classify every food in `curatedFoods.js` with a macro role: PRO / CHO / FAT /
VEG / FREE. This is the semantic anchor for the entire swap engine.

**How:** Add a `role: 'protein'|'carb'|'fat'|'veg'|'free'` field to each `curatedFoods`
entry. Where the macros are ambiguous (e.g. whole eggs = PRO+FAT), assign the role based
on the *primary use in the plan context* — eggs as the PRO source = 'protein'; nuts as
the fat addition = 'fat'.

**Why it mirrors elite practice:** Every coach plan (RP, Beverly, real-coach spreadsheet)
uses exactly this taxonomy. The swap engine only works reliably if roles are explicit.
Deriving roles from macro ratios algorithmically (`foodRoles.js`) is correct as a fallback
but the curated-food list should have explicit roles where the intended use is fixed.

**Where spreadsheet refines:** The 507-item coach DB uses PRO/CHO/FAT/FRUIT/VEG/OTHER.
The incoming spreadsheet will confirm which specific UK foods the coach assigned to each
category — this is directly usable to populate or validate `curatedFoods.js` role tags.
**Do not copy the spreadsheet wholesale; use it as a validation reference.**

**Personas:** Both (Elite and Beginner). **Effort:** S. **Constraint:** None.

---

### REC-2 — First-class TD/NTD plan variants in the data model

**What:** The assembled plan should carry explicit `TRAINING_DAY` and `NON_TRAINING_DAY`
variants as top-level properties, not computed ad hoc.

**How:**
```js
plan = {
  id, weekStart,
  variants: {
    training:     { slots: [...], totals: {...} },
    nonTraining:  { slots: [...], totals: {...} },
  },
  target: { training: {...}, nonTraining: {...} }
}
```

Each variant is assembled independently by `assembleDayPlan` with the appropriate target
(the engine already produces separate training-day and non-training-day targets via
`calculateNutritionTargets` when `trainingToday = true/false`). On a given day, the app
presents the correct variant based on whether a session is logged.

**Why it mirrors elite practice:** TD/NTD is not an optional feature — it is structurally
present in every elite physique coach plan including the real-coach spreadsheet. Carbs
flex between training and rest days; this cannot be captured with a single plan structure.

**Where spreadsheet refines:** The spreadsheet shows exact TD and NTD macro totals
side-by-side. The gram differences on specific CHO-category foods (the carb reduction on
NTD) confirm which food types absorb the carb variance — typically the starchy CHO sources
at the largest meal slots, leaving PRE/POST workout carbs intact on training days and
reducing the equivalent at dinner on rest days.

**Personas:** Elite (immediate), Beginner (progressive disclosure — show "training day" /
"rest day" once consistent logging is established). **Effort:** S (data model only, the
assembler already takes trainingToday). **Constraint:** None.

---

### REC-3 — Peri-workout slot support as first-class plan structure

**What:** Training-day plans should have named peri-workout slots: `pre_workout`,
`intra_workout`, `post_workout` — not just numbered meals.

**How:** Add slot keys to `curatedMeals.js`'s `slots[]` array. The assembler on training
days, when `peri_workout = true` (Eddie preference or future progressive-disclosure
trigger), inserts these slots between Meal N and Meal N+1 around the session time. The
macros for peri-workout slots follow RP-validated convention: pre = carb-dominant (40–60g
CHO, 20–30g PRO, minimal fat); post = carb+protein (40–50g CHO, 30–40g PRO, minimal fat).

**Why it mirrors elite practice:** The real-coach spreadsheet has explicit
PRE-WORKOUT/INTRA/POST-WORKOUT rows as named, first-class plan items. RP Diet Coach's
defining feature is meal-by-meal macro splits around the session — this is the feature
that makes it the elite physique coaching standard. No current mass-market app offers
this at the plan level; it is the TI-10 opportunity identified in `ext-03`.

**Where spreadsheet refines:** The coach spreadsheet shows INTRA = EAA/creatine/glutamine
(essentially supplement-only, minimal food macros). Volyume should model INTRA as a
supplement/supplement-only slot (not a food meal) to avoid generating a food plan for the
intra-workout window.

**Personas:** Elite (Eddie, physique competitors). Beginner: hidden by default.
**Effort:** S–M. **Constraint:** None.

---

### REC-4 — Pre-curated swap alternatives as a first-class food attribute

**What:** For every food in `curatedFoods.js`, optionally pre-populate `swapOptions: [{foodKey, grams, note}]` — a curated list of 2–3 hand-validated alternatives that hold the same macro contribution.

**How:** This is a supplementary field. The `mealSwap.js` logic already computes
alternatives algorithmically from `foodRoles.js` + `suggestFood`. Pre-curated swaps
override the algorithmic result when they exist, providing coach-validated pairings.

```js
// Example entry in curatedFoods.js
{
  key: 'white_rice_dry',
  name: 'White rice (dry)',
  role: 'carb',
  per100g: { kcal: 361, protein: 6.7, carbs: 79, fat: 0.6 },
  swapOptions: [
    { foodKey: 'pasta_dry', grams: 50, note: 'Holds carbs at ~40g' },
    { foodKey: 'sweet_potato_raw', grams: 175, note: 'Higher fibre; holds carbs at ~40g' },
    { foodKey: 'couscous_dry', grams: 55, note: 'Quick-prep; holds carbs at ~40g' },
  ]
}
```

**Why it mirrors elite practice:** The real-coach spreadsheet's "OPTIONAL SWITCHES" column
is exactly this — pre-curated, hand-validated pairs. The coach has already confirmed the
gram equivalences work in practice. Volyume can provide this quality guarantee via the
curated food DB. The algorithmic fallback (`findRoleAlternatives`) handles foods not in
the curated DB; the pre-curated list handles the 90% of common physique foods where the
"correct" swap is known.

**Where spreadsheet refines:** The spreadsheet provides actual swap pairs in use:
Rice 125g cooked → Pasta 50g dry; Cashews 20g → Dark Chocolate 85% 21g; Wrap 1 item →
Bagel Thin 1 item; Light Mayo 25g → Peanut Butter 12g. These can be directly encoded as
`swapOptions` entries after validation against the macros in `curatedFoods`. This is the
single most valuable actionable item from the spreadsheet for the swap engine.

**Personas:** Both. **Effort:** S (schema addition to curatedFoods, no logic change).
**Constraint:** None.

---

### REC-5 — Notes/constraints field per food item (machine-readable constraint + cooking cue)

**What:** Add an optional `notes` field to plan food items (not to the food DB, but to
the plan item itself when generated or when the coach builds a plan).

**How:**
```js
// In the assembled plan's food item
{ foodKey: 'cereal_generic', grams: 45, role: 'carb',
  notes: 'Choose any cereal with less than 4g fat per 100g',
  constraint: { maxFatPer100g: 4 }  // machine-readable for future validation
}
```

The `notes` text surfaces in the Besa and Eddie presentation as a small inline cue below
the food row. The `constraint` field is for future validation (e.g. a barcode scan that
confirms the product meets the constraint).

**Why it mirrors elite practice:** The real-coach spreadsheet uses the NOTES column for
exactly this — both human-readable coaching cues ("can be blended to help digestion") and
implicit constraints ("any cereal < 4g fat per 100g"). This is the coach's personalisation
fingerprint; encoding it raises the plan from a generic template to a coached document.

**Where spreadsheet refines:** The spreadsheet will contain specific NOTES for specific
foods used in the plan. These can inform the default notes strings for high-frequency
curated foods in the generator.

**Personas:** Both. **Effort:** S. **Constraint:** None.

---

### REC-6 — The "3-3-3 rotation pool" as the user's preferred food sub-pool

**What:** In the preference profile, distinguish between "hard excludes" (never show),
"preferred pool" (the 3–6 foods per role the user rotates), and "available pool" (the
full curated library). The generator defaults to the preferred pool when populated; falls
back to the available pool when not.

**How:**
```js
prefs = {
  ...existing fields...,
  rotationPool: {
    protein: ['chicken_breast', 'skyr', 'quorn_mince'],
    carb:    ['white_rice_dry', 'oats_rolled', 'sweet_potato'],
    fat:     ['cashews', 'olive_oil', 'avocado'],
  }
}
```

When `rotationPool` is populated for a role, `filterByPreferences` restricts the
candidate pool to those keys. The `variety` dial controls whether the assembler repeats
the same item (meal-prep) or rotates across the 3 options.

**Why it mirrors elite practice:** Stronger U's 3-3-3 method, WAG's 3–6 per category, and
the prep-coach "limited food rotation" are all the same mechanic. Elite physique
competitors eat 6–8 go-to meals on repeat — the `rotationPool` makes this the explicit
model, not a side effect. For Besa, the generator populates the pool intelligently from
her most-logged foods after 2–4 weeks.

**Where spreadsheet refines:** The coach's personal Nutrition Database is their rotation
pool — 507 items but typically only 20–30 are used in any given client plan. The incoming
spreadsheet's MEAL PLAN tab will show which foods are actually in rotation for this client,
confirming the "small pool in practice" finding.

**Personas:** Eddie (explicit, full control), Besa (implicit, auto-populated from logs).
**Effort:** S (extends the preference model in `planPreferences.js`). **Constraint:** None.

---

### REC-7 — Plan "macro adjustment" vs "rotation refresh" as distinct operations

**What:** The check-in macro edit (`planEdit.js → applyMacroDeltaToPlan`) should be
flagged as a different operation from a user-initiated "refresh my plan" (new seed,
same targets). The distinction is:

- **Macro adjustment:** triggered by the coaching engine; modifies grams on specific CHO/FAT
  staples; keeps the same food selection; narrated in the coach voice at food level.
- **Rotation refresh:** triggered by user ("I want new meals this week"); re-runs the
  assembler with a new seed; does not change macros; updates food selection within the
  same targets.

**How:** The `plan` object carries a `lastEditType: 'macro_adjustment' | 'rotation' | 'initial'`
field. The coach-voice narration fires only on `macro_adjustment`. On `rotation`, the UI
says "Your plan has been updated with new meals — macros unchanged."

**Why it mirrors elite practice:** Coaches distinguish between "I've changed your macros
(here's the gram change)" and "here's a fresh plan rotation (same macros, different meals)."
Conflating them confuses clients. The macro adjustment is the coaching event; the rotation
is a variety convenience.

**Personas:** Both. **Effort:** S. **Constraint:** None.

---

### REC-8 — Allergen tag layer on `curatedFoods.js` (UK FSA 14 allergens)

**What:** Add an `allergens` array to each `curatedFoods` entry, using the UK Food Standards
Agency's 14 major allergens as the tag set.

**How:** The 14 UK major allergens: celery, cereals containing gluten, crustaceans, eggs,
fish, lupin, milk/dairy, molluscs, mustard, tree nuts (peanuts separately), sesame,
soya, sulphur dioxide/sulphites. For the physique context, the highest-frequency ones to
tag first: **nuts, dairy, eggs, gluten, fish, soya**.

The generator's exclusion filter: `!userAllergens.some(a => food.allergens?.includes(a))`.
Any food with a matching allergen is hard-excluded — not offered as a swap, not in the
candidate pool.

**Why it mirrors elite practice:** Every coaching platform (Everfit, Trainerize, That Clean
Life) collects allergens at onboarding and uses them to hard-filter plans. The UK FSA 14
is the regulatory standard and the expected list for any UK app. Volyume's existing
`excludeTags` field in the preference profile is the right place; this adds the vocabulary.

**Where spreadsheet refines:** The coach's Nutrition Database already implicitly excludes
foods for known allergens — the CATEGORY / food selection reflects the client's profile.
The incoming spreadsheet will show which foods appear in the DB (confirming which
allergen-relevant foods exist in the relevant UK physique context).

**Personas:** Both. **Effort:** S (tagging exercise on curatedFoods; filter already exists
in `planPreferences`). **Constraint:** None.

---

### REC-9 — Transparent swap reasoning at the gram level (the "teaching moment")

**What:** Every food-level swap shown to the user should include a one-line rationale at
the gram level: "This holds your carbs at Xg." / "Keeps your protein at Xg." Implemented
in `buildSwapReason` in `mealSwap.js`.

**Why it mirrors elite coaching:** Elite coaches teach the swap logic verbally on the first
plan delivery: "you can swap any CHO for another CHO at the gram amount that holds your
carbs." The app can do this automatically with one line of copy. This prevents the "why
did the portion change?" confusion when a user swaps rice for oats and the gram amount
differs substantially. It is also the exact copy format used by the five-part coach voice.

**Besa framing:** "This holds your carbs — you'll barely notice the difference." (identity-
framing, not technical).
**Eddie framing:** "→ 180g sweet potato holds 40g carbs. Fat unchanged." (data-dense).

Both can be generated from the same structured `swapReason` object; only the rendering
differs by persona mode.

**Personas:** Both (different copy density). **Effort:** S (copy layer on existing
`buildSwapReason` pattern from `swapEngine.js`). **Constraint:** None.

---

### REC-10 — Sane gram floors/ceilings per food category (prevents inedible swaps)

**What:** When `suggestFood` solves grams for a swap, clamp the result within
category-appropriate ranges, not just the generic `[20, 400]` range currently used.

**Recommended ranges by role:**

| Role | Minimum (g) | Maximum (g) | Rationale |
|---|---|---|---|
| PRO (lean meat/fish) | 60g | 300g | Below 60g is a tiny unworkable portion; above 300g is unrealistic for a single meal |
| PRO (dairy/soft, e.g. yogurt) | 100g | 400g | Lower density; larger volumes normal |
| CHO (grains, dry weight) | 20g | 120g | Below 20g dry is negligible; above 120g dry is one very large meal |
| CHO (starchy veg, raw weight) | 80g | 400g | Potato/sweet potato: small baked to very large |
| FAT (nuts/seeds) | 10g | 50g | Standard nut portion 15–30g; above 50g is a fat bomb |
| FAT (oil) | 5g | 30g | 1 tsp to 2 tbsp; above 30g is very unusual |
| FAT (nut butter) | 10g | 50g | Standard 15g; above 50g is significant |
| VEG (non-starchy) | 50g | 500g | Generous — these are the "free" foods |

These replace the single `[20, 400]` clamp in `suggestFood` with a `getCategoryClamp(role)` lookup.

**Why it mirrors elite practice:** Coaches never serve 15g of chicken (a PR protein) or
380g of dry oats (absurd volume). The curated-library approach mostly prevents these
extremes already, but the gram-solver for swaps and plan-edit adjustments needs explicit
role-appropriate floors/ceilings to remain in the realm of real food portions.

**Personas:** Both. **Effort:** S. **Constraint:** None.

---

## 7. Cross-reference — where this report validates or extends prior work

### Validates

- `bp-meal-plan-generator.md`: the "6–8 go-to meals" pattern, protein-first assembly,
  TD/NTD as core, pre-calibrated swaps, curated-library approach. All confirmed by this
  research.
- `inputs/coach-spreadsheet-extract.md`: the PRO/CHO/FAT/VEG taxonomy, the
  OPTIONAL SWITCHES column, the TD/NTD side-by-side structure, peri-workout slots. All
  validated against the wider coaching tooling landscape.
- `ext-06` Section 1.3 decision hierarchy: verified adherence → NEAT → macros. The same
  sequence governs plan revisions. Confirmed.

### Extends

**Extension A:** The prior generator blueprint correctly identifies the swap mechanic but
does not document the *canonical gram equivalences* for common UK physique foods. This
report provides them (Section 3.2). They should be pre-populated as `swapOptions` in
`curatedFoods.js` (REC-4), not left entirely to algorithmic derivation.

**Extension B:** The prior work does not document the "3-3-3 rotation pool" concept from
Stronger U/WAG as the formal model for the `variety` dial. This report establishes it as
standard coaching practice, giving the `rotationPool` preference field a named precedent
(REC-6).

**Extension C:** The distinction between a "macro adjustment" (coaching event, narrated)
and a "rotation refresh" (variety update, neutral) was not in the prior work. This report
adds it as a required distinction in the data model (REC-7).

**Extension D:** Allergen tagging using the UK FSA 14 allergens was listed as a
requirement in `_REQ-meal-plan-personalisation.md` (R1) but without the specific tag
vocabulary. This report provides it (REC-8).

### Disagreements with prior conclusions

**None.** This report is additive. The prior generator blueprint is technically sound.
The structural conventions confirmed here strengthen its foundations rather than
contradict them.

---

## 8. Where the founder's real-coach spreadsheet would refine each point

A summary of the five highest-value refinements the incoming spreadsheet can provide:

| Point | What the spreadsheet confirms | Action |
|---|---|---|
| **Swap pairs (REC-4)** | Named swap pairs with actual grams from the coach's calibrated DB | Copy the `swapOptions` directly; validate against `curatedFoods.js` macros |
| **TD/NTD macro split (REC-2)** | Exact kcal-per-macro for a real UK physique client's training vs rest days | Use to calibrate the TD/NTD target difference in `calculateNutritionTargets`' output structure |
| **Food pool in practice (REC-6)** | Which 20–30 of the 507 DB items appear in the actual plan | Confirm that the generator's curated library covers the most-used physique prep foods |
| **Notes / constraints (REC-5)** | Specific constraint strings per food (e.g. "cereal < 4g fat per 100g") | Seed `notes` defaults for high-frequency foods in `curatedFoods.js` |
| **Meal count and timing (Section 2.2)** | Actual meal count on TD/NTD for this client (6/5 confirmed) and specific peri-workout slot contents | Validates the slot structure; confirms INTRA = supplement-only |

**Important:** The founder has stated "Don't use it as the fountain — there's better research
out there." This report is the "better research." The spreadsheet is a validation reference
for specific gram-level calibrations, not a substitute for the evidence-based structural
model developed here.

---

## 9. Sources

- [Everfit nutrition](https://everfit.io/nutrition/)
- [Everfit July 2025 updates](https://blog.everfit.io/everfit-july-2025-updates)
- [Everfit Meal Plan Templates](https://help.everfit.io/en/articles/8778043-introducing-meal-plan-templates)
- [Trainerize Smart Meal Planner](https://www.trainerize.com/blog/introducing-the-smart-meal-planner/)
- [Trainerize Flexible Meal Planner](https://www.trainerize.com/blog/trainerize-update-flexible-meal-planner-coach-nutrition-your-way/)
- [Trainerize nutrition coaching](https://www.trainerize.com/blog/abc-trainerize-for-nutrition-coaching/)
- [PT Distinction AI Meal Plan Builder](https://www.ptdistinction.com/blog/introducing-the-ai-meal-plan-builder)
- [PT Distinction nutrition features](https://www.ptdistinction.com/features)
- [promealplan — best nutrition software coaches 2026](https://www.promealplan.com/en/blog/nutrition-software-for-coaches)
- [promealplan — That Clean Life review 2026](https://www.promealplan.com/en/blog/that-clean-life-review-2026)
- [promealplan — Evolution Nutrition review 2026](https://www.promealplan.com/en/blog/evolution-nutrition-review-2026)
- [promealplan — Nutrium review 2026](https://www.promealplan.com/en/blog/nutrium-review-2026)
- [promealplan — Everfit vs TrueCoach](https://www.promealplan.com/en/blog/everfit-vs-truecoach)
- [promealplan — meal plan guide for professionals 2026](https://www.promealplan.com/en/blog/meal-plan-guide-for-nutrition-professionals)
- [promealplan — coach workflow (60 → 5 min)](https://www.promealplan.com/en/blog/how-to-create-an-effective-meal-plan-as-a-fitness-or-nutrition-coach)
- [promealplan — client guide 2026](https://www.promealplan.com/en/blog/nutrition-coaching-guide)
- [sportfitnessapps — Trainerize vs Everfit vs TrueCoach](https://sportfitnessapps.com/blog/abc-trainerize-vs-everfit-vs-truecoach/)
- [Strongr Fastr macro meal planner](https://www.strongrfastr.com/macro-meal-planner)
- [Eat This Much tutorial 7 — alternative meals](https://blog.eatthismuch.com/eat-this-much-tutorial-7-time-savers-listing-alternative-meals-dragging-foods/)
- [WAG meal plan page](https://www.workingagainstgravity.com/meal-plan)
- [WAG 4-step meal prep guide](https://www.workingagainstgravity.com/articles/4-step-meal-prep-guide)
- [Stronger U structured flexibility](https://strongeru.com/structured-flexibility/)
- [Stronger U 3-3-3 method](https://university.strongeru.com/home/3-3-3-method)
- [Stronger U meal planning guide PDF](https://strongeru.com/wp-content/uploads/2020/09/STRONGERU-MEAL-PLANNING-GUIDE-V4.pdf)
- [Macros Inc — swapping macros](https://macrosinc.net/nutriwiki/swapping-macros/)
- [Macros Inc — will a coach give me a meal plan](https://macrosinc.net/blog/nutrition-coach-meal-plan)
- [Macros Inc — how coaching works](https://macrosinc.net/blog/how-does-our-coaching-work)
- [Beverly International master food list](https://beverlyinternational.com/nutrition-blueprints-for-success/master-food-list/)
- [Beverly International 50-20-30 programme](https://beverlyinternational.com/beverly-international-50-20-30-gain-muscle-lose-fat-nutritional-program/)
- [RP Strength — simplified diet templates](https://rpstrength.com/blogs/articles/rp-diet-templates-simplified)
- [RP Strength — healthy diet templates](https://rpstrength.com/blogs/articles/introducing-healthy-diet-templates)
- [athleticinsight — RP diet beginner guide](https://www.athleticinsight.com/diet/renaissance-periodization)
- [RP template FAQ — Scribd](https://www.scribd.com/document/540153507/RP-Diet-Template-FAQ-2)
- [nutriphy — RP diet template guide](https://nutriphy.in/blog/renaissance-periodization-diet-template-3462/)
- [CoachRx — personalized nutrition](https://www.coachrx.app/articles/personalized-nutrition-coaching-meal-planspersonalized-nutrition-coaching-meal-plans)
- [MTSU Exchange Lists appendix](https://mtsu.pressbooks.pub/nutrition/back-matter/appendix-b-the-exchange-lists-for-meal-planning/)
- [nutriadmin — nutritional assessment form](https://nutriadmin.com/blog/nutritional-assessment-form/)
- [Precision Nutrition — meal plans usually suck](https://www.precisionnutrition.com/meal-plans-usually-suck)
- [3DMJ coaching philosophy](https://www.3dmusclejourney.com/blog/my-coaching-philosophy-3-keys-to-keep-in-mind-with-every-coaching-interaction)
- `inputs/coach-spreadsheet-extract.md` — real-coach spreadsheet structural extract
- `bp-meal-plan-generator.md` — algorithm blueprint (do not duplicate)
- `external/ext-06-elite-coaching-operations.md` — check-in and decision hierarchy
- `external/ext-03-massmarket-nutrition-apps.md` — mass-market nutrition app analysis

---

*Report completed: 2026-06-12. Assigned slice: meal-plan coach systems, tooling and
structural conventions. Algorithm blueprint is in `bp-meal-plan-generator.md`.*
