# Plan Builder, Progression & Workout Logging — Full Audit

**Date:** 2026-06-16
**Branch:** `claude/audit-work-quality-review-benrin`
**Scope:** the workout **plan-generation engine** (how sets-per-exercise are decided), the **progression / progressive-overload** logic (the weekly volume adder), and the **workout-logging screen** UX.
**Method:** three parallel deep-read passes (Opus) over `planEngine.js`, `algorithms.js`, `planAutoGen.js`, `weeklyCoach.js`, `coachApply.js`, `database.js`, `mesocycle.js`, `ActiveWorkoutScreen.js` + components; **every load-bearing claim re-read in the code** before writing (the §0 corrections below record agent first-pass errors caught on re-read).

> Audit + recommendation backlog. **Nothing here has been built.** Builds are gated on founder go, one at a time, per CLAUDE.md.

---

## §0 — Verification corrections (first-pass claims that were WRONG)

1. **`mesocycle.js` is NOT the live progression engine.** Its multiplier schedule (1.00→1.25, 0.50 deload) and `evaluateAutoReg` are referenced **only by `mesocycle.test.js`** — no production caller (repo-wide grep). The live progression is (A) the autoregulation matrix + apply, and (B) the seeded MEV→MAV DB ramp. Treat `mesocycle.js` as dead for progression (flagging, not fixing).
2. **`planEngine.js:1880` ("add ~one set per exercise per week") is narrative COPY, not the math.** The actual ramp is the DB seed at `database.js:2932-2933`.
3. **Unilateral (per-side) logging is dead UI.** `setUnilateralExercise` is never called from any screen (only lib + tests); new sets always write `leftReps:null,rightReps:null`. The toggle is unreachable.

---

## §1 — PLAN BUILDER: how sets-per-exercise are decided (the "6 sets" concern)

**How it works (verified walkthrough):** the engine is weekly-volume-first and pure/deterministic.
1. Per-muscle base landmarks `VOLUME_LANDMARKS` (`algorithms.js:20-54`) → `computeLandmarks` scales MEV/MRV by experience/recovery/nutrition/age (`planEngine.js:100-121`).
2. Week-1 weekly target seeded at MEV (`planEngine.js:2142-2144`); `applyGoalOverlay` biases priority/weak-point muscles up into the MAV–MRV band and clamps to MRV (`:127-242`); `enforceWeeklyFloorsAndCaps` applies the **hard per-muscle weekly MRV cap** (`:378-382`).
3. Split → `sessionsPerMuscle` (frequency). `buildSession` converts weekly→per-session: `sessionTarget = min(sessionCap, round(wTarget/sessions))` where **`sessionCap = weakPoint ? 12 : 8`** (`:1138-1139`).
4. `numExHint(sessionTarget)` = **1 exercise if target ≤5, else 2** (`:899-901`, hard max 2 exercises/muscle/session).
5. Distribution loop spreads `sessionTarget` across the chosen exercises with **`MIN_SETS_PER_ENTRY=3`, `MAX_SETS_PER_ENTRY=6`** (`:1058-1078`).
6. `clampDeliveredToMRV` re-trims delivered sets to MRV after distribution (`:743-770`); `trimToTimeBudget` fits the time budget (`:772-819`).

**Where "6 sets on one exercise" comes from (verified):**
- **Per-exercise hard cap is 6** (`MAX_SETS_PER_ENTRY=6`, `:1059`) — never exceeded (exhaustive input sweep confirmed 0 > 6).
- Mainly **weak-point muscles**: `sessionCap` flexes to **12** (`:1138`), so two exercises land at 6/6, or a single available exercise takes 6.
- Also **pool-exhaustion**: when only ONE exercise is selectable for a high-target session (e.g. Bikini glutes at division MRV 30), the lone entry absorbs `min(6, target)` = 6.
- **There is NO per-exercise junk-volume / diminishing-returns guard.** 6-on-one is *permitted by design* (comment `:1051-1052`), not a bug.

**Verdict on the founder's concern:** weekly per-muscle volume — the primary hypertrophy driver — **is** capped at MRV, so 6 sets on one exercise is **not a safety/over-volume breach**. It is a **stimulus-quality** issue: the 5th–6th set on the *same* movement in one session gives less fresh stimulus per unit fatigue than the same sets on a second exercise/angle. So the founder's instinct (spread across exercises) is sound *programming practice*, not a bug fix. **Change is worthwhile as a quality refinement.**

### The founder's proposal — ">4 sets ⇒ split into a second exercise for that muscle"
Feasible, but it collides with three existing constraints that are **jointly unsatisfiable** for some session targets:
- per-exercise **MIN 3** / no 2-set fragments (`:1058`, comment `:779-781,:1051`),
- per-exercise **MAX** (proposed 4),
- **≤2 exercises/muscle/session** (`numExHint`, `:900`).
With min 3 + max 4 + ≤2 exercises, a session target of **5** can't split cleanly (3+2 is a forbidden fragment; one exercise can't hold 5). Targets 10/11 similarly stuck.
**To implement cleanly, one constraint must relax — recommended:** lower `MAX_SETS_PER_ENTRY` to **4–5** AND raise the exercises-per-muscle ceiling so high targets split (e.g. weak-point target 12 → 4/4/4 across 3 exercises instead of 6/6). Weekly-volume math is preserved (the distribution loop + `clampDeliveredToMRV` conserve `sessionTarget`). Knock-on: more exercises/session = longer sessions → interacts with `trimToTimeBudget` (`:772-819`) and `sessionCap`/`numExHint` callers (difficulty gating `:925,:938`; matrix augment `:1654`). **Needs a founder decision on the exact rule (see §4).**

---

## §2 — PROGRESSION: the weekly volume adder (the "+1/week to ridiculous levels" concern)

**How it works (verified):** two live mechanisms, both bounded.
- **A — Weekly autoregulation add (opt-in).** At check-in, `autoregulationMatrix(recovery, performance)` returns `volumeDelta ∈ {-2,0,+1,+2,+3}` (`weeklyCoach.js:174-192`) — `+3` only when *both* scores are best. The user must tap **Apply**; `computeVolumeApply` spreads the delta across each trained muscle and **clamps every muscle to `[mev, mrv]`** (`coachApply.js:240-261`, cap at `:249`).
- **B — Seeded MEV→MAV block ramp.** At block creation each accumulation week is pre-seeded on a linear MEV→**MAV** ramp (`database.js:2932-2933`); deload week seeded at MEV (`:2948`). This is the real "≈+1 set/week" the founder remembers — and it **tops out at MAV (below MRV)**.

**Verdict: progression CANNOT run to a "ridiculous level" under normal data.**
- Mechanism A is hard-clamped to per-muscle **MRV** on every apply (`coachApply.js:249`); Mechanism B tops out at **MAV**.
- It is **not** an automatic weekly +1 — it requires good recovery+performance *and* a manual Apply (`CoachOutputScreen.js:832-854`); poor recovery/joint pain/illness/low adherence zero it (`weeklyCoach.js:621-623,:645-655`).
- Blocks are **finite and re-seed from MEV** each mesocycle (`database.js:2891-2906,:2913`); the apply path structurally closes at block end (`canApply` false). **No cross-block accumulator.**

**The ONE residual risk (the only line that could allow runaway):**
- `coachApply.js:245` — `const mrv = row.mrv ?? Number.POSITIVE_INFINITY;`. If a `planned_muscle_volume` row is ever seeded/synced with a **null `mrv`**, that muscle's progression becomes **uncapped**. Everywhere else assumes `mrv` is present. **Recommend a hard fallback ceiling** (clamp to MAV or a per-muscle constant instead of `+Infinity`).

---

## §3 — WORKOUT LOGGING SCREEN (`ActiveWorkoutScreen.js`)

**Strong (verified):** smart prefill (last session, +1-rep-if-in-range) → often 0–1 taps/set; keyboard-Done completes the set (ULTIMATE-WR-1, `SetEntry.js:125-130`); tap-the-beat-line to apply last numbers; genuinely good rest timer (auto-start, escalating audio+haptic, wall-clock resync, live region); correct per-kind set numbering; hardened reps/weight parsing; mid-session swap/add/remove/superset; session-adjustment (COMP-015) surfaced with one-tap revert; robust finish/discard + stale-workout recovery; offline-first; PR detection. **At/above Hevy/Strong on coaching surface + rest timer.**

**Gaps (prioritised, verified):**
| # | Finding | Evidence | Impact |
|---|---------|----------|--------|
| **E1** | **No edit of a logged set mid-workout** — `LoggedSetRow` is display-only; no `updateWorkoutSet` in the data layer at all. A mistyped weight/reps can't be corrected in-session. Table-stakes in Hevy/Strong. | `ActiveWorkoutScreen.js:70-94`; `database.js` has only `updateWorkoutSetPostRating` | **High** |
| **E2** | **No delete/undo of a logged set mid-workout** — no swipe/long-press/undo; no `deleteWorkoutSet`. A duplicate/wrong set poisons live counts/PRs/tonnage until later (if ever). | `:70-94`, `:1900-1912` | **High** |
| **R1** | **RIR/RPE never captured** — `DEFAULT_SET.rir = 2` hardcoded; RPE always null. Autoregulation runs on an assumption, not user input. | `:35,:793-794`; `SetEntry.js:145-148` | **Med** |
| **P2** | **Plate calculator unreachable** — `PlateCalculator.js` exists, unit-aware, but no entry point on the screen (orphan styles). | `SetEntry.js:183-196`; not imported | **Med** |
| **U1** | **Unilateral logging dead** — toggle never wired (see §0.3). Wire it or remove the dormant code. | grep `setUnilateralExercise` | **Med** |
| **P1** | **Auto-advance can feel like "it moved on without me"** — 1.8s auto-advance + superset auto-jump, no "advancing… cancel". | `:893-900,:874-887` | **Med** |
| **A1** | **No "set logged" screen-reader announcement** — only a border flash + haptic. | `:826-831` | **Med** |
| N1/C1/W1/V1 | per-set note ambiguity; cluster intra-rest hardcoded 20s; no quick add-warm-up button; no full "all sets last time" overview. | see pass | Low |

**Top three:** E1 + E2 (edit/delete a logged set — both need a new data-layer fn + UI; both High, table-stakes) then P2 (wire the existing plate calculator).

---

## §4 — Prioritised improvements (rule-flagged; builds gated on founder go)

**Tier A — safety/correctness, low effort**
- **PROG-1** Harden `coachApply.js:245` null-MRV fallback → clamp to MAV/constant, not `+Infinity` (closes the only progression-runaway path). Small + invariant test.
- **LOG-1** Add in-session **edit a logged set** (E1): new `updateWorkoutSet` data fn + tap-row-to-edit. High value.
- **LOG-2** Add in-session **delete + undo a logged set** (E2): new `deleteWorkoutSet` (soft-delete + undo toast, mirroring the food F-1 pattern). High value.

**Tier B — quality, medium effort, needs a founder decision**
- **PLAN-1 (the 4-set split)** Cap per-exercise sets and spread to more exercises. **DECISION NEEDED:** (a) per-exercise max = 4 or 5? (b) allow up to 3 exercises/muscle/session? (c) how to handle the awkward target of 5 (round, or allow a single 5-set exercise)? Then build with the weekly-volume invariant tested (delivered per-muscle unchanged; no 2-set fragments; ≤ time budget).
- **LOG-3** Wire the existing **plate calculator** into the weight row (P2).
- **LOG-4** Wire or remove **unilateral** logging (U1).

**Tier C — autoregulation depth / polish**
- **LOG-5** Capture real **RIR** per set (R1) — feeds the autoregulation matrix with real data instead of the hardcoded 2.
- **LOG-6** "Set logged" a11y announcement (A1); auto-advance cancel (P1).

**Flagging, not fixing:** `mesocycle.js` dead code; `planEngine.js:1880` copy vs `database.js:2933` math mismatch.

---

## §5 — Recommended first move
1. **PROG-1** (the only genuine safety hole — null-MRV → uncapped) — tiny, do first.
2. **LOG-1 + LOG-2** (edit/delete a logged set) — biggest day-to-day logging friction, table-stakes vs competitors.
3. **PLAN-1** (4-set split) — the founder's programming-quality ask; needs the §4 decision first, then a careful engine build with the weekly-volume invariant under test.
