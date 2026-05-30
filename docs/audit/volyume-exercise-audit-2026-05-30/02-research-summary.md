# 02 — Research summary

This ties together the two detailed research reports in this folder:
`02a-research-library-standards.md` (what a complete library looks like)
and `02b-research-plan-construction.md` (how good plans are built). Full
citations live in those two files; this is the synthesis that the gap
analysis and proposals build on.

## What a complete hypertrophy library looks like

- **Size is a by-product of structure, not a target.** Hevy ships ~400
  native exercises, Strong a similar set, ExRx 2,100+. The thing that
  makes any of them usable is a two-axis filter (muscle x equipment),
  clean per-exercise attributes, and a region to muscle to subregion
  hierarchy. A practical target for Volyume is **400 to 600 well-tagged
  native movements** plus custom, covering every subregion across every
  common equipment type. Volyume already has ~445, so the job is mostly
  coverage and metadata, not bulk.
- **Two taxonomies, both needed.** ExRx's attribute model (utility,
  mechanics, force, laterality, muscle group, apparatus) for tagging, and
  the movement-pattern model (squat, hinge, lunge, horizontal/vertical
  push, horizontal/vertical pull, carry, rotation) for balance. Volyume
  has `movement_pattern` and `compound_isolation` but is missing
  laterality and force, and its equipment axis is too coarse.
- **Equipment must be granular.** Selectorised, plate-loaded/iso-lateral,
  Smith, and cable load the same movement differently (resistance curve,
  stabiliser demand, unilateral capability), so they belong as separate
  tags, not one "machine" bucket.
- **Subregion targeting is real and the design rule is "one biased
  exercise per subregion".** The regional differences are modest but
  consistent, so the library must guarantee at least one biased movement
  per subregion per common equipment type, without over-fragmenting.
- **A machine-only programme is viable across every muscle and
  subregion** in a typical commercial gym. The only thin-gym gaps are the
  hip-hinge hamstring stimulus (needs a back-extension bench or RDL) and a
  dedicated neck machine.

## What a well-constructed plan requires

- **Volume is the driver:** 10 to 20 sets per muscle per week, roughly
  12 to 20 the sweet spot, framed by RP's MEV to MAV to MRV landmarks.
  Volyume already implements MEV/MRV landmarks in planEngine, which is a
  genuine strength.
- **Frequency is delivery, not magic:** with volume equated, ~2x/week per
  muscle is the practical way to fit the sets in. Volyume's splits already
  do this.
- **Rep range is flexible (about 5 to 30), proximity to failure matters
  (RIR 0 to 3), double progression is the workhorse.**
- **Selection should change by goal, and currently doesn't in Volyume.**
  Hypertrophy biases machines/cables for stimulus-to-fatigue and covers
  subregions; strength biases compound barbell lifts for specificity;
  general fitness biases compound-led, time-efficient movements. Volyume
  changes volume and rep range by goal but pulls from the same pool with
  the same logic regardless.
- **Subregion balance across the week is the core quality marker:**
  incline + flat + decline for chest, vertical pull + horizontal row +
  hinge + rear delt for back, all three delt heads, long-head-biased
  triceps work (the Maeo overhead study: 19.9% vs 13.5% growth),
  hip-hinge AND knee-flexion for hamstrings. Volyume enforces some of this
  (`SUBREGION_REQUIREMENTS`) but only for a handful of muscles and only
  inside the planEngine pool.
- **Sequencing:** compound before isolation (sound default, flexible for
  hypertrophy), antagonist supersets to save time when the pair doesn't
  share fatigue, high-fatigue compounds early and high-SFR machine work
  later.
- **The best apps share four traits:** an explicit volume model
  (MEV to MRV), autoregulation from real feedback, stable core exercises
  with deliberate rotation between blocks, and a clear progression rule.
  Volyume has the volume model and a weekly autoregulator already; it
  lacks exercise rotation and goal-aware selection.

## The single most useful implication

Volyume is closer than the brief's framing implies on the *programming*
side (it has volume landmarks, subregion requirements, a weekly
autoregulator). The real weaknesses are all on the **exercise data and the
selection layer**: a fragmented equipment taxonomy, sparse subregion
metadata, two drifting exercise datasets, goal-blind selection, and a
machine-only path that is hidden and thinly stocked. Fixing the data and
unifying the two systems unlocks most of the quality gain.
