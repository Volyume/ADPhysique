# Blueprint — Meal-Plan Generator ("Your Plate")

**Deep Audit 2026-06-12 · Integration blueprint**
*Read `_SHARED-BRIEF.md`, `_FOUNDER-CONTEXT-2026-06-12.md`, the founder requirement
docs `_REQ-meal-plan-personalisation.md` and `_REQ-coach-mealplan-integration.md`, and
`external/ext-03-massmarket-nutrition-apps.md` (§2.1 "the beginner's actual problem is
not knowing what to eat") before acting on anything here.*

Theme G in `_SYNTHESIS-AND-ROADMAP.md`: *"What to eat" meal guidance + rule-based
food-quality score* — this blueprint is the meal-guidance half, sized up from a Home-tab
nudge to the founder's co-equal dual-market generator.

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
**macro-preserving swap** that rescales grams when you substitute one food/meal for
another, a **richer exclusion/preference model**, an **anti-repetition** term for weekly
variety, the **inverse plan-edit** the coach uses to narrate macro changes at the gram of
rice, and the **dual-market presentation**. All of it is pure, deterministic, offline,
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
  eat." Both are served by a rotation with a tunable variety dial.
- **Protein is protected; carbs/fats flex.** When a coach needs to cut calories they pull
  carbs (and some fat) and hold protein. Volyume's engine already encodes this (fat at a
  hormonal floor, carbs fill the remainder, protein floored). The plan-edit engine
  (Part 1 of `_REQ-coach-mealplan-integration.md`) must follow the same priority.
- **Meal timing around training (RP).** RP Diet Coach is "widely associated with
  meal-by-meal macro targets, food suggestions, dieting phases", and uniquely splits
  pre/post-workout macros around the session. Volyume already has `preworkout`/
  `postworkout` curated slots and logs training sessions — the data exists to do this
  deterministically (cross-references TI-10 in ext-03).
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
   pinned meals, slot structure. Currently `rankSuggestions` ranks *one meal's share* but
   never **assembles a whole day** or de-conflicts across meals.
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
  foodRoles.js            classifyRole(food) → 'protein'|'carb'|'fat'|'veg'|'mixed'
  planPreferences.js      filterByPreferences(), the preference/exclusion model + helpers
  planEdit.js             applyMacroDeltaToPlan()  — the inverse (coach integration)
  planExplain.js          buildPlanReason(), buildPlanEditNarration()  — coach-voice strings
```

Screen/DB glue (not pure) lives in a thin `src/lib/food/mealPlanService.js` + new screens;
plan persistence reuses the existing pattern (a `meal_plans` row holding the assembled
plan JSON, mirroring `saved_meals.items_json`). The assembled plan, once accepted, logs
via the **existing** `applyCuratedMealToDiary` / `logFoodEntry` path — no new logging code.

### 3.2 Data shapes

```js
// The plan target comes straight from the engine — DO NOT recompute.
target = {
  targetKcal, proteinG, carbsG, fatG,   // from calculateNutritionTargets
  kcalMin, kcalMax,                      // ±10% tolerance band, already produced
  perMealProteinG, mealFrequency,        // protein-per-meal + meals/day default
}

// The richer preference profile (new; persisted on userProfile + a prefs table).
prefs = {
  diet: 'omnivore'|'vegetarian'|'vegan',     // exists
  excludeFoodKeys: ['halloumi', ...],        // hard excludes (allergen/dislike) — never shown
  excludeTags: ['nuts','shellfish','dairy'], // ingredient-tag excludes (new tag on curatedFoods)
  pinned: [{ slot: 'breakfast', mealId }],   // "always keep my oats" (R4)
  mealsPerDay: 4,                            // exists (@volyume_meals_per_day)
  cuisines: ['british','indian',...]|null,   // weight, not hard filter (R4)
  prepEffort: 'quick'|'cook'|null,           // weight (R4)
  budgetTier: 'low'|'mid'|null,              // weight (R4)
  variety: 0..1,                             // 0 = repeat (meal-prep), 1 = max variety (R3)
}

// An assembled plan.
plan = {
  id, date|weekStart, target,
  days: [ { date, slots: [ { slot, meal: <curated-or-saved candidate>, locked } ], totals } ],
  withinTolerance: bool, residual: { kcal, protein, carbs, fat }, seed,
}
```

### 3.3 The assembler algorithm (deterministic, pure)

`assembleDayPlan({ target, prefs, library, savedMeals, seed })`:

1. **Filter the candidate pool** through `planPreferences.filterByPreferences` — diet
   (`dietAllows`), then drop any meal containing an `excludeFoodKey` or an `excludeTag`.
   (Reuses `getCuratedCandidates`; adds the exclusion pass.) Saved meals + recipes join
   the pool so the user's own food appears.
2. **Resolve slot structure.** `mealsPerDay` numbered slots (the diary's model), plus
   peri-workout slots if a session is logged today (RP-style timing, deterministic).
   **Pinned meals are placed first** and their macros subtracted from the target — the
   assembler only fills the *remaining* slots and *remaining* macros.
3. **Greedy protein-first fill with residual feedback** (mirrors `perMealMacros` +
   `fitScore`, the proven approach):
   - Compute `remaining = target − (pinned + already-placed)`; `perMeal = remaining / slotsLeft`.
   - For the next slot, rank slot-matching candidates by `fitScore(perMeal, mealMacros)`
     **plus** the new scoring terms (anti-repetition, cuisine/prep/budget weights — all
     additive, all deterministic). Tie-break by id for reproducibility (the `swapEngine`
     pattern). The `seed` perturbs ranking deterministically so "regenerate" gives a
     different-but-reproducible plan (Eat This Much "regenerate", but seedable/testable).
   - Place the top candidate; subtract its macros; recompute residual; repeat.
4. **Tolerance close-out.** After all slots are filled, the day total will be *near* the
   target but rarely exact (curated meals are fixed-portion). Apply a **single
   macro-preserving rescale on the most flexible slot's carb/fat staple** (via the
   `mealSwap` grams-solver) to pull `kcal` inside `[kcalMin, kcalMax]` and protein within a
   small band — **without touching protein-dominant foods** (protein protected). If still
   outside tolerance (rare, e.g. very low target + high meals/day), return
   `withinTolerance: false` with the residual so the UI can say "close — tap to fine-tune"
   rather than silently lying. **Never** rescale below a per-food sane floor.
5. **Return** the plan with `withinTolerance`, `residual`, and the `seed`.

`assembleWeekPlan` calls `assembleDayPlan` 7× with a per-day seed and a shared
**recently-used set** so the anti-repetition term (Step 3) rotates meals across the week;
`variety = 0` disables it (repeatable meal-prep — what Eddie often wants); `variety = 1`
maximises the penalty. Deterministic given `(target, prefs, seed)`.

### 3.4 Macro-preserving swaps (`mealSwap.js`)

**Food-level swap** `swapFoodInMeal(meal, foodKeyOut, prefs)`:
1. `classifyRole(foodOut)` via `foodRoles.js` — protein / carb / fat / veg, from the
   staple's macro profile (e.g. >50% kcal from protein → 'protein'). Pure lookup over
   `CURATED_FOODS`.
2. `findRoleAlternatives` — staples of the **same role**, diet-allowed,
   exclusion-filtered, ranked by closeness of macro profile (the `swapEngine.rankSwaps`
   shape) so the swap is sensible (rice→potato/pasta/couscous, not rice→olive oil).
3. **Solve grams to hold the role's dominant macro** (reuse `suggestFood`'s solver):
   carb swap holds the meal's carbs, protein swap holds protein, clamp to a sane gram
   range, round to 5 g.
4. Re-total the meal (`mealTotals`); if the meal drifts outside its share, nudge a
   secondary staple. Return the new meal + a `buildSwapReason`-style "Why this?" line.

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
   disruptive (largest portion / a slot tagged flexible), and **reduce its grams** to
   realise the carb delta (the same grams-solver, run in reverse — remove macros). Spread
   across ≤2 foods if one would breach its sane floor.
3. **Floor-clamp.** The post-edit plan total is checked against the engine's
   `[kcalMin, kcalMax]` AND the day target must not fall below the calorie/FFM floor —
   because `delta` itself is already floor-clamped by `computeAdaptiveTDEEAdjustment`
   (`floorHeld`), this is belt-and-braces: if the edit *would* take the plan below the
   floor, clamp the edit and set `floorHeld: true`.
4. **Apply** to the plan (logging now scores against the new plan) and **emit a structured
   change object**: `{ removed: [{food, gramsBefore, gramsAfter, slot}], macroDelta,
   floorHeld }`.
5. `planExplain.buildPlanEditNarration` renders it in the five-part coach voice at the
   gram of rice: *"Your target dropped 150 kcal this week. I've taken 50 g of carbs off
   your plan — that's 65 g less white rice at dinner. Open your meal plan to see it."*
   If `floorHeld`, the coach says so instead (never silently below the floor). If the user
   is **not** on a plan, the coach narrates as today (macro-level only) — this food-level
   line is the on-a-plan path.

### 3.6 ED-SAFETY — the plan routes THROUGH the floors, never around

This is non-negotiable and is satisfied by **construction**, not by a bolt-on check:

1. **The plan's day target is the engine's output, full stop.** The assembler consumes
   `calculateNutritionTargets`' `{ targetKcal, kcalMin, kcalMax, proteinG, ... }` and
   **never recomputes calories or sets its own target.** The 1,200 kcal (women) /
   1,500 kcal (men) floor and the −1.5%/wk hard gate are already applied *inside*
   `calculateNutritionTargets` (lines ~787–817) before the number ever reaches the
   assembler. There is no code path where the plan can target a sub-floor day.
2. **Exclusions can never starve the plan.** If a user's diet/exclusions shrink the pool
   so far that the assembler cannot reach the target (e.g. vegan + nut-allergy + tiny
   target), it returns `withinTolerance: false` with the residual — it **never** drops the
   day below the floor to "make it fit", and the UI says "we can't quite hit this with your
   current preferences — relax one, or we'll plan slightly under" (informational, neutral,
   ED-safe copy). The plan is never silently sub-floor.
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
5. **Adherence-neutral by design** (ext-03 §2.2): a plan day over/under target is neutral
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

**Same generator, progressive disclosure** (the `_REQ` R4 mandate, the ext-03 §1.4 /
TI-03 progressive-disclosure principle). The output object is identical for both personas;
only the chrome and default verbosity differ.

**Besa (decisions made for her — calm):**
- Entry: a **"Plan my day" / "Your plate"** card at the top of the Diary when nothing is
  logged, and on the Home tab (the §2.1 answer to "I don't know what to eat"). One tap →
  a clean day: 3–4 plates, each a photo-free card with name + a single calm line
  ("Chicken, rice & broccoli — hits your lunch"). Calories shown as the friendly primary;
  macros collapsed behind "Show macros" (TI-02/TI-03 budget framing). No dense tables.
- Actions: **"Log all"** (one tap, fans the whole day into the diary via
  `applyCuratedMealToDiary` in a loop), **"Swap"** on any plate ("Don't fancy this? →" one
  alternative, plan stays on target), **"Flag this food"** (adds to excludes, never shown
  again, R1). Identity-framing copy (TI-07): "Here's your day — sorted."
- Variety dial hidden; sensible default. She never sees the word "tolerance".

**Eddie (precision + control — prep-friendly):**
- Entry: a **"Meal plan"** screen reachable from the Nutrition/Diary area; he opens it
  deliberately. Full data density: per-meal macro breakdown, day totals vs target with the
  ±10% band shown, residual, the variety dial (set to **repeat** for meal-prep), pinned
  meals ("keep my oats"), peri-workout slots split around his logged session (RP-style),
  week view for prep, micro overview tie-in (TI-11). Every lever exposed.
- Macro-preserving swaps surface the grams ("→ 220 g potato holds 60 g carbs"); he trusts
  it because the maths is visible. Week assembler with `variety = 0` gives the repeatable
  prep block elite competitors actually run.
- The coach plan-edit (§3.5) is *his* killer feature: the engine moves his macros and the
  plan + the gram-level narration update in lock-step — uncopyable, prep-accurate.

**IA placement:** lives in the **Nutrition/Diary tab** (where targets, logging and the
food DB already are — a plan is meaningless without the diary). Entry points: (1) Diary
empty-state card; (2) Home-tab nudge; (3) a "Meal plan" item in the Nutrition area for
Eddie; (4) deep-link target from the coach output ("See your meal plan", §3.5). **Ties to
logging:** the plan is built from the same curated meals the diary already logs, so
"Log all" / "Log this plate" is the existing one-tap path — zero new logging surface.

---

## PART 4 — Effort, risks, dependencies, build order

### 4.1 Effort estimate

Overall **L** (the founder's "elite + simplified" bar). Pure logic is modest because the
machinery exists; the spend is presentation + the two personas + the coach integration.

| Piece | Effort | Note |
|---|---|---|
| `foodRoles.js` + `planPreferences.js` (model + filters) | **S** | Pure; small. Adds ingredient `tags` to `curatedFoods` for allergen excludes. |
| `mealPlanAssembler.js` (day + week, anti-repetition, tolerance close-out) | **M** | Reuses `fitScore`/`perMealMacros`/`suggestFood`; the new part is residual-feedback assembly + seedable variety. |
| `mealSwap.js` (food + meal swap, rescale) | **S–M** | Grams-solver exists; role-match + re-total is new. |
| `planEdit.js` + `planExplain.js` (coach integration) | **M** | The differentiator; inverse of the assembler, five-part voice, floor double-clamp. |
| Persistence (`meal_plans` table, service glue) | **S** | Mirrors `saved_meals` JSON pattern; sync table like profiles/meals. |
| Besa presentation (Diary card, Log all, swap, flag) | **M** | Calm UI, progressive disclosure. |
| Eddie presentation (full plan screen, week view, levers) | **M** | Data-dense; reuses MacroRings + breakdown components. |
| Coach-output food-level line + deep link | **S** | Adds a line + nav to the existing held-decisions card. |
| Tests (pure modules + invariants) | **M** | Floor-routing invariant tests are mandatory (see risks). |

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
- `curatedFoods.js` gains optional `tags` per staple (allergen/cuisine/budget metadata) —
  additive, non-breaking.
- One new local table `meal_plans` (JSON, mirrors `saved_meals`) + a sync table — follows
  the locked DB pattern; not a production DB command.
- Reads `calculateNutritionTargets`, `getRecentIntakeSummary` (FFM input),
  `computeAdaptiveTDEEAdjustment` (coach delta) — all existing, unchanged.

### 4.4 Build order

1. **`foodRoles.js` + `planPreferences.js` + `curatedFoods` tags** — the model and
   filters; pure, fully tested first.
2. **`mealPlanAssembler.js` (day)** — greedy protein-first fill + tolerance close-out;
   add the floor-routing invariant test immediately.
3. **`mealSwap.js`** — food + meal swap with rescale (proves the swap UX).
4. **Besa presentation** — Diary "Plan my day" card, Log all, swap, flag. Ship the
   beginner win first (activation/retention lever).
5. **`assembleWeekPlan` + variety dial + Eddie plan screen** — the elite/prep surface.
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
- Volyume internal: `external/ext-03-massmarket-nutrition-apps.md` (§2.1, TI-02/03/04/07/10/11);
  `_REQ-meal-plan-personalisation.md`; `_REQ-coach-mealplan-integration.md`;
  `src/lib/nutritionEngine.js`, `src/lib/food/mealSuggest.js`,
  `src/lib/food/curatedMeals.js`, `src/lib/food/curatedFoods.js`,
  `src/lib/swapEngine.js`, `src/lib/edPatternDetector.js`, `src/lib/food/db.js`,
  `src/lib/proGate.js`.

*Blueprint completed 2026-06-12. Assigned slice: meal-plan generator integration blueprint.*
