import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllExercises, insertExercise, createRoutine, addExerciseToRoutine,
  createProgramme,
} from './database';

// Bump to v6: stores tags, splitType, difficulty in DB so filter chips work
const SEED_KEY = '@volyume_routines_seeded_v7';

// Extra exercises the plan templates rely on that may not be in the base exercise seed
const REQUIRED_EXERCISES = [
  { name: 'HS Plate-Loaded Lat Pulldown',     primaryMuscle: 'back',      equipment: 'machine',  movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 8,  defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Underhand Lat Pulldown',            primaryMuscle: 'back',      equipment: 'cable',    movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Plate-Loaded Seated Row',           primaryMuscle: 'back',      equipment: 'machine',  movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'HS ISO High Row',                   primaryMuscle: 'back',      equipment: 'machine',  movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Cable Serratus Punch',              primaryMuscle: 'abs',       equipment: 'cable',    movementPattern: 'push',      compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 25, fatigueCost: 1, stimulusToFatigueRatio: 5 },
  { name: 'Cable Lateral Raise — Low Pulley',  primaryMuscle: 'side_delts',  equipment: 'cable',    movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Facing-In Shoulder Press',          primaryMuscle: 'front_delts', equipment: 'machine',  movementPattern: 'push',      compoundIsolation: 'compound',  defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Cable Fly — Low to Mid (Incline)',  primaryMuscle: 'chest',       equipment: 'cable',    movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Cable Fly — Mid Height (Cuff)',     primaryMuscle: 'chest',       equipment: 'cable',    movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Band Pull-Apart',                   primaryMuscle: 'rear_delts',  equipment: 'band',     movementPattern: 'pull',      compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 25, fatigueCost: 1, stimulusToFatigueRatio: 4 },
  { name: 'Box Step-Up',                       primaryMuscle: 'quads',     equipment: 'bodyweight', movementPattern: 'squat',   compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Single-Arm Dumbbell Row',           primaryMuscle: 'back',      equipment: 'dumbbell', movementPattern: 'pull',      compoundIsolation: 'compound',  defaultRepMin: 10, defaultRepMax: 15, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Trap Bar Deadlift (Low Handle)',    primaryMuscle: 'quads',     equipment: 'barbell',  movementPattern: 'hinge',     compoundIsolation: 'compound',  defaultRepMin: 4,  defaultRepMax: 8,  fatigueCost: 5, stimulusToFatigueRatio: 4 },
];

// ─── 18 Library Plans ────────────────────────────────────────────────────────

const LIBRARY_PLANS = [

  // ── 1. Aesthetic Upper Rotation ──────────────────────────────────────────
  {
    name: 'Aesthetic Upper Rotation',
    description: 'Two-day upper-body rotation built around physique priorities: lat width, capped side delts, upper-chest fullness, and rear-delt health. Day 1 targets the back and posterior shoulder; Day 2 develops upper chest and lateral delt detail. Progress using double progression — add a rep each session until you reach the top of the range, then add the smallest available weight increment. Target RIR 1–2 on all working sets. Pair with any lower-body plan for a complete programme.',
    tags: 'aesthetic upper bodybuilding',
    difficulty: 1,
    workouts: [
      {
        name: 'Day 1 — Width, Rear Delts & Back Detail',
        exercises: [
          { name: 'Face Pull',                         sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rope at chest height, elbows high. Light weight only. Rear delt warm-up.' },
          { name: 'HS Plate-Loaded Lat Pulldown',      sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Full overhead stretch. Pull elbows to pockets. 3 s eccentric.' },
          { name: 'Underhand Lat Pulldown',            sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Lower-lat emphasis. Squeeze hard at bottom. 3 s eccentric.' },
          { name: 'Plate-Loaded Seated Row',           sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Full stretch forward. Pull elbows back. Squeeze rhomboids.' },
          { name: 'Cable Straight-Arm Pulldown',       sets: 3, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Lat length and lower-lat control. Slow arc, slight elbow bend.' },
        ],
      },
      {
        name: 'Day 2 — Upper Chest, Lateral Delts & Shoulder Refinement',
        exercises: [
          { name: 'Cable Lateral Raise — Low Pulley',  sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Arm slightly forward. Lead with elbow. Raise to shoulder height.' },
          { name: 'Facing-In Shoulder Press',          sets: 4, repsMin: 12, repsMax: 15, rest: 90,  notes: 'Scapular-plane pressing. Hits upper chest and anterior delt.' },
          { name: 'Cable Fly — Low to Mid (Incline)',  sets: 4, repsMin: 12, repsMax: 15, rest: 90,  notes: 'Cables low, bench 30–45 degrees. 3 s eccentric. Upper-chest focus.' },
          { name: 'Cable Fly — Mid Height (Cuff)',     sets: 3, repsMin: 12, repsMax: 15, rest: 90,  notes: 'Upper-chest isolation. Cuffed for greater range. 3 s eccentric.' },
          { name: 'Face Pull',                         sets: 4, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rope at chest height. Light weight. Rear-delt health maintenance.' },
        ],
      },
    ],
  },

  // ── 2. Beginner Full Body 3×/week ────────────────────────────────────────
  {
    name: 'Beginner Full Body 3×/Week',
    description: 'Three full-body sessions per week using linear progression — the fastest approach for a beginner nervous system adapting to new loads. The five fundamental movement patterns are trained every session: squat, hinge, horizontal press, horizontal pull, and vertical pull. Add weight each session (2.5 kg on compound barbell lifts) and focus on technique above all else. Expect consistent weekly strength increases for the first 6–12 months. Target RIR 2–3 on all sets.',
    tags: 'beginner full body barbell',
    difficulty: 0,
    workouts: [
      {
        name: 'Full Body A',
        exercises: [
          { name: 'Barbell Back Squat',     sets: 3, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Feet shoulder-width. Hit full depth. Drive through heels.' },
          { name: 'Barbell Bench Press',    sets: 3, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Arch naturally. Bar to chest. Push straight up.' },
          { name: 'Barbell Row (Bent Over)', sets: 3, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Hinge 45 degrees. Pull bar to lower chest. Squeeze back.' },
          { name: 'Barbell Overhead Press', sets: 2, repsMin: 5,  repsMax: 8,  rest: 90,  notes: 'Stand tall. Press straight overhead. Core braced.' },
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
          { name: 'Romanian Deadlift (Barbell)', sets: 2, repsMin: 8, repsMax: 12, rest: 90, notes: 'Hip hinge. Controlled descent.' },
        ],
      },
    ],
  },

  // ── 3. Beginner Push / Pull / Legs ────────────────────────────────────────
  {
    name: 'Beginner Push / Pull / Legs',
    description: 'A clean three-day split that keeps sessions focused and manageable. Push day builds chest, shoulders, and triceps; Pull day develops back and biceps; Leg day handles quads, hamstrings, glutes, and calves. Each muscle is trained once per week with enough volume to produce a clear training signal. Use linear progression — increase the load by 2.5 kg on compounds and 1.25 kg on isolations when all reps are completed with good technique. Ideal for the first 3–6 months. Target RIR 2–3.',
    tags: 'beginner ppl push pull legs',
    difficulty: 0,
    workouts: [
      {
        name: 'Push — Chest & Shoulders',
        exercises: [
          { name: 'Barbell Bench Press',      sets: 4, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Primary chest movement. Focus on the stretch at the bottom.' },
          { name: 'Incline Dumbbell Press',   sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Upper chest. Control the descent.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Seated or standing. Full range.' },
          { name: 'Dumbbell Lateral Raise',   sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Shoulder width only. Slight forward lean.' },
          { name: 'Rope Pushdown',            sets: 3, repsMin: 12, repsMax: 15, rest: 60,  notes: 'Elbows pinned to sides. Full extension at bottom.' },
        ],
      },
      {
        name: 'Pull — Back & Biceps',
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
    description: 'The most evidence-supported split for intermediate hypertrophy: each muscle group trained twice per week, separated by 48–72 hours for optimal recovery and re-stimulation. Upper A focuses on heavier compound work (5–8 reps); Upper B shifts to higher-volume hypertrophy ranges (10–15 reps) targeting the same muscles from different angles. Use double progression throughout — reach the top of the rep range, then add weight. Suits lifters with 6+ months of consistent training. Target RIR 1–2 on working sets.',
    tags: 'upper_lower intermediate 4 days',
    difficulty: 1,
    workouts: [
      {
        name: 'Upper A — Horizontal Push & Pull',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Strength focus. Add weight when top reps feel easy.' },
          { name: 'Barbell Row (Bent Over)',   sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Pause at chest. Controlled descent.' },
          { name: 'Incline Dumbbell Press',    sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Hypertrophy range. Slow negative.' },
          { name: 'Seated Cable Row',          sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full stretch to full contraction.' },
          { name: 'EZ Bar Skull Crusher',      sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Elbows pointed up. Slow on way down.' },
          { name: 'EZ Bar Curl',               sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Full supination at top.' },
        ],
      },
      {
        name: 'Lower A — Quad Focus',
        exercises: [
          { name: 'Barbell Back Squat',         sets: 4, repsMin: 5,  repsMax: 8,  rest: 150, notes: 'Strength focus. Brace hard, break parallel.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 10, repsMax: 12, rest: 90,  notes: 'Hamstring stretch. Keep bar touching legs.' },
          { name: 'Leg Press',                  sets: 3, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Full range. Don\'t lock out at top.' },
          { name: 'Leg Extension',              sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Squeeze quad at top.' },
          { name: 'Seated Calf Raise',          sets: 4, repsMin: 15, repsMax: 20, rest: 60,  notes: 'Full range, hold stretch at bottom.' },
        ],
      },
      {
        name: 'Upper B — Vertical Push & Pull',
        exercises: [
          { name: 'Barbell Overhead Press',    sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Standing preferred. Full lockout overhead.' },
          { name: 'Lat Pulldown (Wide Grip)',  sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Slight lean back. Drive elbows down.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Hypertrophy range. Touch ears at bottom.' },
          { name: 'Machine Row (Chest Supported)', sets: 3, repsMin: 12, repsMax: 15, rest: 90, notes: 'Strict, no body english.' },
          { name: 'Dumbbell Lateral Raise',   sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Slight internal rotation, lead with elbow.' },
          { name: 'Dumbbell Rear Delt Fly',   sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Slight elbow bend. Raise to shoulder height.' },
        ],
      },
      {
        name: 'Lower B — Posterior Chain Focus',
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
    description: 'Each muscle group trained once per week with focused, high-quality volume. Push day attacks chest, shoulders, and triceps; Pull day builds the back and biceps; Leg day develops the full lower body. The lower frequency compared to upper/lower makes this ideal as a first split after outgrowing full-body training, or during phases of lower recovery capacity. Use double progression. Target RIR 1–2 on all working sets.',
    tags: 'ppl push pull legs intermediate 3 days',
    difficulty: 1,
    workouts: [
      {
        name: 'Push — Chest, Shoulders & Triceps',
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
        name: 'Pull — Back & Biceps',
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
    description: 'High-frequency PPL for lifters who can handle — and recover from — six sessions per week. Each muscle is trained twice per week, producing a greater hypertrophy stimulus than the 3-day version. The two weekly cycles allow a different emphasis each rotation: heavier compound work first, higher-rep isolation emphasis second. Requires consistent sleep, nutrition, and stress management to recover fully. Target RIR 1–2. Recommended for lifters with 18+ months of consistent training.',
    tags: 'ppl push pull legs advanced 6 days high frequency',
    difficulty: 2,
    workouts: [
      {
        name: 'Push Day 1 — Strength Focus',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 5, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Heavy working sets. Progressive overload focus.' },
          { name: 'Incline Barbell Bench Press', sets: 4, repsMin: 6,  repsMax: 8,  rest: 120, notes: 'Second compound. Heavy.' },
          { name: 'Barbell Overhead Press',    sets: 3, repsMin: 6,  repsMax: 8,  rest: 90,  notes: 'Strict press. No leg drive.' },
          { name: 'Dumbbell Lateral Raise',   sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Controlled. Keep at shoulder height.' },
          { name: 'Close-Grip Bench Press',   sets: 3, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Tricep volume work.' },
        ],
      },
      {
        name: 'Pull Day 1 — Strength Focus',
        exercises: [
          { name: 'Conventional Deadlift',    sets: 4, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Full-body pull. Brace tight.' },
          { name: 'Barbell Row (Bent Over)',  sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Strict 45°. Pull to lower ribs.' },
          { name: 'Weighted Pull-Up',         sets: 3, repsMin: 5,  repsMax: 8,  rest: 90,  notes: 'Add belt weight for progression.' },
          { name: 'EZ Bar Curl',              sets: 4, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Strict curls. Full supination.' },
          { name: 'Preacher Curl (EZ Bar)',   sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Peak contraction, slow negative.' },
        ],
      },
      {
        name: 'Legs Day 1 — Quad Focus',
        exercises: [
          { name: 'Barbell Back Squat',         sets: 5, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Heavy squats. Break parallel.' },
          { name: 'Hack Squat Machine',         sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Quad isolation machine.' },
          { name: 'Leg Extension',              sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'High rep pump. No lockout.' },
          { name: 'Lying Leg Curl',             sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Hamstring curl.' },
          { name: 'Standing Calf Raise (Machine)', sets: 5, repsMin: 10, repsMax: 20, rest: 60, notes: 'Heavy calf work. Full range.' },
        ],
      },
      {
        name: 'Push Day 2 — Volume Focus',
        exercises: [
          { name: 'Incline Dumbbell Press',    sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Hypertrophy range. Controlled negative.' },
          { name: 'Pec Deck (Machine Fly)',    sets: 4, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Full stretch. Mind-muscle. Pump work.' },
          { name: 'Dumbbell Shoulder Press',  sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Seated. Full range of motion.' },
          { name: 'Cable Lateral Raise',      sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Constant tension cable version.' },
          { name: 'Overhead Cable Tricep Extension', sets: 4, repsMin: 12, repsMax: 20, rest: 60, notes: 'Long head stretch.' },
        ],
      },
      {
        name: 'Pull Day 2 — Volume Focus',
        exercises: [
          { name: 'Lat Pulldown (Wide Grip)',  sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Width focus. Drive elbows down.' },
          { name: 'Seated Cable Row',          sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Full stretch. Elbows back.' },
          { name: 'Machine Row (Chest Supported)', sets: 4, repsMin: 12, repsMax: 15, rest: 90, notes: 'No lower-back stress.' },
          { name: 'Face Pull',                 sets: 3, repsMin: 20, repsMax: 25, rest: 60,  notes: 'Rear delt health. Light weight.' },
          { name: 'Incline Dumbbell Curl',     sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Full stretch at bottom of curl.' },
        ],
      },
      {
        name: 'Legs Day 2 — Posterior Chain Focus',
        exercises: [
          { name: 'Romanian Deadlift (Barbell)', sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Hamstring loading. Keep bar close.' },
          { name: 'Leg Press',                   sets: 4, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Higher foot placement.' },
          { name: 'Seated Leg Curl',             sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Stretched position for hamstring stimulus.' },
          { name: 'Barbell Hip Thrust',          sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Glute-focused. Full hip extension.' },
          { name: 'Seated Calf Raise',           sets: 5, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Soleus focus. Slow and controlled.' },
        ],
      },
    ],
  },

  // ── 7. 4-Day Bodybuilding Bro Split ──────────────────────────────────────
  {
    name: '4-Day Hypertrophy Bro Split',
    description: 'The classic bodybuilder split: each major muscle group gets a dedicated session, allowing maximum per-session volume before fatigue compromises quality. Chest and triceps on Day 1, back and biceps on Day 2, shoulders and traps on Day 3, legs on Day 4. Each muscle is trained once per week at high volume. Suits intermediate-to-advanced lifters who recover well from high intra-session fatigue and prefer focused, high-effort sessions. Use double progression. Target RIR 1 on the final working set of each exercise.',
    tags: 'bodybuilding bro split 4 days',
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
    description: '45-minute full-body sessions, three days per week, using only the highest-value compound movements. No isolation work — every exercise trains multiple muscles simultaneously to maximise efficiency. Ideal for time-pressed lifters who want to maintain or build muscle with minimal gym time. Because each session covers the full body, skipping one session does not leave any muscle group undertrained that week. Use double progression. Target RIR 2 on all working sets.',
    tags: 'full_body short 3 days express beginner intermediate',
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
          { name: 'Leg Press',               sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Quad volume.' },
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
          { name: 'Dumbbell Shoulder Press', sets: 2, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Overhead push volume.' },
        ],
      },
    ],
  },

  // ── 9. Upper / Lower Express (4 × 40 min) ────────────────────────────────
  {
    name: 'Upper / Lower Express 4×/Week',
    description: 'Four 40-minute sessions per week using a tight exercise selection and brisk rest periods. Built on the proven upper/lower split structure but with each session trimmed to its highest-value exercises. Suitable for intermediate lifters managing a busy schedule who want twice-per-week frequency without long sessions. Double progression on all compound movements. Optional supersets (pairing non-competing exercises) can shave a further 10 minutes off each session. Target RIR 1–2.',
    tags: 'upper_lower short 4 days express',
    difficulty: 1,
    workouts: [
      {
        name: 'Upper A',
        exercises: [
          { name: 'Barbell Bench Press',      sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Primary push.' },
          { name: 'Seated Cable Row',         sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Primary pull — superset with bench optional.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Shoulder builder.' },
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
          { name: 'Rope Pushdown',            sets: 2, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Tricep finisher.' },
        ],
      },
      {
        name: 'Lower B',
        exercises: [
          { name: 'Leg Press',               sets: 3, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Quad volume.' },
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
    description: 'A specialisation phase for lifters who have identified chest and shoulder development as a clear weak point. Volume for these muscles is elevated to the upper end of the weekly effective range; all other muscle groups are maintained with sufficient but lower volume. Run for 6–8 weeks as a focused block, then return to a balanced programme. Double progression on all chest and shoulder work. Expect visible improvement in shoulder roundness and upper-chest fullness within 8–10 weeks. Target RIR 1–2.',
    tags: 'weak_point bodybuilding chest shoulders aesthetic',
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
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Hypertrophy range.' },
          { name: 'Dumbbell Lateral Raise',  sets: 5, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Side delt focus. 5 working sets.' },
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
    description: 'A back specialisation block for lifters who prioritise lat width and mid-back density — the two components of a strong V-taper. Width comes from vertical pulling (lat pulldown variations, straight-arm pulldowns); thickness from horizontal rowing. Both are trained at high volume and twice per week. Other muscle groups are maintained at effective volumes. Run for 6–8 weeks within a broader training year. Double progression. Target RIR 1–2 on all back work.',
    tags: 'weak_point back bodybuilding aesthetic v-taper',
    difficulty: 1,
    workouts: [
      {
        name: 'Width Day — Vertical Pull Focus',
        exercises: [
          { name: 'Weighted Pull-Up',          sets: 4, repsMin: 5,  repsMax: 8,  rest: 90,  notes: 'Add belt weight. Full hang at bottom.' },
          { name: 'Lat Pulldown (Wide Grip)',  sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Drive elbows down. Full stretch.' },
          { name: 'Lat Pulldown (Close Grip)', sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Lower-lat emphasis. Pull to chest.' },
          { name: 'Cable Straight-Arm Pulldown', sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Pure lat isolation. Slow arc.' },
          { name: 'Cable Lat Pullover',        sets: 3, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Lat stretch and contraction.' },
        ],
      },
      {
        name: 'Thickness Day — Horizontal Row Focus',
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
    description: 'For lifters with underdeveloped legs relative to their upper body. Quad and hamstring volume is elevated to the high end of the weekly effective range; upper body is maintained at a lower frequency. Three leg sessions per week (two quad-dominant, one hip-dominant) provide a strong training stimulus across the full lower body. Run for 8–12 weeks, then reassess proportions. Double progression. Target RIR 1–2 on leg compounds, RIR 2 on isolation work.',
    tags: 'weak_point legs quads hamstrings bodybuilding',
    difficulty: 1,
    workouts: [
      {
        name: 'Quad-Dominant Day',
        exercises: [
          { name: 'Barbell Back Squat',   sets: 5, repsMin: 5,  repsMax: 8,  rest: 150, notes: 'Strength squats. 5×5 approach.' },
          { name: 'Hack Squat Machine',   sets: 4, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Quad machine focus.' },
          { name: 'Leg Press',            sets: 4, repsMin: 15, repsMax: 20, rest: 90,  notes: 'Volume accumulation.' },
          { name: 'Leg Extension',        sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Quad isolation pump.' },
          { name: 'Seated Calf Raise',    sets: 4, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Soleus — slow and controlled.' },
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
          { name: 'Barbell Overhead Press',   sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Shoulder maintenance.' },
          { name: 'EZ Bar Curl',              sets: 2, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Arm maintenance.' },
        ],
      },
    ],
  },

  // ── 13. Glute & Hamstring Focus ───────────────────────────────────────────
  {
    name: 'Glute & Hamstring Focus',
    description: 'Hip-dominant training with an emphasis on the posterior chain — glutes, hamstrings, and spinal erectors. Ideal for athletes wanting stronger hip extension, or physique athletes prioritising glute development. Sessions are built around hip hinges, hip thrusts, and leg curl variations, with upper-body maintenance work included. Run as a 6–8 week specialisation phase. Double progression on all major movements. Target RIR 1–2 on working sets.',
    tags: 'weak_point glutes hamstrings legs bodybuilding',
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
    description: 'Maximising the V-taper silhouette: wide upper back, capped side delts, and a visually narrow waist. Lat-width work and side-delt volume are both elevated; direct waist-expanding exercises are excluded. Sessions are structured so the muscles that create visual width are trained first, when freshest, with maximum quality. Run as a 6–8 week specialisation phase. Double progression. Target RIR 1–2 on all working sets.',
    tags: 'aesthetic v-taper bodybuilding back shoulders weak_point',
    difficulty: 1,
    workouts: [
      {
        name: 'Lats & Side Delts',
        exercises: [
          { name: 'Weighted Pull-Up',         sets: 4, repsMin: 5,  repsMax: 8,  rest: 90,  notes: 'Widest pull. Full hang, pull chest to bar.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Drive elbows straight down.' },
          { name: 'Cable Straight-Arm Pulldown', sets: 3, repsMin: 12, repsMax: 20, rest: 60, notes: 'Pure lat sweep isolation.' },
          { name: 'Dumbbell Lateral Raise',  sets: 5, repsMin: 15, repsMax: 25, rest: 60,  notes: '5 working sets. Wide illusion.' },
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
    description: 'Two full-body sessions per week, covering every major muscle group in around 60 minutes each. Suitable for maintenance phases, very busy schedules, or as a bridge between structured blocks. Volume is at the lower end of the effective range — enough to preserve muscle and strength, not enough for significant growth. Prioritises the highest-value compound movements. Double progression; progress will be slower than with higher-frequency plans. Target RIR 2 on all working sets.',
    tags: 'short 2 days full_body beginner intermediate minimalist',
    difficulty: 1,
    workouts: [
      {
        name: 'Session 1 — Push & Hinge',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 3, repsMin: 6,  repsMax: 10, rest: 120, notes: 'Main push. No warmup skip.' },
          { name: 'Barbell Overhead Press',   sets: 3, repsMin: 6,  repsMax: 10, rest: 90,  notes: 'Shoulder compound.' },
          { name: 'Conventional Deadlift',    sets: 3, repsMin: 4,  repsMax: 6,  rest: 150, notes: 'Full posterior chain in one movement.' },
          { name: 'Rope Pushdown',            sets: 2, repsMin: 12, repsMax: 20, rest: 60,  notes: 'Tricep isolation finisher.' },
        ],
      },
      {
        name: 'Session 2 — Pull & Squat',
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
    name: '3-Day Power Hypertrophy',
    description: 'Combines heavy strength work (3–5 reps, close to maximal effort) with hypertrophy assistance (8–15 reps) in the same session. The heavy work builds neural efficiency and maximal strength; the assistance work produces the volume needed for sustained muscle growth. This approach develops both qualities simultaneously rather than optimising for just one. Suitable for intermediate-to-advanced lifters who want to be both strong and muscular. Target RIR 2–3 on heavy sets, RIR 1–2 on all assistance work.',
    tags: 'bodybuilding 3 days intermediate advanced strength',
    difficulty: 2,
    workouts: [
      {
        name: 'Day A — Squat + Push',
        exercises: [
          { name: 'Barbell Back Squat',       sets: 5, repsMin: 3,  repsMax: 5,  rest: 180, notes: 'Work to a heavy top set then 4 back-off sets.' },
          { name: 'Barbell Bench Press',      sets: 5, repsMin: 3,  repsMax: 5,  rest: 180, notes: 'Heavy pressing. Strong arch.' },
          { name: 'Leg Press',               sets: 3, repsMin: 12, repsMax: 20, rest: 90,  notes: 'Hypertrophy back-off after squats.' },
          { name: 'Incline Dumbbell Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Chest hypertrophy after bench.' },
          { name: 'Dumbbell Lateral Raise',  sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Side delts. Assistance work.' },
        ],
      },
      {
        name: 'Day B — Deadlift + Pull',
        exercises: [
          { name: 'Conventional Deadlift',    sets: 5, repsMin: 3,  repsMax: 5,  rest: 180, notes: 'Work up to a heavy top set. Brace everything.' },
          { name: 'Weighted Pull-Up',         sets: 4, repsMin: 5,  repsMax: 8,  rest: 120, notes: 'Weighted vertical pull.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 8, repsMax: 12, rest: 90, notes: 'Hamstring hypertrophy back-off.' },
          { name: 'Seated Cable Row',         sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Back hypertrophy.' },
          { name: 'EZ Bar Curl',              sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Bicep assistance.' },
        ],
      },
      {
        name: 'Day C — Press + Arms',
        exercises: [
          { name: 'Barbell Overhead Press',   sets: 5, repsMin: 3,  repsMax: 5,  rest: 150, notes: 'Heavy overhead work.' },
          { name: 'Incline Barbell Bench Press', sets: 4, repsMin: 6, repsMax: 8, rest: 120, notes: 'Upper chest secondary.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Shoulder hypertrophy.' },
          { name: 'EZ Bar Skull Crusher',     sets: 3, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Tricep hypertrophy.' },
          { name: 'Preacher Curl (EZ Bar)',   sets: 3, repsMin: 8,  repsMax: 12, rest: 60,  notes: 'Bicep peak.' },
        ],
      },
    ],
  },

  // ── 17. Arms & Upper Body Aesthetic ──────────────────────────────────────
  {
    name: 'Arms & Upper Body Aesthetic',
    description: 'Built for lifters who want to prioritise arm development alongside overall upper-body aesthetics. Bicep and tricep volume is elevated well beyond what a balanced programme provides; chest, shoulders, and back are maintained at effective volumes. Three upper sessions per week, each with a different structural emphasis. Run for 6–8 weeks within a mesocycle. Double progression on all exercises. Target RIR 1–2 on final working sets.',
    tags: 'aesthetic bodybuilding arms weak_point upper',
    difficulty: 1,
    workouts: [
      {
        name: 'Chest & Triceps',
        exercises: [
          { name: 'Barbell Bench Press',       sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  notes: 'Hypertrophy focus.' },
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
          { name: 'Incline Dumbbell Curl',     sets: 4, repsMin: 10, repsMax: 15, rest: 60,  notes: 'Full stretch at bottom. Best bicep stimulus.' },
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
          { name: 'Cable Crunch',            sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Abs — keep waist tight.' },
          { name: 'Hanging Leg Raise',       sets: 3, repsMin: 10, repsMax: 20, rest: 60,  notes: 'Lower abs.' },
        ],
      },
    ],
  },

  // ── 18. Female Bodybuilding Foundation ───────────────────────────────────
  {
    name: 'Female Bodybuilding Foundation',
    description: 'A physique-focused programme structured around the muscle groups most impactful for female bodybuilding and fitness: glutes, hamstrings, upper-body detail, and shoulder width. Three lower-body sessions per week provide the volume and frequency needed for visible glute and posterior-chain development; two upper sessions balance the physique. Double progression throughout. Target RIR 1–2 on all working sets. Suitable for intermediate female lifters with 6+ months of consistent resistance training.',
    tags: 'bodybuilding full_body glutes hamstrings upper intermediate',
    difficulty: 1,
    workouts: [
      {
        name: 'Lower — Glute Focused',
        exercises: [
          { name: 'Barbell Hip Thrust',         sets: 4, repsMin: 8,  repsMax: 15, rest: 90,  notes: 'Primary glute driver. Go heavy over time.' },
          { name: 'Romanian Deadlift (Barbell)', sets: 3, repsMin: 8,  repsMax: 12, rest: 90, notes: 'Glutes and hamstrings loaded.' },
          { name: 'Bulgarian Split Squat',       sets: 3, repsMin: 10, repsMax: 15, rest: 90, notes: 'Unilateral glute work.' },
          { name: 'Cable Kickback',              sets: 3, repsMin: 15, repsMax: 25, rest: 60, notes: 'Hip extension isolation.' },
          { name: 'Seated Calf Raise',           sets: 3, repsMin: 15, repsMax: 25, rest: 60, notes: 'Calf finisher.' },
        ],
      },
      {
        name: 'Upper — Push & Pull',
        exercises: [
          { name: 'Incline Dumbbell Press',   sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Upper chest push.' },
          { name: 'Lat Pulldown (Wide Grip)', sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Back width.' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Shoulder compound.' },
          { name: 'Seated Cable Row',         sets: 3, repsMin: 10, repsMax: 15, rest: 90,  notes: 'Mid-back.' },
          { name: 'Dumbbell Lateral Raise',  sets: 3, repsMin: 15, repsMax: 25, rest: 60,  notes: 'Shoulder width.' },
        ],
      },
      {
        name: 'Lower — Quad & Hamstring',
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

];

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedRoutinesIfNeeded(userId) {
  if (!userId) return;

  try {
    const alreadySeeded = await AsyncStorage.getItem(SEED_KEY);
    if (alreadySeeded) return;

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
          1,              // is_active
          null,
          programme.id,
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
