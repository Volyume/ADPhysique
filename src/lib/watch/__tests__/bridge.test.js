/**
 * COMP-020 watch coordinator — the phone-composes-every-string guarantee.
 * Locks the beat line and the set line (which can NEVER read "Set 4 of 3"), and
 * the cursor/script composition the watch renders verbatim.
 */
jest.mock('../../../../modules/watch-bridge', () => ({
  isSupported: () => false,
  sendSessionScript: jest.fn(), sendCursor: jest.fn(), endSession: jest.fn(),
  addWatchEventListener: jest.fn(() => () => {}), ackWatchEvent: jest.fn(),
}));
jest.mock('../../../store/useAppStore', () => ({ __esModule: true, default: { getState: () => ({}), subscribe: jest.fn() } }));

const {
  composeBeatLine, composeSetLine, composeSessionScript, composeCursor,
} = require('../bridge');

describe('composeBeatLine', () => {
  test('with a previous set', () => {
    expect(composeBeatLine({ lastWeight: 60, lastReps: 8, targetMin: 8, targetMax: 12 }))
      .toBe('Last: 60 kg × 8 · Target 8–12');
  });
  test('first time', () => {
    expect(composeBeatLine({ targetMin: 8, targetMax: 12 })).toBe('First time · Target 8–12');
  });
});

describe('composeSetLine — never "Set 4 of 3"', () => {
  test('within target', () =>
    expect(composeSetLine({ doneProgressSets: 1, target: 4 })).toBe('Set 2 of 4 next'));
  test('beyond target reads "Extra set", never an impossible count', () =>
    expect(composeSetLine({ doneProgressSets: 3, target: 3 })).toBe('Extra set'));
  test('no target', () =>
    expect(composeSetLine({ doneProgressSets: 1, target: null })).toBe('Set 2 next'));
});

describe('composeSessionScript / composeCursor', () => {
  const state = {
    activeWorkout: { id: 'w1' },
    userProfile: { units: 'kg' },
    lastSetLoggedAt: 42,
    currentExerciseIndex: 0,
    restTimerActive: true,
    restTimerEndsAt: 999,
    workoutExercises: [{
      exercise: { name: 'Incline press' },
      routineExercise: { recommendedRepsMin: 8, recommendedRepsMax: 12, recommendedSets: 4, restSeconds: 120, lastWeight: 60, lastReps: 8 },
      sets: [{ setType: 'straight' }],
    }],
  };

  test('script carries phone-composed beat lines + workout id', () => {
    const script = composeSessionScript(state);
    expect(script.workoutId).toBe('w1');
    expect(script.exercises[0].name).toBe('Incline press');
    expect(script.exercises[0].beatLine).toBe('Last: 60 kg × 8 · Target 8–12');
    expect(script.exercises[0].restSeconds).toBe(120);
  });

  test('cursor carries the composed set line + the wall-clock rest end', () => {
    const c = composeCursor(state);
    expect(c.setLine).toBe('Set 2 of 4 next'); // one working set done -> next is 2
    expect(c.restTimerEndsAt).toBe(999);
    expect(c.currentExerciseIndex).toBe(0);
  });

  test('no active workout -> null script', () => {
    expect(composeSessionScript({})).toBeNull();
  });
});
