import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllExercises, insertExercise } from './database';

const SEEDED_KEY = '@volyume_exercises_seeded_v3';

// [name, primaryMuscle, secondaryMuscles, equipment, movementPattern, isCompound, minReps, maxReps, fatigueCost, sfr]
const RAW = [
  // CHEST
  ['Barbell Bench Press', 'chest', ['triceps', 'shoulders'], 'barbell', 'push', true, 4, 8, 4, 3],
  ['Incline Barbell Bench Press', 'chest', ['triceps', 'shoulders'], 'barbell', 'push', true, 5, 10, 4, 3],
  ['Decline Barbell Bench Press', 'chest', ['triceps'], 'barbell', 'push', true, 6, 10, 3, 3],
  ['Dumbbell Bench Press', 'chest', ['triceps', 'shoulders'], 'dumbbell', 'push', true, 6, 12, 3, 4],
  ['Incline Dumbbell Press', 'chest', ['triceps', 'shoulders'], 'dumbbell', 'push', true, 8, 15, 3, 4],
  ['Decline Dumbbell Press', 'chest', ['triceps'], 'dumbbell', 'push', true, 8, 15, 3, 4],
  ['Cable Fly (Low to High)', 'chest', [], 'cable', 'isolation', false, 12, 20, 2, 5],
  ['Cable Crossover (High to Low)', 'chest', [], 'cable', 'isolation', false, 12, 20, 2, 5],
  ['Dumbbell Fly', 'chest', [], 'dumbbell', 'isolation', false, 10, 15, 2, 4],
  ['Incline Dumbbell Fly', 'chest', [], 'dumbbell', 'isolation', false, 10, 15, 2, 4],
  ['Pec Deck (Machine Fly)', 'chest', [], 'machine', 'isolation', false, 12, 20, 2, 5],
  ['Machine Chest Press', 'chest', ['triceps', 'shoulders'], 'machine', 'push', true, 8, 15, 3, 4],
  ['Incline Machine Press', 'chest', ['triceps', 'shoulders'], 'machine', 'push', true, 8, 15, 3, 4],
  ['Weighted Dips (Chest)', 'chest', ['triceps', 'shoulders'], 'bodyweight', 'push', true, 6, 15, 4, 3],
  ['Push-Up', 'chest', ['triceps', 'shoulders'], 'bodyweight', 'push', true, 10, 20, 2, 3],
  ['Landmine Press', 'chest', ['shoulders'], 'barbell', 'push', true, 8, 15, 3, 4],
  ['Smith Machine Bench Press', 'chest', ['triceps', 'shoulders'], 'machine', 'push', true, 6, 12, 3, 3],
  ['Cable Fly (Neutral)', 'chest', [], 'cable', 'isolation', false, 12, 20, 2, 5],

  // BACK
  ['Barbell Row (Bent Over)', 'back', ['biceps', 'shoulders'], 'barbell', 'pull', true, 5, 10, 4, 3],
  ['Dumbbell Row', 'back', ['biceps'], 'dumbbell', 'pull', true, 8, 15, 3, 4],
  ['T-Bar Row', 'back', ['biceps'], 'barbell', 'pull', true, 6, 12, 4, 3],
  ['Seated Cable Row', 'back', ['biceps'], 'cable', 'pull', true, 10, 15, 3, 4],
  ['Lat Pulldown (Wide Grip)', 'back', ['biceps'], 'cable', 'pull', true, 8, 15, 3, 4],
  ['Lat Pulldown (Close Grip)', 'back', ['biceps'], 'cable', 'pull', true, 8, 15, 3, 4],
  ['Pull-Up', 'back', ['biceps'], 'bodyweight', 'pull', true, 5, 15, 3, 4],
  ['Weighted Pull-Up', 'back', ['biceps'], 'bodyweight', 'pull', true, 4, 10, 4, 4],
  ['Chin-Up', 'back', ['biceps'], 'bodyweight', 'pull', true, 5, 15, 3, 4],
  ['Machine Row (Chest Supported)', 'back', ['biceps'], 'machine', 'pull', true, 10, 15, 3, 4],
  ['Cable Straight-Arm Pulldown', 'back', [], 'cable', 'pull', false, 12, 20, 2, 5],
  ['Meadows Row', 'back', ['biceps'], 'barbell', 'pull', true, 8, 15, 3, 4],
  ['Conventional Deadlift', 'back', ['quads', 'glutes', 'hamstrings'], 'barbell', 'hinge', true, 3, 8, 5, 3],
  ['Sumo Deadlift', 'back', ['quads', 'glutes', 'hamstrings'], 'barbell', 'hinge', true, 3, 8, 5, 3],
  ['Rack Pull', 'back', ['glutes'], 'barbell', 'hinge', true, 3, 8, 4, 3],
  ['Cable High Row', 'back', ['biceps'], 'cable', 'pull', true, 10, 15, 2, 4],
  ['Single-Arm Cable Row', 'back', ['biceps'], 'cable', 'pull', true, 10, 15, 3, 4],
  ['Trap Bar Deadlift', 'back', ['quads', 'glutes', 'hamstrings'], 'barbell', 'hinge', true, 4, 8, 5, 4],
  ['Pendlay Row', 'back', ['biceps'], 'barbell', 'pull', true, 5, 8, 4, 4],
  ['Inverted Row', 'back', ['biceps'], 'bodyweight', 'pull', true, 8, 15, 2, 4],
  ['Cable Lat Pullover', 'back', [], 'cable', 'pull', false, 12, 20, 2, 5],
  ['Single-Arm Lat Pulldown', 'back', ['biceps'], 'cable', 'pull', true, 10, 15, 3, 4],

  // SHOULDERS
  ['Barbell Overhead Press', 'shoulders', ['triceps'], 'barbell', 'push', true, 5, 10, 4, 3],
  ['Dumbbell Shoulder Press', 'shoulders', ['triceps'], 'dumbbell', 'push', true, 8, 15, 3, 4],
  ['Arnold Press', 'shoulders', ['triceps'], 'dumbbell', 'push', true, 8, 12, 3, 4],
  ['Machine Shoulder Press', 'shoulders', ['triceps'], 'machine', 'push', true, 8, 15, 3, 4],
  ['Dumbbell Lateral Raise', 'shoulders', [], 'dumbbell', 'isolation', false, 15, 25, 2, 5],
  ['Cable Lateral Raise', 'shoulders', [], 'cable', 'isolation', false, 15, 25, 2, 5],
  ['Machine Lateral Raise', 'shoulders', [], 'machine', 'isolation', false, 15, 25, 2, 5],
  ['Dumbbell Rear Delt Fly', 'shoulders', ['back'], 'dumbbell', 'isolation', false, 15, 25, 2, 5],
  ['Cable Rear Delt Fly', 'shoulders', ['back'], 'cable', 'isolation', false, 15, 25, 2, 5],
  ['Reverse Pec Deck', 'shoulders', ['back'], 'machine', 'isolation', false, 15, 25, 2, 5],
  ['Upright Row', 'shoulders', ['biceps', 'traps'], 'barbell', 'pull', false, 10, 15, 3, 3],
  ['Dumbbell Front Raise', 'shoulders', [], 'dumbbell', 'isolation', false, 12, 20, 2, 3],
  ['Cable Front Raise', 'shoulders', [], 'cable', 'isolation', false, 12, 20, 2, 3],
  ['Cable Y-Raise (Prone)', 'shoulders', ['back'], 'cable', 'pull', false, 12, 20, 2, 5],
  ['Face Pull', 'shoulders', ['back', 'traps'], 'cable', 'pull', false, 15, 25, 2, 5],
  ['Dumbbell Side-Lying Rear Delt', 'shoulders', [], 'dumbbell', 'isolation', false, 15, 25, 1, 5],

  // BICEPS
  ['Barbell Curl', 'biceps', [], 'barbell', 'isolation', false, 8, 12, 2, 4],
  ['EZ Bar Curl', 'biceps', [], 'barbell', 'isolation', false, 8, 12, 2, 4],
  ['Dumbbell Curl', 'biceps', [], 'dumbbell', 'isolation', false, 10, 15, 2, 4],
  ['Incline Dumbbell Curl', 'biceps', [], 'dumbbell', 'isolation', false, 10, 15, 2, 5],
  ['Hammer Curl', 'biceps', ['forearms'], 'dumbbell', 'isolation', false, 10, 15, 2, 4],
  ['Cable Curl', 'biceps', [], 'cable', 'isolation', false, 10, 15, 2, 4],
  ['Preacher Curl (EZ Bar)', 'biceps', [], 'barbell', 'isolation', false, 8, 12, 2, 4],
  ['Machine Curl', 'biceps', [], 'machine', 'isolation', false, 10, 15, 2, 4],
  ['Concentration Curl', 'biceps', [], 'dumbbell', 'isolation', false, 12, 15, 2, 5],
  ['Cross-Body Hammer Curl', 'biceps', ['forearms'], 'dumbbell', 'isolation', false, 10, 15, 2, 4],
  ['Zottman Curl', 'biceps', ['forearms'], 'dumbbell', 'isolation', false, 8, 12, 2, 4],
  ['Spider Curl', 'biceps', [], 'barbell', 'isolation', false, 8, 12, 2, 5],

  // TRICEPS
  ['Close-Grip Bench Press', 'triceps', ['chest', 'shoulders'], 'barbell', 'push', true, 6, 12, 3, 3],
  ['EZ Bar Skull Crusher', 'triceps', [], 'barbell', 'isolation', false, 8, 15, 2, 4],
  ['Cable Pushdown (Straight Bar)', 'triceps', [], 'cable', 'isolation', false, 10, 20, 2, 4],
  ['Rope Pushdown', 'triceps', [], 'cable', 'isolation', false, 12, 20, 2, 4],
  ['Overhead Cable Tricep Extension', 'triceps', [], 'cable', 'isolation', false, 12, 20, 2, 5],
  ['Overhead Dumbbell Extension', 'triceps', [], 'dumbbell', 'isolation', false, 10, 15, 2, 4],
  ['Weighted Dips (Triceps)', 'triceps', ['chest', 'shoulders'], 'bodyweight', 'push', true, 8, 15, 4, 3],
  ['Machine Tricep Extension', 'triceps', [], 'machine', 'isolation', false, 12, 20, 2, 4],
  ['JM Press', 'triceps', ['chest'], 'barbell', 'push', true, 8, 12, 3, 4],
  ['Tricep Kickback', 'triceps', [], 'dumbbell', 'isolation', false, 12, 20, 2, 3],
  ['Diamond Push-Up', 'triceps', ['chest'], 'bodyweight', 'push', true, 10, 20, 2, 3],
  ['Tate Press', 'triceps', [], 'dumbbell', 'isolation', false, 10, 15, 2, 4],
  ['Lying Tricep Extension', 'triceps', [], 'dumbbell', 'isolation', false, 10, 15, 2, 4],

  // QUADS
  ['Barbell Back Squat', 'quads', ['glutes', 'hamstrings', 'core'], 'barbell', 'squat', true, 5, 10, 5, 3],
  ['Barbell Front Squat', 'quads', ['glutes', 'core'], 'barbell', 'squat', true, 5, 10, 4, 3],
  ['Leg Press', 'quads', ['glutes', 'hamstrings'], 'machine', 'squat', true, 8, 20, 4, 4],
  ['Hack Squat Machine', 'quads', ['glutes'], 'machine', 'squat', true, 8, 15, 4, 4],
  ['Bulgarian Split Squat', 'quads', ['glutes'], 'dumbbell', 'squat', true, 8, 15, 4, 4],
  ['Dumbbell Lunge', 'quads', ['glutes'], 'dumbbell', 'squat', true, 10, 20, 3, 4],
  ['Walking Lunge', 'quads', ['glutes', 'hamstrings'], 'dumbbell', 'squat', true, 10, 20, 3, 4],
  ['Leg Extension', 'quads', [], 'machine', 'isolation', false, 12, 25, 2, 5],
  ['Goblet Squat', 'quads', ['glutes'], 'dumbbell', 'squat', true, 10, 20, 3, 4],
  ['Smith Machine Squat', 'quads', ['glutes'], 'machine', 'squat', true, 8, 15, 4, 4],
  ['Sumo Squat', 'quads', ['glutes', 'hamstrings'], 'barbell', 'squat', true, 8, 15, 4, 3],
  ['Leg Press (Narrow Stance)', 'quads', ['glutes'], 'machine', 'squat', true, 8, 20, 4, 4],

  // HAMSTRINGS
  ['Romanian Deadlift (Barbell)', 'hamstrings', ['glutes', 'back'], 'barbell', 'hinge', true, 6, 12, 4, 4],
  ['Romanian Deadlift (Dumbbell)', 'hamstrings', ['glutes'], 'dumbbell', 'hinge', true, 8, 15, 3, 4],
  ['Lying Leg Curl', 'hamstrings', [], 'machine', 'isolation', false, 10, 15, 2, 5],
  ['Seated Leg Curl', 'hamstrings', [], 'machine', 'isolation', false, 10, 15, 2, 5],
  ['Standing Leg Curl', 'hamstrings', [], 'machine', 'isolation', false, 10, 15, 2, 5],
  ['Nordic Hamstring Curl', 'hamstrings', [], 'bodyweight', 'isolation', false, 3, 10, 3, 5],
  ['Good Morning', 'hamstrings', ['back', 'glutes'], 'barbell', 'hinge', true, 8, 15, 4, 3],
  ['Stiff-Leg Deadlift', 'hamstrings', ['back', 'glutes'], 'barbell', 'hinge', true, 6, 12, 4, 4],
  ['Kettlebell Swing', 'hamstrings', ['glutes', 'back'], 'kettlebell', 'hinge', true, 10, 20, 3, 4],

  // GLUTES
  ['Barbell Hip Thrust', 'glutes', ['hamstrings', 'quads'], 'barbell', 'hinge', true, 8, 15, 3, 5],
  ['Dumbbell Hip Thrust', 'glutes', ['hamstrings'], 'dumbbell', 'hinge', true, 10, 20, 3, 5],
  ['Cable Kickback', 'glutes', [], 'cable', 'isolation', false, 15, 25, 2, 5],
  ['Cable Pull-Through', 'glutes', ['hamstrings'], 'cable', 'hinge', true, 12, 20, 2, 5],
  ['Glute Bridge', 'glutes', ['hamstrings'], 'bodyweight', 'hinge', true, 12, 20, 2, 4],
  ['Step-Up (Dumbbell)', 'glutes', ['quads'], 'dumbbell', 'squat', true, 10, 15, 3, 4],
  ['Abductor Machine', 'glutes', [], 'machine', 'isolation', false, 15, 25, 2, 4],
  ['Reverse Hyperextension', 'glutes', ['hamstrings', 'back'], 'machine', 'hinge', true, 12, 20, 2, 5],
  ['Cable Hip Abduction', 'glutes', [], 'cable', 'isolation', false, 15, 25, 2, 4],

  // CALVES
  ['Standing Calf Raise (Machine)', 'calves', [], 'machine', 'isolation', false, 10, 20, 2, 4],
  ['Seated Calf Raise', 'calves', [], 'machine', 'isolation', false, 15, 25, 2, 4],
  ['Leg Press Calf Raise', 'calves', [], 'machine', 'isolation', false, 15, 25, 2, 4],
  ['Smith Machine Calf Raise', 'calves', [], 'machine', 'isolation', false, 10, 20, 2, 4],
  ['Single-Leg Calf Raise (Bodyweight)', 'calves', [], 'bodyweight', 'isolation', false, 15, 25, 2, 4],
  ['Donkey Calf Raise', 'calves', [], 'bodyweight', 'isolation', false, 15, 25, 2, 4],

  // ABS
  ['Cable Crunch', 'abs', [], 'cable', 'isolation', false, 15, 25, 2, 5],
  ['Hanging Leg Raise', 'abs', [], 'bodyweight', 'isolation', false, 10, 20, 2, 5],
  ['Plank', 'abs', [], 'bodyweight', 'isolation', false, 20, 60, 2, 4],
  ['Ab Rollout', 'abs', [], 'bodyweight', 'isolation', false, 8, 15, 2, 5],
  ['Decline Crunch', 'abs', [], 'bodyweight', 'isolation', false, 15, 25, 2, 4],
  ['Russian Twist', 'abs', [], 'bodyweight', 'isolation', false, 20, 30, 2, 4],
  ['Pallof Press', 'abs', [], 'cable', 'isolation', false, 10, 15, 2, 5],
  ['Landmine Twist', 'abs', [], 'barbell', 'isolation', false, 10, 15, 2, 4],
  ['Side Plank', 'abs', [], 'bodyweight', 'isolation', false, 20, 60, 1, 4],
  ['Bicycle Crunch', 'abs', [], 'bodyweight', 'isolation', false, 20, 30, 1, 4],
  ['V-Up', 'abs', [], 'bodyweight', 'isolation', false, 10, 20, 2, 4],
  ['Sit-Up', 'abs', [], 'bodyweight', 'isolation', false, 15, 30, 1, 3],
  ['Leg Raise (Flat Bench)', 'abs', [], 'bodyweight', 'isolation', false, 15, 25, 1, 4],
  ['Dragon Flag', 'abs', [], 'bodyweight', 'isolation', false, 5, 10, 3, 5],
  ['Cable Woodchop', 'abs', [], 'cable', 'isolation', false, 10, 15, 2, 4],

  // TRAPS
  ['Barbell Shrug', 'traps', [], 'barbell', 'isolation', false, 12, 20, 2, 4],
  ['Dumbbell Shrug', 'traps', [], 'dumbbell', 'isolation', false, 12, 20, 2, 4],
  ['Cable Shrug', 'traps', [], 'cable', 'isolation', false, 12, 20, 2, 4],
  ["Farmer's Walk", 'traps', ['forearms', 'abs'], 'dumbbell', 'carry', true, 20, 40, 3, 4],
  ['Hex Bar Shrug', 'traps', [], 'barbell', 'isolation', false, 12, 20, 3, 4],
  ['Smith Machine Shrug', 'traps', [], 'machine', 'isolation', false, 12, 20, 2, 4],
  ['Behind-the-Back Barbell Shrug', 'traps', [], 'barbell', 'isolation', false, 12, 20, 2, 4],

  // FOREARMS
  ['Barbell Wrist Curl', 'forearms', [], 'barbell', 'isolation', false, 15, 25, 2, 3],
  ['Reverse Wrist Curl', 'forearms', [], 'barbell', 'isolation', false, 15, 25, 2, 3],
  ['Reverse Curl', 'forearms', ['biceps'], 'barbell', 'isolation', false, 10, 15, 2, 3],
  ['Dead Hang', 'forearms', ['back'], 'bodyweight', 'isolation', false, 20, 60, 2, 4],
  ['Dumbbell Wrist Curl', 'forearms', [], 'dumbbell', 'isolation', false, 15, 25, 1, 3],
  ['Plate Pinch', 'forearms', [], 'barbell', 'isolation', false, 30, 60, 2, 3],
  ['Cable Reverse Curl', 'forearms', ['biceps'], 'cable', 'isolation', false, 12, 20, 2, 3],

  // CALVES (additional)
  ['Dumbbell Calf Raise (Standing)', 'calves', [], 'dumbbell', 'isolation', false, 12, 20, 2, 4],
  ['Box Jump', 'calves', ['quads', 'glutes'], 'bodyweight', 'plyometric', true, 5, 10, 3, 4],

  // GLUTES (additional)
  ['45-Degree Hip Extension', 'glutes', ['hamstrings', 'back'], 'machine', 'hinge', true, 12, 20, 2, 4],
  ['Sumo Deadlift (High Bar)', 'glutes', ['hamstrings', 'quads'], 'barbell', 'hinge', true, 5, 10, 5, 3],
  ['Smith Machine Hip Thrust', 'glutes', ['hamstrings'], 'machine', 'hinge', true, 10, 20, 3, 5],

  // BACK (additional compound)
  ['Seal Row', 'back', ['biceps'], 'barbell', 'pull', true, 6, 12, 3, 5],
  ['Chest-Supported Row (Dumbbell)', 'back', ['biceps'], 'dumbbell', 'pull', true, 8, 15, 3, 5],
  ['Landmine Row', 'back', ['biceps'], 'barbell', 'pull', true, 8, 15, 3, 4],
  ['Seated Machine Row (Wide)', 'back', ['biceps'], 'machine', 'pull', true, 10, 15, 3, 4],
  ['Face Pull (Rope)', 'back', ['shoulders', 'traps'], 'cable', 'pull', false, 15, 25, 2, 5],

  // CHEST (additional)
  ['Svend Press', 'chest', [], 'barbell', 'isolation', false, 15, 25, 2, 4],
  ['Cable Fly (Chest Height)', 'chest', [], 'cable', 'isolation', false, 12, 20, 2, 5],
  ['Dumbbell Pullover', 'chest', ['back'], 'dumbbell', 'isolation', false, 10, 15, 2, 4],

  // SHOULDERS (additional)
  ['Seated Dumbbell Press', 'shoulders', ['triceps'], 'dumbbell', 'push', true, 8, 15, 3, 4],
  ['Leaning Lateral Raise', 'shoulders', [], 'dumbbell', 'isolation', false, 15, 25, 2, 5],
  ['Lying Rear Delt Row', 'shoulders', ['back'], 'dumbbell', 'pull', false, 15, 25, 2, 5],

  // BICEPS (additional)
  ['Cable Hammer Curl (Rope)', 'biceps', ['forearms'], 'cable', 'isolation', false, 10, 15, 2, 4],
  ['Prone Incline Curl', 'biceps', [], 'dumbbell', 'isolation', false, 10, 15, 2, 5],

  // TRICEPS (additional)
  ['Decline Skull Crusher', 'triceps', [], 'barbell', 'isolation', false, 8, 15, 2, 4],
  ['Bench Dip', 'triceps', ['chest', 'shoulders'], 'bodyweight', 'push', true, 10, 20, 2, 3],

  // QUADS (additional)
  ['Sissy Squat', 'quads', [], 'bodyweight', 'isolation', false, 10, 20, 3, 4],
  ['Wall Sit', 'quads', [], 'bodyweight', 'isolation', false, 30, 90, 2, 3],
  ['Pendulum Squat', 'quads', ['glutes'], 'machine', 'squat', true, 8, 15, 4, 4],

  // HAMSTRINGS (additional)
  ['Single-Leg Romanian Deadlift', 'hamstrings', ['glutes'], 'dumbbell', 'hinge', true, 8, 12, 3, 4],
  ['Swiss Ball Leg Curl', 'hamstrings', ['glutes'], 'bodyweight', 'isolation', false, 10, 20, 2, 5],
];

export async function seedExercisesIfNeeded() {
  try {
    const seeded = await AsyncStorage.getItem(SEEDED_KEY);
    if (seeded === 'true') return;

    const existing = await getAllExercises();
    if (existing.length > 0) {
      await AsyncStorage.setItem(SEEDED_KEY, 'true');
      return;
    }

    for (const row of RAW) {
      const [name, primaryMuscle, secondaryMuscles, equipment, movementPattern, isCompound, min, max, fatigue, sfr] = row;
      await insertExercise({
        name,
        primaryMuscle,
        secondaryMuscles,
        equipment,
        movementPattern,
        compoundIsolation: isCompound ? 'compound' : 'isolation',
        defaultRepMin: min,
        defaultRepMax: max,
        fatigueCost: fatigue,
        stimulusToFatigueRatio: sfr,
        isCustom: false,
      });
    }

    await AsyncStorage.setItem(SEEDED_KEY, 'true');
    console.log(`[Seed] Inserted ${RAW.length} exercises`);
  } catch (err) {
    console.error('[Seed] seedExercisesIfNeeded failed:', err);
  }
}
