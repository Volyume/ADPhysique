# Competitive Audit 01 — Onboarding & First Value
**Volyume competitive intelligence | 10 June 2026 | Research area: onboarding and time-to-first-value in fitness/coaching apps**

Scope: MacroFactor, Fitbod, Hevy, Strong, RP Hypertrophy, Caliber, Future, Whoop, Noom, Cal AI, plus cross-category references Duolingo and Flo. Sources: app store reviews, Reddit/forum sentiment, UX teardowns (ScreensDesign, Mobbin, App Fuel, RevenueCat, growth-design-style case studies), independent reviews. All findings cited inline; sources listed at the end.

Volyume baseline for comparison: Welcome → **mandatory account** (email/Google/Apple, no anonymous mode) → **UK GDPR Art. 9 health-data consent** (starts 21-day Pro trial: 14 cardless days + 7-day Play intro) → Pro onboarding (body stats incl. body fat, goal selection) → setup-complete reveal with kcal ring → first-run plan path (Plan Library or builder). Deterministic plan generator with per-exercise rationale. Dark premium design, direct copy.

---

## 1. Top 10 Onboarding Experiences, Ranked

| # | App | Why it ranks here | Time to first meaningful moment |
|---|-----|-------------------|--------------------------------|
| 1 | **Fitbod** | Single high-leverage question ("What equipment do you have?") → instantly generated, doable workout. Onboarding built around the completion loop; progress projection shown just before paywall. | ~2–3 min to a generated workout; first completed workout 15–20 min |
| 2 | **Duolingo** (reference) | Gold standard of deferred account creation: value (a completed lesson) before sign-up. A/B-proven. | <2 min to "magic moment" |
| 3 | **Cal AI** | Long quiz-style onboarding that builds investment, then instant magic moment (photo → calories). 61+ paywall experiments; 3x revenue in 10 months; acquired by MyFitnessPal. | Quiz ~3–5 min; first scan is instant value |
| 4 | **MacroFactor** | Short, purposeful wizard (diet style, training type, calorie distribution, protein preference) → coached programme + calorie/macro targets immediately. Science credibility (Stronger By Science) woven into setup. | ~3–5 min to personalised targets; full adaptive value needs 2–4 weeks of logging |
| 5 | **Flo** (reference) | Goal-first branching quiz (up to 400 screen variants), labour-illusion "building your plan" delay, sign-up deferred to the end of data collection. | Minutes to personalised cycle insights |
| 6 | **Caliber** | 20+ step questionnaire viewed positively because payoff is obvious (human coach match + intro call). Strong free tier reduces resentment. | Quiz ~5–10 min; coach call within days; free training immediately |
| 7 | **Hevy** | Log first set in under ~90 seconds; 10 onboarding steps; soft early paywall; generous free tier. Criticised only for forced sign-up before any value. | <2 min to first logged set |
| 8 | **Future** | Thorough intake → human coach matching with choice and bios → video kickoff call. Onboarding sells the relationship, not the app. 4.9★/9,400+ reviews. | Plan arrives after coach call (~days), but perceived value is high |
| 9 | **Strong** | Near-zero onboarding; open app, log a set. Wins on speed, loses on personalisation — no guidance, charts paywalled. | <1 min to first logged set |
| 10 | **Whoop** | Excellent education of its own metrics during setup, but value is structurally delayed: 4 days minimum, 30 days to full baseline; payment + hardware required upfront. | 4–30 days |

Special case — **Noom**: instructive as both positive and negative. Up to 113 onboarding screens (10–15 min) executed with pacing, reassurance and payoff framing (RevenueCat teardown), but widely criticised as manipulative: "asks so many questions before giving a concrete understanding of how they're going to help… horrible onboarding flow" (The Behavioral Scientist); roach-motel cancellation, 2,300+ BBB complaints, $100M class action. **RP Hypertrophy** ranks below the ten on onboarding specifically: steep setup, "if you have never heard of a mesocycle, this app isn't for you", no free trial.

---

## 2. Per-App Deep Dives

### 2.1 Fitbod — best-in-class activation loop
- Opens with **motivation, not demographics**: "What's the main reason you're joining?" (App Fuel teardown). Equipment question is the core personalisation input.
- Generates a **specific, completable first workout** (warm-up 2 min, 3–4 exercises, cool-down) rather than a template library — the decisive activation signal: first-workout completers are significantly more likely to return (DEV/PaywallPro fitness onboarding guide).
- **Pre-paywall projection**: shows 3-month progress estimate derived from the user's answers — a taste of outcome before asking for money.
- Smart permission framing: notifications requested with a concrete benefit ("On the days you exercise, do you want a preview of your workout?").
- Trial mechanics: **3 free workouts, no card required**. Criticism: three workouts is too few for an algorithm that needs 10–15 sessions to show its quality (Indie Hackers review) — the trial under-demonstrates the long-term value.

### 2.2 Duolingo (cross-category reference)
- **Deferred account creation**: complete a lesson first, sign-up prompted at logical breakpoints; Duolingo's own A/B tests showed delayed sign-up outperforms front-loading (Appcues, App Fuel, UserGuiding teardowns).
- Magic moment defined precisely ("I can answer something in a new language") and the entire flow optimises time-to-that-moment, deferring all friction.

### 2.3 Cal AI
- **Long quiz deliberately**: investment-building questions raised conversion in A/B tests; onboarding paywall treated as a product surface — 61 experiments on layout, offer framing, urgency (Superwall case study). 3-day soft-paywall trial converting to annual.
- The quiz works because the **magic moment after it is instant and visceral** (photograph food → calories). Lesson: quiz length is tolerated in proportion to the immediacy of the payoff.

### 2.4 MacroFactor
- Setup wizard covers diet style, training type, calorie cycling, protein preference; produces a coached programme and targets in minutes ("nothing was overly complicated" — A Couple Consumers review).
- **Honest about cold-start limits**: initial TDEE is a formula estimate; true adaptive expenditure needs 3–4 weeks of logging, with a documented **back-fill option** to fast-track using existing data (MacroFactor help docs). Users commonly feel initial targets are off — managed via education rather than false precision.
- **Science as brand**: Greg Nuckols/Eric Trexler (Stronger By Science) credibility is the intelligence story; protein targets framed as evidence-based ranges. Trade-off: onboarding assumes more nutrition knowledge than consumer apps (Fitness Tools Reviewed).

### 2.5 Flo (cross-category reference)
- Goal-first branching ("Track cycle / Get pregnant / …") drives a quiz of up to 400 possible screens, maintained via backend-driven onboarding (Flo Health engineering blog).
- **Labour illusion**: a crafted artificial delay at quiz end ("building your plan") increases perceived value of the personalised output (Medium/Bootcamp teardown of Flo & Zoe funnels).
- Sign-up **deferred to after the quiz**, framed as "save your progress".

### 2.6 Caliber
- 20+ onboarding steps (fitness level, experience, equipment) — yet sentiment is positive because users see the length as the price of a genuinely personalised programme and a **human coach match with an intro call** (Fitness Drum, BarBend, Sports Nerd reviews).
- **Generous free-forever tier** (unlimited tracking, 600+ exercises, ad-free) removes paywall resentment entirely from the first-run experience.

### 2.7 Hevy
- One of the fastest flows in the category: "download, create an account, and log your first set in under 90 seconds — no paywall upfront, no mandatory fitness assessment" (RepReturn). Soft paywall appears early (~39s in the ScreensDesign capture) but is skippable; paywall itself is heavy on social proof (testimonials, 'Apps We Love' badge, comparison table).
- Main critique: **forces sign-up before any core feature**; ScreensDesign explicitly suggests guest-mode logging would reduce initial drop-off.
- Community routines give beginners a first plan ("downloading other people's routines… helped me figure out what to do in the gym as it was my first time ever" — Play Store review).

### 2.8 Future
- Intake quiz → algorithmic **coach shortlist plus self-serve browsing of coach bios** → payment → kickoff video call. Users repeatedly cite the coach-matching choice and the call as the moment it feels personal (GymBird 30-day test, On Better Living 4-year review).
- Card required at onboarding and $149–199/mo, yet 4.9★ — proof that **a hard commitment is accepted when the perceived counterpart is a human relationship**, not an algorithm.

### 2.9 Strong
- Effectively no onboarding: open, tap, log. Praised as "minimal in the best way" (RepReturn, HotelGyms). The anti-quiz benchmark for time-to-first-action.
- Cost of that choice: zero personalisation, no programming for beginners, and progress charts behind the paywall — a frequently named complaint.

### 2.10 Whoop
- Onboarding educates well (Strain/Recovery/Sleep explained as individual-relative metrics — Everyday Industries UX evaluation) and sets expectations for the **4-day calibration / 30-day baseline**.
- Structural weaknesses: payment + hardware before any value; recent severe trust damage from upgrade-policy reversal and billing complaints ("charged for full annual memberships without clear consent" — BBB/Trustpilot, CCW Digital on the 2025–26 backlash). A cautionary tale that onboarding goodwill is destroyed by commitment traps.

### 2.11 Noom (instructive negative/positive hybrid)
- Positive mechanics (RevenueCat teardown of the 113-screen funnel): every question visibly builds toward the payoff; sensitive questions met with reassurance; "I haven't decided" options remove pressure; broad age brackets instead of exact age; pacing breaks between question blocks.
- Negative: time-investment-before-value is the canonical critique ("violates nearly every rule of Behavioral Design… incredible amount of time before providing any value" — The Behavioral Scientist); mental fatigue at the payment screen and sunk-cost pressure read as **dark patterns** (Every.to "The Dark Side of Noom", UNTRAPPED psychologist review); roach-motel cancellation; class action. The backlash transferred to the brand, not just the funnel.

### 2.12 RP Hypertrophy (below the line)
- First task is choosing/designing a mesocycle from ~40 templates; "steep learning curve", intermediate knowledge assumed (Dr Muscle critiques, Medium 6-month review; setup itself "extremely easy" for experienced lifters — Physique Collective).
- **No free trial, no free tier**, $25–35/mo: the most-cited barrier. Demonstrates the cost of pairing complex onboarding with a hard pre-value paywall.

---

## 3. User Sentiment Synthesis (love / hate / wish)

**Users love**
- Instant first action: Hevy's sub-90-second first set (RepReturn); Strong's zero-setup logging (HotelGyms).
- Visible personalisation payoff: Fitbod's generated first workout and 3-month projection (App Fuel); Caliber's "long but it set the stage for a truly personalised program" (Fitness Drum).
- Science/credibility transparently communicated: MacroFactor's Stronger By Science pedigree cited even by a registered dietitian switching from MyFitnessPal (Fitness Tools Reviewed); Whoop's metric education (Everyday Industries).
- Cardless trials: Fitbod's no-card trial is called out approvingly; data shows no-card trialists retain better post-conversion (~80% vs ~60%, Chargebee/Monetizely round-ups).

**Users hate**
- Time investment before any concrete value (Noom — universally cited).
- Forced sign-up before seeing the product (Hevy critique in ScreensDesign; Quora threads on pre-value registration drop-off).
- Hard paywalls pre-value (RP Hypertrophy's no-trial model; "all of analytics locked behind a paywall with no warning" — App Store review of a gym-plan app).
- Subscription/cancellation traps poisoning an otherwise good first run (Noom, Whoop billing complaints).
- Trials too short to show algorithmic value (Fitbod's 3 workouts vs an algorithm needing 10–15 — Indie Hackers).

**Users wish for**
- Guest/try-before-account modes (ScreensDesign on Hevy).
- Clear rationale for recommendations — research literature confirms most apps give none (PMC reviews of exercise apps: ~⅓ provide no FITT parameters; rationale gaps named as a trust barrier). This is rare in market and Volyume already has it.
- Honest cold-start communication with a fast-track (MacroFactor's back-fill is the model).

---

## 4. Best-in-Class & Most Common Failure Mode

**Single best implementation: Fitbod's first-session loop.** One high-signal question → a complete, doable, personalised workout → completion celebrated → outcome projection → then the ask. It compresses "this app understands me" into the first five minutes and ties monetisation to a felt result. (Runner-up: Duolingo's deferred sign-up, the cleanest proof that moving account creation after first value raises completion.)

**Most common failure mode: front-loading commitment before demonstrating value.** It appears in three guises — Noom's quiz fatigue before any plan, Hevy's account wall before any logging, RP's paywall before any workout. The pattern across all sentiment sources: users tolerate almost any quiz length or price *after* a felt moment of value, and resent almost any friction *before* it.

---

## 5. Volyume vs Each — Lead / Match / Lag

| App | Volyume leads | Volyume matches | Volyume lags |
|---|---|---|---|
| **Fitbod** | Per-exercise rationale (Fitbod doesn't explain picks); 21-day trial vs 3 workouts; nutrition+training in one | Personalised plan generation; cardless start | No instantly completable "first workout" moment; account+consent+stats wall before any plan exists |
| **Duolingo** | n/a (different category) | — | No value before account; no deferred sign-up; magic moment not defined/instrumented |
| **Cal AI** | Honest deterministic engine vs AI hype; longer trial | Quiz-style goal/stat capture | No instant visceral payoff straight after the quiz; far less paywall/onboarding experimentation cadence |
| **MacroFactor** | Plan exists immediately (MF's adaptive value needs weeks); per-exercise rationale | Science-forward positioning; direct copy; evidence-based targets | No back-fill/fast-track story for returning trainees; MF's credibility narrative (named scientists) is stronger than an unexplained "deterministic engine" |
| **Flo** | Health-data consent is genuinely compliant and explicit (UK GDPR Art. 9) vs Flo's chequered privacy history | Goal-first quiz; "setup complete" reveal (kcal ring ≈ plan reveal) | Sign-up deferred at Flo, front-loaded at Volyume; no labour-illusion plan-building moment dramatising the generator |
| **Caliber** | Faster to a plan (no human scheduling); rationale per exercise | Thorough intake justified by personalised output | Caliber's free-forever tier removes trial anxiety entirely; Volyume's free tier only fully visible post-trial |
| **Future** | Price accessibility; instant plan vs days of waiting | Premium feel; goal-led intake | Human warmth — nothing in Volyume onboarding makes the "coach" feel like it knows you personally beyond the rationale text |
| **Strong** | Personalisation, guidance, rationale (Strong has none) | Dark, focused, no-fluff aesthetic | Raw speed: Strong logs a set in <1 min; Volyume requires account+consent+stats+goal before anything |
| **Whoop** | No hardware, cardless 14 days, value on day one (plan immediately, not day 4–30) | Metric education opportunity (kcal ring reveal) | Whoop's onboarding *teaches its metrics* unusually well; Volyume's reveal must explain the kcal ring and plan logic or it's just a number |
| **Noom** | Ethical trial mechanics (cardless 14 days, Play-managed cancellation — no roach motel); shorter quiz | Psych-informed sequencing potential | Noom's pacing craft (reassurance, payoff framing, "haven't decided" options, breaks) is more deliberate than a stats form |

**Net position:** Volyume's plan-with-rationale + 21-day cardless-first trial is genuinely differentiated (almost nobody explains *why* each exercise; almost nobody offers 14 cardless days). Its structural weakness is the **stacked pre-value wall**: account → Art. 9 consent → body stats (incl. body fat, an intimidating ask) → goal — all before any plan exists. That is the exact failure mode the category punishes hardest.

---

## 6. Improvement Opportunities for Volyume (prioritised)

1. **Move first value before, or visibly adjacent to, the account wall.** Even if account+consent must precede data storage (legitimate for Art. 9), show a *preview*: a sample plan, or a 3-question goal teaser whose output renders on-screen pre-signup ("here's what your Tuesday would look like"). Duolingo's A/B evidence and the Quora/ScreensDesign drop-off literature both indicate this is the single largest funnel lever. *Impact: directly attacks the category's #1 failure mode at the top of the funnel.*

2. **Define and instrument the magic moment.** Fitbod's is "first workout completed"; Duolingo's is "first sentence understood". Volyume's should be "first plan revealed with rationale" or "first session logged" — pick one, measure time-to-it, and ruthlessly remove steps that delay it. *Impact: gives every future onboarding decision an objective target.*

3. **Make the plan reveal a moment, not a screen.** Add a brief deterministic "building your plan — analysing your goal, your stats, your division" sequence (honest labour illusion: the generator genuinely runs) culminating in the plan + kcal ring together, with one line of rationale surfaced immediately. Flo/HelpDocs evidence: crafted delay measurably increases perceived value of personalised output. *Impact: converts the generator's invisible work into felt personalisation — "built for me".*

4. **Lead the marketing of the trial with "no card for 14 days".** Cardless trials are rare in this set (Fitbod aside) and sentiment data shows lower anxiety and better post-conversion retention for no-card starts. State it on the welcome screen and at consent ("Start free — no card, cancel nothing"). *Impact: cheap copy change, addresses the most common store-review complaint class (trial traps).*

5. **Make body fat optional with an "estimate for me" path.** It is the most intimidating onboarding input in the flow; Noom's lesson is to offer pressure-release options ("I'm not sure") and broad brackets, or visual-silhouette estimation. *Impact: reduces abandonment at the single most sensitive quiz step, especially for beginners.*

6. **Tell the intelligence story during, not after, the quiz.** MacroFactor converts scepticism with named science; Whoop teaches its metrics in setup. Volyume should interleave 2–3 short "why we ask" interstitials ("Your body-fat estimate sets your protein floor — here's why") and a one-screen "deterministic, not AI — same inputs, same plan, fully explainable" statement. The research literature shows rationale is the #1 unmet trust need in exercise apps, and Volyume actually has it. *Impact: turns an existing engine property into a differentiating onboarding narrative.*

7. **Add a back-fill / experienced-lifter fast lane.** MacroFactor's back-fill is loved; RP's failure is forcing everyone through the same conceptual gate. Ask "Have you trained before?" early and let experienced users import/declare lifts so the first plan is calibrated, while beginners get the guided path. *Impact: improves first-plan quality for the highest-LTV segment and shortens their quiz.*

8. **End onboarding with a completable first action, not just a reveal.** After the kcal ring, route directly into "Start your first session — 40 minutes, here's why each exercise is in it" (Plan Library default pre-selected). Fitbod's data: first-workout completion is the strongest return-visit predictor. *Impact: converts setup completion into activation, the metric that actually predicts trial conversion.*

9. **Use the 21-day structure as a narrative.** Communicate the trial as a journey ("Days 1–14: train and see the engine adapt, no card. Day 14: add Play trial for 7 more days"). Fitbod's trial fails because it ends before the algorithm proves itself; Volyume's 21 days are long enough — say so, and schedule in-trial moments (first weekly adjustment) that demonstrate the coaching engine before the payment decision. *Impact: aligns conversion ask with demonstrated value, the pattern every winner in this audit shares.*

10. **Audit quiz pacing against Noom's positive mechanics, not its length.** Keep the flow short, but borrow: progress indication, reassurance copy on sensitive inputs, one "payoff preview" mid-quiz. Avoid: any sunk-cost framing or urgency at the consent step — UK users are primed to read it as a dark pattern post-Noom/Whoop backlash. *Impact: protects the premium, trustworthy brand position that justifies Pro pricing.*

---

## Sources

- [App Fuel — Fitbod onboarding flow](https://www.theappfuel.com/examples/fitbod_onboarding)
- [DEV/PaywallPro — Fitness App Onboarding Guide](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)
- [Indie Hackers — Fitbod App Review 2026](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b)
- [Fitbod Help — How the free trial works](https://fitbod.zendesk.com/hc/en-us/articles/360004950553-How-the-free-trial-works)
- [Appcues — Duolingo user onboarding](https://goodux.appcues.com/blog/duolingo-user-onboarding)
- [App Fuel — Three learnings from Duolingo's onboarding](https://theappfuel.com/casestudies/three-learnings-from-duolingos-onboarding)
- [UserGuiding — Duolingo onboarding breakdown](https://userguiding.com/blog/duolingo-onboarding-ux)
- [Superwall — Cal AI case study](https://superwall.com/case-studies/cal-ai)
- [ScreensDesign — Cal AI UI breakdown](https://screensdesign.com/showcase/cal-ai-calorie-tracker)
- [Mobbin — Cal AI iOS onboarding flow](https://mobbin.com/explore/flows/579da5dd-453a-4e7c-9c11-d20708a4db82)
- [A Couple Consumers — MacroFactor feedback](https://acoupleconsumers.com/macro-factor-my-feedback/)
- [MacroFactor Help — Initial expenditure accuracy](https://help.macrofactorapp.com/en/articles/206-what-should-i-do-if-my-initial-expenditure-or-recommended-energy-intake-seems-too-high-or-too-low)
- [Stronger By Science — MacroFactor algorithms & philosophy](https://www.strongerbyscience.com/macrofactor-algorithms-philosophy/)
- [Fitness Tools Reviewed — MacroFactor review](https://fitnesstoolsreviewed.com/app-reviews/macrofactor-review-is-this-nutrition-app-worth-it/)
- [Medium/Bootcamp — How Flo and Zoe use web-to-app quiz funnels](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7)
- [Flo Health Engineering — Mobile onboarding evolution Pt 1](https://medium.com/flo-health/mobile-onboarding-evolution-part-1-cfc9702835ce)
- [Mobbin — Flo Android onboarding flow](https://mobbin.com/explore/flows/4ceaac02-e25d-419e-ae7e-58ed7bd1e1e3)
- [Fitness Drum — Caliber app review](https://fitnessdrum.com/caliber-app-review/)
- [BarBend — Caliber fitness app review 2026](https://barbend.com/caliber-fitness-app-review/)
- [Sports Nerd — Caliber review 2025](https://sports-nerd.com/brand/caliber/)
- [ScreensDesign — Hevy showcase](https://screensdesign.com/showcase/hevy-workout-tracker-gym-log)
- [RepReturn — Hevy app review](https://repreturn.com/hevy-app-review/)
- [Google Play — Hevy reviews](https://play.google.com/store/apps/details?id=com.hevy)
- [GymBird — I tried the Future app for 30 days](https://www.gymbird.com/fitness-apps/i-tried-the-future-app-for-30-days-here-are-the-results)
- [On Better Living — Future app 4-year review](https://onbetterliving.com/future-app/)
- [Cora — Future fitness app review 2026](https://www.corahealth.app/compare/future)
- [RepReturn — Strong app review](https://repreturn.com/strong-app-review/)
- [HotelGyms — Strong app review 2026](https://www.hotelgyms.com/blog/the-strong-app-review-think-less-lift-more)
- [Setgraph — Strong app review](https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph)
- [Everyday Industries — WHOOP UX evaluation](https://everydayindustries.com/whoop-wearable-health-fitness-user-experience-evaluation/)
- [WHOOP Support — Calibration timeline](https://support.whoop.com/s/article/Calibration-Timeline?language=en_US)
- [CCW Digital — WHOOP backlash explained](https://www.customercontactweekdigital.com/cx-news-and-trends/articles/whoop-upgrade-customer-backlash)
- [BBB — Whoop complaints](https://www.bbb.org/us/ma/boston/profile/health-products/whoop-inc-0021-504984/complaints)
- [Trustpilot — Whoop reviews](https://www.trustpilot.com/review/whoop.com)
- [The Behavioral Scientist — Noom product critique: onboarding](https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding)
- [Every.to — The Dark Side of Noom](https://every.to/glassy/the-dark-side-of-noom)
- [UNTRAPPED — A psychologist reviews the dark psychology of Noom](https://untrapped.com.au/a-psychologist-reviews-the-dark-psychology-of-noom-part-1/)
- [RevenueCat — Inside Noom's web-to-app onboarding funnel](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/)
- [RevenueCat — Why your onboarding might be too short](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short/)
- [Dr Muscle — RP Hypertrophy app review / 13-point critique](https://dr-muscle.com/rp-hypertrophy-app-critique/)
- [Medium — I used the RP Hypertrophy app for 6 months](https://medium.com/@justinsmith31491/i-used-the-rp-hypertrophy-app-for-6-months-f20e67378b20)
- [Physique Collective — RP Hypertrophy honest review](https://physiquecollective.com/extras/rphypertrophyapp)
- [Chargebee — SaaS free trial: credit card or no credit card](https://www.chargebee.com/blog/saas-free-trial-credit-card-verdict/)
- [Monetizely — Card-required vs cardless trial conversion](https://www.getmonetizely.com/faqs/for-those-who-do-offer-a-free-trial-do-more-people-end-up-converting-if-you-require-a-credit-card-ensuring-they-re-serious-or-if-you-don-t-require-one-lowering-friction)
- [PMC — Evaluation of exercise mobile applications (rationale/FITT gaps)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10743387/)
- [HelpDocs — Onboarding rebuild & labour illusion](https://blog.helpdocs.io/we-rebuilt-our-onboarding-from-scratch-heres-what-we-learned/)
- [Quora — Drop-off when apps require accounts before value](https://www.quora.com/Whats-the-dropoff-rate-when-apps-require-users-to-create-an-account-before-seeing-the-content-value-in-the-app)
