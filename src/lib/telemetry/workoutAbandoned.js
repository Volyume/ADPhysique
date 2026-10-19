/**
 * workout_abandoned (growth telemetry, founder brief 2026-10-19): an
 * unfinished workout found open at a later launch, reported once per workout.
 *
 * Called by Home right after the store restores the crash-recovery snapshot.
 * Reads the restored session (sets logged, when it started) and sends only
 * two buckets: its age in HOURS (the schema's `age` bucket is hours) and its
 * set count. The workout id is used only as a local once-only key and is
 * never sent. Best-effort; never throws.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackNow } from './growth';
import { toBucket } from './schema';

export async function trackWorkoutAbandonedIfOpen(state, userId) {
  try {
    const id = state?.activeWorkout?.id;
    if (!userId || !id) return false;
    const key = `@volyume_tabandoned_${userId}_${id}`;
    if (await AsyncStorage.getItem(key)) return false;
    await AsyncStorage.setItem(key, String(Date.now()));
    const started = Number(state.workoutStartTime) || Number(state.activeWorkout.startedAt) || Date.now();
    const hours = Math.max(0, (Date.now() - started) / 3600000);
    const sets = (state.workoutExercises || []).reduce((n, e) => n + (e.sets?.length ?? 0), 0);
    trackNow('workout_abandoned', { age: toBucket('age', hours), sets: toBucket('count', sets) });
    return true;
  } catch (_) {
    return false;
  }
}
