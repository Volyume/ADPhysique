Status: SPEC / PROPOSED (not implemented) | Timestamp: 2026-06-04 | Phase 5: frequency-first weak-point specialisation

# planEngine rebuild, phase 5 (SPEC): frequency-first weak-point specialisation

This document specifies a redesign of how the plan engine delivers weak-point
(lagging muscle) specialisation. It is a forward spec, nothing here is built
yet. It is to be readdressed after the current release.

It follows directly from phase 4
(`planengine-rebuild-07-phase4-weakpoint-composition.md`), whose own table
records the constraint this phase removes:

| Division | glutes base -> WP |
|---|---|
| mens_physique | 3 -> 6 |   <- a glute weak point only doubles, trains 1x/week

and from the placement-correctness fix shipped 2026-06-04 (movement-pattern
aware augmentation + `planExercisePlacement.audit.test.js`).

---

## 0. TL;DR

The engine builds a fixed day skeleton first (the division matrix) and then
tries to slot a weak muscle into an existing same-pattern day. That is
backwards from how coaches program. The fix that shipped stops the wrong-day
contamination (no more bench press on Pull (Width)) but, being conservative,
confines a weak muscle to the days the skeleton already gives it. A lower-body
weak point in an upper-focused division (e.g. glutes in Men's Physique, one leg
day) therefore trains only 1x/week, which is not specialisation.

This spec flips the model to **frequency-first**: when a muscle is a weak
point, guarantee it 2-3 sessions/week by adding it to extra days as an
appropriate *accessory* (never a heavy opposite-pattern compound), and drop the
non-priority muscles to maintenance volume to fund the recovery. The
placement-correctness guarantee is preserved.

---

## 1. Problem statement

The behaviour the founder flagged (2026-06-04): "Is there too heavy a reliance
on upper/lower? It's not that way in the real world."

Two layered issues:

1. **Split-first, not frequency-first.** `buildFromMatrix` takes a fixed
   `DIVISION_MATRIX[goal][days]` skeleton and only adds a weak muscle to days
   that already train its movement pattern. If the skeleton has one day of that
   pattern, the weak muscle gets one day. Real specialisation needs 2-3.

2. **The conservative fix limits magnitude.** The 2026-06-04 fix correctly
   refuses to scatter a muscle onto opposite-pattern days, but it has no way to
   *create* additional appropriate exposures. So `mens_physique` glutes stays at
   3 -> 6 (1x/week) instead of reaching a real specialisation frequency.

Not in scope as a problem: the women's divisions (bikini / wellness / figure)
already give glutes/hams 3-4 days in their templates, so they already specialise
at frequency. The gap is a weak point that the chosen division template does not
naturally train often.

---

## 2. What ships today (the safe baseline)

Files: `src/lib/planEngine.js`.

- `MUSCLE_PATTERN` maps each muscle to `push | pull | legs | delts | core`.
- `PATTERN_ANCHORS` lists the big movers that *define* a day's pattern
  (`push: chest, front_delts`; `pull: back`; `legs: quads, hamstrings, glutes`).
- `patternFits(m, sessionMuscles)` gates augmentation: a muscle is only added to
  a session that already trains an anchor of the same pattern (side delts are
  neutral; abs ride only on abs days).
- `buildFromMatrix` uses `patternFits` for both structural coverage and the
  weak-point session augmentation. A weak point that cannot reach the desired
  number of same-pattern days concentrates at a higher per-session cap (12 vs 8
  in `buildSession`) instead of contaminating.
- `planExercisePlacement.audit.test.js` proves zero misplacements across 38,016
  combinations; the same audit flags 21,157 on the pre-fix logic.

This baseline is correct and must remain green. Phase 5 builds on top of it; it
does not loosen the placement guarantee.

---

## 3. Research basis (coaching consensus)

Evidence-based coaching is consistent that specialisation is frequency-first:

1. **Specialise by raising frequency + volume on the target, and dropping the
   rest to maintenance.** RP / Israetel volume landmarks: MEV is the floor to
   grow; below it (MV) you maintain. During a specialisation block, non-priority
   muscles sit near MV so recovery funds the priority.
   - https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth
   - https://www.gymaholic.co/articles/specialization-weak-muscles
   - https://barbend.com/bodybuilding-weak-points/

2. **Frequency is the delivery mechanism: 2-4x/week, 1-2 exercises per session,
   spread across the week.** Glutes are the canonical example (heavy hinge one
   day, hip thrust another, lunge another).
   - https://www.strongerbyscience.com/frequency-muscle/

3. **Weekly set target (~10-20) is the real currency; frequency just lets you
   hit it without one junk-long session.**
   - https://www.reshapeapp.ai/blog/hypertrophy-training-explained-sets-reps-progression

4. **Low-frequency splits are the problem, not "upper/lower" as a label.** A
   split that trains a muscle 1x/week is poor for weak points regardless of its
   name. At 3-4 days full-body out-grows splits (Schoenfeld).
   - https://outlift.com/push-pull-legs/
   - https://bulkandstrength.com/push-pull-legs-vs-upper-lower-vs-full-body-training/

Take-away for the engine: a weak point should be *programmed across the week at
frequency*, with the split serving the frequency rather than the muscle being
forced into the split.

---

## 4. Design principles

- P1. A weak muscle is trained on **>= 2 sessions/week** (target 2-3), capped by
  recovery and the time budget, never fewer than its template already gives it.
- P2. Extra exposures are added as **accessories that fit the day**, never a
  heavy opposite-pattern compound. A hip thrust or cable fly can ride on most
  days; a barbell back squat or bench press cannot lead a pull day.
- P3. **Non-priority muscles drop toward maintenance (MV)** so total recovery and
  the per-session time budget stay sane while the priority rises.
- P4. **Placement correctness is preserved**: the
  `planExercisePlacement.audit.test.js` invariant (no exercise on a day that
  contradicts its movement pattern *when a proper home exists*) must stay green,
  extended with the accessory rule below.
- P5. **Division character is retained** (a Men's Physique plan still leads with
  delts/back), as already asserted in `coachDivisions.test.js` stage 4.

---

## 5. The model

### 5.1 Exercise role taxonomy (already in the data)

`POOL` entries carry a movement class `p`:
`heavy_compound | mod_compound | machine | isolation`. This is the lever for P2:

- **Lead movements**: `heavy_compound` (and division-leading `mod_compound`
  presses/rows). These define a day and must match its pattern. Unchanged.
- **Accessory movements**: `isolation`, `machine`, and the lighter
  `mod_compound` hinges/raises. These can be added to a day for *frequency*
  without redefining its pattern, provided they do not conflict with recovery
  (see 5.4).

Define a helper:

```
ACCESSORY_CLASSES = new Set(['isolation', 'machine']);
function isAccessory(poolEntry) { return ACCESSORY_CLASSES.has(poolEntry.p); }
```

(Hip thrust is currently `mod_compound`; either retag the hip-thrust / RDL
"accessory hinge" entries with an `accessoryOk: true` flag, or extend the set
to include hinge `mod_compound` for glutes/hams specifically. Decision in S10.)

### 5.2 Frequency target

For each weak-point muscle `m` with boosted weekly target `wTarget`:

```
freqTarget(m) = clamp(2, 3, ceil(wTarget / PER_SESSION_PRODUCTIVE))   // PER_SESSION_PRODUCTIVE ~ 8
```

Capped by `daysPerWeek` and by recovery (`recoveryRating` lowers the ceiling).

### 5.3 Two-tier placement (replaces the single augmentation pass)

Phase A, **anchor placement (existing)**: add `m` to same-pattern *anchor* days
via `patternFits` (current behaviour). These carry the lead + heavy volume.

Phase B, **accessory frequency fill (new)**: if `m` is still below
`freqTarget(m)`, add it to additional days where:

- the day is NOT an opposite-pattern day for a *lead* (so still no bench on a
  pull day), AND
- the exercise selected for `m` on that day is restricted to
  `isAccessory(...)` (so the extra exposure is a fly / cable / hip thrust, not a
  barbell press), AND
- the day has time-budget headroom after its own lead work (see 5.5), AND
- a per-session accessory cap is respected (<= 1 added accessory muscle/session,
  <= ~4-6 sets) so sessions do not bloat.

This delivers, e.g., glutes on the leg day (Phase A lead, hip thrust + squat
accessory volume) PLUS a hip thrust accessory on 1-2 other lower-headroom days,
reaching 2-3x/week without putting a squat on a pull day.

### 5.4 Where an accessory may ride

An accessory for weak muscle `m` (pattern `P`) may be added to day `D` if:

- `D` trains an anchor of `P` (ideal), OR
- `m` is a *neutral or compatible* accessory for `D`: glutes/hams (hinge) and
  abs ride on most days; a chest fly rides on a push or arms day but not a pure
  pull day; a back accessory (straight-arm pulldown, face pull) rides on a pull
  or delt day but not a pure push day.

Encode as an `ACCESSORY_COMPAT` table keyed by muscle -> set of day-patterns it
may accessory into. This is deliberately *more permissive than the lead rule*
(frequency) but still forbids the genuinely wrong pairings (P2/P4).

### 5.5 Time budget and maintenance funding

- Before Phase B adds an accessory to `D`, check
  `estimateWorkoutMinutes(D) + accessoryCost <= budget`. Only add if it fits.
- Fund the additions by P3: lower non-priority muscle targets to MV in
  `applyGoalOverlay` during a weak_point phase (partially done; make explicit
  and stronger so headroom exists). The existing `trimToTimeBudget` remains the
  backstop.

### 5.6 Worked examples

**Men's Physique 5d, glutes weak point** (today 3 -> 6, 1x/week):
- Phase A: glutes lead on `Legs + Abs` (squat + hip thrust + RDL).
- Phase B: glutes accessory (hip thrust, 3-4 sets) added to `Pull (Thickness)`
  or `Delts + Arms` if headroom (lower-leg work is light there). Result: glutes
  2x/week, ~6 -> ~12-14, no squat on a pull day. Quads/hams/delts shift toward
  MV to fund it; delts stay dominant (P5).

**Men's Physique 5d, upper-chest weak point**:
- Phase A: chest leads `Push (Delts + Chest)` (incline press heavy).
- Phase B: chest accessory (incline cable fly, 3-4 sets) added to `Delts + Arms`
  (has triceps/push), NOT to a pull day. Chest 2x/week, on-pattern.

---

## 6. Concrete code changes

All in `src/lib/planEngine.js` unless noted.

1. `isAccessory(poolEntry)` + `ACCESSORY_COMPAT` table (5.1, 5.4). Possibly an
   `accessoryOk` flag on hinge POOL entries (S10 decision).
2. `freqTarget(m, wTarget, daysPerWeek, recoveryRating)` (5.2).
3. `buildFromMatrix`: after the existing Phase-A augmentation, run Phase-B
   accessory frequency fill (5.3), tagging added exercises so `buildSession`
   selects only accessory-class movements for them and the volume summary still
   attributes correctly.
4. `selectExercisesForMuscle`: accept an `accessoryOnly` flag to restrict the
   pool to accessory classes for Phase-B adds.
5. `applyGoalOverlay`: during `weak_point` phase, push non-priority muscles
   toward MV explicitly (5.5 / P3).
6. Keep `patternFits` for leads unchanged (placement guarantee).

No DB/schema changes. No change to the saved plan shape. `planAutoGen` already
strips the internal `_muscle` tag before write.

---

## 7. Invariants and test plan

Extend, do not replace, the existing guards.

- **Placement audit (existing, must stay green):**
  `planExercisePlacement.audit.test.js`. Update the day-allow model so a Phase-B
  *accessory* of muscle `m` on day `D` is allowed iff `ACCESSORY_COMPAT[m]`
  permits `D`'s patterns. Leads remain under the strict anchor rule. The audit
  must still flag a *lead* heavy compound on a contradicting day.
- **New frequency invariant:** for every division x days x single-weak-point
  combination where the muscle has any anchor day or compatible accessory day,
  assert the weak muscle appears on `>= min(2, feasibleDays)` sessions.
- **New no-bloat invariant:** no session exceeds the 110-min hard cap (already
  in `planengineFullVerification.test.js`); add a per-session accessory-count
  cap assertion.
- **coachDivisions stage 4:** restore a meaningful additive threshold once
  Phase B lands (e.g. glutes WP >= base x 2 AND >= a frequency-derived floor),
  replacing the interim `> base` assertion.
- **Maintenance check:** non-priority muscles in a weak_point plan sit at or
  below their MEV (near MV), proving the recovery is actually reallocated.

Target: full sweep clean; coaching simulation clean; verification <= 110 min.

---

## 8. Edge cases

- **Multiple weak points (max 3):** cap total added accessory frequency so three
  weak points do not bloat every session. Priority order by boosted target.
- **Lower weak point, upper division, low days (MP 3-4d):** may only reach 2x if
  one accessory day exists; if not, fall back to the concentrated single day
  (today's behaviour) rather than violate the time budget.
- **Bodyweight / dumbbells-only equipment:** accessory pool must respect `eq`;
  if no accessory movement exists for `m` on a day, skip that day.
- **General / bodybuilding (non-matrix, PPL/UL/FB):** these already run
  higher-frequency splits; Phase B applies the same accessory fill on the PPL/UL
  builders for parity.

---

## 9. Migration / rollout

- No migration. Affects newly generated plans only.
- Existing saved plans are untouched; a user picks up the new behaviour by
  rebuilding from "Update your plan".
- Behind no flag is needed, but ship to a dev build and re-run the full audit +
  verification before it reaches a release track.

---

## 10. Open decisions for the founder

- S10.1 **Default specialisation frequency:** 2x or 3x for a single weak point?
  (Proposed: 2x baseline, 3x only for glutes/side-delts where high frequency is
  standard and recovery cheap.)
- S10.2 **How aggressively to drop non-priority muscles** during a weak_point
  phase: hold at MEV, or go to true MV? (Proposed: MV for non-division-character
  muscles, MEV for division-character ones.)
- S10.3 **Hip thrust / RDL classification:** retag as accessory-eligible hinge,
  or add an explicit `accessoryOk` flag? (Proposed: explicit flag, clearer.)
- S10.4 **Should specialisation be a distinct, time-boxed block** (a 4-6 week
  mesocycle that auto-reverts), matching how coaches run it, rather than a
  standing plan setting? (Larger; could be its own phase 6.)

---

## 11. Risks

- Accessory fill interacting badly with the time-budget trim (an added accessory
  gets trimmed straight back off). Mitigation: only add when headroom exists
  pre-check, and protect the added exposure from the first trim pass.
- Volume-summary attribution drift if Phase-B exercises are not tagged with the
  muscle they serve. Mitigation: reuse the `_muscle` tagging path.
- Over-bloating with 3 simultaneous weak points. Mitigation: global accessory
  budget per session (8.1).

## 12. Out of scope (this phase)

- Time-boxed specialisation mesocycles (S10.4 -> potential phase 6).
- Changing the division matrices themselves.
- Any change to nutrition / calorie logic.
