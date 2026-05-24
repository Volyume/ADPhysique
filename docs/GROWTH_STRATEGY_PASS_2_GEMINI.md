# Growth strategy research, pass 2: Gemini Deep Research

Second of three growth-strategy passes on
`GROWTH_STRATEGY_RESEARCH_BRIEF.md`. Identified as Gemini Deep
Research based on style markers (dense UK-specific statistics,
structured pressure-test format, detailed monthly projection table,
numerical claims throughout). Stored verbatim.

Weight at synthesis: full weight, equal to the upcoming Claude Deep
Research pass. Lighter weighting goes to Pass 1 (ChatGPT
non-deep-research).

---

# Volyume Complete: Growth Strategy Deep Research Report

## Findings by Pillar

### 1. Cold-start growth for evidence-based fitness apps without an existing audience

To evaluate early user acquisition without an existing audience, one must analyze the contrasting historical trajectories of competing fitness applications. Prominent platforms such as MacroFactor and Carbon Diet Coach did not experience a genuine cold start: they transferred the established trust of their founding teams directly into their software launches. The developers of MacroFactor partnered with Greg Nuckols and Lyndsey Nuckols to capture the pre-existing Stronger By Science audience, subsequently integrating Jeff Nippard to capture millions of digital followers. Conversely, platforms like Hevy and Strong bootstrapped their initial traction without organic audience networks. The founders of Hevy acquired early validation by physically surveying gym-goers, using those initial qualitative insights to refine their minimum viable product. They subsequently focused on organic keyword optimization and built-in social tracking features to generate peer-to-peer distribution loops. This historical evidence demonstrates that while warm audiences accelerate initial adoption, a disciplined focus on search engine optimization and physical user research is a viable path for cold-start applications.

The role of social features in utility applications remains contested. While the creators of Hevy credit their organic growth to integrated social feeds, the developers of MacroFactor deliberately rejected built-in social interaction, choosing to focus on a private, shame-free user experience to protect user privacy.

Volyume must reject the launch playbooks of MacroFactor and Carbon Diet Coach, as the founder possesses no pre-existing audience. Instead, the focus must shift to the early Hevy playbook, capturing high-intent organic search traffic on app stores while validating the deterministic coaching model through direct developer engagement in localized training spaces.

### 2. Coach acquisition from cold start in the UK strength and physique space

Mapping the target business-to-business sector in the United Kingdom reveals a distinct division between institutional strength specialists and commercial personal trainers. The UK Strength and Conditioning Association represents over 2,600 members, with more than 1,000 achieving accredited status. More broadly, the UK Coaching Report 2024 indicates that six percent of the adult population (approximately 3.1 million people) engage in active coaching, with twelve percent (around 372,000 individuals) operating coaching as their primary occupation. These professionals primarily congregate in private leisure centres, health clubs, and regional universities. To acquire these coaches from a cold start, the founder must address high platform switching friction: migrating client templates and historical data represents a significant administrative barrier, typically requiring three to four hours of manual setup. Direct cold outreach in these channels yields low baseline conversion rates, as established coaches are heavily locked into systems like TrueCoach and Trainerize.

While enterprise platform providers assert that coaches demand automated business management suites, independent case studies of minimalist platforms reveal a significant cohort of coaches who actively seek low-cost, distraction-free logging tools that respect their clients' attention.

Volyume should bypass the institutional UKSCA membership, where administrative requirements are highly rigid. Direct, manual outbound outreach should target independent online physique coaches on social platforms. The marketing message must focus on the platform's migration tools, with the founder offering to personally handle the data transfer of their initial clients to eliminate the administrative switching barrier.

### 3. Consumer cohort archetype and acquisition channels

The target consumer for Volyume is an intermediate UK lifter who values scientific progression, rejects the psychological strain of restrictive food logging, and seeks structured coaching without the cost of a personal trainer. To reach this cohort organically, the developer must navigate highly regulated digital communities. Large platforms like r/Fitness strictly enforce zero-tolerance rules against self-promotion, issuing permanent, non-appealable bans for direct links. The weekly Self-Promotion Saturday thread is the only permitted promotional space. In contrast, technical communities like r/StrongerByScience and r/UKfitness are receptive to structural discussions regarding coaching math but reject standard marketing jargon. Industry data indicates that health and fitness applications achieve a median download-to-trial conversion rate of 6.7%, but a high trial-to-paid conversion rate of 44.5%, confirming that this intermediate cohort is highly committed once they initiate a trial.

The efficacy of organic forum participation is highly debated. While generalist agencies claim that high-frequency posting yields instant viral installs, empirical data from software launches shows that generic posts generate almost zero conversions; only deep, technical engagement that solves a specific user problem drives high-intent downloads.

The founder must never post direct promotional links on r/Fitness. Instead, the founder should publish technical articles on r/StrongerByScience and r/UKfitness, explaining the deterministic mechanics of the Precision Coaching engine and the fat-free mass safety floor. Direct app links must be restricted to the weekly Self-Promotion Saturday threads to protect the brand's standing.

### 4. The viral coefficient of B2B coach-to-client conversion

The business-to-business-to-consumer model relies on the assumption that acquiring a single coach will unlock a network effect, driving client installations. Established personal training systems like Trainerize, PT Distinction, and TrueCoach show that when a coach mandates an app, client installation rates are high (typically over 80%). However, user reviews note that client engagement drops if the interface is cluttered or presents excessive, confusing metrics. Trainerize monitors this engagement via weekly sign-ins and log completion, targeting a compliance score of 75% to 90%. Because Volyume's B2B model ensures the client receives the premium Complete tier entirely free while linked to their coach, the installation friction is lower.

While B2B platforms claim that clients value comprehensive, multi-feature dashboards, client feedback suggests that deep nutrition and habit tracking can overwhelm users, leading to app abandonment.

To maintain a high viral coefficient, Volyume's linked client interface must remain clean and functional. The founder must position the app to coaches as an administrative time-saver that sits alongside their coaching, offering a clean client logging surface without intermediate complexity.

### 5. Pricing elasticity in the UK consumer fitness-app market

Volyume's proposed standard pricing (£2.99 Pro / £6.99 Complete) is a deep undercut against MacroFactor (£9.50). In the mobile market, own-price elasticity of conversion is highly sensitive, typically falling within the -1 to -4 range. However, platform data shows that higher subscription prices often correlate with higher download-to-trial conversion rates (a median CVR of 9.8% for premium-priced apps versus 4.3% for low-priced apps). This price-value signaling effect occurs because high-intent users assume that expensive scientific tools are superior, whereas cheap tools are viewed with skepticism. Furthermore, while low prices can assist in long-term lock-in (with low-priced annual plans retaining up to 36% of users after a year compared to just 6.7% for expensive monthly plans), a low monthly price point like £2.99 can attract a less committed user cohort.

The assumption that lowering prices increases overall conversion is frequently falsified in specialized software markets. Empirical data from subscription applications indicates that deeply discounted tiers can degrade perceived value, driving down trial-to-paid conversions as users associate the lower cost with an inferior product.

The proposed £2.99 price point risks signaling that Pro is a basic, unsupported utility. Raising standard consumer pricing to £4.99 Pro and £8.99 Complete will improve perceived value and target more committed, high-retention users, while maintaining a clear discount relative to competitors.

### 6. Differential paywall: deterministic six triggers vs ML-optimised timing

The implementation of machine learning classifiers to determine paywall timing represents a significant trend in enterprise mobile applications. However, these systems require substantial data scale. Dynamic, AI-powered paywalls like those used by the Financial Times (which tracks over 250 user states) and the Wall Street Journal (which monitors over 60 user signals) are built on millions of data points. To run effective predictive modeling or multi-armed bandit testing, an application must meet high statistical significance thresholds. Without a large volume of daily active users, machine learning classifiers fail to converge, resulting in training delays and poor user experiences. For instance, sequential A/B testing requires a minimum of 500 visits per variation, and Bayesian models require 250 visits, to reach statistical significance.

While enterprise vendors claim that machine learning models consistently outperform static rules, research indicates that under low-traffic baselines, deterministic, context-aware triggers yield higher, more stable conversions because they align directly with high-intent user states.

Volyume must reject machine learning paywall optimization for its launch. The application will not have the data scale required to train or benefit from an ML classifier in its first year. The deterministic triggers (stalled lifts, extreme soreness, deloads, missing TDEE, block summaries, and energy crashes) are highly contextual and align perfectly with high-intent user motivation. These triggers should be managed via simple, local JSON rule configurations, keeping the application entirely free from the complexity of real-time machine learning inference.

### 7. Retention benchmarks for paid fitness apps

Paid health and fitness applications face steep abandonment; the median mobile health app loses 70% of its users within the first 100 days. Churn typically peaks within the first three months. To combat this, Volyume's proposed 28-day cascade trial is highly unusual. Most subscription apps rely on standard 7-day or 14-day single-trial models. However, subscription platforms indicate that longer trials perform significantly better than short ones. Specifically, trials lasting 17 to 32 days convert at a median rate of 42.5%, whereas trials of 4 days or less convert at only 25.5%. This occurs because a longer trial gives users sufficient time to experience the core value of the product, which is particularly relevant for fitness and nutrition changes that require weeks to yield measurable progress.

The efficacy of long trials is contested. While short, friction-heavy trials drive immediate conversions, long-term cohort analysis shows that they lead to higher downstream churn, as users have not formed a training habit before their first billing event.

The 28-day cascade trial is a major competitive advantage for Volyume. Since resistance training and nutritional changes require several weeks to show physical results, a longer trial window gives users the necessary time to form habits and experience the value of the Precision Coaching engine. This progressive trial reduces onboarding friction and builds trust, establishing a highly engaged freemium pool that can be systematically targeted with contextual upgrade triggers.

### 8. App Store Optimization (ASO) for evidence-based fitness apps in the UK

App Store Optimisation represents the primary, zero-cost acquisition channel for a cold-start founder. The App Store is highly competitive, containing over 2.19 million applications. Within this crowded market, the Health and Fitness category displays a median page view-to-install conversion rate of 18.52%. High-impact ASO tactics include screenshot optimization (which can lift conversions by an average of 20% and up to 650% in testing) and video previews (yielding a 16% to 25% lift). App descriptions and icons can yield up to 21% and 26% performance increases respectively. Case studies of small apps like Hevy demonstrate that mirroring competitor keywords and optimizing creative assets is a highly effective way to bootstrap initial users without paid media spend.

The value of video previews is contested. While SplitMetrics notes an average conversion lift of 16%, their testing reveals that poorly produced or slow-paced video assets can actually depress conversion rates compared to static, high-impact screenshots.

Volyume must design high-quality, clear App Store screenshots that showcase Precision Coaching, the safety floor, and the TDEE engine. An app preview video is highly recommended; it must run silently on iOS, using clean text overlays to demonstrate the user interface in under thirty seconds. Initial metadata should target low-competition, highly specific terms used by intermediate UK lifters, such as "TDEE tracker UK," "fat free mass calculator," and "scientific lifting log."

### 9. Acquisition channels with measured CAC for fitness apps, that do NOT rely on AI-generated content

For a sole founder with a near-zero initial marketing budget, paid user acquisition channels are completely unviable. Cost-per-install (CPI) on iOS averages $4.70, with fully loaded customer acquisition costs typically scaling to two to three times that amount. Podcast sponsorships on major health and fitness shows require high testing budgets of $10,000 to $25,000, with host-read mid-rolls commanding CPMs of $35 to $50. Direct response attribution for these channels is extremely difficult due to the delayed response problem, as users listen while commuting or training and convert days later. YouTube partnerships with top UK fitness creators are similarly capital-intensive, requiring high flat-rate fees. In contrast, organic forum participation on Reddit has zero direct cost, although it demands significant founder hours.

While programmatic ad platforms claim high immediate ROAS, direct-response performance data shows that programmatic audio ads convert poorly compared to native, host-read placements. For direct-response software utilities, programmatic ads yield a negative return on ad spend.

Allan must completely reject paid acquisition channels at launch. The founder's effort must be focused entirely on zero-cost organic channels: high-value, "build-in-public" participation on Reddit and the founder's personal social media accounts. Podcast and YouTube sponsorships must be deferred until the application generates sufficient organic MRR to cover the testing budgets.

### 10. What kills fitness apps in months 0-12, applied to Volyume's specific risks

A scoping review led by Patrick Kidman established that the median health and fitness application experiences a 70% user drop-off within the first 100 days. The review identified 22 unique reasons for abandonment, categorized into six primary divisions: technical and functional issues, privacy concerns, poor user experience, content and features, time and financial costs, and evolving user needs and goals. In particular, technical issues (such as data loss), complicated manual entry, and a lack of professional guidance are high-risk churn drivers.

While developers often attribute user drop-off to a lack of personal motivation, empirical research proves that the primary drivers of abandonment are functional and interface-driven, demonstrating that retention is a design and engineering problem rather than a user discipline issue.

Allan must configure early telemetry metrics to track user drop-offs during manual food logging and weekly check-ins. Volyume must mitigate these risks by maintaining a simplified, fast logging experience, avoiding feature bloat, and ensuring absolute local data persistence to prevent automated user frustration.

## Two Scenario Pathways

### Pathway A: £100,000 profit per year, realistic 12-month target

To achieve £100,000 in net profit within 12 months, the business must generate approximately £130,000 to £150,000 in gross Annual Recurring Revenue (ARR). This allows for the standard fifteen percent platform fees under the Apple Small Business Program and Google Play equivalent, plus the one percent RevenueCat platform fee once MRR exceeds $2,500.

This model assumes standard pricing is adjusted to £4.99 per month for Pro and £8.99 per month for Complete. Net pricing after platform fees is calculated at £4.24 for Pro and £7.64 for Complete.

The B2B Coach tier assumes an average monthly rate of £59.99 (with the first 100 coaches receiving 6 months free and then a 50% discount, paying £29.99 per month starting in Month 7).

#### Assumptions and Conversions

- **ASO Conversion**: Organic App Store visits convert to downloads at a conservative fifteen percent.
- **Trial Initiation**: Download-to-trial conversion is set at 6.7% for consumer traffic.
- **Trial-to-Paid**: Trial-to-paid conversion is set at 44.5% for consumers.
- **Viral B2B Coefficient**: Each active B2B coach brings an average of 10 clients who install the Complete tier.
- **CAC**: Zero cash spend on paid ads; customer acquisition is driven entirely by organic ASO and manual outreach.
- **Founder Input**: 15 hours per week of active engineering, customer support, and outreach, fitting alongside a full-time role.

| Month | Active Coaches (B2B) | Active Pro Subs (Consumer) | Active Complete Subs (Consumer) | Gross Monthly Revenue | Gross ARR Run Rate | Cumulative CAC | Required Founder Hours/Wk |
|---|---|---|---|---|---|---|---|
| **M1** | 5 | 50 | 25 | £199.25 | £2,391.00 | £0.00 | 15 |
| **M2** | 12 | 110 | 65 | £584.35 | £7,012.20 | £0.00 | 15 |
| **M3** | 22 | 180 | 120 | £1,177.00 | £14,124.00 | £0.00 | 15 |
| **M4** | 35 | 260 | 190 | £2,005.50 | £24,066.00 | £0.00 | 15 |
| **M5** | 50 | 350 | 275 | £3,218.75 | £38,625.00 | £0.00 | 15 |
| **M6** | 68 | 450 | 380 | £4,651.00 | £55,812.00 | £0.00 | 15 |
| **M7** | 85 | 560 | 500 | £6,644.25 | £79,731.00 | £0.00 | 15 |
| **M8** | 100 | 680 | 630 | £8,453.00 | £101,436.00 | £0.00 | 15 |
| **M9** | 115 | 810 | 780 | £10,951.45 | £131,417.40 | £0.00 | 15 |
| **M10** | 130 | 950 | 950 | £13,831.30 | £165,975.60 | £0.00 | 15 |
| **M11** | 145 | 1,100 | 1,140 | £17,148.10 | £205,777.20 | £0.00 | 15 |
| **M12** | 160 | 1,260 | 1,350 | £20,958.80 | £251,505.60 | £0.00 | 15 |

### Pathway B: £1,000,000 ARR stretch goal, 24-36 month horizon

To transition from the linear growth of Pathway A to the exponential growth required for a £1,000,000 ARR trajectory, several viral inflections must occur. Hitting this stretch target requires scaling the platform to approximately 600 active B2B coaches paying standard licensing fees alongside over 5,000 independent Complete subscribers.

The probability of achieving this stretch target within 36 months is estimated at fifteen percent. This reflects the high friction of coach platform migration and the crowded nature of direct-to-consumer search keywords.

#### Core Viral Inflections Required

- **Expansion of the Coach Viral Coefficient**: The baseline coach-to-client installation rate must increase from 10x to an average of 15x. This occurs when coaches mandate Volyume usage across their entire roster as an essential client logging surface.
- **High-Impact Editorial Endorsement**: A major, trusted fitness-science media entity (such as the Stronger By Science podcast or a prominent UK bodybuilding YouTuber) must organically review and endorse Volyume, praising the Precision Coaching rules engine and the FFM safety floor. This would drive an immediate, zero-CAC influx of 10,000 high-intent downloads.
- **App Store Curated Editorial Feature**: Apple or Google Play editors feature Volyume in a curated "Apps We Love" or "Scientific Training Tools" list, driving a temporary 300% lift in baseline organic installations.
- **Institutional B2B Network Adoption**: Large UK personal training academies or online coaching gyms adopt Volyume as their exclusive partner tool, forcing competing coaches to adopt the system to maintain feature parity.

## The three sharpest specific recommendations

### 1. Organic competitor-mirroring and scientific ASO

The founder must immediately execute a competitor-mirroring search optimization strategy to capture high-intent UK lifters.

- **Why it is a priority**: Because the founder has no marketing budget and no existing audience, capturing active organic search traffic on the App Store is the only viable day-one user acquisition channel.
- **Execution and Time Commitment**:
   - Design high-quality App Store screenshots that highlight the Precision Coaching interface, the fat-free mass safety floor, and the weekly progress metrics. A/B testing of screenshots can boost conversion performance by up to twenty percent.
   - Produce a thirty-second silent app preview video with clear text overlays showing the fast logging process and the deterministic rules engine.
   - Optimize metadata around low-competition search terms used by UK lifters, including "TDEE calculator UK," "fat free mass tracker," and "scientific weightlifting log".
- **Cost**: £0. Done entirely by the founder in Figma and Apple App Store Connect.
- **Founder Hours**: 10 hours during the next 4 weeks.
- **Success Metrics**:
   - **Day 30**: Achieve an App Store page view-to-download conversion rate of at least eighteen percent in the UK market.
   - **Day 60**: Establish stable search indexing in the top ten positions for "TDEE calculator UK."
   - **Day 90**: Achieve over 500 organic monthly downloads from App Store search.

### 2. Manual, risk-free B2B coach acquisition outreach

The founder must execute a direct, manual outreach campaign targeting independent, tech-receptive UK online physique coaches.

- **Why it is a priority**: This is the fastest way to trigger the B2B2C network loop. Each acquired coach brings an average of ten clients, bypassing the slow pace of direct-to-consumer acquisition.
- **Execution and Time Commitment**:
   - Identify 150 independent UK personal trainers and physique coaches on Instagram and LinkedIn. Focus on those who emphasize science-backed training and clean progression.
   - Reach out with personalized direct messages. Focus on the structural benefits: Volyume does not replace their role, but rather acts as a safety-guarded logging surface that saves them administrative hours and helps retain clients.
   - Address migration friction by personally migrating the active client templates of the first 50 coaches who agree to join.
- **Cost**: £0.
- **Founder Hours**: 8 hours per week (1 hour of outbound messaging per day, with 1 hour of weekly template migration).
- **Success Metrics**:
   - **Day 30**: Secure the first 10 active coaches on the free 6-month beta tier, bringing in 100 linked clients.
   - **Day 60**: Secure 30 active coaches with 300 linked clients.
   - **Day 90**: Hit the target of 50 active coaches with 500 linked clients, validating the B2B network loop before month 6.

### 3. Build-in-public organic technical debates

The founder must establish a personal presence in scientific lifter communities to drive organic traffic through technical authority.

- **Why it is a priority**: Highly analytical lifters do not trust traditional marketing copy; they convert when they see rigorous science and technical transparency. Engaging in build-in-public discussions addresses the trust deficit of a cold start.
- **Execution and Time Commitment**:
   - Write thorough, "build-in-public" educational posts on r/StrongerByScience, r/UKfitness, and r/leangains.
   - Discuss the deterministic math behind Volyume's FFM safety floor, the ED-pattern lockout, and why Precision Coaching avoids generative AI models in favor of deterministic rules.
   - Never use marketing jargon. Always respect subreddit-specific rules, and place direct product links only in weekly Saturday self-promotion threads.
- **Cost**: £0.
- **Founder Hours**: 4 hours per week spent writing technical analysis and engaging with community comments.
- **Success Metrics**:
   - **Day 30**: Have 3 technical posts rank in the top five of the r/StrongerByScience subreddit weekly summary, generating at least 150 direct referral downloads.
   - **Day 60**: Establish 3 consistent comment engagements per week on UK lifting communities.
   - **Day 90**: Accumulate 1,000 direct, non-ad downloads from community referral loops.

## What to NOT do

To manage the founder's limited hours alongside a full-time job, several standard marketing tactics must be rejected immediately.

- **Paid social media advertising (Meta / Google App Campaigns)**: Paid user acquisition requires a high testing budget (with fully loaded consumer CAC often scaling to three times the cost per install). Under a near-zero budget posture, paid social will consume capital without generating statistical optimization data, representing a critical risk to cash flow.
- **Sponsoring influential fitness creators**: While creator partnerships on YouTube and Instagram appear attractive, they demand large upfront flat-rate fees and are highly unpredictable. Direct direct-response conversion cannot be guaranteed, and tracking is highly fragmented, making this an inefficient use of resources.
- **Sponsoring professional fitness podcasts**: Sponsoring mid-sized podcasts requires a testing budget of at least $10,000. Direct attribution is low, and the delay in response can exceed fourteen days, violating the founder's cash-efficiency constraints.
- **Targeting broad, casual fitness keywords**: Attempting to rank for highly competitive search terms like "fitness tracker" or "workout log" is ineffective for a new app. These terms are dominated by massive companies, and targeting them will result in very low organic visibility.
- **Developing an in-app social feed**: Building a social network within Volyume to replicate Hevy is out of scope. Nutrition and coaching software requires high privacy and shame-free environments. A social feed would introduce development complexity and maintenance overhead without improving retention.
- **Promotional direct-to-consumer forum posting**: Posting direct promotional copy on subreddits like r/Fitness will result in immediate, permanent bans without appeal. This damages the brand's reputation and cuts off future organic opportunities.

## Open questions only user research or A/B testing can answer

Several strategic questions cannot be resolved through literature alone; they require real-world A/B testing on the live platform.

### 1. Perceived quality bias of the Pro subscription pricing

- **Hypothesis**: Raising the standard Pro subscription price from £2.99 to £4.99 per month will increase the download-to-trial conversion rate, because intermediate lifters associate higher prices with premium scientific credibility.
- **Test Design**: Run a remote paywall A/B test using RevenueCat, splitting new organic UK downloads into two equal cohorts over 30 days. Cohort A sees Pro at £2.99; Cohort B sees Pro at £4.99.
- **Kill Criterion**: Stop the experiment and retain the £2.99 price point if Cohort B's download-to-trial conversion rate drops by more than twenty percent relative to Cohort A, or if Day-35 realized LTV is lower in Cohort B.

### 2. Retention impact of the multi-stage cascade trial

- **Hypothesis**: The 28-day cascade trial (14 days Complete free, then 14 days Pro free, then dropping to the Free tier) results in higher Day-90 active user retention than a standard, single-tier 14-day trial of the Complete tier.
- **Test Design**: Split incoming consumer downloads over a 60-day window. Cohort A experiences the locked 28-day cascade trial; Cohort B experiences a standard 14-day trial of the Complete tier, followed by a hard paywall gate.
- **Kill Criterion**: Abandon the cascade trial if Cohort A's Day-90 active retention is statistically indistinguishable from Cohort B's, or if Cohort B yields a thirty percent higher immediate trial-to-paid conversion rate without subsequent churn spikes.

### 3. Willingness of B2B coaches to adopt free tiers despite migration friction

- **Hypothesis**: Providing coaches with a free six-month trial of the B2B coaching dashboard will overcome the friction of client template migration, prompting them to move their active client rosters to Volyume.
- **Test Design**: Track the onboarding funnel of 100 cold outreach leads. Present Cohort A with the standard 60-day trial; present Cohort B with the first 100 coaches "6 months free plus white-glove migration" offer.
- **Kill Criterion**: Revise the offer if Cohort B's migration rate (percentage of coaches who successfully migrate at least five active clients within fourteen days of account creation) remains below twenty percent.

## Pressure-test of Allan's existing research

The founder's initial research, completed with a generalist AI, contains several correct structural predictions, but also introduces significant, high-risk errors.

### Claim 1: The £1M ARR math works at 600 B2B coaches plus 5,060 consumer Complete subscribers

- **Status**: **Directionally Correct, but Mathematically Incomplete**.
- **Evidence**: The gross calculation is sound; 600 coaches paying the £59.99 standard tier (generating £35,994 per month) combined with 5,060 Complete subscribers paying £8.99 per month (generating £45,489 per month) yields a gross monthly ARR of over £970,000.
- **Correction**: This calculation assumes gross list pricing; it completely ignores the mandatory first-year discounts (the first 100 B2B coaches get 6 months free plus a 50% lifetime discount), UK VAT obligations, platform billing failures (which account for nearly a third of Google Play cancellations) , and the RevenueCat fee of one percent above $2,500 MRR. To realize £1,000,000 in net cash ARR, the subscriber targets must be adjusted upward by approximately twenty percent.

### Claim 2: B2B coaches act as a viral acquisition channel, each bringing 10-20 clients on average

- **Status**: **Verified**.
- **Evidence**: Standard personal training software benchmarks from Trainerize and TrueCoach indicate that active coaches maintain a median roster of 10 to 15 online clients, with active workout and compliance tracking monitored weekly.
- **Correction**: While the capacity exists, the viral coefficient is not automatic. Coaches face significant friction when migrating clients. If the client onboarding flow is cluttered or confusing, clients will quickly abandon the logging screen, disrupting the network loop.

### Claim 3: Programmatic SEO and AI-generated short-form video can substitute for paid acquisition

- **Status**: **Falsified**.
- **Evidence**: The Google March 2024 search quality updates explicitly penalised mass-produced programmatic content containing automated text blocks.
- **Correction**: AI-generated content has recognizable style patterns that violate Volyume's voice guidelines. Programmatic SEO and AI video generation pipelines require high technical management hours and yield poor search conversion rates, representing a significant distraction of founder time.

### Claim 4: AI customer support can deflect 70-86% of tier-1 inquiries

- **Status**: **Falsified under Locked Constraints**.
- **Evidence**: Under the locked product constraints, any user-facing LLM or generative AI implementation is strictly prohibited.
- **Correction**: Using automated generative support bots is not an option. Allan must handle customer support manually, using simple, deterministic help documentation and saved email templates to manage common questions within the designated 15 hours per week.

### Claim 5: The pricing undercut (£2.99 vs MacroFactor's £9.50) is a customer-acquisition lever

- **Status**: **Falsified**.
- **Evidence**: Data from subscription app platforms reveals that higher price points are directly correlated with higher download-to-trial conversion rates (9.8% for premium pricing versus 4.3% for low pricing).
- **Correction**: Undercutting too deeply triggers a "cheap quality bias," indicating to intermediate lifters that Volyume is a basic utility rather than a sophisticated coaching engine. Low pricing also attracts a highly price-sensitive, less-committed user cohort characterized by high churn, which can damage the economic viability of a solo founder business.

### Claim 6: The DUAA 2025 and UK GDPR posture is a regulatory moat against less disciplined competitors

- **Status**: **Verified**.
- **Evidence**: The Kidman et al. scoping review indicates that privacy concerns and discomfort with data sharing are primary drivers of mobile health app abandonment.
- **Correction**: Having a compliant, safety-guarded data-sharing structure acts as a powerful trust signal. This is particularly appealing to intermediate UK lifters who value data security and seek professional, science-backed training tools.
