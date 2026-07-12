# Growth research, adversarially verified (2026-07-12)

The best-evidenced zero-budget path for a UK-first fitness app is Hevy's: a product-led social/viral loop plus basic ASO and word of mouth carried it to ~2M downloads in ~4 years on under $15k lifetime ad spend, with growth heavily back-loaded (half of all downloads in the final 5 months) — implying Volyume should expect 2-3 slow compounding years before any inflection, gated primarily by retention (category base rate is only ~3% D30) and a 4.0+ star rating, which acts as a hard visibility gate rather than a mere conversion factor. The most-cited "faceless creator" success, Cal AI, was in fact a paid programme (150-250 retained influencers, plateauing at ~$2M/mo before $1M+/mo ad spend took over), so it is not a template for £0 automation — but the automation infrastructure itself is verified viable at near-zero cost: Google Play's Reply-to-Reviews API supports compliant automated review replies, Instagram's official Content Publishing API permits fully programmatic posting (100 posts/day), and self-hosted AGPL Postiz provides an agent-callable scheduling backbone across all target platforms. Google does not penalise AI-generated content categorically (it targets scaled, ranking-manipulation automation, judged since March 2024 by core-ranking signals), so calm, evidence-led AI-assisted content is workable if quality-controlled. On the no-AI positioning tension, MacroFactor's move is instructive: it added Gemini-powered photo food logging under competitive pressure while keeping its coaching algorithm deterministic — suggesting Volyume's "deterministic coaching" claim holds best when scoped to the coaching engine, not to input conveniences or marketing production.

## Hevy grew to ~2M downloads/users in ~4 years on under $15k total ad spend

**Confidence:** High  
**Vote:** 3-0 (four merged claims, all unanimous)

Founder Guillem Ros on the Sub Club podcast stated: "we've probably spent under 15K in ads ever... a lot of it was just credit that we've gotten by collaborating"; "We launched around July 2019... We just hit 2 million users yesterday" (~May 2023). RevenueCat corroborates: "Two Million Downloads, No Paid Marketing"; "half of that growth happened in just five months". Growth was heavily back-loaded: roughly 3.5 years to the first million, then ~5 months from 1M to 2M. This makes it essentially fully organic, and the closest verified precedent for Volyume's target trajectory.

**Caveats:** Self-reported, hedged ("probably"), users/downloads conflated, time-scoped to mid-2023.

**Implication for automation design:** Plan for 24-36 months of low-visibility compounding before inflection; do not model linear growth or judge channels dead in year one.

**Sources:**
- https://subclub.com/episode/cultivating-organic-growth-with-viral-loops-guillem-ros-salvador-hevy
- https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast/

## Hevy's growth engine was a built-in social/viral loop, not paid acquisition or sophisticated ASO

**Confidence:** High  
**Vote:** 3-0 (both merged claims unanimous)

Hevy's growth was driven by a built-in social/viral loop (following friends' workouts, in-app community) plus word of mouth and store discovery algorithms — NOT paid acquisition (which the team "haven't been able to crack") and NOT sophisticated ASO (early ASO was "very basic, targeting the keywords everyone else was targeting"). The founder explicitly believes purely social product-led growth scales to very large user bases without acquisition spend. Transcript: low pricing "allows us to build this social growth engine"; "purely social and building a great product... that's what we're trying to go for". RevenueCat: "organic growth based on word of mouth and App Store and Google Play algorithms... the Hevy team did very little App Store Optimization (ASO) in the early stages". The core driver was social loop + organic store discovery jointly, not the social loop alone.

**Implication:** The highest-leverage "marketing" investment may be in-product (share cards, friend-follow, referral mechanics) rather than external content — an agent department should treat content as amplification of a product loop, not a substitute for one. Note Volyume's GDPR share-card constraints (no name/bodyweight/measurements except the approved Pro before/after card) bound what that loop can expose.

**Sources:**
- https://subclub.com/episode/cultivating-organic-growth-with-viral-loops-guillem-ros-salvador-hevy
- https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast/

## Cal AI's celebrated growth model was a paid creator programme, not faceless zero-budget automation

**Confidence:** Medium  
**Vote:** [19] 2-1, [20] 3-0, [21] 3-0

Cal AI's celebrated growth model was a PAID creator programme, not faceless zero-budget automation: 150+ creators on retainer by mid-2024 (later ~250), each posting ~4x/month, recruited via bulk Instagram DM outreach managed by virtual assistants, producing native-looking (non-sponsorship-styled) content. This channel plateaued at ~$2M/month revenue, after which Cal AI pivoted to heavy paid acquisition (Meta/TikTok/Instagram), scaling ad spend past $1M/month by January 2026 to reach $5.7M/month revenue (validated by the MyFitnessPal acquisition, announced March 2026).

Growthcurve: "over 150 creators on retainer... a simple 'paid promo?' template sent to fitness accounts... virtual assistants managed outreach at scale". Superframeworks: "exclusive network of 250+ fitness influencers... When influencer marketing plateaued at $2M/month, Zach doubled down on paid acquisition... Ad spend scaled to $1M+/month by January 2026, driving revenue to $5.7M/month". Corroborated by Forbes/Inc./TechCrunch acquisition coverage and founder's on-record "$40M+ in sales in the last 12 months".

**Caveats:** Blog-quality sources with founder-self-reported numbers (though order of magnitude press-verified); one related claim about founder face-time was refuted, so do not assert the model required on-camera founder content.

**Implication:** The creator-network playbook is only relevant to Volyume AFTER the £3-5k MRR paid-unlock — but the DM-outreach + VA management pattern is highly automatable by agents when that gate opens, and the plateau evidence says creator channels are a stage, not an endgame.

**Sources:**
- https://growthcurve.co/three-engines-and-an-exit-the-cal-ai-growth-playbook
- https://superframeworks.com/case-study/cal-ai
- https://techcrunch.com (MyFitnessPal acquisition coverage, 2026-03-02)

## MacroFactor added AI photo food logging while keeping its coaching algorithm deterministic

**Confidence:** High  
**Vote:** 3-0

MacroFactor — the closest competitor to Volyume's evidence-led positioning — added AI photo food logging (MacroFactor AI, built on Gemini 2.5 Flash, launched in beta April 2025) explicitly in response to "a wave of AI-first (and AI-only) nutrition apps flooding the market", while keeping its core adherence-neutral coaching algorithm non-LLM. The correct read for Volyume's deterministic no-AI positioning: the market pressure is real, but MacroFactor's answer was AI for input convenience, deterministic for coaching — the positioning survives if scoped precisely.

Google Cloud case study: "Faced with a wave of AI-first (and AI-only) nutrition apps flooding the market, MacroFactor wanted to provide fast and deep information for their users with MacroFactor AI." MacroFactor's own docs frame the AI as one of seven optional logging methods, "fully inspectable", with the coaching algorithm unchanged.

**Caveats:** The Google Cloud page is vendor marketing, so the stated motive is self-reported framing.

**Implication:** Volyume's marketing should articulate "deterministic coaching" as the claim (auditable, same inputs → same outputs), not "no AI anywhere" — which also defuses the irony of AI-assisted marketing production. No evidence surfaced that audiences punish AI-made marketing content per se (that sub-question remains open).

**Sources:**
- https://cloud.google.com/customers/macrofactor
- https://macrofactor.com/ai-food-logging/
- https://macrofactorapp.com/version-5-0-0/

## Star rating is a hard visibility gate on the app stores

**Confidence:** Medium  
**Vote:** 2-1

Apps under 3.5 stars barely rank; 85% (Google Play) / 90% (App Store) of featured apps were rated 4.0+, and Google documents hard exclusions at 3.0 stars (top charts) and 8% crash/ANR. For a new fitness app, protecting rating quality is a prerequisite to any ASO strategy working at all.

AppTweak 2025 report (Jan-Dec 2024 data): "Apps rated under 3.5 stars barely rank... 90% of featured apps had a rating of 4.0 or higher" (Google Play figure is 85%). Google's own docs confirm low-quality apps are excluded from discovery surfaces and top search results.

**Caveats:** The featuring statistic is correlational; the 3.5-star threshold is AppTweak's observational finding, not a documented Google rule; "ratings velocity" specifically is industry consensus (AppFollow, MobileAction) rather than sourced here.

**Implication:** The review-reply automation agent and in-app rating-prompt timing are Tier-1 growth infrastructure, not hygiene — and Play Console quality metrics (crash/ANR) belong in the marketing monitoring loop.

**Sources:**
- https://www.apptweak.com/en/aso-blog/aso-app-store-trends-benchmarks-report
- https://support.google.com/googleplay/android-developer/answer/9958766
- https://android-developers.googleblog.com (Oct 2022 quality-threshold policy)

## Retention base rate: ~3% D30 across health & fitness apps

**Confidence:** High  
**Vote:** 3-0

Health & fitness apps averaged only ~3% day-30 retention in 2023 (AppsFlyer: 2.78%), an install-weighted category average that includes paid-UA shovelware; dedicated workout trackers commonly retain substantially better. Any acquisition volume is multiplied (or nullified) by where Volyume sits against this base rate. "Health and fitness apps had 3% retention rate by day 30 in 2023" — corroborated independently by AppsFlyer (2.78% D30) and Sendbird; 2025-2026 benchmark roundups still cite ~3%.

**Caveats:** This is the category floor, a weak predictor for Hevy/Strong-class trackers (one unsourced vendor blog claims 8-12% average, 25% for standouts, for fitness-specific apps).

**Implication:** The agent department's analytics loop should treat D1/D7/D30 cohort retention as its primary KPI ahead of install volume, and gate spend-unlock decisions on beating the ~3% D30 category floor by a wide margin.

**Sources:**
- https://www.businessofapps.com/data/health-fitness-app-benchmarks/
- AppsFlyer app retention benchmarks 2023-2024
- Sendbird industry benchmark tables (D1 ~20-27%, D7 ~7%, D30 ~3%)

## Google does not penalise AI-generated content categorically

**Confidence:** High  
**Vote:** 3-0 (both merged claims unanimous)

Google does not penalise AI-generated content categorically: its policies target scaled automation for ranking manipulation ("extensive automation used to produce content on many topics"), reward people-first content "however it is produced", and since March 2024 the helpful content system has been folded into core ranking (with a parallel "scaled content abuse" spam policy covering scaled unoriginal content whether human- or AI-made). AI-assisted, evidence-led fitness SEO content is therefore policy-viable if quality-controlled and not produced at indiscriminate scale.

Google primary docs: "If you use automation, including AI-generation, to produce content for the primary purpose of manipulating search rankings, that's a violation of our spam policies" — intent- and scale-based, not categorical. March 2024 announcement confirms no more standalone HCU updates.

**Caveats:** HCU-hit sites largely did not recover post-rollup (Glenn Gabe's tracking of ~380 sites), so sitewide helpfulness suppression still bites in practice.

**Implication:** The SEO agent should produce a bounded number of genuinely differentiated, evidence-cited articles (Volyume's deterministic-engine methodology is real E-E-A-T material) rather than programmatic keyword sprawl, and must cite the "scaled content abuse" policy — not HCU — as the current constraint.

**Sources:**
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/blog/2024/03/core-update-spam-policies
- https://searchengineland.com/library/platforms/google/google-algorithm-updates/helpful-content-update

## Near-£0 automation stack verified feasible on official APIs

**Confidence:** High  
**Vote:** 3-0 (all eight merged claims unanimous)

A ToS-compliant, near-£0 automation stack for the planned agent marketing department is verified feasible on official APIs:

- **Google Play Developer API** supports programmatic review retrieval and replies (reviews with text comments, production versions only, 7-day retrieval window → agent must poll at least weekly; 350-char replies; 200 GET/hr, 2000 POST/day).
- **Instagram's official Content Publishing API** permits fully programmatic posting of images, videos, reels, stories and 10-item carousels at up to 100 API-published posts per rolling 24h (professional accounts only, instagram_content_publish permission via Meta App Review) — orders of magnitude above solo-founder cadence.
- **Self-hosted Postiz** (AGPL-3.0, feature parity with hosted, £0 software cost) covers Instagram, YouTube, TikTok, X, Facebook, Threads, Pinterest, Reddit, LinkedIn, Mastodon and Bluesky via official platform OAuth, and exposes a public API, NodeJS SDK, N8N node and an agent CLI, so AI agents can create and schedule posts programmatically.

All primary sources fetched live during verification (2026-07-12). Google: "view user feedback for your app and reply to this feedback"; "only the reviews that users have created or modified within the last week". Meta: "Instagram accounts are limited to 100 API-published posts within a 24-hour moving period. Carousels count as a single post." Postiz README: AGPL-3.0, "no difference between the hosted version and the self-hosted version", official-OAuth compliance section, "Postiz agent CLI! perfect for... agents".

**Material caveats:** Self-hosted Postiz requires the founder's OWN per-platform developer-app approvals (Meta/YouTube can take 1+ month — start applications early), a small server (~€5/mo), and Docker setup; Postiz compliance statements are vendor claims (spot-check per platform); API compliance does not exempt content from platform spam/inauthenticity rules; a related claim that Page Publishing Authorization is strictly required was refuted, so do not hard-code that prerequisite.

**Implication:** Build the department on Postiz self-hosted + direct Play/Instagram APIs; the binding constraints are platform app-review lead times and content-quality rules, not rate limits or cost.

**Sources:**
- https://developers.google.com/android-publisher/reply-to-reviews
- https://developers.facebook.com/docs/instagram-platform/content-publishing/
- https://github.com/gitroomhq/postiz-app
- https://docs.postiz.com/public-api

## Caveats

**Time-sensitivity:** Hevy figures are self-reported founder numbers time-scoped to mid-2023 (Hevy has since grown well past 2M; users vs downloads are conflated throughout); API limits (Instagram 100/24h, Play review quotas, Postiz feature parity "at the moment") were verified live on 2026-07-12 but change without notice — re-verify at build time.

**Source-quality gradient:** The Hevy and API/infrastructure findings rest on primary sources with unanimous votes; the Cal AI findings rest on unsourced growth blogs whose order of magnitude is press-verified via the MyFitnessPal acquisition but whose specific figures ($2M plateau, 150 vs 250 creators) are founder-self-reported; the ratings-gate 3.5-star threshold is AppTweak's observational finding, not a documented Google rule (2-1 vote); the MacroFactor "competitive pressure" motive comes from a Google Cloud vendor case study.

**Coverage gaps versus the original research question:** No surviving claims address UK-specific fitness keyword install volumes, page-view-to-install conversion benchmarks (the one Play-vs-iOS conversion claim was refuted), faceless short-form account growth rates post-2025 algorithm changes, TikTok/YouTube automation-tool ban risk, referral/waitlist mechanics evidence, GDPR-compliant zero-cost email tooling, ASA UK compliance specifics, or any documented case of an autonomous AI-agent marketing department actually working — that last absence is itself a finding: no verified case study survived, so the build plan is pioneering, not following precedent.

**Three refuted claims are listed for transparency and must not leak into the build plan:** Cal AI founder face-time as a required input, Page Publishing Authorization as an Instagram API prerequisite.

**Base-rate honesty:** The ~3% D30 figure is an install-weighted category average and a floor, not a benchmark for a quality tracker; conversely, no surviving claim establishes what share of fitness apps ever reach 100k/1M users, so the failure-rate question is only partially answered (Hevy's ~3.5 years to 1M is the lone verified timeline datapoint).

## Open Questions

1. Do faceless/AI-generated short-form fitness accounts still grow organically post-2025 TikTok/Instagram/YouTube algorithm and AI-labelling changes, and what is the documented ban/suppression risk for API-scheduled AI video at solo-founder cadence? No claim on this survived verification.

2. What are realistic UK-only Google Play install volumes and page-view-to-install conversion benchmarks for fitness keywords ("workout tracker", "gym log", "macro tracker"), given the one store-conversion claim was refuted?

3. Is there ANY documented, non-vendor case study of an autonomous AI-agent marketing department driving measurable app growth end-to-end (content, ASO, scheduling, analytics), or is Volyume's plan genuinely unprecedented — and if so, what human-review checkpoints does that imply?

4. Does the fitness audience measurably punish AI-made marketing content from a brand whose differentiator is deterministic no-AI coaching, and how should ASA UK health-claims rules constrain agent-generated copy (no surviving evidence on either)?
