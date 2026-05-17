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
// Phase 1: reduce sets back-to-front down to a minimum of 3 (below 3 is not a
//   useful training stimulus — remove the exercise instead).
// Phase 2: if the cap still cannot be met at 3 sets/exercise, drop whole
//   exercises from the back (accessories first, compounds protected at front).
function capSessionVolume(exercises, experience) {
  const max = SESSION_MAX_SETS[experience] ?? 20;
  let total = exercises.reduce((s, e) => s + e.sets, 0);
  if (total <= max) return exercises;
  const result = exercises.map(e => ({ ...e }));

  // Phase 1: reduce sets to minimum 3
  while (total > max) {
    let reduced = false;
    for (let i = result.length - 1; i >= 0 && total > max; i--) {
      if (result[i].sets > 3) {
        result[i].sets--;
        total--;
        reduced = true;
      }
    }
    if (!reduced) break;
  }

  // Phase 2: remove whole exercises from the back
  while (total > max && result.length > 3) {
    total -= result[result.length - 1].sets;
    result.pop();
  }

  return result;
}

// ---------------------------------------------------------------------------
// Session time estimation
// ---------------------------------------------------------------------------

// Approximate time spent performing one set (concentric + eccentric, ~3.5 s/rep).
function setWorkSeconds(ex) {
  return Math.round(((ex.repMin + ex.repMax) / 2) * 3.5);
}

// Setup time at the start of each exercise (loading plates, adjusting machine seat,
// finding the right dumbbells). Derived from restSec which correlates with complexity.
function exerciseSetupSeconds(ex) {
  if (ex.restSec >= 150) return 120; // barbell compound — load plates, set j-hooks
  if (ex.restSec >= 100) return 60;  // machine / cable — adjust pin, seat, handle
  return 40;                         // isolation / dumbbell — grab, set up
}

// Total seconds for one exercise block:
// setup + (work + rest) × sets − trailing rest (absorbed into next exercise setup).
function exerciseBlockSeconds(ex) {
  const perSet = setWorkSeconds(ex) + ex.restSec;
  return exerciseSetupSeconds(ex) + ex.sets * perSet - ex.restSec;
}

// Estimated total session duration in seconds.
// Includes a 5-minute arrival/warmup buffer and 30 seconds between exercises
// for moving between stations, chalk up, logging, etc.
function estimateWorkoutSeconds(exercises) {
  const warmup = 5 * 60;
  const transitions = Math.max(0, exercises.length - 1) * 30;
  return warmup + transitions + exercises.reduce((s, e) => s + exerciseBlockSeconds(e), 0);
}

// Exported so screens can show a live duration estimate.
export function estimateWorkoutMinutes(exercises) {
  return Math.ceil(estimateWorkoutSeconds(exercises) / 60);
}

// Trim a session to fit within sessionMinutes.
// Phase 1: reduce sets back-to-front down to 3 minimum (below 3 is not a useful
//   training stimulus — remove the exercise instead).
// Phase 2: drop whole exercises from the back if still over budget.
// Always preserves at least 3 exercises — absolute minimum for a useful session.
function fitToSessionLength(exercises, sessionMinutes) {
  if (!sessionMinutes || sessionMinutes <= 0) return exercises;
  const budgetSec = sessionMinutes * 60;
  if (estimateWorkoutSeconds(exercises) <= budgetSec) return exercises;

  const result = exercises.map(e => ({ ...e }));

  // Phase 1: reduce sets (min 3) back-to-front
  let safety = 60;
  while (estimateWorkoutSeconds(result) > budgetSec && safety-- > 0) {
    let trimmed = false;
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].sets > 3) {
        result[i].sets--;
        trimmed = true;
        break;
      }
    }
    if (!trimmed) break;
  }

  // Phase 2: remove whole exercises from the back
  while (estimateWorkoutSeconds(result) > budgetSec && result.length > 3) {
    result.pop();
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
// whyThis — every sentence references this person's inputs or plan outputs
// ---------------------------------------------------------------------------

function buildWhyThis(inputs, splitType, effectiveDays, workouts) {
  const { experience, goal, weakPoints, nutritionPhase, equipment,
          sessionLengthMinutes, recoveryRating, daysPerWeek } = inputs;
  const mod  = NUTRITION_VOLUME_MOD[nutritionPhase] ?? 1.0;
  const { min, max } = BASE_VOLUME[experience];
  const adjMin = Math.round(min * mod);
  const adjMax = Math.round(max * mod);
  const eqLabel = EQUIPMENT_LABELS[equipment] ?? equipment;

  // Real plan stats
  const avgExercises = workouts.length
    ? Math.round(workouts.reduce((s, w) => s + w.exercises.length, 0) / workouts.length)
    : 0;
  const avgSets = workouts.length
    ? Math.round(workouts.reduce((s, w) => s + w.exercises.reduce((t, e) => t + e.sets, 0), 0) / workouts.length)
    : 0;
  const durations = workouts.map(w => w.estimatedDurationMinutes ?? estimateWorkoutMinutes(w.exercises));
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);
  const durText = minDur === maxDur ? `${minDur} min` : `${minDur}–${maxDur} min`;

  // Actual compound lifts from the first session (highest rest = heaviest exercise)
  const firstSession = workouts[0];
  const anchorLifts  = (firstSession?.exercises ?? [])
    .filter(e => e.restSec >= 150)
    .slice(0, 2)
    .map(e => e.exerciseName);

  // ── 1. Why this split for this person ──
  const splitText = {
    full_body: experience === 'beginner'
      ? `Full Body was chosen because you're at beginner level with ${effectiveDays} training days. Hitting every muscle group each session means you practise each movement pattern ${effectiveDays}× per week — the repetition is what drives most early progress. A chest-only or push day at this stage would leave you practising that movement too infrequently to build quality motor patterns.`
      : `Full Body was chosen for your ${effectiveDays}-day week. A split here would leave some muscles 7+ days between sessions — too long for an ${experience} lifter. Full Body squeezes ${effectiveDays}× weekly stimulus into every muscle group within the day count.`,

    upper_lower: experience === 'advanced' || experience === 'competitive'
      ? `Upper / Lower was selected for your ${effectiveDays} days at ${experience} level. PPL needs 5–6 days to deliver adequate weekly frequency; with ${effectiveDays} days, Upper / Lower trains each muscle group twice per week — the minimum frequency to sustain progress at your training age without leaving gaps that blunt adaptation.`
      : `Upper / Lower was selected for your ${effectiveDays}-day week at ${experience} level. Training each muscle twice per week sits at the frequency sweet spot for intermediates: enough repetition to keep reinforcing adaptations, enough per-session volume to make the sessions worth doing, and 48–72 h between sessions for recovery.`,

    ppl: effectiveDays >= 6
      ? `Push / Pull / Legs was selected for your ${effectiveDays}-day week. At ${experience} level you need higher weekly sets than Upper / Lower can deliver in ${effectiveDays} days without sessions running over time. PPL groups muscles by movement pattern so your pressing muscles recover fully during Pull and Legs days — no residual chest fatigue when shoulder pressing arrives.`
      : `Push / Pull / Legs was selected for your ${effectiveDays} days at ${experience} level. Grouping muscles by movement pattern means each group gets a full 48+ h recovery before it's trained again. At ${experience} level you can sustain the per-session volume PPL demands, which Upper / Lower spreads thinner.`,

    ppl_ab:
      `PPL A/B was selected for your ${effectiveDays}-day week. At ${experience} level, two complete Push / Pull / Legs rotations per week give each muscle group twice-weekly frequency — necessary to keep driving adaptation at your stage. Rotating A and B exercise variants across the two cycles varies stimulus enough to manage long-term fatigue while sustaining high weekly volume.`,

    upper_lower_wp:
      `Upper / Lower on 4 days trains every muscle group twice per week. The fifth session is reserved entirely for ${weakPoints.length ? weakPoints.join(' and ') : 'your selected weak points'} — targeted volume on top of the base structure, timed so it doesn't compromise recovery on the main training days. This is the most efficient way to specialise without dismantling a sound weekly structure.`,
  }[splitType] ?? `${SPLIT_LABELS[splitType]} was selected to match your ${effectiveDays} days, ${experience} level, and ${GOAL_LABELS[goal] ?? goal} goal.`;

  // ── 2. What this session actually contains ──
  const anchorText = anchorLifts.length >= 2
    ? `${anchorLifts[0]} and ${anchorLifts[1]} anchor your first session`
    : anchorLifts.length === 1
    ? `${anchorLifts[0]} anchors your first session`
    : 'Compound lifts anchor each session';
  const sessionText = `${anchorText} — the highest stimulus-to-fatigue lifts available with ${eqLabel}. Sessions average ${avgExercises} exercises and ${avgSets} sets, structured compounds first while you're fresh, isolation and machine work as fatigue builds.`;

  // ── 3. Session length ──
  const budgetMin = sessionLengthMinutes ?? 60;
  let sessionLengthText;
  if (maxDur <= budgetMin) {
    const spare = budgetMin - Math.round((minDur + maxDur) / 2);
    sessionLengthText = spare >= 10
      ? `Sessions estimate ${durText} — ${spare} minutes inside your ${budgetMin}-minute budget. That buffer covers warm-up sets on heavier compounds and any equipment wait time. Duration is calculated from actual set rep counts, rest periods (${Math.round(150 / 60 * 10) / 10} min for compounds, ${Math.round(75 / 60 * 10) / 10} min for isolation), and setup time per exercise type.`
      : `Sessions estimate ${durText} against your ${budgetMin}-minute budget. Duration is calculated from actual rest periods and rep counts, not a flat approximation.`;
  } else {
    const over = Math.round((minDur + maxDur) / 2) - budgetMin;
    sessionLengthText = `Your ${budgetMin}-minute budget is tight for ${effectiveDays}-day ${SPLIT_LABELS[splitType] ?? splitType}. Accessory exercises were removed back-to-front — compounds preserved, isolation trimmed — until sessions fit. They now estimate ${durText}. Adding ${over} minutes to your budget would restore full volume.`;
  }

  // ── 4. Why these volume targets ──
  const baseMin = min, baseMax = max;
  let volumeText;
  if (mod > 1) {
    volumeText = `At ${experience} level in a surplus, the plan targets ${adjMin}–${adjMax} sets per muscle per week — ${Math.round((mod - 1) * 100)}% above the ${baseMin}–${baseMax} maintenance baseline because surplus calories accelerate recovery and let you absorb more volume productively. Sessions average ${avgSets} sets across ${avgExercises} exercises.`;
  } else if (mod < 1) {
    volumeText = `At ${experience} level on a cut, weekly targets drop to ${adjMin}–${adjMax} sets per muscle — ${Math.round((1 - mod) * 100)}% below the ${baseMin}–${baseMax} maintenance baseline. Reduced calories shrink your recovery window; matching volume to that reduced capacity prevents cumulative fatigue from causing muscle loss. Sessions average ${avgSets} sets.`;
  } else {
    volumeText = `At ${experience} level on maintenance, the plan targets ${adjMin}–${adjMax} sets per muscle per week — the MEV-to-MAV range where training stimulus is high enough to drive progress without exceeding recovery capacity. Sessions average ${avgSets} sets across ${avgExercises} exercises.`;
  }

  // ── Conditional entries — only included when they apply to this person ──
  const result = { split: splitText, sessionComposition: sessionText, sessionLength: sessionLengthText, volume: volumeText };

  // Weak points — only if selected
  if (weakPoints.length) {
    result.weakPoints = `${weakPoints.join(' and ')} ${weakPoints.length === 1 ? 'is' : 'are'} flagged as weak points and receive${weakPoints.length === 1 ? 's' : ''} 25–40% more weekly sets than the baseline for your experience level. That targeted overload, held across the full mesocycle, is how lagging muscles close the gap — the rest of the programme stays at baseline so recovery capacity is directed where you need it most.`;
  }

  // Goal-specific choices — only if non-default
  if (goal === 'aesthetic_v_taper') {
    result.goalChoices = `V-taper goal: extra lateral raise and rear delt sets have been added to your shoulder and back sessions. Shoulder width and upper-back depth are the primary visual levers for a V-taper — these muscles are getting additional volume on top of the baseline structure, which is why shoulder sessions look heavier on isolation work than a standard hypertrophy plan.`;
  } else if (goal === 'strength_hypertrophy') {
    result.goalChoices = `Strength–Hypertrophy goal: your main compound lifts are programmed at 5–8 reps with heavier loading than a standard hypertrophy plan. This rep range builds the strength base that underpins continued hypertrophy at ${experience} level — particularly relevant when accumulated strength becomes the limiting factor for muscle gain.`;
  } else if (goal === 'recomp') {
    result.goalChoices = `Recomposition goal: volume is set at maintenance level rather than the surplus-boosted ceiling. Recomp works by maintaining training stimulus in a small deficit — the ${avgSets}-set average reflects the balance between enough stimulus to retain muscle and little enough volume for deficit recovery to cope.`;
  } else if (goal === 'balanced_bodybuilding') {
    result.goalChoices = `Balanced Bodybuilding goal: sets are distributed so no single muscle group dominates relative to others. This prevents the common imbalances — overdeveloped chest, underdeveloped back, neglected rear delts — that accumulate over years of unstructured training and become hard to reverse.`;
  }

  // Nutrition — only if it modified volume
  if (mod !== 1 && nutritionPhase) {
    const phaseLabel = NUTRITION_PHASE_LABELS[nutritionPhase] ?? nutritionPhase;
    result.nutritionImpact = mod > 1
      ? `${phaseLabel} phase: the caloric surplus supports ${Math.round((mod - 1) * 100)}% more volume than maintenance. More food means faster recovery between sessions — you can absorb more sets productively, which is reflected in the higher ${adjMin}–${adjMax} weekly target.`
      : `${phaseLabel} phase: the ${Math.round((1 - mod) * 100)}% volume reduction keeps weekly targets at ${adjMin}–${adjMax} instead of ${baseMin}–${baseMax}. Training on a deficit means slower recovery — reducing volume prevents the cumulative fatigue that would otherwise cause the muscle loss you're trying to avoid.`;
  }

  // Recovery — only if flagged as poor
  if (recoveryRating === 'poor') {
    result.recoveryNote = `Poor recovery was flagged (sleep or life stress). Volume is set at the lower end of the ${adjMin}–${adjMax} target range and session count is kept at ${effectiveDays} days. Recovery quality limits how much training you can absorb regardless of programme quality — improving sleep and reducing external stressors will raise the ceiling more than adding sets.`;
  }

  return result;
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

  // Finalise every session:
  // 1. Remove duplicate exercises (same lift in compound + isolation slot).
  // 2. Enforce the set-count ceiling (systemic fatigue cap per experience level).
  // 3. Trim further so the session actually fits within the requested time budget,
  //    accounting for set work time, rest periods, setup, and transition buffers.
  // Done after all post-processing so V-taper injections are counted.
  workouts.forEach(w => {
    w.exercises = fitToSessionLength(
      capSessionVolume(deduplicateExercises(w.exercises), experience),
      sessionLengthMinutes,
    );
    w.estimatedDurationMinutes = estimateWorkoutMinutes(w.exercises);
  });

  const warnings             = buildWarnings(planInputs, effectiveDays);
  const weeklyVolumeSummary  = buildVolumeSummary(experience, safeWeakPoints, nutritionPhase, goal, planInputs);
  const personalisationSummary = buildPersonalisationSummary(planInputs, effectiveDays, splitType);
  const whyThis              = buildWhyThis(planInputs, splitType, effectiveDays, workouts);

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
