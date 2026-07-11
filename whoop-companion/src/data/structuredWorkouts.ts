/**
 * Structured / interval workouts — a Garmin-style workout you build once and run
 * step-by-step in the live session (warm-up → work/rest intervals → cool-down),
 * each step with a duration and an optional HRR (Karvonen) target zone. The live screen
 * guides you through the steps and auto-advances.
 */

export type StepKind = 'warmup' | 'work' | 'rest' | 'cooldown';

export type WorkoutStep = {
  kind: StepKind;
  durationSec: number;
  targetZone?: number | null; // 1..5 HRR (Karvonen) zone, optional
};

export type StructuredWorkout = {
  id: string;
  name: string;
  activity: string;
  steps: WorkoutStep[];
};

export type IntervalWorkoutInput = {
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
};

export const HR_ZONE_MIN = 1;
export const HR_ZONE_MAX = 5;
export const HR_ZONE_METHOD_LABEL = 'HRR (Karvonen)';

export function formatTargetZone(targetZone: number | null | undefined): string {
  return targetZone == null ? 'No HR target' : `Target ${HR_ZONE_METHOD_LABEL} zone Z${targetZone}`;
}

export const STEP_META: Record<StepKind, { label: string; color: string }> = {
  warmup: { label: 'Warm-up', color: '#00F19F' },
  work: { label: 'Work', color: '#FF4D4F' },
  rest: { label: 'Recover', color: '#3FA7FF' },
  cooldown: { label: 'Cool-down', color: '#8A93A2' },
};

function isStepKind(value: unknown): value is StepKind {
  return typeof value === 'string' && value in STEP_META;
}

function isValidZone(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= HR_ZONE_MIN && value <= HR_ZONE_MAX;
}

/** Validate templates at the persistence/UI boundary before they reach the timer. */
export function validateStructuredWorkout(value: unknown): string[] {
  if (value == null || typeof value !== 'object') return ['Workout must be an object.'];
  const w = value as Partial<StructuredWorkout>;
  const errors: string[] = [];
  if (typeof w.id !== 'string' || w.id.trim().length === 0) errors.push('Workout id is required.');
  if (typeof w.name !== 'string' || w.name.trim().length === 0) errors.push('Workout name is required.');
  if (typeof w.activity !== 'string' || w.activity.trim().length === 0) errors.push('Workout activity is required.');
  if (!Array.isArray(w.steps) || w.steps.length === 0) {
    errors.push('Workout must contain at least one step.');
    return errors;
  }
  w.steps.forEach((step, index) => {
    if (!step || typeof step !== 'object') {
      errors.push(`Step ${index + 1} must be an object.`);
      return;
    }
    if (!isStepKind(step.kind)) errors.push(`Step ${index + 1} has an invalid kind.`);
    if (typeof step.durationSec !== 'number' || !Number.isFinite(step.durationSec) || step.durationSec <= 0) {
      errors.push(`Step ${index + 1} must have a positive duration.`);
    }
    if (step.targetZone != null && !isValidZone(step.targetZone)) {
      errors.push(`Step ${index + 1} must use an HRR zone from Z${HR_ZONE_MIN} to Z${HR_ZONE_MAX}.`);
    }
  });
  return errors;
}

export function isValidStructuredWorkout(value: unknown): value is StructuredWorkout {
  return validateStructuredWorkout(value).length === 0;
}

export function validateIntervalWorkoutInput(input: IntervalWorkoutInput): string[] {
  const errors: string[] = [];
  const nonNegativeMinutes: Array<[string, number]> = [
    ['warmupMin', input.warmupMin],
    ['restMin', input.restMin],
    ['cooldownMin', input.cooldownMin],
  ];
  for (const [name, value] of nonNegativeMinutes) {
    if (!Number.isFinite(value) || value < 0) errors.push(`${name} must be a finite non-negative number.`);
  }
  if (!Number.isFinite(input.workMin) || input.workMin <= 0) errors.push('workMin must be a finite positive number.');
  if (!Number.isInteger(input.repeats) || input.repeats < 1) errors.push('repeats must be a positive integer.');
  if (!isValidZone(input.workZone)) errors.push(`workZone must be an HRR zone from Z${HR_ZONE_MIN} to Z${HR_ZONE_MAX}.`);
  if (!isValidZone(input.restZone)) errors.push(`restZone must be an HRR zone from Z${HR_ZONE_MIN} to Z${HR_ZONE_MAX}.`);
  return errors;
}

export function totalDurationSec(w: StructuredWorkout): number {
  return w.steps.reduce((a, s) => a + s.durationSec, 0);
}

/** Which step you're in at a given elapsed time, with within-step timing. */
export function stepAt(
  w: StructuredWorkout,
  elapsedSec: number,
): { index: number; step: WorkoutStep | null; stepElapsed: number; stepRemaining: number; done: boolean } {
  const safeElapsedSec = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  let acc = 0;
  for (let i = 0; i < w.steps.length; i += 1) {
    const s = w.steps[i]!;
    if (safeElapsedSec < acc + s.durationSec) {
      return { index: i, step: s, stepElapsed: safeElapsedSec - acc, stepRemaining: acc + s.durationSec - safeElapsedSec, done: false };
    }
    acc += s.durationSec;
  }
  return { index: w.steps.length, step: null, stepElapsed: 0, stepRemaining: 0, done: true };
}

/** Build a classic interval workout from simple parameters. */
export function buildIntervalWorkout(input: IntervalWorkoutInput): StructuredWorkout {
  const errors = validateIntervalWorkoutInput(input);
  if (errors.length > 0) throw new RangeError(`Invalid interval workout: ${errors.join(' ')}`);
  const steps: WorkoutStep[] = [];
  if (input.warmupMin > 0) steps.push({ kind: 'warmup', durationSec: Math.round(input.warmupMin * 60), targetZone: 2 });
  for (let i = 0; i < input.repeats; i += 1) {
    steps.push({ kind: 'work', durationSec: Math.round(input.workMin * 60), targetZone: input.workZone });
    if (i < input.repeats - 1 && input.restMin > 0)
      steps.push({ kind: 'rest', durationSec: Math.round(input.restMin * 60), targetZone: input.restZone });
  }
  if (input.cooldownMin > 0) steps.push({ kind: 'cooldown', durationSec: Math.round(input.cooldownMin * 60), targetZone: 1 });
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
