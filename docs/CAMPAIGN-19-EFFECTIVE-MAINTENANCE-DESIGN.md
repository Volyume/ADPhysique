# CAMPAIGN 19 — EFFECTIVE MAINTENANCE AUTHORITY

Bounded architecture ruling. DESIGN ONLY — no code, tests or migrations were
changed producing this.

Baseline: Campaign 18 operationally complete.
Audited code baseline: ada99f8075abe255f93e972fc301299882b8f458
Grounded in four targeted reads of the current maintenance path on main
(f42f72d0): nutritionEngine.js, weeklyCoach.js, nutritionTargetsView.js,
useWeightTrend.js, plus the nutrition_targets schema.


---

## 1. CURRENT DEFECT

- `nutrition_targets.tdee` is written once from BMR x activity multiplier and
  is never updated by evidence. It is a formula number for life.

- `computeAdaptiveTDEEAdjustment` already computes the right thing — an
  energy-balance RESIDUAL (`adjustmentKcal`, `adjustedTDEE`) — but weeklyCoach
  applies it to `target_kcal` only.

- So learning accumulates IN THE TARGET, while the anchor it is measured
  against stays formula-derived. The loop is permanently anchored to day one.

- `useWeightTrend` feeds `targets?.tdee` back in as `currentTDEEEstimate`, so
  each week's residual is computed against the unlearned prior, not against
  what the athlete has actually demonstrated.

- Any regeneration (`calculateNutritionTargets` on goal/phase change)
  recomputes `target_kcal = tdee x (1 + phaseAdj)` and silently discards every
  accumulated adjustment.

- Diet-break logic returns to the same stored formula TDEE.

- `nutritionTargetsView` has
  `maintenanceKcal = raw.maintenanceKcal ?? raw.tdee ?? (targetKcal || null)` —
  a third fallback authority that can silently report the TARGET as
  maintenance.

- Net: the athlete's own demonstrated maintenance exists only as a transient,
  unrecorded delta inside one week's coaching run.

- Reinstall preserves the current target row; the loss happens at lifecycle
  transitions, not at restore.

- There is no provenance anywhere saying which authority produced the number
  the user is looking at.


---

## 2. CANONICAL CONSTRUCT

### Technical definition

`effectiveMaintenance` = the daily LOGGED-INTAKE value at which this athlete's
robust weight trend is approximately flat, estimated within their own logging
system, over a bounded recent evidence window, under a stated bodyweight and
goal context.

It is explicitly NOT TDEE. It absorbs, and does not attempt to separate:

- under- and over-reporting bias
- food-database calorie error
- unlogged intake
- NEAT drift
- water and glycogen artefacts in the weight signal

It is a property of THE ATHLETE PLUS THEIR LOGGING BEHAVIOUR, valid only while
both are stable. That is precisely why it is more useful than TDEE for setting
a target the athlete will actually eat — and why it must never be exported as
a metabolic claim.

### Plain-English user-facing term

"your maintenance calories"

The qualifier is carried by PROVENANCE COPY, not baked into the term:

- "Starting guidance"
- "Learning from your recent history"
- "Based on your own recent history"
- "Not enough current evidence"

Never say: "your TDEE", "true metabolism", "metabolic rate".


---

## 3. MODEL COMPARISON

A. persist the current effective-maintenance estimate + provenance
B. derive it every time from authoritative food/weight history
C. persist a validated snapshot/provenance while retaining enough
   authoritative evidence/context to determine whether it is still applicable

| Criterion                    | A                              | B                                   | C                                      |
|------------------------------|--------------------------------|-------------------------------------|----------------------------------------|
| Deterministic reproducibility| Weak. Number outlives inputs   | Strong                              | Strong. Snapshot carries its signature |
| Offline use                  | Good                           | Poor on cold start / large history  | Good                                   |
| Sync                         | One small row                  | Nothing to sync, every device recomputes | One small row, deterministic id   |
| History size                 | Irrelevant                     | Grows unbounded, recompute cost grows | Bounded window only                  |
| Stale-state handling         | FAILS. Immortal static number  | Good                                | Good. Snapshot expires by signature    |
| Algorithm upgrades           | FAILS. Old numbers unregenerable | Strong                            | Strong. Version mismatch forces recompute |
| Diagnostics                  | Poor                           | Good but expensive                  | Best. Stored inputs + recomputable     |
| Support burden               | High ("why is it 2,800?")      | Medium                              | Low                                    |
| Migration complexity         | Small                          | None                                | Small                                  |
| Explain OLD decisions        | No                             | No (current only)                   | Yes                                    |

### WINNER: C

With one framing constraint that keeps it honest:

  The snapshot is a MEMO OF THE DERIVATION, never an independent authority.
  It carries an `evidenceSignature`. It may only be used when that signature
  still describes current evidence AND `algorithmVersion` matches. Otherwise
  it is recomputed or held.

  There is exactly ONE authority — the derivation. The snapshot is its cache.

This satisfies "prefer rebuildable truth" (B's virtue) without B's cold-start
and offline cost, and it structurally forbids A's immortal-number failure.


---

## 4. AUTHORITY FLOW

Exact deterministic flow from cold start through mature evidence:

```
resolveEffectiveMaintenance(user, ctx):

  1. formulaPrior = BMR x activity
     (existing calculateNutritionTargets maths, UNTOUCHED)

  2. evidence = {
       intake window, diary coverage, robust weight trend,
       bodyweight context, goal context
     }

  3. signature = hash(
       evidence bounds + bodyweight band + goal phase + algorithmVersion
     )

  4. if snapshot.signature === signature
       -> return snapshot                       (memo hit)

  5. judgeability = existing nutrition facts
       (coverage / intake / weight.trend SIGNALs from coachContext)

  6. if NOT judgeable
       -> return { value: prior + lastActionableResidual?, source: HELD }

  7. residual = clamp(energy-balance residual, +/- RESIDUAL_BOUND)
       (existing computeAdaptiveTDEEAdjustment)

  8. value = formulaPrior + residual

  9. persist snapshot(value, residual, signature, provenance)

 10. return { value, source: ATHLETE_EVIDENCE, provenance }
```

Then, UNCHANGED downstream:

```
targetKcal = effectiveMaintenance x (1 + phaseAdj)
           -> existing safety chain
           -> user confirmation
```

PHASE PERCENTAGES ARE NOT TOUCHED. They apply to whatever maintenance
authority resolves. That is the whole point of putting the fix at the ANCHOR
rather than in the target.


---

## 5. JUDGEABILITY LAW

### Model: PRIOR + BOUNDED LEARNED RESIDUAL

Not prior -> switch to history.

Why:

- The prior carries information history cannot re-derive (bodyweight, sex,
  age, activity). Discarding it at maturity throws away signal.

- A hard switch creates a visible discontinuity on the day evidence matures.
  The number jumps for no reason the athlete can see.

- A residual degrades gracefully. As evidence goes stale, actionability
  expires and the value drifts back toward prior WITHOUT erasing the
  remembered residual. That is exactly "memory may persist, actionability may
  expire".

- The code ALREADY computes a residual. This is the smallest coherent change:
  persist and re-anchor what already exists.

- Bounding cumulative divergence means no run of bad logging can produce an
  absurd maintenance.

### The law

| Evidence state                                        | Residual        | Source                  |
|-------------------------------------------------------|-----------------|-------------------------|
| Immature (< existing MIN_POINTS / coverage weeks)      | not computed    | FORMULA_PRIOR           |
| Mature, coverage GOOD, trend GOOD                      | applied         | ATHLETE_EVIDENCE        |
| Poor diary coverage                                    | HELD at last actionable | HELD_LAST_ACTIONABLE |
| Insufficient weights                                   | HELD            | HELD_LAST_ACTIONABLE    |
| Stale history                                          | HELD, actionability decaying | HELD_STALE |
| Confounded (goal change mid-window, manual target on)  | NOT computed, held | HELD_CONFOUNDED      |
| Current applicable                                     | applied         | ATHLETE_EVIDENCE        |

Reuse `coachContext` nutrition/weight SIGNALs and
`computeAdaptiveTDEEAdjustment`'s existing `confidence`.

NO new universal confidence score.

Damping (`updateGain` 0.5-0.65), the +/-5% step clamp and cooldowns are
UNCHANGED and NEVER personalised.


---

## 6. PORTABILITY MATRIX

| Transition                     | Classification         | Behaviour                                                                 |
|--------------------------------|------------------------|---------------------------------------------------------------------------|
| Same phase / stable bodyweight | DIRECTLY ACTIONABLE    | residual applies                                                          |
| Meaningful bodyweight change   | REQUIRES REVALIDATION  | prior recomputes at new weight; residual RETAINED, re-earned over next window |
| Maintain -> gain               | REQUIRES REVALIDATION  | residual retained as context; new window opens                            |
| Gain -> cut                    | REQUIRES REVALIDATION  | as above                                                                  |
| Cut -> maintain                | REQUIRES REVALIDATION  | as above; also the case where the residual is most valuable               |
| Diet break                     | USE AS CONTEXT/PRIOR   | MUST resolve through effective maintenance, not stored formula TDEE. This is a live defect |
| Long absence                   | USE AS CONTEXT/PRIOR   | residual persists, actionability expires -> HELD_STALE                    |
| Return after absence           | REQUIRES REVALIDATION  | prior + retained residual until a fresh window matures. NEVER day-one reset |
| Sustained major activity change| REQUIRES REVALIDATION  | prior's activity multiplier changes; residual retained                    |
| Poor food coverage             | CONFOUNDED             | hold. Never recompute a precise estimate from thin data                   |
| Manual calorie target active   | CONFOUNDED             | no residual computed. The athlete, not the app, set the intake            |
| Manual target removed          | REQUIRES REVALIDATION  | resume from retained residual, revalidate                                 |
| Plan / routine change          | IRRELEVANT             | training structure does not change maintenance authority                  |
| Reinstall / device change      | DIRECTLY ACTIONABLE    | snapshot syncs; signature revalidates on first resolve                    |

NOTHING ON THIS LIST ERASES THE RESIDUAL. Only an explicit user reset does.


---

## 7. PRECEDENCE STACK

```
1. ED / wellbeing lockouts, calm mode                  <- absolute veto
2. Calorie floors (1500 M / 1200 F), FFM energy floor  <- absolute clamp
3. Rapid-loss protection                               <- upward-only override,
                                                          bypasses cooldowns
4. MANUAL user calorie target                          <- senior, never silently
                                                          overwritten
5. CURRENT MATURE ATHLETE EVIDENCE   (prior + applied residual)
6. REMEMBERED NON-ACTIONABLE HISTORY (prior + held residual)
7. FORMULA / RESEARCH PRIOR
```

Where the existing machinery sits:

- +/-5% CHANGE LIMIT and 2-WEEK COOLDOWN — apply to the EMITTED TARGET CHANGE,
  at layer 5 -> output. They govern how fast the target moves, never what
  maintenance IS. A resolver that jumps 300 kcal still produces a <= 5% target
  step.

- RAPID-LOSS PROTECTION — layer 3, above manual, upward only, unchanged.

- FFM FLOOR / CALORIE FLOORS — layer 2, clamp the final target after phase
  maths.

- ED / WELLBEING SAFEGUARDS — layer 1, veto any change.

- USER CONFIRMATION — required for any consequential adjustment emitted from
  layer 5, unchanged.

Calories and macros stay identical every day. No training/rest cycling.
Calorie Bank remains the sole explicit user-controlled exception.


---

## 8. PERSISTENCE / SYNC SHAPE

PERSIST (one row per user, deterministic id):

- effective_maintenance_kcal
- formula_prior_kcal
- learned_residual_kcal
- evidence_signature
- algorithm_version
- as_of
- source
- bodyweight_context_kg
- goal_phase_context
- plus the provenance fields in section 9

DERIVE EVERY READ:

- whether the signature still holds
- judgeability
- the emitted target

VERSION:

- `algorithm_version`. A mismatch forces recompute, never silent reuse.

SYNC:

- Yes. `last_write_wins` on `updated_at`, deterministic id derived from
  `user_id`, following the `session_resolutions` precedent.

MIGRATION:

- LIKELY REQUIRED. One additive local table (or added columns on
  `nutrition_targets`; a separate table is cleaner because it has a different
  lifecycle) plus a cloud counterpart. NOT WRITTEN HERE.


---

## 9. PROVENANCE SHAPE

Minimum structured fields. Machine-readable only — no prose stored as
authority.

```
source                 formula_prior | athlete_evidence | held_last_actionable
                       | held_stale | held_confounded
algorithm_version      int
as_of                  epoch ms
evidence_window        { from, to, days }
food_coverage          { signal, daysLogged, daysRequired }
weight_response        { signal, weighIns, robustRatePctPerWeek }
judgeable              boolean
reason                 enum code (never a sentence)
bodyweight_context     { kg, band }
goal_context           { phase, changedAt }
formula_prior_kcal     number
learned_residual_kcal  number
bounds                 { residualMin, residualMax, clamped: boolean }
decision               applied | held | recomputed | unchanged
```

Copy maps from `source` + `reason` AT RENDER TIME.


---

## 10. IMPLEMENTATION BOUNDARY

### Likely to change

- NEW `src/lib/effectiveMaintenance.js` — pure resolver (prior + residual +
  judgeability + provenance).
- NEW thin reader for the snapshot (impure), mirroring `programmePosition`'s
  shape.
- `nutritionEngine.calculateNutritionTargets` — take maintenance as an INPUT
  rather than always deriving it.
- `weeklyCoach` — persist the residual instead of discarding it; feed the
  resolved maintenance as `currentTDEEEstimate`.
- `nutritionTargetsView` — REMOVE the `?? targetKcal` fallback (a second
  authority).
- `useWeightTrend` — read the resolver, not `targets.tdee`.
- Diet-break path — resolve through the same authority.
- `database.js` + `sync.js` + one migration.

### Untouched

- Phase percentages
- Macro splits
- `computeAdaptiveTDEEAdjustment` internals
- Damping / update gain
- +/-5% clamp, cooldowns
- FFM floor, calorie floors
- Rapid-loss protection
- ED / wellbeing safeguards
- Calorie Bank
- All training code (Campaign 16 and Campaign 18)


---

## 11. FOUNDER QUESTIONS

One genuinely unresolved product choice.

### What is RESIDUAL_BOUND?

The maximum cumulative divergence of effective maintenance from the formula
prior.

- (a) +/-15%  Conservative. Caps a heavy under-reporter's learned maintenance
              close to formula.

- (b) +/-20%  RECOMMENDED. Accommodates real systematic under-reporting
              (commonly 15-25% in self-report literature) without letting a
              corrupt logging period run away.

- (c) +/-25%  Maximal trust in logged history.

This is a genuine product judgement, not an engineering default. It is the one
number that decides how much the app is willing to believe an athlete's diary
over the formula.

Every safety floor stays senior whichever you pick.


---

## 12. VERDICT

FOUNDER DECISION REQUIRED — on section 11 only.

Everything else is resolved and coherent:

- model C as a memoised derivation
- prior + bounded residual
- the portability matrix
- the precedence stack
- the persistence and provenance shape

Give me the bound and this is ready to implement.
