# Validation Audit — ext-03 (Mass-Market Nutrition Apps) & ext-06 (Elite Coaching Operations)

**Date:** 2026-06-12
**Method:** Every material competitive claim in the two documents was extracted, numbered, and
checked against live-fetched primary sources (official sites, app-store/help-centre pages,
published studies, vendor pages) using working internet access. Verdicts follow the style of
`docs/COACHING_VOICE_CITATION_AUDIT.md`:

- **VERIFIED** — confirmed against an actually-fetched (or search-indexed official, where the
  origin site blocks fetching — always noted) source; load-bearing claims have 2+ independent
  corroborations.
- **CORRECTED** — substance broadly real but a material detail (price, figure, attribution,
  quotation, scope) is wrong; the correct value is given.
- **UNSUPPORTED** — the claim could not be found in the cited source or anywhere else; the cited
  source was checked and does not contain it.
- **FABRICATED** — contradicted by the primary source, or an invented quotation/figure attached
  to a real page.
- **UNVERIFIABLE** — could not be confirmed or refuted; what was attempted is stated.

Fetch limitations encountered (all noted inline): macrofactor.com, theptdc.com and
help.rpstrength.com sit behind bot-verification walls (search-indexed page text used and
flagged); femestella.com returned an empty page body; the Springer deload PDF was binary
(PMC full text used instead).

---

## 1. Summary of verdicts

| Verdict | ext-03 | ext-06 | Total |
|---|---|---|---|
| VERIFIED | 29 | 10 | **39** |
| CORRECTED | 17 | 10 | **27** |
| UNSUPPORTED | 4 | 6 | **10** |
| FABRICATED | 3 | 2 | **5** |
| UNVERIFIABLE | 4 | 2 | **6** |
| **Total claims checked** | **57** | **30** | **87** |

**Headline:** the documents are roughly 45% cleanly verified. The *direction* of most arguments
survives, but the texture does not: three invented quotations, a fabricated flagship competitor
feature (Carbon carb-cycling), fabricated retention statistics, several prices wrong, several
real studies cited for content they do not contain, and a heavy reliance on a low-credibility
cluster of AI-generated review sites (see §4.3).

**Worst fabrications (most load-bearing first):**

1. **E3-10 — "Carbon's dedicated carb-cycling mode"**. Carbon's own help centre says the
   opposite: *"Unfortunately, we don't have a feature that allows this."* The competitive frame
   ("Carbon owns carb-cycling; Volyume must catch up") was backwards — this actually
   *strengthens* Volyume's TD/NTD differentiation.
2. **E6-21 — coaching retention tiers (50–65% / 65–80% / 80–90%+)** attributed to Everfit. The
   fetched article contains none of these; it says 75–80% standard, 90% aspirational.
3. **E6-29 — WAG's "progressive disclosure" schedule** (measurements at 4 weeks, advanced
   biofeedback at 8 weeks). No trace on WAG's own pages or anywhere else. This was a key
   evidence plank for the progressive-disclosure design pattern.
4. **E3-03 — the Hoot Fitness quotation** ("The settings screens, the weekly weigh-in cadence,
   the coaching card stack… ten seconds per meal") — invented; the real page says only
   "a steeper learning curve for casual users".
5. **E3-39 — the Cronometer quotation** ("opening the app to 82+ nutrient targets…") — invented;
   the real review says "dense and can feel clinical or overwhelming to new users".

---

## 2. Per-claim audit — ext-03 (mass-market nutrition apps)

### MacroFactor

**E3-01 — Adherence-neutral design is real, with a stated functional (not just ethical) rationale. — VERIFIED**
The official page "What Do We Mean When We Call MacroFactor 'Adherence Neutral'?" exists at
https://macrofactorapp.com/adherence-neutral/ (origin blocks direct fetch — bot wall; page text
retrieved via search index) and states verbatim: *"Avoiding shame-based messaging and visual
elements comes with a functional benefit: it makes people more likely to actually log everything
they eat."* Corroborated by a fully fetched official help article
(https://help.macrofactorapp.com/en/articles/140-do-i-need-to-log-everything-i-eat-and-drink-to-have-an-accurate-expenditure-and-use-macrofactor-s-coaching-features)
confirming the algorithm works from actual logged intake. The doc's core argument (non-shaming
design protects the TDEE algorithm's inputs) is genuinely MacroFactor's own published position.

**E3-02 — The exact quotation as printed in ext-03. — CORRECTED**
The first sentence is verbatim. The second half ("updated recommendations are based on actual
energy intake and changes in weight, not how well you stuck to recommendations") was not found
verbatim; the page's actual wording is that MacroFactor "will make appropriate adjustments…
based on what you log, regardless of how close you came to hitting your targets". The quote is a
splice of a real sentence plus a paraphrase presented as one quotation.

**E3-03 — Hoot Fitness 2026 quote about settings screens/coaching card stack/expenditure graphs. — FABRICATED**
Fetched https://www.hootfitness.com/blog/9-best-macrofactor-alternatives-for-smarter-simpler-nutrition-tracking —
the quotation does not appear. The page's actual criticism: "a steeper learning curve for casual
users", logging that can feel "tedious".

**E3-04 — Beginner-complexity complaints are "documented across multiple 2026 review aggregations". — CORRECTED**
The substance (MacroFactor has a learning-curve problem for casual users) is supported by the
fetched Hoot Fitness page and is consistent with long-standing review sentiment. But the
"multiple 2026 review aggregations" are mostly the AI-content cluster (§4.3), and the strongest
phrasing was invented (E3-03). Treat the complaint as real but mild-to-moderate, not as
heavily documented as the doc implies.

**E3-05 — No functional free tier; $11.99/mo, $71.99/yr; 7-day trial. — VERIFIED**
macrofactor.com blocks fetching, but pricing is consistent across multiple independent sources
fetched/indexed June 2026: $11.99 monthly / $71.99 yearly / 7-day free trial / publicly stated
"never a free tier" (e.g. https://macrofactor.com/workouts/price/ indexed;
https://nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b;
https://fonzi.ai/blog/macrofactor-review). Note ext-03's claim that the conversion funnel
depends entirely on the trial follows logically and stands.

**E3-06 — "RevenueCat 2026: trials improve first-renewal retention by 8–60% in H&F." — CORRECTED**
Real figure, wrong scope. Fetched https://adapty.io/blog/health-fitness-app-subscription-benchmarks/:
*"Trial users across all categories retain 8–60% better at first renewal than non-trial users"* —
across all categories, not an H&F-specific figure (though the article notes trials boost H&F
LTV specifically).

### Carbon Diet Coach

**E3-07 — "Carbon raised to $14.99/month… in 2026." — CORRECTED**
Fetched the official pricing page https://www.joincarbon.com/pricing: **$11.99/mo**, $59.99/6mo,
$99.99/yr. No $14.99 anywhere. (A price rise did happen — late-2025 sources list $9.99/mo /
$79.99/yr — but to $11.99, not $14.99.)

**E3-08 — Carbon $99.99/year. — VERIFIED** (same fetched official page).

**E3-09 — Carbon's compliance-first adaptive-coaching philosophy. — VERIFIED**
Fetched https://www.joincarbon.com/: "Our science-based coaching system analyzes your weekly
progress and refines your nutrition targets", weekly check-ins, four goal modes including
reverse dieting, "Carbon is a coach, not just a food tracker". The MacroFactor-vs-Carbon
autonomy contrast in ext-03 is a fair interpretation of the two products' published positions.

**E3-10 — "Carb-cycling and time-of-day tracking are specialty features no other mass-market app matches… Carbon's dedicated carb-cycling mode." — FABRICATED**
Fetched Carbon's own help centre, https://help.joincarbon.com/en/articles/6044411-how-do-i-carb-cycle:
*"Unfortunately, we don't have a feature that allows this"*, with the rationale that carb/fat
fluctuations cause fluid shifts; it offers only a Calorie Planner (calorie cycling at a fixed
carb:fat ratio). No time-of-day tracking is mentioned anywhere in Carbon's marketing or help
pages. This was a load-bearing claim about Volyume's nearest philosophical competitor and it is
the reverse of reality.

**E3-11 — Carbon positioned against human-coaching economics. — VERIFIED**
Fetched homepage: "a nutrition coach but at a fraction of the cost of ordinary coaches."
(ext-03's specific "$100/month" wording is a paraphrase, not a Carbon quote.)

**E3-12 — Stronger U closure 31 March 2026. — VERIFIED**
Fetched official page https://strongeru.com/end-of-services/: "Stronger U Nutrition will no
longer provide services as of March 31st, 2026."

### Noom

**E3-13 — CBT/ACT/DBT-derived daily psychology lessons, ~10 min/day. — VERIFIED**
Noom's own materials describe "bite-sized lessons, ranging from 5–10 minutes long… served up to
members daily", drawing on CBT, ACT, DBT and MBSR
(https://www.noom.com/health/resources/blog/unlocking-lasting-change-how-nooms-4-cs-drive-better-engagement-and-outcomes/,
search-indexed; corroborated by the fetched dietitian review below).

**E3-14 — Three-colour food system (green/yellow/orange, formerly red). — VERIFIED**
Fetched https://abbylangernutrition.com/noom-review-is-this-app-legit-for-losing-weight/
(updated Dec 2024): "Noom still categorizes foods into Green, Yellow, and Orange (previously
red) categories based on their caloric density", with documented user guilt/"green-only"
behaviour — also supporting ext-03's "implicitly shaming" point.

**E3-15 — Coaches manage 300–400 users each. — VERIFIED**
Fetched https://sacra.com/c/noom/ ("AI to enable their human 'coaches'… to manage 300-400 users
each") and the fetched Business Insider piece (Yahoo syndication,
https://www.yahoo.com/news/noom-sells-psychology-driven-weight-213057554.html): 300–400,
scaling to 600+ at peak, "less than five minutes" daily per client.

**E3-16 — Programme typically 16–52 weeks, content front-loaded. — UNVERIFIABLE**
Standard plan documented at ~4 months with longer options; the precise 16–52-week range and the
front-loading/fading claim were not found in any fetched source. Plausible, not confirmed.

**E3-17 — Noom Weight ~$17.42/month on the 12-month plan. — VERIFIED**
Fetched Sacra: "$70 [monthly]… the annual plan costing $209 (about $17.42 per month)."

**E3-18 — GLP-1 tier from $149 + $299/month ongoing. — VERIFIED**
Noom's official Med pricing page (https://www.noom.com/med/pricing/, search-indexed) lists $149
for the initial subscription period then $299/month for the full-dose compounded GLP-1
programme (pricing effective 31 March 2026); corroborated by U.S. News
(https://health.usnews.com/best-diet/medication/noom). Note the cheaper microdose ($79–119
start) and brand-med tiers also exist — ext-03's single figure is the full-dose tier.

**E3-19 — GLP-1 hit $100M run-rate within four months of Sept 2024 launch. — VERIFIED**
Fetched Sacra: "In February 2025, Noom disclosed that its GLP-1 Rx and pill-based generic
medication programs together grew to a $100M revenue run-rate within four months of launching
in September 2024."

**E3-20 — 1,200 kcal default "most women receive regardless of stats"; dietitians call it unsafe. — CORRECTED**
The criticism is real and well documented (fetched Abby Langer review: "a 1200 calorie budget
seems like the level that's most often given by Noom to participants, regardless of their
desired weight loss 'speed'"; Business Insider-derived reporting: a dietitian who contacted
hundreds of users found all but three were assigned 1,200 kcal, including breastfeeding women).
**Material omission:** Noom subsequently raised its minimums ~10% to 1,310 kcal (women) /
1,540 kcal (men) — the doc presents the criticism as fully current without this change.
Volyume's floors (1,200/1,500) remain comparable to Noom's *revised* floors, which slightly
weakens the "structurally safer by a significant margin" framing on floors alone (the rest of
the safety-system comparison — screening, signposting, rapid-loss lockout — stands).

**E3-21 — "One study found 73% of MFP users with eating disorders said the app 'at least somewhat contributed'." — CORRECTED (real study identified)**
The actual study, which ext-03 never names: **Levinson CA, Fewell L, Brosof LC (2017), "My
Fitness Pal calorie tracker usage in the eating disorders", *Eating Behaviors* 27:14–16.**
Fetched full text at https://pmc.ncbi.nlm.nih.gov/articles/PMC5700836/: n=105 individuals
recently discharged from residential/partial-hospitalisation ED treatment; 74.3% had used MFP;
**73.1% of those users** reported it at least somewhat contributed to their eating disorder
(62.9% at least moderately; 30.3% very much). Corrections: (1) it is a 2017 study of an
ED-clinical population, not of general "MFP users with eating disorders" at large; (2) the
extension to Noom ("similar structural risk") is the doc's inference, not the study's finding.

**E3-22 — "No eating disorder screening at intake." — CORRECTED**
Fetched Business Insider piece: Noom *does* ask about EDs during signup, but answering "yes"
does not prevent enrolment — users can change their answer and continue, and the internal
STING review process could be walked back. So: screening exists but is ineffective/bypassable,
which is a different (and more defensible) claim.

**E3-23 — "Former coaches revealed 95% of responses are copy-pasted." — CORRECTED**
This traces to one former coach quoted in the Femestella investigation (search-indexed; direct
fetch returned an empty page body) describing keyword-triggered paste-from-spreadsheet replies.
The fetched Business Insider article corroborates generic, templated coaching at scale but does
not give the 95% figure. Treat as a single-source former-employee estimate, not an established
statistic.

**E3-24 — Femestella investigation documents Noom-specific ED harm. — VERIFIED**
Article exists: "The Dangers of Noom: How the App is Targeting People With Eating Disorders"
(https://www.femestella.com/noom-reviews-horror-stories-eating-disorders/ — title and content
confirmed via two independent search retrievals; direct fetch returned a blank body).
Independently corroborated by the fetched BI investigation (coaches unprepared for EDs,
"crowdsourced therapy").

**E3-25 — GLP-1 pivot as strategic retreat from pure behaviour coaching. — VERIFIED (facts) / fair interpretation**
The underlying facts (Noom Med two-track GLP-1 push, $100M run-rate, microdose programme
launch) are verified via fetched Sacra and Noom's own press releases
(https://www.noom.com/in-the-news/noom-launches-microdose-glp-1-program-enabling-weight-loss-without-the-side-effects-and-priced-at-119-to-start-including-medication-and-microhabits-program/).
"Behaviour change is becoming the upsell" is interpretation, reasonably grounded.

### Simple / Zoe / Welling

**E3-26 — Simple: IF + logging + AI coach "Avo"; 20M+ downloads, 800k+ active subscribers, 4.7★. — VERIFIED (vendor-published figures)**
Figures appear in Simple's own 2025–26 press materials and coverage
(https://www.prweb.com/releases/simple-launches-expands-on-its-anti-discipline-ai-coach-with-voice-calls-302652009.html;
https://www.sciencetimes.com/articles/60584/20250910/avo-ai-coach-behind-55m-chats-driving-weight-loss.htm —
fetched, confirms Avo's positioning and 55M+ chats). The 20M/800k/4.7 figures are
vendor-claimed, not independently audited — adequate for competitive context.

**E3-27 — Zoe 2.0 feature set. — VERIFIED, with timing corrections (see next)**
Fetched https://zoe.com/learn/zoe-2-0-science-made-simple (updated March 2026): CGM and
blood-fat tests removed; gut microbiome test now an **optional add-on**; AI "Photologging";
"Ziggie" in-app AI nutrition coach; Processed Food Risk scale (five categories); meal scores
0–100; gut microbiome score now out of 1,000. All as described in ext-03.

**E3-28 — "£9.99/month app-only tier" introduced with the Sept 2025 relaunch. — CORRECTED**
The £9.99/month no-test membership is real but was introduced around the turn of 2024/25 (The
Grocer: "Zoe unveils 60% cheaper membership ahead of Christmas",
https://www.thegrocer.co.uk/news/zoe-unveils-60-cheaper-membership-ahead-of-christmas/699151.article),
i.e. it predates the September 2025 "Zoe 2.0" overhaul (The Grocer:
https://www.thegrocer.co.uk/news/zoe-gut-health-app-losses-swell-as-it-slashes-membership-price/718306.article).
Gut test ≈ £149 upfront when added.

**E3-29 — Welling exists: photo + voice + text logging, beginner-focused, 7-day trial. — VERIFIED**
Fetched https://www.welling.ai/ (live product, iOS + Android, "describe your meal or upload a
photo", 2M+ food logs, 4.8 App Store) and the independent review at
https://feastgood.com/welling-app-review/ (fetched: three logging modes, recommended for
"beginners who want feedback, meal suggestions"; pricing $19.99/mo / $119.99/yr, 7-day trial).

**E3-30 — Welling's 2.6s / 95.6% / ±1.2% / 15,000-meal figures. — CORRECTED**
These are **Welling's own benchmark numbers** (an April 2026 vendor-affiliated "benchmark
study"), not independent measurements — and the vendor's currently circulated figures have
since changed (fetched https://www.fitness-tracking.com/reviews/welling/, updated May 2026:
"Welling **reports** 96.8% food-identification accuracy across 18,400 test meals, with a ±0.9%
portion-estimation error", 2.2s). The genuinely independent FeastGood review (fetched) says
"Welling isn't always accurate here, and you might need to do some manual edits." ext-03 did
hedge with "claims", but it presented the numbers as stable, single-source-of-truth figures;
they are moving marketing numbers. The doc's own counter-argument (real-world accuracy will be
worse) is sound.

**E3-31 — Android launch in early 2026. — VERIFIED**
Welling's Android launch announcement exists (https://www.welling.ai/articles/welling-android-app-launch)
and the app is live on Google Play; exact launch date not pinned but consistent with early
2026 (the iOS-only FeastGood review predates it).

**E3-32 — Positioned as "ChatGPT for weight loss". — UNSUPPORTED**
Phrase not found in any fetched source. Closest: a reviewer noting the UI "looks more like
ChatGPT than a calorie tracking app" (fetched welling.ai review article). The doc presents an
interface observation as market positioning.

**E3-33 — "Named top pick in multiple independent 2026 roundups for beginners." — CORRECTED**
Welling is indeed named a top pick in several 2026 roundups — but the "independent" sources are
largely the AI-content cluster (§4.3) plus Welling's own articles. Genuine independent coverage
(FeastGood) is positive but more measured. The threat assessment direction (frictionless AI
logging is the beginner-acquisition battleground) survives on verified evidence (Welling, Cal
AI, and now MyFitnessPal's June 2026 AI Coach — §4.1).

### RP Diet Coach / Avatar / Lifesum / Cronometer / Lose It / Yazio / FatSecret / Nutracheck

**E3-34 — RP v1.52 (2 April 2026): redistribute macros to populated meals; "Still planning" meal state. — VERIFIED**
Official changelog "Diet app update: v1.52 (April 2, 2026)" exists at
https://help.rpstrength.com/hc/en-us/articles/39482632639639-Diet-app-update-v1-52-April-2-2026
(origin 403s direct fetch; full page text retrieved via search index): redistribute-to-populated-
meals with "Adjust foods" badge, and "mark a meal as 'Still planning' so the Day Status uses the
target macros instead of food macros". Matches ext-03 precisely.

**E3-35 — Redesign drivers: simplified UI for new users, preparation for AI food logging, industry standardisation. — VERIFIED**
Fetched https://rpstrength.com/blogs/podcasts/we-changed-the-rp-diet-coach-app-heres-why
(Sept 2025): all three drivers explicit, including "A system that tracks all macros from the
start provides a cleaner and more effective foundation for training these complex AI models."

**E3-36 — v1.5 "called it 'now the fastest logger in the West' in their own blog". — CORRECTED**
The phrase is real but belongs to the **v1.53** update article ("Diet Coach app update: Now the
fastest logger in the West", https://rpstrength.com/blogs/articles/diet-coach-app-update-now-the-fastest-logger-in-the-west).
The v1.5 post (fetched, https://rpstrength.com/blogs/articles/rp-diet-coach-app-update-1-5)
does not contain it. Substance (RP knows logging speed was a drop-off point) stands.

**E3-37 — RP's training-aware meal timing is "unique in the category". — UNVERIFIABLE**
RP's pre/post-workout meal prescription is real and core to the product (official pages), but
the absolute "no other consumer app" claim cannot be proven; it is at least *rare*.

**E3-38 — Avatar Nutrition "$14.99/month or $99/year as of 2026". — CORRECTED**
Fetched https://www.avatarnutrition.com/: **$9.99/month with a 14-day free trial**; no annual
price advertised. Reverse dieting confirmed as a core advertised feature.

**E3-39 — Avatar "High/Low day carb cycling with adjustable macro sliders". — UNSUPPORTED**
Not found on the fetched homepage or the fetched
https://www.avatarnutrition.com/how-it-works/adaptive-nutrition (which describes weekly
check-in-driven macro adjustments and accept/reject of adjustments — no High/Low days, no
sliders). May describe a legacy feature, but as a 2026 competitive claim it is unsupported.

**E3-40 — Lifesum AI-pivot regression (Marlvel sentiment, Trustpilot complaints). — VERIFIED (weak source, says what's claimed)**
The Marlvel intel report exists (https://marlvel.ai/intel-report/health-fitness/com-sillens-ishape,
May 2026) and does say forced AI features and instability are eroding the base ("manual-entry
parity" needed to prevent churn). Caveat: Marlvel is itself an AI-generated intel product; treat
as sentiment-indicative, not authoritative. The directional lesson (AI additions that break
manual flows lose users) is reasonable.

**E3-41 — Cronometer: beginner-hostile; the "82+ nutrient targets… a lot to process" quote. — FABRICATED (quote)**
Fetched https://calorie-trackers.com/reviews/cronometer/: quote absent. The review does say the
interface "is dense and can feel clinical or overwhelming to new users" and confirms 84 tracked
nutrients — so the substance is directionally right, the quotation is invented (and the source
is in the AI-content cluster anyway).

**E3-42 — Lose It moved barcode scanning behind Premium for new accounts in 2026. — VERIFIED (with caveat)**
Two 2026 sources confirm the barcode scanner is now Premium-gated for new accounts with
grandfathering for some older free users (https://nutriscan.app/blog/posts/lose-it-pricing-2026-free-vs-premium-2b4e921555;
https://www.fitbudd.com/post/lose-it-premium-review). Caveat: both are secondary; Lose It's own
comms were not located. The "MFP 2022 repeat" framing is fair.

**E3-43 — The "148-upvote Reddit thread" and the quoted Google Play review. — UNVERIFIABLE**
Specific posts not located; vote counts unverifiable. Decorative specificity — exactly the
pattern flagged in the provenance notice.

**E3-44 — Yazio ~€/£47.90/yr Pro; meal plans/recipes as the beginner draw. — VERIFIED**
Yazio's own international pricing sheet lists ~€47.99/yr territory pricing
(https://filecontent.yazio.com/press/international_pricing_awin.pdf); Pro includes expert
recipes, meal plans, grocery lists (https://nutriscan.app/blog/posts/yazio-pricing-2026-free-vs-pro-what-pro-unlocks-33b26f8fc7;
help.yazio.com). "No offline mode" was not re-tested (UNVERIFIABLE sub-claim).

**E3-45 — FatSecret genuinely free (core features, no trial expiry). — VERIFIED**
Consistent across all sources fetched/indexed; FatSecret remains the only major fully free
tracker.

**E3-46 — FatSecret "±8.4% average calorie deviation… highest error margin tested". — CORRECTED**
The figure exists only in calorie-trackers.com's own unaudited "test meal protocol"
(https://calorie-trackers.com/reviews/fatsecret/) — an AI-content-cluster site whose
methodology is unpublished. Do not treat as a lab-grade benchmark; treat as "one review site's
claim".

**E3-47 — Nutracheck £29.99/yr, ~4.9–5★ Trustpilot, UK database moat. — VERIFIED**
£29.99/yr (~£2.50/month) per UK reviews (https://home-cooks.co.uk/pages/review-nutracheck);
Trustpilot shows a 5-star aggregate from 8,000+ reviews (https://uk.trustpilot.com/review/www.nutracheck.co.uk).

### Monetisation benchmarks (§3 of ext-03)

**E3-48 — Trial-to-paid 35.0%, highest of any category (H&F). — VERIFIED**
2026 benchmark data: "Health & Fitness apps convert trials to paid at 35.0%, while the global
average is 25.6%… Health & Fitness leads trial-to-paid at 35.0%"
(https://www.businessofapps.com/data/app-subscription-trial-benchmarks/, corroborated by
https://adapty.io/state-of-in-app-subscriptions/). Note Adapty also reports 42.2% for
weekly-with-trial H&F specifically — the 35.0% is the category aggregate.

**E3-49 — Install LTV $1.21, highest of any category. — VERIFIED**
Fetched Adapty H&F benchmarks: "Health & Fitness has the highest install LTV of any app
category — $1.21 per install globally."

**E3-50 — Day-380 retention 19.9% annual / 14.2% monthly / 5.5% weekly. — CORRECTED (attribution)**
Figures are real and exact — fetched https://www.airbridge.io/en/blog/weekly-vs-annual-subscription-app:
"Only 5.5% of weekly trial-starting subscribers are still active at Day 380. Annual trial
subscribers retain at 19.9%… monthly at 14.2%." But the source is **Adapty State of In-App
Subscriptions 2026 (trial-starting cohorts)**, not RevenueCat as ext-03's table header implies.

**E3-51 — First-renewal retention 30.3%, "lowest in H&F despite high conversion". — UNSUPPORTED**
Not found anywhere. RevenueCat's own 2026 renewal-rates article (fetched,
https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category/)
gives H&F first-renewal medians of **54% weekly / 57% monthly / 25% annual** and describes H&F
as "quietly consistent across all three plan types" — not lowest. The 30.3% figure appears to
be confected. Any Volyume planning that used "30.3% first-renewal" should switch to the real
plan-type medians.

**E3-52 — Annual plan revenue share 60.6% (H&F), only category where annual dominates/gains. — CORRECTED**
Fetched Adapty: annual share grew from 51% (2023) to **61% (2025)**; H&F is "the only App Store
category where annual continues to gain share". 60.6% ≈ right; cite 61%/Adapty.

**E3-53 — Conversion happens Day 0 or Days 4–7; mid-trial nudges near-zero ROI. — VERIFIED**
Fetched Adapty: "Users either convert on Day 0 or between Days 4–7. There's almost nothing in
between." (Detail: 86.1% of H&F trial conversions land on Day 0; the near-zero-ROI window is
Days 1–3.)

**E3-54 — Long trials (17–32 days) convert 42.5% vs 25.5% for <4-day; ~70% better. — VERIFIED**
Fetched https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/ —
exact figures confirmed. The "do not shorten the 14-day trial" inference is sound.

**E3-55 — "Hard paywall Day 35 conversion 5× better than soft." — CORRECTED**
Fetched RevenueCat 2026 summary: hard paywalls convert 10.7% at Day 35 vs **2.1% for freemium**
(and $3.09 vs $0.38 revenue-per-install at day 60). The comparison is hard paywall vs
*freemium*, not vs "soft paywall". This materially affects how the "Today's plate" teaser should
be read — see Delta verdict (c).

**E3-56 — Cal AI / Superwall: success-moment paywalls convert "30%+ better than time-based triggers". — CORRECTED**
Fetched https://superwall.com/case-studies/cal-ai: real case study, but the +31% is the
**relative improvement in trial-to-paid over 12 months from a whole experimentation programme**
(46 trigger points, 123 A/B experiments, 424 variants) — not a measured comparison of
success-moment vs time-based triggers. The mechanism ext-03 cites was invented around a real
number.

**E3-57 — JPSP 2024 identity-framing study (used in §2.4 and TI-07). — UNSUPPORTED**
No 2024 *Journal of Personality and Social Psychology* paper matching the description could be
found (searched JPSP 2024 + identity/habit framing). The circulating "32% better adherence"
version is uncited blog lore. Real adjacent literature exists — Wood 2024 (*Current Directions
in Psychological Science*, habits/goals review), Bauer 2024 (*Social and Personality Psychology
Compass*, identity-reframing interventions), and the habit–identity association literature
(PMC6635880) — but none is the cited study. Same fabrication pattern as "Cronin 2022" in the
coaching-voice audit. Identity-framing copy (TI-07) may still be sensible, but it currently has
no verified quantitative evidence behind it.

**E3-58 — Streak psychology sourcing (nuancebehavior.com, trophy.so, "streak is a punishment", Kahneman loss aversion, 40–60% DAU). — UNVERIFIABLE**
Not fetched; the quoted line and the "40–60% higher DAU" figure are unattributed practitioner
claims. The underlying mechanics (Duolingo streak freeze exists; loss aversion is canonical
Kahneman/Tversky) are real, but the specific numbers should not be treated as evidence.

**E3-59 — MacroFactor "AI Describe" = AI-as-search-accelerator over verified data (Pattern B). — VERIFIED**
Real feature: voice/text parsed into searches against MacroFactor's verified common-foods
database (https://macrofactor.com/new-food-logger/ indexed; Greg Nuckols's own description:
"a plain text parser will search our common foods database",
https://www.instagram.com/reel/CbvZgUJpcuK/). ext-03's architectural description is accurate.

---

## 3. Per-claim audit — ext-06 (elite coaching operations)

### Check-in systems

**E6-01 — WAG: weekly check-in on the Seismic platform; coach responds within ~24h. — VERIFIED**
Fetched https://www.workingagainstgravity.com/how-does-wag-work: weekly official check-in via
Seismic; "Your coach will usually respond within 24 hours"; weight, macros, measurements and
progress photos tracked in-platform; Essentials and Plus tiers (Plus adds monthly video calls).

**E6-02 — The detailed "3-layer" WAG/Stronger U check-in anatomy (Layer 1 auto-compiled data; Layer 2 narrative with highs/lows "non-negotiably asked", 4–6 subjective items on 1–10 scales; Layer 3 structured response). — CORRECTED**
The skeleton is real and verified: auto-tracked quantitative data + member narrative + coach
response within 24h (WAG fetched, above; Stronger U fetched, below). The fine print is
embellishment: nothing verifies "non-negotiably asked", the "4–6 items, 1–10 scale" format, or
"~5–15 min" writing time. Use the 3-layer model as a fair *abstraction* of verified practice,
not as a documented spec.

**E6-03 — Stronger U check-in structure (logged data + highs/lows narrative + coach feedback/adjustment). — VERIFIED**
Fetched https://strongeru.com/6-tips-for-maximizing-your-coach-check-ins/: members submit
"tracked meals, water intake, lifestyle components, alcohol, exercise, steps, weight, photos,
or measurements"; "Highs: Begin with the high/something positive in and outside of nutrition";
coaches "provide feedback, offer suggestions… and adjust your program focus".

**E6-04 — Elite coaches' input priority order (trend weight → performance → photos every 2–4 wks/"flat vs full" → biofeedback → NEAT/cardio compliance → adherence). — CORRECTED**
The individual elements are consistent with verified coaching content (RippedBody's tracking
and adjustment guides — fetched; trend-not-single-reading is universal). But the *ordered
hierarchy*, the "photos every 2–4 weeks not weekly" cadence and the "flat vs full as a primary
dial" specifics are synthesis presented as cross-referenced findings, and the academic citation
attached to them (next item) does not support them.

**E6-05 — PMC10299204 cited in support of coach monitoring/decision practice. — CORRECTED (miscited)**
The paper is real — fetched https://pmc.ncbi.nlm.nih.gov/articles/PMC10299204/: "Bodybuilding
Coaching Strategies Meet Evidence-Based Recommendations: A Qualitative Approach" (2023) — but
it covers protein, cardio, supplementation and PED recommendations. It contains nothing on
check-in structure, weight-trend monitoring, photo cadence or adjustment decision logic.
Classic real-paper-wrong-content miscitation.

**E6-06 — Decision hierarchy: verify adherence first → assess recovery/biofeedback → increase activity before cutting → cut conservatively (100–200 kcal) as the last lever. — VERIFIED**
This is the doc's single most load-bearing coaching claim and it checks out. Fetched
https://rippedbody.com/how-to-adjust-macros/ (Andy Morgan's adjustment framework): "If your
diet adherence has been poor, you can't fairly judge the efficacy of your current macros"
(adherence first); recovery/sleep/stress assessed before changes; "Increase activity levels…
before cutting calories"; "**A calorie reduction is the last thing to consider**"; reductions
"around 5–8%", i.e. 100–200 kcal. Consistent with Carbon's compliance-first model and the
fetched 3DMJ adherence-collaboration material. Volyume's engine ordering (hold → behaviour →
activity → conservative cut) is genuinely aligned with published elite practice.

**E6-07 — "Never more than 250–300 kcal/day in one adjustment; re-assess after 2–3 weeks minimum." — UNVERIFIABLE**
Not in the fetched RippedBody page (which gives 5–8%) nor any other fetched source. Plausible
practitioner heuristic; uncited.

**E6-08 — 2024 deload survey: scheduled 65% / beat-up 63% / performance-stall 54%; ~6–7 days; every 4–6 weeks; frequency maintained; intensity reduced via RIR. — VERIFIED**
Fetched full text (https://pmc.ncbi.nlm.nih.gov/articles/PMC10948666/, Rogerson et al. 2024,
*Sports Medicine – Open*): **65.4%** "when it says so on the programme", **62.6%** "when feeling
beat up (muscle soreness, joint aches, or pain)", **54.1%** "when performance stalls or
decreases"; duration 6.4 ± 1.7 days; every 5.6 ± 2.3 weeks; 63.0% kept frequency unchanged;
intensity/effort reduced via RIR increase. ext-06's numbers are accurate.

**E6-09 — Deload "volume reduction: 25–50% or more". — CORRECTED**
The survey does not quantify volume reduction as a percentage (it reports 78.9% reduced weekly
sets, 52.8% reduced reps). The 25–50% range is not in the cited survey; if retained it should
be re-anchored to the practical-recommendations literature (Bell et al., "A Practical Approach
to Deloading"), not the survey.

**E6-10 — Deload Delphi consensus (PMC10511399) and checkpoint-based deloading. — VERIFIED**
Fetched https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/: "Integrating Deloading into
Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach"
(2023) — deloading "generally undertaken every 4–6 weeks for a period of ~7 days", volume
reduced via reps/sets, individualised athlete-centred prescription. The companion practical
paper (Bell et al., SHURA) exists. ext-06's use is accurate.

### Coach feedback anatomy and retention science

**E6-11 — The "5-part coach response" that human coaches "universally use". — UNSUPPORTED (as research)**
No fetched source describes this five-part anatomy. It is a sensible synthesis — its components
each appear separately in verified material (specific acknowledgement and highs-first: Stronger
U fetched; decision-with-reason: RippedBody/Carbon; forward anchor: standard practice) — but
ext-06 presents an invented framework as a documented industry universal. Safe to use as a
*design pattern*; unsafe to cite as research.

**E6-12 — Tone band details (150–250 words ideal; name used once; "decisiveness signals competence"). — UNSUPPORTED**
No source found for any of the specific parameters.

**E6-13 — Adherence-neutrality as the formal articulation of elite-coach behaviour (MacroFactor link). — VERIFIED**
The MacroFactor adherence-neutral page is real (E3-01) and the cross-reference is fair.

**E6-14 — Anti-patterns / "why clients leave" (generic responses, slow replies, unexplained changes, ignored feedback), per PTDC. — CORRECTED**
The PTDC article exists ("Why Do Clients Leave Personal Trainers? (Survey Results)",
https://www.theptdc.com/articles/why-clients-leave-personal-trainers — bot-walled; indexed
content confirms "the relationship felt transactional" and not-feeling-listened-to as major
findings). Independent corroboration fetched: https://www.europeanpti.com/blog/why-clients-leave-personal-trainers
(slow/unseen progress, feeling judged, communication gaps among 8 reasons). The substance is
solid; the exact five-item ranked list in ext-06 is an editorial construction.

**E6-15 — Trainerize historically lacked a native check-in form (years of community complaints), recently filled. — VERIFIED**
Idea-forum thread with years of requests and coaches leaving over it
(https://ideas.trainerize.com/forums/167887-fitness-nutrition-training-features/suggestions/34832734-sending-weekly-check-in-forms-clients-have-to-fill)
and Trainerize's own launch post confirming Check-In Forms only recently shipped
(https://www.trainerize.com/blog/trainerize-update-check-in-forms-are-here-engage-smarter-and-transform-clients-lives/).

**E6-16 — WAG "expensive ($200+/mo)". — CORRECTED**
Current WAG pricing (official, via workingagainstgravity.com/nutrition-coaching, June 2026):
Lite **$99/mo**, Essentials **$179/mo**, Plus **$219/mo**, with 12-month Essentials at $129/mo.
"$200+" only describes the top tier. (This also corrects the £239–399/mo figure used for "WAG
Seismic Coaching Plus" in `bp-monetisation-mealplan-update.md` — that number is roughly double
reality. See Delta verdict (d).)

**E6-17 — Everfit / TrueCoach / CoachRx capability rows. — UNVERIFIABLE**
Not individually verified (low stakes). Note the table lists TrueCoach twice — an internal
consistency error consistent with generated-without-checking provenance.

**E6-18 — RP coaching practice (check-in cadence, tiers, response time). — CORRECTED**
Fetched https://rpstrength.com/pages/coaching: **email check-ins 2–3×/week on both tiers**
(ext-06 said "twice-weekly for nutrition; weekly for training"); Coaching Essentials
**$349.99/mo** (email-based, no live calls); Full Access **$599.99/mo** (adds weekly 20-minute
video call + texting); "coaches respond within 24 hours on business days" ✓. "Macro adjustments
at every check-in (no cap)" is not stated on the page.

**E6-19 — RP Hypertrophy in-session feedback loop; "$35/mo" complaints. — CORRECTED**
The per-exercise feedback → next-session volume autoregulation is well documented and the
regular price is $34.99/mo (~$299.99/yr list, frequently discounted; RP official pages +
multiple 2026 sources). The user quote ("if your quads aren't just right…") and its attribution
to a *JuggernautAI* review at powerliftingtechnique.com could not be verified — wrong-product
sourcing at minimum.

**E6-20 — 3DMJ coaching model (Helms et al. philosophy; weekly/biweekly cadences; optimal-vs-adhereable negotiation). — CORRECTED**
The cited article exists but is by **Brad Loomis** (Feb 2025), not "Eric Helms et al.", and its
three keys are: know the client's goals / care and acknowledge progress / provide clear,
frequent guidance — not the three principles ext-06 lists. The "optimal vs adhereable"
intersection *is* genuinely present ("buy-in and input from the client to make an enjoyable yet
flexible plan for the best adherence possible") — fetched
https://www.3dmusclejourney.com/blog/my-coaching-philosophy-3-keys-to-keep-in-mind-with-every-coaching-interaction.
The check-in cadence claims (weekly competitors / biweekly off-season) are not in the cited
source.

**E6-21 — Retention data: "average 50–65%; strong coaches 65–80%; elite 80–90%+" (Everfit). — FABRICATED**
Fetched https://blog.everfit.io/how-to-retain-personal-training-clients: the article says
standard PT retention is "approximately 75% to 80%", dropping to ~70% seasonally, with 90% as a
goal. The three-tier breakdown in ext-06 does not exist in the source or anywhere else found.

**E6-22 — "Structured onboarding retains 87% at 6 months vs 60%" (Optimized Growth). — UNSUPPORTED**
Fetched https://optimizedgrowth.com/gyms/blog/gym-onboarding-first-30-days/: the 87%/60%
comparison is absent.

**E6-23 — "3 sessions/week in month 1 = 4× retention vs sporadic." — VERIFIED (as cited)**
The fetched Optimized Growth article does contain this ("Members who achieve this frequency in
month 1 retain at 4x the rate of those who attend sporadically"). Caveat: the source is gym
marketing content with no underlying citation — treat as industry folklore, directionally fine.

**E6-24 — "8+ gym visits in month 1 → significantly longer retention." — UNSUPPORTED**
Not in the cited source; not found elsewhere in this audit.

**E6-25 — "50% of new gym members cancel within 6 months; attrition concentrates in days 1–90" (Virtuagym). — UNSUPPORTED (as cited)**
Fetched https://business.virtuagym.com/blog/fitness-onboarding/: contains neither figure (only
"new members decide within the first 30 days"). Similar statistics circulate from IHRSA, but
the cited source does not carry the claim.

**E6-26 — "Accountability ↑ goal achievement by 65%; committing to meet someone = 95%." — UNSUPPORTED**
This is the famous "ASTD study" statistic. It is repeated across hundreds of coaching blogs
(e.g. https://www.entrepreneur.com/leadership/an-accountability-partner-makes-you-vastly-more-likely-to/310062)
but no primary ASTD/ATD publication has ever been produced; the figure is untraceable folklore.
Do not use in any user-facing or decision-bearing context.

**E6-27 — Top-5 reasons clients leave; #1 = "no relationship / feeling unseen". — CORRECTED (substance solid)**
The core claim — clients leave coaches over relationship/communication failure more than
programming, and specific acknowledgement is the cheap fix — is well corroborated: PTDC survey
("the relationship felt transactional"; clients "don't feel listened to") + EuropeanPTI
(fetched) + Trainerize retention content. The precise five-item ranked list and "#1" billing
are editorial. **For Volyume:** the design implication (specific, data-referenced
acknowledgement in the coach card; OPP-C01) survives validation comfortably — it just shouldn't
be cited as "the PTDC survey's #1 reason" verbatim.

**E6-28 — Top-tier online physique coaching costs £150–400/month. — VERIFIED**
UK-Muscle community consensus: £200–300/month is standard, ~£250 average on Instagram
(https://www.uk-muscle.co.uk/threads/is-%C2%A3200-%C2%A3300-the-average-price-for-an-online-coach.375201/);
oxcloth.com guide: £100–300 typical. Anchors verified at the brand level: WAG $99–219/mo,
RP coaching $349.99–599.99/mo (≈ £275–470/mo), Stronger U (now closed). The doc's range is fair;
the "methodology is not inherently expensive, the human execution is" argument stands.

**E6-29 — WAG progressive disclosure ("new client starts with macros, weight, two narrative questions; +4 weeks measurements and photos; +8 weeks advanced biofeedback"). — FABRICATED**
No trace of this staged schedule on WAG's site (how-does-wag-work fetched; FAQ and onboarding
material searched) or anywhere else. WAG's actual flow has before-photos/measurements submitted
at setup. The *general* principle of progressive disclosure remains supported elsewhere
(Volyume's own verified sources: RP simplifying for new users, MacroFactor complexity
complaints) — but this specific, persuasive-sounding WAG example was invented.

**E6-30 — Gymtimidation / spotlight effect / structured guidance reduces beginner anxiety (NASM). — VERIFIED**
Fetched https://blog.nasm.org/overcoming-gym-anxiety: defines gymtimidation, addresses
perceived judgement ("everyone in the gym is more focused on themselves"), recommends
trainer-guided structure and expectation-setting.

---

## 4. What's new / what the documents missed (as of June 2026)

### 4.1 Material market events the docs missed

1. **MyFitnessPal launched "AI Coach" on 10 June 2026** — two days before this audit — on
   Premium and Premium+, in the US, UK, CA, AU, NZ: personalised insights, **food swaps,
   recipes, portion adjustments and meal pairings** grounded in the user's own logs (fetched
   press release: https://www.globenewswire.com/news-release/2026/06/10/3309733/0/en/MyFitnessPal-Introduces-AI-Coach-to-Deliver-Personalized-Nutrition-Guidance-Rooted-in-20-Years-of-Nutrition-Expertise.html).
   This is the largest player in the category moving directly into "tell me what to eat"
   territory — the exact space Volyume's meal-plan flagship occupies. MFP's version is
   LLM-driven and online-only; Volyume's is deterministic, macro-exact and offline. The
   positioning window for "verified, deterministic, offline plans — not AI guesses" is open but
   now has a clock on it.
2. **Simple launched "Avo Voice"** (AI voice calls) in January 2026 — the AI-coaching arms race
   in the mass market is accelerating beyond chat.
3. **Noom's full-dose GLP-1 pricing moved to $149 start + $299/month from 31 March 2026**, with
   cheaper microdose ($79–119) and brand-med tiers — the behavioural product is now visibly the
   wrapper around a medication business.
4. **Carbon runs partner-funnel 14-day free trials** (e.g. the Huberman partnership,
   https://web.joincarbon.com/a/huberman) despite "no free trial" being its public default —
   relevant comparator for Volyume's 14-day cardless trial.
5. **Trainerize shipped native Check-In Forms** — the B2B check-in tooling gap ext-06 leaned on
   is closing, though the "intelligence stays in the coach's head" point remains true.

### 4.2 Corrections that change competitive conclusions

- **Carbon does NOT do carb cycling** (its help centre actively argues against it). Volyume's
  TD/NTD day variants face *less* direct app competition than ext-03 claimed, not more.
- **Avatar Nutrition is $9.99/mo** and does not advertise High/Low days — it is a weaker
  competitor than painted.
- **Noom raised its calorie floors to 1,310/1,540** — the "1,200 default" attack line needs
  updating before being used in any positioning.
- **Human-coaching anchors:** WAG is $99–219/mo (not $200+/£239–399); RP coaching is
  $349.99–599.99/mo; UK prep coaches £200–300/mo typical. The anchor story survives at honest
  numbers (Volyume Pro annual is still ~1–3% of a year of human coaching).

### 4.3 Source-quality warning (systemic)

A large share of ext-03's citations — nutrola.app, nutriscan.app, calorie-trackers.com,
trygaya.com, home-cooks.co.uk, goldiai.com, mealift.app, fuelnutrition.app,
fitness-tracking.com, best-diet-apps.com, health-tech-reviews.com, nutrition-apps-ranked.com —
form a cluster of near-identical, AI-generated affiliate review sites (several persistently
promote the same app, "PlateLens", with implausibly precise accuracy figures). They are not
independent sources; treat anything sourced *only* to this cluster as unverified. Facts in this
validation were re-anchored to official/vendor pages, app stores, mainstream press, Trustpilot
or peer-reviewed sources wherever a verdict of VERIFIED is given.

---

## 5. Delta verdicts — Volyume features built on these documents

### (a) The meal-plan flagship (Theme G: deterministic generated day/week plans, TD/NTD variants, macro-preserving swaps, coach integration speaking food-level changes) — **KEEP**

The validated evidence makes the case for this feature *stronger* than the fabricated research
did:

- The beginner problem ("I don't know what to eat") is real and verified: Yazio's meal
  plans/recipes are a confirmed Pro draw; RP — the only true meal-plan-prescriptive app — spent
  2025–26 softening rigidity (v1.5/v1.52 verified) because prescriptive planning is wanted but
  must flex; MFP just launched an AI Coach doing food swaps because "what should I eat" is the
  demand (§4.1).
- The competitive gap is wider than claimed: **Carbon has no carb cycling at all** (E3-10
  fabricated in the other direction), Avatar doesn't advertise High/Low days (E3-39), and no
  verified competitor offers macro-exact generated plans with gram-rescaling swaps plus a
  deterministic coach that edits the plan at food level. The "uncopyable bit" (coach
  integration) had no counter-example anywhere in this audit.
- The elite anchor is verified: UK prep coaches at £200–300/mo deliver exactly this artefact
  (plan + swaps + check-in adjustments) by hand.
- New risk to manage, not a reason to rebuild: MFP AI Coach and Welling-class AI coaches now
  answer the same question conversationally. Volyume's answer must be positioned on its
  verified strengths — deterministic, macro-exact, offline, food-level explained changes —
  rather than on "no one else does meal suggestions", which is no longer true.

### (b) C1/C2 persona-adaptive coaching register + opt-in science layer — **KEEP (with citation clean-up)**

The design survives because its load-bearing evidence verified:

- Adherence-neutral, plain-language coaching as *functional* (protects engine inputs) is
  MacroFactor's own published, verbatim position (E3-01) — the strongest plank, fully real.
- Complexity-overwhelm for beginners is supported in substance: Hoot Fitness ("steeper learning
  curve"), Cronometer review ("dense… overwhelming to new users"), and — best of all — RP's own
  fetched statement that it redesigned its app because new users were confused (E3-35).
  Progressive disclosure also matches verified human practice in spirit (Stronger U's
  narrative-light check-ins; 3DMJ's adherence-first collaboration).
- The decision hierarchy that the coach register narrates (adherence before plan changes,
  activity before cuts, cuts last and conservative) is verified elite practice (E6-06, E6-08).

Amendments required: stop citing (i) the fabricated WAG 4-week/8-week disclosure schedule
(E6-29), (ii) the "JPSP 2024" identity-framing study (E3-57) — if identity-framing copy is
kept, treat it as a design choice, not evidence-backed, or re-anchor to the real habit-identity
literature; (iii) the "universal 5-part coach response" as research (E6-11) — keep it as
Volyume's own design pattern, which is honestly defensible from the verified WAG/Stronger U/
RippedBody material.

### (c) "Today's plate" free teaser on the Pro-locked diary — **AMEND**

The feature idea is reasonable; its quantitative justification is not.

- The "~30–50% better conversion for soft paywalls" figure that made this "the
  highest-conviction conversion lever" does not survive validation. The real RevenueCat 2026
  data says **hard paywalls convert ~5× better than freemium at Day 35** (10.7% vs 2.1%) and
  earn $3.09 vs $0.38 RPI (E3-55); the Cal AI "+31%" was a whole experimentation programme, not
  a teaser effect (E3-56). There is no verified number supporting a specific lift from a
  read-only teaser.
- What *is* verified and supports a teaser done carefully: conversion happens Day 0 or Days 4–7
  after experiencing value (E3-53), H&F converts trials at 35% (E3-48), and long trials beat
  short ones (E3-54). A "Today's plate" preview is a value-demonstration device for the Day 4–7
  cohort — that logic stands.
- Recommendation: ship it as an **A/B experiment with explicit guardrails**, not as a
  presumed-win: keep the Pro gate hard (the verified data favours hard gates), measure
  teaser-exposed vs not on trial-start and Day-35 conversion, and pre-agree the kill criterion.
  Re-write any internal copy claiming "~30–50%" expected lift.

### (d) Monetisation update — meal plans as paywall hero ("Your plate, sorted", coach-price anchor, £4.99/mo · £29.99/yr unchanged) — **KEEP (with corrected anchor numbers)**

- **Keep the price.** Verified benchmarks support it: H&F annual-dominant (61% share, Adapty),
  annual Day-380 retention 19.9% vs 5.5% weekly (Adapty via Airbridge), and RevenueCat's
  finding that presentation changes beat price changes (price experiments win only ~28% of the
  time — per the fetched 2026 summary's framing of experiment win rates). Nothing in the
  validated data argues for touching £4.99/£29.99 now.
- **Keep the hero repositioning.** The flagship is real, differentiated (delta (a)), and the
  category sells "coach value at app price" — Carbon's own verified positioning ("a nutrition
  coach at a fraction of the cost of ordinary coaches") proves the frame works.
- **Correct the anchors before any copy ships:**
  - Stronger U closure (31 Mar 2026) is verified and usable; its displaced users are a real
    audience. (Its exact historical pricing was not verified in this audit — confirm before
    quoting a number.)
  - WAG is **$99–219/mo**, not "£239–399/mo" as stated in `bp-monetisation-mealplan-update.md` —
    that figure roughly doubles reality and would be indefensible in public copy.
  - Safe, verified anchor set: UK prep coaches £200–300/mo typical (~£250 average); RP coaching
    $349.99–599.99/mo; WAG $99–219/mo; Carbon $99.99/yr; MacroFactor $71.99/yr; RP Diet Coach
    app ~$209/yr (not re-verified — confirm before use). "Your prep coach for £2.50 a month"
    survives all of these comfortably.
  - Add the new defensive line the docs couldn't have known: MFP AI Coach (June 2026) makes
    "deterministic, verified, offline — not AI guesses" the sharpest available differentiator
    for the paywall and store listing.

---

## 6. Method log (what was fetched vs blocked)

Fetched directly (primary verdict basis): joincarbon.com (home + pricing + help centre),
strongeru.com (end-of-services + check-in tips), sacra.com/c/noom, Yahoo/Business Insider Noom
investigation, abbylangernutrition.com, PMC5700836 (Levinson 2017), PMC10948666 (deload survey
full text), PMC10511399 (deload Delphi), PMC10299204, rippedbody.com/how-to-adjust-macros,
workingagainstgravity.com/how-does-wag-work, rpstrength.com (coaching page + v1.5 post +
redesign post), 3dmusclejourney.com (Loomis), blog.everfit.io, optimizedgrowth.com,
business.virtuagym.com, blog.nasm.org, zoe.com (Zoe 2.0), welling.ai (home + review article),
feastgood.com (Welling review), fitness-tracking.com (Welling review), avatarnutrition.com
(home + adaptive-nutrition), calorie-trackers.com (Cronometer review), hootfitness.com
(MacroFactor alternatives), superwall.com/case-studies/cal-ai, revenuecat.com (2026 blog
summary + renewal-rates blog), adapty.io (H&F benchmarks ×2), airbridge.io (plan-type
retention), help.macrofactorapp.com, globenewswire.com (MFP AI Coach), europeanpti.com,
sciencetimes.com (Avo).

Blocked/bot-walled (search-indexed text used, flagged inline): macrofactor.com /
macrofactorapp.com (adherence-neutral page — key sentence confirmed verbatim via index),
help.rpstrength.com (v1.52 changelog — full content via index), theptdc.com,
businessofapps.com, femestella.com (empty body — corroborated via BI), link.springer.com
(used PMC instead), web.archive.org (unavailable in this environment).

*Report completed 2026-06-12. Not committed — working tree only.*
