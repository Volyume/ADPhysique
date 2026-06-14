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
  **Mid-workout UX is at/above the bar:** ±-steppers let you log without typing into a tiny box
  (`SetEntry.js:13-29,:48-90,:105-138`), the set steppers are 52×52 — above the 44px mid-workout target
  (`SetEntry.js:215-216`; `theme.js:431 hitSlop`) — directly answering the "tiny input box → sweaty-hand
  mistap" complaint (Gemini DE-complaint #1), and weight/reps render as bold tabular-nums
  (`SetEntry.js:227-235`; `theme.js:425-429 num()`).
- **WHERE WE LAG:** keyboard-completes-the-set — reps field "Done" dismisses then a separate Log tap
  (`SetEntry.js:126`) vs Strong's keyboard-complete. **Plate calculator is built but unwired** — logic
  (`algorithms.js:843-863 calculatePlates`, `PLATE_SETS:836`) + a `components/PlateCalculator.js` component
  exist, but no screen renders `<PlateCalculator>` (grep = 0 consumers) so it is unreachable mid-workout, vs
  Strong/Hevy's in-flow plate maths.
- **MISSING ENTIRELY:** reachable plate-calculator UI (component exists, not wired into the workout flow);
  otherwise none vs the corroborated capability bar (inline-prev, rest timer, set types, offline all present).
- **VERIFICATION:** inline-prev MATCH = VERIFIED (CG+CL); auto rest timer = VERIFIED (all-three; ours `:890`,`RestTimer:1585`); offline-first = VERIFIED (ours, local SQLite, 0 network in log path); in-log-prescription LEAD = VERIFIED(ours) / competitor "journals-with-timers" PARTIAL (AGGREGATOR sensai); mid-workout touch-targets ≥44px + tap-don't-type = VERIFIED (ours read) / bar corroborated (Gemini DE-KF1 + Claude DE-F1); plate-calc unwired = VERIFIED (component exists, 0 consumers). **NOT FOUND:** taps-to-log and keyboard-complete benchmark — *missing data point: corroborated/public taps-per-set + keyboard-completion behaviour for Strong/Hevy* (only Gemini-simulated + one reddit quote).

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
- **WHERE WE LAG:** micronutrient depth vs Cronometer; no weekday calorie-banking planner. **Structured
  reverse-diet has analogues only** — the goal set carries no reverse-diet (`NutritionTargetsScreen.js:80-87`
  GOALS = lean_gain/build/maintain/recomp/mild_cut/aggressive_cut); the nearest mechanisms are the
  return-to-maintenance diet-break + refeed + carb-cycle cards (`CoachOutputScreen.js:389-510`), not a graded
  multi-week reverse-diet protocol.
- **MISSING ENTIRELY:** vitamins/minerals/NRV tracking (schema = fibre/sodium/sugar only, `food/db.js:240`);
  structured reverse-diet mode (analogues exist per above; no dedicated graded protocol).
- **VERIFICATION:** flexibility/protein/transparency LEAD = VERIFIED (ours) + corroborated bar; micronutrient
  MISSING = VERIFIED; reverse-diet ABSENT-with-analogues = VERIFIED (`NutritionTargetsScreen.js:80-87` GOALS
  read; `CoachOutputScreen.js:389-510` analogue cards read) / bar = single-source (AC-9). No NOT FOUND cells.

## PLAN-GENERATION (PG)
- **BEST IN CLASS:** deterministic mesocycle periodisation with MEV/MRV landmarks + deloads + weak-point specialisation (RP/Juggernaut/Alpha, all-three PG-F2); inputs goals/equipment/level/frequency/1RM/injury (all-three); beginner-linear vs advanced-mesocycle (all-three); LLM plans distrusted as "slop" (all-three PG-F1); Boostcamp = named expert/community programmes, nSuns/GZCLP (ChatGPT PG-F2, Gemini).
- **WHERE WE LEAD:** multi-factor landmark individualisation — experience × recovery × nutrition-phase × age multipliers (`planEngine.js:69-118`), 7 split types (`:17-25`), weak-point day targeting (`:31-57`, `upper_lower_wp` split), goal/phase overlays (`applyGoalOverlay`), deterministic no-LLM (coverage, AC-5). Folding nutrition phase + age + recovery into training volume goes beyond RP/Alpha's experience-only landmarks.
- **WHERE WE LAG:** named expert/community programme breadth — bar is Boostcamp (nSuns/GZCLP, known coaches); ours is a Plan Library (`seedRoutines.js:33 LIBRARY_PLANS`); breadth/expert-branding not yet graded on our side.
- **MISSING ENTIRELY:** pre-commit plan **diff/preview** — `PlanUpdateScreen.js` rebuilds the plan in place
  (`:212` "Your plan rebuilds around it") with no before/after preview of what changes (U-B-7); otherwise none
  clear vs the corroborated bar (periodisation, deloads, weak-points, splits all present).
- **VERIFICATION:** landmark-periodisation LEAD = VERIFIED (ours read); LLM-distrust alignment = VERIFIED; plan-diff/preview ABSENT = VERIFIED (`PlanUpdateScreen.js` read — rebuild-in-place, no diff); Boostcamp-breadth = PARTIAL — *our-side measurable: count/branding of `seedRoutines.js` LIBRARY_PLANS (needs our parse); competitor bar AGGREGATOR.* No competitor NOT-FOUND.

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
- **WHERE WE LAG:** conditional branching is **PARTIAL, not complete** — the Pass-1 register marks "conditional
  check-in steps" PARTIAL with **fuller conditional-step branching the U-B-2 gap** (`pass1-section4-features.md:29-31`);
  the present branches (cycle/sore-muscles/cardio/calorie `:769-907`) cover the main cases but not the full
  adaptive branching tree a Carbon-style check-in implies. (Earlier graded as a clean LEAD — corrected.)
- **MISSING ENTIRELY:** fuller conditional-step branching (U-B-2); otherwise none vs the bar.
- **VERIFICATION:** short+conditional + fast-path = VERIFIED (ours) / bar corroborated (Claude+Gemini); auto-derivation LEAD = VERIFIED (ours) / bar PARTIAL (Gemini single, trainerize-sourced); menstrual MATCH = VERIFIED; conditional-branching depth = PARTIAL (register U-B-2, `pass1-section4-features.md:29-31`). No NOT-FOUND.

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
  (Whoop/Apple Health, pattern statement). **Glanceability is king (UX-quality bar, now graded):** high-density
  data/charts immediately on launch, NOT buried behind cards / AI-slop / sub-menus; single-screen summary
  without scrolling; speed + data density > aesthetic flair; primary logging action always accessible; don't
  bloat (JEFIT) or strip features (Fitbit) — Gemini NA-F1/F2/F3 + Claude NA-F1/F2 (gizmodo/reddit/
  androidauthority/9to5google/play).
- **WHERE WE LEAD:** clean 5-tab bottom nav within the ≤5 ceiling — **Train / Plans / Diary / Progress / You**
  (`RootNavigator.js:445-449`), each its own stack (`HomeStack:285`, `PlansStack:311`, `DiaryStack:217`,
  `ProgressStack:334`, `ProfileStack:364`); **tab re-tap pops the stack to root** on every tab
  (`:218-221,:286-289,:312-315,:335-338,:365-368`); **accessibility is wired into the chrome** — tab labels
  tokenised so they scale with larger-text (`:430-432`), bottom-inset padding for edge-to-edge OS chrome
  (`:415-427`), and a global **Reduce-Motion** override that disables stack animation live
  (`:212-215,:224`); **card-expand hero-zoom** transition matching the Whoop/Apple-Health pattern for
  ActiveWorkout/Summary (`:183-207,:295-296`). Pro-only destinations are guarded at every entry point so IA
  never dead-ends a free user into a paywalled screen by surprise (`withProGuard` `:149-162`). **On
  glanceability specifically:** Home is hero-first and protects the primary action — a one-banner-at-a-time
  priority stack explicitly "to keep the primary Start action prominent" (`HomeScreen.js:925-945`), a glanceable
  next-session hero with a meso chip (`:1163-1203`), a Today weight strip, and structure-first skeletons on cold
  load (`:1130-1137`) — the inverse of the MyFitnessPal/Google-Health "metrics buried behind cards/AI slop"
  anti-pattern (NA-F2/F3); coaching is deterministic one-line text, never paragraphs of generative "AI slop"
  (the exact NA-F1 complaint).
- **WHERE WE LAG:** **dashboard not user-rearrangeable** — Home is a fixed priority-ordered layout, not
  user-customisable tiles; the "unmovable tiles → can't personalise" wish (Gemini NA complaint #2) is
  single-source/US-skewed and aimed at apps that *bury* data (which ours doesn't), so minor — named, not
  buried. No **dense/compact** density toggle either (shared with DE). (Deep Settings nesting under You is a
  long stack `:373-407`, but that is the documented-acceptable place for depth, not a primary-flow lag.)
- **MISSING ENTIRELY:** dense/compact data-density mode; user-rearrangeable dashboard tiles (both single-source).
- **VERIFICATION:** 5-tab bottom IA + reset-on-retap + accessibility chrome + hero-zoom LEAD = VERIFIED (ours
  read) / bar = mobile-IA convention (VERIFIED as a pattern, editorial); **glanceability/hero-first/one-banner/
  no-AI-slop/always-accessible-action LEAD = VERIFIED** (ours read; bar corroborated Gemini NA-F2/F3 + Claude
  NA-F2); tile-personalisation + dense-mode gaps = PARTIAL (single-source Gemini). **NOT FOUND:** exact
  **taps-to-primary-action** benchmark for the named competitors — *missing data point: corroborated/public
  tap-count from app open to "start workout"/"log food" for Strong/Hevy/MacroFactor* (un-sourceable beyond the
  general 1–2-tap pattern; ours is a runtime/device count, not in code).

## DESIGN (DE)
- **BEST IN CLASS:** premium dark-first aesthetic with a consistent token system, WCAG-AA contrast, and
  data-as-hero numerals (Whoop/Apple Health/MacroFactor, editorial/UX-pattern, all-three DE references);
  accessibility table-stakes: dark/light, larger text, reduce motion, colour-blind-safe palette (platform
  HIG + WCAG 2.x — documented). **UX-quality bars (the dimension first dropped, now graded):** bold sans-serif
  data as the largest on-screen element for parsing speed; **44×44pt touch targets functionally mandatory
  mid-workout** (tiny input boxes cause sweaty-hand mistaps that wipe data — Gemini DE-KF1/complaint #1, Claude
  DE-F1, w3.org/siteimprove); deep dark + high contrast for harsh gym lighting; **celebratory animations must
  not slow logging / must be disable-able** (MFP confetti backlash, Gemini NA complaint #3); progressive
  disclosure + generous padding as the premium cue (Gemini DE-Q4, designrush).
- **WHERE WE LEAD:** a **computed-contrast token system asserted in tests** — every ratio annotated and
  enforced in `theme.test.js` so the palette can't silently drift below its bar (`theme.js:67-70` AAA text,
  `:23` WCAG-1.4.11 borders, `:108` light table asserted); **astigmatism-aware near-black** (#0D0D0D not pure
  black, with the rationale `:9-11`); **full accessibility matrix** — dark + light + **system** theme
  (`:191-205`), higher-contrast tables both themes (`:151-164,:321-324`), **Okabe-Ito colour-blind-safe**
  palette (`:165-176,:291-296,:326-330`), **larger-text ×1.2** across every type token (`:333-345`), and
  **Reduce-Motion** collapsing motion durations (`:519`); **tabular-nums "numerals are the hero"** helper for
  every data value (`:420-429 num()`); a **semantic state-colour grammar** (onTrack/watch/act/neutral,
  COMP-027 `:457-472`) so coaching states are one learned vocabulary; Material-3 motion curves + spring
  (`:521-545`); a complete spacing/radius/type/lineHeight/letterSpacing/shadow scale (`:236-455`).
  **On the UX-quality bars specifically:** mid-workout **touch targets exceed 44px** — set steppers 52×52
  (`SetEntry.js:215-216`) + global `hitSlop` 12 (`theme.js:431`), and the tap-don't-type ± stepper answers the
  sweaty-hand mistap complaint directly; **data-as-hero numerals** via `num()` tabular-nums (`theme.js:425-429`)
  with a big rest-timer countdown at `fontSize.xxxl` visible from a distance (`RestTimer.js:261`); **deep dark
  tuned for gym lighting** with AAA text asserted in tests (`theme.js:18,:67-70`); and **celebratory animation
  respects Reduce-Motion/wellbeing** — the PR confetti drops to a 2.2s quiet toast (`PRCelebration.js:33-52`,
  wired `App.js:833 subdued={calm||reduceMotion}`), answering the MFP "confetti slows logging / can't disable"
  complaint. Deeper, test-enforced accessibility + UX-token foundation than the bar describes.
- **WHERE WE LAG:** **no dense / compact data-density mode** — no `denseMode`/`compactMode` setting anywhere
  (grep = 0), so a user who wants the "everything at a glance, no scroll" density (Gemini NA-F3 single-screen
  dashboard) can't opt into it. Deliberate divergence (not a lag): #0D0D0D not pure #000 for OLED — the
  astigmatism-halation tradeoff (`theme.js:9-11`). (Light theme + darkened-amber ink await founder on-device
  brand sign-off `:107-108,:124` — a release gate, not a capability lag.)
- **MISSING ENTIRELY:** dense / compact data-density mode (ABSENT, grep = 0).
- **VERIFICATION:** contrast-tested tokens + CVD + larger-text + reduce-motion + tabular numerals + state-colour
  grammar LEAD = VERIFIED (ours read, ratios asserted in `theme.test.js`); **touch-target ≥44px + data-as-hero +
  gym-dark + disable-able animation LEAD = VERIFIED** (ours read; bars corroborated Gemini+Claude+w3.org);
  dense-mode MISSING = VERIFIED (grep = 0); bar = HIG/WCAG + editorial (VERIFIED as pattern). **NOT FOUND:**
  comparative **aesthetic/"premium-feel" ranking** against the named competitors — *missing data point: a
  sourced, objective design-quality score or side-by-side teardown for MacroFactor/Whoop/Hevy vs Volyume*
  (subjective; un-sourceable beyond editorial impression; **RESEARCH NEEDED — fresh UX/visual teardown**).

## NEWBIE-EXPERIENCE (NE)
- **BEST IN CLASS:** beginners need a **guided plan, not a blank builder** (all-three NE/PG-F1); **plain
  language over jargon** or they churn (all-three; ties to the paywall/jargon-before-value finding); **demo
  media to learn the movement** (HD video/looping animation, Gemini EL-F3, ChatGPT — the single most
  beginner-facing exercise feature); encouragement / non-shaming framing (all-three RE).
- **WHERE WE LEAD:** **guided beginner on-ramp installs a real plan** off 3 plain questions, lands the new
  free user on a ready-to-train Home, and frames the learning curve kindly — *"The first couple of weeks are
  for learning the movements. That counts as progress."* (`FreeStarterScreen.js:103-120,:190-219`), with a
  "Beginner friendly" badge (`:196-208`) and an always-visible skip (autonomy, `:248-256`); **the coach
  auto-selects the plain-language ‘supportive’ register for beginners/intermediates** without the user setting
  anything (`coachRegister.js:80-88 resolveRegister` — beginner/intermediate → supportive); **jargon is glossed
  inline** wherever it appears (InfoTooltip + GLOSSARY at est-1RM `SetEntry.js:97-101`, body-fat method/phase/
  division `ProOnboardingScreen.js:1078,:1202,:1216`); **per-exercise text form cues** for learning technique
  (`formTips.js FORM_TIPS`, e.g. bench/squat/deadlift `:3,:37`); experience-scaled engine starts beginners on
  conservative volume + simpler movements (`planEngine.js:69-73`; `EXPERIENCE_OPTIONS` "Less than 18 months").
- **WHERE WE LAG:** **no demo media for the movements a beginner is learning** — form cues are **text-only**
  (`formTips.js` is prose; exercises table has no video/image/animation column, `database.js:78-92`), on the
  wrong side of the HD-video/animation bar (Gemini EL-F3, ChatGPT; app-docs/store). This is the same gap as
  EL, but it bites beginners hardest (they most need to *see* the lift).
- **MISSING ENTIRELY:** exercise demonstration video/animation (register #2 ABSENT) — the top beginner-facing
  learning aid.
- **VERIFICATION:** guided-on-ramp + auto plain-language register + inline jargon gloss + text form cues +
  experience-scaled start LEAD = VERIFIED (ours read) / bar corroborated ALL-THREE; demo-media LAG/MISSING =
  VERIFIED (no media column; register ABSENT; bar app-docs/store VERIFIED). No competitor NOT-FOUND cell — the
  newbie capability bar is documented in editorial/app docs, not micro-timing.

---
(All 15 areas executed. Consolidated NOT-FOUND list below.)

## CONSOLIDATED NOT-FOUND CELLS (for your per-cell targeted-teardown decision) — FINAL (all 15 areas)

Every cell below is one I could NOT source to a credible bar. Each names the specific missing data point. They
share a single shape: they are all **micro-UX-timing / tap-count / subjective-ranking** measurements that need
either a hands-on competitor device-walk or an objective teardown — none is a capability or execution gap (those
were all gradeable and are graded above). The other ~90% of every area's quality bar (capability + execution
depth) was sourced and graded; this is the residual ~10%.

1. **WS — taps-to-log a set + keyboard-completion behaviour** for Strong/Hevy. *Missing: corroborated/public
   taps-per-set + keyboard-completion behaviour.* (Only Gemini-simulated + one reddit quote.)
2. **FL — seconds/taps to log one food** for best-in-class. *Missing: corroborated/public seconds-or-taps to log
   one food.* (Gemini 45–90s is single + simulated.)
3. **ON — time-to-first-value (seconds) + actions-per-screen benchmark** for MacroFactor/Carbon/Hevy onboarding.
   *Missing: sourced seconds-to-value + taps-per-screen.* (Un-sourceable beyond editorial pattern statements;
   ours is runtime/device-measured.)
4. **NA — taps-to-primary-action** (app open → "start workout"/"log food") for Strong/Hevy/MacroFactor.
   *Missing: corroborated/public tap-count to the primary action.* (Beyond the general 1–2-tap pattern.)
5. **DE — comparative aesthetic / "premium-feel" ranking** vs MacroFactor/Whoop/Hevy. *Missing: a sourced,
   objective design-quality score or side-by-side teardown.* (Subjective; un-sourceable beyond editorial.)

Note — these adjacent cells were NOT marked NOT FOUND but are flagged for your decision because they are
**our-side measurable** (a parse of our own code), not competitor gaps: PG plan-library breadth/branding
(`seedRoutines.js LIBRARY_PLANS`), EL exercise-library size (`seedExercises.js`). They need our parse, not a
competitor teardown.

## SECTION-4 MANDATED-REGISTER RECONCILIATION (all 19 → matrix status)

Built because the matrix was originally assembled per-area from the research and never reconciled against the
Pass-1 mandated register — the mechanism by which reverse-diet, plate-calc, plan-diff and dense-mode fell
through. Source: `pass1-section4-features.md`. Every mandated feature now has a matrix home or an explicit flag.

| # | Mandated feature | Pass-1 verdict | Matrix home / status |
|---|---|---|---|
| 1 | Progress photos | PARTIAL (table-only) | **PR — MISSING** ✓ |
| 2 | Exercise demonstrations | ABSENT | **EL + NE — MISSING** ✓ |
| 3 | Plate calculator | PARTIAL (built, unwired) | **WS — LAG/MISSING** ✓ (added this pass) |
| 4 | Velocity/tempo capture | ABSENT | **RESEARCH NEEDED** — no corroborated market bar (niche) |
| 5 | Mood correlation | ABSENT | **RESEARCH NEEDED** — no corroborated market bar |
| 6 | Readiness scoring | EXISTS | MF/CK — readiness path (LEAD-adjacent), no gap |
| 7 | Streak system | EXISTS | **RE — LEAD** ✓ |
| 8 | Accountability groups | EXISTS | **RE — LEAD** ✓ |
| 9 | Audio cues | EXISTS | WS — rest-timer sound (MATCH), no gap |
| 10 | RPE/RIR fields | EXISTS | WS — recorded internally (MATCH), no gap |
| 11 | History import/export | EXISTS | no area bar; EXISTS, no gap |
| 12 | Plan diff/preview | PARTIAL (no pre-commit diff, U-B-7) | **PG — MISSING** ✓ (added this pass) |
| 13 | Conditional check-in steps | PARTIAL (U-B-2) | **CK — LAG/MISSING** ✓ (corrected this pass) |
| 14 | Wellbeing correlation output | PARTIAL (mode yes, output surface unconfirmed) | **RESEARCH NEEDED** — is a correlation *output* a market bar? |
| 15 | Pain flag rotation | EXISTS | AC/EL — auto-swap on joint pattern (LEAD-adjacent), no gap |
| 16 | Cycle tracking | PARTIAL (flag/accounting yes, phase-tracking no) | CK — menstrual accounting MATCH; phase-tracking minor, flagged |
| 17 | Dense mode | ABSENT | **DE + NA — LAG/MISSING** ✓ (added this pass) |
| 18 | Manual barcode entry | EXISTS | FL — barcode (MATCH), no gap |
| 19 | VBT | ABSENT | **RESEARCH NEEDED** — no corroborated market bar (niche) |

**Completeness limit (stated honestly):** this reconciles the matrix against the **19 mandated features only**.
A guarantee that nothing else is missed needs the **Section-7 79-screen sweep** (`pass1-section4-features.md:46`
scopes itself to the mandated list) — NOT yet run against the matrix.

## RESEARCH NEEDED (where the existing substrate is too thin to grade — for your commission decision)

These are the points where the 3 reports do **not** give a credible bar, so grading would be fabrication:

1. **Whole UX/UI-quality dimension** — the prompt gathered UX as norm-checkboxes + micro-metrics, and ChatGPT
   returned **nothing** for DE/NA; the UX findings that exist are mostly single-source Gemini, US-skewed. A
   dedicated **UX/UI-quality research pass** (visual polish, information hierarchy, flow friction, screen-by-screen
   vs named competitors) is warranted — this is the "commission" already approved.
2. **DE — comparative aesthetic / "premium-feel" ranking** (NOT-FOUND #5): needs a fresh visual teardown.
3. **Micro-UX timing cells** (NOT-FOUND #1–4): WS taps-per-set, FL seconds-per-food, ON time-to-value +
   actions-per-screen, NA taps-to-primary-action — need a hands-on competitor device-walk.
4. **Niche ABSENT features with no corroborated market bar** — velocity/tempo capture, VBT, mood correlation,
   wellbeing-correlation output: the reports never established whether these are real market expectations, so I
   can't say if they're even gaps. Targeted research needed before grading.
5. **Coverage gaps in the substrate itself** — DE/NA leaned on one model (Gemini); a re-run with all three
   forced to answer DE/NA would corroborate or overturn the current single-source UX findings.
