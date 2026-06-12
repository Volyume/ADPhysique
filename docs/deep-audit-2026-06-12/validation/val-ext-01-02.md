# Validation Audit — ext-01 & ext-02 Competitive Research

**Audit date:** 2026-06-12
**Scope:** `docs/deep-audit-2026-06-12/external/ext-01-massmarket-strength-apps.md` and
`ext-02-guided-coaching-apps.md`
**Method:** every material competitive claim extracted and numbered; each tested against
live-fetched primary or reputable secondary sources (WebFetch full pages where hosts
permitted, WebSearch corroboration where they did not). Format follows
`docs/COACHING_VOICE_CITATION_AUDIT.md`. No claim is marked VERIFIED on memory alone.

**Verdict definitions:**
- **VERIFIED** — confirmed against an actually-fetched source (or, per the precedent in the
  coaching-voice audit, a 403'd/bot-blocked primary confirmed via two independent search
  records; every such case is explicitly noted).
- **CORRECTED** — substantially true but a material detail (date, figure, currency,
  attribution) is wrong; the correction is given.
- **UNSUPPORTED** — no evidence found, or the *cited source itself* does not contain the claim.
- **FABRICATED** — contradicted by evidence.
- **UNVERIFIABLE** — sources unreachable or claim untestable from here; what was tried is noted.

**Hosts that blocked direct fetches** (tried; fell back to alternates where possible):
`hevyapp.com` + `help.hevyapp.com` (bot check / 403), `web.archive.org` (unavailable in this
environment), `macrofactorapp.com` / `macrofactor.com` (bot check), `strongerbyscience.com`
(403), `applemagazine.com` (403), `tomsguide.com` (article bodies truncated to nav/membership
chrome), `apps.apple.com` Ladder listing (403; Hevy and Liftin' listings fetched fine),
`trustpilot.com` (403), `fitbod.zendesk.com` (403), `support.sweat.com` (403),
`nike.com/ntc-app` (403), `runrepeat.com/gym-anxiety` (404 — page gone or never existed).

---

## Summary of verdicts

| Verdict | Count | Share |
|---|---|---|
| VERIFIED | 39 | 46% |
| CORRECTED | 22 | 26% |
| FABRICATED | 2 | 2% |
| UNSUPPORTED | 6 | 7% |
| UNVERIFIABLE | 15 | 18% |
| **Total claims audited** | **84** | |

**Headline:** the load-bearing *app-feature* claims (Hevy Trainer, Boostcamp library, Fitbod
cold start, Ladder growth, Caliber tiers, Peloton You Can Ride, Centr Begin, Fiit 22%,
MacroFactor adherence-neutrality, gymtimidation ~50%) are substantially real — better than the
provenance notice feared. The rot is concentrated in **statistics, dates, and source
attributions**: two outright fabrications (Boostcamp substitution paywall; inverted Starting
Strength increments), two retention statistics whose *cited sources contradict or do not
contain them* (lucid.now D1/D7 figures; the orangesoft "42%" logging stat), a dead source for
the gym-anxiety figure, and a cluster of stale dates/prices (Fitness+ "Comeback" is Jan 2026
not 2025; Freeletics Coach+ is Jul 2024 not 2025; Hevy spent ~$15k on ads, not zero; Peloton
trial is 7 days not 30; Alpha Progression now $79.99/yr; NTC's "487 classes" is a 2022 figure).

---

## Part 1 — ext-01 (mass-market strength apps): per-claim audit

| # | Claim (short) | Verdict | Evidence and notes |
|---|---|---|---|
| 1 | Hevy Trainer launched 18 Feb 2026 as adaptive programming system | VERIFIED | Announcement dated 18 Feb 2026 confirmed via search records of [hevyapp.com/announcing-hevy-trainer](https://www.hevyapp.com/announcing-hevy-trainer/) (direct fetch bot-blocked); existence + mechanics independently confirmed by fetched [push-pull.app/blog/push-pull-vs-hevy](https://push-pull.app/blog/push-pull-vs-hevy) ("Trainer is a PRO feature. It adds adaptive programs, automatic weight adjustments, and exercise replacements"), fetched [sensai.fit Hevy vs Strong](https://www.sensai.fit/blog/hevy-vs-strong-2026) ("Hevy Trainer auto-adjusts your working weights based on logged performance"), and the fetched [App Store listing](https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350). |
| 2 | Hevy Pro $23.99/yr, $74.99 lifetime ($2.99/mo) | VERIFIED | Fetched App Store listing: "Hevy Pro – Monthly: $2.99 or $3.99; Yearly: $23.99; Lifetime: $74.99". Same figures in fetched push-pull.app and sensai.fit. Note: one fetched source (corahealth.app) cites ~$4.99/$35.99 — regional/SKU variance exists, but the doc's US figures are right. |
| 3 | Trainer onboarding questions → multi-week programme incl. starting-weight recommendations, auto-adjusting weights | VERIFIED | Search record of the announcement: "After answering a few questions during onboarding, Trainer will generate a complete program with workouts, exercises, rep ranges, rest periods, recommendations for starting weights, and helpful tips… adapts and becomes increasingly tailored." Auto-adjustment confirmed in two fetched secondaries (#1). |
| 4 | Progression suggestions "backed by exercise-science literature" | UNVERIFIABLE | Exact phrasing not confirmed; help.hevyapp.com article 403'd, vendor blog bot-blocked. Plausible marketing copy but unproven as quoted. |
| 5 | Hevy free tier retains 26-programme library | VERIFIED (caveat) | Two independent search records state "Hevy's program library features 26 complete training programs… browse… and save… all for free" (vendor pages bot-blocked on direct fetch). Note free-tier caps confirmed by fetched push-pull.app: 4 routines, 7 custom exercises, 3 months history. |
| 6 | Hevy 10M+ users | VERIFIED (vendor claim) | Fetched App Store listing description: "Join +10 million users!". Caveat: third-party Android trackers (AppBrain) estimate ~7.1M Play installs, so 10M+ is a cross-platform first-party marketing figure, not an audited one. |
| 7 | Growth with **zero** paid marketing | CORRECTED | Fetched [RevenueCat Sub Club write-up](https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast/): Hevy reached 2M downloads having "only spent $15,000 on paid advertising". Primarily-organic is true; "zero paid marketing" is false. |
| 8 | Founder Guillem Ros Salvador; Sub Club episode on viral loops | VERIFIED | Fetched RevenueCat page confirms Guillem Ros, CEO/co-founder, ex-8fit PM; episode "Cultivating Organic Growth with Viral Loops" exists on [subclub.com](https://subclub.com/episode/cultivating-organic-growth-with-viral-loops-guillem-ros-salvador-hevy). |
| 9 | Founder quote ("…not only do you invest so much into the product with your own data… but also with the community…") | UNVERIFIABLE | The exact wording could not be checked (podcast audio). RevenueCat's write-up carries the same sentiment ("one of the biggest pulls for people to come back for more: the social element") — substance fine, quotation marks not earned. |
| 10 | Hevy flags PRs inline at the moment a set is logged | UNVERIFIABLE | Fetched corahealth.app review confirms "PR notifications" exist but not the at-the-moment-of-logging placement. Vendor pages bot-blocked. Direction almost certainly right; specific UX claim unproven. |
| 11 | Shareable workout cards + shareable routine links (viral loop) | VERIFIED (caveat) | [hevyapp.com/features/shareable](https://www.hevyapp.com/features/shareable/) exists; search records describe auto-generated post-workout shareables with Instagram Stories export and backgrounds; routine sharing confirmed in fetched corahealth.app ("Routines can be shared with others directly"). Vendor page itself bot-blocked. |
| 12 | Boostcamp 11,000+ programmes, 130+ coach-designed, named authors | VERIFIED | Fetched [boostcamp.app/free-workout-app](https://www.boostcamp.app/free-workout-app): "11,000+ programs are free", "130+ coach-designed library", coaches incl. Eric Helms, Jim Wendler, Cody Lefever. Fetched [boostcamp.app/programs](https://www.boostcamp.app/programs) now shows **12,196** programmes and names nSuns 5/3/1, GZCLP, Reddit PPL, 5/3/1 for Beginners, Greg Nuckols Beginner, StrongLifts 5×5; a [Mark Rippetoe Starting Strength page](https://www.boostcamp.app/mark-rippetoe/starting-strength) exists. "RP programs" in the doc's list was not sighted — minor. |
| 13 | Boostcamp free tier: programme library + tracker + basic analytics, no time limit; Pro $59.99/yr | VERIFIED | Fetched free-workout-app page: free includes programmes, full tracker, RPE/RIR logging, plate calculator, basic PRs, "no time limit"; "Boostcamp Pro is $59.99 per year ($4.99/month billed annually) with a 7-day free trial, or $14.99/month". |
| 14 | "Entire programme library" free | CORRECTED | Most of it is, but Pro adds "20+ exclusive coach programs" (fetched vendor page) — the doc's own §1.2 wording overstates ("the entire program library"). Its later pricing table ("premium coach programmes" paid) had it right. |
| 15 | Volume heat-map anatomy chart as a (free) post-workout retention surface | CORRECTED | The per-muscle volume heatmap exists but is listed by Boostcamp as **Pro-exclusive** (fetched vendor page). The doc presented it as a core free-tier retention mechanic sourced to a sensai.fit comparison. Feature real; tier wrong. |
| 16 | Auto-progression: hit reps → weight increases next session, per programme rules | VERIFIED | Boostcamp's own Starting Strength guide (search record of [boostcamp.app/blogs/starting-strength-program-app-guide](https://www.boostcamp.app/blogs/starting-strength-program-app-guide)): "weights adjust automatically based on your performance, and if you hit your reps, the app increases the load next session." |
| 17 | Starting Strength progression "+2.5kg lower-body, +5kg upper-body per session" | FABRICATED | Inverted and mangled. Canonical SS/Boostcamp guidance: **+10 lb (≈4.5 kg) squat/deadlift** and **+5 lb (≈2.25 kg) bench/press** per session early on, tapering as progress slows. Lower-body gets the *larger* increment; the doc reversed it and invented metric values. |
| 18 | Exercise substitution is paywalled on Boostcamp | FABRICATED | Contradicted by Boostcamp's own current FAQ (fetched): "exercise alternatives… are all in the free tier." (May once have been true; it is false as stated for 2026.) |
| 19 | Boostcamp "somewhat overwhelming interface initially" / post-update bugs | UNVERIFIABLE | Cited healthynexercise.com review not fetched; not contradicted anywhere. Low-stakes review colour. |
| 20 | Fitbod: equipment question → complete generated workout, recovery modelling, no blank screen | VERIFIED | Fetched [dr-muscle.com Fitbod review](https://dr-muscle.com/fitbod-workout-app-review/): algorithm builds workouts from muscle-recovery balance. The cited fitbod.zendesk beginner article 403'd, but the mechanic is confirmed across two fetched reviews. |
| 21 | Fitbod cold-start: personalisation takes 10–15 workouts; early output feels random | VERIFIED | Fetched [indiehackers.com Fitbod review (30 Apr 2026 — the doc's cited URL is real)](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b): "Fitbod genuinely needs 10-15 workouts of input data before the personalisation reaches its full quality"; fetched dr-muscle review: workouts "often feel randomized", and "most users quit Fitbod after only eight workouts". |
| 22 | Fitbod: 3 free workouts then hard paywall at $15.99/mo | VERIFIED | Fetched indiehackers review: "$15.99/month or $95.99/year, free tier with 3 workouts… Three workouts is genuinely too few"; fetched dr-muscle review: "only three free workouts without requiring a credit card". Search records of Fitbod's membership page agree ($15.99/mo, $95.99/yr as of May 2026). |
| 23 | Alpha Progression: steep learning curve; plan generator Pro-only; free tier = logging without plan | VERIFIED | Fetched [alphaprogression.com/en/subscribe](https://alphaprogression.com/en/subscribe) confirms generator/recommendations are Pro with 14-day trial; hotelgyms 2026 review (search record) confirms generator is Pro and free is basic logging. Learning-curve complaint consistent across reviews. |
| 24 | Alpha Progression ~$9.99/mo or $59.99/yr | CORRECTED | Current pricing (fetched vendor subscribe page): **$12.99/mo, $79.99/yr**. The doc's figures are stale. "Budget vs RP" positioning still holds. |
| 25 | RP Hypertrophy ~$30/month | UNVERIFIABLE | Not checked against a fetched source in this pass. |
| 26 | Caliber: free tier (unlimited workouts, 500+ exercise videos, groups); Plus $12/mo (annual); Premium $200/mo human coach | VERIFIED | Fetched [BarBend Caliber review](https://barbend.com/caliber-fitness-app-review/): free-forever logging + "over 500 exercises in the library"; Premium from $200/mo with weekly recorded coach check-ins; Pro $19/mo. Garage Gym Reviews (search record) confirms Plus at $12/mo annual incl. Strength Score + 60+ structured plans. Note: BarBend associates Score/Balance with coached tiers — tier placement has shifted over time; the $12 Plus claim stands per GGR 2026. |
| 27 | Strength Score: weekly recalculated, age/gender normalised; Strength Balance = muscle-group development | VERIFIED | Fetched [caliberstrong.com/blog/introducing-strength-score](https://caliberstrong.com/blog/introducing-strength-score/): "recalculated each week… take a number of other factors into account, including your age and gender"; Balance shows "how well-balanced you are… strength and muscular development". |
| 28 | Ladder ~2,000% growth in 2 years (10k → 175k subscribers); TikTok creator-coaches; onboarding quiz predicting LTV | VERIFIED | Fetched [Sub Club episode page (Buzzsprout)](https://www.buzzsprout.com/2432582/episodes/16536290-how-ladder-nailed-product-channel-fit-on-tiktok-and-meta-to-grow-2-000): "grow ~2,000% from 10k to 175k subscribers over the last two years… turning in-house coaches and creators into short-form content creation machines… an onboarding quiz to predict each new user's LTV". Guest: Greg Stewart, CEO. Now superseded — see "What's new" (400k members, Apr 2026). |
| 29 | "15-question" web onboarding quiz | UNSUPPORTED | The question count appears in no fetched or searched source. Quiz itself verified (#28). |
| 30 | Ladder pricing ~$30–39/month | VERIFIED | Current: Pro $29.99/mo or $179.99/yr; Pro+ $34.99/mo; Elite $44.99/mo (search records of [joinladder.com/pricing](https://www.joinladder.com/pricing) and two 2026 reviews; App Store listing 403'd). Doc's range is accurate for the headline tiers. |
| 31 | Ladder: Apple 2025 App of the Year Finalist; Women's Health 2026 Best Overall; CNET 2026 Best Strength App | VERIFIED | Fetched [Apple Newsroom, 19 Nov 2025](https://www.apple.com/newsroom/2025/11/apple-announces-finalists-for-the-2025-app-store-awards/): LADDER is one of three iPhone App of the Year finalists, "for taking the guesswork out of strength training". WH/CNET/Editors' Choice corroborated by App Store description search records. |
| 32 | JEFIT: cluttered UX; added Progressive Overload smart weight/rep recommendations in 2025–26 | VERIFIED | JEFIT's own product-update posts (search records of jefit.com: "The New Era of Jefit: The Progressive Overload System"; final 2025 update refined it). Note: JEFIT brands it "AI-powered" — stronger than the doc's neutral phrasing. |
| 33 | Liftin': one-tap logging, $24.99/yr | VERIFIED | Fetched [App Store listing](https://apps.apple.com/us/app/liftin-gym-workout-tracker/id1445041669): $24.99/yr (also $2.99/mo, $99.99 lifetime), auto weight-adjustment rules, 4.7★ (724 ratings). User quote in the doc matches a real review on the listing. |
| 34 | Liftin' is "premium-only… no free path" | CORRECTED | Fetched App Store listing: "Track up to five workouts per month with the free version", plus a one-month free trial. There is a free path; it is thin. |
| 35 | Setgraph: 5 free workouts, then subscription | CORRECTED | Setgraph's own pages (search records): logging is free "for the first five **days**", and the Quick Custom AI generator is free without a card. The funnel-shape point survives; the unit was wrong. |
| 36 | GymStreak: <5s session generation; muscles "glow brighter"; free limited to 3 workouts/week; day-1 five-compound overload anecdote | UNVERIFIABLE | Free ~3-workout limit and AI generation corroborated by search records (App Store/AppBrain); the specific overload anecdote (cited indiehackers GymStreak review) was not fetched. Nothing contradicted. |
| 37 | Dr. Muscle: Trustpilot complaints about unauthorised charges, "existential" trust problem | CORRECTED | Real, documented complaints concern **hard-to-cancel subscriptions and surprise renewals** ("up to $290 for another year"; all payments non-refundable per [dr-muscle.com/cancellation](https://dr-muscle.com/cancellation/)) — search records; Trustpilot page itself 403'd so the "unauthorised charges on Trustpilot" framing is unconfirmed and "existential" is editorial. |
| 38 | Dr. Muscle SEO-floods "independent" competitor reviews | VERIFIED | Directly observed in this audit: dr-muscle.com hosts dozens of competitor "Honest Review by Expert" pages (Fitbod, Gymshark, Mad Muscles, Zing Coach, Muscle Booster…) which surfaced in nearly every app search performed. |
| 39 | Dr. Muscle layoff handling: 10–20% weight reduction after a missed week | UNVERIFIABLE | Not checked against a fetched source in this pass (product-doc claim from the prior audit). |
| 40 | Stronger by the Day: 25,000+ users; Meg Gallagher; $8.33/mo; 7-day trial | VERIFIED | Fetched [strongerbytheday.app](https://strongerbytheday.app/): "our 25,000+ members", "Meg Gallagher, Founder", "As Low As $8.33/mo", "Try it free for 7 days". (Monthly SKU is ~$12/mo per App Store search record.) |
| 41 | SBTD: 400+ exercise library; 2025 UX/onboarding overhaul | UNSUPPORTED | Neither appears on the fetched site nor in search records. |
| 42 | Gymshark Training: 100% free, 700+ exercises with video on every one, weak personalisation, no drop sets/supersets/progression depth | VERIFIED | Gymshark's own blog/support pages (search records): free, "over 700 exercises", "every exercise includes a detailed video guide"; limitation language ("can't… add drop sets, supersets, or properly track progress") corroborated across reviews. Tom's Guide article body unfetchable (chrome only), so the doc's verbatim quotes from it remain unspot-checked. |
| 43 | Health/fitness retention: ~20–27% D1, ~7% D7; quote "the steepest drop happens between D1 and D7…" (lucid.now) | UNSUPPORTED | The cited page was fetched: [lucid.now retention metrics](https://www.lucid.now/blog/retention-metrics-for-fitness-apps-industry-insights/) gives **different numbers** (fitness apps D1 30–35%, D7 15–20%; health apps D1 27%, D7 13%) and the quoted sentence is **not on the page**. The directional point (steep early drop) is supported there only by "apps lose 77% of daily users within three days". Doc's figures + quote do not match its own source. |
| 44 | "People who consistently log workouts are 42% more likely to stick with training" (orangesoft.co) | UNSUPPORTED | The cited page was fetched: [orangesoft.co engagement strategies](https://orangesoft.co/blog/strategies-to-increase-fitness-app-engagement-and-retention) — the claim is **not on it**. The 42% figure circulates only in AI-SEO blogs and appears to be a mutation of the unrelated Gail Matthews goal-*writing* study ("writing down goals increases achievement by 42%"). Treat as a fabricated statistic. |
| 45 | "Users who complete their first workout are significantly more likely to return" (dev.to PaywallPro) | UNVERIFIABLE | Not fetched. Generic and probably true, but unproven as cited. |
| 46 | Gym anxiety has "four distinct components" (healthline) | CORRECTED | Fetched [healthline.com gym anxiety](https://www.healthline.com/health/fitness/gym-anxiety): page exists and lists triggers (beginner status, unfamiliar environment, equipment confusion, judgement/appearance) but contains **no four-component taxonomy** — that framing is the doc's own synthesis presented as sourced. |
| 47 | Strong: free = "3 custom exercises"; ~$2.50/mo ($30/yr) | CORRECTED | Fetched sensai.fit comparison: "Strong's free tier limits you to **3 custom routines**" (not exercises); "Strong Premium costs $4.99/month or $29.99/year". The $30/yr annual figure is right; the free-tier unit and the implied monthly price are wrong. |

---

## Part 2 — ext-02 (guided coaching apps): per-claim audit

| # | Claim (short) | Verdict | Evidence and notes |
|---|---|---|---|
| 48 | NTC offers 487+ free guided classes | CORRECTED | The 487 figure comes from a **February 2022** Tom's Guide review ("487 classes"). Nike's own pages currently advertise **"185+ free workouts"** (some pages 200+). Presenting 487+ as the current free-class count in 2026 is stale and overstated. nike.com/ntc-app 403'd on direct fetch; figures from search records of Nike's own pages. |
| 49 | NTC instructors "never let you be in silence for more than a few seconds" (Yahoo Health review) | UNSUPPORTED | The cited Yahoo page exists and was fetched — the quote and the continuous-audio claim are **not in the retrievable content** (the review discusses class types, difficulty, equipment). |
| 50 | NTC "welcomes first-timers with low-impact workouts… form, consistency, enjoyment over intensity" (Tom's Guide) | UNVERIFIABLE | Tom's Guide article body unfetchable (returned site chrome only). Plausible; unproven as quoted. |
| 51 | NTC went fully free in 2020; monetises via commerce flywheel | VERIFIED | Fetched [Motley Fool, 15 Jul 2020](https://www.fool.com/investing/2020/07/15/nike-moves-to-make-the-nike-training-club-app-free.aspx): "Nike is making the premium content permanently free"; strategy explicitly engagement → commerce ("engaging with us each week… brings NIKE into their lives"); 25M new members in fiscal Q4, half via apps. |
| 52 | "+60% active users" from going free | CORRECTED | The fetched Fool article gives different metrics (China NTC MAU +350%; 50M workouts logged in a quarter). The ~60% figure traces to the cited [AppVenturez case study](https://www.appventurez.com/blog/nike-training-club-app-case-study) and a CNBC report of "active members rose by nearly 60%" — secondary, imprecise, and about Nike members rather than NTC actives. Use with caution. |
| 53 | Apple Fitness+ treats trainer personality/tone as a product differentiator; users choose coaching tone | VERIFIED (caveat) | The cited [AppleMagazine article](https://applemagazine.com/apple-fitness-trainers-00a1/) exists; direct fetch 403'd, but search records reproduce the doc's exact claims ("calm precision… high-energy intensity… choosing a trainer whose motivation style aligns with personal preference increases the likelihood of returning"). Apple's own materials confirm multi-trainer-per-category design and trainer-based filtering/For You personalisation. |
| 54 | "2025 'Make Your Fitness Comeback' programme" | CORRECTED | It is a **January 2026** launch: announced 2 Jan 2026, live 5 Jan 2026 (fetched [Apple Newsroom](https://www.apple.com/newsroom/2026/01/stay-active-in-the-new-year-with-apple-watch/) and [MacRumors](https://www.macrumors.com/2026/01/02/apple-announces-new-fitness-workout-programs/)). The doc was written 2026-06-12 and still dated it 2025. |
| 55 | Comeback structure: 4 weeks, three 10-minute workouts/week (Strength/HIIT/Yoga) | VERIFIED | Fetched Apple Newsroom: "The four-week plan features three workouts per week — one of each type — for just 10 minutes." Fitness+ $9.99/mo (US) also confirmed on the same page. |
| 56 | watchOS 11 added rest days that don't break award streaks, "after nine years" | VERIFIED | Fetched [iMore article (the doc's cited URL)](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks): "pause your Apple Watch rings for a day, a week, a month, or more… It won't affect your Apple Watch award streaks." |
| 57 | Peloton "You Can Ride": 3-week beginner programme, 9 classes, bronze/silver/gold badges | VERIFIED | Fetched [Pelo Buddy](https://www.pelobuddy.com/peloton-you-can-ride-beginner-cycling-program/): 3 weeks, 9 classes, Bronze at 4, Silver at 7, Gold at 8 of 9. |
| 58 | Peloton instructors coach users to hide/ignore the leaderboard; instructor relationship is the retention driver | VERIFIED | Fetched [Anne Helen Petersen essay](https://annehelen.substack.com/p/the-counterintuitive-mechanics-of): Christine D'Ercole — "Take that leaderboard, and flip it on its side"; "hide the leaderboard, let's have some fun"; author's engagement driven by "(parasocial) trusting relationship" with instructors. |
| 59 | Peloton ended its free app tier because it was cannibalising paid conversion | VERIFIED | Fetched [Pelo Buddy](https://www.pelobuddy.com/free-app-tier-ending/): ended new free-tier signups April 2024; CFO Liz Coddington: the free tier was "cannibalizing" conversion of free-trial members. |
| 60 | "Current model: 30-day trial, then £12.99/mo" | CORRECTED | Same fetched source: default trial cut to **7 days**; app pricing is two tiers (App One $12.99, App+ $24), raised Oct 2025 to **$15.99 / $28.99** (Retail Dive search record). The doc's single price + 30-day trial is stale on both counts. |
| 61 | Centr Begin: 3-week absolute-beginner programme; coaches Maricris Lapaix & Dan Churchill; "you won't have to thrash yourself" / "start of something great" / "with you every step" | VERIFIED | Fetched [centr.com Begin overview (the doc's cited URL)](https://centr.com/article/show/20278/centr-begin-program-overview): all three quotes appear essentially verbatim; 3 weeks, 3×15–20-min sessions/week, low-impact, for people who "found other beginner programs too difficult". |
| 62 | Centr £119.99/year or £29.99/month | CORRECTED | Pricing is **$119.99/yr, $29.99/mo (USD)** with 7-day trial (centr.com/gymbird search records). Currency transposed to sterling without basis. |
| 63 | Freeletics: post-workout feedback (difficulty/energy/completion) adapts next session "without judgment", no LLM in the base Coach | VERIFIED | Freeletics' own training-plan explainer exists (cited URL live per search); adaptation loop corroborated by the fetched [Coach+ blog](https://www.freeletics.com/en/blog/posts/freeletics-coach-plus/) describing the base Coach + new layers. The base Coach is rule/feedback-driven as claimed. |
| 64 | Partial "God workouts" as aspirational scaling | UNVERIFIABLE | Long-standing Freeletics feature, but no source fetched in this pass confirmed the specific "ease your way towards complete God workouts" framing. |
| 65 | "The 2025 Coach+ upgrade adds custom motivational messages… set the tone…" | CORRECTED | Coach+ launched **July 2024** ([Fitt Insider press release, 15 Jul 2024](https://insider.fitt.co/press-release/freeletics-unveils-a-new-era-in-digital-fitness-with-the-launch-of-coach/)). Tone-setting and custom motivational messages are real (fetched Freeletics blog: "set the tone for how Coach+ talks to you") — but Coach+ is explicitly **generative/conversational AI**, so it is a demand signal for tone preference, not a deterministic precedent. |
| 66 | Future: $199/month; 4.9/5 from 9,400+ reviews (Jan 2026) | CORRECTED | Pricing is **$199/mo monthly, $149/mo on annual** (fetched [corahealth.app/compare/future](https://www.corahealth.app/compare/future); healthline search record agrees). The 4.9/9,400+ (Jan 2026) figure is corroborated by the sports-nerd review (search record) — the doc's *cited* source (Cora) does not carry it. Rating substance fine; price and attribution imprecise. |
| 67 | Future: initial FaceTime consultation; ~4 messages/day | UNVERIFIABLE | Fetched Cora review describes asynchronous coaching ("Your trainer texts you each morning"; "live real-time sessions are not the standard format"). The "~4 messages/day" and FaceTime-consult specifics (cited to active.com, not fetched) are unconfirmed and partially in tension with Cora. |
| 68 | Sweat: "All programmes include 4 weeks of beginner workouts before the main programme — a mandatory soft-start" | CORRECTED | Sweat support (search records; direct fetch 403): High Intensity with Kayla offers **eight optional Beginner weeks** before Week 1, for those who need them — not 4 weeks, not mandatory, and not documented as universal across all programmes. The soft-start concept is real; the universal/mandatory framing is wrong. |
| 69 | Sweat ~$100M ARR from 1M+ MAU | CORRECTED | ~$100M annual revenue was at the July 2021 iFIT acquisition, generated from **~450k paid subscribers**; "1M+ active users/month across 145 countries" is a separate (later) engagement stat. Conflating the two implies paid scale it didn't have. (TechAhead — the doc's cited source — plus Fortune/Startup Daily search records; sale price $400M.) |
| 70 | Sweat milestone badges (first/100th workout) + Community Forum as retention infrastructure | UNVERIFIABLE | sweat.com features blog exists (cited URL) but was not successfully fetched; support pages 403'd. Consistent with everything found; unproven this pass. |
| 71 | BetterMe: "15–20 question quiz" before the price reveal | CORRECTED | Teardowns (screensdesign / App Fuel search records): the personalisation quiz is ~**26 questions** within a ~**41-step** onboarding flow. The emotional-investment-before-paywall mechanic is confirmed; the count was understated. |
| 72 | BetterMe free version is "a sales funnel rather than a standalone product"; goal-date prediction as primary motivator | UNVERIFIABLE | Cited nutrola.app and Medical News Today pages exist (search-located) but were not fetched. Consistent with all secondary evidence; unproven this pass. |
| 73 | Caliber tier ladder (free genuinely useful → Plus → Pro group coaching → Premium 1:1 with weekly video check-ins) | VERIFIED | Fetched BarBend review (#26): free-forever logging + 500+ exercise library; Pro $19/mo group/class-style; Premium from $200/mo with weekly recorded coach check-in videos; 7-day Pro trial. Currency note: the doc's "£" figures are actually **USD**. |
| 74 | Ladder expression layer: coach voiceover toggle, weekly fresh coach-programmed workouts, inline beginner/intermediate/advanced scaling | UNVERIFIABLE | Cited exercisepick/Parade reviews not fetched (Parade noted 403 in the doc itself). Consistent with App Store description search records ("guided audio + video from real coaches", weekly programming); specifics unproven. |
| 75 | Fiit: 40+ training plans; 4.9/5 from 45K+ App Store reviews | VERIFIED | Fetched [fiit.tv](https://fiit.tv/): "4.9/5 from more than 45K reviews on the App Store", "40+ expertly-devised training plans". |
| 76 | Fiit class intensities "from 10–40 minutes" | CORRECTED | Fetched fiit.tv: classes run **10, 25, 40 and 60 minutes**. |
| 77 | Fiit telemetry: live/group classes produce 22% harder effort than solo | VERIFIED | Fetched [Fiit blog](https://blog.fiit.tv/blogs/everything-you-need-to-know-about-fiit-club/): "Our data shows we train 22% harder when we're with other people (even on a virtual live leaderboard)"; "you work 22% harder in Fiit Club than on-demand classes". First-party telemetry, as the doc correctly framed it. |
| 78 | Zwift: 100-level system, route achievement badges, Drop Shop currency loop | VERIFIED | Zwift Insider / Zwift's own materials (search records): level cap raised to 100 ("Level 100! Zwift Revamps Levels"); Drops currency buys frames/wheels in the Drop Shop; route-completion badges are the largest XP source. Note: as of **May 2026** levels are uncapped beyond 100 — the doc is one revision behind. |
| 79 | Zwift Racing League: 35,000+ racers per season | VERIFIED (caveat) | WTRL's own ZRL page (search record): "over 35,000 participants a season". Page not directly fetched. |
| 80 | ZRL "1,800 teams per season" | UNSUPPORTED | Figure found nowhere in WTRL/Zwift materials searched. |
| 81 | MacroFactor adherence-neutral quote: "No red numbers. No warnings. No guilt pop-ups. Nothing about MacroFactor will tell you that you're doing something bad…" | CORRECTED | The philosophy is real and the cited page exists ([macrofactorapp.com/adherence-neutral](https://macrofactorapp.com/adherence-neutral/); bot-blocked on direct fetch, confirmed via multiple derivative sources): actual published language is "without any red numbers, pop-ups, warnings, or visual elements that can promote feelings of shame and guilt", plus the research basis that shaming reduces adherence. The doc's quotation marks wrap a paraphrase, not the published sentence. |
| 82 | "~50% of beginners report intimidation in gym environments (RunRepeat 2020 survey)" | CORRECTED | The ~50% figure is real but belongs to a **2019 OnePoll survey for Isopure** of 2,000 Americans ("about half expressed fear of working out in front of others" — fetched [StudyFinds](https://studyfinds.org/gymtimidation-half-americans-afraid-working-out/)); it measures US adults, not "beginners". The cited runrepeat.com/gym-anxiety URL returns **404**. UK context for the brief's "~47% UK": UK surveys range widely — The Gym Group/OnePoll found 33% of non-gym-going adults; PureGym's UK Fitness Report has reported >50% gymtimidation in some years; no fetched source pins 47%. |
| 83 | ~80% of fitness app users abandon within 3 months; "Week 6: missed workouts create guilt" | VERIFIED | Fetched [productgrowth.in fitness-app retention (the doc's cited URL)](https://productgrowth.in/insights/healthtech/fitness-app-retention/): "80% of fitness app users abandon within 3 months…"; "Week 6: Critical point (missed workouts create guilt)." |
| 84 | Peloton programmes-as-journeys (4–10-week arcs, completion badges, sessions that build) | UNVERIFIABLE (substance partially verified) | The cited onepeloton.com blog was not fetched, but the You Can Ride fetch (#57) independently confirms arc + badge structure for at least one programme. |

---

## Part 3 — What the docs missed (real developments as of 2026-06-12)

These were found while validating and materially extend the competitive picture. None reverses
the docs' conclusions; two sharpen them.

1. **Apple Workout Buddy (watchOS 26 / iOS 26, shipped September 2025).** Apple Intelligence
   generates **spoken, personalised motivational coaching during workouts**, voiced with
   text-to-speech models built from real Fitness+ trainers' voices. ext-02 analysed Fitness+
   trainer tone at length and never mentions that Apple now ships an AI coach-voice on the
   wrist. This is the single largest omission: "coached feel without a human" is now a
   platform feature, not just an app feature. Sources: [AppleInsider](https://appleinsider.com/articles/25/09/15/watchos-26-is-here-and-features-ai-coaching-improved-health-tools),
   [Engadget how-to](https://www.engadget.com/wearables/how-to-use-workout-buddy-with-apple-watch-and-ios-26-130000922.html),
   [Apple Support guide](https://support.apple.com/guide/watch/use-workout-buddy-apd65c7938e6/watchos).
2. **Peloton IQ (announced 1 October 2025).** AI + computer-vision platform across new
   Cross Training hardware: camera-based **rep counting, form feedback, weight suggestions**
   across 2,000+ movement-tracked strength workouts. ext-02's Peloton section (instructors,
   leaderboard, journeys) predates-in-spirit a company that has since relaunched around AI
   strength coaching. Source: [Peloton investor press release](https://investor.onepeloton.com/news-releases/news-release-details/peloton-enters-new-era-ai-powered-peloton-iq-and-new-product),
   [CNN](https://www.cnn.com/2025/10/01/tech/peloton-relaunch-ai-new-equipment).
3. **Ladder is now ~400,000 members (April 2026), 80% women**, fresh off a $105M raise
   (Nov 2024) and its first celebrity partnership (Hilary Duff, announced 21 April 2026 —
   fetched [PR Newswire](https://www.prnewswire.com/news-releases/hilary-duff-partners-with-ladder-to-help-women-build-strength-302748007.html)).
   The 175k figure both docs lean on is more than a year stale; Ladder has since more than
   doubled and is consolidating the women's-strength mainstream.
4. **Boostcamp Pro now bundles its own "Strength Score" and per-muscle volume heatmap**
   (fetched [boostcamp.app/free-workout-app](https://www.boostcamp.app/free-workout-app)).
   ext-01's T-02 (heat-map) and T-10 (Caliber-style Strength Score) are no longer "absent from
   the segment's loggers" — a direct competitor has shipped both, as paid features. Volyume's
   versions would now be fast-follows, with the differentiation being *free placement* and
   deterministic coaching integration, not novelty.
5. **The AI-programming layer is now table stakes across the segment.** Within twelve months:
   Hevy Trainer (Feb 2026), JEFIT's "AI-powered" Progressive Overload System (2025), Setgraph
   AI plans, GymStreak, Freeletics Coach+ (gen-AI, Jul 2024), Peloton IQ, Apple Workout Buddy,
   plus new AI-coach entrants surfacing in comparison SEO (Arvo, Push/Pull). Volyume's
   deliberate no-LLM determinism is increasingly *contrarian positioning* rather than parity —
   the docs' "transparent deterministic coach" differentiation argument gets stronger, but the
   marketing job of explaining why no-AI is a feature gets harder.
6. **Peloton app pricing rose in October 2025** (App One $15.99, App+ $28.99; All-Access
   $49.99) and the default app trial is 7 days — relevant to any pricing-ladder comparisons
   drawn from the docs' tables.

---

## Part 4 — Delta verdicts on built features

Context: per `_BUILD-STATUS-AND-RESUME.md`, four features were built on these docs' claims.
Verdicts below are based **only on what survived validation above**.

### (a) Quiz-first onboarding flipped live (`ONBOARDING_QUIZ_FIRST = true`) — **KEEP**

The evidence chain held and got stronger. Ladder's onboarding-quiz-to-pLTV mechanic is
verified word-for-word from the Sub Club episode (#28); BetterMe's quiz-before-price
emotional-investment funnel is verified and is actually *longer* than the doc claimed
(~26 questions / 41 steps, #71); high-converting onboarding teardowns independently confirm
the pattern. The verified cautionary tale also stands: BetterMe pairs quiz-first with a
near-useless free tier and earns hostile sentiment. Volyume's founder decision to ship
genuinely free items alongside (beginner on-ramp, supplement guide, weekly one-liner)
addresses exactly that risk. No change required.

### (b) Free beginner on-ramp (B2: Home "what do I do today" card, starter micro-quiz → beginner plan, Plans-tab on-ramp card) — **KEEP**

This feature's rationale was the most heavily fact-dependent and every load-bearing fact
verified: Hevy Trainer is real, launched 18 Feb 2026, and is **Pro-gated at $23.99/yr** (#1–3);
Boostcamp's free programme library is real and bigger than claimed (12,196 programmes, #12);
Fitbod's day-0 answer is real but cold-starts for 10–15 workouts behind a 3-workout paywall
(#20–22); gymtimidation at ~50% of US adults is real (#82, corrected attribution). The
strategic gap the on-ramp fills — a **free, jargon-free, day-0 "what do I do today" answer
that is good on session one** — is still unoccupied by any verified competitor: Hevy's is
paid, Boostcamp's needs programme-picking literacy, Fitbod's is paid *and* cold-starting.
One copy-level amendment to internal docs: stop citing "RunRepeat 2020 / 47% UK"; cite
OnePoll/Isopure 2019 (~50% US adults) and PureGym's UK Fitness Report instead.

### (c) Five-part coach response + free weekly one-liner — **KEEP** (with citation hygiene amendments)

The design anchors verified: Future's coach-message model and premium demand signal (#66,
price corrected but demand intact); MacroFactor's adherence-neutral philosophy (#81, substance
verified, quote was a paraphrase); Peloton's instructor-relationship-as-retention (#58,
verified with exact quotes); Centr's verified warm-coach language (#61); Fiit's verified
22% group-effort telemetry (#77). Three amendments, none structural:
1. **Purge the two failed statistics** from any rationale docs feeding this feature — the
   lucid.now D1/D7 numbers (#43) and the orangesoft "42% logging" stat (#44) are unsupported;
   real benchmarks (D1 30–35%, D7 15–20%, 80% gone in 3 months) still justify the design.
2. **Re-date the tone-preference precedent:** Freeletics Coach+ is July 2024 and generative
   AI (#65); Apple now ships Workout Buddy (missed development 1). Cite them as *demand
   evidence* for coach-voice/tone, and position Volyume's renderer explicitly as the
   deterministic, transparent alternative ("real reasons, never AI-generated") — that contrast
   is now sharper and more marketable than when the doc was written.
3. The free weekly one-liner gating matches the verified Caliber generous-free-trust model
   (#73) against the verified BetterMe crippled-free backlash (#72 caveat) — keep the split.

### (d) D1 beginner milestone ladder on workout summary — **KEEP**

The strongest-verified evidence base of the four. Peloton's completion-badge ladder is
verified in precise detail (You Can Ride: bronze/silver/gold at 4/7/8 of 9 classes, #57);
Zwift's route-badge/level collection loop is verified (#78); the watchOS 11 shame-free rest
precedent is verified from the doc's own cited URL (#56); the week-6 guilt abandonment moment
is verified from the doc's own cited URL (#83). The built shape (permanent, completion-based,
non-streak, calm celebration at the summary peak, suppressed for ED-flagged users) matches the
verified psychology exactly. One factual note for future copy: Sweat's "mandatory 4-week
beginner soft-start" was wrong (#68 — eight *optional* weeks, one programme); nothing in the
shipped D1 ladder depends on it.

---

## Pattern notes

1. **App-feature claims were largely sound; numbers and dates were not.** The original agents
   were far more reliable describing *what competitors' products do* (usually right, often
   verbatim-right — Centr quotes, Peloton badge thresholds) than quoting statistics, dates,
   prices, or attributing sources. Every fabrication or unsupported claim found is a number, a
   date, a tier placement, or a citation — not an invented app or feature.
2. **The characteristic failure is "real fact, wrong source"** — the 50% gymtimidation stat
   pinned to a dead RunRepeat URL, retention numbers pinned to a page that says otherwise, a
   42% stat pinned to a page that never contained it. This mirrors the miscitation pattern in
   `COACHING_VOICE_CITATION_AUDIT.md`.
3. **Quotation marks were used for paraphrases** (MacroFactor #81, Hevy founder #9). Any quote
   from these docs must be re-sourced before appearing in user-facing or founder-facing copy.
4. **Currency transposition:** ext-02 silently rendered USD prices as sterling (Centr #62,
   Caliber #73). Treat every "£" in these docs as suspect.
5. **Staleness risk is measured in months in this market.** Between the docs' claims and this
   audit: Ladder 175k→400k members, Boostcamp 11k→12.2k programmes, Alpha Progression price
   rise, Peloton price rise, Zwift level-cap removal, Apple and Peloton both shipping AI
   coaching. Competitive docs in this segment should carry an explicit revalidate-by date.

*Audit complete. No code changed. Files left uncommitted for review.*
