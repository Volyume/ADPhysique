⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# Growth strategy research, pass 3: Claude Deep Research

Third of three growth-strategy passes on
`GROWTH_STRATEGY_RESEARCH_BRIEF.md`. Stored verbatim.

Weight at synthesis: full weight, equal to Gemini Deep Research pass.
Pass 1 (ChatGPT non-deep) carries lighter weight than these two.

---

# Volyume Complete: Cold-Start Growth Research Report

## Part 1: Findings by Pillar

### Pillar 1: Cold-start growth for evidence-based fitness apps without an existing audience

The bootstrap stories of Volyume's competitive set divide cleanly into two camps. MacroFactor is the canonical "poured an existing audience in" case: Greg Nuckols spent roughly a decade building Stronger By Science before launch in September 2021, had MASS Research Review subscribers, the SBS Facebook group and subreddit, the Self-correcting Macro Tracker spreadsheet customer list, and a podcast already in place when Cory Davis and Rebecca Kekelishvili joined to build the app (strongerbyscience.com/macrofactor-history-team; cloud.google.com/customers/macrofactor cites 400k+ active users by 2024). Jeff Nippard joined as a partner specifically to drive YouTube reach. RP Hypertrophy launched off Mike Israetel's YouTube channel and the existing RP Diet App customer list. Carbon Diet Coach launched off Layne Norton's BioLayne audience and over a decade of evidence-based content. None of these is a true cold-start case.

The closest published cold-start case in the competitive set is Hevy. Guillem Ros and Desmond McNamee launched in 2019 with no founder audience, no email list, and minimal social following. By their own account on the Sub Club podcast, they reached 2 million downloads on roughly $15,000 of paid spend, with the inflection arriving in January 2022 when they cracked the Google Play top five (obj.ca/fitness-app-entrepreneur). Their stated growth mechanics were three: App Store and Google Play organic ranking driven by retention and review velocity; social viral loops inside the app (routine-sharing, friend-follow); and word-of-mouth in the gym. They did very little explicit ASO in the early stages and were transparent that the product itself, not marketing, did the work. Ros' Medium post "From Idea to Launch" describes the first inflection as "little communities forming on the app of people we had no idea who they were."

For first-90-day fitness-app founder interviews, the Sub Club archive, RevenueCat's State of Subscription Apps reports, and the Indie Hackers interview with the developer of Hercules (a French solo-built workout tracker that reached roughly £2,500/month net through ASO and off-store traffic) are the most useful primary sources. The consistent message across these cases is that cold-start fitness apps grow through retention-driven store ranking, not marketing campaigns. Hevy's retention drove ASO; ASO drove discovery; discovery drove retention. There is no documented cold-start case in this category where paid acquisition was the prime mover under $50k spend.

**Implications for Volyume**: The Hevy template is the only honest reference. Build for the App Store ranking algorithm, not for paid acquisition. Three concrete consequences follow. First, expect 6 to 12 months of single-digit daily installs before any inflection; budget founder hours, not marketing pounds. Second, the only viable cold-start lever for Volyume is product-driven word-of-mouth from a small, vocal first 200 users. Third, MacroFactor, Carbon and RP are not realistic comparables for Volyume's first year because they had pre-existing audiences in the tens or hundreds of thousands. The honest comparison set is Hevy and Hercules.

### Pillar 2: Coach acquisition from cold start in the UK strength and physique space

The Office for National Statistics estimated roughly 67,400 fitness and wellbeing instructors employed in the UK as of late 2024 (Statista referencing ONS, statista.com/statistics/319319). IBISWorld counted 24,856 UK personal trainer businesses as of 2025, up 3.7% on the prior year, with the five-year CAGR for 2020–2025 at 1.4% (ibisworld.com/united-kingdom/number-of-businesses/personal-trainers/6042). The addressable population for an evidence-based hypertrophy and nutrition coaching app is much smaller, plausibly 3,000 to 6,000 UK coaches who would self-identify as practising evidence-based or research-led, concentrated in the SBS Coaching alumni network, 3DMJ followers, the UK Strength and Conditioning Association (UKSCA), and OPEX UK. There is no published count of "online evidence-based coaches in the UK"; this is the most useful inferred range.

Where they congregate: UKSCA forums (members-only, gatekept), the SBS subreddit and Facebook group (largely US-skewed but UK-active), the MASS Research Review subscriber base (paid, not directly contactable but reachable via MASS comments), the Revive Stronger community around Steve Hall's podcast (UK-based), Eric Helms' 3DMJ community, and certification alumni groups (CIMSPA, Future Fit, OriGym). Facebook groups such as "UK Fitness Pros" and "Online Coaching UK" exist but contain heavy spam and low-quality coaches alongside the target persona.

On platform-switching friction: TrueCoach Pro costs roughly $137/month at 50 clients, MyPTHub roughly $19-$30 for unlimited clients, ABC Trainerize Pro starts at $22 (assistantcoach.fit/blog/real-cost-fitness-coaching-software). Migration cost is real: Fiverr lists workout-transfer services from roughly $350. No vendor publishes CAC for coach acquisition. Independent industry commentary indicates coach platforms acquire primarily through certification body partnerships, paid Facebook ads to interest-targeted coach audiences, and conference presence; none is free.

**Contested finding flag**: Allan's working assumption that a sole founder can reliably acquire UK coaches at a rate sufficient to materially move the model in year one is not supported by published data. Cold DM outreach to coaches with no existing reputation has no published conversion rate in this segment. A reasonable estimate based on broader B2B SaaS cold-outreach norms (1-3% positive reply to highly personalised messages) suggests a sole founder spending 5 hours per week could realistically book 8-15 demos per month and convert 1-3 of those to paid coaches after the 60-day trial. That is the realistic floor, not the model assumption of dozens per month.

**Implications for Volyume**: Treat coach acquisition as a six-month relationship-building exercise, not a Q1 channel. Targeted founder-led outreach to roughly 200 named UK coaches with public evidence-based positioning (SBS alumni, 3DMJ followers, UKSCA members who have written) is the right scope. The 60-day trial plus "first 100 coaches get 6 months free plus lifetime 50% off" is competitive on price; the bottleneck is trust, not pricing. Plan for 10-20 coaches by month 6, 30-60 by month 12 if the founder treats it as a deliberate weekly cadence.

### Pillar 3: Consumer cohort archetype and acquisition channels

The UK intermediate evidence-based lifter is reachable in a small number of measurable locations: r/Fitness (approximately 12 million subscribers, US-skewed but with UK active users), r/leangains, r/StrongerByScience, r/xxfitness, r/UKfitness (small, under 50k subs), the SBS Facebook group, the MASS subscriber base by association, and the comment sections of UK evidence-based YouTubers such as Geoffrey Verity Schofield and James Linker. Podcast audiences include Iron Culture (Eric Helms and Omar Isuf), MASS Office Hours, Revive Stronger with Steve Hall (UK), 3DMJ Podcast, and the Stronger By Science Podcast. SBS Podcast download numbers are not publicly disclosed by SBS, but Rephonic listed it among the top fitness podcasts globally before the format change in 2024.

Reddit conversion rates from organic founder participation in r/Fitness are not publicly benchmarked, but moderator behaviour is the limiting variable. r/Fitness has explicit anti-self-promotion rules; founders mentioning their own apps without prior moderator approval are typically banned. r/StrongerByScience and r/xxfitness are similarly strict. Smaller subreddits (r/UKfitness, r/leangains) tolerate transparent founder participation if 90% of activity is genuine community contribution and only 10% references the product (the widely-cited Reddit 90/10 norm). Conversion from a single high-quality Reddit comment to install is empirically in the low tens for a viral post, low single digits for typical posts; a published precise number does not exist for fitness apps.

Realistic install conversion at the £6.99 Complete price point from organic channels: Reddit organic conversion to install is roughly 1-3% of viewers of a relevant comment (extrapolated from broader subreddit referral data, not fitness-specific). YouTube comment-section organic mentions convert at 0.1-0.5% of comment readers. Podcast organic mentions on the founder's own appearances convert at 0.2-1% of listeners.

**Implications for Volyume**: The founder should pick three subreddits (r/UKfitness, r/leangains, r/StrongerByScience), declare affiliation transparently in his flair, contribute high-signal content for 8 weeks before mentioning the product, and only mention the product where a comment thread directly requests a tool. Plan for cumulative installs from Reddit in the low hundreds over the first year, not thousands. The single highest-leverage cold-start channel for the founder's audience archetype is being a guest on UK evidence-based podcasts, specifically Revive Stronger and any UK-based MASS or SBS adjacencies, because the audience overlap is 80%+ and host endorsement carries the conversion weight that cold posts cannot.

### Pillar 4: Viral coefficient of B2B coach-to-client conversion

Allan's model assumes one coach brings 10-20 clients. The published evidence is thinner than that assumption requires. Trainerize, MyPTHub and TrueCoach are coach-first platforms where the client app is free for the client and the coach pays. None publishes a "what percentage of mandated clients install" figure as a measured outcome. Anecdotal evidence from Trainerize and TrueCoach reviews (PT Pioneer, Assistant Coach blog) suggests that for an active coach with engaged clients, install compliance is high (plausibly 70-90%) because the client cannot interact with their coach without the app. Continuation after the coach relationship ends is much lower, because the value of the app to the client is the coach, not the software.

For Volyume specifically, the model is different in two ways. First, the coach pays and the client gets Complete free, which removes the client's pricing objection but does not remove activation friction. Second, Volyume's Complete tier has standalone value beyond the coach relationship (stalled-lift detection, deload prompts, TDEE adjustment, energy crash flag), which means a fraction of linked clients should retain after the coach link ends, unlike Trainerize where the app is essentially a delivery wrapper.

**Contested finding flag**: The 10-20 clients per coach assumption is roughly the right order of magnitude for the average UK online coach, who carries 15-40 active clients at any time. However, the assumption that all of them will install Volyume is the weak link. A realistic assumption is 50-70% of a coach's active clients will install if the coach is highly committed, dropping to 20-40% if the coach is using Volyume as one of several tools.

**Implications for Volyume**: Model coach virality conservatively. Use 8 linked clients per coach as the base case, 12 as the optimistic, 4 as the pessimistic. The "lifetime 50% off" anchor for the first 100 coaches matters more than the model suggests because it locks in advocates; a coach who built their delivery flow on Volyume at half price has strong switching costs. Build a coach success function: a single weekly call with new coaches in months 1-3 will do more for linked-client install rates than any in-app onboarding flow.

### Pillar 5: Pricing elasticity in UK consumer fitness-app market

Volyume's £2.99 Pro and £6.99 Complete sit below MacroFactor, which charges $11.99/month on the monthly plan or $5.99/month on the annual plan ($71.99/year) as of 2026 per NutriScan App's analysis and MacroFactor's own 2025 Annual Report. Carbon Diet Coach sits around $9.99/month. The published evidence on subscription-app pricing elasticity (RevenueCat State of Subscription Apps 2026, covering 115,000+ apps and $16B in revenue) is direct: download-to-paid median conversion is 1.4% for low-priced apps, 2.0% for mid, and 2.8% for high-priced apps. Higher prices in subscription apps are associated with higher trial-to-paid conversion and, in some studies, better first-renewal retention. This is the opposite of conventional retail intuition. The mechanism is selection: higher prices filter for higher-intent users.

The Recurly subscription analytics commentary explicitly warns that excessively low pricing attracts a less-committed cohort with worse retention (recurly.com/blog). Hevy's experience is the strongest case study from inside the category: their CEO told Sub Club they discovered that despite charging less than competitors, customers told them the product was superior, but the low price was anchoring the wrong cohort. Hevy ultimately leaned into virality rather than raising price, but the founder explicitly flagged the pricing-cohort trade-off.

For Volyume specifically, the £2.99 / £6.99 ladder has two risks. First, £2.99 Pro may attract subscribers whose intent is to "try the cheapest option" rather than "commit to evidence-based training," and these subscribers churn faster. Second, £6.99 Complete sits at a price point that signals "premium budget" rather than "premium," which may suppress conversion among users who associate evidence-based tooling with the MacroFactor and Carbon price band.

**Implications for Volyume**: The pricing undercut is not obviously a CAC advantage; published evidence weakly suggests the opposite. Treat the £2.99/£6.99 structure as a hypothesis to test in months 4-9, not a settled answer. Run a price test on 50% of new installs at £3.99 Pro / £7.99 Complete (still undercutting MacroFactor) and measure 90-day retention, not just trial conversion. If the higher-priced cohort retains better, raise. The cascade trial gates (14d Complete, 14d Pro, then Free) provide a built-in anchoring mechanism: users see Complete value first, anchor at £6.99, and then perceive Pro as the value tier.

### Pillar 6: Differential paywall, deterministic six triggers vs ML-optimised timing

The published evidence on personalised versus deterministic paywall and notification timing in mobile health apps is mixed and stage-dependent. The Samsung i80 BPM reinforcement-learning trial (PMC11612604) showed RL-personalised exercise prescription produced higher exercise intensity and user-reported satisfaction than fixed prescription, but the sample was modest and the outcome was engagement, not subscription conversion. A 2024 JMIR scoping review on ML methods for personalised persuasive strategies in mHealth (PMC11607567) found reinforcement learning is most commonly used for personalising timing of reminders, supervised learning for content. The review concludes personalisation outperforms fixed rules in most measured outcomes but flags that the threshold of training data required for ML to outperform deterministic rules is rarely reported.

In commercial app practice, the threshold below which ML-based paywall timing fails to beat well-designed deterministic rules is reported by Adapty, RevenueCat and Phiture as somewhere between 10,000 and 50,000 monthly paywall views per cohort, because ML approaches need enough events per arm to learn (adapty.io/blog/mobile-paywall-personalization). Spotify, Headspace and Calm publish very little methodologically clear data on this; their public statements about paywall optimisation centre on screen-level A/B testing of copy and price anchoring, not real-time ML inference on individual users.

For Volyume's six deterministic triggers (stalled lift, extreme soreness, deload, missing TDEE, block summary, energy crash) the relevant comparison is not "ML paywall optimisation" in the abstract, but specifically context-triggered prompts grounded in measurable user state. These are not paywall timing optimisations in the Spotify sense; they are clinical-style decision rules tied to product state. Published evidence on context-triggered behavioural prompts in mHealth (multiple JMIR studies) is consistent that state-triggered prompts outperform time-triggered ones at all sample sizes.

**Implications for Volyume**: Volyume will not hit the data volume required for ML paywall timing to beat its own deterministic rules in year one. Realistic year-one volume is in the low thousands of paywall views per month per trigger, well below the 10,000+ floor where ML starts to outperform. The six-trigger deterministic design is therefore correct on first principles given the constraints. The product team should not invest in ML paywall infrastructure until at least 30,000 monthly paywall views per trigger context, which Volyume is unlikely to reach before month 18-24 under any realistic scenario.

### Pillar 7: Retention benchmarks for paid fitness apps

Published retention benchmarks for paid fitness apps cluster as follows. Business of Apps (2024 data, drawing on AppsFlyer): "Health and fitness apps had 3% retention rate by day 30 in 2023" for free-tier installs, while subscription cohorts retain materially better. RevenueCat's State of Subscription Apps 2026 reports: "Utilities leads with 58.1% first-renewal retention while Health & Fitness is last at 30.3%" for paid subscribers, and annual trial subscribers retain at 19.9% at Day 380, monthly at 14.2%, weekly at 5.5%. Adapty's 2026 dataset reports median 30-day retention for top-performing fitness apps is roughly 47.5%, with category median closer to 8-12% on free, 25-30% on paid (adapty.io/blog/health-fitness-app-subscription-benchmarks).

For the £3-7/month price band specifically, no UK-isolated published data exists. The closest extrapolation is RevenueCat's observation that higher-priced subscribers retain better than lower-priced cohorts. On paywall structure, Adapty's State of In-App Subscriptions 2026 (16,000+ apps, $3B revenue) reports that "Hard paywall users generate 21% higher 1-year LTV and 8x higher Revenue Per Install at Day 14"; RevenueCat 2026 separately reports hard paywalls convert at 10.7% versus freemium's 2.1%, a 5x gap. Best-in-class fitness app retention (Strong, Hevy at peak, MacroFactor) is reported anecdotally as 30-day retention above 40% for trial-converted paid users, but neither company has published audited retention numbers. The bottom-quartile floor for paid fitness apps is approximately 8-12% Day 30 retention even after subscription, which means most low-price fitness subscribers churn within 60 days.

Churn drivers at each stage map to the Kidman et al. 2024 taxonomy (JMIR 26:e56897, DOI 10.2196/56897): early churn (Days 1-7) is dominated by onboarding friction and unmet expectations; mid churn (Days 7-30) by failure to form a daily habit; late churn (Days 30-90) by lack of visible progress; very late churn (Days 90+) by price sensitivity and life events. The "core users" floor where the curve stabilises is the cohort with at least three workouts logged in the first 14 days, which retains at roughly 3-4x the population rate.

**Multi-stage trial evidence flag**: The 28-day cascade trial (14d Complete, 14d Pro, Free with hold-at-any-stage) is structurally novel. RevenueCat's 2026 data shows trials of 17-32 days convert at a median of 42.5%, versus 25.5% for trials under 4 days (revenuecat.com/state-of-subscription-apps; adapty.io/blog/trial-conversion-rates-for-in-app-subscriptions). Adapty 2026 confirms: "Trials of 17 to 32 days show the highest median conversion at 45.7%, but they also see higher total cancellation rates — 51% of users on a 30-day trial will cancel before it ends, compared to just 26% on a 3-day trial." **No published empirical study exists on three-stage step-down trial structures.** Adapty notes Strava and Ladder have used two-stage reverse trials (full premium then downgrade) with claimed strong results, but no peer-reviewed benchmark is available. Volyume's cascade is therefore a hypothesis, not a settled best practice.

**Implications for Volyume**: Set the year-one target at 30% Day 30 paid retention and 18-22% Day 180 paid retention; these are realistic for a well-built UK fitness subscription with hard paywall after cascade trial. The cascade trial is a genuine experimental asset: instrument it heavily and publish results, because there is no published baseline. The "hold-at-any-stage" mechanic is a particularly testable feature; measure what proportion of users hold at Complete vs Pro vs Free at week 5, week 12 and week 24.

### Pillar 8: ASO for evidence-based fitness apps in the UK

App Store conversion rate benchmarks (AppTweak 2024, Adjust 2024) place Health & Fitness category-listing-page-to-install conversion at roughly 23-30% on the App Store and 23% on Google Play. For organic search traffic specifically, conversion is meaningfully higher than browse traffic because the user has shown intent. RevenueCat 2024 data: Health & Fitness median 6.7% trial-start rate from install, top performers 13.5%. The combined funnel of search-impression to paid Complete subscriber is therefore approximately: impression to product page 25-30%, product page to install 25%, install to trial start 6.7%, trial to paid 30-45% for fitness, giving a realistic blended search-impression-to-paid-Complete rate of roughly 0.15-0.5%.

UK-relevant keywords with measurable qualified install traffic for evidence-based lifters: "hypertrophy app," "macro tracker UK," "lifting tracker," "deload," "RIR tracker," "strength program," "evidence based training." Keyword volumes for these specific terms on the UK App Store are modest (low thousands per month for the longest tail), but conversion is high because they self-select for the target persona. Generic terms like "gym app" or "workout tracker" have higher volume but much lower trial-to-paid conversion because they pull in general fitness audiences who do not match Volyume's offering.

Best-practice ASO tactics that move the needle (App Radar 2026 and AppTweak 2024 consistent on this): app title containing primary keyword, subtitle differentiation, screenshots that surface specific features (the deload prompt, the TDEE adjustment) in the first three screenshots, regular updates every 4-6 weeks. AppTweak's 2025 ASO Benchmarks Report (analysing top 1,000 US apps, January through December 2024) states: "Custom product pages are widely underused: only 31% of apps and 26% of games used Custom Product Pages, but those that did saw up to +8.6% conversion rate lifts." App Preview video on the App Store has mixed evidence; AppTweak reports videos do not always outperform screenshots in Health & Fitness.

Published small-fitness-app cases that won on ASO alone are thin. The most useful documented case is Hercules, a French solo-built workout app, which reached roughly £2,500/month through ASO, blog content and off-store traffic (Indie Hackers interview). Hevy in its first year is the other useful case, with Guillem Ros explicitly stating they "did very little ASO in the early stages" but rode the App Store ranking algorithm via product-driven retention.

**Implications for Volyume**: Title should include "Hypertrophy Coach" or "Lifting & Macro Coach" with subtitle anchoring evidence-based positioning. Three Custom Product Pages on Apple (one for nutrition-led users, one for lifting-led users, one for coach-referred users) is the highest-leverage low-cost ASO investment. Plan for organic search to be the dominant install channel by month 6, contributing 60-70% of installs by month 12 if the product retains well enough to climb the rankings.

### Pillar 9: Acquisition channels with measured CAC for fitness apps

Reddit organic founder participation: zero direct cost, founder time only. No published CAC because Reddit organic is unattributable; realistic install-per-quality-comment is in the low single digits in target subreddits, scaling sub-linearly with effort. Most subreddits ban or shadow-ban founders who do not honour the 90/10 rule.

Podcast sponsorships: Rephonic's blended CPM range for podcast advertising is $18-$25 across all formats and lengths (rephonic.com/blog/podcast-ad-rates). For 60-second mid-roll host-read ads, the format relevant to fitness shows, multiple 2025-2026 benchmarks (ADOPTER Media, Castos, DesignRush, The Podcast Consultant) place the range at $25-$40 CPM. Stronger By Science Podcast does not publish ad rates; comparable evidence-based fitness shows charge approximately $30-50 CPM for 60-second mid-roll. Realistic install rate per 1,000 listens for a fitness app in target audience: 0.5-2%, giving CAC at $30 CPM and 1% install rate of roughly $3 per install. This is competitive but not breakthrough.

YouTube creator partnerships: pricing for mid-tier evidence-based UK creators (50k-500k subscribers) ranges roughly £500-£5,000 for an integration. Will Tennyson, James Linker and Mike Thurston are top-tier (1M+ subs) and price accordingly. CAC depends heavily on creator-audience fit; a tightly-matched UK evidence-based creator can deliver CAC of £5-£15 per install, a poorly-matched one £50+.

PR and editorial coverage: Strength & Conditioning Journal, MASS, and SBS articles do not run product reviews of apps as a paid placement; they may mention apps in research-context or comparison articles. There is no published path for a new app to earn an editorial mention in MASS within year one without an existing relationship.

Apple Featured and Google Play Editor's Choice: Apple publishes the criteria on developer.apple.com/app-store/getting-featured. Direct quote: "Whether you're an indie developer or a household name, you have an opportunity to be featured on the App Store... Featured selections are localized and regionally curated... please give our team a minimum of two weeks notice." Submission is via App Store Connect Featuring Nominations. Selection factors: accessibility, localisation, App Store product page quality, ratings. Published case studies of install lift: Apptopia 2017 measured average 1,747% download boost for App of the Day (techcrunch.com/2017/10/24), though this methodology has limitations and predates the current App Store layout. Phiture documented Headspace seeing 2-3.5x install lift when featured in editorials directly relevant to its value proposition, dropping to 15-50% lift for tangential editorials (phiture.com/asostack). Google's Editors' Choice apps had median rating 4.5 prior to selection (Sensor Tower analysis). **No fully documented bootstrapped small fitness app with both named publication coverage and audited install-lift numbers from an Apple feature was located** in current research.

Founder-as-channel: organic follower growth from a cold start by a single founder posting on X, Threads, Bluesky, Instagram and TikTok using own face and voice is realistic at 3-15k followers across all platforms in 12 months for a credible practitioner who posts consistently 4-6 times per week. Install conversion from this audience is approximately 2-5% over the audience lifetime. The dominant variable is whether the founder has visible practitioner credibility (deadlift numbers, evidence-based commentary, transparent build-in-public posts) rather than generic motivational content.

**Implications for Volyume**: The viable cold-start channel mix on a near-zero budget is roughly: 50% founder-as-channel on X and one video platform (Instagram or TikTok, not both), 25% Reddit and forum organic participation, 15% targeted podcast guest appearances on UK evidence-based shows, 10% ASO and Apple feature submissions. Paid channels become realistic only when MRR clears £3-5k.

### Pillar 10: What kills fitness apps in months 0-12, applied to Volyume

The Kidman et al. 2024 scoping review (JMIR 26:e56897, DOI 10.2196/56897, PMID 39693620) synthesised 22 abandonment drivers across 6 categories. Applied to Volyume's locked product and cold-start position, the top 5 churn risks for months 0-12 are:

**1. Unmet expectations on launch (Kidman category: app/user mismatch)**. Volyume is exposed because the cold-start audience finding the app early will include a tail of users expecting either a general fitness tracker (Hevy/Strong) or a Carbon-style nutrition app, not the hybrid evidence-based system Volyume offers. Early warning signal: high Day 1 drop-off from onboarding, low first-workout-log rate. Mitigation under constraints: tighten onboarding copy to explicitly disqualify non-intermediate lifters before the trial starts; the founder writes the disqualifier himself.

**2. Habit formation failure in Days 7-21 (Kidman category: ineffective design)**. The most predictive churn signal across the fitness category (RetentionCheck 2026 data): users who complete fewer than three workouts in the first 14 days churn at 3-4x the rate of users who establish a weekly habit. Volyume is exposed because no LLM means no personalised conversational nudge, no AI content means no generative engagement content. Early warning signal: workout-log frequency in the first 14 days. Mitigation: deterministic push-notification protocol tied to the six trigger contexts; a single founder weekly email to all trial users in the first 90 days written by hand.

**3. Price-cohort mismatch in Pro tier (Kidman category: cost concerns)**. The £2.99 Pro price point risks attracting users whose modal behaviour is to subscribe-and-forget. Early warning signal: low engagement metrics in the £2.99 cohort relative to the £6.99 cohort at Day 7. Mitigation: instrument cohort retention by entry price from day one; be willing to raise Pro to £3.99 or £4.99 if the £2.99 cohort shows materially worse 30-day engagement.

**4. Coach-link clients who never activate (Kidman category: lack of social support and ineffective design)**. If a coach pushes 10 clients to Volyume and 7 install but only 3 ever log a workout, the coach will switch back to Trainerize within 90 days. Early warning signal: client-install-to-first-workout rate per coach. Mitigation: founder-led 30-minute onboarding call with every coach who signs up in the first six months, focusing on how the coach should introduce the app to clients.

**5. Founder bandwidth collapse (not in Kidman taxonomy directly, but reads onto "lack of support" and "technical issues")**. The sole founder with a full-time external job is the single largest risk factor. Once a critical bug, a support escalation cluster, or a featuring opportunity coincides with a busy week at the day job, response quality drops, reviews suffer, and ranking follows. Early warning signal: median support response time exceeding 24 hours. Mitigation: pre-decide a hard limit (e.g., 12 hours per week, no more) and a written triage policy; on weeks where the budget is exceeded, defer feature work, not user response.

**Implications for Volyume**: Of the five, the second (Day 7-21 habit failure) is the most existential because it determines whether the App Store ranking algorithm sees Volyume as a retention winner. Treat the first 14 days of every user as the only KPI that matters for the first 90 days post-launch. The third (price-cohort mismatch) is the most likely to invalidate the model's revenue assumptions and should be tested early. The fifth (founder bandwidth) is the one most likely to compound the others.

---

## Part 2: Three Scenario Pathways

### Scenario A: Consumer-only path to £100k profit in 12 months (no B2B coaches)

To reach £100k profit (not revenue) in 12 months on consumer-only revenue requires roughly £130k-£150k gross revenue after Apple/Google fees (15-30%) and modest infrastructure costs of £15-25k. At a blended ARPU of £5 per paying user (mid-cascade weighted), this requires approximately 2,200 paying subscribers active at month 12, with a steady inflow building through the year.

Month-by-month cohort assumptions (conservative):
- Months 1-2: 200-400 installs/month from Reddit organic, founder-as-channel, ASO baseline. Trial start rate 30%, trial-to-paid 35% gives 20-40 net paying subscribers added per month after churn.
- Months 3-4: 600-1,000 installs/month as ASO climbs and first podcast appearances land. Adds 60-100 paying per month.
- Months 5-7: 1,500-2,500 installs/month if one Apple feature or a major podcast hit lands. Adds 150-250 paying per month.
- Months 8-12: 2,500-4,000 installs/month sustained, adds 250-400 paying per month, with churn of 8-12% per month against the base.

**Founder hours**: 12-18 hours per week sustained, with peaks around launches and features. Channel mix: 40% founder content production and posting, 25% community participation, 20% product fixes and ASO iterations, 15% support and customer conversations.

**Honest probability of hitting £100k profit consumer-only in 12 months**: 15-25%. This requires the App Store ranking algorithm to find Volyume by month 4-5 and at least one of (Apple feature, podcast inflection, single viral founder thread) to occur. The dominant failure mode is months 1-3 looking like "nothing is working" and the founder either burning out or pivoting prematurely.

### Scenario B: Mixed consumer + B2B coach path to £100k profit in 12 months

Mixed scenario assumes 30-50 coaches by month 12 (mostly at £29.99 base tier, some at £59.99 mid-tier, lifetime 50% off applied), contributing roughly £15-25k of annualised coach revenue plus an additional 250-450 linked-client subscribers (Complete free to client but the coach pays through their subscription). Direct coach revenue is modest; the leverage is the linked-client cohort, which acts as both retention proof for the App Store algorithm and a word-of-mouth multiplier.

Coach acquisition cadence: 1-3 coaches in months 1-3 (founder warm network and Revive Stronger/SBS adjacencies), 3-6 per month in months 4-8, 5-8 per month in months 9-12 as references compound. Coach CAC: zero in money terms, approximately 4-6 hours of founder time per acquired coach (initial outreach, demo, onboarding call, first week of support).

Consumer assumptions are similar to Scenario A but with a small uplift from linked-client virality and from coach-mentioned-in-content effects. Net total paying subscribers at month 12: roughly 2,000 direct consumer plus 30-50 coaches plus 300-450 linked clients.

**Honest probability of £100k profit at 12 months on the mixed path**: 25-35%. This is materially higher than consumer-only because coaches generate higher gross margin per founder hour and act as a retention floor.

### Scenario C: £1M ARR stretch, 24-36 month horizon

£1M ARR is a stretch goal that requires three out of five things to break right. The model in Allan's existing research (600 coaches plus 5,060 consumer Complete subscribers at £6.99) maths broadly works on paper: 600 coaches at a blended £45 average (lifetime 50% off applied to early cohort, full price on later) gives £324k/year; 5,060 Complete at £6.99 gives £424k/year; Pro tier and coach add-on features close the gap. The £1M total is achievable arithmetically.

The five things that must break right (with honest probability per item):

1. **The Apple App Store algorithm finds Volyume within 12 months** (~40% probability). Without this, the consumer side cannot reach 5,000+ Complete subscribers.
2. **The cascade trial outperforms single-tier 7-day trials on Day-180 retention by at least 5 percentage points** (~30% probability). This is structurally untested; if it works it becomes a defensible differentiator and a publishable result.
3. **The first 100 coaches at lifetime 50% off generate at least 60 references over the following 12 months** (~45% probability). This is the most controllable variable but requires founder discipline on coach success.
4. **At least one Apple feature or one MASS/Iron Culture/Revive Stronger host endorsement occurs in months 6-18** (~50% probability). This is the variable most amenable to founder effort.
5. **Pricing holds at £6.99 Complete without forcing a discount war with MacroFactor** (~70% probability). MacroFactor's pricing has been stable for over two years; competitive pressure on price is not the prime risk.

Joint probability of three-of-five: approximately 20-30%. Joint probability of all five: under 5%. Realistic timeline if three break right: £1M ARR achievable at month 30-36; if four or five break right, possible by month 24.

---

## Part 3: Three Sharpest Recommendations for First 90 Days Post-Launch

**Recommendation 1: Founder podcast guest tour on UK evidence-based shows.** What it is: Allan books himself onto 6-10 podcast episodes in the first 90 days, prioritising Revive Stronger (Steve Hall is UK-based, audience is exactly right), Iron Culture, MASS Office Hours, 3DMJ Podcast, and 2-3 smaller UK strength shows. Pitch is not "I built an app"; pitch is "I'm a UK practitioner who built decision-support tooling using deterministic rules without LLMs; here's what I learned about why most fitness apps fail at Day 21." Why top priority: this is the single channel where founder credibility transfers directly to a tightly-matched UK audience and where conversion is measurable through promo codes. Cost: founder time, roughly 4 hours per appearance including prep. Success metrics: Day 30, at least 2 episodes booked; Day 60, at least 4 published; Day 90, at least 6 published with a measurable install spike tied to each.

**Recommendation 2: Hand-crafted cascade trial instrumentation and weekly cohort review.** What it is: from day one, instrument every cascade stage transition (Complete trial start, Pro downgrade, Free hold, paid conversion, churn) and review weekly cohort retention against the previous week. Why top priority: the cascade is Volyume's most distinctive product asset and the variable with the largest impact on year-one revenue. Without instrumentation, the founder is flying blind on the most important decision in the model. Cost: zero in money, 2 hours per week founder time. Success metrics: Day 30, full cohort dashboard built; Day 60, first two cohorts compared; Day 90, first hypothesis on cascade stage with highest drop-off committed to writing.

**Recommendation 3: 50-coach personalised outreach campaign.** What it is: Allan identifies 50 named UK evidence-based online coaches (from SBS, 3DMJ, MASS Office Hours guests, UKSCA, Revive Stronger commenters), writes a 4-sentence personalised message to each, and tracks reply rates. Goal: book 10 demos, convert 3-5 to paid coach tier (using the 6-months-free, lifetime 50% off offer). Why top priority: this seeds the B2B engine before it needs to scale, builds Allan's reputation, and gives him 3-5 named coach references for month 4-6 outreach. Cost: zero money, approximately 20 hours over 90 days. Success metrics: Day 30, 50 messages sent, 10+ replies; Day 60, 6 demos booked; Day 90, 3 paid coaches plus 2 in trial.

---

## Part 4: What NOT to Do

1. **Don't run paid Meta or Google ads in the first 90 days.** Fitness app paid CAC for cold creative is typically £15-£40, and Volyume's ARPU does not support that until retention is proven. Wait until MRR exceeds £3k.

2. **Don't launch with programmatic SEO or AI-generated short-form video.** The brief excludes this, and the data supports the exclusion: Google's helpful-content updates penalise programmatic content, and AI-generated TikTok/Reels engagement collapsed through 2025-2026. Founder-face short-form is materially better.

3. **Don't pursue r/Fitness as a primary channel.** The 12-million-subscriber main subreddit has the strictest self-promotion enforcement of any fitness community. Founders are routinely banned. Smaller subreddits (r/UKfitness, r/leangains, r/StrongerByScience) are where realistic founder participation works.

4. **Don't aim for MacroFactor pricing parity.** The undercut is not a strong CAC lever (Pillar 5), but raising to £7.99/£11.99 also doesn't help on a cold start because the App Store conversion funnel is dominated by trust, not price. Hold the £2.99/£6.99 ladder, test £3.99 Pro in a controlled cohort at month 4-6.

5. **Don't build a Slack community, Discord server, or branded subreddit pre-launch.** All three require active moderation that the founder cannot sustain alongside a day job. Use the SBS subreddit and existing communities; do not try to create a new one in year one.

6. **Don't accept Apple Featured as a marketing strategy.** It is a flywheel multiplier, not a base channel. Submit nominations diligently every release but do not budget around the assumption that one lands.

7. **Don't outsource customer support to a bot or LLM in year one.** The brief excludes LLMs; the data supports this for an app where users are paying for evidence-based judgment. AI customer support deflection rates of 40-60% (Pylon 2024 data) require knowledge-base infrastructure Volyume does not have and degrades the trust signal at the moment that matters most.

8. **Don't pursue an early influencer paid deal with a 1M+ subscriber creator.** CAC at the £500-£5,000 integration tier for tier-2 UK creators is uncertain but defensible; a tier-1 deal at £20k+ in year one is reckless with the budget.

9. **Don't enter the US market in year one.** UK-first concentration is correct. Geographic dispersion before retention is proven dilutes the App Store ranking signal in any single market.

10. **Don't accept the "10-20 clients per coach" virality assumption without instrumentation.** Build the analytics to measure it from coach 1, and adjust the model monthly.

---

## Part 5: Open Questions for User Research or A/B Testing

**Hypothesis 1**: The cascade trial (14d Complete, 14d Pro, then Free) produces higher Day-180 paid retention than a single 14-day Complete trial. **Test**: A/B split new installs 50/50 from month 3. **Kill criterion**: if cascade arm's Day-90 paid retention is more than 3 percentage points below the single-trial arm by month 6, kill the cascade.

**Hypothesis 2**: £3.99 Pro retains better than £2.99 Pro at 30 and 90 days because of selection. **Test**: Random 50% of new Pro-converting users priced at £3.99 from month 4. **Kill criterion**: if £3.99 cohort 30-day retention is not at least 10% better than £2.99 cohort by month 7, revert.

**Hypothesis 3**: Coach-linked clients retain at 1.5x+ the rate of direct consumer subscribers at Day 90. **Test**: instrument from coach 1. **Kill criterion**: if linked-client Day 90 retention is not above direct consumer baseline by month 9, the B2B virality model is broken and coach acquisition should pause.

**Hypothesis 4**: The "stalled lift" deterministic trigger drives higher paywall conversion than the "block summary" trigger. **Test**: trigger-level conversion analytics from launch. **Kill criterion**: if any of the six triggers converts below 20% of the best-performing trigger after 1,000 paywall views, replace that trigger.

**Hypothesis 5**: UK evidence-based podcast appearances produce CAC under £5 per install. **Test**: episode-specific promo codes. **Kill criterion**: if average CAC across the first 6 episodes exceeds £15, deprioritise the channel and reallocate founder hours.

**Hypothesis 6**: Cold-DM outreach to evidence-based UK coaches converts at 5-8% to paid coach tier within 60 days of contact. **Test**: 50-coach pilot in first 90 days. **Kill criterion**: if conversion is under 3% by Day 90, the B2B cold-outreach channel is uneconomic at sole-founder bandwidth and needs redesign.

---

## Part 6: Pressure-Test of Allan's Existing Research Claims

**Claim 1: The £1M ARR math works at 600 B2B coaches plus 5,060 consumer Complete subscribers.**
Verdict: **directionally right, magnitude plausible but back-loaded.** The arithmetic is correct. The constraint is time: reaching 600 active coaches at a sole-founder cold-outreach rate requires 24-36 months realistically, not 12. The 5,060 Complete subscriber figure requires App Store algorithmic discovery to compound.

**Claim 2: B2B coaches act as a viral acquisition channel, each bringing 10-20 clients on average.**
Verdict: **directionally right but magnitude wrong.** UK online coaches do typically carry 15-40 active clients (IBISWorld), but install-and-activation rates for app switches range realistically 50-70% for engaged coaches and 20-40% otherwise. Realistic per-coach install number is 6-12, not 10-20. The model should use 8 as base.

**Claim 3: Programmatic SEO and AI-generated short-form video can substitute for paid acquisition.**
Verdict: **falsified.** Google's helpful-content updates of 2024-2025 penalise programmatic SEO at scale. AI-generated short-form video engagement on TikTok and Instagram Reels declined materially through 2025. Founder-face content from a credible practitioner massively outperforms AI-generated content for this audience. The brief's exclusion of LLM and AI marketing is supported by the evidence, not just by principle.

**Claim 4: AI customer support can deflect 70-86% of tier-1 inquiries.**
Verdict: **directionally right in published vendor benchmarks but not applicable to Volyume.** Pylon's published data shows 40-60% as realistic for AI deflection in B2B SaaS, with 86% as a best-case (BQE Software via CustomGPT case). The mathematically achievable range exists. But the brief excludes LLMs in product, which is the correct call for a small evidence-based fitness app where trust is the moat. Manual response from the founder is the right answer in year one regardless of deflection theory.

**Claim 5: The pricing undercut (£2.99 vs MacroFactor's £9.50) is a customer-acquisition lever.**
Verdict: **falsified directionally.** RevenueCat State of Subscription Apps 2026 (115,000+ apps, $16B revenue) reports download-to-paid medians of 1.4% for low-priced, 2.0% for mid, and 2.8% for high-priced subscription apps. Higher-priced subscription apps achieve better Day-35 conversion and, in Adapty's parallel dataset, materially better retention. Lower price is associated with worse cohort quality. The undercut is at best neutral, possibly negative for unit economics. The £2.99 Pro tier specifically may be too low. Test £3.99-£4.99 from month 4-6.

**Claim 6: The DUAA 2025 and UK GDPR posture is a regulatory moat against less disciplined competitors.**
Verdict: **directionally right but practically thin as a moat.** The DUAA 2025 (Royal Assent 19 June 2025, main provisions in force 5 February 2026 per DLA Piper analysis at privacymatters.dlapiper.com/2026/02) provides a UK-specific regulatory environment, and competitors like MacroFactor and Carbon operate primarily under US/EU GDPR frameworks. UK-first compliance is a legitimate differentiator for UK consumers concerned about data residency, but the consumer base who actively cares about this is small. The DUAA's PECR fines now reaching UK GDPR levels (up to £17.5m or 4% of turnover, per Harper James 2026 analysis) create real downside risk for non-compliant competitors but do not generate inbound demand for Volyume. Treat as a hygiene factor and a defensive moat, not a marketing claim.
