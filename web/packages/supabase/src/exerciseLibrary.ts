import { EXERCISE_LIBRARY, type LibraryExercise } from './exerciseLibrary.data';
import { canonicalExerciseId } from './canonicalExerciseId';

export interface ResolvedExercise {
  id: string;
  name: string;
  primary: string;
  secondary: string[];
}

let cached: Map<string, ResolvedExercise> | null = null;

// Map of canonical exercise id -> library entry, built once from the bundled
// library using the same name-hash the app uses. Custom exercises (random ids)
// are not in here; the query layer merges those from the cloud `exercises` row.
export function libraryById(): Map<string, ResolvedExercise> {
  if (cached) return cached;
  const m = new Map<string, ResolvedExercise>();
  for (const e of EXERCISE_LIBRARY) {
    const id = canonicalExerciseId(e.name);
    m.set(id, { id, name: e.name, primary: e.primary, secondary: e.secondary });
  }
  cached = m;
  return m;
}

export type { LibraryExercise };

// Epley estimated 1RM. Matches the standard the app's progress charts use.
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}
