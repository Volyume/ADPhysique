import { buildLiftProgressRows } from '../liftProgress';
import { calculate1RM } from '../algorithms';

// Helper: a completed working set in the camelCase shape getCompletedWorkoutSets
// returns (rowToCamel output).
function set({ exerciseId, workoutId, weight, reps, at, setType }) {
  return {
    exerciseId,
    workoutId,
    weight,
    actualReps: reps,
    createdAt: at,
    setType: setType ?? 'straight',
  };
}

const EXERCISES = [
  { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' },
  { id: 'squat', name: 'Back Squat', primaryMuscle: 'quads' },
];

describe('buildLiftProgressRows', () => {
  test('returns one row per trained exercise, most recently trained first', () => {
    const sets = [
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1000 }),
      set({ exerciseId: 'squat', workoutId: 'w2', weight: 140, reps: 5, at: 2000 }),
    ];
    const rows = buildLiftProgressRows(sets, EXERCISES);
    expect(rows).toHaveLength(2);
    expect(rows[0].exerciseId).toBe('squat'); // trained at 2000, newer
    expect(rows[1].exerciseId).toBe('bench');
    expect(rows[0].name).toBe('Back Squat');
    expect(rows[0].primaryMuscle).toBe('quads');
  });

  test('groups sets by session and takes the best e1RM per session for the trend', () => {
    const sets = [
      // session 1: best e1RM from 100x5
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 90, reps: 8, at: 1000 }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1100 }),
      // session 2: heavier
      set({ exerciseId: 'bench', workoutId: 'w2', weight: 110, reps: 5, at: 2000 }),
    ];
    const rows = buildLiftProgressRows(sets, EXERCISES);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.sessions).toBe(2);
    expect(row.trend).toHaveLength(2);
    // trend oldest -> newest
    const s1Best = Math.round(Math.max(calculate1RM(90, 8), calculate1RM(100, 5)) * 10) / 10;
    const s2Best = Math.round(calculate1RM(110, 5) * 10) / 10;
    expect(row.trend).toEqual([s1Best, s2Best]);
    expect(row.latestWeight).toBe(110);
    expect(row.deltaPct).toBe(Math.round(((calculate1RM(110, 5) - Math.max(calculate1RM(90, 8), calculate1RM(100, 5))) / Math.max(calculate1RM(90, 8), calculate1RM(100, 5))) * 100));
  });

  test('ignores warmup sets and unlogged (zero weight or zero reps) sets', () => {
    const sets = [
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1000 }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 40, reps: 10, at: 900, setType: 'warmup' }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 0, reps: 5, at: 1000 }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 0, at: 1000 }),
    ];
    const rows = buildLiftProgressRows(sets, EXERCISES);
    expect(rows).toHaveLength(1);
    // Only the single valid working set counts.
    expect(rows[0].sessions).toBe(1);
    expect(rows[0].bestE1rm).toBe(Math.round(calculate1RM(100, 5) * 10) / 10);
  });

  test('deltaPct is null for a single-session lift', () => {
    const sets = [set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1000 })];
    const rows = buildLiftProgressRows(sets, EXERCISES);
    expect(rows[0].deltaPct).toBeNull();
  });

  test('falls back to a generic name when the exercise is not in the library', () => {
    const sets = [set({ exerciseId: 'ghost', workoutId: 'w1', weight: 50, reps: 5, at: 1000 })];
    const rows = buildLiftProgressRows(sets, EXERCISES);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Exercise');
    expect(rows[0].primaryMuscle).toBeNull();
  });

  test('handles snake_case set fields too', () => {
    const sets = [
      { exercise_id: 'bench', workout_id: 'w1', weight: 100, actual_reps: 5, created_at: 1000 },
    ];
    const rows = buildLiftProgressRows(sets, EXERCISES);
    expect(rows).toHaveLength(1);
    expect(rows[0].exerciseId).toBe('bench');
    expect(rows[0].sessions).toBe(1);
  });

  test('empty input returns an empty array', () => {
    expect(buildLiftProgressRows([], EXERCISES)).toEqual([]);
    expect(buildLiftProgressRows(null, null)).toEqual([]);
  });
});
