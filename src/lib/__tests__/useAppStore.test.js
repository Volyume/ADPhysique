/**
 * Tests for the Zustand store. Focuses on the changes from wave 8:
 *
 *  - addExerciseToWorkout / addSetToCurrentExercise / addRestTime / tickRestTimer
 *    use the functional set(state => ...) form so concurrent updates don't race.
 *  - showPRCelebration queues subsequent PRs instead of overwriting.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(() => {
  jest.resetModules();
  return AsyncStorage.clear();
});

describe('workout exercise + set state — concurrent updates', () => {
  test('two near-simultaneous addExerciseToWorkout calls both land', () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const ex1 = { id: 'a', name: 'Bench Press' };
    const ex2 = { id: 'b', name: 'Squat' };
    useAppStore.getState().addExerciseToWorkout(ex1);
    useAppStore.getState().addExerciseToWorkout(ex2);
    const { workoutExercises } = useAppStore.getState();
    expect(workoutExercises.length).toBe(2);
    expect(workoutExercises[0].exercise.id).toBe('a');
    expect(workoutExercises[1].exercise.id).toBe('b');
  });

  test('addSetToCurrentExercise appends to the current index without losing prior sets', () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    useAppStore.getState().addExerciseToWorkout({ id: 'a', name: 'Bench Press' });
    useAppStore.getState().setCurrentExerciseIndex(0);
    useAppStore.getState().addSetToCurrentExercise({ id: 's1', weight: 100, actualReps: 8 });
    useAppStore.getState().addSetToCurrentExercise({ id: 's2', weight: 100, actualReps: 7 });
    useAppStore.getState().addSetToCurrentExercise({ id: 's3', weight: 100, actualReps: 6 });
    const sets = useAppStore.getState().workoutExercises[0].sets;
    expect(sets.length).toBe(3);
    expect(sets.map(s => s.id)).toEqual(['s1', 's2', 's3']);
  });

  test('addSetToCurrentExercise is a no-op when no exercise is current', () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    // No exercises added; currentExerciseIndex defaults to 0 → out of bounds
    useAppStore.getState().addSetToCurrentExercise({ id: 's1' });
    expect(useAppStore.getState().workoutExercises).toEqual([]);
  });
});

describe('rest timer', () => {
  test('addRestTime is bounded by 0 on the low side', () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    useAppStore.getState().startRestTimer(60);
    useAppStore.getState().addRestTime(-1000);
    expect(useAppStore.getState().restTimerRemaining).toBeGreaterThanOrEqual(0);
  });

  test('addRestTime is a no-op when timer is not active', () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    useAppStore.getState().stopRestTimer();
    const before = useAppStore.getState().restTimerRemaining;
    useAppStore.getState().addRestTime(30);
    expect(useAppStore.getState().restTimerRemaining).toBe(before);
  });

  test('tickRestTimer transitions to inactive at remaining <= 1', () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    useAppStore.getState().startRestTimer(2);
    useAppStore.getState().tickRestTimer(); // 2 → 1
    useAppStore.getState().tickRestTimer(); // 1 → done
    const { restTimerActive, restTimerRemaining } = useAppStore.getState();
    expect(restTimerActive).toBe(false);
    expect(restTimerRemaining).toBe(0);
  });
});

describe('PR celebration queue', () => {
  test('first PR sets prCelebration directly', () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    useAppStore.getState().showPRCelebration({ type: '1rm_estimate', label: 'New 1RM 150kg' });
    const { prCelebration, prCelebrationQueue } = useAppStore.getState();
    expect(prCelebration).toBeDefined();
    expect(prCelebration.type).toBe('1rm_estimate');
    expect(prCelebrationQueue).toEqual([]);
  });

  test('second PR enqueues instead of overwriting', () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    useAppStore.getState().showPRCelebration({ type: '1rm_estimate', label: 'A' });
    useAppStore.getState().showPRCelebration({ type: 'heaviest_weight', label: 'B' });
    const { prCelebration, prCelebrationQueue } = useAppStore.getState();
    expect(prCelebration.label).toBe('A');
    expect(prCelebrationQueue.length).toBe(1);
    expect(prCelebrationQueue[0].label).toBe('B');
  });

  test('hidePRCelebration pops the queue if anything is pending', () => {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    useAppStore.getState().showPRCelebration({ type: '1rm_estimate', label: 'A' });
    useAppStore.getState().showPRCelebration({ type: 'heaviest_weight', label: 'B' });
    useAppStore.getState().showPRCelebration({ type: 'reps_at_weight', label: 'C' });
    expect(useAppStore.getState().prCelebrationQueue.length).toBe(2);
    useAppStore.getState().hidePRCelebration();
    expect(useAppStore.getState().prCelebration.label).toBe('B');
    expect(useAppStore.getState().prCelebrationQueue.length).toBe(1);
    useAppStore.getState().hidePRCelebration();
    expect(useAppStore.getState().prCelebration.label).toBe('C');
    expect(useAppStore.getState().prCelebrationQueue.length).toBe(0);
    useAppStore.getState().hidePRCelebration();
    expect(useAppStore.getState().prCelebration).toBeNull();
  });
});

// initLocalUser describe deleted per IDENTITY_AND_OWNERSHIP_LOCKED.md
// rule 1 / 5 / anti-patterns. The store action no longer exists; the
// regression guard at src/lib/__tests__/identityGate.proOnboarding.test.js
// asserts it does not return.
