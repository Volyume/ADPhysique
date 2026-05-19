/**
 * planEngine.js  v2
 * Deterministic hypertrophy plan generation engine.
 * Pure functions only — no side effects, no DB calls, no Math.random().
 */

// ---------------------------------------------------------------------------
// Public label maps
// ---------------------------------------------------------------------------

export const GOAL_LABELS = {
  general_hypertrophy:   'Build Muscle',
  balanced_bodybuilding: 'Balanced Bodybuilding',
  aesthetic_v_taper:     'Aesthetic / V-Taper',
  weak_point_spec:       'Weak Point Specialisation',
  strength_hypertrophy:  'Strength + Size',
  recomp:                'Fat Loss / Recomp Support',
  x_frame_physique:      'X-Frame Physique',
};

export const SPLIT_LABELS = {
  full_body:       'Full Body',
  upper_lower:     'Upper / Lower',
  ppl:             'Push / Pull / Legs',
  ppl_ab:          'PPL A/B (6-day)',
  upper_lower_wp:  'Upper / Lower + Weak-Point Day',
};

// ---------------------------------------------------------------------------
// Weak-point UI label → internal muscle key
// ---------------------------------------------------------------------------

const WEAK_POINT_MAP = {
  'Chest':            'chest',
  'Upper Chest':      'chest',
  'Lats / Back Width':'back',
  'Back Thickness':   'back',
  'Side Delts':       'side_delts',
  'Rear Delts':       'rear_delts',
  'Front Delts':      'front_delts',
  'Biceps':           'biceps',
  'Triceps':          'triceps',
  'Quads':            'quads',
  'Hamstrings':       'hamstrings',
  'Glutes':           'glutes',
  'Calves':           'calves',
  'Core / Abs':       'abs',
  'Traps':            'traps',
};

function resolveWeakPointKeys(uiLabels) {
  const keys = [];
  for (const label of uiLabels) {
    const key = WEAK_POINT_MAP[label];
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Volume landmarks (v2 — intermediate baseline)
// ---------------------------------------------------------------------------

// muscle: { MV, MEV, MRV }
const LANDMARKS = {
  chest:       { MV: 4,  MEV: 8,  MRV: 22 },
  back:        { MV: 8,  MEV: 10, MRV: 25 },
  front_delts: { MV: 0,  MEV: 0,  MRV: 12 },
  side_delts:  { MV: 0,  MEV: 8,  MRV: 26 },
  rear_delts:  { MV: 0,  MEV: 6,  MRV: 22 },
  biceps:      { MV: 5,  MEV: 8,  MRV: 22 },
  triceps:     { MV: 4,  MEV: 6,  MRV: 18 },
  forearms:    { MV: 2,  MEV: 4,  MRV: 14 },
  quads:       { MV: 6,  MEV: 8,  MRV: 20 },
  hamstrings:  { MV: 4,  MEV: 6,  MRV: 20 },
  glutes:      { MV: 0,  MEV: 4,  MRV: 16 },
  calves:      { MV: 6,  MEV: 8,  MRV: 20 },
  abs:         { MV: 0,  MEV: 6,  MRV: 25 },
  traps:       { MV: 0,  MEV: 4,  MRV: 20 },
};

// ---------------------------------------------------------------------------
// Autoregulation multiplier tables
// ---------------------------------------------------------------------------

const EXP_MULT = {
  beginner:     { MEV: 0.70, MRV: 0.75 },
  intermediate: { MEV: 1.00, MRV: 1.00 },
  advanced:     { MEV: 1.15, MRV: 1.10 },
  competitive:  { MEV: 1.25, MRV: 1.15 },
};

const REC_MULT = {
  poor:    { MEV: 1.10, MRV: 0.80 },
  average: { MEV: 1.00, MRV: 1.00 },
  good:    { MEV: 0.95, MRV: 1.15 },
};

const NUT_MULT = {
  lean_gain:      { MEV: 0.95, MRV: 1.10 },
  build:          { MEV: 0.95, MRV: 1.10 },
  maintain:       { MEV: 1.00, MRV: 1.00 },
  recomp:         { MEV: 1.00, MRV: 1.00 },
  mild_cut:       { MEV: 1.00, MRV: 0.90 },
  aggressive_cut: { MEV: 1.05, MRV: 0.80 },
  contest_prep:   { MEV: 1.10, MRV: 0.70 },
};

function ageMultipliers(age) {
  if (age == null || (age >= 30 && age < 40)) return { MEV: 1.00, MRV: 1.00 };
  if (age < 30)  return { MEV: 1.00, MRV: 1.05 };
  if (age < 50)  return { MEV: 1.00, MRV: 0.92 };
  if (age < 60)  return { MEV: 1.05, MRV: 0.85 };
  return          { MEV: 1.10, MRV: 0.75 };
}

function computeLandmarks(experience, recoveryRating, nutritionPhase, age) {
  const mExp = EXP_MULT[experience]    ?? EXP_MULT.intermediate;
  const mRec = REC_MULT[recoveryRating] ?? REC_MULT.average;
  const mNut = NUT_MULT[nutritionPhase] ?? { MEV: 1.00, MRV: 1.00 };
  const mAge = ageMultipliers(age);

  const result = {};
  for (const [muscle, base] of Object.entries(LANDMARKS)) {
    let MEVadj = Math.round(base.MEV * mExp.MEV * mRec.MEV * mNut.MEV * mAge.MEV);
    let MRVadj = Math.round(base.MRV * mExp.MRV * mRec.MRV * mNut.MRV * mAge.MRV);

    // Clash guard
    if (MEVadj >= MRVadj) MEVadj = Math.max(2, MRVadj - 2);
    // Floor for non-zero-MEV muscles
    if (MRVadj < 4 && base.MEV > 0) { MRVadj = 4; MEVadj = 2; }

    const MAVlow  = MEVadj + 2;
    const MAVhigh = Math.max(MAVlow, MRVadj - 1);
    result[muscle] = { MV: base.MV, MEV: MEVadj, MAVlow, MAVhigh, MRV: MRVadj };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Goal overlays
// ---------------------------------------------------------------------------

function applyGoalOverlay(weeklyTargets, landmarks, goal, weakPointKeys) {
  const t = { ...weeklyTargets };

  if (goal === 'balanced_bodybuilding') {
    const boosts = {
      side_delts: 1.15, back: 1.15, biceps: 1.15, triceps: 1.10,
      calves: 1.10, rear_delts: 1.10, hamstrings: 1.05,
    };
    for (const [m, mult] of Object.entries(boosts)) {
      if (t[m] != null) t[m] = Math.round(t[m] * mult);
    }
  } else if (goal === 'aesthetic_v_taper') {
    t.side_delts  = Math.min(Math.round(t.side_delts  * 1.30), Math.round(landmarks.side_delts.MRV  * 1.10));
    t.rear_delts  = Math.round(t.rear_delts  * 1.20);
    t.back        = Math.round(t.back        * 1.15);
    t.biceps      = Math.round(t.biceps      * 1.10);
    t.abs         = Math.min(8, Math.round(t.abs * 0.75));
    t.traps       = Math.round(t.traps       * 0.80);
  } else if (goal === 'x_frame_physique') {
    t.side_delts  = Math.min(Math.round(t.side_delts  * 1.35), Math.round(landmarks.side_delts.MRV  * 1.10));
    t.back        = Math.min(Math.round(t.back        * 1.25), Math.round(landmarks.back.MRV        * 1.10));
    t.rear_delts  = Math.round(t.rear_delts  * 1.20);
    t.glutes      = Math.min(Math.round(t.glutes      * 1.30), Math.round(landmarks.glutes.MRV      * 1.10));
    t.hamstrings  = Math.round(t.hamstrings  * 1.20);
    t.chest       = Math.round(t.chest       * 1.10);
    t.abs         = Math.min(6, Math.round(t.abs * 0.60));
  } else if (goal === 'weak_point_spec') {
    for (const m of Object.keys(t)) {
      if (weakPointKeys.includes(m)) {
        t[m] = Math.max(landmarks[m].MEV, landmarks[m].MRV - 2);
      } else {
        t[m] = landmarks[m].MV;
      }
    }
  } else if (goal === 'strength_hypertrophy') {
    for (const m of Object.keys(t)) {
      t[m] = Math.round(t[m] * 0.85);
    }
  }
  // recomp / general_hypertrophy: no change

  // Clamp each muscle to 110% of its MRV
  for (const m of Object.keys(t)) {
    const cap = Math.round(landmarks[m].MRV * 1.10);
    t[m] = Math.min(t[m], cap);
  }

  // Systemic ceiling: total sets ≤ 130
  const total = Object.values(t).reduce((s, v) => s + v, 0);
  if (total > 130) {
    const scale = 130 / total;
    for (const m of Object.keys(t)) {
      t[m] = Math.max(0, Math.round(t[m] * scale));
    }
  }

  return t;
}

// ---------------------------------------------------------------------------
// Exercise pool
// ---------------------------------------------------------------------------

// Entry: { n: name, sub: subregion, p: paramKey, eq: [equipment...] }
// paramKey: 'heavy_compound' | 'mod_compound' | 'machine' | 'isolation'

const POOL = {
  chest: [
    { n: 'Barbell Bench Press',            sub: 'flat',    p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Incline Barbell Bench Press',    sub: 'incline', p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Incline Dumbbell Press',         sub: 'incline', p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Dumbbell Bench Press',           sub: 'flat',    p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Machine Chest Press',            sub: 'flat',    p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Incline Machine Press',          sub: 'incline', p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Smith Machine Bench Press',      sub: 'flat',    p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Weighted Dips (Chest)',          sub: 'lower',   p: 'mod_compound',   eq: ['full_gym', 'bodyweight', 'barbell_plates'] },
    { n: 'Push-Up',                        sub: 'flat',    p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym', 'bodyweight', 'barbell_plates'] },
    { n: 'Cable Crossover (High to Low)',  sub: 'flat',    p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Pec Deck (Machine Fly)',         sub: 'flat',    p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Fly (Low to High)',        sub: 'incline', p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Fly',                   sub: 'flat',    p: 'isolation',      eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Incline Dumbbell Fly',           sub: 'incline', p: 'isolation',      eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  back: [
    { n: 'Lat Pulldown (Wide Grip)',       sub: 'vertical_pull',   p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Pull-Up',                        sub: 'vertical_pull',   p: 'mod_compound',   eq: ['full_gym', 'home_gym', 'bodyweight', 'barbell_plates'] },
    { n: 'Weighted Pull-Up',               sub: 'vertical_pull',   p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Chin-Up',                        sub: 'vertical_pull',   p: 'mod_compound',   eq: ['full_gym', 'home_gym', 'bodyweight'] },
    { n: 'Lat Pulldown (Close Grip)',      sub: 'vertical_pull',   p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Single-Arm Lat Pulldown',        sub: 'vertical_pull',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable High Row',                 sub: 'vertical_pull',   p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Barbell Row (Bent Over)',        sub: 'horizontal_row',  p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'T-Bar Row',                      sub: 'horizontal_row',  p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Seated Cable Row',               sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Row',                   sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Machine Row (Chest Supported)',  sub: 'horizontal_row',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Chest-Supported Row (Dumbbell)',sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Inverted Row',                   sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'home_gym', 'bodyweight'] },
    { n: 'Pendlay Row',                    sub: 'horizontal_row',  p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Seal Row',                       sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'barbell_plates'] },
    { n: 'Landmine Row',                   sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'barbell_plates'] },
    { n: 'Seated Machine Row (Wide)',      sub: 'horizontal_row',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Single-Arm Cable Row',           sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Straight-Arm Pulldown',   sub: 'lower_lat',       p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Lat Pullover',             sub: 'lower_lat',       p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
  ],
  side_delts: [
    { n: 'Cable Lateral Raise',    sub: 'side', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Lateral Raise', sub: 'side', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Machine Lateral Raise',  sub: 'side', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Leaning Lateral Raise',  sub: 'side', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  rear_delts: [
    { n: 'Face Pull',                       sub: 'face_pull',       p: 'isolation', eq: ['full_gym', 'machines_cables', 'barbell_plates'] },
    { n: 'Reverse Pec Deck',                sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Rear Delt Fly',             sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Rear Delt Fly',          sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Dumbbell Side-Lying Rear Delt',   sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Lying Rear Delt Row',             sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  front_delts: [
    { n: 'Barbell Overhead Press',    sub: 'press',        p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Dumbbell Shoulder Press',   sub: 'press',        p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Machine Shoulder Press',    sub: 'press',        p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Arnold Press',              sub: 'press',        p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Seated Dumbbell Press',     sub: 'press',        p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Dumbbell Front Raise',      sub: 'front_raise',  p: 'isolation',      eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
  ],
  biceps: [
    { n: 'Incline Dumbbell Curl',        sub: 'long_head',  p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Spider Curl',                  sub: 'long_head',  p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Prone Incline Curl',           sub: 'long_head',  p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Barbell Curl',                 sub: 'short_head', p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'EZ Bar Curl',                  sub: 'short_head', p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Preacher Curl (EZ Bar)',       sub: 'short_head', p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Cable Curl',                   sub: 'short_head', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Machine Curl',                 sub: 'short_head', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Curl',                sub: 'short_head', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Concentration Curl',           sub: 'short_head', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Hammer Curl',                  sub: 'brachialis', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Cable Hammer Curl (Rope)',     sub: 'brachialis', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Zottman Curl',                 sub: 'brachialis', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Cross-Body Hammer Curl',       sub: 'brachialis', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  triceps: [
    { n: 'Overhead Cable Tricep Extension', sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'EZ Bar Skull Crusher',            sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'barbell_plates'] },
    { n: 'Overhead Dumbbell Extension',     sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'JM Press',                        sub: 'overhead', p: 'mod_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Lying Tricep Extension',          sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Decline Skull Crusher',           sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'barbell_plates'] },
    { n: 'Rope Pushdown',                   sub: 'lateral',  p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Pushdown (Straight Bar)',   sub: 'lateral',  p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'Machine Tricep Extension',        sub: 'lateral',  p: 'machine',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Close-Grip Bench Press',          sub: 'lateral',  p: 'mod_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Weighted Dips (Triceps)',         sub: 'lateral',  p: 'mod_compound', eq: ['full_gym', 'bodyweight', 'barbell_plates'] },
    { n: 'Diamond Push-Up',                 sub: 'lateral',  p: 'mod_compound', eq: ['full_gym', 'bodyweight', 'home_gym', 'dumbbells_only'] },
    { n: 'Tate Press',                      sub: 'lateral',  p: 'isolation',    eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  quads: [
    { n: 'Barbell Back Squat',      sub: 'vasti',   p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Leg Press',               sub: 'vasti',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Hack Squat Machine',      sub: 'vasti',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Pendulum Squat',          sub: 'vasti',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Barbell Front Squat',     sub: 'rectus',  p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Bulgarian Split Squat',   sub: 'vasti',   p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Smith Machine Squat',     sub: 'vasti',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Goblet Squat',            sub: 'vasti',   p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Dumbbell Lunge',          sub: 'vasti',   p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Walking Lunge',           sub: 'vasti',   p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Leg Extension',           sub: 'rectus',  p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Sissy Squat',             sub: 'rectus',  p: 'isolation',      eq: ['full_gym', 'bodyweight', 'home_gym'] },
  ],
  hamstrings: [
    { n: 'Romanian Deadlift (Barbell)',    sub: 'hip_extension', p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Romanian Deadlift (Dumbbell)',   sub: 'hip_extension', p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Single-Leg Romanian Deadlift',   sub: 'hip_extension', p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Good Morning',                   sub: 'hip_extension', p: 'mod_compound',   eq: ['full_gym', 'barbell_plates'] },
    { n: 'Stiff-Leg Deadlift',             sub: 'hip_extension', p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Lying Leg Curl',                 sub: 'knee_flexion',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Seated Leg Curl',                sub: 'knee_flexion',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Nordic Hamstring Curl',          sub: 'knee_flexion',  p: 'isolation',      eq: ['full_gym', 'bodyweight', 'home_gym'] },
    { n: 'Standing Leg Curl',              sub: 'knee_flexion',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Swiss Ball Leg Curl',            sub: 'knee_flexion',  p: 'isolation',      eq: ['full_gym', 'bodyweight', 'home_gym', 'dumbbells_only'] },
  ],
  glutes: [
    { n: 'Barbell Hip Thrust',        sub: 'glute_max', p: 'mod_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Smith Machine Hip Thrust',  sub: 'glute_max', p: 'machine',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Hip Thrust',       sub: 'glute_max', p: 'mod_compound', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Cable Pull-Through',        sub: 'glute_max', p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'Glute Bridge',              sub: 'glute_max', p: 'mod_compound', eq: ['full_gym', 'bodyweight', 'home_gym', 'dumbbells_only'] },
    { n: 'Step-Up (Dumbbell)',        sub: 'glute_max', p: 'mod_compound', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Abductor Machine',          sub: 'glute_med', p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Hip Abduction',       sub: 'glute_med', p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
  ],
  calves: [
    { n: 'Standing Calf Raise (Machine)',      sub: 'gastro', p: 'isolation', eq: ['full_gym', 'machines_cables', 'barbell_plates'] },
    { n: 'Dumbbell Calf Raise (Standing)',     sub: 'gastro', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Leg Press Calf Raise',               sub: 'gastro', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Single-Leg Calf Raise (Bodyweight)', sub: 'gastro', p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'dumbbells_only', 'barbell_plates', 'machines_cables'] },
    { n: 'Seated Calf Raise',                  sub: 'soleus', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
  ],
  abs: [
    { n: 'Cable Crunch',        sub: 'flexion',        p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Hanging Leg Raise',   sub: 'flexion',        p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'barbell_plates'] },
    { n: 'Decline Crunch',      sub: 'flexion',        p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'barbell_plates'] },
    { n: 'Leg Raise (Flat Bench)', sub: 'flexion',     p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'barbell_plates'] },
    { n: 'Ab Rollout',          sub: 'anti_extension', p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym'] },
    { n: 'Plank',               sub: 'anti_extension', p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'dumbbells_only', 'barbell_plates', 'machines_cables'] },
    { n: 'Side Plank',          sub: 'anti_rotation',  p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'dumbbells_only', 'barbell_plates', 'machines_cables'] },
    { n: 'Pallof Press',        sub: 'anti_rotation',  p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Woodchop',      sub: 'anti_rotation',  p: 'isolation', eq: ['full_gym', 'machines_cables'] },
  ],
  traps: [
    { n: 'Barbell Shrug',                 sub: 'upper',     p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Dumbbell Shrug',                sub: 'upper',     p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Cable Shrug',                   sub: 'upper',     p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Face Pull (Rope)',              sub: 'mid_lower', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Y-Raise (Prone)',         sub: 'mid_lower', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
  ],
};

// ---------------------------------------------------------------------------
// Subregion coverage requirements (weekly-level)
// ---------------------------------------------------------------------------

const SUBREGION_REQUIREMENTS = {
  back:       { minSets: 6,  required: ['vertical_pull', 'horizontal_row'] },
  hamstrings: { minSets: 6,  required: ['hip_extension', 'knee_flexion'] },
  chest:      { minSets: 10, required: ['incline', 'flat'] },  // flat covers flat+lower
  rear_delts: { minSets: 6,  required: ['face_pull', 'horiz_abduction'] },
  triceps:    { minSets: 8,  required: ['overhead'] },
  calves:     { minSets: 10, required: ['gastro', 'soleus'] },
  abs:        { minSets: 10, required: ['flexion', 'anti_extension'] },
};

// ---------------------------------------------------------------------------
// Session time parameters
// ---------------------------------------------------------------------------

const REST_SEC = {
  heavy_compound: 180,
  mod_compound:   150,
  machine:        120,
  isolation:       75,
};

const TRANS_SEC = {
  full_gym:       120,
  machines_cables: 90,
  home_gym:        60,
  dumbbells_only:  45,
  barbell_plates:  75,
  bodyweight:      30,
};

// ---------------------------------------------------------------------------
// makeEx — build one exercise entry
// ---------------------------------------------------------------------------

const REP_RANGES = {
  heavy_compound: { repMin: 5,  repMax: 9  },
  mod_compound:   { repMin: 8,  repMax: 12 },
  machine:        { repMin: 8,  repMax: 15 },
  isolation:      { repMin: 10, repMax: 20 },
};

const STRENGTH_REP_RANGES = {
  heavy_compound: { repMin: 4,  repMax: 6  },
  mod_compound:   { repMin: 5,  repMax: 8  },
  machine:        { repMin: 8,  repMax: 12 },
  isolation:      { repMin: 10, repMax: 15 },
};

const STRENGTH_REST = {
  heavy_compound: 210,
  mod_compound:   180,
  machine:        120,
  isolation:       75,
};

function baseRir(experience) {
  if (experience === 'beginner')     return 3;
  if (experience === 'intermediate') return 2;
  return 1;
}

function makeEx(name, paramKey, sets, experience, nutritionPhase, goal = null, notes = null) {
  const isStrength = goal === 'strength_hypertrophy';
  const rr = isStrength ? (STRENGTH_REP_RANGES[paramKey] ?? STRENGTH_REP_RANGES.isolation)
                        : (REP_RANGES[paramKey] ?? REP_RANGES.isolation);
  const rest = isStrength ? (STRENGTH_REST[paramKey] ?? REST_SEC[paramKey] ?? 75)
                          : (REST_SEC[paramKey] ?? 75);
  let rir = baseRir(experience);
  const cutPhases = ['mild_cut', 'aggressive_cut', 'contest_prep'];
  if (cutPhases.includes(nutritionPhase)) rir = Math.min(rir + 1, 4);

  return {
    exerciseName: name,
    sets: Math.max(2, sets),
    repMin: rr.repMin,
    repMax: rr.repMax,
    restSec: rest,
    rirTarget: rir,
    notes: notes ?? null,
  };
}

// ---------------------------------------------------------------------------
// Time budget calculation and trimming
// ---------------------------------------------------------------------------

export function estimateWorkoutMinutes(exercises) {
  if (!exercises || exercises.length === 0) return 0;
  const T_SET_LOG = 60;
  let totalSec = 7.5 * 60; // overhead base

  const numCompounds = exercises.filter(e => e.restSec >= 150).length;
  const overheadMin = 7.5 + Math.max(0, numCompounds - 1);
  let sessionSec = overheadMin * 60;

  for (const ex of exercises) {
    sessionSec += ex.sets * T_SET_LOG + (ex.sets - 1) * ex.restSec;
  }
  return Math.ceil(sessionSec / 60);
}

function estimateSessionMinutes(exercises, equipment) {
  if (!exercises || exercises.length === 0) return 0;
  const T_SET_LOG = 60;
  const trans = TRANS_SEC[equipment] ?? 90;
  const numCompounds = exercises.filter(e => e.restSec >= 150).length;
  const overheadMin = 7.5 + Math.max(0, numCompounds - 1);

  let sessionSec = overheadMin * 60;
  for (const ex of exercises) {
    sessionSec += ex.sets * T_SET_LOG + (ex.sets - 1) * ex.restSec;
  }
  if (exercises.length > 1) {
    sessionSec += (exercises.length - 1) * trans;
  }
  return sessionSec / 60;
}

function trimToTimeBudget(exercises, sessionLengthMinutes, equipment) {
  if (!sessionLengthMinutes || sessionLengthMinutes <= 0) return exercises;
  const budget = sessionLengthMinutes - 2;
  if (estimateSessionMinutes(exercises, equipment) <= budget) return exercises;

  const result = exercises.map(e => ({ ...e }));

  // Phase 1: reduce sets back-to-front, min 2 sets
  let safety = 120;
  while (estimateSessionMinutes(result, equipment) > budget && safety-- > 0) {
    let trimmed = false;
    for (let i = result.length - 1; i >= 1; i--) {
      if (result[i].sets > 2) {
        result[i].sets--;
        trimmed = true;
        break;
      }
    }
    if (!trimmed) break;
  }

  // Phase 2: drop whole exercises, lowest-priority first. Protections:
  //  - never the first exercise of the session
  //  - never an exercise that covers a required subregion (_req)
  //  - never a muscle's only remaining exercise (keeps every targeted
  //    muscle represented — better a few minutes over budget than a
  //    muscle group with zero direct volume)
  // If nothing is safely removable we stop and accept a small overage;
  // the displayed duration is an estimate, not a hard cap.
  let safety2 = 60;
  while (estimateSessionMinutes(result, equipment) > budget && result.length > 3 && safety2-- > 0) {
    let removeIdx = -1;
    for (let i = result.length - 1; i >= 1; i--) {
      const ex = result[i];
      if (ex._req) continue;
      const muscleCount = result.filter(x => x._m === ex._m).length;
      if (muscleCount <= 1) continue; // sole exercise for its muscle — protect
      removeIdx = i;
      break;
    }
    if (removeIdx === -1) break;
    result.splice(removeIdx, 1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Exercise selection helpers
// ---------------------------------------------------------------------------

function filterPool(muscle, equipment, goal) {
  const pool = POOL[muscle] ?? [];
  let filtered = pool.filter(e => e.eq.includes(equipment));

  // aesthetic_v_taper + abs: only anti_extension / anti_rotation
  if (goal === 'aesthetic_v_taper' && muscle === 'abs') {
    filtered = filtered.filter(e => e.sub === 'anti_extension' || e.sub === 'anti_rotation');
  }
  return filtered;
}

// Deterministic index-based pick (no randomness)
function pickAt(arr, index) {
  if (!arr || arr.length === 0) return null;
  return arr[index % arr.length];
}

// Preferred subregions for back lat-width emphasis (v-taper)
const VTAPER_BACK_PREFERRED = ['vertical_pull', 'lower_lat'];

function selectExercisesForMuscle(muscle, sessionTarget, equipment, goal, slot, usedNames, weeklyTotalSets, landmarks, experience, nutritionPhase) {
  if (sessionTarget < 2) return [];

  const available = filterPool(muscle, equipment, goal);
  if (available.length === 0) return [];

  // Determine subregion priority
  const req = SUBREGION_REQUIREMENTS[muscle];
  const requiredSubs = req && weeklyTotalSets >= req.minSets ? req.required : [];
  const vtaperBackPref = (goal === 'aesthetic_v_taper' && muscle === 'back') ? VTAPER_BACK_PREFERRED : [];

  // Sort: required subregion first → goal-preferred subregion → compound before isolation → pool index
  function sortScore(e, idx) {
    const reqBonus    = requiredSubs.includes(e.sub) ? 0 : 100;
    const prefBonus   = vtaperBackPref.includes(e.sub) ? 0 : 50;
    const paramOrder  = { heavy_compound: 0, mod_compound: 1, machine: 2, isolation: 3 };
    const paramBonus  = (paramOrder[e.p] ?? 3) * 10;
    return reqBonus + prefBonus + paramBonus + idx;
  }

  const sorted = available
    .map((e, idx) => ({ e, score: sortScore(e, idx) }))
    .sort((a, b) => a.score - b.score)
    .map(x => x.e);

  // Determine how many exercises this session can hold for this muscle.
  // (Computed BEFORE covering subregions so we can rotate requirements by slot.)
  let numEx;
  if (sessionTarget <= 4)      numEx = 1;
  else if (sessionTarget <= 7) numEx = 2;
  else                          numEx = 3;

  const covered = new Set();
  const chosen = [];

  // Pass 1: cover required subregions.
  // When the session can't fit every required subregion (e.g. hamstrings at
  // 3 sets/session can only hold 1 exercise but needs hip-extension AND
  // knee-flexion), rotate which subregions this session covers by slot so the
  // WEEK satisfies the requirement — Lower A does the leg curl, Lower B the
  // RDL. This is the back-day / hamstring-day balance fix from the spec.
  let subsToCover = requiredSubs;
  if (requiredSubs.length > numEx) {
    subsToCover = [];
    for (let k = 0; k < numEx; k++) {
      subsToCover.push(requiredSubs[(slot + k) % requiredSubs.length]);
    }
  }
  for (const sub of subsToCover) {
    if (chosen.length >= numEx) break;
    const candidate = sorted.find(e => e.sub === sub && !usedNames.has(e.n));
    if (candidate) {
      chosen.push(candidate);
      covered.add(sub);
      usedNames.add(candidate.n);
    }
  }

  // Pass 2: fill remaining slots via slot rotation
  for (const e of sorted) {
    if (chosen.length >= numEx) break;
    if (usedNames.has(e.n)) continue;
    // RDL/SLDL guardrail — never both in the same session
    if (muscle === 'hamstrings') {
      const hasRdl  = chosen.some(x => x.n === 'Romanian Deadlift (Barbell)');
      const hasSldl = chosen.some(x => x.n === 'Stiff-Leg Deadlift');
      if (e.n === 'Stiff-Leg Deadlift' && hasRdl) continue;
      if (e.n === 'Romanian Deadlift (Barbell)' && hasSldl) continue;
    }
    chosen.push(e);
    usedNames.add(e.n);
  }

  // Fallback: if still empty, allow an already-used pick (vary by slot)
  if (chosen.length === 0 && sorted.length > 0) {
    chosen.push(sorted[slot % sorted.length]);
  }

  // Distribute sessionTarget sets across all chosen exercises, reserving a
  // minimum of 2 sets for every chosen exercise so a required-subregion
  // exercise can never be silently starved of volume.
  const n = chosen.length;
  const result = [];
  let remaining = sessionTarget;
  for (let i = 0; i < n; i++) {
    const entry = chosen[i];
    const isCompound = entry.p === 'heavy_compound' || entry.p === 'mod_compound';
    const slotsAfter = n - i - 1;
    const maxForThis = remaining - 2 * slotsAfter; // keep 2 for each later exercise
    let s = Math.min(maxForThis, isCompound ? 4 : 3);
    s = Math.max(2, s);
    remaining -= s;
    const exObj = makeEx(entry.n, entry.p, s, experience, nutritionPhase, goal, null);
    // Internal-only tags consumed by trimToTimeBudget, stripped before output.
    exObj._m = muscle;                              // owning muscle
    exObj._req = covered.has(entry.sub) && requiredSubs.includes(entry.sub); // covers a required subregion
    result.push(exObj);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Split selection
// ---------------------------------------------------------------------------

function selectSplit(experience, effectiveDays, goal) {
  if (effectiveDays === 3) {
    return (experience === 'advanced' || experience === 'competitive') ? 'ppl' : 'full_body';
  }
  if (effectiveDays === 4) return 'upper_lower';
  if (effectiveDays === 5) {
    return goal === 'weak_point_spec' ? 'upper_lower_wp' : 'ppl';
  }
  return 'ppl_ab';
}

// ---------------------------------------------------------------------------
// Session builders
// ---------------------------------------------------------------------------

function buildSession(name, muscles, sessionsPerMuscle, weeklyTargets, equipment, goal, slot, usedNamesByMuscle, experience, nutritionPhase, landmarks) {
  const exercises = [];

  for (const muscle of muscles) {
    const wTarget = weeklyTargets[muscle] ?? 0;
    const sessions = sessionsPerMuscle[muscle] ?? 1;
    const sessionTarget = Math.min(8, Math.round(wTarget / sessions));
    if (sessionTarget < 2) continue;

    const usedNames = usedNamesByMuscle[muscle] ?? new Set();
    const exs = selectExercisesForMuscle(
      muscle, sessionTarget, equipment, goal, slot,
      usedNames, wTarget, landmarks, experience, nutritionPhase
    );
    usedNamesByMuscle[muscle] = usedNames;
    exercises.push(...exs);
  }

  return { name, exercises };
}

// ---------------------------------------------------------------------------
// Split-specific workout array builders
// ---------------------------------------------------------------------------

function buildFullBodyWorkouts(weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase, effectiveDays) {
  const muscles = ['quads', 'hamstrings', 'glutes', 'chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'abs', 'calves'];
  const sessionsPerMuscle = {};
  for (const m of muscles) sessionsPerMuscle[m] = effectiveDays;

  const labels = ['Full Body A', 'Full Body B', 'Full Body C'];
  const usedByMuscle = {};
  for (const m of muscles) usedByMuscle[m] = new Set();

  return Array.from({ length: effectiveDays }, (_, i) => {
    const session = buildSession(
      labels[i % 3], muscles, sessionsPerMuscle,
      weeklyTargets, equipment, goal, i, usedByMuscle,
      experience, nutritionPhase, landmarks
    );
    return session;
  });
}

function buildUpperLowerWorkouts(weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase) {
  const upperMuscles = ['chest', 'back', 'side_delts', 'rear_delts', 'front_delts', 'biceps', 'triceps'];
  const lowerMuscles = ['quads', 'hamstrings', 'glutes', 'calves', 'abs'];

  const sessionsPerMuscle = {};
  for (const m of upperMuscles) sessionsPerMuscle[m] = 2;
  for (const m of lowerMuscles) sessionsPerMuscle[m] = 2;

  const usedByMuscle = {};
  const allMuscles = [...upperMuscles, ...lowerMuscles];
  for (const m of allMuscles) usedByMuscle[m] = new Set();

  const upperA = buildSession('Upper A', upperMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks);
  const lowerA = buildSession('Lower A', lowerMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks);
  const upperB = buildSession('Upper B', upperMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks);
  const lowerB = buildSession('Lower B', lowerMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks);

  return [upperA, lowerA, upperB, lowerB];
}

function buildPPLWorkouts(weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase, effectiveDays) {
  const pushMuscles = ['chest', 'front_delts', 'side_delts', 'triceps'];
  const pullMuscles = ['back', 'rear_delts', 'biceps', 'traps'];
  const legMuscles  = ['quads', 'hamstrings', 'glutes', 'calves', 'abs'];

  const sessionsPerMuscle = {};
  const allMuscles = [...pushMuscles, ...pullMuscles, ...legMuscles];

  if (effectiveDays === 3) {
    for (const m of allMuscles) sessionsPerMuscle[m] = 1;
  } else if (effectiveDays === 5) {
    for (const m of pushMuscles) sessionsPerMuscle[m] = 2;
    for (const m of pullMuscles) sessionsPerMuscle[m] = 2;
    for (const m of legMuscles)  sessionsPerMuscle[m] = 1;
  } else {
    // 6-day ppl_ab
    for (const m of allMuscles) sessionsPerMuscle[m] = 2;
  }

  const usedByMuscle = {};
  for (const m of allMuscles) usedByMuscle[m] = new Set();

  if (effectiveDays === 3) {
    return [
      buildSession('Push',   pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Pull',   pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Legs',   legMuscles,  sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
    ];
  }
  if (effectiveDays === 5) {
    return [
      buildSession('Push A', pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Pull A', pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Legs',   legMuscles,  sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Push B', pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Pull B', pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
    ];
  }
  // 6-day
  return [
    buildSession('Push A', pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Pull A', pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Legs A', legMuscles,  sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Push B', pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Pull B', pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Legs B', legMuscles,  sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
  ];
}

function buildWeakPointDay(weakPointKeys, weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase) {
  const muscles = weakPointKeys.length > 0 ? weakPointKeys : ['side_delts', 'biceps'];
  const sessionsPerMuscle = {};
  for (const m of muscles) sessionsPerMuscle[m] = 3; // WP day is 3rd session

  const usedByMuscle = {};
  for (const m of muscles) usedByMuscle[m] = new Set();

  // Override targets to MRV-2
  const wpTargets = { ...weeklyTargets };
  for (const m of muscles) {
    if (landmarks[m]) {
      wpTargets[m] = Math.max(landmarks[m].MEV, landmarks[m].MRV - 2);
    }
  }

  const session = buildSession(
    'Weak Point Specialisation', muscles, sessionsPerMuscle,
    wpTargets, equipment, goal, 2, usedByMuscle,
    experience, nutritionPhase, landmarks
  );

  // Ensure at least 4 sets on first exercise
  if (session.exercises.length > 0 && session.exercises[0].sets < 4) {
    session.exercises[0] = { ...session.exercises[0], sets: 4 };
  }

  return session;
}

function buildUpperLowerWPWorkouts(weeklyTargets, landmarks, equipment, goal, weakPointKeys, experience, nutritionPhase) {
  const base = buildUpperLowerWorkouts(weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase);
  const wpDay = buildWeakPointDay(weakPointKeys, weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase);
  return [...base, wpDay];
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateExercises(exercises) {
  const seen = new Set();
  return exercises.filter(e => {
    if (seen.has(e.exerciseName)) return false;
    seen.add(e.exerciseName);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Mesocycle schedule
// ---------------------------------------------------------------------------

function buildMesocycleSchedule(experience) {
  const isAdvanced = experience === 'advanced' || experience === 'competitive';
  if (isAdvanced) {
    return [
      { week: 1, label: 'Introduction week — build your groove',      setsMultiplier: 1.00 },
      { week: 2, label: 'Build week — push a little harder',          setsMultiplier: 1.10 },
      { week: 3, label: 'Build week — push a little harder',          setsMultiplier: 1.15 },
      { week: 4, label: 'Build week — push a little harder',          setsMultiplier: 1.20 },
      { week: 5, label: 'Peak push — best effort',                    setsMultiplier: 1.25 },
      { week: 6, label: 'Rest week — let your body catch up',         setsMultiplier: 0.50 },
    ];
  }
  return [
    { week: 1, label: 'Introduction week — build your groove',      setsMultiplier: 1.00 },
    { week: 2, label: 'Build week — push a little harder',          setsMultiplier: 1.10 },
    { week: 3, label: 'Build week — push a little harder',          setsMultiplier: 1.20 },
    { week: 4, label: 'Peak push — best effort',                    setsMultiplier: 1.25 },
    { week: 5, label: 'Rest week — let your body catch up',         setsMultiplier: 0.50 },
  ];
}

// ---------------------------------------------------------------------------
// Weekly volume summary
// ---------------------------------------------------------------------------

function buildVolumeSummary(workouts, weeklyTargets, weakPointKeys) {
  const internalToExternal = {
    chest: 'chest', back: 'back',
    side_delts: 'shoulders', rear_delts: 'shoulders', front_delts: 'shoulders',
    biceps: 'biceps', triceps: 'triceps',
    quads: 'quads', hamstrings: 'hamstrings', glutes: 'glutes',
    calves: 'calves', abs: 'abs', traps: 'traps', forearms: null,
  };

  const actualSets = {};
  for (const workout of workouts) {
    for (const ex of workout.exercises) {
      // We attribute sets based on position in pool to avoid muscle parsing
      // Instead count from raw exercises via their exerciseName membership
      // Using the muscle→pool map
      for (const [muscle, pool] of Object.entries(POOL)) {
        if (pool.some(p => p.n === ex.exerciseName)) {
          actualSets[muscle] = (actualSets[muscle] ?? 0) + ex.sets;
        }
      }
    }
  }

  const externalKeys = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'traps'];
  const summary = {};
  for (const key of externalKeys) summary[key] = { plannedSets: 0, isWeakPoint: false };

  for (const [internal, ext] of Object.entries(internalToExternal)) {
    if (!ext) continue;
    const sets = actualSets[internal] ?? 0;
    summary[ext].plannedSets += sets;
    if (weakPointKeys.includes(internal)) {
      summary[ext].isWeakPoint = true;
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Personalisation summary
// ---------------------------------------------------------------------------

const EXPERIENCE_LABELS = {
  beginner:     'Beginner (under 18 months of consistent training)',
  intermediate: 'Intermediate (18 months – 3 years)',
  advanced:     'Advanced (3–5 years)',
  competitive:  'Competitive (5+ years, physique or performance focus)',
};

const EQUIPMENT_LABELS = {
  full_gym:        'Full commercial gym',
  machines_cables: 'Machines & cables only',
  dumbbells_only:  'Dumbbells only',
  barbell_plates:  'Barbell & plates',
  home_gym:        'Home gym setup',
  bodyweight:      'Bodyweight only',
};

const RECOVERY_LABELS = {
  poor:    'Poor (limited sleep, high life stress)',
  average: 'Average',
  good:    'Good (8+ h sleep, low stress)',
};

const NUTRITION_PHASE_LABELS = {
  lean_gain:      'Lean Gain (modest surplus)',
  build:          'Build (aggressive surplus)',
  maintain:       'Maintenance',
  recomp:         'Body Recomposition',
  mild_cut:       'Mild Cut',
  aggressive_cut: 'Aggressive Cut',
  contest_prep:   'Contest Prep',
};

function buildPersonalisationSummary(inputs, effectiveDays, splitType, weakPointUILabels) {
  const { experience, trainingAge, daysPerWeek, sessionLengthMinutes,
          equipment, goal, recoveryRating, nutritionPhase } = inputs;
  return {
    experience:     EXPERIENCE_LABELS[experience] ?? experience,
    trainingAge:    trainingAge ? `Training age: ${trainingAge}` : 'Training age: not specified',
    daysPerWeek:    effectiveDays !== daysPerWeek
      ? `Requested ${daysPerWeek} days — adjusted to ${effectiveDays} days based on experience`
      : `${effectiveDays} training days per week`,
    sessionLength:  `~${sessionLengthMinutes} min sessions`,
    equipment:      EQUIPMENT_LABELS[equipment] ?? equipment,
    goal:           GOAL_LABELS[goal] ?? goal,
    split:          SPLIT_LABELS[splitType] ?? splitType,
    weakPoints:     weakPointUILabels.length
      ? `Weak points targeted: ${weakPointUILabels.join(', ')}`
      : 'No specific weak points flagged',
    recovery:       RECOVERY_LABELS[recoveryRating] ?? recoveryRating,
    nutritionPhase: nutritionPhase ? (NUTRITION_PHASE_LABELS[nutritionPhase] ?? nutritionPhase) : 'Not specified',
  };
}

// ---------------------------------------------------------------------------
// whyThis — jargon-free plain English
// ---------------------------------------------------------------------------

function buildWhyThis(inputs, splitType, effectiveDays, workouts, weakPointUILabels) {
  const { experience, goal, recoveryRating, nutritionPhase, equipment, sessionLengthMinutes, daysPerWeek } = inputs;
  const eqLabel = EQUIPMENT_LABELS[equipment] ?? equipment;

  const avgSets = workouts.length
    ? Math.round(workouts.reduce((s, w) => s + w.exercises.reduce((t, e) => t + e.sets, 0), 0) / workouts.length)
    : 0;
  const avgEx = workouts.length
    ? Math.round(workouts.reduce((s, w) => s + w.exercises.length, 0) / workouts.length)
    : 0;

  const result = {};

  // schedule
  const splitName = SPLIT_LABELS[splitType] ?? splitType;
  const scheduleMap = {
    full_body:
      `${splitName} was chosen for your ${effectiveDays} days at ${experience} level. Hitting every muscle group each session means you practise each movement pattern ${effectiveDays} times a week — frequent repetition is the primary driver of early and intermediate progress, and this structure uses your available days as efficiently as possible.`,
    upper_lower:
      `${splitName} was chosen for your ${effectiveDays} days at ${experience} level. Training each muscle group twice a week is the most well-supported frequency for sustained progress: enough repetition to reinforce adaptations, enough per-session volume to make sessions worth doing, and 48–72 hours between sessions for recovery.`,
    ppl:
      `${splitName} was chosen for your ${effectiveDays} days at ${experience} level. Grouping muscles by movement pattern means each group has fully recovered before it trains again. Push muscles rest on Pull and Legs days — no residual chest fatigue when you're pressing shoulders.`,
    ppl_ab:
      `${splitName} was chosen for your ${effectiveDays} days at ${experience} level. Two complete Push / Pull / Legs rotations per week give each muscle group twice-weekly frequency — necessary to keep driving change at your stage. Rotating A and B exercise choices across the two cycles varies the stimulus enough to manage long-term fatigue while sustaining high weekly volume.`,
    upper_lower_wp:
      `Upper / Lower on 4 days trains every muscle group twice a week. The fifth session is reserved entirely for ${weakPointUILabels.length ? weakPointUILabels.join(' and ') : 'your selected weak points'} — targeted extra volume timed so it does not compromise recovery on your main training days.`,
  };
  result.schedule = scheduleMap[splitType] ?? `${splitName} was selected to match your ${effectiveDays} days, ${experience} level, and goal.`;

  // goal
  const goalMap = {
    general_hypertrophy:   `Even, well-rounded muscle growth. Volume is spread across all major groups so nothing gets systematically undertrained, which is the most common cause of stalled progress.`,
    balanced_bodybuilding: `Balanced Bodybuilding distributes volume so no single muscle dominates the plan. This prevents the common imbalances — overdeveloped chest, underdeveloped back, neglected rear delts — that accumulate over years of unstructured training.`,
    aesthetic_v_taper:     `V-Taper prioritises the muscles that create shoulder-to-waist width: outer shoulders, back width, and rear delts. You will see more sets on these muscles than a general plan would assign. Abs use only anti-extension and rotation exercises — direct crunching work is de-emphasised.`,
    weak_point_spec:        `Weak Point Specialisation pushes${weakPointUILabels.length ? ' ' + weakPointUILabels.join(' and ') : ' your flagged muscles'} close to their maximum weekly volume while keeping everything else at the minimum needed to hold current size. Targeted overload, held across the full training block, is how lagging muscles close the gap.`,
    strength_hypertrophy:  `Muscle growth is still the goal, but your main compound lifts are loaded heavier and in a lower rep range. Building strength lets you use more weight over time, and more weight applied correctly means more muscle.`,
    recomp:                `Fat Loss / Recomp Support sets volume at a level your body can recover from while eating at a slight deficit. The goal is preserving the muscle you already have while your nutrition gradually reduces body fat. Training stimulus stays consistent; recovery is the limiting factor, not your effort.`,
    x_frame_physique:      `X-Frame Physique concentrates volume on the four visual anchor points — outer shoulders, back width, glutes and hamstrings — that create a dramatic X silhouette when viewed from front and rear. Side delts, lats, and posterior chain receive additional sets each week; direct waist-widening ab work is minimised to preserve the illusion of a narrow mid-section.`,
  };
  result.goal = goalMap[goal] ?? `Goal: ${GOAL_LABELS[goal] ?? goal}.`;

  // experience
  const expMap = {
    beginner:     `When you're starting out, your body responds well to almost any consistent training. Volume is kept lower here so you can build good technique and work capacity before adding more sets.`,
    intermediate: `At this stage, your muscles need more total weekly sets to keep improving than they did early on. This plan does enough to keep you progressing without piling up more fatigue than you can recover from between sessions.`,
    advanced:     `Progress comes more slowly now and needs more specific programming. Set counts are higher here because your body has adapted to handle more work — lower volumes simply would not be enough to keep you moving forward.`,
    competitive:  `Your muscles have adapted to high training volumes and need a lot of weekly work to keep changing. This plan uses the highest set counts, balanced carefully against recovery so you can sustain quality across the full block.`,
  };
  result.experience = expMap[experience] ?? `Experience level: ${experience}.`;

  // progression (always)
  const weeks = (experience === 'advanced' || experience === 'competitive') ? 6 : 5;
  result.progression = `The plan spans ${weeks} weeks. You start at the sets shown here and add roughly one set per exercise per week across the first ${weeks - 1} weeks. The final week drops to about half the volume — this is not a lost week. Your muscles use the easier week to fully repair and come back stronger before the next block.`;

  // equipment
  result.equipment = `Exercises were selected for ${eqLabel}. Every lift in the plan is available and safe to perform with the equipment you specified — no substitutions needed.`;

  // recovery (conditional)
  if (recoveryRating === 'poor') {
    result.recovery = `You flagged poor recovery — limited sleep or high life stress. The plan uses less volume than it would at average recovery, and sessions are kept to ${effectiveDays} days. Sleep and stress management will do more for your progress right now than adding sets.`;
  } else if (recoveryRating === 'good') {
    result.recovery = `Good recovery allows slightly more volume than average, which is reflected in this plan. You are sleeping well and managing stress — take advantage of that by keeping nutrition consistent throughout the block.`;
  }

  // nutrition (conditional)
  const nutPhase = nutritionPhase;
  if (nutPhase && nutPhase !== 'maintain') {
    const phaseLabel = NUTRITION_PHASE_LABELS[nutPhase] ?? nutPhase;
    const nutMap = {
      lean_gain:      `${phaseLabel}: you have extra calories to work with. Volume is slightly higher because extra food speeds up recovery and lets you get more out of your training. Keep the intensity up and you'll make the most of it.`,
      build:          `${phaseLabel}: eating more supports higher training volumes. This plan uses more weekly sets than it would at maintenance, because your body can recover from more. Keep protein high to direct those extra calories toward muscle rather than fat.`,
      mild_cut:       `${phaseLabel}: eating less slows recovery slightly. Volume is modest and you should stop a rep or two further from failure than usual — this preserves muscle and keeps recovery manageable while in a deficit.`,
      aggressive_cut: `${phaseLabel}: a significant calorie cut reduces how much your body can recover from. Volume is reduced. Keep protein at or above 2 g per kg of bodyweight and focus on your main compound lifts to protect muscle.`,
      contest_prep:   `Contest prep: your recovery is severely limited. Volume is at the lower end and caution is warranted. Prioritise sleep, protein intake, and managing life stress outside the gym.`,
      recomp:         `Body Recomposition: training volume is kept at a level your body can handle while eating at a slight deficit. The goal is doing enough to hold on to your muscle while your nutrition gradually shifts your body composition.`,
    };
    result.nutrition = nutMap[nutPhase] ?? `${phaseLabel} phase influences how much volume the plan uses.`;
  }

  // weakPoints (conditional)
  if (weakPointUILabels.length > 0) {
    result.weakPoints = `${weakPointUILabels.join(' and ')} ${weakPointUILabels.length === 1 ? 'receives' : 'receive'} more weekly sets than the rest of the plan. Consistently directing extra volume at a lagging muscle across a full training block — while the rest of the programme stays balanced — is the most reliable way to close a development gap.`;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

function buildWarnings(inputs, effectiveDays, weakPointUILabels) {
  const { experience, daysPerWeek, recoveryRating, nutritionPhase } = inputs;
  const warnings = [];

  if (experience === 'beginner' && daysPerWeek > 4) {
    warnings.push(
      `A ${daysPerWeek}-day programme exceeds typical beginner recovery capacity. Your plan has been reduced to ${effectiveDays} days to protect recovery and reinforce movement quality before adding frequency.`,
    );
  }
  if (recoveryRating === 'poor' && effectiveDays >= 5) {
    warnings.push(
      'Poor recovery combined with 5 or more training days significantly increases injury and burnout risk. Consider reducing to 4 days per week and prioritising 7–9 hours of sleep.',
    );
  }
  if ((nutritionPhase === 'aggressive_cut' || nutritionPhase === 'contest_prep') && effectiveDays >= 5) {
    warnings.push(
      'Training 5 or more days on a significant calorie cut is hard on the body. Volume has been reduced, but consider dropping to 4 days to match your lower recovery capacity.',
    );
  }
  if (experience === 'competitive' && recoveryRating === 'poor') {
    warnings.push(
      'Competitive-level training demands excellent recovery. With poor recovery flagged, you risk accumulating fatigue that masks progress. Address sleep and life stress before increasing training volume.',
    );
  }
  if (weakPointUILabels.length === 3) {
    warnings.push(
      'Three weak points are targeted — the maximum supported. Any additional muscles beyond three will not receive specialisation volume.',
    );
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generatePlan(inputs) {
  const {
    experience        = 'intermediate',
    trainingAge       = null,
    daysPerWeek       = 4,
    sessionLengthMinutes = 60,
    equipment         = 'full_gym',
    goal              = 'general_hypertrophy',
    weakPoints        = [],
    recoveryRating    = 'average',
    nutritionPhase    = null,
    nutritionContext  = null,
    age               = null,
  } = inputs;

  // Cap weak points at 3 for determinism
  const safeWeakPointsUI = weakPoints.slice(0, 3);
  const weakPointKeys    = resolveWeakPointKeys(safeWeakPointsUI);

  // Beginners capped at 4 days
  const effectiveDays = (experience === 'beginner' && daysPerWeek > 4) ? 4 : daysPerWeek;

  const splitType = selectSplit(experience, effectiveDays, goal);

  // Compute adjusted landmarks
  const landmarks = computeLandmarks(experience, recoveryRating, nutritionPhase, age);

  // Build base weekly targets (MEV as week-1 start)
  const weeklyTargets = {};
  for (const [m, lm] of Object.entries(landmarks)) {
    weeklyTargets[m] = lm.MEV;
  }

  // Apply goal overlay
  const adjustedTargets = applyGoalOverlay(weeklyTargets, landmarks, goal, weakPointKeys);

  // Build workouts
  let rawWorkouts;
  switch (splitType) {
    case 'full_body':
      rawWorkouts = buildFullBodyWorkouts(adjustedTargets, landmarks, equipment, goal, experience, nutritionPhase, effectiveDays);
      break;
    case 'upper_lower':
      rawWorkouts = buildUpperLowerWorkouts(adjustedTargets, landmarks, equipment, goal, experience, nutritionPhase);
      break;
    case 'upper_lower_wp':
      rawWorkouts = buildUpperLowerWPWorkouts(adjustedTargets, landmarks, equipment, goal, weakPointKeys, experience, nutritionPhase);
      break;
    case 'ppl':
    case 'ppl_ab':
      rawWorkouts = buildPPLWorkouts(adjustedTargets, landmarks, equipment, goal, experience, nutritionPhase, effectiveDays);
      break;
    default:
      rawWorkouts = buildFullBodyWorkouts(adjustedTargets, landmarks, equipment, goal, experience, nutritionPhase, effectiveDays);
  }

  // Strength notes
  if (goal === 'strength_hypertrophy') {
    for (const w of rawWorkouts) {
      for (const ex of w.exercises) {
        if (ex.restSec >= 150 && !ex.notes) {
          ex.notes = 'Add weight when you complete the top of the rep range for 2 consecutive sessions with good form.';
        }
      }
    }
  }

  // Finalise: deduplicate, trim to time budget, stamp duration
  const workouts = rawWorkouts.map(w => {
    const deduped  = deduplicateExercises(w.exercises);
    const trimmed  = trimToTimeBudget(deduped, sessionLengthMinutes, equipment);
    // Strip internal-only tags (_m, _req) used during trimming.
    const clean = trimmed.map(({ _m, _req, ...rest }) => rest);
    return {
      name: w.name,
      exercises: clean,
      estimatedDurationMinutes: Math.ceil(estimateSessionMinutes(clean, equipment)),
    };
  });

  // Discard sessions that ended up with no exercises (shouldn't happen but guard it)
  const validWorkouts = workouts.filter(w => w.exercises.length > 0);

  const warnings              = buildWarnings({ ...inputs, weakPoints: safeWeakPointsUI }, effectiveDays, safeWeakPointsUI);
  const weeklyVolumeSummary   = buildVolumeSummary(validWorkouts, adjustedTargets, weakPointKeys);
  const personalisationSummary = buildPersonalisationSummary(
    { ...inputs, weakPoints: safeWeakPointsUI }, effectiveDays, splitType, safeWeakPointsUI
  );
  const whyThis               = buildWhyThis(
    { ...inputs, weakPoints: safeWeakPointsUI }, splitType, effectiveDays, validWorkouts, safeWeakPointsUI
  );
  const mesocycleSchedule     = buildMesocycleSchedule(experience);

  const goalShort = {
    general_hypertrophy:   'Build Muscle',
    balanced_bodybuilding: 'Bodybuilding',
    aesthetic_v_taper:     'V-Taper',
    weak_point_spec:       'Specialisation',
    strength_hypertrophy:  'Strength + Size',
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
    name:                    `${goalShort} ${splitShort} — ${effectiveDays}×/week`,
    goal,
    splitType,
    daysPerWeek:             effectiveDays,
    estimatedSessionMinutes: sessionLengthMinutes,
    workouts:                validWorkouts,
    weeklyVolumeSummary,
    personalisationSummary,
    whyThis,
    warnings,
    nutritionContext:        nutritionContext ?? null,
    mesocycleSchedule,
  };
}
