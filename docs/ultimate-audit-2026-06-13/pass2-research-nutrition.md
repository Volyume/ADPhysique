# PASS 2 — RESEARCH: NUTRITION (area code NU)

Method: direct, no agents, provenance-labelled. This area reached genuine UK sources (food DB).

## FINDINGS
- **NU-F1** | Macro-target FLEXIBILITY is a key differentiator: best-in-class (MacroFactor) offers
  fixed targets / calorie-only / macro RANGES / per-day macro cycling (training vs rest) / fully
  algorithm-managed; MyFitnessPal = basic fixed %-splits. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR
  (incl. MacroFactor vendor blog — flagged) | US-SKEWED. → Volyume HAS macro cycling (Pass-1-verified
  coachApply.computeMacroCycle: training-day carb shift, MACRO_CYCLE_REST_DAY_CARB_CUT 0.25) + 4 protein
  approaches incl. ranges/custom (nutritionEngine PROTEIN_APPROACHES) — at parity on flexibility.
- **NU-F2** | Apps with weekly personalised adjustment drive significant weight loss vs logging-only
  (which shows "nonsignificant findings"). | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | US-SKEWED.
  (Echoes AC-F2; corroborates the value of Volyume's adaptive weekly loop.)
- **NU-F3** | **UK food-database benchmark** (UK-REPRESENTATIVE): Nutracheck = "gold standard for UK
  calorie counting", 500,000+ UK supermarket/restaurant/brand foods, nutritionist-verified, food images;
  NutraSafe = UK supermarkets (Tesco/Sainsbury's/Asda), Premium £6.99/mo or £29.99/yr; Carbs & Cals =
  272,000 UK food/drink photos. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (nutrasafe.co.uk,
  home-cooks.co.uk UK roundups) | **UK-REPRESENTATIVE**. → Directly drives Volyume U-C-7 (UK food DB
  make-or-break): the UK bar is Nutracheck's ~500k nutritionist-verified UK foods + barcode + images.
  Volyume's food DB scope/verification = Pass-1 Section 3 `foods`/`custom_foods` tables, VALUE DEFERRED
  (verify Volyume's UK coverage vs this bar when the U-C-7 blueprint is built).
- **NU-F4** | MacroFactor complaints: manual logging time-consuming; occasional DB inaccuracies; wants
  more automation/meal recognition. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | US-SKEWED.

## APPS RESEARCHED (named): MacroFactor, MyFitnessPal, Nutracheck (UK), NutraSafe (UK), Carbs & Cals
(UK), Calorie Counter+ (UK store), Fitia, Cronometer (9). UK apps present → better breadth than prior areas.
- App count 9 (incl. 3 UK-specific) → still THIN on the 20 threshold but UK-representative coverage achieved.

## PER-AREA PROVENANCE SUMMARY
- By provenance: PRIMARY 0 fetched this area, QUANT 0 fetched, AGGREGATOR 4 (NU-F1..4), UNREACHABLE
  (nutrition subreddits). (UK QUANT available un-fetched: Calorie Counter+ GB App Store, Carbs & Cals.)
- Representativeness: **MIXED** — NU-F3 (UK food DB) is genuinely UK-REPRESENTATIVE; NU-F1/2/4 US-SKEWED.
- Plain statement: the UK food-DB benchmark (NU-F3) is the most decision-relevant finding (feeds U-C-7)
  and is UK-sourced; it's AGGREGATOR so PARTIAL — verify Volyume's actual UK coverage against Nutracheck's
  ~500k before any U-C-7 claim. Macro-flexibility parity (NU-F1) is corroborated by Pass-1 code.

Sources: [home-cooks.co.uk — UK tracking-app reviews](https://home-cooks.co.uk/pages/tracking-app-reviews) ·
[nutrasafe.co.uk — best UK calorie apps 2026](https://nutrasafe.co.uk/best-calorie-counter-apps-uk-2026) ·
[home-cooks.co.uk — Nutracheck UK review](https://home-cooks.co.uk/pages/review-nutracheck) ·
[MacroFactor vs MyFitnessPal (vendor)](https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/)
