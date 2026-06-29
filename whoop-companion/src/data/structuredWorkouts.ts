/**
 * Structured / interval workouts — a Garmin-style workout you build once and run
 * step-by-step in the live session (warm-up → work/rest intervals → cool-down),
 * each step with a duration and an optional target HR zone. The live screen
 * guides you through the steps and auto-advances.
 */

export type StepKind = 'warmup' | 'work' | 'rest' | 'cooldown';

export type WorkoutStep = {
  kind: StepKind;
  durationSec: number;
  targetZone?: number | null; // 1..5 (% max-HR zone), optional
};

export type StructuredWorkout = {
  id: string;
  name: string;
  activity: string;
  steps: WorkoutStep[];
};

export const STEP_META: Record<StepKind, { label: string; color: string }> = {
  warmup: { label: 'Warm-up', color: '#00F19F' },
  work: { label: 'Work', color: '#FF4D4F' },
  rest: { label: 'Recover', color: '#3FA7FF' },
  cooldown: { label: 'Cool-down', color: '#8A93A2' },
};

export function totalDurationSec(w: StructuredWorkout): number {
  return w.steps.reduce((a, s) => a + s.durationSec, 0);
}

/** Which step you're in at a given elapsed time, with within-step timing. */
export function stepAt(
  w: StructuredWorkout,
  elapsedSec: number,
): { index: number; step: WorkoutStep | null; stepElapsed: number; stepRemaining: number; done: boolean } {
  let acc = 0;
  for (let i = 0; i < w.steps.length; i += 1) {
    const s = w.steps[i]!;
    if (elapsedSec < acc + s.durationSec) {
      return { index: i, step: s, stepElapsed: elapsedSec - acc, stepRemaining: acc + s.durationSec - elapsedSec, done: false };
    }
    acc += s.durationSec;
  }
  return { index: w.steps.length, step: null, stepElapsed: 0, stepRemaining: 0, done: true };
}

/** Build a classic interval workout from simple parameters. */
export function buildIntervalWorkout(input: {
  id: string;
  name: string;
  activity: string;
  warmupMin: number;
  workMin: number;
  workZone: number;
  restMin: number;
  restZone: number;
  repeats: number;
  cooldownMin: number;
}): StructuredWorkout {
  const steps: WorkoutStep[] = [];
  if (input.warmupMin > 0) steps.push({ kind: 'warmup', durationSec: input.warmupMin * 60, targetZone: 2 });
  for (let i = 0; i < input.repeats; i += 1) {
    steps.push({ kind: 'work', durationSec: Math.round(input.workMin * 60), targetZone: input.workZone });
    if (i < input.repeats - 1 && input.restMin > 0)
      steps.push({ kind: 'rest', durationSec: Math.round(input.restMin * 60), targetZone: input.restZone });
  }
  if (input.cooldownMin > 0) steps.push({ kind: 'cooldown', durationSec: input.cooldownMin * 60, targetZone: 1 });
  return { id: input.id, name: input.name, activity: input.activity, steps };
}

const ivl = (n: number, workMin: number, workZone: number, restMin: number) =>
  buildIntervalWorkout({ id: '', name: '', activity: '', warmupMin: 10, workMin, workZone, restMin, restZone: 1, repeats: n, cooldownMin: 5 }).steps;

export const PRESET_WORKOUTS: StructuredWorkout[] = [
  { id: 'preset_4x4', name: '4 × 4 min VO₂max', activity: 'Running', steps: ivl(4, 4, 4, 3) },
  { id: 'preset_30_30', name: '30/30 VO₂max', activity: 'Running', steps: ivl(10, 0.5, 5, 0.5) },
  {
    id: 'preset_tempo',
    name: 'Tempo 20',
    activity: 'Running',
    steps: [
      { kind: 'warmup', durationSec: 600, targetZone: 2 },
      { kind: 'work', durationSec: 1200, targetZone: 3 },
      { kind: 'cooldown', durationSec: 300, targetZone: 1 },
    ],
  },
  {
    id: 'preset_easy',
    name: 'Easy 45',
    activity: 'Running',
    steps: [
      { kind: 'warmup', durationSec: 300, targetZone: 1 },
      { kind: 'work', durationSec: 2100, targetZone: 2 },
      { kind: 'cooldown', durationSec: 300, targetZone: 1 },
    ],
  },
];
