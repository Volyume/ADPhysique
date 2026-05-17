/**
 * planEngine.js
 * Deterministic hypertrophy plan generation engine for the Volyume app.
 * No side effects, no DB calls, no Math.random() — pure functions only.
 */

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

export const GOAL_LABELS = {
  general_hypertrophy:   'General Hypertrophy',
  balanced_bodybuilding: 'Balanced Bodybuilding',
  aesthetic_v_taper:     'Aesthetic / V-Taper',
  weak_point_spec:       'Weak Point Specialisation',
  strength_hypertrophy:  'Strength-Bias Hypertrophy',
  recomp:                'Fat Loss / Recomp Support',
};

export const SPLIT_LABELS = {
  full_body:       'Full Body',
  upper_lower:     'Upper / Lower',
  ppl:             'Push / Pull / Legs',
  ppl_ab:          'PPL A/B (6-day)',
  upper_lower_wp:  'Upper / Lower + Weak-Point Day',
};

// ---------------------------------------------------------------------------
// Volume tables — working sets per muscle per week
// ---------------------------------------------------------------------------

// Weekly working-set targets per muscle group.
// Values sit at MEV–MAV (not MRV) — programmes are meant to start here and
// progress upwards across a mesocycle, not begin at maximum recoverable volume.
const BASE_VOLUME = {
  beginner:     { min: 4,  max: 8  },  // MEV range — new trainees need less stimulus
  intermediate: { min: 8,  max: 12 },  // Low–mid MAV
  advanced:     { min: 10, max: 16 },  // Mid MAV
  competitive:  { min: 12, max: 18 },  // High MAV — approaching MRV
};

// Multipliers applied to base volume midpoint
const NUTRITION_VOLUME_MOD = {
  lean_gain:      1.10,
  build:          1.10,
  maintain:       1.00,
  recomp:         1.00,
  mild_cut:       0.85,
  aggressive_cut: 0.75,
};

// ---------------------------------------------------------------------------
// Rep / rest / RIR parameters by exercise type
// ---------------------------------------------------------------------------

const PARAMS = {
  // Standard compound (free-weight or heavy machine)
  compound: { repMin: 5,  repMax: 10, restSec: 150 },
  // Strength-hypertrophy bias: heavier on main compounds
  compound_strength: { repMin: 5, repMax: 8, restSec: 180 },
  // Machine / secondary compound
  machine:   { repMin: 8,  repMax: 12, restSec: 105 },
  // Pure isolation
  isolation: { repMin: 10, repMax: 20, restSec: 75  },
};

function baseRir(experience) {
  if (experience === 'beginner')     return 3;
  if (experience === 'intermediate') return 2;
  return 1; // advanced / competitive — occasionally push to true failure
}

// ---------------------------------------------------------------------------
// Exercise library (equipment-aware, canonical gym names)
// ---------------------------------------------------------------------------

// Structure: EXERCISES[muscle][category][equipment] = string[]
// category is 'compound' or 'isolation' (some muscles only have isolation)
// equipment keys match the `equipment` input values

const EXERCISES = {
  chest: {
    compound: {
      full_gym:        ['Barbell Bench Press', 'Incline Barbell Bench Press', 'Close-Grip Bench Press'],
      barbell_plates:  ['Barbell Bench Press', 'Incline Barbell Bench Press', 'Close-Grip Bench Press'],
      machines_cables: ['Machine Chest Press', 'Incline Machine Press', 'Smith Machine Bench Press'],
      dumbbells_only:  ['Dumbbell Bench Press', 'Incline Dumbbell Press', 'Dumbbell Bench Press'],
      home_gym:        ['Dumbbell Bench Press', 'Incline Dumbbell Press', 'Push-Up'],
      bodyweight:      ['Push-Up', 'Diamond Push-Up', 'Push-Up'],
    },
    isolation: {
      full_gym:        ['Cable Crossover (High to Low)', 'Pec Deck (Machine Fly)', 'Cable Fly (Low to High)'],
      barbell_plates:  ['Dumbbell Fly', 'Pec Deck (Machine Fly)'],
      machines_cables: ['Pec Deck (Machine Fly)', 'Cable Crossover (High to Low)', 'Cable Fly (Low to High)'],
      dumbbells_only:  ['Dumbbell Fly', 'Incline Dumbbell Fly'],
      home_gym:        ['Dumbbell Fly', 'Push-Up'],
      bodyweight:      ['Push-Up', 'Diamond Push-Up'],
    },
  },

  back: {
    compound: {
      full_gym:        ['Lat Pulldown (Wide Grip)', 'Seated Cable Row', 'Barbell Row (Bent Over)', 'Weighted Pull-Up'],
      barbell_plates:  ['Barbell Row (Bent Over)', 'Weighted Pull-Up', 'Pendlay Row'],
      machines_cables: ['Lat Pulldown (Wide Grip)', 'Seated Cable Row', 'Lat Pulldown (Close Grip)'],
      dumbbells_only:  ['Dumbbell Row', 'Dumbbell Pullover', 'Dumbbell Row'],
      home_gym:        ['Pull-Up', 'Inverted Row', 'Dumbbell Row'],
      bodyweight:      ['Pull-Up', 'Chin-Up', 'Inverted Row'],
    },
    isolation: {
      full_gym:        ['Cable Straight-Arm Pulldown', 'Face Pull', 'Machine Row (Chest Supported)'],
      barbell_plates:  ['Face Pull', 'Cable Straight-Arm Pulldown'],
      machines_cables: ['Cable Straight-Arm Pulldown', 'Face Pull', 'Cable Lat Pullover'],
      dumbbells_only:  ['Dumbbell Pullover', 'Dumbbell Shrug'],
      home_gym:        ['Dumbbell Pullover', 'Inverted Row'],
      bodyweight:      ['Pull-Up', 'Inverted Row'],
    },
  },

  shoulders: {
    compound: {
      full_gym:        ['Barbell Overhead Press', 'Barbell Overhead Press', 'Arnold Press'],
      barbell_plates:  ['Barbell Overhead Press', 'Barbell Overhead Press'],
      machines_cables: ['Machine Shoulder Press', 'Machine Shoulder Press'],
      dumbbells_only:  ['Dumbbell Shoulder Press', 'Arnold Press'],
      home_gym:        ['Dumbbell Shoulder Press', 'Arnold Press'],
      bodyweight:      ['Push-Up', 'Diamond Push-Up'],
    },
    isolation: {
      full_gym:        ['Dumbbell Lateral Raise', 'Face Pull', 'Cable Rear Delt Fly', 'Cable Lateral Raise'],
      barbell_plates:  ['Dumbbell Lateral Raise', 'Face Pull', 'Dumbbell Rear Delt Fly'],
      machines_cables: ['Cable Lateral Raise', 'Reverse Pec Deck', 'Face Pull'],
      dumbbells_only:  ['Dumbbell Lateral Raise', 'Dumbbell Rear Delt Fly', 'Dumbbell Front Raise'],
      home_gym:        ['Dumbbell Lateral Raise', 'Dumbbell Rear Delt Fly'],
      bodyweight:      ['Dumbbell Lateral Raise', 'Face Pull'],
    },
  },

  biceps: {
    isolation: {
      full_gym:        ['Barbell Curl', 'Incline Dumbbell Curl', 'Cable Curl', 'Hammer Curl'],
      barbell_plates:  ['Barbell Curl', 'EZ Bar Curl', 'Hammer Curl'],
      machines_cables: ['Cable Curl', 'Machine Curl', 'Cable Hammer Curl (Rope)'],
      dumbbells_only:  ['Dumbbell Curl', 'Hammer Curl', 'Incline Dumbbell Curl', 'Concentration Curl'],
      home_gym:        ['Dumbbell Curl', 'Hammer Curl', 'Chin-Up'],
      bodyweight:      ['Chin-Up', 'Chin-Up'],
    },
  },

  triceps: {
    isolation: {
      full_gym:        ['Cable Pushdown (Straight Bar)', 'Overhead Cable Tricep Extension', 'EZ Bar Skull Crusher', 'Close-Grip Bench Press'],
      barbell_plates:  ['EZ Bar Skull Crusher', 'Close-Grip Bench Press', 'Lying Tricep Extension'],
      machines_cables: ['Cable Pushdown (Straight Bar)', 'Overhead Cable Tricep Extension', 'Machine Tricep Extension'],
      dumbbells_only:  ['Overhead Dumbbell Extension', 'Tricep Kickback', 'Diamond Push-Up'],
      home_gym:        ['Overhead Dumbbell Extension', 'Diamond Push-Up', 'Bench Dip'],
      bodyweight:      ['Diamond Push-Up', 'Bench Dip', 'Diamond Push-Up'],
    },
  },

  quads: {
    compound: {
      full_gym:        ['Barbell Back Squat', 'Hack Squat Machine', 'Leg Press', 'Barbell Front Squat'],
      barbell_plates:  ['Barbell Back Squat', 'Barbell Front Squat', 'Bulgarian Split Squat'],
      machines_cables: ['Leg Press', 'Hack Squat Machine', 'Smith Machine Squat'],
      dumbbells_only:  ['Goblet Squat', 'Bulgarian Split Squat', 'Dumbbell Lunge'],
      home_gym:        ['Goblet Squat', 'Bulgarian Split Squat', 'Walking Lunge'],
      bodyweight:      ['Bulgarian Split Squat', 'Barbell Back Squat', 'Walking Lunge'],
    },
    isolation: {
      full_gym:        ['Leg Extension', 'Goblet Squat', 'Step-Up (Dumbbell)'],
      barbell_plates:  ['Leg Extension', 'Step-Up (Dumbbell)'],
      machines_cables: ['Leg Extension', 'Sissy Squat'],
      dumbbells_only:  ['Step-Up (Dumbbell)', 'Dumbbell Lunge'],
      home_gym:        ['Step-Up (Dumbbell)', 'Wall Sit'],
      bodyweight:      ['Sissy Squat', 'Step-Up (Dumbbell)'],
    },
  },

  hamstrings: {
    compound: {
      full_gym:        ['Romanian Deadlift (Barbell)', 'Stiff-Leg Deadlift', 'Good Morning'],
      barbell_plates:  ['Romanian Deadlift (Barbell)', 'Stiff-Leg Deadlift', 'Good Morning'],
      // For machines/cables use hip-hinge patterns first so compound ≠ isolation slot
      machines_cables: ['Romanian Deadlift (Barbell)', 'Stiff-Leg Deadlift', 'Seated Leg Curl'],
      dumbbells_only:  ['Romanian Deadlift (Dumbbell)', 'Single-Leg Romanian Deadlift'],
      home_gym:        ['Romanian Deadlift (Dumbbell)', 'Nordic Hamstring Curl'],
      bodyweight:      ['Nordic Hamstring Curl', 'Glute Bridge', 'Single-Leg Romanian Deadlift'],
    },
    isolation: {
      full_gym:        ['Lying Leg Curl', 'Seated Leg Curl', 'Nordic Hamstring Curl'],
      barbell_plates:  ['Lying Leg Curl', 'Nordic Hamstring Curl'],
      machines_cables: ['Lying Leg Curl', 'Seated Leg Curl', 'Lying Leg Curl'],
      dumbbells_only:  ['Lying Leg Curl', 'Single-Leg Romanian Deadlift'],
      home_gym:        ['Nordic Hamstring Curl', 'Lying Leg Curl'],
      bodyweight:      ['Nordic Hamstring Curl', 'Glute Bridge'],
    },
  },

  glutes: {
    compound: {
      full_gym:        ['Barbell Hip Thrust', 'Romanian Deadlift (Barbell)', 'Bulgarian Split Squat'],
      barbell_plates:  ['Barbell Hip Thrust', 'Romanian Deadlift (Barbell)', 'Sumo Deadlift'],
      machines_cables: ['Smith Machine Hip Thrust', 'Cable Kickback', 'Leg Press'],
      dumbbells_only:  ['Dumbbell Hip Thrust', 'Romanian Deadlift (Dumbbell)', 'Bulgarian Split Squat'],
      home_gym:        ['Glute Bridge', 'Bulgarian Split Squat', 'Romanian Deadlift (Dumbbell)'],
      bodyweight:      ['Glute Bridge', 'Barbell Hip Thrust', 'Bulgarian Split Squat'],
    },
    isolation: {
      full_gym:        ['Cable Kickback', 'Abductor Machine', 'Smith Machine Hip Thrust'],
      barbell_plates:  ['Abductor Machine', 'Cable Kickback'],
      machines_cables: ['Cable Kickback', 'Abductor Machine', 'Cable Hip Abduction'],
      dumbbells_only:  ['Cable Hip Abduction', 'Cable Hip Abduction'],
      home_gym:        ['Cable Hip Abduction', 'Glute Bridge', 'Cable Hip Abduction'],
      bodyweight:      ['Glute Bridge', 'Cable Hip Abduction', 'Glute Bridge'],
    },
  },

  calves: {
    isolation: {
      full_gym:        ['Standing Calf Raise (Machine)', 'Seated Calf Raise', 'Leg Press Calf Raise'],
      barbell_plates:  ['Standing Calf Raise (Machine)', 'Seated Calf Raise', 'Leg Press Calf Raise'],
      machines_cables: ['Standing Calf Raise (Machine)', 'Seated Calf Raise'],
      dumbbells_only:  ['Dumbbell Calf Raise (Standing)', 'Seated Calf Raise'],
      home_gym:        ['Single-Leg Calf Raise (Bodyweight)', 'Dumbbell Calf Raise (Standing)'],
      bodyweight:      ['Single-Leg Calf Raise (Bodyweight)', 'Single-Leg Calf Raise (Bodyweight)'],
    },
  },

  traps: {
    isolation: {
      full_gym:        ['Barbell Shrug', 'Dumbbell Shrug', 'Rack Pull'],
      barbell_plates:  ['Barbell Shrug', 'Rack Pull', 'Upright Row'],
      machines_cables: ['Cable Shrug', 'Upright Row', 'Dumbbell Shrug'],
      dumbbells_only:  ['Dumbbell Shrug', 'Upright Row'],
      home_gym:        ['Dumbbell Shrug', 'Upright Row'],
      bodyweight:      ['Dumbbell Shrug', 'Dumbbell Shrug'],
    },
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Deterministic list index access — wraps around, never random
function pick(arr, index) {
  if (!arr || !arr.length) return null;
  return arr[index % arr.length];
}

function getList(muscle, category, equipment) {
  const muscleDef = EXERCISES[muscle];
  if (!muscleDef) return [];
  const catDef = muscleDef[category] || muscleDef.isolation || {};
  return catDef[equipment] || catDef.full_gym || [];
}

// Mid-point of the base volume range for an experience level
function volMid(experience) {
  const { min, max } = BASE_VOLUME[experience];
  return Math.round((min + max) / 2);
}

// Total weekly sets for a muscle, with weak-point and nutrition modifiers.
// inputs._ncMod is an optional extra recovery multiplier from nutritionContext.
function weeklySetTarget(muscle, experience, weakPoints, nutritionPhase, goal, inputs = {}) {
  const nutritionMod = NUTRITION_VOLUME_MOD[nutritionPhase] ?? 1.0;
  const ncMod = inputs._ncMod ?? 1.0;
  let sets = volMid(experience) * nutritionMod * ncMod;

  if (weakPoints.includes(muscle)) {
    // weak_point_spec goal gets 40% extra; general weak-point flag gets 25%
    sets *= goal === 'weak_point_spec' ? 1.40 : 1.25;
  }

  return Math.round(sets);
}

// Sets per exercise per session for a muscle.
// `sessions` = how many sessions/week that muscle is trained.
// `numEx` = how many exercises in each session target that muscle (defaults to 1).
// Per-exercise cap scales with experience so beginners don't accumulate excessive
// total session volume before they've built the work capacity to handle it.
const PER_EX_CAP = { beginner: 2, intermediate: 3, advanced: 4, competitive: 5 };

// Maximum TOTAL working sets per session (systemic fatigue ceiling).
// Per-muscle MRV and session-total capacity are separate constraints — you cannot
// stack max volume for every muscle group simultaneously and recover from it.
const SESSION_MAX_SETS = { beginner: 14, intermediate: 20, advanced: 25, competitive: 30 };

function setsPerSession(muscle, experience, weakPoints, nutritionPhase, goal, sessions, inputs = {}, numEx = 1) {
  const weekly = weeklySetTarget(muscle, experience, weakPoints, nutritionPhase, goal, inputs);
  const perSession = Math.round(weekly / Math.max(1, sessions));
  const cap = PER_EX_CAP[experience] ?? 3;
  return Math.min(cap, Math.max(2, Math.round(perSession / Math.max(1, numEx))));
}

// Remove any exercise appearing more than once in a session (same name).
function deduplicateExercises(exercises) {
  const seen = new Set();
  return exercises.filter(e => {
    if (seen.has(e.exerciseName)) return false;
    seen.add(e.exerciseName);
    return true;
  });
}

// Trim total session sets to the experience-appropriate ceiling.
// Reduction works back-to-front so accessories (placed last) are trimmed first,
// preserving the compound lifts that open each session.
function capSessionVolume(exercises, experience) {
  const max = SESSION_MAX_SETS[experience] ?? 20;
  let total = exercises.reduce((s, e) => s + e.sets, 0);
  if (total <= max) return exercises;
  const result = exercises.map(e => ({ ...e }));
  while (total > max) {
    let reduced = false;
    for (let i = result.length - 1; i >= 0 && total > max; i--) {
      if (result[i].sets > 2) {
        result[i].sets--;
        total--;
        reduced = true;
      }
    }
    if (!reduced) break;
  }
  return result;
}

// Build a single exercise entry for a workout
function makeExercise(name, paramKey, sets, experience, nutritionPhase, notes = null) {
  const p = PARAMS[paramKey] ?? PARAMS.isolation;
  let rir = baseRir(experience);
  // Cut phases: raise RIR by 1 (stay further from failure to protect recovery)
  if (nutritionPhase === 'mild_cut' || nutritionPhase === 'aggressive_cut') rir += 1;

  return {
    exerciseName: name,
    sets,
    repMin: p.repMin,
    repMax: p.repMax,
    restSec: p.restSec,
    rirTarget: rir,
    notes,
  };
}

// Resolve compound param key based on goal
function compoundKey(goal) {
  return goal === 'strength_hypertrophy' ? 'compound_strength' : 'compound';
}

// ---------------------------------------------------------------------------
// Split selection
// ---------------------------------------------------------------------------

function selectSplit(experience, effectiveDays, goal) {
  if (effectiveDays === 3) {
    return experience === 'advanced' || experience === 'competitive' ? 'ppl' : 'full_body';
  }
  if (effectiveDays === 4) return 'upper_lower';
  if (effectiveDays === 5) {
    return goal === 'weak_point_spec' ? 'upper_lower_wp' : 'ppl';
  }
  return 'ppl_ab'; // 6 days
}

// ---------------------------------------------------------------------------
// Workout builders
// ---------------------------------------------------------------------------

function buildFullBody(inputs, effectiveDays) {
  const { experience, equipment: eq, goal, weakPoints, nutritionPhase } = inputs;
  const cKey = compoundKey(goal);

  const makeDay = (dayIndex, label, slot) => {
    const muscles = ['quads', 'hamstrings', 'chest', 'back', 'shoulders', 'biceps', 'triceps'];
    return {
      dayIndex,
      name: label,
      targetMuscles: muscles,
      exercises: [
        makeExercise(pick(getList('quads', 'compound', eq), slot), cKey,
          setsPerSession('quads', experience, weakPoints, nutritionPhase, goal, effectiveDays, inputs),
          experience, nutritionPhase),
        makeExercise(pick(getList('hamstrings', 'compound', eq), slot), cKey,
          setsPerSession('hamstrings', experience, weakPoints, nutritionPhase, goal, effectiveDays, inputs),
          experience, nutritionPhase),
        makeExercise(pick(getList('chest', 'compound', eq), slot), cKey,
          setsPerSession('chest', experience, weakPoints, nutritionPhase, goal, effectiveDays, inputs),
          experience, nutritionPhase),
        makeExercise(pick(getList('back', 'compound', eq), slot), cKey,
          setsPerSession('back', experience, weakPoints, nutritionPhase, goal, effectiveDays, inputs),
          experience, nutritionPhase),
        makeExercise(pick(getList('shoulders', 'isolation', eq), slot + 1), 'machine',
          setsPerSession('shoulders', experience, weakPoints, nutritionPhase, goal, effectiveDays, inputs),
          experience, nutritionPhase),
        makeExercise(pick(getList('biceps', 'isolation', eq), slot), 'isolation',
          setsPerSession('biceps', experience, weakPoints, nutritionPhase, goal, effectiveDays, inputs),
          experience, nutritionPhase),
        makeExercise(pick(getList('triceps', 'isolation', eq), slot), 'isolation',
          setsPerSession('triceps', experience, weakPoints, nutritionPhase, goal, effectiveDays, inputs),
          experience, nutritionPhase),
      ],
    };
  };

  const labels = ['Full Body A', 'Full Body B', 'Full Body C'];
  return Array.from({ length: effectiveDays }, (_, i) => makeDay(i, labels[i % 3], i));
}

function buildUpperLower(inputs) {
  const { experience, equipment: eq, goal, weakPoints, nutritionPhase } = inputs;
  const cKey = compoundKey(goal);

  const upper = (dayIndex, label, slot) => ({
    dayIndex,
    name: label,
    targetMuscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    exercises: [
      // chest: 1 exercise per upper session
      makeExercise(pick(getList('chest', 'compound', eq), slot), cKey,
        setsPerSession('chest', experience, weakPoints, nutritionPhase, goal, 2, inputs, 1),
        experience, nutritionPhase),
      // back: compound + isolation = 2 exercises, share the volume
      makeExercise(pick(getList('back', 'compound', eq), slot), cKey,
        setsPerSession('back', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      // shoulders: compound + isolation = 2 exercises
      makeExercise(pick(getList('shoulders', 'compound', eq), slot), 'machine',
        setsPerSession('shoulders', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('shoulders', 'isolation', eq), slot), 'isolation',
        setsPerSession('shoulders', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase, 'Lead with elbows, keep torso upright'),
      makeExercise(pick(getList('back', 'isolation', eq), slot), 'machine',
        setsPerSession('back', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      // arms: 1 exercise each
      makeExercise(pick(getList('biceps', 'isolation', eq), slot), 'isolation',
        setsPerSession('biceps', experience, weakPoints, nutritionPhase, goal, 2, inputs, 1),
        experience, nutritionPhase),
      makeExercise(pick(getList('triceps', 'isolation', eq), slot), 'isolation',
        setsPerSession('triceps', experience, weakPoints, nutritionPhase, goal, 2, inputs, 1),
        experience, nutritionPhase),
    ],
  });

  const lower = (dayIndex, label, slot) => ({
    dayIndex,
    name: label,
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    exercises: [
      // quads: compound + isolation = 2 exercises
      makeExercise(pick(getList('quads', 'compound', eq), slot), cKey,
        setsPerSession('quads', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      // hamstrings: compound + isolation = 2 exercises
      makeExercise(pick(getList('hamstrings', 'compound', eq), slot), cKey,
        setsPerSession('hamstrings', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      // glutes: 1 exercise per lower session
      makeExercise(pick(getList('glutes', 'compound', eq), slot), cKey,
        setsPerSession('glutes', experience, weakPoints, nutritionPhase, goal, 2, inputs, 1),
        experience, nutritionPhase),
      makeExercise(pick(getList('quads', 'isolation', eq), slot), 'isolation',
        setsPerSession('quads', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('hamstrings', 'isolation', eq), slot), 'isolation',
        setsPerSession('hamstrings', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('calves', 'isolation', eq), 0), 'isolation', 3,
        experience, nutritionPhase, null),
    ],
  });

  return [
    upper(0, 'Upper A', 0),
    lower(1, 'Lower A', 0),
    upper(2, 'Upper B', 1),
    lower(3, 'Lower B', 1),
  ];
}

function buildPPL(inputs, effectiveDays) {
  const { experience, equipment: eq, goal, weakPoints, nutritionPhase } = inputs;
  const cKey = compoundKey(goal);

  const push = (dayIndex, label, slot) => ({
    dayIndex,
    name: label,
    targetMuscles: ['chest', 'shoulders', 'triceps'],
    exercises: [
      // chest: 2 compound angles, share the per-session volume
      makeExercise(pick(getList('chest', 'compound', eq), slot), cKey,
        setsPerSession('chest', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('chest', 'compound', eq), slot + 1), cKey,
        setsPerSession('chest', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase, 'Incline angle — upper chest emphasis'),
      // shoulders: compound + isolation = 2 exercises
      makeExercise(pick(getList('shoulders', 'compound', eq), slot), 'machine',
        setsPerSession('shoulders', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('shoulders', 'isolation', eq), slot), 'isolation',
        setsPerSession('shoulders', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('chest', 'isolation', eq), slot), 'isolation', 3,
        experience, nutritionPhase),
      // triceps: 2 exercises, share volume
      makeExercise(pick(getList('triceps', 'isolation', eq), slot), 'isolation',
        setsPerSession('triceps', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('triceps', 'isolation', eq), slot + 1), 'isolation', 3,
        experience, nutritionPhase),
    ],
  });

  const pull = (dayIndex, label, slot) => ({
    dayIndex,
    name: label,
    targetMuscles: ['back', 'biceps', 'traps'],
    exercises: [
      // back: 2 compound variations, share volume
      makeExercise(pick(getList('back', 'compound', eq), slot), cKey,
        setsPerSession('back', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('back', 'compound', eq), slot + 1), cKey,
        setsPerSession('back', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase, 'Row variation — retract scapulae at peak contraction'),
      makeExercise(pick(getList('back', 'isolation', eq), slot), 'machine', 3,
        experience, nutritionPhase),
      // rear delts: 1 exercise on pull day
      makeExercise(pick(getList('shoulders', 'isolation', eq), slot + 1), 'isolation',
        setsPerSession('shoulders', experience, weakPoints, nutritionPhase, goal, 2, inputs, 1),
        experience, nutritionPhase, 'Rear delts — essential for balanced shoulder development'),
      // biceps: 2 exercises, share volume
      makeExercise(pick(getList('biceps', 'isolation', eq), slot), 'isolation',
        setsPerSession('biceps', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('biceps', 'isolation', eq), slot + 1), 'isolation', 3,
        experience, nutritionPhase),
      makeExercise(pick(getList('traps', 'isolation', eq), slot), 'isolation', 3,
        experience, nutritionPhase),
    ],
  });

  const legs = (dayIndex, label, slot) => ({
    dayIndex,
    name: label,
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    exercises: [
      // quads: compound + isolation = 2 exercises
      makeExercise(pick(getList('quads', 'compound', eq), slot), cKey,
        setsPerSession('quads', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      // hamstrings: compound + isolation = 2 exercises
      makeExercise(pick(getList('hamstrings', 'compound', eq), slot), cKey,
        setsPerSession('hamstrings', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      // glutes: 1 exercise
      makeExercise(pick(getList('glutes', 'compound', eq), slot), cKey,
        setsPerSession('glutes', experience, weakPoints, nutritionPhase, goal, 2, inputs, 1),
        experience, nutritionPhase),
      makeExercise(pick(getList('quads', 'isolation', eq), slot), 'isolation',
        setsPerSession('quads', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('hamstrings', 'isolation', eq), slot), 'isolation',
        setsPerSession('hamstrings', experience, weakPoints, nutritionPhase, goal, 2, inputs, 2),
        experience, nutritionPhase),
      makeExercise(pick(getList('calves', 'isolation', eq), 0), 'isolation', 4,
        experience, nutritionPhase),
    ],
  });

  if (effectiveDays === 3) {
    return [push(0, 'Push', 0), pull(1, 'Pull', 0), legs(2, 'Legs', 0)];
  }
  if (effectiveDays === 5) {
    return [
      push(0, 'Push A', 0),
      pull(1, 'Pull A', 0),
      legs(2, 'Legs', 0),
      push(3, 'Push B', 1),
      pull(4, 'Pull B', 1),
    ];
  }
  // 6-day PPL A/B
  return [
    push(0, 'Push A', 0),
    pull(1, 'Pull A', 0),
    legs(2, 'Legs A', 0),
    push(3, 'Push B', 1),
    pull(4, 'Pull B', 1),
    legs(5, 'Legs B', 1),
  ];
}

// Dedicated weak-point session — up to 3 lagging muscles, 2 exercises each
function buildWeakPointDay(inputs, dayIndex) {
  const { experience, equipment: eq, goal, weakPoints, nutritionPhase } = inputs;
  const muscles = weakPoints.length > 0 ? weakPoints : ['shoulders', 'biceps'];
  const exercises = [];

  muscles.forEach((muscle, i) => {
    const muscleDef = EXERCISES[muscle];
    if (!muscleDef) return;

    const hasCompound = !!muscleDef.compound;
    const primList = getList(muscle, hasCompound ? 'compound' : 'isolation', eq);
    const isoList  = getList(muscle, 'isolation', eq);

    if (primList.length) {
      exercises.push(makeExercise(
        pick(primList, i),
        hasCompound ? compoundKey(goal) : 'isolation',
        4,
        experience, nutritionPhase,
        'Weak-point focus — prioritise mind-muscle connection',
      ));
    }
    if (isoList.length) {
      exercises.push(makeExercise(
        pick(isoList, i + 1),
        'isolation', 3,
        experience, nutritionPhase,
        'Extra isolation volume for lagging muscle',
      ));
    }
  });

  return {
    dayIndex,
    name: 'Weak Point Specialisation',
    targetMuscles: muscles,
    exercises,
  };
}

// ---------------------------------------------------------------------------
// Goal-specific post-processing
// ---------------------------------------------------------------------------

// aesthetic_v_taper: inject extra lateral raise + rear-delt work in shoulder/back sessions
function applyVTaperBias(workouts, equipment, experience, nutritionPhase) {
  const eq = equipment;
  workouts.forEach((workout) => {
    const hasShoulders = workout.targetMuscles.includes('shoulders');
    const hasBack      = workout.targetMuscles.includes('back');
    if (!hasShoulders && !hasBack) return;

    const hasLateral = workout.exercises.some((e) =>
      e.exerciseName.toLowerCase().includes('lateral'),
    );
    if (!hasLateral) {
      const name = pick(getList('shoulders', 'isolation', eq), 0);
      if (name) {
        workout.exercises.push(makeExercise(
          name, 'isolation', 3, experience, nutritionPhase,
          'V-taper priority — medial delt width, 15–20 rep range',
        ));
      }
    }

    if (hasShoulders) {
      const hasRear = workout.exercises.some((e) =>
        e.exerciseName.toLowerCase().includes('rear') || e.exerciseName.toLowerCase().includes('face pull'),
      );
      if (!hasRear) {
        const name = pick(getList('shoulders', 'isolation', eq), 1);
        if (name) {
          workout.exercises.push(makeExercise(
            name, 'isolation', 3, experience, nutritionPhase,
            'Rear delt — balances shoulder girdle, adds 3D look',
          ));
        }
      }
    }
  });
}

// strength_hypertrophy: add progressive overload note to compound entries
function applyStrengthNotes(workouts) {
  workouts.forEach((workout) => {
    workout.exercises.forEach((ex) => {
      if (ex.repMax <= 8 && !ex.notes) {
        ex.notes = 'Add weight when top of rep range is achieved for 2 consecutive sessions';
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Weekly volume summary
// ---------------------------------------------------------------------------

const ALL_MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'traps'];

function buildVolumeSummary(experience, weakPoints, nutritionPhase, goal, inputs = {}) {
  const summary = {};
  ALL_MUSCLES.forEach((m) => {
    summary[m] = {
      plannedSets:  weeklySetTarget(m, experience, weakPoints, nutritionPhase, goal, inputs),
      isWeakPoint:  weakPoints.includes(m),
    };
  });
  return summary;
}

// ---------------------------------------------------------------------------
// Personalisation summary
// ---------------------------------------------------------------------------

const EXPERIENCE_LABELS = {
  beginner:     'Beginner (< 6 months serious training)',
  intermediate: 'Intermediate (6 months – 2 years)',
  advanced:     'Advanced (2–5 years)',
  competitive:  'Competitive (5+ years, contest focus)',
};

const EQUIPMENT_LABELS = {
  full_gym:       'Full commercial gym',
  machines_cables:'Machines & cables only',
  dumbbells:      'Dumbbells only',
  barbell_plates: 'Barbell & plates',
  home_gym:       'Home gym setup',
  bodyweight:     'Bodyweight only',
};

const RECOVERY_LABELS = {
  poor:    'Poor (limited sleep, high life stress)',
  average: 'Average',
  good:    'Good (8 h sleep, low stress)',
};

const TRAINING_AGE_LABELS = {
  '<6m':  'Under 6 months',
  '6-18m':'6–18 months',
  '2-5y': '2–5 years',
  '5+y':  '5+ years',
};

const NUTRITION_PHASE_LABELS = {
  lean_gain:      'Lean Gain (modest surplus)',
  build:          'Build (aggressive surplus)',
  maintain:       'Maintenance',
  recomp:         'Body Recomposition',
  mild_cut:       'Mild Cut',
  aggressive_cut: 'Aggressive Cut',
};

function buildPersonalisationSummary(inputs, effectiveDays, splitType) {
  const { experience, trainingAge, daysPerWeek, sessionLengthMinutes,
          equipment, goal, weakPoints, recoveryRating, nutritionPhase } = inputs;

  return {
    experience:    EXPERIENCE_LABELS[experience] ?? experience,
    trainingAge:   `Training age: ${TRAINING_AGE_LABELS[trainingAge] ?? trainingAge}`,
    daysPerWeek:   effectiveDays !== daysPerWeek
      ? `Requested ${daysPerWeek} days — adjusted to ${effectiveDays} days based on experience level`
      : `${effectiveDays} training days per week`,
    sessionLength: `~${sessionLengthMinutes} min sessions`,
    equipment:     EQUIPMENT_LABELS[equipment] ?? equipment,
    goal:          GOAL_LABELS[goal] ?? goal,
    split:         SPLIT_LABELS[splitType] ?? splitType,
    weakPoints:    weakPoints.length
      ? `Weak points targeted: ${weakPoints.join(', ')}`
      : 'No specific weak points flagged',
    recovery:      RECOVERY_LABELS[recoveryRating] ?? recoveryRating,
    nutritionPhase: nutritionPhase
      ? (NUTRITION_PHASE_LABELS[nutritionPhase] ?? nutritionPhase)
      : 'Not specified',
  };
}

// ---------------------------------------------------------------------------
// whyThis explanations (7 plain-English tooltips, ≤ 80 words each)
// ---------------------------------------------------------------------------

function buildWhyThis(inputs, splitType, effectiveDays) {
  const { experience, goal, weakPoints, nutritionPhase, equipment } = inputs;
  const mod = NUTRITION_VOLUME_MOD[nutritionPhase] ?? 1.0;
  const { min, max } = BASE_VOLUME[experience];
  const adjMin = Math.round(min * mod);
  const adjMax = Math.round(max * mod);
  const eqLabel = EQUIPMENT_LABELS[equipment] ?? equipment;

  const splitExplain = {
    full_body:      'Full Body training hits every muscle group each session, maximising frequency. Ideal for beginners who benefit from repetition to build motor patterns, and for building a strong base before transitioning to split training.',
    upper_lower:    'Upper / Lower splits train each muscle group twice per week, balancing frequency with sufficient per-session volume. Well suited to intermediates who can handle more work per session without excess systemic fatigue.',
    ppl:            'Push / Pull / Legs groups muscles by movement pattern, reducing overlap fatigue and enabling high per-muscle volume. The go-to structure for advanced lifters who need more total weekly sets than full body or upper-lower allows.',
    ppl_ab:         'PPL A/B rotates two variants of each Push, Pull and Legs session across 6 days. Rotating exercise selection manages fatigue and provides stimulus variety while maintaining high weekly frequency for each muscle.',
    upper_lower_wp: 'Upper / Lower distributes base volume twice across four sessions. The fifth day targets your specific weak points with focused volume — an efficient structure for lifters who want broad development and targeted specialisation.',
  };

  const weakText = weakPoints.length
    ? `Your selected weak points (${weakPoints.join(', ')}) receive 25–40% extra weekly sets above baseline, exploiting higher frequency to accelerate lagging muscles and bring them in line with stronger areas.`
    : 'No specific weak points were flagged, so sets are distributed evenly across all major muscle groups for balanced development.';

  const nutritionText = mod > 1
    ? `A caloric surplus (${nutritionPhase?.replace(/_/g, ' ')}) raises your volume ceiling by ~10%, supporting more sets per session, faster recovery between sessions, and more aggressive progressive overload.`
    : mod < 1
    ? `Your cut phase (${nutritionPhase?.replace(/_/g, ' ')}) reduces volume by ${Math.round((1 - mod) * 100)}% to match reduced recovery capacity. Lower volume limits muscle protein breakdown and preserves lean mass during the deficit.`
    : 'Maintenance or recomposition intake keeps volume at baseline — enough stimulus to retain or slowly accrue muscle without accumulating excessive fatigue.';

  return {
    split:
      (splitExplain[splitType] ?? 'Split selected to match your frequency, experience level, and goal.'),
    volume:
      `Your ${experience} experience level targets ${adjMin}–${adjMax} working sets per muscle per week. This range reflects current evidence for effective hypertrophy stimulus without exceeding your recovery ceiling.`,
    weakPoints: weakText,
    exercises:
      `Exercises are matched to ${eqLabel}. Compound lifts anchor each session — they provide maximum mechanical tension and progressive overload potential. Machine and isolation work follows, adding metabolic stress and targeted muscle activation.`,
    repRanges:
      'Compound lifts use 5–10 reps to maximise mechanical tension. Machine movements use 8–12 reps. Isolation exercises use 10–20 reps — a wider range exploits metabolic stress and pump, which is especially effective for smaller muscles.',
    restPeriods:
      'Compounds receive 2–3 min rest, allowing near-full phosphocreatine resynthesis for peak performance next set. Machine work gets 90–120 s; isolations 60–90 s — enough recovery without a complete drop in heart rate and blood flow.',
    rirGuidance:
      experience === 'beginner'
        ? 'RIR 3 means stopping 3 reps before failure. For beginners this keeps technique clean and avoids excess fatigue while neural adaptations are still the primary driver of strength gains.'
        : experience === 'intermediate'
        ? 'RIR 2 keeps you close to failure without hitting it every set. This intensity is sufficient to drive hypertrophy while preserving recovery for the next session — the sweet spot for intermediates.'
        : 'RIR 1 means you have just one rep left in the tank. Advanced lifters need to approach failure regularly to provide the high-threshold motor unit recruitment required for continued hypertrophic gains.',
    nutritionImpact: nutritionText,
  };
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

function buildWarnings(inputs, effectiveDays) {
  const { experience, daysPerWeek, recoveryRating, nutritionPhase, weakPoints } = inputs;
  const warnings = [];

  if (experience === 'beginner' && daysPerWeek > 4) {
    warnings.push(
      `A ${daysPerWeek}-day programme exceeds typical beginner recovery capacity. Your plan has been reduced to ${effectiveDays} days to protect recovery and reinforce movement quality before adding frequency.`,
    );
  }

  if (recoveryRating === 'poor' && effectiveDays >= 5) {
    warnings.push(
      'Poor recovery combined with 5+ training days significantly increases injury and overtraining risk. Prioritise 7–9 h sleep and consider reducing to 4 days per week.',
    );
  }

  if (nutritionPhase === 'aggressive_cut' && effectiveDays >= 5) {
    warnings.push(
      'Running 5+ days on an aggressive cut is high-risk. Volume has been moderated, but consider reducing to 4 days to better match your reduced recovery resources.',
    );
  }

  if (nutritionPhase === 'aggressive_cut') {
    warnings.push(
      'Aggressive cut: volume is reduced by 25% and RIR is raised by 1. Keep protein high (≥ 2 g/kg) and prioritise compound lifts to minimise muscle loss.',
    );
  }

  if (experience === 'beginner' && inputs.goal === 'strength_hypertrophy') {
    warnings.push(
      'Strength–Hypertrophy programming is most effective once sound movement mechanics are established. Focus on technique before chasing heavier loads.',
    );
  }

  // weakPoints are already capped to 3 before this is called
  if (weakPoints.length === 3) {
    warnings.push(
      'Three weak points are targeted — the maximum supported. Additional muscles beyond three will not receive specialisation volume.',
    );
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generatePlan(inputs) {
  const {
    experience    = 'intermediate',
    trainingAge,
    daysPerWeek   = 4,
    sessionLengthMinutes = 60,
    equipment     = 'full_gym',
    goal          = 'general_hypertrophy',
    weakPoints    = [],
    recoveryRating = 'average',
    nutritionPhase = null,
    nutritionContext = null, // optional: result of getPlanNutritionContext(nutritionTargets)
  } = inputs;

  // Enforce weak-point cap of 3 for determinism
  const safeWeakPoints = weakPoints.slice(0, 3);

  // Beginners requesting 5-6 days are capped at 4; generate 4-day plan + warning
  const effectiveDays = (experience === 'beginner' && daysPerWeek > 4) ? 4 : daysPerWeek;

  const splitType = selectSplit(experience, effectiveDays, goal);

  // If a nutritionContext was supplied, blend its recoveryModifier into inputs so
  // downstream volume helpers (weeklySetTarget) apply it on top of the phase modifier.
  const ncMod = nutritionContext?.recoveryModifier ?? 1.0;
  const planInputs = { ...inputs, weakPoints: safeWeakPoints, _ncMod: ncMod };

  // Build raw workout array
  let workouts;
  switch (splitType) {
    case 'full_body':
      workouts = buildFullBody(planInputs, effectiveDays);
      break;
    case 'upper_lower':
      workouts = buildUpperLower(planInputs);
      break;
    case 'upper_lower_wp': {
      const base = buildUpperLower(planInputs);
      workouts = [...base, buildWeakPointDay(planInputs, 4)];
      break;
    }
    case 'ppl':
    case 'ppl_ab':
      workouts = buildPPL(planInputs, effectiveDays);
      break;
    default:
      workouts = buildFullBody(planInputs, effectiveDays);
  }

  // Goal-specific post-processing
  if (goal === 'aesthetic_v_taper') {
    applyVTaperBias(workouts, equipment, experience, nutritionPhase);
  }
  if (goal === 'strength_hypertrophy') {
    applyStrengthNotes(workouts);
  }

  // Finalise every session: remove duplicate exercises then enforce session total cap.
  // Done after all post-processing so V-taper injections are also counted.
  workouts.forEach(w => {
    w.exercises = capSessionVolume(deduplicateExercises(w.exercises), experience);
  });

  const warnings             = buildWarnings(planInputs, effectiveDays);
  const weeklyVolumeSummary  = buildVolumeSummary(experience, safeWeakPoints, nutritionPhase, goal, planInputs);
  const personalisationSummary = buildPersonalisationSummary(planInputs, effectiveDays, splitType);
  const whyThis              = buildWhyThis(planInputs, splitType, effectiveDays);

  const goalShort = {
    general_hypertrophy:   'Hypertrophy',
    balanced_bodybuilding: 'Bodybuilding',
    aesthetic_v_taper:     'V-Taper',
    weak_point_spec:       'Specialisation',
    strength_hypertrophy:  'Strength-Hypertrophy',
    recomp:                'Recomp',
  }[goal] ?? 'Training';

  const splitShort = {
    full_body:      'Full Body',
    upper_lower:    'Upper-Lower',
    ppl:            'PPL',
    ppl_ab:         'PPL A/B',
    upper_lower_wp: 'UL + WP',
  }[splitType] ?? splitType;

  return {
    name:                   `${goalShort} ${splitShort} — ${effectiveDays}×/week`,
    goal,
    splitType,
    daysPerWeek:            effectiveDays,
    estimatedSessionMinutes: sessionLengthMinutes,
    workouts,
    weeklyVolumeSummary,
    personalisationSummary,
    whyThis,
    warnings,
    nutritionContext: nutritionContext ?? null,
  };
}
