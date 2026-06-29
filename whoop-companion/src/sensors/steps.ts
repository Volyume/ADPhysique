/**
 * Step counting from the PHONE (expo-sensors Pedometer). On iOS, CMPedometer
 * gives an accurate day total via getStepCountAsync. On Android there is no
 * historical query, so we read the live hardware step counter from app open and
 * accumulate — a partial day total (steps before the app opened aren't counted).
 * Honest limitation; the strap's own step counter would need the locked IMU.
 */

import { Pedometer } from 'expo-sensors';

export async function pedometerAvailable(): Promise<boolean> {
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

/** iOS: today's step total since midnight. Android: throws → returns null. */
export async function stepsToday(): Promise<number | null> {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const res = await Pedometer.getStepCountAsync(start, new Date());
    return res?.steps ?? null;
  } catch {
    return null;
  }
}

/** Live step subscription; callback receives steps since the watch started. */
export function watchSteps(cb: (stepsSinceStart: number) => void) {
  return Pedometer.watchStepCount((r) => cb(r.steps));
}
