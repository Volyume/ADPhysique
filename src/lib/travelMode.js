/**
 * travelMode.js
 * Temporary travel plan generator for the Volyume Coach Engine v2.
 *
 * Builds a 1-week plan using limited equipment (bodyweight, dumbbells, hotel gym, resistance bands).
 * Higher reps, shorter rest, same muscle coverage — maintains size while away from the gym.
 *
 * Pure functions — no DB calls, no side effects.
 */

// ---------------------------------------------------------------------------
// Travel equipment pools
// Each exercise has: n (name), sub (subregion), c (compound/isolation), fatigue (1-5)
// ---------------------------------------------------------------------------

const TRAVEL_POOL = {
  bodyweight: {
    chest: [
      { n: 'Push-Up',              sub: 'flat',     c: 'compound',  fatigue: 2 },
      { n: 'Wide Push-Up',         sub: 'flat',     c: 'isolation', fatigue: 2 },
      { n: 'Incline Push-Up',      sub: 'incline',  c: 'compound',  fatigue: 2 },
      { n: 'Decline Push-Up',      sub: 'decline',  c: 'compound',  fatigue: 3 },
    ],
    back: [
      { n: 'Superman Hold',        sub: 'horizontal_row', c: 'compound',  fatigue: 2 },
      { n: 'Doorframe Row',        sub: 'horizontal_row', c: 'compound',  fatigue: 2 },
      { n: 'Pull-Up',              sub: 'vertical_pull',  c: 'compound',  fatigue: 3 },
    ],
    side_delts: [
      { n: 'Pike Push-Up',         sub: 'overhead_press',  c: 'compound', fatigue: 2 },
      { n: 'Wall Handstand Hold',  sub: 'overhead_press',  c: 'compound', fatigue: 3 },
    ],
    rear_delts: [
      { n: 'Reverse Snow Angel',   sub: 'horiz_abduction', c: 'isolation', fatigue: 1 },
      { n: 'Prone Y-T-W',         sub: 'face_pull',        c: 'isolation', fatigue: 2 },
    ],
    biceps: [
      { n: 'Doorframe Curl',       sub: 'supinated_curl', c: 'isolation', fatigue: 2 },
      { n: 'Towel Curl',           sub: 'neutral_curl',   c: 'isolation', fatigue: 2 },
    ],
    triceps: [
      { n: 'Diamond Push-Up',      sub: 'pushdown',  c: 'compound',  fatigue: 2 },
      { n: 'Tricep Dip (Chair)',   sub: 'pushdown',  c: 'compound',  fatigue: 2 },
      { n: 'Close-Grip Push-Up',   sub: 'overhead',  c: 'compound',  fatigue: 2 },
    ],
    quads: [
      { n: 'Bodyweight Squat',     sub: null, c: 'compound', fatigue: 2 },
      { n: 'Jump Squat',           sub: null, c: 'compound', fatigue: 3 },
      { n: 'Bulgarian Split Squat', sub: null, c: 'compound', fatigue: 3 },
      { n: 'Step-Up',              sub: null, c: 'compound', fatigue: 2 },
    ],
    hamstrings: [
      { n: 'Glute Bridge',         sub: 'hip_extension', c: 'compound', fatigue: 2 },
      { n: 'Single-Leg Glute Bridge', sub: 'hip_extension', c: 'compound', fatigue: 2 },
      { n: 'Nordic Hamstring Curl', sub: 'knee_flexion', c: 'compound', fatigue: 3 },
    ],
    glutes: [
      { n: 'Hip Thrust (Bodyweight)', sub: null, c: 'compound', fatigue: 2 },
      { n: 'Donkey Kick',          sub: null, c: 'isolation', fatigue: 1 },
      { n: 'Glute Bridge',         sub: null, c: 'compound', fatigue: 2 },
    ],
    calves: [
      { n: 'Calf Raise (Standing)', sub: 'gastro',  c: 'isolation', fatigue: 1 },
      { n: 'Seated Calf Raise',    sub: 'soleus',   c: 'isolation', fatigue: 1 },
    ],
    abs: [
      { n: 'Crunch',               sub: 'flexion',        c: 'isolation', fatigue: 1 },
      { n: 'Plank',                sub: 'anti_extension', c: 'isolation', fatigue: 1 },
      { n: 'Dead Bug',             sub: 'anti_extension', c: 'isolation', fatigue: 1 },
      { n: 'Bicycle Crunch',       sub: 'rotation',       c: 'isolation', fatigue: 2 },
    ],
  },
};

// Add dumbbell exercises on top of bodyweight
const DUMBBELL_ADDITIONS = {
  chest: [
    { n: 'Dumbbell Press',         sub: 'flat',    c: 'compound', fatigue: 3 },
    { n: 'Dumbbell Incline Press', sub: 'incline', c: 'compound', fatigue: 3 },
    { n: 'Dumbbell Fly',           sub: 'flat',    c: 'isolation', fatigue: 2 },
  ],
  back: [
    { n: 'Dumbbell Row',           sub: 'horizontal_row', c: 'compound', fatigue: 3 },
    { n: 'Dumbbell Pullover',      sub: 'vertical_pull',  c: 'isolation', fatigue: 2 },
  ],
  side_delts: [
    { n: 'Dumbbell Lateral Raise', sub: 'lateral_raise',  c: 'isolation', fatigue: 1 },
    { n: 'Dumbbell Shoulder Press', sub: 'overhead_press', c: 'compound', fatigue: 3 },
  ],
  rear_delts: [
    { n: 'Dumbbell Reverse Fly',   sub: 'horiz_abduction', c: 'isolation', fatigue: 2 },
    { n: 'Dumbbell Face Pull',     sub: 'face_pull',        c: 'isolation', fatigue: 2 },
  ],
  biceps: [
    { n: 'Dumbbell Curl',          sub: 'supinated_curl', c: 'isolation', fatigue: 2 },
    { n: 'Hammer Curl',            sub: 'neutral_curl',   c: 'isolation', fatigue: 2 },
    { n: 'Incline Dumbbell Curl',  sub: 'supinated_curl', c: 'isolation', fatigue: 2 },
  ],
  triceps: [
    { n: 'Dumbbell Overhead Extension', sub: 'overhead', c: 'isolation', fatigue: 2 },
    { n: 'Dumbbell Kickback',      sub: 'pushdown',  c: 'isolation', fatigue: 1 },
  ],
  quads: [
    { n: 'Dumbbell Goblet Squat',  sub: null, c: 'compound', fatigue: 3 },
    { n: 'Dumbbell Lunge',         sub: null, c: 'compound', fatigue: 3 },
    { n: 'Dumbbell Step-Up',       sub: null, c: 'compound', fatigue: 2 },
  ],
  hamstrings: [
    { n: 'Dumbbell Romanian Deadlift', sub: 'hip_extension', c: 'compound', fatigue: 3 },
    { n: 'Dumbbell Stiff-Leg Deadlift', sub: 'hip_extension', c: 'compound', fatigue: 3 },
  ],
  glutes: [
    { n: 'Dumbbell Hip Thrust',    sub: null, c: 'compound', fatigue: 2 },
  ],
  calves: [
    { n: 'Dumbbell Calf Raise',    sub: 'gastro', c: 'isolation', fatigue: 1 },
  ],
  abs: [
    { n: 'Dumbbell Crunch',        sub: 'flexion',   c: 'isolation', fatigue: 1 },
    { n: 'Dumbbell Woodchop',      sub: 'rotation',  c: 'isolation', fatigue: 2 },
  ],
};

// ---------------------------------------------------------------------------
// Equipment pool merger
// ---------------------------------------------------------------------------

function getPool(equipment) {
  const base = TRAVEL_POOL.bodyweight;
  if (equipment === 'bodyweight') return base;

  if (equipment === 'dumbbells' || equipment === 'hotel_gym') {
    const merged = {};
    for (const muscle of Object.keys(base)) {
      merged[muscle] = [
        ...(base[muscle] ?? []),
        ...(DUMBBELL_ADDITIONS[muscle] ?? []),
      ];
    }
    return merged;
  }

  return base;
}

// ---------------------------------------------------------------------------
// Rep / rest parameters for travel mode (higher reps, shorter rest)
// ---------------------------------------------------------------------------

const TRAVEL_SET_PARAMS = {
  compound:  { repsMin: 12, repsMax: 20, restSec: 60 },
  isolation: { repsMin: 15, repsMax: 25, restSec: 45 },
};

// ---------------------------------------------------------------------------
// Main travel plan generator
// ---------------------------------------------------------------------------

/**
 * Generates a 1-week travel plan maintaining muscle coverage with limited equipment.
 *
 * @param {object} options
 * @param {'bodyweight'|'dumbbells'|'hotel_gym'} options.equipment
 * @param {number}  options.daysPerWeek       - 3-5
 * @param {number}  options.sessionLengthMinutes
 * @param {string}  options.splitType         - 'full_body' | 'upper_lower' | 'ppl'
 * @param {number}  [options.weeks]           - default 1
 * @returns {{
 *   name: string,
 *   equipment: string,
 *   note: string,
 *   sessions: Array<{ name: string, exercises: Array }>
 * }}
 */
export function generateTravelPlan({
  equipment = 'bodyweight',
  daysPerWeek = 4,
  sessionLengthMinutes = 45,
  splitType = 'full_body',
  weeks = 1,
} = {}) {
  const pool = getPool(equipment);
  const safeDays = Math.min(Math.max(2, daysPerWeek), 5);
  const sessions = buildTravelSessions(pool, safeDays, sessionLengthMinutes, splitType);

  const equipmentLabel = {
    bodyweight: 'Bodyweight only',
    dumbbells:  'Dumbbells',
    hotel_gym:  'Hotel gym (dumbbells + cables)',
  }[equipment] ?? equipment;

  return {
    name: `${weeks === 1 ? 'Travel Week' : `${weeks}-Week Travel Block`}: ${equipmentLabel}`,
    equipment,
    weeks,
    note: `Higher reps and shorter rest maintain your muscle while you're away from the gym. Same effort, different tools.`,
    sessions,
  };
}

// ---------------------------------------------------------------------------
// Session builder
// ---------------------------------------------------------------------------

function buildTravelSessions(pool, daysPerWeek, sessionLengthMinutes, splitType) {
  if (splitType === 'upper_lower' && daysPerWeek >= 4) {
    return buildUpperLowerTravel(pool, daysPerWeek, sessionLengthMinutes);
  }
  if (splitType === 'ppl' && daysPerWeek >= 3) {
    return buildPPLTravel(pool, daysPerWeek, sessionLengthMinutes);
  }
  return buildFullBodyTravel(pool, daysPerWeek, sessionLengthMinutes);
}

function pickExercise(pool, muscle, excluded = new Set()) {
  const candidates = (pool[muscle] ?? []).filter(e => !excluded.has(e.n));
  if (!candidates.length) return null;
  return candidates[0]; // deterministic — first in pool for travel
}

function makeExEntry(poolEntry, sets) {
  const params = TRAVEL_SET_PARAMS[poolEntry.c ?? 'isolation'];
  return {
    exerciseName:        poolEntry.n,
    sets,
    repsMin:             params.repsMin,
    repsMax:             params.repsMax,
    restSec:             params.restSec,
    compoundIsolation:   poolEntry.c,
    notes:               'Higher rep range. Focus on squeezing the muscle, not just moving weight.',
  };
}

function buildFullBodyTravel(pool, daysPerWeek, sessionLengthMins) {
  const muscles = ['chest', 'back', 'side_delts', 'biceps', 'triceps', 'quads', 'hamstrings', 'abs'];
  const sessions = [];
  for (let d = 0; d < daysPerWeek; d++) {
    const exercises = [];
    for (const muscle of muscles) {
      const ex = pickExercise(pool, muscle);
      if (ex) exercises.push(makeExEntry(ex, 3));
    }
    sessions.push({ name: `Full Body ${d + 1}`, exercises });
  }
  return sessions;
}

function buildUpperLowerTravel(pool, daysPerWeek, sessionLengthMins) {
  const upperMuscles = ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps'];
  const lowerMuscles = ['quads', 'hamstrings', 'glutes', 'calves', 'abs'];
  const sessions = [];

  for (let d = 0; d < daysPerWeek; d++) {
    const isUpper = d % 2 === 0;
    const muscles = isUpper ? upperMuscles : lowerMuscles;
    const exercises = [];
    for (const muscle of muscles) {
      const ex = pickExercise(pool, muscle);
      if (ex) exercises.push(makeExEntry(ex, 3));
    }
    sessions.push({ name: isUpper ? `Upper Body ${Math.floor(d / 2) + 1}` : `Lower Body ${Math.floor(d / 2) + 1}`, exercises });
  }
  return sessions;
}

function buildPPLTravel(pool, daysPerWeek, sessionLengthMins) {
  const pushMuscles  = ['chest', 'side_delts', 'triceps'];
  const pullMuscles  = ['back', 'rear_delts', 'biceps'];
  const legsMuscles  = ['quads', 'hamstrings', 'glutes', 'calves', 'abs'];

  const patterns = ['Push', 'Pull', 'Legs'];
  const muscleSets = [pushMuscles, pullMuscles, legsMuscles];
  const sessions = [];

  for (let d = 0; d < daysPerWeek; d++) {
    const idx = d % 3;
    const exercises = [];
    for (const muscle of muscleSets[idx]) {
      const ex = pickExercise(pool, muscle);
      if (ex) exercises.push(makeExEntry(ex, 4));
    }
    sessions.push({ name: `${patterns[idx]} ${Math.floor(d / 3) + 1}`, exercises });
  }
  return sessions;
}

// ---------------------------------------------------------------------------
// Equipment labels
// ---------------------------------------------------------------------------

export const TRAVEL_EQUIPMENT_OPTIONS = [
  { key: 'bodyweight', label: 'Bodyweight only' },
  { key: 'dumbbells',  label: 'Dumbbells' },
  { key: 'hotel_gym',  label: 'Hotel gym (dumbbells + cables)' },
];
