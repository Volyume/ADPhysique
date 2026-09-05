/**
 * sandbag.js — exercise-library-expansion-2026-09-05, integration stage 2.
 * New family (lead-overrides.json `newFamilies`): a small attested set of
 * shifting-load bear-hug/Zercher/shouldering movements, common home and
 * garage equipment. Cap 12 (lead ruling); 8 entries shipped here, matching
 * the lead's own named examples exactly rather than inventing extra rows
 * to fill the cap — quality over count (EL-3).
 *
 * Conventions: alphabetical within each movement section; pure object
 * literals, no imports except from ./vocab.js; cue is '' until a later
 * agent authors it (EL-17). Every carry row here carries `exerciseType:
 * 'duration'` per EL-22 (carries log as time under load, never reps).
 *
 * Sources policy: sandbag training is documented strongman/functional-
 * fitness practice (Josh Henkin's DVRT system; Dan John's sandbag
 * programming); every movement here is a standard, widely-taught pattern
 * in that literature, not an invented drill.
 */

export default [
  {
    name: "Sandbag Bear-Hug Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes","back"],
    equipment: "sandbag",
    movementPattern: "squat",
    compound: true,
    repMin: 8, repMax: 15,
    fatigueCost: 3, sfr: 4,
    subregion: "squat_press",
    loadCharacter: "grind",
    cue: "",
  },
  {
    name: "Sandbag Bent-Over Row",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps","forearms"],
    equipment: "sandbag",
    movementPattern: "pull",
    compound: true,
    repMin: 8, repMax: 12,
    fatigueCost: 3, sfr: 4,
    subregion: "horizontal_lat",
    loadCharacter: "grind",
    overrides: { demands: { axialLoad: true } },
    cue: "",
  },
  {
    name: "Sandbag Clean",
    primaryMuscle: "back",
    secondaryMuscles: ["hamstrings","glutes","biceps"],
    equipment: "sandbag",
    movementPattern: "power",
    compound: true,
    repMin: 5, repMax: 8,
    fatigueCost: 4, sfr: 3,
    subregion: "spinal_erector",
    loadCharacter: "ballistic",
    overrides: { difficulty: 3, demands: { overheadPosition: false } },
    cue: "",
  },
  {
    name: "Sandbag Front Carry",
    primaryMuscle: "abs",
    secondaryMuscles: ["back","forearms"],
    equipment: "sandbag",
    movementPattern: "carry",
    compound: true,
    repMin: 20, repMax: 40,
    fatigueCost: 2, sfr: 4,
    subregion: "anti_extension",
    loadCharacter: "grind",
    overrides: { exerciseType: "duration" },
    cue: "",
  },
  {
    name: "Sandbag Get-Up",
    primaryMuscle: "abs",
    secondaryMuscles: ["quads","glutes","back"],
    equipment: "sandbag",
    movementPattern: "core",
    compound: true,
    repMin: 5, repMax: 8,
    fatigueCost: 4, sfr: 3,
    subregion: "anti_extension",
    loadCharacter: "grind",
    overrides: {
      laterality: "alternating", difficulty: 3,
      demands: { position: "mixed", floorAccess: true, overheadPosition: false, axialLoad: false, balanceDemand: "high" },
    },
    cue: "",
  },
  {
    name: "Sandbag Lunge (Bear Hug)",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes","abs"],
    equipment: "sandbag",
    movementPattern: "lunge",
    compound: true,
    repMin: 8, repMax: 12,
    fatigueCost: 3, sfr: 4,
    subregion: "squat_press",
    loadCharacter: "grind",
    overrides: { laterality: "alternating" },
    cue: "",
  },
  {
    name: "Sandbag Shouldering",
    primaryMuscle: "back",
    secondaryMuscles: ["glutes","quads","biceps"],
    equipment: "sandbag",
    movementPattern: "power",
    compound: true,
    repMin: 5, repMax: 10,
    fatigueCost: 4, sfr: 3,
    subregion: "spinal_erector",
    loadCharacter: "ballistic",
    overrides: {
      laterality: "alternating", difficulty: 3,
      demands: { position: "standing", floorAccess: false, overheadPosition: false, axialLoad: true, balanceDemand: "stable" },
    },
    cue: "",
  },
  {
    name: "Sandbag Zercher Carry",
    primaryMuscle: "abs",
    secondaryMuscles: ["back","biceps"],
    equipment: "sandbag",
    movementPattern: "carry",
    compound: true,
    repMin: 20, repMax: 40,
    fatigueCost: 3, sfr: 4,
    subregion: "anti_extension",
    loadCharacter: "grind",
    overrides: { exerciseType: "duration" },
    cue: "",
  },
];
