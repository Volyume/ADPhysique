# Adaptive inter-mesocycle blueprint — 2026-08-09

Founder order: review the coaching logic; map how starting volume, block
transitions, adaptation, signals, PR weighting, fatigue reading and deload
maths currently work; then propose an inter-mesocycle decision model where
the next block's starting volume depends on the previous block's response,
per muscle. ANALYSIS ONLY - nothing rewritten yet.

Everything below was read hands-on with file:line evidence.

---

## PART 1 - the current logic, mapped

### 1.1 How starting volume is chosen after a recovery week

Every block seeds identically, from the static research table:
`createMesocycle` (database.js:4211) calls
`generateInitialPlannedVolume(id, VOLUME_LANDMARKS)` which writes, for each
muscle, a linear MEV-to-MAV ramp across the accumulation weeks
(`planned = round(mev + (mav - mev) * progress)`) and MEV for the deload
week. The seed uses the RAW `VOLUME_LANDMARKS` table (algorithms.js:20) -
not planEngine's profile-adjusted `computeLandmarks` (experience, recovery,
age, phase multipliers, planEngine.js:99), not the adapted per-user bands
(`computeAdaptiveLandmarks`), and not anything the previous block did.

**A new block after a recovery week is a hard reset to population defaults.
Every set the coach added during the previous block is discarded.**

### 1.2 Whether the previous mesocycle affects the next

No, with one cosmetic exception. The only cross-block memory:

- `blockAdvisor.js` reads 8 weeks of check-ins and RECOMMENDS
  repeat / adjust / consider_rebuild (proposed-only by design). But the
  'adjust' recommendation's copy promises "a small volume or load
  adjustment based on how this block went" (blockAdvisor.js:176) and
  **no code implements that adjustment** - whichever button the user taps,
  the next block seeds from the static table. This is a T5-class trust gap:
  the advisor promises adaptation that does not exist.
- `computeAdaptiveLandmarks` (algorithms.js:991) DOES learn per-muscle
  bands from session feedback and survives block boundaries - but it feeds
  only the Pro session tweaks and (since D90 #3) the display surfaces.
  Plan generation and block seeding never consume it.

### 1.3 Muscle-specific and exercise-specific adaptation

- Weekly coach: **global**. One volumeSignal (-2..+3) from the 4x4
  recovery x performance matrix (weeklyCoach.js:239), spread across every
  trained muscle, clamped per muscle to [mev, mrv]
  (coachApply.computeVolumeApply, founder decision 2026-05-28). A quad
  problem and a chest surplus get the same verdict.
- Session layer: **per-muscle**. `runAdaptiveEngine` /
  `computeAdaptiveDecision` (algorithms.js:900-985) reads soreness /
  performance / pump / joint per muscle and moves +-1-2 sets.
- Exercise level: e1RM-driven per-set targets exist, and plateau DETECTION
  exists (Home banner), but **nothing ever changes exercise selection**.
  blockAdvisor's own design hierarchy lists "swap exercise variants" as
  step 6 (blockAdvisor.js:17) - no recommendation output implements it.

### 1.4 The signals that drive changes

- Volume up/down (weekly): recovery score (energy, soreness, stress cap;
  weeklyCoach.js:203) x performance score (check-in answer, PR count,
  adherence; :225) -> matrix delta; joint pain / illness / injury notes cap
  any push (PIPE-002/3); D15 adds +1 after 3 overperforming weeks.
- Volume (session): the per-muscle adaptive decision above.
- Deload: matrix deloadFlag + at least one consecutive poor-recovery week;
  session-window emergency brakes in `evaluateAutoReg` (joint >= 3 or
  fatigue+difficulty >= 4.5 -> cut ~50%), but that evaluator only surfaces
  on the MesocycleBuilder dashboard - it never feeds the weekly decision.
- Exercise change: never automatic; plateau banner suggests, user acts.
- Progression (load): e1RM targets + the block's RIR ladder.

### 1.5 Is PR count overweighted? Yes, at the weekly level

`getPerformanceScore` returns grade 1 (best possible) whenever
`prsThisWeek > 0 && adherence >= 0.9` (weeklyCoach.js:226). One PR is
worth the same as twelve, any single-lift PR upgrades the GLOBAL
performance read (a calf PR pushes chest volume), and because every block
resets volume and rep targets, **early-block PRs are systematically cheap**
- the matrix reads "top performance" exactly when volume is lowest, right
after every reset. (`computeAdaptiveLandmarks` weights PR frequency sanely
- 0.3, capped 0.6 - the problem is the weekly binary.)

### 1.6 Productive vs excessive fatigue

Partially distinguished, with no block context. Recovery grade 3 ("still
slightly sore") always reads HOLD - but slight residual soreness in a
peak week is the DESIGNED state of an accumulation block; the matrix
treats week 1 and peak week identically, so it fights its own ramp. True
excess (grade 4, or consecutive poor weeks) correctly flags deload.
`evaluateAutoReg` has the richer patterns (hard sessions + flat pump =
poor absorption) but is display-only. There is no trajectory model:
"fatigue rising on schedule into the peak" and "fatigue rising faster
than the ramp warrants" are indistinguishable.

### 1.7 Deload volume and intensity

Fixed formula, not personalised: sets drop to MEV per muscle
(generateInitialPlannedVolume seeds deload week at MEV;
coachApply.computeDeloadVolume drops to MEV when applied), narrative
multiplier 0.50x (MESO_SCHEDULE), intensity RIR 4 from the ladder,
duration always exactly one week - regardless of how strained the block
actually was.

### 1.8 Block lifecycle (the founder's direct question)

Blocks do NOT run forever by design - plannedWeeks is fixed (5 standard /
6 advanced) - but **nothing ever transitions automatically**.
`getBlockStatus` walks active -> recovery -> complete -> overdue;
PlansScreen shows the advisor's proposal; the user must act
(`activatePlanWithBlock` creates the next block). If the user does
nothing:

- `getCurrentBlockWeekIndex` clamps to the last week, whose planned
  volume is the DELOAD week's MEV - so an ignored block leaves the user
  training at maintenance volume indefinitely;
- while `getCurrentMesoWeek` (the narrative layer) WRAPS and starts
  calling it "Introduction week" again.

Maintenance-volume limbo wearing an "Introduction week" label: two
different stories, both wrong.

### 1.9 Is any of this explained to the user?

Partially. GLOSSARY.mesocycle/deload/rir + tooltips (MesocycleBuilder,
HomeBlockShapeSheet, the W2 Effort tooltip) explain the CONCEPTS. Nothing
explains the MECHANICS the user actually lives through: no block-start
statement of the planned ramp ("chest starts at 10 sets, climbs to 14,
then a recovery week"), no statement anywhere that a new block resets
volume, the decision screen says "Add 2 sets" without naming where the
user is in the planned climb, and the advisor's "slightly adjusted"
promise is (per 1.2) untrue.

---

## PART 2 - weaknesses, numbered

- **W1** Hard reset: every block reseeds from static VOLUME_LANDMARKS;
  within-block adaptation is discarded.
- **W2** blockAdvisor's 'adjust' copy promises inter-block adaptation that
  has no implementation (trust gap).
- **W3** Weekly volume signal is global while response is muscle-specific.
- **W4** PR binary overweights performance; block resets systematically
  inflate early-block PRs.
- **W5** No week-in-block context in the matrix: productive accumulation
  fatigue and excessive fatigue read the same.
- **W6** Overdue-block limbo: MEV-forever targets under a wrapping
  "Introduction week" narrative.
- **W7** Exercise-change machinery named in the hierarchy but absent.
- **W8** Two disconnected landmark systems: planEngine's profile-adjusted
  landmarks and the adapted bands never reach block seeding.
- **W9** Deload is one fixed shape regardless of accumulated strain.
- **W10** The block mechanics are never narrated to the user.

---

## PART 3 - proposed model: the Block Ledger

One new pure engine module (`interBlock.js`), deterministic, no I/O,
computed at block end from data already stored. Nothing auto-executes:
the advisor's existing proposed-only philosophy stands; the ledger is
what the 'Continue with adjustments' button finally MEANS.

### 3.1 Per-muscle block response classification

For each muscle, over the finished block:

- **performance**: e1RM slope across the block for that muscle's
  exercises (buildExerciseMetricSeries exists) + PR density normalised by
  exposure (PRs per session featuring the muscle), compared against the
  SAME lifts' previous-block bests so post-reset PRs stop being cheap.
- **recovery**: that muscle's session soreness/joint history (the adaptive
  engine already collects it) + the systemic weekly readiness slope + any
  deload flags fired during the block.
- **adherence**: sets completed vs planned for that muscle.

Classify into the founder's four quadrants, independently per muscle:

| Class | Definition | Next block's start for that muscle |
|---|---|---|
| RESPONSIVE | perf up, recovery ok | prev start + 1 (capped: prev start + 2 max, and always <= learned ceiling - 2) |
| OVERREACHED | perf up, fatigue excessive | prev start, or -1 if a deload flag fired mid-block |
| STALE | perf flat 2+ consecutive blocks, recovery good | volume HOLDS; propose a stimulus change first: variant swap from the muscle's pool (poolGenerator), rep-range shift, or frequency change |
| STRAINED | perf down, recovery poor | max(MEV, prev start - 2); peak capped at MAV; consider the longer deload (3.4) |

> **AMENDED by the founder's Stage 2 order (2026-08-09), which
> supersedes the RESPONSIVE row above:** retention is the default — a
> successful dose is normally KEPT, and the start rises by AT MOST +1,
> only when late-block dose-response evidence shows higher volume kept
> producing progression without excessive recovery cost. The "+2 max"
> cap above is dead; the learned-ceiling-minus-2 and MAV caps stand.
> Implemented in src/lib/interBlock.js; pinned by interBlock.stage2.

Low-data muscles (insufficient exposure) default to the current behaviour
- research-table seed - stated honestly.

### 3.2 The learned working range

Reuse, don't fork: `computeAdaptiveLandmarks` already learns per-muscle
bands and `effectiveLandmarks.js` already defines precedence
(manual > adapted > research). The ledger adds the block-grain update the
per-session signal can't see: after each block, the muscle's learned
ceiling moves toward "the highest weekly volume this muscle handled with
recovery ok and performance up", and the learned floor toward "the lowest
start that still produced progress". The ramp then runs learned floor ->
learned ceiling instead of static MEV -> MAV. Manual edits still beat
everything; the research table remains the newcomer's default and the
clamp of last resort (never above adapted MRV, never below research MEV).

### 3.3 Weekly-matrix fixes that fall out of this

- Performance score: replace the PR binary with PR density + e1RM slope.
- Week-context: an expected-fatigue curve per week index; recovery grade 3
  in the peak week is expected (continue), in week 1 it's an early warning
  (hold). Deload thresholds unchanged - this only stops the matrix
  fighting its own ramp.
- The session-window `evaluateAutoReg` patterns (poor absorption) feed the
  ledger's recovery read instead of being display-only.

### 3.4 Deload personalisation

Deload sets = max(MEV, 40-60% of that muscle's actual peak, scaled by the
block's strain score) instead of flat MEV; RIR 4 unchanged; when most
muscles classify STRAINED, the advisor proposes a 10-day recovery window
instead of 7 (proposal, never auto).

### 3.5 Block lifecycle fixes

- Transitions stay user-confirmed (the advisor's philosophy holds), but
  the limbo ends: once 'complete', the coach output and Plans both carry
  an explicit block-finished decision card every week until acted on, the
  narrative STOPS wrapping ("Block finished - holding at maintenance"
  instead of a false "Introduction week"), and the maintenance-volume
  state is named to the user rather than silently inherited from the
  deload row.
- 'Continue this programme' = ledger carry-over with class NONE forced to
  repeat (true repeat). 'Continue with adjustments' = full ledger. The
  advisor copy finally tells the truth either way.

### 3.6 Comprehension (W10)

- Block-start card: "This block: chest starts at 11 sets, climbing to 17
  by week 4, then a recovery week." One line per emphasised muscle.
- Block-end: BlockReflection gains the ledger table - per muscle, what
  happened and what next block does differently, in the coach's voice.
- The weekly decision names ramp position: "Week 3 of 5. The planned
  climb adds 1 set; recovery's good, so the coach adds 1 more."

### 3.7 Worked examples

User finishing a 5-week block:

- **Chest**: started 10, peaked 16. Bench + incline e1RM +4% vs last
  block, soreness normal. -> RESPONSIVE: next block starts 11, ramp
  targets learned ceiling 17 (adapted MRV 22 allows it).
- **Shoulders**: started 12, peaked 18. OHP e1RM +2% BUT shoulder
  soreness >= 4 in weeks 3-4 and the deload flag fired in week 4. ->
  OVERREACHED: starts 12 again, peak capped at 16.
- **Back**: rows and pulldowns flat across this block AND the previous
  one, recovery good. -> STALE: volume holds at start 12; the block-end
  card proposes swapping barbell row for chest-supported row (pool
  variant), rep range 8-12 -> 6-10 as the alternative.
- **Quads**: squat e1RM -3%, readiness slope negative, sleep flagged two
  weeks. -> STRAINED: starts max(MEV 8, 10 - 2) = 8, peak capped at MAV,
  10-day recovery proposed before the block begins.

Four muscles, four different verdicts, one block - which is the entire
point.

### 3.8 Safety posture (unchanged, stated explicitly)

Deterministic pure functions only; no AI. Under an open ED flag or calm
mode: no upward carry-over anywhere (RESPONSIVE degrades to repeat),
reductions still allowed - matching D15's escalation gate. Research MEV
remains the floor anchor; ABSOLUTE_WEEKLY_SET_CEILING remains the
backstop. All Section 2 inviolables untouched.

### 3.9 Build shape (for sizing, not started)

1. `interBlock.js` pure module + exhaustive tests (quadrants, caps,
   suppression, low-data).
2. Ledger persistence (additive: JSON column on mesocycles or a small
   table) + block-end computation hook.
3. Seeding: generateInitialPlannedVolume takes a ledger/range argument;
   activatePlanWithBlock threads it; advisor buttons map to it.
4. Matrix fixes (PR density, week context) in weeklyCoach.
5. Surfaces: block-start card, BlockReflection ledger, decision ramp
   line, overdue-limbo copy.
6. Exercise-swap proposals at block boundary via poolGenerator.
