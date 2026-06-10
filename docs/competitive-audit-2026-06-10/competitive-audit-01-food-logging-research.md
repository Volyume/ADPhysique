# Competitive Audit 01 — Food Logging & Diary UX
**Volyume competitive intelligence · 10 June 2026**
**Scope:** the act of logging food and the diary experience only (not coaching). Research drawn from 16+ web searches across store reviews, Trustpilot, Reddit (r/loseit, r/CICO, r/caloriecount), independent benchmark sites and vendor publications, with deliberate weighting towards UK user sentiment.

---

## 1. Top 10, ranked by food-logging experience

| # | App | Why it ranks here |
|---|-----|-------------------|
| 1 | **MacroFactor** | Objectively fastest logger (its own published Food Logging Speed Index, broadly corroborated by reviewers): ~50% fewer taps than MFP; verified database; timeline-based diary that removes "which meal slot?" decisions |
| 2 | **Nutracheck (Calorie Counter+)** | The UK gold standard: ~500k curated UK foods (Tesco, Sainsbury's, Greggs, Costa, Nando's), nutritionist-verified, photos on nearly every product, excellent barcode hit rate on British products; 4.9/5 on Trustpilot (~8,000 reviews) |
| 3 | **Lose It!** | Polished, habit-friendly diary; strong recents/meals; early voice logging; but barcode scanner moved to Premium for new users (2026) and Snap It AI is mediocre (68.7% ID, ±22% portion error, 11.2s latency) |
| 4 | **MyFitnessPal** | Largest database (14–20M entries) and unmatched restaurant coverage, but crowdsourced chaos (72% of users report inaccuracies), duplicate hell, and the infamous 2022 barcode paywall |
| 5 | **Cronometer** | Most trusted data (verified-only, ±3.5% calorie accuracy, 84 nutrients) and a genuinely generous free tier, but slow manual logging (~18s/food, 45s+/meal) and weak restaurant coverage |
| 6 | **Yazio** | Best recipe library/meal-planning integration (2,000+ auto-logging recipes) and strong European coverage, but user-submitted database with severe accuracy complaints and a 5-scans/day barcode cap on free |
| 7 | **FatSecret** | The best fully-free logger: unlimited free barcode scanning, fast scanner; but highest measured database deviation (±8.4%) and weak restaurant/home-cooked coverage |
| 8 | **Foodvisor** | Best-regarded AI photo logging (~87% in independent testing) with a sane fallback hierarchy (barcode still most accurate); database historically France/US-centric, weak UK depth |
| 9 | **Lifesum** | Attractive design and meal-quality ratings, but its 2025 "multimodal AI pivot" stripped beloved manual workflows — r/CICO: "Lifesum used to be amazing but DO NOT bother any more" |
| 10 | **Cal AI / SnapCalorie** (AI-photo-first tier) | Fast capture, viral appeal; SnapCalorie ~15% average caloric error is genuinely good for photos, but Cal AI produces headline failures (8,000-kcal popcorn), undercounts hidden fats, and users report "wrong in every category" |

---

## 2. Per-app deep dives

### 2.1 MacroFactor
- **Logging speed (the benchmark everyone else is measured against).** MacroFactor publishes a Food Logging Speed Index (FLSI) counting discrete actions across four workflows: search, multi-add, barcode, quick-add calories. Results: **24 total actions vs 36 for MyFitnessPal across the four workflows** (~50% fewer); search-logging is 10 actions vs MFP's 15; the strongest competitor needs ~25% more actions than MacroFactor's "speed mode", the average app ~70% more. ([FLSI methodology](https://macrofactor.com/fastest-food-logger/), [2025 update](https://macrofactor.com/fastest-food-logger-2025/), [Sept 2025 results](https://macrofactor.com/mm-sept-2025/))
- **Timeline 2.0 diary.** Logs by *time* rather than forcing breakfast/lunch/dinner/snack categorisation — explicitly framed as removing "should I log this protein bar as breakfast or a snack?" micro-decisions, "multiple times a day, 365 days a year". Minute-level timestamps captured automatically. ([Timeline-based food log](https://macrofactor.com/timeline-based-food-logger/))
- **Database.** ~1.36M verified search entries + ~4M barcode foods. Verified for accuracy — the headline contrast with MFP. UK coverage is described as handling "the majority of common groceries, restaurant chains, and fresh staples", i.e. good but not Nutracheck-deep. ([MacroFactor vs MFP](https://macrofactor.com/macrofactor-vs-myfitnesspal/), [NutriScan comparison](https://nutriscan.app/blog/posts/macrofactor-vs-myfitnesspal-2026-93f2aa703e))
- **AI stance (instructive for Volyume).** Their 2025 AI photo logging deliberately does *not* let an LLM invent nutrition data: the AI maps the photo to **real, lab-analysed database entries**, decomposed into editable ingredients — "MacroFactor AI does not rely on LLMs to generate all food entries". Coaching algorithms remain "purely deterministic". ([AI food logging](https://macrofactor.com/ai-food-logging/), [Algorithms & philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/))
- **Sentiment.** Love: speed, trust in data, no ads, logging feels "designed by people who track daily". Hate/wish: subscription-only (no free tier), UK branded gaps vs Nutracheck, no web app for ages. Reviewers (Outlift, hotelgyms) consistently call it the best tracker for serious users.

### 2.2 Nutracheck / Calorie Counter+ (UK)
- **Database.** 500k+ UK foods, **curated not crowdsourced**, verified by nutritionists, covering Tesco, Asda, Sainsbury's, Aldi, Lidl, M&S, Waitrose, HelloFresh, Gousto, plus eating-out: Greggs, Wetherspoon, Nando's, Costa, Pret. "You'll find Tesco meal deals and Greggs pasties rather than American products in cups." ([NutraSafe UK comparison](https://nutrasafe.co.uk/best-calorie-counter-apps-uk-2026), [HomeCooks review](https://home-cooks.co.uk/pages/review-nutracheck))
- **Photos as a logging accelerant.** Product photos on almost every entry make visual confirmation instant — repeatedly praised on Trustpilot ("photographs of food choices are very helpful"). This is an underrated speed feature: users confirm the right entry by sight instead of reading macro panels.
- **Barcode.** "Barcode scanning seems to recognise everything" (UK products) per Trustpilot reviewers; consistently described as the best UK barcode hit rate. ([Trustpilot](https://uk.trustpilot.com/review/www.nutracheck.co.uk))
- **Sentiment.** Love: "the UK database is brilliant — I can actually find the foods I eat without guessing"; customer service; results. Hate/wish: **no real free tier** (7-day trial then £29.99/yr; free version capped at ~5 logs/day), app "could be more modern", "slow to start, cluttered", fiddly custom targets, occasional Google Play payment friction. ([Google Play reviews](https://play.google.com/store/apps/details?id=com.nutratech.app.android&hl=en_GB), [Mumsnet thread](https://www.mumsnet.com/talk/am_i_being_unreasonable/4918623-anyone-used-nutracheck))
- **Strategic note:** Nutracheck is the proof that a *smaller, curated, UK-first* database beats a 20M-entry global one for British users — exactly Volyume's thesis.

### 2.3 Lose It!
- **Logging.** Solid recents/My Foods/meals workflows; early adopter of natural-language voice logging. **Barcode scanning ("Scan It") moved into Premium for most new users in 2026**, repeating MFP's most-hated move. ([SnapCalorie blog on free vs premium](https://www.snapcalorie.com/blog/lose-it-free-vs-premium-differences-what-you-need-to-know.html), [Nutrola free-tier review](https://www.nutrola.app/en/blog/is-lose-it-worth-it-without-premium))
- **Snap It AI.** Benchmarked at **68.7% food identification, ±22% portion error, 11.2s median latency** — long enough that "users frequently abandon the app and enter food manually". ([ai-food-tracker benchmark](https://ai-food-tracker.com/reviews/lose-it/))
- **Database.** User-submitted entries; Trustpilot: "the database is not managed — full of duplicates and miscalculated items". US-centric; UK branded coverage patchy. ([Trustpilot](https://uk.trustpilot.com/review/loseit.com), [FeastGood review](https://feastgood.com/lose-it-app-review/))
- **Sentiment.** Love: friendly UX, budget metaphor, habit stickiness (r/loseit recommends it alongside MFP for "low-friction logging"). Hate: ads on free, barcode paywall creep, duplicate database entries.

### 2.4 MyFitnessPal
- **The barcode paywall case study.** October 2022: the decade-old free barcode scanner moved behind Premium ($19.99/mo / $79.99/yr). Massive backlash — community threads, press ("Hey MyFitnessPal: We're Not Paying for a Damn Barcode Scanner"), and the pointed unfairness that **users built the barcode database themselves** by contributing scans, then were charged to use it. This single decision created the opening MacroFactor, FatSecret and others exploited; FatSecret's free scanner became a top recommendation specifically in reaction. ([Punished Backlog](https://punishedbacklog.com/hey-myfitnesspal-were-not-paying-for-a-damn-barcode-scanner/), [XDA](https://www.xda-developers.com/myfitnesspals-barcode-scanner-behind-a-paywall/), [Droid-Life](https://www.droid-life.com/2022/08/24/myfitnesspal-puts-barcode-scanner-behind-premium-paywall/), [MFP community](https://community.myfitnesspal.com/en/discussion/10903889/scan-barcode-only-for-premium), [HN thread](https://news.ycombinator.com/item?id=32594680))
- **Database.** Largest (14–20M) — best chain-restaurant coverage including UK chains — but crowdsourced: **72% of users report database inaccuracies**; green-tick entries merely mean upvotes, not verification; "finding the entry with correct nutrition information might require considerable hunting through erroneous or duplicate entries". Duplicates worsen when copying meals between days. ([MFP community: wrong values](https://community.myfitnesspal.com/en/discussion/10911982/why-do-so-many-foods-having-wrong-nutritional-value-posted), [duplicates thread](https://community.myfitnesspal.com/en/discussion/10907399/food-duplicates-duplicates-duplicates), [Kimola feedback analysis](https://kimola.com/blog/understanding-calorie-tracking-and-nutrition-apps-through-customer-feedback-analysis))
- **AI logging.** Meal Scan (photo) and Voice Log are Premium-only; Meal Scan benchmarked at **71.2% ID rate, ±18% portion error**, "performs significantly worse on non-American cuisines" — bad news for UK plates. Core workflow remains manual search, "2–5 minutes per meal". ([ai-food-tracker benchmark](https://ai-food-tracker.com/reviews/myfitnesspal/))
- **Sentiment.** Love: everything is findable somewhere; integrations; recipes community. Hate: paywall creep, ads, wrong entries, US-centric defaults (cups, US brands first) for UK users.

### 2.5 Cronometer
- **Data quality ceiling.** Verified-only database (USDA SR, NCCDB, manufacturer data; ~1.1M entries, no user submissions in Common Foods), ±3.5% calorie accuracy, 84 nutrients tracked, cited in peer-reviewed research. ([Cronometer blog: small is better](https://cronometer.com/blog/small-is-better/), [calorie-trackers.com review](https://calorie-trackers.com/reviews/cronometer/))
- **Logging speed floor.** Manual search ~18s per food, 45s+ per meal; no photo/voice/text AI; restaurant meals must be deconstructed into ingredients. Identified by reviewers as the app for people who will tolerate friction in exchange for trust — and unsuitable for "anyone who finds manual search tedious enough to cause logging dropout". ([nutritiontrackerreviews](https://www.nutritiontrackerreviews.com/reviews/cronometer), [ai-health-apps](https://ai-health-apps.com/reviews/cronometer-review/))
- **Free tier.** Unusually generous: unlimited logging, full nutrient panel, no ads.
- **UK.** Generic foods fine (USDA/NCCDB ≈ CoFID-equivalent quality), UK branded/restaurant items weak.

### 2.6 Yazio
- **Strengths.** Best recipe/meal-planning loop: 2,000+ Pro recipes that auto-log with serving-size adjustment, organised by meal type/calorie range/diet; plan-to-diary flow is the category benchmark. Strong DACH/European branded coverage. 4.7 Trustpilot. ([NutriScan Pro review](https://nutriscan.app/blog/posts/yazio-pro-worth-it-2026-4f450da831), [calorie-trackers review](https://calorie-trackers.com/reviews/yazio/))
- **Weaknesses.** User-submitted database, unreviewed before appearing in search: documented absurdities (420-kcal plain chicken breast, 22g-protein apple, bread fattier than butter); one analysis found **97% of Yazio users who commented on database accuracy were dissatisfied**. Free tier caps barcode at ~5 scans/day. No UK-specific database region. ([Nutrola: wrong entries](https://nutrola.app/en/blog/yazio-database-full-of-wrong-entries), [Yazio help: database country](https://help.yazio.com/hc/en-us/articles/11804332619665-How-does-the-food-product-search-work-within-YAZIO))

### 2.7 FatSecret
- **The free champion.** Fully free, unlimited barcode scanning — "consistently one of the faster scanning tools" — which made it the default post-MFP-paywall recommendation. ([HN](https://news.ycombinator.com/item?id=32594680), [calorie-trackers review](https://calorie-trackers.com/reviews/fatsecret/))
- **Weaknesses.** ±8.4% average deviation from lab measurements (highest tested); community-contributed without robust QC despite marketing claims of "100% human verified"; weakest on restaurant/home-cooked/ethnic foods. UK branded coverage moderate.

### 2.8 Foodvisor
- AI-photo-first; **87% accuracy in independent testing**, best-in-tier, but accuracy drops on mixed dishes/sauces/hidden items; even Foodvisor reviewers concede "barcode scanning remains the most accurate way to log food in Foodvisor". 4.8 Trustpilot. Database France-then-US-centric (US database only added late 2025) — UK depth poor. ([NutriScan review](https://nutriscan.app/blog/posts/foodvisor-worth-it-2026-review-73e3363135), [UX critique](http://www.satukyrolainen.com/foodvisor-the-good-the-bad-and-the-ux/))

### 2.9 Lifesum
- Cautionary tale: the 2025 AI pivot replaced working manual flows with multimodal AI that misfires (cashews logged as shrimp; phantom coffee detected from an empty mug in frame; barcode scans returning 2–3× correct calories; correction workflows removed). r/CICO: "They've stripped back all the good features to replace with an AI that doesn't work." Plus persistent auto-renewal/billing complaints. ~2M-entry database, ~6.5% deviation, weak on regional (incl. UK) items. ([fuelnutrition review](https://fuelnutrition.app/reviews/lifesum-review), [NutriScan comparison](https://nutriscan.app/blog/posts/cronometer-vs-lifesum-2026-nutrition-detail-vs-easier-habits-d1181661cd))

### 2.10 Cal AI & SnapCalorie (AI-photo-first)
- **Cal AI.** Viral growth; "usually accurate to within 10%" on simple plates but documented catastrophic outputs (8,000-kcal popcorn bowl; a 27-million-kcal candy bar), systematic undercounting of hidden fats/oils/sauces, poor portion estimation ("the AI is guessing" between a thick and thin steak), and — critically — users report **lack of correction affordances**: "I had to manually change the numbers, which defeats the app's purpose" vs the charitable "gets me 90% of the way there, and then I can adjust" (r/loseit, r/caloriecount). 85–92% on simple foods; off by 30–50% on complex meals. ([eesel review](https://www.eesel.ai/blog/cal-ai), [nutrifytracker](https://nutrifytracker.com/blog/is-cal-ai-worth-it), [trygaya](https://www.trygaya.com/review/cal-ai-review), [justuseapp reviews](https://justuseapp.com/en/app/6480417616/cal-ai-calorie-tracking/reviews))
- **SnapCalorie.** Most honest of the photo apps: ~15% average caloric error — better than dietitians estimating from photos (40%) and average app users (53%), but still 15%; misidentifies ingredients; free tier capped at 3 meals/day, €89.99/yr Premium. ([WellnessPulse review](https://wellnesspulse.com/nutrition/snapcalorie-ai-image-tracker-review/), [SnapCalorie FAQ](https://www.snapcalorie.com/faq.html))

---

## 3. Cross-cutting findings

### 3.1 Best-in-class, by dimension
| Dimension | Winner | The benchmark to beat |
|---|---|---|
| Logging speed | MacroFactor | 24 actions across 4 core workflows; search-log in 10 actions; recents/favourites loggable in 2–3 taps |
| UK database | Nutracheck | Curated 500k UK foods w/ photos; near-100% UK barcode hit rate; Greggs/Tesco/Costa first-class |
| Data trust | Cronometer | Verified-only, ±3.5%, zero crowd noise |
| Free barcode | FatSecret | Unlimited, free, fast |
| Diary model | MacroFactor Timeline 2.0 | Time-based diary kills meal-slot decision fatigue |
| Recipes/meal planning | Yazio | 2,000+ recipes that auto-log with serving scaling |
| AI photo (if you must) | Foodvisor/SnapCalorie | 87% ID / ~15% caloric error — and both still defer to barcode for accuracy |

**Single best implementation overall: MacroFactor's logging pipeline** — speed-optimised flows + verified data + timeline diary + AI that resolves to real database entries rather than LLM-invented macros. It is the only app that wins on both friction *and* trust.

### 3.2 The most common failure mode
**Crowdsourced database chaos compounded by paywalling the escape hatches.** The pattern repeats across MFP, Yazio, Lose It and FatSecret: a huge unverified database produces wrong/duplicate entries → users lose trust per-log → the fast workaround (barcode) gets paywalled → friction + distrust → abandonment. Research backs the abandonment half: **~80% of users quit food logging within weeks**, and 73% of quitters cite "too time-consuming" (IFIC 2023); manual-entry apps consume 15–23 min/day. Secondary failure mode (2025–26 vintage): **AI-washing** — replacing reliable manual flows with inaccurate AI (Lifesum being the clearest casualty). ([kygo on quitting](https://www.kygo.app/post/why-80-of-people-quit-food-logging-apps-and-how-to-actually-stick-with-it), [Nutrola evidence review](https://www.nutrola.app/en/blog/do-calorie-tracking-apps-actually-work))

### 3.3 What makes users log consistently
- **Sub-10-second logging for repeat foods** (recents/favourites/copy-yesterday) — Reddit consensus: "low-friction logging makes consistency easier". ([Fitia Reddit roundup](https://fitia.app/learn/article/food-diary-apps-2026-reddit-picks/))
- **Findability of *their* foods first try** — Nutracheck's "I can actually find the foods I eat without guessing" is the single most repeated UK compliment in the corpus.
- **Visual confirmation** (Nutracheck photos) reduces selection anxiety.
- **No judgement/shame mechanics** — guilt-laden reminders are a documented quit driver.
- **Trust that the number is right** — every wrong entry encountered taxes future motivation.

---

## 4. Volyume vs the Top 10 — lead / match / lag

Volyume baseline: bundled OFF UK snapshot (~25k) + CoFID (~3k) + live OFF + USDA waterfall with cache promotion, offline-first; free-tier barcode scanning; label OCR→custom food; recipes/saved meals; favourites/frequents/copy-yesterday; smart suggestions (Pro); macro rings, date pager, swipe-delete; 7-day insights + CSV; no AI photo/voice; curated sources.

| App | Volyume leads | Volyume matches | Volyume lags |
|---|---|---|---|
| **MacroFactor** | Offline-first (MF needs connectivity for search); label OCR on free path; UK-first bundled data | Curated/verified data philosophy; deterministic, no-LLM stance; barcode quality-of-life (torch, freeze) | **Tap-count discipline** (no published/audited taps-per-log target); timeline-style diary; multi-add plate workflow; breadth (1.36M verified vs ~28k bundled + live fallback) |
| **Nutracheck** | Offline capability; free barcode; OCR; CSV export; price (free tier exists) | UK-first ethos; curated sources | **UK branded depth** (500k curated w/ photos vs ~25k OFF UK snapshot — OFF UK has known coverage gaps); food photos; eating-out/chain coverage (Greggs/Nando's/Spoons menus largely absent from OFF) |
| **Lose It!** | Free barcode (they just paywalled theirs); data curation; offline | Favourites/recents/copy-yesterday; water | Voice/natural-language input (deliberate non-goal); social/community hooks |
| **MyFitnessPal** | Data trust (no crowd chaos); free barcode (their #1 reputational wound); offline; no ads | Recipes, saved meals, frequents | Raw breadth, especially **UK chain-restaurant menus**; integrations ecosystem |
| **Cronometer** | Logging speed potential; barcode UX; OCR; UK branded coverage | Verified-data ethos; free-tier generosity; CSV export | Micronutrient depth (84 nutrients vs macro-focus); research citations/credibility halo |
| **Yazio** | Database accuracy; unlimited free barcode (vs 5/day); offline | Recipes + saved meals exist | **Recipe library scale and plan→diary auto-logging flow**; visual polish of meal planning |
| **FatSecret** | Data accuracy; OCR; UK-first; suggestions | Free barcode (both free) | Brand awareness as "the free one"; community features |
| **Foodvisor** | Barcode/OCR accuracy beats their photo AI in their own framing; UK data | — | Photo capture convenience for non-packaged/restaurant plates (Volyume has no answer beyond search/OCR) |
| **Lifesum** | Everything logging-related, currently (their manual flows regressed) | Recipes, water, design ambition | Brand/design marketing reach |
| **Cal AI / SnapCalorie** | Accuracy, trust, offline, packaged-food logging | — | Zero-effort capture moment for home-cooked/restaurant meals; TikTok-era acquisition appeal |

**Net position:** Volyume's architecture (curated UK-first waterfall, offline, free barcode, OCR) is strategically aligned with everything users *say they want* and competitors keep breaking. Its two real exposures: (1) **UK branded/chain depth** — ~25k OFF UK products is an order of magnitude below Nutracheck's 500k curated entries, and OFF UK has documented gaps ("not many products were recognised" — OFF's own UK app reviews); (2) **no answer for unpackaged plates** (restaurant/home-cooked), where photo apps — however flawed — own the capture moment.

---

## 5. Improvement opportunities for Volyume (ranked by impact)

1. **Close the UK branded-food gap beyond OFF.** Expand the bundled snapshot and prioritise a curated layer for the top UK supermarket own-brands and the top ~30 eating-out chains (Greggs, Costa, Nando's, Wetherspoon, Pret, McDonald's UK — all publish nutrition data). *Rationale:* "I can actually find the foods I eat" is the #1 driver of Nutracheck's 4.9 Trustpilot; OFF UK's gaps are its documented weakness; first-search-success is the strongest retention lever in the corpus.
2. **Adopt a tap-budget discipline and publish it.** Audit taps-to-log for: frequent food (target ≤3 from diary), barcode (≤2 + scan), search (≤6), copy-yesterday (≤2). MacroFactor turned tap-counting into marketing (FLSI); matching its 24-actions-across-4-workflows bar is measurable engineering, not research. *Rationale:* 73% of quitters cite time; speed is the most defensible non-database differentiator.
3. **Make "frequent foods + copy-yesterday" a single zero-thought surface.** A "Quick Log" sheet on diary open: yesterday's meals, time-of-day-aware frequents, saved meals — one tap each. *Rationale:* repeat foods dominate real diets; this is the consistency mechanism Reddit credits for habit survival.
4. **Add product photos where available.** OFF includes product images; surface them in search results and barcode confirmations. *Rationale:* Nutracheck users repeatedly cite photos as a trust/speed feature; visual confirmation cuts wrong-entry anxiety and selection time.
5. **Market the free barcode scanner loudly.** MFP's paywall (2022) and Lose It's (2026) are open wounds; FatSecret built its entire growth story on "free scanner". Put "Barcode scanning. Free. Forever." in store listing and onboarding. *Rationale:* zero engineering cost, taps directly into the category's most viral grievance.
6. **Lean into OCR as the honest alternative to AI photo logging.** Position label OCR as "scan the label, not the plate — real numbers, not guesses", and extend OCR to per-100g + per-serving capture and front-of-pack traffic-light parsing. *Rationale:* every AI photo app's own reviewers concede barcode/label data beats photo estimates; Lifesum shows AI-washing destroys trust; this differentiates without violating the no-AI boundary.
7. **Consider a time-aware diary refinement.** Keep meal sections but auto-suggest the slot from time of day (and learn user patterns deterministically). *Rationale:* MacroFactor's timeline insight — meal-slot micro-decisions are cumulative friction — can be captured without a full diary redesign.
8. **Grow the recipe→diary loop towards Yazio's bar.** Recipes that scale by serving and log in one tap, plus a small curated UK recipe pack feeding smart suggestions. *Rationale:* Yazio's strongest retention feature; Volyume already has recipes + suggestions, so this is composition, not new infrastructure.
9. **Instrument "first-search success rate" and "seconds-to-log" as KPIs.** Aggregate, non-PII counters (consistent with the no-PII rule) for: search→no-result rate, search→custom-food fallback rate, taps per log. *Rationale:* these are the leading indicators of the 80%-quit cliff; they also tell you exactly which UK foods to add next.
10. **Never paywall the scanner or core logging — codify it.** Free logging speed is the moat; Pro should stay analysis/coaching/nutrition-intelligence (as currently gated). *Rationale:* the single most repeated abandonment trigger in this entire corpus is paywalling a previously fast logging path.

---

## 6. Source index
- MFP barcode paywall: [Punished Backlog](https://punishedbacklog.com/hey-myfitnesspal-were-not-paying-for-a-damn-barcode-scanner/) · [XDA](https://www.xda-developers.com/myfitnesspals-barcode-scanner-behind-a-paywall/) · [Droid-Life](https://www.droid-life.com/2022/08/24/myfitnesspal-puts-barcode-scanner-behind-premium-paywall/) · [MFP community thread 1](https://community.myfitnesspal.com/en/discussion/10903889/scan-barcode-only-for-premium) · [thread 2](https://community.myfitnesspal.com/en/discussion/10939125/why-is-the-barcode-scan-behind-premium) · [Hacker News](https://news.ycombinator.com/item?id=32594680)
- MFP database quality: [wrong values thread](https://community.myfitnesspal.com/en/discussion/10911982/why-do-so-many-foods-having-wrong-nutritional-value-posted) · [duplicates thread](https://community.myfitnesspal.com/en/discussion/10907399/food-duplicates-duplicates-duplicates) · [Kimola feedback analysis](https://kimola.com/blog/understanding-calorie-tracking-and-nutrition-apps-through-customer-feedback-analysis) · [Meal Scan benchmark](https://ai-food-tracker.com/reviews/myfitnesspal/)
- MacroFactor: [FLSI](https://macrofactor.com/fastest-food-logger/) · [FLSI 2025](https://macrofactor.com/fastest-food-logger-2025/) · [Timeline log](https://macrofactor.com/timeline-based-food-logger/) · [AI food logging](https://macrofactor.com/ai-food-logging/) · [vs MFP](https://macrofactor.com/macrofactor-vs-myfitnesspal/) · [NutriScan 2026 comparison](https://nutriscan.app/blog/posts/macrofactor-vs-myfitnesspal-2026-93f2aa703e) · [Outlift review](https://outlift.com/macrofactor-review/)
- Nutracheck: [Trustpilot](https://uk.trustpilot.com/review/www.nutracheck.co.uk) · [HomeCooks review](https://home-cooks.co.uk/pages/review-nutracheck) · [NutraSafe UK app comparison](https://nutrasafe.co.uk/best-calorie-counter-apps-uk-2026) · [Google Play](https://play.google.com/store/apps/details?id=com.nutratech.app.android&hl=en_GB) · [Food For Fitness MFP-vs-Nutracheck](https://www.foodforfitness.co.uk/best-calorie-counting-app/) · [Mumsnet](https://www.mumsnet.com/talk/am_i_being_unreasonable/4918623-anyone-used-nutracheck)
- Lose It: [Snap It benchmark](https://ai-food-tracker.com/reviews/lose-it/) · [free vs premium](https://www.snapcalorie.com/blog/lose-it-free-vs-premium-differences-what-you-need-to-know.html) · [Nutrola free tier](https://www.nutrola.app/en/blog/is-lose-it-worth-it-without-premium) · [Trustpilot](https://uk.trustpilot.com/review/loseit.com)
- Cronometer: [calorie-trackers](https://calorie-trackers.com/reviews/cronometer/) · [nutritiontrackerreviews](https://www.nutritiontrackerreviews.com/reviews/cronometer) · [Cronometer blog](https://cronometer.com/blog/small-is-better/) · [Fortune](https://fortune.com/article/cronometer-review/)
- Yazio: [Nutrola wrong-entries analysis](https://nutrola.app/en/blog/yazio-database-full-of-wrong-entries) · [calorie-trackers](https://calorie-trackers.com/reviews/yazio/) · [NutriScan Pro review](https://nutriscan.app/blog/posts/yazio-pro-worth-it-2026-4f450da831) · [Yazio help: database country](https://help.yazio.com/hc/en-us/articles/11804332619665-How-does-the-food-product-search-work-within-YAZIO) · [Trustpilot](https://uk.trustpilot.com/review/yazio.com)
- FatSecret: [calorie-trackers](https://calorie-trackers.com/reviews/fatsecret/) · [fuelnutrition](https://fuelnutrition.app/reviews/fatsecret-review)
- Foodvisor: [NutriScan review](https://nutriscan.app/blog/posts/foodvisor-worth-it-2026-review-73e3363135) · [Trustpilot](https://ca.trustpilot.com/review/foodvisor.io) · [UX critique](http://www.satukyrolainen.com/foodvisor-the-good-the-bad-and-the-ux/)
- Lifesum: [fuelnutrition review](https://fuelnutrition.app/reviews/lifesum-review) (incl. r/CICO quote)
- Cal AI / SnapCalorie: [eesel](https://www.eesel.ai/blog/cal-ai) · [nutrifytracker](https://nutrifytracker.com/blog/is-cal-ai-worth-it) · [trygaya](https://www.trygaya.com/review/cal-ai-review) · [justuseapp](https://justuseapp.com/en/app/6480417616/cal-ai-calorie-tracking/reviews) · [WellnessPulse](https://wellnesspulse.com/nutrition/snapcalorie-ai-image-tracker-review/) · [SnapCalorie FAQ](https://www.snapcalorie.com/faq.html)
- Abandonment research: [kygo (80% quit)](https://www.kygo.app/post/why-80-of-people-quit-food-logging-apps-and-how-to-actually-stick-with-it) · [Nutrola evidence](https://www.nutrola.app/en/blog/do-calorie-tracking-apps-actually-work) · [Fitia Reddit roundup](https://fitia.app/learn/article/food-diary-apps-2026-reddit-picks/) · [Levels guide](https://www.levels.com/blog/food-tracking-apps)
- Open Food Facts UK coverage: [OFF UK](https://uk.openfoodfacts.org/) · [OFF UK App Store reviews](https://apps.apple.com/gb/app/open-food-facts-product-scan/id588797948)

*Caveats: MacroFactor's FLSI is vendor-published (methodology is transparent but self-scored); some benchmark sites (ai-food-tracker, nutriscan, nutrola, calorie-trackers) are affiliated with competing apps — figures were cross-checked across multiple independent sources where possible. Reddit/Trustpilot quotes are as reported by the cited aggregating sources.*
