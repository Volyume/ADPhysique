# CAMPAIGN 20 — PHASE 1: LIVE SET PRESCRIPTION & PROGRESSIVE OVERLOAD INTELLIGENCE

**Research, production trace and authoritative design. NO implementation in this phase.**

- Date: 2026-08-16
- Baseline traced: `origin/main` at `9816b601` (verified at campaign start; tree clean)
- Source prompt: founder campaign brief 2026-08-16 ("LIVE SET PRESCRIPTION & PROGRESSIVE
  OVERLOAD INTELLIGENCE — CAMPAIGN 20 PHASE 1")
- Status: design document for founder review. On acceptance this becomes the binding
  implementation specification for Phase 2.
- All file:line references are against `9816b601`.

---

## 1. EXECUTIVE VERDICT

**B. Partially sound but materially incomplete.**

The honest summary of production, after tracing every live number (Section 2):

1. **Volyume has a real next-session progression engine and it is sound at its core.**
   `computeSetTargets()` (src/lib/algorithms.js:412) implements double progression with
   an honest effort gate (FQ-3: session difficulty 1–3 corroborates a load add; 4–5 or
   skipped holds), consecutive-miss load drops, a 5% session-over-session jump cap, a
   layoff reduction, and a session high-water anchor pass. This is not a naive copier.

2. **But that engine is next-session-only and nearly invisible.** Its computed target
   WEIGHTS render almost nowhere in the live logger: the NowCard position line and the
   upcoming previews show only the rep range; the target weight surfaces only in the
   deload prefill row and occasionally in one line of reason copy shown before the first
   working set. The founder's perception that Volyume "relies on the same ordinal set"
   is the correct perception of the SURFACES, because the numbers the athlete actually
   sees and touches are history echoes, not the engine's output.

3. **There is no live next-set prescription in production at all.** `setTargets` is
   computed ONCE per exercise load from the previous session's sets and never updated
   within the session. Today's Set 1 performance changes nothing about what the app
   suggests for Set 2 — the only within-session response is the carry-forward, which
   echoes exactly what was just lifted, with no intelligence attached. The founder's
   core request — "given what happened earlier today, what should I aim for now?" —
   has no owner in the codebase.

4. **The visible ordinal teaching is real, and it lives in three places:** the
   "Last session:" reference row (`prevWorking[workingLogged]`, strictly ordinal,
   tappable), the ghost prefill (`prev[ghostIndex]`, ordinal), and `computeSetTargets`'
   per-ordinal target array. The example concern in the brief (Set 3 = 75kg forever) is
   reachable exactly as described: after logging Set 2 at 80, the reference row invites
   the athlete back down to last session's 75 for Set 3, every session, forever.

5. **Authority is fragmented.** Five independent mechanisms currently decide or suggest
   load/reps (Section 3), with three different anchor semantics and at least four
   independent increment sources — including a dead function (`getProgressionSuggestion`)
   and a screen-local stall detector (`stalledAdvice`) that hard-codes `+2.5` regardless
   of units, equipment increment or exercise category.

6. **One existing behaviour actively fights Law E (back-off preservation) in the wrong
   direction.** `computeSetTargets`' second-pass anchor raises every below-best set's
   target to the session's heaviest load ("set targets raised to match your best set"),
   which by construction erases a deliberate 100/90 top-set/back-off structure — while
   the reference row simultaneously preserves it. The two surfaces disagree about what
   the athlete should do.

Why not verdict A: the missing live resolver is not a presentation problem — the number
the athlete needs does not exist anywhere in the data flow. Why not verdict C: the
next-session engine, the effort gate, the seniority of deload/readiness/re-entry, and
the carry-forward UX are all worth keeping; this is completion and unification, not
replacement.

---

## 2. CURRENT PRODUCTION TRACE

Every live number in the logger, traced hands-on at `9816b601`. The load path runs in
`loadHistory()` (src/screens/ActiveWorkoutScreen.js:1400–1615), which fires on every
exercise change.

### 2.0 The data the trace runs on

- `getLastNWorkoutSets(exercise.id, activeWorkout.id, 2)` → `prev` (last completed
  session's sets for this exercise) and `prevPrev` (the one before). Window: exactly 2
  sessions (ActiveWorkoutScreen.js:1402).
- `getAllCompletedSetsForExercise` → `allTimeSets` (all-time, for PR detection and the
  stalled nudge) (1403).
- `prevSessionDifficulty`: the previous workout row's 1–5 post-session rating, null when
  skipped — never fabricated (1415–1422, C5-P17-01).
- `layoffMultiplier`: 0.9 when the last session is >7 days old, else 1.0 (1439–1441).

### 2.1 Concept A — the number physically prefilled into Weight

Priority order, as the code actually executes:

| # | Source | Code | When it wins |
|---|--------|------|--------------|
| 1 | Exercise-change reset | `setCurrentSet({...DEFAULT_SET})` (1381) | Momentarily, on every exercise change |
| 2 | **Best-anchor seed**: `getBestAnchorSet(prev, currentWorkingCount) \|\| prev[last]` — the ACTUAL weight lifted last session, ordinal-indexed but floored at the session's heaviest working set | 1468–1476; workoutHelpers.js:48 | Whenever last session had a loaded set. The comment records the founder-era decision: prefill what was ACTUALLY lifted (Strong/Hevy behaviour), NOT the computed target — "the target felt random to users" |
| 3 | Zero-history seed: `routineExercise.startingWeight ?? ''` | 1489–1494 | First-ever exposure (C5-P14-02: reps seed at the BOTTOM of the band) |
| 4 | Ghost overlay: `prev[ghostIndex] ?? prev[last]`, applied only if the box is empty/0, marked `isGhost: true` | 1424–1436, 1497–1516 | In practice only when the anchor seed produced no loaded weight (bodyweight history etc.) — the anchor seed usually fills the box first |
| 5 | Deload replacement: `generateDeloadPrescription(week1Sets, true)[0]` | 1555–1591 | Deload week: week-1 load, 50% reps — replaces both box and `setTargets` |
| 6 | Draft restore: AsyncStorage draft, only if its `workingCount` matches this set position | 1599–1614 | Backgrounded/killed mid-set |
| 7 | **Carry-forward**: after every logged working set, the box becomes exactly what was just lifted | 1856–1861 | The rest of the session — this is the number the athlete sees for sets 2..N |
| 8 | Warm-up→working auto-switch: `displaySetTargets[0].weight` + `prefillRepsForTarget(anchor0, target0)` | 1965–1987 | After logging a warm-up — the ONE place a computed target weight enters the box |

**Ordinal-set dependency:** partial. `getBestAnchorSet(prev, workingIdx)` prefers the
same-ordinal set but returns the session's heaviest working set whenever the ordinal
set is lighter (workoutHelpers.js:53–54). So the SEED anchors UP to the session max —
for the brief's example (80/80/75), the Set 1 seed is 80, and even a hypothetical Set 3
seed would be 80, not 75. The pure ordinal echo is NOT in the weight box.

**Current-session dependency:** echo only. Carry-forward repeats today's last working
set verbatim. No rule ever adjusts it — stronger or weaker performance today changes
nothing.

**Readiness/re-entry dependency:** none. The readiness trim applies only to
`displaySetTargets` (display); the box seed and carry-forward ignore it. The layoff
multiplier reaches the box only via path 8 (warm-up switch) or the deload path.

**User override behaviour:** the box is freely editable; a typed value survives via the
draft (path 6) until logged; after logging, carry-forward adopts the typed value — so a
user override IS respected for subsequent sets, but only by echo, not by decision. The
tappable "Use" on the reference row (Concept C) overwrites the box with last session's
ordinal values.

### 2.2 Concept B — the number physically prefilled into Reps

Same seed sites as Concept A: the anchor set's `actualReps` (1473); bottom-of-band
`recommendedRepsMin` on zero history (1491, C5-P14-02); ghost's reps; deload's halved
reps; carry-forward of the reps just done (1857); and on the warm-up switch,
`prefillRepsForTarget(anchorSet0, firstTarget)` (workoutHelpers.js:67) — beat the
anchor by one rep when that stays inside the band, else the band minimum. This
beat-one-rep rule is the app's only live rep-progression intelligence, and it fires
exactly once per exercise (and only for warm-up users).

### 2.3 Concept C — the "Last session" reference

`prevWorking[workingLogged]` — strictly ordinal, warm-ups filtered first (D1 #2)
(ActiveWorkoutScreen.js:3341–3374). Rendered in the NowCard prefill row as
"Last session: {w}{units} x {reps}" with a tappable "Use" that overwrites the box.
**This row is the purest ordinal copier in the product** and the primary carrier of the
"Set 3 = 75 forever" behaviour. It is honest as HISTORY; the defect is that it is the
only per-set guidance visible mid-session, so it functions as prescription by default.
On deload it is replaced by the "Recovery week -" variant (3352–3361). The first-time
quiet line was retired in the density pass (3376–3381).

### 2.4 Concept D — suggestion/recommendation surfaces

- `setTargets` + `targetReason` ← `computeSetTargets(prev, repsMin, repsMax, units,
  {category, incrementKg, prevPrevSets, layoffMultiplier, prevSessionDifficulty})`
  (1447–1461). Computed once per exercise load. Details of the engine in §2.8.
- `displaySetTargets` = readiness-trimmed copy (`applyReadinessToTargets`, downward
  only, deload rows untouched) (632–633; sessionAdjustments.js:295–304).
- What actually renders from it:
  - the NowCard position line's rep range `{repsMin}-{repsMax} reps`
    (`displaySetTargets[workingLogged]`, 3338–3349);
  - the upcoming set previews' rep ranges (`displaySetTargets[n-1]`, quiet lines);
  - the deload prefill row's weight (the ONE place a target weight is tappable);
  - `targetReason` as a coach line (Concept G).
- **The engine's target WEIGHT for ordinary sets renders nowhere.** A user can go
  weeks without ever seeing the number `computeSetTargets` computed for them.

### 2.5 Concept E — the target used after a set is logged

After `handleCompleteSet`: carry-forward seeds the box with what was just lifted
(1856–1861); `displaySetTargets[workingLogged]` re-indexes into the STATIC target
array for the new position's rep range. Nothing recomputes. There is no mechanism by
which today's logged sets alter today's remaining suggestions.

### 2.6 Concept F — the next-session prescription

Nothing is persisted. The "next-session prescription" is `computeSetTargets` re-run
at the NEXT session's exercise load from `getLastNWorkoutSets(…, 2)`. So Volyume's
next-session intelligence exists (see §2.8) but is recomputed live and then mostly
hidden (§2.4). History window: exactly the previous session, with the one before used
only for consecutive-miss detection.

### 2.7 Concept G — the progression explanation

One coach-line slot on the NowCard, shown only before the first working set of an
exercise, dismissible per exercise (3306–3336). Priority chain:

1. `sessionAdjustment.reasonText` (COMP-015 ±1 set line) — unless the readiness trim
   drives a lower target;
2. `readinessLine` (below-par / re-entry why-copy);
3. `stalledAdvice` — a screen-local IIFE (2822–2846): all-time sets grouped by
   session, heaviest set per session, last 3 sessions; if weight within 0.1 and reps
   within 1 across all three → "Same weight 3 sessions running. Try {w+2.5}{units} x
   {r-1}, or stay at {w} and push for {r+1}." The `+2.5` is a hard-coded literal —
   it ignores units (lbs users get a kg-sized jump), `incrementKg`, category, and
   `defaultIncrement()`;
4. `targetReason` from `computeSetTargets` (the honest FQ-3 hold copy, layoff copy,
   anchor copy, "All sets hit the top of the range. Add {inc}{units} next session.").

### 2.8 The next-session engine itself — computeSetTargets (algorithms.js:412–633)

Per working set i of the previous session (ordinal):

- `prevReps >= repMax` → load add ONLY when `effortSupportsLoad` (difficulty 1–3) AND
  `prevWeight > 0` (FR-C4-4 bodyweight guard); increment = `incrementKg` override or
  `defaultIncrement(weight, units, category)`, capped at 5% of the load, rounded to
  0.25, floored at +0.25. Very-hard (4–5) or skipped difficulty → hold with honest
  copy (FQ-3, D96).
- `prevReps < repMin` → drop one increment only on a CONSECUTIVE miss ≥2 reps (checked
  against `prevPrevSets` same ordinal); single miss holds.
- In range → same weight, `targetMin = prevReps + 1` capped at repMax (`add_rep`).
- Layoff: all targets ×0.9, rounded 0.25, action `decrease`.
- **Second-pass anchor** (554–587): any set whose previous weight was below the
  session's heaviest gets its target raised to that best weight (or best+increment when
  the best set topped the band with corroborating effort). Skipped under layoff
  (LS-04/H-13). This pass is where deliberate back-offs get "corrected" upward —
  the direct collision with Law E examined in §6.
- Reason copy: one string for the whole exercise (isLayoff / toppedVeryHard /
  toppedEffortUnknown / topped-bodyweight / anchored / allIncrease / anyDecrease /
  anyIncrease / allMaintain).

### 2.9 Senior modifiers confirmed in the trace

- **Deload** replaces box + targets + reason entirely (1555–1591); readiness never
  touches deload rows (sessionAdjustments.js:299); COMP-015 is silent on deload weeks
  (algorithms.js:1111).
- **Readiness / re-entry** (B2/C18): one downward-only tweak, never stacked
  (`resolveSessionEasingTweak`, sessionAdjustments.js:360–365), trims display targets
  5% (round DOWN to 0.25) and set counts −1; dismissible.
- **Set-count authority:** `targetSets = adjustedSetCount || recommendedSets ||
  DEFAULT_FREEFORM_TARGET_SETS` (2800) where `adjustedSetCount` = min(COMP-015,
  readiness) over the FQ-4 weekly allocation base (588–627).
- **Per-set effort input does not exist.** RIR fields survive in old rows and in
  `getProgressionSuggestion`, but no surface collects RIR (D14/D19); the engine's only
  effort evidence is session difficulty (FQ-3).

### 2.10 Increment / unit sources found (Concept: load rounding)

| Source | Value | Used by |
|--------|-------|---------|
| `defaultIncrement(weight, units, category)` (algorithms.js:313) | kg: 2.5/1.25 compound, 1/0.5 isolation, 1.25/0.75 accessory; lbs: 5/2.5, 2.5/1.25 — load-dependent | computeSetTargets (via getIncrement), getProgressionSuggestion (dead) |
| `exercise.incrementKg` | per-exercise override | computeSetTargets option; SetEntry stepper |
| `weightStepKg={exercise?.incrementKg \|\| 2.5}` (screen 3283, 3397) | falls back to **2.5 regardless of units or category** | SetEntry +/− steppers |
| `stalledAdvice` literal `+2.5` (3312) | hard-coded, unit-blind | stalled coach line |
| computeSetTargets rounding | 0.25 grid + 5% cap + 0.25 floor | targets |
| deload rounding | 0.5×, 0.25 grid | deload prescription |
| readiness trim | ×0.95 round DOWN 0.25 | display targets |

Four independent increment authorities and three rounding conventions. §10 defines the
single source of truth.

---

## 3. DUPLICATED / COMPETING AUTHORITY MAP

Every function currently capable of deciding weight, reps, a load increase, an anchor,
or a historical prefill — with its Phase 2 classification.

| # | Authority | Location | What it decides today | Classification | Rationale |
|---|-----------|----------|----------------------|----------------|-----------|
| 1 | `computeSetTargets()` | algorithms.js:412 | Next-session per-ordinal-set weight+rep targets, load adds/drops, layoff, anchor pass, reason copy | **KEEP (refactored)** | The only real progression engine; its double-progression core, FQ-3 effort gate, 5% cap, consecutive-miss rule and layoff handling survive as the NEXT-SESSION layer of the new resolver. Its second-pass anchor is AMENDED by Law E (§6) — back-off-aware instead of flat "raise to best". Its per-ordinal framing is replaced by top-set + structure framing (§9). |
| 2 | `getBestAnchorSet()` | workoutHelpers.js:48 | The weight/reps SEED at exercise load (ordinal with heaviest-set floor) | **MERGE** | Its two ideas (prefer position, never seed below session best) move into the resolver's session-start contract. As a standalone it is a second anchor law that disagrees with authority 1's anchor pass (seed floors at best; targets RAISE to best) and with authority 5 (ghost has no floor). |
| 3 | `prefillRepsForTarget()` | workoutHelpers.js:67 | Beat-anchor-by-one-rep prefill (warm-up→working switch only) | **MERGE** | The beat-one-rep rule is correct and becomes the resolver's rep-progression micro-rule, applied consistently instead of on one path. |
| 4 | `getProgressionSuggestion()` | algorithms.js:339 | Nothing — zero production callers | **RETIRE** | Dead since the Campaign 4 audit; kept only because its CALC-5 test was the sole bodyweight-progression pin (FR-C4-4). That guard now exists INSIDE computeSetTargets (`prevWeight > 0` at :486, comment "FR-C4-4 (resolved here)"). Phase 2 migrates the CALC-5 pin onto computeSetTargets/resolver tests, then deletes this function and its RIR-based logic (the last per-set-RIR consumer). |
| 5 | Ghost prefill | ActiveWorkoutScreen.js:1424–1436, 1497–1516 | Ordinal previous-session values overlaid on an empty box, `isGhost: true` | **RETIRE (as an authority)** | A third anchor with different semantics (pure ordinal, no floor). The resolver's prescription takes over the "app-suggested value in the box" role; the ghost RENDERING mechanics (grey suggestion styling, replaced-on-type) are reused for presentation, not decision. |
| 6 | Carry-forward | ActiveWorkoutScreen.js:1856–1861 | The box for sets 2..N = what was just lifted | **KEEP (subordinated)** | Founder-endorsed Strong/Hevy behaviour and the strongest single piece of live evidence. It stops being an unconditional echo: it becomes the resolver's `todayActual` input, and the resolver decides when the box shows it verbatim vs adjusted (§12, §16). |
| 7 | `stalledAdvice` | ActiveWorkoutScreen.js:2822–2846, 3312 | 3-session same-weight stall nudge with hard-coded +2.5 | **RETIRE** | Duplicates the canonical plateau law (`detectPlateau`, algorithms.js:1427 — e1RM-based, time-gated, eligibility-filtered) with weaker evidence (raw weight/reps, no time gate, no cluster-row exclusion) and a unit-blind literal increment. Its user-facing intent (a concrete next step when stalled) is carried by the resolver's `RANGE_STALLED` provenance using the one increment source. |
| 8 | `generateDeloadPrescription()` | algorithms.js:1625 | Deload week box + targets | **KEEP (senior, untouched)** | Law F. The resolver receives deload as a senior override and never runs its progression logic under it. |
| 9 | `applyReadinessToTargets/Sets/Load` | sessionAdjustments.js:269–304 | Downward-only display trim | **KEEP (senior, untouched)** | Law F. Applied AFTER the resolver, exactly as it is applied after computeSetTargets today; the downward-only fuzz invariant is preserved. |
| 10 | `defaultIncrement()` | algorithms.js:313 | Category/unit/load-aware plate step | **KEEP (promoted)** | Becomes the single increment source of truth (§10). The `weightStepKg` fallback (`\|\| 2.5` at 3283/3397) and stalledAdvice's literal are the two callers to correct in Phase 2. |
| 11 | Draft restore | ActiveWorkoutScreen.js:1599–1614 | Restores typed-but-unlogged values | **KEEP (display-only)** | Not a prescription authority — it protects user input. Ordering with the resolver is specified in §16 (user draft beats prescription). |
| 12 | `detectPlateau()` / `detectProgressionConsistency()` | algorithms.js:1427/1595 | Plateau claims elsewhere in the app | **KEEP (display-only here)** | Not a live prescription input in Phase 2 (its 3-week horizon answers a different question), but the resolver's provenance must never contradict it — the shared primitive is `sessionBestE1rm`/`isE1rmEligibleRow`. |

End state (the "one authority" requirement): **one pure resolver** owns every
prescribed number in the live logger; authorities 8 and 9 are senior overrides applied
around it; authorities 6 and 11 are user-evidence inputs to it; everything else is
merged, retired, or display-only.

---

## 4. RESEARCH SYNTHESIS

Full evidence base with per-claim classification and source links:
`docs/live-prescription-campaign-20-2026-08-16/EVIDENCE-SCIENCE.md` (primary-literature
sweep, 10 questions, every claim tagged SUPPORTED / REASONABLE COACHING INFERENCE /
UNSUPPORTED). The findings that BIND this design:

**SUPPORTED (design-binding):**
- Load progression and rep progression produce equivalent hypertrophy outcomes; load
  matters more for strength (Plotkin 2022 PeerJ; IJSM 2024; Schoenfeld 2017 JSCR).
  → The resolver may progress on either axis without an evidence penalty; rep-first is
  legitimate wherever the equipment increment is coarse.
- Rep drop-off across sets at fixed load is systematic and large near failure (bench
  70%1RM, 2-min rest: 12.5 → 6.1 → 4.2 reps, Heredia-Elvar 2022), strongly moderated by
  rest and exercise size (Miranda 2009; Willardson 2005/2011: compounds needed ~15%
  load cuts to hold reps, isolation ~0%). Later-set variability GROWS faster than the
  mean falls (CV 17.5% → 47.4% across three sets).
  → Requiring every set to top the band before a load add is arithmetically
  near-unreachable; later-set reps are a noisy signal and must be down-weighted.
  This AMENDS computeSetTargets' per-ordinal-set framing (§10).
- Adjusting later sets from earlier-set performance TODAY is the mechanism of
  APRE/DAPRE, with trial support (Mann 2010; Ghobadi 2022) and acute mechanism support
  (Cowley 2025: below-expectation days need a downshift to preserve volume).
  → Law B / §12 is evidence-backed in direction, not in Volyume's exact thresholds.
- **±1–2 reps at a given load between sessions is normal measurement noise** for a
  trained lifter (Jukic 2024, mean error <2 reps; Grgic 2020, 1RM CV median 4.2%;
  Greig 2020's zero-mean-readiness framing).
  → The resolver's central noise threshold: deviations within ±2 reps change nothing.
- Session-level difficulty ratings are validated as GLOBAL internal-load measures
  (Day 2004; Haddad 2017; Refalo 2025) and cannot reconstruct per-set proximity to
  failure (Hackett 2017: estimation error >2 reps when far from failure).
  → FQ-3's session-level gate is exactly the right granularity; per-set RIR inference
  stays forbidden (consistent with the standing D14/D19 removal).
- Exercise order/session position strongly affects acute rep capacity (up to ~34–42%
  total-rep loss when an exercise moves later; Simão 2012) with no long-term
  hypertrophy penalty (Nunes 2021).
  → Cross-session comparability must tolerate order effects: a "weaker" session may be
  a later-slot session. Handled by the noise threshold + outlier discount rather than
  order detection (order is not reliably known; §21 notes this as a non-question).

**REASONABLE COACHING INFERENCE (adopted, labelled as convention):**
- Double progression as the default pathway (untested as a named intervention; a
  defensible scheduling convention consistent with the equivalence data).
- Load-increase trigger on a best/first-set criterion sustained over TWO consecutive
  exposures, increment inside the ACSM 2–10% band rounded to the equipment grid
  (ACSM 2009 is consensus, not trial).
- A bounded 2–4 session recency window (engineering choice justified by measurement
  error √k reduction; no comparative trial exists).
- Expected within-session decline of ~0–1 rep/set (isolation) to 1–2 reps/set (large
  compounds) at near-but-not-to failure efforts — the conservative prior for §13.
- Per-user learned set-position patterns as more reliable than a global constant
  (individual profiles are stable — Jukic 2024 — but the trait claim is untested).

**UNSUPPORTED / MUST NOT CLAIM (bound into copy and provenance):**
- That any specific criterion (all-sets/majority/first-set), window length, or
  increment size is "evidence-based" or proven superior.
- Any per-set RIR/effort inference from the session rating.
- "+1 rep beats +load" or the reverse, as a general claim.
- "±18% daily 1RM variation" as a measured fact (commentary-sourced).
- Any user-facing certainty language ("optimal", "your true capacity"). Approved
  framing: "based on your recent sessions".

---

## 5. COMPETITOR FINDINGS

Full report with vendor-verbatim quotes and per-product sourcing:
`docs/live-prescription-campaign-20-2026-08-16/EVIDENCE-COMPETITORS.md` (Hevy, Strong,
Alpha Progression, KeyLifts, RP Hypertrophy, Boostcamp, Fitbod, JuggernautAI, Jefit,
Caliber, GymBook — official help-centre articles plus App Store review mining; no
binaries examined). What binds this design:

**Historical reference vs prescription — the industry contract:**
- The complaint-free standard (Hevy today; Strong pre-v6.0.3) keeps FOUR slots
  distinct per set row: a non-editable PREVIOUS reference (same-ordinal, blank when
  no history — "no history, no reference, do not fabricate one"), the editable
  target fields (carrying the PLAN's values, not raw history), a carry-forward rule
  updating the plan from actuals (Hevy: silent for values, prompted for structure —
  zero complaints at 86k ratings), and a commit affordance (pre-6.0.3 Strong: tick
  on an EMPTY row logs the reference values).
- **The natural experiment on prefill:** Strong v6.0.3 (May 2025) switched from
  blank-boxes-plus-reference to hard-prefilling HISTORY into the editable fields and
  took sustained review backlash ("I have to delete inputs - one by one"). Prefill
  from a PLAN is accepted everywhere; prefill from raw history is the documented
  failure. Volyume's resolver output is a plan-grade prescription, which is the
  accepted kind — but this evidence is why §16 keeps ghost styling, why LOW
  confidence falls back rather than fabricating, and why the reference row never
  disappears.
- Base Hevy and Strong do NOT prescribe. Hevy Trainer (Pro, Feb 2026) now does —
  deterministic ("do not rely on AI"), advancing only when the top of the range is
  hit on ALL prescribed sets between sessions. Alpha Progression publishes its
  double-progression rule per set; KeyLifts publishes full percentage tables; RP
  prescribes load+reps+volume with blessed overrides; JuggernautAI is the only
  shipped SET-TO-SET adapter (driven by per-set RPE/RIR, which Volyume does not and
  will not collect).

**Lessons adopted into this design (each backed by a documented complaint or praise):**
1. Legible rule + free override is what users love ("it doesn't get cranky about it"
   — Alpha Progression); black-box prescription is what they distrust (Fitbod). →
   §17's provenance line IS the product moat for a deterministic engine: show the rule.
2. Coarse-lattice rule (RP): when the next increment is out of reach, add reps
   instead. → §10.2 rep-first, independently reached from the ACSM band argument.
3. Separate "today's edit" from "the plan" (KeyLifts: a set edit never moves the
   Training Max). → Law G's session-scoped override with no programme rewrite.
4. Never fabricate a reference (Hevy's blank fifth set). → §8's new-position rule and
   Law H.
5. Exclude warm-ups/back-offs from carry-forward (Jefit's overwrite bug). → §15
   exclusions and the §13 back-off structure.
6. Don't stall silently (RP's "hasn't upped the weight in months"). → HOLD provenance
   codes state WHY on every hold; the FQ-3 honest-hold copy already does this.
7. Don't interrogate mid-exercise (RP's feedback friction). → the resolver ASKS for
   nothing in-session; evidence is what was logged anyway. Display per set, ask per
   exercise, never mid-exercise.
8. Don't round to a lattice the user doesn't own (JuggernautAI complaint). →
   `incrementKg` stays the per-exercise lever and §10.4 rounds to it.
9. Scope "previous" correctly (Boostcamp's "useless" loose scope). → §8 comparability
   is per-exercise-id and recency-bounded; a heavy/light split across the week
   surfaces as comparability classes. (Noted in §21 as a non-question for now:
   Volyume's routine structure already keys history by exercise within the same
   workout id chain.)

**What Volyume should NOT copy:** Fitbod's opaque model and population inference;
JuggernautAI's per-set RPE interrogation (input Volyume forbids); Strong's four-way
save-time prompt; Hevy Trainer's ALL-sets-at-top advance criterion (the §4 evidence
says that criterion is arithmetically punishing; Volyume's top-set + range-held
criterion is deliberately different); any branding or UI.

**Market note for the founder (feeds §21 ruling 4):** the market splits logging
(free) from prescription (paid) — Alpha Progression paywalls recommendations; Hevy
paywalls Trainer. Volyume's existing progression surfaces (targets, reasons) ship
ungated in the free logger today.


---

## 6. AUTHORITATIVE PRODUCT LAWS (rulings on candidate Laws A–H)

Each candidate law from the brief is explicitly confirmed, amended or rejected.

1. **LAW A — CONFIRMED. Previous performance is evidence, not the prescription.**
   The "Last session:" row survives as pure HISTORY (labelled as such, §16); no surface
   may present a historical ordinal value as the target. Consequence for current code:
   the reference row loses its role as de-facto prescription because a real
   prescription now stands next to it.

2. **LAW B — CONFIRMED, with thresholds. Current-session evidence can become senior.**
   Once ≥1 working set is logged today, the resolver re-runs and today's sets outrank
   the previous session's same-position values for the remaining sets (§12 defines the
   exact stronger/weaker thresholds; §7 the hierarchy). Bounded: current-session
   evidence adjusts targets within the session's working load ±1 increment; it never
   rewrites the programme (Law G).

3. **LAW C — CONFIRMED. Progression ≠ load increase.** The resolver's output is a
   (load, rep-target) pair with rep progression as the default pathway inside the band
   and load progression only at the §10 gate. The reason vocabulary (§17) contains more
   hold/rep codes than load codes by design.

4. **LAW D — CONFIRMED. Do not chase a single good set.** Load progression requires
   exercise-level evidence (§10): the top set topping the band alone is insufficient;
   the aggregate condition must also hold. Mid-session, one strong set can HOLD a load
   (refuse an ordinal drop) but can raise a suggestion by at most one increment and
   only on the §12 overshoot condition.

5. **LAW E — CONFIRMED, and it AMENDS existing behaviour.** `computeSetTargets`'
   second-pass anchor currently raises every below-best target to the session max —
   structurally erasing deliberate back-offs. Amended rule: the anchor pass applies
   only when the below-best set does NOT sit in a detected stable structure (§13).
   With a detected back-off, the back-off RATIO is preserved and progresses with the
   top set. With no detection either way (insufficient evidence), a single lower set
   is treated as incidental — anchored up for the TARGET (current behaviour, kept,
   because one session cannot prove intent in either direction) while the reference
   row still shows the truth. Detection thresholds in §13.

6. **LAW F — CONFIRMED. Safety/recovery context is senior.** Precedence (§14):
   deload > block-finished hold > readiness/re-entry easing (one downward step, never
   stacked — existing `resolveSessionEasingTweak` law) > resolver. Time-crunch skips
   affect set counts only, never loads. The resolver never raises a number a senior
   layer lowered.

7. **LAW G — CONFIRMED. User choice is senior.** A manual in-session deviation from
   the suggested load makes the USER's load the resolver's working load for the
   remaining sets of that exercise today (`USER_CHOICE_RESPECTED`); the app does not
   re-suggest the rejected number that session. One session's deviation does NOT
   rewrite the programme or startingWeight; next session the deviation is simply part
   of history. Overrides of REPS follow the same rule at the rep level.

8. **LAW H — CONFIRMED. Unknown must remain unknown.** No table increment without
   evidence; no fake per-set RIR (permanent, D14/D19/FQ-3); skipped session difficulty
   stays null and holds load adds with honest copy; first-time exercises get the
   programme band and `INSUFFICIENT_EVIDENCE`, not manufactured numbers. Confidence is
   part of the resolver output and LOW confidence changes presentation (§16).

---

## 7. EVIDENCE HIERARCHY

Ruling on the candidate hierarchy from the brief — approved with amendments: the
hierarchy is not one list, it is one list PER QUESTION, and "stable pattern" outranks
"most recent session" only for STRUCTURE, never for capability.

**First set today ("what should I open with?")**
1. Senior overrides (deload / readiness / re-entry / block-finished) — Law F;
2. Most recent comparable session's opening working performance (top-set framing:
   the heaviest working set + its position-1 reps), the current seed behaviour kept;
3. Recent comparable sessions (up to 3) for trend confirmation and outlier discount
   (§ "recent history" rules, folded into §9);
4. Programme prescription (band, startingWeight);
5. Nothing else. Population assumptions never override a real history.

**Later sets today ("what now?")**
1. Senior overrides;
2. User's explicit in-session choice (Law G);
3. TODAY's actual sets (capability: what load is being handled at what reps);
4. Stable exercise-specific structure (back-off ratios, expected drop-off — §13), which
   SHAPES today's evidence across positions;
5. Most recent comparable session's same-position values — now only a fallback
   reference when 3/4 are silent;
6. Programme band.

**Next session ("where does the next exposure begin?")**
1. Senior overrides at that session's load time;
2. The completed session's aggregate performance through the §10/§11 gates
   (computeSetTargets' amended core);
3. Recent comparable sessions (consecutive-miss detection, outlier discount, stall
   detection);
4. Stable structure (back-offs preserved and progressed proportionally);
5. Programme band.

When a recent session is ignored as anomalous, and how much history claims a stable
pattern: §13 (minimum evidence) and §8 (comparability) hold the deterministic rules.

---

## 8. COMPARABILITY CONTRACT

Two sessions (or two sets) are comparable for prescription purposes only when ALL of:

1. **Same exercise id.** A recorded exercise swap (`recordExerciseSwap`) breaks the
   chain; the swapped-in exercise starts from its own history or first-time rules.
   (Equipment changes are not detectable in the current schema; out of scope — §21
   notes it as a non-question.)
2. **Same set-type class.** Only straight and superset-member working sets feed the
   evidence packet (§15). Warm-ups never; AMRAP rows carry capability evidence but are
   excluded from structure learning; cluster rows (myo-reps/rest-pause) are excluded
   entirely — the existing `isE1rmEligibleRow` law extended to prescription.
3. **Comparable rep prescription.** The session's band must overlap today's band by
   ≥50% of today's band width. `8–12` vs `6–10`: overlap 8–10 = 3 of 5 → comparable
   WITH re-basing (rep evidence is read against its own band position — topped /
   in-band / missed — not raw counts). `10–15` vs `8–12`: overlap 10–12 = 3 of 5 →
   comparable with re-basing. `15–20` vs `4–6`: not comparable — history is REFERENCE
   ONLY and the resolver treats the exercise as evidence-poor (band + last loads shown
   as history, no load-progression claims). Band-position, not raw reps, is the
   comparable quantity everywhere in §9–§12.
4. **Within the recency window.** Sessions older than 45 local days are reference-only
   (aligned with the engine's existing detraining boundaries: 14-day plateau
   continuity, layoff at 7 days, C6 Phase 12's 14-day feedback rule — 45 days is the
   outer bound after which even layoff-reduced prescription defers to re-entry flows).
5. **Not a deload/recovery session.** Deload sessions are excluded from progression
   evidence (they are prescribed suppressions, not capability) — detected by the
   session's mesocycle week `isDeload` where available.
6. **Not tombstoned/edited-away.** The evidence packet is rebuilt from the DB at
   exercise load and after each set write, so edits/deletes are self-healing; no
   cached learning survives a deleted workout (robustness requirement from the brief).

A NEW SET POSITION (set 4 when history has 3) is comparable to the EXERCISE, not to a
fake ordinal: it inherits today's demonstrated working load and the structure rules
(§12), never a manufactured "previous Set 4".

---

## 9. LIVE SET PRESCRIPTION ALGORITHM

One pure deterministic resolver. No I/O, no clock reads, no randomness — the caller
passes `now` and the packet. Same packet in, same prescription out, always.

### 9.1 Evidence packet (built by IO seam; bounded)

Gathered when the exercise loads, and rebuilt (in memory, from state already held plus
the one set just written) when a set completes or senior context changes. Never during
typing.

```
EvidencePacket {
  exercise:     { id, exerciseType, category, incrementKg|null, units }
  prescription: { repsMin, repsMax, targetSets,          // FQ-4/COMP-015/readiness-adjusted count
                  startingWeight|null,
                  goal: 'hypertrophy'|'strength'|null }  // from plan context where known
  senior:       { isDeload, deloadTargets|null, blockFinished,
                  readinessTweak|null,                   // resolved single tweak (never stacked)
                  layoffDays|null }
  history:      [ Session × ≤3 ]  // newest first, comparable per §8 only; each:
                { at, difficulty|null,                   // 1–5 or null, never fabricated
                  working: [{ pos, weight, reps, setType }] }  // eligible rows only (§15)
  today:        { working: [{ pos, weight, reps, setType }],
                  overrideLoad|null,                     // §9.4
                  overrideReps|null }
}
```

Bounds: ≤3 sessions × session set count + today's sets. `getLastNWorkoutSets` already
exists; the only data change is N = 2 → 3 (a query argument, NOT a migration).

### 9.2 Resolver output (per next set position p)

```
Prescription {
  weight: number|null            // null = no load claim (bodyweight, excluded types, first-time with no startingWeight)
  repsTarget: number             // the single number to aim for
  repsBand: { min, max }         // the honest range around it
  provenance: Code               // §17, exactly one
  confidence: 'high'|'medium'|'low'
  prefill: boolean               // §16: does this go IN the boxes?
  reference: { weight, reps }|null  // factual same-position history for the reference row
}
```

### 9.3 Precedence pipeline (pure pseudocode)

```
function resolveSetPrescription(packet, position):
  # 1. SENIOR: recovery owns its session (Law F)
  if packet.senior.isDeload and packet.senior.deloadTargets:
      return deloadTargets[min(position, last)] as Prescription
             (provenance SENIOR_RECOVERY_HOLD, confidence high, prefill true)

  # 2. TYPE GATE (§15): excluded constructs get history only, no intelligence
  if exerciseType in {duration, distance} or setTypeForPosition is cluster/dropset:
      return { weight: null, repsTarget: band.min, provenance: INSUFFICIENT_EVIDENCE,
               confidence: low, prefill: false, reference: ordinalHistory|null }

  # 3. FIRST-TIME: no comparable history AND nothing logged today (Law H)
  if history.empty and today.working.empty:
      return { weight: startingWeight|null, repsTarget: repsMin,
               provenance: FIRST_TIME_BAND, confidence: low,
               prefill: startingWeight != null, reference: null }

  # 4. WORKING LOAD for today (Laws B, G)
  if today.overrideLoad != null:
      L = today.overrideLoad                          # USER_CHOICE_RESPECTED
  else if today.working not empty:
      L = max weight among today's eligible working sets
      L = adjustWeaker(L, today, band)                # §12.2: may drop one increment
      L = adjustStronger(L, today, band, history)     # §12.1: may add one increment
  else:
      L = nextSessionOpeningLoad(history, band, packet)   # §10: the amended
                                                          # computeSetTargets core

  # 5. STRUCTURE (Law E, §13): back-off positions track today's top, not history's ordinal
  if stableBackoffRatio(history, position) exists and position is a back-off position:
      L = roundToIncrement(L_top_today_or_opening × ratio(position))
      provenance = STABLE_BACKOFF_PATTERN

  # 6. REP TARGET (§11): beat rule + expected drop-off allowance (§13 prior)
  repsTarget = repTargetFor(position, L, history, today, band)

  # 7. SENIOR TRIM: readiness/re-entry applied LAST, downward only (existing law)
  if senior.readinessTweak reduces: L = applyReadinessToLoad(L, tweak)
  if senior.layoffDays > 7 and today.working.empty: L = round(L × 0.9)   # existing layoff law

  # 8. Confidence + provenance resolution (one code, §17), then §16 prefill decision
  return prescription
```

`adjustStronger`/`adjustWeaker` are defined in §12; `nextSessionOpeningLoad` in §10;
`stableBackoffRatio` and the drop-off prior in §13; rounding in §10.4. Every branch
sets exactly one provenance code; precedence on collision: senior > user choice >
current-session > structure > next-session baseline > band.

### 9.4 User override detection (Law G)

A logged working set whose weight differs from the presented prescription by more than
half the exercise increment, in either direction, sets `overrideLoad` to the USER's
load for the remainder of this exercise today. The resolver then prescribes AT that
load (rep targets still computed) and never re-suggests the rejected number this
session. Reps analogously (`overrideReps`, tolerance ±2 — within noise, no override
inferred). Overrides expire at session end: next session the deviation is simply
history flowing through §10. Nothing ever writes to the routine/programme from a live
set. Tapping "Use" on the history reference row is a deliberate choice and counts as
an override like typing.

---

## 10. LOAD-PROGRESSION RULE

Exactly when weight increases. Framing change from production: progression is judged at
the EXERCISE level on its top working load — not per ordinal set. (Evidence: the
all-sets criterion is arithmetically near-unreachable under normal fatigue; later-set
reps are the noisiest signal — §4. This amends computeSetTargets' per-set loop and its
anchor pass.)

Let, over the most recent comparable session: `W` = top working load; `R_top` = best
eligible reps at `W`; band = today's `repsMin..repsMax`.

**10.1 ADVANCE** — next session's opening/top-set load becomes `W + increment` when ALL of:
- `R_top ≥ repsMax` (the range is mastered at the top load);
- no eligible working set AT `W` fell below `repsMin` (the "12/12/8-in-8–12" case still
  advances — 8 IS in band; a "12/9/7" case does not — 7 is below band: RANGE not held);
- `effortSupportsLoad` (session difficulty 1–3) — FQ-3 retained verbatim: very hard
  (4–5) or skipped holds, with the existing honest copy;
- `W > 0` (bodyweight/unloaded can never receive a load instruction — FR-C4-4 kept).

Single-session trigger, retained from production (founder-visible alternative — the
ACSM two-consecutive-sessions confirmation — is §21 ruling 3). The consecutive-miss
drop (10.3) is the corrective backstop if an advance proves premature.

**10.2 Increment and cap (the ONE increment source):**
`increment = exercise.incrementKg ?? defaultIncrement(W, units, category)`, capped at
5% of `W`, rounded to the 0.25 grid, floored at +0.25 — computeSetTargets' existing
maths kept byte-for-byte, now the single authority. Consequences bound in Phase 2:
`weightStepKg`'s `|| 2.5` fallback becomes `defaultIncrement(...)`; `stalledAdvice`'s
literal `+2.5` is retired with the function. Where the increment exceeds 10% of `W`
(light dumbbells/stacks), the resolver prefers REP progression and reports
`HOLD_BUILDING_RANGE` — the ACSM-band argument from §4.

**10.3 DROP** — one increment when even the BEST set at `W` fell below `repsMin` in TWO
consecutive comparable sessions (production's consecutive-miss law, re-framed
top-set). A single sub-band session holds and rebuilds (`HOLD_BUILDING_RANGE`).

**10.4 Rounding:** all suggested loads round to the increment grid of the exercise
(nearest multiple of the resolved increment, then the global 0.25 floor grid). No
31.3kg prescriptions. No equipment catalogue is introduced; `incrementKg` per exercise
is the existing architecture and remains the user's lever for odd machines.

**10.5 Layoff:** >7 days since the exercise was last trained → opening prescription
×0.9 (production law kept), provenance SENIOR_RECOVERY_HOLD(layoff), and the anchor/
advance logic is skipped for that session (existing LS-04/H-13 behaviour preserved).

---

## 11. REP-PROGRESSION RULE

At an unchanged load, for position p:

- Baseline expected reps `E_p` = §13's expected-reps (learned median or conservative
  prior), clamped to the band.
- Rep target = `min(E_p + 1, repsMax)`, floored at `repsMin` — the existing
  `prefillRepsForTarget` beat-one-rep rule generalised from its single warm-up-switch
  call site to every set (MATCH_LOAD_ADD_REP).
- Mid-session, once position p−1 has been logged today, `E_p` re-bases on TODAY's
  evidence: `E_p = todayReps(p−1) − expectedDecline(p−1→p)` (§13 prior), clamped to
  band. One more rep is only asked for when the athlete is at or above their expected
  curve; below it, the target is honest (band position, not fantasy).
- Reps progress; the load holds until §10.1 fires. This is double progression, stated
  as a convention, not as proven science (§4).

---

## 12. CURRENT-SESSION ADAPTATION RULE

What Set N+1 learns from Set N — the resolver's genuinely new capability. All
thresholds sit on the evidence-backed noise floor: **deviations within ±2 reps at a
given load are noise and change nothing** (Jukic 2024, §4).

**12.1 Stronger than expected (`adjustStronger`, CURRENT_SESSION_STRONGER):**
- HOLD rule (the load floor): once today's sets demonstrate a load `L` inside the
  band, no later-set suggestion drops below `L` merely because the same-position
  HISTORICAL set was lighter — unless that position has a detected stable back-off
  (§13) or the athlete overrode (Law G). This single rule kills "mechanically
  reverting to the old 75kg Set 3" (the brief's Law B example: Set 3 shows 80).
- ADD rule (bounded): a mid-session `+1 increment` suggestion MAY appear only when the
  previous set today reached `repsMax + 2` or more (a genuine overshoot beyond the
  band, outside noise), and no set today has fallen below `repsMin`. At most one
  mid-session step, never compounding. (APRE's overshoot table is the precedent — §4.)
  **Founder amendment (ruling 2, 2026-08-16): the ADD rule is DISABLED outright —
  not merely trimmed — whenever a senior recovery state is active: deload/recovery
  week, re-entry easing, or an active (undismissed) readiness reduction. Those
  states are senior to any overshoot evidence; under them the resolver may hold or
  reduce, never add.** (Test plan §20 pins this as an adversarial case: an overshoot
  set under each senior state MUST NOT produce an add.)

**12.2 Weaker than expected (`adjustWeaker`, CURRENT_SESSION_FATIGUE_ADJUST):**
- If today's last working set fell BELOW `repsMin` at load `L`: next-set suggestion is
  `L − 1 increment` (grid-rounded), rep target `repsMin`. One step per occurrence,
  re-evaluated per set; never below the §10.2 grid floor. (Cowley 2025: downshifting
  below-expectation days preserves volume — §4.)
- If today's reps are in band but ≥3 below the expected curve (beyond noise): load
  HOLDS, rep target drops to the expected-curve value (not the historical peak). The
  app stops demanding an unrealistic prior-session target — but only past a
  principled threshold, exactly as the brief requires.
- Required scenario (brief): previous 80×12/80×11/80×9; today Set 1 = 80×8. Band
  8–12: 8 is in band but 4 below last session's 12 → beyond noise. Set 2 shows
  **80kg, rep target 8** (hold load, honest reps), provenance
  CURRENT_SESSION_FATIGUE_ADJUST, copy in the family of "Today's first set was down a
  little - steady here." If Set 2 then falls below 8, Set 3 shows 77.5 (increment
  drop). MUST NOT: demand 12; drop load on the first in-band miss; ask for a rep
  target above the expected curve.
- Required scenario (brief): previous 80×12/80×10/75×10; today 80×12, 80×11. Set 3
  shows **80kg** (HOLD rule — today's demonstrated load is senior to the old ordinal
  75), rep target ~9–10 (expected curve allowing 1–2 rep decline), provenance
  CURRENT_SESSION_STRONGER — unless the 75 back-off is a DETECTED stable structure
  (§13), in which case Set 3 shows the preserved ratio against today's top (≈75–77.5)
  with STABLE_BACKOFF_PATTERN. Evidence: two sets today at 80 beat both historical
  80s; the old Set-3 75 is one observation and cannot outrank them (§7 hierarchy).

---

## 13. LEARNED FATIGUE / BACK-OFF RULE

**Ruling: build the BOUNDED version now.** The evidence supports individualised
set-position patterns as more reliable than a global constant (stable individual
profiles — §4) but not a biological fatigue model. Everything below is arithmetic over
≤3 sessions, deterministic and explainable.

**13.1 Back-off structure detection (Law E):**
For each of the last 3 comparable sessions, per position p: `ratio_p = weight_p /
topWeight`. A stable back-off exists at p when at least 2 of the last 3 comparable
sessions have `ratio_p ≤ 0.95` AND their ratios agree within 0.05. Then the
prescription for p is `round(todayTop × median ratio_p)` — the back-off is preserved
AND progresses with the top set (100/90 becomes 102.5/92.5, never "corrected" to
102.5/102.5). One historical session can never prove intent (needs 2 of 3);
insufficient evidence keeps production's current behaviour (target anchored up to the
session best; history row still shows the truth). This is the §6 Law E amendment to
computeSetTargets' anchor pass.

**13.2 Expected-reps curve (fatigue prior):**
- Learned: when ≥2 of the last 3 comparable sessions logged position p at the same
  structure (same load ratio class), `E_p` = median reps at p, clamped to band.
- Until then, conservative prior: expected decline per position = 1 rep for compounds,
  0–1 for isolation/accessory (from the §4 drop-off literature at non-failure
  efforts), floored at `repsMin`. The prior is used ONLY to set rep targets and to
  interpret weaker/stronger (§12); it never drops loads by itself.

**13.3 Outliers:**
- A comparable session whose top e1RM (canonical `sessionBestE1rm`) sits >10% below
  the median of the window is discounted from structure/expectation learning (still
  history, still shown). An exceptionally strong session is not discounted — but it
  only moves prescriptions through the normal §10/§12 gates, so one great day cannot
  rewrite structure alone.
- Deload/recovery sessions are excluded from learning entirely (§8.5).

**13.4 Minimum evidence summary:** 2 matching observations of the last 3 comparable
sessions for ANY individualised claim (back-off ratio, expected reps). Below that,
priors + honest provenance. This is the answer to "how much history is enough".

---

## 14. RECOVERY / RE-ENTRY PRECEDENCE

The existing senior constraints survive unchanged, in this order:

1. **Deload week** — `generateDeloadPrescription` output IS the prescription
   (resolver step 1); progression logic never runs; readiness never touches deload
   rows (existing `applyReadinessToTargets` guard); COMP-015 silent (existing R0).
2. **Block finished** — targets hold at recovery-week volume (existing copy), resolver
   reports SENIOR_RECOVERY_HOLD.
3. **Readiness / re-entry easing** — exactly one downward step, resolved by the
   existing `resolveSessionEasingTweak` (never stacked), applied AFTER the resolver
   (step 7) so the fuzz invariant (adjusted ≤ planned, downward only) still holds
   over the resolver's output. Dismissal restores the untrimmed prescription.
4. **Layoff ×0.9** — production law kept (§10.5).
5. **Set-count authority** — unchanged: FQ-4 weekly allocation base, COMP-015 ±1,
   readiness −1, min() composition, `targetSets` fallback chain. The resolver
   prescribes CONTENT for positions; it never changes how many there are.
6. **Time-crunch** — affects exercise/set counts only; skipped exercises produce no
   evidence rows; the resolver sees them as absent sessions (robust per §8.6).
7. **User choice** (Law G) sits between senior context and resolver evidence: it can
   lower or raise within a session, but can never override deload/readiness surfaces
   (they are presentation-senior and the user's lever there is the existing dismiss).

ED-safety note: nothing in this campaign touches nutrition, weight-the-body, or
notification surfaces; calorie/FFM floors and ED gates are out of this data path
entirely. The only "weight" here is barbell load.

---

## 15. SPECIAL SET-TYPE MATRIX

| Type | Ruling | Evidence in? | Prescribed? | Rationale |
|------|--------|--------------|-------------|-----------|
| Straight working set | **APPLY** | yes | yes | The core case. |
| Superset member | **APPLY** | yes | yes | Prescribed per exercise from its own history; compressed rest is absorbed by the noise threshold and the per-exercise expected curve (its history was logged under the same structure). |
| Warm-up | **EXCLUDE** | never | never | Existing law everywhere (countProgressSets, isE1rmEligibleRow, engine filters). The warm-up→working auto-switch consumes the resolver's FIRST WORKING prescription (production path preserved). |
| AMRAP | **PARTIAL** | capability only | load only | An AMRAP row is honest capability evidence (top-set e1RM) but not structure evidence (its reps are not a target-band observation). Prescribing FOR an AMRAP set = load + "max effort", never a rep number. |
| Drop set | **EXCLUDE** | no | no | Already excluded from target progress (countProgressSets); segment rows are not comparable observations. |
| Rest-pause / myo-reps (cluster) | **EXCLUDE** | no | no | Summed-rep rows; the C6 P11-1 / isE1rmEligibleRow law extends to prescription verbatim. |
| Unilateral / per-side | **APPLY** | yes | yes | Per-side rows are comparable to per-side rows; loads are per-side; the existing per-side machinery is presentation, not semantics. |
| Weighted bodyweight | **APPLY (added load)** | yes | yes | Progression operates on the ADDED load; bodyweight is not modelled. |
| Bodyweight / reps-only | **PARTIAL (reps only)** | reps only | reps only | Load suggestions are permanently forbidden on unloaded work (FR-C4-4 / CALC-5 law, now pinned at the resolver). Rep progression + honest "add reps / harder variation" copy. |
| Duration | **EXCLUDE** | no | no | The weight/reps columns hold seconds — no load semantics (formatLoggedSet law). |
| Distance | **EXCLUDE** | no | no | Columns hold metres/seconds. |

Default posture honoured: where the construct is not scientifically or semantically
valid, the intelligence does not apply.

---

## 16. PREFILL / SUGGESTION UX CONTRACT

**Recommendation to the founder: Contract B-plus — "the prescription lives in the
boxes at sufficient confidence; history lives beside them, always labelled."**
(Founder ruling 1, §21 — the founder has signalled wanting progression "potentially
inside the boxes"; this is that, with an honesty floor.)

1. **Boxes (weight/reps):** carry the resolver's prescription whenever confidence is
   HIGH or MEDIUM, rendered in the existing ghost styling (visibly a suggestion until
   touched or logged). At LOW confidence the boxes carry the last actual (or
   startingWeight / blank first-time) — no manufactured precision (Law H).
2. **Reference row:** always the factual same-position history — "Last session:
   75kg x 10" — with the tappable Use kept (Law G). It is labelled history and never
   the target. When the prescription and history agree, the row still renders (it is
   the receipt that the suggestion is grounded).
3. **Provenance line:** the §17 plain-English copy for the current prescription,
   replacing the current four-way coach-line contention for PRESCRIPTION explanations
   (COMP-015 and readiness lines keep their existing seniority for THEIR content;
   stalledAdvice retires).
4. **Carry-forward:** remains the felt behaviour for the common case — after a logged
   set the resolver usually prescribes the same load again (double progression), so
   the box reads as carry-forward. When the resolver disagrees (back-off position,
   fatigue adjust, overshoot add), the box shows the prescription and the change is
   explained by the provenance line. The user's typed values always win (Law G).
5. **One-tap flow preserved:** prefilled prescription → tap log. Friction is
   unchanged from today's carry-forward flow.

Assessment against the brief's axes: gym friction (unchanged, one tap); blind-accept
risk (ghost styling + provenance line + increments capped at 5%/one step); progression
encouragement (the progression IS the number in the box); visibility (provenance line
+ reference row); user control (type-over, Use, dismissible coach lines, Law G hold);
Hevy/Strong familiarity (their prefill-last-actual feel is preserved because the
prescription equals last actual in the majority of sets, deviating only by one honest
increment/rep with a stated reason — §5 for the competitor detail).

Alternatives for the ruling: A (always prefill recommendation, even low confidence) —
rejected as Law H violation; C (always prefill last actual, suggestion separate) —
rejected as re-creating today's invisible-engine failure; D (no prefill) — rejected on
friction.

---

## 17. PROVENANCE VOCABULARY

Thirteen codes. Every prescription carries exactly one. UI copy is illustrative
(British English, calm, no shame, no em dashes in user-facing strings).

| Code | Meaning | Example copy |
|------|---------|--------------|
| `FIRST_TIME_BAND` | No comparable history; band + optional starting weight | "First time here. Use a load you can control for 8 to 12 reps." |
| `MATCH_LOAD_ADD_REP` | Same load, beat the expected reps by one | "Same weight. Aim for one more rep." |
| `LOAD_ADVANCE_RANGE_TOPPED` | §10.1 advance fired | "You have topped the range. Time for the next step up." |
| `HOLD_BUILDING_RANGE` | In band, keep filling toward repsMax (incl. coarse-increment rep-first) | "Same load. Build towards 12 before adding weight." |
| `HOLD_EFFORT_UNKNOWN` | Range topped, difficulty skipped (FQ-3) | "You have topped the range. Add weight when you are ready." |
| `HOLD_EFFORT_VERY_HARD` | Range topped, difficulty 4–5 (FQ-3) | "Topped the range, but that session was a hard one. Keep this load until it feels smoother." |
| `LOAD_DROP_CONSECUTIVE_MISS` | §10.3 drop fired | "Load dropped after two short sessions. Reset and rebuild." |
| `CURRENT_SESSION_STRONGER` | §12.1 hold/add from today's evidence | "Strong today. Stay at 80 for this one." |
| `CURRENT_SESSION_FATIGUE_ADJUST` | §12.2 trim from today's evidence | "Today's sets are down a little. Steady here." |
| `STABLE_BACKOFF_PATTERN` | §13.1 preserved structure | "You usually back this set off slightly." |
| `SENIOR_RECOVERY_HOLD` | Deload / block-finished / layoff / readiness (sub-field carries which) | "Recovery week. Very easy effort." |
| `USER_CHOICE_RESPECTED` | Law G hold on the user's load | "Working from the weight you chose." |
| `INSUFFICIENT_EVIDENCE` | Excluded types, incomparable history, malformed data | "Log this your way. Volyume will learn from it." |

The machine code is what tests assert and telemetry counts (no PII); the copy bank is
translated per code with slot values. No free-composed coach prose — the §4
UNSUPPORTED list bans certainty language product-wide on these surfaces.

---

## 18. SCENARIO MATRIX

46 scenarios. Unless stated: band 8–12, compound, increment 2.5kg, kg units,
difficulty 2 (easy/moderate), no senior modifiers, confidence HIGH with ≥2 comparable
sessions. "→" = the prescription for the named set. MUST NOT items are binding test
assertions for Phase 2.

| # | Category / setup | Expected prescription + provenance | MUST / MUST NOT |
|---|------------------|------------------------------------|-----------------|
| 1 | First-time, no startingWeight | Weight box empty, reps 8, `FIRST_TIME_BAND`, low, no prefill | MUST NOT invent a weight |
| 2 | First-time, startingWeight 40 | 40 × 8 prefilled (ghost), `FIRST_TIME_BAND`, low | MUST seed bottom of band (C5-P14-02 kept) |
| 3 | First-time, today Set 1 = 40×12 | Set 2 → 40 × 11 (today-evidence, decline prior), `MATCH_LOAD_ADD_REP` | MUST use today's set; MUST NOT add load (12 = repsMax, not overshoot) |
| 4 | Ordinary: prev 80×10/9/8 | Open 80 × 11, `MATCH_LOAD_ADD_REP` | MUST beat expected by exactly 1 |
| 5 | Range mastered: prev 80×12/12/12 | Open 82.5 × 8–10, `LOAD_ADVANCE_RANGE_TOPPED` | MUST advance exactly one capped increment |
| 6 | Same, difficulty skipped | Open 80, `HOLD_EFFORT_UNKNOWN` | MUST NOT auto-add; MUST NOT tell user to log RIR |
| 7 | Same, difficulty 5 | Open 80, `HOLD_EFFORT_VERY_HARD` | MUST hold with honest copy |
| 8 | Brief A: prev 80×8/8/8 | Open 80 × 9; sets 2–3 expected-curve targets | MUST rep-progress, MUST NOT add load |
| 9 | Brief B: prev 80×10/9/8 | Open 80 × 11; curve 10/9 behind it | Same as 4; MUST NOT read the 8 as failure |
| 10 | Brief C: prev 80×12/11/10 | Open 82.5 (top topped, none below min); curve targets ~8–10 | MUST advance on top-set criterion |
| 11 | Brief D: prev 80×12/12/12 | As 5 | — |
| 12 | Brief E: prev 80×12/12/8 | Open 82.5 (8 ≥ repsMin holds the range) | MUST NOT let the fatigue tail block the add |
| 13 | Brief F: prev 80×12 / 80×9 / 75×10 (single session at 75-Set-3) | Open 82.5; Set 3 target anchored to top structure (no stable back-off from one session); reference row shows 75×10 | MUST NOT freeze Set 3 at 75; MUST NOT claim a back-off from one observation |
| 14 | One strong top set: prev 80×12/9/7 | Open 80, `HOLD_BUILDING_RANGE` (7 < repsMin broke the range) | MUST NOT advance off the single 12 (Law D) |
| 15 | Stronger today (brief): prev 80×12/80×10/75×10; today 80×12, 80×11 | Set 3 → 80 × ~9–10, `CURRENT_SESSION_STRONGER` (no stable back-off) | MUST NOT revert to ordinal 75 |
| 16 | Same but 75-Set-3 stable across 2 of last 3 sessions | Set 3 → 75 (ratio ≈0.94 × today's 80), `STABLE_BACKOFF_PATTERN` | MUST preserve the structure, not "correct" it |
| 17 | Weaker today (brief): prev 80×12/11/9; today Set 1 = 80×8 | Set 2 → 80 × 8, `CURRENT_SESSION_FATIGUE_ADJUST` | MUST hold load (8 in band); MUST NOT demand 11–12; MUST NOT drop load yet |
| 18 | Weaker, below band: today Set 1 = 80×6 | Set 2 → 77.5 × 8, `CURRENT_SESSION_FATIGUE_ADJUST` | MUST drop exactly one increment; MUST re-evaluate per set |
| 19 | Overshoot: today Set 1 = 80×14 | Set 2 MAY → 82.5 × 8, `CURRENT_SESSION_STRONGER` | MAY add once; MUST NOT compound further adds this session |
| 20 | In-band dip within noise: expected 10, today 9 | No change, `MATCH_LOAD_ADD_REP` continues | MUST treat ±2 reps as noise |
| 21 | Back-off progresses: top advances 100→102.5, stable 0.90 ratio at Set 3 | Set 3 → 92.5, `STABLE_BACKOFF_PATTERN` | MUST progress the back-off with the top |
| 22 | Set count 3→4 | Set 4 → today's working load × expected-curve reps | MUST NOT require a fake "previous Set 4" |
| 23 | Set count 5→3 | Positions 1–3 from top-set framing | MUST NOT average dead ordinals in |
| 24 | Band 8–12 → 6–10 (overlap ≥50%) | Comparable with re-basing; band-position logic runs | MUST NOT compare raw rep counts across bands |
| 25 | Band 15–20 → 4–6 (no meaningful overlap) | Last top load held, reps 4, low confidence, `INSUFFICIENT_EVIDENCE` | MUST NOT make load-progression claims from the old band |
| 26 | incrementKg = 5 on 80kg lift | Advance → 84 (5% cap = 4, grid-rounded) | MUST apply the 5% cap over custom increments |
| 27 | Coarse increment: 30kg stack, incrementKg 5 (>10%) | Rep-first: `HOLD_BUILDING_RANGE` until repsMax mastered; then advance | MUST prefer reps when increment >10% of load |
| 28 | User types 75 under an 80 suggestion, logs it | Later sets → 75 ×, `USER_CHOICE_RESPECTED` | MUST NOT re-suggest 80 this session; MUST NOT rewrite programme |
| 29 | User types 85 over an 80 suggestion | Later sets → 85, `USER_CHOICE_RESPECTED` | Same law upward |
| 30 | User taps "Use" on history row | Treated as 28/29 (deliberate choice) | MUST count as an override |
| 31 | Very hard rating, reps in band: prev 80×10/10/9, diff 5 | Open 80 × 11 (effort gates LOAD only) | MUST NOT suppress rep progression on a hard rating |
| 32 | Layoff 10 days: prev top 80 | Open 72.5 (×0.9, grid), `SENIOR_RECOVERY_HOLD` | MUST skip advance/anchor logic (LS-04 kept) |
| 33 | Deload week | Deload prescription verbatim, `SENIOR_RECOVERY_HOLD` | MUST NOT run progression; readiness MUST NOT touch it |
| 34 | Re-entry ease active | Resolver output, then one −1 set / 5% trim | MUST NOT stack with readiness (existing law) |
| 35 | Readiness below-par | 5% display trim after resolve; dismiss restores | MUST stay downward-only (fuzz invariant) |
| 36 | Bodyweight pull-ups (reps_only) | Reps target only, weight null | MUST NOT ever suggest a load (CALC-5 pin moves here) |
| 37 | Weighted dips +10kg mastered | Advance added load → +11.25 capped/grid (practically +0.25 floor…grid) | MUST progress the ADDED load only |
| 38 | AMRAP final set | Load prescribed, rep target "max effort" (no number); AMRAP row feeds capability only | MUST NOT set a numeric rep target; MUST NOT learn structure from it |
| 39 | Drop set logged mid-exercise | Evidence excluded; next straight set unaffected | MUST NOT count segments as sets |
| 40 | Myo-reps / rest-pause set | `INSUFFICIENT_EVIDENCE` posture for that row; summed reps never evidence | isE1rmEligibleRow law extended — MUST |
| 41 | Superset pair A/B | Each prescribed from its own exercise history | MUST NOT cross-pollinate loads |
| 42 | Per-side DB row | Per-side loads, per-side evidence | MUST keep per-side semantics |
| 43 | Missing last session (skipped week) | Window slides to the older comparable sessions | MUST be robust to gaps (§8.4 recency bound) |
| 44 | Malformed history (0/negative weights, null reps) | Invalid rows excluded; if nothing valid → `INSUFFICIENT_EVIDENCE` | MUST NOT produce NaN or negative loads |
| 45 | Outlier bad session (top e1RM >10% below window median) | Discounted from learning; opening resolves from remaining comparable sessions | MUST still show it as history |
| 46 | Exceptional session (+15% one-off) | Flows through normal §10/§12 gates only | MUST NOT rewrite structure from one great day |

---

## 19. IMPLEMENTATION PLAN (no code in this phase)

**CREATE**
- `src/lib/livePrescription.js` — the authoritative module:
  - `buildEvidencePacket(...)` (IO seam; reads `getLastNWorkoutSets(exerciseId,
    workoutId, 3)`, previous workout difficulty rows, senior context already held by
    the screen; returns the §9.1 packet; called on exercise load and after each set
    write — never during typing);
  - `resolveSetPrescription(packet, position)` (pure, §9.3);
  - internal: `nextSessionOpeningLoad` (the amended computeSetTargets core, §10),
    `stableBackoffRatio` + `expectedReps` (§13), `adjustStronger`/`adjustWeaker`
    (§12), the provenance/confidence resolution, and the single rounding function.
- `src/lib/__tests__/livePrescription.test.js` — the §20 suites.

**CHANGE**
- `src/screens/ActiveWorkoutScreen.js`:
  - `loadHistory` gathers the packet (N=3) and calls the resolver — replacing the
    best-anchor seed, the ghost decision (rendering style kept), and the
    `computeSetTargets` call/`setTargets` state with resolver output per position;
  - `handleCompleteSet` re-resolves (pure, in memory) instead of unconditional
    carry-forward; today's logged set becomes packet input; box updates from the
    prescription (which equals carry-forward in the common case);
  - retire the `stalledAdvice` IIFE (2822–2846) and its coach-line branch;
  - `weightStepKg` fallback `|| 2.5` → `defaultIncrement(currentWeight, units,
    category)`;
  - upcoming previews and the NowCard range read resolver output (live-updating).
- `src/components/workout/NowCard.js` — prescription-in-box presentation (ghost
  styling for untouched prescriptions), provenance line, history reference row
  relabel; testIDs preserved.
- `src/lib/algorithms.js` — `computeSetTargets` internals migrate into
  `nextSessionOpeningLoad` (top-set framing, Law E anchor amendment, FQ-3/layoff/cap
  maths kept); the export is retired once callers/tests migrate.
  `generateDeloadPrescription`, `defaultIncrement`, `detectPlateau`,
  `sessionBestE1rm`, `isE1rmEligibleRow` untouched.

**DELETE / RETIRE**
- `getProgressionSuggestion` (algorithms.js:339) + its RIR logic, after migrating the
  CALC-5 bodyweight pin onto the resolver tests (per its own retention note).
- The ghost DECISION path and `stalledAdvice` (above).
- `computeSetTargets` export (end state; may live one release as a wrapper if the
  diff is safer staged).

**KEEP UNTOUCHED**
- Deload machinery, readiness/re-entry modules and their fuzz invariants, COMP-015,
  FQ-4 allocation, set-count chain, rest timer, CTA machine, draft restore, PR/record
  system, all Section 2 CLAUDE.md inviolables. **No DB migration. No new dependency.
  No schema change.** Deterministic engine law holds: the resolver is pure functions,
  no I/O.

Suggested landing order (each green + merged before the next): (1) resolver module +
full test suite; (2) screen wiring behind the packet; (3) presentation (NowCard);
(4) retirements + guard re-pins.

---

## 20. TEST PLAN

**Decision-unit boundary tests** (`livePrescription.test.js`, table-driven):
- §10 gates: advance/hold/drop on every effort value (1–5, null), the 5% cap over
  custom increments, the +0.25 floor, grid rounding, the 12/12/8 vs 12/9/7 boundary,
  bodyweight never-load (CALC-5 pin migrated here), layoff skip-anchor.
- §12 thresholds: ±2 noise inertia (fuzz: all deviations in [−2,+2] produce identical
  output), below-band drop exactly one increment, overshoot single add, no compounding.
- §13: back-off needs 2-of-3 (adversarial: one session must never create one),
  ratio tolerance edges, outlier discount at the 10% boundary, expected-curve
  clamping to band.
- §8 comparability: band-overlap edges (exactly 50%), recency bound, deload exclusion,
  swap break, eligibility filtering (cluster/warm-up/dropset rows injected must never
  change output — mirror of the C6 P11-1 law).
- Law G: override detection tolerance (half increment), expiry at session end.

**Whole live-workout scenarios** (screen-level, existing harness): the §18 matrix rows
15–19, 22, 28–30, 33–35 exercised through ActiveWorkoutScreen state — box contents,
reference row, provenance line, senior trims, and the Android input-fix and CTA guard
suites re-run untouched.

**Replay / determinism tests:**
- Same packet → byte-identical prescription (fuzz over generated packets);
- Rebuild-after-edit: delete/edit a historical set, rebuild packet, resolver output
  changes only through the packet (no hidden state);
- Purity guard: resolver module imports no IO (source-level regression guard, same
  style as the engine's existing purity pins);
- Performance pin: source guard that no DB call sites exist on the keystroke path
  (SetEntry onChange → no `get*`/`await` into database.js).

**Guard re-pins** (deliberate, with rationale comments, per house convention):
`loggerVisualArchitecture` (NowCard prescription presentation), verticalLogger
(upcoming rows now resolver-fed), campaign5 seeds (C5-P14-02 bottom-of-band retained),
`computeSetTargets.fq3` re-anchored onto `nextSessionOpeningLoad`, algorithms.test
CALC-5 migration, retirement absence guards for `stalledAdvice` and
`getProgressionSuggestion`.

---

## 21. RISKS / FOUNDER RULINGS REQUIRED

> **RESOLVED 2026-08-16, same day:** the founder answered all four rulings —
> 1: B-plus. 2: overshoot only, AMENDED (no mid-session add under
> deload/recovery, re-entry easing, or an active readiness reduction — senior;
> §12.1 updated). 3: one session. 4: ungated. Verbatim answers and Phase 2
> consequences: `FOUNDER-RULINGS-2026-08-16.md` in this folder. The questions
> are preserved below as the decision record.

Genuine product forks only; recommendation stated first per house rules — none framed
on effort.

**Ruling 1 — Prefill contract (§16).** Recommended: B-plus (prescription in the boxes
at HIGH/MEDIUM confidence in ghost styling; last-actual at LOW; history row always
present and labelled). Alternatives: A (always prefill the recommendation, even at low
confidence) / C (always prefill last actual; recommendation rendered separately,
today's failure mode) / D (no prefill). This is the founder's explicitly reserved
"potentially inside the boxes" decision. One further alternative surfaced by the
competitor evidence (E): the pre-v6.0.3 Strong contract — boxes EMPTY, reference
beside them, and the log tick on an empty row commits the suggestion — zero deletion
cost, one-tap logging, nothing unearned in an editable field. B-plus remains the
recommendation because the founder asked for progression inside the boxes and
Volyume's ghost styling already gives an untouched suggestion a distinct visual
state; E is the strongest counter-model if the founder prefers boxes that only ever
hold typed or committed numbers.

**Ruling 2 — Mid-session load-add aggressiveness (§12.1).** Recommended: single +1
increment suggestion only on a ≥ repsMax+2 overshoot with no sub-band set today.
Alternatives: never add mid-session (rep-targets only — the strictly safer surface) /
add on any repsMax+1 top (APRE-like, more aggressive). The evidence supports the
mechanism but not a specific threshold; this is product temperament.

**Ruling 3 — Load-advance confirmation window (§10.1).** Recommended: keep the
single-session trigger (with the FQ-3 effort gate and the consecutive-miss backstop) —
progression stays encouraging, which the founder has asked for. Alternative: ACSM-style
two-consecutive-sessions confirmation — more noise-robust, measurably slower to
advance. Evidence supports either; the trade is eagerness vs false-positive advances.

**Ruling 4 — Tier position of the live prescription.** Recommended: the resolver ships
UNGATED, exactly where today's progression targets/reasons live — the free logger. The
Section 2 gating law forbids gating a currently-free feature, and prescription quality
here is logging quality. The competitor market, however, splits logging (free) from
prescription (paid) — Alpha Progression paywalls recommendations, Hevy paywalls
Trainer — so making the NEW live resolver a Pro surface (while free keeps the current
reference-and-band behaviour) is a legitimate commercial alternative only the founder
can choose. Either way the tier-blind guardrail mandate holds: any REDUCTION the
resolver applies (fatigue adjust, senior trims) never consults tier.

**Risks (no ruling needed, recorded):**
- Behaviour change is visible: boxes will sometimes disagree with pure carry-forward
  (back-off positions, fatigue adjusts). The provenance line is the mitigation; the
  device checklist must walk these moments.
- The `computeSetTargets` retirement touches many pinned tests; the §20 re-pin list is
  the budget for that, and the staged landing order keeps main green throughout.
- Non-questions (resolved from code/evidence, no founder time needed): equipment-type
  detection (schema doesn't carry it; `incrementKg` remains the lever); exercise-order
  detection (unknowable reliably; absorbed by noise threshold); per-set RIR (already
  founder-ruled permanent-removed; nothing here reopens it).

---

## 22. FINAL VERDICT

**A. DESIGN LOCKED — READY FOR IMPLEMENTATION.**

At authoring this stood at B (mostly locked, four founder rulings required — §21).
The founder ruled on all four the same day (2026-08-16;
`FOUNDER-RULINGS-2026-08-16.md`): B-plus prefill; overshoot-only mid-session adds
with the senior-state gate amendment (§12.1); single-session advance window;
ungated. With those resolved, the trace, laws, evidence hierarchy, comparability
contract, resolver algorithm, special-type matrix, provenance vocabulary, scenario
matrix, implementation and test plans are locked and internally consistent — this
document is the binding Phase 2 specification. No research finding argued for
keeping the current approach unchanged (the live next-set question had no owner in
production), and nothing here abandons the sound parts (the next-session engine's
core, effort gate, and every senior recovery constraint survive).



