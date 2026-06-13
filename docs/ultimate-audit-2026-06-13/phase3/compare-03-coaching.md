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
