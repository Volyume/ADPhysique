import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllExercises, insertExercise, createRoutine, addExerciseToRoutine,
  createProgramme, getLibraryPlans,
} from './database';

// Bump to v6: stores tags, splitType, difficulty in DB so filter chips work
const SEED_KEY = '@volyume_routines_seeded_v11';

// Extra exercises the plan templates rely on that may not be in the base exercise seed
const REQUIRED_EXERCISES = [
  { name: 'HS Plate-Loaded Lat Pulldown',     primaryMuscle: 'back',      equipment: 'machine',  movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 8,  defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Underhand Lat Pulldown',            primaryMuscle: 'back',      equipment: 'cable',    movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Plate-Loaded Seated Row',           primaryMuscle: 'back',      equipment: 'machine',  movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'HS ISO High Row',                   primaryMuscle: 'back',      equipment: 'machine',  movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Cable Serratus Punch',              primaryMuscle: 'abs',       equipment: 'cable',    movementPattern: 'push',      compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 25, fatigueCost: 1, stimulusToFatigueRatio: 5 },
  { name: 'Cable Lateral Raise (Low Pulley)',  primaryMuscle: 'side_delts',  equipment: 'cable',    movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Facing-In Shoulder Press',          primaryMuscle: 'front_delts', equipment: 'machine',  movementPattern: 'push',      compoundIsolation: 'compound',  defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Cable Fly (Low to Mid, Incline)',  primaryMuscle: 'chest',       equipment: 'cable',    movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Cable Fly (Mid Height, Cuff)',     primaryMuscle: 'chest',       equipment: 'cable',    movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Band Pull-Apart',                   primaryMuscle: 'rear_delts',  equipment: 'band',     movementPattern: 'pull',      compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 25, fatigueCost: 1, stimulusToFatigueRatio: 4 },
  { name: 'Box Step-Up',                       primaryMuscle: 'quads',     equipment: 'bodyweight', movementPattern: 'squat',   compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Single-Arm Dumbbell Row',           primaryMuscle: 'back',      equipment: 'dumbbell', movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 15, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Trap Bar Deadlift (Low Handle)',    primaryMuscle: 'quads',     equipment: 'barbell',  movementPattern: 'hinge',     compoundIsolation: 'compound',  defaultRepMin: 4,  defaultRepMax: 8,  fatigueCost: 5, stimulusToFatigueRatio: 4 },
  { name: 'Hip Thrust (Barbell)',    primaryMuscle: 'glutes',   equipment: 'barbell',    movementPattern: 'hinge',     compoundIsolation: 'compound',  defaultRepMin: 8,  defaultRepMax: 15, fatigueCost: 3, stimulusToFatigueRatio: 5 },
  { name: 'Dumbbell Goblet Squat',   primaryMuscle: 'quads',    equipment: 'dumbbell',   movementPattern: 'squat',     compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Lunge',                   primaryMuscle: 'quads',    equipment: 'bodyweight', movementPattern: 'squat',     compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Bodyweight Squat',        primaryMuscle: 'quads',    equipment: 'bodyweight', movementPattern: 'squat',     compoundIsolation: 'compound',  defaultRepMin: 15, defaultRepMax: 30, fatigueCost: 1, stimulusToFatigueRatio: 3 },
];

// ─── 18 Library Plans ────────────────────────────────────────────────────────

const LIBRARY_PLANS = [

  // ── 1. Aesthetic Upper Rotation ──────────────────────────────────────────
  {
    name: 'Aesthetic Upper Rotation',
    description: 'Two-day upper-body rotation built around physique priorities: lat width, capped side delts, upper-chest fullness, and rear-delt health. Day 1 targets the back and posterior shoulder; Day 2 develops upper chest and lateral delt detail. Add a rep each session; once you hit the top of the rep range, add a little weight and start again. Stop 1 to 2 reps before failure on each set. Pair with any lower-body plan for a complete programme.',
    tags: 'aesthetic upper bodybuilding gender:men goal:build_muscle days:2 featured',
    difficulty: 1,
    workouts: [
      {
        name: 'Day 1: Width, Rear Delts & Back Detail',
        exercises: [
          { name: 'Face Pull',                         sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rope at chest height, elbows high. Light weight only. Rear delt warm-up.' },
          { name: 'HS Plate-Loaded Lat Pulldown',      sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Full overhead stretch. Pull elbows to pockets. 3 s eccentric.' },
          { name: 'Underhand Lat Pulldown',            sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Lower-lat emphasis. Squeeze hard at bottom. 3 s eccentric.' },
          { name: 'Plate-Loaded Seated Row',           sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Full stretch forward. Pull elbows back. Squeeze rhomboids.' },
          { name: 'Cable Straight-Arm Pulldown',       sets: 3, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Lat length and lower-lat control. Slow arc, slight elbow bend.' },
        ],
      },
      {
        name: 'Day 2: Upper Chest, Lateral Delts & Shoulder Refinement',
        exercises: [
          { name: 'Cable Lateral Raise (Low Pulley)',  sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Arm slightly forward. Lead with elbow. Raise to shoulder height.' },
          { name: 'Facing-In Shoulder Press',          sets: 4, repsMin: 12, repsMax: 15, rest: 90,  notes: 'Scapular-plane pressing. Hits upper chest and anterior delt.' },
          { name: 'Cable Fly (Low to Mid, Incline)',  sets: 4, repsMin: 12, repsMax: 15, rest: 90,  notes: 'Cables low, bench 30–45 degrees. 3 s eccentric. Upper-chest focus.' },
          { name: 'Cable Fly (Mid Height, Cuff)',     sets: 3, repsMin: 12, repsMax: 15, rest: 90,  notes: 'Upper-chest isolation. Cuffed for greater range. 3 s eccentric.' },
          { name: 'Face Pull',                         sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rope at chest height. Light weight. Rear-delt health maintenance.' },
        ],
      },
    ],
  },

  // ── 2. Beginner Full Body 3×/week ────────────────────────────────────────
  {
    name: 'Beginner Full Body 3×/Week',
    description: 'Three full-body sessions per week adding weight each session. It is the fastest way to get stronger when you are starting out. The five fundamental movement patterns are trained every session: squat, hinge, horizontal press, horizontal pull, and vertical pull. Add weight each session (2.5 kg on compound barbell lifts) and focus on technique above all else. Expect consistent weekly strength increases for the first 6–12 months. Leave 2 to 3 reps in the tank on each set.',
    tags: 'beginner full_body barbell gender:all goal:build_muscle days:3 audience:beginner featured',
    difficulty: 0,
    workouts: [
      {
        name: 'Full Body A',
        exercises: [
          { name: 'Barbell Back Squat',     sets: 3, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Feet shoulder-width. Hit full depth. Drive through heels.' },
          { name: 'Barbell Bench Press',    sets: 3, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Arch naturally. Bar to chest. Push straight up.' },
          { name: 'Barbell Row (Bent Over)', sets: 3, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Hinge 45 degrees. Pull bar to lower chest. Squeeze back.' },
          { name: 'Barbell Overhead Press', sets: 2, repsMin: 5,  repsMax: 8,  rest: 90,  notes: 'Stand tall. Press straight overhead. Core braced.' },
          { name: 'Dumbbell Lateral Raise', sets: 2, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Light weight. Side delts need direct work that pressing alone cannot provide.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 2, repsMin: 8, repsMax: 12, rest: 90, notes: 'Hip hinge. Feel hamstring stretch. Keep bar close.' },
        ],
      },
      {
        name: 'Full Body B',
        exercises: [
          { name: 'Barbell Back Squat',     sets: 3, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Same as A. Add weight when all reps feel strong.' },
          { name: 'Incline Barbell Bench Press', sets: 3, repsMin: 6, repsMax: 10, rest: 120, notes: 'Slight incline. Upper-chest emphasis.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Pull elbows down to sides. Full stretch overhead.' },
          { name: 'Barbell Overhead Press', sets: 2, repsMin: 5,  repsMax: 8,  rest: 90,  notes: 'Add small increments each session.' },
          { name: 'Face Pull',              sets: 2, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Rear delts. Light weight, elbows high. Keeps the shoulder joint healthy.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 2, repsMin: 8, repsMax: 12, rest: 90, notes: 'Hip hinge. Controlled descent.' },
        ],
      },
    ],
  },

  // ── 3. Beginner Push / Pull / Legs ────────────────────────────────────────
  {
    name: 'Beginner Push / Pull / Legs',
    description: 'A clean three-day split that keeps sessions focused and manageable. Push day builds chest, shoulders, and triceps; Pull day develops back and biceps; Leg day handles quads, hamstrings, glutes, and calves. Each muscle is trained once per week with enough sets to drive growth. Add 2.5 kg to compound lifts and 1.25 kg to isolation exercises when all reps are completed with good technique. Ideal for the first 3–6 months. Leave 2 to 3 reps in the tank on each set.',
    tags: 'beginner ppl gender:all goal:build_muscle days:3 audience:beginner',
    difficulty: 0,
    workouts: [
      {
        name: 'Push: Chest & Shoulders',
        exercises: [
          { name: 'Barbell Bench Press',      sets: 4, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Primary chest movement. Focus on the stretch at the bottom.' },
          { name: 'Incline Dumbbell Press',   sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Upper chest. Control the descent.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Seated or standing. Full range.' },
          { name: 'Dumbbell Lateral Raise',   sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Shoulder width only. Slight forward lean.' },
          { name: 'Rope Pushdown',            sets: 3, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Elbows pinned to sides. Full extension at bottom.' },
        ],
      },
      {
        name: 'Pull: Back & Biceps',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Pull elbows to sides. Arch chest into bar.' },
          { name: 'Seated Cable Row',         sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full stretch, row to belly button.' },
          { name: 'Machine Row (Chest Supported)', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Chest against pad removes lower-back stress.' },
          { name: 'EZ Bar Curl',              sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Full range. Squeeze at top.' },
          { name: 'Hammer Curl',              sets: 2, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Brachialis focus. Keep elbow pinned.' },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { name: 'Barbell Back Squat',       sets: 4, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Full depth. Push knees out.' },
          { name: 'Leg Press',                sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'High foot placement for glute+ham recruitment.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 8, repsMax: 12, rest: 90, notes: 'Hip hinge. Feel the stretch in hamstrings.' },
          { name: 'Leg Extension',            sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Quad isolation. Full contraction at top.' },
          { name: 'Lying Leg Curl',           sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Curl to glutes. Hold a second at top.' },
        ],
      },
    ],
  },

  // ── 4. Upper / Lower 4×/Week (Intermediate) ──────────────────────────────
  {
    name: 'Upper / Lower 4×/Week',
    description: 'The most evidence-supported split for building muscle: each muscle group trained twice per week, giving each muscle 48 to 72 hours to recover before training it again. Upper A focuses on heavier compound work (5–8 reps); Upper B shifts to higher-rep muscle building ranges (10–15 reps) targeting the same muscles from different angles. Add reps session by session; when you reach the top of the rep range, add a little weight and start again. Suits lifters with 6+ months of consistent training. Stop 1 to 2 reps before failure on each set.',
    tags: 'upper_lower intermediate gender:all goal:build_muscle days:4 featured',
    difficulty: 1,
    workouts: [
      {
        name: 'Upper A: Horizontal Push & Pull',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Strength focus. Add weight when top reps feel easy.' },
          { name: 'Barbell Row (Bent Over)',   sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Pause at chest. Controlled descent.' },
          { name: 'Incline Dumbbell Press',    sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Higher reps for growth. Slow negative.' },
          { name: 'Seated Cable Row',          sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full stretch to full contraction.' },
          { name: 'EZ Bar Skull Crusher',      sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Elbows pointed up. Slow on way down.' },
          { name: 'EZ Bar Curl',               sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Full supination at top.' },
        ],
      },
      {
        name: 'Lower A: Quad Focus',
        exercises: [
          { name: 'Barbell Back Squat',         sets: 4, repsMin: 5,  repsMax: 8,  rest: 150, notes: 'Strength focus. Brace hard, break parallel.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Hamstring stretch. Keep bar touching legs.' },
          { name: 'Leg Press',                  sets: 3, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Full range. Don\'t lock out at top.' },
          { name: 'Leg Extension',              sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Squeeze quad at top.' },
          { name: 'Seated Calf Raise',          sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Full range, hold stretch at bottom.' },
        ],
      },
      {
        name: 'Upper B: Vertical Push & Pull',
        exercises: [
          { name: 'Barbell Overhead Press',    sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Standing preferred. Full lockout overhead.' },
          { name: 'Lat Pulldown (Wide Grip)',  sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Slight lean back. Drive elbows down.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Higher reps for growth. Touch ears at bottom.' },
          { name: 'Machine Row (Chest Supported)', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Strict, no body english.' },
          { name: 'Dumbbell Lateral Raise',   sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Slight internal rotation, lead with elbow.' },
          { name: 'Dumbbell Rear Delt Fly',   sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Slight elbow bend. Raise to shoulder height.' },
        ],
      },
      {
        name: 'Lower B: Posterior Chain Focus',
        exercises: [
          { name: 'Conventional Deadlift',    sets: 3, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Heavy pulls. Brace. Drive floor away.' },
          { name: 'Hack Squat Machine',       sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Quad isolation. Full depth.' },
          { name: 'Lying Leg Curl',           sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Curl fully to glutes. Hold 1 s.' },
          { name: 'Barbell Hip Thrust',       sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full hip extension. Squeeze glutes hard.' },
          { name: 'Standing Calf Raise (Machine)', sets: 4, repsMin: 10, repsMax: 20, rest: 60, notes: 'Full stretch, full contraction, hold 1 s.' },
        ],
      },
    ],
  },

  // ── 5. PPL 3×/Week (Intermediate) ────────────────────────────────────────
  {
    name: 'Push Pull Legs 3×/Week',
    description: 'Each muscle group trained once per week with focused, high-quality sets. Push day attacks chest, shoulders, and triceps; Pull day builds the back and biceps; Leg day develops the full lower body. The lower frequency compared to upper/lower makes this ideal as a first split after outgrowing full-body training, or during phases of lower recovery capacity. Add reps each session, then add weight when you reach the top of the range. Stop 1 to 2 reps before failure on each set.',
    tags: 'ppl intermediate gender:all goal:build_muscle days:3',
    difficulty: 1,
    workouts: [
      {
        name: 'Push: Chest, Shoulders & Triceps',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 4, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Full range. Stretch at bottom. Explode up.' },
          { name: 'Incline Dumbbell Press',    sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Upper chest emphasis. Touch shoulders at bottom.' },
          { name: 'Barbell Overhead Press',    sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Standing. Full overhead lockout.' },
          { name: 'Cable Lateral Raise',       sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Constant cable tension. Raise to shoulder height.' },
          { name: 'Overhead Cable Tricep Extension', sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Long-head stretch. Elbows up and back.' },
          { name: 'Cable Pushdown (Straight Bar)', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Full extension, squeeze tricep hard.' },
        ],
      },
      {
        name: 'Pull: Back & Biceps',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)',  sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Arch chest into bar. Drive elbows down and back.' },
          { name: 'Barbell Row (Bent Over)',   sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Hinge 45°. Row to lower chest.' },
          { name: 'Seated Cable Row',          sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'V-handle. Elbows back, squeeze mid-back.' },
          { name: 'Face Pull',                 sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Shoulder health essential. High elbows.' },
          { name: 'EZ Bar Curl',               sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Full supination. No body swing.' },
          { name: 'Hammer Curl',               sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Brachialis thickness.' },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { name: 'Barbell Back Squat',           sets: 4, repsMin: 6,  repsMax: 10, rest: 150, notes: 'Lead compound. Chase depth.' },
          { name: 'Romanian Deadlift (Barbell)',  sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Hip hinge. Hamstring loading.' },
          { name: 'Leg Press',                    sets: 3, repsMin: 12, repsMax: 20, rest: 90,  notes: 'High placement for glutes.' },
          { name: 'Leg Extension',                sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Pump work. High rep.' },
          { name: 'Seated Leg Curl',              sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Seated keeps hams in longer stretch.' },
          { name: 'Standing Calf Raise (Machine)', sets: 4, repsMin: 12, repsMax: 20, rest: 60, notes: 'Full stretch at bottom.' },
        ],
      },
    ],
  },

  // ── 6. PPL 6×/Week (Advanced) ─────────────────────────────────────────────
  {
    name: 'Push Pull Legs 6×/Week',
    description: 'High-frequency PPL for lifters who can handle six sessions per week and recover from them. Each muscle is trained twice per week, which produces faster growth than the 3-day version. The two weekly cycles allow a different emphasis each rotation: heavier compound work first, higher-rep detail work second. Requires consistent sleep, nutrition, and stress management to recover fully. Stop 1 to 2 reps before failure on each set. Recommended for lifters with 18 months or more of consistent training.',
    tags: 'ppl advanced gender:all goal:build_muscle days:6',
    difficulty: 2,
    workouts: [
      {
        name: 'Push Day 1: Strength Focus',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 5, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Heavy sets. Add weight when the top reps feel easy.' },
          { name: 'Incline Barbell Bench Press', sets: 4, repsMin: 6,  repsMax: 8,  rest: 120, notes: 'Second compound. Heavy.' },
          { name: 'Barbell Overhead Press',    sets: 3, repsMin: 6,  repsMax: 8,  rest: 90,  notes: 'Strict press. No leg drive.' },
          { name: 'Dumbbell Lateral Raise',   sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Controlled. Keep at shoulder height.' },
          { name: 'Close-Grip Bench Press',   sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Tricep accessory work.' },
        ],
      },
      {
        name: 'Pull Day 1: Strength Focus',
        exercises: [
          { name: 'Conventional Deadlift',    sets: 4, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Full-body pull. Brace tight.' },
          { name: 'Barbell Row (Bent Over)',  sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Strict 45°. Pull to lower ribs.' },
          { name: 'Weighted Pull-Up',         sets: 3, repsMin: 5,  repsMax: 8,  rest: 90,  notes: 'Add belt weight for progression.' },
          { name: 'EZ Bar Curl',              sets: 4, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Strict curls. Full supination.' },
          { name: 'Preacher Curl (EZ Bar)',   sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Peak contraction, slow negative.' },
        ],
      },
      {
        name: 'Legs Day 1: Quad Focus',
        exercises: [
          { name: 'Barbell Back Squat',         sets: 5, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Heavy squats. Break parallel.' },
          { name: 'Hack Squat Machine',         sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Quad isolation machine.' },
          { name: 'Leg Extension',              sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'High rep pump. No lockout.' },
          { name: 'Lying Leg Curl',             sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Hamstring curl.' },
          { name: 'Standing Calf Raise (Machine)', sets: 5, repsMin: 10, repsMax: 20, rest: 60, notes: 'Heavy calf work. Full range.' },
        ],
      },
      {
        name: 'Push Day 2: Volume Focus',
        exercises: [
          { name: 'Incline Dumbbell Press',    sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Higher reps for growth. Controlled negative.' },
          { name: 'Pec Deck (Machine Fly)',    sets: 4, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Full stretch. Mind-muscle. Pump work.' },
          { name: 'Dumbbell Shoulder Press',  sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Seated. Full range of motion.' },
          { name: 'Cable Lateral Raise',      sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Constant tension cable version.' },
          { name: 'Overhead Cable Tricep Extension', sets: 4, repsMin: 12, repsMax: 20, rest: 60, notes: 'Long head stretch.' },
        ],
      },
      {
        name: 'Pull Day 2: Volume Focus',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)',  sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Width focus. Drive elbows down.' },
          { name: 'Seated Cable Row',          sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full stretch. Elbows back.' },
          { name: 'Machine Row (Chest Supported)', sets: 4, repsMin: 12, repsMax: 15, rest: 90, notes: 'No lower-back stress.' },
          { name: 'Face Pull',                 sets: 3, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rear delt health. Light weight.' },
          { name: 'Incline Dumbbell Curl',     sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Full stretch at bottom of curl.' },
        ],
      },
      {
        name: 'Legs Day 2: Posterior Chain Focus',
        exercises: [
          { name: 'Romanian Deadlift (Barbell)', sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Hamstring loading. Keep bar close.' },
          { name: 'Leg Press',                   sets: 4, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Higher foot placement.' },
          { name: 'Seated Leg Curl',             sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Stretched position. Very effective for hamstring growth.' },
          { name: 'Barbell Hip Thrust',          sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Glute-focused. Full hip extension.' },
          { name: 'Seated Calf Raise',           sets: 5, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Soleus focus. Slow and controlled.' },
        ],
      },
    ],
  },

  // ── 7. 4-Day Bodybuilding Bro Split ──────────────────────────────────────
  {
    name: '4-Day Muscle Building Bro Split',
    description: 'The classic bodybuilder split: each major muscle group gets a dedicated session and a high number of sets before moving on. Chest and triceps on Day 1, back and biceps on Day 2, shoulders and traps on Day 3, legs on Day 4. Each muscle is trained once per week. Best suited to lifters with 2 or more years of training who are comfortable pushing through demanding sessions and recover well. Add reps each session, then add weight when you reach the top of the range. Take the last set of each exercise close to failure.',
    tags: 'bodybuilding bro_split gender:men goal:build_muscle days:4',
    difficulty: 1,
    workouts: [
      {
        name: 'Chest & Triceps',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 4, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Flat bench compound starter.' },
          { name: 'Incline Dumbbell Press',    sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Upper-chest secondary.' },
          { name: 'Pec Deck (Machine Fly)',    sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Pump isolation. Full stretch.' },
          { name: 'EZ Bar Skull Crusher',      sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Elbows pointed up. Slow negative.' },
          { name: 'Rope Pushdown',             sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Flare rope at bottom. Squeeze.' },
        ],
      },
      {
        name: 'Back & Biceps',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)',  sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Width focus.' },
          { name: 'Seated Cable Row',          sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Thickness focus.' },
          { name: 'Dumbbell Row',              sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Single arm. Controlled.' },
          { name: 'EZ Bar Curl',               sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Strict. Full supination.' },
          { name: 'Preacher Curl (EZ Bar)',    sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Peak contraction.' },
        ],
      },
      {
        name: 'Shoulders',
        exercises: [
          { name: 'Barbell Overhead Press',   sets: 4, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Standing. Strict. Full lockout.' },
          { name: 'Dumbbell Lateral Raise',  sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Raise to ear height. Slight lean.' },
          { name: 'Machine Lateral Raise',   sets: 3, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Constant tension version.' },
          { name: 'Face Pull',               sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'High elbows. Rear delt health.' },
          { name: 'Dumbbell Rear Delt Fly',  sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Bent-over. Slight elbow bend.' },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { name: 'Barbell Back Squat',           sets: 4, repsMin: 6,  repsMax: 10, rest: 150, notes: 'Primary quad driver.' },
          { name: 'Leg Press',                    sets: 4, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Volume after squats.' },
          { name: 'Romanian Deadlift (Barbell)',  sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Hamstring loading.' },
          { name: 'Leg Extension',                sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Quad pump isolation.' },
          { name: 'Seated Leg Curl',              sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Hamstring stretch position.' },
        ],
      },
    ],
  },

  // ── 8. 3-Day Full Body Express (45 min sessions) ─────────────────────────
  {
    name: 'Full Body Express 3×/Week',
    description: '45-minute full-body sessions, three days per week, using only the highest-value compound movements. No isolation work. Every exercise trains multiple muscles simultaneously to maximise efficiency. Ideal for time-pressed lifters who want to maintain or build muscle with minimal gym time. Because each session covers the full body, skipping one session does not leave any muscle group undertrained that week. Add reps each session, then add weight when you reach the top of the range. Leave 2 reps in the tank on each set.',
    tags: 'full_body short gender:all goal:build_muscle days:3',
    difficulty: 1,
    workouts: [
      {
        name: 'Session A',
        exercises: [
          { name: 'Barbell Back Squat',       sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Main leg driver.' },
          { name: 'Barbell Bench Press',      sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Main push.' },
          { name: 'Barbell Row (Bent Over)',  sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Main pull.' },
          { name: 'Barbell Overhead Press',  sets: 2, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Shoulder builder.' },
        ],
      },
      {
        name: 'Session B',
        exercises: [
          { name: 'Leg Press',               sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Quad accessory work.' },
          { name: 'Incline Dumbbell Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Upper chest push.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 3, repsMin: 8,  repsMax: 12, rest: 90, notes: 'Back width.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 8, repsMax: 12, rest: 90, notes: 'Posterior chain.' },
        ],
      },
      {
        name: 'Session C',
        exercises: [
          { name: 'Barbell Back Squat',       sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Full depth. No rush.' },
          { name: 'Dumbbell Bench Press',    sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Chest squeeze.' },
          { name: 'Seated Cable Row',        sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full stretch, elbows back.' },
          { name: 'Dumbbell Shoulder Press', sets: 2, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Overhead push accessory.' },
        ],
      },
    ],
  },

  // ── 9. Upper / Lower Express (4 × 40 min) ────────────────────────────────
  {
    name: 'Upper / Lower Express 4×/Week',
    description: 'Four 40-minute sessions per week using a tight exercise selection and short rest periods. Built on the upper/lower structure with each session trimmed to its highest-value exercises. Suitable for lifters with 12 months or more of training who have a busy schedule and want each muscle trained twice a week without long sessions. Add reps, then weight, on all compound movements. Optional supersets (pairing exercises that do not compete for the same muscles) can shave a further 10 minutes off each session. Stop 1 to 2 reps before failure on each set.',
    tags: 'upper_lower short gender:all goal:build_muscle days:4',
    difficulty: 1,
    workouts: [
      {
        name: 'Upper A',
        exercises: [
          { name: 'Barbell Bench Press',      sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Primary push.' },
          { name: 'Seated Cable Row',         sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Primary pull: superset with bench optional.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Front delt compound.' },
          { name: 'Dumbbell Lateral Raise',   sets: 2, repsMin: 15, repsMax: 25, rest: 45,  notes: 'Side delts. Shoulder press does not cover these adequately.' },
          { name: 'EZ Bar Curl',              sets: 2, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Bicep finisher.' },
        ],
      },
      {
        name: 'Lower A',
        exercises: [
          { name: 'Barbell Back Squat',           sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Main quad driver.' },
          { name: 'Romanian Deadlift (Barbell)',  sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Hamstring loading.' },
          { name: 'Leg Extension',                sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Quad pump.' },
          { name: 'Seated Calf Raise',            sets: 3, repsMin: 15, repsMax: 25, rest: 45,  notes: 'Calf finisher.' },
        ],
      },
      {
        name: 'Upper B',
        exercises: [
          { name: 'Barbell Overhead Press',   sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Overhead strength.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Back width.' },
          { name: 'Incline Dumbbell Press',   sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Upper chest.' },
          { name: 'Face Pull',                sets: 2, repsMin: 20, repsMax: 25, rest: 45,  notes: 'Rear delts. The head pressing misses most.' },
          { name: 'Rope Pushdown',            sets: 2, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Tricep finisher.' },
        ],
      },
      {
        name: 'Lower B',
        exercises: [
          { name: 'Leg Press',               sets: 3, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Quad accessory work.' },
          { name: 'Lying Leg Curl',          sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Hamstring focus.' },
          { name: 'Barbell Hip Thrust',      sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Glute power.' },
          { name: 'Standing Calf Raise (Machine)', sets: 3, repsMin: 12, repsMax: 20, rest: 45, notes: 'Calf finisher.' },
        ],
      },
    ],
  },

  // ── 10. Chest & Shoulder Specialisation ──────────────────────────────────
  {
    name: 'Chest & Shoulder Specialisation',
    description: 'A specialisation phase for lifters who want to prioritise chest and shoulder development. Sets for these muscles are increased well above what a balanced programme provides; all other muscle groups are maintained with enough work to hold what you have. Run for 6–8 weeks, then return to a balanced programme. Add reps, then weight, on all chest and shoulder work. Expect visible improvement in shoulder roundness and upper-chest fullness within 8–10 weeks. Stop 1 to 2 reps before failure on each set.',
    tags: 'weak_point bodybuilding chest shoulders aesthetic gender:all goal:build_muscle days:2',
    difficulty: 1,
    workouts: [
      {
        name: 'Chest Day',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 5, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Strength-focused. 5 heavy sets.' },
          { name: 'Incline Barbell Bench Press', sets: 4, repsMin: 8,  repsMax: 12, rest: 90, notes: 'Upper chest secondary.' },
          { name: 'Incline Dumbbell Fly',       sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Stretch focus. Light weight, feel it.' },
          { name: 'Pec Deck (Machine Fly)',     sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Pump finisher.' },
          { name: 'Weighted Dips (Chest)',      sets: 3, repsMin: 8,  repsMax: 15, rest: 90, notes: 'Stretch at bottom. Lean forward.' },
        ],
      },
      {
        name: 'Shoulder Day',
        exercises: [
          { name: 'Barbell Overhead Press',   sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Standing strength press.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Higher reps for growth.' },
          { name: 'Dumbbell Lateral Raise',  sets: 5, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Side delt focus. 5 sets.' },
          { name: 'Cable Lateral Raise',     sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Constant tension version of lateral raise.' },
          { name: 'Face Pull',               sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rear delt health. Mandatory.' },
          { name: 'Dumbbell Rear Delt Fly',  sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Bent-over rear delt work.' },
        ],
      },
      {
        name: 'Back & Arms (Maintenance)',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)',  sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Back maintenance.' },
          { name: 'Seated Cable Row',          sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Mid-back maintenance.' },
          { name: 'EZ Bar Curl',               sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Bicep maintenance.' },
          { name: 'Rope Pushdown',             sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Tricep maintenance.' },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { name: 'Barbell Back Squat',          sets: 4, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Leg maintenance.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Posterior chain maintenance.' },
          { name: 'Leg Extension',               sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Quad isolation finisher.' },
          { name: 'Lying Leg Curl',              sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Hamstring finisher.' },
        ],
      },
    ],
  },

  // ── 11. Back Width & Thickness Specialisation ────────────────────────────
  {
    name: 'Back Width & Thickness',
    description: 'A back specialisation block for lifters who want a wider, thicker back. Width comes from vertical pulling (lat pulldown variations, straight-arm pulldowns); thickness from horizontal rowing. Both are trained twice per week with plenty of sets. Other muscle groups are maintained with enough work to hold what you have. Run for 6–8 weeks within a broader training year. Add reps each session, then add weight when you reach the top of the range. Stop 1 to 2 reps before failure on each back set.',
    tags: 'weak_point back bodybuilding aesthetic gender:all goal:build_muscle days:2',
    difficulty: 1,
    workouts: [
      {
        name: 'Width Day: Vertical Pull Focus',
        exercises: [
          { name: 'Weighted Pull-Up',          sets: 4, repsMin: 5,  repsMax: 8,  rest: 90,  notes: 'Add belt weight. Full hang at bottom.' },
          { name: 'Lat Pulldown (Wide Grip)',  sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Drive elbows down. Full stretch.' },
          { name: 'Lat Pulldown (Close Grip)', sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Lower-lat emphasis. Pull to chest.' },
          { name: 'Cable Straight-Arm Pulldown', sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Pure lat isolation. Slow arc.' },
          { name: 'Cable Lat Pullover',        sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Lat stretch and contraction.' },
        ],
      },
      {
        name: 'Thickness Day: Horizontal Row Focus',
        exercises: [
          { name: 'Barbell Row (Bent Over)',   sets: 5, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Heavy rowing. Pull to lower chest.' },
          { name: 'Seated Cable Row',          sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full stretch. Row to belly. Squeeze.' },
          { name: 'Machine Row (Chest Supported)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'No lower-back load. Strict reps.' },
          { name: 'Dumbbell Row',              sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Single-arm. Rotate torso.' },
          { name: 'Conventional Deadlift',     sets: 3, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Heavy pulls. Back strength cornerstone.' },
        ],
      },
      {
        name: 'Arms & Shoulders (Maintenance)',
        exercises: [
          { name: 'Barbell Overhead Press',    sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Shoulder maintenance press.' },
          { name: 'Dumbbell Lateral Raise',   sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Side delt maintenance.' },
          { name: 'EZ Bar Curl',               sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Bicep maintenance.' },
          { name: 'Rope Pushdown',             sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Tricep maintenance.' },
        ],
      },
    ],
  },

  // ── 12. Leg Development Priority ─────────────────────────────────────────
  {
    name: 'Leg Development Priority',
    description: 'For lifters whose legs are noticeably behind their upper body. Quad and hamstring sessions are increased above what a balanced programme provides; upper body is maintained at a lower frequency. Three leg sessions per week (two quad-focused, one glute and hamstring-focused) produce consistent lower-body growth. Run for 8–12 weeks, then reassess. Add reps each session, then add weight when you reach the top of the range. Push leg compound movements close to failure. Leave 2 reps in the tank on isolation exercises.',
    tags: 'weak_point legs quads hamstrings gender:all goal:build_muscle days:2',
    difficulty: 1,
    workouts: [
      {
        name: 'Quad-Dominant Day',
        exercises: [
          { name: 'Barbell Back Squat',   sets: 5, repsMin: 5,  repsMax: 8,  rest: 150, notes: 'Strength squats. 5×5 approach.' },
          { name: 'Hack Squat Machine',   sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Quad machine focus.' },
          { name: 'Leg Press',            sets: 4, repsMin: 15, repsMax: 20, rest: 90,  notes: 'Volume accumulation.' },
          { name: 'Leg Extension',        sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Quad isolation pump.' },
          { name: 'Seated Calf Raise',    sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Soleus: slow and controlled.' },
        ],
      },
      {
        name: 'Posterior Chain Day',
        exercises: [
          { name: 'Conventional Deadlift',    sets: 4, repsMin: 5,  repsMax: 6,  rest: 150, notes: 'Heavy pulls. Drive hips through.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 4, repsMin: 8,  repsMax: 12, rest: 90, notes: 'Hamstring stretch focus.' },
          { name: 'Lying Leg Curl',           sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full hamstring curl.' },
          { name: 'Seated Leg Curl',          sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Seated keeps longer stretch.' },
          { name: 'Barbell Hip Thrust',       sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Glute strength. Full hip extension.' },
        ],
      },
      {
        name: 'Upper Body (Maintenance)',
        exercises: [
          { name: 'Barbell Bench Press',      sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Chest maintenance.' },
          { name: 'Lat Pulldown (Wide Grip)',  sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Back maintenance.' },
          { name: 'Barbell Overhead Press',   sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Front delt compound.' },
          { name: 'Dumbbell Lateral Raise',   sets: 2, repsMin: 15, repsMax: 20, rest: 45,  notes: 'Side delt maintenance. Pressing does not maintain these.' },
          { name: 'EZ Bar Curl',              sets: 2, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Arm maintenance.' },
        ],
      },
    ],
  },

  // ── 13. Glute & Hamstring Focus ───────────────────────────────────────────
  {
    name: 'Glute & Hamstring Focus',
    description: 'Hip-dominant training with an emphasis on the posterior chain: glutes, hamstrings, and spinal erectors. Ideal for athletes wanting stronger hip extension, or physique athletes prioritising glute development. Sessions are built around hip hinges, hip thrusts, and leg curl variations, with upper-body maintenance work included. Run as a 6–8 week specialisation phase. Add reps, then weight, on all major movements. Stop 1 to 2 reps before failure on each set.',
    tags: 'weak_point glutes hamstrings gender:all goal:build_muscle days:2',
    difficulty: 1,
    workouts: [
      {
        name: 'Glute Day',
        exercises: [
          { name: 'Barbell Hip Thrust',         sets: 5, repsMin: 8,  repsMax: 15, rest: 90,  notes: 'Load heavily over time. Squeeze at top.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 4, repsMin: 8,  repsMax: 12, rest: 90, notes: 'Stretch focus. Feel glutes and hams loading.' },
          { name: 'Bulgarian Split Squat',       sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Rear leg elevated. Front foot drives glutes.' },
          { name: 'Cable Kickback',              sets: 3, repsMin: 15, repsMax: 25, rest: 60, notes: 'Hip extension isolation.' },
          { name: 'Abductor Machine',            sets: 3, repsMin: 20, repsMax: 30, rest: 60, notes: 'Glute med activation.' },
        ],
      },
      {
        name: 'Hamstring Day',
        exercises: [
          { name: 'Conventional Deadlift',        sets: 4, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Heavy hip hinge. Build posterior chain.' },
          { name: 'Romanian Deadlift (Dumbbell)',  sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Dumbbell version for range of motion.' },
          { name: 'Lying Leg Curl',               sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Knee flexion hamstring isolation.' },
          { name: 'Seated Leg Curl',              sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Seated adds extra hip-flexion stretch.' },
          { name: 'Nordic Hamstring Curl',        sets: 3, repsMin: 3,  repsMax: 8,  rest: 90,  notes: 'Eccentric strength. Best hamstring exercise.' },
        ],
      },
    ],
  },

  // ── 14. V-Taper Aesthetic (Lats + Side Delts) ────────────────────────────
  {
    name: 'V-Taper Aesthetic',
    description: 'Building a tapered physique: wide upper back and capped side delts over a narrow waist. Back width and side delt work are both elevated above what a balanced programme provides; exercises that build waist width are excluded. Sessions are structured so the muscles that create visual width are trained first, when freshest. Run as a 6–8 week specialisation phase. Add reps each session, then add weight when you reach the top of the range. Stop 1 to 2 reps before failure on each set.',
    tags: 'aesthetic v_taper bodybuilding back shoulders gender:men goal:build_muscle days:2',
    difficulty: 1,
    workouts: [
      {
        name: 'Lats & Side Delts',
        exercises: [
          { name: 'Weighted Pull-Up',         sets: 4, repsMin: 5,  repsMax: 8,  rest: 90,  notes: 'Widest pull. Full hang, pull chest to bar.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Drive elbows straight down.' },
          { name: 'Cable Straight-Arm Pulldown', sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Pure lat sweep isolation.' },
          { name: 'Dumbbell Lateral Raise',  sets: 5, repsMin: 15, repsMax: 25, rest: 60,  notes: '5 sets. Creates the wide illusion.' },
          { name: 'Cable Lateral Raise',     sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Constant tension. No cheating.' },
          { name: 'Machine Lateral Raise',   sets: 3, repsMin: 15, repsMax: 20, rest: 45,  notes: 'Pump finisher.' },
        ],
      },
      {
        name: 'Upper Back & Rear Delts',
        exercises: [
          { name: 'Barbell Row (Bent Over)',  sets: 4, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Thickness and upper-back width.' },
          { name: 'Machine Row (Chest Supported)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Mid-back detail.' },
          { name: 'Face Pull',               sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rear delt + external rotation. Mandatory.' },
          { name: 'Reverse Pec Deck',        sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Rear delt isolation machine.' },
          { name: 'Dumbbell Rear Delt Fly',  sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Bent-over. Slow controlled.' },
        ],
      },
    ],
  },

  // ── 15. 2-Day Minimalist (Busy Schedule) ─────────────────────────────────
  {
    name: 'Minimalist 2×/Week',
    description: 'Two full-body sessions per week, covering every major muscle group in around 60 minutes each. Suitable for maintenance periods, very busy schedules, or as a bridge between more demanding programmes. Sets are kept low: enough to preserve muscle and strength, but not enough for significant growth. Prioritises the highest-value compound movements. Add reps, then weight. Progress will be slower than with higher-frequency plans. Leave 2 reps in the tank on each set.',
    tags: 'minimalist full_body gender:all goal:build_muscle days:2 short',
    difficulty: 1,
    workouts: [
      {
        name: 'Session 1: Push & Hinge',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 3, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Main push. No warmup skip.' },
          { name: 'Barbell Overhead Press',   sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Shoulder compound.' },
          { name: 'Conventional Deadlift',    sets: 3, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Full posterior chain in one movement.' },
          { name: 'Rope Pushdown',            sets: 2, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Tricep isolation finisher.' },
        ],
      },
      {
        name: 'Session 2: Pull & Squat',
        exercises: [
          { name: 'Barbell Back Squat',       sets: 3, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Quad strength base.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Back width compound.' },
          { name: 'Seated Cable Row',         sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Mid-back.' },
          { name: 'EZ Bar Curl',              sets: 2, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Bicep isolation finisher.' },
        ],
      },
    ],
  },

  // ── 16. 3-Day Power Hypertrophy ────────────────────────────────────────────
  {
    name: '3-Day Power + Muscle',
    description: 'Combines heavy strength work (3–5 reps, close to maximal effort) with muscle-building accessory exercises (8–15 reps) in the same session. The heavy work builds raw strength; the accessory work produces enough sets for sustained muscle growth. This approach develops both qualities at the same time rather than focusing on just one. Best for lifters with 2 or more years of training who want to be both strong and muscular. Push the heavy sets hard but leave a couple of reps in the tank. Take accessory work close to failure.',
    tags: 'bodybuilding strength gender:all goal:get_stronger days:3',
    difficulty: 2,
    workouts: [
      {
        name: 'Day A: Squat + Push',
        exercises: [
          { name: 'Barbell Back Squat',       sets: 5, repsMin: 3,  repsMax: 5,  rest: 180, notes: 'Work to a heavy top set then 4 back-off sets.' },
          { name: 'Barbell Bench Press',      sets: 5, repsMin: 3,  repsMax: 5,  rest: 180, notes: 'Heavy pressing. Strong arch.' },
          { name: 'Leg Press',               sets: 3, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Back-off sets for leg growth.' },
          { name: 'Incline Dumbbell Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Extra chest work after bench.' },
          { name: 'Dumbbell Lateral Raise',  sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Side delts. Assistance work.' },
        ],
      },
      {
        name: 'Day B: Deadlift + Pull',
        exercises: [
          { name: 'Conventional Deadlift',    sets: 5, repsMin: 3,  repsMax: 5,  rest: 180, notes: 'Work up to a heavy top set. Brace everything.' },
          { name: 'Weighted Pull-Up',         sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Weighted vertical pull.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 8, repsMax: 12, rest: 90, notes: 'Hamstring back-off work.' },
          { name: 'Seated Cable Row',         sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Back accessory work.' },
          { name: 'EZ Bar Curl',              sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Bicep assistance.' },
        ],
      },
      {
        name: 'Day C: Shoulders + Arms',
        exercises: [
          { name: 'Barbell Overhead Press',   sets: 5, repsMin: 3,  repsMax: 5,  rest: 150, notes: 'Heavy overhead press. Front delt strength base.' },
          { name: 'Dumbbell Lateral Raise',   sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Side delts. These do not grow from pressing. 4 working sets.' },
          { name: 'Face Pull',                sets: 3, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rear delts and external rotation. Non-negotiable for shoulder health.' },
          { name: 'EZ Bar Skull Crusher',     sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Tricep overhead work. Long-head stretch.' },
          { name: 'Preacher Curl (EZ Bar)',   sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Bicep peak. Slow negative.' },
        ],
      },
    ],
  },

  // ── 17. Arms & Upper Body Aesthetic ──────────────────────────────────────
  {
    name: 'Arms & Upper Body Aesthetic',
    description: 'Built for lifters who want to prioritise arm development alongside overall upper-body aesthetics. Bicep and tricep sets are increased well beyond what a balanced programme provides; chest, shoulders, and back are maintained with enough work to hold what you have. Three upper sessions per week, each with a different focus. Run for 6–8 weeks. Add reps, then weight, on every exercise. Stop 1 to 2 reps before failure on your last set.',
    tags: 'aesthetic bodybuilding arms gender:all goal:build_muscle days:2 weak_point',
    difficulty: 1,
    workouts: [
      {
        name: 'Chest & Triceps',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Volume focus.' },
          { name: 'Incline Dumbbell Press',    sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Upper chest.' },
          { name: 'Pec Deck (Machine Fly)',    sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Pump isolation.' },
          { name: 'Overhead Cable Tricep Extension', sets: 4, repsMin: 12, repsMax: 20, rest: 60, notes: 'Long-head stretch. Key for arm size.' },
          { name: 'EZ Bar Skull Crusher',      sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Overhead tricep.' },
          { name: 'Rope Pushdown',             sets: 3, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Tricep pump finisher.' },
        ],
      },
      {
        name: 'Back & Biceps',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)',  sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Back width.' },
          { name: 'Seated Cable Row',          sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Thickness.' },
          { name: 'EZ Bar Curl',               sets: 4, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Primary bicep compound.' },
          { name: 'Incline Dumbbell Curl',     sets: 4, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Full stretch at bottom. Great for bicep growth.' },
          { name: 'Preacher Curl (EZ Bar)',    sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Peak contraction.' },
          { name: 'Hammer Curl',               sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Brachialis and outer bicep.' },
        ],
      },
      {
        name: 'Shoulders & Core',
        exercises: [
          { name: 'Barbell Overhead Press',   sets: 4, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Shoulder compound.' },
          { name: 'Dumbbell Lateral Raise',  sets: 5, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Wide side delts.' },
          { name: 'Face Pull',               sets: 3, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rear delt health.' },
          { name: 'Cable Crunch',            sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Abs: keep waist tight.' },
          { name: 'Hanging Leg Raise',       sets: 3, repsMin: 10, repsMax: 20, rest: 60,  notes: 'Lower abs.' },
        ],
      },
    ],
  },

  // ── 18. Female Bodybuilding Foundation ───────────────────────────────────
  {
    name: 'Female Bodybuilding Foundation',
    description: 'A physique-focused programme structured around the muscle groups most impactful for female bodybuilding and fitness: glutes, hamstrings, upper-body detail, and shoulder width. Three lower-body sessions per week give glutes and hamstrings the frequency needed for visible development; two upper sessions balance the physique. Add reps session by session, then add weight when you reach the top of the rep range. Stop 1 to 2 reps before failure on each set. Suitable for female lifters with 6 months or more of consistent resistance training.',
    tags: 'bodybuilding glutes hamstrings gender:women goal:build_muscle days:5 intermediate',
    difficulty: 1,
    workouts: [
      {
        name: 'Lower: Glute Focused',
        exercises: [
          { name: 'Barbell Hip Thrust',         sets: 4, repsMin: 8,  repsMax: 15, rest: 90,  notes: 'Primary glute driver. Go heavy over time.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 8,  repsMax: 12, rest: 90, notes: 'Glutes and hamstrings loaded.' },
          { name: 'Bulgarian Split Squat',       sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Unilateral glute work.' },
          { name: 'Cable Kickback',              sets: 3, repsMin: 15, repsMax: 25, rest: 60, notes: 'Hip extension isolation.' },
          { name: 'Seated Calf Raise',           sets: 3, repsMin: 15, repsMax: 25, rest: 60, notes: 'Calf finisher.' },
        ],
      },
      {
        name: 'Upper: Push & Pull',
        exercises: [
          { name: 'Incline Dumbbell Press',   sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Upper chest push.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Back width.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Shoulder compound.' },
          { name: 'Seated Cable Row',         sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Mid-back.' },
          { name: 'Dumbbell Lateral Raise',  sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Shoulder width.' },
        ],
      },
      {
        name: 'Lower: Quad & Hamstring',
        exercises: [
          { name: 'Leg Press',               sets: 4, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Volume quads.' },
          { name: 'Lying Leg Curl',          sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Hamstring isolation.' },
          { name: 'Hack Squat Machine',      sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Quad definition.' },
          { name: 'Leg Extension',           sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Quad pump.' },
          { name: 'Abductor Machine',        sets: 3, repsMin: 20, repsMax: 30, rest: 60,  notes: 'Glute med / hip width.' },
        ],
      },
    ],
  },

  // ── 19. Women's Full Body Foundation ──────────────────────────────────────
  {
    name: 'Women\'s Full Body Foundation',
    description: 'Three full-body sessions per week covering every major muscle group with an emphasis on the lower body and glutes. Designed as a first programme for anyone starting out, or returning after a break. Each session covers a squat, a hinge, a push, and a pull: the four movements you need to build strength from scratch. Add small amounts of weight each week and focus on technique before chasing numbers. Leave 2 to 3 reps in the tank on every set.',
    tags: 'beginner full_body gender:women goal:build_muscle days:3 audience:beginner featured',
    difficulty: 0,
    workouts: [
      {
        name: 'Full Body A',
        exercises: [
          { name: 'Dumbbell Goblet Squat', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Hold dumbbell at chest. Sit deep into the squat. Push knees out.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 10, repsMax: 12, rest: 90, notes: 'Hip hinge. Feel the hamstring stretch. Keep bar close to legs.' },
          { name: 'Dumbbell Bench Press', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Control the descent. Press smoothly. Full range.' },
          { name: 'Dumbbell Row', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Brace core. Pull elbow back and up. Squeeze back.' },
          { name: 'Glute Bridge', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Drive hips up. Squeeze glutes hard at top. Hold 1 second.' },
        ],
      },
      {
        name: 'Full Body B',
        exercises: [
          { name: 'Leg Press', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Higher foot placement for more glute and hamstring. Full range.' },
          { name: 'Lying Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Curl towards glutes. Hold a second at top.' },
          { name: 'Incline Dumbbell Press', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Slight incline. Upper chest emphasis. Control down.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Pull elbows down to sides. Arch chest toward bar.' },
          { name: 'Dumbbell Lateral Raise', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Light weight. Raise to shoulder height. Slow and controlled.' },
        ],
      },
      {
        name: 'Full Body C',
        exercises: [
          { name: 'Bulgarian Split Squat', sets: 3, repsMin: 10, repsMax: 12, rest: 90, notes: 'Rear foot on bench. Front knee tracks over toes. Drive through front heel.' },
          { name: 'Seated Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Full stretch at start. Curl to full contraction. Squeeze.' },
          { name: 'Dumbbell Shoulder Press', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Seated. Press overhead. Lower slowly.' },
          { name: 'Seated Cable Row', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Full stretch. Row to belly. Elbows back.' },
          { name: 'Face Pull', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rope at eye height. Elbows high. Rear-delt and shoulder health.' },
        ],
      },
    ],
  },

  // ── 20. Women's Glute & Strength ──────────────────────────────────────────
  {
    name: 'Women\'s Glute & Strength',
    description: 'A four-day programme built around glute and hamstring development, with upper-body strength work to balance proportions. Days one and three focus on the lower body with a different emphasis each session: one heavier and compound-led, the other detail-oriented. Days two and four train the upper body with enough sets to build visible strength in the shoulders, back, and arms. Progress by adding weight when all reps are completed with good technique.',
    tags: 'intermediate upper_lower gender:women goal:build_muscle days:4 glutes featured',
    difficulty: 1,
    workouts: [
      {
        name: 'Lower A: Glutes & Hamstrings',
        exercises: [
          { name: 'Hip Thrust (Barbell)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Shoulders on bench. Drive hips fully up. Squeeze hard at top.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Hip hinge. Long hamstring stretch. Control the descent.' },
          { name: 'Bulgarian Split Squat', sets: 3, repsMin: 10, repsMax: 12, rest: 90, notes: 'Rear foot elevated. Drive through front heel. Knee tracks toes.' },
          { name: 'Lying Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Curl hard. Squeeze glutes as you curl. Hold at top.' },
          { name: 'Cable Kickback', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Full hip extension. Squeeze glute at top. Slow and controlled.' },
        ],
      },
      {
        name: 'Upper A: Back & Shoulders',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 10, repsMax: 12, rest: 90, notes: 'Pull elbows to sides. Stretch fully overhead between reps.' },
          { name: 'Seated Cable Row', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Full stretch. Row elbows back. Squeeze shoulder blades.' },
          { name: 'Dumbbell Shoulder Press', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Press overhead. Full range. Lower slowly.' },
          { name: 'Dumbbell Lateral Raise', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Raise to shoulder height only. Slow eccentric.' },
          { name: 'Face Pull', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rope at eye height. Elbows high. Rear-delt health.' },
        ],
      },
      {
        name: 'Lower B: Quads & Glutes',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, repsMin: 8, repsMax: 12, rest: 120, notes: 'Full depth. Knees out. Drive through heels.' },
          { name: 'Leg Press', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'High foot for glutes. Lower foot for quads. Mix it up.' },
          { name: 'Leg Extension', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Quad isolation. Squeeze hard at the top. Slow descent.' },
          { name: 'Glute Bridge', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Body-weight or load on hips. Drive hips up. Squeeze.' },
          { name: 'Seated Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Full stretch. Curl to contraction. Slow and controlled.' },
        ],
      },
      {
        name: 'Upper B: Chest, Arms & Core',
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Slight incline. Upper chest. Control the descent.' },
          { name: 'Machine Row (Chest Supported)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Chest on pad. Row elbows back. Squeeze back.' },
          { name: 'Dumbbell Curl', sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Full range. Squeeze at top. Lower slowly.' },
          { name: 'Rope Pushdown', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Elbows pinned. Full extension. Squeeze triceps.' },
          { name: 'Dumbbell Lateral Raise', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Shoulder-width only. Slow, controlled arc.' },
        ],
      },
    ],
  },

  // ── 21. Dumbbell Only — Full Body ─────────────────────────────────────────
  {
    name: 'Dumbbell Only: Full Body',
    description: 'A three-day full-body programme that requires nothing but a set of dumbbells. Every major muscle group is trained each session using dumbbell-friendly movement patterns: squat, hinge, press, and row. Great for home training, travel, or gyms with limited equipment. Progress by adding reps first. Once you hit the top of the rep range, move up to the next dumbbell weight.',
    tags: 'full_body equipment:dumbbell gender:all goal:build_muscle days:3 beginner intermediate featured',
    difficulty: 0,
    workouts: [
      {
        name: 'Full Body A',
        exercises: [
          { name: 'Dumbbell Goblet Squat', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Hold dumbbell at chest. Sit deep. Push knees out.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 10, repsMax: 12, rest: 90, notes: 'Use dumbbells. Hip hinge. Long hamstring stretch.' },
          { name: 'Dumbbell Bench Press', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Flat bench or floor press if no bench. Full range.' },
          { name: 'Dumbbell Row', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Brace core. Pull elbow back and up. Squeeze back at top.' },
          { name: 'Dumbbell Lateral Raise', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Light. Raise to shoulder height. Slow and controlled.' },
        ],
      },
      {
        name: 'Full Body B',
        exercises: [
          { name: 'Bulgarian Split Squat', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Rear foot on chair. Dumbbells at sides. Drive through front heel.' },
          { name: 'Glute Bridge', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Dumbbell on hips for load. Drive hips up. Squeeze at top.' },
          { name: 'Incline Dumbbell Press', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Incline bench or floor. Upper chest. Control down.' },
          { name: 'Dumbbell Shoulder Press', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Seated or standing. Full overhead range.' },
          { name: 'EZ Bar Curl', sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Use dumbbells. Full range. Squeeze at top.' },
        ],
      },
      {
        name: 'Full Body C',
        exercises: [
          { name: 'Lunge', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Walking or stationary. Dumbbells at sides. Front knee tracks toes.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 10, repsMax: 12, rest: 90, notes: 'Use dumbbells. Slow eccentric. Feel the stretch.' },
          { name: 'Dumbbell Bench Press', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Vary grip: neutral or pronated.' },
          { name: 'Dumbbell Row', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Other side. Match reps on both arms.' },
          { name: 'Dumbbell Rear Delt Fly', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rear delts. Bent-over, slight elbow bend, slow arc. A different muscle from side delts.' },
          { name: 'Hammer Curl', sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Neutral grip. Brachialis and outer bicep. Keep elbows pinned.' },
        ],
      },
    ],
  },

  // ── 22. Home — No Equipment ───────────────────────────────────────────────
  {
    name: 'Home: No Equipment',
    description: 'Three sessions per week using only your bodyweight. Designed to build genuine strength and control across the whole body without needing a gym or any equipment. Progressions are built in. As movements become too easy, there are harder variations to move towards. A good starting point if you are completely new to training, or to maintain fitness when you cannot get to a gym.',
    tags: 'full_body equipment:bodyweight home gender:all goal:build_muscle goal:conditioning days:3 beginner audience:beginner',
    difficulty: 0,
    workouts: [
      {
        name: 'Session A',
        exercises: [
          { name: 'Bodyweight Squat', sets: 4, repsMin: 15, repsMax: 25, rest: 60, notes: 'Sit as deep as possible. Push knees out. Drive through heels. When this feels easy, progress to Bulgarian split squat.' },
          { name: 'Push-Up', sets: 4, repsMin: 8, repsMax: 20, rest: 60, notes: 'Full range. Chest to floor. Lock elbows at top. Elevate hands on a surface to make it easier; feet for harder.' },
          { name: 'Lunge', sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Per leg. Front knee tracks toes. Upright torso.' },
          { name: 'Inverted Row', sets: 3, repsMin: 8, repsMax: 15, rest: 60, notes: 'Under a table or bar. Body straight. Pull chest to bar. If you have a bar, progress to pull-up.' },
          { name: 'Glute Bridge', sets: 3, repsMin: 15, repsMax: 25, rest: 60, notes: 'Drive hips up. Squeeze glutes at top. Single-leg to progress.' },
        ],
      },
      {
        name: 'Session B',
        exercises: [
          { name: 'Bulgarian Split Squat', sets: 3, repsMin: 8, repsMax: 15, rest: 90, notes: 'Rear foot on a chair or sofa. Front knee tracks toes. Drive through the front heel.' },
          { name: 'Push-Up', sets: 3, repsMin: 10, repsMax: 20, rest: 60, notes: 'Try a closer grip for more tricep emphasis. Keep elbows at 45 degrees.' },
          { name: 'Bodyweight Squat', sets: 3, repsMin: 20, repsMax: 30, rest: 60, notes: 'Higher rep today. Smooth and controlled. Pause at the bottom.' },
          { name: 'Inverted Row', sets: 3, repsMin: 8, repsMax: 15, rest: 60, notes: 'Pull hard. Pause at the top. Slow descent.' },
          { name: 'Glute Bridge', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Add a hold of 2 seconds at the top this session.' },
        ],
      },
      {
        name: 'Session C',
        exercises: [
          { name: 'Lunge', sets: 4, repsMin: 12, repsMax: 20, rest: 60, notes: 'Walking lunges if space allows. Maintain an upright torso throughout.' },
          { name: 'Push-Up', sets: 4, repsMin: 10, repsMax: 20, rest: 60, notes: 'Vary width. Wide grip for chest. Close for triceps. Find your challenge point.' },
          { name: 'Bodyweight Squat', sets: 3, repsMin: 15, repsMax: 25, rest: 60, notes: 'Add a pause at the bottom if regular squats feel easy.' },
          { name: 'Inverted Row', sets: 4, repsMin: 8, repsMax: 15, rest: 60, notes: 'Keep hips up. Body straight. Scapulae retract as you pull.' },
          { name: 'Glute Bridge', sets: 3, repsMin: 20, repsMax: 25, rest: 60, notes: 'High rep set. Full squeeze every rep.' },
        ],
      },
    ],
  },

  // ── 23. Men's Physique — Off-Season ──────────────────────────────────────
  {
    name: "Men's Physique",
    description: "Five-day programme built around the Men's Physique division. Judged from the waist up in board shorts, the division rewards a broad back, capped shoulders, full chest, and defined arms over a lean midsection. Legs are trained once per week to maintain health and proportion. The programme runs for 8 to 12 weeks, prioritising shoulder width, upper-chest development, lat width, and rear-delt health. Progress conservatively. This is a muscle-building phase, not a strength-testing phase.",
    tags: 'bodybuilding category:division division:mens_physique gender:men goal:stage_prep days:5 advanced intermediate featured',
    difficulty: 2,
    workouts: [
      {
        name: 'Day 1: Shoulders & Arms',
        exercises: [
          { name: 'Barbell Overhead Press', sets: 4, repsMin: 8, repsMax: 12, rest: 120, notes: 'Primary shoulder builder. Control the descent. Stop 1 to 2 reps short of failure.' },
          { name: 'Dumbbell Lateral Raise', sets: 5, repsMin: 15, repsMax: 20, rest: 60, notes: 'Width is key in this division. Lead with elbow. 4 s eccentric.' },
          { name: 'Cable Lateral Raise', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Cables keep constant tension. Alternate arms or use both. Keep strict form.' },
          { name: 'EZ Bar Curl', sets: 4, repsMin: 8, repsMax: 12, rest: 60, notes: 'Full range. Squeeze at top. Slow 3 s descent.' },
          { name: 'Rope Pushdown', sets: 4, repsMin: 12, repsMax: 15, rest: 60, notes: 'Elbows pinned. Full extension. Squeeze at bottom.' },
          { name: 'Overhead Dumbbell Extension', sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Long head emphasis. Full overhead stretch.' },
        ],
      },
      {
        name: 'Day 2: Back Width & Thickness',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Lat width is a judging priority. Full stretch. Pull elbows to pockets.' },
          { name: 'Seated Cable Row', sets: 4, repsMin: 10, repsMax: 12, rest: 90, notes: 'Full stretch forward. Row to lower chest. Squeeze mid-back.' },
          { name: 'T-Bar Row', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Chest against pad. Controlled. Squeeze at top.' },
          { name: 'Cable Straight-Arm Pulldown', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Lat activation. Slight elbow bend. Slow arc down.' },
          { name: 'Face Pull', sets: 4, repsMin: 20, repsMax: 25, rest: 60, notes: 'Rear-delt and rotator cuff health. Rope at chest height. Elbows high.' },
        ],
      },
      {
        name: 'Day 3: Chest & Triceps',
        exercises: [
          { name: 'Incline Barbell Bench Press', sets: 4, repsMin: 8, repsMax: 12, rest: 120, notes: 'Upper chest fills the board-shorts look from the front. Control descent.' },
          { name: 'Incline Dumbbell Press', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Greater range of motion than barbell. Slow 3 s descent.' },
          { name: 'Pec Deck (Machine Fly)', sets: 4, repsMin: 12, repsMax: 15, rest: 90, notes: 'Chest isolation. Full stretch. Squeeze hard at the contraction point.' },
          { name: 'Close-Grip Bench Press', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Tricep compound. Elbows at 45 degrees. Full extension at top.' },
          { name: 'Rope Pushdown', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Tricep finishing sets. Squeeze every rep.' },
        ],
      },
      {
        name: 'Day 4: Legs (Maintenance)',
        exercises: [
          { name: 'Barbell Back Squat', sets: 3, repsMin: 8, repsMax: 12, rest: 120, notes: 'Legs are not displayed in board shorts but must be trained for balance and health. One moderate leg session per week is enough in a muscle-building phase.' },
          { name: 'Leg Press', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Secondary sets only. No need to push to the limit on this day.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 10, repsMax: 12, rest: 90, notes: 'Hamstring and glute work. Keep it solid, not extreme.' },
          { name: 'Leg Extension', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Quad detail. High reps, pump-focused.' },
          { name: 'Lying Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Hamstring curl. Full range. Squeeze at top.' },
        ],
      },
      {
        name: 'Day 5: Shoulders & Back Detail',
        exercises: [
          { name: 'Dumbbell Lateral Raise', sets: 5, repsMin: 15, repsMax: 20, rest: 60, notes: 'Second shoulder session of the week. Men\'s Physique is won on shoulder width. Strict form, slow descent.' },
          { name: 'Cable Rear Delt Fly', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rear-delt detail. Essential for shoulder roundness from behind.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Second lat session. Focus on the stretch and contraction.' },
          { name: 'Machine Row (Chest Supported)', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Back detail and thickness without lower-back stress.' },
          { name: 'Hammer Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Brachialis and forearm development. Keep elbows pinned.' },
        ],
      },
    ],
  },

  // ── 24. Bikini — Off-Season ───────────────────────────────────────────────
  {
    name: 'Bikini',
    description: "Four-day programme built around the Bikini division. Bikini rewards a lean, athletic physique with developed glutes, balanced shoulders, and a soft overall appearance, not extreme muscle mass. This programme trains glutes and hamstrings twice per week with a mix of heavy compound work and detail isolation, while upper body sessions build proportional shoulder width and a strong back. Progress on the compound movements week to week. The focus is building muscle and strength.",
    tags: 'bodybuilding category:division division:bikini gender:women goal:stage_prep days:4 intermediate featured',
    difficulty: 1,
    workouts: [
      {
        name: 'Day 1: Glutes & Hamstrings (Heavy)',
        exercises: [
          { name: 'Hip Thrust (Barbell)', sets: 5, repsMin: 8, repsMax: 12, rest: 120, notes: 'Primary glute builder in this division. Shoulders on bench, hips fully extended. Squeeze hard at top.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Long hamstring stretch. Slow 3 s eccentric. Hip hinge only: do not round the back.' },
          { name: 'Bulgarian Split Squat', sets: 3, repsMin: 10, repsMax: 12, rest: 90, notes: 'Rear foot elevated. Drive through front heel. Squeeze glute at the top.' },
          { name: 'Lying Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Curl hard. Squeeze at top. Slow descent.' },
          { name: 'Cable Kickback', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Full hip extension. Squeeze glute. Control the return.' },
        ],
      },
      {
        name: 'Day 2: Upper Body',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 10, repsMax: 12, rest: 90, notes: 'Back width contributes to the V-shape even in Bikini. Full stretch overhead. Pull elbows down.' },
          { name: 'Seated Cable Row', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Row elbows back. Squeeze mid-back. Full stretch forward between reps.' },
          { name: 'Dumbbell Shoulder Press', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Balanced shoulder development. Press overhead. Control down.' },
          { name: 'Dumbbell Lateral Raise', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Capped shoulders give the narrow-waist illusion. Raise to shoulder height. Slow eccentric.' },
          { name: 'Dumbbell Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Arms need enough development for stage confidence. Full range.' },
        ],
      },
      {
        name: 'Day 3: Quads & Glutes',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, repsMin: 8, repsMax: 12, rest: 120, notes: 'Quad and glute compound. Full depth. Bikini rewards a tight quad sweep alongside developed glutes.' },
          { name: 'Leg Press', sets: 4, repsMin: 12, repsMax: 15, rest: 90, notes: 'Higher foot position for glute emphasis. Control the descent.' },
          { name: 'Glute Bridge', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Bodyweight or loaded. Squeeze fully at top. High reps for glute activation.' },
          { name: 'Leg Extension', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Quad detail and sweep. Squeeze hard at top.' },
          { name: 'Seated Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Hamstring tie-in. Full range. Controlled.' },
        ],
      },
      {
        name: 'Day 4: Upper Body & Shoulders',
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Upper chest fullness helps the overall shape on stage. Control the descent.' },
          { name: 'Machine Row (Chest Supported)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Back thickness without lower-back fatigue. Squeeze at the top.' },
          { name: 'Dumbbell Lateral Raise', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Second shoulder session. Shoulder width helps frame the waist. Slow and strict.' },
          { name: 'Reverse Pec Deck', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rear-delt isolation. Round shoulders look. Essential for stage presence.' },
          { name: 'Rope Pushdown', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Tricep detail. Arms at full extension look clean on stage.' },
        ],
      },
    ],
  },

  // ── 25. Wellness — Off-Season ─────────────────────────────────────────────
  {
    name: 'Wellness',
    description: "Four to five days per week built around the Wellness division, the most lower-body-forward division in women's physique sport. Wellness rewards a heavily developed lower body (glutes, quads, and hamstrings) relative to a smaller, more moderate upper body. This programme trains the lower body four times per week with two different emphasis days, and upper body twice with a lower set count to keep it proportional. Progress on lower-body compounds is the priority.",
    tags: 'bodybuilding category:division division:wellness gender:women goal:stage_prep days:5 advanced intermediate',
    difficulty: 2,
    workouts: [
      {
        name: 'Day 1: Glutes & Hamstrings (Heavy)',
        exercises: [
          { name: 'Hip Thrust (Barbell)', sets: 5, repsMin: 6, repsMax: 10, rest: 120, notes: 'Heavy. This is your primary indicator of glute development. Load progressively each week.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 5, repsMin: 8, repsMax: 10, rest: 120, notes: 'Hip hinge. Maximum hamstring stretch. Bar close to legs. 3 s eccentric.' },
          { name: 'Sumo Deadlift', sets: 3, repsMin: 5, repsMax: 8, rest: 120, notes: 'Wide stance. Targets inner thighs and glutes. Drive hips through at the top.' },
          { name: 'Lying Leg Curl', sets: 4, repsMin: 10, repsMax: 15, rest: 60, notes: 'Knee flexion for hamstring lower-portion development. Squeeze hard at top.' },
          { name: 'Cable Kickback', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Full hip extension. Squeeze glute at lockout. Slow return.' },
        ],
      },
      {
        name: 'Day 2: Quads (Heavy)',
        exercises: [
          { name: 'Barbell Back Squat', sets: 5, repsMin: 6, repsMax: 10, rest: 120, notes: 'Primary quad builder. Full depth. Control the descent. More quad-dominant than hip thrust.' },
          { name: 'Leg Press', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Lower foot placement for more quad. Push through heels. Full range.' },
          { name: 'Bulgarian Split Squat', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Rear foot elevated. Drive through front heel. Trains quads and glutes hard.' },
          { name: 'Leg Extension', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Quad isolation. Full contraction. Slow descent.' },
          { name: 'Seated Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Balance the quad work with hamstring sets.' },
        ],
      },
      {
        name: 'Day 3: Upper Body (Maintenance)',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Wellness has a smaller upper body by design. Keeping sets moderate keeps the back healthy and proportional.' },
          { name: 'Seated Cable Row', sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Mid-back. Maintenance, not maximum.' },
          { name: 'Dumbbell Shoulder Press', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Shoulder health and some cap development. Keep it moderate.' },
          { name: 'Dumbbell Lateral Raise', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Some shoulder width still helps the overall shape. Light and controlled.' },
          { name: 'Dumbbell Curl', sets: 2, repsMin: 12, repsMax: 15, rest: 60, notes: 'Arm maintenance. Keep arms proportional to the lower body.' },
        ],
      },
      {
        name: 'Day 4: Glutes & Quads (Volume)',
        exercises: [
          { name: 'Glute Bridge', sets: 5, repsMin: 15, repsMax: 20, rest: 60, notes: 'Loaded glute bridge or body weight for high-rep pump session. Squeeze every rep.' },
          { name: 'Leg Press', sets: 4, repsMin: 15, repsMax: 20, rest: 90, notes: 'Higher rep range today. Mix of foot positions. Pump session.' },
          { name: 'Cable Kickback', sets: 4, repsMin: 20, repsMax: 25, rest: 60, notes: 'Detail work. Full range. Slow and controlled every rep.' },
          { name: 'Lunge', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Walking or stationary. Trains hips and quads evenly.' },
          { name: 'Lying Leg Curl', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'High-rep hamstring pump. Full range.' },
        ],
      },
      {
        name: 'Day 5: Upper Body & Glute Detail',
        exercises: [
          { name: 'Machine Row (Chest Supported)', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Upper back maintenance. Chest support removes lower-back stress.' },
          { name: 'Incline Dumbbell Press', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Upper chest. Fewer sets in this division by design.' },
          { name: 'Reverse Pec Deck', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rear-delt health and rounding.' },
          { name: 'Hip Thrust (Barbell)', sets: 4, repsMin: 12, repsMax: 15, rest: 90, notes: 'Second hip thrust session. Slightly lighter than Day 1. Focus on squeeze and contraction.' },
          { name: 'Seated Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Hamstring detail to finish the week.' },
        ],
      },
    ],
  },

  // ── 26. Classic Physique — Off-Season ─────────────────────────────────────
  {
    name: 'Classic Physique',
    description: "Five-day programme for the Classic Physique division. Classic Physique is judged on balanced, symmetrical development: a wide back, capped shoulders, full chest, narrow waist, well-developed legs, and a V-taper reminiscent of the golden era of bodybuilding. Unlike Men's Physique, legs are displayed and are a significant judging criterion. This programme gives equal attention to both upper and lower body with a slight emphasis on the key visual areas: back width, shoulder caps, and upper-chest fullness.",
    tags: 'bodybuilding category:division division:classic_physique gender:men goal:stage_prep days:5 advanced',
    difficulty: 2,
    workouts: [
      {
        name: 'Day 1: Chest & Shoulders',
        exercises: [
          { name: 'Incline Barbell Bench Press', sets: 4, repsMin: 8, repsMax: 12, rest: 120, notes: 'Upper chest is visually critical. Controlled eccentric. Stop 1 to 2 reps from failure.' },
          { name: 'Barbell Bench Press', sets: 4, repsMin: 8, repsMax: 12, rest: 120, notes: 'Overall chest mass. Bar to chest. Press smoothly.' },
          { name: 'Pec Deck (Machine Fly)', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Chest isolation. Full stretch. Squeeze hard at contraction.' },
          { name: 'Barbell Overhead Press', sets: 4, repsMin: 8, repsMax: 12, rest: 120, notes: 'Shoulder mass. Control the descent.' },
          { name: 'Dumbbell Lateral Raise', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Shoulder width. Lead with elbow. 4 s eccentric.' },
          { name: 'Face Pull', sets: 3, repsMin: 20, repsMax: 25, rest: 60, notes: 'Rear-delt health. Rope at chest height. Elbows high.' },
        ],
      },
      {
        name: 'Day 2: Back Width & Detail',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Lat width is the core of the V-taper in this division. Full stretch. Pull elbows to pockets.' },
          { name: 'T-Bar Row', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Back thickness. Chest against pad. Squeeze rhomboids.' },
          { name: 'Seated Cable Row', sets: 4, repsMin: 10, repsMax: 12, rest: 90, notes: 'Mid-back detail. Full stretch forward. Row elbows back.' },
          { name: 'Cable Straight-Arm Pulldown', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Lat length. Slight elbow bend. Slow arc.' },
          { name: 'Cable Rear Delt Fly', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rear-delt. Round shoulders from behind. Keep strict form.' },
        ],
      },
      {
        name: 'Day 3: Legs',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, repsMin: 8, repsMax: 12, rest: 120, notes: 'Classic Physique legs must be well-developed. Full depth. Drive through heels.' },
          { name: 'Leg Press', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Quad and glute. Mix foot positions across sets.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 8, repsMax: 12, rest: 90, notes: 'Hamstring and glute compound. Hip hinge. 3 s eccentric.' },
          { name: 'Leg Extension', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Quad detail. Squeeze at top. Slow descent.' },
          { name: 'Lying Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Hamstring curl. Full range. Squeeze at top.' },
          { name: 'Glute Bridge', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Glute activation and development. Squeeze at top.' },
        ],
      },
      {
        name: 'Day 4: Arms & Core',
        exercises: [
          { name: 'EZ Bar Curl', sets: 4, repsMin: 8, repsMax: 12, rest: 60, notes: 'Bicep mass. Full range. Squeeze at top. 3 s eccentric.' },
          { name: 'Hammer Curl', sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Brachialis development. Elbows pinned.' },
          { name: 'Close-Grip Bench Press', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Tricep mass. Elbows at 45 degrees. Full extension.' },
          { name: 'Overhead Dumbbell Extension', sets: 3, repsMin: 10, repsMax: 15, rest: 60, notes: 'Long head development. Full overhead stretch.' },
          { name: 'Rope Pushdown', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Tricep finishing sets. Squeeze every rep.' },
        ],
      },
      {
        name: 'Day 5: Back & Shoulders Detail',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Second lat session. Focus on the stretch and full contraction.' },
          { name: 'Dumbbell Lateral Raise', sets: 5, repsMin: 15, repsMax: 20, rest: 60, notes: 'Second shoulder session this week. Width is always a priority in Classic. Strict form.' },
          { name: 'Machine Row (Chest Supported)', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Back detail. Chest on pad for strict form.' },
          { name: 'Reverse Pec Deck', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rear-delt rounding. Essential for shoulder completeness from behind.' },
          { name: 'Cable Rear Delt Fly', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rear-delt isolation. Strict form. Slow controlled movement.' },
        ],
      },
    ],
  },

  // ── 27. Figure — Off-Season ───────────────────────────────────────────────
  {
    name: 'Figure',
    description: "Five-day programme for the Figure division. Figure sits between Bikini and Women's Physique in muscularity: athletic and muscular with visible shoulders, a strong and wide back, and proportional leg development. Shoulders and back are the priority visual features judged in Figure. This programme dedicates significant sets to back width, rear-delt development, and shoulder capping while maintaining balanced lower-body strength.",
    tags: 'bodybuilding category:division division:figure gender:women goal:stage_prep days:5 advanced',
    difficulty: 2,
    workouts: [
      {
        name: 'Day 1: Back Width & Detail',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)', sets: 5, repsMin: 8, repsMax: 12, rest: 90, notes: 'Back width is the single most judged attribute in Figure. Full stretch overhead. Pull elbows to pockets. 3 s eccentric.' },
          { name: 'Seated Cable Row', sets: 4, repsMin: 10, repsMax: 12, rest: 90, notes: 'Mid-back thickness. Full stretch forward. Row elbows back to hips.' },
          { name: 'T-Bar Row', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Back thickness. Chest on pad. Squeeze hard at the contraction point.' },
          { name: 'Cable Straight-Arm Pulldown', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Lat length. Slight elbow bend. Slow arc down.' },
          { name: 'Face Pull', sets: 4, repsMin: 20, repsMax: 25, rest: 60, notes: 'Rear-delt health and rounding. Essential in Figure.' },
        ],
      },
      {
        name: 'Day 2: Legs',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, repsMin: 8, repsMax: 12, rest: 120, notes: 'Quad and glute compound. Full depth. Figure requires balanced leg development.' },
          { name: 'Hip Thrust (Barbell)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Glute emphasis. Shoulders on bench. Full extension at top.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 4, repsMin: 8, repsMax: 12, rest: 90, notes: 'Hamstring and glute. Hip hinge. 3 s eccentric.' },
          { name: 'Leg Extension', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Quad detail. Full contraction at top.' },
          { name: 'Lying Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Hamstring curl. Full range. Squeeze at top.' },
        ],
      },
      {
        name: 'Day 3: Shoulders & Arms',
        exercises: [
          { name: 'Dumbbell Shoulder Press', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Figure has visible, capped shoulders. Press overhead, control the descent.' },
          { name: 'Dumbbell Lateral Raise', sets: 5, repsMin: 15, repsMax: 20, rest: 60, notes: 'Width is critical. Lead with elbows. Raise to shoulder height. 4 s eccentric.' },
          { name: 'Cable Rear Delt Fly', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Round shoulder from behind. Rear-delt detail.' },
          { name: 'EZ Bar Curl', sets: 4, repsMin: 10, repsMax: 12, rest: 60, notes: 'Bicep development. Full range. Squeeze at top.' },
          { name: 'Rope Pushdown', sets: 4, repsMin: 12, repsMax: 15, rest: 60, notes: 'Tricep detail. Elbows pinned. Full extension.' },
        ],
      },
      {
        name: 'Day 4: Chest & Upper Back',
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Upper chest development. Slow 3 s descent. Full range of motion.' },
          { name: 'Machine Row (Chest Supported)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Mid and upper-back thickness. Chest on pad. Strict form.' },
          { name: 'Pec Deck (Machine Fly)', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Chest isolation. Full stretch. Squeeze at contraction.' },
          { name: 'Reverse Pec Deck', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Rear-delt. Arm out to the sides. Control both directions.' },
          { name: 'Dumbbell Lateral Raise', sets: 3, repsMin: 15, repsMax: 20, rest: 60, notes: 'Extra lateral delt sets this session.' },
        ],
      },
      {
        name: 'Day 5: Glute & Back Detail',
        exercises: [
          { name: 'Hip Thrust (Barbell)', sets: 4, repsMin: 12, repsMax: 15, rest: 90, notes: 'Second glute session. Slightly lighter than Day 2. Focus on squeeze and contraction quality.' },
          { name: 'Cable Kickback', sets: 4, repsMin: 15, repsMax: 20, rest: 60, notes: 'Glute isolation. Full hip extension. Slow and deliberate.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 10, repsMax: 15, rest: 90, notes: 'Second back session. Focus on lat engagement and full stretch.' },
          { name: 'Seated Cable Row', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Back detail. Control through full range.' },
          { name: 'Face Pull', sets: 3, repsMin: 20, repsMax: 25, rest: 60, notes: 'Rear-delt health. End the week with this.' },
        ],
      },
    ],
  },

  // ── 28. Women's Physique — Off-Season ────────────────────────────────────────
  {
    name: "Women's Physique",
    description: "A five-day programme for Women's Physique competitors, built around the division's aesthetic priorities: broad, capped shoulders, a detailed and wide back, proportionate arms, and a lean lower body without extreme size. Day 1 develops shoulder width and rear-delt health; Day 2 builds back thickness and lat spread; Day 3 trains lower body with glute and quad emphasis; Day 4 develops chest and triceps with upper-chest focus; Day 5 adds arm detail and a second rear-delt session to complete the week. Stop 1 to 2 reps before failure on most sets. Progress by adding reps first, then weight once the top of the range is reached on all sets.",
    tags: 'bodybuilding aesthetic gender:women goal:build_muscle days:5 advanced division:womens_physique',
    difficulty: 2,
    workouts: [
      {
        name: 'Day 1: Shoulders: Width & Rear-Delt Health',
        exercises: [
          { name: 'Dumbbell Lateral Raise',    sets: 5, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Lead with elbow, arm slightly forward. Raise to shoulder height. This is your priority movement today.' },
          { name: 'Machine Shoulder Press',    sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Machine keeps tension constant. Press overhead without shrugging. Controlled descent.' },
          { name: 'Cable Lateral Raise',       sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Cable provides constant tension through full range. Keep elbow slightly bent. Slow arc.' },
          { name: 'Face Pull',                 sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rope at eye height, elbows high. Rear-delt and external rotation health. Light weight only.' },
          { name: 'Reverse Pec Deck',          sets: 3, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Rear-delt isolation. Slight forward lean. Squeeze at full extension.' },
        ],
      },
      {
        name: 'Day 2: Back: Width & Thickness',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)',       sets: 4, repsMin: 8,  repsMax: 12, rest: 90, notes: 'Full overhead stretch, pull elbows to pockets. 3 s eccentric. Builds lat width.' },
          { name: 'Seated Cable Row',               sets: 4, repsMin: 10, repsMax: 12, rest: 90, notes: 'Full stretch forward, pull elbows back. Squeeze rhomboids at end range. Mid-back thickness.' },
          { name: 'Lat Pulldown (Close Grip)',       sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Lower-lat emphasis. Full stretch at top, hard squeeze at bottom. Controlled.' },
          { name: 'Machine Row (Chest Supported)',   sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Chest on pad eliminates lower-back fatigue. Drive elbows back hard. Squeeze at peak.' },
          { name: 'Cable Straight-Arm Pulldown',     sets: 3, repsMin: 12, repsMax: 15, rest: 60, notes: 'Lat finisher. Slight elbow bend. Full arc from overhead to hips. Feel each rep.' },
        ],
      },
      {
        name: 'Day 3: Lower Body: Glutes, Quads & Hamstrings',
        exercises: [
          { name: 'Barbell Back Squat',          sets: 4, repsMin: 8,  repsMax: 12, rest: 120, notes: 'Moderate depth. Drive through heels. Keep torso upright for quad bias.' },
          { name: 'Bulgarian Split Squat',        sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Rear foot elevated. Front foot forward enough to feel glutes. Drive through heel.' },
          { name: 'Hip Thrust (Barbell)',          sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full hip extension. Squeeze glutes hard at top. Hold 1 second. Lower controlled.' },
          { name: 'Romanian Deadlift (Barbell)',   sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Hip hinge, feel hamstring stretch. Keep bar close. Full hip extension at top.' },
          { name: 'Leg Extension',                 sets: 3, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Quad isolation finisher. Peak squeeze at full extension. Slow eccentric.' },
          { name: 'Cable Kickback',                sets: 3, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Full hip extension. Squeeze glute at lockout. Deliberate and controlled.' },
        ],
      },
      {
        name: 'Day 4: Chest & Triceps',
        exercises: [
          { name: 'Incline Barbell Bench Press',        sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Upper-chest priority. 30 degree incline. Controlled descent, drive up through chest.' },
          { name: 'Incline Dumbbell Press',              sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Greater range of motion than barbell. Upper-chest emphasis. 3 s eccentric.' },
          { name: 'Cable Fly (Low to High)',             sets: 3, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Cables low, arc upward. Full chest stretch at bottom. Squeeze at top.' },
          { name: 'Rope Pushdown',                       sets: 4, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Split rope at bottom, rotate wrists. Full extension each rep. Keep elbows still.' },
          { name: 'Overhead Dumbbell Extension',         sets: 3, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Both hands on one dumbbell. Full overhead stretch. Long-head tricep emphasis.' },
        ],
      },
      {
        name: 'Day 5: Arms & Rear-Delt Detail',
        exercises: [
          { name: 'EZ Bar Curl',             sets: 4, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Wrist-friendly barbell curl. Full range. Slow eccentric. No swinging.' },
          { name: 'Incline Dumbbell Curl',   sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Incline position puts long-head bicep under full stretch. Slow and deliberate.' },
          { name: 'Hammer Curl',             sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Neutral grip hits brachialis and forearm. Alternate arms or both together.' },
          { name: 'Face Pull',               sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Second rear-delt session this week. Light and controlled. Rear-delt health and fullness.' },
          { name: 'Dumbbell Rear Delt Fly',  sets: 3, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Bent over or seated. Arms slightly bent. Raise elbows to shoulder height. Squeeze.' },
          { name: 'Abductor Machine',        sets: 3, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Hip abductor finisher. Controlled squeeze outward. Completes the lower-body detail work.' },
        ],
      },
    ],
  },

  // ── 29. Women's Bodybuilding — Off-Season ────────────────────────────────────
  {
    name: "Women's Bodybuilding",
    description: "A five-day programme for Women's Bodybuilding competitors, built around maximum muscular development across every group. This is the most comprehensive of the women's divisions and requires serious, focused training across every major muscle group. Day 1 prioritises quads and calves; Day 2 builds back width and thickness; Day 3 develops chest, shoulders, and triceps; Day 4 targets hamstrings, glutes, and calves; Day 5 finishes the week with arms and shoulder detail. Eat in a moderate surplus throughout the muscle-building phase. Stop 1 to 2 reps before failure on most sets. Progress by adding reps first, then weight.",
    tags: 'bodybuilding gender:women goal:build_muscle days:5 advanced division:womens_bodybuilding',
    difficulty: 2,
    workouts: [
      {
        name: 'Day 1: Quads, Hamstrings & Calves',
        exercises: [
          { name: 'Barbell Back Squat',        sets: 5, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Heaviest compound of the week. Depth at parallel or below. Drive through heels.' },
          { name: 'Hack Squat Machine',         sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Quad isolation on hack squat. Feet low and close. Pause briefly at bottom.' },
          { name: 'Leg Extension',              sets: 4, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Quad pump finisher. Peak squeeze at full extension. Slow eccentric on each rep.' },
          { name: 'Lying Leg Curl',             sets: 4, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Full knee flexion. Slow 3 s eccentric. Do not let hips lift off the pad.' },
          { name: 'Standing Calf Raise (Machine)', sets: 5, repsMin: 12, repsMax: 20, rest: 60, notes: 'Full stretch at bottom. Pause 1 s. Rise to full tip-toe. High reps for calves.' },
          { name: 'Seated Calf Raise',          sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Soleus emphasis. Bent knee changes which muscle works. Full range every rep.' },
        ],
      },
      {
        name: 'Day 2: Back: Width & Thickness',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)',      sets: 5, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Primary lat-width movement. Full overhead stretch. Pull elbows to lower pockets.' },
          { name: 'Barbell Row (Bent Over)',        sets: 4, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Hinge 45 degrees. Pull bar to lower chest. Squeeze hard at top. Builds back thickness.' },
          { name: 'Seated Cable Row',               sets: 4, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Full forward stretch. Pull elbows back. Rhomboid and mid-back detail.' },
          { name: 'Machine Row (Chest Supported)',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Isolates back without spinal loading. Drive elbows back to full contraction.' },
          { name: 'Cable Straight-Arm Pulldown',    sets: 3, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Lat finisher. Arc from overhead to hips. Feel the lats throughout. Slight elbow bend.' },
          { name: 'Face Pull',                      sets: 3, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rope at eye height, elbows high. Rear-delt health and shoulder balance.' },
        ],
      },
      {
        name: 'Day 3: Chest, Shoulders & Triceps',
        exercises: [
          { name: 'Barbell Bench Press',        sets: 4, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Primary chest compound. Bar to lower chest. Controlled descent. Arch naturally.' },
          { name: 'Incline Dumbbell Press',      sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Upper-chest emphasis. Full range. 3 s eccentric. Chest leads the push.' },
          { name: 'Pec Deck (Machine Fly)',      sets: 3, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Chest isolation. Full stretch. Squeeze at close. No momentum.' },
          { name: 'Dumbbell Lateral Raise',      sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Shoulder width. Lead with elbow. Raise to shoulder height. Four sets today.' },
          { name: 'Close-Grip Bench Press',      sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Hands at shoulder width. Elbows tucked. Tricep priority. Lower with control.' },
          { name: 'Rope Pushdown',               sets: 4, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Split rope at bottom. Full extension. Elbows stay pinned to sides throughout.' },
        ],
      },
      {
        name: 'Day 4: Hamstrings, Glutes & Calves',
        exercises: [
          { name: 'Romanian Deadlift (Barbell)',  sets: 5, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Heavy hip hinge. Full hamstring stretch at bottom. Drive hips forward to lockout.' },
          { name: 'Seated Leg Curl',              sets: 4, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Seated position keeps hamstring under tension through full range. Slow eccentric.' },
          { name: 'Hip Thrust (Barbell)',          sets: 5, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Primary glute day. Heavy and deliberate. Full hip extension. Squeeze hard at top.' },
          { name: 'Bulgarian Split Squat',         sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Rear foot elevated. Drive through front heel. Glute and quad unilateral work.' },
          { name: 'Cable Kickback',                sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Glute isolation. Full hip extension. Slow return. Add ankle weight if cable is unavailable.' },
          { name: 'Leg Press Calf Raise',          sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Full range every rep. Pause at bottom stretch. Rise to full tip-toe at top.' },
        ],
      },
      {
        name: 'Day 5: Arms & Shoulder Detail',
        exercises: [
          { name: 'EZ Bar Curl',              sets: 4, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Primary bicep movement. Full range. Slow eccentric. No swinging.' },
          { name: 'Incline Dumbbell Curl',    sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Long-head stretch position. Arms back. Slow and controlled every rep.' },
          { name: 'Preacher Curl (EZ Bar)',   sets: 3, repsMin: 10, repsMax: 12, rest: 60,  notes: 'Arm on pad eliminates cheating. Full squeeze at top. Slow eccentric.' },
          { name: 'Overhead Cable Tricep Extension', sets: 4, repsMin: 12, repsMax: 15, rest: 60, notes: 'Long-head tricep emphasis. Full stretch overhead. Press to full extension.' },
          { name: 'EZ Bar Skull Crusher',     sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Lower to forehead. Keep elbows in. Full extension at top. Controlled.' },
          { name: 'Machine Lateral Raise',    sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Machine keeps tension consistent. Shoulder-width development. End the week here.' },
          { name: 'Reverse Pec Deck',         sets: 3, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Rear-delt health and detail. Slight forward lean. Squeeze at full extension.' },
        ],
      },
    ],
  },

  // ── 30. Men's Bodybuilding — Off-Season ──────────────────────────────────────
  {
    name: "Men's Bodybuilding",
    description: "A five-day programme for Men's Bodybuilding competitors, built around maximum muscular size and complete development across every group. This is the plan with the most sets per week in the library and suits experienced lifters with at least three years of consistent training. Day 1 builds chest and triceps; Day 2 develops back width and thickness; Day 3 builds legs with quad emphasis; Day 4 targets shoulders and arms; Day 5 finishes the week with hamstrings, glutes, and posterior-chain detail. Eat in a moderate calorie surplus throughout the muscle-building phase. Stop 1 to 2 reps before failure on compound movements. On isolation exercises, push to 1 rep from failure on the final set of each exercise.",
    tags: 'bodybuilding gender:men goal:build_muscle days:5 advanced division:mens_bodybuilding featured',
    difficulty: 2,
    workouts: [
      {
        name: 'Day 1: Chest & Triceps',
        exercises: [
          { name: 'Barbell Bench Press',         sets: 5, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Arch naturally. Bar to lower chest. Full touch. Drive through chest, not shoulders.' },
          { name: 'Incline Barbell Bench Press', sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: '30 degree incline. Upper-chest priority. Controlled descent. Do not bounce off chest.' },
          { name: 'Incline Dumbbell Press',      sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Greater range than barbell. Upper-chest stretch at the bottom. 3 s eccentric.' },
          { name: 'Pec Deck (Machine Fly)',      sets: 4, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Chest isolation pump. Full stretch at start. Squeeze hard at close. No momentum.' },
          { name: 'Close-Grip Bench Press',      sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Hands shoulder-width. Elbows tucked to ribs. Tricep compound. Full extension at top.' },
          { name: 'EZ Bar Skull Crusher',        sets: 4, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Lower to forehead slowly. Keep elbows pointing at ceiling. Press to full lockout.' },
          { name: 'Rope Pushdown',               sets: 4, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Split rope at bottom, rotate wrists out. Full extension. Elbows pinned throughout.' },
        ],
      },
      {
        name: 'Day 2: Back: Width & Thickness',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)',     sets: 5, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Lat spread priority. Full overhead stretch. Pull elbows to lower pockets. 3 s eccentric.' },
          { name: 'Barbell Row (Bent Over)',      sets: 4, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Hinge at 45 degrees. Bar to lower chest. Squeeze and hold at top. Builds thickness.' },
          { name: 'T-Bar Row',                   sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Mid-back and lat thickness. Full range. Pull handle to chest. Controlled descent.' },
          { name: 'Seated Cable Row',             sets: 4, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Full forward stretch. Drive elbows behind torso. Hold the contraction.' },
          { name: 'Lat Pulldown (Close Grip)',    sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Lower-lat detail. Full stretch overhead. Hard squeeze at bottom. 3 s eccentric.' },
          { name: 'Cable Straight-Arm Pulldown', sets: 3, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Lat finisher with constant cable tension. Arc from overhead to hips. Squeeze lats.' },
        ],
      },
      {
        name: 'Day 3: Legs: Quads, Hamstrings & Calves',
        exercises: [
          { name: 'Barbell Back Squat',          sets: 5, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Heaviest movement of the week. Depth at parallel or below. Controlled descent.' },
          { name: 'Hack Squat Machine',           sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Quad focus. Feet low on platform. Pause at bottom. Drive through the movement.' },
          { name: 'Leg Extension',                sets: 5, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Quad isolation pump. Peak squeeze at full extension. Slow eccentric on each rep.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Heavy hip hinge. Full hamstring stretch at bottom. Bar stays close to legs.' },
          { name: 'Lying Leg Curl',              sets: 4, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Full range. Hips stay on the pad. 3 s eccentric. Hamstring isolation.' },
          { name: 'Standing Calf Raise (Machine)', sets: 5, repsMin: 12, repsMax: 20, rest: 60, notes: 'Full stretch at bottom. Full contraction at top. Calves respond well to high reps.' },
          { name: 'Seated Calf Raise',           sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Soleus emphasis. Bent knee. Full range. High rep pump.' },
        ],
      },
      {
        name: 'Day 4: Shoulders & Arms',
        exercises: [
          { name: 'Barbell Overhead Press',  sets: 4, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Standing or seated. Brace core. Press straight overhead. The shoulder compound.' },
          { name: 'Dumbbell Lateral Raise',  sets: 5, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Side delt width. Lead with elbow, slightly forward. Five sets for shoulder detail.' },
          { name: 'Machine Lateral Raise',   sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Consistent tension through full range. Shoulders are built with consistent sets and detail work.' },
          { name: 'Face Pull',               sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rope at eye height, elbows high. Rear-delt health and posterior shoulder balance.' },
          { name: 'EZ Bar Curl',             sets: 4, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Primary bicep movement. Full range. No swinging. Squeeze at the top.' },
          { name: 'Incline Dumbbell Curl',   sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Long-head stretch. Arms hang back behind body. Slow controlled curl.' },
          { name: 'Hammer Curl',             sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Brachialis and forearm development. Neutral grip. Alternate arms.' },
          { name: 'Overhead Cable Tricep Extension', sets: 4, repsMin: 12, repsMax: 15, rest: 60, notes: 'Long-head tricep. Full overhead stretch. Press to full extension. Elbows in.' },
        ],
      },
      {
        name: 'Day 5: Hamstrings, Glutes & Posterior Detail',
        exercises: [
          { name: 'Romanian Deadlift (Barbell)',  sets: 5, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Second hamstring session. Full hip hinge. Feel the stretch at the bottom. Heavy and slow.' },
          { name: 'Seated Leg Curl',              sets: 5, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Full range of motion. Seated position maintains tension throughout. 3 s eccentric.' },
          { name: 'Hip Thrust (Barbell)',          sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full hip extension. Squeeze glutes hard at top. Posterior chain development.' },
          { name: 'Cable Pull-Through',            sets: 3, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Hip hinge with cable. Glute and hamstring drive. Feel the pull in the posterior chain.' },
          { name: 'Good Morning',                  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Low bar on back, hinge at hips. Hamstring and lower-back conditioning.' },
          { name: 'Reverse Pec Deck',              sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Rear-delt detail and upper-back finishing work. Squeeze at full extension.' },
          { name: 'Cable Crunch',                  sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Weighted core work. Rope behind head, crunch down against the cable. Control the negative.' },
        ],
      },
    ],
  },

];

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedRoutinesIfNeeded(userId) {
  if (!userId) return;

  try {
    const alreadySeeded = await AsyncStorage.getItem(SEED_KEY);

    // Self-healing check: if the marker is set but the database actually has
    // no library plans (e.g. a prior seed crashed mid-way, or the DB was
    // wiped via Clear data), clear the marker and proceed with a fresh seed.
    // If the marker is set AND plans exist, we're done — skip seeding.
    if (alreadySeeded) {
      const existingLibrary = await getLibraryPlans().catch(() => []);
      if (existingLibrary.length > 0) {
        return; // healthy state, nothing to do
      }
      // Marker set but DB empty — clear marker so the seed below actually runs.
      await AsyncStorage.removeItem(SEED_KEY).catch(() => {});
      console.warn(`[Seed] Marker was set but no library plans found. Re-seeding.`);
    }

    const existing = await getAllExercises();
    const byName = {};
    for (const ex of existing) {
      byName[ex.name] = ex;
    }

    // Ensure required exercises exist
    for (const exData of REQUIRED_EXERCISES) {
      if (!byName[exData.name]) {
        const created = await insertExercise(exData);
        byName[created.name] = created;
      }
    }

    // Create all library plans
    for (const plan of LIBRARY_PLANS) {
      const programme = await createProgramme(
        userId,
        plan.name,
        plan.description,
        1,                         // is_library = 1
        plan.tags || null,
        plan.splitType || null,
        plan.difficulty ?? null,
      );

      for (const workoutDef of plan.workouts) {
        const routine = await createRoutine(
          userId,
          workoutDef.name,
          workoutDef.description || null,
          null,
          1,              // isLibrary
          null,
          programme.id,
          true,           // isSample
        );

        for (let i = 0; i < workoutDef.exercises.length; i++) {
          const def = workoutDef.exercises[i];
          const exercise = byName[def.name];
          if (!exercise) {
            console.warn(`seedRoutines: exercise not found: ${def.name}`);
            continue;
          }
          await addExerciseToRoutine(
            routine.id,
            exercise.id,
            i,
            def.repsMin,
            def.repsMax,
            def.notes || null,
            def.sets,
            null,
            def.rest,
          );
        }
      }
    }

    await AsyncStorage.setItem(SEED_KEY, '1');
    console.log(`[Seed] Created ${LIBRARY_PLANS.length} library plans`);
  } catch (err) {
    console.warn('seedRoutinesIfNeeded failed:', err);
  }
}
