# 06 — Plan construction improvement proposal

Concrete, implementable changes to how the Coach generates plans, how the
library routines are built, and how the machine-only pathway works. Ordered
so the enabling fix comes first.

## 0. Fix the foundation: one exercise dataset

**Problem (gap C1):** planEngine builds from its own hardcoded `POOL`;
`planAutoGen` drops any exercise whose name isn't in the library. Two lists
drift.

**Proposal:** make the library the single source of truth and **generate
the planEngine pool from it**. Each library exercise already carries (after
`04`) `equipment_profiles`, `subregion`, `compound_isolation`,
`fatigue_cost`, `sfr` and a param mapping derivable from
compound/isolation + load. A build step (or a runtime read) produces the
`{ n, sub, p, eq }` entries planEngine consumes, from library rows. Result:
adding an exercise to the library makes it available to generation
automatically, and a name can never fail to resolve because the names come
from the same place.

If a full merge is too large for one pass, the safe interim is a
**validation test** that asserts every planEngine pool name and every
`seedRoutines` exercise name exists in `RAW`, so drift is caught in CI
rather than silently dropping exercises. Recommend doing the validation
test first regardless.

## 1. Subregion-aware selection

Extend `SUBREGION_REQUIREMENTS` (planEngine.js 344-352) from the current
handful to the full table B in `04`, with sensible "required when weekly
sets exceed N" thresholds per muscle:

- chest: require `upper` + `mid`, add `lower` once sets >= ~12.
- back: require `lat_width` + `mid_back`, add `lower_back` when a hinge
  isn't already covering it.
- shoulders: require all three heads (`anterior` is usually covered by
  pressing; force `lateral` and `posterior` explicitly, since pressing
  alone neglects them).
- triceps: require `long_head` once sets >= ~6 (the Maeo point).
- biceps: require `long_head` + `short_head` once sets >= ~8.
- quads: require `sweep` + `rectus` once sets >= ~10.
- hamstrings: keep `hip_hinge` + `knee_flexion` (already there).
- glutes: require `max`, add `medius` once sets >= ~10.
- calves: keep `gastro` + `soleus`.

The existing slot-rotation logic (planEngine.js ~569) already spreads
required subregions across sessions; it just needs the richer requirement
set and the richer pool to draw from.

## 2. Goal-aware selection

Today goal changes volume and rep range but not exercise choice (gap C2).
Add a **selection bias by goal** on top of the existing overlays:

- **Hypertrophy (default):** rank candidates by `sfr` descending within
  each subregion, so machine/cable and stable movements win where they
  tie on coverage. Allow wider rep ranges (existing). Prefer more
  isolation to cover subregions.
- **Strength:** bias toward `compound` + `equipment_category in (barbell)`
  for the primary movement of each major pattern, lower reps (existing
  strength_size phase already shifts rep ranges), fewer isolation slots.
  Implement as a candidate-score weight, not a hard filter, so a
  machine-only strength user still gets a plan.
- **General fitness / recomp:** bias toward compound, full-body or
  upper/lower friendly movements, fewer total exercises, prioritise high
  `sfr` and low skill.

This is a scoring tweak in `selectExercisesForMuscle` (the `sortScore`
function), reading the new fields, not a rewrite.

## 3. Equipment enforcement and the machine-only pathway

### Enforcement

Selection already filters by one `equipment` profile (planEngine
`filterPool`). With `equipment_profiles` now on each library exercise, the
filter reads from the library and is correct by construction.

### Machine-only as a first-class option

Today machine-only is the hidden `machines_cables` profile. Make it a
named choice:

- **Where it's selected:** in the equipment step of onboarding /
  `ProGoalSetupScreen`, present equipment as a clear choice that includes
  "Machines and cables only" alongside "Full gym", "Dumbbells only", "Home
  / minimal", "Bodyweight". This maps to the existing
  `equipment_profiles` values, so no new plumbing, just a clearer UI and
  copy that frames machine-only as a complete programme, not a fallback.
- **How it differs:** with the expanded plate-loaded/machine library and
  the `machine_ok` flag, the generated machine-only plan now covers every
  muscle and subregion (per `05`). The construction rules are identical
  (10-20 sets/muscle/week, ~2x frequency, near-failure, double
  progression, subregion coverage); only the equipment pool changes. The
  research backs this as equally effective for hypertrophy (`02b` 6).
- **Differentiation in-app:** label the plan's equipment context on the
  plan card ("Machines and cables") so it's clear, but do not present it
  as lesser.

## 4. Sequencing

Add session-level ordering on top of the current within-muscle ordering
(gap C5):

- **Compound before isolation across the whole session**, not just within
  a muscle. Order by (`compound` first) then (`fatigue_cost` descending),
  so high-skill, high-fatigue compounds land while fresh.
- **High-SFR machine/isolation work later**, which falls out of the same
  ordering.
- **Antagonist superset suggestions:** where the time budget is tight,
  pair movements with opposite `force` (push/pull) that don't share
  `fatigue_cost` >= ~4, extending the existing superset assignment. Keep
  supersets away from the heaviest compounds.
- **Lagging-muscle priority:** when a weak-point phase is set, move that
  muscle's work earlier (order doesn't cost hypertrophy, `02b` 4).

## 5. Weekly volume distribution

This is the existing strength of the engine; keep the MEV-to-MRV landmark
model. The only change is that volume is now distributed **across
subregions within a muscle**, not just across muscles: when a muscle's
weekly sets are split, allocate them to cover its required subregions
first (section 1), then add the remainder to the highest-SFR option.

## 6. Library routine fixes (`seedRoutines.js`)

- **Resolve all broken names:** every exercise named in a routine must
  exist in `RAW` after the `05` additions (the `HS Plate-Loaded ...`
  names are the current breakers).
- **Tag each routine with the subregions it covers** and add a test that
  each routine actually trains both required subregions of its headline
  muscle. Specifics:
  - *Back Width & Thickness Specialisation:* verify it includes both a
    vertical pull (width) and a horizontal row (thickness) each week, and
    a rear-delt/upper-back movement.
  - *Chest & Shoulder Specialisation:* verify incline + flat + a lower or
    fly movement for chest, and all three delt heads.
  - *Leg Development Priority:* verify squat-pattern + leg extension
    (rectus) + both hamstring patterns + calves (gastro and soleus).
- **Add a first-class machine-only routine** (or mark which existing
  routines are machine-only viable) so the library has a named
  machine-only option, mirroring the generated pathway.

## 7. Swap engine (`swapEngine.js`)

Add `subregion` to the swap score (gap C6) so a suggested swap defaults to
the same subregion and equipment category, preserving the balance the plan
was built for. Keep cross-subregion swaps available but rank them below
same-subregion ones.

## Sequencing of the implementation work

1. Validation test (names resolve) + schema columns (`04`).
2. Library additions + corrections + subregion backfill (`05`).
3. Generate planEngine pool from the library (section 0).
4. Subregion requirements + goal bias + sequencing (sections 1, 2, 4).
5. Machine-only pathway UI + routine fixes (sections 3, 6).
6. Swap engine subregion (section 7).

Each step is independently testable and shippable.
