# Diary tab redesign: user sentiment research

Status: COMPLETE | Timestamp: 2026-06-01 | Phase 3: User sentiment research

## Method and honesty note

This is live desktop web research run on 2026-06-01. The search tool is
US-region and the fetch tool was blocked on most hosts during this session
(repeated HTTP 403 and a clock-skew "certificate is not yet valid" error),
and Reddit pages would not load directly. So the primary-source Reddit
threads and App Store review pages could not be opened verbatim in this
session. What follows is built from search-result summaries that quote or
paraphrase those sources, plus review aggregators and app-maker material.

Where a voice is reported second-hand through a review site or a search
summary rather than read directly off the original thread, it is marked
**(reported, not read live)**. Treat single-line stats (for example "80%
quit in two weeks") as directional marketing-adjacent claims unless they
carry a study citation. The two study-grade numbers below are flagged as
such. Everything else is sentiment, not measurement.

---

## 1. What users consistently PRAISE about diary design

**Ad-free, calm, data-first surface.** The most repeated praise for
MacroFactor is the absence of ads, gamification, social feeds and
motivational pop-ups: "no ads, the experience is entirely ad-free
regardless of your plan" and "a clean, no-nonsense interface designed for
people who care about data" [1][2]. This is praised specifically in
contrast to the noise users describe in MyFitnessPal (section 2). The
read-through for Volyume: a quiet, ad-free diary is itself a feature people
notice and value, not just an absence of a negative.

**Speed of the core log.** Even MyFitnessPal's critics concede the core
flow is quick: "the core logging flow is fast, tap, search, log" [3]
(reported, not read live). Where an app makes the common case (a food you
have eaten before) a couple of taps, users call it out positively.

**Logging several foods before committing.** MacroFactor's "Plate" pattern,
add multiple foods to a plate and tap Log once at the end rather than
logging each food separately, is presented as a deliberate speed win and
echoed approvingly in reviews of multi-food meals [4][5]. Users building a
plate of "chicken, rice, oil" in one pass like not bouncing back to a
search screen between every item.

**Accuracy and a verified database.** Serious trackers praise databases
they can trust. Cronometer is repeatedly praised for research-grade data
(NCCDB and USDA) and label-verified entries, "many praise Cronometer's
ability to track hard-to-find nutrients" [6][7]. For physique users the
praise is concrete: a verified chicken-breast entry that is not off by 10%
[8]. Trust in the number is part of why people keep opening the diary.

**Per-meal macro breakdown inside the day.** Apps that show protein, carbs
and fat per meal (not only a daily total) get specific praise from
macro-focused users: My Macros+ "shows how many of each nutrient you have
remaining for the rest of your day", and Fitocracy Macros "puts macro
counts front and centre" and lets you see macros for every meal [9].

---

## 2. What users consistently COMPLAIN about

**Ads and clutter wrecking a quick log.** The loudest 2025-2026 complaint
is MyFitnessPal's ad load: "the free version bombards users with ads that
slow down the app", and "full page ads being displayed when tracking food"
described as a "genuinely awful user experience", worst when you are trying
to "quickly log food between meetings or at the gym" [3][10] (reported, not
read live). A dedicated MFP community thread is literally titled
"Advertising tactics are causing a negative impact on your app" and another
"App slow because of ads" [10].

**Barcode scanner moved behind the paywall.** MFP put barcode scanning,
long a free staple, behind Premium. Coverage and community threads report
strong user anger ("Why is the barcode scan behind premium?", "Scan barcode
only for premium?") because it removed the fastest path to logging a
packaged food for free users [11][12]. A 2025 App Store review captured the
mood: "Several years ago, this app was the best out there. Over the past
year, the company continues to make terrible decisions. Features have been
reduced or eliminated. The value plummeted, yet the price did not" [13]
(reported, not read live).

**The 2026 MFP redesign: more taps, lost at-a-glance.** The redesign is
reported to have "added more taps to log a meal, a food diary that no longer
shows calories per meal at a glance, and a cluttered home view" [3][10]
(reported, not read live). Losing the per-meal calorie number from the diary
is called out as a real regression. This is the single most relevant
complaint for a diary redesign: people relied on glancing at a meal row and
seeing its calories without drilling in.

**Manual entry fatigue.** Cronometer's flip side: an interface new users
call "overwhelming", with r/cronometer posts about "logging fatigue" and
"wishing it had photo scanning", and manual-only logging that is "tedious
for daily use" [6]. Recurring gripes also include slow performance, missing
local foods, and "bugs when editing past logs" [6].

**Per-item time cost adds up.** Slow manual logging, "searching, scrolling,
and selecting portion sizes taking 15 to 30 seconds per food item", is
named as the friction that compounds across multiple meals and snacks a day
[3].

---

## 3. What makes users log CONSISTENTLY vs ABANDON

The clearest signal in the research: **per-entry time is the hinge.**

- "If logging a meal takes more than 30 seconds, most people will abandon it
  within two weeks" [14][15]. Treat the exact threshold as directional, but
  the direction is consistent across sources.
- A market-stats roundup reports "70% of users abandon diet and nutrition
  apps within 2 weeks if the app is too complex or time-consuming", and
  retention "drops to 30% after the first month" [16] (directional,
  aggregator).
- One study-grade number: a 12-week lifestyle intervention found 68% of
  participants tracked consistently in week 1, falling to 21% by week 12
  [16] (**study-cited**, the strongest data point here).
- The behavioural framing: "If consistency is the system that keeps you
  going, friction is the thing most likely to break it. Traditional food
  logging often feels like homework, searching databases, measuring every
  bite, typing out endless details" and "when logging takes 15 seconds
  rather than three minutes, the mental barrier to opening the app after
  every meal essentially disappears" [14].

What keeps people logging:
- The food they want is reachable in a couple of taps (recents, favourites,
  saved meals, copy-meal: section 5).
- The day's state is readable at a glance the moment the diary opens
  (section 6), so logging gives an immediate, legible payoff.
- The number is trustworthy enough that the effort feels worth it (the
  accuracy praise in section 1).

What drives abandonment: complexity and per-entry time, an "arbitrary"
target disconnected from results [16], ads and clutter that interrupt a
quick log [3][10], and manual-entry tedium with no fast path for repeat
foods [6].

---

## 4. What TRAINING-FOCUSED users want that wellness apps do not give

Physique, strength and prep users want a diary tuned to a different job than
general weight-loss apps: they eat the same foods repeatedly, weigh
portions, prioritise protein, and care about distribution across the day.

- **Protein-first, accurate macros, not vibes.** "For bodybuilding, the best
  macro tracking app needs accurate protein tracking, per-meal breakdowns to
  distribute protein across meals, and a large verified database that covers
  staple bodybuilding foods precisely" [8]. The accuracy bar is explicit:
  "a 10% error on a single chicken breast entry throws off your entire daily
  protein count" [8].
- **Per-meal breakdown, not just a daily total.** "See protein, carbs and
  fat for each meal, not just the daily total" is named as a bodybuilding
  requirement [8], and apps built by lifters lean into it: My Macros+ "was
  created by a former bodybuilder" and shows remaining nutrients as you add
  meals; Fitocracy Macros puts macros front and centre per meal [9].
- **Fast logging because volume is high.** "Manual search is too slow when
  you are logging 4 to 6 meals per day" [8], so AI photo, voice ("200 grams
  chicken breast, cup of rice, tablespoon olive oil"), and copy-meal are
  treated as needs rather than nice-to-haves [8][9][17].
- **Repeat-the-same-meal workflows.** Bodybuilder-oriented apps centre a
  "Copy Meal function that lets you instantly repeat your favourite
  muscle-building meals, just tap to copy" [17], reflecting that prep diets
  are highly repetitive.
- **No gamification or wellness padding.** The MacroFactor praise for "no
  gamification, social features, or motivational pop-ups" [2] reads as a
  direct fit for this group: they want data and targets, not badges or
  encouragement.

Note: in this session I could not open r/naturalbodybuilding or
r/bodybuilding threads directly (Reddit blocked). The needs above are drawn
from app and review sources that describe what this audience asks for. Mark
the bodybuilding-specific items as **reported, not read live** at the thread
level; the pattern is consistent across [8][9][17] but is not a direct
quote off a named Reddit post in this session.

---

## 5. Design PATTERNS users call out as faster or slower

**Faster:**
- **Recents, favourites and saved meals.** Re-using prior logs is the
  backbone of low-friction logging; even MFP's defenders note you can "save
  and re-use logged meals" [9], and MacroFactor surfaces Favourites and
  smart history as primary tools [18][19].
- **Copy-meal / repeat-day.** Called out explicitly as a time-saver for
  repetitive eaters [17].
- **Barcode scan** for packaged foods, when it is free and fast; removing it
  from the free tier is felt as a slowdown [11][12].
- **Quick Add (raw macros/calories).** "Add calories, protein, fat and carbs
  directly" without a database lookup is listed as a core fast path [18].
- **Plate / batch logging.** Add several foods, log once, rather than
  logging each item separately [4][5].
- **AI photo and voice describe.** "Snap and track identifies meals in under
  3 seconds" and voice dictation parsing a spoken meal into items are framed
  as the fastest paths for multi-item meals [8][18][20].

**Slower:**
- **Manual search, scroll, pick portion** per item, 15 to 30 seconds each,
  multiplied across the day [3].
- **Manual-only entry with no photo/quick path** (the Cronometer "logging
  fatigue" complaint) [6].
- **Ads and full-page interstitials interrupting the log flow** [3][10].
- **Extra taps from a redesign**, the specific MFP 2026 regression [3].

The maker-side framing is worth keeping for vocabulary, not as neutral fact:
MacroFactor's Food Logging Speed Index claims its speed mode needs about 25%
fewer actions than the next-best and ~70% fewer than the average of ~20
loggers they tested [4][5][20]. Useful as a way to think about counting
discrete taps per log; it is the vendor's own benchmark, so treat the exact
figures as marketing.

---

## 6. CALORIE and MACRO VISUALISATION: what helps vs confuses

**Per-meal calories visible in the diary is load-bearing.** The strongest
negative signal in the whole set is users mourning that the MFP 2026 diary
"no longer shows calories per meal at a glance" [3]. People scan the diary
row by row and expect each meal's calories there without tapping in.

**Numbers vs rings vs bars: the split is by goal.** Sources describe a real
preference divide. Ring-heavy dashboards (three rings: consumed, burned,
remaining, as in some apps) give a quick gestalt but can confuse: "consumed,
burned and remaining" plus net-calorie maths is a recurring source of
confusion, and concepts like net calories, BMR vs RMR, and points-style
"zero" foods trip people up [21][22]. For single-metric users, "a minimalist
approach that focuses on a single daily metric reduces friction", and a
"simple progress bar for tracking protein" is praised for legibility [23].
My Macros+ uses progress rings per macro [23]. The takeaway is not "rings
bad, bars good" but: match the visual to what the user is chasing, one clear
protein bar for a protein-led lifter beats three competing rings.

**Remaining vs consumed.** "Remaining" framing (how much budget is left)
suits people eating to a target and is what bodybuilding apps lean on
("how many of each nutrient you have remaining for the rest of your day")
[9]. "Consumed" framing suits people auditing what they ate. Showing both
without a clear primary is where confusion creeps in [21].

**De-emphasising the number entirely** is an emerging counter-pattern some
apps push to avoid obsessive tracking [21][24], but that is squarely a
general-wellness move and runs against what the section 4 training audience
explicitly wants.

---

## What consistent loggers need (evidence-backed)

- **Repeat foods reachable in one or two taps:** recents, favourites, saved
  meals, copy-meal. The repeat-meal pattern is named as the core time-saver
  [9][17].
- **Per-entry time under ~30 seconds.** Above it, abandonment within two
  weeks is the repeated claim [14][15].
- **Per-meal calories and macros readable in the diary without drilling in.**
  Removing this was the headline MFP regression complaint [3].
- **A trustworthy, verified database**, especially for protein staples
  [6][8].
- **A calm, ad-free, low-clutter surface** so a quick log stays quick
  [2][3][10].
- **For training users: protein-first, per-meal breakdown, fast multi-item
  logging (plate/photo/voice), no gamification** [2][4][8][9].

## What drives abandonment (evidence-backed)

- **Per-entry time and complexity:** "70% abandon within 2 weeks if too
  complex or time-consuming" (directional aggregator) [16]; consistent
  tracking fell from 68% (week 1) to 21% (week 12) in a 12-week study
  (**study-cited**) [16].
- **Ads and full-page interstitials breaking the log flow** [3][10].
- **Paywalling the fast path** (barcode behind Premium) [11][12][13].
- **Extra taps and lost at-a-glance info from a redesign** [3].
- **Manual-entry tedium with no fast/photo path:** "logging fatigue" [6].
- **Confusing or competing visualisations** (three rings, net calories,
  remaining vs consumed without a clear primary) [21][22].

---

## Sources

1. [Is MacroFactor Worth It in 2026? Pricing, Pros, Cons, Alternatives, Nutrola](https://nutrola.app/en/blog/is-macrofactor-worth-it-2026)
2. [MacroFactor app, Smart Macro Tracker and Diet Coach (official)](https://macrofactor.com/macrofactor/)
3. [MyFitnessPal Alternatives 2026: Why Users Are Switching After the Redesign, PlateLens](https://platelens.app/blog/myfitnesspal-alternatives-2026)
4. [What is the Fastest Food Logger? We Designed a System to Find Out, MacroFactor](https://macrofactor.com/fastest-food-logger/)
5. [MacroFactor is Rolling out the Fastest Food Logging Workflows on the Market](https://macrofactor.com/new-food-logger/)
6. [Cronometer Review 2026, Gaya](https://www.trygaya.com/review/cronometer-review)
7. [What Are the Cons of Cronometer? A User Guide, Alibaba Wellness](https://wellness.alibaba.com/nutrition/cronometer-cons-what-to-watch-for)
8. [Best Apps to Track Macros for High-Protein Diets, Fitia](https://fitia.app/learn/article/top-high-protein-nutrition-apps/)
9. [5 Great Apps to Track Macros On the Go, Daily Burn](https://dailyburn.com/life/tech/food-diary-app-tracking-macros/)
10. [Advertising tactics are causing a negative impact on your app, MyFitnessPal community](https://community.myfitnesspal.com/en/discussion/10871838/advertising-tactics-are-causing-a-negative-impact-on-your-app)
11. [Why is the barcode scan behind premium?, MyFitnessPal community](https://community.myfitnesspal.com/en/discussion/10939125/why-is-the-barcode-scan-behind-premium)
12. [MyFitnessPal's barcode scanner will only be available to Premium users, XDA](https://www.xda-developers.com/myfitnesspals-barcode-scanner-behind-a-paywall/)
13. [Why Users Are Switching from MyFitnessPal and What They're Choosing Instead, Hoot Fitness](https://www.hootfitness.com/blog/why-users-are-switching-from-myfitnesspal-and-what-they-re-choosing-instead)
14. [How to Stay Consistent With Food Logging (Even When You're Busy), Hoot Fitness](https://www.hootfitness.com/blog/how-to-stay-consistent-with-food-logging-(even-when-you-re-busy))
15. [Do Calorie Tracking Apps Actually Work? Evidence-Based Answer, Nutrola](https://www.nutrola.app/en/blog/do-calorie-tracking-apps-actually-work)
16. [Diet and Nutrition Apps Statistics and Facts (2026), Market.us](https://media.market.us/diet-and-nutrition-apps-statistics/)
17. [NutriScan for Muscle Gain, Muscle Diet and Protein Tracker App 2026](https://nutriscan.app/apps/nutriscan-for-muscle-gain)
18. [How to Log Food in MacroFactor (help docs)](https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor)
19. [AI Food Logging Comes to MacroFactor](https://macrofactor.com/ai-food-logging/)
20. [Is MacroFactor Still the Fastest Food Logger? (2025 FLSI Update)](https://macrofactorapp.com/best-food-logging-app/)
21. [Tracking Nutrition Without Focusing on Calories, Cronometer Blog](https://cronometer.com/blog/tracking-nutrition-without-focusing-on-calories/)
22. [The Challenges and Limitations with Calorie Counting, WHOOP](https://www.whoop.com/us/en/thelocker/calorie-tracking-science/)
23. [Best Protein Tracker Apps in 2026 (Free and Paid, Ranked), Nutrify](https://nutrifytracker.com/blog/best-protein-tracker-apps)
24. [Oura Meals: Understand How Your Food Fuels You, Oura Pulse Blog](https://ouraring.com/blog/oura-meals/)
