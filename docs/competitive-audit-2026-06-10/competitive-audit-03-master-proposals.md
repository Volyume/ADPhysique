# Competitive Audit 2026-06-10 — Phase 4: Master Proposals

> Every gap from the Phase 3 matrix, consolidated and scored.
> IMPACT 1–10 (retention, conversion, differentiation, frequency of
> encounter, emotional weight) ÷ EFFORT 1–10 (complexity, risk,
> dependencies, new infrastructure) = PRIORITY SCORE.
> Tiers per the audit brief: Tier 1 score > 3.0 · Tier 2 impact ≥ 8 and
> effort ≥ 7 · Tier 3 quick wins (effort ≤ 3, impact ≥ 5; listed in
> Tier 1/4 where they also qualify) · Tier 4 longer term.
> The workout screen redesign is Tier 1 by mandate regardless of score.
>
> Hard constraints respected throughout: no LLM/AI in coaching; never
> gate an existing free feature behind Pro; never lower safety floors;
> offline-first; no PII to external services; British English voice.
> Items that touch locked decisions are flagged **[FOUNDER SIGN-OFF]**.

---

## TIER 1 — HIGHEST PRIORITY

---
ID: COMP-001 *(Tier 1 by mandate)*
AREA: Workout logging screen
TITLE: Session screen redesign — the beat line, the de-chipped card, 5→2 action row
CURRENT STATE: World-class input core (1-tap prefilled log, 52pt steppers, 56pt CTA) wrapped in a desk-designed context layer: up to five 11pt chips above the inputs, previous performance at 11pt italic (the smallest text on screen), four mechanisms for "use previous numbers", a 5-button always-visible action row including destructive Remove, ~29 simultaneous interactive elements, logged sets below the fold on ≤6.1" phones, 29pt set-type row.
PROPOSED CHANGE: Implement the six moves in `competitive-audit-01-workout-screen-proposal.md`: (1) two-line card header — "Set 2 of 3 · Working ›" at sm=13/600 (full-width 44pt set-type target) and "Last: 60 kg × 8 · Target 8–12 ↑" at md=16/600 tabular, non-italic, tap-to-apply; (2) delete repeat-last button, ghost chip and beat chip (prefill + beat line remain as the single mechanism); (3) action row 5→2 (Add set, Note) with Swap/Info/Pair/Time-crunch/Remove behind a 44×44 "⋯" on the exercise header; (4) logged sets move directly under the Log set button; remove the standalone target row, muscle line, ghost nav (fold into CTA state) and time-crunch row; (5) rest timer 5→3 controls (−15/+15/Skip at ≥44pt, card 96→64pt); (6) raise the interactive type floor xs=11→sm=13 across the session screen, no italics, no micro. Result: ~29→~19 interactive elements, two logged rows above the fold on 6.1", taps-to-log stays 1.
BEST REFERENCE: Hevy's set row — previous performance grey, plain, input-sized, tappable; ~12–14 interactive elements; −15/+15/Skip only.
USER EVIDENCE: "Extra options during a workout" is an explicit switching reason; Jefit punished by name for small input controls ("crowded and awkward… more steps"); previous performance is the first-listed decision criterion in Reddit meta-threads; nobody anywhere complains a logging screen shows too little context.
IMPACT SCORE: 10 — every user, every session, multiple times per session; the flagged screen.
EFFORT SCORE: 4 — one screen + two components, no schema/engine change; regression risk on the do-not-regress list is the main cost.
PRIORITY SCORE: 2.5 *(Tier 1 by mandate)*
IMPLEMENTATION NOTES: All changes inside ActiveWorkoutScreen.js, SetEntry.js, RestTimer.js using existing tokens. Keep: prefill logic, steppers, CTA, cluster flows, superset auto-jump, accessibility labels, crash recovery. Add compact rest-timer variant below 700pt usable height. Snapshot/mount tests exist for this screen; extend before refactor.
---

---
ID: COMP-002
AREA: Food logging UX
TITLE: Per-meal-slot memory with last-used portion pre-fill
CURRENT STATE: Search has Recents/Frequents tabs, but a food added to Breakfast yesterday is not surfaced as a one-tap, portion-remembered suggestion for Breakfast today.
PROPOSED CHANGE: Rank the food picker per meal slot by that slot's history and pre-fill the last-used portion for that food-slot pair; "Add again" rows at the top of each slot's picker. Fully deterministic.
BEST REFERENCE: MacroFactor — slot memory is its highest-leverage speed feature (10 actions per search-log vs MFP's 15).
USER EVIDENCE: 73% of food-logging quitters cite "too time-consuming" (IFIC 2023); >30s/item correlates with 43% lower 90-day retention (JMIR 2023).
IMPACT SCORE: 8 — daily-frequency friction cut on the Pro tier's anchor habit.
EFFORT SCORE: 2 — frequents infrastructure exists (`lib/food/frequents.js`); add slot dimension + portion memory.
PRIORITY SCORE: 4.0
IMPLEMENTATION NOTES: Extend food_frequents with meal_slot + last_quantity_g; rank in searchTabs.js; pre-fill ServingPicker.
---

---
ID: COMP-003
AREA: Food logging UX
TITLE: Quick-add calories/macros
CURRENT STATE: No way to log "roughly 600 kcal, 40g protein" without creating a custom food.
PROPOSED CHANGE: Quick-add entry in every meal slot's add sheet: kcal required, macros optional, named optionally ("Restaurant dinner"). Stored as a normal entry; flagged quick_add for insights honesty.
BEST REFERENCE: Present in every top-5 logger (MFP, Lose It!, MacroFactor, Cronometer, Yazio).
USER EVIDENCE: The "imperfect day" escape hatch — its absence is a stated reason diaries get abandoned on social/restaurant days.
IMPACT SCORE: 7 — protects the logging streak on exactly the days users quit.
EFFORT SCORE: 1 — one sheet + one write path through existing logFoodEntry.
PRIORITY SCORE: 7.0 *(also Tier 3 quick win)*
IMPLEMENTATION NOTES: QuickAddSheet.js already exists as a component shell — wire it into DiaryScreen's add flow.
---

---
ID: COMP-004
AREA: Nutrition coaching
TITLE: Always-visible trend & expenditure surface ("Your trend")
CURRENT STATE: EWMA trend, adaptive TDEE and goal-rate comparison are computed weekly and shown only inside CoachOutput; between coach days the user sees nothing working.
PROPOSED CHANGE: A persistent card (Diary top or Progress) showing trend weight vs goal band, current maintenance estimate, and one plain-English line ("Trending −0.4%/week, inside your target band — calories hold"). Updates daily from existing maths.
BEST REFERENCE: MacroFactor's daily-visible expenditure chart — its core trust engine ("we don't want our coaching algorithms to be an inscrutable black box").
USER EVIDENCE: The 2–3-week adjustment gating reads as unresponsive *only because the trend is invisible between coach days*; MacroFactor users cite the visible model as the reason they trust holds.
IMPACT SCORE: 9 — converts the engine's biggest perceived weakness (cadence) into its biggest visible strength (transparency); daily encounter.
EFFORT SCORE: 2.5 — presentation only; every number already computed in weeklyCoach/nutritionEngine.
PRIORITY SCORE: 3.6
IMPLEMENTATION NOTES: Reuse SvgLineChart + EWMA series from BodyMetrics; gate to Pro; respects ED-lockout state (hide rate when flag open — calmer mode already has precedent).
---

---
ID: COMP-005
AREA: Progress & analytics
TITLE: Free Monthly Recap + Block-end Recap (Year of Lifts cadence fix)
CURRENT STATE: The only recap (Year of Lifts) unlocks after 365 days; consistency is tracked but never celebrated.
PROPOSED CHANGE: A free monthly recap in the Year-of-Lifts story format (sessions, sets, tonnage, PRs, top muscle, month-vs-month) unlocked after ~10 logged workouts; a block-end recap when a mesocycle completes (no competitor can replicate — they don't have blocks). Both shareable via the existing ShareCard pipeline. Keep free forever.
BEST REFERENCE: Hevy's free Monthly Report; Strava's Year in Sport (the emotional ceiling); Boostcamp's weekly reports.
USER EVIDENCE: Strava paywalling Year in Sport triggered a category-famous backlash — proof recaps are the most-valued progress artefact; Hevy's report ships free after 10 workouts.
IMPACT SCORE: 9 — monthly emotional payoff + organic share loop + renewal-moment reinforcement (see COMP-016).
EFFORT SCORE: 2.5 — story renderer, share pipeline and all aggregates exist (YearOfLiftsScreen, ShareCardScreen, getYearOfLiftsData variants).
PRIORITY SCORE: 3.6
IMPLEMENTATION NOTES: Parameterise the YoL data builder by window; entry tile on Progress; one monthly local notification ("Your June recap is ready").
---

---
ID: COMP-006
AREA: AI/coaching trust
TITLE: Publish the methodology — "How Precision Coaching decides" + in-app receipts
CURRENT STATE: The engine's rules, citations (IOC RED-S, MATADOR, Morton) and safety logic live in code comments; users and prospects can't see them.
PROPOSED CHANGE: (a) A public methodology page (web) + in-app screen walking through the decision rules in plain English; (b) tap-to-expand "receipt" on coach cards citing the relevant rule ("Held because: 2-week cooldown — changes need two weeks to show in the trend"); (c) the line "Every change has a reason. Every non-change has a reason too." as the coaching identity statement on Welcome/paywall.
BEST REFERENCE: MacroFactor's published algorithm essays — the category's strongest trust asset; Fitbod's algorithm Q&A.
USER EVIDENCE: Opacity, not algorithm quality, is the documented retention killer ("users start treating the system like a randomizer").
IMPACT SCORE: 8 — trust/conversion lever that also feeds App Store listing copy and review responses.
EFFORT SCORE: 2 — content + one screen + tooltip wiring; engine already returns reasons.
PRIORITY SCORE: 4.0
IMPLEMENTATION NOTES: whyThisTemplates.js already holds locked copy; extend with per-rule receipts. Web page in /web. No new claims beyond what the code does (honesty test).
---

---
ID: COMP-007
AREA: Monetisation
TITLE: Paywall social proof + annual-first ordering
CURRENT STATE: PaywallScreen/ProUpgrade show feature bullets + tier strip; no testimonials/ratings; monthly is the default period.
PROPOSED CHANGE: Add a rotating verified-review strip (store reviews, with permission), present annual first with the savings badge, keep the single-decision layout. **Dependency:** collect real testimonials first (in-app review prompt exists via storeReview.js).
BEST REFERENCE: Flo and YAZIO ship paywall testimonials; OMENA's testimonial-led paywall doubled trial starts; H&F is the only annual-dominant category (60.6–68%).
USER EVIDENCE: Review-led paywall redesign lifted conversion >20% (RevenueCat case studies).
IMPACT SCORE: 8 — direct conversion lever at the decision moment.
EFFORT SCORE: 2 — copy/layout changes within two screens.
PRIORITY SCORE: 4.0
IMPLEMENTATION NOTES: Never fabricate quotes; use store-review excerpts verbatim with rating + first name/initial. A/B via the existing paywall telemetry events (migrate_032).
---

---
ID: COMP-008
AREA: Check-in / surveys
TITLE: Post-workout survey 7 → 3, readiness moved pre-session; Fast Check-In
CURRENT STATE: WorkoutSummary asks 7 subjective ratings (heaviest in the category; 3 duplicate weekly-check-in constructs); the weekly check-in has no fast path for consistently-green users.
PROPOSED CHANGE: (a) Post-workout asks only difficulty, pump, joint discomfort (the per-session signals the adaptive engine uniquely needs); energy/sleep/soreness-coming-in move to the existing pre-workout intent prompt (one tap each, optional); (b) weekly check-in gains a Fast Check-In: when every derived value is green, one confirmation screen replaces the 4 steps (override always available).
BEST REFERENCE: MacroFactor's 0–2-question check-in + one-tap Fast Check-In; JuggernautAI praised for front-loading readiness pre-session; TrainHeroic asks one post-session sRPE.
USER EVIDENCE: "A long survey leads to perfect data nobody logs; a short survey leads to really good data athletes consistently complete"; sports-science ceiling <5 items. Counter-evidence honoured: never cut the coach card's density (Whoop's diluted review = "huge disappointment") — this cuts ASK cost only.
IMPACT SCORE: 7 — completion-rate lever on the two data sources the whole engine feeds on.
EFFORT SCORE: 2 — UI re-arrangement; schema already stores all fields; engine inputs unchanged (nullable).
PRIORITY SCORE: 3.5
IMPLEMENTATION NOTES: Keep stored shape; the intent prompt (sharp/average/below-par) extends to three chips. Guard: weeklyCoach treats absent post-session fields exactly as today (already nullable).
---

---
ID: COMP-009
AREA: Reliability
TITLE: Pre-migration auto-snapshot + SSO duplicate-account merge guard
CURRENT STATE: 71 SQLite migrations run without a local snapshot; sign-in with a different provider can create a second account and read as "my data vanished" (Strong's #1 perceived-loss cause).
PROPOSED CHANGE: (a) Before any schema migration, copy the SQLite file to a rotating local snapshot (keep last 2) with a Settings restore surface; (b) on sign-in, if local data exists and the cloud account is empty-but-different, interpose a "merge or switch" step instead of silently proceeding.
BEST REFERENCE: FitNotes/Strong trust formula; MFP's update-wipe class as the failure to make impossible.
USER EVIDENCE: "MFP lost 6 years of my data" narrated publicly for years; Strong's own help centre admits duplicate accounts are its top "lost data" cause.
IMPACT SCORE: 7 — catastrophe insurance for the brand's core promise.
EFFORT SCORE: 2 — file copy hook in initDatabase + one auth-flow branch.
PRIORITY SCORE: 3.5
IMPLEMENTATION NOTES: Snapshot via expo-file-system copy before runMigrations; respects wipe-on-sign-out rules. The merge guard extends the existing cross-user wipe logic in RootNavigator (which already detects account changes).
---

---
ID: COMP-010
AREA: Plan generation / periodisation visibility
TITLE: Make the periodisation visible — week ramp + effort line everywhere
CURRENT STATE: Mesocycle week, RIR target and deload state exist (Home chip, in-session deload Rx) but the block's shape — ramp, where this week sits, what next week brings — is never drawn.
PROPOSED CHANGE: A small block-progress visual (week dots with effort labels) on the Home meso chip tap-through and PlanDetail: "Week 3 of 5 · stop 1 short of failure · next week: harder · recovery week in 2". Pure display of existing mesocycle data.
BEST REFERENCE: RP/Alpha's visible RIR ramp — the "periodisation is happening" signal users praise.
USER EVIDENCE: Perceived adaptivity earns the "elite" label; the ramp is how RP users *see* the system working.
IMPACT SCORE: 7 — converts existing invisible intelligence into perceived intelligence at zero engine risk.
EFFORT SCORE: 2 — one component reading mesocycle_weeks.
PRIORITY SCORE: 3.5
IMPLEMENTATION NOTES: BlockProgressCard exists; extend with effort labels from rirTarget; jargon-free wording per voice rules.
---

---
ID: COMP-011
AREA: Steps/cardio
TITLE: One-line energy-model explainer on cardio surfaces
CURRENT STATE: LogCardio shows a kcal estimate the coaching deliberately ignores; the one-time footnote exists but the persistent surfaces don't say why.
PROPOSED CHANGE: A single recurring line under the estimate: "Already counted: your calorie target tracks your weight trend, so cardio is never double-counted." Same line in NutritionEducation.
BEST REFERENCE: MacroFactor turned the identical stance into a trust asset through explanation.
USER EVIDENCE: MFP's add-back model is the largest documented confusion source in nutrition apps; silence invites the same confusion Volyume's architecture avoids.
IMPACT SCORE: 6 — small surface, but it guards the engine's credibility at the exact moment of doubt.
EFFORT SCORE: 1 — copy.
PRIORITY SCORE: 6.0 *(Tier 3 quick win)*
IMPLEMENTATION NOTES: LogCardioScreen + CardioPlanCard; voice rules apply.
---

---
ID: COMP-012
AREA: Reliability marketing
TITLE: Say the quiet part: offline-first, your data, no ads — on Welcome and the store listing
CURRENT STATE: Offline nutrition logging (a category outlier), export/backup and no-ads are real but buried in Settings.
PROPOSED CHANGE: One trust row on Welcome ("Works fully offline · Your data exports anytime · No ads, no trackers") and matching store-listing bullets.
BEST REFERENCE: Hevy markets "works fully offline"; FitNotes' decade-long reputation is built on visible data ownership.
USER EVIDENCE: Reliability leaders advertise verifiable proxies; users pick loggers on this basis in basement-gym threads.
IMPACT SCORE: 6 — conversion + positioning at zero product cost.
EFFORT SCORE: 1 — copy.
PRIORITY SCORE: 6.0 *(Tier 3 quick win)*
IMPLEMENTATION NOTES: WelcomeScreen bullet row; PLAY_STORE_LISTING.md / APP_STORE_CONNECT_LISTING.md updates.
---

---
ID: COMP-013
AREA: Onboarding
TITLE: "Building your plan" reveal moment + finishable first action
CURRENT STATE: Plan generation completes instantly with no staged moment; after the reveal, the first-run cue points at Start but the session itself is full-length.
PROPOSED CHANGE: (a) A 3–4s staged "Building your plan — balancing your week · setting your volume · fitting your sessions" sequence before the reveal (honest: it lists real engine stages); (b) after the reveal, offer a 15-minute "starter session" variant of Day 1 as the concrete first action.
BEST REFERENCE: Adapty A/B: personalisation + "customising your experience" loading screen = +17% paying conversions, +22% ARPU; Fitbod's finishable-first-workout activation metric.
USER EVIDENCE: Runna's reveal-with-coach-message is the category's trust peak; value must be *felt* before day-14.
IMPACT SCORE: 7 — trial-activation lever feeding directly into trial→paid.
EFFORT SCORE: 2 — animation + a trimmed-session variant via the existing time-crunch machinery.
PRIORITY SCORE: 3.5
IMPLEMENTATION NOTES: Stage labels must map to real generatePlan phases (honesty test). Starter session = applyTimeCrunch with a 15-min budget on Day 1.
---

---
ID: COMP-014
AREA: Exercise library
TITLE: Stage 0/1 exercise visuals — bundled photos now, licensed loops next
CURRENT STATE: Zero visual content across 449 exercises (only app in the cohort; below the free-app floor). Text tips for ~38%.
PROPOSED CHANGE: Stage 0: bundle public-domain photos (free-exercise-db) mapped to canonical IDs — every exercise gets a start/end frame pair in Info sheets and the picker. Stage 1: purchase a perpetual-licence GIF/loop dataset (~£100–500), bundle the top ~300 mapped loops offline, muted auto-loop in the Info sheet + small thumbnail affordance on the logging card (never autoplaying in the input area).
BEST REFERENCE: Fitbod's ignorable-but-present loop; MuscleWiki's 5-second format. Alpha Progression proves indie-budget feasibility.
USER EVIDENCE: Beginners choose apps for demos ("showing exactly what to use and how to do the moves is extremely helpful"); the winning format is a silent 5–10s loop, detail one tap away.
IMPACT SCORE: 9 — the largest absolute feature gap vs the field; affects novice conversion, swap confidence and App Store screenshots.
EFFORT SCORE: 4 — licensing + ID mapping + bundle-size management (offline-first) + UI slots; curation is the real cost.
PRIORITY SCORE: 2.25 *(Tier 1 by exception: it is the only below-category-floor finding in the audit; schedule directly after COMP-001)*
IMPLEMENTATION NOTES: Keep media local (no streaming — offline rule); lazy-load via expo-image; per-exercise media key on canonical ID; custom exercises accept a user photo later (Hevy parity). Avoid MuscleWiki API (streaming licence) and AI form check (no-AI/no-PII).
---

## TIER 2 — HIGH IMPACT, HIGHER EFFORT

---
ID: COMP-015
AREA: Plan generation / coaching
TITLE: Visible per-session, per-muscle autoregulation ("Today, adjusted for you")
CURRENT STATE: Post-workout feedback feeds an adaptive engine (adaptation events, computeAdaptiveDecision with per-muscle stimulus hooks), but next-session changes are not attributed visibly per muscle.
PROPOSED CHANGE: Deterministic per-muscle session adjustment with attribution: on session open, a single line per affected exercise — "Rear delts still sore Tuesday → one set fewer today" — driven by the existing soreness/pump/joint inputs and clamped by landmarks. The set targets already move; this makes the *why* visible and per-muscle.
BEST REFERENCE: RP Hypertrophy's per-muscle feedback loop; JuggernautAI's readiness-driven daily adjustments ("the engine feels alive").
USER EVIDENCE: The shared engine of the top three plan apps; "updates weights and reps based on ratings of workload and soreness" is the quoted reason RP feels elite.
IMPACT SCORE: 9 — the audit's clearest product-depth gap vs the best.
EFFORT SCORE: 7 — engine extension + per-muscle attribution plumbing + invariant tests + voice copy; high blast radius (deterministic guarantee must hold).
PRIORITY SCORE: 1.29
IMPLEMENTATION NOTES: Extend runAdaptiveEngine output into computeSetTargets' options; cap adjustments ±1 set/exercise; every adjustment carries a held-decision-style reason. No randomness. Founder review of coaching copy required.
---

---
ID: COMP-016
AREA: Food data
TITLE: Verified UK food layer (top SKUs + chains), badged and ranked first
CURRENT STATE: OFF crowdsourced snapshot + CoFID generics; no UK chain coverage (Greggs/Nando's/Costa/Pret); no verification badge or ranking boost.
PROPOSED CHANGE: A curated, hand-verified dataset of the top ~5–10k UK supermarket SKUs + major chains, shipped in the bundle, badged "Verified", ranked above raw OFF hits; quarterly refresh process.
BEST REFERENCE: Nutracheck — ~300k verified UK items is its entire moat (4.9 Trustpilot).
USER EVIDENCE: Inaccurate-data complaints jump to 24.1% among users past six months; trust failures kill diaries at month four.
IMPACT SCORE: 9 — long-term retention of the Pro anchor habit in the home market.
EFFORT SCORE: 7 — sustained data-ops programme more than engineering.
PRIORITY SCORE: 1.29
IMPLEMENTATION NOTES: Source field already exists on foods; add verified flag + rank boost in waterfall.js; start with the top 1k by logging frequency telemetry.
---

---
ID: COMP-017
AREA: Accountability
TITLE: Training Partner / Coach View (1:1, consented, derived-signals-only)
CURRENT STATE: No accountability surface.
PROPOSED CHANGE: Pair-by-code 1:1 link with a Whoop-Teams-style preview of exactly what is shared; shares ONLY derived adherence signals (sessions completed vs planned, weekly streak, trained-today tick) with a one-tap nudge; never weights, body data, nutrition, check-ins or location. Precursor shipping first: COMP-018's solo streak.
BEST REFERENCE: Whoop Teams' consent architecture; TrueCoach/Hevy Coach demand proof; Fitbit's friends-and-family challenges as the loyalty engine.
USER EVIDENCE: Kudos increase training frequency (peer-reviewed); the paid accountability-app niche sells exactly "see when friends hit the gym".
IMPACT SCORE: 8 — retention mechanic with a privacy positioning no incumbent can copy ("Nobody else sees anything").
EFFORT SCORE: 7 — new sync surface, invites, RLS, notifications, abuse/consent UX.
PRIORITY SCORE: 1.14
IMPLEMENTATION NOTES: **[FOUNDER SIGN-OFF]** (privacy posture change). EU-resident tables; share-set immutable at creation (Whoop pattern); GDPR data-sharing review. Never extend to feeds/leaderboards (see matrix Area 12 traps).
---

---
ID: COMP-018
AREA: Progress / engagement (pre-social precursor to COMP-017)
TITLE: Shame-free weekly consistency streak with pause and repair
CURRENT STATE: Consistency computed and charted; never celebrated; no streak.
PROPOSED CHANGE: A weekly streak (hit your *own* planned sessions Mon–Sun), rest-day aware, with deliberate pause ("life happens") and one-week repair. Surfaces on Progress and in the monthly recap. Never daily, never red.
BEST REFERENCE: Strava's weekly streak cadence; Gentler Streak's rest-positive ADA-winning model; watchOS 11 pause/repair.
USER EVIDENCE: Streaks bind hard ("2,180-day streak lost… kinda devastating") but need mercy mechanics; daily streaks conflict with the ED-safety posture, weekly adherence streaks don't.
IMPACT SCORE: 8 — habit retention; feeds recap and partner-view later.
EFFORT SCORE: 4 — local computation from existing session + plan data; careful copy.
PRIORITY SCORE: 2.0 *(listed in Tier 2 block for sequencing with COMP-017; score places it top of Tier 4 otherwise)*
IMPLEMENTATION NOTES: Anchor to planned days (plan knows them); pause is user-initiated, never punitive copy; wellbeing/ED flags suppress streak pressure entirely.
---

---
ID: COMP-019
AREA: Design / platform presence
TITLE: Interactive charts (Skia) + widgets + re-enabled Live Activity
CURRENT STATE: Static SVG charts; no home-screen widgets; iOS Live Activity module built but disabled after a label bug.
PROPOSED CHANGE: (a) Rebuild the three hero charts (weight trend, volume, e1RM) on Skia with window selection and recomputed takeaway (average + first-to-last delta per window — MacroFactor pattern; scrubbing second); (b) iOS/Android widgets: next session, weekly volume ring, streak; (c) fix and re-enable the rest-timer Live Activity with the corrected set indexing.
BEST REFERENCE: MacroFactor charts; Oura's "interactive exploratory views"; widgets as the "number one ask" for comparable apps.
USER EVIDENCE: Every design leader makes charts touchable; windowed comparison beats scrubbing in user value evidence.
IMPACT SCORE: 8 — the single biggest perceived-quality lever (Agent 10) + daily lock-screen presence.
EFFORT SCORE: 7 — Skia chart kit, widget targets (native), Live Activity QA across both platforms.
PRIORITY SCORE: 1.14
IMPLEMENTATION NOTES: Stage: windows+takeaway first (cheap, most value), scrub second, widgets third, Live Activity last (was disabled for a defect — fix the "Set N of M" bug noted in RestTimer.js comments). Reduce Motion: no scrub haptics.
---

---
ID: COMP-020
AREA: Watch / wearables
TITLE: Apple Watch (then Wear OS) set-logging companion
CURRENT STATE: No watch app; logging is phone-only.
PROPOSED CHANGE: Minimal watch companion: current exercise, target, previous, +log set, rest countdown with haptics. Mirrors the phone session; no standalone mode v1.
BEST REFERENCE: Hevy/Strong watch apps; "the integration question matters as much as the app itself" (200+-thread meta-analysis); MacroFactor shipped watchOS 2025.
USER EVIDENCE: Strong's watch crashes are its #1 complaint — reliability bar is high; presence is increasingly expected.
IMPACT SCORE: 8 — expectation-level feature for the logging proposition.
EFFORT SCORE: 8 — new platform target, sync protocol, battery/reliability QA.
PRIORITY SCORE: 1.0
IMPLEMENTATION NOTES: After COMP-001 ships (the phone screen is the spec); Expo config-plugin route (no eject — locked rule). V1 is a remote control for the live session, not independent.
---

## TIER 3 — QUICK WINS (effort ≤ 3, impact ≥ 5, not already in Tier 1)

---
ID: COMP-021
AREA: Workout screen / tools
TITLE: Wire in the plate calculator
CURRENT STATE: PlateCalculator.js exists, tested, unreachable from the session screen.
PROPOSED CHANGE: Barbell-category exercises get a small plate affordance from the weight row (in the "⋯"/long-press of the weight stepper post-COMP-001); reads barWeight from settings.
BEST REFERENCE: Strong/Liftin' plate calculators are repeatedly praised mid-workout utilities.
USER EVIDENCE: Plate-maths mistakes between sets are a recurring forum complaint.
IMPACT SCORE: 6 — high-frequency micro-utility for barbell users.
EFFORT SCORE: 1 — component exists; one entry point.
PRIORITY SCORE: 6.0
IMPLEMENTATION NOTES: Show only when equipment is barbell (metadata exists); respects COMP-001's de-cluttering (behind a tap, not on the surface).
---

---
ID: COMP-022
AREA: Food logging
TITLE: Chain the barcode-miss flow (scan → OCR → custom, one path)
CURRENT STATE: Barcode miss routes to AddCustomFood with the code; the label scanner exists separately.
PROPOSED CHANGE: On miss: one screen offering "Scan the label instead" (pre-armed ScanLabel with barcode attached) → AddCustomFood prefilled → saved food carries the barcode so the NEXT scan hits locally.
BEST REFERENCE: Cronometer's capture chain.
USER EVIDENCE: Barcode dead-ends are a stated abandonment trigger; the write-back makes every miss self-healing.
IMPACT SCORE: 6
EFFORT SCORE: 2 — all three screens exist; wiring + barcode persistence on custom foods (migration 023 already added barcode).
PRIORITY SCORE: 3.0
IMPLEMENTATION NOTES: Keep OFF write-back opt-in as is.
---

---
ID: COMP-023
AREA: Onboarding/conversion (relates to COMP-006)
TITLE: Trial day-3 "the coach saw you" moment
CURRENT STATE: Trial users may reach day 14 without ever seeing coaching act (first check-in needs 5+ days + 3 weigh-ins).
PROPOSED CHANGE: A day-3 trial notification + Home line driven by real data ("3 sessions logged. Your first coaching review unlocks Sunday — log morning weights to sharpen it"), making the countdown-to-value explicit.
BEST REFERENCE: Reverse-trial activation practice (RevenueCat guidance: surface the aha before the gate).
USER EVIDENCE: Free/trial users "never see the coach working" was Agent 4's conversion-side lag.
IMPACT SCORE: 6 — trial→paid activation.
EFFORT SCORE: 2 — one scheduled notification + Home line off existing counters.
PRIORITY SCORE: 3.0
IMPLEMENTATION NOTES: Quiet-hours + notification prefs respected; copy through voice rules.
---

## TIER 4 — LONGER TERM (ordered by score)

---
ID: COMP-024
AREA: Check-in
TITLE: Cycle-robust trend smoothing (automatic, no tracking)
CURRENT STATE: Opt-in cycle flag holds weight-based changes for a week.
PROPOSED CHANGE: Make the EWMA/trend maths robust to cyclical water-weight patterns without requiring the flag (longer memory + outlier damping on flagged-sex profiles), keeping the manual flag as an override.
BEST REFERENCE: MacroFactor V3's no-tracking cycle robustness.
IMPACT SCORE: 6 · EFFORT SCORE: 3 · PRIORITY SCORE: 2.0
IMPLEMENTATION NOTES: Pure-function change + fixture tests; founder review (touches coach maths).
---

---
ID: COMP-025
AREA: Monetisation
TITLE: Cancellation-reason capture + lapsed win-back
CURRENT STATE: Cancellations invisible; no win-back.
PROPOSED CHANGE: On downgrade detection, one-question reason sheet; a single win-back notification at +30 days with a recap of what their data did ("your trend is still being tracked").
BEST REFERENCE: Category annual reactivation is 5% — cheap upside; AllTrails' recovery playbook.
IMPACT SCORE: 5 · EFFORT SCORE: 3 · PRIORITY SCORE: 1.67
IMPLEMENTATION NOTES: cascade.js already detects lapse states (RTDN/webhooks).
---

---
ID: COMP-026
AREA: Steps/cardio
TITLE: Step-informed trend confidence (deterministic)
CURRENT STATE: Steps inform coach targets but not expenditure confidence.
PROPOSED CHANGE: Use step-trend deltas as a confidence accelerator on the adaptive-TDEE damping (never a kcal value) — MacroFactor v5.5.0's validated pattern, deterministic.
IMPACT SCORE: 6 · EFFORT SCORE: 4 · PRIORITY SCORE: 1.5
IMPLEMENTATION NOTES: Founder review (coach maths); ships behind the COMP-004 surface so the user sees the confidence change explained.
---

---
ID: COMP-027
AREA: Design
TITLE: Semantic state-colour vocabulary + "one big thing" Home hierarchy
CURRENT STATE: Amber identity without a learned 3-state grammar; Home's hero sits under three utility cards.
PROPOSED CHANGE: Define ahead/on-track/behind hues used identically across rings, bars, chips; collapse the morning-weight/steps/cardio cards into one compact daily strip so the session hero is the screen's first card.
BEST REFERENCE: Whoop's "learned once" three-colour system; Oura's one-big-thing rule.
IMPACT SCORE: 6 · EFFORT SCORE: 4 · PRIORITY SCORE: 1.5
IMPLEMENTATION NOTES: Colour-blind-safe variants required (palette machinery exists).
---

---
ID: COMP-028
AREA: Exercise library
TITLE: Custom-exercise user media + Stage 2 filming of the top 100
CURRENT STATE: Custom exercises are text-only; no first-party footage.
PROPOSED CHANGE: Let users attach a photo to custom exercises (local-only by default); film the top-100 logged exercises (~£2k–10k) for first-party loops replacing licensed ones over time.
BEST REFERENCE: Hevy custom-exercise media; Alpha Progression's indie filming budget.
IMPACT SCORE: 6 · EFFORT SCORE: 5 · PRIORITY SCORE: 1.2
---

---
ID: COMP-029
AREA: Design
TITLE: Token-derived light theme
CURRENT STATE: Dark-only; no roadmap answer to the (well-evidenced, slow-burn) light-mode demand.
PROPOSED CHANGE: Derive a light palette from the token system (Linear's LCH approach) behind the existing applyAccessibility machinery; ship as opt-in.
BEST REFERENCE: Whoop's light-mode community pressure; Strava's "most requested feature for years".
IMPACT SCORE: 6 · EFFORT SCORE: 6 · PRIORITY SCORE: 1.0
IMPLEMENTATION NOTES: **[FOUNDER SIGN-OFF]** (brand decision). The boot-time token swap pattern already supports palette substitution.
---

---
ID: COMP-030
AREA: Onboarding
TITLE: Quiz-before-account sequencing
CURRENT STATE: Account + Article 9 consent precede all value (the set's most aggressive front door).
PROPOSED CHANGE: Run profile/goal steps first (answers held locally), create the account at "save your plan", present Article 9 consent at first health-data collection. Evidence: soft walls lift DAU ~20%; first-screen sign-up drop is 38.4%.
BEST REFERENCE: Flo (same special-category data class) quizzes first; Duolingo's soft wall.
IMPACT SCORE: 9 · EFFORT SCORE: 6 · PRIORITY SCORE: 1.5
IMPLEMENTATION NOTES: **[FOUNDER SIGN-OFF + LEGAL]** — touches two locked decisions (IDENTITY_AND_OWNERSHIP no-anonymous-mode rule; Article 9 gate placement). Listed despite the locks because the evidence is the strongest single conversion finding in the audit; do not implement without explicit founder + DPO approval.
---

### Sequencing recommendation (90-day view)

1. **Sprint 1–2:** COMP-001 (workout screen) + quick wins COMP-003, COMP-011, COMP-012, COMP-021.
2. **Sprint 3–4:** COMP-004 (trend surface), COMP-005 (monthly recap), COMP-002 (slot memory), COMP-006 (methodology), COMP-007 (paywall proof), COMP-009 (reliability guards).
3. **Sprint 5–6:** COMP-008 (survey diet), COMP-010 (visible periodisation), COMP-013 (reveal moment), COMP-014 Stage 0/1 (exercise visuals), COMP-022/023.
4. **Quarter 2:** COMP-015 (visible autoregulation), COMP-019 (charts/widgets/Live Activity staged), COMP-018 (streak), then COMP-016/017/020 as capacity and founder decisions allow.
