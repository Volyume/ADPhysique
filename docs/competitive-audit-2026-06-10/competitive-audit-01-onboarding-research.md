# Competitive Audit 01 — Onboarding and First Value

**Agent 7 of 14 · Date: 10 June 2026 · Scope:** onboarding and time-to-first-value across the
top fitness/coaching apps, benchmarked against Volyume's current flow (baseline §3.7,
`competitive-audit-00-volyume-baseline.md`).

**Method note:** direct page fetches were blocked from this environment (403 on most
publisher domains), so findings were gathered via extensive web search across published
teardowns (Growth.design, RevenueCat blog, UX Collective/Growth Dives, UXCam, Adapty,
Apphud, Superwall case studies, Mobbin/Page Flows flow libraries) and review evidence
(App Store, Trustpilot, independent reviews). Every claim is cited; where a figure comes
from a search-extracted summary rather than a full-page read, treat it as directionally
reliable rather than audited.

---

## 1. Executive summary

- The category has split into two winning patterns: **instant-utility onboarding**
  (Hevy <90 seconds to a logged set; Fitbod one equipment question → a generated
  workout) and **quiz-theatre onboarding** (Runna, Flo, Noom, Cal AI — long,
  emotionally sequenced quizzes that build commitment before a paywall). Both work;
  what fails is a long quiz that *doesn't* feel personal, or science the user can't parse
  (RP Hypertrophy).
- **Deferred sign-up wins where it's been tested.** Duolingo's famous soft-wall
  experiment lifted DAU ~20% by letting users learn before registering
  ([First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/)).
  Flo collects the entire quiz first and asks for an account at the end, framed as
  "save your progress" ([Medium/Bootcamp](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7)).
  Volyume's account-before-anything wall is the pattern of trackers (Hevy, Fitbod,
  Strava, MacroFactor), not of coached/personalised apps — and Volyume is selling a
  coached experience.
- **Paywall/trial timing is converging on "end of the personalisation quiz, before
  first use".** RevenueCat's State of Subscription Apps shows 80–89% of trials start on
  day 0 (Health & Fitness: 82.1%) ([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps/)).
  Volyume's 14-day cardless trial granted at consent is *more generous* than the
  category norm (card-on-file day-0 trials) — an under-marketed strength.
- **Quiz theatre measurably converts.** Adapty A/B data: adding personalisation
  questions plus a "customising your experience" loading screen produced +8.5% trial
  starts, +17% paying conversions, +22% ARPU (US: +27% paying, +35% ARPU)
  ([Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)).
- **Progress signalling matters at Volyume's exact weak point.** A visible progress
  bar cut first-screen drop-off from 38.4% to 24.1%; cutting a sign-up form from 7
  fields to 3 cut funnel abandonment 44.7%; social login lifts completion ~60%
  ([Amra & Elma funnel statistics](https://www.amraandelma.com/funnel-drop-off-rate-statistics/)).
  Global onboarding completion is only ~8–9%, though health/fitness is among the best
  categories at ~26% day-one completion ([Digia](https://www.digia.tech/post/app-onboarding-rates-statistics)).

---

## 2. Ranked top 10 (by evidence of onboarding quality)

Ranking weighs: (a) published teardown evidence, (b) speed/credibility of the first
meaningful moment, (c) how personalisation and intelligence are communicated,
(d) review sentiment. RP Hypertrophy was assessed and **excluded from the top 10**
(see §3.11) — it is the cautionary tale most relevant to Volyume.

| # | App | First meaningful moment | Time to it | Account wall | Paywall timing |
|---|-----|------------------------|-----------|--------------|----------------|
| 1 | **Runna** | Personalised plan reveal + coach intro message | ~12 min quiz | During flow | End of quiz, 7-day trial |
| 2 | **Fitbod** | A generated, doable workout from one equipment question | ~2–3 min | Up front | Trial requires plan opt-in; 3 free workouts |
| 3 | **Flo** | Cycle predictions after quiz; "labor illusion" plan build | ~4.5 min to paywall | **Deferred to end** | ~04:22 in, 14-day trial toggle |
| 4 | **Cal AI** | Demo video up front; first food scan | Minutes (post-paywall) | Up front | Hard paywall after quiz, 3-day trial |
| 5 | **Noom** | Personalised weight-loss curve/plan | 15–30 min, 67 steps | Late (web funnel) | After full quiz commitment |
| 6 | **Hevy** | First logged set | **<90 seconds** | Up front (minimal) | None up front; freemium |
| 7 | **MacroFactor** | Coached macro programme from TDEE wizard | ~3–5 min | Up front | Day-0 plan selection, 7-day trial |
| 8 | **Strava** | First recorded/synced activity with own metrics | ~30 s with a device | Up front (social product) | Progressive, post-value |
| 9 | **Caliber** | Personalised plan after assessment | 20+ steps, "high" | Up front | 7-day Pro trial; generous free tier |
| 10 | **Whoop** | Calibrated recovery/strain baseline | **4–7 days** | Up front + hardware | Hardware-bundled membership |

---

## 3. Per-app findings

### 3.1 Runna — best-in-class for a coached-plan product
- 25 onboarding screens, ~12 minutes — yet the canonical "how to nail onboarding"
  case study ([Rosie Hoggmascall, UX Collective / Growth Dives](https://www.growthdives.com/p/how-to-nail-onboarding-a-case-study)).
  "There's nothing flashy about Runna's onboarding — it just makes you believe you can
  actually do it"; the quiz "makes users feel seen", mapped to self-determination
  theory (autonomy, competence, relatedness).
- Personalisation depth is the theatre: questions cover weekly availability and even
  "the hilliness of local running routes" ([Growth Dives](https://www.growthdives.com/p/how-to-nail-onboarding-a-case-study)).
  After the plan is generated, the app **introduces a named coach with a short personal
  message** ([Reteno gallery](https://gallery.reteno.com/flows/app-screens-runna)).
- Paywall sits at the end of the quiz: annual highlighted with "SAVE 50%", price
  broken down weekly; standard 7-day trial ([Runna pricing](https://www.runna.com/pricing), [support](https://support.runna.com/en/articles/8112247-managing-your-runna-subscription)).
- Sentiment: App Store reviewers say Runna "created a program using all the info
  provided that is perfect for me" ([App Store reviews](https://apps.apple.com/us/app/runna-running-plans-coach/id1594204443));
  "an excellent, pocket-size running coach" ([The Runner Beans](https://therunnerbeans.com/runna-coaching-app-review/)).
  One first-month reviewer: after "a 12-minute-long onboarding", users "felt pretty
  relaxed about it all" ([Medium/Runner's Life](https://medium.com/runners-life/runners-review-my-first-month-insights-using-runna-e441231db8fb)).

### 3.2 Fitbod — fastest credible personalised value
- Onboarding is built around the **completion loop**: "When a new user starts, they're
  asked a single question: 'What equipment do you have?'" and the app generates "a
  specific, doable workout — not a series of options, not a template library",
  completable in 15–20 minutes ([PaywallPro/DEV guide](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)).
- "Users who complete their first workout are significantly more likely to return for
  a second session" — first-workout completion is the activation metric
  ([same source](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)).
- Account required before the first workout; no guest mode; trial requires opting into
  a subscription plan; effectively 3 free workouts then subscribe
  ([Fitbod Help](https://fitbod.zendesk.com/hc/en-us/articles/360004950553-How-the-free-trial-works), [Dr Muscle](https://dr-muscle.com/fitbod-free-vs-fitbod-elite-review/)).
- Sentiment: "really does feel like having a personal trainer with you"; "From the
  off, you select the equipment you have available" vs apps that "require a good few
  hours to get your data… ready" ([TechRadar](https://www.techradar.com/health-fitness/fitbod-app-review)).

### 3.3 Flo — the deferred account wall, industrialised
- Quiz first, account last: "Unlike most apps that require signup upfront, Flo
  encourages users to save their progress by signing up at the end of the data
  collection process" ([Medium/Bootcamp](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7)).
- Uses a **crafted delay** ("labor illusion") when building the plan so the result
  feels earned and trustworthy; a commitment screen ("tap and hold" affirmation)
  immediately before the paywall converts "self-reflection into micro-commitment"
  ([same source](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7), [ScreensDesign](https://screensdesign.com/showcase/flo-period-pregnancy-tracker)).
- Scale of investment: onboarding branches up to ~400 screens, ~5 hypotheses tested per
  two-week sprint, run by a dedicated Survey Engine platform team
  ([Flo Health engineering, Medium](https://medium.com/flo-health/mobile-onboarding-evolution-part-1-cfc9702835ce)).
- Paywall at ~04:22 with a 14-day trial toggle; post-subscribe "gift" discount
  ([ScreensDesign](https://screensdesign.com/showcase/flo-period-pregnancy-tracker)).
  Flo handles special-category health data, like Volyume, and still defers the account.
- Sentiment: very high conversion for the category, but Trustpilot reviewers complain
  of repeated subscription pop-ups ([Trustpilot](https://www.trustpilot.com/review/flo.health?page=3)).

### 3.4 Cal AI — value demo before a hard paywall
- Onboarding "starts with a short demo video of the app", is "full of animations",
  "prompts for a review mid-onboarding", and "generates a personalized plan"
  ([César Álvarez teardown, X](https://x.com/cesaralvarezll/status/2036873854455255505)).
- Monetisation: hard paywall after the quiz, 3-day trial, annual pushed at 75% off;
  the onboarding paywall went through **61 experiments**, contributing to 3×+ monthly
  revenue growth in 10 months ([Superwall case study](https://superwall.com/case-studies/cal-ai)).
- Sentiment is the warning: "the price hidden until users go through the entire setup
  process" is one of the biggest complaints, and "the most common frustration… is the
  sharp drop-off when the trial ends" — users locked out of their own log
  ([Nutrola](https://nutrola.app/en/blog/cal-ai-free-vs-paid-what-do-you-actually-get), [eesel](https://www.eesel.ai/blog/cal-ai-pricing)).
  Volyume's localised store price on the welcome screen is the direct antidote.

### 3.5 Noom — conversion masterclass, first-value laggard
- 67 steps home page → payment; quizzes used "to increase buy-in, not just collect
  data"; sensitive asks softened ("We don't mean to pry, we just need this to build a
  plan that's right for you"); by paywall time users have invested effort — "a proven
  driver of paywall conversion" ([RevenueCat teardown](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/)).
- Questionnaire takes 15–30 minutes ([ChoosingTherapy](https://www.choosingtherapy.com/noom-review/)).
- Published critique: Noom built "this really bad, long onboarding experience",
  asking "so many questions before even giving a concrete, easy-to-understand
  understanding of how they're going to help" ([The Behavioral Scientist](https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding)).
- Lesson: commitment-building works *for conversion*, but the value promise must be
  legible early or sentiment sours.

### 3.6 Hevy — the speed benchmark
- "Download, create an account, and you can log your first set in under 90 seconds.
  There is no paywall upfront, no mandatory fitness assessment, no algorithm asking
  you to pick your goals before showing you the app"
  ([RepReturn](https://repreturn.com/hevy-app-review/)).
- Account is required but minimal; freemium with no onboarding paywall
  ([Hevy](https://www.hevyapp.com/)). This is the ceiling Volyume's Free path
  (name + units only) already nearly matches.

### 3.7 MacroFactor — science communicated, but dense
- Trial start ≈3 minutes; goal/diet/coaching-style questions ≈2 minutes; coached
  programme from a TDEE wizard ([NutriScan](https://nutriscan.app/blog/posts/macrofactor-free-trial-2026-start-cancel-guide-2ee8910479), [MacroFactor help](https://help.macrofactorapp.com/en/articles/206-what-should-i-do-if-my-initial-expenditure-or-recommended-energy-intake-seems-too-high-or-too-low)).
- No free tier, ever, by stated policy; plan selection on day 0 for the 7-day trial
  ([NutriScan](https://nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b)).
- Sentiment: "the coaching flow feels like a conversation with an assistant who has a
  lot to say — useful in month six, overwhelming in week one"; beginners find it
  overwhelming because it assumes users "already understand TDEE, macros, and trend
  weights" ([Nutrola](https://nutrola.app/en/blog/apps-like-macrofactor-but-simpler), [Fuel Nutrition](https://fuelnutrition.app/reviews/macrofactor-review)).

### 3.8 Strava — instant mirror, account-first by design
- Account up front (it is a social network), then primary sport + profile; onboarding
  "skips secondary features… and focuses on the core loop: record an activity, see it,
  share it" ([Page Flows](https://pageflows.com/post/android/onboarding/strava/), [The App Fuel](https://www.theappfuel.com/examples/strava_onboarding)).
- With a synced watch, "within 30 seconds a user sees their last activity — distance,
  pace, elevation, heart rate" ([PaywallPro/DEV](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)).
- Premium is disclosed progressively during onboarding "to avoid backlash", with
  conversion driven post-value by in-app prompts ([Growth.design case study](https://growth.design/case-studies/strava-freemium-conversion)).

### 3.9 Caliber — personalisation framed well, but slow
- "The onboarding process is thorough but can feel long, with over 20 steps", yet it
  "successfully frames these questions as essential for building a truly personalized
  plan"; reviewers explicitly flag that "the time-to-value is high" and long onboarding
  "could lead to drop-off for less motivated users"
  ([ScreensDesign](https://screensdesign.com/showcase/caliber-strength-training), [BarBend](https://barbend.com/caliber-fitness-app-review/), [Fitness Drum](https://fitnessdrum.com/caliber-app-review/)).
- Compensates with a genuinely generous free tier (unlimited logging, 600+ exercises)
  and a 7-day Pro trial ([Caliber](https://caliberstrong.com/workout-app/)).

### 3.10 Whoop — best science education, worst time-to-value
- Onboarding "does a really good job at educating the user about what Strain,
  Recovery, and Sleep mean, how they are measured, and how they are only relevant to
  you", reinforced by an email chain ([Luigi D'Introno product review](https://medium.com/@DiaryOfAProductManager/who-gives-a-whoop-a-product-review-7df3fab019f7)).
- But a 4-day calibration phase means "the onboarding period is between 4–7 days…
  the time to value the product is slightly too long and sometimes frustrating"
  ([same review](https://medium.com/@DiaryOfAProductManager/who-gives-a-whoop-a-product-review-7df3fab019f7), [Whoop support](https://support.whoop.com/s/article/Calibration-Timeline?language=en_US)).
- Relevant pattern: Whoop *bridges* the dead time with daily education — turning a
  waiting period into a perceived-intelligence builder.

### 3.11 RP Hypertrophy — the cautionary tale (unranked)
- A ~12-minute assessment (training age, injury history, weekly volume per muscle,
  sleep, recovery scores) feeds mesocycle setup ([Alibaba/wellness review](https://wellness.alibaba.com/fitlife/rp-hypertrophy-app-review-cost-guide)).
- "The app wasn't built with beginners in mind"; users unfamiliar with "mesocycle" or
  "maintenance volume" are advised to start elsewhere; it "requires an intermediate
  level of knowledge" ([Dr Muscle review](https://dr-muscle.com/rp-hypertrophy-app-review/), [critique](https://dr-muscle.com/rp-hypertrophy-app-critique/)).
- Direct lesson for Volyume: science-heavy hypertrophy onboarding fails when the
  jargon arrives before the value. Volyume's "why this" reveal is the right instinct —
  the reveal must translate, not lecture.

---

## 4. Cross-cutting analysis

### 4.1 Account-wall timing — who defers, who doesn't, what it costs
- **Defer:** Flo (quiz → "save your progress" sign-up at the end)
  ([Medium/Bootcamp](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7));
  Duolingo (soft walls; +~20% DAU; the eventual hard wall converted *better* because
  users were primed) ([First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/)).
- **Up front:** Strava, Fitbod, Hevy, MacroFactor, Whoop, Cal AI — but every one of
  these either makes the account near-instant (social login, minimal fields) or has a
  structural reason (social graph, hardware).
- **Cost evidence:** 74% abandon on early friction; 38.4% drop after the first sign-up
  screen, reduced to 24.1% by a progress bar; 7→3 fields cut abandonment 44.7%;
  social login +60% completion ([Amra & Elma](https://www.amraandelma.com/funnel-drop-off-rate-statistics/), [Reteno](https://reteno.com/blog/won-in-60-seconds-how-top-apps-nail-onboarding-to-drive-subscriptions));
  ~8–9% global onboarding completion, health/fitness among the best at ~26% day-one
  ([Digia](https://www.digia.tech/post/app-onboarding-rates-statistics)).
- **Volyume position:** account + blocking Article 9 consent before *any* value is the
  most aggressive wall in this comparison set. Flo proves special-category health data
  does not force consent-before-everything; consent can sit where the data is first
  processed (i.e., before profile inputs, after motivation/goal capture).

### 4.2 Personalisation theatre — what measurably works
- Quiz + "customising your experience" loading screen: +8.5% trial starts, +17%
  paying, +22% ARPU (+27%/+35% in the US) ([Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/));
  a survey-plus-first-lesson flow: +25% trials, +78% ARPU ([Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)).
- Labor illusion at plan-generation (Flo); coach intro message after the plan (Runna);
  "science-backed" credibility screens (Me+) ([Apphud](https://apphud.com/blog/best-performing-mobile-app-onboarding-examples)).
- Reassurance copy on sensitive inputs (Noom: "We don't mean to pry…")
  ([RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/)).

### 4.3 Trial and paywall timing
- 80–89% of trials start day 0 across categories; Health & Fitness 82.1%
  ([RevenueCat State of Subscription Apps](https://www.revenuecat.com/state-of-subscription-apps/)).
- Hard paywalls convert ~5× freemium download-to-paid (10.7% vs 2.1% medians); H&F
  median download-to-paid 2.9%; top H&F performers >23%; 59% of H&F apps run mixed
  trial + non-trial offers; H&F leads annual-plan adoption at 68%
  ([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps/), [RocketShip HQ summary](https://www.rocketshiphq.com/revenuecat-state-of-subscription-apps-2025-summary/)).
- But sentiment punishes hard paywalls with hidden pricing (Cal AI) and trial-end
  lockouts of user-created data (Cal AI) — Volyume's free logger floor avoids both.

### 4.4 Sentiment patterns (quoted)
- **Too long:** Noom — "this really bad, long onboarding experience"
  ([The Behavioral Scientist](https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding));
  Caliber — "the time-to-value is high" ([review evidence](https://fitnessdrum.com/caliber-app-review/)).
- **Too generic / opaque:** Cal AI — "price hidden until users go through the entire
  setup" ([eesel](https://www.eesel.ai/blog/cal-ai-pricing)).
- **Too dense:** MacroFactor — "useful in month six, overwhelming in week one"
  ([Nutrola](https://nutrola.app/en/blog/apps-like-macrofactor-but-simpler));
  RP — beginners told to start elsewhere ([Dr Muscle](https://dr-muscle.com/rp-hypertrophy-app-review/)).
- **Built for me:** Runna — "created a program… that is perfect for me"
  ([App Store](https://apps.apple.com/us/app/runna-running-plans-coach/id1594204443));
  Fitbod — "really does feel like having a personal trainer with you"
  ([TechRadar](https://www.techradar.com/health-fitness/fitbod-app-review)).
- **Slow value:** Whoop — "time to value… slightly too long and sometimes frustrating"
  ([Medium](https://medium.com/@DiaryOfAProductManager/who-gives-a-whoop-a-product-review-7df3fab019f7)).

### 4.5 Fastest compelling path to first value in the category
Fitbod's pattern: one high-leverage question (equipment) → a generated, finishable
workout → activation measured on first-workout completion
([PaywallPro/DEV](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)).
Hevy is faster to *an action* (<90 s) but Fitbod is faster to *personalised
intelligence* — the moment that sells a coaching product.

---

## 5. Implications for Volyume

Research only — no code changes made; all items below are options for the founder.

1. **The account + Article 9 wall before any value is Volyume's biggest divergence
   from evidence.** Options that respect `IDENTITY_AND_OWNERSHIP_LOCKED.md` and the
   trial-abuse ledger: run the goal/motivation steps of the wizard *before* account
   creation (answers held locally, attached at sign-up, Flo-style "save your
   progress"), and move the Article 9 consent to the first screen that actually
   collects health data rather than the front door. Duolingo's +20% DAU and Flo's
   end-of-quiz sign-up are the strongest published evidence in this report.
2. **Volyume's ~15 inputs are mid-pack, not the problem; pacing and theatre are.**
   Runna proves 25 screens/12 minutes can *raise* trust if every question visibly
   feeds the plan. Add: a persistent progress indicator (38.4%→24.1% drop-off
   evidence), reassurance copy on weight/BF% (Noom pattern), and a deliberate
   "building your plan" labor-illusion moment before the existing "why this" reveal.
3. **Strengthen the reveal into the category's best moment.** Runna's coach-intro
   message and Fitbod's "doable first workout" suggest the reveal should end with one
   concrete, finishable action (first session scheduled/startable today), not just a
   walkthrough.
4. **Market the cardless 14-day trial harder.** 82% of H&F trials demand card-on-file
   at day 0; Cal AI's hidden pricing is its top complaint. Volyume already shows the
   localised price on the welcome screen and asks for no card — say so explicitly at
   the consent step ("No card. Nothing charged on day 14 unless you choose").
5. **Free path is already Hevy-class** (name + units → logging). Protect it; it is the
   activation safety net the hard-paywall apps lack, and trial-end lockout complaints
   (Cal AI) validate Volyume's free-logger floor.
6. **Translate, don't lecture, in the "why this" reveal.** RP Hypertrophy shows
   hypertrophy jargon before value drives beginners away; Whoop shows plain-language
   metric education builds perceived intelligence. The deterministic coaching engine is
   a differentiator only if the reveal explains it in plain English ("your volume
   starts here because…").
7. **Bodybuilding divisions + goal-lock are unique theatre — use them.** No ranked app
   asks anything as identity-affirming as a physique division. Framed correctly
   (Runna's "feel seen" principle), Volyume's most demanding step is also its most
   differentiating commitment device.

---

## 6. Source index

Teardowns and case studies: [Growth Dives/UX Collective — Runna](https://www.growthdives.com/p/how-to-nail-onboarding-a-case-study) · [RevenueCat — Noom web-to-app teardown](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/) · [The Behavioral Scientist — Noom critique](https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding) · [Medium/Bootcamp — Flo & Zoe quiz funnels](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7) · [Flo Health engineering — onboarding evolution](https://medium.com/flo-health/mobile-onboarding-evolution-part-1-cfc9702835ce) · [Growth.design — Strava freemium conversion](https://growth.design/case-studies/strava-freemium-conversion) · [Superwall — Cal AI case study](https://superwall.com/case-studies/cal-ai) · [César Álvarez — Cal AI onboarding teardown](https://x.com/cesaralvarezll/status/2036873854455255505) · [UXCam — apps with great onboarding](https://uxcam.com/blog/10-apps-with-great-user-onboarding/) · [ScreensDesign — Flo](https://screensdesign.com/showcase/flo-period-pregnancy-tracker), [Caliber](https://screensdesign.com/showcase/caliber-strength-training), [Cal AI](https://screensdesign.com/showcase/cal-ai-calorie-tracker) · [Page Flows — Strava](https://pageflows.com/post/android/onboarding/strava/) · [Reteno — Runna flow gallery](https://gallery.reteno.com/flows/app-screens-runna)

Benchmarks and experiments: [RevenueCat State of Subscription Apps](https://www.revenuecat.com/state-of-subscription-apps/) · [RocketShip HQ summary](https://www.rocketshiphq.com/revenuecat-state-of-subscription-apps-2025-summary/) · [Adapty onboarding A/B data](https://adapty.io/blog/how-to-fix-your-onboarding-flow/) · [Apphud onboarding examples](https://apphud.com/blog/best-performing-mobile-app-onboarding-examples) · [Digia onboarding rates](https://www.digia.tech/post/app-onboarding-rates-statistics) · [Amra & Elma funnel drop-off statistics](https://www.amraandelma.com/funnel-drop-off-rate-statistics/) · [First Round — Duolingo A/B testing](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/) · [PaywallPro fitness onboarding guide](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)

Reviews and sentiment: [RepReturn — Hevy](https://repreturn.com/hevy-app-review/) · [TechRadar — Fitbod](https://www.techradar.com/health-fitness/fitbod-app-review) · [App Store — Runna reviews](https://apps.apple.com/us/app/runna-running-plans-coach/id1594204443) · [The Runner Beans — Runna](https://therunnerbeans.com/runna-coaching-app-review/) · [Nutrola — MacroFactor](https://nutrola.app/en/blog/apps-like-macrofactor-but-simpler), [Cal AI](https://nutrola.app/en/blog/cal-ai-free-vs-paid-what-do-you-actually-get) · [eesel — Cal AI pricing](https://www.eesel.ai/blog/cal-ai-pricing) · [NutriScan — MacroFactor trial](https://nutriscan.app/blog/posts/macrofactor-free-trial-2026-start-cancel-guide-2ee8910479) · [Dr Muscle — RP Hypertrophy](https://dr-muscle.com/rp-hypertrophy-app-review/) · [Luigi D'Introno — Whoop](https://medium.com/@DiaryOfAProductManager/who-gives-a-whoop-a-product-review-7df3fab019f7) · [Whoop support — calibration](https://support.whoop.com/s/article/Calibration-Timeline?language=en_US) · [BarBend — Caliber](https://barbend.com/caliber-fitness-app-review/) · [Fitness Drum — Caliber](https://fitnessdrum.com/caliber-app-review/) · [ChoosingTherapy — Noom](https://www.choosingtherapy.com/noom-review/) · [Trustpilot — Flo](https://www.trustpilot.com/review/flo.health?page=3)
