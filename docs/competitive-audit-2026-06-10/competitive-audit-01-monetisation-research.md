# Competitive Audit — Subscription, Paywall & Monetisation in Fitness Apps
**Volyume Competitive Intelligence — 10 June 2026**
**Scope:** Free/paid tier differentiation, paywall presentation, trial models, pricing, lifetime demand, user sentiment, and a precise lead/match/lag comparison against Volyume's baseline (Free/Pro, £4.99/mo or £29.99/yr, 14 cardless days + 7-day Play intro offer = 21 free days, differential paywall detector, server-authoritative verification).

> Research basis: 18 web searches/fetches across store-review aggregations, Reddit-derived sentiment, vendor pricing pages, and subscription-industry data (RevenueCat, Adapty). All sources cited inline. This document changes no code and proposes no change to live billing product IDs (`volyume_pro_monthly`, `volyume_pro_annual`).

---

## 1. Top 10 ranked by subscription experience

Ranking weighs: fairness of free tier, paywall friendliness, trial quality, price/value sentiment, and cancellation/billing trust.

| # | App | Why it ranks here |
|---|-----|-------------------|
| 1 | **Hevy** | Most generous free tier in serious tracking; cheap Pro ($2.99/mo, $23.99/yr, $74.99 lifetime); 4.9-star sentiment; never discounts lifetime (trust signal) |
| 2 | **Boostcamp** | 11,000+ programs and full tracking free, no ads; Pro is a pure value-add (analytics, exclusive programs) — nobody feels gated |
| 3 | **MacroFactor** | Honest hard-paywall: no free tier ever, publicly explained; 7-day full-access trial; high perceived value ("better at calorie tracking than any other app on the market" — Reddit user year-long review) |
| 4 | **Alpha Progression** | Functional free tier + 14-day full Pro trial; ~$5.33/mo Pro; "winner of best weightlifting app 2025… unrivalled customer support" |
| 5 | **Cronometer** | Free tier keeps barcode scanning + 84 micronutrients; Gold at $4.99/mo is "roughly three times cheaper than MyFitnessPal Premium" |
| 6 | **Strong** | Clear, simple gate (3 routines free, unlimited workouts); $4.99/mo, $99.99 lifetime; minimal upsell pressure |
| 7 | **Caliber** | "Surprisingly robust and completely ad-free" free tier; clean ladder Free → Plus ($19.99/mo) → human coaching ($200+/mo); top-rated coaching on Trustpilot |
| 8 | **Fitbod** | Hard paywall done acceptably (3 free workouts then $15.99/mo); strong "worth every penny" sentiment but churn from repetitive programming |
| 9 | **Peloton App** | Free tier exists, but 2023 tier split (cycling moved to 85%-pricier App+) caused lasting "nickel-and-dime" resentment; Oct 2025 price rises |
| 10 | **MyFitnessPal / Whoop (tied last)** | MFP: serial paywalling of formerly-free features, cancellation dark patterns, BBB complaints. Whoop: data hostage on cancel + broken free-upgrade promise (2,400-upvote "Upvote this if you just canceled" Reddit post) |

---

## 2. Per-app deep dives

### 2.1 Hevy — the freemium benchmark
- **Pricing:** $2.99/mo, $23.99/yr, $74.99 lifetime (~€80; UK roughly £70–80). Lifetime is *never* discounted — explicit policy, which protects buyer trust ([Hevy pricing](https://hevy.com/pricing), [Hevy help centre](https://help.hevyapp.com/hc/en-us/articles/38223834432279)).
- **Free vs paid:** Free = unlimited workout logging, full exercise library, social feed/leaderboards, progress charts; capped at 4 routines, 7 custom exercises, 3 months of graph history. Pro = unlimited routines/custom exercises/history, body measurements ([Push/Pull analysis](https://push-pull.app/blog/push-pull-vs-hevy), [PRPath review](https://prpath.app/blog/hevy-app-review-2026.html)).
- **Sentiment:** "The free experience [is] more complete than Strong's or most other apps"; 4.9 average across stores; reviewers repeatedly cite "a free, no-ads version" and "responsive developer" as reasons to pay ([RepReturn](https://repreturn.com/hevy-app-review/), [HotelGyms](https://www.hotelgyms.com/blog/hevy-workout-app-review-the-up-and-comer-taking-the-fitness-world-by-storm)).
- **Mechanism:** soft caps users hit only after habit formation (4th routine, 4th month of charts). The paywall arrives *after* the user is invested, and it gates convenience, not the core loop. Social features free = viral growth engine.

### 2.2 Boostcamp — free-programs flywheel
- **Pricing:** Core app free forever, no ads: 11,000+ programs incl. 130+ coach-designed, full tracking, progressive overload. Pro adds 20+ exclusive coach programs + advanced analytics ([boostcamp.app](https://www.boostcamp.app/), [Google Play listing](https://play.google.com/store/apps/details?id=com.bpmhealth.boostcamp)).
- **Sentiment:** "The analytics on Pro are worth it once you're past beginner gains." The free tier "funds itself by being good enough that lifters recommend it" — distribution-as-monetisation.
- **Lesson for Volyume:** a deep *free plan library* is a proven acquisition weapon; Volyume already has this free — keep it sacrosanct.

### 2.3 MacroFactor — honest hard paywall
- **Pricing:** $11.99/mo, $47.99/6mo, $71.99/yr (~£55/yr UK — cheaper than MFP Premium at ~£65/yr). 7-day full-access trial, no permanent free tier ([NutriScan](https://nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b), [UK review](https://home-cooks.co.uk/pages/review-macrofactor)).
- **Positioning:** founders state publicly there "will never be a free version" — premium-only to stay ad-free, privacy-respecting, with a verified food database. Users respect the candour.
- **Sentiment:** "MF is awesome. It's better at calorie tracking than any other app on the market, and its TDEE estimation algorithm is very accurate" (Reddit year-long review). Criticism: at $11.99/mo "harder to justify"; lacks AI photo logging vs 2026 competitors ([Nutrola](https://nutrola.app/en/blog/why-is-macrofactor-so-expensive)).
- **Most relevant to Volyume:** MacroFactor proves users will pay for *deterministic, algorithmically honest coaching* (adaptive TDEE/macro adjustments — the closest analogue to Volyume's Precision Coaching). It is the direct sentiment comp for Volyume Pro's nutrition side, at ~2× Volyume's annual price.

### 2.4 MyFitnessPal — the cautionary tale
- **Pricing:** Free / Premium $19.99/mo, $79.99/yr (UK £9.99/mo, £49.99/yr) / Premium+ $24.99/mo, $99.99/yr ([FitBudd breakdown](https://www.fitbudd.com/post/myfitnesspal-app-cost), [Prunely UK](https://prunely.app/subscriptions/myfitnesspal)).
- **The backlash:** 2022 barcode-scanner paywalling produced the category's defining outrage ("Hey MyFitnessPal: We're Not Paying for a Damn Barcode Scanner" — [Punished Backlog](https://punishedbacklog.com/hey-myfitnesspal-were-not-paying-for-a-damn-barcode-scanner/); [XDA](https://www.xda-developers.com/myfitnesspals-barcode-scanner-behind-a-paywall/)). May 2026: scan-a-meal, recipe import and macro-by-meal goals quietly moved behind Premium, seen as positioning for the Cal AI acquisition ([The Nutrition Magazine](https://thenutritionmagazine.com/articles/myfitnesspal-paywall-changes-explained/)).
- **Sentiment:** "Long-time users felt betrayed… Moving such a core feature to premium made the app feel greedy." BBB complaints: "nowhere on the website to cancel", "everything generated by bots", charges after cancellation ([BBB](https://www.bbb.org/us/ca/san-francisco/profile/online-shopping/myfitnesspal-1116-539525/complaints), [PissedConsumer](https://myfitnesspal.pissedconsumer.com/review.html)).
- **The rule MFP broke:** *never retro-paywall a feature users joined for.* Each retraction handed users to Cronometer and MacroFactor.

### 2.5 Whoop — the data-hostage model
- **Pricing:** Three tiers since May 2025 relaunch, $199–$359/yr (UK ~£25–30/mo or ~£299/yr standard; hardware included) ([TrackerVS](https://trackervs.com/pricing/whoop-pricing/), [Whoop GB shop](https://shop.whoop.com/gb/en/)).
- **Backlash:** broke a (deleted-blog-post) promise of free hardware upgrades; $49 fee triggered mass cancellation — "Upvote this if you just canceled your subscription" got 2,400 upvotes; policy reversed under pressure ([TechRadar](https://www.techradar.com/health-fitness/fitness-trackers/whoop-has-broken-a-promise-on-free-hardware-upgrades-and-users-arent-pleased)).
- **Cancel experience:** "You are not buying a device. You are renting access to your own biometric data. The moment you stop paying, the data you generated disappears behind a paywall" ([Livity](https://livity-app.com/en/blog/best-whoop-alternatives), [MyHRV](https://www.myhrv.com/posts/is-whoop-worth-it)).
- **Lesson:** holding historical data hostage is the strongest cancellation-resentment driver in the category. Volyume's offline-first, local-source-of-truth architecture is the structural opposite — a marketable trust advantage.

### 2.6 Fitbod
- **Pricing:** $15.99/mo, $95.99/yr; 3 free workouts then hard paywall; no free tier ([Fitness Drum](https://fitnessdrum.com/fitbod-review/), [HotelGyms](https://www.hotelgyms.com/blog/review-of-fitbod-how-to-take-your-fitness-with-you)).
- **Sentiment:** "absolutely worth every penny" framing vs personal-training cost ($50–100/hr); but persistent Reddit complaints that algorithm-generated workouts become repetitive, driving cancellations once novelty fades.
- **Lesson:** an adaptive engine sells the subscription, but perceived staleness is the churn vector — Volyume's Precision Coaching must keep visibly *responding* to user data to retain.

### 2.7 RP Hypertrophy
- **Pricing:** $34.99/mo / $299.99/yr regular ($24.99/$224.99 on sale); 30-day money-back via website ([RP Strength](https://rpstrength.com/pages/hypertrophy-app), [Dr Muscle review](https://dr-muscle.com/rp-hypertrophy-app-review/)).
- **Sentiment:** praised for adaptive programming and authority (Dr Mike Israetel); "the high price point is frequently mentioned, along with the lack of built-in nutrition guidance"; not for beginners.
- **Lesson:** authority + adaptive science supports a 6–7× price premium over Volyume — but the audience is narrow. Volyume's bundled training+nutrition at £4.99 dramatically undercuts RP's per-discipline pricing.

### 2.8 Strong
- **Pricing:** Free (unlimited workout logging, 3-routine cap) / Pro $4.99/mo, $29.99/6mo, $99.99 lifetime ([Strong help centre](https://help.strongapp.io/article/132-strong-pro), [Push/Pull](https://push-pull.app/blog/push-pull-vs-strong)).
- **Sentiment:** trusted minimalist; the 3-routine cap "is the real limit most lifters hit first". Losing ground to Hevy's freer tier + social features in 2026 comparisons ([YourAppLand](https://yourappland.com/strong-vs-hevy-which-workout-app-is-better/)).

### 2.9 Caliber
- **Pricing:** Free (unlimited workouts, 600+ exercises, group training) / Plus $19.99/mo or $179.99/yr (plans + nutrition targets) / human coaching $200+/mo ([BarBend](https://barbend.com/caliber-fitness-app-review/), [Fitness Drum](https://fitnessdrum.com/caliber-app-review/)).
- **Sentiment:** free tier "includes a lot of features that reviewers would expect to see in an app charging $5–15/month"; premium coaching is Trustpilot's top-rated fitness program. The free tier is an intake funnel for high-LTV coaching.

### 2.10 Peloton App
- **Pricing:** App Free / App One $15.99/mo ($12.99 via web/Play) / App+ $28.99/mo after Oct 2025 rises ([Pelobuddy](https://www.pelobuddy.com/app-tiers-launch/), [Retail Dive](https://www.retaildive.com/news/peloton-raises-membership-pricing-holidays/761567/)).
- **Backlash:** moving cycling — "the company's core offering" — into a tier costing 85% more was called "a total disaster" ([Fast Company](https://www.fastcompany.com/91005914/peleton-app-update-total-disaster)); App One's 3-cardio-classes/month cap felt punitive ([TechCrunch](https://techcrunch.com/2023/05/23/peloton-relaunches-workout-app-free-pricer-tiers/)).

---

## 3. User sentiment synthesis

### What users love (verbatim themes)
- **Generous free + cheap paid:** Hevy — "free, no-ads version", "best free-tier value"; Cronometer free keeps barcode scanning.
- **Honesty about the model:** MacroFactor's "there will never be a free version" earns respect where MFP's stealth retractions earn fury.
- **Coaching that visibly adapts:** "its TDEE estimation algorithm is very accurate" (r/MacroFactor); Fitbod "worth every penny" vs PT cost.
- **Lifetime options:** Hevy $74.99 / Strong $99.99 lifetime repeatedly cited as the best-value path; "if you plan to use the app for more than two years it becomes cost-effective". Alpha Progression runs lifetime promos. Lifetime demand is real and recurring in every pricing thread — it converts subscription sceptics who are otherwise lost revenue.

### What users hate / why they cancel
1. **Retro-paywalling** (MFP barcode, Peloton cycling) — the single most cited betrayal.
2. **Data hostage on cancel** (Whoop; MacroFactor also locks data post-trial) — "renting access to your own biometric data".
3. **Cancellation friction / billing opacity** (MFP BBB complaints; "no option to cancel… charged weekly fees" — [Apple Communities](https://discussions.apple.com/thread/251444566)).
4. **Card-required trials:** "44% of subscription cancellations happen within the first 90 days, and most… from users who forgot to cancel during the trial window"; removing card requirement produced a **71% increase** in trial starts in one documented case ([Encharge](https://encharge.io/saas-free-trial-conversion-rates/), [Trainerize forum](https://ideas.trainerize.com/forums/167887)).
5. **Stale value:** loss of motivation = 38% of fitness-app cancellations; "free alternatives" = 25%; cost = ~35% (overlapping reasons) — and "'too expensive' may not be a price reason but a value issue" ([RevenueCat churn analysis](https://www.revenuecat.com/blog/growth/subscription-app-churn-reasons-how-to-fix/), [RetentionCheck](https://retentioncheck.com/churn-benchmarks/fitness-apps)).
6. **Resolutioner churn:** 40–60% of January sign-ups cancel by February ([Digital Yield Group](https://digitalyieldgroup.com/blog/health-fitness-apps-the-resolutioner-churn-problem/)).

### Industry benchmarks
- Hard paywalls convert ~12.1% vs freemium ~1.9% median, but with 70% higher refund rates ([Airbridge](https://www.airbridge.io/en/blog/hard-vs-soft-paywalls)).
- Health & fitness trial-to-paid ≈ 39.9% (RevenueCat SOSA 2025); longer trials show up to 45.7% conversion.
- Trial-format paywall screens beat visual-only layouts in 64.5% of A/B experiments (Adapty 2026).
- Yearly plans retain best; monthly plan retention fell to ~17% ([SaaStr summary of RevenueCat](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth/)).
- Social/accountability features cut monthly churn 20–35%.

---

## 4. Best-in-class and the common failure mode

**Single best implementation: Hevy.** Free tier generous enough to be a complete product and a social growth loop; caps placed exactly where habit is already formed (routine #5, month #4 of history); Pro priced below the impulse threshold; lifetime offered and never discounted (price integrity); zero ads; responsive developer. Result: 4.9 stars and category-leading goodwill while still converting.

**Most common failure mode: moving previously-free or implicitly-promised value behind the paywall.** MFP (barcode, then scan-a-meal), Peloton (cycling classes), Whoop (hardware-upgrade promise). In every case the financial logic was sound and the trust damage exceeded the revenue gain — it is the one mistake that turns reviews, Reddit and press hostile simultaneously. Secondary failure: data hostage-taking at cancellation (Whoop, MacroFactor post-trial).

---

## 5. Volyume vs each — lead / match / lag

£4.99/mo ≈ $6.30; £29.99/yr ≈ £2.50/mo effective.

| Competitor | Volyume leads | Volyume matches | Volyume lags |
|---|---|---|---|
| **Hevy** | Scope of Pro (nutrition+coaching+safety vs tracking conveniences); 21-day cardless trial vs none; coaching engine | Free logging + library + PBs free | Hevy's monthly is cheaper ($2.99); Hevy has lifetime + social-driven viral growth; bigger brand |
| **Strong** | Free routine-building uncapped (vs 3-routine cap); far broader Pro; trial | ~Same monthly price point (£4.99/$4.99) | No lifetime option; Strong's brand recognition |
| **MacroFactor** | Price (~£30/yr vs ~£55/yr); free tier exists at all; 21-day vs 7-day trial; cardless | Deterministic adaptive coaching credibility | MF's food database depth/verification and algorithm reputation; established expert community (r/MacroFactor) |
| **MyFitnessPal** | Price (£29.99/yr vs £49.99/yr); trust posture (no retro-paywalls, EU residency, no PII to third parties); cardless trial | Barcode scanning as a paid feature (MFP normalised this — but Volyume gated it from day one, which avoids the betrayal dynamic) | Database scale; brand ubiquity; recipe ecosystem |
| **Whoop** | Massively cheaper; no hardware lock-in; offline-first = user keeps data | Wearable integration (Pro) | Continuous biometric depth; recovery analytics prestige |
| **Fitbod** | ~60% cheaper annually; real free tier (Fitbod has none); longer trial | Adaptive programming value proposition | Fitbod's workout-generation novelty as acquisition hook |
| **RP Hypertrophy** | ~85% cheaper; includes nutrition (RP's most-cited gap); free tier; beginner accessibility | Science-led adaptive training credibility (aspirationally) | RP's authority brand (Israetel) justifies premium; deeper hypertrophy-specific analytics |
| **Boostcamp** | Coaching, nutrition, safety systems — Boostcamp has no nutrition | Free program library (both lead with it) | Boostcamp's 11,000-program scale and zero-cost depth; community program creation |
| **Caliber** | Price (Plus is £~16/mo equivalent); integrated nutrition at base Pro tier | Freemium structure with plans+nutrition as upgrade | Human-coach upsell tier (high LTV); Trustpilot social proof |
| **Peloton** | Price; coherent two-tier simplicity vs confusing three tiers; no retro-paywall history | Free tier exists | Content library (classes/music); brand |

**Positioning verdicts:**
- **£4.99/mo is well-positioned** — at or below every nutrition-coaching comparator (MFP £9.99, MacroFactor ~£9 effective monthly, Fitbod ~$15.99, RP $34.99) while above pure loggers (Hevy $2.99). Given Pro bundles what competitors sell separately (logger + nutrition coach + adjustments), it arguably *under*-prices; the risk is anchoring low, not high. £29.99/yr (£2.50/mo effective) is the cheapest serious coaching annual in the set.
- **The 21-day cardless trial is best-in-category.** Nobody else combines length (21 days vs MacroFactor 7, Alpha Progression 14) with cardless start — and industry data says longer + cardless maximises both starts (+71% in documented cases) and conversion (45.7% for longer trials). This should be marketed explicitly ("3 free weeks, no card").
- **The free tier is generous enough to grow on the training side** (uncapped building/logging beats Strong, rivals Hevy) — but lacks Hevy's *social* free layer and Boostcamp's program scale, the two proven free-tier growth engines. Note Training Partners sits in Pro: every competitor that wins on free-tier growth keeps social features free.

---

## 6. Improvement opportunities for Volyume (5–10, with impact rationale)

*(Strategy recommendations only — no code or billing changes proposed; product IDs unchanged.)*

1. **Market the trial as the headline: "21 days free, no card needed."**
   No competitor matches it. RevenueCat/Adapty data: longer trials convert up to 45.7%, cardless removes the sign-up cliff (+71% trial starts in documented cases), and trial-led paywall screens beat alternatives in 64.5% of experiments. Today this is mechanics; it should be the acquisition message on the store listing and first paywall screen.

2. **Consider moving basic Training Partners (or a lite social layer) into Free.**
   Hevy's free social loop is its growth engine and apps with friend connections see 20–35% lower churn. Social features free = referral acquisition; coaching stays the paid core. (Gating change — needs explicit owner decision per CLAUDE.md; flagged as the highest-leverage free-tier question.)

3. **Add an annual-only "lifetime-adjacent" answer to subscription fatigue.**
   Lifetime demand recurs in every pricing thread (Hevy $74.99, Strong $99.99 cited as "best value"). A true lifetime SKU has LTV risk for a coaching app with ongoing server costs; alternatives with similar psychological effect: a 2-year plan, or a loyalty price-lock pledge ("your price never rises while subscribed"). Whoop's saga shows pricing *promises kept* are themselves a retention asset.

4. **Publish a "fairness charter" on the paywall: nothing free ever moves behind Pro; your data is always exportable; cancel keeps your history readable.**
   Directly weaponises the category's two biggest hate-points (MFP retro-paywalls, Whoop data hostage). Volyume's offline-first/local-truth architecture makes this nearly free to honour and unique to claim. Pair with EU-residency/no-PII messaging for the UK market.

5. **Make Precision Coaching adjustments visibly "alive" in the weekly check-in.**
   Fitbod's churn driver is perceived staleness; MacroFactor's retention driver is users *seeing* the algorithm respond ("its TDEE estimation algorithm is very accurate"). Surface what changed and why each week ("we lowered your target 80 kcal because…") — deterministic explainability is Volyume's differentiator vs the AI-washed competitors and the strongest cancel-prevention lever (38% of churn is motivation loss; visible progress feedback counters it).

6. **Tune the differential paywall to Hevy-style "habit-formed" trigger points, not feature-tap points.**
   Hevy converts by capping at routine #5 and history month #4 — after investment. Volyume's detector should weight signals of formed habit (e.g. 3+ weeks of logging, repeated PB views) over first-touch Pro-feature taps; contextual prompts at habit moments convert without the resentment hard interstitials cause (hard paywalls: 70% higher refund rates).

7. **Build a January "resolutioner" retention play.**
   40–60% of January cohorts cancel by February. The 21-day trial started 1 Jan ends ~21 Jan — exactly the motivation dip. Consider a January-specific check-in cadence, streak protection, or trial-extension offer at the 3-week mark.

8. **Lean into annual at the paywall.**
   Yearly plans retain best (monthly retention ~17% category-wide) and £29.99/yr is the set's best coaching value. Present annual as the default selection with the monthly comparison visible ("£2.50/mo vs £4.99/mo") — standard practice across all top performers, and honest because the saving is real.

9. **Pre-empt MFP refugees.**
   MFP's May 2026 scan-a-meal/recipe-import paywalling is producing a fresh wave of switchers (the Cronometer/MacroFactor pattern). UK-targeted store-listing and content positioning — "barcode scanning, macros and coaching for £29.99/yr, half MFP Premium's price" — captures motivated, already-paying users at their moment of betrayal.

10. **Hold the line on price integrity.**
    Hevy never discounts lifetime; Whoop and Peloton show that price-structure surprises are the category's reputational kill-switch. Any future price change should grandfather existing subscribers loudly. (No change proposed now; £4.99/£29.99 is competitively sound.)

---

## 7. Source list (primary)

- Hevy: [hevy.com/pricing](https://hevy.com/pricing) · [Push/Pull free-tier analysis](https://push-pull.app/blog/push-pull-vs-hevy) · [PRPath review](https://prpath.app/blog/hevy-app-review-2026.html) · [RepReturn](https://repreturn.com/hevy-app-review/) · [HotelGyms](https://www.hotelgyms.com/blog/hevy-workout-app-review-the-up-and-comer-taking-the-fitness-world-by-storm) · [Hevy 50% annual offer help article](https://help.hevyapp.com/hc/en-us/articles/38223834432279)
- Strong: [Strong PRO help article](https://help.strongapp.io/article/132-strong-pro) · [Push/Pull Strong limits](https://push-pull.app/blog/push-pull-vs-strong) · [YourAppLand Strong vs Hevy](https://yourappland.com/strong-vs-hevy-which-workout-app-is-better/) · [PRPath Strong review](https://www.prpath.app/blog/strong-app-review-2026.html)
- MacroFactor: [NutriScan cost guide](https://nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b) · [Nutrola pricing review](https://nutrola.app/en/blog/why-is-macrofactor-so-expensive) · [UK review (home-cooks.co.uk)](https://home-cooks.co.uk/pages/review-macrofactor) · [Outlift review](https://outlift.com/macrofactor-review/)
- MyFitnessPal: [The Nutrition Magazine paywall explainer](https://thenutritionmagazine.com/articles/myfitnesspal-paywall-changes-explained/) · [XDA](https://www.xda-developers.com/myfitnesspals-barcode-scanner-behind-a-paywall/) · [Punished Backlog](https://punishedbacklog.com/hey-myfitnesspal-were-not-paying-for-a-damn-barcode-scanner/) · [MFP community threads](https://community.myfitnesspal.com/en/discussion/10903889/scan-barcode-only-for-premium) · [BBB complaints](https://www.bbb.org/us/ca/san-francisco/profile/online-shopping/myfitnesspal-1116-539525/complaints) · [FitBudd pricing](https://www.fitbudd.com/post/myfitnesspal-app-cost) · [Prunely UK pricing](https://prunely.app/subscriptions/myfitnesspal)
- Whoop: [TechRadar upgrade backlash](https://www.techradar.com/health-fitness/fitness-trackers/whoop-has-broken-a-promise-on-free-hardware-upgrades-and-users-arent-pleased) · [Whoop upgrade policy](https://www.whoop.com/us/en/thelocker/clarifying-and-updating-our-upgrade-policy/) · [TrackerVS pricing](https://trackervs.com/pricing/whoop-pricing/) · [Livity alternatives/sentiment](https://livity-app.com/en/blog/best-whoop-alternatives) · [MyHRV review](https://www.myhrv.com/posts/is-whoop-worth-it) · [Whoop GB shop](https://shop.whoop.com/gb/en/)
- Fitbod: [Fitness Drum review](https://fitnessdrum.com/fitbod-review/) · [HotelGyms](https://www.hotelgyms.com/blog/review-of-fitbod-how-to-take-your-fitness-with-you) · [Fittest Travel](https://www.fittesttravel.com/blog/2019/10/3/fitbod-app-review)
- RP Hypertrophy: [RP Strength](https://rpstrength.com/pages/hypertrophy-app) · [Dr Muscle review](https://dr-muscle.com/rp-hypertrophy-app-review/) · [Alibaba Wellness review/pricing](https://wellness.alibaba.com/fitlife/rp-hypertrophy-app-review-pricing-guide)
- Boostcamp: [boostcamp.app](https://www.boostcamp.app/) · [Google Play](https://play.google.com/store/apps/details?id=com.bpmhealth.boostcamp) · [Fitt Insider](https://insider.fitt.co/press-release/boostcamp-launches-web-program-creator-the-easiest-way-to-make-free-workout-plans/)
- Caliber: [BarBend review](https://barbend.com/caliber-fitness-app-review/) · [Fitness Drum](https://fitnessdrum.com/caliber-app-review/) · [Cora review](https://www.corahealth.app/compare/caliber) · [Trustpilot](https://www.trustpilot.com/review/caliberstrong.com)
- Peloton: [Fast Company "total disaster"](https://www.fastcompany.com/91005914/peleton-app-update-total-disaster) · [Pelobuddy tiers](https://www.pelobuddy.com/app-tiers-launch/) · [TechCrunch](https://techcrunch.com/2023/05/23/peloton-relaunches-workout-app-free-pricer-tiers/) · [Retail Dive price rises](https://www.retaildive.com/news/peloton-raises-membership-pricing-holidays/761567/)
- Cronometer: [NutriScan pricing](https://nutriscan.app/blog/posts/cronometer-pricing-2026-basic-vs-gold-vs-pro-b28e621201) · [Garage Gym Reviews](https://www.garagegymreviews.com/cronometer-review) · [Nutrola free-vs-Gold](https://nutrola.app/en/blog/is-cronometer-free-2026)
- Alpha Progression: [Fitness Drum review](https://fitnessdrum.com/alpha-progression-app-review/) · [alphaprogression.com](https://alphaprogression.com/en) · [HotelGyms](https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany)
- Industry data: [Airbridge hard vs soft paywalls](https://www.airbridge.io/en/blog/hard-vs-soft-paywalls) · [RevenueCat State of Subscription Apps](https://www.revenuecat.com/state-of-subscription-apps/) · [RevenueCat churn reasons](https://www.revenuecat.com/blog/growth/subscription-app-churn-reasons-how-to-fix/) · [RetentionCheck fitness churn](https://retentioncheck.com/churn-benchmarks/fitness-apps) · [Digital Yield Group resolutioner churn](https://digitalyieldgroup.com/blog/health-fitness-apps-the-resolutioner-churn-problem/) · [SaaStr RevenueCat learnings](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth/) · [Encharge trial conversion](https://encharge.io/saas-free-trial-conversion-rates/) · [Adapty freemium conversion](https://adapty.io/blog/freemium-to-premium-conversion-techniques/) · [DEV fitness paywall UX](https://dev.to/paywallpro/top-fitness-app-paywalls-ux-patterns-pricing-insights-2868)
