/**
 * food/mealAdditions.js
 *
 * Free flavour additions per curated meal, for the meal detail sheet (founder
 * 2026-06-30: novices don't realise a suggested meal like "chicken & rice" is a
 * base they can season and build on. A friend asked if he could add saffron to
 * it. So each meal teaches a few suitable additions AND why).
 *
 * HARD RULE: every addition must be genuinely NEGLIGIBLE in calories in a normal
 * seasoning amount: herbs, spices, aromatics, citrus, vinegar, and near-zero
 * condiments (hot sauce, a splash of soy, mustard, sugar-free sweetener, vanilla,
 * cocoa, kala namak/black salt, a sprinkle of nutritional yeast). NEVER oils,
 * nuts, seeds, cheese, avocado, honey, syrup-with-sugar or anything with real
 * macros, those belong in the meal's own components, not here. The sheet logs the
 * MEAL; these are educational, not logged, so the diary stays honest and uncluttered.
 *
 * Tone: flavour and enjoyment, never calorie-avoidance "tricks" or diet-culture
 * restriction (keeps faith with the wellbeing system). British English.
 *
 * Shape: keyed by curated meal id -> [{ name, why }]. A generic fallback covers
 * any meal not explicitly listed (and any future meal) so the sheet never blanks.
 */

import { CURATED_MEALS } from './curatedMeals';

// A short, honest, pro-food intro shown above the additions in the sheet.
// Reframed (founder D12.4, 2026-07-09): the previous wording read like a
// checklist to work through. This makes the optional, pick-any-for-flavour
// nature explicit, and states plainly that the numbers do not move.
export const ADDITIONS_INTRO =
  "Optional extras. Add any you fancy for flavour. They will not change the meal's numbers.";

// An honesty footnote (some sauces do add up in large amounts).
export const ADDITIONS_FOOTNOTE =
  'Amounts here are a pinch or a splash. If you use a lot of sauce, log it so your diary stays honest.';

const MEAL_ADDITIONS = {
  // ─── OMNIVORE ───────────────────────────────────────────────────────────
  curated_om_eggs_salmon_oats: [
    { name: 'Black pepper & chives', why: 'The classic finish for scrambled eggs.' },
    { name: 'Fresh dill', why: 'Dill and smoked salmon are made for each other.' },
    { name: 'Lemon zest', why: 'Cuts through the rich salmon.' },
    { name: 'Chilli flakes', why: 'A little heat to wake it up.' },
  ],
  curated_om_eggs_toast_salmon: [
    { name: 'Black pepper & dill', why: 'Pepper and dill lift eggs and salmon.' },
    { name: 'Lemon', why: 'Brightens the smoked salmon.' },
    { name: 'Capers', why: 'A salty pop that suits salmon.' },
    { name: 'Chilli flakes', why: 'Gentle heat on the toast.' },
  ],
  curated_om_bacon_eggs: [
    { name: 'Black pepper', why: 'Sharpens bacon and eggs.' },
    { name: 'Smoked paprika', why: 'Deepens the smoky, savoury notes.' },
    { name: 'Chives', why: 'Fresh onion lift over the top.' },
    { name: 'A dash of hot sauce', why: 'Heat that cuts the richness.' },
  ],
  curated_om_chicken_rice: [
    { name: 'Saffron or turmeric', why: 'Turns plain rice golden and fragrant.' },
    { name: 'Garlic & black pepper', why: 'Savoury depth on the chicken.' },
    { name: 'Paprika or chilli flakes', why: 'Warmth and a little heat.' },
    { name: 'Fresh coriander & lemon', why: 'Brightens the whole plate.' },
    { name: 'A splash of soy sauce', why: 'Savoury, salty edge for the rice.' },
  ],
  curated_om_beef_chilli: [
    { name: 'Cumin & smoked paprika', why: 'The backbone of a proper chilli.' },
    { name: 'Chilli powder', why: 'Dial the heat to your taste.' },
    { name: 'Fresh coriander', why: 'A fresh lift over the rich beef.' },
    { name: 'Lime', why: 'A squeeze sharpens the whole bowl.' },
    { name: 'Dried oregano', why: 'A quiet Mexican-style aroma.' },
  ],
  curated_om_spag_bol: [
    { name: 'Garlic & dried oregano', why: 'The base of any Italian ragu.' },
    { name: 'Fresh basil', why: 'Stirred in at the end for aroma.' },
    { name: 'Black pepper', why: 'Sharpens the tomato and beef.' },
    { name: 'Chilli flakes', why: 'Turns it into an arrabbiata kick.' },
    { name: 'A splash of balsamic', why: 'Rounds out the tomato sauce.' },
  ],
  curated_om_turkey_stirfry: [
    { name: 'A splash of soy sauce', why: 'The savoury base of any stir-fry.' },
    { name: 'Fresh ginger & garlic', why: 'The aromatic heart of the wok.' },
    { name: 'Chilli flakes', why: 'Heat to taste.' },
    { name: 'Spring onion', why: 'Fresh, sharp finish off the heat.' },
    { name: 'Lime', why: 'A squeeze brightens everything.' },
  ],
  curated_om_salmon_rice_broccoli: [
    { name: 'Dill & lemon', why: 'The pairing salmon was born for.' },
    { name: 'Garlic & black pepper', why: 'Savoury depth on the fish.' },
    { name: 'Chilli flakes', why: 'A little heat against the rich salmon.' },
    { name: 'A splash of soy sauce', why: 'Glazes the rice and broccoli.' },
  ],
  curated_om_cod_bake: [
    { name: 'Black pepper & parsley', why: 'Clean, classic with white fish.' },
    { name: 'Lemon', why: 'A squeeze lifts mild cod.' },
    { name: 'Paprika', why: 'A little colour and warmth on the bake.' },
    { name: 'Mustard powder', why: 'A pinch sharpens the cheese.' },
  ],
  curated_om_chicken_sweetpot_greens: [
    { name: 'Paprika & cumin', why: 'Earthy spices that love sweet potato.' },
    { name: 'Garlic', why: 'Savoury depth on the chicken.' },
    { name: 'Chilli flakes', why: 'Heat to balance the sweetness.' },
    { name: 'Rosemary', why: 'A fragrant roast-dinner note.' },
    { name: 'Lemon', why: 'Brightens the greens.' },
  ],
  curated_om_chicken_jacket: [
    { name: 'Black pepper & chives', why: 'The fluffy-jacket classic.' },
    { name: 'Paprika', why: 'A warm dusting on the chicken.' },
    { name: 'A splash of balsamic', why: 'A sweet-sharp dressing for the salad.' },
    { name: 'Mustard', why: 'A little sharpness with the potato.' },
  ],
  curated_om_jacket_tuna: [
    { name: 'Black pepper & spring onion', why: 'The proper tuna-jacket finish.' },
    { name: 'A splash of vinegar', why: 'Sharpens the tuna mix.' },
    { name: 'Chilli flakes', why: 'A little heat through the tuna.' },
    { name: 'Lemon', why: 'Freshens it up.' },
  ],
  curated_om_steak_potatoes: [
    { name: 'Black pepper & garlic', why: 'All a good steak really needs.' },
    { name: 'Rosemary or thyme', why: 'Fragrant herbs for steak and potatoes.' },
    { name: 'Mustard', why: 'A classic sharp partner for beef.' },
    { name: 'Horseradish', why: 'A little heat that cuts the richness.' },
  ],
  curated_om_prawn_stirfry: [
    { name: 'Garlic & ginger', why: 'The aromatic base prawns love.' },
    { name: 'Chilli', why: 'Heat that suits sweet prawns.' },
    { name: 'Lime & coriander', why: 'A fresh, zingy finish.' },
    { name: 'A splash of soy sauce', why: 'Savoury glaze for the rice.' },
  ],
  curated_om_chicken_pasta: [
    { name: 'Garlic & basil', why: 'The heart of a tomato pasta.' },
    { name: 'Dried oregano', why: 'A quiet Italian aroma.' },
    { name: 'Chilli flakes', why: 'For an arrabbiata-style kick.' },
    { name: 'Black pepper', why: 'Sharpens the sauce.' },
  ],
  curated_om_beef_rice_greens: [
    { name: 'Garlic & black pepper', why: 'Savoury depth on the mince.' },
    { name: 'A splash of soy sauce', why: 'Glazes the rice and greens.' },
    { name: 'Chilli flakes', why: 'Heat to taste.' },
    { name: 'Paprika', why: 'A warm, smoky note.' },
  ],
  curated_om_turkey_potato_greens: [
    { name: 'Rosemary & garlic', why: 'A roast-dinner aroma over lean turkey.' },
    { name: 'Black pepper', why: 'Lifts mild turkey mince.' },
    { name: 'Paprika', why: 'Warmth and a little colour.' },
    { name: 'Lemon', why: 'Brightens the greens.' },
  ],
  curated_om_salmon_sweetpot: [
    { name: 'Dill & lemon', why: 'Salmon and dill, every time.' },
    { name: 'Paprika & cumin', why: 'Earthy spices for the sweet potato.' },
    { name: 'Black pepper', why: 'Savoury edge on the fish.' },
    { name: 'Chilli flakes', why: 'Heat against the richness.' },
  ],
  curated_om_cod_rice_peas: [
    { name: 'Lemon & parsley', why: 'Clean and fresh with white fish.' },
    { name: 'Black pepper & garlic', why: 'Savoury depth on the cod.' },
    { name: 'Fresh mint', why: 'Mint and peas are a classic pair.' },
    { name: 'Chilli flakes', why: 'A gentle heat.' },
  ],
  curated_om_chicken_potato_veg: [
    { name: 'Garlic & mixed herbs', why: 'A simple roast-dinner aroma.' },
    { name: 'Paprika', why: 'Warm colour on the chicken.' },
    { name: 'Rosemary', why: 'Fragrant with potatoes.' },
    { name: 'Lemon', why: 'Brightens the veg.' },
  ],
  curated_om_sn_tuna_ricecakes: [
    { name: 'Black pepper', why: 'Sharpens the tuna.' },
    { name: 'Chilli flakes', why: 'A little heat on top.' },
    { name: 'Lemon', why: 'Freshens the tuna.' },
    { name: 'Spring onion', why: 'A crisp, savoury bite.' },
  ],
  curated_om_pre_chicken_rice: [
    { name: 'Garlic & paprika', why: 'Flavour without slowing digestion.' },
    { name: 'A splash of soy sauce', why: 'Savoury lift for the rice.' },
    { name: 'Black pepper', why: 'Sharpens mild chicken.' },
    { name: 'Chilli flakes', why: 'A gentle kick.' },
  ],
  curated_om_post_chicken_rice: [
    { name: 'A splash of soy sauce', why: 'Savoury glaze for the rice.' },
    { name: 'Garlic & chilli', why: 'Depth and a little heat.' },
    { name: 'Coriander & lime', why: 'A fresh, zingy finish.' },
    { name: 'Black pepper', why: 'Lifts mild chicken.' },
  ],

  // ─── PESCATARIAN (Phase B, 2026-07-09) ─────────────────────────────────
  curated_pesc_bf_salmon_bagel: [
    { name: 'Black pepper & chives', why: 'The classic finish for eggs and salmon.' },
    { name: 'Fresh dill', why: 'Dill and smoked salmon are made for each other.' },
    { name: 'Lemon zest', why: 'Cuts through the rich salmon.' },
    { name: 'Capers', why: 'A salty pop that suits the bagel.' },
  ],
  curated_pesc_bf_salmon_sourdough: [
    { name: 'Black pepper & dill', why: 'Pepper and dill lift eggs and salmon.' },
    { name: 'Lemon', why: 'Brightens the smoked salmon.' },
    { name: 'Chilli flakes', why: 'A little heat on the toast.' },
    { name: 'Nutmeg', why: 'A pinch lifts the spinach.' },
  ],
  curated_pesc_tuna_sweetpot_salad: [
    { name: 'Black pepper & spring onion', why: 'The classic tuna finish.' },
    { name: 'Paprika or cumin', why: 'Earthy warmth for the sweet potato.' },
    { name: 'A splash of vinegar', why: 'Sharpens the tuna mix.' },
    { name: 'Chilli flakes', why: 'A little heat through the bowl.' },
  ],
  curated_pesc_salmon_quinoa_greenbeans: [
    { name: 'Dill & lemon', why: 'The pairing salmon was born for.' },
    { name: 'Garlic & black pepper', why: 'Savoury depth on the fish.' },
    { name: 'Chilli flakes', why: 'A little heat against the rich salmon.' },
    { name: 'Fresh mint', why: 'A fresh lift on the green beans.' },
  ],
  curated_pesc_cod_sweetpot_spinach: [
    { name: 'Lemon & parsley', why: 'Clean and fresh with white fish.' },
    { name: 'Paprika & cumin', why: 'Earthy spices for the sweet potato.' },
    { name: 'Black pepper', why: 'Sharpens mild cod.' },
    { name: 'Nutmeg', why: 'A pinch lifts the spinach.' },
  ],
  curated_pesc_prawn_tomato_pasta: [
    { name: 'Garlic & basil', why: 'The heart of a tomato sauce.' },
    { name: 'Chilli flakes', why: 'For an arrabbiata-style kick.' },
    { name: 'Black pepper', why: 'Sharpens the sauce.' },
    { name: 'Lemon', why: 'Brightens sweet prawns.' },
  ],
  curated_pesc_tuna_bean_rice: [
    { name: 'Black pepper & spring onion', why: 'The proper tuna finish.' },
    { name: 'A splash of vinegar', why: 'Sharpens the tuna mix.' },
    { name: 'Chilli flakes', why: 'A little heat through the bowl.' },
    { name: 'Fresh coriander', why: 'A fresh lift over the beans.' },
  ],
  curated_pesc_prawn_noodles: [
    { name: 'Garlic & ginger', why: 'The aromatic base prawns love.' },
    { name: 'A splash of soy sauce', why: 'Savoury glaze for the noodles.' },
    { name: 'Chilli', why: 'Heat that suits sweet prawns.' },
    { name: 'Lime & coriander', why: 'A fresh, zingy finish.' },
  ],
  curated_pesc_sn_salmon_cottage: [
    { name: 'Black pepper & chives', why: 'Lifts smoked salmon and cottage cheese.' },
    { name: 'Fresh dill', why: 'Dill and salmon are made for each other.' },
    { name: 'Lemon zest', why: 'A fresh, bright twist.' },
  ],
  curated_pesc_sn_prawn_avocado: [
    { name: 'Lime', why: 'Brightens the avocado.' },
    { name: 'Chilli flakes', why: 'Heat to taste.' },
    { name: 'Black pepper', why: 'Sharpens sweet prawns.' },
    { name: 'Fresh coriander', why: 'A fresh, zingy lift.' },
  ],

  // ─── VEGETARIAN ─────────────────────────────────────────────────────────
  curated_veg_protein_porridge: [
    { name: 'Cinnamon', why: 'Makes oats taste sweet with no sugar.' },
    { name: 'Vanilla extract', why: 'A warm, dessert-like aroma.' },
    { name: 'Cocoa powder', why: 'Turns it into a chocolate porridge.' },
    { name: 'A little sweetener', why: 'Extra sweetness, no sugar.' },
  ],
  curated_veg_overnight_oats: [
    { name: 'Cinnamon', why: 'Natural sweetness, no sugar.' },
    { name: 'Vanilla extract', why: 'Rounds out the flavour.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
    { name: 'Lemon zest', why: 'A fresh, bright twist.' },
  ],
  curated_veg_protein_pancakes: [
    { name: 'Cinnamon', why: 'Warm sweetness with no sugar.' },
    { name: 'Vanilla extract', why: 'A classic pancake aroma.' },
    { name: 'Sugar-free syrup', why: 'That syrup hit, no sugar.' },
    { name: 'Cocoa powder', why: 'Chocolate pancakes.' },
  ],
  curated_veg_greek_yogurt_bowl: [
    { name: 'Cinnamon', why: 'Sweetens the yogurt, no sugar.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Lemon zest', why: 'Fresh against the berries.' },
    { name: 'Cocoa powder', why: 'A chocolate twist.' },
  ],
  curated_veg_skyr_berry_bowl: [
    { name: 'Cinnamon', why: 'Natural sweetness, no sugar.' },
    { name: 'Vanilla extract', why: 'Rounds out the tang of skyr.' },
    { name: 'Lemon zest', why: 'Brightens the berries.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
  ],
  curated_veg_eggwhite_scramble_sourdough: [
    { name: 'Black pepper & chives', why: 'The scramble classic.' },
    { name: 'Nutmeg', why: 'A pinch lifts the spinach.' },
    { name: 'Chilli flakes', why: 'Heat across the toast.' },
    { name: 'Garlic', why: 'Savoury depth in the eggs.' },
  ],
  curated_veg_cottage_toast_egg: [
    { name: 'Black pepper & chives', why: 'Lifts mild cottage cheese.' },
    { name: 'Chilli flakes', why: 'A little heat on top.' },
    { name: 'Paprika', why: 'Warm colour over the egg.' },
    { name: 'A dash of hot sauce', why: 'A savoury kick.' },
  ],
  curated_veg_quorn_chilli: [
    { name: 'Cumin & smoked paprika', why: 'The backbone of a chilli.' },
    { name: 'Chilli powder', why: 'Heat to your taste.' },
    { name: 'Fresh coriander', why: 'A fresh lift over the top.' },
    { name: 'Lime', why: 'A squeeze sharpens the bowl.' },
  ],
  curated_veg_quorn_bolognese: [
    { name: 'Garlic & oregano', why: 'The Italian ragu base.' },
    { name: 'Fresh basil', why: 'Aromatic, stirred in at the end.' },
    { name: 'Black pepper', why: 'Sharpens the tomato.' },
    { name: 'Chilli flakes', why: 'For an arrabbiata kick.' },
  ],
  curated_veg_quorn_pieces_curry: [
    { name: 'Garam masala & turmeric', why: 'The base of a proper curry.' },
    { name: 'Ginger & garlic', why: 'The aromatic heart of the dish.' },
    { name: 'Fresh coriander', why: 'A fresh finish over the curry.' },
    { name: 'Chilli', why: 'Heat to taste.' },
  ],
  curated_veg_halloumi_veg: [
    { name: 'Dried oregano', why: 'A Mediterranean note for halloumi.' },
    { name: 'Fresh mint', why: 'Mint and halloumi are a classic pair.' },
    { name: 'Black pepper & chilli', why: 'Lifts the salty cheese.' },
    { name: 'Lemon', why: 'Cuts through the richness.' },
  ],
  curated_veg_egg_fried_rice_tofu: [
    { name: 'A splash of soy sauce', why: 'The savoury base of fried rice.' },
    { name: 'Ginger & garlic', why: 'The aromatic heart of the wok.' },
    { name: 'Chinese five-spice', why: 'A quick, authentic depth.' },
    { name: 'Spring onion', why: 'Fresh, sharp finish.' },
  ],
  curated_veg_jacket_cheese_beans: [
    { name: 'Black pepper & chives', why: 'The fluffy-jacket classic.' },
    { name: 'Chilli flakes', why: 'Heat through the beans.' },
    { name: 'Mustard', why: 'Sharpens the cheese.' },
    { name: 'Paprika', why: 'Warm colour on top.' },
  ],
  curated_veg_sn_yogurt_whey: [
    { name: 'Cinnamon', why: 'Sweetens it, no sugar.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
  ],
  curated_veg_sn_cottage_pineapple: [
    { name: 'Cinnamon', why: 'Warm sweetness over the fruit.' },
    { name: 'Fresh mint', why: 'Fresh against the pineapple.' },
    { name: 'Lime zest', why: 'A zingy lift.' },
    { name: 'Black pepper', why: 'A surprising savoury edge on pineapple.' },
  ],
  curated_veg_pre_oats_whey: [
    { name: 'Cinnamon', why: 'Sweet flavour, no sugar.' },
    { name: 'Vanilla extract', why: 'Rounds it out.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
  ],
  curated_veg_pre_yogurt_ricecakes: [
    { name: 'Cinnamon', why: 'Natural sweetness on the yogurt.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Lemon zest', why: 'A fresh twist.' },
  ],
  curated_veg_post_whey_banana: [
    { name: 'Cinnamon', why: 'Pairs sweetly with banana.' },
    { name: 'Cocoa powder', why: 'A chocolate-banana shake.' },
    { name: 'Vanilla extract', why: 'Rounds out the shake.' },
  ],
  curated_veg_post_skyr_berries: [
    { name: 'Cinnamon', why: 'Sweetens the skyr.' },
    { name: 'Vanilla extract', why: 'Softens the tang.' },
    { name: 'Lemon zest', why: 'Brightens the berries.' },
  ],

  // Phase B (2026-07-09)
  curated_veg_bf_weetabix_banana: [
    { name: 'Cinnamon', why: 'Warm sweetness, no sugar.' },
    { name: 'Vanilla extract', why: 'Rounds out the milk and banana.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
  ],
  curated_veg_bf_cottage_granola: [
    { name: 'Cinnamon', why: 'Natural sweetness, no sugar.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Lemon zest', why: 'A fresh, bright twist.' },
  ],
  curated_veg_paneer_curry: [
    { name: 'Garam masala & turmeric', why: 'The base of a proper curry.' },
    { name: 'Ginger & garlic', why: 'The aromatic heart of the dish.' },
    { name: 'Fresh coriander', why: 'A fresh finish over the curry.' },
    { name: 'Chilli', why: 'Heat to taste.' },
  ],
  curated_veg_halloumi_quinoa: [
    { name: 'Dried oregano', why: 'A Mediterranean note for halloumi.' },
    { name: 'Fresh mint', why: 'Mint and halloumi are a classic pair.' },
    { name: 'Black pepper & chilli', why: 'Lifts the salty cheese.' },
    { name: 'Lemon', why: 'Cuts through the richness.' },
  ],
  curated_veg_cottage_jacket: [
    { name: 'Black pepper & chives', why: 'The fluffy-jacket classic.' },
    { name: 'Paprika', why: 'Warm colour on top.' },
    { name: 'Mustard', why: 'Sharpens the cottage cheese.' },
    { name: 'Chilli flakes', why: 'A little heat through the salad.' },
  ],
  curated_veg_mushroom_omelette: [
    { name: 'Black pepper & chives', why: 'The scramble classic.' },
    { name: 'Garlic', why: 'Savoury depth in the mushrooms.' },
    { name: 'Fresh thyme', why: 'A quiet, earthy aroma with mushrooms.' },
    { name: 'Chilli flakes', why: 'Heat across the sourdough.' },
  ],
  curated_veg_sn_cheese_toast: [
    { name: 'Black pepper', why: 'Sharpens melted cheese.' },
    { name: 'Mustard', why: 'A classic sharp partner for cheese on toast.' },
    { name: 'Chilli flakes', why: 'A little heat on top.' },
  ],
  curated_veg_sn_yogurt_granola_berries: [
    { name: 'Cinnamon', why: 'Sweetens the yogurt, no sugar.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Lemon zest', why: 'Brightens the berries.' },
  ],
  curated_veg_sn_paneer_apple: [
    { name: 'Cinnamon', why: 'Warm sweetness over the apple.' },
    { name: 'Black pepper', why: 'A surprising savoury edge with paneer.' },
    { name: 'Lemon zest', why: 'A fresh, bright twist.' },
  ],

  // ─── VEGAN ──────────────────────────────────────────────────────────────
  curated_vg_tofu_scramble: [
    { name: 'Turmeric', why: 'Gives tofu that golden, eggy colour.' },
    { name: 'Kala namak (black salt)', why: 'The trick that makes tofu taste of egg.' },
    { name: 'Nutritional yeast', why: 'A savoury, cheesy depth.' },
    { name: 'Black pepper & chilli', why: 'Lifts and warms the scramble.' },
  ],
  curated_vg_overnight_oats: [
    { name: 'Cinnamon', why: 'Sweetens the oats, no sugar.' },
    { name: 'Vanilla extract', why: 'Rounds out the flavour.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
    { name: 'A little sweetener', why: 'Extra sweetness, no sugar.' },
  ],
  curated_vg_protein_pancakes: [
    { name: 'Cinnamon', why: 'Warm sweetness with no sugar.' },
    { name: 'Vanilla extract', why: 'A classic pancake aroma.' },
    { name: 'Sugar-free syrup', why: 'That syrup hit, no sugar.' },
    { name: 'Cocoa powder', why: 'Chocolate pancakes.' },
  ],
  curated_vg_soy_yogurt_granola: [
    { name: 'Cinnamon', why: 'Natural sweetness on the yogurt.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Lemon zest', why: 'Fresh against the berries.' },
    { name: 'Cocoa powder', why: 'A chocolate twist.' },
  ],
  curated_vg_chickpea_pancakes: [
    { name: 'Cinnamon', why: 'Warm sweetness with no sugar.' },
    { name: 'Vanilla extract', why: 'A classic pancake aroma.' },
    { name: 'Sugar-free syrup', why: 'That syrup hit, no sugar.' },
    { name: 'Cocoa powder', why: 'Chocolate pancakes.' },
  ],
  curated_vg_chia_pudding: [
    { name: 'Cinnamon', why: 'Sweetens the pudding, no sugar.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Lemon zest', why: 'Fresh against the berries.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
  ],
  curated_vg_green_smoothie: [
    { name: 'Cinnamon', why: 'Warm sweetness, no sugar.' },
    { name: 'Vanilla extract', why: 'Rounds out the berries.' },
    { name: 'Fresh mint', why: 'A fresh, cooling lift.' },
    { name: 'Lemon zest', why: 'Brightens the whole blend.' },
  ],
  curated_vg_beans_tofu_toast: [
    { name: 'Black pepper & chives', why: 'The beans-on-toast classic.' },
    { name: 'Chilli flakes', why: 'Heat through the beans.' },
    { name: 'A dash of hot sauce', why: 'A savoury kick.' },
    { name: 'Turmeric', why: 'Gives the tofu that golden colour.' },
  ],
  curated_vg_tempeh_avocado_wrap: [
    { name: 'Lime', why: 'Brightens the avocado.' },
    { name: 'Chilli flakes', why: 'Heat to taste.' },
    { name: 'Fresh coriander', why: 'A fresh, zingy lift.' },
    { name: 'Black pepper & garlic', why: 'Savoury depth on the tempeh.' },
  ],
  curated_vg_soyyog_pb_banana: [
    { name: 'Cinnamon', why: 'Pairs sweetly with banana.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
  ],
  curated_vg_tofu_stirfry: [
    { name: 'A splash of soy sauce', why: 'The savoury base of a stir-fry.' },
    { name: 'Ginger & garlic', why: 'The aromatic heart of the wok.' },
    { name: 'Chilli', why: 'Heat to taste.' },
    { name: 'Lime & spring onion', why: 'A fresh, sharp finish.' },
  ],
  curated_vg_tempeh_sweetpot: [
    { name: 'Smoked paprika & cumin', why: 'Earthy spices that love sweet potato.' },
    { name: 'Garlic', why: 'Savoury depth on the tempeh.' },
    { name: 'Chilli', why: 'Heat against the sweetness.' },
    { name: 'Lime', why: 'A squeeze brightens the bowl.' },
  ],
  curated_vg_lentil_chilli: [
    { name: 'Cumin & smoked paprika', why: 'The backbone of a chilli.' },
    { name: 'Chilli powder', why: 'Dial the heat to taste.' },
    { name: 'Fresh coriander', why: 'A fresh lift over the lentils.' },
    { name: 'Lime', why: 'Sharpens the whole bowl.' },
  ],
  curated_vg_chickpea_lentil_curry: [
    { name: 'Garam masala & turmeric', why: 'The base of a proper curry.' },
    { name: 'Cumin', why: 'Earthy warmth through the dish.' },
    { name: 'Ginger & garlic', why: 'The aromatic heart.' },
    { name: 'Fresh coriander & chilli', why: 'Fresh finish with heat.' },
  ],
  curated_vg_quorn_curry: [
    { name: 'Curry powder & turmeric', why: 'A quick, authentic curry base.' },
    { name: 'Ginger & garlic', why: 'The aromatic heart of the dish.' },
    { name: 'Fresh coriander', why: 'A fresh finish.' },
    { name: 'Chilli', why: 'Heat to taste.' },
  ],
  curated_vg_seitan_potato_greens: [
    { name: 'Garlic & rosemary', why: 'A roast-dinner aroma.' },
    { name: 'Black pepper', why: 'Savoury edge on the seitan.' },
    { name: 'Paprika', why: 'Warm colour and depth.' },
    { name: 'Mustard', why: 'A sharp partner for the potatoes.' },
  ],
  curated_vg_seitan_noodles: [
    { name: 'A splash of soy sauce', why: 'The savoury base of a noodle bowl.' },
    { name: 'Ginger & garlic', why: 'The aromatic heart of the wok.' },
    { name: 'Chinese five-spice', why: 'A quick, authentic depth.' },
    { name: 'Chilli & spring onion', why: 'Heat and a fresh finish.' },
  ],
  curated_vg_tofu_sweetpot: [
    { name: 'Smoked paprika & cumin', why: 'Earthy spices for sweet potato.' },
    { name: 'Garlic', why: 'Savoury depth on the tofu.' },
    { name: 'Chilli', why: 'Heat against the sweetness.' },
    { name: 'Lime', why: 'A squeeze brightens it.' },
  ],
  curated_vg_soya_mince_bolognese: [
    { name: 'Garlic & oregano', why: 'The Italian ragu base.' },
    { name: 'Fresh basil', why: 'Aromatic, stirred in at the end.' },
    { name: 'Black pepper', why: 'Sharpens the tomato.' },
    { name: 'Chilli flakes', why: 'For an arrabbiata kick.' },
  ],
  curated_vg_blackbean_sweetpot: [
    { name: 'Smoked paprika & cumin', why: 'Earthy spices that love sweet potato.' },
    { name: 'Fresh coriander', why: 'A fresh lift over the beans.' },
    { name: 'Lime', why: 'Sharpens the whole bowl.' },
    { name: 'Chilli', why: 'Heat to taste.' },
  ],
  curated_vg_sn_edamame: [
    { name: 'Sea salt flakes & chilli', why: 'The classic edamame finish.' },
    { name: 'A splash of soy sauce', why: 'Savoury, salty edge.' },
    { name: 'Lime', why: 'A fresh squeeze on top.' },
    { name: 'Black pepper', why: 'A little sharpness.' },
  ],
  curated_vg_sn_soy_yogurt_pb: [
    { name: 'Cinnamon', why: 'Sweetens the yogurt, no sugar.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
  ],
  curated_vg_sn_pea_shake_berries: [
    { name: 'Cinnamon', why: 'Warm, natural sweetness.' },
    { name: 'Vanilla extract', why: 'Rounds out the shake.' },
    { name: 'Cocoa powder', why: 'A chocolate-berry shake.' },
  ],
  curated_vg_pre_soy_oats_banana: [
    { name: 'Cinnamon', why: 'Pairs with banana, no sugar.' },
    { name: 'Vanilla extract', why: 'Rounds it out.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
  ],
  curated_vg_post_pea_oats_berries: [
    { name: 'Cinnamon', why: 'Sweet flavour with no sugar.' },
    { name: 'Vanilla extract', why: 'A dessert-like finish.' },
    { name: 'Lemon zest', why: 'Brightens the berries.' },
  ],
  curated_vg_post_soy_banana_shake: [
    { name: 'Cinnamon', why: 'Pairs sweetly with banana.' },
    { name: 'Cocoa powder', why: 'A chocolate-banana shake.' },
    { name: 'Vanilla extract', why: 'Rounds out the shake.' },
  ],

  // Phase B (2026-07-09)
  curated_vg_sn_chickpeas: [
    { name: 'Smoked paprika & cumin', why: 'Turns plain chickpeas into a proper snack.' },
    { name: 'Chilli powder', why: 'Dial the heat to taste.' },
    { name: 'Lemon zest', why: 'A fresh, bright twist.' },
  ],
  curated_vg_sn_shake_apple: [
    { name: 'Cinnamon', why: 'Warm sweetness, no sugar.' },
    { name: 'Vanilla extract', why: 'Rounds out the shake.' },
    { name: 'Cocoa powder', why: 'A chocolate version.' },
  ],
  curated_vg_sn_tofu_edamame: [
    { name: 'Sea salt flakes & chilli', why: 'The classic edamame finish.' },
    { name: 'A splash of soy sauce', why: 'Savoury, salty edge.' },
    { name: 'Turmeric', why: 'Gives the tofu a golden colour.' },
    { name: 'Lime', why: 'A fresh squeeze on top.' },
  ],
  curated_vg_sn_edamame_ricecakes: [
    { name: 'Sea salt flakes & chilli', why: 'The classic edamame finish.' },
    { name: 'A splash of soy sauce', why: 'Savoury, salty edge.' },
    { name: 'Black pepper', why: 'A little sharpness.' },
  ],
  curated_vg_chickpea_quinoa_lentil_bowl: [
    { name: 'Lemon & garlic', why: 'Brightens the chickpeas and quinoa.' },
    { name: 'Cumin', why: 'Earthy warmth through the bowl.' },
    { name: 'Fresh coriander', why: 'A fresh finish over the top.' },
    { name: 'Chilli flakes', why: 'A little heat to taste.' },
  ],
  curated_vg_lentilpasta_tomato_spinach: [
    { name: 'Garlic & oregano', why: 'The Italian ragu base.' },
    { name: 'Fresh basil', why: 'Aromatic, stirred in at the end.' },
    { name: 'Black pepper', why: 'Sharpens the tomato sauce.' },
    { name: 'Chilli flakes', why: 'For an arrabbiata kick.' },
  ],
  curated_vg_tofu_asparagus_stirfry: [
    { name: 'A splash of soy sauce', why: 'The savoury base of a stir-fry.' },
    { name: 'Ginger & garlic', why: 'The aromatic heart of the wok.' },
    { name: 'Chilli', why: 'Heat to taste.' },
    { name: 'Lemon zest', why: 'Brightens the asparagus.' },
  ],
};

// Generic fallback: savoury vs sweet, chosen by a light heuristic on the meal
// name so any meal not explicitly authored (or any future meal) still teaches a
// few safe, free additions rather than showing nothing.
const SWEET_FALLBACK = [
  { name: 'Cinnamon', why: 'Sweet flavour with no sugar.' },
  { name: 'Vanilla extract', why: 'A warm, dessert-like aroma.' },
  { name: 'Cocoa powder', why: 'A chocolate twist, no sugar.' },
  { name: 'A little sweetener', why: 'Extra sweetness, no sugar.' },
];
const SAVOURY_FALLBACK = [
  { name: 'Black pepper & garlic', why: 'Savoury depth for almost any meal.' },
  { name: 'Paprika or chilli flakes', why: 'Warmth and a little heat.' },
  { name: 'Fresh herbs', why: 'A fresh lift over the top.' },
  { name: 'Lemon or lime', why: 'A squeeze brightens the plate.' },
];

const SWEET_HINT = /(oat|porridge|pancake|yogurt|skyr|shake|berr|banana|granola)/i;

/**
 * Additions for a curated meal. Returns the authored list, or a savoury/sweet
 * generic fallback if the meal isn't explicitly listed. Never returns empty.
 */
export function getMealAdditions(meal) {
  if (!meal) return SAVOURY_FALLBACK;
  const byId = MEAL_ADDITIONS[meal.id];
  if (byId && byId.length) return byId;
  return SWEET_HINT.test(meal.name || '') ? SWEET_FALLBACK : SAVOURY_FALLBACK;
}

/**
 * Additions for a DIARY meal, inferred from its logged foods. Applied meal-plan /
 * curated meals keep their `curated:<foodKey>` refs, so we match a slot's food set
 * against the curated meals by component overlap and return the best match's
 * additions. Returns null when the slot isn't a recognisable curated meal (a lone
 * item, or a mix of manual foods), so the diary only shows this on real meals and
 * stays uncluttered.
 */
export function getMealAdditionsForEntries(entries) {
  const keys = new Set();
  for (const e of entries || []) {
    const ref = e?.food_ref;
    if (typeof ref === 'string' && ref.startsWith('curated:')) keys.add(ref.slice(8));
  }
  if (keys.size < 2) return null;
  let best = null;
  let bestScore = 0;
  for (const meal of CURATED_MEALS) {
    const comps = meal.components.map((c) => c.food);
    if (!comps.length) continue;
    const overlap = comps.filter((f) => keys.has(f)).length;
    const score = overlap / comps.length;
    if (overlap >= 2 && score > bestScore) { bestScore = score; best = meal; }
  }
  if (!best || bestScore < 0.6) return null;
  return getMealAdditions(best);
}

export { MEAL_ADDITIONS };
