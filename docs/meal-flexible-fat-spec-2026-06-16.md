# Flexible-fat element — meal-by-meal specification

> **DRAFT — NOT APPROVED, NOT BUILT.** No code, no calculation, and no meal data
> have been changed. This does NOT change any nutrition target: protein basis
> (2.47 g/kg), fat target (phase 0.7–1.0 g/kg, hard floor 46 g) and carbs
> (= remaining calories) are the engine's, untouched. Its only purpose is to let
> the meal assembler HIT the fat target the app already shows the user.
> **TRACEABILITY GAP:** the fat choices below are grounded in GENERAL UK/
> bodybuilding sources, NOT the founder's "Volyume Curated Meal & Food Library:
> UK Bodybuilder Research Report" (not present in the repo). Must be checked
> against that report — and approved by the founder — before any build.

Status: SPEC ONLY (no code). Date: 2026-06-16.
Author task: research-grounded recommendation for a scalable "flexible fat"
element per curated meal, so the deterministic assembler can hit the fat
gram target precisely.

Source files read in full for this spec:
- `src/lib/food/curatedMeals.js` (the 61 meals — component lists quoted from source, not guessed)
- `src/lib/food/curatedFoods.js` (per-100g staple macros)
- `src/lib/food/foodRoles.js` (ROLE map, GRAM_RANGE, swap lists)
- `src/lib/food/mealPlanAssembler.js` (header, for the invariant language)

---

## 1. Goal & invariant

### Goal
The assembler (`mealPlanAssembler.js`) sizes a day to the engine's **calorie**
and **protein** targets, but it cannot land the **fat** gram target precisely:
the carb/fat split is whatever each meal's embedded fat happens to be. The fix
is to give most meals a small, **scalable** fat element (a drizzle of oil, a
spoon of nut butter, a sprinkle of seeds) that the solver can grow or shrink to
hit the fat target. Carbs then absorb the remaining calories.

### The agreed invariant (founder, this task)
- **Protein**: HARD. Held by the protein anchor; the fat lever does not touch it.
- **Calorie band**: HARD. Stays inside the engine's published `[kcalMin, kcalMax]`
  (the assembler's own ±10% band, per its header).
- **Fat**: closed to a **tolerance WITHIN the band** by scaling the flexible-fat
  element.
- **Carbs**: take the remainder.

This element is a **lever, not a macro overhaul**. Defaults are deliberately
modest (≈10–15 g oil, ≈15–20 g nuts/seeds) and scale only within the food's
gram range. It must respect the library's stated intent — "Protein-forward; a
deliberate lean/balanced fat spread across the set" (`curatedMeals.js` header).

---

## 2. Available flexible-fat foods (quoted from source)

Only foods that already exist in `curatedFoods.js` with `ROLE === 'fat'` may be
used. From `foodRoles.js` the fat keys are: `olive_oil, almonds, peanut_butter,
mixed_seeds, avocado, tahini, halloumi, paneer, cheddar_light`.

Per-100g macros (`curatedFoods.js`) and gram ranges (`foodRoles.js`
`gramRangeOf`: fat role default `[5, 60]`, with per-key overrides):

| key | name | kcal | P | C | F | range (g) | vegan-safe? |
|---|---|---|---|---|---|---|---|
| `olive_oil` | Olive oil | 884 | 0 | 0 | 100 | **[5, 30]** (override) | yes |
| `almonds` | Almonds | 579 | 21 | 22 | 50 | [5, 60] | yes |
| `peanut_butter` | Peanut butter | 588 | 25 | 20 | 50 | [5, 60] | yes |
| `mixed_seeds` | Mixed seeds | 567 | 23 | 14 | 47 | [5, 60] | yes |
| `tahini` | Tahini | 595 | 17 | 21 | 54 | [5, 60] | yes |
| `avocado` | Avocado | 160 | 2 | 9 | 15 | **[30, 150]** (override) | yes |
| `cheddar_light` | Reduced-fat cheddar | 311 | 27 | 0.1 | 22 | [5, 60] | **no (dairy)** |
| `halloumi` | Halloumi | 320 | 22 | 2 | 25 | [5, 60] | **no (dairy)** |
| `paneer` | Paneer | 265 | 18 | 3 | 21 | [5, 60] | **no (dairy)** |

**Vegan-safe fats:** `olive_oil, almonds, peanut_butter, mixed_seeds, avocado,
tahini`. **Dairy fats (vegetarian/omnivore only):** `cheddar_light, halloumi,
paneer`.

### Diet-safety rule (absolute, per task)
- Never assign `cheddar_light` / `halloumi` / `paneer` (dairy) to a **vegan** meal.
- For **vegetarian** meals, dairy fats are allowed (they are vegetarian); only
  meat/fish-derived fats would be barred, and none exist in the fat list.
- For **omnivore** meals, any fat is permissible.

### Notes on default sizing
- `olive_oil` is energy-dense (9 g fat per 10 g); a default of **10–12 g**
  (≈1 tbsp) is the standard meal-prep lever for cooked mains
  ([Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet),
  [Village Gym](https://www.villagegym.co.uk/blog/is-chicken-and-rice-good-for-bulking-with-recipes/)).
  Its `[5, 30]` range gives the solver ≈4.5 g–27 g fat of headroom.
- Nuts/seeds/nut-butter carry side carbs+protein, so they move fat with a small
  carb/protein cost; defaults of **15–20 g** keep that cost modest while leaving
  range up to 60 g.
- `avocado` is fat-DILUTE (15 g fat per 100 g) — useful where a creamy, low-density
  fat suits the dish, but a poor *precision* lever (you need large grams to move
  fat much). Reserved for meals where it is the natural culinary fit.

---

## 3. Per-meal recommendations (all 61 meals)

Legend: **diet** = meal's broadest qualifying diet. "Existing fat staple" =
component whose ROLE is `fat`. **Rec** = recommended flexible-fat key, default g,
range. Component lists are quoted verbatim from `curatedMeals.js`.

### 3.1 Omnivore — breakfast

| id | name | slots | components | existing fat | rec | rationale + source |
|---|---|---|---|---|---|---|
| `curated_om_eggs_salmon_oats` | Scrambled eggs, smoked salmon & oats | breakfast | eggs 150, smoked_salmon 50, oats 50 | none | **olive_oil**, 8 g, [5,30] | Eggs are scrambled in fat; oil is the natural cooking-fat lever for a savoury egg breakfast. Modest default since whole eggs already carry ~13.5 g fat. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_om_eggs_toast_salmon` | Eggs on toast & smoked salmon | breakfast | eggs 150, wholemeal_bread 80, smoked_salmon 50 | none | **olive_oil**, 8 g, [5,30] | Same savoury-egg logic; oil for the eggs / on the toast. Standard cooking fat. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_om_bacon_eggs` | Bacon medallions & eggs | breakfast | bacon_medallions 90, eggs 150 | none | **olive_oil**, 8 g, [5,30] | Cooked fry-up breakfast; oil is the pan fat. Eggs already ~13.5 g fat, so keep default small. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |

### 3.2 Omnivore — lunch / dinner

| id | name | slots | components | existing fat | rec | rationale + source |
|---|---|---|---|---|---|---|
| `curated_om_chicken_rice` | Chicken & rice | lunch, dinner | chicken_breast 150, white_rice 250, broccoli 120 | none | **olive_oil**, 12 g, [5,30] | The canonical lean meal-prep plate; oil drizzled on rice/chicken is *the* standard fat lever (≈9 g fat per tbsp). [Village Gym](https://www.villagegym.co.uk/blog/is-chicken-and-rice-good-for-bulking-with-recipes/) |
| `curated_om_beef_chilli` | Beef mince chilli & rice | lunch, dinner | beef_mince_5 150, kidney_beans 100, white_rice 150, tomato_sauce 80 | none | **olive_oil**, 10 g, [5,30] | Chilli is built in a pan with oil; cooked savoury main. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_om_spag_bol` | Spaghetti bolognese | dinner | beef_mince_5 150, pasta 70, tomato_sauce 120 | none | **olive_oil**, 10 g, [5,30] | Bolognese sauté + pasta dressing; classic olive-oil dish. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_om_turkey_stirfry` | Turkey mince stir-fry | lunch, dinner | turkey_mince 150, white_rice 180, stirfry_veg 120 | none | **olive_oil**, 12 g, [5,30] | Stir-fries are cooked in oil; oil is the obvious lever. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_om_salmon_rice_broccoli` | Baked salmon, rice & broccoli | lunch, dinner | salmon 150, white_rice 180, broccoli 120 | none | **none** | Salmon already carries ~19.5 g fat (oily fish), giving this meal a high fat share; adding a flexible fat would fight the "lean/balanced spread" intent. Leave fat-free; the solver flexes other meals in the day. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_om_cod_bake` | Cod bake | lunch, dinner | cod 200, white_potato 250, **cheddar_light 25** | **cheddar_light** | keep cheddar_light as the lever, range [5,60] | Already has a fat-role staple (cheese topping ~5.5 g fat at 25 g). It is culinary-native to a cod-and-potato bake, so use the EXISTING cheese as the scalable element rather than adding a second fat. |
| `curated_om_chicken_sweetpot_greens` | Chicken, sweet potato & greens | lunch, dinner | chicken_breast 150, sweet_potato 250, green_beans 120 | none | **olive_oil**, 12 g, [5,30] | Lean roast-tray plate; oil to roast sweet potato / dress greens. [Village Gym](https://www.villagegym.co.uk/blog/is-chicken-and-rice-good-for-bulking-with-recipes/) |
| `curated_om_chicken_jacket` | Chicken jacket potato & salad | lunch, dinner | chicken_breast 140, white_potato 300, salad 80 | none | **olive_oil**, 12 g, [5,30] | Oil dresses the salad / potato. Standard. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_om_jacket_tuna` | Jacket potato & tuna | lunch, dinner | white_potato 300, tuna_water 120, salad 60 | none | **olive_oil**, 10 g, [5,30] | Very lean base (tuna in water ~1.2 g fat); oil on the salad/potato is the natural fat. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_om_steak_potatoes` | Steak & potatoes | dinner | steak_lean 150, white_potato 250, salad 100 | none | **olive_oil**, 10 g, [5,30] | Oil for cooking the steak / dressing the salad (note: NOT peanut butter — character fit rule). [Village Gym](https://www.villagegym.co.uk/blog/is-chicken-and-rice-good-for-bulking-with-recipes/) |
| `curated_om_prawn_stirfry` | King prawn stir-fry & rice | lunch, dinner | prawns 150, white_rice 180, stirfry_veg 120 | none | **olive_oil**, 12 g, [5,30] | Stir-fry cooked in oil; prawns are very lean (~1 g fat). [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_om_chicken_pasta` | Chicken & tomato pasta | lunch, dinner | chicken_breast 150, pasta 80, tomato_sauce 100, broccoli 100 | none | **olive_oil**, 12 g, [5,30] | Pasta dish; oil in the sauce / on the pasta is standard Italian + meal-prep practice. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_om_beef_rice_greens` | Beef mince, rice & greens | lunch, dinner | beef_mince_5 150, white_rice 200, green_beans 100 | none | **olive_oil**, 10 g, [5,30] | Cooked savoury main; oil for the mince / greens. [Village Gym](https://www.villagegym.co.uk/blog/is-chicken-and-rice-good-for-bulking-with-recipes/) |
| `curated_om_turkey_potato_greens` | Turkey mince, potato & greens | lunch, dinner | turkey_mince 150, white_potato 300, green_beans 120 | none | **olive_oil**, 12 g, [5,30] | Lean turkey base; oil is the cooking/dressing fat. [Village Gym](https://www.villagegym.co.uk/blog/is-chicken-and-rice-good-for-bulking-with-recipes/) |
| `curated_om_salmon_sweetpot` | Salmon, sweet potato & broccoli | dinner | salmon 150, sweet_potato 250, broccoli 120 | none | **none** | As with the other salmon meal: oily fish already gives a high fat share. Leave without a flexible fat. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_om_cod_rice_peas` | Cod, rice & peas | lunch, dinner | cod 200, white_rice 200, peas 100 | none | **olive_oil**, 12 g, [5,30] | Very lean (cod ~2 g fat); oil is the obvious added fat for a fish-rice plate. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_om_chicken_potato_veg` | Chicken, potatoes & veg | lunch, dinner | chicken_breast 150, white_potato 300, mixed_veg 120 | none | **olive_oil**, 12 g, [5,30] | Lean plate; oil to roast/dress. [Village Gym](https://www.villagegym.co.uk/blog/is-chicken-and-rice-good-for-bulking-with-recipes/) |

### 3.3 Omnivore — snack / pre / post

| id | name | slots | components | existing fat | rec | rationale + source |
|---|---|---|---|---|---|---|
| `curated_om_sn_tuna_ricecakes` | Tuna & rice cakes | snack | tuna_water 100, rice_cakes 30 | none | **none** (optional `mixed_seeds`) | Deliberately ultra-lean savoury snack (~1 g fat). Forcing a fat fights its character. If the solver needs a lever here, `mixed_seeds` 10 g [5,60] is the least intrusive savoury option — but default is to leave it lean. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_om_pre_chicken_rice` | Chicken & white rice (pre) | preworkout | chicken_breast 120, white_rice 150 | none | **none** | Pre-workout meals are deliberately low-fat for fast gastric emptying / glycogen focus; adding fat works against the slot's intent. Leave fat-free. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_om_post_chicken_rice` | Chicken & white rice (post) | postworkout | chicken_breast 150, white_rice 180, mixed_veg 100 | none | **olive_oil**, 8 g, [5,30] | Post-workout tolerates added fat better than pre; a small oil drizzle is fine and gives the solver a lever. Keep default low so it stays a recovery carb/protein meal. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |

### 3.4 Vegetarian — breakfast

| id | name | slots | components | existing fat | rec | rationale + source |
|---|---|---|---|---|---|---|
| `curated_veg_protein_porridge` | Protein porridge | breakfast | oats 60, whey 30, milk_skimmed 250, berries 80 | none | **peanut_butter**, 15 g, [5,60] | Nut butter is the classic oats topping — adds creamy fat + minor protein; standard bodybuilding porridge add-in. [Set For Set](https://www.setforset.com/blogs/news/high-protein-oatmeal) |
| `curated_veg_overnight_oats` | Overnight oats | breakfast | oats 60, greek_yogurt_0 100, whey 30, milk_skimmed 150 | none | **peanut_butter**, 15 g, [5,60] | Overnight oats are routinely "boosted with nut butters" for fat+satiety. [White's Oats](https://www.whitesoats.co.uk/blog/10-quick-and-easy-protein-overnight-oat-hacks), [ELEAT](https://eleatcereal.com/blogs/news/overnight-oats-for-muscle-gain-7-high-protein-recipes) |
| `curated_veg_protein_pancakes` | Protein pancakes | breakfast | oats 50, whey 30, egg_whites 150, banana 60 | none | **peanut_butter**, 12 g, [5,60] | Nut butter is the standard pancake topping; pairs with banana. [Set For Set](https://www.setforset.com/blogs/news/high-protein-oatmeal) |
| `curated_veg_greek_yogurt_bowl` | Greek yogurt bowl | breakfast | greek_yogurt_0 250, berries 80, honey 15, **almonds 15** | **almonds** | keep almonds as the lever, range [5,60] | Already has a fat-role staple (almonds, the natural yogurt-bowl crunch). Use the EXISTING almonds as the scalable element — leave as-is otherwise. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_veg_skyr_berry_bowl` | Skyr & berry bowl | breakfast | skyr 250, granola 30 | none | **mixed_seeds**, 15 g, [5,60] | Seeds are the natural sprinkle over a skyr/granola bowl; lighter than nut butter and complements granola. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_veg_eggwhite_scramble_sourdough` | Egg-white scramble, spinach & sourdough | breakfast | egg_whites 150, eggs 100, spinach 60, sourdough 80 | none | **olive_oil**, 8 g, [5,30] | Savoury scramble cooked in oil; oil is the natural cooking fat (whole eggs already add some fat, so small default). [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_veg_cottage_toast_egg` | Cottage cheese on toast & poached egg | breakfast | cottage_cheese 150, wholemeal_bread 80, eggs 50 | none | **olive_oil**, 8 g, [5,30] | Savoury toast; a drizzle of oil over the toast/egg is natural. (Avocado on toast is also classic, but oil is the better precision lever.) [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |

### 3.5 Vegetarian — lunch / dinner

| id | name | slots | components | existing fat | rec | rationale + source |
|---|---|---|---|---|---|---|
| `curated_veg_quorn_chilli` | Quorn mince chilli & rice | lunch, dinner | quorn_mince 150, kidney_beans 100, white_rice 150, tomato_sauce 80 | none | **olive_oil**, 10 g, [5,30] | Chilli cooked in oil; very lean Quorn base. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_veg_quorn_bolognese` | Quorn bolognese | dinner | quorn_mince 150, pasta 70, tomato_sauce 120 | none | **olive_oil**, 10 g, [5,30] | Bolognese sauté + pasta dressing. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_veg_quorn_pieces_curry` | Quorn pieces curry & rice | lunch, dinner | quorn_pieces 150, white_rice 180, mixed_veg 100 | none | **olive_oil**, 10 g, [5,30] | Curries are cooked in oil; oil is the native fat. (Vegetarian, so dairy fats would also be allowed, but oil suits a curry base best.) [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_veg_halloumi_veg` | Halloumi & roast veg | lunch, dinner | **halloumi 80**, white_potato 200, mixed_veg 120 | **halloumi** | keep halloumi as the lever, range [5,60] | Already has a fat-role staple AND it is the meal's named character (halloumi ~20 g fat at 80 g — already a high fat share). Use the existing halloumi as the scalable element; do NOT add a second fat. |
| `curated_veg_egg_fried_rice_tofu` | Egg-fried rice with tofu | lunch, dinner | eggs 100, tofu_firm 100, white_rice 200, peas 100 | none | **olive_oil**, 10 g, [5,30] | Egg-fried rice is wok-fried in oil; oil is the obvious lever. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_veg_jacket_cheese_beans` | Jacket potato, cheese & beans | lunch, dinner | white_potato 300, **cheddar_light 40**, baked_beans 200 | **cheddar_light** | keep cheddar_light as the lever, range [5,60] | Already has a fat-role staple (cheese, the named character). Use the existing cheese as the scalable element. |

### 3.6 Vegetarian — snack / pre / post

| id | name | slots | components | existing fat | rec | rationale + source |
|---|---|---|---|---|---|---|
| `curated_veg_sn_yogurt_whey` | Greek yogurt & whey | snack | greek_yogurt_0 200, whey 15 | none | **almonds**, 12 g, [5,60] | Almonds are the natural crunch over a yogurt snack; small default keeps it a lean high-protein snack. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_veg_sn_cottage_pineapple` | Cottage cheese & pineapple | snack | cottage_cheese 200, pineapple 100 | none | **mixed_seeds**, 10 g, [5,60] | Seeds sprinkle naturally over a cottage-cheese-and-fruit bowl; light lever. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_veg_pre_oats_whey` | Oats & whey (pre) | preworkout | oats 50, whey 30, honey 10 | none | **none** | Pre-workout: keep low-fat for fast digestion / glycogen. Leave fat-free. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_veg_pre_yogurt_ricecakes` | Greek yogurt & rice cakes (pre) | preworkout | greek_yogurt_0 200, rice_cakes 24, honey 10 | none | **none** | Pre-workout, low-fat by design. Leave fat-free. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_veg_post_whey_banana` | Whey & banana shake (post) | postworkout | whey 40, banana 120, milk_skimmed 250 | none | **peanut_butter**, 12 g, [5,60] | Nut butter is the standard shake add-in for fat/calories; post-workout tolerates fat. [Set For Set](https://www.setforset.com/blogs/news/high-protein-oatmeal) |
| `curated_veg_post_skyr_berries` | Skyr, berries & honey (post) | postworkout | skyr 250, berries 100, honey 15 | none | **mixed_seeds**, 12 g, [5,60] | Seeds sprinkle over a skyr bowl; light lever for the post slot. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |

### 3.7 Vegan — breakfast

(Vegan-safe fats only: olive_oil, almonds, peanut_butter, mixed_seeds, avocado, tahini.)

| id | name | slots | components | existing fat | rec | rationale + source |
|---|---|---|---|---|---|---|
| `curated_vg_tofu_scramble` | Tofu scramble on sourdough | breakfast | tofu_firm 200, sourdough 80, spinach 60 | none | **olive_oil**, 10 g, [5,30] | Tofu scramble is pan-cooked in oil; vegan-safe. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_vg_overnight_oats` | Vegan protein overnight oats | breakfast | oats 60, soy_protein 30, soy_milk 200, berries 80 | none | **peanut_butter**, 15 g, [5,60] | Nut butter is the classic overnight-oats add-in; vegan-safe. [White's Oats](https://www.whitesoats.co.uk/blog/10-quick-and-easy-protein-overnight-oat-hacks) |
| `curated_vg_protein_pancakes` | Vegan protein pancakes | breakfast | oats 50, pea_protein 25, soy_milk 150, banana 60 | none | **peanut_butter**, 12 g, [5,60] | Nut butter topping; pairs with banana; vegan-safe. [Set For Set](https://www.setforset.com/blogs/news/high-protein-oatmeal) |
| `curated_vg_soy_yogurt_granola` | Soya yogurt, granola & berries | breakfast | soy_yogurt_hp 200, pea_protein 15, granola 30, berries 60 | none | **mixed_seeds**, 15 g, [5,60] | Seeds sprinkle over the yogurt/granola bowl; vegan-safe and lighter than nut butter. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_vg_pea_porridge` | Pea protein porridge | breakfast | oats 60, pea_protein 30, berries 80 | none | **peanut_butter**, 15 g, [5,60] | Nut butter is the standard porridge add-in; vegan-safe. [Set For Set](https://www.setforset.com/blogs/news/high-protein-oatmeal) |

### 3.8 Vegan — lunch / dinner

| id | name | slots | components | existing fat | rec | rationale + source |
|---|---|---|---|---|---|---|
| `curated_vg_tofu_stirfry` | Tofu stir-fry & rice | lunch, dinner | tofu_firm 200, white_rice 180, stirfry_veg 120 | none | **olive_oil**, 12 g, [5,30] | Stir-fry cooked in oil; vegan-safe. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_vg_tempeh_sweetpot` | Tempeh & sweet potato bowl | lunch, dinner | tempeh 120, sweet_potato 200, broccoli 100 | none | **tahini**, 15 g, [5,60] | Tahini drizzle is the canonical dressing for a tempeh/sweet-potato grain bowl; vegan-safe. [Vegan Food & Living](https://www.veganfoodandliving.com/vegan-recipes/vegan-lebanese-buddha-bowl-with-tahini-drizzle/) |
| `curated_vg_lentil_chilli` | Lentil & bean chilli & rice | lunch, dinner | lentils 200, kidney_beans 120, white_rice 150, tomato_sauce 80 | none | **olive_oil**, 10 g, [5,30] | Chilli cooked in oil; vegan-safe. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_vg_chickpea_lentil_curry` | Chickpea & lentil curry | lunch, dinner | chickpeas 200, lentils 100, white_rice 150, spinach 60 | none | **olive_oil**, 12 g, [5,30] | Curry base cooked in oil. (Tahini also fits a chickpea dish, but oil is the better precision lever for a cooked curry.) [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_vg_seitan_potato_greens` | Seitan, potatoes & greens | lunch, dinner | seitan 130, white_potato 250, green_beans 100 | none | **olive_oil**, 12 g, [5,30] | Roast/pan main; oil for cooking and dressing greens; vegan-safe. [Village Gym](https://www.villagegym.co.uk/blog/is-chicken-and-rice-good-for-bulking-with-recipes/) |
| `curated_vg_seitan_noodles` | Seitan & noodles | lunch, dinner | seitan 130, noodles 200, stirfry_veg 120 | none | **olive_oil**, 12 g, [5,30] | Noodle stir-fry cooked in oil; vegan-safe. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_vg_tvp_bolognese` | Soya mince bolognese | dinner | tvp_dry 45, pasta 70, tomato_sauce 120 | none | **olive_oil**, 10 g, [5,30] | Bolognese sauté + pasta; vegan-safe. [Jacked Factory](https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet) |
| `curated_vg_tofu_sweetpot` | Tofu & sweet potato bowl | lunch, dinner | tofu_firm 200, sweet_potato 200, broccoli 100 | none | **tahini**, 15 g, [5,60] | Tahini drizzle is the canonical tofu-and-sweet-potato bowl dressing; vegan-safe. [Vegan Food & Living](https://www.veganfoodandliving.com/vegan-recipes/vegan-lebanese-buddha-bowl-with-tahini-drizzle/) |

### 3.9 Vegan — snack / pre / post

| id | name | slots | components | existing fat | rec | rationale + source |
|---|---|---|---|---|---|---|
| `curated_vg_sn_edamame` | Edamame | snack | edamame 200 | none | **none** (optional `mixed_seeds`) | A deliberately simple, single-ingredient lean snack (edamame already ~10 g fat at 200 g). Forcing a fat overhauls its character. Leave without; if a lever is required, `mixed_seeds` 10 g [5,60]. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_vg_sn_soy_yogurt_pb` | Soya yogurt & peanut butter | snack | soy_yogurt_hp 200, pea_protein 15, **peanut_butter 12** | **peanut_butter** | keep peanut_butter as the lever, range [5,60] | Already has a fat-role staple (peanut butter, the named character). Use the existing peanut butter as the scalable element. |
| `curated_vg_sn_pea_shake_berries` | Pea protein shake & berries | snack | pea_protein 33, berries 100, soy_milk 200 | none | **peanut_butter**, 12 g, [5,60] | Nut butter is the standard shake add-in for fat; vegan-safe. [Set For Set](https://www.setforset.com/blogs/news/high-protein-oatmeal) |
| `curated_vg_pre_soy_oats_banana` | Soya protein, oats & banana (pre) | preworkout | soy_protein 30, oats 50, banana 120 | none | **none** | Pre-workout, low-fat by design. Leave fat-free. [Strength Log](https://www.strengthlog.com/fats-for-bodybuilding/) |
| `curated_vg_post_pea_oats_berries` | Pea protein, oats & berries (post) | postworkout | pea_protein 35, oats 60, berries 80 | none | **peanut_butter**, 12 g, [5,60] | Post-workout oats tolerate added fat; nut butter is the natural add-in; vegan-safe. [Set For Set](https://www.setforset.com/blogs/news/high-protein-oatmeal) |
| `curated_vg_post_soy_banana_shake` | Soya protein & banana shake (post) | postworkout | soy_protein 35, banana 120, soy_milk 250 | none | **peanut_butter**, 12 g, [5,60] | Nut butter shake add-in; vegan-safe. [Set For Set](https://www.setforset.com/blogs/news/high-protein-oatmeal) |

---

## 4. Summary counts

Total meals: **61**. Of these, **53 carry a scalable fat lever** (48 via a
newly-added element + 5 via an existing staple); **8 are intentionally left
without any fat lever**. (61 = 53 + 8.) Counts below are tallied directly from
the §3 tables, which remain authoritative.

### Meals that GET a flexible-fat element: 53

**New element added — 48 meals, by food:**

- **`olive_oil` — 31 meals**
  - om breakfast (3): eggs_salmon_oats, eggs_toast_salmon, bacon_eggs
  - om lunch/dinner (14): chicken_rice, beef_chilli, spag_bol, turkey_stirfry, chicken_sweetpot_greens, chicken_jacket, jacket_tuna, steak_potatoes, prawn_stirfry, chicken_pasta, beef_rice_greens, turkey_potato_greens, cod_rice_peas, chicken_potato_veg
  - om post (1): post_chicken_rice
  - veg breakfast (2): eggwhite_scramble_sourdough, cottage_toast_egg
  - veg lunch/dinner (4): quorn_chilli, quorn_bolognese, quorn_pieces_curry, egg_fried_rice_tofu
  - vg breakfast (1): tofu_scramble
  - vg lunch/dinner (6): tofu_stirfry, lentil_chilli, chickpea_lentil_curry, seitan_potato_greens, seitan_noodles, tvp_bolognese
- **`peanut_butter` — 10 meals**
  - veg (4): protein_porridge, overnight_oats, protein_pancakes, post_whey_banana
  - vg (6): overnight_oats, protein_pancakes, pea_porridge, sn_pea_shake_berries, post_pea_oats_berries, post_soy_banana_shake
- **`mixed_seeds` — 4 meals**
  - veg (3): skyr_berry_bowl, sn_cottage_pineapple, post_skyr_berries
  - vg (1): soy_yogurt_granola
- **`almonds` — 1 meal**: veg sn_yogurt_whey
- **`tahini` — 2 meals**: vg tempeh_sweetpot, vg tofu_sweetpot

(31 + 10 + 4 + 1 + 2 = 48 new elements.)

**Reuse an EXISTING fat staple as the lever — 5 meals (no new element):**

- `cheddar_light`: cod_bake, jacket_cheese_beans
- `almonds`: greek_yogurt_bowl
- `halloumi`: halloumi_veg
- `peanut_butter`: sn_soy_yogurt_pb

### Meals intentionally WITHOUT any fat lever: 8

- `curated_om_salmon_rice_broccoli` — oily fish already high fat share
- `curated_om_salmon_sweetpot` — oily fish already high fat share
- `curated_om_sn_tuna_ricecakes` — deliberately ultra-lean savoury snack (optional `mixed_seeds` 10 g fallback noted)
- `curated_om_pre_chicken_rice` — pre-workout, low-fat by design
- `curated_veg_pre_oats_whey` — pre-workout, low-fat by design
- `curated_veg_pre_yogurt_ricecakes` — pre-workout, low-fat by design
- `curated_vg_sn_edamame` — single-ingredient lean snack (optional `mixed_seeds` 10 g fallback noted)
- `curated_vg_pre_soy_oats_banana` — pre-workout, low-fat by design

---

## 5. Sources

UK / bodybuilding nutrition convention and standard culinary pairings used to
ground the fat choices:

- Jacked Factory — *Ultimate Guide: Bodybuilding Cutting Diet* (healthy-fat
  sources: raw nuts, nut butters, avocado, olive oil, seeds): https://www.jackedfactory.com/blogs/blog/ultimate-guide-bodybuilding-cutting-diet
- StrengthLog — *Fats for Bodybuilding and Muscle Growth* (avocado, olive oil,
  nuts, seeds, fatty fish as the staple fat sources; oily fish carries its own
  fat): https://www.strengthlog.com/fats-for-bodybuilding/
- Village Gym (UK) — *Is Chicken and Rice Good For Bulking?* (olive oil drizzled
  on chicken/rice as the standard added fat, ~9 g per tbsp): https://www.villagegym.co.uk/blog/is-chicken-and-rice-good-for-bulking-with-recipes/
- SET FOR SET — *Best Muscle-Building High Protein Oatmeal* (nut butter as the
  standard oats/shake fat add-in): https://www.setforset.com/blogs/news/high-protein-oatmeal
- White's Oats (UK) — *10 Quick and Easy Protein Overnight Oat Hacks* (nut
  butter/seeds in overnight oats): https://www.whitesoats.co.uk/blog/10-quick-and-easy-protein-overnight-oat-hacks
- ELEAT — *Overnight Oats for Muscle Gain* (nut butter to boost overnight oats):
  https://eleatcereal.com/blogs/news/overnight-oats-for-muscle-gain-7-high-protein-recipes
- Vegan Food & Living (UK) — *Vegan Lebanese Buddha Bowl with Tahini Drizzle*
  (tahini as the canonical dressing/fat for tofu/tempeh grain bowls): https://www.veganfoodandliving.com/vegan-recipes/vegan-lebanese-buddha-bowl-with-tahini-drizzle/

---

## 6. Open questions for the founder

1. **Post-workout fat.** This spec adds a small fat lever to post-workout meals
   (e.g. `post_chicken_rice` olive_oil 8 g; the nut-butter shakes) but keeps
   ALL pre-workout meals fat-free. Confirm that policy: should post-workout also
   stay fat-free for fast nutrient delivery, or is a small lever acceptable?
2. **Existing-staple meals as the lever.** For the 5 meals with an existing fat
   staple (cod_bake cheese, greek_yogurt_bowl almonds, halloumi_veg halloumi,
   jacket_cheese_beans cheese, sn_soy_yogurt_pb peanut butter), this spec
   recommends *reusing* that staple as the scalable element rather than adding a
   second fat. Two of those staples are the meal's named character (halloumi,
   cheese-and-beans) — scaling them down to hit a low fat target could change
   the dish's identity. Confirm a sensible *floor* for these (e.g. never below
   the food's current default grams) so the dish stays recognisable.
3. **Avocado.** Avocado is fat-dilute (15 g fat / 100 g) and a poor precision
   lever, so this spec did not assign it anywhere despite it being a natural fit
   for some meals (cottage-toast, jacket plates). Confirm: leave avocado out of
   the flexible-fat role entirely, or allow it as a *fixed* (non-scaled)
   character element on a small number of meals?
4. **The two salmon mains.** Left without a lever because oily fish already
   gives a high fat share. If the solver struggles to LOWER a day's fat, these
   meals have no shrinkable fat. Acceptable, or should the assembler simply
   avoid pairing two oily-fish meals in one day instead?
5. **Lean-snack levers.** `sn_tuna_ricecakes` and `sn_edamame` are flagged
   "leave lean" with an optional `mixed_seeds` fallback. Confirm whether the
   solver may use that optional lever when a day is otherwise unsolvable, or
   whether these stay strictly fat-free.
6. **GRAM_RANGE source of truth.** This spec defaults each lever's range to the
   food's `gramRangeOf` value. If the founder wants tighter per-meal caps (e.g.
   olive_oil never above 20 g on a pre/post meal), that needs a separate
   per-meal range override table — not currently proposed here.
