# Internal Audit 02 — Coaching & Nutrition Engines (the intelligence, and how it reaches the user)

Deep audit 2026-06-12. Slice: the deterministic coaching/nutrition engines,
autoregulation, periodisation, and the COMMUNICATION layer between that
intelligence and the user — through the Beginner ("Besa") and Elite ("Eddie")
personas. Additive to the 2026-06-10 competitive audit. Research + blueprints
only; no code, no locked-doc edits. Hard constraints respected throughout
(deterministic engine, ED safety untouchable, offline-first, Free/Pro gating).

Files read: `src/lib/algorithms.js`, `nutritionEngine.js`, `mesocycle.js`,
`insightsEngine.js`, `recoveryEMA.js`, `robustTrend.js`, `weeklyCoach.js`,
`whyThisTemplates.js`, `coachingGoals.js` (getTrainingNote), `coachApply.js`,
`MethodologyScreen.js`, `CoachOutputScreen.js`, `VolumeBars.js`,
`VolumeHeatmapScreen.js`/`MesocycleBuilderScreen.js` (surfacing); locked voice
doc `COACHING_VOICE_SYNTHESIS_LOCKED.md`; competitive research `-01-ai-coaching`
and `-01-nutrition-coaching`. (Note: `src/lib/phaseEngine.js` and
`src/coaching/safety/` named in the brief do not exist as paths — phase logic
lives in `nutritionEngine.PHASE_*` + `weeklyCoach.PHASE_CONFIG`; the ED safety
system is embedded in `nutritionEngine` (FFM floor, kcal floors, loss-rate
gates), `weeklyCoach` (rapid-loss override, FFM hold), `edPatternDetector.js`,
and the locked copy in `whyThisTemplates.js`. I read these but propose nothing
that touches them.)

---

## A. How the engines actually work (so the findings are grounded)

**Training intelligence (`algorithms.js`).** Volume landmarks MV/MEV/MAV/MRV per
17 muscles (`VOLUME_LANDMARKS`), with indirect sets credited at 0.5
(`allocateExerciseVolume`). A 1RM ensemble (Epley×0.6 + Brzycki×0.4, rep-clamped
at 20). Double-progression with an RIR gate (load only rises when RIR was logged
AND ≥1 — a deliberate anti-overload guard for novices who over-estimate
headroom). Effective-sets weighting by RIR proximity (`getSetEffectivenessWeight`,
Robinson 2024). Adaptive landmarks after 3+ data points
(`computeAdaptiveLandmarks`), with a `getVolumeConfidence` ladder
(Estimated → Learning → Personalised). Plateau detection, lagging-muscle
detection, substitute selection by stimulus-to-fatigue ratio + stretch.
Per-session autoregulation (`computeSessionAdjustments`, ±1 set, capped at 2
exercises/session, weekly coach has right-of-way).

**Periodisation (`mesocycle.js`).** 5-week (beginner/intermediate) or 6-week
(advanced/competitive) blocks: intro → build → peak → recovery, with a
sets multiplier 1.0→1.25 then 0.5. `evaluateAutoReg` reads a feedback window and
returns continue/hold/reduce/deload with plain-English messages. Deload
prediction, time-crunch trimmer, block-status lifecycle.

**Nutrition (`nutritionEngine.js`).** Mifflin-St Jeor / Katch-McArdle BMR,
gym-tuned activity multipliers (deliberately ~10% below textbook), 7 phases,
experience-scaled surplus multipliers, 3 protein approaches (g/kg LBM or BW),
fat floor, carbs as remainder. Adaptive TDEE from EWMA weight trend
(`computeAdaptiveTDEEAdjustment`, 50% damped, ±5% capped). Step-trend modifier
that only changes *confidence/speed* of a resize, never sizes a calorie change
(explicitly avoids the MyFitnessPal "eat-back" anti-pattern). Diet-break trigger
(MATADOR). All hard-floored by kcal minima, the −1.5%/wk loss gate, and the
FFM/RED-S 30 kcal/kg floor.

**Weekly coach (`weeklyCoach.js`).** The integrator. Data-confidence gate
(`assessDataConfidence` holds the plan below 3 weigh-ins), autoregulation matrix
(recovery×performance → volume signal), robust trend smoothing
(`robustTrend.js`) for DECISIONS while SAFETY reads the less-damped plain EWMA.
Calorie/steps/cardio levers in priority order, held-decisions, "what's working",
and a single "why this week" line from a tiny `WHY_LIBRARY`.

**Voice (`COACHING_VOICE_SYNTHESIS_LOCKED.md`).** A genuinely excellent,
research-backed spec: three registers (cold-start factual weeks 0-2; warmed-by-
data weeks 3+; safety-cold during holds), honesty test, numbers-before-narrative,
mirror-don't-infer, externalise-the-pattern, a jargon blocklist enforced in code
(`assertNoJargon` throws in dev if MEV/RIR/mesocycle/surnames appear in
`whyThisTemplates` output).

**Bottom line:** the intelligence is genuinely top-tier — at or above MacroFactor
on adaptive TDEE honesty, well beyond Fitbod/RP on autoregulation transparency.
The brief's hypothesis is correct: **the weakness is not the engine, it is how
much of the engine the user ever sees, and how that surfacing differs (or fails
to differ) for Besa vs Eddie.** Almost every finding below is a *communication*
finding, not an *algorithm* finding.

---

## B. Findings, ranked (tagged Beginner / Elite / Both)

### F1 — Cold-start gives a Beginner almost nothing of value in week 1. [Beginner] [HIGH]
The whole engine is gated on data it doesn't have yet. `runWeeklyCoach` returns a
`data_hold` below 3 weigh-ins and a "baseline" output below 2 weeks / 4 weigh-ins
("Adjustments start after your second week"). `insightsEngine` requires a
**3-week, 6-session base** (`hasThreeWeekBase`) before *any* of its richest cards
(under-target muscle, deload-due) can fire. `computeAdaptiveLandmarks` needs 3+
points; `getProgressionSuggestion` returns "First time logging this exercise. Any
weight is a great starting point." This is methodologically honest and correct
for Eddie. For Besa — the persona who churns fastest and needs a quick win in
D0–D14 (shared brief) — the engine is effectively silent or apologetic for the
entire activation window. The competitive AI-coaching research already flagged
Dr. Muscle/Fitbod's cold-start as a black-box failure and MacroFactor's
"recommendations become 120-170% more accurate over time" as a *trust* asset
*because it's framed as a journey*. Volyume has the honesty but not the journey
framing at cold-start.
- **Opportunity (no engine change):** a deterministic "Week 1 starter coaching"
  surface that uses what *does* exist on day 0 — the nutrition targets (computed
  from onboarding instantly), `getWeekPhaseDescription('intro')`, the
  `getSetupReceiptLine` division receipt, `getVolumeStatusMessage('below_minimum')`
  for the planned muscles, and the *promise* of what unlocks at week 2/3. Frame
  the data-hold not as "not enough data" but as "here's what I can already tell
  you, and here's exactly what the first 3 weigh-ins unlock." This is a copy +
  placement blueprint, not a maths change. Serves activation/retention.

### F2 — The voice spec's three registers are not consistently wired to persona/tenure. [Both] [HIGH]
The locked doc is one of the best assets in the codebase, but its register
*selection* is largely tenure-based (weeks 0-2 cold, 3+ warm, safety-cold) and
applied surface-by-surface, not driven by an explicit Beginner/Elite signal. The
result in code: `WHY_LIBRARY` lines and `getTrainingNote` are written once and
read identically by Besa and Eddie. Eddie wants density and methodology; Besa
wants encouragement-via-data and reassurance. The doc itself flags this as Open
Question #1 ("whether 'Precision Coaching' as a named actor reads as cold to
users who otherwise expect warmth"). There is `experienceLevel` /
`goalLockAdvanced` already flowing through the engines — a register selector
could key off it without inventing new state.
- **Opportunity:** propose a *persona-aware register layer* on top of the locked
  doc (a PROPOSAL for the founder, not an edit): same honesty test, same
  numbers-first, but Beginner output adds one short reassurance/orientation clause
  ("this is normal, here's the next step") and expands jargon inline, while Elite
  output stays terse and exposes the precise figures (rate %, kcal delta, set
  deltas). The maths and decision are identical; only the prose wrapper differs.
  Compliant: still deterministic, still honest, still British English.

### F3 — Jargon leaks in the "advanced" surfaces even though the core copy is clean. [Beginner] [MED-HIGH]
The jargon discipline in `whyThisTemplates`/`insightsEngine` is excellent and
linter-enforced. But the guard only covers *those* exported strings. The
periodisation/analytics UI exposes raw jargon: `MesocycleBuilderScreen` uses
"mesocycle", "tonnage", "Weekly load (kg moved)"; `VolumeHeatmapScreen`/
`CoachReviewScreen` carry MEV/landmark concepts; `MesocycleBuilderScreen.js`
literally names the screen "Mesocycle". The word "mesocycle" is on the jargon
blocklist for coach copy yet is a *screen title* a beginner navigates to.
"Tonnage" is unexplained. For Besa this is the exact intimidation the dual-market
mandate warns about; for Eddie it's fine and even desirable.
- **Opportunity:** a beginner-facing alias layer (a PROPOSAL): "Mesocycle" →
  "Training block", "Tonnage / Weekly load" → "Total weight lifted", with the
  precise term available on tap (an InfoTooltip that says "we call this a
  mesocycle"). Show the precise term to advanced/competitive users by default.
  This is the "progressive disclosure" pattern — accessible by default,
  precise on demand — and is the single cleanest way to serve both personas from
  one engine.

### F4 — The engine's best intelligence is under-surfaced ("great logic, invisible"). [Both] [HIGH]
Several genuinely differentiating computations have weak or no surface presence:
- **Effective sets (RIR-weighted volume)** — `calculateEffectiveSets` is a real
  edge over set-counting competitors, but the user mostly sees raw working sets
  on the heatmap. Eddie would *love* "12 sets logged, 9.4 effective" with the
  reason; Besa never needs the number but benefits from the conclusion ("a couple
  of those sets were too easy to count").
- **Adaptive landmarks + confidence ladder** — `getVolumeConfidence`
  (Estimated/Learning/Personalised) and the `note` from `computeAdaptiveLandmarks`
  ("You recover well here. Target raised by N sets.") is a beautiful, motivating
  "the app is learning *me*" moment. It is surfaced thinly. This is the MacroFactor
  "it gets more accurate" trust mechanic — Volyume has it and barely shows it.
- **Plateau / lagging-muscle / deload prediction** — strong deterministic signals
  with ready plain-English messages (`detectPlateau`, `detectLaggingMuscles`,
  `predictDeloadWeek`/`getDeloadPredictionMessage`) that mostly live in screens a
  beginner won't open.
- **Opportunity:** surface these as the *content* of the For-You / Home coaching
  feed (placement: Home tab, top, daily-return habit loop), gated by tenure so
  Besa sees the conclusion and Eddie can expand to the figures. Highest
  retention/credibility leverage of anything here, and it's all already computed.

### F5 — Defaults for a no-data user are sane but the *experience-level* default quietly mis-serves Besa. [Beginner] [MED]
`calculateNutritionTargets` defaults `experienceLevel='intermediate'`;
`getMesoSchedule` treats everyone non-advanced as the 5-week standard.
Intermediate surplus multipliers (1.0) and gain-rate targets (0.15-0.30 kg/wk)
are *more conservative* than the beginner ones (1.30 mult, 0.25-0.50 kg/wk) — so
a true beginner who doesn't self-identify is under-fed for muscle gain and given
slower expected progress than they'd actually make. The defaults are physically
safe (good) but psychologically costly for Besa (slower visible progress = the
exact thing that drives early churn). Conversely the mesocycle defaults are fine.
- **Opportunity:** make onboarding capture experience explicitly and *default to
  beginner* when training history is <12 months (matches the persona definition),
  or infer it. Low effort, real activation effect. Note: this is a default/UX
  change, the maths is untouched.

### F6 — The single "why this week" line is a bottleneck on perceived intelligence. [Both] [MED]
`runWeeklyCoach` computes a rich object (trend, matrix, calorie/step/cardio
levers, held decisions, what's-working) but `whyThisWeek` collapses to ONE line
from a 16-key library via `pickWhy`. The locked doc's Pattern 11 ("one decision
per screen") justifies restraint, and that's right for the *headline*. But the
depth exists and Eddie specifically (per the AI-coaching research: power users
ask "why" 40% of the time, à la Whoop) wants to drill in. The Methodology screen
is excellent but generic (it's static, same for every user). There is a gap
between "one line" and "static methodology" with nothing user-specific in
between.
- **Opportunity:** an expandable "the full read" under the why-line that lists
  *this user's* signals in numbers (recovery score, performance score, trend %
  vs target, which levers fired and which were held and why) — assembled from the
  object the engine already returns. Beginner sees the one line; Elite expands.
  Pure presentation of existing data.

### F7 — Held decisions are honest but can read as the app doing nothing. [Both] [MED]
The held-decisions logic is thorough and safety-correct (FFM floor, ED lockout,
cooldown, on-target, low-data). The Methodology screen even pre-empts this ("A
held week is the system working, not the system asleep"). But that reassurance
lives on a screen the user has to navigate to. On the weekly card itself, a run
of held weeks (common for a steady beginner on-target) can feel like the £-paid
engine isn't earning its keep — a known churn driver.
- **Opportunity:** when holding, pair the hold with a forward-looking,
  data-referenced line ("on target — this is exactly where you should be; next
  decision point is X") and surface what the engine *is* still doing (watching N
  signals). Reframes a hold as active stewardship. Copy/placement only.

### F8 — Autoregulation messaging assumes the user understands *why* sets move. [Beginner] [MED]
`getAutoRegMessage`, `getSessionAdjustmentMessage`, and the volume-status
templates are well-written and jargon-free. But for a true beginner, "Next week
loses 1-2 sets per exercise" or "1 set fewer on chest today" without a
*mechanism* clause can read as the app being arbitrary or "taking work away"
(demotivating). The locked doc's Pattern 6 (rationale-attached prescription) is
applied unevenly — the weekly notes carry rationale, but the terse per-session
session-adjustment lines often don't (length-capped by design).
- **Opportunity:** for beginner tenure only, allow a one-clause "why" on session
  adjustments ("…so the muscle finishes recovering and grows"). Elite keeps the
  terse line. Serves trust/adherence.

### F9 — Protein "g/kg" label is technically ambiguous and could erode Elite trust. [Elite] [LOW-MED]
`PROTEIN_APPROACHES.*.range` is shown under a plain "g/kg" label that a user
reads as g/kg *bodyweight*, while the engine may compute on LBM. The code comment
acknowledges this and chose the bodyweight-honest range deliberately — good. But
Eddie, who tracks this precisely, may notice his delivered `proteinGPerKgLbm`
differs from the displayed band and question rigour. Not a bug; a
transparency-of-basis surfacing gap.
- **Opportunity:** for advanced/competitive, show the basis explicitly ("2.8 g/kg
  lean mass" with the BW equivalent). Already computed (`proteinBasis`,
  `proteinGPerKgLbm`). Credibility only; low effort.

### F10 — Two EWMA/robust-trend systems are a hidden strength worth *narrating* to Eddie. [Elite] [LOW]
The dual-trend design (robust Holt's-linear for decisions, plain less-damped EWMA
for safety) and the water-weight-robust smoother are sophisticated and exactly
the kind of methodology transparency that wins competitors away from
MacraFactor/RP. It is invisible to users.
- **Opportunity:** a one-paragraph "how we read your weight" explainer in the
  methodology/InfoTooltip aimed at advanced users ("we damp water-weight spikes
  but never damp a real loss, so a safety signal is never masked"). Credibility
  for Eddie; ignorable by Besa.

---

## C. Cross-cutting recommendation

The through-line of every high finding: **the engine is built for Eddie and
communicated for Eddie. The dual-market win is a progressive-disclosure
presentation layer over the *unchanged* deterministic engine** — conclusion-first
for Besa, figures-on-demand for Eddie — keyed off the `experienceLevel` /
`goalLock` signals that already flow through the code, governed by a
persona-aware extension to the (excellent) locked voice doc. No maths changes, no
new AI, no safety changes. That is the cheapest, highest-leverage move and it
contradicts nothing in the prior audit — it operationalises the AI-coaching
research's own "say the quiet part loudly: no AI, explainable rules" positioning
for the *beginner* half of the market the prior audit under-served.

### Disagreement with prior conclusions
The 2026-06-10 AI-coaching research concluded Volyume already "exceeds" Carbon on
explanation. True for the *weekly card line*. But this audit finds the
explanation depth is **bimodal** — one terse line, or a static methodology page —
with nothing user-specific and expandable in between, which is precisely the
register that converts power users (the Whoop "40% ask why" finding the same doc
cites). The explanation lead is real but shallower than the prior doc implies.

### Constraint/locked-doc tensions flagged (PROPOSALS only)
- F2/F8 persona-aware register + session rationale = an *extension* of
  `COACHING_VOICE_SYNTHESIS_LOCKED.md`. Flag to founder; do not apply.
- F3 jargon-alias layer touches screens whose copy is founder-gated
  (MethodologyScreen comment notes the gate). Proposal only.
- Nothing proposed lowers a floor, adds AI/randomness, alters Free/Pro gating, or
  touches the ED safety system.

---

## D. Top 5 to action (effort • persona • effect)

1. **F1 Week-1 starter coaching surface** — M effort • Beginner • activation/retention. Reframe the data-hold into a day-0 valuable read.
2. **F4 Surface the invisible intelligence in the Home/For-You feed** — M • Both • retention/credibility. Effective sets, confidence ladder, plateau/lagging — all already computed.
3. **F2 Persona-aware voice register (PROPOSAL)** — M • Both • retention/conversion. One engine, two prose wrappers.
4. **F3 Beginner jargon-alias / progressive disclosure (PROPOSAL)** — S-M • Beginner • activation. "Mesocycle"→"Training block" etc., precise term on tap.
5. **F5 Default to beginner experience-level from onboarding** — S • Beginner • activation. Stops under-feeding/under-promising true beginners.
</content>
</invoke>
