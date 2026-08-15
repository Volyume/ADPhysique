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


---
---

# CORRECTION CHECKPOINT (supersedes the sections it names)

Model C stands. The following seven points are corrected and are the
authoritative version where they conflict with anything above.


## C1. CORRECTED UPDATE EQUATION (supersedes section 4)

CONFIRMED: `computeAdaptiveTDEEAdjustment` returns an INCREMENTAL correction
(`adjustedTDEE = currentTDEEEstimate + adjustmentKcal`). Once effective
maintenance becomes `currentTDEEEstimate`, `adjustmentKcal` is NOT the total
divergence from the formula prior.

THE PERSISTED CANONICAL VALUE IS THE CUMULATIVE RESIDUAL, NOT THE ABSOLUTE
EFFECTIVE MAINTENANCE.

```
formulaPrior      = current formula maintenance, recomputed every resolve
                    from CURRENT bodyweight / activity / profile

currentAnchor     = formulaPrior + storedCumulativeResidual
                    (cold start: storedCumulativeResidual = 0)

update            = computeAdaptiveTDEEAdjustment({
                      currentTDEEEstimate: currentAnchor,
                      ...
                    })

candidateEM       = update.adjustedTDEE
                    ( = currentAnchor + update.adjustmentKcal )

cumulativeResidual = candidateEM - formulaPrior      <- PERSIST THIS

effectiveMaintenance = formulaPrior + cumulativeResidual   <- always derived
```

Why the residual and not the absolute value is canonical: when the athlete's
bodyweight changes, `formulaPrior` moves. If the absolute EM were stored it
would be held constant across that change and the learned offset would
silently inflate. Storing the residual means EM tracks the prior automatically
while the learned offset persists, which is the behaviour the portability
matrix already requires.

EXPLICITLY FORBIDDEN, and the failure this prevents:

- `newResidual = storedResidual + update.adjustmentKcal`   (double counts)
- `newEM = formulaPrior + update.adjustmentKcal`           (resets the residual
                                                            to the latest
                                                            increment)


## C2. CORRECTED STALE LAW (supersedes the HELD_STALE row in section 5)

REMOVED: "drifts back toward prior". There is NO time-decay coefficient and no
automatic drift. Staleness changes AUTHORITY, not historical fact.

When evidence is stale:

- the last validated `cumulativeResidual` is RETAINED unchanged;
- NO new adaptive correction is computed;
- `source` is `HELD_STALE`, never `athlete_evidence`;
- it may still be used as a STARTING PRIOR where the context is compatible;
- athlete evidence becomes CURRENT again only after fresh judgeable evidence
  revalidates it.

TARGET REGENERATION WHILE HELD_STALE — exact behaviour:

- `effectiveMaintenance = formulaPrior + storedCumulativeResidual`, with
  `formulaPrior` recomputed at CURRENT bodyweight and activity;
- `targetKcal = effectiveMaintenance x (1 + phaseAdj)`, phase maths unchanged;
- the whole existing safety chain applies unchanged;
- `source = held_stale`, `judgeable = false`, `decision = held`;
- the residual is NOT recomputed, NOT decayed, NOT zeroed.

Context-incompatible staleness (the residual's `bodyweight_context` or
`goal_context` no longer describes the athlete) drops to `formulaPrior` alone
for the emitted number, while STILL retaining the stored residual as history.
Only an explicit user reset deletes it.


## C3. CORRECTED MANUAL-AUTHORITY LAW (supersedes the manual rows in sections 5 and 6)

Manual calorie authority is senior for INTERVENTION only. It does not
inherently invalidate OBSERVATIONAL evidence: what the athlete ate and what
their weight did are equally real whoever chose the number.

The discriminator is whether the estimate would depend on a prescribed-target
proxy.

LEARNING CONTINUES while a manual target is active when BOTH hold:

- `actualIntakeKcal` is available with sufficient diary coverage
  (the existing B1 path in `computeAdaptiveTDEEAdjustment`, which reads what
  was eaten rather than prescribed x adherence);
- robust weight-response evidence is present.

Then: `source = athlete_evidence`, residual updates normally, and Volyume
STILL NEVER overwrites or silently replaces the manual target. The learned
maintenance informs provenance and future non-manual regeneration only.

LEARNING HOLDS (`source = held_confounded`) when:

- actual logged intake is unavailable or coverage is poor, so the model would
  fall back to `prescribedKcal x adherenceFactor` — a proxy for a number the
  app did not choose, which is not evidence about maintenance.

Portability matrix rows replaced:

| Manual calorie target active | DIRECTLY ACTIONABLE if actual intake coverage is sufficient, else CONFOUNDED |
| Manual target removed        | DIRECTLY ACTIONABLE if learning continued throughout, else REQUIRES REVALIDATION |


## C4. EVIDENCE-SIGNATURE CONTRACT (supersedes step 3 of section 4)

Window bounds plus context is INSUFFICIENT: an edit, delete or correction
inside the same window leaves the bounds identical while changing the evidence.

The signature must be CONTENT-ADDRESSED over the authoritative rows actually
consumed.

SAME SIGNATURE MUST MEAN: same relevant evidence + same context + same
algorithm.

Smallest deterministic form:

```
signature = hash(
  sorted[ (foodEntryRowId, updatedAt) ... consumed in window ],
  sorted[ (weightRowId,    updatedAt) ... consumed in window ],
  bodyweightContextBand,
  goalPhase,
  manualTargetActive,
  algorithmVersion
)
```

Notes:

- `updatedAt` on each row makes an in-place edit change the hash; a soft delete
  removes the row from the consumed set and therefore also changes it.
- Sorting by row id makes the hash order-independent, so sync arrival order
  cannot change it. Same discipline as `pickCurrentResolution`.
- Only rows the resolver ACTUALLY consumed are included, so an unrelated edit
  outside the window does not needlessly invalidate the memo.
- A signature mismatch means RECOMPUTE, never silent reuse and never a guess.


## C5. HISTORICAL-RECEIPT CONTRACT (supersedes the "explain old decisions" claim in section 3)

One mutable current snapshot explains the CURRENT number only. A coaching
decision made three months ago cannot be explained by a row that has since
been overwritten.

CONTRACT: any historical decision that already carries a receipt must STAMP
the maintenance provenance used AT DECISION TIME.

- Reuse `coachIntervention.buildInterventionRecord`, which already carries
  `authorisedBy`, `baseline` and `because`. Add the maintenance provenance
  reference to the record it already writes.
- Stamp: `source`, `effectiveMaintenanceKcal`, `formulaPriorKcal`,
  `cumulativeResidualKcal`, `algorithmVersion`, `asOf`, `evidenceSignature`.
- That is a handful of fields on a record that is already written.

NO new ledger, no event sourcing, no second history. Decisions that do not
already carry a receipt do not gain one in Campaign 19.


## C6. RESIDUAL-BOUND RULING (supersedes section 11)

The earlier framing was wrong. It treated `formulaPrior` as approximately
correct and any large divergence as suspect. `formulaPrior` is a PRIOR, not
ground truth: it carries its own individual error, and cumulative residual
represents formula error + activity mismatch + logging bias + contextual
energy differences combined. A hard clamp therefore asserts the formula is
right when the evidence says otherwise.

Options considered:

- A. HARD CUMULATIVE +/-20% CLAMP.
  Rejected. It silently overrides the athlete's own demonstrated evidence in
  exactly the population it matters most for (systematic under-reporters), and
  the clamp would be invisible in the emitted number.

- B. NO CUMULATIVE CLAMP, relying on judgeability + damping + step limits.
  Rejected alone. Correct in spirit, but it leaves no signal at all when the
  divergence is genuinely implausible, which is a real diagnostic loss.

- C. DIVERGENCE / REVALIDATION BOUNDARY.  WINNER.
  Unusually large divergence raises the EVIDENCE REQUIREMENT rather than
  declaring the formula correct.

MINIMAL DETERMINISTIC BEHAVIOUR — two bands, no state machine, no new score:

```
divergence = |cumulativeResidual| / formulaPrior

NORMAL      divergence <= RESIDUAL_REVALIDATION_BAND
            -> existing judgeability applies unchanged

EXTENDED    divergence >  RESIDUAL_REVALIDATION_BAND
            -> the SAME judgeability gates apply, but the evidence window
               required to APPLY a further residual update in the widening
               direction is doubled
            -> updates in the NARROWING direction are unaffected
            -> the value is still emitted, still labelled athlete_evidence
            -> `bounds.extendedEvidenceRequired = true` in provenance
```

RESIDUAL_REVALIDATION_BAND = 20%.

Stated explicitly as an ENGINEERING TRUST / DIAGNOSTIC PARAMETER: it marks
where Volyume asks for more evidence before believing itself further. It is
NOT a physiological claim, NOT a limit on what a human's maintenance can be,
and it never clamps the emitted number.

All existing safety remains senior and unchanged: calorie floors, FFM floor,
rapid-loss, ED/wellbeing, the +/-5% target step, cooldowns.


## C7. BASELINE VERIFICATION (new)

The design names `ada99f8075abe255f93e972fc301299882b8f458`; the targeted
reads were taken from `f42f72d0`.

No re-audit now. IMPLEMENTATION MUST BEGIN WITH:

```
git diff ada99f80..<implementation baseline> -- \
  src/lib/nutritionEngine.js \
  src/lib/weeklyCoach.js \
  src/lib/nutritionTargetsView.js \
  src/hooks/useWeightTrend.js \
  src/lib/database.js
```

and prove no C19-relevant nutrition path changed between the inspected code
and the actual implementation baseline. A non-empty relevant diff halts
implementation and returns here.


## REVISED VERDICT

DESIGN READY FOR IMPLEMENTATION.

No open founder decision remains. The residual bound is resolved as an
evidence-requirement boundary rather than a value clamp, which removes the
question that previously blocked it.
