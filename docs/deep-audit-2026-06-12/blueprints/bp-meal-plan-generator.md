# Blueprint — Meal-Plan Generator ("Your Plate")

**Deep Audit 2026-06-12 · Integration blueprint**
*Read `_SHARED-BRIEF.md`, `_FOUNDER-CONTEXT-2026-06-12.md`, the founder requirement
docs `_REQ-meal-plan-personalisation.md` and `_REQ-coach-mealplan-integration.md`, and
`external/ext-03-massmarket-nutrition-apps.md` (§2.1 "the beginner's actual problem is
not knowing what to eat") before acting on anything here.*

Theme G in `_SYNTHESIS-AND-ROADMAP.md`: *"What to eat" meal guidance + rule-based
food-quality score* — this blueprint is the meal-guidance half, sized up from a Home-tab
nudge to the founder's co-equal dual-market generator.

> **ROUND-2 RECONCILED (2026-06-12).** This blueprint now incorporates the round-2
> research (`bp-meal-plan-research-round2.md`, all 8 edit-list items) and the
> systems-research data model (`bp-meal-plan-coach-systems-research.md`, REC-1..10).
> What changed: (1) **TD/NTD day variants are first-class** — protein constant, carbs
> the lever, fat convention a setting defaulting to equalised (§1.1, §3.2, §3.3);
> (2) **pre/post-workout slots** on training days, intra-workout optional edge-case
> only, low-fat/low-fibre preference on the final pre-workout meal, no BCAA/EAA/
> glutamine defaults (§3.3); (3) **swap tolerance pinned** to ±2–5 g on the role
> macro, exact-gram computation, mandatory `unit` + `raw/cooked` flag, labelled plan
> weights (§1.3, §3.2, §3.4); (4) the **six-type per-food constraint model** as a
> flagged differentiator feeding the food-quality score (§3.2); (5) explicit
> **dual-market presentation spec** with the water target (30–35 ml/kg) and
> phase/week progression on the plan object (§3.2, §3.8); (6) **supplement line
> items** in slots, linked to `bp-supplement-guidance.md` (§3.2, §3.8); (7) a
> **day-balance pass** in the assembler, default 4–6 meals, and the named **3-3-3
> rotation** as the variety model (§3.3); (8) an **honest-evidence methodology
> section** including the explicit ban on the fabricated "3.1%" carb-cycling stat
> (§3.9). The canonical swap-equivalence tables are embedded in §3.2.

---

## 0. The one-paragraph thesis

Volyume already has every hard part of a macro meal-plan generator: a deterministic
macro engine that produces a floor-protected day target (`nutritionEngine.js`), a curated
clean-bodybuilding meal library where macros are computed from a staple-food table and
filtered by diet (`curatedMeals.js` + `curatedFoods.js`), a protein-first macro-fit
ranker with portion scaling (`mealSuggest.js`), one-tap logging of any meal/food into the
diary (`food/db.js`), and a coach that already computes weekly macro deltas
(`weeklyCoach.js`, `getPlanNutritionContext`). What is **missing** is the *assembler* that
sums several meals into a whole-day plan that hits the target within tolerance, the
**TD/NTD day variants** driven by the training schedule and the existing carb-cycle
engine, the **macro-preserving swap** that rescales grams when you substitute one
food/meal for another, a **richer exclusion/preference model**, an **anti-repetition**
term for weekly variety, the **inverse plan-edit** the coach uses to narrate macro
changes at the gram of rice, **supplement line items** in meal slots, and the
**dual-market presentation**. All of it is pure, deterministic, offline,
unit-testable, and built by reusing the machinery above. No AI, ever.

This is exactly what the best macro meal-plan products do — Eat This Much ("set calories,
macros and dietary filters; the algorithm builds a full day/week", regenerate any single
meal, favourite/block foods) and Strongr Fastr ("once a meal is swapped in, portion sizes
automatically adjust to better meet your nutrition goals") — minus their ML/AI layer,
which Volyume neither needs nor is allowed.

---

## PART 1 — How top coaches and the best apps do it (research)

### 1.1 How online physique / prep coaches actually write meal plans

The human-coach workflow is strikingly mechanical, which is *why it can be made
deterministic*:

- **Targets first, food second.** The coach sets calories + protein/carb/fat from body
  data and goal phase, then builds the day's food *around* those numbers — not the other
  way round. (Ripped Body, RP, 3DMJ all describe this order.) Volyume's
  `calculateNutritionTargets` already produces exactly this object.
- **The "6–8 go-to meals" pattern.** The single most consistent finding across coaching
  practice: *"most clients build 6–8 go-to meals that hit their macros and rotate through
  them"* (TrueCoach, Ripped Body). Clients do **not** eat 21 unique meals a week — they
  rotate a small, trusted set. This is the core insight for the assembler: a plan is a
  small rotation of macro-fitting meals, not infinite novelty. It also resolves the
  beginner-vs-elite tension — Eddie *wants* repeatable prep; Besa wants "tell me what to
  eat." Both are served by a rotation with a tunable variety dial. Stronger U
  formalises this as the **"3-3-3" method** (3 protein sources, 3 carb sources, 3 fat
  sources, rotated) — adopted here as the named variety model (§3.3).
- **Protein is protected; carbs/fats flex.** When a coach needs to cut calories they pull
  carbs (and some fat) and hold protein. Volyume's engine already encodes this (fat at a
  hormonal floor, carbs fill the remainder, protein floored). The plan-edit engine
  (Part 1 of `_REQ-coach-mealplan-integration.md`) must follow the same priority.
- **TD/NTD carb cycling is universal coaching practice — with honest evidence.** Every
  elite physique plan (RP, prep coaches, the founder's real coach) carries separate
  TRAINING DAY / NON-TRAINING DAY variants: protein held constant across day types;
  carbs are the lever (rest days ~300–600 kcal lower, all from carbs); fat either
  equalised (modern RP 3.0, for meal-prep simplicity) or raised slightly on rest days
  (the older convention — the founder's coach: NTD carbs 1412→1008 kcal, fat
  792→1026 kcal). The evidence verdict is thin and must be stated honestly (§3.9):
  **no RCT** shows day-to-day TD/NTD cycling beats isocaloric flat intake; the real
  benefits are adherence and possible lean-mass preservation (Campbell 2020 refeed
  RCT), not extra fat loss. The widely quoted "3.1% greater fat loss" figure is
  untraceable to any primary source — treat as fabricated, never repeat it. Carbon
  notably does *not* automate TD/NTD (manual only), so an automatic, schedule-aware
  version is itself a differentiator.
- **Meal timing around training (RP).** RP Diet Coach is "widely associated with
  meal-by-meal macro targets, food suggestions, dieting phases", and uniquely splits
  pre/post-workout macros around the session. Volyume already has `preworkout`/
  `postworkout` curated slots and logs training sessions — the data exists to do this
  deterministically (cross-references TI-10 in ext-03). Round-2 evidence check: the
  "anabolic window" is **hours wide, not 30–60 minutes** for a fed trainee (Aragon &
  Schoenfeld 2013; ISSN 2017), so pre/post slots are useful structure, not magic;
  intra-workout nutrition earns a place only for fasted or >75–90 min sessions; BCAAs
  alone cannot drive MPS (Wolfe 2017). The one pre-workout rule coaches do follow:
  keep **fat and fibre low within ~60 min of training** (they slow gastric emptying
  and cause GI distress).
- **Weekly average, not daily perfection (RP, Carbon).** RP focuses on *"weekly average
  macros so clients can eat lighter on some days and bigger on others"*. The plan should
  present a daily target but be judged against a weekly average — this is also the
  adherence-neutral posture (ext-03 §2.2): a day over target is neutral information.
- **"If the approach causes more stress than enjoyment, change the approach" (3DMJ,
  Jeff Alberts).** The plan must be low-friction and swappable, never a rigid cage —
  directly informs the Besa presentation.

### 1.2 The automatic generators — concrete mechanics worth copying

| App | What it does that we should copy | Source |
|---|---|---|
| **Eat This Much** | Set calories + macros + dietary filters → builds a full **day (free) / week (Premium)**. **Regenerate a single meal** without redoing the plan. **Favourite** a food → appears more often; **block/exclude** foods; adjust prep difficulty + nutritional density. Per-meal breakdown of macros + fibre + micros. | eatthismuch.com; blog.eatthismuch.com tutorial-3 |
| **Strongr Fastr** | Fill macro goals → "generate plan" from a recipe DB that fits the goals. **Swap a meal and portions auto-adjust to better meet the goals**; manual portion override always available. Diet axes: keto/paleo/vegetarian. | strongrfastr.com/macro-meal-planner; /help/meal_plan_tutorial |
| **Prospre** | **"Fit Into Plan"** — adjust the plan to fit in a treat while still hitting macros. **Swap-out** to use up what's on hand and stay in macros. | prospre.io |
| **MealPrepPro / Lillie Eats** | Swap individual meals for suggested alternatives; adjust serving sizes; move meals between days. Meal-prep repeatability is a *feature*, not a bug. | apps.apple.com listings; app.lillieeatsandtells.com |
| **MacroFactor** (the anti-pattern, deliberately) | **Does NOT give meal plans** — pure adaptive tracking, "you decide what to eat". This is precisely the gap for Besa: *"users who want to reduce decision fatigue may prefer RP… MacroFactor assumes users accept the responsibility of deciding what to eat."* Volyume can have MacroFactor-grade adaptive coaching **and** the meal plan MacroFactor refuses to build. | macrofactor.com; intakenutrition.io MF-vs-RP |
| **Yazio** (ext-03 §1.12) | Meal planning from calorie targets is *the* beginner draw: *"it tells me what to eat, I don't have to think."* | trygaya.com/review/yazio-review |

### 1.3 How food swaps that preserve macros actually work

The universal mechanic (Strongr Fastr, Prospre, Eat This Much regenerate): pick a
substitute that plays the **same macro role** (the carb in the meal, the protein in the
meal), then **rescale its grams so the meal's macros are held**. Strongr Fastr states it
plainly: *"once a meal is swapped in, the portion sizes will automatically adjust to
better meet your nutrition goals."* This is a pure arithmetic operation — Volyume's
`suggestFood` already does the half of it that solves grams from a macro target
(`grams = remaining.protein / p100 * 100`). The swap is: identify the role, find a
role-matching substitute (diet/exclusion-filtered), solve grams to hold that role's macro,
re-total the meal.

Round 2 pinned the calibration (verified against USDA on the founder-coach's own
pairs): coaches calibrate swaps by **the dominant macro of the food's role, not
calories** — the role macro is held within **±2–5 g at the meal level** and calories
are allowed to follow (rice 125 g cooked → pasta 50 g dry holds carbs within ~2 g
while calories drift ~14%; accepted as a correct carb-source swap). Volyume can be
*more* precise than a human coach: compute the **exact gram** (46–47 g pasta to hold
35 g carbs) instead of a hand-rounded 50 g. The classic trap is **dry vs cooked**
(50 g dry pasta ≈ 112–125 g cooked with identical carbs — a common app error): every
food carries a mandatory `unit` and a `raw/cooked/dry` state flag, and every weight
shown on a plan is labelled with it.

### 1.4 What users praise vs complain about

- **Praise:** "it tells me what to eat" (decision fatigue gone); auto portion-adjust on
  swap; per-meal macro transparency; favourite/block foods; meal-prep repeatability.
- **Complain:** *repetition* if variety isn't controllable; *weird combinations* from
  pure-macro optimisation (cottage cheese + 200 g jam to hit carbs) — avoided here by
  using a **hand-curated meal library** rather than free-combining raw foods; rigidity
  (RP's historical complaint — answered by one-tap swap); plans that ignore real
  exclusions/allergies. The curated-library approach is Volyume's structural advantage:
  every meal is already a sensible bodybuilding plate, so the assembler never produces a
  macro-correct but inedible combination.

---

## PART 2 — What exists in Volyume vs the gap

### 2.1 Reusable, already built and tested

| Asset | File | What it gives the generator |
|---|---|---|
| Day macro target (floor-protected) | `src/lib/nutritionEngine.js` → `calculateNutritionTargets` | `{ targetKcal, proteinG, carbsG, fatG, kcalMin, kcalMax, perMealProteinG, mealFrequency, warnings }`. **`kcalMin`/`kcalMax` are ±10% — a ready-made tolerance band.** Already enforces the 1,200/1,500 floor, the −1.5%/wk gate, FFM context. |
| Curated meal library | `src/lib/food/curatedMeals.js` (~90 meals) + `curatedFoods.js` | Meals as `{id, name, diet, slots[], components[{food,g}]}`; macros **computed** from the staple table, never hand-typed. `getCuratedCandidates({diet, slot})` returns engine-shaped candidates, diet-filtered (vegan ⊂ veg ⊂ omni). `resolveComponent(foodKey, g)` solves grams→macros. |
| Macro-fit ranker + portion scaler | `src/lib/food/mealSuggest.js` | `rankSuggestions`, `fitScore` (protein-first, penalise kcal overshoot), `suggestFood` (solves grams from a macro gap, clamps 20–400 g, rounds to 5 g), `perMealMacros`, `slotMatches`. **This is the swap maths already.** |
| Swap pattern (exercise analogue) | `src/lib/swapEngine.js` | `rankSwaps` + `buildSwapReason` — the role-match-and-rank pattern + a plain-English "Why this?" string. The food swap is the same shape: rank role-matching substitutes, explain the pick. |
| One-tap logging | `src/lib/food/db.js` | `applyCuratedMealToDiary`, `applySavedMealToDiary`, `logFoodEntry`, `createSavedMeal`, `getRollupForDay`, `getRecentIntakeSummary` (the FFM 7-day input). |
| Diet preference + dislikes | `userProfile.dietPreference`; `food_favourites` table (`kind: 'fav'|'dislike'`), `cycleFoodPreference`, `getDislikes` | Diet axis and a dislikes channel both already persist + sync. |
| Coach macro delta | `src/lib/weeklyCoach.js`, `nutritionEngine.getPlanNutritionContext` / `computeAdaptiveTDEEAdjustment` | Produces the weekly kcal/macro change (floor-clamped) the coach must narrate at food level. |
| Pro gating | `src/lib/proGate.js` (`isPaidTier`), `store.tier === 'pro'` | All-or-nothing Pro; the whole Diary tab is already Pro. |

### 2.2 The gap (what this blueprint adds)

1. **Day/week plan assembler** — sum N curated meals into a day that hits `targetKcal`
   within `[kcalMin, kcalMax]` and holds protein, given meals/day, diet, exclusions,
   pinned meals, slot structure — assembled as **both TD and NTD variants** from the
   engine's two day-type targets, with a **day-balance pass** on protein distribution.
   Currently `rankSuggestions` ranks *one meal's share* but never **assembles a whole
   day** or de-conflicts across meals.
2. **Macro-preserving food swap with rescale** — swap a food inside a plan meal and solve
   grams to hold that meal's macros. The maths exists in `suggestFood`; the *role
   identification + meal re-total + tolerance check* is new.
3. **Meal-level swap** (`_REQ` R2) — swap a whole plan meal for another fitting the slot,
   macro share, diet + exclusions. Reuses the ranker; new is "swap within an assembled
   plan and keep the day on target".
4. **Richer preference/exclusion model** (`_REQ` R1, R4) — allergens/hard-excludes
   (foods *and* ingredient tags), cuisine, prep effort, budget tier, pinned favourites,
   meals/day, variety-vs-repeat dial. Today there is only `dietPreference` + `dislike`.
5. **Anti-repetition / variety** (`_REQ` R3) — a seedable scoring term so a week rotates
   rather than repeating, deterministic and reproducible/testable.
6. **Inverse plan-edit engine** (`_REQ-coach-mealplan-integration.md`) — given a coach
   macro delta, choose plan items + gram changes that realise it within tolerance,
   protein-protected, floor-clamped, and emit a structured "what changed" object for the
   coach voice.
7. **Presentation + IA placement** — the dual-market UI and where it lives.

---

## PART 3 — The blueprint

### 3.1 New pure modules (all `src/lib/food/`, no I/O, no AI, unit-tested)

```
src/lib/food/
  mealPlanAssembler.js    assembleDayPlan(), assembleWeekPlan()  — the day/week builder
  mealSwap.js             swapFoodInMeal(), swapMealInPlan(), findRoleAlternatives()
  foodRoles.js            classifyRole(food) → 'protein'|'carb'|'fat'|'veg'|'free'
  planPreferences.js      filterByPreferences(), the preference/exclusion model + helpers
  planEdit.js             applyMacroDeltaToPlan()  — the inverse (coach integration)
  planExplain.js          buildPlanReason(), buildPlanEditNarration()  — coach-voice strings
```

The role taxonomy is the canonical coaching one — **PRO / CHO / FAT / VEG / FREE**
(the founder-coach spreadsheet and every elite template use exactly this; FREE =
condiments under ~15 kcal/serving, excluded from macro accounting; VEG = unlimited or
a large fixed portion). Dual-role foods (whole eggs, nuts) take the role of their
dominant macro contribution *at the portion used*. `curatedFoods.js` entries carry an
**explicit `role` field** where the intended plan use is fixed; `classifyRole` derives
from macro ratios only as the fallback for untagged foods.

Screen/DB glue (not pure) lives in a thin `src/lib/food/mealPlanService.js` + new screens;
plan persistence reuses the existing pattern (a `meal_plans` row holding the assembled
plan JSON, mirroring `saved_meals.items_json`). The assembled plan, once accepted, logs
via the **existing** `applyCuratedMealToDiary` / `logFoodEntry` path — no new logging code.

### 3.2 Data shapes

```js
// The plan targets come straight from the engine — DO NOT recompute. The engine's
// carb-cycle/refeed logic + trainingToday already produce SEPARATE training-day and
// non-training-day targets: protein constant across day types, carbs the lever
// (rest days ~300–600 kcal lower, all from carbs), fat per prefs.fatConvention.
target = {
  targetKcal, proteinG, carbsG, fatG,   // from calculateNutritionTargets
  kcalMin, kcalMax,                      // ±10% tolerance band, already produced
  perMealProteinG, mealFrequency,        // protein-per-meal + meals/day default
}

// The richer preference profile (new; persisted on userProfile + a prefs table).
prefs = {
  diet: 'omnivore'|'vegetarian'|'vegan',     // exists
  excludeFoodKeys: ['halloumi', ...],        // hard excludes (allergen/dislike) — never shown
  excludeTags: ['nuts','dairy','gluten',...],// allergen-tag excludes — the UK FSA-14
                                             // vocabulary (celery, gluten cereals,
                                             // crustaceans, eggs, fish, lupin, milk,
                                             // molluscs, mustard, tree nuts, peanuts,
                                             // sesame, soya, sulphites); hard filter
  pinned: [{ slot: 'breakfast', mealId }],   // "always keep my oats" (R4)
  mealsPerDay: 4,                            // exists; default 4, range 4–6 (physique norm)
  rotationPool: {                            // the named "3-3-3" model (Stronger U):
    protein: ['chicken_breast', ...],        // 3–6 preferred foods per role; assembler
    carb: [...], fat: [...],                 // draws from this sub-pool when populated,
  } | null,                                  // full library otherwise. Eddie sets it
                                             // explicitly; Besa's auto-populates from
                                             // her most-logged foods after 2–4 weeks.
  periWorkoutSlots: false,                   // opt-in pre/post slots on training days
  fatConvention: 'equalised',                // TD/NTD fat handling — a SETTING:
                                             // 'equalised' (default, prep-simple) or
                                             // 'restDayHigher' (older satiety convention)
  cuisines: ['british','indian',...]|null,   // weight, not hard filter (R4)
  prepEffort: 'quick'|'cook'|null,           // weight (R4)
  budgetTier: 'low'|'mid'|null,              // weight (R4)
  variety: 0..1,                             // 0 = repeat (meal-prep), 1 = max variety (R3)
}

// An assembled plan. ONE object for both personas — the Besa and Eddie views (§3.8)
// are two skins over this data, never two plans.
plan = {
  id, weekStart, target: { training, nonTraining },
  variants: {                                // TD/NTD are FIRST-CLASS, not computed ad hoc
    training:    { slots: [...], totals },   // assembled against the training-day target
    nonTraining: { slots: [...], totals },   // assembled against the rest-day target
  },                                         // the variant shown on a given day follows
                                             // the training schedule, deterministically
  waterTargetMl,                             // ON the plan object: 30–35 ml/kg/day,
                                             // + ~500–1000 ml per training hour on TDs
  phase, weekNumber,                         // week/phase progression (Eddie skin)
  lastEditType: 'initial'|'macro_adjustment'|'rotation',  // coach edit vs variety refresh
  withinTolerance: bool, residual: { kcal, protein, carbs, fat }, seed,
}

// A slot inside a variant.
slot = {
  slot: 'meal_1'..'meal_N'|'pre_workout'|'intra_workout'|'post_workout',
  meal: <curated-or-saved candidate>, locked,
  supplements: [                             // optional line items inside the slot
    { key: 'whey_protein', grams: 35, macroCounted: true },   // counts in slot+day totals
    { key: 'creatine_monohydrate', grams: 5, macroCounted: false }, // zero-macro tag
  ],
}

// A food item inside a meal — `unit` and `state` are MANDATORY (the dry/cooked trap:
// 50 g dry pasta ≈ 112–125 g cooked, identical carbs). Every plan weight is labelled.
foodItem = {
  foodKey, grams,
  unit: 'g'|'item', state: 'raw'|'cooked'|'dry',
  role: 'protein'|'carb'|'fat'|'veg'|'free',
  notes: 'Any cereal with less than 4g of fat per 100g',  // optional coaching cue
  constraint: { maxFatPer100g: 4 },          // optional machine-readable constraint
}
```

**Supplement line items (structure only).** Coaches place supplements as named line
items *inside* the relevant meal slot — creatine 5 g in the post-workout meal, whey
counted into the meal's macros, multivitamin/omega-3 with a meal. Protein powder is
**macro-counted**; genuinely zero-macro items (creatine, vitamins) carry the
`macroCounted: false` tag. Each line item deep-links to the evidence page in
`bp-supplement-guidance.md`. The default plan includes **evidence-backed basics
only** (creatine optional) — never the glutamine/BCAA the founder's old coach sheet
carried, and **never any PED line item, ever**.

**The six-type per-food constraint model — a flagged differentiator.** Coaches apply
a real, if informal, per-food constraint taxonomy (the founder-coach's "any cereal
less than 4g fat per 100g" note is type 1) and **no existing app encodes these as
per-food numeric filters**. Foods and swaps may carry structured, optional
constraints:

| # | Constraint field | Direction | Typical threshold |
|---|---|---|---|
| 1 | `maxFatPer100g` (on a CHO source) | max | 3–5 g (above → treat as combo food; RP's "5 g incidental" rule) |
| 2 | `minProteinPer100g` (on a PRO source) | min | 18–20 g cooked (≥22 for prep staples) |
| 3 | `minFibrePer100g` (on a CHO source) | min | 2 g (whole-food bias) |
| 4 | `maxAddedSugarPer100g` (staples) | max | ~0 (fruit allowed, limited) |
| 5 | sodium preference (selection weight) | max | plain/unseasoned preferred |
| 6 | `maxKcalPerG` (volume foods) | max | ~1.5 kcal/g |

These power swap filtering ("any cereal under 4 g fat/100 g" becomes machine-checkable,
e.g. against a barcode scan) and feed the separately-scoped **rule-based food-quality
score** (Theme G, ext-03) built on bundled Open Food Facts NOVA/Nutri-Score data —
Nutri-Score/FSA-Ofcom thresholds are the reference scoring model.

**Canonical swap-equivalence tables (embed as `swapOptions` seed data).** The
exchange atom per role — full per-food tables with UK portions live in
`bp-meal-plan-coach-systems-research.md` §3.2 and are the canonical source; encode
them, do not re-derive:

| Role | Exchange atom | Example calibrated portions (UK) |
|---|---|---|
| PRO | ~30 g protein | chicken breast 120–125 g cooked; cod 130–140 g; tuna (brine) 115–120 g; Skyr 200 g; egg whites 240–250 g; tofu (firm) 200–220 g |
| CHO | ~40 g carbs | white rice 55 g dry / 165 g cooked; oats 55 g dry; pasta 55 g dry / 135 g cooked; sweet potato 170–180 g raw; couscous 55 g dry |
| FAT | ~10–12 g fat | cashews 20 g; almonds 18 g; peanut butter 15 g; olive oil 11–12 g (1 tbsp); avocado 65 g; dark chocolate ≥85% 20–21 g |
| VEG | free / large fixed portion | broccoli, spinach, green beans, peppers — unlimited or 150–300 g fixed; swaps within VEG unconstrained |
| FREE | excluded from macro accounting | condiments under ~15 kcal/serving: mustard, vinegar, hot sauce, herbs, spices, spray oil |

Pre-curated `swapOptions: [{foodKey, grams, note}]` on `curatedFoods` entries carry
hand-validated pairings (the coach-sheet "OPTIONAL SWITCHES" pattern: rice 125 g
cooked → pasta 50 g dry; cashews 20 g → dark chocolate 85% 21 g; wrap 1 item → bagel
thin 1 item; light mayo 25 g → peanut butter 12 g). They take precedence over the
algorithmic `findRoleAlternatives` fallback (§3.4), which handles everything untagged.

### 3.3 The assembler algorithm (deterministic, pure)

The assembler runs **once per day variant**: the training-day and non-training-day
variants are assembled independently, each against its own engine-produced target
(§3.2) — protein constant across day types, carbs the lever, fat per
`prefs.fatConvention` (default equalised). The variant a user sees on a given day
follows the training schedule + the existing carb-cycle/refeed engine,
deterministically. (Carbon makes users do this by hand; automating it is a
differentiator.)

`assembleDayPlan({ target, prefs, library, savedMeals, seed })`:

1. **Filter the candidate pool** through `planPreferences.filterByPreferences` — diet
   (`dietAllows`), then drop any meal containing an `excludeFoodKey` or an `excludeTag`.
   (Reuses `getCuratedCandidates`; adds the exclusion pass.) Saved meals + recipes join
   the pool so the user's own food appears.
2. **Resolve slot structure.** `mealsPerDay` numbered slots (the diary's model;
   default 4, range **4–6** — the physique norm: RP runs 6 TD / 5 NTD, beginners 3–4).
   On training days with `prefs.periWorkoutSlots` on, add **pre-workout and
   post-workout slots** around the logged/scheduled session (RP-style timing,
   deterministic). **Intra-workout is an optional, edge-case slot only** — offered
   when a session is fasted or runs >75–90 min, modelled as supplement-only, and it
   **never defaults to BCAA/EAA/glutamine** (the founder's old sheet did; the
   evidence does not support it, §3.9). The **final pre-workout meal carries a
   low-fat/low-fibre preference** (a candidate-ranking weight: fat and fibre slow
   gastric emptying within ~60 min of training). **Pinned meals are placed first**
   and their macros subtracted from the target — the assembler only fills the
   *remaining* slots and *remaining* macros.
3. **Greedy protein-first fill with residual feedback** (mirrors `perMealMacros` +
   `fitScore`, the proven approach):
   - Compute `remaining = target − (pinned + already-placed)`; `perMeal = remaining / slotsLeft`.
   - The candidate pool is the user's `rotationPool` sub-pool when populated (the
     3-3-3 model), the full filtered library otherwise.
   - For the next slot, rank slot-matching candidates by `fitScore(perMeal, mealMacros)`
     **plus** the new scoring terms (anti-repetition, cuisine/prep/budget weights, the
     pre-workout low-fat/low-fibre weight — all additive, all deterministic).
     Tie-break by id for reproducibility (the `swapEngine` pattern). The `seed`
     perturbs ranking deterministically so "regenerate" gives a
     different-but-reproducible plan (Eat This Much "regenerate", but seedable/testable).
   - Place the top candidate; subtract its macros; recompute residual; repeat.
4. **Day-balance pass.** After the greedy fill, re-check protein *distribution*:
   protein should be spread at roughly **0.4 g/kg per meal across 4+ meals** (the
   per-meal MPS threshold behind the 1.6–2.2 g/kg/day total), not front-loaded into
   the early slots — the failure mode of any naive greedy fill. If one slot sits
   materially below the per-meal band while another is heavy, shift grams of the
   protein staple between the two via the grams-solver (zero net change to the day
   total). Pure, deterministic, unit-tested.
5. **Tolerance close-out.** After all slots are filled and balanced, the day total
   will be *near* the target but rarely exact (curated meals are fixed-portion).
   Apply a **single macro-preserving rescale on the most flexible slot's carb/fat
   staple** (via the `mealSwap` grams-solver) to pull `kcal` inside
   `[kcalMin, kcalMax]` and protein within a small band — **without touching
   protein-dominant foods** (protein protected). If still outside tolerance (rare,
   e.g. very low target + high meals/day), return `withinTolerance: false` with the
   residual so the UI can say "Close. Tap to fine-tune." rather than silently lying.
   **Never** rescale below a per-food sane floor.
6. **Return** the variant with `withinTolerance`, `residual`, and the `seed`.

`assembleWeekPlan` assembles **both day variants** (training + non-training, each
against its own engine target), maps the week's days to variants from the training
schedule, and uses a per-day seed plus a shared **recently-used set** so the
anti-repetition term (Step 3) rotates meals across the week. The named variety model
is Stronger U's **"3-3-3" rotation** (3 proteins, 3 carbs, 3 fats, rotated):
`variety = 0` fixes the pool and repeats (repeatable meal-prep — what Eddie often
wants); `variety = 1` pulls from the full pool and maximises the penalty.
Deterministic given `(target, prefs, seed)`. A user-initiated "new meals please"
re-run is a **rotation refresh** (new seed, same targets,
`lastEditType: 'rotation'`, UI copy "Your plan has been updated with new meals.
Macros unchanged.") — distinct from the coach's **macro adjustment** (§3.5), which
is the only operation narrated in the coach voice.

### 3.4 Macro-preserving swaps (`mealSwap.js`)

**Food-level swap** `swapFoodInMeal(meal, foodKeyOut, prefs)`:
1. Take the food's explicit `role` (PRO/CHO/FAT/VEG/FREE on `curatedFoods`), falling
   back to `classifyRole(foodOut)` via `foodRoles.js` from the staple's macro profile
   (e.g. >50% kcal from protein → 'protein'). Pure lookup over `CURATED_FOODS`.
2. Offer the food's pre-curated `swapOptions` first (hand-validated pairings, §3.2 —
   the coach-sheet "optional switch" pattern), then `findRoleAlternatives` — staples
   of the **same role**, diet-allowed, exclusion-filtered, honouring any per-food
   `constraint` (e.g. `maxFatPer100g` on a CHO swap), ranked by closeness of macro
   profile (the `swapEngine.rankSwaps` shape) so the swap is sensible
   (rice→potato/pasta/couscous, not rice→olive oil).
3. **Solve grams to hold the role's dominant macro within ±2–5 g (configurable;
   tight default)** — calories follow, as coaches calibrate (a ~14% kcal drift on a
   correct carb match is accepted). Compute the **exact gram** (46–47 g pasta to hold
   35 g carbs, not a hand-rounded 50 g) via `suggestFood`'s solver, clamp to
   **role-appropriate gram ranges** rather than a generic band (lean PRO 60–300 g;
   soft/dairy PRO 100–400 g; dry CHO 20–120 g; starchy veg 80–400 g raw; nuts/nut
   butter 10–50 g; oil 5–30 g; VEG 50–500 g), round to 5 g, and label the result
   with its `unit` + `state` so dry/cooked is never ambiguous on the plan.
4. Re-total the meal (`mealTotals`); if the meal drifts outside its share, nudge a
   secondary staple. Return the new meal + a `buildSwapReason`-style "Why this?" line
   that teaches the mechanic at the gram level — Besa: "This holds your carbs. You'll
   barely notice the difference." Eddie: "→ 180 g sweet potato holds 40 g carbs. Fat
   unchanged." Same structured reason object, two renderings.

**Meal-level swap** `swapMealInPlan(plan, slot, prefs)` (`_REQ` R2): re-rank the
slot-matching pool against *that slot's share of the day's residual*, exclude the current
meal + recently-used, return the best alternative; the day stays on target because the
share is computed from the live residual. One tap. This is literally `rankSuggestions`
scoped to one slot of an assembled plan.

### 3.5 The inverse — coach pulls food from the plan (`planEdit.js`)

This is the founder's differentiator (`_REQ-coach-mealplan-integration.md`), designed in,
not bolted on. `applyMacroDeltaToPlan({ plan, delta, target, prefs })` where `delta` is the
engine's floor-clamped weekly change (e.g. `{ kcal: −150, carbs: −38 }`):

1. **Protein is protected** — `delta` to protein is ignored/clamped to zero unless the
   engine explicitly raised protein.
2. **Adjust carbs/fats first, least-disruptive food, sane grams.** Find the plan's
   carb-dominant staples (via `foodRoles`), pick the one whose reduction is least
   disruptive (largest portion / a slot tagged flexible; on training days prefer the
   non-peri-workout meals so pre/post carbs stay intact — the coach convention), and
   **reduce its grams** to realise the carb delta (the same grams-solver, run in
   reverse — remove macros). Spread across ≤2 foods if one would breach its sane
   floor; if the carb reduction alone would still breach every CHO staple's floor,
   split the remainder into fat at the documented **2.25 g carbs : 1 g fat** calorie
   equivalence (Macros Inc convention) — never into protein.
3. **Floor-clamp.** The post-edit plan total is checked against the engine's
   `[kcalMin, kcalMax]` AND the day target must not fall below the calorie/FFM floor —
   because `delta` itself is already floor-clamped by `computeAdaptiveTDEEAdjustment`
   (`floorHeld`), this is belt-and-braces: if the edit *would* take the plan below the
   floor, clamp the edit and set `floorHeld: true`.
4. **Apply** to the plan (logging now scores against the new plan), set
   `lastEditType: 'macro_adjustment'` (the coaching event — distinct from a rotation
   refresh, §3.3), and **emit a structured change object**:
   `{ removed: [{food, gramsBefore, gramsAfter, slot}], macroDelta, floorHeld }`.
5. `planExplain.buildPlanEditNarration` renders it in the five-part coach voice at the
   gram of rice: *"Your target dropped 150 kcal this week. I've taken 50 g of carbs off
   your plan. That's 65 g less white rice at dinner. Open your meal plan to see it."*
   (User-facing coach copy: plain sentences, no em dashes.) If `floorHeld`, the coach
   says so instead (never silently below the floor). If the user is **not** on a plan,
   the coach narrates as today (macro-level only) — this food-level line is the
   on-a-plan path.

### 3.6 ED-SAFETY — the plan routes THROUGH the floors, never around

This is non-negotiable and is satisfied by **construction**, not by a bolt-on check:

1. **The plan's day target is the engine's output, full stop.** The assembler consumes
   `calculateNutritionTargets`' `{ targetKcal, kcalMin, kcalMax, proteinG, ... }` and
   **never recomputes calories or sets its own target.** The 1,200 kcal (women) /
   1,500 kcal (men) floor and the −1.5%/wk hard gate are already applied *inside*
   `calculateNutritionTargets` (lines ~787–817) before the number ever reaches the
   assembler. There is no code path where the plan can target a sub-floor day. This
   holds **per day variant**: both the training-day and the non-training-day targets
   are engine outputs — the NTD carb reduction comes from the engine's
   carb-cycle/refeed logic, never computed by the generator — so a rest-day variant
   can no more dip below the floor than a training day. TD/NTD routes *through* the
   floors, never around them.
2. **Exclusions can never starve the plan.** If a user's diet/exclusions shrink the pool
   so far that the assembler cannot reach the target (e.g. vegan + nut-allergy + tiny
   target), it returns `withinTolerance: false` with the residual — it **never** drops the
   day below the floor to "make it fit", and the UI says "We can't quite hit this with
   your current preferences. Relax one, or we'll plan slightly under." (informational,
   neutral, ED-safe copy, no em dashes). The plan is never silently sub-floor.
3. **The coach plan-edit is double-clamped (§3.5 step 3).** The incoming `delta` is already
   floor-clamped by `computeAdaptiveTDEEAdjustment` (`floorHeld`/`rapidLossOverride` — it
   refuses to suggest a cut when 7-day intake ≤ the FFM floor, and clamps cuts under the
   rapid-loss override). `applyMacroDeltaToPlan` re-checks against `[kcalMin, kcalMax]` and
   the floor so a food-level reduction can never realise a cut the engine itself would have
   refused.
4. **ED-pattern suppression is upstream and untouched.** `edPatternDetector.js` and the
   FFM floor in `nutritionEngine.js` are read-only inputs here; the generator adds no new
   way to lose weight faster and modifies none of their thresholds (−1.5%/wk, FFM
   30 kcal/kg, 1,200/1,500 floors, Beat UK signposting all unchanged). The generator is a
   *presentation of the engine's already-safe target*, so it inherits every guardrail.
5. **Supplement line items never distort the macro accounting.** Protein powder is
   macro-counted into slot and day totals; only genuinely zero-macro items (creatine,
   vitamins) carry the `macroCounted: false` tag (§3.2). A supplement can never make
   a sub-floor day look on-target, and no supplement line item is ever a PED.
6. **Adherence-neutral by design** (ext-03 §2.2): a plan day over/under target is neutral
   information, no red, no "you failed", no shame — which also keeps logs honest and the
   TDEE engine well-fed.

**Net:** the generator cannot lower a floor or accelerate loss because it never owns the
calorie number — it only arranges food beneath a number the safety system already set.

### 3.7 Free / Pro gating

- **Today:** all nutrition is Pro; the entire Diary tab is Pro-gated (`store.tier === 'pro'`,
  `proGate.isPaidTier`). The meal-plan generator is a nutrition feature → **Pro**, full
  generator, swaps, week plans, coach plan-edit. No change to gating mechanics.
- **PROPOSAL (founder sign-off — funnel lever, flagged not applied):** a **read-only
  "Today's plate" teaser** could sit in the *free* funnel — e.g. the onboarding-quiz
  result screen or the locked Diary preview shows *one* example day plan ("here's what a
  day at your target looks like") with the swap/log actions locked behind Pro. Rationale:
  ext-03 finds "it tells me what to eat" is the strongest beginner draw and Yazio's plan
  feature is its top beginner acquisition lever; RevenueCat 2026 shows soft paywalls
  (feature visible, action locked) aid discovery and a paywall at a *success moment*
  converts +30%. This teaser is the success moment. It exposes **no** loggable Pro
  function — it is a static preview — so it does not breach "never expose a Pro feature to
  free". **This is a deliberate re-draw of the line for sign-off, not an accidental leak.**
  Default if unsigned: keep the whole generator Pro.

### 3.8 Dual-market presentation & placement

**ONE plan object, two skins** (the `_REQ` R4 mandate, the ext-03 §1.4 / TI-03
progressive-disclosure principle). The output object (§3.2) is identical for both
personas — the **Besa skin** and the **Eddie skin** are renderings, never separate
data; only the chrome and default verbosity differ. The coach-grade conventions that
separate an elite plan from a generic app (round 2, item 5): name + goal + phase +
week number; numbered/timed meals incl. pre/post slots; TD/NTD variants; the water
target *on the plan*; supplements inline in meals; explicit totals (grams per macro
AND kcal) per meal and per day; week-by-week macro progression.

**Besa skin (decisions made for her — calm):**
- Entry: a **"Plan my day" / "Your plate"** card at the top of the Diary when nothing is
  logged, and on the Home tab (the §2.1 answer to "I don't know what to eat"). One tap →
  a clean day: 3–4 plates, each a photo-free card with name + a single calm line
  ("Chicken, rice and broccoli. Hits your lunch."). Calories shown as the friendly
  primary; macros collapsed behind "Show macros" (TI-02/TI-03 budget framing). No
  dense tables, no jargon — a single daily total and a gentle hydration line from
  `waterTargetMl`.
- Actions: **"Log all"** (one tap, fans the whole day into the diary via
  `applyCuratedMealToDiary` in a loop), **"Swap"** on any plate ("Don't fancy this?"
  with one calm alternative, plan stays on target), **"Flag this food"** (adds to
  excludes, never shown again, R1). Identity-framing copy (TI-07): "Here's your day,
  sorted."
- Variety dial hidden; sensible default. She never sees the words "tolerance" or
  "TD/NTD" — her plan quietly follows the training schedule, and day-type framing
  arrives later as progressive disclosure.

**Eddie skin (precision + control — prep-friendly):**
- Entry: a **"Meal plan"** screen reachable from the Nutrition/Diary area; he opens it
  deliberately. Full data density: **per-meal grams-per-macro + kcal**, an explicit
  **day totals row** vs target with the ±10% band shown, residual, the **TD/NTD
  toggle** (both variants of the one plan object, switched or side by side), the
  **water target on the plan** (30–35 ml/kg, plus the training-hour uplift on TDs),
  **week/phase progression** (week number + the macro progression across the phase),
  peri-workout slots split around his logged session (RP-style), **supplement line
  items** in their slots (e.g. "Creatine 5 g" in the post-workout meal, tapping
  through to the `bp-supplement-guidance.md` evidence page), the variety dial / 3-3-3
  rotation pool (set to **repeat** for meal-prep), pinned meals ("keep my oats"),
  week view for prep, micro overview tie-in (TI-11). Every lever exposed.
- Macro-preserving swaps surface the grams ("→ 220 g potato holds 60 g carbs"), every
  weight labelled raw/cooked/dry; he trusts it because the maths is visible. Week
  assembler with `variety = 0` gives the repeatable prep block elite competitors
  actually run.
- The coach plan-edit (§3.5) is *his* killer feature: the engine moves his macros and the
  plan + the gram-level narration update in lock-step — uncopyable, prep-accurate.

**IA placement:** lives in the **Nutrition/Diary tab** (where targets, logging and the
food DB already are — a plan is meaningless without the diary). Entry points: (1) Diary
empty-state card; (2) Home-tab nudge; (3) a "Meal plan" item in the Nutrition area for
Eddie; (4) deep-link target from the coach output ("See your meal plan", §3.5). **Ties to
logging:** the plan is built from the same curated meals the diary already logs, so
"Log all" / "Log this plate" is the existing one-tap path — zero new logging surface.

### 3.9 Methodology page — honest evidence, stated plainly

Every nutrition claim the plan surfaces (carb cycling, nutrient timing, supplements)
is **evidence-graded and honest** on the methodology page. This honesty *is* the
transparent-coach trust moat — it extends "every change has a reason" to "every
convention has an evidence grade":

- **Carb cycling (TD/NTD):** the user-facing line is "Carb cycling helps adherence
  and may protect muscle in a deficit. It is not a magic fat-loss lever." Honest
  basis: no RCT shows day-to-day TD/NTD beats isocaloric flat intake in trained
  physique athletes; refeed evidence (Campbell 2020) supports lean-mass
  preservation (with a disputed re-analysis); diet-break trials in lean athletes
  (ICECAP, Khalil 2023) show no lasting advantage. Energy balance, total protein and
  training volume are the primary drivers; carb timing is second-order.
  **Hard rule: never repeat the fabricated "3.1% greater fat loss" carb-cycling
  stat** — it is untraceable to any primary source and must never appear in app
  copy, methodology pages, marketing, or the coach voice.
- **Nutrient timing:** the post-workout "anabolic window" is hours wide, not
  30–60 minutes, for a fed trainee (Aragon & Schoenfeld 2013; ISSN 2017). Pre/post
  slots are structure and convenience worth a few percent at the margin, not the
  driver. Explaining *why* the window is wide is another honesty/trust win.
- **Supplements:** evidence-backed basics only (creatine; protein powder as a
  convenient way to hit protein) — graded on the linked `bp-supplement-guidance.md`
  pages. BCAAs alone cannot drive muscle protein synthesis (Wolfe 2017); no
  BCAA/EAA/glutamine defaults; intra-workout supplementation is an edge case
  (fasted or >75–90 min sessions). Never any PED, ever.

All methodology copy: British English, plain sentences, no em dashes, neutral and
non-prescriptive in tone (consistent with the ED-safe voice in §3.6).

---

## PART 4 — Effort, risks, dependencies, build order

### 4.1 Effort estimate

Overall **L** (the founder's "elite + simplified" bar). Pure logic is modest because the
machinery exists; the spend is presentation + the two personas + the coach integration.

| Piece | Effort | Note |
|---|---|---|
| `foodRoles.js` + `planPreferences.js` (model + filters) | **S** | Pure; small. Adds explicit `role`, FSA-14 allergen `tags`, `unit`/`state`, `swapOptions` and optional `constraint`s to `curatedFoods`; `rotationPool` + `fatConvention` to prefs. |
| `mealPlanAssembler.js` (day + week, TD/NTD variants, anti-repetition, day-balance pass, tolerance close-out) | **M** | Reuses `fitScore`/`perMealMacros`/`suggestFood`; the new part is residual-feedback assembly + seedable variety + the per-variant targets + protein-distribution balancing. |
| `mealSwap.js` (food + meal swap, rescale) | **S–M** | Grams-solver exists; role-match within ±2–5 g, role-appropriate clamps + re-total is new. |
| `planEdit.js` + `planExplain.js` (coach integration) | **M** | The differentiator; inverse of the assembler, five-part voice, floor double-clamp. |
| Supplement line items (slot field, zero-macro tag, deep link) | **S** | Structure only; links to `bp-supplement-guidance.md`; evidence-backed basics, never PEDs. |
| Persistence (`meal_plans` table, service glue) | **S** | Mirrors `saved_meals` JSON pattern; sync table like profiles/meals. |
| Besa presentation (Diary card, Log all, swap, flag) | **M** | Calm UI, progressive disclosure. |
| Eddie presentation (full plan screen, TD/NTD toggle, water target, week/phase, levers) | **M** | Data-dense; reuses MacroRings + breakdown components. |
| Coach-output food-level line + deep link | **S** | Adds a line + nav to the existing held-decisions card. |
| Methodology page copy (§3.9) | **S** | Evidence-graded claims; ships with the first user-visible plan surface, not after. |
| Tests (pure modules + invariants) | **M** | Floor-routing invariant tests are mandatory (see risks); both TD and NTD variants covered. |

### 4.2 Risks

- **R1 — Inedible macro-correct plans.** Mitigated by construction: assemble from the
  hand-curated meal library, never free-combine raw foods. Keep the library curated.
- **R2 — Floor bypass (the only one that matters).** Mitigated by §3.6: assembler never
  owns the calorie number; plan-edit double-clamps. **Add an engine-invariant test**
  (alongside `engine-invariants.test.js`) asserting *no assembled plan and no plan-edit
  result ever targets below the sex floor or below the FFM floor*, for adversarial inputs.
- **R3 — Tolerance failure on constrained diets.** Handled, not hidden:
  `withinTolerance: false` + neutral copy; never sub-floor to "fit".
- **R4 — Over-repetition or jarring variety.** The `variety` dial + seedable
  anti-repetition; both deterministic and unit-tested for reproducibility.
- **R5 — Scope creep into AI.** None permitted. Eat This Much / Strongr Fastr lean on ML;
  Volyume must not. The curated library + deterministic ranker is the substitute and is a
  *credibility* advantage (no "cashews identified as shrimp" Lifesum-style regressions).
- **R6 — Plan/diary drift.** The plan and the log are separate; if the user logs off-plan,
  the plan is guidance, judged on the weekly average (RP posture), shown adherence-neutral.

### 4.3 Dependencies

- No new packages. All pure JS reusing existing modules. (If a package were ever
  considered, it would be surfaced for sign-off per CLAUDE.md — none is.)
- `curatedFoods.js` gains per staple: optional `tags` (FSA-14 allergens, cuisine,
  budget), an explicit `role` (PRO/CHO/FAT/VEG/FREE), a mandatory `unit` + `state`
  (raw/cooked/dry), optional pre-curated `swapOptions` and optional `constraint`
  fields — all additive, non-breaking.
- One new local table `meal_plans` (JSON, mirrors `saved_meals`) + a sync table — follows
  the locked DB pattern; not a production DB command.
- Reads `calculateNutritionTargets`, `getRecentIntakeSummary` (FFM input),
  `computeAdaptiveTDEEAdjustment` (coach delta) — all existing, unchanged.

### 4.4 Build order

1. **`foodRoles.js` + `planPreferences.js` + `curatedFoods` enrichment** — the model
   and filters: explicit roles, FSA-14 allergen tags, `unit`/`state` flags, the
   swap-equivalence `swapOptions` seed data (§3.2 tables), per-food constraints,
   `rotationPool` + `fatConvention` prefs; pure, fully tested first.
2. **`mealPlanAssembler.js` (day)** — greedy protein-first fill + day-balance pass +
   tolerance close-out, assembled **per TD/NTD variant** from the engine's two
   targets (peri-workout slots included); add the floor-routing invariant test
   immediately, covering both variants.
3. **`mealSwap.js`** — food + meal swap with rescale within the ±2–5 g role-macro
   band (proves the swap UX).
4. **Besa presentation** — Diary "Plan my day" card, Log all, swap, flag, plus the
   §3.9 methodology copy (it ships with the first user-visible plan surface). Ship
   the beginner win first (activation/retention lever).
5. **`assembleWeekPlan` + variety dial (3-3-3 rotation) + Eddie plan screen** — the
   elite/prep surface: TD/NTD toggle, water target, week/phase progression,
   supplement line items.
6. **`planEdit.js` + `planExplain.js` + coach-output integration** — the differentiator,
   last because it depends on a stable plan model.

British English throughout (colour, optimise, practise, licence) in all copy, comments,
and commit messages.

---

## Appendix — Sources

- RP Diet Coach — rpstrength.com/pages/diet-coach-app; help.rpstrength.com (v1.52)
- Carbon Diet Coach — joincarbon.com; feastgood.com/carbon-diet-coach-review
- Eat This Much — eatthismuch.com; blog.eatthismuch.com (smarter-meals; tutorial-3 favourite/block)
- Strongr Fastr — strongrfastr.com/macro-meal-planner; /help/meal_plan_tutorial
- Prospre — prospre.io ("Fit Into Plan", swap-out)
- MealPrepPro / Lillie Eats — apps.apple.com listings; app.lillieeatsandtells.com
- MacroFactor (no-meal-plan stance) — macrofactor.com; intakenutrition.io/blog/side-by-side-macrofactor-vs-rp-diet-comparison
- 3DMJ meal-plan method — 3dmusclejourney.com; 3DMJ Podcast #239 "How To Build Your Meal Plan"; rippedbody.com/coaching
- Coach meal-plan workflow / "6–8 go-to meals" — truecoach.co/blog/how-to-create-a-meal-plan-for-clients-in-under-5-minutes
- Yazio meal-plan beginner draw — trygaya.com/review/yazio-review
- Round-2 research synthesis — `bp-meal-plan-research-round2.md` (TD/NTD evidence verdict,
  peri-workout structure, swap calibration, six-type constraint taxonomy, presentation
  conventions, supplement line items, reconciliation edit-list)
- Coach systems & data-model research — `bp-meal-plan-coach-systems-research.md`
  (canonical data model, swap-equivalence tables §3.2, PRO/CHO/FAT/VEG/FREE taxonomy,
  3-3-3 rotation, FSA-14 allergens, REC-1..10)
- Founder's real-coach spreadsheet — `inputs/coach-spreadsheet-extract.md` (TD/NTD totals,
  optional-switch pairs, per-food notes/constraints; validation reference, not gospel)
- Evidence base (§3.9): Aragon & Schoenfeld 2013 (JISSN); ISSN position stand 2017;
  Campbell 2020 refeed RCT (+ disputed re-analysis); MATADOR; ICECAP; Khalil 2023;
  Wolfe 2017 (BCAAs)
- Stronger U 3-3-3 method — university.strongeru.com/home/3-3-3-method; Macros Inc
  swapping macros (2.25:1 carb-to-fat equivalence) — macrosinc.net/nutriwiki/swapping-macros
- Volyume internal: `external/ext-03-massmarket-nutrition-apps.md` (§2.1, TI-02/03/04/07/10/11);
  `_REQ-meal-plan-personalisation.md`; `_REQ-coach-mealplan-integration.md`;
  `src/lib/nutritionEngine.js`, `src/lib/food/mealSuggest.js`,
  `src/lib/food/curatedMeals.js`, `src/lib/food/curatedFoods.js`,
  `src/lib/swapEngine.js`, `src/lib/edPatternDetector.js`, `src/lib/food/db.js`,
  `src/lib/proGate.js`.

*Blueprint completed 2026-06-12; round-2 research reconciled into it 2026-06-12 (all 8
edit-list items from `bp-meal-plan-research-round2.md` applied in place). Assigned
slice: meal-plan generator integration blueprint.*
