// Cloud (Postgres) table names + the row shapes the web reads. Column names are
// taken from the mobile sync layer (src/lib/sync*.js), the source of truth for
// the cloud schema. Only the columns the web actually reads are typed here;
// extend as screens are built. Timestamps that mobile pushes as ISO strings are
// typed string; week_start is pushed as an epoch-ms integer.

export const TABLES = {
  morningWeights: 'morning_weights',
  nutritionTargets: 'nutrition_targets',
  dailyIntakeRollups: 'daily_intake_rollups',
  workouts: 'workouts',
  workoutSets: 'workout_sets',
  exercises: 'exercises',
  routines: 'routines',
  routineExercises: 'routine_exercises',
  coachOutputs: 'coach_outputs',
  programmes: 'programmes',
  mesocycles: 'mesocycles',
} as const;

export interface MorningWeightRow {
  id: string;
  user_id: string;
  weight_kg: number | null;
  logged_at: string | null; // ISO
  notes: string | null;
}

export interface NutritionTargetRow {
  user_id: string;
  target_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  phase: string | null;
}

// Cloud shape mirrors the local SQLite table (user_id, entry_date) PK. The
// cloud push path for this table was not located in the mobile sync layer, so
// treat the read as best-effort: callers isolate its errors.
export interface DailyIntakeRollupRow {
  user_id: string;
  entry_date: string; // local day-key YYYY-MM-DD
  kcal_total: number | null;
  protein_g: number | null;
}

export interface WorkoutRow {
  id: string;
  user_id: string;
  mesocycle_id: string | null;
  name: string | null;
  started_at: string | null; // ISO
  ended_at: string | null; // ISO
  is_completed: boolean | null;
  total_volume: number | null;
}

// The rich coaching decision lives inside output_json; the top-level columns
// are minimal (id, user_id, week_start, output_json, created_at).
export interface CoachOutputRow {
  id: string;
  user_id: string;
  week_start: number; // epoch ms
  output_json: string | null;
  created_at: string | null;
}

// Parsed shape of coach_outputs.output_json (the fields the dashboard surfaces).
export interface CoachOutputPayload {
  whyThis?: string;
  why_this?: string;
  calorieChange?: number;
  calorie_change?: number;
  goalPhase?: string;
  goal_phase?: string;
  headline?: string;
  [key: string]: unknown;
}
