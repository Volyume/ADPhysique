# Competitive Audit 01 — Training Plan Generation & Personalisation (Agent 1)

**Date:** 10 June 2026
**Scope:** How the leading apps generate, personalise and adapt training plans, versus Volyume's deterministic plan engine (`src/lib/planEngine.js`, baseline doc §3.1).
**Method note:** Researched via live web search and secondary sources. Reddit.com blocks
automated crawling, so r/naturalbodybuilding / r/weightroom sentiment is reported through
secondary sources that aggregate it (review sites, App Store/Play review summaries,
forum threads on T-Nation and Exodus Strength). Every claim cites its source URL or a
named source. Marketing claims from vendors' own sites are flagged as such.

---

## 1. Ranked top 10 (intelligence and personalisation of plan generation)

| # | App | One-liner |
|---|-----|-----------|
| 1 | **JuggernautAI** | Chad Wesley Smith expert system; adapts pre-session, intra-session, session-to-session, weekly, block-to-block and program-to-program, with MEV/MRV-informed volume and weak-point exercise selection. |
| 2 | **RP Hypertrophy** | The hypertrophy benchmark: mesocycle engine driven by per-muscle pump/soreness/workload feedback and an RIR ramp; 45+ templates plus a custom Meso Builder. |
| 3 | **MacroFactor Workouts** | Stronger by Science / Jeff Nippard entrant (launched Jan 2026); rule-based (non-LLM) questionnaire-to-program generation already called "the best auto program-generation in the App Store". |
| 4 | **Alpha Progression** | Highest-rated dedicated hypertrophy generator (4.9★ iOS); per-set weight/rep/RIR prescriptions, meta-analysis-based plan generator, built-in deloads. |
| 5 | **Dr. Muscle** | Most aggressive per-set autoregulation ("plus sets", rest-pause, daily adjustment, layoff de-rating) — undermined by widespread billing/marketing distrust. |
| 6 | **Fitbod** | Mainstream ML personalisation at scale via a per-muscle recovery model; criticised by serious lifters as "random" and lacking long-term structure. |
| 7 | **Sheiko Gold** | Boris Sheiko's methodology as an expert system; 30-day observation period, then rep-to-rep, day-to-day autoregulation (powerlifting only). |
| 8 | **Boostcamp** | The program-library play: 100+ famous evidence-based programs with auto-progression — distribution and trust, not generative personalisation. |
| 9 | **Caliber** | Human-coach personalisation plus algorithmic Strength Score / Strength Balance metrics; plan generation itself is human, not algorithmic. |
| 10 | **Evolve AI** | Readiness-input AI entrant (exclusive app of Powerlifting America); ambitious but with documented complaints of generic templates and QC errors. |

**Honourable mentions (researched, excluded from top 10):**
- **KeyLifts** — best-in-class percentage-based 5/3/1 runner; users praise it precisely for being "mercifully bloat free and AI-free" — a template runner, not a generator ([App Store reviews](https://apps.apple.com/us/app/keylifts-531-workout-log/id1437949461)).
- **The Pump (Arnold Schwarzenegger)** — quality programming and video but a mandatory 90-day, 3-day/week "Foundation" program for everyone; minimal generation intelligence ([TechRadar review](https://www.techradar.com/health-fitness/the-pump-review-arnold-schwarzenegger-offers-his-muscle-building-expertise-to-the-masses); [HotelGyms review](https://www.hotelgyms.com/blog/the-pump-app-review)).
- **Arvo** — emerging AI hypertrophy entrant marketing MEV/MAV/MRV volume tracking and five named bodybuilding methodologies (Kuba, Mentzer HIT, FST-7, Y3T, Mountain Dog); evidence base is largely its own content marketing, so treated with caution ([arvo.guru](https://arvo.guru/best-ai-workout-apps)).

---

## 2. Per-app findings

### 2.1 JuggernautAI — rank 1

- **Generation inputs:** onboarding captures gender, age, size, current strength, experience, recovery capacity and goal (Powerlifting or Powerbuilding), then "JuggernautAI will then design a unique individualized program tailored just for you" ([JTS: Setting Up Your Program](https://www.jtsstrength.com/setting-up-your-program-on-the-juggernautai-app/)).
- **Algorithm style:** an "Expert System" that "codifies the vast knowledge and coaching methodology of elite strength coach Chad Wesley Smith", using "hundreds of data points about your training" with "data-driven volume and ultra-accurate MEV/MRV starting points tailored to your lifter profile and goals" ([ai-fitness-engineer.com review](https://ai-fitness-engineer.com/juggernautai); [juggernautai.app v2.5 blog](https://www.juggernautai.app/blog/juggernautai-25)). Deterministic expert-system logic, not an LLM — directly comparable to Volyume's architecture.
- **Adaptation cadence — the category's deepest:** "a Readiness Rating System, making adjustments to your program pre-session, intra-session, session to session, week to week, block to block, and program to program. Daily accessory work … scales with your readiness feedback, and weekly check-ins automatically drop sets when your readiness score falls below 3" ([jtsstrength.com — How JuggernautAI Works](https://www.jtsstrength.com/how-juggernautai-works/)).
- **Weak points / specialisation:** "looks at your weak points and your strength in individual lifts to decide which exercises will be most effective", and bodybuilding-leaning users "can also choose which body part to focus on to ensure your physique improves the way you want it to" ([jtsstrength.com](https://www.jtsstrength.com/how-juggernautai-works/)).
- **Goal specificity:** Powerlifting, Powerbuilding, PowerCombo; "the system finds the right mix of Hypertrophy, Strength and Peaking phases for your needs and time frame", plus meet-prep and attempt calculators ([juggernautai.app](https://www.juggernautai.app/)). No physique-division programming.
- **Plan reveal:** post-questionnaire full periodised program; reviewers note the coaching relationship framing — "both need time to understand each other" ([garagegymcompetition.com](https://garagegymcompetition.com/juggernautai-the-smartest-program-for-you/)).
- **Sentiment:** "Reviews are generally positive, with users praising the customization to their needs, recovery level, and body feedback, describing it as having the most knowledgeable coach who understands their situation" ([App Store listing/reviews](https://apps.apple.com/us/app/juggernautai/id1515756471); [PowerliftingTechnique review](https://powerliftingtechnique.com/juggernaut-ai-review/)). Price is the recurring gripe: $35/month or $350/year ([techfixai.com review](https://techfixai.com/juggernautai-review/)).

### 2.2 RP Hypertrophy — rank 2

- **Generation inputs:** choose from "over 45 pre-selected templates OR the option to build your own custom mesocycle"; the Meso Builder lets you select "which muscles you want to emphasize, which to put on maintenance, and which to ignore entirely, with the app building a program tailored to your goals"; exercise autofill available ([RP Help Centre — Where to start?](https://hypertrophy.zendesk.com/hc/en-us/articles/32430129362327-Where-to-start); [Designing Your Mesocycle](https://hypertrophy.zendesk.com/hc/en-us/sections/13514767025303-Designing-Your-Mesocycle)).
- **Algorithm style:** deterministic RP volume-landmark methodology. "The app adjusts to your pump, soreness, and workload feedback to create the perfect training plan week-by-week" ([rpstrength.com app page](https://rpstrength.com/pages/hypertrophy-app)).
- **Adaptation cadence:** within a 4–6-week mesocycle, volume and intensity ramp (4 RIR → 3 → 2 → 1 RIR) into a deload; per-muscle weekly set adjustments from session feedback; meso-over-meso volume carry-forward ("you can … get an average per-week volume for the whole mesocycle … to adjust the average up or down in the next mesocycle") ([RP Strength article on set increases](https://rpstrength.com/blogs/articles/in-defense-of-set-increases-within-the-hypertrophy-mesocycle); [dr-muscle.com RP review](https://dr-muscle.com/rp-hypertrophy-app-review/)).
- **Weak points:** muscle emphasis is user-selected per mesocycle (emphasise / maintain / ignore); no division or judging-criteria concept.
- **Plan reveal:** template gallery → meso preview grid of muscles × days. Reviewers cite "steep initial setup, confusing interface for newcomers" ([wellness.alibaba.com RP guide](https://wellness.alibaba.com/fitlife/rp-hypertrophy-app-cost-reality)).
- **Praise:** users call it a "cheat code"; "one user reported using the Hypertrophy program for two years and being 'so happy with the progress and results'. Another shared … their hypertrophic gains over the last two years trumped the previous 10 years"; users "praise how the app 'thinks for them'" and that it "updates weights and reps based on ratings of workload and soreness" ([App Store reviews, RP Hypertrophy](https://apps.apple.com/us/app/rp-hypertrophy/id1555614554?see-all=reviews&platform=iphone)).
- **Complaints:** $34.99/month or $299.99/year with no free trial — "Paid for one month... totally not worth it" (user quote via [wellness.alibaba.com](https://wellness.alibaba.com/fitlife/rp-hypertrophy-app-cost-reality)); "minimal help, if any, with choosing exercises" ([dr-muscle.com 13-point critique](https://dr-muscle.com/rp-hypertrophy-app-critique/)); and notably for Volyume, "some users have requested that the app work without an internet connection, as poor gym connectivity can be problematic" ([App Store reviews](https://apps.apple.com/us/app/rp-hypertrophy/id1555614554?see-all=reviews&platform=iphone)).

### 2.3 MacroFactor Workouts — rank 3

- **Launched January 2026** by Stronger by Science (Jeff Nippard / Greg Nuckols ecosystem) ([strongerbyscience.com announcement](https://www.strongerbyscience.com/macrofactor-workouts-survey/); [macrofactor.com Jan 2026 monthly](https://macrofactor.com/mm-jan-2026/)).
- **Generation inputs:** "the app walks users through a questionnaire about goals, experience level, and equipment availability, then creates a custom strength training program personalized for the user" ([macrofactor.com/workouts](https://macrofactor.com/workouts/); [Quick Start Guide](https://macrofactor.com/welcome-to-macrofactor-workouts/)).
- **Algorithm style:** explicitly "rule-based logic rather than generative AI, with recommendations grounded in research-based training principles" — the closest philosophical match to Volyume's no-LLM stance among new entrants ([fonzi.ai review](https://fonzi.ai/blog/macrofactor-review)).
- **Adaptation:** guides "long-term progression based on how your body is adapting"; "can estimate and account for fatigue over the course of a training session and suggest smart exercise substitutions" ([macrofactor.com/workouts](https://macrofactor.com/workouts/)).
- **Sentiment:** early reviews call it "the best auto program-generation in the App Store" but flag immaturity — "needs one or two more updates", "some UI not being intuitive yet" — and opacity: "I don't know how it works... I don't know the rules of the game" ([App Store reviews via search, MacroFactor Workouts](https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524)).
- **Pricing:** $11.99/month or $89.99/year bundled with the nutrition app; free first year for pre-2026 MacroFactor subscribers ([macrofactor.com/workouts/price](https://macrofactor.com/workouts/price/)).
- **Strategic note for Volyume:** this is the most direct architectural rival — deterministic, science-led, nutrition+training bundle — with vastly stronger brand authority.

### 2.4 Alpha Progression — rank 4

- **Generation inputs:** frequency, session length, muscle focus, equipment, experience — the vendor claims "well over 1,000 quadrillion input combinations on which your plan is based" ([alphaprogression.com](https://alphaprogression.com/en)).
- **Algorithm style:** deterministic, "based on the latest meta-analyses and literature reviews in exercise science" ([alphaprogression.com](https://alphaprogression.com/en)).
- **Adaptation:** "For every set, the app gives you a precise recommendation of how much weight and how many reps to go for … analyzing your performance in past sessions as well as the current one"; periodisation "designed to have you hitting mini PRs throughout your mesocycle"; standard pattern of 4 weeks ramping then a 5-RIR deload week ([alphaprogression.com glossary/blog](https://alphaprogression.com/en/blog/periodize-your-training); [Google Play listing](https://play.google.com/store/apps/details?id=com.alphaprogression.alphaprogression&hl=en_US)).
- **Exercise intelligence:** rates exercise "stability" (target muscle vs stabiliser limited) and honours always-enabled / always-disabled exercise lists ([hotelgyms.com guide](https://www.hotelgyms.com/blog/how-to-use-alpha-progression)).
- **Sentiment:** "the highest-rated hypertrophy-dedicated app on the iOS App Store with 4.9 stars"; "unrivalled in its ability to generate hypertrophy workout plans customized to each user" ([Setgraph roundup](https://setgraph.app/ai-blog/best-workout-planner-reddit-recommends); [Fitness Drum review](https://fitnessdrum.com/alpha-progression-app-review/)). Positioned as "the budget-friendly smart trainer … real programming at one-third the price" of RP, "best for intermediate lifters … who don't need strict mesocycle periodization" ([mesostrength.com RP alternatives](https://mesostrength.com/blog/rp-hypertrophy-alternatives)). ~$9.99/month or $59.99/year.

### 2.5 Dr. Muscle — rank 5

- **Algorithm style:** per-set adaptive engine — "analyzes your performance data and automatically adjusts your training variables — weights, sets, reps, and rest periods"; autoregulated "plus sets" (AMRAP) teach it "your true capacity"; built-in rest-pause progression ([Toosio review](https://toosio.com/tool/dr-muscle-ai-fitness-coach); [dr-muscle.com features](https://dr-muscle.com/what-makes-dr-muscle-different/)).
- **Adaptation cadence:** "adjustments after your first completed workout, but it takes about 2-3 weeks of consistent logging to develop a reliable understanding"; layoff handling: "If you miss a week, the algorithm might reduce your working weights by 10-20% for your first session back, then rebuild progressively" ([leaveit2ai.com review](https://leaveit2ai.com/ai-tools/fitness/dr-muscle)) — directly comparable to Volyume's 7-day layoff 0.9 multiplier.
- **Praise:** "I've had the app for at least two and a half years now, and I can definitely say that I've gained a significant amount of muscle" (Michael McCullough); "Stronger at 58 than I was at 27" (Bob M.) ([dr-muscle.com/reviews](https://dr-muscle.com/reviews/); [App Store listing](https://apps.apple.com/us/app/dr-muscle-ai-personal-trainer/id1073943857)).
- **Complaints:** reviewers note an "ugly" UI historically ([leaveit2ai.com](https://leaveit2ai.com/ai-tools/fitness/dr-muscle)); Trustpilot/Reddit-aggregated complaints centre on billing — e.g. a user "charged … $9.99, $49.99, and $29.99 in quick succession" and upsold "with zero action on my part" ([Trustpilot, dr-muscle.com](https://www.trustpilot.com/review/dr-muscle.com)). Its content marketing also floods search results with self-favouring "reviews" of rivals — a trust problem worth noting and not imitating.

### 2.6 Fitbod — rank 6

- **Algorithm style:** ML over "data from millions of logged workouts"; two components — "the exercise selector and the capability recommender"; per-muscle recovery percentages (0–100%, full recovery assumed at 7 days) drive next-workout selection; users can manually mark "Fresh Muscle Groups" ([Fitbod Help — How Fitbod Creates Your Workout](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout); [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/); [Muscle Recovery help](https://fitbod.zendesk.com/hc/en-us/articles/360006269014-Muscle-Recovery)).
- **Goal specificity:** generic strength/hypertrophy/endurance goals; no division or competition awareness.
- **Complaints — the cautionary tale of the category:** "Multiple users have complained that the workouts seem random, lacking the structured progression needed for effective bodybuilding"; "the training program does not account for important factors such as exercise intensity, frequency, and volume"; "struggles with retaining users beyond the first seven workouts due to a lack of comprehensive workout plans" ([dr-muscle.com Fitbod review](https://dr-muscle.com/fitbod-workout-app-review/); [Indie Hackers 2026 review](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b); [Fitness Drum](https://fitnessdrum.com/fitbod-review/)).
- **Counterpoint:** "long-term users (those active 1+ years) almost universally rate Fitbod highly, as the algorithm genuinely needs 10-15 workouts of input data before the personalization reaches its full quality" ([Indie Hackers](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b)). $15.99/month.

### 2.7 Sheiko Gold — rank 7

- **Algorithm style:** expert system encoding Boris Sheiko's coaching: "A.I. coaching assistant will fine-tune your training, month to month, day to day, and even rep to rep in real-time"; handles "any training frequency from 1 to 14 sessions per week" ([sheikogold.com](https://sheikogold.com/)).
- **Onboarding:** "an initial 30-day observation period to gather data on how you respond to different training loads, exercises, and recovery periods" before fully individualised programming ([sheikogold.com FAQs](https://sheikogold.com/sheiko-gold-faqs/)) — an interesting "earn the personalisation" reveal model.
- **Sentiment:** "Even having a real life coach doing my programming every week has never been this good" (user review via [App Store](https://apps.apple.com/us/app/sheiko-gold-workout-coach/id1475890027)); critical view: "the auto-regulation is not as sophisticated as advertised … the app is just ok" ([T-Nation thread](https://t-nation.com/t/sheiko-gold-ai-powerlifting-coaching-app/262416)). Powerlifting-only; irrelevant to physique divisions but instructive on autoregulation depth.

### 2.8 Boostcamp — rank 8

- **Model:** library of "the world's most popular strength training & muscle building programs built right in — nSuns, GZCLP, 5/3/1, Reddit PPL, PHUL, PHAT, and 100+ more"; 1M+ lifters, 300M+ workouts, 4.8★ ([boostcamp.app](https://www.boostcamp.app/)).
- **Adaptation:** template auto-progression only — "hit your reps and the app increases the load next session"; "Programs work in 4-12 week blocks that build volume or intensity, then deload" ([boostcamp.app/features](https://www.boostcamp.app/features)).
- **Personalisation:** essentially none at generation time — you pick a program by level/goal; customisation arrives via the custom builder (Pro, ~$14.99/month or $59.99/year). Sentiment is strong because the programs carry famous authors' credibility: "Boostcamp has gained serious traction on Reddit over the past couple years as a free app that includes dozens of proven programs from respected coaches" ([Setgraph Reddit roundup](https://setgraph.app/ai-blog/best-workout-planner-reddit-recommends)).
- **Lesson:** trust can come from named authorship rather than algorithmic claims.

### 2.9 Caliber — rank 9

- **Model:** "Unlike many fitness apps that leverage AI or algorithms … Caliber uses real human coaches"; Premium gets a dedicated coach; Pro (~$19/month) unlocks "over 60" coach-designed plans ([Fitness Drum review](https://fitnessdrum.com/caliber-app-review/); [BarBend review](https://barbend.com/caliber-fitness-app-review/)).
- **Algorithmic layer:** Strength Score and Strength Balance ("how developed your major muscle groups are when compared to one another, shown as a percentage") — but "not every exercise tracks your strength score … the strength score … isn't conducive to hypertrophy" ([BarBend](https://barbend.com/caliber-fitness-app-review/)).
- **Sentiment:** free tier praised ("unexpectedly comprehensive and completely ad-free"); complaints of upsell pressure and tier confusion ([Trustpilot](https://www.trustpilot.com/review/caliberstrong.com); [Google Play reviews](https://play.google.com/store/apps/details?id=com.caliberfitness.app&hl=en_US)).
- **Lesson:** human-coach personalisation sets the perceived ceiling Volyume's engine should aim to emulate in feel.

### 2.10 Evolve AI — rank 10

- **Model:** readiness-driven AI (sleep, soreness, stress inputs) for powerlifting/powerbuilding; "the longer you use it, the more the AI can adapt to your needs and weak points"; now "the Exclusive Training App of Powerlifting America" ([evolvetrainingapp.com](https://www.evolvetrainingapp.com/post/how-does-evolve-decide-your-training); [powerlifting-america.com](https://powerlifting-america.com/evolve-becomes-the-exclusive-training-app-of-powerlifting-america/)).
- **Complaints — a catalogue of what *not* to do:** "many users feel the programs are still too generic"; "the same workout assigned regardless of whether you barely slept or got 10 hours"; "the app spits out a template without allowing basic choices like what type of split you want"; volume mismatch — "despite setting a higher bodybuilding ratio, the program consistently delivered lower volume workouts than anticipated, with larger muscle groups like the back feeling especially underworked"; and QC failures — "the app states it is building for RPE 7 for 6 reps but the actual plan states RPE 6 for 5" ([dr-muscle.com Evolve review](https://dr-muscle.com/evolve-ai-app-review/); [Exodus Strength forum thread](https://www.exodus-strength.com/forum/viewtopic.php?t=4506); [toolify.ai review](https://www.toolify.ai/ai-news/is-the-evolve-ai-powerlifting-app-worth-your-time-and-money-2564649)). ~$15/month.

---

## 3. Cross-cutting user sentiment (quoted evidence)

**What earns the "elite programming" label:**
1. *Visible reaction to my feedback.* RP: users "love that … it updates weights and reps based on ratings of workload and soreness" and that the app "thinks for them" — "cheat code" ([App Store reviews](https://apps.apple.com/us/app/rp-hypertrophy/id1555614554?see-all=reviews&platform=iphone)). JuggernautAI: "the most knowledgeable coach who understands their situation" ([App Store](https://apps.apple.com/us/app/juggernautai/id1515756471)). Sheiko Gold: "Even having a real life coach doing my programming every week has never been this good" ([App Store](https://apps.apple.com/us/app/sheiko-gold-workout-coach/id1475890027)).
2. *Coach pedigree as proof.* Boostcamp (named authors), JuggernautAI (Chad Wesley Smith), RP (Dr Mike Israetel), MacroFactor (SBS/Nippard) all convert authority into trust before the algorithm proves itself.

**What triggers the "generic plan" complaint:**
1. *No visible structure or rationale.* Fitbod: "workouts seem random, lacking the structured progression needed for effective bodybuilding" ([dr-muscle.com](https://dr-muscle.com/fitbod-workout-app-review/)). MacroFactor Workouts: "I don't know how it works... I don't know the rules of the game" ([App Store review](https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524)).
2. *Inputs that don't change outputs.* Evolve AI: "the same workout assigned regardless of whether you barely slept or got 10 hours" ([dr-muscle.com](https://dr-muscle.com/evolve-ai-app-review/)).
3. *No split/exercise agency.* Evolve AI: "spits out a template without allowing basic choices like what type of split you want" (ibid.). RP: "minimal help, if any, with choosing exercises" ([dr-muscle.com critique](https://dr-muscle.com/rp-hypertrophy-app-critique/)).
4. *Price without trial.* RP at $34.99/month with no free trial: "Paid for one month... totally not worth it" ([wellness.alibaba.com](https://wellness.alibaba.com/fitlife/rp-hypertrophy-app-cost-reality)).
5. *Offline matters.* RP users "requested that the app work without an internet connection, as poor gym connectivity can be problematic" ([App Store reviews](https://apps.apple.com/us/app/rp-hypertrophy/id1555614554?see-all=reviews&platform=iphone)).

**Reddit meta-consensus** (via aggregator): "the workout planner matters far less than your consistency … the difference between the 'best' planner and a mediocre one is minimal compared to the difference between training consistently and skipping workouts" ([Setgraph Reddit roundup](https://setgraph.app/ai-blog/best-workout-planner-reddit-recommends)) — adherence features are part of plan quality.

---

## 4. Implications for Volyume

### Where Volyume leads
1. **Division-specific generation is unique.** No app in the top 10 generates plans per physique division (men's physique, classic, bikini, wellness, figure, etc.) with division-aware MRV ceilings and judged-muscle floors. The only division-specific offerings found are human coaching services (e.g. [julielohre.com](https://julielohre.com/figure-competition-and-bikini-competition-training/), [fitblissfitness.com](https://fitblissfitness.com/competition-prep)). Volyume's DIVISION_MATRIX with named splits is genuinely uncontested.
2. **Transparency ("whyThis").** Black-box complaints recur across Fitbod ("random") and MacroFactor ("I don't know the rules of the game"). Volyume's plain-English per-dimension rationale directly answers the category's most common trust failure.
3. **Offline-first.** RP — the category leader for hypertrophy — has App Store reviews requesting offline operation. Volyume already has it.
4. **Engineered guarantees.** Hard floors/caps (structural muscles never zero, delt cap 26, recovery-scaled systemic ceiling) and the ED safety system have no advertised equivalent anywhere in the top 10; Evolve AI's volume-mismatch complaints show what happens without them.
5. **Honest time-budgeting.** Per-session duration estimates with over-budget notes and time-trimming are not documented in any competitor reviewed.

### Where Volyume matches
- Deterministic, science-based generation (JuggernautAI, RP, Alpha Progression, MacroFactor are all rule/expert systems, not LLMs).
- Individualised volume landmarks (JuggernautAI's "MEV/MRV starting points tailored to your lifter profile" is the same idea as Volyume's 4-multiplier `computeLandmarks`).
- Layoff handling (Dr. Muscle's 10-20% reduction vs Volyume's 0.9 multiplier at 7 days).

### Where Volyume lags
1. **No session-level subjective feedback loop.** RP (pump/soreness/workload per muscle), JuggernautAI (readiness pre/intra/post session), Sheiko (rep-to-rep), Dr. Muscle (plus-sets) all autoregulate *within* the week from structured subjective inputs. Volyume's coach signal (-2..+3 sets/muscle, confirm-then-apply) is weekly and coarse by comparison.
2. **No explicit RIR/intensity ramp and deload automation surfaced.** RP's 4→1 RIR ramp into a deload and Alpha's per-set RIR prescriptions are the visible "periodisation is happening" signal users praise; Volyume's mesocycle rows adjust volume but no equivalent intensity wave or automated deload week is evidenced in the baseline.
3. **No per-set weight/rep recommendation marketing.** Volyume computes set targets from prior sessions, but Alpha Progression and Dr. Muscle make "we tell you exactly what to lift, every set" the headline; Volyume undersells an existing capability.
4. **Brand authority and named programming.** Boostcamp (named coaches), RP (Israetel), JuggernautAI (CWS), MacroFactor (Nippard/SBS) all borrow credibility Volyume lacks; Volyume's named splits ("V-Taper") are a start but carry no external authority.
5. **Readiness inputs are static.** Volyume captures recovery rating at generation time; leaders re-ask daily (sleep, soreness, stress) and visibly modify today's session.

### The single biggest gap
**A within-week, per-muscle subjective autoregulation loop (pump / soreness / joint / readiness feedback that visibly modifies the next session's sets and loads).** This is the common engine of the top three hypertrophy apps and the specific feature users quote when calling programming elite ("updates weights and reps based on ratings of workload and soreness"). Volyume already has the deterministic landmarks and mesocycle plumbing to support it without any AI — it is an extension of the existing coach signal from weekly/global to per-session/per-muscle.

### Best-in-class and why
**JuggernautAI** — adapts at six distinct time-scales (pre-session, intra-session, session-to-session, weekly, block, program) from a deterministic expert system with individualised MEV/MRV and weak-point-driven exercise selection, and its users describe it as a coach, not an app. **RP Hypertrophy** is best-in-class for pure hypertrophy feedback methodology but is rigid, online-only and twice the personalisation breadth would suggest in price. Volyume's strategic position: JuggernautAI's adaptive depth + RP's hypertrophy methodology, applied to the division-specific niche neither serves, offline, with transparent rationale.

---

*Agent 1 of 14 — Training Plan Generation and Personalisation. No code was modified.*
