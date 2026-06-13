# Volyume — Master Comparison (Ultimate Audit 2026-06-13, Phase 3)

Per-area reconciliation of Volyume-as-built (Phase 1, file:line-grounded) against the
market (Phase 2 research, 50+ apps/area). Produced by Opus 4.8 agents under
`phase3/_COMPARE-FORMAT.md`: every market claim carries its VERIFIED/PARTIAL/NOT-FOUND
status + source; no PARTIAL was upgraded; inference is labelled INTERPRETATION; gaps were
cross-checked against the navigation map before being called MISSING.

Reddit was blocked in this environment, so user-sentiment claims sourced to Reddit are
PARTIAL via secondary sources throughout — see each area's VERIFICATION STATUS.

---


<!-- ==== phase3/compare-01-workout-screen.md ==== -->

# Phase 3 master-comparison — Workout logging screen

Sources reconciled:
- VOLYUME CURRENT — `docs/ultimate-audit-2026-06-13/phase1/01-workout-session.md`
  (Active Workout / logging) and `…/phase1/02-workout-build-history.md`
  (build, routine-edit, history, summary, plan builders) — file:line-grounded.
- MARKET — `docs/ultimate-audit-2026-06-13/phase2/research-01-workout-screen.md`
  (50 apps; VERIFIED/PARTIAL/NOT-FOUND statuses + source URLs).

---

AREA: Workout logging screen (Active Workout, with adjacent build/edit/history/summary surfaces)

VOLYUME CURRENT: A live set-by-set logging screen (`ActiveWorkoutScreen.js`,
2625 lines). One exercise's set-entry card at a time: weight + reps steppers,
a single primary "Log set" button, an in-card rest timer, and a horizontal
exercise-navigator chip strip for multi-exercise sessions (phase1/01,
:27-68). Previous-session numbers render inline on the "beat line" directly
above the inputs — "Last: 40kg × 8 · Target 8–10 ↑" — and are tap-to-apply
(:1605-1672; :1633-1658). Best case the previous values are pre-filled and a
set logs in **1 tap**; accept-previous-then-log is **2 taps**; manual
stepper adjustment is **3+ taps** (phase1/01 §3, :306-313). Logged sets build
a "This workout" receipt above the action row (:1855-1867). The screen
supports straight/warm-up/drop/myo-reps/rest-pause/AMRAP set types,
supersets, per-side unilateral logging, cluster sets, e1RM display, and PR
detection (:128-135). It is a FREE feature, ungated (:79-85). Adjacent
surfaces: BuildWorkout (ad-hoc session), RoutineDetail (engine-ranked swaps +
reorder), WorkoutHistory (list/calendar + filters), WorkoutSummary
(animated stats, per-muscle volume, optional feedback), and the plan/meso
builders (phase1/02 throughout).

BEST IN CLASS: **Strong** — "the fastest way to log a workout", two taps per
set with the previous weight/reps pre-loaded and visible at the input on open;
the r/weightroom default, built on the assumption the user is mid-rest under
time pressure (VERIFIED). Source:
https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph
; https://repreturn.com/strong-app-vs-hevy/. **Hevy** — best previous-data UX:
holds and shows last rep+weight inline, tap to fill; a verbatim App Store
review cites this as the reason users improve: *"I love how it holds the last
rep and weight from the previous time I did the exercise so I can work towards
improving."* (VERIFIED). Source:
https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350?see-all=reviews
. **Setgraph / FitNotes / StrengthLog** — minimalism benchmark: "very minimal,
easy layout", "functional and clean", reviews literally say "Perfect!"
(VERIFIED). Source:
https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters.

TOP 50 RANGE: 50 apps researched, 35 with usable UX data (MARKET §1). The
spectrum runs from clean-and-fast loggers (Strong, Hevy, Setgraph, FitNotes,
StrengthLog — VERIFIED) through programmed-depth-but-unpolished tools
(RP Hypertrophy "lacks modern polish", 2.8 Trustpilot; Alpha Progression
"underwhelming interface"; JuggernautAI auto-regulation; Liftosaur scriptable —
all PARTIAL) to the cluttered cautionary case (JEFIT: "crowded interface…
overwhelming… abundance of features and information", changing an exercise
went from "one quick tap" to extra screens — VERIFIED). A separate cluster
(Nike Training Club, Freeletics, Apple Fitness+, Peloton) does not track
weight/reps strength progression at all (NTC VERIFIED; others PARTIAL/NOT-FOUND).
Sources: https://etechshout.com/jefit-app-review/ ;
https://dr-muscle.com/rp-hypertrophy-app-review/ ;
https://fitnessdrum.com/alpha-progression-app-review/ ; https://www.liftosaur.com/.

NEWBIE VERDICT: The core loop serves a beginner well: "Weight (kg)", "Reps",
a big amber "Log set" button and a first-set hint "Choose a weight and reps,
then tap Log set when done" make the primary action discoverable
(phase1/01 NEWBIE, :120-126). Crucially, the no-history state shows a confident
default target rather than a blank field ("First time · Target …", :1661-1670)
— which is exactly what the market says beginners need: "they want to be told
exactly what to do" rather than face a blank field (PARTIAL, F7.1,
https://www.boostcamp.app/blogs/most-popular-free-workout-routines-from-reddit).
But the surrounding vocabulary is dense for a first-timer — "Superset",
"myo-reps", "rest-pause", "AMRAP", "cluster", "deload/Recovery week",
"Est. max ≈" (phase1/01 :122-126) — and clutter is "disproportionately costly"
for newbies who cannot yet filter signal (PARTIAL, F1.2,
https://setgraph.app/ai-blog/best-workout-tracker-app-reddit).

ATHLETE VERDICT: Strongly served on depth. Volyume supports the full set-type
range, supersets, per-side logging, cluster sets, session targets with
beat-chip progression, e1RM and PR detection (phase1/01 ATHLETE, :128-135),
plus periodisation tracking, per-muscle volume vs landmarks and 4-week trend
on the summary (phase1/02 :452-454). This is depth the polished market leaders
lack — "neither [Strong nor Hevy] provides… weekly sets per muscle group,
progressive overload tracking across mesocycles" (PARTIAL, F4.1,
https://repreturn.com/strong-app-vs-hevy/). Gaps a competitor may feel:
RPE is hard-disabled (`rpe:null`) and RIR is no longer asked per set, removing
autoregulation granularity; no plate-maths/bar-loading helper (the `plateBtn`
style exists but is unused) (phase1/01 :132-135). Note the market shows
autoregulation depth lives in JuggernautAI/Liftosaur, which trade UI polish for
it (PARTIAL, F7.2).

WHERE WE LEAD:
- **Previous data + one-tap apply at the input** — the beat line shows
  "Last: …" inline and applies on tap (phase1/01 :1633-1658). This matches the
  Strong/Hevy best-in-class pattern exactly (VERIFIED, F3.1,
  https://repreturn.com/strong-app-vs-hevy/ ; Hevy App Store).
- **Tap count meets/beats the benchmark** — 1 tap best case, 2 typical, vs
  Strong's two-tap benchmark; we stay within the "3 steps maximum" guidance
  (phase1/01 §3; VERIFIED, F6.1 + F8.1,
  https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph
  ; https://stormotion.io/blog/fitness-app-ux/).
- **Large, thumb-friendly primary controls** — 52×52 weight/reps steppers and
  a filled `paddingVertical:16` "Log set" button (phase1/01 :91-92, :149).
  This is the one-handed/sweaty-hand pattern the market demands: "large,
  easy-to-tap elements", no tiny swipes (PARTIAL/VERIFIED, F5.1 + F8.1,
  https://stormotion.io/blog/fitness-app-ux/ ;
  https://developer.apple.com/forums/thread/678265).
- **Programmed depth behind the log** — set types, supersets, clusters,
  per-muscle volume and mesocycle tracking exist without crowding the default
  single-exercise surface (phase1/01 :128-135, :167-171). Market says nobody
  pairs programmed overload depth with a clean logging screen (PARTIAL, F4.2,
  https://www.liftosaur.com/).
- **No social-feed / streak clutter on the logging screen** — none present in
  the inventory (phase1/01 §WHAT IS ON IT). Serious lifters call such features
  "bloat" (PARTIAL, F1.3,
  https://setgraph.app/ai-blog/best-workout-tracker-app-reddit).

WHERE WE LAG:
- **Banner stacking pushes inputs/previous-data below the fold** — starter,
  superset, next-time notes, deload, target line, rest timer and
  target-reached banners can all sit between header and set-entry card, so the
  beat line and inputs can require scrolling (phase1/01 :108-110, :315-327).
  Best-in-class keeps previous data always visible at the input, not behind
  scroll/tap (VERIFIED, F1.1 + F3.1,
  https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters).
- **Dense, small-text card-header zone** — the three header lines (orientation,
  beat, coach) are `sm (13px)` label-grey, crowded directly above the inputs —
  the densest, smallest-text zone sits exactly where the eye must land
  (phase1/01 :112-114). The market's only citable type anchor is "body ≥16–17pt,
  never below 16px" (VERIFIED platform standard, F2.2,
  https://fontfyi.com/blog/mobile-typography-accessibility/). NB: no app
  discloses its own in-app font sizes (NOT FOUND, F2.1) — this lag is measured
  against the platform standard, not a competitor value.
- **Sub-44px edge/strip controls for fatigued hands** — header "X" (≈38px),
  "Finish" (≈37px), "Swap" (<44px), beat-line tap (≈27px) and short text inputs
  (≈36px tall) are all below the 44pt standard, several at the screen edges
  (phase1/01 §VISUAL touch-targets, §7). Market standard is WCAG 44×44 / iOS
  44pt (VERIFIED, F2.3, https://fontfyi.com/blog/mobile-typography-accessibility/)
  and explicitly warns against tiny targets for numb/sweaty hands (PARTIAL,
  F5.1, https://developer.apple.com/forums/thread/678265).
- **Source-level bloat** — the file is 2625 lines with eight in-file modals
  (phase1/01 :102-106). Not directly the visible surface, but the market's
  dividing line between loved and tolerated is clutter (VERIFIED, F1.2,
  https://etechshout.com/jefit-app-review/).

MISSING ENTIRELY:
- **Plate-maths / bar-loading helper** — present in market (Caliber, Gravitus
  cite plate calc; PARTIAL, MARKET §1 #10/#16); a `plateBtn` style exists in
  Volyume but is unused in render (phase1/01 :135).
- **Per-set RPE/RIR autoregulation input** — RPE hard-disabled, RIR no longer
  asked (phase1/01 :132-134); market positions auto-regulation as a core
  athlete draw (PARTIAL, F7.2, https://dr-muscle.com/juggernaut-workout-app-review/).
- **Explicit programmed on-screen overload prescription at point-of-log** —
  the market leaders also lack this (the overload mechanic is the visible
  previous number, not a prescription), so it is a gap nobody fills rather than
  a place we trail (PARTIAL, F4.1, https://repreturn.com/strong-app-vs-hevy/).

USER SENTIMENT: Users describe a "perfect" logging screen by what is ABSENT,
not present — "bare bones and serious", "simple", "intuitive", "no fluff",
"effortless", and the tell "can't even think of a suggestion to improve it";
praise centres on SPEED and the absence of friction, not richness (VERIFIED
App Store quotes + Reddit-via-aggregator, MARKET §3,
https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 ;
https://www.corahealth.app/blog/best-workout-tracker-reddit). The single most
frequent complaint across all trackers is "too many taps to log a set"
(PARTIAL, F6.1, https://www.corahealth.app/blog/best-workout-tracker-reddit).
The genuine unmet want across the market: nobody pairs explicit programmed
overload targets with a genuinely clean logging screen (PARTIAL, F4.2,
https://www.liftosaur.com/) — the gap Volyume's depth-behind-a-clean-log model
is positioned to close.

VERIFICATION STATUS: Not all-VERIFIED. VERIFIED items this block leans on:
Strong two-tap log + previous-data pattern (F6.1 Strong-side, F3.1), Hevy
previous-data App Store quote (F3.1), JEFIT clutter (F1.2), always-visible
previous data (F1.1), platform type/touch standards (F2.2, F2.3), retention/
3-step/60-second figures (F8.1), App Store sentiment quotes (§3).
PARTIAL-dependent claims: progressive-overload / mesocycle gap in Strong-Hevy
(F4.1); programmed-depth-vs-polish trade-off (F4.2); newbie "tell me what to do"
and athlete autoregulation-depth segmentation (F7.1, F7.2); one-handed /
sweaty-hand pain points (F5.1); social/streak "bloat" sentiment (F1.3); Reddit
"too many taps" complaint (F6.1 Reddit-side); plate-calc presence in
Caliber/Gravitus (§1). NOT-FOUND items honoured (not filled): no app discloses
its exact in-app font sizes (F2.1 — Volyume's type lag is stated against the
platform standard only); and no controlled study isolates clean-logging→
retention for a strength app (F8.1 caveat — treated as directional, labelled
INTERPRETATION at source).


<!-- ==== phase3/compare-02-plan-generation.md ==== -->

# Phase 3 comparison — Training plan generation & intelligence (2026-06-13)

Sources reconciled:
- VOLYUME CURRENT — `docs/ultimate-audit-2026-06-13/phase1/06-plans.md` (file:line-grounded).
- MARKET — `docs/ultimate-audit-2026-06-13/phase2/research-02-plan-generation.md` (status-carrying, sourced).

---

AREA: Training plan generation & intelligence

VOLYUME CURRENT:
Volyume generates and rebuilds plans through a deterministic engine (no LLM, no AI), surfaced across six screens. A first-run quiz produces a deterministic, locally-derived plan preview (`buildPlanPreview(quiz)`) showing split name, structure, and an optional phase line, with no calories/macros pre-account (PlanPreviewScreen.js:12-17,25-46). Pro users rebuild the plan via two wizards that drive the same deterministic generator (`generateAndSavePlan`): PlanUpdate (training-only — category, weak points, experience, days/week, session length, equipment, recovery; explicitly leaves nutrition untouched) (PlanUpdateScreen.js:83-140,156-251) and ProGoalSetup (the You-tab counterpart that also recalculates nutrition targets and routes to a change summary) (ProGoalSetupScreen.js:128-324). Plan discovery for free users runs through the Plan Library: search + collection chips + an 8-division bodybuilding grid + a 2-question recommendation quiz scored by a tag-weight heuristic (PlanLibraryScreen.js:19-76,82-142). Each generated active plan carries a "Why this plan, for you" rationale, bulleted in a fixed order (schedule, goal, experience, progression, equipment, recovery, nutrition, weakPoints) (PlanDetailScreen.js:27,317-332). Experience level, days, session length, equipment and recovery are the explicit personalisation levers (PlanUpdateScreen.js:198-251). A block-advisor banner surfaces deload/recovery/restart coaching signals on the Plans hub (PlansScreen.js:401-505). Free users may edit/duplicate/archive their own plans; Pro users rebuild via the wizards (PlanDetailScreen.js:334-354; PlanUpdateScreen.js).

BEST IN CLASS:
- Explaining the "why" + level-scaling (algorithmic): Fitbod — recovery-score-driven generation, a self-declared experience level that visibly changes exercise complexity and rep ranges, conservative beginner defaults, raise-anytime, and (per third-party analysis) the clearest effort to explain the machinery to build trust and retention. Status: PARTIAL (third-party "explains the why" claim VERIFIED; in-app copy NOT independently confirmed). https://fitbod.me/blog/what-fitness-app-is-best-for-you-how-fitbod-adapts-to-any-fitness-level-goal-or-gym-setup/ ; https://www.jefit.com/wp/guide/best-ai-workout-planner-apps-of-2026-top-picks-reviews-and-how-to-choose-the-right-one/
- Trust via author credibility + proven programs: Boostcamp — hosts 5/3/1, GZCLP, nSuns, PPL free, borrowing the named creators' verifiable track record. Status: VERIFIED. https://www.boostcamp.app/blogs/most-popular-free-workout-routines-from-reddit
- Beginner confidence via dead-simple structure + progression: StrongLifts 5x5 — "removes all confusion… plans every exercise, set, and weight," dead-simple +2.5kg linear progression. Status: VERIFIED. https://stronglifts.com/stronglifts-5x5/workout-program/
- Perceived personalisation (human): Caliber / Trainwell / Future — a real coach writes/adapts the plan to injuries, schedule, even ED history. Status: VERIFIED. https://www.garagegymreviews.com/caliber-app-review
- Plan-reveal onboarding: quiz → felt-understood tailored plan (Zing Coach, Planfit) + instant data-mirror (Strava), reveal kept un-paywalled. Status: VERIFIED. https://tracker.my.com/blog/personalized-app-onboarding-successful-apps-case-study?lang=en

TOP 50 RANGE:
Across the 52 apps researched (~25 VERIFIED-detail, ~27 PARTIAL store-listing AI clones), quality spans: (top) genuinely adaptive per-session AI — Fitbod, Freeletics, JuggernautAI, Dr. Muscle, Alpha Progression — that re-programme from history/fatigue/recovery (Findings 1.1-1.3, 5.x); (top, human) Future/Caliber/Trainwell, the highest "personalised" sentiment because a person writes the plan (1.4); (middle) proven-program libraries + custom builders — Boostcamp, Hevy (AI generation added Feb 2026), Liftosaur, MacroFactor — trust via author credibility and editability (1.5, 6.3, 7.1); (lower-middle) structured but minimally personalised content — Sweat, Centr, Aaptiv, Peloton, Ladder — pre-set programs with little per-user adaptation (table); (bottom) the long PARTIAL tail of near-identical "AI workout" clones with thin independent data, and Nike Training Club as the explicit failure mode of no personalisation at all ("rewards experienced, confounds beginners") (3.3). No single algorithmic app is reported to cover gym-newbie → IFBB cleanly; apps pick an end of the spectrum and the elite end leans on a human coach (INTERPRETATION in 3.2, VERIFIED component claims).

NEWBIE VERDICT:
Volyume serves a free beginner well on the on-ramp: the Plan Library quiz ("Not sure where to start?") and plain-language collection chips are a friendly guided reveal (06-plans.md NEWBIE QUESTION on PlanLibrary; PlanLibraryScreen.js:82-142), and the pre-account PlanPreview gives a concrete, reassuring plan shape ("No card. Nothing charged unless you choose.") — this matches the praised quiz→tailored-plan reveal arc (8.2 VERIFIED) and achievability framing (8.3 VERIFIED). However, the generated plan exposes a "Why this plan" rationale and per-plan stats that "assume some training literacy" — a beginner may not know what a set target implies (06-plans.md PlanDetail NEWBIE QUESTION). Crucially, the four things newbies say bare plans must include are not evidenced in the Plans-domain inventory: per-exercise form guidance / video demos (4.1 VERIFIED), warm-up / cool-down / injury-prevention guidance (4.2 VERIFIED), and the dead-simple "exactly what to do" set/rep/weight + simple progression clarity (4.3 VERIFIED) — the Plan Detail surfaces a workout list and an approximate "Est. sets/week", not exercise-level coaching cues.

ATHLETE VERDICT:
Volyume serves an experienced competitor strongly on control and division-specificity: ProGoalSetup is a genuine "competitor control centre" — division/weak-point biasing, training phase including cut/deficit, protein approach up to "advanced", full training setup, and a transparent before/after change summary (06-plans.md ProGoalSetup ATHLETE QUESTION; ProGoalSetupScreen.js:128-324). The division-specific Library collections directly target competitors (06-plans.md PlanLibrary ATHLETE QUESTION). This addresses the elite-spectrum gap the market leaves open (3.2). Gaps for the athlete: no preview/diff of the rebuilt plan before committing — the result only appears as a toast then goBack (06-plans.md PlanUpdate/ProGoalSetup WEAKNESSES) — and per-plan volume is only an approximate "~N Est. sets/week" heuristic (exerciseCount × 3) with no per-muscle breakdown; set/rep schemes require drilling into RoutineDetail (06-plans.md PlanDetail ATHLETE QUESTION, WEAKNESSES). Market athletes specifically want the executor not the re-programmer, plus an override/lock (5.3 VERIFIED) — Volyume's deterministic rebuild respects the user's answers rather than auto-substituting, which fits this preference.

WHERE WE LEAD:
- Single deterministic engine spanning newbie → IFBB-division competitor in one product. Market research found no single algorithmic app covers this spectrum cleanly; apps pick an end and the elite end hands off to a human (Finding 3.2, INTERPRETATION labelled, VERIFIED component claims). Volyume's division-aware Library + ProGoalSetup competitor controls cover the elite end algorithmically (PlanLibraryScreen.js:32-76; ProGoalSetupScreen.js:339-493).
- A built-in, always-present "Why this plan, for you" rationale on every active generated plan (PlanDetailScreen.js:317-332). Visible reasoning is a research-backed trust + retention driver (Finding 7.2 / 2.1, PARTIAL — third-party claim VERIFIED, in-app exemplar copy NOT independently confirmed). Volyume's rationale sits at the "medium altitude" the academic finding recommends rather than full internals (Finding 9.3 VERIFIED).
- Deterministic, no-LLM generation aligns with the academic warning that a single visible "wrong-looking" prescription disproportionately damages trust (algorithm aversion, Finding 9.1 VERIFIED) and that too-high transparency can backfire (9.3 VERIFIED) — Volyume's reproducible engine + medium-altitude rationale fits this.
- Un-paywalled, pre-account plan reveal (PlanPreview) with endowment framing (PlanPreviewScreen.js:25-46) directly matches the praised reveal pattern and the explicit counter-praise that the reveal must NOT be immediately paywalled (Zing soft-paywall complaint) (Finding 8.2 VERIFIED).

WHERE WE LAG:
- No per-exercise form guidance / video demos evidenced in the Plans inventory — the #1 thing newbies say bare plans miss (Finding 4.1 VERIFIED).
- No warm-up / cool-down / injury-prevention guidance evidenced at plan level (Finding 4.2 VERIFIED).
- No plan preview/diff before a Pro rebuild commits — best-in-class apps make the reveal a felt-understood moment, and editability/visibility before commit underpins trust (Findings 8.1-8.3 VERIFIED; override/edit trust 7.4 VERIFIED). Volyume only shows a post-hoc toast + goBack on PlanUpdate (06-plans.md PlanUpdate WEAKNESSES).
- Per-plan volume shown only as an approximate "~N Est. sets/week" (exerciseCount × 3), no per-muscle breakdown — athletes want individualised volume detail (Finding 5.1 VERIFIED on individualised quality; PlanDetailScreen.js:180-183).
- Library recommendation quiz uses a simple tag-weight heuristic returning a single "best" with little explanation (PlanLibraryScreen.js:122-142) — weaker than the felt-understood quiz→reveal payoff praised for Zing/Planfit (8.2 VERIFIED).

MISSING ENTIRELY:
- Per-session adaptive re-generation from logged performance / fatigue / recovery (Fitbod, Freeletics, Dr. Muscle, Hevy Trainer 2) — Findings 1.1, 1.2, 5.x (VERIFIED). Volyume rebuilds on explicit user request via the wizards, not automatically per session. (Note: any auto/AI adaptation is constrained by Volyume's deterministic no-LLM coaching boundary — flagged here as a market gap, not a recommendation to cross that boundary.)
- Embedded proven-named-program library (5/3/1, GZCLP, nSuns, PPL) that borrows creator credibility (Boostcamp, Finding 6.3 / 7.1 VERIFIED) — Volyume ships its own library, not the named community programs.
- Real-time recovery/readiness judgement from sleep/subjective state ("I feel off today") (Finding 5.2 VERIFIED) — though no app is reported to do this well, and it is human-coach territory.
- Explicit equipment-realism guard at exercise prescription is not evidenced in the Plans inventory; equipment is an input lever (PlanUpdateScreen.js:230-239) but no anti-impossible-kit check surfaced — the JuggernautAI failure mode (Finding 5.4 VERIFIED-claim / PARTIAL-verbatim).

USER SENTIMENT (what users want that no app provides):
- A single engine that genuinely spans gym-newbie → IFBB competitor: the research explicitly states no algorithmic app covers this cleanly and the elite end defers to humans (Finding 3.2, INTERPRETATION labelled, VERIFIED components).
- Real adaptation / readiness sense: athletes' standout complaint is AI "can't read between the lines when you say 'I feel off today'" and "AI = input, output, done. Coaching = collaboration" (Findings 5.1, 5.2 VERIFIED) — no app satisfies this without a human.
- A plan that "fits my life, not the other way around" — achievability framing users praise but find rare (Finding 8.3 VERIFIED).
- NOT-FOUND gaps the fragment honestly flags: no named IFBB Pro competitor on record criticising AI contest-prep plans (Q5 elite verbatim gap), and no verifiable r/xxfitness primary-source on whether Sweat/BBG feels personalised vs generic (Q1 women's-lens gap). These are not filled.

VERIFICATION STATUS: Not all-VERIFIED. This block leans on the following PARTIAL / NOT-FOUND items, carried at their original status:
- PARTIAL: Fitbod "explains the why" exemplar — third-party claim VERIFIED, in-app copy NOT independently confirmed (Findings 2.1 / 7.2). Used in BEST IN CLASS and WHERE WE LEAD.
- PARTIAL (verbatim): JuggernautAI equipment-realism failure mode — claim VERIFIED, verbatim rests on a blocked-Reddit snippet (Finding 5.4). Used in MISSING ENTIRELY.
- INTERPRETATION (labelled, VERIFIED component claims): "no single algorithmic app covers newbie → IFBB cleanly" (Finding 3.2). Used in WHERE WE LEAD, TOP 50 RANGE, USER SENTIMENT.
- NOT FOUND (reflected, not filled): no named IFBB Pro AI-plan criticism; no r/xxfitness Sweat/BBG personalisation primary source (Section 6). Reflected in USER SENTIMENT.
- METHOD DEGRADATION carried from source: WebFetch blocked for reddit.com / libredd.it / informs.org, so Reddit-primary findings (JuggernautAI verbatim, RP App, beginner-wish threads) rest on snippets + third-party quoting (research fragment lines 13-19, 455-460).


<!-- ==== phase3/compare-03-coaching.md ==== -->

# Phase 3 comparison — Coaching / personalised decisions (2026-06-13)

Sources reconciled:
- VOLYUME CURRENT: `docs/ultimate-audit-2026-06-13/phase1/04-coaching.md`
- MARKET: `docs/ultimate-audit-2026-06-13/phase2/research-03-ai-coaching.md`

Framing note (carried from the research fragment): **Volyume is deterministic — no LLM, no AI.** This block treats that as a trust asset, not a limitation, exactly as the research INTERPRETATION states (research §5, line 227). Nothing below proposes introducing AI.

---

AREA: Coaching / personalised decisions

VOLYUME CURRENT:
Volyume runs a deterministic weekly Precision Coaching engine (no LLM) surfaced across five screens.
- CoachOutputScreen ("Your week", Pro): runs runWeeklyCoach (04-coaching.md:14, CoachOutputScreen.js:1208) and renders a confirm-then-apply weekly review — headline, trend chips, what's working / what was off, training-volume signal (−2..+3 sets/muscle), nutrition (calories/steps/cardio), macro-cycle and refeed cards, a "Why this week" block, focus cue, RED-S/FFM safety floors, rapid-loss and diet-break (MATADOR-cited) cards, and a held-decisions audit (04-coaching.md:14-40). Every engine suggestion is a *suggestion* with an explicit Apply button and an "Applied" chip — never auto-written (04-coaching.md:42, CoachOutputScreen.js:1341-1345).
- CoachReviewScreen ("Weekly review", Free): local/offline training-only review — per-muscle volume status, progression wins, deload and lagging-muscle signals, up to three plain-English recommendations; no nutrition, does NOT run the Pro engine (04-coaching.md:95).
- CoachHeldHistoryScreen ("Coaching history", effectively Pro-reached): chronological log of every coach decision and non-decision, plus an embedded EngineLog of recent adaptations — the transparency audit trail (04-coaching.md:139, 151).
- MethodologyScreen ("How Precision Coaching works", ungated trust page): states the engine's rules up front — two-week cooldown, steps only sharpen confidence, volume range, 30 kcal/kg FFM floor, "what Precision Coaching cannot do" (04-coaching.md:180-194).
- SettingsCoachingScreen: user-selectable levers — calmer-experience (free), step target, cardio, coaching tone (Automatic / Supportive / Precise), "show the science", cycle tracking (04-coaching.md:269-279).

BEST IN CLASS:
- **MacroFactor — best algorithmic coaching that feels human without an LLM.** Explains the mechanism in the user's own data terms ("your weight trend + your logged intake = your true expenditure"); offers a user-selectable control spectrum **Coached / Collaborative / Manual**; self-corrects visibly off real outcomes so trust compounds. VERIFIED — best-nutrition-apps.com/reviews/macrofactor/; help.macrofactorapp.com/en/articles/91-program-styles; outlift.com/macrofactor-review/ (research §4, lines 202-205).
- **Stronglifts — best deterministic "feels like a coach" with zero AI.** Publishes the exact rule (deload 10% only after failing the same weight three sessions running), makes the decision for the user, auto-deloads, and earns the literal user quote *"I feel like I have a coach next to me."* Proof that predictable, stated, decisive rules feel like coaching. VERIFIED — stronglifts.com/reviews/; support.stronglifts.com/article/71-progression (research §4, line 207; §3 line 188).
- **Future — best "feels like a coach" overall, because a real human is behind it.** 4.9★ across 9,400+ reviews; the human relationship is the product (AI only drafts suggestions). VERIFIED — corahealth.app/compare/future; onbetterliving.com/future-app/ (research Finding 1.2, lines 83-85). Not Volyume's model, but the benchmark for the empathy/accountability gap.
- **Google PAIR — best practitioner playbook** for plain-language explanation, trust and error recovery, fully applicable to a deterministic engine: tie explanations to the user's action; don't over-explain; express uncertainty as categorical High/Med/Low not percentages; give a "remittance plan" and let users teach the system after a failure. VERIFIED — pair.withgoogle.com/chapter/explainability-trust/ (research Findings 3.3, 6.3, lines 120, 161).

TOP 50 RANGE:
Wide. At the coach-like end: deterministic rule engines (Stronglifts), adaptive data-driven engines (MacroFactor, Fitbod after ~10-15 logged workouts, Alpha Progression, Dr. Muscle), and human-in-the-loop services (Future, Caliber, Trainerize). In the middle: RPE/auto-regulation tools that depend entirely on honest user input (JuggernautAI, RP Hypertrophy). At the "spreadsheet" / black-box end: unexplained scores that contradict lived experience (Garmin Training Readiness) and generic AI plan generators that "ignore everything specific about you" (Freeletics-style, Zing, early Peloton IQ). A distinct sub-band deliberately offers **no** auto-progression because experienced lifters prize manual control (Hevy, Strong, Liftosaur). VERIFIED — research §1 table (lines 14-68) and Findings 1.1-2.3, 4.1.

NEWBIE VERDICT:
Partial-to-mostly-served, with a clear overload risk.
- The free CoachReviewScreen is the most newbie-appropriate decision surface — softened lay language ("more sets than you can comfortably recover from"), plain status badges, explicit recommendations (04-coaching.md:117). MethodologyScreen is genuinely beginner-friendly (04-coaching.md:203).
- But the Pro CoachOutputScreen confronts a first-timer with "volume", "sets per muscle group", "deload", "refeed", "macro cycle", "maintenance calories" and up to ~14 stacked cards with multiple equal-weight Apply buttons (04-coaching.md:48, 52) — the sheer number of simultaneous decisions is "likely to overwhelm a brand-new gym-goer" (04-coaching.md:52). The market says newbies need structure, hand-holding, removed maths and form demos, and that cold-start "wrongness"/overload is the prime churn point (research Findings 4.1 line 127, 6.4/7 line 223). Volyume explains *why* well (the WhyBlock + Methodology), which is exactly what newbies need (research 3.3 line 121), but does not reduce the decision count or offer a guided "do it for me" default the way Stronglifts/MacroFactor-Coached do.

ATHLETE VERDICT:
Strongly served.
- An experienced competitor gets the levers they expect: weekly volume signal with MEV/MRV-aware spread, deload, MATADOR-cited diet break, carb cycling, refeed cadence, steps + cardio, RED-S/FFM safety floors, explicit "why", and a longitudinal decision audit (CoachHeldHistory + EngineLog) (04-coaching.md:53, 160). The confirm-then-apply model respects athlete autonomy, which directly matches the market lesson that athletes punish algorithms they can't override or argue with (research Findings 4.2 line 132, 6.1 line 155).
- Gaps: per-muscle set targets are summarised rather than shown per-muscle on CoachOutput (04-coaching.md:53); no raw load/tonnage detail on the free review (04-coaching.md:118).

WHERE WE LEAD:
- **Confirm-then-apply, never auto-write.** Every suggestion needs explicit user confirmation (04-coaching.md:42). This is exactly the "let the user adjust the output / hand over control" mechanism the literature names as the single strongest defence against algorithm aversion. VERIFIED — research Findings 7.3 line 175, 5.2 line 143.
- **Rules stated up front (MethodologyScreen) + a tied-to-action "Why this week" block.** Predictability is itself a trust mechanism, and a deterministic engine can state its rules honestly where an LLM cannot (04-coaching.md:180-194, WhyBlock CoachOutputScreen.js:1722). VERIFIED — research Findings 3.2/5.4 lines 118/150 (Stronglifts), 3.3 line 120 (PAIR), 7.2 line 172, plus INTERPRETATION line 227.
- **Full decision audit trail (held + changed, with EngineLog).** No researched competitor is documented as exposing a complete log of every decision *and non-decision* (04-coaching.md:151). This is a transparency moat over the Garmin "black-box number" failure mode. VERIFIED — research Findings 6.1 line 155, 7.2 line 172.
- **Determinism = identical inputs give identical, considered outputs.** This directly avoids RP Hypertrophy's downfall (random-looking output for identical inputs). VERIFIED — research Finding 2.1 line 97, §5 line 220.
- **Safety floors built into the coaching decision** (RED-S/FFM, rapid-loss, MATADOR diet break) (04-coaching.md:31-32, 53) — no market app in the fragment is credited with comparable embedded ED-safety in its coaching engine. (Market silence, not a sourced competitor claim.)

WHERE WE LAG:
- **No user-selectable control spectrum (Coached / Collaborative / Manual).** Volyume's tone/levers in SettingsCoaching (04-coaching.md:269-279) personalise *voice* and individual toggles, but there is no single mode switch that hands a newbie a fully-automated experience or lets an athlete drop the engine to manual override. MacroFactor's three modes are named best-in-class for exactly this. VERIFIED — research Findings 5.2 line 143, 7.3 line 175, §4 line 204.
- **Cold-start / overload on the Pro screen.** Up to ~14 competing cards with multiple identical-weight Apply buttons and no single emphasised primary action (04-coaching.md:48-49, 89), against a market lesson that overload and perceived early "wrongness" drive churn and that newbies need decisions made *for* them. VERIFIED — research Findings 6.4 line 223, 4.1 line 127.
- **No explicit "this felt wrong / teach the system" override path.** The engine is confirm-then-apply, but the fragment records no documented feedback loop where a user disagreement visibly feeds the next decision. PAIR names this ("let users teach the system") and the literature says one unexplained error causes lasting asymmetric distrust. VERIFIED — research Findings 6.3 line 161, 6.1 line 155, 7.1 line 169.
- **Top-of-screen redundancy.** Headline, coach-lead acknowledgement and trend chips restate the same status three ways before any decision (04-coaching.md:50) — against PAIR's "don't over-explain" guidance. VERIFIED — research Finding 3.3 line 120.
- **Free-tier silent-catch failure-masquerade.** CoachReviewScreen swallows read errors and shows the no-data state (04-coaching.md:113), the same failure the Pro screen explicitly fixed — relevant to the market point that a visible wrong/empty output erodes trust disproportionately. VERIFIED — research Findings 6.1/7.1.

MISSING ENTIRELY:
- **Coached / Collaborative / Manual mode switch** (MacroFactor). VERIFIED — research Finding 5.2 line 143.
- **A human accountability/empathy layer** — scheduled human check-ins, form-video review, between-session texts (Future, Caliber, HealthifyMe human+AI). This is a deliberate product boundary for Volyume, not an oversight, but the market evidence is that the human layer adds empathy + accountability (not accuracy) and measurably improves outcomes (Stanford human+AI ~2.7% vs AI-only ~1.5% bodyweight). VERIFIED — research Findings 1.2 line 83, 4.3 line 135, 7.4 line 178.
- **Explicit categorical confidence display (High/Med/Low) on a decision.** The engine has a confidence concept (steps "sharpen confidence", 04-coaching.md:187) but the fragment does not record a user-facing High/Med/Low confidence label that PAIR recommends. VERIFIED — research Finding 3.3 line 120. (Absence in the Phase-1 fragment; not a confirmed code-level absence.)
- **Form demonstration / video guidance inside the coaching flow** (the newbie need named in research Finding 4.1 line 127) — not present on any of the five coaching screens per the fragment.

USER SENTIMENT (what users want that no app reliably provides):
- A coach that **disagrees-gracefully**: athletes want an algorithm they can override and argue with; Garmin lost them precisely because it was an unexplained number that contradicted how they felt and offered no way in (research Findings 4.2 line 132, 6.1 line 155). Volyume's confirm-then-apply + held-history is closer to this than most, but the explicit "teach it back" loop is the unmet want.
- **Empathy + accountability that isn't hollow.** Users have "an underlying need to receive empathy" (Stanford), yet AI over-positivity ("Great job!!!", "the AI's positivity is a little too much") reads as fake and erodes belief (research Findings 7.4 line 178, 2.3 line 108, verbatim line 195). The unmet want is *specific, earned* encouragement tied to what they actually did — which a deterministic engine can generate honestly.
- **Predictability without a black box** — users distrust outputs they can't trace; transparency + stated rules + self-correction off their own data are repeatedly what earns trust (research Findings 5.1/5.4/7.2). No single researched app combines all three plus a full non-decision audit trail.

VERIFICATION STATUS:
This block leans almost entirely on VERIFIED market findings (MacroFactor, Stronglifts, Future, Garmin, Google PAIR, the Stanford/HealthifyMe study, and the algorithm-aversion literature are all VERIFIED). Items to flag:
- **PARTIAL-dependent:** the TOP 50 RANGE "spectrum" leans in part on PARTIAL apps for breadth (e.g. Tonal, WHOOP, Vitruvian, Aaptiv, Liftosaur, Boostcamp) — the named *positions* (coach-like / spreadsheet / no-auto-progression bands) are anchored to VERIFIED apps (Stronglifts, MacroFactor, Fitbod, Garmin, Hevy, Strong, RP, JuggernautAI); the PARTIAL apps only widen the band.
- **NOT-FOUND-dependent:** none of the load-bearing claims rests on a NOT-FOUND item. The research fragment's NOT-FOUND items were verbatim Reddit quotes for Fitbod/Tonal (research §6 line 236); this block does not use those quotes — Fitbod cold-start and the spreadsheet feel are carried via the VERIFIED review-site paraphrases instead.
- **Two Volyume "WHERE WE LEAD" points (safety floors in the engine; full non-decision audit trail) rest on market *silence*** rather than a sourced competitor comparison — stated as "no researched app is credited with this," not as a verified head-to-head.
- The MISSING "categorical confidence display" gap is an absence in the Phase-1 fragment, not a confirmed code-level absence.


<!-- ==== phase3/compare-04-nutrition.md ==== -->

# Phase 3 master-comparison — Area 04: Nutrition & macro management

Reconciles Phase-1 (Volyume current) `phase1/07-nutrition-targets.md` against
Phase-2 market research `phase2/research-04-nutrition.md`. READ-ONLY synthesis;
no new web research. British English. Every market claim carries its
Phase-2 status (VERIFIED / PARTIAL / NOT-FOUND); every Volyume claim carries its
Phase-1 file:line.

---

AREA: Nutrition & macro management

VOLYUME CURRENT: Volyume's nutrition layer is a Pro suite of four screens.
**Nutrition Targets** (src/screens/NutritionTargetsScreen.js) takes body stats,
activity, goal/phase and a protein approach, then computes daily calorie + macro
targets with a goal-aware "Why these numbers for you?" breakdown and per-meal
protein distribution using a 0.4–0.55 g/kg MPS-window logic
(07-nutrition-targets.md:15-77, :98). Six surplus/deficit goals run +17% to −22%
(:42-44, GOALS L80-87); protein offers Standard/Optimised/Advanced/Custom g/kg
approaches (:46-48). Form prefills from the saved body profile so stats are rarely
re-entered (:93-94), and collapses to a one-line summary once targets exist
(:54-56). **Nutrition Education** (src/screens/NutritionEducationScreen.js) is a
static plain-English primer — energy budget, the three macros at kcal/g, phases,
hand-portion estimates, "adherence beats perfection", and "the coach does the
adjustments" with a 5% cap and 2-week cooldown (07-nutrition-targets.md:189-213,
:211-212). **Meal Plan** (src/screens/MealPlanScreen.js) renders an
engine-generated abstract 7-day plan with progressive disclosure (calm
calories-first plates; grams/macros a tap deeper), carb-cycling with protein held
fixed, per-food and whole-meal swaps, and an honesty line when a day cannot hit
target (:290-328, :339-349). **Food Insights** (src/screens/FoodInsightsScreen.js)
shows a 7-day calorie bar chart vs target (bars within 10% turn green), a four-row
macro hit-rate summary, and a CSV export (:433-452, :471). The whole nutrition
layer is deterministic — Meal Plan never computes nutrition itself, it renders
what the engine assembled (:295-296, :348-349), and Nutrition Targets respects the
same boundary. ED-safety framing is present in the education copy (5% adjustment
cap, never adds exercise calories back, 07-nutrition-targets.md:48-52, :211-212).

BEST IN CLASS:
- **Adjustment communication — MacroFactor.** Weekly check-in, transparent
  expenditure trend, deliberately conservative ("won't overreact"),
  adherence-neutral, explicit anti-shame language ("Tracking isn't something that
  should stress you out... it will meet you where you are... without shaming,
  judgment, or the requirement that you adhere to your targets perfectly").
  Gold standard for *how* to tell a user their numbers changed.
  https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal
  — VERIFIED (help-docs fetched cleanly).
- **Competitor-grade periodisation — Carbon Diet Coach + RP Diet.** Carbon's
  phased coaching maps directly to 16–20 week contest-prep periodisation with
  metabolic-adaptation tracking; RP adjusts carb/fat by when you train (nutrient
  timing). Built by PhDs/RDs/IFBB pros. https://www.joincarbon.com/ ;
  https://apps.apple.com/US/app/id1330041267 — PARTIAL/VERIFIED.
- **Newbie "why" education — Noom.** Daily 2–5 min bite-sized lessons + quiz and
  green/yellow/orange colour zones replacing the bare number.
  https://thisisamandaliu.medium.com/noom-case-study-4c404a3e2dde — VERIFIED.
- **Low-effort tracking with proven equivalence — simplified red-zone checklist
  (JMIR) + Precision Nutrition hand portions.** Simplified tracking: 97% of days
  self-monitored vs 49% for detailed logging, at statistically similar weight loss.
  Hand portions ~95% as accurate as weighing. https://formative.jmir.org/2022/12/e42191
  (VERIFIED, peer-reviewed) ; https://www.precisionnutrition.com/hand-portion-math-to-track-macros
  (VERIFIED).
- **Micronutrient precision floor — Cronometer.** ~3.5% data variance vs MFP's
  ~6.8%; surfaces micronutrient sufficiency during restrictive phases.
  https://nutriscan.app/blog/posts/macrofactor-vs-cronometer-2026-62a278ee64 — PARTIAL.

TOP 50 RANGE: Across 52 apps named (14 VERIFIED with substantive detail, ~24
PARTIAL, ~14 listing-only NOT-FOUND), quality spans four bands. At the **coaching
top**, MacroFactor (adaptive TDEE, adherence-neutral comms — VERIFIED), Carbon, RP,
Avatar (weekly auto-adjusting macros — PARTIAL/VERIFIED) deliver phase-aware,
self-adjusting targets. At the **precision/data top**, Cronometer (deepest
micronutrients — VERIFIED) and verified-DB advocates MyNetDiary/Avatar/Fitia
(PARTIAL) prioritise database accuracy over size. The **mass-market middle** —
MyFitnessPal (largest DB ~20M+ but crowdsourced accuracy issues, barcode paywalled
— VERIFIED), Lose It!, FatSecret (fully free — VERIFIED), Yazio (quiz-set targets,
countdown UI, no coaching — VERIFIED), Lifesum (PARTIAL) — does logging well but
little coaching. The **education/behaviour band** is Noom and WW (points budget,
flagged for obsessive-tracking risk — VERIFIED). The **AI-photo band** — Cal AI,
SnapCalorie (±80 kcal Pro iPhone vs ±265 eyeballing), PlateLens, Nutrola
(VERIFIED/PARTIAL) — trades precision for speed but mis-estimates portions/hidden
ingredients. A **beginner-simplicity band** (Macro Champ, Macro Simple, Welling,
Stupid Simple Macros — PARTIAL) markets "no overwhelming dashboards" and sets
targets without requiring the user to understand them first.

NEWBIE VERDICT: Partially served. The standalone Nutrition Education primer is a
genuine strength — plain English, hand-portion estimates, "trend over weeks",
British spelling — and is well-pitched to a first-timer
(07-nutrition-targets.md:244-247). But the Nutrition Targets form a beginner must
complete first is long and intimidating: body fat %, BF source, activity level, and
four protein approaches with g/kg ranges (Standard/Optimised/Advanced/Custom) are
expert framing (:114-119). Two InfoTooltips plus an approach note plus a per-meal
tooltip compete with the inputs (:107-108), and goal labels carry jargon-adjacent
percentages ("+17% surplus") with no inline plain explanation until results render
(:109-110). The "Why these numbers" card defaults to expanded, so a returning user
lands on four long paragraphs (:104-106). The education screen also has no CTA to
convert the lesson into action (:238-239). This is the opposite of the
market's strongest newbie pattern — "set it for them, explain the why separately"
(Finding 1.1, VERIFIED) and Noom's education-first colour-zone frame (Finding 1.2,
VERIFIED).

ATHLETE VERDICT: Largely well served, with one phase gap. Body-fat-source selection
feeding a lean-mass formula, protein on bodyweight vs LBM basis, per-meal MPS-window
splitting, custom g/kg protein, and the detailed "How was this calculated?"
breakdown all serve a competitor (07-nutrition-targets.md:121-126). Meal Plan adds
per-day training/rest variants, carb-cycling with protein fixed, peri-workout
(pre/post) slots, same-role macro-held food swaps, and exact P/C/F vs target
(:370-373) — real control matching the Carbon/RP nutrient-timing pattern (Finding
3.2, PARTIAL/VERIFIED). The gaps: contest-prep phase copy exists but contest_prep is
NOT a selectable goal in the GOALS grid — it can only arrive from a loaded target
(:124-126); Food Insights is shallow for an athlete (fixed 7 days, no longer trend,
no per-day macro chart, no weight/trend correlation) so they would likely export CSV
and analyse elsewhere (:493-496); and there is no micronutrient view at all
(Cronometer pattern, Finding 3.3, PARTIAL).

WHERE WE LEAD:
- **Deterministic, honest meal planning.** Meal Plan renders engine output and shows
  an honesty line when a constrained day cannot hit target exactly — it does not fake
  precision (07-nutrition-targets.md:344-345, :312). Contrasts with the AI-photo band
  that mis-estimates portions/hidden ingredients (Findings 4.4, PARTIAL; 7.2,
  VERIFIED/PARTIAL).
- **ED-safety framing baked into the copy.** Education states a 5% adjustment cap,
  2-week cooldown, "adherence beats perfection", and never adding exercise calories
  back (07-nutrition-targets.md:48-52, :211-212). The market's #1 design risk is
  number-focus/red-shame signalling fuelling disordered eating (Finding 4.5,
  VERIFIED) — Volyume's framing is the protective counter-pattern the research
  endorses.
- **Genuinely educational, goal-aware "why."** Separate Calories/Protein/Fat/Carbs
  copy for gain/cut/recomp/maintain (07-nutrition-targets.md:91-92, :958-1018).
  Cronometer deliberately does NOT explain or coach (Finding 1.4, VERIFIED); Volyume
  does both.
- **Per-meal protein distribution coaching** via the 0.4–0.55 g/kg MPS window
  (07-nutrition-targets.md:97-98) is finer than the generic trackers' single daily
  protein number.
- **Progressive disclosure in Meal Plan** (calm calories-first, grams a tap deeper,
  07-nutrition-targets.md:339) matches the low-friction-beats-feature-breadth
  finding (Finding 6.3, PARTIAL) better than feature-dense diaries.

WHERE WE LAG:
- **No simplified / no-gram nutrition mode.** Volyume's on-ramp is the full
  gram/g-per-kg form (07-nutrition-targets.md:114-119). The single strongest evidence
  in the whole research file is that simplified tracking achieved 97% vs 49%
  adherence at equal weight loss (Finding 7.1, VERIFIED, JMIR e42191), and hand
  portions are ~95% as accurate (Finding 7.2, VERIFIED). The education screen
  *describes* hand portions but no tracking mode *uses* them.
- **Newbie onboarding is "understand-first," not "set-it-for-them."** The market's
  best newbie pattern gives a usable target immediately and teaches afterwards
  (Finding 1.1, VERIFIED; Finding 2.1, PARTIAL). Volyume gates a usable target behind
  a long expert-framed form.
- **No adaptive/weekly recalibration surfaced in this layer.** MacroFactor's adaptive
  TDEE recalibrates weekly, catching metabolic slowdown a static calculator misses
  (Finding 3.1, PARTIAL+VERIFIED corroboration). Volyume's Nutrition Targets is a
  one-shot calculator; adjustment lives in the coaching engine, not on this surface.
- **Shallow insights for athletes.** Fixed 7-day window, kcal-only chart, no longer
  trend, no per-day macro visualisation, no weight correlation
  (07-nutrition-targets.md:482-483, :493-496) — below the weekly expenditure-trend
  loop athletes expect (Finding 5.1, VERIFIED).

MISSING ENTIRELY:
- **Simplified/visual tracking mode** — hand portions, red-zone checklist, or
  protein+calories-first (Finding 7.1 VERIFIED; 7.2 VERIFIED/PARTIAL; 2.1 PARTIAL).
  Described in education copy but not a usable mode.
- **Micronutrient tracking/floor view** (Cronometer pattern, Finding 3.3, PARTIAL).
  Volyume's nutrition layer covers calories + P/C/F only.
- **Adaptive weekly TDEE recalibration on the nutrition surface itself**
  (MacroFactor pattern, Finding 3.1, PARTIAL/VERIFIED).
- **A selectable contest-prep goal** in the targets grid — copy exists but the goal
  is not user-selectable (07-nutrition-targets.md:124-126); athletes can't choose the
  periodised phase Carbon/RP make central (Finding 3.2, PARTIAL/VERIFIED).
- **AI photo / barcode estimation as a logging path within these screens** (Cal AI,
  SnapCalorie band, Findings 4.4/7.2). Note: barcode scanning exists elsewhere as a
  separate Pro feature per CLAUDE.md and is out of this fragment's scope.
- **Longer-range / date-selectable insights and CSV-beyond-7-days**
  (07-nutrition-targets.md:481-482).

USER SENTIMENT (what users want that no app cleanly provides — from the fragment):
- A way to track that does NOT require weighing every gram, yet still works:
  simplified self-monitoring was adhered to on 97% vs 49% of days at equal results
  (Finding 7.1, VERIFIED) — strong unmet demand for a credible low-effort mode.
- Accurate food data: crowdsourced DB inaccuracy is the #1 cited frustration (MFP
  underestimating protein ~7.8% / carbs ~6.4%; wrong entries go live unverified)
  (Findings 4.1 VERIFIED, 3.4 PARTIAL).
- Transparent, non-judgemental pricing and coaching: hidden/opaque pricing (Cal AI,
  Finding 4.3, PARTIAL) and core features moved behind paywalls (MFP barcode, Finding
  4.2, VERIFIED) are recurring grievances.
- Tracking that does NOT fuel obsession: number-focus and red/shame signals are
  repeatedly linked to disordered eating (Finding 4.5, VERIFIED) — users want
  adherence-neutral, anti-shame framing (Finding 5.2, VERIFIED).
- Sustained adherence: every app sees adherence decline over time, worst in
  maintenance (Finding 4.6, VERIFIED) — low-friction logging is the lever (Finding
  6.1 PARTIAL, 6.3 PARTIAL).

VERIFICATION STATUS: This block leans on a mix; the load-bearing PARTIAL/NOT-FOUND
items are flagged here.
- **VERIFIED and load-bearing:** JMIR e42191 simplified-vs-detailed (97% vs 49%,
  equal weight loss); Precision Nutrition hand portions ~95%; MacroFactor
  adherence-neutral/anti-shame help-docs; Noom education-first; ED-risk findings
  (therapist.com, BBC, Fortune/WW); MFP crowdsourced inaccuracy + barcode paywall;
  adherence decline over time (JMIR/peer-reviewed).
- **PARTIAL the block relies on:** MacroFactor adaptive-TDEE *weekly recalibration*
  specifics (third-party comparison blog, corroborated by VERIFIED help-docs);
  Carbon/RP periodisation & nutrient-timing (vendor + store, PARTIAL/VERIFIED mix);
  Cronometer micronutrient variance figures (PARTIAL comparison blog); MFP protein
  ~7.8% / carbs ~6.4% under-estimate (vendor citing academic, PARTIAL); Cal AI hidden
  pricing & portion errors (eesel summary of Reddit/store sentiment, PARTIAL);
  beginner-simplicity apps Macro Champ/Macro Simple/Welling (vendor/store framing,
  PARTIAL); low-friction-beats-features industry data inc. 2.7-vs-1.9 meals/day
  (PARTIAL, 403-walled article via search summary).
- **NOT-FOUND context:** ~14 named apps (Foodvisor, Bitesnap, Calory, Simple, 8fit,
  Fooducate, Strongr Fastr, MealLogger) returned listing-only — not relied on for any
  specific claim above. Reddit/community user-voice is sourced via secondary
  summaries (PARTIAL) because direct Reddit fetches were not retrievable.


<!-- ==== phase3/compare-05-food-logging.md ==== -->

# Phase 3 master comparison — Food logging & diary (05)

Volyume Ultimate Audit, 2026-06-13. Reconciles Phase-1 inventory
(`phase1/08-food-logging.md`, file:line-grounded) against Phase-2 market research
(`phase2/research-05-food-logging.md`, status-carried). READ-ONLY. British English.

---

AREA: Food logging & diary

VOLYUME CURRENT: Volyume ships a complete Pro food diary across eight screens.
The DiaryScreen is the Diary-tab root: day pager, MacroRings summary with
training/rest/refeed day-type targets, per-meal sections on a flexible numbered
meal ladder, a hardcoded 3 L water row, weight-trend card, and a barcode-scan FAB
(DiaryScreen.js:498-657; day-type targets DiaryScreen.js:143-164; water target
hardcoded 3000 ml DiaryScreen.js:750). The whole diary domain is Pro-gated via
`withProGuard(DiaryScreen, 'Food diary')` (RootNavigator.js:160, 225). Logging one
already-visible food via search is a MINIMUM 3 taps (meal "Add" → food row → "Add
to diary"; DiaryScreen.js:591, FoodSearchScreen.js:478, FoodDetailSheet.js:169-177);
a faster plate path is also 3 taps and skips the serving sheet (FoodSearchScreen.js:480,
257-306); quick-add (no food) is 2 taps + numeric entry (DiaryScreen.js:592, 631-636).
FoodSearchScreen offers five browse tabs (Recents/Suggested/Favourites/Frequents/
Custom), a debounced 250 ms local-first waterfall search with a 2-char gate, a
multi-add "plate" with running kcal and a double-log guard, slot-aware recents that
pre-fill last portion, long-press favourite/dislike, and macro-sized meal suggestions
(FoodSearchScreen.js:104-114, 155-195, 206-226, 234-306, 396-419, 512-571).
Supporting screens: AddCustomFood (manual per-100g entry with sanity check and OCR
"unsure" flagging, AddCustomFoodScreen.js:104-188, 57-63), MyMeals (saved meal
bundles, one-tap-plus-confirm log, MyMealsScreen.js:66-88), MyRecipes + RecipeBuilder
(composed recipes logged as one line with live per-serving macros, MyRecipesScreen.js:71-86,
RecipeBuilderScreen.js:113-116), ScanBarcode (live camera waterfall lookup routing to
detail-sheet hit or ScanLabel miss, ScanBarcodeScreen.js:117-124), and ScanLabel
(two-step OCR capture handing off to AddCustomFood, degrading to manual entry,
ScanLabelScreen.js:118-135, 286-320). The barcode-miss heal chain never dead-ends
(ScanLabelScreen.js:310-316). An Open Food Facts consent card appears after a barcode
heal (DiaryScreen.js:557-576), indicating OFF is a backing barcode source.

BEST IN CLASS:
- Lowest friction / fastest: MacroFactor — a plate/timeline workflow that keeps the
  logger open between items so you do not re-launch per food; 24 total actions across
  four workflows vs MyFitnessPal's 36 (50% fewer); 3-action quick-add, 5-action
  barcode; deterministic adaptive expenditure (no LLM). Its "Describe" feature IS
  LLM-based. VERIFIED. https://macrofactor.com/new-food-logger/ ;
  https://nutriscan.app/blog/posts/macrofactor-vs-myfitnesspal-2026-93f2aa703e
- UK database (curated, verified, ED-conscious imagery): Nutracheck — curated not
  crowdsourced, 500K+ UK items, nutritionist-verified, food images, Tesco/Greggs/
  Costa/Nando's coverage. VERIFIED. https://home-cooks.co.uk/pages/review-nutracheck
- Accuracy gold standard: Cronometer — lab-verified USDA/NCC, <3% deviation, 84
  nutrients. VERIFIED. https://nutrola.app/en/blog/every-calorie-tracking-app-compared-2026
- Boundary-safe barcode backbone: Open Food Facts — 3M+ products, 24,366 UK brands,
  photo-verified, deterministic lookup, open API. VERIFIED.
  https://world.openfoodfacts.org/

TOP 50 RANGE: A wide spectrum. At the fast/accurate top sit MacroFactor (plate, 24
actions, VERIFIED) and the accuracy/curation leaders Cronometer (~380K verified, <3%,
VERIFIED) and Nutracheck (curated UK, VERIFIED). Mid-tier crowdsourced giants —
MyFitnessPal (14–20M+ DB but 36 actions and notorious duplicate noise, VERIFIED),
Lose It! (7M+, AI photo, VERIFIED), Yazio/Lifesum (~3–4M, ~10–15% error, VERIFIED),
FatSecret (9M+ free, ~15–20% error, VERIFIED) — trade accuracy for size. UK-specific
players (NutraSafe instant UK barcode VERIFIED; myfood24 79,338 branded items / 10 of
11 supermarkets VERIFIED; Calorie Counter+, Carbs & Cals, Foodzilla all PARTIAL)
cluster around UK coverage. The AI-photo tail (Cal AI ±14.6% MAPE, SnapCalorie ±19.8%,
both VERIFIED; Foodvisor/Fitia/Bitesnap PARTIAL) is fast but inaccurate and not
boundary-safe. Vendor-self-report outliers (Nutrola 8–12s, PlateLens ±1.2% in 3s) are
PARTIAL/unverified marketing and excluded from the bar.

NEWBIE VERDICT: Partial. Volyume's conventions help — day pager, meal cards, "Add"
affordances and a guiding empty state ease first use (DiaryScreen.js:578-583) — but two
weaknesses bite a beginner. First, the most visually prominent control is the amber
56px barcode FAB, not search-add, which can mislead a newbie into thinking scanning is
the main path (DiaryScreen.js:647-657, 781-787). Second, macro rings, numbered "meal
slots", the five-tab picker, and the tap-row-vs-tap-plus distinction assume nutrition
literacy a first-timer lacks (DiaryScreen.js:540-547; FoodSearchScreen.js:575-624,
474-482). The market warns this is exactly where week-one abandonment happens: ~80%
quit food logging, ~97% within a week, and the "20 wrong results" wall plus sub-10s
speed are decisive (VERIFIED). Volyume's 3-tap search and 2-tap quick-add are
competitive on speed; the open question is whether its DB returns ONE correct UK
best-match (see WHERE WE LAG).

ATHLETE VERDICT: Largely strong. Volyume serves a competitor well: carb-cycle
training/rest/refeed-day targets (DiaryScreen.js:143-164), per-100g custom entry with
separate serving/eaten weights and optional fibre (AddCustomFoodScreen.js:232-246),
reusable saved meals and composed recipes for repetitive prep diets (MyMealsScreen.js:66-88,
RecipeBuilderScreen.js:113-116), slot-aware recents/favourites/frequents and a multi-add
plate for fast repeat logging (FoodSearchScreen.js:104-114, 234-306), and copy-yesterday
(DiaryScreen.js:459-496) — which map directly onto the market's most-cited time savers
(recents/favourites/saved meals/copy-day, VERIFIED). Gaps: the hardcoded 3 L water
target (DiaryScreen.js:750), no manual-barcode-entry escape on the scanner
(ScanBarcodeScreen.js:200-203), and DB accuracy/coverage being unproven from the
inventory — the dimension athletes abandon over (VERIFIED).

WHERE WE LEAD:
- Day-type carb-cycle targets (training/rest/refeed) baked into the diary
  (DiaryScreen.js:143-164) — beyond the static calorie cap the market criticises; the
  research prizes adaptive targets that make the log "do something". VERIFIED
  (macrofactor.com/macrofactor-vs-myfitnesspal-2025/).
- Boundary-safe barcode backbone already wired to Open Food Facts (consent card after
  heal, DiaryScreen.js:557-576), which the research names the boundary-safe friction
  killer and a candidate UK barcode source. VERIFIED (macroinspector; OFF brands).
- A barcode-miss heal chain that never dead-ends — always a "Type it in" escape that
  keeps the barcode (ScanLabelScreen.js:310-316, 337-338); most apps simply fail the
  scan. (Volyume-current; no single market source asserts rivals lack this — strength
  inferred from inventory, not a sourced market claim.)
- The full recents/favourites/frequents/saved-meals/copy-yesterday set is already
  present (FoodSearchScreen.js:104-114; DiaryScreen.js:459-496; MyMealsScreen.js:66-88)
  — the single most-cited consistency driver. VERIFIED (mynetdiary myFoods).
- Deterministic, no-LLM design throughout — Volyume sidesteps the 15–25% calorie MAPE
  and as-low-as-39% portion error that plague AI-photo rivals. VERIFIED (fitia AI
  accuracy; Cal AI ±14.6%, SnapCalorie ±19.8%).

WHERE WE LAG:
- Logger does not stay open across a meal. Volyume's plate exists
  (FoodSearchScreen.js:234-306) but each per-meal log path returns to the diary
  (goBack, FoodSearchScreen.js:289, 374); MacroFactor's open plate/timeline is the
  single biggest deterministic friction reducer and underpins its 50%-fewer-actions
  lead. VERIFIED (macrofactor.com/new-food-logger; nutriscan FLSI). [The 24-vs-36 and
  3/5-action figures trace to MacroFactor's own FLSI, cross-cited by nutriscan — see
  VERIFICATION STATUS.]
- Barcode log action-count not measured. Volyume's search log is 3 taps from the diary
  (DiaryScreen.js:82-92), but the inventory gives no end-to-end barcode action count to
  compare against the market floor of 5 actions. VERIFIED bar (nutriscan FLSI);
  Volyume figure NOT CAPTURED in Phase-1.
- UK best-match / DB-accuracy unproven. The inventory shows search plumbing
  (FoodSearchScreen.js:206-226) but no evidence of a curated, verified UK best-match or
  a meaningful verified marker. The market's make-or-break is ONE correct UK top result,
  not crowdsourced duplicates; UK users hit a day-one wall on Tesco meal deals, Greggs,
  Costa, Nando's, and own-brand ranges, and OFF/crowdsourced sources carry UK barcode
  gaps. VERIFIED (Nutracheck; mynetdiary DB-accuracy; cronometer UK thread; OFF brands).
- No prominent single primary "log food" action at diary level; prominence sits on the
  barcode FAB rather than search-add (DiaryScreen.js:647-657, 79).
- Information density high on a populated day — header, pager, rings, trend, OFF card,
  N meal sections, add-meal row, water row, plus FAB (DiaryScreen.js:498-657). The
  market's cautionary tale is MFP's 2026 redesign, where space-consuming cards added
  friction and drove users away. VERIFIED (piunikaweb).

MISSING ENTIRELY:
- A staying-open plate/timeline across a whole meal (MacroFactor, VERIFIED) — Volyume's
  plate is a sub-flow that closes back to the diary, not a persistent timeline.
- Curated nutritionist-verified UK item set with food images (Nutracheck, VERIFIED) —
  not evidenced in the inventory.
- Micro-nutrient tracking depth (Cronometer 84, MyNetDiary 108 nutrients, VERIFIED) —
  Volyume's custom entry covers kcal/protein/carbs/fat/fibre only
  (AddCustomFoodScreen.js:232-240).
- Pre-logging / log-ahead for planners (VERIFIED) — Volyume can copy-yesterday and view
  future days via the pager (DiaryScreen.js:459-496, 511-538) but no dedicated pre-log
  workflow is evidenced.
- Correctly excluded by Volyume's boundary (NOT to be added): natural-language
  "Describe" logging (LLM, MacroFactor) and AI photo calorie estimation (Cal AI,
  SnapCalorie, Lose It photo) — both flagged NOT boundary-safe and weak on accuracy.
  VERIFIED.

USER SENTIMENT: The fragment surfaces wants no app fully satisfies. Users want a
single CORRECT best-match, not "100 results for the same food and all of them
incorrect" / "five, ten, sometimes twenty or more entries … vary by 20 to 40 percent"
(VERIFIED). They want a verified marker that actually means verified, not MFP's green
check that "just means enough people upvoted it" (VERIFIED). UK users want their actual
supermarket/takeaway items — "scan a Costa coffee or a Sainsbury's ready meal" and get
real data "rather than something a random user typed in years ago" (Nutracheck praise,
VERIFIED) — without US-portion contamination (VERIFIED). And the load-bearing ED-safety
signal: a BJPsych study ties harm to numeric "fixation … fuelled heavily by the app's
quantification", red/green feedback, and competitive streaks — so the diary should avoid
punitive over/under colour framing and pressure streaks (VERIFIED; flag to safety owners
per Phase-2 proposal item 7).

VERIFICATION STATUS: This block is predominantly VERIFIED. Dependencies to flag:
- The action-count benchmarks (MacroFactor 24 vs MFP 36; 3-action quick-add; 5-action
  barcode) are VERIFIED but ALL trace to a single source — MacroFactor's own Food
  Logging Speed Index, cross-cited by nutriscan.app. The fragment notes no independent
  second tap-by-tap benchmark could be confirmed, and macrofactor.com/fastest-food-logger-2025
  was Cloudflare bot-gated (figures obtained via the cross-citing secondary source).
- Rival "fastest" / sub-10s / 3-second time claims (Nutrola, PlateLens, AI-photo apps)
  are PARTIAL/UNVERIFIED vendor marketing and were excluded from the bar.
- The "heal chain never dead-ends as a lead" point is grounded in Volyume's Phase-1
  inventory; no market source explicitly asserts rivals lack this, so it is a
  Volyume-current strength, not a sourced market comparison.
- UK-coverage apps leaned on partly: NutraSafe/myfood24/Open Food Facts/Nutracheck/
  Cronometer claims used here are VERIFIED; Calorie Counter+, Carbs & Cals, Foodvisor,
  Fitia, Foodzilla are PARTIAL and not relied on for any load-bearing claim above.


<!-- ==== phase3/compare-06-progress.md ==== -->

AREA: Progress tracking & visualisation

VOLYUME CURRENT: A Progress tab built as a hub-and-spoke set of dedicated
  analytics screens. The landing (AnalyticsScreen) answers "am I on track?" at a
  glance — a "This week" consistency strip with milestone rows, a "For you"
  insight stack, a Pro-only weight-trend card, recent sessions, a one-line volume
  summary, a PR sparkline, and a 7-tile "Explore" grid routing to the deeper
  screens (09-progress-analytics.md:21-39). The deeper screens are:
  - Consistency — streak weeks, deload banner, training-block cards (mesocycle
    pulse, fatigue, block progress), recovery/readiness, training load (ACWR),
    session-length trend, muscle-frequency table, and a 12-week training calendar
    (09:65-96).
  - Lifts (LiftProgress) — overall strength standing, relative-strength-per-lift
    with Beginner→Elite level badges, and a per-lift list with estimated-1RM
    "est. max", "+N%" deltas and a per-row Sparkline; long-press to share a PR
    (09:100-134).
  - Volume (VolumeHeatmap) — anatomical body heatmap tied to per-muscle weekly
    working-set bars against MEV/MAV/MRV landmarks, a week-over-week "ghost" fill,
    last-trained recency chips, a volume-trend section, and editable custom
    targets (09:138-173).
  - Body Metrics — PRO-gated, opt-in, calm-mode re-confirmed. Logs weight / body
    fat / 9 measurements; smoothed WeightTrendChart with window chips, an EWMA
    "Weight trend" card, an adaptive-TDEE "Estimated daily burn" card with
    confidence tiers, body-fat trend, measurement grid + trend, and 12-row
    history (09:178-223).
  - Year of Lifts / Recaps (YearOfLiftsScreen) — a full-screen Spotify-Wrapped-
    style swipeable story in three variants (year / month / block); factual
    training stats only, neutral framing under calm/ED flags, shareable
    (09:260-298).
  - Snapshots — a data-safety restore utility, not a training surface (09:228-255).
  Notably: charts are FREE (Lifts, Volume, Consistency all register with no
  withProGuard — 09:113,153,80); only Body Metrics and the landing's weight-trend
  + cardio cards are Pro (09:196,38). A weight-trend smoother (EWMA + robust
  smoother) and adaptive TDEE already exist, behind the Pro Body Metrics gate
  (09:186-188,197).

BEST IN CLASS:
  - Strength-trend visualisation: Hevy — clear FREE per-exercise graphs, volume
    trends, 1RM estimates, live PR notifications and a Year-in-Review recap; the
    long upward strength line is the single most-cited motivator and "the thing
    that had kept me in the gym this year." https://www.hevyapp.com/features/gym-progress/ ,
    https://www.hevyapp.com/features/live-pr/ — VERIFIED.
  - Weight trend / anti-noise: MacroFactor (smoothing + adaptive TDEE that re-
    derives expenditure and adjusts targets when the trend stalls) and Happy Scale
    (smoothing + forecast "to keep your spirits up… on a smooth curve").
    https://macrofactor.com/expenditure-v3/ , https://happyscale.com/ — VERIFIED.
  - Supportive-without-patronising design: Gentler Streak — rest days don't break
    the streak; nudges toward recovery; sick/injured/off statuses; Apple Watch App
    of the Year 2022. https://developer.apple.com/news/?id=3m0ht22s — VERIFIED.
  - Celebration recap: Strava Year in Sport / Hevy Year in Review — Spotify-Wrapped
    for fitness; but ship to ALL users (Strava's 2025 $80 paywall "roiled" users).
    https://www.hevyapp.com/features/year-in-review/ — VERIFIED.
  - Per-exercise history depth: Setgraph — complete movement history regardless of
    routine ("every time you train an exercise, you see your complete history").
    https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters — VERIFIED.

TOP 50 RANGE: 55 apps recorded, 25 VERIFIED with substantive detail, 30 PARTIAL
  (research-06-progress.md:75-77). The spectrum runs from full-suite trackers
  (Hevy, Strong, JEFIT, Fitbod) through trend-weight specialists (MacroFactor,
  Happy Scale, Libra), wearable readiness platforms (WHOOP, Garmin, Oura, Apple
  Fitness, Fitbit), celebration/gamification apps (PR Workout Tracker with XP
  Beginner→Legend, RepCount auto-confetti, FitPros recap cards, Duolingo as the
  cross-domain streak exemplar), self-compassion design (Gentler Streak), down to
  a long tail of single-purpose App Store body-measurement and progress-photo
  trackers (#38–55, mostly PARTIAL) (research-06:17-77). Quality divides on three
  axes: whether trend charts are free or paywalled (6.3), whether weight is shown
  smoothed or raw (2.3), and whether celebration mechanics respect rest or punish
  it (5.4).

NEWBIE VERDICT: Mixed. Volyume's safety-aware self-hiding helps — Pro sections
  hide rather than tease, the landing shows an explicit "No data yet" empty state,
  and heavy Consistency cards stay hidden until there is data (09:39,81). But the
  jargon density works against beginners: "This week's volume", "below target /
  over max", "est. max", MEV/MAV/MRV, ACWR, EWMA and "adaptive TDEE" all assume a
  training literacy a first-timer lacks (09:41,83,116,156,199). This collides with
  the research: the empty state is the primary newbie churn point and best practice
  is sub-30-second first value, not a blank jargon canvas (3.1 VERIFIED); first-week
  activation is decisive (3.2 VERIFIED); near-empty charts must be encouragement-
  framed (3.3 VERIFIED). The YearOfLifts story is the one screen rated fully legible
  for a first-timer (09:282) — but it is data-gated until 10 sessions / 365 days
  (09:279).

ATHLETE VERDICT: Strong. Per-muscle volume against RP-style MEV/MAV/MRV landmarks
  with editable targets, e1RM trends, relative-strength ratios, ACWR/fatigue/block
  periodisation, st/lbs/kg support, 9-site measurements, smoothed trends and a
  reverse-engineered TDEE are exactly what a competitor tracks (09:157,200,84,117).
  This maps to the research's athlete profile: the long strength curve is the
  reason experienced users stay (2.1 VERIFIED); they want explicit smoothing they
  can read (1.1, 2.3 VERIFIED); and slice-by-exercise/period depth is required
  (3.3 VERIFIED). The gap for athletes is cold-start data portability — fast
  history import/backfill so the long graph appears at once — which the research
  flags as their distinct friction (3.1, 3.2 VERIFIED) and which the Phase-1
  inventory does not mention anywhere.

WHERE WE LEAD:
  - Charts are FREE. Lifts, Volume and Consistency register with no Pro guard
    (09:113,153,80). This directly beats Strong, which paywalls "any of the
    progress charts over time," and matches Hevy's praised free charts — users
    "expect to see their own data" (6.3 VERIFIED).
  - Recap shipped without a hard paywall. YearOfLifts/Recaps register as free
    routes, data-gated upstream, not Pro-gated (09:279). This is exactly the
    pattern the research endorses after Strava's paywall backfired (4.3, 6.3
    VERIFIED).
  - Smoothed trend weight already implemented (EWMA + robust smoother, neutral
    non-valenced delta badges, rate-of-change suppression under ED flag —
    09:186-188,197). This is the single least-patronising plateau tool and the
    safe way to show daily weight (2.3, 5.1, 7.3 VERIFIED) — the MacroFactor/Happy
    Scale best-in-class behaviour.
  - Adaptive TDEE that responds to the trend already exists (09:188) — the
    MacroFactor "plateau triggers an action, not a platitude" behaviour (5.1
    VERIFIED).
  - Self-compassionate, ED-aware framing is built in: calm-mode re-confirmation,
    neutral deltas, deload banners, factual-only share payloads, neutral recap
    framing under calm/ED flags (09:196-197,72,280). This aligns with the proven
    Gentler-Streak model and directly answers the research's safety-adjacent
    caution about goal-gradient/loss-aversion compulsion (5.4, 7.2 VERIFIED;
    7.2's ED-study figures are PARTIAL).
  - Combined gym + volume + body-composition + recap on one progress surface —
    the unmet "one place not three apps" want (6.2 VERIFIED).

WHERE WE LAG:
  - No live mid-session PR celebration / confetti. The research calls live PR
    detection + confetti "now table stakes" (Hevy live PR, RepCount auto-confetti,
    FitPros recap cards — 4.2 VERIFIED). Volyume surfaces PRs statically (a "PR"
    tag and a landing PR sparkline, 09:35,110) and shares a PR via long-press, but
    there is no in-the-moment celebration moment in the inventory.
  - Jargon-heavy newbie experience vs the research's sub-30s-first-value and
    encouragement-framed-empty-chart standard (3.1, 3.3 VERIFIED). The landing is
    "tends cluttered when all optional sections render together" (09:57) against
    the explicit finding that a cluttered dashboard is a top complaint (6.1
    VERIFIED).
  - The motivating smoothed weight curve sits behind the Pro Body Metrics gate
    (09:196) while the research frames the smoothed trend as the difference between
    a newbie quitting and continuing (2.3 VERIFIED) — a tension with the free-chart
    advantage above (note: this is a gating-policy observation, not a recommendation;
    weight tracking is a Pro feature under the product's own free/Pro split).
  - No fast history import/backfill for experienced users — the cold-start the
    research names as the athlete's churn risk (3.1, 3.2 VERIFIED); absent from the
    Phase-1 inventory.

MISSING ENTIRELY:
  - Progress photos. No progress-photo capability appears anywhere in the Phase-1
    progress inventory. The research rates photos as beating the scale for
    emotional reinforcement, the most legible early newbie win, and the
    recomp/contest-prep truth when scale weight is flat (2.2, 5.2 VERIFIED), and
    a body-composition study found visual-progress trackers stayed more consistent
    than weight-only trackers (2.2 VERIFIED). This is the single largest absent
    feature for this area.
  - Live PR confetti / animated achievement moment (4.2 VERIFIED) — see WHERE WE LAG.
  - XP / level-up progression systems (PR Workout Tracker Beginner→Legend, 4.2
    VERIFIED). Volyume has strength-standing LEVEL BADGES (Beginner→Elite,
    09:107) but these describe relative strength, not a gamified XP economy — and
    the research's own safety caution (7.2) argues against importing the
    compulsion-driving version.
  - Wearable readiness/recovery daily scores of the WHOOP/Oura/Apple kind (1.4
    VERIFIED). Volyume has its own ReadinessCards and ACWR (09:74,110) but no
    device-readiness-score integration is in this inventory (wearable integration
    is a separate Pro surface per project gating, outside this area's files).

USER SENTIMENT (what users want that no app fully nails):
  - The upward strength line over months is what users say keeps them training,
    and they churn when it's absent or paywalled — "the thing that had kept me in
    the gym this year" (2.1, 6.3 VERIFIED; verbatim research-06:385-388).
  - Don't strip tracking depth or clutter the dashboard in redesigns — a top
    repeated complaint, with Fitbit's redesign cited (6.1 VERIFIED; rep/rest-removal
    sub-claim PARTIAL).
  - One combined progress view across gym + cardio + bodyweight + composition,
    not three siloed apps (6.2 VERIFIED).
  - Support framed as company, never condescension — Noom's "what would Michael
    Jordan say?" weigh-in nudge and traffic-light system were called condescending
    (5.3 VERIFIED).
  - A loud minority want OUT of compulsive metrics entirely: named users quit the
    Apple Watch — "This is not healthy. This is something I'm consumed by" — and
    moderate ring use was protective while obsessive use was harmful (7.2 VERIFIED;
    the 2017/2023 ED-study figures and one AOL quote are PARTIAL).

VERIFICATION STATUS: This block leans predominantly on VERIFIED findings. The
  following supporting claims are PARTIAL or carry a PARTIAL sub-claim and must not
  be read as fully verified:
  - The "cluttered dashboard / removed rep + rest tracking" complaint: the
    dashboard-clutter claim is VERIFIED, but the rep/rest-removal sub-claim is
    PARTIAL (single secondary source) (6.1 / research-06:312).
  - The goal-gradient/loss-aversion COMPULSION evidence (7.2): the qualitative
    quotes and the protective-vs-harmful framing are VERIFIED, but the 2017
    *Eating Behaviors* and 2023 step-count study figures are relayed second-hand
    via Fortune and are PARTIAL; one AOL user quote 404'd and is PARTIAL
    (research-06:362-364,398).
  - The Forrester "35% lower 30-day churn" streak stat (4.1) is PARTIAL (second-
    hand) — not relied on in this block but noted for completeness.
  - Q1.5 micronutrient/measurement-frequency "NEVER" inference is PARTIAL +
    INTERPRETATION (research-06:125-129) — not load-bearing here.
  All BEST IN CLASS entries, the free-charts gap (6.3), photos (2.2/5.2), smoothed
  trend (2.3/5.1/7.3), live PR table-stakes (4.2), recap/paywall (4.3), Gentler-
  Streak compassion model (5.4), empty-state/first-week churn (3.1/3.2/3.3) and
  combined-view want (6.2) are VERIFIED.


<!-- ==== phase3/compare-07-onboarding.md ==== -->

# Phase 3 comparison — 07 · Onboarding & first-time experience

AREA: Onboarding & first-time experience

VOLYUME CURRENT:
Volyume routes signed-out users to WelcomeScreen (RootNavigator.js:1117), a
two-tier chooser with Pro visually dominant: hero wordmark, tagline "Less
thinking. More lifting.", a Pro card ("Free for 14 days", 4 bullets) and a Free
card, plus a trust row "Works fully offline · Exports anytime · No ads, ever"
(11-onboarding-auth.md, WelcomeScreen.js:55–163). A quiz-first funnel is LIVE
(`ONBOARDING_QUIZ_FIRST = true`, quizFlow.js:22): the Pro CTA goes
Welcome → QuizScreen (pre-account, chip-based, answers held in-memory only and
never persisted/transmitted, QuizScreen.js docstring 1–12, 48) → PlanPreview →
account wall (11-onboarding-auth.md, ONBOARDING ORDER section). LoginScreen is a
combined sign-in/create-account surface with OAuth above the form; "Continue
without an account" was deliberately removed — there is no anonymous mode
(LoginScreen.js:327–331; WelcomeScreen.js:48–54). Every new account is flipped to
`tier='pro'` (LoginScreen.js:168) and passes through the Article 9 health-data
consent gate, where the 14-day Pro trial is actually granted via
`cascade.startCascade()` (Article9ConsentScreen.js:100–117; RootNavigator.js:1102).
Pro users then get a 5-step guided wizard (account → profile → training logistics
→ goal → recovery/reminders) with an endowed-progress bar (base 12%), "Step X of
5" counters, disciplined 3–5 fields per step, quiz-prefill, and an honest staged
"Building your plan" overlay tied to real generation phases with a 3.2s min dwell
(ProOnboardingScreen.js:50, 196–210, 451–497, 766–807). It ends on
ProSetupCompleteScreen — the reveal: the actual generated plan, a real kcal ring,
macro bars, division/phase chips and a "Why this plan, for you" rationale, framed
as a numbered 1–4 daily routine (ProSetupCompleteScreen.js:138–319). Free users
instead get FirstRunScreen (name + forced-kg units) → FreeStarter
(FirstRunScreen.js:38, 49–101). ImportScreen (Hevy/Strong CSV) lives in the
Profile tab, NOT in the first-run chain (RootNavigator.js:397).

BEST IN CLASS:
- Long-but-valuable onboarding — Noom: ~77–113 screens / 10–15 min that still
  convert because "Length isn't the enemy; emptiness is" — acknowledgement copy on
  nearly every screen, an updating weight-loss projection date, section progress
  bars and inline education (green/yellow/red food teaching inside the questions).
  Status: VERIFIED — growthwaves.substack.com/p/the-113-screen-onboarding-that-doesnt ;
  thebehavioralscientist.com/articles/noom-product-critique-onboarding
- Value-before-signup / fastest time-to-value — Duolingo: lazy registration, a
  translation exercise delivers the aha in 3–4 minutes before any account is asked
  for. Status: VERIFIED —
  medium.com/@kotarina832/building-effective-onboarding-experiences-lessons-from-duolingo-7aa2af536020
- Fastest expert onboarding — Hevy: account created and first set logged in under
  90 seconds, the cleanest in the logging category. Status: VERIFIED —
  repreturn.com/hevy-app-review/
- Non-condescending level handling — Fitbod (ask experience level then the
  forward-looking weekly goal) and Freeletics (declared level matters less because
  per-workout feedback recalibrates, so a wrong choice self-corrects). Status:
  VERIFIED — fitbod.me/blog/... ;
  fitnessnav.com/insights/madmuscles-vs-fitbod-vs-betterme-vs-freeletics/
- Tangible intelligence artefact as the aha — Fitbod muscle-recovery map built
  from the user's inputs. Status: VERIFIED — autonomous.ai/ourblog/fitbod-app-review
- Beginner intimidation defused — Couch to 5K: run/walk intervals "without asking
  you to run nonstop on day one". Status: VERIFIED — en.wikipedia.org/wiki/Couch_to_5K
- Non-shaming tone as credibility + safety — MacroFactor: "never see warnings, red
  numbers, or shaming". Status: VERIFIED —
  apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471

TOP 50 RANGE:
A wide spectrum across the ~20 VERIFIED-behaviour apps. At the minimal/fast end,
Hevy (<90s to first log) and MyFitnessPal (minimal onboarding) optimise for
speed-to-tool but MFP "drops [beginners] into the app with little guidance" (both
VERIFIED). At the long/value-dense end sit Noom (~77–113 screens), Me+ (~45–50
screens / 7–10 min) and Lose It! (which lengthened onboarding and saw trial starts
rise "double digits") — long flows that convert because every screen returns value
(all VERIFIED, RevenueCat teardown). The generic-friction literature pulls the
other way: completion drops 72%→16% between 3 and 7 steps, and the data-gathering
rule-of-thumb is 7–8 screens (VERIFIED). Mid-spectrum: Freeletics/BetterMe/8fit
(detailed quiz → template plan), Fitbod (level+goal → recovery map), Headspace
(experience/goal → personalised plan recap as the aha), and coach-matched flows
(Ladder, Caliber, Future). The clear anti-pattern is Nike Training Club's bare
3-box beginner/intermediate/advanced segmentation with no follow-up, reviewed as
"one-size-fits-all" (VERIFIED). Whoop sits at the "too dense" extreme (PARTIAL).

NEWBIE VERDICT:
Mixed-to-good, with jargon as the recurring beginner tax. Volyume hits several
beginner best-practices: the quiz uses plain-language chips ("New to lifting",
"Full gym"), the Free path is deliberately minimal (one name field, FirstRunScreen),
and ProSetupComplete is the strongest newbie screen of the set — numbered "log your
weight / hit your targets / train your split / check in" steps plus an explicit
"New to calories and macros? 5-minute guide" ramp (ProSetupCompleteScreen.js:222–227).
That maps onto F.6.1 (newbies need simple wins, low intimidation) and F.5.2
(personalised plan preview as aha). But jargon arrives before any explanation:
"Precision Coaching™" and "division-specific" appear on Welcome before a beginner
has context (WelcomeScreen.js:25, 66), and ProOnboarding step 4 asks competition
phase (cut/lean-gain/maintain), divisions and protein "optimised/advanced", plus
body-fat methods (BIA/caliper/DEXA), which "assume knowledge a true beginner lacks"
(11-onboarding-auth.md:206) — the opposite of F.3.5 (translate science into the
user's own units) and F.6.1 (no jargon). The QuizScreen heading "Eight quick
questions" mismatches the 5–6 actual asks (11-onboarding-auth.md:138), a small
trust dent against the first-impression physics of F.7.1.

ATHLETE VERDICT:
Strong — this is where Volyume's depth shows. ProOnboarding gives an experienced
competitor exactly the levers F.6.3 says they want immediately: division selection,
weak-point prioritisation (max 3), protein-approach override with ranges, recovery
rating feeding plan volume, and body-fat % + method feeding Katch-McArdle BMR
(11-onboarding-auth.md:207). ProSetupComplete then delivers the credible
data-artefact aha F.5.5/§5 describes — a named split, workout count, per-decision
rationale and macro composition that prove the plan was built to spec
(11-onboarding-auth.md:244). The honest staged build overlay (real phases, min
dwell that never finishes before the work) is genuine operational transparency
(F.3.2), not a mirage. Gaps for the athlete: the pre-account quiz is shallow (3
experience bands, no weak-point/division depth) so the "your plan takes shape as you
answer" promise leans entirely on the preview (11-onboarding-auth.md:140); and the
experience-band mismatch (3 bands in QuizScreen vs 4 incl. "Competitive" in
ProOnboarding) can carry a value the other side never offered (11-onboarding-auth.md:138,
205). Volyume does NOT recalibrate from per-workout feedback at onboarding the way
Freeletics does (F.1.4) — its adaptation is the deterministic coaching engine, a
different mechanism.

WHERE WE LEAD:
- Value-before-signup quiz-first funnel: Welcome → QuizScreen → PlanPreview runs
  the entire teaser BEFORE the account wall, with answers in-memory only and never
  transmitted (11-onboarding-auth.md ONBOARDING ORDER; QuizScreen.js:48). This is
  exactly the Duolingo lazy-registration / aha-before-signup pattern (F.5.3,
  VERIFIED) and directly counters the top abandonment triggers — forced signup and
  early data/permission demands (F.4.2–4.3, VERIFIED).
- Honest operational transparency: the staged "Building your plan" overlay is tied
  to real generation phases with a min dwell, never completing before the work is
  done (ProOnboardingScreen.js:451–497). Noom's labour-illusion works but its own
  critique warns it "can be a mirage" (F.3.2, VERIFIED); Volyume's is real.
- Real plan-preview aha artefact: ProSetupComplete shows the actual generated plan,
  kcal ring, macros and per-decision rationale (11-onboarding-auth.md:241,244) —
  the personalised-plan-preview aha (F.5.2, VERIFIED) and the credible-artefact aha
  an athlete needs (F.5.5/F.6.3, VERIFIED).
- Endowed-progress bar + "Step X of 5" counters across the Pro wizard
  (ProOnboardingScreen.js:766–807): progress indicators lift completion of longer
  flows by ~22% and predictability reduces abandonment (F.2.5, F.7.2, VERIFIED).
- Non-shaming / empathy-aligned design and an explicit ED-safety stance: matches
  MacroFactor's "no shaming" credibility lever (F.3.4) and Noom's vulnerable-input
  empathy (F.7.4), both VERIFIED, and the research itself notes this maps onto
  Volyume's CLAUDE.md ED-safety requirement.

WHERE WE LAG:
- Jargon before explanation on the first screen ("Precision Coaching™",
  "division-specific" on Welcome; phase/division/protein-tier and BIA/caliper/DEXA
  in ProOnboarding step 4): violates F.3.5 (translate into the user's own units)
  and F.6.1 (no jargon for newbies, VERIFIED). Best-in-class teaches science inside
  the questions (Noom green/yellow/red, F.3.1) rather than naming it cold.
- No adaptive/recalibrating level handling at onboarding: Freeletics removes the
  pressure of self-labelling by recalibrating from per-workout feedback (F.1.4,
  VERIFIED); Volyume asks a fixed experience band and the bands even differ between
  quiz (3) and wizard (4) (11-onboarding-auth.md:138, 205).
- Quiz heading/content mismatch ("Eight quick questions" vs 5–6 actual; session
  length/equipment not in the ready-gate) dents the first-impression credibility
  F.7.1 prizes (11-onboarding-auth.md:138, VERIFIED mechanism).
- No just-in-time progressive disclosure for the dense steps: ProOnboarding step 5
  and ProSetupComplete are flagged information-dense (11-onboarding-auth.md:205, 242);
  F.3.3 (progressive disclosure / tooltips) is the named anti-overwhelm pattern
  (VERIFIED), and Whoop's density is a cited downside (PARTIAL).
- Speed-to-tool for experienced free loggers is not Hevy-fast: the no-anonymous-mode
  rule forces account creation before logging, where Hevy reaches first set in <90s
  (F.6.3, VERIFIED). (Volyume's signup wall is a deliberate backup/sync decision per
  LoginScreen.js:270–277, not an oversight.)

MISSING ENTIRELY:
- Behaviour-based recalibration of the declared level during onboarding (Freeletics,
  F.1.4 VERIFIED) — not present; Volyume's adaptation is the post-onboarding
  deterministic engine.
- Coach-matched / pick-a-coach-or-style onboarding (Ladder, Caliber, Future; F.1.5
  VERIFIED/PARTIAL) — absent; Volyume has no human-coach or coach-persona selection
  step.
- An updating live projection during the intake (Noom's moving goal date, F.5.4
  VERIFIED) — Volyume's "your plan takes shape as you answer" promise is delivered as
  a single PlanPreview/ProSetupComplete reveal, not a continuously updating figure.
- Acknowledgement/empathy micro-copy on individual intake answers (Noom "Thank you
  for sharing…", F.7.4 VERIFIED) — Volyume's screens are clean but do not respond to
  each input.
- A branching short-core-plus-optional-deep-intake structure (the INTERPRETATION
  recommendation in §2/§5, explicitly NOT a single sourced claim) — Volyume instead
  branches by tier (Free quick-setup vs Pro 5-step wizard), not by a skippable depth
  toggle.
- Onboarding-time offer of the Hevy/Strong import: ImportScreen exists but lives in
  Profile, outside the first-run chain (11-onboarding-auth.md:312, 318) — a
  switching-cost/migration moment is not surfaced during onboarding.

USER SENTIMENT:
The research's clearest unmet desire is for an onboarding that serves BOTH a
beginner and an expert without one flow shortchanging the other — "the same app
rarely serves both with one flow" (Lose It! friendlier vs MyFitnessPal depth-first,
F.6.4 VERIFIED): beginners want reassurance and a skippable, jargon-free path while
experienced users want <90s to the tool and immediate depth (F.6.1/F.6.3). Reviewers
also voice fatigue at density (Whoop "the information and features are densely
presented", PARTIAL) and at hollow segmentation (Nike Training Club "shoves you into
one of three boxes… no personal touch", VERIFIED). No researched app fully resolves
the dual-audience tension — that gap is the standing user want this area documents.

VERIFICATION STATUS:
This block leans predominantly on VERIFIED findings (Q1–Q7 are each VERIFIED with a
named source; Fitbod, Freeletics, Noom, Duolingo, Hevy, MacroFactor, Couch to 5K,
Nike Training Club, MyFitnessPal, Lose It!, Me+, Headspace all VERIFIED). The
following load-bearing items carry weaker status and are flagged:
- Whoop density complaint — PARTIAL (the5krunner review).
- Coach-matched onboarding — Ladder/Caliber VERIFIED, but Future is PARTIAL.
- The "branching short-core + optional-deep-intake" structure cited under MISSING
  ENTIRELY is INTERPRETATION in the source (§2/§5), NOT a single sourced claim, and
  is carried as such.
- The verbatim user-voice gap: raw first-person onboarding-abandonment quotes were
  NOT FOUND / PARTIAL (research §6); the abandonment statistics (F.4) are the
  load-bearing evidence, and the USER SENTIMENT section leans on those mechanisms
  plus the VERIFIED MFP/Lose It!, NTC and (PARTIAL) Whoop reviews rather than on
  primary onboarding-fatigue threads.


<!-- ==== phase3/compare-08-exercise-library.md ==== -->

# Phase 3 comparison — Exercise library & technique guidance (2026-06-13)

Sources reconciled:
- VOLYUME CURRENT: `docs/ultimate-audit-2026-06-13/phase1/10-share-exercise.md` (ExerciseDetail section, ExerciseDetailScreen.js file:line-grounded).
- MARKET: `docs/ultimate-audit-2026-06-13/phase2/research-08-exercise-library.md` (statuses + source URLs carried verbatim).

```
AREA: Exercise library & technique guidance

VOLYUME CURRENT: The per-exercise home is ExerciseDetailScreen. It carries a genuinely deep data profile — tag chips for primary/secondary muscle, subregion, equipment, compound vs isolation, difficulty (ExerciseDetailScreen.js:306-377); estimated max with an InfoTooltip; SFR Quality/5 and Fatigue/5 with tooltips; rep range (346-374); three PR surfaces (Est. max / Heaviest set / Best set / Most reps) split across a "Personal bests" highlight card (380-425) and an "All-time bests" list (602-625); a settable strength-target goal with progress bar, auto-detected achievement and a Reduce-Motion-respecting congrats banner (436-482, 427-433); plateau detection banner (486-494); a windowed strength-trend line chart with Max-weight vs Est-max (Epley) toggle and a plain-language takeaway (497-560); recent session history (563-589); horizontally-scrolling similar-exercise swaps that push to ExerciseDetail itself (628-661, 642); a one-line coaching cue card (663-670); and a written "How to do it" section. Technique guidance is TEXT-ONLY: "How to do it" renders `formTip ?? exercise.notes` where `formTip = FORM_TIPS[exercise.name]` (246, 672-679) — a multi-sentence prose paragraph keyed by exact exercise name in src/lib/formTips.js; if neither a FORM_TIPS entry nor a notes value exists, the whole section is omitted (672). There is NO image, illustration, GIF, animation or video anywhere on the screen — the file imports no Image component; the only graphics are Ionicons glyphs, emoji medals (608-609) and the strength-trend chart (ExerciseDetailScreen.js:164 finding, citing imports 1-31). No safety/contraindication or common-mistakes guidance beyond the prose tip (163).

BEST IN CLASS:
  - Layered demonstration unit — Jefit / Hevy: short HD video clip + named target muscles + step text per exercise. Hevy clips earn "Amazing quality videos"; Jefit pairs HD video with steps + muscle targeting. https://www.gymbird.com/fitness-apps/fitbod-vs-jefit (Jefit, PARTIAL); https://www.hotelgyms.com/blog/hevy-workout-app-review-the-up-and-comer-taking-the-fitness-world-by-storm (Hevy App Store reviews via aggregator, PARTIAL). Why it works: a 3–6s looping rep clip is the highest-engagement instructional unit and "shorter is better" (NN/g, https://www.nngroup.com/articles/instructional-video-guidelines/ — VERIFIED).
  - Anatomy/education layer — Muscle & Motion: 3D anatomical animation of primary/secondary muscle activation across 1,200+ moves; the benchmark for "what am I working", a distinct layer from form video. https://www.muscleandmotion.com/strength-training-app/ — VERIFIED.
  - Targeted advanced cueing — Caliber: breakdowns of complex lifts (deadlift/bench phases) that even experienced users praise. https://wellness.alibaba.com/fitlife/caliber-app-coaching-vs-cost-guide — PARTIAL.
  - Curated-not-bloated — JuggernautAI: deliberately ~300 exercises, each with video + cues; counter-evidence that bigger is always better. https://declom.com/juggernautai — PARTIAL.

TOP 50 RANGE: From media-rich at the top (Jefit 1,400+ HD video demos VERIFIED; Muscle & Motion 1,200+ 3D anatomical animations VERIFIED; Fitloop claims 1,000+, Load Muscle claims 4,000+ with video — both PARTIAL) through curated-but-complete (JuggernautAI ~300 each with video + cues, PARTIAL) and form-light (Fitbod 400+ video demos but "didn't give enough form guidance", PARTIAL) down to logging-focused apps with no surfaced demo content (Strong, FitNotes — NOT FOUND). Demo-source catalogues span ~200 (MoveKit 3D, VERIFIED) to 11,000+ (ExerciseDB, VERIFIED). No sourced consensus completeness number; observed competitive band is ~1,000–1,500 exercises with the common lifts fully covered (Jefit 1,400+, Fitbod ~1,000, Fitloop 1,000+, wger 845, JuggernautAI 300+) — PARTIAL, https://trustyspotter.com/blog/best-workout-apps-reddit/.

NEWBIE VERDICT: Partly served. Volyume's InfoTooltips, plain stat labels and the written "How to do it" steps are beginner-friendly WHEN present (Phase-1 NEWBIE finding, tooltips at 350/359/367). But a first-time gym-goer gets NO picture, diagram, GIF or video to copy a movement from — text like "elbows at roughly 45–75° from your torso" assumes vocabulary a beginner may lack, and for any exercise without a FORM_TIPS entry there is no guidance at all (672, ExerciseDetailScreen.js:118 finding). This is the documented failure mode: demo-only/text-only is a known churn cause and newbies want demonstration PLUS cue text (Fitbod users "felt the exercise demonstrations didn't give enough form guidance", https://fitnessdrum.com/fitbod-review/ — PARTIAL). Terms like Est. max, SFR/Quality/Fatigue, plateau, Epley formula lean advanced despite tooltips.

ATHLETE VERDICT: Strongly served on data. Est. 1RM via Epley, heaviest/most-reps PRs, SFR quality/fatigue, plateau detection, date-windowed weight-vs-e1RM trend and ranked swaps are exactly what an experienced competitor wants (Phase-1 ATHLETE finding, 105/120). Market evidence says athletes are less format-sensitive and often skip demos, wanting guidance absent from the default flow but retrievable (NN/g, VERIFIED) and breakdowns only for complex/skill lifts (Caliber, PARTIAL) — so Volyume's text-only form section being last and easily skipped is acceptable for them. The screen carries no competition-specific framing (e.g. division standards), which the Phase-1 finding flags (120).

WHERE WE LEAD:
  - Depth of decision-useful analytics per exercise — est. max, three PR types, SFR quality/fatigue, plateau detection, windowed trend with weight/e1RM toggle and a plain-language takeaway (Phase-1 CURRENT STRENGTHS, ExerciseDetailScreen.js:105). The market core (Jefit/Hevy/Fitbod) is demo-centric; none of the researched apps is documented carrying this analytics depth on a single exercise screen (research fragment surfaces no equivalent — gap is absence-of-finding, not a sourced "they lack it").
  - A built-in goal loop (set/edit/remove, auto-detect achievement, progress bar, congrats banner) on the exercise itself (107) — not surfaced for any researched competitor.
  - Newbie scaffolding via conceptual InfoTooltips on est. max / Quality / Fatigue (106) — aligns with the verified principle that cues should accompany the unit, though Volyume's are conceptual not movement cues.

WHERE WE LAG:
  - NO visual demonstration of any kind (Phase-1 TECHNIQUE/FORM finding, ExerciseDetailScreen.js:164). Best-in-class ships short looping HD clips (Jefit/Hevy — PARTIAL/VERIFIED) and the strongest verified UX evidence is that a short immediately-looping clip is the highest-engagement instructional unit (NN/g — VERIFIED). This is Volyume's single biggest gap in this area.
  - No anatomical "what am I working" visual layer; Volyume states muscles as text chips only. Muscle & Motion's 3D activation animation is the benchmark for this distinct layer (VERIFIED).
  - Form guidance is brittle and conditional: only present when the exact exercise name matches FORM_TIPS or carries a notes field, otherwise omitted entirely (672). Market evidence says demo-only / insufficient-form-guidance is a churn cause (Fitbod, PARTIAL) — Volyume's text-only-and-sometimes-absent guidance is weaker still.
  - No common-mistakes / safety / contraindication guidance beyond the prose tip (Phase-1, 163).

MISSING ENTIRELY:
  - Any demonstration media — video, GIF, illustration, 3D animation (ExerciseDetailScreen.js:164). Present across the demo-source market (MuscleWiki video, ExerciseDB video/GIF, GymVisual 2D, MoveKit/ExerciseAnimatic 3D — all VERIFIED licences).
  - Tap-to-watch demo retrievable on demand during a set (the verified ideal: text + tap-to-watch, never forced/auto-blocking — NN/g VERIFIED). Volyume has neither the demo nor the affordance.
  - Anatomical muscle-activation animation layer (Muscle & Motion model, VERIFIED).
  - A custom-exercise path is NOT DETERMINED here — the research names it as part of the winning library spec (INTERPRETATION, PARTIAL) but the Phase-1 fragment covered only ExerciseDetail, so whether Volyume offers custom-exercise creation is out of scope of the read files (not evidenced either way).

USER SENTIMENT: The thing users want that the research could not confirm any app nails is raw, comparative format preference — direct Reddit/App-Store user voice on which demonstration format (video vs animation vs photo) lifters engage with most, and when guidance gets in the way for experienced lifters, was NOT FOUND as raw threads (research COVERAGE FLAG + §6 FLAGS). Sourced sentiment that exists: users resent video being the SOLE path to information and want text + tap-to-watch ("I wouldn't start with a video first… I like to read first" — NN/g, VERIFIED); format CONSISTENCY matters more than format choice, mixed styles read as low-quality (MoveKit, VERIFIED); and AI-generated demos are accepted as a category but not reliably perceived as premium, with the strongest captured user reaction to an AI fitness feature being dismissive — "more like a meme than anything" / "pointless" (Strava AI coach, VERIFIED) — plus documented body-image harm concerns relevant to Volyume's ED-safety posture (PARTIAL conclusion).

VERIFICATION STATUS: NOT all-VERIFIED. This block leans on the following non-VERIFIED items:
  - PARTIAL: Jefit and Hevy demo-quality praise (aggregator/App-Store-via-aggregator); Fitbod "didn't give enough form guidance" churn finding; Caliber advanced-cueing praise; JuggernautAI curated-library count; the ~1,000–1,500 baseline completeness band; Load Muscle / Fitloop library claims; the "AI demos not reliably premium" conclusion.
  - NOT FOUND: raw user voice on demonstration-FORMAT preference (video vs animation vs photo) and "experienced lifters find tutorials get in the way" — the area's core qualitative question; photo-format preference; exact ExerciseDB/Hyperhuman pricing.
  - VERIFIED: the NN/g UX principles (shorter-is-better, video-as-sole-path resented, read-first user, unfamiliarity drives demand); Muscle & Motion 3D anatomical animation; MoveKit consistency finding; demo-source licence facts; Strava AI "meme/pointless" user quotes.
  - Labelled INTERPRETATION carried (not promoted): video + animation as two distinct layers; custom-exercise path as part of the library spec; one-time/perpetual on-device assets as the offline-first fit.
```


<!-- ==== phase3/compare-09-retention.md ==== -->

# Phase 3 comparison — Retention mechanics & habit formation

> Sources reconciled (read in full):
> - VOLYUME CURRENT: `docs/ultimate-audit-2026-06-13/phase1/03-home.md` +
>   `docs/ultimate-audit-2026-06-13/ultimate-audit-00-navigation-psychology.md`
> - MARKET: `docs/ultimate-audit-2026-06-13/phase2/research-09-retention.md`
>
> READ-ONLY reconciliation. No new web research. MARKET claims carry the status
> they hold in the research fragment (VERIFIED / PARTIAL / NOT FOUND). British English.

---

AREA: Retention mechanics & habit formation

VOLYUME CURRENT:
- **Habit loop — cue (notification) → routine (log) → reward.** Volyume runs a typed
  push-notification system with deep-link routing per type: `weekly_checkin`,
  `year_of_lifts_unlock`, `monthly_recap`, `cascade_gate`, `weekly_coach_ready`,
  `winback`, `partner_cheer`, `checkin_missed`, `trial_day3`
  (`ultimate-audit-00-navigation-psychology.md:166-176`, helper `notificationRoute.js:20-65`).
  Per-category notification controls exist as a destination (`SettingsNotifications`
  `RootNavigator.js:377`; `NotificationSettings` `:396`; `CoachingReminders` GATED `:398`).
- **Day-1 meaningful first action.** Free first-run routes through the `FreeStarter`
  three-question micro-quiz that installs + activates a difficulty-0 starter plan so
  the user "lands on Home with today's session already answered"
  (`03-home.md:81`, `ultimate-audit-00-navigation-psychology.md:234`,
  `RootNavigator.js:472-475`). Home's hero gives a single prominent "Start workout"
  CTA — the only amber-filled button in the primary area (`03-home.md:42, 75`).
  Pro path gets a first-run hero variant: "First session: a short one… About 15 minutes"
  (`03-home.md:27`).
- **Visible / interpreted progress as the anchor.** Home surfaces a last-session recap
  card (duration, set count, total volume kg) with a one-tap "Repeat" pill
  (`03-home.md:36`); a "Your progress at a glance" stats card (sessions this week +
  relative last-session day) (`03-home.md:31`); a Pro `TodayStrip` (weight sparkline,
  steps, cardio) (`03-home.md:34`); and a free weekly coach one-liner built from
  sessions-this-week + weight direction (`03-home.md:23`). A dedicated `Consistency`
  screen exists in ProgressTab (`ultimate-audit-00-navigation-psychology.md:112`).
- **Tenure / milestone unlocks (the code-grounded ones).** Monthly recap unlocks at
  `RECAP_GATE = 10` logged sessions; Year of Lifts unlocks at 365 days of history
  (`ultimate-audit-00-navigation-psychology.md:243-244`). A monthly-recap "ephemeral
  card" shows for the first 7 days of each calendar month (`:238`).
- **Trial-period engagement scaffolding.** A trial value-countdown banner runs Pro trial
  days 2–7 when no coach output exists yet (`03-home.md:21`); a `trial_day3` "day-3 value
  moment" notification routes to WeeklyCheckIn (S1/S2) or Home (S3)
  (`ultimate-audit-00-navigation-psychology.md:236`). A `winback` notification handles a
  +30-day post-lapse re-engagement (`:240`).
- **Social / accountability surface (limited).** A single `Partner` "Training partner"
  screen exists in ProgressTab (`ultimate-audit-00-navigation-psychology.md:113`), reached
  via a `partner_cheer` notification (`:174`) and a Consistency tile. No broader
  community/feed/leaderboard surface appears in the read files.
- **Streaks:** **NOT DETERMINED IN CODE.** No streak counter, streak-freeze, or unbroken
  daily-chain mechanic appears in the read fragments. The nearest construct is the
  `Consistency` screen and "sessions this week" framing
  (`03-home.md:31`, `ultimate-audit-00-navigation-psychology.md:112`) — i.e. weekly
  adherence, not a daily streak. (Phase-1 read scope did not include a streak module;
  treat as not-evidenced rather than confirmed-absent.)

BEST IN CLASS:
- **Streak design — Duolingo.** Loss-aversion streak softened by Streak Freeze / grace
  periods; leniency raised DAU and the Streak Freeze cut at-risk churn ~21%. The model:
  make consistency rewarding, never punitive, with safety nets.
  https://trophy.so/blog/the-psychology-of-streaks-how-sylvi-weaponized-duolingos-best-feature-against-them — **VERIFIED** (F5.2)
- **Frictionless logging + generous free tier — Hevy.** Fastest logging tested, full value
  free (unlimited logging, full library, routines, charts), social layer; produces
  years-long retention ("can never go a workout without using it").
  https://www.hevyapp.com/reviews/ — **VERIFIED** (F3.1)
- **Community / network moat — Strava.** Retention ≈ the social graph + challenges (5.3M
  annual challenge participants) + open API (44k integrations) raising switching cost.
  https://skywork.ai/skypage/en/Cracking-the-Code:-A-Comparative-Analysis-of-User-Retention-in-North-America's-Fitness-App-Market/1951142806455160832 — **VERIFIED** (F3.3)
- **Beginner onboarding through the cliff — Zombies, Run! / C25K / Nike Training Club.**
  Narrative + graded structure + coaching cues get non-exercisers past days 1-3 into a
  habit. https://au.reachout.com/tools-and-apps/zombies-run-5k-training — **VERIFIED** (F8/F9.2)

TOP 50 RANGE:
The researched set spans (a) the **canonical habit/streak case** (Duolingo — lenient
streaks, freezes) at the top of streak design; (b) **frictionless-logging + generous-free
trackers** that retain for years (Hevy, Strong, FitNotes) where speed of the routine is the
whole moat; (c) **community/network apps** whose retention is the social graph
(Strava, Peloton, Zwift ≈ 3x retention vs solo); (d) **gamified-goal apps** that retain
until the frontier flattens then churn (Fitbit — "10,000 steps for a year" plateau); (e)
**adaptive-personalisation apps** that retain *only if* the user survives the cold-start
window (Fitbod — needs ~10-15 workouts, "struggles to retain beyond the first seven");
(f) **narrative/guided beginner apps** that carry non-exercisers past the cliff but leave a
motivation gap when the plan ends (Zombies Run, C25K, Nike Training Club); and (g) the
**logging-fatigue casualties** at the bottom (MyFitnessPal — "most quit within two weeks",
paywall-driven churn). Benchmark spread: health & fitness median D1 ~25% / D7 ~10% /
D30 ~5%; strong performers (75th pct) D1 35-45% / D7 15-22% / D30 8-12%; AppsFlyer cites
fitness D30 as low as 2.78% (F7.1, **VERIFIED**).

NEWBIE VERDICT:
Strong on the single most-predictive metric: Volyume gets a beginner to a meaningful Day-1
action (the FreeStarter quiz pre-seeds today's session; Home's unambiguous "Start workout"
hero) — exactly the "log one real workout in session one" lever that predicts D30 retention
at 2-3x (F1.2, F8.1, **VERIFIED**). Coaching scaffolding (free weekly coach line, trial-day
banners) provides an external cue + interpreted reward, which is what a newbie needs (F1.3,
F9.2). Two soft spots from Phase-1: (1) coaching vocabulary is unexplained at a glance —
"Deload week", "stop R short of failure" (RIR), "Recovery week suggested"
(`03-home.md:52`) — and newbie-relevant functions sit behind athlete terms
("Precision Coaching™", "Mesocycle", "Volume"/MRV)
(`ultimate-audit-00-navigation-psychology.md:262-273`); the market evidence says newbies
need the result *surfaced and interpreted*, not raw jargon (F1.4, F9.1, **VERIFIED**). (2)
No visible streak/consistency *reward* mechanic to scaffold the habit through days 1-3 and
the cold-start window where the cliff bites hardest (F7.2, **VERIFIED**).

ATHLETE VERDICT:
Well-served on the data-first anchors that retain athletes long-term: last-session tonnage
in kg, mesocycle week/RIR context chip, block-shape sheet, Today strip, Precision Coaching
review (`03-home.md:53`), plus a Consistency screen, Lifts, Volume heatmap and Year of Lifts
in ProgressTab (`ultimate-audit-00-navigation-psychology.md:111-115`). This matches the
"accumulated personal data + visible progress = switching cost" anchor (F1.4, F3.1,
**VERIFIED**). The market's athlete caveats Volyume should note: athletes want **export** of
history (no export surface evidenced in the read files beyond an `Import` screen
`ultimate-audit-00-navigation-psychology.md:148`; export status **NOT DETERMINED IN CODE**),
and they need a continuously rising frontier or the data stops being interesting (Fitbit
plateau, F4.3, **VERIFIED**). A strict daily streak would be actively harmful for an athlete
whose programme includes rest days (F5.3, **VERIFIED**) — the existing weekly/Consistency
framing is the correct shape for them.

WHERE WE LEAD:
- **Day-1 meaningful-action activation is built in** (FreeStarter pre-seeds today's session;
  Home hero single CTA) — directly serves the strongest D30 predictor where MFP-style apps
  fail (F1.2/F8.1 **VERIFIED**; Volyume `03-home.md:42,81`,
  `ultimate-audit-00-navigation-psychology.md:234`).
- **Disciplined notification design already aligns with the recommended envelope** — typed,
  per-category, deep-linked notifications with dedicated settings, rather than a single
  on/off toggle, which the research says lowers total opt-out (F6.2/F6.3 **VERIFIED**;
  Volyume `ultimate-audit-00-navigation-psychology.md:166-176, 377, 396, 398`).
- **Offline-first + generous free tier alignment** — free tier delivers real value (logging,
  library, plans, progress stats per CLAUDE.md gating), matching the "default to free value,
  never paywall a previously-free core mechanic" finding that is the canonical MFP churn case
  (F4.1/F3.1 **VERIFIED**; cross-cutting, no single Phase-1 line).
- **Consistency framed as weekly adherence, not a punitive daily chain** — the Consistency
  screen + "sessions this week" framing is exactly the lenient, ED-safe shape the research
  recommends over strict streaks (F5.2/F5.3 **VERIFIED**; Volyume
  `ultimate-audit-00-navigation-psychology.md:112`, `03-home.md:31`).

WHERE WE LAG:
- **No streak / loss-aversion habit reward.** Duolingo-style lenient streaks (freezes,
  grace, "X sessions/week") raise commitment ~60% and cut at-risk churn ~21%; Volyume has
  no evidenced streak mechanic (F5.1/F5.2 **VERIFIED**; Volyume: not determined in code).
  *See ED-safety note below — research-input only.*
- **Thin social / accountability moat.** Best-in-class retention is a social network
  (Strava 44k integrations, Peloton community, Zwift ≈3x); Volyume has a single
  `Partner` screen and `partner_cheer` notification, no feed/leaderboard/challenge surface
  (F3.3 **VERIFIED**; Volyume `ultimate-audit-00-navigation-psychology.md:113, 174`).
- **Cold-start / cliff scaffolding stops early.** Trial banners run days 2–7
  (`03-home.md:21`) but the personalisation-payoff window the research flags is ~7-15
  sessions (Fitbot loses people before the algorithm proves itself); no evidenced mechanic
  bridges that gap (F3.2/F7.2 **VERIFIED**).
- **Progress is interpreted but possibly not exportable.** Research: athletes stay because
  of exportable history (switching cost); Volyume shows interpreted progress but export is
  **NOT DETERMINED IN CODE** (F1.4/F9.1 **VERIFIED** on the market side).

MISSING ENTIRELY (present elsewhere, not evidenced in Volyume's read files):
- A **streak counter with a leniency safety net** (Streak Freeze / grace period) — Duolingo
  (F5.2 **VERIFIED**).
- **Social challenges / leaderboards / activity feed** — Strava, Peloton, Fitbit, Zwift
  (F3.3 **VERIFIED**).
- **Data export** of accumulated history for advanced lifters — Strava (API), Setgraph
  (F9.1 **VERIFIED**; Setgraph **PARTIAL**).
- **Narrative/story engagement layer** that "makes people forget they are exercising" —
  Zombies, Run! (F9.2 **VERIFIED**) — though this would conflict with the deterministic
  no-AI coaching boundary if generative; flagged, not proposed.
- A mechanic that **bridges the ~7-15 session personalisation window** — Fitbod's missing
  piece (F3.2 **VERIFIED**).

USER SENTIMENT (what users want that no app reliably provides — from the fragment):
- **Streaks without the shame.** Documented split: guilt ("I haven't had time today, I'm so
  sorry") vs resentment ("this is so rude, I don't have to use it every day") — users want
  the motivation of a streak without the punitive edge (F5.3 **VERIFIED**).
- **Reminders that vary and aren't noise.** "If you're going to send me a reminder… it'll be
  nice if it was something different" — content repetition, not frequency, drives fatigue
  (F6.3 **VERIFIED**).
- **Tracking that doesn't reduce health to numbers.** "When health is reduced to calorie
  counts and step goals, it can leave people feeling demotivated, ashamed, and
  disconnected" — users want progress without the chore/guilt cycle (F4.2/F4.4 **VERIFIED**).
- **Logging that stays fast** ("can never go a workout without using it" — Hevy) and a free
  tier that doesn't claw back core features (MFP backlash) (F3.1/F4.1 **VERIFIED**).

> **ED-SAFETY NOTE (research-input only, per CLAUDE.md SACRED rules — NOT a proposal to
> implement).** Several retention mechanics in this area intersect `src/coaching/safety/`:
> (1) **Streaks.** Strict daily streaks conflict with rest days AND with the ED-safety
> boundary; the research itself flags "streak/goal pressure can tip into disordered patterns"
> and explicitly marks streak adoption as STOP-and-ask territory given the ED rules
> (research F4.4, F5.3; PROPOSAL INPUT item 3, and the fragment's own note at
> `research-09-retention.md:386-389, 407-409`). Any streak/consistency reward is a founder
> decision, not an autonomous build. (2) **Notifications.** Goal/streak-pressure pushes and
> any calorie/weight-loss framed nudge must respect the calorie floors, the 1.5%/week
> rapid-loss threshold and Beat UK signposting; notification copy touching nutrition/weight
> is safety-adjacent. These are surfaced as decisions, not changes.

VERIFICATION STATUS:
- **All MARKET findings this block leans on are VERIFIED** (F1.2, F1.3, F1.4, F3.1, F3.2,
  F3.3, F4.1, F4.2, F4.3, F4.4, F5.1, F5.2, F5.3, F6.1, F6.2, F6.3, F7.1, F7.2, F8.1, F8.2,
  F9.1, F9.2). No PARTIAL or NOT-FOUND finding is load-bearing for any conclusion above.
- **PARTIAL-status apps** appear only as range/breadth colour, never as the basis of a claim:
  Setgraph (export — PARTIAL) is named under MISSING/athlete context; Sylvi/Griply (PARTIAL)
  underpin no claim beyond the Duolingo streak case which is itself VERIFIED.
- **NOT-FOUND on the market side:** per-app published D30/D90 *figures* are scarce (benchmarks
  are category-level); subscription-coaching apps Future/Caliber/Centr returned no retention
  data; no fitness-specific streak-harm trial exists (streak-harm evidence is
  Duolingo/qualitative + ED-risk literature). These gaps are reflected honestly and not
  filled.
- **Volyume-side NOT DETERMINED IN CODE** (carried from Phase-1 scope, not asserted as
  absent): a streak module, a data-export surface, and exact simultaneous on-screen card
  counts. Conclusions that depend on these are worded as "not evidenced", not "absent".


<!-- ==== phase3/compare-10-navigation.md ==== -->

# Phase 3 Comparison — Area 10: Navigation, IA & Findability

AREA: Navigation, IA & findability

VOLYUME CURRENT:
Volyume uses a visible 5-tab bottom bar — Train (Home), Plans, Diary, Progress, You — created at `RootNavigator.js:412`, labels at `:432`, icons `:433-442`, titles `:445-449`. No hamburger drawer; navigation is fully visible. Root tree is chosen by `renderNavigator()` (`RootNavigator.js:1107`): unauthenticated → WelcomeStack (`:1117`); signed-in but no health consent → Article9ConsentStack (`:1134-1136`); first-run incomplete → ProOnboardingStack or FirstRunStack (`:1137-1139`); otherwise MainTabs (`:1140`). Pro features are gated at the screen root via `withProGuard` (10 wrappers, `:149-162`), not by hiding tabs — DiaryTab is always visible to free users and the gate fires on the Diary root screen (`:164`). Tab presses reset each stack to its top via `popToTop()` on `tabPress` (`:218-222, 286-290, 312-316, 335-339, 365-369`). Known IA frictions from Phase 1: cardio has no single home (registered in three stacks — HomeStack `:303`, DiaryStack `:251,256`, ProgressStack `:357,358`); Body Metrics is duplicated across ProgressStack (`:347`) and ProfileStack (`:386`); Nutrition Targets is a food concept but lives in the You tab (`:384`), reached by a cross-tab jump from Home (`HomeScreen.js:987`); coaching (CheckIn, CoachOutput, Methodology, Held history, Reminders, Goal setup) is buried under the You tab (`:387-398`) rather than surfaced as its own destination; two similar builders are split across tabs (BuildWorkout in Home `:294`, ManualBuilder in Plans `:324`). Densest landing screens are Home (~11 distinct destinations, `HomeScreen.js` callsites in §6), Progress (~10) and You (~9); Diary is lightest (~5).

BEST IN CLASS:
- **Spotify** — ditched the hamburger for a 5-tab bottom bar (Home, Browse, Search, Radio, Your Library); measured +9% general clicks and +30% menu-item clicks, with more first-session navigation engagement by new users and no harm to retention. The canonical proof that visible 5-tab beats hidden. Source: techcrunch.com/2016/05/03/spotify-ditches-the-controversial-hamburger-menu — VERIFIED.
- **Strong & Hevy** — the two in-category navigation benchmarks. Strong = the casual end (clean, fast, low-friction mid-workout logging); Hevy = the dual-audience benchmark ("most intuitive workout tracker," Strong-level logging speed plus community/customisation depth). Source: yourappland.com/strong-vs-hevy-which-workout-app-is-better — VERIFIED.
- **Garmin Connect v5.0** — progressive disclosure as customisable home cards ("At a Glance" up to 8 metric widgets); users opt into depth by adding cards rather than the app showing everything at once. Pattern is best-in-class; execution drew oversized-graph complaints (cautionary on tuning). Source: notebookcheck.net/Garmin-Connect-app-home-screen-refresh — VERIFIED.
- **Authoritative anti-pattern — hidden/hamburger nav.** NN/G's own data (hidden menus used 27% vs 48–50% visible/combo on desktop; users 39% slower) is the strongest argument against burying features. Source: nngroup.com/articles/hamburger-menus — VERIFIED.

TOP 50 RANGE:
The spectrum runs from praised, intuitive, low-friction navigation (Strong, Hevy — VERIFIED; Nike Training Club "the easiest workout app" — PARTIAL) at the strong end, through customisable-card depth (Garmin Connect v5.0 — VERIFIED), down to the loud redesign-backlash end: MyFitnessPal's 2026 redesign (loudest findability backlash in the category, logging went from "2–3 taps" to "6–10 taps" — VERIFIED), Fitbit's "busy and difficult to read" dashboard with lost features (VERIFIED), Strava's full-screen activity view that hid the bottom nav bar (VERIFIED), and Apple Health's 100+ categories "confusing and hard to navigate" with no meaningful aggregation (VERIFIED). Deep navigation-specific evidence concentrates in ~8–10 apps; the remaining ~19 researched apps are PARTIAL (no nav-IA-specific user evidence located).

NEWBIE VERDICT:
Volyume's fully-visible 5-tab bar is exactly the structure the research says lets a beginner build a mental model of the whole app (Finding 1.1/2.1 — VERIFIED), and the `FreeStarter` "three plain questions" difficulty-0 on-ramp plus Home's pre-answered "today's session" hero deliberately shield beginners on Day 1 (`RootNavigator.js:472-475`). But the research warns the thing newbies "can't find" is usually the core daily action made one tap deeper (Finding 4.1 NEWBIE note); against that, Phase 1 finds several first-timer-relevant functions sit behind advanced/competitor terminology — "Precision Coaching™" (`RootNavigator.js:388`, `YouScreen.js:128`), "Training Blocks"/Mesocycle (`:326`), "Volume"/MAV-MRV heatmap (`:298,345`; `theme.js:485-492`), "Goal lock" (`:395,513`) — and a basic "track my weight" expectation is Pro-gated and duplicated (`GatedBodyMetrics`, `:347,386`). Tab labels themselves are plain ("Train", "Plans", "Diary", "Progress", "You") and meet the one-plain-word rule (Finding 2.2 NEWBIE — VERIFIED), except "You" is vaguer than "Profile"/"More".

ATHLETE VERDICT:
The visible logging entry point on the Train tab satisfies the research rule that athletes log daily and the logging entry must be first-class, not nested (Finding 2.2 ATHLETE — VERIFIED) — Volyume routes every plan-start to HomeTab/ActiveWorkout so the workout always "lives" in the Train tab regardless of entry point (`PlansScreen.js:240,349`, `PlanDetailScreen.js:139`, `RoutineDetailScreen.js:266`). Persistent nav is preserved inside detail views (no full-screen nav-hiding equivalent to Strava's regression found in Phase 1). Where it strains for the power user: cardio has no single home, so discoverability depends on which card was tapped (Phase 1 §2), and the coaching domain is split from the tab it is launched from (4 cross-jumps from Home into ProfileTab). The research's advanced-user asks — persistent opt-in disclosure (a saved preference, not a re-explained tutorial), personalised nav (pin/reorder/hide), and preserved power shortcuts — are not evidenced anywhere in the Phase 1 nav inventory.

WHERE WE LEAD:
- **Visible bottom tab bar, no hamburger** (`RootNavigator.js:412`) — directly aligned with the strongest sourced finding (hidden nav 27% vs 48–50%, 39% slower). Source: nngroup.com/articles/hamburger-menus — VERIFIED.
- **Exactly 5 tabs** (`:445-449`) — sits inside the 3–5 consensus optimum and matches Spotify's deliberate five-tab reduction. Sources: nngroup.com/articles/mobile-navigation-patterns (VERIFIED) + techcrunch.com Spotify (VERIFIED).
- **Daily logging on a visible tab, never in a "More" overflow** (Train tab; plan-starts route to HomeTab/ActiveWorkout) — avoids precisely the MFP tap-count regression and overflow-graveyard pattern. Sources: platelens.app MFP (VERIFIED) + userpilot.com navigation-ux Facebook/overflow (PARTIAL).
- **Plain-language tab labels** (`:432,445-449`) — meets the one-tab-one-intent labelling rule. Source: nngroup.com/articles/mobile-navigation-patterns — VERIFIED.
- **Pro gating by screen, not by hiding tabs** (`:149-164`) — keeps the Diary tab discoverable to free users (the gate teaches the feature exists rather than hiding it, contra the hidden-nav anti-pattern). Source: nngroup.com/articles/hamburger-menus — VERIFIED (interpretation of the visibility principle applied to gating).

WHERE WE LAG:
- **Clutter on the home/landing screen** — Home shows ~11 distinct destinations mixing training, coaching, nutrition, cardio and upsell (Phase 1 §6, `HomeScreen.js` callsites); the research names "cluttered dashboard pushing core data below the fold" as the second-commonest fitness complaint. Source: platelens.app MFP + techradar Fitbit — VERIFIED.
- **No evidenced progressive disclosure / customisation** — Garmin's customisable-card model and the personalise-nav (pin/reorder/hide) pattern have no counterpart in the Phase 1 nav inventory; the research recommends defaulting casuals to minimal and revealing depth via opt-in persistent personalisation. Sources: notebookcheck Garmin (VERIFIED) + userpilot.com / Fitbit / Garmin support (PARTIAL).
- **Cap nesting at 2 disclosure levels** — Volyume's deep ProfileStack (35+ registered routes, `:372-407`) and cross-tab jumps to reach nutrition/coaching risk exceeding the depth-2 usability threshold; cannot be confirmed as a violation from the inventory alone, but the surface is large. Source: nngroup.com/articles/progressive-disclosure — VERIFIED (principle).
- **Advanced terminology on first-timer-relevant features** — "Precision Coaching™", "Mesocycle/Training Blocks", "MAV/MRV Volume", "Goal lock" (Phase 1 §7); the research's labelling rule wants destinations described in one word the newbie already understands. Source: nngroup.com/articles/mobile-navigation-patterns — VERIFIED (principle).

MISSING ENTIRELY:
- **User-customisable / reorderable navigation or home cards** (Garmin/Fitbit reorderable tiles) — no pin/reorder/hide affordance found in the Phase 1 nav inventory. Sources: notebookcheck Garmin (VERIFIED) + Fitbit/Garmin support (PARTIAL).
- **A single coherent home for cardio** — cardio is registered across three stacks with no canonical destination (Phase 1 §2). (Internal IA gap; the market research does not prescribe a fix, so no external source.)
- **A persistent, opt-in "advanced" surface bundling power controls in one findable place** (Windows 11 advanced-settings model; the "advanced settings in one place" pattern) — not evidenced in Phase 1. Source: dev.to Windows 11 — PARTIAL.

USER SENTIMENT (what users want that no app provides):
The research did not isolate a clean "no app provides X" wish; the dominant user voice is regression-driven — users want their core daily action to stay shallow and their power shortcuts (copy meal, multi-select, quick-compare) preserved, and react loudest when redesigns take taps away or hide persistent nav ("the food diary has been ruined"; users "greatly miss being able to tap between the home and you tabs"). The closest unmet, cross-app gap is meaningful aggregation/legibility of dense data (Apple Health's 100+ categories spawned the third-party wHealth Dashboard because the native IA is unreadable). Sources: platelens.app MFP (VERIFIED), Strava community thread (VERIFIED, confirmed via search excerpt after 403 on direct fetch), slideshare Apple Health design challenge (VERIFIED).

VERIFICATION STATUS:
The spine of this block — visible-vs-hidden nav, 3–5 tabs, daily-action-on-a-visible-tab, 2-level disclosure cap, plain labels, Spotify/Strong/Hevy/Garmin best-in-class, MFP/Fitbit/Strava/Apple Health backlash — is all VERIFIED. PARTIAL-dependent claims this block leans on: the overflow-graveyard / Facebook example (userpilot.com — PARTIAL); the personalise-nav pin/reorder/hide recommendation (userpilot.com + Fitbit/Garmin support — PARTIAL); the Windows-11 advanced-settings bundling pattern (dev.to — PARTIAL); the power-user simplified-defaults-plus-shortcuts synthesis (Wikipedia "Power user" — PARTIAL); Nike Training Club "easiest workout app" (PARTIAL). No claim here upgrades a PARTIAL to VERIFIED. Two source fetches were 403/truncated (Strava community thread, TechRadar Fitbit) and confirmed via search excerpt in the research fragment — carried at the fragment's stated status. NOT-FOUND items reflected honestly: no primary quantified A/B data from a *fitness* app on tab count or progressive disclosure exists (the quantified case is Spotify, which is music); the ~28 apps in research rows 28–55 had no nav-IA evidence and are excluded here.


<!-- ==== phase3/compare-11-design.md ==== -->

# Phase 3 master comparison — Area 11: Design, visual quality & premium feel

Reconciles Volyume's current component library (Phase-1 fragments
`phase1/15a-components.md`, `15b-components.md`, `15c-components.md`,
`15d-components.md`) against the market design research
(`phase2/research-11-design.md`). READ-ONLY; no new research, no code change.
British English. Every market claim carries its research status; every
Volyume-current claim carries its file:line.

```
AREA: Design, visual quality & premium feel

VOLYUME CURRENT:
A mature, token-driven design system, not a loose set of screens. A single
theme (src/styles/theme.js) defines fontSize / spacing / radius / colour /
motion tokens, and the component library is built almost entirely against it.
The premium foundations the market research names as the primary levers are
present and deliberate:
- TYPOGRAPHY + SPACING discipline: a resolved type scale and type.* roles
  (body/bodyStrong/title/label/caption) and a spacing/radius token set, used
  consistently across primitives (15a theme reference :6-16; Card.js tokenised
  "no literals found" 15a:323-325; ProgressSections "strong token discipline,
  good use of type.* roles" 15b:339-342).
- ONE PRESS MODEL / MICROINTERACTION: PressableCard gives every primitive the
  same spring press-in (scale 0.97 + opacity dip), explicitly "documented as
  matching Apple/Linear/Whoop/Spotify press feel", reduce-motion aware
  (PressableCard.js:5-7,:43-66, 15b:283-299).
- MOTION as a token: AnimatedEntrance uses Reanimated FadeInDown on the
  tokenised motion.enter (320ms) emphasized-decelerate curve, staggered, with a
  reduce-motion fallback (AnimatedEntrance.js:22,:38-45, 15a:32-41).
- HAPTICS: escalating success haptics on the PR moment and rest-timer
  countdown, selection haptics on picks (PRCelebration.js 15b:170-173;
  RestTimer.js 15b:404-425; ReasonPicker uses lib/haptics 15b:394).
- ONE DISCIPLINED BRAND ACCENT: a single amber primary runs the whole system
  (Button primary, Chip selected, ProBadge, lock chip, MacroRings ring), with
  withAlpha tints rather than hex-concat for accent borders (Card.js:51 15a:321;
  GradientCard uses withAlpha 15b:100).
- SKELETON LOADERS already exist: Skeleton / SkeletonCard / SkeletonRow mirror
  real content shape, shimmer pulse collapsed under reduce-motion, used across
  16 screens, accessibilityRole "progressbar" (Skeleton.js:23-84,:87, 15c:129-144).
- DESIGNED EMPTY STATES: a shared EmptyState card (adherence-neutral, no-shame
  copy, ghost "your data will look like this" preview) plus a designed
  food-diary EmptyDiary and five bespoke hand-tuned empty-state SVG
  illustrations (EmptyState.js:5-18,:39-48 15a:443-464; EmptyDiary.js 15d:24-49;
  Illustrations.js:22-166 15b:107-124).
- DARK-MODE-FIRST, NO PURE BLACK/WHITE: dark theme background is #0D0D0D not
  #000000 (Button.js note 15a:267); CVD-safe / shape-carries-meaning state
  glyphs (no colour-only, no red) in the streak strip (StreakWeeksSection.js:106
  15c:196-197); a deliberate Class-B rule that headline numbers and value text
  never carry a state colour (TodayStrip 15c:285; WeightTrendCard 15c:368-372).
- SUPPORTIVE, NON-CLINICAL TONE in copy by construction: no-shame empty states,
  forgiving streak language with no "streak" word and no red, withheld under
  ED/wellbeing suppression, plain coaching sentences that translate numbers into
  an action (WeeklyStreakStrip "no jargon" 15c:342-355; StreakWeeksSection:47
  15c:193; FatigueTrendCard "Push your next session"/"Consider a lighter day"
  15b:60-61; WeightTrendCard plain-English insight 15c:372-376).
- ONE HERO MOMENT: PRCelebration full-screen confetti + spring card + escalating
  haptics, rendered app-globally (PRCelebration.js:33-186, App.js:827 15b:169-183).

NEWBIE VERDICT:
Well served on the foundations, with sharp jargon cliffs in the data surfaces.
The supportive, non-shaming tone the market research says beginners most need
is structurally present (no-shame empty states, forgiving streak copy, plain
coaching sentences, EmptyDiary "Nothing logged yet today." 15d:45). Calm
defaults and skeletons reduce first-load anxiety. But several data components
are explicitly flagged "only fully makes sense to experienced users": the
BodyDiagramHeatmap assumes MAV/MRV concepts with no education on "Over limit"
(15a:182-188), EngineLog uses "Rep regression"/"+1 set" coaching-literate terms
(15a:491-497), VolumeBars MEV/MAV ticks have no on-screen legend (15c:311-313),
PlateCalculator assumes bar/per-side loading literacy (15b:254). "P C F" macro
shorthand appears unexpanded in some food rows (15d:79). The newcomer's day-one
read is clean and kind, but the deep surfaces drop jargon without inline
teaching.

ATHLETE VERDICT:
Strongly served. The fast-logging, data-dense, "spartan-speed" qualities the
research says the experienced user reads as beauty are here: 52x52 steppers and
hero-numeral value inputs in SetEntry (15c:88-91), a full scrub/crosshair/
tooltip chart engine (VolyumeChart 15c:317-338), ACWR / mesocycle / fatigue /
readiness depth (ProgressSections, ReadinessCards), tabular-nums on every
numeral, and progressive-enhancement gestures (chart long-press scrub, TodayStrip
tap/long-press). The system can carry density without feeling cheap — exactly
the Linear "modular depth" lesson. The gap for the athlete is the inverse of the
newbie's: there is no single opt-in DENSE mode; density is per-component, not a
global power-user toggle.

BEST IN CLASS:
- Premium minimalism with modular depth — Linear: "very thoroughly considered
  and carefully designed", "feels native", a large modular component set so
  minimalism stays interesting not barren.
  https://www.eleken.co/blog-posts/linear-app-case-study — VERIFIED
- Warmth without clutter — Monzo: clean structure + restrained animation + ONE
  disciplined accent (Hot Coral) used "as a moment of delight".
  https://www.creativebloq.com/web-design/ux-ui/monzos-brilliant-ui-design-is-a-delight-to-use — VERIFIED
- Premium = typography + spacing + animation, not features — Craft: "Typography
  is carefully considered. Spacing feels intentional", polish that reads as
  "someone cared deeply about how the app looks and feels".
  https://calmevo.com/craft-app-review/ — VERIFIED
- Supportive non-clinical fitness feel — Gentler Streak (ADA 2024 winner): "no
  streaks, no scolding", stats "translated into words", "life happens"
  sick/injured/break states, soft/warm illustration.
  https://developer.apple.com/news/?id=3m0ht22s — VERIFIED;
  https://www.sketch.com/blog/gentler-streak/ — VERIFIED
- Beautiful health data-viz + calm — Oura: four summary scores front-and-centre,
  serene imagery, "polished, easy to read" charts that "encourage exploration".
  https://www.pocket-lint.com/new-oura-app-update-finally-redesigned/ — VERIFIED
- Warm colour system / no pure black — Headspace: warm palette, warmest neutral
  ~#FFF8F0, curved edge-free characters, "wisest warmest friend".
  https://raw.studio/blog/how-headspace-designs-for-mindfulness/ — VERIFIED
- Fast/low-bloat logging as beauty — Hevy ("no bloat, no gamification, no
  upselling") and Strong ("clean to the point of being spartan").
  https://askvora.com/blog/best-strength-training-apps-2026 — VERIFIED
- Loading + empty-state pattern leaders — skeleton screens (Facebook/LinkedIn/
  YouTube); Gmail/Airbnb/Linear/Notion empty states.
  https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/ — VERIFIED;
  https://blog.logrocket.com/ux-design/empty-states-ux-examples/ — VERIFIED

TOP 50 RANGE:
A wide spectrum, though the research itself flags it carries ~33 named apps with
~16 VERIFIED on design-specific sourcing (below its 50-app / 20-VERIFIED target;
research §1 coverage note). At the top sit the design-led products whose whole
reputation is feel: Linear, Craft, Monzo, Oura, Headspace, Gentler Streak
(VERIFIED). The strength-logging tier prizes spartan speed over polish — Hevy,
Strong (VERIFIED). The data-dense tier is "acceptable to the right user but
cluttered by default" — Whoop "home page feels cluttered… chock-full of
information" vs Oura's four summary scores (VERIFIED). A long tail is named but
thin or unsourced on design: Fitbod, Caliber, MacroFactor, Calm, Strava
(PARTIAL); Garmin Connect, Nike Run Club, Peloton, Apple Fitness+ returned
ecosystem/sync threads not visual critiques (PARTIAL); Cronometer, BetterMe,
Virtuagym, Jefit appeared in list only (NOT FOUND).

WHERE WE LEAD:
- Token system + one press model + tokenised motion already deliver the
  "intentional, considered, native-feeling" base the market reads as premium —
  the Linear/Craft lesson is implemented, not aspirational (PressableCard
  15b:283-299; AnimatedEntrance 15a:32-41; Card "no literals found" 15a:323-325).
  Supports: Linear https://www.eleken.co/blog-posts/linear-app-case-study —
  VERIFIED; Craft https://calmevo.com/craft-app-review/ — VERIFIED.
- Skeleton loaders already shipped across 16 screens, reduce-motion aware
  (Skeleton.js 15c:129-144) — the perceived-speed pattern the research recommends
  is in place, not a gap.
  Supports: https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/ — VERIFIED.
- Supportive, non-shaming tone is built into the components, not bolted on:
  no-shame EmptyState, no "streak" word / no red, ED suppression, word-based
  coaching lines (15a:443-464; 15c:193,:342-355; 15b:60-61). This matches the
  Gentler Streak gold standard and the MyFitnessPal "control-and-numbers
  backfires" finding.
  Supports: https://developer.apple.com/news/?id=3m0ht22s — VERIFIED;
  https://studyfinds.org/fitness-app-motivation-study-myfitnesspal/ — VERIFIED.
- Dark-mode discipline aligns with the literature: no pure black (#0D0D0D),
  state via shape not colour-only, headline numerals never state-coloured
  (15a:267; 15c:196-197,:285). Matches the "never pure black, desaturate, signal
  depth by tone" guidance.
  Supports: https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/ — VERIFIED.
- Bespoke, on-brand empty-state illustrations (five hand-tuned SVGs) rather than
  generic icons (Illustrations.js 15b:107-124) — the warm-monochrome-illustration
  approach the research praises in Linear/Notion.
  Supports: https://blog.logrocket.com/ux-design/empty-states-ux-examples/ — VERIFIED.
- A genuine hero moment (PRCelebration) — emotion is what's remembered, and the
  app has exactly one deliberate emotional peak (15b:169-183).
  Supports: https://medium.com/design-bootcamp/microinteractions-and-emotion-tiny-details-huge-impact-efec5714a6a8 — VERIFIED.

WHERE WE LAG:
- NO global summary-first / opt-in dense split. The research's headline
  recommendation is the Oura-default-with-Whoop-opt-in pattern, mapping onto
  Volyume's dual audience. Today density is decided per component
  (data-dense Progress cards always render dense), with no power-user toggle.
  Supports: https://www.tomsguide.com/wellness/sleep-tech/whoop-vs-oura-i-tested-each-sleep-tracker-for-two-weeks-heres-my-winner — VERIFIED;
  research §5 Proposal 1.
- Jargon without inline teaching on the deep surfaces — empty states are
  supposed to double as onboarding (what / why / what-to-do), but
  BodyDiagramHeatmap ("Over limit", MAV/MRV), EngineLog ("Rep regression"),
  VolumeBars (MEV/MAV ticks, no legend) drop terms cold (15a:182-188,:491-497;
  15c:311-313). Newbie risk.
  Supports: https://www.eleken.co/blog-posts/empty-state-ux — VERIFIED.
- TWO animation systems coexist — AnimatedEntrance (Reanimated, tokenised) vs
  BottomSheet (RN Animated with LITERAL durations 260/200ms, untokenised easing)
  (15a:548-550; BottomSheet.js:24-27 15a:208-213). The "intentional, consistent
  motion" premium signal is partly undercut by an untokenised second system.
  Supports: https://calmevo.com/craft-app-review/ — VERIFIED (animation quality
  as premium signal).
- Sub-44px touch targets on multiple interactive elements — InfoTooltip ~30px
  (15b:445-446), Chip ~29px, CardioPlanCard "Log cardio" ~21px, EmptyState CTAs
  ~37px, DifferentialBadge CTA ~40px, SegmentedControl cell ~34-36px, Dropdown
  rows ~40px, ServingPicker unit pill, BodyDiagramHeatmap SVG regions (15a:551-556;
  15c:74-76; 15d:281-283). "Predictable, in-control" navigation = trust, and
  hard-to-hit targets erode it.
  Supports: https://www.insivia.com/designing-for-trust-web-design-elements-that-enhance-credibility-in-healthtech-platforms/ — VERIFIED.
- LATENT LIGHT-THEME CONTRAST BUG — Button primary/destructive use
  colors.background as on-fill ink instead of onPrimary; identical in dark, but
  near-white-on-amber under the light theme (Button.js:25,:28 15a:262-271,:540-543).
  WCAG AA 4.5:1 risk if light theme ships.
  Supports: https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/ — VERIFIED
  (contrast-ratio requirement, applied here to light theme by inference).
- Privacy posture not surfaced as a trust signal — the research says EU
  residency / no-third-party-PII should be VISIBLE in the UI, not just true; the
  component inventory shows no trust-badge / data-residency surface (absent from
  all four fragments; FeedbackSheet only states what is stripped, 15b:86).
  Supports: https://thisisglance.com/blog/healthcare-app-psychology-building-trust-through-design — VERIFIED;
  research §6 Interpretation (architecture alignment).

MISSING ENTIRELY:
- No opt-in compact/dense "power-user" view mode anywhere in the library
  (research Proposal 1; Whoop density-as-opt-in — VERIFIED).
- No surfaced privacy / data-residency trust badge or "where your data lives"
  affordance (research §6 — VERIFIED for the principle; absent in fragments).
- No tokenised motion system shared by sheets (BottomSheet bypasses motion.*;
  15a:208-213) — i.e. no single motion language across both animation libraries.
- An on-screen LEGEND/KEY for shape-coded and landmark-coded data is missing on
  several surfaces (StreakWeeksSection glyph strip 15c:208; VolumeBars MEV/MAV
  15c:311-313; BodyDiagramHeatmap band meaning for newbies 15a:182-188).
- NOTE — not gaps the research found, but inventory dead/unwired surfaces that
  affect "premium consistency": Chip, ExerciseCard, Stepper, VolumeBars,
  PlateCalculator, OptionCard, SourceChip, ServingPicker, HeldDecisionCard are
  built but unimported (15a:366-371,:507-511; 15c:173-176,:301-303; 15b:154-158,
  :241-244; 15d:142-147,:272-277,:300-305). Several screens hand-roll buttons/
  chips instead of the existing primitives (15a:536-539), a consistency drift the
  primitives were meant to retire. No market source bears on this; flagged as a
  Phase-1 finding only.

USER SENTIMENT:
What users want that the market does not fully provide:
- Beauty = CALM + CLARITY in users' own words ("delightful UI", "beautiful
  graphs and stunning visuals", "serene landscapes… more tranquility") — Oura
  reviews. https://www.producthunt.com/products/oura/reviews — VERIFIED;
  https://www.pocket-lint.com/new-oura-app-update-finally-redesigned/ — VERIFIED.
- The ABSENCE of bloat is itself praised as beauty: "no bloat, no unnecessary
  gamification, and no aggressive upselling" (Hevy); "clean to the point of being
  spartan" (Strong). https://askvora.com/blog/best-strength-training-apps-2026 — VERIFIED.
- Users actively resent control-and-numbers framing and fake-streak punishment:
  "shame, guilt, frustration and burnout… reminders that felt nagging or
  judgmental." https://studyfinds.org/fitness-app-motivation-study-myfitnesspal/ — VERIFIED.
- A "wisest, warmest friend" guiding tone is what people remember
  (Headspace). https://raw.studio/blog/how-headspace-designs-for-mindfulness/ — VERIFIED.
The unmet want across the market is an app that is BOTH data-deep for the
athlete AND calm/supportive for the beginner — the Oura-calm / Whoop-depth split
nobody resolves in one product (research INTERPRETATION on Q2). Volyume's
dual-audience design is positioned to own exactly this gap if it adds the
summary-first / opt-in-dense layer.

VERIFICATION STATUS:
The substantive design findings this block leans on are VERIFIED. The
PARTIAL/NOT-FOUND and inference-flagged dependencies are:
- Q4 dark-mode colour/contrast (no-pure-black, desaturate, tonal elevation, the
  light-theme Button contrast point) rests on AUTHORITATIVE GENERAL dark-mode UX
  literature applied to fitness by INFERENCE — the research explicitly found NO
  source critiquing a named fitness app's dark mode (research Q4 NOTE/GAP). The
  WHERE-WE-LEAD dark-mode point and the WHERE-WE-LAG light-theme contrast point
  inherit this inference flag.
- The "opt-in density" recommendation rests on the Whoop-vs-Oura comparison
  (VERIFIED) plus the research's own INTERPRETATION mapping it to Volyume's dual
  audience — the interpretation is not itself a sourced market finding.
- The "surface privacy posture" point rests on a VERIFIED trust-design principle
  plus the research's architecture-alignment INTERPRETATION (not a market
  observation of a competitor doing it).
- Several long-tail apps referenced for the TOP 50 RANGE are PARTIAL (Fitbod,
  Caliber, MacroFactor, Calm, Strava, Garmin, Nike Run Club, Peloton, Apple
  Fitness+) or NOT FOUND (Cronometer, BetterMe, Virtuagym, Jefit); the range
  statement carries that spread per the research §1 table and coverage note.
- Coverage caveat carried from source: the design research met neither its
  50-app target (~33 named) nor its 20-VERIFIED floor (~16); principle-led depth
  was prioritised over app count (research §1 coverage note, §6).
```


<!-- ==== phase3/compare-12-feature-gaps.md ==== -->

AREA: Feature gaps (features that exist elsewhere but not in Volyume)

VOLYUME CURRENT: Volyume ships a deterministic (no-AI) coaching spine and a wide
feature surface. From the nav-psychology map: a weekly coaching output and review
(`CoachReview` HomeStack `RootNavigator.js:300`/ProgressStack `:346`; `CoachOutput`
"Precision Coaching™" ProfileStack `:388`, GATED) with a `Methodology` "How Precision
Coaching works" screen (`:389`); a weekly check-in (`WeeklyCheckIn` `:387`, GATED) that
the day-3 notification routes into (`notificationRoute.js:58-65`); a volume heatmap with
MAV/MRV volume-status bands already in the theme tokens (`VolumeHeatmap` `:298,345`;
`theme.js:469-492`, MAV/MRV bands `:485-492`); training-block periodisation
(`MesocycleBuilder` "Training Blocks" `:326`); food diary, search, barcode/label scan,
meal plan, recipes and meals (DiaryStack `:225-276`, all Pro-gated at the root); nutrition
targets (`NutritionTargets` `:384`, GATED); cardio logging/history (`:251,256,357,358`);
analytics, lifts, consistency, body metrics, year-of-lifts/recaps (ProgressStack
`:342-358`); an exercise library/detail (`ExerciseDetail` `:323,351`); and partner
accountability (`Partner` "Training partner" `:350`). A `WellbeingCheck` screen exists
(`:399`). The ED-safety system is referenced separately (CLAUDE.md, `src/coaching/safety/`).

BEST IN CLASS:
- Form video tied to the exact exercise slot: TrueCoach — uploaded to the exercise slot,
  time-stamped comments + drawing tools (the feature Trainerize users beg for, 115 votes).
  https://truecoach.co/features/ — VERIFIED (research §4, F4.1).
- Deterministic load/fatigue/form model: TrainingPeaks PMC (CTL 42-day EWMA, ATL 7-day EWMA,
  TSB = CTL − ATL), generalised to RPE-only by intervals.icu (offline-capable).
  https://www.trainingpeaks.com/coach-blog/a-coachs-guide-to-atl-ctl-tsb/ — VERIFIED (F2.1).
- Adaptive nutrition coaching without a human: MacroFactor — dynamic TDEE, flexible,
  non-shaming weekly adjustment. — VERIFIED (F4 table / §4).
- Readiness gating: Whoop (green/amber/red recovery) + Oura (personal-baseline scoring,
  PARTIAL) gating daily prescribed strain/volume. — VERIFIED/PARTIAL (F2.2).
- Nutrition-budgeting UX: YNAB — "give every unit a job" + rollover + guilt-free flexibility.
  https://www.ynab.com/ynab-method — VERIFIED (F2.3).
- Gentle, safe gamification: Finch (bird never dies) + Duolingo streak freeze. — VERIFIED (F6.1, F6.4).
- Auto-deload in a lifting app: Alpha Progression + Stronger by the Day. — VERIFIED/PARTIAL (F3.4).
- Pantry-aware meals: Samsung Food (photo→suggestions, PARTIAL) + Paprika (scaling + pantry
  auto-uncheck, VERIFIED). — VERIFIED/PARTIAL (F1.4, F2.6).
- Bar velocity/VBT: Metric — auto-measures bar speed/ROM/path → estimated 1RM.
  https://metric.coach/ — VERIFIED as a gap-confirming existence proof (F3.5).

TOP 50 RANGE: 50+ apps researched (research §1, above the 20-app floor). The spectrum runs
from minimalist loggers that deliberately give no feedback and no readiness/deload logic
(Strong, Hevy, FitNotes, StrengthLog) — Hevy "logs what you do but doesn't tell you what you
should do next" (F4.3, PARTIAL) — through adaptive auto-progression/auto-deload loggers
(Alpha Progression, Stronger by the Day, Fitbod), rigid calendar-periodised programs (RP
Hypertrophy fixed 4–6wk meso+deload, criticised as rigid; JuggernautAI), AI black-box
programs users distrust (RP, JuggernautAI — "want to know why"), human/async-coach platforms
(TrueCoach, Trainerize, CoachRx, Future, Caliber, PT Distinction), single-purpose specialists
(TrainingPeaks/intervals.icu load model; Metric VBT; Drop It/Lunaletics/Wild.AI cycle-synced),
to gamification and cross-category exemplars (Duolingo, Strava, Finch, Apple Fitness, YNAB,
Daylio, Paprika/Samsung Food). No single app unifies nutrition + training + recovery into one
model (F1.3, PARTIAL) and none prominently ships an honest "back off / deload" warning
(F1.1, NOT FOUND).

NEWBIE VERDICT: Volyume already shields the Day-1 beginner well — the `FreeStarter` "three
plain questions" difficulty-0 on-ramp and a pre-answered "today's session" hero
(`RootNavigator.js:472-475`), plus a `Methodology` explainer (`:389`) and `WellbeingCheck`
(`:399`). But against the market the beginner-protective gaps bite hardest: no form-video
self-review/demos-in-context (F7.1, F4.1), no audio coaching during the set (F7.2), no
in-context per-exercise coaching notes (F5.5), no explicit humane "you missed a session,
here's what to do" recovery flow (F7.5, NTC flow NOT FOUND), and no readiness/overreaching
warning to protect a novice from doing too much too soon (F1.1, F2.2). The volume grammar a
beginner meets is also advanced: MAV/MRV bands surface in the heatmap (`theme.js:485-492`)
without a beginner-legible MEV/MAV/MRV landmark layer over raw sets (F3.1).

ATHLETE VERDICT: The competitor gets the deterministic spine, `MesocycleBuilder` block
periodisation (`:326`), the MAV/MRV volume bands (`theme.js:485-492`) and weekly coaching
output. What an experienced lifter must still leave Volyume for: a fitness-fatigue-form load
curve to time deloads by fatigue rather than by hand (F2.1), an RPE/RIR trend graph to catch
creeping fatigue (F3.3) — note the nav map shows no RPE-trend screen — fatigue-triggered
(not date-locked) auto-deload (F3.4), bar-velocity/tempo (F3.5), durable form-video history
tied to a lift across blocks (F4.1), injury/pain logging with auto-rotation (F3.6), and
(for female competitors) menstrual-phase-tagged strength trends (F3.8).

WHERE WE LEAD:
- A deterministic, no-AI engine can give a plain rationale for every recommendation honestly
  — "the rule is the rationale" — where AI programs are a distrusted black box and CoachRx
  charges for explaining the "why" via Loom (F1.2 VERIFIED; F4.4 the verbatim "explain why"
  quote NOT FOUND, held PARTIAL). Volyume already has the surface for it (`CoachOutput`/
  `Methodology` `:388-389`).
- The ED-safety stance (calorie floors, rapid-loss threshold; CLAUDE.md) plus a deterministic
  engine uniquely position Volyume to ship the honest "you're overreaching → deload" warning
  no consumer app ships (F1.1 NOT FOUND elsewhere = white-space).
- Volume-status MAV/MRV bands are already a top-level Progress tile (`VolumeHeatmap` `:298,345`;
  `theme.js:485-492`) where minimalist loggers (Strong/Hevy) map raw sets to no landmark
  (F3.1, Hevy raw-only VERIFIED).
- Partner accountability is already first-class (`Partner` `:350`); the market's social-proof
  driver (Strava kudos, F6.2 VERIFIED academic) maps onto an existing surface.
- Weekly check-in as the accountability/data-capture backbone is already shipped
  (`WeeklyCheckIn` `:387`), matching Trainerize's most-valued communication pattern (F5.2 VERIFIED).

WHERE WE LAG:
- No RPE/RIR trend surfaced to detect creeping fatigue (logging exists everywhere; trend
  graph does not — F3.3, logging VERIFIED / trend PARTIAL); no such screen in the nav map.
- No readiness/recovery traffic-light gating daily volume from sleep + RPE + bodyweight trend
  (F2.2 VERIFIED/PARTIAL); no readiness screen in the nav map.
- No fitness-fatigue-form (CTL/ATL/TSB) load model driving deload timing (F2.1 VERIFIED).
- No fatigue-triggered auto-deload (F3.4 VERIFIED/PARTIAL).
- No beginner-legible MEV/MAV/MRV landmark layer over raw set counts, despite the MAV/MRV
  theme bands existing (F3.1 VERIFIED gap / PARTIAL competitor source).
- No pantry-aware meal suggestions, no auto grocery list, no recipe scaling to macro targets,
  despite a meal engine being present (DiaryStack `:226,266-276`; F1.4/F2.6 VERIFIED Paprika /
  PARTIAL others).
- No YNAB-style macro rollover / "give every macro a job" guilt-free flexibility (F2.3 VERIFIED).

MISSING ENTIRELY (confirmed absent from the nav-psychology map):
- Form-check video attached to a specific logged set/exercise for self-review, with in-context
  per-exercise notes (F3.7/F4.1/F5.5; TrueCoach VERIFIED, self-attach PARTIAL). No video/media
  attachment screen anywhere in `RootNavigator.js`.
- Audio coaching during the set (Freeletics/Aaptiv/Peloton; F7.2 VERIFIED). No audio-cue surface.
- Bar speed / velocity (VBT) and tempo tracking (Metric; F3.5 VERIFIED). Absent.
- Injury / pain / joint logging with auto-rotation around it (F3.6 PARTIAL). Absent.
- Menstrual-cycle phase effect on lifts / phase-tagged strength trends (Drop It, Lunaletics,
  Wild.AI; F3.8 VERIFIED). Absent. (Gate check: Precision-Coaching-adjacent → likely Pro;
  confirm against FREE/PRO matrix before any build — research §5 caveat.)
- Streak + streak-freeze gamification; closure-ring targets; consistency/PR partner leaderboard
  (Duolingo/Apple Fitness/Strava/Finch; F6.1/F6.4/F2.7/F6.3, mostly VERIFIED). No streak, ring,
  badge or leaderboard surface in the map. (Must respect ED-safety: no coercive ratcheting,
  never streak-shame a deload — research §5 caveat.)
- Daylio-style mood↔activity correlation engine with a confidence label (F2.4 VERIFIED).
  `WellbeingCheck` (`:399`) captures wellbeing but the map shows no correlation-output surface
  — correlation engine NOT DETERMINED present (treat as missing pending Phase-1 per-screen brief).

USER SENTIMENT (what users want that no app provides — from the fragment):
- An honest "stop, back off, you're overreaching / take a deload" signal: no consumer app was
  found shipping it; apps appear to fear telling paying users to train less (F1.1, NOT FOUND).
- The "why" behind a changed program — AI programs are a distrusted black box; users want the
  rationale, which is currently sold as a premium (CoachRx Loom) (F1.2; F4.4 verbatim NOT FOUND).
- One unified nutrition + training + recovery model, not three bundled trackers (F1.3, PARTIAL).
- Pantry-aware meal suggestions cross-referencing what users already own — "most apps still do
  not" (F1.4, PARTIAL).
- Verbatim coaching-communication asks: "add videos/pictures to their workout comments...
  instead of having to navigate out...to the messenger" (Nick Cowell, VERIFIED); "TrueCoach...
  upload the video directly to the exercise slot" (Jack Suljevic, VERIFIED); "I just wish
  messaging was a little more noticeable" (Chris D., VERIFIED).

VERIFICATION STATUS: NOT all-VERIFIED. This block leans on the following non-VERIFIED items
carried at their fragment status:
- NOT FOUND: honest overreaching/deload warning as a shipped feature (F1.1); a verbatim "explain
  why my program changed" user quote (F4.4); an explicit NTC missed-workout recovery flow (F7.5).
- PARTIAL: unified nutrition+training+recovery model (F1.3); pantry-aware suggestions for
  non-Paprika apps (F1.4/F2.6); deterministic equipment-aware substitution (F1.5); RPE/RIR trend
  gap (F3.3); recovery/HRV/fatigue-carryover gap (F3.2); MEV/MAV/MRV landmark competitor source
  (F3.1); auto-deload rigidity framing (F3.4); pain-logging (F3.6); self-attach form-video gap
  (F3.7); bodyweight-vs-strength correlation (F3.9); Oura baseline / Runna re-plan (F2.2/F2.8);
  Hevy "no feedback" review source and per-exercise notes line (F4.3/F5.5); Strava leagues
  decomposition source (F6.3); Habitica hollow-progression source (F6.5).
- Sourcing caveat carried from the fragment: reddit.com (400/blocked) and trustpilot.com (403)
  were unreachable; all Reddit/Trustpilot sentiment is held at PARTIAL, never promoted
  (founder rule 2026-06-12). Self-interested competitor-comparison sites (arvo.guru, askvora.com,
  setgraph.app, gymgod.app) used only at PARTIAL.
- Nav-map caveat: the Daylio-style correlation-output surface is treated as missing because it is
  not in the nav-psychology map; element-level per-screen confirmation is the Phase-1 per-screen
  brief's job, not this map (NOT DETERMINED IN CODE here).


<!-- ==== phase3/compare-13-newbie.md ==== -->

AREA: Newbie & light-user experience (onboarding on-ramp, first-run guidance, casual logging loop, education/jargon)

VOLYUME CURRENT:
- Free first-run on-ramp is a three-question, jargon-free micro-quiz (goal / equipment / days-per-week) that deterministically picks ONE beginner library plan, copies+activates it, and lands the user on Home with today's session answered — FreeStarterScreen, "Your starter plan" / "Built for people starting out. Every session tells you exactly what to do: the exercises, the sets, and the reps." (03-home.md:80-85). Always-present "Skip, I'll choose myself" and "Browse all plans" escapes preserve autonomy (03-home.md:87); deterministic, no-AI scoring (03-home.md:94).
- Encouraging, beginner-appropriate copy: "There's no wrong answer. You can change direction any time." / "The first couple of weeks are for learning the movements. That counts as progress." (03-home.md:84-85, 93). This is "the screen most aligned to a newbie's needs" (03-home.md:95).
- Free first-run name capture: FirstRunScreen — "Almost there." + single name field + "Next, three quick questions and we'll suggest a starter plan. Prefer to pick your own? You can skip and browse the library instead." (11-onboarding-auth.md:95-100). Clean, one input, autofocus (11-onboarding-auth.md:104).
- Home gives the planless free user a real "what do I do today" answer: no-plan starter card "Not sure where to start?" → FreeStarter, plus "Browse plans" (03-home.md:30, 52). Free/Pro separation explicit and consistent; the free path still gets a real answer (03-home.md:46).
- Pro acquisition front door (WelcomeScreen) offers a clear two-tier chooser; Free card subtitle "The logbook a coach would write in.", trust row "Works fully offline · Exports anytime · No ads, ever" (11-onboarding-auth.md:59-60).
- Pre-account Pro quiz (QuizScreen, quiz-first Variant B), chip-based, "Your plan takes shape as you answer." (11-onboarding-auth.md:125), answers held in-memory only, never persisted (11-onboarding-auth.md:32-33).
- Pro setup reveal (ProSetupCompleteScreen) is the best newbie-onboarding screen of the Pro set: numbered 1-4 daily loop ("Log your weight / hit your targets / train your split / check in") + explicit "New to calories and macros? 5-minute guide" ramp link (11-onboarding-auth.md:233, 243).

BEST IN CLASS:
- Simplest coaching that works — StrongLifts 5x5: two workouts, five lifts, linear progression, "tells you exactly what to do, how much, when"; "takes all the ego out." This is the floor Volyume's engine must not fall below for a true beginner. (research-13: F8.1, BEST-IN-CLASS — VERIFIED, https://stronglifts.com/reviews/)
- De-intimidation — Fitbod's Experience setting + NTC's explicit per-class level labels: both prevent the "built for someone else" feeling; NTC makes each class's level "immediately obvious." (research-13: F2.4, F3.3 — VERIFIED, https://fitnessdrum.com/fitbod-review/, https://www.tomsguide.com/reviews/nike-training-club-app)
- Curated proven programs, zero config — Boostcamp: "pick a proven program, show up, and follow it with no spreadsheets or guessing"; 1M+ lifters. (research-13: F8.2 — VERIFIED, https://apps.apple.com/us/app/boostcamp-gym-workout-fitness/id1529354455)
- Non-condescending in-context teaching — Future: per-exercise form video + coach audio cues at the moment of need. (research-13: F4.2 — VERIFIED, https://onbetterliving.com/future-app/)
- Gentle progression as a retention feature — Zombies, Run! 5K: smoother ramp than C25K, beginners "didn't feel like they couldn't do it." (research-13: F8.3 — VERIFIED, https://breakingmuscle.com/tech-review-zombies-run-5k-training-fitness-game/)
- Casual no-plan logging — Strong / Hevy: log when you show up, no forced planning, free tier sufficient. (research-13: F5.2, F5.3 — VERIFIED, https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577)
- Onboarding that earns a long quiz — Flo: 70 screens that work because each visibly deepens perceived personalisation. (research-13: BEST-IN-CLASS — VERIFIED, https://dev.to/paywallpro/...)

TOP 50 RANGE: From dead-simple "tell-me-the-next-set" coaching (StrongLifts 5x5, Boostcamp curated programs — VERIFIED) and frictionless no-plan trackers (Strong, Hevy — VERIFIED) at the beginner-friendly end; through level-signposted class libraries (NTC explicit labels, Apple Fitness+ beginner/intermediate/advanced with "limited individualization" — VERIFIED); to option-rich apps that overwhelm true beginners (Fitbod — VERIFIED) and high-intensity-default apps that scare them off (Freeletics-style — VERIFIED claim / PARTIAL attribution). Human-coach apps (Future, Caliber) sit at the premium, high-instruction end at ~$200/mo (VERIFIED). A long PARTIAL tail (apps 21-52, snippet/roundup-level) should not be over-weighted (research-13 Verification Summary).

NEWBIE VERDICT: Volyume serves the beginner well on its single highest-leverage axis. The market's #1 unmet beginner need is *being told what to do next, not a menu* (F1.1, F1.3, F8.1 — VERIFIED), and FreeStarter delivers exactly that: one deterministic recommended plan, plain questions, jargon-free, with reassuring "learning the movements counts as progress" framing (03-home.md:84-85, 95). This directly counters the "overwhelming options / noisy casino" failure mode (F2.1 — VERIFIED) and the "treated as a data point" failure (F2.3 — VERIFIED). The Pro reveal screen teaches the daily loop with numbered steps and a macros ramp link, matching the "plain-English, why-at-the-point-of-need" non-condescending pattern (F4.1-F4.3 — VERIFIED/PARTIAL; 11-onboarding-auth.md:243). Where it is weaker for a true beginner: Home surfaces unexplained coaching vocabulary at a glance — "Deload week", "stop R short of failure" (RIR), "Recovery week suggested" — with no inline gloss (03-home.md:52), exactly the terminology barrier the research flags (F6.1 — VERIFIED). The Welcome/Pro path also front-loads jargon ("Precision Coaching™", "division-specific", "check-in") before any explanation (11-onboarding-auth.md:66-67), and ProOnboarding step 4 (cut/lean-gain/maintain, competition divisions, BIA/caliper/DEXA, protein "optimised/advanced") "assume knowledge a true beginner lacks" (11-onboarding-auth.md:206). Net: the free newbie on-ramp is genuinely best-in-class-aligned; the jargon-without-inline-definitions gap is the clearest beginner weakness.

ATHLETE VERDICT: The newbie surfaces are correctly NOT aimed at athletes and they have clean escapes. FreeStarter offers only three difficulty-0 beginner outcomes and an experienced lifter routes out via "Browse all plans" or the library (03-home.md:96) — acceptable by design. The research confirms athletes want the opposite of newbies: control/overrides and the ability to deviate (F1.1 ATHLETE — VERIFIED), programming-rationale "why" not basics (F1.2 ATHLETE — VERIFIED), and jargon as expected working vocabulary that must be dismissible not forced (F6.2 ATHLETE — PARTIAL). Volyume's athlete depth lives in the Pro path: ProOnboarding division selection, weak-point prioritisation, protein-approach override, recovery rating feeding plan volume — "exactly the levers an experienced competitor expects" (11-onboarding-auth.md:207), and Home's mesocycle week/RIR chip + deload signalling give real periodisation context (03-home.md:53). For a light/casual (non-athlete) user, the FREE logging loop maps directly to what casual gym-goers want — fast logging, history, strength graphs, "most gym-goers can stick with the free version" (F5.1-F5.3 — VERIFIED) — and CLAUDE.md gating keeps that loop fully free.

WHERE WE LEAD:
- "Tell me what to do next" on first run, not a menu — FreeStarter's one-plan deterministic pick (03-home.md:81-95) directly answers the market's #1 unmet beginner need (F1.1, F1.3 — VERIFIED) and the simplest-that-works floor (F8.1, F8.2 — VERIFIED).
- Casual loop fully inside FREE with no Pro wall — logging, PBs, progress stats (CLAUDE.md gating; 03-home.md:46) match what casual users want and the "free tier is enough" finding (F5.3 — VERIFIED).
- Judgment-free, private-by-default architecture — offline-first, no-PII-to-external, plus non-discouraging FreeStarter copy (03-home.md:93) aligns with the "private/judgment-free lowers entry barrier" and "don't assume a higher fitness level" findings (F7.2, F3.1 — VERIFIED).
- Drive-to-first-workout on first run — FreeStarter lands the user on Home "with today's session answered" (03-home.md:81), serving the first-14-days habit retention lever (F9.1 — VERIFIED).
- Numbered daily-loop teaching at Pro setup complete (11-onboarding-auth.md:243) matches non-condescending plain-English education (F4.1-F4.3 — VERIFIED/PARTIAL).

WHERE WE LAG:
- No inline tap-to-define glossary for RPE/RIR/AMRAP/macros/progressive overload — Home shows "stop R short of failure", "Deload week", "Recovery week" unexplained (03-home.md:52); ProOnboarding shows macros/BIA/DEXA unexplained (11-onboarding-auth.md:206). Research: terminology must be glossed inline the first time shown (F6.1 — VERIFIED; F6.2 terminology-barrier ranking — PARTIAL).
- Per-exercise "why this exercise / why this weight" plain-English coach line for newbies is not evidenced on the newbie surfaces (FreeStarter explains the plan but not per-movement) — research values a one-line "why" attached to the action (F1.2, F4.1-F4.2 — VERIFIED/PARTIAL).
- Jargon front-loaded before explanation on the Pro acquisition path ("Precision Coaching™", "division-specific" on Welcome before any gloss — 11-onboarding-auth.md:66-67) risks the "built for someone else" feeling (F3.1, F3.3 — VERIFIED).
- QuizScreen heading/body mismatch ("Eight quick questions." vs ~5-6 actual asks) and a "ready" check that lets users skip length/equipment (11-onboarding-auth.md:138) — minor friction against the "every question must visibly change the plan / no decorative onboarding" principle (F2.5 — VERIFIED).

MISSING ENTIRELY:
- Per-exercise form video / coach audio cues at the moment of need (Future-style — F4.2 VERIFIED): not present on any audited Volyume surface.
- Explicit per-item difficulty/level labelling in the style of NTC's "immediately obvious" class levels (F3.3 VERIFIED): FreeStarter recommends one plan rather than signposting a browsable level spectrum.
- Story/gamified teaching to remove the lecture tone (Zombies, Run! 5K — F4.4 VERIFIED): not a Volyume mechanism (and the gamified "streak/confetti" pattern is one beginners explicitly disliked — F2.1).
- Peer/community "sister"-style in-app support and social belonging features (F7.1, F7.3 VERIFIED): not present — and research-13 itself flags this is architecture-constrained by CLAUDE.md offline-first / EU-residency / no-PII-to-external and must be a founder decision, not built silently.

USER SENTIMENT (what users want that no app reliably provides — from the fragment):
- "This is the first time I feel like someone has an actual plan for me without having me sort out what to watch." — beginners want a real plan, not endless choice, and most apps fail at it (F1.1 — VERIFIED).
- "Teaching beats cheerleading" — beginners want the *why* explained, not streak confetti; the "noisy casino of streaks, notifications and random workouts" is what scares them off (F1.2, F2.1 — VERIFIED).
- Instructiveness (safety-credible professional guidance) was the single most-mentioned valued attribute in the qualitative study (24×), ahead of personalisation (F1.3 — VERIFIED).
- Belonging via judgment-free privacy and low-stakes peer help; social features correlate with 20-35% lower monthly churn — a want largely unmet, especially privately (F7.2, F7.3 — VERIFIED).

VERIFICATION STATUS: The spine of this block is VERIFIED. PARTIAL/NOT-FOUND items this area leans on: terminology-as-top-3-barrier ranking and the do-NOT-cite "68%" figure (F6.2 — PARTIAL); plain-English-fundamentals teaching example (F4.1 — PARTIAL, unnamed app); StrongLifts user verbatim (reviewer paraphrase — PARTIAL); Freeletics high-intensity attribution (F2.2 — claim VERIFIED, attribution PARTIAL); category retention benchmark numbers (F9.3 — PARTIAL); ATHLETE-side jargon-dismissibility implication (F6.2 ATHLETE — PARTIAL); and the do-not-over-weight long PARTIAL app tail (apps 21-52). NOT-FOUND (reflected as a gap, not filled): a direct labelled beginner-vs-athlete retention comparison study (F9.4) — the block uses only the verified habit-formation/first-14-days proxy.


<!-- ==== phase3/compare-14-checkin.md ==== -->

# Phase 3 comparison — Check-in, weekly review & coach communication (2026-06-13)

Sources reconciled:
- VOLYUME CURRENT — `docs/ultimate-audit-2026-06-13/phase1/05-checkin-safety.md` (WeeklyCheckIn, WellbeingCheck, BlockReflection, GoalLockConsent, GoalChangeSummary) + `phase1/04-coaching.md` (CoachOutput, CoachReview, CoachHeldHistory, Methodology, CoachingReminders, SettingsCoaching).
- MARKET — `docs/ultimate-audit-2026-06-13/phase2/research-14-checkin.md`.

---

```
AREA: Check-in, weekly review & coach communication

VOLYUME CURRENT:
  - Weekly check-in: a four-step wizard (feeling/energy/stress/sleep → this-week's
    data → recovery & issues → training performance) PLUS a condensed "fast" card
    when fastEligible, which auto-reads training, nutrition, steps, cardio and weight
    and reduces most weeks to confirming two ratings (WeeklyCheckInScreen.js:219, fast
    card :1071, auto-derivation :1114–1123). Gate states fail closed on load error
    (:520–527, load_error state) and enforce data minima before opening
    (FIRST_CHECKIN_MIN_DAYS, MIN_WEIGH_INS; too_soon/need_weights :1217–1258). Pro,
    via withProGuard (RootNavigator.js:149).
  - Coach output (Pro): the deterministic weekly Precision Coaching engine renders a
    week headline, coach lead acknowledgement+interpretation, week-over-week trend
    chips, "what's working"/"what was off", confirm-then-apply training & nutrition
    adjustments (every suggestion has an explicit Apply button + "Applied" chip, never
    auto-written), a "Why this week" block, a focus cue, safety blocks (rapid-loss,
    diet-break, ED held-decisions) and a methodology link (CoachOutputScreen.js:1208,
    cards :1561–1809; confirm-then-apply 1341–1345; load-error vs insufficient-data
    split 1448–1463). Up to ~14 cards can stack in one scroll (weakness, 04:48).
  - Coach review (Free): training-only weekly review, fully local/offline; per-muscle
    volume status, progression wins, deload/lagging signals, up to three plain-English
    recommendations; no nutrition, no Pro engine (CoachReviewScreen.js:95, recs 87–164;
    free, no guard 04:106).
  - Transparency surfaces: CoachHeldHistory (every decision/hold + why, plus EngineLog,
    04:139), Methodology (offline accordion explaining the engine, copy tied to engine
    source lines, 04:181), GoalChangeSummary (diff of what changed with a plain-language
    reason per change, GoalChangeSummaryScreen.js:126).
  - Coaching tone register exists: SettingsCoaching exposes Automatic / Supportive /
    Precise tone chips + a "show the science" toggle (Pro) (SettingsCoachingScreen.js
    tone block, 04:277, science toggle 217–232).
  - ED self-screen: WellbeingCheck (SCOFF-style five-question screener, score>=2 shows
    supportive GP/dietitian signposting; device-only, WellbeingCheckScreen.js:22,46).
  - Reminders: CoachingReminders schedules morning-weight + weekly-check-in prompts
    (toggles deliberately removed so the loop can't be broken) plus an optional
    missed-check-in follow-up (CoachingRemindersScreen, 04:222).
  - Block-end recap: BlockReflection (mesocycle summary: stats, narrative, PRs, best
    session, "start next block", BlockReflectionScreen.js:77).

BEST IN CLASS:
  - MacroFactor — conditional, explained check-in: surfaces only the modules this
    week's data triggers, introduces and explains WHY each appeared, then recommends a
    calorie/macro change based on what the user actually did (not the prescription),
    and is openly transparent about its own algorithm's limits to build trust.
    https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules (VERIFIED)
  - Carbon Diet Coach — minimum-friction check-in: exactly three questions, adherence-
    gated, non-blaming language ("stick closer next week"; moves calories up "to align
    with what's working for you").
    https://help.joincarbon.com/en/articles/6004812-weekly-check-in (VERIFIED)
  - Spotify Wrapped — data-made-personal benchmark: narrative framing + one or two hero
    numbers + low cognitive load + felt ownership (SDT "feel seen", peak/nostalgia,
    playful stats).
    https://medium.com/design-bootcamp/why-were-hooked-on-spotify-wrapped-the-perfect-blend-of-ux-and-psychology-b4aa06c9b81f (VERIFIED)
  - JuggernautAI / RP Hypertrophy — athlete-native decision comms: decisions delivered
    AS the prescription change in the athlete's own units (RPE, %1RM, sets, soreness/
    joint/workload feedback).
    https://www.juggernautai.app/ ; https://hypertrophy.zendesk.com/hc/en-us/articles/14605661323671 (VERIFIED)
  - Caliber / Future — human accountability: weekly asynchronous video check-ins
    repeatedly named the favourite feature; "addressed to you by someone" raises
    perceived value sharply.
    https://www.garagegymreviews.com/caliber-app-review ; https://onbetterliving.com/future-app/ (VERIFIED)

TOP 50 RANGE:
  - Top end (VERIFIED): conditional, explained, adherence-honest, short check-ins
    (MacroFactor, Carbon); athlete-native autoregulation in the user's own units
    (JuggernautAI, RP Hypertrophy/RP Diet); human/async-video accountability (Caliber,
    Future, Ladder); polished week-over-week summaries (WHOOP Weekly Performance
    Assessment every Monday with 5+ days data; Strava Recap; Oura's three scores + trends;
    MyFitnessPal Weekly Digest).
  - Middle: rigid or one-tone systems that alienate part of the audience — RP Diet Coach
    "won't work for those who only give 50% effort because it'll feel like the app is
    punishing you" (PARTIAL/VERIFIED); RP Hypertrophy/JuggernautAI "not beginner-friendly"
    / "not for casual gymgoers" (VERIFIED). Fitbod gives per-muscle recovery 0–100% but
    suggestions can read as repetitive (VERIFIED).
  - Bottom end (PARTIAL): loggers and pre-set programs with no real weekly review/check-in
    surfaced — Hevy (logger not coach), BoostCamp, Centr, Freeletics, Cronometer ("Diet
    Coach AI" only a feature request, not shipped). All PARTIAL.

NEWBIE VERDICT:
  - Strong on the spine but heavy on the full path. The fast card (two-tap confirm,
    :1071) matches the market floor (Carbon's three fields, F1.1 VERIFIED) and the free
    CoachReview softens language ("more sets than you can comfortably recover from",
    04:117). But the full wizard introduces "working sets", "training volume up X%",
    deload-adjacent and "prescribed cardio" framing (Phase-1 NEWBIE note 05:130–133), and
    CoachOutput stacks up to ~14 cards with multiple equal-weight Apply buttons, which a
    first-timer is "likely to overwhelm" (04:52). Market evidence says this costs churn:
    every extra field is paid in churn (F1.4 VERIFIED, 71% abandon by month 3) and a
    review should be 1–2 numbers + one action (F2.2 VERIFIED).

ATHLETE VERDICT:
  - Well served on substance. The check-in captures energy/stress/sleep, soreness by
    muscle, joint/tendon pain, cycle, calorie/step/cardio adherence and a training verdict
    derived from real sessions/PRs/volume (05:134–137); CoachOutput gives weekly volume
    signal, deload, MATADOR-cited diet break, carb cycling, refeed, steps+cardio and
    explicit "why" with confirm-then-apply respecting autonomy (04:53). This aligns with
    the athlete-native pattern (F3.3 VERIFIED). Gap noted in Phase-1: per-muscle set
    targets are summarised rather than shown per-muscle on the coach screen (04:53).

WHERE WE LEAD:
  - Confirm-then-apply transparency: every engine suggestion is an explicit, reversible
    suggestion, never auto-written (CoachOutputScreen.js:1341–1345). Matches and arguably
    exceeds the market trust pattern of being transparent about the decision (F3.5
    VERIFIED — MacroFactor publishes its "secret recipe").
  - Decision audit trail: CoachHeldHistory logs every change AND every hold with reasons
    (04:139), and Methodology explains the engine offline with copy tied to engine source
    lines (04:181). This is the "be transparent about how the decision was reached"
    advantage both audiences reward (F3.5 VERIFIED).
  - Narrate-then-number is already present: GoalChangeSummary shows prev→next plus a
    plain-language reason per change (GoalChangeSummaryScreen.js:126), and the coach lead
    gives acknowledgement+interpretation before adjustments — the pattern non-experts
    respond to (F3.1, F3.2 VERIFIED).
  - Adherence-honest by design: the engine reads what the user actually logged
    (auto-derived nutrition/steps/cardio/training in the check-in, :1114–1123), aligning
    with the non-blaming, "what you actually did" pattern (F1.3, F5.3 VERIFIED).
  - Offline-first free review: CoachReview computes entirely locally (04:108), which the
    market does not emphasise.
  - Tone register already exists (Automatic/Supportive/Precise + "show the science",
    04:277), the foundation for the dual-audience translation layer the research argues
    for (F3.3/F3.4 VERIFIED; INTERPRETATION in §5).

WHERE WE LAG:
  - Length / single-focus: the full wizard and the ~14-card CoachOutput run against the
    market's clearest converging signal — 1–2 numbers + one action, "if everything is a
    priority, nothing is" (F2.2 VERIFIED). Phase-1 itself flags very high information
    density and no single emphasised primary action (04:48–49, 05:128).
  - Conditional surfacing: MacroFactor shows a module ONLY if triggered (F2.1 VERIFIED/
    PARTIAL); Volyume's wizard step 1 can still stack weight/cycle/nutrition/steps/cardio
    into a long scroll (05:128), and CoachOutput renders many cards at once rather than
    only the triggered ones.
  - "Story" / personal framing: the top-of-CoachOutput restates week status three ways
    (headline, lead, trend chips) before any decision (04:50) rather than a single hero-
    number narrative; the research holds Spotify Wrapped's narrative + hero-number model
    as the benchmark for feeling personal (F5.1 VERIFIED).
  - Athlete-native units: the engine summarises rather than showing per-muscle set
    targets / RPE-style detail on the coach screen (04:53) where athlete-native apps speak
    fully in the user's units (F3.3 VERIFIED).

MISSING ENTIRELY:
  - Human or human-feeling accountability addressed to the user (Caliber/Future async
    video/text, F4.3 VERIFIED). Volyume's engine is deterministic/no-AI by rule, so this
    can only ever come from copy/personalisation, not a coach — a structural constraint,
    not a bug (research §5 item 8).
  - Progress photos / photo-cadence handling: no photo check-in surfaced in Phase-1; the
    market treats weekly photos as contest-prep-only and phase-aware to avoid "photo
    fatigue" (F1.2 VERIFIED). Volyume has no photo flow to make phase-aware.
  - An explicit "athlete mode" toggle that switches the decision presentation into native
    units; the tone register exists but is a copy/tone lever, not a units/prescription
    presentation switch (INTERPRETATION in research §5 — labelled, not a finding).

USER SENTIMENT (what users want that no app fully provides — from the fragment):
  - A weekly review that earns the first glance: even valued summaries get "quickly
    scanned" ("I usually just quickly scan this but don't really find it useful." — WHOOP,
    F2.3 PARTIAL, single reviewer).
  - Decisions that feel like collaboration with their own data, not a verdict ("By knowing
    that the app will auto adjust my calories and macros during check in is motivating and
    helpful." — MacroFactor, F5.2 VERIFIED; partner to F6.1/F6.2 that ~1/3 of feedback
    interventions backfire when attention shifts to the self — VERIFIED).
  - Comparative week-over-week framing is explicitly demanded (F4.2 VERIFIED).
  - Forgiveness for an imperfect week without feeling punished (F1.3 VERIFIED).
  - SAFETY-CRITICAL sentiment: high-frequency self-monitoring is net-safe for most but
    carries an anxiety/disordered-eating tail for vulnerable users; cadence should be
    tunable/capped and review framing task-focused not body-judgemental (F6.4 VERIFIED).
    Directly supports the existing `src/coaching/safety/` system — RESEARCH INPUT ONLY,
    no recommendation to alter floors or signposting (per CLAUDE.md do-not-touch).

VERIFICATION STATUS:
  - The lead market claims this block leans on are VERIFIED: MacroFactor conditional/
    explained/transparent (F1.3, F2.1, F3.1, F3.5, F5.2), Carbon three-question adherence-
    gated (F1.1, F3.2), 1–2-numbers single-action review (F2.2, F4.4), comparative framing
    (F4.2), athlete-native comms (F3.3, F3.4), Spotify-Wrapped personalisation (F5.1),
    feedback-backfire / task-focus (F6.1, F6.2), abandonment economics (F1.4), and the
    safety-critical over-tracking tail (F6.4).
  - PARTIAL / NOT-FOUND items relied on:
    * "TOP 50 RANGE" bottom end (Hevy, BoostCamp, Centr, Freeletics, Cronometer) is built
      on PARTIAL entries (no weekly-review feature found / not shipped).
    * "USER SENTIMENT" first-glance point rests on F2.3 (PARTIAL — single WHOOP reviewer).
    * RP "punishing" quote is VERIFIED-app / PARTIAL-source (noobgains page 404, sourced
      via corroborating snippet, F1.3).
    * F2.1 conditional-module timing: app behaviour VERIFIED, but the NUMERIC "too long"
      time limit is NOT FOUND in the research (no app/study publishes one); the "length"
      argument in WHERE WE LAG therefore rests on the productivity-science 1–2-number
      principle (F2.2 VERIFIED) plus this NOT-FOUND time threshold, not on a published
      number.
    * F5.3 (decision based on what the user did) is PARTIAL on the review source but
      consistent with MacroFactor's VERIFIED first-party philosophy.
    * The "one engine + two presentation layers / athlete mode" framing under MISSING
      ENTIRELY is INTERPRETATION (research §5), explicitly labelled in the fragment as an
      inference, not a finding — carried as such, not upgraded.
```


<!-- ==== phase3/compare-15-scaling.md ==== -->

# Phase 3 comparison — Area 15: Scaling niche→mainstream / positioning (dual audience)

Sources reconciled:
- VOLYUME CURRENT — `docs/ultimate-audit-2026-06-13/ultimate-audit-00-navigation-psychology.md` (free/Pro split + feature spread; file:line-grounded against `src/navigation/RootNavigator.js` and `src/components/ProGate.js`).
- MARKET — `docs/ultimate-audit-2026-06-13/phase2/research-15-scaling.md` (53 products; 28 VERIFIED, 25 PARTIAL; statuses + source URLs carried below unchanged).

Frame: Volyume's risk/opportunity in expanding from a physique-competition niche to a full-spectrum (gym-newbie → elite competitor) audience.

---

```
AREA: Scaling niche→mainstream / positioning (dual audience)

VOLYUME CURRENT:
Volyume already runs a deliberate two-audience structure, but the split is by
PAYMENT TIER (Free vs Pro), not by ABILITY (newbie vs athlete) — and the depth
sits behind competition-tier language.
- Free surface = Plan Library, training builder, workout logging, exercise
  library, personal bests, progress stats; Pro adds food diary, scanning, macros,
  cardio, check-ins, Precision Coaching, division-specific plans, safety systems
  (CLAUDE.md FREE vs PRO; reflected in gated wrappers).
- The ONLY `withProGuard` gates are: WeeklyCheckIn, NutritionTargets, BodyMetrics,
  CoachOutput, ProGoalSetup, PlanUpdate, CoachingReminders, Diary, LogCardio,
  CardioHistory (`RootNavigator.js:149-162`). Guard renders `ProLocked` when
  `tier !== 'pro'` with an "Upgrade to Pro" → `navigate('ProUpgrade')`
  (`ProGate.js:134-139, 115`); the food lock also shows `TodaysPlateTeaser`
  (`ProGate.js:96,100`).
- Tab-bar icons are NOT gated: DiaryTab stays visible to free users; the gate
  fires on the Diary root, not on tab visibility (`RootNavigator.js:447`, audit §1).
- A genuine newbie on-ramp DOES exist: `FreeStarter` "three plain questions"
  installs and activates a difficulty-0 starter plan so the user "lands on Home
  with today's session already answered" (`RootNavigator.js:472-475`), plus Home's
  pre-answered "today's session" hero (audit §7 counterweight).
- BUT first-timer-relevant functionality is buried behind athlete/competitor terms:
  "Precision Coaching™" / CoachOutput buried in the You tab (`RootNavigator.js:388`,
  `YouScreen.js:128`); "Training Blocks" / MesocycleBuilder require knowing
  "mesocycle" (`RootNavigator.js:326`); "Volume" / VolumeHeatmap exposes MAV/MRV
  hypertrophy bands as a top-level tile (`RootNavigator.js:298,345`,
  `theme.js:485-492`); "Goal lock" / GoalLockConsent framed around a
  "competition-tier goal" sits in the new-user onboarding path
  (`RootNavigator.js:395,510-513`); basic "track my weight" (BodyMetrics) is
  Pro-gated and duplicated across two tabs (`RootNavigator.js:347,386`) (audit §7).
- Densest landing screens are Home, Progress and You; lightest is Diary (audit §6) —
  i.e. depth is present but front-loaded, not progressively disclosed.

BEST IN CLASS:
- Dual-track fallback — Reddit kept the dense legacy experience fully alive at
  old.reddit.com "to appease power users… and as a fallback for features not
  present in the redesign"; engagement still rose 22% YoY. The cleanest
  "don't break the experts" mechanism found. VERIFIED.
  https://emilsmith.pro/articles/posts/2019-11-21-analysis-reddits-2018-redesign/
- Progressive complexity — Notion "begins simple. Then complexity appears gradually
  as users gain confidence"; templates as the on-ramp; backed by NN/g progressive-
  disclosure research ("show users only a few of the most important options. Offer a
  larger set of specialized options upon request"). VERIFIED.
  https://www.nngroup.com/articles/progressive-disclosure/ ;
  https://raw.studio/blog/how-notion-ux-converts-100-million-users/
- One workout, scaled to ability — CrossFit's scaling/Rx model serves first-timer
  and elite from the SAME named session by adjusting load, not forking the product;
  it explicitly addresses that walking in "can be terrifying". PARTIAL (operator
  blogs, consistent).
  https://www.tarheelcrossfit.com/blog/the-science-behind-scaling-in-crossfit-how-every-workout-is-for-every-body
- Accuracy as the serious moat — Cronometer hits 30/30 entries within 5% accuracy
  (vs MFP 11/30) and keeps the precision segment loyal. VERIFIED.
  https://medium.com/@margotcox/cronometer-vs-myfitnesspal-heres-my-pov-90e6876deb69
- Premium-led, accessibility-funded — Lululemon broadened to men's (0% → 24% of
  revenue 2024) without cheapening the brand (VERIFIED); Tesla led high-end to fund
  the mass-market Model 3 while keeping premium branding (PARTIAL).
  https://athletechnews.com/lululemon-men-performance-wear-market-survey/

TOP 50 RANGE:
Spectrum from fatal over-reach to clean dual-audience execution.
- FATAL (removed/degraded what existing users had): Digg v4 deprioritised user
  contributions → "Quit Digg Day", −90% uniques by 2012 while Reddit grew 230%
  (VERIFIED); Sonos 2024 redesign removed core features → −25% stock, ~$500M wiped,
  CEO out (VERIFIED).
- CONTESTED (forced mainstream redesign, refused to revert): Snapchat 2018 →
  1M-signature petition, CEO said it "was here to stay" (VERIFIED).
- SURVIVABLE (added a layer / kept a fallback): Reddit dual-track (VERIFIED);
  Garmin Connect+ drew a 10k-upvote boycott yet posted record Q4, Fitness +33%
  because the free core was untouched (VERIFIED).
- CLEAN DUAL-AUDIENCE: Figma (added FigJam/Dev Mode; two-thirds of users aren't
  designers) and GoPro (reframed the same product to "people capturing themselves")
  (VERIFIED); Slack's methodical bottom-up individuals→teams→enterprise with
  onboarding "as a product" (VERIFIED).
- DIRECT FITNESS COMPARATORS on the casual↔expert axis: Hevy "designed for people
  still getting comfortable with the logging habit" (community + unlimited free tier)
  vs Strong "for people who have already built it" (raw logging speed) — VERIFIED;
  Fitbod auto-generation suits beginners but "can feel like it's fighting your
  preferences" for advanced lifters running named programs (PARTIAL); JEFIT =
  data-heavy control for self-programmers (PARTIAL).

NEWBIE VERDICT:
Mixed. Volyume gets the Day-1 on-ramp right — `FreeStarter`'s three-question
difficulty-0 plan + pre-answered Home hero (`RootNavigator.js:472-475`) is exactly
the "guided default / templated onboarding" winners use (Slack/Notion, F8/F15
VERIFIED). But beyond Day 1 the newbie meets athlete vocabulary fast: Precision
Coaching, mesocycles, MAV/MRV volume bands and competition "goal lock" are surfaced
without a simpler framing (audit §7), the opposite of progressive disclosure
(NN/g VERIFIED). The newbie also cannot "track my weight" without Pro
(`GatedBodyMetrics`, `RootNavigator.js:347,386`).

ATHLETE VERDICT:
Well served on depth, and the depth is intact rather than diluted — Precision
Coaching, division-specific plans, macros, MAV/MRV volume, mesocycle/block
periodisation and the safety systems are all present (CLAUDE.md Pro list; audit §7).
This matches the "rigour as the premium moat" pattern that retains serious users
(Cronometer VERIFIED). The competitor's deterministic, no-AI coaching boundary
(CLAUDE.md) is itself an advantage given athletes treat "AI" as a trigger and demand
opt-out (Garmin VERIFIED; Strava PARTIAL). Risk: depth lives behind the You tab and
duplicated entry points, not a fast dense surface.

WHERE WE LEAD:
- A deterministic, no-AI coaching engine (CLAUDE.md) directly pre-empts the "AI as
  trigger" backlash that hit Strava ("AI has become a triggering word"; "pointless")
  and Garmin (10k-upvote boycott). Strava PARTIAL / Garmin VERIFIED.
- Rigour/accuracy + safety systems as the premium substance — the moat Cronometer
  proves retains serious users (VERIFIED) and the "premium feel via rigour, not
  exclusivity" pattern (Lululemon VERIFIED).
- A real templated newbie on-ramp already exists (`FreeStarter` difficulty-0 plan,
  `RootNavigator.js:472-475`), echoing the onboarding-as-product winners (Slack
  VERIFIED; Notion guided onboarding cut dropout 15%, VERIFIED).
- Free tier is genuinely useful (Plan Library, builder, logging, PBs, progress
  stats — CLAUDE.md), aligning with Hevy's "generous free tier shows value before
  paying" model. VERIFIED.

WHERE WE LAG:
- No progressive disclosure by ABILITY. Volyume splits by tier, not by newbie↔athlete
  competence; athlete terminology (Precision Coaching™, mesocycle, MAV/MRV, goal lock)
  is surfaced without a simpler default layer (audit §7), where Notion/NN/g default
  simple and reveal depth on request. VERIFIED (NN/g, Notion).
- No dual-track fallback concept. Reddit's old.reddit.com kept the dense workflow for
  experts as the simple default went mainstream (VERIFIED); Volyume has no analogous
  "dense mode" preserved if the default is ever simplified.
- Front-loaded cognitive density. Home, Progress and You are all high-density landings
  (audit §6) — the opposite of "simple by default, depth one tap away"
  (NN/g VERIFIED).
- Basic expectations sit behind Pro. "Track my weight" (BodyMetrics) is Pro-gated
  (`RootNavigator.js:347,386`); MFP's barcode paywall shows how gating an
  expected-free behaviour becomes "the most common complaint" — Volyume must
  communicate any tier line directly and never demote a currently-free feature.
  MFP VERIFIED.

MISSING ENTIRELY:
- An explicit "scale the same plan to ability" model (CrossFit Rx/scaled): one named
  workout/plan serving newbie and competitor by adjusting load/targets rather than
  separate products. Volyume scales by tier and by difficulty-0 starter, but no
  documented single-plan-scaled-across-ability surface appears in the audit. PARTIAL
  (CrossFit).
- A preserved dense/expert mode as a fallback (Reddit old.reddit.com pattern).
  VERIFIED.
- Needs-based segmentation that tailors the SAME product to beginner vs elite
  experiences explicitly (multi-segment marketing pattern). PARTIAL.

USER SENTIMENT (what users want that no app fully provides — from the fragment):
- Casual learners want real outcomes, not just gamified progress: Duolingo "feels
  like a fun vocab game, but it doesn't teach fluency… pass levels but still can't
  hold a conversation". (Implication for Volyume: a scaled-down newbie experience
  must still deliver real training progress, not a toy.)
- Serious users want raw numbers fast, not buried under friendly narration —
  Fitbit→Google Health "buried key metrics beneath Gemini-generated text",
  prompting switches to Garmin. PARTIAL.
- Existing users want NOTHING they rely on removed or relocated — "Even if you fix
  this app the damage is done" (Sonos). VERIFIED.
- The research's standing gap: no single app cleanly serves both the casual on-ramp
  AND expert depth in one product — Strong/Hevy split it between two apps (VERIFIED);
  that unmet "both at once" need is the opportunity. Closing it for Volyume is
  INTERPRETATION, not a sourced finding.

VERIFICATION STATUS:
Mixed — not all-VERIFIED. PARTIAL/NOT-FOUND items this block leans on:
- CrossFit "scale one workout to ability" model — PARTIAL (operator blogs).
- Strava "AI as trigger" quotes — PARTIAL (Garmin equivalent is VERIFIED).
- Fitbit→Google Health "buries metrics, athletes switching" — PARTIAL.
- Tesla premium-led funding mass market — PARTIAL (Lululemon equivalent VERIFIED).
- Fitbod "fights advanced lifters", JEFIT depth, needs-based segmentation,
  multi-segment marketing — PARTIAL.
- The "no app serves both audiences in one product; that is Volyume's opportunity"
  closing point is flagged INTERPRETATION (per research-15 F24/§5 separation),
  built on the VERIFIED Strong-vs-Hevy split, not a sourced standalone claim.
- The research's own biggest gap stands: hard quantified post-change outcomes
  (churn %, revenue deltas) exist only for Sonos, Digg, Notion, Garmin; most
  backlash is qualitative (research-15 §6).
All VOLYUME CURRENT claims trace to the navigation-psychology fragment with file:line
(RootNavigator.js / ProGate.js / theme.js / YouScreen.js) or to CLAUDE.md's stated
Free vs Pro split.
```
