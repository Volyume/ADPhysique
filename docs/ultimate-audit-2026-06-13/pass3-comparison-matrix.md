# pass3-comparison-matrix.md — per-area quality comparison (Pass-3 spec format)

Format per area: BEST IN CLASS (capability bar, provenance) · WHERE WE LEAD (our file:line) · WHERE WE LAG
(our file:line + bar source) · MISSING ENTIRELY · VERIFICATION STATUS (per cell: VERIFIED = corroborated /
documented; PARTIAL = aggregator/single/simulated; NOT FOUND = un-sourceable, missing data point named).
Our side is read-verified (Read calls in console). Competitor side carries provenance; un-sourceable cells
are NOT FOUND, not fabricated. Quality = capability + execution; only micro-UX timing (taps/seconds) is NOT FOUND.

---

## WORKOUT-SCREEN (WS)
- **BEST IN CLASS:** fast loggers (Strong/Hevy) — autofill previous, inline last-session, auto rest timer,
  set types; framed as *"lifting journals with timers, no recovery integration"* (Claude WS-F3, sensai —
  AGGREGATOR). Inline last-session valued (ChatGPT WS-F2, store sentiment). Offline/no-data-loss expected
  (ChatGPT WS-F3 store reviews; Gemini WS-K3 simulated).
- **WHERE WE LEAD:** in-log progressive prescription — pre-filled next-set weight/reps with beat-rep
  (`algorithms.js:354-438`; `ActiveWorkoutScreen.js:616-660,:853-865`), PR detect+celebrate on log
  (`:841-851`), auto-advance on hitting target (`:893-900`), deload prescription (`:694-718`), session
  autoregulation adjustments (`:221-226`), supersets/myo/rest-pause/AMRAP clusters (`:953-996`), time-crunch
  trim (`:1076-1128`). No competitor in the research does in-log prescription (they are "journals with timers").
- **WHERE WE LAG:** keyboard-completes-the-set — reps field "Done" dismisses then a separate Log tap
  (`SetEntry.js:126`) vs Strong's keyboard-complete.
- **MISSING ENTIRELY:** none vs the corroborated capability bar (inline-prev, rest timer, set types, offline all present).
- **VERIFICATION:** inline-prev MATCH = VERIFIED (CG+CL); auto rest timer = VERIFIED (all-three; ours `:890`,`RestTimer:1585`); offline-first = VERIFIED (ours, local SQLite, 0 network in log path); in-log-prescription LEAD = VERIFIED(ours) / competitor "journals-with-timers" PARTIAL (AGGREGATOR sensai). **NOT FOUND:** taps-to-log and keyboard-complete benchmark — *missing data point: corroborated/public taps-per-set + keyboard-completion behaviour for Strong/Hevy* (only Gemini-simulated + one reddit quote).

## FOOD-LOGGING (FL)
- **BEST IN CLASS:** curated/nutritionist-**verified** UK DB (Nutracheck ~500K) explicitly beats
  **crowdsourced** entries (ChatGPT NU-F1; Gemini NU-F2 *"crowded, unverified, user-generated entries… Nutracheck nutritionist-verified"*; Claude NU-F1 *"conflicting entries that plague crowdsourced databases"*); barcode; meal memory / copy / favourites / quick-add (all-three FL-Q5); Cronometer-grade micronutrients (Gemini NU-F3, Claude NU-F2); AI photo logging fast but 15–40% error (all-three, rated unreliable).
- **WHERE WE LEAD:** meal-memory depth — per-meal "Add again" pre-filling last portion (`FoodSearchScreen.js:104,:737`), multi-add plate (`:234-306`), one-tap curated meal (`:380`), copy-yesterday + save-as-meal + bulk ops (`DiaryScreen.js:459,:365,:300-343`) — beyond the documented copy/recents/favourites bar.
- **WHERE WE LAG:** **UK food-DB quality** — our branded source is **OpenFoodFacts, crowdsourced by design** (`food/seed.js:7-8`), on the wrong side of the documented curated-vs-crowdsourced line; CoFID adds only ~3k verified generics. Micronutrient depth below Cronometer.
- **MISSING ENTIRELY:** vitamins/minerals/NRV tracking (schema = fibre/sodium/sugar only, `food/db.js:240`); weekday→weekend calorie-banking planner.
- **VERIFICATION:** DB-curation lag = VERIFIED (ours = OFF per `food/seed.js:7`; OFF=crowdsourced per OFF's own model; bar corroborated all-three); meal-memory LEAD = VERIFIED(ours); micronutrient MISSING = VERIFIED. **NOT FOUND:** per-item log speed — *missing data point: corroborated/public seconds-or-taps to log one food* (Gemini 45–90s is single + simulated).

## COACH OUTPUT / AI-COACHING (AC)
- **BEST IN CLASS:** weekly adaptive loop (MacroFactor/Carbon, all-three); **transparent "why" raises trust, black-box erodes it** — MacroFactor transparent vs Carbon black-box (ChatGPT Q3; Gemini Q3; Claude Q3); adherence-neutral preferred (all-three); each competitor adjusts **either** nutrition **or** training, none both (all-three); deterministic preferred over LLM (all-three).
- **WHERE WE LEAD:** closes the **full** loop — calories + training-volume + steps + cardio off one weight trend (`weeklyCoach.js:176-191,:766-785,:873-914`) where every competitor does one side only. Specific plain-language adjustments with "why this week" + "learn more" (`WHY_LIBRARY weeklyCoach.js:254-297`; `CoachOutputScreen.js WhyBlock :353-372`) and register supportive/precise (`coachRegister.js:80-88`) vs Carbon's black-box. Always-on, tier-blind ED-safety floors (no competitor advertises any).
- **WHERE WE LAG:** none on a corroborated quality bar. (Human-coach hybrid, Caliber — absent by deliberate design, not a quality lag.)
- **MISSING ENTIRELY:** named tiered-autonomy modes (Coached/Collaborative/Manual, MacroFactor) — we have manual control + per-domain confirm-then-apply (`CoachOutputScreen.js:778-1045`) but no named mode toggle.
- **VERIFICATION:** full-loop LEAD = VERIFIED (ours read) + bar ALL-THREE; transparency LEAD = VERIFIED + corroborated; autonomy-modes bar = PARTIAL (single-source Gemini). No NOT FOUND cells — coaching capability is documented in editorial/app docs, not micro-timing.

## PROGRESS (PR)
- **BEST IN CLASS:** per-exercise 1RM + volume/heatmap graphs + PR callouts (all-three); trend-weight smoothing standard (ChatGPT PR-F2, Gemini K1); **progress photos + body measurements top demand, photos private-by-default** (all-three; MacroFactor 1,500+ upvotes each, Claude PR-F1); recomposition reframing of flat weight (all-three); composite strength/Strength-Score reframe (Caliber, ChatGPT PR-F3).
- **WHERE WE LEAD:** composite **strength standing** (overall label + per-lift Beginner→Elite) `LiftProgressScreen.js:138-193` + `strengthStandards.js:108-132` — matches/exceeds Caliber's Strength Score; full graph suite — 1RM, volume→heatmap, PR-rate sparkline, tonnage, ACWR workload, muscle-frequency (`useProgressData.js`; `AnalyticsScreen.js:431-524`); body-fat + 9-site measurement trends (`BodyMetricsScreen.js:88,:242-358`); ED-safe streak-freeze (`streak.js:37`).
- **WHERE WE LAG:** trend-weight smoothing is a MATCH not a lag — we have it (`computeEWMA weeklyCoach.js:39`, robust trend `:577`, `WeightTrendCard`).
- **MISSING ENTIRELY:** **progress-photo UI** (backend table exists `supabase setup_complete.sql:251`, no capture in `BodyMetricsScreen.js`) — against the top-demand bar; **recomposition reframing view** (BF/measurement/strength components exist, no view reframes flat scale weight).
- **VERIFICATION:** graphs MATCH = VERIFIED (all-three); strength-standing LEAD = VERIFIED; photos MISSING = VERIFIED (demand bar all-three); recomp-view MISSING = VERIFIED. No NOT FOUND cells.

## NUTRITION (NU — targets/macros)
- **BEST IN CLASS:** UK curated DB (see FL); macro flexibility / carb-cycle / calorie-planner (all-three); protein scaled to bodyweight/lean mass (all-three); kcal + UK units; micronutrient/NRV depth (Gemini NU-F3, Claude NU-F2).
- **WHERE WE LEAD:** protein approaches standard/optimised/advanced/**custom g/kg**, LBM-based (`nutritionEngine.js:65-98`; `NutritionTargetsScreen.js:844-892`); transparent "why these numbers for you" calorie/protein/fat/carb rationale (`NutritionTargetsScreen.js:1093-1207`); carb-cycle + refeed + diet-break (`CoachOutputScreen.js:425-510`); per-meal protein split inside the MPS window (`NutritionTargetsScreen.js:1003-1091`); experience-scaled surplus (`nutritionEngine.js:709-723`).
- **WHERE WE LAG:** micronutrient depth vs Cronometer; no weekday calorie-banking planner.
- **MISSING ENTIRELY:** vitamins/minerals/NRV tracking.
- **VERIFICATION:** flexibility/protein/transparency LEAD = VERIFIED (ours) + corroborated bar; micronutrient MISSING = VERIFIED. No NOT FOUND cells.

## PLAN-GENERATION (PG)
- **BEST IN CLASS:** deterministic mesocycle periodisation with MEV/MRV landmarks + deloads + weak-point specialisation (RP/Juggernaut/Alpha, all-three PG-F2); inputs goals/equipment/level/frequency/1RM/injury (all-three); beginner-linear vs advanced-mesocycle (all-three); LLM plans distrusted as "slop" (all-three PG-F1); Boostcamp = named expert/community programmes, nSuns/GZCLP (ChatGPT PG-F2, Gemini).
- **WHERE WE LEAD:** multi-factor landmark individualisation — experience × recovery × nutrition-phase × age multipliers (`planEngine.js:69-118`), 7 split types (`:17-25`), weak-point day targeting (`:31-57`, `upper_lower_wp` split), goal/phase overlays (`applyGoalOverlay`), deterministic no-LLM (coverage, AC-5). Folding nutrition phase + age + recovery into training volume goes beyond RP/Alpha's experience-only landmarks.
- **WHERE WE LAG:** named expert/community programme breadth — bar is Boostcamp (nSuns/GZCLP, known coaches); ours is a Plan Library (`seedRoutines.js:33 LIBRARY_PLANS`); breadth/expert-branding not yet graded on our side.
- **MISSING ENTIRELY:** none clear vs the corroborated bar (periodisation, deloads, weak-points, splits all present).
- **VERIFICATION:** landmark-periodisation LEAD = VERIFIED (ours read); LLM-distrust alignment = VERIFIED; Boostcamp-breadth = PARTIAL — *our-side measurable: count/branding of `seedRoutines.js` LIBRARY_PLANS (needs our parse); competitor bar AGGREGATOR.* No competitor NOT-FOUND.

## EXERCISE-LIBRARY (EL)
- **BEST IN CLASS:** HD video / looping-animation demos (Gemini EL-F3, ChatGPT); library size ~250 (specialist) → ~1,400 (JEFIT) (ChatGPT/Claude, store); custom exercises + smart substitutions (all-three); per-exercise form cues (ChatGPT).
- **WHERE WE LEAD:** smart substitutions ranked by SFR + stretch + fatigue, equipment-aware, top-3 (`algorithms.js:785-812`); per-exercise form tips (`lib/formTips.js`); custom-exercise creation (`database.js:91,:1493`).
- **WHERE WE LAG:** **no demo media** — exercises table has no video/image/animation column (`database.js:78-92`); form tips are text-only — against the HD-video/animation bar (Gemini EL-F3, ChatGPT; app-docs/store). Library size vs the 250–1,400 bar: our exact count not yet parsed.
- **MISSING ENTIRELY:** exercise demonstrations (video/animation) — register #2 ABSENT.
- **VERIFICATION:** demo-media MISSING = VERIFIED (no media column; register ABSENT; bar app-docs/store VERIFIED); substitutions LEAD = VERIFIED; library-size = *our-side measurable: parse `seedExercises.js` for count (needs our parse)*; bar VERIFIED (JEFIT ~1,400 store). No competitor NOT-FOUND.

## RETENTION (RE)
- **BEST IN CLASS:** streaks + **streak-freeze** beat all-or-nothing guilt (Gemini K2; Claude); social accountability retains (all-three); day-30 retention single-digit / early-window churn (Claude RE-F1/F2; Business of Apps — documented); non-shaming notifications (all-three); annual-sub lock-in (Gemini K3); challenges (Claude RE-F3, Strava 18→32%).
- **WHERE WE LEAD:** **ED-safe / wellbeing-aware streak-freeze** — freezes the run on an open ED-flag or wellbeing screen, not just a missed day (`lib/streak.js:20,:37 'resting'`; `streakState.js` paused weeks) — exceeds the plain streak-freeze bar; non-shaming re-engagement ("you missed" banned) (`notifications/missedCheckin.js:5-9`); PR celebration (`PRCelebration.js`); 1:1 partner accountability (`partners/service.js`).
- **WHERE WE LAG:** none on a corroborated quality bar (streak/freeze/social/PR present; ED-safe variant exceeds bar).
- **MISSING ENTIRELY:** challenges/leaderboards; broad social feed (we have 1:1 partners, not a feed).
- **VERIFICATION:** streak-freeze LEAD = VERIFIED (ours) / bar PARTIAL (Gemini single + ChatGPT no-shame); challenges MISSING = VERIFIED (ours absent) / bar SINGLE-SOURCE (Claude); social-feed = ours is 1:1 partner (VERIFIED). No competitor NOT-FOUND.

## MISSING-FEATURES / WEARABLES (MF)
- **BEST IN CLASS:** Apple Health / Health Connect sync = table-stakes; **HRV/sleep → training volume** most-wished (all-three MF-F1); standalone phone-free watch (Gemini MF-F2); contest peak-week/posing = white-space (ChatGPT MF-3); iOS/Android parity (Gemini).
- **WHERE WE LEAD:** Expo single-codebase cross-platform parity (CLAUDE.md ARCHITECTURE); a readiness path already exists to consume recovery (self-reported, `weeklyCoach.js:144-154`); companion watch logs sets from the wrist (`watch/bridge.js:99-111`).
- **WHERE WE LAG:** **HRV/sleep ingestion absent** — `health.js` reads weight+steps only (`:45-59,:361-474`) vs the HRV→volume bar (all-three); watch is phone-tethered not standalone (`watch/bridge.js:6-7,85-97`).
- **MISSING ENTIRELY:** wearable HRV/sleep read; posing / contest peak-week tool (`mesocycle.js:14-32` peak = training volume only).
- **VERIFICATION:** HRV-ingest MISSING = VERIFIED (ours) + bar ALL-THREE; standalone-watch LAG = VERIFIED (ours tethered) / bar SINGLE-SOURCE (Gemini); posing MISSING = VERIFIED (ours) / bar SINGLE-SOURCE (ChatGPT). No NOT-FOUND.

## SCALING / DUAL-AUDIENCE (SC)
- **BEST IN CLASS:** progressive disclosure = the single-product dual-audience mechanism (all-three); tiered autonomy modes (Gemini — MacroFactor Coached/Collaborative/Manual); register switching plain↔advanced (ChatGPT/Claude); no app spans beginner→elite (Claude SC-F2).
- **WHERE WE LEAD:** register switching supportive↔precise + opt-in science layer (`coachRegister.js:80-88,:308-316`); experience-tiered engine beginner→competitive (`planEngine.js:69-73`; `nutritionEngine.js:709-723`); progressive-disclosure UI in practice — "Set it for me"/"Fine-tune" (`NutritionTargetsScreen.js:516-672`), collapsible "More adjustments" (`CoachOutputScreen.js:771` + CollapsibleSection), measurement toggle (`BodyMetricsScreen.js:956-971`).
- **WHERE WE LAG:** named autonomy modes — manual control + per-domain confirm-then-apply exist (`CoachOutputScreen.js:778-1045`) but no named Coached/Collaborative/Manual toggle.
- **MISSING ENTIRELY:** named autonomy-mode toggle.
- **VERIFICATION:** register/disclosure LEAD = VERIFIED (ours) + corroborated; autonomy-modes MISSING = VERIFIED (ours) / bar SINGLE-SOURCE (Gemini). No NOT-FOUND.

## CHECK-IN (CK)
- **BEST IN CLASS:** short + conditional check-in — Carbon ~3 questions, branches on adherence (Claude CK-F1, joincarbon); wellbeing/recovery inputs (sleep/soreness/readiness) → rest-day rec (Juggernaut, Claude CK-F2); **auto-pull logged data, confirm don't re-enter** (Gemini CK-F3, trainerize); menstrual accounting (Carbon).
- **WHERE WE LEAD:** **auto-derivation** — training verdict from sessions+PRs+volume-delta (`deriveTrainingPerformance :85-95`), calorie adherence from diary rollups (`deriveCalsAdherence :102-111`), steps from registered data, cardio compliance from the log (`load :395-496`); the user *confirms a derived verdict*, beyond the "auto-pull a number" bar. **Fast Check-In** collapses to the **two** non-derivable inputs (energy + soreness) when all else is derived (`fastEligible :550-556`, `renderFastCheckIn :1071`) — shorter than Carbon's 3-question. Conditional branching: cycle (female+opt-in), sore-muscles (soreness≥2), cardio (prescription), calorie (targets set) — `:769-907`. Menstrual accounting present (`showCycle`, `:769-785`). Wellbeing depth (energy/stress/sleep/soreness/sore-muscles/joint/notes) feeds recovery + safety.
- **WHERE WE LAG:** none on a corroborated capability bar.
- **MISSING ENTIRELY:** none vs the bar.
- **VERIFICATION:** short+conditional + fast-path = VERIFIED (ours) / bar corroborated (Claude+Gemini); auto-derivation LEAD = VERIFIED (ours) / bar PARTIAL (Gemini single, trainerize-sourced); menstrual MATCH = VERIFIED. No NOT-FOUND.

## ONBOARDING (ON)
- **BEST IN CLASS:** quiz/progressive-disclosure onboarding that reaches value fast (all-three ON); ≤~3
  actions/screen across ~3–5 short screens (all-three, editorial/UX-pattern); **paywall- or jargon-before-value
  kills beginners** (all-three ON); severe first-month drop-off (D1 ~26% → D28 ~10%, Claude RE-F1/F2; Business
  of Apps — documented); prefill/confirm rather than re-ask (Gemini onboarding/CK-F3, trainerize).
- **WHERE WE LEAD:** value-before-paywall by construction — entry is a **tier-choice** screen, not a paywall
  (`WelcomeScreen.js:57-66 chooseTier`, trust row "Works fully offline · Exports anytime · No ads, ever"),
  and **Free reaches a ready-to-train Home with a real plan installed** off a **3-question deterministic
  micro-quiz** (`FreeStarterScreen.js:103-120 handleStartPlan` → `copyPlanFromLibrary`+`activatePlanWithBlock`;
  questions `:156-183`; skip always visible `:248-256` — autonomy-first). Pro wizard enforces the
  **3–5-fields-per-step** rule explicitly (`ProOnboardingScreen.js:428-430,:430` comments; 5 steps `TOTAL_STEPS:52`)
  with progress bar + **endowed-progress** head-start (`:768-781 ProgressBar`, `BASE 0.12`), **quiz→wizard prefill
  so a quiz-first user confirms rather than re-answers** (`:198-212`), and an **honest named build sequence** mapped
  to real generation phases, never completing before the real work (`:54-61,:457-465,:755-761`; COMP-013), with a
  Reduce-Motion path (`:133,:511`). Jargon is glossed in-flow, not assumed (InfoTooltip + GLOSSARY at body-fat
  method `:1078`, phase/division `:1202,:1216`).
- **WHERE WE LAG:** none on a corroborated capability bar — quiz, progressive disclosure, prefill/confirm,
  short stepped screens, and no-paywall-before-value are all present. (The pre-account **quiz-first** variant
  is flag-gated off by default — `QuizScreen.js:10 ONBOARDING_QUIZ_FIRST`; the live flow is account/tier-first,
  which still satisfies the value-before-paywall bar.)
- **MISSING ENTIRELY:** none vs the corroborated bar.
- **VERIFICATION:** progressive-disclosure + 3–5/step + prefill/confirm + skip/autonomy + no-paywall-before-value
  LEAD = VERIFIED (ours read) / bar corroborated ALL-THREE; drop-off bar = VERIFIED (Business of Apps,
  documented) but is a market fact, not a per-screen design grade. **NOT FOUND:** time-to-first-value (seconds)
  and actions-per-screen *benchmark numbers* for the named competitors — *missing data point: corroborated/public
  seconds-to-value + taps-per-screen for MacroFactor/Carbon/Hevy onboarding* (un-sourceable beyond editorial
  pattern statements; ours is runtime/device-measured, not in code).

## NAVIGATION (NA)
- **BEST IN CLASS:** standard bottom-tab IA, ≤5 tabs, primary action (start/log) reachable in ~1–2 taps from
  the home tab; shallow stacks per tab; tab re-tap resets to the tab root (mobile-IA convention, all-three NA
  references / editorial UX-pattern). Card-expand "tap a card → it grows" transitions are the modern feel
  (Whoop/Apple Health, pattern statement).
- **WHERE WE LEAD:** clean 5-tab bottom nav within the ≤5 ceiling — **Train / Plans / Diary / Progress / You**
  (`RootNavigator.js:445-449`), each its own stack (`HomeStack:285`, `PlansStack:311`, `DiaryStack:217`,
  `ProgressStack:334`, `ProfileStack:364`); **tab re-tap pops the stack to root** on every tab
  (`:218-221,:286-289,:312-315,:335-338,:365-368`); **accessibility is wired into the chrome** — tab labels
  tokenised so they scale with larger-text (`:430-432`), bottom-inset padding for edge-to-edge OS chrome
  (`:415-427`), and a global **Reduce-Motion** override that disables stack animation live
  (`:212-215,:224`); **card-expand hero-zoom** transition matching the Whoop/Apple-Health pattern for
  ActiveWorkout/Summary (`:183-207,:295-296`). Pro-only destinations are guarded at every entry point so IA
  never dead-ends a free user into a paywalled screen by surprise (`withProGuard` `:149-162`).
- **WHERE WE LAG:** none on a corroborated capability bar — bottom-tab IA, ≤5 tabs, reset-on-retap, and
  modern transitions are all present. (Deep Settings nesting under You is a long stack `:373-407`, but that is
  the documented-acceptable place for depth, not a primary-flow lag.)
- **MISSING ENTIRELY:** none vs the corroborated bar.
- **VERIFICATION:** 5-tab bottom IA + reset-on-retap + accessibility chrome + hero-zoom LEAD = VERIFIED (ours
  read) / bar = mobile-IA convention (VERIFIED as a pattern, editorial). **NOT FOUND:** exact **taps-to-primary-
  action** benchmark for the named competitors — *missing data point: corroborated/public tap-count from app
  open to "start workout"/"log food" for Strong/Hevy/MacroFactor* (un-sourceable beyond the general 1–2-tap
  pattern; ours is a runtime/device count, not in code).

## DESIGN (DE)
- **BEST IN CLASS:** premium dark-first aesthetic with a consistent token system, WCAG-AA contrast, and
  data-as-hero numerals (Whoop/Apple Health/MacroFactor, editorial/UX-pattern, all-three DE references);
  accessibility table-stakes: dark/light, larger text, reduce motion, colour-blind-safe palette (platform
  HIG + WCAG 2.x — documented).
- **WHERE WE LEAD:** a **computed-contrast token system asserted in tests** — every ratio annotated and
  enforced in `theme.test.js` so the palette can't silently drift below its bar (`theme.js:67-70` AAA text,
  `:23` WCAG-1.4.11 borders, `:108` light table asserted); **astigmatism-aware near-black** (#0D0D0D not pure
  black, with the rationale `:9-11`); **full accessibility matrix** — dark + light + **system** theme
  (`:191-205`), higher-contrast tables both themes (`:151-164,:321-324`), **Okabe-Ito colour-blind-safe**
  palette (`:165-176,:291-296,:326-330`), **larger-text ×1.2** across every type token (`:333-345`), and
  **Reduce-Motion** collapsing motion durations (`:519`); **tabular-nums "numerals are the hero"** helper for
  every data value (`:420-429 num()`); a **semantic state-colour grammar** (onTrack/watch/act/neutral,
  COMP-027 `:457-472`) so coaching states are one learned vocabulary; Material-3 motion curves + spring
  (`:521-545`); a complete spacing/radius/type/lineHeight/letterSpacing/shadow scale (`:236-455`). This is a
  deeper, test-enforced accessibility + token foundation than the bar describes.
- **WHERE WE LAG:** none on a corroborated capability bar — dark/light, contrast, CVD, larger-text,
  reduce-motion, tokenised type and data numerals are all present and tested. (Light theme + darkened-amber
  ink await founder on-device brand sign-off `:107-108,:124` — a release gate, not a capability lag.)
- **MISSING ENTIRELY:** none vs the corroborated bar.
- **VERIFICATION:** contrast-tested tokens + CVD + larger-text + reduce-motion + tabular numerals + state-colour
  grammar LEAD = VERIFIED (ours read, ratios asserted in `theme.test.js`); bar = HIG/WCAG + editorial (VERIFIED
  as pattern). **NOT FOUND:** comparative **aesthetic/“premium-feel” ranking** against the named competitors —
  *missing data point: a sourced, objective design-quality score or side-by-side teardown for
  MacroFactor/Whoop/Hevy vs Volyume* (subjective; un-sourceable beyond editorial impression; not a code fact).

---
(Area remaining, reading our side in full first: newbie-experience.)

## CONSOLIDATED NOT-FOUND CELLS (for your per-cell targeted-teardown decision) — running list
1. **WS — taps-to-log a set + keyboard-completion behaviour** for Strong/Hevy (only Gemini-simulated + one reddit quote; no corroborated/public number).
2. **FL — seconds/taps to log one food** for best-in-class (Gemini 45–90s is single + simulated).
(extended as the remaining areas are executed.)
