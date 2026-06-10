# Competitive Audit 01 — Training Plan Generation & Personalisation
**Date:** 10 June 2026 · **Area:** Intelligent, personalised plan generation · **Researcher:** Claude (competitive intelligence agent)

> Method: 18+ distinct web searches across Google Play / App Store review aggregators (justuseapp), Trustpilot, Reddit-sourced round-ups (r/Fitness, r/weightroom, r/naturalbodybuilding, r/bodybuilding thread analyses via Setgraph and Cora App), YouTube reviews, vendor sites and independent review blogs (Fitness Drum, PowerliftingTechnique, BarBend, HotelGyms, mesostrength, leaveit2ai, Arvo). Some primary pages (mesostrength, fitnessdrum, powerliftingtechnique, dr-muscle) blocked direct fetch (HTTP 403); their content was captured via search-result extraction. Each sentiment claim names its source. No code was changed.

---

## 1. Top 10 ranked list (plan-generation intelligence)

1. **RP Hypertrophy (RP Strength)** — the benchmark for adaptive hypertrophy mesocycles; weekly autoregulation from pump/soreness/RIR feedback; expensive, online-only, intimidating setup.
2. **JuggernautAI** — most "coach-like" deterministic-feeling AI for strength sports; deep onboarding, daily/weekly readiness adaptation; volume calibration is its known weakness.
3. **Alpha Progression** — best value AI plan generator; goals/equipment/schedule/muscle-priority inputs, RIR-based progression, deloads; one-third of RP's price.
4. **Fitbod** — slickest UI and equipment-aware generation at huge scale; "muscle freshness" recovery model; widely criticised as random per-session, not a coherent programme.
5. **Dr. Muscle** — densest feature set (set-by-set autoregulation, DUP, auto-deloads); ugly UI, very high price, cancellation complaints.
6. **MyoAdapt (Dr. Milo Wolf & Dr. Pak)** — newest science-led entrant (launched ~2025/26); lifestyle-aware adaptation (sleep, schedule, holidays); credibility-first positioning.
7. **Caliber** — human-coach hybrid; strong free tier; "personalisation" comes from a person, not an engine — the highest user-satisfaction scores in the set.
8. **Boostcamp** — programme library (130+ coach programmes, 10k+ community programmes) + custom builder with periodisation; curation, not generation.
9. **Evolve AI** — strength-focused AI programming with daily readiness inputs; mixed Reddit sentiment about "randomness".
10. **MacroFactor (training module)** — Stronger By Science pedigree; nutrition-first app adding training planning/logging; module is young and thin on adaptive plan generation versus its nutrition engine. (The rumoured "Sets" app could not be verified as a distinct shipping product in this research pass; MyoAdapt occupies the newer-entrant slot.)

---

## 2. Per-app deep dives

### 2.1 RP Hypertrophy
- **Plan generation:** "Meso Builder" — pick from 45+ templates or build a custom mesocycle; specify muscles to prioritise and the app builds the programme around them (rpstrength.com/pages/hypertrophy-app).
- **Goal/division specificity:** Pure hypertrophy. No strength, powerlifting, aesthetics-division or physique-goal framing — prioritisation is per-muscle only.
- **Adaptation:** Weekly autoregulation from pump, soreness, perceived effort and performance; volume and load rise and RIR falls across a 4–6 week wave, then deload (dr-muscle.com/rp-hypertrophy-app-review; user reviews cited there).
- **Weak points:** Handled via muscle prioritisation in Meso Builder; no named "weak point" taxonomy.
- **Plan reveal:** Spreadsheet-like mesocycle grid; reviewers call the interface "outdated compared to newer fitness apps" (mesostrength.com/blog/rp-hypertrophy-alternatives). Web-app wrapper, not a polished native experience (wellness.alibaba.com review).
- **Complaints:** 2.8 on Trustpilot (renaissanceperiodization.com reviews). Price ($34.99/mo, ~$225–300/yr) is "too high for the limited customization" (Reddit, quoted by mesostrength). No offline mode (dr-muscle review). Steep setup, confusing for newcomers, "perceived lack of true automation" (mesostrength). Users ask for 5–6-week mesos instead of fixed 4 (rpstrength reviews).
- **Praise:** "Good at evaluating training based on variables that matter for hypertrophy: pump, soreness, effort, overload" (user reviews via dr-muscle round-up). A 6-month Medium user (Justin James Smith) reported learning he'd been using far more volume than needed. This is the app most often described as **elite programming** by serious hypertrophy lifters — when they can stomach the price.

### 2.2 JuggernautAI
- **Plan generation:** Long onboarding covering lifts, experience, weak points (for powerlifting: lift-specific sticking points), schedule; generates block-periodised strength or powerbuilding programmes.
- **Adaptation:** Adjusts daily and weekly from what users log; "highly personalised while easy to adjust" (powerliftingtechnique.com/juggernaut-ai-review).
- **Weak points:** Genuine lift-technique weak-point selection for SBD; less developed for physique goals.
- **Complaints:** Volume "ranged from too little to way too much … lack of oversight by an actual coach"; the powerbuilding mode "crushes users with volume no matter what parameters are set — developers didn't think through how MEV for hypertrophy and strength differ" (powerliftingtechnique.com; justuseapp reviews). Missing QoL: no Apple Health, no plate calculator, no timer, no end-of-workout volume summary (justuseapp.com JuggernautAI reviews). "Good app, but not at its price" (justuseapp).
- **Praise:** A Reddit user who left Fitbod over bugs called JuggernautAI "a superior fitness app despite a steep price" (dr-muscle.com/fitbod-review-reddit). In powerlifting circles it is the closest thing to "elite" app programming for SBD.

### 2.3 Alpha Progression
- **Plan generation:** Generator asks preferences, equipment, goals, schedule, and **which muscles to prioritise**, then builds a science-based plan the user can freely edit (fitnessdrum.com/alpha-progression-app-review; hotelgyms.com review). Goal choice: muscle building, max strength, or strength endurance.
- **Adaptation:** RIR-based intensity prescription, per-set progression recommendations, deloads; "ideal for lifters who want RP-style mesocycle programming without the RP price tag" (mesostrength.com/blog/rp-hypertrophy-alternatives).
- **Complaints:** "Lacks in-depth analytics", "limited adaptation capabilities; workouts require manual adjustments", "inadequate for advanced/competitive training" (strengthlab360.com comparison; justuseapp Alpha Progression reviews).
- **Praise:** Won "Best Weightlifting App 2025" from at least one outlet; praised for development pace, big exercise library, progression tracking, charts (fitnessdrum; mesostrength). $9.99/mo / $59.99/yr with a free tier — the strongest value story in the category.

### 2.4 Fitbod
- **Plan generation:** Per-session generation (not a programme): algorithm combines training history, goal, **muscle freshness** scores and configured equipment to assemble each workout (fitbod.zendesk.com algorithm Q&A; fitnessdrum.com/fitbod-review).
- **Adaptation:** Continuous — difficulty nudges up as sets feel easy; needs ~10–15 logged workouts before personalisation matures (corahealth.app/compare/fitbod).
- **Weak points:** None structurally; content marketing covers V-taper but the engine has no physique-goal targeting (fitbod.me blog).
- **Plan reveal:** "Cleanest UI in the category", fast logging, excellent visualisation (corahealth.app; hotelgyms.com).
- **Complaints:** The defining theme — recommendations feel "**randomized rather than strategically tailored**", "closer to fatigue management than clean progression" (experienced Reddit users via dr-muscle.com/fitbod-review-reddit). Cannot progressively overload custom workouts (Reddit, same source). Recovery model ignores wearable data (corahealth.app). Billing complaints from short-term users (corahealth.app).
- **Praise:** Beloved by beginners and travellers for equipment-aware convenience and polish (hotelgyms.com; fittesttravel.com).

### 2.5 Dr. Muscle
- **Plan generation/adaptation:** Built by an exercise scientist; autoregulated progressive overload updates the plan after every workout, set-by-set rep/load adjustment, daily undulating periodisation, automatic deloads; 25+ automation features (dr-muscle.com/what-makes-dr-muscle-different; futurepedia.io).
- **Complaints:** $48.99/mo / $399.99/yr — "similar to any other workout app, although 30x more expensive" (Trustpilot dr-muscle.com reviews). "Almost impossible to cancel the subscription" — email-only cancellation, users charged for another year (Trustpilot). Slow app, exercises fail to register (Trustpilot). AI chat "gives cookie cutter responses" (Trustpilot). "Ugly" UI (leaveit2ai.com review). Requires internet to update workouts.
- **Praise:** Users who stick with it credit the hands-off automation — "like a personal trainer in your pocket" (dr-muscle.com/reviews; futurepedia.io).

### 2.6 MyoAdapt
- **What it is:** New app from Dr. Milo Wolf and Dr. Pak (both PhDs, Applied Muscle Development Lab, Lehman College) — "a smart coach in your pocket" (myoadapt.com; dr-muscle.com/myoadapt-workout-app).
- **Plan generation/adaptation:** Adapts to sleep quality, schedule and lifestyle; modifies workouts around holidays and routine changes — lifestyle-aware adaptation is its differentiator. Early unaffiliated YouTube reviews emerging; little Reddit signal yet.
- **Threat assessment:** Highest-credibility scientific branding in the space (Wolf is the loaded-stretch researcher; Pak the minimum-effective-dose researcher). Likely to pull the science-based audience that finds RP too expensive.

### 2.7 Caliber
- **Plan generation:** Human coaches design the plan from a 20+ step onboarding questionnaire (goals, experience, equipment) plus an intro video call on premium tiers (barbend.com/caliber-fitness-app-review; screensdesign.com showcase; fitnessdrum.com/caliber-app-review).
- **Plan reveal:** The onboarding "successfully frames questions as essential for building a truly personalized plan" (screensdesign.com) — an explicitly designed effort-justification experience.
- **Complaints:** Onboarding feels long (sports-nerd.com). Logging flow "clunky, too many taps"; users request **dark mode** and auto rest timer (fitnessdrum.com). Some coach messages feel "copy and paste" generic (Reddit user via sports-nerd.com). $200/mo for 1-on-1.
- **Praise:** 4.8 App Store, 4.7 Google Play, 4.9 Trustpilot — best satisfaction in the set; users cite plans tailored to goals and injuries (Trustpilot caliberstrong.com). The lesson: humans still beat every algorithm on *perceived* personalisation.

### 2.8 Boostcamp
- **Plan generation:** Not generative — 130+ expert programmes with built-in periodisation and deloads plus 10,000+ community programmes; a custom builder (web + app) supports multi-week periodisation and custom progressions, with light AI assist (boostcamp.app; App Store listing).
- **Complaints:** Exercise substitution paywalled (Google Play reviews via Vora comparison); logged data lost without stable internet — offline gaps (App Store reviews). Its "AI" custom generation is basic versus adaptive coaching apps (askvora.com/compare/boostcamp).
- **Praise:** r/weightroom's default recommendation "if you want a structured program from a real coach, free" (corahealth.app 200-thread Reddit analysis). 4.8 stars, 1M+ users.

### 2.9 Evolve AI
- **Plan generation/adaptation:** Builds strength programmes from goals/experience; structured blocks; daily inputs for sleep and fatigue adjust sessions (dr-muscle.com/evolve-ai-app-review, which aggregates Reddit threads).
- **Complaints:** A Redditor "disliked the randomness of the workouts and preferred structured programming, questioning long-term benefit without a clear plan"; another plateaued and wanted a human coach for form (Reddit via dr-muscle review).
- **Praise:** Improved warm-up routines, structured blocks, responsiveness to daily readiness (Reddit via same source).

### 2.10 MacroFactor (training module)
- **Status:** The Stronger By Science team's nutrition app added workout planning/logging; searches surfaced essentially **no independent review coverage of the training module as a plan generator** (a dedicated search returned no results). It currently appears to be a planner/logger, not an adaptive generator.
- **Relevance:** The credible threat is bundling — if MacroFactor ships adaptive programming next to the category-leading adaptive nutrition engine, it lands directly on Volyume's combined positioning. Watch item, not a current leader.

---

## 3. User sentiment synthesis

### What users love (named sources)
- **Feedback-driven weekly adaptation** — RP's pump/soreness/RIR loop is the most-praised mechanic in the category (user reviews via dr-muscle.com/rp-hypertrophy-app-review; Medium 6-month review by Justin James Smith).
- **Equipment-aware generation + clean UI** — Fitbod (hotelgyms.com; corahealth.app).
- **Human-grade tailoring incl. injuries** — Caliber Trustpilot (4.9/5, 880+ reviews).
- **Value-priced AI generation with muscle prioritisation** — Alpha Progression (fitnessdrum.com; mesostrength.com).
- **Coach-authored proven programmes, free** — Boostcamp (r/weightroom via corahealth.app analysis).
- **"Elite" programming claims** — RP Hypertrophy (hypertrophy crowd) and JuggernautAI (powerlifting crowd, powerliftingtechnique.com; Reddit switcher quoted in dr-muscle.com/fitbod-review-reddit) are the only two apps users routinely call elite.

### What users hate (named sources)
- **Price vs value** — RP $35/mo (Trustpilot 2.8; Reddit via mesostrength), Dr. Muscle $49/mo ("30x more expensive", Trustpilot), JuggernautAI ("good app, not at its price", justuseapp).
- **Random/incoherent generation** — Fitbod "randomized rather than strategically tailored" (Reddit via dr-muscle round-up); Evolve AI "randomness" (Reddit via dr-muscle review).
- **Mis-calibrated volume** — JuggernautAI powerbuilding "crushes users with volume no matter what parameters are set" (powerliftingtechnique.com).
- **No offline support** — RP (dr-muscle review), Boostcamp data-loss reports (App Store), Dr. Muscle requires connection (futurepedia.io).
- **Dark-pattern billing** — Dr. Muscle cancellation (Trustpilot); Fitbod billing complaints (corahealth.app).
- **Steep, confusing setup** — RP (mesostrength); Caliber's 20+ step onboarding length (sports-nerd.com).

### What users wish existed (no app delivers all)
- RP-quality adaptive mesocycles **at a sane price** (recurring across RP/Alpha comparison content, mesostrength).
- Volume that's actually calibrated to the individual — neither Juggernaut's overdose nor Fitbod's drift (powerliftingtechnique; Reddit via dr-muscle).
- Recovery models that use real signals, not just training load — Fitbod criticised for ignoring HRV/sleep/wearables (corahealth.app); MyoAdapt is first to market the idea.
- Offline reliability in concrete-walled gyms (RP, Boostcamp complaints above).
- Coherent long-term plans *and* session-level flexibility together (Evolve AI and Fitbod each deliver only one half).
- Dark mode + auto rest timer remain top feature requests even on a 4.9-rated app (Caliber, fitnessdrum.com).

---

## 4. Best-in-class implementation

**RP Hypertrophy's weekly feedback→volume autoregulation loop** is the single best implementation found: per-muscle pump/soreness/effort ratings drive set-count changes inside a structured mesocycle with falling RIR and a predicted deload. It is the only mechanic users consistently describe as feeling like a real coach reasoning about *their* recovery — and it is conceptually identical to Volyume's confirm-then-apply weekly volume adjustment, except RP applies it silently. Honourable mention: **Caliber's onboarding-as-justification** (screensdesign.com) — the best plan *reveal* in the set despite using humans, because the reveal explains why every input mattered.

## 5. Most common failure mode

**Volume/structure mis-calibration presented without explanation.** Across the set, the dominant complaint is plans that are either incoherent session-to-session (Fitbod, Evolve AI "random") or coherent but wrongly dosed (JuggernautAI "too little to way too much"; RP users overriding meso length), and in every case the app gives the user no rationale, so trust collapses and the price complaint follows. Second-place failure: charging $35–49/mo for it.

---

## 6. Volyume lead / match / lag table

| App | Volyume leads | Volyume matches | Volyume lags |
|---|---|---|---|
| RP Hypertrophy | Price (£4.99 vs $35); offline-first; 7 physique goals + 15 named weak points (RP has per-muscle priority only); per-exercise "why this" rationale; ED-safety floors; integrated nutrition | Mesocycle periodisation, deload prediction, MEV/MAV/MRV personalisation, weekly autoregulated volume | Brand authority (Israetel); 45+ proven templates; depth of in-meso feedback granularity (per-muscle pump/soreness each session); social proof of results |
| JuggernautAI | Hypertrophy/aesthetics goal coverage; capped, confirmed changes (vs volume overdose); offline; price | Experience/equipment/schedule-driven generation; periodised blocks | SBD strength programming depth; lift-specific technical weak points; readiness-based daily adjustment |
| Alpha Progression | Goal taxonomy (V-taper, X-frame vs 3 generic goals); stimulus-to-fatigue exercise ranking; deterministic transparency; rationale text | Price/value; equipment + muscle-priority generation; RIR progression; free-tier strategy | Plan editability post-generation (Alpha lets users tweak every variable); charts/analytics depth; multi-gym profiles |
| Fitbod | Programme coherence (meso structure vs per-session randomness); explicit progression logic; rationale text; weak-point specialisation | Equipment-aware selection; dark premium UI ambitions | UI polish and logging speed benchmark; instant zero-thought session generation; mass-market onboarding maturity |
| Dr. Muscle | Price; UI/design; transparent deterministic logic vs "cookie-cutter AI"; honest billing | Auto-deloads; per-workout-informed progression | Set-by-set in-session autoregulation; sheer automation feature count |
| MyoAdapt | Shipping maturity, nutrition integration, goal/weak-point taxonomy, offline | Science-based volume/effort framing | Researcher credibility branding; lifestyle-aware adaptation (sleep/holiday rescheduling) |
| Caliber | Deterministic scale (no human bottleneck); price at equivalent tier; dark UI (their users beg for dark mode); auto rest timer opportunity | Thorough onboarding inputs | Perceived personalisation of a human coach; injury accommodation; satisfaction scores (4.9 Trustpilot) |
| Boostcamp | True generation vs static library; adaptive weekly volume; weak points | Free-tier breadth; periodisation + deloads in plans | Coach-brand programme catalogue (named-coach trust); community programme network effects |
| Evolve AI | Plan coherence + capped changes; goal breadth; rationale | Daily structure, warm-up quality | Daily readiness inputs (sleep/fatigue) adjusting today's session |
| MacroFactor (training) | Adaptive plan generation (MF has none yet); weak points; periodisation | Combined training+nutrition in one app; adaptive-TDEE nutrition engine | Nutrition-engine reputation halo; data-toolkit polish; SBS audience pipeline |

---

## 7. Improvement opportunities for Volyume (ranked by impact)

1. **Make the plan reveal cinematic and rationale-led.** Volyume's reveal is currently a plain list while its inputs (7 goals, 15 weak points, recovery, equipment) are the richest in the category. Caliber proves perceived personalisation is manufactured at the reveal (screensdesign.com); Fitbod/Evolve's "random" complaints are really "I can't see the logic". Volyume already has per-exercise "why this" text — surface it during an animated reveal (goal → split → volume targets → exercise-by-exercise with reasons). Highest leverage-to-effort ratio in this report.
2. **Add in-meso per-muscle feedback (pump/soreness/joint) to the weekly confirm-then-apply loop.** This is the exact mechanic that earns RP its "elite" reputation. Volyume's MEV/MAV/MRV landmarks already exist; feeding 3 quick post-session ratings into the weekly adjustment would match RP's core loop at 1/7th the price — and the confirm-then-apply step fixes RP's "lack of true automation transparency" complaint rather than copying its silence.
3. **Weaponise offline-first and honest billing in marketing.** RP (no offline), Boostcamp (data loss), Dr. Muscle (connection-dependent, cancellation hell) all bleed users on exactly the things Volyume's architecture guarantees. Cheap positioning wins: "works in a basement gym, cancel in two taps".
4. **Expose plan editability post-generation.** Alpha Progression's most-cited strength is generate-then-freely-adjust. If Volyume's generated plans feel locked, users who half-trust the engine will churn; allow exercise swaps (stimulus-to-fatigue-ranked alternatives) and day re-ordering inside guardrails.
5. **Add a lightweight daily readiness check (deterministic).** Evolve AI and MyoAdapt are praised specifically for sleep/fatigue-responsive sessions. A rules-based "low readiness → drop top sets / cap RIR today" toggle stays inside the no-AI boundary and answers the category's emerging expectation. (Pro feature; coaching-engine adjacent — needs explicit sign-off per CLAUDE.md before any implementation.)
6. **Publish the volume-calibration story.** Juggernaut's defining failure is mis-dosed volume with no explanation. A "your volume landmarks" screen showing personalised MEV/MAV/MRV per muscle and how last week's data moved them converts Volyume's engine into visible proof of intelligence.
7. **Ship 5–6-week mesocycle options.** RP users explicitly request meso lengths beyond 4 weeks (rpstrength reviews). If Volyume's periodisation is fixed-length, parameterise it.
8. **Named-coach or named-method template layer (later).** Boostcamp's moat is coach-brand trust; RP's is Israetel. Volyume cannot buy that overnight, but licensing or collaborating with one credible UK evidence-based coach for "signature" plan presets would close the authority gap that pure algorithms can't.
9. **Watch MyoAdapt and MacroFactor quarterly.** MyoAdapt is the only competitor converging on Volyume's science-deterministic positioning; MacroFactor is the only one converging on its training+nutrition bundle. Re-audit both by September 2026.

---

*Sources are inline throughout. Primary aggregators: dr-muscle.com review network (treat competitor reviews there as adversarial but Reddit quotes as usable), powerliftingtechnique.com, fitnessdrum.com, mesostrength.com, corahealth.app and setgraph.app Reddit thread analyses, Trustpilot (renaissanceperiodization.com, dr-muscle.com, caliberstrong.com), justuseapp.com (JuggernautAI, Alpha Progression, Caliber), screensdesign.com, hotelgyms.com, barbend.com, sports-nerd.com, askvora.com, arvo.guru, myoadapt.com, boostcamp.app, fitbod.zendesk.com.*
