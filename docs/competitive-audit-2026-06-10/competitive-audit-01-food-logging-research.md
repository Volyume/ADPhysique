# Competitive Audit 01 — Food Logging & Diary UX Research

**Agent 5 of 14 · 10 June 2026**
**Scope:** the act of logging food — speed, friction, database quality, barcode/photo capture, meal memory — separate from nutrition coaching (Agent 4).
**Volyume baseline:** section 3.4 of `competitive-audit-00-volyume-baseline.md`.

---

## 1. Executive summary

- **Logging speed is the single strongest retention lever.** A 2023 IFIC survey found 73 % of people who quit tracking cited "too time-consuming" as the primary reason; a 2023 JMIR mHealth study found apps with per-item logging times over 30 seconds had **43 % lower 90-day retention** ([Cronometer review citing both](https://calorie-trackers.com/reviews/cronometer/), [Nutrola evidence review](https://www.nutrola.app/en/blog/do-calorie-tracking-apps-actually-work)). Over half of users quit within three weeks; only ~23 % still log consistently at three months ([welling.ai](https://www.welling.ai/articles/stop-giving-up-calorie-counting-apps)).
- **MacroFactor owns the speed crown** with its published Food Logging Speed Index (FLSI): its "speed mode" scores 24 actions across standard workflows; the strongest competitor needs ~25 % more discrete actions and the average entrant ~70 % more ([FLSI 2025 update](https://macrofactor.com/fastest-food-logger-2025/), [new food logger announcement](https://macrofactor.com/new-food-logger/)).
- **Nutracheck owns UK trust.** A nutritionist-verified, UK-only database (~300k+ items covering Tesco, Asda, Sainsbury's, Aldi, Lidl, M&S, Waitrose, Greggs, Nando's, Costa, Pret, Wetherspoon, HelloFresh, Gousto) earns it **4.9/5 on Trustpilot from ~8,000 reviews** — extraordinary for a paid app ([HomeCooks review](https://home-cooks.co.uk/pages/review-nutracheck), [Trustpilot](https://uk.trustpilot.com/review/www.nutracheck.co.uk)). MyFitnessPal sits at **1.4/5** on the same platform ([Trustpilot](https://www.trustpilot.com/review/www.myfitnesspal.com)).
- **Crowdsourced database rot is a slow retention killer.** Analysis of 50,000 calorie-tracker reviews found inaccurate-data complaints rise to **24.1 % among users past six months** — second-biggest complaint in that cohort — because experienced users hit enough bad entries to lose trust ([Nutrola 50k review analysis](https://nutrola.app/en/blog/we-analyzed-50000-calorie-tracker-reviews-what-users-actually-complain-about-2026)).
- **AI photo logging is a demo feature, not a retention feature (yet).** MFP Meal Scan identifies 71.2 % of items with ±18 % portion error ([ai-food-tracker benchmark](https://ai-food-tracker.com/reviews/myfitnesspal/)); Foodvisor users report photo results "incorrect 99 % of the time, unless eating something simple like a whole apple" ([justuseapp reviews](https://justuseapp.com/en/app/1064020872/foodvisor-calorie-counter/reviews)); a Cal AI user: "50 % of the time, it fails to log the food I just finished" ([NutriScan pricing review](https://nutriscan.app/blog/posts/cal-ai-pricing-2026-monthly-yearly-premium-abc6e7b26f)). Volyume's no-AI stance costs little here today.
- **Paywalling capture tools destroys goodwill.** MFP's 2022 barcode paywall was called "a constant string of 'fuck you' to consumers" and drove visible migration to Cronometer, Lose It and MacroFactor ([Droid-Life](https://www.droid-life.com/2022/08/24/myfitnesspal-puts-barcode-scanner-behind-premium-paywall/), [Slashdot](https://news.slashdot.org/story/22/08/25/1955238/myfitnesspal-paywalls-barcode-scanner-that-made-counting-calories-easy)). Cronometer says **64 % of its users came from MFP** ([Cronometer blog](https://cronometer.com/blog/my-fitness-pal-to-cronometer/)).

---

## 2. Ranked top 10 — best food logging experience

Ranking weighs logging speed, search quality, database trustworthiness (UK-weighted), capture tools (barcode/label/photo), meal memory, and verified user sentiment.

### 1. MacroFactor — the speed benchmark
- **Speed:** publishes the FLSI, an action-count benchmark across search, multi-add, barcode and quick-add workflows. Speed mode score: 24. Food search: 10 actions vs MFP's 15 and Cal AI's 19. MFP needs ~1.5× more taps across every workflow ([FLSI 2025](https://macrofactor.com/fastest-food-logger-2025/), [NutriScan MF vs MFP](https://nutriscan.app/blog/posts/macrofactor-vs-myfitnesspal-2026-93f2aa703e)). Most meals loggable in under 60 seconds once regulars are saved ([Mealift review](https://www.mealift.app/blog/macrofactor-review)).
- **Database:** 1,150,000–1,360,000 **fully verified** items (research databases + human-checked user submissions); no crowdsourced junk in search ([MacroFactor](https://macrofactor.com/macrofactor/), [regional coverage help doc](https://help.macrofactorapp.com/en/articles/25-how-robust-is-the-database-coverage-in-my-region)).
- **Meal memory:** remembers what you typically eat per meal slot — frequent breakfast foods float to the top of breakfast logging after a few days; favourites, smart history, flexible copy/paste ([NutriScan comparison](https://nutriscan.app/blog/posts/myfitnesspal-vs-macrofactor-2026-which-paid-tracker-b86a2f0b87)).
- **AI Describe** (voice/text, not photo): interprets ingredients + quantities, then maps to **verified database entries** — AI as a search accelerator, not a nutrition estimator ([AI food logging](https://macrofactor.com/ai-food-logging/)). This is the credible middle path between "no AI" and "AI guesses your calories".
- **Weaknesses:** no free tier ($71.99/yr); UK branded coverage thinner than Nutracheck (robust for staples, gaps in branded/rare items per its own help doc); no photo logging.

### 2. Nutracheck (Calorie Counter+) — the UK database gold standard
- **Database:** UK-only, ~300,000+ items, **manually verified by nutritionists**; supermarket own-brands and high-street chains all present; "scanning a Tesco sandwich or logging a Greggs pasty actually works", no conflicting duplicate entries ([NutraSafe 50-product scanner test](https://nutrasafe.co.uk/blog/best-food-scanner-apps-uk-2026), [HomeCooks](https://home-cooks.co.uk/pages/review-nutracheck)).
- **Barcode:** "finds almost everything" per Trustpilot reviewers; the scanner is the most-praised single feature ([Trustpilot](https://uk.trustpilot.com/review/www.nutracheck.co.uk)).
- **Speed:** entered MacroFactor's FLSI 2025 as a new entrant and "landed in the strong tier for all workflows" ([FLSI 2025](https://macrofactor.com/fastest-food-logger-2025/)).
- **Sentiment:** 4.9/5 Trustpilot, ~8,000 reviews, 7,000+ five-star — vs MFP's 1.4 ([Trustpilot](https://uk.trustpilot.com/review/www.nutracheck.co.uk)). ~£30/yr — half MFP Premium ([RunMoveTone comparison](https://runmovetone.co.uk/blog/myfitnesspal-vs-nutracheck/)).
- **Weaknesses:** weak for non-UK foods by design; "could be more modern"; favourites "sometimes seem to 'forget' items"; fiddly custom targets; no real free tier ([HomeCooks](https://home-cooks.co.uk/pages/review-nutracheck)).

### 3. MyFitnessPal — coverage and modality king, trust laggard
- **Coverage:** 14–20M items, 220–280M users; barcode + Meal Scan (photo) + Voice Log + recents make daily tracking genuinely fast *when entries are right* ([promealplan review](https://www.promealplan.com/en/blog/myfitnesspal-review-2026), [Voice Log PR](https://www.prnewswire.com/news-releases/say-it-log-it-myfitnesspal-unveils-voice-log-302329040.html)).
- **Database rot:** crowdsourced duplicates with conflicting data are the defining complaint — e.g. Chick-fil-A waffle fries with **25 entries, most wrong, half bearing a green verification tick** ([MFP community](https://community.myfitnesspal.com/en/discussion/10866427/delete-duplicate-and-incorrect-foods)); "there is SO much items in the database with incorrect nutritional values" ([MFP forums](https://community.myfitnesspal.com/en/discussion/10862172/there-is-so-much-items-in-the-database-with-incorrect-nutritional-values)).
- **Barcode paywall (Oct 2022):** still the canonical own-goal. Users: "a constant string of 'fuck you' to consumers"; mass threads on r/loseit about switching to Cronometer/Lose It/Macros ([Droid-Life](https://www.droid-life.com/2022/08/24/myfitnesspal-puts-barcode-scanner-behind-premium-paywall/), [Digital Trends](https://www.digitaltrends.com/phones/myfitnesspal-barcode-scanning-not-free-premium-subscription/), [Slashdot](https://news.slashdot.org/story/22/08/25/1955238/myfitnesspal-paywalls-barcode-scanner-that-made-counting-calories-easy)).
- **Meal Scan accuracy:** 71.2 % item ID on a 500-image test; ±18 % portion error (a 600 kcal meal logs anywhere from 492–708 kcal); 61.1 % on South Asian foods ([ai-food-tracker benchmark](https://ai-food-tracker.com/reviews/myfitnesspal/)).
- **UK:** global DB covers UK brands but riddled with US-unit entries and duplicates; UK reviewers recommend Nutracheck instead for British supermarket food ([RunMoveTone](https://runmovetone.co.uk/blog/myfitnesspal-vs-nutracheck/), [TheFitnessGuy](https://www.thefitnessguy.uk/blog/choosing-the-best-fitness-and-nutrition-app-for-uk-users-nutracheck-vs-myfitnesspal)).

### 4. Lose It! — simplicity and approachability
- Praised as the easy, fast, beginner-friendly logger; 27M-item database; strong recents/quick-add ([Amy Food Journal review](https://www.amyfoodjournal.com/blog/lose-it-app-review), [eatthismuch roundup](https://blog.eatthismuch.com/best-macro-tracking-apps/)).
- **Snap It** photo logging is Premium-only and "inconsistent in accuracy" ([Amy Food Journal](https://www.amyfoodjournal.com/blog/lose-it-app-review)).
- Quietly following MFP down the paywall path: new free accounts often find barcode scanning locked ([NutriScan pricing](https://nutriscan.app/blog/posts/lose-it-pricing-2026-free-vs-premium-2b4e921555)) — a slow-motion repeat of the 2022 backlash.
- UK coverage is US-weighted; crowdsourced accuracy issues similar to MFP at lower volume.

### 5. Cronometer — accuracy first, friction second
- **Database:** USDA FoodData Central + NCCDB + lab-verified sources only; no unverified user submissions in the public database; 84 nutrients tracked; the dietitian's choice ([calorie-trackers review](https://calorie-trackers.com/reviews/cronometer/), [Neura Health](https://neura.health/insight/cronometer-app-hands-on-review)).
- **Friction:** ~45 seconds average per meal entry; restaurant meals must be deconstructed into base ingredients ([calorie-trackers](https://calorie-trackers.com/reviews/cronometer/)) — exactly the >30 s zone the JMIR retention data warns about.
- **Barcode free** — used explicitly as a competitive wedge after MFP's paywall; "a slap in the face… [Cronometer] includes a free barcode scanner" (migrating user, [A Purple Life](https://apurplelife.com/2024/07/23/cronometer-review/)); 64 % of users are ex-MFP ([Cronometer blog](https://cronometer.com/blog/my-fitness-pal-to-cronometer/)).
- UK branded coverage middling; generic/whole foods excellent.

### 6. Yazio — Europe's clean, fast packaged-food logger
- Strong European database; barcode scanning of European branded foods "matched label data reliably"; one of the cleanest UIs in the category ([calorie-trackers Yazio review](https://calorie-trackers.com/reviews/yazio/), [trygaya](https://www.trygaya.com/review/yazio-review)).
- **Weaknesses:** barcode behind Pro (heavily criticised as a paywalled basic, [Nutrola](https://nutrola.app/en/blog/is-yazio-pro-worth-it-2026)); heavy ads on free; **no offline mode at all** ([hotelgyms review](https://www.hotelgyms.com/blog/yazio-nutrition-app-review)); no voice logging; AI photo (2026) struggles beyond simple meals; weak outside Europe.

### 7. FatSecret — the honest free option
- The rare app where free means free: logging, **free barcode scanning**, weight tracking all included ([home-cooks FatSecret review](https://home-cooks.co.uk/pages/review-fatsecret)).
- UK-localised database "prioritises UK supermarket products and restaurant chains, filtering out American foods" ([home-cooks](https://home-cooks.co.uk/pages/review-fatsecret)) — underrated UK coverage.
- **Weaknesses:** stagnant development; "database inaccuracies get reported and ignored"; unreliable barcodes; more manual work than modern alternatives ([fuelnutrition review](https://fuelnutrition.app/reviews/fatsecret-review)).

### 8. Lifesum — design-led, data-poor
- Beautiful, low-clutter UI; modern AI-assisted logging reduces manual friction ([calorie-trackers Lifesum review](https://calorie-trackers.com/reviews/lifesum/)).
- **Weaknesses:** ~2M-item database with incomplete profiles; UK users report multiple conflicting entries and American cup measurements ([home-cooks Lifesum review](https://home-cooks.co.uk/pages/review-lifesum)); the 2025 multimodal AI tracker dominates recent reviews with blunders — "cashews identified as shrimp, coffee added when a mug appears in photo backgrounds, barcode scans that double or triple a product's calories" ([marlvel sentiment report](https://marlvel.ai/intel-report/health-fitness/com-sillens-ishape)); recent updates broke manual logging/meal duplication.

### 9. Foodvisor — photo-first pioneer, accuracy casualty
- One of the first photo-logging apps; works for simple visible meals.
- **Sentiment is brutal:** "picture recognition is very unreliable and almost always requires modification… at least 50 % of barcodes unrecognised"; users who bought annual subscriptions for the photo feature call it "faulty and inaccurate"; "incorrect 99 % of the time, unless eating something simple like a whole apple" ([justuseapp reviews](https://justuseapp.com/en/app/1064020872/foodvisor-calorie-counter/reviews), [Trustpilot](https://www.trustpilot.com/review/foodvisor.io)).

### 10. Cal AI — viral growth, churn machine
- Photo-first, huge TikTok-driven downloads; reasonable on single items (within 10–15 %) but 25–35 % off on mixed meals ([Aumiqx review](https://aumiqx.com/ai-tools/cal-ai-app-review-nutrition-tracker-2026/), [Kalo accuracy roundup](https://www.getkalohealth.com/blog/how-accurate-are-ai-calorie-counters)).
- FLSI mid-pack: 19 actions for a food-search log vs MacroFactor's 10 ([FLSI 2025](https://macrofactor.com/fastest-food-logger-2025/)) — photo capture does not equal fast logging once corrections are counted.
- Dark-pattern complaints: 3-day auto-converting trial, "subscription fees are non-refundable", chargebacks needed; "50 % of the time, it fails to log the food I just finished" ([NutriScan](https://nutriscan.app/blog/posts/cal-ai-pricing-2026-monthly-yearly-premium-abc6e7b26f), [Nutrola cancellation guide](https://nutrola.app/en/blog/how-to-cancel-cal-ai)).

---

## 3. UK database deep-dive

| App | UK branded coverage | Verification model | UK verdict |
|---|---|---|---|
| Nutracheck | Best in class: all major supermarkets + Greggs/Nando's/Costa/Pret/Wetherspoon + HelloFresh/Gousto | Nutritionist-verified, curated only | The benchmark. "Almost always correct" on scan ([RunMoveTone](https://runmovetone.co.uk/blog/myfitnesspal-vs-nutracheck/)) |
| MyFitnessPal | Broad but polluted: duplicates, US-unit entries, stale reformulations | Crowdsourced + partial verification (green ticks unreliable) | Coverage without trust |
| FatSecret | Good: UK-localised feed filters out US products | Crowdsourced, weak correction loop | Underrated free UK option |
| MacroFactor | Staples excellent; UK branded items patchier | Fully verified (research DBs + human-reviewed submissions) | Trustworthy but thinner UK long tail ([MF help doc](https://help.macrofactorapp.com/en/articles/25-how-robust-is-the-database-coverage-in-my-region)) |
| Yazio | Strong on European/UK packaged brands | Mixed | Decent for packaged, weak for chains/generics |
| Cronometer | Generic foods superb (lab data); UK branded middling | Verified only | Accuracy yes, UK convenience no |
| Lose It!/Lifesum/Foodvisor/Cal AI | US/France-weighted | Crowdsourced/AI | Weak UK fits |

**Volyume's position:** bundled OpenFoodFacts UK snapshot + CoFID generics (~3k) is a genuinely good offline-first UK foundation — but OFF is itself crowdsourced, with variable completeness and stale label data on UK SKUs. CoFID is verified but generic. Nobody else combines offline-first with UK focus; nobody else but Nutracheck offers verified UK branded data. The gap between Volyume and Nutracheck is **verification and chain-restaurant coverage** (Greggs, Nando's, Costa, Pret are staples of UK gym-goers' diets and absent from CoFID).

---

## 4. What the sentiment evidence says about retention

**Why users abandon logging:**
1. Time burden — 73 % of quitters cite "too time-consuming" (IFIC 2023 via [Cronometer review](https://calorie-trackers.com/reviews/cronometer/)); >30 s per item → 43 % lower 90-day retention (JMIR 2023, same source).
2. Trust decay — inaccurate-data complaints jump to 24.1 % after six months of use ([Nutrola 50k analysis](https://nutrola.app/en/blog/we-analyzed-50000-calorie-tracker-reviews-what-users-actually-complain-about-2026)). Users do not quit on day one over bad data; they quit at month four.
3. Paywalled capture — barcode paywalls are the single most quotable rage trigger across MFP, Lose It, Yazio and Lifesum reviews.
4. Guilt mechanics — streak-shaming and all-or-nothing feedback trigger avoidance ([bioengineer.org](https://bioengineer.org/emotional-toll-of-fitness-and-calorie-counting-apps-uncovered/), [YOMP](https://yomp.fit/blog/why-calorie-tracking-apps-dont-work-and-what-to-do-instead)).

**Why users stay:** saved meals, copy functions, and per-meal-slot recents that make the second week faster than the first; the repeated pattern across reviews is "once my regulars were saved, logging took under a minute" ([Mealift on MacroFactor](https://www.mealift.app/blog/macrofactor-review)).

---

## 5. Implications for Volyume

**Where Volyume already leads (top-3 territory):**
- Offline-first bundled UK database — no competitor does this (Yazio cannot log offline at all).
- Label OCR scan (two-step, Cronometer-style) — rarer than barcode scanning and the correct graceful fallback when a barcode misses; almost nobody else has it.
- Diary power tools: long-press multi-select move/copy/save-as-meal, copy-yesterday, swipe-delete — matches or beats MFP/Lose It.
- No ads, no capture-tool bait-and-switch within Pro: barcode + OCR included in the tier that includes the diary. Keep it that way; the MFP paywall backlash is the cautionary tale of the category.
- 5-tab browse (Recents/Suggested/Favourites/Frequents/Custom) is structurally equal to the best.

**Where Volyume lags:**
1. **Verified UK branded data (vs Nutracheck) — the biggest gap.** OFF crowdsourced quality will produce exactly the month-four trust decay documented above. Recommendation: a curated, hand-verified layer for the top ~5–10k UK supermarket SKUs and the major chains (Greggs, Nando's, Costa, Pret, McDonald's UK), flagged with a "Verified UK" badge in search results, ranked above raw OFF hits. This is a data-ops project, not an engineering one, and it is Nutracheck's entire moat.
2. **No per-meal-slot memory.** Frequents exist, but MacroFactor's pattern — breakfast foods float to the top when logging breakfast, with last-used portion pre-filled — is deterministic, cheap, and the single highest-leverage speed feature available without AI.
3. **No published/internal tap benchmark.** Adopt an internal FLSI-style action count for the four canonical workflows (search-log, multi-add, barcode, quick-add kcal). Target: match MacroFactor's 10-action search-log.
4. **No quick-add calories/macros** (log "600 kcal, 40 P" without a food) — present in every top-five app; essential for restaurant meals and the perfectionism escape hatch that keeps people logging imperfect days.
5. **Barcode-miss flow.** Best-in-class is: miss → offer OCR label scan → save as custom food with barcode attached, so the same product scans instantly next time. Volyume has all three primitives; confirm they are chained into one flow.

**Where the no-AI rule costs nothing (today):** photo logging. The accuracy evidence (71.2 % ID at best, ±18 % portions, Foodvisor/Lifesum/Cal AI sentiment) shows photo AI currently disappoints more than it retains. MacroFactor's AI Describe (voice/text mapped to verified entries) is the only AI logging pattern with positive sentiment — worth monitoring, but a deterministic per-meal-slot ranking engine plus great defaults captures most of the same speed benefit without touching the AI boundary.

---

## 6. Source list (primary)

- https://macrofactor.com/fastest-food-logger-2025/ (FLSI 2025)
- https://macrofactor.com/new-food-logger/ · https://macrofactor.com/ai-food-logging/ · https://help.macrofactorapp.com/en/articles/25-how-robust-is-the-database-coverage-in-my-region
- https://uk.trustpilot.com/review/www.nutracheck.co.uk · https://home-cooks.co.uk/pages/review-nutracheck · https://nutrasafe.co.uk/blog/best-food-scanner-apps-uk-2026
- https://runmovetone.co.uk/blog/myfitnesspal-vs-nutracheck/ · https://www.thefitnessguy.uk/blog/choosing-the-best-fitness-and-nutrition-app-for-uk-users-nutracheck-vs-myfitnesspal · https://www.foodforfitness.co.uk/best-calorie-counting-app/
- https://www.trustpilot.com/review/www.myfitnesspal.com · https://community.myfitnesspal.com/en/discussion/10862172/ · https://community.myfitnesspal.com/en/discussion/10866427/
- https://www.droid-life.com/2022/08/24/myfitnesspal-puts-barcode-scanner-behind-premium-paywall/ · https://news.slashdot.org/story/22/08/25/1955238/ · https://www.digitaltrends.com/phones/myfitnesspal-barcode-scanning-not-free-premium-subscription/
- https://ai-food-tracker.com/reviews/myfitnesspal/ (Meal Scan benchmark)
- https://cronometer.com/blog/my-fitness-pal-to-cronometer/ · https://calorie-trackers.com/reviews/cronometer/ · https://apurplelife.com/2024/07/23/cronometer-review/
- https://nutrola.app/en/blog/we-analyzed-50000-calorie-tracker-reviews-what-users-actually-complain-about-2026 · https://www.nutrola.app/en/blog/do-calorie-tracking-apps-actually-work
- https://www.amyfoodjournal.com/blog/lose-it-app-review · https://nutriscan.app/blog/posts/lose-it-pricing-2026-free-vs-premium-2b4e921555
- https://calorie-trackers.com/reviews/yazio/ · https://www.hotelgyms.com/blog/yazio-nutrition-app-review · https://nutrola.app/en/blog/is-yazio-pro-worth-it-2026
- https://home-cooks.co.uk/pages/review-fatsecret · https://fuelnutrition.app/reviews/fatsecret-review
- https://calorie-trackers.com/reviews/lifesum/ · https://home-cooks.co.uk/pages/review-lifesum · https://marlvel.ai/intel-report/health-fitness/com-sillens-ishape
- https://justuseapp.com/en/app/1064020872/foodvisor-calorie-counter/reviews · https://www.trustpilot.com/review/foodvisor.io
- https://aumiqx.com/ai-tools/cal-ai-app-review-nutrition-tracker-2026/ · https://nutriscan.app/blog/posts/cal-ai-pricing-2026-monthly-yearly-premium-abc6e7b26f · https://www.getkalohealth.com/blog/how-accurate-are-ai-calorie-counters
- https://www.welling.ai/articles/stop-giving-up-calorie-counting-apps · https://bioengineer.org/emotional-toll-of-fitness-and-calorie-counting-apps-uncovered/ · https://yomp.fit/blog/why-calorie-tracking-apps-dont-work-and-what-to-do-instead

*Caveats: several sources (FLSI) are MacroFactor's own benchmark, methodology published but self-administered; third-party tap-count comparisons (NutriScan) corroborate the direction. The IFIC 73 % and JMIR 43 % figures are reported second-hand via review sites; treat magnitudes as indicative. Direct Reddit thread access was blocked; Reddit sentiment is sourced via secondary reporting of r/loseit reactions.*
