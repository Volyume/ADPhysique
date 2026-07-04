# Meal-builder content-quality audit — are the meals balanced, realistic plans a coach would give?

**Scope.** Content quality of the meals the deterministic assembler produces
(`src/lib/food/mealPlanAssembler.js` + `gramSolve.js` + `mealSwap.js`, over the
curated library in `curatedMeals.js`/`curatedFoods.js`). READ-ONLY audit — no
src edited. All examples below are VERBATIM output of the real
`assembleDayPlanBestOf` / `assembleWeekPlan`, generated with a throwaway harness
that imports the shipping modules (harness + raw output kept in scratchpad).

Method: four realistic target profiles (1600 kcal higher-protein cut, 2200 kcal
maintenance, 2800 kcal lean bulk, and a REAL engine target for a near-floor
female), plus omnivore and vegan weeks for variety. 8–15 seeds per profile for
the portion/distribution scans.

---

## 1. Real generated examples (verbatim)

### 1600 kcal cut, higher-protein (male), 4 meals — seed 1
```
TARGET  1600 kcal  P160 C140 F45
[meal_1] Egg-white scramble, spinach & sourdough  403kcal P40.2 C24 F16.5  (P40/C24/F37)
   Egg whites 130g · Whole eggs 172g · Spinach 41g · White sourdough 42g
[meal_2] Steak & potatoes                          493kcal P57.7 C39.2 F11.2 (P47/C32/F21)
   Lean steak 153g · Potato (boiled) 214g · Mixed salad 92g
[meal_3] King prawn stir-fry & rice               528kcal P33.5 C62.1 F16.1  (P25/C47/F27)
   Prawns 128g · White rice 186g · Stir-fry veg 134g · Olive oil 14g
[meal_4] Jacket potato & tuna                       177kcal P28.7 C14.8 F1.3  (P62/C32/F6)
   Potato 80g · Tuna 106g · Mixed salad 40g
DAY TOTAL 1601kcal P160.1 C140.1 F45.1  — withinTolerance=true
PROTEIN PER MEAL: [40, 58, 34, 29] g
```

### 2200 kcal maintenance (male), 4 meals — seed 1
```
TARGET 2200 kcal  P165 C230 F65
[meal_1] Overnight oats                     556kcal P43.9 C57.7 F18.6
[meal_2] Chicken jacket potato & salad      565kcal P45.5 C56.1 F15.9
[meal_3] Turkey mince, potato & greens      555kcal P39.4 C55.9 F18.7
[meal_4] King prawn stir-fry & rice         505kcal P36.7 C61.8 F12.0
DAY TOTAL 2181kcal P165.5 C231.5 F65.2 — withinTolerance=true
PROTEIN PER MEAL: [44, 46, 39, 37] g   (min 37, max 46)   ← textbook even
```

### 2800 kcal lean bulk (male), 5 meals — seed 1
```
TARGET 2800 kcal  P200 C340 F70
[meal_1] Overnight oats                 502kcal P34.8 C57.7 F16.3
[meal_2] Spaghetti bolognese            639kcal P43.9 C90.0 F11.9
[meal_3] King prawn stir-fry & rice     494kcal P23.8 C67.9 F13.8  (P19/C55/F25)  ← lean meal
[meal_4] Chicken, potatoes & veg        629kcal P53.7 C61.8 F16.9
[meal_5] Beef mince, rice & greens      536kcal P44.0 C62.7 F11.1
DAY TOTAL 2800kcal P200.2 C340.1 F70.0 — withinTolerance=true
PROTEIN PER MEAL: [35, 44, 24, 54, 44] g
```

### Female near the calorie floor — REAL engine target (`calculateNutritionTargets`, aggressive_cut, 55 kg)
Engine returned: `targetKcal 1200 (floorApplied), P165 C43 F41`, warnings
including *"Target calories (1160 kcal) below safe minimum (1200 kcal). Raising
to floor."* and a low-energy-availability caution. Assembled day, 3 meals, seed 1:
```
[meal_1] Protein pancakes    228kcal P22.6 C26.5 F4.8
[meal_2] Steak & potatoes    665kcal P103.2 C14.8 F21.0   ← Lean steak 297 g in ONE meal
[meal_3] Cod bake            335kcal P36.6 C13.6 F14.2
DAY TOTAL 1228kcal P162.4 C54.9 F40.0 — withinTolerance=true
PROTEIN PER MEAL: [23, 103, 37] g   (one meal = 103 g protein)
```
Across seeds 1–8 this is stable, not a fluke: 6/8 seeds put **270–297 g of lean
steak (≈100 g protein) into a single meal**; per-meal protein was
`[23,103,37]`, `[23,49,94]`, `[47,57,60]`, etc.

---

## 2. Per-meal sensibility + protein-distribution check

**Verdict: sensible at normal calories; degrades to number-fitting at the
extremes (near the calorie floor / very high protein-per-calorie).**

- **Normal targets (1600–3300 kcal): genuinely balanced.** Every meal carries a
  real protein anchor, a starch and usually veg/fat. Protein per meal is even —
  2200 maintenance gave `[44,46,39,37]`, the ideal spread. No 80%-carb / no-protein
  meals appeared in any omnivore day across 60 generated days. Each meal
  independently clears the leucine/anabolic per-meal threshold (§5).
- **The number-fitting failure is real and reproducible at the floor.** The
  precision solver (`mealPlanAssembler.js` L563–630) minimises **day-level** summed
  %-deviation only; per-meal balance is a soft input to greedy *selection*
  (`perMealMacros`, L386) and is **discarded once the solver rescales staples**.
  So when the day target is hard to hit with whole foods it dumps the load onto
  one staple: **297 g steak = 103 g protein in one sitting** for the near-floor
  female. That is the classic *skewed* distribution the evidence says is
  inferior (§5), and it is not a realistic plate a coach would write.
- **Milder version at high volume:** the 2800 bulk swings `[35,44,24,54,44]` — the
  24 g prawn meal is fine but the 54 g vs 24 g gap shows the same day-total-only
  optimisation, not deliberate even spacing.

---

## 3. Realism / portion / combination findings

**Combinations: excellent.** Every plate is a real UK meal — steak & potatoes,
chicken jacket & salad, prawn stir-fry & rice, overnight oats, spag bol. No
bizarre macro-driven pairings. Weight states are handled (pasta/oats dry, rice/
potato cooked). Breakfast slot only ever takes real breakfasts. This is the
library's strength.

**Portions: two reproducible realism problems, both from the solver treating a
food as a macro sink:**

1. **Veg blown up to a 500 g clamp as a carb/calorie filler.** At 3300 kcal the
   solver repeatedly produced **500 g potato + 500 g green beans in ONE meal**
   ("Turkey mince, potato & greens"), hitting the veg clamp on ~every seed
   (`green_beans 500g`, `broccoli`, `sweet_potato 500g`). 500 g of green beans in
   a single meal is not a plate anyone eats — the solver is using low-density veg
   to add ~35 g carbs. Cause: `foodRoles.js` `ROLE_GRAM_RANGE.veg = [40, 500]`
   (L187) AND veg components are included in `solveStaples` (`mealPlanAssembler.js`
   L563–576), so veg is rescaled like a macro lever.
2. **Recurring 177–195 kcal "meal".** In the 1600 cut, **13 of 15 seeds** shrank
   the final meal ("Jacket potato & tuna") to ~177 kcal — a snack masquerading as
   meal_4. The greedy fill (non-backtracking) leaves too little budget for the
   last slot, and the solver can only shrink to the component floors. Smallest-meal
   kcal across seeds: `177,195,177,177,190,177,190,...`.
3. **Near-floor 297 g steak** (§1/§2) — the worst single portion, but
   floor-adjacent (see §7, HOLD-only).

Potato reaching 386–426 g in the 2200/2800 mains is a large-but-plausible jacket
and I do **not** flag it.

---

## 4. Variety findings across days/weeks

- **Omnivore week (2200, variety 1): good.** 20 distinct meals across 28 slots.
  Breakfasts repeat by design (Meal 1 variety penalty is intentionally discounted
  0.25×, L392 — matches real habit); dinners rotate widely. No meal repeats on
  consecutive days. This is coach-realistic.
- **Vegan week: thin.** Only **11 distinct meals across 28 slots**; "Vegan protein
  overnight oats", "Tofu stir-fry & rice" and "Seitan & noodles" each appear ~4×,
  and one day served *two* sweet-potato bowls (tofu + tempeh). This is a **library
  coverage gap**, not an assembler bug: the library has 18 vegan meals but only ~4
  vegan breakfasts, so rotation runs dry. (Content recommendation, not a code fix:
  add vegan breakfast/lunch variety.)

---

## 5. Web benchmark (cited)

- **Per-meal protein dose.** Schoenfeld & Aragon (2018, *JISSN* position review):
  target **0.4 g/kg/meal across ≥4 meals**, useful range up to **0.55 g/kg/meal**;
  ~20–25 g quality protein maximises the per-meal MPS response.
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5828430/>
- **Even vs skewed distribution.** Mamerow et al. (2014, *J Nutr*): protein spread
  evenly (~30 g/meal) produced **25 % higher 24-h muscle protein synthesis** than
  the same total skewed toward one meal (0.075 vs 0.056 %/h, P=0.003), sustained
  over 7 days. <https://pubmed.ncbi.nlm.nih.gov/24477298/>

**Benchmarked against the output.** Normal profiles PASS: 2200 maintenance
`[44,46,39,37]` g ≈ 0.5 g/kg/meal, evenly spaced — exactly the target pattern.
The **near-floor female FAILS the even-distribution guidance**: a 55 kg person's
useful per-meal ceiling is ≈0.55 g/kg = ~30 g, yet one meal delivers **103 g
(1.9 g/kg in one sitting)** while another gets 23 g — the skewed pattern shown to
be ~25 % less effective, and physically ~300 g of steak.

---

## 6. SAFE FIXES (clear realism bugs — food-selection / portion, no macro-targeting change)

These do NOT touch the per-meal macro-distribution algorithm and are safe to
apply behind the existing tolerance tests + a manual device check. Not applied
(read-only audit); proposed with exact locations.

**SF-1 — Stop the solver using veg as a carb/calorie sink (500 g green-bean
meals).** Veg is volume/micronutrient, never a macro the engine targets, so it
should not be a rescale variable.
`src/lib/food/mealPlanAssembler.js` ~L564–566, in the `solveStaples` build:
```js
// before
p.components.forEach((c, ci) => {
  const item = p.items[ci];
  if (!(item.kcal > 0) || c.g <= 0) return;
// after — exclude veg/free volume foods from the macro solver
p.components.forEach((c, ci) => {
  const item = p.items[ci];
  if (!(item.kcal > 0) || c.g <= 0) return;
  if (roleOf(c.food) === 'veg' || roleOf(c.food) === 'free') return; // volume, not a macro lever
```
(`roleOf` is already imported at L28.) Same guard belongs in the warm-start
`rescaleOne` (L471–482) which currently also rescales veg. Effect: green beans /
broccoli stay at their curated plate size; carbs land on rice/potato instead.

**SF-2 — Tighten the veg portion clamp regardless of SF-1.** Even for hand-built
meals a 500 g single-meal veg portion is beyond realistic.
`src/lib/food/foodRoles.js` L187:
```js
// before
veg: [40, 500],
// after
veg: [40, 300],
```

Both are additive, idempotent-safe (pure functions), and covered by the existing
`mealPlanAssembler.test.js` band/protein invariants — a regression would fail
those. Recommend a device-walk of a 3300 kcal plan to confirm days still land in
band.

---

## 7. ENGINE DECISIONS (HOLD for founder — do NOT change silently)

**ED-1 (HOLD; ED-safety-adjacent, HOLD-ONLY).** *Per-meal protein distribution is
not enforced after solving, producing skewed single-meal protein at the extremes
(103 g steak meal near the female calorie floor).* Fixing this means adding a
**per-meal even-distribution constraint** to the precision solver (L563–630) — a
change to the macro-TARGETING algorithm, exactly the class the brief says to
hold. Evidence: §1/§2 output + Mamerow/Schoenfeld (§5). Because the worst case
occurs on a **floored 1200 kcal female target**, this is ED-safety-adjacent and
must be **HOLD-only, never auto-fixed**: any change here interacts with how
tightly the day hits a floor-level target. Proposed change to *present*, not
apply: after the day-level solve, run a per-meal protein re-balance that caps any
single meal near ~0.55 g/kg (or the day mean × ~1.4) by shifting protein grams to
under-target meals, subject to the same gram clamps and the day total held. Needs
a founder decision + test plan.

**ED-2 (HOLD).** *Recurring 177 kcal trailing "meal" (1600 cut, 13/15 seeds).* A
minimum-meal-size / even-calorie-per-meal guard is a per-meal *sizing* policy, i.e.
a distribution-algorithm change, not a portion bug. Options to present: (a) a soft
minimum meal kcal (e.g. ≥ 0.6 × even share) enforced in the greedy fill/close-out;
(b) redistribute the trailing shortfall across earlier meals. HOLD — changes
assembler behaviour.

**ED-3 (note only, upstream).** The near-floor protein target itself (**P165 at a
1200 kcal floor = 3.0 g/kg, ~55 % of calories**) is set by `nutritionEngine.js`,
not the assembler, and is floor/ED-safety territory. Out of scope for this audit;
surfaced so the founder sees that ED-1's trigger originates in the engine's
floor-level macro split, and any review must treat the two together.

---

### Counts
- **Safe fixes: 2** (SF-1 solver veg-sink, SF-2 veg clamp) — plus 1 content
  recommendation (vegan library breadth).
- **Engine decisions / HOLD: 2** (ED-1 per-meal protein distribution — ED-safety
  adjacent, HOLD-only; ED-2 trailing tiny meal) + 1 upstream note (ED-3).
