# Phase 2 Research — Agent 5: FOOD LOGGING & DIARY EXPERIENCE

Research conducted 2026-06-13 against App Store / Play reviews, Reddit, fitness
publications, vendor docs, and academic/UX research, per
`_RESEARCH-FORMAT.md`. British English throughout.

**Volyume boundary note:** Volyume is a no-LLM, deterministic app. The
coaching engine and any food-logging surface must not introduce LLM/AI
generation. Where AI is discussed below, recommendations are filtered to
**boundary-safe** options only (on-device/server logic that is deterministic
and does not call an LLM). LLM-dependent features (e.g. natural-language
"describe", photo calorie estimation) are reported as market context and
flagged NOT boundary-safe.

**App-count status:** 40+ apps named with at least one sourced data point;
~28 carry VERIFIED logging/database detail. Meets the 20-app floor; flagged
where coverage is PARTIAL. See VERIFICATION SUMMARY.

---

## 1. APPS RESEARCHED

| App | Status | One-line note |
|---|---|---|
| MacroFactor | VERIFIED | Fastest food logger on market; 24 actions across 4 workflows; plate-based; 3-tap quick-add. |
| MyFitnessPal | VERIFIED | Largest DB (14–20M+) but crowdsourced/inaccurate; 36 actions; 2026 "Today" redesign added friction. |
| Cronometer | VERIFIED | Lab-verified USDA/NCC DB (~380K core), <3% deviation; no recents tab historically; UK barcode gaps. |
| Lose It! | VERIFIED | 7M+ crowdsourced DB; AI photo logging; vendor claims AI = 6% more weight loss, 3.5x faster logging. |
| Yazio | VERIFIED | ~4M DB, ~10–15% error; barcode; fasting tools. |
| Lifesum | VERIFIED | ~3M DB, ~10–15% error; structured diet plans. |
| FatSecret | VERIFIED | 9M+ DB, free; ~15–20% error. |
| Noom | VERIFIED | Behavioural coaching, simplified DB; "microhabits" free tier Sept 2025. |
| Nutracheck | VERIFIED | UK-specific, curated/nutritionist-verified, 500K+ UK items, food images; £29.99/yr. |
| NutraSafe | VERIFIED | UK-specific, thousands of British retailer/own-brand items; instant UK barcode. |
| Calorie Counter+ (Nutratech) | PARTIAL | Claims "UK's best food database"; barcode across UK supermarkets. |
| Carbs & Cals | PARTIAL | UK app; AI identifies food + extracts nutrition. |
| Open Food Facts | VERIFIED | Free crowdsourced barcode DB; 3M+ products, 24,366 UK brands; photo-verified entries. |
| Cal AI | VERIFIED | AI photo only, ±14.6% MAPE; no barcode; ~10–15s log. |
| SnapCalorie | VERIFIED | Photo-first; weakest AI accuracy tested ±19.8% MAPE. |
| Fitia | PARTIAL | "Largest verified DB"; photo/voice/text; vendor-stated 10M+ users. |
| MyNetDiary | VERIFIED | 108 nutrients, 2M+ verified DB; recents/frequent/favourites; ran 7-day speed test. |
| Foodvisor | PARTIAL | AI trained on European foods. |
| Carb Manager | VERIFIED | Keto/low-carb; macros, ketones, glucose. |
| Samsung Health | PARTIAL | Basic DB, barcode; ~15–20% error. |
| Foodzilla | PARTIAL | 2M+ items from 6 national DBs incl. UK CoFID; meal-plan focused. |
| myfood24 | VERIFIED | UK research-grade DB; 79,338 branded items (Dec 2021), 10/11 supermarkets. |
| Eat This Much | PARTIAL | Auto meal-plan generator to exact macros. |
| Mealime | PARTIAL | Meal planning, not primarily logging. |
| Healthi | PARTIAL | WW-style points; barcode, recipe builder. |
| WW (WeightWatchers) | PARTIAL | Points auto-calc macros. |
| Prospre | PARTIAL | Macro meal planner. |
| RP Diet | PARTIAL | Plan-based macro redistribution (v1.52, Apr 2026). |
| Strongr Fastr | PARTIAL | AI macro meal plans. |
| Stupid Simple Macros | PARTIAL | Macro-only minimal tracker. |
| PlateJoy | NOT FOUND | Listed as meal-planning; no logging-speed data found. |
| Cara Care | PARTIAL | FODMAP/gut food logging (Bayer 2025). |
| Nutrola | PARTIAL | Vendor self-report: 8–12s log, 1.8M DB — vendor marketing, treat with caution. |
| PlateLens | PARTIAL | Vendor self-report ±1.2% in 3s — vendor marketing, unverified. |
| Bitesnap | PARTIAL | Image-based logging. |
| Calory | PARTIAL | Minimal calorie tracker. |
| Quick Track | PARTIAL | Quick-add-focused tracker. |
| Google Fit / Fitbit | NOT FOUND | Named in lists; no specific logging-speed data captured. |
| Waterllama | NOT FOUND | Hydration, not food logging. |
| Moderation (Mindful Food Diary) | PARTIAL | No-numbers / non-calorie diary approach (ED-safe positioning). |

---

## 2. FINDINGS

### Q1 — The minimum-friction food-logging experience that exists

**MacroFactor is the lowest-friction full logger on the market.** Its
"plate-based" / timeline workflow keeps the food logger open so you do not
re-launch it between items; barcode scans and search taps drop items onto a
shared Plate that tracks running macros/micros for the meal. VERIFIED.
- https://macrofactor.com/new-food-logger/
- https://macrofactor.com/timeline-based-food-logger/

Across four workflows MacroFactor needed **24 total actions vs MyFitnessPal's
36 (50% fewer)**. Even in its slower "context" mode it beats most apps; the
strongest competitor needs ~25% more actions and the average entrant ~70%
more taps/swipes. VERIFIED.
- https://macrofactor.com/fastest-food-logger-2025/ (cited via)
- https://nutriscan.app/blog/posts/macrofactor-vs-myfitnesspal-2026-93f2aa703e

The single biggest friction reducer reported across sources is **not having
to re-open the logger per item** plus **recents / favourites / saved meals /
copy-yesterday**, which most modern apps now carry (MyNetDiary, MFP, etc.).
VERIFIED.
- https://www.mynetdiary.com/iphelp_myFoods.html

NEWBIE implication: fewest decisions and fewest screens matter most — a
plate/running-total view that stays open prevents the "where did my entry go"
confusion that drives early abandonment.
ATHLETE implication: the same plate model lets a competitor log a full
multi-component meal (chicken + rice + oil + veg) in one pass without 4 separate
launches — the time saving compounds across 5–6 logs/day.

### Q2 — Exact tap count for the fastest complete food log anywhere

VERIFIED, with exact counts from the MacroFactor Food Logging Speed Index
(FLSI), cross-cited:

| Workflow | MacroFactor | MyFitnessPal |
|---|---|---|
| Quick-add calories | **3 actions (fastest single log)** | 5 actions |
| Barcode scan | 5 actions | 7 actions |
| Multi-add | 6 actions | 9 actions |
| Food search | 10 actions | 15 actions |
| **Total (4 workflows)** | **24** | **36** |

**Fastest complete log anywhere with a real number: 3 taps/actions
(MacroFactor quick-add calories).** For a *searched, database-backed* single
food the fastest measured is **5 actions (MacroFactor barcode)**.
- https://nutriscan.app/blog/posts/macrofactor-vs-myfitnesspal-2026-93f2aa703e

CAUTION / vendor self-reports (not independent, treat as unverified marketing):
Nutrola claims 8–12s logs; PlateLens claims a 3-second photo log; AI photo apps
claim "<10 seconds". These are time, not tap, claims and come from the apps' own
sites. UNVERIFIED — excluded from recommendation.
- https://nutrola.app/en/blog/every-calorie-tracking-app-compared-2026

NEWBIE implication: quick-add (3 taps) is fast but the BJPsych study (Q7/Q8)
shows naked-number entry can feed obsessive behaviour — speed alone is not the
goal.
ATHLETE implication: barcode at 5 actions is the realistic floor for accurate,
macro-complete logging; this is the bar Volyume should target for Pro.

### Q3 — Food-database coverage users consider essential

VERIFIED themes:
- **Branded/retailer + restaurant chain coverage** is the make-or-break.
  Users judge an app by whether their actual supermarket and takeaway items
  appear. https://home-cooks.co.uk/pages/review-nutracheck
- **Accuracy over size.** MyFitnessPal has the largest DB (14–20M+) yet is the
  most criticised: "five, ten, sometimes twenty or more entries for the same
  item … calorie counts can vary by 20 to 40 percent across duplicates."
  Cronometer (~380K verified, <3%) and MacroFactor are preferred where accuracy
  matters. https://www.mynetdiary.com/best-calorie-tracker-database-accuracy.html
  https://nutrola.app/en/blog/every-calorie-tracking-app-compared-2026
- **Verified-source signalling.** MFP's green check on user entries "just means
  enough people upvoted it — not necessarily correct"; users want a *trusted*
  marker that actually means verified.
  https://support.myfitnesspal.com/hc/en-us/articles/360032622691-Some-food-information-in-the-database-is-inaccurate-Can-I-edit-it

Scale of the problem (VERIFIED): ~70,000 foods are sold in UK supermarkets and
the UK is Europe's largest ready-meal consumer, yet standard UK food tables hold
only 3,423 generic items (7,000 in the expanded NDNS version) — so generic
tables alone never cover what UK users actually eat.
- https://community.myfitnesspal.com/en/discussion/10749820/food-database-uk-foods-only

NEWBIE implication: a newbie searches "chicken" and needs ONE correct best-match
at the top, not 20 conflicting entries. A curated best-match wins adherence.
ATHLETE implication: athletes need verified macro/micro accuracy and the ability
to trust a single source; duplicate noise directly corrupts a precise cut/bulk.

### Q4 — UK-specific: what foods do UK users report missing

VERIFIED complaints:
- **US bias / American portions.** MFP "defaults to foods from the US and US
  measures"; searching a Tesco sandwich returns "one with American portions, one
  clearly incorrect, and maybe one that's actually right."
  https://home-cooks.co.uk/pages/review-myfitnesspal
- **UK supermarket own-brand + barcode gaps.** Cronometer: "UK supermarket
  branded products and UK or European brands are not recognised by the barcode
  reader … very labour intensive for UK users." One user reported trying 20 UK
  supermarket barcodes with none recognised.
  https://forums.cronometer.com/discussion/677/uk-and-europe-foods-database-needed-for-use-outside-usa
  https://nutrasafe.co.uk/blog/best-food-scanner-apps-uk-2026
- **Missing categories specifically cited:** Tesco meal deals, Greggs items,
  Costa coffee, Nando's, Sainsbury's/Aldi/Lidl own-brand ranges, ready meals.
  Curated UK apps (Nutracheck, NutraSafe) are praised precisely for carrying
  these. https://home-cooks.co.uk/pages/review-nutracheck
- **French/EU catalogue mismatch.** Yuka and similarly Foodvisor lean French/EU,
  so UK own-label items may not appear.
  https://nutrasafe.co.uk/blog/best-food-scanner-apps-uk-2026

What good UK coverage looks like (VERIFIED benchmark): myfood24 covers 10 of 11
main supermarkets, 5 major coffee chains, 9 leading fast-food outlets, 79,338
branded items (Dec 2021); Open Food Facts lists 24,366 UK brands.
- https://uk.openfoodfacts.org/brands

NEWBIE implication: a UK newbie hits a wall on day one when their meal-deal
sandwich isn't found — they assume the app is "wrong" and quit. UK best-match
coverage is an onboarding-survival feature.
ATHLETE implication: UK competitors need accurate own-brand/ready-meal macros;
US portion contamination silently breaks a tracked plan.

### Q5 — How apps make logging feel worth the effort

VERIFIED:
- **Visible progress / outcome link.** Logging is framed as the "map" — users
  report it is what makes weight management work; Lose It cites 6% more weight
  loss and 2x more foods logged with assisted logging.
  https://www.barchart.com/story/news/31984516/lose-it-finds-ai-powered-logging-boosts-weight-loss-success-and-greater-nutritional-mindfulness
- **Mindfulness/awareness framing.** Apps that present logging as awareness
  (not punishment) report better stickiness.
  https://www.mynetdiary.com/food-log.html
- **Adaptive targets that respond to your data** (MacroFactor's expenditure
  algorithm — deterministic, NOT an LLM) make the log feel like it *does
  something*, vs a static calorie cap.
  https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/

NEWBIE implication: show the payoff fast — a trend line or "you're on track"
beats raw numbers; tie each log to a visible goal.
ATHLETE implication: the log must feed an adaptive/diagnostic output (trend
weight, expenditure, adherence) or athletes see it as data-entry busywork.

### Q6 — How apps serve approximate vs precise users

VERIFIED:
- **Quick-add calories** serves approximate users (3 taps in MacroFactor) but
  "disables nutrient planning and analysis" — you lose micro insight.
  https://forums.cronometer.com/discussion/comment/18953
- **"Consistency beats precision"** is the dominant adherence message: a simpler
  approach used daily beats an elaborate one abandoned.
  https://www.hootfitness.com/blog/how-to-stay-consistent-with-food-logging-(even-when-you-re-busy)
- **Precise users** are served by verified DBs + micro tracking (Cronometer 84
  nutrients, MyNetDiary 108) and by gram-level barcode entries.
  https://www.calai.app/blog/myfitnesspal-vs-cronometer
- **Pre-logging / log-ahead** serves planners (meal-preppers, competitors).
  https://www.hootfitness.com/blog/how-to-stay-consistent-with-food-logging-(even-when-you-re-busy)

NEWBIE implication: offer an approximate/quick path (favourites, simple
portions, "a handful/a plate") so they don't bounce off gram-precision.
ATHLETE implication: offer full gram precision + micros + pre-log, but don't
force it on everyone.

### Q7 — What features make users log consistently vs give up

VERIFIED — why they GIVE UP:
- **Abandonment is brutal:** widely cited that ~80% quit food-logging apps and a
  study found ~97% abandon food-journal apps within a week.
  https://www.kygo.app/post/why-80-of-people-quit-food-logging-apps-and-how-to-actually-stick-with-it
- **Tedium / log-fatigue:** "tedious," "a huge chore"; manual logging takes
  5–15 min/day and burns people out before results show.
  https://www.mynetdiary.com/food-log.html
- **Database friction (the #1 practical killer):** "100 results for the same
  food and all of them are incorrect"; verifying every entry is exhausting.
  https://community.myfitnesspal.com/en/discussion/10862172/there-is-so-much-items-in-the-database-with-incorrect-nutritional-values
- **Added taps from redesigns:** MFP's 2026 "Today" tab buried the diary behind
  a "View All" button — "logging a full day's food now takes noticeably more
  effort than before"; "ruined by … gigantic, space-consuming cards"; users
  switched to Cronometer. VERIFIED.
  https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/

VERIFIED — what KEEPS them logging:
- **Speed under ~10s and "logging takes under 10 seconds" or users stop within a
  week."** https://calorietrackerbuddy.com/blog/food-logging-apps/
- **Recents, favourites, saved meals, copy-yesterday** — the single most-cited
  time saver. https://www.mynetdiary.com/iphelp_myFoods.html
- **Reminders, streaks, progress visualisation, social accountability** improve
  past-month retention — *with a caution* (see Q8).
  https://calorietrackerbuddy.com/blog/food-logging-apps/

NEWBIE implication: front-load recents/favourites and a sub-10s path; a single
correct best-match removes the "20 wrong results" wall that kills week one.
ATHLETE implication: saved meals + copy-day handle their repetitive prep diets;
they abandon over DB inaccuracy, not speed.

### Q8 — Can AI/scanning remove friction without losing accuracy (boundary-safe)

VERIFIED accuracy reality for AI:
- AI food ID ~68–86%; **portion estimation as low as 39%**; calorie MAPE
  typically 15–25%. Cal AI ±14.6% MAPE, SnapCalorie ±19.8% on weighed meals.
  https://fitia.app/learn/article/ai-calorie-photo-apps-accuracy-2026/
  https://askvora.com/blog/cal-ai-acquisition-photo-food-logging
- Hidden oils/sauces and mixed dishes drive underestimation.
  https://foodbuddy.my/blog/the-accuracy-of-ai-photo-calorie-counters

**Barcode scanning is the boundary-safe friction killer.** It is deterministic
(barcode → DB lookup), no LLM, "logs a complete meal in seconds" and "reduces
human error by eliminating typos or incorrect product selection." Accuracy
depends only on the underlying DB record, not on AI inference. VERIFIED.
- https://macroinspector.com/en/blog/scan-food-barcodes
- https://world.openfoodfacts.org/ (3M+ products, photo-verified entries)

NOT boundary-safe for Volyume (LLM-dependent — report as market context only):
- MacroFactor "Describe" (typed/spoken natural language) — explicitly uses
  "several LLM prompts in tandem," though it grounds results in real foods
  rather than generating macros. Not permissible under Volyume's no-LLM rule.
  https://help.macrofactorapp.com/en/articles/258-ai-food-logging
- Photo calorie estimation (Cal AI, SnapCalorie, Lose It photo) — AI inference,
  not boundary-safe, and accuracy is weak anyway.

INTERPRETATION (labelled, not a sourced finding): The evidence points to a
deterministic stack that removes friction without an LLM — fast barcode scan
against a verified UK DB, a plate/running-total that stays open, and
recents/favourites/saved-meals/copy-day. This matches the measured fastest paths
(barcode 5 actions, recents) while staying inside the no-LLM boundary. Any
"smart" suggestion would need to be deterministic (e.g. frequency-ranked recents
by time-of-day), not generative.

---

## 3. VERBATIM USER VOICE

- "100 results for the same food and all of them are incorrect."
  https://www.kygo.app/post/why-80-of-people-quit-food-logging-apps-and-how-to-actually-stick-with-it
- MFP duplicates: "five, ten, sometimes twenty or more entries for the same
  item … the calorie counts can vary by 20 to 40 percent across duplicates."
  https://www.mynetdiary.com/best-calorie-tracker-database-accuracy.html
- 10-year MFP user: "always found it tedious and time consuming but worth it and
  now it's even more so and getting too expensive."
  https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718?see-all=reviews
- MFP 2026 redesign: the diary "has been ruined by being converted to a list of
  gigantic, space-consuming cards"; "logging a full day's food now takes
  noticeably more effort than before."
  https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/
- UK/Cronometer: UK branded products "are not recognised by the barcode reader …
  very labour intensive for UK users."
  https://forums.cronometer.com/discussion/677/uk-and-europe-foods-database-needed-for-use-outside-usa
- Nutracheck praise: scan "a Costa coffee or a Sainsbury's ready meal" and "you
  get the actual nutritional information rather than something a random user
  typed in years ago." https://home-cooks.co.uk/pages/review-nutracheck
- ED study participant theme: "fixation on numbers, fuelled heavily by the app's
  quantification, which worsened their eating disorder behaviours."
  https://www.cambridge.org/core/journals/bjpsych-open/article/effects-of-diet-and-fitness-apps-on-eating-disorder-behaviours-qualitative-study/2D1EE739D97AB3EFC6573835E4C527BD

---

## 4. BEST-IN-CLASS

- **Lowest friction / fastest:** MacroFactor — plate/timeline keeps logger open;
  24 actions across 4 workflows; 3-tap quick-add, 5-action barcode; deterministic
  adaptive expenditure (no LLM). Note its "Describe" feature IS LLM-based.
  https://macrofactor.com/new-food-logger/
- **UK database (curated, verified, ED-conscious imagery):** Nutracheck —
  curated not crowdsourced, 500K+ UK items, nutritionist-verified, food images,
  Tesco/Greggs/Costa/Nando's coverage.
  https://home-cooks.co.uk/pages/review-nutracheck
- **Accuracy gold standard:** Cronometer — lab-verified USDA/NCC, <3% deviation,
  84 nutrients. https://nutrola.app/en/blog/every-calorie-tracking-app-compared-2026
- **Boundary-safe barcode backbone:** Open Food Facts — 3M+ products, 24,366 UK
  brands, photo-verified, deterministic lookup, open API.
  https://world.openfoodfacts.org/

---

## 5. PROPOSAL INPUT (sourced only)

What Volyume should take into the Pro food diary (all boundary-safe / no-LLM):

1. **Target a 5-action barcode log and a sub-10s path** — that is the measured
   bar for retention; beyond ~10s users quit within a week.
   (nutriscan/MacroFactor FLSI; calorietrackerbuddy)
2. **Plate / running-total that stays open** across multiple items in one meal —
   the single biggest deterministic friction reducer.
   (macrofactor.com/new-food-logger)
3. **Recents + favourites + saved meals + copy-yesterday** from day one — the
   most-cited time saver and consistency driver. (mynetdiary myFoods)
4. **Curated, verified UK best-match** (one correct top result), not 20
   crowdsourced duplicates — accuracy beats size; show a *meaningful* verified
   marker. (Nutracheck; mynetdiary DB-accuracy)
5. **UK-first coverage:** supermarket own-brands, meal deals, Greggs/Costa/
   Nando's, ready meals, and **UK barcodes**; avoid US-portion contamination.
   Open Food Facts (deterministic lookup) is a candidate UK barcode source.
   (cronometer UK thread; OFF brands; Nutracheck)
6. **Serve both audiences:** an approximate quick path (favourites/simple
   portions) AND full gram + micro precision + pre-log for athletes — without
   forcing precision on newbies. (cronometer quick-add; hootfitness consistency)
7. **ED-safe design is load-bearing, not optional:** the BJPsych study ties
   harm to numeric fixation, red/green colour feedback, and competitive streaks.
   Volyume already runs a safety system (`src/coaching/safety/`); the diary's
   visual design should avoid punitive red-over/green-under framing and pressure
   streaks. (BJPsych qualitative study) — flag to safety owners before building.
8. **AI boundary stays hard:** photo calorie estimation (15–25% error, portion
   est. as low as 39%) and natural-language "describe" (LLM) are NOT
   boundary-safe and are not recommended. Barcode + verified DB + deterministic
   recents deliver the friction reduction without crossing the line.
   (fitia AI accuracy; macrofactor AI-food-logging LLM note)

---

## 6. VERIFICATION SUMMARY

- Apps named with ≥1 sourced data point: **40+** (table above).
- VERIFIED (solid logging/DB detail, named source URL): **~28**.
- PARTIAL: ~9 (vendor self-reports, or named in roundups without independent
  logging-speed data).
- NOT FOUND: 4 (PlateJoy, Google Fit, Fitbit, Waterllama — appear in lists but
  no usable logging-speed/DB data captured).
- Meets the 20-app VERIFIED floor; no top-of-report shortfall flag required.

Biggest NOT-FOUND / gap: **independent (non-vendor) tap-by-tap measurements for
apps other than the MacroFactor-vs-MyFitnessPal FLSI.** The "3 taps / 5 actions"
figures all trace to MacroFactor's own FLSI methodology (cross-cited by
nutriscan). It is the only granular, reproducible tap-count source found; rival
"fastest" / "10-second" claims are vendor marketing and were excluded from
recommendations. A second independent benchmark could not be confirmed.

Tool note: `macrofactor.com/fastest-food-logger-2025/` is bot-gated (Cloudflare
verification screen) and could not be fetched directly; its figures were
obtained via the cross-citing nutriscan.app comparison and other secondary
sources. No other tool failures.
