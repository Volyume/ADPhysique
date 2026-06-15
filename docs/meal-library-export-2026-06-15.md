# Volyume — Curated meal & food library (export)

_Generated 2026-06-15 from `src/lib/food/` (curatedFoods.js, curatedMeals.js, foodRoles.js, mealSlots.js, mealPlanAssembler.js). Macros are COMPUTED by the app's own code, not hand-typed._

**Totals:** 159 curated meals · 76 staple foods · diets: omnivore, vegetarian, vegan.

## 1. Design principles (from the source)

- **Foods defined once, meals computed.** Each meal is `foods + grams` only; per-item and total macros are derived from the per-100g staple table (`curatedFoods.js`). 130+ meals stay internally consistent.
- **Protein-forward** (~25–40 g/meal, leucine threshold). Plant meals carry a ~20–30% protein uplift so vegan/vegetarian meals still clear the target.
- **Fat is a deliberate spread**: lean meals (≤~10 g) for around training / tight fat budgets; balanced meals carry the day's healthy fats. The engine surfaces leaner meals once the user has had their fat. No auto pre/post detection; macro targets are already goal-driven.
- **British supermarket staples only.** Label-grade / CoFID reference values.
- **Protein-quality policy** (plan policy, not a nutrition claim): `high` = animal anchors (the only class an omnivore plan anchors a meal on); `moderate` = plant isolates/tofu/tempeh/seitan/quorn/edamame (vegan/veg anchors); `carb_protein` = legumes/grain proteins (never a meal's protein anchor).
- **Weight-state** is explicit per food (`dry` / `cooked` / `ready`) so a gram figure is unambiguous.

## 2. Diet hierarchy

vegan ⊂ vegetarian ⊂ omnivore. A user diet admits meals at or below it (`dietAllows`): an **omnivore** sees all; a **vegetarian** sees vegetarian + vegan; a **vegan** sees vegan only.

## 3. Meal-slot model (`mealSlots.js`)

- The diary uses **numbered meals** — `meal_1 … meal_N` (default 4, range 3–6) — not the breakfast/lunch/dinner wellness frame, because physique athletes run 4–8 structured meals.
- Plus two **named peri-workout meals**: `preworkout`, `postworkout`, placed around training (only on training-day variants).
- **Legacy** keys (`breakfast`/`lunch`/`dinner`/`snack`) still resolve and any slot with logged entries is always shown.
- Curated meals are *tagged* with the legacy character slots (breakfast/lunch/dinner/snack/preworkout/postworkout); a **numbered** slot takes the whole diet-filtered library and lets the macro ranker pick.

## 4. How meals are ASSIGNED (`mealPlanAssembler.js` + `mealSuggest.js`)

Deterministic: same `(target, prefs, schedule, seed)` → same plan. Steps per day:

1. **Slot list** (`buildSlotList`): `meal_1..N`; on a training-day variant with peri-workout on, `pre_workout` + `post_workout` are spliced near the end.
2. **Slot character** (`slotCharacterFor`): `meal_1` → breakfast; the last meal → lunch/dinner; middle meals → lunch/dinner/snack; peri-workout slots → no character (any).
3. **Candidate pool**: the curated library filtered by diet (`dietAllows`) and preferences (`filterMealsByPreferences`: `excludeFoodKeys`, `excludeTags`), plus the user's saved meals.
4. **Per-slot greedy pick** (`pickBest`): each slot gets a macro *share* of the remaining day target (`perMealMacros`), and candidates are scored by `fitScore` (macro distance to that share) with adjustments:
   - **variety** penalty for recently-used meals (dial 0–1; `meal_1` penalty discounted to 0.25 — people repeat breakfast);
   - **rotation pool** affinity (+0.15) toward the user's chosen staples;
   - **peri-workout** shaping: pre-workout penalises fat, post-workout rewards protein;
   - small **seeded jitter** so "regenerate" reshuffles near-ties; ties break on meal id.
   Character is enforced first; if a diet/exclusion combo empties the character pool, it relaxes rather than leave a hole.
5. **Tolerance close-out** (macro-preserving rescale): carb staples first, then fat, then protein staples *only while protein is under-delivered*, each clamped to the food's `gramRangeOf` and rounded to 5 g, until the day lands inside the engine's `[kcalMin, kcalMax]` band. Saved meals are fixed blocks and never rescaled.
6. **Day-type cycling** (`dayVariantTargets`): protein constant on training/rest; carbs are the lever (≤300 kcal rest-day cut); fat per `fatConvention` (`equalised` default, or `higher_rest_day`). Stays inside the engine band, preserves the weekly total, and **disables itself entirely** when the engine floored the target (safety) or the user isn't an advanced cutter/competitor.
7. **Week** (`variety: 0` = meal-prep repeat of two assembled days; otherwise seeded variety across the 7-day training/rest spread).

**Safety by construction:** the assembler never computes a calorie target — it only moves calories *between* days inside the engine's published band with the weekly total preserved. Floors (sex, FFM, rapid-loss) are applied upstream.

Preference shape (`normalisePreferences`): `diet`, `excludeFoodKeys[]`, `excludeTags[]`, `mealsPerDay` (3–6), `periWorkoutSlots`, `variety` (0–1), `rotationPool {protein,carb,fat}`, `fatConvention` (`equalised`|`higher_rest_day`), `pinnedMealIds[]`.

## 5. Staple food table (per 100 g)

### Protein

| key | name | kcal | P | C | F | role | protein-class | weight-state | allergens | portion g (lo–hi) |
|---|---|--:|--:|--:|--:|---|---|---|---|---|
| `chicken_breast` | Chicken breast (cooked) | 165 | 31 | 0 | 3.6 | protein | high | ready | — | 50–350 |
| `turkey_breast` | Turkey breast (cooked) | 140 | 30 | 0 | 2 | protein | high | ready | — | 50–350 |
| `turkey_mince` | Turkey mince (5%) | 113 | 20 | 0 | 3.3 | protein | high | ready | — | 50–350 |
| `beef_mince_5` | Beef mince (5%) | 137 | 21 | 0 | 5 | protein | high | ready | — | 50–350 |
| `steak_lean` | Lean steak (cooked) | 200 | 34 | 0 | 7 | protein | high | ready | — | 50–350 |
| `cod` | Cod / white fish | 82 | 18 | 0 | 0.7 | protein | high | ready | fish | 50–350 |
| `salmon` | Salmon | 208 | 20 | 0 | 13 | protein | high | ready | fish | 50–350 |
| `smoked_salmon` | Smoked salmon | 146 | 25 | 0 | 4.5 | protein | high | ready | fish | 50–350 |
| `tuna_water` | Tuna (in water) | 116 | 26 | 0 | 1 | protein | high | ready | fish | 50–350 |
| `prawns` | Prawns | 85 | 20 | 0 | 0.5 | protein | high | ready | crustaceans | 50–350 |
| `eggs` | Whole eggs | 143 | 13 | 1 | 10 | protein | high | ready | eggs | 50–250 |
| `egg_whites` | Egg whites | 52 | 11 | 0.7 | 0.2 | protein | high | ready | eggs | 60–400 |
| `greek_yogurt_0` | Greek yogurt (0%) | 59 | 10 | 4 | 0 | protein | high | ready | milk | 50–350 |
| `greek_yogurt_2` | Greek yogurt (2%) | 73 | 10 | 4 | 3 | protein | high | ready | milk | 50–350 |
| `skyr` | Skyr | 63 | 11 | 4 | 0.2 | protein | high | ready | milk | 50–350 |
| `cottage_cheese` | Cottage cheese (low-fat) | 72 | 12 | 3 | 1 | protein | high | ready | milk | 50–350 |
| `whey` | Whey protein | 380 | 80 | 8 | 6 | protein | high | dry | milk | 15–60 |
| `tofu_firm` | Firm tofu | 144 | 17 | 3 | 8 | protein | moderate | ready | soya | 50–350 |
| `tempeh` | Tempeh | 192 | 20 | 8 | 11 | protein | moderate | ready | soya | 50–350 |
| `seitan` | Seitan | 150 | 25 | 4 | 1 | protein | moderate | ready | cereals_gluten | 50–350 |
| `tvp_dry` | Soya mince (dry) | 327 | 52 | 30 | 1 | protein | moderate | dry | soya | 50–350 |
| `quorn_mince` | Quorn mince | 95 | 14.5 | 5 | 2 | protein | moderate | ready | — | 50–350 |
| `edamame` | Edamame | 121 | 12 | 9 | 5 | protein | moderate | ready | soya | 50–350 |
| `soy_protein` | Soya protein | 360 | 80 | 5 | 3 | protein | moderate | dry | soya | 15–60 |
| `pea_protein` | Pea protein | 375 | 80 | 5 | 7 | protein | moderate | dry | — | 15–60 |
| `soy_yogurt_hp` | High-protein soya yogurt | 70 | 6 | 5 | 3 | protein | moderate | ready | soya | 50–350 |

### Carb

| key | name | kcal | P | C | F | role | protein-class | weight-state | allergens | portion g (lo–hi) |
|---|---|--:|--:|--:|--:|---|---|---|---|---|
| `oats` | Porridge oats | 379 | 13 | 67 | 7 | carb | — | dry | cereals_gluten | 15–400 |
| `white_rice` | White rice (cooked) | 130 | 2.7 | 28 | 0.3 | carb | — | cooked | — | 15–400 |
| `brown_rice` | Brown rice (cooked) | 110 | 2.6 | 23 | 0.9 | carb | — | cooked | — | 15–400 |
| `quinoa` | Quinoa (cooked) | 120 | 4.4 | 21 | 1.9 | carb | — | cooked | — | 15–400 |
| `wholemeal_bread` | Wholemeal bread | 247 | 13 | 41 | 3.4 | carb | — | ready | cereals_gluten | 15–400 |
| `bagel` | Bagel | 270 | 10 | 53 | 1.7 | carb | — | ready | cereals_gluten | 15–400 |
| `tortilla` | Tortilla wrap | 300 | 8 | 50 | 7 | carb | — | ready | cereals_gluten | 15–400 |
| `pasta` | Pasta (dry) | 350 | 13 | 72 | 1.8 | carb | — | dry | cereals_gluten | 15–400 |
| `lentil_pasta` | Lentil pasta (dry) | 350 | 25 | 50 | 4 | carb | carb_protein | dry | — | 15–400 |
| `noodles` | Noodles (cooked) | 140 | 4.5 | 28 | 1 | carb | — | cooked | cereals_gluten, eggs | 15–400 |
| `rice_cakes` | Rice cakes | 387 | 8 | 82 | 3 | carb | — | dry | — | 15–400 |
| `granola` | Granola | 450 | 10 | 64 | 16 | carb | — | dry | cereals_gluten, nuts | 15–400 |
| `weetabix` | Weetabix | 362 | 12 | 69 | 2 | carb | — | ready | cereals_gluten | 15–400 |
| `white_potato` | Potato (boiled) | 79 | 2 | 17 | 0.1 | carb | — | cooked | — | 80–500 |
| `potato_wedges` | Potato wedges | 130 | 2.5 | 24 | 3 | carb | — | ready | — | 80–400 |
| `sweet_potato` | Sweet potato | 86 | 1.6 | 20 | 0.1 | carb | — | ready | — | 80–500 |
| `banana` | Banana | 89 | 1.1 | 23 | 0.3 | carb | — | ready | — | 60–240 |
| `apple` | Apple | 52 | 0.3 | 14 | 0.2 | carb | — | ready | — | 80–300 |
| `berries` | Mixed berries | 44 | 0.6 | 10 | 0.1 | carb | — | ready | — | 50–250 |
| `pineapple` | Pineapple | 50 | 0.5 | 13 | 0.1 | carb | — | ready | — | 15–400 |
| `honey` | Honey | 304 | 0 | 82 | 0 | carb | — | ready | — | 5–40 |
| `tomato_sauce` | Tomato sauce | 50 | 1.5 | 8 | 1.5 | carb | — | ready | — | 15–400 |
| `milk_skimmed` | Skimmed milk | 35 | 3.4 | 5 | 0.1 | carb | high | ready | milk | 50–400 |
| `lentils` | Lentils (cooked) | 116 | 9 | 20 | 0.4 | carb | carb_protein | cooked | — | 15–400 |
| `lentil_dahl` | Red lentil dahl | 116 | 7 | 18 | 1.2 | carb | carb_protein | ready | — | 15–400 |
| `chickpeas` | Chickpeas (cooked) | 164 | 8.9 | 27 | 2.6 | carb | carb_protein | cooked | — | 15–400 |
| `kidney_beans` | Kidney beans (cooked) | 127 | 8.7 | 23 | 0.5 | carb | carb_protein | cooked | — | 15–400 |
| `black_beans` | Black beans (cooked) | 114 | 7.6 | 20 | 0.5 | carb | carb_protein | cooked | — | 15–400 |
| `baked_beans` | Baked beans | 78 | 4.7 | 13 | 0.6 | carb | carb_protein | ready | — | 15–400 |
| `soy_milk` | Soya milk | 33 | 3.3 | 1.2 | 1.8 | carb | moderate | ready | soya | 50–400 |

### Veg

| key | name | kcal | P | C | F | role | protein-class | weight-state | allergens | portion g (lo–hi) |
|---|---|--:|--:|--:|--:|---|---|---|---|---|
| `mixed_veg` | Mixed veg | 35 | 2.4 | 6 | 0.4 | veg | — | ready | — | 40–500 |
| `stirfry_veg` | Stir-fry veg | 40 | 2.1 | 7.5 | 0.5 | veg | — | ready | — | 40–500 |
| `broccoli` | Broccoli | 34 | 2.8 | 7 | 0.4 | veg | — | ready | — | 40–500 |
| `spinach` | Spinach | 23 | 2.9 | 3.6 | 0.4 | veg | — | ready | — | 40–500 |
| `green_beans` | Green beans | 31 | 1.8 | 7 | 0.2 | veg | — | ready | — | 40–500 |
| `asparagus` | Asparagus | 20 | 2.2 | 4 | 0.2 | veg | — | ready | — | 40–500 |
| `peas` | Garden peas | 84 | 5.4 | 14 | 0.4 | veg | — | ready | — | 40–500 |
| `salad` | Mixed salad | 20 | 1.5 | 3 | 0.2 | veg | — | ready | — | 40–500 |
| `mushrooms` | Mushrooms | 22 | 3.1 | 0.3 | 0.3 | veg | — | ready | — | 40–500 |
| `tomatoes` | Tomatoes | 18 | 0.9 | 3.9 | 0.2 | veg | — | ready | — | 40–500 |

### Fat

| key | name | kcal | P | C | F | role | protein-class | weight-state | allergens | portion g (lo–hi) |
|---|---|--:|--:|--:|--:|---|---|---|---|---|
| `halloumi` | Halloumi | 320 | 22 | 2 | 25 | fat | high | ready | milk | 5–60 |
| `paneer` | Paneer | 265 | 18 | 3 | 21 | fat | high | ready | milk | 5–60 |
| `cheddar_light` | Reduced-fat cheddar | 311 | 27 | 0.1 | 22 | fat | high | ready | milk | 5–60 |
| `olive_oil` | Olive oil | 884 | 0 | 0 | 100 | fat | — | ready | — | 5–30 |
| `almonds` | Almonds | 579 | 21 | 22 | 50 | fat | — | ready | nuts | 5–60 |
| `peanut_butter` | Peanut butter | 588 | 25 | 20 | 50 | fat | — | ready | peanuts | 5–60 |
| `mixed_seeds` | Mixed seeds | 567 | 23 | 14 | 47 | fat | — | dry | sesame | 5–60 |
| `avocado` | Avocado | 160 | 2 | 9 | 15 | fat | — | ready | — | 30–150 |
| `tahini` | Tahini | 595 | 17 | 21 | 54 | fat | — | ready | sesame | 5–60 |

### Free

| key | name | kcal | P | C | F | role | protein-class | weight-state | allergens | portion g (lo–hi) |
|---|---|--:|--:|--:|--:|---|---|---|---|---|
| `salsa` | Salsa | 30 | 1 | 6 | 0.1 | free | — | ready | — | 5–150 |

## 6. Meal library (computed macros)

### omnivore (63)


#### omnivore · breakfast

- **Oats, whey & banana**  `curated_om_oats_whey_banana`
  - slots: breakfast · protein anchor: high
  - **totals: 467 kcal · P 37.1 g · C 70.6 g · F 6.7 g**
  - components:
    - 60 g `oats` (Porridge oats) → 227 kcal · P 7.8 · C 40.2 · F 4.2
    - 35 g `whey` (Whey protein) → 133 kcal · P 28 · C 2.8 · F 2.1
    - 120 g `banana` (Banana) → 107 kcal · P 1.3 · C 27.6 · F 0.4
- **Protein pancakes & banana**  `curated_om_protein_pancakes`
  - slots: breakfast · protein anchor: high
  - **totals: 415 kcal · P 39.9 g · C 54.5 g · F 5.2 g**
  - components:
    - 50 g `oats` (Porridge oats) → 190 kcal · P 6.5 · C 33.5 · F 3.5
    - 150 g `egg_whites` (Egg whites) → 78 kcal · P 16.5 · C 1 · F 0.3
    - 20 g `whey` (Whey protein) → 76 kcal · P 16 · C 1.6 · F 1.2
    - 80 g `banana` (Banana) → 71 kcal · P 0.9 · C 18.4 · F 0.2
- **Egg & veg omelette with toast**  `curated_om_egg_omelette_toast`
  - slots: breakfast · protein anchor: high
  - **totals: 342 kcal · P 26.6 g · C 22.7 g · F 16.7 g**
  - components:
    - 150 g `eggs` (Whole eggs) → 215 kcal · P 19.5 · C 1.5 · F 15
    - 80 g `mixed_veg` (Mixed veg) → 28 kcal · P 1.9 · C 4.8 · F 0.3
    - 40 g `wholemeal_bread` (Wholemeal bread) → 99 kcal · P 5.2 · C 16.4 · F 1.4
- **Smoked salmon & egg bagel**  `curated_om_smoked_salmon_bagel`
  - slots: breakfast · protein anchor: high
  - **totals: 419 kcal · P 35 g · C 45.6 g · F 10 g**
  - components:
    - 80 g `smoked_salmon` (Smoked salmon) → 117 kcal · P 20 · C 0 · F 3.6
    - 85 g `bagel` (Bagel) → 230 kcal · P 8.5 · C 45.1 · F 1.4
    - 50 g `eggs` (Whole eggs) → 72 kcal · P 6.5 · C 0.5 · F 5
- **Chicken & egg breakfast bagel**  `curated_om_chicken_egg_bagel`
  - slots: breakfast · protein anchor: high
  - **totals: 505 kcal · P 46.3 g · C 46.1 g · F 14.3 g**
  - components:
    - 100 g `eggs` (Whole eggs) → 143 kcal · P 13 · C 1 · F 10
    - 80 g `chicken_breast` (Chicken breast (cooked)) → 132 kcal · P 24.8 · C 0 · F 2.9
    - 85 g `bagel` (Bagel) → 230 kcal · P 8.5 · C 45.1 · F 1.4
- **Turkey & egg sweet potato hash**  `curated_om_turkey_egg_hash`
  - slots: breakfast · protein anchor: high
  - **totals: 412 kcal · P 45.4 g · C 31 g · F 12.2 g**
  - components:
    - 100 g `turkey_breast` (Turkey breast (cooked)) → 140 kcal · P 30 · C 0 · F 2
    - 100 g `eggs` (Whole eggs) → 143 kcal · P 13 · C 1 · F 10
    - 150 g `sweet_potato` (Sweet potato) → 129 kcal · P 2.4 · C 30 · F 0.2
- **Smoked salmon scrambled eggs**  `curated_om_smoked_salmon_scramble`
  - slots: breakfast · protein anchor: high
  - **totals: 396 kcal · P 46.7 g · C 18.1 g · F 14.8 g**
  - components:
    - 70 g `smoked_salmon` (Smoked salmon) → 102 kcal · P 17.5 · C 0 · F 3.2
    - 100 g `eggs` (Whole eggs) → 143 kcal · P 13 · C 1 · F 10
    - 100 g `egg_whites` (Egg whites) → 52 kcal · P 11 · C 0.7 · F 0.2
    - 40 g `wholemeal_bread` (Wholemeal bread) → 99 kcal · P 5.2 · C 16.4 · F 1.4
- **Savoury tuna omelette**  `curated_om_tuna_egg_omelette`
  - slots: breakfast, lunch · protein anchor: high
  - **totals: 322 kcal · P 42 g · C 3.7 g · F 16 g**
  - components:
    - 80 g `tuna_water` (Tuna (in water)) → 93 kcal · P 20.8 · C 0 · F 0.8
    - 150 g `eggs` (Whole eggs) → 215 kcal · P 19.5 · C 1.5 · F 15
    - 60 g `spinach` (Spinach) → 14 kcal · P 1.7 · C 2.2 · F 0.2
- **Steak, eggs & potatoes**  `curated_om_steak_eggs_potatoes`
  - slots: breakfast · protein anchor: high
  - **totals: 501 kcal · P 51 g · C 35 g · F 17.2 g**
  - components:
    - 100 g `steak_lean` (Lean steak (cooked)) → 200 kcal · P 34 · C 0 · F 7
    - 100 g `eggs` (Whole eggs) → 143 kcal · P 13 · C 1 · F 10
    - 200 g `white_potato` (Potato (boiled)) → 158 kcal · P 4 · C 34 · F 0.2
- **Egg whites, oats & berries**  `curated_om_eggwhites_oats_berries`
  - slots: breakfast · protein anchor: high
  - **totals: 329 kcal · P 29 g · C 42.9 g · F 4 g**
  - components:
    - 200 g `egg_whites` (Egg whites) → 104 kcal · P 22 · C 1.4 · F 0.4
    - 50 g `oats` (Porridge oats) → 190 kcal · P 6.5 · C 33.5 · F 3.5
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
- **Beef & egg breakfast scramble**  `curated_om_beef_egg_scramble`
  - slots: breakfast · protein anchor: high
  - **totals: 379 kcal · P 39.2 g · C 17.4 g · F 16.4 g**
  - components:
    - 100 g `beef_mince_5` (Beef mince (5%)) → 137 kcal · P 21 · C 0 · F 5
    - 100 g `eggs` (Whole eggs) → 143 kcal · P 13 · C 1 · F 10
    - 40 g `wholemeal_bread` (Wholemeal bread) → 99 kcal · P 5.2 · C 16.4 · F 1.4

#### omnivore · lunch

- **Chicken, rice & broccoli**  `curated_om_chicken_rice_broc`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 549 kcal · P 55.3 g · C 64.4 g · F 6.5 g**
  - components:
    - 150 g `chicken_breast` (Chicken breast (cooked)) → 248 kcal · P 46.5 · C 0 · F 5.4
    - 200 g `white_rice` (White rice (cooked)) → 260 kcal · P 5.4 · C 56 · F 0.6
    - 120 g `broccoli` (Broccoli) → 41 kcal · P 3.4 · C 8.4 · F 0.5
- **Chicken, sweet potato & spinach**  `curated_om_chicken_sweetpot`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 481 kcal · P 52.8 g · C 52.9 g · F 6 g**
  - components:
    - 150 g `chicken_breast` (Chicken breast (cooked)) → 248 kcal · P 46.5 · C 0 · F 5.4
    - 250 g `sweet_potato` (Sweet potato) → 215 kcal · P 4 · C 50 · F 0.3
    - 80 g `spinach` (Spinach) → 18 kcal · P 2.3 · C 2.9 · F 0.3
- **Cod, sweet potato & veg**  `curated_om_cod_sweet_potato`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 416 kcal · P 42.2 g · C 58.4 g · F 1.9 g**
  - components:
    - 200 g `cod` (Cod / white fish) → 164 kcal · P 36 · C 0 · F 1.4
    - 250 g `sweet_potato` (Sweet potato) → 215 kcal · P 4 · C 50 · F 0.3
    - 120 g `green_beans` (Green beans) → 37 kcal · P 2.2 · C 8.4 · F 0.2
- **Beef burrito bowl**  `curated_om_beef_burrito_bowl`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 504 kcal · P 42.1 g · C 60.4 g · F 8.4 g**
  - components:
    - 150 g `beef_mince_5` (Beef mince (5%)) → 206 kcal · P 31.5 · C 0 · F 7.5
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 80 g `black_beans` (Black beans (cooked)) → 91 kcal · P 6.1 · C 16 · F 0.4
    - 40 g `salsa` (Salsa) → 12 kcal · P 0.4 · C 2.4 · F 0
- **Prawn & noodle stir-fry**  `curated_om_prawn_noodles`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 386 kcal · P 39.3 g · C 51 g · F 2.9 g**
  - components:
    - 150 g `prawns` (Prawns) → 128 kcal · P 30 · C 0 · F 0.8
    - 150 g `noodles` (Noodles (cooked)) → 210 kcal · P 6.8 · C 42 · F 1.5
    - 120 g `stirfry_veg` (Stir-fry veg) → 48 kcal · P 2.5 · C 9 · F 0.6
- **Turkey & avocado wrap**  `curated_om_turkey_avocado_wrap`
  - slots: lunch · protein anchor: high
  - **totals: 456 kcal · P 42.9 g · C 37.2 g · F 15.7 g**
  - components:
    - 120 g `turkey_breast` (Turkey breast (cooked)) → 168 kcal · P 36 · C 0 · F 2.4
    - 60 g `tortilla` (Tortilla wrap) → 180 kcal · P 4.8 · C 30 · F 4.2
    - 60 g `avocado` (Avocado) → 96 kcal · P 1.2 · C 5.4 · F 9
    - 60 g `salad` (Mixed salad) → 12 kcal · P 0.9 · C 1.8 · F 0.1
- **Chicken salad wrap**  `curated_om_chicken_salad_wrap`
  - slots: lunch · protein anchor: high
  - **totals: 394 kcal · P 43.2 g · C 32.4 g · F 8.7 g**
  - components:
    - 120 g `chicken_breast` (Chicken breast (cooked)) → 198 kcal · P 37.2 · C 0 · F 4.3
    - 60 g `tortilla` (Tortilla wrap) → 180 kcal · P 4.8 · C 30 · F 4.2
    - 80 g `salad` (Mixed salad) → 16 kcal · P 1.2 · C 2.4 · F 0.2
- **Jacket potato with tuna**  `curated_om_tuna_jacket`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 388 kcal · P 38.1 g · C 52.8 g · F 1.6 g**
  - components:
    - 300 g `white_potato` (Potato (boiled)) → 237 kcal · P 6 · C 51 · F 0.3
    - 120 g `tuna_water` (Tuna (in water)) → 139 kcal · P 31.2 · C 0 · F 1.2
    - 60 g `salad` (Mixed salad) → 12 kcal · P 0.9 · C 1.8 · F 0.1
- **Chicken & tomato pasta pot**  `curated_om_chicken_pasta_pot`
  - slots: lunch · protein anchor: high
  - **totals: 448 kcal · P 46.2 g · C 49.6 g · F 6.6 g**
  - components:
    - 120 g `chicken_breast` (Chicken breast (cooked)) → 198 kcal · P 37.2 · C 0 · F 4.3
    - 60 g `pasta` (Pasta (dry)) → 210 kcal · P 7.8 · C 43.2 · F 1.1
    - 80 g `tomato_sauce` (Tomato sauce) → 40 kcal · P 1.2 · C 6.4 · F 1.2
- **Chicken jacket potato & salad**  `curated_om_chicken_jacket_potato`
  - slots: lunch · protein anchor: high
  - **totals: 484 kcal · P 50.6 g · C 53.4 g · F 5.5 g**
  - components:
    - 140 g `chicken_breast` (Chicken breast (cooked)) → 231 kcal · P 43.4 · C 0 · F 5
    - 300 g `white_potato` (Potato (boiled)) → 237 kcal · P 6 · C 51 · F 0.3
    - 80 g `salad` (Mixed salad) → 16 kcal · P 1.2 · C 2.4 · F 0.2
- **Tuna jacket potato & beans**  `curated_om_tuna_jacket_potato`
  - slots: lunch · protein anchor: high
  - **totals: 454 kcal · P 41.9 g · C 64 g · F 2.1 g**
  - components:
    - 120 g `tuna_water` (Tuna (in water)) → 139 kcal · P 31.2 · C 0 · F 1.2
    - 300 g `white_potato` (Potato (boiled)) → 237 kcal · P 6 · C 51 · F 0.3
    - 100 g `baked_beans` (Baked beans) → 78 kcal · P 4.7 · C 13 · F 0.6
- **Chicken & quinoa salad**  `curated_om_chicken_quinoa_salad`
  - slots: lunch · protein anchor: high
  - **totals: 484 kcal · P 51.5 g · C 34.5 g · F 14 g**
  - components:
    - 140 g `chicken_breast` (Chicken breast (cooked)) → 231 kcal · P 43.4 · C 0 · F 5
    - 150 g `quinoa` (Quinoa (cooked)) → 180 kcal · P 6.6 · C 31.5 · F 2.8
    - 100 g `salad` (Mixed salad) → 20 kcal · P 1.5 · C 3 · F 0.2
    - 6 g `olive_oil` (Olive oil) → 53 kcal · P 0 · C 0 · F 6
- **Chicken & tomato pasta**  `curated_om_chicken_tomato_pasta`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 577 kcal · P 59.9 g · C 65.4 g · F 8.6 g**
  - components:
    - 150 g `chicken_breast` (Chicken breast (cooked)) → 248 kcal · P 46.5 · C 0 · F 5.4
    - 70 g `pasta` (Pasta (dry)) → 245 kcal · P 9.1 · C 50.4 · F 1.3
    - 100 g `tomato_sauce` (Tomato sauce) → 50 kcal · P 1.5 · C 8 · F 1.5
    - 100 g `broccoli` (Broccoli) → 34 kcal · P 2.8 · C 7 · F 0.4
- **Beef mince, rice & greens**  `curated_om_beef_rice_greens`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 471 kcal · P 38.2 g · C 57.4 g · F 8.2 g**
  - components:
    - 150 g `beef_mince_5` (Beef mince (5%)) → 206 kcal · P 31.5 · C 0 · F 7.5
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 100 g `green_beans` (Green beans) → 31 kcal · P 1.8 · C 7 · F 0.2
- **Turkey chilli & rice**  `curated_om_turkey_chilli_rice`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 504 kcal · P 43.2 g · C 67.4 g · F 5.9 g**
  - components:
    - 150 g `turkey_mince` (Turkey mince (5%)) → 170 kcal · P 30 · C 0 · F 4.9
    - 100 g `kidney_beans` (Kidney beans (cooked)) → 127 kcal · P 8.7 · C 23 · F 0.5
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 40 g `salsa` (Salsa) → 12 kcal · P 0.4 · C 2.4 · F 0
- **Prawn & egg fried rice**  `curated_om_prawn_egg_fried_rice`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 501 kcal · P 45.7 g · C 62.1 g · F 6.6 g**
  - components:
    - 150 g `prawns` (Prawns) → 128 kcal · P 30 · C 0 · F 0.8
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 50 g `eggs` (Whole eggs) → 72 kcal · P 6.5 · C 0.5 · F 5
    - 80 g `peas` (Garden peas) → 67 kcal · P 4.3 · C 11.2 · F 0.3
- **Cod, rice & peas**  `curated_om_cod_rice_peas`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 482 kcal · P 46.3 g · C 64.4 g · F 2.3 g**
  - components:
    - 200 g `cod` (Cod / white fish) → 164 kcal · P 36 · C 0 · F 1.4
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 100 g `peas` (Garden peas) → 84 kcal · P 5.4 · C 14 · F 0.4
- **Chicken fajita wrap**  `curated_om_chicken_fajita_wrap`
  - slots: lunch · protein anchor: high
  - **totals: 419 kcal · P 46.4 g · C 34.2 g · F 9 g**
  - components:
    - 130 g `chicken_breast` (Chicken breast (cooked)) → 215 kcal · P 40.3 · C 0 · F 4.7
    - 60 g `tortilla` (Tortilla wrap) → 180 kcal · P 4.8 · C 30 · F 4.2
    - 40 g `salsa` (Salsa) → 12 kcal · P 0.4 · C 2.4 · F 0
    - 60 g `salad` (Mixed salad) → 12 kcal · P 0.9 · C 1.8 · F 0.1
- **Chicken chow mein noodles**  `curated_om_chicken_chow_mein`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 576 kcal · P 58 g · C 65 g · F 8 g**
  - components:
    - 150 g `chicken_breast` (Chicken breast (cooked)) → 248 kcal · P 46.5 · C 0 · F 5.4
    - 200 g `noodles` (Noodles (cooked)) → 280 kcal · P 9 · C 56 · F 2
    - 120 g `stirfry_veg` (Stir-fry veg) → 48 kcal · P 2.5 · C 9 · F 0.6
- **Tuna pasta salad**  `curated_om_tuna_pasta_salad`
  - slots: lunch · protein anchor: high
  - **totals: 430 kcal · P 42.4 g · C 57.6 g · F 3.6 g**
  - components:
    - 120 g `tuna_water` (Tuna (in water)) → 139 kcal · P 31.2 · C 0 · F 1.2
    - 70 g `pasta` (Pasta (dry)) → 245 kcal · P 9.1 · C 50.4 · F 1.3
    - 80 g `salad` (Mixed salad) → 16 kcal · P 1.2 · C 2.4 · F 0.2
    - 60 g `tomato_sauce` (Tomato sauce) → 30 kcal · P 0.9 · C 4.8 · F 0.9
- **Chicken salad sandwich**  `curated_om_chicken_salad_sandwich`
  - slots: lunch · protein anchor: high
  - **totals: 408 kcal · P 48.5 g · C 34.6 g · F 7.1 g**
  - components:
    - 120 g `chicken_breast` (Chicken breast (cooked)) → 198 kcal · P 37.2 · C 0 · F 4.3
    - 80 g `wholemeal_bread` (Wholemeal bread) → 198 kcal · P 10.4 · C 32.8 · F 2.7
    - 60 g `salad` (Mixed salad) → 12 kcal · P 0.9 · C 1.8 · F 0.1
- **Tuna salad sandwich**  `curated_om_tuna_salad_sandwich`
  - slots: lunch · protein anchor: high
  - **totals: 349 kcal · P 42.5 g · C 34.6 g · F 4 g**
  - components:
    - 120 g `tuna_water` (Tuna (in water)) → 139 kcal · P 31.2 · C 0 · F 1.2
    - 80 g `wholemeal_bread` (Wholemeal bread) → 198 kcal · P 10.4 · C 32.8 · F 2.7
    - 60 g `salad` (Mixed salad) → 12 kcal · P 0.9 · C 1.8 · F 0.1

#### omnivore · dinner

- **Lean steak, potatoes & greens**  `curated_om_steak_potato_greens`
  - slots: dinner · protein anchor: high
  - **totals: 518 kcal · P 57.5 g · C 45.5 g · F 11 g**
  - components:
    - 150 g `steak_lean` (Lean steak (cooked)) → 300 kcal · P 51 · C 0 · F 10.5
    - 250 g `white_potato` (Potato (boiled)) → 198 kcal · P 5 · C 42.5 · F 0.3
    - 100 g `salad` (Mixed salad) → 20 kcal · P 1.5 · C 3 · F 0.2
- **Salmon, rice & asparagus**  `curated_om_salmon_rice_asparagus`
  - slots: dinner · protein anchor: high
  - **totals: 566 kcal · P 37.1 g · C 54.4 g · F 20.2 g**
  - components:
    - 150 g `salmon` (Salmon) → 312 kcal · P 30 · C 0 · F 19.5
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 100 g `asparagus` (Asparagus) → 20 kcal · P 2.2 · C 4 · F 0.2
- **Turkey bolognese & pasta**  `curated_om_turkey_bolognese`
  - slots: dinner · protein anchor: high
  - **totals: 465 kcal · P 40.6 g · C 58.4 g · F 7.7 g**
  - components:
    - 150 g `turkey_mince` (Turkey mince (5%)) → 170 kcal · P 30 · C 0 · F 4.9
    - 70 g `pasta` (Pasta (dry)) → 245 kcal · P 9.1 · C 50.4 · F 1.3
    - 100 g `tomato_sauce` (Tomato sauce) → 50 kcal · P 1.5 · C 8 · F 1.5
- **White fish, wedges & peas**  `curated_om_whitefish_wedges`
  - slots: dinner · protein anchor: high
  - **totals: 491 kcal · P 45.3 g · C 59.2 g · F 7.7 g**
  - components:
    - 200 g `cod` (Cod / white fish) → 164 kcal · P 36 · C 0 · F 1.4
    - 200 g `potato_wedges` (Potato wedges) → 260 kcal · P 5 · C 48 · F 6
    - 80 g `peas` (Garden peas) → 67 kcal · P 4.3 · C 11.2 · F 0.3
- **Lean cottage pie & veg**  `curated_om_cottage_pie`
  - slots: dinner · protein anchor: high
  - **totals: 510 kcal · P 45.6 g · C 54.5 g · F 10.5 g**
  - components:
    - 175 g `beef_mince_5` (Beef mince (5%)) → 240 kcal · P 36.8 · C 0 · F 8.8
    - 250 g `white_potato` (Potato (boiled)) → 198 kcal · P 5 · C 42.5 · F 0.3
    - 120 g `mixed_veg` (Mixed veg) → 42 kcal · P 2.9 · C 7.2 · F 0.5
    - 60 g `tomato_sauce` (Tomato sauce) → 30 kcal · P 0.9 · C 4.8 · F 0.9
- **Chicken fajitas**  `curated_om_chicken_fajitas`
  - slots: dinner · protein anchor: high
  - **totals: 728 kcal · P 64.2 g · C 71.1 g · F 18.8 g**
  - components:
    - 150 g `chicken_breast` (Chicken breast (cooked)) → 248 kcal · P 46.5 · C 0 · F 5.4
    - 120 g `tortilla` (Tortilla wrap) → 360 kcal · P 9.6 · C 60 · F 8.4
    - 100 g `stirfry_veg` (Stir-fry veg) → 40 kcal · P 2.1 · C 7.5 · F 0.5
    - 60 g `salsa` (Salsa) → 18 kcal · P 0.6 · C 3.6 · F 0.1
    - 20 g `cheddar_light` (Reduced-fat cheddar) → 62 kcal · P 5.4 · C 0 · F 4.4
- **Lean spaghetti bolognese**  `curated_om_spag_bol`
  - slots: dinner · protein anchor: high
  - **totals: 511 kcal · P 42.4 g · C 60 g · F 10.6 g**
  - components:
    - 150 g `beef_mince_5` (Beef mince (5%)) → 206 kcal · P 31.5 · C 0 · F 7.5
    - 70 g `pasta` (Pasta (dry)) → 245 kcal · P 9.1 · C 50.4 · F 1.3
    - 120 g `tomato_sauce` (Tomato sauce) → 60 kcal · P 1.8 · C 9.6 · F 1.8
- **Chilli con carne & rice**  `curated_om_chilli_con_carne`
  - slots: dinner · protein anchor: high
  - **totals: 568 kcal · P 45.5 g · C 71.4 g · F 9.7 g**
  - components:
    - 150 g `beef_mince_5` (Beef mince (5%)) → 206 kcal · P 31.5 · C 0 · F 7.5
    - 100 g `kidney_beans` (Kidney beans (cooked)) → 127 kcal · P 8.7 · C 23 · F 0.5
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 80 g `tomato_sauce` (Tomato sauce) → 40 kcal · P 1.2 · C 6.4 · F 1.2
- **Chicken curry & rice (fakeaway)**  `curated_om_chicken_curry`
  - slots: dinner · protein anchor: high
  - **totals: 532 kcal · P 52.9 g · C 58.4 g · F 7.4 g**
  - components:
    - 150 g `chicken_breast` (Chicken breast (cooked)) → 248 kcal · P 46.5 · C 0 · F 5.4
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 100 g `tomato_sauce` (Tomato sauce) → 50 kcal · P 1.5 · C 8 · F 1.5
- **Salmon noodle stir-fry**  `curated_om_salmon_noodle_stirfry`
  - slots: dinner · protein anchor: high
  - **totals: 549 kcal · P 37.3 g · C 51 g · F 20.3 g**
  - components:
    - 140 g `salmon` (Salmon) → 291 kcal · P 28 · C 0 · F 18.2
    - 150 g `noodles` (Noodles (cooked)) → 210 kcal · P 6.8 · C 42 · F 1.5
    - 120 g `stirfry_veg` (Stir-fry veg) → 48 kcal · P 2.5 · C 9 · F 0.6
- **Salmon, new potatoes & green beans**  `curated_om_salmon_potato_greens`
  - slots: dinner · protein anchor: high
  - **totals: 541 kcal · P 36.8 g · C 49.5 g · F 20 g**
  - components:
    - 150 g `salmon` (Salmon) → 312 kcal · P 30 · C 0 · F 19.5
    - 250 g `white_potato` (Potato (boiled)) → 198 kcal · P 5 · C 42.5 · F 0.3
    - 100 g `green_beans` (Green beans) → 31 kcal · P 1.8 · C 7 · F 0.2
- **Steak & rice stir-fry**  `curated_om_steak_rice_stirfry`
  - slots: dinner · protein anchor: high
  - **totals: 582 kcal · P 58.4 g · C 59.4 g · F 11.6 g**
  - components:
    - 150 g `steak_lean` (Lean steak (cooked)) → 300 kcal · P 51 · C 0 · F 10.5
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 120 g `stirfry_veg` (Stir-fry veg) → 48 kcal · P 2.5 · C 9 · F 0.6
- **Turkey & lentil pasta bolognese**  `curated_om_turkey_lentilpasta_bol`
  - slots: dinner · protein anchor: high
  - **totals: 477 kcal · P 47.5 g · C 48 g · F 9 g**
  - components:
    - 130 g `turkey_mince` (Turkey mince (5%)) → 147 kcal · P 26 · C 0 · F 4.3
    - 80 g `lentil_pasta` (Lentil pasta (dry)) → 280 kcal · P 20 · C 40 · F 3.2
    - 100 g `tomato_sauce` (Tomato sauce) → 50 kcal · P 1.5 · C 8 · F 1.5

#### omnivore · snack

- **Tuna & rice cakes**  `curated_om_tuna_ricecakes`
  - slots: snack · protein anchor: high
  - **totals: 240 kcal · P 28.6 g · C 26.2 g · F 2 g**
  - components:
    - 100 g `tuna_water` (Tuna (in water)) → 116 kcal · P 26 · C 0 · F 1
    - 32 g `rice_cakes` (Rice cakes) → 124 kcal · P 2.6 · C 26.2 · F 1
- **Boiled eggs & apple**  `curated_om_eggs_apple_snack`
  - slots: snack · protein anchor: high
  - **totals: 293 kcal · P 20 g · C 22.5 g · F 15.3 g**
  - components:
    - 150 g `eggs` (Whole eggs) → 215 kcal · P 19.5 · C 1.5 · F 15
    - 150 g `apple` (Apple) → 78 kcal · P 0.5 · C 21 · F 0.3
- **Chicken, apple & almonds**  `curated_om_chicken_apple_almonds`
  - slots: snack · protein anchor: high
  - **totals: 281 kcal · P 28.4 g · C 20.1 g · F 10.6 g**
  - components:
    - 80 g `chicken_breast` (Chicken breast (cooked)) → 132 kcal · P 24.8 · C 0 · F 2.9
    - 120 g `apple` (Apple) → 62 kcal · P 0.4 · C 16.8 · F 0.2
    - 15 g `almonds` (Almonds) → 87 kcal · P 3.2 · C 3.3 · F 7.5
- **Tuna & avocado rice cakes**  `curated_om_tuna_ricecakes_avocado`
  - slots: snack · protein anchor: high
  - **totals: 273 kcal · P 28.7 g · C 23.3 g · F 7.7 g**
  - components:
    - 100 g `tuna_water` (Tuna (in water)) → 116 kcal · P 26 · C 0 · F 1
    - 24 g `rice_cakes` (Rice cakes) → 93 kcal · P 1.9 · C 19.7 · F 0.7
    - 40 g `avocado` (Avocado) → 64 kcal · P 0.8 · C 3.6 · F 6
- **Turkey & cottage cheese plate**  `curated_om_turkey_cottage_plate`
  - slots: snack · protein anchor: high
  - **totals: 194 kcal · P 36.8 g · C 4.5 g · F 2.7 g**
  - components:
    - 80 g `turkey_breast` (Turkey breast (cooked)) → 112 kcal · P 24 · C 0 · F 1.6
    - 100 g `cottage_cheese` (Cottage cheese (low-fat)) → 72 kcal · P 12 · C 3 · F 1
    - 50 g `salad` (Mixed salad) → 10 kcal · P 0.8 · C 1.5 · F 0.1
- **Whey shake, apple & almonds**  `curated_om_whey_apple_almonds`
  - slots: snack · protein anchor: high
  - **totals: 244 kcal · P 23.6 g · C 22.1 g · F 9.2 g**
  - components:
    - 25 g `whey` (Whey protein) → 95 kcal · P 20 · C 2 · F 1.5
    - 120 g `apple` (Apple) → 62 kcal · P 0.4 · C 16.8 · F 0.2
    - 15 g `almonds` (Almonds) → 87 kcal · P 3.2 · C 3.3 · F 7.5
- **Smoked salmon & salad plate**  `curated_om_smoked_salmon_salad_plate`
  - slots: snack · protein anchor: high
  - **totals: 162 kcal · P 26.2 g · C 2.4 g · F 4.7 g**
  - components:
    - 100 g `smoked_salmon` (Smoked salmon) → 146 kcal · P 25 · C 0 · F 4.5
    - 80 g `salad` (Mixed salad) → 16 kcal · P 1.2 · C 2.4 · F 0.2
- **Egg whites on toast**  `curated_om_eggwhites_toast_snack`
  - slots: snack · protein anchor: high
  - **totals: 203 kcal · P 27.2 g · C 17.8 g · F 1.8 g**
  - components:
    - 200 g `egg_whites` (Egg whites) → 104 kcal · P 22 · C 1.4 · F 0.4
    - 40 g `wholemeal_bread` (Wholemeal bread) → 99 kcal · P 5.2 · C 16.4 · F 1.4

#### omnivore · preworkout

- **Rice cakes, whey & banana**  `curated_om_pre_ricecakes_whey_banana`
  - slots: preworkout · protein anchor: high
  - **totals: 337 kcal · P 27.7 g · C 54.6 g · F 3.1 g**
  - components:
    - 30 g `rice_cakes` (Rice cakes) → 116 kcal · P 2.4 · C 24.6 · F 0.9
    - 30 g `whey` (Whey protein) → 114 kcal · P 24 · C 2.4 · F 1.8
    - 120 g `banana` (Banana) → 107 kcal · P 1.3 · C 27.6 · F 0.4
- **Oats, whey & honey**  `curated_om_pre_oats_whey_honey`
  - slots: preworkout · protein anchor: high
  - **totals: 350 kcal · P 30.5 g · C 48.2 g · F 5.3 g**
  - components:
    - 50 g `oats` (Porridge oats) → 190 kcal · P 6.5 · C 33.5 · F 3.5
    - 30 g `whey` (Whey protein) → 114 kcal · P 24 · C 2.4 · F 1.8
    - 15 g `honey` (Honey) → 46 kcal · P 0 · C 12.3 · F 0
- **Bagel & whey shake**  `curated_om_pre_bagel_whey`
  - slots: preworkout · protein anchor: high
  - **totals: 414 kcal · P 39.3 g · C 57.5 g · F 3.4 g**
  - components:
    - 85 g `bagel` (Bagel) → 230 kcal · P 8.5 · C 45.1 · F 1.4
    - 30 g `whey` (Whey protein) → 114 kcal · P 24 · C 2.4 · F 1.8
    - 200 g `milk_skimmed` (Skimmed milk) → 70 kcal · P 6.8 · C 10 · F 0.2
- **Chicken & white rice**  `curated_om_pre_chicken_white_rice`
  - slots: preworkout · protein anchor: high
  - **totals: 393 kcal · P 41.3 g · C 42 g · F 4.8 g**
  - components:
    - 120 g `chicken_breast` (Chicken breast (cooked)) → 198 kcal · P 37.2 · C 0 · F 4.3
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5

#### omnivore · postworkout

- **Whey & banana shake**  `curated_om_post_whey_banana_shake`
  - slots: postworkout · protein anchor: high
  - **totals: 347 kcal · P 41.8 g · C 43.3 g · F 3.1 g**
  - components:
    - 40 g `whey` (Whey protein) → 152 kcal · P 32 · C 3.2 · F 2.4
    - 120 g `banana` (Banana) → 107 kcal · P 1.3 · C 27.6 · F 0.4
    - 250 g `milk_skimmed` (Skimmed milk) → 88 kcal · P 8.5 · C 12.5 · F 0.3
- **Chicken, white rice & veg**  `curated_om_post_chicken_rice_veg`
  - slots: postworkout · protein anchor: high
  - **totals: 517 kcal · P 53.8 g · C 56.4 g · F 6.3 g**
  - components:
    - 150 g `chicken_breast` (Chicken breast (cooked)) → 248 kcal · P 46.5 · C 0 · F 5.4
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 100 g `mixed_veg` (Mixed veg) → 35 kcal · P 2.4 · C 6 · F 0.4
- **Turkey & white potato**  `curated_om_post_turkey_potato`
  - slots: postworkout · protein anchor: high
  - **totals: 439 kcal · P 51.8 g · C 49.5 g · F 3.5 g**
  - components:
    - 150 g `turkey_breast` (Turkey breast (cooked)) → 210 kcal · P 45 · C 0 · F 3
    - 250 g `white_potato` (Potato (boiled)) → 198 kcal · P 5 · C 42.5 · F 0.3
    - 100 g `green_beans` (Green beans) → 31 kcal · P 1.8 · C 7 · F 0.2
- **Whey, oats & honey**  `curated_om_post_whey_oats_honey`
  - slots: postworkout · protein anchor: high
  - **totals: 425 kcal · P 39.8 g · C 55.7 g · F 6.6 g**
  - components:
    - 40 g `whey` (Whey protein) → 152 kcal · P 32 · C 3.2 · F 2.4
    - 60 g `oats` (Porridge oats) → 227 kcal · P 7.8 · C 40.2 · F 4.2
    - 15 g `honey` (Honey) → 46 kcal · P 0 · C 12.3 · F 0
- **Tuna bagel**  `curated_om_post_tuna_bagel`
  - slots: postworkout · protein anchor: high
  - **totals: 346 kcal · P 34.5 g · C 45.1 g · F 2.4 g**
  - components:
    - 100 g `tuna_water` (Tuna (in water)) → 116 kcal · P 26 · C 0 · F 1
    - 85 g `bagel` (Bagel) → 230 kcal · P 8.5 · C 45.1 · F 1.4

### vegetarian (51)


#### vegetarian · breakfast

- **Greek yogurt, oats & berries**  `curated_veg_yog_oats_berries`
  - slots: breakfast · protein anchor: high
  - **totals: 351 kcal · P 25.7 g · C 55.1 g · F 2.9 g**
  - components:
    - 200 g `greek_yogurt_0` (Greek yogurt (0%)) → 118 kcal · P 20 · C 8 · F 0
    - 40 g `oats` (Porridge oats) → 152 kcal · P 5.2 · C 26.8 · F 2.8
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
    - 15 g `honey` (Honey) → 46 kcal · P 0 · C 12.3 · F 0
- **Egg scramble, toast & beans**  `curated_veg_egg_scramble_beans`
  - slots: breakfast · protein anchor: high
  - **totals: 382 kcal · P 36.1 g · C 31.2 g · F 12.2 g**
  - components:
    - 100 g `eggs` (Whole eggs) → 143 kcal · P 13 · C 1 · F 10
    - 120 g `egg_whites` (Egg whites) → 62 kcal · P 13.2 · C 0.8 · F 0.2
    - 40 g `wholemeal_bread` (Wholemeal bread) → 99 kcal · P 5.2 · C 16.4 · F 1.4
    - 100 g `baked_beans` (Baked beans) → 78 kcal · P 4.7 · C 13 · F 0.6
- **Skyr, oats & peanut butter**  `curated_veg_skyr_oats_pb`
  - slots: breakfast · protein anchor: high
  - **totals: 366 kcal · P 31 g · C 37.8 g · F 10.7 g**
  - components:
    - 200 g `skyr` (Skyr) → 126 kcal · P 22 · C 8 · F 0.4
    - 40 g `oats` (Porridge oats) → 152 kcal · P 5.2 · C 26.8 · F 2.8
    - 15 g `peanut_butter` (Peanut butter) → 88 kcal · P 3.8 · C 3 · F 7.5
- **Cottage cheese pancakes**  `curated_veg_cottage_pancakes`
  - slots: breakfast · protein anchor: high
  - **totals: 312 kcal · P 34.2 g · C 32 g · F 4.5 g**
  - components:
    - 150 g `cottage_cheese` (Cottage cheese (low-fat)) → 108 kcal · P 18 · C 4.5 · F 1.5
    - 40 g `oats` (Porridge oats) → 152 kcal · P 5.2 · C 26.8 · F 2.8
    - 100 g `egg_whites` (Egg whites) → 52 kcal · P 11 · C 0.7 · F 0.2
- **Protein oat smoothie**  `curated_veg_protein_smoothie`
  - slots: breakfast, snack · protein anchor: high
  - **totals: 333 kcal · P 35.2 g · C 40.5 g · F 4.2 g**
  - components:
    - 30 g `whey` (Whey protein) → 114 kcal · P 24 · C 2.4 · F 1.8
    - 30 g `oats` (Porridge oats) → 114 kcal · P 3.9 · C 20.1 · F 2.1
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
    - 200 g `milk_skimmed` (Skimmed milk) → 70 kcal · P 6.8 · C 10 · F 0.2
- **Weetabix, milk & a scoop of whey**  `curated_veg_weetabix_whey`
  - slots: breakfast · protein anchor: high
  - **totals: 346 kcal · P 33.9 g · C 45.6 g · F 2.7 g**
  - components:
    - 45 g `weetabix` (Weetabix) → 163 kcal · P 5.4 · C 31.1 · F 0.9
    - 250 g `milk_skimmed` (Skimmed milk) → 88 kcal · P 8.5 · C 12.5 · F 0.3
    - 25 g `whey` (Whey protein) → 95 kcal · P 20 · C 2 · F 1.5
- **Greek yogurt, granola & seeds**  `curated_veg_yog_granola_seeds`
  - slots: breakfast · protein anchor: high
  - **totals: 336 kcal · P 25.7 g · C 34.6 g · F 9.6 g**
  - components:
    - 200 g `greek_yogurt_0` (Greek yogurt (0%)) → 118 kcal · P 20 · C 8 · F 0
    - 30 g `granola` (Granola) → 135 kcal · P 3 · C 19.2 · F 4.8
    - 10 g `mixed_seeds` (Mixed seeds) → 57 kcal · P 2.3 · C 1.4 · F 4.7
    - 60 g `berries` (Mixed berries) → 26 kcal · P 0.4 · C 6 · F 0.1
- **Skyr, berries & almonds**  `curated_veg_skyr_berries_almonds`
  - slots: breakfast, snack · protein anchor: high
  - **totals: 248 kcal · P 25.7 g · C 19.3 g · F 8 g**
  - components:
    - 200 g `skyr` (Skyr) → 126 kcal · P 22 · C 8 · F 0.4
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
    - 15 g `almonds` (Almonds) → 87 kcal · P 3.2 · C 3.3 · F 7.5
- **Eggs & avocado on toast**  `curated_veg_eggs_avocado_toast`
  - slots: breakfast · protein anchor: high
  - **totals: 443 kcal · P 28.3 g · C 30.6 g · F 24.5 g**
  - components:
    - 150 g `eggs` (Whole eggs) → 215 kcal · P 19.5 · C 1.5 · F 15
    - 60 g `wholemeal_bread` (Wholemeal bread) → 148 kcal · P 7.8 · C 24.6 · F 2
    - 50 g `avocado` (Avocado) → 80 kcal · P 1 · C 4.5 · F 7.5
- **Overnight oats with skyr**  `curated_veg_overnight_oats_skyr`
  - slots: breakfast · protein anchor: high
  - **totals: 346 kcal · P 26.8 g · C 50.5 g · F 4 g**
  - components:
    - 50 g `oats` (Porridge oats) → 190 kcal · P 6.5 · C 33.5 · F 3.5
    - 150 g `skyr` (Skyr) → 95 kcal · P 16.5 · C 6 · F 0.3
    - 100 g `milk_skimmed` (Skimmed milk) → 35 kcal · P 3.4 · C 5 · F 0.1
    - 60 g `berries` (Mixed berries) → 26 kcal · P 0.4 · C 6 · F 0.1
- **Cottage cheese & egg on toast**  `curated_veg_cottage_toast_eggs`
  - slots: breakfast · protein anchor: high
  - **totals: 350 kcal · P 36.2 g · C 21.9 g · F 12.9 g**
  - components:
    - 150 g `cottage_cheese` (Cottage cheese (low-fat)) → 108 kcal · P 18 · C 4.5 · F 1.5
    - 100 g `eggs` (Whole eggs) → 143 kcal · P 13 · C 1 · F 10
    - 40 g `wholemeal_bread` (Wholemeal bread) → 99 kcal · P 5.2 · C 16.4 · F 1.4
- **Porridge, whey & berries**  `curated_veg_porridge_whey_berries`
  - slots: breakfast · protein anchor: high
  - **totals: 376 kcal · P 32.3 g · C 50.6 g · F 6.1 g**
  - components:
    - 60 g `oats` (Porridge oats) → 227 kcal · P 7.8 · C 40.2 · F 4.2
    - 30 g `whey` (Whey protein) → 114 kcal · P 24 · C 2.4 · F 1.8
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
- **Big Greek yogurt bowl**  `curated_veg_big_yogurt_bowl`
  - slots: breakfast · protein anchor: high
  - **totals: 321 kcal · P 33.9 g · C 40.3 g · F 2.1 g**
  - components:
    - 300 g `greek_yogurt_0` (Greek yogurt (0%)) → 177 kcal · P 30 · C 12 · F 0
    - 30 g `oats` (Porridge oats) → 114 kcal · P 3.9 · C 20.1 · F 2.1
    - 10 g `honey` (Honey) → 30 kcal · P 0 · C 8.2 · F 0

#### vegetarian · lunch

- **Tofu stir-fry with rice**  `curated_veg_tofu_stirfry_rice`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 570 kcal · P 41.4 g · C 65.4 g · F 17.1 g**
  - components:
    - 200 g `tofu_firm` (Firm tofu) → 288 kcal · P 34 · C 6 · F 16
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 120 g `stirfry_veg` (Stir-fry veg) → 48 kcal · P 2.5 · C 9 · F 0.6
- **Lentil & quinoa bowl**  `curated_veg_lentil_quinoa`
  - slots: lunch · protein anchor: carb_protein
  - **totals: 476 kcal · P 30.7 g · C 82.4 g · F 3.8 g**
  - components:
    - 250 g `lentils` (Lentils (cooked)) → 290 kcal · P 22.5 · C 50 · F 1
    - 120 g `quinoa` (Quinoa (cooked)) → 144 kcal · P 5.3 · C 25.2 · F 2.3
    - 120 g `mixed_veg` (Mixed veg) → 42 kcal · P 2.9 · C 7.2 · F 0.5
- **Halloumi & chickpea salad**  `curated_veg_halloumi_chickpea`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 526 kcal · P 32.8 g · C 45.7 g · F 24.1 g**
  - components:
    - 80 g `halloumi` (Halloumi) → 256 kcal · P 17.6 · C 1.6 · F 20
    - 150 g `chickpeas` (Chickpeas (cooked)) → 246 kcal · P 13.4 · C 40.5 · F 3.9
    - 120 g `salad` (Mixed salad) → 24 kcal · P 1.8 · C 3.6 · F 0.2
- **Paneer curry & rice**  `curated_veg_paneer_rice`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 495 kcal · P 24.5 g · C 51 g · F 21.9 g**
  - components:
    - 100 g `paneer` (Paneer) → 265 kcal · P 18 · C 3 · F 21
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 100 g `mixed_veg` (Mixed veg) → 35 kcal · P 2.4 · C 6 · F 0.4
- **Egg fried rice**  `curated_veg_egg_fried_rice`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 539 kcal · P 34.8 g · C 71.7 g · F 11.2 g**
  - components:
    - 100 g `eggs` (Whole eggs) → 143 kcal · P 13 · C 1 · F 10
    - 100 g `egg_whites` (Egg whites) → 52 kcal · P 11 · C 0.7 · F 0.2
    - 200 g `white_rice` (White rice (cooked)) → 260 kcal · P 5.4 · C 56 · F 0.6
    - 100 g `peas` (Garden peas) → 84 kcal · P 5.4 · C 14 · F 0.4
- **Tofu katsu & rice**  `curated_veg_tofu_katsu`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 478 kcal · P 32.3 g · C 59.7 g · F 12.8 g**
  - components:
    - 150 g `tofu_firm` (Firm tofu) → 216 kcal · P 25.5 · C 4.5 · F 12
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 80 g `mixed_veg` (Mixed veg) → 28 kcal · P 1.9 · C 4.8 · F 0.3
- **Jacket potato with cottage cheese**  `curated_veg_cottage_jacket`
  - slots: lunch · protein anchor: high
  - **totals: 357 kcal · P 24.9 g · C 57.3 g · F 1.9 g**
  - components:
    - 300 g `white_potato` (Potato (boiled)) → 237 kcal · P 6 · C 51 · F 0.3
    - 150 g `cottage_cheese` (Cottage cheese (low-fat)) → 108 kcal · P 18 · C 4.5 · F 1.5
    - 60 g `salad` (Mixed salad) → 12 kcal · P 0.9 · C 1.8 · F 0.1
- **Halloumi & quinoa bowl**  `curated_veg_halloumi_quinoa_bowl`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 471 kcal · P 26.6 g · C 39.1 g · F 23.2 g**
  - components:
    - 80 g `halloumi` (Halloumi) → 256 kcal · P 17.6 · C 1.6 · F 20
    - 150 g `quinoa` (Quinoa (cooked)) → 180 kcal · P 6.6 · C 31.5 · F 2.8
    - 100 g `mixed_veg` (Mixed veg) → 35 kcal · P 2.4 · C 6 · F 0.4
- **Paneer & chickpea curry**  `curated_veg_paneer_chickpea_curry`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 667 kcal · P 33.6 g · C 87.1 g · F 21.4 g**
  - components:
    - 80 g `paneer` (Paneer) → 212 kcal · P 14.4 · C 2.4 · F 16.8
    - 150 g `chickpeas` (Chickpeas (cooked)) → 246 kcal · P 13.4 · C 40.5 · F 3.9
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 60 g `spinach` (Spinach) → 14 kcal · P 1.7 · C 2.2 · F 0.2
- **Egg & lentil salad bowl**  `curated_veg_egg_lentil_salad`
  - slots: lunch · protein anchor: high
  - **totals: 467 kcal · P 39 g · C 44.5 g · F 16 g**
  - components:
    - 150 g `eggs` (Whole eggs) → 215 kcal · P 19.5 · C 1.5 · F 15
    - 200 g `lentils` (Lentils (cooked)) → 232 kcal · P 18 · C 40 · F 0.8
    - 100 g `salad` (Mixed salad) → 20 kcal · P 1.5 · C 3 · F 0.2
- **Meat-free mince pasta**  `curated_veg_quorn_pasta`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 438 kcal · P 32.4 g · C 65.9 g · F 5.8 g**
  - components:
    - 150 g `quorn_mince` (Quorn mince) → 143 kcal · P 21.8 · C 7.5 · F 3
    - 70 g `pasta` (Pasta (dry)) → 245 kcal · P 9.1 · C 50.4 · F 1.3
    - 100 g `tomato_sauce` (Tomato sauce) → 50 kcal · P 1.5 · C 8 · F 1.5
- **Cottage cheese jacket potato**  `curated_veg_cottage_jacket_potato`
  - slots: lunch · protein anchor: high
  - **totals: 393 kcal · P 30.9 g · C 58.8 g · F 2.4 g**
  - components:
    - 200 g `cottage_cheese` (Cottage cheese (low-fat)) → 144 kcal · P 24 · C 6 · F 2
    - 300 g `white_potato` (Potato (boiled)) → 237 kcal · P 6 · C 51 · F 0.3
    - 60 g `salad` (Mixed salad) → 12 kcal · P 0.9 · C 1.8 · F 0.1
- **Tofu & chickpea curry**  `curated_veg_tofu_chickpea_curry`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 575 kcal · P 38.5 g · C 73.5 g · F 15.1 g**
  - components:
    - 150 g `tofu_firm` (Firm tofu) → 216 kcal · P 25.5 · C 4.5 · F 12
    - 100 g `chickpeas` (Chickpeas (cooked)) → 164 kcal · P 8.9 · C 27 · F 2.6
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
- **Halloumi & salad wrap**  `curated_veg_halloumi_wrap`
  - slots: lunch · protein anchor: high
  - **totals: 579 kcal · P 30.4 g · C 55 g · F 26.4 g**
  - components:
    - 80 g `halloumi` (Halloumi) → 256 kcal · P 17.6 · C 1.6 · F 20
    - 60 g `tortilla` (Tortilla wrap) → 180 kcal · P 4.8 · C 30 · F 4.2
    - 80 g `chickpeas` (Chickpeas (cooked)) → 131 kcal · P 7.1 · C 21.6 · F 2.1
    - 60 g `salad` (Mixed salad) → 12 kcal · P 0.9 · C 1.8 · F 0.1
- **Veggie egg & paneer rice**  `curated_veg_egg_paneer_rice`
  - slots: lunch, dinner · protein anchor: high
  - **totals: 603 kcal · P 33 g · C 64.4 g · F 23.4 g**
  - components:
    - 100 g `eggs` (Whole eggs) → 143 kcal · P 13 · C 1 · F 10
    - 60 g `paneer` (Paneer) → 159 kcal · P 10.8 · C 1.8 · F 12.6
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 80 g `peas` (Garden peas) → 67 kcal · P 4.3 · C 11.2 · F 0.3

#### vegetarian · dinner

- **Tempeh & sweet potato**  `curated_veg_tempeh_sweet_potato`
  - slots: dinner · protein anchor: moderate
  - **totals: 468 kcal · P 30.9 g · C 63.2 g · F 13.9 g**
  - components:
    - 120 g `tempeh` (Tempeh) → 230 kcal · P 24 · C 9.6 · F 13.2
    - 250 g `sweet_potato` (Sweet potato) → 215 kcal · P 4 · C 50 · F 0.3
    - 100 g `spinach` (Spinach) → 23 kcal · P 2.9 · C 3.6 · F 0.4
- **Meat-free chilli & rice**  `curated_veg_quorn_chilli`
  - slots: dinner · protein anchor: moderate
  - **totals: 426 kcal · P 33.7 g · C 64.1 g · F 3.9 g**
  - components:
    - 150 g `quorn_mince` (Quorn mince) → 143 kcal · P 21.8 · C 7.5 · F 3
    - 100 g `kidney_beans` (Kidney beans (cooked)) → 127 kcal · P 8.7 · C 23 · F 0.5
    - 120 g `white_rice` (White rice (cooked)) → 156 kcal · P 3.2 · C 33.6 · F 0.4
- **Meat-free spaghetti bolognese**  `curated_veg_quorn_spag_bol`
  - slots: dinner · protein anchor: moderate
  - **totals: 448 kcal · P 32.7 g · C 67.5 g · F 6.1 g**
  - components:
    - 150 g `quorn_mince` (Quorn mince) → 143 kcal · P 21.8 · C 7.5 · F 3
    - 70 g `pasta` (Pasta (dry)) → 245 kcal · P 9.1 · C 50.4 · F 1.3
    - 120 g `tomato_sauce` (Tomato sauce) → 60 kcal · P 1.8 · C 9.6 · F 1.8
- **Halloumi fajitas**  `curated_veg_halloumi_fajitas`
  - slots: dinner · protein anchor: high
  - **totals: 746 kcal · P 34.7 g · C 74.6 g · F 34.1 g**
  - components:
    - 100 g `halloumi` (Halloumi) → 320 kcal · P 22 · C 2 · F 25
    - 120 g `tortilla` (Tortilla wrap) → 360 kcal · P 9.6 · C 60 · F 8.4
    - 120 g `stirfry_veg` (Stir-fry veg) → 48 kcal · P 2.5 · C 9 · F 0.6
    - 60 g `salsa` (Salsa) → 18 kcal · P 0.6 · C 3.6 · F 0.1
- **Paneer saag & potato**  `curated_veg_paneer_saag_potato`
  - slots: dinner · protein anchor: high
  - **totals: 451 kcal · P 25.5 g · C 41.3 g · F 21.7 g**
  - components:
    - 100 g `paneer` (Paneer) → 265 kcal · P 18 · C 3 · F 21
    - 200 g `white_potato` (Potato (boiled)) → 158 kcal · P 4 · C 34 · F 0.2
    - 120 g `spinach` (Spinach) → 28 kcal · P 3.5 · C 4.3 · F 0.5
- **Meat-free mince & sweet potato**  `curated_veg_quorn_sweet_potato`
  - slots: dinner · protein anchor: moderate
  - **totals: 389 kcal · P 27.6 g · C 64.5 g · F 3.5 g**
  - components:
    - 150 g `quorn_mince` (Quorn mince) → 143 kcal · P 21.8 · C 7.5 · F 3
    - 250 g `sweet_potato` (Sweet potato) → 215 kcal · P 4 · C 50 · F 0.3
    - 100 g `green_beans` (Green beans) → 31 kcal · P 1.8 · C 7 · F 0.2

#### vegetarian · snack

- **Cottage cheese, pineapple & rice cakes**  `curated_veg_cottage_pineapple`
  - slots: snack · protein anchor: high
  - **totals: 287 kcal · P 26.4 g · C 38.7 g · F 2.8 g**
  - components:
    - 200 g `cottage_cheese` (Cottage cheese (low-fat)) → 144 kcal · P 24 · C 6 · F 2
    - 100 g `pineapple` (Pineapple) → 50 kcal · P 0.5 · C 13 · F 0.1
    - 24 g `rice_cakes` (Rice cakes) → 93 kcal · P 1.9 · C 19.7 · F 0.7
- **Greek yogurt, whey & almonds**  `curated_veg_yog_whey_almonds`
  - slots: snack · protein anchor: high
  - **totals: 254 kcal · P 30.2 g · C 10.5 g · F 12.9 g**
  - components:
    - 150 g `greek_yogurt_2` (Greek yogurt (2%)) → 110 kcal · P 15 · C 6 · F 4.5
    - 15 g `whey` (Whey protein) → 57 kcal · P 12 · C 1.2 · F 0.9
    - 15 g `almonds` (Almonds) → 87 kcal · P 3.2 · C 3.3 · F 7.5
- **Edamame & boiled egg**  `curated_veg_edamame_egg`
  - slots: snack · protein anchor: moderate
  - **totals: 193 kcal · P 18.5 g · C 9.5 g · F 10 g**
  - components:
    - 100 g `edamame` (Edamame) → 121 kcal · P 12 · C 9 · F 5
    - 50 g `eggs` (Whole eggs) → 72 kcal · P 6.5 · C 0.5 · F 5
- **Skyr & berries pot**  `curated_veg_skyr_berries_pot`
  - slots: snack · protein anchor: high
  - **totals: 130 kcal · P 17 g · C 14 g · F 0.4 g**
  - components:
    - 150 g `skyr` (Skyr) → 95 kcal · P 16.5 · C 6 · F 0.3
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
- **Whey shake & banana**  `curated_veg_whey_banana_shake`
  - slots: snack · protein anchor: high
  - **totals: 291 kcal · P 33.6 g · C 37.9 g · F 2.4 g**
  - components:
    - 30 g `whey` (Whey protein) → 114 kcal · P 24 · C 2.4 · F 1.8
    - 250 g `milk_skimmed` (Skimmed milk) → 88 kcal · P 8.5 · C 12.5 · F 0.3
    - 100 g `banana` (Banana) → 89 kcal · P 1.1 · C 23 · F 0.3
- **Greek yogurt, PB & banana**  `curated_veg_yog_pb_banana`
  - slots: snack · protein anchor: high
  - **totals: 277 kcal · P 24.7 g · C 29.4 g · F 7.7 g**
  - components:
    - 200 g `greek_yogurt_0` (Greek yogurt (0%)) → 118 kcal · P 20 · C 8 · F 0
    - 15 g `peanut_butter` (Peanut butter) → 88 kcal · P 3.8 · C 3 · F 7.5
    - 80 g `banana` (Banana) → 71 kcal · P 0.9 · C 18.4 · F 0.2
- **Cottage cheese, seeds & apple**  `curated_veg_cottage_seeds_apple`
  - slots: snack · protein anchor: high
  - **totals: 264 kcal · P 27.1 g · C 21.7 g · F 7.8 g**
  - components:
    - 200 g `cottage_cheese` (Cottage cheese (low-fat)) → 144 kcal · P 24 · C 6 · F 2
    - 12 g `mixed_seeds` (Mixed seeds) → 68 kcal · P 2.8 · C 1.7 · F 5.6
    - 100 g `apple` (Apple) → 52 kcal · P 0.3 · C 14 · F 0.2
- **Skyr & whey berry bowl**  `curated_veg_skyr_whey_berries`
  - slots: snack · protein anchor: high
  - **totals: 187 kcal · P 29 g · C 15.2 g · F 1.3 g**
  - components:
    - 150 g `skyr` (Skyr) → 95 kcal · P 16.5 · C 6 · F 0.3
    - 15 g `whey` (Whey protein) → 57 kcal · P 12 · C 1.2 · F 0.9
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
- **Egg white & cottage rice cakes**  `curated_veg_eggwhite_cottage_ricecakes`
  - slots: snack · protein anchor: high
  - **totals: 243 kcal · P 30.4 g · C 23.7 g · F 2 g**
  - components:
    - 150 g `egg_whites` (Egg whites) → 78 kcal · P 16.5 · C 1 · F 0.3
    - 100 g `cottage_cheese` (Cottage cheese (low-fat)) → 72 kcal · P 12 · C 3 · F 1
    - 24 g `rice_cakes` (Rice cakes) → 93 kcal · P 1.9 · C 19.7 · F 0.7
- **Greek yogurt & honey pot**  `curated_veg_yogurt_honey_pot`
  - slots: snack · protein anchor: high
  - **totals: 194 kcal · P 25 g · C 22.3 g · F 0 g**
  - components:
    - 250 g `greek_yogurt_0` (Greek yogurt (0%)) → 148 kcal · P 25 · C 10 · F 0
    - 15 g `honey` (Honey) → 46 kcal · P 0 · C 12.3 · F 0
- **Cottage cheese & berries bowl**  `curated_veg_cottage_berries_bowl`
  - slots: snack · protein anchor: high
  - **totals: 209 kcal · P 24.5 g · C 22.2 g · F 2.1 g**
  - components:
    - 200 g `cottage_cheese` (Cottage cheese (low-fat)) → 144 kcal · P 24 · C 6 · F 2
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
    - 10 g `honey` (Honey) → 30 kcal · P 0 · C 8.2 · F 0

#### vegetarian · preworkout

- **Skyr, oats & banana**  `curated_veg_pre_skyr_oats_banana`
  - slots: preworkout · protein anchor: high
  - **totals: 367 kcal · P 28.3 g · C 57.8 g · F 3.5 g**
  - components:
    - 200 g `skyr` (Skyr) → 126 kcal · P 22 · C 8 · F 0.4
    - 40 g `oats` (Porridge oats) → 152 kcal · P 5.2 · C 26.8 · F 2.8
    - 100 g `banana` (Banana) → 89 kcal · P 1.1 · C 23 · F 0.3
- **Greek yogurt, rice cakes & honey**  `curated_veg_pre_yogurt_ricecakes_honey`
  - slots: preworkout · protein anchor: high
  - **totals: 257 kcal · P 21.9 g · C 40 g · F 0.7 g**
  - components:
    - 200 g `greek_yogurt_0` (Greek yogurt (0%)) → 118 kcal · P 20 · C 8 · F 0
    - 24 g `rice_cakes` (Rice cakes) → 93 kcal · P 1.9 · C 19.7 · F 0.7
    - 15 g `honey` (Honey) → 46 kcal · P 0 · C 12.3 · F 0
- **Cottage cheese bagel**  `curated_veg_pre_cottage_bagel`
  - slots: preworkout · protein anchor: high
  - **totals: 368 kcal · P 26.5 g · C 57.8 g · F 2.9 g**
  - components:
    - 150 g `cottage_cheese` (Cottage cheese (low-fat)) → 108 kcal · P 18 · C 4.5 · F 1.5
    - 85 g `bagel` (Bagel) → 230 kcal · P 8.5 · C 45.1 · F 1.4
    - 10 g `honey` (Honey) → 30 kcal · P 0 · C 8.2 · F 0

#### vegetarian · postworkout

- **Skyr, berries & honey**  `curated_veg_post_skyr_berries_honey`
  - slots: postworkout · protein anchor: high
  - **totals: 248 kcal · P 28.1 g · C 32.3 g · F 0.6 g**
  - components:
    - 250 g `skyr` (Skyr) → 158 kcal · P 27.5 · C 10 · F 0.5
    - 100 g `berries` (Mixed berries) → 44 kcal · P 0.6 · C 10 · F 0.1
    - 15 g `honey` (Honey) → 46 kcal · P 0 · C 12.3 · F 0
- **Whey, rice cakes & banana**  `curated_veg_post_whey_ricecakes_banana`
  - slots: postworkout · protein anchor: high
  - **totals: 375 kcal · P 35.7 g · C 55.4 g · F 3.7 g**
  - components:
    - 40 g `whey` (Whey protein) → 152 kcal · P 32 · C 3.2 · F 2.4
    - 30 g `rice_cakes` (Rice cakes) → 116 kcal · P 2.4 · C 24.6 · F 0.9
    - 120 g `banana` (Banana) → 107 kcal · P 1.3 · C 27.6 · F 0.4
- **Greek yogurt, granola & banana**  `curated_veg_post_yogurt_granola_banana`
  - slots: postworkout · protein anchor: high
  - **totals: 387 kcal · P 25.1 g · C 56.6 g · F 6.7 g**
  - components:
    - 200 g `greek_yogurt_0` (Greek yogurt (0%)) → 118 kcal · P 20 · C 8 · F 0
    - 40 g `granola` (Granola) → 180 kcal · P 4 · C 25.6 · F 6.4
    - 100 g `banana` (Banana) → 89 kcal · P 1.1 · C 23 · F 0.3

### vegan (45)


#### vegan · breakfast

- **Soya protein oats & banana**  `curated_vg_soy_oats_banana`
  - slots: breakfast · protein anchor: moderate
  - **totals: 442 kcal · P 33.1 g · C 69.3 g · F 5.5 g**
  - components:
    - 60 g `oats` (Porridge oats) → 227 kcal · P 7.8 · C 40.2 · F 4.2
    - 30 g `soy_protein` (Soya protein) → 108 kcal · P 24 · C 1.5 · F 0.9
    - 120 g `banana` (Banana) → 107 kcal · P 1.3 · C 27.6 · F 0.4
- **Soya yogurt, protein & oats**  `curated_vg_soy_yog_oats`
  - slots: breakfast · protein anchor: moderate
  - **totals: 383 kcal · P 29.7 g · C 45.6 g · F 10 g**
  - components:
    - 200 g `soy_yogurt_hp` (High-protein soya yogurt) → 140 kcal · P 12 · C 10 · F 6
    - 15 g `pea_protein` (Pea protein) → 56 kcal · P 12 · C 0.8 · F 1.1
    - 40 g `oats` (Porridge oats) → 152 kcal · P 5.2 · C 26.8 · F 2.8
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
- **Pea protein & PB smoothie**  `curated_vg_smoothie_pb`
  - slots: breakfast, snack · protein anchor: moderate
  - **totals: 367 kcal · P 37.9 g · C 30.1 g · F 13.7 g**
  - components:
    - 33 g `pea_protein` (Pea protein) → 124 kcal · P 26.4 · C 1.7 · F 2.3
    - 100 g `banana` (Banana) → 89 kcal · P 1.1 · C 23 · F 0.3
    - 15 g `peanut_butter` (Peanut butter) → 88 kcal · P 3.8 · C 3 · F 7.5
    - 200 g `soy_milk` (Soya milk) → 66 kcal · P 6.6 · C 2.4 · F 3.6
- **Tofu scramble on toast**  `curated_vg_tofu_scramble`
  - slots: breakfast · protein anchor: moderate
  - **totals: 401 kcal · P 40.9 g · C 24.6 g · F 17.6 g**
  - components:
    - 200 g `tofu_firm` (Firm tofu) → 288 kcal · P 34 · C 6 · F 16
    - 40 g `wholemeal_bread` (Wholemeal bread) → 99 kcal · P 5.2 · C 16.4 · F 1.4
    - 60 g `spinach` (Spinach) → 14 kcal · P 1.7 · C 2.2 · F 0.2
- **Tofu & avocado toast**  `curated_vg_tofu_avocado_toast`
  - slots: breakfast · protein anchor: moderate
  - **totals: 444 kcal · P 34.3 g · C 33.6 g · F 21.5 g**
  - components:
    - 150 g `tofu_firm` (Firm tofu) → 216 kcal · P 25.5 · C 4.5 · F 12
    - 60 g `wholemeal_bread` (Wholemeal bread) → 148 kcal · P 7.8 · C 24.6 · F 2
    - 50 g `avocado` (Avocado) → 80 kcal · P 1 · C 4.5 · F 7.5
- **Soya yogurt oats & seeds**  `curated_vg_soy_yog_oats_seeds`
  - slots: breakfast · protein anchor: moderate
  - **totals: 414 kcal · P 32 g · C 39.3 g · F 14.9 g**
  - components:
    - 200 g `soy_yogurt_hp` (High-protein soya yogurt) → 140 kcal · P 12 · C 10 · F 6
    - 40 g `oats` (Porridge oats) → 152 kcal · P 5.2 · C 26.8 · F 2.8
    - 12 g `mixed_seeds` (Mixed seeds) → 68 kcal · P 2.8 · C 1.7 · F 5.6
    - 15 g `soy_protein` (Soya protein) → 54 kcal · P 12 · C 0.8 · F 0.5
- **Pea protein overnight oats**  `curated_vg_pea_overnight_oats`
  - slots: breakfast · protein anchor: moderate
  - **totals: 402 kcal · P 30 g · C 55.3 g · F 8.7 g**
  - components:
    - 50 g `oats` (Porridge oats) → 190 kcal · P 6.5 · C 33.5 · F 3.5
    - 20 g `pea_protein` (Pea protein) → 75 kcal · P 16 · C 1 · F 1.4
    - 200 g `soy_milk` (Soya milk) → 66 kcal · P 6.6 · C 2.4 · F 3.6
    - 80 g `banana` (Banana) → 71 kcal · P 0.9 · C 18.4 · F 0.2
- **Tofu scramble & beans**  `curated_vg_tofu_scramble_beans`
  - slots: breakfast · protein anchor: moderate
  - **totals: 481 kcal · P 44.8 g · C 38 g · F 18.1 g**
  - components:
    - 200 g `tofu_firm` (Firm tofu) → 288 kcal · P 34 · C 6 · F 16
    - 120 g `baked_beans` (Baked beans) → 94 kcal · P 5.6 · C 15.6 · F 0.7
    - 40 g `wholemeal_bread` (Wholemeal bread) → 99 kcal · P 5.2 · C 16.4 · F 1.4
- **Soya protein berry smoothie**  `curated_vg_soy_smoothie_oats`
  - slots: breakfast, snack · protein anchor: moderate
  - **totals: 323 kcal · P 35 g · C 32 g · F 6.7 g**
  - components:
    - 30 g `soy_protein` (Soya protein) → 108 kcal · P 24 · C 1.5 · F 0.9
    - 30 g `oats` (Porridge oats) → 114 kcal · P 3.9 · C 20.1 · F 2.1
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1
    - 200 g `soy_milk` (Soya milk) → 66 kcal · P 6.6 · C 2.4 · F 3.6
- **Tofu, seeds & avocado toast**  `curated_vg_tofu_avo_seeds_toast`
  - slots: breakfast · protein anchor: moderate
  - **totals: 485 kcal · P 36.4 g · C 34.1 g · F 24.7 g**
  - components:
    - 150 g `tofu_firm` (Firm tofu) → 216 kcal · P 25.5 · C 4.5 · F 12
    - 60 g `wholemeal_bread` (Wholemeal bread) → 148 kcal · P 7.8 · C 24.6 · F 2
    - 40 g `avocado` (Avocado) → 64 kcal · P 0.8 · C 3.6 · F 6
    - 10 g `mixed_seeds` (Mixed seeds) → 57 kcal · P 2.3 · C 1.4 · F 4.7
- **Soya yogurt & berries pot**  `curated_vg_soy_yogurt_berries_pot`
  - slots: breakfast, snack · protein anchor: moderate
  - **totals: 285 kcal · P 31.5 g · C 21.5 g · F 9 g**
  - components:
    - 250 g `soy_yogurt_hp` (High-protein soya yogurt) → 175 kcal · P 15 · C 12.5 · F 7.5
    - 20 g `pea_protein` (Pea protein) → 75 kcal · P 16 · C 1 · F 1.4
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1

#### vegan · lunch

- **Seitan, rice & veg stir-fry**  `curated_vg_seitan_rice_veg`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 477 kcal · P 39.9 g · C 64.6 g · F 2.4 g**
  - components:
    - 130 g `seitan` (Seitan) → 195 kcal · P 32.5 · C 5.2 · F 1.3
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 120 g `stirfry_veg` (Stir-fry veg) → 48 kcal · P 2.5 · C 9 · F 0.6
- **Tempeh, quinoa & roast veg**  `curated_vg_tempeh_quinoa`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 487 kcal · P 32.2 g · C 42 g · F 24 g**
  - components:
    - 120 g `tempeh` (Tempeh) → 230 kcal · P 24 · C 9.6 · F 13.2
    - 120 g `quinoa` (Quinoa (cooked)) → 144 kcal · P 5.3 · C 25.2 · F 2.3
    - 120 g `mixed_veg` (Mixed veg) → 42 kcal · P 2.9 · C 7.2 · F 0.5
    - 8 g `olive_oil` (Olive oil) → 71 kcal · P 0 · C 0 · F 8
- **Tofu burrito bowl**  `curated_vg_tofu_burrito`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 514 kcal · P 36.1 g · C 64.9 g · F 12.9 g**
  - components:
    - 150 g `tofu_firm` (Firm tofu) → 216 kcal · P 25.5 · C 4.5 · F 12
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 80 g `black_beans` (Black beans (cooked)) → 91 kcal · P 6.1 · C 16 · F 0.4
    - 40 g `salsa` (Salsa) → 12 kcal · P 0.4 · C 2.4 · F 0
- **High-protein lentil pasta**  `curated_vg_lentil_pasta`
  - slots: lunch, dinner · protein anchor: carb_protein
  - **totals: 445 kcal · P 29.2 g · C 65.6 g · F 6.2 g**
  - components:
    - 100 g `lentil_pasta` (Lentil pasta (dry)) → 350 kcal · P 25 · C 50 · F 4
    - 120 g `tomato_sauce` (Tomato sauce) → 60 kcal · P 1.8 · C 9.6 · F 1.8
    - 100 g `mixed_veg` (Mixed veg) → 35 kcal · P 2.4 · C 6 · F 0.4
- **Tofu, chickpea & quinoa salad**  `curated_vg_chickpea_quinoa`
  - slots: lunch · protein anchor: moderate
  - **totals: 552 kcal · P 33.6 g · C 59.4 g · F 21.2 g**
  - components:
    - 100 g `tofu_firm` (Firm tofu) → 144 kcal · P 17 · C 3 · F 8
    - 120 g `chickpeas` (Chickpeas (cooked)) → 197 kcal · P 10.7 · C 32.4 · F 3.1
    - 100 g `quinoa` (Quinoa (cooked)) → 120 kcal · P 4.4 · C 21 · F 1.9
    - 100 g `salad` (Mixed salad) → 20 kcal · P 1.5 · C 3 · F 0.2
    - 8 g `olive_oil` (Olive oil) → 71 kcal · P 0 · C 0 · F 8
- **Edamame, rice & veg**  `curated_vg_edamame_rice`
  - slots: lunch · protein anchor: moderate
  - **totals: 472 kcal · P 30.5 g · C 66 g · F 10.9 g**
  - components:
    - 200 g `edamame` (Edamame) → 242 kcal · P 24 · C 18 · F 10
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 100 g `mixed_veg` (Mixed veg) → 35 kcal · P 2.4 · C 6 · F 0.4
- **Tofu, black bean & sweet potato bowl**  `curated_vg_blackbean_sweetpot`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 522 kcal · P 34 g · C 79 g · F 9.4 g**
  - components:
    - 100 g `tofu_firm` (Firm tofu) → 144 kcal · P 17 · C 3 · F 8
    - 150 g `black_beans` (Black beans (cooked)) → 171 kcal · P 11.4 · C 30 · F 0.8
    - 200 g `sweet_potato` (Sweet potato) → 172 kcal · P 3.2 · C 40 · F 0.2
    - 100 g `mixed_veg` (Mixed veg) → 35 kcal · P 2.4 · C 6 · F 0.4
- **Tofu & noodle stir-fry**  `curated_vg_tofu_noodles`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 616 kcal · P 45.5 g · C 71 g · F 18.6 g**
  - components:
    - 200 g `tofu_firm` (Firm tofu) → 288 kcal · P 34 · C 6 · F 16
    - 200 g `noodles` (Noodles (cooked)) → 280 kcal · P 9 · C 56 · F 2
    - 120 g `stirfry_veg` (Stir-fry veg) → 48 kcal · P 2.5 · C 9 · F 0.6
- **Tofu & sweet potato bowl**  `curated_vg_tofu_sweet_potato`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 494 kcal · P 40 g · C 53 g · F 16.6 g**
  - components:
    - 200 g `tofu_firm` (Firm tofu) → 288 kcal · P 34 · C 6 · F 16
    - 200 g `sweet_potato` (Sweet potato) → 172 kcal · P 3.2 · C 40 · F 0.2
    - 100 g `broccoli` (Broccoli) → 34 kcal · P 2.8 · C 7 · F 0.4
- **Chickpea & lentil curry**  `curated_vg_chickpea_lentil_curry`
  - slots: lunch, dinner · protein anchor: carb_protein
  - **totals: 653 kcal · P 32.6 g · C 118.2 g · F 6.3 g**
  - components:
    - 200 g `chickpeas` (Chickpeas (cooked)) → 328 kcal · P 17.8 · C 54 · F 5.2
    - 100 g `lentils` (Lentils (cooked)) → 116 kcal · P 9 · C 20 · F 0.4
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 60 g `spinach` (Spinach) → 14 kcal · P 1.7 · C 2.2 · F 0.2
- **Edamame peanut noodles**  `curated_vg_edamame_peanut_noodles`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 605 kcal · P 37.2 g · C 78.3 g · F 18.3 g**
  - components:
    - 200 g `edamame` (Edamame) → 242 kcal · P 24 · C 18 · F 10
    - 180 g `noodles` (Noodles (cooked)) → 252 kcal · P 8.1 · C 50.4 · F 1.8
    - 100 g `stirfry_veg` (Stir-fry veg) → 40 kcal · P 2.1 · C 7.5 · F 0.5
    - 12 g `peanut_butter` (Peanut butter) → 71 kcal · P 3 · C 2.4 · F 6
- **Edamame & quinoa salad**  `curated_vg_edamame_quinoa_salad`
  - slots: lunch · protein anchor: moderate
  - **totals: 477 kcal · P 32.8 g · C 48.7 g · F 19 g**
  - components:
    - 200 g `edamame` (Edamame) → 242 kcal · P 24 · C 18 · F 10
    - 120 g `quinoa` (Quinoa (cooked)) → 144 kcal · P 5.3 · C 25.2 · F 2.3
    - 100 g `salad` (Mixed salad) → 20 kcal · P 1.5 · C 3 · F 0.2
    - 12 g `tahini` (Tahini) → 71 kcal · P 2 · C 2.5 · F 6.5
- **Tofu curry & rice**  `curated_vg_tofu_curry_rice`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 557 kcal · P 41.3 g · C 62.4 g · F 16.9 g**
  - components:
    - 200 g `tofu_firm` (Firm tofu) → 288 kcal · P 34 · C 6 · F 16
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 100 g `mixed_veg` (Mixed veg) → 35 kcal · P 2.4 · C 6 · F 0.4
- **Black bean & soya burrito**  `curated_vg_blackbean_soya_burrito`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 460 kcal · P 35.1 g · C 68.4 g · F 5.2 g**
  - components:
    - 40 g `tvp_dry` (Soya mince (dry)) → 131 kcal · P 20.8 · C 12 · F 0.4
    - 120 g `black_beans` (Black beans (cooked)) → 137 kcal · P 9.1 · C 24 · F 0.6
    - 60 g `tortilla` (Tortilla wrap) → 180 kcal · P 4.8 · C 30 · F 4.2
    - 40 g `salsa` (Salsa) → 12 kcal · P 0.4 · C 2.4 · F 0
- **Soya mince, quinoa & roast veg**  `curated_vg_soya_quinoa_veg`
  - slots: lunch, dinner · protein anchor: moderate
  - **totals: 406 kcal · P 30.3 g · C 50.7 g · F 9.7 g**
  - components:
    - 40 g `tvp_dry` (Soya mince (dry)) → 131 kcal · P 20.8 · C 12 · F 0.4
    - 150 g `quinoa` (Quinoa (cooked)) → 180 kcal · P 6.6 · C 31.5 · F 2.8
    - 120 g `mixed_veg` (Mixed veg) → 42 kcal · P 2.9 · C 7.2 · F 0.5
    - 6 g `olive_oil` (Olive oil) → 53 kcal · P 0 · C 0 · F 6

#### vegan · dinner

- **Soya mince chilli with rice**  `curated_vg_tvp_chilli_rice`
  - slots: dinner · protein anchor: moderate
  - **totals: 561 kcal · P 42 g · C 92.6 g · F 3.1 g**
  - components:
    - 50 g `tvp_dry` (Soya mince (dry)) → 164 kcal · P 26 · C 15 · F 0.5
    - 120 g `kidney_beans` (Kidney beans (cooked)) → 152 kcal · P 10.4 · C 27.6 · F 0.6
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 100 g `tomato_sauce` (Tomato sauce) → 50 kcal · P 1.5 · C 8 · F 1.5
- **Lentil dahl & rice**  `curated_vg_lentil_dahl`
  - slots: dinner · protein anchor: carb_protein
  - **totals: 578 kcal · P 28 g · C 101.4 g · F 4.5 g**
  - components:
    - 320 g `lentil_dahl` (Red lentil dahl) → 371 kcal · P 22.4 · C 57.6 · F 3.8
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5
    - 50 g `spinach` (Spinach) → 12 kcal · P 1.5 · C 1.8 · F 0.2
- **Soya mince bolognese**  `curated_vg_tvp_bolognese`
  - slots: dinner · protein anchor: moderate
  - **totals: 452 kcal · P 34.3 g · C 73.5 g · F 3.6 g**
  - components:
    - 45 g `tvp_dry` (Soya mince (dry)) → 147 kcal · P 23.4 · C 13.5 · F 0.5
    - 70 g `pasta` (Pasta (dry)) → 245 kcal · P 9.1 · C 50.4 · F 1.3
    - 120 g `tomato_sauce` (Tomato sauce) → 60 kcal · P 1.8 · C 9.6 · F 1.8
- **Seitan, potatoes & greens**  `curated_vg_seitan_potato_greens`
  - slots: dinner · protein anchor: moderate
  - **totals: 424 kcal · P 39.3 g · C 54.7 g · F 1.8 g**
  - components:
    - 130 g `seitan` (Seitan) → 195 kcal · P 32.5 · C 5.2 · F 1.3
    - 250 g `white_potato` (Potato (boiled)) → 198 kcal · P 5 · C 42.5 · F 0.3
    - 100 g `green_beans` (Green beans) → 31 kcal · P 1.8 · C 7 · F 0.2
- **Lentil dahl with chickpeas**  `curated_vg_lentil_dahl_chickpea`
  - slots: dinner · protein anchor: carb_protein
  - **totals: 643 kcal · P 31.4 g · C 111 g · F 6.5 g**
  - components:
    - 250 g `lentil_dahl` (Red lentil dahl) → 290 kcal · P 17.5 · C 45 · F 3
    - 120 g `chickpeas` (Chickpeas (cooked)) → 197 kcal · P 10.7 · C 32.4 · F 3.1
    - 120 g `white_rice` (White rice (cooked)) → 156 kcal · P 3.2 · C 33.6 · F 0.4

#### vegan · snack

- **Pea protein shake & berries**  `curated_vg_pea_shake_berries`
  - slots: snack · protein anchor: moderate
  - **totals: 168 kcal · P 27 g · C 11.7 g · F 2.4 g**
  - components:
    - 33 g `pea_protein` (Pea protein) → 124 kcal · P 26.4 · C 1.7 · F 2.3
    - 100 g `berries` (Mixed berries) → 44 kcal · P 0.6 · C 10 · F 0.1
- **Soya yogurt, granola & peanut butter**  `curated_vg_soy_yog_granola_pb`
  - slots: snack · protein anchor: moderate
  - **totals: 324 kcal · P 17.5 g · C 28.4 g · F 16 g**
  - components:
    - 200 g `soy_yogurt_hp` (High-protein soya yogurt) → 140 kcal · P 12 · C 10 · F 6
    - 25 g `granola` (Granola) → 113 kcal · P 2.5 · C 16 · F 4
    - 12 g `peanut_butter` (Peanut butter) → 71 kcal · P 3 · C 2.4 · F 6
- **Soya yogurt, PB & banana**  `curated_vg_soy_yog_pb_banana`
  - slots: snack · protein anchor: moderate
  - **totals: 338 kcal · P 27.9 g · C 31.6 g · F 13.3 g**
  - components:
    - 200 g `soy_yogurt_hp` (High-protein soya yogurt) → 140 kcal · P 12 · C 10 · F 6
    - 15 g `pea_protein` (Pea protein) → 56 kcal · P 12 · C 0.8 · F 1.1
    - 12 g `peanut_butter` (Peanut butter) → 71 kcal · P 3 · C 2.4 · F 6
    - 80 g `banana` (Banana) → 71 kcal · P 0.9 · C 18.4 · F 0.2
- **Edamame & tahini rice cakes**  `curated_vg_edamame_tahini_ricecakes`
  - slots: snack · protein anchor: moderate
  - **totals: 335 kcal · P 21.6 g · C 35.3 g · F 13.6 g**
  - components:
    - 150 g `edamame` (Edamame) → 182 kcal · P 18 · C 13.5 · F 7.5
    - 24 g `rice_cakes` (Rice cakes) → 93 kcal · P 1.9 · C 19.7 · F 0.7
    - 10 g `tahini` (Tahini) → 60 kcal · P 1.7 · C 2.1 · F 5.4
- **Pea protein oat shake**  `curated_vg_pea_oat_shake`
  - slots: snack · protein anchor: moderate
  - **totals: 293 kcal · P 34.5 g · C 24 g · F 7.8 g**
  - components:
    - 30 g `pea_protein` (Pea protein) → 113 kcal · P 24 · C 1.5 · F 2.1
    - 30 g `oats` (Porridge oats) → 114 kcal · P 3.9 · C 20.1 · F 2.1
    - 200 g `soy_milk` (Soya milk) → 66 kcal · P 6.6 · C 2.4 · F 3.6
- **Soya yogurt, apple & almonds**  `curated_vg_soy_apple_almonds`
  - slots: snack · protein anchor: moderate
  - **totals: 315 kcal · P 26.8 g · C 27.4 g · F 12.7 g**
  - components:
    - 15 g `soy_protein` (Soya protein) → 54 kcal · P 12 · C 0.8 · F 0.5
    - 200 g `soy_yogurt_hp` (High-protein soya yogurt) → 140 kcal · P 12 · C 10 · F 6
    - 100 g `apple` (Apple) → 52 kcal · P 0.3 · C 14 · F 0.2
    - 12 g `almonds` (Almonds) → 69 kcal · P 2.5 · C 2.6 · F 6
- **Soya protein shake & apple**  `curated_vg_soy_shake_apple`
  - slots: snack · protein anchor: moderate
  - **totals: 243 kcal · P 32.6 g · C 18.5 g · F 5.6 g**
  - components:
    - 30 g `soy_protein` (Soya protein) → 108 kcal · P 24 · C 1.5 · F 0.9
    - 250 g `soy_milk` (Soya milk) → 83 kcal · P 8.3 · C 3 · F 4.5
    - 100 g `apple` (Apple) → 52 kcal · P 0.3 · C 14 · F 0.2
- **Edamame pot**  `curated_vg_edamame_pot`
  - slots: snack · protein anchor: moderate
  - **totals: 242 kcal · P 24 g · C 18 g · F 10 g**
  - components:
    - 200 g `edamame` (Edamame) → 242 kcal · P 24 · C 18 · F 10

#### vegan · preworkout

- **Soya protein, oats & banana**  `curated_vg_pre_soy_oats_banana`
  - slots: preworkout · protein anchor: moderate
  - **totals: 405 kcal · P 31.8 g · C 62.6 g · F 4.8 g**
  - components:
    - 30 g `soy_protein` (Soya protein) → 108 kcal · P 24 · C 1.5 · F 0.9
    - 50 g `oats` (Porridge oats) → 190 kcal · P 6.5 · C 33.5 · F 3.5
    - 120 g `banana` (Banana) → 107 kcal · P 1.3 · C 27.6 · F 0.4
- **Pea protein, rice cakes & banana**  `curated_vg_pre_pea_ricecakes_banana`
  - slots: preworkout · protein anchor: moderate
  - **totals: 336 kcal · P 27.7 g · C 53.7 g · F 3.4 g**
  - components:
    - 30 g `pea_protein` (Pea protein) → 113 kcal · P 24 · C 1.5 · F 2.1
    - 30 g `rice_cakes` (Rice cakes) → 116 kcal · P 2.4 · C 24.6 · F 0.9
    - 120 g `banana` (Banana) → 107 kcal · P 1.3 · C 27.6 · F 0.4
- **Tofu & white rice**  `curated_vg_pre_tofu_white_rice`
  - slots: preworkout · protein anchor: moderate
  - **totals: 411 kcal · P 29.6 g · C 46.5 g · F 12.5 g**
  - components:
    - 150 g `tofu_firm` (Firm tofu) → 216 kcal · P 25.5 · C 4.5 · F 12
    - 150 g `white_rice` (White rice (cooked)) → 195 kcal · P 4.1 · C 42 · F 0.5

#### vegan · postworkout

- **Soya protein & banana shake**  `curated_vg_post_soy_banana_shake`
  - slots: postworkout · protein anchor: moderate
  - **totals: 316 kcal · P 37.6 g · C 32.4 g · F 5.9 g**
  - components:
    - 35 g `soy_protein` (Soya protein) → 126 kcal · P 28 · C 1.8 · F 1
    - 120 g `banana` (Banana) → 107 kcal · P 1.3 · C 27.6 · F 0.4
    - 250 g `soy_milk` (Soya milk) → 83 kcal · P 8.3 · C 3 · F 4.5
- **Tofu, white rice & veg**  `curated_vg_post_tofu_rice_veg`
  - slots: postworkout · protein anchor: moderate
  - **totals: 557 kcal · P 41.3 g · C 62.4 g · F 16.9 g**
  - components:
    - 200 g `tofu_firm` (Firm tofu) → 288 kcal · P 34 · C 6 · F 16
    - 180 g `white_rice` (White rice (cooked)) → 234 kcal · P 4.9 · C 50.4 · F 0.5
    - 100 g `mixed_veg` (Mixed veg) → 35 kcal · P 2.4 · C 6 · F 0.4
- **Pea protein, oats & berries**  `curated_vg_post_pea_oats_berries`
  - slots: postworkout · protein anchor: moderate
  - **totals: 393 kcal · P 36.3 g · C 50 g · F 6.7 g**
  - components:
    - 35 g `pea_protein` (Pea protein) → 131 kcal · P 28 · C 1.8 · F 2.4
    - 60 g `oats` (Porridge oats) → 227 kcal · P 7.8 · C 40.2 · F 4.2
    - 80 g `berries` (Mixed berries) → 35 kcal · P 0.5 · C 8 · F 0.1

