# Competitive Audit 01 — Subscription, Paywall & Monetisation Research

> Agent 9 of 14, 2026-06-10. Area: subscription, paywall and monetisation.
> Measured against `competitive-audit-00-volyume-baseline.md` section 3.8.
> All prices as reported by cited sources at time of research; store prices
> vary by region and date. Research only — no code was modified.

---

## 1. Category benchmarks (RevenueCat, Adapty, Airbridge, Superwall)

### Trial and conversion

| Metric | Figure | Source |
|---|---|---|
| Health & Fitness (H&F) median trial-to-paid | **39.9 %** (top decile 68.3 %) | [RevenueCat State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/) |
| H&F trial-to-paid (Adapty panel) | **35.0 % — highest of any category** | [Adapty H&F benchmarks 2026](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/) |
| H&F first-renewal retention | **30.3 % — lowest of any category** ("users commit fast and churn fast") | [Adapty H&F benchmarks 2026](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/) |
| Share of trials starting on Day 0 | **80–90 %** | [RevenueCat 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/) |
| Long trials (17–32 days) vs short (<4 days) | **42.5 % vs 25.5 % conversion** (~70 % better) | [RevenueCat trial-length analysis](https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app/) |
| Longer vs shorter trials (2025 report cut) | 45.7 % vs 26.8 % | [RevenueCat 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/) |
| Card-required (opt-out) vs cardless (opt-in) trials | ~48.8–50 % vs ~18.2–25 % conversion, **but opt-in attracts 3–4× more signups** | [Softletter / First Page Sage via MemberKitchens](https://www.memberkitchens.com/blog/the-pros-and-cons-of-collecting-credit-cards-upfront-for-free-trials), [Amra & Elma stats](https://www.amraandelma.com/free-trial-conversion-statistics/) |
| Hard paywall vs freemium download-to-paid | **10.7 % vs 2.1 %** (5×), but ~equal retention at 1 year | [NeoAds analysis of Adapty data](https://neoads.substack.com/p/hard-paywalls-convert-less-but-earn) |
| Hard vs soft paywall LTV | Hard paywall **+21 % LTV**, users spend 20–33 % above median; soft paywalls convert ~50 % better at the gate | [Adapty high-performing paywall 2026](https://adapty.io/blog/high-performing-paywall-2026/), [Airbridge](https://www.airbridge.io/en/blog/hard-vs-soft-paywalls) |
| Fitness-specific paywall guidance | "Fitness apps often do better with hard paywalls" given strong organic acquisition + clear value prop | [Airbridge](https://www.airbridge.io/en/blog/hard-vs-soft-paywalls) |

### Pricing and plan mix

| Metric | Figure | Source |
|---|---|---|
| H&F sustained annual price band | **$39.99–44.99/yr** | [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps/) |
| Global median subscription prices | **$12.99/mo, $38.42/yr** ($7.48/wk) | [Adapty 2026](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/) |
| H&F plan mix | **68 % of H&F revenue from annual plans** (RevenueCat); annual dominates at 60.6 % — the only category where it does (Adapty) | [RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps/), [Adapty 2026](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/) |
| Month 1 share of annual cancellations | **35 %** | [RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps/) |
| Reactivation after cancel | Annual **5 %**; monthly subscribers return at **4× the rate** | [RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps/), [9to5Mac summary](https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/) |
| H&F revenue per install | D14 RPI $0.48, D60 $0.66 — ~5× gaming at D60 | [RevenueCat 2026 summary](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/) |

### Churn reasons (fitness)

[RetentionCheck 2026 fitness churn benchmarks](https://retentioncheck.com/churn-benchmarks/fitness-apps):
fitness apps average **9.2 % monthly churn (~68 % annual)**. Stated reasons:
loss of motivation / goal abandonment **38 %**, free alternatives **25 %**,
cost vs gym membership **18 %**, lack of personalisation/progress **12 %**,
technical issues **7 %**. Funnelfox/RevenueCat note the "too expensive"
spike follows engagement drop: "the price didn't change, but the perceived
value did" ([RevenueCat churn reasons](https://www.revenuecat.com/blog/growth/subscription-app-churn-reasons-how-to-fix/),
[Funnelfox](https://blog.funnelfox.com/fix-subscription-cancellation-reasons/)).

### Paywall design evidence

- Trial-inclusive paywalls convert at **64.5 % vs 44.4 %** for visual/text-only
  paywalls; leading with "4.7 stars from 52,000 reviews" before price
  "frequently produces measurable lift"
  ([Airbridge social proof](https://www.airbridge.io/en/blog/social-proof-for-apps)).
- OMENA's scrollable paywall with testimonials, founding story, user photos
  and FAQ **doubled trial starts**; a redesign leading with a 5-star review
  lifted conversion **>20 %** to 3.24 %
  ([RevenueCat paywall redesign case studies](https://www.revenuecat.com/blog/growth/paywall-redesigns-case-studies/)).
- Flo ($9M/month) and YAZIO ($3.3M/month) both place user testimonials with
  star ratings directly on the paywall
  ([Apphud](https://apphud.com/blog/design-high-converting-subscription-app-paywalls)).
- Superwall fitness teardown: condense cluttered tier-comparison tables
  ("analysis paralysis"); benefit-driven CTAs ("Start my plan") beat generic
  "Subscribe"; show the paywall just after the product's "aha" moment;
  tailored paywalls "almost always" beat generic
  ([Superwall best practices](https://superwall.com/blog/superwall-best-practices-winning-paywall-strategies-and-experiments-to/),
  [Superwall teardown lessons](https://superwall.com/blog/4-lessons-learned-from-an-indie-app-paywall-teardown/)).
- Reverse trials (full access then drop to free, no card) are growing; "it
  has paid off for companies like Ladder and Strava that have strong enough
  product/market fit" ([RevenueCat freemium design](https://www.revenuecat.com/blog/growth/freemium-tier-design/)).
  Loss aversion is the mechanism: "once premium becomes part of their
  workflow, removing it feels like taking something away".

---

## 2. Ranked top 10 — best subscription/paywall experience

Ranked on evidence of monetising effectively **without** alienating users:
free-tier fairness, trial design, paywall quality, price fairness, and
review/Reddit sentiment.

### 1. Hevy — goodwill-led freemium, the category gold standard

- Free: unlimited workout logging, full exercise library, routine creation,
  progress charts, social/leaderboards. Limits are capacity caps, not
  feature removals: **4 routines, 7 custom exercises, ~3 months of deep
  history** ([Push/Pull comparison](https://push-pull.app/blog/push-pull-vs-hevy),
  [Hevy pricing](https://hevy.com/pricing)).
- Pro reported around **$2.99–5.99/mo, $23.99–34.99/yr, lifetime ~$74.99**
  (regional/promotional variation) ([RepReturn review](https://repreturn.com/hevy-app-review/),
  [Smart Rabbit price comparison](https://www.smartrabbitfitness.com/blog/en/fitness-ai-apps-price-comparison-fitbod-strong-hevy-2025)).
- Sentiment: "the best free strength tracking app available right now";
  free tier "legitimately good… genuinely everything you need for serious
  training" ([RepReturn](https://repreturn.com/hevy-app-review/)). Hevy is
  the default Reddit recommendation precisely because nobody feels forced
  to pay — and many pay anyway.
- Lesson: cap quantity, never quality. The free tier is the marketing.

### 2. MacroFactor — the honest hard paywall

- **No free tier, ever** — stated publicly. 7-day card-required trial, then
  ~$11.99/mo or ~$71.99/yr (~$5.99/mo effective)
  ([NutriScan pricing](https://nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b),
  [Nutrola](https://nutrola.app/en/blog/why-is-macrofactor-so-expensive)).
- The hard paywall is framed as principle, not greed: no ads, privacy,
  verified food database, "what if nutrition apps didn't try to guilt
  people into losing weight?" ([Stronger by Science philosophy](https://www.strongerbyscience.com/macrofactor-algorithms-philosophy/)).
- Sentiment is exceptional for a paid-only app: "MF is awesome. It's better
  at calorie tracking than any other app on the market, and its TDEE
  estimation algorithm is very accurate" (Reddit user, year-long review,
  via [NutriScan](https://nutriscan.app/blog/posts/is-macrofactor-worth-it-2026-529e4f7d46)).
- Lesson: users forgive a hard paywall when the *reason* for it is argued
  openly and the engine visibly earns its keep. Volyume's adaptive-TDEE
  coaching is the same value proposition MacroFactor charges $72/yr for.

### 3. Cronometer — generous free, paywalled convenience

- Free: unlimited logging, all 82+ micronutrients, verified NCCDB database,
  barcode scanning, custom foods/recipes. Gold ($49.99/yr) sells
  convenience: ad removal, custom charts, recipe URL import, fasting timer
  ([Cronometer subscription types](https://support.cronometer.com/hc/en-us/articles/360028026971-Subscription-Types),
  [Nutrola free-vs-gold](https://nutrola.app/en/blog/is-cronometer-free-2026)).
- "One of the few free tiers anywhere that gives you access to a genuinely
  reliable food database" — deliberate contrast with MyFitnessPal's
  barcode paywall, which it converts into goodwill.
- Lesson: paywall convenience and depth, never correctness.

### 4. AllTrails — cheap annual-only pricing, and a model recovery from a misstep

- Three tiers: free Base (search, reviews, basic navigation), Plus
  **$35.99/yr**, Peak **$79.99/yr** (AI routes, heatmaps)
  ([AllTrails plans](https://support.alltrails.com/hc/en-us/articles/37186483585556-AllTrails-Plans),
  [She Explores review](https://sheexplorestheusa.com/2025/11/alltrails-app-review-free-vs-paid-is-it-worth-it/)).
- May 2025 Peak launch moved Trail Conditions out of Plus → backlash.
  AllTrails publicly admitted "people lost access to functionality they
  cared about", returned Trail Conditions to Plus, made desktop Custom
  Routes free, and **extended every Peak membership by three free months**
  ([AllTrails membership updates Nov 2025](https://support.alltrails.com/hc/en-us/articles/42701770204820-Membership-updates-Nov-2025)).
- Lesson: annual-only at an impulse price works; and if you ever take a
  feature back, rapid, generous reversal contains the damage.

### 5. Alpha Progression — the closest comparator, fair and liked

- Generous free logging tier; Pro unlocks the plan generator and deep
  analytics. **14-day free trial**, ~$9.99/mo / ~$59.99/yr (sources also
  report $12.99/$79.99 — regional drift)
  ([Alpha Progression subscribe page](https://alphaprogression.com/en/subscribe),
  [Fitness Drum review](https://fitnessdrum.com/alpha-progression-app-review/)).
- "Competitive for a feature-rich strength training platform, with generous
  free features and an affordable Pro upgrade"
  ([Compare Workout Apps](https://www.compareworkoutapps.com/reviews/alpha-progression-app-review/)).
  Named "best weightlifting app 2025" by one outlet.
- Lesson: a deterministic plan generator is a proven paywall anchor in
  hypertrophy — exactly Volyume's Pro engine. Note Volyume undercuts it
  on price substantially.

### 6. Strava — huge subscription success, permanent goodwill tax

- 2020: segment leaderboards, route building, training log moved behind the
  paywall. "Moving previously free features behind a paywall generally
  proved harder to swallow than introducing new paid features outright"
  ([BikeRadar](https://www.bikeradar.com/news/strava-leaderboards-routes-subscription),
  [DC Rainmaker](https://www.dcrainmaker.com/2020/05/strava-leaderboard-reduces.html),
  [Gizmodo](https://gizmodo.com/stravas-best-features-will-now-be-subscription-only-1843540292)).
- 2025 UK price rises: monthly +28 % to **£8.99**, annual +14 % to
  **£54.99**; Strava apologised for the comms ("we made a mistake by not
  providing enough information… to our community")
  ([BikeRadar](https://www.bikeradar.com/news/strava-hikes-monthly-subscription-cost-by-more-than-25-per-cent),
  [Strava press](https://press.strava.com/articles/clarifying-subscription-pricing-confusion)).
  Community threads run titled "STRAVA Too Expensive for what it offers"
  ([Strava Community Hub](https://communityhub.strava.com/strava-features-chat-5/strava-too-expensive-for-what-it-offers-564)).
- Yet mechanically excellent: **30-day Subscription Preview with no payment
  information** (a reverse trial), deliberately long because performance
  features need weeks of data; internal activation metric is "use a
  subscription feature within the first 14 days"
  ([Strava support](https://support.strava.com/hc/en-us/articles/39188221577741-Strava-Subscription-Preview),
  [Robbie Baxter interview with Strava CRO](https://robbiebax.medium.com/how-strava-built-a-subscription-business-within-a-social-platform-with-strava-cro-david-lorsch-c3779712a30c)).
- Lesson: the trial machinery to copy; the clawback history to avoid.

### 7. Runna — premium hard paywall, justified by coaching

- ~**$19.99/mo / $119.99/yr**, 7-day trial (sometimes 14 via codes); free
  tier is a token entry point — "really a paid app with a limited free
  entry point" ([Runna pricing](https://www.runna.com/pricing),
  [Running Westward Ho review](https://www.runningwestwardho.co.uk/post/is-runna-free-an-honest-review-from-a-long-time-runner)).
- Accepted because it is framed against a human coach: "way cheaper than
  hiring a personal running coach, but still gives you that guided training
  experience" ([Run With Rachel](https://runwithrachel.co.uk/runna-app-review/)).
  Strava+Runna bundle $149.99/yr (~60 % off combined)
  ([Runna support](https://support.runna.com/en/articles/11626438-strava-runna-subscription-guide)).
- Lesson: anchor coaching subscriptions against human-coach prices, not
  against other apps.

### 8. Fitbod — strong product, weak trial

- **$15.99/mo / $95.99/yr**; trial is **3 logged workouts** then a hard stop
  ([Push/Pull pricing](https://push-pull.app/blog/push-pull-vs-fitbod),
  [Dr Muscle](https://dr-muscle.com/fitbod-cost-free-alternative/)).
- Reviewers consistently flag the trial as too short to prove the value:
  the algorithm "needs 10–15 workouts… the free trial gives you a glimpse
  of the interface without showing you the actual long-term value
  proposition" ([Fitness Drum](https://fitnessdrum.com/fitbod-review/)).
- Lesson: if value compounds with data, the trial must be long enough for
  the compounding to show — direct validation of Volyume's 14 days over 7.

### 9. Peloton App — the freemium failure case

- Tiers: App One $12.99/mo, App+ $24/mo. In 2024 Peloton **closed its free
  tier to new signups** and cut the default trial from 30 to 7 days,
  because the free tier was "cannibalizing" free-trial-to-paid conversion
  ([Peloton Buddy](https://www.pelobuddy.com/free-app-tier-ending/),
  [The Clip Out](https://theclipout.com/changes-to-pelotons-app-options-whats-next-now-that-the-free-tier-app-is-gone/)).
- Lesson: a free tier must be a *funnel*, not a destination. Content apps
  fail at freemium where tool apps (Hevy) succeed, because content is
  consumed while tools accumulate user data and switching costs.

### 10. Strong — the cautionary lifting-app tale

- Free capped at **3 routines** ("good for testing, inadequate for serious
  use"); Pro $4.99/mo or **$99.99 lifetime**
  ([PRPath review](https://www.prpath.app/blog/strong-app-review-2026.html)).
- Moving from a ~$10 one-off to subscription drew lasting App Store rage:
  "WHY does a LOG APP need a subscription!?"; "a shameful display of
  greed"; "used to cost around $10 lifetime, but then the devs added a
  couple features and slapped the ridiculous price tag of $139 on it"
  ([App Store reviews](https://apps.apple.com/ca/app/strong-workout-tracker-gym-log/id464254577)).
  Hevy reviews repeatedly position it as the escape route from Strong.
- Lesson: the lifting-tracker audience is the most subscription-hostile in
  fitness; the gate must visibly be on coaching/intelligence, never on
  logging. (Volyume's free logger is unlimited — keep it that way.)

### Negative exemplars (excluded from the top 10): Whoop and Oura

- **Whoop** (One $199 / Peak $239 / Life $359 per year, hardware included):
  May 2025 "Whoopgate" — charging existing members $49–79 to upgrade to
  5.0 despite a published free-upgrade promise. "Upvote this if you just
  canceled your subscription" drew **2,400 upvotes** on r/whoop; Whoop
  reversed within days, granting free upgrades and refunds to members with
  >12 months remaining
  ([TechCrunch](https://techcrunch.com/2025/05/11/fitness-tracker-whoop-faces-unhappy-customers-over-upgrade-policy/),
  [Bloomberg](https://www.bloomberg.com/news/articles/2025-05-09/whoop-faces-backlash-after-charging-existing-users-upgrade-fee-for-new-models),
  [TechRadar](https://www.techradar.com/health-fitness/fitness-trackers/whoop-has-broken-a-promise-on-free-hardware-upgrades-and-users-arent-pleased)).
- **Oura** ($349 ring + $5.99/mo or $69.99/yr, ring nearly useless without
  it): churn driven by "subscription fatigue, plateaued insights after the
  first year" and no-subscription rivals; a community app ("Cracked Oura")
  exists purely to bypass the fee
  ([NexraGear](https://nexragear.com/oura-ring-subscription-cost-explained/),
  [404 Media](https://www.404media.co/cracked-oura-can-you-use-oura-without-monthly-subscription/),
  [Notebookcheck](https://www.notebookcheck.net/Oura-defends-subscription-paywall-of-the-Oura-Ring-4.1218222.0.html)).
- Shared lesson: subscription anger is about **broken promises and
  perceived hostage-taking**, almost never about the absolute price.

---

## 3. Where Volyume's £4.99 / £29.99 sits

| App | Monthly | Annual | Lifetime |
|---|---|---|---|
| **Volyume Pro** | **£4.99 (~$6.30)** | **£29.99 (~$38)** | — |
| Hevy Pro | ~$2.99–5.99 | ~$23.99–34.99 | ~$74.99 |
| Strong Pro | $4.99 | ($29.99/6mo) | $99.99 |
| Alpha Progression | ~$9.99 | ~$59.99 | — |
| Cronometer Gold | — | $49.99 | — |
| AllTrails Plus | — | $35.99 | — |
| MacroFactor | $11.99 | $71.99 | — |
| Strava | £8.99 | £54.99 | — |
| Fitbod | $15.99 | $95.99 | — |
| Runna | $19.99 | $119.99 | — |
| Category medians | $12.99 (global, Adapty) | $38.42 (Adapty); $39.99–44.99 H&F band (RevenueCat) | — |

- Volyume's **annual price sits exactly on the category median**
  ($38.42 / $39.99–44.99 band) while bundling nutrition + coaching that
  MacroFactor alone sells for ~$72/yr and Alpha Progression's training-only
  product sells for ~$60/yr. The annual SKU is priced correctly, arguably
  under-priced for the feature set.
- The **monthly £4.99 is less than half the global median** $12.99. That
  maximises accessibility but anchors the product cheap; the field's
  pattern (Adapty: annual dominates only in H&F, 60.6 %; RevenueCat: 68 %
  of H&F revenue is annual) supports pushing annual-first presentation
  rather than raising the monthly.
- The ~50 % annual saving matches Strava (~49 %), Runna (~50 %) and Hevy
  (~50–67 %) — within norms.

### Lifetime sentiment

The lifting-tracker niche specifically loves one-off purchases: Strong's
$99.99 lifetime is called "rare… a major advantage"
([PRPath](https://www.prpath.app/blog/strong-app-review-2026.html)); Hevy
sells lifetime at ~$74.99; FitNotes (free + donation) remains a perennial
Reddit recommendation for subscription refusers. A lifetime SKU converts
the most subscription-hostile segment — but is a poor fit for a product
whose value is an ongoing coaching service with server costs (MacroFactor,
Runna and every coaching app avoid it). If ever offered, price it like
Strong/Hevy at ~2.5–3× annual and treat it as a goodwill release valve,
not a revenue line.

---

## 4. Trial models — what works vs what frustrates

1. **Length:** 14 days beats 7 for data-compounding products. RevenueCat:
   17–32-day trials convert at 42.5 % median vs 25.5 % under 4 days;
   Strava runs 30 days because "many of their data features take more than
   a week to appear"; Fitbod's 3-workout trial is its most criticised
   monetisation feature. Volyume's 14-day trial spanning two coach cycles
   is the right shape.
2. **Cardless vs card-required:** card-required converts ~2.5–3× better per
   trial (≈50 % vs ≈18–25 %) but cardless attracts 3–4× more starts and
   none of the "forgot to cancel" resentment that poisons App Store
   reviews. Volyume's hybrid (cardless 14-day in-app, store 7-day intro
   offer with card for lapsed users) captures both modes — genuinely
   unusual and sound.
3. **Reverse trial:** dropping to a useful free tier at day 14 (Volyume's
   cascade) is exactly the Strava/Ladder reverse-trial pattern RevenueCat
   highlights; loss aversion does the selling.
4. **Day 0 is everything:** 80–90 % of trials start on Day 0 and 55 % of
   3-day-trial cancellations happen on Day 0. Granting the trial at the
   consent step is correct; the risk is Volyume's account-before-value
   onboarding (baseline gap 9), which sits upstream of the trial grant.
5. **Renewal cliff:** month 1 contains 35 % of annual cancellations and
   H&F first-renewal retention is 30.3 %; annual cancellers reactivate at
   only 5 %. The first month of a paid annual and the weeks before renewal
   are where value must be re-demonstrated (recap of PRs, coaching changes
   applied, weight trend progress).

---

## 5. Implications for Volyume

### Where Volyume already leads the field

1. **Free tier philosophy is Hevy-grade.** Unlimited logging, plans,
   builder, stats, PRs free; the gate sits on coaching intelligence and
   nutrition. This is the configuration the niche rewards and Strong is
   punished for violating.
2. **Trial design is best-practice.** 14-day cardless + store intro offer +
   reverse-trial cascade matches or beats every audited app; only Strava's
   30-day preview is longer.
3. **Contextual differential paywall is ahead of the market.** Superwall's
   core findings — trigger at the aha moment, tailor to the user, single
   condensed decision — are what Volyume already ships. None of the ten
   apps audited does coach-computed contextual triggers.
4. **Pricing is right-of-centre on value.** Annual at the category median
   for a training+nutrition+coaching bundle; ~50 % saving badge in line
   with norms.
5. **No clawback history.** Strava, AllTrails and Whoop all paid heavily
   for moving value away from existing users. Volyume's "never gate a free
   feature behind Pro" rule is the single most protective policy it has —
   keep it absolute.

### Gaps, ranked by evidence strength

1. **No social proof on the paywall** (baseline confirms none). This is
   the best-evidenced conversion lever found: testimonial-led paywalls
   doubled trial starts (OMENA), +20 % conversion from leading with a
   5-star review, and Flo/YAZIO ship testimonials at $9M/$3.3M monthly
   revenue. A single honest UK user quote + store rating on PaywallScreen
   is low-effort, high-evidence. (Honesty-test compatible: real quotes,
   no manufactured urgency.)
2. **No renewal-moment value reinforcement.** With H&F first-renewal
   retention at 30.3 % and month 1 holding 35 % of annual cancellations,
   a pre-renewal "your year in Volyume" recap (PRs, coach adjustments
   applied, trend progress) is the highest-value retention surface not yet
   built. The Year-of-Lifts machinery already exists but unlocks at 365
   days — too late for the first renewal.
3. **No structured win-back.** Annual reactivation is 5 % category-wide;
   Volyume has the store intro offer but no in-app lapsed-user journey
   (e.g. "your coach found 3 things in last month's logs" with the data
   that free users keep generating).
4. **No cancellation-reason capture.** Churn reasons (38 % motivation,
   25 % free alternatives, 18 % cost) are unmeasurable in Volyume today;
   a one-question exit survey on the Subscription screen would price
   future decisions.
5. **Monthly anchoring.** With the field 60–68 % annual, consider
   annual-first ordering/preselection on the paywall toggle (the saving
   badge already exists). Pure presentation change; no price change.
6. **Lifetime option** — sentiment-positive in this niche but strategically
   wrong for an ongoing coaching service; document the decision rather
   than ship it.

### What to never copy

- Strava 2020 / AllTrails 2025: re-gating shipped features.
- Whoop 2025: breaking a published promise to existing subscribers.
- Fitbod: trials too short to surface compounding value.
- Peloton: a free tier so content-rich it removes the reason to pay —
  Volyume's free tier is tools, not content, so this risk is structurally
  low, but any future free coaching teaser must stay a teaser.

---

*Sources accessed 2026-06-10. RevenueCat/Adapty/Superwall report pages
returned 403 to direct fetch; figures triangulated via their published
blog summaries and secondary coverage (RocketShip HQ, NeoAds, Airbridge,
9to5Mac) — flagged where sources disagreed.*
