import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllExercises, insertExercise, createRoutine, addExerciseToRoutine,
  createProgramme,
} from './database';

const SEED_KEY = '@volyume_routines_seeded_v3';

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

const LIBRARY_PROGRAMME = {
  name: 'Aesthetic Upper Rotation',
  description: 'Two-day upper-body rotation focused on width, rear delts, lateral delts and upper chest. Shoulder-safe execution throughout.',
  workouts: [
    {
      name: 'Day 1 — Width, Rear Delts and Back Detail',
      description: 'Lat width, lower-lat control, mid-back detail, serratus, and shoulder-safe rear-delt work.',
      exercises: [
        {
          name: 'Face Pull',
          sets: 4, repsMin: 20, repsMax: 25, restSeconds: 60,
          notes: 'Rope at chest height, elbows high and wide. Light weight only. Pull only to comfortable range. Squeeze rear delt at contraction.',
        },
        {
          name: 'HS Plate-Loaded Lat Pulldown',
          sets: 4, repsMin: 8, repsMax: 12, restSeconds: 90,
          notes: 'Primary lat-width movement. Full overhead stretch. Pull elbows to pockets. 3s eccentric.',
        },
        {
          name: 'Underhand Lat Pulldown',
          sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90,
          notes: 'Lower-lat emphasis. Full stretch at top. Squeeze lower lat hard at bottom. 3s eccentric.',
        },
        {
          name: 'Plate-Loaded Seated Row',
          sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90,
          notes: 'Mid-back thickness. Full stretch forward. Pull elbows back. Squeeze rhomboids. Controlled tempo.',
        },
        {
          name: 'HS ISO High Row',
          sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90,
          notes: 'Upper lat and mid-back finishing movement. Controlled tempo throughout.',
        },
        {
          name: 'Cable Straight-Arm Pulldown',
          sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60,
          notes: 'Lat length and lower-lat control. Slight elbow bend throughout. Slow arc.',
        },
        {
          name: 'Cable Serratus Punch',
          sets: 3, repsMin: 15, repsMax: 25, restSeconds: 60,
          notes: 'Single arm. Reach forward and fully protract scapula. Feel serratus along ribcage. Deliberate tempo.',
        },
        {
          name: 'Machine Lateral Raise',
          sets: 2, repsMin: 15, repsMax: 20, restSeconds: 60,
          notes: 'Optional pump only. Skip if shoulder is irritated. Light weight.',
        },
      ],
    },
    {
      name: 'Day 2 — Upper Chest, Lateral Delts and Shoulder Refinement',
      description: 'Three-angle cuffed lateral work, shoulder-safe pressing, upper-chest cable work, and light rear-delt work.',
      exercises: [
        {
          name: 'Cable Lateral Raise — Low Pulley (Cuff)',
          sets: 4, repsMin: 15, repsMax: 20, restSeconds: 60,
          notes: 'Arm slightly forward. Lead with elbow. Raise to shoulder height. Constant tension. Controlled tempo.',
        },
        {
          name: 'Cable Lateral Raise — Mid Pulley (Cuff)',
          sets: 3, repsMin: 15, repsMax: 20, restSeconds: 60,
          notes: 'Different angle to low pulley. Still cuffed. Slightly different fibre recruitment. Controlled.',
        },
        {
          name: 'Cable Lateral Raise — High Pulley (Cuff)',
          sets: 3, repsMin: 15, repsMax: 20, restSeconds: 60,
          notes: 'Third angle — pull across and down. Completes full lateral-delt coverage. Controlled.',
        },
        {
          name: 'Facing-In Shoulder Press',
          sets: 4, repsMin: 12, repsMax: 15, restSeconds: 90,
          notes: 'Face into pad. Scapular-plane pressing. Hits upper chest and anterior delt. Pain-free execution only.',
        },
        {
          name: 'Cable Fly — Low to Mid (Incline)',
          sets: 4, repsMin: 12, repsMax: 15, restSeconds: 90,
          notes: 'Bench 30–45 degrees, cables low. Fly upward and inward. 3s eccentric. Upper-chest focus without joint stress.',
        },
        {
          name: 'Cable Fly — Mid Height (Cuff)',
          sets: 3, repsMin: 12, repsMax: 15, restSeconds: 90,
          notes: 'Upper-chest isolation. Strong stretch and squeeze. Cuffed for greater range. 3s eccentric.',
        },
        {
          name: 'Face Pull',
          sets: 4, repsMin: 20, repsMax: 25, restSeconds: 60,
          notes: 'Rope at chest height. Light weight. Rear-delt stimulus without joint load. High reps.',
        },
      ],
    },
  ],
};

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

    for (const exData of REQUIRED_EXERCISES) {
      if (!byName[exData.name]) {
        const created = await insertExercise(exData);
        byName[exData.name] = created;
      }
    }

    // Create the library programme
    const programme = await createProgramme(
      userId,
      LIBRARY_PROGRAMME.name,
      LIBRARY_PROGRAMME.description,
      1,
    );

    for (const workoutDef of LIBRARY_PROGRAMME.workouts) {
      const routine = await createRoutine(
        userId,
        workoutDef.name,
        workoutDef.description,
        null,
        1,
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
          def.notes,
          def.sets,
          null,
          def.restSeconds,
        );
      }
    }

    await AsyncStorage.setItem(SEED_KEY, '1');
  } catch (err) {
    console.warn('seedRoutinesIfNeeded failed:', err);
  }
}
