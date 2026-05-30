# 05 — Exercise library build proposal

The exercises to add, by muscle and subregion, with equipment category and
machine type. Tags: **[MO]** = essential for the machine-only pathway,
**[PL]** = plate-loaded/iso-lateral. Names are checked against the current
`RAW` so these are genuine additions, not duplicates. Existing coverage is
kept; this lists the fill-ins plus the new equipment classes.

This is a build of roughly 90 to 120 additions, taking the library from
~445 to ~540 to 565, inside the 400 to 600 target from `02a`. Final count
settles during implementation.

## New equipment classes to introduce

- `machine_plate_loaded` (Hammer Strength / iso-lateral)
- `landmine` (reclassify existing landmine moves, add new)
- `band` (reclassify existing band moves so the existing Bands filter
  works)
- `machine_selectorised` vs `cable` kept distinct from generic `machine`

## Chest

- Incline Machine Press already exists; add **Plate-Loaded Incline Press [PL][MO]**,
  **Plate-Loaded Chest Press (flat) [PL][MO]**, **Plate-Loaded Decline Press [PL][MO]**.
- **Decline Machine Press [MO]** (lower), **Assisted Chest Dip Machine [MO]** (lower).
- **Iso-Lateral Chest Press (seated) [PL][MO]**.
- Inner: tag existing cable crossovers `chest/inner`; add **Cable Crossover (full adduction) [MO]** if not distinct.
- Coverage check: upper (incline barbell/db/machine/PL + low-high cable
  fly), mid (flat barbell/db/machine/PL + pec deck), lower (decline
  barbell/db/machine/PL + dips + high-low fly), inner (crossover). Complete.

## Back

- Vertical pull / lat width: add **Plate-Loaded Lat Pulldown [PL][MO]**
  (this is the name a routine already references and the library lacks),
  **Iso-Lateral Front Pulldown [PL][MO]**.
- Horizontal row / mid-back thickness: **Plate-Loaded Row (iso-lateral) [PL][MO]**,
  **Plate-Loaded High Row [PL][MO]**, **Plate-Loaded Low Row [PL][MO]**,
  **Seated Machine Row (Wide) [MO]** (verify), **Chest-Supported Machine Row (Neutral) [MO]**,
  **Wide-Grip Seated Cable Row [MO]**.
- Lower back: **45-degree Back Extension (machine/bench) [MO]** (also the
  machine-only hamstring hinge), confirm tagged `back/lower_back` with a
  hamstring secondary.
- Traps: **Shrug Machine [MO]**, cable shrug (verify).

## Shoulders

- Anterior: **Plate-Loaded Shoulder Press [PL][MO]**, **Selectorised Shoulder Press [MO]** (verify).
- Lateral: **Lateral Raise Machine [MO]**, **Cable Y-Raise**, confirm cable lateral raise exists.
- Posterior: **Reverse Pec Deck Machine [MO]**, **Plate-Loaded Rear Delt [PL][MO]**, cable rear-delt fly variants.

## Biceps

- Long head: **Cable Curl (elbow behind torso)**, confirm incline dumbbell curl tagged `long_head`.
- Short head: **Preacher Curl Machine [MO]**, **Plate-Loaded Preacher [PL][MO]**, confirm spider/concentration curls exist and tagged `short_head`.
- Brachialis: confirm hammer/reverse curls tagged `brachialis`.
- Mostly a tagging job plus the preacher machine.

## Triceps (highest-yield subregion fix)

- Long head: **Overhead Cable Rope Extension [MO]**, **Overhead Dumbbell Extension**,
  **Plate-Loaded Overhead/Seated Dip Machine [PL][MO]** — the long-head gap is the single most evidence-backed addition (Maeo, `02b`).
- Lateral head: confirm rope/bar pushdowns exist and tagged `lateral_head`; add **Triceps Extension Machine [MO]**.
- Medial: covered incidentally; no dedicated add needed.

## Quads

- Sweep / overall: **Hack Squat (plate-loaded) [PL][MO]**, **Pendulum Squat [MO]**,
  **Horizontal Leg Press (selectorised) [MO]** (confirm 45-degree leg press exists).
- Rectus femoris: confirm **Leg Extension** tagged `rectus`.
- VMO: tag full-ROM leg extension / sissy squat `vmo`.

## Hamstrings

- Knee flexion: **Seated Leg Curl [MO]**, **Lying Leg Curl [MO]**, **Standing Single-Leg Curl [MO]** as distinct entries (machine-only needs all three available).
- Hip hinge: the 45-degree back extension above doubles here; confirm RDL/stiff-leg tagged `hip_hinge`.

## Glutes

- Max: **Hip Thrust Machine (plate-loaded) [PL][MO]**, **Glute Kickback Machine [MO]**, confirm cable kickback exists.
- Medius: **Hip Abduction Machine [MO]**, **Cable Standing Abduction**, tag `glutes/medius`.
- Adductors (inner thigh): **Hip Adduction Machine [MO]** (new muscle target use; tag under quads/adductors or a dedicated tag, decide in implementation).

## Calves

- Gastro: confirm **Standing Calf Raise Machine [MO]** and **Leg-Press Calf Raise [MO]** exist and tagged `gastro`.
- Soleus: confirm **Seated Calf Raise Machine [MO]** tagged `soleus`.

## Core, forearms, neck

- **Ab Crunch Machine [MO]** (`flexion`), **Cable Crunch [MO]** (confirm),
  Pallof/cable rotation exist.
- Forearms: confirm wrist curl / reverse wrist curl tagged `flexors`/`extensors`.
- Neck: keep band entries; flag the dedicated neck machine as a known thin
  spot, optional **Neck Machine (Four-Way) [MO]** if we want full machine
  coverage.

## Machine-type inventory coverage check

After the additions, every machine in the `02a` section 4 commercial-gym
inventory maps to at least one library exercise with a `machine_type`:

chest_press, incline_press, decline_press, pec_deck; lat_pulldown,
assisted_pullup, seated_row, chest_supported_row, high_row, low_row,
straight_arm_pulldown, back_extension, shrug_machine; shoulder_press,
lateral_raise, reverse_pec_deck; preacher_curl, bicep_curl_machine,
triceps_extension, triceps_pushdown, assisted_dip; leg_press, hack_squat,
pendulum_squat, leg_extension, lying/seated/standing leg_curl, hip_thrust,
glute_kickback, hip_abduction, hip_adduction, calf_raise_standing,
calf_raise_seated; ab_crunch, cable_column, roman_chair, (neck_machine
optional).

Verdict: with these additions the machine-only pathway has complete
coverage across every muscle and subregion (the only optional gap is the
neck machine).

## Corrections to existing exercises

- **Reclassify landmine moves** (`Landmine Press`, `Landmine Row`,
  `Meadows Row`, `Landmine Press (Abs)`) from `barbell` to `landmine`.
- **Reclassify band moves** currently tagged `bodyweight` to `band` so the
  Bands filter works.
- **Split the generic `machine` bucket** into `machine_selectorised` vs
  `machine_plate_loaded` and add `machine_type` to each (e.g. `Pec Deck`
  -> selectorised + `pec_deck`; `Hammer Strength Chest Press` ->
  plate_loaded + `chest_press`).
- **Backfill `subregion`** on every exercise that has null, using table B
  in `04`. This is the bulk of the correction work.
- **Verify routine references resolve:** every name used in
  `seedRoutines.js` must exist in `RAW` after the additions (the
  `HS Plate-Loaded ...` names are the known breakers).

## Open items for the build

- Whether to add `adductors` as a distinct muscle key or tag adduction
  under quads/glutes (affects volume accounting).
- Whether the neck machine is worth a single entry or left to band/harness
  only.
- Exact `fatigue_cost`/`sfr` values for new plate-loaded entries (defaults:
  plate-loaded compounds fatigue 3 to 4, SFR 4 to 5; machine isolations
  fatigue 2, SFR 5).
