import { buildAthleteProfileSummary } from '../athleteProfileSummary';

describe('athleteProfileSummary', () => {
  test('builds body, scan, freshness and strength summary from raw rows', () => {
    const out = buildAthleteProfileSummary({
      workouts: [
        { id: 'w1', is_completed: 1, ended_at: 1000 },
        { id: 'w2', isCompleted: true, startedAt: 3000 },
        { id: 'w3', is_completed: 0, started_at: 5000 },
      ],
      exercises: [{ id: 'bench', name: 'Bench Press', primaryMuscle: 'Chest' }],
      sets: [
        { workout_id: 'w1', exercise_id: 'bench', weight: 80, actual_reps: 5, created_at: 1000 },
        { workout_id: 'w2', exercise_id: 'bench', weight: 90, actual_reps: 5, created_at: 3000 },
      ],
      latestWeight: { weightKg: 80 },
      bodyComp: { bodyFatPercent: 15.4, loggedAt: 2000 },
      metrics: [{ loggedAt: 2500 }],
      scan: { leannessBandLabel: 'Lean' },
      userProfile: {},
      units: 'kg',
    });

    expect(out.sessions).toBe(2);
    expect(out.weight).toBe(80);
    expect(out.bodyFat).toBe(15.4);
    expect(out.latestWorkoutAt).toBe(3000);
    expect(out.scan).toEqual({ leannessBandLabel: 'Lean' });
    expect(out.keyLifts).toHaveLength(1);
    expect(out.strength).toMatchObject({ count: 1 });
  });

  test('falls back to profile weight and suppresses standards without bodyweight', () => {
    const withProfileWeight = buildAthleteProfileSummary({
      workouts: [],
      exercises: [{ id: 'bench', name: 'Bench Press' }],
      sets: [{ workoutId: 'w1', exerciseId: 'bench', weight: 200, actualReps: 3, createdAt: 1000 }],
      userProfile: { bodyWeightKg: 90 },
      units: 'lbs',
    });
    expect(withProfileWeight.weight).toBe(90);
    expect(withProfileWeight.keyLifts).toHaveLength(1);

    const withoutWeight = buildAthleteProfileSummary({
      workouts: [],
      exercises: [{ id: 'bench', name: 'Bench Press' }],
      sets: [{ workoutId: 'w1', exerciseId: 'bench', weight: 90, actualReps: 3, createdAt: 1000 }],
      userProfile: {},
      units: 'kg',
    });
    expect(withoutWeight.strength).toBeNull();
    expect(withoutWeight.keyLifts).toEqual([]);
  });
});

// F13 (progress-tab audit 2026-09-24, register D200 "fix it all"): liftEntries
// used to be one entry per exercise NAME, so two variants of the same lift
// (e.g. "Barbell Bench Press" and "Close-Grip Bench Press") both matched the
// 'bench' standard and were scored + counted as two separate lifts, inflating
// strength.count and letting keyLifts show the same standard twice while
// another went missing. These pin the fix: one entry per STANDARD (keyed by
// matchStandardKey), keeping the higher-ratio variant, ordered as the
// standards are declared in STRENGTH_STANDARDS (bench, squat, deadlift, ohp,
// row). Mirrors the fix landed for LiftProgressScreen.js (commit d2b92e4e).
describe('buildAthleteProfileSummary standard-key collapsing (F13)', () => {
  test('two bench variants collapse to one entry, keeping the higher-ratio variant', () => {
    const out = buildAthleteProfileSummary({
      workouts: [],
      exercises: [
        { id: 'e1', name: 'Barbell Bench Press' },
        { id: 'e2', name: 'Close-Grip Bench Press' },
      ],
      sets: [
        { workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 1, createdAt: 1000 },
        { workoutId: 'w2', exerciseId: 'e2', weight: 120, actualReps: 1, createdAt: 2000 },
      ],
      latestWeight: { weightKg: 80 },
      userProfile: {},
      units: 'kg',
    });

    // Close-Grip Bench Press has the higher ratio (120/80 = 1.5, Elite) than
    // Barbell Bench Press (100/80 = 1.25, Advanced), so it is the sole
    // survivor for the 'bench' standard.
    expect(out.strength).toMatchObject({ count: 1, overallLabel: 'Elite' });
    expect(out.keyLifts).toHaveLength(1);
    expect(out.keyLifts[0].row.name).toBe('Close-Grip Bench Press');
    expect(out.keyLifts[0].level.label).toBe('Elite');
  });

  test('an exercise matching no standard is not counted and not in keyLifts', () => {
    const out = buildAthleteProfileSummary({
      workouts: [],
      exercises: [
        { id: 'e1', name: 'Bicep Curl' },
        { id: 'e2', name: 'Deadlift' },
      ],
      sets: [
        { workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 1, createdAt: 1000 },
        { workoutId: 'w2', exerciseId: 'e2', weight: 150, actualReps: 1, createdAt: 2000 },
      ],
      latestWeight: { weightKg: 80 },
      userProfile: {},
      units: 'kg',
    });

    expect(out.strength).toMatchObject({ count: 1 });
    expect(out.keyLifts).toHaveLength(1);
    expect(out.keyLifts[0].row.name).toBe('Deadlift');
    expect(out.keyLifts.some(({ row }) => row.name === 'Bicep Curl')).toBe(false);
  });

  test('five distinct standards produce five entries, one per standard, in the standards\' own order', () => {
    const out = buildAthleteProfileSummary({
      workouts: [],
      exercises: [
        { id: 'b', name: 'Bench Press' },
        { id: 's', name: 'Back Squat' },
        { id: 'd', name: 'Deadlift' },
        { id: 'o', name: 'Overhead Press' },
        { id: 'r', name: 'Barbell Row' },
      ],
      sets: [
        { workoutId: 'w1', exerciseId: 'b', weight: 100, actualReps: 1, createdAt: 1000 },
        { workoutId: 'w2', exerciseId: 's', weight: 100, actualReps: 1, createdAt: 2000 },
        { workoutId: 'w3', exerciseId: 'd', weight: 100, actualReps: 1, createdAt: 3000 },
        { workoutId: 'w4', exerciseId: 'o', weight: 100, actualReps: 1, createdAt: 4000 },
        { workoutId: 'w5', exerciseId: 'r', weight: 100, actualReps: 1, createdAt: 5000 },
      ],
      latestWeight: { weightKg: 80 },
      userProfile: {},
      units: 'kg',
    });

    expect(out.strength).toMatchObject({ count: 5 });
    expect(out.keyLifts).toHaveLength(5);
    expect(out.keyLifts.map(({ row }) => row.name)).toEqual([
      'Bench Press', 'Back Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
    ]);
  });

  test('without a bodyweight, strength stays null and keyLifts stays empty, as before', () => {
    const out = buildAthleteProfileSummary({
      workouts: [],
      exercises: [{ id: 'e1', name: 'Bench Press' }],
      sets: [{ workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 1, createdAt: 1000 }],
      userProfile: {},
      units: 'kg',
    });

    expect(out.strength).toBeNull();
    expect(out.keyLifts).toEqual([]);
  });
});
