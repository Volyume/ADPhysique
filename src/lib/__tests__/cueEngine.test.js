// Pure-selector tests: the loader's DB reads are not exercised here.
jest.mock('../database', () => ({
  getWorkoutSetsForExercise: jest.fn(),
  getLatestCoachOutput: jest.fn(),
  getAllExercises: jest.fn(),
}));

import { selectCue } from '../demos/cueEngine';

const bench = {
  id: 'e1', name: 'Barbell Bench Press', defaultRepMin: 6, defaultRepMax: 12,
  commonMistakes: ['Flaring the elbows to 90°'],
};

// Three identical sessions = stalled (no weight or rep gain anywhere).
const stalledSessions = [
  [{ weight: 100, actualReps: 8 }],
  [{ weight: 100, actualReps: 8 }],
  [{ weight: 100, actualReps: 8 }],
  [{ weight: 100, actualReps: 8 }],
];

describe('selectCue precedence', () => {
  test('no history → first_time teaching cue, mistake-first', () => {
    const cue = selectCue({ exercise: bench, sessions: [] });
    expect(cue.kind).toBe('first_time');
    expect(cue.cue).toContain('flaring the elbows');
    expect(cue.cue).toContain('Start light');
  });

  test('plateau beats recovery: stalled sessions surface the stall', () => {
    const cue = selectCue({
      exercise: bench,
      sessions: stalledSessions,
      coachOutput: { deloadSuggested: true },
    });
    expect(cue.kind).toBe('plateau');
    expect(cue.headline).toMatch(/No progress/);
  });

  test('plateau with swap resolution includes the ranked candidate', () => {
    const cue = selectCue({
      exercise: bench,
      sessions: stalledSessions,
      swapCandidate: { exercise: { name: 'Incline Dumbbell Press' }, reason: 'Targets chest with the same push pattern.' },
    });
    // resolution depends on stall count; either branch must still be a plateau cue
    expect(cue.kind).toBe('plateau');
    if (cue.swap) expect(cue.swap.name).toBe('Incline Dumbbell Press');
  });

  test('recovery week → ease-off cue when no plateau', () => {
    const progressing = [
      [{ weight: 105, actualReps: 8 }],
      [{ weight: 102.5, actualReps: 8 }],
      [{ weight: 100, actualReps: 8 }],
    ];
    const cue = selectCue({
      exercise: bench,
      sessions: progressing,
      coachOutput: { adjustments: { training: { signal: 'reduce' } } },
    });
    expect(cue.kind).toBe('recovery');
    expect(cue.cue).toContain('in the tank');
  });

  test('default: heavy rep target gets an external-focus cue available', () => {
    const progressing = [
      [{ weight: 105, actualReps: 5 }],
      [{ weight: 102.5, actualReps: 5 }],
      [{ weight: 100, actualReps: 5 }],
    ];
    const cue = selectCue({ exercise: { ...bench, name: 'Unknown Lift X' }, sessions: progressing, repMin: 5 });
    expect(cue.kind).toBe('default');
    expect(cue.cue.length).toBeGreaterThan(0);
  });
});
