<!--
PROVENANCE: This is the founder's UK bodybuilder research report, provided in
the Claude Code session on 2026-06-15 and recovered verbatim from the session
transcript and committed here as the durable SOURCE specification. The curated
food + meal library (src/lib/food/curatedFoods.js, curatedMeals.js, foodRoles.js)
was rebuilt to this document. Do not edit the report body; it is the spec, not a
working doc. See docs/meal-library-export-2026-06-15.md for the generated library.
-->

# Volyume Curated Meal & Food Library: UK Bodybuilder Research Report

## TL;DR

- **Build the library from ~35 staple foods** (10–11 omnivore proteins, 6 plant proteins, 9 carbs, 5 fats, 8 veg, 5 dairy, 5 condiments). UK physique-athlete eating is highly repetitive and built on a small staple set — chicken breast, 5% beef mince, turkey breast mince, salmon, cod, eggs, oats, basmati rice, sweet/new potatoes, Greek yogurt — combined with simple sauces and high-volume veg. As BarBend’s *Definitive Guide to Bodybuilding Meal Prep* puts it: “Plain rice and grilled chicken is a bodybuilder’s bread and butter, but it might not be so appetizing on the eighth portion of the week.” 
- **Tuna must never appear as meal_1/breakfast.** UK athletes eat eggs, oats, Greek yogurt/skyr, protein pancakes and smoked salmon in the morning; tinned tuna is a lunch/snack staple. Also **rename “Tuna bake” made with cod → “Cod bake”** — cod is not tuna, and the current naming is simply wrong.
- **Use UK supermarket naming and UK CoFID / own-label macros, not US conventions.** UK CoFID values a raw whole egg at 131 kcal/100g vs USDA’s 143 kcal/100g; UK fresh-fish/meat labels quote the **raw** product even when they include cooking instructions. Every food needs an explicit weight state: dry / cooked / ready.

## Key Findings

1. **UK bodybuilders eat from a tiny rotation of staples, and repetition is expected, not a flaw.** A minimal viable set of ~35 foods can generate the entire meal library across all phases and diets. The constraint is UK supermarket availability (Tesco, Sainsbury’s, Asda, Morrisons, Lidl, Aldi, M&S), not exotic recipes.
1. **Breakfast is egg-, oat-, yogurt- and shake-led — never tuna.** The single most-cited UK muscle-building breakfast comes from RNT Fitness coach Akash Vaghela’s *The Ten Best And Fastest Muscle-Building Breakfasts*: “This is my personal staple. I fry up some eggs in a pan, pre-soak the oats in almond milk the night before, and then cut up the necessary smoked salmon for the side.”   His logged contest-prep meal 1 was 140ml egg whites + 1 large egg + 50g smoked salmon + 40g oats. The other staples he lists are eggs on toast/bagel + smoked salmon, protein powder + oats + nut butter, and overnight oats.
1. **Cutting vs bulking is portion/composition, not different foods.** Cuts lean on cod, white fish, chicken breast, egg whites, 0% Greek yogurt and high-volume veg; bulks add rice, potatoes, oats, whole eggs, 5% beef mince, bagels and nut butters. The macro skeleton (protein + carb + small fat + veg) stays constant; quantities change.
1. **UK vegan/vegetarian athletes have a clear, supermarket-stocked toolkit:** firm/extra-firm tofu (Cauldron is the dominant UK brand, stocked in all major supermarkets), Quorn (mince, chicken-style pieces, fillets), tempeh, soy/pea protein powder (Myprotein, Bulk, The Protein Works are the common UK brands), lentils/beans and seitan.
1. **Meal naming should be short, ingredient-led and British.** Apps like MyFitnessPal and MacroFactor present meals as “Chicken & brown rice bowl” — protein + base + format. This style resonates with serious UK users who log macros and weigh food in grams.

-----

## A) RECOMMENDED STAPLE FOODS LIST

All macros per 100g. Diet key: O = omnivore, V = vegetarian, Vg = vegan.

### Omnivore proteins

|Food (UK shelf name)        |State  |kcal                               |Protein                                    |Carbs|Fat |Allergens |Typical portion|Diet|
|----------------------------|-------|-----------------------------------|-------------------------------------------|-----|----|----------|---------------|----|
|Chicken breast fillet       |cooked |~165                               |~31                                        |0    |~3.6|none      |120–200g       |O   |
|Chicken thigh (skinless)    |cooked |~209                               |~26                                        |0    |~11 |none      |120–180g       |O   |
|5% fat beef mince           |cooked |~168 (pan-fried, Sainsbury’s)      |~25                                        |0    |4.7 |none      |100–180g       |O   |
|Turkey breast mince 2%      |cooked |~136 (raw basis, Tesco/Sainsbury’s)|~22                                        |<1   |2   |none      |120–180g       |O   |
|Salmon fillet               |cooked |~200–215                           |~24                                        |0    |~13 |fish      |100–150g       |O   |
|Cod loin                    |cooked |~95–105                            |~22                                        |0    |~1  |fish      |130–200g       |O   |
|Tuna chunks in spring water |drained|~100                               |~25 (John West: “25g of protein per 100g”) |0    |~1  |fish      |100–145g       |O   |
|Mackerel fillets in brine   |drained|187 (John West UK)                 |22                                         |0    |11  |fish      |80–125g        |O   |
|King prawns, cooked & peeled|ready  |~80–85                             |~18–20                                     |<1   |~0.7|crustacean|100–150g       |O   |
|Whole eggs (large)          |raw    |131/100g (~76 per 58g egg)         |12.5                                       |<1   |9   |egg       |2–4 eggs       |O   |
|Back bacon medallions       |cooked |~120–130                           |~21                                        |<1   |~4  |none      |50–100g        |O   |

### Dairy

|Food                                                    |State|kcal  |Protein|Carbs|Fat |Allergens|Portion |Diet|
|--------------------------------------------------------|-----|------|-------|-----|----|---------|--------|----|
|Total 0% Greek yogurt (FAGE)                            |ready|54    |10.3   |3    |0   |milk     |150–300g|O/V |
|Total 2% Greek yogurt (FAGE)                            |ready|70    |9.9    |3    |2   |milk     |150–250g|O/V |
|Total 5% Greek yogurt (FAGE)                            |ready|93    |9      |3    |5   |milk     |150–200g|O/V |
|Skyr natural                                            |ready|63    |11     |3.4  |0.1 |milk     |150–250g|O/V |
|Low-fat cottage cheese                                  |ready|~72–78|~12    |~4   |~1.5|milk     |100–250g|O/V |
|Reduced-fat mature cheddar (e.g. Cathedral City Lighter)|ready|~310  |29     |0.1  |22  |milk     |20–40g  |O/V |

*Note: FAGE Total 0% UK label = 54 kcal / 10g protein per 100g (aggregators list up to 58.8 kcal / 10.6g). The US FAGE pot label states 80 kcal / 16g protein per 150g  — use the UK per-100g figure for a UK app.*

### Plant proteins

|Food                                                     |State   |kcal                            |Protein             |Carbs |Fat |Allergens           |Portion |Diet|
|---------------------------------------------------------|--------|--------------------------------|--------------------|------|----|--------------------|--------|----|
|Firm/extra-firm tofu (Cauldron)                          |ready   |~120–144                        |~13–17              |~1–3  |~8–9|soya                |100–200g|Vg  |
|Quorn mince                                              |per 100g|103 (Quorn UK: “431kJ/103kcal”) |16 (“16g per 100g”) |~5    |2   |egg, gluten (barley)|100–150g|V   |
|Quorn chicken-style pieces                               |per 100g|~97–98                          |13                  |~4.5  |~1.7|egg                 |100–150g|V   |
|Tempeh                                                   |ready   |~190                            |~20                 |~7    |~11 |soya                |100–150g|Vg  |
|Vegan protein powder (pea/soy blend, e.g. Myprotein/Bulk)|dry     |~360                            |~75–80              |~5    |~6  |soya                |30–40g  |Vg  |
|Red lentils / mixed beans                                |cooked  |~115–130                        |~9                  |~17–20|<1  |none                |100–200g|Vg  |

*Quorn mince and pieces are egg-bound (rehydrated free-range egg white)  so are vegetarian, not vegan; use Quorn’s dedicated “Vegan” range for Vg meals. Quorn mince and pieces are gluten-containing.* 

### Carbs

|Food                          |State |kcal                  |Protein|Carbs |Fat |Portion   |
|------------------------------|------|----------------------|-------|------|----|----------|
|Porridge oats (Scottish/jumbo)|dry   |370                   |11     |60    |8   |40–100g   |
|Basmati rice                  |cooked|~130–140              |~3     |~28–30|~0.4|150–300g  |
|Brown basmati rice            |cooked|~140–150              |~3.5   |~30   |~1.5|150–250g  |
|New potatoes                  |boiled|~75                   |1.5    |17    |0.3 |150–300g  |
|Sweet potato                  |baked |~90–115               |~2     |~21   |0.3 |150–300g  |
|Wholemeal bread               |ready |231 (~92/medium slice)|10.5   |~43   |2.3 |1–3 slices|
|White sourdough               |ready |~238                  |~7.5   |~48   |~1.5|1–2 slices|
|Rice cakes                    |ready |~380                  |~8     |~80   |~3  |2–4 cakes |
|Bagel (white/wholemeal)       |ready |~250–260              |~10    |~50   |~1.5|1 bagel   |

### Fats

|Food                                     |kcal    |Protein|Carbs|Fat|Portion  |
|-----------------------------------------|--------|-------|-----|---|---------|
|Peanut / almond butter                   |~600    |~25    |~12  |~50|15–30g   |
|Olive oil                                |884     |0      |0    |100|5–15g    |
|Avocado                                  |~190    |~2     |~2   |~18|50–100g  |
|Mixed nuts / almonds                     |~600    |~21    |~7   |~52|20–30g   |
|Low-calorie cooking spray (e.g. Frylight)|~5/spray|0      |0    |<1 |as needed|

### Vegetables & condiments

**Veg (8–10):** broccoli, green beans, spinach, asparagus, courgette, peppers, mushrooms, cherry tomatoes, mixed salad, onion. **Condiments (5):** reduced-sugar tomato ketchup, soy sauce, sriracha / hot sauce, low-calorie sauces (zero-style syrups/sauces), tomato passata. These add flavour for negligible macros and directly address the “limited variety” complaint without adding new protein/carb staples.

-----

## B) RECOMMENDED MEAL LIBRARY STRUCTURE

### OMNIVORE

**Breakfast (11 — all real UK athlete patterns):**

1. **Scrambled eggs, smoked salmon & oats** — eggs 3 + smoked salmon 50g + oats 50g — *all phases* (the RNT/Vaghela staple; balanced protein/fat/carb).
1. **Eggs on toast + smoked salmon** — eggs 2–3 + 2 slices wholemeal or 1 bagel + salmon 50g — *bulk*.
1. **Protein porridge** — oats 60g + 1 scoop whey + 250ml semi-skimmed milk + berries — *all phases* (slow carbs + fast protein; classic pre-AM-training option).
1. **Overnight oats** — oats 60g + Greek yogurt 100g + 1 scoop whey + milk — *all phases* (no-cook, prep-ahead).
1. **Protein pancakes** — oats 50g + whey + egg whites + ½ banana — *all phases*.
1. **Greek yogurt bowl** — 0% Greek 250g + berries + honey + nuts — *cut/all* (~25–30g protein, low fat).
1. **Skyr & berry bowl** — skyr 250g + granola 30g — *all*.
1. **Bacon medallions & eggs** — medallions 3 + eggs 3 — *cut/all* (high protein, low carb).
1. **Egg-white & whole-egg scramble + spinach + sourdough** — *cut*.
1. **Pre-training blended shake** — whey + banana + oats 40g — *pre-AM training* (for those who can’t stomach solids early).
1. **Cottage cheese on toast + poached egg** — *all*.

Target macros: ~30–50g protein, 30–80g carbs (phase-dependent), 10–20g fat (lower on cut).

**Lunch / Dinner:**

1. **Chicken & rice bowl** — chicken 150g + basmati 250g cooked + veg — *all*
1. **Beef mince chilli with rice** (5% mince) — *all*
1. **Spaghetti Bolognese** (5% mince + pasta) — *bulk*
1. **Turkey mince stir-fry** with rice or noodles — *all*
1. **Baked salmon, rice & broccoli** — *all*
1. **Cod bake** (cod loin + potato + light cheese sauce) — *cut/all* — **replaces the mislabelled “tuna bake”**
1. **Chicken, sweet potato & greens** — *all*
1. **Jacket potato** with tuna / cottage cheese / chilli — *all*
1. **Steak & potatoes** (off-season) — *bulk*
1. **King prawn stir-fry** with veg & rice — *cut*

**Snacks:** Greek yogurt + whey; rice cakes + peanut butter + banana; cottage cheese + pineapple; ready-to-drink protein shake; tuna + crackers; beef jerky; protein bar.
**Pre-workout:** chicken & rice; rice cakes + honey/PB + banana; oats + whey; banana + shake. (UK sources consistently cite rice cakes + peanut butter + banana as the signature pre-workout snack.) 
**Post-workout:** whey + banana; chicken & white rice; protein shake + rice cakes. (Faster-digesting white rice/banana favoured post-session in both bulk and cut.)

### VEGETARIAN

- **Breakfast:** tofu scramble on toast; Greek yogurt/skyr bowls; protein pancakes; overnight oats; egg-white omelette + reduced-fat cheddar.
- **Lunch/dinner:** Quorn mince chilli or bolognese; Quorn chicken-style pieces curry & rice; halloumi & veg with couscous; egg-fried rice with tofu; jacket potato with cheese & beans.
- **Snacks:** cottage cheese, Greek yogurt, cheese, boiled eggs.

### VEGAN

- **Breakfast:** tofu scramble on sourdough; vegan protein overnight oats (soy milk + vegan blend powder); vegan protein pancakes; soy yogurt + granola + berries.
- **Lunch/dinner:** tofu stir-fry & rice; tempeh & sweet potato bowl; lentil/bean chilli & rice; Quorn Vegan pieces curry; seitan & noodles.
- **Snacks:** vegan protein shake (soy milk); edamame; nuts; soy yogurt.

For vegans, use a **pea+rice or soy blend** powder (complete amino profile) — single-source pea-only or soy-only powders are nutritionally incomplete  and should be flagged in-app.

-----

## C) BREAKFAST SPECIFICALLY

Delivered above: **11 omnivore, 5 vegetarian, 4 vegan** options, each with component foods and gram weights, all reflecting documented UK athlete behaviour (RNT Fitness, CrazyBulk UK, UK-Muscle forum threads, Frive). The current library’s gap — “not enough bodybuilder-specific breakfast options” and “tuna as breakfast” — is fully resolved by this set.

-----

## D) NAMING GUIDE (UK vs US / current-app fixes)

**Meat & fish:** “5% fat beef mince” (not “ground beef”/“lean ground beef”); “chicken breast fillet”; “chicken thigh”; “turkey breast mince”; “back bacon medallions” (not “Canadian bacon” or “turkey bacon”); “cod loin”; “salmon fillet”; “smoked salmon”; “tuna chunks in spring water”; “tuna steak”; “mackerel fillets in brine”; “king prawns” (not “shrimp”); “haddock”.

**Dairy & eggs:** “Greek yogurt” (UK “yogurt” spelling), “Total 0%/2%/5% Greek yogurt”, “skyr natural”, “low-fat cottage cheese”, “reduced-fat cheddar”, “semi-skimmed milk”, “free-range eggs medium/large”.

**Carbs:** “porridge oats” / “jumbo oats” / “Scottish oats” (not “oatmeal”); “basmati rice”; “brown basmati rice”; “white long grain rice”; “new potatoes”; “jacket potato”; “sweet potato”; “wholemeal bread” (not “whole wheat”); “sourdough”.

**Veg:** “courgette” (not zucchini); “peppers” (not bell peppers); “aubergine” (not eggplant); “spring onion” (not scallion); “rocket” (not arugula); “coriander” (not cilantro).

**Protein powder:** generic UK term is “whey protein” / “protein powder”; vegan = “vegan protein” or “plant protein”.

**Meal names:** short, ingredient-led, lowercase “&”: “Chicken & rice”, “Protein porridge”, “Greek yogurt bowl”, “Overnight oats”, “Cod bake”, “Beef mince chilli”. This matches MyFitnessPal/MacroFactor presentation (e.g. “Chicken & brown rice bowl”) and resonates with serious UK self-coaching users.

-----

## E) WHAT TO REMOVE OR FIX

1. **REMOVE tuna from the meal_1/breakfast slot entirely.** It is not a UK bodybuilder breakfast; keep tuna only in lunch/dinner/snack slots.
1. **RENAME “Tuna bake” (made with cod) → “Cod bake.”** Naming must match the actual protein.
1. **Replace any US-only items** (Pop-Tarts, Ezekiel bread, turkey bacon, “jelly”, “ground beef”, “oatmeal”) with UK equivalents above.
1. **Add the missing bodybuilder breakfasts** (eggs + smoked salmon + oats; protein porridge; skyr/Greek yogurt bowls; protein pancakes; bacon medallions & eggs).
1. **Correct any USDA-derived macros to UK CoFID** — most notably whole egg (use 131 kcal/100g, the Public Health England / McCance & Widdowson CoFID 2021  figure, not USDA’s 143 kcal/100g from FoodData Central entry 171287).  Sweet potato baked also differs (UK CoFID ~115 vs USDA ~90 kcal).
1. **Label every food’s weight state** (dry / cooked / ready) and ensure fish/meat values are flagged raw vs cooked — UK fresh labels are raw-weight even with cooking instructions.

-----

## Recommendations

- **Phase 1 (now):** Lock the ~35-staple list above with UK macros and explicit weight states. Immediately patch the two correctness bugs: remove tuna from breakfast; rename “Tuna bake” → “Cod bake.”
- **Phase 2:** Build ~60–80 meals across all slots and the three diets using only staples (this maximises variety from minimal data and keeps macros consistent). Prioritise the 11 omnivore breakfasts to close the biggest current gap.
- **Phase 3:** QA every food name against live Tesco/Sainsbury’s listings. **Threshold rule:** if a food is not stocked in at least 3 of the 7 named supermarkets, drop it from the staple set. **Macro-accuracy rule:** any staple whose per-100g macros can’t be tied to a UK own-label panel or CoFID entry gets re-verified before launch.
- **Trigger to revisit:** if user logging shows a staple is rarely selected (<2% of meals), replace it with the next most-requested UK food rather than expanding the list.

## Caveats

- **Cooked macros vary** with cooking method and water loss; always label cooked items as cooked and source generic cooked values from CoFID.
- **A few figures are approximate** (brown basmati cooked, low-fat cottage cheese, reduced-fat cheddar) and were drawn partly from aggregators mirroring UK labels — confirm against a specific named product before locking into the database.
- **Quorn mince/pieces are vegetarian, not vegan** (egg-bound) and contain gluten — tag allergens and diet compatibility carefully; use the Quorn Vegan range for vegan meals.
- **Peak-week / contest-day patterns** (diuretics, water and carb manipulation, salted plain chicken) are deliberately out of scope for a general meal library and should not be modelled as standard meals.
- **Salmon/fish energy** depends on farmed vs wild and cooking method; the ~200–215 kcal/100g cooked range reflects UK farmed salmon, which is fattier (and more calorific) than US wild-salmon USDA figures.
