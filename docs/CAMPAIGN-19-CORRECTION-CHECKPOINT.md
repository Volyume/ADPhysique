# CAMPAIGN 19 — FINAL ARCHITECTURE CORRECTION CHECKPOINT

Model C is accepted. These seven points are corrected and are authoritative
wherever they conflict with the original design ruling
(`docs/CAMPAIGN-19-EFFECTIVE-MAINTENANCE-DESIGN.md`).

DESIGN ONLY. No code, tests or migrations changed.


---

## 1. CORRECTED UPDATE EQUATION

CONFIRMED: `computeAdaptiveTDEEAdjustment` returns an INCREMENTAL correction.

```
adjustedTDEE = currentTDEEEstimate + adjustmentKcal
```

Once effective maintenance itself becomes `currentTDEEEstimate`,
`adjustmentKcal` is NOT the total divergence from the formula prior.

THE PERSISTED CANONICAL VALUE IS THE CUMULATIVE RESIDUAL, NOT THE ABSOLUTE
EFFECTIVE MAINTENANCE.

```
formulaPrior      = current formula maintenance, recomputed EVERY resolve
                    from CURRENT bodyweight / activity / profile

currentAnchor     = formulaPrior + storedCumulativeResidual
                    (cold start: storedCumulativeResidual = 0)

update            = computeAdaptiveTDEEAdjustment({
                      currentTDEEEstimate: currentAnchor,
                      ...
                    })

candidateEM       = update.adjustedTDEE
                    ( = currentAnchor + update.adjustmentKcal )

cumulativeResidual = candidateEM - formulaPrior          <- PERSIST THIS

effectiveMaintenance = formulaPrior + cumulativeResidual <- ALWAYS DERIVED
```

### Why the residual is canonical, not the absolute value

When the athlete's bodyweight changes, `formulaPrior` moves. If the absolute
effective maintenance were stored, it would be held constant across that change
and the learned offset would silently inflate.

Storing the RESIDUAL means effective maintenance tracks the prior
automatically while the learned offset persists. That is the behaviour the
portability matrix already requires for a meaningful bodyweight change.

### Explicitly forbidden

```
newResidual = storedResidual + update.adjustmentKcal     <- DOUBLE COUNTS
newEM       = formulaPrior + update.adjustmentKcal       <- RESETS the residual
                                                            to the latest
                                                            increment
```


---

## 2. CORRECTED STALE LAW

REMOVED: "drifts back toward prior".

There is NO time-decay coefficient and no automatic drift.

STALENESS CHANGES AUTHORITY, NOT HISTORICAL FACT.

When evidence is stale:

- the last validated `cumulativeResidual` is RETAINED UNCHANGED;
- NO new adaptive correction is computed;
- `source` is `held_stale`, NEVER `athlete_evidence`;
- it MAY still be used as a STARTING PRIOR where the context is compatible;
- athlete evidence becomes CURRENT again ONLY after fresh judgeable evidence
  revalidates it.

### Target regeneration while HELD_STALE — exact behaviour

```
effectiveMaintenance = formulaPrior + storedCumulativeResidual
                       (formulaPrior recomputed at CURRENT bodyweight/activity)

targetKcal           = effectiveMaintenance x (1 + phaseAdj)
                       (phase maths unchanged)

                     -> full existing safety chain, unchanged

provenance:  source     = held_stale
             judgeable  = false
             decision   = held
```

The residual is NOT recomputed, NOT decayed, NOT zeroed.

### Context-incompatible staleness

If the residual's `bodyweight_context` or `goal_context` no longer describes
the athlete, the EMITTED number falls back to `formulaPrior` alone, while the
stored residual is STILL RETAINED as history.

Only an explicit user reset deletes it.


---

## 3. CORRECTED MANUAL-AUTHORITY LAW

Manual calorie authority is senior for INTERVENTION only.

It does NOT inherently invalidate OBSERVATIONAL evidence: what the athlete ate
and what their weight did are equally real whoever chose the number.

THE DISCRIMINATOR is whether the estimate would depend on a prescribed-target
proxy.

### Learning CONTINUES while a manual target is active when BOTH hold

- `actualIntakeKcal` is available with sufficient diary coverage
  (the existing B1 path in `computeAdaptiveTDEEAdjustment`, which reads what
  was EATEN rather than prescribed x adherence);
- robust weight-response evidence is present.

Then:

- `source = athlete_evidence`
- residual updates normally
- Volyume STILL NEVER overwrites or silently replaces the manual target
- the learned maintenance informs PROVENANCE and FUTURE NON-MANUAL
  REGENERATION only

### Learning HOLDS (`source = held_confounded`) when

- actual logged intake is unavailable or coverage is poor, so the model would
  fall back to `prescribedKcal x adherenceFactor` — a proxy for a number the
  app did not choose, which is not evidence about maintenance.

### Portability matrix rows replaced

| Transition                   | Classification                                                              |
|------------------------------|-----------------------------------------------------------------------------|
| Manual calorie target active | DIRECTLY ACTIONABLE if actual intake coverage is sufficient, else CONFOUNDED |
| Manual target removed        | DIRECTLY ACTIONABLE if learning continued throughout, else REQUIRES REVALIDATION |


---

## 4. EVIDENCE-SIGNATURE CONTRACT

Window bounds plus context is INSUFFICIENT: an edit, delete or correction
inside the same window leaves the bounds identical while changing the
evidence.

The signature must be CONTENT-ADDRESSED over the authoritative rows ACTUALLY
CONSUMED.

SAME SIGNATURE MUST MEAN:
same relevant evidence + same context + same algorithm.

### Smallest deterministic form

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

### Notes

- `updatedAt` on each row makes an in-place EDIT change the hash.
- A soft DELETE removes the row from the consumed set, so it also changes.
- Sorting by row id makes the hash order-independent, so sync arrival order
  cannot change it. Same discipline as `pickCurrentResolution`.
- ONLY rows the resolver actually consumed are included, so an unrelated edit
  outside the window does not needlessly invalidate the memo.
- A signature mismatch means RECOMPUTE. Never silent reuse, never a guess.


---

## 5. HISTORICAL-RECEIPT CONTRACT

One mutable current snapshot explains the CURRENT number only. A coaching
decision made three months ago cannot be explained by a row that has since
been overwritten.

CONTRACT: any historical decision that ALREADY carries a receipt must STAMP
the maintenance provenance used AT DECISION TIME.

- Reuse `coachIntervention.buildInterventionRecord`, which already carries
  `authorisedBy`, `baseline` and `because`. Add the maintenance provenance
  reference to the record it already writes.

- Stamp:

```
source
effectiveMaintenanceKcal
formulaPriorKcal
cumulativeResidualKcal
algorithmVersion
asOf
evidenceSignature
```

- That is a handful of fields on a record that is already written.

NO new ledger. NO event sourcing. NO second history.

Decisions that do not already carry a receipt do NOT gain one in Campaign 19.


---

## 6. RESIDUAL-BOUND RULING

The earlier framing was WRONG. It treated `formulaPrior` as approximately
correct and any large divergence as suspect.

`formulaPrior` is a PRIOR, not ground truth. It carries its own individual
error, and cumulative residual represents:

```
formula error + activity mismatch + logging bias + contextual energy differences
```

combined. A hard clamp therefore asserts the formula is right when the
evidence says otherwise.

### Options considered

A. HARD CUMULATIVE +/-20% CLAMP

   REJECTED. It silently overrides the athlete's own demonstrated evidence in
   exactly the population it matters most for (systematic under-reporters),
   and the clamp would be invisible in the emitted number.

B. NO CUMULATIVE CLAMP, relying on judgeability + damping + step limits

   REJECTED ALONE. Correct in spirit, but it leaves no signal at all when the
   divergence is genuinely implausible, which is a real diagnostic loss.

C. DIVERGENCE / REVALIDATION BOUNDARY   <- WINNER

   Unusually large divergence raises the EVIDENCE REQUIREMENT rather than
   declaring the formula correct.

### Minimal deterministic behaviour

Two bands. No state machine. No new score.

```
divergence = |cumulativeResidual| / formulaPrior

NORMAL      divergence <= RESIDUAL_REVALIDATION_BAND
            -> existing judgeability applies UNCHANGED

EXTENDED    divergence >  RESIDUAL_REVALIDATION_BAND
            -> the SAME judgeability gates apply, but the evidence window
               required to APPLY a further residual update in the WIDENING
               direction is DOUBLED
            -> updates in the NARROWING direction are UNAFFECTED
            -> the value is STILL EMITTED, still labelled athlete_evidence
            -> provenance carries bounds.extendedEvidenceRequired = true
```

```
RESIDUAL_REVALIDATION_BAND = 20%
```

Stated explicitly as an ENGINEERING TRUST / DIAGNOSTIC PARAMETER. It marks
where Volyume asks for more evidence before believing itself further.

It is NOT a physiological claim.
It is NOT a limit on what a human's maintenance can be.
It NEVER clamps the emitted number.

All existing safety remains senior and unchanged: calorie floors, FFM floor,
rapid-loss protection, ED/wellbeing safeguards, the +/-5% target step,
cooldowns.


---

## 7. BASELINE VERIFICATION

The design names `ada99f8075abe255f93e972fc301299882b8f458`.
The targeted reads were taken from `f42f72d0`.

No re-audit now. IMPLEMENTATION MUST BEGIN WITH:

```
git diff ada99f80..<implementation baseline> -- \
  src/lib/nutritionEngine.js \
  src/lib/weeklyCoach.js \
  src/lib/nutritionTargetsView.js \
  src/hooks/useWeightTrend.js \
  src/lib/database.js
```

and prove NO C19-relevant nutrition path changed between the inspected code
and the actual implementation baseline.

A non-empty relevant diff HALTS implementation and returns to this checkpoint.


---

## REVISED FINAL VERDICT

DESIGN READY FOR IMPLEMENTATION.

No open founder decision remains.

The residual bound is resolved as an EVIDENCE-REQUIREMENT BOUNDARY rather than
a VALUE CLAMP, which removes the question that previously blocked it.
