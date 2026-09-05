# Inventory agent brief (shared by every family inventory agent)

Authority: founder brief 2026-09-05 Parts II, IV, V, XXVI; lead rulings
`05-DECISIONS.md` EL-2 (identity), EL-3 (quality gate), EL-4 (families),
EL-5 (tiers), EL-6 (demands). Read those sections before starting.

## What you produce
One JSON file per family at
`docs/exercise-library-expansion-2026-09-05/data/inventory-<family>.json`
with this exact shape:

```json
{
  "family": "kettlebell",
  "generatedAt": "2026-09-05",
  "existingRowsConsidered": 6,
  "candidates": [ { ...candidate } ],
  "rejected": [ { "name": "...", "reason": "duplicate of 'X' | not distinct under EL-2 | cardio | not representable | unattested" } ]
}
```

Candidate object (every key present; use null where not applicable):
```json
{
  "name": "Kettlebell Swing (Single-Arm)",
  "primaryMuscle": "glutes",
  "secondaryMuscles": ["hamstrings", "back"],
  "equipment": "kettlebell",
  "movementPattern": "hinge",
  "isCompound": true,
  "repMin": 10, "repMax": 20,
  "fatigueCost": 3, "sfr": 3,
  "subregion": "hip_extension",
  "aliases": ["One-Arm Kettlebell Swing", "Single Arm KB Swing"],
  "tier": "never_auto",
  "laterality": "unilateral",
  "loadCharacter": "ballistic",
  "difficulty": 2,
  "distinctFrom": { "existing": "Kettlebell Swing", "why": "unilateral loading, anti-rotation demand" },
  "sources": ["https://..."],
  "demandOverrides": { "position": "standing", "floorAccess": false, "overheadPosition": false, "gripDemand": "bar", "unilateralLoadable": true, "bilateralUpper": false, "bilateralLower": true, "axialLoad": true, "impact": false, "balanceDemand": "stable" },
  "derivedNullAxes": ["gripDemand"],
  "notes": "short, factual"
}
```

## Vocabularies (closed; use exactly these)
- primaryMuscle / secondaryMuscles: chest, back, hamstrings, front_delts,
  side_delts, rear_delts, biceps, triceps, quads, glutes, calves,
  tibialis, abs, traps, forearms, neck, adductors.
- equipment: barbell, dumbbell, cable, machine, bodyweight, smith_machine,
  ez_bar, kettlebell, band, suspension, landmine, medicine_ball, sled.
  (band / suspension / landmine / medicine_ball / sled are new coarse
  values this campaign introduces; use them.)
- movementPattern: push, pull, hinge, squat, lunge, isolation, carry,
  core, plyometric, power.
- subregion: read the distinct values per primaryMuscle from the current
  seed (`scripts/exercise-library/loadSeed.mjs` -> loadSeedRows(), field
  `subregion`) and reuse those; if a genuinely new subregion is required,
  put it in `notes` and leave subregion null, never invent silently.
- tier: staple | common | specialist | niche | never_auto (EL-5: when in
  doubt, the safer tier; ballistics, Olympic-derived, plyometric,
  strongman implements and carries are never_auto).
- laterality: bilateral | unilateral | alternating.
- loadCharacter: grind | ballistic.
- difficulty: 1 (beginner-safe) | 2 | 3 (advanced only).
- demand axes (EL-6): position standing|seated|lying|kneeling|mixed;
  floorAccess, overheadPosition, unilateralLoadable, bilateralUpper,
  bilateralLower, axialLoad, impact: true|false; gripDemand
  none|supportive|bar; balanceDemand supported|stable|high.

## Method
1. Load the current corpus with `loadSeedRows()` and read every existing
   row in your family (name match on equipment and name words). Never
   propose an existing name or a spelling/word-order variant of one; if a
   common alternative name for an EXISTING row is missing, put it in the
   file's top-level `aliasesForExisting: [{ "existing": "...", "aliases": [...] }]`.
2. Build the family by taxonomy (implement x movement x position x
   laterality x grip x range), not by scraping a list. Use open datasets
   only as checklists (free-exercise-db, public-domain; the MIT
   exercises-dataset names; wger names as a checklist only). Do not copy
   any description text from anywhere.
3. For every candidate run the app's pure derivation on the tuple
   (import `src/lib/exerciseMetadata.js` deriveExerciseMetadata and
   `src/lib/capability/demands.js` deriveDemandMetadata the way
   loadSeed.mjs does) and record which demand axes come back null in
   `derivedNullAxes`; fill `demandOverrides` for those axes only where
   you are confident, with mechanical reasoning in `notes`. Never write a
   diagnosis word (safe, arthritis, rehab, injury) anywhere.
4. Apply EL-2 strictly. Every candidate names what it is distinct FROM
   (an existing row or another candidate) and why, or `distinctFrom`
   null with a note that it is a new movement family.
5. rep/set defaults: match the corpus conventions for the character
   (ballistic 10 to 20, heavy compound 4 to 8, isolation 10 to 20,
   carries use time or distance semantics: note them as `exerciseType`
   in notes if not weight_reps).
6. Stay inside the family cap in EL-4. Quality over count: a candidate
   that a good coach would not write down for anyone goes to `rejected`.

## Hard bounds
Write only your inventory JSON (and nothing under src/). Do not commit,
push, stash or touch main. Do not run the test suite. STOP and report
rather than interpret if the vocabularies above do not fit a movement.

## Final report (cap 40 lines)
Counts (candidates, rejected, aliasesForExisting); the tier distribution;
the demand axes most often null and why; the 10 candidates you are least
sure about with the reason; any vocabulary gap you hit.
