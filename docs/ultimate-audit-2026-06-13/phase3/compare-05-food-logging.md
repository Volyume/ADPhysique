# Phase 3 master comparison — Food logging & diary (05)

Volyume Ultimate Audit, 2026-06-13. Reconciles Phase-1 inventory
(`phase1/08-food-logging.md`, file:line-grounded) against Phase-2 market research
(`phase2/research-05-food-logging.md`, status-carried). READ-ONLY. British English.

---

AREA: Food logging & diary

VOLYUME CURRENT: Volyume ships a complete Pro food diary across eight screens.
The DiaryScreen is the Diary-tab root: day pager, MacroRings summary with
training/rest/refeed day-type targets, per-meal sections on a flexible numbered
meal ladder, a hardcoded 3 L water row, weight-trend card, and a barcode-scan FAB
(DiaryScreen.js:498-657; day-type targets DiaryScreen.js:143-164; water target
hardcoded 3000 ml DiaryScreen.js:750). The whole diary domain is Pro-gated via
`withProGuard(DiaryScreen, 'Food diary')` (RootNavigator.js:160, 225). Logging one
already-visible food via search is a MINIMUM 3 taps (meal "Add" → food row → "Add
to diary"; DiaryScreen.js:591, FoodSearchScreen.js:478, FoodDetailSheet.js:169-177);
a faster plate path is also 3 taps and skips the serving sheet (FoodSearchScreen.js:480,
257-306); quick-add (no food) is 2 taps + numeric entry (DiaryScreen.js:592, 631-636).
FoodSearchScreen offers five browse tabs (Recents/Suggested/Favourites/Frequents/
Custom), a debounced 250 ms local-first waterfall search with a 2-char gate, a
multi-add "plate" with running kcal and a double-log guard, slot-aware recents that
pre-fill last portion, long-press favourite/dislike, and macro-sized meal suggestions
(FoodSearchScreen.js:104-114, 155-195, 206-226, 234-306, 396-419, 512-571).
Supporting screens: AddCustomFood (manual per-100g entry with sanity check and OCR
"unsure" flagging, AddCustomFoodScreen.js:104-188, 57-63), MyMeals (saved meal
bundles, one-tap-plus-confirm log, MyMealsScreen.js:66-88), MyRecipes + RecipeBuilder
(composed recipes logged as one line with live per-serving macros, MyRecipesScreen.js:71-86,
RecipeBuilderScreen.js:113-116), ScanBarcode (live camera waterfall lookup routing to
detail-sheet hit or ScanLabel miss, ScanBarcodeScreen.js:117-124), and ScanLabel
(two-step OCR capture handing off to AddCustomFood, degrading to manual entry,
ScanLabelScreen.js:118-135, 286-320). The barcode-miss heal chain never dead-ends
(ScanLabelScreen.js:310-316). An Open Food Facts consent card appears after a barcode
heal (DiaryScreen.js:557-576), indicating OFF is a backing barcode source.

BEST IN CLASS:
- Lowest friction / fastest: MacroFactor — a plate/timeline workflow that keeps the
  logger open between items so you do not re-launch per food; 24 total actions across
  four workflows vs MyFitnessPal's 36 (50% fewer); 3-action quick-add, 5-action
  barcode; deterministic adaptive expenditure (no LLM). Its "Describe" feature IS
  LLM-based. VERIFIED. https://macrofactor.com/new-food-logger/ ;
  https://nutriscan.app/blog/posts/macrofactor-vs-myfitnesspal-2026-93f2aa703e
- UK database (curated, verified, ED-conscious imagery): Nutracheck — curated not
  crowdsourced, 500K+ UK items, nutritionist-verified, food images, Tesco/Greggs/
  Costa/Nando's coverage. VERIFIED. https://home-cooks.co.uk/pages/review-nutracheck
- Accuracy gold standard: Cronometer — lab-verified USDA/NCC, <3% deviation, 84
  nutrients. VERIFIED. https://nutrola.app/en/blog/every-calorie-tracking-app-compared-2026
- Boundary-safe barcode backbone: Open Food Facts — 3M+ products, 24,366 UK brands,
  photo-verified, deterministic lookup, open API. VERIFIED.
  https://world.openfoodfacts.org/

TOP 50 RANGE: A wide spectrum. At the fast/accurate top sit MacroFactor (plate, 24
actions, VERIFIED) and the accuracy/curation leaders Cronometer (~380K verified, <3%,
VERIFIED) and Nutracheck (curated UK, VERIFIED). Mid-tier crowdsourced giants —
MyFitnessPal (14–20M+ DB but 36 actions and notorious duplicate noise, VERIFIED),
Lose It! (7M+, AI photo, VERIFIED), Yazio/Lifesum (~3–4M, ~10–15% error, VERIFIED),
FatSecret (9M+ free, ~15–20% error, VERIFIED) — trade accuracy for size. UK-specific
players (NutraSafe instant UK barcode VERIFIED; myfood24 79,338 branded items / 10 of
11 supermarkets VERIFIED; Calorie Counter+, Carbs & Cals, Foodzilla all PARTIAL)
cluster around UK coverage. The AI-photo tail (Cal AI ±14.6% MAPE, SnapCalorie ±19.8%,
both VERIFIED; Foodvisor/Fitia/Bitesnap PARTIAL) is fast but inaccurate and not
boundary-safe. Vendor-self-report outliers (Nutrola 8–12s, PlateLens ±1.2% in 3s) are
PARTIAL/unverified marketing and excluded from the bar.

NEWBIE VERDICT: Partial. Volyume's conventions help — day pager, meal cards, "Add"
affordances and a guiding empty state ease first use (DiaryScreen.js:578-583) — but two
weaknesses bite a beginner. First, the most visually prominent control is the amber
56px barcode FAB, not search-add, which can mislead a newbie into thinking scanning is
the main path (DiaryScreen.js:647-657, 781-787). Second, macro rings, numbered "meal
slots", the five-tab picker, and the tap-row-vs-tap-plus distinction assume nutrition
literacy a first-timer lacks (DiaryScreen.js:540-547; FoodSearchScreen.js:575-624,
474-482). The market warns this is exactly where week-one abandonment happens: ~80%
quit food logging, ~97% within a week, and the "20 wrong results" wall plus sub-10s
speed are decisive (VERIFIED). Volyume's 3-tap search and 2-tap quick-add are
competitive on speed; the open question is whether its DB returns ONE correct UK
best-match (see WHERE WE LAG).

ATHLETE VERDICT: Largely strong. Volyume serves a competitor well: carb-cycle
training/rest/refeed-day targets (DiaryScreen.js:143-164), per-100g custom entry with
separate serving/eaten weights and optional fibre (AddCustomFoodScreen.js:232-246),
reusable saved meals and composed recipes for repetitive prep diets (MyMealsScreen.js:66-88,
RecipeBuilderScreen.js:113-116), slot-aware recents/favourites/frequents and a multi-add
plate for fast repeat logging (FoodSearchScreen.js:104-114, 234-306), and copy-yesterday
(DiaryScreen.js:459-496) — which map directly onto the market's most-cited time savers
(recents/favourites/saved meals/copy-day, VERIFIED). Gaps: the hardcoded 3 L water
target (DiaryScreen.js:750), no manual-barcode-entry escape on the scanner
(ScanBarcodeScreen.js:200-203), and DB accuracy/coverage being unproven from the
inventory — the dimension athletes abandon over (VERIFIED).

WHERE WE LEAD:
- Day-type carb-cycle targets (training/rest/refeed) baked into the diary
  (DiaryScreen.js:143-164) — beyond the static calorie cap the market criticises; the
  research prizes adaptive targets that make the log "do something". VERIFIED
  (macrofactor.com/macrofactor-vs-myfitnesspal-2025/).
- Boundary-safe barcode backbone already wired to Open Food Facts (consent card after
  heal, DiaryScreen.js:557-576), which the research names the boundary-safe friction
  killer and a candidate UK barcode source. VERIFIED (macroinspector; OFF brands).
- A barcode-miss heal chain that never dead-ends — always a "Type it in" escape that
  keeps the barcode (ScanLabelScreen.js:310-316, 337-338); most apps simply fail the
  scan. (Volyume-current; no single market source asserts rivals lack this — strength
  inferred from inventory, not a sourced market claim.)
- The full recents/favourites/frequents/saved-meals/copy-yesterday set is already
  present (FoodSearchScreen.js:104-114; DiaryScreen.js:459-496; MyMealsScreen.js:66-88)
  — the single most-cited consistency driver. VERIFIED (mynetdiary myFoods).
- Deterministic, no-LLM design throughout — Volyume sidesteps the 15–25% calorie MAPE
  and as-low-as-39% portion error that plague AI-photo rivals. VERIFIED (fitia AI
  accuracy; Cal AI ±14.6%, SnapCalorie ±19.8%).

WHERE WE LAG:
- Logger does not stay open across a meal. Volyume's plate exists
  (FoodSearchScreen.js:234-306) but each per-meal log path returns to the diary
  (goBack, FoodSearchScreen.js:289, 374); MacroFactor's open plate/timeline is the
  single biggest deterministic friction reducer and underpins its 50%-fewer-actions
  lead. VERIFIED (macrofactor.com/new-food-logger; nutriscan FLSI). [The 24-vs-36 and
  3/5-action figures trace to MacroFactor's own FLSI, cross-cited by nutriscan — see
  VERIFICATION STATUS.]
- Barcode log action-count not measured. Volyume's search log is 3 taps from the diary
  (DiaryScreen.js:82-92), but the inventory gives no end-to-end barcode action count to
  compare against the market floor of 5 actions. VERIFIED bar (nutriscan FLSI);
  Volyume figure NOT CAPTURED in Phase-1.
- UK best-match / DB-accuracy unproven. The inventory shows search plumbing
  (FoodSearchScreen.js:206-226) but no evidence of a curated, verified UK best-match or
  a meaningful verified marker. The market's make-or-break is ONE correct UK top result,
  not crowdsourced duplicates; UK users hit a day-one wall on Tesco meal deals, Greggs,
  Costa, Nando's, and own-brand ranges, and OFF/crowdsourced sources carry UK barcode
  gaps. VERIFIED (Nutracheck; mynetdiary DB-accuracy; cronometer UK thread; OFF brands).
- No prominent single primary "log food" action at diary level; prominence sits on the
  barcode FAB rather than search-add (DiaryScreen.js:647-657, 79).
- Information density high on a populated day — header, pager, rings, trend, OFF card,
  N meal sections, add-meal row, water row, plus FAB (DiaryScreen.js:498-657). The
  market's cautionary tale is MFP's 2026 redesign, where space-consuming cards added
  friction and drove users away. VERIFIED (piunikaweb).

MISSING ENTIRELY:
- A staying-open plate/timeline across a whole meal (MacroFactor, VERIFIED) — Volyume's
  plate is a sub-flow that closes back to the diary, not a persistent timeline.
- Curated nutritionist-verified UK item set with food images (Nutracheck, VERIFIED) —
  not evidenced in the inventory.
- Micro-nutrient tracking depth (Cronometer 84, MyNetDiary 108 nutrients, VERIFIED) —
  Volyume's custom entry covers kcal/protein/carbs/fat/fibre only
  (AddCustomFoodScreen.js:232-240).
- Pre-logging / log-ahead for planners (VERIFIED) — Volyume can copy-yesterday and view
  future days via the pager (DiaryScreen.js:459-496, 511-538) but no dedicated pre-log
  workflow is evidenced.
- Correctly excluded by Volyume's boundary (NOT to be added): natural-language
  "Describe" logging (LLM, MacroFactor) and AI photo calorie estimation (Cal AI,
  SnapCalorie, Lose It photo) — both flagged NOT boundary-safe and weak on accuracy.
  VERIFIED.

USER SENTIMENT: The fragment surfaces wants no app fully satisfies. Users want a
single CORRECT best-match, not "100 results for the same food and all of them
incorrect" / "five, ten, sometimes twenty or more entries … vary by 20 to 40 percent"
(VERIFIED). They want a verified marker that actually means verified, not MFP's green
check that "just means enough people upvoted it" (VERIFIED). UK users want their actual
supermarket/takeaway items — "scan a Costa coffee or a Sainsbury's ready meal" and get
real data "rather than something a random user typed in years ago" (Nutracheck praise,
VERIFIED) — without US-portion contamination (VERIFIED). And the load-bearing ED-safety
signal: a BJPsych study ties harm to numeric "fixation … fuelled heavily by the app's
quantification", red/green feedback, and competitive streaks — so the diary should avoid
punitive over/under colour framing and pressure streaks (VERIFIED; flag to safety owners
per Phase-2 proposal item 7).

VERIFICATION STATUS: This block is predominantly VERIFIED. Dependencies to flag:
- The action-count benchmarks (MacroFactor 24 vs MFP 36; 3-action quick-add; 5-action
  barcode) are VERIFIED but ALL trace to a single source — MacroFactor's own Food
  Logging Speed Index, cross-cited by nutriscan.app. The fragment notes no independent
  second tap-by-tap benchmark could be confirmed, and macrofactor.com/fastest-food-logger-2025
  was Cloudflare bot-gated (figures obtained via the cross-citing secondary source).
- Rival "fastest" / sub-10s / 3-second time claims (Nutrola, PlateLens, AI-photo apps)
  are PARTIAL/UNVERIFIED vendor marketing and were excluded from the bar.
- The "heal chain never dead-ends as a lead" point is grounded in Volyume's Phase-1
  inventory; no market source explicitly asserts rivals lack this, so it is a
  Volyume-current strength, not a sourced market comparison.
- UK-coverage apps leaned on partly: NutraSafe/myfood24/Open Food Facts/Nutracheck/
  Cronometer claims used here are VERIFIED; Calorie Counter+, Carbs & Cals, Foodvisor,
  Fitia, Foodzilla are PARTIAL and not relied on for any load-bearing claim above.
