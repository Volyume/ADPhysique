# 00 — Executive summary

Deep audit of Volyume's exercise library and plan construction, with
proposals. Read this first; the numbered files hold the detail and
citations.

## The state of things

Volyume's **programming engine is better than expected**. It already runs
an MEV-to-MRV volume-landmark model, enforces some weekly subregion
balance, and has a weekly autoregulator that adjusts volume from check-in
feedback. Those are the things the best apps (RP, Dr. Muscle) are known
for, and Volyume has the bones of them.

The weakness is **everything around the exercises**: the data, the
taxonomy, and the selection layer. Five findings carry the whole audit:

1. **Two separate exercise datasets.** The library you browse
   (`seedExercises.js`, ~445 exercises) and a completely separate
   hardcoded `POOL` inside `planEngine.js` that the Coach actually builds
   from. They're bridged only by matching exercise *names*, and when a
   name doesn't match, `planAutoGen` silently drops the exercise. Some
   library routines reference exercises (`HS Plate-Loaded Lat Pulldown`)
   that aren't in the library at all. This is the root problem: adding
   exercises alone wouldn't reach generated plans.
2. **No plate-loaded, landmine, or band equipment class.** `machine` is
   one undifferentiated bucket of 58 with no record of which machine, so a
   machine-only plan can't reason about coverage. Plate-loaded
   (Hammer Strength) machines, the backbone of real gyms, are missing or
   hidden.
3. **Subregion data is sparse and split across two non-aligned
   taxonomies.** Whole muscles (most of arms, quads, glutes, forearms,
   neck) have no subregion tag, so the plan can train a primary mover and
   miss the rest of the muscle.
4. **Goal changes volume and rep range, not exercise choice.** A
   hypertrophy user and a strength user get the same exercises. Research
   says they should diverge.
5. **The machine-only path is a hidden equipment value resting on thin
   coverage, not a first-class pathway.** Swapping ignores subregion and
   can undo programmed balance.

## What the research says (full citations in 02a/02b)

- A complete hypertrophy library is **400 to 600 well-tagged movements**
  covering every subregion across every equipment type. Volyume's ~445 is
  the right scale; the gap is coverage and metadata, not bulk.
- **Subregion targeting is real but modest:** the rule is "one biased
  exercise per subregion", e.g. incline + flat + decline for chest,
  vertical pull + horizontal row for back, all three delt heads,
  long-head-biased triceps work (overhead extensions grew triceps 19.9%
  vs 13.5% for pushdowns), hip-hinge AND knee-flexion for hamstrings.
- **A machine-only programme is equally effective for hypertrophy** (the
  free-weight-vs-machine meta-analysis and a 2024 within-subject leg
  study), with real upside in safety, accessibility and
  stimulus-per-fatigue. It is a complete programme, not a lesser one.
- Equipment categories should keep **selectorised, plate-loaded, Smith and
  cable distinct**, because they load the same movement differently.

## What's proposed

- **04 schema:** add `subregion` (one unified taxonomy, populated for
  every exercise), `equipment_category` + `machine_type`,
  `equipment_profiles`, `force`, `laterality`, `difficulty`, `machine_ok`,
  `home_ok`, and a coaching `cue`. Additive columns; canonical exercises
  seed locally so no server migration for them.
- **05 library build:** ~90 to 120 additions taking the library to ~540 to
  565, introducing the plate-loaded/landmine/band classes, filling every
  subregion gap (the triceps long head is the highest-yield single fix),
  and giving every commercial-gym machine a tagged entry so the
  machine-only pathway has full coverage. Plus corrections: reclassify
  landmine and band moves, split the `machine` bucket, and backfill
  `subregion` everywhere.
- **06 plan construction:** make the library the single source of truth
  (generate the planEngine pool from it, killing the name-drift), extend
  subregion requirements to all major muscles, add goal-aware selection
  bias (machines/cables + subregion spread for hypertrophy, compound
  barbell for strength), add session-level sequencing, make machine-only a
  named first-class equipment choice, fix the broken/under-built library
  routines, and add subregion to the swap engine.

## Recommended sequence (each step shippable on its own)

1. CI validation that every pool/routine name resolves + the new schema
   columns.
2. Library additions, corrections, and subregion backfill.
3. Generate the planEngine pool from the library (removes the two-dataset
   fragility).
4. Subregion requirements + goal bias + sequencing.
5. Machine-only pathway UI + routine fixes.
6. Swap-engine subregion.

## Open questions (need your call before Phase 7)

1. **Scope and order.** Do you want the full build (schema + ~100
   exercises + all the plan-logic changes), or staged, starting with the
   foundation fix (one dataset + validation) and the equipment/plate-loaded
   additions, then the plan-logic changes in a second pass? The foundation
   fix is the highest-value and lowest-risk; the plan-logic changes touch
   the runtime-critical Coach and want their own careful pass with tests.
2. **planEngine pool: generate from the library, or keep separate but
   add a CI drift check?** Generating from the library is the right
   long-term fix but is a larger, runtime-critical change to the engine.
   The drift check is a small safety net we can ship immediately. I
   recommend the drift check now and the generation as a tracked follow-up,
   unless you want the full merge in this pass.
3. **Adductors:** add as a distinct muscle/target, or fold hip adduction
   under glutes/quads? Affects volume accounting.
4. **Neck machine:** worth one entry, or leave neck to band/harness only?
5. **Custom-exercise sync:** do the new metadata fields need to sync for
   custom exercises, or stay local (canonical exercises seed locally, so
   they don't need a server migration; custom ones might)? I'll confirm
   from the sync code during implementation, flagging here per the brief.
6. **Difficulty gating:** should generated plans actually hide
   advanced-difficulty lifts from beginners, or just label difficulty?

Nothing is implemented yet. Awaiting your confirmation on the above before
starting Phase 7.
