import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllExercises, insertExercise, createRoutine, addExerciseToRoutine } from './database';

const SEED_KEY = '@volyume_routines_seeded_v1';

// Exercises required by the sample routines that may not exist in the main seed library.
// Each entry uses insertExercise's data shape.
const REQUIRED_EXERCISES = [
  { name: 'HS Plate-Loaded Lat Pulldown',        primaryMuscle: 'back',      equipment: 'machine',    movementPattern: 'pull', compoundIsolation: 'compound', defaultRepMin: 8,  defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Underhand Lat Pulldown',               primaryMuscle: 'back',      equipment: 'cable',      movementPattern: 'pull', compoundIsolation: 'compound', defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Plate-Loaded Seated Row',              primaryMuscle: 'back',      equipment: 'machine',    movementPattern: 'pull', compoundIsolation: 'compound', defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'HS ISO High Row',                      primaryMuscle: 'back',      equipment: 'machine',    movementPattern: 'pull', compoundIsolation: 'compound', defaultRepMin: 10, defaultRepMax: 12, fatigueCost: 3, stimulusToFatigueRatio: 4 },
  { name: 'Cable Serratus Punch',                 primaryMuscle: 'abs',       equipment: 'cable',      movementPattern: 'push', compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 25, fatigueCost: 1, stimulusToFatigueRatio: 5 },
  { name: 'Cable Lateral Raise — Low Pulley (Cuff)',  primaryMuscle: 'shoulders', equipment: 'cable', movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Cable Lateral Raise — Mid Pulley (Cuff)',  primaryMuscle: 'shoulders', equipment: 'cable', movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Cable Lateral Raise — High Pulley (Cuff)', primaryMuscle: 'shoulders', equipment: 'cable', movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 15, defaultRepMax: 20, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Facing-In Shoulder Press',            primaryMuscle: 'shoulders', equipment: 'machine',    movementPattern: 'push', compoundIsolation: 'compound', defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 4 },
  { name: 'Cable Fly — Low to Mid (Incline)',    primaryMuscle: 'chest',     equipment: 'cable',      movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 5 },
  { name: 'Cable Fly — Mid Height (Cuff)',       primaryMuscle: 'chest',     equipment: 'cable',      movementPattern: 'isolation', compoundIsolation: 'isolation', defaultRepMin: 12, defaultRepMax: 15, fatigueCost: 2, stimulusToFatigueRatio: 5 },
];

const SAMPLE_ROUTINES = [
  {
    name: '[SAMPLE] Day 1 — Width, Rear Delts and Back Detail',
    description: 'Lat width, lower-lat control, mid-back detail, serratus, and shoulder-safe rear-delt work. Shoulder modification active — face pulls replace rear delt flies. Light weight, high reps, controlled tempo throughout.',
    exercises: [
      {
        name: 'Face Pull',
        sets: 4, repsMin: 20, repsMax: 25,
        notes: 'Rope at chest height, elbows high and wide. Light weight only. Stop well short of pain. Pull only to comfortable range. Squeeze rear delt at contraction. Target: 4 × 20–25 · RIR 2.',
      },
      {
        name: 'HS Plate-Loaded Lat Pulldown',
        sets: 4, repsMin: 8, repsMax: 12,
        notes: 'Primary lat-width movement. Full overhead stretch. Pull elbows to pockets. 3s eccentric. Target: 4 × 8–12 · RIR 2.',
      },
      {
        name: 'Underhand Lat Pulldown',
        sets: 3, repsMin: 10, repsMax: 12,
        notes: 'Lower-lat emphasis. Full stretch at top. Squeeze lower lat hard at bottom. 3s eccentric. Target: 3 × 10–12 · RIR 2.',
      },
      {
        name: 'Plate-Loaded Seated Row',
        sets: 3, repsMin: 10, repsMax: 12,
        notes: 'Mid-back thickness. Full stretch forward. Pull elbows back. Squeeze rhomboids. Controlled tempo. Target: 3 × 12, 12, 10 · RIR 2.',
      },
      {
        name: 'HS ISO High Row',
        sets: 3, repsMin: 10, repsMax: 12,
        notes: 'Upper lat and mid-back finishing movement. Controlled tempo throughout. Target: 3 × 12, 10, 10 · RIR 2.',
      },
      {
        name: 'Cable Straight-Arm Pulldown',
        sets: 3, repsMin: 12, repsMax: 15,
        notes: 'Lat length and lower-lat control. Slight elbow bend throughout. Slow arc. Target: 2–3 × 12–15 · RIR 2.',
      },
      {
        name: 'Cable Serratus Punch',
        sets: 3, repsMin: 15, repsMax: 25,
        notes: 'Single arm. Reach forward and fully protract scapula. Feel serratus along ribcage. Deliberate tempo. Target: 2–3 × 15–25 · RIR 2.',
      },
      {
        name: 'Machine Lateral Raise',
        sets: 2, repsMin: 15, repsMax: 20,
        notes: 'Optional pump only. Skip if shoulder is irritated. Light weight. Target: pump sets only · RIR 3+.',
      },
    ],
  },
  {
    name: '[SAMPLE] Day 2 — Upper Chest, Lateral Delts and Shoulder Refinement',
    description: 'Three-angle cuffed lateral work, shoulder-safe pressing, upper-chest cable work, and light rear-delt work. Shoulder modification active — all movements cuffed, controlled, lighter weight.',
    exercises: [
      {
        name: 'Cable Lateral Raise — Low Pulley (Cuff)',
        sets: 4, repsMin: 15, repsMax: 20,
        notes: 'Arm slightly forward. Lead with elbow. Raise to shoulder height. Constant tension. Controlled tempo. Target: 4 × 15–20 · RIR 2.',
      },
      {
        name: 'Cable Lateral Raise — Mid Pulley (Cuff)',
        sets: 3, repsMin: 15, repsMax: 20,
        notes: 'Different angle to low pulley. Still cuffed. Slightly different fibre recruitment. Controlled. Target: 3 × 15–20 · RIR 2.',
      },
      {
        name: 'Cable Lateral Raise — High Pulley (Cuff)',
        sets: 3, repsMin: 15, repsMax: 20,
        notes: 'Third angle — pull across and down. Completes full lateral-delt coverage. Controlled. Target: 3 × 15–20 · RIR 2.',
      },
      {
        name: 'Facing-In Shoulder Press',
        sets: 4, repsMin: 12, repsMax: 15,
        notes: 'Face into pad. Scapular-plane pressing. Hits upper chest and anterior delt. Pain-free execution only. Controlled. Target: 4 × 12–15 · RIR 2.',
      },
      {
        name: 'Cable Fly — Low to Mid (Incline)',
        sets: 4, repsMin: 12, repsMax: 15,
        notes: 'Bench 30–45 degrees, cables low. Fly upward and inward. 3s eccentric. Upper-chest focus without joint stress. Target: 4 × 12–15 · RIR 2.',
      },
      {
        name: 'Cable Fly — Mid Height (Cuff)',
        sets: 3, repsMin: 12, repsMax: 15,
        notes: 'Upper-chest isolation. Strong stretch and squeeze. Cuffed for greater range. 3s eccentric. Target: 3 × 12–15 · RIR 2.',
      },
      {
        name: 'Face Pull',
        sets: 4, repsMin: 20, repsMax: 25,
        notes: 'Rope at chest height. Light weight. Rear-delt stimulus without joint load. High reps. Feel the muscle, not the weight. Target: 4 × 20–25 · RIR 2.',
      },
    ],
  },
];

export async function seedRoutinesIfNeeded(userId) {
  if (!userId) return;

  try {
    const alreadySeeded = await AsyncStorage.getItem(SEED_KEY);
    if (alreadySeeded) return;

    // Build name → exercise map from current library
    const existing = await getAllExercises();
    const byName = {};
    for (const ex of existing) {
      byName[ex.name] = ex;
    }

    // Insert any required exercises that don't exist yet
    for (const exData of REQUIRED_EXERCISES) {
      if (!byName[exData.name]) {
        const created = await insertExercise(exData);
        byName[exData.name] = created;
      }
    }

    // Create each sample routine and its exercises
    for (const routineData of SAMPLE_ROUTINES) {
      const routine = await createRoutine(userId, routineData.name, routineData.description);
      for (let i = 0; i < routineData.exercises.length; i++) {
        const def = routineData.exercises[i];
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
          def.notes,
          def.sets,
        );
      }
    }

    await AsyncStorage.setItem(SEED_KEY, '1');
  } catch (err) {
    console.warn('seedRoutinesIfNeeded failed:', err);
  }
}
