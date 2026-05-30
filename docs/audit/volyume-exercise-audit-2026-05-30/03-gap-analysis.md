# 03 — Gap analysis

Gaps are measured against the research in `02a`/`02b` and the internal
state in `01`. Three sections: library, metadata, plan construction.

## A. Exercise library gaps

### A1. Equipment classes that are missing or wrong

- **Plate-loaded / iso-lateral has no class.** The single biggest gap for
  a commercial-gym user. Hammer Strength chest press, incline press,
  decline press, iso-lateral row, high row, low row, iso pulldown, iso
  shoulder press, plus plate-loaded leg press, hack squat, pendulum
  squat, hip thrust, and calf machines. Some are referenced by routines
  (`HS Plate-Loaded Lat Pulldown` in `seedRoutines.js`) but **do not
  exist in `RAW`**, so those routine rows fail to resolve.
- **Landmine mis-tagged as barbell.** `Landmine Press`, `Landmine Row`,
  `Meadows Row`, `Landmine Press (Abs)` should be their own apparatus.
- **Band class absent from data** while the browse screen offers a "Bands"
  filter that returns nothing.
- **`machine` (58 entries) is undifferentiated** with no machine-type, so
  a machine-only programme cannot reason about which machine.

### A2. Subregion coverage gaps (named exercises to add)

Measured against `02a` section 3. By muscle:

- **Chest, lower** is thin (only dips and a couple of declines). Add:
  decline machine press, decline dumbbell press (exists), high-to-low
  cable fly (exists), plate-loaded decline press, assisted/weighted chest
  dip on machine.
- **Chest, inner/outer** has cable crossovers but no clear "full
  adduction" inner entry tagged as such.
- **Back, upper-back/mid-trap** is folded entirely into
  `horizontal_row`; no distinct rhomboid/mid-trap target beyond face
  pulls. Add: chest-supported high row, plate-loaded high row, wide-grip
  seated row, cable rear-delt row.
- **Shoulders, lateral and rear** are under-stocked relative to the
  pressing options. Add: lateral raise machine, cable Y-raise,
  plate-loaded reverse pec deck, cable rear-delt fly variants.
- **Biceps**: long/short/brachialis split is mostly there in names but
  **not tagged** with subregion in the DB. Add preacher machine, spider
  curl (exists in planEngine pool, check library), cable curl with elbow
  back (long head).
- **Triceps long head** is under-served. Add: overhead cable rope
  extension (machine/cable), overhead dumbbell extension, plate-loaded
  overhead/dip machine. This is the highest-yield single gap per the Maeo
  evidence.
- **Quads, rectus femoris** relies on leg extension; fine, but add hack
  squat / pendulum squat as plate-loaded for the sweep, and confirm leg
  extension is tagged `rectus`.
- **Hamstrings** has both hinge and curl but the machine-only path needs
  seated AND lying AND standing leg curl as distinct entries, plus a
  machine hip-hinge (45-degree back extension) tagged for the hinge bias.
- **Glutes, medius/minimus** needs the hip abduction machine and cable
  standing abduction as distinct `glute_med` entries.
- **Calves** has standing/seated; confirm leg-press calf raise exists and
  is `gastro`.
- **Neck** has band entries but no machine; acceptable, flag as known thin
  spot.

### A3. Machine-only completeness

Against the `02a` section 4 commercial-gym inventory, the library is
missing dedicated entries (with machine-type metadata) for at least:
incline/decline chest press machines, iso-lateral chest press, high row
machine, low row machine, iso-lateral row, lateral raise machine, rear
delt/reverse pec deck machine, plate-loaded shoulder press, pendulum
squat, hip thrust machine, glute kickback machine, hip abduction and
adduction machines, standing single-leg curl, assisted dip machine, and a
preacher curl machine. Until these exist with machine-type tags, a
machine-only programme cannot be guaranteed complete.

### A4. Exercises present but with wrong/insufficient metadata

- Landmine movements tagged `barbell` (A1).
- `subregion` null for the majority of the library (most arms, quads,
  glutes, forearms, neck).
- No laterality, difficulty, machine-type, cue, or alternatives on any
  record.

## B. Metadata gaps

Required for intelligent construction, currently missing from the
`exercises` table (`01` section 1.3):

- **Anatomical subregion**, unified and populated for every exercise
  (currently sparse and split across two non-aligned taxonomies).
- **Equipment category + machine type** (currently one coarse `equipment`
  string).
- **Laterality** (unilateral/bilateral) — absent.
- **Difficulty level** — absent.
- **Suitable for machine-only** — absent (currently inferred only inside
  planEngine's `eq` arrays, not on the exercise record).
- **Suitable for home/no-equipment** — absent.
- **Coaching cue** — `notes` column exists but unused for canonical
  exercises.
- **Alternatives within the same subregion/equipment** — absent (swap
  engine computes this at runtime but it isn't stored, and it ignores
  subregion).
- **Movement pattern** exists but is coarse (`push/pull/hinge/...`) and
  not always aligned to the horizontal/vertical split the research uses.

## C. Plan construction gaps

- **C1. Two drifting datasets.** planEngine builds from its own hardcoded
  `POOL`, not the library; `planAutoGen` silently drops any exercise whose
  name doesn't match the library (`planAutoGen.js` 149-152). This is the
  root fragility and must be fixed before the library expansion is safe,
  or new exercises won't reach generated plans and routine references will
  keep breaking.
- **C2. Goal does not shape exercise choice.** Volume and rep range change
  by goal/phase, but a hypertrophy user and a strength user draw the same
  exercises from the same pool (`01` 2.4). Research says they should
  diverge: machines/cables and subregion spread for hypertrophy, compound
  barbell specificity for strength.
- **C3. Subregion balance is enforced for only a few muscles** and only
  inside the planEngine pool (`SUBREGION_REQUIREMENTS`, `01` 2.2). Chest
  requires only incline+flat (no lower), triceps requires nothing,
  shoulders requires nothing across the three heads, biceps nothing,
  quads nothing for rectus vs sweep, glutes nothing for medius.
- **C4. Equipment is one blunt profile**, and the machine-only path is a
  hidden `machines_cables` value resting on thin machine coverage, not a
  first-class, named pathway (`01` 2.3, 5).
- **C5. Sequencing is minimal**: compound-before-isolation only within a
  muscle's own list, no antagonist pairing, no session-level fatigue
  ordering (`01` 2.5).
- **C6. Swapping ignores subregion** and can silently undo programmed
  balance (`01` 2.7).
- **C7. Library routines are hardcoded, name-referenced, untagged for
  coverage, and some reference non-existent exercises** (`01` 3). No
  machine-only routine exists as a named library option. Specific
  examples to fix: any routine referencing `HS Plate-Loaded ...` names
  that aren't in `RAW`; the specialisation routines (Back Width &
  Thickness, Chest & Shoulder, Leg Priority) are not verified to cover
  both required subregions of their target.

## Severity ordering (what to fix first)

1. **C1 (two datasets)** — everything else is unsafe until the library is
   the single source of truth, or at least until the pool is generated
   from the library and validated so names cannot drift.
2. **B (metadata schema)** — the new fields are the prerequisite for
   subregion-aware, equipment-aware, goal-aware selection.
3. **A1/A3 (equipment classes + machine inventory)** — unlocks the
   machine-only pathway and fixes the broken routine references.
4. **A2 (subregion coverage)** — fills the muscle gaps.
5. **C2 to C7 (selection, sequencing, machine-only pathway, routines)** —
   the programming improvements that the data now supports.
