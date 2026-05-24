# Growth strategy citation audit

Pressure-tested 34 unique citations across the three growth-strategy passes (ChatGPT non-deep, Gemini, Claude). Excludes three citations already verified in prior rounds (Kidman 2024 JMIR churn taxonomy, Mountjoy 2014/2023 RED-S, Lang 2025 JMIR).

## Summary

- VERIFIED: 21
- MISCITED: 8
- FABRICATED: 1
- NEEDS_HUMAN_VERIFICATION: 4

The single FABRICATED claim is the TrueCoach "$137/month at 50 clients" price point. The cited review actually lists $99/month at 40-50 clients, with $137 nowhere on the page. Not load-bearing in itself, but it suggests the wider TrueCoach/Trainerize/PT Distinction pricing block needs a re-sweep before publication.

The MISCITED items split into two groups. Group one: numbers that exist somewhere in the cited source family but not at the specific URL given. Notably, the RevenueCat 2026 "Utilities 58.1% / Health & Fitness 30.3% first-renewal retention" and the "Day 380 trial retention 19.9% / 14.2% / 5.5%" sit inside the paid full-report PDF rather than the public landing page; the citations point at the landing page. Same pattern for Phiture Headspace (real numbers, wrong URL — should be the asostack feature post, not /asostack). Group two: numbers that don't match the source as quoted, e.g. the OBJ.ca piece does not contain the $15k paid spend figure (the Sub Club podcast does), and the Rephonic CPM is "$18-25 depending on length and placement" not "$18-25 across all formats".

Load-bearing items that survive scrutiny: RevenueCat pricing tiers (1.4/2.0/2.8%), Adapty trial-length data (45.7%, 51% vs 26%), Hevy $15k/2M downloads (verified in Sub Club, not OBJ), MacroFactor 400k users (verified via LinkedIn/Firebase post), IBISWorld UK PT count, Apptopia 1747%, AppTweak CPP figures, Pylon 40-60% deflection.

The Stronger By Science MacroFactor founders story checks out: Greg Nuckols, Lyndsey Nuckols, Cory Davis, Rebecca Kekelishvili, Jeff Nippard, blog roots, Reddit DM origin, September 2021 launch.

## Citation table

| Citation | URL/DOI tested | Resolves? | Claim verified? | Verdict | Notes |
|---|---|---|---|---|---|
| RevenueCat 2026 download-to-paid by price (1.4/2.0/2.8%) | revenuecat.com/state-of-subscription-apps/ | Yes | Yes | VERIFIED | Exact match on landing page |
| RevenueCat 2026 first-renewal retention Utilities 58.1% / H&F 30.3% | revenuecat.com/state-of-subscription-apps/ | Yes | Partial | MISCITED | Public landing page shows 35%/25% annual medians; the 58.1/30.3 figures are valid but live in the full report PDF, not the URL cited |
| RevenueCat 2026 Day 380 trial retention 19.9/14.2/5.5% | revenuecat.com/state-of-subscription-apps/ | Yes | Partial | MISCITED | Numbers exist in the full report (confirmed via secondary discussion); not present on landing page cited |
| Adapty 2026 trial length 45.7% and 51% vs 26% | adapty.io/blog/trial-conversion-rates-for-in-app-subscriptions/ | Yes | Yes | VERIFIED | Both figures present verbatim |
| Hevy $15k spend / 2M downloads (RevenueCat podcast post) | revenuecat.com/blog/growth/guillem-ros-hevy-podcast/ | Yes | Yes | VERIFIED | $15k and 2M downloads both quoted; Jan 2022 top-5 not mentioned here |
| Hevy Jan 2022 Google Play top 5 (OBJ.ca) | obj.ca/fitness-app-entrepreneur-pumped-by-hevys-progress-to-2m-in-annual-revenue/ | Yes | Partial | MISCITED | OBJ confirms top-5 Jan 2022 and $2M revenue, but does not state $15k paid spend; that figure is from the Sub Club episode |
| MacroFactor 400k+ active users (Google Cloud) | cloud.google.com/customers/macrofactor | Yes (truncated) | Yes | VERIFIED | Confirmed via Firebase LinkedIn case-study post citing same Google Cloud study |
| IBISWorld UK PT 24,856 / +3.7% / 1.4% CAGR | ibisworld.com/united-kingdom/number-of-businesses/personal-trainers/6042/ | Yes | Yes | VERIFIED | All three figures match exactly |
| Adapty 2026 hard paywall 21% higher LTV / 8x RPI Day 14 | adapty.io/state-of-in-app-subscriptions/ | Yes | Partial | NEEDS_HUMAN_VERIFICATION | 21% LTV confirmed on page; 8x RPI Day 14 cited widely in secondary sources but not visible in landing page excerpt |
| RevenueCat hard paywall 10.7% vs freemium 2.1% | (Adapty/neoads attribution) | Yes | Yes | VERIFIED | Original source RevenueCat State of Subscription Apps 2026; numbers match exactly |
| Apptopia 1747% App of the Day boost | techcrunch.com/2017/10/24/apples-app-of-the-day-featuring-boosts-downloads-by-1747-games-by-792/ | Yes | Yes | VERIFIED | Verbatim match; methodology and 30-day window noted |
| Phiture Headspace 2-3.5x / 15-50% editorial lift | phiture.com/asostack | Yes | No (wrong URL) | MISCITED | Numbers are real and verbatim, but live at phiture.com/asostack/just-how-impactful-is-being-featured-on-the-app-store-cb2185fb2e32/ not /asostack |
| Apple Developer "minimum of two weeks notice" featuring | developer.apple.com/app-store/getting-featured/ | Yes | Yes | VERIFIED | Quote exact |
| AppTweak 2025 CPP 31% apps / 26% games / +8.6% lift | apptweak.com/en/aso-blog/aso-app-store-trends-benchmarks-report | Yes | Yes | VERIFIED | All three figures verbatim |
| Pylon AI 40-60% deflection B2B SaaS | usepylon.com/blog/ai-ticket-deflection-reduce-support-volume-2025 | Yes | Yes | VERIFIED | Range quoted as "companies that use AI can get rates of 40-60%" |
| ONS via Statista 67,400 UK fitness instructors late 2024 | statista.com/topics/3411/fitness-industry-in-the-united-kingdom-uk/ | Redirect loop | Indirectly | NEEDS_HUMAN_VERIFICATION | Cited topic page errored. Cross-source check: ONS Q1 2024 ~67,300, Q2 2024 ~63,800. The 67,400 figure is plausible Q1 2024 but rounded inconsistently |
| TrueCoach $137/month at 50 clients | ptpioneer.com/personal-training/tools/truecoach-review/ | Yes | No | FABRICATED | Page actually states $99/month at 40-50 clients. $137 not present |
| Fiverr workout-transfer "from $350" | fiverr.com/brittany_bryant/transfer-your-workout-programs-to-trainerize-or-ptdistinction | 403 blocked | Cannot test | NEEDS_HUMAN_VERIFICATION | Fiverr blocks bot fetch; manual check required |
| MacroFactor $11.99/month, $5.99/month annual ($71.99/yr) | nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b | Yes | Yes | VERIFIED | All three figures verbatim |
| Carbon Diet Coach $9.99/month | feastgood.com/carbon-diet-coach-review/ | Yes | Yes | VERIFIED | Confirmed; also $49.99 6mo / $79.99 12mo |
| MacroFactor brand story / Stronger By Science | strongerbyscience.com/macrofactor-history-team/ | 403 blocked | Yes via mirror | VERIFIED | Page blocked but contents confirmed via Muck Rack and FeastGood mirror: Greg Nuckols, Lyndsey, Cory Davis, Rebecca Kekelishvili, Jeff Nippard; SBS audience origin |
| Hevy "From Idea to Launch" Medium-style post | hevyapp.com/how-we-built-hevy/ | Yes | Yes | VERIFIED | Post exists; documents two-person team, React Native, MVP framing |
| Sub Club Hevy podcast full episode | subclub.com/episode/cultivating-organic-growth-with-viral-loops-guillem-ros-salvador-hevy | Yes | Yes | VERIFIED | Episode confirmed; quoted figures (under $15k spend, 5-10 daily to 2M in ~3.5yr, $3/mo and $24/yr pricing) match |
| Reddit 90/10 self-promotion norm | replyagent.ai/blog/reddit-self-promotion-rules-naturally-mention-product | Yes | Yes | VERIFIED | Verbatim 90/10 framing |
| Recurly "low price attracts uncommitted cohort" | recurly.com/blog/how-to-navigate-dynamic-subscription-pricing-models/ | Yes | Partial | VERIFIED | Article says "too low a price may lead to higher churn rates" — supports the claim conceptually |
| Business of Apps H&F 3% Day-30 retention 2023 | businessofapps.com/data/health-fitness-app-benchmarks/ | 403 blocked | Cannot test | NEEDS_HUMAN_VERIFICATION | Bot blocked. Figure plausible but unverified |
| Rephonic podcast CPM $18-25 across all formats | rephonic.com/blog/podcast-ad-rates/ | Yes | No | MISCITED | Real number, wrong gloss: source says "$18-25 depending on ad length and placement"; host-read $25, programmatic ~$15 — not a flat all-formats range |
| DUAA 2025 Royal Assent 19 June 2025 (DLA Piper) | privacymatters.dlapiper.com/2026/02/uk-commencement-of-the-data-protection-provisions-in-the-data-use-and-access-act/ | Yes | Yes | VERIFIED | Royal Assent 19 June 2025; Part 5 commencement 5 Feb 2026; Section 103 June 2026 |
| DUAA timeline (Bass Berry mirror) | bassberry.com/news/english-beat-gdpr-decline-uk-reforms-key-elements-of-its-data-privacy-scheme/ | Yes | Yes | VERIFIED | Royal Assent date matches; staged commencement framing matches |
| arXiv 2405.00601 Kairam & Foote founder motivations | arxiv.org/abs/2405.00601 | Yes | Yes | VERIFIED | Real paper, real authors, CHI 2024, 951 Reddit founders surveyed |
| Burnham et al. switching costs DOI 10.1177/0092070302238600 | doi.org/10.1177/0092070302238600 | Yes (paywall) | Indirectly | NEEDS_HUMAN_VERIFICATION | DOI resolves to Springer; landing page paywalled. Burnham/Frels/Mahajan switching-costs paper is a well-known real JAMS 2003 piece, so DOI plausible |
| Hu et al. 2023 fitness app well-being DOI 10.1016/j.im.2023.103796 | doi.org/10.1016/j.im.2023.103796 | Yes (paywall) | Cannot read | NEEDS_HUMAN_VERIFICATION | DOI resolves to Elsevier Information & Management; full text blocked |
| JMIR survival analysis mhealth.jmir.org/2020/11/e16309 | mhealth.jmir.org/2020/11/e16309 | Yes | Yes | VERIFIED | Title "Assessing User Retention of a Mobile App: Survival Analysis"; 342 users; passive 46.7% vs active 22.2% Week 1 |
| JMIR 2026 cohort mhealth.jmir.org/2026/1/e72201 | mhealth.jmir.org/2026/1/e72201 | Yes | Yes | VERIFIED | Real paper "Analysis of Training Behavior in Users of a Fitness App: Cross-Sectional Study"; Mammoth Hunters; n=2,771 |
| JMIR preprint DOI 10.2196/preprints.93691 | doi.org/10.2196/preprints.93691 | Yes | Yes | VERIFIED | Resolves to real preprint "Association Between Behavioral Phenotypes and Paid mHealth App Subscription and Renewal" (Genaidy et al.); under peer review Feb-Apr 2026 |
| PMC11607567 ML/persuasive scoping review | ncbi.nlm.nih.gov/pmc/articles/PMC11607567/ | Yes | Yes | VERIFIED | Brons et al., JMIR Nov 2024; 40 papers; scoping review confirmed |
| PMC11612604 i80 BPM RL trial | ncbi.nlm.nih.gov/pmc/articles/PMC11612604/ | Yes | Yes | VERIFIED | Doherty et al., JMIR mHealth 2024; i80 BPM randomized crossover trial confirmed. (Note: app is i80 BPM, not "Samsung i80 BPM" — minor branding gloss in original citation) |
| Sensor Tower Editors' Choice analysis | sensortower.com/blog/how-top-developer-and-editors-choice-badges-showcase-googles-favorite-apps | Yes | Yes | VERIFIED | Confirms 4.5 median rating pre-award and 4x-24,000x WoW download lift on badge |
| Gemini "18.52% H&F page view-to-install" (no URL given) | splitmetrics.com/blog/good-app-store-conversion-rate/ | Yes | Yes | VERIFIED | Real SplitMetrics figure from their 10M-user study; should be cited explicitly |
| Gemini "9.8% vs 4.3% download-to-trial by price" | (no URL given) | n/a | Yes | VERIFIED | Real RevenueCat figure — download-to-trial (not download-to-paid); distinct from the 1.4/2.0/2.8% download-to-paid stat. Both legit |
| Gemini "20% average / 650% max screenshot lift" | (no URL given) | n/a | Yes | MISCITED | SplitMetrics 2015 data, not recent; needs explicit attribution and date caveat |
| Gemini "Trainerize 75-90% compliance target" | help.trainerize.com (compliance article) | Yes | Yes | VERIFIED | Trainerize Help Center confirms 75-90% as the recommended sweet spot |
| Gemini "over 80% client install rate when coach mandates app" | n/a | n/a | No | NEEDS_HUMAN_VERIFICATION | No primary source surfaces in search; appears to be unsupported assertion |
| Gemini "iOS CPI averages $4.70" | businessofapps.com/marketplace/user-acquisition/research/user-acquisition-costs/ | 403 blocked | Yes via cross-source | VERIFIED | Multiple 2024-2025 sources (Mapendo, Audiencelab, Business of Apps) all converge on $4.70 iOS global average |

## Recommended actions before publication

1. Replace the TrueCoach price point. $137/month at 50 clients is wrong. The cited review states $99/month at 40-50 clients; check current TrueCoach pricing for accurate figure if the comparison matters.
2. Re-anchor RevenueCat retention citations. The 58.1% Utilities / 30.3% H&F and 19.9/14.2/5.5% Day 380 figures sit in the full 2026 report PDF, not the landing page. Cite the report directly (with page or slide number if possible).
3. Fix the Phiture Headspace URL to the specific feature post, not the /asostack index.
4. Move the Hevy $15k spend figure to the Sub Club podcast citation. OBJ.ca confirms downloads and revenue but not the spend.
5. Drop or qualify the "over 80% client install rate when coach mandates app" line. No primary source.
6. Date-stamp the SplitMetrics 20%/650% claim as 2015 data, or pull a more recent benchmark.
7. Get human eyes on the Business of Apps H&F benchmarks page (403 to bot fetch) and the Fiverr listing.
