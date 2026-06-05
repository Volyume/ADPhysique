import type { SupabaseClient } from '@supabase/supabase-js';
import { libraryById, type ResolvedExercise } from '../exerciseLibrary';

// The user's custom (non-library) exercises from the cloud `exercises` row.
// Library exercises are resolved from the bundled data by canonical id; only
// custom exercises (random ids) need a cloud read.
export async function fetchCustomExercises(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, ResolvedExercise>> {
  const m = new Map<string, ResolvedExercise>();
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, primary_muscle, secondary_muscles')
    .eq('user_id', userId);
  if (error) return m;
  for (const e of (data ?? []) as Array<Record<string, unknown>>) {
    let secondary: string[] = [];
    const raw = e.secondary_muscles;
    if (typeof raw === 'string') {
      try {
        secondary = JSON.parse(raw) as string[];
      } catch {
        secondary = raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(raw)) {
      secondary = raw as string[];
    }
    m.set(String(e.id), {
      id: String(e.id),
      name: String(e.name ?? 'Exercise'),
      primary: String(e.primary_muscle ?? ''),
      secondary,
    });
  }
  return m;
}

// Resolve an exercise id to a library or custom entry.
export function resolveExercise(
  id: string,
  custom: Map<string, ResolvedExercise>,
): ResolvedExercise | null {
  return libraryById().get(id) ?? custom.get(id) ?? null;
}
