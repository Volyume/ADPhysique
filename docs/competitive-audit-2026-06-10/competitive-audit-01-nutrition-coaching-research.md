# Competitive Audit 01 — Nutrition & Macro Coaching
**Date:** 10 June 2026 · **Scope:** calorie/macro target calculation, coaching adjustments, communication, safety — NOT diary/logging UX (covered by sibling audit) · **Researcher:** competitive intelligence agent for Volyume

---

## 1. Top 10 apps, ranked by nutrition-coaching capability

| # | App | Coaching model | Price (approx.) | One-line verdict |
|---|-----|----------------|-----------------|------------------|
| 1 | **MacroFactor** | Adaptive expenditure algorithm (V3 + modifiers), adherence-neutral weekly check-in | $11.99/mo, $71.99/yr, no free tier | Gold standard for adaptive TDEE coaching and shame-free design |
| 2 | **Carbon Diet Coach** | Weekly check-in, adherence-gated adjustments, phase-based (cut/maintain/gain/reverse) | ~$9.99/mo | Best phase structure (reverse dieting); rigid adherence yes/no gate |
| 3 | **RP Diet Coach** | Prescriptive meal-by-meal plans timed around training | ~$14.99/mo | Most prescriptive; works for the disciplined, alienates everyone else |
| 4 | **MyFitnessPal Premium** | Static formula targets + manual goals; no adaptive coaching | $19.99/mo / $79.99/yr (+Premium+) | Biggest database/brand, weakest and most criticised target logic |
| 5 | **Cronometer** | Static Mifflin-St Jeor TDEE + activity multiplier + goal rate; user self-adjusts | Gold $9.99/mo / $54.99/yr | Best data accuracy and micros; zero coaching — "interpretation is on you" |
| 6 | **Lose It!** | Static "calorie budget" from profile + goal pace; exercise bonus calories | Premium ~$39.99/yr | Approachable budget framing; no adaptation, plateau handling left to user |
| 7 | **Avatar Nutrition** | Algorithmic weekly check-in macro coach (the original, pre-MacroFactor) | $9.99/mo | Proven adjust-on-check-in model; small team, weak database, ageing app |
| 8 | **Noom** | Psychology curriculum + calorie budget + food colour-coding | ~$17/mo+ | Cautionary tale: low budgets + traffic-light guilt despite "psychology" branding |
| 9 | **MacrosFirst** | Coach-connected tracker (targets pushed by human coach); no native algorithm | $11.99/mo / $79.99/yr (free tier) | Best coach-integration plumbing (two-way target sync, alcohol-to-macro tools) |
| 10 | **Stronger U** | Human coach + app; weekly human check-ins | $99–159/mo | Human coaching ceiling and cost floor — **ceasing services 31 March 2026** |

Notes on inclusion: Avatar Nutrition is alive (≈$1.8M ARR, 11 staff as of mid-2025), not legacy-dead. Stronger U is included as the human-coaching benchmark precisely because its shutdown (announced for 31 Mar 2026) demonstrates the economics Volyume's deterministic engine avoids. "Hevy-adjacent" macro apps: Hevy itself has no macro coaching; the coach-ecosystem niche is represented by MacrosFirst. Newer AI-photo apps (Cal AI, PlateLens) are logging-UX plays, not coaching plays — sibling audit territory.

---

## 2. Per-app deep dives

### 2.1 MacroFactor — the benchmark

**How targets are calculated.** Initial targets from standard anthropometric estimates, then the app's core: a dynamic expenditure algorithm that back-calculates true TDEE from the energy content of weight-trend change vs logged intake. V3 (Oct 2024) is "more responsive to meaningful changes in expenditure while more stable when faced with transient fluctuations," and unpauses after only 3 days of consistent tracking ([MacroFactor — Expenditure V3](https://macrofactorapp.com/expenditure-v3/), [algorithms & philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/)).

**Expenditure Modifiers (Oct 2025).** Optional add-ons that handle scenario-specific water-weight noise: menstrual-cycle weight shifts (improvement applies *without requiring period tracking*), creatine-loading fluid retention, ovulation/menses fluid shifts ([Expenditure Modifiers](https://macrofactorapp.com/expenditure-modifiers/)). This is the state of the art in cycle awareness — done in the signal-processing layer, not as a user-facing cycle log.

**How adjustments are communicated.** Weekly check-in; small capped adjustments; "intelligent guardrails… without over-reacting to short-term weight fluctuations." Crucially **adherence-neutral**: next week's targets are computed from what you actually ate and what your weight actually did, never from whether you "obeyed" ([adherence-neutral explainer](https://macrofactorapp.com/adherence-neutral/)).

**Refeeds/diet breaks/carb cycling.** *Not native.* Official help docs describe manual workarounds: eat at current TDEE estimate for 1–2 weeks for a diet break; manually edit and "lock" daily targets to roll calories across the week ([help: refeeds/diet breaks](https://help.macrofactorapp.com/en/articles/30-does-macrofactor-support-refeeds-diet-breaks-or-carb-cycling), [calorie rollover](https://help.macrofactorapp.com/en/articles/108-how-to-adjust-calorie-targets-to-account-for-overages-or-to-roll-over-unused-calories)). The market leader still makes users hand-roll periodisation.

**Safety/ED posture.** Deliberate shame-free design — no red numbers, no warnings, no guilt pop-ups; an ED-recovery user case study credits the adherence-neutral interface ([philosophy](https://www.strongerbyscience.com/macrofactor-algorithms-philosophy/)). But there are **no hard floors, no ED-pattern detection, no signposting to support services** — safety by tone, not by mechanism.

**Complaints.** No free tier ("biggest barrier to adoption" — [Nutrola pricing analysis](https://nutrola.app/en/blog/why-is-macrofactor-so-expensive)); 2–3 week cold-start before the algorithm is trustworthy; learning curve ("functions aren't incredibly intuitive… first time" — [Dr Muscle review](https://dr-muscle.com/macrofactor-app-review/)); a justuseapp reviewer called the trial-then-charge model "predatory" ([justuseapp reviews](https://justuseapp.com/en/app/1553503471/macrofactor-diet-sidekick/reviews)); reviewers also flag mental load, social-situation disruption, and obsessiveness risk from daily weigh-ins ([Fonzi review](https://fonzi.ai/blog/macrofactor-review)).

### 2.2 Carbon Diet Coach

**Calculation & adjustment.** Targets assigned by goal/phase; every 7 days the user submits weight and answers a binary "did you hit your macros?" question. **If non-adherent, targets freeze** — "it simply tells you to try again." If adherent, calories move based on rate-of-progress vs target ([Carbon how-it-works](https://www.joincarbon.com/how-it-works), [FeastGood review](https://feastgood.com/carbon-diet-coach-review/)). First-class **reverse dieting** goal with structured calorie ramps ([Carbon help](https://help.joincarbon.com/en/articles/6004560-what-is-a-reverse-diet)).

**Complaints.** No free trial; users explicitly report it **does not account for menstrual cycles** (weight spikes mid-cycle trigger wrong adjustments); ~10% barcode/database errors ([NutriScan review](https://nutriscan.app/blog/posts/is-carbon-diet-coach-worth-it-2026-b08ffeab07), [justuseapp](https://justuseapp.com/en/app/1437820611/carbon-smart-diet-coach/reviews)). The adherence gate is the philosophical opposite of MacroFactor and a known frustration: one imperfect week = zero coaching value that week.

**Safety.** None beyond generic disclaimers. No floors, no ED screening.

### 2.3 RP Diet Coach

Prescriptive meal plans (food, amount, timing) periodised around workouts. Strength: removes all decision-making; users who comply get results. Complaints cluster hard on **rigidity**: "too strict, too drastic, not user-friendly"; users with variable schedules "resort to IIFYM to avoid constantly adjusting workout and sleep times"; weak food database, unsearchable custom entries ([NoobGains review](https://noobgains.com/rp-diet-coach-app-review/), [justuseapp](https://justuseapp.com/en/app/1330041267/rp-diet-coach/reviews)). No adaptive TDEE; adjustments are template progressions. No safety systems.

### 2.4 MyFitnessPal Premium

Static formula targets; the infamous **1200 kcal floor-as-default** behaviour (calculations below 1200 for women snap up to it, and the number functions culturally as a target). The evidence base against MFP is unmatched: a clinical study found **73% of ED patients who used MFP said it contributed to their eating disorder** ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5700836/), [PubMed](https://pubmed.ncbi.nlm.nih.gov/28843591/)); dietitians criticise users treating the number as a hard limit and "seeing how far under they can get away with" ([Rachael Hartley Nutrition](https://www.rachaelhartleynutrition.com/blog/why-you-should-delete-your-myfitnesspal-app)). Its "warning signals" near calorie limits are themselves implicated in food preoccupation. No adaptive coaching at any tier; Premium ($19.99/mo) buys gram-level macros, macros-by-meal, custom daily goals — configuration, not coaching ([MFP Premium docs](https://support.myfitnesspal.com/hc/en-us/articles/360032625951), [paywall deep-dive](https://blog.mysimpleplan.com/post/behind-the-paywall-myfitnesspal-premium-vs-free-2025-deep-dive)). Ongoing resentment about features migrating behind the paywall (barcode scanning, timestamps).

### 2.5 Cronometer

BMR via Mifflin-St Jeor (with pregnant/breastfeeding options), TDEE = BMR + baseline activity + tracker-imported activity + logged exercise + TEF; goal rate applied as deficit/surplus ([Cronometer support: Energy Expenditure](https://support.cronometer.com/hc/en-us/articles/31974307318420-Energy-Expenditure)). Targets are **static**: "interpretation, adjustment, and decision-making are entirely on you" ([Nutrola three-way comparison](https://nutrola.app/en/blog/cronometer-vs-macrofactor-vs-carbon-2026)). World-class verified micronutrient data (80+ nutrients, label-photo verification). It is a measurement instrument, not a coach — the inverse of Volyume's positioning. No safety systems beyond sane defaults.

### 2.6 Lose It!

Profile + goal pace → daily "calorie budget"; exercise adds bonus calories (which experienced users advise ignoring — a sign the model over-credits exercise). 50M+ downloads, friendly framing. Complaints: user-submitted database errors ("sometimes other users lie about calories"), unreliable photo-logging portions (Snap It ±300 kcal on a pasta bowl), upsells, and **no plateau handling** — when loss stalls, the app has nothing to say ([Ikana review](https://ikanabusinessreview.com/2025/07/lose-it-app-review-can-this-app-help-you-lose-weight/), [Amy Food Journal](https://www.amyfoodjournal.com/blog/lose-it-app-review), [Trustpilot](https://www.trustpilot.com/review/loseit.com)). No adaptive TDEE, no explanation layer, no ED safeguards.

### 2.7 Avatar Nutrition

The original algorithmic macro coach (pre-dates MacroFactor). Weekly check-ins adjust macros; notable mechanic: adjustments require being **within 5 g of each macro target** — an adherence gate even stricter than Carbon's ([Avatar check-ins](https://www.avatarnutrition.com/how-it-works/check-ins)). Structured reverse-diet support. Users praise the accountability and weekly adaptation; complaints: stale food database, unreliable barcode scanner ([FeastGood](https://feastgood.com/avatar-app-review/), [justuseapp](https://justuseapp.com/en/app/1507989271/avatar-nutrition-macros-diet/reviews)). $9.99/mo. Small-team product with limited momentum.

### 2.8 Noom

Calorie budget + green/yellow/orange food coding + daily psychology lessons. The most instructive failure: users report budgets that feel impossibly low, daily guilt from blowing the "orange" allowance on normal foods (mayo, sweets), copy-pasted non-personalised psychology, and the system being publicly dissected as "dark psychology" by clinicians ([Louise Adams, Medium](https://medium.com/@louise_untrapped/the-dark-psychology-of-noom-50296363c299), [Healthline 12-month tester](https://www.healthline.com/nutrition/noom-diet-review)). $100M class action over trial-to-subscription practices. Lesson for Volyume: "psychology-informed" branding without mechanism personalisation breeds backlash; renaming red→orange fooled nobody.

### 2.9 MacrosFirst

No native coaching algorithm — its play is **coach infrastructure**: two-way sync so human coaches push protein/carb/fat/calorie targets straight into clients' apps; proprietary alcohol-to-macro conversion and serving-size tools; 2025 added 50+ micronutrient reporting and a 28k-item lab-tested "Core Foods" database. 4.8★ from 18.5k reviews ([A Couple Consumers review](https://acoupleconsumers.com/macrosfirst-app-review/), [MacrosFirst year in review](https://www.blog.macrosfirst.com/post/macrosfirst-year-in-review-our-biggest-updates-features-improvements-of-the-year)). Its alcohol-conversion tool is a direct answer to a top user wish that almost no one else handles.

### 2.10 Stronger U

Human dietitian/coach + weekly check-ins + unlimited messaging, $99–159/mo. Loved when the coach engaged; the top complaint was ghost-coaching ("a 'coach' sent macros but you don't hear from them again until check-in" — [ConsumerAffairs](https://www.consumeraffairs.com/health/stronger-u-nutrition.html)). **Ending all services 31 March 2026** ([strongeru.com](https://strongeru.com/services/)) — the human-coaching cost structure failed at scale. Its displaced subscriber base is an acquisition pool for algorithmic coaches at 1/20th the price.

---

## 3. User sentiment synthesis (love / hate / wish)

### What users love
- **Adaptation that matches reality** — "it recalculated your macros each week based on how your body responds" (Carbon convert from MFP, Reddit via [NutriScan](https://nutriscan.app/blog/posts/is-carbon-diet-coach-worth-it-2026-b08ffeab07)).
- **Shame-free design** — MacroFactor users explicitly cite escaping "notifications and red numbers in other apps [that] negatively affected their mental health" ([MacroFactor philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/)).
- **Accountability cadence** — the weekly check-in ritual itself (Carbon, Avatar, Stronger U reviews all praise it).

### What users hate (ranked themes, multiple sources)
1. **Database inaccuracy / user-submitted garbage** — named for MFP, Lose It, Carbon (~10% barcode error), RP, Avatar. The #1 cross-app complaint in Nutrola's 50k-review analysis alongside ads/paywalls.
2. **Paywall creep & monetisation resentment** — MFP feature migration; MacroFactor's no-free-tier; Noom's trial lawsuit; "ads that interrupt logging, paywalls that gate basic parts of it" ([Nutrola 50k-review analysis](https://nutrola.app/en/blog/we-analyzed-50000-calorie-tracker-reviews-what-users-actually-complain-about-2026)).
3. **Guilt mechanics** — red numbers, streak loss, "warning signals"; UCL research (Oct 2025) documents shame logging "unhealthy" foods, irritation at nagging, demotivation from slow progress vs algorithm targets ([UCL News](https://www.ucl.ac.uk/news/2025/oct/emotional-strain-fitness-and-calorie-counting-apps-revealed), [US News](https://www.usnews.com/news/health-news/articles/2025-10-24/fitness-apps-undermine-motivation-for-some-users-experts-say)).
4. **Rigidity vs real life** — RP's fixed meal times; Carbon's binary adherence gate; "social cost of visible tracking makes it nearly impossible in real-world social situations" ([Welling](https://www.welling.ai/articles/stop-giving-up-calorie-counting-apps)).
5. **Targets that feel arbitrary or too low** — Noom budgets, MFP 1200 snapping; users "rarely consider they might actually need more."
6. **Tracking burnout** — >50% quit within 3 weeks; only ~23% still logging at 3 months.

### What users wish their app understood
- **Menstrual cycles** — explicit Carbon complaint; MacroFactor's Expenditure Modifiers are the only real answer shipped, and it works without any period logging.
- **Refeeds / diet breaks / calorie cycling** — even MacroFactor only offers documented manual workarounds; demand evidenced by the help-centre articles existing at all.
- **Alcohol** — only MacrosFirst has a purpose-built alcohol-to-macro tool.
- **Social events / weekly flexibility** — calorie banking/rollover is the most-requested behaviour MacroFactor handles via "lock the day" hacks.
- **Why is my number this number?** — the TDEE-literacy gap: users conflate BMR and TDEE, overestimate activity level, treat estimates as truth, and don't know targets need iterating against real data ([Fitness Mentors](https://www.fitnessmentors.com/tdee-calculator-total-daily-energy-expenditure/), [tdee.is](https://tdee.is/)). No mainstream app ships a persistent plain-language explanation layer.

### Do users understand why their targets are what they are?
Mostly **no**. MFP/Lose It/Noom present a number with no rationale; Cronometer shows components but leaves interpretation to the user; Carbon explains by phase but not by mechanism; MacroFactor is best (expenditure graph + extensive articles) yet reviewers still report a "learning curve" and that "understanding what the expenditure graph means… and when to trust the system over your instincts takes time" ([Nutrola comparison](https://nutrola.app/en/blog/cronometer-vs-macrofactor-vs-carbon-2026)). The explanation problem is unsolved in-product across the board.

---

## 4. Best-in-class and the common failure mode

**Single best implementation: MacroFactor's adherence-neutral adaptive engine + Expenditure Modifiers.** It is best because it solves three problems at once: (1) truthful TDEE from observed data rather than formulas; (2) no incentive to lie to the app (adherence-neutrality removes the guilt loop that corrupts both data and mental health); (3) noise-robustness for the highest-volume real-world confounders (cycle, creatine, fluid shifts) without demanding extra logging. Runner-up: Carbon's phase architecture (reverse diet as a first-class goal).

**Most common failure mode across the category: the static, unexplained, guilt-enforced target.** App computes a one-time formula number (often snapped to 1200), never re-derives it from outcomes, punishes deviation with red ink and warnings, and goes silent at plateaus. This single pattern generates the category's worst outcomes — the 73% ED-contribution finding (MFP), Noom's guilt spiral, Lose It's plateau abandonment, and the >50% three-week quit rate.

---

## 5. Volyume vs each competitor — lead / match / lag

Volyume baseline recap: deterministic BMR (lean-mass-adjusted when BF% known) → TDEE → goal-phased calories; protein g/kg approaches clamped at 3.5; fat floor; carbs remainder; adaptive TDEE from EWMA weight trend + intake adherence; weekly adjustments capped ±5% with cooldowns, confirm-then-apply; "Why these numbers for you?" narrative card; hard floors 1200/1500 kcal + RED-S/FFM floor + 1.5%/wk rapid-loss gate + ED-pattern detection with Beat UK signposting; check-in prefilled from real logs. Refeed engine, high/low-day macros, cycle input: built but **not shipped**.

| Competitor | Volyume leads | Volyume matches | Volyume lags |
|---|---|---|---|
| **MacroFactor** | Hard safety floors, ED-pattern detection + Beat signposting (MF has none); "Why these numbers?" in-product narrative (MF relies on external articles); confirm-then-apply consent step; £4.99 vs $11.99 | Adaptive TDEE from weight trend + intake; weekly cadence; capped guarded adjustments; check-in prefilled from logs (MF auto-pulls too) | Expenditure Modifiers (cycle/creatine/fluid noise-handling); algorithm maturity/validation publishing; brand trust in the evidence-based community; calorie rollover affordances |
| **Carbon** | Adherence philosophy — Volyume adjusts from real data, Carbon freezes on a "no"; safety systems; cycle handling (Carbon famously lacks it — Volyume could ship its dead cycle input); explanation card | Weekly check-in adjustments; phase-based goals | First-class **reverse-diet goal** with structured ramps; Layne Norton brand authority |
| **RP Diet Coach** | Flexibility, adaptive TDEE, safety, explanation | Deterministic, no-AI rigour | Meal-timing periodisation around training (if Volyume ever wants it — most users hate RP's version) |
| **MFP Premium** | Everything coaching: adaptive targets, explanation, safety floors vs MFP's harmful 1200 default, no guilt mechanics | — | Database scale, brand ubiquity, integrations ecosystem |
| **Cronometer** | All coaching and safety; explanation | Honest TDEE componentisation | Micronutrient depth and verified-data reputation |
| **Lose It!** | Adaptive coaching, plateau handling, explanation, safety | Approachable framing | Mainstream brand reach; photo logging (sibling audit) |
| **Avatar** | Adherence-neutrality (Avatar gates on ±5 g compliance), safety, explanation card, modern engine | Weekly algorithmic check-in | Reverse-diet structure; years of check-in-coaching iteration |
| **Noom** | Genuine (mechanistic, not curricular) personalisation; no guilt colour-coding; real safety vs marketing-psychology | — | Habit/behavioural content library; mass-market funnel |
| **MacrosFirst** | Native coaching algorithm (MacrosFirst has none), safety, explanation | Gram-level macro precision | Alcohol-to-macro conversion tool; human-coach two-way sync ecosystem; free tier |
| **Stronger U** | Price (£4.99 vs $99–159), survivability (they're closing), deterministic consistency vs ghost-coaches | Weekly check-in ritual | Human empathy/accountability ceiling for users who need a person |

**ED safeguards — does ANY competitor have them?** **No competitor ships mechanistic ED safeguards.** MacroFactor has the strongest *design posture* (no red numbers, adherence-neutral, shame-free) but no floors, no pattern detection, no signposting. MFP has a soft low-calorie warning that research suggests may itself worsen preoccupation. Nobody screens, nobody detects restriction patterns, nobody signposts to Beat/NEDA. Volyume's safety stack (hard floors + RED-S/FFM floor + rapid-loss gate + ED-pattern detection + Beat UK signposting) is **category-unique** and increasingly defensible: the UCL Oct-2025 emotional-strain research and the MFP ED literature are pushing regulator and press attention exactly here. This is a marketable moat, not just an ethical stance.

---

## 6. Improvement opportunities for Volyume (ranked)

1. **Ship the refeed engine + high/low-day macros (currently dead code).** Even MacroFactor — the market leader — tells users to hand-edit and lock days to simulate refeeds, diet breaks and calorie rollover. Demand is documented in their own help centre. A first-class "calorie banking / planned high day / structured diet break" flow, run through the existing safety floors, would leapfrog every competitor on the single most-wished-for periodisation feature. *Impact: differentiation vs the #1 player; retention through diet fatigue, the #1 quit driver.*

2. **Activate menstrual-cycle awareness (currently a dead input) — Volyume-style.** Carbon users complain it ignores cycles; MacroFactor solved it in 2025 via signal-layer Expenditure Modifiers needing no period logging. Volyume should do both: (a) make the EWMA/adjustment layer cycle-noise-robust by default (no logging required, matching MF), and (b) optionally accept the existing cycle input to suppress false-positive weekly adjustments and annotate the "Why these numbers?" card ("your weight blip is consistent with cycle-phase fluid shift — no change made"). *Impact: directly addresses the most-cited "wish my app understood me" theme for ~half the user base; only one competitor has any answer.*

3. **Weaponise the explanation layer.** Research shows users systematically misunderstand BMR vs TDEE and treat formula outputs as truth; even MacroFactor's explanations live in blog posts and reviewers report a learning curve. Volyume's "Why these numbers for you?" card is already ahead — extend it to every *adjustment* ("we moved you −3% because your trend ran 0.2 kg/wk behind target; your floor protects you at 1,500 kcal") and to *non-adjustments* ("nothing changed this week — here's why that's correct"). *Impact: trust, comprehension, and a visible differentiator that costs no new science.*

4. **Market the safety stack explicitly.** No competitor has floors, RED-S protection, rapid-loss gating, ED-pattern detection or charity signposting; meanwhile MFP carries a 73%-ED-contribution research finding and UCL has documented category-wide emotional harm. Position Volyume publicly as "the coached nutrition app with hard safety rails" — store listing, PR to UK health press, potential Beat relationship. *Impact: acquisition narrative no rival can copy quickly, and pre-emption of coming regulatory/press scrutiny.*

5. **Add an adherence-neutral framing audit.** Volyume's adaptive TDEE already uses logged intake regardless of compliance (MacroFactor-style), but every surface should be checked against the guilt-mechanics literature: no red over-target states, no streak-shaming, neutral language at check-in. MacroFactor proved this is retention-positive and *data-quality*-positive (people log honestly when not judged). *Impact: better data into the engine; lower burnout-driven churn.*

6. **Alcohol handling.** Only MacrosFirst converts alcohol to macro-equivalents. A simple "log a drink" affordance that books alcohol calories sensibly against carbs/fat (and optionally feeds the high/low-day engine for planned social events) answers two wish-list themes at once. *Impact: real-life fit; UK market especially.*

7. **Structured reverse-diet / post-cut maintenance phase.** Carbon's most-praised feature; Avatar's too. Volyume has goal-phased calories — adding an explicit reverse-diet ramp (capped weekly increases, narrated by the explanation card, guarded by safety systems) completes the diet lifecycle and gives users a reason to stay subscribed *after* the cut, attacking the post-goal churn cliff. *Impact: LTV; parity with Carbon's signature feature.*

8. **Cold-start honesty.** MacroFactor's known weakness is 2–3 weeks of cold-start before its expenditure is trustworthy. Volyume should explicitly badge confidence ("estimate quality: building — 9 more days of logs to high confidence") in the explanation card. *Impact: trust during the highest-churn window (50% quit by week 3).*

9. **Stronger U refugee campaign (time-sensitive).** Stronger U ends services 31 March 2026; its subscribers paid £80–125/mo for weekly macro check-ins and are now coachless. £4.99/mo deterministic coaching with a human-readable weekly narrative is an obvious landing spot. *Impact: cheap acquisition of pre-qualified, pay-proven users; window closes soon.*

10. **Pre-empt the database-trust complaint in coaching copy.** The #1 cross-app complaint is database inaccuracy. Volyume's engine should state (in the explanation card) that the adaptive TDEE *corrects for systematic logging error* — MacroFactor's strongest reassurance, rarely communicated in-product by anyone. *Impact: defuses the top category complaint without any database work.*

---

## 7. Sources

- MacroFactor: [Algorithms & Core Philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/) · [Expenditure V3](https://macrofactorapp.com/expenditure-v3/) · [Expenditure Modifiers](https://macrofactorapp.com/expenditure-modifiers/) · [Adherence-Neutral](https://macrofactorapp.com/adherence-neutral/) · [Help: refeeds/diet breaks/carb cycling](https://help.macrofactorapp.com/en/articles/30-does-macrofactor-support-refeeds-diet-breaks-or-carb-cycling) · [Help: calorie rollover](https://help.macrofactorapp.com/en/articles/108-how-to-adjust-calorie-targets-to-account-for-overages-or-to-roll-over-unused-calories) · [Dr Muscle review](https://dr-muscle.com/macrofactor-app-review/) · [justuseapp reviews](https://justuseapp.com/en/app/1553503471/macrofactor-diet-sidekick/reviews) · [Nutrola pricing analysis](https://nutrola.app/en/blog/why-is-macrofactor-so-expensive)
- Carbon: [How it works](https://www.joincarbon.com/how-it-works) · [Reverse diet help](https://help.joincarbon.com/en/articles/6004560-what-is-a-reverse-diet) · [FeastGood review](https://feastgood.com/carbon-diet-coach-review/) · [NutriScan review](https://nutriscan.app/blog/posts/is-carbon-diet-coach-worth-it-2026-b08ffeab07) · [justuseapp reviews](https://justuseapp.com/en/app/1437820611/carbon-smart-diet-coach/reviews)
- RP: [NoobGains review](https://noobgains.com/rp-diet-coach-app-review/) · [justuseapp reviews](https://justuseapp.com/en/app/1330041267/rp-diet-coach/reviews)
- MFP: [PMC ED study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5700836/) · [PubMed](https://pubmed.ncbi.nlm.nih.gov/28843591/) · [Rachael Hartley Nutrition](https://www.rachaelhartleynutrition.com/blog/why-you-should-delete-your-myfitnesspal-app) · [Premium features](https://support.myfitnesspal.com/hc/en-us/articles/360032625951) · [Paywall deep-dive](https://blog.mysimpleplan.com/post/behind-the-paywall-myfitnesspal-premium-vs-free-2025-deep-dive)
- Cronometer: [Energy Expenditure support doc](https://support.cronometer.com/hc/en-us/articles/31974307318420-Energy-Expenditure) · [Nutrola three-way comparison](https://nutrola.app/en/blog/cronometer-vs-macrofactor-vs-carbon-2026) · [FeastGood MF vs Cronometer](https://feastgood.com/macrofactor-vs-cronometer/)
- Lose It!: [Ikana review](https://ikanabusinessreview.com/2025/07/lose-it-app-review-can-this-app-help-you-lose-weight/) · [Amy Food Journal](https://www.amyfoodjournal.com/blog/lose-it-app-review) · [Trustpilot](https://www.trustpilot.com/review/loseit.com)
- Avatar: [Check-ins](https://www.avatarnutrition.com/how-it-works/check-ins) · [FeastGood review](https://feastgood.com/avatar-app-review/) · [justuseapp reviews](https://justuseapp.com/en/app/1507989271/avatar-nutrition-macros-diet/reviews)
- Noom: [Dark Psychology of Noom (Adams)](https://medium.com/@louise_untrapped/the-dark-psychology-of-noom-50296363c299) · [Healthline tester review](https://www.healthline.com/nutrition/noom-diet-review) · [UNTRAPPED](https://untrapped.com.au/a-psychologist-reviews-the-dark-psychology-of-noom-part-1/)
- MacrosFirst: [A Couple Consumers review](https://acoupleconsumers.com/macrosfirst-app-review/) · [Year in review](https://www.blog.macrosfirst.com/post/macrosfirst-year-in-review-our-biggest-updates-features-improvements-of-the-year)
- Stronger U: [End of services](https://strongeru.com/services/) · [ConsumerAffairs reviews](https://www.consumeraffairs.com/health/stronger-u-nutrition.html) · [Selfie Does review](https://selfiedoes.com/blog/2021/6/28/stronger-u-nutrition-review)
- Category research: [UCL emotional strain study (Oct 2025)](https://www.ucl.ac.uk/news/2025/oct/emotional-strain-fitness-and-calorie-counting-apps-revealed) · [US News coverage](https://www.usnews.com/news/health-news/articles/2025-10-24/fitness-apps-undermine-motivation-for-some-users-experts-say) · [Nutrola 50k-review analysis](https://nutrola.app/en/blog/we-analyzed-50000-calorie-tracker-reviews-what-users-actually-complain-about-2026) · [Welling on quitting tracking](https://www.welling.ai/articles/stop-giving-up-calorie-counting-apps) · [ScienceDirect systematic review, apps & disordered eating](https://www.sciencedirect.com/science/article/pii/S174014452400158X) · [Fitness Mentors on TDEE confusion](https://www.fitnessmentors.com/tdee-calculator-total-daily-energy-expenditure/)

*Caveats: WebFetch was blocked (403) for feastgood.com, help.macrofactorapp.com, nutrola.app and reddit.com, so Reddit sentiment is sourced via secondary citations and review aggregators rather than direct thread reads. Some 2026-dated review-site sources (NutriScan, Nutrola, fuelnutrition) are SEO-style aggregators; claims from them were cross-checked against first-party docs where possible.*
