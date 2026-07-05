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
