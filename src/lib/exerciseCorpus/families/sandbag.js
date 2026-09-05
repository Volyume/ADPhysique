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
    setup: "Hug the sandbag tightly against your chest with both arms wrapped around it.",
    execution: "Sit your hips back and down into a squat, chest tall, then drive back up.",
    watch: "Letting the bag slide down your chest pulls you forward, so squeeze it tight and keep your chest up.",
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
    setup: "Hinge forward with a flat back, gripping the sandbag handles or the bag itself in front of your shins.",
    execution: "Pull the bag up towards your torso, then lower under control.",
    watch: "Rounding your back to reach the bag takes the pull off your lats, so hinge and keep your back flat.",
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
    setup: "Stand over the sandbag, feet shoulder-width apart, hips hinged, gripping the bag.",
    execution: "Pull it up explosively and catch it against your chest or shoulders, absorbing the weight with bent knees.",
    watch: "Catching the bag with straight legs jars the landing, so meet it with your knees bent.",
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
    setup: "Hug the sandbag against your chest with both arms wrapped around it, shoulders pulled back and down.",
    execution: "Walk forward with even steps, keeping your torso upright.",
    watch: "Letting the bag pull your shoulders forward rounds your upper back, so keep it high on your chest.",
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
    setup: "Lie on your back with the sandbag held against your chest.",
    execution: "Roll to one side and use that arm to push yourself up through kneeling to standing, keeping the bag close throughout.",
    watch: "Letting the bag swing away makes the transitions harder.",
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
    setup: "Hug the sandbag tightly against your chest and stand tall with your feet under your hips.",
    execution: "Step forward into a lunge, bending both knees until your back knee nears the floor, then push back to standing.",
    watch: "Letting the bag pull your torso forward tips your weight onto the front foot, so stay tall.",
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
    setup: "Stand over the sandbag, feet shoulder-width apart, hips hinged.",
    execution: "Pull it up explosively and rotate it onto one shoulder in one motion, catching it with bent knees to absorb the weight.",
    watch: "Twisting only with your arms to get it up leaves the legs out, so drive with your hips.",
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
    setup: "Cradle the sandbag in the crooks of your elbows, hands together at your chest.",
    execution: "Walk forward with even steps, keeping your torso upright and the bag pulled in close.",
    watch: "Letting the bag ride low pulls your shoulders down, so pull it back into your elbow crooks.",
  },
];
